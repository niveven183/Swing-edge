# PLAN 2026-08-06 — S2: הקשחה

**סטטוס:** awaiting approval
**HEAD בזמן הכתיבה:** `c430cb7`
**תאריך:** 2026-08-06 (אומת מול `git log -1 --date=short`)

---

## 0. תקציר ההכרעות

| § | נושא | הכרעה |
|---|------|--------|
| 1 | JWT לשלושה endpoints | **לא מיישם כפי שנתבקש.** הפרמיסה שגויה בשלושתם. מיישם במקום זאת אימות-טוקן אופציונלי ב-`feedback.js` שסוגר התחזות |
| 2 | CSP | **אפס שינוי.** אי-אפשר לאמת שהדוח נקי — אין דוח. מתעד את תנאי האכיפה |
| 3 | fontshare | מותנה רישוי: מתיר → self-host; לא ברור → טעינה לא-חוסמת |
| 4.1 | `api/ocr.js` | גל נפרד |
| 4.2 | `api/health.js` | סיכון מקובל |
| 4.3 | workflows מייל/דיסקורד | סיכון מקובל |
| 4.4 | `scripts/analyst\|arch-auditor\|data-guardian` | סיכון מקובל + שורת ⚠️ |
| 4.5 | `SwingEdge_App.jsx` `catch {}` | **חסום — דורש הסרת איסור מפורשת מניב** |

---

## 1. §1 — ה-JWT

### 1.1 מפת הקריאות — מי קורא, האם מחובר, מה נשבר

| endpoint | מי קורא | מחובר? | מה נשבר אם נדרוש טוקן |
|----------|---------|--------|------------------------|
| `api/waitlist.js` | — | — | **הקובץ לא קיים** |
| `api/feedback.js` | `FeedbackTab` → `SwingEdge_App.jsx:6706` | **לפעמים** | מסלול הדיווח של מי שתקוע לפני login |
| `api/notify.js` | `AdminPanel` (אדמין בלבד) | תמיד | — כבר יש JWT |

### 1.2 הממצאים

**`api/waitlist.js` — אינו קיים.** ההרשמה לרשימת המתנה היא `insert` ישיר מהדפדפן ל-Supabase
ב-anon key:

```
src/components/LandingPage.jsx:538-539
  .from("waitlist")
  .insert({ email: clean, source: utm.source, campaign: utm.campaign });
```

אין endpoint לשים עליו JWT. וגם אם היה — הנרשם לרשימת המתנה **לא יכול** להיות מחובר;
זו כל המהות. JWT כאן הוא סתירה עצמית.

**`api/notify.js` — כבר מוקשח, ויותר מכל השאר.** נולד ב-U *עם* ההקשחה, לא בלעדיה:

- `verifyUser()` מול `/auth/v1/user` — `api/notify.js:53-69`, נאכף ב-`:190-194` (401)
- שער אדמין ב-DB דרך `is_admin` על ה-JWT של הקורא — `:235-239` (403)
- rate limit לפי `user.id` (לא IP, לא ניתן להשלה ע"י רוטציית IP) — `:200-210`
- ליגר `reply:<feedback_id>` ייחודי לכל שורה — `:259-268`, נכשל-סגור אם הליגר לא נקרא (`:105-108`)

**אין מה להקשיח כאן. הפריט יורד.**

**`api/feedback.js` — אין אימות, וזו החלטה מכוונת ומתועדת:**

```
api/feedback.js:23-24
  // CORS — restricted to the app's own origins. Deliberately NO auth gate: a
  // user who is stuck before login must still be able to report it.
```

### 1.3 ⛔ הפרצה האמיתית — אחרת מזו שנקראה

הבעיה ב-`feedback.js` אינה "אין JWT". היא ש**הזהות נטענת ע"י הקורא ואינה מאומתת**:

```
api/feedback.js:75-76
  user_id:    body.user_id ?? null,
  user_email: typeof body.user_email === "string" ? body.user_email : "anonymous",
```

ויש לזה השלכה שיוצאת מהטבלה אל העולם. `api/notify.js` שולף את הנמען **מאותה שורה**:

```
api/notify.js:253
  const recipient = String(row.user_email || "").trim();
```

**שרשרת התקיפה:** תוקף שולח `POST /api/feedback` עם `user_email` שרירותי → נוצרת שורה →
אדמין רואה פידבק לגיטימי ולוחץ "השב" → **SwingEdge שולחת מייל ממותג משלה לכתובת של זר.**
הליגר לא עוזר: הוא מונע כפילות, לא נמען מזויף.

`notify.js` כבר מכיר בסיכון — וממתן רק את התצוגה:

```
api/notify.js:115-117
  // This exists because feedback.user_email is caller-asserted: api/feedback.js has
  // no auth gate BY DESIGN (a user stuck before login must still be able to report),
  // so a feedback row can name any address at all.
```

המיסוך (`maskEmail`) מגן על העין של האדמין. הוא **אינו** מונע את השליחה.

### 1.4 ההכרעה: אימות טוקן **אופציונלי**

JWT חוסם — ⛔ **לא.** הוא ישבור את מסלול הכניסה היחיד ולא יסגור את הפרצה של
משתמשים אנונימיים לגיטימיים.

**מה כן:**

| מצב הבקשה | התנהגות |
|-----------|----------|
| `Authorization: Bearer` תקין | גוזרים `user_id` + `user_email` **מהטוקן**. מתעלמים לחלוטין מהגוף |
| אין header | מקבלים (המסלול הציבורי נשמר), אך **כופים** `user_id=null`, `user_email="anonymous"` |
| header קיים אך פסול | **401** — טוקן שבור הוא סימן תקיפה, לא משתמש אנונימי |

**מדוע זה נכון:** מסלול הציבור שורד ללא שינוי; ההתחזות נסגרת לחלוטין; **אפס שינוי סכימה**
(אין מיגרציה — עומד באיסור הגל). מי שלא מחובר פשוט לא יכול יותר *לטעון* שהוא מישהו.

**נגזרת ל-`notify.js`:** אחרי השינוי, נמען אמין רק לשורות **חדשות**. שורות ישנות נשארות
caller-asserted. `notify.js` לא משתנה בגל הזה — המיסוך + אישור האדמין בעין נשארים ההגנה
על ההיסטוריה. שורה ב-⚠️.

**חלופות שנשקלו:**

- **Turnstile** — כבר משולב בריפו (`src/components/AuthScreen.jsx:103` → `api/verify-turnstile.js`),
  כלומר תבנית מוכחת ולא ספקולציה. **מתאים ל-waitlist** (טופס ציבורי אמיתי חשוף לבוטים) —
  גל נפרד. **לא מתאים לפידבק:** משתמש שכבר מתוסכל מספיק כדי לכתוב לנו לא יעבור CAPTCHA.
- **rate limit הדוק יותר** — כבר קיים (3/דקה לפי IP, `feedback.js:32-35`). הידוק לא סוגר התחזות,
  רק מאט אותה.
- **אימות origin** — כבר קיים דרך `applyCors`. לא רלוונטי: `Origin` אינו סוד ואינו זהות.
- **שדות חתומים** — פותר, אבל דורש ניהול מפתח. הטוקן כבר חתום; אין סיבה להמציא מנגנון שני.

### 1.5 קבצים

- `api/feedback.js` — `verifyUser` אופציונלי; זהות מהטוקן בלבד
- `src/components/FeedbackTab.jsx:160-161` — לצרף את הטוקן כשיש session; **להפסיק** לשלוח
  `user_id`/`user_email` בגוף

---

## 2. §2 — CSP

⛔ **אין שינוי ב-CSP בגל הזה. לא אכיפה, לא הוספה, לא הסרה.**

### 2.1 "אמת שהדוח נקי" — אי-אפשר. אין דוח.

ב-`vercel.json:18` הכותרת היא `Content-Security-Policy-Report-Only`, אבל:

```
grep -c "report-uri\|report-to" vercel.json  →  0
```

**אין `report-uri` ואין `report-to`.** Report-Only בלי אספן = הדפדפן מחשב את ההפרה,
כותב אותה ל-console של המשתמש, וזורק. **אף אחד לא ראה דוח מעולם** — לא נקי ולא מלוכלך,
לא לפני U ולא אחרי W. השאלה "האם הדוח נקי אחרי RouteTracker ו-blockAnalytics" אינה ניתנת
למענה, כי הנתון לא נאסף מעולם ואינו נאסף כרגע.

זה בדיוק "כשל שקט" (CLAUDE.md §2): כותרת שנראית כמו הגנה פעילה ואינה מייצרת שום אות.

### 2.2 ⚠️ "חסר `api/notify.js` ב-CSP" — טעות קטגוריה, הפריט יורד

`api/notify.js` הוא serverless function. קריאותיו — Supabase REST, webhook של דיסקורד, SMTP —
הן **server-to-server מתוך Node**. CSP נאכף ע"י **הדפדפן** על מה שהדף טוען/מבקש.
קוד צד-שרת אינו בתחום השיפוט של CSP כלל. `notify.js` **אינו צריך ולא יכול** לקבל רשומת CSP.

### 2.3 fontshare — כבר שם

`https://api.fontshare.com` ב-`style-src`, `https://cdn.fontshare.com` ב-`font-src`. תקין. ראה §3.

### 2.4 מה צריך לקרות כדי שנוכל לאכוף, ואיך נדע

| # | תנאי | איך יודעים שהושג |
|---|------|-------------------|
| 1 | קיים אספן הפרות | `report-to` מוגדר + endpoint שמחזיר 2xx על POST אמיתי |
| 2 | ההפרות נשמרות ונראות | אפשר לשאול "כמה הפרות ב-7 הימים האחרונים, לפי directive" ולקבל מספר עם מונה ומכנה |
| 3 | חלון תנועה אמיתית נקי | N ימים רצופים, **אפס** הפרות ממשתמשים אמיתיים, על כל המסלולים: landing, auth, app, TradingView, Turnstile, OCR |
| 4 | הליכה מלאה ידנית | מסלול מלא בדפדפן עם console פתוח, אפס הפרה |

**האספן עצמו הוא גל נפרד** — הוא משטח חדש (endpoint ציבורי שמקבל POST מכל דפדפן בעולם,
כלומר צריך rate limit משלו). ⚠️ **הריפו ציבורי** — דוחות הפרה לא יורדים ל-artifacts של
Actions ולא ללוגים ציבוריים; הם מכילים URLים של משתמשים.

**רק אחרי 1–4 מציגים לניב הכרעה נפרדת על מעבר לאכיפה.**

---

## 3. §3 — fontshare

### 3.1 ⚠️ "אין fallback" — לא מדויק. יש.

```
tailwind.config.js:31      sans: ['General Sans', 'Inter', 'system-ui', 'sans-serif'],
src/design/tokens.css:68   --font-display: 'General Sans', 'Inter', system-ui, sans-serif;
src/design/tokens.css:69   --font-body:    'General Sans', 'Inter', system-ui, sans-serif;
index.html:155             font-family:'General Sans','Inter',system-ui,-apple-system,sans-serif;
```

שרשרת נפילה מלאה קיימת בכל שלושת המקומות. `Inter` נטען ממקור **אחר** (Google Fonts,
`index.html:55`), כך שה-500 של fontshare ב-05.08 נחת על Inter — **לא** על עמוד ערום.

**החומרה האמיתית: קוסמטית (החלפת גופן), לא שוברת.** זה משנה את סדר העדיפות של הסעיף.

### 3.2 מה כן נשאר בעייתי

`index.html:56` הוא `<link rel="stylesheet">` — **חוסם רינדור**. ספק שלישי שמחזיר 500
(או, גרוע יותר, נתקע) יכול לעכב את הצביעה הראשונה. זו הבעיה, לא ה-fallback.

### 3.3 ההכרעה — מותנית רישוי

⛔ **לא אצהיר שהרישיון מתיר self-host לפני שאקרא אותו.** הבדיקה קודמת להכרעה.

| ענף | תנאי | פעולה |
|-----|------|--------|
| **א** | הרישיון מתיר אירוח עצמי של webfont | מורידים woff2 ל-`public/fonts/`, `@font-face` מקומי, מוחקים `index.html:56` + ה-`preconnect` (`:54`), **ומסירים `api.fontshare.com` + `cdn.fontshare.com` מה-CSP** — יתרון כפול כפי שצוין |
| **ב** | הרישיון אינו מתיר / לא ברור | **לא מארחים.** הופכים את הטעינה ללא-חוסמת, ה-fallback ל-Inter נשאר ההתנהגות המוצהרת |

ענף א' הוא היעד הנכון: מסיר שני מארחים מה-CSP (מקרב את §2), מסיר צד שלישי חוסם-רינדור,
ומוחק את מחלקת התקלה שהסנטינל תפס — במקום למתן אותה.

---

## 4. §4 — חמש ההכרעות

### 4.1 `api/ocr.js` — **גל נפרד**

⚠️ **"אפס רישום" חצי-שגוי.** יש שער ויש תקרה:

```
api/ocr.js:323-327   const user = await verifyUser(req);  →  401
api/ocr.js:330-338   rateLimit(`${user.id}:ocr:min`,  max: 10)   // 10/דקה
                     rateLimit(`${user.id}:ocr:hour`, max: 60)   // 60/שעה
```

**מה שבאמת חסר:** מדידת עלות — אפס טוקנים, אפס עלות, אפס ייחוס לכל קריאה.

**החור האמיתי, שלא נקרא בשמו:** `rateLimit` הוא in-memory לכל מופע Lambda (כמתועד בכותרת
`api/_lib/rateLimit.js`). תחת concurrency, N מופעים = N×60 קריאות בשעה. התקרה **רכה**.

**למה לא S2:** מונה עמיד ורישום עלות מחייבים טבלה → **מיגרציה** → אסור בגל הזה במפורש.
תיקון חלקי כאן גרוע מדחייה מסודרת: הוא ייראה כמו הגנה בלי להיות כזו. → `docs/STATE.md` ⏭️

### 4.2 `api/health.js` — **סיכון מקובל**

ה-`*` מכוון ומתועד בקוד עצמו:

```
api/health.js:156-160
  // CORS stays wide open here — unlike every other endpoint. This probe is
  // consumed by EXTERNAL monitors (UptimeRobot, per docs/ARCHITECTURE.md) plus
  // sentinel.yml and fleet-weekly.yml. Narrowing it to our own origins would
  // break external uptime monitoring, which is the whole point of the endpoint.
  res.setHeader("Access-Control-Allow-Origin", "*");
```

**מה הגוף מחזיר** (`api/health.js:193-216`, נקרא ואומת): `{ status, checks, warnings?, failing? }`
כאשר `checks[name]` = **מילישניות בלבד**, ו-`failing`/`warnings` = **שמות שירותים**.
אפס סודות, אפס משתני סביבה, אפס גרסאות, אפס שמות מארח פנימיים, אפס ספירות שורות.

החשיפה היחידה: שמות הספקים שאנחנו תלויים בהם (supabase, finnhub, twelvedata, coingecko,
frankfurter) וזמני התגובה שלהם. זה לא סוד ואינו ניתן לנשק.

**"עוקף `_lib/cors.js`" נכון עובדתית ושגוי כמסקנה** — העקיפה היא התכלית. צמצום ל-origins
שלנו ישבור ניטור זמינות חיצוני, כלומר יהרוג את ה-endpoint. **לא נוגעים.** → `DECISIONS.md`

### 4.3 8 workflows מייל + 11 פוסטרי דיסקורד — **סיכון מקובל**

המספרים בפועל (נמדדו, לא הוערכו):

| מדד | פקודה | תוצאה |
|-----|-------|--------|
| workflows עם שורת `to:` | `grep -rh "to:" .github/workflows/*.yml` | **9/9 → `niveven183@gmail.com`** |
| workflows שמזכירים DISCORD | `grep -rln "DISCORD" .github/workflows/` | **14** (לא 11) |

כלומר: **9 מתוך 9 שולחי המייל בעלי `to:` קשיח שולחים לניב בלבד.** ליגר לנמען יחיד ידוע
הוא תקורה בלי תועלת — שליחה כפולה לעצמך אינה תקלה.

השולח היחיד שנוגע במשתמשים אמיתיים הוא `email-campaign.yml`, שנמעניו מגיעים מה-DB —
**ולו יש ליגר**: `email_campaign_log`, `ON CONFLICT DO NOTHING`, ובדיקת `status='sent'` **לפני**
השליפה. ריצה חוזרת או push שגוי **לא** ישלחו כפול.

**"אפס ליגר שליחה" שגוי בדיוק במקום היחיד שבו זה משנה.** דיסקורד: 14 פוסטרים ללא ליגר —
מקובל, הודעה כפולה לערוץ פנימי אינה נזק. → `DECISIONS.md`

### 4.4 `scripts/analyst|arch-auditor|data-guardian` — **סיכון מקובל + שורת ⚠️**

| סקריפט | מה נקרא | מה **נשלח** ל-LLM |
|--------|----------|---------------------|
| `analyst` | DB פרודקשן | **אגרגטים בלבד** (n, winRate, CI, expR) — לא שורות |
| `arch-auditor` | קוד מקור | ממצאי `file:line` + טקסט המלצה — לא ערכי סודות |
| `data-guardian` | DB פרודקשן | סוג בעיה + ספירה + `sample_ids` (UUID) — לא נתוני עסקה |

אף אחד מהשלושה אינו שולח PII או שורות מלאות. **הטענה "נתוני פרודקשן ל-LLM" מוגזמת** —
מה שעובר הוא סטטיסטיקה ומזהים.

⚠️ **מה שכן דורש שמירה:** הריפו **ציבורי**, ולוגי Actions קריאים לכל העולם. הסיכון אינו
המצב היום אלא **סחיפה**: שינוי עתידי שיתחיל להדפיס שורות מלאות ייחשף מיידית ובשקט.
מקובל היום → שורת ⚠️ ב-`docs/STATE.md` כדי שזה לא ייעלם.

### 4.5 `SwingEdge_App.jsx` — **חסום עליך**

⚠️ **שניים, לא אחד** — `1665` (עסקאות) ו-`1670` (watchlist):

```
SwingEdge_App.jsx:1663-1671
  // Persist trades to localStorage
  useEffect(() => {
    try { localStorage.setItem("swingEdgeTrades", JSON.stringify(trades)); } catch {}
  }, [trades]);

  // Persist watchlist to localStorage
  useEffect(() => {
    try { localStorage.setItem("swingEdgeWatchlist", JSON.stringify(watchlistItems)); } catch {}
  }, [watchlistItems]);
```

`catch {}` ריק פעמיים. ב-`QuotaExceededError` השמירה המקומית מתה — **אפס console, אפס טוסט,
אפס אינדיקציה.** המשתמש ממשיך לעבוד מתוך הנחה שנשמר, ומגלה ברענון.

זו הפרה מדויקת של CLAUDE.md §2 ("`catch` ריק — באג"), והתיקון הוא 2 שורות.

⛔ **אבל הבריף אוסר במפורש:** "אל תיגע ב-`SwingEdge_App.jsx` מלבד §3 אם נדרש."
**אני לא עוקף איסור כי התיקון קטן.** שתי אפשרויות, ההכרעה שלך:

- **א** — מסיר את האיסור לשתי השורות האלה → נכנס ל-S2 כקומיט נפרד
- **ב** — האיסור נשאר → `docs/STATE.md` ⏭️ לגל הבא

**ברירת מחדל אם לא תאמר כלום: ב'.**

---

## 5. פיצול קומיטים

| # | קומיט | קבצים |
|---|--------|--------|
| 1 | `docs(plan): S2 — הקשחה — awaiting approval` | קובץ זה ← **העצירה** |
| 2 | `fix(feedback): זהות מהטוקן ולא מגוף הבקשה` | `api/feedback.js`, `src/components/FeedbackTab.jsx` |
| 3 | `chore(fonts): <לפי ענף הרישוי>` | `index.html`, `public/fonts/*`, `src/design/tokens.css`, `vercel.json` (ענף א' בלבד) |
| 4 | `docs(state+decisions): תנאי אכיפת CSP + חמש הכרעות §4` | `docs/STATE.md`, `docs/DECISIONS.md` |

קומיט 4 נבלע בקומיט 2 או 3 אם הכלל "STATE באותו קומיט" (CLAUDE.md §10) מחייב זאת —
`DECISIONS.md` הוא append-only, שורה מתוארכת חדשה בלבד.

## 6. גבולות הגל

⛔ אפס מיגרציות · אפס DB · אפס מיילים · אפס שינוי CSP · אפס מעבר לאכיפה
⛔ אפס נגיעה ב-`notify.js` · `health.js` · `ocr.js` · אפס force-push
⛔ `SwingEdge_App.jsx` — רק אם ניב מסיר את האיסור במפורש (§4.5)

## 7. אימות

`npm run verify` מלא, פלט מודבק במלואו. `api/feedback.js` אינו מכוסה ע"י חוליה ייעודית
בשרשרת — לכן בנוסף: הליכה ידנית על שני המסלולים, **מחובר ולא-מחובר**, ו-⚠️ אימות מפורש
ששליחת פידבק **בלי** session עדיין מחזירה 200. שבירת המסלול הציבורי היא הכשל היחיד
שהגל הזה לא מרשה לעצמו.
