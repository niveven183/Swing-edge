# PLAN-2026-07-29 — חילוץ לוגיקה פיננסית מ-`useTradingStats` (T2)

> נכתב לאחר ביצוע — הפרומפט המקורי של ניב היה מפורט ומחייב עד רמת שם-קובץ,
> מתודולוגיה ומבנה בדיקות, ולכן שימש בפועל כתוכנית המאושרת מראש. מסמך זה הוא
> הרישום הפורמלי הנדרש ע"י §9, לא בקשת אישור לביצוע שכבר הושלם ואומת.

## מטרה

T2 — הכנה נטולת-שינוי-התנהגות ל-T3 (איחוד `useTradingStats.js` עם
`src/intelligence/utils/statisticalModels.js`, שני "יקומים סטטיסטיים" נפרדים
שזוהו ב-`docs/audits/AUDIT-2026-07-27-financial-integrity.md` §6, קבוצה 2).
לפני שאפשר לאחד — צריך שהלוגיקה תהיה פונקציה טהורה, לא hook, כדי שתהיה
ניתנת להשוואה/בדיקה מחוץ ל-React.

## היקף

1. **שלב 0 — אבחון בלבד, ללא שינוי קוד.** מיפוי מלא של `useTradingStats.js`
   (כל חישוב, כל שדה מוחזר, כל תלות לא-טהורה), וטבלת הבדלים מדויקת מול
   `statisticalModels.js` על אותם מדדים.
2. **מתודולוגיית characterization.** 5 תרחישים (ריק · רגיל · עם BE · בלי
   סטופים · פוזיציות פתוחות) נלכדים כ-JSON קפוא (`scripts/fixtures/tradingstats-baseline.json`)
   מה-hook הקיים, ואחרי החילוץ נבדקים `deepStrictEqual` מול הקפאה — אפס סטייה,
   כולל שימור באגים קיימים.
3. **חילוץ:** `src/lib/tradingStats.js` — `computeTradingStats(trades, capital, calcTradeMetrics)`
   מחזיר בדיוק מה שה-hook החזיר. `useTradingStats.js` הופך ל-`useMemo` דק
   שעוטף אותה.
4. **בדיקה חדשה:** `test:tradingstats` (`scripts/tradingstats-test.mjs`), מצטרפת
   ל-`verify`.
5. **שער כפול:** `test:coach` (111 assertions) חייב 111=111 לפני **וגם** אחרי,
   כי `tradingStats.js` וה-coach חולקים תלות טרנזיטיבית (`statisticalModels.js`
   מיובא ע"י שניהם).
6. **ציד חובה** (ללא תיקון — תיעוד בלבד): חישובי inline כפולים ב-`SwingEdge_App.jsx`,
   מיפוי צרכנים, וחקירת השערת `profitFactor: ∞` (FIN-030).

## איסורים

- לא לשנות שום ערך/סקאלה/באג קיים (תיקון = T3, לא T2).
- לא לגעת ב-`statisticalModels.js`.
- לא לתקן שום ממצא ציד — תיעוד בלבד (§11).

## קריטריון קבלה

`npm run verify` ירוק מקצה לקצה, `test:coach` 111=111 (זהה לפני/אחרי),
`test:tradingstats` עובר כולל שער ה-baseline הקפוא, `git diff -w` בין הגרסה
הישנה של `useTradingStats.js` לחדשה של `src/lib/tradingStats.js` מראה רק
הבדלי wrapper/whitespace — אפס הבדל לוגי.

## תוצאה בפועל

בוצע במלואו, אומת, ומדווח ב-commit הנלווה. טבלת ההבדלים המלאה וממצאי הציד
מתועדים ב-`docs/STATE.md` (עודכן באותו commit) ובדוח הסופי לניב.
