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
  swingEdgeAccountCurrency: { field: "accountCurrency", parse: (v) => v },
  // T10: the currency the capital NUMBER is denominated in, distinct from the
  // one it is displayed in. jsonb blob, so a new key costs no migration.
  swingEdgeCapitalCurrency: { field: "capitalCurrency", parse: (v) => v },
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

// ⚠️ B-268 / P7 — a NON-EMPTY cache is NOT "we have this user's row". loadSettings
// used to cache the localStorage mirror on a FAILED read too, so `cache.has(id)`
// answers "did we put something there", never "is it authoritative". This set
// answers the only question a write may be conditioned on: do we hold a blob we
// are entitled to send? It is granted by an authoritative read (a row, or an
// authoritative "no row"), by a successful migration, or by an explicit patch
// from a caller that passed its own hydration gate — and REVOKED by a failed read.
const writable = new Set(); // userId -> may be upserted

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

// ⚠️ supabase-js RETURNS errors, it does not throw them. An RLS denial or a
// constraint violation arrives as `{ error }` with the promise resolved, so a
// bare `await` inside try/catch sees only network-level exceptions — and the
// write failing is exactly the case that matters. Destructuring `{ error }` is
// what :94 and :145 in this file already do, and tradeWrite.js:39 too; this
// function was the one path that did not. INCIDENTS#15 registry item.
//
// ⛔ The contract is unchanged: a settings write NEVER throws. The only change
// is that a failure is now visible in the console instead of vanishing.
async function upsertBlob(userId, blob, client) {
  if (!client) return;
  try {
    const { error } = await client
      .from(TABLE)
      .upsert({ user_id: userId, settings: blob, updated_at: new Date().toISOString() });
    if (error) console.error("userSettings: upsert rejected", error.message || error);
  } catch (e) {
    // Network-level failure only — everything else arrives via `error` above.
    console.error("userSettings: upsert threw", e);
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

// Supabase first; on any error / no client / no network → localStorage mirror.
// Never throws. Returns { status, settings }:
//
//   ok     — a row was read. settings = the stored blob.
//   empty  — maybeSingle resolved {data:null, error:null}. That is AUTHORITATIVE:
//            there is no row. A brand-new user must still be able to write his
//            first one, so `empty` stays writable. Collapsing empty into failed
//            would regress exactly that user.
//   failed — non-empty error / thrown / no client / no userId. The mirror is
//            still returned FOR DISPLAY, but the cache is not seeded and the
//            user is revoked, so nothing can be written back over the real row.
//
// ⚠️ B-269: `if (!error && data)` used to send a FAILED read down the same path
// as "no row" — the caller could not tell them apart, marked hydration done, and
// DEFAULT_CAPITAL was then persisted over the user's real capital (B-268).
// ⛔ The contract is unchanged in one respect: this never throws.
export async function loadSettings(userId, client = supabase) {
  if (client && userId) {
    try {
      const { data, error } = await client
        .from(TABLE)
        .select("settings")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) return loadFailed(userId, error);
      if (data && data.settings) {
        cache.set(userId, data.settings);
        writable.add(userId);
        writeMirror(data.settings);
        return { status: "ok", settings: data.settings };
      }
      // Authoritative "no row" (or a row with a null blob): writable.
      const mirror = readMirror();
      cache.set(userId, mirror);
      writable.add(userId);
      return { status: "empty", settings: mirror };
    } catch (e) {
      return loadFailed(userId, e);
    }
  }
  return loadFailed(userId, "no client or no userId");
}

// Failed read: report it (same shape as upsertBlob:90 — ⛔ no silent failure),
// hand back the mirror for DISPLAY, and ⛔ do NOT seed the cache — :119 seeding
// the mirror here is what flushSettings later uploaded over the real row.
function loadFailed(userId, err) {
  console.error("userSettings: load rejected", err?.message || err);
  if (userId) writable.delete(userId);
  return { status: "failed", settings: readMirror() };
}

// Merge `partial` into the cached blob (merge, NOT overwrite), write the mirror
// immediately, and debounce a single upsert 1000ms out.
export function saveSettings(userId, partial, client = supabase) {
  const merged = mergeSettings(cache.get(userId) || {}, partial || {});
  cache.set(userId, merged);
  // An explicit patch from a caller that passed its own hydration gate. The
  // mirror is written either way — a blocked DB write never costs local data.
  writable.add(userId);
  writeMirror(merged);

  const existing = pending.get(userId);
  if (existing?.timer) clearTimeout(existing.timer);
  const timer = setTimeout(() => {
    pending.delete(userId);
    if (!writable.has(userId)) return;
    upsertBlob(userId, cache.get(userId) || {}, client);
  }, DEBOUNCE_MS);
  if (typeof timer.unref === "function") timer.unref();
  pending.set(userId, { timer, client });
}

// Cancel any pending debounce and upsert immediately (M2 unmount / tests).
// ⚠️ P7 — the third clobber path, found while writing assertion 7 and ⛔ absent
// from the 28.08 audit: this used to upsert UNCONDITIONALLY. A failed read seeded
// the cache with the mirror (or with `{}`), and closing the tab then wrote that
// over the user's real row. The gate asks whether we hold an authoritative blob,
// ⛔ not whether the cache is non-empty — the cache was non-empty in exactly the
// failure case.
export async function flushSettings(userId, client = supabase) {
  const existing = pending.get(userId);
  if (existing?.timer) clearTimeout(existing.timer);
  pending.delete(userId);
  if (!writable.has(userId)) return;
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
    // ⚠️ B-268 / 1a — the cleanest clobber path in the module, and one line.
    // supabase-js RETURNS the error; `!error && data` sent an RLS denial straight
    // through, and the function then built a blob from localStorage and let
    // upsertBlob OVERWRITE an existing row. The catch below only ever saw
    // network-level throws. ⛔ A check we could not complete is ⛔ not "no row".
    if (error) return { migrated: false, reason: "check-failed" };
    if (data) return { migrated: false, reason: "exists" };
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
  writable.add(userId); // the existence check completed and said "no row"
  writeMirror(blob);
  await upsertBlob(userId, blob, client);
  return { migrated: true };
}
