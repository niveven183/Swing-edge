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
        <filter id="se-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width="64" height="64" rx="14" fill="url(#se-grad)" />

      <line x1="12" y1="46" x2="52" y2="14"
        stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3 3" />

      <path
        d="M 12 46 C 16 46 20 36 26 32 C 32 28 36 30 40 24 C 44 18 48 16 52 14"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        filter="url(#se-glow)"
      />

      <circle cx="12" cy="46" r="3.5" fill="#FFFFFF" opacity="0.95" />
      <circle cx="52" cy="14" r="4" fill="#FFFFFF" />
    </svg>
  );
}
