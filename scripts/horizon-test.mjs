// test:horizon — guards the trade-horizon contract (גל אופק העסקה, 2026-08-10).
//
// The contract, in one line: a trade gets a reminder ONLY when the user himself
// declared an horizon it exceeded. Everything else stays silent.
//
// Three failure classes this file exists to prevent:
//
//   1. סימון מי שלא הצהיר. 3/11 מחזיקי העסקאות הפתוחות אינם בעלי שורת
//      `user_settings` כלל (נמדד 2026-08-10). סף שנגזר להם היה מייצר את הסימן
//      היחיד שהם יראו בחייהם מהנחה שלא הם אמרו. `strategy` נעדר → אפס סימן.
//
//   2. אובדן שסתום הבריחה. `horizon: "long"` הוא הדרך היחידה של סוחר שמחזיק
//      חודשים בכוונה להשתיק את הסימן. אם הוא נשבר, הפיצ'ר הופך להצקה — וזה
//      בדיוק מה ש-docs/DECISIONS.md 2026-08-10 אוסר.
//
//   3. שמירת הסימן. הסימן נגזר בזמן רינדור ולעולם אינו נשמר. דגל ב-DB היה
//      מתיישן בשקט ברגע שהמשתמש משנה `strategy`.
//
// ⚠️ הגיל נמדד מ-`date` ולא מ-`createdAt`. נמדד 2026-08-10: 59/59 השורות
// מקיימות `createdAt::date = date`, כלומר `createdAt` נגזר מ-`date` בייבוא
// (normalizeRow.js:179) ואינו חותמת יצירת-שורה (scripts/retention.sql:10).
//
// Pure Node, no network, no DB. Run: `node scripts/horizon-test.mjs`.

import { readFileSync } from "node:fs";
import {
  openDays, isStale, horizonState, horizonThresholdDays,
  STRATEGY_THRESHOLD_DAYS, HORIZON_THRESHOLD_DAYS, HORIZON_VALUES,
} from "../src/lib/tradeHorizon.js";

// ⚠️ `total` נספר ולא נכתב ביד: המספר ב-CLAUDE.md §7 חייב מכנה שנמדד, ורוב
// הבלוקים כאן נגזרים בלולאה על הספים — ספירה ידנית הייתה מתיישנת בשקט.
let failures = 0;
let total = 0;
const check = (name, cond) => {
  total++;
  if (cond) console.log(`  ✓ ${name}`);
  else { failures++; console.error(`  ✗ ${name}`); }
};
const eq = (name, actual, expected) =>
  check(`${name} → ${JSON.stringify(expected)}`, Object.is(actual, expected));

const NOW = new Date("2026-08-10T12:00:00");
// עסקה פתוחה שנכנסה לפני `age` ימים, נכון ל-NOW.
const mk = (age, extra = {}) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() - age);
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { id: `t${age}`, ticker: "AAPL", side: "LONG", status: "OPEN", date: key, ...extra };
};

// ── 1 · הספים עצמם — ערכים מוקפאים ──────────────────────────────────────────
// אלה ההכרעה של 2026-08-10. שינוי כאן הוא החלטת מוצר ולא ריפקטור: הוא משנה
// כמה משתמשים רואים את הפיצ'ר. מספר שזז כאן חייב לעצור את הסשן.
{
  console.log("\n1 · הספים — ערכים מוקפאים");
  eq("day", STRATEGY_THRESHOLD_DAYS.day, 3);
  eq("swing", STRATEGY_THRESHOLD_DAYS.swing, 21);
  eq("combined — 21 ולא 45: 'משלב' אינו הצהרה על החזקה ארוכה",
     STRATEGY_THRESHOLD_DAYS.combined, 21);
  eq("searching — 21 ולא 45: 'עדיין מחפש' אינו הצהרה כלל",
     STRATEGY_THRESHOLD_DAYS.searching, 21);
  eq("horizon.short", HORIZON_THRESHOLD_DAYS.short, 3);
  eq("horizon.medium", HORIZON_THRESHOLD_DAYS.medium, 21);
  eq("horizon.long — null = לעולם לא מסומן", HORIZON_THRESHOLD_DAYS.long, null);
  check("ארבעת הערכים המוצהרים בלבד — אין ערך חמישי מומצא",
    JSON.stringify(Object.keys(STRATEGY_THRESHOLD_DAYS).sort()) ===
    JSON.stringify(["combined", "day", "searching", "swing"]));
  check("שלושת ערכי horizon בלבד",
    JSON.stringify([...HORIZON_VALUES].sort()) ===
    JSON.stringify(["long", "medium", "short"]));
}

// ── 2 · כל שילוב strategy × ימים, סביב הגבול ────────────────────────────────
{
  console.log("\n2 · כל strategy × ימים — הגבול עצמו כלול (>=)");
  for (const [strategy, th] of Object.entries(STRATEGY_THRESHOLD_DAYS)) {
    check(`${strategy}: ${th - 1} ימים → שקט`, isStale(mk(th - 1), { strategy, now: NOW }) === false);
    check(`${strategy}: ${th} ימים → סימן (הגבול כלול)`, isStale(mk(th), { strategy, now: NOW }) === true);
    check(`${strategy}: ${th + 1} ימים → סימן`, isStale(mk(th + 1), { strategy, now: NOW }) === true);
    check(`${strategy}: 0 ימים (נפתחה היום) → שקט`, isStale(mk(0), { strategy, now: NOW }) === false);
  }
}

// ── 3 · long לעולם לא חורג — בכל סגנון ובכל גיל ─────────────────────────────
// שסתום הבריחה. אם אחת מהשורות האלה נופלת, סוחר שמחזיק חודשים בכוונה מקבל
// סימן שאין לו דרך לכבות — הצקה, לא עזרה.
{
  console.log("\n3 · horizon:long — לעולם לא מסומן");
  for (const strategy of [...Object.keys(STRATEGY_THRESHOLD_DAYS), undefined, null, "unknown"]) {
    for (const age of [0, 3, 21, 45, 341, 10000]) {
      check(`strategy=${strategy} · ${age} ימים · long → שקט`,
        isStale(mk(age, { horizon: "long" }), { strategy, now: NOW }) === false);
    }
  }
  eq("horizonThresholdDays(long) = null", horizonThresholdDays({ strategy: "day", horizon: "long" }), null);
}

// ── 4 · היעדר strategy → אפס סימן ───────────────────────────────────────────
// 3/11 מחזיקי הפתוחות חסרים שורת user_settings כלל (נמדד). הם חייבים לראות
// שקט מוחלט — בכל גיל, כולל 341 יום.
{
  console.log("\n4 · ללא הצהרה → אפס סימן, בכל גיל");
  for (const strategy of [undefined, null, "", 0, false]) {
    for (const age of [0, 3, 21, 45, 341, 10000]) {
      check(`strategy=${JSON.stringify(strategy)} · ${age} ימים → שקט`,
        isStale(mk(age), { strategy, now: NOW }) === false);
    }
  }
  eq("סף לחסר הצהרה = null", horizonThresholdDays({ strategy: null }), null);
  eq("סף ל-strategy לא מוכר = null (שקט, לא סף מומצא)",
     horizonThresholdDays({ strategy: "scalping" }), null);
  check("ללא ארגומנטים כלל → null ולא קריסה", horizonThresholdDays() === null);
}

// ── 5 · horizon:null נופל לגזירה מהפרופיל ───────────────────────────────────
{
  console.log("\n5 · horizon נעדר → גזירה מהפרופיל");
  for (const horizon of [null, undefined, ""]) {
    eq(`horizon=${JSON.stringify(horizon)} · day → 3`,
       horizonThresholdDays({ strategy: "day", horizon }), 3);
    eq(`horizon=${JSON.stringify(horizon)} · swing → 21`,
       horizonThresholdDays({ strategy: "swing", horizon }), 21);
  }
  check("day + 3 ימים + horizon:null → סימן",
    isStale(mk(3, { horizon: null }), { strategy: "day", now: NOW }) === true);
  eq("horizonState.source = profile", horizonState(mk(3), { strategy: "day", now: NOW }).source, "profile");
}

// ── 6 · horizon פר-עסקה דורס את הפרופיל, לשני הכיוונים ─────────────────────
{
  console.log("\n6 · horizon דורס את strategy");
  check("day(3) + horizon:medium(21) · 5 ימים → שקט (הדריסה מרפה)",
    isStale(mk(5, { horizon: "medium" }), { strategy: "day", now: NOW }) === false);
  check("swing(21) + horizon:short(3) · 5 ימים → סימן (הדריסה מהדקת)",
    isStale(mk(5, { horizon: "short" }), { strategy: "swing", now: NOW }) === true);
  check("ללא strategy + horizon:short · 5 ימים → סימן (הצהרה פר-עסקה עומדת לבדה)",
    isStale(mk(5, { horizon: "short" }), { strategy: null, now: NOW }) === true);
  eq("horizonState.source = trade", horizonState(mk(5, { horizon: "short" }), { strategy: "day", now: NOW }).source, "trade");
  eq("horizon לא מוכר → null (שקט, לא נפילה לפרופיל)",
     horizonThresholdDays({ strategy: "day", horizon: "forever" }), null);
}

// ── 7 · openDays — רק עסקאות פתוחות, ולעולם לא שלילי ────────────────────────
{
  console.log("\n7 · openDays");
  eq("21 ימים", openDays(mk(21), NOW), 21);
  eq("0 ימים (היום)", openDays(mk(0), NOW), 0);
  eq("עסקה סגורה → null", openDays({ ...mk(50), status: "CLOSED" }, NOW), null);
  eq("status חסר → null", openDays({ ...mk(50), status: undefined }, NOW), null);
  eq("'open' קטנה → null (הקוד משווה גדולות בלבד)",
     openDays({ ...mk(50), status: "open" }, NOW), null);
  eq("ללא date → null", openDays({ status: "OPEN" }, NOW), null);
  eq("date לא תקין → null", openDays({ status: "OPEN", date: "לא-תאריך" }, NOW), null);
  eq("date עתידי → 0 ולא מספר שלילי", openDays(mk(-5), NOW), 0);
  eq("trade חסר → null", openDays(null, NOW), null);
  check("עסקה סגורה לעולם אינה מסומנת, בכל גיל",
    isStale({ ...mk(999), status: "CLOSED" }, { strategy: "day", now: NOW }) === false);
}

// ── 8 · המקור — הסימן נגזר ולא נשמר ─────────────────────────────────────────
// אם דגל כלשהו יגיע ל-DB הוא יתיישן ברגע שהמשתמש ישנה strategy, והיומן יציג
// סימן שאיש כבר לא יכול להסביר.
{
  console.log("\n8 · המקור — אפס כתיבת דגל ל-DB");
  const src = readFileSync(new URL("../src/lib/tradeHorizon.js", import.meta.url), "utf8");
  const cols = readFileSync(new URL("../src/supabaseClient.js", import.meta.url), "utf8");

  check("tradeHorizon.js — אפס ייבוא React", !/from\s+["']react["']/.test(src));
  check("tradeHorizon.js — אפס גישה ל-supabase", !/supabase/i.test(src.replace(/^\s*\/\/.*$/gm, "")));
  check("tradeHorizon.js — אפס כתיבה (insert/update/upsert)",
    !/\.(insert|update|upsert)\s*\(/.test(src));

  const colBlock = cols.slice(cols.indexOf("TRADE_COLUMNS"), cols.indexOf("LOCAL_ONLY"));
  check("`horizon` נמצא ב-TRADE_COLUMNS — אחרת הוא נזרק בשקט בכל כתיבה",
    /"horizon"/.test(colBlock));
  for (const flag of ["stale", "isStale", "horizonFlag", "openDays"]) {
    check(`⛔ '${flag}' אינו עמודה ב-TRADE_COLUMNS`, !new RegExp(`"${flag}"`).test(colBlock));
  }
}

// ── 9 · שני מסלולי הרינדור + הניגודיות ──────────────────────────────────────
// ⚠️ --v3-warn (#F59E0B) מוגדר ב-:root בלבד ואינו נדרס בתמה הכהה. על רקע בהיר
// הוא 2.15:1 — נכשל ב-WCAG 1.4.11 (3:1 לרכיב גרפי). זו בדיוק נפילת ארבע
// המשפחות בגל התיוג. --warning → --accent-amber הוא מודע-תמה:
// #D97706 על לבן = 3.19:1 ✓ · #F59E0B על #0d1424 = 8.56:1 ✓.
{
  console.log("\n9 · שני מסלולי הרינדור + ניגודיות");
  const app = readFileSync(new URL("../SwingEdge_App.jsx", import.meta.url), "utf8");
  const mob = readFileSync(new URL("../src/components/MobileTradeCard.jsx", import.meta.url), "utf8");

  check("דסקטופ מייבא את המודול", /tradeHorizon/.test(app));
  check("מובייל מייבא את המודול — ⛔ אחד בלי השני הוא באג מובייל", /tradeHorizon/.test(mob));

  const dot = /var\(--warning\)/;
  check("דסקטופ משתמש ב-var(--warning) המודע-תמה", dot.test(app));
  check("מובייל משתמש ב-var(--warning) המודע-תמה", dot.test(mob));

  // הטולטיפ הוא עובדה, לא הוראה.
  for (const [name, txt] of [["דסקטופ", app], ["מובייל", mob]]) {
    const near = txt.split("\n").filter(l => /tradeHorizon|horizonState|--warning/.test(l)).join("\n");
    check(`${name}: ⛔ הטולטיפ אינו ממליץ ("כדאי לסגור" / "should close")`,
      !/כדאי לסגור|should close|consider closing/i.test(near));
  }
}

// ── 10 · user-analytics — הגיל נמדד מ-`date` ─────────────────────────────────
// scripts/retention.sql:10 כבר מכריז ש-`createdAt` אינו חותמת יצירת-שורה.
// ⚠️ בגלל createdAt::date = date ב-59/59 המספר אינו זז היום — התיקון הוא נגד
// סחיפה עתידית, ברגע שתיווצר שורה שבה הם נבדלים.
{
  console.log("\n10 · user-analytics — stuck-open לפי date");
  const ua = readFileSync(new URL("../scripts/user-analytics.mjs", import.meta.url), "utf8");
  const stuck = ua.slice(Math.max(0, ua.indexOf("interval '30 days'") - 400),
                         ua.indexOf("interval '30 days'") + 200);
  check("שאילתת stuck-open אינה נשענת על createdAt",
    !/status\s*=\s*'OPEN'\s*AND\s*"createdAt"/.test(stuck));
  check("שאילתת stuck-open נשענת על date",
    /status\s*=\s*'OPEN'\s*AND\s*date/.test(ua));
}

// ── SUMMARY ──────────────────────────────────────────────────────────────────
console.log("");
if (failures) {
  console.error(`❌ horizon: ${failures}/${total} assertion(s) failed.`);
  process.exit(1);
}
console.log(`✅ horizon: ${total}/${total} assertions passed — לא מסמנים מי שלא הצהיר, long לעולם שקט, והסימן נגזר ולא נשמר.`);
