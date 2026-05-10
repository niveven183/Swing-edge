import { HelpCircle, X } from "lucide-react";
export default function HelpModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" role="presentation" onClick={onClose}>
      <button type="button" className="bg-[#131a2c] border border-white/[0.08] rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <HelpCircle size={16} className="text-blue-400" />
            <h3 className="text-sm font-bold text-white">Help &amp; Documentation</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-3 text-sm text-slate-300">
          <p><span className="font-bold text-white">Quick start:</span> Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[11px] font-mono">N</kbd> to open the new-trade form.</p>
          <p><span className="font-bold text-white">Risk:</span> SwingEdge sizes positions at 1% portfolio risk. Update your capital in Settings.</p>
          <p><span className="font-bold text-white">Demo data:</span> Settings → "Load Demo Trades" loads 15 realistic trades for testing.</p>
          <p><span className="font-bold text-white">Live data:</span> Header tape and charts use TradingView feeds (24/7 incl. pre/post-market).</p>
          <div className="flex gap-3 py-1">
            <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm flex-shrink-0">💡</div>
            <div>
              <div className="text-white font-semibold text-sm">טיפ: הפעל "Always show stats"</div>
              <div className="text-slate-400 text-xs mt-1">לחץ פעמיים על הכלי → Display → סמן ✅ "Always show stats".</div>
            </div>
          </div>
          <p className="pt-2 text-xs text-slate-500">For bug reports, use the <span className="text-violet-400">Send Feedback</span> menu item.</p>
        </div>
      </div>
    </div>
  );
}
