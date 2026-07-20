// src/lib/userSettings.js — M1 persistence module (schema only, NO app wiring).
//
// Mirrors the trades pattern (SwingEdge_App.jsx:1208): Supabase is source of
// truth, localStorage is fallback. Pure functions + a supabase client only —
// zero React deps. The client is injected (default = the shared `supabase`) so
// M2 can call loadSettings(userId) directly while tests pass a mock or null.
//
// Storage shape: public.user_settings.settings is a single jsonb blob keyed by
// normalized camelCase fields (see LS_KEYS below).

import { supabase } from "../supabaseClient.js";

const TABLE = "user_settings";
const MIRROR_KEY = "swingEdgeSettings"; // single localStorage mirror of the blob
const DEBOUNCE_MS = 1000;

// localStorage key -> { field, parse }. `parse` turns the raw stored string into
// the value we persist in the jsonb blob. betaWelcome is handled separately
// because its key is per-user (`swingEdgeBetaWelcome:${userId}`).
const LS_KEYS = {
  swingEdgeCapital: { field: "capital", parse: (v) => parseFloat(v) },
  swingEdgeRiskPct: { field: "riskPct", parse: (v) => parseFloat(v) },
  swingEdgeOnboarding: { field: "onboarding", parse: JSON.parse },
  swingEdgeTourDone: { field: "tourDone", parse: (v) => v === "1" },
  swingEdgeWatchlist: { field: "watchlist", parse: JSON.parse },
  swingEdgePlaybook: { field: "playbook", parse: JSON.parse },
  swingEdgePriceAlerts: { field: "priceAlerts", parse: JSON.parse },
  swingEdgeLang: { field: "lang", parse: (v) => v },
};

// ── localStorage helpers (SSR/Node-safe; never throw) ──────────────────────
function ls() {
  return typeof localStorage !== "undefined" ? localStorage : null;
}
function readMirror() {
  const store = ls();
  if (!store) return {};
  try {
    const raw = store.getItem(MIRROR_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function writeMirror(blob) {
  const store = ls();
  if (!store) return;
  try {
    store.setItem(MIRROR_KEY, JSON.stringify(blob));
  } catch {}
}

// ── In-memory per-user state: merged cache + pending debounce timer ─────────
const cache = new Map(); // userId -> merged settings object
const pending = new Map(); // userId -> { timer, client }

function isPlainObject(v) {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

// Shallow-by-default merge; recurse only when BOTH sides are plain objects so
// partial patches don't clobber sibling keys. Arrays/scalars replace wholesale.
function mergeSettings(base, patch) {
  const out = { ...base };
  for (const [k, v] of Object.entries(patch || {})) {
    out[k] = isPlainObject(v) && isPlainObject(out[k]) ? mergeSettings(out[k], v) : v;
  }
  return out;
}

async function upsertBlob(userId, blob, client) {
  if (!client) return;
  try {
    await client
      .from(TABLE)
      .upsert({ user_id: userId, settings: blob, updated_at: new Date().toISOString() });
  } catch (e) {
    // Surface the failure but never throw from a settings write.
    console.error("userSettings: upsert failed", e);
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

// Supabase first; on any error / no client / no network → localStorage mirror.
// Never throws. Returns a plain object (possibly empty).
export async function loadSettings(userId, client = supabase) {
  if (client && userId) {
    try {
      const { data, error } = await client
        .from(TABLE)
        .select("settings")
        .eq("user_id", userId)
        .maybeSingle();
      if (!error && data && data.settings) {
        cache.set(userId, data.settings);
        writeMirror(data.settings);
        return data.settings;
      }
    } catch {
      // fall through to mirror
    }
  }
  const mirror = readMirror();
  cache.set(userId, mirror);
  return mirror;
}

// Merge `partial` into the cached blob (merge, NOT overwrite), write the mirror
// immediately, and debounce a single upsert 1000ms out.
export function saveSettings(userId, partial, client = supabase) {
  const merged = mergeSettings(cache.get(userId) || {}, partial || {});
  cache.set(userId, merged);
  writeMirror(merged);

  const existing = pending.get(userId);
  if (existing?.timer) clearTimeout(existing.timer);
  const timer = setTimeout(() => {
    pending.delete(userId);
    upsertBlob(userId, cache.get(userId) || {}, client);
  }, DEBOUNCE_MS);
  if (typeof timer.unref === "function") timer.unref();
  pending.set(userId, { timer, client });
}

// Cancel any pending debounce and upsert immediately (M2 unmount / tests).
export async function flushSettings(userId, client = supabase) {
  const existing = pending.get(userId);
  if (existing?.timer) clearTimeout(existing.timer);
  pending.delete(userId);
  await upsertBlob(userId, cache.get(userId) || {}, existing?.client || client);
}

// One-shot bridge. If a Supabase row already exists → Supabase wins, do nothing.
// Otherwise read the 10 localStorage keys, build a parsed blob, and (if non-empty)
// upsert it with a `_migrated: true` flag stored INSIDE the settings jsonb.
export async function migrateFromLocalStorage(userId, client = supabase) {
  if (!client || !userId) return { migrated: false, reason: "no-client" };

  try {
    const { data, error } = await client
      .from(TABLE)
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!error && data) return { migrated: false, reason: "exists" };
  } catch {
    return { migrated: false, reason: "check-failed" };
  }

  const store = ls();
  if (!store) return { migrated: false, reason: "no-localstorage" };

  const blob = {};
  for (const [key, { field, parse }] of Object.entries(LS_KEYS)) {
    let raw;
    try {
      raw = store.getItem(key);
    } catch {
      raw = null;
    }
    if (raw == null) continue;
    try {
      blob[field] = parse(raw);
    } catch {}
  }
  // betaWelcome uses a per-user key.
  try {
    if (store.getItem(`swingEdgeBetaWelcome:${userId}`) === "1") blob.betaWelcome = true;
  } catch {}

  if (Object.keys(blob).length === 0) return { migrated: false, reason: "empty" };

  blob._migrated = true;
  cache.set(userId, blob);
  writeMirror(blob);
  await upsertBlob(userId, blob, client);
  return { migrated: true };
}
