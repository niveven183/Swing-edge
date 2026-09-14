// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  probe:dailypnl — כרטיס «פתוח + נסגר היום» (B-297 · B-298)              ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// ⛔ **הוא ⛔ אינו בשרשרת `npm run verify`** — בכוונה. `CLAUDE.md` §7 מצהיר
// «29 חוליות», והמספר הזה **⛔ אינו נאכף** (`B-274` פתוח, מופע שישי). הוספת
// חוליה כאן הייתה מזיזה `29 → 30` בפרוזה ⛔ בלי שער שיגזור אותו מ-`package.json`
// ⇒ בדיוק ה«הזזת-יד» ש-`B-274` מתאר. לכן הוא נרשם כ-`probe:`, כמו
// `probe:boundary` ו-`test:smoke`, ומקודם לחוליה **רק** כשייסגר `B-274`.
//
// **מה הוא מודד:** הוא מריץ את **הבייטים שבקובץ** — מחלץ את גוף
// `const dailyPnL = useMemo` לפי עוגן (תבנית `B-272`, כמו `test:hydration` ·
// `test:shortpct` · `test:watchlist`), ומריץ אותו ב-`new Function` עם תלות
// מוזרקת. ⛔ **כשל חילוץ הוא אדום קשה ⛔ ולעולם לא דילוג** — ארבעה שערי-מטא
// אוכפים זאת (עוגן ≠ 1 · סוגריים לא מאוזנים · שורת `<StatCard>` ≠ 1 ·
// `label`/`sub` שאינם `t.<key>` חשוף).
//
// ⚠️ **`A2`/`A3` הן זרוע-ביקורת שחייבת להישאר אדומה.** `B-297` תוקן ב-(ז) —
// **התווית**, ⛔ לא החישוב; `dailyPnL` עדיין מחזיר `closedToday + openPnL.value`,
// כלומר P&L פתוח **מצטבר מיום הכניסה**. אם הן מתהפכות לירוק ⇒ מישהו נגע בחישוב
// ⇒ הסקריפט **עוצר** (exit 3) ודורש עדכון + סגירת `B-298`. ⛔ **ביקורת שנעשתה
// ירוקה בשקט פירושה שהטיפול ⛔ אינו מוכיח דבר.**
//
// ⚠️ **ו-`A1` מודפסת ב-⚪ ו⛔ לא ב-✓** — היא אינווריאנטה מבנית
// (`[].filter(…).reduce(…, 0) === 0`), ירוקה בכל עץ, ו⛔ **אינה** ראיה לתיקון.
// קריאתה כראיה היא בדיוק העיוורון של אסרציה 12 ב-`test:analytics`.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { localDayKey, realizedDayKey } from "../src/utils.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(resolve(ROOT, "SwingEdge_App.jsx"), "utf8");
const i18nSrc = readFileSync(resolve(ROOT, "src/i18n.js"), "utf8");

const META = (msg) => { console.error(`\n⛔ META FAIL — ${msg}\n   ⛔ זה אדום קשה, ⛔ לא דילוג (B-272).`); process.exit(2); };

// ── מטא 1 · העוגן ──────────────────────────────────────────────────────────
const ANCHOR = "const dailyPnL = useMemo(() => {";
const hits = src.split(ANCHOR).length - 1;
if (hits !== 1) META(`העוגן \`${ANCHOR}\` תואם ${hits} פעמים ≠ 1`);

// ── מטא 2 · איזון סוגריים ──────────────────────────────────────────────────
const start = src.indexOf(ANCHOR) + ANCHOR.length;
let depth = 1, i = start;
while (i < src.length && depth > 0) {
  if (src[i] === "{") depth++;
  else if (src[i] === "}") depth--;
  i++;
}
if (depth !== 0) META("סוגריים לא מאוזנים בגוף ה-useMemo");
const body = src.slice(start, i - 1);

console.log("── הגוף שחולץ מ-SwingEdge_App.jsx ──");
console.log(body.split("\n").filter((l) => l.trim() && !l.trim().startsWith("//")).join("\n"));

const run = new Function("localDayKey", "realizedDayKey", "closedTrades", "openPnL",
                         "stableCalcTradeMetrics", body);

// ── התרחיש מצילום המסך של 13.09 ────────────────────────────────────────────
// שתי פוזיציות **פתוחות**, נכנסו לפני 41 יום. **אפס** עסקאות סגורות, אי-פעם.
const entry41 = new Date(Date.now() - 41 * 86400000).toISOString().slice(0, 10);
const closedTrades = [];                    // 0 סגורות ⇒ closedToday **חייב** להיות 0
const NVDA = -6.87, OTHER = +63.29;         // חי, מצטבר-מהכניסה
const openPnL = { value: NVDA + OTHER, missingCount: 0, unconvertedCount: 0 };
const stableCalcTradeMetrics = () => ({ pnl: 0 });

const got = run(localDayKey, realizedDayKey, closedTrades, openPnL, stableCalcTradeMetrics);

console.log("\n── קלט ──");
console.log(`  עסקאות פתוחות נכנסו     : ${entry41}  (לפני 41 יום)`);
console.log(`  עסקאות סגורות (אי-פעם) : ${closedTrades.length}`);
console.log(`  openPnL.value (מצטבר מהכניסה) : ${openPnL.value.toFixed(2)}`);

let fails = 0;
const A = (name, cond, detail) => {
  console.log(`  ${cond ? "✓" : "✗ RED"} ${name}${detail ? "  — " + detail : ""}`);
  if (!cond) fails++;
};
const W = (name, detail) => console.log(`  ⚪ ${name}${detail ? "  — " + detail : ""}`);

console.log("\n── אסרציות ──");

// ⚪ אינווריאנטה — ⛔ אינה ראיה
W("A1 · closedToday הוא 0 (0 סגורות ⇒ מסנן ריק)", "מבני: [].filter(…).reduce(…, 0) === 0");

// ── זרוע הביקורת · B-298 · חייבת להישאר אדומה ──────────────────────────────
const a2 = Math.abs(got - openPnL.value) > 0.005;
const a3 = Math.abs(got) < 0.005;
console.log(`  ${a2 ? "⚠️ הפך לירוק" : "🔴 אדום-ידוע"} A2 · «היום» ⛔ שווה ל-P&L פתוח מצטבר של 41 יום  — got ${got.toFixed(2)} · מצטבר ${openPnL.value.toFixed(2)}`);
console.log(`  ${a3 ? "⚠️ הפך לירוק" : "🔴 אדום-ידוע"} A3 · «היום» ביום בלי סגירה ובלי תזוזת מחיר חייב להיות 0  — got ${got.toFixed(2)}`);

// ── מטא 3 · אתר הרינדור האמיתי ─────────────────────────────────────────────
// ⛔ **⛔ סימולציה של `Math.round(…)` בכתב-יד** — סימולציה הייתה נשארת אדומה
// אחרי התיקון ו⛔ לא מוכיחה דבר. נקרא מהבייטים של ה-JSX.
const CARD = src.split("\n").filter((l) => /<StatCard/.test(l) && /dailyPnL/.test(l));
if (CARD.length !== 1) META(`שורות <StatCard> עם dailyPnL: ${CARD.length} ≠ 1`);
const VAL = /value=\{fmt\$\(([^]*?), dispCcy\)\}/.exec(CARD[0]);
if (!VAL) META("⛔ נמצא `value={fmt$(…, dispCcy)}` בשורת הכרטיס");
const valueExpr = VAL[1];
const rendered = new Function("dailyPnL", `return (${valueExpr});`)(got);

// `fmt$` === `fmtMoney` === `money(n, 2, c)` ⇒ **תמיד** שתי ספרות. ערך שמגיע
// שלם כבר מבטיח אגורות שמעולם לא נמדדו (`D-068`).
A("A4 · הערך המרונדר שומר אגורות (`fmt$` תמיד מדפיס 2 ספרות ⇒ הקלט חייב לשאת אותן)",
  Math.abs(rendered - got) < 0.005 && !Number.isInteger(rendered),
  `ביטוי \`${valueExpr}\` · ${got.toFixed(2)} ⇒ fmt$ מדפיס "$${rendered.toFixed(2)}"`);

// ── מטא 4 · התווית (ז) — חייבת לומר מה המספר **מחשב** ──────────────────────
const LABEL = /label=\{t\.([A-Za-z0-9_]+)\}/.exec(CARD[0]);
const SUB = /sub=\{t\.([A-Za-z0-9_]+)\}/.exec(CARD[0]);
if (!LABEL || !SUB) META("`label`/`sub` אינם `t.<key>` חשוף בשורת הכרטיס");
const keyCount = (k) => (i18nSrc.match(new RegExp(`^\\s*${k}:`, "gm")) || []).length;

// ⚠️ **שם המפתח ⛔ אינו הראיה — המחרוזת המרונדרת כן.** מפתח רשאי לשאת "Today"
// (רגל הסגורות באמת של היום); מה ש⛔ יכול לשרוד הוא תווית שמכריזה **רק** היום
// בזמן שהמספר נושא גם את הרגל הפתוחה.
const enVal = (k) => (new RegExp(`^\\s*${k}: "([^"]*)"`, "m").exec(i18nSrc) || [])[1] ?? "";
const enLabel = enVal(LABEL[1]), enSub = enVal(SUB[1]);
A("A5 · התווית מונה גם את הרגל הפתוחה — ⛔ «היום» לבדו",
  /open/i.test(enLabel) && /open/i.test(enSub) && /cumulative|since entry/i.test(enSub),
  `label="${enLabel}" · sub="${enSub}"`);
A("A6 · שני המפתחות מנוסחים ב-5 שפות — ⛔ אף שפה ⛔ נשארה מאחור",
  keyCount(LABEL[1]) === 5 && keyCount(SUB[1]) === 5,
  `${LABEL[1]}=${keyCount(LABEL[1])}/5 · ${SUB[1]}=${keyCount(SUB[1])}/5`);

console.log(`\n${fails}/3 אסרציות-טיפול אדומות (A4·A5·A6)`);

// ⚠️ **שער בסיס-קפוא:** ביקורת שהתהפכה היא **עצירה**, ⛔ לא חדשות טובות בשקט.
if (a2 || a3) {
  console.error("\n⚠️ ⛔ **עצור** — זרוע הביקורת (A2/A3) התהפכה לירוק.");
  console.error("   פירושו שמישהו נגע ב-`dailyPnL` עצמו. זו ⛔ רגרסיה ו⛔ לא הצלחה שקטה:");
  console.error("   עדכן את הסקריפט, מדוד מחדש, וסגור/עדכן את `B-298` באותו קומיט.");
  process.exit(3);
}
console.log("🔴 A2/A3 נשארו אדומות — (ז) שינה את ה**תווית**, ⛔ לא את החישוב ⇒ `B-298` פתוח.");
process.exit(fails > 0 ? 1 : 0);
