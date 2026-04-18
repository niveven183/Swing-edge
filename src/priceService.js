// ─── CENTRALIZED LIVE PRICE SERVICE ───────────────────────────────────────────
// Fetches live prices from Yahoo Finance via v8/chart endpoint (no crumb needed)
// Uses multiple CORS proxy fallbacks with per-call retry for reliability.
// Single source of truth for all pricing data in the app.

const CORS_PROXIES = [
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
  (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
];

const YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart";
const YAHOO_SEARCH_URL = "https://query2.finance.yahoo.com/v1/finance/search";

// Map display ticker → Yahoo symbol
const toYahooSymbol = (ticker) => {
  const t = String(ticker || "").toUpperCase();
  const map = {
    BTC: "BTC-USD",
    ETH: "ETH-USD",
    SOL: "SOL-USD",
    DOGE: "DOGE-USD",
  };
  return map[t] || t;
};

// Map Yahoo symbol back to display ticker
const fromYahooSymbol = (symbol) => {
  const s = String(symbol || "").toUpperCase();
  if (s === "BTC-USD") return "BTC";
  if (s === "ETH-USD") return "ETH";
  if (s === "SOL-USD") return "SOL";
  if (s === "DOGE-USD") return "DOGE";
  return s;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Fetch a single URL through fallback proxies (tries each proxy in order).
// Throws if all proxies fail.
const fetchWithProxies = async (targetUrl) => {
  let lastErr;
  for (const wrap of CORS_PROXIES) {
    try {
      const res = await fetch(wrap(targetUrl), { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (!text) throw new Error("empty body");
      return JSON.parse(text);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("All proxies failed");
};

// Fetch quote for ONE symbol via v8/chart (no auth needed).
// Returns null on failure.
const fetchOneQuote = async (yahooSymbol) => {
  const url = `${YAHOO_CHART_URL}/${encodeURIComponent(yahooSymbol)}?interval=1d&range=5d&includePrePost=false`;
  try {
    const data = await fetchWithProxies(url);
    const result = data?.chart?.result?.[0];
    if (!result) return null;
    const meta = result.meta || {};
    const price =
      typeof meta.regularMarketPrice === "number" ? meta.regularMarketPrice : null;
    const prevClose =
      typeof meta.chartPreviousClose === "number"
        ? meta.chartPreviousClose
        : typeof meta.previousClose === "number"
        ? meta.previousClose
        : null;
    if (price == null) return null;

    const change = prevClose != null ? price - prevClose : 0;
    const changePct = prevClose ? (change / prevClose) * 100 : 0;
    const volumes = result.indicators?.quote?.[0]?.volume || [];
    const lastVol = [...volumes].reverse().find((v) => v != null) || 0;

    return {
      price,
      change,
      changePct,
      volume: meta.regularMarketVolume || lastVol || 0,
      marketCap: meta.marketCap || 0,
      high52: meta.fiftyTwoWeekHigh || 0,
      low52: meta.fiftyTwoWeekLow || 0,
      name: meta.shortName || meta.longName || fromYahooSymbol(yahooSymbol),
    };
  } catch {
    return null;
  }
};

// Fetch with one retry after a short delay if the first attempt returns null.
const fetchOneQuoteRetry = async (yahooSymbol) => {
  let q = await fetchOneQuote(yahooSymbol);
  if (q) return q;
  await sleep(1500);
  q = await fetchOneQuote(yahooSymbol);
  return q;
};

/**
 * Fetch live prices for a list of tickers.
 * Returns: { TICKER: { price, change, changePct, volume, marketCap, high52, low52, name } }
 * Tickers that fail to load are omitted (never returned with price:0).
 */
export const fetchPrices = async (tickers) => {
  if (!tickers || tickers.length === 0) return {};
  const unique = [...new Set(tickers.map((t) => String(t).toUpperCase()))];

  const results = await Promise.all(
    unique.map(async (display) => {
      const sym = toYahooSymbol(display);
      const q = await fetchOneQuoteRetry(sym);
      return { display, q };
    })
  );

  const prices = {};
  results.forEach(({ display, q }) => {
    if (q) {
      prices[display] = q;
      // Also index under Yahoo form so callers using either key find it
      const sym = toYahooSymbol(display);
      if (sym !== display) prices[sym] = q;
    }
  });
  return prices;
};

export const fmtVolume = (vol) => {
  if (!vol) return "—";
  if (vol >= 1e9) return `${(vol / 1e9).toFixed(1)}B`;
  if (vol >= 1e6) return `${(vol / 1e6).toFixed(0)}M`;
  if (vol >= 1e3) return `${(vol / 1e3).toFixed(0)}K`;
  return String(vol);
};

export const fmtMarketCap = (cap) => {
  if (!cap) return "—";
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(1)}B`;
  if (cap >= 1e6) return `$${(cap / 1e6).toFixed(0)}M`;
  return `$${cap.toLocaleString()}`;
};

/**
 * Search for ticker symbols (autocomplete).
 * Returns items: { symbol, name, type, exchange }
 */
export const searchTickers = async (query) => {
  if (!query || query.length < 1) return [];
  const url = `${YAHOO_SEARCH_URL}?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`;
  try {
    const data = await fetchWithProxies(url);
    const SUPPORTED = new Set([
      "EQUITY",
      "ETF",
      "CRYPTOCURRENCY",
      "INDEX",
      "CURRENCY",
      "FUTURE",
      "MUTUALFUND",
    ]);
    return (data?.quotes || [])
      .filter((q) => SUPPORTED.has(q.quoteType))
      .map((q) => ({
        symbol: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        type: q.quoteType,
        exchange: q.exchange || q.quoteType,
      }));
  } catch {
    return [];
  }
};
