// api/health.js — dependency health probe (Vercel serverless function)
//
// Checks Supabase, Finnhub, Twelve Data, and CoinGecko in parallel so an
// outage in any one of them shows up here before a user hits it in the app.
// Each check gets a 5s timeout and never throws past itself — one bad
// dependency reports as "failing", it never crashes the whole probe.
//
//   GET /api/health
//     → 200 { status: "ok", checks: { <service>: <ms>, ... } }      all pass
//     → 503 { status: "degraded", failing: [...], checks: {...} }   any fail

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
  if (!r.ok) return false;
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

  res.setHeader("Cache-Control", "no-store");
  if (failing.length === 0) {
    res.status(200).json({ status: "ok", checks });
  } else {
    res.status(503).json({ status: "degraded", failing, checks });
  }
}
