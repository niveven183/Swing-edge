import React, { useState, useRef, useEffect, useCallback, useId } from 'react';

export default function InfoTooltip({ children, label = 'More info', side = 'auto' }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, placement: 'bottom' });
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const tooltipId = useId();

  const recalcPosition = useCallback(() => {
    if (!triggerRef.current || !popoverRef.current) return;

    const trigger = triggerRef.current.getBoundingClientRect();
    const POPOVER_W = 280;
    const POPOVER_H = popoverRef.current.getBoundingClientRect().height || 160;
    const MARGIN = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = trigger.left + trigger.width / 2 - POPOVER_W / 2;
    left = Math.max(MARGIN, Math.min(left, vw - POPOVER_W - MARGIN));

    const spaceAbove = trigger.top;
    const spaceBelow = vh - trigger.bottom;

    let placement, top;
    if (spaceAbove >= POPOVER_H + MARGIN) {
      placement = 'top';
      top = trigger.top - POPOVER_H - MARGIN;
    } else if (spaceBelow >= POPOVER_H + MARGIN) {
      placement = 'bottom';
      top = trigger.bottom + MARGIN;
    } else {
      placement = 'top';
      top = Math.max(MARGIN, trigger.top - POPOVER_H - MARGIN);
    }

    setPos({ top, left, placement });
  }, []);

  const openTooltip = useCallback(() => setOpen(true), []);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => recalcPosition());
    }
  }, [open, recalcPosition]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    const onClick = (e) => {
      if (
        !triggerRef.current?.contains(e.target) &&
        !popoverRef.current?.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('touchstart', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('touchstart', onClick);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener('resize', recalcPosition);
    return () => window.removeEventListener('resize', recalcPosition);
  }, [open, recalcPosition]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(v => !v);
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => {
          setTimeout(() => {
            if (!popoverRef.current?.matches(':hover')) setOpen(false);
          }, 150);
        }}
        className="
          inline-flex items-center justify-center
          w-[20px] h-[20px] rounded-full
          border-2 border-slate-400
          text-slate-500 text-[11px] font-bold
          bg-white
          hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400
          transition-all duration-150
          select-none flex-shrink-0
          cursor-pointer
          relative z-10
        "
        style={{
          lineHeight: 1,
          pointerEvents: 'auto',
        }}
      >
        ?
      </button>

      {open && (
        <div
          ref={popoverRef}
          id={tooltipId}
          role="tooltip"
          onMouseEnter={openTooltip}
          onMouseLeave={() => setOpen(false)}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: 280,
            zIndex: 9999,
          }}
          className="
            bg-white
            rounded-xl
            border border-slate-200
            shadow-[0_8px_32px_rgba(15,20,15,0.12),0_2px_8px_rgba(15,20,15,0.06)]
            p-4
            animate-fadeUpSoft
            pointer-events-auto
          "
        >
          <div
            className={`
              absolute w-3 h-3 bg-white border-slate-200
              ${pos.placement === 'bottom'
                ? 'top-[-7px] border-t border-l'
                : 'bottom-[-7px] border-b border-r'}
            `}
            style={{ left: '50%', transform: 'translateX(-50%) rotate(45deg)' }}
          />

          <div
            className="text-[13px] leading-relaxed text-slate-700 font-normal"
            style={{ direction: 'inherit' }}
          >
            {children}
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); }}
            className="
              absolute top-2 right-2
              w-6 h-6 rounded-full
              flex items-center justify-center
              text-slate-400 hover:text-slate-700 hover:bg-slate-100
              text-xs md:hidden transition-all
            "
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
