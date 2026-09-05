#!/usr/bin/env node
/**
 * watchlist-fallback-test.mjs — B-185 · harness לנפילת-חזרה (fallback) של רשימת המעקב
 *
 * ⚠️ זו ⛔ אינה "בדיקת טקסט". הבייטים שמורצים כאן הם הבייטים שבקובץ המוצר:
 * ה-harness מחלץ ארבעה מקטעים לפי עוגן (הזרע · הרינדור · הכתיבה החוזרת) ומריץ
 * אותם ב-new Function עם תלות מוזרקת. שינוי בלוגיקה משנה את ההרצה.
 *
 * למה חילוץ ולא import: 61 import ברמה העליונה גוררים את כל גרף האפליקציה.
 * אותה הכרעה בדיוק כמו scripts/hydration-wiring-test.mjs / short-pnl-pct-test.mjs.
 *
 * ⛔ מה זה ⛔ אינו מוכיח: שהמשתמש רואה `—` על המסך · JSX · React · דפדפן אמיתי ·
 * שהמשתמש כבר לא רואה `+0.00%` (priceService.js:136 שורד, ראה W1) · פרודקשן.
 * ראה docs/plans/PLAN-2026-09-05-b185-fallback.md §4-§5.
 */
import { readFileSync } from "node:fs";

const argv = process.argv.slice(2);
const appIdx = argv.indexOf("--app");
const APP = appIdx >= 0 ? argv[appIdx + 1] : new URL("../SwingEdge_App.jsx", import.meta.url).pathname;
const src = readFileSync(APP, "utf8");
const PRICE_SERVICE = new URL("../src/priceService.js", import.meta.url).pathname;
const priceServiceSrc = readFileSync(PRICE_SERVICE, "utf8");

let pass = 0, fail = 0, inv = 0;
const reds = [];
function ok(id, label, cond, got) {
  if (cond) { pass++; console.log(`${id} ${label}: ${got} ✓`); }
  else { fail++; reds.push(id); console.log(`${id} ${label}: ${got} ✗ RED`); }
}
function invariant(id, label, cond, got) {
  if (cond) { inv++; console.log(`${id} ⚪ אינווריאנטה — ${label}: ${got}`); }
  else { fail++; reds.push(id); console.log(`${id} ⚪ אינווריאנטה — ${label}: ${got} ✗ RED`); }
}

/* ── חילוץ ─────────────────────────────────────────────────────────────────
 * כשל חילוץ הוא אדום קשה ⛔ ולעולם לא דילוג (B-272). "בדיקה לא-חד-משמעית
 * ⛔ אינה תוצאה."
 */
function countOccurrences(hay, needle) {
  let n = 0, i = 0;
  for (;;) { const j = hay.indexOf(needle, i); if (j < 0) break; n++; i = j + needle.length; }
  return n;
}

/** סורק קדימה מ-openIdx (שחייב לשאת openCh) ומחזיר את אינדקס ה-closeCh התואם.
 *  מדלג על מחרוזות, template literals, והערות — אחרת סוגר מוקדם. */
function matchDelim(s, openIdx, openCh, closeCh) {
  if (s[openIdx] !== openCh) throw new Error(`matchDelim: לא נפתח ב-${openCh}`);
  let depth = 0;
  for (let i = openIdx; i < s.length; i++) {
    const c = s[i], n = s[i + 1];
    if (c === "/" && n === "/") { i = s.indexOf("\n", i); if (i < 0) break; continue; }
    if (c === "/" && n === "*") { i = s.indexOf("*/", i + 2) + 1; continue; }
    if (c === '"' || c === "'" || c === "`") {
      const q = c;
      for (i++; i < s.length; i++) {
        if (s[i] === "\\") { i++; continue; }
        if (s[i] === q) break;
        if (q === "`" && s[i] === "$" && s[i + 1] === "{") i = matchDelim(s, i + 1, "{", "}");
      }
      continue;
    }
    if (c === openCh) depth++;
    else if (c === closeCh) { depth--; if (depth === 0) return i; }
  }
  throw new Error("matchDelim: סוגריים לא מאוזנים");
}

/** מחלץ את ביטוי-ה-RHS שאחרי "label:" בתוך אובייקט, עד לפסיק ברמת-עומק 0
 *  (או עד סוף הקטע אם לא נמצא). מדלג על מחרוזות/הערות כמו matchDelim. */
function sliceProp(s, labelAnchor) {
  const labelIdx = s.indexOf(labelAnchor);
  if (labelIdx < 0) throw new Error(`sliceProp: לא נמצא עוגן: ${labelAnchor}`);
  const colonIdx = s.indexOf(":", labelIdx);
  let i = colonIdx + 1;
  while (/\s/.test(s[i])) i++;
  const rhsStart = i;
  let depth = 0;
  for (; i < s.length; i++) {
    const c = s[i], n = s[i + 1];
    if (c === "/" && n === "/") { i = s.indexOf("\n", i); if (i < 0) break; continue; }
    if (c === "/" && n === "*") { i = s.indexOf("*/", i + 2) + 1; continue; }
    if (c === '"' || c === "'" || c === "`") {
      const q = c;
      for (i++; i < s.length; i++) {
        if (s[i] === "\\") { i++; continue; }
        if (s[i] === q) break;
        if (q === "`" && s[i] === "$" && s[i + 1] === "{") i = matchDelim(s, i + 1, "{", "}");
      }
      continue;
    }
    if (c === "(" || c === "{" || c === "[") depth++;
    else if (c === ")" || c === "}" || c === "]") depth--;
    else if (c === "," && depth === 0) break;
  }
  return s.slice(rhsStart, i).trim();
}

function balancedParens(text) {
  return (text.match(/\(/g) || []).length === (text.match(/\)/g) || []).length;
}

const A_SCANNER = "const SCANNER_DATA = [";
const A_SEED = "const DEFAULT_WATCHLIST = [";
const A_PRICE = "const price = lp?.price";
const A_CHANGEPCT = "const changePct = lp?.changePct";
const A_PATCH = "watchlist: watchlistItems";

// שער-מטא — כל עוגן חייב להופיע בדיוק פעם אחת
const nScanner = countOccurrences(src, A_SCANNER);
const nSeed = countOccurrences(src, A_SEED);
const nPrice = countOccurrences(src, A_PRICE);
const nChangePct = countOccurrences(src, A_CHANGEPCT);
const nPatch = countOccurrences(src, A_PATCH);
ok("M1", "עוגן `const price = lp?.price` מופיע בדיוק פעם אחת", nPrice === 1, `${nPrice}`);
ok("M2", "עוגן `const changePct = lp?.changePct` מופיע בדיוק פעם אחת", nChangePct === 1, `${nChangePct}`);
ok("M3", "עוגן `const DEFAULT_WATCHLIST = [` מופיע בדיוק פעם אחת", nSeed === 1, `${nSeed}`);
ok("M4", "עוגן `watchlist: watchlistItems` מופיע בדיוק פעם אחת", nPatch === 1, `${nPatch}`);
if (nScanner !== 1 || nSeed !== 1 || nPrice !== 1 || nChangePct !== 1 || nPatch !== 1) {
  console.log("\n⛔ חילוץ נכשל — אדום קשה, ⛔ לא דילוג (B-272).");
  process.exit(1);
}

const scannerStart = src.indexOf(A_SCANNER) + "const SCANNER_DATA = ".length;
const scannerBracket = src.indexOf("[", scannerStart);
const scannerEnd = matchDelim(src, scannerBracket, "[", "]");
const scannerSrc = src.slice(scannerBracket, scannerEnd + 1);

const seedStart = src.indexOf(A_SEED) + "const DEFAULT_WATCHLIST = ".length;
const seedBracket = src.indexOf("[", seedStart);
const seedEnd = matchDelim(src, seedBracket, "[", "]");
const seedSrc = src.slice(seedBracket, seedEnd + 1);

const priceStart = src.indexOf(A_PRICE);
const priceSemi = src.indexOf(";", priceStart);
const priceStmt = src.slice(priceStart, priceSemi + 1);

const changeStart = src.indexOf(A_CHANGEPCT);
const changeSemi = src.indexOf(";", changeStart);
const changeStmt = src.slice(changeStart, changeSemi + 1);

const patchExprSrc = sliceProp(src, A_PATCH);

const m5 = balancedParens(seedSrc) && balancedParens(priceStmt) && balancedParens(changeStmt) && balancedParens(patchExprSrc);
ok("M5", "סוגריים מאוזנים בארבעת המקטעים (זרע · price · changePct · patch)", m5, m5 ? "מאוזן" : "לא מאוזן");
const m6 = priceSemi >= 0 && priceStmt.trim().endsWith(";");
ok("M6", "הצהרת `price` מסתיימת ב-`;`", m6, m6 ? "כן" : JSON.stringify(priceStmt.slice(-24)));
if (!m5 || !m6) { console.log("\n⛔ חילוץ נכשל — אדום קשה."); process.exit(1); }

console.log(`\n— price/changePct שחולצו מ-${APP.split("/").pop()} —\n${priceStmt}\n${changeStmt}\n`);
console.log(`— patch.watchlist RHS שחולץ —\n${patchExprSrc}\n`);

const SCANNER_DATA = new Function(`return (${scannerSrc});`)();
const DEFAULT_WATCHLIST = new Function("SCANNER_DATA", `return (${seedSrc});`)(SCANNER_DATA);

const evalPrice = (lp, s) => new Function("lp", "s", `${priceStmt} return price;`)(lp, s);
const evalChangePct = (lp, s) => new Function("lp", "s", `${changeStmt} return changePct;`)(lp, s);
const evalPatchWatchlist = (watchlistItems) => new Function("watchlistItems", `return (${patchExprSrc});`)(watchlistItems);
const isNullish = (v) => v === null || v === undefined;

/* ── בלוק A — הזרע (ג) ────────────────────────────────────────────────────*/
console.log("──────── בלוק A — הזרע (ג) ────────");
ok("A1", "DEFAULT_WATCHLIST נושא 10 פריטים", DEFAULT_WATCHLIST.length === 10, String(DEFAULT_WATCHLIST.length));
{
  const withPrice = DEFAULT_WATCHLIST.filter((it) => "price" in it);
  ok("A2", "⛔ אף פריט ⛔ אינו נושא מפתח `price`", withPrice.length === 0, `${withPrice.length}/${DEFAULT_WATCHLIST.length} נושאים`);
}
{
  const withChange = DEFAULT_WATCHLIST.filter((it) => "change" in it);
  ok("A3", "⛔ אף פריט ⛔ אינו נושא מפתח `change`", withChange.length === 0, `${withChange.length}/${DEFAULT_WATCHLIST.length} נושאים`);
}
{
  const nvda = DEFAULT_WATCHLIST.find((it) => it.ticker === "NVDA");
  const okA4 = !!nvda && nvda.setup === "Breakout" && nvda.chartSym === "NASDAQ:NVDA";
  ok("A4", "NVDA שומר `setup`+`chartSym`", okA4, JSON.stringify(nvda));
}
{
  const btc = DEFAULT_WATCHLIST.find((it) => it.ticker === "BTC");
  const okA5 = !!btc && btc.chartSym === "BINANCE:BTCUSDT";
  ok("A5", "BTC קיים (העוגן שכבר מרנדר `—`)", okA5, JSON.stringify(btc));
}

/* ── בלוק B — הרינדור (ב) ─────────────────────────────────────────────────*/
console.log("\n──────── בלוק B — הרינדור (ב) ────────");
{
  const price = evalPrice(null, { price: 142.30 });
  ok("B1", "lp=null + s.price=142.30 ⇒ price nullish, ⛔ לא 142.30", isNullish(price) && price !== 142.30, String(price));
}
{
  const price = evalPrice(null, {});
  ok("B2", "lp=null + פריט בלי מפתח `price` ⇒ nullish", isNullish(price), String(price));
}
{
  const price = evalPrice({ price: 150 }, { price: 100 });
  ok("B3", "lp={price:150} ⇒ 150 (המסלול החי ⛔ לא נשבר)", price === 150, String(price));
}
{
  const changePct = evalChangePct(null, { change: 3.2 });
  ok("B4", "lp=null + s.change=+3.2 ⇒ changePct nullish, ⛔ לא `0` ו⛔ לא `3.2`", isNullish(changePct) && changePct !== 0 && changePct !== 3.2, String(changePct));
}
{
  const seg = priceStmt + "\n" + changeStmt;
  const has = seg.includes("s.price");
  ok("B5", "המקטע ⛔ אינו מכיל `s.price`", !has, has ? "נמצא" : "אין");
}
{
  const seg = priceStmt + "\n" + changeStmt;
  const hasNullish0 = seg.includes("?? 0");
  const hasOr0 = seg.includes("|| 0");
  ok("B6", "המקטע ⛔ אינו מכיל `?? 0` ⛔ ולא `|| 0`", !hasNullish0 && !hasOr0, `??0=${hasNullish0} ||0=${hasOr0}`);
}

/* ── בלוק C — הצורה הנשמרת (ד) ────────────────────────────────────────────*/
console.log("\n──────── בלוק C — הצורה הנשמרת (ד) ────────");
const seedItemsForWrite = [
  { ticker: "NVDA", price: 142.30, change: 3.2, setup: "Breakout", chartSym: "NASDAQ:NVDA" },
  { ticker: "BTC", setup: "Crypto", chartSym: "BINANCE:BTCUSDT" },
];
{
  const patched = evalPatchWatchlist(seedItemsForWrite);
  const withPrice = patched.filter((it) => "price" in it);
  ok("C1", "⛔ אין `price` ב-`patch.watchlist`", withPrice.length === 0, `${withPrice.length}/${patched.length}`);
}
{
  const patched = evalPatchWatchlist(seedItemsForWrite);
  const withChange = patched.filter((it) => "change" in it);
  ok("C2", "⛔ אין `change` ב-`patch.watchlist`", withChange.length === 0, `${withChange.length}/${patched.length}`);
}
{
  const patched = evalPatchWatchlist(seedItemsForWrite);
  const okC3 = patched.every((it, i) => it.ticker === seedItemsForWrite[i].ticker && it.setup === seedItemsForWrite[i].setup && it.chartSym === seedItemsForWrite[i].chartSym);
  ok("C3", "`ticker`/`setup`/`chartSym` שרדו", okC3, JSON.stringify(patched));
}
{
  const patched = evalPatchWatchlist(seedItemsForWrite);
  ok("C4", "מספר הפריטים נשמר", patched.length === seedItemsForWrite.length, `${patched.length}/${seedItemsForWrite.length}`);
}

/* ── בלוק D — סובלנות לשורה ישנה (ד) ──────────────────────────────────────*/
console.log("\n──────── בלוק D — סובלנות לשורה ישנה (ד) ────────");
const oldRow = { ticker: "NVDA", price: 142.30, change: 3.2, setup: "Breakout", chartSym: "NASDAQ:NVDA" };
{
  const price = evalPrice(null, oldRow);
  ok("D1", "שורה ישנה עם `price:142.30` דרך הרינדור ⇒ nullish", isNullish(price), String(price));
}
ok("D2", "אותה שורה ⇒ `ticker`/`setup`/`chartSym` נקראים", oldRow.ticker === "NVDA" && oldRow.setup === "Breakout" && oldRow.chartSym === "NASDAQ:NVDA", JSON.stringify({ ticker: oldRow.ticker, setup: oldRow.setup, chartSym: oldRow.chartSym }));
{
  const patched = evalPatchWatchlist([oldRow]);
  const okD3 = !("price" in patched[0]) && !("change" in patched[0]);
  ok("D3", "אותה שורה דרך הכתיבה ⇒ `price`/`change` מושמטים", okD3, JSON.stringify(patched[0]));
}
{
  const newRow = { ticker: "BTC", setup: "Crypto", chartSym: "BINANCE:BTCUSDT" };
  let threw = false, patched = [];
  try { patched = evalPatchWatchlist([oldRow, newRow]); } catch { threw = true; }
  ok("D4", "מערך מעורב ישן+חדש ⇒ האורך נשמר, ⛔ אפס זריקה", !threw && patched.length === 2, `threw=${threw} len=${patched.length}`);
}

/* ── ⚪ אינווריאנטות — ירוקות בשני העצים, ⛔ אינן ראיה לתיקון ─────────────── */
console.log("\n──────── ⚪ אינווריאנטות (2) — ⛔ אינן ראיה לתיקון ────────");
{
  const has = /changePct\s*=\s*prevClose\s*\?\s*\(change\s*\/\s*prevClose\)\s*\*\s*100\s*:\s*0\s*;/.test(priceServiceSrc);
  invariant("W1", "`priceService.js` עדיין ממציא `0` כש-`prevClose` falsy (§2 · נשאר פתוח)", has, has ? "כן" : "לא נמצא");
}
{
  const nvda = SCANNER_DATA.find((s) => s.ticker === "NVDA");
  const okW2 = !!nvda && nvda.price === 142.30 && nvda.change === 3.2;
  invariant("W2", "`SCANNER_DATA` עדיין נושא את הליטרלים (מתים אחרי (ג))", okW2, JSON.stringify(nvda));
}

const total = pass + inv + fail;
console.log(`\n${APP}`);
console.log(`אסרציות: ${pass}/25 · אינווריאנטות: ${inv}/2 · סה"כ ${pass + inv}/${total}`);
if (fail) {
  console.log(`🔴 אדומות (${fail}): ${reds.join(" · ")}`);
  process.exit(1);
}
console.log("✅ watchlist fallback: 25/25 + 2 ⚪");
