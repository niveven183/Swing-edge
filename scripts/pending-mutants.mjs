// scripts/pending-mutants.mjs — B-432 · B-435 (16.10): the mutants of the local-first change must each be KILLED by
// a named assertion. Plan: docs/plans/PLAN-2026-10-16-b432-b435-local-first.md
//
//   npm run probe:pending
//
// ⛔ NOT in the verify chain (`probe:` ≠ `test:`). Node only: mutate in place (each anchor matched EXACTLY once —
// B-272), run the module harness, restore, PROVE the restore with git. Children are ASYNC (⛔ spawnSync — the
// B-425 rule). The eye mutant (i) — the pending written outside the handler — is probe-flake's MUT-PENDING-EFFECT
// tree (D4/D5 at δ=0 must lose the edit).
//
//   M-ii   no base check ⇒ every pending «applies»            ⇒ test:settings 13b conflict · test:hydration P4
//   M-iii  keepalive:false                                     ⇒ test:settings 13f
//   M-iv   settled BEFORE the 2xx (notify on the way out)      ⇒ test:settings 13e ({error} ⇒ pending stays)
//   M-v    lastSent seeded from the mirror on «no row»          ⇒ test:settings 13i (B-361: a first write is never sent)
//   M-vi   no inflight check ⇒ OUR landed write reads as foreign ⇒ test:settings 13b «earlier inflight» · test:hydration P6

import { readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PENDING = join(ROOT, "src", "lib", "settingsPending.js");
const SETTINGS = join(ROOT, "src", "lib", "userSettings.js");
let failures = 0;
const ok = (id, cond, label, detail = "") => { console.log(`${cond ? "✅" : "❌"} ${id}  ${label}${!cond && detail ? `\n      ${detail}` : ""}`); if (!cond) failures++; };
const die = (m) => { console.log(`\n❌ pending-mutants: ${m}`); process.exit(1); };
const run = (args) => new Promise((done) => execFile("node", args, { cwd: ROOT, maxBuffer: 32 * 1024 * 1024 }, (err, stdout, stderr) => done({ status: err ? (err.code ?? 1) : 0, out: `${stdout}\n${stderr}` })));
const git = (args) => new Promise((done, fail) => execFile("git", args, { cwd: ROOT }, (err, out) => (err ? fail(err) : done(out))));

for (const f of [PENDING, SETTINGS]) {
  const dirty = await git(["status", "--porcelain", "--", f]).catch((e) => die(`git cannot read the repository (${e.message.split("\n")[0]})`));
  if (dirty.trim()) die(`${f.replace(ROOT + "/", "")} has uncommitted changes — the restore check would be meaningless`);
}

const MUTANTS = [
  ["M-ii", PENDING, "  if (pending.base == null || rowToken === pending.base) return { action: \"apply\", apply: { ...pending.values } };",
    "  return { action: \"apply\", apply: { ...pending.values } };",
    [["scripts/userSettings-test.mjs", /✗ 13b any other token ⇒ «conflict»/], ["scripts/hydration-wiring-test.mjs", /P4 [^\n]*✗|🔴 אדומות[^\n]*\bP4\b/]]],
  ["M-iii", SETTINGS, "    keepalive: true,", "    keepalive: false,",
    [["scripts/userSettings-test.mjs", /✗ 13f flushKeepalive: one POST with keepalive:true/]]],
  ["M-iv", SETTINGS, "  try {\n    const { error } = await client\n      .from(TABLE)\n      .upsert({ user_id: userId, settings: blob, updated_at: token });",
    "  notifySynced(userId, blob, token);\n  try {\n    const { error } = await client\n      .from(TABLE)\n      .upsert({ user_id: userId, settings: blob, updated_at: token });",
    [["scripts/userSettings-test.mjs", /✗ 13e after \{ error \}[^\n]*pending STAYS/]]],
  ["M-v", SETTINGS, "      lastSent.delete(userId);\n      lastToken.delete(userId); // no row",
    "      lastSent.set(userId, stableStringify(mirror));\n      lastToken.delete(userId); // no row",
    [["scripts/userSettings-test.mjs", /✗ 13i no row \+ mirror = the first edit/]]],
  ["M-vi", PENDING, "  const ours = Array.isArray(pending.inflight) && rowToken != null && pending.inflight.includes(rowToken);",
    "  const ours = false;",
    // ⚠️ ⛔ 13h/P5: with every value equal to the row, «no rejected value ⇒ landed» gives the same verdict — the inflight
    // check matters when OUR token is in the row and a newer value is not (measured 16.10: 13h/P5 stayed green).
    [["scripts/userSettings-test.mjs", /✗ 13b row = an EARLIER inflight token/], ["scripts/hydration-wiring-test.mjs", /P6 [^\n]*✗|🔴 אדומות[^\n]*\bP6\b/]]],
];

// Controls: both harnesses green on the unmutated tree — or a red below would mean nothing.
for (const h of ["scripts/userSettings-test.mjs", "scripts/hydration-wiring-test.mjs"]) {
  const r = await run([h]);
  ok(`K-${h.split("/").pop()}`, r.status === 0, `control: ${h} green on the unmutated tree`, r.out.split("\n").slice(-3).join(" | "));
}

for (const [id, file, find, repl, killers] of MUTANTS) {
  const orig = await readFile(file, "utf8");
  const n = orig.split(find).length - 1;
  if (n !== 1) die(`${id}: anchor matched ${n}× in ${file.replace(ROOT + "/", "")} (must be exactly 1 — B-272)`);
  try {
    await writeFile(file, orig.replace(find, repl), "utf8");
    const results = [];
    for (const [h, rx] of killers) { const r = await run([h]); results.push({ h, killed: r.status !== 0 && rx.test(r.out), red: r.out.split("\n").filter((l) => /✗|🔴 אדומות/.test(l)).slice(0, 3).join(" | ") }); }
    ok(id, results.every((x) => x.killed), `killed by ${results.map((x) => x.h.split("/").pop()).join(" + ")}`, results.map((x) => `${x.h.split("/").pop()}: ${x.killed ? "killed" : "SURVIVED"} — ${x.red || "no red"}`).join(" || "));
  } finally {
    await writeFile(file, orig, "utf8");
    await git(["diff", "--exit-code", "--quiet", "--", file]).catch(() => die(`${id}: ${file} was NOT restored byte-identically — git checkout -- ${file}`));
  }
}

console.log(failures ? `\n❌ pending-mutants: ${failures} verdict(s) failed` : "\n✅ pending-mutants — every mutant killed by a named assertion · controls green");
process.exit(failures ? 1 : 0);
