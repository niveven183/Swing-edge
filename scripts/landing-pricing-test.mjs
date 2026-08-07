// scripts/landing-pricing-test.mjs — one currency on screen, and the four ways
// the landing price can rot.
//
// WHY THIS EXISTS. The pricing section shipped with the price living *inside the
// language dictionary*: STR.he.freePrice was "0₪" while STR.he.proPrice was
// "$5". Two currencies, one screen, on the first thing any visitor sees. That is
// not a typo — it is what the structure permitted. As long as "price" is a field
// of "language", nothing stops one branch from drifting into another currency,
// and nothing announces it when it does.
//
// The fix moves price OFF the language axis into a single PRICES table keyed by
// currency. Both cards read the same key, so a mixed-currency section stops
// being merely forbidden and becomes inexpressible. These assertions defend that
// property — and the numbers themselves, which were decided 2026-08-08:
// Pro = $8/month · 25₪/month, fixed, NOT pegged to the exchange rate.
//
// STALE PRICE (1). The old $5 must not survive anywhere in the file. This is the
// assertion that would have caught the original bug, and it is the one that will
// catch the next price change that updates one branch and forgets the other.
//
// STRUCTURE (2, 5). 2 asserts the PRICES table exists; 5 asserts the language
// dictionaries no longer carry a price field at all. 5 is the structural one: if
// a price field ever returns to STR.he/STR.en, the 08.08 bug is back in waiting,
// even if every number currently displayed happens to be right.
//
// PURITY OF EACH CURRENCY (3, 4). Each branch must carry its own symbol in its
// own convention — Hebrew suffix ("25₪"), dollar prefix ("$8") — and must not
// carry the other currency's symbol. 3 is what fails on a mixed table.
//
// DEFAULT (6, 7). Currency defaults from language (he→ils, en→usd). Language is
// the only proxy used: no geo lookup, no rate fetch, no persistence — 25₪ is a
// fixed price by decision, not a converted one. 7 is scoped to the currency
// lines for persistence and query params, because URLSearchParams is already
// used legitimately at :506 to capture utm_source on mount.
//
// ⚠️ NO COMPONENT TEST INFRA. vitest/jest/jsdom/testing-library are all absent
// from package.json; every test in `verify` is plain `node scripts/*.mjs`.
// Running JSX under node needs a transformer — a new dependency, out of scope.
// So these are STATIC assertions over the source text, the same approach
// ocr-contract-test, notify-handle-test, rContract-test and import-test already
// take. They prove the numbers are correct, single, and structurally unmixable.
// They do NOT prove the toggle renders correctly in a browser — that is a
// separate manual check, and this file does not claim otherwise.

import { readFileSync } from "node:fs";

const PATH = "src/components/LandingPage.jsx";
const src = readFileSync(PATH, "utf8");

const failures = [];
const vacuous = [];
let ran = 0;

function check(id, title, cond, detail, { vacuousOnOldCode = false } = {}) {
  ran++;
  if (vacuousOnOldCode) vacuous.push(id);
  if (cond) {
    console.log(`✅ ${id} — ${title}${vacuousOnOldCode ? "  ⚠️ passes vacuously on the pre-fix code" : ""}`);
  } else {
    failures.push(id);
    console.error(`❌ ${id} — ${title}`);
    console.error(`   ${detail}`);
  }
}

// The PRICES table, extracted once so 2/3/4 assert against the real block and
// not against a symbol that happens to appear elsewhere in 1100 lines of JSX.
const priceBlock = src.match(/const PRICES\s*=\s*\{[\s\S]*?\n\};/);
const ilsBranch = priceBlock?.[0].match(/ils:\s*\{[^}]*\}/)?.[0] ?? "";
const usdBranch = priceBlock?.[0].match(/usd:\s*\{[^}]*\}/)?.[0] ?? "";

console.log(`\nlanding pricing — static assertions over ${PATH}\n`);

// ── 1 ── the retired price is gone ──────────────────────────────────────────
{
  const hits = [...src.matchAll(/\$5\b/g)].length;
  check(
    "1",
    'the retired "$5" appears nowhere in the file',
    hits === 0,
    `found ${hits} occurrence(s) of "$5". The 08.08 decision is $8; a surviving $5 means ` +
      `one branch was updated and another was not — which is the exact shape of the bug ` +
      `this section already had`
  );
}

// ── 2 ── the table exists ───────────────────────────────────────────────────
{
  check(
    "2",
    "a single PRICES table exists, keyed by currency (ils, usd)",
    Boolean(priceBlock) && ilsBranch !== "" && usdBranch !== "",
    `PRICES block ${priceBlock ? "found" : "NOT found"}; ils branch ${ilsBranch ? "ok" : "missing"}; ` +
      `usd branch ${usdBranch ? "ok" : "missing"}. Without one table keyed by currency, the two ` +
      `cards read from two places and can disagree`
  );
}

// ── 3 ── the shekel branch is pure, and in Hebrew convention ────────────────
{
  const ok = /"0₪"/.test(ilsBranch) && /"25₪"/.test(ilsBranch) && !ilsBranch.includes("$");
  check(
    "3",
    'ils = "0₪" + "25₪" (suffix), and carries no "$"',
    ok,
    `ils branch = ${JSON.stringify(ilsBranch)}. A "$" inside the shekel branch is the mixed-currency ` +
      `section reappearing one level down — the visitor sees one toggle state, two currencies`
  );
}

// ── 4 ── the dollar branch is pure, and in dollar convention ────────────────
{
  const ok = /"\$0"/.test(usdBranch) && /"\$8"/.test(usdBranch) && !usdBranch.includes("₪");
  check(
    "4",
    'usd = "$0" + "$8" (prefix), and carries no "₪"',
    ok,
    `usd branch = ${JSON.stringify(usdBranch)}. Expected the 08.08 price of $8`
  );
}

// ── 5 ── price is no longer a field of language ─────────────────────────────
{
  const hits = [...src.matchAll(/\b(freePrice|proPrice)\s*:/g)].length;
  check(
    "5",
    "the he/en dictionaries carry no price field",
    hits === 0,
    `found ${hits} price field(s) still declared on a language dictionary. This is the structural ` +
      `assertion: while price is a property of language, a currency can drift into the wrong ` +
      `language branch silently — which is exactly what shipped on 06.08`
  );
}

// ── 6 ── the default is derived from language, and from nothing else ────────
{
  const ok = /useState\(\s*lang\s*===\s*"he"\s*\?\s*"ils"\s*:\s*"usd"\s*\)/.test(src);
  check(
    "6",
    'currency defaults from language (he→ils, en→usd)',
    ok,
    `no language-derived currency default found. Expected useState(lang === "he" ? "ils" : "usd")`
  );
}

// ── 7 ── no persistence, no geo, no rate fetch on the currency path ─────────
{
  // Scoped to the currency path on purpose. URLSearchParams DOES appear in this
  // file (:506) and legitimately so — WaitlistForm captures utm_source once on
  // mount. A file-wide ban would fail for a reason it does not name, and the
  // obvious way to "fix" it would be to delete the UTM capture. So persistence
  // and query params are asserted against the currency lines only.
  const currencyPath = src
    .split("\n")
    .filter((l) => /\bccy\b|setCcy|PRICES/.test(l))
    .join("\n");
  const scoped = [
    ["localStorage", /localStorage/],
    ["sessionStorage", /sessionStorage/],
    ["query param", /searchParams|URLSearchParams/],
  ].filter(([, re]) => re.test(currencyPath)).map(([n]) => n);
  // Geo and live-rate providers have no legitimate use anywhere on this page,
  // so those stay file-wide.
  const global = [
    ["geo/IP lookup", /\bgeoip\b|\bgeolocation\b|ipapi|ipinfo/i],
    ["live FX provider", /exchangerate|openexchange|fixer\.io|currencyapi/i],
  ].filter(([, re]) => re.test(src)).map(([n]) => n);
  const found = [...scoped, ...global];
  check(
    "7",
    "currency path: no persistence / query param; page: no geo, no live FX",
    found.length === 0,
    `found: ${found.join(", ")}. The price is fixed by decision (08.08) — 25₪ is NOT pegged. ` +
      `A rate fetch or geo lookup reintroduces a moving number and a failure mode with no owner`,
    { vacuousOnOldCode: true }
  );
}

const passed = ran - failures.length;
console.log(`\n${passed}/${ran} assertions passed  (population: static checks over ${PATH})`);
if (vacuous.length) {
  console.log(
    `⚠️ ${vacuous.length}/${ran} pass vacuously on the pre-fix code (${vacuous.join(", ")}) — ` +
      `guard-rails against future regression, they cannot fail on code that has no currency ` +
      `switching at all. ${ran - vacuous.length}/${ran} are the separating assertions.`
  );
}
if (failures.length) {
  console.error(`FAILED: ${failures.join(", ")}`);
  process.exit(1);
}
