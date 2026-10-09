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
 * 🔴 **הלדג'ר.** המחלקה היא `14`; הגל של 15.09 תיקן `5`, ו-`9` (`A1` · `B1`–`B8`)
 * הוחזקו כאן כ-`OPEN` בכיוון ההפוך עד 05.10 (K2 · `D-117`), שבו נסגרו כולם.
 * המנגנון נשאר: אתר שיוצהר `OPEN` חייב להישאר פגום, ותיקון בלי הזזת השורה = אדום.
 *
 * 🆕 05.10 — שלוש זרועות נוספות: `Z` (שלם · 0 · שלילי — המעצב על הגולמי, ⛔ קירוב),
 * `S` (סכום שורות = סה״כ, כי עיגול-לשורה מצטבר) ו-`--mutants` (מחוץ לשרשרת:
 * `Math.round` מוחזר לכל אתר בנפרד ⇒ חייב אדום).
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

/* ── --mutants · מחוץ לשרשרת (`npm run probe:cents:mutants`) ──────────────────
 * לכל אחד מ-9 האתרים של K2: `Math.round` מוחזר בעותק זמני של הקובץ, והטסט רץ עליו
 * עם `--app`. המוטנט **נהרג** רק אם האתר עצמו אדום, וגם `Z-<id>n` ו-`S-<id>` (כשיש
 * לאתר קבוצה). עוגן שמופיע ≠ פעם אחת = אדום קשה (`B-272`), כי מוטנט no-op מאשר
 * טסט עיוור. ביקורת: עותק לא-משונה חייב לצאת ירוק. */
if (argv.includes("--mutants")) {
  const M = [
    ["A1", "const shown = fmtAcct(closedTrade, pnl);", "const shown = fmtAcct(closedTrade, Math.round(pnl));", ["A1", "Z-A1n"]],
    ["B1", "equity: balance, ticker: t.ticker, pnl });", "equity: Math.round(balance), ticker: t.ticker, pnl });", ["B1", "Z-B1n"]],
    ["B2", "ticker: t.ticker, equity: runBalance };", "ticker: t.ticker, equity: Math.round(runBalance) };", ["B2", "Z-B2n"]],
    ["B3", "pnl: m.pnl || 0 }))", "pnl: Math.round(m.pnl || 0) }))", ["B3", "Z-B3n", "S-B3"]],
    ["B4", "pnl: dayLookup[day]?.totalPnL || 0,", "pnl: Math.round(dayLookup[day]?.totalPnL || 0),", ["B4", "Z-B4n", "S-B4"]],
    ["B5", ".map(m => ({ ...m, pnl: m.pnl }));", ".map(m => ({ ...m, pnl: Math.round(m.pnl) }));", ["B5", "Z-B5n", "S-B5"]],
    ["B6", "totalPnL: e.totalPnL,", "totalPnL: Math.round(e.totalPnL),", ["B6", "Z-B6n", "S-B6"]],
    ["B7", "totalPnL: s.totalPnL,", "totalPnL: Math.round(s.totalPnL),", ["B7", "Z-B7n", "S-B7"]],
    ["B8", "return { hold, pnl: pnl, ticker: t.ticker };", "return { hold, pnl: Math.round(pnl), ticker: t.ticker };", ["B8", "Z-B8n", "S-B8"]],
  ];
  const { writeFileSync, mkdtempSync, rmSync } = await import("node:fs");
  const { spawnSync } = await import("node:child_process");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const self = new URL(import.meta.url).pathname;
  const dir = mkdtempSync(join(tmpdir(), "cents-mut-"));
  const runOn = (text) => {
    const f = join(dir, "SwingEdge_App.jsx");
    writeFileSync(f, text);
    const r = spawnSync(process.execPath, [self, "--app", f], { encoding: "utf8" });
    const reds = ((r.stdout.match(/אדומות: (.*)$/m) || [])[1] || "").split(", ").filter(Boolean);
    return { code: r.status, reds, meta: /שערי-מטא אדומים/.test(r.stdout + r.stderr) };
  };
  let bad = 0;
  const ctl = runOn(src);
  if (ctl.code === 0) console.log("✅ K0  ביקורת: העותק הלא-משונה ירוק");
  else { bad++; console.log(`❌ K0  ביקורת אדומה על העותק הלא-משונה (exit ${ctl.code}) — אי-אפשר לסמוך על אף מוטנט`); }
  for (const [id, find, repl, want] of M) {
    const n = countOf(src, find);
    if (n !== 1) { bad++; console.log(`❌ ${id}  עוגן המוטנט מופיע ${n} פעמים (≠ 1) — mutant no-op ⇒ אדום קשה`); continue; }
    const r = runOn(src.replace(find, repl));
    const missing = want.filter((w) => !r.reds.includes(w));
    if (r.code !== 0 && !r.meta && missing.length === 0) console.log(`✅ ${id}  Math.round חזר ⇒ נהרג (אדומות: ${want.join(", ")})`);
    else { bad++; console.log(`❌ ${id}  המוטנט שרד — חסרות: ${missing.join(", ") || "—"} · exit ${r.code}${r.meta ? " · כשל-מטא" : ""}`); }
  }
  rmSync(dir, { recursive: true, force: true });
  console.log(bad ? `\n❌ cents mutants: ${bad} שרדו/נכשלו` : `\nmutants: ${M.length}/${M.length} נהרגו · ביקורת ירוקה`);
  process.exit(bad ? 1 : 0);
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
// `state`: "WAVE" = תוקן ⇒ חייב ירוק. 🆕 05.10 (K2 · `B-321` + `B-325`, `D-117`): כל 14
// האתרים ב-"WAVE" — הלדג׳ר ההפוך התרוקן, ו-`OPEN:<id>` נשאר בקוד כמנגנון לגל הבא.
// `env(v)` מזריק את הערך הנבדק; `expect(v)` הוא **המעצב מוחל על הערך הגולמי** —
// כלומר החוזה הוא «⛔ עיגול לפני המעצב», ⛔ «מחרוזת ספציפית».
const fmtUSD = (v) => fmt$(v, "USD");
const CLASS = [
  // ── ישיר: `Math.round` ערום בתוך קריאת המעצב עצמו ──
  { id: "A1", kind: "call", callee: "fmtAcct", state: "WAVE",
    label: "toast סגירת עסקה (fmtAcct)", line: 3199,
    anchor: "const shown = fmtAcct(", env: (v) => ({ fmtAcct, closedTrade: TRADE, pnl: v }),
    expect: (v) => fmtAcct(TRADE, v) },
  { id: "A2", kind: "call", callee: "fmtAcct", state: "WAVE",
    label: "תא P&L · טבלת הג'ורנל (fmtAcct)", line: 4950,
    anchor: "}`}>{fmtAcct(", env: (v) => ({ fmtAcct, t: TRADE, pnl: v }),
    expect: (v) => fmtAcct(TRADE, v) },
  { id: "A3", kind: "call", callee: "fmt$", state: "WAVE",
    label: "כרטיס «רווח ממוצע»", line: 5335,
    anchor: 'journalStats.avgWin == null ? "—" : fmt$(',
    env: (v) => ({ fmt$, journalStats: { avgWin: v }, dispCcy: "USD" }), expect: fmtUSD },
  // A4/A5 מקבלים **גודל** חיובי ומציגים אותו שלילי ⇒ המעצב מוחל על `-v`.
  { id: "A4", kind: "call", callee: "fmt$", state: "WAVE",
    label: "כרטיס «הפסד ממוצע»", line: 5339,
    anchor: 'journalStats.avgLoss == null ? "—" : fmt$(',
    env: (v) => ({ fmt$, journalStats: { avgLoss: v }, dispCcy: "USD" }), expect: (v) => fmtUSD(-v) },
  { id: "A5", kind: "call", callee: "fmt$", state: "WAVE",
    label: "כרטיס «Max Drawdown»", line: 5359,
    anchor: 'text-[var(--v3-loss)]">{fmt$(',
    env: (v) => ({ fmt$, journalStats: { maxDD: v }, dispCcy: "USD" }), expect: (v) => fmtUSD(-v) },
  { id: "A6", kind: "call", callee: "fmt$", state: "WAVE",
    label: "«היום הטוב ביותר»", line: 6576,
    anchor: 'text-xs text-slate-500 mt-1">{fmt$(',
    env: (v) => ({ fmt$, bestDayEntry: ["Monday", { pnl: v, count: 3 }], dispCcy: "USD" }), expect: fmtUSD },

  // ── עקיף: העיגול יושב ב-payload, והמעצב הדו-ספרתי יושב אצל הצרכן.
  // ⚠️ `B7` הוא **תא טבלה** ⛔ tooltip — מי שיקרא «רק גרפים» ישאיר אותו שבור.
  // החוזה כאן כפול: ה-payload **שווה** לערך הגולמי, **וגם** הצרכן מרנדר אותו בלי `.00` מומצא.
  { id: "B1", kind: "value", state: "WAVE", consumer: fmtBalance,
    label: "עקומת הון → fmtBalance", line: 384,
    anchor: "realizedDayKey(t), equity: ", env: (v) => ({ balance: v }),
    consumerAnchor: "${fmtBalance(v, dispCcy)} (${p.payload.ticker})" },
  // 🆕 05.10: ה-`consumerAnchor` הקודם של B2 היה ה-tooltip של **B1** (`:4834`, `data={equityCurve}`).
  // הצרכן האמיתי של B2 הוא גיאומטריית ה-SVG ב-PDF החודשי ⇒ ⛔ מעצב ⇒ נבדק הערך בלבד.
  { id: "B2", kind: "value", state: "WAVE", consumer: null,
    label: "עקומת הון ב-PDF → גיאומטריית SVG (⛔ טקסט)", line: 524,
    anchor: "t.ticker, equity: ", env: (v) => ({ runBalance: v }),
    consumerAnchor: "toY(p.equity).toFixed(1)" },
  { id: "B3", kind: "value", state: "WAVE", consumer: fmt$, group: "trades",
    label: "P&L לפי עסקה → fmt$", line: 6424,
    anchor: "name: t.ticker, pnl: ", env: (v) => ({ m: { pnl: v }, t: TRADE }), // 🆕 09.10 (B-300): payload מ-`m` של `stableCalcTradeMetrics` (המרה), ⛔ `calcTradeMetrics` גולמי
    consumerAnchor: 'formatter={v=>[fmt$(v, dispCcy),"P&L"]}' },
  { id: "B4", kind: "value", state: "WAVE", consumer: fmt$, group: "weekdays",
    label: "P&L לפי יום בשבוע → fmt$", line: 6468,
    anchor: "fullDay: day,\n                pnl: ",
    env: (v) => ({ dayLookup: { Monday: { totalPnL: v, count: 3 } }, day: "Monday" }),
    consumerAnchor: "${fmt$(v, dispCcy)} · ${nTrades(p.payload.count, lang)}" },
  { id: "B5", kind: "value", state: "WAVE", consumer: fmt$, group: "months",
    label: "P&L לפי חודש → fmt$", line: 6689,
    anchor: "...m, pnl: ", env: (v) => ({ m: { pnl: v } }),
    consumerAnchor: "${fmt$(v, dispCcy)} · ${p.payload.count} trade" },
  { id: "B6", kind: "value", state: "WAVE", consumer: fmt$, group: "emotions",
    label: "P&L לפי רגש → fmt$", line: 6699,
    anchor: "wins: e.wins,\n                totalPnL: ", env: (v) => ({ e: { totalPnL: v } }),
    consumerAnchor: "${fmt$(v, dispCcy)} · ${formatPct(p.payload.winRate)} WR" },
  { id: "B7", kind: "value", state: "WAVE", consumer: fmt$, group: "setups",
    label: "P&L לפי setup → **תא טבלה** fmt$", line: 6718,
    anchor: "rSampleSize: s.rSampleSize,\n                totalPnL: ", env: (v) => ({ s: { totalPnL: v } }),
    consumerAnchor: "{fmt$(s.totalPnL, dispCcy)}" },
  { id: "B8", kind: "value", state: "WAVE", consumer: fmt$, group: "scatter",
    label: "פיזור החזקה↔P&L → fmt$", line: 6726,
    anchor: "{ hold, pnl: ", env: (v) => ({ pnl: v }),
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

function renderOf(site, v = X) {
  const raw = run(site.expr, site.env(v));
  return site.kind === "value" && site.consumer ? site.consumer(raw, "USD") : raw;
}
// הערך שהאתר **צריך** להציג: המעצב על הערך הגולמי (`call`) · הצרכן על הגולמי (`value`) ·
// הגולמי עצמו כשאין צרכן-טקסט (B2).
const expectOf = (site, v) =>
  site.kind === "call" ? site.expect(v) : site.consumer ? site.consumer(v, "USD") : v;
const payloadOf = (site, v) => run(site.expr, site.env(v));

console.log("\n── CLASS · 14 אתרי מחלקת D-068 · קלט 1234.47 ──");
let waveGreen = 0, ledgerHeld = 0;
for (const s of CLASS) {
  const out = renderOf(s);
  const want = expectOf(s, X);
  const clean = out === want && !endsInDotZeroZero(out)
    && (s.kind !== "value" || payloadOf(s, X) === X);
  if (s.state === "WAVE") {
    ok(s.id, `${s.label} (:${s.line}) ⇒ אגורות שורדות`, clean, `"${out}"${clean ? "" : ` (מצופה "${want}")`}`);
    if (clean) waveGreen++;
  } else {
    // ⚠️ הכיוון **הפוך** בכוונה: אתר בלדג'ר חייב להישאר פגום. אתר שתוקן בלי
    // שהשורה כאן זזה הוא לדג'ר שרקב ⇒ אדום.
    ok(s.id, `${s.label} (:${s.line}) ⇒ ⏸️ ${s.state.slice(5)} — פגם מוצהר, עדיין פגום`,
       !clean, clean ? `"${out}" — 🔴 האתר תוקן! העבר אותו ל-state:"WAVE" באותו קומיט` : `"${out}"`);
    if (!clean) ledgerHeld++;
  }
}

/* ── Z · זרוע ביקורת: שלם נשאר שלם · 0 נשאר 0 · שלילי נשאר שלילי ───────────
 * לכל אתר ב-WAVE, שלושה קלטים. החוזה זהה לבלוק הקודם — המעצב על הגולמי — ולכן
 * תיקון שמחליף `Math.round` ב-`Math.trunc`/`toFixed(0)`/`|| 0` נתפס כאן גם כשהוא
 * עובר את 1234.47. ⚠️ A4/A5 מקבלים גודל ⇒ «שלילי» שם הוא `-v` של הקלט, כמו במוצר. */
console.log("\n── Z · שלם · אפס · שלילי (14 × 3) ──");
let zGreen = 0, zTotal = 0;
for (const s of CLASS.filter((c) => c.state === "WAVE")) {
  for (const [tag, v] of [["שלם", 1234], ["אפס", 0], ["שלילי", -12.47]]) {
    zTotal++;
    const out = renderOf(s, v), want = expectOf(s, v);
    const good = Object.is(out, want) || out === want;
    ok(`Z-${s.id}${tag === "שלם" ? "i" : tag === "אפס" ? "0" : "n"}`, `${s.id} ${tag} (${v})`, good,
       `"${out}"${good ? "" : ` (מצופה "${want}")`}`);
    if (good) zGreen++;
  }
}

/* ── S · עקביות: סכום השורות = הסה״כ ─────────────────────────────────────────
 * כל קבוצה (עסקאות · ימים · חודשים · רגשות · setups · פיזור) נבנית מאותו ביטוי
 * מחולץ, שורה-שורה. עיגול לכל שורה מצטבר: `[0.4,0.4,0.4]` ⇒ `0` מול `1.20`. */
const ROWS = [0.4, 0.4, 0.4, 12.47, -3.1];
const rawSum = ROWS.reduce((a, b) => a + b, 0);
console.log(`\n── S · סכום שורות = סה״כ · שורות ${JSON.stringify(ROWS)} · Σ=${rawSum.toFixed(2)} ──`);
let sGreen = 0;
const sSites = CLASS.filter((c) => c.group);
for (const s of sSites) {
  const sum = ROWS.reduce((a, v) => a + payloadOf(s, v), 0);
  const good = Math.abs(sum - rawSum) < 1e-9 && fmtUSD(sum) === fmtUSD(rawSum);
  ok(`S-${s.id}`, `${s.group}: Σ שורות (${s.id}) = סה״כ`, good, `${fmtUSD(sum)} מול ${fmtUSD(rawSum)}`);
  if (good) sGreen++;
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
console.log(`Z       ${zGreen}/${zTotal} שלם·אפס·שלילי`);
console.log(`S       ${sGreen}/${sSites.length} סכום שורות = סה״כ`);
console.log(`LEDGER  ${ledgerHeld}/${CLASS.length - waveTotal} פגומים-בהצהרה — ${openIds.join(" · ")}`);
console.log(`CONTROL ${ctlGreen}/${CONTROL.length} ירוקה`);
console.log(`meta-gate failures: ${metaFail}`);
if (CLASS.length - waveTotal) console.log(`⚠️  המחלקה היא ${CLASS.length}; ${CLASS.length - waveTotal} עדיין פגומים ⇒ ⛔ לקרוא זאת כ-${CLASS.length}/${CLASS.length} ירוק.`);

console.log(`\n${pass} עברו · ${fail} נכשלו${fail ? ` — אדומות: ${reds.join(", ")}` : ""}`);
if (fail) console.error("❌ cents: החוזה הופר.");
else console.log("✅ cents: החוזה מתקיים.");
process.exit(fail ? 1 : 0);
