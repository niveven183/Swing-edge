#!/usr/bin/env node
/**
 * equity-state-test.mjs — B-295 · harness להכרעת «⛔ אין מספר עד שהוא שלם»
 *
 * שני חצאים, ו**הם ⛔ אינם שווי-ערך כראיה**:
 *
 *   A1–A6  — אסרציות **ערך** על `src/lib/equityState.js`. מריצות את הפונקציות
 *            עצמן על שישה מצבים ומשוות מצב · טקסט · תג · שם נגיש.
 *   C1–C12 — שערי **חיווט** על הבייטים של `SwingEdge_App.jsx`. הם מוכיחים
 *            ש-3 אתרי ההון צורכים את המקור האחד ⛔ ולא מרנדרים מספר ערום.
 *            ⚠️ **הם בודקים צורה, ⛔ לא התנהגות** — JSX ⛔ אינו ניתן להרצה
 *            ב-node, ולכן זו הראיה החזקה ביותר שניתן להשיג כאן.
 *
 * ⛔ **מה זה ⛔ אינו מוכיח:** שהתג נראה · RTL · ניגודיות · קורא מסך אמיתי ·
 * React · דפדפן · פרודקשן. כל אלה חיים ב-`C-041` **בלבד** — אותו גבול בדיוק
 * של `C-036`·`C-038`·`C-039`.
 *
 * ⚠️ כשל חילוץ הוא **אדום קשה ⛔ ולעולם לא דילוג** (`B-272`).
 */
import { readFileSync } from "node:fs";
import { deriveEquityState, equityFigure } from "../src/lib/equityState.js";

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

const countOccurrences = (hay, needle) => {
  let n = 0, i = 0;
  for (;;) { const j = hay.indexOf(needle, i); if (j < 0) break; n++; i = j + needle.length; }
  return n;
};

/* ── מילון מבחן. ⛔ לא `getTranslations` — הרצה על i18n אמיתי הייתה הופכת
      כל שינוי ניסוח לאדום. הצורה `{n}`/`{m}` היא מה שנבדק כאן. ─────────── */
const T = {
  loading: "Loading...",
  fxUnavailable: "No exchange rate right now.",
  partialSumWarn: "Account Equity is a partial sum:",
  missingPriceWarn: "no live price for {n} of {m} open trades",
  unconvertedPnlWarn: "no FX rate for {n} of {m} open trades",
  unconvertedClosedWarn: "no FX rate for {n} of {m} closed trades",
};

const FIG = "USD 3,045.66";

/* ── בלוק A — ערך. שישה מצבים, אותם שישה שנמדדו אדומים לפני הגל ────────── */

const run = (io) => {
  const state = deriveEquityState({
    missingCount: io.missingCount,
    unconvertedCount: io.unconvertedCount,
    closedUnconvertedCount: io.closedUnconvertedCount,
    pricesLoading: io.pricesLoading,
    pricesLastUpdated: io.pricesLastUpdated,
    fxStatus: io.fxStatus,
  });
  const fig = equityFigure({
    state,
    text: io.text,
    missingCount: io.missingCount,
    unconvertedCount: io.unconvertedCount,
    closedUnconvertedCount: io.closedUnconvertedCount,
    openCount: io.openCount,
    closedCount: io.closedCount,
    t: T,
  });
  return { state, ...fig };
};

const BASE = {
  missingCount: 0, unconvertedCount: 0, closedUnconvertedCount: 0,
  pricesLoading: false, pricesLastUpdated: new Date("2026-09-05T15:26:41Z"),
  fxStatus: "ready", openCount: 2, closedCount: 4, text: FIG,
};

const CASES = [
  { id: "A1", name: "טעינה ראשונה — מחירים בדרך, ⛔ מעולם לא נחת",
    io: { ...BASE, missingCount: 2, pricesLoading: true, pricesLastUpdated: null, text: "USD 3,000.00" },
    want: { state: "loading", text: "…", mark: false, label: T.loading } },

  { id: "A2", name: "שלם — כל האיברים נחתו",
    io: { ...BASE },
    want: { state: "complete", text: FIG, mark: false, label: null } },

  { id: "A3", name: "חלקי — 2 מתוך 2 בלי מחיר, ⛔ טוען",
    io: { ...BASE, missingCount: 2, text: "USD 3,000.00" },
    want: { state: "partial", text: "USD 3,000.00", mark: true,
            label: "Account Equity is a partial sum: no live price for 2 of 2 open trades" } },

  { id: "A4", name: "אין שער — מוצג במטבע ההון",
    io: { ...BASE, fxStatus: "unavailable", openCount: 0, text: "ILS 2,500.00" },
    want: { state: "no_fx", text: "ILS 2,500.00", mark: true, label: T.fxUnavailable } },

  { id: "A5", name: "טבלת fx בדרך — הסמל עדיין זמני",
    io: { ...BASE, fxStatus: "loading", openCount: 0, text: "ILS 2,500.00" },
    want: { state: "loading", text: "…", mark: false, label: T.loading } },

  { id: "A6", name: "חלקי — עסקה שלא ניתן להמיר (⛔ מחיר חסר)",
    io: { ...BASE, unconvertedCount: 1, text: "USD 3,000.00" },
    want: { state: "partial", text: "USD 3,000.00", mark: true,
            label: "Account Equity is a partial sum: no FX rate for 1 of 2 open trades" } },
];

for (const c of CASES) {
  const got = run(c.io);
  const same = got.state === c.want.state && got.text === c.want.text
    && got.mark === c.want.mark && got.label === c.want.label;
  ok(c.id, c.name, same, `${got.state} · "${got.text}" · mark=${got.mark} · label=${JSON.stringify(got.label)}`);
}

/* ⚪ אינווריאנטה — ⛔ אינה ראיה לתיקון, ירוקה בשני העצים. נרשמת כדי שנדע
   אם ההנחה תישבר: ריענון ברקע ⛔ אינו מרוקן כותרת שכבר נחתה. */
const refresh = run({ ...BASE, pricesLoading: true });
console.log(`⚪ W1 ריענון אחרי נחיתה ⛔ אינו מחזיר ל-loading: ${refresh.state}${refresh.state === "complete" ? "" : "  ⛔"}`);

/* ── בלוק C — חיווט שלושת אתרי ההון ────────────────────────────────────── */

const A_HEADER = "text-end hidden sm:block";
const A_KPI    = 'anchor="equity"';
const A_FOOTER = "{t.accountEquity}: ";

// ⚠️ שערי-מטא — ⛔ **אינם** נספרים ב-18. הם ⛔ אינם מודדים את התיקון אלא את
// כשירות ה-harness: עוגן שזז ⇒ אדום **קשה**, ⛔ לא דילוג ו⛔ לא ירוק כוזב.
const gate = (id, label, cond, got) => {
  console.log(`${cond ? "⚙" : "⛔"} ${id} ${label}: ${got}`);
  return cond;
};
const nH = countOccurrences(src, A_HEADER);
const nK = countOccurrences(src, A_KPI);
const nF = countOccurrences(src, A_FOOTER);
const g1 = gate("M1", "עוגן הכותרת מופיע בדיוק פעם אחת", nH === 1, `${nH}`);
const g2 = gate("M2", "עוגן כרטיס ה-KPI מופיע בדיוק פעם אחת", nK === 1, `${nK}`);
const g3 = gate("M3", "עוגן הפוטר מופיע בדיוק פעם אחת", nF === 1, `${nF}`);
if (!g1 || !g2 || !g3) {
  console.log("\n⛔ חילוץ נכשל — אדום קשה, ⛔ לא דילוג (B-272).");
  process.exit(1);
}

// חלון קריאה סביב כל עוגן. ⚠️ הגודל נגזר מהמבנה בפועל: הכותרת והפוטר הם
// בלוק קצר, כרטיס ה-KPI הוא שורה אחת ארוכה עם `info=` דו-לשוני.
const slice = (anchor, before, after) => {
  const i = src.indexOf(anchor);
  return src.slice(Math.max(0, i - before), i + after);
};
const HEADER = slice(A_HEADER, 0, 700);
const KPI    = slice(A_KPI, 0, 1200);
// ⚠️ הפוטר הוא ה**יחיד** עם look-back: `title`/`aria-label` יושבים על תג ה-
// `span` העוטף, כלומר **לפני** עוגן הטקסט. חלון שמתחיל בעוגן היה עיוור להם.
const FOOTER = slice(A_FOOTER, 200, 300);

const has = (hay, needle) => hay.includes(needle);

ok("C1", "כותרת צורכת `equityFig.text`", has(HEADER, "equityFig.text"), has(HEADER, "equityFig.text") ? "כן" : "⛔ לא");
ok("C2", "כותרת נושאת `aria-label={equityFig.label}`", has(HEADER, "aria-label={equityFig.label}"), has(HEADER, "aria-label={equityFig.label}") ? "כן" : "⛔ לא");
ok("C3", "כותרת נושאת `title={equityFig.label}`", has(HEADER, "title={equityFig.label}"), has(HEADER, "title={equityFig.label}") ? "כן" : "⛔ לא");
ok("C4", "כותרת ⛔ אינה מרנדרת `fmtBalance(curEquity` ערום", !has(HEADER, "fmtBalance(curEquity"), !has(HEADER, "fmtBalance(curEquity") ? "נקי" : "⛔ מספר ערום");

ok("C5", "פוטר צורך `equityFig.text`", has(FOOTER, "equityFig.text"), has(FOOTER, "equityFig.text") ? "כן" : "⛔ לא");
ok("C6", "פוטר נושא `aria-label={equityFig.label}`", has(FOOTER, "aria-label={equityFig.label}"), has(FOOTER, "aria-label={equityFig.label}") ? "כן" : "⛔ לא");
ok("C7", "פוטר נושא `title={equityFig.label}`", has(FOOTER, "title={equityFig.label}"), has(FOOTER, "title={equityFig.label}") ? "כן" : "⛔ לא");
ok("C8", "פוטר ⛔ אינו מרנדר `fmtBalance(curEquity` ערום", !has(FOOTER, "fmtBalance(curEquity"), !has(FOOTER, "fmtBalance(curEquity") ? "נקי" : "⛔ מספר ערום");

ok("C9",  "כרטיס ה-KPI צורך `value={equityFig.text}`", has(KPI, "value={equityFig.text}"), has(KPI, "value={equityFig.text}") ? "כן" : "⛔ לא");
ok("C10", "כרטיס ה-KPI ⛔ אינו מרנדר `fmtBalance(curEquity` ערום", !has(KPI, "fmtBalance(curEquity"), !has(KPI, "fmtBalance(curEquity") ? "נקי" : "⛔ מספר ערום");
const bannerGated = has(src, 'equityState === "partial"');
ok("C11", "באנר B-142 מותנה ב-`equityState === \"partial\"` ⛔ ולא במונים גולמיים", bannerGated, bannerGated ? "כן" : "⛔ לא");
const fxGated = has(src, 'equityState === "no_fx"');
ok("C12", "הודעת ה-fx מותנית ב-`equityState === \"no_fx\"`", fxGated, fxGated ? "כן" : "⛔ לא");

const total = pass + fail;
console.log(`\n${pass}/${total} ✓ · ${fail}/${total} ✗${fail ? `  אדומות: ${reds.join(" ")}` : ""}   (אוכלוסייה: 18 = 6 ערך + 12 חיווט · ⛔ 3 שערי-מטא ו-⚪ W1 אינם נספרים)`);
process.exit(fail ? 1 : 0);
