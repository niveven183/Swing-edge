# AUDIT-B171b — throttle כיוון: D12-D16, אבחון read-only

**תאריך:** 2026-08-24 · **HEAD במדידה:** `422beaf` · **סוג:** T3 שלב 1 (אבחון בלבד, אפס שינוי קוד)

**סיווג §15:** רמה: T3 · תשובות: לא(הפיכות)/**כן**(אמון — הכרעת throttle/הסרה נשענת על המדידות כאן)/לא(אבטחה — קריאה בלבד, אפס נגיעה ב-`api/`)/לא(רוחב — מסמך בלבד)/**כן**(ודאות — D14/D15 לא נמדדו מעולם) ⇒ שאלה 5 טריגר-יחיד ⇒ **T3** מוצדק, בעקביות עם `AUDIT-B171.md`.

⛔ **לא בוצע שינוי קוד.** כל הממצאים מקריאת קוד קיים (`api/quote.js`, `api/health.js`, `api/_lib/rateLimit.js`, `src/priceService.js`, `SwingEdge_App.jsx`) ומ-Vercel `get_runtime_logs`/`get_runtime_errors`/`get_web_analytics` בזמן אמת.

---

## תקציר מנהלים

**D12 הופך את השאלה:** throttle מקומי (module-scope, בלי מצב משותף) **אינו יכול** למנוע חריגה — לא כי "אולי לא מספיק", אלא כי **`api/_lib/rateLimit.js` כבר מתעד את זה על עצמו** ("This does NOT provide a hard global cap... no external store, no new dependency"). אבל הממצא החד יותר: **אין צורך אפילו בשני משתמשים.** `SwingEdge_App.jsx` יורה **שני** `useEffect` בלתי-תלויים על **אותו mount** — אחד ל-`moRange` הפעיל (ברירת מחדל 7), אחד לשמירת `days=30` חם — כל אחד קורא ל-`fetchMarketOverview` בנפרד, כל אחד עלול לצרוך עד 8 credits. **מפגש אחד, טאב אחד = עד 16 credits בבת אחת מול תקרה של 8.** זה תואם ישירות ל-`N=16` שנמדד ב-`AUDIT-B171` הקודם.

**D14/D15 משנים את המסגור:** ה-hooks ש-fetch-ים יושבים ב-`export default function SwingEdge()` — הרכיב השורשי — **לא** מאחורי תנאי טאב. הפאנל (Market Overview / "Market Intel") מוצג תמיד ב-DOM (עם skeleton כשאין נתונים), ו-`regimeOverview` (החלון של 30 יום) **מוזן ישירות ל-`SwingEdgeAI.getRegime` ול-`DecisionCoach`** — לא קישוט בלבד. ⇒ **הכיוון "throttle" נשאר נכון**, אבל "הסרה/הצהרת-חלקיות" (המסלול שה-D14/D15 ⚠️ רמזו עליו) **נפסל**: הנתון מוזן ללוגיקת ה-AI, לא רק לתצוגה.

**D16:** אין הרעלת cache ואין retry-storm — אבל אין גם backoff, כך שהמחזור הבא (5-30 דק') מנסה שוב עם אותה בעיית-מבנה.

---

## D12 — throttle ב-Lambda בלי מצב משותף: אפשרי?

🔴 **לא, לא כ-hard cap.** שתי ראיות עצמאיות:

1. **תיעוד קיים בקוד עצמו** (`api/_lib/rateLimit.js:1-4`):
   > "In-memory, per-serverless-instance rate limiter... This does NOT provide a hard global cap — it raises the cost of a runaway loop enough to stop accidental abuse, not determined attackers. Acceptable per product requirements (no external store, no new dependency)."

   זה **אותו** מנגנון שכל throttle חדש ב-`fetchEquityHistory`/`checkTwelveData` היה משתמש בו (`module.scope Map`) — ואין ב-repo שום מצב משותף חלופי (לא Redis, לא Upstash, לא טבלת Supabase למטרה הזו).

2. **מדידה חיה מפריכה "שני משתמשים" כתנאי-סף:** כפי שנמדד ב-D13 למטה, **מפגש בודד** כבר יורה שתי בקשות היסטוריה מקבילות (7-יום + 30-יום), כל אחת עד 8 credits = עד 16 מול תקרה של 8. throttle מקומי בתוך `fetchEquityHistory` היה חוסם היטב בקשות **עוקבות** על אותה instance, אבל **לא** את שתי הבקשות המקבילות שיוצאות **מאותה instance-פעם, אלא משתי invocations שונות** (שתי קריאות `fetch` נפרדות מ-`SwingEdge_App.jsx`, כל אחת ל-Lambda שעשוי להיות instance אחר).

**⇒ מסקנה ל-D12: "לא ניתן בלי מצב משותף" — הכיוון משתנה בהתאם להנחיה המפורשת בפרומפט.** throttle-בלבד (module-scope) **לא** פותר את השורש; הוא רק מקטין תדירות. פתרון אמיתי דורש **אחד מהשניים**:
   - (א) **צמצום מספר הבקשות המקבילות** מהצד — לאחד את שני ה-`useEffect`-ים לבקשה משותפת אחת (`days=7` **וגם** `days=30` יחדיו, לא שתי קריאות HTTP נפרדות) — **תיקון בצד הלקוח, לא throttle בשרת.**
   - (ב) מצב משותף אמיתי (Supabase counter row / Upstash) — עלות תלות חדשה, מנוגד ל"no external store, no new dependency" הקיים ב-`rateLimit.js`, ⇒ החלטת מוצר בפני עצמה, לא "תיקון קטן".

---

## D13 — הקטנת ה-batch: `slice(0, 8)` → 2-3, עלות למשתמש

**רוסטר קבוע** (`src/priceService.js:458-484`, `MARKET_OVERVIEW`): 5 מדדים (כולל `BTC-USD` — קריפטו, **לא** צורך TwelveData) + 9 סקטורים + 5 תמות = **19 סה"כ, 18 מניות/ETF שצריכות TwelveData**.

**קצב רענון** (`getOverviewRefreshInterval`, `src/priceService.js:488-492`): שוק פתוח 5 דק' · pre/after 10 דק' · סגור 30 דק'.

**כיסוי מלא (best-case, cache חם על אותו instance):**

| batch | סבבים ל-18 מניות (⌈18/n⌉) | זמן לכיסוי מלא — שוק פתוח (5 דק') | סגור (30 דק') |
|---|---|---|---|
| 8 (נוכחי) | 3 | 15 דק' | 90 דק' |
| 3 | 6 | 30 דק' | 180 דק' (3 שעות) |
| 2 | 9 | 45 דק' | 270 דק' (4.5 שעות) |

⚠️ **אבל הטבלה מניחה cache שרת חם בין סבבים — וזו הנחה שקרסה כבר ב-`STATE.md` (D8-D11): `HIST_TTL` הוא per-Lambda, ו-Vercel hobby-tier עם 16 בקשות/24 שעות (ראה D15) כמעט ולעולם לא שומר instance חם בין polls המרוחקים 5-30 דק' זה מזה.** בפועל, כל poll סביר שמגיע ל-instance קר → מנסה מחדש **עד 8 (או n) symbols מאפס**, בלי קשר לסבב הקודם. הכיסוי המצטבר שבאמת מתכנס הוא **בצד הלקוח** (`_overviewLKG`, `src/priceService.js:505` — accumulator שחי בזיכרון הטאב, לא בשרת) — הוא זוכר symbols שהצליחו בעבר גם אם השרת שכח. **⇒ הקטנת batch לא מאריכה זמן-לכיסוי-מלא בפועל (כי "כיסוי מלא בשרת" כמעט ואינו קורה גם היום) — היא רק מקטינה credits-לבקשה, במחיר יותר polls עד שה-accumulator הלקוחי מתמלא.** מדד אמיתי: מספר ה-polls עד שה-LKG מכיל את כל 18 (תלוי אקראיות ה-`shuffle`, לא נמדד כאן — needs live observation, לא read-only).

---

## D14 — מה בדיוק Market Intel מציג, ומה תלוי ב-history

**לא קישוט.** שני צרכנים נפרדים ל-`fetchMarketOverview`:

1. **תצוגה** (`SwingEdge_App.jsx:6700-6744`) — פאנל "Market Overview" בתוך הרכיב הראשי (`export default function SwingEdge()`, לא טאב נפרד/lazy) — 5 כרטיסי מדד + טבלת סקטורים/תמות ממוינת. בהיעדר נתון: skeleton (`RefreshCw` מסתובב), ⛔ לא הודעת שגיאה.
2. **לוגיקת AI** — `regimeOverview` (חלון קבוע של 30 יום, `moByRange[30]`, נשמר חם ע"י ה-`useEffect` השני **גם כשה-toggle המוצג הוא 1D/1W**) מוזן ל:
   - `SwingEdgeAI.getRegime(realTrades, { marketData: regimeOverview })` — שורה 2381
   - `DecisionCoach` דרך `marketData: { ...(regimeOverview || {}), earnings: coachEarnings }` — שורות 2418, 3666

**⇒ D14 קובע נגד "קישוט": regime detection ו-DecisionCoach צורכים את הנתון הזה ישירות.** נתון חלקי/חסר לא רק משאיר skeleton בפאנל — הוא משאיר את מנוע ה-regime/coach עובד עם `marketData` ריק או חלקי, בלי סימון גלוי למשתמש שההמלצה מבוססת על תמונת-שוק חסרה.

---

## D15 — כמה משתמשים פותחים את הפאנל

⛔ **אין מדידה ישירה זמינה:**
- `get_web_analytics` (Vercel) → `404 Not Found — "Web Analytics not found"` (לא מופעל בפרויקט).
- אין אירוע `track()` ייעודי ל-Market Overview/Market Intel ב-`SwingEdge_App.jsx` (נבדק — 0 תוצאות).

**מה שכן נמדד, וסותר את הנחת-הבסיס של השאלה:** ה-fetch **אינו** מאחורי "פתיחת פאנל" — שני ה-`useEffect` יושבים ב-root component (`SwingEdge()`, שורה 1158) ורצים לכל mount, ללא תלות בגלילה/נראות. ⇒ השאלה "כמה פותחים את הפאנל" **אינה השאלה הנכונה** — הפאנל **תמיד** נטען כשהאפליקציה נטענת; אין "פתיחה" נפרדת למדוד.

**נפח בקשות בפועל** (`get_runtime_logs`, `group_by=requestPath`, deployment נוכחי, 24h): **16 בקשות סה״כ ל-`/api/quote`** (היסטוריה + quote + search יחד), מתוכן **7 נכשלו ב-429 (43.75%)**. נפח נמוך מאוד בהחלט — עקבי עם "כמה משתמשים בודדים", ⛔ לא "עומס". **⇒ שיעור-הכשל הגבוה מוסבר טוב יותר ע"י D12/D13 (שתי בקשות מקבילות ממפגש בודד) מאשר ע"י "הרבה משתמשים בו-זמנית".**

---

## D16 — מה קורה היום כשה-429 חוזר

**נבדק בקוד** (`api/quote.js:246-264`, `handleHistory` שורות 306-350):

- **⛔ אין הרעלת cache:** בענף `!r.ok` (`fetchEquityHistory`) מוחזר `{}` **לפני** בניית `bySym` — כל הסמלים ב-batch מקבלים `result = null`. ב-`handleHistory`, הכתיבה ל-`_histCache` מותנית מפורשות ב-`if (result)` (שורה 330) — **null אף פעם לא נכתב ל-cache.** הסמלים נשארים "stale" ומועמדים מיידית לניסיון הבא.
- **⛔ אין retry-storm בצד הלקוח:** `fetchMarketOverview` מתועד כ"Never throws — degrades to whatever is currently accumulated" (`priceService.js:542`) — כלומר ה-`catch`/`retryTimer(15s)` ב-`SwingEdge_App.jsx:2034-2035` כמעט ולא מופעל בפועל, כי הפונקציה בולעת כשלים פנימית ולא דוחה את ה-Promise.
- **⚠️ אבל גם אין backoff מובנה:** המחזור הבא (5-30 דק', תלוי מצב שוק) מנסה שוב עם **אותה בעיית-מבנה** (שתי בקשות מקבילות) — אין האטה מצטברת אחרי כשל. אם ה-instance הבא גם קר, אותו דפוס עלול לחזור על עצמו בכל poll.

**⇒ D16: לא "מכפיל נזק" (אין poisoning, אין storm), אבל גם לא "מתאושש" — זה כשל שקוראת לעצמו מחדש בלי זיכרון, בקצב שקובע ה-poll interval.**

---

## מה זה אומר לכיוון

הפרומפט קבע throttle כיחיד שנוגע בשורש, ⛔ לא שדרוג ⛔ לא קאש-בלבד. D12 **לא פוסל** את הכיוון אבל **מדייק אותו**: "throttle" כפי שנוסח (הגבלת קצב בתוך `fetchEquityHistory`/`checkTwelveData`) לא יעצור את החריגה שהמדידה מראה — כי החריגה נוצרת **בצד הלקוח**, ממפגש בודד שיורה שתי בקשות HTTP מקבילות, לא מ-Lambda בודד שמאיץ. תיקון שמאחד את שתי הקריאות (`days=7`+`days=30`) לבקשה אחת בצד `SwingEdge_App.jsx`/`priceService.js` נוגע ב**שורש הנמדד** ישירות, ללא תלות חיצונית חדשה ו⛔ בלי הפרת "no external store" הקיים.

D14 פוסל "הצגה מוצהרת בלבד" כפתרון-מספיק (הנתון מוזן ל-AI, לא רק לתצוגה). D15 לא תומך ב-"❄️ אף אחד לא משתמש" — הפאנל תמיד עולה יחד עם האפליקציה, ⛔ אין "פתיחה" נפרדת.

⏸️ **עצרתי. ⛔ אין קוד. ממתין להכרעת ניב לפני Plan Mode שלב 2.**
