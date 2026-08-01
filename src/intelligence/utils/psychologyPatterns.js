// ─── PSYCHOLOGY PATTERNS ─────────────────────────────────────────────────────
// Detects emotional / behavioural patterns in trading history.

import { getClosed, isWin, pnlOf, groupBy } from "./statisticalModels.js";
import { isFollowedPlan, isOffPlan, localDayKey } from "../../utils.js";

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
  const ymd = localDayKey(now);
  return (trades || []).filter(t => !t.isDemo && (t.date || "").slice(0, 10) === ymd).length;
};

// Detect late-night trades (outside 07:00-22:59 local).
export const isOffHours = (hour) => hour != null && (hour < 7 || hour >= 23);

// ─── PLAN DEVIATION ──────────────────────────────────────────────────────────
// Last N days of closed trades where the plan was NOT followed (off-plan).
export const planDeviationsInLastDays = (trades, days = 7) => {
  const cutoff = Date.now() - days * 86400000;
  return getClosed(trades).filter(t =>
    isOffPlan(t.followedPlan) && tradeTs(t) >= cutoff
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
  return closed.filter(t => isFollowedPlan(t.followedPlan)).length / closed.length;
};

// `v == null` is checked BEFORE Number() on purpose: Number(null) === 0 and
// Number.isFinite(0) === true, so the naive `Number.isFinite(Number(v))` gate
// silently turns a missing value into a real 0 — the same trap documented in
// DECISIONS for profitFactor.
const numOrNull = (v) => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// MAE / MFE behavioural flag — trades that went deeply against plan before
// reversing hint at panic management or loose stops.
//
// MAE and MFE are recorded independently: a trade may carry one and not the
// other. The previous implementation admitted a trade on `maxAdverse != null ||
// maxFavorable != null` and then let `Number(t.maxAdverse) || 0` fabricate a 0
// for whichever side was missing — that 0 landed in the numerator while the
// denominator counted the whole array, dragging both averages toward zero.
// Each metric now carries its own denominator (`maeN` / `mfeN`) = the count of
// values genuinely present; numerator and denominator move together. Nothing
// measurable → `null`, never 0. `n` remains the closed-trade population so a
// caller can see the coverage, per CLAUDE.md §2 ("אפס מנה בלי מכנה").
export const avgMaeMfe = (trades) => {
  const closed = getClosed(trades);
  const mae = closed.map(t => numOrNull(t.maxAdverse)).filter(v => v !== null).map(Math.abs);
  const mfe = closed.map(t => numOrNull(t.maxFavorable)).filter(v => v !== null).map(Math.abs);
  const avg = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
  return {
    avgMae: avg(mae), maeN: mae.length,
    avgMfe: avg(mfe), mfeN: mfe.length,
    n: closed.length,
  };
};
