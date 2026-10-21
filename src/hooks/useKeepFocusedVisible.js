// src/hooks/useKeepFocusedVisible.js — B-446 G1 (Niv 21.10): a modal whose actions live in a FIXED
// footer must never let that footer — or the on-screen keyboard — sit on the field being typed into.
//
// WHY. iOS Safari does not shrink the layout viewport when the keyboard opens; it shrinks the VISUAL
// viewport (`window.visualViewport`). A `fixed inset-0` modal keeps its full height, so its lower part
// (the footer and whatever field is scrolled next to it) ends up under the keyboard, and the browser's
// own focus-scroll does not know about our footer. This keeps the focused field inside the band
// [body top, min(body bottom, footer top, visual-viewport bottom)] by scrolling the modal BODY, and
// gives the body a bottom reserve equal to the keyboard's cover so there is room to scroll into.
//
// Usage: useKeepFocusedVisible(bodyRef, footerRef, open)  — bodyRef = the scrolling body.
import { useEffect } from "react";

const FIELD = "input, select, textarea, [contenteditable='true']";
const MARGIN = 8;

/** Pure: how far (px) the body must scroll so the field sits inside the visible band. 0 = already in. */
export function scrollDelta(field, band) {
  if (field.bottom > band.bottom - MARGIN) return field.bottom - (band.bottom - MARGIN);
  if (field.top < band.top + MARGIN) return field.top - (band.top + MARGIN);
  return 0;
}

export default function useKeepFocusedVisible(bodyRef, footerRef, active) {
  useEffect(() => {
    const body = bodyRef.current;
    if (!active || !body || typeof window === "undefined") return undefined;
    const vv = window.visualViewport || null;
    const basePad = parseFloat(getComputedStyle(body).paddingBottom) || 0;

    const fit = () => {
      const b = body.getBoundingClientRect();
      const vvTop = vv ? vv.offsetTop : 0;
      const vvBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
      // The keyboard's cover of THIS body ⇒ that much extra room at its end (0 when closed).
      const kb = Math.max(0, Math.round(b.bottom - vvBottom));
      body.style.paddingBottom = kb > 0 ? `${basePad + kb}px` : "";
      const el = document.activeElement;
      if (!el || !body.contains(el) || !el.matches?.(FIELD)) return;
      const footTop = footerRef?.current ? footerRef.current.getBoundingClientRect().top : Infinity;
      const band = { top: Math.max(b.top, vvTop), bottom: Math.min(b.bottom, footTop, vvBottom) };
      const dy = scrollDelta(el.getBoundingClientRect(), band);
      // `instant`: the app sets `scroll-behavior: smooth`, under which a scroll lands frames later.
      if (dy) body.scrollBy({ top: dy, behavior: "instant" });
    };
    const onFocus = () => requestAnimationFrame(fit);

    body.addEventListener("focusin", onFocus);
    vv?.addEventListener("resize", fit);
    vv?.addEventListener("scroll", fit);
    window.addEventListener("resize", fit);
    return () => {
      body.removeEventListener("focusin", onFocus);
      vv?.removeEventListener("resize", fit);
      vv?.removeEventListener("scroll", fit);
      window.removeEventListener("resize", fit);
      body.style.paddingBottom = "";
    };
  }, [active, bodyRef, footerRef]);
}
