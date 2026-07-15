// ─────────────────────────────────────────────────────────────────────────────
// SmartSelect — styled listbox replacing the native <select> for the three
// trade-context fields (Setup / Market / Emotion). NOT a <select>: a WAI-ARIA
// listbox with a thumbnail per option and a hover/keyboard PREVIEW pane.
//
// Portals: the panel and the preview are createPortal'd to <body> because the
// three host forms sit inside a modal with `overflow-hidden` + an inner
// `overflow-y-auto` + a backdrop-blur containing block — an inline panel would
// be clipped twice. Fixed positioning off the trigger's rect escapes all of it.
//
// Dark island: the host forms hardcode a dark palette (#0d1424 / text-white)
// regardless of app theme, so this control does too — one place, right here.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef, useEffect, useLayoutEffect, useCallback, useId } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";

const UI = {
  trigger:    "#0d1424",
  panel:      "#131a2c",
  border:     "rgba(255,255,255,0.10)",
  borderSoft: "rgba(255,255,255,0.06)",
  text:       "#F8FAFC",
  textDim:    "#94A3B8",
  accent:     "#10B981",
  accentSoft: "rgba(16,185,129,0.14)",
  ring:       "rgba(16,185,129,0.55)",
};

const PANEL_MAX_H = 320;
const PREVIEW_W = 184;
const GAP = 6;
const MARGIN = 8;

export default function SmartSelect({
  value,
  onChange,
  options = [],
  renderThumb,
  renderPreview,
  getOptionLabel,
  dir = "ltr",
  id,
  ariaLabel,
  className = "",
}) {
  const displayLabel = (v) => (getOptionLabel ? getOptionLabel(v) : v);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0, width: 0, placement: "bottom" });
  const [previewPos, setPreviewPos] = useState(null);

  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const optionRefs = useRef([]);
  const listboxId = useId();
  const isRTL = dir === "rtl";

  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const optionId = (i) => `${listboxId}-opt-${i}`;
  const activeOption = open ? options[activeIndex] : null;

  // ── Positioning ────────────────────────────────────────────────────────────
  const recalcPanel = useCallback(() => {
    const t = triggerRef.current?.getBoundingClientRect();
    if (!t) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const measured = panelRef.current?.offsetHeight || 0;
    const height = Math.min(measured || PANEL_MAX_H, PANEL_MAX_H);

    let left = t.left;
    left = Math.max(MARGIN, Math.min(left, vw - t.width - MARGIN));

    const spaceBelow = vh - t.bottom;
    const spaceAbove = t.top;
    let placement, top;
    if (spaceBelow >= height + GAP || spaceBelow >= spaceAbove) {
      placement = "bottom";
      top = t.bottom + GAP;
    } else {
      placement = "top";
      top = Math.max(MARGIN, t.top - height - GAP);
    }
    setPanelPos({ top, left, width: t.width, placement });
  }, []);

  const recalcPreview = useCallback(() => {
    // Wait until recalcPanel has committed a real fixed position; otherwise we'd
    // measure the panel at its initial flow rect and pin the preview top-left.
    if (!panelPos.width) return;
    const p = panelRef.current?.getBoundingClientRect();
    const row = optionRefs.current[activeIndex]?.getBoundingClientRect();
    if (!p || !row) { setPreviewPos(null); return; }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const h = 132; // approximate; clamped below

    // Prefer inline-end (right for LTR, left for RTL); flip if it won't fit.
    let left;
    const endLeft = p.right + GAP;
    const startLeft = p.left - PREVIEW_W - GAP;
    if (!isRTL) {
      left = endLeft + PREVIEW_W + MARGIN <= vw ? endLeft : startLeft;
    } else {
      left = startLeft >= MARGIN ? startLeft : endLeft;
    }
    left = Math.max(MARGIN, Math.min(left, vw - PREVIEW_W - MARGIN));

    let top = row.top + row.height / 2 - h / 2;
    top = Math.max(MARGIN, Math.min(top, vh - h - MARGIN));
    setPreviewPos({ top, left });
  }, [activeIndex, isRTL, panelPos]);

  // On open, reset the active row to the current selection — synchronously, so
  // panel/preview positioning below reads the right row before the first paint.
  useLayoutEffect(() => {
    if (open) setActiveIndex(selectedIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Place the panel before paint (no rAF race → no flash at the top-left origin).
  useLayoutEffect(() => {
    if (!open) return;
    recalcPanel();
  }, [open, recalcPanel]);

  // Place the preview AFTER the panel commits: keyed on panelPos so it re-runs
  // once recalcPanel writes a real rect, and on activeIndex as the row changes.
  useLayoutEffect(() => {
    if (!open) return;
    recalcPreview();
  }, [open, activeIndex, panelPos, recalcPreview]);

  // Post-paint niceties: focus the listbox and scroll the active row into view.
  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  // Reposition on scroll (capture — catches the modal's inner overflow-y-auto)
  // and resize; close if the trigger scrolls out of view.
  useEffect(() => {
    if (!open) return;
    const onScrollResize = () => {
      const t = triggerRef.current?.getBoundingClientRect();
      if (t && (t.bottom < 0 || t.top > window.innerHeight)) { setOpen(false); return; }
      recalcPanel();
      recalcPreview();
    };
    window.addEventListener("scroll", onScrollResize, true);
    window.addEventListener("resize", onScrollResize);
    return () => {
      window.removeEventListener("scroll", onScrollResize, true);
      window.removeEventListener("resize", onScrollResize);
    };
  }, [open, recalcPanel, recalcPreview]);

  // Outside-click closes. Panel & preview are portaled, so contains() works.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (!triggerRef.current?.contains(e.target) && !panelRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  // Esc-trap: capture-phase listener so a first Esc closes ONLY this panel and
  // never bubbles to the modal's window keydown (which would close the modal).
  useEffect(() => {
    if (!open) return;
    const onKeyCapture = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyCapture, true);
    return () => document.removeEventListener("keydown", onKeyCapture, true);
  }, [open]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const choose = useCallback((i) => {
    const o = options[i];
    if (o) onChange?.(o.value);
    setOpen(false);
    triggerRef.current?.focus();
  }, [options, onChange]);

  const onTriggerKey = (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    }
  };

  const onPanelKey = (e) => {
    switch (e.key) {
      case "ArrowDown": e.preventDefault(); setActiveIndex((i) => Math.min(options.length - 1, i + 1)); break;
      case "ArrowUp":   e.preventDefault(); setActiveIndex((i) => Math.max(0, i - 1)); break;
      case "Home":      e.preventDefault(); setActiveIndex(0); break;
      case "End":       e.preventDefault(); setActiveIndex(options.length - 1); break;
      case "Enter":
      case " ":         e.preventDefault(); choose(activeIndex); break;
      case "Tab":       setOpen(false); break;
      default: break;
    }
  };

  const preview = activeOption && renderPreview ? renderPreview(activeOption.value) : null;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        dir={dir}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onTriggerKey}
        className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition appearance-none focus:outline-none ${className}`}
        style={{
          background: UI.trigger,
          color: UI.text,
          border: `1px solid ${open ? UI.ring : UI.border}`,
          boxShadow: open ? `0 0 0 3px ${UI.accentSoft}` : "none",
        }}
      >
        <span className="flex items-center gap-2 min-w-0 flex-1" style={{ justifyContent: isRTL ? "flex-end" : "flex-start" }}>
          {renderThumb?.(value)}
          <span className="truncate">{displayLabel(value)}</span>
        </span>
        <ChevronDown
          size={16}
          style={{ color: UI.textDim, transform: open ? "rotate(180deg)" : "none", transition: "transform 150ms var(--ease-out)", flexShrink: 0 }}
          aria-hidden="true"
        />
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          id={listboxId}
          role="listbox"
          dir={dir}
          tabIndex={-1}
          aria-label={ariaLabel}
          aria-activedescendant={optionId(activeIndex)}
          onKeyDown={onPanelKey}
          className="animate-smartPanelIn"
          style={{
            position: "fixed",
            top: panelPos.top,
            left: panelPos.left,
            minWidth: panelPos.width,
            maxHeight: PANEL_MAX_H,
            overflowY: "auto",
            zIndex: 9998,
            background: UI.panel,
            border: `1px solid ${UI.border}`,
            borderRadius: 14,
            boxShadow: "0 12px 40px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.3)",
            padding: 4,
            outline: "none",
          }}
        >
          {options.map((o, i) => {
            const selected = o.value === value;
            const active = i === activeIndex;
            return (
              <div
                key={o.value}
                ref={(el) => (optionRefs.current[i] = el)}
                id={optionId(i)}
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => choose(i)}
                className="flex items-center gap-2.5 cursor-pointer select-none"
                style={{
                  padding: "8px 10px",
                  borderRadius: 10,
                  color: UI.text,
                  background: active ? UI.accentSoft : "transparent",
                  boxShadow: active ? `inset 0 0 0 1px ${UI.ring}` : "none",
                }}
              >
                <span className="flex items-center flex-shrink-0" aria-hidden="true">{renderThumb?.(o.value)}</span>
                <span className="flex-1 truncate text-sm" style={{ textAlign: isRTL ? "right" : "left" }}>{displayLabel(o.value)}</span>
                {selected && <Check size={15} style={{ color: UI.accent, flexShrink: 0 }} aria-hidden="true" />}
              </div>
            );
          })}
        </div>,
        document.body
      )}

      {open && preview && previewPos && createPortal(
        <div
          dir={dir}
          aria-hidden="true"
          style={{
            position: "fixed",
            top: previewPos.top,
            left: previewPos.left,
            width: PREVIEW_W,
            zIndex: 9999,
            pointerEvents: "none",
            background: UI.panel,
            border: `1px solid ${UI.border}`,
            borderRadius: 14,
            boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
            padding: 14,
          }}
          className="animate-smartPanelIn flex flex-col items-center text-center gap-2"
        >
          <div className="flex items-center justify-center" style={{ minHeight: 78 }}>{preview.graph}</div>
          <div className="text-sm font-bold" style={{ color: UI.text }}>{preview.title}</div>
          <div className="text-xs leading-relaxed" style={{ color: UI.textDim }}>{preview.explainer}</div>
        </div>,
        document.body
      )}
    </>
  );
}
