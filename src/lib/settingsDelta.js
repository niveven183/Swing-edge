// src/lib/settingsDelta.js — the device's own changes to the settings collections, kept
// until the DB is proven to hold them (B-406 · B-397 · B-407, 05.10).
// Plan: docs/plans/PLAN-2026-10-05-b406-b397-hydration-delta.md
//
// WHY. Hydration used to decide per collection with a snapshot taken BEFORE two network
// awaits: "local non-empty ⇒ the DB is ignored · local empty ⇒ the DB overwrites". Both
// directions lost data silently (measured 05.10, docs/audits/B406-HYDRATION-DIAGNOSIS-2026-10-05.md):
//   · a setup / alert added while the read was in flight was overwritten by the DB (B-406);
//   · a stale local list hid what another device wrote, then wrote over it (B-397);
//   · on a fresh browser the DEFAULT watchlist (persisted on the login screen) replaced the
//     user's watchlist in the DB (B-407).
//
// THE RULE (Niv's B-361 decision 22.09, on the read side): the DB is the base; what THIS
// device changed is applied on top. ⛔ "union by id" (it resurrects deletions and unions the
// defaults into the DB) · ⛔ "whatever arrived last wins".
//
// THE JOURNAL holds KEYS ONLY — {coll, key, op, seq}. ⛔ values: a `put` takes its value from
// the collection's own localStorage key at apply time. A journal with values would be a third
// copy of every Playbook image (list + settings mirror + journal) — measured 05.10: 1,152,316
// chars for five stored images, the K15 quota failure all over again.
//
// BOUNDED. One op per (coll, key) — a newer op replaces the older. Past DELTA_MAX_OPS /
// DELTA_MAX_BYTES the collection folds into ONE `replace` op (local wins for that collection
// at the next hydration — today's behaviour, ⛔ a loss) and the caller is told. A journal write
// that fails is reported too — ⛔ an op is ever dropped silently.
//
// CLEARED only when a write is CONFIRMED to hold the result (`settleOps`, fed by
// userSettings.onSettingsSynced — a confirmed upsert, or a skip proven identical to the row).

export const DELTA_KEY = "swingEdgeSettingsDelta";
// Set after the first merge on this device. Without it the device predates the journal, and
// what it holds locally may never have reached the DB ⇒ one union, local wins on the same key.
export const DELTA_V1_KEY = "swingEdgeSettingsDeltaV1";
export const DELTA_MAX_OPS = 500;
export const DELTA_MAX_BYTES = 32 * 1024;

// storage: the collection's own localStorage key · kind: list (array of items) or map (object)
// key: the identity of an item · project: what the DB row stores (what a settle compares).
export const COLLECTIONS = Object.freeze({
  playbook: { storage: "swingEdgePlaybook", kind: "list", key: (s) => String(s?.id), project: (s) => s },
  watchlist: {
    storage: "swingEdgeWatchlist", kind: "list", key: (w) => String(w?.ticker),
    // The row keeps {ticker, setup, chartSym} (the persist effect maps it); price/change are live.
    project: (w) => ({ ticker: w?.ticker, setup: w?.setup, chartSym: w?.chartSym }),
  },
  priceAlerts: { storage: "swingEdgePriceAlerts", kind: "map" },
});

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function fail(onFailure, reason, error) {
  // ⛔ a silent path: no callback is itself a failure to report.
  if (typeof onFailure === "function") onFailure(reason, error);
  else console.error(`[settingsDelta] ${reason} — and no onFailure was given`, error);
}

/** The journal as stored. A corrupt journal is REPORTED and read as empty (⛔ thrown at the UI). */
export function readOps(store, { onFailure } = {}) {
  let raw;
  try { raw = store.getItem(DELTA_KEY); } catch (e) { fail(onFailure, "read", e); return []; }
  if (!raw) return [];
  try {
    const ops = JSON.parse(raw);
    if (!Array.isArray(ops)) throw new Error("journal is not an array");
    return ops;
  } catch (e) {
    fail(onFailure, "corrupt", e);
    return [];
  }
}

function writeOps(store, ops, onFailure) {
  try {
    if (ops.length) store.setItem(DELTA_KEY, JSON.stringify(ops));
    else store.removeItem(DELTA_KEY);
    return true;
  } catch (e) {
    fail(onFailure, "write", e);
    return false;
  }
}

/**
 * Record one change the user made on this device. `op` is "put" or "del".
 * Returns false when the journal could not hold it (already reported through onFailure).
 */
export function recordOp(store, coll, key, op, { onFailure } = {}) {
  if (!COLLECTIONS[coll]) throw new Error(`[settingsDelta] unknown collection "${coll}"`);
  if (op !== "put" && op !== "del") throw new Error(`[settingsDelta] unknown op "${op}"`);
  const ops = readOps(store, { onFailure });
  // A `replace` already covers every key of this collection.
  if (ops.some((o) => o.coll === coll && o.op === "replace")) return true;
  const seq = ops.reduce((m, o) => Math.max(m, o.seq || 0), 0) + 1;
  // One op per (coll, key): the newer one replaces the older.
  let next = ops.filter((o) => !(o.coll === coll && o.key === String(key)));
  next.push({ coll, key: String(key), op, seq });
  if (next.length > DELTA_MAX_OPS || JSON.stringify(next).length > DELTA_MAX_BYTES) {
    next = next.filter((o) => o.coll !== coll);
    next.push({ coll, key: null, op: "replace", seq });
    fail(onFailure, "cap");
  }
  return writeOps(store, next, onFailure);
}

function readLocal(store, coll, onFailure) {
  const c = COLLECTIONS[coll];
  try {
    const raw = store.getItem(c.storage);
    const v = raw ? JSON.parse(raw) : null;
    if (c.kind === "list") return Array.isArray(v) ? v : null;
    return v && typeof v === "object" && !Array.isArray(v) ? v : null;
  } catch (e) {
    // An unreadable local copy contributes nothing — the DB stays the base — and it is said.
    fail(onFailure, "local", e);
    return null;
  }
}

/**
 * The value a collection should hold after hydration: `remote` (the DB) with this device's
 * ops applied on top. `local` is the collection's own copy — where a `put` takes its value.
 */
export function applyDelta(coll, remote, ops, local) {
  const c = COLLECTIONS[coll];
  const mine = ops.filter((o) => o.coll === coll).sort((a, b) => a.seq - b.seq);
  if (mine.some((o) => o.op === "replace")) return local ?? remote;
  if (c.kind === "list") {
    const out = Array.isArray(remote) ? [...remote] : [];
    const localList = Array.isArray(local) ? local : [];
    for (const o of mine) {
      const at = out.findIndex((x) => c.key(x) === o.key);
      if (o.op === "del") {
        if (at >= 0) out.splice(at, 1);
        continue;
      }
      const item = localList.find((x) => c.key(x) === o.key);
      if (!item) continue; // the local write itself failed — already reported where it failed
      if (at >= 0) out[at] = item;
      else out.push(item);
    }
    return out;
  }
  const out = remote && typeof remote === "object" && !Array.isArray(remote) ? { ...remote } : {};
  const localMap = local && typeof local === "object" ? local : {};
  for (const o of mine) {
    if (o.op === "del") { delete out[o.key]; continue; }
    if (Object.prototype.hasOwnProperty.call(localMap, o.key)) out[o.key] = localMap[o.key];
  }
  return out;
}

const isDefaultWatchlist = (list, defaults) =>
  Array.isArray(list) && Array.isArray(defaults) && list.length === defaults.length
  && list.every((w, i) => w?.ticker === defaults[i]?.ticker);

/**
 * Hydration for the three collections. `remoteSettings` is the DB row (status "ok" only).
 * Returns { [coll]: value } for every collection the row carries — a collection the row does
 * NOT carry is left alone (no base to merge onto; the persist effect will write it).
 * `defaultWatchlist`: the app's default list — on a device without the journal marker it is
 * ⛔ treated as the user's data (B-407: it was written on the login screen, not chosen).
 */
export function hydrateCollections(store, remoteSettings, { ops: given, defaultWatchlist = null, onFailure } = {}) {
  // `ops` is read by the caller AFTER its awaits (SwingEdge_App.jsx hydrate) — a journal read
  // before them misses whatever the user did while the read was in flight (B-406).
  const ops = given ?? readOps(store, { onFailure });
  let legacy = false;
  try { legacy = store.getItem(DELTA_V1_KEY) !== "1"; } catch (e) { fail(onFailure, "read", e); }
  const out = {};
  for (const coll of Object.keys(COLLECTIONS)) {
    const remote = remoteSettings ? remoteSettings[coll] : undefined;
    const c = COLLECTIONS[coll];
    const remoteOk = c.kind === "list" ? Array.isArray(remote) : remote && typeof remote === "object" && !Array.isArray(remote);
    if (!remoteOk) continue;
    const local = readLocal(store, coll, onFailure);
    let effective = ops;
    if (legacy && local && !(coll === "watchlist" && isDefaultWatchlist(local, defaultWatchlist))) {
      // One union for a device that predates the journal: every local key counts as a change.
      const keys = c.kind === "list" ? local.map(c.key) : Object.keys(local);
      effective = [...ops, ...keys.map((key, i) => ({ coll, key, op: "put", seq: -keys.length + i }))];
    }
    out[coll] = applyDelta(coll, remote, effective, local);
  }
  try { store.setItem(DELTA_V1_KEY, "1"); } catch (e) { fail(onFailure, "write", e); }
  return out;
}

/**
 * A write is confirmed to hold `sentBlob`: drop every op whose result it carries.
 * put ⇒ the row holds this device's current value for the key · del ⇒ the key is absent ·
 * replace ⇒ the row holds the whole local collection. Anything else stays for the next write.
 */
export function settleOps(store, sentBlob, { onFailure } = {}) {
  const ops = readOps(store, { onFailure });
  if (!ops.length || !sentBlob) return 0;
  const keep = ops.filter((o) => {
    const c = COLLECTIONS[o.coll];
    if (!c) return false; // an op for a collection this build does not know cannot be applied
    const sent = sentBlob[o.coll];
    const local = readLocal(store, o.coll, onFailure);
    if (c.kind === "list") {
      if (!Array.isArray(sent)) return true;
      const proj = (l) => (l || []).map(c.project);
      if (o.op === "replace") return !same(proj(sent), proj(local));
      const inSent = sent.find((x) => c.key(x) === o.key);
      if (o.op === "del") return !!inSent;
      const inLocal = (local || []).find((x) => c.key(x) === o.key);
      return !(inSent && inLocal && same(c.project(inSent), c.project(inLocal)));
    }
    if (!sent || typeof sent !== "object") return true;
    if (o.op === "replace") return !same(sent, local || {});
    if (o.op === "del") return Object.prototype.hasOwnProperty.call(sent, o.key);
    return !(local && Object.prototype.hasOwnProperty.call(local, o.key) && same(sent[o.key], local[o.key]));
  });
  if (keep.length === ops.length) return 0;
  writeOps(store, keep, onFailure);
  return ops.length - keep.length;
}
