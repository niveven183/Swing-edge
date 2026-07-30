import { useMemo } from "react";
import { computeTradingStats } from "../lib/tradingStats.js";

/**
 * useTradingStats — React wrapper around computeTradingStats (src/lib/tradingStats.js).
 *
 * Single source of truth for all trading statistics.
 * Pass either the full trades array (for global stats) or a filtered subset
 * (for journal/filter-aware stats).
 *
 * @param {Array}    trades            Array of trade objects.
 * @param {number}   capital           Starting capital (used for equity / drawdown / return %).
 * @param {Function} calcTradeMetrics  (trade) => { pnl, rMultiple }.
 * @returns {Object} Comprehensive stats object (see computeTradingStats' EMPTY_STATS for shape).
 */
export function useTradingStats(trades, capital, calcTradeMetrics) {
  return useMemo(
    () => computeTradingStats(trades, capital, calcTradeMetrics),
    [trades, capital, calcTradeMetrics]
  );
}
