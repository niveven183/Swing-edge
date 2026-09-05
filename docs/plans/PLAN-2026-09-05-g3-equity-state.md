# PLAN 2026-09-05 · G3 — `equityState`: ⛔ אין מספר עד שהוא שלם

**מזהה גל:** `B-295` (נפתח כאן) · **קלט:** `B-294` · **אודיט מקור:** `AUDIT-2026-09-05-capital-sources.md` §14.3
**בסיס:** `966f56f` · עץ נקי · **סטטוס:** ⏸️ awaiting approval — ⛔ אפס נגיעה בקוד
**רמה: T3 · תשובות: לא / כן / לא / כן / כן**
(2 אמון — המספר בכותרת · 4 רוחב — `SwingEdge_App.jsx` + מודול חדש + `package.json` · 5 ודאות — תזמון דפדפן ⛔ לא נמדד)

---

## 0. הכרעה

🔴 **ניב + תקן התעשייה (IBKR · Sharesight): ⛔ אין מספר עד שהוא שלם. ⛔ לעולם לא חלקי-כסופי.**

הראיה: 05.09 15:26:41, אותן הגדרות — `$3,000.00` מול `$3,045.66`. הפער `45.66` = P&L פתוח.
ראיה שנייה: חשבון QA — «אין מחיר חי» ל-`UUUU`/`NOK` ⇒ הכותרת הציגה הון-בלבד כסופי בלי שהמשתמש ידע שה-P&L חסר.

---

## 1. אבחון — נמדד ב-`966f56f`, read-only

⚠️ **הסעיף הזה נושא את שלב 1 של §8.1.** G3 כבר אובחן ב-`AUDIT-2026-09-05-capital-sources.md` §14.3;
המדידות כאן **מרחיבות ומתקנות** אותו בשתי נקודות (§1.1 · §1.3), ונדחפות **לפני** כל נגיעה בקוד.
⛔ לא נפתח קובץ `audits/` נוסף — אם ניב רוצה אחד, הוא נכתב לפני הביצוע.

### 1.0 העוגנים — אוששו לפי תוכן, ⛔ לא הועתקו

| מיקום | מה יש שם | מסקנה |
|---|---|---|
| `:1597` | `const [pricesLoading, setPricesLoading] = useState(false)` | קיים ⇒ ⛔ אין state חדש |
| `:1598` | `const [pricesLastUpdated, setPricesLastUpdated] = useState(null)` | קיים ⇒ האות השני, ⛔ בחינם |
| `:2134` | `const { table: fxTable, status: fxStatus } = useFxRates(...)` | קיים |
| `:2517-2532` | `openPnL ⇒ { value, missingCount, unconvertedCount }` | קיים |
| `:2561-2563` | `curEquity = equityBase + closedPnL.value + openPnL.value` | 🔴 **השורש** — מסכם גם כש-`missingCount > 0` |
| `:4181` · `:4417` · `:8258` | `fmtBalance(curEquity, dispCcy)` ×3 | שלושת אתרי הרינדור |

⇒ **אפס state חדש · אפס fetch חדש.** נגזרת אחת משלושה אותות קיימים.

### 1.1 ① `pricesLoading` — ⛔ **הפרכה חלקית: אינו מספיק לבדו**

הפרומפט הציע `missingCount>0 ∧ pricesLoading=false ⇒ נכשל`. **נמדד — שלושה חורים:**

1. **הפריים הראשון.** `:1597` מאותחל `false`; `setPricesLoading(true)` יושב ב-`:1986`, **בתוך**
   `fetchLivePrices`, שנקראת מ-`useEffect` (`:2032-2039`) — כלומר **אחרי** ה-paint הראשון.
   ⇒ יש פריים מצויר שבו `pricesLoading=false` ∧ `livePrices={}` ∧ `missingCount=openTrades.length`.
   הכלל שבפרומפט מסווג אותו **`partial` (נכשל)** בזמן שאף בקשה ⛔ לא יצאה.
2. **טאב מוסתר.** `:2037` `if (document.hidden) return;` — no-op שקט ו⛔ אינו מתוזמן מחדש.
   ⇒ טאב שנפתח ברקע: `pricesLoading` נשאר `false` **לנצח** בלי שנעשה ניסיון.
3. **ספק שמחזיר ריק.** `:1993` `setPricesLastUpdated(new Date())` נכתב **רק** בתוך
   `if (Object.keys(priceData).length > 0)`. ⇒ תשובה ריקה משאירה `pricesLastUpdated=null` לנצח.

**האות הנכון הוא הזוג `pricesLoading` + `pricesLastUpdated`** — שניהם קיימים (`:1597`·`:1598`).
⚠️ **ואפילו הוא ⛔ אינו מבחין בין «טאב מוסתר, לא ניסה» ל-«ניסה ונכשל»** — ההבחנה דורשת state
חדש, שנאסר. ⇒ **D1** למטה, הכרעת מוצר.

### 1.2 ② `fxStatus="loading"` — ⛔ **אין timeout בצד לקוח**

`useFxRates.js:80-95`: `loading` מסתיים **רק** ב-`.then`/`.catch` של `loadRateTable`.
ב-`src/lib/fx.js` ⛔ אין `AbortController` ו⛔ אין `setTimeout` (נמדד: `grep` ריק).
החסם היחיד הוא **בשרת** — `api/fx.js:47` `fetchWithTimeout(url, opts, ms = 8000)`, ועד שתי
קריאות (spot + היסטורי) ⇒ ~16 שניות, ועוד מגבלת ה-invocation.

⇒ **גדר-רינדור על `loading` יכולה להשאיר את הכותרת בלי ספרות ~16 שניות**, ובחיבור תלוי — בלי
חסם אפליקטיבי כלל. ⚠️ **האוכלוסייה מוגבלת:** הנתיב נוגע רק למי ש-`capitalCurrency ≠ accountCurrency`;
לכל השאר `useFxRates.js:58` מחזיר `identity` בלי לגעת ברשת. **⛔ כמה משתמשים בפועל — לא נמדד כאן.**

### 1.3 ③ ההיפוך `₪2,500.00 → $876.89` — **אישוש, ו-§14.3④ ⛔ לא נסתר**

האודיט קבע «אותה משפחה, שורש שונה» — **נמדד ואושש**: `:2198` `fxOk` תלוי ב-`equityBaseD.ok`
שתלוי ב-`fxTable`; בזמן `loading` הטבלה `null` ⇒ `fxOk=false` ⇒ `:2199` `dispCcy` נופל
ל-`capitalCurrency` ⇒ **`₪2,500` מוצג כסופי**, ואז מתהפך ל-`$876.89`.

⛔ **אבל שתי הקביעות מתיישבות.** §14.3④ שלל «תיקון **שער-נתונים** אחד יסגור את השני» — וזה נכון.
הנגזרת כאן ⛔ **אינה** תיקון שער-נתונים: היא **גדר רינדור** שצורכת את **שני** האותות
(`pricesLoading` ו-`fxStatus`), ולכן כן מכסה את שניהם. ⇒ **נגזרת אחת מספיקה, ⛔ מהסיבה שנרשמה
באודיט ולא למרותה.**

🔴 **ממצא נלווה — `no_fx` כבר מיושם, ⛔ אל תיגע:**
`:2199` מפיל את הסמל ל-`capitalCurrency`, ו-`useFxRates.js:219`
(`if (displayCurrency !== accountCurrency) return { ok:false, reason:"fx_fallback" }`)
מסרב על **כל** עסקה פתוחה באותו רגע ⇒ `openPnL.value === 0` וסכום חוצה-יחידות שם
**בלתי-אפשרי**. הנגזרת רק **קוראת** את המצב הזה.

### 1.4 מה כבר קיים ומה ערום — ההפתעה של האבחון

`B-142` (`:4435`) כבר מרנדר באנר גילוי עם **שלושה מונים ומכנה**, ו-`:4409` מרנדר
`t.fxUnavailable` — **שניהם באתר ה-KPI בלבד.**
`:4181` (כותרת) ו-`:8258` (פוטר) נושאים `fmtBalance(curEquity, dispCcy)` **ערום, בלי שום גילוי.**
⇒ הפער הוא **⛔ לא «אין גילוי»** אלא **«גילוי באתר אחד מתוך שלושה, ועיוור ל-`loading`»**.
הבאנר ב-`:4435` יורה על מוני `missingCount` בלבד ⇒ בזמן טעינה הוא **מזעיק שווא** («אין מחיר
ל-2 מתוך 2») על מצב שייפתר בעוד שנייה.

---

## 2. הפלט האדום — לפני התיקון

הרצה ב-`/tmp/g3-red.mjs` (⛔ מחוץ לריפו, ⛔ בלי קומיט), ממדלת את הכרעת הרינדור **הנוכחית**
ב-3 האתרים, כולל כלל הסירוב שנמדד ב-`useFxRates.js:219`:

```
✗ case 1 loading  header got: USD 3000.00 +[no tag]      want: … (no digits)
✗ case 1 loading  kpi    got: USD 3000.00 +[partial:2/2] want: … (no digits)
✗ case 1 loading  footer got: USD 3000.00 +[no tag]      want: … (no digits)
✓ case 2 complete header got: USD 3045.66 +[no tag]      want: USD 3045.66 +[none]
✓ case 2 complete kpi    got: USD 3045.66 +[no tag]      want: USD 3045.66 +[none]
✓ case 2 complete footer got: USD 3045.66 +[no tag]      want: USD 3045.66 +[none]
✗ case 3 partial  header got: USD 3000.00 +[no tag]      want: USD 3000.00 +[partial:2/2]
✓ case 3 partial  kpi    got: USD 3000.00 +[partial:2/2] want: USD 3000.00 +[partial:2/2]
✗ case 3 partial  footer got: USD 3000.00 +[no tag]      want: USD 3000.00 +[partial:2/2]
✗ case 4 no_fx    header got: ILS 2500.00 +[no tag]      want: ILS 2500.00 +[fx]
✓ case 4 no_fx    kpi    got: ILS 2500.00 +[fx]          want: ILS 2500.00 +[fx]
✗ case 4 no_fx    footer got: ILS 2500.00 +[no tag]      want: ILS 2500.00 +[fx]
✗ case 5 loading  header got: ILS 2500.00 +[no tag]      want: … (no digits)
✗ case 5 loading  kpi    got: ILS 2500.00 +[no tag]      want: … (no digits)
✗ case 5 loading  footer got: ILS 2500.00 +[no tag]      want: … (no digits)
✗ case 6 partial  header got: USD 3000.00 +[no tag]      want: USD 3000.00 +[partial:0/2]
✓ case 6 partial  kpi    got: USD 3000.00 +[partial:0/2] want: USD 3000.00 +[partial:0/2]
✗ case 6 partial  footer got: USD 3000.00 +[no tag]      want: USD 3000.00 +[partial:0/2]

RED 12/18 · GREEN 6/18  (population: 6 cases × 3 render sites = 18)
```

⛔ **ירוק-מראש לא התקבל** ⇒ אין עצירה מהסיבה הזו.

⚠️ **המספר `12/18` הוא אחרי שתי הפרכות עצמיות, ⛔ לא לפניהן.**
① הריצה הראשונה החזירה `ILS 2545.66` ב-`case 4` — נראה כמו סכום חוצה-יחידות **חי**;
קריאת `useFxRates.js:219` הוכיחה שזו **שגיאה בפיקסצ'ר**, ⛔ לא באג בקוד.
② הריצה השנייה עדיין הוסיפה `45.66` כשאין עסקאות פתוחות כלל.
**הרישום כאן הוא מה שנשאר אחרי שנפסלו שניהם.**

⚠️ **מגבלת ה-harness הזה — מפורשת:** הוא ממדל את הכרעת הרינדור, ⛔ **אינו מריץ את
`SwingEdge_App.jsx`**. הוא מספיק כדי להוכיח **אילו** מצבים אדומים היום; ⛔ **אינו** מחליף את
harness החילוץ-לפי-עוגן שייכתב בשלב הביצוע (§3.3) ו⛔ אינו מחליף את `C-041`.

---

## 3. הביצוע

### 3.1 `src/lib/equityState.js` — מודול, ⛔ לא תנאי ב-`useMemo`

```
deriveEquityState({ openCount, missingCount, unconvertedCount,
                    closedUnconvertedCount, pricesLoading,
                    pricesLastUpdated, fxStatus }) → "loading"|"complete"|"partial"|"no_fx"
```

⚠️ **מודול ⛔ ולא תנאי כלוא ב-`.jsx`** — בדיוק מהנימוק שכתוב ב-`useFxRates.js:206-211`:
תנאי הכלוא ב-`useMemo` ⛔ אינו ניתן לייבוא ב-node, והאסרציה עליו הייתה **מקור** ולא **ערך**.

**סדר ההכרעה (קובע — שני מצבים יכולים להתקיים יחד):**
1. `fxStatus === "unavailable"` ⇒ `no_fx`
2. `fxStatus === "loading"` ∨ `pricesLoading` ⇒ `loading`
3. `openCount > 0 ∧ pricesLastUpdated == null` ⇒ **D1**
4. `missingCount > 0 ∨ unconvertedCount > 0 ∨ closedUnconvertedCount > 0` ⇒ `partial`
5. אחרת ⇒ `complete`

⚠️ `closedUnconvertedCount` נכלל בכוונה — `B-142` כבר מגלה עליו, וכותרת שתסווג `complete`
בזמן שהבאנר מתחתיה אומר «אין שער ל-N סגורות» היא סתירה על אותו מסך.

### 3.2 helper רינדור אחד, שלושה אתרי צריכה

| אתר | היום | אחרי |
|---|---|---|
| `:4181` כותרת | מספר ערום | `…` / מספר / מספר+`⚠` |
| `:4417` KPI | מספר + באנר `B-142` מתחת | `…` / מספר / מספר+באנר (הבאנר **מתמזג** עם המצב ⇒ ⛔ אינו יורה בזמן `loading`) |
| `:8258` פוטר | מספר ערום | `…` / מספר / מספר+`⚠` |

⛔ **helper אחד** — ⛔ לא שלוש העתקות. ⚠️ **`Math.round` ⛔ לא נכנס לכאן** — `D-068` הרגע הסיר
עיגול מ-P&L חי; הנגזרת ⛔ אינה נוגעת בערך, רק בשאלה **אם** להציג אותו.

**i18n:** המטרה **אפס מפתחות חדשים** — `partialSumWarn`·`missingPriceWarn`·`unconvertedPnlWarn`·
`unconvertedClosedWarn`·`fxUnavailable` **אוששו קיימים ב-5 השפות** (en·he·es·pt·ar).
אם `title`/`aria-label` יידרש מפתח שאינו קיים — הוא נוסף ל-**5** השפות באותו קומיט, קול קר,
עובדה ⛔ לא הסבר. ⛔ אין מחרוזת קשיחה.

### 3.3 שער — `test:equitystate`, החוליה ה-28

18 אסרציות **ערך** (6 מצבים × 3 אתרים), נצפות אדומות לפני התיקון.
⚠️ **ההזזה 27→28 ב-`CLAUDE.md` §7 היא המופע החמישי של `B-274` ו⛔ אינה סוגרת אותו** — `B-274`
נסגר רק ע"י שער שגוזר את המספר מ-`package.json`.
⚠️ אם ייכתב חילוץ-לפי-עוגן מ-`SwingEdge_App.jsx` (תבנית `test:hydration`/`test:shortpct`) —
**כשל חילוץ הוא אדום קשה ⛔ ולעולם לא דילוג** (`B-272`), עם שערי-מטא.

### 3.4 `C-041` — אימות עין

T3 ⇒ **⛔ אין סגירה בלי אימות עין/דפדפן.** ⛔ ה-harness ⛔ אינו מכסה JSX · React · RTL ·
ניגודיות · דפדפן אמיתי — אותו גבול בדיוק של `C-036`·`C-038`·`C-039`.
נבדק ידנית: כותרת · KPI · פוטר, בשלושת המצבים הנצפים, ב-he ו-en.

---

## 4. 🔴 שתי הכרעות פתוחות — ⛔ ניב, ⛔ לא Code

### D1 — `pricesLastUpdated == null` ∧ `pricesLoading == false`

| | התנהגות | הסיכון |
|---|---|---|
| **(א)** | `loading` ⇒ ⛔ אף ספרה | ספק נופל ⇒ הכותרת **ריקה לנצח**. כשל שקט **חדש** |
| **(ב)** | `partial` ⇒ מספר + תג | הבזק פריים אחד ב-paint; «לא ניסה» מסומן כ«חסר» |

**המלצה: (ב)** — תג נכון עדיף על מקום ריק בלתי-חסום, ו-(ב) ⛔ לעולם אינו מציג מספר **כסופי**;
הוא מציג מספר **מתויג**. ⚠️ **הכרעת מוצר, ⛔ לא ריפקטור.**

### D2 — צורת התג בכותרת ובפוטר

משפט מלא ⛔ אינו נכנס — הפוטר הוא רצועת `font-mono` בגודל `10px` (`:8246`).
**מוצע:** `⚠` + `title`, והמשפט המלא נשאר באתר ה-KPI בלבד.

---

## 5. מה נשמר · מה זז · רולבק

⛔ **אסור לגעת:** הון · מטבע · `capitalCurrency` · `matchesCapital` · לוח סיכונים (`G2`) ·
`openPnL` **עצמו** (⛔ שנה את החישוב — רק קרא אותו) · `curEquity` כערך · `fxOk`/`dispCcy` ·
DB · `Q8` · `className` · state חדש · fetch חדש.
⛔ **אסור:** `--no-verify` · force · `--amend` · `|| 0` · `?? 0` (⇒ `R-2`: `null` הוא הודאה,
`0` הוא המצאה).

**זז:** `src/lib/equityState.js` (חדש) · שלושת אתרי הרינדור ב-`SwingEdge_App.jsx` ·
`scripts/test-equitystate.mjs` (חדש) · `package.json` · `CLAUDE.md` §7 · `docs/*`.

**רולבק:** `git revert` של קומיט הביצוע. ⛔ אין מיגרציה · ⛔ אין כתיבה ל-DB · ⛔ אין סוד ⇒
הפיך מלא, בקומיט אחד, תוך דקה.

---

## 6. רישום (§10.1 · §14)

| פריט | יעד |
|---|---|
| `B-295` — הגל עצמו | `BACKLOG` ⇒ `STATE` 🔴 בזמן ביצוע |
| `B-294` — `UUUU`/`NOK` | ⛔ **אינו נסגר כאן.** קלט בלבד; נשאר פתוח |
| `B-274` — מניית החוליות | ⛔ **אינו נסגר.** המופע החמישי |
| `C-041` — אימות עין | `CHECKS`, **לפני** סגירת הגל |
| `D1`/`D2` | `DECISIONS` עם הנימוק, אחרי הכרעת ניב |
| מגבלת `~16s` (§1.2) | `STATE` ⚠️ — חוב מוכר, ⛔ לא מתוקן כאן |
| הבזק פריים (D1-ב) | `CHECKS` תחת `C-041` |

**מה עלה בשיחה ואינו ברפו:** אין. שלושת הממצאים החדשים (§1.1 שלושת החורים · §1.2 היעדר
timeout · §1.4 «גילוי באתר אחד מתוך שלושה») נושאים שורה בטבלה למעלה.

---

## 7. סטטוס

⏸️ **awaiting approval.** ⛔ אפס נגיעה בקוד · ⛔ אפס `npm` · ⛔ אפס workflow.
`D1` ו-`D2` חסומים על ניב — הביצוע ⛔ לא מתחיל לפניהם.
