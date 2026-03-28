import { useState } from "react";

const FALLBACK_ICON = (
  <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="6" fill="#1e293b" />
    <path d="M7 17L12 7L17 17" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="9" y1="13" x2="15" y2="13" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const CRYPTO_MAP = {
  "BTC-USD": "BTC",
  "ETH-USD": "ETH",
  BTC: "BTC",
  ETH: "ETH",
};

const TickerLogo = ({ ticker, size = 20, className = "" }) => {
  const [hasError, setHasError] = useState(false);

  const normalizedTicker = CRYPTO_MAP[ticker] || ticker;
  const imgUrl = `https://financialmodelingprep.com/image-stock/${normalizedTicker}.png`;

  if (hasError) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-md bg-slate-800 border border-white/10 flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-slate-500 font-mono font-bold" style={{ fontSize: size * 0.4 }}>
          {normalizedTicker.charAt(0)}
        </span>
      </span>
    );
  }

  return (
    <img
      src={imgUrl}
      alt={ticker}
      className={`inline-block rounded-md object-contain flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
      onError={() => setHasError(true)}
      loading="lazy"
    />
  );
};

export default TickerLogo;
