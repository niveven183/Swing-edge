// ─── TRADINGVIEW SYMBOL SEARCH PROXY (Vercel serverless function) ───────────
// The TradingView symbol-search endpoint gates on `Referer: tradingview.com`,
// so it can NEVER be called directly from the browser (Referer is a forbidden
// fetch header). This server-side proxy spoofs the Referer and returns the raw
// JSON array, with permissive CORS so the SPA can consume it.
//
// The client (priceService.searchSymbolsTV) falls back to Yahoo automatically
// if this endpoint errors, so a TV outage is transparent to the user.

import { rateLimit, clientIp } from "./_lib/rateLimit.js";

const TV_BASE = "https://symbol-search.tradingview.com/symbol_search/";

// Abort if TradingView hangs past `ms` — the existing catch-all below already
// degrades to the same tv_fetch_failed fallback for any error, timeout included.
const fetchWithTimeout = (url, opts = {}, ms = 8000) => {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  return fetch(url, { ...opts, signal: c.signal }).finally(() => clearTimeout(t));
};

export default async function handler(req, res) {
  // CORS — allow the SPA (same origin in prod, but keep it permissive/robust).
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const { allowed, retryAfter } = rateLimit(`${clientIp(req)}:symbol-search`, {
    windowMs: 60 * 1000,
    max: 30,
  });
  if (!allowed) {
    console.warn(`[rate_limited] symbol-search ip=${clientIp(req)} retryAfter=${retryAfter}s`);
    res.setHeader("Retry-After", String(retryAfter));
    res.status(429).json({ error: "rate_limited", retryAfter });
    return;
  }

  const text = String((req.query && req.query.text) || "").trim();
  if (!text) {
    res.status(200).json([]);
    return;
  }

  const url =
    `${TV_BASE}?text=${encodeURIComponent(text)}` +
    `&hl=1&exchange=&lang=en&type=&domain=production`;

  try {
    const tvRes = await fetchWithTimeout(url, {
      headers: {
        // These two are what unlock the endpoint (otherwise 403).
        Referer: "https://www.tradingview.com/",
        Origin: "https://www.tradingview.com",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
          "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Accept: "application/json, text/plain, */*",
      },
    });

    if (!tvRes.ok) {
      res.status(502).json({ error: `tv_status_${tvRes.status}` });
      return;
    }

    const data = await tvRes.json();
    // Short edge cache — search results change slowly; eases burst typing.
    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");
    res.status(200).json(Array.isArray(data) ? data : []);
  } catch (e) {
    res.status(502).json({ error: "tv_fetch_failed" });
  }
}
