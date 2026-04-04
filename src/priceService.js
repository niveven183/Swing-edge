// ─── CENTRALIZED LIVE PRICE SERVICE ───────────────────────────────────────────
// Fetches live prices from Yahoo Finance for all tickers (watchlist + open trades)
// Single source of truth for all pricing data in the app

const CORS_PROXY = "https://api.allorigins.win/raw?url=";
const YAHOO_QUOTE_URL = "https://query1.finance.yahoo.com/v7/finance/quote";

// Map common tickers to Yahoo Finance symbols
const toYahooSymbol = (ticker) => {
  const map = {
    BTC: "BTC-USD",
    ETH: "ETH-USD",
    "BTC-USD": "BTC-USD",
    "ETH-USD": "ETH-USD",
  };
  return map[ticker] || ticker;
};

// Reverse map Yahoo symbol back to display ticker
const fromYahooSymbol = (symbol) => {
  if (symbol === "BTC-USD") return "BTC";
  if (symbol === "ETH-USD") return "ETH";
  return symbol;
};

/**
 * Fetch live prices for a list of tickers
 * Returns: { TICKER: { price, change, changePct, volume, marketCap, high52, low52 } }
 */
export const fetchPrices = async (tickers) => {
  if (!tickers || tickers.length === 0) return {};

  const uniqueTickers = [...new Set(tickers)];
  const yahooSymbols = uniqueTickers.map(toYahooSymbol);
  const symbolsStr = yahooSymbols.join(",");

  const fields = [
    "regularMarketPrice",
    "regularMarketChange",
    "regularMarketChangePercent",
    "regularMarketVolume",
    "marketCap",
    "fiftyTwoWeekHigh",
    "fiftyTwoWeekLow",
    "shortName",
  ].join(",");

  const url = `${YAHOO_QUOTE_URL}?symbols=${symbolsStr}&fields=${fields}`;
  const proxyUrl = `${CORS_PROXY}${encodeURIComponent(url)}`;

  const res = await fetch(proxyUrl);
  const data = await res.json();
  const results = data?.quoteResponse?.result || [];

  const prices = {};
  results.forEach((q) => {
    const displayTicker = fromYahooSymbol(q.symbol);
    prices[displayTicker] = {
      price: q.regularMarketPrice || 0,
      change: q.regularMarketChange || 0,
      changePct: q.regularMarketChangePercent || 0,
      volume: q.regularMarketVolume || 0,
      marketCap: q.marketCap || 0,
      high52: q.fiftyTwoWeekHigh || 0,
      low52: q.fiftyTwoWeekLow || 0,
      name: q.shortName || displayTicker,
    };
  });

  return prices;
};

/**
 * Format volume for display (e.g., 98M, 1.2B)
 */
export const fmtVolume = (vol) => {
  if (!vol) return "—";
  if (vol >= 1e9) return `${(vol / 1e9).toFixed(1)}B`;
  if (vol >= 1e6) return `${(vol / 1e6).toFixed(0)}M`;
  if (vol >= 1e3) return `${(vol / 1e3).toFixed(0)}K`;
  return String(vol);
};

/**
 * Format market cap for display
 */
export const fmtMarketCap = (cap) => {
  if (!cap) return "—";
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(1)}B`;
  if (cap >= 1e6) return `$${(cap / 1e6).toFixed(0)}M`;
  return `$${cap.toLocaleString()}`;
};

/**
 * Search for ticker symbols (autocomplete)
 */
export const searchTickers = async (query) => {
  if (!query || query.length < 1) return [];
  try {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0`;
    const proxyUrl = `${CORS_PROXY}${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    const data = await res.json();
    return (data?.quotes || [])
      .filter((q) => q.quoteType === "EQUITY" || q.quoteType === "ETF" || q.quoteType === "CRYPTOCURRENCY")
      .map((q) => ({
        symbol: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        type: q.quoteType,
        exchange: q.exchange,
      }));
  } catch {
    return [];
  }
};
