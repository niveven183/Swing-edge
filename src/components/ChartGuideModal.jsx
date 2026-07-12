import { memo, useEffect, useId } from "react";
import { X } from "lucide-react";
import useModalA11y from "../hooks/useModalA11y.js";

const ChartGuideModal = memo(function ChartGuideModal({ onClose, lang }) {
  const titleId = useId();
  const modalRef = useModalA11y({ active: true, onClose });

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const isRTL = lang === "he";
  const title = isRTL ? "איך לצלם עסקה מ-TradingView" : "How to screenshot a trade from TradingView";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" role="presentation" onClick={onClose}>
      <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
        dir={isRTL ? "rtl" : "ltr"}
        style={{ width: "min(900px, 92vw)", height: "min(85vh, 760px)" }}
        className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[var(--border-subtle)] dark:border-white/[0.08] rounded-2xl shadow-2xl focus:outline-none flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-subtle)] dark:border-white/[0.06] shrink-0">
          <h3 id={titleId} className="text-sm font-bold text-white">{title}</h3>
          <button onClick={onClose} aria-label={isRTL ? "סגור" : "Close"} className="text-slate-500 hover:text-white transition">
            <X size={16} />
          </button>
        </div>
        <iframe
          src="/chart-upload-guide.html"
          title={isRTL ? "מדריך צילום עסקה מ-TradingView" : "TradingView chart screenshot guide"}
          className="flex-1 w-full border-0 bg-[#0a0e14]"
        />
      </div>
    </div>
  );
});

export default ChartGuideModal;
