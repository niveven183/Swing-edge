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

const NODE_MUTANTS = [
  ["NM-SKIP", [[SETTINGS, SKIP_TIMER, SKIP_TIMER.replace(" { notifySynced(userId, blob); return; }", " return;")],
               [SETTINGS, SKIP_FLUSH, SKIP_FLUSH.replace(" { notifySynced(userId, blob); return; }", " return;")]], ["S1", "S3"]],
  ["NM-CATCH", [[DELTA, WRITE_CATCH, "  } catch (e) {}\n  return true;"]], ["D9"]],
  ["NM-COALESCE", [[DELTA, COALESCE, "let next = [...ops];"]], ["D7"]],
];
const VALUE_MUTANT = [[DELTA, PUSH, "next.push({ coll, key: String(key), op, seq, value: (readLocal(store, coll, onFailure) || []).find?.((x) => COLLECTIONS[coll].key(x) === String(key)) ?? null });"]];
const show = (f) => execFileSync("git", ["show", `${BEFORE_REF}:${f.replace(ROOT + "/", "")}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const WHOLE = /^[\s\S]+$/;
const ARMS = {
  HEAD: [],
  BEFORE: [APP, SETTINGS, I18N].map((f) => { const old = show(f); return [f, WHOLE, () => old]; }),
  "MUT-EARLY": [[APP, HYDRATE, () => `${HYDRATE}\n      const __opsEarly = readOps(localStorage, { onFailure: reportDeltaFailure });`],
                [APP, OPS_LATE, () => "ops: __opsEarly,"]],
  "MUT-OVERWRITE": [[DELTA, MINE, () => "const mine = [];"]],
  "MUT-RESURRECT": [[DELTA, DEL, () => "      if (o.op === \"del\") continue;"]],
};

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
for (const arm of Object.keys(ARMS)) {
  console.log(`\n── ${arm} ──`);
  const dist = await buildTree({ root: ROOT, arm, outDir: join(WORK, `dist-${arm}`), mutations: ARMS[arm], once, die });
  const { server, port } = await serve(dist);
  const json = join(OUT, `${arm}.json`);
  const run = await runSpec({ root: ROOT, spec: "tests-eye/hydration.spec.js", projects: PROJECTS, port, json, evidenceDir: join(OUT, arm) });
  server.close();
  if (!run.ok) die(`${arm}: the spec produced no JSON report (exit ${run.status})\n${run.out.slice(-3000)}`);
  verdicts[arm] = readResults(json, KEY);
  for (const [k, v] of Object.entries(verdicts[arm]).sort()) console.log(`   ${k.padEnd(14)} ${v.status}${v.status !== "passed" ? `  — ${v.msg.slice(0, 300)}` : ""}`);
}

console.log("\n── verdicts ──");
const ALL = ["H1", "H2", "H3", "H4", "H5", "C1", "C2"];
const RED = { BEFORE: ["H1", "H2", "H3", "H5"], "MUT-EARLY": ["H1", "H2"], "MUT-OVERWRITE": ["H1", "H2"], "MUT-RESURRECT": ["H4"] };
for (const p of PROJECTS) {
  const v = (arm, k) => verdicts[arm][`${p}:${k}`] || { status: "missing", msg: "" };
  const head = ALL.map((k) => [k, v("HEAD", k)]);
  ok(`HEAD/${p}`, head.every(([, r]) => r.status === "passed"), `all ${ALL.length} scenes green`, head.filter(([, r]) => r.status !== "passed").map(([k, r]) => `${k}:${r.status} ${r.msg.split("\n")[0]}`).join(" | "));
  for (const [arm, want] of Object.entries(RED)) {
    const got = want.map((k) => [k, v(arm, k)]);
    ok(`${arm}/${p}`, got.every(([, r]) => r.status === "failed"), `red: ${got.map(([k, r]) => `${k}=${r.status}`).join(" · ")}`, "the spec is BLIND to this arm");
    const ctl = ["C1", "C2"].map((k) => [k, v(arm, k)]);
    ok(`${arm}/${p}/controls`, ctl.every(([, r]) => r.status === "passed"), `controls green: ${ctl.map(([k, r]) => `${k}=${r.status}`).join(" · ")}`, "a control went red — the arm broke the app, ⛔ the merge");
  }
}

await rm(WORK, { recursive: true, force: true });
console.log(failures ? `\n❌ eye-sync-probe: ${failures} verdict(s) failed — the merge is not proven` : "\n✅ eye-sync-probe — node mutants killed · G1J keys-only · HEAD green · BEFORE + 3 mutants red · controls green");
process.exit(failures ? 1 : 0);
