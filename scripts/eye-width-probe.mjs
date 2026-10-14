// scripts/eye-width-probe.mjs — the RED-BEFORE arm for tests-eye/width.spec.js (B-424).
//
//   npm run probe:eye:width                                                  iphoneSE,iphone14 (local)
//   EYE_PROJECTS=pixel7,iphone14,iphoneSE,iphone14promax,galaxyS8 npm run probe:eye:width   (CI)
//
// ⛔ NOT in the verify chain (a real browser + four `vite build`s) — `probe:` ≠ `test:`.
//
//   HEAD-EMPTY  the tree as committed, empty journal                         ⇒ every cell green
//   HEAD-HIST   the tree as committed, production-shaped journal (EYE_SEED_HISTORY)  ⇒ every cell green
//   MUT-HEADER  the analytics hero header back to its pre-fix classes (no wrap, no min-w-0), HIST
//               ⇒ en RED on analytics, naming «More info: Equity Curve» (the B-424 bug as measured)
//   MUT-TOOLS   the tools sub-nav back to its pre-fix classes (no wrap)      ⇒ iPhone SE · en RED on tools
//
// Measured on the pre-fix tree (13.10, local, all five devices): empty journal — iPhone SE · en red
// (analytics +21px · tools +16px); production-shaped journal — iPhone 14 · en +15px, iPhone SE · en +85px,
// iPhone SE · he +28px. The verdicts below require only what is device-independent enough to be stable:
// the 320px iPhone SE (and the 390px iPhone 14 for the header) when they are in EYE_PROJECTS.
//
// ⛔ A mutant that survives means the gate is BLIND ⇒ exit 1. Mutations are applied in place, matched
// EXACTLY ONCE (B-272), restored in a `finally`, and the restore is checked with git (scripts/lib/eyeBuild.mjs).

import { mkdtemp, rm } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { makeOnce, assertCleanTargets, buildTree, serve, runSpec, readResults } from "./lib/eyeBuild.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const APP = join(ROOT, "SwingEdge_App.jsx");
const PROJECTS = (process.env.EYE_PROJECTS || "iphoneSE,iphone14").split(",").map((s) => s.trim()).filter(Boolean);
const OUT = join(ROOT, "eye-evidence", "probe-width");

let failures = 0;
const ok = (id, cond, label, detail = "") => {
  console.log(`${cond ? "✅" : "❌"} ${id}  ${label}${!cond && detail ? `\n      ${detail}` : ""}`);
  if (!cond) failures++;
};
const die = (msg) => { console.log(`\n❌ eye-width-probe: ${msg}`); process.exit(1); };
const once = makeOnce(die);
assertCleanTargets(ROOT, [APP], die);

const HEADER_NOW = `<div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 mb-6">
                <div className="min-w-0">`;
const HEADER_OLD = `<div className="flex items-start justify-between gap-4 mb-6">
                <div>`;
const TOOLS_NOW = `<div className="flex flex-wrap justify-center gap-1 p-1 bg-slate-100 rounded-xl w-fit max-w-full mx-auto">`;
const TOOLS_OLD = `<div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit mx-auto">`;

const ARMS = {
  "HEAD-EMPTY": [],
  "HEAD-HIST": [],
  "MUT-HEADER": [[APP, HEADER_NOW, () => HEADER_OLD]],
  "MUT-TOOLS": [[APP, TOOLS_NOW, () => TOOLS_OLD]],
};
const SEEDED = (arm) => arm !== "HEAD-EMPTY";
const appSrc = readFileSync(APP, "utf8");
for (const [arm, muts] of Object.entries(ARMS)) for (const [, find] of muts) once(appSrc, find, arm);
ok("META", true, `mutation anchors match exactly once · target clean in git · projects=${PROJECTS.join(",")}`);

const KEY = (title) => (/^(he|en) — /.exec(title) || [])[1];
const WORK = await mkdtemp(join(tmpdir(), "eye-width-"));
const verdicts = {};
for (const arm of Object.keys(ARMS)) {
  console.log(`\n── ${arm} ──`);
  const dist = await buildTree({ root: ROOT, arm, outDir: join(WORK, `dist-${arm}`), mutations: ARMS[arm], once, die });
  const { server, port } = await serve(dist);
  if (SEEDED(arm)) process.env.EYE_SEED_HISTORY = "1"; else delete process.env.EYE_SEED_HISTORY;
  const json = join(OUT, `${arm}.json`);
  const run = await runSpec({ root: ROOT, spec: "tests-eye/width.spec.js", projects: PROJECTS, port, json, evidenceDir: join(OUT, arm) });
  server.close();
  if (!run.ok) die(`${arm}: the spec produced no JSON report (exit ${run.status})\n${run.out.slice(-3000)}`);
  verdicts[arm] = readResults(json, KEY);
  for (const [k, v] of Object.entries(verdicts[arm]).sort()) console.log(`   ${k.padEnd(20)} ${v.status}${v.status !== "passed" ? `  — ${v.msg.slice(0, 400)}` : ""}`);
}

console.log("\n── verdicts ──");
const v = (arm, p, l) => verdicts[arm][`${p}:${l}`] || { status: "missing", msg: "" };
for (const arm of ["HEAD-EMPTY", "HEAD-HIST"]) {
  const cells = PROJECTS.flatMap((p) => ["he", "en"].map((l) => [`${p}:${l}`, v(arm, p, l)]));
  ok(arm, cells.every(([, r]) => r.status === "passed"), `every cell green (${cells.length})`,
    cells.filter(([, r]) => r.status !== "passed").map(([k, r]) => `${k}: ${r.msg.split("\n")[0]}`).join(" | "));
}
const headerDevices = PROJECTS.filter((p) => p === "iphoneSE" || p === "iphone14");
if (headerDevices.length === 0) ok("MUT-HEADER", false, "no iphoneSE/iphone14 in EYE_PROJECTS — the header mutant cannot be judged");
for (const p of headerDevices) {
  const r = v("MUT-HEADER", p, "en");
  ok(`MUT-HEADER/${p}`, r.status === "failed" && /· en · analytics:.*More info: Equity Curve/.test(r.msg),
    `the pre-fix header ⇒ en RED on analytics naming the Equity Curve button (${r.status})`, r.msg.split("\n")[0] || "mutant SURVIVED");
}
if (PROJECTS.includes("iphoneSE")) {
  const r = v("MUT-TOOLS", "iphoneSE", "en");
  ok("MUT-TOOLS/iphoneSE", r.status === "failed" && /· en · tools:/.test(r.msg),
    `the pre-fix tools sub-nav ⇒ iPhone SE · en RED on tools (${r.status})`, r.msg.split("\n")[0] || "mutant SURVIVED");
} else ok("MUT-TOOLS", false, "no iphoneSE in EYE_PROJECTS — the tools mutant cannot be judged");

await rm(WORK, { recursive: true, force: true });
console.log(failures ? `\n❌ eye-width-probe: ${failures} verdict(s) failed — the gate is not proven` : "\n✅ eye-width-probe — HEAD-EMPTY/HIST green · MUT-HEADER red · MUT-TOOLS red");
process.exit(failures ? 1 : 0);
