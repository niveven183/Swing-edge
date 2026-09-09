// ─── BOUNDARY ALERT CHANNEL (client → /api/alert) ──────────────────────────
//
// The operator-visible half of B-304. Sentry already receives the exception;
// this is the second channel, because a Sentry event is only seen when someone
// opens Sentry. AUDIT-2026-09-07 measured the cost of that: 18h34m broken,
// 1 of 6 alerting layers fired.
//
// ⛔ The Discord webhook URL is NOT here and must never be. Anything in this
// file ships in the bundle, so a webhook here is a published secret that anyone
// can post to (B-310). The URL lives in Vercel env, server-side, and /api/alert
// is the only thing that reads it. This module knows a path, not a secret.
//
// Best-effort BY DESIGN, and it never throws. A boundary that fails to alert
// must still render its error card: the card is the user-visible guarantee,
// Discord is the operator-visible one, and losing the second must never cost
// the first (PLAN-2026-09-07 §3.3).

export const APP_RELEASE = "v1.0.1";

// A crashing panel re-renders and re-throws — React retries the subtree before
// settling on the fallback, and a user clicking "try again" throws again. Without
// this, one broken cell becomes a burst of identical messages and the channel
// trains its reader to ignore it. Keyed per boundary+message, per page load.
const alreadySent = new Set();

export function resetAlertDedupe() {
  alreadySent.clear();
}

export function reportBoundaryCrash({ error, boundary, route }) {
  try {
    const message = String(error?.message || error || "unknown error").slice(0, 300);
    const key = `${boundary}::${message}`;
    if (alreadySent.has(key)) return false;
    alreadySent.add(key);

    // keepalive so the report survives the user navigating away from a screen
    // that just broke — which is exactly what a user does when a panel breaks.
    fetch("/api/alert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        message,
        boundary: String(boundary || "unknown").slice(0, 60),
        release: APP_RELEASE,
        route: String(route || "").slice(0, 200),
      }),
    }).catch((err) => {
      // Named, not swallowed: if this channel is dead we want it greppable in
      // the browser console rather than silently absent (CLAUDE.md §2).
      console.error("[alertChannel] /api/alert POST failed —", err?.message || err);
    });
    return true;
  } catch (err) {
    console.error("[alertChannel] report failed —", err?.message || err);
    return false;
  }
}
