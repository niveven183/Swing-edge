// ─── TRADE HORIZON — כמה זמן עסקה פתוחה, ומתי זה חורג מהמוצהר ────────────────
//
// 33/59 העסקאות ביומן פתוחות, וכל ערך שהיומן מפיק נולד בסגירה: `getClosed`
// (statisticalModels.js:37) חוסמת 41 אתרי צריכה במנועים. עסקה פתוchה ותיקה היא
// לכן נקודה עיוורת מבנית — לא באג, אלא תוצאה של ההגדרה.
//
// המודול הזה גוזר תזכורת עובדתית אחת: האם עסקה פתוחה עברה את האופק שהמשתמש
// עצמו הצהיר עליו. ⛔ אינו ממליץ, אינו מדרג, ואינו כותב דבר.
//
// ── מקור הגיל: `date`, ולא `createdAt` ──────────────────────────────────────
//
// `date` הוא תאריך הכניסה בשני מסלולי הכתיבה — הידני
// (SwingEdge_App.jsx:2447 `date: todayKey()`) והייבוא (normalizeRow.js:165).
// `createdAt` נגזר ממנו בייבוא (normalizeRow.js:179 `${date}T14:30:00`), ולכן
// אינו חותמת יצירת-שורה — כפי ש-scripts/retention.sql:10 כבר קובע.
// נמדד 2026-08-10: 59/59 השורות מקיימות `createdAt::date = date`.
//
// ⚠️ `holdDays` (utils.js:45) אינה שמישה כאן: היא דורשת
// `localDayKey(trade.closedAt)`, ו-`closedAt` הוא null ב-33/33 העסקאות
// הפתוחות, כלומר היא מחזירה null לכל עסקה פתוחה מעצם הבנייה. הפונקציה כאן היא
// הנגזרת המשלימה — `date → today` במקום `date → closedAt`. שתיהן מנרמלות יום
// דרך `localDayKey` היחיד, ולכן אין כאן לוגיקת תאריך שנייה.
//
// ⚠️ נגזר בזמן רינדור. ⛔ הסימן לעולם אינו נשמר — אין דגל ב-DB, אין שדה
// בעסקה, ואין state שמחזיק אותו בין רינדורים.

import { localDayKey } from "../utils.js";

// הערכים המוצהרים באונבורדינג — 4 בלבד (OnboardingScreen.jsx:18, ואומת ב-DB:
// אותם 4 ואפס אחרים). ⛔ אין ערך "טווח ארוך" בשאלון; שסתום הבריחה הוא
// `horizon: "long"` פר-עסקה.
//
// ── למה combined ו-searching יושבים על 21 ולא על 45 ─────────────────────────
// "משלב" פירושו גמישות, ו"עדיין מחפש" פירושו היעדר הצהרה — אף אחת מהשתיים
// אינה הצהרה על החזקה ארוכה. סף 45 היה מניח כוונה ארוכת-טווח שאיש לא הצהיר
// עליה, שהיא בדיוק התמונה הראי של הבאג שהמודול הזה נמנע ממנו.
// docs/DECISIONS.md 2026-08-10.
export const STRATEGY_THRESHOLD_DAYS = Object.freeze({
  day: 3,
  swing: 21,
  combined: 21,
  searching: 21,
});

// `horizon` פר-עסקה דורס את הגזירה מהפרופיל. `long` → null = לעולם לא חורג.
export const HORIZON_THRESHOLD_DAYS = Object.freeze({
  short: 3,
  medium: 21,
  long: null,
});

export const HORIZON_VALUES = Object.freeze(["short", "medium", "long"]);

// כמה ימים העסקה פתוחה. null אם היא אינה פתוחה, אם אין `date`, או אם `date`
// אינו ניתן לפענוח. ⛔ לעולם לא שלילי: `date` עתידי מדווח 0 ולא מספר שלילי,
// כי "פתוחה מינוס 3 ימים" אינה עובדה שאפשר להציג.
export function openDays(trade, now = new Date()) {
  if (!trade || trade.status !== "OPEN") return null;
  const startKey = localDayKey(trade.date);
  const endKey = localDayKey(now);
  if (!startKey || !endKey) return null;
  const d1 = new Date(startKey + "T00:00:00").getTime();
  const d2 = new Date(endKey + "T00:00:00").getTime();
  if (isNaN(d1) || isNaN(d2)) return null;
  return Math.max(0, Math.round((d2 - d1) / 86400000));
}

// הסף בימים, או null = "אל תסמן לעולם".
//
// null מוחזר בשלושה מקרים שונים שכולם מובילים לאותה התנהגות, במכוון:
//   1. `horizon: "long"` — המשתמש הצהיר במפורש שהוא מחזיק לטווח ארוך.
//   2. אין `strategy` — המשתמש לא הצהיר על דבר. ⛔ סימון מי שלא הצהיר הוא
//      ההצקה שהמודול הזה קיים כדי למנוע: הסימן היחיד שהוא יראה בחייו היה
//      נגזר מהנחה שלא הוא אמר.
//   3. `strategy` שאינו מוכר — סחיפה בשאלון. שקט עדיף על סף מומצא.
export function horizonThresholdDays({ strategy, horizon } = {}) {
  if (horizon != null && horizon !== "") {
    return Object.prototype.hasOwnProperty.call(HORIZON_THRESHOLD_DAYS, horizon)
      ? HORIZON_THRESHOLD_DAYS[horizon]
      : null;
  }
  if (!strategy) return null;
  return Object.prototype.hasOwnProperty.call(STRATEGY_THRESHOLD_DAYS, strategy)
    ? STRATEGY_THRESHOLD_DAYS[strategy]
    : null;
}

// האם העסקה חורגת מהאופק. boolean בלבד — ⛔ בלי דירוג, בלי חומרה, בלי המלצה.
export function isStale(trade, { strategy, now = new Date() } = {}) {
  const threshold = horizonThresholdDays({ strategy, horizon: trade?.horizon });
  if (threshold == null) return false;
  const days = openDays(trade, now);
  if (days == null) return false;
  return days >= threshold;
}

// כל מה שהתצוגה צריכה, בקריאה אחת — כדי שהיומן לא יגזור פעמיים.
// `days` מוחזר גם כשאין חריגה, כי הטולטיפ מציג עובדה ולא רק אזהרה.
export function horizonState(trade, { strategy, now = new Date() } = {}) {
  const days = openDays(trade, now);
  const threshold = horizonThresholdDays({ strategy, horizon: trade?.horizon });
  return {
    days,
    threshold,
    stale: threshold != null && days != null && days >= threshold,
    source: trade?.horizon ? "trade" : strategy ? "profile" : null,
    // הבסיס שממנו נגזר הסף — לטולטיפ, כדי שהמשתמש יראה על מה זה נשען.
    basis: trade?.horizon || strategy || null,
  };
}

// הטולטיפ. ⛔ עובדה, לא הוראה: כמה ימים פתוחה ועל בסיס מה — ובלי "כדאי
// לסגור". הסימן מדווח מצב; ההחלטה היא של הסוחר. יושב כאן ולא בשני מסלולי
// הרינדור כדי שדסקטופ ומובייל לא יסחפו לשני נוסחים.
const BASIS_HE = { short: "אופק קצר", medium: "אופק בינוני", day: "דיי-טרייד", swing: "סווינג", combined: "משולב", searching: "עדיין מחפש" };
const BASIS_EN = { short: "short horizon", medium: "medium horizon", day: "day trading", swing: "swing", combined: "combined", searching: "still exploring" };

export function horizonLabel(state, lang = "en") {
  if (!state || state.days == null) return "";
  const he = lang === "he";
  const map = he ? BASIS_HE : BASIS_EN;
  const basis = map[state.basis] || state.basis || "";
  const perTrade = state.source === "trade";
  if (he) {
    const src = perTrade ? `אופק שהוגדר לעסקה: ${basis}` : `הסגנון המוצהר שלך: ${basis}`;
    return `פתוחה ${state.days} ימים · ${src}`;
  }
  const src = perTrade ? `horizon set for this trade: ${basis}` : `your declared style: ${basis}`;
  return `Open ${state.days} days · ${src}`;
}
