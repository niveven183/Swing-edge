// ─── POSITION SIZING — כמה מניות לקנות, ובאיזה מטבע נמדדת התשובה ────────────
//
// המודול הזה נולד משתי סיבות, ושתיהן נמדדו:
//
//   1. **החשבון רץ בשלושה מקומות.** טופס ההוספה, המנתח, ומחשבון הפוזיציה כל
//      אחד חישב `|entry−stop|` ואז חילק בהון — שלוש העתקות של אותה נוסחה, וזה
//      בדיוק המבנה שבו תיקון נוחת באחת ומחמיץ שתיים.
//
//   2. **⛔ חשבון שיושב inline בתוך JSX אינו ניתן לאסרציית ערך.** הגל הקודם
//      עבר 105 אסרציות בעוד המסך הראה מספר שגוי, מפני שכולן היו אסרציות
//      **מקור** — regex על הקוד. אסרציית מקור אינה יכולה לתפוס מספר שגוי.
//      פונקציה טהורה שאפשר לקרוא לה מטסט היא מה שהופך "4 מניות במקום 1"
//      לכשל **נצפה**, ⛔ לא להנחה.
//
// ── המטבע: הבאג שהמודול קיים כדי להרוג ──────────────────────────────────────
//
// `entry` ו-`stop` נקובים במטבע ה**נייר** (AAPL נסחרת בדולר). `capital` נקוב
// במטבע ה**הון**. החלוקה `|entry−stop| / capital` מחלקת דולרים בשקלים ומחזירה
// מספר חסר-משמעות שנראה תקין לחלוטין — ולכן איש לא ראה אותו.
//
// ⚠️ הטעות רצה תמיד לכיוון של **יותר** חשיפה: שער של ~3 ₪/$ מקטין את המכנה
// פי 3, ולכן גודל הפוזיציה יוצא **גדול פי 3** מהנכון. נמדד: הון ₪25,000,
// AAPL 304.51/250, כלל 1% ⇒ המסך אמר **4 מניות**, האמת היא **1**.
//
// ⇒ ההמרה קורית **כאן, לפני החלוקה**, ⛔ לא בשכבת התצוגה. המרה בתצוגה משנה
// את הסמל ומשאירה את המספר שגוי — וזה גרוע יותר ממספר שגוי בגלוי, כי הוא
// נראה מומר.

/**
 * @param {object}      p
 * @param {number}      p.entry      מחיר כניסה — במטבע ה**נייר**
 * @param {number}      p.stop       מחיר סטופ — במטבע ה**נייר**
 * @param {number}      p.capital    ההון — במטבע ה**הון**
 * @param {number}      p.riskPct    אחוז הסיכון המוגדר (1 = 1%)
 * @param {string}      [p.sharesOverride] דריסה ידנית; `""` = לא נגעו
 * @param {number|null} [p.rate]     שער נייר→הון. `1` = זהות · `null` = **סירוב**
 * @param {string}      [p.refusalReason] למה אין שער — הקורא יודע, ⛔ לא אנחנו
 * @returns {object}
 */
export const sizePosition = ({
  entry, stop, capital, riskPct, sharesOverride = "",
  rate = 1, refusalReason = "no_rate",
}) => {
  // ⚠️ `parseFloat` ולא `Number`: הקורא מוסר את מחרוזת הטופס הגולמית, ו-
  // `Number("304.5abc")` הוא `NaN` בעוד `parseFloat` הוא `304.5`. המעבר
  // ל-`Number` היה משנה בשקט את מה שהמשתמש רואה תוך כדי הקלדה.
  const entryN = parseFloat(entry) || 0;
  const stopN  = parseFloat(stop)  || 0;

  // ── הסירוב ──────────────────────────────────────────────────────────────
  // ⛔ אין כאן `|| 1`, ואסור שיהיה. פלט הפונקציה הזו הוא **הוראת פעולה**
  // ("קנה N מניות"), ⛔ לא תצוגה — ולכן שער מנוחש כאן אינו מספר מכוער על
  // המסך אלא פקודה בגודל שגוי. `—` מעורר שאלה; מספר שגוי ⛔ לא.
  if (!Number.isFinite(rate) || rate <= 0) {
    return {
      ok: false, reason: refusalReason,
      riskPerShare: null, posSize: null, posValue: null, potLoss: null,
      posSizeTooSmall: false, suggestedShares: null, hasSharesOverride: false,
      effShares: null, effPosValue: null, effPotLoss: null, effRiskPct: null,
    };
  }

  // ── ההמרה, **לפני** החלוקה ──────────────────────────────────────────────
  // ⚠️ בשער 1 הכפל מדויק ב-IEEE-754 (`x * 1 === x` לכל double סופי), ולכן
  // 43/46 המשתמשים הדולריים מקבלים byte-identical — נבדק ב-2,640 השוואות.
  const entryCap        = entryN * rate;
  const riskPerShareCap = Math.abs(entryN - stopN) * rate;
  const riskPerShare    = riskPerShareCap;

  const posSize  = riskPerShare > 0 ? Math.floor((capital * (riskPct / 100)) / riskPerShare) : 0;
  const posValue = posSize * entryCap;
  const potLoss  = posSize * riskPerShare;

  // רצפת המניה הבודדת: פוזיציה שמתעגלת מתחת ל-1 (מחיר גבוה · סטופ רחב · הון
  // קטן) מוצגת כ-1 ולא כ-0, ואז `isOverRisk` אומר בכנות שהיא חורגת מהאחוז.
  const posSizeTooSmall = riskPerShare > 0 && posSize === 0;
  const suggestedShares = posSizeTooSmall ? 1 : posSize;

  const overrideStr = (sharesOverride ?? "").toString();
  const overrideN   = parseInt(overrideStr, 10);
  const hasSharesOverride = overrideStr !== "" && overrideN > 0 && overrideN !== suggestedShares;
  const effShares   = overrideStr !== "" && overrideN > 0 ? overrideN : suggestedShares;

  const effPosValue = effShares * entryCap;
  const effPotLoss  = effShares * riskPerShare;
  const effRiskPct  = capital > 0 ? (effPotLoss / capital) * 100 : 0;

  return {
    ok: true, reason: null,
    riskPerShare, posSize, posValue, potLoss,
    posSizeTooSmall, suggestedShares, hasSharesOverride, effShares,
    effPosValue, effPotLoss, effRiskPct,
  };
};
