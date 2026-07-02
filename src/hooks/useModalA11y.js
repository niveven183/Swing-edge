import { useEffect, useRef } from "react";

// Accessible-dialog behavior for any modal: focus-in on open, focus-trap,
// focus-restore on close, and Escape-to-close. ARIA attributes (role="dialog",
// aria-modal, aria-labelledby) and the title id live in each modal's markup.
//
// Escape is handled on the CONTAINER at bubble phase (never capture) so that
// SmartSelect's capture-phase document listener keeps preempting us: with a
// dropdown open the first Esc closes only the dropdown; the next Esc bubbles
// to the container and closes the modal.
//
// Usage:
//   const ref = useModalA11y({ active: open, onClose });
//   <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1}>
const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export default function useModalA11y({ active = true, onClose } = {}) {
  const containerRef = useRef(null);
  const previouslyFocused = useRef(null);
  // Hold the latest onClose in a ref so inline-arrow callers don't re-run the
  // effect (which would re-trap focus) on every render — only `active` does.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    previouslyFocused.current = document.activeElement;

    const focusables = () =>
      Array.from(container.querySelectorAll(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );

    const focusFirst = () => {
      const first = focusables()[0] || container;
      first?.focus?.();
    };
    // Sync focus survives StrictMode's dev remount (whose cleanup cancels the
    // rAF) and background-tab rAF throttling; the rAF is a follow-up for late layout.
    focusFirst();
    const raf = requestAnimationFrame(focusFirst);

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (e.key !== "Tab") return;
      const nodes = focusables();
      if (nodes.length === 0) {
        e.preventDefault();
        container.focus();
        return;
      }
      const firstEl = nodes[0];
      const lastEl = nodes[nodes.length - 1];
      const activeEl = document.activeElement;
      if (e.shiftKey && (activeEl === firstEl || activeEl === container)) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && activeEl === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    container.addEventListener("keydown", onKeyDown);

    return () => {
      cancelAnimationFrame(raf);
      container.removeEventListener("keydown", onKeyDown);
      const el = previouslyFocused.current;
      if (el && typeof el.focus === "function") el.focus();
    };
  }, [active]);

  return containerRef;
}
