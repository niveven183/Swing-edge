// scripts/eye-wave1-probe.mjs — `npm run probe:eye:wave1` — the RED-BEFORE arm for tests-eye/wave1.spec.js
// (fix round 1/7 «security & money», B-456…B-460). Pattern: scripts/eye-firstrun-probe.mjs.
//
//   HEAD     the committed tree                                   ⇒ every scene green
//   BEFORE   the product files as they were at 9f47d5f            ⇒ F1 · F2 · F3 · F4 · F5 red
//   MUT-F1   esc() removed from the lesson cell                   ⇒ F1 red
//   MUT-F2   <WeeklyReviewTab calcMetrics> back to the raw calc   ⇒ F2 red
//   MUT-F3   beforeSend / beforeSendTransaction pass events through ⇒ F3 red
//   MUT-F4   the insert site's reportWriteFailure removed         ⇒ F4 red
//   MUT-F5   the reduced-motion rule for the dots removed         ⇒ F5 red
//   wave 1b (B-427/B-187, 28.10):
//   MUT-F6a  <TradeCalendar calcMetrics> back to the raw calc     ⇒ F6 red (calendar)
//   MUT-F6b  sumConverted adds the unconverted trade raw          ⇒ F6 red (calendar, no rate)
//   MUT-F6c  the day total back to `$` + toFixed(0)               ⇒ F6 red (day modal)
//   MUT-F6d  the modal rows on the CONVERTING calc (double)       ⇒ F6 red (day modal row)
//   MUT-F7   the PDF row prints an unconverted pnl under `sym`    ⇒ F7 red
// Each red must carry its own message (a red for the wrong reason is a blind gate). ⛔ A mutant that
// survives, a BEFORE that goes green, or a red HEAD ⇒ exit 1. Built with a Sentry DSN pointed at a local
// ingest (the spec routes /api/<n>/envelope/), Supabase at the hermetic synthetic origin. Zero secrets.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { makeOnce, assertCleanTargets, buildTree, serve, runSpec, readResults } from "./lib/eyeBuild.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BEFORE_REF = "9f47d5f";
const ALL = (process.env.EYE_PROJECTS || "wave1-pixel7,wave1-iphone14,wave1-desktop1440").split(",").map((s) => s.trim()).filter(Boolean);
const OUT = join(ROOT, "eye-evidence", "probe-wave1");
const argArms = (() => { const i = process.argv.indexOf("--arms"); return i > 0 ? process.argv[i + 1].split(",") : null; })();

let failures = 0;
const ok = (id, cond, label, detail = "") => {
  console.log(`${cond ? "✅" : "❌"} ${id}  ${label}${!cond && detail ? `\n      ${detail}` : ""}`);
  if (!cond) failures++;
};
const die = (msg) => { console.log(`\n❌ eye-wave1-probe: ${msg}`); process.exit(1); };
const once = makeOnce(die);

const F = (p) => join(ROOT, p);
const APP = F("SwingEdge_App.jsx"), MAIN = F("src/main.jsx"), CSS = F("src/index.css");
const CAL = F("src/components/TradeCalendar.jsx"), DTM = F("src/components/DayTradesModal.jsx"), TSTATS = F("src/lib/tradingStats.js");
const PRODUCT = [APP, MAIN, CSS, F("src/components/WeeklyReviewTab.jsx"), F("src/components/MonthlyReportTab.jsx"),
  F("src/intelligence/core/MonthlyReport.js"), F("src/lib/tradeWrite.js"), F("src/lib/userSettings.js"), CAL, DTM, TSTATS];
assertCleanTargets(ROOT, PRODUCT, die);
const show = (f) => execFileSync("git", ["show", `${BEFORE_REF}:${f.replace(ROOT + "/", "")}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const WHOLE = /^[\s\S]+$/;
const ONE = ["wave1-pixel7"];

const ARMS = {
  HEAD: { muts: [], projects: ALL, grep: null, expect: null },
  BEFORE: { muts: PRODUCT.map((f) => { const old = show(f); return [f, WHOLE, () => old]; }), projects: ALL, grep: null,
    expect: { F1: /B-456/, F2: /B-457/, F3: /B-458/, F4: /B-459/, F5: /B-460/, F6: /B-427/, F7: /B-427 \(PDF\)/ } },
  "MUT-F1": { muts: [[APP, "${esc(l.lesson)}", () => "${l.lesson}"]], projects: ONE, grep: "F1 ", expect: { F1: /B-456/ } },
  "MUT-F2": { muts: [[APP, "capital={capital}\n            calcMetrics={stableCalcTradeMetrics}", () => "capital={capital}\n            calcMetrics={calcTradeMetrics}"]], projects: ONE, grep: "F2 ", expect: { F2: /B-457 \(weekly\)/ } },
  "MUT-F3": { muts: [[MAIN, "  beforeSend: sentryBeforeSend,\n", () => "  beforeSend: (e) => e,\n"], [MAIN, "  beforeSendTransaction: sentryBeforeSendTransaction,\n", () => "  beforeSendTransaction: (e) => e,\n"]], projects: ONE, grep: "F3 ", expect: { F3: /B-458/ } },
  "MUT-F4": { muts: [[APP, '        reportWriteFailure("insert", res);\n', () => ""]], projects: ONE, grep: "F4 ", expect: { F4: /B-459: no write_failure/ } },
  "MUT-F5": { muts: [[CSS, "  .se-pulse-opacity { animation: none !important; opacity: 1; }\n", () => ""]], projects: ONE, grep: "F5 ", expect: { F5: /B-460 \((header|footer), reduced-motion\)/ } },
  "MUT-F6a": { muts: [[APP, "trades={getClosed(filteredTrades)}\n                calcMetrics={stableCalcTradeMetrics}", () => "trades={getClosed(filteredTrades)}\n                calcMetrics={calcTradeMetrics}"]], projects: ONE, grep: "F6 ", expect: { F6: /B-427 \(calendar\)/ } },
  "MUT-F6b": { muts: [[TSTATS, "    if (m?.fxUnconverted) { excluded += 1; continue; }\n", () => ""]], projects: ONE, grep: "F6 ", expect: { F6: /B-427 \(calendar\)/ } },
  "MUT-F6c": { muts: [[DTM, "{totals.pnl == null ? '—' : fmt$(totals.pnl, currency)}", () => "{totals.pnl >= 0 ? '+' : ''}${(totals.pnl ?? 0).toFixed(0)}"]], projects: ONE, grep: "F6 ", expect: { F6: /B-427 \(day modal\)/ } },
  "MUT-F6d": { muts: [[DTM, "const rawPnl = calcTradeMetrics(tr).pnl;", () => "const rawPnl = safeCalc(tr).pnl;"]], projects: ONE, grep: "F6 ", expect: { F6: /B-427 \(day modal row\)/ } },
  "MUT-F7": { muts: [[APP, "    const pnlCell = m.fxUnconverted\n", () => "    const pnlCell = false\n"]], projects: ONE, grep: "F7 ", expect: { F7: /B-427 \(PDF\)/ } },
};

// Every first anchor must match exactly once in the LIVE bytes before anything is built (B-272).
for (const [arm, a] of Object.entries(ARMS)) {
  const seen = new Set();
  for (const [f, find] of a.muts) if (!seen.has(f)) { seen.add(f); once(readFileSync(f, "utf8"), find, arm); }
}
ok("META", true, `all first anchors match exactly once · targets clean · projects=${ALL.join(",")}`);

const arms = argArms || Object.keys(ARMS);
for (const a of arms) if (!ARMS[a]) die(`unknown arm ${a}`);
// Verdict key per test: "F1-he" · "F2-he-rate" · "F3" · "F4" · "F5-he"
const KEY = (title) => {
  const m = /^(F[1-7])(?: · (he|en))?(?: · (rate|no rate))?/.exec(title);
  return m ? [m[1], m[2], m[3] && m[3].replace(" ", "")].filter(Boolean).join("-") : null;
};

const WORK = await mkdtemp(join(tmpdir(), "eye-wave1-"));
const verdicts = {};
for (const arm of arms) {
  const a = ARMS[arm];
  const projects = a.projects.filter((p) => ALL.includes(p));
  console.log(`\n── ${arm} ── projects=${projects.join(",") || "(none)"}${a.grep ? ` grep="${a.grep}"` : ""}`);
  if (!projects.length) { ok(arm, false, "no project of this arm is in EYE_PROJECTS — the arm measured nothing"); continue; }
  const dist = await buildTree({ root: ROOT, arm, outDir: join(WORK, `dist-${arm}`), mutations: a.muts, once, die,
    env: { VITE_SENTRY_DSN: "http://wave1probekey@127.0.0.1:47811/1", SENTRY_AUTH_TOKEN: "" } });
  const { server, port } = await serve(dist);
  const json = join(OUT, `${arm}.json`);
  const run = await runSpec({ root: ROOT, spec: "tests-eye/wave1.spec.js", projects, port, json, evidenceDir: join(OUT, arm), grep: a.grep, env: { EYE_WAVE1: "1", EYE_ARM: arm } });
  server.close();
  if (!run.ok) die(`${arm}: the spec produced no JSON report (exit ${run.status})\n${run.out.slice(-3000)}`);
  verdicts[arm] = readResults(json, KEY);
  for (const [k, v] of Object.entries(verdicts[arm]).sort()) console.log(`   ${k.padEnd(28)} ${v.status}${v.status !== "passed" && v.status !== "skipped" ? `  — ${v.msg.slice(0, 400)}` : ""}`);
}

console.log("\n── verdicts ──");
for (const arm of arms) {
  const v = verdicts[arm];
  if (!v) continue;
  const ran = Object.entries(v).filter(([, x]) => x.status !== "skipped");
  if (arm === "HEAD") {
    const bad = ran.filter(([, x]) => x.status !== "passed");
    ok("HEAD", ran.length > 0 && bad.length === 0, `${ran.length - bad.length}/${ran.length} cells green on the committed tree`, bad.map(([k, x]) => `${k}: ${x.msg.slice(0, 300)}`).join("\n      "));
    continue;
  }
  for (const [scene, rx] of Object.entries(ARMS[arm].expect)) {
    const cells = ran.filter(([k]) => k.split(":")[1].startsWith(scene));
    const killed = cells.filter(([, x]) => x.status !== "passed" && rx.test(x.msg));
    // BEFORE: every cell of the scene must be red; a mutant: at least one, with its own message.
    const need = arm === "BEFORE" ? cells.length : 1;
    ok(arm, cells.length > 0 && killed.length >= need, `${scene}: ${killed.length}/${cells.length} cells red with ${rx}`, cells.map(([k, x]) => `${k}: ${x.status} ${x.msg.slice(0, 200)}`).join("\n      "));
  }
}
console.log(failures ? `\n❌ ${failures} failure(s) — a blind gate or a red HEAD` : "\n✅ eye-wave1-probe: HEAD green · BEFORE red · every mutant killed by its own message");
process.exit(failures ? 1 : 0);
