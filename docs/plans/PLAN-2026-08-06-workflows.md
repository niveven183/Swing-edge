# PLAN 2026-08-06 — W · workflows

> **סטטוס: awaiting approval.** נכתב אחרי מיפוי מלא, לפני כל שינוי.
> Safety gate: `origin = https://github.com/niveven183/Swing-edge` · `git pull` → Already up to date ·
> עץ נקי · HEAD = `57c2832` ✅ (כמצופה).

---

## 0. תיקוני הנחות — נמדד, לא נזכר

שלושה מספרים בפרומפט אינם תואמים את הריפו. אף אחד מהם אינו משנה את המסקנה,
אבל §2 ("אפס מנה בלי מכנה") מחייב לתקן לפני שבונים עליהם.

| ההנחה | הנמדד | הפקודה |
|-------|--------|---------|
| "Node 20 — 30 שימושים" | **9** שורות `node-version: 20` (9 קבצים) · **33** הצמדות לפעולות שרצות על ריצת node20 | `grep -c 'node-version: 20' *.yml` · `grep -cE 'actions/(checkout@v4\|setup-node@v4\|cache…@v4\|github-script@v7)'` |
| "`action-send-mail@v3` — 8 שימושים" | **9** (`restore-drill.yml` מחזיק **שניים** — הצלחה וכשל) | `grep -c 'dawidd6/action-send-mail@v3' *.yml` |
| "smoke נכשל כי `/app` החזיר 500" | `/app` החזיר **200**. ה-500 היה של **צד שלישי**. פירוט מלא ב-§3 | trace של הריצה שנכשלה |

**המספר "30" של ניב הוא כנראה 33 ההצמדות** — זה מה שהראנר מזהיר עליו, לא `node-version`.
שני הדברים נפרדים לגמרי ו-§2 של המשימה מערבב ביניהם:

- `node-version: 20` = איזה Node מריץ את **הסקריפטים שלנו** (`npm ci`, `node scripts/…`).
- `checkout@v4` / `setup-node@v4` / `cache@v4` / `github-script@v7` = פעולות שה-**קוד שלהן**
  מוצהר `using: node20`. זו הדפרקציה שגיטהאב מכריזה עליה.

⚠️ **הדפרקציה כבר נכנסה לתוקף, ושום דבר לא נשבר.** מתוך לוג הריצה:

```
2026-08-05T15:04:13.7392436Z Node 20 is being deprecated. This workflow is running
with Node 24 by default. If you need to temporarily use Node 20, you can set the
ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true environment variable.
```

כלומר גיטהאב **כבר מריצה** את 33 ההצמדות על Node 24. הסיכון אינו "יפסיק לעבוד מחר" —
הסיכון הוא שקוד שנכתב ונבדק ל-node20 רץ היום על node24 בלי שאיש בדק. השדרוג הוא
יישור-קו, לא כיבוי שריפה. זה משנה את הדחיפות, לא את הצורך.

---

## 1. מיפוי 17 ה-workflows

`✓` = יש שלב `Report to Discord`. **קריטי** = כשל שלו פוגע בפרודקשן, בנתונים או ביכולת
להתאושש. **נוחות** = כשל שלו עולה לנו במידע, לא בכסף ולא בשחזור.

| # | workflow | טריגר | מה קורה אם ייכשל **בשקט** | Discord | מי שומר עליו | סיווג |
|---|----------|--------|---------------------------|:-------:|--------------|-------|
| 1 | **Supabase Backup** | cron ראשון 03:00 UTC | אין גיבוי. **מתגלה רק כשצריך לשחזר** — כלומר בדיוק ברגע הגרוע | ✓ (הצלחה בלבד) | Triage · Watchdog 192h | 🔴 קריטי |
| 2 | **Restore Drill** | cron 1 לחודש 04:00 | הגיבוי קיים אך **בלתי-שחזיר**, ואיש לא יודע. הכשל השקט הגרוע בריפו | ✓ (הצלחה **וגם** כשל, `always()`) | עצמו בלבד | 🔴 קריטי |
| 3 | **Sentinel** | cron `:20,:50` — **48/יום** | תקלת פרודקשן לא מזוהה. זה הזקיף היחיד שרץ בתדר גבוה | ✓ | failure-alert · Watchdog **3h** (ההדוק ביותר) | 🔴 קריטי |
| 4 | **Smoke Tests** | push→main · cron 04:00 | deploy שבור עובר. פירוט ב-§3 | ✗ | Triage · Watchdog 30h | 🔴 קריטי |
| 5 | **Build** | push + PR → main | קוד שאינו נבנה נכנס ל-main | ✗ | Triage | 🔴 קריטי |
| 6 | **Triage** | workflow_run: Smoke·Build·Backup | כשלים אינם מאובחנים; גם תיקון ה-lockfile האוטומטי מת | ✓ | failure-alert | 🔴 קריטי |
| 7 | **Failure Alert** | workflow_run × **11** | **11 workflows מאבדים את ערוץ הכשל שלהם בבת אחת, ושום דבר לא אומר זאת.** ראה §7 | ✓ | **אף אחד** ⚠️ | 🔴 קריטי |
| 8 | **Watchdog** | cron 08:00 | מוות של cron אינו מזוהה — הכשל-על-הכשל | ✓ | failure-alert · שלב "Watchdog liveness" ב-Fleet Daily | 🔴 קריטי |
| 9 | **Fleet Daily** | cron 06:00 | אין Cost Watchdog ואין Growth Pulse; **וגם** נופלת בדיקת החיות של Watchdog | ✓ | failure-alert · Watchdog 30h | 🔴 קריטי |
| 10 | **Email Campaign** | dispatch בלבד | קמפיין לא נשלח / נשלח חלקית מול ליגר ה-dedup | ✓ (לא ב-dry-run) | failure-alert | 🔴 קריטי בהרצה |
| 11 | **Data Guardian** | cron כל 3 ימים 05:00 | ליקויי איכות-נתונים מצטברים בלי issue | ✓ | failure-alert · Watchdog 80h | 🟡 גבול |
| 12 | **Daily Digest** | cron 04:00 | אין דוח יומי | ✓ | failure-alert · Watchdog 30h | נוחות |
| 13 | **User Analytics** | cron 06:30 | אין דוח אנליטיקה יומי | ✓ | failure-alert · Watchdog 30h | נוחות |
| 14 | **Fleet Weekly** | cron ראשון 07:00 | אין Weekly Vitals | ✓ | failure-alert · Watchdog 192h | נוחות |
| 15 | **Analyst** | cron ראשון 06:00 | אין ניתוח שבועי ואין PR כיול | ✓ | failure-alert · Watchdog 192h | נוחות |
| 16 | **Architecture Auditor** | cron ראשון 05:00 | חוב ארכיטקטוני מצטבר בלי issue | ✓ | failure-alert · Watchdog 192h | נוחות |
| 17 | **Health Monitor** | dispatch בלבד | — **מוקפא בכוונה ומתועד ככזה** (25.07): הוחלף ב-Sentinel §3, ה-cron הוסר כדי למנוע רעש. "Do not delete" כתוב בקובץ | ✗ | לא רלוונטי | מוקפא |

**Discord: 14/17.** שלושת החריגים — `build` · `health` · `smoke` — ולכל אחד יש הסבר:
`build` ו-`smoke` מכוסים ב-Triage שמדווח בעצמו, ו-`health` מוקפא. **אין כאן פער.**

**טבלת ה-max-age של Watchdog מכסה 11/11 ה-workflows המתוזמנים** (`sentinel`=3h ·
`daily-digest`·`fleet-daily`·`user-analytics`·`smoke`=30h · `data-guardian`=80h ·
`fleet-weekly`·`analyst`·`arch-auditor`·`backup`=192h · `restore-drill`=840h).
ששת הנותרים אינם מתוזמנים ולכן max-age חסר משמעות עבורם. **הטבלה שלמה.**

---

## 2. שדרוג גרסאות — הפער גדול בהרבה ממה שההנחה תיארה

נמדד מול `gh api repos/<action>/releases/latest`:

| פעולה | בריפו | latest | פער | שימושים |
|-------|-------|--------|-----|---------|
| `actions/checkout` | v4 | **v7.0.1** | 3 מייג'ורים | 11 |
| `actions/setup-node` | v4 | **v7.0.0** | 3 | 9 |
| `actions/cache` (+`/restore`,`/save`) | v4 | **v6.1.0** | 2 | 10 |
| `actions/github-script` | v7 | **v9.0.0** | 2 | 3 |
| `actions/download-artifact` | v7 | **v8.0.1** | 1 | 1 |
| `actions/upload-artifact` | v7 | **v7.0.1** | **0 — מעודכן** | 3 |
| `dawidd6/action-send-mail` | v3 | **v18** | **15** | 9 |

`upload-artifact` כבר על ה-latest — כלומר מישהו כן שדרג בעבר, בורר. זה מחזק את
המסקנה שהשאר פשוט נשכח, לא נעול בכוונה.

### ההמלצה: לפצל, לא לבלוע

הפרומפט אמר "גל אחד, שינוי אחד" — ואז ביקש **שני** שינויים באותו גל: Node ו-send-mail.
אלה אינם אותה רמת סיכון:

**2א · הצמדות node20 → מייג'ור נוכחי (33 שורות, 13 קבצים).** `checkout`/`setup-node`/`cache`/
`github-script` הן פעולות של גיטהאב עצמה עם API יציב בין מייג'ורים; המייג'ור עולה בעיקר
בגלל שינוי ריצת Node. סיכון נמוך, כיסוי גבוה. ✅ **לבצע בגל הזה.**

**2ב · `node-version: 20` → 22 (9 שורות).** Node 20 יצא מ-LTS. הסקריפטים שלנו רצים עליו.
✅ **לבצע בגל הזה** — `npm run verify` מריץ בדיוק את הסקריפטים האלה ומהווה הוכחה מקומית.

**2ג · `action-send-mail@v3 → v18`. ⛔ לא בגל הזה.** קפיצה של **15 מייג'ורים** על **9**
נקודות קריאה, שאחת מהן היא **אזעקת הכשל של `restore-drill`**. אם v18 שינה שם-שדה או
התנהגות אימות, מה שנשבר הוא **המנגנון שאמור לצעוק כשהגיבוי לא ניתן לשחזור** — כשל שקט
מדרגה ראשונה (§2). זה לא "שדרוג גרסה", זו מיגרציה, והיא דורשת גל משלה עם הרצת
`workflow_dispatch` מוכחת לכל אחד מתשעת הנתיבים. ⏸️ שורה ב-`STATE.md`.

### ⚠️ ההוכחה שנדרשת לגיבוי

`backup.yml` **אינו** אחד מ-13 הקבצים עם הצמדות node20 — הוא לא נוגע ב-`setup-node`
כלל (הוא מתקין `postgresql-client-17` ורץ ב-bash). היחיד ששינוי 2א נוגע בו שם הוא
`upload-artifact`, שכבר על ה-latest. כלומר **הגל הזה אינו משנה את backup.yml בשום שורה**,
ולכן דרישת "הרצה מוכחת אחרי שדרוג Node על הגיבוי" מתייתרת מעצמה. אני אציין זאת ולא
אריץ גיבוי סתם. אם ניב רוצה הרצת אימות בכל זאת — `workflow_dispatch` על `backup.yml`,
נשמח, אבל היא לא נדרשת מהשינוי.

---

## 3. מרוץ ה-smoke — האבחון

הפרומפט הציע שתי אפשרויות. **התשובה היא לא (א) ולא (ב).**

### הראיה

הורדתי את ה-artifact של הריצה שנכשלה (`31018389773`, קומיט `e09833e`) ופרסתי את
`trace.zip`. כל תגובה שנרשמה, לפי הסדר:

```
200  https://swing-edge.com/app                    ← הדף עצמו תקין
200  https://swing-edge.com/assets/index-fUGu3Ias.js
200  https://swing-edge.com/assets/index-iPHa7hMB.css
200  https://swing-edge.com/assets/recharts-DaDLCdUQ.js
200  https://swing-edge.com/assets/sentry-DXS1BpqC.js
200  https://swing-edge.com/assets/date-fns-BEvh6sZu.js
200  https://swing-edge.com/api/quote?symbols=NVDA,AAPL,…
500  https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap   ← היחיד
```

**ה-500 היחיד בכל הריצה הוא של `api.fontshare.com`.** `/app` החזיר 200.

זה מאושש גם מהאסרשן שנפל: ב-`tests/smoke.spec.js:45-48` יש **שתי** בדיקות ברצף —

```js
expect(serverErrors, `5xx from ${BASE_HOST}:…`).toEqual([]);   // ← שורה 46, עברה
expect(consoleErrors, `console errors:…`).toEqual([]);          // ← שורה 47, נפלה
```

הלוג מצביע על `line=47`. כלומר `serverErrors` היה **ריק** — לא היה שום 5xx מהמקור שלנו.

### מה באמת קרה: מסנן המארח מנוטרל

`watchErrors()` מתעד שני ערוצים נפרדים, ורק לאחד יש מסנן מארח:

```js
page.on('console', (msg) => {                  // ← שורה 27 — ללא סינון מארח
  if (CONSOLE_ERROR_ALLOWLIST.some(p => text.includes(p))) return;  // 4 מחרוזות GA בלבד
  consoleErrors.push(text);
});
page.on('response', (res) => {                 // ← שורה 36 — עם סינון מארח
  if (host === BASE_HOST) serverErrors.push(…); // ← שורה 40
});
```

ההערה בשורה 23 מצהירה על הכוונה במפורש: *"third-party 5xx must not fail our smoke"*.
שורה 40 אוכפת אותה. **שורה 31 מבטלת אותה** — אותו כשל של צד שלישי מגיע פעמיים,
מסונן נכון בערוץ אחד ונכנס דרך השני. הבדיקה נופלת על הערוץ שמעולם לא נועד לתפוס אותו.

זהו **בדיוק** ה-500 של fontshare שכבר רשום ב-`STATE.md` ל-05.08. אותו אירוע.

### האישוש: הכשל השני, באותה חתימה

הריצה הכושלת הקודמת (`30925411520`, 04.08) נופלת על **אותה שורה 47** — והפעם גם על
**`/` (דף הנחיתה)**, לא רק `/app`. דף הנחיתה הוא סטטי ואין לו cold start.
**זה קובר את אפשרות (ב) סופית.**

### ואפשרות (א)? נבדקה בנפרד — ונשללה לריצה הזו, אך היא סיכון אמיתי

| אירוע | חותמת (UTC) |
|-------|--------------|
| push של `e09833e` | 15:03:57 |
| ה-job התחיל | 15:04:12 |
| **deploy של Vercel הסתיים (`state: success`)** | **15:04:31** |
| `npx playwright test` התחיל | 15:04:52 |
| הבדיקה שנפלה רצה | 15:05:00 |

ה-deploy היה חי **21 שניות** לפני שהבדיקות בכלל התחילו. אין מרוץ בריצה הזו.

**אבל** — מדדתי את המרווח על ארבע ריצות, והוא **5–21 שניות**:

| קומיט | deploy success | תחילת הבדיקות | מרווח |
|-------|----------------|----------------|-------|
| `e09833e` | 15:04:31 | 15:04:52 | +21s |
| `2b6ef55` | 17:43:50 | 17:43:59 | **+9s** |
| `33c1653` | 19:30:18 | 19:30:23 | **+5s** |
| `57c2832` | 19:42:58 | 19:43:14 | +16s |

**שום דבר אינו אוכף את הסדר הזה.** `smoke.yml` מריץ `npx playwright test` מול
`https://swing-edge.com` מיד, בלי להמתין ל-deploy. המרווח החיובי הוא מקרי — תוצר של
`npm ci` + `playwright install` שלוקחים ~40 שניות, במקרה יותר מזמן הבנייה ב-Vercel.

**וזה הצד המסוכן:** אם המרוץ ייפול לצד השני, smoke לא ייכשל — הוא **יעבור מול ה-deploy
הקודם** ויידווח ירוק. ✅ שקרי גרוע מ-❌ אמיתי (§2). הסיכון אינו שה-CI רועש; הסיכון
שה-CI **מרגיע**.

### התיקון לכל אחת מהמסקנות

| ממצא | תיקון | למה לא אחרת |
|------|--------|--------------|
| **500 של צד שלישי דולף דרך ערוץ ה-console** | להחיל את מסנן המארח של שורה 40 גם על ערוץ ה-console: להתעלם מהודעת console שה-URL שלה (`msg.location().url`) אינו `BASE_HOST` | הגדלת `retries` הייתה מסתירה תלות בצד שלישי בלי fallback — בדיוק ה-⛔ בפרומפט |
| **ההודעה אינה אומרת מי נכשל** | `msg.text()` הוא `"Failed to load resource: … 500 ()"` — **בלי URL**. הכתובת יושבת ב-`msg.location()` והבדיקה זורקת אותה. לצרף אותה לדיווח | בלי זה כל אבחון עתידי דורש הורדת trace ידנית, כמו שנדרש כאן. §3: פתרון שמוסיף לניב צעד ידני קבוע הוא פתרון גרוע |
| **המרוץ מול ה-deploy אינו אכוף** | שלב המתנה ב-`smoke.yml`: לסקר את `GET /api/health` (או את ה-Deployment API) עד שה-SHA החי שווה ל-`github.sha`, timeout ~3 דק' | להוסיף `sleep` קבוע זו הימורים על אותו מרוץ מכיוון אחר |
| **`api.fontshare.com` בלי fallback** | ⏭️ **כבר רשום ב-`STATE.md` ל-S2.** לא נוגעים בו בגל הזה | זה `index.html:56` — קוד אפליקציה, לא workflow (§12) |

⚠️ **החלטה שאני מבקש מניב:** שלושת התיקונים הראשונים הם שינוי ב-`tests/smoke.spec.js`
ו-`smoke.yml`. הפרומפט אמר "אפס שינוי לוגיקה ב-workflow" ו-"⛔ אל תכתוב בדיקות חדשות".
אינני כותב בדיקה חדשה — אני מתקן מסנן שבור בבדיקה קיימת. **אם ניב קורא את ⛔ כחל גם
על זה, הכל יורד לגל נפרד** ואני רושם ⚠️ ב-`STATE.md` במקום. אני לא מכריע לבד (§9).

---

## 4. project מובייל ל-Playwright — ההחלטה

מצב היום, `playwright.config.js:25-27`:

```js
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
],
```

### איזה מכשיר: **Pixel 5** בלבד — ולא iPhone

זו ההמלצה המנומקת, והיא **נגד** האינטואיציה:

- **כל דיווח באג מובייל אמיתי שקיבלנו הוא אנדרואיד** (`omrikapara1`, 31.07). באג ה-`capture`
  שהסתתר היה אנדרואיד. שם המשתמשים.
- **אמולציית iOS ב-Chromium היא שקר.** `devices['iPhone 13']` מחליף `userAgent` ו-viewport,
  אבל `navigator.platform` נשאר `Linux x86_64` ו-`navigator.standalone` פשוט **לא קיים**
  ב-Chromium. `IOSInstallBanner` בודק בדיוק את שני אלה (`:13`, `:20`). בדיקה שתעבור שם
  תוכיח משהו שאינו נכון על אף מכשיר אמיתי — **ירוק שקרי**, ה-⛔ של §2.

לכן: project אחד, `Pixel 5`. ⏸️ כיסוי iOS אמיתי דורש WebKit או מכשיר — שורה ב-`STATE.md`.

### אילו בדיקות ירוצו בו: **2 מתוך 6**, לא הכל

חבילת ה-smoke היום היא 6 בדיקות (7 מקרים — `/terms` ו-`/privacy` נוצרות בלולאה):

| הבדיקה | במובייל? | הנימוק |
|--------|:--------:|---------|
| `landing page loads with hero and no errors` | ✅ | פריסת ה-hero והבאנרים המותנים-פלטפורמה |
| `/app loads to auth screen or dashboard` | ✅ | המסך שכל באגי המובייל שדווחו נגעו בו |
| `/terms` · `/privacy` | ❌ | פרוזה סטטית. ה-`h1` וה-regex העברי אינם תלויי פלטפורמה |
| `consent defaults to denied` | ❌ | בודקת `dataLayer[0]` שנכתב ב-`<script>` inline ב-`<head>`. **זהה בייטלפי בכל מכשיר** — שכפול טהור |
| `production market-data API returns live data` | ❌ | משתמשת ב-fixture `request`, **לא פותחת דפדפן כלל**. הרצה שנייה = קריאה שנייה ל-`/api/quote` בפרודקשן על כל push, כלומר **כפל צריכה במכסת ספק** (§8) בתמורה לאפס מידע |

**עלות:** +2 בדיקות. הריצה היום 12.4 שניות ב-`workers: 1`; התוספת ~4 שניות. זניח.
הרצת כל השש הייתה מכפילה זמן **וגם** את קריאות ה-API לפרודקשן — בדיוק מה שהפרומפט הזהיר מפניו.

**מימוש בלי לגעת ב-spec:** `grep` ברמת ה-project בקונפיג, לא תיוג בקובץ הבדיקות:

```js
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'mobile-android',
    use: { ...devices['Pixel 5'] },
    grep: /landing page loads|\/app loads to auth screen/ },
],
```

`tests/smoke.spec.js` אינו משתנה בשלב הזה כלל. אם ניב יאשר גם את §3, שינוי ה-spec שם
הוא הנפרד היחיד.

---

## 5. הציד — כמה מששת ההסתעפויות ה-project באמת מכסה

⚠️ **`STATE.md` טוען היום "בלעדיו שש הסתעפויות היכולת נשארות עיוורות". זה לא מדויק,
וההצדקה של הגל הזה נשענת על זה.** project מובייל מכסה **2 מתוך 6**. בדקתי כל אחת:

| # | ההסתעפות | Pixel 5 מכסה? | למה |
|---|-----------|:-------------:|------|
| 1 | `capture=` בקלט ה-fallback | לא רלוונטי | **תוקן** ב-`f7ebf5f`, ו-`test:ocr` נועל אותו |
| 2 | `SwingEdge_App.jsx:2606-2608` — `navigator.clipboard` בלי בדיקת קיום | ❌ **לא** | `navigator.clipboard` **קיים** ב-Chromium של Playwright תחת https, בכל אמולציית מכשיר. אמולציה משנה UA ו-viewport — **היא לא מסירה יכולות**. נדרש `addInitScript(() => delete navigator.clipboard)`, וזו בדיקה חדשה ⛔ |
| 3 | `ThemeContext.jsx:42` — `matchMedia` לא מוגן | ❌ **לא** | אותו נימוק בדיוק. `matchMedia` קיים בכל Chromium |
| 4 | `IOSInstallBanner.jsx:9,13,20` | ❌ **לא, בהחלטה** | Pixel 5 הוא אנדרואיד ולא ירנדר אותה. iPhone היה מרנדר — אבל על `navigator.platform` ו-`navigator.standalone` שגויים (§4). **עדיף לא-מכוסה מאשר מכוסה-בשקר** |
| 5 | `FeedbackTab.jsx:49` — `parseUA()` | ✅ **כן** | זו המנצחת הברורה: תפקידה היחיד לפרסר UA, והיום היא רצה **אך ורק** מול UA של דסקטופ. Pixel 5 מזריק UA אמיתי של Chrome אנדרואיד — בדיוק הקלט שהתיוג השגוי מגיע ממנו |
| 6 | `SwingEdge_App.jsx:1304` — `prefers-reduced-motion` חשוף | ⚠️ **חלקית, ובאופן אורתוגונלי** | נשלט ב-`use: { reducedMotion: 'reduce' }` — אפשרות של Playwright, **לא** תוצר של אמולציית מכשיר. אפשר להוסיף אותה לכל project |

**המסקנה הכנה: 1 ודאית (#5), 1 בהישג יד (#6, דרך `reducedMotion` ולא דרך המובייל),
ו-#2/#3 אינן ניתנות לכיסוי באמולציה כלל** — הן דורשות **הסרת** יכולת, וזה סוג בדיקה אחר.

זה עדיין שווה את הגל: #5 הוא המסווה של כל באג פלטפורמה עתידי (אם דיווח אנדרואיד מתויג
"Unknown", אי-אפשר למיין לפי פלטפורמה). אבל ההצדקה "שש הסתעפויות" צריכה לרדת ל-1–2
ב-`STATE.md`, אחרת אנחנו מנפחים תשואה. ⏭️ בדיקות הסרת-יכולת ל-#2/#3 = גל נפרד.

---

## 6. פיצול הקומיטים

| # | קומיט | מה בפנים |
|---|--------|-----------|
| 1 | `chore(actions): 33 הצמדות node20 → המייג'ור הנוכחי` | `checkout` v4→v7 (11) · `setup-node` v4→v7 (9) · `cache*` v4→v6 (10) · `github-script` v7→v9 (3) · `download-artifact` v7→v8 (1). **13 קבצים. אפס שינוי לוגיקה.** |
| 2 | `chore(actions): node-version 20 → 22` | 9 שורות ב-9 קבצים + `STATE.md` |
| 3 | `test(smoke): project מובייל — Pixel 5, שתי בדיקות` | `playwright.config.js` בלבד + `STATE.md` + `DECISIONS.md` |
| 4 | `fix(smoke): מסנן המארח יחול גם על ערוץ ה-console` | **מותנה באישור §3.** `tests/smoke.spec.js` + `smoke.yml` (המתנה ל-deploy) + `INCIDENTS.md` + `STATE.md` |

קומיטים 1–3 עצמאיים. 4 יורד כולו אם ניב פוסל.

---

## 7. §11 — סריקה סביבתית: ממצא שאינו המשימה, ואינו קטן

🔴 **`blockAnalytics()` אינו חוסם דבר. תעבורת CI מגיעה ל-GA4 בפועל.**

`tests/smoke.spec.js:19` (וכן `tests-sentinel/sentinel-public.spec.js:32` ו-
`tests-sentinel/sentinel-auth.spec.js:301` — **אותה שורה בשלושה קבצים**):

```js
await page.route('**/googletagmanager.com/**', (route) => route.abort());
```

הגלוב של Playwright מיישר לגבולות מקטע: `**/` דורש `/` לפני `googletagmanager.com`,
ובכתובת `https://www.googletagmanager.com/…` התו שלפניו הוא `.`. בדקתי אמפירית:

```
BLOCKED by **/googletagmanager.com/** : []
FELL THROUGH (NOT blocked)            : [ 'https://www.googletagmanager.com/gtag/js?id=G-X',
                                          'https://googletagmanager.com/gtag/js?id=G-Y' ]
```

**אפס נחסמו — כולל צורת הדומיין החשוף.** וה-trace מהריצה האמיתית מאשש שזה לא תיאורטי:

```
200  https://www.googletagmanager.com/gtag/js?id=G-VC8PKL4NL1
     https://www.google-analytics.com/g/collect?…&en=page_view&dl=https%3A%2F%2Fswing-edge.com%2Fapp
```

`gtag.js` נטען עם 200 ו-**page_view נשלח בפועל** ל-`G-VC8PKL4NL1`.

ההערה בשורות 16-17 של אותו קובץ אומרת בדיוק מה זה שובר:
*"Never let CI traffic reach GA4. sentinel.yml alone is 48 runs/day against ~29 real users."*
ההערה צודקת, המנגנון שהיא מתארת מעולם לא עבד. סדר גודל: **Sentinel 48 ריצות/יום × ~3
טעינות דף ≈ 144 page_views סינתטיים ביום**, מול 41 נרשמים **בסך הכל**, ועוד smoke על כל push.

זה נוגע ישירות ב-`INCIDENTS.md#12` וב-משימה U: הסיבה שהמדידה "לא ניתנת למדידה" אולי
אינה רק טוקני Supabase. **⛔ לא נוגע בזה בגל הזה** — זה שינוי לוגיקת בדיקות בשלושה
קבצים ושייך ל-U, לא ל-W. ⚠️ שורה ב-`STATE.md` באותו קומיט.

⚠️ **`Failure Alert` אינו מנוטר על ידי אף גורם.** הוא `workflow_run` ולכן אינו בטבלת
ה-max-age של Watchdog, ואינו ברשימת 11 ה-workflows של עצמו. אם הוא נשבר, **11
workflows מאבדים את ערוץ הכשל שלהם בשקט**. ⚠️ שורה ב-`STATE.md`; התיקון (הוספתו
לרשימת Triage) הוא שינוי לוגיקה ⛔ לא בגל הזה.

---

## 8. ניתוח השלכות (§8)

הפילטר תפס: **רץ אוטומטית בפרודקשן = כן.** (DB לא · כסף/מיילים לא · סוד לא · בלתי הפיך לא.)

| ציר | הערכה |
|-----|--------|
| משתמשים | **אפס.** אין נגיעה ב-`src/`, ב-`api/` או ב-`index.html`. אף שינוי אינו מגיע לדפדפן של משתמש |
| נתונים | אין מיגרציה, אין כתיבה. `cache@v4→v6` עלול לפסול מפתחות cache קיימים → ריצה אחת איטית יותר, ותו לא |
| עלות | +2 בדיקות × ~4ש על push ועל cron יומי ≈ **+3 דקות Actions לחודש**. שלילת בדיקת ה-API מה-project המובייל **מונעת** הכפלה של קריאות `/api/quote` לפרודקשן |
| תקרות ספק | ללא שינוי. הכפלת `/api/quote` נמנעה במפורש (§4) |
| אבטחה | אין סוד חדש. שדרוגי `checkout`/`setup-node` **מקטינים** חשיפה (ריצה נתמכת) |
| תחזוקה | §3: מוריד עבודה ידנית — כשל smoke עתידי יאמר מי נכשל במקום לחייב הורדת trace, כפי שנדרש כאן |
| הפיכות | `git revert` לכל קומיט. אין state חיצוני |
| כשל שקט | **זה הציר היחיד המסוכן.** תרחיש: `setup-node@v7` משנה ברירת מחדל של cache, `npm ci` נכשל, ו-Build/Smoke נופלים על כל push. **גלוי מיידית ורועש** — מקובל. התרחיש ההפוך, שדבר לא ייכשל אך ה-cache ידמם, נתפס ב-Watchdog ובזמני הריצה |

**פסק דין: ✅ בצע** ל-2א · 2ב · §4. **⛔ אל תבצע** ל-2ג (`send-mail`) ול-§7 (דליפת GA4).
**⏸️ ממתין להכרעת ניב:** §3 קומיט 4.

---

## 9. §10.1 — פריטים שנשארים בלי ביצוע, לשורה ב-`STATE.md`

- ⏸️ **`action-send-mail@v3 → v18`** — 15 מייג'ורים × 9 נקודות, כולל אזעקת `restore-drill`. גל משלו עם `workflow_dispatch` מוכח לכל נתיב
- 🔴 **`blockAnalytics()` הוא no-op ב-3 קבצים** — CI מזרים page_views אמיתיים ל-`G-VC8PKL4NL1`. שייך ל-U
- ⚠️ **`Failure Alert` בלי מנטר** — כשל שלו מוחק את ערוץ הכשל של 11 workflows
- ⏭️ **`STATE.md` טוען "שש הסתעפויות"; בפועל project מובייל מכסה 1–2.** לתקן את השורה
- ⏭️ **#2 `clipboard` ו-#3 `matchMedia` דורשים בדיקות הסרת-יכולת** (`addInitScript` + `delete`), לא אמולציית מכשיר
- ⏸️ **כיסוי iOS אמיתי** דורש WebKit או מכשיר; אמולציית iPhone ב-Chromium תיתן ירוק שקרי

---

## 10. אחרי אישור

`npm run verify` מלא (פלט מודבק) · `STATE.md` + `DECISIONS.md` באותו קומיט ·
`INCIDENTS.md` אם קומיט 4 מאושר · בלי force · דיווח: hashes + סיימתי ✅
