// src/hooks/useBottomOverlay.js — report a fixed bottom banner's coverage to
// src/lib/bottomOverlay.js while `active`, and withdraw it when the banner goes away.
// Re-measured on resize (incl. the soft keyboard), on the element's own resize, and when its
// entry animation ends (a transform does not trigger ResizeObserver).
import { useEffect } from "react";
import { setOverlay, clearOverlay, coveredFromBottom } from "../lib/bottomOverlay.js";

export function useBottomOverlay(id, ref, active) {
  useEffect(() => {
    const el = ref.current;
    if (!active || !el) {
      clearOverlay(id);
      return undefined;
    }
    const measure = () => setOverlay(id, coveredFromBottom(el));
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (ro) ro.observe(el);
    window.addEventListener("resize", measure);
    el.addEventListener("animationend", measure);
    el.addEventListener("transitionend", measure);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener("resize", measure);
      el.removeEventListener("animationend", measure);
      el.removeEventListener("transitionend", measure);
      clearOverlay(id);
    };
  }, [id, ref, active]);
}
