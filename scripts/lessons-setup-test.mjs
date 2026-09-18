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

/* ── בלוק 5 — `B-331` · argmax **לפני** השער ⇒ כרטיס שנמחק בשקט ───────────────
 *
 * 🔴 `:770` בוחר את המקסימום מכל האוכלוסייה ו**רק אז** `:771` שואל
 *    `count >= 2`. ⇒ קבוצה בת עסקה אחת עם `WR 100%` **זוכה** בבחירה, נופלת
 *    בשער, ומוחקת את הכרטיס — בעוד סטאפ בן 5 עסקאות ב-80% יושב מתחתיה.
 *    המשתמש ⛔ רואה «⛔ מספיק נתונים»; הוא ⛔ רואה **כלום**.
 *
 * ⇒ השער עובר **לתוך** ה-`filter`, לפני ה-`sort`. אותה הכרעה בדיוק כמו
 *   `Unknown` ב-`B-326`: שער אחרי ה-`argmax` מוחק את ה**כרטיס** במקום את
 *   ה**מועמד**.
 *
 * ⚠️ הפיקסצ׳ר מוזרק ל-`bySetup` הישר (כמו `V17`) ו⛔ עובר דרך ה-hub —
 *    ה-hub ⛔ יכול לייצר `WR 100% · n=1` לצד `WR 80% · n=5` על אותו ג'ורנל
 *    בלי להוסיף משתנים שאינם נמדדים. הליטרל `Unknown` ⛔ מופיע כאן בכוונה:
 *    זו שאלת **סדר הבחירה**, ⛔ שאלת החברות באוכלוסייה.
 */
const withSetups = (groups) =>
  generateSmartLessons(J_REAL5, { ...hub(J_REAL5), bySetup: groups }, calcTradeMetrics, "he", "USD");
const BREAKOUT_HE = labelFor("setup", "Breakout", "he");
const PULLBACK_HE = labelFor("setup", "Pullback", "he");
{
  const fixture = [{ name: "breakout", count: 5, winRate: 80 },
                   { name: "pullback", count: 1, winRate: 100 }];
  const s = strengths(withSetups(fixture))[0];
  ok("V18", "n=1·WR100 לצד n=5·WR80 ⇒ הכרטיס **כן** מופיע (היום: נמחק)",
     !!s, s ? s.title : "⛔ אין כרטיס — ה-argmax בלע את הכרטיס");
  ok("V19", "והוא נוקב ב-`breakout`, ⛔ ב-`pullback` בן העסקה היחידה",
     !!s && s.title.includes(BREAKOUT_HE) && !s.title.includes(PULLBACK_HE),
     s ? s.title : "—");
  ok("V20", "והוא מצטט 80% על פני 5 עסקאות",
     !!s && s.detail.includes("80%") && s.detail.includes("5"), s ? s.detail : "—");
}
{
  // ⚠️ ⛔ די בכך שהכרטיס הופיע — הוא חייב להופיע גם כשהמועמד הפסול הוא
  //    ה**ראשון** במערך. סדר הקלט ⛔ משנה.
  const flipped = [{ name: "pullback", count: 1, winRate: 100 },
                   { name: "breakout", count: 5, winRate: 80 }];
  const s = strengths(withSetups(flipped))[0];
  ok("V21", "סדר הקלט הפוך ⇒ אותה תוצאה בדיוק",
     !!s && s.title.includes(BREAKOUT_HE), s ? s.title : "⛔ אין כרטיס");
}
{
  // ⚠️ הבייטים: השער ⛔ שורד **אחרי** ה-`sort` כענף `if` נפרד.
  const gateAfterArgmax = /bestSetup\s*&&\s*bestSetup\.count\s*>=\s*2/.test(genStmt);
  ok("V22", "הבייטים: השער ⛔ יושב אחרי ה-argmax כענף `if` נפרד",
     !gateAfterArgmax, gateAfterArgmax ? "`if (bestSetup && bestSetup.count >= 2)` עדיין שם" : "⛔ נמצא");
}

/* ── בלוק 6 — בקרה ג׳: השער ⛔ רוּכַּך · הבחירה ⛔ שוּנתה ────────────────────── */
{
  const s = strengths(withSetups([{ name: "breakout", count: 5, winRate: 80 }]))[0];
  ok("K10", "בקרה ג׳: מועמד כשיר יחיד ⇒ כרטיס", !!s, s ? s.title : "⛔ נעלם");
}
{
  // 🔴 השער ⛔ רוּכַּך: **כל** המועמדים בני עסקה אחת ⇒ ⛔ כרטיס. זו התשובה
  //    הנכונה — «⛔ מספיק נתונים» ⛔ «הנה ניחוש».
  const allSingles = [{ name: "breakout", count: 1, winRate: 100 },
                      { name: "pullback", count: 1, winRate: 100 },
                      { name: "reversal", count: 1, winRate: 0 }];
  const ls = withSetups(allSingles);
  ok("K11", "בקרה ג׳: כל המועמדים n=1 ⇒ ⛔ כרטיס (השער ⛔ רוּכַּך)",
     strengths(ls).length === 0, `${strengths(ls).length} לקחי חוזק`);
}
{
  // בקרה ג׳: **סדר** הבחירה בתוך האוכלוסייה הכשירה ⛔ זז — WR, ואז מדגם.
  const s = strengths(withSetups([{ name: "breakout", count: 5, winRate: 60 },
                                  { name: "pullback", count: 5, winRate: 90 }]))[0];
  ok("K12", "בקרה ג׳: בין שני כשירים — WR גבוה יותר מנצח (הסדר ⛔ זז)",
     !!s && s.title.includes(PULLBACK_HE), s ? s.title : "⛔ אין כרטיס");
}
{
  // בקרה ג׳: שובר-השוויון המשני (מדגם) ⛔ זז.
  const s = strengths(withSetups([{ name: "breakout", count: 3, winRate: 75 },
                                  { name: "pullback", count: 9, winRate: 75 }]))[0];
  ok("K13", "בקרה ג׳: WR שווה ⇒ המדגם הגדול מנצח (שובר-השוויון ⛔ זז)",
     !!s && s.title.includes(PULLBACK_HE), s ? s.title : "⛔ אין כרטיס");
}

/* ── בלוק 7 — `B-336` · אותו `Unknown` באריח האנליטיקה ────────────────────────
 *
 * 🔴 `:6316` מסנן `s.count > 0` בלבד ⇒ `Unknown` הוא מועמד שווה-זכויות
 *    באריח «Best Setup» של האנליטיקה, בעוד רצועת הג'ורנל כבר מסננת אותו
 *    (`:766`). ⇒ **אותו סינון**, ⛔ סינון חדש.
 *
 * ⚠️ **זו ⛔ בדיקת טקסט:** הביטוי מחולץ מהבייטים לפי עוגן ומורץ ב-`new
 *    Function` עם `stats` מוזרק — בדיוק כמו `generateSmartLessons` למעלה.
 *    ⛔ כשל חילוץ הוא אדום קשה (`B-272`) — `M5` אוכפת.
 *
 * ⚠️ **⑨ נרשם ו⛔ תוקן:** לאריח הזה, ולשני אחיו (Best Day · Best Emotion),
 *    ⛔ שער מדגם כלל — `n=1` מספיק לאריח. `L1` היא **שורת לדג׳ר**: היא
 *    ירוקה היום ותיהפך אדומה ברגע שמישהו יוסיף שער בשקט. הזזת סף שם מזיזה
 *    שלושה אריחים שניב רואה ⇒ **פריט נפרד**, ⛔ בגל הזה.
 */
const A_TILE = "const bestSetup = [...stats.bySetup]";
const nTile = countOccurrences(src, A_TILE);
ok("M5", "עוגן אריח האנליטיקה מופיע בדיוק פעם אחת", nTile === 1, `${nTile}`);
if (nTile !== 1) { console.log("\n⛔ חילוץ נכשל — אדום קשה, ⛔ לא דילוג."); process.exit(1); }
const tileStart = src.indexOf(A_TILE);
const tileStmt = src.slice(tileStart, src.indexOf(";", src.indexOf("[0]", tileStart)) + 1);
let analyticsBestSetup = null, tileErr = "";
try {
  analyticsBestSetup = new Function("stats", `${tileStmt}\nreturn bestSetup;`);
} catch (e) { tileErr = e.message; }
ok("M6", "הביטוי שחולץ נבנה ב-new Function ללא שגיאת תחביר",
   typeof analyticsBestSetup === "function", tileErr || `${tileStmt.split("\n").length} שורות`);
if (typeof analyticsBestSetup !== "function") { console.log("\n⛔ חילוץ נכשל — אדום קשה."); process.exit(1); }
const tile = (bySetup) => analyticsBestSetup({ bySetup });
{
  const t = tile(hub(J_UNKNOWN).bySetup);
  ok("V23", "ג'ורנל 16.09 (רק `Unknown`) ⇒ האריח ⛔ נוקב בסטאפ",
     t === undefined, t ? JSON.stringify(t) : "undefined");
}
{
  const mixed = [{ name: "Unknown", count: 3, winRate: 99 },
                 { name: "breakout", count: 5, winRate: 80 }];
  const t = tile(mixed);
  ok("V24", "`Unknown` עם WR גבוה יותר ⇒ האריח בוחר את האמיתי",
     !!t && t.setup === "breakout", t ? JSON.stringify(t) : "undefined");
}
{
  const raw = [{ name: "Unknown", count: 9, winRate: 90 }, { name: "", count: 8, winRate: 95 },
               { name: null, count: 7, winRate: 99 }, { name: "   ", count: 6, winRate: 98 }];
  ok("V25", "`Unknown` · `\"\"` · `null` · רווחים — כולם מסוננים גם באריח",
     tile(raw) === undefined, JSON.stringify(tile(raw)) || "undefined");
}
{
  // ⑥ — ההערה ב-`:6317-6318` הבטיחה ששני הכרטיסים נוקבים באותו סטאפ.
  //     `8d631ec` הוסיף סינון לרצועה ⛔ לאריח ⇒ ההבטחה נהייתה שקרית.
  //     ⚠️ הבטחה שקרית בהערה היא `R-4` בתחפושת — היא מלמדת את הקורא הבא
  //     ש⛔ צריך לבדוק.
  const lie = src.includes("so both name the same setup");
  ok("V26", "⑥ ההערה ⛔ מבטיחה «both name the same setup» בעוד הספים נבדלים",
     !lie, lie ? "ההבטחה השקרית עדיין בבייטים" : "⛔ נמצאה");
}
{
  // ⚠️ **שורת לדג׳ר — ⑨.** ירוקה היום, ואדומה ברגע שיתווסף שער מדגם בשקט.
  //    ⛔ אינה ראיה לתיקון; היא ראיה ש**⛔ תוקן**.
  const gated = /\.filter\(s\s*=>\s*s\.count\s*>=\s*\d/.test(tileStmt);
  ok("L1", "⑨ לדג׳ר: לאריח ⛔ שער מדגם — נרשם, ⛔ תוקן (פריט נפרד)",
     !gated, gated ? "🔴 נוסף שער בשקט — שלושה אריחים זזו" : "⛔ שער — כמו שנרשם");
}

/* ── בקרה ד׳: הרצועה והאריח ⛔ התפצלו במה שכן מוסכם ─────────────────────── */
{
  const real = [{ name: "breakout", count: 5, winRate: 80 },
                { name: "pullback", count: 4, winRate: 60 }];
  const t = tile(real);
  const s = strengths(withSetups(real))[0];
  ok("K14", "בקרה ד׳: על אוכלוסייה שכולה כשירה — הרצועה והאריח נוקבים באותו סטאפ",
     !!t && !!s && s.title.includes(labelFor("setup", "Breakout", "he")) && t.setup === "breakout",
     `אריח=${t ? t.setup : "—"} · רצועה=${s ? s.title : "—"}`);
}

console.log(`\n${pass} עברו · ${fail} נכשלו${fail ? ` — אדומות: ${reds.join(", ")}` : ""}`);
console.log(`סיכום: 6 מטא · ${pass + fail - 6} אסרציות ערך/צורה · זרוע בקרה K1–K14 חייבת להישאר ירוקה (K9 כפולה: בקרה + ערך).`);
console.log("⚠️ `L1` היא **לדג׳ר** (⑨) ⛔ הישג: היא מודדת ש-⛔ נוסף שער מדגם לאריחים, ⛔ שהיעדרו נכון.");
console.log("⚠️ B-326 · B-331 · B-336. ⛔ מכסה: JSX · React · דפדפן · פרודקשן — `C-050` + `C-053` בלבד.");
process.exit(fail ? 1 : 0);
