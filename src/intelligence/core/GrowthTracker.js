// ─── GROWTH TRACKER ──────────────────────────────────────────────────────────
// A single 1..100 "trader level" score summarising discipline, risk management,
// consistency, edge utilisation and emotional control — with a monthly report.

import {
  getClosed, isWin, pnlOf, rValues, rStats, winRate, stddev, groupBy, to100,
  toPctRound, MIN_SAMPLE_R,
} from "../utils/statisticalModels.js";
import { disciplineRate } from "../utils/psychologyPatterns.js";
import { matchIdeaToEdge } from "./EdgeFinder.js";
import { deriveInstrumentCurrency, matchesCapital } from "../../lib/instrumentCurrency.js";

// Weights as specified: 30/25/20/15/10.
const WEIGHTS = {
  discipline:      0.30,
  riskManagement:  0.25,
  consistency:     0.20,
  edgeUtilization: 0.15,
  emotionalControl:0.10,
};

// ─── SUB-SCORES ──────────────────────────────────────────────────────────────
// Every sub-score returns `null` — never 50 — when its population is empty.
// A `50` used to mean "average trader" AND "we have no idea"; those are not
// the same thing, and `calculateGrowthScore` below renormalises around the
// gap instead of averaging in an invented midpoint (PLAN-B156.md §1/§4).
const disciplineScore = (trades) => {
  const dRate = disciplineRate(trades);
  return dRate == null ? null : to100(dRate);
};

// `capitalCurrency` is optional. Passing it drops trades denominated in some
// OTHER currency: risk% is riskDollars/capital, and a shekel numerator over a
// dollar denominator is not a percentage, it is an exchange rate wearing a %
// sign. Omitting it reproduces the currency-blind behaviour exactly, so a
// single-currency journal is byte-identical. Never a conversion here — this
// engine has no rate table and inventing one is the bug it is guarding against.
const riskMgmtScore = (trades, capitalCurrency = null) => {
  const closed = getClosed(trades);
  if (!closed.length) return null;
  // A trade without a stop has no measurable risk. `Math.abs(entry - null)` is
  // `entry`, so including it charged the score the FULL POSITION VALUE as risk —
  // a positive number, which the `> 0` filter below happily let through.
  // ⚠️ מטבע הנייר הנגזר, ⛔ לא התווית השמורה — ראה `measurableRisk` ב-TradeDNA.
  const measurable = closed.filter(t =>
    t.stop != null && t.shares > 0 &&
    (capitalCurrency == null || matchesCapital(deriveInstrumentCurrency(t), capitalCurrency)));
  const pcts = measurable.map(t => {
    // No capital recorded at entry → the risk % is UNMEASURED. It used to read
    // DEFAULT_CAPITAL, which turned "we don't know" into a confident 2,500 and
    // scored the trader against a number nobody ever entered.
    const capital = Number(t._capitalAtEntry);
    if (!Number.isFinite(capital) || capital <= 0) return null;
    const rd = Math.abs(t.entry - t.stop) * t.shares;
    return rd / capital;
  }).filter(p => p != null && p > 0);
  if (!pcts.length) return null;
  const avg = pcts.reduce((s, x) => s + x, 0) / pcts.length;
  // 1% target = 100; each extra % off-target burns score linearly.
  return to100(Math.max(0, 1 - Math.max(0, avg - 0.01) * 50));
};

// Threshold unified with TradeDNA's `computeScores` (PLAN-B156.md §7, decided
// 20.08): MIN_SAMPLE_R is the single, documented, centrally-imported gate.
// The extra `closed.length < 3` this used to carry had no comment justifying
// it, predates the shared constant, and made the two engines disagree on
// identical journals — dropped, not layered on top.
const consistencyScore = (trades) => {
  const closed = getClosed(trades);
  // Only the measurable population. Unmeasurable R used to enter as null and
  // read as 0 inside stddev, inventing a cluster of perfectly-consistent trades.
  const rs = rValues(closed);
  if (rs.length < MIN_SAMPLE_R) return null;
  const sd = stddev(rs);
  // Lower SD → higher consistency. SD of 3R → fully inconsistent.
  return to100(Math.max(0, 1 - Math.min(1, sd / 3)));
};

const edgeUtilizationScore = (trades, edgeReport) => {
  const closed = getClosed(trades);
  if (!closed.length || !edgeReport || !edgeReport.edges?.length) return null;
  // Threshold owned by this consumer (FIN-036). "Edge utilisation" measures
  // how often the trader actually took the pattern that works, so a trade only
  // counts when it reproduces the edge in full — a partial overlap is a
  // different trade. Same behaviour as the removed `matched` flag.
  const EDGE_MATCH_MIN = 1;
  const matched = closed.filter(t => {
    const m = matchIdeaToEdge(edgeReport, {
      setup: t.setup,
      emotionAtEntry: t.emotionAtEntry,
      marketCondition: t.marketCondition,
    });
    return m.score >= EDGE_MATCH_MIN;
  }).length;
  return to100(matched / closed.length);
};

const emotionalControlScore = (trades) => {
  const closed = getClosed(trades);
  if (!closed.length) return null;
  const fomo  = closed.filter(t => t.emotionAtEntry === "FOMO").length;
  const fear  = closed.filter(t => t.exitReason === "Fear").length;
  const share = (fomo + fear) / closed.length;
  return to100(1 - Math.min(1, share * 3));
};

// ─── MONTHLY BUCKETS ─────────────────────────────────────────────────────────
const inMonth = (iso, year, month) => {
  const d = new Date((iso || "").slice(0, 10) + "T12:00:00");
  return !isNaN(d.getTime()) && d.getFullYear() === year && d.getMonth() === month;
};

const tradesInMonth = (trades, year, month) =>
  getClosed(trades).filter(t => inMonth(t.date, year, month));

// ─── PUBLIC API ──────────────────────────────────────────────────────────────
export const calculateGrowthScore = (trades = [], edgeReport = null, capitalCurrency = null) => {
  const sub = {
    discipline:       disciplineScore(trades),
    riskManagement:   riskMgmtScore(trades, capitalCurrency),
    consistency:      consistencyScore(trades),
    edgeUtilization:  edgeUtilizationScore(trades, edgeReport),
    emotionalControl: emotionalControlScore(trades),
  };
  // Renormalised over whatever IS measured (Niv's 20.08 answer to Q1): total
  // is null iff every sub-score is null, never built from a mix of real
  // numbers and invented 50s. `measuredCount`/`totalCount` say how many of
  // the five it's actually resting on — a total that looks whole while
  // silently missing sub-scores is the same bug with the sign flipped
  // (CLAUDE.md §2, no ratio without a denominator).
  const keys = Object.keys(WEIGHTS);
  const measuredKeys = keys.filter(k => sub[k] != null);
  const measuredCount = measuredKeys.length;
  const totalCount = keys.length;
  let total = null;
  if (measuredCount) {
    const weightSum = measuredKeys.reduce((s, k) => s + WEIGHTS[k], 0);
    total = Math.round(
      measuredKeys.reduce((s, k) => s + sub[k] * WEIGHTS[k], 0) / weightSum
    );
  }
  return { total, sub, weights: WEIGHTS, measuredCount, totalCount };
};

// Compare this month vs. the previous full month. Produces the monthly report.
export const generateGrowthReport = (trades = [], edgeReport = null, now = new Date(), capitalCurrency = null) => {
  const year      = now.getFullYear();
  const month     = now.getMonth();
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear  = month === 0 ? year - 1 : year;

  const thisTrades = tradesInMonth(trades, year, month);
  const prevTrades = tradesInMonth(trades, prevYear, prevMonth);

  const current  = calculateGrowthScore(trades, edgeReport, capitalCurrency);
  const previous = calculateGrowthScore(
    getClosed(trades).filter(t => !inMonth(t.date, year, month)),
    edgeReport, capitalCurrency
  );
  // null when either side has nothing measured — "current 60, previous
  // unmeasured" is not a delta of 60, it's an unanswerable comparison.
  const delta = (current.total == null || previous.total == null)
    ? null : current.total - previous.total;

  // Top 3 improvements & weak spots, derived from sub-scores. Only sub-scores
  // that are actually measured THIS period can be ranked — a null score has
  // no position to report, and `previous.sub[k] ?? 50` used to hand an
  // unmeasured prior period a fabricated midpoint.
  const ranked = Object.entries(current.sub)
    .filter(([, v]) => v != null)
    .map(([k, v]) => ({ key: k, score: v, prev: previous.sub[k] ?? null }))
    .sort((a, b) => b.score - a.score);

  const top3Strengths = ranked.slice(0, 3);
  const top3Weaknesses = [...ranked].sort((a, b) => a.score - b.score).slice(0, 3);

  // Concrete month stats, so the trader has context beyond the abstract score.
  const { avg: monthAvgR, n: monthRSample } = rStats(thisTrades);
  const stats = {
    closedTrades: thisTrades.length,
    // null when the month is empty — a month you sat out has no win rate, and
    // `closedTrades` above is its denominator (A5 · §2).
    winRate:      toPctRound(winRate(thisTrades)),
    avgR:         monthAvgR == null ? null : Number(monthAvgR.toFixed(2)),
    rSampleSize:  monthRSample,
    netPnl:       Math.round(thisTrades.reduce((s, t) => s + pnlOf(t), 0)),
  };

  // Auto-target: next-month aim is +5 on the overall score, capped at 100.
  // null when current.total itself is unmeasured — there is nothing to aim
  // +5 above, and Math.min(100, null + 5) used to silently coerce to 5.
  const nextTarget = current.total == null ? null : Math.min(100, current.total + 5);

  return {
    current,
    previous,
    delta,
    top3Strengths,
    top3Weaknesses,
    stats,
    nextTarget,
    period: {
      thisMonth: { year, month, trades: thisTrades.length },
      prevMonth: { year: prevYear, month: prevMonth, trades: prevTrades.length },
    },
  };
};

// Evolution chart: monthly growth score for the last N months.
export const dnaEvolutionSeries = (trades = [], edgeReport = null, months = 6, capitalCurrency = null) => {
  const out = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const upTo = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).getTime();
    const histSlice = getClosed(trades).filter(t => {
      const ts = new Date((t.date || "") + "T12:00:00").getTime();
      return !isNaN(ts) && ts <= upTo;
    });
    // A month with nothing closed yet (or an empty journal, all 6 months)
    // has no growth score to plot — skip it rather than push a phantom point
    // whose `score` used to default to 50 (now null). An empty journal must
    // come back as an empty series, not 6 flat-line months (PLAN-B156.md §3).
    if (!histSlice.length) continue;
    const s = calculateGrowthScore(histSlice, edgeReport, capitalCurrency);
    out.push({
      label: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      score: s.total,
      ...s.sub,
    });
  }
  return out;
};
