# PLAN 2026-08-02 — T7 · קבוצות 5+6 · מסלולים פרטיים · ולידציית עריכה

> סטטוס: **awaiting approval** — נכתב אחרי היציאה מ-Plan Mode, לפני כל נגיעה בקוד.
> Baseline: `npm run verify` על `0c2e476` יצא **exit 0** (8 שערים) לפני כתיבת הקובץ.

---

## 0. אבחון read-only — מה חי, מה התיישן

כל שורה אומתה בקוד ב-`0c2e476`. מספרי השורות הם **אחרי** T4/T5/T6, ולכן
נבדלים מאלה שבאודיט 27.07.

### 0א. קבוצה 5 — באגים לוגיים במנוע · **3/3 חיים**

| ממצא | מיקום באודיט | מיקום היום | מצב | האימות |
|------|--------------|------------|-----|---------|
| FIN-036 | `EdgeFinder.js:176` | `src/intelligence/core/EdgeFinder.js:191` | 🔴 **חי** | ראה 0א.1 |
| FIN-037 | `LearningEngine.js:113` | `src/intelligence/core/LearningEngine.js:113` | 🔴 **חי** | ראה 0א.2 |
| FIN-038 | `AntiEdgeLock.js:111` | `src/intelligence/core/AntiEdgeLock.js:117` | 🔴 **חי** | ראה 0א.3 |

**0א.1 — FIN-036: `matched` הוא תמיד `false` במסלול החלקי.**
`EdgeFinder.js:191` — `if (score > best.score) best = { matched: score >= 0.75, edge, score };`
הסף `0.75` בלתי-נגיש, ואפשר להוכיח זאת סגור:

- הקורא **היחיד** של `enumeratePatterns` הוא `EdgeFinder.js:125` — `enumeratePatterns(trades, 3)`.
- `dimSize = 3` ⇒ `EdgeFinder.js:78` מדלג על `combos(DIMENSIONS, 4)` ⇒ כל `edge.key`
  מורכב מ-2 או 3 חלקים בלבד.
- התאמה מלאה חוזרת מוקדם ב-`:188` עם `score: 1`.
- לכן הציונים החלקיים היחידים הם `0`, `1/3`, `1/2`, `2/3` — **כולם `< 0.75`**.

**מכנה:** 4/4 הציונים החלקיים האפשריים נופלים מתחת לסף = 100% מהמסלול מת.
**צרכנים:** `DecisionCoach.js:447` · `GrowthTracker.js:61`.

**0א.2 — FIN-037: כל תחזית CAUTION נספרת כנכונה.**
`LearningEngine.js:111-113`:
```js
const correct =
  (v === "GO"      && e.outcome ===  1) ||
  (v === "SKIP"    && e.outcome === -1) ||
  (v === "CAUTION" && true);
```
`b.accuracy = b.correct / b.n` (`:127`) ⇒ דלי CAUTION מדווח **תמיד 100%**,
וה-`totalCorrect` הכולל (`:130`) סופג את הניפוח.

**0א.3 — FIN-038: `nowMs` מוכרז ואינו נקרא.**
`grep -rn "nowMs" src/` מחזיר ב-`AntiEdgeLock.js` **שתי** הופעות בלבד:
`:102` (הערת JSDoc) ו-`:117` (החתימה). אפס הופעות בגוף.

⚠️ **הממצא חמור יותר ממה שהאודיט ניסח.** הנעילה נגזרת מ-`recentContiguousWeeks(weekMap, LOCK_WEEKS)`
(`:142`) — השבועות האחרונים **שיש בהם עסקאות**. הנעילה חוסמת כניסה ⇒ אין עסקאות
חדשות ⇒ `weekMap` קופא ⇒ `negativeWeeks` נשאר `>= LOCK_WEEKS` **לנצח**. זו נעילה
שמזינה את עצמה, ולא רק פרמטר מת. ההערה ב-`:12-13` מבטיחה
"auto-unlocks after one winning week" — **הבטחה שאינה ממומשת בקוד.**

### 0ב. קבוצה 6 — סתירות בין מסכים · **3/4 חיים, 1 התיישן**

| ממצא | מיקום היום | מצב |
|------|------------|-----|
| FIN-013 | `SwingEdge_App.jsx:3384` | 🔴 **חי** |
| FIN-014 | `SwingEdge_App.jsx:3390` + `:622` | ✅ **התיישן — נסגר** |
| FIN-015 | `GrowthPredictor.jsx:266-267` מול `:577` | 🟡 **חי** |
| FIN-017 | `WeeklyReviewTab.jsx:66` | 🔴 **חי** |

**FIN-013 — הכרטיס סותר את עצמו.** `SwingEdge_App.jsx:3384`:
`value={curEquity}` מול `trend={totalPnL/capital*100}`.
- `curEquity` = `stats.currentEquity + openPnL.value` (`:1953-1956`) — **כולל פתוחות**.
- `totalPnL` = `stats.totalPnL` (`:408`) — **סגורות בלבד**.

**FIN-014 — התיישן.** `:3390` כבר קורא `sub={winLossBeSub(stats)}`, ו-`winLossBeSub`
(`:622`) הוא `` `${s.wins}W / ${s.losses}L${s.be > 0 ? ` / ${s.be}BE` : ""}` `` —
שלושה דליים, נגזר מ-`stats`. בדיוק התיקון שהאודיט ביקש. **נסגר ככל הנראה בקבוצה 2/3.
אין מה לעשות; יסומן כסגור.**

**FIN-015 — פורמטר כפול על אותו ערך.** `GrowthPredictor.jsx:266-267` `toFixed(0)`
מול `:577` `toFixed(1)`.

**FIN-017 — "100% על 3" מנצח edge מוכח.** `WeeklyReviewTab.jsx:66`:
`[...setups].sort((a, b) => b.winRate - a.winRate || b.totalPnL - a.totalPnL)` —
מיון גולמי, בלי `edgeScore`. הסינון היחיד הוא `count >= 2` (`:64`).

### 0ג. חמשת המסלולים הפרטיים מ-T3

`grep -rn 'status === "CLOSED"' src/ SwingEdge_App.jsx api/` — **9 אתרים**.
מקור האמת: `getClosed` (`src/intelligence/utils/statisticalModels.js:37`) =
`status === "CLOSED" && exit != null`.

| # | מסלול | הסטייה | הכרעה |
|---|--------|---------|--------|
| 1 | `MonthlyReport.js:159` | `status==="CLOSED"` בלי `exit != null` | **לאחד** |
| 2 | `MonthlyReport.js:373` (`findBestMonth`) | זהה | **לאחד** |
| 3 | `GrowthPredictor.jsx:204` | זהה | **לאחד** |
| 4 | `TradeDNA.js:185` | `OR` רחב יותר | **לא לאחד** — חריג לגיטימי |
| 5 | `EditTradeModal.jsx:37` | `OR` רחב יותר | **לא לאחד** — חריג לגיטימי |
| 6 | `normalizeRow.js:107` | — | **הרישום התיישן** |

**1+2 — `MonthlyReport`.** שתי סטיות, לא אחת:
- **(א) הגדרת "סגור".** עסקה `CLOSED` בלי `exit` נכנסת. `enrich` (`:47`) נותן לה
  `pnl = 0`, ואז `win: pnl > 0` (`:56`) הוא `false`.
- **(ב) שני דליים במקום שלושה.** `summarize:82` — `losses: n - wins`. כל עסקת BE
  נספרת כהפסד. סותר ישירות את T3 · החלטה 2 (שלושה דליים), שכבר נאכפת
  ב-`statisticalModels` וב-`computeTradingStats`.
- **מה המשתמש רואה:** `winRate`/`wins`/`losses` בטאב הדוח החודשי
  (`MonthlyReportTab.jsx`), במודאל (`MonthlyReportModal.jsx`), **ובייצוא ה-PDF**
  (`SwingEdge_App.jsx:6307` `exportMonthlyPDF`). גם ה-`grade` (`:141` `winScore`)
  נגזר מ-`sum.winRate`.

**3 — `GrowthPredictor.jsx:204`.** מזין את שער ה-5 עסקאות (`:321`), את
`monthsOfData` (`:240-249`, מוצג ב-`:501`), ואת יצירת השאלות (`:228`).
עסקה `CLOSED` בלי `exit` מקדמת את השער בלי לתרום מספר.

**4 — `TradeDNA.js:185` — חריג לגיטימי, לא לאחד.**
השורה יושבת בתוך חישוב **מפתח cache** (`_cacheKey`, `:189`), לא בתוך סטטיסטיקה.
המתמטיקה עצמה קוראת `getClosed(allTrades)` ב-`:192`. תנאי `OR` רחב **בכיוון הבטוח**:
over-invalidation עולה חישוב מחדש, under-invalidation מחזיר מספר ישן. איחוד ל-`getClosed`
היה מצמצם את המפתח ו**מגדיל** סיכון ל-cache מעופש.
→ **שורה ב-`DECISIONS.md`.**

**5 — `EditTradeModal.jsx:37` — חריג לגיטימי, לא לאחד.**
`showExitFields = (form.exit !== "" && form.exit != null) || form.status === "CLOSED"` —
אפורדנס UI. ה-`OR` הוא מה שמאפשר לעסקה `CLOSED` בלי `exit` **להציג את שדה ה-exit
כדי שהמשתמש יתקן אותה**. איחוד ל-`getClosed` היה מסתיר את השדה בדיוק ברשומה השבורה.
→ **שורה ב-`DECISIONS.md`.**

**6 — `normalizeRow.js:107` — הרישום ב-STATE התיישן.**
אחרי T4/T5 שורה `:107` היא בדיקת `shares`. שורת ה-`status` היא היום `:122`:
`const status = exit != null ? "CLOSED" : "OPEN"` — זהו **יצרן** שאוכף את האינווריאנט
`CLOSED ⟺ exit`, לא צרכן סוטה. **אינו ממצא. יימחק מ-STATE.**

**אח שנמצא בציד:** `buildImport.js:111` — `valid.filter(t => t.status === "CLOSED").length`
לספירת התצוגה המקדימה. עקבי-בבנייה מול `:122`. **הערה בלבד, לא תיקון.**

### 0ד. ממצא F4 — ולידציית עריכה · **חי, וחמור יותר מהרשום**

`EditTradeModal.validate()` (`src/components/EditTradeModal.jsx:46-72`) בודק
סופיות, חיוביות, ותאריך כניסה. **אין בדיקת גיאומטריה.** לונג עם סטופ מעל הכניסה
נשמר בשקט. אושר — הממצא חי.

⚠️ **ובנוסף — באג חי שהתגלה בסריקה (§11), ולא היה רשום באף מקום:**
`:57-59` — `if (!Number.isFinite(stopN) || stopN <= 0) return "Stop חייב להיות גדול מ-0"`.
`initForm:423` ממפה `stop: trade.stop != null ? String(trade.stop) : ""`, ו-`Number("") === 0`.

⇒ **עסקה בלי סטופ אינה ניתנת לעריכה כלל.** כל שמירה נחסמת, גם עריכת הערה או
"לקח שנלמד". זה סותר ישירות את החלטה #1 של הייבוא ("no stop is allowed",
`normalizeRow.js:112`) ואת חוזה ה-R של T3 (`rMultiple: null` לעסקה בלי סטופ).
המערכת **מייבאת** עסקאות בלי סטופ ואז **נועלת** אותן מעריכה.

הממצא הזה מעצב את חוזה הוולידציה בסעיף 3 — לכן הוא חלק מהתוכנית ולא "תיקון בדרך".

### 0ה. מה **לא** נכנס להיקף

**איחוד ארבעת מימושי הגיאומטריה** — `inferSide` (`utils.js:68`) ·
`validateTradeInputs` (`utils.js:78`) · `directionCheck` (`DecisionCoach.js:120-131`) ·
`directionOk` (`localAI.js:35-36`). רשום ב-STATE כמשימה נפרדת. T7 **צורך** את
`validateTradeInputs`, ואינו מאחד את הארבעה. §11 — לא "בדרך".

---

## 1. ניתוח השלכות (§8)

פילטר רמה 1: DB? **לא** (אפס מיגרציות, אפס UPDATE). כסף/מיילים? **לא**.
סוד? **לא**. רץ אוטומטית בפרודקשן? **לא**. בלתי הפיך? **לא** — הכול קוד.
→ הפילטר לא תפס. **אבל** — התוכנית מזיזה מספרים גלויים, ולכן סעיף 2.

---

## 2. ⚠️ מספרים גלויים שיזוזו — ומה עוד לא נמדד

| # | תיקון | המספר | איפה המשתמש רואה |
|---|--------|--------|-------------------|
| 1 | FIN-013 | אחוז ה-trend בכרטיס ההון | דשבורד · KPI Row · `StatCard anchor="equity"` |
| 2 | FIN-015 | אחוז הצמיחה | Growth Predictor · הכרטיס מול ה-tooltip |
| 3 | FIN-017 | שם ה-setup המוביל/הגרוע | Weekly Review · כרטיס Best/Worst |
| 4 | FIN-036 | `edgeMatch.matched` | Decision Coach · הוורדיקט · `GrowthTracker` |
| 5 | FIN-037 | דיוק CAUTION ודיוק כולל | דוח כיול המנוע |
| 6 | FIN-038 | אילו setups נעולים | חסימת כניסה + אזהרות |
| 7 | MonthlyReport | `winRate` · `wins` · `losses` · `grade` | טאב+מודאל דוח חודשי **וייצוא PDF** |
| 8 | GrowthPredictor | שער 5 העסקאות · `monthsOfData` | Growth Predictor |

**7 ו-8 זזים רק אם קיימות בפרודקשן עסקאות `CLOSED` בלי `exit` או עסקאות BE.**
STATE טוען "0 ו-0", אך המדידה קדמה ל-T4/T5/T6.

### 2.1 ⏸️ המדידה חסומה על ניב — אין ל-Claude גישת קריאה לפרודקשן

`.env` המקומי מכיל `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` בלבד.
`SUPABASE_DB_URL` (שבו משתמש `scripts/data-guardian.mjs`) הוא סוד CI ואינו מקומי.
מפתח anon כפוף ל-RLS ⇒ רואה עסקאות של משתמש אחד, לא של 10. **לכן אי-אפשר
למדוד את ההפרש מכאן.** לפי §12, Claude גם לא מזין ולא שולף סודות.

**מה שנדרש מניב — read-only, שלוש שאילתות, ב-SQL Editor:**

```sql
SET default_transaction_read_only = on;

-- Q1 · גיאומטריה הפוכה (סעיף הציד 3) — לספירה בלבד, אפס UPDATE
SELECT count(*) FILTER (WHERE side = 'LONG'  AND stop > entry) AS long_reversed,
       count(*) FILTER (WHERE side = 'SHORT' AND stop < entry) AS short_reversed,
       count(*)                                                AS total_with_stop
FROM public.trades
WHERE stop IS NOT NULL AND entry IS NOT NULL;

-- Q2 · האם ההגדרה הפרטית של "סגור" סוטה בפועל
SELECT count(*) FILTER (WHERE status = 'CLOSED' AND exit IS NULL) AS closed_no_exit,
       count(*) FILTER (WHERE status = 'CLOSED' AND exit IS NOT NULL) AS closed_with_exit,
       count(*)                                                    AS total
FROM public.trades;

-- Q3 · עסקאות בלי סטופ (חסומות מעריכה — סעיף 0ד)
SELECT count(*) FILTER (WHERE stop IS NULL) AS no_stop,
       count(*)                             AS total
FROM public.trades;
```

**עד שהמספרים חוזרים — שלב ג' (MonthlyReport + GrowthPredictor) לא מתחיל.**
זה אינו חוסם את שלבים א'/ב'/ד', שהם קוד-מנוע בלי תלות בנתון החי.

---

## 3. עקרונות התיקון — כפי שהם חלים כאן

1. **מקור אמת אחד.** כל מסלול פרטי שמאוחד קורא ל-`getClosed` / `outcomeRates` /
   `validateTradeInputs` הקיימים — **לא העתקה מתוקנת שלהם**.
2. **חריג לגיטימי מתועד, לא מאוחד.** `TradeDNA:185` ו-`EditTradeModal:37` —
   שורה אחת כל אחד ב-`DECISIONS.md`.
3. **חוזה הוולידציה בעריכה — מותאם במפורש, לא נעקף.** `validateTradeInputs`
   נבנתה לעסקה **מתוכננת** (entry/stop/target/side). עריכה שונה בשני דברים,
   ושניהם מטופלים בגלוי:
   - **סטופ אופציונלי.** לפי החלטה #1 עסקה בלי סטופ חוקית. `normalizeRow.js:112`
     כבר עושה בדיוק את זה: `if (stop != null && stop > 0) { …validate… }`.
     `EditTradeModal` יאמץ את **אותו** תנאי — וכך גם נסגר הבאג מ-0ד.
   - **`exit` אינו בחוזה.** `validateTradeInputs` אינה מקבלת `exit` ואינה צריכה:
     `exit` הוא תוצאה, לא גיאומטריה מתוכננת. בדיקת החיוביות הקיימת על `exit`
     נשארת מקומית. **החוזה לא משתנה — רק נצרך נכון.**
4. **אפס-פגיעה ברשומות קיימות.** הוולידציה חלה על **שמירה חדשה בלבד**.
   אפס `UPDATE`, אפס מיגרציה. עסקאות היסטוריות עם גיאומטריה הפוכה — **ספירה
   ל-STATE** (Q1 לעיל), לא תיקון.
   ⚠️ **תופעת לוואי מחייבת החלטה:** משתמש שיפתח עסקה כזו לעריכה ייחסם עד
   שיתקן את הגיאומטריה — גם אם בא לתקן הערה. **אם Q1 מחזיר > 0, אני עוצר
   ומביא את זה להכרעתך לפני שלב ד'.** אם Q1 מחזיר 0 — התרחיש תיאורטי.
5. **baseline שמסוגל להבחין.** לקח 02.08 (פיקסצ'ר שנגזר מעצמו): לכל תיקון —
   תרחיש שנכתב **תחילה**, מורץ נגד הקוד **הישן**, ומוכח **נכשל**. פלט הכישלון
   מודבק בדיווח. תרחיש שעובר על הקוד הישן אינו baseline, הוא קישוט.

---

## 4. הביצוע — ארבעה שלבים, כל אחד קומיט נפרד

### שער חדש: `scripts/engine-test.mjs` → `npm run test:engine`

אף אחד מ-8 השערים אינו נוגע ב-`matchIdeaToEdge`, `calibrationReport`,
`checkAntiEdgeLocks`, או `generateMonthlyReport`. `test:coach` בודק **אינווריאנטיות
בין פרסונות** (`coach-invariance-test.mjs:8,73`) — לא נכונות. שינוי עקבי בין
כל הפרסונות עובר אצלו בשקט. לכן שער חדש, ו-`verify` יעלה מ-8 ל-9.

---

### שלב א' — קבוצה 5 · שלושה באגי מנוע

**א.1 · FIN-036 — סף נגיש.**
קבוע מפורש `PARTIAL_MATCH_MIN = 2/3` ליד `matchIdeaToEdge`, עם הערה שמצמידה
אותו ל-`dimSize` של `:125`. משמעות: התאמת 2-מתוך-3 נחשבת; 1-מתוך-2 (0.5) לא.
⚠️ **דורש את אישורך — זו בחירת סף שמשנה ורדיקטים.** החלופה: להסיר את
`matched` מהמסלול החלקי ולהשאיר `score` בלבד, כך שהצרכן יחליט.

**א.2 · FIN-037 — ל-CAUTION אין ערך אמת.**
CAUTION הוא גידור, לא תחזית בינארית — אין תוצאה שמפריכה אותו.
לכן **הוצאה מהמונה ומהמכנה** של הדיוק הכולל, ודיווח בדלי נפרד עם `n`
והתפלגות התוצאות. זה §2 של `CLAUDE.md` בדיוק: אין מנה בלי מכנה שיכול להכיל אותה.
⚠️ **דורש את אישורך** — החלופה היא להגדיר "CAUTION צדק אם ההפסד לא חרג מ-1R",
שמצריך סף שרירותי נוסף.

**א.3 · FIN-038 — נעילה מתיישנת.**
`nowMs` ייקרא: אם השבוע הכשיר האחרון של ה-setup ישן מ-`LOCK_STALE_WEEKS`
ביחס ל-`nowMs`, הנעילה **מודחת לאזהרה** — הראיה התיישנה. זה שובר את
המעגל שתיאר 0א.3 בלי לאבד את ההגנה.
⚠️ **דורש את אישורך — ערך `LOCK_STALE_WEEKS` וההתנהגות עצמה.** החלופה
המינימלית: להסיר את `nowMs` מהחתימה ולתעד שנעילה נפתחת ידנית בלבד. **אני
ממליץ על ההתיישנות** — נעילה שמזינה את עצמה היא בדיוק "כשל שקט" (§2).

**תרחישי baseline (חייבים להיכשל על הקוד הישן):**
- `matchIdeaToEdge` על רעיון שתואם 2-מתוך-3 → `matched === true`
- CAUTION שהתבדתה → אינה נספרת כנכונה; `byVerdict.CAUTION.accuracy` אינו `1`
- setup נעול + `nowMs` אחרי ההתיישנות → לא ב-`locked`

### שלב ב' — קבוצה 6 · שלוש סתירות מסך

- **FIN-013** — ה-trend ייגזר מאותו בסיס כמו ה-value.
- **FIN-015** — פורמטר אחד לשני האתרים.
- **FIN-017** — מיון ב-`WeeklyReviewTab.jsx:66` דרך `edgeScore`/`rankSetupEdges`
  הקיים. **לא נוסחה חדשה.**
- **FIN-014** — אין פעולה; יסומן כסגור ב-STATE.

### שלב ג' — מסלולים פרטיים ⏸️ **חסום על Q1–Q3**

- `MonthlyReport.js:159,373` → `getClosed`
- `MonthlyReport.js:82` → שלושה דליים דרך `outcomeRates` הקיים
- `GrowthPredictor.jsx:204` → `getClosed`
- `DECISIONS.md`: שתי שורות לחריגים (TradeDNA · EditTradeModal)

**שער קבלה:** על תיק עם עסקת `CLOSED`-בלי-`exit` ועסקת BE, `generateMonthlyReport`
מדווח אותו `winRate` כמו `computeTradingStats`. תרחיש זה **נכשל** על הקוד הישן.

### שלב ד' — ולידציית עריכה

`EditTradeModal.validate()` יקרא `validateTradeInputs(entryN, stopN, targetN, form.side)`
מאחורי `if (stopN > 0)` — אותו תנאי כמו `normalizeRow.js:112`. סוגר גם את
באג "עסקה בלי סטופ נעולה מעריכה" (0ד).

**אימות דפדפן ברתמה** (חובה, לא אופציונלי):
1. עסקה LONG · סטופ מעל הכניסה → שמירה **נחסמת** בהודעה הנכונה
2. עסקה **בלי** סטופ → עריכת הערה **נשמרת** (הבאג מ-0ד סגור)
3. עסקה תקינה → נשמרת כרגיל (אין רגרסיה)

---

## 5. אימות סופי

`npm run verify` מלא — **9 שערים** אחרי הוספת `test:engine`.
הפלט המלא יודבק, לא סיכום (§7).
כל שינוי שנוגע ב-baseline של `tradingstats` → **טבלת לפני/אחרי ועצירה לאישור**
(כמו T6 §4). אם ערך זז בלי שהתכוונתי — **STOP**, לא התאמת הציפייה.

## 6. STATE / DECISIONS

- `STATE.md`: FIN-014 סגור · `normalizeRow:107` נמחק כממצא שהתיישן ·
  ⏸️ Q1–Q3 חסומות על ניב · ⚠️ עסקאות עם גיאומטריה הפוכה (אם Q1 > 0) ·
  ⚠️ `buildImport.js:111` · ⏭️ איחוד ארבעת מימושי הגיאומטריה (נשאר פתוח)
- `DECISIONS.md`: סף `PARTIAL_MATCH_MIN` · CAUTION מחוץ לדיוק ·
  התיישנות נעילה · שני החריגים הלגיטימיים · חוזה הוולידציה בעריכה

---

## 7. ⛔ שלוש הכרעות שאני צריך ממך לפני שלב א'

1. **סף `matchIdeaToEdge`** — `2/3`, או להסיר את `matched` ולהשאיר `score`?
2. **CAUTION** — מחוץ לדיוק (המלצתי), או סף "לא חרג מ-1R"?
3. **התיישנות נעילה** — לממש (המלצתי), או להסיר את `nowMs` ולתעד?

ובמקביל: **Q1–Q3** מריצות שלב ג', ו-Q1 עשויה לשנות את שלב ד'.
