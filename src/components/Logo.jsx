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
        <linearGradient id="se-grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#16D687" />
          <stop offset="55%" stopColor="#00C076" />
          <stop offset="100%" stopColor="#008555" />
        </linearGradient>
        <filter id="se-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#se-grad)" />

      <g filter="url(#se-glow)" stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" fill="none">
        <path d="M18 44 C 26 44, 26 32, 32 32 S 38 20, 46 20" />
      </g>

      <circle cx="18" cy="44" r="4" fill="#FFFFFF" />
      <circle cx="46" cy="20" r="4" fill="#FFFFFF" />
    </svg>
  );
}
