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
};

const ROW = /^\|\s*([BDC]-\d{3})\s*\|/;
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
// של שלוש שאלות בינאריות ⛔ ולא של תחושה, והעמודה היא מה שהופך אותו לניתן לביקורת.
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
const EYE = /(אומת בעין|צילום|C-0\d\d)/;
const DENIED = /לא\**\s*\**\s*אומת בעין/;
const strip = (s) => s.replace(/`[^`]*`/g, " ").replace(/"[^"]*"/g, " ");
const blindT3 = done.filter((d) => /T3/.test(d.cells[T_COL] ?? "") && !RETRO.test(d.cells[T_COL] ?? ""))
  .filter((d) => { const proof = strip(d.cells[T_COL - 1] ?? ""); return !EYE.test(proof) || DENIED.test(proof); });
check("11.2", `${done.filter((d) => /T3/.test(d.cells[T_COL] ?? "") && !RETRO.test(d.cells[T_COL] ?? "")).length} שורות T3 לא-רטרו · כולן נושאות אימות עין`,
  blindT3.length === 0,
  blindT3.map((d) => `${d.id} (${d.file}:${d.lineNo}) — T3 בלי סמן אימות-עין. ⛔ אסרציה ירוקה אינה מסך`).join("\n      "));

console.log("");
if (failures.length) {
  console.error(`❌ registry: ${failures.length}/${pass + failures.length} assertion(s) failed.`);
  console.error("   ⚠️ מרשם שאינו נאכף מת בשקט — בדיוק כמו זה של 02.08.");
  process.exit(1);
}
console.log(`✅ registry: ${pass}/${pass} assertions passed — ${home.size} מזהים, פריט חי בקובץ אחד.`);
