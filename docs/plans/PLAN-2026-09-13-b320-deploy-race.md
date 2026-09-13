# תוכנית: `B-320` — חלון מרוץ פריסה

**תאריך:** 2026-09-13 · **סיווג:** `T3` (3/5 — לא/כן/לא/כן/כן) · **HEAD:** `9b371a7`
**מכסה:** `B-320` · תיקון שיוך שגוי ב-`INCIDENTS#23` · 🆕 ממצא חדש שנמדד בגל הזה
**סטטוס:** ⏸️ **awaiting approval** — ⛔ אפס נגיעה בקוד עד אישור

---

## 0 · העיקרון שקובע את הסדר

> **הגל הזה מצא ששומר קיים מת.** לפני שמוסיפים מנגנון שלישי, מוכיחים
> שהמנגנון שכבר נכתב (`B-164`) יורה — כי הוא ⛔ יורה היום, והוא ה⛔יחיד
> שעומד בין המשתמש למסך ריק.

⚠️ **⇒ שלוש החלופות שבפרומפט נכתבו תחת ההנחה ש⛔ קיים שומר. ההנחה הופרכה
בכיוון ההפוך מהצפוי:** השומר קיים, **עובד**, ו⛔ **מחווט**.

---

## 1 · המנגנון — מה נמדד, ומה היה שגוי בניסוח

### 1.1 השורש (נמדד בבייטים, ⛔ הונח)

`vite.config.js:22-27` מפעיל `sentryVitePlugin` עם
`release: { create: false, finalize: false }`. ⚠️ **`release.inject` ⛔ הושבת
ונשאר `true` (ברירת מחדל).** הפלאגין גוזר מזהה release מגיט/CI ומזריק
prelude לתוך **כל chunk ראשון-צד**:

```
$ for f in dist/assets/*.js; do grep -o 'SENTRY_RELEASE={id:"[0-9a-f]*"' "$f"; done
AdminPanel-BvR4Qnqa.js   SENTRY_RELEASE={id:"d0d79401cddc8e1b8c0a7d7fcfaf3e907e3b3ebc"
date-fns-BAjDKoec.js     SENTRY_RELEASE={id:"d0d79401cddc8e1b8c0a7d7fcfaf3e907e3b3ebc"
index-C0GNzFk8.js        SENTRY_RELEASE={id:"d0d79401cddc8e1b8c0a7d7fcfaf3e907e3b3ebc"
recharts-B7pIFb4y.js     SENTRY_RELEASE={id:"d0d79401cddc8e1b8c0a7d7fcfaf3e907e3b3ebc"
sentry-BHn3hzsx.js       SENTRY_RELEASE={id:"d0d79401cddc8e1b8c0a7d7fcfaf3e907e3b3ebc"
```

⇒ **ה-SHA נמצא בבייטים של כל chunk ⇒ ה-content hash של כל chunk משתנה בכל
קומיט ⇒ כל שם קובץ מסתובב. כולל קומיט `docs` בלבד.**

### 1.2 🔴 תיקון לניסוח שבפרומפט — הטופולוגיה הייתה שגויה, המסקנה נכונה

הפרומפט תיאר **שרשרת**: «`SENTRY_RELEASE.id` נצרב ב-`index` ⇒ hash משתנה ⇒
`recharts` מייבא ממנו ⇒ hash שלו משתנה **בשרשרת**».

**נמדד:** `recharts` ⛔ מייבא מ-`index`. הוא מייבא מ-`sentry`:

```
$ head -c 120 dist/assets/recharts-B7pIFb4y.js
import{r as Gk,c as Vl,g as qe,a as re,R as I}from"./sentry-BHn3hzsx.js";
```

⇒ ⛔ **אין שרשרת.** כל chunk נושא את ה-SHA **בעצמו**. ⚠️ **הסיבה חזקה יותר
מהמנוסחת, ⛔ חלשה ממנה** — היא **ישירה**, ולכן ⛔ ניתן לשבור אותה ע"י שינוי
גרף הייבוא.

### 1.3 בידוד המשתנה — עץ זהה, רק ה-SHA משתנה

ארבע בניות על **אותו עץ בדיוק** (`9b371a7`, `git status` נקי):

| בנייה | `index` | `recharts` | `sentry` | `date-fns` | `AdminPanel` | CSS |
|--------|---------|------------|----------|------------|--------------|-----|
| גיט = `d0d7940` | `C0GNzFk8` | `B7pIFb4y` | `BHn3hzsx` | `BAjDKoec` | `BvR4Qnqa` | `CoqQdm60` |
| גיט = `9b371a7` (docs בלבד) | `DUKSHdPc` | `B-SlmYtq` | `CXP4flqr` | `ZBuGKKne` | `Cj_ZoOmk` | `CoqQdm60` |
| `SENTRY_RELEASE=aaaa…` | `BkjhVrO7` | `pZIoGfRT` | `DjrJTrkV` | `D0m9Amaw` | `Bn2B4Y6z` | `CoqQdm60` |
| `SENTRY_RELEASE=bbbb…` | `BILfT4wf` | `fYNwfX49` | `Dfnzy3qR` | `CKlfhtO_` | `B_haiqyq` | `CoqQdm60` |

⚠️ **הגדלים זהים לספרה האחרונה** (`recharts` = `553.42 kB` בארבע הבניות) —
אותו קוד, שם אחר. ⛔ **ה-CSS ⛔ זז באף בנייה** — הוא ⛔ נושא את ה-prelude,
והוא **הביקורת**: גדר שהייתה מזיזה גם אותו הייתה מודדת משהו אחר.

⇒ **`5/5` קבצי JS מסתובבים · `0/1` CSS · המשתנה היחיד שזז הוא ה-SHA.**

---

## 2 · תיקון השיוך השגוי — `INCIDENTS#23` + `B-320`

`docs/BACKLOG.md:795` נושא כיום:

> 🆕 **השערת §11 שנפתחה ו*הופרכה באותו גל*:** נטען שה-build המקומי על `d0d7940`
> פלט את `recharts-DZljt4aM.js` שחזר `404`; **המדידה מפריכה** — `npm run verify`
> על העץ הנוכחי פלט `recharts-B7pIFb4y.js` … ⇒ **השם שנגזם ⛔ מיוצר ע"י העץ הזה.**

🔴 **זו ⛔ הפרכה — זו אישוש.** ההשערה הייתה «HTML **מפריסה קודמת**». הנתון
«העץ הנוכחי מייצר שם **אחר** מזה שנגזם» הוא **בדיוק מה שההשערה חוזה**.

**והאישוש נמדד ישירות — שמות ה-vendor המקומיים משחזרים את פרודקשן לפי קומיט:**

| קומיט | בנייה מקומית | פרודקשן (מדידת ניב 11.09) | התאמה |
|--------|---------------|---------------------------|--------|
| `d0d7940` | `recharts-B7pIFb4y.js` | 17:2x → `recharts-B7pIFb4y.js` | ✅ מדויק |
| `9b371a7` | `recharts-B-SlmYtq.js` | 17:4x → `recharts-B-SlmYtq.js` | ✅ מדויק |

⇒ `recharts-DZljt4aM.js` (ה-`404` ב-14:38Z) שייך ל**קומיט מוקדם יותר** — ⛔ ל-`d0d7940`.

⚠️ **סייג שנמדד ו⛔ מוסתר:** שמות ה-`index` ⛔ תואמים (`C0GNzFk8` מקומי מול
`CQqhGka5` בפרודקשן). הסיבה: `index` מטמיע `VITE_SENTRY_DSN` ו-
`VITE_TURNSTILE_SITE_KEY` מה-`.env` המקומי, שערכיו ⛔ ערכי Vercel. chunks של
vendor ⛔ נושאים env ⇒ **הם ההשוואה התקפה, `index` ⛔**.

**פעולה:** שורת `B-320` ב-`BACKLOG` ושורת `INCIDENTS#23` — **סימון כשיוך שגוי,
⛔ מחיקה.** הטקסט הישן נשאר קריא עם תיקון מתוארך מעליו.

---

## 3 · ① החשיפה האמיתית — אושש/הופרך, ⛔ הוסק

### (א) טעינה בזמן deploy — 🔴 **אושש. חשוף.**

פרוב (`/tmp/probe-b320.mjs`): מגיש את `dist/` האמיתי, מחזיר `404` על
`recharts-*.js` בלבד, טוען ב-Chromium אמיתי:

```
chunk 404s served            : 1
HTML requests (1 = no reload): 1
guard anchor #se-main-script : false
boot spinner still on screen : true
root children                : se-boot
visible text                 : "SwingEdge"
boot-retry sessionStorage    : null
```

⇒ **ספינר לנצח. ⛔ רענון · ⛔ הודעה · ⛔ דרך פעולה למשתמש.**

### (ב) `AdminPanel` שנטען מאוחר — **מכוסה.**

`AdminPanel-*.js` ⛔ ב-`modulepreload` (`0` מופעים ב-`dist/index.html`) ⇒ דינמי
באמת, ו-`lazyWithRetry` עוטף אותו. ⚠️ **נגזר מקריאת קוד + בייטים, ⛔ אומת בעין**
— אימות דורש התחברות אדמין. **⇒ ⛔ נסגר כמכוסה עד שנצפה.**

### (ג) טאב פתוח — ⚠️ **נכון חלקית, ⛔ מוחלט.**

chunks סטטיים כבר בזיכרון ⇒ ⛔ נפגעים. **אבל** טאב פתוח שפותח את לשונית האדמין
**אחרי** פריסה נכנס למסלול הדינמי ⇒ `404` ⇒ נופל ל-(ב). ⇒ החשיפה קיימת,
והשומר שלה קיים.

### 🔴 (ד) ממצא חדש — **שומר `B-164` מת בפרודקשן**

`index.html:172` במקור:
```html
<script type="module" src="/src/main.jsx" id="se-main-script"></script>
```
Vite פולט מחדש ב-`dist/index.html:164` — **⛔ `id`**:
```html
<script type="module" crossorigin src="/assets/index-DUKSHdPc.js"></script>
```

⇒ ב-`dist/index.html` יש **מופע אחד בדיוק** של `se-main-script` — בתוך
`getElementById` — ו-**`0` על התג**. השומר מגיע ל-`if (!el) return;` **ויוצא**.

**ביקורת — הזרקת ה-`id` בלבד, אותו פרוב בדיוק:**
```
HTML requests (1 = no reload): 2          ← רענון חד-פעמי ירה
guard anchor #se-main-script : true
boot-retry sessionStorage    : 1
visible text : "הטעינה נכשלה. אנא רענן את הדף. Failed to load. Please refresh the page. רענן · Refresh"
```

⇒ **המנגנון עובד במלואו. הוא ⛔ מחווט.** ⚠️ **וזה ⛔ באג חדש — זה `B-164`
שמעולם ⛔ הגן**, וכל מדידה שהניחה שהוא מגן הניחה שקר.

---

## 4 · ② `lazyWithRetry` — מה בדיוק עושה

`SwingEdge_App.jsx:17-34`. עוטף `lazy()`; על דחיית `importFn()`:
מתאים `/Failed to fetch dynamically imported module/i` **או** `err.name === "ChunkLoadError"`;
⛔ התאמה ⇒ **זורק מחדש** (⛔ בולע); התאמה ⇒ דגל `chunk-reloaded-adminpanel`
ב-`sessionStorage`, `location.reload()`, ומחזיר `new Promise(() => {})` כדי
להחזיק את `Suspense` עד הרענון. פעם אחת בלבד; בפעם השנייה זורק.

**מכסה את (ב) בלבד.** ⛔ נוגע ב-(א) — chunk סטטי ⛔ עובר דרך `importFn`.

⚠️ **הערה מיושנת שנמדדה כשקר** — `SwingEdge_App.jsx:15-16`:
> «lazy-loaded so its bundle (**incl. recharts**) is fetched only when an admin opens the Admin tab»

`recharts` מיובא **סטטית** ע"י `SwingEdge_App.jsx` **וגם** `IntelligenceUI.jsx` ·
`GrowthPredictor.jsx` · `MonthlyReportTab.jsx`, ויושב ב-`modulepreload`
(`dist/index.html:166`). ⇒ הוא נטען **תמיד**, לכל משתמש. הפרוב הוכיח זאת:
`404` עליו הפיל את כל האפליקציה.

---

## 5 · ③ האם Vite פולט `vite:preloadError` — נמדד בבייטים

**כן — הדיווח קיים ב-`index` chunk:**
```
function i(o){const l=new Event("vite:preloadError",{cancelable:!0});
if(l.payload=o,window.dispatchEvent(l),!l.defaultPrevented)throw o}
```
`grep -c preloadError` ⇒ `index`=**1** · `recharts`/`sentry`/`date-fns`/`AdminPanel`=**0**.
**מאזינים בקוד המקור: `0`.**

🔴 **אבל — והוא הסעיף שמכריע את חלופה (א):** האירוע נורה **רק** מתוך העוזר
`__vitePreload`, כלומר **ייבוא דינמי בלבד**. הייבוא הדינמי היחיד הוא
`AdminPanel`, שכבר עטוף ב-`lazyWithRetry`. **כשל chunk סטטי (א) ⛔ מגיע לשם לעולם.**

⇒ **חלופה (א) כפי שנוסחה ⛔ מכסה את החשיפה העיקרית.** היא מכסה את (ב) — שכבר מכוסה.

---

## 6 · החלופות — מוצגות, ⛔ מומלצות

⚠️ **הבחנה שחלה על כולן:** «chunk נגזם» = `404` על נכס יחיד בזמן שהרשת
**חיה**. «⛔ אינטרנט» = כל הבקשות נכשלות. ⛔ **ערבוב השניים מייצר לולאת רענון
למשתמש שברכבת תחתית.** ⇒ כל חלופה חייבת דגל חד-פעמי **ו**זיהוי `navigator.onLine`.

| | מה נשמר | מה זז | רשת נופלת | רולבק |
|---|---------|--------|------------|--------|
| **(א) `vite:preloadError` ⇒ `reload()` חד-פעמי** | ⛔ שינוי UI · דגל `sessionStorage` מונע לולאה | מאזין ב-`main.jsx` | ⚠️ נורה גם על כשל רשת ⇒ רענון מיותר, אחד | הסרת מאזין · קומיט יחיד |
| **(ב) באנר «גרסה חדשה — רענן»** | המשתמש שולט · ⛔ איבוד טופס פתוח | מסך פונה-משתמש ⇒ **הכרעת מוצר** · דורש `C-0nn` · RTL+ניגודיות | ⛔ נורה — הבאנר תלוי בגילוי גרסה, ⛔ בכשל טעינה | הסרת רכיב · באנר ⛔ הרסני |
| **(ג) `lazyWithRetry` לכל דבר שנטען מאוחר** | דפוס קיים ומוכח | ⚠️ **⛔ עוזר ל-(א)** — `recharts` סטטי; דורש להפוך ייבוא סטטי לדינמי ⇒ ריפקטור רחב | זהה ל-(ב) הקיים | רחב — נוגע בכל אתר ייבוא |
| 🆕 **(ד) חיווט `B-164` מחדש** — החזרת `id` לתג הנפלט | **המנגנון כבר כתוב, נבדק, ומכסה `404` סטטי** | `index.html` בלבד · ⛔ UI חדש | ⚠️ רענון אחד ואז **הודעה גלויה** — ⛔ לולאה | מחיקת שורה אחת |
| 🆕 **(ה) ייצוב ה-release id** — `release.inject:false` **או** `release.name` = גרסת `package.json` | קומיט `docs` ⛔ מסובב שמות ⇒ **החלון נסגר לרוב הקומיטים** | ⚠️ `vite.config.js` (⛔ `manualChunks`) · **עלות: אובדן שיוך שגיאות ל-release ב-Sentry** | ⛔ רלוונטי | הפיכת שורה אחת |

⚠️ **(ד) ו-(ה) ⛔ היו בפרומפט — הם נולדו מהמדידה.** ⛔ **⛔ מומלצים כאן.**
⚠️ **(ה) ⛔ סוגר את החלון** — קומיט שנוגע בקוד עדיין מסובב שמות, וגיזום עדיין
קורה. הוא **מקטין תדירות**, ⛔ מבטל.
⛔ **`Skew Protection` ⛔ מסלול** — Pro בלבד, הפרויקט Hobby (נמדד 12.09).

---

## 7 · האסרציה — אדומה **לפני** ירוקה

הפרוב הורץ על **העץ הנוכחי** (`9b371a7`, בנייה טרייה) ⇒ **אדום, `2/2`:**

```
A1 404 chunk must not strand the user (reload OR visible message)
   ✗ RED — user stranded, no reload and no message
A2 boot-recovery guard anchor must exist in the built HTML
   ✗ RED — getElementById('se-main-script') is null ⇒ guard returns early, dead code
exit=1
```

וזרוע הביקורת (`id` מוזרק, שום שינוי אחר) ⇒ **ירוקה `2/2`** ⇒ האדום מודד
**חיווט**, ⛔ היעדר מנגנון.

**בשלב הביצוע:** הפרוב עובר ל-`scripts/probe-boundary`-סגנון תחת
`probe:deploychunk`, **⛔ בשרשרת** (דורש דפדפן, כמו `test:smoke`/`probe:boundary`).

---

## 8 · מה ⛔ נמדד — גבולות הגל הזה

- ⛔ **מדיניות הגיזום של Vercel ⛔ נמדדה על ידינו.** `404` על chunk ישן הוא
  **ציטוט** ממדידת ניב 11.09, ⛔ מדידת הגל.
- ⛔ **`x-vercel-cache: HIT` על ה-HTML ⛔ שוחזר** — מצוטט מ-`INCIDENTS#23`.
- ⛔ **(ב) ⛔ אומת בעין** (דורש אדמין).
- ⛔ **הפרוב ⛔ מכסה** צבע · RTL · ניגודיות · קורא מסך — Tailwind ⛔ מהודר בו.
  אותו גבול של `C-036`·`C-038`·`C-039`·`C-041`·`C-043`.
- ⛔ **`0` פריסות נמדדו לרוחב** — המכנה נשאר `1` אירוע.

---

## 9 · חוסמים לפני ביצוע

1. 🔴 **`docs/STATE.md` = 15,977/16,000 בתים — `23` פנויים.** ⛔ אפשר לכתוב
   שורה. **גיזום עותק שני חייב לקדום לכל כתיבה** (§14).
2. ⏸️ **`docs/INBOX.md` נושא שורה מ-11.09 שלא עברה triage** (סיווג §15 שדווח
   אחרי תחילת העבודה). §14 מחייב triage בתחילת סשן; ⛔ בוצע כאן כי §9 מגביל
   את הקומיט לקובץ התוכנית בלבד. **דורש הכרעה.**
3. ⏸️ **הכרעת מוצר:** (ד)+(ה) מול (א)/(ב)/(ג). ⛔ המלצה — ניב מכריע.

## 10 · סדר ביצוע מוצע (⛔ מאושר)

| # | צעד | תלוי ב |
|---|------|---------|
| 0 | גיזום `STATE` · triage `INBOX` | חוסם 1+2 |
| 1 | תיקון השיוך ב-`BACKLOG:795` + `INCIDENTS#23` — סימון, ⛔ מחיקה | — |
| 2 | `probe:deploychunk` לריפו · **נצפה אדום** | — |
| 3 | החלופה שתיבחר | הכרעת ניב |
| 4 | הפרוב ⇒ ירוק · `npm run verify` מלא · `C-0nn` ב-`CHECKS` אם נגעה במסך | 3 |
| 5 | `DONE` עם hash **בקומיט הבא** · `NEXT` מעודכן | 4 |
