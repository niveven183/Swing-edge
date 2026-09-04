#!/usr/bin/env node
/**
 * short-pnl-pct-test.mjs — B-186 · harness לאחוז ה-P&L החי ב-SHORT
 *
 * ⚠️ זו ⛔ אינה "בדיקת טקסט". הבייטים שמורצים כאן הם הבייטים שבקובץ המוצר:
 * ה-harness מחלץ את הצהרת `livePnlPct` לפי עוגן ומריץ אותה ב-new Function
 * עם `currentPrice` ו-`tr` מוזרקים. שינוי בנוסחה משנה את ההרצה.
 *
 * למה חילוץ ולא import: 61 import ברמה העליונה גוררים את כל גרף האפליקציה.
 * אותה הכרעה בדיוק כמו scripts/hydration-wiring-test.mjs.
 *
 * ⛔ מה זה ⛔ אינו מוכיח: שהפס מרונדר · React · דפדפן אמיתי · פרודקשן.
 */
import { readFileSync } from "node:fs";

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

/* ── חילוץ ─── כשל חילוץ הוא אדום קשה ⛔ ולעולם לא דילוג (B-272) ─────────── */
function countOccurrences(hay, needle) {
  let n = 0, i = 0;
  for (;;) { const j = hay.indexOf(needle, i); if (j < 0) break; n++; i = j + needle.length; }
  return n;
}

const A_PCT = "const livePnlPct =";
const A_BAR = "Math.abs(livePnlPct)";

const nPct = countOccurrences(src, A_PCT);
ok("M1", "עוגן `const livePnlPct =` מופיע בדיוק פעם אחת", nPct === 1, `${nPct}`);
const nBar = countOccurrences(src, A_BAR);
ok("M2", "צרכן הפס `Math.abs(livePnlPct)` מופיע בדיוק פעם אחת", nBar === 1, `${nBar}`);
if (nPct !== 1 || nBar !== 1) { console.log("\n⛔ חילוץ נכשל — אדום קשה, ⛔ לא דילוג."); process.exit(1); }

const start = src.indexOf(A_PCT);
const semi = src.indexOf(";", start);
const stmt = src.slice(start, semi + 1);
const balanced = (stmt.match(/\(/g) || []).length === (stmt.match(/\)/g) || []).length;
ok("M3", "סוגריים מאוזנים בהצהרה שחולצה", balanced, balanced ? "מאוזן" : stmt);
const endsNull = /:\s*null\s*;$/.test(stmt);
ok("M4", "ההצהרה מסתיימת ב-`: null;`", endsNull, endsNull ? "כן" : JSON.stringify(stmt.slice(-24)));
if (!balanced || !endsNull) { console.log("\n⛔ חילוץ נכשל — אדום קשה."); process.exit(1); }

console.log(`\n— נוסחה שחולצה מ-${APP.split("/").pop()} —\n${stmt}\n`);

const livePnlPctOf = new Function("currentPrice", "tr", `${stmt} return livePnlPct;`);
const pct = (side, entry, current) => livePnlPctOf(current, { side, entry });
const near = (a, b, eps = 1e-9) => a !== null && Math.abs(a - b) < eps;
const barWidth = p => Math.min(Math.abs(p) * 10, 100);

/* ── בלוק 1 — ערך מחושב ───────────────────────────────────────────────────
 * המכנה של אחוז תשואה הוא ההון שהושם בסיכון = מחיר הכניסה. הוא ⛔ אינו זז
 * עם השוק. SHORT: (entry - current) / entry * 100.
 */
{
  const v = pct("SHORT", 100, 95);
  ok("A1", "SHORT ברווח (E=100·C=95) ⇒ +5.000%", near(v, 5), v === null ? "null" : `${v.toFixed(4)}%`);
}
{
  const v = pct("SHORT", 100, 105);
  ok("A2", "SHORT בהפסד (E=100·C=105) ⇒ −5.000%", near(v, -5), v === null ? "null" : `${v.toFixed(4)}%`);
}
{
  const v = pct("SHORT", 50, 40);
  ok("A3", "SHORT ברווח (E=50·C=40) ⇒ +20.000%", near(v, 20), v === null ? "null" : `${v.toFixed(4)}%`);
}

/* ── בלוק 2 — LONG ללא רגרסיה ─────────────────────────────────────────── */
{
  const v = pct("LONG", 100, 110);
  ok("A4", "LONG ברווח (E=100·C=110) ⇒ +10.000%", near(v, 10), v === null ? "null" : `${v.toFixed(4)}%`);
}
{
  const v = pct("LONG", 100, 90);
  ok("A5", "LONG בהפסד (E=100·C=90) ⇒ −10.000%", near(v, -10), v === null ? "null" : `${v.toFixed(4)}%`);
}

/* ── בלוק 3 — סימטריה: אותם שני מחירים, שני צדדים ⇒ היפוך סימן מדויק ───── */
{
  const l = pct("LONG", 100, 95), s = pct("SHORT", 100, 95);
  ok("A6", "סימטריה E=100·C=95: LONG === −SHORT", near(l, -s), `LONG=${l?.toFixed(4)} · SHORT=${s?.toFixed(4)}`);
}

/* ── בלוק 4 — עקביות מול הכסף ─────────────────────────────────────────────
 * livePnl (השורה שמעל, ⛔ תקינה) = (entry − current) × shares.
 * האחוז חייב להיות אותו יחס: livePnl / (entry × shares) × 100.
 */
{
  const entry = 100, current = 105, shares = 10;
  const livePnl = (entry - current) * shares;          // −50
  const expected = (livePnl / (entry * shares)) * 100; // −5
  const v = pct("SHORT", entry, current);
  ok("A7", "האחוז עקבי עם ה-$ (E=100·C=105·10 מניות ⇒ −50$ על 1000$)", near(v, expected),
     v === null ? "null" : `${v.toFixed(4)}% מול ${expected.toFixed(4)}%`);
}

/* ── בלוק 5 — קלט ריק ⇒ null, ⛔ לא 0 ומומצא ─────────────────────────────── */
ok("A8", "entry = 0 ⇒ null", pct("SHORT", 0, 95) === null, String(pct("SHORT", 0, 95)));
ok("A9", "entry = null ⇒ null", pct("SHORT", null, 95) === null, String(pct("SHORT", null, 95)));
ok("A10", "currentPrice = null ⇒ null", pct("SHORT", 100, null) === null, String(pct("SHORT", 100, null)));
ok("A11", "currentPrice = 0 ⇒ null (⛔ ולא Infinity)", pct("SHORT", 100, 0) === null, String(pct("SHORT", 100, 0)));

/* ── בלוק 6 — רוחב הפס, הערך היחיד שמגיע למסך ───────────────────────────── */
{
  const w = barWidth(pct("SHORT", 100, 95));
  ok("B1", "רוחב פס SHORT E=100·C=95 ⇒ 50.00%", near(w, 50, 1e-6), `${w.toFixed(2)}%`);
}
{
  const w = barWidth(pct("SHORT", 100, 110));
  ok("B2", "רוחב פס SHORT E=100·C=110 ⇒ 100.00% (חיתוך)", near(w, 100, 1e-6), `${w.toFixed(2)}%`);
}
{
  const w = barWidth(pct("SHORT", 100, 92));
  ok("B3", "רוחב פס SHORT E=100·C=92 ⇒ 80.00%", near(w, 80, 1e-6), `${w.toFixed(2)}%`);
}

console.log(`\n${pass} עברו · ${fail} נכשלו${fail ? ` — אדומות: ${reds.join(", ")}` : ""}`);
process.exit(fail ? 1 : 0);
