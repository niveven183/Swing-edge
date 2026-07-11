// ─── EARNINGS PROXY (Vercel serverless function) ───────────────────────────
// Next-earnings-date lookup for the Decision Coach's `timing` channel. Fully
// isolated from api/quote.js — its own cache, its own long TTL — so an earnings
// outage (Finnhub 429 on /calendar/earnings) never touches the live price path.
//
//   • Source : Finnhub /calendar/earnings?symbol=X&from=today&to=+14d
//   • Mode   : /api/earnings?symbol=NVDA
//              → { symbol, nextEarningsDate, daysUntil } | null
//
// Earnings dates barely move, so we cache aggressively (6h). On any upstream
// failure we serve stale cache when present, else null — the client treats null
// as "no earnings signal" and the Coach runs normally (fail-open).

import { rateLimit, clientIp } from "./_lib/rateLimit.js";

const FINNHUB_BASE = "https://finnhub.io/api/v1";

const fetchWithTimeout = (url, opts = {}, ms = 8000) => {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  return fetch(url, { ...opts, signal: c.signal }).finally(() => clearTimeout(t));
};

// Module-scope cache — survives warm invocations. 6h TTL: earnings dates are
// scheduled well ahead and rarely shift intraday.
const _earnCache = new Map(); // SYMBOL → { data, ts }
const EARN_TTL = 6 * 60 * 60 * 1000;

const VALID_SYMBOL = /^[A-Z0-9.\-]{1,15}$/;

// YYYY-MM-DD for a Date, in UTC (Finnhub calendar dates are calendar days).
const ymd = (d) => d.toISOString().slice(0, 10);

// Whole calendar days from today (UTC midnight) to an earnings YYYY-MM-DD.
const daysUntilFrom = (dateStr) => {
  const today = new Date(`${ymd(new Date())}T00:00:00Z`).getTime();
  const target = new Date(`${dateStr}T00:00:00Z`).getTime();
  if (!Number.isFinite(target)) return null;
  return Math.round((target - today) / 86_400_000);
};

// Pull the nearest future earnings date (>= today) from Finnhub. Returns the
// { symbol, nextEarningsDate, daysUntil } payload, or null (no earnings in the
// window / crypto / upstream failure). Never throws.
async function nextEarnings(symbol, key) {
  if (!key) return null;
  const now = Date.now();
  const cached = _earnCache.get(symbol);
  if (cached && now - cached.ts < EARN_TTL) return cached.data;

  const today = new Date();
  const to = new Date(today.getTime() + 14 * 86_400_000);
  const url =
    `${FINNHUB_BASE}/calendar/earnings?symbol=${encodeURIComponent(symbol)}` +
    `&from=${ymd(today)}&to=${ymd(to)}&token=${key}`;

  let r;
  try {
    r = await fetchWithTimeout(url, { headers: { Accept: "application/json" } });
  } catch {
    return cached ? cached.data : null; // network error → stale or null
  }
  if (!r.ok) {
    console.error(`Finnhub earnings failed: HTTP ${r.status}`);
    return cached ? cached.data : null; // 429/5xx → stale or null
  }

  const d = await r.json();
  const rows = Array.isArray(d?.earningsCalendar) ? d.earningsCalendar : [];
  const todayStr = ymd(today);
  const future = rows
    .map((x) => x?.date)
    .filter((s) => typeof s === "string" && s >= todayStr)
    .sort();

  const data =
    future.length > 0
      ? { symbol, nextEarningsDate: future[0], daysUntil: daysUntilFrom(future[0]) }
      : null; // no earnings in window (incl. crypto → empty calendar)

  _earnCache.set(symbol, { data, ts: now });
  return data;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const { allowed, retryAfter } = rateLimit(`${clientIp(req)}:earnings`, {
    windowMs: 60 * 1000,
    max: 60,
  });
  if (!allowed) {
    res.setHeader("Retry-After", String(retryAfter));
    res.status(429).json({ error: "rate_limited", retryAfter });
    return;
  }

  const symbol = String(req.query?.symbol || "").trim().toUpperCase();
  if (!symbol || !VALID_SYMBOL.test(symbol)) {
    res.status(200).json(null);
    return;
  }

  const data = await nextEarnings(symbol, process.env.FINNHUB_API_KEY || "");

  // Long edge cache — earnings dates are stable, mirror the 6h module TTL.
  res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=21600");
  res.status(200).json(data);
}
