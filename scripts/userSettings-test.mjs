// test:settings — logic tests for src/lib/userSettings.js.
//
// Runs against an in-memory MOCK supabase client + a fake localStorage — it does
// NOT touch the real database. (The migration is intentionally NOT applied to
// prod in M1; that is M2 / manual.) Pure Node. Run: `node scripts/userSettings-test.mjs`.

// `US_LIB` (red-before only): a directory holding ANOTHER tree's src/lib — e.g. main's — so block 14 can be seen
// red on the code before the fix without touching this checkout. Default: this tree.
const LIB = process.env.US_LIB ? new URL(`file://${process.env.US_LIB}/`) : new URL("../src/lib/", import.meta.url);
const US = await import(new URL("userSettings.js", LIB).href);
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
// B-435 · CAS (17.10): the write path is now a CONDITIONAL update (`.update().eq(user_id).eq(updated_at, base)
// .select("updated_at")`) or an INSERT (no base). This mock models PostgREST exactly as the module meets it:
// every row carries a token (a real row's updated_at is NOT NULL), returned in PG's text form (…+00:00); an
// update whose token filter does not match returns `[]` (⛔ an error); an insert over an existing row returns
// 23505. `calls.upsert` keeps counting WRITES (update + insert + legacy upsert) — the existing assertions ask
// «how many writes», and that question did not change.
const SEED_TOK = "2026-01-01T00:00:00.123456+00:00";
const pgText = (t) => {
  const m = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?(Z|[+-]\d{2}:?\d{2})$/.exec(String(t ?? ""));
  if (!m) return t;
  const us = Date.parse(`${m[1]}${m[3] === "Z" ? "Z" : m[3]}`) * 1000 + Number((m[2] || "").padEnd(6, "0"));
  const frac = String(us % 1e6).padStart(6, "0").replace(/0+$/, "");
  return `${new Date(Math.floor(us / 1000)).toISOString().slice(0, 19)}${frac ? `.${frac}` : ""}+00:00`;
};
const usOf = (t) => {
  const m = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?(Z|[+-]\d{2}:?\d{2})$/.exec(String(t ?? ""));
  return m ? Date.parse(`${m[1]}${m[3] === "Z" ? "Z" : m[3]}`) * 1000 + Number((m[2] || "").padEnd(6, "0")) : null;
};
function makeMockClient(initialRows = {}, { failMode = false, upsertFailMode = false, hangMode = false, lateMs = null } = {}) {
  const rows = new Map(Object.entries(initialRows));
  const tokens = new Map([...rows.keys()].map((k) => [k, SEED_TOK]));
  const calls = { upsert: 0, select: 0, aborted: 0, writes: [] };
  function from() {
    const f = {};
    let signal = null;
    let op = null;
    let payload = null;
    const exec = () => {
      if (upsertFailMode) return Promise.resolve({ data: null, error: { message: "RLS denied" } });
      if (op === "insert") {
        if (rows.has(payload.user_id)) return Promise.resolve({ data: null, error: { code: "23505", message: "duplicate key value violates unique constraint" } });
        rows.set(payload.user_id, payload.settings); tokens.set(payload.user_id, payload.updated_at);
        return Promise.resolve({ data: [{ updated_at: pgText(payload.updated_at) }], error: null });
      }
      const id = f.user_id;
      if (!rows.has(id)) return Promise.resolve({ data: [], error: null });
      if ("updated_at" in f && usOf(f.updated_at) !== usOf(tokens.get(id))) return Promise.resolve({ data: [], error: null });
      rows.set(id, payload.settings); tokens.set(id, payload.updated_at);
      return Promise.resolve({ data: [{ updated_at: pgText(payload.updated_at) }], error: null });
    };
    const builder = {
      select() {
        if (!op) calls.select++;
        return builder;
      },
      eq(col, v) {
        f[col] = v;
        return builder;
      },
      abortSignal(s) {
        signal = s;
        return builder;
      },
      async maybeSingle() {
        const filterId = f.user_id;
        const answer = () => (rows.has(filterId) ? { data: { user_id: filterId, settings: rows.get(filterId), updated_at: pgText(tokens.get(filterId)) }, error: null } : { data: null, error: null });
        if (hangMode || lateMs != null) {
          return new Promise((resolve) => {
            signal?.addEventListener("abort", () => { calls.aborted++; if (lateMs == null) resolve({ data: null, error: { message: "AbortError" } }); });
            if (lateMs != null) setTimeout(() => resolve(answer()), lateMs);
          });
        }
        if (failMode) return { data: null, error: { message: "RLS denied" } };
        return answer();
      },
      update(obj) { op = "update"; payload = obj; calls.upsert++; calls.writes.push({ op, obj, filter: f }); return builder; },
      insert(obj) { op = "insert"; payload = obj; calls.upsert++; calls.writes.push({ op, obj }); return builder; },
      then(res, rej) { return (op ? exec() : Promise.resolve({ data: [], error: null })).then(res, rej); },
    };
    return builder;
  }
  return { client: { from }, calls, rows, tokens };
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
  try { P = await import(new URL("settingsPending.js", LIB).href); } catch (e) { console.error(`  (settingsPending.js not importable: ${String(e.message).split("\n")[0]})`); }
  const has = (fn) => P && typeof P[fn] === "function";
  // A mock with a VERSION TOKEN (B-435 · CAS 17.10): the row keeps the updated_at the client sent and returns it in
  // PG's text form; the write is the module's conditional update / insert. `hold` keeps the write pending until
  // `release()` — or forever, which is how 14i models the write that never answers (its abortSignal ends it).
  function tokenClient(seed = {}, { upsertFail = false, upsertThrow = false, hold = false } = {}) {
    const rows = new Map(Object.entries(seed));
    const calls = { upsert: 0, sent: [], filters: [], aborted: 0 };
    let release = null;
    function from() {
      const f = {};
      let op = null, payload = null, signal = null;
      const exec = () => {
        calls.upsert++; calls.sent.push(payload); calls.filters.push({ ...f, op });
        if (upsertThrow) return Promise.reject(new TypeError("Load failed"));
        if (upsertFail) return Promise.resolve({ data: null, error: { message: "TypeError: Load failed" } });
        const land = () => {
          if (op === "insert") {
            if (rows.has(payload.user_id)) return { data: null, error: { code: "23505", message: "duplicate key value violates unique constraint" } };
            rows.set(payload.user_id, { settings: payload.settings, updated_at: payload.updated_at });
            return { data: [{ updated_at: pgText(payload.updated_at) }], error: null };
          }
          const cur = rows.get(f.user_id);
          if (!cur || ("updated_at" in f && usOf(f.updated_at) !== usOf(cur.updated_at))) return { data: [], error: null };
          rows.set(f.user_id, { settings: payload.settings, updated_at: payload.updated_at });
          return { data: [{ updated_at: pgText(payload.updated_at) }], error: null };
        };
        if (!hold) return Promise.resolve(land());
        return new Promise((r) => {
          release = () => r(land());
          signal?.addEventListener("abort", () => { calls.aborted++; r({ data: null, error: { message: "AbortError" } }); });
        });
      };
      const b = {
        select() { return b; }, eq(c, v) { f[c] = v; return b; }, abortSignal(sg) { signal = sg; return b; },
        async maybeSingle() { const r = rows.get(f.user_id); return r ? { data: { user_id: f.user_id, settings: r.settings, updated_at: pgText(r.updated_at) }, error: null } : { data: null, error: null }; },
        update(obj) { op = "update"; payload = obj; return b; },
        insert(obj) { op = "insert"; payload = obj; return b; },
        then(res, rej) { return (op ? exec() : Promise.resolve({ data: [], error: null })).then(res, rej); },
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
  // B-435 · CAS (17.10): tokens are compared as INSTANTS (sameToken) — the fixture's tokens are ISO instants, and the
  // row returns A's in PG form (…+00:00) as production does. (Before: opaque "A-tok"/"B-tok", string-compared.)
  const ab = has("decidePending") ? P.decidePending({ v: 1, base: T0, inflight: ["2026-10-16T08:00:05.000Z", "2026-10-16T08:00:06.000Z"], values: { capital: 12345, riskPct: 3 } }, { capital: 12345, riskPct: 1 }, "2026-10-16T08:00:05+00:00") : null;
  check("13b row = an EARLIER inflight token ⇒ «apply» only what it did not carry (⛔ a false conflict)", ab?.action === "apply" && ab?.apply?.riskPct === 3 && !("capital" in (ab?.apply || {})));

  // c — the read carries the row's token.
  global.localStorage = makeLocalStorage();
  const rc = tokenClient({ u13c: { settings: { capital: 9000 }, updated_at: T0 } });
  const r13c = await loadSettings("u13c", rc.client);
  // B-435 · CAS (17.10): the DB's own string, byte-identical (PG form …+00:00) — ⛔ re-formatted by the client.
  check("13c loadSettings returns the row's updated_at as `updatedAt` — the DB's string, byte-identical", r13c.updatedAt === pgText(T0) && r13c.updatedAt !== T0);

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
  const fake = (url, init) => { fetched.push({ url, init }); return Promise.resolve({ ok: true, status: 200, json: async () => [{ updated_at: "2026-10-16T08:00:09+00:00" }] }); };
  const kf = typeof US.flushKeepalive === "function" ? US.flushKeepalive("u13f", { accessToken: "tok-13f", url: "https://x.supabase.co", anonKey: "anon-13f", fetchImpl: fake }) : null;
  const sentF = fetched[0];
  const bodyF = sentF ? JSON.parse(sentF.init.body) : null;
  // B-435 · CAS (17.10): the keepalive is the same CONDITIONAL write — a PATCH on the row's token (⛔ a POST upsert).
  const baseF = rf.rows.get("u13f") && "2026-10-16T08:00:00+00:00"; // what the read returned (PG form)
  check("13f flushKeepalive: one PATCH with keepalive:true, conditioned on user_id AND the row's updated_at", kf?.sent === true && fetched.length === 1 && sentF.init.keepalive === true && sentF.init.method === "PATCH" && sentF.url === `https://x.supabase.co/rest/v1/user_settings?user_id=eq.u13f&updated_at=eq.${encodeURIComponent(baseF)}&select=updated_at`);
  check("13f headers: apikey · Bearer token · return=representation (0 rows ⇒ conflict is readable)", sentF?.init.headers?.apikey === "anon-13f" && sentF?.init.headers?.Authorization === "Bearer tok-13f" && /return=representation/.test(sentF?.init.headers?.Prefer || ""));
  check("13f body = the full cached blob + updated_at = an inflight token on disk", bodyF?.settings?.capital === 33333 && !!bodyF?.updated_at && (has("readPending") ? (P.readPending(global.localStorage)?.inflight || []).includes(bodyF.updated_at) : false));

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
  if (typeof US.flushKeepalive === "function") US.flushKeepalive("u13h", { accessToken: "t", url: "https://x.supabase.co", anonKey: "k", fetchImpl: (u, i) => { const b = JSON.parse(i.body); rh.rows.set("u13h", { settings: b.settings, updated_at: b.updated_at }); delivered.push(b); return Promise.resolve({ ok: true, json: async () => [{ updated_at: pgText(b.updated_at) }] }); } });
  const next = await loadSettings("u13h", rh.client); // a fresh page: the keepalive arrived, its answer was never seen
  const dh = has("decidePending") ? P.decidePending(P.readPending(global.localStorage), next.settings, next.updatedAt) : null;
  check("13h keepalive landed + load ⇒ «landed» — 0 banners", delivered.length === 1 && dh?.action === "landed");

  // i — guard for mutant M-v (green on f2cbbb8 too — B-361's rule, now load-bearing for the pending): a brand-new user
  // (no row) whose mirror already equals the first edit MUST get the row written. Seeding lastSent from the mirror would
  // read that edit as «already sent», settle it with no 2xx, and never write the row.
  global.localStorage = makeLocalStorage({ swingEdgeSettings: JSON.stringify({ capital: 5000 }) });
  const ri = tokenClient({});
  const li = await loadSettings("u13i", ri.client);
  if (has("recordScalarEdit")) P.recordScalarEdit(global.localStorage, "capital", 5000, { base: null });
  const offI = has("settlePending") ? US.onSettingsSynced((uid, blob, tok) => P.settlePending(global.localStorage, blob, { token: tok })) : () => {};
  saveSettings("u13i", { capital: 5000 }, ri.client);
  await flushSettings("u13i", ri.client);
  offI();
  check("13i no row + mirror = the first edit ⇒ the row IS written (1 upsert) — ⛔ «already sent» from the mirror", li.status === "empty" && ri.calls.upsert === 1 && ri.rows.get("u13i")?.settings?.capital === 5000);
}

// 14) B-435 · CAS (17.10) — every settings write is CONDITIONAL on the row's version token.
// Plan: docs/plans/PLAN-2026-10-17-b435-cas.md (approved 18.10 with fixes ①–④). Each assertion is RED on main
// (US_LIB=<main's src/lib>) — measured before this block was trusted.
{
  console.log("14) CAS: conditional writes · conflict · instants · deadline · monotonic token · vanished row (B-435)");
  let P = null;
  try { P = await import(new URL("settingsPending.js", LIB).href); } catch {}
  const tok = (seed, opts) => {
    // the block-13 client, re-declared here (block scope): rows {settings, updated_at}, PG-form answers.
    const rows = new Map(Object.entries(seed));
    const calls = { upsert: 0, sent: [], filters: [], aborted: 0 };
    function from() {
      const f = {}; let op = null, payload = null, signal = null;
      const land = () => {
        if (op === "insert" || op === "upsert") {
          if (op === "insert" && rows.has(payload.user_id)) return { data: null, error: { code: "23505", message: "duplicate key value violates unique constraint" } };
          rows.set(payload.user_id, { settings: payload.settings, updated_at: payload.updated_at });
          return { data: op === "insert" ? [{ updated_at: pgText(payload.updated_at) }] : payload, error: null };
        }
        const cur = rows.get(f.user_id);
        if (!cur || ("updated_at" in f && usOf(f.updated_at) !== usOf(cur.updated_at))) return { data: [], error: null };
        rows.set(f.user_id, { settings: payload.settings, updated_at: payload.updated_at });
        return { data: [{ updated_at: pgText(payload.updated_at) }], error: null };
      };
      const exec = () => {
        calls.upsert++; calls.sent.push(payload); calls.filters.push({ ...f, op });
        if (opts?.holdFirst && calls.upsert === 1) return new Promise((r) => signal?.addEventListener("abort", () => { calls.aborted++; r({ data: null, error: { message: "AbortError" } }); }));
        if (opts?.delayMs) return sleep(opts.delayMs).then(land); // the network: the first is still in flight when the second is issued
        return Promise.resolve(land());
      };
      const b = {
        select() { return b; }, eq(c, v) { f[c] = v; return b; }, abortSignal(sg) { signal = sg; return b; },
        async maybeSingle() { const r = rows.get(f.user_id); return r ? { data: { user_id: f.user_id, settings: r.settings, updated_at: pgText(r.updated_at) }, error: null } : { data: null, error: null }; },
        update(o) { op = "update"; payload = o; return b; }, insert(o) { op = "insert"; payload = o; return b; },
        upsert(o) { op = "upsert"; payload = o; return { then: (res, rej) => exec().then(res, rej) }; }, // main's path, so it can be seen red
        then(res, rej) { return (op ? exec() : Promise.resolve({ data: [], error: null })).then(res, rej); },
      };
      return b;
    }
    return { client: { from }, calls, rows };
  };
  const conflicts = [];
  const offC = typeof US.onSettingsConflict === "function" ? US.onSettingsConflict((uid, why) => conflicts.push({ uid, why })) : () => {};
  const T1 = "2026-10-17T07:02:33.965123+00:00"; // a row written by the column default: microseconds, PG form

  // a — the write carries the row's token as its condition, and it is an UPDATE (⛔ a blind upsert).
  global.localStorage = makeLocalStorage();
  const a = tok({ u14a: { settings: { capital: 1000 }, updated_at: T1 } });
  await loadSettings("u14a", a.client);
  saveSettings("u14a", { capital: 1100 }, a.client);
  await flushSettings("u14a", a.client);
  check("14a the write is an update conditioned on user_id AND the row's updated_at", a.calls.filters[0]?.op === "update" && a.calls.filters[0]?.user_id === "u14a" && a.calls.filters[0]?.updated_at === T1);

  // b — 0 rows (another writer moved the row) ⇒ ⛔ settle · the conflict is SAID · the other writer's row survives.
  global.localStorage = makeLocalStorage();
  const b = tok({ u14b: { settings: { capital: 1000, playbook: [{ id: 1, name: "theirs" }] }, updated_at: T1 } });
  await loadSettings("u14b", b.client);
  b.rows.set("u14b", { settings: { capital: 1000, playbook: [{ id: 1, name: "theirs" }, { id: 2, name: "new elsewhere" }] }, updated_at: "2026-10-17T07:05:00+00:00" });
  if (P?.recordScalarEdit) P.recordScalarEdit(global.localStorage, "capital", 1200, { base: T1 });
  const settledB = [];
  const offB = US.onSettingsSynced((uid, blob) => settledB.push(blob));
  conflicts.length = 0;
  saveSettings("u14b", { capital: 1200 }, b.client);
  await flushSettings("u14b", b.client);
  offB();
  check("14b 0 rows ⇒ a conflict is reported (onSettingsConflict) and ⛔ settled", conflicts.some((c) => c.uid === "u14b") && settledB.length === 0 && P?.readPending(global.localStorage)?.values?.capital === 1200);
  check("14b … and the other writer's row is ⛔ overwritten (2 setups, its token)", b.rows.get("u14b").settings.playbook.length === 2 && b.rows.get("u14b").updated_at === "2026-10-17T07:05:00+00:00");

  // c — no row when read, another device created it meanwhile ⇒ the insert gets 23505 ⇒ conflict, ⛔ a replace.
  global.localStorage = makeLocalStorage();
  const c = tok({});
  await loadSettings("u14c", c.client);
  c.rows.set("u14c", { settings: { capital: 7000, watchlist: [{ ticker: "NVDA" }] }, updated_at: T1 });
  conflicts.length = 0;
  saveSettings("u14c", { capital: 500 }, c.client);
  await flushSettings("u14c", c.client);
  check("14c insert over a row another device created ⇒ conflict (23505), its row intact", conflicts.some((x) => x.uid === "u14c") && c.rows.get("u14c").settings.capital === 7000);

  // d — two writes in a row: the second is conditioned on what the FIRST returned (⛔ a self-conflict), also when
  // they are started together.
  global.localStorage = makeLocalStorage();
  const d = tok({ u14d: { settings: { capital: 1 }, updated_at: T1 } }, { delayMs: 40 });
  await loadSettings("u14d", d.client);
  conflicts.length = 0;
  saveSettings("u14d", { capital: 2 }, d.client);
  const f1 = flushSettings("u14d", d.client);
  await sleep(10); // the first write is ON THE WIRE now
  saveSettings("u14d", { capital: 3 }, d.client);
  const f2 = flushSettings("u14d", d.client);
  await Promise.all([f1, f2]);
  check("14d a 2nd write issued while the 1st is in flight: both land, the 2nd on the 1st's returned token, 0 conflicts", d.rows.get("u14d").settings.capital === 3 && conflicts.length === 0 && d.calls.filters[1]?.updated_at === pgText(d.calls.sent[0]?.updated_at));

  // e — .123Z vs .123+00:00: the base sent is the DB's string, byte-identical (µs kept); after a write the base is
  // what the write RETURNED (PG form), ⛔ the client's own token.
  check("14e the base sent = the DB's string byte-identical (µs, +00:00), ⛔ re-formatted", a.calls.filters[0]?.updated_at === T1);
  check("14e after a write, the next base = the token the DB returned (…+00:00), ⛔ the client's …Z", typeof US.currentToken === "function" && US.currentToken("u14d") === pgText(d.calls.sent[1]?.updated_at) && US.currentToken("u14d") !== d.calls.sent[1]?.updated_at);

  // f — keepalive with no row version ⇒ ⛔ sent (nothing to condition on) — the pending carries it.
  global.localStorage = makeLocalStorage();
  const f = tok({});
  await loadSettings("u14f", f.client);
  saveSettings("u14f", { capital: 9 }, f.client);
  const fetchedF = [];
  const kf = US.flushKeepalive("u14f", { accessToken: "t", url: "https://x.supabase.co", anonKey: "k", fetchImpl: (u, i) => { fetchedF.push(u); return Promise.resolve({ ok: true, json: async () => [] }); } });
  check("14f keepalive with no row version ⇒ ⛔ sent · reason «no-base»", kf?.sent === false && kf?.reason === "no-base" && fetchedF.length === 0);

  // g — B-270 by construction: a read said «no row» (the cache is partial) and a full row appeared ⇒ the write is
  // refused (23505), ⛔ the siblings deleted.
  global.localStorage = makeLocalStorage();
  const g = tok({});
  await loadSettings("u14g", g.client);
  g.rows.set("u14g", { settings: { capital: 5000, watchlist: [{ ticker: "AAPL" }], playbook: [{ id: 9, name: "keep me" }], onboarding: { completed: true } }, updated_at: T1 });
  saveSettings("u14g", { capital: 5100 }, g.client);
  await flushSettings("u14g", g.client);
  const gRow = g.rows.get("u14g").settings;
  check("14g B-270: a partial cache never replaces a full row — watchlist · playbook · onboarding survive", gRow.watchlist?.length === 1 && gRow.playbook?.length === 1 && gRow.onboarding?.completed === true);

  // h — the measured false conflict (M-027 formats): own write landed (base = …Z the client sent), a 2nd edit, the
  // reload comes first, the row returns the SAME instant as …+00:00 ⇒ the pending applies, ⛔ a banner.
  const hp = { v: 1, base: "2026-10-17T07:02:33.965Z", inflight: [], values: { capital: 2222 } };
  const hd = P?.decidePending ? P.decidePending(hp, { capital: 1111 }, "2026-10-17T07:02:33.965+00:00") : null;
  check("14h base …965Z vs row …965+00:00 (same instant) ⇒ «apply», ⛔ a false «conflict»", hd?.action === "apply" && hd?.apply?.capital === 2222);
  const st = P?.sameToken;
  check("14h sameToken: Z ≡ +00:00 · µs kept · offsets · garbage ⇒ false", !!st && st("2026-10-17T07:02:33.965Z", "2026-10-17T07:02:33.965+00:00") && !st("2026-10-17T07:02:33.965123+00:00", "2026-10-17T07:02:33.965Z") && st("2026-10-17T09:02:33.965+02:00", "2026-10-17T07:02:33.965Z") && (() => { const e = console.error; console.error = () => {}; const r = st("A-tok", "A-tok"); console.error = e; return r === false; })());

  // i — fix ①: a write that never answers ENDS (deadline ⇒ abort, like a throw) and the next write goes out.
  global.localStorage = makeLocalStorage();
  const i = tok({ u14i: { settings: { capital: 1 }, updated_at: T1 } }, { holdFirst: true });
  await loadSettings("u14i", i.client);
  saveSettings("u14i", { capital: 2 }, i.client);
  const fi1 = flushSettings("u14i", i.client, { timeoutMs: 60 });
  const ended = await Promise.race([fi1.then(() => true), sleep(600).then(() => false)]);
  saveSettings("u14i", { capital: 3 }, i.client);
  const fi2 = flushSettings("u14i", i.client, { timeoutMs: 60 });
  await Promise.race([fi2, sleep(600)]);
  check("14i a hung write ends at its deadline (aborted) and the NEXT write still goes out", ended === true && i.calls.aborted === 1 && i.calls.upsert === 2 && i.rows.get("u14i").settings.capital === 3);

  // k — fix ②: a client clock 5 minutes behind the row ⇒ the new token is still LATER than the base.
  global.localStorage = makeLocalStorage();
  const ahead = new Date(Date.now() + 5 * 60_000).toISOString().replace("Z", "+00:00");
  const k = tok({ u14k: { settings: { capital: 1 }, updated_at: ahead } });
  await loadSettings("u14k", k.client);
  saveSettings("u14k", { capital: 2 }, k.client);
  await flushSettings("u14k", k.client);
  check("14k clock 5 min behind the row ⇒ the token sent is still later than the base (instant)", usOf(k.calls.sent[0]?.updated_at) > usOf(ahead));

  // j — fix ④: the row existed this session, a write gets 0 rows, the re-read finds NO row ⇒ ⛔ an automatic insert.
  global.localStorage = makeLocalStorage();
  const j = tok({ u14j: { settings: { capital: 1, playbook: [{ id: 1, name: "x" }] }, updated_at: T1 } });
  await loadSettings("u14j", j.client);
  j.rows.delete("u14j"); // the account's row was deleted elsewhere (B-191)
  saveSettings("u14j", { capital: 2 }, j.client);
  await flushSettings("u14j", j.client);
  const errs = []; const oe = console.error; console.error = (...x) => errs.push(x.join(" "));
  const rj = await loadSettings("u14j", j.client);
  saveSettings("u14j", { capital: 3 }, j.client);
  await flushSettings("u14j", j.client);
  console.error = oe;
  check("14j row vanished mid-session ⇒ the re-read is «gone», ⛔ an insert, said in the console", rj?.gone === true && !j.rows.has("u14j") && errs.some((e) => /gone|vanished/.test(e)));
  // l — the rebase read carries this device's UNCONFIRMED keys outside the journal/pending (welcomeSeen …) over the
  // new row, and ⛔ a collection (those are rebased from the journal by the app — carrying the cache's array would
  // replace the other device's again).
  global.localStorage = makeLocalStorage();
  const l = tok({ u14l: { settings: { capital: 1, welcomeSeen: false, playbook: [{ id: 1, name: "a" }] }, updated_at: T1 } });
  await loadSettings("u14l", l.client);
  saveSettings("u14l", { welcomeSeen: true, playbook: [{ id: 1, name: "a" }, { id: 2, name: "local" }] }, l.client); // ⛔ flushed
  l.rows.set("u14l", { settings: { capital: 1, welcomeSeen: false, playbook: [{ id: 1, name: "a" }, { id: 3, name: "remote" }], riskPct: 2 }, updated_at: "2026-10-17T07:09:00+00:00" });
  const rl = await loadSettings("u14l", l.client);
  check("14l rebase read: the unconfirmed welcomeSeen is carried over the new row · the row's own change (riskPct) kept", rl.settings?.welcomeSeen === true && rl.settings?.riskPct === 2);
  check("14l … and the collection is the ROW's (⛔ the cache's array — the journal rebases it in the app)", JSON.stringify((rl.settings?.playbook || []).map((x) => x.name)) === JSON.stringify(["a", "remote"]));
  offC();
}

console.log("");
if (failures > 0) {
  console.error(`❌ test:settings — ${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("✅ test:settings — all assertions passed");
