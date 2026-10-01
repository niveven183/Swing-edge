// scripts/image-store-probe.mjs — the RED-BEFORE / GREEN-AFTER arm for the stored-image wave
// (B-015 · B-038 · B-388, 01.10). Plan: docs/plans/PLAN-2026-10-01-playbook-images.md
//
//   npm run probe:image            Chromium arms (real localStorage quota)   — needs a browser
//   npm run probe:image:mutants    M1–M10 against test:capability            — node only
//
// ⛔ NOT in the verify chain (a real browser; `probe:` ≠ `test:` so the "33 חוליות ואז build"
// count in CLAUDE.md §7 does not move).
//
// ── THE ARMS ────────────────────────────────────────────────────────────────
//   LEGACY  The pre-fix `savePlaybook` (frozen bytes from 3d24c23) against the REAL browser quota.
//           It MUST stay red: a new setup written next to an existing one is gone after a
//           "refresh". If this arm ever goes green, the probe stopped reproducing the bug and
//           every green below proves nothing (the boundary-probe C1–C4 rule).
//   G1      the REAL fileToStoredDataURL + persistPlaybookSafely: a 3.9MB screenshot comes out
//           ≤200KB and five setups with images all survive a refresh, mirror copy included.
//   G2      quota too small for the image but not for the setup ⇒ "image_dropped": the setup
//           survives, the existing setup's image is untouched.
//   G3      nothing fits ⇒ "failed", reported, nothing stored.
//
// ── THE MUTANTS ─────────────────────────────────────────────────────────────
// One targeted replacement each, applied in place and restored in a `finally` (bytes compared to
// the snapshot). A mutant that matches ≠ 1 time is a hard failure (B-272) — a no-op mutant would
// certify a blind test. Each must turn `test:capability` red on the EXPECTED assertion.
//
// ── WHAT THIS DOES NOT COVER ────────────────────────────────────────────────
// React · the toast actually rendering · RTL · contrast · the pixels of a real chart (can the
// price labels still be read?) — those live in `C-064`, by eye.

import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const ROOT = new URL("../", import.meta.url).pathname;
const LEGACY_REF = "3d24c23"; // the last tree whose savePlaybook was `catch {}`
const mutantsMode = process.argv.includes("--mutants");

let failed = 0;
const ok = (id, label) => console.log(`✅ ${id}  ${label}`);
const bad = (id, label, detail = "") => { failed++; console.error(`❌ ${id}  ${label}${detail ? `\n      ${detail}` : ""}`); };

// ═════════════════════════════ MUTANTS ═════════════════════════════
if (mutantsMode) {
  const M = [
    ["M1a", "src/lib/playbookStore.js", "catch (secondError) {\n      return { status: \"failed\", list: updated, error: secondError };\n    }", "catch (secondError) {}", ["14", "15"], "catch {} ריק חוזר בחנות"],
    ["M1b", "SwingEdge_App.jsx", "console.error(\"[playbook] image rejected\", err);\n              toast.error(t.playbookImageFailed, 7000);", "", ["17"], "catch ריק בהעלאת תמונה"],
    ["M2a", "SwingEdge_App.jsx", "const dataURL = await fileToStoredDataURL(file);", "const dataURL = await new Promise((r) => { const fr = new FileReader(); fr.onload = (ev) => r(ev.target.result); fr.readAsDataURL(file); });", ["17"], "דילוג על resize (גולמי)"],
    ["M2b", "src/lib/imageResize.js", "if (typeof url === \"string\" && !exceedsCap(url.length, STORED_CAP_BYTES)) return url;", "if (typeof url === \"string\") return url;", ["13"], "מעבר לתקרה לא נדחה"],
    ["M3", "SwingEdge_App.jsx", "toast.error(t.playbookImageNotSaved, 7000);", "", ["16"], "ה-toast לא מופיע"],
    ["M4", "src/lib/playbookStore.js", "const target = targetId == null ? null : updated.find((s) => s.id === targetId);", "const target = null;", ["14"], "אין ניסוי שני בלי תמונה"],
    ["M5", "src/lib/playbookStore.js", "(s.id === targetId ? { ...s, imagePreview: null } : s)", "({ ...s, imagePreview: null })", ["14"], "הניסוי השני מוחק תמונות של סטאפים אחרים"],
    ["M6", "src/i18n.js", "  playbookNotSaved: \"Setup NO guardado", "  _playbookNotSaved: \"Setup NO guardado", ["19"], "מפתח i18n חסר ב-es"],
    ["M7", "src/components/ToastProvider.jsx", "<div role=\"status\" aria-live=\"polite\" className", "<div className", ["20"], "ARIA נעלם"],
    ["M8", "src/lib/imageResize.js", "export const STORED_CAP_BYTES = 200 * 1024;", "export const STORED_CAP_BYTES = 2 * 1024 * 1024;", ["12"], "תקרה מורחבת"],
    ["M9", "SwingEdge_App.jsx", "      exitReason: null, followedPlan: null, lessonLearned: null, maxFavorable: null, maxAdverse: null,\n      _capitalAtEntry", "      tradeImage: form.tradeImagePreview,\n      exitReason: null, followedPlan: null, lessonLearned: null, maxFavorable: null, maxAdverse: null,\n      _capitalAtEntry", ["21"], "tradeImage נכתב שוב ל-swingEdgeTrades"],
    ["M10", "SwingEdge_App.jsx", "toast.error(t.tradesStorageFull, 8000);", "", ["22"], "כשל מטמון העסקאות שוב שקט"],
  ];
  const run = () => spawnSync("node", ["scripts/capability-guard-test.mjs"], { cwd: ROOT, encoding: "utf8" });
  const control = run();
  if (control.status !== 0) { bad("K0", "control arm: test:capability must be green on the unmutated tree", (control.stdout + control.stderr).split("\n").filter((l) => l.startsWith("❌")).join(" | ")); process.exit(1); }
  ok("K0", "control arm green on the unmutated tree");
  let killed = 0;
  for (const [id, file, search, replace, expect, why] of M) {
    const path = ROOT + file;
    const snap = readFileSync(path, "utf8");
    const hash = createHash("sha256").update(snap).digest("hex");
    try {
      const n = snap.split(search).length - 1;
      if (n !== 1) { bad(id, `${why} — the mutation matched ${n}× (must be exactly 1; a no-op mutant is a blind test)`); continue; }
      writeFileSync(path, snap.replace(search, replace));
      const r = run();
      const reds = [...(r.stdout + r.stderr).matchAll(/❌ (\S+)/g)].map((m) => m[1]);
      const hit = r.status !== 0 && expect.every((e) => reds.includes(e));
      if (hit) { killed++; ok(id, `${why} — KILLED by ${expect.join("+")} (red: ${[...new Set(reds)].join(",")})`); }
      else bad(id, `${why} — SURVIVED or killed by the wrong assertion`, `exit=${r.status} expected=${expect} got=${[...new Set(reds)]}`);
    } finally {
      writeFileSync(path, snap);
      if (createHash("sha256").update(readFileSync(path, "utf8")).digest("hex") !== hash) { bad(id, `RESTORE FAILED for ${file}`); process.exit(2); }
    }
  }
  console.log(`\nmutants: ${killed}/${M.length} killed · control arm green`);
  process.exit(failed ? 1 : 0);
}

// ═════════════════════════════ CHROMIUM ARMS ═════════════════════════════
const { build } = await import("esbuild");
const { chromium } = await import("playwright-core");

const app = readFileSync(ROOT + "SwingEdge_App.jsx", "utf8");
const legacyApp = execFileSync("git", ["show", `${LEGACY_REF}:SwingEdge_App.jsx`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const once = (src, re, name) => { const m = [...src.matchAll(re)]; if (m.length !== 1) { console.error(`❌ extraction ${name} matched ${m.length}× — hard red (B-272)`); process.exit(2); } return m[0][0]; };
const legacySave = once(legacyApp, /const savePlaybook = \(updated\) => \{[\s\S]*?\n          \};/g, "legacy savePlaybook");
const hadSrc = once(app, /const had = \(k\) => \{[\s\S]*?\n    \};/g, "had");
const initSrc = once(app, /useState\(\(\) => \{\n    try \{\n      const saved = localStorage\.getItem\("swingEdgePlaybook"\)[\s\S]*?\n  \}\);/g, "playbook init").replace(/^useState/, "");

const bundle = await build({
  stdin: { contents: 'export * from "./src/lib/imageResize.js"; export * from "./src/lib/playbookStore.js";', resolveDir: ROOT, loader: "js" },
  bundle: true, write: false, format: "iife", globalName: "Lib", platform: "browser",
});
const libJs = bundle.outputFiles[0].text;

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium", args: ["--no-sandbox"] }).catch(() => chromium.launch());
const page = await browser.newPage();
await page.route("https://probe.test/**", (r) => r.fulfill({ contentType: "text/html", body: "<html><body></body></html>" }));
await page.goto("https://probe.test/");
await page.addScriptTag({ content: libJs });

const R = await page.evaluate(async ({ legacySave, hadSrc, initSrc }) => {
  const out = {};
  const freeSpace = () => { let lo = 0, hi = 6e6; while (lo < hi) { const mid = ((lo + hi + 1) / 2) | 0; try { localStorage.setItem("__probe", "x".repeat(mid)); lo = mid; } catch { hi = mid - 1; } } localStorage.removeItem("__probe"); return lo; };
  const leave = (chars) => { localStorage.removeItem("filler"); const f = freeSpace(); localStorage.setItem("filler", "x".repeat(Math.max(0, f - 16 - chars))); };
  const noise = async (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d"); const id = x.createImageData(w, h); for (let i = 0; i < id.data.length; i += 4) { const v = (Math.random() * 255) | 0; id.data[i] = v; id.data[i + 1] = (v * 7) & 255; id.data[i + 2] = (v * 13) & 255; id.data[i + 3] = 255; } x.putImageData(id, 0, 0); x.fillStyle = "#111"; x.fillRect(0, 0, w, h / 3); return new Promise((r) => c.toBlob(r, "image/jpeg", 0.92)); };
  const blob = await noise(3600, 1800);
  const file = new File([blob], "shot.jpg", { type: "image/jpeg" });
  out.fileBytes = blob.size;
  const raw = await new Promise((r) => { const fr = new FileReader(); fr.onload = (e) => r(e.target.result); fr.readAsDataURL(file); });
  const had = new Function(hadSrc + "; return had;")();
  const readInit = () => new Function(`return ${initSrc};`)()();

  // LEGACY — frozen pre-fix savePlaybook
  localStorage.clear();
  const small = { id: 1, name: "Breakout", description: "d", imagePreview: null };
  localStorage.setItem("swingEdgePlaybook", JSON.stringify([small]));
  localStorage.setItem("swingEdgeTrades", "t".repeat(1500000));
  let st = null; const legacy = new Function("setPlaybookSetups", legacySave + "; return savePlaybook;")((s) => { st = s; });
  legacy([small, { id: 2, name: "Gap", description: "x", imagePreview: raw }]);
  const afterLegacy = readInit();
  out.legacy = { hadPlaybook: had("swingEdgePlaybook"), inMemory: st.length, afterRefresh: afterLegacy.map((s) => s.name) };

  // G1 — real fileToStoredDataURL + persistPlaybookSafely, five setups, mirror copy included
  localStorage.clear();
  localStorage.setItem("swingEdgeTrades", "t".repeat(1500000));
  const stored = await Lib.fileToStoredDataURL(file);
  out.storedBytes = Math.round(stored.length * 0.75);
  let list = [], statuses = [];
  for (let i = 1; i <= 5; i++) {
    list = [...list, { id: i, name: "S" + i, description: "d", imagePreview: stored }];
    const r = Lib.persistPlaybookSafely(() => localStorage, list, i);
    statuses.push(r.status);
    try { localStorage.setItem("swingEdgeSettings", JSON.stringify({ playbook: list })); } catch { statuses.push("mirror-failed"); }
  }
  const back = readInit();
  out.g1 = { statuses, afterRefresh: back.length, imagesIntact: back.every((s) => s.imagePreview === stored) };

  // G2 — room for the setup, not for its image
  localStorage.clear();
  const base = [{ id: 1, name: "Keep", description: "d", imagePreview: stored }];
  localStorage.setItem("swingEdgePlaybook", JSON.stringify(base));
  const next = [...base, { id: 2, name: "New", description: "d", imagePreview: stored }];
  const strippedLen = JSON.stringify([base[0], { ...next[1], imagePreview: null }]).length;
  const oldLen = JSON.stringify(base).length;
  leave(strippedLen - oldLen + 2000);
  const r2 = Lib.persistPlaybookSafely(() => localStorage, next, 2);
  const back2 = readInit();
  out.g2 = { status: r2.status, afterRefresh: back2.map((s) => s.name), newImage: back2[1] ? back2[1].imagePreview : "absent", keptImageIntact: back2[0] ? back2[0].imagePreview === stored : false };

  // G3 — nothing fits
  leave(0);
  const before = localStorage.getItem("swingEdgePlaybook");
  const r3 = Lib.persistPlaybookSafely(() => localStorage, [...next, { id: 3, name: "Third", description: "d", imagePreview: stored }], 3);
  out.g3 = { status: r3.status, hasError: !!r3.error, untouched: localStorage.getItem("swingEdgePlaybook") === before };
  return out;
}, { legacySave, hadSrc, initSrc });
await browser.close();

console.log(`input: ${R.fileBytes} bytes (synthetic noise screenshot — worst case for JPEG)`);
console.log(`stored: ${R.storedBytes} bytes (cap ${200 * 1024})`);

// LEGACY must stay RED
if (R.legacy.hadPlaybook && R.legacy.inMemory === 2 && R.legacy.afterRefresh.length === 1 && !R.legacy.afterRefresh.includes("Gap"))
  ok("LEGACY", `red reproduced (kept as the control arm): memory=${R.legacy.inMemory} · after refresh=${JSON.stringify(R.legacy.afterRefresh)} · no message`);
else bad("LEGACY", "the pre-fix bug NO LONGER reproduces — this probe is blind; every green below proves nothing", JSON.stringify(R.legacy));

(R.storedBytes <= 200 * 1024) ? ok("G1a", `3.9MB input → ${R.storedBytes}B ≤ ${200 * 1024}B`) : bad("G1a", "stored image above the cap", String(R.storedBytes));
(R.g1.statuses.length === 5 && R.g1.statuses.every((s) => s === "ok") && R.g1.afterRefresh === 5 && R.g1.imagesIntact)
  ? ok("G1b", "5/5 setups with images stored (+ mirror copy), 5/5 survive a refresh, images byte-identical")
  : bad("G1b", "five setups did not all survive", JSON.stringify(R.g1));
(R.g2.status === "image_dropped" && R.g2.afterRefresh.join() === "Keep,New" && R.g2.newImage === null && R.g2.keptImageIntact)
  ? ok("G2", "quota too small for the image ⇒ image_dropped · both setups survive · the OTHER setup's image intact")
  : bad("G2", "image_dropped arm", JSON.stringify(R.g2));
(R.g3.status === "failed" && R.g3.hasError && R.g3.untouched)
  ? ok("G3", "nothing fits ⇒ failed + error, stored value untouched")
  : bad("G3", "failed arm", JSON.stringify(R.g3));

console.log(failed ? `\n❌ ${failed} arm(s) failed` : "\n✅ probe:image — LEGACY red · G1/G2/G3 green");
process.exit(failed ? 1 : 0);
