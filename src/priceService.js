// ─── CENTRALIZED LIVE PRICE SERVICE ───────────────────────────────────────────
// Fetches live prices from Yahoo Finance via the /api/quote serverless proxy
// (v8/chart) with pre-/post-market prices and automatic market-state
// detection. The proxy spoofs Referer/User-Agent + a Yahoo session cookie/crumb
// server-side, so
// there is no browser CORS and no dependency on flaky public CORS proxies.
// Single source of truth for all pricing data in the app.

import * as Sentry from "@sentry/react";

// ─── MARKET STATE DETECTION ─────────────────────────────────────────────────
// Windows are expressed in US/Eastern (America/New_York).
//   MARKET_OPEN : 9:30 → 16:00
//   PRE_MARKET  : 4:00 → 9:30
//   AFTER_HOURS : 16:00 → 20:00
//   CLOSED      : 20:00 → 4:00 (and weekends)
export const MARKET_STATE = {
  OPEN: "MARKET_OPEN",
  PRE: "PRE_MARKET",
  AFTER: "AFTER_HOURS",
  CLOSED: "CLOSED",
};

const getEasternParts = (d = new Date()) => {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour12: false,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(d);
    const get = (t) => parts.find((p) => p.type === t)?.value;
    return {
      weekday: get("weekday"),
      hour: parseInt(get("hour"), 10),
      minute: parseInt(get("minute"), 10),
    };
  } catch {
    // Fallback: local time (better than nothing)
    return { weekday: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()], hour: d.getHours(), minute: d.getMinutes() };
  }
};

export const getMarketState = (d = new Date()) => {
  const { weekday, hour, minute } = getEasternParts(d);
  if (weekday === "Sat" || weekday === "Sun") return MARKET_STATE.CLOSED;
  const mins = hour * 60 + minute;
  if (mins >= 9 * 60 + 30 && mins < 16 * 60) return MARKET_STATE.OPEN;
  if (mins >= 4 * 60 && mins < 9 * 60 + 30) return MARKET_STATE.PRE;
  if (mins >= 16 * 60 && mins < 20 * 60) return MARKET_STATE.AFTER;
  return MARKET_STATE.CLOSED;
};

// Refresh interval (ms) tuned per market state.
export const getRefreshInterval = (state = getMarketState()) => {
  if (state === MARKET_STATE.OPEN) return 15_000;       // 15s
  if (state === MARKET_STATE.PRE || state === MARKET_STATE.AFTER) return 30_000; // 30s
  return 5 * 60_000;                                    // 5 minutes when closed
};

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

// ─── QUOTE CACHE (12s TTL) ──────────────────────────────────────────────────
// Prevents duplicate concurrent calls within the same refresh burst.
// TTL is just under the 15s market-open interval so live data stays fresh.
const _quoteCache = new Map(); // yahooSymbol → { data, ts }
const QUOTE_CACHE_TTL_MS = 12_000;

// Fetch raw Yahoo chart results for a list of symbols via the /api/quote
// serverless proxy. Returns a map { YAHOO_SYMBOL: chart.result[0] | null }.
// Never throws — a transport failure resolves to {} so callers degrade safely.
const fetchChartResults = async (
  yahooSymbols,
  { range = "5d", interval = "1d", includePrePost = true } = {}
) => {
  const list = [...new Set(yahooSymbols.map((s) => String(s || "").toUpperCase()))].filter(Boolean);
  if (list.length === 0) return {};

  const params = new URLSearchParams({ symbols: list.join(","), range, interval });
  if (includePrePost) params.set("includePrePost", "1");

  try {
    const res = await fetch(`/api/quote?${params.toString()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data && typeof data === "object" ? data : {};
  } catch (e) {
    Sentry.addBreadcrumb({ category: "quote", message: `/api/quote failed (${e?.message})`, level: "error" });
    return {};
  }
};

// Parse one raw Yahoo chart result into the app-wide quote shape.
// Returns null when the result is missing or has no usable price.
const parseChartResult = (result, yahooSymbol) => {
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

  const preMarketPrice = typeof meta.preMarketPrice === "number" ? meta.preMarketPrice : null;
  const postMarketPrice = typeof meta.postMarketPrice === "number" ? meta.postMarketPrice : null;

  const state = getMarketState();
  // Display price picks the freshest tick relative to current market state
  const displayPrice =
    state === MARKET_STATE.PRE && preMarketPrice != null
      ? preMarketPrice
      : state === MARKET_STATE.AFTER && postMarketPrice != null
      ? postMarketPrice
      : price;

  return {
    // primary fields (back-compat)
    price: displayPrice,
    change,
    changePct,
    volume: meta.regularMarketVolume || lastVol || 0,
    marketCap: meta.marketCap || 0,
    high52: meta.fiftyTwoWeekHigh || 0,
    low52: meta.fiftyTwoWeekLow || 0,
    name: meta.shortName || meta.longName || fromYahooSymbol(yahooSymbol),
    // extended fields
    regularMarketPrice: price,
    regularMarketOpen: typeof meta.regularMarketOpen === "number" ? meta.regularMarketOpen : null,
    regularMarketDayHigh: typeof meta.regularMarketDayHigh === "number" ? meta.regularMarketDayHigh : null,
    regularMarketDayLow: typeof meta.regularMarketDayLow === "number" ? meta.regularMarketDayLow : null,
    previousClose: prevClose,
    preMarketPrice,
    postMarketPrice,
    marketState: state,
  };
};

// Fetch quote for ONE symbol via the serverless proxy. Returns null on failure.
const fetchOneQuote = async (yahooSymbol) => {
  const cached = _quoteCache.get(yahooSymbol);
  if (cached && Date.now() - cached.ts < QUOTE_CACHE_TTL_MS) return cached.data;

  const map = await fetchChartResults([yahooSymbol]);
  const quote = parseChartResult(map[yahooSymbol], yahooSymbol);
  if (quote) _quoteCache.set(yahooSymbol, { data: quote, ts: Date.now() });
  return quote;
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
 * Returns: { TICKER: { price, change, changePct, volume, marketCap, high52, low52, name,
 *                      regularMarketPrice, regularMarketOpen, regularMarketDayHigh,
 *                      regularMarketDayLow, previousClose, preMarketPrice, postMarketPrice,
 *                      marketState } }
 * Tickers that fail to load are omitted (never returned with price:0).
 */
export const fetchPrices = async (tickers) => {
  if (!tickers || tickers.length === 0) return {};
  const unique = [...new Set(tickers.map((t) => String(t).toUpperCase()))];
  const pairs = unique.map((display) => ({ display, sym: toYahooSymbol(display) }));

  // Serve fresh cache hits first; batch-fetch only the symbols we actually need.
  const quotesBySym = {};
  const need = [];
  for (const { sym } of pairs) {
    const cached = _quoteCache.get(sym);
    if (cached && Date.now() - cached.ts < QUOTE_CACHE_TTL_MS) {
      quotesBySym[sym] = cached.data;
    } else if (!need.includes(sym)) {
      need.push(sym);
    }
  }

  const ingest = (syms, map) => {
    const missing = [];
    for (const sym of syms) {
      const q = parseChartResult(map[sym], sym);
      if (q) {
        quotesBySym[sym] = q;
        _quoteCache.set(sym, { data: q, ts: Date.now() });
      } else {
        missing.push(sym);
      }
    }
    return missing;
  };

  if (need.length) {
    // One batched call for all symbols; retry the stragglers once (preserves the
    // old per-symbol retry behavior without N round-trips).
    let missing = ingest(need, await fetchChartResults(need));
    if (missing.length) {
      await sleep(1500);
      ingest(missing, await fetchChartResults(missing));
    }
  }

  const prices = {};
  for (const { display, sym } of pairs) {
    const q = quotesBySym[sym];
    if (q) {
      prices[display] = q;
      // Also index under Yahoo form so callers using either key find it
      if (sym !== display) prices[sym] = q;
    }
  }
  return prices;
};

/** Convenience single-ticker fetch (used by Add Trade form entry auto-fill). */
export const fetchQuote = async (ticker) => {
  const sym = toYahooSymbol(String(ticker || "").toUpperCase());
  const q = await fetchOneQuoteRetry(sym);
  return q || null;
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

// ─── SEARCH CACHE (5 minute TTL) ───────────────────────────────────────────
const _searchCache = new Map(); // key(lc query) → { ts, items }  (Yahoo)
const _tvSearchCache = new Map(); // key(lc query) → { ts, items } (TradingView)
const SEARCH_TTL_MS = 5 * 60_000;

const stripTags = (s) => String(s || "").replace(/<\/?[^>]+>/g, "");

// Normalize a TradingView result → the app-wide quoteType vocabulary used by
// toTvSymbol / the watchlist (EQUITY / ETF / CRYPTOCURRENCY / INDEX / ...).
// TradingView signals crypto/forex via `typespecs`, not `type` (e.g. crypto
// pairs come back as type "spot" + typespecs ["crypto"]).
const normalizeTvType = (x) => {
  const rawType = String(x.type || "").toLowerCase();
  const specs = Array.isArray(x.typespecs) ? x.typespecs : [];
  if (specs.includes("crypto") || rawType === "crypto") return "CRYPTOCURRENCY";
  if (rawType === "futures") return "FUTURE";
  if (rawType === "forex" || specs.includes("forex")) return "CURRENCY";
  if (rawType === "fund" || specs.includes("etf")) return "ETF";
  if (rawType === "index" || rawType === "economic") return "INDEX";
  return "EQUITY"; // stock, dr, bond, equity-spot
};

/**
 * Professional full-market autocomplete via TradingView's symbol-search
 * endpoint (proxied server-side at /api/symbol-search to bypass the Referer
 * gate). Returns items normalized to { symbol, name, type, exchange, ... }.
 *
 * Transparent fallback: if the TV proxy errors / is empty, this silently
 * resolves through Yahoo (`searchTickers`) so the search NEVER breaks for the
 * user — they can't tell which source answered.
 *
 * @param {string} query
 * @param {AbortSignal} [signal] - cancels stale in-flight requests.
 */
export const searchSymbolsTV = async (query, signal) => {
  const q = String(query || "").trim();
  if (!q) return [];
  const key = q.toLowerCase();

  const cached = _tvSearchCache.get(key);
  if (cached && Date.now() - cached.ts < SEARCH_TTL_MS) return cached.items;

  try {
    const res = await fetch(
      `/api/symbol-search?text=${encodeURIComponent(q)}&hl=1&lang=en`,
      { signal, cache: "no-store" }
    );
    if (!res.ok) throw new Error(`proxy HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error("empty");

    const seen = new Set();
    const items = [];
    for (const x of data) {
      const symbol = stripTags(x.symbol).toUpperCase();
      if (!symbol) continue;
      const exchange = stripTags(x.exchange) || stripTags(x.source_id) || "";
      const type = normalizeTvType(x);
      // Crypto pairs repeat across ~10 exchanges (BTCUSD on Coinbase, Binance,
      // Kraken…). Collapse to one row per symbol; keep the first (TV ranks by
      // relevance). Everything else dedupes per symbol+exchange.
      const dedupe = type === "CRYPTOCURRENCY" ? `C:${symbol}` : `${symbol}@${exchange}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      items.push({
        symbol,
        name: stripTags(x.description) || symbol,
        type,
        exchange,
        currency: x.currency_code || "",
        country: x.country || "",
      });
      if (items.length >= 30) break;
    }
    if (items.length === 0) throw new Error("no usable items");

    _tvSearchCache.set(key, { ts: Date.now(), items });
    return items;
  } catch (e) {
    // AbortError → caller cancelled; propagate so it can ignore the stale call.
    if (e && e.name === "AbortError") throw e;
    // Any other failure → transparent Yahoo fallback.
    return searchTickers(q);
  }
};

/**
 * Search for ticker symbols (autocomplete) — Yahoo Finance source.
 * Returns items: { symbol, name, type, exchange }
 * Results are cached per lowercased query for SEARCH_TTL_MS.
 */
export const searchTickers = async (query) => {
  const q = String(query || "").trim();
  if (!q) return [];
  const key = q.toLowerCase();
  const cached = _searchCache.get(key);
  if (cached && Date.now() - cached.ts < SEARCH_TTL_MS) return cached.items;

  try {
    const res = await fetch(`/api/quote?search=${encodeURIComponent(q)}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const SUPPORTED = new Set([
      "EQUITY",
      "ETF",
      "CRYPTOCURRENCY",
      "INDEX",
      "CURRENCY",
      "FUTURE",
      "MUTUALFUND",
    ]);
    const items = (data?.quotes || [])
      .filter((x) => SUPPORTED.has(x.quoteType))
      .map((x) => ({
        symbol: x.symbol,
        name: x.shortname || x.longname || x.symbol,
        type: x.quoteType,
        exchange: x.exchange || x.quoteType,
      }));
    _searchCache.set(key, { ts: Date.now(), items });
    return items;
  } catch {
    return [];
  }
};

// Human label + emoji + color hint for the current market state.
export const getMarketStateBadge = (state = getMarketState()) => {
  switch (state) {
    case MARKET_STATE.OPEN:  return { label: "LIVE",        emoji: "🟢", color: "#10b981" };
    case MARKET_STATE.PRE:   return { label: "PRE-MARKET",  emoji: "🟡", color: "#f59e0b" };
    case MARKET_STATE.AFTER: return { label: "AFTER-HOURS", emoji: "🟠", color: "#fb923c" };
    default:                 return { label: "CLOSED",      emoji: "⚫", color: "#64748b" };
  }
};
