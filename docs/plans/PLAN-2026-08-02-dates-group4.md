# PLAN 2026-08-02 — T6 · קבוצה 4: עקביות תאריכים

**סטטוס:** awaiting approval · **HEAD בזמן הכתיבה:** `f375478`
**אודיט מקור:** `docs/audits/AUDIT-2026-07-27-financial-integrity.md` §קבוצה 4
**ממצאים:** FIN-016, FIN-018, FIN-019, FIN-020, FIN-021, FIN-022, FIN-023, FIN-024

---

## 0. תמצית — שתי הנחות בבריף התבררו כשגויות

> **אין בעיית נתונים. אין מיגרציה. אין backfill.**
> כל התיקון הוא בקוד, ואפס שורות ב-DB משתנות.

| הנחה בבריף | מה שנמדד בפועל (Supabase, read-only, 2026-08-02) |
|---|---|
| "14 עסקאות **חסרות** `closedAt`" | 14 עסקאות עם `closedAt IS NULL` — **כולן `status='OPEN'` עם `exit IS NULL`**. לפי חוזה `deriveCloseState` (`src/lib/tradeCloseState.js:13`) זהו **הערך הנכון**, לא ערך חסר. אין מה למלא. |
| "משתמש `user_92a06c0c`" | `92a06c0c-c407-42f0-8bf7-476d58f31c9d` = **niveven183@gmail.com — ניב עצמו**. ולניב **0 עסקאות** בטבלה. 14 השורות שייכות ל-**9 משתמשים אחרים**, 1-4 שורות לכל אחד. |

**המשמעות:** כלל ההכרעה #1 ("תיקון קוד קודם למגע בנתונים") אינו מנצח כאן בנקודות —
הוא מנצח בנוקאאוט. כללי ההכרעה #2 ו-#3 (backfill, מיגרציה) **אינם חלים**, כי אין
שדה חסר לגזור.

---

## 1. שלב 0 — אבחון read-only

### 1.1 מפקד אנומליות — כל 40 העסקאות במערכת

```sql
select count(*) as total,
 count(*) filter (where date > current_date)                             as future_date,
 count(*) filter (where date < date '2000-01-01')                        as pre_2000,
 count(*) filter (where "closedAt" is not null and "closedAt"::date<date) as closed_before_open,
 count(*) filter (where "closedAt" is not null and "closedAt" > now())   as future_closedat,
 count(*) filter (where "createdAt" is null)                             as null_createdat,
 count(*) filter (where date is null)                                    as null_date,
 count(*) filter (where status='CLOSED' and "closedAt" is null)          as closed_missing_stamp,
 count(*) filter (where status='OPEN'   and "closedAt" is not null)      as open_with_stamp
from public.trades;
```

| מדד | ערך | מכנה |
|---|---|---|
| סה"כ עסקאות | 40 | — |
| משתמשים | 10 | — |
| עסקאות דמו | **0** | 40 |
| תאריך עתידי | 0 | 40 |
| תאריך לפני 2000 | 0 | 40 |
| `closedAt < date` | 0 | 40 |
| `closedAt` עתידי | 0 | 40 |
| `createdAt` / `date` ריקים | 0 | 40 |
| **`CLOSED` בלי `closedAt`** | **0** | 26 הסגורות |
| **`OPEN` עם `closedAt`** | **0** | 14 הפתוחות |

**0 אנומליות מתוך 40 = שכבת הנתונים נקייה לחלוטין.** חלוקת המצבים היא בדיוק שתי
קבוצות, ואין שלישית:

| status | exit | closedAt | count |
|---|---|---|---|
| CLOSED | not null | not null | 26 |
| OPEN | null | **null** | 14 |

> ⚠️ **ממצא צד שראוי לתשומת לב ניב:** 36 עסקאות הדמו שמופיעות ב-`STATE.md`
> §סיכונים פתוחים ובאודיט (`is_demo=true`) — **אינן קיימות עוד**. סה"כ ירד
> 114 → 40. לא נגעתי, רק מדווח.

### 1.2 מי הם 14 בעלי ה-`closedAt IS NULL`

9 משתמשים, לא אחד. אף אחד מהם אינו ניב.

| # שורות | נרשם | טווח `date` |
|---|---|---|
| 4 | 2026-05-10 | 2026-07-15 |
| 2 | 2026-07-20 | 2026-07-21 → 07-23 |
| 2 | 2026-07-21 | 2026-07-27 |
| 1 ×5 משתמשים | 06-19 → 07-30 | 06-19 → 07-31 |

שניים מהתשעה הם חשבונות פנימיים (`hive@swing-edge.local`, `sentinel.qa@swing-edge.com`);
שבעה הם משתמשים אמיתיים. **כולם — פוזיציות פתוחות תקינות.**

### 1.3 מה המשתמש רואה היום בגלל 14 השורות האלה

**כלום.** זו התשובה, והיא זו שקובעת שלא נוגעים.
`getClosed()` (מקור-אמת-אחד ל"סגור", `statisticalModels.js`) מסנן אותן החוצה מכל
חישוב של עסקאות סגורות. הן מופיעות — נכון — ככרטיסי פוזיציה פתוחה עם P&L חי.
עסקה פתוחה **אמורה** להיעדר מעקומת ההון, מהדוח החודשי ומה-drawdown.

### 1.4 מפת שדות הזמן

טיפוסי DB (אומתו מול `information_schema`): `date` = `date` · `createdAt` = `timestamptz`
· `closedAt` = `timestamptz`. **אין עמודת `exitDate` ואין `updatedAt`** — מה שמאשר
את FIN-019 מכיוון בלתי-צפוי: `a.exitDate` שהאודיט סימן כ"לעולם לא נכתב" הוא לא רק
לא-נכתב, הוא **לא קיים כעמודה**. `exitDate` שורד רק כשם *עמודת קלט בייבוא*
(`src/import/synonyms.js:13`), שמתועל אל `closedAt`.

| שדה | מסלול | קובץ:שורה | ביטוי | פורמט |
|---|---|---|---|---|
| `date` | ידני | `SwingEdge_App.jsx:2168` | `new Date().toISOString().slice(0,10)` | `YYYY-MM-DD` (**UTC** ⚠️) |
| `date` | ייבוא | `normalizeRow.js:118` | `parseDate(cell("date"), fmt) \|\| today` | `YYYY-MM-DD` |
| `date` | עריכה | `EditTradeModal.jsx:84` | מועבר כמות שהוא | `YYYY-MM-DD` |
| `createdAt` | ידני | `SwingEdge_App.jsx:2169` | `new Date().toISOString()` | ISO מלא |
| `createdAt` | ייבוא | `normalizeRow.js:132` | `` new Date(`${date}T14:30:00`).toISOString() `` | ISO, 14:30 |
| `closedAt` | סגירה מהירה | `SwingEdge_App.jsx:2202` | `new Date().toISOString()` | ISO מלא |
| `closedAt` | ייבוא (שורה עם exit) | `normalizeRow.js:123` | `` new Date(`${exitDateParsed \|\| date}T20:00:00`).toISOString() `` | ISO, 20:00 |
| `closedAt` | ייבוא FIFO | `fifoMatch.js:63` | `sell.closedAt \|\| closeStampFor(sell.date)` | ISO, 20:00 |
| `closedAt` | עריכה | `EditTradeModal.jsx:102` → `tradeCloseState.js` | `exitDay` → 20:00 · אחרת `prev?.closedAt ?? now` · `exit=null` → **`null`** | ISO / `null` |

**תאריכי xlsx (סעיף ציד #1):** `parseDate` (`normalizeRow.js:25-48`) מטפל בשלושת
הפורמטים — serial של Excel (`(serial-25569)*86400000`), `Date` object, ומחרוזת
מקומית עם `/`. מתכנס תמיד ל-`YYYY-MM-DD`. **אין כאן דליפת פורמט.**

**הפער האמיתי במפה:** `localDayKey` (`src/utils.js:9`) — ההלפר שנבנה בדיוק כדי
למנוע את באג ה-UTC — מיובא ב-**2 קבצים בלבד** (`TradeCalendar.jsx`,
`EditTradeModal.jsx`). כל שאר צרכני התאריכים משתמשים ב-`new Date(...)` גולמי או
ב-`toISOString().slice(0,10)`. `TradeCalendar.jsx:18` הוא **הצרכן היחיד שכבר
עושה את הדבר הנכון**: `localDayKey(t.closedAt || t.date || …)`. הוא התקדים
שהתוכנית הזו מכלילה.

### 1.5 סטטוס 8 הממצאים — כולם עדיין חיים

אף אחד לא נסגר ב-T3/T5. מספרי השורות עודכנו ל-HEAD `f375478`.

| ממצא | חומרה | מיקום **היום** | סטטוס | הערה |
|---|---|---|---|---|
| FIN-019 | 🔴 | `SwingEdge_App.jsx:316-317` (`generateEquityCurve`) | **פתוח** | `.sort((a,b) => new Date(a.date) - new Date(b.date))`. `\|\| a.exitDate` כבר הוסר, אבל המיון עדיין לפי **כניסה**. גם `data.push({date: t.date})` — הנקודה עצמה ממוקמת ביום הכניסה |
| FIN-020 | 🔴 | `src/lib/tradingStats.js:78-82` | **פתוח** | הועבר מ-`useTradingStats.js:42-45` ב-T2. אותו מיון לפי `a.date` → **Max Drawdown על רצף בסדר שגוי** |
| FIN-021 | 🔴 | `MonthlyReport.js:34-36` | **פתוח** | `realizedDate(t) { return parseDate(t.date); }` — הפולבק ל-`exitDate` הוסר, נותרה הכניסה בלבד |
| FIN-016 | 🔴 | `WeeklyReviewTab.jsx:51` | **פתוח** | `tr.date \|\| tr.createdAt` — חלון 7 הימים לפי כניסה |
| FIN-018 | 🔴 | `WeeklyReviewTab.jsx:109` | **פתוח** | `wStats.total` = `closed.length` (`tradingStats.js:169`) בעוד `weekly` כולל פתוחות → "אין פעילות" בשבוע פעיל |
| FIN-022 | 🟠 | `SwingEdge_App.jsx:1959-1960` | **פתוח** | `toISOString().slice(0,10)` + `t.date === today` |
| FIN-023 | 🟠 | `SwingEdge_App.jsx:326-327` | **פתוח** | עוגן העקומה ב-UTC |
| FIN-024 | 🟠 | `AntiEdgeLock.js:25-35` | **פתוח חלקית** | `isoWeekKey` **כבר** מעדיף `closedAt \|\| createdAt \|\| date` ✅. הפגם שנותר הוא רק חשבון השבוע: `jan4.getDay()` אינו ISO-8601 |

### 1.6 גודל ההשפעה בפועל — כמה מספרים באמת יזוזו

```sql
with c as (select date, "closedAt"::date cd from public.trades where status='CLOSED')
select count(*) closed_total,
       count(*) filter (where cd <> date) close_day_differs,
       count(*) filter (where date_trunc('month',cd) <> date_trunc('month',date)) crosses_month,
       count(*) filter (where cd - date > 6) crosses_week,
       max(cd - date) max_hold_days from c;
```

| מדד | ערך | מכנה | פירוש |
|---|---|---|---|
| יום סגירה ≠ יום כניסה | **23** | 26 סגורות | 23/26 מהנקודות בעקומת ההון יושבות היום ביום הלא-נכון |
| חוצה גבול **שבוע** | **13** | 26 סגורות | 13/26 — הסקירה השבועית משייכת מחצית מהעסקאות לשבוע הלא-נכון (FIN-016) |
| חוצה גבול **חודש** | **2** | 26 סגורות | 2/26 בדוח החודשי (FIN-021) |
| החזקה מקסימלית | 42 יום | — | הפער אינו תיאורטי |

**זה לא באג רדום.** 23/26 = 88% מהעסקאות הסגורות בפרודקשן מושפעות מ-FIN-019/020.

---

## 2. מה נשמר ומה משתנה

| נשמר ללא שינוי | משתנה |
|---|---|
| **כל 40 השורות ב-DB — אפס `UPDATE`, אפס `DELETE`, אפס מיגרציה** | סדר הנקודות בעקומת ההון |
| כל ערכי `date` / `createdAt` / `closedAt` | היום שאליו נקודה משויכת |
| סה"כ P&L, win rate, avgR, expectancy, מספר עסקאות | Max Drawdown (נגזר מרצף) |
| אילו עסקאות סגורות ואילו פתוחות | שיוך חודשי של 2/26 · שבועי של 13/26 |
| 14 הפוזיציות הפתוחות — כולל `closedAt:null` | P&L יומי (היום המקומי במקום UTC) |

### ⚠️ התראה מוקדמת (כלל ההכרעה #4) — מספרים שהמשתמש רואה **יזוזו**

**Max Drawdown הוא המספר שישתנה בצורה הבולטת ביותר.** הוא מחושב על רצף
כרונולוגי; היום הרצף ממוין לפי כניסה, כלומר ה-drawdown הנוכחי מחושב על סדר שאינו
מתאר את מהלך התיק. אחרי התיקון הוא יתאר אותו — אבל הערך המוצג ישתנה, וייתכן
שיגדל. **זה תיקון, לא רגרסיה — אבל משתמש שמסתכל על המסך יראה מספר אחר.**

**מסלול חזרה:** `git revert` של קומיט הקוד. מכיוון שאפס נתונים משתנים, החזרה
מלאה ומיידית ואינה דורשת גיבוי.

---

## 3. הביצוע המוצע

### 3.1 מקור-אמת-אחד ל"מתי ה-P&L מומש" (§13 — מקור-אמת-אחד)

שני הלפרים ב-`src/utils.js`, ליד `localDayKey`:

```js
// The instant a trade's P&L was realized. Open trades have no realized instant.
export const realizedAt = (t) => {
  const raw = t?.closedAt || t?.date;
  const ms = raw ? new Date(raw).getTime() : NaN;
  return Number.isNaN(ms) ? null : ms;
};

// The LOCAL calendar day a trade's P&L belongs to.
export const realizedDayKey = (t) => localDayKey(t?.closedAt || t?.date);
```

שניים ולא אחד, במכוון: מיון דורש חותמת מדויקת (יציבות בתוך יום), ואילו קיבוץ
לדליים דורש יום **מקומי**. הלפר אחד היה מכריח אחד משני השימושים להתפשר.

`t.closedAt || t.date` — לא `createdAt` — כי `TradeCalendar.jsx:18` כבר קובע את
הסדר הזה, ו`date` הוא NOT NULL בפועל (0/40 ריקים).

### 3.2 החלת ההלפרים

| # | ממצא | קובץ | שינוי |
|---|---|---|---|
| 1 | FIN-019 | `SwingEdge_App.jsx:316` | מיון ← `realizedAt(a) - realizedAt(b)`; `data.push({ date: realizedDayKey(t) })` |
| 2 | FIN-023 | `SwingEdge_App.jsx:326-327` | עוגן ← `localDayKey` על `Date` מקומי, בלי `toISOString` |
| 3 | FIN-020 | `src/lib/tradingStats.js:78-82` | אותו מיון. **⚠️ ראה §4 — כאן זזה ה-baseline הקפואה** |
| 4 | FIN-021 | `MonthlyReport.js:35` | `realizedDate` ← `t.closedAt \|\| t.date` |
| 5 | FIN-022 | `SwingEdge_App.jsx:1959-1960` | `localDayKey(new Date())` + סינון `realizedDayKey(t) === today` |
| 6 | FIN-016 | `WeeklyReviewTab.jsx:51` | חלון ← `realizedAt(tr)`; פוזיציות פתוחות נשארות בהצגה, נספרות לפי אותה אוכלוסייה כמו §7 |
| 7 | FIN-018 | `WeeklyReviewTab.jsx:109` | `empty` ← `weekly.length === 0` (אותה אוכלוסייה שממנה נגזר המסך), לא `wStats.total` |
| 8 | FIN-024 | `AntiEdgeLock.js:31-34` | ISO-8601 week תקני (חמישי של אותו שבוע), במקום `jan4.getDay()` |

**ההערה ב-`WeeklyReviewTab.jsx:46-47`** ("Same predicate the engine's lastWeekStats
uses") הופכת לשקרית ברגע ששינינו את הפרדיקט. יש לאמת מה `lastWeekStats` עושה
ולסנכרן, או לתקן את ההערה — **הערה שקרית היא כשל שקט לפי §2.**

### 3.3 מה **לא** בתוכנית

- ❌ אין מיגרציה, אין `UPDATE`, אין `.sql`.
- ❌ אין נגיעה ב-`date` הידני (`SwingEdge_App.jsx:2168`, UTC) — הוא באג נפרד
  (יצירה, לא קריאה), נכנס ל-⚠️ ב-`STATE.md` ולא מתוקן כאן. תיקון "בדרך" הוא §11.
- ❌ אין נגיעה ב-`psychologyPatterns.js:61` / `MonthlyReport.js:222,304` — ל-2 האחרונים
  `e.date` הוא **Date object פנימי**, לא שדה עסקה. נבדק, אינו אותו באג.

---

## 4. ⚠️ ה-baseline הקפואה תזוז — וזה השער הקריטי

`scripts/fixtures/tradingstats-baseline.json` נוצר ב-T2 כ**שער חוסם**.
שינוי #3 (§3.2) משנה סדר מיון → `maxDrawdown` / `equityCurve` בפיקסצ'ר **יזוזו**.

**הכלל: ערך שזז ב-baseline קפואה = STOP, לא עדכון הציפייה.**

לכן הנוהל, ובסדר הזה:
1. להריץ `test:tradingstats` **לפני** כל שינוי ולשמור את הפלט.
2. לבצע את שינוי המיון.
3. להריץ שוב, ולהפיק **טבלת characterization לפני/אחרי לכל ערך שזז** — עם
   הסבר פר-ערך למה התזוזה היא הביטוי הישיר של המיון המתוקן.
4. **רק אחרי שניב אישר את הטבלה** מתעדכן קובץ ה-baseline, בקומיט נפרד
   שכותרתו אומרת שהוא מעדכן baseline ולמה.

אם ערך זז ולא ניתן להסביר אותו מהמיון — עוצרים. זה לא "הבדיקה צריכה עדכון".

**`test:coach` (111) חייב להישאר 111 = 111.** `AntiEdgeLock` הוא בתוך
`src/intelligence/` → הרצה לפני **וגם** אחרי, לפי §7.

---

## 5. אימות

1. `npm run verify` מלא — הפלט המלא מודבק בדיווח (§7), לא סיכום.
   - `test:coach` 111 ללא תזוזה · `test:import` 28 תרחישים ללא תזוזה
   - `test:tradingstats` — ראה §4
2. **בדיקות חובה מהאודיט §קבוצה 4:**
   - עסקה שנפתחה בינואר ונסגרה ביוני יושבת **ביוני** בעקומה, ב-drawdown ובדוח החודשי
   - grep-test: אין `toISOString()` באף מסלול תאריך-**יום** (המסלולים שנותרו
     מותרים — שמות קבצי CSV — יסומנו מפורשות)
   - P&L יומי בטיים-זון ישראל ב-01:00 מקומי מחזיר את **היום המקומי**
   - הסקירה השבועית והדשבורד מדווחים P&L זהה לאותו טווח
   - נעילות `AntiEdgeLock` פגות אחרי המשך המוגדר
3. **בדיקת דפדפן** (נוגעים ב-equity ובלוח השנה) — רתמה כמו ב-T5: עקומת הון עם
   עסקה חוצת-חודש, ואימות שהנקודה זזה ליום הסגירה.

---

## 6. ניתוח השלכות (§8)

פילטר רמה 1: משנה DB? **לא.** כסף/מיילים? **לא.** סוד חדש? **לא.** רץ אוטומטית
בפרודקשן? **לא.** בלתי הפיך? **לא.** → חמש "לא", אין טבלת רמה 2.

החריג היחיד שאינו בפילטר ומחייב אזכור הוא כלל ההכרעה #4 של הבריף — מספרים
נראים-למשתמש זזים — והוא מכוסה ב-§2.

---

## 7. סעיף ציד — סיכום

1. **פורמטים מעורבים בין מסלולים:** נבדק. `parseDate` מכסה serial/Date/string
   ומתכנס ל-`YYYY-MM-DD`. **אין דליפה.** הפער האמיתי הוא ש-`localDayKey` מיושם
   ב-2/N צרכנים בלבד (§1.4).
2. **מה המשתמש רואה מ-14 השורות:** כלום — הן פוזיציות פתוחות תקינות (§1.3).
3. **תאריכים חריגים בכל המערכת:** 0 מתוך 40 (§1.1).
4. **🆕 ממצא שלא היה בבריף:** 36 עסקאות הדמו נעלמו; סה"כ 114 → 40.
5. **🆕 ממצא שלא היה בבריף:** `date` בהזנה ידנית נכתב ב-UTC
   (`SwingEdge_App.jsx:2168`) — אותה משפחת באג, במסלול **כתיבה**. לא בתוכנית; ⚠️ ב-`STATE.md`.

---

## 8. הכרעה

✅ **בצע** — אחרי אישור, ובכפוף לשער ה-baseline ב-§4.
