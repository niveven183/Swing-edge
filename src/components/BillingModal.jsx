import { CreditCard, X } from "lucide-react";
import { useId } from "react";
import useModalA11y from "../hooks/useModalA11y.js";
export default function BillingModal({ onClose, t }) {
  const titleId = useId();
  const modalRef = useModalA11y({ active: true, onClose });
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" role="presentation" onClick={onClose}>
      <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="bg-[#131a2c] border border-[var(--border-subtle)] dark:border-white/[0.08] rounded-2xl w-full max-w-lg shadow-2xl focus:outline-none" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-subtle)] dark:border-white/[0.06]">
          <div className="flex items-center gap-2">
            <CreditCard size={16} className="text-emerald-400" />
            <h3 id={titleId} className="text-sm font-bold text-white">Billing &amp; Plan</h3>
          </div>
          <button onClick={onClose} aria-label={t?.close || "Close"} className="text-slate-500 hover:text-white transition"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-3 text-sm text-slate-300">
          <div className="flex items-center justify-between p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
            <div>
              <div className="text-xs text-slate-400">Current Plan</div>
              <div className="text-base font-bold text-cyan-400">Beta — Free</div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold tracking-wider uppercase">Beta</span>
          </div>
          <p>You are on the free Beta tier — full access to every feature. Paid plans will roll out after public launch.</p>
        </div>
      </div>
    </div>
  );
}
