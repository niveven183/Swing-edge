// ─── STATISTICAL MODELS ──────────────────────────────────────────────────────
// Pure math helpers used across the intelligence engines. No React, no I/O.

import { calcTradeMetrics } from "../../utils.js";

export const MIN_SAMPLE_EDGE = 5;       // minimum trades before a pattern is "significant"
export const MIN_SAMPLE_DNA = 10;        // basic DNA insight threshold
export const MIN_SAMPLE_PATTERNS = 50;   // pattern recognition threshold
export const MIN_SAMPLE_FORECAST = 100;  // predictive forecasting threshold
export const MIN_SAMPLE_ML = 500;        // ML-grade modeling threshold

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
export const rOf   = (t) => calcTradeMetrics(t).rMultiple || 0;
export const isWin = (t) => pnlOf(t) > 0;

export const winRate = (trades) => {
  if (!trades.length) return 0;
  return trades.filter(isWin).length / trades.length;
};

export const avgR = (trades) => mean(trades.map(rOf));

export const avgPnl = (trades) => mean(trades.map(pnlOf));

// Expected value per trade, in R units.
export const expectedValueR = (trades) => {
  if (!trades.length) return 0;
  const wins = trades.filter(isWin);
  const losses = trades.filter(t => !isWin(t));
  if (!wins.length && !losses.length) return 0;
  const wr = wins.length / trades.length;
  const avgWin = wins.length ? mean(wins.map(rOf)) : 0;
  const avgLoss = losses.length ? mean(losses.map(rOf)) : 0;
  return wr * avgWin + (1 - wr) * avgLoss;
};

// Profit factor: gross wins / |gross losses|
export const profitFactor = (trades) => {
  let grossWin = 0, grossLoss = 0;
  for (const t of trades) {
    const p = pnlOf(t);
    if (p > 0) grossWin += p;
    else grossLoss += Math.abs(p);
  }
  if (grossLoss === 0) return grossWin > 0 ? Infinity : 0;
  return grossWin / grossLoss;
};

// Sharpe-like ratio on per-trade R outcomes.
export const sharpeR = (trades) => {
  const rs = trades.map(rOf);
  const sd = stddev(rs);
  return sd > 0 ? mean(rs) / sd : 0;
};

// Max drawdown from an equity sequence (array of equity values or R cumsum).
export const maxDrawdown = (equitySeq) => {
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

// Streaks — longest consecutive wins and losses (chronological order expected).
export const streaks = (trades) => {
  let curW = 0, curL = 0, bestW = 0, bestL = 0;
  for (const t of trades) {
    if (isWin(t)) { curW++; bestW = Math.max(bestW, curW); curL = 0; }
    else          { curL++; bestL = Math.max(bestL, curL); curW = 0; }
  }
  return { currentWin: curW, currentLoss: curL, bestWin: bestW, bestLoss: bestL };
};

// Kelly fraction from win rate and average win/loss R-multiples.
export const kellyFraction = (trades) => {
  const wins = trades.filter(isWin);
  const losses = trades.filter(t => !isWin(t));
  if (!wins.length || !losses.length) return 0;
  const wr = wins.length / trades.length;
  const b = Math.abs(mean(losses.map(rOf)));
  if (b <= 0) return 0;
  const w = mean(wins.map(rOf));
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
