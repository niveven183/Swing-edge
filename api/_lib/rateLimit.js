// In-memory, per-serverless-instance rate limiter. Best-effort/probabilistic:
// each warm Lambda instance holds its own Map, and state resets on cold start.
// This does NOT provide a hard global cap — it raises the cost of a runaway
// loop enough to stop accidental abuse, not determined attackers. Acceptable
// per product requirements (no external store, no new dependency).

// key -> { hits: number[] (timestamps, ms), windowMs: number }
// windowMs is stored per-entry (not passed into sweep()) so a sweep triggered
// by a short-window key (e.g. a 60s call) never prunes a different key's
// longer-window history (e.g. a 60min call) as if it used the same window.
const buckets = new Map();

const SWEEP_THRESHOLD = 5000; // sweep stale keys once the map grows past this

function sweep(now) {
  for (const [k, entry] of buckets) {
    const fresh = entry.hits.filter((t) => now - t < entry.windowMs);
    if (fresh.length) entry.hits = fresh;
    else buckets.delete(k);
  }
}

/**
 * @param {string} key - identity+endpoint composite key
 * @param {{ windowMs: number, max: number }} opts
 * @returns {{ allowed: boolean, retryAfter: number }}
 *   retryAfter is whole seconds until the oldest hit in the current window
 *   expires (0 when allowed=true).
 */
export function rateLimit(key, { windowMs, max }) {
  const now = Date.now();
  if (buckets.size > SWEEP_THRESHOLD) sweep(now);

  const entry = buckets.get(key) || { hits: [], windowMs };
  entry.windowMs = windowMs;
  entry.hits = entry.hits.filter((t) => now - t < windowMs);

  if (entry.hits.length >= max) {
    buckets.set(key, entry);
    const oldest = entry.hits[0];
    const retryAfter = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
    return { allowed: false, retryAfter };
  }

  entry.hits.push(now);
  buckets.set(key, entry);
  return { allowed: true, retryAfter: 0 };
}

/** IP from x-forwarded-for: first entry is the original client per Vercel's chain. */
export function clientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (xff) return String(xff).split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}
