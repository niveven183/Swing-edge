# PLAN 2026-09-27 — עדכון אבטחה ממוקד: `browserslist` · `nanoid` · `nodemailer`

**שלב 1 (מדידה) — ✅ הושלם 27.09, לפני התכנון.**
**שלב 2 (תכנון) — ממתין לביקורת ניב. ⛔ אפס קוד נכתב · ⛔ אפס `npm install` · ⛔ אפס נגיעה ב-lock.**

**שער בטיחות:** `git pull origin main` ⇒ `Already up to date.` · `git status --porcelain` ⇒ ריק ·
`HEAD = c3f05ce`. תואם למה שניב הצהיר.

**רמה: `T3` · תשובות: לא/לא/כן/כן/נמדד.**
Q1 הפיכות — לא (`git revert` על קומיט אחד; `npm ci` משחזר). Q2 אמון — לא (⛔ מספר פונה-משתמש).
**Q3 אבטחה — כן** (advisories + מסלול המייל ב-`api/`) ⇒ **טריגר-יחיד**. Q4 רוחב — כן
(`package.json` + `package-lock.json`; `browserslist` הוא מודול שכל שרשרת ה-CSS תלויה בו).
Q5 ודאות — נמדד בגל הזה.
⚠️ **יש משטח מושפע** (הבאנדל הנפרס + פלט ה-CSS) ⇒ האימות הוא `smoke.yml` + hash חדש +
`SENTRY_RELEASE` + **אימות-עין**, ⛔ «אומת-מקור» לבד.

**הכרעות ניב 27.09 (נכנסות לגל הזה):**
1. **`B-373`** — המיטיגציה היא **embed דיסקורד כש-`channels delivered < N/N`**. ⛔ בודק-SMTP יומי.
   ⛔ מיושמת בגל הזה — **נרשמת כהכרעה בגוף `B-373`**.
2. **`PR #49`** — **מיזוג ממוקד**, ⛔ מלא. ⇒ הגל הזה מיישם את ה-`3` תיקונים **בלי** ה-PR.

---

## חלק א' — מדידה (שלב 1, הושלם)

### א.1 לכל תלות: ישירה/טרנזיטיבית · מי מושך · מינימום שסוגר

| תלות | סוג | מי מושך (טווח מוצהר) | נוכחי | **מינימום שסוגר** | קפיצה | major? |
|---|---|---|---|---|---|---|
| `browserslist` | טרנזיטיבית | `autoprefixer@10.5.4` (`^4.28.6`) · `@babel/helper-compilation-targets@7.29.7` (`^4.24.0`) דרך `@vitejs/plugin-react` | `4.28.6` | **`4.28.7`** | patch | ⛔ |
| `nanoid` | טרנזיטיבית | `postcss@8.5.21` (`^3.3.16`) | `3.3.16` | **`3.3.18`** | patch | ⛔ |
| `nodemailer` | **ישירה** (`^9.0.3`) | — | `9.0.3` | `9.1.0` ל-high · **`9.1.1`** לכל הארבע | minor | ⛔ |

⇒ **אין major באף אחת ⇒ ⛔ STOP לאף תלות.**

**ה-advisories המדויקות** (נקראו מ-`npm audit --json`, ⛔ מהזיכרון):

| תלות | חומרה | GHSA | טווח פגיע | תוכן |
|---|---|---|---|---|
| `browserslist` | **HIGH** | `GHSA-c83g-rgw3-j3cx` | `<=4.28.6` | גידול זיכרון בלתי-חסום (ללא פינוי cache) ⇒ OOM |
| `browserslist` | **HIGH** | `GHSA-73wf-gq98-2v4g` | `<=4.28.6` | קריסה / כתיבת prototype דרך `browserslist-stats.json` לא-מהימן (`normalizeStats`) |
| `nanoid` | **HIGH** | `GHSA-2v37-7h3g-55p8` | `<3.3.18` | גנרטור מותאם נכנס ללופ אינסופי כש-`size` הוא `0` |
| `nodemailer` | **HIGH** | `GHSA-2x7j-588g-ccc2` | `<9.1.0` | סיבוכיות ריבועית `O(n²)` ב-`addressparser` ⇒ DoS דרך **רשימת כתובות** ממולכדת |
| `nodemailer` | moderate | `GHSA-wmmp-3585-3rmp` | `<9.1.0` | עקיפת allow-list דומיינים דרך IDN/Punycode |
| `nodemailer` | moderate | `GHSA-cc9r-2j5m-2m83` | `>=6.9.16 <9.1.0` | עקיפת ולידציית דומיין-נמען דרך פירוש-שגוי של הערת RFC 5322 |
| `nodemailer` | moderate | `GHSA-8m3c-c648-2xjj` | `<=9.1.0` | `resolveContent()` עוקף `disableFileAccess`/`disableUrlAccess` בחתימה מדור-קודם |

⚠️ **`9.1.1` ולא `9.1.0`** — `GHSA-8m3c-c648-2xjj` הוא `<=9.1.0`. `9.1.1` הוא patch מעל,
**אפס תלויות**, וסוגר `4/4`. הוא **במקרה** גם ה-`latest` של nodemailer — מצוין במפורש כדי
שלא ייקרא כ«latest רפלקסיבי», שנאסר.
⚠️ **`4.28.7` ולא `4.29.0`, ו-`3.3.18` ולא `3.3.19`** — `4.29.0`/`3.3.19` הם היעדים של
**Dependabot** ב-`PR #49`, ⛔ המינימום. `latest` הוא `browserslist 4.29.1`.

🔴 **תיקון ל-`B-378`:** הגוף שנרשם ב-`BACKLOG` ב-`c3f05ce` הציג «שתי אזהרות ה-nodemailer הן
עקיפת ולידציה של דומיין-נמען» כ**החומרה הקונקרטית** שמצדיקה את דחיפות ה-`3 high`. נמדד:
שתי עקיפות הדומיין הן **moderate**, וה-**high** היחיד ב-nodemailer הוא ה-DoS ב-`addressparser`.
הטענה ⛔ שקרית — היא **שויכה לחומרה הלא-נכונה**. מתוקן בשורת הסגירה, ⛔ נמחק.

### א.2 `nodemailer` — נטען בזמן ריצה בפרודקשן?

**כן.** `api/notify.js:42` (`import nodemailer from "nodemailer"`, `:507 createTransport`,
`:518 sendMail`) · `api/send-invites.js:21` (`:232 createTransport`, `:245 sendMail`) —
שתי פונקציות serverless ב-Vercel.
⛔ **בבאנדל הלקוח:** `grep -rn nodemailer src/ SwingEdge_App.jsx` ⇒ `0` התאמות.
**`dawidd6/action-send-mail@v3` — `9` אתרים** ב-`.github/workflows/` (`analyst` · `arch-auditor` ·
`daily-digest` · `data-guardian` · `failure-alert` · `triage` · `restore-drill` ×2 ·
`user-analytics`). זהו action **נפרד** שנושא nodemailer **משלו** ⇒ הגל הזה ⛔ נוגע בו,
וגם **⛔ מתקן אותו**. ניב היה צודק בהבחנה.

⚠️ **אבל מסלול התקיפה של ה-high ⛔ נגיש בצורה הנוכחית — נמדד, ⛔ הונח:**

| מה נמדד | איפה | למה זה חוסם את `GHSA-2x7j-588g-ccc2` |
|---|---|---|
| `to:` הוא **כתובת אחת**, ⛔ רשימה | `notify.js:521` · `send-invites.js:248` | ה-advisory דורשת **רשימת כתובות** ממולכדת כדי להשיג `O(n²)` |
| הכתובת מגיעה משורת DB | `notify.js:439 row.user_email` · `send-invites.js:216` מ-RPC | ⛔ קלט חופשי מהרשת |
| regex נוסף על הנמען | `notify.js:440` `/^[^@\s]+@[^@\s.]+\.[^@\s]+$/` | אוסר רווחים ⇒ אוסר את צורת הרשימה |
| `from`/`replyTo` מ-env | `notify.js:519-520` · `send-invites.js:246-247` `MAIL_USERNAME` | ⛔ קלט משתמש |
| שער `Bearer` + RPC אדמין | `notify.js:143-156` · `send-invites.js:45-58` | הקריאה ⛔ אנונימית |

ושלוש ה-moderate נוגעות ל-**allow-list של דומיינים** — שהאפליקציה **⛔ מחזיקה**.
⇒ **המצב המדויק: נטען בפרודקשן · חומרה מעשית נמוכה · התיקון זול (minor, אפס תלויות)** ⇒
מתקנים, ו⛔ מתארים אותו כ«חור פעיל».

**`browserslist` + `nanoid`:** `grep -rn 'nanoid\|browserslist' src/ api/ scripts/ SwingEdge_App.jsx`
⇒ `0` התאמות ⇒ **build-time בלבד** (autoprefixer · postcss · babel) ⇒ אזהרותיהן
**⛔ מגיעות לזמן ריצה בפרודקשן**; החשיפה היא מכונת ה-build.

### א.3 שיטה — `overrides` אושר במדידה, ⛔ הונח

`npm update browserslist nanoid --dry-run` **נמדד**, ומזיז **11 חבילות**:

```
change update-browserslist-db 1.2.3 => 1.3.3
change react-router 7.18.1 => 7.18.2
change react-router-dom 7.18.1 => 7.18.2
change postcss 8.5.21 => 8.5.25
change node-releases 2.0.51 => 2.0.57
change nanoid 3.3.16 => 3.3.19
change electron-to-chromium 1.5.389 => 1.5.439
change caniuse-lite 1.0.30001806 => 1.0.30001812
change browserslist 4.28.6 => 4.29.1
change brace-expansion 5.0.8 => 5.0.9
change baseline-browser-mapping 2.10.42 => 2.11.26
```

⇒ **מפיל את STOP #4** (`react-router*` · `postcss` · `brace-expansion` אינן «3 החבילות ותלויותיהן
הישירות»), **ומגיע ל-`4.29.1`/`3.3.19`** = latest, ⛔ מינימום.
⇒ **הכרעת `overrides` של ניב אושרה במדידה.** ⛔ `npm update`, ⛔ `npm audit fix --force`.

⚠️ **הצורה חייבת להיות pin מדויק:** `overrides: {"browserslist": "^4.28.7"}` מתרסל ל-`4.29.1`
היום (npm בוחר את הגבוה המספק) ⇒ «latest» בתחפושת. לכן **`"4.28.7"` · `"3.3.18"` בדיוק.**
⚠️ **וטווחי ההורים כבר מקבלים את היעדים** — `autoprefixer ^4.28.6 ⊇ 4.28.7` ·
`@babel/helper-compilation-targets ^4.24.0 ⊇ 4.28.7` · `update-browserslist-db` peer
`>= 4.21.0 ✓` · `postcss ^3.3.16 ⊇ 3.3.18` ⇒ ה-override **⛔ כופה רזולוציה מחוץ לטווח**
ו⛔ שובר peer. הוא מקדם לתוך טווח שההורה **כבר הצהיר שהוא מקבל**; ה-lock פשוט היה מיושן.

🆕 **חוב שנולד מהשיטה ⇒ `B-380` ‹R-4›:** pin מדויק הוא **קפוא לנצח** ו**⛔ שער רואה את
התיישנותו** — ביום ש-`4.28.9` תסגור אזהרה חדשה, ה-override ימשיך להחזיק את `4.28.7`
**בשקט**. הנימוק ייכתב במפתח **top-level `"//overrides"`**, בתקדים `"//react-router-dom"`
(`//` בתוך אובייקט `overrides` היה נקרא כ**שם חבילה**, בדיוק כמו ה-`EINVALIDPACKAGENAME`
שההערה הקיימת מתעדת).

`nodemailer` ישירה ⇒ `npm install nodemailer@9.1.1`.
**שתי העריכות מתמזגות לכתיבת lock אחת:** מוסיפים `overrides` ל-`package.json`, ואז
`npm install nodemailer@9.1.1` מרנדר מחדש את כל העץ ⇒ `1` diff, ⛔ `2`.

### א.4 diff צפוי ב-`package-lock.json` — **5 חבילות בדיוק**

מחושב מ-`npm view browserslist@4.28.7 dependencies` מול המותקן בפועל:

| חבילה | מ | ל | מדוע מותרת |
|---|---|---|---|
| `browserslist` | `4.28.6` | `4.28.7` | **יעד** |
| `nanoid` | `3.3.16` | `3.3.18` | **יעד** |
| `nodemailer` | `9.0.3` | `9.1.1` | **יעד** |
| `electron-to-chromium` | `1.5.389` | `≥1.5.393` | תלות **ישירה** של `browserslist@4.28.7` (`^1.5.393`), טווח ⛔ מסופק כרגע |
| `baseline-browser-mapping` | `2.10.42` | `≥2.10.44` | תלות **ישירה** של `browserslist@4.28.7` (`^2.10.44`), טווח ⛔ מסופק כרגע |

**⛔ אמורות לזוז** (הטווח החדש מסופק ע"י המותקן): `caniuse-lite` (`^1.0.30001806` = `1.0.30001806`) ·
`node-releases` (`^2.0.51` = `2.0.51`) · `update-browserslist-db` (`^1.2.3` = `1.2.3`).

⚠️ **סחיפה קיימת-מראש (§11, ⛔ המשימה):** `node_modules/react-router-dom` = `7.18.1` בזמן
שה-**lock** אומר `7.18.2` ⇒ `npm install` יסנכרן את `node_modules` ו**⛔ את ה-lock**.
🔴 **אם שורת ה-lock של `react-router*` תזוז ⇒ STOP ודיווח** — הנעיצה המוצהרת ב-`package.json`
היא הסיבה שהקובץ נושא הערה בת-פסקה.

⇒ **חבילה שישית כלשהי ⇒ STOP ודיווח, ⛔ המשך.**

### א.5 צפי `npm audit` אחרי

**לפני (נמדד):** `{"info":0,"low":1,"moderate":1,"high":3,"critical":0,"total":5}`

**אחרי (צפי):** `high: 0` ⇒ **`3/3` ה-highs שבגדר נסגרו**. **נשארות:**

| חבילה | חומרה | למה נשארת |
|---|---|---|
| `baseline-browser-mapping` | moderate | הטווח הפגיע `>=2.0.0 <2.11.0`; `browserslist@4.28.7` מצהיר `^2.10.44` ⇒ `2.10.x` **עדיין בתוך הטווח**. סגירה דורשת `browserslist 4.29.x` (המצהיר `^2.11`) ⇒ **מחוץ לגדר** |
| `postcss-selector-parser` | low | `>=6.1.0 <6.1.3`, ⛔ קשורה ל-`3` |

⇒ `total: 2`. **⛔ מטופלות בגל הזה — נרשמות ב-`B-380`.**
⚠️ **ולכן ⛔ לקרוא את הפלט כ«audit נקי»** — הקריטריון של ניב הוא «`3 high` ⇒ `0` מהשלוש»,
ו«`0` פגיעויות» הוא משפט אחר שאינו נכון.

---

## חלק ב' — §8 רמה 2 (הפילטר תפס: נוגע במיילים · רץ אוטומטית בפרודקשן)

| ציר | הערכה |
|---|---|
| משתמשים | ⛔ שינוי התנהגות מכוון. `nodemailer 9.0→9.1` זז ב**מסלול המייל היוצא** ⇒ סיכון רגרסיה אמיתי (הצרכן היחיד הוא `sendMail` בחתימה יציבה). `browserslist` מזיז את **יעדי ה-autoprefixer** ⇒ **פלט CSS עשוי להשתנות** |
| נתונים | ⛔ DB · ⛔ מיגרציה · ⛔ סכימה |
| עלות | `0` — patch/minor מה-registry |
| תקרות ספק | ⛔ נוגע |
| אבטחה | **זו המשימה.** `3` high נסגרות; `2` נותרות **מוצהרות** |
| תחזוקה | ⚠️ **מוסיף `2` pins מדויקים** שדורשים ביקור אנושי ⇒ `B-380`, ⛔ הערה בדיווח (§10.1) |
| הפיכות | `git revert` על קומיט אחד; `npm ci` משחזר את `node_modules` |
| כשל שקט | 🔴 **הסיכון האמיתי:** CSS שזז מ-autoprefixer **⛔ מפיל `verify` ו⛔ `build`** — `33` החוליות ⛔ מרנדרות CSS. זה נראה **רק בעין**. ⇒ **אימות-עין הוא חלק מהגל, ⛔ תוספת** |

**פסק דין: ⚠️ בצע עם הגנה.**

---

## חלק ג' — צעדי הביצוע

| # | צעד | תנאי עצירה |
|---|---|---|
| 0 | **הקובץ הזה** + קומיט `docs(plan): …  — awaiting approval` + push + **עצירה** | ⛔ npm · ⛔ קוד · ⛔ workflows |
| 1 | `npm audit` לפני ⇒ נשמר לדיווח | — |
| 2 | עריכת `package.json`: `overrides {browserslist:"4.28.7", nanoid:"3.3.18"}` + `"//overrides"` top-level | — |
| 3 | `npm install nodemailer@9.1.1` | — |
| 4 | `git diff --stat package-lock.json` + רשימת החבילות שזזו | **`> 5` חבילות** או **`react-router*` בשורת lock** ⇒ **STOP** |
| 5 | `npm audit; echo "EXIT=$?"` — **חשוף** | `high != 0` ⇒ STOP |
| 6 | `npm run verify > /tmp/v.txt 2>&1; echo "EXIT=$?"` — **חשוף** (⛔ pipe, `INCIDENTS#25`) | `EXIT != 0` ⇒ STOP. פלט מלא מודבק |
| 7 | קומיט `fix(deps): security — browserslist · nanoid · nodemailer (3 high, targeted)` · `git push origin main` (רגיל, ⛔ force) | push ללא `..HEAD -> main` ⇒ ⛔ «סיימתי» (§5.4) |
| 8 | אימות פריסה: `smoke.yml` ירוק · hash באנדל **חדש** · `SENTRY_RELEASE = HEAD` · **אימות-עין** על ה-CSS (`T3`) | כשל ⇒ דיווח, ⛔ המשך לרישום |
| 9 | `gh pr comment 49` — האבטחה טופלה בנפרד (עם ה-hash), השאר ממתין | **⛔ `gh pr close`** |
| 10 | קומיט רישום **נפרד** (ראה חלק ד') + `npm run test:registry` **חשוף** + push | `EXIT != 0` ⇒ STOP |

**⛔ בגל הזה:** העלאות Sentry · Supabase · Playwright · react-router · `npm audit fix` (בכל צורה) ·
קוד מוצר · `.github/workflows/` · סודות.

---

## חלק ד' — הרישום (קומיט שני, נפרד)

| קובץ | מה |
|---|---|
| `docs/DONE.md` | **`D-100`** סוגר את **`B-378`** — `npm audit` לפני/אחרי · `5` החבילות שזזו · hash קומיט הקוד · `T3` · אימות: `smoke` + hash + `SENTRY_RELEASE` + עין |
| `docs/BACKLOG.md` | `B-378` יורד ל-`DONE` (**מחיקה**, ⛔ העתקה — §14) · **`B-373`** מקבל את **הכרעת ניב** בגוף · **`B-380`** ‹R-4› חדש: `2` pins מדויקים ללא שער התיישנות + `moderate`+`low` שנשארו · עדכון רשימות-שורש + מניית שכבת-השורשים (מ**הפלט של §8.6**, ⛔ מהזיכרון) |
| `docs/STATE.md` | HEAD ⇒ hash **קומיט הקוד** (§HEAD) · גיזום שורת `:69` (`B-378` חסום — `120` בתים) · עדכון שורת הסיכון `:105` · הוספת `B-380`. **תקציב: `15,899/16,000` כרגע ⇒ `101` פנויים; הגיזום פותח ~`120`** |
| `docs/NEXT.md` | להכריע אם `B-380` נכנס (תקרה `40` שורות · `3` פריטים בדיוק). ברירת-מחדל: ⛔ — הוא S ומתחת ל-P0 הקיימים |

⚠️ **הערה למזהה:** בהודעת ניב נכתב «`B-377` (או המזהה הרלוונטי) נסגר». **`B-377` הוא פריט
ה-Canary המיושן** (`32058659008` בן `41` יום שצוטט כטרי); פריט התלויות הוא **`B-378`**.
הגל סוגר את `B-378`, ו-`B-377` נשאר **פתוח**.

**מזהים הבאים:** `B-380` (מקסימום ב-`BACKLOG` = `B-379`) · `D-100` (מקסימום ב-`DONE` = `D-099`;
`D-999` שמופיע ב-`grep` הוא **בתוך גוף `D-045`**, ⛔ שורה).

---

## חלק ה' — צורת ה-REPORT (כפי שניב הגדיר)

`2 hash + push` · לכל תלות: ישירה/טרנזיטיבית, מ⇒ל, דרך · `npm audit` לפני/אחרי ·
מה עוד זז ב-lock · `nodemailer` בשימוש בפרודקשן? · `smoke` ירוק + release id.
