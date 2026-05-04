import { useMemo } from "react";

/**
 * useTradingStats — Master Stats Hub
 *
 * Single source of truth for all trading statistics.
 * Pass either the full trades array (for global stats) or a filtered subset
 * (for journal/filter-aware stats). The hook is pure: same input → same output.
 *
 * @param {Array}    trades            Array of trade objects.
 * @param {number}   capital           Starting capital (used for equity / drawdown / return %).
 * @param {Function} calcTradeMetrics  (trade) => { pnl, rMultiple }.
 * @returns {Object} Comprehensive stats object (see EMPTY_STATS for shape).
 */
export function useTradingStats(trades, capital, calcTradeMetrics) {
  return useMemo(() => {
    const closed = (trades || []).filter(t => t.status === "CLOSED");
    const open   = (trades || []).filter(t => t.status === "OPEN");

    if (closed.length === 0) return EMPTY_STATS(capital);

    // ─── Base metrics ──────────────────────────────────────────
    const metrics = closed.map(t => ({ ...t, ...calcTradeMetrics(t) }));
    const winners = metrics.filter(m => (m.pnl || 0) > 0);
    const losers  = metrics.filter(m => (m.pnl || 0) < 0);

    const totalPnL     = metrics.reduce((s, m) => s + (m.pnl || 0), 0);
    const totalWin     = winners.reduce((s, m) => s + m.pnl, 0);
    const totalLoss    = Math.abs(losers.reduce((s, m) => s + m.pnl, 0));
    const winRate      = (winners.length / closed.length) * 100;
    const lossRate     = (losers.length  / closed.length) * 100;
    const profitFactor = totalLoss > 0 ? totalWin / totalLoss : (totalWin > 0 ? Infinity : 0);
    const avgWin       = winners.length ? totalWin / winners.length : 0;
    const avgLoss      = losers.length  ? totalLoss / losers.length : 0;
    const avgR         = metrics.reduce((s, m) => s + (m.rMultiple || 0), 0) / metrics.length;
    const bestWin      = winners.length ? Math.max(...winners.map(m => m.pnl)) : 0;
    const worstLoss    = losers.length  ? Math.min(...losers.map(m => m.pnl)) : 0;
    const expectancy   = (winRate / 100) * avgWin - (lossRate / 100) * avgLoss;

    // ─── Equity curve + Max Drawdown ───────────────────────────
    const sorted = [...metrics].sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return da - db;
    });
    let equity = capital;
    let peak = capital;
    let maxDDPct = 0;       // % drawdown from peak equity
    let pnlPeak = 0;
    let pnlEquity = 0;
    let maxDDDollars = 0;   // $ drawdown from PnL peak (legacy compat)
    const equityCurve = sorted.map((m, i) => {
      const pnl = m.pnl || 0;
      equity   += pnl;
      pnlEquity += pnl;
      if (equity > peak) peak = equity;
      if (pnlEquity > pnlPeak) pnlPeak = pnlEquity;
      const ddPct  = peak > 0 ? ((peak - equity) / peak) * 100 : 0;
      const ddDoll = pnlPeak - pnlEquity;
      if (ddPct  > maxDDPct)     maxDDPct = ddPct;
      if (ddDoll > maxDDDollars) maxDDDollars = ddDoll;
      return { index: i + 1, date: m.date, equity, pnl, drawdown: ddPct };
    });
    const currentDrawdown = equityCurve.length
      ? equityCurve[equityCurve.length - 1].drawdown
      : 0;

    // ─── Streaks ───────────────────────────────────────────────
    let maxWinStreak = 0;
    let maxLossStreak = 0;
    let tw = 0;
    let tl = 0;
    let currentStreak = 0;
    sorted.forEach((m, i) => {
      const p = m.pnl || 0;
      if (p > 0) {
        tw++; tl = 0;
        if (tw > maxWinStreak) maxWinStreak = tw;
      } else if (p < 0) {
        tl++; tw = 0;
        if (tl > maxLossStreak) maxLossStreak = tl;
      }
      if (i === sorted.length - 1) currentStreak = tw > 0 ? tw : -tl;
    });

    // ─── Behavioral ────────────────────────────────────────────
    const planYes = metrics.filter(m => m.followedPlan === true);
    const planNo  = metrics.filter(m => m.followedPlan === false);
    const planFollowedWR = planYes.length
      ? (planYes.filter(m => (m.pnl || 0) > 0).length / planYes.length) * 100
      : 0;
    const planIgnoredWR = planNo.length
      ? (planNo.filter(m => (m.pnl || 0) > 0).length / planNo.length) * 100
      : 0;

    // ─── Time-based ────────────────────────────────────────────
    const now = Date.now();
    const lastWeek  = metrics.filter(m => m.date && new Date(m.date).getTime() >= now - 7  * 86400000);
    const lastMonth = metrics.filter(m => m.date && new Date(m.date).getTime() >= now - 30 * 86400000);

    // ─── Breakdowns ────────────────────────────────────────────
    const bySetup     = groupAndAnalyze(metrics, "setup");
    const byEmotion   = groupAndAnalyze(metrics, "emotionAtEntry");
    const byMarket    = groupAndAnalyze(metrics, "marketCondition");
    const byDayOfWeek = analyzeByDay(metrics);

    // ─── Edges ─────────────────────────────────────────────────
    const topEdges  = findEdges(metrics, "top");
    const antiEdges = findEdges(metrics, "anti");

    // ─── Hold time ─────────────────────────────────────────────
    const withDates = metrics.filter(m => m.date && m.exitDate);
    const avgHoldHours = withDates.length
      ? withDates.reduce((s, m) => s + (new Date(m.exitDate) - new Date(m.date)) / 3600000, 0) / withDates.length
      : 0;
    const avgHoldDays = avgHoldHours / 24;

    return {
      // counts
      totalTrades: closed.length,
      total:       closed.length,           // alias (legacy journalStats.total)
      openTrades:  open.length,
      wins:        winners.length,
      losses:      losers.length,

      // pnl
      totalPnL, totalWin, totalLoss,

      // rates
      winRate, lossRate, profitFactor,

      // averages
      avgWin, avgLoss, avgR, bestWin, worstLoss, expectancy,

      // equity
      currentEquity: capital + totalPnL,
      capital,
      returnPct: capital ? (totalPnL / capital) * 100 : 0,
      equityCurve,

      // drawdown
      maxDrawdown: maxDDPct,                // %
      maxDD:       maxDDDollars,            // $ alias (legacy journalStats.maxDD)
      currentDrawdown,

      // streaks
      currentStreak,
      maxWinStreak,
      maxLossStreak,
      bestStreak: maxWinStreak,             // alias

      // behavioral
      planFollowedWR,
      planIgnoredWR,
      planAdherence: closed.length ? (planYes.length / closed.length) * 100 : 0,

      // hold time
      avgHoldHours,
      avgHold: avgHoldDays,                 // alias (legacy journalStats.avgHold in days)

      // time-based
      lastWeekStats:  summarize(lastWeek),
      lastMonthStats: summarize(lastMonth),

      // breakdowns
      bySetup, byEmotion, byMarket, byDayOfWeek,

      // edges
      topEdges, antiEdges,

      // raw enriched metrics (closed trades with pnl/rMultiple already attached)
      closedMetrics: metrics,

      isEmpty: false,
    };
  }, [trades, capital, calcTradeMetrics]);
}

// ───────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────

function EMPTY_STATS(capital) {
  return {
    totalTrades: 0, total: 0, openTrades: 0, wins: 0, losses: 0,
    totalPnL: 0, totalWin: 0, totalLoss: 0,
    winRate: 0, lossRate: 0, profitFactor: 0,
    avgWin: 0, avgLoss: 0, avgR: 0, bestWin: 0, worstLoss: 0, expectancy: 0,
    currentEquity: capital, capital, returnPct: 0,
    equityCurve: [], maxDrawdown: 0, maxDD: 0, currentDrawdown: 0,
    currentStreak: 0, maxWinStreak: 0, maxLossStreak: 0, bestStreak: 0,
    planFollowedWR: 0, planIgnoredWR: 0, planAdherence: 0,
    avgHoldHours: 0, avgHold: 0,
    lastWeekStats:  { count: 0, pnl: 0, winRate: 0 },
    lastMonthStats: { count: 0, pnl: 0, winRate: 0 },
    bySetup: [], byEmotion: [], byMarket: [], byDayOfWeek: [],
    topEdges: [], antiEdges: [],
    closedMetrics: [],
    isEmpty: true,
  };
}

function groupAndAnalyze(metrics, field) {
  const groups = {};
  metrics.forEach(m => {
    const key = m[field] || "Unknown";
    if (!groups[key]) groups[key] = [];
    groups[key].push(m);
  });
  return Object.entries(groups).map(([name, items]) => {
    const wins    = items.filter(m => (m.pnl || 0) > 0);
    const sumWin  = wins.reduce((s, m) => s + m.pnl, 0);
    const sumLoss = Math.abs(items.filter(m => (m.pnl || 0) < 0).reduce((s, m) => s + m.pnl, 0));
    const totalPnL = items.reduce((s, m) => s + (m.pnl || 0), 0);
    return {
      name,
      count: items.length,
      wins: wins.length,
      winRate: (wins.length / items.length) * 100,
      totalPnL,
      avgPnL: totalPnL / items.length,
      profitFactor: sumLoss > 0 ? sumWin / sumLoss : (sumWin > 0 ? Infinity : 0),
    };
  }).sort((a, b) => b.totalPnL - a.totalPnL);
}

function analyzeByDay(metrics) {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const buckets = days.map(d => ({ name: d, items: [] }));
  metrics.forEach(m => {
    if (!m.date) return;
    const idx = new Date(m.date).getDay();
    if (idx >= 0 && idx <= 6) buckets[idx].items.push(m);
  });
  return buckets
    .filter(d => d.items.length > 0)
    .map(d => {
      const wins = d.items.filter(m => (m.pnl || 0) > 0);
      return {
        name: d.name,
        count: d.items.length,
        winRate: (wins.length / d.items.length) * 100,
        totalPnL: d.items.reduce((s, m) => s + (m.pnl || 0), 0),
      };
    });
}

function summarize(metrics) {
  if (!metrics.length) return { count: 0, pnl: 0, winRate: 0 };
  const wins = metrics.filter(m => (m.pnl || 0) > 0);
  return {
    count: metrics.length,
    pnl: metrics.reduce((s, m) => s + (m.pnl || 0), 0),
    winRate: (wins.length / metrics.length) * 100,
  };
}

function findEdges(metrics, type) {
  const combos = {};
  metrics.forEach(m => {
    const key = `${m.setup || "?"} + ${m.emotionAtEntry || "?"}`;
    if (!combos[key]) combos[key] = [];
    combos[key].push(m);
  });
  const minCount = type === "top" ? 3 : 2;
  const wrFilter = type === "top" ? wr => wr >= 70 : wr => wr <= 30;
  return Object.entries(combos)
    .filter(([, items]) => items.length >= minCount)
    .map(([name, items]) => {
      const wins = items.filter(m => (m.pnl || 0) > 0);
      return {
        name,
        count: items.length,
        winRate: (wins.length / items.length) * 100,
        totalPnL: items.reduce((s, m) => s + (m.pnl || 0), 0),
      };
    })
    .filter(c => wrFilter(c.winRate))
    .sort((a, b) => type === "top" ? b.totalPnL - a.totalPnL : a.totalPnL - b.totalPnL)
    .slice(0, 5);
}
