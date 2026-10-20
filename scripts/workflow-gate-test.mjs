// scripts/workflow-gate-test.mjs — B-442 (Niv 19.10): production verification must not wait on the hermetic MUTANT arms.
//
//   node scripts/workflow-gate-test.mjs [path/to/eye-playbook.yml]      (runs inside `npm run test:registry`)
//
// WHY. `prod` (C-064 · C-073 · C-074 against swing-edge.com) needed `probe-sync` as a whole, so one red CONTROL in a
// mutant arm (`M3-*` C4 on iphone14 — a tree that is never deployed) skipped production verification three runs in a row
// (INCIDENTS#36: 39154034397 · 39168681671 ×2), while every HEAD arm was green. The split: `probe-sync-head` (the
// committed tree) gates `prod`; `probe-sync-mutants` stays a check of its own — red there still fails the run and the PR.
//
// ASSERTIONS (structure only — what the YAML says, ⛔ what a run did):
//   G1  jobs `probe-sync-head` and `probe-sync-mutants` exist, and the old `probe-sync` is gone (⛔ a third copy)
//   G2  prod.needs ⊇ {wait-deploy, probe-sync-head}
//   G3  prod.needs ∌ probe-sync-mutants (nor the old probe-sync)
//   G4  both new jobs keep the old job's timeout-minutes (90) and fetch-depth 0 — moved as they were
//   G5  the workflow-level concurrency group and the paths filters are unchanged (one group · both triggers carry paths)
//   G6  ⛔ continue-on-error and ⛔ retry anywhere in the two jobs (a hidden red is the bug this file exists against)
//   M1  self red-before: the SAME checker on this YAML with probe-sync-mutants put back into prod.needs ⇒ G3 red
// ⛔ A pattern that does not match exactly once is a failure, ⛔ a skip (B-272).

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FILE = process.argv[2] || resolve(ROOT, ".github/workflows/eye-playbook.yml");
const yml = readFileSync(FILE, "utf8");

/** The jobs as { name: blockText } — every line from `  name:` to the next 2-space key (or EOF). */
function jobsOf(text) {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => l === "jobs:");
  if (start < 0) return null;
  const out = {};
  let cur = null;
  for (const l of lines.slice(start + 1)) {
    const m = /^ {2}([A-Za-z0-9_-]+):\s*$/.exec(l);
    if (m) { cur = m[1]; out[cur] = []; continue; }
    if (/^\S/.test(l)) break; // a new top-level key
    if (cur) out[cur].push(l);
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.join("\n")]));
}
function needsOf(block) {
  const inline = [...block.matchAll(/^ {4}needs:\s*\[([^\]]*)\]\s*$/gm)];
  if (inline.length === 1) return inline[0][1].split(",").map((s) => s.trim()).filter(Boolean);
  const single = [...block.matchAll(/^ {4}needs:\s*([A-Za-z0-9_-]+)\s*$/gm)];
  if (single.length === 1) return [single[0][1]];
  return null; // absent, multi-line or duplicated ⇒ the caller fails on it (⛔ a guess)
}

function check(text) {
  const res = [];
  const add = (id, ok, label, got) => res.push({ id, ok: !!ok, label, got });
  const jobs = jobsOf(text);
  if (!jobs) { add("G0", false, "`jobs:` found", "no `jobs:` key"); return res; }
  add("G1", jobs["probe-sync-head"] && jobs["probe-sync-mutants"] && !jobs["probe-sync"], "jobs probe-sync-head + probe-sync-mutants exist · the old probe-sync is gone",
    Object.keys(jobs).filter((j) => j.startsWith("probe-sync")).join(",") || "none");
  const prodNeeds = jobs.prod ? needsOf(jobs.prod) : null;
  add("G2", prodNeeds && prodNeeds.includes("wait-deploy") && prodNeeds.includes("probe-sync-head"), "prod.needs ⊇ {wait-deploy, probe-sync-head}", JSON.stringify(prodNeeds));
  add("G3", prodNeeds && !prodNeeds.includes("probe-sync-mutants") && !prodNeeds.includes("probe-sync"), "prod.needs ∌ probe-sync-mutants (nor probe-sync)", JSON.stringify(prodNeeds));
  const kept = ["probe-sync-head", "probe-sync-mutants"].map((j) => {
    const b = jobs[j] || "";
    const t = [...b.matchAll(/^ {4}timeout-minutes:\s*(\d+)\s*$/gm)].map((m) => Number(m[1]));
    const fd = [...b.matchAll(/^ {10}fetch-depth:\s*(\d+)/gm)].map((m) => Number(m[1]));
    return { j, t, fd };
  });
  add("G4", kept.every((k) => k.t.length === 1 && k.t[0] === 90 && k.fd.length === 1 && k.fd[0] === 0), "both jobs: timeout-minutes 90 · fetch-depth 0 (as the old job)", JSON.stringify(kept));
  const conc = [...text.matchAll(/^concurrency:\n {2}group: (\S+)\n {2}cancel-in-progress: (\S+)/gm)];
  const paths = (text.match(/^ {4}paths:(\s*#.*)?\s*$/gm) || []).length; // the pull_request one carries a comment
  add("G5", conc.length === 1 && conc[0][1] === "eye-playbook" && conc[0][2] === "false" && paths === 2, "concurrency eye-playbook · cancel-in-progress false · paths on push + pull_request", `concurrency×${conc.length}${conc[0] ? `=${conc[0][1]}/${conc[0][2]}` : ""} · paths×${paths}`);
  // YAML comments are prose (they may NAME the forbidden keys) — only the keys count.
  const both = ((jobs["probe-sync-head"] || "") + "\n" + (jobs["probe-sync-mutants"] || "")).replace(/(^|\s)#.*$/gm, "$1");
  add("G6", !/continue-on-error/.test(both) && !/\bretr(y|ies)\b/i.test(both), "⛔ continue-on-error · ⛔ retry in the two jobs", /continue-on-error/.test(both) ? "continue-on-error present" : /\bretr(y|ies)\b/i.test(both) ? "a retry present" : "none");
  return res;
}

const results = check(yml);
// M1 — the mutant: probe-sync-mutants back into prod.needs. The checker must say red (G3), or it cannot see the bug.
const prodNeedsLine = [...yml.matchAll(/^( {4}needs:\s*\[)([^\]]*)(\]\s*)$/gm)].filter((m) => /wait-deploy/.test(m[2]));
let m1;
if (prodNeedsLine.length !== 1) m1 = { id: "M1", ok: false, label: "self red-before: probe-sync-mutants put back into prod.needs ⇒ G3 red", got: `prod's needs line matched ${prodNeedsLine.length}× (must be 1 — B-272)` };
else {
  const mutated = yml.replace(prodNeedsLine[0][0], `${prodNeedsLine[0][1]}${prodNeedsLine[0][2]}, probe-sync-mutants${prodNeedsLine[0][3]}`);
  const g3 = check(mutated).find((r) => r.id === "G3");
  m1 = { id: "M1", ok: g3 && g3.ok === false, label: "self red-before: probe-sync-mutants put back into prod.needs ⇒ G3 red", got: g3 ? `G3 ${g3.ok ? "GREEN — the checker is blind" : "red"}` : "G3 missing" };
}
results.push(m1);

for (const r of results) console.log(`${r.ok ? "✅" : "❌"} ${r.id}  ${r.label}${r.ok ? "" : `  — got ${r.got}`}`);
const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `❌ workflow-gate: ${failed}/${results.length} assertion(s) failed — production verification is still gated on the mutant arms (B-442)` : `✅ workflow-gate: ${results.length}/${results.length} — prod waits on the deploy + the HEAD arms only`);
process.exit(failed ? 1 : 0);
