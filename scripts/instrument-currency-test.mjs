// test:instrument — מטבע נייר הערך מול מטבע החשבון (גל א', 2026-08-11).
//
// החוזה בשורה אחת: **מדידה נשמרת, הֶסֵּק לעולם לא נשמר** — ומטבע שלא נמדד
// אינו נכנס לחשבון כסף מצרפי גם כשהתווית השמורה נראית תקינה.
//
// שלוש מחלקות כשל שהקובץ הזה קיים כדי למנוע:
//
//   1. **שער טאוטולוגי.** שלושה שערי הגנה בלתי תלויים בדקו
//      `currencyOf(t) === capitalCurrency` — בדיקה שמסלול הכתיבה
//      (`SwingEdge_App.jsx:2457`, `currency: capitalCurrency`) הבטיח שתהיה
//      אמת. הגנה בשלוש שכבות שאף שכבה בה אינה יכולה לירות. הבלוקים 5–7
//      מריצים שלושה יומנים שבהם השער **חייב** לחסום, ושבהם הוא היום מעביר.
//
//   2. **ניחוש שמתחפש לגזירה.** נמדד 2026-08-11: טיקר מספרי חי ב-SSE/SZSE
//      (אג"ח סיניות) וב-MILSEDEX — `^\d+$ → ILS` היה מסמן אג"ח סינית
//      כישראלית באגורות. מספרי ⇒ `AMBIGUOUS`, ⛔ לא ILS.
//
//   3. **שמירת הנגזרת.** הגזירה רצה בזמן קריאה. דגל ב-DB היה מתיישן בשקט
//      ברגע שהספק מחזיר קוד — בלוק 9 מוודא שאין עמודה כזו.
//
// ⚠️ חוזה `capitalCurrency == null` נשמר byte-identical (בלוק 8): שני
// המנועים מדלגים על הסינון כשהוא חסר, אחרת יומן חד-מטבעי משנה התנהגות.
//
// Pure Node, ⛔ אפס רשת, ⛔ אפס DB. הרצה: `node scripts/instrument-currency-test.mjs`.

import { readFileSync } from "node:fs";
import {
  INSTRUMENT_STATE, deriveInstrumentCurrency, normalizeProviderCurrency,
  normalizeTicker, pairQuoteCurrency, isAggregatable, isUnverified,
  isMixedCurrency, matchesCapital,
} from "../src/lib/instrumentCurrency.js";
import { computeTradingStats } from "../src/lib/tradingStats.js";
import { calcTradeMetrics } from "../src/utils.js";
import { calculateTradeDNA } from "../src/intelligence/core/TradeDNA.js";
import { calculateGrowthScore } from "../src/intelligence/core/GrowthTracker.js";

// ⚠️ `total` נספר ולא נכתב ביד — המספר ב-CLAUDE.md §7 חייב מכנה שנמדד.
let failures = 0;
let total = 0;
const check = (name, cond) => {
  total++;
  if (cond) console.log(`  ✓ ${name}`);
  else { failures++; console.error(`  ✗ ${name}`); }
};
const eq = (name, actual, expected) =>
  check(`${name} → ${JSON.stringify(expected)} (got ${JSON.stringify(actual)})`,
        Object.is(actual, expected));

const { MEASURED, ASSUMED, CONTRADICTED, AMBIGUOUS } = INSTRUMENT_STATE;
const src = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");

// עסקה סגורה עם סיכון של 2% מההון — הבחירה מכוונת: `inferStyle` ממפה
// avgRisk/0.02 ל-aggression, כך ש-2% = 100 ואוכלוסייה ריקה = 50 (ברירת
// המחדל 0.01). ⚠️ פער של 50 נקודות הוא מה שנותן לאסרציות 5–7 שיניים.
const closedAt2pct = (id, ticker, currency) => ({
  id, ticker, currency, side: "LONG", status: "CLOSED",
  entry: 100, stop: 90, exit: 110, shares: 5, _capitalAtEntry: 2500,
  date: "2026-07-01", closedAt: "2026-07-05T14:00:00.000Z",
  setup: "Breakout", emotionAtEntry: "Confident", followedPlan: true,
});
const journalOf = (tickers, currency) =>
  tickers.map((tk, i) => closedAt2pct(`t${i}`, tk, currency));
const aggressionOf = (trades, capitalCurrency) =>
  calculateTradeDNA(trades, capitalCurrency).style.aggression;

// ── 1 · נרמול קוד הספק — רשימה סגורה, ⛔ אין ברירת מחדל ─────────────────────
{
  console.log("\n1 · normalizeProviderCurrency — רשימה סגורה");
  eq("ILA → ILS (אגורה)", normalizeProviderCurrency("ILA")?.code, "ILS");
  eq("ILA → minorUnit 100 — עובדת האגורות מגיעה מהספק",
     normalizeProviderCurrency("ILA")?.minorUnit, 100);
  eq("USD → USD", normalizeProviderCurrency("USD")?.code, "USD");
  eq("USD → minorUnit 1", normalizeProviderCurrency("USD")?.minorUnit, 1);
  eq("ILS → ILS", normalizeProviderCurrency("ILS")?.code, "ILS");
  eq("  ila  → ILS — trim + uppercase", normalizeProviderCurrency("  ila  ")?.code, "ILS");
  for (const bad of [null, undefined, "", "   ", 42, {}, "EUR", "GBP", "USDT"]) {
    eq(`⛔ ${JSON.stringify(bad)} → null, לא USD`, normalizeProviderCurrency(bad), null);
  }
}

// ── 2 · נרמול טיקר — `"ASTS  "` יושב ב-DB כשורה נפרדת ────────────────────────
// נמדד 2026-08-11: 36 טיקרים גולמיים מול 35 אחרי trim, שורה אחת עם רווחים.
// הגזירה חייבת לנרמל **בקריאה** כדי שהשורה ההיא לא תישאר יתומה.
{
  console.log("\n2 · normalizeTicker — trim בקריאה");
  eq('"ASTS  " → "ASTS"', normalizeTicker("ASTS  "), "ASTS");
  eq('"  asts" → "ASTS"', normalizeTicker("  asts"), "ASTS");
  eq("⛔ לא-מחרוזת → \"\"", normalizeTicker(null), "");
  check('"ASTS  " ו-"ASTS" נגזרים זהה — אין שורה יתומה',
    deriveInstrumentCurrency({ ticker: "ASTS  " }).state ===
    deriveInstrumentCurrency({ ticker: "ASTS" }).state);
}

// ── 3 · סולם הראיות ─────────────────────────────────────────────────────────
{
  console.log("\n3 · סולם הראיות — עצירה בהתאמה ראשונה");

  const measured = deriveInstrumentCurrency({ ticker: "TEVA", currency: "ILS", instrumentCurrency: "ILA" });
  eq("קוד ספק גובר על trade.currency — state", measured.state, MEASURED);
  eq("קוד ספק גובר — code", measured.code, "ILS");
  eq("קוד ספק גובר — minorUnit", measured.minorUnit, 100);
  eq("קוד ספק דרך opts", deriveInstrumentCurrency({ ticker: "AAPL" }, { providerCurrency: "ILA" }).state, MEASURED);

  for (const numeric of ["1081843", "440016", "587014", "691212"]) {
    const d = deriveInstrumentCurrency({ ticker: numeric, currency: "USD" });
    eq(`${numeric} → AMBIGUOUS ⛔ לא ILS`, d.state, AMBIGUOUS);
    eq(`${numeric} → code null ⛔ לא ניחוש`, d.code, null);
  }

  for (const pair of ["BTCUSD", "BTC-USD", "ETH/USD", "SOLUSD"]) {
    const d = deriveInstrumentCurrency({ ticker: pair });
    eq(`${pair} → MEASURED (המטבע בשם המכשיר)`, d.state, MEASURED);
    eq(`${pair} → USD`, d.code, "USD");
  }
  eq("⛔ BTC לבדו אינו זוג", pairQuoteCurrency("BTC"), null);
  eq("⛔ USD לבדו אינו זוג — הבסיס ריק", pairQuoteCurrency("USD"), null);
  eq("⛔ BE אינו זוג — בסיס קצר מ-3", pairQuoteCurrency("BE"), null);
  eq("⛔ USDT אינו USD — סטייבלקוין אינו דולר", pairQuoteCurrency("BTCUSDT"), null);

  eq("אלפביתי + תווית ILS → CONTRADICTED (ILS מעולם לא נמדד, 0/61)",
     deriveInstrumentCurrency({ ticker: "BE", currency: "ILS" }).state, CONTRADICTED);
  eq("CONTRADICTED → code null", deriveInstrumentCurrency({ ticker: "BE", currency: "ILS" }).code, null);
  eq("אלפביתי + תווית USD → ASSUMED",
     deriveInstrumentCurrency({ ticker: "AAPL", currency: "USD" }).state, ASSUMED);
  eq("ASSUMED → USD, וההנחה מוצהרת בממשק",
     deriveInstrumentCurrency({ ticker: "AAPL", currency: "USD" }).code, "USD");
  eq("ללא טיקר → AMBIGUOUS", deriveInstrumentCurrency({ currency: "USD" }).state, AMBIGUOUS);
  eq("טיקר לא מוכר → AMBIGUOUS", deriveInstrumentCurrency({ ticker: "1COV.DE" }).state, AMBIGUOUS);
}

// ── 4 · מי נכנס למצרפי, ומתי הקבוצה אינה מוכחת חד-מטבעית ────────────────────
{
  console.log("\n4 · isAggregatable · isMixedCurrency");
  const d = (t) => deriveInstrumentCurrency(t);
  check("MEASURED נכנס", isAggregatable(d({ ticker: "BTCUSD" })));
  check("ASSUMED נכנס — השער הוא 'האם הקבוצה מוכחת חד-מטבעית'",
    isAggregatable(d({ ticker: "AAPL", currency: "USD" })));
  check("⛔ CONTRADICTED אינו נכנס", isUnverified(d({ ticker: "BE", currency: "ILS" })));
  check("⛔ AMBIGUOUS אינו נכנס", isUnverified(d({ ticker: "1081843" })));

  check("קבוצה דולרית נקייה אינה מעורבת",
    isMixedCurrency([d({ ticker: "AAPL" }), d({ ticker: "MSFT" })]) === false);
  check("שני קודים ⇒ מעורבת",
    isMixedCurrency([d({ ticker: "AAPL" }), d({ ticker: "TEVA", instrumentCurrency: "ILA" })]));
  check("⚠️ קבוצה שיש בה CONTRADICTED אינה מוכחת חד-מטבעית ⇒ הבאנר נדלק",
    isMixedCurrency([d({ ticker: "AAPL" }), d({ ticker: "BE", currency: "ILS" })]));
  check("⚠️ קבוצה שיש בה AMBIGUOUS אינה מוכחת חד-מטבעית ⇒ הבאנר נדלק",
    isMixedCurrency([d({ ticker: "AAPL" }), d({ ticker: "1081843" })]));
  check("⛔ 'לא ידוע' אינו 'כמו כולם'", isMixedCurrency([d({ ticker: "1081843" })]));

  check("matchesCapital — MEASURED USD מול הון ILS נחסם",
    matchesCapital(d({ ticker: "BTCUSD" }), "ILS") === false);
  check("matchesCapital — CONTRADICTED נחסם גם כשהתווית שווה להון",
    matchesCapital(d({ ticker: "BE", currency: "ILS" }), "ILS") === false);
  check("matchesCapital — ASSUMED USD מול הון USD עובר",
    matchesCapital(d({ ticker: "AAPL" }), "USD"));
}

// ── 5 · ⚠️ הבאנר על היומן המעורב האמיתי ─────────────────────────────────────
// 13 ניירות ת"א (טיקר מספרי, מתויגים USD) + 2 אמריקאיים. כל 15 נושאים USD,
// ולכן `currencies.length === 1` ⇒ `mixedCurrency === false`. זה הבאג.
{
  console.log("\n5 · הבאנר — 13 ת\"א + 2 אמריקאיות");
  const TASE = ["1081843", "440016", "587014", "691212", "1081843", "440016",
                "587014", "691212", "1081843", "440016", "587014", "691212", "1081843"];
  const mixed = journalOf([...TASE, "AAPL", "MSFT"], "USD");
  eq("היומן הוא 15 שורות — 13 ת\"א + 2 אמריקאיות", mixed.length, 15);
  const s = computeTradingStats(mixed, 40_000, calcTradeMetrics);
  check("⚠️ mixedCurrency נדלק — 15 תוויות USD אינן 15 מדידות USD", s.mixedCurrency === true);
  // ⚠️ כל שורה כאן מרוויחה 50. `["USD"]` לבדו אינו מבדיל — הוא נכון גם היום,
  // כשכל 15 נספרות תחת USD. המכנה הוא מה שמבדיל: 2 שורות × 50, ⛔ לא 15.
  check("pnlByCurrency ממופתח בקוד הנגזר — רק 2 השורות המאומתות תורמות",
    JSON.stringify(s.currencies) === JSON.stringify(["USD"]) && s.pnlByCurrency.USD === 100);

  const clean = journalOf(["AAPL", "MSFT"], "USD");
  check("⛔ יומן דולרי נקי אינו מדליק את הבאנר — לאסרציה יש שיניים",
    computeTradingStats(clean, 40_000, calcTradeMetrics).mixedCurrency === false);
}

// ── 6 · ⚠️ השער יכול להיכשל ─────────────────────────────────────────────────
// שלושה יומנים שבהם `currencyOf(t) === capitalCurrency` **אמת** ולכן השער
// הישן מעביר — ובכל אחד מהם המטבע הנגזר של הנייר שונה מההון.
{
  console.log("\n6 · השער יכול להיכשל — DNA");

  const contradicted = journalOf(["BE", "TEVA", "ICL"], "ILS");
  eq("⚠️ תווית ILS על טיקר אלפביתי — נחסמת מול הון ILS למרות שהתווית תואמת",
     aggressionOf(contradicted, "ILS"), 50);
  eq("⛔ אותו יומן מול הון USD — נחסם גם כן, ואינו 100",
     aggressionOf(contradicted, "USD"), 50);

  const crypto = journalOf(["BTCUSD", "ETHUSD"], "ILS");
  eq("⚠️ נייר MEASURED USD מול הון ILS נחסם — הקוד הנמדד גובר על התווית",
     aggressionOf(crypto, "ILS"), 50);
  eq("⛔ אותו יומן מול הון USD עובר — לאסרציה יש שיניים",
     aggressionOf(crypto, "USD"), 100);
}

// ── 7 · ⚠️ 13 השורות המספריות מוחרגות מהסיכון המצרפי ────────────────────────
{
  console.log("\n7 · 13 השורות המספריות מוחרגות");
  const tase = journalOf(["1081843", "440016", "587014", "691212"], "USD");
  eq("⚠️ טיקר מספרי מתויג USD מול הון USD — מוחרג, ⛔ לא נספר כדולרי",
     aggressionOf(tase, "USD"), 50);
  eq("⛔ אותם ניירות עם טיקר אלפביתי נספרים — לאסרציה יש שיניים",
     aggressionOf(journalOf(["AAPL", "MSFT", "NVDA", "AMD"], "USD"), "USD"), 100);

  // ⚠️ `riskMgmtScore` ממפה 1% ל-100 ו-2% ל-50, ואוכלוסייה ריקה גם היא ל-50 —
  // פיקסצ'ר של 2% היה מייצר 50=50 ואסרציה שאינה יכולה להיכשל. לכן 1%.
  const at1pct = (tickers) => journalOf(tickers, "USD").map(t => ({ ...t, stop: 95 }));
  const gs = (trades, cc) => calculateGrowthScore(trades, null, cc).sub.riskManagement;
  eq("GrowthTracker — טיקר מספרי מוחרג ⇒ אוכלוסייה ריקה",
     gs(at1pct(["1081843", "440016"]), "USD"), 50);
  eq("GrowthTracker — ⛔ אלפביתי נספר, לאסרציה יש שיניים",
     gs(at1pct(["AAPL", "MSFT"]), "USD"), 100);
}

// ── 8 · חוזה `capitalCurrency == null` — byte-identical ─────────────────────
// ⚠️ הסינון מופעל רק כשההון ידוע. אחרת יומן חד-מטבעי היה משנה התנהגות
// למי שלא בחר מטבע מעולם, וזה בדיוק מה שהגל הזה בא למנוע.
{
  console.log("\n8 · חוזה capitalCurrency == null נשמר");
  eq("יומן מספרי, הון לא ידוע → אין סינון", aggressionOf(journalOf(["1081843", "440016"], "USD"), null), 100);
  eq("יומן ILS, הון לא ידוע → אין סינון", aggressionOf(journalOf(["BE", "TEVA"], "ILS"), null), 100);
}

// ── 9 · טוהר המודול, ואי-שמירה של הנגזרת ────────────────────────────────────
{
  console.log("\n9 · טוהר · הנגזרת אינה נשמרת");
  const mod = src("../src/lib/instrumentCurrency.js");
  check("⛔ אפס ייבוא React", !/from\s+["']react["']/.test(mod));
  check("⛔ אפס גישה ל-supabase", !/supabase/i.test(mod.replace(/^\s*\/\/.*$/gm, "")));
  check("⛔ אפס רשת", !/\bfetch\s*\(|axios/.test(mod));
  check("⛔ אפס כתיבה", !/\.(insert|update|upsert)\s*\(/.test(mod));

  const cols = src("../src/supabaseClient.js");
  const colBlock = cols.slice(cols.indexOf("TRADE_COLUMNS"), cols.indexOf("LOCAL_ONLY"));
  for (const derivedField of ["instrumentState", "derivedCurrency", "minorUnit", "unverified"]) {
    check(`⛔ '${derivedField}' אינו עמודה — מספר שנגזר לא מתיישן`,
      !new RegExp(`"${derivedField}"`).test(colBlock));
  }
}

// ── 10 · שלושת השערים והבאנר עוברים דרך המודול ──────────────────────────────
{
  console.log("\n10 · אתרי הצריכה");
  const app   = src("../SwingEdge_App.jsx");
  const stats = src("../src/lib/tradingStats.js");
  const dna   = src("../src/intelligence/core/TradeDNA.js");
  const gt    = src("../src/intelligence/core/GrowthTracker.js");

  for (const [name, txt] of [["SwingEdge_App", app], ["tradingStats", stats],
                             ["TradeDNA", dna], ["GrowthTracker", gt]]) {
    check(`${name} מייבא את instrumentCurrency`, /instrumentCurrency/.test(txt));
    check(`⛔ ${name} — אין השוואה טאוטולוגית currencyOf(t) === capitalCurrency`,
      !/currencyOf\(\s*[a-z]\s*\)\s*===\s*capitalCurrency/.test(txt));
  }

  const pnlBlock = stats.slice(stats.indexOf("const pnlByCurrency"),
                               stats.indexOf("const currencies"));
  check("pnlByCurrency אינו ממופתח ב-currencyOf", !/currencyOf/.test(pnlBlock));
}

// ── 11 · שני ממצאי §11 מהאבחון ──────────────────────────────────────────────
{
  console.log("\n11 · ממצאי הסריקה הסביבתית");
  const app = src("../SwingEdge_App.jsx");

  // א. `:2419` שומר על `form.ticker.trim()` אך `:2445` כותב ללא trim — ככה
  //    נולדה השורה `"ASTS  "` שיושבת ב-DB בנפרד מ-`"ASTS"`.
  check("מסלול הכתיבה עושה trim לטיקר — ⛔ אחרת נולדת שורה יתומה נוספת",
    /ticker:\s*form\.ticker\.trim\(\)\.toUpperCase\(\)/.test(app));
  check("⛔ אין ticker: form.ticker.toUpperCase() ללא trim",
    !/ticker:\s*form\.ticker\.toUpperCase\(\)/.test(app));

  // ב. מחיר הציטוט בטופס הודפס עם `$` קשיח — אותו באג בדיוק שהערת
  //    `utils.js:129` מתעדת ("a hard-coded $ in JSX").
  check("⛔ מחיר הציטוט בטופס אינו מודפס עם $ קשיח",
    !/\$\{?\s*\}?\{q\.price\.toFixed\(2\)\}/.test(app) &&
    !/>\$\{q\.price\.toFixed\(2\)\}</.test(app));
}

// ── 12 · ההצהרה בממשק — מה שלא נמדד חייב להיאמר, ⛔ לא להיבלע ───────────────
{
  console.log("\n12 · שכבת התצוגה");
  const app  = src("../SwingEdge_App.jsx");
  const card = src("../src/components/MobileTradeCard.jsx");
  const i18n = src("../src/i18n.js");

  // א. חמש השפות. `plural` נופל fail-open לאנגלית, ולכן מפתח חסר אינו צועק.
  for (const key of ["riskUnverifiedCcy", "riskUnverifiedCcy_one",
                     "ccyUnverifiedChip", "ccyUnverifiedTip", "ccyAssumedNote"]) {
    const n = (i18n.match(new RegExp(`^\\s*${key}:`, "gm")) || []).length;
    eq(`i18n '${key}' מוגדר ב-5 שפות`, n, 5);
  }

  // ב. שתי סיבות החרגה שונות — סטופ חסר ומטבע לא מאומת — ⛔ לא תחת תווית אחת.
  //    ספירה מאוחדת מדווחת "אין סטופ" על עסקה שיש לה סטופ.
  check("לוח הסיכון מפריד מטבע-לא-מאומת מסטופ-חסר",
    /const unverifiedCcyCount = /.test(app) && /const noStopCount = /.test(app));
  check("שתי הסיבות מוצגות בנפרד",
    /plural\(t, "riskUnverifiedCcy", unverifiedCcyCount\)/.test(app) &&
    /plural\(t, "riskUnmeasured", noStopCount\)/.test(app));
  check("ההנחה מוצהרת — ASSUMED שנספר נאמר בממשק",
    /INSTRUMENT_STATE\.ASSUMED/.test(app) && /plural\(t, "ccyAssumedNote", assumedCount\)/.test(app));

  // ג. השורה מוצגת מסומנת בשני מסלולי הרינדור — ⛔ לא נמחקת ולא מוסתרת.
  check("דסקטופ — צ'יפ מטבע לא מאומת בשורת היומן", /<UnverifiedCcyChip\s/.test(app));
  check("מובייל — אותו סימון בכרטיס",
    /ccyUnverifiedChip/.test(card) &&
    /isUnverified\(deriveInstrumentCurrency\(trade\)\)/.test(card));
}

// ── SUMMARY ──────────────────────────────────────────────────────────────────
console.log("");
if (failures) {
  console.error(`❌ instrument: ${failures}/${total} assertion(s) failed.`);
  process.exit(1);
}
console.log(`✅ instrument: ${total}/${total} assertions passed — מדידה נשמרת, הסק לא נשמר, והשער יכול להיכשל.`);
