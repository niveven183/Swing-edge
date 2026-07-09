// api/health.js — dependency health probe (Vercel serverless function)
//
// Checks Supabase, Finnhub, Twelve Data, and CoinGecko in parallel so an
// outage in any one of them shows up here before a user hits it in the app.
// Each check gets a 5s timeout and never throws past itself — one bad
// dependency reports as "failing", it never crashes the whole probe.
//
// TwelveData is credit-limited and prone to transient 429/timeout, so a single
// blip must NOT page us — it is non-fatal (reported under `warnings`, still 200).
// Finnhub is also non-fatal for the same reason (transient 401/429/timeout
// shouldn't page us either — see console.error in checkFinnhub for root cause).
// Supabase / CoinGecko stay hard-fail (503) since they're load-bearing.
//
//   GET /api/health
//     → 200 { status: "ok", checks: {...} }                         all pass
//     → 200 { status: "ok", warnings: ["twelvedata"], checks }      only TwelveData down
//     → 503 { status: "degraded", failing: [...], warnings, checks } a critical dep fails

const FINNHUB_BASE = "https://finnhub.io/api/v1";
const COINGECKO_BASE = "https://api.coingecko.com/api/v3";
const TWELVEDATA_BASE = "https://api.twelvedata.com";
const TIMEOUT_MS = 5000;

async function timedFetch(url, opts = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function checkSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const key =
    process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  if (!url || !key) return false;
  const r = await timedFetch(`${url}/rest/v1/feedback?select=id&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" },
  });
  return r.ok;
}

async function checkFinnhub() {
  const key = process.env.FINNHUB_API_KEY || "";
  if (!key) return false;
  const r = await timedFetch(`${FINNHUB_BASE}/quote?symbol=AAPL&token=${key}`, {
    headers: { Accept: "application/json" },
  });
  if (!r.ok) {
    console.error(`Finnhub health check failed: HTTP ${r.status}`);
    return false;
  }
  const d = await r.json();
  return typeof d?.c === "number" && d.c > 0;
}

// Single symbol, single call = 1 Twelve Data credit. Do not batch or widen this.
async function checkTwelveData() {
  const key = process.env.MARKETDATA_API_KEY || "";
  if (!key) return false;
  const r = await timedFetch(
    `${TWELVEDATA_BASE}/time_series?symbol=AAPL&interval=1day&outputsize=1&apikey=${key}`,
    { headers: { Accept: "application/json" } }
  );
  if (!r.ok) return false;
  const d = await r.json();
  return d?.status !== "error";
}

async function checkCoinGecko() {
  const r = await timedFetch(`${COINGECKO_BASE}/ping`, {
    headers: { Accept: "application/json" },
  });
  return r.ok;
}

const SERVICES = {
  supabase: checkSupabase,
  finnhub: checkFinnhub,
  twelvedata: checkTwelveData,
  coingecko: checkCoinGecko,
};

// Non-fatal deps: reported under `warnings`, never trigger a 503. TwelveData's
// credit rate-limits (429/timeout) shouldn't page us on a transient blip;
// Finnhub gets the same treatment (see checkFinnhub's console.error for cause).
const NON_FATAL = new Set(["twelvedata", "finnhub"]);

async function run(fn) {
  const start = Date.now();
  try {
    const ok = await fn();
    return { ok, ms: Date.now() - start };
  } catch {
    return { ok: false, ms: Date.now() - start };
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const names = Object.keys(SERVICES);
  const results = await Promise.all(names.map((n) => run(SERVICES[n])));

  const checks = {};
  const failing = [];
  names.forEach((n, i) => {
    checks[n] = results[i].ms;
    if (!results[i].ok) failing.push(n);
  });

  const criticalFailing = failing.filter((n) => !NON_FATAL.has(n));
  const warnings = failing.filter((n) => NON_FATAL.has(n));

  res.setHeader("Cache-Control", "no-store");
  if (criticalFailing.length > 0) {
    // A load-bearing dependency is down — page us.
    res.status(503).json({ status: "degraded", failing: criticalFailing, warnings, checks });
  } else if (warnings.length > 0) {
    // Only TwelveData is down: visible in the body, but non-fatal (no 503).
    res.status(200).json({ status: "ok", warnings, checks });
  } else {
    res.status(200).json({ status: "ok", checks });
  }
}
