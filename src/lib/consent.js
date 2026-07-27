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

// Fires on every decision change. Returns an unsubscribe function.
export function subscribeConsent(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
