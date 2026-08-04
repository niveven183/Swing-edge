# PLAN · A5/Q1 — `winRate` בלי מכנה

**תאריך:** 2026-08-04 · **סטטוס:** ⏸️ awaiting approval · **בסיס:** `docs/STATE.md` ⏸️ · T10 · A5/Q1
**המשימה:** "אחוז הצלחה 0%" על 0W/0L הוא מנה בלי מכנה (§2), בזמן ש-`avgR` מציג `—` נכון.
**היקף:** פריט אחד. שום ממצא אחר מ-`STATE.md` אינו נוגע בתוכנית הזו.

> **הקומיט של המסמך הזה אינו אישור לביצוע.** אין נגיעה בקוד, אין עריכת בייסליין,
> אין `npm`, עד לאישור מפורש של ניב על §4 (החלטת החוזה) ו-§7 (תוכנית הקומיטים).

---

## 0. תיקוני הנחות — לפני כל דבר אחר

שלוש הנחות שנמסרו בפרומפט או יושבות ב-`STATE.md` נבדקו מול הקוד. שתיים מהן אינן מדויקות,
ואחת מהן משנה את הערכת הסיכון של התיקון כולו.

### 0.1 נתיב הקובץ

| נמסר | בפועל |
|------|-------|
| `src/intelligence/core/statisticalModels.js` | `src/intelligence/**utils**/statisticalModels.js` |

אין קובץ ב-`core/` בשם הזה. השורה שנמסרה (`:102`) נכונה בקובץ שב-`utils/`.

### 0.2 ⚠️ מלכודת ה-`isFinite` — **כבר נסגרה, וההנחה בפרומפט אינה תקפה יותר**

הפרומפט מסר כהקשר מחייב: `Number(null)===0` ⇒ `isFinite(null)===true`, ולכן
"**כל** הגנת `isFinite` קיימת עוברת על `null` ואז `.toFixed` זורק — מסך לבן."

מדידה:

```
global isFinite(null)  : true
Number.isFinite(null)  : false
```

שתי פונקציות שונות. הגלובלית מקרבת (`isFinite(0)`), `Number.isFinite` אינה מקרבת כלל.
`docs/DECISIONS.md` 2026-07-30 (שורת `Infinity`/`profitFactor`) מסתיים במילים
*"אגב כך הוקשח `isFinite` → `Number.isFinite`"* — כלומר ההקשחה כבר בוצעה.

סריקה: **0 קריאות ל-`isFinite` הגלובלית בכל קוד הריצה.** שני המופעים היחידים של
המחרוזת הם **בהערה** ב-`statisticalModels.js:162-163` שמסבירה למה `profitFactor`
נשאר `Infinity`. כל ההגנות החיות הן `Number.isFinite` (`src/utils.js` ×6,
`src/lib/tradingStats.js` ×2, `SwingEdge_App.jsx` ×5).

**מסקנה:** מלכודת המסך-הלבן שהפרומפט תיאר **אינה** התרחיש המסוכן כאן. ההגנות הקיימות
דוחות `null` כראוי. זה מרחיב את מרחב האפשרויות ב-§4 — `null` אינו פסול מראש.

### 0.3 🔴 המלכודת **האמיתית** — קריסת סקאלה שקטה, לא מסך לבן

```
null * 100              → 0
Math.round(null * 100)  → 0
`${null}%`              → "null%"
null >= 50              → false
null - 50               → -50
formatPct(null)         → "—"     ← מוגן (src/utils.js:206-211)
```

הסכנה הפוכה מזו שנמסרה: החזרת `null` מ-`outcomeRates` **לא תזרוק**. היא תוכפל
ב-100 בגבול הסקאלה, תיהפך בשקט ל-`0`, ותייצר **בדיוק את אותה מנה-בלי-מכנה** —
רק שהפעם עם קוד שנראה כאילו תיקן אותה. זהו כשל שקט מלא (§2), והוא חמור יותר
ממסך לבן: מסך לבן צועק.

כמה אתרים כאלה יש? ספירה מדויקת (`grep` על `(win|loss|be)Rate ... * 100`):

| קובץ | מופעים | האם אוכלוסייה ריקה מגיעה? |
|------|--------|---------------------------|
| `src/lib/tradingStats.js` | **14** (`:78-80`, `:151-152`, `:294-296`, `:327-328`, `:340-341`, `:374-375`) | ✅ ב-`:151-152` |
| `src/intelligence/core/TradeDNA.js` | 8 (`:260-262`, `:268-270`, `:295-296`) | ❌ מקבוצות מדורגות, `n ≥ 1` |
| `src/intelligence/core/DecisionCoach.js` | 4 (`:190-191`, `:197-198`) | ❌ זהה |
| `src/intelligence/core/EdgeFinder.js` | 3 (`:107`, `:137`, `:153`) | ❌ `MIN_SAMPLE_EDGE` |
| `src/intelligence/core/EdgeDecayAlert.js` | 2 (`:109-110`) | ❌ מינימומים ב-`:92-93` |
| `src/intelligence/core/AntiEdgeLock.js` | 2 (`:174`, `:206`) | ❌ `MIN_TOTAL_N` |
| `src/intelligence/core/GrowthTracker.js` | 1 (`:142`) | ✅ **כן** — חודש בלי עסקאות |
| `src/intelligence/core/MonthlyReport.js` | 1 (`:89`) | ❌ `:69-70` |
| `SwingEdge_App.jsx` | 1 (`:2661`) | ✅ **כן** — מנטי בלי עסקאות סגורות |
| `src/components/TradeCalendar.jsx` | 1 (`:82`) | ✅ **כן** — חודש ריק |
| `src/components/DayTradesModal.jsx` | 1 (`:67`) | ⚠️ תיאורטית |
| **סה"כ** | **38** | **5 ודאיים + 1 תיאורטי** |

**⚠️ תיקון עצמי (§2).** בטיוטה הראשונה של המסמך הזה כתבתי "13 גבולות סקאלה"
מהערכה ולא מספירה. הספירה בפועל היא **38**. המספר שולט על היקף התיקון ועל
עלות הפיקוח, ולכן ההערכה הייתה תת-דיווח פי כמעט שלושה.

38 אתרים שכל אחד מהם ממיר `null` ל-`0` בשקט, מתוכם רק 6 ברי-השגה — זו **בדיוק**
הצורה של באג שנשאר. `Math.round(...)` מוסיף שכבת הסתרה שנייה מעל 30 מהם.
**כל חוזה שנבחר ב-§4 חייב לענות על השאלה הזו במפורש.**

### 0.4 ⚠️ תיקון §2 — המספר "12" נכון לשדה, ושגוי לתופעה

`STATE.md` נושא תיקון קודם: דווחו 3 מופעים של `"winRate":0` בבייסליין, סריקת עץ
מצאה 12, מתוכם 3 במחלקת המכנה-האפס. **התיקון הזה נכון — וגם הוא חלקי.**

הסריקה חיפשה את שם השדה `winRate`. אבל בבייסליין יש עוד ארבעה שיעורי-הצלחה
עם מכנה אפס שנקראים בשם אחר:

```
scenario            planFollowedWR   planIgnoredWR   planAdherence
empty                     0               0                0
normal                   60              66.67           62.5
withBreakEven            33.33            0    ← n=0     100
missingStops             60               0    ← n=0     100
openPositions            66.67            0    ← n=0     100
closedWithoutExit        50               0    ← n=0     100
```

`planAdherence: 100` פירושו שאוכלוסיית `planNo` **ריקה**. ובכל זאת
`planIgnoredWR` מדווח `0` — "0% הצלחה כשסטית מהתוכנית", ליומן שבו לא סטית מהתוכנית
אף פעם. זו **בדיוק** התופעה של A5, ב-4 מתוך 6 פיקסצ'רות, והיא נעלמה מהספירה
מפני שהספירה חיפשה שם שדה במקום לחפש מכנה.

**המספר המתוקן:** בקובץ הקפוא יש **9 מופעי מכנה-אפס**, לא 3 —
3 × `winRate` (כולם מ-`EMPTY_STATS`) + 2 × `planFollowedWR`/`planIgnoredWR` מ-`EMPTY_STATS`
+ 4 × `planIgnoredWR` בתוך יומנים **לא ריקים**. ראה טבלה מלאה ב-§5.2.

זהו הלקח של §2 בשנית: השאלה הנכונה אינה "כמה `winRate:0` יש", אלא
**"על אילו מספרים המכנה אינו יכול להכיל את מה שנספר"**.

---

## 1. שלב 0 — מקורות הפברוק (קריאה בלבד, לא שונה דבר)

### 1.1 `src/intelligence/utils/statisticalModels.js`

```js
// :79
export const outcomeSplit = (items, pnlFn = pnlOf) => { ... return { n: items.length, wins, losses, be }; };

// ─── SCALE CONVENTION (:89-99) ───
// All win-rate functions in this module return a fraction (0..1).
// Intelligence modules convert to 0-100 at their public output boundary.

// :100
export const outcomeRates = (items, pnlFn = pnlOf) => {
  const { n, wins, losses, be } = outcomeSplit(items, pnlFn);
  if (!n) return { winRate: 0, lossRate: 0, beRate: 0, wins, losses, be, n: 0 };  // ← :102 הפברוק
  return { winRate: wins.length/n, lossRate: losses.length/n, beRate: be.length/n, wins, losses, be, n };
};

// :111
export const winRate = (trades) => outcomeRates(trades).winRate;

// :113-114  ← התקדים
// number | null — null means "not measurable", which is not the same as 0.
export const avgR = (trades) => rStats(trades).avg;
```

**שתי עובדות שהתוכנית נשענת עליהן:**

1. **`outcomeRates` כבר מחזיר `n`.** המכנה כבר נוסע יחד עם המונה בצורת ההחזרה.
   השאלה של ניב ב-§4.3 (`{ rate: null, n: 0 }`) אינה דורשת שדה חדש — היא דורשת
   שהצרכנים **יקראו** את `n` שכבר שם.
2. **הפברוק אינו במקום אחד אלא בשניים.** `outcomeRates:102` הוא אחד;
   `tradingStats.js:335` (`summarize`) הוא **משמר עצמאי** של אותו `0`, שלא עובר
   דרך `outcomeRates` כלל. תיקון של `:102` בלבד **לא היה משנה את המסלול של A5.**

### 1.2 `src/lib/tradingStats.js`

| שורה | קוד | האם אוכלוסייה ריקה אפשרית? |
|------|-----|---------------------------|
| `:49` | `if (closed.length === 0) return EMPTY_STATS(capital);` | — (השער) |
| `:55` | `const rates = outcomeRates(metrics, pnlOfMetric)` | ❌ מוגן ע"י `:49` |
| `:76-80` | גבול סקאלה עליון: `rates.winRate * 100` ועוד 2 | ❌ מוגן ע"י `:49` |
| `:151` | `outcomeRates(planYes,...).winRate * 100` | ✅ **כן** — יומן שכולו off-plan |
| `:152` | `outcomeRates(planNo,...).winRate * 100` | ✅ **כן** — 4/6 מהפיקסצ'רות |
| `:233-234` | `lastWeekStats: summarize(lastWeek)` | ✅ **כן** — מסלול A5 |
| `:265-266` | `EMPTY_STATS`: `{ count:0, pnl:0, winRate:0 }` | — (מצב ריק) |
| `:285` | `groupAndAnalyze` | ❌ קבוצה נוצרת מאיבר, `items.length ≥ 1` |
| `:323` | `analyzeByDay` | ❌ `.filter(d => d.items.length > 0)` ב-`:321` |
| `:336` | `summarize` | ❌ מוגן ע"י `:335` — **ושם יושב הפברוק** |
| `:362` | `findEdges` | ❌ `.filter(items.length >= minCount)`, minCount ≥ 2 |

**הערה על `:150`.** ההערה בקוד אומרת מפורשות
*"outcomeRates already returns 0 for an empty population"* — כלומר הפברוק כאן
אינו תאונה, הוא **מתועד ונשען עליו**. כל תיקון חייב להסיר את ההערה הזו יחד עם ההתנהגות.

**חוסר עקביות בצורה שהתגלה אגב:** `EMPTY_STATS.lastWeekStats` הוא
`{ count, pnl, winRate }` — **בלי `beRate`** — בעוד `summarize()` מחזיר
`{ count, pnl, winRate, beRate }`. שתי צורות לאותו שדה. אינו חלק מ-A5; ראה §8.

### 1.3 `scripts/tradingstats-test.mjs`

* `:53-54` — `eq` משתמש ב-`Object.is`, כלומר `eq(x, 0)` **יכשל** על `null`. השער מבחין.
* `:89-95` — `mk()`, ברירת מחדל `followedPlan: true` (ומכאן `planNo` ריק ב-4 פיקסצ'רות).
* `:106` — `eq("winRate", s.winRate, 0)` — **ליטרל קשיח, לא נגזר.** השער כן מבחין.
* `:77-81` — `ratesSumTo100` מדלג על `s.isEmpty`, אבל `close(...)` על `null` ייתן
  `Math.abs(null - 100)` = 100 ⇒ ייכשל. חשוב לחוזה שנבחר.
* `:444-449` — סריקת ה-SCALARS: `s[k] === null || Number.isFinite(s[k])` —
  **כבר מקבלת `null`.** ה-invariant הקיים לא ישבר.
* `:503-519` — שער הבייסליין הקפוא: `deepStrictEqual` על כל 6 התרחישים.

### 1.4 `scripts/fixtures/tradingstats-baseline.json`

1728 שורות, 6 תרחישים. מיפוי מלא של המספרים שיזוזו — §6.

---

## 2. שלב 1 — מיפוי צרכנים (חוסם)

הבסיס: **262** התייחסויות ל-`winRate|lossRate|beRate` ב-27 קבצים. מהן,
**19 אתרי קריאה** ל-`outcomeRates()`/`winRate()` — הם ורק הם יכולים לקבל ערך משונה.
לכל אתר: האם אוכלוסייה ריקה מגיעה אליו, ומה קורה לערך אחריו.

### 2.1 אתרי קריאה — מי בכלל יכול לקבל אוכלוסייה ריקה

| # | אתר | האוכלוסייה | ריקה אפשרית? | מה קורה לערך |
|---|-----|-----------|-------------|--------------|
| 1 | `SwingEdge_App.jsx:664` | `closedTrades` | — | קורא `.losses` בלבד. **חסין לחלוטין** |
| 2 | `SwingEdge_App.jsx:2661` | `s.closed` (מנטי) | ✅ **כן** — מנטי עם עסקאות פתוחות בלבד | `* 100` → קורס ל-0 |
| 3 | `MonthlyReport.js:83` | `list` | ❌ `:69-70` מחזיר מוקדם | `round(x*100)` |
| 4 | `TradeDNA.js:222` | `closed` | ✅ **כן** — `:192` בלי early-return | ללא `*100`; יורד ל-`metrics.winRate` |
| 5 | `AntiEdgeLock.js:174` | `weekMap.get(wk) \|\| []` | ❌ המפתחות באים מ-`weekMap` עצמו; ה-`\|\| []` הגנתי בלבד | `Math.round(x*100)` |
| 6 | `AntiEdgeLock.js:206` | `allTrades` | ❌ `:156` `< MIN_TOTAL_N` → continue | `Math.round(x*100)` |
| 7 | `GrowthTracker.js:142` | `thisTrades` | ✅ **כן** — חודש בלי עסקאות, בלי שום שער | `Math.round(x*100)` → 0 |
| 8 | `EdgeDecayAlert.js:43` | `trades` | ❌ `:40` `if (!trades.length) return null` | מוגן |
| 9-10 | `EdgeDecayAlert.js:109-110` | `recent` / `all` | ❌ `:92-93` מינימומים | מוגן |
| 11 | `DayTradesModal.jsx:63` | `rows` | ⚠️ תיאורטית (מודאל נפתח על יום עם עסקאות) | `Math.round(x*100)` |
| 12 | `TradeCalendar.jsx:78` | `monthTrades` | ✅ **כן** — חודש ריק בניווט | `Math.round(x*100)` |
| 13 | `tradingStats.js:55` | `metrics` | ❌ `:49` | `*100` |
| 14 | `tradingStats.js:151` | `planYes` | ✅ **כן** | `*100` → קורס ל-0 |
| 15 | `tradingStats.js:152` | `planNo` | ✅ **כן** — 4/6 פיקסצ'רות | `*100` → קורס ל-0 |
| 16 | `tradingStats.js:285` | `items` | ❌ בנייה מאיבר | `*100` |
| 17 | `tradingStats.js:323` | `d.items` | ❌ `:321` filter | `*100` |
| 18 | `tradingStats.js:336` | `metrics` | ❌ `:335` — **פברוק נפרד** | `*100` |
| 19 | `tradingStats.js:362` | `items` | ❌ `minCount ≥ 2` | `*100` |

**7 אתרים מקבלים אוכלוסייה ריקה בפועל:** 2, 4, 7, 12, 14, 15, ו-`summarize` (18, דרך `:335`).

### 2.2 צרכני התצוגה — מה קורה אם יגיע `null`

| # | אתר תצוגה | מה עושה עם הערך | על `null` | מוגן? |
|---|-----------|-----------------|-----------|-------|
| ד1 | `src/utils.js:206-211` `formatPct` | `asNum(v)` → `v == null ? NaN` | `"—"` | ✅ **מוגן במפורש**. ההערה: *"A real 0 and 'we never measured this' are different claims"* |
| ד2 | `SwingEdge_App.jsx:3610, 5132` StatCard ראשי | `formatPct(winRate)` | `"—"` | ✅ |
| ד3 | `SwingEdge_App.jsx:3466` מנטי StatCard | `formatPct(menteeStats.winRate)` | `"—"` | ✅ |
| ד4 | `SwingEdge_App.jsx:3433` teaser | `formatPct(teaser.winRate)` | `"—"` | ✅ |
| ד5 | `SwingEdge_App.jsx:4110-4111` | `formatPct(journalStats.winRate)` | `"—"` | ✅ |
| ד6 | `SwingEdge_App.jsx:3675, 3692, 5338, 5355` edge WR | `formatPct(edge.winRate)` | `"—"` | ✅ |
| ד7 | `SwingEdge_App.jsx:436, 549, 566` PDF | `formatPct(...)` בתוך template | `"—"` | ✅ |
| ד8 | `MonthlyReportTab.jsx:179, 247, 262` | `formatPct(v)` | `"—"` | ✅ |
| ד9 | `WeeklyReviewTab.jsx:162, 177, 188, 205, 222` | `pct = formatPct` | `"—"` | ✅ |
| ד10 | `AdminPanel.jsx:928` | `agg?.win_rate == null ? "—"` | `"—"` | ✅ (מקור אחר — SQL) |
| **ד11** | `SwingEdge_App.jsx:5172` bar width | `` style={{ width: `${s.winRate}%` }} `` | `"null%"` → CSS לא חוקי, הרוחב מתעלם | 🔴 **לא מוגן** |
| **ד12** | `SwingEdge_App.jsx:5240` צביעת Cell | `d.winRate >= 50 ? סגול : אפור` | `false` → **אפור**, כלומר "מתחת ל-50%" — טענה על ביצועים שלא נמדדו | 🔴 **לא מוגן** |
| **ד13** | `MonthlyReportTab.jsx:265` צביעת Cell | `d.winRate >= 50` | זהה לד12 | 🔴 **לא מוגן** |
| **ד14** | `SwingEdge_App.jsx:669, 5261, 5272` מיון | `b.winRate - a.winRate` | `null - 60 = -60` → מתמיין כאילו 0 | 🔴 **לא מוגן** |
| **ד15** | `GrowthPredictor.jsx:155, 171` מיון | `b.winRate - a.winRate` | זהה לד14 | 🔴 **לא מוגן** |
| **ד16** | `SwingEdge_App.jsx:673, 708` | `Math.round(bestSetup.winRate)` | `0` | 🔴 **לא מוגן** |
| **ד17** | `SwingEdge_App.jsx:5219, 5409, 5424, 5962` | `Math.round(...)` | `0` | 🔴 **לא מוגן** |
| **ד18** | `IntelligenceUI.jsx:156` | `` {edge.winRate}% `` — רינדור גולמי | React מרנדר `null` כלום → `"% WR"` | 🔴 **לא מוגן** |
| **ד19** | `IntelligenceUI.jsx:628` | `{s.overallWR}%` | `"%"` | 🔴 **לא מוגן** |
| **ד20** | `DayTradesModal.jsx:137` | `{totals.winRate}%` (אחרי `Math.round`) | `"0%"` | 🔴 **לא מוגן** |
| ד21 | `TradeCalendar.jsx:135` | `{monthSummary.winRate}` | ✅ עטוף ב-`monthSummary.count > 0` (`:126`) | ✅ מוגן מבנית |
| ד22 | `MonthlyReport.js:237-301` ספי תובנות | `winRate >= 55` / `<= 45` | `false` / `true`(!) — `null <= 45` הוא **`true`** | 🔴 **לא מוגן** — יפיק חולשה מומצאת |
| ד23 | `MonthlyReport.js:353` דלתא | `round(sum.winRate - prevSum.winRate)` | `null - 60 = -60` | 🔴 לא מוגן (אך מוגן במעלה הזרם ע"י `:70`) |
| ד24 | `MonthlyReport.js:147` | `clamp(sum.winRate, 0, 100)` | `0` | 🔴 לא מוגן (מוגן במעלה הזרם) |
| ד25 | `i18n.js` `{winRate}%` ×5 שפות | אינטרפולציית מחרוזת | `"null%"` או `"undefined%"` | 🔴 לא מוגן |
| ד26 | `GrowthPredictor.jsx:186` | `Math.round(stats.winRate \|\| 0)` | `0` | 🔴 מפברק, אך לא קורס |

**ד22 הוא הממצא החמור ביותר במיפוי.** `null <= 45` הוא `true` ב-JavaScript.
צרכן שמייצר תובנה "הסטאפ הזה התקשה — רק X% הצלחה" יעבור את הסף על אוכלוסייה
**שלא נמדדה כלל**, ויציג טענה שלילית על סטאפ שאין עליו נתונים. זהו מעבר מ"מנה
בלי מכנה" ל"מסקנה בלי מדידה" — החמרה, לא תיקון.

**מסקנת §2 (הוראת ניב: "אם המיפוי מראה שצרכן כלשהו לא מוגן — זה חלק מהתיקון"):**
16 אתרי תצוגה אינם מוגנים. **אבל** — ראה §4 — רובם המכריע אינם ברי-השגה מהאתרים
שהתיקון נוגע בהם. ההצטלבות בין "לא מוגן" ל"ישיג ערך משונה" היא מה שקובע את היקף
התיקון, ולא כל אחד מהם בנפרד.

### 2.3 ⚠️ ממצא: ארבעה שדות מחושבים שאף אחד לא מרנדר

סריקה מלאה של `SwingEdge_App.jsx` + `src/` העלתה **אפס** צרכני תצוגה ל:

* `lastWeekStats` / `lastMonthStats` — נצרכים **רק** ב-`tradingstats-test.mjs`
* `planFollowedWR` / `planIgnoredWR` / `planAdherence` — **אפס** התייחסויות מחוץ ל-`tradingStats.js` והמבחן

זה משנה את הערכת הסיכון מקצה לקצה: **מסלול A5 שניב זיהה (`summarize`) ושני
האתרים שנמצאו ב-§0.4 (`planWR`) הם היום פלט מת.** תיקונם אינו יכול לשבור מסך.
(אין זה אומר שאין לתקנם — פלט מת היום הוא פלט חי מחר, וכל צרכן עתידי יירש
את הפברוק. אבל זה אומר שאפשר לתקן אותם ראשונים, בבטחה מלאה.)

---

## 3. שלב 2 — השער חייב לראות את הבאג

### 3.1 האם השער מבחין בכלל

כן. `scripts/tradingstats-test.mjs:106` הוא `eq("winRate", s.winRate, 0)` — ליטרל
קשיח, לא נגזר מהקוד הנבדק, ו-`eq` משתמש ב-`Object.is`. שינוי הערך יכשיל אותו.
בנוסף `deepStrictEqual` מול הקובץ הקפוא (`:511`) יתפוס כל תזוזה בכל שדה.

### 3.2 🔴 הפער: אין פיקסצ'רה שמפעילה `summarize()` על תקופה ריקה

בכל 6 התרחישים בבייסליין, `lastWeekStats.count ≥ 1` **וגם** `lastMonthStats.count ≥ 1`:

```
normal            lastWeek 3   lastMonth 6
withBreakEven     lastWeek 1   lastMonth 1
missingStops      lastWeek 1   lastMonth 5
openPositions     lastWeek 1   lastMonth 3
closedWithoutExit lastWeek 1   lastMonth 2
empty             lastWeek 0   lastMonth 0   ← אבל זה EMPTY_STATS, לא summarize()
```

כלומר `summarize([])` **לעולם אינו נקרא** באף תרחיש. שלושת מופעי `winRate:0`
במחלקת המכנה-האפס (§6) מגיעים כולם מ-`EMPTY_STATS`, שהוא ליטרל ולא חישוב.
**המסלול ש-A5 משנה אינו מכוסה.**

### 3.3 התרחיש החדש המוצע — `dormantWindows`

יומן **לא ריק** שכל עסקאותיו ישנות מ-30 יום, כך ששני החלונות ריקים.

```js
// 6d · A5 — an empty PERIOD inside a NON-EMPTY journal. Every other fixture in
//      this file has at least one trade in both rolling windows, so summarize()
//      is never called on an empty population anywhere in the suite — which is
//      exactly the path A5 changes. Without this scenario the gate would green-
//      light the fix without ever having executed it.
const DORMANT = [
  mk({ id: "d1", entry: 100, stop: 90, exit: 120, shares: 10, date: daysAgo(90) }),
  mk({ id: "d2", entry: 100, stop: 90, exit: 80,  shares: 10, date: daysAgo(120) }),
  mk({ id: "d3", entry: 100, stop: 90, exit: 130, shares: 10, date: daysAgo(150) }),
];
```

### 3.4 ✅ הרצה מול הקוד ה**קיים** — התרחיש נכשל שם, כנדרש

הורץ כ-probe עצמאי ב-`/tmp` (לא נגעתי בקובץ המבחן, לא ערכתי בייסליין, לא הרצתי `npm`):

```
A5 scenario · dormantWindows — 3 closed trades, none in the last 30 days
  journal is NOT empty:      isEmpty = false · totalTrades = 3 · winRate = 66.66666666666666
  lastWeekStats  = {"count":0,"pnl":0,"winRate":0,"beRate":0}
  lastMonthStats = {"count":0,"pnl":0,"winRate":0,"beRate":0}

  ✓ journal is non-empty (precondition)
  ✓ lastWeekStats.count === 0 (the window really is empty)
  ✗ lastWeekStats.winRate is NOT a fabricated 0 on a 0-trade window
  ✗ lastMonthStats.winRate is NOT a fabricated 0 on a 0-trade window

❌ probe: 2 assertion(s) failed on the CURRENT code.
exit=1
```

**התרחיש נצפה נכשל על הקוד הישן.** יומן עם 3 עסקאות ו-66.67% הצלחה כולל מדווח
"0% הצלחה השבוע" ו-"0% הצלחה החודש" — על אפס עסקאות. השער החדש רואה את הבאג.

בנוסף, אותו probe אישר את האתר השני:

```
planYes n=2, planNo n=0 →  planAdherence: 100  planFollowedWR: 50  planIgnoredWR: 0
```

100% היצמדות לתוכנית, ובכל זאת "0% הצלחה כשסטית". תרחיש `allOnPlan` נדרש גם הוא.

---

## 4. שלב 3 — החלטת החוזה · **הצגה, לא ביצוע**

### 4.1 השאלה

מה `outcomeRates` (ו-`summarize`) מחזירים כשהמכנה אפס.

### 4.2 האפשרויות

| | חוזה | יתרון | חיסרון קטלני |
|---|------|-------|--------------|
| **א** | `0` (הקיים) | אפס שינוי | הבאג עצמו |
| **ב** | `undefined` | `formatPct` מטפל | `"winRate" in obj` נשבר; `JSON.stringify` **מוחק את השדה** מהבייסליין — הקובץ הקפוא יאבד את היכולת להבחין בין "לא נמדד" ל"השדה לא קיים" |
| **ג** | `NaN` | נכשל בכל `Number.isFinite` | `JSON.stringify(NaN)` → `null` — הבייסליין לא יוכל לייצג אותו נאמנה; והוא מתפשט בשקט דרך אריתמטיקה |
| **ד** | סנטינל מספרי (`-1`) | שורד JSON | מספר שמתחזה למדידה. `-1 <= 45` הוא `true` — ד22 יפיק חולשה מומצאת. **בדיוק הכשל של `Infinity` בלי היתרון שלו** |
| **ה** | `null` | תקדים קיים (`avgR`, `sharpeR`, `expectancy`); `formatPct` כבר מרנדר `"—"`; `Number.isFinite(null) === false` (§0.2); `JSON.stringify` שומר `null` נאמנה | קורס ל-`0` בכל אחד מ-13 גבולות הסקאלה (§0.3) |
| **ו** | `{ rate: null, n: 0 }` — עטיפה חדשה | המכנה נוסע במפורש | `outcomeRates` **כבר** מחזיר `n` (§1.1). זו עטיפה שנייה סביב מידע שכבר קיים, והיא **שוברת את כל 19 אתרי הקריאה** בבת אחת |

### 4.3 ההכרעה על `{ rate: null, n: 0 }` (השאלה המפורשת של ניב)

**נבדק והתשובה שלילית — מהסיבה ההפוכה מהצפוי.** דרישת §2 היא שהמכנה יגיע עם
המונה. `outcomeRates` **כבר עומד בה**: הוא מחזיר `{ winRate, lossRate, beRate, wins, losses, be, n }`.
המכנה `n` שם היום. גם הצרכנים ב-`tradingStats` כבר פולטים אותו הלאה (`count`,
`totalTrades`, `wins`/`losses`/`be`), וגם התצוגה כבר מציגה אותו
(`winLossBeSub` ב-`SwingEdge_App.jsx:646`: `"5W / 3L / 2BE"` לצד כל `formatPct`).

הבעיה ב-A5 **אינה** שהמכנה חסר. הבעיה היא ש**המונה מומצא כשהמכנה אפס.**
`{ rate: null, n: 0 }` היה מוסיף שכבת עטיפה שלישית לאותו מידע, שוברת 19 אתרי
קריאה, ולא פותרת דבר שהצורה הקיימת אינה פותרת. **✂️ נדחה.**

### 4.4 ההמלצה — **ה' + חסימת הקריסה במפורש**

`null` לבדו אינו מספיק, כי §0.3 מראה שהוא יקרוס בשקט ל-`0`. לכן החוזה הוא **זוג**:

1. **`outcomeRates` מחזיר `winRate: null, lossRate: null, beRate: null` כש-`n === 0`**,
   ומשאיר `n: 0` בצורה. עם הערה שמסבירה למה, על משקל השורה הקיימת ב-`:113`.
2. **`summarize` (`tradingStats.js:335`) מפסיק לפברק בעצמו** ומחזיר
   `{ count: 0, pnl: 0, winRate: null, beRate: null }`.
3. **גבול הסקאלה מפסיק להיות `* 100` חשוף.** פונקציה אחת, מיוצאת מ-`statisticalModels`
   ליד ה-SCALE CONVENTION, ומשמשת ב**כל** 38 האתרים:

   ```js
   // The 0..1 → 0..100 boundary is the one place a "not measurable" rate can
   // silently become a measured zero: `null * 100 === 0`. Crossing the scale is
   // therefore a named operation, not a bare multiplication — so a future site
   // that forgets the guard is a site that never got written.
   export const toPct = (rate) => (rate == null ? null : rate * 100);
   ```

   זהו הלב של התיקון. בלעדיו, כל אחד מ-38 האתרים הוא באג ממתין.
4. **`Math.round(x * 100)` בצרכנים** (30 מתוך 38 האתרים) הופך ל-
   `const r = toPct(x); r == null ? null : Math.round(r)`. במקום שבו קיים
   `Math.round` על `toPct`, השקילות `Math.round(null)` → `0` היא בדיוק אותה
   מלכודת שכבה אחת מעל, ולכן הגידור הוא על `null` ולא על התוצאה.
5. **הצרכנים הלא-מוגנים שנמצאים על המסלול** מתוקנים באותו קומיט (הוראת ניב).
   מי בדיוק — §4.5.

### 4.5 היקף התיקון בצרכנים — ההצטלבות בלבד

16 אתרי תצוגה אינם מוגנים (§2.2), אבל רק אלה שיכולים **לקבל** `null` דורשים נגיעה:

| צרכן | מקור אפשרי ל-`null` | פעולה |
|------|---------------------|-------|
| ד11 `:5172` bar width | `stats.bySetup[].winRate` — **לא ניתן** (`items.length ≥ 1`) | ⏭️ לא נוגעים |
| ד12 `:5240` צביעה | `bySetup` — לא ניתן | ⏭️ לא נוגעים |
| ד13 `MonthlyReportTab:265` | `setupBreakdown` — `count ≥ 1` | ⏭️ לא נוגעים |
| ד14/ד15 מיון | `bySetup`/`byEmotion` — לא ניתן | ⏭️ לא נוגעים |
| ד16/ד17 `Math.round` | `bySetup`/`byEmotion`/`topEdges` — לא ניתן | ⏭️ לא נוגעים |
| **ד18** `IntelligenceUI:156` | `EdgeFinder` edges — **דורש בדיקה** בשלב הביצוע | 🔧 לבדוק ולגדר |
| **ד19** `IntelligenceUI:628` | `AntiEdgeLock.overallWR` — מוגן ע"י `MIN_TOTAL_N` | ⏭️ מאומת חסין |
| **ד20** `DayTradesModal:137` | `rows` יכול להיות ריק תיאורטית | 🔧 לגדר ב-`count > 0` כמו TradeCalendar |
| **ד22** `MonthlyReport:237-301` | מוגן במעלה הזרם ע"י `:69-70` | ⏭️ חסין — **אך ראה §8** |
| **מס' 2** `App:2661` teaser | `s.closed` ריק אפשרי | 🔧 `toPct` + `formatPct` כבר מרנדר `"—"` |
| **מס' 4** `TradeDNA:222` | `closed` ריק אפשרי | 🔧 לגדר |
| **מס' 7** `GrowthTracker:142` | `thisTrades` ריק — **חודש בלי עסקאות** | 🔧 `toPct` + לבדוק את צרכן `stats.winRate` |
| **מס' 12** `TradeCalendar:78` | חודש ריק | ✅ כבר מוגן ע"י `count > 0` ב-`:126` — רק `toPct` |

### 4.6 🔑 ההכרעה המפורשת על `EMPTY_STATS` — **מחוץ להיקף**

ניב דרש הכרעה מפורשת, לא גרירה שקטה. ההמלצה: **`EMPTY_STATS` נשאר `0` מספרי.**

**שלוש סיבות, לפי סדר משקל:**

1. **זו החלטה קיימת ומתועדת, לא השמטה.** `src/utils.js:203-205`, בהערה שנכתבה
   בדיוק על הנושא הזה: *"Empty portfolios still read 0% — EMPTY_STATS carries
   a numeric 0."* שינוי כאן הוא **ביטול החלטת T8**, וזה דורש שורה משלו
   ב-`DECISIONS.md` ודיון משלו — לא פסקה בתוך תיקון של תופעה אחרת.
2. **A5 הוא תקופה ריקה בתוך יומן לא-ריק, וזו שאלה אחרת.** "לא סחרת השבוע" הוא
   מידע חסר בתוך גוף מידע קיים. "לא סחרת מעולם" הוא מצב המוצר בפתיחה, והוא
   נענה על-ידי מסך אונבורדינג, לא על-ידי KPI. `formatPct` יציג `"—"` לשניהם
   באותה מידה — אבל רק לאחד מהם זו התנהגות **חדשה**.
3. **הפרדת האותות בבייסליין.** אם `EMPTY_STATS` נשאר, שלושת מופעי ה-`winRate:0`
   בתרחיש `empty` **אינם זזים**. כל תזוזה בקובץ הקפוא היא אז, בהגדרה, מסלול A5
   אמיתי. מיזוג שני השינויים היה מייצר דיף שבו אי-אפשר להוכיח מה בדיוק זז ולמה.

**⏸️ אם ניב מכריע אחרת** — `EMPTY_STATS` לוקח `null` והמסלול הוא קומיט **נפרד**
לחלוטין, אחרי שזה נסגר, עם שורת `DECISIONS.md` שמבטלת את השורה של T8.
**לא באותו קומיט, ולא בשקט.**

---

## 5. שלב 4 — טבלת characterization לפני/אחרי

### 5.1 כל 12 מופעי `"winRate": 0`, עם שורה, מסווגים

המכנה של `outcomeRates` הוא `n = items.length` — לא `wins + losses` (BE בפנים).
לכן הסיווג נעשה מול `count`/`totalTrades` של הצומת, ולא מול סכום המנצחות והמפסידות.

| # | שורה | נתיב | מכנה | מחלקה | לפני | אחרי | נימוק |
|---|------|------|------|-------|------|------|-------|
| 1 | `:15` | `empty.winRate` | `totalTrades: 0` | 🅐 מכנה-אפס | `0` | **`0` (ללא שינוי)** | `EMPTY_STATS` — מחוץ להיקף לפי §4.6 |
| 2 | `:45` | `empty.lastWeekStats.winRate` | `count: 0` | 🅐 מכנה-אפס | `0` | **`0` (ללא שינוי)** | ליטרל של `EMPTY_STATS:265`, לא `summarize()` |
| 3 | `:50` | `empty.lastMonthStats.winRate` | `count: 0` | 🅐 מכנה-אפס | `0` | **`0` (ללא שינוי)** | ליטרל של `EMPTY_STATS:266` |
| 4 | `:335` | `normal.byDayOfWeek[1].winRate` | `count: 1` | 🅑 אפס אמיתי | `0` | `0` | יום עם עסקה מפסידה אחת. 0/1 = 0% **שנמדד** |
| 5 | `:639` | `withBreakEven.lastWeekStats.winRate` | `count: 1` | 🅑 אפס אמיתי | `0` | `0` | `be1` בלבד — 0 מנצחות מתוך 1. אמיתי |
| 6 | `:645` | `withBreakEven.lastMonthStats.winRate` | `count: 1` | 🅑 אפס אמיתי | `0` | `0` | זהה |
| 7 | `:724` | `withBreakEven.byDayOfWeek[0].winRate` | `count: 1` | 🅑 אפס אמיתי | `0` | `0` | עסקה אחת, לא מנצחת |
| 8 | `:738` | `withBreakEven.byDayOfWeek[2].winRate` | `count: 1` | 🅑 אפס אמיתי | `0` | `0` | זהה |
| 9 | `:752` | `withBreakEven.byDayOfWeek[4].winRate` | `count: 1` | 🅑 אפס אמיתי | `0` | `0` | זהה |
| 10 | `:759` | `withBreakEven.byDayOfWeek[5].winRate` | `count: 1` | 🅑 אפס אמיתי | `0` | `0` | זהה |
| 11 | `:1101` | `missingStops.byDayOfWeek[0].winRate` | `count: 1` | 🅑 אפס אמיתי | `0` | `0` | זהה |
| 12 | `:1122` | `missingStops.byDayOfWeek[3].winRate` | `count: 1` | 🅑 אפס אמיתי | `0` | `0` | זהה |

**מדוע 9 המופעים של 🅑 אינם יכולים לזוז — הוכחה מבנית, לא הבטחה:**
`analyzeByDay` מסנן `.filter(d => d.items.length > 0)` ב-`:321` **לפני**
`outcomeRates`, ולכן ענף המכנה-האפס אינו בר-השגה משם כלל.
`summarize` בפיקסצ'רות האלה מקבל `count ≥ 1`.

### 5.2 המופעים שכן יזוזו — שנמצאו רק ב-§0.4

| # | שורה | נתיב | מכנה | לפני | אחרי | נימוק |
|---|------|------|------|------|------|-------|
| א | `:632` | `withBreakEven.planIgnoredWR` | `planNo: 0` (`planAdherence: 100`) | `0` | **`null`** | אין עסקה שסטתה מהתוכנית. "0% הצלחה בסטייה" הוא מנה בלי מכנה |
| ב | `:1009` | `missingStops.planIgnoredWR` | `planNo: 0` | `0` | **`null`** | זהה |
| ג | `:1324` | `openPositions.planIgnoredWR` | `planNo: 0` | `0` | **`null`** | זהה |
| ד | `:1569` | `closedWithoutExit.planIgnoredWR` | `planNo: 0` | `0` | **`null`** | זהה |
| ה | `:37` | `empty.planFollowedWR` | `EMPTY_STATS` | `0` | `0` (ללא שינוי) | §4.6 |
| ו | `:38` | `empty.planIgnoredWR` | `EMPTY_STATS` | `0` | `0` (ללא שינוי) | §4.6 |

**סה"כ תזוזה בקובץ הקפוא: 4 ערכים מתוך 1728 שורות.** `0` → `null`, כולם
`planIgnoredWR`, כולם עם `planAdherence: 100` באותה רשומה שמוכיח את המכנה האפס.
**אף מספר גלוי-למשתמש אינו זז** (§2.3 — לשדה הזה אין צרכן תצוגה).

### 5.3 שדות חדשים בבייסליין

| תרחיש | מקור |
|-------|------|
| `dormantWindows` | §3.3 — יומן לא-ריק, שני החלונות ריקים. `lastWeekStats.winRate` ו-`lastMonthStats.winRate` = `null` |
| `allOnPlan` | §3.4 — `planNo` ריק במפורש, מתועד כתרחיש ולא כתופעת לוואי של ברירת המחדל ב-`mk()` |

שני התרחישים **תוספת**, לא שינוי. הבייסליין הופך ל-**v3**, וכותרת הקובץ
`tradingstats-test.mjs:22` תתעד את המעבר v2 → v3 באותו פורמט שבו תועד v1 → v2.

---

## 6. סיכום ההשלכות (§8 — הפילטר תפס: "רץ אוטומטית בפרודקשן")

| ציר | הערכה |
|-----|-------|
| משתמשים | **אפס מספר גלוי זז.** 4 הערכים שזזים הם שדות ללא צרכן תצוגה (§2.3). |
| נתונים | ❌ אין DB, אין מיגרציה, אין כתיבה. חישוב בלבד. |
| עלות | ❌ אפס. שתי פונקציות טהורות. |
| תקרות ספק | ❌ לא רלוונטי. |
| אבטחה | ❌ לא רלוונטי. |
| תחזוקה (§3) | ✅ `toPct` הופך גבול-סקאלה ממוסכמה שצריך לזכור למנגנון שאי-אפשר לשכוח. |
| הפיכות | ✅ `git revert` על 3 קומיטים. |
| כשל שקט | 🔴 **הסיכון היחיד וכולו כאן.** `null * 100 === 0` (§0.3). הצעד היחיד שמונע אותו הוא `toPct` ב-**38/38** האתרים — לא רק ב-6 ברי-ההשגה, כי "בר-השגה" הוא תכונה של הקוד היום ולא של הקוד בעוד חודש. אתר שנשכח = הבאג חוזר, בקוד שנראה מתוקן. **דורש ספירה מפורשת בדיווח הסופי: `grep` שמראה כמה `* 100` חשופים נותרו. היעד הוא אפס, והמספר מודבק.** |

**פסק דין: ⚠️ בצע עם הגנה** — ההגנה היא `toPct` ב-38/38 וספירת ה-`grep` בדיווח.

---

## 7. תוכנית הביצוע (רק אחרי אישור)

| # | קומיט | תוכן |
|---|-------|------|
| 1 | `test(tradingstats): A5 — scenario for an empty period inside a non-empty journal` | `dormantWindows` + `allOnPlan` ב-`tradingstats-test.mjs` **בלבד**. מורץ מול הקוד הישן ומדווח **נכשל** — הפלט מודבק. הבייסליין **לא** נערך. |
| 2 | `fix(stats): a rate with a zero denominator is null, not 0%` | `statisticalModels.js` (`outcomeRates` + `toPct` חדש) · `tradingStats.js` (`summarize`, `planWR`, **14** גבולות סקאלה, הסרת ההערה ב-`:150`) · 24 גבולות הסקאלה הנותרים ב-`TradeDNA`/`DecisionCoach`/`EdgeFinder`/`EdgeDecayAlert`/`AntiEdgeLock`/`GrowthTracker`/`MonthlyReport`/`App`/`TradeCalendar`/`DayTradesModal` · הצרכנים מ-§4.5 · `docs/STATE.md` · `docs/DECISIONS.md`. |
| 3 | `chore(baseline): recapture tradingstats baseline v2→v3 — 4 planIgnoredWR values move 0 → null, 2 scenarios added` | הבייסליין בלבד. הכותרת אומרת מה זז וכמה. הדיף מודבק בדיווח ומושווה ל-§5.2 מספר-מול-מספר. |

**דרישות סיום:** `npm run verify` מלא, פלט מודבק ולא מסוכם ·
`docs/STATE.md` באותו קומיט לפני ה-push (§10.1) · ללא force-push · דיווח hash.

---

## 8. ⚠️ ממצאים סביבתיים — לא מתוקנים כאן, להכרעת ניב (§11)

1. **`MonthlyReport.js:237-301` — `null <= 45` הוא `true`.** ארבעה ספי תובנות
   (`worstSetup`/`worstEmotion`, ×2 ב-strengths/weaknesses ו-actionItems).
   מוגנים היום ע"י `:69-70`, אבל ההגנה היא במעלה הזרם ובמרחק. אם מישהו יסיר
   את המוקדם-חזור, האפליקציה תפיק חולשה מומצאת. **הצעה: `>= 55` / `<= 45`
   מוקשחים ל-`Number.isFinite(x) && ...`.** לא בהיקף A5.
2. **חוסר עקביות בצורת `lastWeekStats`.** `EMPTY_STATS` פולט `{count, pnl, winRate}`,
   `summarize` פולט `{count, pnl, winRate, beRate}`. שדה שקיים או לא קיים לפי מסלול.
3. **`IntelligenceUI.jsx:156, 628` — רינדור גולמי `{x}%`** בלי `formatPct`.
   מוגנים מבנית היום; חורגים מהמוסכמה של "מקור-אמת-אחד לעיצוב אחוזים".
4. **`GrowthPredictor.jsx:186` — `stats.winRate || 0`.** `||` מוחק גם `0` אמיתי
   וגם היעדר מדידה לאותו ערך. הוא מייצר שאלת חידון על מספר שאולי לא נמדד.

כולם ייכנסו ל-`docs/STATE.md` ⚠️ בקומיט של התיקון (§10.1 — אין פריט יתום).
