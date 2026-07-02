import React, { useState, useMemo } from 'react';
import {
  startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, format, isSameMonth,
  isSameDay, addMonths, subMonths
} from 'date-fns';
import { he as heLocale } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { nTrades } from '../i18n.js';

// trades: array of trade objects (closed trades preferred — open trades show 0 P&L).
// calcMetrics: function(trade) -> { pnl, rMultiple }. P&L/R are NOT stored on the trade.
// lang: "he" | "en"
export function TradeCalendar({ trades = [], calcMetrics, lang = 'he' }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  const locale = lang === 'he' ? heLocale : undefined;
  const metricsOf = (t) => {
    try {
      const m = typeof calcMetrics === 'function' ? calcMetrics(t) : null;
      return { pnl: m?.pnl ?? 0, rMultiple: m?.rMultiple ?? null };
    } catch {
      return { pnl: 0, rMultiple: null };
    }
  };

  // map trades by date key (YYYY-MM-DD)
  const tradesByDate = useMemo(() => {
    const map = {};
    trades.forEach(t => {
      const raw = t.date || t.openDate || t.createdAt;
      if (!raw || typeof raw !== 'string') return;
      const key = raw.slice(0, 10);
      if (!key || key === 'null' || key === 'undefined') return;
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [trades]);

  // daily P&L
  const dailyPnL = useMemo(() => {
    const map = {};
    Object.entries(tradesByDate).forEach(([date, dayTrades]) => {
      map[date] = dayTrades.reduce((sum, t) => sum + (metricsOf(t).pnl || 0), 0);
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradesByDate]);

  // grid days
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // monthly summary
  const monthSummary = useMemo(() => {
    const prefix = format(currentMonth, 'yyyy-MM');
    const monthTrades = trades.filter(t =>
      String(t.date || t.openDate || '').startsWith(prefix)
    );
    const pnl = monthTrades.reduce((s, t) => s + (metricsOf(t).pnl || 0), 0);
    const wins = monthTrades.filter(t => (metricsOf(t).pnl || 0) > 0).length;
    return {
      count: monthTrades.length,
      pnl,
      winRate: monthTrades.length ? Math.round((wins / monthTrades.length) * 100) : 0,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth, trades]);

  const dayLabels = lang === 'he'
    ? ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']
    : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const selectedKey = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;
  const selectedTrades = selectedKey ? (tradesByDate[selectedKey] || []) : [];

  return (
    <div className="bg-white dark:bg-[#0d1424] rounded-2xl border border-slate-100 dark:border-white/[0.06] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 dark:border-white/[0.06]">
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => setCurrentMonth(m => subMonths(m, 1))}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors"
            aria-label={lang === 'he' ? 'חודש קודם' : 'Previous month'}
          >
            <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </button>

          <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-lg">
            {format(currentMonth, 'MMMM yyyy', { locale })}
          </h3>

          <button
            type="button"
            onClick={() => setCurrentMonth(m => addMonths(m, 1))}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors"
            aria-label={lang === 'he' ? 'חודש הבא' : 'Next month'}
          >
            <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        <div className="flex gap-2 flex-wrap">
          <span className="px-3 py-1 bg-slate-100 dark:bg-white/[0.08] text-slate-600 dark:text-slate-300 rounded-full text-xs">
            {nTrades(monthSummary.count, lang)}
          </span>
          {monthSummary.count > 0 && (
            <>
              <span className={`px-3 py-1 rounded-full text-xs font-mono font-semibold
                ${monthSummary.pnl >= 0
                  ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                  : 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400'}`}>
                {monthSummary.pnl >= 0 ? '+' : ''}${monthSummary.pnl.toFixed(0)}
              </span>
              <span className="px-3 py-1 bg-slate-100 dark:bg-white/[0.08] text-slate-600 dark:text-slate-300 rounded-full text-xs">
                {monthSummary.winRate}% WR
              </span>
            </>
          )}
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 bg-slate-50 dark:bg-white/[0.04]">
        {dayLabels.map(d => (
          <div key={d} className="py-2 text-center text-xs font-medium text-slate-400 dark:text-slate-500">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map(day => {
          const key = format(day, 'yyyy-MM-dd');
          const dayTrades = tradesByDate[key] || [];
          const pnl = dailyPnL[key] || 0;
          const inMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, new Date());
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const hasTrades = dayTrades.length > 0;

          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedDate(isSelected ? null : day)}
              aria-label={`${format(day, lang === 'he' ? 'dd/MM/yyyy' : 'MMMM d, yyyy', { locale })}${hasTrades ? ` — ${nTrades(dayTrades.length, lang)}` : ''}`}
              aria-pressed={isSelected ? true : false}
              className={`
                relative min-h-[56px] p-1.5 border-b border-r border-slate-100 dark:border-white/[0.06]
                transition-all text-left
                ${!inMonth ? 'opacity-30' : ''}
                ${isSelected
                  ? 'bg-emerald-50 dark:bg-emerald-500/20 ring-2 ring-inset ring-emerald-400 dark:ring-emerald-500'
                  : hasTrades
                    ? pnl > 0
                      ? 'bg-emerald-50/40 dark:bg-emerald-500/10 hover:bg-emerald-50 dark:hover:bg-emerald-500/20'
                      : 'bg-rose-50/40 dark:bg-rose-500/10 hover:bg-rose-50 dark:hover:bg-rose-500/20'
                    : 'hover:bg-slate-50 dark:hover:bg-white/[0.04]'}
              `}
            >
              <span className={`
                text-xs font-medium block mb-1
                ${isToday
                  ? 'w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[10px]'
                  : 'text-slate-600 dark:text-slate-300'}
              `}>
                {format(day, 'd')}
              </span>

              {hasTrades && (
                <span className={`
                  text-[10px] font-mono font-semibold block leading-tight
                  ${pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}
                `}>
                  {pnl >= 0 ? '+' : ''}${Math.abs(pnl).toFixed(0)}
                </span>
              )}

              {hasTrades && (
                <div className="flex gap-0.5 mt-0.5 flex-wrap">
                  {dayTrades.slice(0, 4).map((t, i) => {
                    const p = metricsOf(t).pnl || 0;
                    return (
                      <div
                        key={t.id || i}
                        className={`w-1.5 h-1.5 rounded-full ${p > 0 ? 'bg-emerald-500' : p < 0 ? 'bg-rose-500' : 'bg-slate-400 dark:bg-slate-500'}`}
                      />
                    );
                  })}
                  {dayTrades.length > 4 && (
                    <span className="text-[9px] text-slate-400 dark:text-slate-500">+{dayTrades.length - 4}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day panel */}
      {selectedDate && (
        <div className="border-t border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.04] p-4">
          <h4 className="font-medium text-slate-700 dark:text-slate-200 mb-3 text-sm">
            {format(selectedDate, lang === 'he' ? 'dd בMMMM yyyy' : 'MMMM dd, yyyy', { locale })}
          </h4>

          {selectedTrades.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">
              {lang === 'he' ? 'אין עסקאות ביום זה' : 'No trades this day'}
            </p>
          ) : (
            <div className="space-y-2">
              {selectedTrades.map((t, i) => {
                const { pnl, rMultiple } = metricsOf(t);
                return (
                  <div key={t.id || i}
                    className="flex items-center justify-between p-3 bg-white dark:bg-white/[0.06] rounded-xl border border-slate-100 dark:border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 text-sm">
                        {t.ticker}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                        ${t.side === 'LONG'
                          ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                          : 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400'}`}>
                        {t.side || 'LONG'}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className={`font-mono font-semibold text-sm
                        ${(pnl || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {(pnl || 0) >= 0 ? '+' : ''}${(pnl || 0).toFixed(2)}
                      </div>
                      {rMultiple !== null && rMultiple !== undefined && (
                        <div className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                          {rMultiple >= 0 ? '+' : ''}{rMultiple.toFixed(2)}R
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TradeCalendar;
