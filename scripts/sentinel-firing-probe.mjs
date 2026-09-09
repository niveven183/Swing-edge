#!/usr/bin/env node
/**
 * sentinel-firing-probe — ⑥① תצפית הירי של הפיקסצ'ר (`B-305`, 09.09).
 *
 * ⛔ **⛔ בשרשרת `verify`** — כמו `probe:boundary`. הוא ⛔ בודק את המוצר; הוא
 * בודק את ה**ספק**: האם הפיקסצ'ר של חשבון ה-QA מסוגל בכלל לייצר את הצורה
 * שהפילה את הפרודקשן ב-07.09.
 *
 * 🔴 **הכשל שהוא נבנה למדוד.** ב-07.09 האתר היה שבור `18ש׳ 34ד׳` בזמן ש-`6/6`
 * ריצות הסנטינל דיווחו `success`. הסנטינל ⛔ «פספס» — הוא נשאל שאלה על ג'ורנל
 * ש⛔ **הכיל את המקרה**: `FIXED_TRADES = ['AAPL','NVDA','BTC-USD']` הן `3/3`
 * נקובות USD ⇒ `riskPct === null` ⛔ נוצר שם, לעולם. ⚠️ **בדיקה ירוקה מעל
 * אוכלוסייה ש⛔ יכולה להכיל את התופעה ⛔ אינה ראיה** — זה מכנה שאינו יכול
 * להכיל את המונה (`CLAUDE.md` §2).
 *
 * ⛔ **הוא קורא את הבייטים של שני העצים, ⛔ משכתב אותם.** גדר התא נחלצת
 * **לפי עוגן** מ-`git show <ref>:SwingEdge_App.jsx` ומורצת ב-`new Function` —
 * אותה תבנית של `test:hydration`/`test:shortpct`. **כשל חילוץ הוא אדום קשה
 * ⛔ ולעולם לא דילוג** (`B-272`), ושלושה שערי-מטא אוכפים זאת.
 *
 * ⚠️ **זרוע הביקורת חייבת להישאר «מתה».** `SNTNL`/`AAPL` נמדדות ירוקות
 * ב**שני** העצים; ⛔ **ביקורת שיורה פירושה שהמדידה מודדת את React/הסביבה
 * ⛔ ולא את הפיקסצ'ר**, והתוצאה כולה חסרת-ערך. זו בדיוק התבנית של
 * `C1`–`C4` ב-`probe:boundary`.
 *
 * ⚠️ **ו⛔ הוא ⛔ מכסה רינדור**: React · ה-Boundary · דפדפן · Playwright ·
 * פרודקשן — כולם חיים ב-`C-044` בלבד. זו ד.1, ⛔ ד.2.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { riskInCapital } from "../src/hooks/useFxRates.js";

const OLD_REF = process.env.FIRING_OLD_REF || "51a12d2"; // עץ 07.09 — הקוד שקרס
const FILE = "SwingEdge_App.jsx";

let pass = 0;
const fails = [];
const ok = (msg) => { pass++; console.log(`✅ ${msg}`); };
const bad = (msg) => { fails.push(msg); console.log(`❌ ${msg}`); };

// ── מקור הבייטים ────────────────────────────────────────────────────────────
// עץ העבודה נקרא מהדיסק ⛔ ולא דרך git: הבדיקה חייבת למדוד את מה שעומד לרוץ,
// ⛔ את מה שקומט.
function source(ref) {
  if (ref === "WORKTREE") return readFileSync(new URL(`../${FILE}`, import.meta.url), "utf8");
  return execFileSync("git", ["show", `${ref}:${FILE}`], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

// ── החילוץ לפי עוגן ─────────────────────────────────────────────────────────
// העוגן הוא תא ה-`%` בלוח הסיכון: השורה היחידה שבה `riskPct.toFixed(2)` יושב
// בתוך `<td>`. ⛔ **מספר התאמות ≠ 1 הוא אדום קשה** — שינוי-שם או ריפורמט
// עוצרים, ⛔ מדללים.
function extractGuard(src, label) {
  const lines = src.split("\n").filter((l) => /<td[^>]*>\{[^]*riskPct\.toFixed\(2\)/.test(l));
  if (lines.length !== 1) {
    bad(`מטא · ${label}: עוגן תא ה-% נמצא ${lines.length} פעמים (נדרש בדיוק 1) — חילוץ נכשל`);
    return null;
  }
  const m = lines[0].match(/>\{(.*)\}<\/td>/);
  if (!m) {
    bad(`מטא · ${label}: התא נמצא אך גבולות הביטוי ⛔ נחלצו — חילוץ נכשל`);
    return null;
  }
  const expr = m[1];
  if (!expr.includes("riskPct.toFixed(2)")) {
    bad(`מטא · ${label}: הביטוי שחולץ ⛔ מכיל riskPct.toFixed(2) — חילוץ נכשל`);
    return null;
  }
  ok(`מטא · ${label}: גדר התא חולצה מהבייטים — \`${expr}\``);
  try {
    return new Function("t", `return (${expr});`);
  } catch (e) {
    bad(`מטא · ${label}: הביטוי שחולץ ⛔ מתקמפל — ${e.message}`);
    return null;
  }
}

// ── בניית השורה — דרך `riskInCapital` האמיתי, ⛔ שכתוב ────────────────────
// חשבון ה-QA דולרי טהור ⇒ הטבלה `ready` ו⛔ מחזיקה זוג זר. זה בכוונה: הוא
// מוכיח ש-`unverified_instrument` ⛔ **דורש** הון לא-דולרי ולא טבלה שבורה,
// כי `isAggregatable` נבדק ב-`useFxRates.js:176` **לפני** שער ה-identity ב-`:178`.
const CAPITAL = 10_000, CAPITAL_CCY = "USD";
function riskRow(t) {                       // SwingEdge_App.jsx:4757-4764
  const hasStop = t.stop != null && t.shares > 0;
  const riskPaper = hasStop ? Math.abs(t.entry - t.stop) * t.shares : null;
  const conv = riskInCapital(t, riskPaper, CAPITAL_CCY, { byDay: {}, latest: {} }, "ready");
  const riskDollar = conv.value;
  const riskPct = riskDollar != null && CAPITAL > 0 ? (riskDollar / CAPITAL) * 100 : null;
  return { ...t, hasStop, riskDollar, riskPct, _reason: conv.reason };
}

function render(guard, row) {
  try { return { threw: false, out: guard(row) }; }
  catch (e) { return { threw: true, out: `${e.constructor.name}: ${e.message}` }; }
}

console.log("\n🎯 sentinel firing probe — האם הפיקסצ'ר מסוגל לייצר את 07.09\n");

const oldGuard = extractGuard(source(OLD_REF), `${OLD_REF} (עץ 07.09)`);
const newGuard = extractGuard(source("WORKTREE"), "עץ העבודה");
if (!oldGuard || !newGuard) {
  console.log(`\n❌ firing probe: החילוץ נכשל — ⛔ אין תוצאה. ${fails.length} כשלים.\n`);
  process.exit(1);
}
if (String(oldGuard) === String(newGuard)) {
  bad(`מטא: שתי הגדרות זהות — ${OLD_REF} ⛔ מכיל את הבאג ⇒ המבחן ⛔ יכול להבדיל`);
} else {
  ok("מטא: שתי הגדרות שונות זו מזו — יש מה להבדיל");
}

// ── האוכלוסייה ──────────────────────────────────────────────────────────────
// ⚠️ `SNTNL1` **אחרי עריכה** ⛔ אחרי יצירה: `sizePosition` מסרב על נייר לא-מאומת
// (`positionSizing.js:54`) ⇒ יצירה בטופס נותנת `shares = null` ⇒ `hasStop=false`
// ⇒ הגדר הישן ⛔ יורה. `EditTradeModal` נושא `shares` כשדה גולמי ו⛔ מריץ
// `sizePosition` ⇒ עריכת הטיקר משמרת 100 מניות. **זה כל ההבדל בין ספק שיורה
// לספק שנראה נכון.**
const POP = [
  { arm: "ביקורת",  label: "AAPL   · עסקת קבע",                 t: { ticker: "AAPL",   entry: 100, stop: 99, shares: 100 }, mustThrowOld: false },
  { arm: "ביקורת",  label: "SNTNL  · הפיקסצ'ר אחרי יצירה",      t: { ticker: "SNTNL",  entry: 100, stop: 99, shares: 100 }, mustThrowOld: false },
  { arm: "טיפול",   label: "SNTNL1 · הפיקסצ'ר אחרי עריכת טיקר", t: { ticker: "SNTNL1", entry: 100, stop: 99, shares: 100 }, mustThrowOld: true  },
  { arm: "ביקורת",  label: "SNTNL1 · יצירה בטופס (shares null)", t: { ticker: "SNTNL1", entry: 100, stop: 99, shares: null }, mustThrowOld: false },
];

console.log("");
for (const c of POP) {
  const row = riskRow(c.t);
  const o = render(oldGuard, row);
  const n = render(newGuard, row);
  console.log(`   ${c.arm.padEnd(7)} ${c.label}`);
  console.log(`           hasStop=${String(row.hasStop).padEnd(5)} reason=${String(row._reason).padEnd(22)} riskPct=${row.riskPct}`);
  console.log(`           ${OLD_REF} -> ${o.threw ? "THROW" : "OK   "} ${o.out}`);
  console.log(`           WORKTREE -> ${n.threw ? "THROW" : "OK   "} ${n.out}`);

  if (c.mustThrowOld) {
    if (o.threw) ok(`טיפול · ${c.t.ticker}: הגדר של ${OLD_REF} **נפל** — הספק מייצר את 07.09`);
    else bad(`טיפול · ${c.t.ticker}: הגדר של ${OLD_REF} עבר בשלום — ⛔ **הספק ⛔ מייצג. עצור.**`);
    if (!n.threw) ok(`טיפול · ${c.t.ticker}: עץ העבודה מרנדר "${n.out}" ⛔ קורס — התיקון מחזיק`);
    else bad(`טיפול · ${c.t.ticker}: עץ העבודה **קורס** — רגרסיה בעץ הנוכחי`);
  } else {
    if (!o.threw && !n.threw) ok(`ביקורת · ${c.t.ticker}${c.t.shares == null ? " (shares null)" : ""}: ירוקה בשני העצים — כנדרש`);
    else bad(`ביקורת · ${c.t.ticker}: ירתה (${OLD_REF}=${o.threw} · WORKTREE=${n.threw}) — ⛔ **המדידה מודדת את הסביבה ⛔ את הפיקסצ'ר**`);
  }
  console.log("");
}

const total = pass + fails.length;
if (fails.length) {
  console.log(`❌ firing probe: ${pass}/${total} עברו · ${fails.length} כשלו\n`);
  fails.forEach((f) => console.log(`   · ${f}`));
  process.exit(1);
}
console.log(`✅ firing probe: ${pass}/${total} assertions passed — הספק מייצר את צורת 07.09, והביקורת מתה.\n`);
