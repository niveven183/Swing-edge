import { useEffect, useRef, useState } from "react";
import { Share, Plus, X, Smartphone } from "lucide-react";
import { readConsent, subscribeConsent } from "../lib/consent.js";
import { useBottomOverlay } from "../hooks/useBottomOverlay.js";

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

// A modal is open somewhere in the document (Log Trade, close-trade, confirm …).
const modalOpen = () =>
  typeof document !== "undefined" && document.querySelector('[aria-modal="true"]') !== null;

// B-405 — `ready` comes from the app: the user has done a first real thing (logged a trade)
// and is not inside onboarding or the tour. Measured 04.10: shown 1.5s after the consent
// choice, the banner covered the FAB and Log Trade on every iPhone — on the very screens a new
// user needs first. ⛔ It also never sits over an open modal.
export default function IOSInstallBanner({ ready }) {
  const [visible, setVisible] = useState(false);
  const [modal, setModal] = useState(modalOpen);
  const cardRef = useRef(null);

  useEffect(() => {
    // Only where the banner can exist at all: every DOM mutation runs the callback, so
    // Android/desktop (and an installed PWA) never pay for it.
    if (typeof MutationObserver === "undefined" || !isIOS() || isStandalone()) return undefined;
    const mo = new MutationObserver(() => setModal(modalOpen()));
    mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["aria-modal"] });
    return () => mo.disconnect();
  }, []);

  const shown = visible && ready === true && !modal;
  useBottomOverlay("ios", cardRef, shown);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {}
    if (!isIOS() || isStandalone()) return;

    // Two banners stacked at the bottom would bury the consent banner, which has to
    // stay visible. Hold until the consent choice is made, then arm normally.
    let timer;
    const arm = () => {
      timer = setTimeout(() => setVisible(true), 1500);
    };
    if (readConsent() !== null) arm();
    const unsubscribe = subscribeConsent(arm);

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setVisible(false);
  };

  if (!shown) return null;

  return (
    <div
      ref={cardRef}
      dir="rtl"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[90] w-[min(92vw,460px)] rounded-2xl border border-cyan-500/30 bg-[var(--bg-elevated)] dark:bg-[#0d1424]/95 backdrop-blur-md shadow-2xl shadow-black/50 p-4"
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
