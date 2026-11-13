// src/components/GlossaryShell.jsx — the glossary dialog's frame (eager, tiny). The content —
// every term's long text in 5 languages — is GlossaryBody, loaded with import() through the same
// lazyWithRetry as AdminPanel, so it never enters the main chunk (Niv 13.11).
//
// Failure = the PanelBoundary card ("המילון לא נטען · נסה שוב"), ⛔ a silent null. "נסה שוב" really
// re-imports: React.lazy caches a rejected promise, so every reset builds a NEW lazy component.
import { Suspense, useId, useMemo, useState } from "react";
import PanelBoundary from "./PanelBoundary.jsx";
import useModalA11y from "../hooks/useModalA11y.js";
import lazyWithRetry from "../lib/lazyWithRetry.js";
import { glossaryUi } from "../glossary/ui.js";
import { isRTLLang } from "../i18n.js";

const loadBody = () => import("./GlossaryBody.jsx");

export default function GlossaryShell({ term = "", lang = "he", onClose }) {
  const [attempt, setAttempt] = useState(0);
  const Body = useMemo(() => lazyWithRetry(loadBody, "chunk-reloaded-glossary"), [attempt]);
  const ref = useModalA11y({ active: true, onClose });
  const titleId = useId();
  const ui = glossaryUi(lang);
  const dir = isRTLLang(lang) ? "rtl" : "ltr";

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-[2px]"
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        dir={dir}
        lang={lang}
        className="w-full sm:max-w-2xl max-h-[88vh] sm:max-h-[80vh] flex flex-col bg-[var(--bg-elevated)] dark:bg-[#0d1424] border border-slate-200 dark:border-white/[0.08] rounded-t-2xl sm:rounded-2xl shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 dark:border-white/[0.06]">
          <h2 id={titleId} className="text-sm font-bold tracking-wide text-slate-900 dark:text-white">{ui.title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={ui.close}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-white/[0.08]"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4">
          <PanelBoundary name="glossary" onReset={() => setAttempt((a) => a + 1)}>
            <Suspense fallback={<p role="status" className="text-xs text-slate-500">{ui.loading}</p>}>
              <Body term={term} lang={lang} />
            </Suspense>
          </PanelBoundary>
        </div>
      </div>
    </div>
  );
}
