// Single source of truth for the API's CORS allowlist.
//
// CORS is enforced by the BROWSER, not the server: a curl/script caller sends no
// Origin header and receives a full response either way. So this closes
// cross-origin *browser* embedding (a third-party site using our proxies as a
// free market-data or Vision backend) — it is not a cost control. Rate limiting
// in ./rateLimit.js is what caps abuse from a direct caller.
//
// Consequence worth knowing before touching this: every server-side caller is
// unaffected by definition. Sentinel, fleet-weekly and UptimeRobot all reach
// /api/* through curl, so tightening the allowlist cannot break them.

const ALLOWED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "swing-edge.com",
  "www.swing-edge.com",
]);

// Returns the origin string when it is one of ours, else null. A null result
// means "send no Access-Control-Allow-Origin", which is what blocks the browser.
// Same-origin SPA calls carry no Origin header and never reach CORS at all.
export function resolveOrigin(origin) {
  if (!origin) return null;
  try {
    const host = new URL(origin).hostname;
    const ok = ALLOWED_HOSTS.has(host) || host.endsWith(".vercel.app");
    return ok ? origin : null;
  } catch {
    return null;
  }
}

/**
 * Apply the allowlist CORS headers. Returns true when the caller should stop
 * (the request was an OPTIONS preflight and has already been answered).
 *
 * `Vary: Origin` is mandatory here — the response varies per origin, and without
 * it a CDN can cache one origin's ACAO header and serve it to another.
 */
export function applyCors(req, res, { methods, headers = "Content-Type" } = {}) {
  const allowed = resolveOrigin(req.headers.origin);
  if (allowed) res.setHeader("Access-Control-Allow-Origin", allowed);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", methods);
  res.setHeader("Access-Control-Allow-Headers", headers);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}
