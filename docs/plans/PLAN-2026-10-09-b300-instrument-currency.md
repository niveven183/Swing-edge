# PLAN 2026-10-09 — B-300 + B-340: מטבע העסקה = מטבע המחיר, ⛔ מטבע החשבון

רמה: **T3** · תשובות: כן/כן/כן/כן/כן · שער בטיחות: HEAD `69a41f8`, עץ נקי, `hooksPath=.githooks`.

## עובדות מדודות (אבחון read-only, 09.10)
- B-300 ו-B-340 = שורש אחד: `SwingEdge_App.jsx:3081` חותם `currency: capitalCurrency` על עסקה ש-`entry` שלה מתומחר במטבע הנייר (`formPaperCcy`, :2872). OCR משתמש באותו `handleSubmit`; עריכה לא נוגעת ב-`currency`; סגירה יורשת.
- `instrumentCurrency.js:210`: `stored==="ILS"` על טיקר אלפביתי ⇒ `CONTRADICTED/ils_never_measured` ⇒ `amountAt` מסרב ⇒ toast «רווח —».
- שחזור (scratch, מודולים אמיתיים): הון ₪+AAPL ⇒ `REFUSE:unverified_instrument` ⇒ «—»; הון $+AAPL ⇒ `+$0.56`.
- DB: `ILS` על טיקר אלפביתי = 7/84 שורות, 2 משתמשים; כולן `manual_capital`, כולן OPEN (0 סגורות). `.TA`/מספרי/נקודה = 0/84. אימות ניב (09.10): 7/7 מחירי דולר ⇒ `ASSUMED USD` נכון.
- CHECK על `currency_source` סגור על 5 ערכים ⇒ ⛔ ערך חדש (דורש מיגרציה).
- Entry ב-iPhone: `fetchFormQuote` ממלא רק כשריק; אין מסלול מנקה בקוד. WebKit לא מותקן ⇒ לא שוחזר.

## שינויים
1. `src/lib/instrumentCurrency.js`: פונקציה טהורה `manualTradeCurrency(ticker)` ⇒ `{currency, currency_source: MANUAL_CAPITAL}` או `null` (נייר לא מאומת; ⛔ ללא ברירת מחדל). עדכון הערת `MANUAL_CAPITAL`.
2. כלל קריאה צר: `ILS` + `currency_source===MANUAL_CAPITAL` ⇒ לא `CONTRADICTED` ⇒ נופל ל-`ASSUMED USD`. `ILS` עם `null`/`account_default`/`literal_fallback` נשאר `CONTRADICTED`.
3. `SwingEdge_App.jsx:3081`: `currency` מהפונקציה (⛔ `capitalCurrency`); `null` ⇒ ⛔ שמירה (השער הקיים `submitGate` כבר חוסם).
4. `SwingEdge_App.jsx:5208`: `currencyOf(t)` ⇒ `capitalCurrency` (`riskDollar` במטבע ההון).
5. `tests-eye/cents.spec.js`: חוזר להון ₪; ציפייה נגזרת משער אותו יום כפי שהאפליקציה מקבלת; בודק ≠ «—» וש-toast מכיל ₪.

## בדיקות
red-before על `69a41f8` · mutants: (א) כתיבה חוזרת ל-`capitalCurrency` (ב) כלל הקריאה מוחזר (ג) :5208 חוזר ל-`currencyOf` ⇒ אדום · ביקורת: הון $+AAPL; ILS עם source≠manual_capital נשאר CONTRADICTED; מספרי נשאר AMBIGUOUS · `npm run verify` מלא · probe Chromium ל-Entry (ציטוט מושהה).
תנאי סגירה: `cents.spec` בהון ₪ מול production אחרי deploy, he+en × pixel7+iphone14.

## ⛔ מחוץ לטווח
DB/מיגרציה/`UPDATE` · FIFO · K1 · מחרוזות load-bearing · קומפוננטות ב-render · Entry מעבר לרישום.
B- חדשים: (1) אין ערוץ שמודד ILS לנייר ישראלי; `TEVA.TA` אצל הון ₪ יקבל USD מוניח · (2) ייבוא `account_default` + הון ₪ (0 מקרים היום) · (3) Entry ב-iPhone/WebKit פתוח.

## החלטות
דוקטרינה מאושרת (ניב 09.10): נשמר מטבע המחיר שהטופס תמחר בו — עובדה על המספרים, ⛔ הסק על הנייר ⇒ שורה ב-`DECISIONS`.
