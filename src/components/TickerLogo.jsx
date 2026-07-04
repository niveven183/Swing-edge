import { useState } from "react";

// Real stock/crypto/ETF logo from FMP by symbol (no API key); on load error
// falls back to a gradient 2-letter badge so it never renders as a broken image.
export default function TickerLogo({ ticker, size = 20, className = "" }) {
  const [imgError, setImgError] = useState(false);
  const cleanTicker = (ticker || "").replace("-USD", "").toUpperCase();
  if (imgError || !cleanTicker) {
    return (
      <div className={`rounded-full bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-white/10 flex items-center justify-center text-[8px] font-bold text-cyan-400 font-mono flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}>
        {cleanTicker.slice(0, 2)}
      </div>
    );
  }
  return (
    <img
      src={`https://financialmodelingprep.com/image-stock/${cleanTicker}.png`}
      alt={cleanTicker}
      loading="lazy"
      className={`rounded-full bg-white/5 object-cover flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
      onError={() => setImgError(true)}
    />
  );
}
