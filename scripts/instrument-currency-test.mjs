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
  CURRENCY_SOURCE, isEvidenceBacked,
} from "../src/lib/instrumentCurrency.js";
import { computeTradingStats } from "../src/lib/tradingStats.js";
import { calcTradeMetrics, fmtPaperPrice, paperCurrencyOf, fmt$, currencyOf, realizedDayKey,
         fmtCapitalAmount, fmtAccountAmount, CURRENCY_SYMBOL } from "../src/utils.js";
import { sizePosition } from "../src/lib/positionSizing.js";
// ⚠️ הכלל הזה נצרך כאן **ובקומפוננטה** מאותו מקום — ⛔ אין העתקה מקבילה.
// `accountAmount` הוא **אותה** הכרעת המרה שהתפר המצרפי רץ עליה — ⛔ לא העתקה,
// ולכן `makeConvertingCalc` נבדק כאן דרך אותו ייבוא כדי להוכיח שהם לא נפרדו.
import { fxPairPlan, accountAmount, spotAmount, livePnlAmount,
         makeConvertingCalc } from "../src/hooks/useFxRates.js";
// ⚠️ `B-142` · בלוק 15 — הבסיס וההמרה נצרכים מ**אותם** מודולים שהמסך צורך,
// ⛔ לא מהעתק בדוק. `resolveEquityBase` הוא ההכרעה שקובעת אם ההון בכלל נקוב
// במטבע שהכותרת מדפיסה, ו-`convert` נדרש כדי למדוד את המצב שבו ה-spot **כן**
// עובד והבסיס בכל זאת מסרב (15.5b).
import { resolveEquityBase } from "../src/lib/equityBase.js";
import { convert } from "../src/lib/fx.js";
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
  // 🔴 B-144 · 20.08 — ההכרעה שהפכה את שלוש האסרציות הבאות, ולמה.
  // עד היום `isMixedCurrency` ספר גם איברים **לא-מאומתים** וקרא להם "מטבע שני",
  // כך שאיבר יחיד שלא נגזר הדליק באנר שמצהיר "ביומן שלך יותר ממטבע אחד".
  // זו הצהרה שאין מאחוריה מדידה — R-2: ברירת מחדל שממציאה במקום להודות.
  // מהיום הפילוח נבנה מקודים **מאומתים בלבד**, והאיברים הלא-מאומתים ⛔ אינם
  // נעלמים: הם יוצאים מהפילוח ונמסרים כמכנה (`fxUnconvertedCount` · §5 למטה).
  check("🔴 B-144 · 20.08 — CONTRADICTED ⛔ אינו קוד שני ⇒ הבאנר ⛔ אינו נדלק",
    isMixedCurrency([d({ ticker: "AAPL" }), d({ ticker: "BE", currency: "ILS" })]) === false);
  check("🔴 B-144 · 20.08 — AMBIGUOUS ⛔ אינו קוד שני ⇒ הבאנר ⛔ אינו נדלק",
    isMixedCurrency([d({ ticker: "AAPL" }), d({ ticker: "1081843" })]) === false);
  check("🔴 B-144 · 20.08 — 'לא ידוע' לבדו ⇒ ⛔ אפס קודים מאומתים ⇒ ⛔ אינו מעורב",
    isMixedCurrency([d({ ticker: "1081843" })]) === false);
  // ⛔ ולאסרציות יש שיניים — קוד מאומת שני **כן** מדליק, גם בנוכחות לא-מאומת.
  check("🔴 …ו⛔ ההיפוך אינו 'תמיד שקר' — שני קודים מאומתים מדליקים גם ליד לא-מאומת",
    isMixedCurrency([d({ ticker: "AAPL" }),
                     d({ ticker: "TEVA", instrumentCurrency: "ILA" }),
                     d({ ticker: "1081843" })]));

  check("matchesCapital — MEASURED USD מול הון ILS נחסם",
    matchesCapital(d({ ticker: "BTCUSD" }), "ILS") === false);
  check("matchesCapital — CONTRADICTED נחסם גם כשהתווית שווה להון",
    matchesCapital(d({ ticker: "BE", currency: "ILS" }), "ILS") === false);
  check("matchesCapital — ASSUMED USD מול הון USD עובר",
    matchesCapital(d({ ticker: "AAPL" }), "USD"));
}

// ── 5 · ⚠️ הבאנר על היומן המעורב האמיתי ─────────────────────────────────────
// 13 ניירות ת"א (טיקר מספרי ⇒ AMBIGUOUS) + 2 אמריקאיים (ASSUMED USD).
// 🔴 B-144 · 20.08 — לפני ההכרעה, 13 הלא-מאומתים נספרו כ"מטבע שני" והדליקו
// את הבאנר. הם ⛔ אינם ראיה למטבע שני — הם ראיה ל**היעדר מדידה**, ולכן
// הבאנר כבוי, וה-13 נמסרים כמכנה במקום להתחפש לממצא.
{
  console.log("\n5 · הבאנר — 13 ת\"א + 2 אמריקאיות");
  const TASE = ["1081843", "440016", "587014", "691212", "1081843", "440016",
                "587014", "691212", "1081843", "440016", "587014", "691212", "1081843"];
  const mixed = journalOf([...TASE, "AAPL", "MSFT"], "USD");
  eq("היומן הוא 15 שורות — 13 ת\"א + 2 אמריקאיות", mixed.length, 15);
  const s = computeTradingStats(mixed, 40_000, calcTradeMetrics, null);
  check("🔴 B-144 · 20.08 — קוד מאומת אחד (USD) ⇒ הבאנר ⛔ אינו נדלק",
    s.mixedCurrency === false);
  eq("🔴 …ו⛔ 13 הלא-מאומתים לא נעלמו — הם מחוץ לפילוח, עם מכנה",
    `${s.totalTrades - Object.values(s.tradesByCurrency).reduce((a, b) => a + b, 0)}/${s.totalTrades}`,
    "13/15");
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

  // א2. 🔴 **B-143 — הבאנר של היומן המעורב.** הכותרת נשארה נכונה ("יש כאן יותר
  //     ממטבע אחד"), אבל ה**גוף** תיאר את הבאג: "הסכומים למטה מחברים מטבעות
  //     שונים ואינם סכום אמיתי". מרגע שהמצרפים מחריגים-וסופרים, המשפט הזה
  //     ⛔ אינו אזהרה מיושנת — הוא **שקר**: הוא אומר למשתמש להתעלם ממספר נכון.
  //
  // ⚠️ שתי האסרציות נדרשות ו⛔ אינן כפילות. השנייה היא זו שיכולה להיכשל:
  //     ספירת מפתחות עוברת גם כשכל חמש השפות נושאות את הטקסט הישן, ולכן היא
  //     ⛔ אינה יכולה לתפוס את מה שהגל הזה בא לתקן. ⛔ ו⛔ לא הוחלף כאן
  //     `mixedCurrency` עצמו — הדגל עדיין נכון, ⛔ רק מה שהוא אומר השתנה.
  for (const key of ["mixedCurrencyTitle", "mixedCurrencyBody"]) {
    const n = (i18n.match(new RegExp(`^\\s*${key}:`, "gm")) || []).length;
    eq(`i18n '${key}' מוגדר ב-5 שפות`, n, 5);
  }
  // הטענה שהתבטלה, בכל אחת מחמש השפות בנפרד — ⛔ לא regex גורף שעלול לעבור
  // כי הוא ⛔ אינו מתאים לאף שפה.
  for (const [lang, stale] of [
    ["en", "add different currencies together"],
    ["he", "מחברים מטבעות שונים"],
    ["es", "suman monedas distintas"],
    ["pt", "somam moedas diferentes"],
    ["ar", "تجمع عملات مختلفة"],
  ]) {
    eq(`⛔ '${lang}' ⛔ כבר אינו טוען שהסכום מחבר מטבעות`, i18n.includes(stale), false);
  }
  // …ו⛔ לא נמחק לריק: הגוף עדיין מסביר, ועדיין שומר על "ברמת העסקה נכון".
  eq("גוף הבאנר ⛔ לא רוקן — ההסבר החדש קיים ב-5 שפות",
     (i18n.match(/^\s*mixedCurrencyBody: "(?!")..{40,}/gm) || []).length, 5);

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
    // ⚠️ **הצהרת תזוזה — 2026-08-13, גל ד׳ (`B-119`).** המנייה ירדה `10 → 3`
    //    בגל ג׳ ועכשיו `3 → 1`. הערך הישן והחדש **שניהם** כתובים כאן, כדי
    //    שהקורא הבא יראה **מה** זז ולא רק שמשהו זז:
    //
    //      `:4325` · `:4958` — P&L **חי**. ✅ **הוסרו** — שני האתרים עברו ל-
    //                          `liveDecision` ⇒ המרה ב-**spot**. זה בדיוק
    //                          פריט ה-BACKLOG שהשורה הקודמת הפנתה אליו.
    //      `:4595`          — `riskDollar`, ה-1/10 שהיה תקין מלכתחילה: הוא
    //                          מסורב ע"י `matchesCapital` ומציג `—`. ⛔ נשאר.
    //
    // ⚠️ המספר ⛔ **לא רוכך כדי לעבור** — הוא ירד מפני שהאתרים תוקנו, והקובץ
    //    מונה **אוכלוסייה**, ⛔ לא מקבע התנהגות שגויה. השורה הבאה היא המכנה.
    eq("מופע סכום-בחשבון אחד נותר ב-app (riskDollar בלבד)", acctCount(app), 1);
    eq("⛔ אפס ב-MobileTradeCard", acctCount(card), 0);
    eq("⛔ אפס ב-DayTradesModal", acctCount(src("../src/components/DayTradesModal.jsx")), 0);
  }

  // ── 13.9b הקו הקפוא **זז** — 2026-08-12, גל ג׳ ───────────────────────────
  //
  // 🔴 **הצהרת הסרה.** עד היום ישבה כאן אסרציה שקיבעה התנהגות **שגויה**
  //    בכוונה תחילה:
  //
  //      eq("🔴 חוב: אתר-שורה מציג $500 כ-₪500",
  //         fmt$(calcTradeMetrics(t).pnl, currencyOf(t)), "+₪500.00");
  //
  //    היא הייתה מלכודת מוצהרת: "ביום שגל ג׳ ימיר את אתרי-השורה הוא ייפול,
  //    וזו המטרה". גל ג׳ הגיע, היא נצפתה **אדומה**, והיא מוסרת כאן במפורש
  //    ⛔ ולא רוככה כדי לעבור. הערך הישן (`"+₪500.00"`) והחדש (`"—"`) שניהם
  //    כתובים כאן, כדי שהקורא הבא יראה **מה** זז ולא רק שמשהו זז.
  //
  // ⚠️ הערך החדש הוא `"—"` ⛔ ולא "+₪1,499.60". מטבע הנייר של העסקה הזו
  //    ⛔ **אינו מאומת** (תווית ILS על AAPL ⇒ CONTRADICTED), ולכן ⛔ אין שער
  //    להמיר בו. סירוב מוצהר, ⛔ לא המרה בשער מנוחש. זו בדיוק ההבחנה שהגל
  //    הזה קיים כדי לשמור.
  console.log("  13.9b · הקו הקפוא זז — סירוב מוצהר במקום ₪500 שקריים");
  {
    const t = { ticker: "AAPL", side: "LONG", entry: 100, exit: 150, shares: 10,
                status: "closed", currency: "ILS", date: "2026-03-01", closedAt: "2026-03-31" };
    eq("מטבע הנייר ⛔ אינו מאומת (תווית ILS על נייר דולרי)", paperCurrencyOf(t), null);
    eq("`calcTradeMetrics` הגולמי עדיין מחזיר מטבע **נייר** — ⛔ המנוע לא זז",
       calcTradeMetrics(t).pnl, 500);

    const d = accountAmount(t, calcTradeMetrics(t).pnl, "ILS", null, "identity");
    eq("✅ ההכרעה מסרבת ⛔ ולא מחזירה מספר", d.ok, false);
    eq("✅ ובנימוק שאפשר להציג", d.reason, "unverified_instrument");
    eq("✅ ⛔ ואין ערך — ⛔ לא 0, ⛔ לא הסכום הלא-מומר", d.value, null);
    eq("✅ **הערך שזז**: היה \"+₪500.00\" ⇒ עכשיו \"—\"", fmtAccountAmount(d), "—");
  }

  // ── 13.9b′ ההמרה עצמה — נייר מאומת ⇒ מספר, בשער של יום המימוש ────────────
  //
  // ⚠️ 13.9b מוכיחה את ה**סירוב**. בלעדי הבלוק הזה אפשר היה "לעבור" ע"י
  //    פונקציה שמסרבת תמיד — סירוב גורף הוא ⛔ לא תיקון, הוא מחיקת הפיצ'ר.
  console.log("  13.9b′ · ההמרה עצמה — הצד החיובי של אותה הכרעה");
  {
    // AAPL בלי תווית סותרת ⇒ ASSUMED ⇒ aggregatable. נייר דולרי, חשבון שקלי.
    const t = { ticker: "AAPL", side: "LONG", entry: 100, exit: 150, shares: 10,
                status: "closed", date: "2026-03-01", closedAt: "2026-03-31" };
    const table = {
      base: "USD", quote: "ILS",
      spot:  { rate: 2.9992, rateDate: "2026-08-12" },
      byDay: { "2026-03-31": { rate: 3.5000, rateDate: "2026-03-31" } },
    };
    eq("הנייר מאומת-בהנחה ⇒ נכנס לחשבון", paperCurrencyOf(t), "USD");
    const d = accountAmount(t, calcTradeMetrics(t).pnl, "ILS", table, "ready");
    eq("✅ ההכרעה ממירה", d.reason, "converted");
    eq("✅ בשער **יום המימוש** (3.5) ⛔ לא spot (2.9992)", d.value, 1750);
    eq("✅ והתווית היא מטבע ה**חשבון**", d.currency, "ILS");
    eq("✅ אתר-שורה מציג ₪1,750.00", fmtAccountAmount(d), "+₪1,750.00");
    // 🔴 המספר שהמסך הראה עד היום, על אותה עסקה בדיוק.
    eq("🔴 מה שהמסך הראה קודם — הסכום הדולרי תחת ₪",
       fmt$(calcTradeMetrics(t).pnl, "ILS"), "+₪500.00");
  }

  // ── 13.9b″ ההכרעה — ארבע דחיות מובחנות, ⛔ אפס נפילה שקטה ────────────────
  console.log("  13.9b″ · accountAmount — הכרעה מובחנת");
  {
    const usd = { ticker: "AAPL", status: "closed", date: "2026-03-01", closedAt: "2026-03-31" };
    const table = { base: "USD", quote: "ILS", spot: { rate: 3, rateDate: "2026-08-12" },
                    byDay: { "2026-03-31": { rate: 3, rateDate: "2026-03-31" } } };

    // א. זהות — 43/46 המשתמשים. ⛔ אפס רשת, והערך עובר **כמו שהוא**.
    const id = accountAmount(usd, 500, "USD", null, "identity");
    eq("זהות ⇒ ok", id.ok, true);
    eq("זהות ⇒ הערך byte-identical", Object.is(id.value, 500), true);
    eq("זהות ⇒ ⛔ אין קריאת טבלה (טבלה null ואין סירוב)", id.reason, "identity");

    // ב. אין טבלה (טוען / נכשל) ⇒ סירוב, ⛔ לא הסכום הלא-מומר.
    const loading = accountAmount(usd, 500, "ILS", null, "loading");
    eq("אין טבלה ⇒ ok שקר", loading.ok, false);
    eq("אין טבלה ⇒ נימוק מובחן", loading.reason, "no_table");
    eq("⛔ אין נפילה שקטה לשער 1 — הערך ⛔ אינו 500", loading.value, null);

    // ג. יש טבלה אבל ⛔ אין שער ליום הזה ⇒ נימוק **שונה** מ"אין טבלה".
    const gap = accountAmount({ ...usd, closedAt: "2026-04-15" }, 500, "ILS", table, "ready");
    eq("אין שער ליום ⇒ ok שקר", gap.ok, false);
    check("אין-שער-ליום ⛔ אינו מדווח כ'אין טבלה'", gap.reason !== "no_table");

    // ד. אין סכום ⇒ ⛔ לא ממציאים 0.
    const none = accountAmount(usd, null, "ILS", table, "ready");
    eq("אין סכום ⇒ נימוק מובחן", none.reason, "no_amount");
    eq("⛔ ולא 0", none.value, null);

    // ⛔ אפס `|| 1` / `?? 1` בקובץ ההכרעה — הסירוב הוא התשובה.
    // ⚠️ שורות הערה מנוכות: הכלל **מצוטט** בהערה מעל הפונקציה, וסריקה נאיבית
    //    הייתה נופלת על התיעוד של עצמה (נמדד — נפלה).
    const hookCode = src("../src/hooks/useFxRates.js").split("\n")
      .filter((L) => !/^\s*(\/\/|\*|\/\*)/.test(L)).join("\n");
    check("⛔ אין `|| 1` או `?? 1` בקוד של useFxRates.js", !/(\|\||\?\?)\s*1\b/.test(hookCode));
  }

  // ── 13.9b‴ התפר המצרפי ⛔ לא זז — byte-identical על 4 מצבים ──────────────
  //
  // ⚠️ `makeConvertingCalc` עבר לקרוא ל-`accountAmount`. אם ההתנהגות המצרפית
  //    זזה ולו בביט אחד, כל עקומת ההון וכל סטטיסטיקה זזות איתה. ⇒ נמדד.
  console.log("  13.9b‴ · המצרף byte-identical אחרי הריפקטור");
  {
    const table = { base: "USD", quote: "ILS", spot: { rate: 3, rateDate: "2026-08-12" },
                    byDay: { "2026-03-31": { rate: 3, rateDate: "2026-03-31" } } };
    const mk = (extra) => ({ ticker: "AAPL", side: "LONG", entry: 100, exit: 150, shares: 10,
                             status: "closed", date: "2026-03-01", closedAt: "2026-03-31", ...extra });
    const cases = [
      ["נייר מאומת + טבלה", mk({}), table, "ready", "ILS"],
      ["נייר לא מאומת",     mk({ currency: "ILS" }), table, "ready", "ILS"],
      ["אין טבלה",          mk({}), null, "loading", "ILS"],
      ["זהות",              mk({}), null, "identity", "USD"],
      ["עסקה פתוחה (pnl null)", mk({ status: "OPEN", exit: null }), table, "ready", "ILS"],
    ];
    for (const [nm, tr, tbl, st, disp] of cases) {
      const via = makeConvertingCalc(tbl, disp, st)(tr);
      const raw = calcTradeMetrics(tr);
      // R הוא יחס חסר-ממד ⇒ ⛔ לעולם אינו מומר, בכל אחד מהמצבים.
      eq(`[${nm}] rMultiple ⛔ לא זז`, Object.is(via.rMultiple, raw.rMultiple), true);
    }
    eq("מצרף: נייר מאומת ⇒ 500 → 1500", makeConvertingCalc(table, "ILS", "ready")(mk({})).pnl, 1500);
    eq("מצרף: נייר לא מאומת ⇒ ⛔ לא מומר",
       makeConvertingCalc(table, "ILS", "ready")(mk({ currency: "ILS" })).pnl, 500);
    eq("מצרף: זהות ⇒ התווית ⛔ לא נדרסת",
       makeConvertingCalc(null, "USD", "identity")(mk({})).currency,
       calcTradeMetrics(mk({})).currency);
  }

  // ── 13.9e §2ב — שלוש ספרות אחרי הנקודה (צולם 2026-08-12, 19:51) ─────────
  //
  // 🔴 `POS. VALUE` הציג **₪667.346**. הסיבה ⛔ אינה FX: `toLocaleString()`
  //    חשוף נוקב ב-`maximumFractionDigits: 3`, ומכפלת שער כמעט לעולם אינה
  //    נופלת על שתי ספרות. ⇒ הבאג נולד מהמרה, אבל הוא באג **תצוגה**.
  //
  // ⚠️ העיגול חייב להיות בתצוגה **בלבד**: `effPosValue` מוזן לאחוז-מהתיק
  //    ולהוראת הקנייה. עיגול הערך עצמו מזיז פקודה.
  console.log("  13.9e · §2ב — עיגול בתצוגה בלבד");
  {
    eq("🔴 הבאג שצולם: `toLocaleString()` חשוף ⇒ 3 ספרות", (667.346).toLocaleString(), "667.346");
    eq("✅ הפורמט ⇒ שתי ספרות", fmtCapitalAmount(667.346, "ILS"), "₪667.35");
    eq("✅ ללא סימן — גודל פוזיציה אין לו כיוון", fmtCapitalAmount(667.346, "USD"), "$667.35");
    eq("✅ מספר שלם עדיין נוקב בשתיים", fmtCapitalAmount(1000, "ILS"), "₪1,000.00");
    eq("✅ לא-סופי ⇒ — ⛔ לא ₪NaN", fmtCapitalAmount(NaN, "ILS"), "—");

    // 🔴 הערך עצמו ⛔ **לא** עוגל — זו ההוכחה שהעיגול לא זלג פנימה.
    const p = sizePosition({ entry: "304.51", stop: "250", capital: 2500, riskPct: 1, rate: 2.9992 });
    check("⛔ `effPosValue` שומר על הדיוק המלא — העיגול ⛔ לא זלג לערך",
      !Object.is(p.effPosValue, Math.round(p.effPosValue * 100) / 100));
    eq("ובכל זאת מוצג בשתי ספרות", fmtCapitalAmount(p.effPosValue, "ILS"), "₪913.29");

    // ⛔ אפס `toLocaleString()` חשוף על סכום כסף בשני האתרים שצולמו.
    check("⛔ `POS. VALUE` ⛔ אינו `toLocaleString()` חשוף",
      !/\$\{capSym\}\$\{effPosValue\.toLocaleString\(\)\}/.test(app));
    check("`POS. VALUE` עובר ב-`fmtCapitalAmount`",
      /fmtCapitalAmount\(effPosValue, capitalCurrency\)/.test(app));
  }

  // ── 13.9f ILA — ניתן לאחסון, ⛔ **בלתי-כתיב** ────────────────────────────
  //
  // ⚠️ המיגרציה הרחיבה את ה-CHECK ל-`ILA` בכוונה: הצרה שלו בחזרה הייתה
  //    מוחקת את הכיוון. אבל `CURRENCY_SYMBOL` ⛔ אין בו `ILA`, ו-`minorUnit`
  //    ⛔ אינו מיושם בקריאה (נמדד: 0 אתרי ייצור) ⇒ ILA שנכתב היום הוא נתון
  //    שאי-אפשר לפרש. ⇒ ניתן לאחסון, וחסום **בכתיבה**, עד שהמסלול מקצה
  //    לקצה קיים (פריט BACKLOG נפרד).
  console.log("  13.9f · ILA חסום בכתיבה");
  {
    eq("⛔ אין ל-ILA סמל ⇒ אי-אפשר להציג אותו", CURRENCY_SYMBOL.ILA, undefined);
    // ⛔ אף מסלול כתיבה ⛔ אינו יכול לייצר ILA היום — אסרציית **ערך** על המקור:
    // רשימת המטבעות שמסלול הכתיבה יכול לבחור מהם.
    const writable = [...new Set((app.match(/currency:\s*["'](\w+)["']/g) || [])
      .map((s) => s.replace(/.*["'](\w+)["'].*/, "$1")))];
    check(`⛔ ILA ⛔ אינו במסלולי הכתיבה (נמדד: ${JSON.stringify(writable)})`,
      !writable.includes("ILA"));
    eq("⛔ ואין `\"ILA\"` בשום מקום ב-SwingEdge_App.jsx", /["']ILA["']/.test(app), false);
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

  // ── 13.9g החיווט — ההכרעה מגיעה לשלושת מסלולי הרינדור ────────────────────
  //
  // ⚠️ **אסרציות מקור מוצהרות #3–#5.** הן חוקיות כאן רק מפני ש-13.9b/13.9b′
  //    כבר הוכיחו ב**ערך** שההכרעה נכונה; מה שנשאר לבדוק הוא ש-⛔ לא שכחנו
  //    לחווט אותה. זו בדיוק ההבחנה שהגל הקודם פספס.
  //
  // ⛔ הקומפוננטות ⛔ **אינן** מייבאות `accountAmount` בעצמן: הן מקבלות
  //    `fmtAcct` כ-prop. Hook-state (טבלה/סטטוס) חי ב-`SwingEdge_App`, ועותק
  //    שני של ההכרעה בקומפוננטה הוא איך שהשניים נסחפים.
  console.log("  13.9g · חיווט ההכרעה לשלושת מסלולי הרינדור");
  {
    const modal = src("../src/components/DayTradesModal.jsx");
    const cal   = src("../src/components/TradeCalendar.jsx");

    check("[מקור #3] `SwingEdge_App` צורך את `accountAmount`", /\baccountAmount\b/.test(app));

    // 🔴 נמדד 2026-08-12: התפר המצרפי הוזן ב-`fxTable` = **הון→חשבון**, בעוד
    //    `makeConvertingCalc` ממיר מ**מטבע הנייר** ו-`fx.js:69` דורש התאמת זוג
    //    מדויקת ⇒ ביומן שקלי הוא החזיר את העסקה לא-מומרת. כלומר גם 7/7
    //    המצרפים ⛔ לא הומרו — ⛔ לא רק אתרי השורה. ⇒ נעול כאן.
    // 🔴 **הצהרת תזוזה — 2026-08-15, גל ה׳ (`B-142`).** האסרציה הזו ישבה כאן
    //    בנוסח:
    //
    //      /makeConvertingCalc\(paperAcctTable, accountCurrency, paperAcctStatus\)/
    //
    //    הערך הישן (`accountCurrency`) והחדש (`dispCcy`) **שניהם** כתובים כאן,
    //    כדי שהקורא הבא יראה **מה** זז ולא רק שמשהו זז.
    //
    // ⚠️ ה**נושא** ⛔ לא זז: היא נועדה לנעול שהתפר מוזן בטבלת **נייר→חשבון**
    //    ⛔ ולא ב-`fxTable` (הבאג מ-12.08 שמתועד ממש מעל), והשומר הזה נשאר
    //    מילה במילה בשורה שאחריה. מה שזז הוא הארגומנט ש-`B-142` מזיז **במכוון**:
    //    `accountCurrency` הוא מה שהמשתמש **ביקש**, `dispCcy` הוא מה שהמסך
    //    **מדפיס**, והשניים נפרדים בדיוק כשההגנה של `:2047` פועלת — כלומר
    //    בדיוק במצב שבו ההון הסגור היה סכום בין-יחידות. ⛔ לא רוכך כדי לעבור;
    //    הערך נמדד אדום ב-15.1 לפני שהשורה הזו נגעה.
    check("🔴 התפר המצרפי מוזן בטבלת **נייר→חשבון** ⛔ ולא הון→חשבון, וב-`dispCcy` (B-142)",
      /makeConvertingCalc\(paperAcctTable, dispCcy, paperAcctStatus\)/.test(app));
    check("⛔ ⛔ אין יותר `makeConvertingCalc(fxTable`",
      !/makeConvertingCalc\(fxTable/.test(app));
    check("⛔ ⛔ והתפר ⛔ אינו חוזר ל-`accountCurrency` (B-142)",
      !/makeConvertingCalc\(paperAcctTable, accountCurrency/.test(app));
    check("`fmtAcct` מוגדר פעם אחת ב-`SwingEdge_App`",
      (app.match(/const fmtAcct = /g) || []).length === 1);

    // ⚠️ "⛔ אין עותק שני" נבדק על שורות **ייבוא**, ⛔ לא על המחרוזת: הכלל
    //    מצוטט בהערה בשתי הקומפוננטות, וסריקה נאיבית נפלה על התיעוד של עצמה.
    const importsAccountAmount = (s) =>
      s.split("\n").some((L) => /^\s*import\b/.test(L) && /\baccountAmount\b/.test(L));

    check("[מקור #4] `MobileTradeCard` מקבל `fmtAcct` ומשתמש בו",
      /fmtAcct/.test(card) && /<MobileTradeCard[\s\S]{0,400}?fmtAcct=\{/.test(app));
    check("⛔ `MobileTradeCard` ⛔ אינו מייבא `accountAmount` (⛔ אין עותק שני)",
      !importsAccountAmount(card));

    check("[מקור #5] `TradeCalendar` מעביר `fmtAcct` הלאה ל-`DayTradesModal`",
      /fmtAcct/.test(cal) && /fmtAcct=\{fmtAcct\}/.test(cal));
    check("`DayTradesModal` צורך `fmtAcct`", /fmtAcct/.test(modal));
    check("⛔ `DayTradesModal` ⛔ אינו מייבא `accountAmount`", !importsAccountAmount(modal));

    // הנימוק מוצג — סירוב שקט הוא ⛔ לא סירוב.
    check("סירוב נושא נימוק לקורא (`acctRefusalText`)", /acctRefusalText/.test(app));
    check("הנימוק ממופה ל-i18n קיים ⛔ ולא למחרוזת קשיחה",
      /ccyUnverifiedTip/.test(app) && /fxUnavailable/.test(app));
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

  // ── 14 · P&L חי — ערך **הווה**, spot (B-119, גל ד׳) ───────────────────────
  //
  // 🔴 מה שנמדד 13.08: `openPnL` חיבר P&L של פוזיציות פתוחות — במטבע ה**נייר**
  //    הגולמי — ל-`stats.currentEquity` שכבר הומר למטבע החשבון. חיבור
  //    חוצה-יחידות בכותרת ההון, שדלף גם ל-PDF המיוצא.
  //
  // ⚠️ המלכודת שבגללה הבלוק הזה ⛔ אינו כפילות של 13.9b″: שימוש חוזר ב-
  //    `accountAmount` על פוזיציה פתוחה **עובד** — ומחזיר מספר **שגוי**.
  //    `realizedDayKey` נופל ל-`trade.date` ⇒ יום ה**כניסה**, ו-`byDay` מכיל
  //    אותו. ⇒ ⛔ אין סירוב, ⛔ אין "—", רק מספר סביר שסוטה עם משך ההחזקה.
  //    אסרציה A2 היא היחידה שיכולה להבדיל בין השתיים.
  //
  // שער מקובע `r = 3.0` (הכרעת ניב 13.08 — תואם ל-Δ=₪49.50 שנמדד במסך).
  // ⛔ אפס רשת: שער חי כציפייה הוא מספר שזז מעצמו (`fx.js:19-24`).
  console.log("  14 · P&L חי — spot");
  {
    // פוזיציה **פתוחה**: יש `date`, ⛔ אין `closedAt`. AAPL ⇒ ASSUMED USD.
    const open = { ticker: "AAPL", side: "LONG", status: "OPEN",
                   entry: 100, exit: null, shares: 10, date: "2026-08-01" };
    // 🔴 הפיקסצ׳ר של המלכודת: יום הכניסה נושא שער **אחר** מה-spot.
    const table = { base: "USD", quote: "ILS",
                    spot:  { rate: 3.0, rateDate: "2026-08-13" },
                    byDay: { "2026-08-01": { rate: 2.0, rateDate: "2026-08-01" } } };
    const PNL = 24.75;   // ה-P&L החי שצולם במסך

    // A1 — ההמרה עצמה.
    const a1 = spotAmount(open, PNL, "ILS", table, "ready");
    eq("A1 · spot ממיר", a1.reason, "converted");
    eq("A1 · $24.75 × 3.0 = ₪74.25", a1.value, 74.25);
    eq("A1 · התווית היא מטבע החשבון", a1.currency, "ILS");

    // A2 — 🔴 **האסרציה של הגל.** שתי הפונקציות על אותה פוזיציה פתוחה.
    const a2 = accountAmount(open, PNL, "ILS", table, "ready");
    eq("A2 · `accountAmount` ⛔ אינו מסרב על פתוחה — הוא **מצליח**", a2.ok, true);
    eq("A2 · ...בשער יום ה**כניסה** (2.0) ⇒ ₪49.50 — המספר השגוי", a2.value, 49.5);
    check("A2 · 🔴 spot ≠ יום-כניסה — ההפרדה בין שני הזמנים **נמדדת**",
          a1.value !== a2.value);
    eq("A2 · `realizedDayKey` על פתוחה מחזיר את יום הכניסה ⛔ ולא null",
       realizedDayKey(open), "2026-08-01");

    // A3 — `status:"ready"` בעוד `spot:null` (`fx.js:247-249`: ה-API נפל,
    // המטמון ההיסטורי קיים). ⚠️ בדיקה על הסטטוס בלבד הייתה מפספסת את זה.
    const noSpot = { ...table, spot: null };
    const a3 = spotAmount(open, PNL, "ILS", noSpot, "ready");
    eq("A3 · אין spot ⇒ ok שקר גם כש-status הוא ready", a3.ok, false);
    eq("A3 · נימוק מובחן", a3.reason, "no_spot_rate");
    eq("A3 · ⛔ אין נפילה שקטה — הערך ⛔ אינו 24.75", a3.value, null);
    eq("A3 · המסך מציג `—`", fmtAccountAmount(a3), "—");

    // A4 — 43/46 המשתמשים הדולריים. ⛔ byte-identical.
    const a4 = spotAmount(open, PNL, "USD", null, "identity");
    eq("A4 · זהות ⇒ ok", a4.reason, "identity");
    eq("A4 · הערך byte-identical", Object.is(a4.value, PNL), true);

    // A5 — טיקר מספרי (אג"ח SSE/SZSE) ⇒ ⛔ לא מנוחש ל-USD.
    const a5 = spotAmount({ ...open, ticker: "600519" }, PNL, "ILS", table, "ready");
    eq("A5 · טיקר מספרי ⇒ סירוב מוצהר", a5.reason, "unverified_instrument");
    eq("A5 · ⛔ ולא מנוחש", a5.value, null);

    // A6 — 🧊 קו קפוא: מסלול ה**עבר** ⛔ לא זז מהחילוץ.
    const closed = { ticker: "AAPL", side: "LONG", entry: 100, exit: 150, shares: 10,
                     status: "closed", date: "2026-03-01", closedAt: "2026-03-31" };
    const pastTbl = { base: "USD", quote: "ILS", spot: { rate: 2.9992, rateDate: "2026-08-12" },
                      byDay: { "2026-03-31": { rate: 3.5, rateDate: "2026-03-31" } } };
    const a6 = accountAmount(closed, calcTradeMetrics(closed).pnl, "ILS", pastTbl, "ready");
    eq("A6 · 🧊 סגורה עדיין בשער יום המימוש (3.5) ⛔ לא spot", a6.value, 1750);
    eq("A6 · 🧊 והנימוק ⛔ לא זז", a6.reason, "converted");

    // A7 — שער מבני. ⚠️ שורות הערה מנוכות (הכלל מצוטט בקובץ עצמו).
    const hookCode = src("../src/hooks/useFxRates.js").split("\n")
      .filter((L) => !/^\s*(\/\/|\*|\/\*)/.test(L)).join("\n");
    check("A7 · ⛔ אין `|| 1` / `?? 1` בשלושת העוטפים", !/(\|\||\?\?)\s*1\b/.test(hookCode));
    check("A7 · `spotAmount` מוסר `dateKey` **חסר**, ⛔ לא `realizedDayKey`",
          /spotAmount\s*=\s*\([^)]*\)\s*=>\s*\n?\s*amountAt\([^)]*undefined\)/.test(hookCode));

    // A8 — 🔴 **C1, המצב החמישי.** `dispCcy` נופל ל-`capitalCurrency` כשההמרה
    // נכשלה (`SwingEdge_App.jsx:2035`) ⇒ ההון הסגור מוצג **לא מומר** תחת ₪,
    // בעוד `accountCurrency === "USD" === PAPER_BASE`. בלי התנאי הזה
    // `livePnlAmount` הייתה מחזירה `identity` ומחברת דולר גולמי מתחת ל-₪ —
    // ערבוב **חדש** שהתיקון עצמו מייצר, דווקא כשההגנה אמורה לפעול.
    const a8 = livePnlAmount(open, PNL, "USD", "ILS", table, "ready");
    eq("A8 · ענף fallback ⇒ ok שקר", a8.ok, false);
    eq("A8 · נימוק מובחן ⛔ ולא `identity`", a8.reason, "fx_fallback");
    eq("A8 · ⛔ והערך ⛔ אינו 24.75", a8.value, null);

    // ההכרעה המשותפת — שני המסלולים התקינים, כדי ש-A8 ⛔ לא תעבור ע"י
    // פונקציה שמסרבת תמיד (סירוב גורף הוא מחיקת הפיצ'ר, ⛔ לא תיקון).
    eq("livePnlAmount · חשבון $ + תצוגה $ ⇒ זהות byte-identical",
       Object.is(livePnlAmount(open, PNL, "USD", "USD", null, "identity").value, PNL), true);
    eq("livePnlAmount · חשבון ₪ + תצוגה ₪ ⇒ spot",
       livePnlAmount(open, PNL, "ILS", "ILS", table, "ready").value, 74.25);
    eq("livePnlAmount · חשבון ₪ בלי spot ⇒ סירוב",
       livePnlAmount(open, PNL, "ILS", "ILS", noSpot, "ready").reason, "no_spot_rate");
    // ⚠️ טיקר מספרי אצל משתמש **דולרי** ⇒ עדיין נספר. הקדימות בקוד היא מה
    //    שמונע מהתיקון להוציא פוזיציה מהמצרף של 43/46 המשתמשים.
    eq("🔴 טיקר מספרי + חשבון $ ⇒ ⛔ **לא** נושר מהמצרף",
       livePnlAmount({ ...open, ticker: "600519" }, PNL, "USD", "USD", null, "identity").ok, true);
  }

  // ── 14.1 החיווט ב-`SwingEdge_App` — אסרציות **מקור** מוצהרות ──────────────
  //
  // ⚠️ חוקיות כאן **רק** מפני שבלוק 14 כבר הוכיח ב**ערך** שההכרעה נכונה.
  //    ⛔ אינן מחליפות את אימות העין (`C-023`) — `useMemo` ב-`.jsx` ⛔ אינו
  //    ניתן לייבוא, והמסך הוא מה שנמדד.
  console.log("  14.1 · חיווט ה-P&L החי");
  {
    const app = src("../SwingEdge_App.jsx");
    // ⚠️ הצריכה עוברת דרך `liveDecision` — התאום של `acctDecision`. מצב ה-Hook
    //    (טבלה · סטטוס · `dispCcy`) חי בקומפוננטה, ועוטף אחד הוא מה שמונע
    //    שלושה אתרים שכל אחד מרכיב את הארגומנטים בעצמו.
    check("`liveDecision` מוגדר **פעם אחת** ועוטף את `livePnlAmount`",
      (app.match(/const liveDecision = /g) || []).length === 1 &&
      /const liveDecision = useCallback\([\s\S]{0,300}?livePnlAmount\(/.test(app));
    check("`openPnL` צורך את ההכרעה ⛔ ולא מחשב אחת משלו",
      /const openPnL = useMemo\([\s\S]{0,900}?liveDecision\(/.test(app));
    check("🔴 `dispCcy` נמסר להכרעה (C1 — המצב החמישי)",
      /livePnlAmount\(trade, amount, accountCurrency, dispCcy/.test(app));
    check("⛔ `accountAmount` ⛔ אינו נצרך על פוזיציה פתוחה (מלכודת A2)",
      !/const openPnL = useMemo\([\s\S]{0,900}?accountAmount\(/.test(app));
    check("`unconvertedCount` מוחזר ומוצהר למסך",
      /unconvertedCount/.test(app));
    check("🔴 `dailyPnL` צורך את התפר ה**מומר** (אחרת נוצר חיבור חוצה-יחידות חדש)",
      /const dailyPnL = useMemo\([\s\S]{0,600}?stableCalcTradeMetrics\(/.test(app));
    // מצרף + שתי שורות = 3 אתרי צריכה, כולם על אותו עוטף.
    check("שתי שורות ה-P&L החי צורכות את **אותה** הכרעה",
      (app.match(/liveDecision\(t[r]?,/g) || []).length >= 3);
    check("⛔ ⛔ אין `fmt$(Math.round(livePnl), currencyOf(` — הבאג `$500 → ₪500`",
      !/fmt\$\(Math\.round\(livePnl\), currencyOf\(/.test(app));
    check("הסירוב בשורה נושא נימוק ⛔ ולא `—` ערום", /spotRefusalText/.test(app));
    check("ה-PDF מצהיר על מצרף חלקי", /partialEquityNote|equityIncomplete/.test(app));
  }
}

// ── 15 · ההון ה**סגור** — ⛔ אפס סכום בין-יחידות (B-142, גל ה׳) ──────────────
//
// 🔴 הפגם במשפט אחד: `stats.currentEquity = capital + Σ pnl`
// (`src/lib/tradingStats.js:221-224`). כשאיבר בסכום ⛔ אינו נקוב במטבע שהכותרת
// מודפסת בו, החיבור מחבר **יחידות שונות** — ו⛔**שום סמל אינו הופך אותו לנכון**.
// ⇒ יישור סמלים היה **הסתרה**, ⛔ לא תיקון.
//
// האינווריאנטה שהבלוק הזה אוכף:
//
//   הכותרת נקובה ב-`dispCcy`. כל איבר שמטבעו ≠ `dispCcy` ו⛔אינו ניתן להמרה
//   ל-`dispCcy` — ⛔ אינו נכנס לסכום, ו**נספר**.
//
// ⚠️ זו בדיוק התבנית ש-`B-119` קנה לצד ה**חי** (בלוק 14). הצד ה**סגור** נשאר
//    מאחור, ושני צדי אותה כותרת התנהגו שונה. ⇒ נמדד כאן.
//
// ⚠️ הסימון (`fxUnconverted`) הוא **תוצר-לוואי של הכרעה שכבר התקבלה** בתוך
//    `makeConvertingCalc` — ⛔ לא מעבר שני ו⛔לא חישוב מקביל. מעבר שני נסחף.
console.log("\n15 · ההון הסגור — האינווריאנטה של יחידה אחת (B-142)");
{
  const DAY = "2026-03-31";
  const mkTable = (base, quote, dayRate, spotRate) => ({
    base, quote,
    spot: { rate: spotRate, rateDate: "2026-08-13" },
    byDay: { [DAY]: { rate: dayRate, rateDate: DAY } },
  });
  const aapl = (extra = {}) => ({ ticker: "AAPL", side: "LONG", entry: 100, exit: 110,
    shares: 10, status: "CLOSED", date: "2026-03-01", closedAt: DAY, ...extra });

  // ⚠️ הצרכן (`closedPnL`, `SwingEdge_App.jsx`) הוא `useMemo` ב-`.jsx` ו⛔אינו
  //    ניתן לייבוא ב-node. הרדוקטור כאן מריץ את **אותה** שורה בדיוק, והחיווט
  //    עצמו ננעל באסרציות המקור ב-15.8 — בדיוק הפיצול של 14 / 14.1.
  const foldClosed = (base, trades, calc) => {
    let value = base, unconvertedCount = 0;
    for (const t of trades) {
      const m = calc(t);
      if (m.fxUnconverted) { unconvertedCount++; continue; }
      value += m.pnl || 0;
    }
    return { value, unconvertedCount, total: trades.length };
  };

  // ── 15.1 · S5 — הון ILS · חשבון USD · ⛔ אין שער כלל ─────────────────────
  //
  // 🔴 **הערך שזז**: `₪10,100` ⇒ `₪10,000`. ה-10,100 היה 10,000 **שקלים**
  //    ועוד 100 **דולר**, מודפסים תחת `₪`. נצפה אדום לפני התיקון.
  console.log("  15.1 · S5 · הון ILS · חשבון USD · אין שער");
  {
    const EMPTY = { base: "USD", quote: "ILS", spot: null, byDay: {} };
    const trades = [aapl()];
    const eb = resolveEquityBase({ capital: 10_000, capitalCurrency: "ILS",
      accountCurrency: "USD", fxTable: EMPTY, trades });

    eq("הבסיס ⛔ אינו מומר ⇒ ההכרעה מסרבת", eb.ok, false);
    eq("…והערך הוא ההון הגולמי — ⛔ לא null ו⛔לא spot", eb.value, 10_000);
    eq("🔴 …ונקוב במטבע ה**הון**, ⛔ לא במטבע שהמשתמש ביקש", eb.currency, "ILS");

    // ⇒ `dispCcy` נופל ל-`capitalCurrency`, והתפר המצרפי מוזן **בו**.
    const calc = makeConvertingCalc(null, eb.currency, "identity");
    const m = calc(trades[0]);
    eq("נייר דולרי מול כותרת שקלית ⇒ ⛔ אינו מומר, ⛔ ואינו מנוחש", m.fxUnconverted, "no_table");
    eq("⛔ הערך הגולמי ⛔ לא נדרס — המנוע ⛔ לא זז", m.pnl, 100);

    const f = foldClosed(eb.value, trades, calc);
    eq("🔴 **הערך שזז**: היה 10,100 (₪+$) ⇒ עכשיו 10,000", f.value, 10_000);
    eq("…והחיסרון **נאמר**: 1 מתוך 1", `${f.unconvertedCount}/${f.total}`, "1/1");
    // 🔴 **B-143 — הערך שזז**: `10,100 ⇒ 10,000`, ו⛔ לא רק המספר.
    //
    // ⚠️ הניסוח הקודם הזין כאן `makeConvertingCalc(null, "USD", "identity")` —
    // calc **אחר** מזה ש-`foldClosed` קיבל שתי שורות למעלה — בעוד התווית
    // הכריזה "שקלים ועוד דולר, תחת ₪". תחת `identity/USD` מטבע התצוגה **הוא**
    // דולר, ולכן 10,100 שם הוא דולרים תקינים ו⛔ אינו הפגם שהתווית תיארה:
    // האסרציה עברה מבלי למדוד את מה שטענה שהיא מודדת. מוזן עכשיו **אותו**
    // `calc`, וזה גם מה שהופך את ההשוואה ל-`foldClosed` למשמעותית.
    eq("🔴 **הערך שזז** 10,100 ⇒ 10,000 — ו-`currentEquity` מסכים עם `foldClosed`",
       computeTradingStats(trades, 10_000, calc).currentEquity, f.value);
    eq("…עם אותו מכנה בדיוק: 1 מתוך 1",
       computeTradingStats(trades, 10_000, calc).fxUnconvertedCount, f.unconvertedCount);
  }

  // ── 15.2 · S7 — `fxOk === true`, ועסקה אחת בכל זאת מסרבת ─────────────────
  //
  // ⚠️ מפריך את שורת ה-`BACKLOG` שטענה "רק כשאין שער": כאן **יש** שער, הבסיס
  //    הומר, והסכום עדיין היה בין-יחידות.
  console.log("  15.2 · S7 · נייר לא-מאומת בתוך יומן שהומר בהצלחה");
  {
    const tbl = mkTable("USD", "ILS", 2.0, 3.0);
    const good = aapl();
    const bad  = aapl({ currency: "ILS" });   // תווית ILS על נייר דולרי ⇒ CONTRADICTED
    const trades = [good, bad];
    const eb = resolveEquityBase({ capital: 10_000, capitalCurrency: "USD",
      accountCurrency: "ILS", fxTable: tbl, trades });

    eq("הבסיס הומר בשער **יום הבסיס** (2.0)", eb.value, 20_000);
    eq("…וההכרעה מצהירה על כך", eb.reason, "converted");
    eq("…ובמטבע החשבון", eb.currency, "ILS");

    const calc = makeConvertingCalc(tbl, "ILS", "ready");
    eq("הנייר המאומת מומר (100$ × 2.0)", calc(good).pnl, 200);
    eq("⛔ ואינו מסומן", calc(good).fxUnconverted, undefined);
    eq("הנייר הלא-מאומת ⛔ אינו מומר ⛔ ואינו מנוחש",
       calc(bad).fxUnconverted, "unverified_instrument");

    const f = foldClosed(eb.value, trades, calc);
    eq("🔴 **הערך שזז**: היה 20,300 (₪+$) ⇒ עכשיו 20,200", f.value, 20_200);
    eq("…עם מכנה: 1 מתוך 2", `${f.unconvertedCount}/${f.total}`, "1/2");
    // 🔴 **B-143 — הערך שזז**: `20,300 ⇒ 20,200`. עד הגל הזה השורה הזו קיבעה את
    // הפער בין שני המפיקים: `foldClosed` (כותרת המסך) הוציא את הנייר שלא הומר,
    // ו-`currentEquity` חיבר אותו — 20,200 שקלים ועוד 100 **דולר**, מודפס תחת ₪.
    // ⛔ הציפייה לא רוככה: 20,300 היה **הבאג**, וזה בדיוק המספר שהגל בא למחוק.
    // שני המפיקים מסכימים עכשיו, וזו הטענה המרכזית של הגל בצורת אסרציה.
    eq("🔴 **הערך שזז** 20,300 ⇒ 20,200 — ו-`currentEquity` מסכים עם `foldClosed`",
       computeTradingStats(trades, 20_000, calc).currentEquity, 20_200);
    eq("…ואי-אפשר שיסכימו במקרה: אותו מכנה בדיוק",
       computeTradingStats(trades, 20_000, calc).fxUnconvertedCount, f.unconvertedCount);
  }

  // ── 15.3 · S8 — אין fixing ליום ה**מימוש** ──────────────────────────────
  //
  // ⚠️ P3 — `S8` נושא **שני** תפקידים. זה הראשון: היום החסר הוא יום ה**מימוש**
  //    של עסקה סגורה. התפקיד השני (יום ה**בסיס**) נמדד בנפרד ב-15.5b, ⛔ ולא
  //    כאן — אסרציה אחת שמכסה את שניהם ⛔ אינה יכולה לדעת מי משניהם נפל.
  console.log("  15.3 · S8α · אין fixing ליום המימוש (P&L סגור)");
  {
    const tbl = mkTable("USD", "ILS", 2.0, 3.0);
    const good = aapl();
    const gap  = aapl({ ticker: "MSFT", closedAt: "2026-04-15" });  // ⛔ אין byDay ליום הזה
    const trades = [good, gap];
    const eb = resolveEquityBase({ capital: 10_000, capitalCurrency: "USD",
      accountCurrency: "ILS", fxTable: tbl, trades });
    const calc = makeConvertingCalc(tbl, "ILS", "ready");

    eq("הבסיס נקבע מיום העסקה הסגורה ה**ראשונה**", eb.value, 20_000);
    eq("אין שער ליום המימוש ⇒ נימוק מובחן ⛔ ולא 'אין טבלה'",
       calc(gap).fxUnconverted, "no_rate_for_day");
    const f = foldClosed(eb.value, trades, calc);
    eq("🔴 **הערך שזז**: היה 20,300 ⇒ עכשיו 20,200", f.value, 20_200);
    eq("…עם מכנה: 1 מתוך 2", `${f.unconvertedCount}/${f.total}`, "1/2");
    // 🔴 **B-143 — הערך שזז**: `20,300 ⇒ 20,200`, אותו תיקון כמו ב-15.2 אבל דרך
    // נימוק סירוב **אחר** (`no_rate_for_day` ⛔ ולא `unverified_instrument`).
    // ⚠️ זה המקרה שהפריך את האודיט: כאן `fxOk === true` — הטבלה קיימת והשער
    // תקף — ובכל זאת יום המימוש חסר. סירוב **חלקי** תחת המרה מוצלחת הוא בדיוק
    // המצב שבו הפער היה בלתי-נראה. ⛔ הציפייה לא רוככה.
    eq("🔴 **הערך שזז** 20,300 ⇒ 20,200 — סירוב חלקי תחת `fxOk === true`",
       computeTradingStats(trades, 20_000, calc).currentEquity, 20_200);
    eq("…ואי-אפשר שיסכימו במקרה: אותו מכנה בדיוק",
       computeTradingStats(trades, 20_000, calc).fxUnconvertedCount, f.unconvertedCount);
  }

  // ── 15.4 · הקו הקפוא — S1 · S2 · S6 ⛔ לא זזים ───────────────────────────
  //
  // ⚠️ **S6 הוא ההוכחה שהאסימטריה הובנה ו⛔לא נמחקה בסירוב גורף.** הון USD ·
  //    חשבון ILS · ⛔ אין שער ⇒ `dispCcy` נופל ל-USD, שהוא **גם** `PAPER_BASE`
  //    ⇒ הבסיס והאיברים באותה יחידה ⇒ ⛔ אין כאן פגם, ו⛔אין מה לסמן.
  //    סירוב גורף היה "מתקן" גם אותו — כלומר מוחק פיצ'ר מ-43/46 המשתמשים.
  console.log("  15.4 · הקו הקפוא — S1 · S2 · S6 byte-identical");
  {
    const t = aapl();
    const raw = calcTradeMetrics(t);

    // S1 — יומן דולרי מלא (43/46). ⛔ אפס רשת, ⛔ אפס סימון.
    const s1 = makeConvertingCalc(null, "USD", "identity")(t);
    eq("S1 · `pnl` byte-identical", Object.is(s1.pnl, raw.pnl), true);
    eq("S1 · `currency` ⛔ לא נדרס", Object.is(s1.currency, raw.currency), true);
    eq("S1 · `rMultiple` ⛔ לא זז", Object.is(s1.rMultiple, raw.rMultiple), true);
    eq("S1 · ⛔ אין סימון", "fxUnconverted" in s1, false);

    // S2 — יומן שקלי מלא, טבלת נייר→חשבון תקינה ⇒ המרה, ⛔ לא סירוב.
    const s2 = makeConvertingCalc(mkTable("USD", "ILS", 2.0, 3.0), "ILS", "ready")(t);
    eq("S2 · מומר (100 × 2.0)", s2.pnl, 200);
    eq("S2 · ⛔ אין סימון", "fxUnconverted" in s2, false);

    // S6 — הון USD · חשבון ILS · ⛔ אין שער ⇒ `dispCcy` = USD = `PAPER_BASE`.
    const eb6 = resolveEquityBase({ capital: 10_000, capitalCurrency: "USD",
      accountCurrency: "ILS", fxTable: { base: "USD", quote: "ILS", spot: null, byDay: {} },
      trades: [t] });
    eq("S6 · הבסיס מסרב ונשאר במטבע ההון", eb6.currency, "USD");
    const calc6 = makeConvertingCalc(null, eb6.currency, "loading");
    eq("S6 · ⛔ אין סימון — הבסיס והאיבר באותה יחידה", "fxUnconverted" in calc6(t), false);
    const f6 = foldClosed(eb6.value, [t], calc6);
    eq("S6 · הסכום ⛔ לא זז (10,000 + 100, שניהם USD)", f6.value, 10_100);
    eq("S6 · ⛔ אפס נספרים", f6.unconvertedCount, 0);
  }

  // ── 15.5 · `resolveEquityBase` — הכרעה מובחנת, ארבעה מסלולים ─────────────
  console.log("  15.5 · resolveEquityBase — הכרעה ⛔ לא מספר");
  {
    const tbl = mkTable("USD", "ILS", 2.0, 3.0);
    const trades = [aapl()];
    const args = { capital: 10_000, capitalCurrency: "USD", accountCurrency: "ILS", trades };

    const id = resolveEquityBase({ ...args, accountCurrency: "USD", fxTable: null });
    eq("א. זהות ⇒ ok", id.ok, true);
    eq("א. זהות ⇒ נימוק מובחן", id.reason, "identity");
    eq("א. זהות ⇒ הערך byte-identical", Object.is(id.value, 10_000), true);

    const conv = resolveEquityBase({ ...args, fxTable: tbl });
    eq("ב. הומר בשער יום הבסיס", conv.reason, "converted");
    eq("ב. ⛔ לא spot (3.0) אלא יום הבסיס (2.0)", conv.value, 20_000);

    const spot = resolveEquityBase({ ...args, trades: [], fxTable: tbl });
    eq("ג. ⛔ אין היסטוריה ⇒ נקודה יחידה ⇒ spot, וזה **מוצהר**", spot.reason, "spot");
    eq("ג. …ובערך של spot (3.0)", spot.value, 30_000);

    const gone = resolveEquityBase({ ...args,
      fxTable: { base: "USD", quote: "ILS", spot: { rate: 3, rateDate: "x" }, byDay: {} } });
    eq("ד. ⛔ אין fixing ליום הבסיס ⇒ ok שקר", gone.ok, false);
    eq("ד. …בנימוק שעובר **כמו שהוא** מ-`convert`", gone.reason, "no_rate_for_day");
    eq("ד. ⛔ ⛔ אין נפילה ל-spot (30,000) — ההון הגולמי", gone.value, 10_000);
    eq("ד. …ונקוב במטבע ההון", gone.currency, "USD");
  }

  // ── 15.5b · S8β — היום החסר הוא יום ה**בסיס**, ו-`fxOk` היה `true` ───────
  //
  // 🔴 **המצב שלא היה לו שם עד היום.** ה-spot עבד ⇒ `fxOk === true` ⇒ `dispCcy`
  //    נשאר `accountCurrency` — בעוד ה**בסיס** נשאר במטבע ההון. התוצאה: הבסיס
  //    מודפס תחת הסמל הלא-נכון (`:4156`), **וגם** משמש מכנה ל-
  //    `curEquityReturnPct` (`:2383`) שהמונה שלו ביחידה אחרת. זהו באג T10
  //    ("יחס של שתי יחידות") חוזר דרך דלת אחורית, ובשקט מוחלט.
  console.log("  15.5b · S8β · אין fixing ליום הבסיס בעוד spot עובד");
  {
    const noByDay = { base: "ILS", quote: "USD",
      spot: { rate: 0.3, rateDate: "2026-08-13" }, byDay: {} };
    const trades = [aapl()];
    const capitalCurrency = "ILS", accountCurrency = "USD";
    const eb = resolveEquityBase({ capital: 10_000, capitalCurrency, accountCurrency,
      fxTable: noByDay, trades });

    const displayCapital = convert(10_000, capitalCurrency, accountCurrency, noByDay).value;
    eq("ה-spot **כן** עובד ⇒ `displayCapital` ⛔ אינו null", displayCapital, 3_000);
    eq("🔴 ובכל זאת הבסיס מסרב", eb.ok, false);
    eq("🔴 …ונשאר נקוב ב-ILS", eb.currency, capitalCurrency);

    // הכלל הישן: `fxOk = capCcy === acctCcy || displayCapital != null`.
    const oldFxOk  = capitalCurrency === accountCurrency || displayCapital != null;
    const oldDisp  = oldFxOk ? accountCurrency : capitalCurrency;
    eq("🔴 תחת הכלל ה**ישן** הסמל והבסיס **נפרדו**", oldDisp !== eb.currency, true);

    // הכלל החדש. ⚠️ הביטוי עצמו ננעל ב-`SwingEdge_App.jsx` באסרציית מקור 15.8 —
    //    כאן נמדדת ה**תוצאה**, שם נמדד שהמסך מריץ את אותו ביטוי.
    const newFxOk = capitalCurrency === accountCurrency || (displayCapital != null && eb.ok);
    const newDisp = newFxOk ? accountCurrency : capitalCurrency;
    eq("✅ תחת הכלל החדש הסמל והבסיס ⛔ אינם יכולים להיפרד", newDisp, eb.currency);
    // המכנה של `curEquityReturnPct` הוא `equityBase`, והמונה הוא `curEquity`
    // שנבנה ב-`dispCcy`. שוויון היחידות הוא כל מה שהופך את היחס ליחס.
    eq("✅ …ולכן המונה והמכנה של ה-% באותה יחידה", newDisp === eb.currency, true);
  }

  // ── 15.5c · S8γ — ה**מראה** של 15.5b: ה-spot נפל, יום הבסיס **קיים** ────
  //
  // 🔴 **נמצא באימות-העין של `C-023`, ⛔ לא בתכנון.** 15.5b סגר כיוון אחד
  //    (spot עובד · יום הבסיס חסר). הכיוון ההפוך נשאר פתוח, וההערה ב-
  //    `SwingEdge_App.jsx:2099` הצהירה עליו במפורש שהוא ⛔ אינו יכול לקרות:
  //    "הוא נקוב ב-`equityBaseD.currency`, ואחרי השער למעלה זה **תמיד**
  //    `dispCcy`". ההצהרה הזו הייתה **שקרית**, והדפדפן הראה אותה: ₪ הפך ל-$.
  //
  // ⚠️ ⛔ זה ⛔ אינו מצב תיאורטי. `loadRateTable` מחזיר בדיוק את הטבלה הזו
  //    במסלול ה-`catch` שלו — הרשת נפלה, וההיסטוריה החסינה יושבת ב-
  //    localStorage. כלומר: כל משתמש שנופל לו האינטרנט אחרי שכבר טען פעם
  //    אחת. `spot` ⛔ לעולם ⛔ אינו נשמר לקאש (מכוון), ולכן הצירוף
  //    "יש `byDay`, אין `spot`" הוא ה**ברירה** במסלול הזה, ⛔ לא הקצה שלו.
  console.log("  15.5c · S8γ · ה-spot נפל בעוד fixing יום הבסיס קיים");
  {
    const capital = 10_000;
    const capitalCurrency = "USD", accountCurrency = "ILS";
    // ⛔ אין `spot`, **יש** `byDay` — פלט `loadRateTable` במסלול ה-catch.
    const noSpot = { base: "USD", quote: "ILS", spot: null,
      byDay: { [DAY]: { rate: 2.0, rateDate: DAY } } };
    const trades = [aapl()];
    const eb = resolveEquityBase({ capital, capitalCurrency, accountCurrency,
      fxTable: noSpot, trades });

    const displayCapital = convert(capital, capitalCurrency, accountCurrency, noSpot).value;
    eq("ה-spot נפל ⇒ `displayCapital` הוא null", displayCapital, null);
    eq("🔴 ובכל זאת הבסיס **הומר** — יום הבסיס קיים", eb.ok, true);
    eq("🔴 …ולכן ההכרעה נקובה ב-ILS", eb.currency, accountCurrency);

    // `fxOk` שקר — ו**בצדק**: `capitalShown` הוא ערך הווה ו⛔אינו יכול להמיר
    // בלי spot. הפגם ⛔ אינו ב-`fxOk`, אלא בהנחה שהבסיס עוקב אחריו מאליו.
    const fxOk = capitalCurrency === accountCurrency || (displayCapital != null && eb.ok);
    eq("`fxOk` שקר — `capitalShown` ⛔ אינו יכול להמיר בלי spot", fxOk, false);
    const dispCcy = fxOk ? accountCurrency : capitalCurrency;
    eq("⇒ הכותרת מדפיסה את הסמל של USD", dispCcy, "USD");
    eq("🔴 בעוד ההכרעה נקובה ILS ⇒ הסמל וההכרעה **נפרדו**", dispCcy !== eb.currency, true);

    // 🔴 **הערך שזז** — נצפה בדפדפן לפני שהשורה הזו נגעה: `$20,100.00`.
    //    20,000 **שקלים** ועוד 100 **דולר**, מודפסים תחת "$".
    const calc = makeConvertingCalc(null, dispCcy, "identity");
    const oldFold = foldClosed(eb.value, trades, calc);
    eq("🔴 מה שהמסך הראה — 20,000 ₪ + 100 $ תחת '$'", oldFold.value, 20_100);
    eq("…ו⛔בלי שאיש נספר, כי ה**בסיס** ⛔ אינו איבר שאפשר להחריג", oldFold.unconvertedCount, 0);

    // ✅ התיקון. הבסיס ⛔ אינו איבר שניתן להחריג ולספור — הוא ה**עוגן**. לכן
    //    כש-`fxOk` שקר הוא חוזר להיות ההון הגולמי במטבע ההון, בדיוק כמו
    //    שההכרעה עצמה עושה בשלושת המסלולים האחרים. הביטוי ננעל ב-15.8.
    const newBase = fxOk ? eb.value : capital;
    eq("✅ הבסיס חוזר להון הגולמי ⇒ נקוב ב-`dispCcy`", newBase, 10_000);
    const newFold = foldClosed(newBase, trades, calc);
    eq("✅ **הערך שזז**: היה 20,100 (₪+$) ⇒ עכשיו 10,100, כולו USD", newFold.value, 10_100);
    eq("✅ …ו⛔אין מה לספור — ⛔ אף איבר ⛔ לא הוחרג", newFold.unconvertedCount, 0);

    // ⚠️ שיניים — התיקון ⛔ אינו רשאי לגעת בשלושת המסלולים שכבר עבדו.
    const tbl = mkTable("USD", "ILS", 2.0, 3.0);
    const ok = resolveEquityBase({ capital, capitalCurrency, accountCurrency, fxTable: tbl, trades });
    const okFxOk = convert(capital, capitalCurrency, accountCurrency, tbl).value != null && ok.ok;
    eq("שיניים · המסלול התקין ⛔ לא זז", okFxOk ? ok.value : capital, 20_000);
  }

  // ── 15.6 · שיניים — סירוב **גורף** ⛔ אינו יכול לעבור ────────────────────
  //
  // ⚠️ בלעדי הבלוק הזה, "תיקון" שמסמן כל עסקה היה מאפס את הכותרת ועובר את
  //    15.1-15.3 בגאווה. זו מחיקת פיצ'ר, ⛔ לא תיקון.
  console.log("  15.6 · שיניים — S3/S4 מומרים, ⛔ אפס סימון");
  {
    const t = aapl();
    // S3 — הון USD · חשבון ILS · שער קיים ⇒ המרה מלאה.
    const s3 = makeConvertingCalc(mkTable("USD", "ILS", 2.0, 3.0), "ILS", "ready")(t);
    eq("S3 · מומר", s3.pnl, 200);
    eq("S3 · ⛔ אין סימון", "fxUnconverted" in s3, false);
    // S4 — הון ILS · חשבון USD ⇒ `dispCcy` = USD = מטבע הנייר ⇒ זהות.
    const s4 = makeConvertingCalc(null, "USD", "identity")(t);
    eq("S4 · זהות ⇒ הערך עובר כמו שהוא", s4.pnl, 100);
    eq("S4 · ⛔ אין סימון", "fxUnconverted" in s4, false);
  }

  // ── 15.7 + 15.8 · החיווט ב-`SwingEdge_App` — אסרציות **מקור** מוצהרות ────
  //
  // ⚠️ חוקיות כאן **רק** מפני ש-15.1-15.6 כבר הוכיחו ב**ערך** שההכרעה נכונה.
  //    `generateEquityCurve` · `closedPnL` · `fxOk` הם `useMemo`/פונקציה
  //    פרטית בתוך `.jsx` ⛔ שאינו ניתן לייבוא ב-node — בדיוק כמו 14.1.
  //    ⛔ אינן מחליפות את אימות העין (`C-023`).
  console.log("  15.7+15.8 · חיווט ההון הסגור");
  {
    const app = src("../SwingEdge_App.jsx");

    // ⚠️ הזנת התפר ב-`dispCcy` ננעלת ב-**13.9g** (הצהרת התזוזה `M1` של `B-142`
    //    יושבת שם, במקום שבו האסרציה הישנה חיה) — ⛔ אין כאן עותק שני שלה.

    check("`closedPnL` צורך את הסימון ⛔ ואינו מחשב הכרעה משלו",
      /const closedPnL = useMemo\([\s\S]{0,700}?fxUnconverted/.test(app) &&
      !/const closedPnL = useMemo\([\s\S]{0,700}?accountAmount\(/.test(app));
    check("`curEquity` נבנה מ-`equityBase` + סגור + חי ⛔ ולא מ-`currentEquity`",
      /const curEquity = useMemo\(\s*\(\) => equityBase \+ closedPnL\.value \+ openPnL\.value/.test(app));
    // ⚠️ **נמדד על הקוד בלבד.** הניסוח הראשון היה `!/stats\.currentEquity/`
    // על הקובץ כולו, והוא נכשל על **שלוש הערות** שמסבירות למה השדה נעזב —
    // כלומר על התיעוד שהגל הזה נדרש לכתוב. אסרציה שמענישה הסבר מודדת נוכחות
    // של טקסט ⛔ ולא **צריכה**, וזה ⛔ אינו הנושא שלה. הנושא נשמר מילה במילה:
    // אף מסלול רינדור ⛔ אינו קורא את השדה. ⛔ הסף לא רוכך — הוא חודד.
    const code = app.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    // ⚠️ **התווית עודכנה ב-B-143, ⛔ והאסרציה לא רוככה.** "B-143 בעליו" אמר
    // שהשדה עדיין מזוהם ושגל אחר יתקן; הוא **תוקן** — `totalPnL` חד-יחידתי,
    // ו-`currentEquity` מסכים עכשיו עם `foldClosed` (15.1 · 15.2 · 15.3).
    // הדרישה כאן ⛔ לא נחלשה בעקבות זאת: הכותרת מרכיבה `equityBase + סגור +
    // **חי**`, והרגל החיה ⛔ אינה קיימת בשדה הזה ו⛔ לא תיכנס אליו (היא דורשת
    // מחירים חיים, שהם state של קומפוננטה). כלומר השדה נקי ו**עדיין** אינו
    // המקור לכותרת — שתי טענות נפרדות, ושתיהן נשמרות.
    check("⛔ `stats.currentEquity` ⛔ אינו נצרך בכותרת — נקי מ-B-143, ⛔ ועדיין חסר את הרגל החיה",
      !/stats\.currentEquity/.test(code));
    check("…ולאסרציה יש שיניים — היא רואה צריכה אמיתית כשיש כזו",
      /stats\.closedMetrics/.test(code));

    // 15.7 — הגרף והכותרת ⛔ אינם יכולים להיחלק.
    check("🔴 15.7 · עקומת ההון מדלגת על איבר מסומן",
      /generateEquityCurve[\s\S]{0,900}?fxUnconverted/.test(app));
    check("…ותלויה ב-`equityBase` — אותו בסיס שהכותרת מדפיסה",
      /generateEquityCurve\(equityBase, realTrades, stableCalcTradeMetrics\)/.test(app));

    // 15.5c — הבסיס עוקב אחרי `fxOk`, ⛔ לא אחרי עצמו. ⚠️ האסרציה הזו נמדדה
    // **אדומה** על הקוד שנדחף ב-`be41b78`, אחרי שהדפדפן הראה `$20,100.00`.
    check("🔴 15.5c · `equityBase` נופל להון הגולמי כש-`fxOk` שקר",
      /const equityBase = fxOk \? equityBaseD\.value : capital;/.test(app));

    // ה-`useMemo` המוזז — ⛔ אסור להחזירו מתחת ל-`fxOk`.
    const iEb = app.indexOf("const equityBaseD");
    const iFx = app.indexOf("const fxOk =");
    check("🔴 `equityBaseD` מחושב **מעל** `fxOk` (⛔ אחרת `fxOk` קורא ערך שטרם קיים)",
      iEb > 0 && iFx > 0 && iEb < iFx);
    check("`fxOk` צורך את הכרעת הבסיס", /const fxOk = [^\n]*equityBaseD\.ok/.test(app));

    // הגילוי — באנר **אחד** עם שלושת המונים, ⛔ לא שניים סמוכים.
    check("באנר אחד מאוחד נושא את מוני הסגור וה**חי** יחד",
      /closedPnL\.unconvertedCount/.test(app) && /openPnL\.unconvertedCount/.test(app) &&
      /openPnL\.missingCount/.test(app));
    check("⛔ המונה נמסר עם **מכנה** (§2 — אפס מנה בלי מכנה)",
      /partialSumWarn/.test(app) && /\{m\}/.test(src("../src/i18n.js")));
    // 🔴 `B-170` · 20.08 — הייתה כאן בדיקת **נוכחות מזהה**:
    //     `/mixedCurrencyCounts|tradesByCurrency/.test(app)`.
    // `mixedCurrencyCounts` נמדד **1/1 מופעים בריפו — בתוך הרגקס עצמו** ⇒ ענף
    // מת, ⛔ **והוא נמחק כאן ולא שומר.** החלופה שנשארה, `tradesByCurrency`,
    // הייתה **בדיוק** הפלט שהחזיר `{}` במצב C ⇒ הבאנר נדלק עם שורת כסף
    // **ריקה** בעוד האסרציה ירוקה. זה `R-3` על השער ה**יחיד** שמכסה את הבאנר:
    // אימות מה ש**נכתב** במקום מה ש**נראה**.
    //
    // ⇒ במקומה בדיקת **ערך** על השורה הנראית עצמה, ועוד שער שחוסם השמטה של
    // הצהרת-היחידה בארבעת אתרי הקריאה של המוצר.
    check("🔴 שורת הבאנר נבנית מ-`currencies` + `pnlByCurrency` + `tradesByCurrency` באותו map",
      /stats\.currencies\.map[\s\S]{0,260}?stats\.pnlByCurrency\[c\][\s\S]{0,120}?stats\.tradesByCurrency\?\.\[c\]/.test(app));
    {
      // הפיקסצ'ר היחיד עם **שני קודים מאומתים**: `instrumentCurrency:"ILA"`
      // הוא המסלול המדוד היחיד לקוד לא-דולרי (`provider_code` ⇒ ILS·measured).
      const teeth = [
        { id: "b1", ticker: "AAPL", currency: "USD", side: "LONG", status: "CLOSED",
          entry: 100, stop: 90, exit: 120, shares: 10, closedAt: "2026-02-10T20:00:00.000Z" },
        { id: "b2", ticker: "TEVA", instrumentCurrency: "ILA", side: "LONG", status: "CLOSED",
          entry: 100, stop: 90, exit: 110, shares: 10, closedAt: "2026-02-10T20:00:00.000Z" },
      ];
      const s = computeTradingStats(teeth, 40_000, calcTradeMetrics, null);
      const line = s.currencies
        .map((c) => `${fmt$(s.pnlByCurrency[c] ?? 0, c)} (${s.tradesByCurrency?.[c] ?? 0})`)
        .join("  ·  ");
      // ⛔ בדיקת **ערך**, ⛔ לא נוכחות שם שדה: מימוש שמחזיר פילוח ריק היה
      // מייצר "+₪0.00 (0)" או "" — ושניהם נופלים כאן.
      eq("🔴 B-170 · שורת הבאנר ב**ערך** — כל מטבע עם סכומו ומונהו",
        line, `${fmt$(100, "ILS")} (1)  ·  ${fmt$(200, "USD")} (1)`);
      check("🔴 B-170 · ⛔ ואין דלי ריק ואין מונה אפס",
        s.currencies.length === 2 && s.currencies.every((c) => s.tradesByCurrency[c] > 0));
    }
    // 🔴 `B-144` — הצהרת היחידה ⛔ אינה ניתנת להשמטה בשקט. ארבעת אתרי הקריאה
    // מוסרים `stableCalcTradeMetrics`, שהוא `makeConvertingCalc` ⇒ ה-`pnl`
    // נקוב ב-`dispCcy`. אתר שישמיט את הפרמטר הרביעי יכניס כסף מומר לדלי של
    // מטבע ה**נייר** — מספר שגוי **בשקט**, כי הבאנר מוסתר ממילא ביומן חד-מטבעי.
    {
      const sites = app.match(/useTradingStats\([^)]*\)/g) || [];
      eq("🔴 B-144 · ארבעה אתרי `useTradingStats` במוצר", sites.length, 4);
      check("🔴 B-144 · ⛔ וכולם מצהירים על יחידת ה-`pnl` (`dispCcy`)",
        sites.every((s) => /stableCalcTradeMetrics,\s*dispCcy\s*\)$/.test(s)));
    }
  }
}

// ── בלוק 15 · תעודת המקור של התווית (`B-129`) ───────────────────────────────
//
// ⚠️ **⛔ אינו כפילות של `INSTRUMENT_STATE`.** המצבים שמעל עונים על "מה אני
//    יודע על המכשיר **בקריאה**"; `CURRENCY_SOURCE` עונה על "**איך** התווית
//    נקבעה **בכתיבה**". שורה יכולה להיות `AMBIGUOUS` בקריאה ו-`file_cell`
//    בכתיבה — שתי עובדות נכונות בו-זמנית על אותה שורה.
{
  console.log("\n── 15 · תעודת המקור (B-129) ──");

  eq("חמישה ערכים, ⛔ ובלי unknown",
    Object.values(CURRENCY_SOURCE).sort().join(","),
    "account_default,broker_arithmetic,file_cell,literal_fallback,manual_capital");

  // ⚠️ שני ערכים **בכל צד**. שער שמחזיר `true` להכל, או `false` להכל, עובר
  //    כל בדיקה של צד אחד ⛔ ואינו שווה כלום.
  eq("דרגה 1 — ראיה", isEvidenceBacked(CURRENCY_SOURCE.BROKER_ARITHMETIC), true);
  eq("דרגה 2 — ראיה", isEvidenceBacked(CURRENCY_SOURCE.FILE_CELL), true);
  eq("דרגה 3 — הנחה", isEvidenceBacked(CURRENCY_SOURCE.ACCOUNT_DEFAULT), false);
  eq("דרגה 4 — הנחה", isEvidenceBacked(CURRENCY_SOURCE.LITERAL_FALLBACK), false);
  eq("ידני — הנחה", isEvidenceBacked(CURRENCY_SOURCE.MANUAL_CAPITAL), false);

  // ⛔ אין ברירת מחדל, ⛔ ואין זריקה. קלט זר הוא "לא ראיה", ⛔ לא קריסה.
  eq("ערך לא-מוכר", isEvidenceBacked("provider_api"), false);
  eq("null — שורה טרום-גל", isEvidenceBacked(null), false);
  eq("undefined", isEvidenceBacked(undefined), false);
  eq("מספר", isEvidenceBacked(1), false);
  eq("אובייקט", isEvidenceBacked({ source: "file_cell" }), false);
  eq("מחרוזת ריקה", isEvidenceBacked(""), false);
  // ⚠️ ⛔ ללא נרמול בכוונה: הערך נכתב מהקבוע, ⛔ ולא מוקלד. שער שמקבל
  //    `"File_Cell"` מזמין מסלול כתיבה שממציא ערך משלו.
  eq("⛔ אינו מנרמל רישיות", isEvidenceBacked("FILE_CELL"), false);

  // 🔴 ההפרדה עצמה: אותה תווית, שני מקורות, תשובה שונה.
  eq("אותו USD — הקובץ הצהיר",
    isEvidenceBacked(CURRENCY_SOURCE.FILE_CELL), true);
  eq("אותו USD — הליטרל ניחש",
    isEvidenceBacked(CURRENCY_SOURCE.LITERAL_FALLBACK), false);

  // ⚠️ ה-CHECK בשרת הוא מקור-האמת השני. סחיפה בין הקבוע לבין המיגרציה היא
  //    `R-6`: הלקוח היה כותב ערך שה-DB דוחה, וכל ה-INSERT היה נופל.
  const mig = src("../supabase/migrations/20260816120000_trades_provenance.sql");
  for (const v of Object.values(CURRENCY_SOURCE)) {
    check(`ה-CHECK בשרת מונה \`${v}\``, new RegExp(`'${v}'`).test(mig));
  }
  check("⛔ ואין ערך בשרת שאינו בקבוע",
    (mig.match(/'(broker_arithmetic|file_cell|account_default|literal_fallback|manual_capital|unknown)'/g) || []).length
      === Object.values(CURRENCY_SOURCE).length);
  check("⛔ `unknown` ⛔ אינו במיגרציה", !/'unknown'/.test(mig));
}

// ── בלוק 16 · `B-080` · הצהרה בקדם-המילוי, ⛔ בלי לגעת בפרומפט ───────────────
//
// ⚠️ הדרך השלישית: המטבע נגזר **בלקוח** מהטיקר שה-OCR החזיר, ⛔ ולא מתוסף
//    לחוזה ה-JSON של Vision — `B-110` ❄️ נשאר קפוא. ⛔ מכסה טיקר מספרי בלבד.
{
  console.log("\n── 16 · הצהרת מטבע בקדם-מילוי OCR (B-080) ──");

  // המקרה עצמו: מספר נייר של ת"א. ⛔ לא ILS — "לא ידוע", והמסלול הידני עומד
  // לחתום עליו את מטבע ההון.
  eq("טיקר מספרי ⛔ אינו נגזר", deriveInstrumentCurrency({ ticker: "604611" }).reason, "numeric_ticker");
  eq("...ולכן מוצהר", isUnverified(deriveInstrumentCurrency({ ticker: "604611" })), true);
  // ⚠️ הצד השני: שער שמצהיר על **כל** קריאת OCR הוא רעש, ⛔ לא הצהרה.
  eq("⛔ וטיקר אמריקאי ⛔ אינו מצהיר", isUnverified(deriveInstrumentCurrency({ ticker: "NFLX" })), false);
  eq("⛔ וגם לא זוג מט\"ח", isUnverified(deriveInstrumentCurrency({ ticker: "EURUSD" })), false);

  // שני מסלולי ה-OCR — קובץ ולכידת מסך — חייבים לשאת את אותה הצהרה.
  const app = src("../SwingEdge_App.jsx");
  const sites = (app.match(/ccyUnverified:\s*isUnverified\(deriveInstrumentCurrency\(\{ ticker: result\.ticker \}\)\)/g) || []).length;
  eq("2/2 מסלולי OCR גוזרים בקדם-המילוי", sites, 2);
  check("ההצהרה מרונדרת במודאל", /ocrStatus\?\.ccyUnverified &&/.test(app));
  // 🔴 הצהרה, ⛔ לא חסימה: אין תנאי שמוסיף `ccyUnverified` לנעילת כפתור.
  check("⛔ ואינה חוסמת שמירה", !/disabled=\{[^}]*ccyUnverified/.test(app));
}

// ── בלוק 17 · `B-172` — `currency_source` מזין `MEASURED` ────────────────────
//
// 🔴 התווית שקנתה ראיה ב**כתיבה** (`currency_source`, בלוק 15 שמעל) עכשיו
//    קונה `MEASURED` גם ב**קריאה** — בלי היסק חדש, ורק דרך `isEvidenceBacked`
//    הקיים. הענף יושב **לפני** בדיקת צורת הטיקר (מקדים גם את `pair_quote`),
//    במכוון — ראה ההערה ב-`instrumentCurrency.js` מיד אחרי `provider_code`.
{
  console.log("\n── 17 · currency_source מזין MEASURED (B-172) ──");

  // 1 — ⚠️ האסרציה שמוכיחה שהמיקום לפני ils_never_measured נכון: בלי הענף
  //     החדש, TEVA/ILS הייתה נופלת ל-CONTRADICTED.
  {
    const d = deriveInstrumentCurrency({
      ticker: "TEVA", currency: "ILS", currency_source: CURRENCY_SOURCE.BROKER_ARITHMETIC,
    });
    eq("1 · broker_arithmetic על ILS → MEASURED", d.state, MEASURED);
    eq("1 · קוד ILS", d.code, "ILS");
    eq("1 · הנימוק currency_source_evidence, ⛔ לא ils_never_measured", d.reason, "currency_source_evidence");
  }

  // 2 — file_cell, USD.
  {
    const d = deriveInstrumentCurrency({
      ticker: "AAPL", currency: "USD", currency_source: CURRENCY_SOURCE.FILE_CELL,
    });
    eq("2 · file_cell על USD → MEASURED", d.state, MEASURED);
    eq("2 · קוד USD", d.code, "USD");
    eq("2 · הנימוק currency_source_evidence", d.reason, "currency_source_evidence");
  }

  // 3 — ⛔ manual_capital הנחה, ⛔ לא ראיה. ⛔ אינה עוברת דרך הענף החדש.
  {
    const d = deriveInstrumentCurrency({
      ticker: "AAPL", currency: "USD", currency_source: CURRENCY_SOURCE.MANUAL_CAPITAL,
    });
    eq("3 · manual_capital ⛔ לא MEASURED-דרך-הענף", d.state, ASSUMED);
    eq("3 · הנימוק נשאר no_evidence_against", d.reason, "no_evidence_against");
  }

  // 4 — null — 67 השורות הישנות. ⛔ זהה להתנהגות טרום-הגל.
  {
    const d = deriveInstrumentCurrency({ ticker: "AAPL", currency: "USD", currency_source: null });
    eq("4 · currency_source:null ⛔ לא MEASURED-דרך-הענף", d.state, ASSUMED);
    eq("4 · הנימוק נשאר no_evidence_against", d.reason, "no_evidence_against");
  }

  // 5 — רגרסיה: provider_code עדיין גובר על currency_source evidence.
  {
    const d = deriveInstrumentCurrency({
      ticker: "TEVA", instrumentCurrency: "ILA", currency: "USD",
      currency_source: CURRENCY_SOURCE.BROKER_ARITHMETIC,
    });
    eq("5 · provider_code גובר", d.state, MEASURED);
    eq("5 · קוד ILS מ-ILA", d.code, "ILS");
    eq("5 · הנימוק provider_code, ⛔ לא currency_source_evidence", d.reason, "provider_code");
  }

  // 6 — רגרסיה: שלוש שורות בלי currency_source נשארות בייט-לבייט זהות לפלט
  //     מלפני הגל (pair_quote / numeric / alpha ASSUMED) — הענף החדש לא נכנס
  //     כי אין ראיה, ואז ההתנהגות הישנה חייבת לרוץ ללא שינוי.
  {
    const pair = deriveInstrumentCurrency({ ticker: "BTC-USD" });
    eq("6 · pair_quote ⛔ לא זז", pair.reason, "pair_quote");
    eq("6 · pair_quote עדיין USD", pair.code, "USD");

    const numeric = deriveInstrumentCurrency({ ticker: "604611" });
    eq("6 · numeric_ticker ⛔ לא זז", numeric.reason, "numeric_ticker");
    eq("6 · numeric_ticker נשאר AMBIGUOUS", numeric.state, AMBIGUOUS);

    const alpha = deriveInstrumentCurrency({ ticker: "NFLX", currency: "USD" });
    eq("6 · alpha ASSUMED ⛔ לא זז", alpha.reason, "no_evidence_against");
    eq("6 · alpha נשאר ASSUMED", alpha.state, ASSUMED);
  }
}

// ── SUMMARY ──────────────────────────────────────────────────────────────────
console.log("");
if (failures) {
  console.error(`❌ instrument: ${failures}/${total} assertion(s) failed.`);
  process.exit(1);
}
console.log(`✅ instrument: ${total}/${total} assertions passed — מדידה נשמרת, הסק לא נשמר, והשער יכול להיכשל.`);
