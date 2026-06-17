export default function Logo({ size = 40, showText = true, variant = "default" }) {
  const textColor =
    variant === "white" ? "#FFFFFF" : variant === "dark" ? "#0F1A14" : "#0F1A14";
  const accentColor = "#00C076";
  const fontSize = Math.round(size * 0.45);

  return (
    <span
      className="inline-flex items-center gap-2 select-none"
      style={{ lineHeight: 1 }}
    >
      <SwingWaveMark size={size} />
      {showText && (
        <span
          style={{
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
            fontWeight: 800,
            fontSize: `${fontSize}px`,
            letterSpacing: "0.08em",
            color: textColor,
          }}
        >
          SWING<span style={{ color: accentColor }}>EDGE</span>
        </span>
      )}
    </span>
  );
}

function SwingWaveMark({ size }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="SwingEdge logo"
      role="img"
    >
      <defs>
        <linearGradient id="se-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#008555" />
          <stop offset="50%" stopColor="#00C076" />
          <stop offset="100%" stopColor="#16D687" />
        </linearGradient>
        <linearGradient id="se-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <clipPath id="se-clip"><rect width="64" height="64" rx="14" /></clipPath>
        <filter id="se-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="0" stdDeviation="1.3" floodColor="#ffffff" floodOpacity="0.5" />
        </filter>
      </defs>

      <rect width="64" height="64" rx="14" fill="url(#se-grad)" />

      <g clipPath="url(#se-clip)">
        <g stroke="#ffffff" strokeOpacity="0.13" strokeWidth="0.8">
          <line x1="0" y1="22" x2="64" y2="22" />
          <line x1="0" y1="34" x2="64" y2="34" />
          <line x1="0" y1="46" x2="64" y2="46" />
          <line x1="21" y1="0" x2="21" y2="64" />
          <line x1="32" y1="0" x2="32" y2="64" />
          <line x1="43" y1="0" x2="43" y2="64" />
        </g>
        <path
          d="M12 47 L19 41 L25 44 L31 34 L37 37 L43 25 L48 28 L53 14 L53 64 L12 64 Z"
          fill="url(#se-area)"
        />
        <path
          d="M12 47 L19 41 L25 44 L31 34 L37 37 L43 25 L48 28 L53 14"
          fill="none"
          stroke="#ffffff"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#se-glow)"
        />
      </g>

      <circle cx="53" cy="14" r="6.4" fill="#ffffff" fillOpacity="0.22" />
      <circle cx="53" cy="14" r="3.1" fill="#ffffff" />
    </svg>
  );
}
