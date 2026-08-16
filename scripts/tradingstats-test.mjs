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
// BASELINE VERSION: v2 (T3 · docs/plans/PLAN-2026-07-30-fin-group2-unify.md).
// v1 → v2 was captured after the group-2 unification. The full structural diff
// was: 123 field ADDITIONS, 0 removals, and 0 changed values — every existing
// number in all five v1 fixtures survived byte-for-byte, including profitFactor
// (the one accumulation-order risk the plan flagged in §2.ב). The additions are
// `be` / `beRate` / `losses` / `lossRate` at every grouping level plus the new
// `streakRuns`, all of them decision 2 ("break-even is an explicit third bucket
// everywhere") and the streak-history extraction. Scenario 6 is new in v2.
//
// BASELINE VERSION: v4 (T3 · B-142 · docs/plans/PLAN-B142.md).
// v3 → v4 was captured after the equity-headline unification. The full
// structural diff, measured scenario by scenario before recapture, was:
// **8 field ADDITIONS, 0 removals, and 0 changed values** — one addition per
// fixture, all of them the same key, and every pre-existing number in all
// eight v3 fixtures survived byte-for-byte.
//
// The added key is `tradesByCurrency` (plan §C6): a per-currency TRADE COUNT
// published beside the existing `pnlByCurrency`. A per-currency P&L split that
// does not say how many trades stand behind each figure is a quotient with no
// denominator (CLAUDE.md §2) — "₪1,200 · $80" cannot tell 13 TASE rows from
// one. It is derived inside `pnlByCurrency`'s own loop, so the split and its
// denominator cannot drift; that is also why the counter was NOT computed in
// the component instead (a second derivation loop with no owner).
//
// ⚠️ The gate fired correctly here: it caught a real shape change and the wave
// stopped and reported rather than recapturing quietly. The recapture is
// authorised in writing, and block 9 above pins `tradesByCurrency` by VALUE so
// the new key does not enter the frozen line unverified — a baseline proves a
// number has not MOVED, it cannot know the number was right the day it froze.
//
// BASELINE VERSION: v5 (T3 · B-009 · docs/plans/PLAN-B009.md).
// v4 → v5 was captured after EMPTY_STATS stopped publishing invented numbers.
// The full structural diff, measured before recapture, was:
// **16 CHANGED values, 2 additions, 0 removals — all of them in the `empty`
// scenario alone.** The other seven fixtures are byte-identical to v4.
//
// Every changed value is `0 → null`, and each one was decided by the three
// tests in PLAN-B009.md §1 rather than by what reads nicely: winRate,
// lossRate, beRate, profitFactor, avgWin, avgLoss, bestWin, worstLoss,
// returnPct, planFollowedWR, planIgnoredWR, planAdherence, avgHoldHours,
// avgHold, lastWeekStats.winRate, lastMonthStats.winRate. The two additions
// are `beRate` on lastWeekStats/lastMonthStats (B-065): summarize() emits four
// keys and EMPTY_STATS emitted three, so one object had two shapes depending
// on whether the journal was empty.
//
// ⚠️ Everything that stayed 0 stayed for a REASON, and block 9b §5 pins it:
// maxDrawdown / maxDD / currentDrawdown / currentStreak / totalPnL /
// totalTrades / currentEquity / lastWeekStats.pnl / .count are counts, sums
// and a seeded extremum — 0 is their identity element over the empty set, so
// 0 there is a measurement. A blanket "—" is the same bug with the sign
// flipped, and §5 is what would catch it.
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

// ── Population-completeness gate ────────────────────────────────────────────
// Every input trade must land in exactly one of: the closed population that
// feeds `totalTrades`, the open population that feeds `openTrades`, or a
// declared remainder. The remainder is passed in explicitly per fixture, so a
// trade that silently falls out of BOTH populations — the failure mode
// decision 1 introduces by tightening "closed" to `status && exit != null` —
// fails this test instead of quietly shrinking a denominator on screen.
const completeness = (label, input, s, expectedUnaccounted) => {
  const unaccounted = input.length - s.totalTrades - s.openTrades;
  check(
    `${label} — population complete: ${s.totalTrades} closed + ${s.openTrades} open + ${unaccounted} unaccounted = ${input.length} input`,
    unaccounted === expectedUnaccounted && s.totalTrades + s.openTrades + unaccounted === input.length,
  );
};

// The three rates are a partition of the closed population — they must sum to
// exactly 100, not "about" 100 (decision 2).
// ⚠️ `isEmpty` used to SKIP this check — `if (s.isEmpty) return`. A flag that
// buys an assertion the right not to run is not a contract, it is permission
// not to look, and it is the reason "0% win rate on an empty journal" survived
// every green run of this suite (R-3). It now BRANCHES: the empty journal has
// its own partition to satisfy, and there is no third state.
const ratesSumTo100 = (label, s) => {
  if (s.isEmpty) {
    eq(`${label} — ריק: winRate הוא null`,  s.winRate,  null);
    eq(`${label} — ריק: lossRate הוא null`, s.lossRate, null);
    eq(`${label} — ריק: beRate הוא null`,   s.beRate,   null);
    eq(`${label} — ריק: wins + losses + be === 0`, s.wins + s.losses + s.be, 0);
    eq(`${label} — ריק: totalTrades === 0`, s.totalTrades, 0);
    return;
  }
  close(`${label} — winRate + lossRate + beRate === 100`, s.winRate + s.lossRate + s.beRate, 100);
  eq(`${label} — wins + losses + be === totalTrades`, s.wins + s.losses + s.be, s.totalTrades);
};

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
  // B-009 — these four asserted `0` from the day this suite was written. They
  // were not wrong about the code; they were the code's contract, and the
  // contract was the bug. Block 9b below now owns the replacement, and these
  // read null so the two blocks cannot disagree about the same object.
  eq("winRate", s.winRate, null);
  eq("profitFactor", s.profitFactor, null);
  eq("avgR", s.avgR, null);
  eq("rSampleSize", s.rSampleSize, 0);
  eq("currentEquity", s.currentEquity, CAPITAL);
  eq("returnPct", s.returnPct, null);
  eq("equityCurve.length", s.equityCurve.length, 0);
  eq("bySetup.length", s.bySetup.length, 0);
  eq("topEdges.length", s.topEdges.length, 0);
  eq("be", s.be, 0);
  eq("beRate", s.beRate, null);
  eq("streakRuns", s.streakRuns.length, 0);
  completeness("empty", [], s, 0);
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
  eq("be (none in this fixture)", s.be, 0);
  eq("beRate", s.beRate, 0);
  ratesSumTo100("normal", s);
  completeness("normal", NORMAL, s, 0);
  // Chronological runs: t6(+) t5(−) t4(+) t8(−) t3(+) t2(−) t1(+) t7(+)
  eq("streakRuns", JSON.stringify(s.streakRuns), JSON.stringify([
    { type: "win", length: 1 }, { type: "loss", length: 1 },
    { type: "win", length: 1 }, { type: "loss", length: 1 },
    { type: "win", length: 1 }, { type: "loss", length: 1 },
    { type: "win", length: 2 },
  ]));
  eq("streakRuns longest win run === maxWinStreak",
    Math.max(...s.streakRuns.filter(r => r.type === "win").map(r => r.length)), s.maxWinStreak);
  eq("streakRuns longest loss run === maxLossStreak",
    Math.max(...s.streakRuns.filter(r => r.type === "loss").map(r => r.length)), s.maxLossStreak);
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
  // T3 · decision 2 — the BE trades are now NAMED, not merely absent. winRate
  // and lossRate are unchanged from v1; the missing third is no longer silent.
  eq("be", s.be, 2);
  close("beRate", s.beRate, (2 / 6) * 100);
  ratesSumTo100("withBreakEven", s);
  completeness("withBreakEven", WITH_BE, s, 0);
  // BE trades neither extend nor break a run: w1 w2 (2 wins) then l1 l2 (2 losses).
  eq("streakRuns — BE is transparent to runs", JSON.stringify(s.streakRuns),
    JSON.stringify([{ type: "loss", length: 2 }, { type: "win", length: 2 }]));
  eq("bySetup[0] carries the same BE bucket", s.bySetup[0].be, 2);
  close("bySetup[0] rates sum to 100",
    s.bySetup[0].winRate + s.bySetup[0].lossRate + s.bySetup[0].beRate, 100);
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
  eq("be", s.be, 0);
  ratesSumTo100("missingStops", s);
  completeness("missingStops", NO_STOPS, s, 0);
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
  ratesSumTo100("openPositions", s);
  // The 2 OPEN trades are accounted for by openTrades — nothing is unaccounted.
  completeness("openPositions", WITH_OPEN, s, 2 - 2);
}

// ─────────────────────────────────────────────────────────────────────────
// 6 · CLOSED WITHOUT EXIT — the population contract of T3 · decision 1.
//     A row flagged CLOSED with no exit price has no realized P&L. Before the
//     unification it was counted in `closed` and contributed pnl 0, which is
//     indistinguishable from a genuine break-even: it inflated the denominator
//     of every rate and shifted the equity curve by a phantom flat point.
//     `getClosed` now requires `exit != null`, so it leaves the population —
//     and, because it is not OPEN either, it leaves the stats object entirely.
//     That disappearance is asserted here rather than being left implicit.
//     Production count of such rows on 2026-07-30: 0/102 closed trades.
// ─────────────────────────────────────────────────────────────────────────
{
  console.log("\n6 · CLOSED without exit — excluded from the closed population, and declared missing");
  const CLOSED_NO_EXIT = [
    mk({ id: "x1", entry: 100, stop: 90, exit: 120,  shares: 10, date: daysAgo(3) }),  // pnl 200 r 2
    mk({ id: "x2", entry: 100, stop: 90, exit: 80,   shares: 10, date: daysAgo(10) }), // pnl -200 r -2
    mk({ id: "ghost", entry: 100, stop: 90, exit: null, shares: 10, date: daysAgo(6) }), // CLOSED, no exit
    mk({ id: "o1", entry: 100, stop: 90, exit: null, shares: 10, date: daysAgo(1), status: "OPEN" }),
  ];
  const s = computeTradingStats(CLOSED_NO_EXIT, CAPITAL, calcTradeMetrics);
  eq("totalTrades — the CLOSED-without-exit row is NOT counted", s.totalTrades, 2);
  eq("openTrades — nor is it silently reclassified as open", s.openTrades, 1);
  check("the ghost row never reaches closedMetrics",
    s.closedMetrics.every(m => m.id !== "ghost"));
  eq("be — a missing exit is NOT a break-even", s.be, 0);
  close("winRate — 1 of 2, not 1 of 3", s.winRate, 50);
  ratesSumTo100("closedWithoutExit", s);
  eq("equityCurve has no phantom flat point", s.equityCurve.length, 2);
  // THE POINT OF THIS FIXTURE: exactly one input trade is in neither bucket.
  completeness("closedWithoutExit", CLOSED_NO_EXIT, s, 1);
}

// ─────────────────────────────────────────────────────────────────────────
// 6b · FIN-006 lock — `followedPlan` is a tri-state that arrives from CSV
//      import as a STRING. The string "false" is truthy in JS, so a raw
//      `filter(t => t.followedPlan)` counts a trade the user explicitly marked
//      as off-plan as discipline. isFollowedPlan/isOffPlan own that parsing.
//      Already correct at T3 start; this asserts it stays that way.
// ─────────────────────────────────────────────────────────────────────────
{
  console.log("\n6b · FIN-006 — the STRING \"false\" is not discipline");
  const PLAN_STRINGS = [
    mk({ id: "p1", entry: 100, stop: 90, exit: 120, shares: 10, date: daysAgo(3),  followedPlan: "false" }),
    mk({ id: "p2", entry: 100, stop: 90, exit: 120, shares: 10, date: daysAgo(5),  followedPlan: "true" }),
    mk({ id: "p3", entry: 100, stop: 90, exit: 80,  shares: 10, date: daysAgo(8),  followedPlan: false }),
    mk({ id: "p4", entry: 100, stop: 90, exit: 80,  shares: 10, date: daysAgo(12), followedPlan: true }),
  ];
  const s = computeTradingStats(PLAN_STRINGS, CAPITAL, calcTradeMetrics);
  close('planAdherence — 2 of 4, not 4 of 4 ("false" is not truthy here)', s.planAdherence, 50);
  close("planFollowedWR — p2 won, p4 lost → 50%", s.planFollowedWR, 50);
  close("planIgnoredWR — p1 won, p3 lost → 50%", s.planIgnoredWR, 50);
}

// ─────────────────────────────────────────────────────────────────────────
// 6c · FIN-019/020 — the equity sequence is ordered by CLOSE, not entry.
//      Every other fixture in this file is built by mk(), which derives
//      closedAt from date, so close day always equals entry day and NO other
//      scenario — including the frozen baseline — can tell the two orderings
//      apart. This one can: LONGHOLD is entered first and closed last.
//
//      Hand-verified. P&L: LONGHOLD +300, FEB -200, MAR -150, APR +200.
//      By close (correct):  2300 → 2150 → 2350 → 2650, peak 2500, trough 2150
//                           maxDD = 350/2500 = 14%
//      By entry (the bug):  2800 → 2600 → 2450 → 2650, peak 2800, trough 2450
//                           maxDD = 350/2800 = 12.5%
//      Same trades, same total P&L, different drawdown — because drawdown is a
//      claim about the order the account actually lived through.
// ─────────────────────────────────────────────────────────────────────────
{
  console.log("\n6c · FIN-019/020 — equity sequence ordered by close, not entry");
  const held = (id, date, closeDay, exit) => ({
    id, ticker: id, side: "LONG", status: "CLOSED", setup: "Breakout",
    emotionAtEntry: "Confident", marketCondition: "Trending Up", entryQuality: 3,
    followedPlan: true, entry: 100, stop: 90, shares: 10,
    date, closedAt: `${closeDay}T20:00:00.000Z`, exit,
  });
  const CROSS = [
    held("LONGHOLD", "2026-01-05", "2026-06-15", 130), // opened FIRST, closed LAST
    held("FEB",      "2026-02-10", "2026-02-12",  80),
    held("MAR",      "2026-03-10", "2026-03-12",  85),
    held("APR",      "2026-04-10", "2026-04-12", 120),
  ];
  const s = computeTradingStats(CROSS, CAPITAL, calcTradeMetrics);

  eq("curve order is close order",
    s.equityCurve.map(p => p.date).join(","),
    "2026-02-12,2026-03-12,2026-04-12,2026-06-15");
  eq("LONGHOLD lands last, not first", s.equityCurve[3].pnl, 300);
  eq("equity path follows the close order",
    s.equityCurve.map(p => p.equity).join(","), "2300,2150,2350,2650");
  close("maxDrawdown = 14% (by close), NOT 12.5% (by entry)", s.maxDrawdown, 14, 1e-9);
  eq("curve dates are day keys, never full ISO timestamps",
    s.equityCurve.every(p => /^\d{4}-\d{2}-\d{2}$/.test(p.date)), true);
  // Ordering changes the run-length history too: by entry it reads W,LL,W.
  eq("streakRuns follow close order (LL then WW)",
    JSON.stringify(s.streakRuns),
    JSON.stringify([{ type: "loss", length: 2 }, { type: "win", length: 2 }]));
  // Order-invariant totals must NOT move — this fix reorders, it does not re-price.
  eq("totalPnL unchanged by ordering", s.totalPnL, 150);
  eq("currentEquity unchanged by ordering", s.currentEquity, 2650);
}

// ─────────────────────────────────────────────────────────────────────────
// 7 · Infinity sweep — profitFactor (top-level AND every breakdown group) is
//     the one field in this module's output that can legitimately be
//     Infinity. Confirms no OTHER field goes non-finite on a no-losses
//     portfolio, and documents where Infinity can surface for consumers.
// ─────────────────────────────────────────────────────────────────────────
{
  console.log("\n7 · Infinity sweep — only profitFactor (top-level + breakdown groups) may be Infinity");
  const NO_LOSSES = [
    mk({ id: "a", entry: 100, stop: 90, exit: 120, shares: 10, date: daysAgo(3), setup: "Breakout" }),
    mk({ id: "b", entry: 100, stop: 90, exit: 120, shares: 10, date: daysAgo(5), setup: "Breakout" }),
    mk({ id: "c", entry: 100, stop: 90, exit: 120, shares: 10, date: daysAgo(8), setup: "Breakout" }),
  ];
  const s = computeTradingStats(NO_LOSSES, CAPITAL, calcTradeMetrics);
  eq("profitFactor is Infinity when there are wins and zero losses", s.profitFactor, Infinity);
  check("bySetup[0].profitFactor is ALSO Infinity under the same condition — same declared sentinel, one arithmetic path",
    s.bySetup[0].profitFactor === Infinity);
  // T3 task §3 — the latent risk T2 flagged: every breakdown array carries a
  // profitFactor that can go Infinity, and NOTHING ELSE in a group may. A
  // consumer that renders a group figure needs exactly one guard, on one field.
  const GROUPED = ["bySetup", "byEmotion", "byMarket", "byEntryQuality", "byDayOfWeek", "topEdges", "antiEdges"];
  for (const arr of GROUPED) {
    for (const g of s[arr]) {
      for (const [k, v] of Object.entries(g)) {
        if (typeof v !== "number") continue;
        check(`${arr}[${g.name}].${k} — finite unless it is profitFactor`,
          Number.isFinite(v) || k === "profitFactor");
      }
      if ("winRate" in g && "lossRate" in g && "beRate" in g) {
        close(`${arr}[${g.name}] rates sum to 100`, g.winRate + g.lossRate + g.beRate, 100);
      }
    }
  }
  const SCALARS = ["winRate", "lossRate", "beRate", "avgWin", "avgLoss", "avgR", "totalPnL", "bestWin",
    "worstLoss", "currentEquity", "returnPct", "maxDrawdown", "maxDD", "currentDrawdown",
    "avgHoldHours", "avgHold", "planFollowedWR", "planIgnoredWR", "planAdherence"];
  for (const k of SCALARS) {
    check(`${k} is finite or null (never Infinity/NaN)`, s[k] === null || Number.isFinite(s[k]));
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 8 · A5 — A RATE WITH A ZERO DENOMINATOR IS NOT 0%.
//
//     Every fixture above feeds computeTradingStats a journal whose every
//     sub-population happens to be non-empty, so the zero-denominator branch
//     of outcomeRates/summarize was never observed by this suite. That is the
//     whole reason "0% win rate on 0W/0L" survived: the gate could not see it.
//     A scenario that was never observed failing is not a gate.
//
//     Two populations can be empty inside a perfectly active journal:
//       a. a TIME WINDOW  — you traded, just not in the last 7/30 days.
//       b. a PLAN BUCKET  — you traded, and never once deviated from plan.
//     In both cases the honest answer is "not measured", which is what avgR
//     has always returned (null) and what these rates must now return too.
// ─────────────────────────────────────────────────────────────────────────
{
  console.log("\n8 · A5 — zero-denominator rates are null, not 0");

  // ── a. Dormant windows: a real journal, no activity in the last 30 days ──
  const DORMANT = [
    mk({ id: "d1", entry: 100, stop: 90, exit: 120, shares: 10, date: daysAgo(90) }),
    mk({ id: "d2", entry: 100, stop: 90, exit: 85,  shares: 10, date: daysAgo(120) }),
  ];
  const d = computeTradingStats(DORMANT, CAPITAL, calcTradeMetrics);

  eq("dormant — journal is NOT empty", d.isEmpty, false);
  eq("dormant — totalTrades", d.totalTrades, 2);
  eq("dormant — all-time winRate is a real 1/2", d.winRate, 50);
  // The denominator of both windows is genuinely zero…
  eq("dormant — lastWeekStats.count", d.lastWeekStats.count, 0);
  eq("dormant — lastMonthStats.count", d.lastMonthStats.count, 0);
  // …so neither window may report a rate. 0 here is a claim that the trader
  // lost every trade last week; they placed none.
  eq("dormant — lastWeekStats.winRate is null, not 0", d.lastWeekStats.winRate, null);
  eq("dormant — lastWeekStats.beRate is null, not 0", d.lastWeekStats.beRate, null);
  eq("dormant — lastMonthStats.winRate is null, not 0", d.lastMonthStats.winRate, null);
  eq("dormant — lastMonthStats.beRate is null, not 0", d.lastMonthStats.beRate, null);
  // pnl and count stay numeric — those ARE measured, and they are 0.
  eq("dormant — lastWeekStats.pnl stays a real 0", d.lastWeekStats.pnl, 0);

  // ── b. Plan buckets: every trade followed the plan → planNo is empty ─────
  const ALL_ON_PLAN = [
    mk({ id: "p1", entry: 100, stop: 90, exit: 120, shares: 10, date: daysAgo(3), followedPlan: true }),
    mk({ id: "p2", entry: 100, stop: 90, exit: 80,  shares: 10, date: daysAgo(6), followedPlan: true }),
  ];
  const on = computeTradingStats(ALL_ON_PLAN, CAPITAL, calcTradeMetrics);
  eq("allOnPlan — planAdherence proves the denominator is zero", on.planAdherence, 100);
  eq("allOnPlan — planFollowedWR is a real 1/2", on.planFollowedWR, 50);
  eq("allOnPlan — planIgnoredWR is null, not 0", on.planIgnoredWR, null);

  // ── c. The mirror image, so the fix cannot be a one-sided special case ──
  const ALL_OFF_PLAN = [
    mk({ id: "q1", entry: 100, stop: 90, exit: 120, shares: 10, date: daysAgo(3), followedPlan: false }),
    mk({ id: "q2", entry: 100, stop: 90, exit: 80,  shares: 10, date: daysAgo(6), followedPlan: false }),
  ];
  const off = computeTradingStats(ALL_OFF_PLAN, CAPITAL, calcTradeMetrics);
  eq("allOffPlan — planAdherence proves the denominator is zero", off.planAdherence, 0);
  eq("allOffPlan — planIgnoredWR is a real 1/2", off.planIgnoredWR, 50);
  eq("allOffPlan — planFollowedWR is null, not 0", off.planFollowedWR, null);

  // ── d. null must never be silently re-coerced back into a number ─────────
  // `null * 100 === 0` and `Math.round(null) === 0`. The whole contract dies
  // quietly if any of these read as 0 rather than as absent.
  for (const [label, v] of [
    ["lastWeekStats.winRate", d.lastWeekStats.winRate],
    ["lastMonthStats.winRate", d.lastMonthStats.winRate],
    ["planIgnoredWR", on.planIgnoredWR],
    ["planFollowedWR", off.planFollowedWR],
  ]) {
    check(`${label} — Number.isFinite() is false (it is absent, not zero)`, Number.isFinite(v) === false);
    check(`${label} — does not equal 0`, v !== 0);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 9 · `tradesByCurrency` — the DENOMINATOR of `pnlByCurrency` (B-142 · C6)
// ─────────────────────────────────────────────────────────────────────────
// ⚠️ **קיים כדי ש-`tradesByCurrency` ⛔ לא ייכנס לבייסליין הקפוא בלי שאיש
// אימת את ערכו.** בייסליין מגן על מספר מפני **תזוזה** — הוא ⛔ אינו יודע אם
// המספר נכון ביום שנלכד. מפתח שנולד ישר לתוך קו קפוא הוא מספר שהוקפא בלי
// שנבדק, וזה `R-3` בדיוק: אימות **כתיבה** במקום אימות **נראוּת**.
//
// 🔴 הנושא הוא ההצמדה: `pnlByCurrency[c]` ו-`tradesByCurrency[c]` נגזרים
// מ**אותה לולאה** ולכן חייבים לכסות **בדיוק אותן שורות**. סכום שמפרסם מונה
// שאינו האוכלוסייה שלו גרוע מסכום בלי מונה — הוא מנה עם מכנה **שקרי**.
{
  console.log("\n9 · tradesByCurrency — המכנה של pnlByCurrency (B-142 · C6)");

  // 5 עסקאות סגורות. 3 ניתנות לצירוף (טיקר אלפביתי, ⛔ אין ראיה נגד ⇒ USD),
  // ו-2 ⛔ אינן: טיקר מספרי (`AMBIGUOUS`) ותווית ILS על טיקר אלפביתי
  // (`CONTRADICTED` — ILS ⛔ לא נמדד אף פעם, ראה instrumentCurrency.js:148).
  const mixed = computeTradingStats([
    mk({ id: "u1", ticker: "AAPL", entry: 100, stop: 90, exit: 120, shares: 10, date: daysAgo(3) }),
    mk({ id: "u2", ticker: "MSFT", entry: 100, stop: 90, exit: 80,  shares: 10, date: daysAgo(6) }),
    mk({ id: "u3", ticker: "NVDA", entry: 100, stop: 90, exit: 110, shares: 10, date: daysAgo(9) }),
    mk({ id: "x1", ticker: "1234", entry: 100, stop: 90, exit: 150, shares: 10, date: daysAgo(12) }),
    mk({ id: "x2", ticker: "TEVA", currency: "ILS", entry: 100, stop: 90, exit: 200, shares: 10, date: daysAgo(15) }),
  ], CAPITAL, calcTradeMetrics);

  eq("האוכלוסייה כולה — 5 סגורות", mixed.totalTrades, 5);
  eq("🔴 המונה נעול על ערך: 3 עסקאות דולריות", mixed.tradesByCurrency.USD, 3);
  eq("⛔ ו⛔ אין מפתח שני — היום {USD} היא הקבוצה הנגזרת כולה",
    Object.keys(mixed.tradesByCurrency).join(","), "USD");
  // 3/5 — המונה **והמכנה**, §2. השתיים שנותרו ⛔ אינן "אפס", הן **מחוץ** לפילוח.
  eq("⇒ 3 מתוך 5 נכנסו לפילוח, ו-2 ⛔ לא",
    `${Object.values(mixed.tradesByCurrency).reduce((a, b) => a + b, 0)}/${mixed.totalTrades}`,
    "3/5");
  check("⇒ ולכן הקבוצה ⛔ אינה מוכחת חד-מטבעית — הבאנר נדלק", mixed.mixedCurrency === true);

  // 🔴 ההצמדה עצמה. הסכום של 3 הדולריות בלבד: +200 −200 +100 = +100.
  // ⛔ אינו כולל את +500 של הטיקר המספרי ו-+1,000 של תווית ה-ILS.
  eq("🔴 `pnlByCurrency.USD` מכסה את **אותן** 3 שורות בדיוק", mixed.pnlByCurrency.USD, 100);
  eq("…בעוד `totalPnL` סוכם את כל 5 — וזה ההפרש שהמונה מגלה",
    mixed.totalPnL, 100 + 500 + 1000);

  // ── שיניים ────────────────────────────────────────────────────────────────
  // בלי זה, מונה שמחזיר תמיד את `totalTrades` היה עובר את הכל למעלה.
  const clean = computeTradingStats([
    mk({ id: "c1", ticker: "AAPL", entry: 100, stop: 90, exit: 120, shares: 10, date: daysAgo(3) }),
    mk({ id: "c2", ticker: "MSFT", entry: 100, stop: 90, exit: 80,  shares: 10, date: daysAgo(6) }),
  ], CAPITAL, calcTradeMetrics);
  eq("שיניים · יומן נקי ⇒ המונה **שווה** לאוכלוסייה", clean.tradesByCurrency.USD, 2);
  eq("שיניים · 2 מתוך 2",
    `${Object.values(clean.tradesByCurrency).reduce((a, b) => a + b, 0)}/${clean.totalTrades}`,
    "2/2");
  check("שיניים · ⛔ ואינו מדליק את הבאנר", clean.mixedCurrency === false);
  eq("שיניים · המונה ⛔ אינו `totalTrades` בתחפושת — 3≠5 למעלה, 2=2 כאן",
    mixed.tradesByCurrency.USD === mixed.totalTrades, false);

  // יומן ריק: `{}`, ⛔ לא `{USD:0}`. אפס עסקאות דולריות ⛔ אינו טענה על מטבע.
  eq("יומן ריק ⇒ פילוח ריק, ⛔ לא אפס מזויף",
    JSON.stringify(computeTradingStats([], CAPITAL, calcTradeMetrics).tradesByCurrency), "{}");
}

// ─────────────────────────────────────────────────────────────────────────
// 9b · B-009 — THE EMPTY JOURNAL. Block 8 closed the zero-denominator case
//      for populations INSIDE an active journal (a dormant week, an empty
//      plan bucket). It could not reach `EMPTY_STATS`, because every fixture
//      it uses has `isEmpty === false`. `EMPTY_STATS` is the one branch a
//      BRAND-NEW user sees, and it was the last place still publishing
//      invented numbers.
//
//      Three assertions, and the second and third are shaped deliberately:
//
//      1. `winRate` — the plain "not measured" case. 0% is a value the live
//         path CAN produce (a trader who lost every trade), so 0 here is
//         indistinguishable from a real measurement. This is R-2.
//
//      2. `bestWin` / `worstLoss` — a STRICTLY STRONGER failure, and it needs
//         a PAIR to prove it. A win is by definition `pnl > 0` and a loss
//         `pnl < 0`, so `bestWin === 0` is not merely unmeasured — it is a
//         value the live path can NEVER produce. The empty half alone cannot
//         show that; the live half is what proves 0 is out of range. See
//         PLAN-B009.md §1.1 — this is the RANGE test, and it outranks both
//         the identity test and the collision test.
//
//      3. `lastWeekStats` SHAPE — B-065. `summarize()` emits 4 keys and
//         `EMPTY_STATS` emitted 3. A consumer reading `.beRate` got
//         `undefined` on an empty journal and a number on a full one, and
//         neither is the intended null. This asserts KEY SETS, not values:
//         the values are block 8's job, the shape is what silently drifted.
// ─────────────────────────────────────────────────────────────────────────
{
  console.log("\n9b · B-009 — יומן ריק: null אם״ם הערך אינו מדיד מאפס עסקאות");

  const empty = computeTradingStats([], CAPITAL, calcTradeMetrics);

  // ── 1. Not measured ─────────────────────────────────────────────────────
  eq("ריק — winRate הוא null, ⛔ לא 0", empty.winRate, null);
  eq("ריק — lossRate הוא null, ⛔ לא 0", empty.lossRate, null);
  eq("ריק — beRate הוא null, ⛔ לא 0", empty.beRate, null);
  eq("ריק — profitFactor הוא null, ⛔ לא 0", empty.profitFactor, null);
  eq("ריק — avgWin הוא null, ⛔ לא 0", empty.avgWin, null);
  eq("ריק — avgLoss הוא null, ⛔ לא 0", empty.avgLoss, null);
  eq("ריק — avgHold הוא null, ⛔ לא 0", empty.avgHold, null);
  eq("ריק — avgHoldHours הוא null, ⛔ לא 0", empty.avgHoldHours, null);
  eq("ריק — returnPct הוא null, ⛔ לא 0", empty.returnPct, null);
  eq("ריק — planAdherence הוא null, ⛔ לא 0", empty.planAdherence, null);
  eq("ריק — planFollowedWR הוא null, ⛔ לא 0", empty.planFollowedWR, null);
  eq("ריק — planIgnoredWR הוא null, ⛔ לא 0", empty.planIgnoredWR, null);

  // ── 2. Out of range — the PAIR. Neither half proves it alone. ───────────
  eq("ריק — bestWin הוא null", empty.bestWin, null);
  eq("ריק — worstLoss הוא null", empty.worstLoss, null);
  const ONE_WIN = [mk({ id: "w1", entry: 100, stop: 90, exit: 120, shares: 10, date: daysAgo(3) })];
  const ONE_LOSS = [mk({ id: "l1", entry: 100, stop: 90, exit: 80, shares: 10, date: daysAgo(3) })];
  const w = computeTradingStats(ONE_WIN, CAPITAL, calcTradeMetrics);
  const l = computeTradingStats(ONE_LOSS, CAPITAL, calcTradeMetrics);
  check("חי — bestWin > 0 תמיד כשהוא מוגדר ⇒ 0 מחוץ לטווח, ⛔ לא 'לא נמדד'",
    w.bestWin > 0);
  check("חי — worstLoss < 0 תמיד כשהוא מוגדר ⇒ 0 מחוץ לטווח",
    l.worstLoss < 0);
  // ...and avgLoss accumulates Math.abs(), so IT is strictly positive too.
  check("חי — avgLoss > 0 תמיד כשהוא מוגדר ⇒ avgLoss:0 היה מחוץ לטווח",
    l.avgLoss > 0);

  // ── 3. B-065 — one shape, both branches ─────────────────────────────────
  const full = computeTradingStats(ONE_WIN, CAPITAL, calcTradeMetrics);
  for (const key of ["lastWeekStats", "lastMonthStats"]) {
    eq(`B-065 · ${key} — אותה קבוצת מפתחות בריק ובמלא`,
      Object.keys(empty[key]).sort().join(","),
      Object.keys(full[key]).sort().join(","));
  }

  // ── 4. null must not be re-coerced back into a number, same as block 8d ─
  for (const [label, v] of [
    ["winRate", empty.winRate], ["avgWin", empty.avgWin], ["avgLoss", empty.avgLoss],
    ["avgHold", empty.avgHold], ["returnPct", empty.returnPct],
    ["bestWin", empty.bestWin], ["worstLoss", empty.worstLoss],
    ["profitFactor", empty.profitFactor],
  ]) {
    check(`ריק · ${label} — Number.isFinite() הוא false`, Number.isFinite(v) === false);
    check(`ריק · ${label} — ⛔ אינו שווה 0`, v !== 0);
  }

  // ── 5. …and what IS measured at zero stays a number. A blanket refusal is
  //       the same bug with the sign flipped: a metric that abstains when it
  //       IS measurable lies exactly as loudly as one that invents.
  eq("ריק — maxDrawdown נשאר 0 (איבר יחידה · בטווח · ⛔ אין התנגשות)", empty.maxDrawdown, 0);
  eq("ריק — maxDD נשאר 0", empty.maxDD, 0);
  eq("ריק — currentDrawdown נשאר 0", empty.currentDrawdown, 0);
  eq("ריק — currentStreak נשאר 0 (מונה)", empty.currentStreak, 0);
  eq("ריק — totalPnL נשאר 0 (סכום)", empty.totalPnL, 0);
  eq("ריק — totalTrades נשאר 0 (מונה)", empty.totalTrades, 0);
  eq("ריק — currentEquity נשאר ההון שהוזן", empty.currentEquity, CAPITAL);
  eq("ריק — lastWeekStats.pnl נשאר 0 (סכום)", empty.lastWeekStats.pnl, 0);
  eq("ריק — lastWeekStats.count נשאר 0 (מונה)", empty.lastWeekStats.count, 0);
}

// ─────────────────────────────────────────────────────────────────────────
// 10 · FROZEN BASELINE — full-object regression gate for all 8 fixtures.
//     First run on a clean checkout writes the baseline (and the assertion
//     trivially passes); every run after that diffs against the committed
//     file. This is the T3 tripwire referenced in the plan doc.
// ─────────────────────────────────────────────────────────────────────────
{
  console.log("\n10 · frozen full-object baseline v5 (scripts/fixtures/tradingstats-baseline.json)");
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
    // New in v2 — the population contract of decision 1 (see scenario 6).
    closedWithoutExit: computeTradingStats([
      mk({ id: "x1", entry: 100, stop: 90, exit: 120,  shares: 10, date: daysAgo(3) }),
      mk({ id: "x2", entry: 100, stop: 90, exit: 80,   shares: 10, date: daysAgo(10) }),
      mk({ id: "ghost", entry: 100, stop: 90, exit: null, shares: 10, date: daysAgo(6) }),
      mk({ id: "o1", entry: 100, stop: 90, exit: null, shares: 10, date: daysAgo(1), status: "OPEN" }),
    ], CAPITAL, calcTradeMetrics),
    // New in v3 — the A5 null-rate contract (scenario 8). Scenario 8 asserts
    // the individual fields; freezing the whole object here is what stops a
    // future refactor from re-coercing null back to 0 in a field nobody
    // thought to assert on.
    dormantWindows: computeTradingStats([
      mk({ id: "d1", entry: 100, stop: 90, exit: 120, shares: 10, date: daysAgo(90) }),
      mk({ id: "d2", entry: 100, stop: 90, exit: 85,  shares: 10, date: daysAgo(120) }),
    ], CAPITAL, calcTradeMetrics),
    allOnPlan: computeTradingStats([
      mk({ id: "p1", entry: 100, stop: 90, exit: 120, shares: 10, date: daysAgo(3), followedPlan: true }),
      mk({ id: "p2", entry: 100, stop: 90, exit: 80,  shares: 10, date: daysAgo(6), followedPlan: true }),
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
