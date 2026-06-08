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

// Yahoo load-balances across query1 / query2 and rate-limits (HTTP 429) per
// host intermittently — a no-cookie request that 429s on one host usually
// succeeds on the other. So we fail over across both hosts for every request.
// v8/chart needs no crumb when it isn't being rate-limited; the crumb/cookie
// handshake is unreliable and unnecessary here.
const YAHOO_HOSTS = [
  "https://query2.finance.yahoo.com",
  "https://query1.finance.yahoo.com",
];

const YAHOO_HEADERS = {
  // Spoofed browser identity — what unlocks the endpoints server-side.
  Referer: "https://finance.yahoo.com/",
  Origin: "https://finance.yahoo.com",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
};

// GET a Yahoo path across both hosts, returning the first 200 JSON body.
// Returns null if every host failed (e.g. all 429).
async function fetchYahooJson(path) {
  for (const host of YAHOO_HOSTS) {
    try {
      const r = await fetch(host + path, { headers: YAHOO_HEADERS });
      if (!r.ok) continue; // 429 / 5xx → try the next host
      return await r.json();
    } catch {
      // network error → try the next host
    }
  }
  return null;
}

// Fetch one Yahoo chart result for a symbol. Returns chart.result[0] or null.
async function fetchChart(symbol, { range, interval, includePrePost }) {
  const path =
    `/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?interval=${encodeURIComponent(interval)}` +
    `&range=${encodeURIComponent(range)}` +
    (includePrePost ? "&includePrePost=true" : "");
  const data = await fetchYahooJson(path);
  return data?.chart?.result?.[0] || null;
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
    const path =
      `/v1/finance/search?q=${encodeURIComponent(search)}` +
      `&quotesCount=10&newsCount=0`;
    const data = await fetchYahooJson(path);
    if (!data) {
      res.status(502).json({ error: "yahoo_search_failed" });
      return;
    }
    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");
    res.status(200).json(data);
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
