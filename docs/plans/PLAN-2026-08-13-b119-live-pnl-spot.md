# PLAN — `B-119` · P&L חי מומר ב-spot

**תאריך:** 2026-08-13 · **בסיס:** `docs/audits/AUDIT-2026-08-13-B119-live-pnl.md` (`0d2ccac`)
**סיווג:** T3 · **מצב:** ✅ **מאושר בתנאי** (ניב, 13.08) — Q1/Q2/Q3 הוכרעו · **C1** שולב.
**הכרעה מחייבת:** `docs/DECISIONS.md:161` — פתוחה ⇒ spot · סגורה ⇒ יום-סגירה · אין spot ⇒ `—` עם סיבה.

---

## 0. שלוש ההכרעות — **נענו**

| # | שאלה | **ההכרעה** | נימוק |
|---|-------|-------------|--------|
| **Q1** | כשאין spot, מה מציגה **כותרת החשבון** (`curEquity`)? | **ב׳ — סכום חלקי.** ההון הסגור (מומר) **+ כל פתוחה שכן הומרה** + תג כשה-`unconvertedCount > 0`. ⛔ **לא** "סגור בלבד" קשיח, ⛔ לא `—` על הכותרת. התג נושא **מונה**: `"אינו כולל P&L של N פוזיציות — אין שער"`, ב-5 שפות | המוצר **כבר עושה ב׳** לפער אח: `openPnL.missingCount` ב-`:4125-4128` מציג סכום חלקי + אזהרת ענבר. א׳ היה גורם לשני פערים שכנים להתנהג הפוך |
| **Q2** | שער מקובע לאסרציות | **`r = 3.0` בדיוק** ⇒ `$24.75 → ₪74.25`, `Δ = ₪49.50`. ⛔ אפס `fetch` בטסטים | המסך נתן `Δ=₪49.50` (⇒ `r=3.0000`). ⛔ **אף שער חי אינו קביל כציפייה** — `fx.js:19-24` אוסר מספר שזז מעצמו |
| **Q3** | ה-PDF כשהמצרף **חלקי** | **כן, מינימלי** — שורת הערת-שוליים **אחת** כאשר `missingCount + unconvertedCount > 0`, המכסה את **שני** הפערים כולל הקיים (`missingCount`). ⛔ שום דבר מעבר לזה בגל הזה | מסמך שהמשתמש **שומר** ומצהיר סכום שהושמט ממנו איבר, בלי לומר זאת, הוא §2 |

### C1 — תיקון נדרש שהתקבל עם האישור: **המצב החמישי**

`SwingEdge_App.jsx:2034-2036` מגדיר מצב שהטבלה בת-4-המצבים (אבחון §1.6) ⛔ **לא** כיסתה:

```js
const fxOk    = capitalCurrency === accountCurrency || displayCapital != null;
const dispCcy = fxOk ? accountCurrency : capitalCurrency;   // ← ענף fallback
```

⇒ במשתמש הון-₪ / חשבון-$ בזמן **נפילת FX**, ההון הסגור מוצג **לא מומר ב-₪**, בעוד
`accountCurrency === "USD" === PAPER_BASE` ⇒ קיצור ה-`identity` של §2.2 היה מוסיף
**דולר גולמי** לסכום שקלי, **מתחת לסמל ₪**. כלומר: הגל היה **מייצר** ערבוב חדש בדיוק
במצב שבו ההגנה אמורה לפעול.

**הדרישה:** השער ב-§2.2 מותנה **גם ב-`dispCcy`**. כאשר `dispCcy !== accountCurrency`
(ענף ה-fallback פעיל) — **כל** פתוחה נספרת `unconvertedCount` (סירוב מוצהר + תג Q1),
⛔ **לא** `identity`. אסרציה **A8**. מצבי `C-023` נשארים 4; מצב 5 מאומת ב-DevTools
יחד עם בדיקת אין-spot (§4 סיפא).

---

## 1. תלות שאינה ניתנת לדחייה — 🔴 `dailyPnL` **חייב** להיכנס לגל

**נמדד:** `dailyPnL` (`:2348-2354`) צורך את `openPnL.value`.

```
היום    →  closedToday (גולמי)  +  openPnL.value (גולמי)   ← עקבית-גולמי, מתויג שגוי
אחרי    →  closedToday (גולמי)  +  openPnL.value (מומר)    ← 🔴 חיבור חוצה-יחידות חדש
```

⇒ תיקון `openPnL` לבדו **מייצר** ב-`dailyPnL` בדיוק את הפגם שהוא מתקן ב-`curEquity`. ⛔ אי-אפשר לדחות.

**התיקון:** `:2351` — `calcTradeMetrics` ⇒ `stableCalcTradeMetrics`. **מילה אחת.** התפר המומר כבר קיים ב-`:2081`.

⚠️ פגם `statsCcy(stats)` מול `dispCcy` (`:1275` · `:7187`) ⛔ **אינו** נכנס — הוא קיים גם על יומן סגור לחלוטין ואינו נגרם מ-P&L חי. ⇒ `BACKLOG` בקומיט הסגירה.

---

## 2. התיקון — אתר אחר אתר

### 2.1 `src/hooks/useFxRates.js` — **תפר אחד בשני זמנים**, ⛔ לא שתי פונקציות

⚠️ ההבדל בין ההמרה ההיסטורית לספוט הוא **ארגומנט אחד**. עותק מקביל כאן הוא בדיוק המבנה שהקובץ עצמו אוסר (`:152-153`: "⛔ אין העתקה מקבילה"). ⇒ **חילוץ ליבה**, ⛔ לא פונקציה שנייה:

```js
// ליבה משותפת. `dateKey` הוא ה**זמן**: יום מסוים ⇒ ערך עבר · undefined ⇒ ערך הווה (spot).
const amountAt = (trade, amount, displayCurrency, table, status, dateKey) => { /* גוף accountAmount הקיים */ };

// ערך עבר — עסקה סגורה, נעול ליום המימוש. ⛔ התנהגות ⛔ לא משתנה.
export const accountAmount = (t, a, d, tb, s) => amountAt(t, a, d, tb, s, realizedDayKey(t));

// ערך הווה — פוזיציה פתוחה, spot.
// 🔴 `dateKey` נמסר **חסר במפורש**. ⚠️ `realizedDayKey` נופל ל-`trade.date`
// (`src/utils.js:43`) ⇒ לעסקה פתוחה הוא מחזיר את **יום הכניסה**, ⛔ לא `null`,
// ו-`byDay` אפילו **מכיל** אותו (`fxDayKeys` רץ על כל `realTrades`) ⇒ ההמרה
// הייתה מצליחה **בשקט** בשער הלא-נכון. אין כאן ברירת מחדל — יש היעדר מכוון.
export const spotAmount   = (t, a, d, tb, s) => amountAt(t, a, d, tb, s, undefined);

// 🔴 **ההכרעה של ה-P&L החי** — מצרף ושורה קוראים ל**אותה** פונקציה.
// ⚠️ קיימת מפני ש-C1 הוסיף תנאי שני (`dispCcy`), ותנאי שיושב ב-`.jsx` ⛔ אינו
// ניתן לאסרציית **ערך** ב-node ⇒ היה חוזר בדיוק לכשל "אסרציה ירוקה מעל פיצ'ר
// מת". כאן הוא נמדד. ⛔ ואין עותק מקביל (`:152-153`).
export const livePnlAmount = (trade, amount, accountCurrency, displayCurrency, table, status) => {
  // C1 — ענף ה-fallback: ההון הסגור מוצג **לא מומר** תחת סמל אחר ⇒ ⛔ אין
  // לחבר לשם דבר. סירוב מוצהר, ⛔ לא identity ו⛔ לא המרה.
  if (displayCurrency !== accountCurrency) return { ok: false, reason: "fx_fallback", value: null, currency: null };
  // ⚠️ **לפני** הגזירה, ובכוונה: ניתוב משתמש דולרי דרך `deriveInstrumentCurrency`
  // היה מוציא פתוחה בעלת טיקר מספרי מהמצרף. הקדימות הזו היא מה שהופך את
  // ה-no-op ל**מוכח סטטית**, בלי שאילתת DB.
  if (accountCurrency === PAPER_BASE) return { ok: true, reason: "identity", value: amount, currency: accountCurrency };
  return spotAmount(trade, amount, accountCurrency, table, status);
};
```

`amountAt` מחזיר את אותה הכרעה מובחנת. ⛔ אפס `|| 1`, ⛔ אפס `?? 1`.
⚠️ **מלכודת שנמדדה:** `status === "ready"` יכול להתקיים בעוד `spot === null` (`fx.js:247-249` — API נפל, מטמון היסטורי קיים). הבדיקה **חייבת** להיות על ערך ההחזרה מ-`convert`, ⛔ לא על הסטטוס בלבד. `amountAt` כבר עושה זאת (`value == null ⇒ refuse`).

### 2.2 `SwingEdge_App.jsx:2310-2320` — `openPnL`

⚠️ ה-`useMemo` נשאר **לולאה דקה** — ⛔ אפס הכרעה בתוכו. ההכרעה היא `livePnlAmount`.

```js
const openPnL = useMemo(() => {
  let value = 0, missingCount = 0, unconvertedCount = 0;
  for (const t of openTrades) {
    const lp = getLivePrice(t.ticker);
    if (!lp) { missingCount++; continue; }
    const raw = t.side === "LONG" ? (lp.price - t.entry) * t.shares
                                  : (t.entry - lp.price) * t.shares;
    const d = livePnlAmount(t, raw, accountCurrency, dispCcy, paperAcctTable, paperAcctStatus);
    // ⛔ לא נשמט בשקט ו⛔ לא מנוחש — נספר ומוצהר, כמו `missingCount`.
    if (!d.ok) { unconvertedCount++; continue; }
    value += d.value;
  }
  return { value, missingCount, unconvertedCount };
}, [openTrades, getLivePrice, accountCurrency, dispCcy, paperAcctTable, paperAcctStatus]);
```

⚠️ **סדר הצהרה:** `dispCcy` מוגדר ב-`:2035` ו-`openPnL` ב-`:2310` ⇒ ⛔ אין בעיית TDZ.

### 2.3 `:2351` — `dailyPnL` (§1)

`calcTradeMetrics(t).pnl` ⇒ `stableCalcTradeMetrics(t).pnl`.

### 2.4 `:4247` · `:4920` — שתי שורות ה-P&L החי

שתיהן מחשבות inline ומדפיסות `fmt$(…, currencyOf(t))` — ו-`currencyOf` הוא **התווית מהעדפת החשבון** (`useFxRates.js:185-188`) ⇒ אצל משתמש ₪ הן מדפיסות `₪` על מספר **דולרי**. זהו באג `$500 → "₪500"` ששרד את גל ג׳ בשני אתרים.

```js
// 🔴 **אותה** פונקציה שהמצרף קורא לה — כולל תנאי C1. ⛔ אין עותק מקביל.
const d = livePnlAmount(tr, raw, accountCurrency, dispCcy, paperAcctTable, paperAcctStatus);
// title = הנימוק, ⛔ לא "—" ערום.
<span title={spotRefusalText(d)}>{fmtAccountAmount(d)}</span>
```

`spotRefusalText` — תאום ל-`acctRefusalText` (`:2106-2110`), על אותן מחרוזות מתורגמות (`t.ccyUnverifiedTip` · `t.fxUnavailable`). ⛔ אין מחרוזת קשיחה.
⚠️ **שמות:** בזמן הכתיבה מיישרים למזהים ש**קיימים בפועל** (`paperAcctFx.table` · `fmtAcct` · …), ⛔ לא יוצרים כפילות. השמות כאן הם תיאור ההכרעה.
⚠️ `livePnlPct` (`:4249-4251`) ⛔ **אינו נוגע** — יחס בין שני מחירים באותו מטבע, חסין-מטבע כמו `rMultiple`.

### 2.5 `:3877` · `:4113` · `:7900` · PDF `:466`/`:483`/`:563`/`:613` — ⛔ **אפס שינוי קוד**

כולם צורכים `curEquity`, שנרפא במקור ב-§2.2. ✅ **הם יורשים את התיקון.**
זו התכונה של מקור-אמת-אחד, והיא הסיבה ש-`:483` (ציר גרף ה-PDF) מתיישר מעצמו.

### 2.6 גילוי — `:4113` (**Q1 = ב׳**)

תג ליד כותרת ההון כאשר `unconvertedCount > 0`, באותו דפוס של אזהרת `missingCount` ב-`:4125-4128`.
מחרוזת חדשה ב-**5 שפות**, נושאת **מונה**: `"אינו כולל P&L של {n} פוזיציות — אין שער"`.
⚠️ המונה ⛔ אינו קישוט — "חלק חסר" בלי כמה הוא בדיוק סוג הגילוי שאי-אפשר לפעול לפיו.

### 2.7 PDF — הערת שוליים אחת (**Q3 = כן, מינימלי**)

שורה **אחת** ב-`exportMonthlyPDF` כאשר `missingCount + unconvertedCount > 0`, המכסה את **שני** הפערים.
⚠️ הפער של `missingCount` **קיים היום** ללא גילוי — הגל חושף אותו וסוגר אותו באותה שורה. ⛔ שום דבר מעבר.
⇒ החתימה מקבלת את שני המונים (`openPnL` כבר זמין באתר הקריאה `:7187`).

---

## 3. אסרציות **ערך** — ומה נצפה אדום **לפני** התיקון

**מיקום:** `scripts/instrument-currency-test.mjs` — כבר מייבא `accountAmount` מ-`useFxRates.js` בשורה `:39` ורץ ב-node. ⇒ ⛔ אין תשתית חדשה.
**פיקסצ׳ר:** `r = 3.0` מקובע (Q2). ⛔ אפס `fetch`.

| # | אסרציה | ציפייה | 🔴 נצפית אדומה לפני התיקון? |
|---|---------|---------|------------------------------|
| **A1** | `spotAmount(openTrade, 24.75, "ILS", table, "ready")` | `{ok:true, value:74.25, currency:"ILS"}` | ✅ **כן** — `spotAmount` ⛔ אינה קיימת ⇒ שגיאת ייבוא |
| **A2** | 🔴 **מלכודת F1.** `accountAmount(openTrade, 24.75, …)` על טבלה שבה `byDay[יום-הכניסה] = 2.0` ו-`spot = 3.0` | `spotAmount` ⇒ `74.25` · `accountAmount` ⇒ `49.50` — **ושונים** | ✅ **כן, וזו האסרציה החשובה בגל.** היא מוכיחה ש-`realizedDayKey` **אכן** תופס יום-כניסה לעסקה פתוחה, ושהחילוץ באמת מפריד את שני הזמנים. בלעדיה, שימוש חוזר ב-`accountAmount` היה עובר בירוק |
| **A3** | אין spot: `spot:null`, `byDay` מלא, `status:"ready"` | `{ok:false, reason:"no_spot_rate", value:null}` ו-`fmtAccountAmount(d) === "—"` | ✅ **כן** — נופלת על היעדר `spotAmount`. ⚠️ ומכסה את מלכודת `ready`+`spot:null` שנמדדה ב-`fx.js:247-249` |
| **A4** | `spotAmount(t, 24.75, "USD", null, "identity")` — משתמש דולרי | `{ok:true, reason:"identity", value:24.75}` — **הערך זהה לביט** | ✅ כן (היעדר הפונקציה) |
| **A5** | עסקה פתוחה, טיקר מספרי, `accountCurrency:"ILS"` | `{ok:false, reason:"unverified_instrument"}` — ⛔ **לא** מנוחשת ל-USD | ✅ כן |
| **A6** | `accountAmount` על עסקה **סגורה** — 12 מקרים קיימים | ⛔ **ללא שינוי**, byte-identical | ⛔ **לא, ובכוונה** — קו קפוא שמוכיח שהחילוץ ⛔ לא הזיז את מסלול העבר |
| **A7** | `amountAt` ⛔ אינו מכיל `\|\| 1` / `?? 1` — `readFileSync` על הקובץ | 0 מופעים | ⛔ לא — שער מבני |
| **A8** | 🔴 **C1.** `livePnlAmount(openTrade, 24.75, "USD", "ILS", table, "ready")` — חשבון $, תצוגה ₪ (ענף fallback) | `{ok:false, reason:"fx_fallback", value:null}` — ⛔ **לא** `identity` ו⛔ לא `24.75` | ✅ **כן** — `livePnlAmount` ⛔ אינה קיימת. ⚠️ ובלי C1 היא הייתה מחזירה `identity` ומחברת דולר גולמי מתחת ל-`₪` |

⚠️ **A8 היא הסיבה ש-`livePnlAmount` חולצה ל-`useFxRates.js`.** תנאי `dispCcy` שהיה יושב בתוך ה-`useMemo` ב-`.jsx` ⛔ אינו ניתן לייבוא ב-node ⇒ האסרציה עליו הייתה **מקור**, לא **ערך** — בדיוק "אסרציה ירוקה מעל פיצ'ר מת" (`useFxRates.js:10-13`, `DECISIONS:155`).
⚠️ מה ש**עדיין** אינו נמדד בטסט: ה**חיווט** עצמו (שהלולאה ב-`:2310` אכן קוראת לה, ושהתג מוצג). ⇒ מאומת ב-`C-023` **בעין**. §4 ⛔ אינו אופציונלי.

**עדכון `CLAUDE.md` §7:** מונה `test:instrument` (`165` בטקסט · **`216` בפועל היום** — סחיפה שנמדדה בריצת ה-verify של האבחון) ⇒ יעודכן למספר החדש **באותו קומיט**.

---

## 4. אימות עין — `C-023`, ארבעת המצבים

**מבצע:** Code + Chrome. פותח את `swing-edge.com`, מצלם, **מחשב את הסכום בעצמו** (חיבור, ⛔ לא "נראה סביר"), ניב מאשר את הצילומים. בלי דפדפן — ניב מצלם.

| # | הון | תצוגה | הבדיקה האריתמטית | ציפייה |
|---|-----|--------|-------------------|---------|
| 1 | USD | USD | `E + P` | ⛔ **ללא שינוי** מהצילום שלפני |
| 2 | ILS | ILS | `E + P·r` | 🔴 המספר **זז**. `Δ = P·(r−1)` |
| 3 | USD | ILS | `E + P·r` | 🔴 זז. `₪7,498.50 → ₪7,548` |
| 4 | ILS | USD | `E + P` | ⛔ **ללא שינוי** — `$861` נשאר `$861` (F2) |

⚠️ **מצבים 1 ו-4 הם חצי הבדיקה, ⛔ לא רקע.** האבחון הפריך את ההנחה ש-`$861` שגוי (§1.6 F2); ⇒ מספר שיזוז שם הוא **רגרסיה** שהגל הזה הכניס, ⛔ לא תיקון.

**נבדק בנוסף בכל מצב:** הסרגל העליון (`:3877`) · הפוטר (`:7900`) · **שלושתם נושאים את אותו מספר** · ה-PDF המיוצא נושא את הערך המומר · שורות ה-P&L החי (`:4247` · `:4920`) נושאות את אותו סמל כמו הכותרת.

**אימות אין-spot:** חסימת `/api/fx` ב-DevTools ⇒ התנהגות Q1 + `title` נושא נימוק, ⛔ לא `—` ערום.
**מצב 5 (C1) — באותה חסימה:** הון-₪ / חשבון-$ ⇒ `dispCcy` נופל ל-`ILS`. הציפייה: הכותרת ⛔ **אינה** גדלה ב-P&L החי, והתג נושא את המונה. ⚠️ ⛔ אינו מצב `C-023` נפרד — הוא בדיקת DevTools ליד בדיקת אין-spot.

---

## 5. סדר ביצוע

1. `useFxRates.js` — חילוץ `amountAt` + `spotAmount` + `livePnlAmount` · A1–A8 **נצפות אדומות** (פלט מודבק) · `npm run test:instrument`
2. `SwingEdge_App.jsx` — `openPnL` · `dailyPnL` · `:4247` · `:4920` · `spotRefusalText` · תג Q1 · הערת שוליים PDF (Q3)
3. `npm run verify` (23 חוליות + build) — פלט מלא מודבק
4. אימות עין `C-023` בארבעת המצבים + צילומים
5. קומיט הסגירה: `docs/DONE.md` (עמודת `T` = T3 + סמן **`אומת בעין`**) · `docs/CHECKS.md` `C-023` → ✅ · `docs/NEXT.md` (§14 — גל שלא עדכן אותו משאיר את הצ'אט הבא בלי כיוון) · `docs/BACKLOG.md` (`B-119` → מצבה `✅ בוצע → D-xxx` + פריט חדש ל-`statsCcy`/`dispCcy` + פריט Q3 אם נדחה) · `CLAUDE.md` §7 מונה `test:instrument`
6. ⚠️ שורת `DONE` נרשמת **בקומיט שאחריו** — קומיט ⛔ אינו יכול לשאת את ה-hash של עצמו (§14)

**הפיכות:** תצוגה בלבד. ⛔ אפס DB · אפס מיגרציה · אפס סוד · אפס מייל. `git revert` מחזיר במלואו.
**עלות רשת:** **Δ = 0 קריאות** — `paperAcctFx` כבר מושך spot ללא תנאי (`fx.js:206`); הגל **צורך ערך שכבר בזיכרון**.

---

## 6. מה ⛔ נוגעים בו

⛔ המרת עסקאות **סגורות** — יום-הסגירה נכון וקבוע (`DECISIONS:161`) · ⛔ `DecisionCoach` / `positionSizing` — מומרים כבר · ⛔ `equityCurve` — **נמדדה נקייה** (`getClosed` בלבד) · ⛔ `livePnlPct` — חסין-מטבע · ⛔ `stats.currentEquity` · ⛔ אסרציה `13.9b` — קו קפוא על התנהגות שנדחתה במודע · ⛔ `docs/NEXT.md` ו-`docs/CHECKS.md` עד סגירת הגל.
