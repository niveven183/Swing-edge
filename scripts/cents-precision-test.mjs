#!/usr/bin/env node
/**
 * cents-precision-test.mjs — B-321 · מחלקת `D-068`: «אגורות רפאים»
 *
 * 🔴 **מה נמדד:** `Math.round(X)` ערום על כסף שנכנס למעצב שכופה
 * `minimumFractionDigits: 2` מייצר `.00` — **הבטחת דיוק שלא נמדדה**. המשתמש
 * רואה `+$1,234.00` על ערך אמיתי של `1234.47`. ⚠️ **החומרה ⛔ בגודל הסטייה
 * אלא בצורתה** — `.00` בסוף מספר **מבטיח** דיוק לסנט.
 *
 * ⚠️ **מה שמכריע הוא המעצב ⛔ הצורה.** `fmt$` · `fmtBalance` ·
 * `fmtAccountAmount` כופים `2` ספרות; `fmt$0` · `fmtPrice` · `.toLocaleString()`
 * ⛔ כופים. לכן `fmtPrice(Math.round(avgWin))` — **אותה צורה בדיוק** — ⛔ במחלקה,
 * והוא יושב בזרוע הביקורת כדי להוכיח זאת.
 *
 * ⚠️ זו ⛔ «בדיקת טקסט». הבייטים שמורצים כאן הם הבייטים שבקובץ המוצר: כל ביטוי
 * מחולץ מ-`SwingEdge_App.jsx` לפי עוגן ומורץ ב-`new Function` עם סביבה מוזרקת,
 * מול ה**מעצבים האמיתיים** מ-`src/utils.js` וה-`accountAmount` האמיתי.
 * למה חילוץ ⛔ import: 61 `import` ברמה העליונה גוררים את כל גרף האפליקציה.
 * אותה הכרעה בדיוק כמו `hydration-wiring-test.mjs` · `short-pnl-pct-test.mjs`.
 *
 * ⛔ **כשל חילוץ הוא אדום קשה ⛔ ולעולם לא דילוג** (`B-272`) — שינוי-שם או
 * ריפורמט **עוצר את השרשרת**. שערי-המטא אוכפים זאת ו⛔ נספרים במנייה.
 *
 * 🔴 **הלדג'ר — `9` אתרים שחייבים להישאר פגומים.** המחלקה היא `14`; הגל של
 * 15.09 תיקן `5`. `8` העקיפים (`B1`–`B8`) ממתינים ל-`B-325` ו-`A1` ל-`B-321`,
 * ולכן הם **מוצהרים** כאן כ-`OPEN` ונמדדים בכיוון ההפוך: הם חייבים להישאר
 * `.00`. ⛔ **זה ⛔ דילוג** — אתר שיתוקן בלי להזיז את השורה כאן יורה **אדום**,
 * וכך הלדג'ר ⛔ יכול לרקוב בשקט. ⛔ **וזה ⛔ `14/14` ירוק** — הסיכום אומר
 * במפורש `5` ירוקים · `9` פגומים-בהצהרה.
 *
 * ⛔ מה זה ⛔ מוכיח: JSX · React · recharts · RTL · דפדפן אמיתי · פרודקשן.
 * אותו גבול בדיוק של `C-036`·`C-038`·`C-039`·`C-041`·`C-043` ⇒ `C-049`.
 */
import { readFileSync } from "node:fs";
import { fmt$, fmtBalance, fmtPrice, fmtAccountAmount } from "../src/utils.js";
import { accountAmount } from "../src/hooks/useFxRates.js";

const argv = process.argv.slice(2);
const appIdx = argv.indexOf("--app");
const APP = appIdx >= 0 ? argv[appIdx + 1] : new URL("../SwingEdge_App.jsx", import.meta.url).pathname;
const src = readFileSync(APP, "utf8");

/* ── ערך הבדיקה. ⛔ עגול בכוונה: אגורות שאי-אפשר לבלבל עם רעש צף. ───────── */
const X = 1234.47;
const TRADE = { ticker: "AAPL", date: "2026-09-01", currency: "USD" };

/* `fmtAcct` האמיתי — `fmtAccountAmount(accountAmount(...))`, מסלול ה-`identity`.
 * ⛔ מודל: ענף ה**סירוב** (`ok:false` ⇒ `"—"`) ⛔ מכוסה כאן — הוא ⛔ מדפיס כסף
 * ולכן ⛔ יכול לשאת את הפגם. */
const fmtAcct = (trade, amount) => fmtAccountAmount(accountAmount(trade, amount, "USD", {}, {}));

let pass = 0, fail = 0, metaFail = 0;
const reds = [];
function ok(id, label, cond, got) {
  if (cond) { pass++; console.log(`  ✓ ${id.padEnd(3)} ${label} — ${got}`); }
  else { fail++; reds.push(id); console.log(`  ✗ ${id.padEnd(3)} ${label} — ${got}  ⛔ RED`); }
}
function meta(id, label, cond, got) {
  if (cond) console.log(`  ✓ ${id.padEnd(4)} ${label} — ${got}`);
  else { metaFail++; console.log(`  ✗ ${id.padEnd(4)} ${label} — ${got}  ⛔ RED`); }
}

/* ── חילוץ ───────────────────────────────────────────────────────────────── */
function countOf(hay, needle) {
  let n = 0, i = 0;
  for (;;) { const j = hay.indexOf(needle, i); if (j < 0) break; n++; i = j + needle.length; }
  return n;
}

// סורק קדימה מ-`from` ועוצר בתו-סיום בעומק 0. מודע למחרוזות, כי עוגן אחד
// (`K1`) יושב בתוך template literal.
function scanToDepthZero(text, from, stops) {
  let depth = 0, q = null;
  for (let i = from; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === "\\") { i++; continue; } if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'" || ch === "`") { q = ch; continue; }
    if (ch === "(" || ch === "[" || ch === "{") { depth++; continue; }
    if (ch === ")" || ch === "]" || ch === "}") {
      if (depth === 0 && stops.includes(ch)) return i;
      depth--; continue;
    }
    if (depth === 0 && stops.includes(ch)) return i;
  }
  return -1;
}

// קריאה שלמה: העוגן מסתיים ב-`callee(` ⇒ מחזיר `callee(...)` על סוגריים מאוזנים.
function callAt(anchor, callee) {
  const i = src.indexOf(anchor);
  const open = i + anchor.length - 1;              // ה-`(` שבסוף העוגן
  const close = scanToDepthZero(src, open + 1, [")"]);
  if (close < 0) return null;
  return src.slice(open - callee.length, close + 1);
}

// ערך של שדה/ביטוי JSX: העוגן מסתיים ב-`: ` או ב-`{`.
function valueAt(anchor) {
  const i = src.indexOf(anchor);
  const from = i + anchor.length;
  const close = scanToDepthZero(src, from, [",", "}", ")", ";"]);
  if (close < 0) return null;
  return src.slice(from, close).trim();
}

function run(expr, env) {
  const names = Object.keys(env);
  return new Function(...names, `return (${expr});`)(...names.map((n) => env[n]));
}

/* ── טבלת האתרים ─────────────────────────────────────────────────────────── */
// `state`: "WAVE" = תוקן בגל 15.09 ⇒ חייב ירוק · "OPEN:<id>" = פגם מוצהר
// שחייב להישאר פגום עד שהמזהה ייסגר.
const CLASS = [
  // ── ישיר: `Math.round` ערום בתוך קריאת המעצב עצמו ──
  { id: "A1", kind: "call", callee: "fmtAcct", state: "OPEN:B-321",
    label: "toast סגירת עסקה (fmtAcct)", line: 3009,
    anchor: "const shown = fmtAcct(", env: () => ({ fmtAcct, closedTrade: TRADE, pnl: X }) },
  { id: "A2", kind: "call", callee: "fmtAcct", state: "WAVE",
    label: "תא P&L · טבלת הג'ורנל (fmtAcct)", line: 4727,
    anchor: "}`}>{fmtAcct(", env: () => ({ fmtAcct, t: TRADE, pnl: X }) },
  { id: "A3", kind: "call", callee: "fmt$", state: "WAVE",
    label: "כרטיס «רווח ממוצע»", line: 5112,
    anchor: 'journalStats.avgWin == null ? "—" : fmt$(',
    env: () => ({ fmt$, journalStats: { avgWin: X }, dispCcy: "USD" }) },
  { id: "A4", kind: "call", callee: "fmt$", state: "WAVE",
    label: "כרטיס «הפסד ממוצע»", line: 5116,
    anchor: 'journalStats.avgLoss == null ? "—" : fmt$(',
    env: () => ({ fmt$, journalStats: { avgLoss: X }, dispCcy: "USD" }) },
  { id: "A5", kind: "call", callee: "fmt$", state: "WAVE",
    label: "כרטיס «Max Drawdown»", line: 5136,
    anchor: 'text-[var(--v3-loss)]">{fmt$(',
    env: () => ({ fmt$, journalStats: { maxDD: X }, dispCcy: "USD" }) },
  { id: "A6", kind: "call", callee: "fmt$", state: "WAVE",
    label: "«היום הטוב ביותר»", line: 6334,
    anchor: 'text-xs text-slate-500 mt-1">{fmt$(',
    env: () => ({ fmt$, bestDayEntry: ["Monday", { pnl: X, count: 3 }], dispCcy: "USD" }) },

  // ── עקיף: העיגול יושב ב-payload, והמעצב הדו-ספרתי יושב אצל הצרכן.
  // ⚠️ `B7` הוא **תא טבלה** ⛔ tooltip — מי שיקרא «רק גרפים» ישאיר אותו שבור.
  { id: "B1", kind: "value", state: "OPEN:B-325", consumer: fmtBalance,
    label: "עקומת הון → fmtBalance", line: 383,
    anchor: "realizedDayKey(t), equity: ", env: () => ({ balance: X }),
    consumerAnchor: "${fmtBalance(v, dispCcy)} (${p.payload.ticker})" },
  { id: "B2", kind: "value", state: "OPEN:B-325", consumer: fmtBalance,
    label: "עקומת הון מנטי → fmtBalance", line: 523,
    anchor: "t.ticker, equity: ", env: () => ({ runBalance: X }),
    consumerAnchor: 'formatter={(v) => [fmtBalance(v, dispCcy), "Equity"]}' },
  { id: "B3", kind: "value", state: "OPEN:B-325", consumer: fmt$,
    label: "P&L לפי עסקה → fmt$", line: 6190,
    anchor: "name: t.ticker, pnl: ", env: () => ({ calcTradeMetrics: () => ({ pnl: X }), t: TRADE }),
    consumerAnchor: 'formatter={v=>[fmt$(v, dispCcy),"P&L"]}' },
  { id: "B4", kind: "value", state: "OPEN:B-325", consumer: fmt$,
    label: "P&L לפי יום בשבוע → fmt$", line: 6234,
    anchor: "fullDay: day,\n                pnl: ",
    env: () => ({ dayLookup: { Monday: { totalPnL: X, count: 3 } }, day: "Monday" }),
    consumerAnchor: "${fmt$(v, dispCcy)} · ${nTrades(p.payload.count, lang)}" },
  { id: "B5", kind: "value", state: "OPEN:B-325", consumer: fmt$,
    label: "P&L לפי חודש → fmt$", line: 6447,
    anchor: "...m, pnl: ", env: () => ({ m: { pnl: X } }),
    consumerAnchor: "${fmt$(v, dispCcy)} · ${p.payload.count} trade" },
  { id: "B6", kind: "value", state: "OPEN:B-325", consumer: fmt$,
    label: "P&L לפי רגש → fmt$", line: 6457,
    anchor: "wins: e.wins,\n                totalPnL: ", env: () => ({ e: { totalPnL: X } }),
    consumerAnchor: "${fmt$(v, dispCcy)} · ${formatPct(p.payload.winRate)} WR" },
  { id: "B7", kind: "value", state: "OPEN:B-325", consumer: fmt$,
    label: "P&L לפי setup → **תא טבלה** fmt$", line: 6476,
    anchor: "rSampleSize: s.rSampleSize,\n                totalPnL: ", env: () => ({ s: { totalPnL: X } }),
    consumerAnchor: "{fmt$(s.totalPnL, dispCcy)}" },
  { id: "B8", kind: "value", state: "OPEN:B-325", consumer: fmt$,
    label: "פיזור החזקה↔P&L → fmt$", line: 6484,
    anchor: "{ hold, pnl: ", env: () => ({ pnl: X }),
    consumerAnchor: "{fmt$(d.pnl, dispCcy)}" },
];

// ⚠️ זרוע הביקורת היא מה שמגדיר את **רוחב** ההגדרה, ⛔ קישוט.
// `K1`/`K2` נושאים `Math.round` בתוך קריאת מעצב — **אותה צורה בדיוק** —
// וחייבים להישאר ירוקים. ביקורת שנהייתה אדומה ⇒ ההגדרה רחבה מדי ⇒ **עצור.**
// ⚠️ `K3`/`K4` מעוגנים על הביטוי המלא ו⛔ על תחילית: אין תחילית ייחודית
// שאינה חוצה אתר של `B-325`, ועוגן כזה היה נשבר בגל ההוא ומדווח אדום מזויף.
const CONTROL = [
  { id: "K1", kind: "call", callee: "fmtPrice", label: "fmtPrice(round) · רווח ממוצע", line: 825,
    anchor: "רווח ממוצע: ${fmtPrice(", env: () => ({ fmtPrice, avgWin: X, currency: "USD" }),
    want: "noCents" },
  { id: "K2", kind: "call", callee: "fmtPrice", label: "fmtPrice(round) · הפסד ממוצע", line: 825,
    anchor: "מול הפסד ממוצע: ${fmtPrice(", env: () => ({ fmtPrice, avgLoss: X, currency: "USD" }),
    want: "noCents" },
  { id: "K3", kind: "literal", label: "אחוז רגש — הצרכן ⛔ מעצב כסף", line: 6458,
    anchor: "winRate: Math.round(e.winRate)", strip: "winRate: ",
    env: () => ({ e: { winRate: 62.4 } }), want: "eq", expect: 62 },
  { id: "K4", kind: "literal", label: "אחוז setup — הצרכן ⛔ מעצב כסף", line: 6473,
    anchor: "winRate: s.count ? Math.round(s.winRate) : 0", strip: "winRate: ",
    env: () => ({ s: { count: 3, winRate: 62.4 } }), want: "eq", expect: 62 },
  { id: "K5", kind: "call", callee: "fmt$", label: "שומר-האגורות של B-297 (netPnlClosed)", line: 4469,
    anchor: "\n              <StatCard label={t.netPnlClosed} value={fmt$(",
    env: () => ({ fmt$, totalPnL: X, dispCcy: "USD" }), want: "noCents" },
  { id: "K6", kind: "value", label: "שלם-מכוון · toLocaleString", line: 4890,
    anchor: "{t.fromCapital} {dispSym}{", env: () => ({ capitalShown: X }), want: "noCents" },
];

/* ── שערי-מטא · אדום קשה ⇒ יציאה מיידית (B-272) ──────────────────────────── */
console.log("\n── META · עוגן ייחודי · חילוץ · צרכן ──");
const ALL = [...CLASS, ...CONTROL];
for (const s of ALL) {
  const n = countOf(src, s.anchor);
  meta(`M-${s.id}`, `עוגן ${s.id} (:${s.line}) מופיע בדיוק פעם אחת`, n === 1, `${n}`);
}
for (const s of CLASS) {
  if (!s.consumerAnchor) continue;
  const n = countOf(src, s.consumerAnchor);
  meta(`C-${s.id}`, `הצרכן של ${s.id} (מעצב דו-ספרתי) מופיע בדיוק פעם אחת`, n === 1, `${n}`);
}
if (metaFail) {
  console.error(`\n⛔ ${metaFail} שערי-מטא אדומים — כשל חילוץ, ⛔ דילוג.`);
  console.error("נסח את העוגן בחזרה או עדכן אותו במפורש. ⛔ אל תרכך את השער.");
  process.exit(1);
}

for (const s of ALL) {
  s.expr = s.kind === "call" ? callAt(s.anchor, s.callee)
         : s.kind === "literal" ? s.anchor.slice(s.strip.length)
         : valueAt(s.anchor);
  const bal = s.expr != null && (s.expr.match(/\(/g) || []).length === (s.expr.match(/\)/g) || []).length;
  meta(`X-${s.id}`, `הביטוי של ${s.id} חולץ · סוגריים מאוזנים`, bal, s.expr == null ? "⛔ חולץ" : `\`${s.expr}\``);
}
if (metaFail) {
  console.error(`\n⛔ ${metaFail} שערי-מטא אדומים — כשל חילוץ, ⛔ דילוג.`);
  process.exit(1);
}

/* ── החוזה ────────────────────────────────────────────────────────────────
 * ערך נושא-אגורות (`1234.47`) ⇒ המחרוזת המרונדרת **⛔ מסתיימת ב-`.00`**.
 * ⛔ **אין כאן ברירת מחדל ו⛔ `|| 0`** — הערך עובר כמות שהוא (`R-2`).
 */
const endsInDotZeroZero = (str) => /\.00$/.test(String(str));

function renderOf(site) {
  const raw = run(site.expr, site.env());
  return site.kind === "value" && site.consumer ? site.consumer(raw, "USD") : raw;
}

console.log("\n── CLASS · 14 אתרי מחלקת D-068 ──");
let waveGreen = 0, ledgerHeld = 0;
for (const s of CLASS) {
  const out = renderOf(s);
  const clean = !endsInDotZeroZero(out);
  if (s.state === "WAVE") {
    ok(s.id, `${s.label} (:${s.line}) ⇒ אגורות שורדות`, clean, `"${out}"`);
    if (clean) waveGreen++;
  } else {
    // ⚠️ הכיוון **הפוך** בכוונה: אתר בלדג'ר חייב להישאר פגום. אתר שתוקן בלי
    // שהשורה כאן זזה הוא לדג'ר שרקב ⇒ אדום.
    ok(s.id, `${s.label} (:${s.line}) ⇒ ⏸️ ${s.state.slice(5)} — פגם מוצהר, עדיין פגום`,
       !clean, clean ? `"${out}" — 🔴 האתר תוקן! העבר אותו ל-state:"WAVE" באותו קומיט` : `"${out}"`);
    if (!clean) ledgerHeld++;
  }
}

console.log("\n── CONTROL ARM · 6 · חייבת להישאר ירוקה ──");
let ctlGreen = 0;
for (const s of CONTROL) {
  const out = renderOf(s);
  const good = s.want === "eq" ? out === s.expect : !endsInDotZeroZero(out);
  ok(s.id, `${s.label} (:${s.line})`, good,
     s.want === "eq" ? `${out} (מצופה ${s.expect})` : `"${out}"`);
  if (good) ctlGreen++;
}

/* ── סיכום. ⛔ «14/14 ירוק» — הלדג'ר נאמר בשמו. ─────────────────────────── */
const openIds = CLASS.filter((s) => s.state !== "WAVE").map((s) => `${s.id}(${s.state.slice(5)})`);
const waveTotal = CLASS.filter((s) => s.state === "WAVE").length;
console.log(`\nCLASS   ${waveGreen}/${waveTotal} תוקנו (אגורות שורדות)`);
console.log(`LEDGER  ${ledgerHeld}/${CLASS.length - waveTotal} פגומים-בהצהרה — ${openIds.join(" · ")}`);
console.log(`CONTROL ${ctlGreen}/${CONTROL.length} ירוקה`);
console.log(`meta-gate failures: ${metaFail}`);
console.log(`⚠️  המחלקה היא ${CLASS.length}; ${CLASS.length - waveTotal} עדיין פגומים ⇒ ⛔ לקרוא זאת כ-${CLASS.length}/${CLASS.length} ירוק.`);

console.log(`\n${pass} עברו · ${fail} נכשלו${fail ? ` — אדומות: ${reds.join(", ")}` : ""}`);
if (fail) console.error("❌ cents: החוזה הופר.");
else console.log("✅ cents: החוזה מתקיים.");
process.exit(fail ? 1 : 0);
