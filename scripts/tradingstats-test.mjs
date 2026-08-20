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
// BASELINE VERSION: v6 (T3 · B-160 · docs/plans/PLAN-B160.md).
// v5 → v6 removed the `isEmpty` key from both producers. It was a hand-kept
// literal duplicating `total === 0` (measured 4/4, no third state — R-6), and
// SwingEdge_App.jsx:4824 is the only consumer, now reading `total` directly.
// Predicted diff, written BEFORE recapture: 8 lines removed (the `isEmpty`
// key, last in every one of the 8 scenario objects) + 8 lines modified
// (trailing comma stripped from the new last key) + 0 added = 16 deletions /
// 8 insertions. Measured `diff -u` against the pre-recapture baseline: 16
// deletions / 8 insertions — exact match, every hunk touches only that key.
// Bidirectional discrimination proof run against the fresh v6 baseline before
// it was trusted: mutating `winRate` in the live path turned BOTH the value
// assertions and the baseline red (7 fixtures); mutating `bestStreak` (0
// assertion coverage — not in the `SCALARS` list) turned ONLY the baseline
// red, on the 7 fixtures that reach the live path (`empty` is unaffected —
// it never reaches this alias). Both mutations reverted before commit.
//
// BASELINE VERSION: v7 (T3 · B-143 · docs/plans/PLAN-B143.md).
// v6 → v7 was captured after the money population split off from the count
// population: every money figure now sums the members the FX seam could price
// in the display currency, and publishes how many it left out.
//
// Predicted diff, written BEFORE recapture (PLAN-B143.md §4.1): **pure
// additions, 0 changed values, 0 removals** — because not one of the eight
// baseline fixtures ever sets `fxUnconverted`, so `aggregatable === metrics`
// in all of them and every existing number must survive byte-for-byte.
//
// Measured: 132 `+` lines / 40 `-` lines. The 40 are the trailing-comma
// artifact of JSON, not value changes, and that was PROVEN rather than
// assumed: every removed line reappears among the added lines identically
// once a trailing comma is stripped (`comm -23` of the two sorted, comma-
// normalised sets is EMPTY). Net: **+92 keys, 0 changed values, 0 removals** —
// 84 × `fxUnconvertedCount` (top level, every breakdown group, every weekday,
// every edge, both rolling windows) + 8 × `fxAggregatableCount` (top level,
// one per fixture). All 84 of the new counters read 0, verified by value.
//
// ⚠️ That last fact is this wave's REVERSE assertion in machine form. The
// danger in a change like this is not the mixed-currency journal it fixes but
// the single-currency journal it must leave alone: a blanket exclusion would
// silently shrink every average, and "avgWin dropped" is a bug that looks like
// a result. 0 changed values across 8 fixtures is the proof that nothing moved
// for the journals that never had a conversion problem. Block 11.8 asserts the
// same contract by hand on a fixture built for it.
//
// Bidirectional discrimination proof run against the fresh v7 baseline before
// it was trusted: mutating `fxAggregatableCount` (covered — block 11.3) turned
// BOTH layers red, 7 baseline fixtures + 4 value assertions; mutating
// `bestStreak` (0 assertion coverage) turned ONLY the baseline red, on the
// same 7 fixtures that reach the live path (`empty` is unaffected — it never
// reaches the alias). Both mutations reverted before commit.
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
// B-144 — `fmt$` is imported so block 12 can assert the mixed-currency banner's
// line by VALUE, using the app's own formatter rather than a copy of it.
import { calcTradeMetrics, fmt$ } from "../src/utils.js";
// B-143 — the refusal marker is NOT synthesised here. Block 11 drives the real
// conversion seam so the fixture cannot drift from what the app actually does.
import { makeConvertingCalc } from "../src/hooks/useFxRates.js";

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
// B-160 — this used to branch on `s.isEmpty`, but 0 of its 5 callers below
// ever pass empty stats, so the branch never ran, before OR after B-009. What
// actually kept "0% win rate on an empty journal" alive through every green
// run was block 1 (`:158` at extraction time) asserting `winRate === 0` as
// the CONTRACT — a green gate that pinned the bug, not one that skipped past
// it (R-3, corrected in DONE.md D-041). The unique assertion this branch
// carried (`wins + losses + be === 0` on empty stats) now lives in block 9b.
// A caller that DOES pass empty stats here fails loudly: null+null+null is
// 0, not 100.
const ratesSumTo100 = (label, s) => {
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
  eq("total — B-160: the field SwingEdge_App.jsx:4824 gates the stats bar on", s.total, 0);
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

  eq("dormant — total", d.total, 2);
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
  // 🔴 **הפוכה ב-B-144 · 20.08.** האסרציה הזו דרשה `=== true`, כלומר: באנר
  // ⟪היומן מחזיק יותר ממטבע אחד⟫ על יומן שכל **תוויותיו המאומתות** דולריות.
  // ההכרעה (ניב, 20.08): `mixedCurrency` מצהיר על **ריבוי תוויות-נייר
  // מאומתות**, ⛔ לא על קיום נייר לא-מאומת — כי הבאנר טוען טענה על ה**נתונים
  // של המשתמש**, ⛔ לא על מצב הידיעה של המערכת, ומשתמש שרואה "מטבע מעורב"
  // על יומן דולרי מקבל מידע **שגוי על היומן שלו** (`R-2`).
  // ⛔ **הציפייה ⛔ לא רוככה כדי לעבור** — הסמנטיקה עצמה השתנתה, והאסרציה
  // הנלווית מיד אחריה היא מה שמונע מהשינוי להיות "העלמה".
  check("🔴 B-144 · 20.08 — 3 תוויות מאומתות דולריות ⇒ הבאנר ⛔ **אינו** נדלק",
    mixed.mixedCurrency === false);
  // 🔴 האסרציה הנלווית (D2) — השתיים שאינן ניתנות לצירוף ⛔ **לא נעלמו**, הן
  // עברו **מכנה**: מהבאנר הזה אל `fxUnconvertedCount`, שנמסר עם מכנה (§2).
  // ⚠️ בפיקסצ'ר הזה ה-calc **גולמי** ולכן ⛔ אינו מסמן `fxUnconverted` — מה
  // שמדווח כאן הוא הפער בין האוכלוסייה לפילוח, וזה בדיוק אותו מספר.
  eq("🔴 …ו⛔ הן לא נעלמו — 2 מתוך 5 מחוץ לפילוח, עם מכנה",
    `${mixed.totalTrades - Object.values(mixed.tradesByCurrency).reduce((a, b) => a + b, 0)}/${mixed.totalTrades}`,
    "2/5");

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
//      it uses has `total > 0`. `EMPTY_STATS` is the one branch a BRAND-NEW
//      user sees, and it was the last place still publishing invented
//      numbers.
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
  // B-160 — relocated from the dead `ratesSumTo100` branch (0 of its 5
  // callers ever passed empty stats — the branch never ran, before OR after
  // B-009). The other 4 assertions in that branch were already duplicated
  // here; this was the one unique to it.
  eq("ריק — wins + losses + be === 0", empty.wins + empty.losses + empty.be, 0);

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
  console.log("\n10 · frozen full-object baseline v7 (scripts/fixtures/tradingstats-baseline.json)");
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

// ─────────────────────────────────────────────────────────────────────────
// 11 · B-143 — a cross-unit sum is not a sum.
//
//   `totalPnL` was a `reduce` over every closed metric that never asked what
//   currency each member was in. When the FX layer refuses a conversion it
//   marks the metric `fxUnconverted` and hands back the ORIGINAL number in the
//   ORIGINAL currency (useFxRates.makeConvertingCalc) — so the reduce added
//   shekels to dollars and every figure downstream of it inherited the mix:
//   totalWin, avgWin, bestWin, worstLoss, currentEquity, the equity curve, and
//   both drawdowns. B-142 fixed the HEADLINE by assembling it from
//   exclude-and-count legs; the hub underneath it was left contaminated and
//   handed to this wave.
//
//   The rule this block pins, and it is a SPLIT BY METRIC TYPE, not by field:
//
//     · COUNTS and RATES keep every closed metric. The SIGN of a P&L is
//       currency-independent — a trade that made money made money whether or
//       not we could price it in the account's currency. Excluding it here
//       would lie about the win rate, which is the one number on the dashboard
//       that has nothing to do with currency.
//     · MONEY sums use the convertible subset ONLY, and each one carries a
//       denominator drawn from that SAME subset (§2). A filtered numerator
//       over an unfiltered denominator is strictly worse than today's bug:
//       today `avgWin` is wrong and visibly so; that version would be wrong
//       and plausible.
//     · `avgR` / `rSampleSize` keep everything — R is a ratio taken INSIDE the
//       trade's own currency, so it is unit-free by construction.
//
//   ⚠️ The fixture below is the case that REFUTED the audit's first
//   conclusion. The audit swept 24 state combinations with one trade each,
//   measured 12/12 clean whenever `fxOk === true`, and concluded that a failed
//   FX load was a NECESSARY condition for divergence. A single-trade fixture
//   cannot produce a PARTIAL refusal, which is the whole failure mode: here
//   `fxOk === true`, the rate table loaded, and the journal still mixes units
//   because ONE member's realized day has no fixing. Two trades, not one, is
//   the difference between the sweep and the bug.
// ─────────────────────────────────────────────────────────────────────────
{
  console.log("\n11 · B-143 — money aggregates exclude-and-count, counts do not");

  // The gap day is BEFORE every fixing on purpose. `fx.convert` walks back up
  // to 7 days looking for a rate, so a gap day placed AFTER a good day would
  // silently resolve and the fixture would prove nothing.
  const GAP_A = "2026-01-05", GAP_B = "2026-01-06";
  const FIX_A = "2026-02-10", FIX_B = "2026-02-12";
  const TABLE = {
    base: "USD", quote: "ILS",
    spot: { rate: 2, rateDate: FIX_B },
    byDay: { [FIX_A]: { rate: 2, rateDate: FIX_A }, [FIX_B]: { rate: 2, rateDate: FIX_B } },
  };
  // fxOk === TRUE. The table loaded. `dispCcy` is ILS. This is a HEALTHY app.
  const conv = makeConvertingCalc(TABLE, "ILS", "ready");
  const usd = (o) => mk({ currency: "USD", ...o, closedAt: o.date });

  //   rfL  MSFT  −$300  refused (no fixing 2026-01-05)
  //   rfW  TSLA  +$100  refused (no fixing 2026-01-06)
  //   cv1  AAPL  +$100  → ₪200
  //   cv2  NVDA  −$50   → ₪−100
  const MIXED = [
    usd({ id: "rfL", ticker: "MSFT", entry: 100, stop: 95, exit: 70,  shares: 10, date: GAP_A }),
    usd({ id: "rfW", ticker: "TSLA", entry: 100, stop: 95, exit: 110, shares: 10, date: GAP_B }),
    usd({ id: "cv1", ticker: "AAPL", entry: 100, stop: 95, exit: 110, shares: 10, date: FIX_A }),
    usd({ id: "cv2", ticker: "NVDA", entry: 100, stop: 95, exit: 95,  shares: 10, date: FIX_B }),
  ];

  // ── 11.0 · the fixture is the bug, not a stand-in for it ────────────────
  eq("11.0 · the converted member really converted ($100 → ₪200)", conv(MIXED[2]).pnl, 200);
  eq("11.0 · …and is NOT marked", conv(MIXED[2]).fxUnconverted, undefined);
  eq("11.0 · the refused member keeps its ORIGINAL number", conv(MIXED[0]).pnl, -300);
  eq("11.0 · …and names its refusal", conv(MIXED[0]).fxUnconverted, "no_rate_for_day");

  const s = computeTradingStats(MIXED, 10_000, conv);

  // ── 11.1 · A1 — the sum. ₪200 − ₪100 = ₪100. The −300 and +100 are DOLLARS.
  eq("11.1 · A1 · totalPnL excludes the two refused members", s.totalPnL, 100);
  eq("11.1 · A1 · …and the contaminated value it replaces was −100", s.totalPnL !== -100, true);

  // ── 11.2 · A2 — every money average over ITS OWN denominator ────────────
  // Contaminated: avgWin = (100+200)/2 = 150 — the mean of a dollar and a
  // shekel. Filtered numerator over unfiltered denominator: 200/2 = 100 —
  // wrong AND plausible. Correct: 200/1.
  eq("11.2 · A2 · avgWin = ₪200 / 1 convertible winner", s.avgWin, 200);
  eq("11.2 · A2 · avgLoss = ₪100 / 1 convertible loser", s.avgLoss, 100);
  eq("11.2 · A2 · ⛔ NOT the filtered-numerator/unfiltered-denominator value", s.avgWin !== 100, true);
  eq("11.2 · A2 · totalWin", s.totalWin, 200);
  eq("11.2 · A2 · totalLoss", s.totalLoss, 100);
  eq("11.2 · A2 · profitFactor = 200/100", s.profitFactor, 2);
  eq("11.2 · A2 · bestWin", s.bestWin, 200);
  eq("11.2 · A2 · worstLoss — ⛔ not the −300 DOLLAR loss", s.worstLoss, -100);

  // ── 11.3 · A3 — the population, with its denominator (§2) ───────────────
  eq("11.3 · A3 · excluded, with denominator",
     `${s.fxUnconvertedCount}/${s.totalTrades}`, "2/4");
  eq("11.3 · A3 · …and the convertible count it leaves", s.fxAggregatableCount, 2);

  // ── 11.4 · A4 — the equity curve is the same population as the sum ──────
  eq("11.4 · A4 · equityCurve holds only convertible members", s.equityCurve.length, 2);
  eq("11.4 · A4 · last equity === currentEquity — ⛔ they cannot disagree",
     s.equityCurve[s.equityCurve.length - 1].equity, s.currentEquity);
  eq("11.4 · A4 · currentEquity = 10,000 + ₪100 (was 9,900 cross-unit)", s.currentEquity, 10_100);

  // ── 11.5 · A5 — drawdown is derived from the CLEAN curve ────────────────
  // Contaminated: the −$300 opened a ₪300 hole that never existed ⇒ maxDD 300,
  // maxDrawdown 3%. Clean: peak ₪10,200, trough ₪10,100 ⇒ 100 and ~0.98%.
  eq("11.5 · A5 · maxDD ($) — ⛔ not the 300 the dollar loss invented", s.maxDD, 100);
  close("11.5 · A5 · maxDrawdown (%) off the clean peak", s.maxDrawdown, (100 / 10_200) * 100);
  close("11.5 · A5 · currentDrawdown", s.currentDrawdown, (100 / 10_200) * 100);

  // ── 11.6 · A6 — THE OTHER HALF. Exclusion must NOT reach counts or rates.
  // A blanket refusal would "fix" the money by deleting half the journal's
  // behavioural record. The sign of a P&L needs no exchange rate.
  eq("11.6 · A6 · totalTrades keeps ALL four", s.totalTrades, 4);
  eq("11.6 · A6 · wins keeps both winners", s.wins, 2);
  eq("11.6 · A6 · losses keeps both losers", s.losses, 2);
  eq("11.6 · A6 · winRate is a rate, ⛔ not money", s.winRate, 50);
  eq("11.6 · A6 · rSampleSize keeps all — R is unit-free", s.rSampleSize, 4);
  ratesSumTo100("11.6 · A6", s);
  completeness("11.6 · A6", MIXED, s, 0);

  // ── 11.7 · A7 — breakdowns bundle money WITH counts in one object ───────
  // All four share setup "Breakout". `avgPnL` is the trap in miniature: its
  // numerator and denominator live in the same object literal, so a filtered
  // sum over `items.length` would be invisible.
  const bo = s.bySetup.find(g => g.name === "Breakout");
  eq("11.7 · A7 · breakdown count keeps all four", bo.count, 4);
  eq("11.7 · A7 · breakdown totalPnL excludes (was −100)", bo.totalPnL, 100);
  eq("11.7 · A7 · breakdown avgPnL over ITS OWN denominator — ₪100/2, ⛔ not /4",
     bo.avgPnL, 50);
  eq("11.7 · A7 · …and the group states what it dropped", bo.fxUnconvertedCount, 2);
  eq("11.7 · A7 · breakdown winRate untouched by exclusion", bo.winRate, 50);

  // ── 11.8 · the reverse assertion — a blanket refusal is the same bug ────
  // A single-currency journal must come through byte-identical: nothing turns
  // null, no average drops, no count shrinks. This is what stops "exclude" from
  // quietly becoming "exclude everything I am unsure about".
  {
    const CLEAN = [
      mk({ id: "c1", entry: 100, stop: 95, exit: 115, shares: 10, date: daysAgo(2) }),
      mk({ id: "c2", entry: 100, stop: 95, exit: 90,  shares: 10, date: daysAgo(5) }),
      mk({ id: "c3", entry: 50,  stop: 48, exit: 56,  shares: 20, date: daysAgo(9) }),
    ];
    const c = computeTradingStats(CLEAN, CAPITAL, calcTradeMetrics);
    eq("11.8 · nothing was excluded", c.fxUnconvertedCount, 0);
    eq("11.8 · …and the denominator is the whole journal", c.fxAggregatableCount, c.totalTrades);
    eq("11.8 · totalPnL = 150 − 100 + 120", c.totalPnL, 170);
    eq("11.8 · avgWin = (150+120)/2 — ⛔ did NOT drop", c.avgWin, 135);
    eq("11.8 · avgLoss", c.avgLoss, 100);
    eq("11.8 · bestWin", c.bestWin, 150);
    eq("11.8 · equityCurve keeps every member", c.equityCurve.length, 3);
    eq("11.8 · currentEquity", c.currentEquity, CAPITAL + 170);
    check("11.8 · ⛔ no money field collapsed to null",
      [c.totalPnL, c.totalWin, c.totalLoss, c.avgWin, c.avgLoss, c.bestWin, c.worstLoss,
       c.currentEquity, c.maxDD, c.maxDrawdown].every(v => typeof v === "number"));
    eq("11.8 · breakdown avgPnL denominator is the full group",
      c.bySetup.find(g => g.name === "Breakout").avgPnL, 170 / 3);
  }

  // ── 11.9 · EMPTY_STATS carries the same shape ──────────────────────────
  {
    const e = computeTradingStats([], CAPITAL, calcTradeMetrics);
    eq("11.9 · fxUnconvertedCount — 0 is the identity over the empty set", e.fxUnconvertedCount, 0);
    eq("11.9 · fxAggregatableCount", e.fxAggregatableCount, 0);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 12 · B-144 — `pnlByCurrency` · `tradesByCurrency` · `mixedCurrency` על שני
//      צירים **נפרדים**, ומפתח הדלי שווה ליחידה של הכסף שבתוכו.
//
// ⚠️ בלוק 11 מוכיח שהשדות המצרפיים מחריגים-וסופרים. ⛔ הוא ⛔ אינו נוגע
// בשלושת הפלטים האלה — הם היו הפלטים ש**אף אסרציה** לא אמרה עליהם דבר על
// פיקסצ'ר עם המרה, וזה בדיוק החור שהגל הזה סוגר (`AUDIT-B144.md` §D6).
//
// 🔴 **ההכרעה שממומשת** (ניב, 20.08, `PLAN-B144.md` §1): `mixedCurrency`
// מצהיר על **ריבוי תוויות-נייר מאומתות**, ⛔ לא על קיום נייר לא-מאומת.
// הבאנר אומר ⟪היומן מחבר מטבעות שונים⟫ — טענה על **הנתונים של המשתמש**,
// ⛔ לא על מצב הידיעה של המערכת. משתמש עם 2 מניות אמריקאיות שרואה "מטבע
// מעורב" מקבל מידע **שגוי על היומן שלו** (`R-2`). הגילוי של מה שלא אומת
// חי ב-`fxUnconvertedCount` ⇒ באנר `partialSumWarn`, **עם מכנה**.
//
// 🔴 **והאינוריאנטה:** מפתח הדלי = **היחידה** של הכסף שבתוכו. הפרמטר הרביעי
// `pnlCurrency` הוא ההצהרה של הקורא על היחידה שה-calc שהוא מסר מייצר:
// `dispCcy` ל-calc ממיר · `null` ל-calc **גולמי**, שאינו טוען דבר על יחידה
// ולכן כל נייר נשאר במטבע שלו. ⛔ אין כאן ניחוש ו⛔ אין ברירת מחדל.
// ─────────────────────────────────────────────────────────────────────────
{
  console.log("\n12 · B-144 — שני צירים: תווית-נייר מול יחידת-תצוגה");

  // יום הפער מוקדם מכל שער בכוונה: `fx.convert` הולך אחורה עד 7 ימים, ולכן
  // יום פער שיושב **אחרי** שער טוב היה נפתר בשקט והפיקסצ'ר לא היה מוכיח דבר.
  const GAP = "2026-01-05", FIX = "2026-02-10";
  const RATE = 3;
  const usd = (o) => mk({ currency: "USD", ...o, closedAt: `${o.date}T20:00:00.000Z` });

  //   AAPL  +$200  נסגר ביום שיש לו שער
  //   MSFT  +$100  נסגר ביום הפער
  const JOURNAL = [
    usd({ id: "j1", ticker: "AAPL", entry: 100, stop: 90, exit: 120, shares: 10, date: FIX }),
    usd({ id: "j2", ticker: "MSFT", entry: 100, stop: 90, exit: 110, shares: 10, date: GAP }),
  ];
  const TABLE_PARTIAL = {   // שער ל-FIX בלבד ⇒ MSFT **מסורב**
    base: "USD", quote: "ILS", spot: { rate: RATE, rateDate: FIX },
    byDay: { [FIX]: { rate: RATE, rateDate: FIX } },
  };
  const TABLE_FULL = {      // שער לשני הימים ⇒ **הכל** מומר
    base: "USD", quote: "ILS", spot: { rate: RATE, rateDate: FIX },
    byDay: { [FIX]: { rate: RATE, rateDate: FIX }, [GAP]: { rate: RATE, rateDate: GAP } },
  };
  // שורת הבאנר **בדיוק** כפי ש-`SwingEdge_App.jsx:906-908` מחשבת אותה, כולל
  // `fmt$` המיובא ⇒ האסרציה מודדת את מה שהמשתמש **רואה**, ⛔ לא שם שדה.
  const bannerLine = (s) => !s.mixedCurrency ? "(מוסתר)" : s.currencies
    .map((c) => `${fmt$(s.pnlByCurrency[c] ?? 0, c)} (${s.tradesByCurrency?.[c] ?? 0})`)
    .join("  ·  ");

  // ── 12.A · קו קפוא — calc **גולמי**. ⛔ אסור שיזוז ─────────────────────────
  {
    const s = computeTradingStats(JOURNAL, CAPITAL, calcTradeMetrics, null);
    eq("12.A · קפוא · tradesByCurrency", JSON.stringify(s.tradesByCurrency), '{"USD":2}');
    eq("12.A · קפוא · pnlByCurrency", JSON.stringify(s.pnlByCurrency), '{"USD":300}');
    eq("12.A · קפוא · mixedCurrency", s.mixedCurrency, false);
    eq("12.A · קפוא · הבאנר מוסתר", bannerLine(s), "(מוסתר)");
    eq("12.A · קפוא · ⛔ ואיש לא סורב", `${s.fxUnconvertedCount}/${s.totalTrades}`, "0/2");
  }

  // ── 12.D · קו קפוא — תצוגת USD דרך התפר (`identity`). ⛔ אסור שיזוז ────────
  {
    const s = computeTradingStats(JOURNAL, CAPITAL, makeConvertingCalc(null, "USD", "ready"), "USD");
    eq("12.D · קפוא · tradesByCurrency", JSON.stringify(s.tradesByCurrency), '{"USD":2}');
    eq("12.D · קפוא · pnlByCurrency", JSON.stringify(s.pnlByCurrency), '{"USD":300}');
    eq("12.D · קפוא · mixedCurrency", s.mixedCurrency, false);
    eq("12.D · קפוא · הבאנר מוסתר", bannerLine(s), "(מוסתר)");
    eq("12.D · קפוא · `identity` ⛔ אינו סירוב", `${s.fxUnconvertedCount}/${s.totalTrades}`, "0/2");
  }

  // ── 12.R1/R2 · מצב B — ₪, שער ליום אחד ⇒ 1 מומר + 1 מסורב ────────────────
  // 🔴 היום: `mixedCurrency === true` על יומן **2 ניירות USD**, והבאנר מדפיס
  // «$100.00 (1)» — כלומר מציג למשתמש עסקה **אחת** מתוך שתיים, ומכריז ערבוב
  // שאינו קיים ביומן שלו.
  {
    const s = computeTradingStats(JOURNAL, CAPITAL, makeConvertingCalc(TABLE_PARTIAL, "ILS", "ready"), "ILS");
    eq("12.R1 · 🔴 2 ניירות USD ⛔ אינם יומן מעורב", s.mixedCurrency, false);
    eq("12.R1 · ⇒ הבאנר **מוסתר**", bannerLine(s), "(מוסתר)");
    eq("12.R2 · 🔴 המונה מכסה את **שתי** השורות, ⛔ לא אחת",
      JSON.stringify(s.tradesByCurrency), '{"USD":2}');
    // האינוריאנטה: ₪600 בדלי ILS (הומר), $100 בדלי USD (סורב). ⛔ אין סל
    // חוצה-יחידות ו⛔ אין שורה שנעלמה.
    eq("12.R2 · הכסף לפי **יחידה**: ₪600 מומר · $100 מסורב",
      JSON.stringify(s.pnlByCurrency), '{"ILS":600,"USD":100}');
    eq("12.R2 · סך הדליים = סך המומרים+המסורבים, ⛔ אפס אובדן",
      Object.values(s.tradesByCurrency).reduce((a, b) => a + b, 0), s.totalTrades);
    // 🔴 האסרציה הנלווית (D2): הלא-מאומת/המסורב ⛔ **לא נעלם** — הוא עבר מכנה.
    eq("12.R2 · 🔴 והסירוב **מדווח** — `fxUnconvertedCount` עם מכנה",
      `${s.fxUnconvertedCount}/${s.totalTrades}`, "1/2");
  }

  // ── 12.R3 · מצב C — ₪, שער לכל יום ⇒ **הכל** מומר ────────────────────────
  // 🔴 זה המצב ש⛔ **איש לא ראה עד היום**: ההמרה **מצליחה**, ה-calc חותם
  // `currency:"ILS"` מעל התווית, `instrumentCurrency.js:182` קורא זאת כראיה
  // **נגד עצמה** (`ils_never_measured`) ⇒ שני החברים נושרים מהלולאה ⇒ פילוח
  // **ריק** `{}` ובאנר **דלוק** מעליו. הצלחה מלאה שמייצרת אזהרה ריקה.
  {
    const s = computeTradingStats(JOURNAL, CAPITAL, makeConvertingCalc(TABLE_FULL, "ILS", "ready"), "ILS");
    eq("12.R3 · 🔴 הפילוח ⛔ אינו ריק — ₪900 בדלי אחד",
      JSON.stringify(s.pnlByCurrency), '{"ILS":900}');
    eq("12.R3 · 🔴 והמונה ⛔ אינו ריק — 2 ניירות דולריים",
      JSON.stringify(s.tradesByCurrency), '{"USD":2}');
    eq("12.R3 · 🔴 ⛔ ואין באנר על יומן חד-מטבעי שהומר במלואו", s.mixedCurrency, false);
    eq("12.R3 · ⇒ הבאנר מוסתר", bannerLine(s), "(מוסתר)");
    eq("12.R3 · ⛔ ואיש לא סורב — ההמרה **הצליחה**",
      `${s.fxUnconvertedCount}/${s.totalTrades}`, "0/2");
    eq("12.R3 · הכסף שווה לסכום המצרפי — אותה אוכלוסייה בדיוק",
      s.pnlByCurrency.ILS, s.totalPnL);
  }

  // ── 12.T · שיניים — «הבאנר לעולם לא יורה» הוא כישלון בדיוק כמו הבאג ──────
  // ⚠️ בלי הבלוק הזה, מימוש שמחזיר `mixedCurrency:false` **תמיד** היה עובר
  // את 12.A · 12.D · 12.R1 · 12.R2 · 12.R3 **כולם**. זו האסרציה שמונעת
  // "תיקון" שהוא סירוב גורף.
  //
  // `instrumentCurrency:"ILA"` הוא המסלול ה**מדוד** היחיד לקוד לא-דולרי
  // מאומת (`provider_code` ⇒ `ILS · measured`).
  {
    const TEETH = [
      mk({ id: "t1", ticker: "AAPL", currency: "USD", entry: 100, stop: 90, exit: 120, shares: 10, date: FIX, closedAt: `${FIX}T20:00:00.000Z` }),
      mk({ id: "t2", ticker: "TEVA", instrumentCurrency: "ILA", entry: 100, stop: 90, exit: 110, shares: 10, date: FIX, closedAt: `${FIX}T20:00:00.000Z` }),
    ];
    const s = computeTradingStats(TEETH, CAPITAL, calcTradeMetrics, null);
    eq("12.T · 🔴 שני קודים **מאומתים** ⇒ הבאנר **נדלק**", s.mixedCurrency, true);
    eq("12.T · currencies נושא את שניהם", JSON.stringify(s.currencies), '["ILS","USD"]');
    eq("12.T · וכל דלי במטבע **שלו**", JSON.stringify(s.pnlByCurrency), '{"USD":200,"ILS":100}');
    eq("12.T · ומונה לכל אחד", JSON.stringify(s.tradesByCurrency), '{"USD":1,"ILS":1}');
    // 🔴 `B-170` בצורתה החדשה — בדיקת **ערך** על השורה הנראית, ⛔ לא regex.
    eq("12.T · 🔴 שורת הבאנר, מחושבת מ-`fmt$` כמו במסך",
      bannerLine(s), `${fmt$(100, "ILS")} (1)  ·  ${fmt$(200, "USD")} (1)`);
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
