import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';

// The "?" toggletip (wave 3, 13.11 — tests-eye/tooltip.spec.js · red-before scripts/eye-tooltip-probe.mjs).
//
// U5 — measured red on the old component: it opened on `mouseenter` unconditionally AND toggled on
// `click`. A touch tap fires both (compatibility mouse events) ⇒ open + close in one gesture ⇒ the
// bubble never appeared on a phone; a desktop click did the same after the hover had opened it.
// Now: hover opens ONLY for a real mouse on a (hover: hover) device (`pointerType === 'mouse'` — the
// compatibility events of a tap are mouse events, ⛔ pointer events of type mouse); a click/tap toggles;
// a click on a bubble that hover opened PINS it instead of closing it.
//
// Geometry: below 640px a bottom sheet (full width, flush with the bottom, ≤70vh, scrolls). Above it a
// bubble ≤320px wide, ≤min(60vh,360px) tall (scrolls), with the arrow under the trigger's real centre
// (the bubble is clamped into the viewport; the arrow is not). ✕ at the inline END (`end-2`).
// A11y: button aria-expanded/aria-controls + the content in a role=status region (toggletip pattern;
// role=tooltip is for hover/focus hints, ⛔ for content opened by a click).
// Portal: the bubble renders into document.body. Inline, `position: fixed` was anchored to whichever
// ancestor had a transform/filter (cards, panels) ⇒ measured 13.11: a 382px "sheet" in a 390px
// iPhone viewport, and a sheet lying over its own "?" so the second tap could not reach it.
// `children` may be a function ({ close }) => node, so content can close the bubble (TermTooltip's
// "more in glossary" link).

const SHEET_BELOW = 640;
const BUBBLE_W = 320;
const MARGIN = 8;
const hoverDevice = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;

export default function InfoTooltip({ children, label = 'More info', closeLabel = 'Close', dir }) {
  const [open, setOpen] = useState(false);
  const [geo, setGeo] = useState(null);
  const openedBy = useRef(null);
  const triggerRef = useRef(null);
  const popRef = useRef(null);
  const leaveTimer = useRef(null);
  const regionId = useId();

  const close = useCallback(() => {
    clearTimeout(leaveTimer.current);
    openedBy.current = null;
    setOpen(false);
    setGeo(null);
  }, []);

  const place = useCallback(() => {
    const t = triggerRef.current?.getBoundingClientRect();
    if (!t) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (vw < SHEET_BELOW) { setGeo({ sheet: true }); return; }
    const width = Math.min(BUBBLE_W, vw - 2 * MARGIN);
    const h = popRef.current?.getBoundingClientRect().height || 160;
    const cx = t.left + t.width / 2;
    const left = Math.max(MARGIN, Math.min(cx - width / 2, vw - width - MARGIN));
    const above = t.top;
    const below = vh - t.bottom;
    const placement = above >= h + MARGIN ? 'top' : below >= h + MARGIN ? 'bottom' : above > below ? 'top' : 'bottom';
    const top = placement === 'top' ? Math.max(MARGIN, t.top - h - MARGIN) : Math.min(t.bottom + MARGIN, Math.max(MARGIN, vh - h - MARGIN));
    const arrowX = Math.max(12, Math.min(cx - left, width - 12));
    setGeo({ sheet: false, top, left, width, placement, arrowX });
  }, []);

  // First placement before paint; a second one after the content has a real height.
  useLayoutEffect(() => { if (open) place(); }, [open, place]);
  useEffect(() => {
    if (!open) return;
    const r = requestAnimationFrame(place);
    return () => cancelAnimationFrame(r);
  }, [open, place]);

  // A sheet that lands on its own "?" (trigger low on the page) scrolls the page just enough to keep the
  // "?" above it — otherwise the second tap hits the sheet and cannot close it (measured 13.11, pixel7).
  const sheetNow = !!geo?.sheet;
  useEffect(() => {
    if (!open || !sheetNow) return;
    const r = requestAnimationFrame(() => {
      const t = triggerRef.current?.getBoundingClientRect();
      const p = popRef.current?.getBoundingClientRect();
      if (t && p && t.bottom > p.top - MARGIN) window.scrollBy({ top: t.bottom - p.top + 2 * MARGIN, behavior: 'auto' });
    });
    return () => cancelAnimationFrame(r);
  }, [open, sheetNow]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') { close(); triggerRef.current?.focus(); } };
    const onDown = (e) => {
      if (!triggerRef.current?.contains(e.target) && !popRef.current?.contains(e.target)) close();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, close, place]);

  useEffect(() => () => clearTimeout(leaveTimer.current), []);

  const onPointerEnter = (e) => {
    if (e.pointerType !== 'mouse' || !hoverDevice()) return;
    clearTimeout(leaveTimer.current);
    if (!open) { openedBy.current = 'hover'; setOpen(true); }
  };
  const onPointerLeave = (e) => {
    if (e.pointerType !== 'mouse' || openedBy.current !== 'hover') return;
    clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => {
      if (openedBy.current === 'hover' && !popRef.current?.matches(':hover') && !triggerRef.current?.matches(':hover')) close();
    }, 150);
  };
  const onClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (open && openedBy.current === 'hover') { openedBy.current = 'click'; return; } // pin, ⛔ close
    if (open) { close(); return; }
    openedBy.current = 'click';
    setOpen(true);
  };

  const sheet = geo?.sheet;
  const surface = 'bg-white dark:bg-slate-900 border-slate-200 dark:border-white/[0.08]';

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? regionId : undefined}
        onClick={onClick}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        className="
          inline-flex items-center justify-center
          w-[20px] h-[20px] rounded-full
          border-2 border-slate-400 dark:border-slate-600
          text-slate-500 dark:text-slate-400 text-[11px] font-bold
          bg-white dark:bg-white/[0.06]
          hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50
          dark:hover:border-emerald-400 dark:hover:text-emerald-400 dark:hover:bg-emerald-500/10
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400
          transition-all duration-150
          select-none flex-shrink-0
          cursor-pointer
          relative z-10
          before:absolute before:content-[''] before:-inset-3
        "
        style={{ lineHeight: 1, pointerEvents: 'auto', touchAction: 'manipulation' }}
      >
        ?
      </button>

      {open && geo && createPortal(
        <div
          ref={popRef}
          data-term-pop=""
          dir={dir}
          onPointerEnter={(e) => { if (e.pointerType === 'mouse') clearTimeout(leaveTimer.current); }}
          onPointerLeave={onPointerLeave}
          style={sheet
            ? { position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 9999 }
            : { position: 'fixed', top: geo.top, left: geo.left, width: geo.width, zIndex: 9999 }}
          className={`normal-case pointer-events-auto animate-fadeUpSoft ${surface} border shadow-[0_8px_32px_rgba(15,20,15,0.16),0_2px_8px_rgba(15,20,15,0.08)] ${sheet ? 'rounded-t-2xl border-b-0 border-x-0' : 'rounded-xl'}`}
        >
          {!sheet && (
            <div
              data-term-arrow=""
              aria-hidden="true"
              className={`absolute w-3 h-3 ${surface} ${geo.placement === 'bottom' ? 'top-[-7px] border-t border-l' : 'bottom-[-7px] border-b border-r'}`}
              style={{ left: geo.arrowX, transform: 'translateX(-50%) rotate(45deg)' }}
            />
          )}
          <div
            className="relative overflow-y-auto overscroll-contain p-4 pe-9"
            style={{ maxHeight: sheet ? '70vh' : 'min(60vh, 360px)' }}
          >
            <div
              id={regionId}
              role="status"
              aria-live="polite"
              className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-100 font-normal"
            >
              {typeof children === 'function' ? children({ close }) : children}
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); close(); triggerRef.current?.focus(); }}
            className="
              absolute top-2 end-2
              w-7 h-7 rounded-full
              flex items-center justify-center
              text-slate-400 hover:text-slate-700 hover:bg-slate-100
              dark:text-slate-500 dark:hover:text-slate-200 dark:hover:bg-white/[0.08]
              text-xs transition-all
            "
            aria-label={closeLabel}
          >
            ✕
          </button>
        </div>,
        document.body
      )}
    </>
  );
}
