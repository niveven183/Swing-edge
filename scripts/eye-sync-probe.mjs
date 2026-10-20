// scripts/eye-sync-probe.mjs — the RED-BEFORE + MUTANT arm for the hydration delta merge
// (B-406 · B-397 · B-407). Plan: docs/plans/PLAN-2026-10-05-b406-b397-hydration-delta.md
//
//   npm run probe:eye:sync                              pixel7 (local, Chromium)
//   npm run probe:eye:sync -- --node-only               phases 1–2 only (no builds)
//   EYE_PROJECTS=pixel7,iphone14 npm run probe:eye:sync  both devices (CI)
//
// ⛔ NOT in the verify chain (real browser + builds) — `probe:` ≠ `test:`, so the "33 חוליות
// ואז build" count in CLAUDE.md §7 does not move.
//
// PHASE 1 — node mutants against test:hydration (the REAL modules; each must turn the
// EXPECTED assertions red):
//   NM-SKIP      settle only after an upsert (no notify on the alreadySent skip) ⇒ S1 · S3
//   NM-CATCH     an empty catch around the journal write                       ⇒ D9
//   NM-COALESCE  no "one op per key"                                           ⇒ D7
// PHASE 2 — the journal must hold KEYS, ⛔ values (Niv 05.10, fix ①):
//   NM-VALUE     the item value written into each op                           ⇒ probe:image G1J
// PHASE 3 — browser arms, tests-eye/hydration.spec.js against hermetic builds:
//   HEAD           the tree as committed                                       ⇒ every scene green
//   BEFORE         the three product files as they were at 19959e6             ⇒ H1 H2 H3 H5 red
//   MUT-EARLY      the journal read BEFORE the awaits                          ⇒ H1 H2 red
//   MUT-OVERWRITE  applyDelta answers with the DB alone                        ⇒ H1 H2 red
//   MUT-RESURRECT  `del` ops ignored                                           ⇒ H4 red
//   C1 · C2 (controls: a new user · a fresh device with DB-only data) are GREEN in EVERY arm.
// B-408 (14.10) — the five scalars, option B (edit gate) + the read deadline:
//   node: NM-FAIL (capitalSettled without hydrationFailed) ⇒ G3 · NM-CFG (without !configured) ⇒ G2
//         NM-NOTIMEOUT (the read raced against nothing) ⇒ test:settings block 12
//   BEFORE-408     SwingEdge_App.jsx + userSettings.js as at 3957509        ⇒ H6 C5 red
//   M3-EARLY       every gate keyed on authReady (released before the read) ⇒ H6 red
//   M3-<scalar>×5  one scalar's controls ungated                             ⇒ H6 red
//   M3-FAILLOCK    capitalSettled without hydrationFailed (a failed read locks) ⇒ C3 red
//   M5-NOTIMEOUT   the deadline detached from the request                    ⇒ C5 red
//   C4 (DB wins for a value this device did not edit) is GREEN in every B-408 arm; C3 too, except
//   in M3-FAILLOCK where it is the expected red. Each B-408 arm runs only its scenes (--grep):
//   a full spec per arm outgrew the job's ceiling. EYE_ARMS=a,b runs a subset (local).
//
// B-442 (Niv 19.10) — EYE_SYNC_SCOPE splits the probe into two CI jobs:
//   head     the HEAD arm only (⛔ node mutants) — the job `prod` waits on (`probe-sync-head`)
//   mutants  phases 1–2 + every other arm — its own job (`probe-sync-mutants`), still a failing check on the PR,
//            but ⛔ a gate for production verification. Each failure is CLASSIFIED in the step summary:
//            mutant-survived (an expected red came out green — the spec is blind) · control-red (a control went red
//            in a mutant arm — reported with the arm and the signature) · instrument. Every class exits 1.
//   (unset)  everything, as before (local).
//
// ⛔ A mutant that survives, a BEFORE that goes green, or a control that goes red ⇒ exit 1.
// Mutations are applied in place, matched EXACTLY ONCE (B-272), restored, and the restore is
// proven with git (scripts/lib/eyeBuild.mjs).

import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { makeOnce, assertCleanTargets, buildTree, serve, runSpec, readResults } from "./lib/eyeBuild.mjs";
import { makeArms } from "./lib/syncArms.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PROJECTS = (process.env.EYE_PROJECTS || "pixel7").split(",").map((s) => s.trim()).filter(Boolean);
const OUT = join(ROOT, "eye-evidence", "probe-sync");

let failures = 0;
const failed = []; // B-442: { id, cls, label, detail } — classified for the step summary
const ok = (id, cond, label, detail = "", cls = "check") => {
  console.log(`${cond ? "✅" : "❌"} ${id}  ${label}${!cond && detail ? `\n      ${detail}` : ""}`);
  if (!cond) { failures++; failed.push({ id, cls, label, detail }); }
};
const die = (msg) => { console.log(`\n❌ eye-sync-probe: ${msg}`); process.exit(1); };
const once = makeOnce(die);

const { BEFORE_REF, BEFORE_408_REF, APP, SETTINGS, I18N, DELTA, NODE_MUTANTS, SETTINGS_MUTANTS, VALUE_MUTANT, ARMS, ARM_GREP } = makeArms({ root: ROOT, die });
assertCleanTargets(ROOT, [APP, SETTINGS, I18N, DELTA], die);

const SCOPE = process.env.EYE_SYNC_SCOPE || "all";
if (!["all", "head", "mutants"].includes(SCOPE)) die(`EYE_SYNC_SCOPE must be head · mutants · (unset) — got "${SCOPE}"`);
const SELECTED_ARMS = process.env.EYE_ARMS ? process.env.EYE_ARMS.split(",").map((a) => a.trim())
  : SCOPE === "head" ? ["HEAD"] : SCOPE === "mutants" ? Object.keys(ARMS).filter((a) => a !== "HEAD") : Object.keys(ARMS);
for (const a of SELECTED_ARMS) if (!ARMS[a]) die(`EYE_ARMS: unknown arm "${a}"`);

const src = (f) => readFileSync(f, "utf8");
for (const [id, muts] of NODE_MUTANTS) for (const [f, find] of muts) once(src(f), find, id);
for (const [f, find] of VALUE_MUTANT) once(src(f), find, "NM-VALUE");
for (const [arm, muts] of Object.entries(ARMS)) for (const [f, find] of muts) once(src(f), find, arm);
ok("META", true, `all anchors match exactly once · targets clean in git · projects=${PROJECTS.join(",")}`);

// In-place mutate → run → restore → prove the restore. A restore that fails is fatal.
async function withMutations(id, muts, fn) {
  const originals = new Map();
  try {
    for (const [f, find, repl] of muts) {
      if (!originals.has(f)) originals.set(f, await readFile(f, "utf8"));
      const cur = await readFile(f, "utf8");
      once(cur, find, `${id} (live)`);
      await writeFile(f, cur.replace(find, repl), "utf8");
    }
    return await fn();
  } finally {
    for (const [f, s] of originals) await writeFile(f, s, "utf8");
    for (const f of originals.keys()) {
      try { execFileSync("git", ["diff", "--exit-code", "--quiet", "--", f], { cwd: ROOT }); }
      catch { die(`${id}: ${f} was NOT restored byte-identically — git checkout -- ${f}`); }
    }
  }
}

// B-442: the HEAD job runs no mutant at all — phases 1–2 are mutation checks and live in probe-sync-mutants.
if (SCOPE !== "head") {
// ═══ PHASE 1 — node mutants ═══════════════════════════════════════════════════
console.log("\n── phase 1 · node mutants (test:hydration) ──");
const hydration = () => spawnSync("node", ["scripts/hydration-wiring-test.mjs"], { cwd: ROOT, encoding: "utf8" });
const reds = (r) => { const m = /אדומות \(\d+\): (.*)$/m.exec(r.stdout || ""); return m ? m[1].split(" · ").map((s) => s.trim()) : []; };
const control = hydration();
ok("K0", control.status === 0, "control: test:hydration green on the unmutated tree", (control.stdout || "").split("\n").slice(-3).join(" | "));
for (const [id, muts, expect] of NODE_MUTANTS) {
  const r = await withMutations(id, muts.map(([f, find, repl]) => [f, find, repl]), async () => hydration());
  const got = reds(r);
  ok(id, r.status !== 0 && expect.every((e) => got.includes(e)), `killed by ${expect.join("+")} (red: ${got.join(",") || "none"})`, "mutant SURVIVED or was killed by the wrong assertion", "mutant-survived");
}

// B-408 — the read deadline, against test:settings.
const settingsTest = () => spawnSync("node", ["scripts/userSettings-test.mjs"], { cwd: ROOT, encoding: "utf8" });
const sCtl = settingsTest();
ok("K0s", sCtl.status === 0, "control: test:settings green on the unmutated tree", (sCtl.stdout || "").split("\n").slice(-2).join(" | "));
for (const [id, muts] of SETTINGS_MUTANTS) {
  const r = await withMutations(id, muts, async () => settingsTest());
  const out = `${r.stdout || ""}\n${r.stderr || ""}`;
  const red12 = /12\) a stalled settings read[\s\S]*✗ stalled load ⇒ status "failed"/.test(out);
  ok(id, r.status !== 0 && red12, "killed by test:settings block 12 (stalled load ⇒ failed)", out.split("\n").filter((l) => /✗/.test(l)).slice(0, 4).join(" | ") || "mutant SURVIVED", "mutant-survived");
}

// ═══ PHASE 2 — keys-only journal (probe:image G1J) ═════════════════════════════
console.log("\n── phase 2 · the journal holds keys, ⛔ values (probe:image G1J) ──");
const imageProbe = () => spawnSync("node", ["scripts/image-store-probe.mjs"], { cwd: ROOT, encoding: "utf8", env: { ...process.env, PW_CHROMIUM: process.env.EYE_CHROMIUM || process.env.PW_CHROMIUM || "" } });
const imgCtl = imageProbe();
const g1jGreen = /✅ G1J/.test(imgCtl.stdout || "");
ok("K1", imgCtl.status === 0 && g1jGreen, "control: probe:image green (G1J included) on the unmutated tree", (imgCtl.stdout + imgCtl.stderr).split("\n").filter((l) => /❌|G1J/.test(l)).join(" | "));
const imgMut = await withMutations("NM-VALUE", VALUE_MUTANT, async () => imageProbe());
// ⚠️ image-store-probe prints its ❌ lines on STDERR (console.error) — read both streams.
const imgOut = `${imgMut.stdout || ""}\n${imgMut.stderr || ""}`;
ok("NM-VALUE", imgMut.status !== 0 && /❌ G1J/.test(imgOut) && /✅ G1b/.test(imgOut),
  "value in the journal ⇒ G1J red, G1b still green (the gate measures the journal, ⛔ the quota alone)",
  imgOut.split("\n").filter((l) => /G1/.test(l)).join(" | "), "mutant-survived");
} // SCOPE !== "head"

// ═══ PHASE 3 — browser arms ═══════════════════════════════════════════════════
if (process.argv.includes("--node-only")) {
  console.log(failures ? `\n❌ eye-sync-probe (--node-only): ${failures} verdict(s) failed` : "\n✅ eye-sync-probe (--node-only) — node mutants killed · G1J keys-only");
  process.exit(failures ? 1 : 0);
}
console.log("\n── phase 3 · browser arms (tests-eye/hydration.spec.js) ──");
const KEY = (title) => { const m = /^(H\d|C\d) /.exec(title); return m ? m[1] : null; };
const WORK = await mkdtemp(join(tmpdir(), "eye-sync-"));
const verdicts = {};
for (const arm of SELECTED_ARMS) {
  console.log(`\n── ${arm} ──`);
  const dist = await buildTree({ root: ROOT, arm, outDir: join(WORK, `dist-${arm}`), mutations: ARMS[arm], once, die });
  const { server, port } = await serve(dist);
  const json = join(OUT, `${arm}.json`);
  const run = await runSpec({ root: ROOT, spec: "tests-eye/hydration.spec.js", projects: PROJECTS, port, json, evidenceDir: join(OUT, arm), grep: ARM_GREP[arm] });
  server.close();
  if (!run.ok) die(`${arm}: the spec produced no JSON report (exit ${run.status})\n${run.out.slice(-3000)}`);
  verdicts[arm] = readResults(json, KEY);
  for (const [k, v] of Object.entries(verdicts[arm]).sort()) console.log(`   ${k.padEnd(14)} ${v.status}${v.status !== "passed" ? `  — ${v.msg.slice(0, 300)}` : ""}`);
}

console.log("\n── verdicts ──");
const ALL = ["H1", "H2", "H3", "H4", "H5", "H6", "C1", "C2", "C3", "C4", "C5"];
const RED = {
  BEFORE: ["H1", "H2", "H3", "H5"], "MUT-EARLY": ["H1", "H2"], "MUT-OVERWRITE": ["H1", "H2"], "MUT-RESURRECT": ["H4"],
  "BEFORE-408": ["H6", "C5"], "M3-EARLY": ["H6"], "M3-LANG": ["H6"], "M3-CAPITAL": ["H6"], "M3-CAPCCY": ["H6"], "M3-ACCCCY": ["H6"], "M3-RISK": ["H6"],
  "M3-FAILLOCK": ["C3"], "M5-NOTIMEOUT": ["C5"],
};
// Controls per arm: green there, or the arm broke the app rather than the claim.
const CONTROLS = {
  BEFORE: ["C1", "C2"], "MUT-EARLY": ["C1", "C2"], "MUT-OVERWRITE": ["C1", "C2"], "MUT-RESURRECT": ["C1", "C2"],
  "BEFORE-408": ["C3", "C4"], "M3-EARLY": ["C4"], "M3-LANG": ["C4"], "M3-CAPITAL": ["C4"], "M3-CAPCCY": ["C4"], "M3-ACCCCY": ["C4"], "M3-RISK": ["C4"],
  "M3-FAILLOCK": ["C4"], "M5-NOTIMEOUT": ["C4"],
};
// B-425 (Niv 15.10, ①): a scene whose held read outlived its bound fails with `INSTRUMENT:` — the app
// was no longer in the window. That is ⛔ the red an arm expects (it would certify a blind arm) and
// ⛔ a green either: every such verdict is its own failed check.
const isInstrument = (r) => /\bINSTRUMENT:/.test(r.msg || "");
for (const [arm, byKey] of Object.entries(verdicts)) for (const [k, r] of Object.entries(byKey)) {
  if (isInstrument(r)) ok(`${arm}/${k}/instrument`, false, "the held settings read outlived its bound — the scene measured nothing", r.msg.slice(0, 300), "instrument");
}
for (const p of PROJECTS) {
  const v = (arm, k) => verdicts[arm][`${p}:${k}`] || { status: "missing", msg: "" };
  if (verdicts.HEAD) {
    const head = ALL.map((k) => [k, v("HEAD", k)]);
    ok(`HEAD/${p}`, head.every(([, r]) => r.status === "passed"), `all ${ALL.length} scenes green`, head.filter(([, r]) => r.status !== "passed").map(([k, r]) => `${k}:${r.status} ${r.msg.split("\n")[0]}`).join(" | "), "head-red");
  }
  for (const [arm, want] of Object.entries(RED)) {
    if (!verdicts[arm]) continue; // not selected (EYE_ARMS)
    const got = want.map((k) => [k, v(arm, k)]);
    ok(`${arm}/${p}`, got.every(([, r]) => r.status === "failed" && !isInstrument(r)), `red: ${got.map(([k, r]) => `${k}=${r.status}${isInstrument(r) ? "(INSTRUMENT)" : ""}`).join(" · ")}`, "the spec is BLIND to this arm", "mutant-survived");
    const ctl = CONTROLS[arm].map((k) => [k, v(arm, k)]);
    // B-442: the signature travels with the verdict — the arm, the scene, and the first line of its error.
    ok(`${arm}/${p}/controls`, ctl.every(([, r]) => r.status === "passed"), `controls green: ${ctl.map(([k, r]) => `${k}=${r.status}`).join(" · ")}`,
      `a control went red — ${ctl.filter(([, r]) => r.status !== "passed").map(([k, r]) => `${k}: ${String(r.msg || r.status).split("\n")[0].slice(0, 200)}`).join(" | ")}`, "control-red");
  }
}

await rm(WORK, { recursive: true, force: true });
// B-442 — the classified failures, in the step summary (⛔ only in the log): what blocked, and why.
if (process.env.GITHUB_STEP_SUMMARY) {
  const { appendFileSync } = await import("node:fs");
  const CLS = { "mutant-survived": "🔴 mutant SURVIVED — the spec is blind (blocking)", "control-red": "🟠 control RED in a mutant arm (blocks the PR · ⛔ production verification)", instrument: "🟡 INSTRUMENT — the scene measured nothing", "head-red": "🔴 HEAD red (blocks production verification)", check: "🔴 check failed" };
  const lines = [`### probe-sync · scope \`${SCOPE}\` · arms ${SELECTED_ARMS.join(", ")}`, ""];
  if (!failed.length) lines.push("✅ every expected red is red · every control green");
  for (const [cls, title] of Object.entries(CLS)) {
    const f = failed.filter((x) => x.cls === cls);
    if (!f.length) continue;
    lines.push(`**${title}** — ${f.length}`, ...f.map((x) => `- \`${x.id}\` — ${x.label}${x.detail ? ` — ${x.detail.replace(/\|/g, "\\|").slice(0, 300)}` : ""}`), "");
  }
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n") + "\n");
}
console.log(failures ? `\n❌ eye-sync-probe: ${failures} verdict(s) failed — the merge is not proven` : `\n✅ eye-sync-probe — node mutants killed · G1J keys-only · arms ${SELECTED_ARMS.join(",")} · every expected red is red · controls green`);
process.exit(failures ? 1 : 0);
