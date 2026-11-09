// scripts/probe-scene.mjs — B-425 wave (09.11): `probe-flake`'s sibling for scenes that are NOT hydration scenes.
// probe-flake scores H1/H2/H4/C4/Q* and DIES on a failure without a hydration diag; F1c (sign-in settles),
// F2 (journal actions) and F5 (first-run path) have none. Same boundary (E11): HERMETIC, loopback, no secret,
// retries 0, trace + video + screenshot kept for every FAILING repeat (playwright.flake.config.js).
//
//   node scripts/probe-scene.mjs --scene SIGNIN  --project iphone14 --repeat 100 [--block off] [--shard 2]
//   node scripts/probe-scene.mjs --scene ACTIONS --project desktop1440 --repeat 100
//   node scripts/probe-scene.mjs --scene PATH    --project iphone14tall --repeat 20
//   node scripts/probe-scene.mjs --summarize <dir>        one table from many cells (CI)
//
// --block off  = the tree BEFORE this wave (the hermetic app may reach the open internet:
//                EYE_SELFTEST_ALLOW_OUTSIDE=1, tests-eye/hermetic.js). Default = block on (HEAD).
// ⛔ NOT in the verify chain (`probe:` ≠ `test:`). Exit 1 = THE INSTRUMENT IS BROKEN (fewer results than
// repeats · a skipped/retried result · build or serve failed · a secret in reach). A red repeat is DATA.
import { mkdtemp, rm, mkdir, writeFile, readdir } from "node:fs/promises";
import { readFileSync, existsSync, appendFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { makeOnce, assertCleanTargets, buildTree, serve, runSpec } from "./lib/eyeBuild.mjs";
import { makeArms } from "./lib/syncArms.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "eye-evidence", "probe-scene");
const die = (m) => { console.log(`\n❌ probe-scene (instrument): ${m}`); process.exit(1); };
const argv = process.argv.slice(2);
const arg = (k, d = null) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const summary = (t) => { if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, t + "\n"); };

const Z = 1.959963984540054;
const wilson = (k, n) => { if (!n) return [NaN, NaN]; const p = k / n, d = 1 + Z * Z / n, c = p + Z * Z / (2 * n), h = Z * Math.sqrt(p * (1 - p) / n + Z * Z / (4 * n * n)); return [Math.max(0, (c - h) / d), Math.min(1, (c + h) / d)]; };
const pct = (x) => `${(x * 100).toFixed(1)}%`;
const rate = (k, n) => { const [lo, hi] = wilson(k, n); return `${k}/${n} = ${pct(n ? k / n : NaN)} · Wilson [${pct(lo)}, ${pct(hi)}]`; };

if (argv.includes("--plan")) {
  const list = (v) => String(v || "").split(",").map((x) => x.trim()).filter(Boolean);
  const total = Number(process.env.IN_REPEAT || "50"), shards = Number(process.env.IN_SHARDS || "2");
  const blocks = list(process.env.IN_BLOCKS || "on");
  const cellsIn = list(process.env.IN_CELLS);
  if (!cellsIn.length) die("--plan: IN_CELLS is empty (SCENE:project,…)");
  if (!(total >= 1) || !(shards >= 1)) die("--plan: repeat and shards must be ≥ 1");
  const include = [];
  for (const c of cellsIn) {
    const [sc, pr] = c.split(":");
    if (!["SIGNIN", "ACTIONS", "PATH"].includes(sc) || !pr) die(`--plan: bad cell "${c}" (SCENE:project)`);
    for (const b of blocks) {
      if (!["on", "off"].includes(b)) die(`--plan: bad block "${b}"`);
      for (let k = 1; k <= shards; k++) include.push({ scene: sc, project: pr, block: b, shard: k, repeat: Math.ceil(total / shards), id: `${sc}-${pr}-${b}-s${k}` });
    }
  }
  console.log(JSON.stringify({ include }));
  process.exit(0);
}

if (argv.includes("--summarize")) {
  const dir = resolve(arg("summarize"));
  const cells = [];
  const walk = async (d) => { for (const e of await readdir(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.isDirectory()) await walk(p); else if (e.name === "cell.json") cells.push(JSON.parse(readFileSync(p, "utf8"))); } };
  await walk(dir);
  const by = new Map();
  for (const c of cells) { const k = `${c.scene} · ${c.project} · block ${c.block}`; const a = by.get(k) || { n: 0, red: 0, msgs: [] }; a.n += c.n; a.red += c.red; a.msgs.push(...c.msgs); by.set(k, a); }
  const lines = ["### probe-scene", "", "| scene · project · block | red / n | first message |", "|---|---|---|"];
  for (const [k, a] of by) lines.push(`| ${k} | ${rate(a.red, a.n)} | ${a.msgs[0] ? a.msgs[0].slice(0, 140).replace(/\|/g, "\\|") : "—"} |`);
  console.log(lines.join("\n")); summary(lines.join("\n"));
  process.exit(0);
}

const SCENES = {
  SIGNIN: { spec: "tests-flake/signin.spec.js", grep: "^SIGNIN" },
  ACTIONS: { spec: "tests-eye/firstrun.spec.js", grep: "journal actions" },
  PATH: { spec: "tests-eye/firstrun.spec.js", grep: "path · " },
};
const scene = arg("scene"), PROJECT = arg("project", "iphone14"), repeat = Number(arg("repeat", "10")), shard = Number(arg("shard", "0"));
const block = arg("block", "on");
if (!SCENES[scene]) die(`unknown --scene "${scene}" (${Object.keys(SCENES).join(" · ")})`);
if (!(repeat >= 1)) die("--repeat must be ≥ 1");
if (!["on", "off"].includes(block)) die(`--block must be on|off`);
const leaked = Object.keys(process.env).filter((k) => /^(SENTINEL_|SUPABASE_SERVICE|QA_)/.test(k));
if (leaked.length) die(`a secret is in reach of a job that uploads traces (${leaked.join(", ")}) — E11`);
const wf = join(ROOT, ".github", "workflows", "probe-flake.yml");
if (existsSync(wf) && /\bsecrets\./.test(readFileSync(wf, "utf8"))) die(".github/workflows/probe-flake.yml references secrets.* — a trace job must have none (E11)");

const once = makeOnce(die);
const { APP, SETTINGS, I18N, DELTA } = makeArms({ root: ROOT, die });
assertCleanTargets(ROOT, [APP, SETTINGS, I18N, DELTA], die);

const name = `${scene}-${PROJECT}-block-${block}${shard ? `-s${shard}` : ""}`;
const dir = join(OUT, name);
await mkdir(dir, { recursive: true });
const work = await mkdtemp(join(tmpdir(), "probe-scene-"));
try {
  console.log(`\n── ${name} · repeat ${repeat} ──`);
  const dist = await buildTree({ root: ROOT, arm: "HEAD", outDir: join(work, "dist"), mutations: [], once, die });
  const { server, port } = await serve(dist);
  const json = join(dir, "report.json");
  const t0 = Date.now();
  const run = await runSpec({
    root: ROOT, spec: SCENES[scene].spec, projects: [PROJECT], port, json, evidenceDir: dir, grep: SCENES[scene].grep,
    config: "playwright.flake.config.js", extraArgs: ["--repeat-each", String(repeat)],
    env: { EYE_FLAKE_OUT: join(dir, "test-results"), ...(block === "off" ? { EYE_SELFTEST_ALLOW_OUTSIDE: "1" } : {}) },
  });
  server.close();
  if (!run.ok) die(`${name}: the spec produced no JSON report (exit ${run.status})\n${run.out.slice(-3000)}`);
  const r = JSON.parse(readFileSync(json, "utf8"));
  const recs = [];
  const walk = (s) => { for (const c of s.suites || []) walk(c); for (const sp of s.specs || []) for (const t of sp.tests || []) { const res = t.results?.[t.results.length - 1]; recs.push({ project: t.projectName, title: sp.title, status: res?.status || t.status, retry: res?.retry ?? 0, msg: (res?.errors || []).map((e) => (e.message || "").replace(/\u001b\[[0-9;]*m/g, "").split("\n").slice(0, 4).join(" ⟶ ")).join(" | ") }); } };
  for (const s of r.suites || []) walk(s);
  const mine = recs.filter((x) => x.project === PROJECT);
  // How many results the grep should yield per repeat: SIGNIN he+en = 2 · ACTIONS en+he = 2 · PATH en+he = 2.
  const per = 2;
  if (mine.length !== repeat * per) die(`${name}: ${mine.length} results, expected ${repeat} × ${per} (${scene} runs he+en per repeat) — the population is incomplete`);
  if (mine.some((x) => ["skipped", "interrupted"].includes(x.status))) die(`${name}: a skipped/interrupted result — the population is incomplete`);
  if (mine.some((x) => x.retry !== 0)) die(`${name}: a retry ran — retries must stay 0`);
  const red = mine.filter((x) => x.status !== "passed");
  const cell = { scene, project: PROJECT, block, shard, n: mine.length, red: red.length, msgs: red.map((x) => `${x.title}: ${x.msg}`), minutes: (Date.now() - t0) / 60000 };
  await writeFile(join(dir, "cell.json"), JSON.stringify(cell, null, 2));
  const line = `${scene} · ${PROJECT} · block ${block}${shard ? ` · shard ${shard}` : ""}: red ${rate(cell.red, cell.n)} · ${cell.minutes.toFixed(1)} min`;
  console.log("\n" + line); summary(`- ${line}`);
  for (const x of red.slice(0, 20)) console.log(`   ✘ ${x.title}: ${x.msg.slice(0, 300)}`);
} finally {
  await rm(work, { recursive: true, force: true });
}
