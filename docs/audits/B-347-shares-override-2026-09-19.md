# אבחון read-only — הסתירה בכרטיס גודל הפוזיציה · 19.09

**רמה `T3` · §8.1 שלב 1 · ⛔ אפס תיקון.**
כל המדידות מהמודולים ה**אמיתיים** (`src/lib/positionSizing.js` ·
`src/lib/instrumentCurrency.js` · `src/utils.js`), ⛔ סטאבים.
**שער בטיחות:** `PULL_EXIT=0` · עץ נקי · `test:instrument` `519/519` `EXIT=0`.

**התצפית שהולידה את האבחון** (ניב, צילום 19.09): באותו כרטיס בדיוק —
`SHARES 6` · `MAX RISK $129.24` · ואזהרה «חורגת מסיכון 1% — סיכון בפועל 3.9%».
`6 × (223.54 − 202) = 129.24` ⇒ עקבי פנימית.

**ההשערה שנבדקה:** אם `6` הוא תקציב 1% ⇒ התקציב `12,924`; אם `129.24` הוא 3.9%
⇒ הבסיס `~3,314` ⇒ **שני בסיסים באותו כרטיס**.

---

## 1 · מאיזה משתנה נגזר כל מספר

שני המספרים חוזרים מ**קריאה אחת**, `SwingEdge_App.jsx:2729-2734`:

```js
const sizing = sizePosition({ entry: form.entry, stop: form.stop, capital, riskPct,
  sharesOverride: form.shares ?? "", rate: formRate, refusalReason: formRefusal });
```

| מספר | קובץ:שורה | הביטוי |
|---|---|---|
| `posSize` | `src/lib/positionSizing.js:70` | `floor((capital × (riskPct/100)) / riskPerShare)` |
| `suggestedShares` | `src/lib/positionSizing.js:84` | `= posSize` |
| `effPotLoss` | `src/lib/positionSizing.js:92` | `effShares × riskPerShare` |
| `effRiskPct` | `src/lib/positionSizing.js:93` | `(effPotLoss / capital) × 100` |
| `isOverRisk` | `SwingEdge_App.jsx:2769` | `… && effRiskPct > riskPct + 0.05` |
| רינדור האזהרה | `SwingEdge_App.jsx:8052` | `סיכון בפועל ${effRiskPct.toFixed(1)}%` |

## 2 · המרת מטבע — ⛔ אסימטריה

`src/lib/positionSizing.js:66-68`:

```js
const entryCap        = entryN * rate;
const riskPerShareCap = Math.abs(entryN - stopN) * rate;
const riskPerShare    = riskPerShareCap;
```

`posSize` (`:70`) ו-`effRiskPct` (`:93`) צורכים את **אותו** `riskPerShare`
ואת **אותו** `capital`. ⛔ **קיים מסלול שבו אחד מומר והשני ⛔.**
`formRate` נגזר פעם אחת ב-`SwingEdge_App.jsx:2724-2726` ומוזרק לקריאה היחידה.

## 3 · ההשערה «שני בסיסים» — **הופרכה**

בלי דריסה `effShares = posSize`, ולכן
`posSize = floor(תקציב / rps)` ⇒ `posSize × rps ≤ תקציב` ⇒
`effRiskPct ≤ riskPct` — **זהות אלגברית**.

**נמדד בכפייה על 109,500 אוכלוסיות** (הון `100`…`200,000` בצעדי `137` ×
5 צמדי מחיר × 5 אחוזי סיכון × 3 שערים):

```
populations tested: 109500
isOverRisk true WITHOUT override: 0
max ratio effRiskPct/riskPct: 1.000000
```

⇒ **האזהרה ⛔ יכולה לירות על ההמלצה.** היריה מוכיחה **דריסה**.
⇒ `6` הוא דריסה ידנית; ההמלצה הייתה **`1`**.
**ניב אישר בכתב 19.09 שהקליד `6` ידנית.**

שני שחזורים שמייצרים את הצילום **בדיוק**:

| תרחיש | הון | `rate` | `posSize` | MAX RISK (נייר) | `effRiskPct` |
|---|---|---|---|---|---|
| A | `$3,314` | `1` | **1** | `$129.24` | `3.90%` |
| B | `₪10,000` | `3.0333` | **1** | `$129.24` | **`3.92%`** |
| B · בלי דריסה | `₪10,000` | `3.0333` | **1** | `$21.54` | `0.65%` |

⚠️ **`MAX RISK` ⛔ יכול להכריע בין A ל-B** — פוסט-`B-339` הוא מרונדר
`effPotLoss / formRate` ⇒ `$129.24` בכל שער.

## 4 · התג «מטבע לא מאומת» — **שורש שני**

`UnverifiedCcyChip` (`SwingEdge_App.jsx:892-893`) נדלק **רק** על
`isUnverified(deriveInstrumentCurrency(trade))`. נמדד:

| צורת השורה | `code` | `state` | `reason` | שבב |
|---|---|---|---|---|
| בלי `currency` | `USD` | `assumed` | `no_evidence_against` | `false` |
| `currency: 'USD'` | `USD` | `assumed` | `no_evidence_against` | `false` |
| `currency: 'ILS'` | `null` | `contradicted` | `ils_never_measured` | **`true`** |

⇒ השבב נדלק **רק** כש-`currency` השמור הוא `ILS` על נייר אמריקאי.
השורש הוא **`B-340`** — `SwingEdge_App.jsx:2918` חותם `currency: capitalCurrency`.

⚠️ **והשבב הוא מה שמכריע בין A ל-B:** הוא מוכיח `capitalCurrency === 'ILS'`
⇒ **תרחיש B**. ⇒ **התג והפער הם שני שורשים, ⛔ אחד** — אבל שניהם עדים
לאותה תצורה.

⛔ **והתג ⛔ יכול לחיות יחד עם סירוב בטופס:** `formPaperCcy == null` ⇒
`formRate = null` ⇒ `sizing.ok === false` ⇒ `:7979` מרנדר `—`.
כרטיס שמציג `6` ⇒ הטופס ⛔ סירב. שני מצבים **בלעדיים הדדית**.

## 5 · הממצא שכן נשאר — `B-347` ‹R-1›

`SwingEdge_App.jsx:7968`:

```js
value={sharesOverrideStr !== "" ? sharesOverrideStr : String(suggestedShares)}
```

**אותו סטיילינג לשני המצבים**, וההמלצה (`1`) ⛔ מוצגת לצד הדריסה (`6`).
`hasSharesOverride` (`:2759`) קיים ומרונדר ב-`:8001` כקישור «חזור להמלצה»
ש⛔ נוקב **מה** ההמלצה. ⇒ `6` נוסע בלי **תעודת מקור** — «המלצה» מול
«מה שהקלדת» — והמשתמש קורא דריסה כעצה.

## 6 · `B-348` ‹R-6› — הציפייה הנעולה סותרת מדידה

`C-055` ⓷ נוקבת `NBIS` `217.99`/`202`/**`₪10,000`**/`1%` ⇒ `6`.
`riskPerShare` (נייר) `= 15.99`. נמדד:

| תצורה | `riskPerShare` בהון | `posSize` |
|---|---|---|
| `₪10,000` · `rate 3.0333` | `48.50` | **`2`** |
| `₪10,000` · `rate 3.70` | `59.16` | **`1`** |
| `$10,000` · `rate 1` | `15.99` | **`6`** |

⇒ **`6` מושג רק ב-`rate = 1`, כלומר הון `$10,000` — והטקסט נוקב `₪`.**

🔴 **וההשערה «מיושן פוסט-`B-339`» הופרכה:** `B-339` (`a7a7d5a`) היה
**תצוגה בלבד** ו-`positionSizing.js` ⛔ נגעה (מתועד ב-`D-087`);
ההמרה-לפני-החלוקה היא **סיבת קיום המודול** (`positionSizing.js:15-27`)
וקדמה ל-`C-055`. ⇒ **שגיאת יחידה בציפייה עצמה בזמן הכתיבה**,
⛔ סחיפה שנגרמה מ-`B-339`.

## 7 · מה ⛔ נמדד

- ⛔ נמדד מה `capital`/`capitalCurrency` בפועל ב-`user_settings` של ניב —
  זה `B-343`, שנשאר ⏸️ חסום על ניב.
- ⛔ נמדד ⓷ על מסך (`B-345` §⓷) — ראה `C-055`.
- ⛔ נמדד האם משתמשים **אחרים** נשאו דריסה דביקה.
