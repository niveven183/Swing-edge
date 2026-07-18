import { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import { X } from "lucide-react";
import useModalA11y from "../hooks/useModalA11y.js";

// Homemade guided tour (wave 3a; wave 9: tab-navigating). Generic engine: it
// receives a `steps` array from the app. Each step points a spotlight bubble at
// the element matched by `step.anchor` (a CSS selector). A step may also declare
// `step.tab` — the engine calls `onNavigate(tab)` first, waits for that tab to
// render (retry poll), then measures the anchor. A step with anchor === null (or
// an anchor that never appears after the poll) renders a centered, anchorless
// bubble — never a silent skip, never a stuck step. Direction follows `isRTL`.
//
// onClose is called with a boolean: true when the user finishes the last step,
// false when they skip (X / Esc / "skip tour"). The app uses it to decide where
// to land (finish → Journal, skip → Dashboard).

const BUBBLE_W = 320;
const SPOT_PAD = 8;
const MOBILE_BP = 420; // below this the bubble docks to the bottom (sheet-style)
const POLL_TRIES = 12; // ~1.2s at ~100ms cadence, then fall back to centered

export default function OnboardingTour({ steps = [], onClose, onNavigate, t, isRTL }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const [vp, setVp] = useState(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : 1280,
    h: typeof window !== "undefined" ? window.innerHeight : 800,
  }));
  const total = steps.length;
  const step = steps[i];
  const anchor = step?.anchor || null;
  const stepTab = step?.tab || null;
  const last = i === total - 1;

  // Respect the OS "reduce motion" setting: skip smooth scroll + spotlight transition.
  const reduceMotion =
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  const finish = useCallback(() => onClose?.(true), [onClose]);
  const skip = useCallback(() => onClose?.(false), [onClose]);
  const goBack = useCallback(() => setI((v) => Math.max(v - 1, 0)), []);
  const goNext = useCallback(() => setI((v) => Math.min(v + 1, total - 1)), [total]);

  const recompute = useCallback(() => {
    if (!anchor) { setRect(null); return; }
    const el = document.querySelector(anchor);
    const r = el?.getBoundingClientRect();
    if (!r || (r.width === 0 && r.height === 0)) { setRect(null); return; }
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [anchor]);

  // On step change: switch to the step's tab (if any), then poll for the anchor
  // (tab content mounts async). First hit → measure + settle after smooth scroll.
  // If it never shows within the poll window, rect stays null → centered fallback.
  useLayoutEffect(() => {
    if (stepTab) { try { onNavigate?.(stepTab); } catch {} }
    setRect(null);
    let timer = 0;
    let tries = 0;
    const settle = () => {
      const el = anchor ? document.querySelector(anchor) : null;
      if (el) {
        try { el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center", inline: "center" }); } catch {}
        recompute();
        timer = window.setTimeout(recompute, 320); // re-measure after scroll settles
        return;
      }
      if (!anchor) { recompute(); return; } // intentional centered step
      if (tries++ < POLL_TRIES) timer = window.setTimeout(settle, 100);
      // else: give up quietly → centered fallback bubble
    };
    settle();
    return () => { if (timer) clearTimeout(timer); };
  }, [i, anchor, stepTab, onNavigate, recompute, reduceMotion]);

  // Keep the bubble glued to the anchor while the page scrolls/resizes.
  useEffect(() => {
    const onResize = () => { setVp({ w: window.innerWidth, h: window.innerHeight }); recompute(); };
    const onScroll = () => recompute();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [recompute]);

  // Arrow-key navigation (Esc + Tab-trap are owned by useModalA11y on the bubble).
  // Latest handlers via ref so the listener attaches once and never re-traps.
  const navRef = useRef({ next: () => {}, back: () => {} });
  navRef.current.next = last ? finish : goNext;
  navRef.current.back = goBack;
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); navRef.current.next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); navRef.current.back(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const bubbleRef = useModalA11y({ active: true, onClose: skip });

  if (!step) return null;

  const vw = vp.w;
  const vh = vp.h;
  const isMobile = vw < MOBILE_BP;
  const bubbleW = Math.min(BUBBLE_W, vw - 24);

  let spotStyle = null;
  let bubbleStyle;
  if (isMobile) {
    // Bottom sheet — never clips the spotlight or overflows a narrow screen.
    spotStyle = rect
      ? {
          position: "fixed",
          top: rect.top - SPOT_PAD,
          left: rect.left - SPOT_PAD,
          width: rect.width + SPOT_PAD * 2,
          height: rect.height + SPOT_PAD * 2,
          boxShadow: "0 0 0 9999px rgba(3,7,18,0.72)",
        }
      : null;
    bubbleStyle = { position: "fixed", width: bubbleW, left: (vw - bubbleW) / 2, bottom: 16 };
  } else if (rect) {
    spotStyle = {
      position: "fixed",
      top: rect.top - SPOT_PAD,
      left: rect.left - SPOT_PAD,
      width: rect.width + SPOT_PAD * 2,
      height: rect.height + SPOT_PAD * 2,
      boxShadow: "0 0 0 9999px rgba(3,7,18,0.72)",
    };
    const below = vh - (rect.top + rect.height) >= 190;
    let left = rect.left + rect.width / 2 - bubbleW / 2;
    left = Math.max(12, Math.min(left, vw - bubbleW - 12));
    bubbleStyle = {
      position: "fixed",
      width: bubbleW,
      left,
      ...(below ? { top: rect.top + rect.height + 14 } : { bottom: vh - rect.top + 14 }),
    };
  } else {
    bubbleStyle = {
      position: "fixed",
      width: bubbleW,
      left: Math.max(12, vw / 2 - bubbleW / 2),
      top: Math.max(24, vh / 2 - 110),
    };
  }

  return (
    <div className="fixed inset-0 z-[120]" dir={isRTL ? "rtl" : "ltr"}>
      {/* Click blocker — page is non-interactive during the tour */}
      <div className="absolute inset-0" />

      {/* Dim: spotlight box-shadow when anchored, full screen otherwise */}
      {spotStyle ? (
        <div className={`rounded-xl ring-2 ring-cyan-400 pointer-events-none${reduceMotion ? "" : " transition-all duration-200"}`} style={spotStyle} />
      ) : (
        <div className="absolute inset-0 pointer-events-none" style={{ background: "rgba(3,7,18,0.72)" }} />
      )}

      {/* Bubble */}
      <div
        ref={bubbleRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        style={bubbleStyle}
        className="rounded-2xl border border-white/10 bg-[#0d1424] shadow-2xl p-4 text-slate-200 focus:outline-none"
      >
        <div className="flex items-start justify-between gap-3 mb-1">
          <h3 className="text-sm font-bold text-white leading-snug">{step.title}</h3>
          <button onClick={skip} aria-label={t?.tourSkipAll || t?.tourSkip || "Skip"} className="text-slate-500 hover:text-white transition shrink-0 -mt-0.5">
            <X size={15} />
          </button>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed mb-3">{step.body}</p>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-mono text-slate-500 shrink-0">{i + 1}/{total}</span>
            <button onClick={skip} className="text-[10px] text-slate-500 hover:text-slate-300 transition truncate">
              {t?.tourSkipAll || "Skip tour"}
            </button>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {i > 0 && (
              <button onClick={goBack} className="text-xs px-3 py-1.5 rounded-lg text-slate-300 hover:bg-white/5 transition">
                {t?.tourBack || "Back"}
              </button>
            )}
            <button onClick={last ? finish : goNext} className="text-xs px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-semibold transition">
              {last ? (t?.tourDone || "Got it") : (t?.tourNext || "Next")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
