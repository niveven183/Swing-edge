import { useEffect, useState } from "react";
import { Share, Plus, X, Smartphone } from "lucide-react";

const DISMISS_KEY = "swingEdgeIosInstallDismissed";

const isIOS = () => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isIPhone = /iPhone|iPad|iPod/.test(ua);
  // iPadOS 13+ reports as Mac — detect via touch support
  const isIPadOS =
    navigator.platform === "MacIntel" && (navigator.maxTouchPoints || 0) > 1;
  return isIPhone || isIPadOS;
};

const isStandalone = () => {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.navigator.standalone === true
  );
};

export default function IOSInstallBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {}
    if (!isIOS() || isStandalone()) return;
    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      dir="rtl"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[90] w-[min(92vw,460px)] rounded-2xl border border-cyan-500/30 bg-[#0d1424]/95 backdrop-blur-md shadow-2xl shadow-black/50 p-4"
      style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
    >
      <button
        onClick={dismiss}
        aria-label="סגור"
        className="absolute top-2 left-2 text-slate-500 hover:text-white transition"
      >
        <X size={16} />
      </button>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center shrink-0">
          <Smartphone size={20} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white mb-1">
            📱 התקן את SwingEdge
          </p>
          <p className="text-xs text-slate-400 leading-relaxed mb-2">
            קבל גישה מהירה מהמסך הראשי — בלי להיכנס לדפדפן.
          </p>
          <div className="flex items-center gap-2 text-[11px] text-slate-300 flex-wrap">
            <span>לחץ</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/10">
              <Share size={12} className="text-cyan-400" /> Share
            </span>
            <span>ואז</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/10">
              <Plus size={12} className="text-cyan-400" /> Add to Home Screen
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
