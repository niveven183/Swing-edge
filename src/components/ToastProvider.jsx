import { createContext, useContext, useCallback, useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

const ToastCtx = createContext(null);

export function useToast() {
  const ctx = useContext(ToastCtx);
  return ctx || { success: () => {}, error: () => {}, info: () => {} };
}

let idSeq = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback((kind, message, duration = 3000) => {
    const id = idSeq++;
    setToasts((t) => [...t, { id, kind, message }]);
    if (duration > 0) setTimeout(() => remove(id), duration);
  }, [remove]);

  const api = {
    success: (msg, d) => push("success", msg, d),
    error: (msg, d) => push("error", msg, d),
    info: (msg, d) => push("info", msg, d),
  };

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="fixed top-16 right-4 rtl:right-auto rtl:left-4 z-[100] flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

function Toast({ toast, onClose }) {
  const { kind, message } = toast;
  const styles = {
    success: { border: "border-emerald-500/40", bg: "bg-emerald-500/10", text: "text-emerald-200", Icon: CheckCircle2, iconColor: "text-emerald-400" },
    error: { border: "border-rose-500/40", bg: "bg-rose-500/10", text: "text-rose-200", Icon: AlertTriangle, iconColor: "text-rose-400" },
    info: { border: "border-cyan-500/40", bg: "bg-cyan-500/10", text: "text-cyan-200", Icon: Info, iconColor: "text-cyan-400" },
  };
  const s = styles[kind] || styles.info;
  const Icon = s.Icon;
  return (
    <div className={`pointer-events-auto flex items-start gap-2 rounded-xl ${s.bg} border ${s.border} ${s.text} px-4 py-3 shadow-2xl backdrop-blur-md animate-fade-in`}>
      <Icon size={16} className={`${s.iconColor} shrink-0 mt-0.5`} />
      <span className="flex-1 text-xs leading-relaxed">{message}</span>
      <button onClick={onClose} className="text-slate-400 hover:text-white transition shrink-0">
        <X size={14} />
      </button>
    </div>
  );
}

// ─── CONFIRM DIALOG ──────────────────────────────────────────────────────────
const ConfirmCtx = createContext(null);

export function useConfirm() {
  const ctx = useContext(ConfirmCtx);
  return ctx || (async () => window.confirm("Are you sure?"));
}

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);

  const confirm = useCallback((opts) => {
    return new Promise((resolve) => {
      setState({
        title: opts?.title || "Confirm Action",
        message: opts?.message || "Are you sure?",
        confirmText: opts?.confirmText || "Confirm",
        cancelText: opts?.cancelText || "Cancel",
        danger: opts?.danger ?? true,
        resolve,
      });
    });
  }, []);

  const close = (result) => {
    if (state?.resolve) state.resolve(result);
    setState(null);
  };

  useEffect(() => {
    if (!state) return;
    const onKey = (e) => {
      if (e.key === "Escape") close(false);
      if (e.key === "Enter") close(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state]);

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {state && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => close(false)}>
          <div onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-[#0d1424] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
              <AlertTriangle size={16} className={state.danger ? "text-rose-400" : "text-amber-400"} />
              <span className="text-sm font-bold text-white">{state.title}</span>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-slate-300 leading-relaxed">{state.message}</p>
            </div>
            <div className="px-5 py-3 border-t border-white/[0.06] bg-black/20 flex gap-2 justify-end">
              <button onClick={() => close(false)}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-xs hover:bg-white/10 transition">
                {state.cancelText}
              </button>
              <button onClick={() => close(true)}
                className={`px-4 py-2 rounded-lg text-xs font-bold text-white transition ${state.danger ? "bg-rose-500 hover:bg-rose-400" : "bg-cyan-500 hover:bg-cyan-400"}`}>
                {state.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmCtx.Provider>
  );
}

// ─── TOOLTIP ─────────────────────────────────────────────────────────────────
export function Tooltip({ label, children, position = "top" }) {
  const [show, setShow] = useState(false);
  const positions = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-1.5",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-1.5",
    left: "right-full top-1/2 -translate-y-1/2 mr-1.5",
    right: "left-full top-1/2 -translate-y-1/2 ml-1.5",
  };
  return (
    <span className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} onFocus={() => setShow(true)} onBlur={() => setShow(false)}>
      {children}
      {show && label && (
        <span className={`absolute ${positions[position] || positions.top} z-50 px-2 py-1 rounded-md bg-[#0a0f1e] border border-white/10 text-[10px] text-slate-200 font-medium whitespace-nowrap shadow-xl pointer-events-none`}>
          {label}
        </span>
      )}
    </span>
  );
}
