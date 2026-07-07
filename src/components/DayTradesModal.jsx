import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { he as heLocale } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { getTranslations, isRTLLang, nTrades } from '../i18n.js';
import useModalA11y from '../hooks/useModalA11y.js';
import TickerLogo from './TickerLogo.jsx';
import InfoTooltip from './ui/InfoTooltip.jsx';
import { EMOTION_OPTIONS } from '../data/tradeOptions.jsx';
import { isFollowedPlan, isOffPlan } from '../utils.js';
import { getSetupTooltip } from '../intelligence/knowledgeGlue.js';

const EMOTION_EMOJI = Object.fromEntries(EMOTION_OPTIONS.map(o => [o.value, o.emoji]));

// Parse a 'YYYY-MM-DD' key as a LOCAL calendar day (avoids the UTC-midnight
// shift that `new Date("2026-06-03")` would introduce in negative-offset zones).
function parseDayKey(key) {
  if (typeof key !== 'string') return new Date();
  const [y, m, d] = key.split('-').map(Number);
  return (y && m && d) ? new Date(y, m - 1, d) : new Date();
}

const pnlClass = (n) => (n >= 0
  ? 'text-emerald-600 dark:text-emerald-400'
  : 'text-rose-600 dark:text-rose-400');

// Day drill-down: every trade CLOSED on the selected day, one compact card each,
// with a ticker jump-strip + prev/next + keyboard arrows for fast navigation.
// No data fetching — reads the already-loaded day array passed by the calendar.
export default function DayTradesModal({ dateKey, trades = [], calcMetrics, lang = 'he', onClose }) {
  const t = getTranslations(lang);
  const isRTL = isRTLLang(lang);
  const locale = lang === 'he' ? heLocale : undefined;
  const titleId = useId();
  const containerRef = useModalA11y({ active: true, onClose });

  const [active, setActive] = useState(0);
  const cardRefs = useRef([]);
  const tabRefs = useRef([]);

  const metricsOf = (tr) => {
    try {
      const m = typeof calcMetrics === 'function' ? calcMetrics(tr) : null;
      return { pnl: m?.pnl ?? 0, rMultiple: m?.rMultiple ?? null };
    } catch {
      return { pnl: 0, rMultiple: null };
    }
  };

  const rows = useMemo(
    () => trades.map(tr => ({ trade: tr, ...metricsOf(tr) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trades],
  );

  const totals = useMemo(() => {
    const pnl = rows.reduce((s, r) => s + (r.pnl || 0), 0);
    const wins = rows.filter(r => (r.pnl || 0) > 0).length;
    return {
      count: rows.length,
      pnl,
      winRate: rows.length ? Math.round((wins / rows.length) * 100) : 0,
    };
  }, [rows]);

  // Keep the active index valid if the day array changes underneath us.
  useEffect(() => {
    setActive(a => Math.min(Math.max(0, a), Math.max(0, rows.length - 1)));
  }, [rows.length]);

  // Bring the active card + its strip tab into view on navigation.
  useEffect(() => {
    cardRefs.current[active]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    tabRefs.current[active]?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  }, [active]);

  const go = (delta) => setActive(a => Math.min(rows.length - 1, Math.max(0, a + delta)));

  const onKeyDown = (e) => {
    // Escape + Tab-trap are owned by useModalA11y; here we handle arrows only.
    const forwardKey = isRTL ? 'ArrowLeft' : 'ArrowRight';
    const backKey = isRTL ? 'ArrowRight' : 'ArrowLeft';
    if (e.key === 'ArrowDown' || e.key === forwardKey) { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowUp' || e.key === backKey) { e.preventDefault(); go(-1); }
  };

  const dayLabel = format(parseDayKey(dateKey), lang === 'he' ? 'dd בMMMM yyyy' : 'MMMM d, yyyy', { locale });

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      role="presentation"
      onClick={onClose}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#131a2c] border border-slate-200 dark:border-white/[0.08] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col focus:outline-none"
      >
        {/* Header */}
        <div className="relative p-5 border-b border-slate-100 dark:border-white/[0.06] shrink-0">
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="absolute top-4 ltr:right-4 rtl:left-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <h3 id={titleId} className="font-semibold text-slate-800 dark:text-slate-200 text-lg mb-3 ltr:pr-8 rtl:pl-8">
            {dayLabel}
          </h3>

          <div className="flex gap-2 flex-wrap">
            <span className="px-3 py-1 bg-slate-100 dark:bg-white/[0.08] text-slate-600 dark:text-slate-300 rounded-full text-xs">
              {nTrades(totals.count, lang)}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-mono font-semibold
              ${totals.pnl >= 0
                ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                : 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400'}`}>
              {totals.pnl >= 0 ? '+' : ''}${totals.pnl.toFixed(0)}
            </span>
            <span className="px-3 py-1 bg-slate-100 dark:bg-white/[0.08] text-slate-600 dark:text-slate-300 rounded-full text-xs">
              {totals.winRate}% {t.winRate}
            </span>
          </div>
        </div>

        {/* Jump strip: prev / ticker tabs / next */}
        {rows.length > 1 && (
          <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/60 dark:bg-white/[0.03] shrink-0">
            <button
              type="button"
              onClick={() => go(-1)}
              disabled={active === 0}
              aria-label={t.cal_prevTrade}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200/70 dark:hover:bg-white/[0.08] disabled:opacity-30 disabled:pointer-events-none transition-colors shrink-0"
            >
              <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
            </button>

            <div role="tablist" aria-label={dayLabel} className="flex-1 flex gap-1.5 overflow-x-auto scrollbar-none py-0.5">
              {rows.map((r, i) => {
                const isActive = i === active;
                const p = r.pnl || 0;
                return (
                  <button
                    key={r.trade.id || i}
                    ref={el => (tabRefs.current[i] = el)}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActive(i)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold whitespace-nowrap border transition-colors shrink-0
                      ${isActive
                        ? 'bg-emerald-50 dark:bg-emerald-500/20 border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                        : 'bg-white dark:bg-white/[0.04] border-slate-200 dark:border-white/[0.06] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.08]'}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${p > 0 ? 'bg-emerald-500' : p < 0 ? 'bg-rose-500' : 'bg-slate-400'}`} />
                    {r.trade.ticker}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => go(1)}
              disabled={active === rows.length - 1}
              aria-label={t.cal_nextTrade}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200/70 dark:hover:bg-white/[0.08] disabled:opacity-30 disabled:pointer-events-none transition-colors shrink-0"
            >
              <ChevronRight className="w-4 h-4 rtl:rotate-180" />
            </button>
          </div>
        )}

        {/* Cards */}
        <div className="p-4 space-y-3 overflow-y-auto">
          {rows.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 py-6 text-center">{t.cal_noTrades}</p>
          ) : rows.map((r, i) => {
            const { trade: tr, pnl, rMultiple } = r;
            const isActive = i === active;
            return (
              <div
                key={tr.id || i}
                ref={el => (cardRefs.current[i] = el)}
                aria-current={isActive ? 'true' : undefined}
                onClick={() => setActive(i)}
                className={`rounded-xl border p-3 transition-all cursor-default
                  ${isActive
                    ? 'border-emerald-300 dark:border-emerald-500/40 ring-2 ring-inset ring-emerald-400/60 dark:ring-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-500/[0.06]'
                    : 'border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.04]'}`}
              >
                {/* Row 1: ticker + side · P&L + R */}
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <TickerLogo ticker={tr.ticker} size={20} />
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 text-sm">{tr.ticker}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border
                      ${tr.side === 'SHORT'
                        ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20'
                        : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'}`}>
                      {tr.side || 'LONG'}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`font-mono font-semibold text-sm ${pnlClass(pnl || 0)}`}>
                      {(pnl || 0) >= 0 ? '+' : ''}${(pnl || 0).toFixed(2)}
                    </div>
                    {rMultiple !== null && rMultiple !== undefined && (
                      <div className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                        {rMultiple >= 0 ? '+' : ''}{rMultiple.toFixed(2)}{t.cal_rMultiple}
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 2: detail grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-xs">
                  <Field label={t.cal_entry} value={tr.entry != null ? `$${tr.entry}` : '–'} mono />
                  <Field label={t.cal_exit} value={tr.exit != null ? `$${tr.exit}` : '–'} mono />
                  <Field label={t.cal_setup} value={tr.setup || '–'} tip={<SetupTip setup={tr.setup} isRTL={isRTL} />} />
                  <Field
                    label={t.cal_emotion}
                    value={tr.emotionAtEntry
                      ? `${EMOTION_EMOJI[tr.emotionAtEntry] || ''} ${tr.emotionAtEntry}`.trim()
                      : '–'}
                  />
                  <Field label={t.exitReason} value={tr.exitReason || '–'} />
                  <Field
                    label={t.cal_planFollowed}
                    value={
                      isFollowedPlan(tr.followedPlan)
                        ? <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                        : isOffPlan(tr.followedPlan)
                          ? <span className="text-rose-600 dark:text-rose-400 font-bold">✗</span>
                          : tr.followedPlan === 'Partially'
                            ? <span className="text-amber-500 font-bold">◐</span>
                            : '–'
                    }
                  />
                </div>

                {/* Row 3: lesson */}
                {tr.lessonLearned && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/[0.06]">
                    <div className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">{t.lessonLearned}</div>
                    <p className="text-xs text-violet-600 dark:text-violet-300/90 leading-relaxed">💡 {tr.lessonLearned}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Info "?" beside a mapped setup tag — knowledge name/definition/coach line.
// Returns null for unmapped / "Other" / empty setups, so the tag stays plain.
function SetupTip({ setup, isRTL }) {
  const st = getSetupTooltip(setup);
  if (!st) return null;
  const dir = isRTL ? 'rtl' : 'ltr';
  return (
    <InfoTooltip label={isRTL ? `מידע על ${st.name}` : `More info: ${st.name}`}>
      <div dir={dir} style={{ direction: dir, textAlign: 'start' }}>
        <div className="font-bold text-emerald-600 dark:text-emerald-400 mb-1.5 text-[13px]">{st.name}</div>
        {st.definition && <div className="whitespace-pre-line mb-2">{st.definition}</div>}
        {st.coachLine && (
          <div className="whitespace-pre-line text-slate-600 dark:text-slate-300">{st.coachLine}</div>
        )}
      </div>
    </InfoTooltip>
  );
}

function Field({ label, value, mono = false, tip = null }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</div>
      <div className="flex items-center gap-1">
        <div className={`text-slate-700 dark:text-slate-200 truncate ${mono ? 'font-mono' : ''}`}>{value}</div>
        {tip}
      </div>
    </div>
  );
}
