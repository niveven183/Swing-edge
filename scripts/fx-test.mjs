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

import { readFileSync } from "node:fs";
import { convert, resolveDayRate, buildRateTable } from "../src/lib/fx.js";
import { BUCKET_THRESHOLDS, bucketFor, riskPctFor } from "../src/lib/riskProfile.js";
import { equityBaseDayKey, resolveEquityBase } from "../src/lib/equityBase.js";
import { computeTradingStats } from "../src/lib/tradingStats.js";
import { calcTradeMetrics } from "../src/utils.js";

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

// ── 6 · A CLASSIFICATION THRESHOLD IS DENOMINATED TOO ───────────────────────
// The bug: ₪10,000 was compared against a threshold written in dollars, so a
// small account was classified as a medium one and walked away with double the
// per-trade risk. Measured in production, not theorised: 1/2 of the shekel
// onboardings (AUDIT 2026-08-09 §4א).
console.log("\n6 · risk buckets · an amount is classified in its own currency");
{
  // ₪10,000 at ~3.0 ₪/$ is about $3,330. It must be classified like that
  // account, and NOT like a $10,000 one. These two are the whole assertion.
  eq("₪10,000 is a small account", bucketFor(10_000, "ILS"), "small");
  eq("…exactly as $3,330 is", bucketFor(3_330, "USD"), "small");
  check("₪10,000 is NOT classified as $10,000 would be",
    bucketFor(10_000, "ILS") !== bucketFor(10_000, "USD"));
  eq("…because $10,000 is a medium account", bucketFor(10_000, "USD"), "medium");

  // The two real production onboardings, both of which must keep the riskPct
  // they already have — this is the zero-harm claim, machine-checked.
  eq("₪20,000 beginner keeps riskPct 1.0",
    riskPctFor(bucketFor(20_000, "ILS"), "beginner"), 1);
  eq("₪59,999 beginner keeps riskPct 1.0",
    riskPctFor(bucketFor(59_999, "ILS"), "beginner"), 1);
  // And the one that was actually harmed, had it been classified correctly.
  eq("₪10,000 beginner should have been 0.5",
    riskPctFor(bucketFor(10_000, "ILS"), "beginner"), 0.5);

  // Every currency the picker offers needs a policy row. Without this, adding
  // a third currency to the picker silently classifies it as dollars — which
  // is the bug this whole section exists to close, one currency later.
  const onboardingSrc = readFileSync(
    new URL("../src/components/OnboardingScreen.jsx", import.meta.url), "utf8");
  const picker = onboardingSrc.match(/\[([^\]]*)\]\.map\(c =>/);
  const offered = picker ? [...picker[1].matchAll(/"([A-Z]{3})"/g)].map(m => m[1]) : [];
  check(`the picker offers ${offered.length} currencies and the test found them`, offered.length >= 2);
  for (const c of offered) {
    check(`${c} has a threshold row — a picker option cannot outrun its policy`,
      Object.prototype.hasOwnProperty.call(BUCKET_THRESHOLDS, c));
  }
}

// ── 7 · THE EQUITY CURVE'S BASE IS A PAST VALUE ─────────────────────────────
// fx.js:16-17 names "a point on the equity curve" as a PAST value. The deltas
// obeyed that; the base did not — it was converted at spot, so the whole curve
// slid vertically whenever the shekel moved and the return % slid with it.
console.log("\n7 · equity base · the curve does not move when spot does");
{
  // A shekel-denominated account, displayed in dollars — the live 3/32 case.
  const ilsUsd = (spotRate) => buildRateTable("ILS", "USD", {
    "2026-07-28": { USD: 0.3270 },
    "2026-07-31": { USD: 0.3271 },
  }, { rate: spotRate, rateDate: "2026-08-09" }, ["2026-07-28", "2026-07-31"]);

  const trades = [
    { id: 1, status: "CLOSED", side: "LONG", entry: 100, exit: 110, shares: 10,
      stop: 95, date: "2026-07-28", closedAt: "2026-07-28T14:00:00Z", currency: "ILS" },
    // Deliberately NOT 20 shares: a -100 here would cancel trade 1's +100, and
    // returnPct would be 0 for EVERY base — an assertion that cannot fail.
    { id: 2, status: "CLOSED", side: "LONG", entry: 50, exit: 45, shares: 6,
      stop: 48, date: "2026-07-31", closedAt: "2026-07-31T14:00:00Z", currency: "ILS" },
  ];
  const args = { capital: 59_999, capitalCurrency: "ILS", accountCurrency: "USD", trades };

  eq("the base day is the FIRST realized trade's day",
    equityBaseDayKey(trades), "2026-07-28");

  // 🔴 **Declared move — 2026-08-15, wave ה׳ (`B-142`).** `resolveEquityBase`
  // returned a NUMBER and now returns a DECISION (`{ok, reason, value, currency}`),
  // because the number alone never said which currency it was in — and the
  // fall-back-to-raw-capital path (the last assertion in this block) produces a
  // shekel base that was then printed under "$" and used as the denominator of
  // the return %.
  //
  // ⚠️ What moved is the CALL (`.value`) — ⛔ NOT the expectation. All five
  // expected values in this block (`59,999 × 0.3270` · `calm === moved` ·
  // `59,999 × 0.4` · `59,999`) stay number-for-number. ⛔ None was softened.
  //
  // Two tables identical in every historical fixing, differing ONLY in spot.
  const calm  = resolveEquityBase({ ...args, fxTable: ilsUsd(0.3271) }).value;
  const moved = resolveEquityBase({ ...args, fxTable: ilsUsd(0.4000) }).value;

  eq("the base is priced at the base day's fixing, not spot",
    Math.round(calm * 100) / 100, Math.round(59_999 * 0.3270 * 100) / 100);
  check("a 22% move in spot does not shift the base by one cent", calm === moved);

  // …and therefore not the return % either, which is what the user reads.
  const statsCalm  = computeTradingStats(trades, calm,  calcTradeMetrics);
  const statsMoved = computeTradingStats(trades, moved, calcTradeMetrics);
  check("…so the return % is identical too", statsCalm.returnPct === statsMoved.returnPct);
  check("…and every equity point with it",
    statsCalm.currentEquity === statsMoved.currentEquity);

  // Proof the two assertions above discriminate: run the OLD path (spot, no day
  // key) through the SAME comparison and watch both of them move. Without this,
  // a fixture whose P&L happens to sum to zero would pass the return-% check
  // forever, on broken code and fixed code alike.
  const oldCalm  = convert(59_999, "ILS", "USD", ilsUsd(0.3271)).value;
  const oldMoved = convert(59_999, "ILS", "USD", ilsUsd(0.4000)).value;
  check("the discarded spot base genuinely moved — the assertion has teeth",
    oldCalm !== oldMoved);
  check("…and moved the return % with it — the return-% check has teeth too",
    computeTradingStats(trades, oldCalm, calcTradeMetrics).returnPct !==
    computeTradingStats(trades, oldMoved, calcTradeMetrics).returnPct);

  // No history yet → a single point, which IS a claim about now. Spot is right.
  const noTrades = resolveEquityBase({ ...args, trades: [], fxTable: ilsUsd(0.4) }).value;
  eq("with no closed trades the single point uses spot", noTrades, 59_999 * 0.4);

  // No fixing for the base day → keep the capital, never borrow spot.
  const noFixing = resolveEquityBase({ ...args, fxTable: buildRateTable(
    "ILS", "USD", {}, { rate: 0.4, rateDate: "2026-08-09" }, []) }).value;
  eq("a missing base-day fixing falls back to the capital, NOT to spot", noFixing, 59_999);
}

// ── 8 · THE ONBOARDING SUMMARY PRINTS THE USER'S CURRENCY ───────────────────
// A lint-class assertion: JSX cannot be imported in bare Node, and a literal
// "$" glued to a value is a source-level defect, so the source is what we read.
console.log("\n8 · onboarding summary · no hardcoded currency glyph");
{
  const src = readFileSync(
    new URL("../src/components/OnboardingScreen.jsx", import.meta.url), "utf8");
  const literalDollar = src.match(/\$\{?\{profile\.[A-Za-z.]+\}/g) || [];
  check("no profile value is printed behind a literal $ — an ILS user saw \"$0\"",
    literalDollar.length === 0);
}

console.log(
  failures === 0
    ? "\n✅ fx: all assertions passed — identity is exact, past values are frozen to their own day, a threshold is denominated, and a missing rate is never invented.\n"
    : `\n❌ fx: ${failures} assertion(s) failed.\n`
);
process.exit(failures === 0 ? 0 : 1);
