// scripts/probe-flake.mjs — B-425 (15.10): measure how often an edit fails to reach the
// settings row (H2 · C4 of tests-eye/hydration.spec.js), and capture every failure well enough to
// classify it: trace + video (playwright.flake.config.js) and the diag timeline (EYE_FLAKE_DIAG).
// Plan: docs/plans/PLAN-2026-10-15-b425-flake-diagnosis.md
//
//   npm run probe:flake -- --tree HEAD --scene H2 --project iphone14 --repeat 30 --mode isolated
//   npm run probe:flake -- --tree BEFORE-408 --scene C4 --project iphone14 --repeat 10 --mode insitu --shard 2
//   npm run probe:flake -- --scene DEBOUNCE --project iphone14       tests-flake/debounce-window.spec.js
//   npm run probe:flake -- --self-test --project iphone14             the instrument's own red-before
//   npm run probe:flake -- --summarize <dir>                          one table from many cells (CI)
//
// MODES
//   isolated — only the scene (--grep), --repeat-each N.
//   insitu   — the scene WITH ITS NEIGHBOURS IN THE ORIGINAL ORDER (Niv 15.10, fix ②): the grep of
//              the probe-sync arm where it ran historically (HEAD ⇒ the full spec · BEFORE-408 ⇒
//              (H6|C[3-5])), --repeat-each N of the WHOLE set; only the scene under test is counted.
//              A meta-gate proves each repeat ran the set in file order (startTime), or the cell is void.
//
// ⛔ NOT in the verify chain (`probe:` ≠ `test:`), so CLAUDE.md §7's count does not move.
// ⛔ retry: --repeat-each runs N independent tests; retries stays 0 (inherited from the eye config).
//
// EXIT 1 = THE INSTRUMENT IS BROKEN, ⛔ "a red was found": fewer than N results for the scene · a
// skipped/interrupted result · a failure without trace + video + diag · the order gate · build or
// serve failed · a secret in reach. A red scene is DATA: ::warning:: + the step summary, exit 0.

import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, readdirSync, appendFileSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { makeOnce, assertCleanTargets, buildTree, serve, runSpec } from "./lib/eyeBuild.mjs";
import { makeArms } from "./lib/syncArms.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "eye-evidence", "probe-flake");
const die = (msg) => { console.log(`\n❌ probe-flake (instrument): ${msg}`); process.exit(1); };
const once = makeOnce(die);

const argv = process.argv.slice(2);
const arg = (k, d = null) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const flag = (k) => argv.includes(`--${k}`);

// ═══ statistics — exact enough for n ≤ a few hundred ═══════════════════════════
const Z = 1.959963984540054;
export function wilson(k, n) {
  if (!n) return [NaN, NaN];
  const p = k / n, d = 1 + Z * Z / n, c = p + Z * Z / (2 * n), h = Z * Math.sqrt(p * (1 - p) / n + Z * Z / (4 * n * n));
  return [Math.max(0, (c - h) / d), Math.min(1, (c + h) / d)];
}
const lnFact = (() => { const t = [0]; for (let i = 1; i <= 5000; i++) t[i] = t[i - 1] + Math.log(i); return (i) => t[i]; })();
const binomCdf = (k, n, p) => {
  if (k < 0) return 0;
  if (k >= n) return 1;
  if (p <= 0) return 1;
  if (p >= 1) return 0;
  let s = 0;
  for (let i = 0; i <= k; i++) s += Math.exp(lnFact(n) - lnFact(i) - lnFact(n - i) + i * Math.log(p) + (n - i) * Math.log1p(-p));
  return Math.min(1, s);
};
const bisect = (f, lo = 0, hi = 1) => { for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (f(m)) hi = m; else lo = m; } return (lo + hi) / 2; };
export function clopperPearson(k, n) {
  if (!n) return [NaN, NaN];
  const lo = k === 0 ? 0 : bisect((p) => 1 - binomCdf(k - 1, n, p) >= 0.025);
  const hi = k === n ? 1 : bisect((p) => binomCdf(k, n, p) <= 0.025);
  return [lo, hi];
}
const pct = (x) => `${(100 * x).toFixed(1)}%`;
export const rate = (k, n) => `${k}/${n} = ${n ? pct(k / n) : "—"} · Wilson [${wilson(k, n).map(pct).join(", ")}] · C-P [${clopperPearson(k, n).map(pct).join(", ")}]`;
const quant = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.ceil(p * s.length) - 1)] : null; };

const summary = (md) => { if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${md}\n`); };

// ═══ --summarize: many cell JSONs ⇒ one table (shards summed) ══════════════════
if (flag("summarize")) {
  const dir = arg("summarize");
  if (!dir || !existsSync(dir)) die(`--summarize: "${dir}" does not exist`);
  const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
  const cells = walk(dir).filter((f) => /\/cell-[^/]+\.json$/.test(f)).map((f) => JSON.parse(readFileSync(f, "utf8")));
  if (!cells.length) die(`--summarize: no cell-*.json under ${dir}`);
  const acc = new Map();
  const winAcc = new Map();
  for (const c of cells) {
    if (c.kind === "debounce") continue;
    const wkey = [c.tree, c.scene, c.project, c.mode].join(" · ");
    if (c.window?.n) { const w = winAcc.get(wkey) || { samples: [], steps: {} }; w.samples.push(...c.window.samples); winAcc.set(wkey, w); }
    const key = [c.tree, c.scene, c.project, c.mode].join(" · ");
    const a = acc.get(key) || { n: 0, failed: 0, shards: 0, failures: [], instrument: 0 };
    a.n += c.n; a.failed += c.failed; a.shards++; a.failures.push(...c.failures.map((f) => ({ ...f, shard: c.shard }))); a.instrument += (c.instrument || []).length;
    acc.set(key, a);
  }
  const lines = ["| עץ · סצנה · דפדפן · mode | אדום | Wilson 95% | C-P 95% | shards | INSTRUMENT |", "|---|---|---|---|---|---|"];
  for (const [key, a] of [...acc].sort()) {
    lines.push(`| ${key} | ${a.failed}/${a.n} | ${wilson(a.failed, a.n).map(pct).join("–")} | ${clopperPearson(a.failed, a.n).map(pct).join("–")} | ${a.shards} | ${a.instrument} |`);
  }
  if (winAcc.size) {
    lines.push("", "| חלון מוחזק · עץ · סצנה · דפדפן · mode | n | p50 | p95 | max |", "|---|---|---|---|---|");
    for (const [k, w] of [...winAcc].sort()) lines.push(`| ${k} | ${w.samples.length} | ${quant(w.samples, 0.5)}ms | ${quant(w.samples, 0.95)}ms | ${Math.max(...w.samples)}ms |`);
  }
  const deb = cells.filter((c) => c.kind === "debounce");
  for (const c of deb) {
    lines.push("", `**debounce · ${c.tree ?? "HEAD"} · ${c.project}** — D1 n=${c.window.n}: p50 ${c.window.p50}ms · p95 ${c.window.p95}ms · max ${c.window.max}ms`);
    for (const r of c.rows) lines.push(`- ${r.scene}: lost (mock) ${rate(r.lost, r.n)}${r.byFlush == null ? "" : ` · via unload flush ${r.byFlush}/${r.n} · cancelled by the page ${r.cancelled}/${r.n}`}`);
  }
  console.log(lines.join("\n"));
  summary(lines.join("\n"));
  const allFailures = [...acc].flatMap(([key, a]) => a.failures.map((f) => `${key} · shard ${f.shard} · repeat ${f.repeat}: ${f.status} — ${f.msg.slice(0, 160)}`));
  if (allFailures.length) console.log(`\n── failures (${allFailures.length}) ──\n${allFailures.join("\n")}`);
  process.exit(0);
}

// ═══ --plan: the dispatch inputs ⇒ the matrix (one place decides the cells) ═══════════
// insitu shares one set per tree where the scenes share it (HEAD: the full spec counts H2 AND C4);
// a set is split into SHARDS parallel jobs (each its own runner) of ceil(repeat/shards) repeats.
if (flag("plan")) {
  const list = (v) => String(v || "").split(",").map((x) => x.trim()).filter(Boolean);
  const repeatIn = Number(process.env.IN_REPEAT || "30");
  const modes = list(process.env.IN_MODES || "isolated,insitu");
  const trees = list(process.env.IN_TREES || "HEAD,BEFORE-408");
  const scenesIn = list(process.env.IN_SCENES || "H2,C4");
  const projects = list(process.env.IN_PROJECTS || "iphone14,pixel7");
  const shards = Number(process.env.IN_SHARDS || "3");
  if (!(repeatIn >= 1) || !(shards >= 1)) die("--plan: repeat and shards must be ≥ 1");
  for (const m of modes) if (!["isolated", "insitu"].includes(m)) die(`--plan: unknown mode "${m}"`);
  for (const t of trees) if (!["HEAD", "BEFORE-408", "PRE-B432", "MUT-NO-CAS", "M3-CAPCCY", "M3-FAILLOCK", "PRECAS-M3-CAPCCY", "PRECAS-M3-FAILLOCK"].includes(t)) die(`--plan: unknown tree "${t}"`); // PRE-B432: main before local-first (B-435's question is about it)
  for (const x of scenesIn) if (!["H1", "H2", "H4", "C4", "Q1", "Q2", "Q3", "Q4"].includes(x)) die(`--plan: unknown scene "${x}"`);
  const insituKey = (t, x) => (t === "BEFORE-408" && x === "C4" ? "B408-C4" : "FULL");
  const cells = [];
  for (const project of projects) for (const t of trees) {
    if (modes.includes("isolated")) for (const x of scenesIn) cells.push({ tree: t, scene: x, mode: "isolated", project, repeat: repeatIn, shard: 0 });
    if (modes.includes("insitu")) {
      const groups = new Map();
      for (const x of scenesIn) groups.set(insituKey(t, x), [...(groups.get(insituKey(t, x)) || []), x]);
      const per = Math.ceil(repeatIn / shards);
      for (const g of groups.values()) for (let k = 1; k <= shards; k++) cells.push({ tree: t, scene: g.join(","), mode: "insitu", project, repeat: per, shard: k });
    }
  }
  for (const c of cells) c.id = `${c.tree}-${c.scene.replace(",", "+")}-${c.mode}-${c.project}${c.shard ? `-s${c.shard}` : ""}`;
  console.log(JSON.stringify({ include: cells }));
  process.exit(0);
}

// ═══ the hermetic boundary (E11) — checked before anything is built ═══════════
const leaked = Object.keys(process.env).filter((k) => /^(SENTINEL_|SUPABASE_SERVICE|QA_)/.test(k));
if (leaked.length) die(`a secret is in reach of a job that uploads traces (${leaked.join(", ")}) — E11`);
const wf = join(ROOT, ".github", "workflows", "probe-flake.yml");
if (existsSync(wf) && /\bsecrets\./.test(readFileSync(wf, "utf8"))) die(".github/workflows/probe-flake.yml references secrets.* — a trace job must have none (E11)");

const PROJECT = arg("project", "iphone14");
const { APP, SETTINGS, I18N, DELTA, ARMS, ARM_GREP } = makeArms({ root: ROOT, die });
assertCleanTargets(ROOT, [APP, SETTINGS, I18N, DELTA], die);

// H1/H4 (B-425, Niv 15.10 (i)): the held window's duration is measured on them — the closure condition.
const SCENE_RX = { H1: "\\bH1 [a-z]", H2: "\\bH2 [a-z]", H4: "\\bH4 [a-z]", C4: "\\bC4 [a-z]", Q1: "\\bQ1 [a-z]", Q2: "\\bQ2 [a-z]", Q3: "\\bQ3 [a-z]", Q4: "\\bQ4 [a-z]" };
// B-435 (wave B, step B-0): Q1/Q2 live in tests-flake/b435-sequence.spec.js — the photos come from the
// eye global setup (tests-eye/fixtures.js FIXTURE_DIR); EYE_B435_FREE = chars left free under the quota (Q2).
const specFor = (scene) => (scene === "DEBOUNCE" ? "tests-flake/debounce-window.spec.js" : /^Q\d/.test(scene) ? "tests-flake/b435-sequence.spec.js" : "tests-eye/hydration.spec.js");
const KEY = (title) => { const m = /^(H\d|C\d|Q\d) /.exec(title); return m ? m[1] : null; };
// insitu: the set the scene ran in historically (eye-sync-probe ARM_GREP). BEFORE-408/H2 never ran
// in that arm ⇒ the full spec, declared.
// B-441 (19.10): every arm with a historical set (ARM_GREP — the scenes probe-sync runs IN THAT ARM) runs that set when
// insitu, also under its pre-CAS twin (PRECAS-<arm>) — the eye-run reds happened insitu (C4 after the arm's red H6/C3/C5),
// never isolated (0/240). A scene the arm's set does not contain keeps the old behaviour (the full spec, declared).
const insituGrep = (tree, scene) => {
  const arm = tree.replace(/^PRECAS-/, "");
  const g = ARM_GREP[arm];
  return g && new RegExp(g).test(`${scene} x`) ? g : null;
};

// The instrument's own deterministic red for C4 (self-test only): the capital button stops setting
// the capital, so the edit can never reach the row.
const SELF_C4 = "setCapital(val);\n                        setCapitalInput(\"\");\n                        try { localStorage.setItem(\"swingEdgeCapital\", String(val)); } catch {}";
// …and the debounce scene's: the unload flush does nothing, so an edit reloaded inside the window
// can ONLY be lost — a D2 that still reads "kept" there is a blind measurement.
// ⚠️ B-432 · B-435 (16.10): after local-first the unload write is `unload` (keepalive) and the edit is ALSO kept as a
// pending in the handler — removing `flush` alone no longer removes any write (measured: S7 «lost 0/10 · by flush 10»
// on the runner). The mutant removes BOTH layers, so D2-0 can only lose the edit.
const SELF_FLUSH = "const unload = () => {\n      if (!hydratedRef.current) return;";
const SELF_PENDING = "                        recordScalar(\"capital\", val); // B-432 · B-435 — on disk before anything can unload\n";
// B-432 · B-435 (16.10): PRE-B432 = the App + userSettings as they were at f2cbbb8 (main before local-first) — the
// red-before arm of D4/D5. (settingsPending.js / the new exports exist in the tree but the old files ⛔ import them.)
const PRE_B432_REF = "f2cbbb8";
const showAt = (f, ref) => execFileSync("git", ["show", `${ref}:${f.replace(ROOT + "/", "")}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const WHOLE_FILE = /^[\s\S]+$/;
const TREES = { ...ARMS, "SELF-C4-RED": [[APP, SELF_C4, () => "setCapitalInput(\"\");"]], "SELF-NOFLUSH": [[APP, SELF_FLUSH, () => "const unload = () => {\n      return;"], [APP, SELF_PENDING, () => ""]],
  "PRE-B432": [APP, SETTINGS].map((f) => { const old = showAt(f, PRE_B432_REF); return [f, WHOLE_FILE, () => old]; }),
  // Mutant (i): the capital edit is ⛔ recorded in its handler — only the persist effect remembers it, and an unload
  // at δ≈0 comes first ⇒ D4/D5 at δ=0 MUST lose the edit, or the scene is blind to where the pending is written.
  "MUT-PENDING-EFFECT": [[APP, "                        recordScalar(\"capital\", val); // B-432 · B-435 — on disk before anything can unload\n", () => ""]],
  // B-435 · CAS (17.10) mutant (vii) at the eye: the write WITHOUT its condition ⇒ Q3/Q4 must lose setups again.
  "MUT-NO-CAS": [[SETTINGS, '.eq("user_id", userId).eq("updated_at", base).select("updated_at")', () => '.eq("user_id", userId).select("updated_at")'],
    [SETTINGS, "&updated_at=eq.${encodeURIComponent(base)}", () => ""]] };
// B-441 (Niv 19.10): the B-408 mutant arms on the tree BEFORE CAS (fac3146 = main after the harness, before PR #82) —
// App + userSettings + settingsPending as they were there, the arm's mutation on top. With «M3-* on HEAD» this asks
// whether CAS raised the C4 rate in those arms. (settingsDelta.js · hermetic.js are shared — the old trees' POST upsert
// is still modelled by hermetic's merge-duplicates branch.)
const PRECAS_REF = "fac3146";
const PENDING_LIB = join(ROOT, "src", "lib", "settingsPending.js");
const precas = () => [APP, SETTINGS, PENDING_LIB].map((f) => { const old = showAt(f, PRECAS_REF); return [f, WHOLE_FILE, () => old]; });
for (const arm of ["M3-CAPCCY", "M3-FAILLOCK"]) TREES[`PRECAS-${arm}`] = [...precas(), ...ARMS[arm]];

// Walk a Playwright JSON report ⇒ one record per (test entry × result).
function results(jsonPath) {
  const r = JSON.parse(readFileSync(jsonPath, "utf8"));
  const out = [];
  const walk = (suite) => {
    for (const s of suite.suites || []) walk(s);
    for (const spec of suite.specs || []) {
      // ⚠️ The JSON reporter carries NO repeatEachIndex (measured 15.10, Playwright 1.61.1): the repeats
      // are consecutive `tests[]` entries per spec × project, and the output dir of repeat N > 0 ends in
      // `-repeatN`. The index is the entry's order, cross-checked against that suffix wherever an
      // attachment exists — a mismatch voids the cell.
      const seen = new Map();
      for (const t of spec.tests || []) {
      const idx = seen.get(t.projectName) || 0;
      seen.set(t.projectName, idx + 1);
      for (const res of t.results || []) {
        const repeat = idx;
        for (const a of res.attachments || []) {
          if (!a.path) continue;
          const m = /-repeat(\d+)\//.exec(a.path);
          const fromPath = m ? Number(m[1]) : 0;
          if (a.name !== "video" && fromPath !== repeat) die(`${jsonPath}: entry order says repeat ${repeat}, the output dir says ${fromPath} (${a.name})`);
        }
        const msg = (res.errors || []).map((e) => (e.message || "").replace(/\u001b\[[0-9;]*m/g, "").split("\n")[0]).join(" | ");
        const stdout = (res.stdout || []).map((o) => o.text ?? "").join("");
        out.push({ title: spec.title, key: KEY(spec.title), line: spec.line, project: t.projectName, repeat, stdout, retry: res.retry, status: res.status, startTime: Date.parse(res.startTime), durationMs: res.duration, msg, attachments: (res.attachments || []).map((a) => ({ name: a.name, contentType: a.contentType, path: a.path })) });
      }
      }
    }
  };
  for (const s of r.suites || []) walk(s);
  return out;
}

// The order gate (insitu): within each repeat the set ran in FILE order (spec line), and repeats did
// not interleave. Without it "with its neighbours" is a claim, ⛔ a measurement.
function orderGate(recs, setKeys) {
  const byLine = [...new Map(recs.map((r) => [r.key, r.line])).entries()].sort((a, b) => a[1] - b[1]).map(([k]) => k);
  if (byLine.join(",") !== setKeys.join(",")) return { ok: false, seq: setKeys, want: byLine };
  const seq = [...recs].sort((a, b) => a.startTime - b.startTime).map((r) => `${r.repeat}:${r.key}`);
  const want = [];
  const reps = [...new Set(recs.map((r) => r.repeat))].sort((a, b) => a - b);
  for (const rep of reps) for (const k of setKeys) want.push(`${rep}:${k}`);
  return { ok: seq.join(",") === want.join(","), seq, want };
}

async function cell({ tree, scene, mode, repeat, shard = 0, diag = true, label = null, grepOverride = null, extraEnv = {} }) {
  if (!TREES[tree]) die(`unknown tree "${tree}"`);
  const name = label || `${tree}-${scene}-${mode}-${PROJECT}${shard ? `-s${shard}` : ""}`;
  const dir = join(OUT, name);
  await mkdir(dir, { recursive: true });
  const work = await mkdtemp(join(tmpdir(), "probe-flake-"));
  try {
    console.log(`\n── ${name} · repeat ${repeat} ──`);
    const dist = await buildTree({ root: ROOT, arm: tree, outDir: join(work, "dist"), mutations: TREES[tree], once, die });
    const { server, port } = await serve(dist);
    const json = join(dir, "report.json");
    const isDebounce = scene === "DEBOUNCE";
    const grep = grepOverride ?? (isDebounce ? null : mode === "isolated" ? SCENE_RX[scene] : insituGrep(tree, scene));
    const spec = specFor(scene.split("+")[0]);
    const t0 = Date.now();
    const run = await runSpec({
      root: ROOT, spec, projects: [PROJECT], port, json, evidenceDir: dir, grep,
      config: "playwright.flake.config.js", extraArgs: ["--repeat-each", String(repeat)],
      env: { EYE_FLAKE_DIAG: diag ? "1" : "", EYE_FLAKE_OUT: join(dir, "test-results"), EYE_B435_FIXTURES: join(ROOT, "eye-evidence", "fixtures"), ...extraEnv },
    });
    server.close();
    if (!run.ok) die(`${name}: the spec produced no JSON report (exit ${run.status})\n${run.out.slice(-3000)}`);
    const recs = results(json);
    const bad = recs.filter((r) => ["skipped", "interrupted"].includes(r.status));
    if (bad.length) die(`${name}: ${bad.length} result(s) ${[...new Set(bad.map((b) => b.status))].join("/")} — the population is incomplete`);
    if (recs.some((r) => r.retry !== 0)) die(`${name}: a retry ran — retries must stay 0`);
    return { name, dir, recs, minutes: (Date.now() - t0) / 60000, isDebounce };
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

// B-425 (Niv 15.10, (i)): the held window, from the scene's own stdout — `[window] <scene> held <ms>` (one per run
// that reached its release) and `[window-step] <step> +<ms>`. The closure condition reads `max`.
export function windowStats(recs, scene) {
  const mine = recs.filter((r) => r.key === scene && r.project === PROJECT);
  const samples = [], steps = {};
  for (const r of mine) {
    const m = /\[window\] \S+ held (\d+)ms/.exec(r.stdout || "");
    if (m) samples.push(Number(m[1]));
    for (const sm of (r.stdout || "").matchAll(/\[window-step\] (\S+) \+(\d+)ms/g)) (steps[sm[1]] ||= []).push(Number(sm[2]));
  }
  const stepStats = Object.fromEntries(Object.entries(steps).map(([k, v]) => [k, { n: v.length, p50: quant(v, 0.5), p95: quant(v, 0.95), max: Math.max(...v) }]));
  return { n: samples.length, p50: quant(samples, 0.5), p95: quant(samples, 0.95), max: samples.length ? Math.max(...samples) : null, samples, steps: stepStats };
}

// A scene's verdict + the capture each failure must carry.
// B-425 (Niv 15.10, ①): a failure whose message starts with `INSTRUMENT:` (tests-eye/hydration.spec.js
// windowIntact — the scene reached its release AFTER the bound) is the INSTRUMENT's, ⛔ a red of the scene: it is counted apart,
// leaves the population (n), and the cell exits 1 once its data is written.
function score({ name, dir, recs }, scene, repeat, { insituSet = null } = {}) {
  const mine = recs.filter((r) => r.key === scene && r.project === PROJECT);
  if (mine.length !== repeat) die(`${name}: ${mine.length} results for ${scene}, expected ${repeat}`);
  if (insituSet) {
    const g = orderGate(recs, insituSet);
    if (!g.ok) die(`${name}: insitu order gate — the set did not run in file order per repeat\n  got  ${g.seq.slice(0, 40).join(",")}\n  want ${g.want.slice(0, 40).join(",")}`);
  }
  const failures = [];
  const instrument = [];
  for (const r of mine.filter((x) => x.status !== "passed")) {
    const trace = r.attachments.find((a) => a.name === "trace" && a.path && existsSync(a.path));
    const video = r.attachments.find((a) => a.name === "video" && a.path && existsSync(a.path));
    const diagFile = join(dir, "hydration", PROJECT, `${scene}-diag${r.repeat ? `-r${r.repeat}` : ""}.json`);
    const diag = existsSync(diagFile) ? JSON.parse(readFileSync(diagFile, "utf8")) : null;
    if (!trace || !video || !diag) die(`${name}: repeat ${r.repeat} of ${scene} failed WITHOUT its capture (trace ${!!trace} · video ${!!video} · diag ${!!diag}) — a failure that cannot be classified is a blind instrument`);
    // `crossedBound`: the gate released itself (the bound) before the scene failed — a FLAG on a scene
    // red, ⛔ a reclassification: only windowIntact raises INSTRUMENT (a scene that failed earlier for its
    // own reason, e.g. an expected-red H6 timing out at 15s, is the product's red).
    const rec = { repeat: r.repeat, status: r.status, msg: r.msg, durationMs: r.durationMs, crossedBound: diag.events.some((e) => e.kind === "gate" && e.state === "auto-released"), trace: trace.path.replace(ROOT + "/", ""), video: video.path.replace(ROOT + "/", ""), diag: diagFile.replace(ROOT + "/", ""), snaps: diag.events.filter((e) => e.kind === "snap" || e.kind === "snap-failed") };
    (/\bINSTRUMENT:/.test(r.msg) ? instrument : failures).push(rec);
  }
  return { n: mine.length - instrument.length, failed: failures.length, failures, instrument };
}

// ═══ --self-test — the instrument's red-before ═══════════════════════════════════
if (flag("self-test")) {
  let bad = 0;
  const check = (id, cond, label) => { console.log(`${cond ? "✅" : "❌"} ${id}  ${label}`); if (!cond) bad++; };
  const R = 2;
  const red = await cell({ tree: "MUT-OVERWRITE", scene: "H2", mode: "isolated", repeat: R, label: `SELF-H2-RED-${PROJECT}` });
  const sRed = score(red, "H2", R);
  check("S1", sRed.failed === R, `H2 × MUT-OVERWRITE: ${sRed.failed}/${R} red (must be ${R}/${R})`);
  check("S2", sRed.failures.every((f) => f.snaps.some((s) => s.tag === "after-ok")), "every red H2 carries the after-OK snapshot");
  const c4 = await cell({ tree: "SELF-C4-RED", scene: "C4", mode: "isolated", repeat: R, label: `SELF-C4-RED-${PROJECT}` });
  const sC4 = score(c4, "C4", R);
  check("S3", sC4.failed === R, `C4 × SELF-C4-RED: ${sC4.failed}/${R} red (must be ${R}/${R})`);
  check("S4", sC4.failures.every((f) => f.snaps.some((s) => s.tag === "after-click")), "every red C4 carries the after-click snapshot");
  check("S5", sC4.failures.every((f) => existsSync(join(ROOT, `eye-evidence/probe-flake/SELF-C4-RED-${PROJECT}/hydration/${PROJECT}/C4${f.repeat ? `-r${f.repeat}` : ""}.json`))), "a red C4 writes its evidence (finally) — before B-425 it wrote none");
  const green = await cell({ tree: "HEAD", scene: "H2", mode: "isolated", repeat: R, label: `SELF-H2-HEAD-${PROJECT}` });
  const sGreen = score(green, "H2", R);
  check("S6", sGreen.failed === 0 && sGreen.instrument.length === 0, `H2 × HEAD: ${sGreen.failed}/${R} red · ${sGreen.instrument.length} instrument (must be 0/${R} · 0)`);
  // S8 (B-433): the production GA property never hears from a hermetic run — GA requests ARE attempted
  // (index.html loads gtag.js — so the check is not blind), and NONE is answered.
  const gaEv = [...Array(R).keys()].flatMap((i) => {
    const f = join(green.dir, "hydration", PROJECT, `H2-diag${i ? `-r${i}` : ""}.json`);
    return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")).events.filter((e) => e.kind === "ga") : [{ kind: "ga", phase: "missing-diag" }];
  });
  const gaReq = gaEv.filter((e) => e.phase === "req").length, gaRes = gaEv.filter((e) => e.phase === "res").length;
  check("S8", gaReq > 0 && gaRes === 0 && !gaEv.some((e) => e.phase === "missing-diag"), `GA in a hermetic run: ${gaReq} attempted · ${gaRes} answered (must be >0 · 0) — B-433`);
  // S9 (B-425 ①): a window held past its bound fails as INSTRUMENT, ⛔ as a red of the scene.
  const bound = await cell({ tree: "HEAD", scene: "H2", mode: "isolated", repeat: 1, label: `SELF-H2-BOUND-${PROJECT}`, extraEnv: { EYE_SELFTEST_GATE_HOLD_MS: "200" } });
  const sBound = score(bound, "H2", 1);
  check("S9", sBound.instrument.length === 1 && sBound.failed === 0, `H2 with a 200ms hold bound: ${sBound.instrument.length} instrument · ${sBound.failed} scene red (must be 1 · 0)${sBound.instrument[0] ? ` — ${sBound.instrument[0].msg.slice(0, 120)}` : ""}`);
  const nf = await cell({ tree: "SELF-NOFLUSH", scene: "DEBOUNCE", mode: "isolated", repeat: 1, diag: false, label: `SELF-NOFLUSH-${PROJECT}`, grepOverride: "\\bD2-0 " });
  const nfRed = nf.recs.filter((r) => r.status !== "passed");
  const nfFile = join(nf.dir, "debounce", PROJECT, "D2-0.json");
  const nfj = existsSync(nfFile) ? JSON.parse(readFileSync(nfFile, "utf8")) : null;
  check("S7", !nfRed.length && nfj && nfj.n === 10 && nfj.lost === 10 && nfj.byFlush === 0, `D2-0 × SELF-NOFLUSH: lost ${nfj?.lost}/${nfj?.n} · by flush ${nfj?.byFlush} (must be 10/10 · 0) — the debounce scene can see a lost edit`);
  summary(`### probe-flake self-test · ${PROJECT}\n${bad ? "❌" : "✅"} S1–S9 (${bad} failed)`);
  if (bad) die(`self-test: ${bad} check(s) failed — the instrument cannot be trusted`);
  console.log(`\n✅ probe-flake self-test · ${PROJECT} — the instrument sees red and captures it`);
  process.exit(0);
}

// ═══ one measurement cell ═══════════════════════════════════════════════════════
const scenes = String(arg("scene", "")).split(",").filter(Boolean);
const scene = scenes.join(",");
const tree = arg("tree", "HEAD");
const mode = arg("mode", "isolated");
const repeat = Number(arg("repeat", "30"));
const shard = Number(arg("shard", "0"));
if (!scenes.length || !scenes.every((x) => ["H1", "H2", "H4", "C4", "Q1", "Q2", "Q3", "Q4", "DEBOUNCE"].includes(x)) || (scenes.includes("DEBOUNCE") && scenes.length > 1)) die(`--scene must be H1 · H2 · H4 · C4 (comma-separated insitu) · DEBOUNCE (got "${scene}")`);
if (scenes.length > 1 && mode !== "insitu") die("several scenes in one run only make sense insitu (one set counts each)");
if (scenes.length > 1 && new Set(scenes.map((x) => insituGrep(tree, x))).size > 1) die(`${scenes.join(",")} do not share an insitu set on ${tree}`);
if (!["isolated", "insitu"].includes(mode)) die(`--mode must be isolated · insitu (got "${mode}")`);
if (!(repeat >= 1)) die(`--repeat must be ≥ 1 (got "${arg("repeat")}")`);

if (scene === "DEBOUNCE") {
  // --tree (B-432: PRE-B432 is the red-before arm) · --grep (e.g. "\\bD[45]-" — only the drop-cancelled scenes).
  const dGrep = arg("grep");
  const c = await cell({ tree, scene, mode: "isolated", repeat: 1, diag: false, label: `DEBOUNCE-${tree}-${PROJECT}`, grepOverride: dGrep });
  const red = c.recs.filter((r) => r.status !== "passed");
  if (red.length) die(`DEBOUNCE: ${red.length} scene(s) could not reach an outcome — ${red.map((r) => `${r.title.split(" ")[0]}: ${r.msg.slice(0, 160)}`).join(" | ")}`);
  const ev = join(c.dir, "debounce", PROJECT);
  const read = (f) => JSON.parse(readFileSync(join(ev, f), "utf8"));
  const d1 = existsSync(join(ev, "D1.json")) ? read("D1.json") : null;
  if (!dGrep && (!d1 || d1.n !== 30)) die(`DEBOUNCE: D1 has ${d1?.n} samples, expected 30`);
  const s = d1 ? [...d1.samplesMs].sort((a, b) => a - b) : [];
  const q = (p) => s[Math.min(s.length - 1, Math.ceil(p * s.length) - 1)];
  const rows = readdirSync(ev).filter((f) => /^(D2|D3|D4|D5|K1)-\d+\.json$/.test(f)).sort().map((f) => { const j = read(f); return { scene: j.scene, n: j.n, lost: j.lost, byFlush: j.byFlush ?? null, cancelled: j.cancelled ?? null }; });
  for (const r of rows) if (r.n !== 10) die(`DEBOUNCE: ${r.scene} has ${r.n} trials, expected 10`);
  const out = { kind: "debounce", tree, project: PROJECT, window: { n: s.length, p50: q(0.5), p95: q(0.95), max: s[s.length - 1] ?? null, samplesMs: d1?.samplesMs ?? [] }, rows };
  await writeFile(join(OUT, `cell-DEBOUNCE-${tree}-${PROJECT}.json`), JSON.stringify(out, null, 2));
  const extra = (r) => (r.byFlush == null ? "" : ` · left only via the unload flush ${r.byFlush}/${r.n} · of which cancelled by the page ${r.cancelled}/${r.n}`);
  const md = [`### debounce window · ${tree} · ${PROJECT}`, `D1 n=${s.length}: p50 ${out.window.p50}ms · p95 ${out.window.p95}ms · max ${out.window.max}ms`, ...rows.map((r) => `- ${r.scene}: lost (mock) ${rate(r.lost, r.n)}${extra(r)}`)].join("\n");
  console.log(md); summary(md);
  for (const r of rows) if (r.lost) console.log(`::warning::B-425 ${r.scene} (${PROJECT}): ${r.lost}/${r.n} edits lost`);
  for (const r of rows) if (r.cancelled) console.log(`::warning::B-425 ${r.scene} (${PROJECT}): ${r.cancelled}/${r.n} edits left only through the unload flush and the page cancelled that request`);
  process.exit(0);
}

const c = await cell({ tree, scene: scenes.join("+"), mode, repeat, shard });
let insituSet = null;
if (mode === "insitu") {
  // The set = every scene that ran, in the order repeat 0 ran it; the order gate then holds it to file order.
  insituSet = c.recs.filter((r) => r.repeat === 0).sort((a, b) => a.startTime - b.startTime).map((r) => r.key);
  for (const x of scenes) if (!insituSet.includes(x)) die(`insitu: ${x} is not in the set that ran (${insituSet.join(",")})`);
}
let instrumentTotal = 0;
for (const sc of scenes) {
  const s = score(c, sc, repeat, { insituSet });
  instrumentTotal += s.instrument.length;
  for (const f of s.instrument) console.log(`::error::B-425 INSTRUMENT ${tree}/${sc}/${PROJECT}/${mode} repeat ${f.repeat}: ${f.msg.slice(0, 240)}`);
  const win = windowStats(c.recs, sc);
  if (win.n) console.log(`window ${sc}: n=${win.n} p50 ${win.p50}ms · p95 ${win.p95}ms · max ${win.max}ms · steps ${Object.entries(win.steps).map(([k, v]) => `${k} p50 ${v.p50}/max ${v.max}`).join(" · ")}`);
  const out = { kind: "cell", window: win, tree, scene: sc, mode, project: PROJECT, shard, repeat, n: s.n, failed: s.failed, failures: s.failures, instrument: s.instrument, set: insituSet, minutes: Number(c.minutes.toFixed(1)) };
  await writeFile(join(OUT, `cell-${tree}-${sc}-${mode}-${PROJECT}${shard ? `-s${shard}` : ""}.json`), JSON.stringify(out, null, 2));
  const line = `${tree} · ${sc} · ${PROJECT} · ${mode}${shard ? ` · shard ${shard}` : ""}${insituSet ? ` (set ${insituSet.join("→")})` : ""}: red ${rate(s.failed, s.n)} · run ${out.minutes} min`;
  console.log(`\n${line}`);
  summary(`- ${line}`);
  for (const f of s.failures) console.log(`::warning::B-425 ${tree}/${sc}/${PROJECT}/${mode} repeat ${f.repeat}: ${f.status} — ${f.msg.slice(0, 200)}`);
}
if (instrumentTotal) die(`${instrumentTotal} run(s) failed as INSTRUMENT (the held read outlived its bound) — data written, but the cell is not a clean measurement`);
// B-435 Q2 (16.10): a quota variant whose quota NEVER threw measured nothing. Measured: run 38922223377 — the runner
// stores smaller photos (iphone14 ~131KB, pixel7 ~60KB per setup vs 218KB locally), EYE_B435_FREE 1.5M was never
// reached, and the 0/100 read like a negative result. ⛔ again: no QuotaExceededError in any repeat ⇒ exit 1.
if (scenes.includes("Q2")) {
  const diagDir = join(c.dir, "hydration", PROJECT);
  const diags = existsSync(diagDir) ? readdirSync(diagDir).filter((f) => /^Q2-diag(-r\d+)?\.json$/.test(f)).map((f) => JSON.parse(readFileSync(join(diagDir, f), "utf8"))) : [];
  const bit = diags.filter((d) => d.events.some((e) => e.kind === "quota")).length;
  console.log(`Q2 quota pressure: a QuotaExceededError in ${bit}/${diags.length} repeats (EYE_B435_FREE=${process.env.EYE_B435_FREE || "1500000"})`);
  summary(`- Q2 quota pressure: QuotaExceededError in ${bit}/${diags.length} repeats`);
  if (!bit) die(`Q2: the quota never threw in ${diags.length} repeats — the variant measured nothing (lower EYE_B435_FREE for this runner)`);
}
// B-435 hypothesis 10 (17.10): a late-apply variant in which NO cancelled request was ever applied late measured
// nothing — the same rule as Q2's pressure gate.
for (const sc of scenes.filter((x) => x === "Q3" || x === "Q4")) {
  const diagDir = join(c.dir, "hydration", PROJECT);
  const rx = new RegExp(`^${sc}-diag(-r\\d+)?\\.json$`);
  const diags = existsSync(diagDir) ? readdirSync(diagDir).filter((f) => rx.test(f)).map((f) => JSON.parse(readFileSync(join(diagDir, f), "utf8"))) : [];
  // B-435 · CAS (17.10): a late arrival is either APPLIED (the overwrite) or REJECTED by its own condition (the fix).
  const isLate = (e) => e.kind === "late-applied" || e.kind === "late-rejected";
  const arrivals = diags.flatMap((d) => d.events.filter(isLate));
  const lates = arrivals.filter((e) => e.kind === "late-applied");
  const rejected = arrivals.length - lates.length;
  const lateRepeats = diags.filter((d) => d.events.some(isLate)).length;
  const backwards = lates.filter((e) => e.backwards).length;
  const overwrote = lates.filter((e) => e.over.playbook.some((x) => !e.playbook.includes(x))).length;
  const line = `${sc} late arrivals in ${lateRepeats}/${diags.length} repeats (${arrivals.length} requests): applied ${lates.length} · REFUSED by their condition ${rejected} · token went backwards ${backwards}/${lates.length} · overwrote a setup the row held ${overwrote}/${lates.length}`;
  console.log(line);
  summary(`- ${line}`);
  if (!lateRepeats) die(`${sc}: no cancelled request ever arrived late in ${diags.length} repeats — the variant measured nothing`);
}
process.exit(0);
