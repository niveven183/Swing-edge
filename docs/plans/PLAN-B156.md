# PLAN-B156 — `TradeDNA`/`GrowthTracker`: `50`/`100` המומצאים ⇒ `null` + גדר תצוגה בשלושת אתרי הרינדור

**תאריך:** 20.08.2026 · **בסיס:** `docs/audits/AUDIT-B156.md` (`9100633`) ·
**הכרעת ניב (20.08):** כיוון **(ב)** — `null` במנוע, עם הסייג המחייב: מנוע
בלבד אינו מספיק, **שלושת אתרי הרינדור** חייבים גדר משלהם.
**סטטוס:** ⛔ **אפס קוד בוצע.** מסמך תכנון בלבד, ממתין לאישור.

---

## 0 · תיקון ל-`DONE` — מה שהתברר שגוי ב-16.08

לפי הנחייתך: שורה תתווסף ל-`docs/DONE.md` **בקומיט הבא** (§14, אסרציה 4.1)
לצד סגירת הגל הזה, ⛔ לא כאן: הנימוק ל-veto על `null` (16.08, `D-041`/
`PLAN-B009.md` §7) — "`NaN`" ו"`GrowthChart` מוגן" — **הופרך במדידה**
(`AUDIT-B156.md` §D2, §D3). הפיצול עצמו (הוצאת `B-156` מ-`B-009`) נשאר
נכון כהחלטת-scope (הגל אכן שונה מ-`EMPTY_STATS`), אבל **הנימוק הטכני
שנלווה אליו היה שגוי**, וה-scope בפועל גדול יותר: 3 אתרי רינדור ⛔ לא 1.

---

## 1 · D4 — הסף המדויק לכל ציון, ולמה

⛔ אין סף אחיד. כל אחד מהארבעה נגזר מתנאי-האפס **הקיים כבר בקוד היום** —
התיקון **אינו** ממציא ספים חדשים, הוא מחליף את מה שקורה כשהתנאי הקיים
יורה (`50`/`100`) ב-`null`. שינוי סף (כגון "לדרוש 5 עסקאות ל-risk ⛔ לא
1") הוא החלטת-מוצר נפרדת ו**מחוץ להיקף** — מסומן במפורש למטה בכל מקום
שהוא היה עולה כפיתוי.

| ציון | תנאי-האפס (כבר קיים) | קובץ:שורה | נימוק לכך שזה **הסף הנכון**, ⛔ לא שרירותי |
|------|------------------------|------------|----------------------------------------------|
| `risk` | `risks.length === 0` (0 עסקאות עם `entry`+`stop`+`shares` סופיים **וגם** `_capitalAtEntry>0`) | `TradeDNA.js:145-155` | זו **בדיוק** האוכלוסייה שהנוסחה (`:157`) מחלקת עליה. `risks.length===0` הוא "אין מכנה" במובן המילולי — **בדיוק** מבחן ה"מנה" מ-`CLAUDE.md` §2 |
| `discipline` | `disciplineRate(closed) == null` (0 עסקאות עם `followedPlan != null`) | `TradeDNA.js:160-161` / `psychologyPatterns.js:106-110` | הפונקציה **כבר** מחזירה `null` על אוכלוסייה ריקה — ה-`?? 50`/`== null ? 50` הקיים הוא-עצמו ה"תרגום" השקרי מ-`null` (מדיד: אין) ל-`50` (בדיוק). התיקון הוא **הסרת** התרגום, ⛔ לא סף חדש |
| `consistency` | `rs.length < MIN_SAMPLE_R` (`=2`, `statisticalModels.js:11`) | `TradeDNA.js:166-173` | היחיד מבין הארבעה עם **קבוע רשמי מתועד** בקוד ("below this there is no dispersion to measure" — ההערה הקיימת. סטיית-תקן על מדגם 1 היא `0` תמיד — לא "עקבי", אלא בלתי-מוגדר) |
| `growth` | `recentR.length === 0` (0 R-values מדידים מתוך 20 האחרונות) | `TradeDNA.js:176-183` | ⚠️ **לא ליטרל היום** — הנוסחה מתכנסת ל-`50` כש-`series.length===1`. התיקון מוסיף `if (!recentR.length) return null;` **מפורש** לפני הנוסחה, ⛔ לא מסתמך על התכנסות מקרית |

**נמדד גם ב-`AUDIT-B156.md` §D4:** יומן עם עסקה סגורה **בודדת**, מדידה
במלואה — `risk`/`discipline` "מתעוררים" (יוצאים ממצב `null`), `consistency`
**נשאר `null`** (`rs.length=1<2`), `growth` **כבר לא `null`** (יש 1 R-value).
⇒ **התוצאה החזויה בקוד המתוקן, לא הנחה:**

```
1-trade journal (entry/stop/shares/capital/followedPlan מלאים, ⛔ ללא R-history נוסף):
{ risk: <number>, discipline: <number>, consistency: null, growth: <number> }
```

### `GrowthTracker.js` — אותו עיקרון, מיושם לפי סף כל תת-ציון בנפרד

| תת-ציון | תנאי-האפס | שורה |
|---------|-------------|------|
| `discipline` | `disciplineRate(trades)==null` | `:25` |
| `riskManagement` | `pcts.length===0` (מאחד את `:36` ו-`:53` — ראו §2) | `:34-56` |
| `consistency` | `closed.length<3 \|\| rs.length<MIN_SAMPLE_R` | `:59-68` — ⚠️ **שני תנאים, ⛔ לא אחד** (בשונה מ-`TradeDNA`). זו אי-עקביות **קיימת** בין שני הקבצים מ**לפני** הגל הזה. ⛔ **לא מאוחדת כאן** — איחוד סף בין קבצים הוא החלטת-מוצר נפרדת, מחוץ להיקף. כל קובץ שומר את התנאי שלו-עצמו, רק מחליף `50`→`null` |
| `edgeUtilization` | `!closed.length \|\| !edgeReport \|\| !edgeReport.edges?.length` | `:73` |
| `emotionalControl` | `!closed.length` | `:92` |

---

## 2 · `risk`-`100` — בהיקף, מאוחד עם `risk`-`50`

`AUDIT-B156.md` §D1.1: `TradeDNA.js:141` (`closed.length===0` ⇒ `risk:50`)
ו-`:156-157` (`risks.length===0` בתוך אוכלוסייה לא-ריקה ⇒ `avgRiskPct`
נופל ל-`0.01` הקבוע ⇒ הנוסחה מפיקה `to100(1) = 100`) הם **שני מסלולי קוד
לאותו "אין מכנה"** — כרגע נותנים שתי תשובות סותרות. **התיקון מאחד אותם:**

```js
// TradeDNA.js — computeScores, לפני התיקון (שתי דרכים נפרדות ל"אין מכנה"):
//   :141  if (!closed.length) return { risk: 50, ... }
//   :156  avgRiskPct = risks.length ? avg(...) : 0.01
//   :157  risk = to100(Math.max(0, 1 - Math.max(0, avgRiskPct - 0.01) * 50))

// אחרי — מסלול יחיד:
const risks = measurableRisk(closed, capitalCurrency).map(...).filter(...);
const risk = risks.length
  ? to100(Math.max(0, 1 - Math.max(0, (risks.reduce((s,x)=>s+x,0)/risks.length) - 0.01) * 50))
  : null;
```

`closed.length===0` ⇒ `measurableRisk([])` ⇒ `risks=[]` ⇒ `risks.length===0`
⇒ `null` — **אותו מסלול**, בלי בדיקה כפולה. `computeScores` מפסיקה להחזיק
early-return יחיד לארבעת הציונים; כל ציון נגזר בנפרד לפי §1.

⚠️ **`style.aggression`** (`TradeDNA.js:117-118`, אותו `0.01` fallback,
פלט `50`) — **⛔ מחוץ להיקף.** `AUDIT-B156.md` §D3 קבע במדידה ש-`dna.style`
כולו (`aggression`/`patience`/`discipline`/`tilt`) **אפס צרכנים** — אינו
מגיע למסך בשום מקום. תיקון קוד מת אינו סוגר פער למשתמש ומוסיף שטח-עריכה
בלי סיבה. **⇒ נשאר `50` כפי שהוא, מתועד ב-`docs/BACKLOG.md` כפריט נפרד
(§7 למטה) ⛔ ולא נבלע בשקט (§10.1).**

---

## 3 · `dnaEvolutionSeries` — תיקון במקור, ⛔ לא גדר שנייה

`GrowthTracker.js:183-201`, הלולאה כיום דוחפת רשומה **ללא תנאי** לכל אחד
מ-`months` (6) האיטרציות. התיקון: לדלג על חודש שאין בו **אף עסקה סגורה
מצטברת עד לאותה נקודת זמן** (`histSlice.length === 0`) — ⛔ לא לדחוף
placeholder בשבילו:

```js
export const dnaEvolutionSeries = (trades = [], edgeReport = null, months = 6, capitalCurrency = null) => {
  const out = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const upTo = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).getTime();
    const histSlice = getClosed(trades).filter(t => {
      const ts = new Date((t.date || "") + "T12:00:00").getTime();
      return !isNaN(ts) && ts <= upTo;
    });
    if (!histSlice.length) continue;               // ⬅ השורה החדשה — היחידה
    const s = calculateGrowthScore(histSlice, edgeReport, capitalCurrency);
    out.push({ label: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, score: s.total, ...s.sub });
  }
  return out;
};
```

**השלכה:** יומן ריק לגמרי ⇒ `out = []` ⇒ `evolution.length === 0` ⇒
ה-guard **הקיים** ב-`IntelligenceUI.jsx:381` (`!evolution.length`) **סוף-
סוף יורה כפי שתועד מלכתחילה**. ⛔ **`IntelligenceUI.jsx:381` עצמו לא
נערך** — התיקון היחיד הוא במקור (`GrowthTracker.js`), בדיוק כהנחייתך.

⚠️ **תופעת-לוואי מכוונת, יש לאשר:** משתמש עם עסקה סגורה **ראשונה** לפני
חודשיים, ואז שקט — כרגע (לפני התיקון) רואה 6 חודשים כולל 4 "אפס-פעילות"
בתחילת ה-6, שאחרי התיקון **נעלמים**: הגרף יתחיל **רק** מהחודש הראשון שבו
הייתה עסקה סגורה, ⛔ לא יציג 6 חודשים תמיד. זו **תוצאה נכונה** של אותו
עיקרון (חודש בלי עסקה סגורה מצטברת = "אין מה למדוד"), ⛔ לא רק תיקון
ליומן-ריק-מוחלט — אבל היא שינוי-התנהגות רחב יותר מ"רק המקרה הריק", ולכן
מסומן כאן במפורש לאישור, ⛔ לא מונח בשקט.

---

## 4 · צרכני `total`/`delta`/`nextTarget` — כלל מפורש, ⛔ לא הרחבת-סקופ שקטה

`AUDIT-B156.md` §D2 הראה ש-`null` בחשבון נכפה ל-`0` בשקט — כלומר לא די
"להזריק `null`" ל-`sub.*` ולסמוך שה-`total` "יסתדר". צריך כלל מפורש:

**`total`** (`calculateGrowthScore`, `:117-123`): ממוצע משוקלל, **מנורמל
מחדש על תת-הציונים הלא-`null` בלבד**. `total = null` **רק** אם **כל
חמשת** תת-הציונים `null` (כלומר: כל התנאים ב-§1 יורים בו-זמנית — בדיוק
המקרה של יומן ריק לגמרי):

```js
const present = Object.entries(sub).filter(([, v]) => v != null);
const total = present.length
  ? Math.round(present.reduce((s, [k, v]) => s + v * WEIGHTS[k], 0) /
               present.reduce((s, [k])    => s + WEIGHTS[k], 0) * 1)
  : null;
```

⚠️ **זו לוגיקה חדשה, ⛔ לא רק `50→null`** — נדרשת כי חמשת תת-הציונים
עלולים "להתעורר" ב-זמנים שונים (למשל: `discipline` נמדד כבר בעסקה
הראשונה, `consistency` רק מ-2 עסקאות-R). בלי נירמול, עסקה בודדת עם
`discipline` מדיד ו-4 תת-ציונים `null` הייתה נותנת `total = discipline*0.30`
בלבד (מוטה כלפי מטה בטעות, לא "ציון חלקי אמיתי"). ⛔ **אם ניב מעדיף `total
= null` בכל מקרה של תת-ציון חסר אחד ולא רק כשכולם חסרים — יש לציין זאת
כאן לפני ביצוע**, זו נקודת הכרעה, ⛔ לא עובדה.

**`delta`** (`:142`): `current.total == null || previous.total == null ? null : current.total - previous.total`.

**`nextTarget`** (`:165`): `current.total == null ? null : Math.min(100, current.total + 5)`.

**`ranked`/`top3Strengths`/`top3Weaknesses`/`stats`** (`:145-150`) —
**⛔ ללא שינוי.** `AUDIT-B156.md` §D3: אפס צרכנים ב-`src/`. `AUDIT-B156.md`
§D2 #3: כבר "בטוח" ל-`null` (ה-comparator לא קורס). נגיעה כאן היא תוספת
שטח-עריכה בלי משתמש שרואה את התוצאה — מסומן ל-`docs/BACKLOG.md` (§7).

---

## 5 · שלושת אתרי הרינדור — הגדר שכל אחד צריך

### (א) `DNACard` — `IntelligenceUI.jsx:45-83`, קרוא מ-`SwingEdge_App.jsx:4162,4362`

**כרטיס שלם נעלם כש-`sampleSize === 0`** (⇔ 4/4 הציונים `null` בהכרח,
לפי §1) — **תואם ישירות את התקדים הקיים** מ-`D-041` (`isEmpty` ⇒ סרגל
הסטטיסטיקה הראשי "**אינו מרונדר כלל**", ⛔ לא מציג `0`/`—` בכל תא). ⛔
לא ממציאים דפוס חדש.

**שורה בודדת בתוך כרטיס גלוי** (יש `sampleSize>0` אבל תת-ציון ספציפי
`null` — למשל `consistency` על יומן עם עסקה אחת) — מציגה **`"—"`** במקום
המספר, ובלי `ScoreBar` ממולא (רוחב `0` קבוע, ⛔ לא מחושב מ-`null`):

```jsx
export const DNACard = ({ dna, lang = "he" }) => {
  if (!dna || !dna.sampleSize) return null;   // ⬅ שינוי: sampleSize, ⛔ לא רק !dna
  ...
  {rows.map(r => (
    <div key={r.key} ...>
      <span ...>{r.value == null ? "—" : r.value}</span>
      <ScoreBar value={r.value == null ? 0 : r.value} accent={r.accent} muted={r.value == null} />
```

`ScoreBar` (`:24-42`) מקבל דגל `muted` אופציונלי (בר אפור/שקוף במקום צבע
מלא) — כדי ש-`0%` ב-`null` לא ייראה בטעות כ"ציון 0 שנמדד". שינוי מקומי
לקומפוננטה, לא לחוזה הנתונים.

### (ב) `GrowthChart` — `IntelligenceUI.jsx:371-420`

**⛔ ללא שינוי בקובץ הזה.** §3 כבר מתקן את המקור (`evolution=[]` ביומן
ריק) — ה-guard הקיים (`:381`) עושה את העבודה. **אין להוסיף תנאי שני** —
בדיוק כהנחייתך ("אחרת שני גדרים ואף אחד אינו הבעלים").

⚠️ **מקרה-קצה שכן דורש טיפול:** `current`/`delta` המוצגים בפינה
(`:392-397`) מגיעים מ-`aiGrowth.total`/`aiGrowthReport.delta`
(`SwingEdge_App.jsx:4365-4366`) — **נפרדים** מ-`evolution`. אחרי §4,
אלה יכולים לצאת `null` **גם כשיש** `evolution` (אם החודש האחרון עצמו
נופל תחת "כל 5 התת-ציונים `null`" — לא סביר בפועל כי `histSlice.length>0`
כבר מבטיח לפחות `discipline`/`riskManagement`/`emotionalControl` שיש להם
תנאי `closed.length===0` בלבד, אבל **תיאורטית אפשרי** אם `edgeReport` ריק
**וגם** אין `followedPlan`/סיכון מדיד בכל ההיסטוריה). התיקון: `:392`
`{current}` ⇒ `{current == null ? "—" : current}`; `:393` השורה `delta !=
null && (...)` **כבר** מטפלת ב-`null` נכון (לא תרנדר את חץ ה-▲/▼) —
⛔ ללא שינוי שם.

### (ג) `menteeDNA` — `SwingEdge_App.jsx:4162`

⛔ **אין קוד נפרד.** אותו `DNACard`, אותו `dna` shape (`calculateTradeDNA`
על `menteeRealTrades`, `:2272`). התיקון ב-(א) חל אוטומטית. **מאומת בעין
בנפרד** (§9) כי זו אוכלוסיית-קלט שונה (תלמיד, ⛔ לא המשתמש) ומסך שונה
(דשבורד מנטור), ⛔ לא כי נדרש קוד נוסף.

---

## 6 · קבצים שנערכים — רשימה סגורה

| קובץ | מה משתנה |
|------|-----------|
| `src/intelligence/core/TradeDNA.js` | `computeScores` — 4 ציונים ל-`null` לפי §1+§2 (⛔ `inferStyle`/`style.*` לא נערך — §2) |
| `src/intelligence/core/GrowthTracker.js` | 5 תת-ציונים ל-`null` (§1) · `total` מנורמל (§4) · `delta`/`nextTarget` null-safe (§4) · `dnaEvolutionSeries` לולאה (§3) |
| `src/intelligence/ui/IntelligenceUI.jsx` | `DNACard` — גדר `sampleSize` + `"—"`/`muted` לכל שורה (§5א) · `ScoreBar` — פרופ `muted` · `GrowthChart` — `current` null-safe בלבד (§5ב), ⛔ **לא** נוגעים ב-`:381` |
| `scripts/dna-growth-test.mjs` **(חדש)** | אסרציות §8 |
| `package.json` | `"test:dna": "node scripts/dna-growth-test.mjs"` + הוספה לשרשרת `verify` |
| `CLAUDE.md` §7 | שורת התיאור של `test:dna` בשרשרת (חובה **באותו קומיט**, בדיוק כפי שהרשימה עצמה מצהירה) |

**⛔ לא נערכים (§2, §4, §10.1):** `TradeDNA.js` — `inferStyle`/`style.*` ·
`GrowthTracker.js:145-150` (`ranked`/`top3*`) · `GrowthTracker.js:154-161`
(`stats`) · `IntelligenceUI.jsx:381` עצמו · `SwingEdge_App.jsx` (אפס
שורת-קוד — שני אתרי ה-`DNACard` וה-`GrowthChart` כבר מעבירים props נכונים,
התיקון כולו במעלה-הזרם) · `MonthlyReport.js`/`MonthlyReportTab`/
`MonthlyReportModal` (מודול נפרד לגמרי, לא קשור) · פרומפט Vision (`B-110`
❄️) · `EMPTY_STATS` · הגדרים מ-`B-009`.

---

## 7 · פריטים יתומים ⇒ `BACKLOG` באותו קומיט (§10.1)

- `TradeDNA.js:96-134` (`style.aggression/patience/discipline/tilt`) —
  אותה בעיה בדיוק (`50`/`0` מומצאים), **אפס צרכן היום**. מזהה נפרד,
  ⛔ לא נבלע.
- `GrowthTracker.js:145-161` (`ranked`/`top3Strengths`/`top3Weaknesses`/
  `stats`, מתוך `generateGrowthReport`) — נגישים דרך `SwingEdgeAI.getGrowthReport`
  אך **אפס קריאה** ב-`SwingEdge_App.jsx` מלבד `.delta`. אם יש כוונת-מוצר
  עתידית להציג "3 החוזקות/חולשות שלך החודש" — צריך גם צרכן וגם את אותו
  טיפול-`null` שניתן כאן ל-`total`.
- אי-העקביות בין `TradeDNA.consistency` (סף יחיד: `rs.length>=2`) ל-
  `GrowthTracker.consistencyScore` (שני תנאים: `closed.length>=3` **וגם**
  `rs.length>=2`) — קדמה לגל הזה, ⛔ לא מאוחדת כאן (§1).

---

## 8 · אסרציות — נוהל `D-041` (§6 ב-`PLAN-B009.md`), מיושם כאן

1. **`scripts/dna-growth-test.mjs` חדש**, נכתב ומורץ **אדום** לפני
   התיקון (מוכיח שהוא בכלל בודק את הבאג הקיים, ⛔ לא רק "יעבור בכל
   מקרה") — פלט מודבק בדיווח.
2. תרחישים מחייבים:
   - **יומן ריק לגמרי:** `computeScores([]) === {risk:null,discipline:null,consistency:null,growth:null}` · `calculateGrowthScore([],null) .total === null` · `dnaEvolutionSeries([]) .length === 0`.
   - **עסקה סגורה בודדת** (מדידה מלאה, ⛔ ללא R-history נוסף): `risk`/`discipline`/`growth` **מספרים**, `consistency === null` (§1, הטבלה הריקה-בודדת).
   - **`risks.length===0` על יומן לא-ריק** (עסקאות סגורות בלי `entry`/`stop`/`shares`): `scores.risk === null`, ⛔ **לא** `100` (מוכיח ש-§2 אוחד בפועל).
   - **יומן מלא, קיים כבר** (4 העסקאות מ-`D-041`: `+200`·`−200`·`+100`·`−120`, עם `followedPlan`/`stop` מלאים) — **קו קפוא**: 4 הציונים **מספרים אמיתיים**, ⛔ אף אחד `null`. אם ערך זז — **עצירה**, ⛔ לא עדכון ציפייה.
3. **הוכחת מוטציה** (זהה לנוהל `D-041` §5): להחזיר ידנית `risk:0` בענף
   ה-fallback, להריץ, להדביק את הכשל **האדום**, לשחזר.
4. `npm run test:coach` — **לפני וגם אחרי**, פלט מלא מודבק. `AUDIT-B156.md`
   §D7 כבר קבע שהוא לא אמור להתהפך (אפס אזכור של שני הקבצים) — **אם הוא
   כן מתהפך, זו הפתעה שדורשת נימוק בהערה, ⛔ לא שתיקה**.
5. `npm run test:instrument` — חובה (`TradeDNA.js` נערך, מכיל
   `measurableRisk`, מכוסה ב-`CLAUDE.md` §7 גם אם השינוי לא נוגע במטבע).

---

## 9 · תנאי סגירה

- (א) `npm run verify` מלא, **23+1 חוליות** (כולל `test:dna` החדש) + `build`,
  **פלט מלא מודבק**, ⛔ לא "עבר".
- (ב) §8 — אסרציות אדומות-לפני, קו קפוא ליומן מלא, הוכחת מוטציה.
- (ג) 🔴 **אימות עין — שלושת המסכים, יומן ריק:**
  1. דשבורד המשתמש (`realTrades=[]`) — `DNACard` **אינו מוצג כלל**,
     `GrowthChart` **אינו מוצג כלל**, באנר "👋 ברוך הבא" (`:4275`)
     **כן** מוצג לבדו. **אפס שגיאת קונסול.**
  2. דשבורד המנטור, `menteeRealTrades=[]` — `DNACard` (`menteeDNA`)
     **אינו מוצג כלל**.
  3. יומן עם עסקה סגורה בודדת (מדידה מלאה) — `DNACard` **כן** מוצג,
     3/4 שורות עם מספר, שורת `consistency` מציגה **`"—"`** ובר מוחשך.
- (ד) יומן מלא קיים — אף מספר לא זז, אף שדה לא הפך ל-`"—"` (§8.2).
- (ה) `docs/STATE.md` · `docs/CHECKS.md` (`C-` חדש — הגל נוגע במסך
  פונה-משתמש, שלושה אתרים) · `docs/BACKLOG.md` (§7, שלושה מזהים חדשים)
  — **באותו קומיט** של התיקון.
- (ו) `docs/DONE.md` **בקומיט הבא** (§14, 4.1) — כולל תיקון-הנימוק ל-16.08
  (§0 למעלה) ו-`אומת-בעין`.

---

## 10 · נקודות הכרעה פתוחות — לאישורך המפורש לפני ביצוע

1. **§4 — נירמול `total`:** האם `total = null` רק כש**כולם** `null`
   (המוצע), או בכל מקרה של תת-ציון חסר בודד?
2. **§3 — תופעת-הלוואי:** גרף שמתחיל מהחודש הראשון עם עסקה סגורה (⛔ לא
   תמיד 6 חודשים) — מאושר?
3. **§5א — כרטיס נעלם לגמרי** ב-`sampleSize===0` (כתקדים `isEmpty`), ⛔
   לא "כרטיס עם 4 מקפים" — מאושר?

⛔ **ללא תשובה לשלוש אלה, שלב הביצוע לא מתחיל** — הן קובעות את הקוד
בפועל, ⛔ לא ניואנס.
