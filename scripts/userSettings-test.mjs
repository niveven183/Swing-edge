// test:settings — logic tests for src/lib/userSettings.js.
//
// Runs against an in-memory MOCK supabase client + a fake localStorage — it does
// NOT touch the real database. (The migration is intentionally NOT applied to
// prod in M1; that is M2 / manual.) Pure Node. Run: `node scripts/userSettings-test.mjs`.

import {
  loadSettings,
  saveSettings,
  flushSettings,
  migrateFromLocalStorage,
} from "../src/lib/userSettings.js";

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
function makeMockClient(initialRows = {}, { failMode = false, upsertFailMode = false } = {}) {
  const rows = new Map(Object.entries(initialRows));
  const calls = { upsert: 0, select: 0 };
  function from() {
    let filterId = null;
    const builder = {
      select() {
        calls.select++;
        return builder;
      },
      eq(_col, v) {
        filterId = v;
        return builder;
      },
      async maybeSingle() {
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

console.log("");
if (failures > 0) {
  console.error(`❌ test:settings — ${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("✅ test:settings — all assertions passed");
