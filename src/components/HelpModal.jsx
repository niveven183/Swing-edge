import { HelpCircle, X, Compass } from "lucide-react";
export default function HelpModal({ onClose, onStartTour, t, demoCount }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" role="presentation" onClick={onClose}>
      <button type="button" className="bg-[#131a2c] border border-[var(--border-subtle)] dark:border-white/[0.08] rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-subtle)] dark:border-white/[0.06]">
          <div className="flex items-center gap-2">
            <HelpCircle size={16} className="text-blue-400" />
            <h3 className="text-sm font-bold text-white">{t.helpTitle}</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-3 text-sm text-slate-300">
          <p><span className="font-bold text-white">{t.helpQuickStartLabel}</span> {t.helpQuickStartPre} <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[11px] font-mono">N</kbd> {t.helpQuickStartPost}</p>
          <p><span className="font-bold text-white">{t.helpRiskLabel}</span> {t.helpRisk}</p>
          <p><span className="font-bold text-white">{t.helpDemoLabel}</span> {t.helpDemo.replace("{n}", demoCount)}</p>
          <p><span className="font-bold text-white">{t.helpLiveLabel}</span> {t.helpLive}</p>
          <div className="flex gap-3 py-1">
            <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm flex-shrink-0">💡</div>
            <div>
              <div className="text-white font-semibold text-sm">{t.helpTipTitle}</div>
              <div className="text-slate-400 text-xs mt-1">{t.helpTipBody}</div>
            </div>
          </div>
          <p className="pt-2 text-xs text-slate-500">{t.helpBugReportPre} <span className="text-violet-400">{t.helpBugReportLink}</span> {t.helpBugReportPost}</p>
          {onStartTour && (
            <button
              type="button"
              onClick={onStartTour}
              className="mt-1 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-semibold text-sm py-2.5 transition"
            >
              <Compass size={15} />
              {t.tourLaunch}
            </button>
          )}
        </div>
      </button>
    </div>
  );
}
