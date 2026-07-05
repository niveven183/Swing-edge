import { useEffect, useRef } from "react";

const TV_BASE = "https://s3.tradingview.com/external-embedding/";

function useTradingViewScript(src, config, deps = []) {
  const container = useRef(null);
  useEffect(() => {
    const node = container.current;
    if (!node) return;
    node.innerHTML = "";
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.type = "text/javascript";
    script.innerHTML = JSON.stringify(config);
    node.appendChild(script);
    return () => {
      if (node) node.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return container;
}

export function TVTickerTape() {
  const container = useTradingViewScript(
    `${TV_BASE}embed-widget-ticker-tape.js`,
    {
      symbols: [
        { proName: "NASDAQ:NVDA",   title: "NVDA" },
        { proName: "NASDAQ:AAPL",   title: "AAPL" },
        { proName: "NASDAQ:TSLA",   title: "TSLA" },
        { proName: "NASDAQ:MSFT",   title: "MSFT" },
        { proName: "NASDAQ:META",   title: "META" },
        { proName: "NASDAQ:AMD",    title: "AMD"  },
        { proName: "BINANCE:BTCUSDT", title: "BTC" },
        { proName: "AMEX:SPY",      title: "SPY"  },
      ],
      showSymbolLogo: true,
      colorTheme: "light",
      isTransparent: false,
      displayMode: "adaptive",
      locale: "en",
    },
    []
  );

  return (
    <div className="bg-white border-b border-black/[0.06]">
      <div ref={container} className="tradingview-widget-container" />
    </div>
  );
}
