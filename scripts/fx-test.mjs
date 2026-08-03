// test:fx — guards the currency-conversion contract (T10).
//
// The contract, in one line: a converted number is either RIGHT or ABSENT.
// There is no third state. No `|| 1`, no default rate, no "close enough".
//
// Four properties this file exists to prove, each of which is a bug that has a
// real shape:
//
//   1. from === to returns the input UNTOUCHED. If identity went through the
//      multiply path, $200 → $ would be 199.99999999999997 and a round-trip
//      would drift a cent per hop. Exactness must be structural.
//
//   2. A PAST value uses the rate of ITS OWN DAY, never spot. A trade closed on
//      31.03 converted at today's rate would show a different shekel profit
//      every morning with nobody touching it — a number that moves by itself.
//
//   3. A missing rate returns null WITH A REASON, never a fabricated number.
//      Same contract calcTradeMetrics already honours for rMultiple.
//
//   4. A weekend/holiday day walks back to the previous fixing, and REPORTS the
//      day it actually used. The ECB does not price Sundays and never will;
//      silently stamping the requested date onto a Friday rate is a lie the UI
//      would then repeat to the user.
//
// The rate numbers below are the live outputs recorded in
// docs/plans/PLAN-2026-08-03-currency-conversion.md part ג', captured 03.08.
// They are fixtures, not assertions about today's market.
//
// Pure Node, no network. Run: `node scripts/fx-test.mjs`.

import { convert, resolveDayRate, buildRateTable } from "../src/lib/fx.js";

let failures = 0;
const check = (name, cond) => {
  if (cond) console.log(`  ✓ ${name}`);
  else { failures++; console.error(`  ✗ ${name}`); }
};
const eq = (name, actual, expected) =>
  check(`${name} → ${JSON.stringify(expected)}`, Object.is(actual, expected));

// Live-captured ECB USD→ILS fixings (part ג'). 28–31.07 is a Tue–Fri run;
// 2026-03-28/29 are a Saturday/Sunday with no fixing, by design.
const RANGE = {
  "2026-03-27": { ILS: 3.1544 },
  "2026-03-30": { ILS: 3.1602 },
  "2026-03-31": { ILS: 3.164  },
  "2026-07-28": { ILS: 3.0568 },
  "2026-07-29": { ILS: 3.0622 },
  "2026-07-30": { ILS: 3.0695 },
  "2026-07-31": { ILS: 3.0574 },
};
const SPOT = { rate: 3.0574, rateDate: "2026-07-31" };

const DAYS = ["2026-03-27", "2026-03-29", "2026-03-31", "2026-07-31"];
const table = buildRateTable("USD", "ILS", RANGE, SPOT, DAYS);

// ── 1 · IDENTITY IS NOT A CONVERSION ────────────────────────────────────────
console.log("\n1 · identity · same currency in, same number out");
{
  const r = convert(200, "USD", "USD", null);
  eq("$200 → USD is exactly 200", r.value, 200);
  eq("…at a rate of 1", r.rate, 1);
  eq("…with no rate date to report", r.rateDate, null);
  check("identity needs no rate table at all", r.value === 200);

  // The round trip Niv asked for end-to-end: $200 → ₪ → $200.
  const out = convert(200, "USD", "ILS", table);
  eq("$200 → ₪611.48", Math.round(out.value * 100) / 100, 611.48);
  const back = convert(out.value / SPOT.rate, "USD", "USD", null);
  eq("…and back to exactly 200, not 199.999…", back.value, 200);

  // Zero is a value, not a blank — the numOrNull lesson, applied to money.
  eq("$0 converts to 0, not null", convert(0, "USD", "ILS", table).value, 0);
}

// ── 2 · PAST VALUES USE THEIR OWN DAY'S RATE ────────────────────────────────
console.log("\n2 · past vs present · a closed trade does not move overnight");
{
  const past = convert(100, "USD", "ILS", table, "2026-03-31");
  eq("31.03 P&L uses the 31.03 fixing", past.rate, 3.164);
  eq("…so $100 is ₪316.40", Math.round(past.value * 100) / 100, 316.4);
  eq("…and says which day it priced", past.rateDate, "2026-03-31");

  const present = convert(100, "USD", "ILS", table);
  eq("a present value uses spot instead", present.rate, 3.0574);
  check("the two rates genuinely differ — the test discriminates",
    past.rate !== present.rate);

  // The regression this whole distinction exists to prevent.
  check("a past value is NOT priced at spot", past.value !== present.value);
}

// ── 3 · NEVER INVENT A RATE ─────────────────────────────────────────────────
console.log("\n3 · absence · no rate is an answer, not a zero and not a one");
{
  const noTable = convert(100, "USD", "ILS", null);
  eq("no rate table → null value", noTable.value, null);
  eq("…and names why", noTable.reason, "no_rate_table");
  check("…and never falls back to the raw amount", noTable.value !== 100);

  const wrongQuote = convert(100, "USD", "EUR", table);
  eq("a table for the wrong pair is not a table", wrongQuote.value, null);
  eq("…and names why", wrongQuote.reason, "no_rate_table");

  const noDay = convert(100, "USD", "ILS", table, "2019-01-01");
  eq("a day outside the range → null", noDay.value, null);
  eq("…and names why", noDay.reason, "no_rate_for_day");

  const spotless = buildRateTable("USD", "ILS", RANGE, null, DAYS);
  eq("a table with no spot cannot price the present", convert(100, "USD", "ILS", spotless).value, null);
  eq("…and names why", convert(100, "USD", "ILS", spotless).reason, "no_spot_rate");
  check("…but it can still price the past it does hold",
    convert(100, "USD", "ILS", spotless, "2026-03-31").value != null);

  eq("NaN in → null out, never NaN out", convert(NaN, "USD", "ILS", table).value, null);
  eq("…and names why", convert(NaN, "USD", "ILS", table).reason, "amount_not_a_number");
  eq("undefined in → null out", convert(undefined, "USD", "ILS", table).value, null);

  // A zero or negative rate is corrupt data, not a cheap conversion.
  const zeroRate = buildRateTable("USD", "ILS", { "2026-05-01": { ILS: 0 } }, null, ["2026-05-01"]);
  eq("a rate of 0 is refused, not applied", convert(100, "USD", "ILS", zeroRate, "2026-05-01").value, null);
}

// ── 4 · WEEKENDS AND HOLIDAYS ───────────────────────────────────────────────
console.log("\n4 · no fixing that day · walk back, and say so");
{
  const raw = Object.fromEntries(Object.entries(RANGE).map(([d, o]) => [d, o.ILS]));

  const sunday = resolveDayRate(raw, "2026-03-29"); // Sunday
  eq("Sunday 29.03 falls back to Friday's fixing", sunday.rate, 3.1544);
  eq("…and reports 27.03, not 29.03", sunday.rateDate, "2026-03-27");

  const business = resolveDayRate(raw, "2026-03-31");
  eq("a business day reports itself", business.rateDate, "2026-03-31");

  eq("a gap wider than a week is refused", resolveDayRate(raw, "2026-06-15"), null);
  eq("…rather than reaching back to March", resolveDayRate(raw, "2026-06-15"), null);

  // Through the public entry point, which is what the UI actually calls.
  const viaConvert = convert(100, "USD", "ILS", table, "2026-03-29");
  eq("convert() honours the walk-back too", viaConvert.rate, 3.1544);
  eq("…and surfaces the real fixing date for the UI to print", viaConvert.rateDate, "2026-03-27");
  check("the requested date is NOT echoed back as if it had a fixing",
    viaConvert.rateDate !== "2026-03-29");
}

// ── 5 · TABLE ASSEMBLY ──────────────────────────────────────────────────────
console.log("\n5 · buildRateTable · only real rates get in");
{
  const t = buildRateTable("USD", "ILS", {
    "2026-05-01": { ILS: 3.2 },
    "2026-05-04": { ILS: null },     // upstream gap
    "2026-05-05": { ILS: "3.3" },    // wrong type
    "2026-05-06": { EUR: 0.9 },      // wrong currency
  }, null, ["2026-05-01", "2026-05-04", "2026-05-05", "2026-05-06"]);

  eq("a real rate is kept", t.byDay["2026-05-01"].rate, 3.2);
  eq("a null rate walks back rather than being stored as null",
    t.byDay["2026-05-04"].rate, 3.2);
  eq("…and reports the day it actually used", t.byDay["2026-05-04"].rateDate, "2026-05-01");
  eq("a string is not a number", t.byDay["2026-05-05"].rate, 3.2);
  eq("a rate for another currency is not our rate", t.byDay["2026-05-06"].rate, 3.2);

  eq("an empty payload yields no days", Object.keys(buildRateTable("USD", "ILS", {}, null, ["2026-05-01"]).byDay).length, 0);
  eq("…and no spot", buildRateTable("USD", "ILS", {}, null, []).spot, null);
  eq("the table records its own pair — base", t.base, "USD");
  eq("…and quote", t.quote, "ILS");
}

console.log(
  failures === 0
    ? "\n✅ fx: all assertions passed — identity is exact, past values are frozen to their own day, and a missing rate is never invented.\n"
    : `\n❌ fx: ${failures} assertion(s) failed.\n`
);
process.exit(failures === 0 ? 0 : 1);
