# אבחון 18.09 — `B-338` · `B-336` · `B-331` · `B-333`

> **שלב 1 של §8.1 — read-only.** ⛔ אפס תיקון. כל מספר כאן נמדד בעץ `8104ce6`.
> סיווג: **T3** · תשובות `1..5` = `לא · כן · לא · כן · כן` ⇒ 3 ⇒ `T3`.

---

## §1 — `B-338` ① · מה קורה כשההון ⛔ מספיק לאף מניה

### 1.1 השורש, כלשונו

`src/lib/positionSizing.js:70-77`

```js
const posSize  = riskPerShare > 0 ? Math.floor((capital * (riskPct / 100)) / riskPerShare) : 0;
const posSizeTooSmall = riskPerShare > 0 && posSize === 0;
const suggestedShares = posSizeTooSmall ? 1 : posSize;   // ← השורש
```

`:77` מחליף את התשובה **«אפס — כלל הסיכון ⛔ מתיר פוזיציה»** בליטרל `1`, ואז
`:86` מחשב `effRiskPct` **מן הליטרל הזה** ו-`SwingEdge_App.jsx:8001` מתריע
עליו. ⇒ **הכרטיס ממליץ על מה שהוא עצמו פוסל, באותו מסך, באותו רגע.**

⚠️ **המנגנון ⛔ «רצפה» אלא *החלפת אוכלוסייה*.** `posSize === 0` הוא **מדידה**
(«הכלל ⛔ מתיר»); `1` הוא **המצאה** שאינה ניתנת להבחנה מ-`posSize === 1`
אמיתי. זו `‹R-2›` בצורתה הטהורה, על מסלול שפלטו **הוראת קנייה**.

### 1.2 מניית הצרכנים — מי נשבר אם `suggestedShares` יחזיר `0`

`grep -rn 'suggestedShares\|effShares'` ⇒ **4 אתרי צריכה בקוד המוצר**
(+ 6 אסרציות ב-`scripts/instrument-currency-test.mjs`):

| # | אתר | היום (`1`) | עם `0` | הערכה |
|---|------|-----------|--------|--------|
| ① | `SwingEdge_App.jsx:7929`·`:7935` — ערך תיבת `Shares` | `"1"` | `"0"` | ✅ **הודאה** — `0` הוא בדיוק מה שנמדד |
| ② | `positionSizing.js:84-85` → `:7945` `Pos. Value` · `:7949` `Max Risk` | ערכי מניה אחת | `₪0.00` · `₪0` | ✅ עקבי — אפס מניות עולות אפס |
| ③ | `:2761 isOverRisk` (שומר `effShares > 0`) | `true` ⇒ באנר אדום | `false` ⇒ כבה | ⚠️ **באנר `:7991` מחליף אותו, וטקסטו נהיה שקרי** — «הכרטיסים מציגים מינימום של מניה אחת» |
| ④ | `:2911 shares: effShares` — **כתיבה ל-`trades`** | `1` | **`0`** | 🔴 **כאן זה נשבר** |

🔴 **`handleSubmit` (`:2862-2866`) שומר על `ticker`·`entryN`·`stopN`·גאומטריה
בלבד — ⛔ על `shares`.** עסקה עם `shares: 0` הייתה נכתבת ל-DB, וכל מדד שנגזר
ממנה (`pnl` · `posValue` · כל `tradingStats`) היה **אפס בשקט**. ⇒ החלפת `1`
ב-`0` **לבדה** מייצרת כשל שקט חדש ומחליפה באג אחד באחר.

### 1.3 ההכרעה — נגזרת מהמניה, ⛔ מונחת

שלוש האפשרויות שבפרומפט, מול הטבלה:

| אפשרות | תוצאה מדודה |
|---------|--------------|
| `1` + אזהרה (**היום**) | ① מציג המצאה · ③ מתריע על ההמצאה של עצמו · ④ כותב `1` שהמשתמש ⛔ ביקש |
| `0` **לבד** | ④ כותב `shares: 0` ל-DB בשקט · ③ טקסט שקרי |
| **`0` + חסימת שמירה + באנר מתוקן** | ⛔ נותר כשל שקט באף אחד מ-4 האתרים |

⇒ **`0` + שער כתיבה מפורש + ניסוח מחדש של `:7991`.** שלושת החלקים הם
**אותו תיקון** — ⛔ שלושה, וכל אחד לבדו מייצר פגם.

⚠️ **דריסה ידנית שורדת ללא שינוי:** משתמש שמקליד `2` מקבל `effShares = 2`,
שמירה עוברת, ו-`isOverRisk` יורה **ביושר** — זו בחירה מוצהרת ⛔ המצאה.

### 1.4 בקרה שחייבת להישאר ירוקה

`entry 100 · stop 95 · הון 10,000 · 1%` ⇒ `riskPerShare = 5` ⇒
`floor(100/5) = 20`. `posSizeTooSmall` הוא `false` ⇒ **`:77` ⛔ נוגע בכלל.**
המסלול השמח ⛔ מושפע, בהגדרה.

---

## §2 — `B-338` ② · מאיפה הגיע `SHARES 2`

`grep -n 'shares:' SwingEdge_App.jsx` ⇒ **5 אתחולים/איפוסים** (`:1514`
`:1963` `:2938` `:8170` `:8360`) — **כולם `shares: ""`**. שני כותבים בלבד:

- `:7933` — `onChange` של תיבת `Shares`, כלומר **הקלדה**.
- `:5927` — `handleCopyToForm` במחשבון, `shares: String(shares)` כאשר
  `shares = calcSizing.posSize`. בתרחיש הנמדד `posSize === 0` ⇒ היה מייצר
  `"0"`, ו-`"0"` נדחה ב-`:81`/`:82` (`overrideN > 0`) ⇒ ⛔ יכול לתת `2`.

`form` ⛔ נכלל ב-`patch` ההתמדה (`:1846` — `capital, riskPct, lang,
accountCurrency, capitalCurrency, watchlistItems, …`).

⇒ **`2` הוא הקלדה של ניב. ⛔ ברירת מחדל · ⛔ ערך שנשמר.**
⚠️ ולכן `:81 hasSharesOverride` היה `true` וכפתור «אפס למוצע» הוצג.

---

## §3 — `B-338` ③ · שני מעצבים באותו כרטיס

`SwingEdge_App.jsx`, אותו `grid`, שני תאים סמוכים:

```
:7945  Pos. Value → fmtCapitalAmount(effPosValue, capitalCurrency)   ⇒ ₪1,334.77
:7949  Max Risk   → `${capSym}${Math.round(effPotLoss).toLocaleString()}` ⇒ ₪106
```

**מדוד:** `:7949` הוא מחרוזת-כסף **מורכבת-ביד** שעוקפת את
`fmtCapitalAmount`. ⚠️ ו-`fmtCapitalAmount` (`src/utils.js:210-225`) נכתבה
**בדיוק** לשלישייה הזו — ההערה בגוף מונה «גודל פוזיציה, **סיכון מרבי**, שווי
תיק». ⇒ `:7949` הוא אתר ש**היה אמור** לקרוא לה ו⛔ קורא.

🔴 **הפרכה של הסיווג שבפרומפט:** ③ ⛔ במחלקת `D-068`/`B-321`. ההגדרה
המדודה של המחלקה (15.09, `B-321`) תולה ב**מעצב**: `fmt$`/`fmtBalance`/
`fmtAccountAmount` כופים `minimumFractionDigits: 2` ⇒ בתוך המחלקה;
`fmt$0`/`fmtPrice`/**`.toLocaleString()`** ⛔ ⇒ **מחוץ** לה. `:7949` הוא
`.toLocaleString()` חשוף ⇒ **מחוץ**. זו בדיוק זרוע-הביקורת `K1`–`K6` של
`test:cents`, שחייבת להישאר ירוקה.

⇒ **הממצא אמיתי, הסיווג שגוי.** המחלקה הנכונה היא «מחרוזת כסף מורכבת-ביד
במקום המעצב היחיד» — ⛔ «`Math.round` לפני מעצב דו-ספרתי».
**הצלבה עם `B-325`:** ⛔ נדרשת. `B-325` הם `8` אתרי **payload** של גרפים;
`:7949` הוא תא מסך.

---

## §4 — `B-338` ④ · יחידות שני האגפים

`positionSizing.js:86` `effRiskPct = (effPotLoss / capital) * 100`.

- `effPotLoss = effShares × riskPerShare`, ו-`riskPerShare = |entry−stop| × rate`
  (`:67`), כאשר `rate` הוא **נייר→הון** (`SwingEdge_App.jsx:2718-2721`).
  ⇒ `effPotLoss` נקוב ב-`capitalCurrency`.
- `capital` נקוב ב-`capitalCurrency` בהגדרה (`:1333`, «`capitalCurrency` is
  what the `capital` NUMBER means»).

⇒ ✅ **המסקנה שבפרומפט מאוששת: שני האגפים באותו מטבע, `effRiskPct` תקין.**

🔴 **הפירוק שבפרומפט מופרך.** «`4.3% = 35.08/821` ⇒ דולר/דולר» ⛔ מתיישב עם
שאר המסך. השחזור היחיד שמסביר את **ארבעת** המספרים בו-זמנית:

```
rate      = 1,334.77 / (2 × 220.02)            = 3.0333   (USD→ILS)
riskPerShare = |220.02 − 202.48| × 3.0333       = 53.20 ₪
Max Risk  = round(2 × 53.20)                    = 106 ₪        ✓ «₪106»
Pos.Value = 2 × 220.02 × 3.0333                 = 1,334.77 ₪   ✓
capital   = $821 × 3.0333                       = 2,490 ₪
effRiskPct= 106.41 / 2,490 × 100                = 4.27% → «4.3%» ✓
posSize   = floor(2,490 × 0.01 / 53.20) = floor(0.468) = 0      ✓
```

⇒ האופרנדים הם **₪2,490 ו-₪53.20** (אחרי המרה), ⛔ `$821` ו-`$17.54`.
**התוצאה `0` זהה בשני הפירוקים**, ולכן ① ⛔ מושפע — אבל המספרים שבפרומפט
⛔ נמדדו והם `דולר/דולר` רק למראית עין.

---

## §5 — `B-336` ⑤⑥

`SwingEdge_App.jsx:766-769` (ג'ורנל) מסנן `Unknown`:

```js
const namedSetups = stats.bySetup.filter(g => {
  const name = (g?.name ?? "").toString().trim();
  return name !== "" && name !== "Unknown";
});
```

`SwingEdge_App.jsx:6316-6318` (אנליטיקס, אריח «הסטאפ הטוב ביותר») ⛔:

```js
const bestSetup = [...stats.bySetup]
  .filter(s => s.count > 0)          // ← `Unknown` עדיין מועמד
  .sort(...)
```

⇒ ✅ **⑤ מאושש.** אותו `Unknown` שנחסם בג'ורנל ב-`8d631ec` עדיין מוצג
באנליטיקס.

⑥ — ההערה ב-`:6317-6318` («same deterministic tiebreak the Journal insight
strip uses, so both name the same setup») **נהייתה שקרית ב-`8d631ec`**:
מאז יש לג'ורנל סינון שאין לאנליטיקס. ✅ מאושש.

---

## §6 — `B-331` ⑦⑧⑨

`:770-771`:

```js
const bestSetup = namedSetups.sort((a,b) => (b.winRate - a.winRate) || (b.count - a.count))[0];
if (bestSetup && bestSetup.count >= 2) {
```

**`[0]` נלקח לפני השער.** מפרק: `[{פריצה, n:5, wr:80}, {פולבק, n:1, wr:100}]`
⇒ `sort` מעלה את פולבק (100 > 80) ⇒ `[0].count === 1` ⇒ השער נופל ⇒
**⛔ כרטיס כלל**, אף ש«פריצה» כשיר לחלוטין. ✅ ⑦ מאושש.

⑧ — התיקון: השער `count >= 2` עובר **לתוך אוכלוסיית המועמדים**, לפני
ה-`sort`. בקרות: `[{פריצה,n:5,wr:80}]` ⇒ כרטיס · `[]` ⇒ ⛔ קריסה ·
כולן `n=1` ⇒ ⛔ כרטיס (**נכון** — ⛔ מדגם).

⑨ — נמדד: `:6309` (Best Day) · `:6318` (Best Setup) · `:6330` (Best Emotion)
⛔ נושאים שער מדגם כלשהו. **נרשם, ⛔ מתוקן** — שינוי סף שם מזיז 3 אריחים
שניב רואה.

---

## §7 — `B-333` ⑩ · הפרכה חלקית + חסם יישום

**מדוד:**

- `src/data/tooltips.js:619` — `emotionNeutral: { en:"Neutral", he:"Neutral",
  es:"Neutral", pt:"Neutral", ar:"Neutral" }`
- `src/i18n.js:2845` — `DISPLAY_LABELS.emotion["Neutral"] = { he: "נייטרלי" }`
- `src/i18n.js:2884 labelFor` — `if (value == null || lang === "en") return value;`
  ואז `(entry && entry[lang]) || value`.

🔴 **`DISPLAY_LABELS` נושא `he` בלבד.** ⇒ `labelFor("emotion","Neutral","es")`
מחזיר `"Neutral"` — **זהה** ל-`tooltips.js`. **הסחיפה קיימת ב-`he` בלבד,
⛔ ב-`es`/`pt`/`ar`.** טענת ⑩ («ליטרלי ב-he/es/pt/ar בעוד i18n מתרגם»)
מופרכת ב-3 מתוך 4 השפות.

🔴 **ו«החל את התרגום, ⛔ תכפיל» ⛔ ניתן ליישום ב-`tooltips.js`:**

1. `src/data/tooltips.js` הוא קובץ נתונים עם **אפס `import`**, ו-
   `scripts/extract-tooltips.mjs:14` עושה לו `src.replace(/export const
   TERM_LABELS/, 'globalThis.__TL')` ואז eval. **הוספת `import` שם שוברת את
   בניית הגלוסרי** (`npm run glossary`, שחובה באותו קומיט לפי §7).
2. כתיבת `he: "נייטרלי"` בתוך `tooltips.js` היא **בדיוק הכפילות** ש-⑩ אוסר.
3. יישום בצרכן (`src/components/ui/TermTooltip.jsx:11`) מחייב ממפה
   `TERM_LABELS`-key → ערך-enum (`emotionNeutral`→`"Neutral"`,
   `EMABounce50`→`"EMA Bounce 50"`, `bullFlag`→`"Bull Flag"`…) — כלומר
   **מקור-אמת שלישי**, גרוע משניים.

⇒ **⑩ ⛔ מבוצע בגל הזה.** אין דרך יישום שאינה מפרה את ⑩ עצמו או שוברת את
`glossary`. הפריט נשאר פתוח עם המדידה, ומדד הסגירה שלו חייב להיקבע מחדש
(ככל הנראה: איחוד `TERM_LABELS`+`DISPLAY_LABELS` למקור אחד — הכרעה, ⛔ תחזוקה).

---

## §8 — בסיסי-ייחוס לפני נגיעה

| חוליה | נמדד 18.09 על `8104ce6` |
|--------|--------------------------|
| `test:lessons` | `30/30` · `EXIT=0` |
| `test:instrument` | `417/417` · `EXIT=0` |
| `test:cents` | `20/20` מנוקדות (`14` מחלקה + `6` ביקורת) · `EXIT=0` |
| `wc -c docs/STATE.md` | `15,989` |
