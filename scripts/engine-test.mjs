// test:engine — guards the engine-logic contracts fixed in T7
// (FIN-036 · FIN-037 · FIN-038) and the single-source-of-truth for "closed"
// inside the sub-engines (MonthlyReport, GrowthPredictor).
//
// Why this file exists: none of the eight existing gates can catch these.
// `test:coach` asserts that `edgeMatch`/`antiEdgeMatch` are *invariant across
// personas* (coach-invariance-test.mjs:8,73) — not that they are correct. A bug
// that fires identically for every persona passes it silently. `test:tradingstats`
// and `test:rcontract` never import EdgeFinder, LearningEngine, AntiEdgeLock or
// MonthlyReport's public entry point.
//
// Pure Node, no network. Run: `node scripts/engine-test.mjs`.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// LearningEngine and AntiEdgeLock persist through localStorage behind a
// `typeof localStorage !== "undefined"` guard. Node has no localStorage, so the
// guard would silently take the empty path and every calibration assertion
// would test nothing. An in-memory shim installed BEFORE the imports is what
// makes the persisted path real here.
globalThis.localStorage = (() => {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    clear: () => m.clear(),
  };
})();

const { matchIdeaToEdge, findEdges } = await import("../src/intelligence/core/EdgeFinder.js");
const { calibrationReport, reinforceFromTrade, resetLearning } =
  await import("../src/intelligence/core/LearningEngine.js");
const { checkAntiEdgeLocks } = await import("../src/intelligence/core/AntiEdgeLock.js");
const { generateMonthlyReport } = await import("../src/intelligence/core/MonthlyReport.js");
const { computeTradingStats } = await import("../src/lib/tradingStats.js");
const { calcTradeMetrics, validateTradeInputs } = await import("../src/utils.js");

let failures = 0;
const check = (name, cond) => {
  if (cond) console.log(`  ✓ ${name}`);
  else { failures++; console.error(`  ✗ ${name}`); }
};
const eq = (name, actual, expected) => {
  const ok = Object.is(actual, expected);
  check(`${name} → ${JSON.stringify(expected)}`, ok);
  if (!ok) console.error(`      got: ${JSON.stringify(actual)}`);
};

const WEEK = 7 * 86_400_000;

// ── 1 · FIN-036 · the dead boolean is gone, the score tells the truth ────────
// The old code returned `matched: score >= 0.75` on the partial path. That
// threshold is unreachable by construction: findEdges calls enumeratePatterns
// with dimSize 3, so every edge key has 2 or 3 parts, a full match returns
// early with score 1, and the only partial scores that can exist are
// 0, 1/3, 1/2 and 2/3 — four out of four below 0.75. A flag that can never be
// true is a lie; the continuous score is the honest answer.
{
  console.log("\n1 · FIN-036 · matchIdeaToEdge reports a score, not a dead flag");

  // 6 trades sharing setup+emotion+market so at least one pattern clears
  // MIN_SAMPLE_EDGE (5) and findEdges produces a real edge to match against.
  const TRADES = Array.from({ length: 6 }, (_, i) => ({
    id: `e${i}`, ticker: "AAPL", side: "LONG", setup: "Breakout",
    emotionAtEntry: "Neutral", marketCondition: "Trending Up",
    date: `2026-01-${String(5 + i).padStart(2, "0")}`,
    closedAt: `2026-01-${String(5 + i).padStart(2, "0")}T15:00:00Z`,
    entry: 100, stop: 95, shares: 10, exit: i < 5 ? 115 : 90, status: "CLOSED",
  }));

  const report = findEdges(TRADES);
  check("fixture produced at least one edge", report.edges.length > 0);

  // Every partial score the engine can physically produce is below the old
  // 0.75 threshold. This is the proof that the old flag was unreachable.
  const partials = new Set();
  for (const e of report.edges) {
    const parts = e.key.split(" + ").length;
    for (let m = 0; m < parts; m++) partials.add(m / parts);
  }
  check(
    `every possible partial score is < 0.75 (got ${[...partials].sort((a, b) => a - b)
      .map(n => n.toFixed(3)).join(", ")})`,
    [...partials].every(s => s < 0.75)
  );

  // A 2-of-3 idea: same setup + emotion, different market.
  const partial = matchIdeaToEdge(report, {
    setup: "Breakout", emotionAtEntry: "Neutral", marketCondition: "Choppy",
  });
  check("partial overlap reports a positive score", partial.score > 0);
  check("`matched` is no longer part of the contract",
    !Object.prototype.hasOwnProperty.call(partial, "matched"));

  const full = matchIdeaToEdge(report, {
    setup: "Breakout", emotionAtEntry: "Neutral", marketCondition: "Trending Up",
  });
  eq("an exact match still scores 1", full.score, 1);
  check("`matched` is absent on the full path too",
    !Object.prototype.hasOwnProperty.call(full, "matched"));

  const none = matchIdeaToEdge(report, { setup: "Nothing", emotionAtEntry: "Nope" });
  eq("no overlap scores 0", none.score, 0);
}

// ── 2 · FIN-037 · CAUTION has no truth value and leaves the accuracy ─────────
// `(v === "CAUTION" && true)` scored every CAUTION as correct, so the CAUTION
// bucket always read 100% and the headline accuracy absorbed the inflation.
// A CAUTION is a hedge, not a binary prediction — there is no outcome that
// falsifies it. It leaves both the numerator and the denominator, and the
// denominator now says out loud what it is computed on (CLAUDE.md §2).
{
  console.log("\n2 · FIN-037 · CAUTION is excluded from accuracy, denominator is named");
  resetLearning();

  const mkPred = (i, verdict, won) => ({
    id: `c${i}`, ticker: "AAPL", side: "LONG", setup: "Breakout",
    date: "2026-02-02", closedAt: "2026-02-02T15:00:00Z",
    entry: 100, stop: 95, shares: 10, exit: won ? 110 : 90, status: "CLOSED",
    _prediction: { verdict, confidence: 70, channels: { setup: 1 } },
  });

  // 2 GO (one right, one wrong), 2 SKIP (one right, one wrong),
  // 2 CAUTION (both of which the old code counted as correct).
  [
    mkPred(1, "GO", true), mkPred(2, "GO", false),
    mkPred(3, "SKIP", false), mkPred(4, "SKIP", true),
    mkPred(5, "CAUTION", true), mkPred(6, "CAUTION", false),
  ].forEach(reinforceFromTrade);

  const rep = calibrationReport();
  eq("every decision is still logged", rep.n, 6);
  eq("the accuracy denominator counts GO/SKIP only", rep.scoredN, 4);
  eq("the denominator names its population", rep.accuracyBasis, "GO/SKIP");
  eq("accuracy = 2 right out of 4 scorable", rep.accuracy, 0.5);
  eq("CAUTION is still counted as a decision", rep.byVerdict.CAUTION.n, 2);
  eq("CAUTION has no accuracy", rep.byVerdict.CAUTION.accuracy, null);
  eq("CAUTION claims no correct answers", rep.byVerdict.CAUTION.correct, null);
  eq("CAUTION reports its outcomes instead — wins", rep.byVerdict.CAUTION.wins, 1);
  eq("CAUTION reports its outcomes instead — losses", rep.byVerdict.CAUTION.losses, 1);
  eq("GO accuracy is unaffected", rep.byVerdict.GO.accuracy, 0.5);

  // Acceptance gate: a book of nothing but CAUTION has no measurable accuracy.
  // Reporting 100% there was the whole bug.
  resetLearning();
  [mkPred(7, "CAUTION", true), mkPred(8, "CAUTION", false)].forEach(reinforceFromTrade);
  const only = calibrationReport();
  eq("all-CAUTION book → scoredN 0", only.scoredN, 0);
  eq("all-CAUTION book → accuracy null, never 1", only.accuracy, null);
}

// ── 3 · FIN-038 · a lock whose evidence went stale releases itself ───────────
// `nowMs` was declared and never read, and the lock is derived from the most
// recent weeks that CONTAIN TRADES. Since a lock blocks entry, no new week can
// ever arrive, the evidence freezes, and the setup stays locked forever — the
// release condition required the very action the lock forbids. The header
// promised "auto-unlocks after one winning week"; nothing implemented it.
{
  console.log("\n3 · FIN-038 · nowMs is read, stale locks are released");

  // 4 consecutive losing weeks, 2 trades each = 8 trades (MIN_TOTAL_N).
  const LOSERS = [];
  for (let w = 0; w < 4; w++) {
    for (let i = 0; i < 2; i++) {
      const day = new Date(Date.UTC(2026, 0, 5 + w * 7 + i)); // Mondays onward
      LOSERS.push({
        id: `l${w}${i}`, ticker: "AAPL", side: "LONG", setup: "Breakout",
        date: day.toISOString().slice(0, 10),
        closedAt: day.toISOString(),
        entry: 100, stop: 95, shares: 10, exit: 90, status: "CLOSED",
      });
    }
  }
  const lastMs = new Date(LOSERS[LOSERS.length - 1].closedAt).getTime();

  const fresh = checkAntiEdgeLocks(LOSERS, lastMs + WEEK);
  check("fresh evidence still locks the setup",
    fresh.locked.some(s => s.setup === "Breakout"));

  const freshStatus = fresh.locked.find(s => s.setup === "Breakout") || {};
  const until = typeof freshStatus.unlocksAt === "string" && !isNaN(Date.parse(freshStatus.unlocksAt))
    ? freshStatus.unlocksAt.slice(0, 10)
    : null;
  check("a live lock tells the user when it expires", until !== null);
  check("the lock message carries the release date",
    until !== null &&
    (freshStatus.message?.he || "").includes(until) &&
    (freshStatus.message?.en || "").includes(until));

  // Far enough past the last trade that the evidence no longer describes today.
  const stale = checkAntiEdgeLocks(LOSERS, lastMs + 40 * WEEK);
  check("stale evidence no longer hard-locks",
    !stale.locked.some(s => s.setup === "Breakout"));
  check("but the setup is still surfaced as a warning",
    stale.warnings.some(s => s.setup === "Breakout"));

  // The deadlock proof: with the old code the result is identical no matter how
  // much time has passed, because nowMs never entered the computation.
  check("the verdict actually depends on nowMs",
    JSON.stringify(fresh.locked) !== JSON.stringify(stale.locked));
}

// ── 4 · MonthlyReport speaks the same "closed" and the same three buckets ────
// Two independent divergences lived here: `status === "CLOSED"` without
// `exit != null` (a ghost row with no realized P&L inflating the denominator),
// and `losses: n - wins`, which swept every break-even trade into the losses —
// the two-bucket split that T3 · decision 2 removed everywhere else.
{
  console.log("\n4 · MonthlyReport · one definition of closed, three outcome buckets");

  const base = {
    ticker: "AAPL", side: "LONG", setup: "Breakout", shares: 10,
    date: "2026-03-10", closedAt: "2026-03-10T15:00:00Z", status: "CLOSED",
  };
  const TRADES = [
    { ...base, id: "w", entry: 100, stop: 95, exit: 110 },  // win
    { ...base, id: "l", entry: 100, stop: 95, exit: 90 },   // loss
    { ...base, id: "b", entry: 100, stop: 95, exit: 100 },  // break-even
    { ...base, id: "g", entry: 100, stop: 95, exit: null }, // ghost: CLOSED, no exit
  ];

  const rep = generateMonthlyReport(TRADES, 2, 2026, calcTradeMetrics);
  const s = rep.summary || {};

  eq("the ghost row is not a closed trade", s.totalTrades, 3);
  eq("wins", s.wins, 1);
  eq("losses — the BE trade is not one of them", s.losses, 1);
  eq("break-even is its own bucket", s.breakEven, 1);
  check("the three buckets account for every closed trade",
    s.wins + s.losses + s.breakEven === s.totalTrades);
  // MonthlyReport publishes its rates at one decimal (its own `round` default,
  // unchanged by this task). 33.3 vs 25 is the population fix; the decimal
  // place is a pre-existing display convention, so the cross-check below
  // compares at that same precision rather than pretending the two modules
  // format identically.
  eq("winRate is 1 of 3, not 1 of 4", s.winRate, 33.3);

  // The cross-engine gate: the monthly report and the dashboard must not
  // disagree about the same portfolio.
  const stats = computeTradingStats(TRADES, 10000, calcTradeMetrics);
  eq("monthly winRate === dashboard winRate", s.winRate, Math.round(stats.winRate * 10) / 10);
  eq("monthly wins === dashboard wins", s.wins, stats.wins);
  eq("monthly losses === dashboard losses", s.losses, stats.losses);
  eq("monthly BE === dashboard BE", s.breakEven, stats.be);
}

// ── 6 · the edit path is guarded by the same validator as new entry ──────────
// EditTradeModal.validate() checked positivity and finiteness only, so a LONG
// could be edited to sit with its stop ABOVE entry — geometry that Log New
// Trade and import both reject. The same check also made a stop-less trade
// uneditable outright: the field initialises to "" and `Number("")` is 0, so
// `stopN <= 0` rejected the save before the user could fix a typo in a note.
//
// The modal is JSX and cannot be imported here, so this block asserts the
// shared validator's behaviour directly and then asserts the modal is wired to
// it — rather than growing a sixth private copy of the rule.
{
  console.log("\n6 · edit path · one geometry validator, and an optional stop");

  const reasons = (r) => r && typeof r.he === "string" && typeof r.en === "string";

  const longReversed = validateTradeInputs(100, 105, 120, "LONG");
  check("LONG with the stop above entry is rejected", longReversed.valid === false);
  check("…and says why, in both languages", reasons(longReversed.reason));

  const shortReversed = validateTradeInputs(100, 95, 80, "SHORT");
  check("SHORT with the stop below entry is rejected", shortReversed.valid === false);

  check("a well-formed LONG still passes",
    validateTradeInputs(100, 95, 120, "LONG").valid === true);
  check("a well-formed SHORT still passes",
    validateTradeInputs(100, 105, 80, "SHORT").valid === true);

  const modal = readFileSync("src/components/EditTradeModal.jsx", "utf8");
  check("the edit modal calls the shared validator",
    /validateTradeInputs\s*\(/.test(modal) &&
    /import\s*\{[^}]*validateTradeInputs[^}]*\}\s*from\s*["']\.\.\/utils\.js["']/.test(modal));
  check("…gated on the stop existing, exactly as normalizeRow does",
    /stopN\s*!=\s*null\s*&&\s*stopN\s*>\s*0/.test(modal));
  check("a blank stop is no longer an unconditional rejection",
    !/if\s*\(!Number\.isFinite\(stopN\)\s*\|\|\s*stopN\s*<=\s*0\)/.test(modal));
  check("a blank stop is persisted as null, never as 0",
    /stop:\s*form\.stop\s*===\s*""/.test(modal));
}

// ── 5 · structural gate · "closed" is not redefined by hand ──────────────────
// Six `status === "CLOSED"` sites survive in the tree; all six are documented
// exceptions. Everything else must go through getClosed. This gate is what
// stops the seventh private definition from appearing next quarter.
{
  console.log("\n5 · structural · no new private definition of \"closed\"");

  const ALLOWED = new Map([
    ["src/intelligence/utils/statisticalModels.js", "getClosed — the definition itself"],
    ["src/intelligence/core/TradeDNA.js", "cache-key hash, deliberately broader (DECISIONS 2026-08-02)"],
    ["src/components/EditTradeModal.jsx", "UI affordance, must show exit field on a broken row (DECISIONS 2026-08-02)"],
    ["src/import/normalizeRow.js", "producer — derives status from exit, enforces the invariant"],
    ["src/import/buildImport.js", "import preview count, consistent by construction with normalizeRow"],
    ["SwingEdge_App.jsx", "cell colouring only; the use site already reads `closed && tr.exit != null` (T3, 2026-07-30)"],
  ]);

  const walk = (dir, out = []) => {
    for (const name of readdirSync(dir)) {
      if (name === "node_modules" || name === "dist" || name.startsWith(".")) continue;
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p, out);
      else if (/\.(jsx|js)$/.test(name)) out.push(p);
    }
    return out;
  };

  const offenders = [];
  for (const file of [...walk("src"), "SwingEdge_App.jsx"]) {
    const src = readFileSync(file, "utf8");
    src.split("\n").forEach((line, i) => {
      if (!/status\s*===\s*["']CLOSED["']/.test(line)) return;
      if (ALLOWED.has(file)) return;
      offenders.push(`${file}:${i + 1}`);
    });
  }
  check(
    offenders.length === 0
      ? "every remaining `status === \"CLOSED\"` is an allow-listed, documented exception"
      : `private "closed" definitions found: ${offenders.join(", ")}`,
    offenders.length === 0
  );
}

// ── SUMMARY ──────────────────────────────────────────────────────────────────
console.log("");
if (failures) {
  console.error(`❌ engine: ${failures} assertion(s) failed.`);
  process.exit(1);
}
console.log("✅ engine: all assertions passed — no dead flags, no fabricated accuracy, no immortal locks, one definition of closed.");
