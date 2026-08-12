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
// חמישה קבצים, פריט חי באחד בלבד:
//   docs/STATE.md    · 🔴 עכשיו · ⏭️ 3 הבאים · ⏸️ חסום · ⚠️ סיכונים · ≤100 שורות
//   docs/BACKLOG.md  · כל פריט פתוח שאינו פעיל     (B-)
//   docs/DONE.md     · הושלם, עם hash ועם איך אומת (D-)
//   docs/CHECKS.md   · בדיקות חוזרות, עם מפעיל     (C-)
//   docs/audits/STATE-ARCHIVE-*.md · סגור בלבד
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
};

const ROW = /^\|\s*([BDC]-\d{3})\s*\|/;
const DATE = /\b\d{2}\.\d{2}\b/;
const HASH = /[0-9a-f]{7,40}/;

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

console.log("\n0 · הקורפוס");
// ⚠️ המכנה נאמר בקול: שער שסורק 0 שורות עובר בשקט מושלם.
check("0.1", `${backlog.length} פריטי BACKLOG · ${done.length} פריטי DONE · ${checks.length} פריטי CHECKS`,
  backlog.length >= 20 && done.length >= 5 && checks.length >= 5,
  `רצפות: BACKLOG≥20 · DONE≥5 · CHECKS≥5. אחד מהם התכווץ, או ש-ROW נשבר`);

console.log("\n1 · מזהה חי בקובץ אחד בלבד");
// ⚠️ הגדרות בלבד. ציטוט ``B-004`` בפרוזה מותר בכל קובץ — ראה הכותרת.
const home = new Map();
for (const d of [...backlog, ...done, ...checks, ...stateDefs]) {
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

console.log("\n3 · תקרת STATE");
// ⚠️ התקרה היא הסיבה שהמרשם קיים: גיזום שנכפה בלי יעד מוגדר הוא איך שנעלמו 33.
check("3.1", `docs/STATE.md = ${lines.STATE.length} שורות (תקרה 100)`, lines.STATE.length <= 100,
  `חריגה של ${lines.STATE.length - 100} שורות. ⛔ הגיזום עובר ל-BACKLOG/DONE, לעולם לא ל-ARCHIVE אם הפריט פתוח`);

console.log("\n4 · פריט DONE נושא hash");
// ⛔ גל בלי hash אינו גל שנסגר — הוא טענה.
const HASH_COL = 3; // | מזהה | מה | תאריך | hash | איך אומת |
const noHash = done.filter((d) => !HASH.test(d.cells[HASH_COL] ?? ""));
const noProof = done.filter((d) => !(d.cells[HASH_COL + 1] ?? "").trim());
check("4.1", `${done.length - noHash.length}/${done.length} נושאים hash`, noHash.length === 0,
  noHash.map((d) => `${d.id} (${d.file}:${d.lineNo}) — עמודת hash = "${d.cells[HASH_COL] ?? ""}"`).join("\n      "));
check("4.2", `${done.length - noProof.length}/${done.length} נושאים "איך אומת"`, noProof.length === 0,
  noProof.map((d) => `${d.id} (${d.file}:${d.lineNo}) — hash בלי ראיה הוא הפניה, לא אימות`).join("\n      "));

console.log("\n5 · פריט CHECKS נושא תדירות או תנאי-גלישה");
// ⚠️ בדיקה בלי מפעיל אינה בדיקה — היא כוונה. בקשת omrikapara1 המתינה 12 יום
// מ-31.07 בדיוק מפני ששום דבר לא העיר אותה.
const FREQ = 2; // | מזהה | מה | תדירות/תנאי | נבדק לאחרונה | מה נמצא |
const noTrigger = checks.filter((d) => !(d.cells[FREQ] ?? "").trim());
check("5.1", `${checks.length - noTrigger.length}/${checks.length} נושאים מפעיל`, noTrigger.length === 0,
  noTrigger.map((d) => `${d.id} (${d.file}:${d.lineNo}) — בלי תדירות ובלי תנאי-גלישה`).join("\n      "));

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
const now = new Set([...backlog, ...done, ...checks].map((d) => d.id));
const vanished = [...prev].filter((id) => !now.has(id));
check("6.1", prev.size === 0
  ? "אין מרשם בקומיט הקודם — לידה, אין ממה להיעלם"
  : `${prev.size - vanished.length}/${prev.size} מזהי הקומיט הקודם עדיין קיימים`,
  vanished.length === 0,
  `${vanished.join(" · ")} — ⛔ מזהה אינו נמחק ואינו ממוחזר. פריט שהוכרע עובר ל-DONE או ל-❄️, ⛔ לא נמחק`);

console.log("\n7 · ❄️ נושא נימוק");
// ⚠️ ❄️ בלי נימוק נפתח מחדש בעוד חודש, ואיש לא יזכור למה נסגר.
const frozen = backlog.filter((d) => d.cells.some((c) => c.includes("❄️")));
const noReason = frozen.filter((d) => !d.cells[1].includes("נימוק:"));
check("7.1", `${frozen.length} פריטי ❄️ במרשם`, frozen.length > 0,
  "אפס ❄️ — או שאין הכרעות-לא-לעשות, או ש-ROW/הסטטוס נשברו. שער שסופר 0 עובר בשקט");
check("7.2", `${frozen.length - noReason.length}/${frozen.length} נושאים "נימוק:"`, noReason.length === 0,
  noReason.map((d) => `${d.id} (${d.file}:${d.lineNo}) — ❄️ בלי נימוק`).join("\n      "));

console.log("");
if (failures.length) {
  console.error(`❌ registry: ${failures.length}/${pass + failures.length} assertion(s) failed.`);
  console.error("   ⚠️ מרשם שאינו נאכף מת בשקט — בדיוק כמו זה של 02.08.");
  process.exit(1);
}
console.log(`✅ registry: ${pass}/${pass} assertions passed — ${home.size} מזהים, פריט חי בקובץ אחד.`);
