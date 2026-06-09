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
//
// ── Why a cookie + crumb handshake ──────────────────────────────────────────
// Yahoo now returns HTTP 429 ("Too Many Requests") to header-spoofed requests
// that carry no session — including from datacenter (Vercel) IPs, so a bare
// fetch returns null for every symbol. The fix is the same handshake a browser
// does: grab a session cookie (A1/A3) from fc.yahoo.com, exchange it for a
// "crumb" at /v1/test/getcrumb, then send Cookie (+ crumb) on every data call.
// Creds are cached at module scope (survive warm invocations) and refreshed on
// the first 401/429. We still fail over across query1 / query2 per request.

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

// ── Session credentials (cookie + crumb) ───────────────────────────────────
// Cached across warm Lambda invocations; lazily (re)fetched on demand / 429.
let _creds = { cookie: "", crumb: "", ts: 0 };
const CREDS_TTL = 30 * 60 * 1000; // 30 min — Yahoo sessions are long-lived.

// Collapse a response's Set-Cookie header(s) into a "name=value; name=value"
// Cookie string (drops attributes like Path/Expires). undici exposes
// getSetCookie() for the multi-value case; fall back to the single header.
function cookieFromResponse(res) {
  const list =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : res.headers.get("set-cookie")
      ? [res.headers.get("set-cookie")]
      : [];
  return list
    .map((c) => c.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
}

// Perform the cookie → crumb handshake and cache the result.
async function refreshCreds() {
  let cookie = "";
  // fc.yahoo.com 404s but reliably sets the A1/A3 session cookie; finance.* is
  // a fallback (may 307 to a consent page from EU IPs — harmless server-side).
  for (const url of ["https://fc.yahoo.com/", "https://finance.yahoo.com/"]) {
    try {
      const r = await fetch(url, {
        headers: { ...YAHOO_HEADERS, Accept: "text/html,*/*" },
        redirect: "manual",
      });
      const c = cookieFromResponse(r);
      if (c) {
        cookie = c;
        break;
      }
    } catch {
      // try the next cookie source
    }
  }

  let crumb = "";
  if (cookie) {
    for (const host of YAHOO_HOSTS) {
      try {
        const r = await fetch(host + "/v1/test/getcrumb", {
          headers: { ...YAHOO_HEADERS, Cookie: cookie },
        });
        if (!r.ok) continue;
        const t = (await r.text()).trim();
        // A real crumb is short and opaque; reject error bodies ("Too Many…").
        if (t && t.length <= 64 && !/\s/.test(t) && !/<|too many/i.test(t)) {
          crumb = t;
          break;
        }
      } catch {
        // try the next host
      }
    }
  }

  _creds = { cookie, crumb, ts: Date.now() };
  return _creds;
}

async function getCreds() {
  if (_creds.cookie && Date.now() - _creds.ts < CREDS_TTL) return _creds;
  return refreshCreds();
}

// GET a Yahoo path across both hosts, returning the first 200 JSON body.
// Sends the session cookie (+ crumb) and, on a 401/429, refreshes the session
// once and retries. Returns null if every attempt failed.
async function fetchYahooJson(path) {
  let creds = await getCreds();

  for (let attempt = 0; attempt < 2; attempt++) {
    const sep = path.includes("?") ? "&" : "?";
    const url = creds.crumb ? path + sep + "crumb=" + encodeURIComponent(creds.crumb) : path;
    const headers = creds.cookie ? { ...YAHOO_HEADERS, Cookie: creds.cookie } : YAHOO_HEADERS;

    let blocked = false;
    for (const host of YAHOO_HOSTS) {
      try {
        const r = await fetch(host + url, { headers });
        if (r.status === 401 || r.status === 429) {
          blocked = true; // stale/missing session → try the other host, then refresh
          continue;
        }
        if (!r.ok) continue; // 5xx / 404 → try the next host
        return await r.json();
      } catch {
        // network error → try the next host
      }
    }

    // First pass hit only 401/429 → the session is stale; refresh once and retry.
    if (blocked && attempt === 0) {
      creds = await refreshCreds();
      continue;
    }
    break;
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

  // ── Debug mode (temporary) ─────────────────────────────────────────────────
  // ?debug=1 → report exactly what the handshake sees from Vercel's IP.
  if (q.debug === "1") {
    const dbg = { steps: [] };
    for (const url of ["https://fc.yahoo.com/", "https://finance.yahoo.com/"]) {
      try {
        const r = await fetch(url, { headers: { ...YAHOO_HEADERS, Accept: "text/html,*/*" }, redirect: "manual" });
        dbg.steps.push({ url, status: r.status, cookie: cookieFromResponse(r).slice(0, 80) });
      } catch (e) {
        dbg.steps.push({ url, error: String(e).slice(0, 120) });
      }
    }
    const creds = await refreshCreds();
    dbg.cookieLen = creds.cookie.length;
    dbg.crumb = creds.crumb;
    for (const host of YAHOO_HOSTS) {
      try {
        const sep = "?";
        const u = host + "/v8/finance/chart/AAPL?interval=1d&range=5d" + (creds.crumb ? "&crumb=" + encodeURIComponent(creds.crumb) : "");
        const r = await fetch(u, { headers: creds.cookie ? { ...YAHOO_HEADERS, Cookie: creds.cookie } : YAHOO_HEADERS });
        const body = await r.text();
        dbg.steps.push({ host, chartStatus: r.status, body: body.slice(0, 160) });
      } catch (e) {
        dbg.steps.push({ host, error: String(e).slice(0, 120) });
      }
    }
    res.status(200).json(dbg);
    return;
  }

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

  // Warm the session once before fanning out, so all symbols share one cookie/
  // crumb instead of triggering N parallel handshakes on a cold module.
  await getCreds();

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
