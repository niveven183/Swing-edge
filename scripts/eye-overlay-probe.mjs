// scripts/eye-overlay-probe.mjs — the RED-BEFORE arm for tests-eye/overlay.spec.js (B-404 · B-405).
//
//   npm run probe:eye:overlay                                   pixel7,iphone14,iphoneSE (local)
//   EYE_PROJECTS=pixel7,iphone14,iphoneSE,iphone14promax,galaxyS8 npm run probe:eye:overlay
//
// ⛔ NOT in the verify chain (real browser + four `vite build`s) — `probe:` ≠ `test:`.
// Plan: docs/plans/PLAN-2026-10-04-b404-b405-bottom-overlays.md
//
//   HEAD     the tree as committed                                       ⇒ every cell green
//   BEFORE   the five changed product files as they were at d1e05e1      ⇒ consent cells RED
//            (the bug as measured in §0 — this is the red-before)
//   MUT-PAD  the overlay reserve switched off (publish always 0px)       ⇒ consent cells RED
//   MUT-IOS  the iOS banner's timing/modal guard removed                 ⇒ iOS cells RED
//
// ⛔ A mutant that survives, or a BEFORE that goes green, means the spec is BLIND ⇒ exit 1.
// Shared machinery (mutate · build · restore-and-prove · serve · run): scripts/lib/eyeBuild.mjs.

import { mkdtemp, rm } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { makeOnce, assertCleanTargets, buildTree, serve, runSpec, readResults } from "./lib/eyeBuild.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BEFORE_REF = "d1e05e1"; // the last tree before the B-404/B-405 fix
const PROJECTS = (process.env.EYE_PROJECTS || "pixel7,iphone14,iphoneSE").split(",").map((s) => s.trim()).filter(Boolean);
const OUT = join(ROOT, "eye-evidence", "probe-overlay");
const IOS = new Set(["iphone14", "iphoneSE", "iphone14promax"]);

let failures = 0;
const ok = (id, cond, label, detail = "") => {
  console.log(`${cond ? "✅" : "❌"} ${id}  ${label}${!cond && detail ? `\n      ${detail}` : ""}`);
  if (!cond) failures++;
};
const die = (msg) => { console.log(`\n❌ eye-overlay-probe: ${msg}`); process.exit(1); };
const once = makeOnce(die);

// The product files this wave changed. BEFORE swaps each one, whole, for its d1e05e1 bytes.
const FILES = ["SwingEdge_App.jsx", "src/components/AuthScreen.jsx", "src/components/ConsentBanner.jsx", "src/components/ConsentBanner.css", "src/components/IOSInstallBanner.jsx"].map((f) => join(ROOT, f));
const OVERLAY = join(ROOT, "src", "lib", "bottomOverlay.js");
const IOSB = join(ROOT, "src", "components", "IOSInstallBanner.jsx");
assertCleanTargets(ROOT, [...FILES, OVERLAY], die);

const show = (f) => execFileSync("git", ["show", `${BEFORE_REF}:${f.replace(ROOT + "/", "")}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const WHOLE = /^[\s\S]+$/; // matches a whole file exactly once
const PUBLISH = "document.documentElement.style.setProperty(OVERLAY_VAR, `${overlayInset(insets)}px`);";
const GUARD = "const shown = visible && ready === true && !modal;";

const ARMS = {
  HEAD: [],
  BEFORE: FILES.map((f) => { const old = show(f); return [f, WHOLE, () => old]; }),
  "MUT-PAD": [[OVERLAY, PUBLISH, () => 'document.documentElement.style.setProperty(OVERLAY_VAR, "0px");']],
  "MUT-IOS": [[IOSB, GUARD, () => "const shown = visible;"]],
};
for (const [arm, muts] of Object.entries(ARMS)) for (const [f, find] of muts) once(readFileSync(f, "utf8"), find, arm);
ok("META", true, `all mutation anchors match exactly once · targets clean in git · projects=${PROJECTS.join(",")}`);

// Verdict key per test: "consent-he" · "ios-en" …
const KEY = (title) => {
  const m = /^(consent banner|iOS install banner).*· (he|en) —/.exec(title);
  return m ? `${m[1].startsWith("iOS") ? "ios" : "consent"}-${m[2]}` : null;
};

const WORK = await mkdtemp(join(tmpdir(), "eye-overlay-"));
const verdicts = {};
for (const arm of Object.keys(ARMS)) {
  console.log(`\n── ${arm} ──`);
  const dist = await buildTree({ root: ROOT, arm, outDir: join(WORK, `dist-${arm}`), mutations: ARMS[arm], once, die });
  const { server, port } = await serve(dist);
  const json = join(OUT, `${arm}.json`);
  const run = await runSpec({ root: ROOT, spec: "tests-eye/overlay.spec.js", projects: PROJECTS, port, json, evidenceDir: join(OUT, arm) });
  server.close();
  if (!run.ok) die(`${arm}: the spec produced no JSON report (exit ${run.status})\n${run.out.slice(-3000)}`);
  verdicts[arm] = readResults(json, KEY);
  for (const [k, v] of Object.entries(verdicts[arm]).sort()) console.log(`   ${k.padEnd(24)} ${v.status}${v.status !== "passed" ? `  — ${v.msg.slice(0, 400)}` : ""}`);
}

console.log("\n── verdicts ──");
const cells = (arm, p, kind) => ["he", "en"].map((l) => verdicts[arm][`${p}:${kind}-${l}`] || { status: "missing", msg: "" });
for (const p of PROJECTS) {
  const kinds = IOS.has(p) ? ["consent", "ios"] : ["consent"];
  const head = kinds.flatMap((k) => cells("HEAD", p, k));
  ok(`HEAD/${p}`, head.every((r) => r.status === "passed"), `all ${head.length} cells green`, head.filter((r) => r.status !== "passed").map((r) => `${r.status} ${r.msg}`).join(" | "));
  const before = cells("BEFORE", p, "consent");
  ok(`BEFORE/${p}`, before.every((r) => r.status === "failed" && /covered by/.test(r.msg)), `consent cells red-before: ${before.map((r) => r.status).join(" · ")}`, "the pre-fix tree passes — the spec is BLIND to B-404");
  const pad = cells("MUT-PAD", p, "consent");
  ok(`MUT-PAD/${p}`, pad.some((r) => r.status === "failed" && /covered by/.test(r.msg)), `reserve off ⇒ ${pad.map((r) => r.status).join(" · ")}`, "mutant SURVIVED — the spec cannot see the reserve being removed");
  if (IOS.has(p)) {
    const mi = cells("MUT-IOS", p, "ios");
    ok(`MUT-IOS/${p}`, mi.every((r) => r.status === "failed" && /B-405/.test(r.msg)), `guard off ⇒ ${mi.map((r) => r.status).join(" · ")}`, "mutant SURVIVED — the spec cannot see the iOS banner's timing/modal guard removed");
  }
}

await rm(WORK, { recursive: true, force: true });
console.log(failures ? `\n❌ eye-overlay-probe: ${failures} verdict(s) failed — the spec is not proven` : "\n✅ eye-overlay-probe — HEAD green · BEFORE red · MUT-PAD red · MUT-IOS red");
process.exit(failures ? 1 : 0);
