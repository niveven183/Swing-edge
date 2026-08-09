// src/lib/consent.js — single source of truth for the analytics consent record.
//
// Storage shape: { v: 1, analytics: 'granted' | 'denied', ts: '<ISO 8601>' }
// JSON rather than a bare string so `v` can be bumped to re-ask after a policy
// change, and so an `ad_storage` field can be added later without a breaking
// migration. The reader is deliberately forgiving: malformed JSON, an unknown
// version, or an unexpected value all resolve to null → banner returns → denied.
//
// The head block in index.html replays a stored grant before gtag.js loads.
// This module owns every write, plus the runtime `consent update` calls.

const KEY = "swingEdgeConsent";
const VERSION = 1;
const MEASUREMENT_ID = "G-VC8PKL4NL1";

const listeners = new Set();

function ls() {
  return typeof localStorage !== "undefined" ? localStorage : null;
}

// null = no decision yet. Otherwise 'granted' | 'denied'.
export function readConsent() {
  const store = ls();
  if (!store) return null;
  let raw;
  try {
    raw = store.getItem(KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const rec = JSON.parse(raw);
    if (!rec || rec.v !== VERSION) return null;
    if (rec.analytics !== "granted" && rec.analytics !== "denied") return null;
    return rec.analytics;
  } catch {
    return null;
  }
}

function write(analytics) {
  const store = ls();
  if (!store) return;
  try {
    store.setItem(KEY, JSON.stringify({ v: VERSION, analytics, ts: new Date().toISOString() }));
  } catch (e) {
    console.error("consent: failed to persist choice", e);
  }
}

function notify(analytics) {
  for (const fn of listeners) {
    try {
      fn(analytics);
    } catch (e) {
      console.error("consent: subscriber threw", e);
    }
  }
}

function updateGtag(analytics) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("consent", "update", { analytics_storage: analytics });
}

// A revoke that leaves the identifier behind is a false promise, so clear the
// GA cookies across every domain/path variant the tag could have written.
function clearGaCookies() {
  if (typeof document === "undefined") return;
  const host = window.location.hostname;
  const domains = [undefined, host, `.${host}`];
  const parts = host.split(".");
  if (parts.length > 2) domains.push(`.${parts.slice(-2).join(".")}`);

  const names = [`_ga`, `_ga_${MEASUREMENT_ID.replace(/^G-/, "")}`, "_gid", "_gat"];
  for (const name of names) {
    for (const domain of domains) {
      document.cookie =
        `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/` +
        (domain ? `; domain=${domain}` : "");
    }
  }
}

export function grantAnalytics() {
  write("granted");
  updateGtag("granted");
  notify("granted");
}

export function denyAnalytics() {
  write("denied");
  updateGtag("denied");
  notify("denied");
}

export function revokeAnalytics() {
  write("denied");
  updateGtag("denied");
  clearGaCookies();
  notify("denied");
}

// Aggregate product telemetry. Params must be low-cardinality enums only —
// never a ticker, a price, a user id or anything else that identifies a trade.
// Silently no-ops without a grant, so any rate derived from these events has
// the consenting population as its denominator, not the whole user base.
export function trackEvent(name, params) {
  if (readConsent() !== "granted") return;
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", name, params);
}

// GA4 counts one pageview at load, so client-side navigation was invisible and
// /app read as dead traffic. Only these four paths exist (src/main.jsx); anything
// else collapses to "/other" so a future route can never widen what we send.
// In-app tabs are useState, not routes — they do not navigate and are not counted.
const ROUTES = new Set(["/", "/app", "/terms", "/privacy"]);

// page_location is built from origin + an allowlisted path, never from href.
// search and hash are dropped on purpose: the OAuth return carries the session
// tokens in the fragment, and gtag's default would have shipped them (INCIDENTS #12).
export function trackPageView(pathname) {
  if (readConsent() !== "granted") return;
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  const path = ROUTES.has(pathname) ? pathname : "/other";
  window.gtag("event", "page_view", {
    page_location: window.location.origin + path,
  });
}

// The closed set of in-app screens, measured from the `tab === "…"` render
// branches in SwingEdge_App.jsx plus `onboarding`, which is a blocking screen
// rather than a tab. Anything else collapses to "other" — the same shape as
// ROUTES above, and for the same reason: a tab added next month must not widen
// what we send without someone editing this line.
//
// `analyzer` and `position` are absent on purpose. They are real values of `tab`
// for exactly one tick before an effect rewrites them to "tools", so sending
// them would report a screen the trader never saw.
export const SCREEN_NAMES = new Set([
  "admin", "analytics", "dashboard", "feedback", "intel", "journal",
  "mentoring", "notebook", "onboarding", "settings", "tools", "weeklyReview",
]);

export function trackScreenView(screen) {
  trackEvent("screen_view", { screen_name: SCREEN_NAMES.has(screen) ? screen : "other" });
}

export function trackOnboardingCompleted() {
  trackEvent("onboarding_completed");
}

// Which door the form was opened through, nothing about what went into it.
export function trackTradeFormOpened(source) {
  trackEvent("trade_form_opened", { source: source === "ocr" ? "ocr" : "manual" });
}

// Fires on EVERY OCR exit, success and failure alike. `ocr_result` only ever
// fired on the success path, which left us counting successes against no
// denominator at all. `ok` is coerced rather than passed through: callers reach
// this from catch blocks where the value at hand is an error, not a boolean.
// The failure REASON stays out by design — it is the one field that could carry
// text the model or the user produced.
export function trackOcrAttempted(ok) {
  trackEvent("ocr_attempted", { ok: ok === true });
}

const FIRST_TRADE_KEY = "swingEdgeFirstTrade";

// Activation: the user saved their first trade in this browser. Zero parameters —
// nothing about WHICH trade may leave the device.
//
// Two deliberate asymmetries:
//  1. The sentinel is written even when consent is denied. Otherwise a user who
//     records trades, then grants consent, would report "first trade" on what is
//     really their fifth. Under-count is a gap; over-count is a false number.
//  2. It is a localStorage key, so this measures "first trade in this browser",
//     not globally. Measuring globally needs a user id, which is exactly what
//     must never reach analytics. Two devices count twice, and that is the price.
export function trackFirstTradeSaved() {
  const store = ls();
  if (!store) return;
  try {
    if (store.getItem(FIRST_TRADE_KEY)) return;
    store.setItem(FIRST_TRADE_KEY, new Date().toISOString());
  } catch (e) {
    // A full quota must not silently turn every trade into a "first" one.
    console.error("consent: first-trade sentinel failed", e);
    return;
  }
  trackEvent("first_trade_saved");
}

// Fires on every decision change. Returns an unsubscribe function.
export function subscribeConsent(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
