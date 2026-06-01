// ─── EDGE DECAY ALERT ────────────────────────────────────────────────────────
// Detects when a setup's recent performance has degraded vs its historical
// baseline. Compares the last RECENT_WINDOW trades (per setup) against the
// full history and flags meaningful drops in expectancy.
//
// Decay levels:
//   "mild"     → recent avgR dropped 0.3–0.6R below historical
//   "moderate" → dropped 0.6–1.0R below historical
//   "severe"   → dropped >1.0R below historical
//
// Only fires on setups with MIN_HISTORY_N historical trades and MIN_RECENT_N
// recent trades — avoids false alarms on thin samples.

import { getClosed, avgR, winRate } from "../utils/statisticalModels.js";

const MIN_HISTORY_N = 8;   // minimum all-time trades for a setup to be tracked
const MIN_RECENT_N  = 3;   // minimum recent trades to make a comparison
const RECENT_DAYS   = 21;  // "recent" window in days (3 weeks)

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const setupOf = (t) => t.setup || null;

const tradeDate = (t) => {
  const raw = t.closedAt || t.createdAt || t.date;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
};

const isRecent = (trade, nowMs) => {
  const d = tradeDate(trade);
  if (!d) return false;
  return nowMs - d.getTime() <= RECENT_DAYS * 86_400_000;
};

// Expectancy score combining winRate and avgR (E[R] proxy).
const expectancy = (trades) => {
  if (!trades.length) return 0;
  const wr  = winRate(trades);
  const ar  = avgR(trades);
  return Number((wr * ar).toFixed(3));
};

const decayLevel = (drop) => {
  if (drop >= 1.0) return "severe";
  if (drop >= 0.6) return "moderate";
  if (drop >= 0.3) return "mild";
  return null;
};

// ─── PUBLIC API ──────────────────────────────────────────────────────────────
/**
 * detectEdgeDecay(trades, nowMs?)
 *
 * Returns:
 * {
 *   alerts: [
 *     {
 *       setup: string,
 *       level: "mild" | "moderate" | "severe",
 *       drop: number,           // how many R-units recent is below historical
 *       historicalAvgR: number,
 *       recentAvgR: number,
 *       historicalN: number,
 *       recentN: number,
 *       message: { en, he },
 *     }, ...
 *   ],
 *   scanned: number,   // total setups analysed
 *   nowMs: number,
 * }
 */
export const detectEdgeDecay = (trades = [], nowMs = Date.now()) => {
  const closed = getClosed(trades);

  // Group by setup
  const bySetup = new Map();
  for (const t of closed) {
    const s = setupOf(t);
    if (!s) continue;
    if (!bySetup.has(s)) bySetup.set(s, { all: [], recent: [] });
    const bucket = bySetup.get(s);
    bucket.all.push(t);
    if (isRecent(t, nowMs)) bucket.recent.push(t);
  }

  const alerts = [];

  for (const [setup, { all, recent }] of bySetup.entries()) {
    if (all.length < MIN_HISTORY_N) continue;
    if (recent.length < MIN_RECENT_N) continue;

    const historicalAvgR = avgR(all);
    const recentAvgR     = avgR(recent);
    const drop           = Number((historicalAvgR - recentAvgR).toFixed(2));
    const level          = decayLevel(drop);

    if (!level) continue; // no meaningful decay

    const wr  = Math.round(winRate(recent) * 100);
    const wrH = Math.round(winRate(all) * 100);

    alerts.push({
      setup,
      level,
      drop,
      historicalAvgR: Number(historicalAvgR.toFixed(2)),
      recentAvgR:     Number(recentAvgR.toFixed(2)),
      historicalN:    all.length,
      recentN:        recent.length,
      expectancyDrop: Number((expectancy(all) - expectancy(recent)).toFixed(3)),
      message: {
        he: `"${setup}" מראה דעיכת Edge — ממוצע R ירד מ-${historicalAvgR.toFixed(2)} ל-${recentAvgR.toFixed(2)} ב-${recent.length} עסקאות אחרונות (${RECENT_DAYS} יום).`,
        en: `"${setup}" edge is decaying — avg R dropped from ${historicalAvgR.toFixed(2)} to ${recentAvgR.toFixed(2)} over the last ${recent.length} trades (${RECENT_DAYS}d).`,
      },
      detail: {
        he: `WR היסטורי: ${wrH}% → אחרון: ${wr}%`,
        en: `Historical WR: ${wrH}% → Recent: ${wr}%`,
      },
    });
  }

  // Sort: severe first, then by drop size
  alerts.sort((a, b) => {
    const order = { severe: 0, moderate: 1, mild: 2 };
    return (order[a.level] - order[b.level]) || (b.drop - a.drop);
  });

  return { alerts, scanned: bySetup.size, nowMs };
};
