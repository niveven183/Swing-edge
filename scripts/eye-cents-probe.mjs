// scripts/eye-cents-probe.mjs — the RED-BEFORE arm for tests-eye/cents.spec.js (K2 · B-321 + B-325).
//
//   npm run probe:eye:cents                                 pixel7 only (local)
//   EYE_PROJECTS=pixel7,iphone14 npm run probe:eye:cents    both devices (CI)
//
// ⛔ NOT in the verify chain (a real browser + three `vite build`s) — `probe:` ≠ `test:`.
//
// WHY. The closure rule (DECISIONS 24.09): a `C-`/eye check closes on green only if its
// assertions were seen RED on deliberately broken code. Three trees, the SAME spec, hermetic
// (tests-eye/hermetic.js — synthetic Supabase, zero secrets):
//
//   HEAD     the tree as committed                                ⇒ a + b green
//   MUT-A1   `Math.round` back in the close toast (fmtAcct)       ⇒ a + b RED on the toast
//   MUT-B7   `Math.round` back in the setup-table payload         ⇒ a RED on the B7 cell
//
// ⛔ A mutant that survives means the spec is BLIND ⇒ exit 1. Mutations are applied in place,
// matched EXACTLY ONCE (B-272), restored in a `finally`, and the restore is checked with git.

import { mkdtemp, rm } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { makeOnce, assertCleanTargets, buildTree, serve, runSpec, readResults } from "./lib/eyeBuild.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const APP = join(ROOT, "SwingEdge_App.jsx");
const PROJECTS = (process.env.EYE_PROJECTS || "pixel7").split(",").map((s) => s.trim()).filter(Boolean);
const OUT = join(ROOT, "eye-evidence", "probe-cents");

let failures = 0;
const ok = (id, cond, label, detail = "") => {
  console.log(`${cond ? "✅" : "❌"} ${id}  ${label}${!cond && detail ? `\n      ${detail}` : ""}`);
  if (!cond) failures++;
};
const die = (msg) => { console.log(`\n❌ eye-cents-probe: ${msg}`); process.exit(1); };

// ═══ META ═══════════════════════════════════════════════════════════════════
const once = makeOnce(die);
assertCleanTargets(ROOT, [APP], die);
const ARMS = {
  HEAD: [],
  "MUT-A1": [[APP, "const shown = fmtAcct(closedTrade, pnl);", () => "const shown = fmtAcct(closedTrade, Math.round(pnl));"]],
  "MUT-B7": [[APP, "totalPnL: s.totalPnL,", () => "totalPnL: Math.round(s.totalPnL),"]],
};
const appSrc = readFileSync(APP, "utf8");
for (const [arm, muts] of Object.entries(ARMS)) for (const [, find] of muts) once(appSrc, find, arm);
ok("META", true, `mutation anchors match exactly once · target clean in git · projects=${PROJECTS.join(",")}`);

// ═══ BUILD · SERVE · RUN ════════════════════════════════════════════════════
const WORK = await mkdtemp(join(tmpdir(), "eye-cents-"));
const STEP = (title) => (/(?:^|›\s*)([ab]) · /.exec(title) || [])[1];
const verdicts = {};
for (const arm of Object.keys(ARMS)) {
  console.log(`\n── ${arm} ──`);
  const dist = await buildTree({ root: ROOT, arm, outDir: join(WORK, `dist-${arm}`), mutations: ARMS[arm], once, die });
  const { server, port } = await serve(dist);
  const json = join(OUT, `${arm}.json`);
  const run = await runSpec({ root: ROOT, spec: "tests-eye/cents.spec.js", projects: PROJECTS, port, json, evidenceDir: join(OUT, arm) });
  server.close();
  if (!run.ok) die(`${arm}: the spec produced no JSON report (exit ${run.status})\n${run.out.slice(-3000)}`);
  verdicts[arm] = readResults(json, STEP);
  for (const [k, v] of Object.entries(verdicts[arm]).sort()) console.log(`   ${k.padEnd(12)} ${v.status}${v.status !== "passed" ? `  — ${v.msg.slice(0, 400)}` : ""}`);
}

console.log("\n── verdicts ──");
for (const p of PROJECTS) {
  const v = (arm, s) => verdicts[arm][`${p}:${s}`] || { status: "missing", msg: "" };
  const head = ["a", "b"].map((s) => [s, v("HEAD", s)]);
  ok(`HEAD/${p}`, head.every(([, r]) => r.status === "passed"), "a + b green on the committed tree",
    head.filter(([, r]) => r.status !== "passed").map(([s, r]) => `${s}:${r.status} ${r.msg.split("\n")[0]}`).join(" | "));
  const a1 = ["a", "b"].map((s) => [s, v("MUT-A1", s)]);
  ok(`MUT-A1/${p}`, a1.every(([, r]) => r.status === "failed" && /close toast \((he|en)\)/.test(r.msg)),
    `a + b red on the close toast (${a1.map(([s, r]) => `${s}=${r.status}`).join(" · ")})`,
    a1.map(([s, r]) => `${s}: ${r.msg.split("\n")[0] || "mutant SURVIVED"}`).join(" | "));
  const b7 = v("MUT-B7", "a");
  ok(`MUT-B7/${p}`, b7.status === "failed" && /B7 setup cell/.test(b7.msg), `a red on the B7 setup cell (${b7.status})`,
    b7.msg.split("\n")[0] || "mutant SURVIVED — a cannot see the setup cell rounded");
}

await rm(WORK, { recursive: true, force: true });
console.log(failures ? `\n❌ eye-cents-probe: ${failures} verdict(s) failed — the spec is not proven` : "\n✅ eye-cents-probe — HEAD green · MUT-A1 red · MUT-B7 red");
process.exit(failures ? 1 : 0);
