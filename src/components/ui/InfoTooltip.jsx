import React, { useId, useRef, useState, useEffect, useCallback } from "react";

/**
 * InfoTooltip — small "?" trigger that opens an accessible popover.
 *
 * Props:
 *   label    string  — required, used for aria-label on the trigger
 *   children node    — popover content
 *   side     "auto" | "left" | "right"  — popover side (default: "auto")
 */
export default function InfoTooltip({ label, children, side = "auto" }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const popId = useId();

  // Close on outside click + Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const resolvedSide =
    side !== "auto"
      ? side
      : (typeof document !== "undefined" && document.documentElement.dir === "rtl")
        ? "left"
        : "right";

  const popoverPos =
    resolvedSide === "left"
      ? { right: "calc(100% + 8px)", left: "auto" }
      : { left: "calc(100% + 8px)", right: "auto" };

  const onToggle = useCallback(() => setOpen((v) => !v), []);
  const onEnter  = useCallback(() => setOpen(true), []);
  const onLeave  = useCallback(() => setOpen(false), []);

  return (
    <span
      ref={wrapRef}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
    >
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? popId : undefined}
        aria-expanded={open}
        onClick={onToggle}
        onFocus={onEnter}
        onBlur={onLeave}
        style={{
          width: 14,
          height: 14,
          borderRadius: "var(--radius-pill)",
          border: "1px solid var(--border-soft)",
          background: "transparent",
          color: "var(--text-muted)",
          fontSize: 9,
          fontWeight: 600,
          lineHeight: 1,
          cursor: "help",
          padding: 0,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "color var(--transition-fast), border-color var(--transition-fast)",
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.color = "var(--text-secondary)";
          e.currentTarget.style.borderColor = "var(--border-strong)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.color = "var(--text-muted)";
          e.currentTarget.style.borderColor = "var(--border-soft)";
        }}
      >
        ?
      </button>

      <span
        id={popId}
        role="tooltip"
        style={{
          position: "absolute",
          top: "50%",
          ...popoverPos,
          transform: open
            ? "translateY(-50%) translateY(0)"
            : "translateY(-50%) translateY(4px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          background: "var(--surface-elevated)",
          color: "var(--text-secondary)",
          boxShadow: "var(--shadow-lifted)",
          border: "1px solid var(--border-soft)",
          borderRadius: "var(--radius-md)",
          padding: "var(--space-3)",
          fontFamily: "var(--font-body)",
          fontSize: 12,
          lineHeight: 1.4,
          maxWidth: 280,
          minWidth: 160,
          width: "max-content",
          zIndex: 60,
          transition:
            "opacity var(--transition-fast), transform var(--transition-fast)",
        }}
      >
        {children}
      </span>
    </span>
  );
}
