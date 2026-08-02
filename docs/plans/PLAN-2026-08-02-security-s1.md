# PLAN 2026-08-02 — S1: הקשחת אבטחה, משטח התקיפה החיצוני

**סטטוס:** awaiting approval
**עקרון-על (הוראת ניב):** לא לשבור כלום. 38 משתמשים חיים.
**שיטה:** מדוד → פרוס במצב דיווח → אמת → אכוף.

---

## 0. אבחון read-only — ממצאים

### 0.1 מיפוי 8 ה-endpoints

| # | endpoint | קורא לגיטימי | CORS היום | JWT | rate-limit | עלות בשימוש לרעה |
|---|---|---|---|---|---|---|
| 1 | `quote.js` | SPA (דפדפן) + Sentinel (curl) | `*` | ❌ | 60/דק' לפי IP | Finnhub + TwelveData credits |
| 2 | `symbol-search.js` | SPA (דפדפן) + Sentinel (curl) | `*` | ❌ | 30/דק' לפי IP | TradingView (חינם, אך חסימת IP) |
| 3 | `earnings.js` | SPA (Decision Coach) | `*` | ❌ | 60/דק' לפי IP | Finnhub |
| 4 | `health.js` | **UptimeRobot** + 3 workflows (curl) | `*` | ❌ | 🔴 **אין** | Finnhub + **TwelveData credit לכל קריאה** |
| 5 | `feedback.js` | SPA (לפני ואחרי התחברות) | `*` | ❌ | 3/דק' לפי IP | שורות ב-DB (מכסת 500MB) |
| 6 | `verify-turnstile.js` | SPA (טופס הרשמה) | `*` | ❌ (בכוונה) | 10/דק' לפי IP | Cloudflare (חינם) |
| 7 | `ocr.js` | SPA (מחוברים בלבד) | allowlist ✅ | ✅ | 10/דק' + 60/שעה לפי **user** | 🔴 מפתח Anthropic בתשלום |
| 8 | `send-invites.js` | SPA (אדמין בלבד) | allowlist ✅ | ✅ + `is_admin()` | תקרות RPC (120/יום, 25/batch) | מכסת Gmail (~300/יום) |

**הפרמיסה בפרומפט אומתה:** 6 עם `*`, שניים עם allowlist. ✅

### 0.2 שלוש הפרמיסות שהאבחון סותר

**א. `feedback.js` אינו "פתוח לחלוטין".**
הוא כבר מגביל 3/דקה לפי IP ([api/feedback.js:34](../../api/feedback.js#L34)),
כבר חוסם `message` מעל 5000 תווים (L19, L60), וכבר מאמת `type` מול רשימה סגורה.

אבל הממצא האמיתי חמור יותר וההידוק המבוקש לא נוגע בו: מדיניות ה-RLS
`Anyone can insert feedback` היא `WITH CHECK (true)` לתפקיד `public`. מפתח ה-anon
נשלח בבאנדל לדפדפן, ולכן תוקף יכול לכתוב ישירות ל-`/rest/v1/feedback`
ו**לעקוף את ה-endpoint לגמרי**. הידוק ה-rate-limit ב-endpoint מ-3/דקה ל-5/שעה
מקשיח את הדלת שנעולה וממשיך להשאיר את החלון פתוח — ובמקביל שובר משתמש אמיתי
שרוצה לשלוח שני דיווחים ברצף. **המלצה: לא לגעת ב-`feedback.js`; לתקן בשכבת ה-DB.**

**ב. הסף של `quote` / `symbol-search` כבר מכויל נכון — אין מה לכוונן כלפי מטה.**
החישוב מהקוד, לא מניחוש ([src/priceService.js:57-59](../../src/priceService.js#L57)):

| מצב שוק | תדירות רענון | קריאות `/api/quote` לדקה למשתמש |
|---|---|---|
| OPEN | 15 שנ' | 4.0 |
| PRE / AFTER | 30 שנ' | 2.0 |
| CLOSED | 5 דק' | 0.2 |

בתוספת פאנל ה-Overview (5 דק' בשוק פתוח = 0.2/דק') — **השיא הלגיטימי הוא
~4.2 קריאות לדקה למשתמש**. הסף הוא 60/דקה, כלומר **פי ~14 מהשיא**.
המרווח הזה אינו בזבוז — הוא בדיוק מה שמכסה שלושה טאבים פתוחים (12.6/דק')
ומשתמשים מרובים מאחורי NAT משותף (14 משתמשים בו-זמנית על אותו IP).
**הורדת הסף היא הסיכון, לא ההגנה. המלצה: אפס שינוי, עם התיעוד הזה בהערה.**

**ג. AdminPanel אינו 🔴 — האכיפה היא ב-DB, לא ב-UI.**
`isAdmin` ב-[AdminPanel.jsx:359](../../src/components/AdminPanel.jsx#L359) מסתיר UI בלבד.
האכיפה בפועל: כל 14 ה-RPC-ים של האדמין הם `SECURITY DEFINER` עם
`if not public.is_admin() then raise`, ו-`is_admin()` עצמה
`STABLE SECURITY DEFINER SET search_path=public`, נשענת על `auth.uid()`,
ו-`revoke ... from public, anon`. טבלת `admins` היא RLS-on עם 0 מדיניות = deny-all.
**זו הארכיטקטורה הנכונה.** תאומת חיה בשלב ד'.

### 0.3 מיפוי CSP — כל המקורות החיצוניים

⚠️ פספוס מקור אחד = פיצ'ר שבור בשקט. הרשימה נבנתה מ-`index.html`, מ-`src/`,
ומ-`package.json`.

| הנחיה | מקורות | מקור הראיה |
|---|---|---|
| `script-src` | `'self'` · `www.googletagmanager.com` · `challenges.cloudflare.com` · `s3.tradingview.com` · `va.vercel-scripts.com` · **`'unsafe-inline'`** | index.html:137, AuthScreen.jsx:410, SwingEdge_App.jsx:1546, main.jsx:12 |
| `connect-src` | `'self'` · `*.supabase.co` (+`wss:`) · `*.ingest.*.sentry.io` · `*.google-analytics.com` · `va.vercel-scripts.com` | main.jsx:16, useSupabaseSession.js |
| `img-src` | `'self'` · `data:` · `blob:` · `financialmodelingprep.com` · `www.google-analytics.com` | TickerLogo.jsx:18, העלאת תמונה ב-OCR |
| `style-src` | `'self'` · `'unsafe-inline'` · `fonts.googleapis.com` · `api.fontshare.com` | index.html:55-56,141 |
| `font-src` | `'self'` · `fonts.gstatic.com` · `cdn.fontshare.com` | index.html:53-54 |
| `frame-src` | `challenges.cloudflare.com` · `s3.tradingview.com` · `www.tradingview.com` | Turnstile + ווידג'טי TV |

**שתי מלכודות שחייבות `'unsafe-inline'` ב-`script-src`:**
`index.html` מכיל **שני בלוקי `<script>` inline** — פותר הערכת-נושא (L83-96)
ובלוק ה-GA Consent Mode (L106-136). ההערה ב-L104 כבר מתעדת את זה.
סדר הפקודות בבלוק ה-GA הוא load-bearing — nonce דורש שינוי build, לא רק header.
`'unsafe-inline'` בשלב הראשון; hash/nonce הוא שלב נפרד.

**שני ערכים חסרים שאספק לפני הכתיבה:** מארח ה-Sentry DSN המדויק
(`VITE_SENTRY_DSN`, אינו בריפו — אזור EU או US משנה את המארח) ואישור
`cdn.fontshare.com`. יילקחו מהבאנדל החי, לא מניחוש.

### 0.4 RLS — 11/11 טבלאות עם RLS פעיל

| טבלה | מדיניות | הערכה |
|---|---|---|
| `trades` | ALL `auth.uid()=user_id` · SELECT `is_active_mentor(user_id)` | ✅ |
| `user_settings` | 4 מדיניות נפרדות, כולן `auth.uid()=user_id` | ✅ |
| `journal_notes` · `weekly_reviews` | ALL `auth.uid()=user_id` | ✅ |
| `mentorships` · `mentor_notes` · `mentor_invites` | מוגבל לצדדים; אין INSERT ישיר | ✅ |
| `email_campaign_log` | SELECT `is_admin()` בלבד | ✅ |
| `admins` | RLS on, **0 מדיניות** = deny-all | ✅ בכוונה |
| `feedback` | SELECT/UPDATE אדמין · **INSERT `WITH CHECK(true)` ל-`public`** | ⚠️ ראה 0.2א |
| `waitlist` | SELECT אדמין · **INSERT `WITH CHECK(true)` ל-`anon`** | ⚠️ אותה מחלקה |

### 0.5 סעיף ציד — ממצאים חדשים

| # | ממצא | חומרה |
|---|---|---|
| 1 | **`/api/health` ללא rate-limit.** כל קריאה לא-מטמונת שורפת **credit אחד של TwelveData** + קריאת Finnhub. המטמון (20 שנ') הוא per-instance בלבד — Vercel מריץ מופעים מקבילים, וקריאות בקצב גבוה יפגעו במופעים קרים. זהו וקטור העלות הברור ביותר מבין 8 ה-endpoints, והוא היחיד שהוגדר "להשאיר פתוח". | 🟠 |
| 2 | **`feedback.js:85` מחזיר הודעת Postgres גולמית ללקוח** (`detail: dbError.message`). חושף שמות עמודות ואילוצים. **אין stack trace בשום endpoint** — נבדק. | 🟠 |
| 3 | `waitlist` — INSERT אנונימי ללא הגבלה (57 שורות היום). מכסת 500MB. | 🟡 |
| 4 | קוד הזמנת מנטור: 8 תווים מאלפבית של 30 ≈ 6.6·10¹¹ צירופים, אך ל-`redeem_mentor_invite` **אין throttle על ניסיונות**. זהו מסלול הקריאה החוצה-משתמש היחיד ל-`trades`. כרגע 0 שותפויות פעילות. | 🟡 |
| 5 | Supabase Auth — **הגנת סיסמאות דלופות מושבתת** (HaveIBeenPwned). תיקון בלחיצה בקונסולה, ניב בלבד. | 🟡 |
| 6 | `/api/health` חושף **שמות ספקים** (supabase/finnhub/twelvedata/coingecko) וזמני תגובה. **אינו** חושף גרסאות, מפתחות או נתיבים פנימיים. מיפוי stack בלבד. | ℹ️ |
| 7 | היגיינת סודות נקייה: אין `.env` במעקב git, `.gitignore` מכסה. | ✅ |

### 0.6 העובדה שקובעת את היקף שלב א'

**CORS נאכף בדפדפן, לא בשרת.** תוקף עם `curl` או סקריפט אינו שולח `Origin`
ומקבל תשובה מלאה — לפני ולאחר השינוי.

ולכן: הידוק ה-CORS מונע **הטמעה חוצה-מקור בדפדפן** (אתר זר שמשתמש בפרוקסי
שלנו כשרת נתוני-שוק חינמי) — סיכון אמיתי ומוצדק לסגירה. הוא **אינו** בקרת
עלות מול שימוש לרעה ישיר; שם ה-rate-limit הוא ההגנה היחידה.

**מכאן גם למה 17 ה-workflows בטוחים:** `sentinel.yml`, `health.yml` ו-`fleet-weekly.yml`
קוראים ל-`/api/health`, `/api/quote` ו-`/api/symbol-search` דרך `curl` בלבד.
`curl` אינו שולח `Origin` → CORS לא חל עליו → **אפס סיכון לשבירה**.
UptimeRobot (מאושר ב-`docs/ARCHITECTURE.md:49`) — אותו נימוק בדיוק.

---

## 1. ניתוח השלכות (§8 — הפילטר תפס: פרודקשן, כסף, בלתי-הפיך חלקית)

| ציר | הערכה |
|---|---|
| משתמשים | 38 חיים. CSP ב-Report-Only = אפס השפעה נראית. CORS = אפס השפעה על same-origin. |
| נתונים | אפס שינוי סכימה. אפס מיגרציה בפרומפט הזה. |
| עלות | חוסך credits של TwelveData (ממצא ציד 1). אפס עלות נוספת. |
| תקרות ספק | Finnhub ו-TwelveData מוגנים טוב יותר אחרי הגבלת `health`. |
| אבטחה | זו המטרה. אפס סוד חדש. |
| תחזוקה | §3: אפס צעד ידני חדש לניב. |
| הפיכות | כל שינוי הוא header או קבוע — חזרה ב-revert יחיד, דקות. |
| כשל שקט | הסיכון המרכזי. מנוטרל ע"י Report-Only + מעבר ידני על כל המסכים. |

**פסק דין: ⚠️ בצע עם הגנה** — בשלבים, עם עצירה לביקורת בין שלב לשלב.

---

## 2. הביצוע המוצע

### שלב א' — CORS (עצירה לאישור לפני ואחרי)
allowlist זהה ל-`ocr.js`: `localhost` · `127.0.0.1` · `*.vercel.app` ·
`swing-edge.com` · `www.swing-edge.com`, עם `Vary: Origin`.

| endpoint | החלטה | נימוק (ייכתב בהערת קוד) |
|---|---|---|
| `quote.js` | 🔒 allowlist | מונע שימוש בפרוקסי כשרת נתוני-שוק חיצוני |
| `symbol-search.js` | 🔒 allowlist | זהה |
| `earnings.js` | 🔒 allowlist | זהה |
| `feedback.js` | 🔒 allowlist | נקרא רק מה-SPA |
| `verify-turnstile.js` | 🔒 allowlist | נקרא מהדפדפן שלנו לפני התחברות — המקור תמיד שלנו |
| `health.js` | 🟢 **נשאר `*`** | UptimeRobot + 3 workflows. תועד בקוד. |

### שלב ב' — headers (עצירה לאישור)
1. `Content-Security-Policy-Report-Only` לפי 0.3 — **Report-Only בלבד**.
2. `Strict-Transport-Security: max-age=31536000; includeSubDomains`.
3. ⛔ **אפס CSP אוכף בפרומפט הזה.**
4. מעבר ידני ב-Chrome על כל המסכים, איסוף כל ההפרות.

### שלב ג' — rate-limit
- `health.js`: rate-limit לפי IP (מוצע 30/דקה — מעל כל קצב UptimeRobot סביר,
  ומתחת לקצב שמאיים על מכסת TwelveData). **הסף היחיד שמשתנה בפרומפט הזה.**
- `feedback.js`: **אפס שינוי** — ראה 0.2א. במקומו, תיקון הודעת השגיאה (ציד 2).
- `quote` / `symbol-search`: **אפס שינוי** — ראה 0.2ב. תיעוד החישוב בהערה.

### שלב ד' — בדיקת חדירה חיה
שני משתמשי בדיקה זמניים · הכנסת עסקה ל-A · ניסיון קריאה/עדכון/מחיקה עם ה-JWT
של B על כל 11 הטבלאות · ניסיון עם anon בלבד · ניסיון קריאה ל-`admin_users_list`
ו-`admin_overview` כמשתמש רגיל. **מחיקה מלאה של שני המשתמשים בסיום.**
אפס נגיעה בנתוני 38 המשתמשים האמיתיים.

### שלב ה' — אימות
`npm run verify` (9 שערים, פלט מלא מודבק) · בדיקת דפדפן · Sentinel ירוק.

---

## 3. מה נשאר מחוץ להיקף (→ `docs/STATE.md`)

- CSP אוכף — פרומפט נפרד, רק אחרי דוח הפרות ריק.
- `feedback` / `waitlist` — RLS `WITH CHECK(true)`: דורש מיגרציה (§12: ניב מריץ).
- Throttle ל-`redeem_mentor_invite` — דורש מיגרציה.
- הגנת סיסמאות דלופות — קונסולת Supabase, ניב בלבד.
- nonce/hash ל-`<script>` ה-inline — דורש שינוי build.
