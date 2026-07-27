# STATE — מצב חי

> מתעדכן ע"י Claude Code **בסיום כל משימה**, לפי סיום משימה ולא לפי לוח שנה.
> קובץ מצב, לא ארכיון — מה שנסגר נגזם, לא נצבר.

עודכן: 2026-07-27 · HEAD: 665c3a7
<!-- HEAD = הקומיט שהמצב הזה מתאר. פיגור של קומיט אחד הוא מובנה: הקובץ נכתב לפני שה-hash קיים. -->


---

## 🔴 עכשיו

**רוטציית Discord webhook** (4 סוכנים) — אחרי 2 בלבד, אחרת מעדכנים סוד ואז מוסיפים צרכנים.

## ⏭️ הבא בתור

1. **רוטציית Discord webhook** (4 סוכנים) — אחרי 2 בלבד, אחרת מעדכנים סוד ואז מוסיפים צרכנים
2. **שבוע הבנת משתמשים** — GA4 (לא מותקן) · שאילתת retention day-7 · מייל ל-5 פעילים
3. **חובות מוצר במנוע** — סתירת כרטיס ההון · +0.00R בלי stop · PROFIT FACTOR ∞.
   כולם ב-`calcTradeMetrics`; משימה נפרדת עם בדיקות
4. **חובות מוצר בקופי** — תג CLOSED בקריפטו · waitlist בלנדינג · ניסוח דוח Growth
5. **מיפוי קבצים במחשב** — read-only, דוח מקומי, לא לריפו
6. **סידור בפועל** — מחשב + ריפו
7. **Dispatcher → Actions** (IMAP)
8. **Trader Persona → Actions**
9. **Gate 2.2** — RLS audit מלא + בדיקת חדירה + rate-limit ל-symbol-search + נגישות
10. **₪ + Stripe + entitlement** — אין ₪ בקוד כלל
11. **B1 Multi-Account**
12. **Track A — לנדינג V2**
13. **אודיט 4 קבצי הידע** מול הקאנון (Minervini / O'Neil / Weinstein / Tharp)

## ⏸️ חסום / ממתין לניב

- Google Workspace
- רשם הדומיין — איש קשר + Auto-Renew
- מלאי סודות
- החלטת ריפו פרטי מול דקות Actions
- GA4 Measurement ID

## ✅ נסגר השבוע

- **S2 — מחזור מלא ראשון בפרודקשן** (26.07 23:16, ריצה ידנית, `411d1dc`): לוגין →
  hydration → יומן → יצירת SNTNL → טאבים → מחיקה → ניקוי REST. ✅ התאוששות דווחה.
  שפיות ביומן: 3 עסקאות בדיוק (AAPL / NVDA / BTC-USD), אפס SNTNL
- **S2.3 — סינון 404 של לוגו הסימבול**: `financialmodelingprep.com` נוסף ל-`IGNORE_SOURCE`
  (חסימה לפי מקור בלבד, לעולם לא לפי הטקסט "404"). מסלול ה-network נבדק ולא שונה —
  host צד-שלישי אינו נכנס ל-`failedReq` ולא ל-`supabaseFailedReq`.
- **ניקוי מאוחד** (`665c3a7` תוכנית, ביצוע בקומיט הבא): `npm audit fix` תיקן
  `brace-expansion`; `react-router` high נותר במכוון (CVE לא ישים — ראה `DECISIONS.md`
  2026-07-27) · try/catch fail-open ל-`api/_lib/rateLimit.js` · timeout 8s
  ל-`api/verify-turnstile.js` (קריאה חיצונית אחת בלבד, לא שתיים כפי שהונח) · דיווח
  דיסקורד נוסף (לצד מייל קיים) ל-8 סוכנים: analyst, arch-auditor, daily-digest,
  data-guardian, restore-drill (×2), triage, failure-alert, Supabase Backup ·
  `actions/upload-artifact`/`download-artifact` שודרגו ל-`@v7` ב-3 קבצים (backup,
  smoke, sentinel) · smoke.yml הושאר בלי דיווח דיסקורד במכוון (גם מופעל על כל push ל-main)
- **Sentinel #6** — התאוששות שקרית + לכידת ראיות (`54713d3`, `411d1dc`)
- **סיבוב `BACKUP_PASSPHRASE` + Restore Drill** — 222 שורות ב-11 טבלאות אומתו
- **כל 7 תקלות Sentry סומנו Resolved** — הלוח נקי
- שער אישור waitlist + שולח קמפיין
- הגירת Fleet ל-Actions 24/7
- קריסת Journal (60/137 עסקאות בלי `stop`)

## ⚠️ סיכונים פתוחים

- שכבת auth רצה פעם בשעה בעוד הדיווח כל 20 דק' → אזור עיוור מובנה
- `core.hooksPath` הוא config מקומי — clone חדש נשאר בלי הגנת hooks, בשקט
- `smoke.yml` לא מקבל צעד דיסקורד (במכוון — גם מופעל על כל push ל-main, לא רק
  cron). ריצה ירוקה שקטה לגמרי; רק כשל מדווח (דרך `triage.yml`'s workflow_run watch)
- `actions/download-artifact@v7` מול `upload-artifact@v7` ב-`sentinel.yml` (שורות 93,
  117) טרם אומת בריצה אמיתית ב-Actions — v4 עלה ל-v7 בשני הצדדים יחד, אך אין הרצה
  שאישרה שההורדה עדיין תופסת את ה-artifact
