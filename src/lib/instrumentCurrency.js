// ─── INSTRUMENT CURRENCY — באיזה מטבע נסחר הנייר, ומתי איננו יודעים ──────────
//
// מטבע נייר הערך נגזר משוק המסחר ולעולם לא מהעדפת המשתמש. מקור שאינו זמין
// מייצר "לא-מאומת", ⛔ לא ניחוש — ניחוש הוא הבאג שהמודול הזה סוגר.
//
// הבאג: `SwingEdge_App.jsx` חתם על כל עסקה ידנית `currency: capitalCurrency`,
// כלומר כתב את העדפת החשבון כמטבע הנייר. אצל משתמשי דולר זה יצא נכון
// **במקרה**, ולכן שלושה שערי הגנה בלתי תלויים בדקו `currencyOf(t) ===
// capitalCurrency` — בדיקה שמסלול הכתיבה הבטיח שתהיה אמת. שער שאינו יכול
// להיכשל אינו שער.
//
// ── מדידה נשמרת. הֶסֵּק לעולם לא נשמר ───────────────────────────────────────
//
// תצפית של ספק ברגע הרישום אינה ניתנת לשחזור מאוחר — `AAPL` הוא USD ב-NASDAQ,
// ARS ב-BYMA ו-CAD ב-TSX (נמדד 2026-08-11) — ולכן ראויה לאחסון. הסקה מהסימבול,
// לעומת זאת, נגזרת בזמן קריאה ולעולם אינה נשמרת: אין דגל ב-DB, אין שדה בעסקה,
// ואין state שמחזיק אותה בין רינדורים. מספר שנגזר לא מתיישן.
//
// 🔴 **הפסקה הזו הייתה שגויה עד 20.08, וההפרכה נמדדה ב-`B-144`.** היא טענה
// ש-`trades.currency` נושא `CHECK (currency IN ('USD','ILS'))` ולכן `ILA` אינו
// ניתן לאחסון. נמדד ב-`pg_get_constraintdef` (20.08):
// `CHECK (currency IS NULL OR currency = ANY ('{USD,ILS,ILA,EUR,GBP}'))`
// ⇒ **המיגרציה כבר נפתחה**, ו-`ILA` **כן** ניתן לאחסון.
//
// ⚠️ **ו⛔ זה לא מדליק את `MEASURED` — הענף נשאר בלתי-נגיש בפרודקשן, מסיבה
// אחרת לגמרי.** `MEASURED` נגזר מ-`trade.instrumentCurrency` (שדה על אובייקט
// העסקה), ⛔ **לא** מ-`trades.currency`. נמדד 20.08:
//   • `{ticker:"TEVA", currency:"ILA"}`            → `assumed/USD` — התווית מוזנחת
//   • `{ticker:"TEVA", instrumentCurrency:"ILA"}`  → `measured/ILS/provider_code`
//   • ל-`trades` ⛔ **אין עמודת `instrument_currency`** (נמדד ב-
//     `information_schema.columns`: `user_id`·`settings`·`updated_at` בלבד
//     ל-`user_settings`, ושאילתה על `t.instrument_currency` נפלה ב-`42703`)
//   • ⛔ **אף מסלול קוד בפרודקשן ⛔ אינו כותב `instrumentCurrency`** על אובייקט
//     עסקה — `grep` על `src`·`SwingEdge_App.jsx`·`api`·`scripts` מחזיר ייבוא
//     בלבד; ההופעות היחידות שמציבות ערך הן **fixtures של טסטים**.
//
// ⇒ **המסקנה המדודה, ו⛔ היא חייבת להיאמר בקול:** 324/324 צירופים של
// (9 טיקרים × 6 ערכי `currency` × 6 ערכי `currency_source`) מחזירים קוד
// aggregatable **יחיד: `USD`**. ⇒ `codes.size > 1` ב-`isMixedCurrency` הוא
// **בלתי-נגיש בפרודקשן היום**, ⇒ `mixedCurrency === false` לכל משתמש, כל יומן,
// תמיד. ⚠️ **זו ⛔ אינה הצדקה לרכך את השער** — הסמנטיקה הישנה ירתה על **כל**
// יומן שיש בו נייר לא-מאומת, וזה היה הבאג. אבל ⛔ אסור לקרוא «הבאנר נעדר»
// כהצלחה של הגזירה: היום הוא נעדר כי **אין לו איך להידלק**. ⇒ `B-172`.
//
// ── למה `^\d+$ → ILS` נפסל ───────────────────────────────────────────────────
//
// נמדד 2026-08-11 מול TradingView: טיקרים מספריים חיים ב-SSE ו-SZSE (אג"ח
// סיניות) וב-MILSEDEX (מוצרים מובנים ב-EUR), ואילו ת"א דווקא **אינה** מאונדקסת
// לפי המספר אלא לפי הטיקר האלפביתי. ארבעת הטיקרים המספריים שביומן החזירו
// אג"ח סינית ומוצר מובנה איטלקי — ובהתאמה מטושטשת, כלומר **סימבול אחר**.
// כלל כזה היה מסמן אג"ח סינית כישראלית באגורות. ⇒ מספרי = לא-מאומת.
//
// ⚠️ זה אינו סותר את ההוכחה האריתמטית ש-13 השורות **הללו** נקובות באגורות
// (חשיפה 101.5455× ההון כיחידות, 1.0155× כאגורות). ההוכחה תקפה לשורות ההן
// ומשמשת בתיקון הנתונים; היא אינה מכשירה חוק גזירה כללי. שתי טענות שונות.
//
// ── אגורות ──────────────────────────────────────────────────────────────────
//
// TradingView מחזיר לניירות ת"א `currency_code: "ILA"` — קוד האגורה. עובדת
// האגורות מקודדת **במטבע עצמו**, ולכן אין צורך בשדה `unit`/`divisor` נפרד.
// נמדד: מניות ת"א וקרנות סל → `ILA`; אג"ח ומדדים → `null`, כלומר אין מטבע
// כלל ⇒ לא-מאומת. ⛔ לא כל מכשיר ת"א נקוב באגורות מבחינת הספק.
//
// ⛔ `minorUnit` נגזר ומדווח, ואינו מיושם על שורות קיימות כאן.
//
// Pure. ⛔ אפס React · אפס רשת · אפס DB. נבדק ב-node:
// `node scripts/instrument-currency-test.mjs`.

// ─── מצבי הראיה ──────────────────────────────────────────────────────────────
// שניים נכנסים לחישוב כסף מצרפי, שניים לא. ההבחנה אינה "טוב/רע" אלא
// "האם מותר לחלק את זה בהון".
export const INSTRUMENT_STATE = {
  MEASURED:     "measured",      // קוד מספק, או מטבע שמופיע בשם המכשיר
  ASSUMED:      "assumed",       // אין ראיה נגד — נכנס למצרפי, וההנחה מוצהרת
  CONTRADICTED: "contradicted",  // ראיה חיובית שהתווית השמורה שגויה
  AMBIGUOUS:    "ambiguous",     // צורת הסימבול אינה מכריעה
};

const { MEASURED, ASSUMED, CONTRADICTED, AMBIGUOUS } = INSTRUMENT_STATE;

// ─── תעודת המקור של התווית השמורה (`B-129`) ─────────────────────────────────
//
// ⚠️ `INSTRUMENT_STATE` שמעל עונה על "מה אני יודע על המכשיר **בקריאה**".
// זה עונה על שאלה אחרת לגמרי: "**איך** התווית שב-DB נקבעה **בכתיבה**".
//
// נמדד 16.08 (`docs/audits/AUDIT-B129.md`): סולם ארבע-הדרגות של הייבוא
// (`src/import/normalizeRow.js`) מכריע נכון — ⛔ אך כותב למחרוזת שטוחה אחת.
// דרגות 1–2 קונות את התווית ב**ראיה**; דרגות 3–4 **מנחשות** אותה. אחרי
// הכתיבה שתי התוצאות זהות בכל בית, ולכן `USD` על 13 שורות ת"א נראה בדיוק
// כמו `USD` שהקובץ הצהיר עליו.
//
// ⛔ אין כאן `unknown`. "לא ידוע" הוא המצב שהמודול הזה מתקן, וערך כזה היה
//    מאפשר למסלול כתיבה חדש להצהיר כלום ולעבור. `null` = נכתב לפני הגל.
export const CURRENCY_SOURCE = {
  BROKER_ARITHMETIC: "broker_arithmetic", // דרגה 1 — ראיה: נגזר מהאריתמטיקה של השורה
  FILE_CELL:         "file_cell",         // דרגה 2 — ראיה: הקובץ הצהיר בתא ממופה
  ACCOUNT_DEFAULT:   "account_default",   // דרגה 3 — הנחה: מטבע ההון
  LITERAL_FALLBACK:  "literal_fallback",  // דרגה 4 — הנחה: הליטרל "USD"
  MANUAL_CAPITAL:    "manual_capital",    //        — הנחה: לטופס הידני אין שדה מטבע
};

// שתי הדרגות שקנו את התווית בראיה. ⛔ הרשימה נגזרת מ-`CURRENCY_SOURCE`
// ⛔ ואינה מחרוזות חוזרות — `R-6` הוא בדיוק שתי רשימות שנסחפות.
const EVIDENCE_SOURCES = new Set([
  CURRENCY_SOURCE.BROKER_ARITHMETIC,
  CURRENCY_SOURCE.FILE_CELL,
]);

// ⚠️ ⛔ אינו זורק על ערך לא-מוכר ו-⛔ אינו מחזיר `true`: מקור שאיננו מכירים
// הוא ⛔ לא ראיה. ‏`null` (שורה טרום-גל) נופל לאותו ענף — וזה נכון: על שורה
// כזו ⛔ אין לנו תעודה, ולכן ⛔ אין לנו ראיה.
export const isEvidenceBacked = (source) =>
  typeof source === "string" && EVIDENCE_SOURCES.has(source);

// ⚠️ רשימה סגורה. קוד שאינו כאן מחזיר null ו-⛔ לא ברירת מחדל: "לא מוכר"
// ו-"דולר" הם שתי תשובות שונות, וההבדל ביניהן הוא כל המודול.
// `ILA` = אגורה. ת"א מצטטת באגורות, והספק אומר זאת במטבע עצמו.
const PROVIDER_CURRENCY = {
  USD: { code: "USD", minorUnit: 1 },
  ILS: { code: "ILS", minorUnit: 1 },
  ILA: { code: "ILS", minorUnit: 100 },
};

const NUMERIC_TICKER = /^\d+$/;
const ALPHA_TICKER   = /^[A-Z][A-Z.\-]*$/;

// ⚠️ נמדד ב-DB 2026-08-11: 36 טיקרים גולמיים מול 35 אחרי trim — `"ASTS  "`
// יושב כשורה נפרדת מ-`"ASTS"`. הגזירה מנרמלת בקריאה כדי שהשורה ההיא לא
// תישאר יתומה; מסלול הכתיבה תוקן בנפרד ו-⛔ השורה הקיימת לא נגעה.
export const normalizeTicker = (raw) =>
  typeof raw === "string" ? raw.trim().toUpperCase() : "";

// מקבל קוד ספק גולמי ומחזיר את המטבע והיחידה, או null.
// ⛔ אין ברירת מחדל. קלט שאינו מחרוזת, ריק, או קוד שאינו ברשימה → null.
export const normalizeProviderCurrency = (raw) => {
  if (typeof raw !== "string") return null;
  const key = raw.trim().toUpperCase();
  return PROVIDER_CURRENCY[key] ? { ...PROVIDER_CURRENCY[key] } : null;
};

// ─── זוג קריפטו — המקום היחיד שבו מחרוזת נחשבת ראיה ──────────────────────────
//
// `BTCUSD` אינו סימבול שיש לו מטבע — הוא **יחס**, וה-USD בשמו הוא המכנה. זו
// קריאה של שם המכשיר, ⛔ לא הסקה עליו. נתמך בשתי מדידות בלתי תלויות: TV
// מחזיר USD ב-4/4 הבורסות, ו-`api/quote.js` מבקש `vs_currency=usd` מפורשות.
//
// ⚠️ זהו המקום היחיד במודול שבו מחרוזת נחשבת ראיה, והוא מוגבל בשלוש דרכים:
//   1. `USD` בלבד. ⛔ `USDT` אינו כאן — הוא סטייבלקוין, לא דולר, וזוג הנקוב
//      בו נסחר ב-USDT. לקרוא לו USD היה בדיוק ההנחה שהמודול קיים כדי למנוע.
//   2. בסיס באורך ≥ 3 ⇒ מינימום 6 תווים. מניה אמריקאית רגילה מוגבלת ל-5,
//      ולכן `BE`/`PLTR`/`SOXL` ⛔ אינם יכולים ליפול לענף הזה.
//   3. `USD` לבדו ⛔ אינו זוג — הבסיס ריק.
const PAIR_QUOTE = { USD: "USD" };
const PAIR_MIN_BASE = 3;

export const pairQuoteCurrency = (ticker) => {
  const t = normalizeTicker(ticker).replace(/[-/]/g, "");
  for (const suffix of Object.keys(PAIR_QUOTE)) {
    if (!t.endsWith(suffix)) continue;
    const base = t.slice(0, -suffix.length);
    if (base.length >= PAIR_MIN_BASE && ALPHA_TICKER.test(base)) return PAIR_QUOTE[suffix];
  }
  return null;
};

const unmeasured = (state, reason) => ({ code: null, minorUnit: null, state, reason });

/**
 * גוזר את מטבע נייר הערך מהראיה החזקה ביותר שקיימת.
 *
 * ⚠️ נגזר בזמן קריאה. ⛔ לעולם אינו נשמר.
 *
 * @param {object} trade
 * @param {object} [opts]
 * @param {string} [opts.providerCurrency] קוד ספק שנמדד ברגע הרישום.
 * @returns {{code: string|null, minorUnit: number|null, state: string, reason: string}}
 */
export const deriveInstrumentCurrency = (trade, opts = {}) => {
  // 1. קוד ספק שנמדד — גובר על הכל, כולל התווית השמורה.
  //    ⚠️ נכון להיום 0/61 השורות נושאות אותו; הענף קיים לקראת המיגרציה.
  const measured = normalizeProviderCurrency(
    trade?.instrumentCurrency ?? opts.providerCurrency
  );
  if (measured) return { ...measured, state: MEASURED, reason: "provider_code" };

  const ticker = normalizeTicker(trade?.ticker);
  if (!ticker) return unmeasured(AMBIGUOUS, "no_ticker");

  // 2. זוג שהמטבע מופיע בשמו.
  const pair = pairQuoteCurrency(ticker);
  if (pair) return { code: pair, minorUnit: 1, state: MEASURED, reason: "pair_quote" };

  // 3. טיקר מספרי — לא ייחודי לת"א. ⛔ לא ILS.
  if (NUMERIC_TICKER.test(ticker)) return unmeasured(AMBIGUOUS, "numeric_ticker");

  if (ALPHA_TICKER.test(ticker)) {
    const stored =
      typeof trade?.currency === "string" ? trade.currency.trim().toUpperCase() : null;

    // 4. תווית ILS על טיקר אלפביתי היא ראיה נגד עצמה: אין מסלול שבו ILS נמדד
    //    אי-פעם (0/61), ולכן היא יכולה היה להיכתב רק מהעדפת החשבון. זו עדות
    //    על המשתמש, ⛔ לא על הנייר.
    if (stored === "ILS") return unmeasured(CONTRADICTED, "ils_never_measured");

    // 5. אין ראיה נגד. נכנס למצרפי — וההנחה מוצהרת בממשק.
    return { code: "USD", minorUnit: 1, state: ASSUMED, reason: "no_evidence_against" };
  }

  return unmeasured(AMBIGUOUS, "unrecognized_ticker");
};

// המטבע ש**כל** נייר מאומת נקוב בו היום. ⚠️ אינו הנחה נוחה — הוא מדידה:
// הקבוצה הנגזרת סגורה על {USD, ILS}, ו-`MEASURED ILS` נמדד **0 מתוך 61**
// (`ils_never_measured` ב-:148 הוא הסיבה). ⇒ טבלת שער אחת, USD→X, מכסה כל
// נייר שאפשר בכלל לצרף.
//
// ⚠️ ביום שבו נייר ILS **יימדד** (שורות ת"א עם קוד ספק), הקבוע הזה מפסיק
// להספיק ונדרשת טבלה פר-מטבע-נייר. `test:instrument` בלוק 5–7 הוא מה שיתפוס
// את היום הזה — ⛔ לא ההערה הזו.
export const PAPER_BASE = "USD";

// המצרפי שגוי כשהקבוצה מעורבת, ⛔ לא כשמקור השורה לא נרשם. `ASSUMED` נכנס
// לכן פנימה — הוצאתו הייתה מרוקנת את המוצר בלי להרוויח דיוק אחד.
export const isAggregatable = (derived) =>
  derived?.state === MEASURED || derived?.state === ASSUMED;

export const isUnverified = (derived) => !isAggregatable(derived);

// השער שהחליף את `currencyOf(t) === capitalCurrency`. ⚠️ ההבדל אינו סגנוני:
// הביטוי הישן קרא את התווית ש-`:2457` כתב מהעדפת החשבון, ולכן החזיר `true`
// בהגדרה. כאן צד שמאל הוא מטבע ה**נייר** ⇒ השער יכול להיכשל.
export const matchesCapital = (derived, capitalCurrency) =>
  isAggregatable(derived) && derived.code === capitalCurrency;

/**
 * האם היומן מחזיק **יותר מתווית-נייר מאומתת אחת**.
 *
 * 🔴 **B-144 · 20.08 — ההכרעה שהפכה את הסמנטיקה, ולמה.** עד לתאריך הזה
 * הפונקציה החזירה `true` גם על נייר **אחד** שמטבעו לא אומת, בנימוק
 * ⟪"לא ידוע" אינו "כמו כולם"⟫. הנימוק נכון על מצב ה**ידיעה** של המערכת —
 * וזו ⛔ אינה הטענה שהצרכן היחיד מדפיס. הבאנר אומר ⟪היומן מחזיק יותר
 * ממטבע אחד⟫: טענה על ה**נתונים של המשתמש**. משתמש עם שתי מניות
 * אמריקאיות שרואה "מטבע מעורב" מקבל **מידע שגוי על היומן שלו** — `R-2`,
 * ברירת מחדל שממציאה במקום להודות.
 *
 * ⇒ ⛔ **`hasUnverified` אינו מדליק את הבאנר.** מה שלא אומת ⛔ אינו נבלע:
 * `amountAt` מסרב עליו `unverified_instrument` **לפני** שער ה-`identity`
 * (`useFxRates.js:174`) ⇒ הוא מסומן `fxUnconverted` בכל מסלול, נספר
 * ב-`fxUnconvertedCount`, ומדווח בבאנר `partialSumWarn` — **עם מונה
 * ומכנה**, ב-5 שפות. הגילוי כבר קיים; מסר שני היה `R-6`.
 *
 * ⚠️ ולכן «לעולם לא יורה» הוא כישלון בדיוק כמו הבאג: `test:tradingstats`
 * בלוק 12.T ו-`test:instrument` §4 מחזיקים פיקסצ'ר שבו הוא **חייב** לירות
 * (`instrumentCurrency:"ILA"` ⇒ `ILS · measured`).
 *
 * 🔴 **ו-20.08 נמדד שהפיקסצ'ר הזה הוא ה**מקום היחיד** שבו הוא יורה.** בפרודקשן
 * `codes.size > 1` **בלתי-נגיש** — 324/324 צירופים מחזירים `USD` בלבד, כי
 * `instrumentCurrency` ⛔ אינו נכתב ע"י אף מסלול קוד. ⇒ הפונקציה נכונה ו**רדומה**
 * כאחת. ⛔ **אל תקרא «הבאנר נעדר» כאימות של הגזירה** — ראה הבלוק בראש הקובץ
 * ו-`B-172`.
 */
export const isMixedCurrency = (derivations = []) => {
  const codes = new Set();
  for (const d of derivations) if (isAggregatable(d)) codes.add(d.code);
  return codes.size > 1;
};
