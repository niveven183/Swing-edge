// test:format — guards the display layer's sign contract (FIN-028…031, 042…046).
//
// Two JavaScript traps produced the same class of lie on screen:
//   `-0 >= 0` is true  → a loss too small to survive rounding printed as a
//                        green "+$0.00", so the sign in the text and the sign
//                        in the color disagreed.
//   `NaN >= 0` is false → a broken metric fell into the negative branch and
//                        printed "-$NaN" instead of admitting it had no value.
// A third, `Number(v) || 0`, turned "we never measured this" into a confident
// "0%". Every one of those is a number the user cannot verify by eye.
//
// This file freezes the outputs, not the implementations: it asserts what the
// screen shows for -0, NaN, ±Infinity and null, and asserts that the tooltip
// that teaches what R means names BOTH directions (FIN-044 — the old text was
// LONG-only, so it taught the opposite of the truth for a winning SHORT).
//
// Pure Node, no network. Run: `node scripts/format-test.mjs`.

import { readFileSync } from "node:fs";
import { fmt$, fmt$0, fmtR, formatPct, formatReturnPct, isNegativeValue } from "../src/utils.js";
import { TRADING_TOOLTIPS } from "../src/data/tooltips.js";

let failures = 0;
const check = (name, cond) => {
  if (cond) console.log(`  ✓ ${name}`);
  else { failures++; console.error(`  ✗ ${name}`); }
};
const eq = (name, actual, expected) =>
  check(`${name} → ${JSON.stringify(expected)}${Object.is(actual, expected) ? "" : `  (got ${JSON.stringify(actual)})`}`,
    Object.is(actual, expected));

const LANGS = ["en", "he", "es", "pt", "ar"];

// ── 1 · fmt$ — the sign lives in the text ────────────────────────────────────
{
  console.log("\n1 · fmt$ · signed money");
  eq("fmt$(-0) is a loss, not a green zero", fmt$(-0), "-$0.00");
  eq("fmt$(0) stays positive-zero", fmt$(0), "+$0.00");
  eq("fmt$(-1234.5)", fmt$(-1234.5), "-$1,234.50");
  eq("fmt$(1234.5)", fmt$(1234.5), "+$1,234.50");
  eq("fmt$ rounds to cents, never prints thirds of a cent", fmt$(1234.567), "+$1,234.57");
  eq("fmt$(-0.004) — a loss that rounds away is still a loss", fmt$(-0.004), "-$0.00");
}

// ── 2 · fmt$ — unmeasurable renders as unmeasurable ──────────────────────────
{
  console.log("\n2 · fmt$ · no value is not a value");
  eq("fmt$(NaN)", fmt$(NaN), "—");
  eq("fmt$(Infinity)", fmt$(Infinity), "—");
  eq("fmt$(-Infinity)", fmt$(-Infinity), "—");
  eq("fmt$(null)", fmt$(null), "—");
  eq("fmt$(undefined)", fmt$(undefined), "—");
}

// ── 3 · fmt$0 — whole dollars, same contract ─────────────────────────────────
{
  console.log("\n3 · fmt$0 · calendar cells and chart axes");
  eq("fmt$0(-450) — FIN-042, a losing day must carry its minus", fmt$0(-450), "-$450");
  eq("fmt$0(450)", fmt$0(450), "+$450");
  eq("fmt$0(-0)", fmt$0(-0), "-$0");
  eq("fmt$0(0)", fmt$0(0), "+$0");
  eq("fmt$0(-12345.6) rounds, keeps the separator", fmt$0(-12345.6), "-$12,346");
  eq("fmt$0(NaN)", fmt$0(NaN), "—");
}

// ── 4 · fmtR — the frozen value does not move ────────────────────────────────
{
  console.log("\n4 · fmtR · R display (rContract-test.mjs:174 freezes the first line)");
  eq("fmtR(0) — unchanged by the -0 fix", fmtR(0), "+0.00R");
  eq("fmtR(-0) — a rounded-away R loss", fmtR(-0), "-0.00R");
  eq("fmtR(-1.5)", fmtR(-1.5), "-1.50R");
  eq("fmtR(2)", fmtR(2), "+2.00R");
  eq("fmtR(null) — no stop, no R", fmtR(null), "—");
  eq("fmtR(NaN)", fmtR(NaN), "—");
}

// ── 5 · percentages — a real 0 and a missing value are different claims ──────
{
  console.log("\n5 · formatPct / formatReturnPct · the false zero");
  eq("formatPct(0) — an empty portfolio genuinely is 0%", formatPct(0), "0%");
  eq("formatPct(58.4)", formatPct(58.4), "58%");
  eq("formatPct(null)", formatPct(null), "—");
  eq("formatPct(undefined)", formatPct(undefined), "—");
  eq("formatPct(NaN)", formatPct(NaN), "—");
  eq('formatPct("")', formatPct(""), "—");
  eq("formatReturnPct(0)", formatReturnPct(0), "0.00%");
  eq("formatReturnPct(-3.456)", formatReturnPct(-3.456), "-3.46%");
  eq("formatReturnPct(null)", formatReturnPct(null), "—");
}

// ── 6 · isNegativeValue — color and text read the same source ────────────────
{
  console.log("\n6 · isNegativeValue · the sign test behind every color");
  check("isNegativeValue(-0) is true — this is the whole bug", isNegativeValue(-0) === true);
  check("isNegativeValue(0) is false", isNegativeValue(0) === false);
  check("isNegativeValue(-0.01) is true", isNegativeValue(-0.01) === true);
  check("isNegativeValue(NaN) is false — NaN is neutral, never red",
    isNegativeValue(NaN) === false);
}

// ── 7 · FIN-044 · the tooltip must not teach a LONG-only formula ─────────────
{
  console.log("\n7 · tooltips · R is direction-aware in all 5 languages");
  for (const key of ["avgR", "rMultiple"]) {
    for (const lang of LANGS) {
      const s = TRADING_TOOLTIPS[key]?.[lang];
      check(`${key}.${lang} names LONG and SHORT`,
        typeof s === "string" && s.includes("LONG") && s.includes("SHORT"));
    }
  }
  for (const lang of LANGS) {
    check(`avgR.${lang} still states that a stopless trade is excluded, not 0R`,
      /0R/.test(TRADING_TOOLTIPS.avgR?.[lang] ?? ""));
  }
}

// ── 8 · targeted grep guard on the sites this wave fixed ─────────────────────
//
// Deliberately NOT the blanket "no inline `$` formatting outside utils.js"
// assertion the audit asked for: it fails today on dozens of legitimate
// unsigned surfaces (capital, equity, price inputs) that are not P&L, and the
// only way to make it pass would be to silence it. A gate you have to silence
// is not a gate. See docs/DECISIONS.md 2026-08-02.
{
  console.log("\n8 · grep guard · the fixed sites stay fixed");
  const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
  const cal = read("src/components/TradeCalendar.jsx");
  check("TradeCalendar no longer strips the sign with Math.abs(pnl)",
    !cal.includes("Math.abs(pnl)"));
  check("TradeCalendar formats money through fmt$0", cal.includes("fmt$0("));
  const mr = read("src/components/MonthlyReportTab.jsx");
  check("MonthlyReportTab axes no longer build `$${v}` inline",
    !mr.includes("`$${v}`"));
  check("MonthlyReportTab formats money through fmt$0", mr.includes("fmt$0"));
  const dtm = read("src/components/DayTradesModal.jsx");
  check("DayTradesModal no longer coerces a missing P&L to 0",
    !dtm.includes("(pnl || 0)"));
  // The audit named only MonthlyReportTab, but five P&L axes in the root
  // component printed the same `$-900` — sign outside the currency.
  const app = read("SwingEdge_App.jsx");
  check("SwingEdge_App has no P&L axis building `$${v}` inline",
    !/tickFormatter=\{v\s*=>\s*`\$\$\{v\}`\}/.test(app));
}

// ── SUMMARY ──────────────────────────────────────────────────────────────────
console.log("");
if (failures) {
  console.error(`❌ format: ${failures} assertion(s) failed.`);
  process.exit(1);
}
console.log("✅ format: all assertions passed — the sign is in the text, an unmeasured value shows as —, and R is taught in both directions.");
