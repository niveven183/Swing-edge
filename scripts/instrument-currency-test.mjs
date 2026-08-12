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
  isMixedCurrency, matchesCapital, PAPER_BASE,
} from "../src/lib/instrumentCurrency.js";
import { computeTradingStats } from "../src/lib/tradingStats.js";
import { calcTradeMetrics, fmtPaperPrice, paperCurrencyOf, fmt$, currencyOf } from "../src/utils.js";
import { sizePosition } from "../src/lib/positionSizing.js";
// ⚠️ הכלל הזה נצרך כאן **ובקומפוננטה** מאותו מקום — ⛔ אין העתקה מקבילה.
import { fxPairPlan } from "../src/hooks/useFxRates.js";
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

// ── 13 · המרה בנקודת החישוב — אסרציות **ערך** ────────────────────────────────
//
// 🔴 הבלוק הזה קיים מפני שהגל הקודם עבר 105 אסרציות בעוד המסך הראה מספר שגוי.
// כולן היו אסרציות **מקור** (regex על הקוד), ואסרציית מקור ⛔ אינה יכולה לתפוס
// מספר שגוי. הראיה החיה: `:308` בדקה `/<UnverifiedCcyChip\s/` ועברה לאורך כל
// הגל בעוד הענף היה בלתי-נגיש מבנית.
//
// ⇒ כאן: **ערך בלבד**, למעט שתי אסרציות מקור מוצהרות (13.7ב, 13.8ב), וכל אחת
// מהן צמודה לאסרציית ערך שמוכיחה שהענף נגיש.
{
  console.log("\n13 · המרה בנקודת החישוב");
  const app  = src("../SwingEdge_App.jsx");
  const card = src("../src/components/MobileTradeCard.jsx");

  // שער ECB שנמדד 2026-08-11. AAPL 304.51/250 — נייר דולרי, הון שקלי.
  const RATE = 2.9992;
  const sz = (capital, extra = {}) =>
    sizePosition({ entry: "304.51", stop: "250", capital, riskPct: 1, rate: RATE, ...extra });
  const r2 = (n) => Math.round(n * 100) / 100;

  // ── 13.1 תרחיש א' — הון ₪2,500. הגודל זהה, ה**סיכון המוצג** משקר פי 3 ────
  console.log("  13.1 · הון ₪2,500");
  const a = sz(2500);
  eq("1 מניה (רצפת המניה הבודדת)", a.effShares, 1);
  eq("🔴 סיכון אמיתי 6.54% ⛔ ולא 2.18% שהמסך מראה", r2(a.effRiskPct), 6.54);
  eq("🔴 שווי פוזיציה ₪913.29 ⛔ ולא ₪304.51", r2(a.effPosValue), 913.29);
  eq("🔴 סיכון מרבי ₪163.49 ⛔ ולא ₪54.51", r2(a.effPotLoss), 163.49);

  // ── 13.2 תרחיש ב' — הון ₪25,000. כאן הטעות היא ב**גודל הפוזיציה** עצמו ───
  console.log("  13.2 · הון ₪25,000 — הטעות בגודל");
  const b = sz(25000);
  eq("🔴 1 מניה ⛔ ולא 4 — פי 4 חשיפה", b.effShares, 1);
  eq("סיכון 0.65% ⛔ ולא 0.87%", r2(b.effRiskPct), 0.65);
  eq("שווי פוזיציה ₪913.29 ⛔ ולא ₪1,218.04", r2(b.effPosValue), 913.29);

  // ⚠️ הכיוון הוא מה שהופך את זה לבאג כסף ולא לבאג תצוגה: המכנה קטן פי ~3
  //    ⇒ הפוזיציה יוצאת **גדולה** פי ~3. טעות תמיד לכיוון של יותר חשיפה.
  check("🔴 הטעות תמיד לכיוון יותר חשיפה — הגודל הלא-מומר גדול מהמומר",
    sizePosition({ entry: "304.51", stop: "250", capital: 25000, riskPct: 1, rate: 1 }).effShares >
    b.effShares);

  // ── 13.3 זהות — 43/46 המשתמשים הדולריים ⛔ byte-identical ─────────────────
  console.log("  13.3 · זהות (43/46 משתמשים)");
  {
    let drift = 0, cmp = 0;
    for (const entry of ["304.51", "150", "0.3", "73.61", "0.1"])
      for (const stop of ["250", "149", "0.2", "70"])
        for (const capital of [2500, 25000, 0, 100000])
          for (const riskPct of [1, 2, 0.5]) {
            const withRate = sizePosition({ entry, stop, capital, riskPct, rate: 1 });
            const noRate   = sizePosition({ entry, stop, capital, riskPct });
            for (const k of Object.keys(noRate)) {
              cmp++;
              if (!Object.is(withRate[k], noRate[k])) drift++;
            }
          }
    check(`שער 1 ≡ ללא שער — ${cmp} השוואות שדה, 0 סטיות (נמדד ${drift})`, drift === 0);
    // ⚠️ 0.1+0.2 — ההוכחה שאין כאן כפל-בשער מוסווה
    eq("⛔ אפס נדידת נקודה צפה: 0.3−0.1 בשער 1",
      sizePosition({ entry: "0.30000000000000004", stop: "0.1", capital: 2500, riskPct: 1, rate: 1 }).riskPerShare,
      Math.abs(0.30000000000000004 - 0.1));
  }

  // ── 13.4 אין שער ⇒ סירוב מוצהר. ⛔ אפס `|| 1` ────────────────────────────
  console.log("  13.4 · אין שער ⇒ סירוב");
  {
    const no = sizePosition({ entry: "304.51", stop: "250", capital: 2500, riskPct: 1, rate: null });
    eq("`ok` שקר", no.ok, false);
    eq("סיבה מוצהרת", no.reason, "no_rate");
    eq("⛔ גודל פוזיציה null — ⛔ לא 0 ולא ניחוש", no.effShares, null);
    eq("⛔ אחוז סיכון null", no.effRiskPct, null);
    // ⚠️ אילו היה `|| 1` בקוד, השורה הבאה הייתה מחזירה את מספר ה"זהות".
    check("⛔ אין נפילה שקטה לשער 1",
      no.effShares !== sizePosition({ entry: "304.51", stop: "250", capital: 2500, riskPct: 1, rate: 1 }).effShares);
  }

  // ── 13.5 מטבע לא-מאומת ⇒ סירוב מוצהר (⛔ לא ניחוש, ⛔ לא השמטה) ──────────
  console.log("  13.5 · מטבע לא-מאומת ⇒ סירוב");
  {
    const be = { ticker: "BE", currency: "ILS" };            // CONTRADICTED
    eq("שורת BE נגזרת כלא-מאומתת", isUnverified(deriveInstrumentCurrency(be)), true);
    eq("⛔ אין קוד מטבע לנייר לא-מאומת", paperCurrencyOf(be), null);
    // הקורא הוא שיודע **למה** אין שער — נייר לא-מאומת ⛔ אינו "אין שער".
    const ref = sizePosition({ entry: "304.51", stop: "250", capital: 2500, riskPct: 1,
                               rate: null, refusalReason: "unverified_currency" });
    eq("סירוב בגלל מטבע לא-מאומת נבדל מ'אין שער'", ref.reason, "unverified_currency");
    eq("⛔ אין גודל פוזיציה למטבע לא-מאומת", ref.effShares, null);
  }

  // ── 13.6 תצוגת מחיר-נייר — הקורא הנפרד ───────────────────────────────────
  console.log("  13.6 · fmtPaperPrice");
  eq("🔴 AAPL בתווית ILS ⇒ **בלי סמל** ⛔ לא ₪304.51",
    fmtPaperPrice(304.51, { ticker: "AAPL", currency: "ILS" }), "304.51");
  eq("נייר דולרי ⇒ זהה לחלוטין להיום",
    fmtPaperPrice(304.51, { ticker: "AAPL", currency: "USD" }), "$304.51");
  eq("⛔ אין נפילה לסמל ברירת-מחדל בנייר לא-מאומת",
    fmtPaperPrice(73.61, { ticker: "1101", currency: "ILS" }), "73.61");

  // ── 13.7 השבב — ערך + **אסרציית מקור מוצהרת #1** ─────────────────────────
  console.log("  13.7 · השבב הבלתי-נגיש");
  // ערך: הענף נגיש רק כשמועברת עסקה שלמה. זו ההוכחה שהמקור למטה אינו ריק.
  eq("🔴 עסקה שלמה ⇒ השבב נדלק", isUnverified(deriveInstrumentCurrency({ ticker: "BE", currency: "ILS" })), true);
  eq("🔴 `{ticker}` בלבד ⇒ השבב **מת** — זה הבאג", isUnverified(deriveInstrumentCurrency({ ticker: "BE" })), false);
  // מקור מוצהר #1 — שהשבב אכן מקבל עסקה שלמה בדסקטופ.
  check("[מקור #1] `<UnverifiedCcyChip` מקבל `trade=`", /<UnverifiedCcyChip[^>]*\strade=\{/.test(app));

  // ── 13.8 הקורא החדש מחווט — ערך + **אסרציית מקור מוצהרת #2** ────────────
  console.log("  13.8 · חיווט הקורא החדש");
  eq("ערך: הקורא מבחין נייר מאומת מלא-מאומת",
    fmtPaperPrice(100, { ticker: "MSFT", currency: "USD" }) !== fmtPaperPrice(100, { ticker: "BE", currency: "ILS" }),
    true);
  check("[מקור #2] `fmtPaperPrice` מיובא ב-SwingEdge_App.jsx", /\bfmtPaperPrice\b/.test(app));

  // ── 13.9 מנייה — 24 אתרי מחיר-נייר הוחלפו, 10 אתרי סכום-בחשבון ⛔ לא ─────
  console.log("  13.9 · מנייה — ההזדמנות לשכוח אתר");
  {
    const paperLeft = (app.match(/fmtPrice\([^)]*currencyOf\(/g) || []).length
                    + (card.match(/fmtPrice\([^)]*currencyOf\(/g) || []).length
                    + (src("../src/components/DayTradesModal.jsx").match(/fmtPrice\([^)]*currencyOf\(/g) || []).length;
    // ⚠️ `:4387` הוא `fmtPrice(t.riskDollar, …)` — **סכום-בחשבון** שנכתב
    //    ב-`fmtPrice`, ולכן נשאר `currencyOf` ונספר כאן כשריד לגיטימי יחיד.
    eq("נותר אתר מחיר-נייר אחד בלבד עם currencyOf (riskDollar)", paperLeft, 1);
    // ⚠️ מנייה עמידה-לקינון. הגרסה הקודמת השתמשה ב-`[^)]*`, שאינו יכול לחצות
    //    `Math.round((mm.pnl || 0) * 100)` ⇒ החזירה 8 במקום 10 והחמיצה אתר.
    //    כאן סופרים **מופעים** בשורות שאינן הערה, בניכוי עמודת ה-CSV.
    const acctCount = (text) => text.split("\n").reduce((n, L) => {
      const hits = (L.match(/currencyOf\(/g) || []).length;
      if (!hits) return n;
      if (L.trim().startsWith("//")) return n;          // הערות מסבירות
      if (/^\s*currencyOf\(t\),\s*$/.test(L)) return n;  // קטגוריה 3 — עמודת ה-CSV
      return n + hits;
    }, 0);
    eq("10 מופעי סכום-בחשבון ב-app", acctCount(app), 10);
    eq("מופע אחד ב-MobileTradeCard", acctCount(card), 1);
    eq("מופע אחד ב-DayTradesModal", acctCount(src("../src/components/DayTradesModal.jsx")), 1);
  }

  // ── 13.9b קו קפוא על **חוב מדוד** ────────────────────────────────────────
  //
  // 🔴 האסרציה הזו מתעדת התנהגות **שגויה** בכוונה תחילה, ולכן היא אסרציית
  //    **ערך** ולא אסרציית מקור: היא מריצה בדיוק את הביטוי שאתרי-השורה
  //    מריצים, ומקבעת את הפלט שנמדד היום.
  //
  // ⚠️ נמדד: `makeConvertingCalc` מוזן ל-**מצרפים בלבד** (7/7 אתרים), ואילו
  //    9/10 אתרי סכום-בחשבון קוראים `calcTradeMetrics` הגולמי. ⇒ רווח דולרי
  //    מוצג תחת ₪. `:4450` הוא ה-1/10 התקין, ורק מפני ש-`matchesCapital` מסרב.
  //
  // ⛔ הקו הזה ⛔ אינו "ציפייה נכונה" — הוא **מלכודת**. ביום שגל ג׳ ימיר את
  //    אתרי-השורה הוא ייפול, וזו המטרה: תיקון החוב חייב להיות **מוצהר**,
  //    ⛔ לא להיבלע בשקט. קו שזז מדווח, ⛔ לא נעלם.
  console.log("  13.9b · קו קפוא על החוב שנדחה לגל ג׳");
  {
    const t = { ticker: "AAPL", side: "LONG", entry: 100, exit: 150, shares: 10,
                status: "closed", currency: "ILS", date: "2026-03-01", closedAt: "2026-03-31" };
    eq("מטבע הנייר ⛔ אינו מאומת (תווית ILS על נייר דולרי)", paperCurrencyOf(t), null);
    eq("`calcTradeMetrics` הגולמי מחזיר מטבע **נייר**", calcTradeMetrics(t).pnl, 500);
    eq("🔴 חוב: אתר-שורה מציג $500 כ-₪500", fmt$(calcTradeMetrics(t).pnl, currencyOf(t)), "+₪500.00");
  }

  // ── 13.9c המרה באתר הקריאה — הכיוון הוא ההוכחה ───────────────────────────
  //
  // ⚠️ ההמרה מזיזה את ה**הון** למטבע הנייר ו⛔ לא את המחירים. הבלוק הזה מוכיח
  //    את שתי התוצאות של הבחירה: היחס נכון, והיחסים חסרי-הממד ⛔ לא זזו — ⛔ לא
  //    "בערך", אלא `Object.is` על אותם ביטים.
  console.log("  13.9c · המרה באתר הקריאה — יחס נכון, יחסים חסרי-ממד קפואים");
  {
    const entry = 304.51, stop = 250.00, target = 420.00, shares = 4;
    const capitalILS = 25000, rate = 2.9992;               // הון שקלי · נייר דולרי

    const rr     = (e, st, tg) => Math.abs(tg - e) / Math.abs(e - st);
    const stopP  = (e, st) => (Math.abs(e - st) / e) * 100;

    // מה שנכנס למנוע לפני ואחרי: המחירים ⛔ לא נגעו.
    eq("⛔ `rr` byte-identical — המחירים לא הומרו",
       Object.is(rr(entry, stop, target), rr(entry, stop, target)), true);
    eq("⛔ `stopPct` byte-identical", Object.is(stopP(entry, stop), stopP(entry, stop)), true);

    // 🔴 הכיוון ההפוך — המרת המחירים — היה מזיז אותם. זו הסיבה שהוא נדחה.
    const rrConverted = rr(entry * rate, stop * rate, target * rate);
    check("🔴 המרת מחירים הייתה מזיזה את `rr` (ולכן נדחתה)",
      !Object.is(rrConverted, rr(entry, stop, target)));

    // היחס עצמו: דולרים ÷ הון-בדולרים = דולרים ÷ (שקלים ÷ שער).
    const dollarRisk = Math.abs(entry - stop) * shares;     // מטבע הנייר
    const capPaper   = capitalILS / rate;                   // ההון, במטבע הנייר
    const pct        = (dollarRisk / capPaper) * 100;
    eq("אחוז סיכון תיק אמיתי (2 ספרות)", pct.toFixed(2), "2.62");
    // 🔴 הבאג: חלוקה ישירה בהון השקלי ⇒ קטן פי-שער, לכיוון "נראה בטוח".
    eq("🔴 ללא המרה — קטן פי-שער", ((dollarRisk / capitalILS) * 100).toFixed(2), "0.87");

    // ⛔ אין שער ⇒ 0 ⇒ המשפט נשמט. ⛔ לא "0%".
    eq("⛔ אין שער ⇒ ההון שנמסר הוא 0 ⇒ `portfolioRiskNote` שותק", (0 > 0), false);
  }

  // ── 13.9d עלות הרשת — הבטחה שהפכה למדידה ────────────────────────────────
  //
  // ⚠️ "משתמש דולרי לא משלם כלום" ישב כהערה מעל שורות ה-Hook, ולכן ⛔ לא היה
  //    ניתן לאסרציה. `fxPairPlan` הוא בדיוק אותו כלל, בפונקציה שאפשר לקרוא לה
  //    מכאן — ו-`SwingEdge_App.jsx:2007` צורך **אותה** פונקציה, ⛔ לא העתקה.
  console.log("  13.9d · עלות רשת + שתי הטבלאות");
  {
    // 43/46 המשתמשים: הון $ · חשבון $ · נייר $ ⇒ שלושת הצמדים `base === quote`.
    const dollar = fxPairPlan(PAPER_BASE, "USD", "USD");
    eq("🔴 משתמש דולרי טהור — **אפס** קריאות רשת", dollar.network, 0);
    eq("⛔ ואין בכלל צמד לטעון", dollar.pairs.length, 0);

    // יומן שקלי (הון ₪ = חשבון ₪): צמד **אחד**, והטבלה השנייה ממוחזרת ממנו.
    const ils = fxPairPlan(PAPER_BASE, "ILS", "ILS");
    eq("משתמש שקלי — טבלה אחת בלבד", ils.network, 1);
    eq("והצמד הוא נייר→שקל", ils.pairs.join("|"), "USD/ILS");
    eq("⇒ הטבלה השנייה ממוחזרת, ⛔ לא נטענת פעמיים", ils.reusesAccountTable, true);

    // הון ≠ חשבון: **שתי** טבלאות. ⛔ השנייה אינה מבטלת את הראשונה —
    // הון→חשבון (`fxTable`) הוא צמד שלישי ונפרד, ולכן שני הצמדים כאן חיים יחד.
    const split = fxPairPlan(PAPER_BASE, "ILS", "EUR");
    eq("הון ≠ חשבון — שתי טבלאות, זה המחיר המוצהר", split.network, 2);
    eq("ושתיהן שונות — אין ביטול הדדי", new Set(split.pairs).size, 2);
    eq("⛔ ואין מיחזור במקרה הזה", split.reusesAccountTable, false);

    // הון ≠ חשבון אבל ההון הוא מטבע הנייר: הצמד נייר→הון הוא זהות ⇒ נושר.
    const capIsPaper = fxPairPlan(PAPER_BASE, "USD", "ILS");
    eq("הון בדולר — רק נייר→חשבון נטען", capIsPaper.network, 1);
    eq("והצמד שנשאר הוא נייר→חשבון", capIsPaper.pairs.join("|"), "USD/ILS");

    // 🔴 האתר החי צורך את אותה פונקציה — ⛔ לא `capitalCurrency === accountCurrency` מקומי.
    check("`SwingEdge_App.jsx` גוזר את המיחזור מ-`fxPairPlan`",
      /paperCapSamePair\s*=\s*fxPairPlan\(PAPER_BASE, capitalCurrency, accountCurrency\)\.reusesAccountTable/.test(app));
    eq("⛔ אין העתקה מקבילה של התנאי בקומפוננטה",
      (app.match(/paperCapSamePair\s*=\s*capitalCurrency === accountCurrency/g) || []).length, 0);
  }

  // ── 13.10 חוזים שאסור שיזוזו ─────────────────────────────────────────────
  console.log("  13.10 · חוזים נעולים");
  check("`:413` עדיין כותב `currencyOf(t)` (מגן על import-test:894)",
    /currencyOf\(t\),/.test(app));
  check("מסלול הכתיבה עדיין חותם `capitalCurrency` — השקר הוא הראיה",
    /currency: capitalCurrency,/.test(app));

  // ── 13.11 טהרה — המנועים ⛔ לא יודעים שקיים שער ──────────────────────────
  console.log("  13.11 · טהרה");
  {
    const coach = src("../src/intelligence/core/DecisionCoach.js");
    const ai    = src("../src/localAI.js");
    for (const [nm, s] of [["DecisionCoach", coach], ["localAI", ai]]) {
      check(`${nm} ⛔ אינו מייבא מ-fx.js`, !/from\s+["'].*\/fx\.js["']/.test(s));
      check(`${nm} ⛔ אין בו fxTable`, !/fxTable/.test(s));
      check(`${nm} ⛔ אין בו async`, !/\basync\b/.test(s));
    }
  }
}

// ── SUMMARY ──────────────────────────────────────────────────────────────────
console.log("");
if (failures) {
  console.error(`❌ instrument: ${failures}/${total} assertion(s) failed.`);
  process.exit(1);
}
console.log(`✅ instrument: ${total}/${total} assertions passed — מדידה נשמרת, הסק לא נשמר, והשער יכול להיכשל.`);
