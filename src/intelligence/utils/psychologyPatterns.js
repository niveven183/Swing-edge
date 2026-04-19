// ─── PSYCHOLOGY PATTERNS ─────────────────────────────────────────────────────
// Detects emotional / behavioural patterns in trading history.

import { getClosed, isWin, pnlOf, groupBy } from "./statisticalModels.js";

// Chronological timestamp for a trade. Prefer createdAt, fall back to date.
export const tradeTs = (t) => {
  const raw = t.createdAt || (t.date ? t.date + "T12:00:00" : null);
  if (!raw) return 0;
  const ms = new Date(raw).getTime();
  return isNaN(ms) ? 0 : ms;
};

// Sort trades chronologically (older → newer) without mutating.
export const chrono = (trades) => [...trades].sort((a, b) => tradeTs(a) - tradeTs(b));

// ─── CONSECUTIVE LOSSES / WINS ───────────────────────────────────────────────
// Trailing run of losses up to and including "now" (closed trades only).
export const trailingLossRun = (trades) => {
  const closed = chrono(getClosed(trades));
  let n = 0;
  for (let i = closed.length - 1; i >= 0; i--) {
    if (isWin(closed[i])) break;
    n++;
  }
  return n;
};

export const trailingWinRun = (trades) => {
  const closed = chrono(getClosed(trades));
  let n = 0;
  for (let i = closed.length - 1; i >= 0; i--) {
    if (!isWin(closed[i])) break;
    n++;
  }
  return n;
};

// ─── REVENGE TRADING ─────────────────────────────────────────────────────────
// A trade opened quickly after a loss — classic revenge signature.
export const minutesSinceLastClose = (trades, nowTs = Date.now()) => {
  const closed = chrono(getClosed(trades));
  if (!closed.length) return Infinity;
  const last = closed[closed.length - 1];
  const lastTs = last.closedAt ? new Date(last.closedAt).getTime() : tradeTs(last);
  return (nowTs - lastTs) / 60000;
};

export const isRevengeWindow = (trades, nowTs = Date.now(), minutes = 30) => {
  const closed = chrono(getClosed(trades));
  if (!closed.length) return false;
  const last = closed[closed.length - 1];
  if (isWin(last)) return false;
  return minutesSinceLastClose(trades, nowTs) < minutes;
};

// ─── OVERTRADING ─────────────────────────────────────────────────────────────
// Count of trades opened on the same calendar date (local time).
export const tradesToday = (trades, now = new Date()) => {
  const ymd = now.toISOString().slice(0, 10);
  return (trades || []).filter(t => (t.date || "").slice(0, 10) === ymd).length;
};

// Detect late-night trades (outside 07:00-22:59 local).
export const isOffHours = (hour) => hour != null && (hour < 7 || hour >= 23);

// ─── PLAN DEVIATION ──────────────────────────────────────────────────────────
// Last N days of closed trades where followedPlan === false.
export const planDeviationsInLastDays = (trades, days = 7) => {
  const cutoff = Date.now() - days * 86400000;
  return getClosed(trades).filter(t =>
    t.followedPlan === false && tradeTs(t) >= cutoff
  ).length;
};

// ─── EMOTIONAL EDGE & DRAG ───────────────────────────────────────────────────
// Win-rate by emotion — lets us see which moods produce results.
export const emotionPerformance = (trades) => {
  const closed = getClosed(trades);
  const groups = groupBy(closed, t => t.emotionAtEntry || "Unknown");
  const out = {};
  for (const [emo, list] of Object.entries(groups)) {
    const wins = list.filter(isWin).length;
    out[emo] = {
      count: list.length,
      wins,
      losses: list.length - wins,
      winRate: list.length ? wins / list.length : 0,
      totalPnl: list.reduce((s, t) => s + pnlOf(t), 0),
    };
  }
  return out;
};

// Pick emotional states that drag down the trader (>= 3 trades, negative EV).
export const emotionalDrags = (trades) => {
  const perf = emotionPerformance(trades);
  return Object.entries(perf)
    .filter(([, v]) => v.count >= 3 && v.totalPnl < 0)
    .map(([emo, v]) => ({ emotion: emo, ...v }))
    .sort((a, b) => a.totalPnl - b.totalPnl);
};

// ─── DISCIPLINE METRICS ──────────────────────────────────────────────────────
export const disciplineRate = (trades) => {
  const closed = getClosed(trades).filter(t => t.followedPlan != null);
  if (!closed.length) return null;
  return closed.filter(t => t.followedPlan === true).length / closed.length;
};

// MAE / MFE behavioural flag — trades that went deeply against plan before
// reversing hint at panic management or loose stops.
export const avgMaeMfe = (trades) => {
  const closed = getClosed(trades).filter(t => t.maxAdverse != null || t.maxFavorable != null);
  if (!closed.length) return { avgMae: 0, avgMfe: 0, n: 0 };
  const mae = closed.map(t => Math.abs(Number(t.maxAdverse) || 0));
  const mfe = closed.map(t => Math.abs(Number(t.maxFavorable) || 0));
  return {
    avgMae: mae.reduce((s, x) => s + x, 0) / mae.length,
    avgMfe: mfe.reduce((s, x) => s + x, 0) / mfe.length,
    n: closed.length,
  };
};
