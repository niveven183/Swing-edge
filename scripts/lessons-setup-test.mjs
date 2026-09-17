#!/usr/bin/env node
/**
 * lessons-setup-test.mjs — B-326 · כרטיס «הסטאפ החזק ביותר» ב-generateSmartLessons
 *
 * 🔴 **מה נמדד:** הכרטיס המליץ **להגדיל את גודל הפוזיציה** על סטאפ מפסיד.
 * נצפה בפרודקשן 16.09: «`Unknown` הוא הסטאפ החזק ביותר שלך · 33% הצלחה על פני
 * 3 עסקאות» + «הגדל את גודל הפוזיציה» — על אותו מסך שהציג `PF 0.20`.
 * שני שורשים נפרדים, ושניהם נסגרים כאן:
 *   (ד) המלצת ההגדלה **מרותכת** למחרוזת (`:773`/`:779`) — ⛔ אין תנאי, ⛔ אין
 *       טרנרי. ⇒ **הסרה**, ⛔ ניסוח מחדש.
 *   (ג) `Unknown` ⛔ מוחרג מן המועמדות — `tradingStats.js:417` ממפה
 *       `(raw ?? "").toString().trim() || "Unknown"` ⇒ סטאפ ש⛔ **נרשם** הופך
 *       לקבוצה שוות-זכויות. ⇒ **סינון לפני ה-`sort`**.
 *
 * ⚠️ **`B-331` ⛔ נסגר כאן ו⛔ ממוצב כאן.** הוא שואל «איך בוחרים מתוך
 * האוכלוסייה» (`argmax` לפני שער `count>=2`) בעוד זה שואל «מי נכנס אליה».
 * ⛔ אין כאן אסרציה שמקבעת את סדר הבחירה — קיבוע כזה היה הופך באג פתוח לחוזה.
 *
 * ⚠️ זו ⛔ «בדיקת טקסט». הבייטים שמורצים כאן הם הבייטים שבקובץ המוצר:
 * `generateSmartLessons` ו-`snakeToTitle` מחולצים מ-`SwingEdge_App.jsx` לפי עוגן
 * ומורצים ב-`new Function` עם `outcomeRates` · `labelFor` · `fmtPrice`
 * ה**אמיתיים**, ו-`stats` מגיע מ-`computeTradingStats` ה**אמיתי** — סטאב היה
 * מודד את הסטאב, ובפרט ⛔ היה נוגע בליטרל `"Unknown"` שנמדד כשורש.
 * למה חילוץ ⛔ import: 61 `import` ברמה העליונה גוררים את כל גרף האפליקציה.
 * אותה הכרעה בדיוק כמו `hydration-wiring-test.mjs` · `short-pnl-pct-test.mjs`.
 *
 * ⛔ **כשל חילוץ הוא אדום קשה ⛔ ולעולם לא דילוג** (`B-272`) — 4 שערי-מטא.
 *
 * ⚠️ **זרוע הביקורת (`K*`) היא מה שמודדת את *רוחב* הסינון.** אדום שם פירושו
 * שסטאפ אמיתי נעלם ⇒ **עצור**, הסינון רחב מדי.
 *
 * ⛔ **מה זה ⛔ אינו מוכיח:** שהכרטיס מרונדר · JSX · React · דפדפן אמיתי ·
 * פרודקשן. אותו גבול בדיוק של `C-036`·`C-038`·`C-039`·`C-041`·`C-043`·`C-049`.
 */
import { readFileSync } from "node:fs";
import { computeTradingStats } from "../src/lib/tradingStats.js";
import { calcTradeMetrics, fmtPrice } from "../src/utils.js";
import { outcomeRates } from "../src/intelligence/utils/statisticalModels.js";
import { labelFor } from "../src/i18n.js";

const argv = process.argv.slice(2);
const appIdx = argv.indexOf("--app");
const APP = appIdx >= 0 ? argv[appIdx + 1] : new URL("../SwingEdge_App.jsx", import.meta.url).pathname;
const src = readFileSync(APP, "utf8");

let pass = 0, fail = 0;
const reds = [];
function ok(id, label, cond, got) {
  if (cond) { pass++; console.log(`${id} ${label}: ${got} ✓`); }
  else { fail++; reds.push(id); console.log(`${id} ${label}: ${got} ✗ RED`); }
}

/* ── מטא ─── כשל חילוץ הוא אדום קשה ⛔ ולעולם לא דילוג (B-272) ────────────── */
function countOccurrences(hay, needle) {
  let n = 0, i = 0;
  for (;;) { const j = hay.indexOf(needle, i); if (j < 0) break; n++; i = j + needle.length; }
  return n;
}

const A_GEN = "const generateSmartLessons = ";
const A_SNAKE = "const snakeToTitle = ";

const nGen = countOccurrences(src, A_GEN);
ok("M1", "עוגן `const generateSmartLessons = ` מופיע בדיוק פעם אחת", nGen === 1, `${nGen}`);
const nSnake = countOccurrences(src, A_SNAKE);
ok("M2", "עוגן `const snakeToTitle = ` מופיע בדיוק פעם אחת", nSnake === 1, `${nSnake}`);
if (nGen !== 1 || nSnake !== 1) { console.log("\n⛔ חילוץ נכשל — אדום קשה, ⛔ לא דילוג."); process.exit(1); }

// snakeToTitle — ביטוי בן שורה אחת, מסתיים בנקודה-פסיק הראשונה.
const snakeStart = src.indexOf(A_SNAKE);
const snakeStmt = src.slice(snakeStart, src.indexOf(";", snakeStart) + 1);

// generateSmartLessons — ספירת סוגריים מסולסלים מן ה-`{` הראשון של הגוף.
const genStart = src.indexOf(A_GEN);
const bodyOpen = src.indexOf("{", src.indexOf("=>", genStart));
let depth = 0, bodyEnd = -1;
for (let i = bodyOpen; i < src.length; i++) {
  if (src[i] === "{") depth++;
  else if (src[i] === "}") { depth--; if (depth === 0) { bodyEnd = i; break; } }
}
const genStmt = bodyEnd < 0 ? "" : src.slice(genStart, bodyEnd + 1) + ";";
ok("M3", "סוגריים מסולסלים מאוזנים בגוף שחולץ", bodyEnd > 0 && depth === 0,
   bodyEnd > 0 ? `${genStmt.split("\n").length} שורות` : "לא נסגר");
if (bodyEnd < 0) { console.log("\n⛔ חילוץ נכשל — אדום קשה."); process.exit(1); }

let generateSmartLessons = null;
let buildErr = "";
try {
  generateSmartLessons = new Function(
    "outcomeRates", "labelFor", "fmtPrice",
    `${snakeStmt}\n${genStmt}\nreturn generateSmartLessons;`
  )(outcomeRates, labelFor, fmtPrice);
} catch (e) { buildErr = e.message; }
ok("M4", "הגוף שחולץ נבנה ב-new Function ללא שגיאת תחביר", typeof generateSmartLessons === "function",
   buildErr || "נבנה");
if (typeof generateSmartLessons !== "function") { console.log("\n⛔ חילוץ נכשל — אדום קשה."); process.exit(1); }

/* ── בניית ג'ורנלים מול ה-hub האמיתי ─────────────────────────────────────── */
const mk = (i, setup, win) => ({
  id: "t" + i, ticker: "AAPL", side: "LONG", status: "CLOSED",
  entry: 100, exit: win ? 110 : 95, shares: 10, stopLoss: 90,
  date: "2026-09-01", setup, emotion: "Confident", currency: "USD",
});
const hub = (trades) => computeTradingStats(trades, 10000, calcTradeMetrics, "USD");
const run = (trades, lang) => generateSmartLessons(trades, hub(trades), calcTradeMetrics, lang, "USD");
const strengths = (ls) => ls.filter(l => l.type === "strength");
const blob = (ls) => ls.map(l => `${l.title} ${l.detail} ${l.action}`).join(" | ");

// הג'ורנל שנצפה בפרודקשן 16.09: 3 סגורות · סטאפ ⛔ רשום · 1W/2L.
const J_UNKNOWN = [mk(1, "", true), mk(2, "", false), mk(3, null, false)];
// בקרה א׳ — סטאפ אמיתי. n=5 ⇒ 4/5 = 80% (⚠️ `70%` ⛔ ניתן לייצוג ב-n=5).
const J_REAL5 = [1, 2, 3, 4, 5].map(i => mk(i, "breakout", i <= 4));
// בקרה א׳ — ובדיוק `70%`, שמחייב n=10 ⇒ 7/10.
const J_REAL10 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => mk(i, "breakout", i <= 7));

const PHRASE_HE = "הגדל את גודל הפוזיציה";
const PHRASE_EN = "increase position size";

/* ── בלוק 1 — (ד) ההמלצה הכספית הוסרה משתי המחרוזות ──────────────────────── */
{
  const s = strengths(run(J_REAL5, "he"))[0];
  ok("V1", "בקרה א׳ he: כרטיס החוזק קיים", !!s, s ? s.title : "⛔ אין כרטיס");
  ok("V2", "he: ה-action ⛔ מכיל «הגדל את גודל הפוזיציה»",
     !!s && !s.action.includes(PHRASE_HE), s ? JSON.stringify(s.action) : "—");
  ok("V3", "he: ה-action הוא בדיוק «חפש עוד סטאפים של X.» (הסרה, ⛔ ניסוח מחדש)",
     !!s && s.action === `חפש עוד סטאפים של ${labelFor("setup", "Breakout", "he")}.`,
     s ? JSON.stringify(s.action) : "—");
}
{
  const s = strengths(run(J_REAL5, "en"))[0];
  ok("V4", "בקרה א׳ en: כרטיס החוזק קיים", !!s, s ? s.title : "⛔ אין כרטיס");
  ok("V5", "en: ה-action ⛔ מכיל «increase position size»",
     !!s && !s.action.includes(PHRASE_EN), s ? JSON.stringify(s.action) : "—");
  ok("V6", "en: ה-action הוא בדיוק «Look for more X setups.»",
     !!s && s.action === `Look for more ${labelFor("setup", "Breakout", "en")} setups.`,
     s ? JSON.stringify(s.action) : "—");
}
{
  // 5 שפות · 2 ענפים: כל lang שאינו 'he' נופל לענף האנגלי. ⇒ es·pt·ar
  // נושאות את אותה מחרוזת בדיוק, ולכן הן נמדדות ⛔ מונחות.
  const bad = ["es", "pt", "ar"].filter(l => {
    const s = strengths(run(J_REAL5, l))[0];
    return !s || s.action.includes(PHRASE_EN) || s.action.includes(PHRASE_HE);
  });
  ok("V7", "es·pt·ar (ענף non-he) ⛔ נושאות את ההמלצה", bad.length === 0,
     bad.length ? `נושאות: ${bad.join(", ")}` : "3/3 נקיות");
}
{
  // הגוף השלם — ⛔ די ב-action של כרטיס אחד; המחרוזת ⛔ שורדת בשום ענף.
  const hasHe = genStmt.includes(PHRASE_HE);
  const hasEn = genStmt.includes(PHRASE_EN);
  ok("V8", "הבייטים של generateSmartLessons ⛔ מכילים את מחרוזת ההגדלה (he)", !hasHe, hasHe ? "נמצאה" : "⛔ נמצאה");
  ok("V9", "הבייטים של generateSmartLessons ⛔ מכילים את מחרוזת ההגדלה (en)", !hasEn, hasEn ? "נמצאה" : "⛔ נמצאה");
}

/* ── בלוק 2 — (ג) `Unknown` ⛔ מועמד ─────────────────────────────────────── */
{
  const groups = hub(J_UNKNOWN).bySetup;
  ok("V10", "קדם-תנאי: ה-hub האמיתי מייצר קבוצת `Unknown`",
     groups.length === 1 && groups[0].name === "Unknown" && groups[0].count === 3,
     JSON.stringify(groups.map(g => ({ name: g.name, count: g.count, wr: Math.round(g.winRate) }))));
}
{
  const ls = run(J_UNKNOWN, "he");
  const st = strengths(ls);
  ok("V11", "ג'ורנל 16.09 (Unknown · 3 · WR 33%) ⇒ אפס לקחי type:\"strength\"",
     st.length === 0, `${st.length} לקחי חוזק · סה\"כ ${ls.length} לקחים`);
  ok("V12", "הפלט ⛔ מכיל «הסטאפ החזק ביותר»", !blob(ls).includes("הסטאפ החזק ביותר"), blob(ls) || "(ריק)");
  ok("V13", "הפלט ⛔ מכיל «הגדל את גודל הפוזיציה»", !blob(ls).includes(PHRASE_HE), "—");
  ok("V14", "הפלט ⛔ מכיל את הליטרל `Unknown`", !blob(ls).includes("Unknown"), "—");
}
{
  const ls = run(J_UNKNOWN, "en");
  ok("V15", "אותו ג'ורנל en ⇒ אפס לקחי חוזק", strengths(ls).length === 0, `${strengths(ls).length}`);
  ok("V16", "אותו ג'ורנל en ⛔ מכיל «increase position size»", !blob(ls).includes(PHRASE_EN), "—");
}
{
  // הליטרל נמדד כ-`"Unknown"` בלבד (`tradingStats.js:417` מנרמל `""`/`null`
  // לפניו), אבל הערובה חיה במודול אחר ⇒ הסינון נבדק גם על הצורות הגולמיות.
  const raw = [{ name: "Unknown", count: 9, winRate: 90 }, { name: "", count: 8, winRate: 95 },
               { name: null, count: 7, winRate: 99 }, { name: "   ", count: 6, winRate: 98 }];
  const ls = generateSmartLessons(J_REAL5, { ...hub(J_REAL5), bySetup: raw }, calcTradeMetrics, "he", "USD");
  ok("V17", "`Unknown` · `\"\"` · `null` · רווחים — כולם מסוננים מהמועמדות",
     strengths(ls).length === 0, `${strengths(ls).length} לקחי חוזק`);
}

/* ── בלוק 3 — בקרה א׳: סטאפ אמיתי ⛔ נעלם (רוחב הסינון) ──────────────────── */
{
  const s = strengths(run(J_REAL10, "he"))[0];
  ok("K1", "בקרה א׳: סטאפ אמיתי · n=10 · WR 70% ⇒ הכרטיס **כן** מופיע", !!s, s ? s.title : "⛔ נעלם — הסינון רחב מדי");
  ok("K2", "בקרה א׳: הכרטיס מצטט 70% ו-10 עסקאות", !!s && s.detail.includes("70%") && s.detail.includes("10"),
     s ? s.detail : "—");
}
{
  const s = strengths(run(J_REAL5, "he"))[0];
  ok("K3", "בקרה א׳: סטאפ אמיתי · n=5 · WR 80% ⇒ הכרטיס **כן** מופיע", !!s, s ? s.title : "⛔ נעלם");
}
{
  // סטאפ אמיתי לצד `Unknown` — הסינון מסיר את השני ו⛔ את הראשון.
  const mixed = [...J_REAL5, mk(6, "", false), mk(7, "", false)];
  const s = strengths(run(mixed, "he"))[0];
  ok("K4", "בקרה א׳: אמיתי + Unknown באותו ג'ורנל ⇒ נבחר האמיתי",
     !!s && s.title.includes(labelFor("setup", "Breakout", "he")), s ? s.title : "⛔ אין כרטיס");
}

/* ── בלוק 4 — בקרה ב׳: משתמש בלי סטאפים רשומים ⇒ ⛔ קריסה · ⛔ כרטיס ריק ──── */
{
  let threw = "";
  let ls = null;
  try { ls = generateSmartLessons(J_REAL5, { ...hub(J_REAL5), bySetup: [] }, calcTradeMetrics, "he", "USD"); }
  catch (e) { threw = e.message; }
  ok("K5", "bySetup ריק לגמרי ⇒ ⛔ קריסה", threw === "", threw || "⛔ נזרקה שגיאה");
  ok("K6", "bySetup ריק לגמרי ⇒ ⛔ כרטיס חוזק", !threw && strengths(ls).length === 0,
     threw ? "—" : `${strengths(ls).length}`);
  ok("K7", "bySetup ריק ⇒ ⛔ לקח בעל title/action ריקים", !threw && ls.every(l => l.title && l.action),
     threw ? "—" : `${ls.length} לקחים, כולם מלאים`);
}
{
  // הג'ורנל של 16.09 אחרי הסינון = «בלי סטאפים» בפועל. ⚠️ הוא ⛔ מזין אף לקח
  // אחר (⛔ followedPlan · ⛔ FOMO · avgLoss ⛔ > avgWin×1.5 · ⛔ lessonLearned)
  // ⇒ המצב הנכון הוא **מערך ריק**, ⛔ כרטיס ריק ו⛔ קריסה.
  let threw = "", ls = null;
  try { ls = run(J_UNKNOWN, "he"); } catch (e) { threw = e.message; }
  ok("K8", "ג'ורנל 16.09 ⇒ מערך (⛔ קריסה · ⛔ כרטיס ריק)",
     threw === "" && Array.isArray(ls) && ls.every(l => l.title && l.action),
     threw || `${ls.length} לקחים`);
}
{
  // הסינון מסיר **כרטיס**, ⛔ מסך: ג'ורנל עם אותו `Unknown` **ועם** מקור-לקח
  // אחר חייב להמשיך להחזיר את האחר.
  const withPlan = J_UNKNOWN.map(t => t.exit === 95 ? { ...t, followedPlan: false } : t);
  const ls = run(withPlan, "he");
  ok("K9", "Unknown + שני הפסדי סטייה-מתוכנית ⇒ לקח ה-warning שורד",
     ls.some(l => l.type === "warning") && strengths(ls).length === 0,
     `${ls.length} לקחים: ${ls.map(l => l.type).join(", ") || "(ריק)"}`);
}

console.log(`\n${pass} עברו · ${fail} נכשלו${fail ? ` — אדומות: ${reds.join(", ")}` : ""}`);
console.log(`סיכום: 4 מטא · ${pass + fail - 4} אסרציות ערך · זרוע בקרה K1–K8 חייבת להישאר ירוקה (K9 כפולה: בקרה + ערך).`);
console.log("⚠️ B-326 בלבד. `B-331` (argmax לפני שער) ⛔ נסגר ו⛔ ממוצב כאן.");
process.exit(fail ? 1 : 0);
