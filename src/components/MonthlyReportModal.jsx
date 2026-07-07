// ─────────────────────────────────────────────────────────────────────────────
// MonthlyReportModal.jsx — auto-popup digest of the monthly report.
// Condensed: Grade + top strength + top weakness + one action. Celebratory for
// A/B, encouraging (never negative) for C/D/F. "See full report" opens the tab.
// ─────────────────────────────────────────────────────────────────────────────
import { X, Award, CheckCircle, AlertTriangle, ArrowRight, Sparkles } from "lucide-react";
import { useId } from "react";
import { MONTH_NAMES } from "../intelligence/core/MonthlyReport.js";
import useModalA11y from "../hooks/useModalA11y.js";

const interp = (str, params = {}) =>
  String(str || "").replace(/\{(\w+)\}/g, (_, k) => (params[k] != null ? params[k] : `{${k}}`));

const GRADE_RING = {
  A: "from-emerald-400 to-teal-500",
  B: "from-cyan-400 to-blue-500",
  C: "from-amber-400 to-yellow-500",
  D: "from-orange-400 to-amber-500",
  F: "from-rose-400 to-red-500",
};

export default function MonthlyReportModal({ report, t, lang, isRTL, onClose, onOpenFull }) {
  const titleId = useId();
  const modalRef = useModalA11y({ active: !!(report && report.hasEnoughData), onClose });
  if (!report || !report.hasEnoughData) return null;

  const celebrate = report.grade === "A" || report.grade === "B";
  const arr = Array.isArray(t.mr_months) ? t.mr_months : MONTH_NAMES;
  const label = `${arr[report.period.month] || MONTH_NAMES[report.period.month]} ${report.period.year}`;

  const strength = report.strengths[0];
  const weakness = report.weaknesses[0];
  const action = report.actionItems[0];

  const detail = (ins) => (ins ? (t[ins.tid] ? interp(t[ins.tid], ins.params) : ins.detail) : "");
  const actionText = action ? (action.tid && t[action.tid] ? interp(t[action.tid], action.params) : action.action) : "";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      role="presentation"
      onClick={onClose}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="bg-white dark:bg-[#131a2c] border border-slate-200 dark:border-white/[0.08] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`relative px-5 py-4 bg-gradient-to-br ${GRADE_RING[report.grade] || GRADE_RING.C}`}>
          <button onClick={onClose} aria-label={t?.close || "Close"} className="absolute top-3 ltr:right-3 rtl:left-3 text-white/80 hover:text-white transition"><X size={18} /></button>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
              <span className="text-3xl font-black text-white">{report.grade}</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-white/90 text-[11px] font-semibold tracking-wide uppercase">
                {celebrate ? <Sparkles size={12} /> : <Award size={12} />} {t.dnaReport}
              </div>
              <div id={titleId} className="text-white font-bold text-lg leading-tight">{label}</div>
              <div className="text-white/85 text-xs">{celebrate ? t.mr_modalCelebrate : t.mr_modalEncourage}</div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">
          {strength && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] p-3">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-1">
                <CheckCircle size={12} /> {t.mr_topStrength}
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug">{detail(strength)}</p>
            </div>
          )}
          {weakness && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.06] p-3">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-1">
                <AlertTriangle size={12} /> {t.mr_topFocus}
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug">{detail(weakness)}</p>
            </div>
          )}
          {action && (
            <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/[0.06] p-3">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-600 dark:text-cyan-400 mb-1">
                <ArrowRight size={12} /> {t.mr_oneAction}
              </div>
              <p className="text-xs font-semibold text-slate-900 dark:text-white leading-snug">{actionText}</p>
              {action.knowledge && (
                <div className="mt-1.5 space-y-0.5" dir={isRTL ? 'rtl' : 'ltr'}>
                  {action.knowledge.coachLine && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                      {action.knowledge.coachLine}{action.knowledge.source ? ` — ${action.knowledge.source}` : ''}
                    </p>
                  )}
                  {action.knowledge.statLine && (
                    <p className="text-[11px] font-medium text-cyan-700 dark:text-cyan-300">{action.knowledge.statLine}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex items-center gap-2">
          <button
            onClick={onOpenFull}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500 text-white text-sm font-semibold shadow-lg shadow-cyan-500/20 hover:scale-[1.02] active:scale-95 transition-transform"
          >
            {t.mr_seeFullReport} <ArrowRight size={15} className="rtl:rotate-180" />
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-white/5 transition">
            {t.mr_close}
          </button>
        </div>
      </div>
    </div>
  );
}
