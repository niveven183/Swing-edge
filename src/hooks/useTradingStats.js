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
 * @param {?string}  pnlCurrency       B-144 — היחידה שבה `calcTradeMetrics`
 *   מייצר את `pnl`. ⚠️ **מי שמוסר `makeConvertingCalc` חייב למסור כאן את
 *   מטבע התצוגה**, אחרת הכסף המומר נכנס לדלי של מטבע ה**נייר** ⇒ מפתח שאינו
 *   היחידה שבתוכו. `null` = calc גולמי, שאינו טוען דבר על יחידה.
 *   `test:instrument` בלוק 15 חוסם השמטה בארבעת אתרי הקריאה של המוצר.
 * @returns {Object} Comprehensive stats object (see computeTradingStats' EMPTY_STATS for shape).
 */
export function useTradingStats(trades, capital, calcTradeMetrics, pnlCurrency) {
  return useMemo(
    () => computeTradingStats(trades, capital, calcTradeMetrics, pnlCurrency),
    [trades, capital, calcTradeMetrics, pnlCurrency]
  );
}
