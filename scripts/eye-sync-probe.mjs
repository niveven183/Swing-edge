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

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BEFORE_REF = "19959e6"; // the last tree before the delta merge
const BEFORE_408_REF = "3957509"; // B-408 — the last tree before the scalar edit gate
const PROJECTS = (process.env.EYE_PROJECTS || "pixel7").split(",").map((s) => s.trim()).filter(Boolean);
const OUT = join(ROOT, "eye-evidence", "probe-sync");

let failures = 0;
const ok = (id, cond, label, detail = "") => {
  console.log(`${cond ? "✅" : "❌"} ${id}  ${label}${!cond && detail ? `\n      ${detail}` : ""}`);
  if (!cond) failures++;
};
const die = (msg) => { console.log(`\n❌ eye-sync-probe: ${msg}`); process.exit(1); };
const once = makeOnce(die);

const APP = join(ROOT, "SwingEdge_App.jsx");
const SETTINGS = join(ROOT, "src", "lib", "userSettings.js");
const I18N = join(ROOT, "src", "i18n.js");
const DELTA = join(ROOT, "src", "lib", "settingsDelta.js");
assertCleanTargets(ROOT, [APP, SETTINGS, I18N, DELTA], die);

// ═══ anchors ═════════════════════════════════════════════════════════════════
const SKIP_TIMER = "the delta journal waits for (lastSent is set only from a confirmed read or write).\n    if (alreadySent(userId, blob)) { notifySynced(userId, blob); return; }";
const SKIP_FLUSH = "or closing the tab re-sends the unchanged blob the timer just declined to send.\n  if (alreadySent(userId, blob)) { notifySynced(userId, blob); return; }";
const WRITE_CATCH = "  } catch (e) {\n    fail(onFailure, \"write\", e);\n    return false;\n  }";
const COALESCE = "let next = ops.filter((o) => !(o.coll === coll && o.key === String(key)));";
const PUSH = "next.push({ coll, key: String(key), op, seq });";
const HYDRATE = "const hydrate = async () => {";
const OPS_LATE = "ops: readOps(localStorage, { onFailure: reportDeltaFailure }),";
const MINE = "const mine = ops.filter((o) => o.coll === coll).sort((a, b) => a.seq - b.seq);";
const DEL = "      if (o.op === \"del\") {\n        if (at >= 0) out.splice(at, 1);\n        continue;\n      }";
// B-408 anchors
const SETTLED = "const capitalSettled = hydrationDone || hydrationFailed || !isSupabaseConfigured;";
const RACE = "return await Promise.race([build(ctl.signal), deadline]);";
const GATE = "disabled={!capitalSettled}";
// Remove ONE site's gate: the anchor ends in it, so the mutant is exactly that line.
const UNGATE = (anchor) => [APP, anchor, () => anchor.replace(/\n\s*disabled=\{!capitalSettled\}$/, "")];
const G408 = {
  lang: "onChange={e => setLang(e.target.value)}\n                  disabled={!capitalSettled}",
  capitalInput: "onChange={e => setCapitalInput(e.target.value)}\n                    disabled={!capitalSettled}",
  capitalBtn: "localStorage.setItem(\"swingEdgeCapital\", String(val)); } catch {}\n                      }\n                    }}\n                    disabled={!capitalSettled}",
  capitalCurrency: "localStorage.setItem(\"swingEdgeCapitalCurrency\", c); } catch {}\n                        }}\n                        disabled={!capitalSettled}",
  accountCurrency: "localStorage.setItem(\"swingEdgeAccountCurrency\", c); } catch {}\n                        }}\n                        disabled={!capitalSettled}",
  riskInput: "onChange={e => setRiskInput(e.target.value)}\n                    disabled={!capitalSettled}",
  riskBtn: "localStorage.setItem(\"swingEdgeRiskPct\", String(val)); } catch {}\n                      }\n                    }}\n                    disabled={!capitalSettled}",
};

const NODE_MUTANTS = [
  ["NM-SKIP", [[SETTINGS, SKIP_TIMER, SKIP_TIMER.replace(" { notifySynced(userId, blob); return; }", " return;")],
               [SETTINGS, SKIP_FLUSH, SKIP_FLUSH.replace(" { notifySynced(userId, blob); return; }", " return;")]], ["S1", "S3"]],
  ["NM-CATCH", [[DELTA, WRITE_CATCH, "  } catch (e) {}\n  return true;"]], ["D9"]],
  ["NM-COALESCE", [[DELTA, COALESCE, "let next = [...ops];"]], ["D7"]],
  // B-408
  ["NM-FAIL", [[APP, SETTLED, "const capitalSettled = hydrationDone || !isSupabaseConfigured;"]], ["G3"]],
  ["NM-CFG", [[APP, SETTLED, "const capitalSettled = hydrationDone || hydrationFailed;"]], ["G2"]],
];
// B-408 — the deadline is proven against test:settings (the module's own harness).
const SETTINGS_MUTANTS = [
  // ⚠️ Detach the signal too: with the race gone but the timer still aborting the request, the
  // abort alone ends the read as a failure and the mutant would survive — a blind arm.
  ["NM-NOTIMEOUT", [[SETTINGS, RACE, "return await build(new AbortController().signal);"]]],
];
const VALUE_MUTANT = [[DELTA, PUSH, "next.push({ coll, key: String(key), op, seq, value: (readLocal(store, coll, onFailure) || []).find?.((x) => COLLECTIONS[coll].key(x) === String(key)) ?? null });"]];
const show = (f, ref = BEFORE_REF) => execFileSync("git", ["show", `${ref}:${f.replace(ROOT + "/", "")}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const WHOLE = /^[\s\S]+$/;
const ARMS = {
  HEAD: [],
  BEFORE: [APP, SETTINGS, I18N].map((f) => { const old = show(f); return [f, WHOLE, () => old]; }),
  "MUT-EARLY": [[APP, HYDRATE, () => `${HYDRATE}\n      const __opsEarly = readOps(localStorage, { onFailure: reportDeltaFailure });`],
                [APP, OPS_LATE, () => "ops: __opsEarly,"]],
  "MUT-OVERWRITE": [[DELTA, MINE, () => "const mine = [];"]],
  "MUT-RESURRECT": [[DELTA, DEL, () => "      if (o.op === \"del\") continue;"]],
  // ── B-408 ──
  "BEFORE-408": [APP, SETTINGS].map((f) => { const old = show(f, BEFORE_408_REF); return [f, WHOLE, () => old]; }),
  "M3-EARLY": [[APP, WHOLE, (all) => {
    const n = all.split(GATE).length - 1;
    if (n !== 7) die(`M3-EARLY: ${GATE} matched ${n}× (must be exactly 7 — one per control site, B-272)`);
    return all.split(GATE).join("disabled={!authReady}");
  }]],
  "M3-LANG": [UNGATE(G408.lang)],
  "M3-CAPITAL": [UNGATE(G408.capitalInput), UNGATE(G408.capitalBtn)],
  "M3-CAPCCY": [UNGATE(G408.capitalCurrency)],
  "M3-ACCCCY": [UNGATE(G408.accountCurrency)],
  "M3-RISK": [UNGATE(G408.riskInput), UNGATE(G408.riskBtn)],
  "M3-FAILLOCK": [[APP, SETTLED, () => "const capitalSettled = hydrationDone || !isSupabaseConfigured;"]],
  "M5-NOTIMEOUT": [[SETTINGS, RACE, () => "return await build(new AbortController().signal);"]],
};
// Which scenes each arm runs. The pre-B-408 arms keep exactly the scenes they were built for.
const OLD_SCENES = "\\b(H[1-5]|C[12]) [a-z]";
const ARM_GREP = {
  HEAD: null, BEFORE: OLD_SCENES, "MUT-EARLY": OLD_SCENES, "MUT-OVERWRITE": OLD_SCENES, "MUT-RESURRECT": OLD_SCENES,
  "BEFORE-408": "\\b(H6|C[3-5]) [a-z]", "M3-EARLY": "\\b(H6|C4) [a-z]",
  "M3-LANG": "\\b(H6|C4) [a-z]", "M3-CAPITAL": "\\b(H6|C4) [a-z]", "M3-CAPCCY": "\\b(H6|C4) [a-z]", "M3-ACCCCY": "\\b(H6|C4) [a-z]", "M3-RISK": "\\b(H6|C4) [a-z]",
  "M3-FAILLOCK": "\\b(C3|C4) [a-z]", "M5-NOTIMEOUT": "\\b(C4|C5) [a-z]",
};
const SELECTED_ARMS = process.env.EYE_ARMS ? process.env.EYE_ARMS.split(",").map((a) => a.trim()) : Object.keys(ARMS);
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

// ═══ PHASE 1 — node mutants ═══════════════════════════════════════════════════
console.log("\n── phase 1 · node mutants (test:hydration) ──");
const hydration = () => spawnSync("node", ["scripts/hydration-wiring-test.mjs"], { cwd: ROOT, encoding: "utf8" });
const reds = (r) => { const m = /אדומות \(\d+\): (.*)$/m.exec(r.stdout || ""); return m ? m[1].split(" · ").map((s) => s.trim()) : []; };
const control = hydration();
ok("K0", control.status === 0, "control: test:hydration green on the unmutated tree", (control.stdout || "").split("\n").slice(-3).join(" | "));
for (const [id, muts, expect] of NODE_MUTANTS) {
  const r = await withMutations(id, muts.map(([f, find, repl]) => [f, find, repl]), async () => hydration());
  const got = reds(r);
  ok(id, r.status !== 0 && expect.every((e) => got.includes(e)), `killed by ${expect.join("+")} (red: ${got.join(",") || "none"})`, "mutant SURVIVED or was killed by the wrong assertion");
}

// B-408 — the read deadline, against test:settings.
const settingsTest = () => spawnSync("node", ["scripts/userSettings-test.mjs"], { cwd: ROOT, encoding: "utf8" });
const sCtl = settingsTest();
ok("K0s", sCtl.status === 0, "control: test:settings green on the unmutated tree", (sCtl.stdout || "").split("\n").slice(-2).join(" | "));
for (const [id, muts] of SETTINGS_MUTANTS) {
  const r = await withMutations(id, muts, async () => settingsTest());
  const out = `${r.stdout || ""}\n${r.stderr || ""}`;
  const red12 = /12\) a stalled settings read[\s\S]*✗ stalled load ⇒ status "failed"/.test(out);
  ok(id, r.status !== 0 && red12, "killed by test:settings block 12 (stalled load ⇒ failed)", out.split("\n").filter((l) => /✗/.test(l)).slice(0, 4).join(" | ") || "mutant SURVIVED");
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
  imgOut.split("\n").filter((l) => /G1/.test(l)).join(" | "));

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
for (const p of PROJECTS) {
  const v = (arm, k) => verdicts[arm][`${p}:${k}`] || { status: "missing", msg: "" };
  if (verdicts.HEAD) {
    const head = ALL.map((k) => [k, v("HEAD", k)]);
    ok(`HEAD/${p}`, head.every(([, r]) => r.status === "passed"), `all ${ALL.length} scenes green`, head.filter(([, r]) => r.status !== "passed").map(([k, r]) => `${k}:${r.status} ${r.msg.split("\n")[0]}`).join(" | "));
  }
  for (const [arm, want] of Object.entries(RED)) {
    if (!verdicts[arm]) continue; // not selected (EYE_ARMS)
    const got = want.map((k) => [k, v(arm, k)]);
    ok(`${arm}/${p}`, got.every(([, r]) => r.status === "failed"), `red: ${got.map(([k, r]) => `${k}=${r.status}`).join(" · ")}`, "the spec is BLIND to this arm");
    const ctl = CONTROLS[arm].map((k) => [k, v(arm, k)]);
    ok(`${arm}/${p}/controls`, ctl.every(([, r]) => r.status === "passed"), `controls green: ${ctl.map(([k, r]) => `${k}=${r.status}`).join(" · ")}`, "a control went red — the arm broke the app, ⛔ the merge");
  }
}

await rm(WORK, { recursive: true, force: true });
console.log(failures ? `\n❌ eye-sync-probe: ${failures} verdict(s) failed — the merge is not proven` : `\n✅ eye-sync-probe — node mutants killed · G1J keys-only · arms ${SELECTED_ARMS.join(",")} · every expected red is red · controls green`);
process.exit(failures ? 1 : 0);
