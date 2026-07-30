// ─── STATISTICAL MODELS ──────────────────────────────────────────────────────
// Pure math helpers used across the intelligence engines. No React, no I/O.

import { calcTradeMetrics } from "../../utils.js";

export const MIN_SAMPLE_EDGE = 5;       // minimum trades before a pattern is "significant"
export const MIN_SAMPLE_DNA = 10;        // basic DNA insight threshold
export const MIN_SAMPLE_PATTERNS = 50;   // pattern recognition threshold
export const MIN_SAMPLE_FORECAST = 100;  // predictive forecasting threshold
export const MIN_SAMPLE_ML = 500;        // ML-grade modeling threshold
export const MIN_SAMPLE_R = 2;           // below this there is no dispersion to measure

// ─── BASIC DESCRIPTIVES ──────────────────────────────────────────────────────
export const mean = (xs) => xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;

export const stddev = (xs) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
};

export const median = (xs) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

export const percentile = (xs, p) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const idx = Math.max(0, Math.min(s.length - 1, Math.round((p / 100) * (s.length - 1))));
  return s[idx];
};

// ─── TRADE-SPECIFIC AGGREGATIONS ─────────────────────────────────────────────
export const getClosed = (trades) => (trades || []).filter(t => t && t.status === "CLOSED" && t.exit != null);

export const pnlOf = (t) => calcTradeMetrics(t).pnl || 0;
export const isWin = (t) => pnlOf(t) > 0;

// ─── THE R CONTRACT ───────────────────────────────────────────────────────────
// `rMultiple` is null whenever R is not measurable (no exit, no stop, or
// stop === entry). A trade without a stop did not do 0R — it cannot be
// expressed in R at all. Coercing that null to 0 keeps the trade in the
// denominator while contributing nothing to the numerator, which silently
// drags every R-based metric toward zero.
//
// Rule: a value that leaves the numerator leaves the denominator too, and any
// metric derived from R reports the sample size it actually rests on.
export const rOf = (t) => calcTradeMetrics(t).rMultiple;   // number | null

// The only population in which R can be measured. Number.isFinite rejects
// null, NaN and Infinity in one pass.
export const rValues = (trades) => (trades || []).map(rOf).filter(Number.isFinite);

// Single source of truth for every R-based figure: the value and the sample
// size it was computed over, always travelling together.
export const rStats = (trades) => {
  const values = rValues(trades);
  return { avg: values.length ? mean(values) : null, n: values.length, values };
};

export const rSampleSize = (trades) => rValues(trades).length;

// ─── THE THREE-OUTCOME RULE ───────────────────────────────────────────────────
// A closed trade ends in exactly one of three states: profit, loss, or flat.
// Break-even is a real outcome, not a rounding artefact, and it is NOT a loss —
// `isWin` is `pnl > 0`, so a `!isWin` split sweeps every BE trade into the
// losses and biases every downstream rate, expectancy and Kelly figure.
//
// This is the single definition of that split. `pnlFn` lets a caller that has
// already computed P&L (e.g. lib/tradingStats.js, which enriches its trades
// once up front) reuse those values instead of recomputing calcTradeMetrics —
// same rule, no second arithmetic path.
//
// No `|| []` guard: passing a non-array is a caller bug and must throw, exactly
// as it does today, rather than quietly reporting an empty population.
export const outcomeSplit = (items, pnlFn = pnlOf) => {
  const wins = [], losses = [], be = [];
  for (const it of items) {
    const p = pnlFn(it);
    if (p > 0) wins.push(it);
    else if (p < 0) losses.push(it);
    else be.push(it);
  }
  return { n: items.length, wins, losses, be };
};

// ─── SCALE CONVENTION ─────────────────────────────────────────────────────────
// All win-rate functions in this module return a fraction (0..1).
// Intelligence modules (MonthlyReport, EdgeFinder, AntiEdgeLock) convert to
// 0-100 at their public output boundary before returning to App code.
//
// The three rates sum to exactly 1 whenever n > 0 — that is the point of
// reporting `beRate` at all. A consumer that shows only win/loss is showing a
// pair that does not add up, and the missing slice is invisible.
// Carries the three populations alongside the three rates, under the same names
// `rPopulations` uses, so a caller never has to re-split to get at the members.
export const outcomeRates = (items, pnlFn = pnlOf) => {
  const { n, wins, losses, be } = outcomeSplit(items, pnlFn);
  if (!n) return { winRate: 0, lossRate: 0, beRate: 0, wins, losses, be, n: 0 };
  return {
    winRate:  wins.length / n,
    lossRate: losses.length / n,
    beRate:   be.length / n,
    wins, losses, be, n,
  };
};

export const winRate = (trades) => outcomeRates(trades).winRate;

// number | null — null means "not measurable", which is not the same as 0.
export const avgR = (trades) => rStats(trades).avg;

export const avgPnl = (trades) => mean(trades.map(pnlOf));

// The R-measurable population, split by the same three-outcome rule above.
// Exported (T3 · decision 5): lib/tradingStats.js imports its shared primitives
// from here rather than keeping a parallel copy of the same definitions.
export const rPopulations = (trades) => {
  const measurable = (trades || []).filter(t => Number.isFinite(rOf(t)));
  const { wins, losses, be } = outcomeSplit(measurable);
  return { measurable, wins, losses, be };
};

// Exposed so the weighting can be asserted directly: the three must sum to 1.
export const expectancyWeights = (trades) => {
  const { measurable, wins, losses, be } = rPopulations(trades);
  const n = measurable.length;
  if (!n) return { win: 0, loss: 0, be: 0, n: 0 };
  return { win: wins.length / n, loss: losses.length / n, be: be.length / n, n };
};

// Expected value per trade, in R units. Break-even trades stay in the
// denominator — they are real outcomes — but contribute 0R to the numerator.
export const expectedValueR = (trades) => {
  const { measurable, wins, losses, be } = rPopulations(trades);
  const n = measurable.length;
  if (!n) return null;
  return (wins.length / n)   * (wins.length   ? mean(wins.map(rOf))   : 0)
       + (losses.length / n) * (losses.length ? mean(losses.map(rOf)) : 0)
       + (be.length / n)     * 0;
};

// ─── PROFIT FACTOR — ONE ARITHMETIC PATH (FIN-005) ────────────────────────────
// Gross wins and |gross losses| from a P&L series, in one accumulation pass.
// Everything that reports a profit factor — the dashboard hub, every breakdown
// group, TradeDNA — goes through the two functions below, so the three former
// copies of this formula can no longer drift apart.
export const grossPnl = (pnls) => {
  let grossWin = 0, grossLoss = 0;
  for (const p of pnls) {
    if (p > 0) grossWin += p;
    else grossLoss += Math.abs(p);
  }
  return { grossWin, grossLoss };
};

// `Infinity` is a DECLARED sentinel for "wins with no losses to divide by", and
// it must stay Infinity. It is deliberately not `null`: `Number(null) === 0`, so
// `isFinite(null)` is `true` — a null here would sail straight through the
// `isFinite(...)` guard every consumer already has and then throw on
// `.toFixed(2)`, turning a readable "∞" into a blank screen.
export const profitFactorFromPnls = (pnls) => {
  const { grossWin, grossLoss } = grossPnl(pnls);
  if (grossLoss === 0) return grossWin > 0 ? Infinity : 0;
  return grossWin / grossLoss;
};

export const profitFactor = (trades) => profitFactorFromPnls(trades.map(pnlOf));

// Sharpe-like ratio on per-trade R outcomes. Returns null rather than 0 when
// there is nothing to measure: `stddev` yields 0 for n < 2, and a Sharpe of
// "0" reads as a measurement of no edge instead of an absence of data.
export const sharpeR = (trades) => {
  const rs = rValues(trades);
  if (rs.length < MIN_SAMPLE_R) return null;
  const sd = stddev(rs);
  return sd > 0 ? mean(rs) / sd : null;
};

// Max drawdown from an equity sequence (array of equity values or R cumsum).
// Returns a FRACTION (0..1), per this module's scale convention. The name says
// so (T3 · decision 4): `tradingStats.maxDrawdown` is a percent and is a
// different number entirely — two identically-named exports on different scales
// is how a 6.6% drawdown gets rendered as 660%.
export const maxDrawdownFraction = (equitySeq) => {
  let peak = -Infinity, maxDD = 0;
  for (const v of equitySeq) {
    if (v > peak) peak = v;
    const dd = peak > 0 ? (peak - v) / Math.abs(peak) : 0;
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD;
};

// ─── STATISTICAL SIGNIFICANCE ────────────────────────────────────────────────
// Wilson score lower bound for a win-rate proportion. Conservative estimate,
// used to rank patterns so we don't celebrate noise.
export const wilsonLowerBound = (wins, n, z = 1.96) => {
  if (!n) return 0;
  const phat = wins / n;
  const denom = 1 + (z * z) / n;
  const center = phat + (z * z) / (2 * n);
  const margin = z * Math.sqrt((phat * (1 - phat) + (z * z) / (4 * n)) / n);
  return Math.max(0, (center - margin) / denom);
};

// A pattern is "significant" when we have enough trades and its Wilson-lower
// win rate clearly beats the baseline.
export const isSignificant = (wins, n, baseline = 0.5) => {
  if (n < MIN_SAMPLE_EDGE) return false;
  return wilsonLowerBound(wins, n) > baseline;
};

// ─── CANONICAL EDGE DEFINITION ───────────────────────────────────────────────
// Single source of truth for "edge" across Dashboard, Lessons, and Monthly
// Report. Wilson-lower-bound on win rate × expectancy signal — discounts small
// samples so a fluke "100% across 3" never outranks a proven setup.
export const edgeScore = (wins, n, avgRVal = 0) =>
  wilsonLowerBound(wins, n) * (1 + Math.max(0, avgRVal));

// Rank closed trades by setup using the canonical edge metric.
// Period is the caller's responsibility (pass month-filtered or all-time trades).
export const rankSetupEdges = (trades, { minSample = MIN_SAMPLE_EDGE } = {}) => {
  const bySetup = new Map();
  for (const t of getClosed(trades)) {
    const s = t.setup;
    if (!s) continue;
    if (!bySetup.has(s)) bySetup.set(s, []);
    bySetup.get(s).push(t);
  }
  const ranked = [];
  for (const [setup, list] of bySetup) {
    const n = list.length;
    if (n < minSample) continue;
    const wins = list.filter(isWin).length;
    const { avg: aR, n: rN } = rStats(list);
    ranked.push({
      setup, n, wins,
      winRate: Math.round((wins / n) * 100),
      avgR: aR == null ? null : Number(aR.toFixed(2)),
      rSampleSize: rN,
      // `?? 0` here is a declared neutral for a ranking score, not a coerced
      // measurement: a setup with no measurable R ranks on Wilson alone.
      score: edgeScore(wins, n, aR ?? 0),
    });
  }
  return ranked.sort((a, b) => b.score - a.score || (b.avgR ?? 0) - (a.avgR ?? 0));
};

// Streaks — longest consecutive wins and losses (chronological order expected).
export const streaks = (trades) => {
  let curW = 0, curL = 0, bestW = 0, bestL = 0;
  for (const t of trades) {
    if (pnlOf(t) === 0) continue;
    if (isWin(t)) { curW++; bestW = Math.max(bestW, curW); curL = 0; }
    else          { curL++; bestL = Math.max(bestL, curL); curW = 0; }
  }
  return { currentWin: curW, currentLoss: curL, bestWin: bestW, bestLoss: bestL };
};

// Kelly fraction from win rate and average win/loss R-multiples.
// Needs both a win and a loss population to be defined at all — null, not 0,
// when either is missing. Break-even trades stay in the denominator.
export const kellyFraction = (trades) => {
  const { measurable, wins, losses } = rPopulations(trades);
  if (!wins.length || !losses.length) return null;
  const wr = wins.length / measurable.length;
  const b = Math.abs(mean(losses.map(rOf)));
  const w = mean(wins.map(rOf));
  if (b <= 0 || w <= 0) return null;
  return Math.max(0, Math.min(1, wr - (1 - wr) * (b / w)));
};

// ─── GROUPING HELPERS ────────────────────────────────────────────────────────
export const groupBy = (trades, keyFn) => {
  const out = {};
  for (const t of trades) {
    const k = keyFn(t);
    if (k == null) continue;
    if (!out[k]) out[k] = [];
    out[k].push(t);
  }
  return out;
};

// Day-of-week / hour extraction from ISO date (or createdAt).
export const dayOfWeek = (trade) => {
  const ts = trade.createdAt || (trade.date ? trade.date + "T12:00:00" : null);
  if (!ts) return null;
  const d = new Date(ts);
  if (isNaN(d.getTime())) return null;
  return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()];
};

// ─── DISPLAY-ONLY day label ──────────────────────────────────────────────────
// Translates a day name to Hebrew short form for rendering. Accepts BOTH the
// short ("Sun") and full ("Sunday") English forms. NEVER use the result as a
// key or lookup — statistical grouping must keep running on the English value.
const HE_DAY_SHORT = { Sun:"א׳", Mon:"ב׳", Tue:"ג׳", Wed:"ד׳", Thu:"ה׳", Fri:"ו׳", Sat:"ש׳" };
export const dayLabel = (day, lang = "en") => {
  if (lang !== "he" || day == null) return day;
  return HE_DAY_SHORT[String(day).slice(0, 3)] || day;
};

export const hourOfDay = (trade) => {
  const ts = trade.createdAt;
  if (!ts) return null;
  const d = new Date(ts);
  if (isNaN(d.getTime())) return null;
  return d.getHours();
};

// Bucket R/R ratio into coarse bands.
export const rrBucket = (t) => {
  if (!t.target || !t.entry || !t.stop) return null;
  const risk = Math.abs(t.entry - t.stop);
  const reward = Math.abs(t.target - t.entry);
  if (risk <= 0) return null;
  const rr = reward / risk;
  if (rr < 1) return "<1";
  if (rr < 2) return "1-2";
  if (rr < 3) return "2-3";
  return "3+";
};

// Normalise a 0..1 value into a 0..100 score rounded.
export const to100 = (x) => Math.round(Math.max(0, Math.min(1, x)) * 100);
