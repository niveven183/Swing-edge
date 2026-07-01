// ─────────────────────────────────────────────────────────────────────────────
// TradeGraph — tiny vector price-action glyphs for Setup & Market options.
// viewBox 0 0 48 28. Shape only — no axes, numbers or labels. Color comes from
// the parent (tone → currentColor). non-scaling-stroke keeps the line legible in
// the ~34px thumbnail AND crisp in the ~136px hover preview from one definition.
// ─────────────────────────────────────────────────────────────────────────────

// Main price line (the "shape").
const L = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  vectorEffect: "non-scaling-stroke",
};
// Dashed reference level (support / resistance / channel bound) — secondary.
const R = {
  stroke: "currentColor",
  strokeWidth: 1,
  strokeDasharray: "3 2.5",
  strokeOpacity: 0.35,
  strokeLinecap: "round",
  vectorEffect: "non-scaling-stroke",
};

const SHAPES = {
  // Flat chop on the left, then a sharp break up through resistance (top-right).
  "Breakout": (
    <>
      <line x1="2" y1="12" x2="46" y2="12" {...R} />
      <polyline {...L} points="3,19 8,18 12,20 16,18 20,19 27,16 35,10 45,4" />
    </>
  ),
  // Up, a shallow higher-low dip, then continuation higher.
  "Pullback": <polyline {...L} points="2,23 18,9 27,15 46,4" />,
  // Fall to a support level, touch it, bounce up.
  "Support Bounce": (
    <>
      <line x1="2" y1="22.5" x2="46" y2="22.5" {...R} />
      <polyline {...L} points="2,7 22,22 46,9" />
    </>
  ),
  // Press up against a specific resistance level, then break above it.
  "Resistance Break": (
    <>
      <line x1="2" y1="9" x2="46" y2="9" {...R} />
      <polyline {...L} points="2,21 16,12 26,12.5 34,11 44,3" />
    </>
  ),
  // Undefined shape — a faint, dimmed ripple. Rendered muted via the group.
  "Other": (
    <g opacity="0.6">
      <polyline {...L} points="3,14 8,10 13,14 18,18 23,14 28,10 33,14 38,18 43,14 46,13" />
    </g>
  ),

  // ── Market ──
  "Trending Up":   <polyline {...L} points="2,23 12,19 20,20 30,13 38,14 46,5" />,
  "Trending Down": <polyline {...L} points="2,5 12,10 20,9 30,16 38,15 46,22" />,
  // Range between two channel bounds.
  "Sideways": (
    <>
      <line x1="2" y1="10" x2="46" y2="10" {...R} />
      <line x1="2" y1="18" x2="46" y2="18" {...R} />
      <polyline {...L} points="2,14 8,11 14,17 20,11 26,17 32,11 38,17 44,13" />
    </>
  ),
  // Large, fast two-way swings across the full height.
  "Volatile": <polyline {...L} points="2,20 9,5 15,23 22,6 29,24 36,7 43,22 46,12" />,
};

export default function TradeGraph({ value, size = 34, color = "currentColor", className = "" }) {
  const height = Math.round((size * 28) / 48);
  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 48 28"
      fill="none"
      className={className}
      style={{ color, display: "block", flexShrink: 0 }}
      aria-hidden="true"
      focusable="false"
    >
      {SHAPES[value] || SHAPES["Other"]}
    </svg>
  );
}
