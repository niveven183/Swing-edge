// test:settings — logic tests for src/lib/userSettings.js.
//
// Runs against an in-memory MOCK supabase client + a fake localStorage — it does
// NOT touch the real database. (The migration is intentionally NOT applied to
// prod in M1; that is M2 / manual.) Pure Node. Run: `node scripts/userSettings-test.mjs`.

import * as US from "../src/lib/userSettings.js";
const { loadSettings, saveSettings, flushSettings, migrateFromLocalStorage } = US;

let failures = 0;
const check = (name, cond) => {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    failures++;
    console.error(`  ✗ ${name}`);
  }
};

// ⚠️ Mirrors DEBOUNCE_MS in src/lib/userSettings.js:15. It is NOT exported, and the
// timer path is a DIFFERENT branch from the flush path — direction B has to gate
// both, so one assertion has to let the real timer fire.
const DEBOUNCE_MS = 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Fakes ──────────────────────────────────────────────────────────────────
function makeLocalStorage(seed = {}) {
  const m = new Map(Object.entries(seed));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

// Chainable mock: from().select().eq().maybeSingle() and from().upsert().
//
// ⚠️ `failMode` models the case the mock could NOT express before: supabase-js
// RETURNS an error, it does not throw one. An RLS denial arrives as a resolved
// promise carrying `{ data: null, error }` — so a bare try/catch never sees it.
// Without this switch the whole failure class was structurally untestable, which
// is why B-268/B-269 could ship green. (INCIDENTS#15 class.)
// ⚠️ `upsertFailMode` (B-361) models the other half: a WRITE that the server
// rejected. Direction B remembers what it sent so it can skip an unchanged blob —
// and the one way that turns into silent data loss is remembering a write that
// never landed. The mock could not express a failing upsert before.
// ⚠️ `hangMode` (B-408) models the read that never comes back — a stalled mobile link or
// a Supabase hang. Like postgrest-js it resolves `{ error }` ONLY when its abort signal
// fires, and otherwise stays pending forever. `lateRow` makes the stalled read answer
// AFTER the deadline, so a late success can be seen trying to seed the cache.
function makeMockClient(initialRows = {}, { failMode = false, upsertFailMode = false, hangMode = false, lateMs = null } = {}) {
  const rows = new Map(Object.entries(initialRows));
  const calls = { upsert: 0, select: 0, aborted: 0 };
  function from() {
    let filterId = null;
    let signal = null;
    const builder = {
      select() {
        calls.select++;
        return builder;
      },
      eq(_col, v) {
        filterId = v;
        return builder;
      },
      abortSignal(s) {
        signal = s;
        return builder;
      },
      async maybeSingle() {
        if (hangMode || lateMs != null) {
          return new Promise((resolve) => {
            signal?.addEventListener("abort", () => { calls.aborted++; if (lateMs == null) resolve({ data: null, error: { message: "AbortError" } }); });
            if (lateMs != null) setTimeout(() => resolve(rows.has(filterId) ? { data: { user_id: filterId, settings: rows.get(filterId) }, error: null } : { data: null, error: null }), lateMs);
          });
        }
        if (failMode) return { data: null, error: { message: "RLS denied" } };
        if (!rows.has(filterId)) return { data: null, error: null };
        return { data: { user_id: filterId, settings: rows.get(filterId) }, error: null };
      },
      upsert(obj) {
        calls.upsert++;
        if (upsertFailMode) return Promise.resolve({ data: null, error: { message: "RLS denied" } });
        rows.set(obj.user_id, obj.settings);
        return Promise.resolve({ data: obj, error: null });
      },
    };
    return builder;
  }
  return { client: { from }, calls, rows };
}

// ── W-CAP · B-268/B-269 — the three-state load contract ────────────────────
// { status: "ok" | "empty" | "failed", settings }
//   ok     — a row was read.
//   empty  — maybeSingle returned {data:null, error:null} ⇒ AUTHORITATIVE, no
//            row exists. A brand-new user MUST still be able to write his first
//            row, so `empty` stays writable. A two-state boolean would regress
//            exactly that user.
//   failed — non-empty error / throw / no client. Writes stay blocked.
const statusOf = (r) => (r && typeof r === "object" ? r.status : undefined);
const settingsOf = (r) => (r && typeof r === "object" && "settings" in r ? r.settings : r);

// ── Tests ────────────────────────────────────────────────────────────────
console.log("test:settings — userSettings module vs mock client (no real DB)\n");

// 1) merge does NOT overwrite existing keys (flat + nested).
{
  console.log("1) merge preserves sibling keys");
  const { client, rows } = makeMockClient();
  saveSettings("u1", { a: 1, obj: { x: 1 } }, client);
  saveSettings("u1", { b: 2, obj: { y: 2 } }, client);
  await flushSettings("u1", client);
  const s = rows.get("u1") || {};
  check("keeps a", s.a === 1);
  check("adds b", s.b === 2);
  check("nested merge keeps obj.x and adds obj.y", s.obj?.x === 1 && s.obj?.y === 2);
}

// 2) fallback works when client is null — reads localStorage mirror, never throws.
{
  console.log("2) null-client fallback to localStorage mirror");
  global.localStorage = makeLocalStorage({
    swingEdgeSettings: JSON.stringify({ lang: "he" }),
  });
  let threw = false;
  let res;
  try {
    res = await loadSettings("u2", null);
  } catch {
    threw = true;
  }
  check("did not throw", threw === false);
  // The fact asserted is unchanged — the mirror comes back and nothing throws.
  // Only the SHAPE moved, which is the point of the three-state contract.
  check("returned mirror value", settingsOf(res)?.lang === "he");

  global.localStorage = makeLocalStorage(); // empty
  const empty = await loadSettings("u2b", null);
  check("empty mirror -> {}", settingsOf(empty) && Object.keys(settingsOf(empty)).length === 0);
}

// 3) migrate runs once — second call sees the row and skips; _migrated is a
//    field INSIDE the settings jsonb, not a column.
{
  console.log("3) migrate is one-shot");
  global.localStorage = makeLocalStorage({
    swingEdgeCapital: "5000",
    swingEdgeLang: "en",
    "swingEdgeBetaWelcome:u3": "1",
  });
  const { client, calls, rows } = makeMockClient();
  const r1 = await migrateFromLocalStorage("u3", client);
  check("first run migrates", r1.migrated === true);
  const stored = rows.get("u3") || {};
  check("capital parsed to number", stored.capital === 5000);
  check("betaWelcome parsed to bool", stored.betaWelcome === true);
  check("_migrated is inside settings jsonb", stored._migrated === true);

  const r2 = await migrateFromLocalStorage("u3", client);
  check("second run skips (row exists)", r2.migrated === false && r2.reason === "exists");
  check("only one upsert total", calls.upsert === 1);
}

// 4) debounce batches rapid saves into a single upsert.
{
  console.log("4) debounce coalesces writes");
  const { client, calls, rows } = makeMockClient();
  saveSettings("u4", { a: 1 }, client);
  saveSettings("u4", { b: 2 }, client);
  saveSettings("u4", { c: 3 }, client);
  check("no upsert before flush (debounced)", calls.upsert === 0);
  await flushSettings("u4", client);
  check("exactly one upsert after flush", calls.upsert === 1);
  const s = rows.get("u4") || {};
  check("merged payload has a+b+c", s.a === 1 && s.b === 2 && s.c === 3);
}

// 5) a failed read must SAY it failed — today it is indistinguishable from "no row".
{
  console.log("5) loadSettings reports a failed read as failed");
  global.localStorage = makeLocalStorage({
    swingEdgeSettings: JSON.stringify({ capital: 1700 }),
  });
  const { client } = makeMockClient({}, { failMode: true });
  const res = await loadSettings("u5", client);
  check('failed read -> status === "failed"', statusOf(res) === "failed");
  check("mirror still available for DISPLAY", settingsOf(res)?.capital === 1700);
}

// 6) "no row" and "read failed" are different facts and must not collapse.
{
  console.log("6) empty is distinguished from failed");
  global.localStorage = makeLocalStorage();
  const { client: okClient } = makeMockClient({ u6a: { capital: 4200 } });
  const ok = await loadSettings("u6a", okClient);
  check('existing row -> status === "ok"', statusOf(ok) === "ok");

  const { client: emptyClient } = makeMockClient({});
  const empty = await loadSettings("u6b", emptyClient);
  check('no row -> status === "empty" (NOT "failed")', statusOf(empty) === "empty");

  const { client: badClient } = makeMockClient({}, { failMode: true });
  const bad = await loadSettings("u6c", badClient);
  check("empty !== failed", statusOf(empty) !== statusOf(bad));
}

// 7) a failed read must not poison the cache — :119 caches the mirror, then
//    flushSettings:145 uploads that mirror over the real row.
{
  console.log("7) failed read does not poison the cache");
  global.localStorage = makeLocalStorage({
    swingEdgeSettings: JSON.stringify({ capital: 2500 }),
  });
  const { client, calls } = makeMockClient({}, { failMode: true });
  await loadSettings("u7", client);
  await flushSettings("u7", client);
  check("no upsert after a failed read", calls.upsert === 0);
}

// 8) migrate must stop on a failed existence check — today {error} falls through
//    (`!error && data` = false) and upsertBlob overwrites the existing row.
{
  console.log("8) migrate stops when the existence check fails");
  global.localStorage = makeLocalStorage({
    swingEdgeCapital: "2500",
    swingEdgeLang: "he",
    swingEdgeTourDone: "1",
  });
  const { client, calls } = makeMockClient({ u8: { capital: 1700 } }, { failMode: true });
  const r = await migrateFromLocalStorage("u8", client);
  check('failed check -> reason === "check-failed"', r.reason === "check-failed");
  check("did not migrate", r.migrated === false);
  check("⛔ zero upserts with a FULL localStorage", calls.upsert === 0);
}

// 9) the healthy path is unchanged — this one must stay GREEN before and after.
//    A red here means the MOCK is wrong, not the module.
{
  console.log("9) healthy path unchanged");
  global.localStorage = makeLocalStorage();
  const { client, calls } = makeMockClient({ u9: { capital: 49000, lang: "he" } });
  const res = await loadSettings("u9", client);
  check("healthy read returns the row's values", settingsOf(res)?.capital === 49000);
  check("healthy read keeps sibling keys", settingsOf(res)?.lang === "he");
  check("a read never upserts", calls.upsert === 0);
  let threw = false;
  try {
    await loadSettings("u9b", null);
  } catch {
    threw = true;
  }
  check("contract intact: load never throws", threw === false);
}

// 10) B-361 · direction B — an unchanged blob must NOT be written.
//
// 🔴 Measured 22.09: every authenticated page load sent exactly one
// POST /rest/v1/user_settings with ⛔ no user action (5/5 contexts). The persist
// effect fires on hydration (setUserProfile always builds a fresh object literal,
// SwingEdge_App.jsx:1801) and saveSettings had ⛔ no way to know the row already
// held that exact content.
//
// ⚠️ (1) and (3) are the PROOF — both observed RED on the pre-fix tree (1 upsert
// each). (2*) are a CONTROL ARM: green in BOTH trees, they measure the WIDTH of
// the skip. Reading them as evidence of the fix is exactly the blindness of
// assertion 12 in test:analytics. A red in (2*) means the skip swallowed a real
// change ⇒ STOP, ⛔ soften the assertion.
{
  console.log("10) unchanged blob is not written (B-361, direction B)");
  global.localStorage = makeLocalStorage();
  const { client, calls, rows } = makeMockClient({
    u10: { capital: 49000, lang: "he", welcomeSeen: true },
  });
  await loadSettings("u10", client);
  check("⚪ control — a read still never upserts", calls.upsert === 0);

  // (3) flush with nothing changed ⇒ 0 upsert.               [RED before: 1]
  await flushSettings("u10", client);
  check("(3) flush with no change ⇒ 0 upsert", calls.upsert === 0);

  // (1) the persist effect's own patch: identical values, FEWER keys (the patch
  //     never carries welcomeSeen). mergeSettings keeps the sibling ⇒ the content
  //     is identical ⇒ the real 1000ms timer must skip.      [RED before: 1]
  saveSettings("u10", { capital: 49000, lang: "he" }, client);
  await sleep(DEBOUNCE_MS + 150);
  check("(1) debounced save with no change ⇒ 0 upsert", calls.upsert === 0);

  // (2) CONTROL — a real change still writes, exactly once.
  saveSettings("u10", { capital: 51000 }, client);
  await flushSettings("u10", client);
  check("(2) ⚪ control — one real change ⇒ 1 upsert", calls.upsert === 1);
  check("(2b) ⚪ control — the new value landed", rows.get("u10")?.capital === 51000);
  check("(2c) ⚪ control — sibling keys survived the write", rows.get("u10")?.welcomeSeen === true);

  // (2d) CONTROL — the hash advanced on success, so the NEXT change is not skipped.
  saveSettings("u10", { capital: 52000 }, client);
  await flushSettings("u10", client);
  check("(2d) ⚪ control — a second change ⇒ 2 upserts", calls.upsert === 2);

  // (2e) ...and re-flushing that same blob is a no-op again.
  await flushSettings("u10", client);
  check("(2e) unchanged again ⇒ still 2 upserts", calls.upsert === 2);
}

// 11) a write that FAILED is ⛔ "sent" — it must be retried, never remembered.
//     ⚪ Control arm: green in both trees. It guards the single way direction B
//     could become silent data loss — recording the hash before knowing the row
//     took it. ⛔ An unnecessary write is safe; a skipped change is not.
{
  console.log("11) a failed upsert is not remembered as sent");
  global.localStorage = makeLocalStorage();
  const { client, calls } = makeMockClient({ u11: { capital: 100 } }, { upsertFailMode: true });
  await loadSettings("u11", client);
  saveSettings("u11", { capital: 200 }, client);
  await flushSettings("u11", client);
  check("the first (failing) write was attempted", calls.upsert === 1);
  saveSettings("u11", { capital: 200 }, client);
  await flushSettings("u11", client);
  check("⚪ control — identical retry after a FAILED write ⇒ 2 upserts", calls.upsert === 2);
}

// 12) B-408 — a read that never comes back must END, as a failure, within the deadline.
//     Without a deadline `hydrationFailed` never fires: the capital gate stays "loading"
//     forever (Log Trade locked), and the Settings edit gate would lock the five scalars
//     for the whole session — worse than the bug it closes.
{
  console.log("12) a stalled settings read ends as failed within SETTINGS_READ_TIMEOUT_MS");
  check("SETTINGS_READ_TIMEOUT_MS is exported and is 8000 (aligned with FX_SETTLE_MS, B-376)", US.SETTINGS_READ_TIMEOUT_MS === 8000);

  global.localStorage = makeLocalStorage();
  const hang = makeMockClient({ u12: { capital: 9000 } }, { hangMode: true });
  const t0 = Date.now();
  const r = await Promise.race([
    loadSettings("u12", hang.client, { timeoutMs: 60 }),
    sleep(2000).then(() => ({ status: "STILL-PENDING" })),
  ]);
  const took = Date.now() - t0;
  check(`stalled load ⇒ status "failed" (got ${r.status})`, r.status === "failed");
  check(`stalled load ends near the deadline (${took}ms, deadline 60ms, ≤ 500ms)`, took >= 50 && took <= 500);
  check("the stalled request was aborted", hang.calls.aborted === 1);
  await flushSettings("u12", hang.client); // as block 7: the module's own write gate
  check("⛔ upsert after a timed-out read (the user is not writable)", hang.calls.upsert === 0);

  const hang2 = makeMockClient({ u12b: { capital: 9000 } }, { hangMode: true });
  const m = await Promise.race([
    migrateFromLocalStorage("u12b", hang2.client, { timeoutMs: 60 }),
    sleep(2000).then(() => ({ reason: "STILL-PENDING" })),
  ]);
  check(`stalled existence check ⇒ reason "check-failed" (got ${m.reason})`, m.reason === "check-failed");
  check("⛔ upsert after a timed-out existence check", hang2.calls.upsert === 0);

  // A read that answers AFTER the deadline is DISCARDED: it must not seed the cache or the
  // sent-hash — the caller already settled the session as failed (writes blocked).
  global.localStorage = makeLocalStorage();
  const late = makeMockClient({ u12c: { capital: 7777 } }, { lateMs: 150 });
  const r2 = await loadSettings("u12c", late.client, { timeoutMs: 60 });
  check(`late read ⇒ status "failed" (got ${r2.status})`, r2.status === "failed");
  await sleep(300); // the late answer has now arrived
  await flushSettings("u12c", late.client);
  check("⛔ upsert after a late answer (it did not re-open writes)", late.calls.upsert === 0);
  check("the late answer did ⛔ seed the mirror (swingEdgeSettings)", !String(global.localStorage.getItem("swingEdgeSettings") || "").includes("7777"));

  // ⚪ control: a normal read is untouched by the deadline.
  global.localStorage = makeLocalStorage();
  const ok = makeMockClient({ u12d: { capital: 5000 } });
  const r3 = await loadSettings("u12d", ok.client, { timeoutMs: 60 });
  check("⚪ control — a prompt read is ok and carries the row", r3.status === "ok" && r3.settings.capital === 5000);
}

// 13) B-432 + B-435 (16.10) — local-first: a pending edit survives a write that never landed.
// Plan: docs/plans/PLAN-2026-10-16-b432-b435-local-first.md. Every assertion here is RED on the tree before
// the fix (the module does not exist, loadSettings carries no token, no keepalive path) — each one by name.
{
  console.log("13) local-first: pending + inflight + keepalive (B-432 · B-435)");
  let P = null;
  try { P = await import("../src/lib/settingsPending.js"); } catch (e) { console.error(`  (settingsPending.js not importable: ${String(e.message).split("\n")[0]})`); }
  const has = (fn) => P && typeof P[fn] === "function";
  // A mock with a VERSION TOKEN: the row keeps the updated_at the client sent (no server trigger — DECISIONS 16.10).
  function tokenClient(seed = {}, { upsertFail = false, upsertThrow = false, hold = false } = {}) {
    const rows = new Map(Object.entries(seed));
    const calls = { upsert: 0, sent: [] };
    let release = null;
    function from() {
      let id = null;
      const b = {
        select() { return b; }, eq(_c, v) { id = v; return b; }, abortSignal() { return b; },
        async maybeSingle() { return rows.has(id) ? { data: { user_id: id, ...rows.get(id) }, error: null } : { data: null, error: null }; },
        upsert(obj) {
          calls.upsert++; calls.sent.push(obj);
          if (upsertThrow) return Promise.reject(new TypeError("Load failed"));
          if (upsertFail) return Promise.resolve({ data: null, error: { message: "TypeError: Load failed" } });
          const land = () => { rows.set(obj.user_id, { settings: obj.settings, updated_at: obj.updated_at }); return { data: obj, error: null }; };
          return hold ? new Promise((r) => { release = () => r(land()); }) : Promise.resolve(land());
        },
      };
      return b;
    }
    return { client: { from }, calls, rows, release: () => release?.() };
  }
  const T0 = "2026-10-16T08:00:00.000Z";

  // a — the edit is on disk the moment the handler returns (⛔ an effect).
  global.localStorage = makeLocalStorage();
  const okA = has("recordScalarEdit") && P.recordScalarEdit(global.localStorage, "capital", 12345, { base: T0 });
  const pa = has("readPending") ? P.readPending(global.localStorage) : null;
  check("13a recordScalarEdit writes pending synchronously — value parsed, base kept", okA === true && pa?.values?.capital === 12345 && pa?.base === T0);

  // b — the decision at load (Niv 16.10): inflight landed · base ⇒ apply · else ⇒ conflict.
  // `inflight` is a LIST of this device's outgoing tokens: a debounced write (A) can be in flight when the unload
  // keepalive (B) goes out — A lands, B is cancelled; one remembered token would turn A into a FALSE conflict.
  const pend = { v: 1, base: T0, inflight: ["2026-10-16T08:00:05.000Z"], values: { capital: 12345 } };
  const dec = (tok, row = { capital: 9000 }) => (has("decidePending") ? P.decidePending(pend, row, tok) : null);
  // ⚠️ A write that LANDED left its value in the row — the fixture must say so (row = 12345 with our token).
  check("13b row token = inflight AND the row holds our value ⇒ «landed» (⛔ a banner)", dec("2026-10-16T08:00:05.000Z", { capital: 12345 })?.action === "landed");
  check("13b row token = base ⇒ «apply» (it never landed — the pending wins)", dec(T0)?.action === "apply" && dec(T0)?.apply?.capital === 12345);
  const c = dec("2026-10-16T09:00:00.000Z");
  check("13b any other token ⇒ «conflict»: the row wins, the rejected local value is carried", c?.action === "conflict" && c?.rejected?.capital === 12345);
  check("13b no pending ⇒ «none»", has("decidePending") && P.decidePending(null, { capital: 1 }, T0)?.action === "none");
  // A landed (row = A, carrying capital 12345), B (newer: riskPct 3) was cancelled ⇒ ⛔ a conflict: drop what A carried, apply the rest.
  const ab = has("decidePending") ? P.decidePending({ v: 1, base: T0, inflight: ["A-tok", "B-tok"], values: { capital: 12345, riskPct: 3 } }, { capital: 12345, riskPct: 1 }, "A-tok") : null;
  check("13b row = an EARLIER inflight token ⇒ «apply» only what it did not carry (⛔ a false conflict)", ab?.action === "apply" && ab?.apply?.riskPct === 3 && !("capital" in (ab?.apply || {})));

  // c — the read carries the row's token.
  global.localStorage = makeLocalStorage();
  const rc = tokenClient({ u13c: { settings: { capital: 9000 }, updated_at: T0 } });
  const r13c = await loadSettings("u13c", rc.client);
  check("13c loadSettings returns the row's updated_at as `updatedAt`", r13c.updatedAt === T0);

  // d — inflight is on disk BEFORE the request resolves, and equals the updated_at that was sent.
  global.localStorage = makeLocalStorage();
  const rd = tokenClient({ u13d: { settings: { capital: 9000 }, updated_at: T0 } }, { hold: true });
  await loadSettings("u13d", rd.client);
  if (has("recordScalarEdit")) P.recordScalarEdit(global.localStorage, "capital", 11111, { base: T0 });
  saveSettings("u13d", { capital: 11111 }, rd.client);
  const fd = flushSettings("u13d", rd.client);
  await sleep(20);
  const inflightNow = has("readPending") ? P.readPending(global.localStorage)?.inflight : undefined;
  check("13d inflight is written BEFORE the upsert resolves — the token the request carries", rd.calls.sent.length === 1 && Array.isArray(inflightNow) && inflightNow.includes(rd.calls.sent[0]?.updated_at));
  rd.release(); await fd;

  // e — the pending is cleared ONLY by a 2xx that carried it (Niv 16.10). {error} · throw ⇒ it stays.
  const settleOn = () => (has("settlePending") ? US.onSettingsSynced((uid, blob) => P.settlePending(global.localStorage, blob)) : () => {});
  for (const [label, opts, keep] of [["{ error } (TypeError: Load failed)", { upsertFail: true }, true], ["a thrown network error", { upsertThrow: true }, true], ["a 2xx that carried it", {}, false]]) {
    global.localStorage = makeLocalStorage();
    const off = settleOn();
    const re = tokenClient({ [`u13e${label.length}`]: { settings: { capital: 9000 }, updated_at: T0 } }, opts);
    const uid = `u13e${label.length}`;
    await loadSettings(uid, re.client);
    if (has("recordScalarEdit")) P.recordScalarEdit(global.localStorage, "capital", 22222, { base: T0 });
    saveSettings(uid, { capital: 22222 }, re.client);
    await flushSettings(uid, re.client);
    off();
    const left = has("readPending") ? P.readPending(global.localStorage)?.values?.capital : undefined;
    check(`13e after ${label}: pending ${keep ? "STAYS" : "is cleared"}`, has("readPending") && (keep ? left === 22222 : left === undefined));
  }

  // f — layer 2: keepalive with the full blob, headers, and the inflight token.
  global.localStorage = makeLocalStorage();
  const rf = tokenClient({ u13f: { settings: { capital: 9000 }, updated_at: T0 } });
  await loadSettings("u13f", rf.client);
  if (has("recordScalarEdit")) P.recordScalarEdit(global.localStorage, "capital", 33333, { base: T0 });
  saveSettings("u13f", { capital: 33333 }, rf.client);
  const fetched = [];
  const fake = (url, init) => { fetched.push({ url, init }); return Promise.resolve({ ok: true, status: 201 }); };
  const kf = typeof US.flushKeepalive === "function" ? US.flushKeepalive("u13f", { accessToken: "tok-13f", url: "https://x.supabase.co", anonKey: "anon-13f", fetchImpl: fake }) : null;
  const sentF = fetched[0];
  const bodyF = sentF ? JSON.parse(sentF.init.body) : null;
  check("13f flushKeepalive: one POST with keepalive:true to /rest/v1/user_settings?on_conflict=user_id", kf?.sent === true && fetched.length === 1 && sentF.init.keepalive === true && sentF.init.method === "POST" && sentF.url === "https://x.supabase.co/rest/v1/user_settings?on_conflict=user_id");
  check("13f headers: apikey · Bearer token · merge-duplicates", sentF?.init.headers?.apikey === "anon-13f" && sentF?.init.headers?.Authorization === "Bearer tok-13f" && /resolution=merge-duplicates/.test(sentF?.init.headers?.Prefer || ""));
  check("13f body = the full cached blob + updated_at = an inflight token on disk", Array.isArray(bodyF) && bodyF[0]?.settings?.capital === 33333 && !!bodyF[0]?.updated_at && (has("readPending") ? (P.readPending(global.localStorage)?.inflight || []).includes(bodyF[0].updated_at) : false));

  // g — the 60KB guard: ⛔ keepalive, the reason said, the pending kept.
  global.localStorage = makeLocalStorage();
  const rg = tokenClient({ u13g: { settings: { capital: 9000 }, updated_at: T0 } });
  await loadSettings("u13g", rg.client);
  if (has("recordScalarEdit")) P.recordScalarEdit(global.localStorage, "capital", 44444, { base: T0 });
  saveSettings("u13g", { capital: 44444, playbook: [{ id: 1, name: "big", imagePreview: "x".repeat(70 * 1024) }] }, rg.client);
  const fetchedG = [];
  const warns = []; const ow = console.warn; console.warn = (...a) => warns.push(a.join(" "));
  const kg = typeof US.flushKeepalive === "function" ? US.flushKeepalive("u13g", { accessToken: "t", url: "https://x.supabase.co", anonKey: "k", fetchImpl: (u, i) => { fetchedG.push(i); return Promise.resolve({ ok: true }); } }) : null;
  console.warn = ow;
  check("13g body > 60KB ⇒ ⛔ keepalive · reason «too-large» · said in the console · pending kept", kg?.sent === false && kg?.reason === "too-large" && fetchedG.length === 0 && warns.some((w) => /keepalive/.test(w) && /60/.test(w)) && (has("readPending") ? P.readPending(global.localStorage)?.values?.capital === 44444 : false));

  // h — keepalive that landed + the next load ⇒ 0 banners (Niv 16.10, fix ①).
  global.localStorage = makeLocalStorage();
  const rh = tokenClient({ u13h: { settings: { capital: 9000 }, updated_at: T0 } });
  await loadSettings("u13h", rh.client);
  if (has("recordScalarEdit")) P.recordScalarEdit(global.localStorage, "capital", 55555, { base: T0 });
  saveSettings("u13h", { capital: 55555 }, rh.client);
  const delivered = [];
  if (typeof US.flushKeepalive === "function") US.flushKeepalive("u13h", { accessToken: "t", url: "https://x.supabase.co", anonKey: "k", fetchImpl: (u, i) => { const b = JSON.parse(i.body)[0]; rh.rows.set("u13h", { settings: b.settings, updated_at: b.updated_at }); delivered.push(b); return Promise.resolve({ ok: true }); } });
  const next = await loadSettings("u13h", rh.client); // a fresh page: the keepalive arrived, its answer was never seen
  const dh = has("decidePending") ? P.decidePending(P.readPending(global.localStorage), next.settings, next.updatedAt) : null;
  check("13h keepalive landed + load ⇒ «landed» — 0 banners", delivered.length === 1 && dh?.action === "landed");
}

console.log("");
if (failures > 0) {
  console.error(`❌ test:settings — ${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("✅ test:settings — all assertions passed");
