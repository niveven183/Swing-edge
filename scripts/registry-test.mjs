// scripts/registry-test.mjs — מרשם המשימות אינו נשען על משמעת. חוליה 23.
//
// ── למה הקובץ הזה קיים ──────────────────────────────────────────────────────
//
// ב-02.08 נבנה `docs/SWINGEDGE-MASTER-TASKS.md`, נמצאו בו 9 פריטים שהתקיימו
// בשיחה בלבד, והוא נמחק בנימוק "מרשם שני ייסחף". ⚠️ **הנימוק נכון וחלקי.**
// הסחיפה מגיעה מ**כפילות**, ⛔ לא מקיום — ומה שבאמת הרג אותו הוא שלא היה לו
// **שער מכני**. `docs/STATE.md` מתעדכן מפני ש-`CLAUDE.md` §10.1 מחייב;
// למרשם ההוא לא חייב דבר.
//
// ⚠️ ובינתיים המחיר נמדד: `docs/STATE.md` נושא תקרה קשיחה של 100 שורות, ופריט
// ⏭️ **פתוח** שנגזם ממנה נחת ב-`STATE-ARCHIVE` — קובץ שכל קוראיו מניחים
// ש"ארכיון" פירושו "סגור". **33 פריטים פתוחים אותרו כך ב-12.08**
// (`B-051`…`B-083`), חלקם המתינו מ-01.08. זה מה שהשער הזה חוסם.
//
// ── מה נאכף ──────────────────────────────────────────────────────────────────
//
// שבעה קבצים, פריט חי באחד בלבד:
//   docs/NEXT.md     · ההמלצה — **3 בדיוק**, ≤40 שורות        (§9)
//   docs/INBOX.md    · קליטה גולמית, שורה נושאת תאריך ומקור   (§9)
//   docs/STATE.md    · 🔴 עכשיו · ⏭️ 3 הבאים · ⏸️ חסום · ⚠️ סיכונים · ≤100 שורות
//   docs/BACKLOG.md  · כל פריט פתוח שאינו פעיל     (B-)
//   docs/DONE.md     · הושלם, עם hash ועם איך אומת (D-)
//   docs/CHECKS.md   · בדיקות חוזרות, עם מפעיל     (C-)
//   docs/audits/STATE-ARCHIVE-*.md · סגור בלבד
//
// ⚠️ `NEXT` ו-`INBOX` ⛔ **אינם קבצי מזהים** — הם אינם מגדירים `B-`/`D-`/`C-`
// ואינם משתתפים ב-§1 ו-§6. `NEXT` **מצטט** מזהה קיים; `INBOX` הוא מה שטרם קיבל
// מזהה. ⇒ הם נקראים בנפרד מ-`FILES`, ובכוונה.
//
// ── ⚠️ הגדרת "הגדרת שורה" — זה מה שמאפשר ציטוט ──────────────────────────────
//
// **הגדרה** של פריט היא שורת טבלה שהתא הראשון בה הוא המזהה ותו לא:
//   /^\|\s*([BDC]-\d{3})\s*\|/
// כל אזכור אחר — ``B-004`` בפרוזה, בכותרת, או בתוך תא — הוא **ציטוט** ומותר
// בכל קובץ. ⚠️ זו אינה פשרה טכנית אלא **התכונה עצמה**: מזהה יציב שאפשר לנקוב
// בו בפרומפט **בלי מספר שורה**, ומספרי שורה בקובץ בתקרה קשיחה נודדים
// (`docs/STATE.md:98` נדדה 99→100→98 בתוך יומיים — `B-028`).
//
// ── ⛔ מה השער הזה **אינו** בודק ─────────────────────────────────────────────
//
// אינו יכול לדעת אם פריט **נכון**, אם ה-hash שייך לגל הנכון, או אם בדיקה
// ב-CHECKS באמת בוצעה. הוא בודק **צורה**: שהשדה קיים, שהמזהה יחיד, ושמזהה
// שהיה אתמול לא נעלם. צורה היא מה שנשחק ראשון, ⛔ לא מה שחשוב ביותר.

import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const FILES = {
  STATE: "docs/STATE.md",
  BACKLOG: "docs/BACKLOG.md",
  DONE: "docs/DONE.md",
  CHECKS: "docs/CHECKS.md",
  METRICS: "docs/METRICS.md",
};

const ROW = /^\|\s*([BDCM]-\d{3})\s*\|/;
const ROW_R = /^\|\s*(R-\d)\s*\|/;
const DATE = /\b\d{2}\.\d{2}\b/;
const HASH = /[0-9a-f]{7,40}/;

// ── מצבה — מצב-הסיום של מזהה `B-` (הכרעת 13.08, `docs/DECISIONS.md`) ─────────
//
// ⚠️ `B-126` תיעד סתירה **אמיתית** בין שתי אסרציות נכונות: `1.2` נועלת קידומת
// לקובץ ⇒ פריט שהושלם חייב למחוק את `B-`; `6.1` אוסרת בדיוק את המחיקה הזו.
// ההכרעה (ניב, 13.08, אפשרות א'): הפריט **נשאר** ב-`BACKLOG` כשורת **מצבה**
// שסטטוסה `✅ בוצע → D-xxx`, והפירוט המלא עובר ל-`DONE` תחת ה-`D-` החדש.
// ⇒ המזהה אינו נעלם, הקידומות נשארות נקיות, ו⛔ אין עותק שני של הפריט.
const TOMB = /✅\s*בוצע\s*→\s*`?(D-\d{3})`?/;

let pass = 0;
const failures = [];
function check(id, label, ok, detail = "") {
  if (ok) { pass++; console.log(`✅ ${id}  ${label}`); }
  else { failures.push({ id, label, detail }); console.error(`❌ ${id}  ${label}${detail ? `\n      ${detail}` : ""}`); }
}

function read(path) {
  // ⛔ אין ברירת מחדל: קובץ מרשם חסר הוא כשל, לא מחרוזת ריקה (CLAUDE.md §2).
  if (!existsSync(path)) {
    console.error(`❌ ${path} אינו קיים. המרשם אינו שלם — חמשת הקבצים הם החוזה.`);
    process.exit(1);
  }
  return readFileSync(path, "utf8").split("\n");
}

const lines = Object.fromEntries(Object.entries(FILES).map(([k, p]) => [k, read(p)]));

/** כל הגדרות השורה בקובץ: [{ id, cells, lineNo }] */
function defs(key) {
  const out = [];
  lines[key].forEach((line, i) => {
    const m = ROW.exec(line);
    if (!m) return;
    // ⚠️ `\|` הוא צינור מוברח בתא (`a \| b`), ⛔ לא גבול עמודה. פיצול נאיבי
    // היה מזיז את כל העמודות ימינה ומפיל אסרציה על תוכן תקין לחלוטין.
    const cells = line.split(/(?<!\\)\|/).slice(1, -1).map((c) => c.trim().replaceAll("\\|", "|"));
    out.push({ id: m[1], cells, lineNo: i + 1, file: FILES[key] });
  });
  return out;
}

const backlog = defs("BACKLOG");
const done = defs("DONE");
const checks = defs("CHECKS");
const stateDefs = defs("STATE");
// ⚠️ שורות השושלת ב-`METRICS` נושאות אף הן `| M-nnn |` בעמודה הראשונה, ולכן
// `defs` תופס אותן. ⛔ זו **אינה** כפילות `1.1` — הן מכוונות: אותו מזהה, ערך
// שהוחלף. ⇒ מסננים לפי מספר התאים (השושלת = 4, הפנקס = 7), ⛔ לא לפי כותרת
// מקטע, כי כותרת ניתנת לשינוי בשקט בעוד שצורת השורה נשברת ברעש.
const METRIC_CELLS = 7; // | מזהה | מה נמדד | ערך | מקור | נמדד | תוקף | סטטוס |
const metricsAll = defs("METRICS");
const metrics = metricsAll.filter((d) => d.cells.length === METRIC_CELLS);
const lineage = metricsAll.filter((d) => d.cells.length !== METRIC_CELLS);

console.log("\n0 · הקורפוס");
// ⚠️ המכנה נאמר בקול: שער שסורק 0 שורות עובר בשקט מושלם.
check("0.1", `${backlog.length} פריטי BACKLOG · ${done.length} פריטי DONE · ${checks.length} פריטי CHECKS · ${metrics.length} מדדי METRICS`,
  backlog.length >= 20 && done.length >= 5 && checks.length >= 5 && metrics.length >= 3,
  `רצפות: BACKLOG≥20 · DONE≥5 · CHECKS≥5 · METRICS≥3. אחד מהם התכווץ, או ש-ROW נשבר`);

console.log("\n1 · מזהה חי בקובץ אחד בלבד");
// ⚠️ הגדרות בלבד. ציטוט ``B-004`` בפרוזה מותר בכל קובץ — ראה הכותרת.
const home = new Map();
for (const d of [...backlog, ...done, ...checks, ...metrics, ...stateDefs]) {
  if (!home.has(d.id)) home.set(d.id, []);
  home.get(d.id).push(`${d.file}:${d.lineNo}`);
}
const dupes = [...home.entries()].filter(([, where]) => where.length > 1);
check("1.1", `${home.size} מזהים ייחודיים, אפס כפילויות`, dupes.length === 0,
  dupes.map(([id, where]) => `${id} מוגדר ב-${where.join(" · ")}`).join("\n      "));

const wrongPrefix = [
  ...backlog.filter((d) => !d.id.startsWith("B-")),
  ...done.filter((d) => !d.id.startsWith("D-")),
  ...checks.filter((d) => !d.id.startsWith("C-")),
  ...metricsAll.filter((d) => !d.id.startsWith("M-")),
];
check("1.2", "כל מזהה יושב בקובץ של הקידומת שלו", wrongPrefix.length === 0,
  wrongPrefix.map((d) => `${d.id} ב-${d.file}:${d.lineNo}`).join("\n      "));

check("1.3", "⛔ אפס הגדרות פריט ב-STATE — STATE מצטט, אינו מגדיר", stateDefs.length === 0,
  stateDefs.map((d) => `${d.id} מוגדר ב-${d.file}:${d.lineNo} — הגדרה שייכת לקובץ המרשם`).join("\n      "));

console.log("\n2 · פריט BACKLOG נושא מקור ותאריך");
// ⛔ פריט בלי מקור הוא פריט מומצא. פריט בלי תאריך אינו ניתן להתיישנות.
const SRC = 2; // | מזהה | מה | מקור+תאריך | גודל | חוסם? | נמדד | סטטוס |
const noSource = backlog.filter((d) => !d.cells[SRC]);
const noDate = backlog.filter((d) => d.cells[SRC] && !DATE.test(d.cells[SRC]));
check("2.1", `${backlog.length - noSource.length}/${backlog.length} נושאים מקור`, noSource.length === 0,
  noSource.map((d) => `${d.id} (${d.file}:${d.lineNo}) — עמודת מקור ריקה`).join("\n      "));
check("2.2", `${backlog.length - noDate.length}/${backlog.length} נושאים תאריך DD.MM במקור`, noDate.length === 0,
  noDate.map((d) => `${d.id} (${d.file}:${d.lineNo}) — "${d.cells[SRC].slice(0, 60)}"`).join("\n      "));

console.log("\n3 · תקציב STATE");
// ⚠️ התקרה היא הסיבה שהמרשם קיים: גיזום שנכפה בלי יעד מוגדר הוא איך שנעלמו 33.
//
// 🔴 **26.08 — התקרה עברה משורות לבתים, כי `wc -l` מדד את הדבר הלא נכון.**
// התקרה הישנה (100 שורות, נחקקה 05.08) החזיקה את המספר בשלמות ואיבדה את הדבר,
// בשני מחזורים זהים שנמדדו:
//   מחזור 1 · 05.08 → 11.08 : שורות 100→100 (×1.00) · בתים  8,162→49,950 (×6.12)
//             ואז 12.08 — הגיזום שהעביר 33 פריטים **פתוחים** ל-ARCHIVE.
//   מחזור 2 · 12.08 → 26.08 : שורות  68→ 99 (×1.46) · בתים 10,876→75,177 (×6.91)
// ⚠️ זהו `R-4` (שומר מודד **נוכחות** ⛔ לא **אמת**) ועוד `R-1` (מספר בלי יחידה —
// "100" של **מה**?). ⛔ **וזה ⛔ אינו תיאורטי:** קריאת הקובץ נכשלה בסשן שגזם —
// 36,375 tokens מול תקרת 25,000. הקובץ שמתאר "מצב חי" ⛔ לא היה קריא.
// ⚠️ ופתולוגיה שהתקרה ילדה: 50 מ-100 השורות היו **מסגרת** = 3,836 בתים (5% מהנפח)
// ⇒ התקרה **מענישה** שורות קצרות וקריאות ו**מתגמלת** דחיסה. שורה אחת הגיעה
// ל-15,567 בתים — 21% מהקובץ. ראה `docs/audits/STATE-PRUNE-2026-08-26.md`.
//
// **למה בתים ו⛔ לא טוקנים/תווים:** `wc -c` מחזיר בדיוק את `Buffer.byteLength`
// ⇒ ניתן לאמת את השער בפקודה אחת **בלי להריץ את הטסט**. טוקנים תלויי-מודל
// ודורשים תלות חדשה; `String.length` ⛔ אינו מסכים עם `wc -c` בעברית (1.46 ב/תו).
//
// ⛔ **המספר הזה ⛔ אינו יורד כדי "לעבור".** חריגה = גיזום ל-BACKLOG/DONE,
// ⛔ לעולם לא ל-ARCHIVE אם הפריט פתוח, ⛔ ולעולם לא הרחבת התקציב בשקט.
// ⚠️ 16,000 ⛔ אינו "מספיק מקום" — הוא **פי 2.3 מהצורך שנמדד**. אחרי הגיזום
// 26.08 הקובץ עמד על **6,925 בתים (43%)**, ⛔ ולא על 12,166 שנכתבו כאן בטיוטה
// לפני שנמדד. ⛔ המספר המשוער הוחלף במדוד באותו קומיט — הערכה שנשארת בקוד
// היא בדיוק `R-1` (נתון בלי תעודת מקור), והשער הזה קיים כדי לתפוס את זה.
// ⚠️ ⛔ אין כאן מספר "נוכחי" — הוא היה נסחף בשקט בדיוק כמו `100`.
// הצילום היחיד שנרשם נושא את הקומיט שלו: `90d69da` = 6,925b (43%).
// הערך החי נמדד בכל ריצה ומודפס בשורת `3.1`; אימות ידני: `wc -c docs/STATE.md`.
const STATE_BUDGET = 16000; // bytes · נחקק 26.08 · `DECISIONS` 26.08
const stateBytes = Buffer.byteLength(readFileSync(FILES.STATE, "utf8"), "utf8");
const pct = Math.round((stateBytes / STATE_BUDGET) * 100);
check("3.1", `docs/STATE.md = ${stateBytes.toLocaleString("en-US")} bytes מתוך ${STATE_BUDGET.toLocaleString("en-US")} (${pct}%) · ${lines.STATE.length} שורות`,
  stateBytes <= STATE_BUDGET,
  `חריגה של ${(stateBytes - STATE_BUDGET).toLocaleString("en-US")} bytes. ⛔ הגיזום עובר ל-BACKLOG/DONE, לעולם לא ל-ARCHIVE אם הפריט פתוח. ⛔ ולא מרחיבים את STATE_BUDGET כדי לעבור — אימות: wc -c docs/STATE.md`);

console.log("\n4 · פריט DONE נושא hash");
// ⛔ גל בלי hash אינו גל שנסגר — הוא טענה.
const HASH_COL = 3; // | מזהה | מה | תאריך | hash | איך אומת |
const noHash = done.filter((d) => !HASH.test(d.cells[HASH_COL] ?? ""));
const noProof = done.filter((d) => !(d.cells[HASH_COL + 1] ?? "").trim());
check("4.1", `${done.length - noHash.length}/${done.length} נושאים hash`, noHash.length === 0,
  noHash.map((d) => `${d.id} (${d.file}:${d.lineNo}) — עמודת hash = "${d.cells[HASH_COL] ?? ""}"`).join("\n      "));
check("4.2", `${done.length - noProof.length}/${done.length} נושאים "איך אומת"`, noProof.length === 0,
  noProof.map((d) => `${d.id} (${d.file}:${d.lineNo}) — hash בלי ראיה הוא הפניה, לא אימות`).join("\n      "));

// ⚠️ **`B-165` — סעיף ההצהרות היה מחוץ למשטח הקריאה של השער כולו.** `ROW` דורש
// `|` פותח ⇒ ההודאה הכנה בתחתית `docs/DONE.md` («מה **לא** אומת בעין») ⛔ אינה
// שורת טבלה, והשער ⛔ לא ידע שהיא קיימת — ‹R-4› על השער שנועד לאכוף אמת.
// ⛔ **המינימום, ובכוונה ⛔ לא צעד מעבר:** האסרציה מודדת **קיום והפניה** בלבד —
// ⛔ אינה מסווגת הצהרות, ⛔ אינה מחייבת ניסוח, ⛔ אינה מכריעה מה מותר להצהיר,
// ו⛔ אינה מרחיבה את `ROW`. הצהרה שאינה נוקבת ב-`D-` קיים היא הצהרה בלי בעלים.
const declKnown = new Set(done.map((d) => d.id));
const DECL_H = /^##\s.*לא\s*\*{0,2}\s*אומת בעין/;
const declStart = lines.DONE.findIndex((l) => DECL_H.test(l));
const declEnd = declStart < 0 ? -1
  : (() => { const n = lines.DONE.findIndex((l, i) => i > declStart && /^##\s/.test(l)); return n < 0 ? lines.DONE.length : n; })();
const declRows = declStart < 0 ? [] : lines.DONE.slice(declStart + 1, declEnd)
  .map((l, i) => ({ l, no: declStart + 2 + i })).filter(({ l }) => /^-\s/.test(l));
const declBad = declRows.filter(({ l }) => !(l.match(/D-\d{3}/g) ?? []).some((d) => declKnown.has(d)));
check("4.3", declStart < 0
  ? "⛔ סעיף ההצהרות ⛔ אינו קיים ב-docs/DONE.md"
  : `${declRows.length - declBad.length}/${declRows.length} שורות הצהרה · כולן מצביעות ל-D- קיים`,
  declStart >= 0 && declRows.length > 0 && declBad.length === 0,
  declStart < 0
    ? "⛔ הכותרת «מה לא אומת בעין» נעלמה — הצהרה שנמחקת בשקט היא בדיוק ‹R-4›"
    : declBad.map(({ l, no }) => `docs/DONE.md:${no} — ⛔ ${(l.match(/D-\d{3}/g) ?? []).length ? "מצביע ל-D- שאינו קיים ב-DONE" : "אינה נוקבת ב-D- כלל"}: ${l.slice(0, 70)}…`).join("\n      "));

console.log("\n5 · פריט CHECKS נושא תדירות או תנאי-גלישה");
// ⚠️ בדיקה בלי מפעיל אינה בדיקה — היא כוונה. בקשת omrikapara1 המתינה 12 יום
// מ-31.07 בדיוק מפני ששום דבר לא העיר אותה.
const FREQ = 2; // | מזהה | מה | תדירות/תנאי | נבדק לאחרונה | מה נמצא |
const noTrigger = checks.filter((d) => !(d.cells[FREQ] ?? "").trim());
check("5.1", `${checks.length - noTrigger.length}/${checks.length} נושאים מפעיל`, noTrigger.length === 0,
  noTrigger.map((d) => `${d.id} (${d.file}:${d.lineNo}) — בלי תדירות ובלי תנאי-גלישה`).join("\n      "));

// ⚠️ ⛔ **הצורה אינה קוסמטיקה כאן — §11.2 קורא את הקובץ הזה מיקומית.** עמודה
// שנכפלה או שחסרה מזיזה את "נבדק לאחרונה" ואת "מה נמצא", ואז בדיקה שבוצעה
// נקראת כ"לא-בוצעה" ⛔ בשקט מוחלט: השער יסרב — או יאשר — מסיבה **צורנית**,
// והדוח יצביע על הפריט הלא נכון. נמדד 15.08 (`B-149`): `C-026` נשאה **6** תאים
// (תא התדירות כפול) ו-`C-023` נשאה **4** (תאריך בלי תוצאה כלל).
const CHECK_CELLS = 5;
const badShape = checks.filter((d) => d.cells.length !== CHECK_CELLS);
check("5.2", `${checks.length - badShape.length}/${checks.length} שורות CHECKS נושאות ${CHECK_CELLS} תאים`,
  badShape.length === 0,
  badShape.map((d) => `${d.id} (${d.file}:${d.lineNo}) — ${d.cells.length} תאים במקום ${CHECK_CELLS}. ⇒ §11.2 קורא מיקומית ויענה שגוי בשקט`).join("\n      "));

console.log("\n6 · מזהה אינו נעלם ואינו ממוחזר");
// ⚠️ יציבות המזהה היא מה שהופך אותו לבר-ציטוט בפרומפט. מזהה שנעלם שובר כל
// הפניה שנכתבה אליו, **ובשקט** — אין מי שיצעק.
let prev = null;
try {
  prev = new Set();
  for (const [key, path] of Object.entries(FILES)) {
    if (key === "STATE") continue;
    let text;
    try { text = execFileSync("git", ["show", `HEAD:${path}`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); }
    catch { continue; } // הקובץ לא היה קיים בקומיט הקודם — לידה, לא היעלמות
    for (const line of text.split("\n")) {
      const m = ROW.exec(line);
      if (m) prev.add(m[1]);
    }
  }
} catch (e) {
  console.error(`❌ לא ניתן לקרוא את הקומיט הקודם: ${e.message}`);
  process.exit(1);
}
const now = new Set([...backlog, ...done, ...checks, ...metricsAll].map((d) => d.id));
const vanished = [...prev].filter((id) => !now.has(id));
// ⚠️ שורת **מצבה** היא קיום חוקי לכל דבר: היא הגדרת-שורה ככל אחרת, ולכן היא
// נספרת ב-`now` ומספקת את `6.1`. ⛔ זו אינה עקיפה — זה **הפתרון** ל-`B-126`:
// המזהה נשאר בר-ציטוט אחרי שהפריט נסגר. מה שאוכף אותה הוא `8.4`.
const tombs = backlog.filter((d) => TOMB.test(d.cells.at(-1) ?? ""));
check("6.1", prev.size === 0
  ? "אין מרשם בקומיט הקודם — לידה, אין ממה להיעלם"
  : `${prev.size - vanished.length}/${prev.size} מזהי הקומיט הקודם עדיין קיימים (מתוכם ${tombs.length} מצבות)`,
  vanished.length === 0,
  `${vanished.join(" · ")} — ⛔ מזהה אינו נמחק ואינו ממוחזר. פריט שהוכרע נשאר כ**מצבה** \`✅ בוצע → D-xxx\`, ⛔ לא נמחק`);

console.log("\n7 · ❄️ נושא נימוק");
// ⚠️ ❄️ בלי נימוק נפתח מחדש בעוד חודש, ואיש לא יזכור למה נסגר.
const frozen = backlog.filter((d) => d.cells.some((c) => c.includes("❄️")));
const noReason = frozen.filter((d) => !d.cells[1].includes("נימוק:"));
check("7.1", `${frozen.length} פריטי ❄️ במרשם`, frozen.length > 0,
  "אפס ❄️ — או שאין הכרעות-לא-לעשות, או ש-ROW/הסטטוס נשברו. שער שסופר 0 עובר בשקט");
check("7.2", `${frozen.length - noReason.length}/${frozen.length} נושאים "נימוק:"`, noReason.length === 0,
  noReason.map((d) => `${d.id} (${d.file}:${d.lineNo}) — ❄️ בלי נימוק`).join("\n      "));

console.log("\n8 · שכבת השורשים והמצבה");
// ⚠️ שכבת השורשים (`R-1`…`R-6`) היא **מיפוי**, ⛔ לא קטגוריה נוספת. ערכה כולו
// בכך שהיא נשארת מסונכרנת עם הפריטים; מיפוי שנסחף גרוע ממיפוי שאינו קיים,
// מפני שהוא נקרא כאילו הוא נכון. ⇒ ארבע האסרציות כאן בודקות **דו-כיווניות**.
const roots = [];
lines.BACKLOG.forEach((line, i) => {
  const m = ROW_R.exec(line);
  if (!m) return;
  const cells = line.split(/(?<!\\)\|/).slice(1, -1).map((c) => c.trim());
  roots.push({ id: m[1], cells, lineNo: i + 1, members: [...(cells[2] ?? "").matchAll(/B-\d{3}/g)].map((x) => x[0]) });
});
const backlogIds = new Set(backlog.map((d) => d.id));

// 8.1 — שורש הוא הכללה. שורש עם חבר יחיד אינו מנגנון, הוא פריט בתחפושת.
const thinRoots = roots.filter((r) => r.members.length < 2);
const ghostMembers = roots.flatMap((r) => r.members.filter((b) => !backlogIds.has(b)).map((b) => `${r.id}→${b}`));
check("8.1", `${roots.length} שורשים · ${roots.reduce((a, r) => a + r.members.length, 0)} שיוכים`,
  roots.length >= 6 && thinRoots.length === 0 && ghostMembers.length === 0,
  [roots.length < 6 ? `רק ${roots.length} שורשים — נמדדו 6 ב-13.08` : "",
   thinRoots.map((r) => `${r.id} מפנה ל-${r.members.length} פריטים — שורש דורש ≥2`).join("\n      "),
   ghostMembers.length ? `שיוך לפריט שאינו מוגדר: ${ghostMembers.join(" · ")}` : ""].filter(Boolean).join("\n      "));

// 8.2 — כל תג ‹R-n› בגוף הטבלאות מפנה לשורש שקיים.
const rootIds = new Set(roots.map((r) => r.id));
const badTags = [];
lines.BACKLOG.forEach((line, i) => {
  if (ROW_R.test(line)) return;
  for (const m of line.matchAll(/‹(R-\d)›/g)) if (!rootIds.has(m[1])) badTags.push(`${FILES.BACKLOG}:${i + 1} → ${m[1]}`);
});
check("8.2", `${rootIds.size} שורשים מוגדרים · כל תג ‹R-n› מפנה לשורש קיים`, badTags.length === 0,
  badTags.join("\n      "));

// 8.3 — ⚠️ דו-כיווניות. חבר ברשימת השורש **חייב** לשאת את התג בשורתו שלו,
// אחרת נוצרים שני עותקים בלי בעלים — שהוא בדיוק `R-6`.
const tagOf = new Map(backlog.map((d) => [d.id, [...d.cells[1].matchAll(/‹(R-\d)›/g)].map((x) => x[1])]));
const untagged = roots.flatMap((r) => r.members.filter((b) => backlogIds.has(b) && !(tagOf.get(b) ?? []).includes(r.id)).map((b) => `${b} חבר ב-${r.id} ואינו נושא ‹${r.id}›`));
const orphanTags = [...tagOf.entries()].flatMap(([id, ts]) => ts.filter((t) => !roots.find((r) => r.id === t)?.members.includes(id)).map((t) => `${id} נושא ‹${t}› ואינו ברשימת החברים שלו`));
check("8.3", `שיוך דו-כיווני — רשימת השורש ותגי הפריטים מסכימים`, untagged.length === 0 && orphanTags.length === 0,
  [...untagged, ...orphanTags].join("\n      "));

// 8.4 — מצבה חייבת להצביע על `D-` שקיים. מצבה אל תוך החלל היא מזהה שנסגר
// לכאורה ואי-אפשר לאתר לאן. ⚠️ זו האסרציה שסוגרת את `B-126`.
const doneIds = new Set(done.map((d) => d.id));
const danglingTombs = tombs.map((d) => ({ d, target: TOMB.exec(d.cells.at(-1))[1] })).filter((x) => !doneIds.has(x.target));
check("8.4", `${tombs.length} מצבות, כולן מפנות ל-D- קיים`, danglingTombs.length === 0,
  danglingTombs.map((x) => `${x.d.id} (${x.d.file}:${x.d.lineNo}) → ${x.target} — אינו מוגדר ב-${FILES.DONE}`).join("\n      "));

// 8.5 — פריט שמקורו מדידה של 13.08 נושא את תאריך המדידה בעמודת "נמדד".
// ⚠️ ממצא שנמדד ולא תוארך מתיישן בלי שאיש ידע — וזה כל ההבדל בין ממצא להשערה.
const MEAS = 5;
const undated = backlog.filter((d) => /13\.08/.test(d.cells[SRC] ?? "") && !/13\.08/.test(d.cells[MEAS] ?? ""));
check("8.5", `${backlog.filter((d) => /13\.08/.test(d.cells[SRC] ?? "")).length} פריטי 13.08 נושאים תאריך מדידה`, undated.length === 0,
  undated.map((d) => `${d.id} (${d.file}:${d.lineNo}) — מקור 13.08, עמודת "נמדד" = "${d.cells[MEAS] ?? ""}"`).join("\n      "));

// 8.6 — ⚠️ **הפרוזה חייבת לשאת בדיוק את מה ש-8.1 מדד.** `B-250`.
// 8.1 **הדפיס** את מספר השיוכים ו⛔ לא השווה אותו לכלום ⇒ הפרוזה בראש שכבת
// השורשים נסחפה **ארבע פעמים באותה שורה** («126» 13.08 · «167·81·88·86» 19.08 ·
// «170·82·89·88» 20.08 · «243·109·119·134» 26.08) והשער היה **ירוק** בכל אחת מהן.
// ⛔ **התיקון אינו עדכון המספר** — זה מה שנעשה ארבע פעמים. התיקון הוא שהמספר
// יפסיק להיות פרוזה ויהפוך לערך **נמדד** שנכשל כשהוא סוטה.
//
// ⚠️ ו**היעדר התאמה של התבנית הוא כשל, ⛔ לא דילוג**: אם מישהו ינסח מחדש את
// הפרוזה, גרסה סלחנית תעבור על **אפס** השוואות — שהוא בדיוק `R-4` בתחפושת
// חדשה. ⇒ כל תבנית חייבת להיתפס **בדיוק פעם אחת**.
const rootProse = lines.BACKLOG.join("\n");
const tagged = [...tagOf.values()].filter((t) => t.length > 0).length;
const PROSE = {
  "סה״כ פריטים":   { re: /\*\*(\d+) הפריטים\*\*/g,                        measured: backlog.length },
  "עם שורש":       { re: /\*\*(\d+)\/(\d+) פריטים נבדלים ממופים\*\*/g,     measured: tagged },
  "שיוכים":        { re: /\*\*(\d+) שיוכים\*\*/g,                          measured: roots.reduce((a, r) => a + r.members.length, 0) },
  "בלי שורש":      { re: /\*\*(\d+)\/(\d+) ⛔ בלי שורש\*\*/g,              measured: backlog.length - tagged },
};
const proseErrs = [];
const proseOk = [];
for (const [name, { re, measured }] of Object.entries(PROSE)) {
  const hits = [...rootProse.matchAll(re)];
  if (hits.length !== 1) {
    proseErrs.push(`"${name}" — התבנית נתפסה ${hits.length} פעמים ב-${FILES.BACKLOG}, נדרש בדיוק 1. ⛔ תבנית שאינה נתפסת אינה "אין מה להשוות" — היא שער עיוור`);
    continue;
  }
  const stated = Number(hits[0][1]);
  // תבנית `X/Y`: גם המכנה נבדק — "115/250" עם מכנה שגוי הוא מנה בלי מכנה (§2).
  const denom = hits[0][2] !== undefined ? Number(hits[0][2]) : null;
  if (stated !== measured) proseErrs.push(`"${name}" — הפרוזה אומרת ${stated}, המדידה ${measured}`);
  else if (denom !== null && denom !== backlog.length) proseErrs.push(`"${name}" — המונה ${stated} נכון אך המכנה ${denom} ≠ ${backlog.length} פריטים`);
  else proseOk.push(`${name}=${stated}`);
}
check("8.6", `הפרוזה של שכבת השורשים נושאת את המספרים המדודים (${proseOk.join(" · ")})`,
  proseErrs.length === 0,
  [...proseErrs, "⛔ אל תעדכן את המספר בפרוזה כדי לעבור אם ההפרש אמיתי — בדוק קודם איזה מהשניים שגוי (`B-250`)"].filter(Boolean).join("\n      "));

console.log("\n9 · NEXT — ההמלצה · INBOX — הקליטה");
// ⚠️ `BACKLOG` **אוסר** להמליץ סדר, ובצדק: 129 פריטים בסדר כלשהו הם רשימה
// שמתחזה להכרעה. ⇒ ההכרעה יושבת בקובץ **נפרד** שכל כולו שלושה פריטים, ומה
// שהופך אותו להכרעה הוא **התקרה**: רביעי מחייב להוציא אחד.
// ⛔ ו-`NEXT` אינו מקור — הוא מצטט. פרט שנכתב בו הוא עותק שני שייסחף (`R-6`).
const next = read("docs/NEXT.md");
const inbox = read("docs/INBOX.md");

// כותרת פריט: `## <n> · ...` — ⛔ לא כל `##`, כדי שכותרות פרוזה לא ייספרו.
const ITEM = /^##\s+\d+\s+·\s+(.+)$/;
const items = [];
next.forEach((line, i) => {
  const m = ITEM.exec(line);
  if (m) items.push({ title: m[1], lineNo: i + 1, body: [] });
});
next.forEach((line, i) => {
  const owner = items.filter((it) => it.lineNo <= i).at(-1);
  if (owner && !ITEM.test(line)) owner.body.push(line);
});

check("9.1", `docs/NEXT.md = ${next.length} שורות (תקרה 40)`, next.length <= 40,
  `חריגה של ${next.length - 40} שורות. ⛔ NEXT מצטט ואינו מפרט — הפירוט שייך ל-BACKLOG`);

check("9.2", `${items.length} פריטים ב-NEXT (נדרש בדיוק 3)`, items.length === 3,
  items.length > 3
    ? `${items.length} פריטים — ⛔ הרביעי מחייב להוציא אחד. רשימה אינה הכרעה`
    : `${items.length} פריטים — פחות מ-3 אינו כיוון, ו-0 פירושו שהפורמט נשבר`);

// ⚠️ ההפניה היא כל ערכו של הקובץ: `NEXT` שמפנה למזהה שאינו קיים הוא המצאה.
const nextRefs = items.map((it) => ({
  it,
  ids: [...(it.title + it.body.join("\n")).matchAll(/B-\d{3}/g)].map((x) => x[0]),
}));
const ghostRefs = nextRefs.flatMap(({ it, ids }) =>
  ids.filter((id) => !backlogIds.has(id)).map((id) => `${it.title.slice(0, 40)} → ${id}`));
const refless = nextRefs.filter(({ ids }) => ids.length === 0);
check("9.3", `${nextRefs.reduce((a, r) => a + r.ids.length, 0)} הפניות B- מ-NEXT, כולן קיימות ב-BACKLOG`,
  ghostRefs.length === 0 && refless.length === 0,
  [ghostRefs.length ? `הפניה למזהה שאינו מוגדר: ${ghostRefs.join(" · ")}` : "",
   refless.map((r) => `${r.it.title.slice(0, 40)} (docs/NEXT.md:${r.it.lineNo}) — ⛔ בלי הפניה ל-B-`).join("\n      ")]
    .filter(Boolean).join("\n      "));

// ⛔ "מדד סגירה" הוא מה שמבדיל המלצה ממשאלה. ⚠️ ניתן לצפייה או למדידה —
// השער בודק **נוכחות** ו⛔ אינו יכול לדעת אם המדד באמת נצפה.
const noMetric = items.filter((it) => !it.body.some((l) => l.includes("מדד סגירה")));
check("9.4", `${items.length - noMetric.length}/${items.length} פריטי NEXT נושאים "מדד סגירה"`,
  noMetric.length === 0,
  noMetric.map((it) => `${it.title.slice(0, 40)} (docs/NEXT.md:${it.lineNo}) — ⛔ "הקוד נכתב" אינו מדד`).join("\n      "));

// ⚠️ שורת INBOX בלי מקור אינה ניתנת ל-triage: אי-אפשר לחזור ולשאול את מי שאמר.
// ⛔ ואי-אפשר לסמוך על הרג'קס לתפוס שורה חסרת-תאריך — היא פשוט לא הייתה נראית.
// ⇒ נאספות **כל** שורות הטבלה, ואז נבדק כל תא.
const inboxRows = [];
inbox.forEach((line, i) => {
  if (!/^\s*\|/.test(line)) return;
  if (/^\s*\|[\s|:-]*$/.test(line)) return;               // מפריד
  const cells = line.split(/(?<!\\)\|/).slice(1, -1).map((c) => c.trim());
  if (cells[0] === "תאריך") return;                        // כותרת
  inboxRows.push({ cells, lineNo: i + 1 });
});
const badInbox = inboxRows.filter((r) => !DATE.test(r.cells[0] ?? "") || !(r.cells[2] ?? "").trim());
check("9.5", `${inboxRows.length - badInbox.length}/${inboxRows.length} שורות INBOX נושאות תאריך ומקור`,
  badInbox.length === 0,
  badInbox.map((r) => `docs/INBOX.md:${r.lineNo} — תאריך="${r.cells[0] ?? ""}" מקור="${r.cells[2] ?? ""}"`).join("\n      "));

// ⚠️ **9.6 — `STATE ⏭️` מצטט את `NEXT`, ⛔ ואינו מחזיק רשימה משלו.**
//
// ⛔ **האסרציה הזו נולדה מסתירה מדודה, ⛔ לא מהשערה.** 15.08 נמדד שהשתיים חיו
// במקביל ב-**0/3 חפיפה**: `STATE ⏭️` נשא `B-007`·`B-009`·`B-006` בעוד `NEXT`
// נשא `B-001`+`B-002`+`B-018`·`B-129`·`B-143` (`B-145`). ⇒ שתי הכרעות בלי בעלים
// אחד, והקורא ⛔ אינו יודע איזו מהן חיה.
//
// 🔴 **ו-`9.1`–`9.5` ⛔ לא יכלו לתפוס זאת** — חמשתן קוראות את `NEXT` **לבדו**
// ומאמתות שהוא **תקין בפני עצמו**: תקרה · מניין · הפניות קיימות · מדד סגירה.
// ⛔ **שער שמאמת נוכחות ואינו מאמת הסכמה הוא `R-3`** — הוא ירוק בדיוק ביום
// שבו שני הקבצים אומרים דברים הפוכים.
//
// ⚠️ **ההשוואה מול ה**כותרות** בלבד, ⛔ לא מול גוף הפריט.** הגוף מצטט מזהי
// **הקשר** (`B-142` ו-`B-144` יושבים שם היום), ודרישה ש-`STATE` ישקף גם אותם
// הייתה הופכת אותו לעותק שני של הפרוזה — בדיוק ה-`R-6` שהשער נועד למנוע.
// ⇒ **הכותרת היא ההכרעה; הגוף הוא ההנמקה.**
//
// ⚠️ **והבדיקה דו-כיוונית בכוונה.** "כל מזהה של `NEXT` מופיע ב-`STATE`" לבדה
// עוברת גם כשב-`STATE` יושבים שלושה פריטים **נוספים** — כלומר בדיוק המצב
// שנמדד. ⇒ נבדק גם העודף.
const NEXT_HEAD = /^##\s*⏭️/;
const stStart = lines.STATE.findIndex((l) => NEXT_HEAD.test(l));
const stEnd = stStart < 0 ? -1
  : lines.STATE.findIndex((l, i) => i > stStart && (/^##\s/.test(l) || /^---\s*$/.test(l)));
const stBlock = stStart < 0 ? []
  : lines.STATE.slice(stStart, stEnd < 0 ? lines.STATE.length : stEnd);
const ids = (s) => [...s.matchAll(/B-\d{3}/g)].map((x) => x[0]);
const stateNextIds = new Set(ids(stBlock.join("\n")));
const nextTitleIds = new Set(items.flatMap((it) => ids(it.title)));
const missingInState = [...nextTitleIds].filter((id) => !stateNextIds.has(id));
const extraInState = [...stateNextIds].filter((id) => !nextTitleIds.has(id));
check("9.6",
  `STATE ⏭️ = NEXT — ${stateNextIds.size} מזהים משני הצדדים, זהות דו-כיוונית`,
  stStart >= 0 && nextTitleIds.size > 0 && missingInState.length === 0 && extraInState.length === 0,
  stStart < 0 ? "⛔ מקטע ⏭️ לא נמצא ב-docs/STATE.md — הפורמט נשבר"
    : nextTitleIds.size === 0 ? "⛔ אפס מזהים בכותרות NEXT — הפורמט נשבר, וזהות מול ריק אינה זהות"
    : [missingInState.length ? `ב-NEXT ⛔ ואינו ב-STATE ⏭️: ${missingInState.join(" · ")}` : "",
       extraInState.length ? `ב-STATE ⏭️ ⛔ ואינו ב-NEXT: ${extraInState.join(" · ")} — ⛔ STATE מצטט, ⛔ אינו מכריע` : ""]
      .filter(Boolean).join("\n      "));

// ── §10 · ⛔ קובץ-מרשם מחוץ ל-`docs/` ────────────────────────────────────────
//
// ⚠️ **זו האסרציה שנולדה מכישלון מדוד, ⛔ לא מהשערה.** `SwingEdge-Master-Tasks.md`
// נבנה 03.08 בשורש הריפו **בדיוק לאותה בעיה** שהמרשם פותר, נשכח תוך 10 ימים,
// והמשיך להיקרא כתמונת מצב חיה. ⛔ **תשע האסרציות שמעל לא יכלו לראותו** — הן
// קוראות חמישה נתיבים קבועים, וקובץ בשורש אינו אחד מהם. ⇒ הוא נסחף בשקט מוחלט
// (`B-131`), ו-33 פריטיו מוינו ביד ב-13.08 — **10 מהם לא היה להם בית אחר**.
//
// ⛔ **הבדיקה היא על מבנה, ⛔ לא על שם.** קובץ בשם תמים שצבר טבלת מזהים הוא
// אותה סחיפה בדיוק. ⇒ שני סמנים בלתי-תלויים: **שורת-הגדרה** (`| X-nnn |`),
// או **כותרת** שמכריזה על עצמה כמרשם.
//
// ⚠️ נסרקים **קבצים עקובים בלבד** (`git ls-files`) ובעומק השורש בלבד: קובץ
// שאינו בגיט אינו יכול להיסחף בין סשנים, ו-`HANDOFF*.md` אסור לקומיט ממילא (§5).
const REGISTRY_ROW = /^\|\s*[A-Z]+-\d{2,3}\s*\|/;
const REGISTRY_TITLE = /^#{1,3}\s.*(משימות|מרשם|TASKS|BACKLOG|REGISTRY)/i;
const EXEMPT = new Set(["README.md", "CLAUDE.md", "CONTEXT.md"]);

const rootMd = execFileSync("git", ["ls-files", "*.md"], { encoding: "utf8" })
  .split("\n").filter((p) => p && !p.includes("/") && !EXEMPT.has(p));

const rogue = rootMd.map((p) => {
  const src = readFileSync(p, "utf8").split("\n");
  const rows = src.filter((l) => REGISTRY_ROW.test(l)).length;
  const title = src.some((l) => REGISTRY_TITLE.test(l));
  return { p, rows, title };
}).filter((f) => f.rows > 0 || f.title);

check("10.1", `${rootMd.length} קבצי .md עקובים בשורש · ⛔ אף אחד אינו מרשם`,
  rogue.length === 0,
  rogue.map((f) => `${f.p} — ${f.rows} שורות-הגדרה${f.title ? " · כותרת מרשם" : ""}. ⇒ מרשם שני; העבר ל-docs/ או מזג ומחק (B-131)`).join("\n      "));

// ── §11 · עמודת `T` — עומק האבחון והאימות (`CLAUDE.md` §15) ─────────────────
//
// ⚠️ **הרקע מדוד:** גל ג׳ נמרח על שלושה סבבים מפני שהאבחון **הניח** במקום למדוד
// והאימות בדק **שנכתב** ולא **שנראה** ‹R-3›. הסיווג הופך את עומק העבודה לפונקציה
// של **חמש** שאלות בינאריות ⛔ ולא של תחושה, והעמודה היא מה שהופך אותו לניתן לביקורת.
const T_COL = 5;                       // | מזהה | מה | תאריך | hash | איך אומת | T |
const RETRO = /\(רטרו\)/;
const noT = done.filter((d) => !/T[123]/.test(d.cells[T_COL] ?? ""));
check("11.1", `${done.length - noT.length}/${done.length} שורות DONE נושאות רמת T`,
  noT.length === 0,
  noT.map((d) => `${d.id} (${d.file}:${d.lineNo}) — עמודת T = "${d.cells[T_COL] ?? ""}". ⛔ הרמה נקבעת מהתשובות, לא בדיעבד`).join("\n      "));

// ⚠️ ⛔ **`/אומת בעין/` לבדה היא שער כוזב** — היא מתאימה גם ל"**לא** אומת בעין",
// שהוא בדיוק מה ש-`D-009` ו-`D-011` כתובים. ⇒ נדרש סמן **חיובי**, ובמקביל
// נדחית ההכחשה במפורש. ⛔ שורות `(רטרו)` פטורות: הסיווג שלהן נגזר ב-13.08
// מטקסט השורה, ורטרו-התאמה שלהן כדי לעבור היא ההפרה עצמה.
// ⚠️ ⛔ **וגם סמן חיובי אינו מספיק אם הוא מצוטט** — נמדד 13.08: `D-030` תואר
// כ-`T3` זמנית ו**עבר בירוק** משום ששורתו **מתעדת את הרגקס עצמו** (`` `/אומת
// בעין/` `` והציטוט `"לא אומת בעין"`). זו הפעם ה**שלישית** שאסרציה נופלת על
// התיעוד של עצמה (`B-120`) ⇒ הציטוטים מנוכים **לפני** הבדיקה. ⛔ אל תסיר את
// `strip` כדי לפשט — הוא ההבדל בין "מודד אמת" ל"מודד נוכחות מחרוזת" ‹R-4›.
// ⚠️ **`אומת-מקור` הוא סמן שווה-ערך, ⛔ לא הנחה** (`CLAUDE.md` §15, הכרעת 13.08):
// `T3` על `docs`/DB אין לו מסך מושפע, ולכן "אימות עין" אינו מוגדר שם — האימות הוא
// **קריאת התוצר מ-`origin`** (⛔ לא מהעץ המקומי) + מדידה חוזרת עצמאית. ⛔ בלי הסמן
// הזה השער היה מכריח לכתוב "עין" על משהו שאין בו עין ⇒ סמן שקרי כדי לעבור ‹R-3›.
// ⚠️ **וההכחשה נדחית בשני הסמנים** — "לא אומת-מקור" הוא בדיוק אותה מלכודת.
// ⚠️ 🔴 **`צילום` הוסר מרשימת הסמנים — הוא הענף שירה בטעות** (`B-149`, נמדד
// 15.08). `D-036` עבר את השער ב-`cd65365` **בזכות המילה `צילום` שבתוך המשפט**
// ⟪צילום ההודעה בדיסקורד/מייל ⛔ אינו בידי Code — שלב 3 פתוח על ניב⟫ — כלומר
// השער התאים ל**הצהרה שהצילום לא נעשה**. זו הפעם ה**רביעית** ש-`B-120` חוזר:
// אסרציה נופלת על התיעוד של **היעדרה** ‹R-3›. ⛔ `צילום` הוא שם-עצם שמופיע
// **זהה** ב"יש צילום" וב"צילום ממתין" ⇒ ⛔ אינו יכול להיות טענת אימות.
// ⚠️ ⛔ **אל תחזיר אותו** כדי להקל על ניסוח — הניסוח הוא מה שנמדד ככשל.
const EYE = /(אומת בעין|אומת-מקור)/g;
const DENIED = /לא\**\s*\**\s*אומת(\s+בעין|-מקור)/;
const strip = (s) => s.replace(/`[^`]*`/g, " ").replace(/"[^"]*"/g, " ");

// ⚠️ **הכחשה נמדדת בקרבת הסמן, ⛔ לא בכל התא** (`B-149`, נמדד 15.08). תא ראיה
// הוא פסקה שלמה: ב-`D-036` הצירוף "בלוק 4 ⛔ **לא בוצע**" יושב **2,165 תווים**
// מהסמן ומדבר על **בלוק עבודה**, ⛔ לא על בדיקה. אב-טיפוס שסרק את כל התא הפיל
// **6/6 שורות תקינות** ⇒ היה מכריח לרכך את `DONE` כדי לעבור — ההפרה עצמה.
// ⛔ **ו-`⛔` ⛔ אינו מילת הכחשה** — הוא סימן הדגשה בכל תא במרשם; הכללתו היא
// מה שהפיל את האב-טיפוס. אוצר המילים כאן **מכחיש ביצוע**, ⛔ ואינו שולל כללית.
const DENY_NEAR = /(לא\s*\**\s*אומת|לא\s*\**\s*בוצע|טרם\s*\**\s*בוצע|טרם\s*\**\s*הופעל|פתוחה|ממתינה|אינו בידי|אינה בידי)/;
const NEAR_W = 90;
const denied = (text, at, len) => DENY_NEAR.test(text.slice(Math.max(0, at - NEAR_W), at + len + NEAR_W));

// ⚠️ **«בוצעה» ⛔ אינה «✅»** — נמדד 15.08: רק **3/26** בדיקות נושאות `✅`, בעוד
// `C-006`·`C-011`·`C-017`·`C-018` בוצעו **ומצאו 🔴**. בדיקה שרצה ומצאה תקלה
// **בוצעה**, והמצאת "סימן ✅" הייתה מכריחה לצבוע ממצא אדום בירוק כדי לעבור.
// ⇒ הסימן הוא **תאריך אמיתי + תוצאה שאינה ממתינה**, ⛔ לא סנטימנט.
// ⚠️ **מצביע ל-`D-` הוא מקור-אמת-אחד ‹R-6›, ⛔ לא העתקה** — תוצאה שנכתבת
// פעמיים נסחפת. אבל מצביע למזהה ש⛔ אינו קיים הוא הפניה **מתה** שנקראת כראיה
// ⇒ נדרש שיהיה קיים ב-`DONE`. זו הסיבה שהמצביע חייב להיות מזהה ⛔ ולא טקסט חופשי.
const PENDING = /(טרם|⏳|ממתין)/;
export function performedFrom(checkRows, knownDone) {
  return new Map(checkRows.map((c) => {
    const when = c.cells[3] ?? "", find = c.cells[4] ?? "";
    const refs = find.match(/D-\d{3}/g) ?? [];
    const live = refs.length === 0 || refs.some((r) => knownDone.has(r));
    return [c.id, c.cells.length === CHECK_CELLS && DATE.test(when) && !PENDING.test(when)
      && find.trim() !== "" && !PENDING.test(find) && live];
  }));
}

// ⚠️ **§11.2 קורא שני קבצים, ⛔ לא אחד** (`B-149`). אזכור `C-0xx` הוא ראיה **רק
// אם אותה בדיקה בוצעה בפועל ב-`CHECKS.md`** — קודם לכן די היה ב**הפניה** אליה,
// גם לבדיקה שהייתה **פתוחה באותו רגע** ⇒ שער שמאשר בטעות ‹R-3›.
// ⚠️ **מזהי הבדיקה נקראים מהתא הגולמי, ⛔ לא אחרי `strip`** — סגנון המרשם עוטף
// כל מזהה בגרשיים (`` `C-026` ``), ולכן אחרי `strip` שרדו **0** מזהים והענף היה
// **מת**. ⛔ ואין כאן חזרה למלכודת `B-120`: המחרוזת `C-0\d\d` ⛔ אינה מתאימה
// לרגקס `/C-0\d\d/` (נדרשות ספרות), ו-`strip` נשאר בתוקף לענף המפורש.
export function markerVerdict(cell, performed) {
  const p = strip(cell);
  for (const m of p.matchAll(EYE)) {
    if (!denied(p, m.index, m[0].length)) return { ok: true, why: `סמן מפורש: ${m[0]}` };
  }
  // ⚠️ **מיקום הווטו הוא התיקון, ⛔ לא קיומו** (`B-162`, 19.08). הוא יושב כאן
  // בכוונה כפולה: **אחרי** לולאת `EYE` — כי מעליה הוא פוסל את כל התא ומותיר את
  // ענף הקרבה (`denied`, ±90 תווים) **בלתי-נגיש**, כך שסמן תקין נופל בגלל
  // הכחשה של משהו **אחר** 400 תווים משם; ו**לפני** ענף `C-0xx` — כי הכרעת ניב
  // היא ש**הודאה מפורשת גוברת על ראיה עקיפה**, אחרת תא המצהיר ⛔ "לא אומת בעין"
  // נחשב מאומת בזכות מצביע לבדיקה אחרת, וכנות נעשית חסרת-משקל.
  // ⛔ **אל תעביר אותו למעלה "לניקיון" ו⛔ אל תמחק אותו** — שני הכיוונים נצפו
  // אדומים ומוקפאים ב-fixtures 12 ו-13.
  if (DENIED.test(p)) return { ok: false, why: "הכחשה מפורשת של אימות-עין/מקור" };
  const refs = [...new Set(cell.match(/C-0\d\d/g) ?? [])];
  if (!refs.length) return { ok: false, why: "⛔ אין סמן אימות כלל" };
  const seen = [];
  for (const r of refs) {
    const at = cell.indexOf(r);
    if (denied(cell, at, r.length)) { seen.push(`${r}=הוכחשה בשורה`); continue; }
    if (performed.get(r) === true) return { ok: true, why: `אזכור בדיקה שבוצעה: ${r}` };
    seen.push(`${r}=${performed.has(r) ? "לא-בוצעה ב-CHECKS" : "⛔ אינה קיימת ב-CHECKS"}`);
  }
  return { ok: false, why: `אזכור בלבד — ${seen.join(" · ")}` };
}

const performed = performedFrom(checks, doneIds);
const t3Rows = done.filter((d) => /T3/.test(d.cells[T_COL] ?? "") && !RETRO.test(d.cells[T_COL] ?? ""));
const blindT3 = t3Rows.map((d) => ({ d, v: markerVerdict(d.cells[T_COL - 1] ?? "", performed) })).filter((x) => !x.v.ok);
check("11.2", `${t3Rows.length} שורות T3 לא-רטרו · כולן נושאות אימות עין/מקור **שבוצע**`,
  blindT3.length === 0,
  blindT3.map(({ d, v }) => `${d.id} (${d.file}:${d.lineNo}) — ${v.why}. ⛔ אסרציה ירוקה אינה מסך, ו**אזכור** בדיקה אינו **ביצועה**`).join("\n      "));

// ⚠️ ⛔ **ה-fixtures כאן קפואים ומוצהרים — ⛔ ואינם קוראים את `DONE`/`CHECKS` החיים.**
// שער שבודק את עצמו מול הקורפוס החי משתנה **בשקט** ביום שמישהו עורך שורה, ואז
// הוא מודד נוכחות ⛔ ולא אמת ‹R-4›. ⛔ אל תחליף אותם בקריאה מהקובץ כדי "לא לכפול".
// ⚠️ **שני הכיוונים חובה:** שער שרק **נופל** נכון עדיין יכול לחסום עבודה תקינה,
// ושער שרק **עובר** נכון הוא בדיוק `B-149`. הכיוון המסוכן הוא ה**אישור**.
const FIX_CHECKS = new Map([["C-091", true], ["C-092", false]]);   // 091 = בוצעה · 092 = לא. ⛔ מחוץ לטווח החי (עד C-026)
const FIXTURES = [
  ["אזכור בדיקה שבוצעה", "אומת מול `C-091`", true],
  ["אזכור בדיקה שלא בוצעה", "אומת מול `C-092`", false],
  ["אזכור בדיקה שאינה קיימת", "אומת מול `C-099`", false],
  ["הכחשה: ⛔ לא בוצעה", "`C-091` — ⛔ לא בוצעה", false],
  ["הכחשה: ⛔ טרם בוצעה", "`C-091` ⛔ טרם בוצעה", false],
  ["הכחשה: ⛔ פתוחה", "⛔ `C-091` פתוחה", false],
  ["נוסח D-036 שעבר בטעות", "⚠️ צילום ההודעה ⛔ אינו בידי Code — שלב 3 פתוח על ניב", false],
  ["סמן מפורש תקין", "✅ אומת בעין — 5/5 בערוץ", true],
  ["אומת-מקור תקין", "✅ אומת-מקור — נקרא מ-origin ונמדד עצמאית", true],
  ["הכחשת הסמן המפורש", "⛔ לא אומת בעין", false],
  // ⚠️ **11 שינה את שמו ⛔ ולא את תאו** (`B-162`). השם הישן — "הכחשה רחוקה ⛔ אינה
  // פוסלת" — טען שהוא שומר על ענף הקרבה, אבל אוצר-המילים שבתא (`⛔ לא בוצע`) יושב
  // ב-`DENY_NEAR` **בלבד** ו-`DENIED` ⛔ אינו מתאים לו כלל ⇒ ה-fixture ⛔ מעולם לא
  // נגע בווטו, ו-`11/11` יצאו זהים איתו ובלעדיו. **שם שאינו מתאר את מה שנמדד הוא
  // ‹R-3› בצורתו הטהורה** — והשם היה כאן הראיה היחידה שאיש לא קרא.
  ["הכחשה רחוקה ב-DENY_NEAR בלבד (⛔ לא בוצע) ⛔ אינה פוסלת", `✅ אומת בעין — 5/5.${" ".repeat(400)}🔴 בלוק 4 ⛔ לא בוצע`, true],
  // ⚠️ **12 הוא התאום ב-`DENIED`, ⛔ ואינו כפילות של 11:** `DENIED ⊄ DENY_NEAR`
  // פורמלית (המפרידים `"* *"`/`"** **"` מותאמים ב-`DENIED` בלבד) ⇒ fixture אחד
  // ⛔ אינו יכול לשמור על שני אוצרות-המילים. **נצפה אדום על `HEAD` שלפני `B-162`.**
  ["הכחשה רחוקה ב-DENIED (⛔ לא אומת בעין) ⛔ אינה פוסלת",
   `✅ אומת בעין — 5/5.${" ".repeat(400)}🔴 המסך החי ⛔ לא אומת בעין`, true],
  // ⚠️ **13 מקפיא את הכרעת ניב 19.08** — וזה בדיוק החור שמחיקת הווטו הייתה פותחת.
  // **נצפה אדום על `HEAD` פחות הווטו** (עבר עם ⟪אזכור בדיקה שבוצעה: C-091⟫).
  ["הכחשה מפורשת גוברת על מצביע C רחוק שבוצע",
   `⛔ לא אומת בעין.${" ".repeat(400)}אומת מול \`C-091\``, false],
];
const fixFail = FIXTURES.filter(([, cell, want]) => markerVerdict(cell, FIX_CHECKS).ok !== want);
check("11.3", `${FIXTURES.length - fixFail.length}/${FIXTURES.length} fixtures קפואים · המסווג מכריע נכון בשני הכיוונים`,
  fixFail.length === 0,
  fixFail.map(([n, cell, want]) => `⟪${n}⟫ — ציפייה ${want ? "עובר" : "נופל"}, בפועל ${markerVerdict(cell, FIX_CHECKS).ok ? "עובר" : "נופל"} (${markerVerdict(cell, FIX_CHECKS).why})`).join("\n      "));

// ── §12 · `METRICS` — מדידה שפג תוקפה מכריזה על עצמה ────────────────────────
//
// 🔴 **הכלל נחקק 08.08 ו⛔ מעולם לא נאכף:** «מספר שנרשם פעם ולא נמדד שוב ⛔ אינו
// עובדה». עד 26.08 הוא היה **פרוזה** — המספרים ישבו ב-`STATE` ובדוחות `audits/`,
// התיישנו בשקט, והמשיכו להיקרא כאילו נמדדו היום. ⚠️ `STATE` אפילו **הצהיר** על
// כך («נמדד לפני 14 יום ⇒ ⛔ אינו עובדה») — הצהרה ידנית שדרשה מאדם לחשב הפרש
// תאריכים בראש בכל קריאה. ⛔ **זה בדיוק `R-5`** (מצב קריטי באחסון נדיף:
// הזיכרון האנושי), ו-`CLAUDE.md` §2 קורא לזה «אפס תלות בזיכרון אנושי».
//
// ⚠️ **ומה שהכריח את הבנייה:** המדידה «0 עסקאות ב-70.4 שעות» חיה ב-`docs/INBOX.md`
// — קובץ שהחוזה שלו מצהיר «⛔ פריט לא נשאר כאן מעבר לסשן אחד» — ו-`STATE`
// **ציטט אותה משם**. ⇒ ציטוט שמצביע לקובץ שמוחק את עצמו.
//
// **מה השער מודד, ומה ⛔ אינו יכול למדוד:** הוא משווה `נמדד + תוקף` ל**היום**
// ומחייב את השורה להכריז `⏳ פג`. ⛔ **הוא ⛔ אינו יודע אם המספר נכון** — רק אם
// הוא **טרי**. ⛔ **והתיקון ⛔ אינו הארכת `תוקף`** — הוא מדידה חוזרת; הארכה כדי
// לעבור היא בדיוק ‹R-4›, אותה טעות שהחזיקה את `100` בשלמות בזמן שהתוכן גדל ×9.2.
console.log("\n12 · METRICS — מדידה שפג תוקפה מכריזה על עצמה");
const M_SRC = 3, M_WHEN = 4, M_TTL = 5, M_STAT = 6;
const EXPIRED = /⏳\s*פג/;
const HISTORIC = /🧊/;

const mNoSrc = metrics.filter((d) => !DATE.test(d.cells[M_SRC] ?? "") && !/[A-Za-z`(]/.test(d.cells[M_SRC] ?? ""));
check("12.1", `${metrics.length - mNoSrc.length}/${metrics.length} מדדים נושאים פקודה/מקור`,
  mNoSrc.length === 0,
  mNoSrc.map((d) => `${d.id} (${d.file}:${d.lineNo}) — "${(d.cells[M_SRC] ?? "").slice(0, 60)}". ⛔ «מ-Supabase» אינו מקור; שאילתה כן`).join("\n      "));

// ⚠️ **המכנה נאמר בקול, ועם שם האוכלוסייה** (`CLAUDE.md` §2). שיעור בלי מכנה
// הוא המחלה עצמה — ⛔ ולא ייתכן שפנקס המדידות יהיה המקום היחיד שפטור ממנה.
const RATIO = /\d+\s*\/\s*\d+/;
const PCT = /\d+(?:\.\d+)?\s*%/;
const mBarePct = metrics.filter((d) => PCT.test(d.cells[2] ?? "") && !RATIO.test(d.cells[2] ?? ""));
check("12.2", `${metrics.length - mBarePct.length}/${metrics.length} — ⛔ אפס אחוז בלי מונה/מכנה`,
  mBarePct.length === 0,
  mBarePct.map((d) => `${d.id} (${d.file}:${d.lineNo}) — נושא % בלי \`a/b\`. ⛔ «74%» אינו מדידה; «34/46 = 74%» כן (§2)`).join("\n      "));

// ⚠️ `DD.MM` בלי שנה — נפתר מול השנה הנוכחית. ⛔ **ותאריך עתידי ⛔ אינו «טרי»**,
// הוא שעון שבור: שורה שנכתבה עם `31.12` הייתה עוברת לנצח. ⇒ נפסלת במפורש.
const TODAY = new Date();
const YEAR = TODAY.getFullYear();
const parseDM = (s) => {
  const m = /\b(\d{2})\.(\d{2})\b/.exec(s ?? "");
  if (!m) return null;
  const d = new Date(YEAR, Number(m[2]) - 1, Number(m[1]));
  return Number.isNaN(d.getTime()) ? null : d;
};
const daysAgo = (d) => Math.floor((TODAY - d) / 86400000);

const mBadWhen = metrics.filter((d) => !parseDM(d.cells[M_WHEN]));
const mBadTtl = metrics.filter((d) => !/^\d+$/.test((d.cells[M_TTL] ?? "").trim()));
check("12.3", `${metrics.length - mBadWhen.length - mBadTtl.length}/${metrics.length} נושאים \`נמדד\` תקין ו-\`תוקף\` בימים`,
  mBadWhen.length === 0 && mBadTtl.length === 0,
  [...mBadWhen.map((d) => `${d.id} — \`נמדד\`="${d.cells[M_WHEN] ?? ""}" ⛔ אינו DD.MM`),
   ...mBadTtl.map((d) => `${d.id} — \`תוקף\`="${d.cells[M_TTL] ?? ""}" ⛔ אינו מספר ימים. ⛔ אין «לתמיד»`)].join("\n      "));

const aged = metrics
  .filter((d) => parseDM(d.cells[M_WHEN]) && /^\d+$/.test((d.cells[M_TTL] ?? "").trim()))
  .map((d) => ({ d, age: daysAgo(parseDM(d.cells[M_WHEN])), ttl: Number(d.cells[M_TTL].trim()) }));
const future = aged.filter((x) => x.age < 0);
// ⛔ `🧊 היסטורי` ⛔ אינו פטור-בדלת-אחורית: הוא **מצהיר** שהמספר ⛔ אינו חי, ולכן
// ⛔ אינו נקרא כעובדה. פטור שאין לו הצהרה נראית הוא בדיוק מה ש-§1.3 פספס.
const lying = aged.filter((x) => x.age >= 0 && x.age > x.ttl
  && !EXPIRED.test(x.d.cells[M_STAT] ?? "") && !HISTORIC.test(x.d.cells[M_STAT] ?? ""));
const stillFresh = aged.filter((x) => x.age >= 0 && x.age <= x.ttl && EXPIRED.test(x.d.cells[M_STAT] ?? ""));
check("12.4", `${aged.filter((x) => x.age > x.ttl).length}/${aged.length} מדדים פגי-תוקף, וכולם מכריזים ⏳ פג`,
  lying.length === 0 && future.length === 0 && stillFresh.length === 0,
  [...lying.map((x) => `${x.d.id} — נמדד לפני ${x.age} יום, תוקף ${x.ttl} ⇒ ⛔ אינו עובדה, וסטטוסו "${x.d.cells[M_STAT]}". ⛔ התיקון הוא מדידה חוזרת, ⛔ לא הארכת התוקף`),
   ...future.map((x) => `${x.d.id} — \`נמדד\` בעתיד (${-x.age} יום קדימה) ⇒ שעון שבור שיעבור לנצח`),
   ...stillFresh.map((x) => `${x.d.id} — מוכרז ⏳ פג אך נמדד לפני ${x.age} יום מתוך ${x.ttl}. ⛔ הכרזת-פג שאינה נכונה מלמדת להתעלם מהדגל`)].join("\n      "));

// ⚠️ שורת שושלת שמפנה למזהה שאינו בפנקס היא היסטוריה של כלום.
const lineageOrphan = lineage.filter((d) => !metrics.some((m) => m.id === d.id));
check("12.5", `${lineage.length} שורות שושלת · כולן מפנות ל-M- חי בפנקס`,
  lineageOrphan.length === 0,
  lineageOrphan.map((d) => `${d.id} (${d.file}:${d.lineNo}) — ⛔ אין לו שורה חיה. מזהה ⛔ אינו ממוחזר (§14)`).join("\n      "));

// ── §13 · הסעיף ב-`BACKLOG` מול הסטטוס, ורוחב השורה ──────────────────────
// ⚠️ **השער קרא כותרות בארבעה קבצים ו⛔ מעולם לא ב-`BACKLOG`:** `:208`/`:211`
// ב-`DONE` · `:383` ב-`NEXT` · `:459`/`:462` ב-`STATE` · `:494` ב-`.md` שבשורש.
// ⇒ שורת `B-` **מעולם לא יוחסה לסעיף שמעליה**, ולכן שישה פריטים בסטטוס `פתוח`
// ישבו תחת «❄️ מוכרע-לא-לעשות» מ-12.08 בלי שאף אסרציה תוכל לראות זאת.
// המקור ⛔ אינו הכרעה: `3b1a1cf` הוסיף את הבלוק **בלי כותרת משלו** (0 שורות
// `+## ` ב-diff) והוא ירש `❄️` **לפי מיקום בלבד**. §7.1 מסנן `❄️` ב**תא**,
// ⛔ לא בכותרת, ולכן הוא עיוור לזה מבנית. ‹R-4›
console.log("\n13 · הסעיף ב-BACKLOG מול הסטטוס");

const HEAD = /^#{1,4}\s+(.*)$/;
const sectionOf = (() => {
  const marks = [];
  lines.BACKLOG.forEach((l, i) => { const m = HEAD.exec(l); if (m) marks.push({ no: i + 1, title: m[1].trim() }); });
  return (lineNo) => { let cur = null; for (const s of marks) { if (s.no < lineNo) cur = s; else break; } return cur; };
})();

// 13.1 — סעיף שהוא **הכרעה** מחייב סטטוס תואם. ⛔ הכלל מכוון לסעיף היחיד
// שהוא הכרעה (`❄️`); `🟠 חשוב`/`⚪ חוב` הם **עדיפות**, ⛔ לא סטטוס, ושער
// שהיה מאדים עליהם היה מודד רעש ומאלץ ריכוך — וריכוך כדי לעבור הוא `R-4`.
// ⚠️ **מצבה עוברת בכוונה** — פריט שנסגר תחת `❄️` הוא היסטוריה תקינה (§8.4).
const FROZEN_SEC = /❄️/;
const underFrozen = backlog.filter((d) => FROZEN_SEC.test(sectionOf(d.lineNo)?.title ?? ""));
const misfiled = underFrozen.filter((d) => {
  const st = d.cells.at(-1) ?? "";
  return !FROZEN_SEC.test(st) && !TOMB.test(st);
});
check("13.1", `${underFrozen.length - misfiled.length}/${underFrozen.length} השורות תחת כותרת ❄️ נושאות ❄️ או מצבה`,
  misfiled.length === 0,
  misfiled.map((d) => `${d.id} (${d.file}:${d.lineNo}) — סטטוס "${d.cells.at(-1)}" תחת «${sectionOf(d.lineNo).title}». ⛔ סעיף ⛔ אינו סטטוס: או שהפריט הוכרע, או שהוא זקוק לכותרת משלו`).join("\n      "));

// 13.2 — רוחב השורה. ⚠️ קיים ל-`CHECKS` (§5.2) ו⛔ **לא** ל-`BACKLOG` ⇒ `|`
// חשוף בתוך גוף מזיז את כל העמודות ימינה **בשקט**. היום העמודה האחרונה
// עדיין נקראת נכון **במקרה**; שדה שיתווסף ייקרא מהתא השגוי ואיש לא יראה.
const BACKLOG_CELLS = 7;
const wrongWidth = [];
lines.BACKLOG.forEach((line, i) => {
  const m = ROW.exec(line);
  if (!m) return;
  const n = line.split(/(?<!\\)\|/).slice(1, -1).length;
  if (n !== BACKLOG_CELLS) wrongWidth.push({ id: m[1], lineNo: i + 1, n });
});
check("13.2", `${backlog.length - wrongWidth.length}/${backlog.length} שורות BACKLOG נושאות ${BACKLOG_CELLS} תאים`,
  wrongWidth.length === 0,
  wrongWidth.map((x) => `${x.id} (${FILES.BACKLOG}:${x.lineNo}) — ${x.n} תאים במקום ${BACKLOG_CELLS}. ⛔ \`|\` בגוף חייב להיות מוברח \`\\|\``).join("\n      "));

console.log("");
if (failures.length) {
  console.error(`❌ registry: ${failures.length}/${pass + failures.length} assertion(s) failed.`);
  console.error("   ⚠️ מרשם שאינו נאכף מת בשקט — בדיוק כמו זה של 02.08.");
  process.exit(1);
}
console.log(`✅ registry: ${pass}/${pass} assertions passed — ${home.size} מזהים, פריט חי בקובץ אחד.`);
