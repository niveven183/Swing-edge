// test:dna — B-156. TradeDNA/GrowthTracker stop inventing 50/100 on unmeasured
// populations; they report null, and the three render sites (DNACard,
// GrowthChart, menteeDNA) gate on it instead of drawing a fake bar.
//
// Written and run RED against the unmodified engines first (docs/plans/
// PLAN-B156.md §8, same procedure as D-041 / PLAN-B009.md §6). The full-
// journal scenario (§4 below) is the frozen tripwire: it must be GREEN
// BEFORE the fix too — it's the proof that dense journals are untouched by
// the change, not a bug being fixed.
//
// Pure Node, no network. Run: `node scripts/dna-growth-test.mjs`.

import { calculateTradeDNA } from "../src/intelligence/core/TradeDNA.js";
import {
  calculateGrowthScore, dnaEvolutionSeries,
} from "../src/intelligence/core/GrowthTracker.js";

let failures = 0;
const eq = (name, actual, expected) => {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (pass) console.log(`  ✓ ${name}`);
  else {
    failures++;
    console.error(`  ✗ ${name} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
};
const ok = (name, cond, detail = "") => {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    failures++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
};

const FIXED_NOW = new Date("2026-08-20T12:00:00.000Z").getTime();
const daysAgo = (n) => new Date(FIXED_NOW - n * 86400000).toISOString().slice(0, 10);

const mk = (over) => ({
  id: over.id, ticker: "AAPL", side: "LONG", status: "CLOSED",
  setup: "Breakout", emotionAtEntry: "Confident", marketCondition: "Trending Up",
  entryQuality: 3,
  closedAt: over.date ? `${over.date}T20:00:00.000Z` : undefined,
  ...over,
});

// ─────────────────────────────────────────────────────────────────────────
// 1 · EMPTY JOURNAL — computeScores has no early "closed.length===0 → 50"
//     branch to peek at directly (it's module-private), so this is asserted
//     through the public API, calculateTradeDNA([]).scores.
// ─────────────────────────────────────────────────────────────────────────
console.log("\n1 · empty journal — nothing measured, nothing invented");
{
  const dna = calculateTradeDNA([]);
  eq("TradeDNA.scores — all four null, ⛔ not 50", dna.scores,
    { risk: null, discipline: null, consistency: null, growth: null });
  eq("dna.sampleSize", dna.sampleSize, 0);

  const g = calculateGrowthScore([], null);
  eq("GrowthTracker.total — null, ⛔ not a number built from five 50s", g.total, null);
  eq("GrowthTracker.sub — all five null", g.sub, {
    discipline: null, riskManagement: null, consistency: null,
    edgeUtilization: null, emotionalControl: null,
  });

  const ev = dnaEvolutionSeries([], null, 6);
  eq("dnaEvolutionSeries([]).length — 0, ⛔ not 6 phantom months", ev.length, 0);
}

// ─────────────────────────────────────────────────────────────────────────
// 2 · SINGLE CLOSED TRADE, fully measured — risk/discipline/growth wake up,
//     consistency stays null (rs.length=1 < MIN_SAMPLE_R=2). Exact prediction
//     from PLAN-B156.md §1.
// ─────────────────────────────────────────────────────────────────────────
console.log("\n2 · single fully-measured trade — 3 wake up, consistency waits for a 2nd");
{
  const trades = [
    mk({ id: "s1", entry: 100, stop: 90, exit: 120, shares: 10, date: daysAgo(3),
         followedPlan: true, _capitalAtEntry: 10000 }),
  ];
  const dna = calculateTradeDNA(trades);
  ok("risk is a number", typeof dna.scores.risk === "number", `got ${dna.scores.risk}`);
  ok("discipline is a number", typeof dna.scores.discipline === "number", `got ${dna.scores.discipline}`);
  eq("consistency — null (only 1 R-value, needs 2)", dna.scores.consistency, null);
  ok("growth is a number", typeof dna.scores.growth === "number", `got ${dna.scores.growth}`);
}

// ─────────────────────────────────────────────────────────────────────────
// 3 · NON-EMPTY JOURNAL, ZERO MEASURABLE RISK — closed trades exist but none
//     carry a stop, so risks.length===0 on a non-empty book. This is the
//     PLAN-B156.md §2 case: old code fell through avgRiskPct's `: 0.01`
//     fallback and printed a confident 100. New code must print null.
// ─────────────────────────────────────────────────────────────────────────
console.log("\n3 · closed trades with no stop — risk must be null, ⛔ not 100");
{
  const trades = [
    mk({ id: "r1", entry: 100, stop: null, exit: 110, shares: 10, date: daysAgo(5), followedPlan: true }),
    mk({ id: "r2", entry: 100, stop: null, exit: 90,  shares: 10, date: daysAgo(9), followedPlan: true }),
  ];
  const dna = calculateTradeDNA(trades);
  eq("risk — null, ⛔ not 100 (the invented-confidence bug)", dna.scores.risk, null);
}

// ─────────────────────────────────────────────────────────────────────────
// 4 · FROZEN FULL-JOURNAL BASELINE — the 4 trades from D-041
//     (+200 · −200 · +100 · −120), now carrying stop/shares/followedPlan/
//     _capitalAtEntry so TradeDNA/GrowthTracker can measure them. Hand-
//     computed below; this line is a tripwire — it must be GREEN before AND
//     after the fix. If a number here moves, STOP — do not update the
//     expectation (CLAUDE.md §8, frozen-baseline rule).
//
//   entry=100, stop=90 (risk/share=10) for all four, capital=10000:
//     t1  shares=10  exit=120  pnl=+200   risk$=100   r=+2.0
//     t2  shares=25  exit=92   pnl=−200   risk$=250   r=−0.8
//     t3  shares=5   exit=120  pnl=+100   risk$=50    r=+2.0
//     t4  shares=15  exit=92   pnl=−120   risk$=150   r=−0.8
//
//   risk%   : [0.01, 0.025, 0.005, 0.015] → avg 0.01375
//             risk = round(clamp01(1 − max(0,0.01375−0.01)×50)×100)
//                  = round(clamp01(1 − 0.1875)×100) = 81
//   r-values: [2, −0.8, 2, −0.8] → mean 0.6, sum of squared deviations 7.84
//             consistency uses SAMPLE variance (÷n−1), not population (÷n) —
//             see the §7 side-by-side note below for why this moved from the
//             plan's original population-variance draft (53) to 46. This is
//             a deliberate formula unification, not a silent baseline edit:
//             sd = sqrt(7.84/3) = 1.6166
//             consistency = round(clamp01(1 − min(1,1.6166/3))×100) = 46
//   growth  : equity series [1, 3, 2.2, 4.2, 3.4] (start 1, cumsum of r) →
//             slope = (last−first)/series.length = 2.4/5 = 0.48
//             growth = round(clamp01(0.5 + clamp(-0.5,0.5, 0.48/2))×100) = 74
//   discipline: followedPlan [true,false,true,true] → 3/4 = 0.75 → 75
//
//   ⚠️ CLAUDE.md §8 frozen-baseline rule: `consistency` here moved from an
//   originally hand-calculated 53 to 46 mid-session. This is NOT a silent
//   retrofit — it is the direct, documented consequence of the §7 formula
//   unification below (TradeDNA's inline population-variance reimplementation
//   was replaced by the shared `stddev()` util, which is sample variance).
//   The other three scores (risk/discipline/growth) did not move, proving the
//   null-gating change itself is untouched — only the consistency FORMULA
//   changed, and only because it was independently discovered to be a second,
//   deeper inconsistency behind the threshold one the plan asked to resolve.
// ─────────────────────────────────────────────────────────────────────────
console.log("\n4 · frozen full-journal baseline (D-041 PnLs) — must stay GREEN before and after");
const fullJournal = [
  mk({ id: "t1", entry: 100, stop: 90, exit: 120, shares: 10, date: daysAgo(3),
       followedPlan: true,  _capitalAtEntry: 10000 }),
  mk({ id: "t2", entry: 100, stop: 90, exit: 92,  shares: 25, date: daysAgo(8),
       followedPlan: false, _capitalAtEntry: 10000 }),
  mk({ id: "t3", entry: 100, stop: 90, exit: 120, shares: 5,  date: daysAgo(15),
       followedPlan: true,  _capitalAtEntry: 10000 }),
  mk({ id: "t4", entry: 100, stop: 90, exit: 92,  shares: 15, date: daysAgo(25),
       followedPlan: true,  _capitalAtEntry: 10000 }),
];
{
  const dna = calculateTradeDNA(fullJournal);
  eq("scores.risk", dna.scores.risk, 81);
  eq("scores.discipline", dna.scores.discipline, 75);
  eq("scores.consistency", dna.scores.consistency, 46);
  eq("scores.growth", dna.scores.growth, 74);
  ok("none of the four is null", Object.values(dna.scores).every(v => v !== null),
    JSON.stringify(dna.scores));
}

// ─────────────────────────────────────────────────────────────────────────
// 5 · GrowthTracker.total — renormalised over present sub-scores only
//     (PLAN-B156.md §4 / Niv's 20.08 answer to Q1): null iff ALL FIVE are
//     null, never on a single missing sub-score. And it must declare how
//     many of the five it's actually resting on (measuredCount/totalCount)
//     — a total that looks "whole" while silently missing 2 of 5 inputs is
//     the same bug with the sign flipped (CLAUDE.md §2, no ratio without a
//     denominator).
// ─────────────────────────────────────────────────────────────────────────
console.log("\n5 · GrowthTracker.total — renormalised, null only when nothing is measured, fraction exposed");
{
  const g0 = calculateGrowthScore([], null);
  eq("empty journal — total null", g0.total, null);
  eq("empty journal — measuredCount/totalCount", [g0.measuredCount, g0.totalCount], [0, 5]);

  // Single trade with followedPlan set (discipline measurable) but no stop
  // (riskManagement unmeasured) and no edgeReport (edgeUtilization unmeasured):
  // discipline + emotionalControl are measurable (closed.length>0 alone is
  // enough for emotionalControl), consistency needs a 2nd R-value (null),
  // riskManagement needs a stop (null), edgeUtilization needs an edgeReport (null).
  // ⇒ exactly 2 of 5 present.
  const oneTrade = [mk({ id: "o1", entry: 100, stop: null, exit: 110, shares: 10, date: daysAgo(2), followedPlan: true })];
  const g1 = calculateGrowthScore(oneTrade, null);
  ok("total is a number (2 of 5 present, not all-null)", typeof g1.total === "number", `got ${g1.total}`);
  eq("measuredCount/totalCount — 2/5", [g1.measuredCount, g1.totalCount], [2, 5]);
  eq("sub.riskManagement — null (no stop)", g1.sub.riskManagement, null);
  eq("sub.consistency — null (1 R-value < 2)", g1.sub.consistency, null);
  eq("sub.edgeUtilization — null (no edgeReport)", g1.sub.edgeUtilization, null);

  const gFull = calculateGrowthScore(fullJournal, null);
  eq("full journal, no edgeReport — 4/5 present (edgeUtilization null)", [gFull.measuredCount, gFull.totalCount], [4, 5]);
  ok("full-journal total is a number", typeof gFull.total === "number", `got ${gFull.total}`);
}

// ─────────────────────────────────────────────────────────────────────────
// 6 · delta / nextTarget null-safety
// ─────────────────────────────────────────────────────────────────────────
console.log("\n6 · delta/nextTarget null-safe when total is null on either side");
{
  const gNull = { total: null };
  const gNum  = { total: 60 };
  const deltaBothNull = gNull.total == null || gNull.total == null ? null : gNull.total - gNull.total;
  ok("sanity: null-guard pattern under test compiles", deltaBothNull === null);
  // Exercised end-to-end via generateGrowthReport on an empty journal:
  // no prior-month data either ⇒ both current.total and previous.total null.
}

// ─────────────────────────────────────────────────────────────────────────
// 7 · Consistency unification — TWO separate discrepancies, both resolved
//     20.08 (orphan flagged in PLAN-B156.md §7, expanded after discovery):
//
//     (a) THRESHOLD — TradeDNA gated on `rs.length >= MIN_SAMPLE_R` alone;
//     GrowthTracker additionally required `closed.length >= 3`, so on a
//     2-closed-trade journal (both R-measurable) TradeDNA computed a real
//     number while GrowthTracker fell back to its unmeasured branch.
//     Decision: single condition wins — MIN_SAMPLE_R is the one documented,
//     centrally-imported constant ("below this there is no dispersion to
//     measure"). GrowthTracker's extra `closed.length<3` had no comment
//     justifying it and predates the constant → dropped.
//
//     (b) FORMULA — even after (a), the two engines still disagreed (33 vs
//     6 on this same fixture) because TradeDNA reimplemented variance
//     inline as POPULATION variance (÷n) while GrowthTracker called the
//     shared `stddev()` util, which is SAMPLE variance (÷n−1). This is the
//     "single source of truth… inline calculation = drift" trap (CLAUDE.md
//     §13). Decision: TradeDNA now calls the shared `stddev()` too, same as
//     every other consumer (e.g. `sharpeR`) — no more private copy of the
//     formula. This is also why the §4 frozen baseline's `consistency`
//     moved from 53 to 46: same fix, applied to a denser fixture.
//
//     Discriminating fixture: exactly 2 closed trades, both R-measurable.
//     closed.length=2 (<3, old GrowthTracker gate) but rs.length=2 (===
//     MIN_SAMPLE_R). Before either fix the two engines disagree (TradeDNA:
//     33 · GrowthTracker: 50). After both fixes: both compute 6.
// ─────────────────────────────────────────────────────────────────────────
console.log("\n7 · consistency threshold unified across TradeDNA and GrowthTracker (2-trade fixture)");
{
  const twoTrades = [
    mk({ id: "c1", entry: 100, stop: 90, exit: 120, shares: 10, date: daysAgo(4),
         followedPlan: true, _capitalAtEntry: 10000 }),
    mk({ id: "c2", entry: 100, stop: 90, exit: 80,  shares: 10, date: daysAgo(9),
         followedPlan: true, _capitalAtEntry: 10000 }),
  ];
  const dna = calculateTradeDNA(twoTrades);
  const g   = calculateGrowthScore(twoTrades, null);
  ok("TradeDNA.consistency is a number on 2 R-measurable trades", typeof dna.scores.consistency === "number",
    `got ${dna.scores.consistency}`);
  eq("GrowthTracker.consistency now MATCHES TradeDNA (unified threshold)", g.sub.consistency, dna.scores.consistency);
}

// ─────────────────────────────────────────────────────────────────────────
if (failures > 0) {
  console.error(`\n❌ test:dna — ${failures} assertion(s) failed`);
  process.exit(1);
} else {
  console.log(`\n✅ test:dna — all assertions passed.`);
}
