// test:datachain — guards the DB↔client trade boundary (FIN-039/040/041).
//
// Every assertion here protects a field that is written to Postgres. A failure
// means the next save corrupts a row, not that a number renders wrong.
// Pure Node, no network, no Supabase client. Run: `node scripts/dataChain-test.mjs`.

import { tradeForSupabase, tradeFromSupabase } from "../src/supabaseClient.js";
import { cleanTrades } from "../src/lib/cleanTrades.js";
import { deriveCloseState } from "../src/lib/tradeCloseState.js";

let failures = 0;
const check = (name, cond) => {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    failures++;
    console.error(`  ✗ ${name}`);
  }
};

// Captures console.error so a test can assert on noise — and, just as
// importantly, on silence.
function withCapturedErrors(fn) {
  const original = console.error;
  const calls = [];
  console.error = (...args) => calls.push(args.join(" "));
  try { fn(); } finally { console.error = original; }
  return calls;
}

const baseRow = {
  id: "t1", user_id: "u1", ticker: "AAPL", side: "LONG", date: "2026-05-12",
  entry: 100, stop: 95, target: 110, shares: 10, status: "OPEN", setup: "Breakout",
  marketCondition: "Trending Up", emotionAtEntry: "Calm", entryQuality: "3",
  followedPlan: "true", exitReason: null, notes: "", lessonLearned: "",
  maxFavorable: null, maxAdverse: null, _capitalAtEntry: 2500,
  createdAt: "2026-05-12T10:00:00.000Z", closedAt: null, exit: null,
};

// ── 1-3 · round-trip of the one renamed column ────────────────────────────
{
  console.log("1-3) isDemo ↔ is_demo round-trip");

  const t = tradeFromSupabase({ ...baseRow, is_demo: true });
  check("read maps is_demo:true → isDemo:true", t.isDemo === true);
  check("read drops the snake_case key", !("is_demo" in t));
  check("write maps isDemo:true → is_demo:true", tradeForSupabase(t).is_demo === true);

  const f = tradeFromSupabase({ ...baseRow, is_demo: false });
  check("read maps is_demo:false → isDemo:false", f.isDemo === false);
  check("write preserves false", tradeForSupabase(f).is_demo === false);

  // The core of principle #2: unknown must not become false, because an
  // absent column in an UPDATE leaves the stored value intact.
  const payload = tradeForSupabase({ ...baseRow, isDemo: undefined });
  check("isDemo:undefined ⇒ is_demo absent from payload", !("is_demo" in payload));
  const unknown = tradeFromSupabase({ ...baseRow });
  check("row without is_demo ⇒ no fabricated isDemo", !("isDemo" in unknown));
}

// ── 4-5 · cleanTrades must not demote a demo trade ────────────────────────
{
  console.log("4-5) cleanTrades preserves the demo flag");

  // The exact shape of the 36 production demo rows: flag true, but every
  // SIM-/Hive- marker already stripped by an earlier pass of this same map.
  const [cleaned] = cleanTrades([tradeFromSupabase({ ...baseRow, is_demo: true })]);
  check("is_demo:true survives cleanTrades with no markers", cleaned.isDemo === true);

  const [unknown] = cleanTrades([{ ...baseRow, ticker: "MSFT", setup: "Pullback" }]);
  check("cleanTrades invents no false for unknown isDemo", unknown.isDemo === undefined);

  const [sim] = cleanTrades([{ ...baseRow, ticker: "SIM-TEST" }]);
  check("SIM- ticker still promotes to true", sim.isDemo === true);
  check("SIM- prefix is still stripped", sim.ticker === "TEST");
}

// ── 6 · unknown columns fail loudly, known-local ones stay silent ─────────
{
  console.log("6) dropped-column reporting");

  const noisy = withCapturedErrors(() =>
    tradeForSupabase({ ...baseRow, someNewField: 1, exitDate: "2026-05-13" })
  );
  check("unknown column triggers console.error", noisy.length === 1);
  check("message names every dropped key",
    noisy[0].includes("someNewField") && noisy[0].includes("exitDate"));
  check("message names the trade id", noisy[0].includes("t1"));

  // A valid save must be silent — an alarm that fires on correct behaviour
  // is an alarm everyone learns to ignore.
  const quiet = withCapturedErrors(() =>
    tradeForSupabase({ ...baseRow, isDemo: true, tradeImage: "data:image/png;base64,x", _prediction: {} })
  );
  check("valid save produces zero console.error calls", quiet.length === 0);
}

// ── 7-9 · close state is derived, never carried ───────────────────────────
{
  console.log("7-9) deriveCloseState");

  const reopened = deriveCloseState({ exit: null, prev: { status: "CLOSED", closedAt: "2026-05-13T20:00:00.000Z" } });
  check("clearing exit reopens the trade", reopened.status === "OPEN");
  check("clearing exit clears closedAt", reopened.closedAt === null);

  const dated = deriveCloseState({ exit: 110, exitDay: "2026-05-13", prev: baseRow });
  check("exitDay lands on the same local day",
    new Date(dated.closedAt).getTime() === new Date("2026-05-13T20:00:00").getTime());
  check("exitDay sets status CLOSED", dated.status === "CLOSED");

  const kept = deriveCloseState({ exit: 110, exitDay: "", prev: { closedAt: "2026-05-14T20:00:00.000Z" } });
  check("no exitDay preserves the existing closedAt", kept.closedAt === "2026-05-14T20:00:00.000Z");
}

// ── 10 · the invariant itself ─────────────────────────────────────────────
{
  console.log("10) invariant — CLOSED implies exit");

  const fixtures = [
    { exit: null, exitDay: "" },
    { exit: null, exitDay: "2026-05-13" },
    { exit: 110, exitDay: "2026-05-13" },
    { exit: 110, exitDay: "" },
    { exit: 0, exitDay: "" },
  ];
  const rows = cleanTrades(
    fixtures.map((f, i) => ({
      ...baseRow, id: `f${i}`, exit: f.exit,
      ...deriveCloseState({ exit: f.exit, exitDay: f.exitDay, prev: baseRow }),
    }))
  );
  check("zero CLOSED rows without an exit",
    rows.filter((r) => r.status === "CLOSED" && r.exit == null).length === 0);
  check("zero OPEN rows carrying a closedAt",
    rows.filter((r) => r.status === "OPEN" && r.closedAt != null).length === 0);
}

console.log("");
if (failures > 0) {
  console.error(`❌ test:datachain — ${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("✅ test:datachain — all assertions passed");
