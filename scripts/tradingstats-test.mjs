// test:tradingstats — characterization suite for src/lib/tradingStats.js.
//
// T2 (docs/plans/PLAN-2026-07-29-extract-trading-stats.md) extracted the pure
// math out of the useTradingStats React hook into computeTradingStats(), a
// verbatim body-move (proven via `diff -w` at extraction time — see PLAN doc).
// This suite has two jobs:
//
//   1. Hand-verified assertions on the "headline" scalar metrics (winRate,
//      lossRate, profitFactor, avgWin/avgLoss, avgR/rSampleSize, totalPnL,
//      bestWin/worstLoss, wins/losses/openTrades counts, lastWeek/lastMonth)
//      across 5 fixtures — empty, normal, with break-even, missing stops,
//      and open positions. These are computed by hand in this file's
//      comments and checked with exact equality.
//   2. A frozen full-object JSON baseline (scripts/fixtures/tradingstats-
//      baseline.json), captured once at extraction time, diffed byte-for-
//      byte on every run. This is the T3 tripwire: any future change to
//      src/lib/tradingStats.js that moves so much as one decimal in the
//      equity curve, streaks, or breakdown arrays fails this test loudly.
//      T3 (behavior unification) is expected to update this baseline
//      deliberately, with the diff reviewed and the plan doc explaining why.
//
// lastWeekStats/lastMonthStats read the wall clock (Date.now()) inside
// computeTradingStats — the one non-pure dependency in an otherwise pure
// function (see PLAN doc §0.a). Date.now is stubbed to a fixed timestamp for
// the duration of this file so the suite never flakes with real-world time.
//
// Pure Node, no network. Run: `node scripts/tradingstats-test.mjs`.

import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { computeTradingStats } from "../src/lib/tradingStats.js";
import { calcTradeMetrics } from "../src/utils.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASELINE_PATH = join(__dirname, "fixtures", "tradingstats-baseline.json");

let failures = 0;
const check = (name, cond) => {
  if (cond) console.log(`  ✓ ${name}`);
  else { failures++; console.error(`  ✗ ${name}`); }
};
const eq = (name, actual, expected) =>
  check(`${name} → ${JSON.stringify(expected)} (got ${JSON.stringify(actual)})`, Object.is(actual, expected));
const close = (name, actual, expected, eps = 1e-9) =>
  check(`${name} → ≈${expected} (got ${actual})`, Math.abs(actual - expected) < eps);

const CAPITAL = 2500;

// ── Frozen clock — lastWeekStats/lastMonthStats depend on Date.now() ────────
const FIXED_NOW = new Date("2026-02-15T12:00:00.000Z").getTime();
const daysAgo = (n) => new Date(FIXED_NOW - n * 86400000).toISOString().slice(0, 10);
const REAL_DATE_NOW = Date.now;
Date.now = () => FIXED_NOW;

const mk = (over) => ({
  id: over.id, ticker: "AAPL", side: "LONG", status: "CLOSED",
  setup: "Breakout", emotionAtEntry: "Confident", marketCondition: "Trending Up",
  entryQuality: 3, followedPlan: true,
  closedAt: over.date ? `${over.date}T20:00:00.000Z` : undefined,
  ...over,
});

// ─────────────────────────────────────────────────────────────────────────
// 1 · EMPTY
// ─────────────────────────────────────────────────────────────────────────
{
  console.log("\n1 · empty portfolio → EMPTY_STATS shape");
  const s = computeTradingStats([], CAPITAL, calcTradeMetrics);
  eq("isEmpty", s.isEmpty, true);
  eq("totalTrades", s.totalTrades, 0);
  eq("openTrades", s.openTrades, 0);
  eq("winRate", s.winRate, 0);
  eq("profitFactor", s.profitFactor, 0);
  eq("avgR", s.avgR, null);
  eq("rSampleSize", s.rSampleSize, 0);
  eq("currentEquity", s.currentEquity, CAPITAL);
  eq("returnPct", s.returnPct, 0);
  eq("equityCurve.length", s.equityCurve.length, 0);
  eq("bySetup.length", s.bySetup.length, 0);
  eq("topEdges.length", s.topEdges.length, 0);
}

// ─────────────────────────────────────────────────────────────────────────
// 2 · NORMAL — 8 closed trades, no BE, all stops valid.
//     wins: T1(150) T3(40) T4(120) T6(150) T7(50) = 5   losses: T2(-100) T5(-60) T8(-120) = 3
//     totalWin=510 totalLoss=280 totalPnL=230
// ─────────────────────────────────────────────────────────────────────────
{
  console.log("\n2 · normal portfolio (8 trades, 5W/3L, no BE, all stops valid)");
  const NORMAL = [
    mk({ id: "t1", entry: 100, stop: 95, exit: 115, shares: 10, date: daysAgo(2),  setup: "Breakout", emotionAtEntry: "Confident" }),          // pnl 150 r 3
    mk({ id: "t2", entry: 100, stop: 95, exit: 90,  shares: 10, date: daysAgo(5),  setup: "Breakout", emotionAtEntry: "Confident" }),          // pnl -100 r -2
    mk({ id: "t3", entry: 100, stop: 98, exit: 104, shares: 10, date: daysAgo(10), setup: "Breakout", emotionAtEntry: "FOMO", followedPlan: false }), // pnl 40 r 2
    mk({ id: "t4", entry: 50,  stop: 48, exit: 56,  shares: 20, date: daysAgo(20), setup: "Pullback", emotionAtEntry: "Neutral" }),            // pnl 120 r 3
    mk({ id: "t5", entry: 50,  stop: 48, exit: 47,  shares: 20, date: daysAgo(45), setup: "Pullback", emotionAtEntry: "Neutral" }),            // pnl -60 r -1.5
    mk({ id: "t6", entry: 200, stop: 190, exit: 230, shares: 5, date: daysAgo(60), setup: "Pullback", emotionAtEntry: "FOMO", followedPlan: false }), // pnl 150 r 3
    mk({ id: "t7", entry: 100, stop: 96, exit: 105, shares: 10, date: daysAgo(1),  setup: "Breakout", emotionAtEntry: "Confident" }),          // pnl 50 r 1.25
    mk({ id: "t8", entry: 50,  stop: 47, exit: 44,  shares: 20, date: daysAgo(15), setup: "Pullback", emotionAtEntry: "FOMO", followedPlan: false }), // pnl -120 r -2
  ];
  const s = computeTradingStats(NORMAL, CAPITAL, calcTradeMetrics);
  eq("totalTrades", s.totalTrades, 8);
  eq("openTrades", s.openTrades, 0);
  eq("wins", s.wins, 5);
  eq("losses", s.losses, 3);
  close("winRate", s.winRate, 62.5);
  close("lossRate", s.lossRate, 37.5);
  close("totalPnL", s.totalPnL, 230);
  close("totalWin", s.totalWin, 510);
  close("totalLoss", s.totalLoss, 280);
  close("profitFactor", s.profitFactor, 510 / 280);
  close("avgWin", s.avgWin, 102);
  close("avgLoss", s.avgLoss, 280 / 3);
  close("avgR", s.avgR, 6.75 / 8);
  eq("rSampleSize", s.rSampleSize, 8);
  close("bestWin", s.bestWin, 150);
  close("worstLoss", s.worstLoss, -120);
  close("currentEquity", s.currentEquity, CAPITAL + 230);
  eq("equityCurve.length", s.equityCurve.length, 8);
  check("equityCurve last point === currentEquity",
    Math.abs(s.equityCurve[s.equityCurve.length - 1].equity - s.currentEquity) < 1e-9);
  // lastWeek: t1(2d) t2(5d) t7(1d) → pnl 150-100+50=100, 2/3 wins
  eq("lastWeekStats.count", s.lastWeekStats.count, 3);
  close("lastWeekStats.pnl", s.lastWeekStats.pnl, 100);
  close("lastWeekStats.winRate", s.lastWeekStats.winRate, (2 / 3) * 100);
  // lastMonth: t1,t2,t3,t4,t7,t8 → pnl 150-100+40+120+50-120=140, 4/6 wins
  eq("lastMonthStats.count", s.lastMonthStats.count, 6);
  close("lastMonthStats.pnl", s.lastMonthStats.pnl, 140);
  close("lastMonthStats.winRate", s.lastMonthStats.winRate, (4 / 6) * 100);
  // No BE trades: wins + losses === totalTrades, winRate + lossRate === 100.
  eq("wins + losses === totalTrades (no BE in this fixture)", s.wins + s.losses, s.totalTrades);
  close("winRate + lossRate === 100 (no BE in this fixture)", s.winRate + s.lossRate, 100);
}

// ─────────────────────────────────────────────────────────────────────────
// 3 · WITH BREAK-EVEN — 2 wins, 2 losses, 2 BE (pnl===0, r===0, both finite).
//     Key contract under test: BE trades sit in the closed.length denominator
//     for winRate/lossRate but are excluded from BOTH the winners and losers
//     buckets — so winRate + lossRate < 100 whenever BE trades exist. This is
//     the sharpest diagnostic difference vs. statisticalModels.js, which gives
//     BE its own named population (rPopulations().be) instead of silently
//     falling through both filters.
// ─────────────────────────────────────────────────────────────────────────
{
  console.log("\n3 · with break-even (2W/2L/2BE) — winRate+lossRate must be < 100");
  const WITH_BE = [
    mk({ id: "w1", entry: 100, stop: 90, exit: 120, shares: 10, date: daysAgo(40) }), // pnl 200 r 2
    mk({ id: "w2", entry: 100, stop: 90, exit: 120, shares: 10, date: daysAgo(45) }), // pnl 200 r 2
    mk({ id: "l1", entry: 100, stop: 90, exit: 85,  shares: 10, date: daysAgo(50) }), // pnl -150 r -1.5
    mk({ id: "l2", entry: 100, stop: 90, exit: 80,  shares: 10, date: daysAgo(55) }), // pnl -200 r -2
    mk({ id: "be1", entry: 100, stop: 90, exit: 100, shares: 10, date: daysAgo(2) }), // pnl 0 r 0
    mk({ id: "be2", entry: 100, stop: 90, exit: 100, shares: 5,  date: daysAgo(60) }), // pnl 0 r 0
  ];
  const s = computeTradingStats(WITH_BE, CAPITAL, calcTradeMetrics);
  eq("totalTrades", s.totalTrades, 6);
  eq("wins", s.wins, 2);
  eq("losses", s.losses, 2);
  check("BE trades excluded from BOTH wins and losses (2+2=4 ≠ 6 total)", s.wins + s.losses < s.totalTrades);
  close("winRate", s.winRate, (2 / 6) * 100);
  close("lossRate", s.lossRate, (2 / 6) * 100);
  check("winRate + lossRate < 100 — the BE trades vanish from the rate, not just the P&L",
    s.winRate + s.lossRate < 100 - 1e-9);
  close("totalPnL", s.totalPnL, 50);
  close("totalWin", s.totalWin, 400);
  close("totalLoss", s.totalLoss, 350);
  close("profitFactor", s.profitFactor, 400 / 350);
  close("avgWin", s.avgWin, 200);
  close("avgLoss", s.avgLoss, 175);
  // BE trades have rMultiple = 0, which IS finite → they count in avgR's sample.
  eq("rSampleSize includes BE trades (r=0 is measurable, not null)", s.rSampleSize, 6);
  close("avgR", s.avgR, 0.5 / 6);
  close("bestWin", s.bestWin, 200);
  close("worstLoss", s.worstLoss, -200);
  // Only be1 is within the last week/month window.
  eq("lastWeekStats.count", s.lastWeekStats.count, 1);
  close("lastWeekStats.pnl", s.lastWeekStats.pnl, 0);
  eq("lastMonthStats.count", s.lastMonthStats.count, 1);
}

// ─────────────────────────────────────────────────────────────────────────
// 4 · MISSING STOPS — 2 measurable (valid stop), 3 unmeasurable (stop: null).
//     Key contract: rSampleSize reflects only the measurable subset; avgR is
//     never diluted by folding an unmeasurable trade in as an implicit 0R.
// ─────────────────────────────────────────────────────────────────────────
{
  console.log("\n4 · missing stops (2 measurable R / 3 unmeasurable) — avgR must not dilute");
  const NO_STOPS = [
    mk({ id: "s1", entry: 100, stop: 90,   exit: 120, shares: 10, date: daysAgo(5) }),  // pnl 200 r 2
    mk({ id: "s2", entry: 100, stop: 90,   exit: 80,  shares: 10, date: daysAgo(10) }), // pnl -200 r -2
    mk({ id: "n1", entry: 100, stop: null, exit: 130, shares: 10, date: daysAgo(15) }), // pnl 300 r null
    mk({ id: "n2", entry: 100, stop: null, exit: 90,  shares: 10, date: daysAgo(20) }), // pnl -100 r null
    mk({ id: "n3", entry: 100, stop: null, exit: 110, shares: 10, date: daysAgo(25) }), // pnl 100 r null
  ];
  const s = computeTradingStats(NO_STOPS, CAPITAL, calcTradeMetrics);
  eq("totalTrades", s.totalTrades, 5);
  eq("wins", s.wins, 3);
  eq("losses", s.losses, 2);
  close("winRate", s.winRate, 60);
  close("totalPnL", s.totalPnL, 300);
  close("profitFactor", s.profitFactor, 2.0);
  // avgR is computed over the 2 measurable trades only — real 0, not diluted toward 0 by 3 phantom 0Rs.
  eq("rSampleSize (only the 2 trades with a stop)", s.rSampleSize, 2);
  close("avgR (2 - 2 over 2 trades = 0, a REAL zero — not null, n>0)", s.avgR, 0);
  check("avgR is a number, not null, when at least one trade is measurable", s.avgR !== null);
  close("bestWin", s.bestWin, 300); // n1, unmeasurable in R but very much a real winner in $
  close("worstLoss", s.worstLoss, -200);
}

// ─────────────────────────────────────────────────────────────────────────
// 5 · OPEN POSITIONS — 3 CLOSED + 2 OPEN. OPEN trades must not leak into any
//     closed-based aggregate; they only move openTrades.
// ─────────────────────────────────────────────────────────────────────────
{
  console.log("\n5 · open positions (3 closed + 2 open) — open trades excluded from all closed aggregates");
  const WITH_OPEN = [
    mk({ id: "c1", entry: 100, stop: 90, exit: 120, shares: 10, date: daysAgo(3) }),  // pnl 200 r 2
    mk({ id: "c2", entry: 100, stop: 90, exit: 80,  shares: 10, date: daysAgo(10) }), // pnl -200 r -2
    mk({ id: "c3", entry: 100, stop: 95, exit: 110, shares: 10, date: daysAgo(20) }), // pnl 100 r 2
    mk({ id: "o1", entry: 100, stop: 90, exit: null, shares: 10, date: daysAgo(1), status: "OPEN" }),
    mk({ id: "o2", entry: 50,  stop: 45, exit: null, shares: 10, date: daysAgo(1), status: "OPEN" }),
  ];
  const s = computeTradingStats(WITH_OPEN, CAPITAL, calcTradeMetrics);
  eq("totalTrades (closed only)", s.totalTrades, 3);
  eq("openTrades", s.openTrades, 2);
  eq("wins", s.wins, 2);
  eq("losses", s.losses, 1);
  close("winRate", s.winRate, (2 / 3) * 100);
  close("totalPnL", s.totalPnL, 100);
  close("profitFactor", s.profitFactor, 1.5);
  eq("rSampleSize", s.rSampleSize, 3);
  close("avgR", s.avgR, 2 / 3);
  eq("closedMetrics.length excludes the 2 open trades", s.closedMetrics.length, 3);
  check("no OPEN trade's id leaked into closedMetrics",
    s.closedMetrics.every((m) => m.id !== "o1" && m.id !== "o2"));
  eq("lastWeekStats.count (only c1)", s.lastWeekStats.count, 1);
  eq("lastMonthStats.count (c1,c2,c3)", s.lastMonthStats.count, 3);
}

// ─────────────────────────────────────────────────────────────────────────
// 6 · Infinity sweep — profitFactor (top-level AND every breakdown group) is
//     the one field in this module's output that can legitimately be
//     Infinity. Confirms no OTHER field goes non-finite on a no-losses
//     portfolio, and documents where Infinity can surface for consumers.
// ─────────────────────────────────────────────────────────────────────────
{
  console.log("\n6 · Infinity sweep — only profitFactor (top-level + breakdown groups) may be Infinity");
  const NO_LOSSES = [
    mk({ id: "a", entry: 100, stop: 90, exit: 120, shares: 10, date: daysAgo(3), setup: "Breakout" }),
    mk({ id: "b", entry: 100, stop: 90, exit: 120, shares: 10, date: daysAgo(5), setup: "Breakout" }),
    mk({ id: "c", entry: 100, stop: 90, exit: 120, shares: 10, date: daysAgo(8), setup: "Breakout" }),
  ];
  const s = computeTradingStats(NO_LOSSES, CAPITAL, calcTradeMetrics);
  eq("profitFactor is Infinity when there are wins and zero losses", s.profitFactor, Infinity);
  check("bySetup[0].profitFactor is ALSO Infinity under the same condition (latent — currently unrendered, see PLAN doc hunt findings)",
    s.bySetup[0].profitFactor === Infinity);
  const SCALARS = ["winRate", "lossRate", "avgWin", "avgLoss", "avgR", "totalPnL", "bestWin",
    "worstLoss", "currentEquity", "returnPct", "maxDrawdown", "maxDD", "currentDrawdown",
    "avgHoldHours", "avgHold", "planFollowedWR", "planIgnoredWR", "planAdherence"];
  for (const k of SCALARS) {
    check(`${k} is finite or null (never Infinity/NaN)`, s[k] === null || Number.isFinite(s[k]));
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 7 · FROZEN BASELINE — full-object regression gate for all 5 fixtures.
//     First run on a clean checkout writes the baseline (and the assertion
//     trivially passes); every run after that diffs against the committed
//     file. This is the T3 tripwire referenced in the plan doc.
// ─────────────────────────────────────────────────────────────────────────
{
  console.log("\n7 · frozen full-object baseline (scripts/fixtures/tradingstats-baseline.json)");
  const scenarios = {
    empty: computeTradingStats([], CAPITAL, calcTradeMetrics),
    normal: computeTradingStats([
      mk({ id: "t1", entry: 100, stop: 95, exit: 115, shares: 10, date: daysAgo(2) }),
      mk({ id: "t2", entry: 100, stop: 95, exit: 90,  shares: 10, date: daysAgo(5) }),
      mk({ id: "t3", entry: 100, stop: 98, exit: 104, shares: 10, date: daysAgo(10), emotionAtEntry: "FOMO", followedPlan: false }),
      mk({ id: "t4", entry: 50,  stop: 48, exit: 56,  shares: 20, date: daysAgo(20), setup: "Pullback", emotionAtEntry: "Neutral" }),
      mk({ id: "t5", entry: 50,  stop: 48, exit: 47,  shares: 20, date: daysAgo(45), setup: "Pullback", emotionAtEntry: "Neutral" }),
      mk({ id: "t6", entry: 200, stop: 190, exit: 230, shares: 5, date: daysAgo(60), setup: "Pullback", emotionAtEntry: "FOMO", followedPlan: false }),
      mk({ id: "t7", entry: 100, stop: 96, exit: 105, shares: 10, date: daysAgo(1) }),
      mk({ id: "t8", entry: 50,  stop: 47, exit: 44,  shares: 20, date: daysAgo(15), setup: "Pullback", emotionAtEntry: "FOMO", followedPlan: false }),
    ], CAPITAL, calcTradeMetrics),
    withBreakEven: computeTradingStats([
      mk({ id: "w1", entry: 100, stop: 90, exit: 120, shares: 10, date: daysAgo(40) }),
      mk({ id: "w2", entry: 100, stop: 90, exit: 120, shares: 10, date: daysAgo(45) }),
      mk({ id: "l1", entry: 100, stop: 90, exit: 85,  shares: 10, date: daysAgo(50) }),
      mk({ id: "l2", entry: 100, stop: 90, exit: 80,  shares: 10, date: daysAgo(55) }),
      mk({ id: "be1", entry: 100, stop: 90, exit: 100, shares: 10, date: daysAgo(2) }),
      mk({ id: "be2", entry: 100, stop: 90, exit: 100, shares: 5,  date: daysAgo(60) }),
    ], CAPITAL, calcTradeMetrics),
    missingStops: computeTradingStats([
      mk({ id: "s1", entry: 100, stop: 90,   exit: 120, shares: 10, date: daysAgo(5) }),
      mk({ id: "s2", entry: 100, stop: 90,   exit: 80,  shares: 10, date: daysAgo(10) }),
      mk({ id: "n1", entry: 100, stop: null, exit: 130, shares: 10, date: daysAgo(15) }),
      mk({ id: "n2", entry: 100, stop: null, exit: 90,  shares: 10, date: daysAgo(20) }),
      mk({ id: "n3", entry: 100, stop: null, exit: 110, shares: 10, date: daysAgo(25) }),
    ], CAPITAL, calcTradeMetrics),
    openPositions: computeTradingStats([
      mk({ id: "c1", entry: 100, stop: 90, exit: 120, shares: 10, date: daysAgo(3) }),
      mk({ id: "c2", entry: 100, stop: 90, exit: 80,  shares: 10, date: daysAgo(10) }),
      mk({ id: "c3", entry: 100, stop: 95, exit: 110, shares: 10, date: daysAgo(20) }),
      mk({ id: "o1", entry: 100, stop: 90, exit: null, shares: 10, date: daysAgo(1), status: "OPEN" }),
      mk({ id: "o2", entry: 50,  stop: 45, exit: null, shares: 10, date: daysAgo(1), status: "OPEN" }),
    ], CAPITAL, calcTradeMetrics),
  };

  if (!existsSync(BASELINE_PATH)) {
    writeFileSync(BASELINE_PATH, JSON.stringify(scenarios, null, 2) + "\n");
    console.log(`  ⚠ baseline did not exist — captured fresh to ${BASELINE_PATH}. Review the diff before committing.`);
    check("baseline captured (first run)", true);
  } else {
    const baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
    for (const name of Object.keys(scenarios)) {
      try {
        assert.deepStrictEqual(scenarios[name], baseline[name]);
        check(`${name} — deep-equal to frozen baseline`, true);
      } catch {
        failures++;
        console.error(`  ✗ ${name} — DIVERGED from frozen baseline. If this is an intentional T3 change, delete`);
        console.error(`    ${BASELINE_PATH} and rerun to recapture, with the diff reviewed in the plan doc.`);
      }
    }
  }
}

Date.now = REAL_DATE_NOW;

// ── SUMMARY ──────────────────────────────────────────────────────────────
console.log("");
if (failures) {
  console.error(`❌ tradingstats: ${failures} assertion(s) failed.`);
  process.exit(1);
}
console.log("✅ tradingstats: all assertions passed — computeTradingStats matches hand-verified math and the frozen baseline.");
