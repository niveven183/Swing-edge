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
    const pop = popoverRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const MARGIN = 8;
    const POPOVER_W = 280;

    let left = trigger.left + trigger.width / 2 - POPOVER_W / 2;
    if (left + POPOVER_W + MARGIN > vw) left = vw - POPOVER_W - MARGIN;
    if (left < MARGIN) left = MARGIN;

    const spaceBelow = vh - trigger.bottom;
    const spaceAbove = trigger.top;
    const placement = spaceBelow >= 160 || spaceBelow >= spaceAbove ? 'bottom' : 'top';

    const top = placement === 'bottom'
      ? trigger.bottom + window.scrollY + 8
      : trigger.top + window.scrollY - (pop.height || 120) - 8;

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
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        onMouseEnter={openTooltip}
        onMouseLeave={() => {
          setTimeout(() => {
            if (!popoverRef.current?.matches(':hover')) setOpen(false);
          }, 150);
        }}
        className="
          inline-flex items-center justify-center
          w-[18px] h-[18px] rounded-full
          border border-slate-300
          text-slate-400 text-[10px] font-semibold
          hover:border-emerald-400 hover:text-emerald-500 hover:bg-emerald-50
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400
          transition-all duration-150
          select-none flex-shrink-0
          cursor-pointer
        "
        style={{ lineHeight: 1 }}
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
