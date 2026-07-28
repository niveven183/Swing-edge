# PLAN 2026-07-28 — קבוצה 3: חוזה ה-R

**ממצאים:** FIN-007 · 008 · 009 · 010 · 011 · 012 · 032 · 034
**מקור:** `docs/audits/AUDIT-2026-07-27-financial-integrity.md` §5, קבוצה 3
**סטטוס:** awaiting approval — אפס שינויי קוד בוצעו
**בסיס:** HEAD `6f32eda`

> מספרי השורות באודיט נכתבו מול `e8c2d3b` ונסחפו. כל מספר במסמך הזה
> נמדד מחדש מול `6f32eda`.

---

## 0. שער רגרסיה — בסיס

```
$ npm run test:coach
✅ coach-invariance: 110 assertions passed across 5 scenarios × 7 profiles × 2 histories.
   verdict / confidence / numbers are byte-identical for every profile including null.
```

⚠️ **`test:coach` אינו מכסה את מתמטיקת ה-R.** הפיקסצ'רים ב-
`scripts/coach-invariance-test.mjs:51-56` בונים עסקאות עם `status:"closed"`
(אותיות קטנות) ועם `exitPrice` במקום `exit`. `getClosed`
(`statisticalModels.js:36`) דורש `status === "CLOSED" && exit != null`, ולכן
**כל עסקאות הפיקסצ'ר מסוננות החוצה** מהמסלול הסטטיסטי. 110 האסרשנים שומרים
על אינווריאנטיות של `DecisionCoach` בין פרופילים — הם שער רגרסיה תקף
למשימה הזו, אך **אינם ראיה לכיסוי**. מכאן שקובץ הבדיקות החדש אינו אופציונלי.

הערה: `npm run verify` מריץ היום **חמישה** צעדים
(`test:coach → test:import → test:settings → test:datachain → build`),
לא ארבעה כפי שמופיע ב-`CLAUDE.md` §7.

---

## 1. אבחון — מה נמצא בפועל

### 1.1 החוזה ומפרי החוזה

`calcTradeMetrics` (`src/utils.js:29-39`) מחזיר `rMultiple: null` בשני מצבים:
אין `exit` (`:30`), ו-`stop == null` (`:37`). מתועד ב-`:34-36`.

צוואר הבקבוק היחיד הוא `statisticalModels.js:39` —
`rOf = (t) => calcTradeMetrics(t).rMultiple || 0`.

| פונקציה | שורה | המכנה |
|---------|------|--------|
| `avgR` | `:51` | `mean()` על הרשימה המלאה |
| `expectedValueR` | `:62-64` | `wins.length / trades.length` |
| `sharpeR` | `:81-83` | גם הממוצע וגם סטיית התקן מזוהמים |
| `kellyFraction` | `:166-168` | שני הדליים |
| `rankSetupEdges` | `:138` | דרך `avgR` |

תשעה מודולים צורכים: `TradeDNA` (`:211-215`), `EdgeFinder` (`:61-64`),
`DecisionCoach` (`:50`), `GrowthTracker` (`:44`, `:130`), `AntiEdgeLock`
(`:71`, `:145`, `:158`), `EdgeDecayAlert` (`:40`, `:93-94`), `LearningEngine`
(`:82`), `MonthlyReport`, `AdaptiveLessons`.

**רשימת אתרי הכפייה המלאה:**

| # | אתר | קוד | מדולל? |
|---|-----|------|---------|
| 1 | `statisticalModels.js:39` | `rMultiple \|\| 0` | **כן** — חמש הפונקציות לעיל |
| 2 | `useTradingStats.js:37` | `s + (m.rMultiple \|\| 0)) / metrics.length` | **כן** — ה-KPI הראשי |
| 3 | `useTradingStats.js:221-223` | `totalR` ואז `avgR: totalR / items.length` | **כן** — כל שורת `bySetup`/`byEmotion`/`byMarket` |
| 4 | `useTradingStats.js:288` | `reduce(… \|\| 0) / n` | **כן** — `topEdges`/`antiEdges` |
| 5 | `MonthlyReport.js:51` | `r: typeof m.rMultiple === "number" ? … : 0` | **כן** — כפייה בזמן enrich, לפני `summarize` |
| 6 | `AdaptiveLessons.js:16` | `calc(t)?.rMultiple ?? 0` | לא מדלל (פרדיקטים ב-`:81`, `:101`) — אך **מסווג שגוי**: מנצחת בלי stop נספרת כ"יציאה מוקדמת מתחת ל-1R" |
| 7 | `SwingEdge_App.jsx:273` | `m.rMultiple != null ? … : 0` | FIN-009, תצוגה |

`totalR` (#3) כ**סכום** אינו נפגע מהוספת 0 — החלוקה בשורה הבאה היא השוברת.
לכן התיקון חייב להחזיק סכום ומונה **בנפרד**.

**אתרים שכבר מכבדים את החוזה** (ללא שינוי — והם המודל לצורה הנכונה):
`SwingEdge_App.jsx:208` (CSV), `TradeCalendar.jsx:33`, `DayTradesModal.jsx:44`,
`MobileTradeCard.jsx:77`, `SwingEdge_App.jsx:3301`, `SwingEdge_App.jsx:3806`.

### 1.2 FIN-008 — אומת, לא הונח

`MonthlyReport.js:96` קורא `e.rMultiple` בתוך `groupBy`. האובייקט המועשר פולט
`r` ב-`:51`. השרשרת המלאה:

`e.rMultiple` → `undefined` → `g.r` מאותחל ל-`0`, ו-`0 + undefined` → **`NaN`**.
NaN בולע, ולכן כל `+=` נוסף נשאר NaN → `:100` `avgR: round(g.r / g.count, 2)`
→ `round()` ב-`:25` הוא `Math.round((v || 0) * p) / p`, ו-**NaN הוא falsy** → `0`.

**כל `avgR` קבוצתי הוא בדיוק `0.00`** — לכל setup, emotion, market ויום בשבוע.
הערך מוזרם ל-`:108` `edgeScore(b.wins, b.count, b.avgR)`, ו-`edgeScore`
(`statisticalModels.js:120-121`) הוא `wilsonLowerBound × (1 + max(0, avgR))` —
כך שגורם ה-expectancy מתכווץ ל-`×1` ו**הדירוג מתנוון ל-Wilson בלבד**.

היקף שהאודיט אינו אומר במפורש: `summarize()` ב-`:71` קורא `e.r` **נכון**.
לכן ה-avgR הראשי של החודש תקין (עד כדי #5 לעיל) בעוד כל שורת קבוצה מציגה
0.00 — **שני המספרים סותרים זה את זה על אותו מסך היום.**

### 1.3 `stop === entry`

`utils.js:38-39`: `risk = Math.abs(entry - stop) * shares` → `0`, ואז
`risk > 0 ? pnl/risk : 0` מחזיר **`0`**. עסקה רווחית עם מכנה סיכון לא-מוגדר
מדווחת `+0.00R`.

`validateTradeInputs:73-76` כבר חוסם `s === e` בגבול הטופס — כלומר המצב מגיע
לפרודקשן דרך **ייבוא או עריכה ישירה בלבד**. זה בדיוק המסלול שפריט 2 בתור
עומד להרחיב, וזו הסיבה שהתיקון הזה קודם לו.

### 1.4 FIN-032 / FIN-034

**FIN-032** — `statisticalModels.js:59` ו-`:163`:
`losses = trades.filter(t => !isWin(t))`, ו-`isWin` הוא `pnl > 0`. עסקת BE
(`pnl === 0`) נספרת כ**הפסד** בשתיהן.

⚠️ **מלכודת בתיקון הנאיבי:** `expectedValueR` מחשב
`wr = wins.length / trades.length` ומחזיר `wr*avgWin + (1-wr)*avgLoss`.
הוצאת BE מדלי ההפסדים בלי לתקן את המשקל משאירה את `(1-wr)` מעניק משקל-יתר
להפסדים — כלומר מחליף הטיה אחת באחרת. המשקלים חייבים להיבנות מחדש כשלוש
אוכלוסיות מפורשות שסכומן 1.

**FIN-034** — `:15-19` `stddev` מחזיר `0` כש-`n < 2`; `:83` `sharpeR` עושה
`sd > 0 ? mean/sd : 0` → מחזיר **`0`**, שנראה כמדידה.

⚠️ אותה צורה ב-`:13` — `mean` מחזיר `0` לרשימה ריקה. אחרי תיקון FIN-007, תיק
שכל עסקאותיו חסרות stop יסונן לרשימה ריקה ויקרא **"0R"** במקום "אין נתונים".
זו מוקש שהתיקון חייב לא לדרוך עליו.

### 1.5 MAE/MFE והסריקה הגורפת

מאומת ב-`SwingEdge_App.jsx:1994-1995`:
`parseFloat(closeForm.maxFavorable) || null`. `parseFloat("0")` הוא `0`, falsy
→ נשמר `null`. עסקה שמעולם לא הלכה לטובת המשתמש — אפס אמיתי ומשמעותי —
אינה ניתנת להבחנה מ"לא מולא".

**תיקון:** `Number.isFinite(v) ? v : null` על ערך מומר, כך ש-`0` נשמר
ו-`"abc"` (NaN) נשמר `null`.

---

## 2. ממצאים מחוץ להיקף — לא ייגעו, ניב מחליט

לפי CLAUDE.md §11, נמצאו תוך כדי ואינם בשמונת הנ"ל:

| אתר | הבעיה | שיוך |
|-----|--------|-------|
| `EditTradeModal.jsx:98-99` | מטפל ב-0 נכון, אך `Number("abc")` → **NaN נשמר**, לא null | משפחת FIN-030 |
| `psychologyPatterns.js:117-118` | `Number(t.maxAdverse) \|\| 0` אחרי פילטר ב-`:115` שדורש רק **אחד** מ-MAE/MFE — החסר הופך לאפס מפוברק במערך באורך מלא. **בדיוק משפחת המכנה.** | חדש — לא באודיט |
| `SwingEdge_App.jsx:1642-1643` | פילטר ה-R ביומן: `null < parseFloat(rMin)` כופה null ל-0; עסקאות בלי stop מסוננות כאילו R=0 | משפחת FIN-007 |
| `SwingEdge_App.jsx:241` + `:358` | `stats.avgR.toFixed(2)` יוצר מחרוזת, ואז `avgR >= 0` משווה מחרוזת; `-0` → `"+-0.00R"` ב-PDF | FIN-031, קבוצה 7 |
| `SwingEdge_App.jsx:2985` | `(mm.rMultiple \|\| 0) >= 0` בוחר את ה**צבע** — `—` נצבע בירוק רווח | קוסמטי |
| `DecisionCoach.js:32` | `Number(form.entryQuality) \|\| null` — אך `qstars` ממילא מתייחס ל-0 כ"אין דירוג" | שפיר |

---

## 3. ניתוח השלכות (CLAUDE.md §8)

הפילטר נתפס: רץ בפרודקשן ומשנה מספרים שמשתמשים מקבלים לפיהם החלטות מסחר.

| ציר | הערכה |
|-----|--------|
| **משתמשים** | ראה §3.1 |
| **נתונים** | אין כתיבה, אין מיגרציה. הכל גזירה בצד-קריאה. חריג יחיד: תיקון MAE/MFE משנה מה **סגירות עתידיות** שומרות (`0` במקום `null`); שורות קיימות לא נגעות ולא ניתנות לשחזור לאחור. הפיך ב-`git revert`. |
| **עלות** | אפס. אין שאילתות, אין API, אין דקות Actions. סקריפט `node` נוסף ב-`verify` (~1 שנייה). |
| **תקרות ספק** | לא נגעו — אין Gmail, Finnhub או Supabase. |
| **אבטחה** | אין סודות, אין RLS, אין חשיפת נתונים. |
| **תחזוקה (§3)** | מקטין עבודה: מסלק מחלקת פניות "למה ה-avgR שלי 0.00" ומפסיק שקר שקט בדוח החודשי. |
| **הפיכות** | revert יחיד; אין state לפרוק. |
| **כשל שקט** | **הסיכון המרכזי.** `avgR` נעשה nullable, ולכן כל `.toFixed()` לא-מוגן יזרוק — כשל **רועש**, וזה הנכון, אך הוא חייב להיתפס בבדיקות ולא אצל משתמש. מכאן ש-§4.2 מונה את כל 9 אתרי הקריאה במפורש, ושסריקת "אף פונקציה לא מחזירה NaN" היא חובה ולא נחמדות. |

### 3.1 ציר המשתמשים — מי יראה מספר אחר מחר, ובאיזה כיוון

- **כל משתמש** — שורות הקבוצה בדוח החודשי עוברות מ-`0.00R` קשיח ל-avgR האמיתי
  (FIN-008), ודירוג ה-setup מפסיק להיות Wilson בלבד. זו ההשפעה הרחבה ביותר,
  והיא תיקון נקי.
- **כל משתמש עם עסקת BE** — Expectancy ו-Kelly **עולים**, כי BE מפסיק להיספר
  כהפסד (FIN-032).
- **משתמש עם עסקה סגורה אחת** — Sharpe עובר מ-`0` ל-`—` (FIN-034). סמנטי,
  לא מספרי.
- **המשתמש החציוני (0.0% ללא stop)** — avgR/Sharpe/Kelly **ללא שינוי**;
  עיקרון #5 מחייב זאת וזו הבדיקה הראשונה שנכתבת. יראה תווית גודל-מדגם חדשה.
- **1-2 המשתמשים שמחזיקים את כל 23 העסקאות ללא stop** — avgR זז **הרחק מאפס**,
  כלומר גודלו גדל בכיוון האדג' האמיתי שלהם. מד הסיכון יורד מקריאה פנטומית
  (`Math.abs(entry - null) * shares` = שווי הפוזיציה המלא, מוצמד ל-~100% עם
  אזהרת חריגה שקרית) לערך האמיתי, וציון ניהול הסיכון ב-GrowthTracker **עולה**,
  כי הסיכון הפנטומי הוא מה שדיכא אותו.

**פסק דין: ✅ בצע** — עם הסתייגות שהחלק היחיד שיכול להיכשל רועש בזמן ריצה הוא
מעבר `avgR` ל-nullable, ולכן §4.2 מונה את כל אתרי הקריאה במקום להשאיר אותם
להתגלות.

---

## 4. התיקון

### 4.0 עקרונות מנחים (מחייבים, מהפרומפט)

1. `null` אינו 0, ו-0 אינו `null`.
2. מונה ומכנה נעים יחד.
3. גודל המדגם מדווח — כולל ב-UI.
4. אין שינוי שקט בסמנטיקה.
5. אפס רגרסיה: עסקה עם stop תקין מציגה את אותו מספר בדיוק.

### 4.1 שלב א' — השורש (FIN-010)

`src/utils.js:39`:

```js
- return { pnl, rMultiple: risk > 0 ? pnl / risk : 0 };
+ return { pnl, rMultiple: risk > 0 ? pnl / risk : null };
```

סיכון לא-מוגדר → `null`, בדיוק כמו `stop == null`. חייב לקדום ל-FIN-007
(כלל הסדר #3 באודיט).

### 4.2 שלב ב' — חוזה יחיד ב-`statisticalModels.js` (FIN-007)

```js
export const MIN_SAMPLE_R = 2;   // מתחת לזה — אין פיזור, אין Sharpe

export const rOf = (t) => calcTradeMetrics(t).rMultiple;   // nullable, ללא || 0

// האוכלוסייה היחידה שניתן למדוד בה R.
export const rValues = (trades) => (trades || []).map(rOf).filter(Number.isFinite);

// מקור אמת יחיד לכל מדד מבוסס-R: ערך + גודל מדגם, תמיד יחד.
export const rStats = (trades) => {
  const vs = rValues(trades);
  return { avg: vs.length ? mean(vs) : null, n: vs.length, values: vs };
};

export const avgR = (trades) => rStats(trades).avg;         // number | null
export const rSampleSize = (trades) => rValues(trades).length;
```

`Number.isFinite` ולא `!= null` — הוא חוסם גם `null` וגם `NaN` וגם `Infinity`
במעבר אחד, ומקיים את דרישת "אף פונקציה לא מחזירה NaN".

**`avgR` נעשה `number | null`. כל 9 אתרי הקריאה, עם ההגנה הנדרשת:**

| אתר | היום | אחרי |
|-----|-------|-------|
| `EdgeFinder.js:61` | `avgR: avgR(list)` | `avgR: aR` — קריאה אחת לתוך משתנה, במקום שלוש קריאות ב-`:61/:63/:64` |
| `EdgeFinder.js:63-64` | `edgeScore(…, avgR(list))` | `edgeScore(…, aR ?? 0)` — `edgeScore` הוא ציון דירוג, ו-`?? 0` בו הוא ניטרלי מוצהר ולא כפייה |
| `DecisionCoach.js:50` | `avgR(similar).toFixed(2)` | `fmtNum(avgR(similar))` — **זורק היום אם null** |
| `GrowthTracker.js:130` | `Number(avgR(t).toFixed(2))` | הגנת null + החזרת `null` |
| `AntiEdgeLock.js:145`, `:158` | `Number(avgR(x).toFixed(2))` | זהה |
| `TradeDNA.js:41`, `:211` | `avgR: avgR(list)` | מעבר ל-`rStats` — חושף גם `n` |
| `EdgeDecayAlert.js:40`, `:93-94` | השוואת `avgR` ישירה | דילוג כששני הצדדים אינם ניתנים למדידה |
| `MonthlyReport.js:108` | `edgeScore(…, b.avgR)` | `?? 0` מוצהר |
| `statisticalModels.js:138` | `avgR(list)` בתוך `rankSetupEdges` | `rStats(list)`, חושף `rSampleSize` בפלט |

**`מפות `rOf` שיישברו על null** — חייבות לעבור ל-`rValues`:
`GrowthTracker.js:44` (`closed.map(rOf)` → `stddev` → NaN),
`TradeDNA.js:135`, `TradeDNA.js:146` (`balance += rOf(t)` → NaN בולע את כל
העקומה). `LearningEngine.js:82` שומר `r: rOf(trade)` ליומן — `null` שם **נכון**
ונשאר.

`AdaptiveLessons.js:16` (`?? 0`): לפי §2 זהו מקרה סיווג ולא מכנה. **בהיקף**,
כי הוא חלק מ-FIN-007: הפרדיקטים ב-`:81`/`:101` חייבים לדלג על `null`
(`Number.isFinite`), אחרת מנצחת בלי stop מסווגת כ"יציאה מוקדמת".

### 4.3 שלב ג' — `useTradingStats.js`

שלושת האתרים (`:37`, `:221-223`, `:288`) עוברים לצורה אחת: סכום ומונה נפרדים.

```js
const rs      = metrics.map(m => m.rMultiple).filter(Number.isFinite);
const avgR    = rs.length ? rs.reduce((s, r) => s + r, 0) / rs.length : null;
const rSampleSize = rs.length;
```

`totalR` נשאר סכום (ולא נפגע), אך `avgR` מחלק ב-`rs.length`.
`EMPTY_STATS` מקבל `avgR: null` ו-`rSampleSize: 0` — היום `avgR: 0`, וזה
בדיוק ה"אפס שקרי" של §2 ב-CLAUDE.md.
`groupAndAnalyze` ו-`topEdges/antiEdges` מחזירים `rSampleSize` פר-שורה.

### 4.4 שלב ד' — FIN-008

`MonthlyReport.js:91-100` — `groupBy` צובר סכום ומונה בנפרד:

```js
- if (!map.has(k)) map.set(k, { name: k, count: 0, wins: 0, net: 0, r: 0 });
+ if (!map.has(k)) map.set(k, { name: k, count: 0, wins: 0, net: 0, rSum: 0, rN: 0 });
  …
- g.r += e.rMultiple;
+ if (Number.isFinite(e.r)) { g.rSum += e.r; g.rN++; }
```

ו-`:100` → `avgR: g.rN ? round(g.rSum / g.rN, 2) : null`, `rSampleSize: g.rN`.

`enrich:51` מפסיק לכפות ל-0:
`r: Number.isFinite(m.rMultiple) ? m.rMultiple : null`.
`summarize:66-81` צובר R רק על ערכים סופיים ומחזיר `avgR: null` + `rSampleSize`.
`rValues` (`:72`) — שנצרך ב-`computeGrade:124` דרך `stdDev` — כולל רק סופיים.

⚠️ `computeGrade:122` — `rScore = clamp(50 + sum.avgR * 40, …)`. עם `avgR: null`
זה `50 + null*40 = 50`. עובד במקרה, אך **חייב להיות מפורש**:
`avgR == null ? 50 : clamp(…)`, כלומר "אין נתוני R → ניטרלי", מתועד בהערה.

### 4.5 שלב ה' — FIN-009, FIN-011, FIN-012

**FIN-009** `SwingEdge_App.jsx:273` + `:282`: להסיר את `: 0` ולהשתמש ב-`fmtR`
(`utils.js:105`), שכבר מחזיר `—` לערך לא-מספרי. הצבע נגזר מ-`r ?? 0` בנפרד
כדי לא לצבוע `—`.

**FIN-011** `GrowthTracker.js:32` — לדלג במקום לפברק:

```js
const pcts = closed
  .filter(t => t.stop != null && t.shares > 0)
  .map(…)
```

הפילטר הקיים `.filter(p => p > 0)` **אינו** מגן: סיכון פנטומי הוא > 0 ולכן שורד.

**FIN-012** `SwingEdge_App.jsx:3324` — `riskDollar: null` כש-`t.stop == null`,
והשורה מדלגת בצבירה ב-`:3330`. הטבלה ב-`:3427` תציג `—` לשורה כזו ותסמן
"סטופ חסר" — עדיף על השמטה שקטה (§4.0 עיקרון 4).

### 4.6 שלב ו' — FIN-032, FIN-034

**FIN-032** — שלוש אוכלוסיות מפורשות, משקלים שסכומם 1:

```js
export const expectedValueR = (trades) => {
  const rs = trades.filter(t => Number.isFinite(rOf(t)));
  if (!rs.length) return null;
  const wins   = rs.filter(t => pnlOf(t) > 0);
  const losses = rs.filter(t => pnlOf(t) < 0);
  const be     = rs.filter(t => pnlOf(t) === 0);      // תרומה 0R, נשאר במכנה
  const n = rs.length;
  return (wins.length / n)   * mean(wins.map(rOf))
       + (losses.length / n) * mean(losses.map(rOf))
       + (be.length / n)     * 0;
};
```

BE נשאר במכנה — הוא **אירוע אמיתי** בתוחלת, פשוט בתרומה אפס. זה שונה מהוצאתו
לגמרי, וזו החלטה שיש לתעד ב-`DECISIONS.md`. `kellyFraction:161-170` מקבל אותה
הפרדה משולשת.

**FIN-034** — `sharpeR` מחזיר `null` מתחת ל-`MIN_SAMPLE_R`:

```js
export const sharpeR = (trades) => {
  const rs = rValues(trades);
  if (rs.length < MIN_SAMPLE_R) return null;
  const sd = stddev(rs);
  return sd > 0 ? mean(rs) / sd : null;      // פיזור אפס → לא מדיד, לא "0"
};
```

### 4.7 שלב ז' — MAE/MFE

`SwingEdge_App.jsx:1994-1995`:

```js
- maxFavorable: parseFloat(closeForm.maxFavorable) || null,
- maxAdverse:   parseFloat(closeForm.maxAdverse)   || null,
+ maxFavorable: numOrNull(closeForm.maxFavorable),
+ maxAdverse:   numOrNull(closeForm.maxAdverse),
```

עם עוזר יחיד ומיוצא ב-`utils.js` (מקור-אמת-אחד, §13 ב-CLAUDE.md):

```js
export const numOrNull = (v) => {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
```

`0` נשמר כ-`0`; `"abc"` נשמר כ-`null`.

### 4.8 שלב ח' — UI: גודל המדגם (עיקרון #3)

`rSampleSize` חייב להגיע למסך, לא רק למבנה הפנימי. אתרי התצוגה:

| אתר | היום | אחרי |
|-----|-------|-------|
| `SwingEdge_App.jsx:3082` | `sub={t.perClosedTrade}` | `sub` נושא `n / closed` |
| `SwingEdge_App.jsx:4557` | `sub={t.closedTrades}` | זהה |
| `SwingEdge_App.jsx:2948` | כרטיס mentee | זהה |
| `SwingEdge_App.jsx:5045` | `{s.avgR}R` בטבלת ה-setup | `fmtR` + `n` |
| `MonthlyReportTab.jsx:180` | `{summary.avgR}R` גולמי | `fmtR` + `n` |

`fmtR` כבר מחזיר `—` ל-`null` — אין צורך בפורמטר חדש.
מפתח i18n אחד חדש (`avgR_sample`, בנוסח "מתוך {n} מ-{total} עסקאות") **בכל
חמשת בלוקי השפה** ב-`src/i18n.js`. `tooltips.js:153` (`rMultiple`) מקבל משפט
שמסביר שעסקאות ללא stop אינן נמדדות ב-R.

⚠️ `src/index.css` §override ו-Tailwind JIT (CLAUDE.md §13): התוויות החדשות
משתמשות במחלקות ליטרליות קיימות בלבד. אין אינטרפולציה דינמית.

---

## 5. בדיקות — `scripts/rContract-test.mjs`

קובץ חדש, מתווסף ל-`verify` **לפני** `build`:

```
"verify": "npm run test:coach && npm run test:import && npm run test:settings && npm run test:datachain && npm run test:rcontract && npm run build"
```

| # | בדיקה | מקור |
|---|--------|-------|
| 1 | **אפס רגרסיה** — תיק שכל עסקאותיו עם stop תקין מחזיר avgR/Expectancy/Sharpe/Kelly **זהים ביט-לביט** לערכי הבסיס שנלכדו לפני השינוי | עיקרון #5 — נכתבת **ראשונה** |
| 2 | 10 עסקאות, ב-5 `stop:null` → `avgR` מחושב על 5, ומדווח `rSampleSize: 5` | אודיט |
| 3 | `stop === entry` → `rMultiple === null`, לא `0` | אודיט |
| 4 | `stop:null` → סיכון ב-`GrowthTracker` ובכרטיס הסיכון הוא 0/מדולג, לא שווי הפוזיציה | אודיט |
| 5 | `MonthlyReport`: תיק עם avgR ידוע 1.4 → הדוח מחזיר **1.4 בכל שורת קבוצה**, לא 0 | אודיט |
| 6 | ייצוא PDF: עסקה בלי stop → `—`, ואף פעם לא `+0.00R` (assertion על המחרוזת: הפלט אינו מכיל `0.00R`) | אודיט |
| 7 | **סריקה גורפת** — כל פונקציה מיוצאת מ-`statisticalModels` על 6 תיקי קצה (ריק · עסקה אחת · הכל ללא stop · הכל BE · אפס הפסדים · `stop===entry`) מחזירה `number` סופי או `null` — **לעולם לא `NaN` ולא `Infinity`** | אודיט |
| 8 | MAE/MFE של `0` נשמרים כ-`0`; `""` → `null`; `"abc"` → `null` | פרומפט |
| 9 | BE אינו בדלי ההפסדים, ומשקלי `expectedValueR` מסתכמים ל-1 | FIN-032 |
| 10 | עסקה סגורה אחת → `sharpeR === null`, לא `0` | FIN-034 |
| 11 | תיק שכולו ללא stop → `avgR === null` ו-`rSampleSize === 0`; **אף מסך לא מציג "0R"** | מוקש §1.4 |

בדיקה 1 היא השער: היא נכתבת ורצה **לפני** כל שינוי, כדי שערכי הבסיס ייתפסו
מהקוד הקיים ולא מהקוד המתוקן.

---

## 6. סדר ביצוע

| שלב | תוכן | שער |
|------|-------|------|
| 0 | `test:coach` בסיס (110) + כתיבת בדיקה 1 ולכידת ערכי בסיס | הבדיקה עוברת על הקוד **הקיים** |
| 1 | §4.1 FIN-010 (`utils.js`) | בדיקה 3 |
| 2 | §4.2 חוזה `statisticalModels` + 9 אתרי קריאה | בדיקות 2, 7, 11 |
| 3 | §4.3 `useTradingStats` | בדיקה 2 |
| 4 | §4.4 FIN-008 | בדיקה 5 |
| 5 | §4.5 FIN-009/011/012 | בדיקות 4, 6 |
| 6 | §4.6 FIN-032/034 | בדיקות 9, 10 |
| 7 | §4.7 MAE/MFE | בדיקה 8 |
| 8 | §4.8 UI + i18n | אימות ויזואלי, iframe 390px |
| 9 | `npm run verify` מלא + `test:coach` אחרי | **110 assertions, ללא שינוי** |

אם מספר האסרשנים ב-`test:coach` משתנה בכל שלב — **עצירה ודיווח**, לא המשך.

## 7. בסיום (CLAUDE.md §10)

- `docs/STATE.md` — באותו קומיט של התיקון
- `docs/DECISIONS.md` — שתי החלטות: (א) `avgR` הוא `number | null` ולא 0;
  (ב) BE נשאר במכנה של `expectedValueR` בתרומה 0R
- `docs/TRUTH.md` — יכולת פונה-משתמש השתנתה: מדדי R מדווחים גודל מדגם
- `docs/INCIDENTS.md` — **לא**. זה תיקון יזום מאודיט, לא אירוע פרודקשן.

## 8. מה במפורש מחוץ להיקף

- סכימה ומיגרציות — אין נגיעה (CLAUDE.md §12)
- מחרוזות load-bearing (`setup` / `emotion` / `marketCondition`) — אין נגיעה
- ששת הממצאים ב-§2 לעיל — דווחו, לא יתוקנו בלי החלטה
- קבוצות 1, 2, 4-7 באודיט
