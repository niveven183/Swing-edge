// api/health.js — dependency health probe (Vercel serverless function)
//
// Checks Supabase, Finnhub, Twelve Data, CoinGecko and Frankfurter in parallel so an
// outage in any one of them shows up here before a user hits it in the app.
// Each check gets a 5s timeout and never throws past itself — one bad
// dependency reports as "failing", it never crashes the whole probe.
//
// TwelveData is credit-limited and prone to transient 429/timeout, so a single
// blip must NOT page us — it is non-fatal (reported under `warnings`, still 200).
// Finnhub is also non-fatal for the same reason (transient 401/429/timeout
// shouldn't page us either — see console.error in checkFinnhub for root cause).
// CoinGecko is also non-fatal now — its rate-limits/timeouts shouldn't page us.
// Frankfurter (FX rates, api/fx.js) is non-fatal too: conversion degrades to the
// original currency with a marker, so an outage is a handled failure, not an
// incident. It is watched here so the degradation is visible rather than silent.
// Supabase stays the sole hard-fail (503) dependency since it's load-bearing.
//
//   GET /api/health
//     → 200 { status: "ok", checks: {...} }                         all pass
//     → 200 { status: "ok", warnings: ["twelvedata"], checks }      only TwelveData down
//     → 503 { status: "degraded", failing: [...], warnings, checks } a critical dep fails

import { rateLimit, clientIp } from "./_lib/rateLimit.js";

const FINNHUB_BASE = "https://finnhub.io/api/v1";
const COINGECKO_BASE = "https://api.coingecko.com/api/v3";
const TWELVEDATA_BASE = "https://api.twelvedata.com";
const FRANKFURTER_BASE = "https://api.frankfurter.app";
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

const SUPABASE_RETRY_DELAY_MS = 300;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Supabase is the sole hard-fail (503) dependency, so a single transient blip
// must not escalate straight to a page. Retry once after a short backoff; if the
// second attempt also fails (returns false or throws), it fails for real → 503.
async function checkSupabaseWithRetry() {
  try {
    if (await checkSupabase()) return true;
  } catch {
    // fall through to the retry below
  }
  await sleep(SUPABASE_RETRY_DELAY_MS);
  return checkSupabase();
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

// Frankfurter (ECB reference rates) — the FX source behind api/fx.js. Checked
// here because a new external dependency that nothing watches is a silent
// failure waiting to happen: when it is down, converted figures fall back to
// their original currency, which is correct behaviour but is indistinguishable
// from "the user has a dollar journal" unless something says otherwise.
async function checkFrankfurter() {
  const r = await timedFetch(`${FRANKFURTER_BASE}/latest?base=USD&symbols=ILS`, {
    headers: { Accept: "application/json" },
  });
  if (!r.ok) return false;
  const d = await r.json();
  // `ok` is not enough — a 200 with no rate is exactly the case that matters.
  return Number.isFinite(d?.rates?.ILS) && d.rates.ILS > 0;
}

const SERVICES = {
  supabase: checkSupabaseWithRetry,
  finnhub: checkFinnhub,
  twelvedata: checkTwelveData,
  coingecko: checkCoinGecko,
  frankfurter: checkFrankfurter,
};

// Non-fatal deps: reported under `warnings`, never trigger a 503. TwelveData's
// credit rate-limits (429/timeout) shouldn't page us on a transient blip;
// Finnhub gets the same treatment (see checkFinnhub's console.error for cause);
// CoinGecko's public API is similarly prone to transient rate-limits/timeouts.
// Frankfurter is non-fatal by design, not by tolerance: api/fx.js degrades to
// "no rate → show the original currency with a marker", so an outage costs a
// conversion, not the app. Paging on it would be paging on a handled failure.
const NON_FATAL = new Set(["twelvedata", "finnhub", "coingecko", "frankfurter"]);

async function run(fn) {
  const start = Date.now();
  try {
    const ok = await fn();
    return { ok, ms: Date.now() - start };
  } catch {
    return { ok: false, ms: Date.now() - start };
  }
}

// Short-lived in-memory cache of the last *healthy* (200) full pass. On a warm
// instance, repeat probes inside the window are served from here instead of
// re-hitting every dependency — cuts load/cost and smooths double cold-starts.
// Only 200 results are ever cached, so a real Supabase outage is never masked:
// a 503 is always computed live. Cache-Control stays no-store to the caller.
const CACHE_TTL_MS = 20000;
let healthCache = null; // { at: number, body: object }

export default async function handler(req, res) {
  // CORS stays wide open here — unlike every other endpoint. This probe is
  // consumed by EXTERNAL monitors (UptimeRobot, per docs/ARCHITECTURE.md) plus
  // sentinel.yml and fleet-weekly.yml. Narrowing it to our own origins would
  // break external uptime monitoring, which is the whole point of the endpoint.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  // Being open makes this the one endpoint an anonymous caller can use to spend
  // our money: every cache miss costs one TwelveData credit plus a Finnhub call,
  // and the cache below is per-instance, so parallel cold starts bypass it.
  // Measured legitimate peak per IP is 0.2/min — UptimeRobot's floor is one probe
  // per 5 min, and the only scheduled callers are sentinel.yml (twice an hour)
  // and fleet-weekly.yml (weekly), each from a fresh runner IP. health.yml is
  // deprecated (workflow_dispatch, no cron) and does not count. 30/min is ~150x
  // that peak: a real monitor cannot reach the ceiling; a loop can.
  const { allowed, retryAfter } = rateLimit(`health:${clientIp(req)}`, {
    windowMs: 60 * 1000,
    max: 30,
  });
  if (!allowed) {
    console.warn(`[rate_limited] health ip=${clientIp(req)} retryAfter=${retryAfter}s`);
    res.setHeader("Retry-After", String(retryAfter));
    res.status(429).json({ error: "rate_limited", retryAfter });
    return;
  }

  res.setHeader("Cache-Control", "no-store");

  if (healthCache && Date.now() - healthCache.at < CACHE_TTL_MS) {
    res.status(200).json(healthCache.body);
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

  if (criticalFailing.length > 0) {
    // A load-bearing dependency is down — page us. Never cached.
    res.status(503).json({ status: "degraded", failing: criticalFailing, warnings, checks });
    return;
  }

  // Healthy pass (with or without non-fatal warnings): cache it, then return.
  const body =
    warnings.length > 0 ? { status: "ok", warnings, checks } : { status: "ok", checks };
  healthCache = { at: Date.now(), body };
  res.status(200).json(body);
}
