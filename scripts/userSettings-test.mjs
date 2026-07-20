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
function makeMockClient(initialRows = {}) {
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
        if (!rows.has(filterId)) return { data: null, error: null };
        return { data: { user_id: filterId, settings: rows.get(filterId) }, error: null };
      },
      upsert(obj) {
        calls.upsert++;
        rows.set(obj.user_id, obj.settings);
        return Promise.resolve({ data: obj, error: null });
      },
    };
    return builder;
  }
  return { client: { from }, calls, rows };
}

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
  check("returned mirror value", res?.lang === "he");

  global.localStorage = makeLocalStorage(); // empty
  const empty = await loadSettings("u2b", null);
  check("empty mirror -> {}", empty && Object.keys(empty).length === 0);
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

console.log("");
if (failures > 0) {
  console.error(`❌ test:settings — ${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("✅ test:settings — all assertions passed");
