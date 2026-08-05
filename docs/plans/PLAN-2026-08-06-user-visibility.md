# PLAN 2026-08-06 — U: נראות ומענה למשתמשים

**סטטוס:** awaiting approval
**מודל:** Opus · **ריפו:** niveven183/Swing-edge · **בסיס:** `f7ebf5f`
**Skills:** `skills/email-campaign/SKILL.md` (נקרא)

---

## Safety gate

```
$ git remote -v | head -1
origin	https://github.com/niveven183/Swing-edge (fetch)

$ git pull origin main && git status
Already up to date.
On branch main
Your branch is up to date with 'origin/main'.
nothing to commit, working tree clean

$ git branch -r --contains f7ebf5f
  origin/HEAD -> origin/main
  origin/main
```

תיקון ה-capture (`f7ebf5f`) **נדחף**. עץ נקי. סשן יחיד. ✅

---

## §0 — אימות הנחות (read-only, בוצע)

כל מספר בפרומפט נמדד מחדש מול פרודקשן דרך מחבר Supabase, `SET default_transaction_read_only = on` בכל שאילתה.

| נמסר בפרומפט | נמדד 2026-08-06 | פסק |
|---|---|---|
| 41 נרשמו | 41 | ✅ |
| 12 עם עסקאות (29%) | 12/41 נרשמים = 29% — **גולמי** | ✅ |
| 31 תקועים | 31 — **אחרי סינון ייבוא** (41 − 10) | ✅ מכנה שונה |
| חציון ימים לעסקה ראשונה 0.4 | 0.37 מסונן־ייבוא · 0.01 גולמי | ✅ |
| 22 מהם joined==last_seen | 21 (<דקה) · 24 (<10 דק') מתוך 31 | ≈ סחיפה קלה |
| 5 פידבקים פתוחים מ-31.07 | 5 לא-resolved מתוך 8 סה"כ | ✅ |
| 0 mentorships | 0 שורות, 0 פעילים | ✅ |

### ⚠️ ממצא: שני המספרים הראשיים אינם מאותה אוכלוסייה

`12 עם עסקאות` הוא **גולמי**; `31 תקועים` הוא **אחרי סינון ייבוא**. 12 + 31 = 43 ≠ 41.
הפער הוא 2 משתמשים שכל עסקאותיהם הן שאריות ייבוא — נספרים כ"עם עסקאות" בגולמי
וכ"תקועים" במסונן.

**תיקון לדיווחים הבאים:** לבחור אוכלוסייה אחת ולהיצמד אליה —
`10/41 נרשמים = 24%` (מסונן) **או** `12/41 נרשמים = 29%` (גולמי). לא לערבב.
זה בדיוק `CLAUDE.md` §2 — "אפס מנה בלי מכנה".

### המספר החד שלא נמסר

**5/41 נרשמים = 12% הגיעו לעסקה שנייה.** 12 פתחו עסקה אחת; רק 5 פתחו שנייה.
"עסקה ראשונה" אינה המשוכה — המשוכה היא השנייה.

---

## §1 — `/api/notify` — שליחה לנמען יחיד

### מיפוי צרכנים

| צרכן | מצב |
|---|---|
| קוד קיים | **אין**. אף מודול לא קורא לנתיב הזה היום |
| ידני | `curl` עם JWT של אדמין — מסלול הבדיקה של §5 |
| עתידי | כפתור "השב" ב-`AdminPanel` פאנל הפידבק — **לא בגל הזה** |
| `api/send-invites.js` | ⛔ לא נגענו. איסור מפורש ב-`skills/email-campaign/SKILL.md` |

### מה נשמר ומה משתנה

| נשמר | משתנה |
|---|---|
| `api/send-invites.js` — אפס שינוי | `api/notify.js` — **קובץ חדש** |
| כל 16 ה-RPC של `admin_*` | `vercel.json` — רשומת `functions` חדשה |
| סכימת `email_campaign_log` | — |
| `public.is_admin()` | — |

### ⛔ אפס מיגרציות — אומת בקוד

- `public.is_admin()` — `20260719120000_admin_rpcs.sql:56`, כבר
  `grant execute … to authenticated`. נגיש דרך `rpc/is_admin` עם ה-JWT של הקורא.
- `public.admin_log_campaign_send(text, jsonb)` — `20260725150000_invite_send_rpcs.sql:146`,
  כבר בודק `is_admin()` בפנים, כבר אידמפוטנטי מול `email_campaign_log_uniq`.
- `public.admin_feedback_list()` — `20260719120000_admin_rpcs.sql:331`, מחזיר
  `id, user_id, user_email, type, message, status, created_at`.
- `email_campaign_log` — `campaign` הוא `text` בלי CHECK. `reply:<uuid>` = 43 תווים. נכנס.

**אין עמודה חדשה, אין פונקציה חדשה, אין policy חדשה.**

### חוזה

```
POST /api/notify
Authorization: Bearer <supabase access token>
body: { feedback_id: uuid, template: "fix_mobile_upload" | "files_received", dry_run?: boolean }

200 { sent, failed, recipient_masked, campaign }      # recipient_masked = "om***@domain"
200 { sent: 0, reason: "already_sent" }               # dedup
401 { error: "unauthorized" }                          # JWT חסר/פסול
403 { error: "forbidden" }                             # JWT תקין, לא אדמין
400 { error: "invalid_template" | "invalid_feedback_id" }
404 { error: "feedback_not_found" }
429 { error: "rate_limited", retryAfter }
500 { error: "config_error" }
```

### שערים

1. **CORS** — `resolveOrigin` בדפוס `send-invites.js`. ⛔ לא `*`.
2. **JWT** — `verifyUser` מול GoTrue, בדפוס `api/ocr.js:280` / `api/send-invites.js:44`.
3. **אדמין** — `POST /rest/v1/rpc/is_admin` עם ה-JWT של הקורא. חייב להחזיר `true`
   בדיוק. כל דבר אחר → 403.
   ⛔ **אפס service-role key.** ההרשאה נבדקת בבסיס הנתונים, לא כאן — לקוח לעולם
   לא יכול להרחיב אותה.
4. **תבנית** — allowlist קשיח בקוד:
   ```js
   const TEMPLATES = {
     fix_mobile_upload: { file: "emails/fix_mobile_upload.html", subject: "מצאנו — ותוקן" },
     files_received:    { file: "emails/files_received.html",    subject: "הקבצים שלך התקבלו" },
   };
   ```
   ⛔ הבקשה **לא** מוסרת HTML ו**לא** מוסרת נתיב. חוסם גם הזרקת HTML לגוף המייל
   וגם path traversal אל קבצים אחרים בריפו.
5. **נמען** — נפתר **בשרת** מ-`feedback_id` דרך `admin_feedback_list()`.
   ⛔ לעולם לא מגוף הבקשה.

### 🔴 ממצא אבטחה שמזין את התכנון

`api/feedback.js` חסר שער אימות **במכוון** (`api/feedback.js:23-25` — "משתמש שתקוע
לפני login חייב עדיין להיות מסוגל לדווח"). התוצאה: `feedback.user_email` הוא
**קלט שנטען על ידי הקורא ואינו ניתן לאימות**.

תרחיש: תוקף מזין שורת פידבק עם כתובת של אדם שלישי. אדמין רואה פידבק לגיטימי-למראה,
לוחץ "השב", ו-SwingEdge שולחת מייל ממותג לאדם שמעולם לא נרשם.

**הגנה שנבחרה:** `dry_run: true` מחזיר את הכתובת **ממוסכת** (`om***@domain`).
האדמין מאשר בעין לפני שליחה חיה. זה מקיים "⛔ אפס כתובות מייל בפלט" ועדיין
מייצר ודאות. ⛔ לא נבחרה חלופה של אימות מול `auth.users` — היא דורשת RPC חדש,
כלומר מיגרציה.

### dedup

`campaign = "reply:<feedback_id>"` — מזהה ייחודי לכל פידבק.

1. **לפני שליחה:** קריאה ל-`email_campaign_log?campaign=eq.reply:<id>&status=eq.sent`
   עם ה-JWT של הקורא (מדיניות `email_campaign_log_admin_select` מתירה לאדמין).
   קיימת שורה → `200 {sent:0, reason:"already_sent"}` בלי לשלוח.
2. **אחרי שליחה:** `admin_log_campaign_send("reply:<id>", [{email,status,error}])`.
   `ON CONFLICT DO NOTHING` מול `email_campaign_log_uniq (campaign, lower(email))`.

**הליגר הוא התקרה האמיתית: שליחה אחת לכל `feedback_id`, לתמיד.**

### rate limit — ההצעה ונימוקה

```
`${user.id}:notify:10m`  → windowMs 10 דק',  max 3
`${user.id}:notify:24h`  → windowMs 24 שעות, max 20
```

**נימוק:**
- מענה לפידבק הוא פעולה אנושית מכוונת, לא לולאה. 3 ל-10 דקות מכסה סבב טריאז'
  של תור הפידבק (5 פתוחים היום) בלי לחסום עבודה אמיתית.
- 20 ל-24 שעות נשאר הרחק מתקרת Gmail (~300/יום), שמשותפת עם
  `email-campaign.yml` ועם `send-invites.js` — נותר מרווח לקמפיין §4 באותו יום.
- **הגילוי הנאות:** `_lib/rateLimit.js` הוא in-memory לכל instance של Lambda
  ומתאפס ב-cold start. הוא **אינו** תקרה גלובלית, והקובץ אומר זאת בעצמו.
  התקרה הקשיחה כאן היא ה-dedup, לא ה-rate limit.

### ⚠️ `vercel.json` — כשל שקט שנמנע מראש

`vercel.json` מגדיר `includeFiles: "emails/**"` **רק** ל-`api/send-invites.js`.
Vercel file tracing לא עוקב אחרי `path.join` בזמן ריצה. בלי רשומה מקבילה
ל-`api/notify.js`, קריאת התבנית תיכשל ותיפול ל-fallback — כלומר המייל **יישלח,
בעיצוב הלא נכון, בשקט**. הרשומה נוספת באותו קומיט.

### פרטיות — מה לא נשלח

⛔ אפס כתובות מייל בגוף התשובה (רק ממוסך), ב-`console`, ובדיווח לדיסקורד.
⛔ אפס תוכן פידבק (`message`) יוצא מהפונקציה.
⛔ אפס user id בדיסקורד.
דיווח דיסקורד: שם קמפיין + `sent`/`failed` בלבד, בדפוס `send-invites.js:118`.

### ⚠️ חוב ידוע שנולד עם הנתיב

`/api/notify` נולד **לא-מוגן ל-CSP ול-JWT מוקשח**, בדיוק כמו `api/feedback.js`
ו-`waitlist`. נכנס ל-⏭️ ב-`docs/STATE.md` כפריט S2 אחד: **הקשחה אחת לשלושה נתיבים**,
לא שלוש הקשחות נפרדות.

---

## §2 — GA4: אירועי היסטוריה ב-SPA

### מיפוי צרכנים

| קובץ | תפקיד |
|---|---|
| `index.html:106-137` | בלוק gtag — consent default, replay, `config` |
| `src/main.jsx:64-73` | `<BrowserRouter>` — נקודת ההזרקה של המאזין |
| `src/lib/consent.js:110` | `trackEvent` — **כבר קיים ומגודר-הסכמה**. שימוש חוזר, לא כתיבה מחדש |
| `SwingEdge_App.jsx:2406` | מסלול שמירת עסקה — נקודת `first_trade_saved` |

### מה נשמר ומה משתנה

| נשמר | משתנה |
|---|---|
| סדר בלוק ה-consent ב-`index.html` (load-bearing) | `config` — מקבל `page_location` מנוקה |
| `trackEvent` — החתימה וההתנהגות | `src/main.jsx` — קומפוננטת `RouteTracker` |
| `ocr_result` — 3 קריאות קיימות | `SwingEdge_App.jsx` — קריאת `first_trade_saved` |
| מזהה המדידה `G-VC8PKL4NL1` | — |

### האם הנתיב נושא מזהה — התשובה

**הנתיב עצמו: לא.** `src/main.jsx:65-70` מגדיר בדיוק 4 נתיבים:
`/` · `/app` · `/terms` · `/privacy`. הטאבים בתוך `/app` הם
`useState` (`SwingEdge_App.jsx:1261`), לא נתיבים — הם לא מייצרים ניווט ולא ייספרו.

מכאן שהפער אמיתי אבל צר: משתמש שנוחת על `/` ועובר ל-`/app` בניווט צד-לקוח
אינו מייצר `page_view` שני. `/app` נראה מת בדיוק בגלל זה.

**נשלח מ-allowlist** של ארבעת הנתיבים; כל ערך אחר ממופה ל-`/other`.
⛔ בלי `location.search`, ⛔ בלי `location.hash`.

### 🔴 דליפה קיימת — הממצא החמור ביותר בגל הזה

`src/supabaseClient.js:13` מגדיר `detectSessionInUrl: true`.
`src/components/AuthScreen.jsx:138` (OAuth) ו-`src/components/ForgotPassword.jsx:35`
(שחזור סיסמה) מחזירים את המשתמש לאתר, ו-Supabase מצרף
`#access_token=…&refresh_token=…` ל-URL.

`index.html:135` קורא `gtag('config', 'G-VC8PKL4NL1', { …, send_page_view: true })`.
ברירת המחדל של gtag ל-`page_location` היא `document.location.href` — **כולל ה-hash**.

**כלומר טוקני גישה ורענון עשויים כבר היום להישלח ל-Google Analytics**, על כל
חזרה מ-OAuth או מקישור שחזור, אצל כל משתמש שנתן הסכמה לאנליטיקס.

**תיקון באותו קומיט:** `page_location: location.origin + location.pathname`
ב-`config` (מכסה את ה-pageview הראשוני) ובכל `page_view` שנשלח ידנית.

**למה זה בגזרה:** §2 אוסר במפורש שליחת PII, וזו תעלת ה-PII הגדולה ביותר שקיימת
בקוד היום. תיקון §2 בלי לסגור אותה היה משאיר את הדליפה החמורה פתוחה תוך כדי
כתיבת קוד שנוגע בדיוק באותה שורה.

### האירועים

**`page_view`** — על שינוי `pathname` בלבד, **מדלג על הרינדור הראשון**.
ה-`config` כבר שולח אחד; בלי הדילוג כל טעינה תיספר פעמיים ושיעור הנטישה יזוז
בלי שאף התנהגות השתנתה.

**`first_trade_saved`** — האירוע היחיד מעבר ל-`page_view`.
⛔ בלי ערכים, בלי טיקר, בלי סכום, בלי מזהה. **אפס פרמטרים.**
נורה דרך `trackEvent` הקיים, שכבר עושה no-op בלי הסכמה.

**מגבלה שנאמרת ולא מוסתרת:** השמירה מפני ירי חוזר היא sentinel ב-localStorage,
ולכן האירוע מודד "עסקה ראשונה **בדפדפן הזה**", לא גלובלית. משתמש בשני מכשירים
ייספר פעמיים. אין דרך למדוד גלובלית בלי לשלוח מזהה משתמש — וזה אסור.

### מה לא נשלח

⛔ מייל · ⛔ user id · ⛔ תוכן יומן · ⛔ טיקר · ⛔ מחיר/סכום ·
⛔ `location.search` · ⛔ `location.hash` · ⛔ טוקנים.

---

## §3 — retention: שאילתה, לא dashboard

### התוצר: `scripts/retention.sql`

**למה `.sql` ולא `.mjs`:**
1. אין `psql` במכונה הזו (`command -v psql` → לא מותקן).
2. `SUPABASE_DB_URL` אינו ב-`.env` המקומי (יש רק 3 מפתחות `VITE_`).
3. **הריפו ציבורי.** הרצה ב-Actions הייתה שמה שורות קוהורט בלוג קריא-לכל-העולם —
   בדיוק מה ש-`scripts/user-analytics.mjs:14` מזהיר מפניו.

הפלט מצטבר בלבד, ולכן **אין צורך במזהים מקוצרים כלל** — ספירות קוהורט הן כבר
אגרגט. ⛔ אפס כתובות, ⛔ אפס UUID, ⛔ אפס תוכן יומן.

`scripts/user-analytics.mjs` **כבר** מודד משפך, תקיעות וחציון ימים לעסקה ראשונה.
מה שחסר בו ורק בו: **קוהורט שבועי N→N+1** ו**התפלגות** (להבדיל מחציון) הימים
לעסקה ראשונה. השאילתה מכסה את שני החסרים בלבד — אין שכפול.

### פלט ההרצה (בוצע 2026-08-06, read-only)

```
cohort_week   signed_up   active_wk0   active_wk+1   active_wk+2
2026-04-13        1           0             0             0
2026-05-04        1           0             0             0
2026-06-15        1           1             0             0
2026-07-13       10           2             0             0
2026-07-20       16           3             2             0
2026-07-27       10           2             0             0
2026-08-03        2           0             0             0

שימור שבוע N → N+1:   2/41 נרשמים = 5%
שימור שבוע N → N+2:   0/41 נרשמים = 0%
```

```
ימים מהרשמה לעסקה ראשונה (12/41 נרשמים = 29% שהגיעו לעסקה):
  < שעה        8/12 שהגיעו
  שעה – יום    2/12 שהגיעו
  יום – 7 ימים 1/12 שהגיעו
  7+ ימים      1/12 שהגיעו
  חציון: 0.01 יום (גולמי) · 0.37 יום (מסונן־ייבוא)
```

### הקריאה

**מי שמתחיל — מתחיל מיד (8/12 תוך שעה). אף אחד לא חוזר בשבוע שאחרי (2/41).**
הבעיה אינה ה-onboarding ואינה החיכוך בכניסה. הבעיה היא **היום השני**:
אין סיבה לחזור. זה גם מסביר למה `why_stopped` קיבל 0 תשובות — הוא שואל
"מה עצר אותך?" את מי שמעולם לא התחיל, במקום את מי שהתחיל ולא חזר.

**מגבלת מדידה שנאמרת:** "פעיל" מוגדר כ"נפתחה עסקה באותו שבוע", כי
`auth.users.last_sign_in_at` שומר רק את ההתחברות ה**אחרונה** — אי אפשר לשחזר
ממנו היסטוריית התחברויות שבועית. משתמש שנכנס, הסתכל ולא תיעד — נספר כלא-פעיל.

---

## §4 — קמפיין המשך (⛔ הכנה בלבד)

### שם הקמפיין המוצע: `why_stopped_r2`

**נימוק:** השם הוא גם מפתח ה-dedup ב-`email_campaign_log` וגם ה-`utm_campaign`.
`_r2` קורא כ"סבב שני של אותה שאלה", שומר על הקשר לגל הראשון, ומשאיר את סחיפת
ה-utm **קריאה** במקום מוסתרת.

**⚠️ סחיפת utm:** `emails/why_stopped.html:53` נושא
`utm_campaign=why_stopped`. שימוש חוזר בתבנית תחת שם קמפיין חדש אומר שהקליקים
משני הגלים יתמזגו לאותו utm ב-GA4. שתי אפשרויות:
- **(א)** לקבל — הליגר עדיין מפריד את השליחות; רק ייחוס הקליקים מתמזג.
- **(ב)** שינוי שורה אחת ל-`utm_campaign=why_stopped_r2`.
**(ב) טעון אישורך** — זו נגיעה בתבנית קיימת, ו-§5א אוסר יצירת/שינוי תבנית בלי אישור.

⛔ **לא נוצרת תבנית חדשה.** `emails/why_stopped.html` קיימת ומשמשת כמות שהיא.

### 🔴 ממצא dedup — הקהל אינו 21

**שם קמפיין חדש מאפס את ה-dedup.** נמדד read-only, 2026-08-06:

```
קהל stuck_users (הגדרת email-campaign.yml המדויקת):      26
  מתוכם כבר קיבלו 'why_stopped' (status='sent'):          5
  נותרו שלא קיבלו:                                       21

עם שם קמפיין חדש, ה-NOT EXISTS לא מוצא כלום →
  מה ש-stuck_users יחזיר בפועל:                          26   ← לא 21

קמפיינים קיימים בליגר: import_and_ocr_live, waitlist_launch, why_stopped
```

כלומר הרצה תמימה עם `why_stopped_r2` תשלח **גם ל-5 שכבר נשאלו** את אותה שאלה
לפני שישה ימים. זה בדיוק סוג הפגיעה ש-`SKILL.md` מסמן כיקרה ביותר בקהל הזה.

**מזעור, לבחירתך:** הזנה מראש של 5 השורות לליגר תחת השם החדש —
```sql
insert into public.email_campaign_log (campaign, email, status)
select 'why_stopped_r2', email, 'sent'
from public.email_campaign_log where campaign = 'why_stopped' and status = 'sent'
on conflict do nothing;
```
אחריה `stuck_users` יחזיר **21 בדיוק**.
⛔ **אני לא מריץ אותה.** `CLAUDE.md` §12 — Claude כותב SQL, ניב מריץ.

### ⛔ אפס שליחה בסעיף הזה. הכנה בלבד.

---

## §5 — התבניות + השליחה הראשונה דרך `/api/notify`

### §5א — שתי תבניות ב-`emails/`

נגזרות מ-`emails/why_stopped.html` — **גזירה, לא המצאה**:
header `#070B0A` · `SWING`+`EDGE` ב-`#00C076` · תת-כותרת `#7A8783` ·
RTL `dir="rtl" lang="he"` · טבלה 560px · גוף לבן `#ffffff` ·
בלוק ציטוט `#f9fbf8` עם `border-right:3px solid #00C076` ·
CTA כדורי `#00C076` · footer `#f9fbf8` עם `border-top:1px solid #eef2ec`.

**1. `emails/fix_mobile_upload.html`** — `utm_campaign=fix_mobile_upload`
נושא: `מצאנו — ותוקן`
תוכן בדיוק כפי שנמסר: תודה על ארבעת הדיווחים · מה שקרה (מצלמה במקום גלריה,
לא הייתה דרך לבחור צילום קיים) · זה תוקן · שאר ההערות (תמונה בגדול, טווח העסקה)
נכנסו לתוכנית · נשמח שתנסה שוב ותגיד לנו.

**2. `emails/files_received.html`** — `utm_campaign=files_received`
נושא: `הקבצים שלך התקבלו`
תוכן בדיוק כפי שנמסר: קיבלנו את שני הקבצים (IBI ואלטשולר) · מה שדיווחת
(IBI — כל שורה נקראת כפתיחה; אלטשולר — לא נקרא כלל) · הקבצים משמשים אותנו
עכשיו לבניית הזיהוי · ההצעה שלך צודקת, העלאת קובץ צריכה להיות פשוטה יותר ·
נעדכן כשיהיה מוכן.

**טון:** קול חברה · קצר · בלי התנצלות מוגזמת · ⛔ בלי "בניתי לבד" ·
חתימה `SwingEdge`.

### §5ב — ⛔ שער חוסם לפני כל שליחה

1. **תיקון capture חי בפרודקשן:**
   - `f7ebf5f` על `origin/main` — **אומת** ✅
   - `curl -s -o /dev/null -w "%{http_code}" https://swing-edge.com/app` → חייב `200`
   - hash של ה-bundle **שונה** מזה שהיה ב-`918f9c3` (אימות דרך Atom feed —
     `CONTEXT.md` §Working procedures)
   - ⛔ **לא חי → STOP.** מייל "תוקן" שמקדים את הפריסה שורף את המשתמש סופית,
     וזה בדיוק המשתמש שכבר איבדנו פעם.
2. **dry-run של `/api/notify`** — רינדור בלי שליחה. מודבק בדיווח:
   אישור רינדור · אורך HTML · נושא · שם קמפיין · כתובת **ממוסכת** בלבד.
   ⛔ אפס כתובות מלאות.

### §5ג — ⛔ עצירה קשיחה

המתנה למשפט המדויק: **`אשר שליחה חיה`**
"כן" · "אוקיי" · "תשלח" · "קדימה" — **אינם אישור.** שואל שוב.

### §5ד — שליחה + אימות

שני מיילים בלבד, אחד לכל תבנית:
- `omrikapara1` → `fix_mobile_upload` → `campaign = reply:<feedback_id>`
- `a0556783290` → `files_received` → `campaign = reply:<feedback_id>`

דיווח: סטטוס · אימות read-only מול `email_campaign_log` (ספירה חייבת להיות
זהה לדיווח) · ⛔ בלי כתובות. **לעולם לא הרצה שנייה.**
בסיום — `admin_set_feedback_status(<id>, 'resolved')` לשני הפידבקים, כדי שלא
יישארו ב-`Reviewed` כפידבק יתום (`CLAUDE.md` §10.2).

### ⚠️ מתח שאני מציף במקום לבלוע

"⛔ אפס מיילים נשלחים בגל הזה" (חוקים חוצי-סעיפים) מול §5ד ששולח 2.
**קריאתי:** §5ד הוא החריג היחיד והמפורש, ורק אחרי המשפט המדויק של §5ג.
§1 ו-§4 נשארים הכנה בלבד. אם הקריאה שגויה — עצור אותי ב-§5ג.

---

## §6 — תמונת העסקה אינה נשמרת (⛔ אבחון בלבד)

### ההשערה אושרה במלואה

**מה קורה ל-`tradeImage` היום:**
- `form.tradeImage` (אובייקט `File`) + `form.tradeImagePreview` (base64 data URL) —
  `SwingEdge_App.jsx:1333`. נקבע ב-`handleImageUpload` (`:2834`) ובמסלול לכידת
  המסך (`:3094`).
- בשמירה: `SwingEdge_App.jsx:2406` מעתיק `tradeImage: form.tradeImagePreview`.
- `src/supabaseClient.js:64-69` מסווג `tradeImage` כ-`LOCAL_ONLY` —
  `"tradeImage", // base64 chart snapshot — deliberately client-side only`.
  `tradeForSupabase` (`:71-91`) **משמיט אותו מה-insert בשקט**. ה-`console.error`
  הרועש ב-`:85` נורה רק על מפתח שאינו באף אחת מהרשימות — כלומר ההשמטה הזו
  מכוונת ואילמת.
- נכתב ל-`localStorage` (`:1664`), אבל ה-hydration מ-Supabase (`:1494-1521`)
  עושה `setTrades(cleaned)` שמסומן במפורש `// REPLACE — not merge` (`:1513`),
  ואפקט ההתמדה (`:1665`) **דורס את localStorage** בגרסה חסרת התמונה.

**שורה תחתונה:** ה-base64 אבוד לצמיתות אחרי הריענון המאומת הראשון.
לא שורד ריענון. לא שורד מכשיר אחר. התמונה מרונדרת **רק** בתוך המודאל הפתוח
(`:6996`) — לעסקה שמורה אין תמונה ללחוץ עליה.
**עומרי לא ביקש זום. הוא ביקש לוודא שהתמונה בכלל קיימת.**

**האם יש bucket:** לא. אפס התאמות בכל הריפו ל-`storage.from` / `supabase.storage`
/ `createBucket` / `.upload(`. אין עמודה מתאימה ב-24 העמודות
(`20260727180000_document_trades_schema.sql:18-44` + `currency`).
`docs/plans/PLAN-2026-07-27-user-analytics.md:81` §0.4 הגיע לאותה מסקנה והוציא
את המדד מהגזרה במקום לדווח מספר שגוי.

**השימוש היחיד בתמונה היום:** קלט חד-פעמי ל-`/api/ocr` למילוי אוטומטי.
`api/ocr.js` אינו מכיל `supabase` / `insert` / `storage` / `fs` — התמונה נזרקת.

### מה יידרש (⛔ לא בגל הזה)

| ציר | דרישה |
|---|---|
| Storage | bucket **פרטי** אחד (`trade-charts`) + signed URLs. bucket ציבורי = נתיבים נחשים |
| RLS | 4 מדיניות על `storage.objects` לפי `(storage.foldername(name))[1] = auth.uid()::text`, בדפוס `20260708150000_trades_rls_policy.sql` |
| מיגרציה | עמודת `text` אחת (**נתיב, לא base64** — base64 ב-DB שורף את מדרג ה-500MB), + הוספה ל-`TRADE_COLUMNS` והסרה מ-`LOCAL_ONLY` **באותו שינוי**, + מסלול מחיקה ליתומים |
| עלות | ~600KB לתמונה · ~300 עסקאות ≈ 180MB ≈ 18% מ-1GB החינמי. **ה-egress (5GB/חודש) הוא החסם ההדוק יותר** אם תמונות ממוזערות מרונדרות ברשימת היומן |

**פסק: גל נפרד.** נכנס ל-⏭️ ב-`docs/STATE.md` עם ציטוט הפידבק של omrikapara1
(31.07 12:23), לפי `CLAUDE.md` §10.2.

---

## ⚠️ ציד — מסלולים ששולחים החוצה בלי שער או בלי לוג

| מסלול | שולח | שער | rate limit | לוג |
|---|---|---|---|---|
| `api/ocr.js:281` | תמונת המשתמש + prompt ל-Anthropic | JWT (כל משתמש, לא אדמין) | 10/דק' · 60/שעה | **אפס** |
| `api/health.js:160` | פרובים עם מפתחות שרת | **אין**, ו-`Access-Control-Allow-Origin: *` — היחיד שעוקף את `_lib/cors.js` | יש | אין |
| `api/feedback.js:73` | `user_email` שנטען על ידי הקורא | אין (במכוון) | 3/דק'/IP | טבלת `feedback` |
| `api/verify-turnstile.js` · `quote` · `earnings` · `symbol-search` · `fx` | פרמטר מהקורא לספק חיצוני | אין | יש | אין |
| 8 workflows ששולחים מייל | דוחות ל-`niveven183@gmail.com` | trigger בלבד | — | **אפס ליגר** |
| 11 workflows שפוסטים לדיסקורד | payload סטטוס | trigger בלבד | — | **אפס ליגר** |
| `scripts/analyst\|arch-auditor\|data-guardian` | עובדות ריפו/DB כ-prompt ל-Anthropic | trigger בלבד | — | **אפס** |

**שלושת הפערים הגדולים:**
1. `api/ocr.js` — כל משתמש מאומת מפעיל קריאה **בתשלום** עם payload משלו,
   ואין שום רשומה של מי, כמה, ומה. זו העלות התפעולית הכי לא-נראית במערכת.
2. אין ליגר שליחה לאף workflow. כשל SMTP מדלג עם `::warning::` ומסתיים ירוק.
3. `api/health.js` — `*` ב-CORS.

**כולם → ⚠️ ב-`docs/STATE.md`. אף אחד מהם אינו מתוקן בגל הזה** (`CLAUDE.md` §11 —
לא ודאי+קשור+קטן, אז לא נוגעים).

### ממצא §11 נוסף — כשל שקט מוכח

`SwingEdge_App.jsx:1665` כותב את מערך העסקאות **כולל base64 רב-מגה-בייטי**
ל-localStorage בתוך `try { … } catch {}` ריק. מכסת localStorage היא ~5MB למקור;
base64 מנפח PNG של 2MB ל-~2.7MB. **שתיים-שלוש תמונות חורגות מהמכסה, ה-`catch`
בולע `QuotaExceededError`, ומאותו רגע אף עסקה לא נשמרת מקומית** — כולל מסלול
הגיבוי שרץ כש-Supabase לא זמין (`:1509`).

זה `CLAUDE.md` §2 — "catch ריק" — והוא **בלתי תלוי** בשאלה אם פיצ'ר התמונות
ייבנה אי פעם. → ⚠️ ב-`docs/STATE.md`.

---

## קומיטים — מה נפרד ולמה

| # | קומיט | קבצים | למה נפרד |
|---|---|---|---|
| 1 | `docs(plan): U — נראות ומענה למשתמשים — awaiting approval` | הקובץ הזה | `CLAUDE.md` §9 מחייב קומיט נפרד, push, ועצירה |
| 2 | `feat(api): /api/notify — מענה לפידבק בודד` | `api/notify.js` · `vercel.json` · `docs/STATE.md` | **מסלול egress חדש.** חייב להיות בר-החזרה לבדו בלי לגרור אחריו אנליטיקס או תבניות |
| 3 | `feat(analytics): page_view ב-SPA + חסימת דליפת טוקן ל-GA4` | `index.html` · `src/main.jsx` · `SwingEdge_App.jsx` · `docs/STATE.md` | נושא **תיקון אבטחה** (טוקנים ל-GA4). חייב להיות grep-able בהיסטוריה בזכות עצמו, לא קבור בקומיט "אנליטיקס" |
| 4 | `feat(scripts): שאילתת retention` | `scripts/retention.sql` · `docs/STATE.md` | read-only, אפס רדיוס פגיעה. אין סיבה שייחסם על ביקורת של קוד שרת |
| 5 | `feat(emails): שתי תבניות מענה` | `emails/fix_mobile_upload.html` · `emails/files_received.html` | **תוכן, לא קוד.** ביקורת נוסח היא ביקורת אחרת מביקורת קוד, ותבנית שנדחית לא צריכה להחזיר קוד תקין |

`docs/STATE.md` נכנס **בתוך** כל קומיט פונקציונלי (`CLAUDE.md` §10), ולא בקומיט
`docs` נגרר בסוף. `docs/DECISIONS.md` מקבל שורה מתוארכת אחת (append-only) על
החלטת שער-האדמין-דרך-`is_admin()`-בלי-מיגרציה.

---

## ניתוח השלכות (§8 — הפילטר תפס: DB, מיילים, פרודקשן)

| ציר | הערכה |
|---|---|
| משתמשים | §5ד נוגע ב-2 משתמשים אמיתיים ששניהם דיווחו ומחכים לתשובה מ-31.07. §2 נוגע בכל המשתמשים שנתנו הסכמה — לטובה: מפסיק לשלוח טוקנים ל-Google |
| נתונים | ⛔ אפס מיגרציות. הכתיבה היחידה: שורות ב-`email_campaign_log`. הפיך ב-`delete from email_campaign_log where campaign like 'reply:%'` |
| עלות | Vercel: פונקציה אחת נוספת, קריאות בודדות. Supabase: אפס. Actions: אפס בגל הזה |
| תקרות ספק | Gmail ~300/יום — §5ד צורך 2. §4 (כשיאושר) יצרוך 21–26 |
| אבטחה | **משפר**: סוגר דליפת טוקנים ל-GA4. **מוסיף**: נתיב egress חדש, מגודר JWT+`is_admin()`+allowlist תבניות+dedup. ⛔ אפס service-role, אפס סוד חדש |
| תחזוקה (§3 מטרת-העל) | ✅ מסיר צעד ידני קבוע — מענה לפידבק בג'ימייל. ✅ retention מחליף אומדן בעין. ⚠️ מוסיף נתיב לתחזוקה — מקוזז בכך שהוא נכנס להקשחת S2 יחד עם feedback ו-waitlist |
| הפיכות | קומיטים 2–5 הפיכים ב-revert בודד כל אחד. השליחה של §5ד **בלתי הפיכה** — ולכן שער §5ב ועצירת §5ג |
| כשל שקט | נמנעו שלושה: `includeFiles` חסר ב-`vercel.json` (מייל בעיצוב שגוי); ספירת pageview כפולה; dedup מאופס ב-§4 ששולח ל-5 פעמיים |

**פסק: ⚠️ בצע עם הגנה** — בכפוף לשלוש ההכרעות למטה ולעצירת §5ג.

---

## שלוש הכרעות שאני צריך לפני ביצוע

1. **שם הקמפיין ל-§4** — מאשר `why_stopped_r2`?
2. **הזנת 5 השורות מראש** — כדי שהקהל יהיה 21 ולא 26? (אתה מריץ, לא אני)
3. **שורת ה-utm ב-`emails/why_stopped.html`** — מותר לשנות ל-`_r2`, או משאירים
   כפי שהיא ומקבלים את מיזוג הייחוס?

---

## אחרי אישור

`npm run verify` — פלט **מלא** מודבק · `docs/STATE.md` + `docs/DECISIONS.md`
בתוך הקומיטים · ⛔ בלי force · דיווח: hashes + `..HEAD -> main` + סיימתי ✅
