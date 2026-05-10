import { Lock, X } from "lucide-react";
export default function PrivacyModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" role="presentation" onClick={onClose}>
      <div className="bg-[#131a2c] border border-white/[0.08] rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-slate-300" />
            <h3 className="text-sm font-bold text-white">Privacy &amp; Security</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-3 text-sm text-slate-300">
          <p>Your trades are stored locally in your browser. If you signed in, they sync to your private Supabase row — only you can read them.</p>
          <p>Live prices are fetched directly from TradingView; SwingEdge does not log or share which symbols you view.</p>
          <p className="pt-2 text-xs text-slate-500">To erase all local data, clear your browser storage or use Settings → Reset Demo Trades.</p>
        </div>
      </div>
    </div>
  );
}
