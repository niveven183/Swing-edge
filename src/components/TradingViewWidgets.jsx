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
      colorTheme: "dark",
      isTransparent: true,
      displayMode: "adaptive",
      locale: "en",
    },
    []
  );

  return (
    <div className="bg-[#0a0f1e] border-b border-white/[0.06]">
      <div ref={container} className="tradingview-widget-container" />
    </div>
  );
}

export function TVSingleQuote({ symbol }) {
  const container = useTradingViewScript(
    `${TV_BASE}embed-widget-single-quote.js`,
    {
      symbol,
      width: "100%",
      colorTheme: "dark",
      isTransparent: true,
      locale: "en",
    },
    [symbol]
  );

  return <div ref={container} className="tradingview-widget-container" />;
}

export function TVMiniChart({ symbol, height = 220 }) {
  const container = useTradingViewScript(
    `${TV_BASE}embed-widget-mini-symbol-overview.js`,
    {
      symbol,
      width: "100%",
      height,
      locale: "en",
      dateRange: "1D",
      colorTheme: "dark",
      isTransparent: true,
      autosize: true,
      trendLineColor: "rgba(34, 211, 238, 1)",
      underLineColor: "rgba(34, 211, 238, 0.15)",
      underLineBottomColor: "rgba(34, 211, 238, 0)",
    },
    [symbol]
  );

  return <div ref={container} className="tradingview-widget-container" />;
}

export function TVMarketOverview({ height = 400 }) {
  const container = useTradingViewScript(
    `${TV_BASE}embed-widget-market-overview.js`,
    {
      colorTheme: "dark",
      dateRange: "1D",
      showChart: true,
      locale: "en",
      width: "100%",
      height,
      isTransparent: true,
      showSymbolLogo: true,
      tabs: [
        {
          title: "Indices",
          symbols: [
            { s: "FOREXCOM:SPXUSD", d: "S&P 500" },
            { s: "FOREXCOM:NSXUSD", d: "Nasdaq 100" },
            { s: "FOREXCOM:DJI",    d: "Dow Jones" },
            { s: "INDEX:VIX",       d: "VIX" },
          ],
        },
        {
          title: "Crypto",
          symbols: [
            { s: "BINANCE:BTCUSDT", d: "Bitcoin" },
            { s: "BINANCE:ETHUSDT", d: "Ethereum" },
            { s: "BINANCE:SOLUSDT", d: "Solana" },
          ],
        },
      ],
    },
    []
  );

  return <div ref={container} className="tradingview-widget-container" />;
}
