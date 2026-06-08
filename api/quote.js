// ─── YAHOO FINANCE PROXY (Vercel serverless function) ──────────────────────
// Yahoo's chart/search endpoints can't be called directly from the browser
// (CORS + a Referer/UA gate), and the public CORS proxies we relied on
// (allorigins / corsproxy / codetabs) are unreliable — codetabs is dead and
// floods the console with "Failed to fetch". This server-side proxy spoofs the
// Referer/User-Agent and returns raw Yahoo JSON, with permissive CORS so the
// SPA can consume it. No browser CORS because the fetch happens server-side.
//
// Two modes:
//   • Chart  : /api/quote?symbols=AAPL,MSFT&range=5d&interval=1d&includePrePost=1
//              → { "AAPL": <chart.result[0]|null>, "MSFT": ... }
//   • Search : /api/quote?search=apple
//              → raw Yahoo search JSON ({ quotes: [...] })
//
// The client (src/priceService.js) keeps ALL parsing, so the shape consumed by
// the UI never changes.

const CHART_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";
const SEARCH_BASE = "https://query2.finance.yahoo.com/v1/finance/search";

const YAHOO_HEADERS = {
  // Spoofed browser identity — what unlocks the endpoints server-side.
  Referer: "https://finance.yahoo.com/",
  Origin: "https://finance.yahoo.com",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
};

// Fetch one Yahoo chart result for a symbol. Returns chart.result[0] or null.
async function fetchChart(symbol, { range, interval, includePrePost }) {
  const url =
    `${CHART_BASE}/${encodeURIComponent(symbol)}` +
    `?interval=${encodeURIComponent(interval)}` +
    `&range=${encodeURIComponent(range)}` +
    (includePrePost ? "&includePrePost=true" : "");
  try {
    const r = await fetch(url, { headers: YAHOO_HEADERS });
    if (!r.ok) return null;
    const data = await r.json();
    return data?.chart?.result?.[0] || null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  // CORS — permissive so the SPA can consume it from any origin.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const q = req.query || {};

  // ── Search mode ──────────────────────────────────────────────────────────
  const search = String(q.search || "").trim().slice(0, 64);
  if (search) {
    const url =
      `${SEARCH_BASE}?q=${encodeURIComponent(search)}` +
      `&quotesCount=10&newsCount=0`;
    try {
      const r = await fetch(url, { headers: YAHOO_HEADERS });
      if (!r.ok) {
        res.status(502).json({ error: `yahoo_status_${r.status}` });
        return;
      }
      const data = await r.json();
      res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");
      res.status(200).json(data || {});
    } catch {
      res.status(502).json({ error: "yahoo_search_failed" });
    }
    return;
  }

  // ── Chart / quote mode ───────────────────────────────────────────────────
  // Validate to a real ticker charset and cap the count so this open proxy
  // can't be abused to fan out hundreds of parallel upstream fetches.
  const VALID_SYMBOL = /^[A-Z0-9.\-^=]{1,15}$/;
  const symbols = [
    ...new Set(
      String(q.symbols || "")
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter((s) => VALID_SYMBOL.test(s))
    ),
  ].slice(0, 60);

  if (symbols.length === 0) {
    res.status(200).json({});
    return;
  }

  const range = String(q.range || "5d");
  const interval = String(q.interval || "1d");
  const includePrePost = q.includePrePost === "1" || q.includePrePost === "true";

  // Yahoo chart is single-symbol (batch needs a crumb), so fan out in parallel
  // server-side. allSettled → one bad symbol never fails the whole batch.
  const settled = await Promise.allSettled(
    symbols.map((sym) => fetchChart(sym, { range, interval, includePrePost }))
  );

  const out = {};
  symbols.forEach((sym, i) => {
    const s = settled[i];
    out[sym] = s.status === "fulfilled" ? s.value : null;
  });

  // Short edge cache — live prices change fast, keep it brief but absorb bursts.
  res.setHeader("Cache-Control", "public, max-age=5, s-maxage=10");
  res.status(200).json(out);
}
