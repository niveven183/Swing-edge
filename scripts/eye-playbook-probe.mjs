// scripts/eye-playbook-probe.mjs — the RED-BEFORE arm for tests-eye/playbook.spec.js (C-064).
//
//   npm run probe:eye:playbook                       pixel7 only (local)
//   EYE_PROJECTS=pixel7,iphone14 npm run probe:eye:playbook   both devices (CI)
//
// ⛔ NOT in the verify chain (real browser + four `vite build`s). `probe:` ≠ `test:`, so the
// "33 חוליות ואז build" count in CLAUDE.md §7 does not move.
//
// WHY. The closure rule (DECISIONS 24.09) lets a `C-` close on a green CI run only if the
// assertions were seen RED on deliberately broken code. This builds four trees and runs the
// SAME spec against each, hermetically (tests-eye/hermetic.js — synthetic Supabase, zero
// secrets, zero network to the QA row, /api/ocr mocked):
//
//   HEAD     the tree as committed                                   ⇒ every step green
//   LEGACY   savePlaybook + handlePlaybookImageUpload as frozen bytes from 3d24c23
//            (`catch {}` + raw FileReader data-URL)                   ⇒ a or b RED
//   MUT-D    stored profile degraded to 400px · q.2                   ⇒ d RED on the F2 gate
//   MUT-E    tradeImage written back into the trade (probe:image M9) ⇒ e RED before reload
//
// ⛔ A mutant that survives, or a LEGACY that goes green, means the spec is BLIND ⇒ exit 1.
// Mutations are applied in place, matched EXACTLY ONCE (B-272 — a no-op mutant certifies a
// blind test), restored in a `finally`, and the restore is verified with `git diff`.
//
// It also MEASURES (report only, ⛔ a gate, ⛔ a product change — Niv 04.10) an alternative
// stored profile at a 2000px edge: bytes and OCR on F2 / F2s / F2b, next to the current one.

import { writeFile, mkdtemp, rm } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { chromium } from "playwright";
import { fitDimensions, STORED_CAP_BYTES } from "../src/lib/imageResize.js";
import { readManifest, fileFor } from "../tests-eye/fixtures.js";
import { readPrices, closeOcr } from "../tests-eye/ocr.js";
import { makeOnce, assertCleanTargets, buildTree, serve, runSpec, readResults } from "./lib/eyeBuild.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const APP = join(ROOT, "SwingEdge_App.jsx");
const RESIZE = join(ROOT, "src", "lib", "imageResize.js");
const LEGACY_REF = "3d24c23";
const PROJECTS = (process.env.EYE_PROJECTS || "pixel7").split(",").map((s) => s.trim()).filter(Boolean);
const OUT = join(ROOT, "eye-evidence", "probe");

let failures = 0;
const ok = (id, cond, label, detail = "") => {
  console.log(`${cond ? "✅" : "❌"} ${id}  ${label}${!cond && detail ? `\n      ${detail}` : ""}`);
  if (!cond) failures++;
};
const die = (msg) => { console.log(`\n❌ eye-playbook-probe: ${msg}`); process.exit(1); };

// ═══ META ═══════════════════════════════════════════════════════════════════
const once = makeOnce(die);
assertCleanTargets(ROOT, [APP, RESIZE], die);

const appSrc = readFileSync(APP, "utf8");
const legacyApp = execFileSync("git", ["show", `${LEGACY_REF}:SwingEdge_App.jsx`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const CUR_SAVE = /          const savePlaybook = \(updated, targetId = null\) => \{[\s\S]*?\n          \};/g;
const CUR_UPLOAD = /          const handlePlaybookImageUpload = async \(e\) => \{[\s\S]*?\n          \};/g;
const LEG_SAVE = /          const savePlaybook = \(updated\) => \{[\s\S]*?\n          \};/g;
const LEG_UPLOAD = /          const handlePlaybookImageUpload = \(e\) => \{[\s\S]*?\n          \};/g;
once(appSrc, CUR_SAVE, "LEGACY: current savePlaybook");
once(appSrc, CUR_UPLOAD, "LEGACY: current handlePlaybookImageUpload");
once(legacyApp, LEG_SAVE, `LEGACY: ${LEGACY_REF} savePlaybook`);
once(legacyApp, LEG_UPLOAD, `LEGACY: ${LEGACY_REF} handlePlaybookImageUpload`);
const legacySave = legacyApp.match(LEG_SAVE)[0];
const legacyUpload = legacyApp.match(LEG_UPLOAD)[0];

const M9_FIND = "      exitReason: null, followedPlan: null, lessonLearned: null, maxFavorable: null, maxAdverse: null,\n      _capitalAtEntry";
const ARMS = {
  HEAD: [],
  LEGACY: [[APP, CUR_SAVE, () => legacySave], [APP, CUR_UPLOAD, () => legacyUpload]],
  "MUT-D": [
    [RESIZE, "export const STORED_MAX_EDGE_PX = 1400;", () => "export const STORED_MAX_EDGE_PX = 400;"],
    [RESIZE, "export const STORED_Q_PRIMARY = 0.7;", () => "export const STORED_Q_PRIMARY = 0.2;"],
  ],
  "MUT-E": [[APP, M9_FIND, () => "      tradeImage: form.tradeImagePreview,\n" + M9_FIND]],
};
const resizeSrc = readFileSync(RESIZE, "utf8");
for (const [arm, muts] of Object.entries(ARMS)) for (const [f, find] of muts) once(f === APP ? appSrc : resizeSrc, find, `${arm}`);
ok("META", true, `all mutation anchors match exactly once · targets clean in git · projects=${PROJECTS.join(",")}`);

// ═══ BUILD + SERVE ══════════════════════════════════════════════════════════
const WORK = await mkdtemp(join(tmpdir(), "eye-playbook-"));
const build = (arm) => buildTree({ root: ROOT, arm, outDir: join(WORK, `dist-${arm}`), mutations: ARMS[arm], once, die });

// ═══ RUN THE SPEC PER ARM ═══════════════════════════════════════════════════
const STEP = (title) => (/(?:^|›\s*)([a-e]) · /.exec(title) || [])[1];
const results = (json) => readResults(json, STEP);

const verdicts = {};
for (const arm of Object.keys(ARMS)) {
  console.log(`\n── ${arm} ──`);
  const dist = await build(arm);
  const { server, port } = await serve(dist);
  const json = join(OUT, `${arm}.json`);
  const run = await runSpec({ root: ROOT, spec: "tests-eye/playbook.spec.js", projects: PROJECTS, port, json, evidenceDir: join(OUT, arm) });
  server.close();
  if (!run.ok) die(`${arm}: the spec produced no JSON report (exit ${run.status})\n${run.out.slice(-3000)}`);
  verdicts[arm] = results(json);
  for (const [k, v] of Object.entries(verdicts[arm]).sort()) console.log(`   ${k.padEnd(12)} ${v.status}${v.status !== "passed" ? `  — ${v.msg.slice(0, 600)}` : ""}`);
}

console.log("\n── verdicts ──");
for (const p of PROJECTS) {
  const v = (arm, s) => verdicts[arm][`${p}:${s}`] || { status: "missing", msg: "" };
  const head = ["a", "b", "c", "d", "e"].map((s) => [s, v("HEAD", s)]);
  ok(`HEAD/${p}`, head.every(([, r]) => r.status === "passed"), "every step green on the committed tree", head.filter(([, r]) => r.status !== "passed").map(([s, r]) => `${s}:${r.status} ${r.msg.split("\n")[0]}`).join(" | "));
  const leg = ["a", "b"].map((s) => [s, v("LEGACY", s)]);
  ok(`LEGACY/${p}`, leg.some(([, r]) => r.status === "failed"), `red-before reproduced: ${leg.map(([s, r]) => `${s}=${r.status}`).join(" · ")}`, "the pre-fix savePlaybook passes a AND b — the spec is BLIND to B-015");
  const d = v("MUT-D", "d");
  ok(`MUT-D/${p}`, d.status === "failed" && /F2 \(33px\): stored image read/.test(d.msg), `d red on the F2 gate (${d.status})`, d.msg.split("\n")[0] || "mutant SURVIVED — d cannot see a degraded profile");
  const e = v("MUT-E", "e");
  ok(`MUT-E/${p}`, e.status === "failed" && /before reload/.test(e.msg), `e red before reload (${e.status})`, e.msg.split("\n")[0] || "mutant SURVIVED — e cannot see tradeImage written back");
}

// ═══ MEASURE — alternative stored profile (report only) ═════════════════════
console.log("\n── measurement: stored profile 1400/.7 (current) vs 2000/.5 vs 2000/.4 — ⛔ a gate ──");
const manifest = readManifest();
const browser = await chromium.launch(process.env.EYE_CHROMIUM ? { executablePath: process.env.EYE_CHROMIUM } : {});
const page = await browser.newPage();
const PROFILES = [[1400, 0.7], [2000, 0.5], [2000, 0.4]];
const rows = [];
for (const f of ["F2", "F2s", "F2b", "F1_1"]) {
  const m = manifest[f];
  const src = `data:${m.mime};base64,${fileFor(manifest, f).buffer.toString("base64")}`;
  for (const [edge, q] of PROFILES) {
    const url = await page.evaluate(async ({ src, edge, q }) => {
      const im = new Image(); im.src = src; await im.decode();
      const L = Math.max(im.naturalWidth, im.naturalHeight), s = L > edge ? edge / L : 1;
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(im.naturalWidth * s)); c.height = Math.max(1, Math.round(im.naturalHeight * s));
      c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
      return c.toDataURL("image/jpeg", q);
    }, { src, edge, q });
    const bytes = Math.round(url.length * 0.75);
    const dims = m.w ? fitDimensions(m.w, m.h, edge) : null;
    const ocr = m.prices ? await readPrices(url, m) : null;
    rows.push({ fixture: f, profile: `${edge}/${q}`, bytes, underCap: bytes <= STORED_CAP_BYTES, dims: dims ? `${dims.w}×${dims.h}` : "4032×3024→", ocr: ocr ? `${ocr.hits}/${ocr.of}` : "—" });
  }
}
await browser.close();
await closeOcr();
for (const r of rows) console.log(`   ${r.fixture.padEnd(5)} ${r.profile.padEnd(9)} ${String(r.bytes).padStart(8)} B ${r.underCap ? "≤cap" : ">CAP"}  ${r.dims.padEnd(11)} OCR ${r.ocr}`);
await writeFile(join(OUT, "profile-measurement.json"), JSON.stringify(rows, null, 2));

await rm(WORK, { recursive: true, force: true });
console.log(failures ? `\n❌ eye-playbook-probe: ${failures} verdict(s) failed — the spec is not proven` : "\n✅ eye-playbook-probe — HEAD green · LEGACY red · MUT-D red · MUT-E red");
process.exit(failures ? 1 : 0);
