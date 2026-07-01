import { useState, useEffect, useLayoutEffect, useCallback } from "react";
import { X } from "lucide-react";

// Homemade guided tour (wave 3a). Generic engine: it receives a `steps` array
// from the app and points spotlight bubbles at elements matched by `step.anchor`
// (a CSS selector, e.g. '[data-tour="main-nav"]'). A step with anchor === null
// renders a centered, anchorless bubble — used for features that aren't on screen
// for a brand-new user (e.g. Tilt Shield). Direction follows `isRTL`.

const BUBBLE_W = 320;
const SPOT_PAD = 8;

export default function OnboardingTour({ steps = [], onClose, t, isRTL }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const [vp, setVp] = useState(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : 1280,
    h: typeof window !== "undefined" ? window.innerHeight : 800,
  }));
  const total = steps.length;
  const step = steps[i];
  const anchor = step?.anchor || null;

  // Respect the OS "reduce motion" setting: skip smooth scroll + spotlight transition.
  const reduceMotion =
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  const recompute = useCallback(() => {
    if (!anchor) { setRect(null); return; }
    const el = document.querySelector(anchor);
    const r = el?.getBoundingClientRect();
    if (!r) { setRect(null); return; }
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [anchor]);

  // On step change: bring the anchor into view, then measure (after smooth scroll).
  useLayoutEffect(() => {
    const el = anchor ? document.querySelector(anchor) : null;
    if (el) { try { el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center", inline: "center" }); } catch {} }
    recompute();
    const id = setTimeout(recompute, 340);
    return () => clearTimeout(id);
  }, [i, anchor, recompute]);

  // Keep the bubble glued to the anchor while the page scrolls/resizes.
  // On resize we also refresh the viewport so the anchorless (centered) bubble
  // re-centers — recompute() alone bails out (setRect(null) is a no-op) for it.
  useEffect(() => {
    const onResize = () => { setVp({ w: window.innerWidth, h: window.innerHeight }); recompute(); };
    const onScroll = () => recompute();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true); // capture: catches inner scroll containers too
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [recompute]);

  // Esc closes (counts as completing — won't re-nag).
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!step) return null;

  const last = i === total - 1;
  const next = () => (last ? onClose?.() : setI(v => Math.min(v + 1, total - 1)));
  const back = () => setI(v => Math.max(v - 1, 0));

  const vw = vp.w;
  const vh = vp.h;

  let spotStyle = null;
  let bubbleStyle;
  if (rect) {
    spotStyle = {
      position: "fixed",
      top: rect.top - SPOT_PAD,
      left: rect.left - SPOT_PAD,
      width: rect.width + SPOT_PAD * 2,
      height: rect.height + SPOT_PAD * 2,
      boxShadow: "0 0 0 9999px rgba(3,7,18,0.72)",
    };
    const below = vh - (rect.top + rect.height) >= 190;
    let left = rect.left + rect.width / 2 - BUBBLE_W / 2;
    left = Math.max(12, Math.min(left, vw - BUBBLE_W - 12));
    bubbleStyle = {
      position: "fixed",
      width: BUBBLE_W,
      left,
      ...(below ? { top: rect.top + rect.height + 14 } : { bottom: vh - rect.top + 14 }),
    };
  } else {
    bubbleStyle = {
      position: "fixed",
      width: BUBBLE_W,
      left: Math.max(12, vw / 2 - BUBBLE_W / 2),
      top: Math.max(24, vh / 2 - 110),
    };
  }

  return (
    <div className="fixed inset-0 z-[120]" dir={isRTL ? "rtl" : "ltr"} role="dialog" aria-modal="true">
      {/* Click blocker — page is non-interactive during the tour */}
      <div className="absolute inset-0" />

      {/* Dim: spotlight box-shadow when anchored, full screen otherwise */}
      {rect ? (
        <div className={`rounded-xl ring-2 ring-cyan-400 pointer-events-none${reduceMotion ? "" : " transition-all duration-200"}`} style={spotStyle} />
      ) : (
        <div className="absolute inset-0 pointer-events-none" style={{ background: "rgba(3,7,18,0.72)" }} />
      )}

      {/* Bubble */}
      <div style={bubbleStyle} className="rounded-2xl border border-white/10 bg-[#0d1424] shadow-2xl p-4 text-slate-200">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h3 className="text-sm font-bold text-white leading-snug">{step.title}</h3>
          <button onClick={onClose} aria-label={t?.tourSkip || "Skip"} className="text-slate-500 hover:text-white transition shrink-0 -mt-0.5">
            <X size={15} />
          </button>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed mb-3">{step.body}</p>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-slate-500">{i + 1}/{total}</span>
          <div className="flex items-center gap-2">
            {i > 0 && (
              <button onClick={back} className="text-xs px-3 py-1.5 rounded-lg text-slate-300 hover:bg-white/5 transition">
                {t?.tourBack || "Back"}
              </button>
            )}
            <button onClick={next} className="text-xs px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-semibold transition">
              {last ? (t?.tourDone || "Got it") : (t?.tourNext || "Next")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
