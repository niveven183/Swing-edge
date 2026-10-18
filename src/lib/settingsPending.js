// src/lib/settingsPending.js — the device's own SCALAR edits, kept until a write that carried them is
// confirmed (B-432 · B-435, 16.10). Plan: docs/plans/PLAN-2026-10-16-b432-b435-local-first.md
//
// WHY. An edit made inside the 1000ms debounce and followed by a reload/close left the page only through
// the unload flush — a plain fetch the page itself cancels (measured: iphone14 CI 49/50, pixel7 27/50).
// The next load read the row, «the DB wins» for scalars, and the edit was gone without a word.
//
// THE RULE (Niv 16.10). Local-first: the pending edit is on disk the moment the handler returns, and it is
// removed ONLY after a 2xx of an upsert that carried it — «Load failed» / cancel / timeout ⇒ it stays and
// is sent again at the next load. Same rule as the delta journal (settingsDelta.js), one principle.
//
// VERSION TOKENS. `updated_at` is a token the CLIENT creates for each write (⛔ a server trigger on it —
// DECISIONS 16.10). The pending carries:
//   base     — the token of the row this device last read or wrote (what the edit was made on);
//   inflight — the tokens of the writes that went out (each set BEFORE its fetch, plain or keepalive). A LIST:
//              a debounced write (A) can be in flight when the unload keepalive (B) goes out; A lands, B is
//              cancelled — one remembered token would make A's own row a false conflict. Bounded (INFLIGHT_MAX).
// At the next load the row's token decides (decidePending):
//   row ∈ inflight ⇒ our write arrived ⇒ drop what it carried, apply what it did not, ⛔ a banner ·
//   row = base     ⇒ it never arrived ⇒ the pending wins and is sent ·
//   anything else  ⇒ another device wrote meanwhile ⇒ a real conflict: the row wins, the rejected local
//                    value is shown with «apply my edit» (Niv 16.10) — ⛔ a silent winner either way.
//
// Values are stored PARSED (12345, ⛔ "12345") — D-124's «"12000" ≠ 12000 ⇒ an op forever».

export const PENDING_KEY = "swingEdgeSettingsPending";
export const SCALARS = Object.freeze(["capital", "riskPct", "lang", "accountCurrency", "capitalCurrency"]);
export const INFLIGHT_MAX = 8;

function fail(onFailure, reason, error) {
  // ⛔ a silent path: no callback is itself a failure to report.
  if (typeof onFailure === "function") onFailure(reason, error);
  else console.error(`[settingsPending] ${reason} — and no onFailure was given`, error);
}

/** The pending record as stored, or null. A corrupt record is REPORTED and read as null. */
export function readPending(store, { onFailure } = {}) {
  let raw;
  try { raw = store.getItem(PENDING_KEY); } catch (e) { fail(onFailure, "read", e); return null; }
  if (!raw) return null;
  try {
    const p = JSON.parse(raw);
    if (!p || typeof p !== "object" || !p.values || typeof p.values !== "object") throw new Error("pending is malformed");
    return p;
  } catch (e) {
    fail(onFailure, "corrupt", e);
    return null;
  }
}

function writePending(store, p, onFailure) {
  try {
    if (p && Object.keys(p.values).length) store.setItem(PENDING_KEY, JSON.stringify(p));
    else store.removeItem(PENDING_KEY);
    return true;
  } catch (e) {
    fail(onFailure, "write", e);
    return false;
  }
}

/**
 * Record one scalar edit, synchronously, in the handler (⛔ an effect — the effect may never run before
 * an unload). `base` = the token of the row the edit was made on; an existing pending keeps ITS base
 * (the chain of unconfirmed edits started there). Returns false when it could not be stored (reported).
 */
export function recordScalarEdit(store, field, value, { base = null, onFailure } = {}) {
  if (!SCALARS.includes(field)) throw new Error(`[settingsPending] unknown scalar "${field}"`);
  const cur = readPending(store, { onFailure });
  const next = cur
    ? { ...cur, values: { ...cur.values, [field]: value } }
    : { v: 1, base, inflight: [], values: { [field]: value } };
  return writePending(store, next, onFailure);
}

/** A write is about to go out carrying token `token` — set BEFORE the fetch (plain or keepalive). */
export function markInflight(store, token, { onFailure } = {}) {
  const cur = readPending(store, { onFailure });
  if (!cur) return true; // nothing pending ⇒ nothing to remember
  const inflight = [...(Array.isArray(cur.inflight) ? cur.inflight : []), token].slice(-INFLIGHT_MAX);
  return writePending(store, { ...cur, inflight }, onFailure);
}

/**
 * A write CARRYING `sentBlob` is confirmed (2xx — or a skip proven identical to a row read/written in this
 * session, Niv 16.10): drop every field whose value it carries. `token` = that write's (or read's) token —
 * it becomes the base of whatever is still pending. Returns how many fields were cleared.
 */
export function settlePending(store, sentBlob, { token = null, onFailure } = {}) {
  const cur = readPending(store, { onFailure });
  if (!cur || !sentBlob) return 0;
  const values = {};
  let cleared = 0;
  for (const [k, v] of Object.entries(cur.values)) {
    if (Object.prototype.hasOwnProperty.call(sentBlob, k) && JSON.stringify(sentBlob[k]) === JSON.stringify(v)) cleared++;
    else values[k] = v;
  }
  if (!cleared) return 0;
  writePending(store, { ...cur, base: token ?? cur.base, inflight: [], values }, onFailure);
  return cleared;
}

/** The user dismissed a conflict (or it resolved): forget the pending. */
export function clearPending(store, { onFailure } = {}) {
  return writePending(store, null, onFailure);
}

// ── B-435 · CAS (17.10) — tokens compared as INSTANTS, ⛔ strings ──────────────────────────────────────
// Measured (M-027, [B-435 diag]): the client sends `…T07:02:33.965Z`, PostgREST returns the same instant as
// `…T07:02:33.965+00:00`. A string compare therefore NEVER matched in production — the «landed» branch could
// not fire, and a second unconfirmed edit read as a false conflict. Rows written by the column default carry
// microseconds (`now()`), so the instant is kept in µs. Plan: docs/plans/PLAN-2026-10-17-b435-cas.md.
const ISO = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?(Z|[+-]\d{2}:?\d{2})$/;
/** µs since the epoch, or null for a string that is not an ISO instant (reported — ⛔ a guessed «equal»). */
export function tokenMicros(t) {
  if (t == null) return null;
  const m = ISO.exec(String(t));
  const sec = m ? Date.parse(`${m[1]}${m[3] === "Z" ? "Z" : m[3].replace(/^([+-]\d{2})(\d{2})$/, "$1:$2")}`) : NaN;
  if (!m || Number.isNaN(sec)) {
    console.error(`[settingsPending] not an ISO instant: ${JSON.stringify(String(t)).slice(0, 60)}`);
    return null;
  }
  return sec * 1000 + Number((m[2] || "").padEnd(6, "0"));
}
/** Same INSTANT. Either side unreadable ⇒ false (said by tokenMicros). */
export function sameToken(a, b) {
  const x = tokenMicros(a), y = tokenMicros(b);
  return x != null && y != null && x === y;
}
/**
 * The token of the NEXT write (Niv 18.10, fix ②): max(now, base + 1ms), as an instant. A client clock behind the
 * row's base would otherwise send a token OLDER than the row it overwrites — the detector's «the token went
 * backwards» would then fire on an honest write.
 */
export function nextToken(base, nowMs = Date.now()) {
  const b = tokenMicros(base);
  const floor = b == null ? -Infinity : Math.floor(b / 1000) + 1;
  return new Date(Math.max(nowMs, floor)).toISOString();
}

/**
 * At load, after the row was READ (status "ok"). Pure.
 *   none     — nothing pending.
 *   landed   — row token ∈ inflight and the row holds every pending value: our write arrived ⇒ clear, ⛔ a banner.
 *   apply    — row token = base (it never arrived), OR row token ∈ inflight but some values are newer than
 *              what that write carried ⇒ `apply` (only those) wins over the row and is sent.
 *   conflict — any other token: the row wins; `rejected` = the local values that differ from it.
 * A pending without a base (made before any row was read — a brand-new user) applies.
 */
export function decidePending(pending, rowSettings, rowToken, { baseSettings = null } = {}) {
  if (!pending || !pending.values || !Object.keys(pending.values).length) return { action: "none" };
  const row = rowSettings || {};
  const differs = (k, v) => JSON.stringify(row[k]) !== JSON.stringify(v);
  const ours = Array.isArray(pending.inflight) && rowToken != null && pending.inflight.some((t) => sameToken(t, rowToken));
  if (ours) {
    // No other device wrote: what our landed write carried equals the row; the rest is newer than it.
    const apply = Object.fromEntries(Object.entries(pending.values).filter(([k, v]) => differs(k, v)));
    return Object.keys(apply).length ? { action: "apply", apply } : { action: "landed" };
  }
  if (pending.base == null || sameToken(rowToken, pending.base)) return { action: "apply", apply: { ...pending.values } };
  // B-435 · CAS rebase (18.10, fix ③): when THIS session holds the blob the pending was made on (`baseSettings`),
  // the decision is per FIELD (3-way): a field the other writer did not touch (row = base) ⇒ ours applies; a field
  // it changed too ⇒ a real conflict. Without it every rebase would show a banner for the fields nobody else edited.
  const apply = {};
  const rejected = {};
  for (const [k, v] of Object.entries(pending.values)) {
    if (!differs(k, v)) continue;
    if (baseSettings && JSON.stringify(row[k]) === JSON.stringify(baseSettings[k])) apply[k] = v;
    else rejected[k] = v;
  }
  if (Object.keys(rejected).length) return { action: "conflict", rejected, ...(Object.keys(apply).length ? { apply } : {}) };
  if (Object.keys(apply).length) return { action: "apply", apply };
  return { action: "landed" }; // another write already holds exactly these values
}
