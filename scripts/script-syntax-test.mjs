// scripts/script-syntax-test.mjs — סוכני ה-CI חייבים להתקמפל, ואסור להם לשאת
// גרש-הפוך בהערת SQL. שתי בדיקות, כי אחת מהן מוכחת כלא-מספקת.
//
// ── למה הקובץ הזה קיים ──────────────────────────────────────────────────────
//
// ב-11.08 נפל `user-analytics` בפרודקשן על `SyntaxError: missing ) after
// argument list` (ריצה 31470184666, INCIDENTS#15). השורש: הערות SQL שנוספו
// בגל האופק נשאו גרש-הפוך לציטוט שמות עמודות בסגנון markdown — בתוך template
// literal. ⚠️ `--` הוא הערה ב-SQL ואינו הערה ב-JavaScript; בתוך literal אין
// תחביר הערות **כלל**, והגרש הראשון סוגר את המחרוזת.
//
// ⚠️ 20 חוליות ה-verify היו ירוקות באותו רגע. החוליה היחידה שנוגעת בקובץ
// (`horizon-test.mjs`, בלוק 10) עושה `readFileSync` — קוראת אותו כ**טקסט**
// ובודקת regex, ולעולם אינה מייבאת ואינה פורסת. הבדיקה ענתה נכונה על השאלה
// שנשאלה; השאלה הייתה הלא-נכונה. אף חוליה מ-20 לא הריצה סוכן CI, ו-`build`
// נוגע ב-frontend בלבד ⇒ **הכיסוי היה 0/5 סוכנים.**
//
// ── §1 · למה `node --check` לבדו אינו השער (נמדד, לא הונח) ──────────────────
//
// ההנחה הראשונית הייתה "ספירה זוגית של גרשיים עוברת את הפרסר בשקט". **היא
// נבדקה והופרכה חלקית — הקריטריון אינו זוגיות אלא התו הראשון בציטוט:**
//
//   11/11 ניסוחים שבהם הציטוט פותח בתו-מזהה (`date`, `createdAt`) → כולם
//   נפלו ב-node --check, זוגיים ואי-זוגיים כאחד. הסיבה: אחרי שהגרש סוגר את
//   המחרוזת מתקבל מזהה חשוף צמוד לביטוי, וזה לעולם אינו תקין.
//
//   8/8 ניסוחים שבהם הציטוט פותח ב**סימן פיסוק** שממשיך ביטוי (`.length`,
//   `,x,`, `+1`, `[0]`) → **כולם עברו את node --check.** התו הפותח ממשיך את
//   הביטוי במקום לשבור אותו.
//
// ומתוך השמונה, מקרה הפסיק הוא כשל **שקט** — לא שגיאת ריצה:
//
//   q(`${CTE}\n -- note `,label,` mid\n SELECT count(*) FROM clean`)
//   → node --check עובר · הקוד רץ · ו-q() מקבל שלושה ארגומנטים במקום אחד,
//     כלומר את המחרוזת הקטועה "WITH clean AS (...)\n   -- note " בלבד.
//     ה-SELECT נעלם, ואיש אינו זורק. ⚠️ `q(sql, label)` בסוכן שלנו מקבל בדיוק
//     שני ארגומנטים, ולכן זו אינה היפותזה תיאורטית אלא הצורה של הקוד הקיים.
//
//   ⚠️ **גבול השקט נמדד ולא הונח:** הוא מותנה בכך שהטוקן שבין הפסיקים **פתיר**.
//   עם שם שקיים בהיקף (`label`) — שקט מלא, exit 0. עם שם שאינו קיים (`x`) —
//   `x is not defined` בזמן ריצה, בקול. חלק מהמחלקה מכריז על עצמו, והחלק שאינו
//   מכריז הוא זה שחשוב; ⛔ שום `--check` ושום הרצת-עשן אינם מפרידים ביניהם
//   מראש — רק סירוב לתו עצמו.
//
// לכן §3 קיימת. `node --check` תופס את המחלקה הרועשת; היא לבדה הייתה מכריזה
// "ירוק" על SQL קטוע.
//
// ── §2 · למה `node --check` ולא `import()` דינמי (נמדד) ─────────────────────
//
// `import()` היה תופס גם שגיאות ברמת המודול, אבל 2/5 מסוכני ה-CI קוראים
// `main()` ללא שומר-נקודת-כניסה:
//
//   ✅ analyst.mjs:669 · daily-digest.mjs:467 · arch-auditor.mjs:660
//      — שומרים `process.argv[1] === import.meta.url`, ייבוא בטוח
//   ⛔ user-analytics.mjs:853 · data-guardian.mjs:305 — `main().catch(...)`
//      חשוף. ייבוא היה פותח חיבור ל-Supabase, כותב קבצים, ובמקרה של
//      user-analytics גם `process.exit(1)` — שהורג את תהליך הבדיקה עצמו.
//
// ⚠️ ההכרעה נגזרה מהמדידה ולא מהעדפה: הוספת שומר ל-2 הסקריפטים הייתה נגיעה
// בהם מעבר להערה, וזו החלטה נפרדת (⏭️ ב-STATE). `node --check` פורס בלי
// להריץ שום שורה, ולכן הוא נכון **כל עוד** 2/5 חשופים.
//
// ── §3 · גבולות הכיסוי, במפורש ──────────────────────────────────────────────
//
// §3 סורקת שורות שתוכנן הנקי פותח ב-`--`, כי זו צורת הכשל שנמדדה ב-19/19
// המקרים. ⛔ **אינה** תופסת גרש בשורת SQL שאינה הערה. שם מגינה §2, ורק
// למחלקה שפותחת בתו-מזהה. הפער הידוע: גרש בשורת SQL רגילה שפותח בסימן פיסוק.
// ⛔ נרשם ולא נסגר — סגירתו דורשת פרסר מלא, ואין acorn בעץ.
//
// ⚠️ קבצי `.sql` מוחרגים במכוון. `scripts/retention.sql` נושא 6 גרשים בהערות
// `--` והם **תקינים לחלוטין**: הקובץ מורץ ידנית ב-SQL Editor ואינו JavaScript.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const ROOTS = ["scripts", "api"];
const JS_EXT = /\.(mjs|cjs|js)$/;

let pass = 0;
const failures = [];
function check(id, label, ok, detail = "") {
  if (ok) { pass++; console.log(`✅ ${id}  ${label}`); }
  else { failures.push({ id, label, detail }); console.error(`❌ ${id}  ${label}${detail ? `\n      ${detail}` : ""}`); }
}

function walk(dir, out = []) {
  let entries;
  // ⛔ אין `catch` ריק: ספרייה שאינה קריאה היא ממצא, לא שקט (CLAUDE.md §2).
  try { entries = readdirSync(dir); }
  catch (e) {
    console.error(`❌ לא ניתן לקרוא את ${dir}: ${e.message}`);
    process.exit(1);
  }
  for (const name of entries) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (JS_EXT.test(name)) out.push(p);
  }
  return out;
}

const files = ROOTS.flatMap((r) => walk(r));

console.log("\n1 · הקורפוס");
// ⚠️ המכנה נאמר בקול: בדיקה שסורקת 0 קבצים עוברת בשקט מושלם.
check("1.1", `נמצאו ${files.length} קבצי JS ב-${ROOTS.join(" + ")}`, files.length >= 25,
  `נמצאו ${files.length} — מתחת לרצפה 25. הקורפוס התכווץ, או ש-walk נשבר`);

const AGENTS = [
  "scripts/user-analytics.mjs", "scripts/analyst.mjs", "scripts/daily-digest.mjs",
  "scripts/data-guardian.mjs", "scripts/arch-auditor.mjs",
];
const missing = AGENTS.filter((a) => !files.includes(a));
check("1.2", `5/5 סוכני ה-CI בקורפוס`, missing.length === 0, `חסרים: ${missing.join(", ")}`);

console.log("\n2 · כל קובץ מתקמפל (node --check)");
const broken = [];
for (const f of files) {
  try { execFileSync(process.execPath, ["--check", f], { stdio: "pipe" }); }
  catch (e) {
    broken.push(`${f}\n      ${String(e.stderr || e.message).split("\n").slice(0, 3).join("\n      ")}`);
  }
}
check("2.1", `${files.length - broken.length}/${files.length} הקבצים מתקמפלים`,
  broken.length === 0, broken.join("\n      "));

console.log("\n3 · אפס גרש-הפוך בהערת SQL בתוך קוד JS");
// שורה שתוכנה הנקי פותח ב-`--` היא הערת SQL בתוך template literal. גרש שם
// סוגר את המחרוזת — ואם הוא פותח בסימן פיסוק, בשקט (ראה §1 בכותרת).
const offenders = [];
for (const f of files) {
  const lines = readFileSync(f, "utf8").split("\n");
  lines.forEach((line, i) => {
    if (/^\s*--/.test(line) && line.includes("`")) offenders.push(`${f}:${i + 1}  ${line.trim().slice(0, 90)}`);
  });
}
check("3.1", `${files.length - new Set(offenders.map((o) => o.split(":")[0])).size}/${files.length} הקבצים נקיים מגרש בהערת SQL`,
  offenders.length === 0, offenders.join("\n      "));

console.log("");
if (failures.length) {
  console.error(`❌ script-syntax: ${failures.length}/${pass + failures.length} assertion(s) failed.`);
  console.error("   ⚠️ סוכן CI שאינו מתקמפל אינו נראה בשום חוליה אחרת — הוא נופל בפרודקשן בלבד.");
  process.exit(1);
}
console.log(`✅ script-syntax: ${pass}/${pass} assertions passed — ${files.length} קבצים מתקמפלים, אפס גרש בהערת SQL.`);
