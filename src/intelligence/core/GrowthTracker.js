// ─── GROWTH TRACKER ──────────────────────────────────────────────────────────
// A single 1..100 "trader level" score summarising discipline, risk management,
// consistency, edge utilisation and emotional control — with a monthly report.

import {
  getClosed, isWin, pnlOf, rOf, avgR, winRate, stddev, groupBy, to100,
} from "../utils/statisticalModels.js";
import { disciplineRate } from "../utils/psychologyPatterns.js";
import { matchIdeaToEdge } from "./EdgeFinder.js";

// Weights as specified: 30/25/20/15/10.
const WEIGHTS = {
  discipline:      0.30,
  riskManagement:  0.25,
  consistency:     0.20,
  edgeUtilization: 0.15,
  emotionalControl:0.10,
};

// ─── SUB-SCORES ──────────────────────────────────────────────────────────────
const disciplineScore = (trades) => {
  const dRate = disciplineRate(trades);
  return dRate == null ? 50 : to100(dRate);
};

const riskMgmtScore = (trades, capitalAtEntryDefault = 25000) => {
  const closed = getClosed(trades);
  if (!closed.length) return 50;
  const pcts = closed.map(t => {
    const capital = t._capitalAtEntry || capitalAtEntryDefault;
    const rd = Math.abs(t.entry - t.stop) * t.shares;
    return capital > 0 ? rd / capital : 0;
  }).filter(p => p > 0);
  if (!pcts.length) return 50;
  const avg = pcts.reduce((s, x) => s + x, 0) / pcts.length;
  // 1% target = 100; each extra % off-target burns score linearly.
  return to100(Math.max(0, 1 - Math.max(0, avg - 0.01) * 50));
};

const consistencyScore = (trades) => {
  const closed = getClosed(trades);
  if (closed.length < 3) return 50;
  const rs = closed.map(rOf);
  const sd = stddev(rs);
  // Lower SD → higher consistency. SD of 3R → fully inconsistent.
  return to100(Math.max(0, 1 - Math.min(1, sd / 3)));
};

const edgeUtilizationScore = (trades, edgeReport) => {
  const closed = getClosed(trades);
  if (!closed.length || !edgeReport || !edgeReport.edges?.length) return 50;
  const matched = closed.filter(t => {
    const m = matchIdeaToEdge(edgeReport, {
      setup: t.setup,
      emotionAtEntry: t.emotionAtEntry,
      marketCondition: t.marketCondition,
    });
    return m.matched;
  }).length;
  return to100(matched / closed.length);
};

const emotionalControlScore = (trades) => {
  const closed = getClosed(trades);
  if (!closed.length) return 50;
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
export const calculateGrowthScore = (trades = [], edgeReport = null) => {
  const sub = {
    discipline:       disciplineScore(trades),
    riskManagement:   riskMgmtScore(trades),
    consistency:      consistencyScore(trades),
    edgeUtilization:  edgeUtilizationScore(trades, edgeReport),
    emotionalControl: emotionalControlScore(trades),
  };
  const total = Math.round(
    sub.discipline       * WEIGHTS.discipline +
    sub.riskManagement   * WEIGHTS.riskManagement +
    sub.consistency      * WEIGHTS.consistency +
    sub.edgeUtilization  * WEIGHTS.edgeUtilization +
    sub.emotionalControl * WEIGHTS.emotionalControl
  );
  return { total, sub, weights: WEIGHTS };
};

// Compare this month vs. the previous full month. Produces the monthly report.
export const generateGrowthReport = (trades = [], edgeReport = null, now = new Date()) => {
  const year      = now.getFullYear();
  const month     = now.getMonth();
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear  = month === 0 ? year - 1 : year;

  const thisTrades = tradesInMonth(trades, year, month);
  const prevTrades = tradesInMonth(trades, prevYear, prevMonth);

  const current  = calculateGrowthScore(trades, edgeReport);
  const previous = calculateGrowthScore(
    getClosed(trades).filter(t => !inMonth(t.date, year, month)),
    edgeReport
  );
  const delta = current.total - previous.total;

  // Top 3 improvements & weak spots, derived from sub-scores.
  const ranked = Object.entries(current.sub)
    .map(([k, v]) => ({ key: k, score: v, prev: previous.sub[k] ?? 50 }))
    .sort((a, b) => b.score - a.score);

  const top3Strengths = ranked.slice(0, 3);
  const top3Weaknesses = [...ranked].sort((a, b) => a.score - b.score).slice(0, 3);

  // Concrete month stats, so the trader has context beyond the abstract score.
  const stats = {
    closedTrades: thisTrades.length,
    winRate:      Math.round(winRate(thisTrades) * 100),
    avgR:         Number(avgR(thisTrades).toFixed(2)),
    netPnl:       Math.round(thisTrades.reduce((s, t) => s + pnlOf(t), 0)),
  };

  // Auto-target: next-month aim is +5 on the overall score, capped at 100.
  const nextTarget = Math.min(100, current.total + 5);

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
export const dnaEvolutionSeries = (trades = [], edgeReport = null, months = 6) => {
  const out = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const upTo = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).getTime();
    const histSlice = getClosed(trades).filter(t => {
      const ts = new Date((t.date || "") + "T12:00:00").getTime();
      return !isNaN(ts) && ts <= upTo;
    });
    const s = calculateGrowthScore(histSlice, edgeReport);
    out.push({
      label: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      score: s.total,
      ...s.sub,
    });
  }
  return out;
};
