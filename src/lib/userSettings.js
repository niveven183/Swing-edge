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
// B-432 · B-435 (16.10) — local-first: the pending scalar edits and their version tokens.
import { markInflight, nextToken, sameToken } from "./settingsPending.js";
// B-435 · CAS (17.10) — the keys the delta journal owns (they are rebased from it, ⛔ carried from the cache).
import { COLLECTIONS } from "./settingsDelta.js";
import { SCALARS } from "./settingsPending.js";

const TABLE = "user_settings";
const MIRROR_KEY = "swingEdgeSettings"; // single localStorage mirror of the blob
const DEBOUNCE_MS = 1000;

// B-408 (14.10) — a settings read that never answers must END, as a failure. Without a deadline
// `hydrationFailed` never fires: the capital gate stays "loading" for the session (Log Trade
// locked, B-386) and the Settings edit gate would lock the five scalars with it. 8s = the
// B-376 FX ceiling (FX_SETTLE_MS) — ~6× the slow-4G window measured in the B-408 diagnosis.
// ⚠️ The bound is PER READ: hydration does two in series (existence check ⇒ load), so a check
// that answers at 7.9s followed by a load that hangs ends at ~16s. Said, ⛔ hidden.
export const SETTINGS_READ_TIMEOUT_MS = 8000;

// Race one read against the deadline. On expiry the request is ABORTED and the caller gets
// `{ error }` — the same shape supabase-js returns for any refused read, so the existing failure
// paths (`loadFailed` · `check-failed`) handle it. A late answer is DISCARDED: the race has
// already settled, and nothing below the `await` ever sees it (⛔ cache · ⛔ lastSent · ⛔ mirror).
async function readWithDeadline(build, timeoutMs, what = "read") {
  const ctl = new AbortController();
  let timer;
  const deadline = new Promise((resolve) => {
    timer = setTimeout(() => {
      ctl.abort();
      resolve({ data: null, error: { message: `settings ${what} timed out after ${timeoutMs}ms` } });
    }, timeoutMs);
  });
  try {
    return await Promise.race([build(ctl.signal), deadline]);
  } finally {
    clearTimeout(timer);
  }
}

// B-435 · CAS (Niv 18.10, fix ①) — a WRITE that never answers must end too: writes are serialized per user
// (below), so one hung request would otherwise stop every later write of the session. Same mechanism as the
// read deadline; expiry is handled exactly like a thrown request (⛔ settle, the next write goes out).
export const SETTINGS_WRITE_TIMEOUT_MS = 10000;

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

// ── B-361 / write elision ──────────────────────────────────────────────────
// 🔴 A page load with ZERO user intent produced a POST. `setUserProfile({...})` at
// SwingEdge_App.jsx:1801 builds a fresh object literal on every hydration, the
// persist effect's dep array compares by `Object.is`, and the debounce then upserted
// a blob byte-identical to the row it had just read. Remembering what we KNOW the
// row holds turns that into a no-op.
//
// ⚠️ Fail-OPEN by construction: an unknown hash always writes. A wrong answer in
// that direction costs one unnecessary write. The opposite mistake — skipping a real
// change — is silent data loss, and that one must be impossible.
const lastSent = new Map(); // userId -> stableStringify of the blob the DB holds

// B-432 · B-435 (16.10) — the row's VERSION TOKEN as this device last saw it (a confirmed read or write).
// `updated_at` is created by the client for every write (⛔ a server trigger on it — DECISIONS 16.10), so
// equality is identity: the row holds exactly the write that carried this token.
const lastToken = new Map(); // userId -> updated_at
/** The token of the row this device last read or wrote — the `base` of an edit made now (null: none). */
export function currentToken(userId) {
  return lastToken.has(userId) ? lastToken.get(userId) : null;
}
// keepalive's own limit is 64KB; the guard sits below it (Niv 16.10). Measured: user_settings p99/max
// 2,541B (n=52) — the guard is for the playbook-with-images blobs (~1MB, B-437).
export const KEEPALIVE_MAX_BYTES = 60 * 1024;
const keepaliveSent = new Map(); // userId -> stableStringify of the blob already sent by keepalive this page

// ── B-435 · CAS (17.10) — every write is CONDITIONAL on the row's token ──────────────────────────────────
// Measured hermetically (M-028): a write the page cancelled, applied by the server LATE, replaced the whole
// blob over a newer one — pixel7 19/30 (late after 1 write) · 25/30 (after 2) lost a setup. A write now says
// which version it was built on (`updated_at = base`); 0 rows ⇒ the row moved ⇒ CONFLICT ⇒ the app re-reads
// and rebases (the hydration itself), ⛔ a blind replace. Plan: docs/plans/PLAN-2026-10-17-b435-cas.md.
const writeChain = new Map(); // userId -> the promise of the last queued write (one in flight per user)
const confirmed = new Map(); // userId -> [{ token, blob }] — what the row PROVABLY held, newest last (≤ 8)
const hadRow = new Set(); // userId -> this session has seen this user's row (fix ④)
const rowGone = new Set(); // userId -> the row vanished mid-session ⇒ ⛔ an automatic insert (fix ④)
const conflictListeners = new Set();
/** A write was refused because the row moved (0 rows / 23505). `cb(userId, reason)`. */
export function onSettingsConflict(cb) {
  conflictListeners.add(cb);
  return () => conflictListeners.delete(cb);
}
function remember(userId, token, blob) {
  const list = (confirmed.get(userId) || []).filter((c) => !sameToken(c.token, token));
  list.push({ token, blob });
  confirmed.set(userId, list.slice(-8));
}
/** The blob this session PROVABLY saw at `token` (a read or a confirmed write), or null. */
export function confirmedAt(userId, token) {
  if (token == null) return null;
  const hit = (confirmed.get(userId) || []).find((c) => sameToken(c.token, token));
  return hit ? hit.blob : null;
}
/** The rebase is already decided and the result equals the row it read ⇒ that read is the confirmation. */
export function confirmSynced(userId, blob, token) {
  notifySynced(userId, blob, token);
}
/** True when the row vanished mid-session (fix ④) — the app shows `settings-sync-stuck`. */
export function settingsRowGone(userId) {
  return rowGone.has(userId);
}
function enqueue(userId, task) {
  const prev = writeChain.get(userId) || Promise.resolve();
  const run = prev.then(task, task); // a failed predecessor never stops the next write
  writeChain.set(userId, run.catch(() => {}));
  return run;
}
function notifyConflict(userId, reason) {
  lastSent.delete(userId);
  // The scheduled write would carry the same stale base: the rebase writes instead.
  const existing = pending.get(userId);
  if (existing?.timer) clearTimeout(existing.timer);
  pending.delete(userId);
  console.warn(`userSettings: write refused — the row moved since this device read it (${reason}); re-reading to rebase`);
  for (const cb of conflictListeners) {
    try { cb(userId, reason); } catch (e) { console.error("userSettings: onSettingsConflict listener threw", e); }
  }
}

// ⚠️ jsonb does ⛔ not preserve key order, and mergeSettings APPENDS new keys, so
// `JSON.stringify` of the same CONTENT can differ by ordering alone — and a hash that
// differs on ordering degrades to "always write", which is the bug we came to fix.
// Sorting keys compares content, which is what the storage layer actually stores.
// ⛔ Arrays are NOT sorted: order is semantic there (watchlist, playbook).
function stableStringify(v) {
  if (Array.isArray(v)) return "[" + v.map(stableStringify).join(",") + "]";
  if (isPlainObject(v)) {
    return "{" + Object.keys(v).sort()
      .map((k) => JSON.stringify(k) + ":" + stableStringify(v[k])).join(",") + "}";
  }
  return v === undefined ? "null" : JSON.stringify(v);
}

// True only when the blob is PROVABLY identical to what the DB already holds.
// ⛔ No `|| {}` / `?? {}` anywhere on this path — an absent entry is "we don't know",
// and "we don't know" means write.
function alreadySent(userId, blob) {
  const known = lastSent.get(userId);
  return known !== undefined && known === stableStringify(blob);
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

// B-406 (05.10) — who wants to know that the row PROVABLY holds a blob: the delta journal
// (src/lib/settingsDelta.js) clears an op only then. Called after a confirmed upsert AND on a
// skip proven identical to the row (Niv 05.10, fix ②) — without the skip path an op whose
// result the row already holds would stay forever. ⛔ It changes no write: no call is added,
// none is removed, `alreadySent` is untouched.
const syncedListeners = new Set();
export function onSettingsSynced(cb) {
  syncedListeners.add(cb);
  return () => syncedListeners.delete(cb);
}
// `token` (B-432 · B-435): the token the row now holds — the confirmed write's, or the read's on a proven skip.
function notifySynced(userId, blob, token = lastToken.has(userId) ? lastToken.get(userId) : null) {
  for (const cb of syncedListeners) {
    try { cb(userId, blob, token); } catch (e) {
      // A listener's bug must not fail the write that already landed — and it is said.
      console.error("userSettings: onSettingsSynced listener threw", e);
    }
  }
}

// ⚠️ supabase-js RETURNS errors, it does not throw them. An RLS denial or a
// constraint violation arrives as `{ error }` with the promise resolved, so a
// bare `await` inside try/catch sees only network-level exceptions — and the
// write failing is exactly the case that matters (INCIDENTS#15 registry item).
//
// ⛔ The contract is unchanged: a settings write NEVER throws.
//
// B-435 · CAS (17.10): the write is CONDITIONAL. With a base (the `updated_at` the DB returned for the row this
// device last read or wrote — byte-identical, ⛔ reformatted by the client) it is
//   update … where user_id = me and updated_at = base   (select updated_at)
// and an EMPTY array back (⛔ an error — ⛔ .single()) means the row moved ⇒ conflict. Without a base (no row
// yet, or the migration) it is an INSERT, and 23505 (two devices at once) ⇒ conflict. ⛔ A blind upsert.
async function upsertBlob(userId, blob, client, { timeoutMs = SETTINGS_WRITE_TIMEOUT_MS } = {}) {
  if (!client) return false;
  if (rowGone.has(userId)) {
    console.error("userSettings: write refused — this account's settings row vanished mid-session; ⛔ an automatic insert (B-191)");
    return false;
  }
  // ⚠️ Snapshot BEFORE the await. `cache` can move while the request is in flight,
  // and recording the NEWER blob as sent would elide a write that never happened —
  // exactly the silent loss this whole mechanism must not be able to cause.
  const sent = stableStringify(blob);
  const base = lastToken.has(userId) ? lastToken.get(userId) : null;
  // B-432 · B-435: this write's version token, on disk BEFORE the request leaves — if the page dies before
  // the answer, the next load can still tell «it landed» (row = token) from «it did not» (row = base).
  // Fix ② (18.10): max(now, base + 1ms) — ⛔ older than the row it is built on, whatever the client clock says.
  const token = nextToken(base);
  const store = ls();
  if (store) markInflight(store, token, { onFailure: (reason, e) => console.error(`userSettings: pending ${reason} — the inflight token was not recorded`, e) });
  try {
    const { data, error } = await readWithDeadline((signal) => (base != null
      ? client.from(TABLE).update({ settings: blob, updated_at: token }).eq("user_id", userId).eq("updated_at", base).select("updated_at").abortSignal(signal)
      : client.from(TABLE).insert({ user_id: userId, settings: blob, updated_at: token }).select("updated_at").abortSignal(signal)), timeoutMs, "write");
    if (error) {
      if (base == null && (error.code === "23505" || /duplicate key/i.test(error.message || ""))) {
        notifyConflict(userId, "insert-23505");
        return false;
      }
      console.error("userSettings: upsert rejected", error.message || error);
      lastSent.delete(userId); // ⛔ a write that did not land is ⛔ "what the row holds"
      return false;
    }
    if (!Array.isArray(data) || data.length === 0) {
      notifyConflict(userId, "0-rows");
      return false;
    }
    const landed = data[0]?.updated_at;
    if (landed == null) {
      console.error("userSettings: the write answered without updated_at — the row's version is unknown; treated as not landed");
      lastSent.delete(userId);
      return false;
    }
    lastSent.set(userId, sent);
    lastToken.set(userId, landed); // what the DB RETURNED (…+00:00), ⛔ the client's string (…Z)
    hadRow.add(userId);
    remember(userId, landed, blob);
    notifySynced(userId, blob, landed);
    return true;
  } catch (e) {
    // Network-level failure only — everything else arrives via `error` above.
    console.error("userSettings: upsert threw", e);
    lastSent.delete(userId); // the row's state is unknown ⇒ fail open, write next time
    return false;
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
export async function loadSettings(userId, client = supabase, { timeoutMs = SETTINGS_READ_TIMEOUT_MS } = {}) {
  if (client && userId) {
    try {
      const { data, error } = await readWithDeadline((signal) => client
        .from(TABLE)
        .select("settings, updated_at")
        .eq("user_id", userId)
        .abortSignal(signal)
        .maybeSingle(), timeoutMs);
      if (error) return loadFailed(userId, error);
      if (data && data.settings) {
        // B-435 · CAS (17.10) — a RE-read (a rebase after a conflict) carries over what this device changed and
        // the row does not know yet: keys outside the journal and the pending (welcomeSeen · tourDone · onboarding
        // …) whose cached value differs from what was last CONFIRMED. The journal's collections and the five
        // scalars are rebased by the app from their own records — carrying the cache's copy would replace again.
        const prev = cache.get(userId);
        const last = (confirmed.get(userId) || []).at(-1)?.blob;
        const carry = {};
        if (prev && last) {
          for (const k of Object.keys(prev)) {
            if (k in COLLECTIONS || SCALARS.includes(k)) continue;
            if (stableStringify(prev[k]) !== stableStringify(last[k])) carry[k] = prev[k];
          }
        }
        const merged = Object.keys(carry).length ? { ...data.settings, ...carry } : data.settings;
        cache.set(userId, merged);
        writable.add(userId);
        hadRow.add(userId);
        rowGone.delete(userId);
        // The blob we just READ is by definition what the row holds ⇒ re-sending it
        // is a no-op. This is the one fact strong enough to seed the hash (B-361).
        lastSent.set(userId, stableStringify(data.settings));
        // B-432 · B-435: the row's version token — the base of any edit made from now on.
        if (data.updated_at) { lastToken.set(userId, data.updated_at); remember(userId, data.updated_at, data.settings); }
        else lastToken.delete(userId);
        writeMirror(merged);
        return { status: "ok", settings: merged, updatedAt: data.updated_at ?? null };
      }
      // B-435 · CAS (Niv 18.10, fix ④) — no row, AFTER this session saw one: the row was DELETED (account
      // deletion · an operator). ⛔ An automatic insert: it would resurrect the account from this device's copy.
      // Writes stay blocked for the session and the app shows `settings-sync-stuck`. Dependency of B-191.
      if (hadRow.has(userId)) {
        console.error("userSettings: this account's settings row is gone (it existed earlier in this session) — writes blocked, ⛔ an automatic insert");
        rowGone.add(userId);
        writable.delete(userId);
        lastSent.delete(userId);
        lastToken.delete(userId);
        return { status: "failed", gone: true, settings: readMirror(), updatedAt: null };
      }
      // Authoritative "no row" (or a row with a null blob): writable.
      // ⛔ The hash is NOT seeded here. There is no row, so the mirror is ⛔ "what the
      // DB holds" — remembering it as sent would mean a brand-new user whose local
      // mirror already equals his first patch never gets a row written at all.
      const mirror = readMirror();
      cache.set(userId, mirror);
      writable.add(userId);
      lastSent.delete(userId);
      lastToken.delete(userId); // no row ⇒ no token: an edit made now has no base, and applies at the next load
      return { status: "empty", settings: mirror, updatedAt: null };
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
  if (userId) {
    writable.delete(userId);
    lastSent.delete(userId); // we could not read the row ⇒ we do ⛔ know what it holds
    lastToken.delete(userId);
  }
  return { status: "failed", settings: readMirror(), updatedAt: null };
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
    const blob = cache.get(userId) || {};
    // B-361 — identical to the row, ⛔ a write. B-406 — and that identity IS the confirmation
    // the delta journal waits for (lastSent is set only from a confirmed read or write).
    if (alreadySent(userId, blob)) { notifySynced(userId, blob); return; }
    // B-435 · CAS: serialized — the write takes the base the previous one returned (⛔ a self-conflict).
    enqueue(userId, () => {
      if (!writable.has(userId)) return false;
      const now = cache.get(userId) || {};
      if (alreadySent(userId, now)) { notifySynced(userId, now); return true; }
      return upsertBlob(userId, now, client);
    });
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
export async function flushSettings(userId, client = supabase, { timeoutMs = SETTINGS_WRITE_TIMEOUT_MS } = {}) {
  const existing = pending.get(userId);
  if (existing?.timer) clearTimeout(existing.timer);
  pending.delete(userId);
  if (!writable.has(userId)) return;
  const blob = cache.get(userId) || {};
  // ⚠️ The flush path is a DIFFERENT branch from the timer — B-361 has to gate both,
  // or closing the tab re-sends the unchanged blob the timer just declined to send.
  if (alreadySent(userId, blob)) { notifySynced(userId, blob); return; }
  await enqueue(userId, () => {
    const now = cache.get(userId) || {};
    if (alreadySent(userId, now)) { notifySynced(userId, now); return true; }
    return upsertBlob(userId, now, existing?.client || client, { timeoutMs });
  });
}

// B-432 · B-435 (16.10) — LAYER 2 of local-first: on pagehide / visibilitychange(hidden) the unconfirmed blob
// goes out with `keepalive`, which the browser keeps alive past the unload (a plain fetch is cancelled by the
// page — measured: iphone14 CI 49/50). SYNCHRONOUS: an unload handler cannot await. Its answer is usually
// never seen, so it settles NOTHING by itself — the pending edit (layer 1) stays and the next load decides by
// the row's token (decidePending). If the page is still alive when the 2xx arrives, it settles as usual.
// ⛔ sendBeacon: it cannot carry Authorization/apikey, and Supabase REST would refuse it.
export function flushKeepalive(userId, { accessToken, url, anonKey, fetchImpl = globalThis.fetch } = {}) {
  if (!userId || !writable.has(userId)) return { sent: false, reason: "not-writable" };
  const blob = cache.get(userId);
  if (!blob) return { sent: false, reason: "no-blob" };
  if (alreadySent(userId, blob)) return { sent: false, reason: "already-sent" };
  if (rowGone.has(userId)) return { sent: false, reason: "row-gone" };
  // B-435 · CAS: the same conditional write. No base ⇒ nothing to condition on ⇒ the pending carries it.
  const base = lastToken.has(userId) ? lastToken.get(userId) : null;
  if (base == null) {
    console.warn("userSettings: keepalive skipped — no row version to condition on; the pending edit will be sent at the next load");
    return { sent: false, reason: "no-base" };
  }
  if (!accessToken || !url || !anonKey || typeof fetchImpl !== "function") {
    console.warn("userSettings: keepalive skipped — no session token / endpoint; the pending edit will be sent at the next load");
    return { sent: false, reason: "no-endpoint" };
  }
  // pagehide + visibilitychange(hidden) + beforeunload can all fire for one unload: one keepalive per blob.
  const sent = stableStringify(blob);
  if (keepaliveSent.get(userId) === sent) return { sent: false, reason: "duplicate" };
  const token = nextToken(base);
  const body = JSON.stringify({ settings: blob, updated_at: token });
  const bytes = new TextEncoder().encode(body).length;
  if (bytes > KEEPALIVE_MAX_BYTES) {
    console.warn(`userSettings: keepalive skipped — body ${bytes}B > ${KEEPALIVE_MAX_BYTES}B (the 60KB guard); the pending edit will be sent at the next load`);
    return { sent: false, reason: "too-large", bytes };
  }
  const store = ls();
  if (store) markInflight(store, token, { onFailure: (reason, e) => console.error(`userSettings: pending ${reason} — the inflight token was not recorded`, e) });
  // The debounced write would carry the same blob — the keepalive replaces it.
  const existing = pending.get(userId);
  if (existing?.timer) clearTimeout(existing.timer);
  pending.delete(userId);
  keepaliveSent.set(userId, sent);
  fetchImpl(`${url}/rest/v1/user_settings?user_id=eq.${encodeURIComponent(userId)}&updated_at=eq.${encodeURIComponent(base)}&select=updated_at`, {
    method: "PATCH",
    keepalive: true,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body,
  }).then(async (res) => {
    // Usually never seen (the page is gone). When it is: same reading as the plain write.
    if (!res || !res.ok) { console.error("userSettings: keepalive upsert rejected", res?.status); return; }
    let rows = null;
    try { rows = await res.json(); } catch (e) { console.error("userSettings: keepalive answer unreadable — treated as not landed", e); return; }
    if (!Array.isArray(rows) || rows.length === 0) { notifyConflict(userId, "keepalive-0-rows"); return; } // the pending stays
    const landed = rows[0]?.updated_at;
    if (landed == null) { console.error("userSettings: keepalive answered without updated_at — treated as not landed"); return; }
    lastSent.set(userId, sent);
    lastToken.set(userId, landed);
    hadRow.add(userId);
    remember(userId, landed, blob);
    notifySynced(userId, blob, landed);
  }).catch((e) => console.error("userSettings: keepalive upsert threw (expected after an unload)", e));
  return { sent: true, token, bytes };
}

// One-shot bridge. If a Supabase row already exists → Supabase wins, do nothing.
// Otherwise read the 10 localStorage keys, build a parsed blob, and (if non-empty)
// upsert it with a `_migrated: true` flag stored INSIDE the settings jsonb.
export async function migrateFromLocalStorage(userId, client = supabase, { timeoutMs = SETTINGS_READ_TIMEOUT_MS } = {}) {
  if (!client || !userId) return { migrated: false, reason: "no-client" };

  try {
    // B-408 — a check that never answers is a check we could not complete ⇒ "check-failed".
    const { data, error } = await readWithDeadline((signal) => client
      .from(TABLE)
      .select("user_id")
      .eq("user_id", userId)
      .abortSignal(signal)
      .maybeSingle(), timeoutMs);
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
