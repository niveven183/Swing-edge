# AUDIT — מיון המרשם · סיווג · אשכולות · גיליון הכרעות

> **תאריך:** 2026-09-30 · **HEAD:** `69608b6` · **רמה:** T2 (תשובות 1–5: לא/לא/לא/לא/**כן**)
> **סוג:** אבחון read-only לפי §8.1 שלב 1. ⛔ אפס נגיעה בקוד · ⛔ אפס שינוי סטטוס · ⛔ אפס סגירה.
> **נספח מכונה:** `docs/audits/AUDIT-2026-09-30-backlog-sweep.json` — שורה לכל פריט (388 B- · 63 C- · 14 M- פגים מתוך 20 · 9 INBOX · 15 יתומים).
> **כל מספר שורה כאן נמדד על `69608b6`.** ⛔ מספרים מטקסט הפריטים אלא אם צוין «נכתב».

---

## 1 · תקציר

**האוכלוסייה:** 388/388 שורות `| B-` ב-BACKLOG (0 שבורות) · 63 שורות C- · 20 מדדי M- פעילים (+41 שורות שושלת) · 9 שורות INBOX · 5 יתומים מוצריים.

| מחלקה | פריטים | מתוך |
|---|---|---|
| מצבה תקינה (`✅ בוצע → D-`, לפי `D-028`) | 53 | 388 |
| סגור בפורמט חריג (✅ שאינו מצבה) | 10 | 388 |
| ❄️ מוכרע-לא-לעשות | 11 | 388 |
| LIVE | 174 | 314 (פתוחים שסווגו) |
| NIV-DECISION | 48 | 314 (פתוחים שסווגו) |
| STALE-EVIDENCE | 31 | 314 (פתוחים שסווגו) |
| DONE-SILENT | 21 | 314 (פתוחים שסווגו) |
| UNMEASURABLE | 19 | 314 (פתוחים שסווגו) |
| NIV-ACTION | 18 | 314 (פתוחים שסווגו) |
| DUPLICATE | 3 | 314 (פתוחים שסווגו) |
| SUPERSEDED | 0 | 314 (פתוחים שסווגו) |
| OBSOLETE | 0 | 314 (פתוחים שסווגו) |

**3 גלים מומלצים** (§8):

1. **גל «כסף על המסך» — `K2` + `B-340`** (9 נק׳ · U3). `K2` = הסרת `Math.round` לפני מעצב דו-ספרתי ב-9 אתרים (B-321·B-325); ה-harness קיים ומחכה (`test:cents` מחזיק לדג׳ר דו-כיווני של 9/14 פגומים-בהצהרה). `B-340` = `handleSubmit` חותם `currency` לפי מטבע ההון על עסקה שה-entry שלה במטבע הנייר — **תווית שגויה נכתבת ל-DB בכל הזנה ידנית חוצת-מטבע**. ⚠️ `K2` חסום חלקית על `B-321` (NIV-DECISION: לבטל את החלטת גל ג׳ «Math.round נשמר»).
2. **גל «אובדן נתונים» — `K15` + `K6`** (11 נק׳ · U3). `K15`: תמונת Playbook/עסקה נדחפת ל-localStorage דרך `catch {}` ריק — הסטאפ נעלם ברענון בלי הודעה (B-015·B-038). `K6`: `upsertBlob` מחליף את כל עמודת ההגדרות ⇒ שתי לשוניות דורסות זו את זו (B-361·B-270·B-066); התיקון הוא RPC מיזוג ⇒ **ניב מריץ `.sql`**.
3. **מסלול הצמיחה — ⛔ בשל לבנייה.** כל שבעת פריטי הצמיחה (§8b) נשענים על `M-003` (שימור שבוע 1) שפג לפני 24 יום, ועל `M-001` שפג לפני 28 יום. המדידה האחרונה (06.09): **0/11** חזרו בשבוע 1. ⇒ הגל השלישי הוא **גל חוב-משתמשים ומדידה**: ניב סוגר 4 פידבקים שלא נמסרו (B-085·B-086·B-096·B-114 — אפס קוד) + מריץ `retention.sql` ו-`M-001`; רק אז בוחרים בין קמפיין לרדומים (B-084/B-088) לבין בנייה.

**5 ההכרעות הדחופות לניב** (לפי score משוחרר, §9):

1. **`B-072` · U3** — לממש כיסוי SHORT יתום ע״י קנייה ב-`fifoMatch` (כן/לא)? סבב שורט בייבוא FIFO לעולם אינו נסגר ⇒ P&L שגוי.
2. **`B-080` · U3** — שדה מטבע/יחידה בפלט ה-Vision: לבצע עכשיו (מחוץ להקפאת B-110) או להמתין?
3. **`B-182` · U3** — מחיר תקוע מזין P&L חי: (א) פריט נפרד — חותמת זמן פר-טיקר, (ב) מיזוג ל-B-176, (ג) דחייה?
4. **`B-321` · U3** — לבטל בכתב את «Math.round נשמר» (גל ג׳) ב-toast סגירת עסקה? **משחרר את `K2`**.
5. **`B-005` · U3 · NIV-ACTION** — לשלוח הודעה מוקדמת ל-`e403e391` על תיקון 13 השורות. **משחרר את `K5`** (12 נק׳).

**ממצאים שמשנים את התמונה:**

- ⛔ **ההנחה «שורות ✅ ב-BACKLOG הן הפרת §14» — הופרכה.** 53 מהן הן **מצבות לפי תכנון** (`D-028`, 13.08; `registry-test.mjs:62-69`) — 53/53 מפנות ל-D- שקיים ב-DONE. ⚠️ **אבל 10 אחרות נושאות ✅ בפורמט שהשער ⛔ מזהה** («✅ נסגר (`D-047`)», «✅ סגור 09.09 → …», «✅ הופרך → …», «✅ סגור (6/6)») ⇒ `TOMB` ⛔ תופס אותן, ו-`test:registry` §338 (מצבה תלויה) ⛔ בודק אותן. 9/10 מפנות ל-D- קיים; `B-303` ⛔ נושא D- כלל.
- 🔴 **21 פריטים תוקנו בקוד ורשומים פתוחים** (§4). 13 מהם ניתנים לסגירה עכשיו; 8 חסומים על אימות-עין/מדידה (CLAUDE.md §15) — **4 בדיקות C- + מדידה אחת (N≥50) משחררות 8 פריטים**.
- ⚠️ **31 פריטים נושאים מפנה נושא-משקל שגוי** — ב-SwingEdge_App.jsx הסחיפה היא 147–261 שורות (B-321 · B-315 · B-325). זה `B-260` בפועל.
- ⚠️ **`B-324` (שמצוטט ב-CLAUDE.md §7 כחוב פתוח) הוא כפילות של `B-257`** (27.08, אותה בעיה ואותו תיקון).

---

## 2 · נרמול הסטטוסים

79 מחרוזות סטטוס ייחודיות (30 התווים הראשונים של התא השביעי, אחרי החלפת `\|`). כלל הנרמול: `TOMB` = אותו regex בדיוק כמו `registry-test.mjs:69` · `CLOSED-NONCONF` = מתחיל ב-✅ (או 🟡 עם נסגר/סגור) ⛔ תואם TOMB · `PARTIAL` = ✅/🟡/⚠️ עם «חלק» ב-20 התווים הראשונים · אחרת — מילת-המפתח **המוקדמת** מבין פתוח/חסום/ממתין/חלקי.

**מול ההערכה מהצ'אט (250/25/12):** המחרוזות המדויקות נותנות בדיוק 250 «פתוח» · 25 «חסום-על-ניב» · 12 «ממתין-לאות». המנורמל: **267 OPEN** (+17) · **30 NIV-BLOCKED** (+5) · **14 WAITING** (+2) · 3 PARTIAL. ⇒ **ההערכה (250+25+12 = 287) החמיצה 27/314 פתוחים = 8.6%** (24 בניסוחים חלופיים + 3 PARTIAL).

| # | מחרוזת (30 תווים) | ספירה | נרמול | מזהים (≤4) |
|---|---|---|---|---|
| 1 | פתוח | 250 | OPEN |  |
| 2 | חסום-על-ניב | 25 | NIV-BLOCKED |  |
| 3 | ממתין-לאות | 12 | WAITING |  |
| 4 | ❄️ מוכרע-לא-לעשות | 11 | FROZEN |  |
| 5 | ✅ בוצע → D-041 | 4 | TOMB | B-009 · B-157 · B-064 · B-065 |
| 6 | ✅ בוצע → `D-040` | 4 | TOMB | B-129 · B-152 · B-153 · B-071 |
| 7 | ⏭️ פתוח | 4 | OPEN | B-300 · B-302 · B-308 · B-311 |
| 8 | ✅ בוצע → `D-036` | 2 | TOMB | B-001 · B-018 |
| 9 | ✅ בוצע → `D-026` | 2 | TOMB | B-047 · B-089 |
| 10 | ✅ בוצע → D-065 | 2 | TOMB | B-277 · B-283 |
| 11 | ⏸️ חסום-על-ניב | 2 | NIV-BLOCKED | B-309 · B-333 |
| 12 | ⏳ **ממתין-לאות** — הקוד נפרס ( | 2 | WAITING | B-336 · B-338 |
| 13 | ⏸️ חסום על ניב | 2 | NIV-BLOCKED | B-343 · B-348 |
| 14 | ⚠️ **חלקי — ⛔ לא נסגר.** צלע ה | 1 | PARTIAL | B-002 |
| 15 | ✅ בוצע → `D-024` | 1 | TOMB | B-004 |
| 16 | ✅ בוצע → `D-032` | 1 | TOMB | B-119 |
| 17 | ✅ בוצע → `D-033` | 1 | TOMB | B-142 |
| 18 | ✅ בוצע → D-043 | 1 | TOMB | B-143 |
| 19 | ✅ בוצע → D-035 | 1 | TOMB | B-145 |
| 20 | ✅ נסגר (`D-047`) · ⏸️ `C-030`( | 1 | CLOSED-NONCONF | B-144 |
| 21 | ✅ בוצע → `D-038` | 1 | TOMB | B-146 |
| 22 | ✅ בוצע → `D-039` | 1 | TOMB | B-149 |
| 23 | ✅ נסגר (`D-051`) | 1 | CLOSED-NONCONF | B-164 |
| 24 | ✅ בוצע → D-030 | 1 | TOMB | B-131 |
| 25 | ✅ בוצע → D-049 | 1 | TOMB | B-156 |
| 26 | ✅ בוצע → `D-042` | 1 | TOMB | B-160 |
| 27 | ✅ בוצע → D-044 | 1 | TOMB | B-162 |
| 28 | ✅ בוצע → D-045 | 1 | TOMB | B-165 |
| 29 | ✅ נסגר (`D-047`) | 1 | CLOSED-NONCONF | B-170 |
| 30 | ✅ בוצע → `D-052` | 1 | TOMB | B-171 |
| 31 | ✅ **נסגר 20.08 (`D-048`) — נבח | 1 | CLOSED-NONCONF | B-172 |
| 32 | ✅ נסגר → `D-050` | 1 | CLOSED-NONCONF | B-173 |
| 33 | ✅ בוצע → `D-025` | 1 | TOMB | B-122 |
| 34 | ✅ בוצע → `D-060` | 1 | TOMB | B-125 |
| 35 | ✅ בוצע → `D-027` | 1 | TOMB | B-116 |
| 36 | ✅ בוצע → `D-023` | 1 | TOMB | B-117 |
| 37 | ✅ בוצע → `D-028` | 1 | TOMB | B-126 |
| 38 | ✅ בוצע → D-059 | 1 | TOMB | B-184 |
| 39 | פתוח — חלקית בוצע → `D-067` | 1 | OPEN | B-185 |
| 40 | ✅ בוצע → `D-066` | 1 | TOMB | B-186 |
| 41 | ✅ בוצע → D-057 | 1 | TOMB | B-250 |
| 42 | ✅ הופרך → `D-067` | 1 | CLOSED-NONCONF | B-264 |
| 43 | פתוח — ממתין להכרעת ניב | 1 | OPEN | B-273 |
| 44 | ✅ בוצע → `D-083` | 1 | TOMB | B-274 |
| 45 | 🔴 **פתוח — הסיבה פורקה, החלופ | 1 | OPEN | B-275 |
| 46 | פתוח (חוב רישום — ממתין ל-`D-0 | 1 | OPEN | B-286 |
| 47 | ✅ בוצע → D-068 | 1 | TOMB | B-292 |
| 48 | 🟡 **נסגר-חלקית** — קוד נחת, ` | 1 | PARTIAL | B-295 |
| 49 | ✅ בוצע → `D-082` · **נסגר 15.0 | 1 | TOMB | B-297 |
| 50 | ✅ תוקן-חלקית | 1 | PARTIAL | B-301 |
| 51 | ✅ סגור (6/6) | 1 | CLOSED-NONCONF | B-303 |
| 52 | ✅ סגור 09.09 → `D-075` — ⛔ **א | 1 | CLOSED-NONCONF | B-304 |
| 53 | ✅ סגור 09.09 → `D-077` — ⛔ **א | 1 | CLOSED-NONCONF | B-305 |
| 54 | ⏸️ חסום-על-ניב (`G1`) | 1 | NIV-BLOCKED | B-306 |
| 55 | ✅ סגור 09.09 → `D-076` | 1 | CLOSED-NONCONF | B-307 |
| 56 | ⏭️ **פתוח — הוחמר 09.09** | 1 | OPEN | B-310 |
| 57 | 🔴 **פתוח — הקוד תוקן ו⛔ נצפה  | 1 | OPEN | B-312 |
| 58 | ✅ בוצע → `D-084` | 1 | TOMB | B-313 |
| 59 | ✅ בוצע → `D-079` · **נסגר 11.0 | 1 | TOMB | B-314 |
| 60 | 🔴 **פתוח ו⛔ הוכרע — התנאי לפת | 1 | OPEN | B-315 |
| 61 | 🟡 **פתוח ו⛔ הוכרע.** ⛔ **ההוד | 1 | OPEN | B-316 |
| 62 | 🔴 **פתוח — נמדד ו⛔ תוקן.** ⛔  | 1 | OPEN | B-317 |
| 63 | 🔴 **פתוח — נפרס 11.09 ו⛔ נסגר | 1 | OPEN | B-318 |
| 64 | 🟡 **פתוח ו⛔ הוכרע** — נמצא בס | 1 | OPEN | B-319 |
| 65 | 🔴 **פתוח ו⛔ הוכרע — רישום בלב | 1 | TOMB | B-320 |
| 66 | ✅ בוצע → `D-085` · **נסגר 17.0 | 1 | TOMB | B-326 |
| 67 | 🔴 **פתוח — וחוסם את ⓑ של `B-3 | 1 | OPEN | B-331 |
| 68 | 🟠 **פתוח — `6/11` הומרו · `2/ | 1 | OPEN | B-334 |
| 69 | ✅ בוצע → `D-086` · **נסגר 18.0 | 1 | TOMB | B-335 |
| 70 | ✅ בוצע → `D-087` · **נסגר 18.0 | 1 | TOMB | B-339 |
| 71 | ✅ בוצע → `D-088` | 1 | TOMB | B-345 |
| 72 | ✅ בוצע → `D-092` | 1 | TOMB | B-355 |
| 73 | ✅ בוצע → `D-098` | 1 | TOMB | B-357 |
| 74 | ✅ בוצע → `D-093` | 1 | TOMB | B-358 |
| 75 | ✅ בוצע → `D-099` | 1 | TOMB | B-372 |
| 76 | ✅ בוצע → `D-101` | 1 | TOMB | B-375 |
| 77 | ✅ בוצע → `D-103` | 1 | TOMB | B-376 |
| 78 | ✅ בוצע → `D-100` | 1 | TOMB | B-378 |
| 79 | ✅ בוצע → `D-104` | 1 | TOMB | B-386 |

**OTHER:** 0. **❄️ ללא `נימוק:`:** 0/11. **שורות שה-parser דחה:** 0/388 — ⚠️ **ההנחה «3 שורות לא בנות 7 תאים» מהפרומפט הופרכה**: היא נבעה מ-split שהתעלם מ-`\|`; עם ה-escape, 388/388 בנות 7 תאים.

---

## 3 · טבלת מחלקות

| מחלקה | מונה | מכנה | הערה |
|---|---|---|---|
| REGISTERED-DONE · מצבה תקינה | 53 | 388 | 53/53 D- קיים ב-DONE |
| REGISTERED-DONE · פורמט חריג | 10 | 388 | B-144 · B-164 · B-170 · B-172 · B-173 · B-264 · B-303 · B-304 · B-305 · B-307 |
| FROZEN (❄️) | 11 | 388 | ספירה בלבד; 11/11 נושאים `נימוק:` |
| DONE-SILENT | 21 | 314 |  |
| OBSOLETE | 0 | 314 |  |
| DUPLICATE | 3 | 314 |  |
| SUPERSEDED | 0 | 314 | B-273 הורד ב-QA (§14) |
| STALE-EVIDENCE | 31 | 314 |  |
| NIV-DECISION | 48 | 314 |  |
| NIV-ACTION | 18 | 314 |  |
| UNMEASURABLE | 19 | 314 |  |
| LIVE | 174 | 314 |  |

**משוואה:** 53 + 10 + 11 + 314 = 388 (= 388 ✓) · 174 LIVE + 48 NIV-DECISION + 21 DONE-SILENT + 19 UNMEASURABLE + 31 STALE-EVIDENCE + 18 NIV-ACTION + 3 DUPLICATE = 314 (= 314 ✓).

**פילוח לפי area (314 פתוחים):** ci-registry 49 · monitoring 45 · money-display 29 · security 28 · trade-form 22 · growth-retention 21 · journal-analytics 20 · data-integrity 17 · auth-settings 16 · other 16 · performance 14 · import 12 · coach-ai 9 · business-legal 8 · i18n-rtl 6 · infra-local 2.

**פילוח לפי השפעה:** U3 16/314 · U2 2/314 · U1 109/314 · U0 187/314. U3: `B-005` `B-015` `B-045` `B-158` `B-069` `B-072` `B-080` `B-121` `B-123` `B-182` `B-187` `B-321` `B-325` `B-338` `B-340` `B-361`. U2: `B-299` `B-385`.

**masks=true (ניטור שבור שמסתיר U2/U3):** `B-192` · `B-194` · `B-195` · `B-200` · `B-275` · `B-276` · `B-306` · `B-349` · `B-364` — 9 פריטים, כולם U0 ולכן **ציון שלילי בנוסחה** (ראה §8).

---

## 4 · REGISTERED-DONE + DONE-SILENT

### 4.1 · סגור בפורמט חריג (10)

| # | מזהה | סטטוס (50 תווים) | D- ב-DONE? |
|---|---|---|---|
| 1 | `B-144` | ✅ נסגר (`D-047`) · ⏸️ `C-030`(א) | D-047 ✓ |
| 2 | `B-164` | ✅ נסגר (`D-051`) | D-051 ✓ |
| 3 | `B-170` | ✅ נסגר (`D-047`) | D-047 ✓ |
| 4 | `B-172` | ✅ **נסגר 20.08 (`D-048`) — נבחרה (ב), אישור מלא בצ'אט 20.08… | D-048 ✓ |
| 5 | `B-173` | ✅ נסגר → `D-050` | D-050 ✓ |
| 6 | `B-264` | ✅ הופרך → `D-067` | D-067 ✓ |
| 7 | `B-303` | ✅ סגור (6/6) | ⛔ אין D- |
| 8 | `B-304` | ✅ סגור 09.09 → `D-075` — ⛔ **אימות-מקור בלבד**; `C-043` (עי… | D-075 ✓ |
| 9 | `B-305` | ✅ סגור 09.09 → `D-077` — ⛔ **אימות-מקור בלבד**; ד.2 (דפדפן … | D-077 ✓ |
| 10 | `B-307` | ✅ סגור 09.09 → `D-076` | D-076 ✓ |

**הצעה (⛔ בוצעה):** להמיר את 10 השורות לצורת `✅ בוצע → D-xxx` כדי ש-§338 יבדוק אותן; `B-303` דורש הכרעה איזה D- סוגר אותו.

### 4.2 · DONE-SILENT — ניתנים לסגירה עכשיו (13)

| # | מזהה | area | hash | שורת DONE קיימת | ראיה ב-HEAD |
|---|---|---|---|---|---|
| 1 | `B-006` | journal-analytics | `e5afdc7` | ⛔ אין | src/lib/tradingStats.js:90 · src/lib/tradingStats.js:98 · src/lib/tra… — returnPct ב-tradingStats — סכום חוצה-מטבעות חלקי הון. |
| 2 | `B-031` | security | `eccfbc8` | ⛔ אין | package-lock.json:3052-3053 · package.json:76 — nanoid GHSA-2v37-7h3g-55p8 (high) טרנזיטיבי דרך postcss. |
| 3 | `B-044` | money-display | `c4e811d` | `D-032` (סטטוס ⛔ עודכן) | SwingEdge_App.jsx:2434 · SwingEdge_App.jsx:4814 · SwingEdge_App.jsx:5… — שני אתרי P&L חי דורשים מסלול spot שהתפר (שער יום-המימוש) אינו משרת. |
| 4 | `B-166` | monitoring | `a0ee59e` | `D-046` (סטטוס ⛔ עודכן) | .github/workflows/sentinel.yml:69-77 · docs/DONE.md:77 — Sentinel job browser נתלה ב-playwright install --with-deps ומת בטיימאאוט 12 דק'. |
| 5 | `B-056` | security | `8a23f48` | ⛔ אין | api/feedback.js:36-54 · api/feedback.js:119-122 · src/components/Feed… — ייחוס feedback.user_id נלקח מהקליינט בלי JWT; הפתרון — גזירת user_id בשרת מהטוקן. |
| 6 | `B-062` | data-integrity | `cf18137` | ⛔ אין | SwingEdge_App.jsx:2997-3000 · src/import/normalizeRow.js:173 · src/co… — shares:0 נכתב ונקרא כעסקה תקינה — חוסר ולידציה בכתיבה. |
| 7 | `B-077` | trade-form | `8977fc5` | ⛔ אין | api/ocr.js:69-72 · api/ocr.js:476 · api/ocr.js:496 · api/ocr.js:596 ·… — api/ocr.js ללא תצפיתיות — אין רישום של tool/confidence/מקור ה-entry/התוצאה. |
| 8 | `B-136` | trade-form | `2491c86` | ⛔ אין | SwingEdge_App.jsx:3033 · src/utils.js:30 — date נכתב ב-UTC בהזנה ידנית, כך שעסקה בשעות מסוימות מקבלת יום שגוי. |
| 9 | `B-178` | performance | `5519ad1` | ⛔ אין | SwingEdge_App.jsx:2157-2188 — פולר fetchLivePrices רץ ב-setInterval בלי שער document.hidden ומעמיס Finnhub בטאב ברקע. |
| 10 | `B-228` | security | `eccfbc8` | ⛔ אין | package.json:74-78 · package-lock.json:3052-3053 · docs/plans/PLAN-20… — npm audit: 1 high — nanoid טרנזיטיבי דרך postcss. |
| 11 | `B-268` | auth-settings | `6fd3106` | `D-063` (סטטוס ⛔ עודכן) | SwingEdge_App.jsx:1831-1835 · SwingEdge_App.jsx:1839-1852 · SwingEdge… — אפקט ההתמדה דרס הון אמיתי ב-DEFAULT_CAPITAL אחרי הידרציה כושלת — תוקן ב-W-CAP. |
| 12 | `B-269` | auth-settings | `6fd3106` | ⛔ אין | src/lib/userSettings.js:178 · src/lib/userSettings.js:196 · src/lib/u… — loadSettings בלעה את error והחזירה {} — כשל RLS היה בלתי-נבדל מ«אין הגדרות». תוקן ב-W-CAP. |
| 13 | `B-312` | monitoring | `d9ff696` `808d83d` | `D-080` (סטטוס ⛔ עודכן) | SwingEdge_App.jsx:5531 · tests-sentinel/sentinel-auth.spec.js:349 · t… — לוקייטורי טיקרי הבדיקה בסנטינל (\b מול תג-הגיבוי של TickerLogo) מתו — הוחלפו בעוגן data-t… |

⚠️ `B-062`: שלושת מסלולי ה-UI (ידני · ייבוא · עריכה) חוסמים `shares ≤ 0` (`cf18137`), אבל ⛔ אין CHECK ב-DB ו⛔ שומר ב-`src/lib/tradeWrite.js` — מסלול עתידי יעקוף. ⚠️ `B-031`/`B-228` מתארים את אותה פגיעות nanoid (נסגרה ב-`eccfbc8`); ה-pin עצמו הוא חוב ב-`B-380`.

### 4.3 · DONE-SILENT — הקוד תוקן, הסגירה חסומה (8)

| # | מזהה | hash | חוסם הסגירה | מה ניב עושה |
|---|---|---|---|---|
| 1 | `B-318` | `d0d7940` | מדידה N≥50 (INBOX 21.09) | האם N=12 ריצות (0/5 :20 · 7/7 :50) מספיק לסגירת B-318, או לדרוש מדידה חוזרת על ≥50 ריצות כמו 11.09? |
| 2 | `B-336` | `cf18137` | C-053 | 1. בפרודקשן, ג'ורנל שבו עסקאות בלי סטאפ הן בעלות ה-win-rate הגבוה ביותר. 2. לפתוח ניתוח ביצועים ולוודא שאריח … |
| 3 | `B-338` | `cf18137` | C-052 | 1. בפרודקשן, טופס הוספת עסקה עם NBIS 220.02/202.48, הון ₪2,490, כלל 1%. 2. לוודא ש-SHARES מציג 0 + באנר, ו-Lo… |
| 4 | `B-350` | `6aa27b3` | C-057 | 1. להריץ C-057 בדפדפן (he + en): לסיים סיור בלי לגעת בהגדרות. 2. SELECT settings->>'tourDone' from public.use… |
| 5 | `B-351` | `6aa27b3` | C-057 | 1. C-057: בדפדפן, יומן ריק ויומן מלא — שלבי «הוספה ידנית»/«תמונה» מאירים את ה-FAB בשניהם. 2. לסמן C-057. |
| 6 | `B-352` | `6aa27b3` | C-057 | 1. C-057 בעברית: ← מקדם שלב ו-→ מחזיר. 2. לסמן C-057. |
| 7 | `B-353` | `6aa27b3` | C-057 | 1. C-057: לעבור את כל 14 שלבי הסיור ולוודא שאין אזור תוכן ריק ואין console.error. 2. לסמן C-057. |
| 8 | `B-365` | `5a97a37` | C-059 | C-059 ⓸: חשבון חדש (חלון אנונימי) רואה את השאלון; לסמן C-059. |

⇒ **4 בדיקות (C-053 · C-052 · C-057 · C-059) + מדידה אחת (B-318, N≥50) משחררות 8 פריטים.** `C-057` לבדה סוגרת 4 (B-350…B-353).

**ראיה מלאה לכל פריט** (hash · diff ≤15 שורות · ציטוט HEAD · הפקודה) — בנספח ה-JSON, שדה `evidence`. אומתה מכנית: §14.a.

---

## 5 · OBSOLETE · DUPLICATE · SUPERSEDED

**OBSOLETE: 0.** 2/388 פריטים מצטטים נתיב שאינו קיים (`B-106`, `B-288`) — אף אחד ⛔ עמד בראיה (commit שהסיר + grep). תואם את `AUDIT-backlog-hygiene.md` (1/258).

**SUPERSEDED: 0** (אחרי QA — ראה §14).

**DUPLICATE: 3**

| # | כפילות | קנוני | המשפט המכריע |
|---|---|---|---|
| 1 | `B-123` | `B-005` | B-005: «13 שורות ת״א באגורות נושאות תווית USD; חשיפה 4,061,818 = 101.55× ההון». B-123: «חשיפה פי-101.5455 בגודל הפוזיציה — נשארת פתוחה». אותה בעיה ואותו תיקון (תיקון 13 השורות אחרי B-121). |
| 2 | `B-280` | `B-260` | B-260 (27.08): «**מדד סגירה:** או שער שמאמת `file:line` מול תוכן, או המרה לעוגני-תוכן». B-280 (29.08): «**ההכרעה הפתוחה:** עוגן טקסטואלי (`const StatCard`) במקום מספר, **או** שער שמאמת שכל `<file>:<n>` במרשם מפנה לשורה שנושאת את הטוקן» — אותה בעיה ואותו תיקון. |
| 3 | `B-324` | `B-257` | B-257 (27.08): «שתי מניות אסרציות ב-CLAUDE.md §7 נסחפו… הכיוון הוא אסרציה שגוזרת את המניות מהריצה». B-324 (15.09): «11 מניות האסרציות באותו סעיף נשארו כתובות ביד… test:write מוצהר 25 ומדפיס 29». אותה בעיה (test:write 25→29 משותף) ואותו תיקון (גזירה מהריצה). ⚠️ CLAUDE.md §7 מצטט את B-324 ⛔ את B-257. |

---

## 6 · STALE-EVIDENCE — נכתב מול נמדד (31)

| # | מזהה | U | נכתב · נמדד |
|---|---|---|---|
| 1 | `B-016` | U1 | נכתב 42 ב-SwingEdge_App.jsx + AdminPanel.jsx:50 · נמדד 46 ב-SwingEdge_App.jsx + AdminPanel.jsx:55 (writeJSON ב-:54). |
| 2 | `B-025` | U1 | נכתב :412 placeholder · :533 יחס 2:1 (בלי שם קובץ) · נמדד OnboardingScreen.jsx:393 placeholder="10000" (רמז HTML, לא באג) · OnboardingScreen.jsx:514 2:1 ליטרל מוצג. אבחון AUDIT-dead-code M5: שגוי מלכתחילה ב-19-20 שורות. |
| 3 | `B-026` | U0 | נכתב :1363 :1785 :2481 :4569 :7387 :7576 · נמדד :1591 :2073 :3077 :5426 :8414 :8604 (6 אתרים — המניין תקף, כל השורות זזו >200). |
| 4 | `B-033` | U0 | נכתב :353 (בדיקת aria-label) · נמדד arch-auditor.mjs:437-447 — עדיין מסמן כל <button> בלי aria-label (false positive לא תוקן). |
| 5 | `B-046` | U0 | נכתב :1942-1946 · צרכנים :4105 :4120 :4150 :4796 · נמדד :2366 · צרכנים :5032 :5066 :5099 :5813. |
| 6 | `B-159` | U0 | נכתב: פיקסצ'רים נושאים exitDate בלבד ⇒ holdDays=null · נמדד: mk() גוזר closedAt מ-date (tradingstats-test.mjs:199, מאז 1426eef 30.07) ⇒ holdDays=0 (סגירה ביום הכניסה). התוצאה 7/7 avgHold=0 תקפה, המנגנון והתיקון המוצע (הוספת closedAt) שגויים. |
| 7 | `B-053` | U1 | נכתב: «מותנה בהוספת rate-limit ל-symbol-search» · נמדד: rateLimit קיים ב-api/symbol-search.js:10,32 מאז 86fcbfa (07.07) — לפני פתיחת הפריט. הפיצ׳ר עצמו לא מומש (0 שימושים ב-symbol-search תחת src/import). |
| 8 | `B-140` | U0 | נכתב: כלל (5) «אינו בשום קובץ» (נמדד 13.08) · נמדד: DECISIONS.md:25 (2026-07-27, 80b5858) «לאמת זהות המשתמש המושפע לפני בניית תוכנית סביבו». כלל (1) לא נמצא. |
| 9 | `B-187` | U3 | נכתב SwingEdge_App.jsx:5039 (TradeCalendar) · נמדד :5407-5413 (calcMetrics={calcTradeMetrics}, currency={dispCcy}); נכתב App:2932 (עיגול לפני המרה) · נמדד :3156 fmtAcct(closedTrade, Math.round(pnl)). TradeCalendar.jsx:56,135,199 ו-DayTradesModal.jsx:137 מדויק… |
| 10 | `B-190` | U1 | נכתב SwingEdge_App.jsx:1305-1306 · נמדד :1305 הוא supabase.auth.getSession; קריאת ההון מ-localStorage נמצאת ב-:1400 (parseFloat(localStorage.getItem('swingEdgeCapital')) ¦¦ DEFAULT_CAPITAL). נתוני user_settings (9/11/13 מפתחות, currency ריק 38/38) דורשים DB. |
| 11 | `B-201` | U1 | נכתב 'כשל טעינה מייצר נתוני דמו שנשמרים' · נמדד MOCK_TRADES = [] (SwingEdge_App.jsx:309, כך מאז efa50df 28.03) ⇒ אין נתוני דמו; הכשל הוא רשימה ריקה. locator נכתב :1448-1450 · נמדד :1543-1548. הטיהור והכתיבה-חזרה השקטה (:1545-1546) חיים. |
| 12 | `B-203` | U1 | נכתב SwingEdge_App.jsx:3326-3341 · נמדד selectMentee ב-:3550-3564 — ללא AbortController או בדיקת מזהה אחרי await. נכתב :2706-2726 · נמדד fetchFormQuote ב-:2920-2940 — setFormQuote ללא בדיקת טיקר נוכחי. |
| 13 | `B-215` | U0 | נכתב SwingEdge_App.jsx:3937 · נמדד :4161 'if (isSupabaseConfigured && !session) { return <AuthScreen />; }' — הבאג חי. |
| 14 | `B-217` | U1 | נכתב SwingEdge_App.jsx:2283-2284 · נמדד :2447-2448 closedTrades/openTrades ללא useMemo. נכתב :5126-5149,:5277,5280 · נמדד MobileTradeCard ב-:4915 ו-:5649. MobileTradeCard.jsx:172 memo מדויק. |
| 15 | `B-218` | U1 | נכתב src/main.jsx:76 גבול יחיד · נמדד 5 PanelBoundary (SwingEdge_App.jsx:4435,4923,5190,6311,7022) + RootFallback ממותג (528f0b2, B-304, D-075) ⇒ F-01/F-02 טופלו. F-09: 0 מופעי onLine/offline ב-src ⇒ חי. |
| 16 | `B-254` | U1 | נכתב :3979 (מעטפת) · :3959 (טעינה) · נמדד :4187 (מעטפת) · :4150 ו-:4171 (שני מסכי טעינה) — Δ≈+208, ושלושה אתרים ⛔ שניים. index.css:67 מדויק. הבאג עצמו חי. |
| 17 | `B-267` | U0 | נכתב BACKLOG.md:40+:48 · נמדד :341+:349 (אותו פער של 8 שורות — הבאג חי, המפנה שגוי). |
| 18 | `B-273` | U0 | נכתב: «פתוח — ממתין להכרעת ניב» (האם להוסיף jsdom) · נמדד: ההכרעה ניתנה 29.08 ונרשמה ב-DECISIONS.md:195 (03.09) — ⛔ jsdom, והפריט «נשאר פתוח ומצומצם». ⇒ ⛔ SUPERSEDED (ההכרעה משאירה אותו פתוח); הסטטוס והשאלה מיושנים. |
| 19 | `B-286` | U0 | נכתב: «ממתין ל-D-063» + הקוד ב-userSettings.js:192 · נמדד: D-063 כבר קיים ב-DONE.md:93 (06.09, 16c1e00) ⛔ ואינו מזכיר flushSettings/P7 (grep=0 ב-DONE); השומר נמצא ב-:250 (הערת P7 ב-:240-245). התנאי שעליו הפריט ממתין כבר התקיים בלי לסגור אותו. |
| 20 | `B-289` | U0 | נכתב: M-003=0/6 נמדד 06.08, פג · נמדד: המדידה החוזרת בוצעה 06.09 (e27bde0) ⇒ 0/11, ו-0/6 ירד לשושלת (METRICS.md:87); אך ב-HEAD M-003 שוב «⏳ פג» (METRICS.md:40, נמדד 06.09 + תוקף 14 < 30.09). |
| 21 | `B-290` | U1 | נכתב: SwingEdge_App.jsx:6708 · נמדד: :7028 — `<Radio size={12} …/>` עדיין ללא תנאי (רק RefreshCw ב-:7027 מותנה ב-pricesLoading). הפגם חי; הלוקייטור נדד 320 שורות. |
| 22 | `B-293` | U1 | נכתב: :4307/:4308/:4866/:5245/:5246/:5272/:8075/:8076/:564/:4617 · נמדד: :4531/:4532/:5154/:5547/:5548/:5574/:8452/:8453/:570/:4846 — כל ארבעת התווים עדיין קיימים; שומר `t.exit ?` ב-:5574. |
| 23 | `B-296` | U1 | נכתב: SwingEdge_App.jsx:2038 · נמדד: :2163 `if (document.hidden) return;` בתוך run() — לפני fetchLivePrices ⇒ setPricesLoading(true) ב-:2111 לא נקרא. הפגם חי; הלוקייטור נדד 125 שורות. |
| 24 | `B-299` | U2 | נכתב: «היצירה קיבלה shares=0» · נמדד: SwingEdge_App.jsx:2997 `if (!(effShares > 0))` חוסם שמירה (B-338, 18.09). target: :2823 `parseFloat(form.target) ¦¦ 0` + utils.js:116 (`t > 0 &&`) ⇒ target 0/ריק נשמר כ-0 (:3049), ו-EditTradeModal.jsx:67-68 דוחה אותו. sto… |
| 25 | `B-315` | U1 | נכתב SwingEdge_App.jsx:8275 (ResetAllModal) · :8304 (ImportJournalModal) · :8334 (ChangePasswordModal) · נמדד :8536 · :8565 · :8595 — סחיפה ~261 שורות. ה-key עדיין חסר בשני האתרים (הבאג חי). |
| 26 | `B-321` | U3 | נכתב :3009 (toast) · :3007 (הערה) · נמדד :3156 (const shown = fmtAcct(closedTrade, Math.round(pnl))) · :3154 (הערת «Math.round נשמר בדיוק כפי שהיה») — סחיפה 147 שורות. הבאג חי. |
| 27 | `B-325` | U3 | נכתב B1 :383 · B2 :523 · B3 :6190 · B4 :6234 · B5 :6447 · B6 :6457 · B7 :6476 · B8 :6484 · נמדד :382 · :522 · :6378 · :6422 · :6643 · :6653 · :6672 · :6680 — B3–B8 סחפו ~188-196 שורות. כל 8 הביטויים עדיין בעץ. |
| 28 | `B-328` | U1 | נכתב XAxis :4608 · :6166 · נמדד :4785 · :6354 (dataKey="date" + tickFormatter v.slice(5)) — סחיפה ~180 שורות. generateEquityCurve :368 בתוקף. הבאג חי (אין type="number"). |
| 29 | `B-330` | U1 | נכתב :6265-6295 · :6274 · נמדד InfoTooltip :6462 («גובה העמודה = מספר עסקאות») · ReferenceLine :6474 (position insideTopRight) — סחיפה ~200 שורות. הבאג חי. |
| 30 | `B-341` | U1 | נכתב: שלושה אתרי כסף-של-עסקה :6092 (סיכון) · :6100 (ערך פוזיציה) · :6106 (רווח-יעד). נמדד ב-HEAD: capSym במחשבון רק ב-:6257 riskDollars (=capN×risk%, תקציב הון) · :6265 posValue · :6274 capN (הון עצמו); אין אתר רווח-יעד במחשבון, ו-:6106 בזמן הפתיחה (251e2b1) … |
| 31 | `B-362` | U0 | נכתב SwingEdge_App.jsx:1252 · נמדד SwingEdge_App.jsx:1313 (הזזה 61 שורות, מעבר ל-±50). הבעיה עצמה חיה: 4 מאזינים בעץ (main.jsx:140, SwingEdge_App.jsx:1313, useSupabaseSession.js:22, AdminPanel.jsx:322); Sentry.setUser רק ב-useSupabaseSession.js:20,24; main.js… |

**UNMEASURABLE (19) — מה נדרש כדי להכריע:**

| # | מזהה | area | נדרש |
|---|---|---|---|
| 1 | `B-010` | growth-retention | דורש הרצה חוזרת של scripts/retention.sql מול Supabase פרודקשן (SQL Editor) — מספר 0/6 מ-06.08, 55 ימים בלי מדידה. |
| 2 | `B-049` | data-integrity | דורש SQL: select id, user_id, ticker from trades where ticker <> btrim(ticker); ואם קיימת — update trades set ticker = btrim(ticker) where ticker <> btrim(ticker); (ניב מריץ). |
| 3 | `B-128` | money-display | דורש אבחון חי בדפדפן (Code+Chrome): הקלטת מסך/Performance במעבר מתג המטבע + ספירת רינדורים של useFxRates. אין מדידה בריפו. |
| 4 | `B-175` | monitoring | לא ניתן להכריע מהריפו. נדרש: gh run list --workflow sentinel.yml --created '>2026-08-22' --json conclusion,databaseId ולבדוק ב-.sentinel-state/state.json (cache) אם fingerprint browser-auth¦journal-open חזר (count>1) מאז 22.08. |
| 5 | `B-058` | security | האות דורש DB: select count(*) from public.mentorships; (0 ב-02.08). ה-RPC עדיין נקרא ישירות מהלקוח. |
| 6 | `B-083` | trade-form | נדרש: Vercel runtime logs של api/ocr.js בחלון הזמין, סינון '[ocr] path=' — ספירת ריצות לפי path. התלות B-077 נסגרה (8977fc5), כך שהלוגים נושאים כעת עקבה. |
| 7 | `B-098` | trade-form | נדרש: חיפוש בתיבת הדואר של ניב אחר תשובה מ-omrikapara1 מאז 08.08. |
| 8 | `B-099` | growth-retention | נדרש: GA4 Explore funnel — מכנה: סשנים עם consent granted; מונה: אלה שהגיעו ל-first_trade_saved; טווח 09.08→היום. |
| 9 | `B-100` | growth-retention | נדרש: GA4 screen_view למסך mentoring מאז 09.08 + SQL: select count(*) from public.mentorships; |
| 10 | `B-101` | growth-retention | נדרש SQL: select count(*), count(*) filter (where status='CLOSED'), max(date) from public.trades where user_id::text like 'de66dc99%'; |
| 11 | `B-141` | data-integrity | דורש DB פרודקשן: select count(*) as n, count(*) filter (where stop is not null and target is not null and coalesce(setup,'')<>'' and coalesce("emotionAtEntry",'')<>'') as full_fill from public.trades where is_demo is not true and… |
| 12 | `B-181` | monitoring | דורש Vercel: get_runtime_errors לאותו cluster עם חלון זמן קבוע (24.08 ו-25.08) והגדרת הדגימה; לא ניתן לשחזור מהריפו, וסביר שהנתון ההיסטורי כבר לא זמין. |
| 13 | `B-183` | monitoring | דורש דשבורד TwelveData (usage per minute) בחלון 24 שעות מלא + לוגי Vercel runtime של api/quote.js עם פירוק לפי endpoint/caller בדקות השיא. |
| 14 | `B-233` | data-integrity | דורש DB: select count(*) n, count(*) filter (where source is null or source='') no_source, count(*) filter (where currency_source is null) no_ccy_src, count(*) filter (where import_batch_id is not null) with_batch from public.tra… |
| 15 | `B-244` | monitoring | scripts/user-analytics.mjs:728-731 מדפיס רק low.length/measured.length. נדרש: הרצת הסקריפט מול פרודקשן (service key) והדפסת d.fill.perField — שם, median, תאריך כניסה למדידה — ל-12 השדות. |
| 16 | `B-255` | security | נדרש SQL ב-Supabase: select payload->>'action' a, payload->'traits'->>'provider' p, count(*) from auth.audit_log_entries where created_at >= '2026-07-04' and created_at < '2026-08-28' and payload->>'action' in ('login','user_reco… |
| 17 | `B-271` | auth-settings | נדרש SQL: select count(*) filter (where (settings->>'capital')::numeric = 2500) as at_default, count(*) as total from public.user_settings; — הבאנר מוסר כש-at_default=0. המפתח עדיין ב-SwingEdge_App.jsx:1928/:4244. |
| 18 | `B-294` | money-display | נדרש: סשן דפדפן אמיתי בחשבון QA עם יומן רשת — תשובות /api/quote (או fetchPrices) ל-UUUU,NOK,NVDA,BE באותה קריאה, עם זמני הגעה; ובמקביל קריאה ישירה ל-API של ספק המחיר לאותם טיקרים כדי להבחין בין תזמון לבין תקלת-ספק. לא ניתן מהריפו. |
| 19 | `B-300` | data-integrity | נדרש אבחון DB read-only (SQL Editor): SELECT user_id, ticker, currency, status, count(*) FROM trades WHERE upper(trim(currency))='ILS' AND ticker ~ '^[A-Za-z]+$' AND coalesce(is_demo,false)=false GROUP BY 1,2,3,4 ORDER BY 5 DESC;… |

---

## 7 · אשכולות לגל (22)

מתוך LIVE · STALE-EVIDENCE · UNMEASURABLE בלבד. גודל: S=1 · M=3 · L=8 · ?=3 — ⚠️ **הגדלים הם הערכות מהמרשם, ⛔ נמדדו** (מקרא BACKLOG). ⛔ אשכול לפי שורש. ⛔ אשכול >12. ⛔ פריט בשני אשכולות (נבדק: 0 הפרות).

| K | שם | area | פריטים | גודל | max U | score | T צפוי |
|---|---|---|---|---|---|---|---|
| K1 | P&L לא-ממיר בלוח השנה · סיכום היום · דוחות | money-display | `B-045` `B-187` `B-021` `B-232` | 8 | U3 | 15.6 | T3 |
| K2 | Math.round על כסף לפני מעצב דו-ספרתי (מחלקת D-068) | money-display | `B-321` `B-325` | 6 | U3 | 18.5 | T3 |
| K3 | מחשבון הפוזיציה (Tools) — סמל מטבע וסיבת-סירוב | money-display | `B-341` `B-387` | 2 | U1 | 6.4 | T2 |
| K4 | ולידציית כיוון/גיאומטריה — מקור-אמת-אחד ליצירה · עריכה · ייבוא | trade-form | `B-069` `B-070` `B-299` | 9 | U3 | 14 | T3 |
| K5 | 13 שורות ת״א באגורות — minorUnit מקצה לקצה | money-display | `B-005` `B-121` `B-048` | 12 | U3 | 7.7 | T3 |
| K6 | בלוב ההגדרות — מיזוג בצד השרת | auth-settings | `B-361` `B-270` `B-066` | 7 | U3 | 17.1 | T3 |
| K7 | סטטיסטיקות מחזירות 0 על אוכלוסייה ריקה | journal-analytics | `B-158` `B-204` `B-061` `B-161` | 8 | U3 | 15.5 | T3 |
| K8 | רצפים ו-drawdown על סדר לא-ממוין | journal-analytics | `B-206` `B-063` | 4 | U1 | 4 | T2 |
| K9 | שערי הסנטינל שנעוצים בשעון-קיר | monitoring | `B-276` `B-356` | 4 | U0 | -6.9 | T2 |
| K10 | כנות התראת הסנטינל בדיסקורד | monitoring | `B-147` `B-169` `B-381` | 5 | U0 | -8.6 | T2 |
| K11 | אכיפת CSP | security | `B-003` `B-222` `B-059` | 12 | U0 | -22.2 | T3 |
| K12 | חסם-קצב ו-api/ hygiene | security | `B-040` `B-219` `B-179` `B-220` | 10 | U1 | -8.8 | T3 |
| K13 | §8.6 — פרוזה מול מדידה מורחב | ci-registry | `B-257` `B-258` `B-261` `B-282` | 6 | U0 | -10.9 | T1–T2 |
| K14 | ציטוטי file:line במרשם נסחפים | ci-registry | `B-260` `B-028` | 4 | U0 | -6.3 | T1 |
| K15 | תמונות (Playbook/עסקה) ב-localStorage בלבד | data-integrity | `B-015` `B-038` | 4 | U3 | 23.8 | T3 |
| K16 | באנדל ראשי 1.6MB | performance | `B-032` `B-216` | 11 | U1 | -10.3 | T2 |
| K17 | גדר bidi לכסף ב-RTL | i18n-rtl | `B-205` `B-329` | 4 | U1 | 3.2 | T2 |
| K18 | חיוּת Watchdog/fleet-daily | monitoring | `B-002` `B-308` `B-370` `B-369` | 6 | U0 | -11.2 | T2 |
| K19 | מיגרציית RLS/אבטחה אחת | security | `B-198` `B-199` `B-221` `B-223` | 10 | U0 | -18.8 | T3 |
| K20 | מקור ומטבע במטען המחיר | money-display | `B-138` `B-081` `B-291` | 5 | U1 | 1.9 | T3 |
| K21 | טבלת התצוגה המקדימה בייבוא | import | `B-054` `B-055` `B-052` | 5 | U1 | 2 | T2 |
| K22 | כותרות vercel.json (cache · region · referrer) | performance | `B-237` `B-239` `B-256` | 3 | U1 | 5.2 | T3 |

### K1 · P&L לא-ממיר בלוח השנה · סיכום היום · דוחות

- `B-045` (LIVE · U3 · M) — 3 טאבים (TradeCalendar, MonthlyReportTab, WeeklyReviewTab) מוזנים calcTradeMetrics גולמי ללא המרה.
- `B-187` (STALE-EVIDENCE · U3 · M) — לוח השנה וסיכום היום מציגים P&L לא-ממיר תחת סמל מטבע החשבון; טוסט רווח מעוגל לפני המרה.
- `B-021` (LIVE · U1 · S) — DayTradesModal.metricsOf — catch {} שמחזיר {pnl:0} בשקט.
- `B-232` (LIVE · U1 · S) — ~14 מבחני סימן גולמיים (>= 0) עוקפים isNegativeValue, ו-prevPriceRef קופא במחיר הטעינה.

**תיקון משותף:** להזין את TradeCalendar · DayTradesModal · MonthlyReportTab · WeeklyReviewTab ב-calc הממיר (makeConvertingCalc) במקום calcTradeMetrics גולמי, ולהחליף את ה-catch→{pnl:0} של metricsOf בהודאה (null ⇒ «—»). אותו מעבר מחליף את מבחני הסימן הגולמיים ב-isNegativeValue.

**קבצים:** src/components/TradeCalendar.jsx · src/components/DayTradesModal.jsx · SwingEdge_App.jsx (props לטאבים) · **harness:** test:instrument (makeConvertingCalc) · ⛔ אין harness ל-TradeCalendar/DayTradesModal

**חוסם:** — · **T:** T3 — אמון (כסף) + רוחב (>קובץ קוד אחד)

### K2 · Math.round על כסף לפני מעצב דו-ספרתי (מחלקת D-068)

- `B-321` (STALE-EVIDENCE · U3 · M) — אתר A1 של מחלקת D-068 — toast סגירת עסקה מציג Math.round(pnl) דרך מעצב שכופה 2 ספרות, והיפוך ההחלטה המתועדת דורש הכרעה בכתב.
- `B-325` (STALE-EVIDENCE · U3 · M) — 8 אתרים עקיפים של D-068 — Math.round על כסף ב-payload של גרפים/טבלה שנצרך ב-fmt$/fmtBalance ומציג .00 מומצא.

**תיקון משותף:** להסיר Math.round לפני fmt$/fmtBalance/fmtAccountAmount ב-9 האתרים הפגומים-בהצהרה ולהזיז את שורות הלדג׳ר של test:cents בכיוון ההפוך באותו קומיט.

**קבצים:** SwingEdge_App.jsx (toast :3156 · generateEquityCurve :382 · setup-matrix :6672/:6863 · 6 אתרי גרף) · **harness:** test:cents (לדג׳ר דו-כיווני — 9/14 מוצהרים פגומים)

**חוסם:** — · הכרעת/פעולת ניב ב-B-321 · **T:** T3 — אמון (כסף) + ודאות (שורות סחפו 147–261)

### K3 · מחשבון הפוזיציה (Tools) — סמל מטבע וסיבת-סירוב

- `B-341` (STALE-EVIDENCE · U1 · S) — מחשבון הפוזיציה מציג כסף-של-עסקה-בודדת עם סמל מטבע ההון — אתר שני של מחלקת B-339.
- `B-387` (LIVE · U1 · S) — מחשבון גודל הפוזיציה (כלים) מסווג «שער נטען» כ«אין שער» — refusalReason בינארי במקום sizingRefusalReason.

**תיקון משותף:** calcSizing מחזיר refusal תלת-ערכי (loading · missing · ok) ומעצב כסף-של-עסקה בודדת במטבע הנייר — שני שינויים באותה פונקציה (:6080-6265).

**קבצים:** SwingEdge_App.jsx:6080-6265 · **harness:** test:instrument בלוק 22 (capitalGate/submitGate) — ⚠️ calcSizing עצמו ⛔ מכוסה

**חוסם:** — · **T:** T2 — אמון (תווית כסף), קובץ אחד

### K4 · ולידציית כיוון/גיאומטריה — מקור-אמת-אחד ליצירה · עריכה · ייבוא

- `B-069` (LIVE · U3 · M) — בייבוא בלי עמודת side, side נגזר מהגיאומטריה ומיד מאומת מולה — בדיקה שאינה יכולה להיכשל, ושורה הפוכה נקלטת כתקינה.
- `B-070` (LIVE · U0 · M) — ארבעה מימושים עצמאיים לאותה בדיקת גיאומטריית כיוון, למרות הצהרת «Single source of truth».
- `B-299` (STALE-EVIDENCE · U2 · M) — אי-סימטריה בין ולידציית יצירה לעריכה: יצירה מקבלת target=0 שהעריכה דוחה, והעריכה מתירה stop ריק שהיצירה חוסמת.

**תיקון משותף:** validateTradeInputs יחיד (utils.js:84-125) שנצרך ע״י handleSubmit · EditTradeModal · מסלול הייבוא; inferSide בייבוא ⛔ מאומת מול עצמו; target ריק ⇒ null ⛔ 0.

**קבצים:** src/utils.js:84-125 · SwingEdge_App.jsx:2823/:3049 · src/components/EditTradeModal.jsx:67-68 · src/import/ · **harness:** test:write · test:import

**חוסם:** — · הכרעת/פעולת ניב ב-B-299 · **T:** T3 — מסלול כתיבה ל-trades + אמון

### K5 · 13 שורות ת״א באגורות — minorUnit מקצה לקצה

- `B-005` (LIVE · U3 · M) — 13 שורות ת"א באגורות מתויגות USD (חשיפה ×101.55 מההון) — תיקון דורש הודעה למשתמש וקודם את B-121.
- `B-121` (LIVE · U3 · L) — minorUnit מקצה לקצה — תנאי לכתיבת ILA על 13 שורות ת״א: גזירה, סמל ILA, חלוקה ב-100 בקריאה, ורק אז UPDATE.
- `B-048` (LIVE · U1 · S) — תיקון unitDivisor (אגורות) של יצחק מכסה רק מסלול פרופיל-ברוקר, לא ידני ולא CSV גנרי.

**תיקון משותף:** מימוש minorUnit (ILA, חלוקה ב-100, סמל) ב-deriveInstrumentCurrency ובכל אתר ייצור, ואז תיקון 13 השורות של e403e391 (B-123 כפילות של B-005).

**קבצים:** src/lib/instrumentCurrency.js · src/utils.js:134 CURRENCY_SYMBOL · src/import/brokerProfiles.js:142 + מיגרציית נתונים · **harness:** test:instrument

**חוסם:** — · הכרעת/פעולת ניב ב-B-005 · **T:** T3 — כתיבת DB + הודעה למשתמש

### K6 · בלוב ההגדרות — מיזוג בצד השרת

- `B-361` (LIVE · U3 · M) — גל 2: שתי לשוניות לאותו חשבון דורסות זו את זו ב-user_settings (upsert עיוור של כל הבלוב); הכרעת מוצר נעולה — המרוחק מנצח + דלתא מקומית.
- `B-270` (LIVE · U1 · M) — upsertBlob מחליף את כל עמודת settings — patch חלקי עם cache חלקי מוחק מפתחות אחים; נדרש מיזוג ברמת DB (RPC + מיגרציה).
- `B-066` (LIVE · U1 · S) — settings.accountCurrency נשמר ב-jsonb בלי אכיפה בשרת; ערך זר נופל בשקט ל-USD בקריאה.

**תיקון משותף:** RPC מיזוג (jsonb ||) במקום upsertBlob שמחליף את העמודה כולה; אותו RPC אוכף ערכי accountCurrency חוקיים.

**קבצים:** src/lib/userSettings.js:127-150 + קובץ .sql (ניב מריץ) · **harness:** test:settings · test:hydration

**חוסם:** — · הכרעת/פעולת ניב ב-B-270 · **T:** T3 — סכימה/DB + אבטחה (RPC)

### K7 · סטטיסטיקות מחזירות 0 על אוכלוסייה ריקה

- `B-158` (LIVE · U3 · M) — avgWin/avgLoss/bestWin/worstLoss/avgHold נופלים ל-0 כשתת-האוכלוסייה ריקה ביומן לא-ריק.
- `B-204` (LIVE · U1 · M) — tradingStats מחזיר 0 על דלי ריק ל-avgWin/avgLoss/bestWin/worstLoss ומערבב מוסכמות סימן.
- `B-061` (LIVE · U1 · S) — maxDrawdownFraction מחזיר 0 כש-peak אינו חיובי — אפס שקרי לחשבון שמעולם לא עלה מעל נקודת הפתיחה.
- `B-161` (LIVE · U0 · S) — stats.openTrades מחזיר 0 כשאין עסקאות סגורות, ואיש במוצר אינו קורא את השדה.

**תיקון משותף:** tradingStats/statisticalModels מחזירים null (⛔ 0) על דלי ריק — avgWin/avgLoss/bestWin/worstLoss/avgHold/maxDD/openTrades — והצרכנים מרנדרים «—» (R-2).

**קבצים:** src/lib/tradingStats.js:160-172,375-378 · src/intelligence/utils/statisticalModels.js:207-215 · **harness:** test:tradingstats · test:dna

**חוסם:** — · **T:** T3 — אמון (סטטיסטיקה) + רוחב (צרכנים רבים)

### K8 · רצפים ו-drawdown על סדר לא-ממוין

- `B-206` (LIVE · U1 · M) — משווי מיון לא-טוטליים (realizedAt ?? 0) ו-streaks() על מערך לא ממוין ⇒ drawdown ורצפים לא יציבים.
- `B-063` (LIVE · U1 · S) — עסקת break-even אינה שוברת רצף, ולכן הרצף המוצג ארוך מהאמיתי.

**תיקון משותף:** streaks() ו-maxDrawdown ממיינים לפי realizedAt מוחלט (⛔ ?? 0), ו-break-even שובר רצף — פונקציה אחת ב-statisticalModels.js:273.

**קבצים:** src/intelligence/utils/statisticalModels.js:273-281 · src/lib/tradingStats.js:182,220 · src/intelligence/core/MonthlyReport.js:225-231 · **harness:** test:tradingstats

**חוסם:** — · **T:** T2 — אמון (סטטיסטיקה)

### K9 · שערי הסנטינל שנעוצים בשעון-קיר

- `B-276` (LIVE · U0 · M) — שערי heartbeat ו-daily בסנטינל נעוצים בשעון-קיר (date -u +%H/%M) — מודדים את ה-scheduler ולא את המוצר.
- `B-356` (LIVE · U0 · S) — השער ה«יומי» של שכבות C+D בסנטינל נגזר משעון הביצוע ולא מהסלוט המתוזמן — בפועל ~שבועי.

**תיקון משותף:** לגזור את שערי ה-heartbeat וה-daily מ-github.event.schedule (הצורה של B-318), ⛔ מ-date -u.

**קבצים:** .github/workflows/sentinel.yml:176-182 · :640 · **harness:** ⛔ אין (test:syntax בודק תחביר בלבד)

**חוסם:** — · **T:** T2 — ודאות

### K10 · כנות התראת הסנטינל בדיסקורד

- `B-147` (LIVE · U0 · M) — סוכני ה-CI מדפיסים סיבה מומצאת מעל מה שנמדד (Sentinel «סיבה סבירה» קבועה, user-analytics «ייתכן שנמחקו»).
- `B-169` (LIVE · U0 · S) — חלון ה-dedup של 3 שעות ב-Sentinel מדכא התראות חוזרות ולכן הדיסקורד אינו מציג שיעור כשל מצטבר.
- `B-381` (LIVE · U0 · S) — embed הדיסקורד של sentinel לא מציג שדה ראיה וקישור לריצה/artifact של B-375.

**תיקון משותף:** בונה embed יחיד: סיבה מצוטטת מהלוג (⛔ «סיבה סבירה» קבועה), dedup שמסמן חזרה במקום לדכא, שדה ראיה + קישור ל-artifact.

**קבצים:** .github/workflows/sentinel.yml:184,:476-586 · scripts/user-analytics.mjs:737-745 · **harness:** test:diagnosis

**חוסם:** — · **T:** T2 — ודאות

### K11 · אכיפת CSP

- `B-003` (LIVE · U0 · L) — CSP במצב Report-Only בלי אספן דוחות — אי-אפשר לדעת אם האכיפה בטוחה.
- `B-222` (LIVE · U0 · M) — CSP במצב Report-Only עם 'unsafe-inline' ובלי אספן, בזמן שהסשן ב-localStorage.
- `B-059` (LIVE · U0 · S) — כיסוי CSP ל-emailjs ו-OCR אומת ב-probe בלבד; לאמת בשליחה אמיתית אחרי אכיפת CSP.

**תיקון משותף:** אספן report-to → חלון תנועה נקי → מעבר מ-Report-Only לאכיפה, בלי 'unsafe-inline'.

**קבצים:** vercel.json:18 + api/ (אספן) · **harness:** ⛔ אין

**חוסם:** — · **T:** T3 — אבטחה (טריגר-יחיד)

### K12 · חסם-קצב ו-api/ hygiene

- `B-040` (LIVE · U0 · M) — rateLimit הוא in-memory לכל Lambda ⇒ התקרה רכה תחת concurrency.
- `B-219` (LIVE · U0 · M) — מפתח חסם-הקצב לוקח את הערך השמאלי של x-forwarded-for (ניתן לזיוף), auth רץ לפני החסם, ו-send-invites בלי חסם.
- `B-179` (LIVE · U1 · M) — FINNHUB_API_KEY משותף לכל המשתמשים בלי מכסה פר-משתמש — משתמש אחד יכול לגרום ל-429 לכולם.
- `B-220` (LIVE · U0 · S) — קצוות api/ ללא שער method רצים על כל פועל HTTP; DELETE /api/health שורף קרדיט TwelveData.

**תיקון משותף:** rateLimit.js אחד: מאגר עמיד (⛔ in-memory), IP מהערך הימני של x-forwarded-for, מכסה פר-משתמש, ושער method לכל קצה.

**קבצים:** api/_lib/rateLimit.js · api/notify.js · api/ocr.js · api/quote.js · api/symbol-search.js · **harness:** test:syntax בלבד

**חוסם:** — · **T:** T3 — api/ + אבטחה

### K13 · §8.6 — פרוזה מול מדידה מורחב

- `B-257` (LIVE · U0 · M) — מניות האסרציות ב-CLAUDE.md §7 נסחפות ביד (test:write 25→29) — נדרשת אסרציה שגוזרת אותן מהריצה.
- `B-258` (LIVE · U0 · S) — ארבעת מספרי שכבת השורשים חיים גם ב-M-007 ב-METRICS, ו-§8.6 משווה רק את הפרוזה ב-BACKLOG.
- `B-261` (LIVE · U0 · S) — מוני «⇒ N פריטים» בכותרות BACKLOG מיושנים ו-§8.6 אינה קוראת אותם.
- `B-282` (LIVE · U0 · S) — §8.6 שומר על מספרי פרוזה ב-BACKLOG בלבד — מספרי-מנייה ב-STATE נסחפים בלי שער.

**תיקון משותף:** להכליל את §8.6 של test:registry: מניות האסרציות ב-CLAUDE.md §7 (B-324 כפילות), M-007, מוני כותרות BACKLOG, ומספרי STATE — כולם נגזרים ונבדקים מול הפרוזה.

**קבצים:** scripts/registry-test.mjs:384,800-821 · **harness:** test:registry

**חוסם:** — · **T:** T1–T2 — פנימי

### K14 · ציטוטי file:line במרשם נסחפים

- `B-260` (LIVE · U0 · M) — מספרי שורה בפריטי מרשם ישנים סוחפים שיטתית — אין שער שמאמת file:line מול תוכן.
- `B-028` (LIVE · U0 · S) — arch-auditor מפנה ל-docs/STATE.md:98 — מספר שורה בקובץ מתוקרר נודד; יש להפנות לתוכן.

**תיקון משותף:** עוגני-תוכן במקום מספרי שורה + שער שמאמת שכל file:N מפנה לשורה שנושאת את הטוקן (B-280 כפילות של B-260).

**קבצים:** scripts/registry-test.mjs · scripts/arch-auditor.mjs:129-155 · **harness:** test:registry · test:arch

**חוסם:** — · **T:** T1 — פנימי

### K15 · תמונות (Playbook/עסקה) ב-localStorage בלבד

- `B-015` (LIVE · U3 · M) — handlePlaybookImageUpload דוחף data-URL גולמי ל-localStorage דרך catch {} ריק — הסטאפ נעלם ברענון בלי הודעה.
- `B-038` (LIVE · U1 · S) — tradeImage (data-URL) נשמר ב-localStorage בלבד — המשתמש לא רואה כלום כשהשמירה המקומית נכשלת.

**תיקון משותף:** העלאה ל-Storage (או הקטנה דרך imageResize) + כשל רועש במקום catch {} ריק.

**קבצים:** SwingEdge_App.jsx:7221-7246 · :3059 · **harness:** test:capability (imageResize)

**חוסם:** — · **T:** T3 — אובדן נתונים + מסלול כתיבה

### K16 · באנדל ראשי 1.6MB

- `B-032` (LIVE · U1 · M) — ה-chunk הראשי dist/assets/index-*.js שוקל ~1,625KB.
- `B-216` (LIVE · U1 · L) — manualChunks כולא את React בתוך chunks של recharts/sentry, xlsx+papaparse במסלול הקריטי.

**תיקון משותף:** manualChunks: React מחוץ ל-chunks של recharts/sentry, xlsx+papaparse ב-lazy.

**קבצים:** vite.config.js:77-81 · SwingEdge_App.jsx:14-35 · **harness:** build בלבד

**חוסם:** — · **T:** T2 — רוחב

### K17 · גדר bidi לכסף ב-RTL

- `B-205` (LIVE · U1 · S) — בידוד RTL של מספרים תלוי במחלקה .font-mono; סכום ה-P&L בסקירה השבועית אינו מבודד.
- `B-329` (LIVE · U1 · M) — מינוס נוחת בצד הלא-נכון בכרטיסי «ניתוח ביצועים» ב-RTL, כי הגנת ה-bidi של כסף תלויה במרומז במחלקה font-mono.

**תיקון משותף:** בידוד bidi של כסף ⛔ תלוי במחלקה .font-mono — במעצב/ברכיב אחד.

**קבצים:** src/index.css:41-45 · src/utils.js:181 · **harness:** ⛔ אין (רינדור)

**חוסם:** — · **T:** T2 — אמון (מינוס בצד הלא-נכון)

### K18 · חיוּת Watchdog/fleet-daily

- `B-002` (LIVE · U0 · M) — Watchdog מודד התיישנות ולא כישלון — סף 30ש' על cron יומי מדלג על הכשל הראשון; צלע הכשל נסגרה ב-D-036, צלע הספים פתוחה.
- `B-308` (LIVE · U0 · S) — watchdog.yml הוא cron יומי שסובל מאותה הידרדרות scheduler כמו הסנטינל — אינו שכבה בלתי-תלויה.
- `B-370` (LIVE · U0 · S) — מי מודד שסלוט יומי של fleet-daily הוחמץ — slot-audit מתארח בו ולכן לא יכול לדווח על היעדרו.
- `B-369` (LIVE · U0 · S) — הערת Watchdog liveness ב-fleet-daily.yml מנמקת בסדר ריצה שהופרך (fleet-daily רץ אחרי watchdog בפועל) במקום במנגנון status=success.

**תיקון משותף:** Watchdog מודד כישלון (⛔ רק התיישנות) ומקבל שעון חיצוני שאינו cron של GitHub; הערת liveness מתוקנת.

**קבצים:** .github/workflows/watchdog.yml:48-68 · fleet-daily.yml:231-249 · **harness:** ⛔ אין

**חוסם:** B-148 · הכרעת/פעולת ניב ב-B-370 · **T:** T2 — ודאות

### K19 · מיגרציית RLS/אבטחה אחת

- `B-198` (LIVE · U0 · M) — מדיניות INSERT ל-feedback בודקת צורה (אורך/regex) ולא זהות.
- `B-199` (LIVE · U0 · M) — RLS מנטורשיפ: מנטי יכול לשכתב mentor_id, ומנטור יכול לכתוב הערה על כל trade_id.
- `B-221` (LIVE · U0 · M) — 'users own trades' הוא FOR ALL TO public, ו-CORS מקבל כל *.vercel.app.
- `B-223` (LIVE · U0 · S) — קודי הזמנת מנטור נטבעים מ-random() של Postgres ולא מ-CSPRNG.

**תיקון משותף:** קובץ .sql אחד: feedback INSERT לפי זהות · mentorships WITH CHECK · trades TO authenticated · קודי הזמנה מ-gen_random_bytes.

**קבצים:** supabase/migrations (חדש — ניב מריץ) · **harness:** ⛔ אין

**חוסם:** — · **T:** T3 — RLS + DB

### K20 · מקור ומטבע במטען המחיר

- `B-138` (LIVE · U1 · M) — api/quote.js נופל מ-CoinGecko ל-TwelveData בלי תעודת מקור, כך שמחיר מספק-גיבוי נראה זהה.
- `B-081` (LIVE · U1 · S) — מטא-דאטה של מטבע קיימת (currency_code מ-TradingView, currency:"USD" ב-quote.js) ואינה נצרכת.
- `B-291` (LIVE · U1 · S) — priceService.js:136 ממציא changePct=0 כש-prevClose falsy ⇒ «+0.00%» מומצא ברשימת המעקב.

**תיקון משותף:** api/quote.js ו-priceService מחזירים source + currency + null (⛔ changePct=0 כש-prevClose חסר).

**קבצים:** api/quote.js:83-170,297 · src/priceService.js:136,385 · **harness:** test:watchlist (W1)

**חוסם:** — · **T:** T3 — api/ + אמון

### K21 · טבלת התצוגה המקדימה בייבוא

- `B-054` (LIVE · U1 · M) — אין עריכת ticker ידנית בטבלת התצוגה המקדימה לפני אישור הייבוא.
- `B-055` (LIVE · U1 · S) — טבלת המיפוי מציגה סימול→מספר נייר בעוד tickerResolver של פרופיל הברוקר גובר, כך שהתצוגה מטעה.
- `B-052` (LIVE · U1 · S) — טקסט שלב 1 בייבוא אינו מפרסם את שלוש עמודות החובה, והמשתמש מגלה שהקובץ פסול רק בדיעבד.

**תיקון משותף:** טבלה אחת: עריכת ticker ידנית, המיפוי מציג את מה ש-tickerResolver באמת יכתוב, ושלב 1 מפרסם את עמודות החובה.

**קבצים:** src/components/ImportJournalModal.jsx:202,283-315 · src/import/brokerProfiles.js:329 · **harness:** test:import

**חוסם:** — · **T:** T2 — רוחב

### K22 · כותרות vercel.json (cache · region · referrer)

- `B-237` (LIVE · U1 · S) — נכסים עם hash בשם מוגשים עם max-age=0, must-revalidate.
- `B-239` (LIVE · U1 · S) — vercel.json בלי regions ⇒ הפונקציות רצות ב-us-east בזמן שה-DB ב-eu-west-3.
- `B-256` (LIVE · U1 · S) — כותרת Referer של ביקון Vercel נושאת את ה-query של העמוד, מחוץ להישג של beforeSend.

**תיקון משותף:** עריכה אחת ב-vercel.json: immutable לנכסי hash, regions ל-eu-west, Referrer-Policy שמנקה query.

**קבצים:** vercel.json · **harness:** ⛔ אין

**חוסם:** — · **T:** T3 — אבטחה (דליפת query)

---

## 8 · Top-15

score = U×10 + unblocks×3 + min(age_days/30, 5) − size×2. ⚠️ `unblocks` נגזר משדות blocks/blocked_by — 13/314 פריטים בלבד משחררים משהו; רוב התלויות במרשם ⛔ רשומות מכנית.

| # | אשכול/פריט | שם | U | unblocks | age | size | score |
|---|---|---|---|---|---|---|---|
| 1 | `B-340` | handleSubmit חותם currency לפי מטבע ההון על עסקה ש-entry שלה נשמר במטבע הנייר — תווית ומס… | U3 | 0 | 12 | 3 | 24.4 |
| 2 | K15 | תמונות (Playbook/עסקה) ב-localStorage בלבד | U3 | 0 | 55 | 4 | 23.8 |
| 3 | K2 | Math.round על כסף לפני מעצב דו-ספרתי (מחלקת D-068) | U3 | 0 | 16 | 6 | 18.5 |
| 4 | K6 | בלוב ההגדרות — מיזוג בצד השרת | U3 | 0 | 33 | 7 | 17.1 |
| 5 | K1 | P&L לא-ממיר בלוח השנה · סיכום היום · דוחות | U3 | 0 | 49 | 8 | 15.6 |
| 6 | K7 | סטטיסטיקות מחזירות 0 על אוכלוסייה ריקה | U3 | 0 | 45 | 8 | 15.5 |
| 7 | K4 | ולידציית כיוון/גיאומטריה — מקור-אמת-אחד ליצירה · עריכה · ייבוא | U3 | 0 | 60 | 9 | 14 |
| 8 | `B-246` | שישה כרטיסי KPI בדאשבורד זהים בגודל/משקל/פונט — אין דירוג ויזואלי, והתיקון הוא קומפוננטת … | U1 | 1 | 35 | 1 | 12.2 |
| 9 | `B-060` | calcTradeMetrics בודק if (!trade.exit) כ-falsy, ולכן יציאה במחיר 0 נחשבת «אין יציאה». | U1 | 0 | 59 | 1 | 10 |
| 10 | `B-079` | routeChartOcr ביעד position דורס entry/stop שמולאו ביד, בניגוד למסלולי OCR האחרים. | U1 | 0 | 60 | 1 | 10 |
| 11 | `B-035` | grabChartFrame מקבע רוחב בלבד — לכידה בפורטרט מעל 2000px גובה אינה מוקטנת. | U1 | 0 | 52 | 1 | 9.7 |
| 12 | `B-036` | אין fallback ל-mq.addListener עבור WebView ישן שיש לו רק את ה-API הישן. | U1 | 0 | 52 | 1 | 9.7 |
| 13 | `B-020` | handleSubmit בודק !form.ticker ולכן אינו תופס טיקר של רווחים בלבד. | U1 | 0 | 49 | 1 | 9.6 |
| 14 | `B-177` | פאנל DecisionCoach אינו מציג שהנתונים חסרים כשספק השוק נעול על מכסה; ההודעה מופיעה רק ליד… | U1 | 0 | 37 | 1 | 9.2 |
| 15 | `B-202` | עקומת ההון ב-PDF מצטברת לפי סדר המערך (תאריך יורד) ⇒ סדר הפוך. | U1 | 0 | 35 | 1 | 9.2 |

**איפה הנוסחה טועה — במפורש, ⛔ שינוי ציון בשקט:**

1. **`B-246` (#8) מדורג גבוה מדי.** היררכיה חזותית של כרטיסי KPI — קוסמטי; הוא עולה בגלל `unblocks=1` ו-size S. ⛔ הייתי מכניס אותו לגל לפני K9.
2. **פריטי ניטור עם masks=true מדורגים נמוך מדי.** U0 נותן להם ציון שלילי, אבל `B-275` (-4.9) מסתיר מוצר שבור 18:34 שעות (INCIDENTS#20), ו-`K9` (-6.9, 4 נק׳ בלבד) הוא בדיוק מה שהשאיר את הסנטינל שותק. U הנוכחי מודד נזק **ישיר** בלבד.
3. **`K11` (CSP, -22.2) ו-`K19` (RLS, -18.8)** — אבטחה ⛔ נמדדת בציר U כלל. הנוסחה ⛔ יכולה לדרג אותם; ההכרעה עליהם היא של ניב (§9).
4. **`K5` (7.7) נמוך מ-K15/K2 רק בגלל L.** הוא U3 על משתמש אמיתי (`e403e391`, חשיפה ×101.55), אבל חסום על הודעה ⇒ הציון הנמוך נכון **עד** שניב שולח.

## 8b · מסלול צמיחה (תוספת 1) — ⛔ בנוסחת §9

U מודד נזק; שימור הוא הזדמנות ⇒ פריטי growth-retention מקבלים דירוג נפרד: (א) כמה משתמשים · (ב) האם המדידה טרייה · (ג) גודל. **בסיס המשתמשים עצמו (`M-001`) פג לפני 28 יום** — כל «כמה משתמשים» למטה הוא מדידה ישנה, עם התאריך שלה.

| # | פריט/אשכול | (א) משתמשים | (ב) מדידה | (ג) גודל | מה צריך למדוד **לפני** שבונים |
|---|---|---|---|---|---|
| 1 | `B-010` שימור שבוע 1 | 0/6 חזרו (9 בני-מדידה, 06.08) · **0/11** במדידה החוזרת 06.09 (`e27bde0`, שושלת METRICS.md) | ⛔ **פג** — M-003 נמדד 06.09, תוקף 14, גיל 24 | L | `scripts/retention.sql` §3 ב-SQL Editor → עדכון M-003 במקום. ⚠️ `B-289` (STALE) הוא אותה מדידה. |
| 2 | `B-084`+`B-088` רדומים + why_stopped_r2 | 12/12 רדומים >21 יום (11.08) · קהל stuck_users: 21 (03.08) · why_stopped נתן 5→0→0 | ⛔ **פג** — 50 יום | M+S | ספירה חוזרת של הקהלים (`email-campaign.yml` audience query) + M-001. ⚠️ B-372 (MAIL_PASSWORD) **סגור** ⇒ ערוץ המייל חי. |
| 3 | חוב פידבק: `B-085`·`B-086`·`B-096`·`B-114` | 1 (omrikapara1) · 3/5 פידבקים לא-נענו (09.08) · 2 פידבקים (06.08) · 1 (a0556783290) | ⛔ פג — 11.08–13.08 | S×3 + M | ⛔ מדידה — **פעולה**: פתיחת פאנל הפידבק וסיווג §10.2 (טופל/משימה/נדחה). אפס קוד. |
| 4 | `B-007`+`B-011` גל re-engagement | 12 שנטשו אחרי עסקה ראשונה + 21 תקועים (03.08–11.08) | ⛔ פג | M+M | אותה ספירת קהל כמו #2. ⚠️ כפילות-חלקית עם #2 — אותו קהל. |
| 5 | `B-051`+`B-075` תשתית מייל | כל נמען עתידי | — (תשתית) | M+M | ⛔ מדידה; תנאי-קדם חוקי ל-#2/#4 (List-Unsubscribe) |
| 6 | `B-099` משפך GA4 | לא נמדד מעולם | UNMEASURABLE | S | GA4 Explore: consent granted → first_trade_saved מאז 09.08 |
| 7 | 🆕 «גילוי פיצ'רים לפי טאב» | לא נמדד | **יתום** — ⛔ B-, ⛔ index.md בריפו | ? | GA4 screen_view לפי טאב (אילו טאבים ⛔ נפתחים) — אותה שאילתה כמו `B-100`. |

**מסקנה:** ⛔ פריט צמיחה בשל לבנייה. #3 הוא היחיד שאפשר לעשות היום (פעולות ניב, 0 קוד). #1+#2 דורשים 2 שאילתות לפני כל החלטה.

---

## 9 · גיליון הכרעות לניב

111/314 פריטים נושאים שאלה או פעולה לניב (כולל פריטים שמחלקתם אחרת). מקובץ לפי נושא; בתוך נושא — לפי score. «משתחרר» = הפריט עצמו + מה שהוא חוסם.

### 9.0 · עשר השאלות — 5 דקות

| # | מזהה | השאלה | ברירת מחדל מומלצת |
|---|---|---|---|
| 1 | `B-072` | לממש כיסוי SHORT יתום ע״י קנייה ב-fifoMatch? | **כן** — P&L שגוי בייבוא, התיקון מקומי |
| 2 | `B-321` | לבטל «Math.round נשמר» ב-toast סגירת עסקה? | **כן** — משחרר K2 כולו |
| 3 | `B-182` | מחיר תקוע: (א) פריט נפרד · (ב) מיזוג ל-B-176 · (ג) דחייה? | **(א)** — ל-B-176 היקף אחר (cap) |
| 4 | `B-080` | שדה מטבע ב-Vision: עכשיו או אחרי B-110? | **אחרי B-110** — הקפאה הוכרעה, ואין עדות לשימוש ב-OCR ת״א (B-083) |
| 5 | `B-385` | אין שער FX: F1 / F3 / להשאיר F2 ולסגור? | **F2 + סגירה מוצהרת** — חסימה עדיפה על שמירה בלי riskPct |
| 6 | `B-299` | target ריק ⇒ null (⛔ 0) ו-stop ריק חסום גם בעריכה? | **כן** — ‹R-2›; נכנס ל-K4 |
| 7 | `B-318` | N=12 מספיק לסגירה או ≥50? | **≥50** — ההחלטה של 11.09 עצמה; זו מדידה, ⛔ קוד |
| 8 | `B-374` | ממצא red בלדג׳ר הופך ריצה לכשל? | **כן** — אחרת «success» משקר |
| 9 | `B-337` | pre-push: verify מלא / test:registry / CI? | **test:registry בלבד** (<2ש׳) — verify מלא ב-CI |
| 10 | `B-191` | מחיקה עצמית: לבנות או לתקן את נוסח המסמכים? | **לתקן נוסח** (מחיקה לפי בקשה) — עד שיש Stripe |

### 💰 כסף שגוי על המסך / בייבוא (U3/U2) — 7 פריטים · score משוחרר (חיובי) 144.6

תשובה לכל אחד משחררת קוד שכבר מוגדר.

| # | מזהה | U | שאלה / פעולה |
|---|---|---|---|
| 1 | `B-072` | U3 | לממש כיסוי SHORT יתום ע״י קנייה ב-fifoMatch (כן/לא)? |
| 2 | `B-080` | U3 | האם שדה מטבע/יחידה בפלט ה-Vision נופל מחוץ להקפאת B-110: (א) כן — לבצע עכשיו, (ב) לא — להמתין לשחרור B-110? |
| 3 | `B-182` | U3 | B-182: (א) פריט נפרד — חותמת זמן פר-טיקר ופקיעה ב-livePrices; (ב) למזג לתוך B-176 (finnhubResult משותף); (ג) לדחות? |
| 4 | `B-321` | U3 | האם לבטל בכתב את החלטת גל ג׳ («Math.round נשמר») ב-toast סגירת עסקה ולעבור ל-Math.round(x*100)/100? |
| 5 | `B-385` | U2 | כשאין שער FX: לממש F1 (שמירה עם מניות ידניות, riskPct=null) / F3 (ניסיון חוזר ואז F1), או להשאיר F2 ולסגור את B-385 כהכרעה מוצהרת? |
| 6 | `B-299` | U2 | לאחד את שרשראות הוולידציה (שינוי התנהגות): האם target ריק ביצירה יישמר כ-null (ולא 0) ו-stop ריק ייחסם גם בעריכה — כן/לא? |
| 7 | `B-067` | U1 | להוסיף ל-money() פרמטר signed:false ולהשתמש בו בצירי הגרפים בלבד (כן/לא)? |

### 👁️ אימותי-עין שחוסמים סגירה — 10 פריטים · score משוחרר (חיובי) 79.9

4 בדיקות (C-052 · C-053 · C-057 · C-059) סוגרות 7 פריטי DONE-SILENT (B-318 נסגר במדידה N≥50, §4.3); C-053 גם עונה על B-331; C-041/C-042 משלימות את B-295/B-301.

| # | מזהה | U | שאלה / פעולה |
|---|---|---|---|
| 1 | `B-338` | U3 | 1. בפרודקשן, טופס הוספת עסקה עם NBIS 220.02/202.48, הון ₪2,490, כלל 1%. 2. לוודא ש-SHARES מציג 0 + באנר, ו-Log Trade חוסם שמירה. 3. לסמן C-052. |
| 2 | `B-336` | U1 | 1. בפרודקשן, ג'ורנל שבו עסקאות בלי סטאפ הן בעלות ה-win-rate הגבוה ביותר. 2. לפתוח ניתוח ביצועים ולוודא שאריח Best Setup ⛔ מציג Unknown. 3. לסמן C-053. |
| 3 | `B-331` | U1 | האם ⓐ (משקל מדגם במיון, ⛔ שובר-שוויון) נדרש לסגירה, או שסדר winRate→count שמקובע ב-K12/K13 הוא הבחירה? |
| 4 | `B-350` | U1 | 1. להריץ C-057 בדפדפן (he + en): לסיים סיור בלי לגעת בהגדרות. 2. SELECT settings->>'tourDone' from public.user_settings where user_id='<QA>' ⇒ לא null. 3. לסמן C-057 ולרשום DONE ל-B-350…B-353. |
| 5 | `B-351` | U1 | 1. C-057: בדפדפן, יומן ריק ויומן מלא — שלבי «הוספה ידנית»/«תמונה» מאירים את ה-FAB בשניהם. 2. לסמן C-057. |
| 6 | `B-352` | U1 | 1. C-057 בעברית: ← מקדם שלב ו-→ מחזיר. 2. לסמן C-057. |
| 7 | `B-295` | U1 | להחיל את timeoutMs הקיים (FX_SETTLE_MS) גם על שער ההון ב-:2259 — כן/לא? |
| 8 | `B-301` | U1 | לסגור את C-042 בצילום לוח הסיכון במסך אמיתי (תג בטוח נעלם בסכום חלקי, ≥ מוצג). |
| 9 | `B-365` | U1 | C-059 ⓸: חשבון חדש (חלון אנונימי) רואה את השאלון; לסמן C-059. |
| 10 | `B-353` | U0 | 1. C-057: לעבור את כל 14 שלבי הסיור ולוודא שאין אזור תוכן ריק ואין console.error. 2. לסמן C-057. |

### 🗄️ שאילתות read-only ב-SQL Editor (סשן אחד) — 11 פריטים · score משוחרר (חיובי) 25.3

11 שאילתות + M-002/M-009 מ-INBOX. כולן read-only מלבד תיקון B-049 (אחרי אישור).

| # | מזהה | U | שאלה / פעולה |
|---|---|---|---|
| 1 | `B-271` | U1 | 1. להריץ את ה-SQL שב-evidence.text. 2. להדביק את at_default/total. |
| 2 | `B-343` | U1 | 1. ב-SQL Editor: select settings->>'capital' as capital, settings->>'capitalCurrency' as cap_ccy, settings->>'accountCurrency' as acct_ccy, updated_at from public.user_settings where user_id = '<user_id של החשבון מהצילו… |
| 3 | `B-300` | U1 | להריץ את ה-SELECT שב-evidence ב-SQL Editor ולהדביק את הפלט (read-only, ⛔ UPDATE). |
| 4 | `B-139` | U0 | להריץ ב-SQL Editor: select to_regclass('public.profiles') as t; ואם קיים: select count(*) from public.profiles; — ולהדביק. |
| 5 | `B-141` | U0 | 1. הרץ ב-SQL Editor את השאילתה שב-evidence.text. 2. הדבק את n ו-full_fill לשתי האוכלוסיות (manual / source ריק). |
| 6 | `B-049` | U0 | 1. להריץ ב-SQL Editor את ה-select שב-evidence. 2. אם יש שורות — לאשר את ה-update. |
| 7 | `B-101` | U0 | מעקב פעילות המשתמש de66dc99 (4 עסקאות, 0 סגורות ב-11.08). |
| 8 | `B-255` | U0 | 1. להריץ את ה-SQL שב-evidence.text ב-SQL Editor. 2. אם audit_log אינו מכסה את 04.07 — לצלם את ספירת pageviews ל-/app מקונסולת Vercel Analytics לחלון. 3. להעביר את הפלט לרישום M-. |
| 9 | `B-058` | U0 | להריץ ב-SQL Editor: select count(*) from public.mentorships; ולרשום ב-METRICS. |
| 10 | `B-233` | U0 | B-233: ל-52 השורות הישנות — (א) backfill 'legacy' בעמודה, או (ב) לקבל NULL כ'לפני B-129' ולסגור? |
| 11 | `B-010` | U0 | 1. להריץ scripts/retention.sql ב-SQL Editor. 2. להדביק את הפלט (מונה/מכנה לכל קוהורט). |

### 👤 משתמשים ופידבק (§10.2) — 8 פריטים · score משוחרר (חיובי) 21.5

מסלול הצמיחה §8b.

| # | מזהה | U | שאלה / פעולה |
|---|---|---|---|
| 1 | `B-086` | U1 | 1. לפתוח את פאנל הפידבק. 2. לכל פריט לא-סגור לקבוע משימה/טופל/נדחה (§10.2) ולרשום. |
| 2 | `B-074` | U1 | פידבק «העלאת קבצים בערוץ הפידבק» (a0556783290): (א) משימה, (ב) נדחה עם נימוק? |
| 3 | `B-096` | U1 | שני הפידבקים (zoom לתמונת סטאפ · צילומים ברצף): (א) משימה, (ב) נדחה עם נימוק? |
| 4 | `B-088` | U0 | why_stopped_r2: (א) להריץ, (ב) לבטל לאור DECISIONS 11.08? |
| 5 | `B-085` | U0 | 1. לשלוח ל-omrikapara1 מייל reply_feature_accepted עם תיאור שדה הטווח. 2. לרשום hash+תאריך מסירה בשורה. |
| 6 | `B-027` | U0 | עסקאות saridel ללא stop: (א) התנהגות לתקן — לשלוח מייל/תובנה, או (ב) סגנון מסחר לגיטימי — לסגור? |
| 7 | `B-114` | U0 | 1. פתח ב-Gmail את שני המיילים ששלחת ל-a0556783290 (02.08, 03.08 12:35). 2. אשר כן/לא שהם מזכירים את תיקון הייבוא. 3. כן ⇒ לסגור B-114 עם f375478. |
| 8 | `B-084` | U0 | לפנות ל-12 הרדומים בקמפיין (כן/לא)? |

### 📡 סנטינל וניטור — 11 פריטים · score משוחרר (חיובי) 1.6

⚠️ B-275 ⓐ = החלפת סיסמת QA — זהה לשורת INBOX 20.09 (חשיפה).

| # | מזהה | U | שאלה / פעולה |
|---|---|---|---|
| 1 | `B-318` | U0 | האם N=12 ריצות (0/5 :20 · 7/7 :50) מספיק לסגירת B-318, או לדרוש מדידה חוזרת על ≥50 ריצות כמו 11.09? |
| 2 | `B-167` | U0 | לאיזה כיוון לתקן את התרעת התנודה: (א) רצפה מוחלטת ¦diff¦≥2, (ב) אחוז רק כש-was≥10 ומתחת לזה רק ירידה ל-0, (ג) להשאיר כמות שהוא ולסגור? |
| 3 | `B-306` | U0 | 1) להריץ את 3 פקודות ה-curl שב-PLAN-2026-09-09-sentinel-representative.md §2 עם טוקן Sentry קריא. 2) להדביק את הפלט בתוכנית/בצ'אט. |
| 4 | `B-309` | U0 | 1) UptimeRobot: לרשום כל מוניטור (סוג, URL, keyword). 2) Sentry: חוק 17075516 (New/Regression, environment, throttle) + Allowed Domains. 3) להדביק ל-RUNBOOK §ערוצי התראה. |
| 5 | `B-319` | U0 | לעגן את הדוח היומי וה-heartbeat לשורת cron ייעודית דרך github.event.schedule (משנה את תדירות ההתראה בדיסקורד) — כן או לא? |
| 6 | `B-148` | U0 | לפתוח את גל B-148 במדידת מחזור ה-watchdog (הגברת תדירות הבודק) לפני כל שינוי ערכי MAXAGE — כן/לא? |
| 7 | `B-370` | U0 | לסגור את B-370 על סמך watchdog.yml:51 (סף 30 שעות ⇒ החמצה נתפסת למחרת), או לדרוש ערוץ חיצוני (ⓕ) לזמן תגובה קצר מיום? |
| 8 | `B-163` | U0 | איזה כיוון לזיהוי כשל Set up job: (ב) מתאם חיצוני מחוץ ל-Actions, (ד) החלפת actions צד-ג' ב-curl, או להסתפק במתאם fleet-daily היומי? |
| 9 | `B-275` | U0 | 1. ⓐ להחליף את סיסמת חשבון ה-QA ומיד gh secret set SENTINEL_QA_PASSWORD. 2. ⓒ ליצור fine-grained PAT ולהזין אותו ל-Cloudflare Worker. 3. ⓕ להדליק את הטריגר החיצוני אחרי מדידת הבסיס (04.10). |
| 10 | `B-360` | U0 | לאשר שורת mentorships-זרע שבה חשבון ה-QA הוא המנטור (כתיבת DB לחשבון אמיתי), כן/לא? |
| 11 | `B-374` | U0 | האם ממצא red בלדג'ר sentinel צריך להפוך את מסקנת הריצה לכשל (כן/לא — ואם לא, איזה מנגנון כן צועק)? |

### 🧹 לסגור/לדחות (כן/לא בלבד) — 14 פריטים · score משוחרר (חיובי) 9.7

כל «כן» מוריד פריט מהמרשם בלי קוד.

| # | מזהה | U | שאלה / פעולה |
|---|---|---|---|
| 1 | `B-025` | U1 | לפצל את B-025 למזהה חדש (2:1 קשיח בכרטיס הפרופיל) ולסגור את חלק ה-placeholder כלא-באג — כן/לא? |
| 2 | `B-082` | U0 | לסגור את הפריט (הקבצים נמחקו, המבנה תועד בתוכנית) — כן/לא? |
| 3 | `B-068` | U0 | avgMaeMfe: (א) למחוק, (ב) לחווט למסך האנליטיקס? |
| 4 | `B-098` | U0 | אם אין תשובה אחרי 53 יום — לסגור כ«לא אומת מול המשתמש» ולהעביר לאימות עצמי באנדרואיד (כן/לא)? |
| 5 | `B-022` | U0 | src/localAI.js: לחווט למוצר או למחוק (כולל עדכון instrument-currency-test.mjs:866)? |
| 6 | `B-175` | U0 | אם אין הישנות מאז 22.08 — לסגור כטרנזיינט לא-משוחזר (כן/לא)? |
| 7 | `B-181` | U0 | B-181: לסגור כתיעוד-בלבד (נתון היסטורי שלא ניתן לשחזר) או להשאיר פתוח לבירור מול Vercel? |
| 8 | `B-227` | U0 | B-227: ההבדלה 'נבחרה במכוון' — להשאיר (לסגור כנדחה עם נימוק) או לאחד את שתי ההודעות? |
| 9 | `B-272` | U0 | לסגור את B-272 כסיכון מקובל (שערי-המטא הופכים שבירת עוגן לאדום קשה) — כן/לא? |
| 10 | `B-286` | U0 | D-063 נכתב בלי P7 — לרשום שורת DONE נפרדת לתיקון flushSettings (6fd3106) ולסגור את B-286, כן/לא? |
| 11 | `B-288` | U0 | האם קיים נוהל אתחול-סשן שצריך להיכתב מהמקור ל-docs/BOOTSTRAP.md (כן), או שההפניה הייתה שגיאה והפריט נדחה (לא)? |
| 12 | `B-231` | U0 | B-231: לשני הכרטיסים הלא-מחווטים — (א) לחווט לממשק, (ב) להסיר, או (ג) להשאיר רדום עם שורת DECISIONS? |
| 13 | `B-132` | U0 | פרומפטי B1: (א) ניב מדביק אותם לריפו, (ב) מוכרזים אבודים והפריט נסגר? |
| 14 | `B-134` | U0 | פרומפטי לנדינג V2: (א) ניב מדביק לריפו, (ב) מוכרזים אבודים והפריט נסגר? |

### 📋 מרשם ותהליך — 13 פריטים · score משוחרר (חיובי) 0.0

פנימי (U0).

| # | מזהה | U | שאלה / פעולה |
|---|---|---|---|
| 1 | `B-151` | U0 | (א) אסרציה שדורשת שכל מזהה C- ב-DONE יישב בתא + מיגרציית אזכורים, או (ב) מיגרציה בלבד בלי אסרציה? |
| 2 | `B-310` | U0 | לפצל את הסוד בשני המקומות לשני שמות נפרדים (Actions מול Vercel) כדי שסיבוב לא ייראה משותף — כן/לא? |
| 3 | `B-317` | U0 | לאור ההרחבה של 17.09 (גם בדיקת C-0xx חסומה, D-085/C-050): ליישם עכשיו את ב׳ + שער נגד B-120, או להשאיר ⏸️ עד שתא יהפוך פסק בפועל? |
| 4 | `B-337` | U0 | איזה שער להוסיף ל-pre-push: (1) npm run verify מלא (~90 שניות לכל push) · (2) test:registry בלבד (<2 שניות) · (3) שער CI על main שתופס אחרי הנחיתה? |
| 5 | `B-344` | U0 | איזו דרך: (1) PLAN-* נכנס לקורפוס של test:registry עם אסרציה שכל K/V בטבלת §4 מופיע בקובץ מבחן שרץ · (2) תוויות-הציפייה יורדות מהתוכניות והמבחן הוא מקור-האמת היחיד? |
| 6 | `B-348` | U0 | לתקן את הטקסט הנעול ב-C-055 ⓷: (1) ₪10,000 → $10,000 (ואז 6 נכון) · (2) להשאיר הון שקלי ולהחליף את הציפייה בערך מדוד (2 ב-rate 3.0333) · (3) מדידה חוזרת שמראה שהערך תקין? |
| 7 | `B-363` | U0 | לאשר הוספת המשפט «דוח שמכריז על היעדר נושא את גבול חלון המדידה, אחרת הוא השערה» ל-CLAUDE.md §8.1? |
| 8 | `B-380` | U0 | לסגירת B-380: אסרציה שנכשלת על נעיצה מדויקת בלי הצדקה בת-תוקף, או npm audit --audit-level=high בתוך verify? |
| 9 | `B-155` | U0 | (א) חוליה נפרדת מחוץ ל-verify שקוראת information_schema ב-cron עם secret, או (ב) מניפסט סכימה בקוד + השוואה ידנית מתוזמנת? |
| 10 | `B-287` | U0 | לאבחון read-only: (א) שורת DONE לכל גל עם «אומת — read-only», או (ב) פטור מוצהר לאבחון-בלבד שהשער אוכף? |
| 11 | `B-265` | U0 | טקסונומיית W0…W5: (א) לבטל אותה רשמית (NEXT הוא הבורר היחיד), או (ב) לחייב שיוך גל לכל פריט פתוח? |
| 12 | `B-354` | U0 | (1) להרחיב את §8.6 כך שיגזור וישווה מניות גם מ-CONTEXT.md · (2) להכריז ב-DECISIONS ש-CONTEXT.md הוא פרוזה היסטורית שאינה נמדדת? |
| 13 | `B-368` | U0 | לטריות red-before של 7 הפרובים: (ⓐ) שורת M- עם תפוגה לכל פרוב, (ⓑ+ⓐ) חוליית קומפילציה זולה ב-verify + תפוגה, או (ⓒ) job CI שבועי שמריץ את 7/7? |

### 🎨 עיצוב · ביצועים · פונטים — 17 פריטים · score משוחרר (חיובי) 75.6



| # | מזהה | U | שאלה / פעולה |
|---|---|---|---|
| 1 | `B-150` | U1 | לפונטים מ-gstatic: (א) self-host של ה-woff2, (ב) fallback מוצהר, או (ג) אימות רוחב-גליף ב-Sentinel? |
| 2 | `B-315` | U1 | האם להריץ את אימות-העין (ב) — פתיחה-חוזרת של ResetAllModal אחרי הקלדת DELETE — כדי להכריע אם «המשך» לחיץ ולתקן ב-key? |
| 3 | `B-327` | U1 | לתקן בעזרת רצפת איכות ל-top (winRate≥50 ו/או avgR>0), או בהחרגה הדדית בין top ל-anti לפי שם הצירוף? |
| 4 | `B-366` | U1 | לתיקון B-366: (א) מפתח מראה לכל uid (swingEdgeSettings:<uid>) או (ב) ויתור מוצהר על המראה כמסלול-נפילה והחלפתה בהודאה רועשת? |
| 5 | `B-014` | U1 | לגבי General Sans: (א) self-host של הפונט, (ב) לוותר עליו לטובת Inter, או (ג) להשאיר את fontshare כמו שהוא? |
| 6 | `B-127` | U1 | האם מטבע התצוגה יעקוב אחרי מטבע ההון כברירת מחדל והמתג הנפרד יירד ל«מתקדם» — כן/לא? |
| 7 | `B-154` | U1 | האם הצרכן הראשון של currency_source יהיה תג הצהרה «תווית מנוחשת» על עסקה בדרגה 3-4 (null = לא-ידוע) — כן/לא? |
| 8 | `B-176` | U1 | איזו חלופה ל-Deploy 2: (א) cap=10 ולקבל ~3s cold-fetch, (ב) cap גבוה יותר, (ג) rolling-window limiter? |
| 9 | `B-235` | U1 | B-235: שער שפיות — (א) חסימה, (ב) אזהרה בלבד, או (ג) לא לבנות (מינוף לגיטימי)? |
| 10 | `B-298` | U1 | (א) לסגור את B-298 — התווית הכנה «פתוח + נסגר היום · מצטבר מיום הכניסה» מספיקה; או (ב) לבנות P&L יומי אמיתי שדורש מחיר-סגירה של אתמול לכל פוזיציה? |
| 11 | `B-333` | U1 | איזו חלופה: (א) למלא 8×4 ליטרלים ב-tooltips.js · (ב) מקור-אמת אחד לתוויות enum לשני המקומות · (ג) להרחיב את extract-tooltips.mjs לפתור import? |
| 12 | `B-367` | U1 | כשטעינת העסקאות נכשלת — להציג שגיאה מפורשת או מצב-ריק מסויג («לא הצלחנו לטעון»)? |
| 13 | `B-249` | U0 | אדום ההפסד: (א) להחליף את 22 מופעי #ef4444 בטוקן הקיים --v3-loss (#f43f5e), (ב) להגדיר את #ef4444 כטוקן בפני עצמו, או (ג) להשאיר כפי שהוא? |
| 14 | `B-281` | U0 | לקבע כלל כתוב: כל ניסוי עיצוב נדחף לענף נפרד (לא main) גם אם נדחה — כן/לא? |
| 15 | `B-247` | U1 | הגירת העיצוב: (א) לסיים את ההגירה ל-v3 ולמחוק את ה-legacy, או (ב) לקבוע קריטריון סיום כתוב (רשימת מסכים + תאריך) ולהשאיר את שתיהן עד אז? |
| 16 | `B-234` | U0 | B-234: השדה כבר נכתב מהטופס ואיש לא ממלא — (א) לקדם את השדה ב-UI, (ב) להסיר את הפיצ'ר ואת test:horizon, או (ג) למדוד מחדש קודם? |
| 17 | `B-346` | U1 | האם לפתוח ישות יומן נפרדת ל«סטאפ שזוהה ולא בוצע» (כן — באיזו צורה: סטטוס חדש ב-trades / טבלה נפרדת) או לדחות עם נימוק ב-DECISIONS? |

### ⚖️ עסקי/משפטי/תשתית — 18 פריטים · score משוחרר (חיובי) 33.8



| # | מזהה | U | שאלה / פעולה |
|---|---|---|---|
| 1 | `B-005` | U3 | 1. לשלוח הודעה מוקדמת למשתמש e403e391 על תיקון 13 השורות. 2. לאשר ל-Code להמשיך אחרי סגירת B-121. |
| 2 | `B-185` | U1 | 1. הרץ ב-SQL Editor את ה-UPDATE שמנקה price/change מ-settings->watchlist (מכנה M-019: 46 שורות) ומדוד שוב. 2. בצע C-039: נתק ספק ובדוק שהפאנל מציג — ולא מספר. 3. אשר סגירת B-185. |
| 3 | `B-135` | U0 | 1. לשאול רו״ח/Stripe Support אם נדרש עוסק מורשה לחשבון Stripe בישראל. 2. לרשום את התשובה ב-DECISIONS. |
| 4 | `B-095` | U0 | 1. להעביר חומרי שיווק ל-~/swingedge-creatives. 2. למחוק ~/Desktop/Swing-edge (להשאיר את Backup-codes). |
| 5 | `B-097` | U0 | 1. להוסיף ב-GA4 annotation ב-05.08 «קו בסיס — לפני: תנועה סינתטית». 2. לרשום ב-METRICS. |
| 6 | `B-091` | U0 | לשדרג ל-Supabase Pro עכשיו (כן/לא)? |
| 7 | `B-087` | U0 | 1. לבדוק את PR #44 ואת ענף ה-Dependabot. 2. למזג או לסגור את שניהם. |
| 8 | `B-103` | U0 | 1. לאשר שמייל user-analytics מריצה מתוזמנת הגיע לתיבה. 2. לסגור את הפריט עם מזהה הריצה. |
| 9 | `B-384` | U0 | 1) claude.ai → הגדרות הסביבה → Network access: להוסיף cdn.sheetjs.com לרשימה המותרת. 2) בסשן הבא: npm ci ולוודא יציאה 0. |
| 10 | `B-133` | U0 | אילו יכולות נחסמות למשתמש חינמי? |
| 11 | `B-094` | U0 | 1. gh secret list + רשימת env ב-Vercel (שמות בלבד). 2. להדביק את השמות; Code ימפה לצרכנים. |
| 12 | `B-090` | U0 | 1. אונבורדינג ב-₪ בחלון אנונימי. 2. ייבוא: מטבע · זבל→דחייה · round-trip · AdminPanel. 3. לצלם ולרשום ב-CHECKS. |
| 13 | `B-041` | U0 | לאשר טבלת מדידת עלות ל-OCR (קובץ מיגרציה חדש שניב מריץ) — כן/לא? |
| 14 | `B-191` | U1 | B-191: (א) לבנות מחיקה עצמית מלאה (11 טבלאות + auth.users), או (ב) לתקן את נוסח המסמכים ל'מחיקה לפי בקשה במייל'? |
| 15 | `B-242` | U0 | B-242: לשמור את ההסכמה גם ב-user_settings (ראיה שרתית) — כן/לא? |
| 16 | `B-193` | U0 | B-193: (א) להשלים את schema_migrations ב-INSERT ידני לקבצים החסרים, או (ב) להכריז שהפנקס אינו מקור-אמת ולבנות בדיקת קיום-אובייקטים במקומו? |
| 17 | `B-093` | U0 | 1. לאסוף 30 צילומי גרף ל-OCR. 2. להריץ QA מובייל 7 סעיפים. 3. להעלות לתיקייה מוסכמת. |
| 18 | `B-092` | U0 | 1. לפתוח Stripe Test Mode (אחרי B-135). 2. לאמת Search Console + Workspace. 3. להעביר /privacy לעו״ד. |

### שאר — 3

| # | מזהה | U | שאלה / פעולה |
|---|---|---|---|
| 1 | `B-099` | U0 | 1. להריץ ב-GA4 את המשפך המתואר. 2. להדביק מונה/מכנה ל-METRICS. |
| 2 | `B-183` | U0 | 1. צלם דשבורד TwelveData Usage ל-24 שעות מלאות. 2. סמן את דקות השיא (max) לצורך הצלבה מול לוגי Vercel. |
| 3 | `B-270` | U1 | 1. אחרי ש-Code כותב קובץ .sql ל-RPC מיזוג (settings ¦¦ excluded.settings) — להריץ אותו ב-SQL Editor. 2. להדביק את פלט ה-SELECT שמאמת שהפונקציה קיימת. |

---

## 10 · CHECKS — 63/63

| מצב | ספירה |
|---|---|
| NEVER-RUN | 22/63 |
| OVERDUE | 13/63 |
| TRIGGER-PENDING | 10/63 |
| OK | 18/63 |
| UNPARSEABLE | 0/63 |

### NEVER-RUN (22) — כולל ריצות חלקיות

`C-016` (טרם) · `C-024` (טרם (דו-שבועי)) · `C-028` (—) · `C-030` (—) · `C-032` (—) · `C-033` (⛔ מעולם) · `C-034` (⛔ מעולם (או רבעוני)) · `C-035` (⛔ מעולם (או רבעוני)) · `C-037` (29.08 — ⛔ לא בוצע) · `C-038` (⛔ מעולם) · `C-039` (⛔ מעולם) · `C-042` (⛔ טרם רצה כבדיקה (07.09 בפרודקשן בלבד)) · `C-043` (⛔ טרם רץ — חלקי 1/8) · `C-044` (חלקי 2/6) · `C-049` (נוסתה 16.09 והמדידה בוטלה) · `C-051` (⛔ טרם — נדרשת התראה אמיתית) · `C-052` (⛔ טרם) · `C-053` (⛔ טרם) · `C-055` (חלקי 2/5 (1/5 נצפה)) · `C-056` (⛔ טרם) · `C-057` (⛔ טרם) · `C-059` (חלקי 2/3)

### OVERDUE (13) — תדירות קבועה, נבדק לאחרונה לפני המחזור

| # | מזהה | תדירות | נבדק | ימים מאז |
|---|---|---|---|---|
| 1 | `C-006` | שבועי | 11.08 | 50 |
| 2 | `C-007` | שבועי | 11.08 | 50 |
| 3 | `C-008` | שבועי | 11.08 | 50 |
| 4 | `C-009` | חודשי | 11.08 | 50 |
| 5 | `C-010` | שבועי | 11.08 | 50 |
| 6 | `C-011` | שבועי + תנאי | 12.08 | 49 |
| 7 | `C-012` | יומי | 10.08 | 51 |
| 8 | `C-013` | יומי | 12.08 | 49 |
| 9 | `C-015` | שבועי | 12.08 | 49 |
| 10 | `C-017` | שבועי | 12.08 | 49 |
| 11 | `C-018` | שבועי | 11.08 | 50 |
| 12 | `C-025` | חודשי | 13.08 | 48 |
| 13 | `C-026` | חודשי | 15.08 | 46 |

### TRIGGER-PENDING (10) — התנאי התקיים (מוכח) ו⛔ נבדק

| # | מזהה | נבדק | הוכחה | פקודה |
|---|---|---|---|---|
| 1 | `C-001` | 11.08 | 11 commits ב-SwingEdge_App.jsx שנגעו ב-fmt$/formatPct/curEquity/openPnL מאז | `git log --since='2026-08-11 23:59' -G 'fmt\$¦formatPct¦curEquity¦openPnL' -- SwingEdge_App.jsx` |
| 2 | `C-002` | 10.08 | 3 commits ב-MobileTradeCard.jsx (הראשון e881248, 11.08) | `git log --since='2026-08-10 23:59' -- src/components/MobileTradeCard.jsx` |
| 3 | `C-003` | 12.08 | 26 commits ל-src/ או api/ (הראשון c4e811d, 13.08) | `git log --since='2026-08-12 23:59' -- src api` |
| 4 | `C-004` | 09.08 | 5 commits שנגעו בקבצי .sql (הראשון d7e4a4d, 10.08) | `git log --since='2026-08-09 23:59' -- '*.sql'` |
| 5 | `C-005` | 12.08 | כל דוח עם מספרים מאז — תנאי-משמעת; ⛔ ניתן להוכחה נקודתית | `—` |
| 6 | `C-014` | 12.08 | 333 commits מאז ⇒ סשנים רבים | `git log --since='2026-08-12 23:59' --oneline ¦ wc -l` |
| 7 | `C-021` | 13.08 | 16 commits ל-docs/INCIDENTS.md (הראשון bf7d6de, 17.08) | `git log --since='2026-08-13 23:59' -- docs/INCIDENTS.md` |
| 8 | `C-023` | 15.08 | 5 commits שנגעו ב-openPnL/curEquity/accountAmount/fxPairPlan (הראשון e5afdc7) | `git log --since='2026-08-15 23:59' -G 'openPnL¦curEquity¦accountAmount¦fxPairPlan' -- SwingEdge_App.jsx src` |
| 9 | `C-036` | 06.09 | ca56be7 (22.09) נגע ב-src/lib/userSettings.js; C-058 רצה על אותו קומיט אך היא בדיקה אחרת | `git log --since='2026-09-06 23:59' -- src/lib/userSettings.js` |
| 10 | `C-054` | 18.09 | 435282e (28.09, B-376) נגע ב-src/lib/positionSizing.js; C-063 שכיסתה את הגל נסגרה בוויתור | `git log --since='2026-09-18 23:59' -- src/lib/positionSizing.js` |

### OK (18)

`C-019` (חד-פעמי, בוצע 13.08) · `C-020` (חד-פעמי, בוצע 13.08) · `C-022` (0 commits ל-tradeWrite.js מאז 16.08) · `C-027` (0 commits ל-api/ocr.js מאז 16.08) · `C-029` (0 commits עם exportMonthlyPDF/equityIncomplete מאז 17.08) · `C-031` (0 commits ל-TradeDNA/GrowthTracker/IntelligenceUI מאז 20.08) · `C-040` (0 commits עם fmtPaperPrice מאז 06.09) · `C-041` (0 commits ל-equityState.js מאז 06.09) · `C-045` (0 commits עם EditTradeModal מאז 11.09) · `C-046` (0 commits עם schedule ב-sentinel.yml מאז 21.09) · `C-047` (0 commits עם keepBootGuardAnchor מאז 13.09) · `C-048` (0 commits עם openPlusClosedToday/openIsCumulative מאז 15.09) · `C-050` (0 commits עם generateSmartLessons מאז 17.09) · `C-058` (3/3 (22.09)) · `C-060` (התנאי (ⓕ) טרם התקיים ⇒ ⛔ לא גלשה) · `C-061` (28.09) · `C-062` (28.09) · `C-063` (נסגרה בוויתור מודע של ניב 30.09)

⚠️ **«0 commits» ב-OK מוכיח היעדר ראיה לגלישה בטוקנים שנבדקו בלבד** — לא כל תנאי-גלישה ניתן ל-grep.

---

## 11 · INBOX — 9 שורות · 8/9 מפרות «⛔ מעבר לסשן אחד»

| # | תאריך | ימים | מה | הצעת טריאז׳ | נימוק |
|---|---|---|---|---|---|
| 1 | 18.09 | 12 | בדיקה ידנית «עברה» ואז נמדדה כ⛔-הופעלה — מופע רביעי (C-047·C-049·C-054⓶·C-055) | B- חדש ‹R-4› | תבנית חוזרת (4 מופעים) ⇒ משימה: שער שסופר **סעיפים** ⛔ הצהרות בתא CHECKS. בדוק חפיפה עם B-317 לפני פתיחה. |
| 2 | 20.09 | 10 | סיסמת QA נחשפה בצילום מסך בצ'אט | B- חדש (security, T3) · או מיזוג ל-B-275 ⓐ | B-275 ⓐ כבר מכיל «להחליף סיסמת QA + gh secret set» — אבל שם זו הכנה לסנטינל, כאן זו **חשיפה**. אבטחה ⇒ פריט עצמאי עם NIV-ACTION. ⚠️ 10 ימים ⛔ טופל (לפי הרישום). |
| 3 | 20.09 | 10 | sentinel.yml ⛔ ירה 8 סלוטים רצופים | M- (שושלת M-010) | זו **מדידה** של ביצוע מול תזמון — הבית שלה הוא M-010 (שפג), ⛔ משימה חדשה. B-275 כבר מחזיק את התיקון. |
| 4 | 21.09 | 9 | בתור: npm run test:auth — הכנת תנאים ל-7 C- חסומים | B- חדש (ממוזג עם שורת 22.09) | משימת תכנון שפותחת 7 בדיקות (C-046·049·050·052·053·056·057) — ⚠️ 3 מהן (C-052 · C-053 · C-057) חוסמות 6 פריטי DONE-SILENT בדוח הזה (§4.3). ממוזג עם «probe:eye בחניה». |
| 5 | 21.09 | 9 | triage.yml ⛔ מאזין ל-Sentinel | B- חדש (monitoring) | פער מוגדר עם תנאים (ירוק⇒אדום בלבד · ציטוט מהלוג · אחרי ⓕ). תלוי B-275. |
| 6 | 21.09 | 9 | מעקב B-318 — לבדוק ב-N≥50 ריצות | שדה סגירה ב-B-318 + M- חדש | זה מדד-הסגירה של B-318 (שהדוח מסווג DONE-SILENT בקוד). הספירה היא מדידה ⇒ M-. ⚠️ השאלה «N=12 מספיק?» בגיליון ההכרעות. |
| 7 | 24.09 | 6 | מספר הון לא-עגול הופיע לרגע בכניסה ראשונה | DECISIONS (נדחה עד שחזור) + תנאי ב-CHECKS | השורה עצמה קובעת «⛔ נפתח B-» (תצפית יחידה, ⛔ שוחזרה). כדי שלא תחיה בזיכרון: שורת DECISIONS «נדחה עד שחזור» + תנאי-גלישה ב-CHECKS «אם חוזר — צילום + Network». |
| 8 | 22.09 | 8 | probe:eye בחניה — הסיסמה המקומית מחזירה invalid_credentials | ממוזג ל-B- של שורת 21.09 | אותה משימה (test:auth). החסם — סיסמת QA מקומית — זהה לשורת 20.09 ⇒ שלוש השורות נפתרות ע״י פעולה אחת של ניב. |
| 9 | 30.09 | 0 | מדידה חוזרת בפרודקשן: M-002 ו-M-009 | M- (עדכון במקום + שושלת) | מדידה, ⛔ משימה. השאילתות כבר כתובות בשורה ⇒ NIV-ACTION של 2 דקות. |

⛔ הטריאז׳ **⛔ בוצע** — הצעה בלבד. שורה 10 (דוח זה) נוספת ב-INBOX באותו קומיט (§13 כאן).

---

## 12 · METRICS שפגו — 14/20 מדדים פעילים

חישוב זהה ל-`test:registry` §12.4 (נמדד + תוקף מול 30.09). **אי-התאמה בין מחרוזת לחישוב: 0** — כל 14 הפגים מוכרזים `⏳ פג`, ו-0 מהטריים מוכרזים פגים.

| # | מדד | גיל | תוקף | מקור | מה צריך כדי למדוד מחדש |
|---|---|---|---|---|---|
| 1 | `M-019` | 25 | 14 | Supabase | ה-SELECT האגרגטיבי ב-AUDIT-2026-09-04-b185-live-fallback.md Q4 (SQL Editor, read-only) |
| 2 | `M-001` | 28 | 14 | Supabase | SELECT count(*) FROM auth.users |
| 3 | `M-002` | 15 | 14 | Supabase | השאילתה כלשונה ב-INBOX 30.09 |
| 4 | `M-003` | 24 | 14 | Supabase | scripts/retention.sql §3 כלשונו — ⚠️ זה גם B-010 ו-B-289 |
| 5 | `M-006` | 36 | 14 | צילום ניב | צילום דשבורד TwelveData Usage |
| 6 | `M-007` | 32 | 30 | ריפו | npm run test:registry — שורות §8.1/§8.6 (Code יכול, ⛔ דורש ניב) |
| 7 | `M-008` | 34 | 30 | דפדפן | Playwright + measure.mjs/classify.mjs מול dist — Code יכול בסשן עם דפדפן |
| 8 | `M-009` | 15 | 14 | Supabase | השאילתה כלשונה ב-INBOX 30.09 |
| 9 | `M-010` | 10 | 7 | gh api | gh api …/actions/workflows/sentinel.yml/runs — Code עם הרשאת Actions |
| 10 | `M-011` | 20 | 7 | Supabase | SELECT מצטבר על public.trades.createdAt + auth.users (active_30d) |
| 11 | `M-012` | 16 | 7 | gh | gh run list --workflow=<wf> --json createdAt,event (event==schedule) |
| 12 | `M-013` | 16 | 3 | ריפו | grep -c "¦ פתוח ¦" docs/BACKLOG.md — נמדד בדוח הזה: 250 (מחרוזת מדויקת) · 267 OPEN מנורמל |
| 13 | `M-015` | 17 | 14 | ריפו | grep -oIh "text-\[\([0-9]*\)px\]" SwingEdge_App.jsx ¦ sort ¦ uniq -c |
| 14 | `M-017` | 28 | 14 | gh | gh run list --workflow=sentinel.yml --limit 400 --json createdAt,conclusion,event ¦ jq |

⇒ **3/14 ניתנים למדידה מהריפו בידי Code** (M-007 · M-013 · M-015) · 3/14 דרך gh (M-010 · M-012 · M-017) · 7/14 דורשים Supabase (ניב) · 1/14 צילום ניב.

---

## 13 · יתומים מוצריים + סטייה מ-§10.1

| # | מקור | רעיון | מצב | ראיה |
|---|---|---|---|---|
| 1 | MASTER_PLAN 1.5 | Lighthouse CI שבועי (🔵 בתור) | יתום | grep -i lighthouse = 0 פריטי B- · 0 workflows (ls .github/workflows) |
| 2 | MASTER_PLAN 2 | PWA (🔵) | יתום | B-365 מזכיר PWA רק כצעד בדיקה; אודיט המובייל קיים (MOBILE-UX-AUDIT-2026-07-15) |
| 3 | MASTER_PLAN 5 | Weekly Recap מנתוני Market Overview · glossary posts (⏸️) | יתום | grep recap תפס רק «recapture» (B-158/B-160/B-307) — ⛔ התאמה |
| 4 | MASTER_PLAN #6 | הדרכת ציור Long/Short Position tool + צילום ×5 שפות (מוצר — פתוח) | יתום | grep «Long/Short¦Position tool¦הדרכת ציור» = 0 |
| 5 | ניב (index.md) | גילוי פיצ'רים לפי טאב | יתום | grep «גילוי פיצ׳ר¦feature discovery¦לפי טאב» = 0 פריטי B-; ⚠️ index.md ⛔ קיים בריפו ⇒ המקור היחיד הוא הודעת ניב |
| 6 | MASTER_PLAN 3 | שרשרת סוכנים (Sentry→Issue → Digest → Auto-Fix → …) | מכוסה חלקית | 19 workflows קיימים (daily-digest·triage·arch-auditor·…) — «Auto-Fix»/«Improvement»/«Recap» ⛔ קיימים ו⛔ B- |
| 7 | MASTER_PLAN + | Rate limiting על /api/quote + /api/ocr | מכוסה | B-040·B-219·B-179 (אשכול K12) |
| 8 | MASTER_PLAN + | RLS audit | מכוסה | B-199·B-200·B-221 (K19) |
| 9 | MASTER_PLAN 4 | Waitlist · GA4 · Stripe | מכוסה | B-051/B-106 · B-097/B-099 · B-092/B-133/B-135 |
| 10 | Master-Tasks M1–M10 | ידני-ניב (PR#44 · קבצי יצחק · ערכת OCR · Stripe · Search Console · עו״ד · Workspace · QA מובייל) | מכוסה | B-087 · B-048/B-114 · B-093 · B-092 · B-135 |
| 11 | Master-Tasks M3 | דוח Architecture Auditor — 14 ממצאים | מכוסה חלש | B-028…B-033 (ממצאי הסורק) — ⚠️ «14 ממצאים» עצמם ⛔ ממופים 1:1 |
| 12 | Master-Tasks S2/S3 | אכיפת CSP + JWT ל-feedback/waitlist · npm audit/hooks | מכוסה | B-003/B-222 · B-056 (DONE-SILENT) · B-228/B-380 |
| 13 | Master-Tasks | שבוע הבנת משתמשים — «מה עצר אותך?» | מכוסה | B-007 · B-088 · B-011 |
| 14 | Master-Tasks | B1 Multi-Account · ₪/Stripe Pro gates · Track A לנדינג V2 | מכוסה | B-132 · B-133 · B-134 |
| 15 | Master-Tasks T10 | המרת מטבע אמיתית | סגור | B-129 (מצבה → D-040) |

**5 יתומים** (⛔ B- מקביל). ⚠️ `docs/MASTER_PLAN.md` עודכן לאחרונה ב-05.07 (`ea7d671`) — **87 יום**; `SWINGEDGE_MASTER_PLAN.md` ⛔ קיים. `SwingEdge-Master-Tasks.md` נמחק ב-`2382a98` (13.08) ונקרא מ-`2382a98^`. `docs/NEXT.md` עודכן ב-`1f991f3` (28.09); שלושת פריטיו (B-185 · B-318 · B-275) נושאים B-.

**סטייה מ-§10.1 (מוצהרת):** §10.1 מחייב שורה ב-`docs/STATE.md` לכל ממצא. `wc -c docs/STATE.md` = **15,976/16,000** בתים ⇒ 24 בתים פנויים, פחות מ-300 שנדרשו לשורה. ⇒ **שורה אחת ב-`docs/INBOX.md`** שמצביעה לדוח הזה; הטריאז׳ שלה בסשן הבא הופך את הממצאים ל-B-/M-/DECISIONS. ⛔ נגיעה ב-STATE.

---

## 14 · בקרת איכות

**a · אימות מכני לראיות של כל פריט שאינו LIVE:** 138/138 עברו (לפני תיקוני QA) — כל hash עבר `git cat-file -e <h>^{commit}`, כל `file:N` קיים ו-N ≤ אורך הקובץ ב-HEAD, ולכל DONE-SILENT יש hash + ref, לכל DUPLICATE `dup_of`. ⚠️ המבחן המכני **⛔ מוכיח שהתיקון נכון** — רק שהראיה קיימת; את זה בודקת הדגימה.

**b · דגימה** (seed = `69608b6`, מיון לפי sha256(id+HEAD), k = max(5, ⌈10%⌉) או כל המחלקה אם קטנה):

| מחלקה | אוכלוסייה | נדגמו | החזיקו | פירוט |
|---|---|---|---|---|
| DONE-SILENT | 20 | 5 | **5/5** | B-166 (`a0ee59e`, sentinel.yml:77 בלי --with-deps) · B-136 (`2491c86`, :3033 `date: todayKey()`) · B-336 (:6501-6505 סינון Unknown) · B-350 (:1381 saveSettings) · B-351 (data-tour="add-trade" פעם אחת, :8603) |
| DUPLICATE | 2 | 2 | **2/2** | B-123→B-005 (אותה חשיפה ×101.55) · B-280→B-260 (אותו מדד סגירה) |
| SUPERSEDED | 1 | 1 | **0/1** ⛔ | B-273: DECISIONS.md:195 אומר «B-273 **נשאר פתוח ומצומצם**» ⇒ ההכרעה ⛔ מייתרת אותו |
| OBSOLETE | 0 | 0 | — | — |

**SUPERSEDED < 90% ⇒ עצירה ותיקון שיטה:** הכלל חודד — «הכרעה שעונה על שאלה בפריט» ≠ «הכרעה שמייתרת את הפריט»; SUPERSEDED דורש ציטוט שה**פריט** נסגר/בוטל. הורץ מחדש על כל המחלקה (1/1) ⇒ B-273 הורד ל-STALE-EVIDENCE. **SUPERSEDED אחרי תיקון: 0.**

**c · מדגם שלילי** (20 LIVE בלי אותות s1–s4, אותו seed): B-238 · B-023 · B-231 · B-019 · B-198 · B-212 · B-015 · B-028 · B-344 · B-227 · B-043 · B-055 · B-189 · B-263 · B-204 · B-197 · B-138 · B-024 · B-365 · B-032. **1/20 היה בעצם DONE-SILENT: `B-365`** (קוד תוקן ב-`5a97a37`, סגירה חסומה על C-059 ⓸). **1 < 2 ⇒ המעבר המכני מספיק.** אבל זו **אי-עקביות בין סוכנים** (batch 7 סיווג מקרים זהים — B-336/B-338/B-350…B-353 — כ-DONE-SILENT) ⇒ נסרקה כל האוכלוסייה לדפוס «תוקן בקוד + ממתין לבדיקה»: 4 פריטים נוספים (B-185 · B-295 · B-301 — נשארה עבודה בקוד/DB, נשארו; B-365 — הועבר).
   נבדקו בקוד ונמצאו חיים: B-019 (`fmtPrice(null)` ⇒ `Number(null)=0` ⇒ «$0», utils.js) · B-015 (:7240-7246 בלי resize/שומר) · B-197 (AdminPanel.jsx:86-90 escape בלי נטרול =,+,-,@) · B-024 (`profile.commission` רק ב-OnboardingScreen.jsx:510) · B-238 (index.html:55-56) · B-204 (tradingStats.js:163-170 `: 0`) · B-189 (TradeDNA.js:96 `discipline: 50`) · B-023 (:2465 `equityBase`).

**תיקון QA נוסף (מחוץ לדגימה):** `B-324` → DUPLICATE של `B-257` — אותר ע״י סוכן batch 4 מחוץ ל-batch שלו, אומת בקריאת שתי השורות.

**d · עקביות:** 0 פריטים שהם גם באשכול וגם במחלקה סגורה (DONE-SILENT/DUPLICATE/SUPERSEDED/OBSOLETE). 0 פריטים בשני אשכולות. 0 אשכולות >12.

**e · ספירה:** 53 + 10 + 11 + 314 = 388 ✓ · Σ מחלקות הפתוחים = 314 = 314 ✓ · CHECKS 63 = 63 ✓.

**f · סחיפה:** כל מספר שורה בדוח נמדד על `69608b6`; ערכי «נכתב» מסומנים. 77/314 פריטים נושאים `line-drift a→b` בשדה notes (סחיפה של מפנה ⛔ נושא-משקל, ⛔ STALE).

**g · אחוזים:** כל % בדוח מלווה מונה/מכנה/אוכלוסייה (נבדק ב-grep '%').

**h · תיקון parser במהלך העבודה:** תאריך הפתיחה נגזר תחילה מה-DD.MM **האחרון** בתא «מקור+תאריך» ⇒ `B-282` קיבל 2026-01-10 (סוכן batch 4 תפס). תוקן ל-**המוקדם** מבין תאריכים ≤ היום בחודשים 07–09, והוחרג `§13.7` (B-318 קיבל 13.07). אחרי התיקון: 0/388 גילים חריגים (<0 או >70).

---

## 15 · מגבלות וממצאים סביבתיים

**מה ⛔ נמדד:**

- ⛔ DB/פרודקשן/קונסולות — כל UNMEASURABLE (19) ו-7/14 מדדים פגים.
- ⛔ `npm run build`/`npm audit` בזמן הסיווג — B-032 (גודל באנדל) ו-B-228 (audit) ⛔ נמדדו מחדש; `node_modules` ⛔ קיים בזמן הסיווג ⇒ B-137 (round-trip CSV) נבדק רק ברמת מיפוי כותרות (9/23).
- **גדלים (S/M/L)** — מהמרשם, ⛔ נמדדו; כל הציונים יורשים את אי-הדיוק.
- **U2/U3** נקבעו מקריאת קוד + `file:line` מאומת, ⛔ מדפדפן. ⇒ «היום» פירושו «הקוד ב-HEAD עושה את זה», ⛔ «משתמש נצפה».
- **סיווג עמוק בוצע ע״י 8 סוכני-משנה** (batch לפי גודל בבתים); כל טענה שאינה LIVE אומתה מכנית (§14a) ודגומה (§14b). LIVE ⛔ אומת אחד-אחד מעבר למדגם השלילי.
- **`unblocks`** — רק 13/314 פריטים נושאים תלות מכנית; תלויות בפרוזה ⛔ נגזרו.
- **CHECKS TRIGGER-PENDING** הוכחו ב-git log על טוקנים/קבצים נבחרים; תנאים כמו «כל גל שנוגע במספר» ⛔ ניתנים ל-grep מלא.

**ממצאים סביבתיים (§11 — ⛔ תוקנו):**

1. `scripts/daily-digest.mjs:451` — `gatherCi().catch(() => [])` ⇒ ה-API נופל ⇒ הדיג׳סט מציג «אין CI» בשקט ‹R-2›. ⛔ פריט.
2. `SwingEdge_App.jsx:2823` — `targetN = parseFloat(form.target) || 0` נשמר כ-`target: targetN` (:3049) ⇒ target ריק נשמר כ-0 ‹R-2›. מכוסה ע״י B-299 (K4), ⛔ אומת בדפדפן.
3. `test:registry` §338 (מצבה תלויה) ⛔ רואה 10 שורות ✅ בפורמט חריג (§4.1).
4. `docs/STATE.md` — שורת HEAD מצהירה `febe330` בזמן ש-`fd17b5a` ו-`69608b6` (30.09) ערכו את הקובץ — `B-371` מתרחש עכשיו.
5. `B-286` ממתין ל-`D-063` שכבר קיים (DONE.md:93) ⛔ מזכיר את התיקון שהפריט צריך.
6. `B-201` — ההנחה «כשל טעינה שומר נתוני דמו» שגויה: `MOCK_TRADES = []` (:309) מאז `efa50df` (28.03).
7. `B-370` — ההנחה «אף אחד ⛔ מודד ש-fleet-daily רץ» שגויה: `watchdog.yml:51` בודק אותו מול סף 30 שעות.
8. `B-362` — 4 מאזיני `onAuthStateChange` (⛔ 2): main.jsx:140 · SwingEdge_App.jsx:1313 · useSupabaseSession.js:22 · AdminPanel.jsx:322.

---

## 16 · נספח — פקודות

```bash
git pull --ff-only origin main   # Already up to date · HEAD 69608b6
git config core.hooksPath .githooks && chmod +x .githooks/*   # לא היה מוגדר ב-clone הזה (§6)
git fetch --unshallow origin main   # ה-clone היה shallow (60 commits) ⇒ 907
git log --all --format='@@%h|%cs%n%B' > gitlog.txt   # אינדקס s5
node passA.mjs    # מעבר A: פירוק 388 שורות, נרמול, אותות s1–s6
node merge.mjs    # מיזוג 8 פלטי סוכנים + אימות מכני §14a
node fix.mjs      # תיקוני QA (B-273 · B-365 · B-324)
node analyze.mjs  # אשכולות · ציונים
node gen.mjs      # הדוח + ה-JSON
```

הסקריפטים חיים ב-scratchpad של הסשן (⛔ בריפו, לפי הפרומפט). sha256 של הפלטים:

| קובץ | sha256 |
|---|---|
| passA.json | `cdf3d3fa721628a24e60a9f27213eba740ff46594bf1de482bb9b4c814710e71` |
| status.json | `42ed76e69b2512bbbad4acda01136000b76530df20dc5ed21c8bb8087cb8a755` |
| merged.json | `2ece0713f1dcf0568285c3b820fbb4366018534ec7bacee5c7ce82bb1869a284` |
| merged2.json | `92bbcb25b2277c58076ed81f9b9ae1e1ff275775cca6d7672903a968e5b9592e` |
| analysis.json | `ffe45d44215d8c565c479922ad92a0181b31b691feee2dfd2181ff5f492604ed` |
| audit11a.json | `559fa2579d544fa740a3f08ebc2c6ee071d70f8d094c1f2b7f9beb3e5979d315` |
| out1.json | `c094db1e7b54054df8c0636f22ee66c5627567baf6d3515c757287404326a2a9` |
| out2.json | `a46c04b31ca23a2c9e34f2303fa9195552999fda889557b5cb1216926d731343` |
| out3.json | `826cf95caeaf8237de9b33bab88c7426e3bf8c68539a11ea2621652337fde264` |
| out4.json | `b8f7dd0f4ab536e8f050c4b3487adb39b80ff3eb68bedec6310dc90e06cb9e4e` |
| out5.json | `5717d7f0d6d997fd72d3332975216fcad2e53bac7cb965c8d2e47bbbe574c116` |
| out6.json | `20287742c767313de7def4cbc2c11a63e1f5dd6726d4cfcc61e58c03aee2ead9` |
| out7.json | `330a727728b40011b1a1d177edcc1b998d53e94d733b51ba5eb86865df9d0c95` |
| out8.json | `8e5659603e19ca2482269a626be6c45b5e591c4511ab4c4c8ee21af2f6b761ff` |

