import { useEffect, useMemo, useRef, useState } from "react";
import { loadRateTable, convert } from "../lib/fx.js";
import { realizedDayKey, calcTradeMetrics } from "../utils.js";
// ⚠️ `instrumentCurrency.js` אינו מייבא דבר — אין מעגל ייבוא דרך `utils.js`.
import { deriveInstrumentCurrency, isAggregatable } from "../lib/instrumentCurrency.js";

/**
 * fxPairPlan — כמה **קריאות רשת** עולה ליומן אחד, ולמה.
 *
 * ⚠️ הכלל הזה ישב inline ב-JSX, ולכן ⛔ לא היה ניתן לאסרציית **ערך** — בדיוק
 * הכשל שהגל הקודם נפל בו (105 אסרציות מקור ירוקות מעל פיצ'ר מת). פונקציה
 * טהורה שאפשר לקרוא לה מטסט היא מה שהופך "המשתמש הדולרי משלם 0" מהבטחה
 * ל**מדידה**.
 *
 * שני צמדים נדרשים לוגית:
 *   נייר→חשבון  — להצגת כסף שהומר (טווח תאריכים, קיבוע יומי)
 *   נייר→הון     — לתמחור פוזיציה (spot בלבד)
 *
 * ⇒ שלוש תוצאות, וכל אחת נמדדת:
 *   • `base === quote` בצמד ⇒ **זהות**, ⛔ אפס רשת (`fx.js:67` מחזיר את הקלט).
 *   • `capitalCurrency === accountCurrency` ⇒ שני הצמדים **זהים** ⇒ הטבלה
 *     השנייה ממוחזרת מהראשונה, ⛔ לא נטענת פעמיים.
 *   • אחרת — שתי טבלאות. זה המחיר האמיתי, והוא מוצהר כאן.
 *
 * @returns {{ pairs: string[], network: number, reusesAccountTable: boolean }}
 */
export const fxPairPlan = (paperBase, capitalCurrency, accountCurrency) => {
  const needed = [
    [paperBase, accountCurrency],
    [paperBase, capitalCurrency],
  ];
  // ⛔ `base === quote` ⛔ אינו קריאה שנכשלת — הוא **אינו קריאה**.
  const real = needed.filter(([b, q]) => b !== q).map(([b, q]) => `${b}/${q}`);
  const pairs = [...new Set(real)];
  return {
    pairs,
    network: pairs.length,
    reusesAccountTable: capitalCurrency === accountCurrency,
  };
};

/**
 * useFxRates — fetches everything needed to express a journal in one currency.
 *
 * Two network calls total, regardless of trade count: one spot rate and one
 * date range spanning every day that has a realized trade on it. Historical
 * days come out of localStorage and are never re-fetched, because a past ECB
 * fixing is immutable.
 *
 * Returns `{ table, status }` where status is one of:
 *   "identity"  — base === quote, nothing to convert, no network touched
 *   "loading"   — request in flight; callers should NOT render converted money yet
 *   "ready"     — a usable table
 *   "unavailable" — no rate. Callers must show the ORIGINAL currency with a
 *                   marker. This is a real answer, not an error to swallow.
 */
export function useFxRates(base, quote, dayKeys) {
  const [state, setState] = useState(() =>
    base === quote ? { table: null, status: "identity" } : { table: null, status: "loading" }
  );

  // Join the day list into a primitive so the effect's dependency is a value,
  // not a fresh array identity on every render (which would re-fetch forever).
  const daysKey = useMemo(
    () => [...new Set((dayKeys || []).filter(Boolean))].sort().join(","),
    [dayKeys]
  );

  // Guards against a slow first response overwriting a fast second one when the
  // user flips the currency twice — the classic out-of-order-await bug.
  const reqIdRef = useRef(0);

  useEffect(() => {
    if (base === quote) {
      setState({ table: null, status: "identity" });
      return;
    }
    const myReq = ++reqIdRef.current;
    let cancelled = false;
    setState((s) => (s.status === "ready" ? s : { table: null, status: "loading" }));

    loadRateTable(base, quote, daysKey ? daysKey.split(",") : [])
      .then((table) => {
        if (cancelled || myReq !== reqIdRef.current) return;
        setState(
          table ? { table, status: "ready" } : { table: null, status: "unavailable" }
        );
      })
      .catch((err) => {
        if (cancelled || myReq !== reqIdRef.current) return;
        // Loud, then honest: the UI falls back to original currencies rather
        // than showing a number converted at a rate we do not have.
        console.warn(`[fx] rate table failed for ${base}/${quote}: ${err?.message || err}`);
        setState({ table: null, status: "unavailable" });
      });

    return () => { cancelled = true; };
  }, [base, quote, daysKey]);

  return state;
}

/**
 * Every LOCAL day a realized P&L lands on. This is the exact set of dates that
 * need a historical rate — asking for one range that covers them is why the
 * whole journal costs a single request.
 */
export const realizedDayKeysOf = (trades) => {
  const out = new Set();
  for (const t of trades || []) {
    const k = realizedDayKey(t);
    if (k) out.add(k);
  }
  return [...out].sort();
};

/**
 * Wrap calcTradeMetrics so P&L comes out in the DISPLAY currency, converted at
 * the rate of the day the trade was realized — not today's rate.
 *
 * This is the single seam through which conversion reaches every aggregate.
 * computeTradingStats does `{ ...trade, ...calcFn(trade) }`, so returning
 * `currency` here relabels the metric to the currency its P&L is now expressed
 * in. Without that relabel, converted dollars would be tallied under "ILS" in
 * pnlByCurrency and the mixed-currency banner would fire on a clean journal.
 *
 * Three properties worth stating because each one is a bug if reversed:
 *
 *  • rMultiple passes through UNTOUCHED. R is a ratio of two amounts in the
 *    same currency, so it is currency-invariant. Converting it would be
 *    meaningless and would move the frozen R baseline.
 *
 *  • The rate used is the trade's OWN day (realizedDayKey), never spot. A
 *    trade closed on 31.03 priced at today's rate would report a different
 *    shekel profit every morning with nobody touching it.
 *
 *  • When there is no rate, the trade is returned UNCONVERTED, keeping its
 *    original currency. It then shows up in pnlByCurrency under that currency
 *    and the mixed-currency banner tells the user the total is not a sum. That
 *    is the visible-degradation path — never a guessed rate, never a drop from
 *    the population (which would silently shrink a denominator).
 */
/**
 * accountAmount — **הכרעת ההמרה היחידה** מסכום במטבע נייר לסכום במטבע חשבון.
 *
 * ⚠️ קיים מפני שהחוזה של קטגוריה 2 (`src/utils.js`, הבלוק מעל `currencyOf`)
 * ⛔ לא היה מקוים: `makeConvertingCalc` הוזן ל-**מצרפים בלבד** (7/7), וכל אתר
 * **שורה** קרא `calcTradeMetrics` הגולמי והדביק עליו את סמל החשבון ⇒ 9/10
 * אתרי סכום-בחשבון הציגו $500 בתור "₪500". הפער לא היה בלוגיקה — הוא היה
 * בכך שללוגיקה לא הייתה **צורה שאתר-שורה יכול לקרוא**. זו הצורה.
 *
 * ⛔ אין העתקה מקבילה: `makeConvertingCalc` למטה קורא לפונקציה הזו, ולכן
 * מצרף ושורה ⛔ אינם יכולים להיפרד.
 *
 * מחזיר **הכרעה מובחנת**, ⛔ לא מספר:
 *   `{ ok:true,  reason:"identity"|"converted", value, currency }`
 *   `{ ok:false, reason:"no_amount"|"unverified_instrument"|"no_table"|<סיבת fx>,
 *      value:null, currency:null }`
 *
 * ⛔ אין `|| 1` ואין ברירת מחדל: `ok:false` הוא תשובה שהמסך **מציג** (`—`
 * עם נימוק), ⛔ לא שגיאה שנבלעת ולא שער מנוחש.
 */
export const accountAmount = (trade, amount, displayCurrency, table, status) => {
  const refuse = (reason) => ({ ok: false, reason, value: null, currency: null });
  // `== null` ⛔ ולא `Number.isFinite`: התפר המצרפי בדק בדיוק את זה, ו-NaN
  // שנכנס לכאן חייב לצאת NaN כדי ש-`money()` יציג "—" כמו קודם. שינוי לבדיקת
  // סופיות היה משנה התנהגות מצרפית שאיננו מתקנים בגל הזה.
  if (amount == null) return refuse("no_amount");
  const derived = deriveInstrumentCurrency(trade);
  // נייר שמטבעו לא אומת ⛔ אינו מומר ואינו מנוחש.
  if (!isAggregatable(derived)) return refuse("unverified_instrument");
  const from = derived.code;
  if (from === displayCurrency) return { ok: true, reason: "identity", value: amount, currency: displayCurrency };
  if (status !== "ready" || !table) return refuse("no_table");
  const { value, reason } = convert(amount, from, displayCurrency, table, realizedDayKey(trade));
  if (value == null) return refuse(reason || "no_rate");
  return { ok: true, reason: "converted", value, currency: displayCurrency };
};

export const makeConvertingCalc = (table, displayCurrency, status) =>
  (trade) => {
    const m = calcTradeMetrics(trade);
    // 🔴 מטבע ה**נייר** הנגזר, ⛔ לא `currencyOf(trade)`.
    //
    // ⚠️ קטגוריה: זהו אתר **אריתמטי**, ⛔ לא אתר תצוגה. `currencyOf` מחזיר את
    // התווית ש-`SwingEdge_App.jsx:2493` כתב מ**העדפת החשבון**, ולכן ביומן
    // שקלי הוא שווה ל-`displayCurrency` בהגדרה ⇒ השורה הבאה מדלגת על ההמרה
    // **תמיד**. זה בדיוק המנגנון שדרכו רווח דולרי נספר כשקלים.
    //
    // ⛔ אל תאחד את זה עם אתרי `currencyOf` האחרים.
    //
    // ✅ נסגר 2026-08-12 (גל ג׳): התפר הזה חדל להיות המקום ה**יחיד** שבו ההמרה
    // חיה. `accountAmount` למעלה היא ההכרעה, והיא נצרכת גם באתרי **שורה** —
    // ולכן ⛔ אין יותר "מצרף מומר / שורה לא מומרת". השורות למטה הן קריאה אחת
    // לאותה הכרעה, ⛔ לא עותק שלה.
    const d = accountAmount(trade, m.pnl, displayCurrency, table, status);
    // ⚠️ **רק** `converted` מתייג מחדש. `identity` מחזיר `m` כפי שהוא — לתייג
    // אותו היה משנה את `pnlByCurrency` ביומן חד-מטבעי, וזה ⛔ אינו הגל הזה.
    // כל `ok:false` (נייר לא מאומת · אין טבלה · אין שער ליום) מחזיר את העסקה
    // **לא מומרת** בתווית שלה: היא נספרת ב-`pnlByCurrency` ומדליקה את באנר
    // הערבוב. ⛔ לא נשמטת מהאוכלוסייה ו-⛔ לא מנוחשת.
    if (d.reason !== "converted") return m;
    return { ...m, pnl: d.value, currency: d.currency };
  };
