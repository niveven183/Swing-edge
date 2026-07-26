# STATE — מצב חי

> מתעדכן ע"י Claude Code **בסיום כל משימה**, לפי סיום משימה ולא לפי לוח שנה.
> קובץ מצב, לא ארכיון — מה שנסגר נגזם, לא נצבר.

עודכן: 2026-07-26 · HEAD: c271176
<!-- HEAD = הקומיט שהמצב הזה מתאר. פיגור של קומיט אחד הוא מובנה: הקובץ נכתב לפני שה-hash קיים. -->


---

## 🔴 עכשיו

**S2.3 — סינון 404 של לוגו סימבול.**
`TickerLogo` מושך `financialmodelingprep.com/image-stock/{TICKER}.png`. `SNTNL` אינו
סימבול אמיתי ולכן ה-404 ודאי, וה-fallback תקין. ללא סינון לפי מקור — 🟠 קבוע כל שעה
על רעש שהמוניטור מייצר לעצמו.

## ⏭️ הבא בתור

1. **S2.3** — סינון 404 של לוגו סימבול
2. **ניקוי מאוחד** — `npm audit fix` (3 high) · try/catch ל-`api/_lib/rateLimit.js` ·
   timeout ל-`api/verify-turnstile.js` · צעד דיסקורד ל-7 הסוכנים שמדווחים רק במייל
   (analyst, arch-auditor, daily-digest, data-guardian, restore-drill, triage,
   failure-alert) · Supabase Backup ו-Smoke Tests שקטים לגמרי ·
   `actions/upload-artifact@v4` מתריע Node.js 20 deprecated
3. **רוטציית Discord webhook** (4 סוכנים) — אחרי 2 בלבד, אחרת מעדכנים סוד ואז מוסיפים צרכנים
4. **שבוע הבנת משתמשים** — GA4 (לא מותקן) · שאילתת retention day-7 · מייל ל-5 פעילים
5. **חובות מוצר במנוע** — סתירת כרטיס ההון · +0.00R בלי stop · PROFIT FACTOR ∞.
   כולם ב-`calcTradeMetrics`; משימה נפרדת עם בדיקות
6. **חובות מוצר בקופי** — תג CLOSED בקריפטו · waitlist בלנדינג · ניסוח דוח Growth
7. **מיפוי קבצים במחשב** — read-only, דוח מקומי, לא לריפו
8. **סידור בפועל** — מחשב + ריפו
9. **Dispatcher → Actions** (IMAP)
10. **Trader Persona → Actions**
11. **Gate 2.2** — RLS audit מלא + בדיקת חדירה + rate-limit ל-symbol-search + נגישות
12. **₪ + Stripe + entitlement** — אין ₪ בקוד כלל
13. **B1 Multi-Account**
14. **Track A — לנדינג V2**
15. **אודיט 4 קבצי הידע** מול הקאנון (Minervini / O'Neil / Weinstein / Tharp)

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
- **Sentinel #6** — התאוששות שקרית + לכידת ראיות (`54713d3`, `411d1dc`)
- **סיבוב `BACKUP_PASSPHRASE` + Restore Drill** — 222 שורות ב-11 טבלאות אומתו
- **כל 7 תקלות Sentry סומנו Resolved** — הלוח נקי
- שער אישור waitlist + שולח קמפיין
- הגירת Fleet ל-Actions 24/7
- קריסת Journal (60/137 עסקאות בלי `stop`)

## ⚠️ סיכונים פתוחים

- שכבת auth רצה פעם בשעה בעוד הדיווח כל 20 דק' → אזור עיוור מובנה
- `core.hooksPath` הוא config מקומי — clone חדש נשאר בלי הגנת hooks, בשקט
