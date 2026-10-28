// src/lib/sentryScrub.js — what may leave the browser for Sentry (B-458, wave 1 F3).
//
// 🔴 MEASURED 28.10 (docs/audits/WAVE1-DIAGNOSIS-2026-10-28.md §F3): supabase-js runs the implicit
// flow, so a sign-in / magic-link / password-recovery return lands on
// `/app#access_token=…&refresh_token=…&type=recovery`. With no hooks on Sentry.init, the sampled
// pageload transaction carried both tokens in `request.url`, `contexts.trace.data["url.full"]` and
// `spans[].description`, and an event captured during the load carried them in `request.url`.
// That is INCIDENTS #12 in a third channel (#40).
//
// THE RULES (Niv 28.10, fixes ①②):
//  ① Tokens are filtered ONLY as a query/fragment parameter INSIDE a string value
//    (`[?#&]name=value`). ⛔ Never by an object key — `tags.code` is the Postgres error code
//    the write-failure telemetry depends on (B-459), and a key filter would erase it.
//  ② A fragment (`#…`) is cut ONLY from a string that starts with `http(s)://` or `/`, or that
//    carries one of the token parameters. "Trade #3 failed" / "rank #1" stay byte-identical.
//  The fragment cut is the part that does not depend on a name list: whatever a provider calls
//  its parameter next year, a URL's fragment does not leave.
//
// G-crumb (Niv 28.10): the SDK turns every console call into a breadcrumb whose message is
// all arguments joined. `console.error("Supabase insert failed:", res.reason, res.message)`
// carries Postgres text ("Failing row contains (…)" = the row's values) onto every later event.
// A console breadcrumb therefore keeps its FIRST argument only — the fixed prefix.

const TOKEN_KEYS = ["access_token", "refresh_token", "provider_token", "code", "token_hash", "type"];
const PARAM_RE = new RegExp(`([?#&])(${TOKEN_KEYS.join("|")})=([^&#\\s"'<>]*)`, "gi");
const HAS_PARAM_RE = new RegExp(`[?#&](${TOKEN_KEYS.join("|")})=`, "i");
const URL_LIKE_RE = /^(https?:\/\/|\/)/i;
const FRAGMENT_RE = /#[^\s"'<>]*/g;

export const FILTERED = "[Filtered]";

// Event kinds whose breadcrumbs are dropped whole: their tags are the whole report, and the
// trail before them (quote fetches with tickers, console lines) is exactly what must not ride along.
export const BARE_KINDS = new Set(["write_failure", "settings_read_failure"]);

/** Scrub one string value. Anything that is not a string is returned as is. */
export function scrubUrl(s) {
  if (typeof s !== "string" || s === "") return s;
  const tokenBearing = HAS_PARAM_RE.test(s);
  if (!tokenBearing && !URL_LIKE_RE.test(s)) return s;
  let out = s.replace(PARAM_RE, (_m, sep, name) => `${sep}${name}=${FILTERED}`);
  out = out.replace(FRAGMENT_RE, "");
  return out;
}

// Deep walk over VALUES. Keys are never read for a decision (rule ①).
function walk(v, seen, depth) {
  if (typeof v === "string") return scrubUrl(v);
  if (!v || typeof v !== "object" || depth > 30 || seen.has(v)) return v;
  seen.add(v);
  if (Array.isArray(v)) {
    for (let i = 0; i < v.length; i++) v[i] = walk(v[i], seen, depth + 1);
    return v;
  }
  for (const k of Object.keys(v)) v[k] = walk(v[k], seen, depth + 1);
  return v;
}

/** Scrub every string value in an event / transaction, in place. Returns the same object. */
export function scrubEvent(event) {
  if (!event || typeof event !== "object") return event;
  return walk(event, new WeakSet(), 0);
}

/** Sentry `beforeBreadcrumb`. */
export function scrubBreadcrumb(crumb) {
  if (!crumb || typeof crumb !== "object") return crumb;
  if (crumb.category === "console") {
    const args = crumb.data && Array.isArray(crumb.data.arguments) ? crumb.data.arguments : null;
    crumb.message = args && typeof args[0] === "string" ? args[0] : "[console]";
    if (crumb.data) delete crumb.data.arguments;
  }
  return scrubEvent(crumb);
}

/** Sentry `beforeSend` (error / message events). */
export function sentryBeforeSend(event) {
  if (!event || typeof event !== "object") return event;
  if (BARE_KINDS.has(event.tags && event.tags.kind)) delete event.breadcrumbs;
  return scrubEvent(event);
}

/** Sentry `beforeSendTransaction`. */
export function sentryBeforeSendTransaction(event) {
  return scrubEvent(event);
}
