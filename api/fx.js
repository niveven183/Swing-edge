// ─── FX RATE PROXY (Vercel serverless function) ─────────────────────────────
// Currency conversion needs a rate, and the rate must come from somewhere that
// can be named. This proxies api.frankfurter.app — ECB reference rates, keyless
// — and is the ONLY place in the system that talks to an FX provider.
//
// Modes (all GET):
//   • Spot      : /api/fx?base=USD&symbols=ILS
//                 → { base, date, rates: { ILS: 3.0574 } }
//   • Historical: /api/fx?base=USD&symbols=ILS&date=2026-03-31
//                 → { base, date, rates: { ILS: 3.164 } }
//   • Range     : /api/fx?base=USD&symbols=ILS&start=2026-07-28&end=2026-07-31
//                 → { base, start, end, rates: { "2026-07-28": { ILS: 3.0568 }, … } }
//
// ── Two properties of ECB rates that this file is built around ──
//
// 1. A PAST rate never changes. The 31.03 USD/ILS fixing is the same number
//    today, tomorrow and in a year. That is what makes a historical rate safe to
//    cache forever, and it is the whole reason a trade's P&L can be derived on
//    read instead of frozen into a DB column (see docs/plans/…-currency-conversion.md
//    part ד'). A number that moves by itself is a lie; this one does not move.
//
// 2. There is NO fixing on weekends or ECB holidays. Ask for Sunday 29.03 and
//    you get Friday 27.03 — and upstream tells you so in its `date` field. We
//    pass that through untouched rather than echoing the requested date, so the
//    UI can say "converted at the 27.03 rate" instead of quietly implying a
//    Sunday fixing existed. Same reason `latest` today (Monday 03.08) answers
//    31.07: these are reference rates published ~16:00 CET on business days, not
//    a live spot feed. Adequate for a trading journal, but it must be SAID.
//
// ── Failure policy ──
// Upstream down, unsupported pair, malformed answer → HTTP 200 with an explicit
// `error` string and NO rate. Never a fabricated rate, never a `|| 1` fallback,
// and never a global 5xx (one bad pair must not take down a page that also has
// perfectly good dollar trades on it). The absence of a rate is a real answer:
// the client renders the original currency with a marker, exactly like R renders
// "—" when risk is undefined.

import { rateLimit, clientIp } from "./_lib/rateLimit.js";
import { applyCors } from "./_lib/cors.js";

// The canonical host. `api.frankfurter.app` still answers but 301s here,
// and a service that works only because a redirect is followed is a
// dependency nobody wrote down — verified 03.08.2026.
const FRANKFURTER_BASE = "https://api.frankfurter.dev/v1";

// Abort a hung upstream so a stalled provider can't pin a serverless invocation
// open for its full timeout. Mirrors api/quote.js.
const fetchWithTimeout = (url, opts = {}, ms = 8000) => {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  return fetch(url, { ...opts, signal: c.signal }).finally(() => clearTimeout(t));
};

// ── Validation ──────────────────────────────────────────────────────────────
// Anything reaching the upstream URL is validated here first. These are the only
// two shapes that ever get interpolated into a request.
const isCode = (s) => /^[A-Z]{3}$/.test(s);
const isDay  = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);

// A syntactically valid day that isn't a real calendar day ("2026-02-31") would
// sail past the regex, so round-trip it through Date and require it to survive.
const isRealDay = (s) => {
  if (!isDay(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

// ── Cache ───────────────────────────────────────────────────────────────────
// Module scope, survives warm invocations. Mirrors _cgCache in api/quote.js.
//
// The TTL is split by mutability, not by convenience: a historical answer is
// immutable (property 1 above) so it is cached with no expiry at all, while a
// spot answer can be superseded by the next ECB publication and gets an hour.
// Collapsing these into one TTL would either re-fetch immutable data forever or
// serve a stale spot rate — both wrong for opposite reasons.
const _fxCache = new Map(); // url → { body, ts, immutable }
const SPOT_TTL = 60 * 60 * 1000; // 1h — ECB publishes once per business day
const CACHE_CAP = 500;           // bounded so a warm instance can't grow forever

function cacheGet(url) {
  const hit = _fxCache.get(url);
  if (!hit) return null;
  if (hit.immutable) return hit.body;
  return Date.now() - hit.ts < SPOT_TTL ? hit.body : null;
}

function cacheSet(url, body, immutable) {
  // Evict oldest-inserted first. Map preserves insertion order, and an immutable
  // historical entry is worth more than a spot entry that expires in an hour —
  // so prefer evicting a mutable one when there is any to evict.
  if (_fxCache.size >= CACHE_CAP) {
    const victim =
      [..._fxCache.entries()].find(([, v]) => !v.immutable)?.[0] ??
      _fxCache.keys().next().value;
    if (victim) _fxCache.delete(victim);
  }
  _fxCache.set(url, { body, ts: Date.now(), immutable });
}

// Fetch + cache one upstream URL. Returns the parsed body, or null with the
// reason logged — callers translate null into an explicit `error` for the client.
async function fetchRates(url, immutable) {
  const cached = cacheGet(url);
  if (cached) return cached;

  try {
    const r = await fetchWithTimeout(url, { headers: { Accept: "application/json" } });
    if (!r.ok) {
      // 404 here is upstream's clean "not found" for an unsupported currency —
      // a real answer meaning "no such rate", not a transport failure.
      console.warn(`[fx] upstream ${r.status} for ${url}`);
      return null;
    }
    const body = await r.json();
    if (!body || typeof body.rates !== "object" || body.rates === null) {
      console.warn(`[fx] malformed upstream body for ${url}`);
      return null;
    }
    cacheSet(url, body, immutable);
    return body;
  } catch (err) {
    console.warn(`[fx] upstream unreachable for ${url}: ${err?.message || err}`);
    return null;
  }
}

const todayUTC = () => new Date().toISOString().slice(0, 10);

export default async function handler(req, res) {
  if (applyCors(req, res, { methods: "GET, OPTIONS" })) return;

  // 30/min per IP. The client caches historical rates in localStorage forever
  // (they are immutable) and spot for the session, so steady-state usage is a
  // handful of calls per page load — this is roughly an order of magnitude of
  // headroom, sized like api/quote.js rather than guessed.
  const { allowed, retryAfter } = rateLimit(`${clientIp(req)}:fx`, {
    windowMs: 60 * 1000,
    max: 30,
  });
  if (!allowed) {
    console.warn(`[rate_limited] fx ip=${clientIp(req)} retryAfter=${retryAfter}s`);
    res.setHeader("Retry-After", String(retryAfter));
    res.status(429).json({ error: "rate_limited", retryAfter });
    return;
  }

  const q = req.query || {};
  const base = String(q.base || "USD").toUpperCase();
  const symbols = String(q.symbols || "").toUpperCase();

  if (!isCode(base) || !symbols.split(",").every(isCode)) {
    res.status(400).json({ error: "invalid_currency" });
    return;
  }

  const date  = q.date  ? String(q.date)  : "";
  const start = q.start ? String(q.start) : "";
  const end   = q.end   ? String(q.end)   : "";

  const qs = `base=${base}&symbols=${encodeURIComponent(symbols)}`;

  try {
    // ── Range mode ──────────────────────────────────────────────────────────
    if (start || end) {
      if (!isRealDay(start) || !isRealDay(end) || start > end) {
        res.status(400).json({ error: "invalid_range" });
        return;
      }
      const today = todayUTC();
      // A range is only immutable once its whole window is in the past. A window
      // ending today can still gain today's fixing when the ECB publishes.
      const immutable = end < today;
      const url = `${FRANKFURTER_BASE}/${start}..${end}?${qs}`;
      const body = await fetchRates(url, immutable);

      if (!body) {
        res.status(200).json({ base, start, end, rates: {}, error: "rate_unavailable" });
        return;
      }
      // Long-cache only what cannot change; otherwise let it revalidate hourly.
      res.setHeader("Cache-Control", immutable
        ? "public, max-age=86400, s-maxage=31536000, immutable"
        : "public, max-age=600, s-maxage=3600");
      res.status(200).json({
        base,
        // Echo the window upstream actually covered, not what we asked for.
        start: body.start_date || start,
        end: body.end_date || end,
        rates: body.rates,
      });
      return;
    }

    // ── Single-day / spot mode ──────────────────────────────────────────────
    if (date && !isRealDay(date)) {
      res.status(400).json({ error: "invalid_date" });
      return;
    }
    const today = todayUTC();
    const isPast = Boolean(date) && date < today;
    const url = date
      ? `${FRANKFURTER_BASE}/${date}?${qs}`
      : `${FRANKFURTER_BASE}/latest?${qs}`;

    const body = await fetchRates(url, isPast);
    if (!body) {
      // No rate is a legitimate answer. `date: null` says so unambiguously —
      // there is no number here to mistake for one.
      res.status(200).json({ base, date: null, rates: {}, error: "rate_unavailable" });
      return;
    }

    res.setHeader("Cache-Control", isPast
      ? "public, max-age=86400, s-maxage=31536000, immutable"
      : "public, max-age=600, s-maxage=3600");
    res.status(200).json({
      base,
      // body.date is the day upstream actually priced — for a weekend or holiday
      // request this is the previous business day, and the UI states it rather
      // than implying a fixing happened on a day markets were shut.
      date: body.date || null,
      rates: body.rates,
    });
  } catch (err) {
    // Defensive: everything above already handles its own failure. Reaching here
    // means a bug in this file, and it must not be indistinguishable from
    // "no rate today" — hence a distinct error string and a loud log.
    console.error(`[fx] handler fault: ${err?.message || err}`);
    res.status(200).json({ base, date: null, rates: {}, error: "fx_fault" });
  }
}
