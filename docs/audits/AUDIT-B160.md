# AUDIT-B160 — `isEmpty`: אבחון read-only

> **§8.1 שלב 1.** ⛔ **אפס תיקון.** כל מספר כאן נמדד מ-`origin` בקומיט `4347df0`,
> ⛔ לא מהזיכרון. הדוח נדחף **לפני כל נגיעה בקוד**.
>
> תאריך: 16.08 · רמה: **T3** · פריט: `B-160` ‹R-6›

---

## 0 · סיווג §15 — התשובות, לא ההערכה

| # | שאלה | תשובה | הנימוק המדוד |
|---|------|-------|---------------|
| 1 | הפיכות | לא | אין כתיבת DB · אין מייל יוצא · אין מחיקה · אין פרסום. הבייסליין נמחק-ונכתב אך חי בגיט. |
| 2 | אמון | 🔴 **כן** | `SwingEdge_App.jsx:4824` הוא השער שמכריע אם **לוח הסטטיסטיקה מרונדר בכלל**. שער שבור ⇒ המשתמש רואה או לא-רואה מספרים ⛔ בלי לדעת. |
| 3 | אבטחה | לא | אין `auth` · אין RLS · אין secret · אין `api/` · אין קלט לא-מסונן. |
| 4 | רוחב | 🔴 **כן** | שני קבצי **קוד** (`src/lib/tradingStats.js` · `SwingEdge_App.jsx`) + חוליית `test:tradingstats` + בייסליין קפוא. |
| 5 | ודאות | לא | כל הנחה נמדדה בסשן הזה; המדידות משוחזרות בסעיף 1. |

**2 «כן» ⇒ `T3`** ⇒ שני שלבים, ו**אימות עין הוא תנאי סגירה שאין בלעדיו**.

---

## 1 · האוכלוסייה המלאה — 8 אתרי קוד + 8 שורות בייסליין

```
$ grep -rn "isEmpty" --include='*.js' --include='*.jsx' --include='*.mjs' . \
    --exclude-dir=node_modules --exclude-dir=.git
SwingEdge_App.jsx:4824:            {!journalStats.isEmpty && (
scripts/tradingstats-test.mjs:120:// ⚠️ `isEmpty` used to SKIP this check — `if (s.isEmpty) return`. A flag that
scripts/tradingstats-test.mjs:126:  if (s.isEmpty) {
scripts/tradingstats-test.mjs:158:  eq("isEmpty", s.isEmpty, true);
scripts/tradingstats-test.mjs:536:  eq("dormant — journal is NOT empty", d.isEmpty, false);
scripts/tradingstats-test.mjs:649://      it uses has `isEmpty === false`. `EMPTY_STATS` is the one branch a
src/lib/tradingStats.js:276:    isEmpty: false,
src/lib/tradingStats.js:330:    isEmpty: true,

$ grep -c '"isEmpty"' scripts/fixtures/tradingstats-baseline.json
8
```

| קטגוריה | כמה | איפה |
|----------|-----|------|
| יצרנים | 2 | `tradingStats.js:276` (חי) · `:330` (בתוך `EMPTY_STATS`) |
| **צרכן מוצרי** | **1** | `SwingEdge_App.jsx:4824` |
| אתרי אסרציה | 3 | `:126` · `:158` · `:536` |
| הערות | 2 | `:120` · `:649` |
| שורות בייסליין | 8 | 8 תרחישים · `isEmpty` הוא **המפתח האחרון** בכל אחד |

⚠️ **תיקון למדידה קודמת.** «0 צרכנים» נמדד מול `src/` בלבד, ו-`SwingEdge_App.jsx`
יושב ב**שורש** הריפו. הצרכן קיים ותמיד היה קיים. ⛔ המסקנה «דגל בלי צרכן» הייתה
שגויה — ולכן `B-160` הוא **R-6 (עותק שני)** ו⛔ **לא** תבנית `B-154` (שדה שאיש
אינו קורא).

---

## 2 · הטאוטולוגיה — `isEmpty ⟺ total === 0`, נמדד 4/4

המקור, `src/lib/tradingStats.js:50`:

```js
if (closed.length === 0) return EMPTY_STATS(capital);
```

הענף הזה **זורק את מערך העסקאות כולו** ומחזיר אובייקט קבוע. ⇒ `isEmpty: true`
מוחזר **אם ורק אם** `closed.length === 0`, וזה בדיוק מה ש-`total` סופר
(`:206` — `total: closed.length, // alias (legacy journalStats.total)`).

| מקרה | `closed` | `open` | `total` | `isEmpty` | מסכימים? |
|------|----------|--------|---------|-----------|-----------|
| יומן ריק לגמרי | 0 | 0 | `0` | `true` | ✅ |
| **5 פוזיציות פתוחות** | 0 | **5** | `0` | `true` | ✅ |
| עסקה סגורה אחת | 1 | 0 | `1` | `false` | ✅ |
| סגורה-בלי-יציאה | 0 | 1 | `0` | `true` | ✅ |

**4/4 מסכימים ⇒ אין מצב שלישי, ואין ערך שהדגל מוסיף.**

🔴 **והטאוטולוגיה קדמה לגל.** `git show 19d1dd0:src/lib/tradingStats.js` — שורה
`:50` **זהה**, ו-`total: 0` קיים ב-`EMPTY_STATS` כבר ב-`:286`. ⇒ `B-009` ⛔ לא
יצר את הכפילות; הוא רק חשף אותה.

⚠️ **והשם עצמו שגוי.** במקרה השני בטבלה יש למשתמש **5 פוזיציות פתוחות** ו-
`isEmpty` מחזיר `true`. השם אומר «אין יומן»; המצב הוא «אין עסקאות **סגורות**».
זה בדיוק מה ששם מדויק היה מתקן — **ומשאיר את העותק השני במקומו.**

---

## 3 · הענף ב-`:126` — מת, לפני הגל וגם אחריו

```
$ grep -n "ratesSumTo100(" scripts/tradingstats-test.mjs
231:  ratesSumTo100("normal", s);
293:  ratesSumTo100("withBreakEven", s);
331:  ratesSumTo100("missingStops", s);
363:  ratesSumTo100("openPositions", s);
394:  ratesSumTo100("closedWithoutExit", s);
```

**5 קוראים · 0 מהם מעביר stats ריק** ⇒ הענף `if (s.isEmpty) { … }` ⛔ **מעולם לא
רץ**. ה-`if (s.isEmpty) return` שקדם לו ב-`19d1dd0:99` היה מת באותה מידה.

🔴 **ולכן ההסבר שרשמתי ב-`D-041` היה שגוי.** «0% על יומן ריק שרד כי הבדיקה דילגה»
⛔ **הופרך**: היא לא דילגה, היא **לא הגיעה**. מה שבאמת החזיק את `0%` הוא בלוק 1
ב-`19d1dd0:127` — `eq("winRate", s.winRate, 0)` — שהצמיד את המספר המומצא
**כחוזה**. זה `R-3` בצורה חמורה יותר: ⛔ לא שער שדילג, אלא שער שהצמיד את הבאג.
התיקון נרשם במקומו ב-`DONE.md` וב-`STATE.md`, ⛔ ולא נמחק.

**כיסוי חמשת האסרציות שבענף המת:**

| האסרציה בענף המת | מכוסה בבלוק 9b? |
|-------------------|------------------|
| `winRate === null` | ✅ `:678` |
| `lossRate === null` | ✅ `:679` |
| `beRate === null` | ✅ `:680` |
| `totalTrades === 0` | ✅ (בלוק 1 `:159`) |
| **`wins + losses + be === 0`** | 🔴 **ייחודית — אין לה כיסוי** |

⇒ **4 מתוך 5 כפולות; אחת חייבת לעבור לבלוק חי.**

---

## 4 · `openTrades` — חפיפה שנמדדה: **אפס**

`SwingEdge_App.jsx:2206`:

```jsx
const openTrades = realTrades.filter(t => t.status === "OPEN");
```

המוצר **מחשב בעצמו** את מניין הפוזיציות הפתוחות ו⛔ **אינו קורא** את
`stats.openTrades` באף אתר. הפגם ב-`stats.openTrades` חי בשני מקומות:
`tradingStats.js:50` (הזריקה של המערך) ו-`:301` (הליטרל `openTrades: 0`).
⛔ **אף אחד מהם אינו `isEmpty`.**

⇒ הסרת `isEmpty` ⛔ **אינה נוגעת** בפגם הזה. הוא מקבל **מזהה נפרד** ו⛔ אינו
נבלע לגל הזה.

---

## 5 · הבייסליין הקפוא — צורת ה-diff, לפני הריצה

8 תרחישים: `empty` · `normal` · `withBreakEven` · `missingStops` ·
`openPositions` · `closedWithoutExit` · `dormantWindows` · `allOnPlan`.
**נמדד: `isEmpty` הוא המפתח האחרון בכל 8** (אחריו `}` או `},`; לפניו
`"closedMetrics": [],` או `],`).

⇒ **תחזית מחייבת: 8 שורות נמחקות · 8 שורות משתנות (פסיק נגרר נגזר) · 0 נוספות
= 16 מחיקות / 8 הוספות.**
⛔ **כל diff אחר הוא עצירה, ⛔ לא recapture.**

### 5.1 הוכחת אפליה דו-כיוונית — המועמד נמדד, ⛔ לא שוער

⚠️ **תיקון להצעה קודמת שלי.** הצעתי `planAdherence` כמוטציה «שרק הבייסליין תופס».
**הופרך במדידה** — הוא מוצמד בערך בשלושה אתרים:

```
416:  close('planAdherence — 2 of 4, …', s.planAdherence, 50);
557:  eq("allOnPlan — planAdherence …", on.planAdherence, 100);
567:  eq("allOffPlan — planAdherence …", off.planAdherence, 0);
```

חיפוש חוזר על כל 51 מפתחות הבייסליין נתן מועמד **יחיד ונקי**:

```
$ grep -c "bestStreak" scripts/tradingstats-test.mjs
0
$ grep -n "bestStreak" src/lib/tradingStats.js
251:    bestStreak: maxWinStreak,             // alias
321:    currentStreak: 0, … bestStreak: 0, …
```

`bestStreak` נמצא ב-8 אובייקטי הבייסליין, **0 אתרי אסרציה**, ו⛔ אינו ברשימת
`SCALARS` שב-`:503`. ⇒ מוטציה בו היא **אדום שניתן לייחס לבייסליין בלבד**.

**שני הכיוונים:**

| כיוון | המוטציה | הצפוי | מה זה מוכיח |
|-------|----------|--------|--------------|
| **א** | `winRate` במסלול החי | אסרציות **וגם** בייסליין אדומים | חפיפה — האסרציות עצמאיות ואינן נשענות על הבייסליין |
| **ב** | `bestStreak: maxWinStreak` → `+ 1` (`:251`) | **רק** הבייסליין אדום | לבייסליין כוח אבחנה **ייחודי** שאף אסרציה אינה משכפלת |

⛔ **בלי שני הכיוונים אין recapture** — recapture בלי הוכחה הוא הלבנה שקטה של
רגרסיה אמיתית.

---

## 6 · סיכונים שנמדדו ונשללו

| סיכון | המדידה | מסקנה |
|-------|---------|--------|
| הדגל נשמר/מסודר (serialization) | ⛔ אין `JSON.stringify(stats)` · אין persistence · אין עמודת DB | בטוח |
| צרכן חיצוני מחוץ לריפו | הריפו ציבורי; `stats` אינו API יצוא | בטוח |
| קריאה עקיפה (`Object.keys` / spread) | ⛔ 0 אתרים | בטוח |
| `useTradingStats` — צרכן שנשכח | 6 אתרי קריאה (`:2216` · `:2223` · `:2237` · `:2317` · `WeeklyReviewTab.jsx:59`) — ⛔ **אף אחד** אינו קורא `isEmpty` | בטוח |

---

## 7 · מה האבחון ⛔ **לא** בדק

⚠️ הכנות מחייבת לרשום גם את הגבול:

- ⛔ **לא** נבדק אם `total` הוא השדה ה**נכון** להצמיד לטווח ארוך — נבדק רק שהוא
  **זהה** ל-`isEmpty` היום. אם מישהו ישנה בעתיד את `:50`, **שניהם** יזוזו יחד —
  וזו בדיוק המטרה.
- ⛔ **לא** נמדדה השפעת ההסרה על `test:coach` / `test:arch` — תיבדק ב-`verify`
  המלא, ⛔ לא בהנחה.
- ⛔ **לא** נבדק `EMPTY_STATS` עצמו — מחוץ לגבולות הגל בהכרעת ניב.
