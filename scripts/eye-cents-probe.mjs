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
const IC = join(ROOT, "src", "lib", "instrumentCurrency.js");
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
assertCleanTargets(ROOT, [APP, IC], die);
const ARMS = {
  HEAD: [],
  "MUT-A1": [[APP, "const shown = fmtAcct(closedTrade, pnl);", () => "const shown = fmtAcct(closedTrade, Math.round(pnl));"]],
  "MUT-B7": [[APP, "totalPnL: s.totalPnL,", () => "totalPnL: Math.round(s.totalPnL),"]],
  // ── B-300 / B-340 · the REAL population: ₪ capital (EYE_CCY=ILS seeds it, /api/fx is mocked) ──
  "ILS-HEAD":  [],
  // the label is the capital's again (B-340). The narrow read rule MASKS this at the toast, so the
  // spec's saved-label assertion is what must catch it.
  "ILS-MUT-A": [[APP, "currency: stamp.currency,", () => "currency: capitalCurrency,"]],
  // the pre-fix tree: capital label AND no narrow read rule ⇒ `contradicted` ⇒ the toast is "—".
  "ILS-OLD":   [[APP, "currency: stamp.currency,", () => "currency: capitalCurrency,"],
                [IC, 'if (stored === "ILS" && trade?.currency_source !== CURRENCY_SOURCE.MANUAL_CAPITAL)', () => 'if (stored === "ILS")']],
  // K2 is still caught in ₪: `Math.round` before the converting formatter.
  "ILS-MUT-A1": [[APP, "const shown = fmtAcct(closedTrade, pnl);", () => "const shown = fmtAcct(closedTrade, Math.round(pnl));"]],
};
const ARM_CCY = (arm) => (arm.startsWith("ILS-") ? "ILS" : undefined);
const appSrc = readFileSync(APP, "utf8");
const icSrc = readFileSync(IC, "utf8");
for (const [arm, muts] of Object.entries(ARMS)) for (const [f, find] of muts) once(f === IC ? icSrc : appSrc, find, arm);
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
  if (ARM_CCY(arm)) process.env.EYE_CCY = ARM_CCY(arm); else delete process.env.EYE_CCY;
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

for (const p of PROJECTS) {
  const v = (arm, s) => verdicts[arm][`${p}:${s}`] || { status: "missing", msg: "" };
  const ih = ["a", "b"].map((s) => [s, v("ILS-HEAD", s)]);
  ok(`ILS-HEAD/${p}`, ih.every(([, r]) => r.status === "passed"), "₪ capital: a + b green — a NUMBER carrying ₪, saved label = paper currency",
    ih.filter(([, r]) => r.status !== "passed").map(([s, r]) => `${s}:${r.status} ${r.msg.split("\n")[0]}`).join(" | "));
  const ia = ["a", "b"].map((s) => [s, v("ILS-MUT-A", s)]);
  ok(`ILS-MUT-A/${p}`, ia.every(([, r]) => r.status === "failed" && /B-340/.test(r.msg)), "label = capital ⇒ a + b RED on the saved-label assertion (B-340)",
    ia.map(([s, r]) => `${s}: ${r.msg.split("\n")[0] || "mutant SURVIVED"}`).join(" | "));
  const io = ["a", "b"].map((s) => [s, v("ILS-OLD", s)]);
  ok(`ILS-OLD/${p}`, io.every(([, r]) => r.status === "failed" && /close toast \((he|en)\)/.test(r.msg)), "the pre-fix tree is RED in ₪ ON THE TOAST (B-300 reproduced, hermetic: \"—\" instead of a number)",
    io.map(([s, r]) => `${s}: ${r.msg.split("\n")[0] || "SURVIVED"}`).join(" | "));
  const i1 = ["a", "b"].map((s) => [s, v("ILS-MUT-A1", s)]);
  ok(`ILS-MUT-A1/${p}`, i1.every(([, r]) => r.status === "failed" && /close toast \((he|en)\)/.test(r.msg)), "₪: Math.round before fmtAcct ⇒ a + b RED on the toast",
    i1.map(([s, r]) => `${s}: ${r.msg.split("\n")[0] || "mutant SURVIVED"}`).join(" | "));
}

await rm(WORK, { recursive: true, force: true });
console.log(failures ? `\n❌ eye-cents-probe: ${failures} verdict(s) failed — the spec is not proven` : "\n✅ eye-cents-probe — HEAD green · MUT-A1 red · MUT-B7 red · ILS-HEAD green · ILS-MUT-A/OLD/A1 red");
process.exit(failures ? 1 : 0);
