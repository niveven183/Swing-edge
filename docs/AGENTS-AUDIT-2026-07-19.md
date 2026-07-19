# Agent Fleet Audit — 2026-07-19

**Claude ביצע, ניב אישר.**

סקירה של צי סוכני ה-Cowork (Dispatcher, Cost Watchdog, Growth Pulse, Weekly
Vitals, Architecture Auditor, Performance Auditor) — ממצאים לפי חומרה + תוכנית
פעולה.

## 🔴 קריטי

1. **Scheduled tasks ב-Cowork רצים רק כשה-Mac ער ומחובר** (Keep Awake היה
   כבוי). ראיה: מיילים הגיעו ב-06:18 / 09:30 / 10:28 / 11:14 — לא בשעות
   המתוזמנות (6:15 / 6:30 / 7:45). **המלצה:** להדליק Keep Awake; בהמשך להעביר
   סוכנים קריטיים ל-GitHub Actions (כפי שה-blueprint כבר מציין).

2. **בעיית Fail-silent:** אין מנגנון heartbeat — מייל חסר נראה זהה ל"הכל
   תקין". **המלצה:** כל סוכן ישלח שורת סטטוס לריצה נקייה, ותתבצע התרעה אם עברו
   24 שעות בלי דוח.

3. **Dispatcher פספס מיילי DOWN מ-UptimeRobot** (19:42 ו-20:26 ב-19.7); תקרית
   ה-flapping התגלתה ידנית. צריך לבדוק את הניתוב/labels ל-alert@uptimerobot.com
   ולהוסיף זיהוי דפוס flapping.

## 🟠 בינוני

4. **Architecture Auditor מייצר false positives** — דיווח "verify-turnstile
   ללא timeout" ו-"rateLimit ללא error handling"; Claude אימת מול
   origin/source ומצא ששתי הטענות שגויות (יש דפוסי timeout; יש 18 בלוקי
   try/catch).

5. **שורש הבעיה של #4:** אין אימות מול origin/source לפני הסקת מסקנות.

6. **Performance Auditor דיווח תאים טאוטולוגיים** (realized R שימש לגזירת win
   rate) — כבר תוקן דרך הוראת קבע שיושמה ב-19.7.

7. **`SWINGEDGE_AGENTS_BLUEPRINT.md` מיושן** — סוכני ה-Cowork (#7–#10,
   Architecture/Performance Auditors) חסרים ממנו.

8. **אין escalation tiering** — התרעות DOWN אמיתיות ורעש/spam נוחתים באותה
   תיבה ללא הבחנה.

## 🟡 ליטוש

9. חפיפה/כפילות בין Daily Digest / Dispatcher / Daily summary.

10. אין בדיקות regression לסוכנים.

11. Cost Watchdog לא לוקח בחשבון את צריכת המשאבים של הסוכנים עצמם.

12. שכבת ה-privacy guard קיימת כרגע רק בסוכן ה-Growth.

## תוכנית פעולה

**Plan A — הגדרות:** Keep Awake דלוק, Gmail labels לסינון/ניתוב התרעות,
מנגנון heartbeat לכל סוכן.

**Plan B — הוראת קבע מאוחדת:** יושמה כבר ב-19.7 (איסור טאוטולוגיות ב-
Performance Auditor + אימות מול origin/source לפני דיווח ממצאים).

**Plan C — מעבר ל-GitHub Actions:** להעביר סוכנים קריטיים ל-Actions (עוקף את
תלות ה-Mac הער) + לעדכן את ה-blueprint בהתאם.
