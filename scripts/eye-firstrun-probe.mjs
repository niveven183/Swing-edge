// scripts/eye-firstrun-probe.mjs — the RED-BEFORE arm for tests-eye/firstrun.spec.js (activation wave 1).
//
//   npm run probe:eye:firstrun                                   iphone14,iphone14tall,pixel7,desktop1440
//   EYE_PROJECTS=desktop1440 npm run probe:eye:firstrun
//   node scripts/eye-firstrun-probe.mjs --arms HEAD               one arm (the diagnosis run on main)
//
// ⛔ NOT in the verify chain (real browser + one `vite build` per arm) — `probe:` ≠ `test:`.
// Plan: docs/plans/PLAN-2026-10-21-firstrun-activation.md
//
// ⛔ A mutant that survives, or a BEFORE that goes green, means the spec is BLIND ⇒ exit 1.
// Shared machinery (mutate · build · restore-and-prove · serve · run): scripts/lib/eyeBuild.mjs.

import { mkdtemp } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { makeOnce, assertCleanTargets, buildTree, serve, runSpec, readResults } from "./lib/eyeBuild.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PROJECTS = (process.env.EYE_PROJECTS || "iphone14,iphone14tall,pixel7,desktop1440").split(",").map((s) => s.trim()).filter(Boolean);
const OUT = join(ROOT, "eye-evidence", "probe-firstrun");
const argArms = (() => { const i = process.argv.indexOf("--arms"); return i > 0 ? process.argv[i + 1].split(",") : null; })();

let failures = 0;
const ok = (id, cond, label, detail = "") => {
  console.log(`${cond ? "✅" : "❌"} ${id}  ${label}${!cond && detail ? `\n      ${detail}` : ""}`);
  if (!cond) failures++;
};
const die = (msg) => { console.log(`\n❌ eye-firstrun-probe: ${msg}`); process.exit(1); };
const once = makeOnce(die);

const ARMS = {
  HEAD: [],
};
const FILES = [...new Set(Object.values(ARMS).flat().map(([f]) => f))];
assertCleanTargets(ROOT, FILES, die);
const arms = argArms || Object.keys(ARMS);
for (const a of arms) if (!ARMS[a]) die(`unknown arm ${a}`);

// Verdict key per test: "path-he" · "dashboard-en" · "label-with-trades-he" · "actions-en"
const KEY = (title) => {
  const m = /^(path|dashboard CTA|welcome label|journal actions) · (he|en)(?: · (with-trades|empty-control))? —/.exec(title);
  if (!m) return null;
  const scene = { "path": "path", "dashboard CTA": "dashboard", "welcome label": `label-${m[3]}`, "journal actions": "actions" }[m[1]];
  return `${scene}-${m[2]}`;
};

const WORK = await mkdtemp(join(tmpdir(), "eye-firstrun-"));
const verdicts = {};
for (const arm of arms) {
  console.log(`\n── ${arm} ──`);
  const dist = await buildTree({ root: ROOT, arm, outDir: join(WORK, `dist-${arm}`), mutations: ARMS[arm], once, die });
  const { server, port } = await serve(dist);
  const json = join(OUT, `${arm}.json`);
  const run = await runSpec({ root: ROOT, spec: "tests-eye/firstrun.spec.js", projects: PROJECTS, port, json, evidenceDir: join(OUT, arm) });
  server.close();
  if (!run.ok) die(`${arm}: the spec produced no JSON report (exit ${run.status})\n${run.out.slice(-3000)}`);
  verdicts[arm] = readResults(json, KEY);
  for (const [k, v] of Object.entries(verdicts[arm]).sort()) console.log(`   ${k.padEnd(34)} ${v.status}${v.status !== "passed" && v.status !== "skipped" ? `  — ${v.msg.slice(0, 600)}` : ""}`);
}

console.log("\n── verdicts ──");
if (verdicts.HEAD) {
  const bad = Object.entries(verdicts.HEAD).filter(([, v]) => v.status !== "passed" && v.status !== "skipped");
  ok("HEAD", bad.length === 0, "every scene green on the committed tree", bad.map(([k, v]) => `${k}: ${v.msg.slice(0, 300)}`).join("\n      "));
}
console.log(failures ? `\n❌ ${failures} failure(s)` : "\n✅ eye-firstrun-probe: all arms as expected");
process.exit(failures ? 1 : 0);
