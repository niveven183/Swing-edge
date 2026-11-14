// scripts/eye-tooltip-probe.mjs — the RED-BEFORE arm for tests-eye/tooltip.spec.js (wave 3, U5).
//
//   npm run probe:eye:tooltip                                         pixel7 + desktop1440 (local)
//   EYE_PROJECTS=pixel7,iphone14,desktop1440 npm run probe:eye:tooltip
//
// ⛔ NOT in the verify chain (a real browser + two `vite build`s) — `probe:` ≠ `test:`.
// Plan: docs/plans/PLAN-2026-11-13-glossary-tooltips.md §7
//
//   HEAD     the tree as committed                                          ⇒ every cell green
//   BEFORE   InfoTooltip.jsx + TermTooltip.jsx as they were at 7a97b3b      ⇒ tap-open RED on touch (U5) ·
//            the pre-wave-3 bubble: hover-and-click toggle, 280px wide, ✕ at right-2, role=tooltip, no glossary link
//
// U5 is a HYPOTHESIS until BEFORE/tap-open is red on a touch device. A green BEFORE/tap-open means the
// hypothesis fell ⇒ exit 1 and STOP (plan §9, step 3). ⛔ A HEAD cell that is red ⇒ exit 1.
// Shared machinery: scripts/lib/eyeBuild.mjs.

import { mkdtemp } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { makeOnce, assertCleanTargets, buildTree, serve, runSpec, readResults } from "./lib/eyeBuild.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BEFORE_REF = "7a97b3b"; // wave 3 after STOP 2 — the last tree with the old bubble
const PROJECTS = (process.env.EYE_PROJECTS || "pixel7,desktop1440").split(",").map((s) => s.trim()).filter(Boolean);
const OUT = join(ROOT, "eye-evidence", "probe-tooltip");
const ONLY = process.env.EYE_ARMS ? process.env.EYE_ARMS.split(",") : null; // EYE_ARMS=BEFORE — the red-before run alone

let failures = 0;
const ok = (id, cond, label, detail = "") => {
  console.log(`${cond ? "✅" : "❌"} ${id}  ${label}${!cond && detail ? `\n      ${detail}` : ""}`);
  if (!cond) failures++;
};
const die = (msg) => { console.log(`\n❌ eye-tooltip-probe: ${msg}`); process.exit(1); };
const once = makeOnce(die);

const FILES = ["src/components/ui/InfoTooltip.jsx", "src/components/ui/TermTooltip.jsx"].map((f) => join(ROOT, f));
assertCleanTargets(ROOT, FILES, die);
const show = (f) => execFileSync("git", ["show", `${BEFORE_REF}:${f.replace(ROOT + "/", "")}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 26 });
const WHOLE = /^[\s\S]+$/;
const ARMS = {
  HEAD: [],
  BEFORE: FILES.map((f) => { const old = show(f); return [f, WHOLE, () => old]; }),
};
const arms = Object.keys(ARMS).filter((a) => !ONLY || ONLY.includes(a));
ok("META", arms.length > 0, `arms=${arms.join(",")} · BEFORE=${BEFORE_REF} · projects=${PROJECTS.join(",")}`);

// "tap-open · he — …" ⇒ "tap-open-he"
const KEY = (title) => { const m = /^([a-z-]+) · (he|en) —/.exec(title); return m ? `${m[1]}-${m[2]}` : undefined; };
const WORK = await mkdtemp(join(tmpdir(), "eye-tooltip-"));
const verdicts = {};
for (const arm of arms) {
  console.log(`\n── ${arm} ──`);
  const dist = await buildTree({ root: ROOT, arm, outDir: join(WORK, `dist-${arm}`), mutations: ARMS[arm], once, die });
  const { server, port } = await serve(dist);
  const json = join(OUT, `${arm}.json`);
  const run = await runSpec({ root: ROOT, spec: "tests-eye/tooltip.spec.js", projects: PROJECTS, port, json, evidenceDir: join(OUT, arm) });
  server.close();
  if (!run.ok) die(`${arm}: the spec produced no JSON report (exit ${run.status})\n${run.out.slice(-3000)}`);
  verdicts[arm] = readResults(json, KEY);
  for (const [k, v] of Object.entries(verdicts[arm]).sort()) console.log(`   ${k.padEnd(28)} ${v.status}${v.status === "failed" ? `  — ${v.msg.split("\n")[0].slice(0, 220)}` : ""}`);
}

console.log("\n── verdicts ──");
const cells = (arm) => Object.entries(verdicts[arm] || {});
if (verdicts.HEAD) {
  const bad = cells("HEAD").filter(([, v]) => v.status !== "passed" && v.status !== "skipped");
  ok("HEAD", cells("HEAD").length > 0 && bad.length === 0, `every cell green or skipped by design (${cells("HEAD").length} cells)`,
    bad.map(([k, v]) => `${k}:${v.status} ${v.msg.split("\n")[0]}`).join(" | "));
}
if (verdicts.BEFORE) {
  const touchP = PROJECTS.filter((p) => !/desktop/.test(p));
  for (const p of touchP) {
    const cell = ["he", "en"].map((l) => verdicts.BEFORE[`${p}:tap-open-${l}`] || { status: "missing", msg: "" });
    ok(`BEFORE/${p}/U5`, cell.every((c) => c.status === "failed" && /U5/.test(c.msg)),
      `tap-open RED in both languages on the old bubble (${cell.map((c) => c.status).join(" · ")}) — U5 measured, not assumed`,
      "U5 did NOT reproduce — the hypothesis fell; STOP and report (plan §9 step 3)");
  }
  const red = cells("BEFORE").filter(([, v]) => v.status === "failed").map(([k]) => k);
  console.log(`   BEFORE red cells: ${red.length}/${cells("BEFORE").length} · ${red.join(" ")}`);
}
console.log(failures ? `\n❌ eye-tooltip-probe: ${failures} verdict(s) failed` : "\n✅ eye-tooltip-probe");
process.exit(failures ? 1 : 0);
