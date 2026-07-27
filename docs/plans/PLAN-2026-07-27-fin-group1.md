# PLAN — FIN קבוצה 1: שלמות שרשרת הנתונים

**תאריך:** 2026-07-27 · **ממצאים:** FIN-039 · FIN-040 · FIN-041
**מקור:** `docs/audits/AUDIT-2026-07-27-financial-integrity.md` §5 קבוצה 1
**סטטוס:** awaiting approval
**בסיס:** `d5e90c8`

---

## Context — למה זה ראשון

קבוצה 1 היא **היחידה מבין השבע שמשחיתה נתונים באופן פעיל**. כל שאר הקבוצות מציגות
מספר שגוי מנתון נכון; כאן הנתון עצמו נהרס בדיסק, ואי אפשר לשחזר אותו בדיעבד.

כל תיקון סטטיסטי בקבוצות 2–7 ייבדק מול נתונים מזוהמים כל עוד זו פתוחה.

---

## אבחון שדה — נתונים מאומתים

שאילתות read-only מול `zicstkfkwhzvmdkzpidm` ב-2026-07-27. **המספרים כאן גוברים על
כל מספר קודם** (הערכות מוקדמות של 204/168 היו שגויות — הבדיקה שהפיקה אותן הייתה פגומה).

| מדד | ערך |
|---|---|
| סה"כ שורות ב-`public.trades` | **285** |
| `is_demo = false` | **249** · 10 משתמשים |
| `is_demo = true` | **36** · משתמש **אחד** · נוצרו 2026-05-12..15 |
| `is_demo IS NULL` | 0 |
| `status='OPEN'` | 185 — כולן `exit` null, `closedAt` null ✅ |
| `status='CLOSED'` | 100 — **לכולן `exit`** ✅ |
| **`status='CLOSED' AND exit IS NULL`** | **0** |
| `status='CLOSED' AND closedAt IS NULL` | 14 (כולן `is_demo=false`) |
| ערכי `status` בפועל | `OPEN` / `CLOSED` בלבד — אפס בלוויאנית |

### שתי מסקנות שמעצבות את כל התוכנית

**1. אין backfill. בכלל.**
FIN-041 — אפס הפרות בפרודקשן. FIN-039 — 36 שורות הדמו עדיין `true`, טרם הושחתו.
שני התיקונים **מניעתיים במלואם**. ראה §"למה אין backfill" למטה.

**2. הסימנים כבר נמחקו — ולכן שחזור בלתי אפשרי.**
מבין 285 השורות, **אפס** נושאות `SIM-` ב-ticker או `Hive-` ב-setup. לא בדמו ולא באמיתיות.
זה מוכיח את מנגנון ההשחתה (§FIN-039) וגם שולל כל אפשרות לזהות שורת דמו שכבר התהפכה.

---

## ניתוח השלכות (CLAUDE.md §8) — הפילטר נתפס פעמיים

**משנה DB?** ✅ כן — משנה מה נכתב לעמודות `is_demo` / `closedAt` / `status`.
**בלתי הפיך?** ✅ כן — כתיבה שגויה ל-`is_demo` הורסת מידע שאין לו מקור אחר.
(לא נוגע בכסף/מיילים · לא מוסיף סוד · לא רץ אוטומטית — פועל בזמן פעולת משתמש.)

| ציר | הערכה |
|-----|--------|
| **משתמשים** | 🔴 **משתמש אחד מושפע דרמטית.** כל 36 שורות הדמו שלו הן `CLOSED`, ובסך הכול יש לו 76 עסקאות — **כולן** סגורות. אחרי הפריסה, 36/76 = **47% מהעסקאות הסגורות שלו ייעלמו מהסטטיסטיקה** (מסוננות ב-`realTrades`). win rate, P&L, עקומת ההון, כל מסך — משתנים. זו ההתנהגות **הנכונה**, אבל מבחינתו זה שינוי פתאומי ובלתי מוסבר. **דורש הודעה יזומה למשתמש.** 9 המשתמשים האחרים: אפס שינוי. |
| **נתונים** | הפיך במלואו. אין מיגרציה, אין DDL, אין UPDATE. הקוד משנה רק מה שנכתב **מכאן והלאה**. חזרה = revert לקומיט. **בין הפריסה לבין כלום — אין חלון סיכון**, כי אין backfill שצריך לרדוף אחרי הפריסה. משתמש שטוען את היומן בכל רגע נתון מקבל מצב עקבי: לפני הפריסה — כפי שהוא היום; אחרי — עם `isDemo` מכובד. אין מצב ביניים. |
| **עלות** | אפס. אין שאילתות נוספות, אין קריאות רשת, אין אחסון. `select("*")` כבר מחזיר `is_demo` היום — פשוט נזרק. |
| **תקרות ספק** | לא רלוונטי. אפס קריאות API חדשות. |
| **אבטחה** | אפס סודות חדשים. אפס שינוי RLS. `tradeFromSupabase` אינו חושף שדה שלא הוחזר ממילא ל-client. |
| **תחזוקה (§3)** | ✅ **מקטין עבודה ידנית.** היום ניב מתשאל את ה-DB ידנית כדי לדעת אילו עסקאות הן דמו. אחרי — הדגל נאמן, ו-`test:datachain` שומר עליו אוטומטית בכל push. |
| **הפיכות** | `git revert` בודד. אין state חיצוני לשחזר. זמן חזרה: דקות. |
| **כשל שקט** | 🔴 **זה בדיוק מה שנכשל היום.** `tradeForSupabase` זורק מפתחות לא-מוכרים בשקט מוחלט — ככה `exitDate` נעלם. התוכנית מוסיפה `console.error` על כל מפתח נזרק (§4) + בדיקה אוטומטית. אחרי התיקון, הכשל הזה צועק. |

**פסק דין: ⚠️ בצע עם הגנה.**
ההגנות: (א) אפס כתיבה ל-DB · (ב) `test:datachain` ב-`verify` לפני כל push ·
(ג) הודעה יזומה למשתמש המושפע לפני הפריסה · (ד) `test:coach` לפני **וגם** אחרי, כי
התוכנית נוגעת ב-`src/intelligence/` וב-`src/utils.js` (CLAUDE.md §7).

---

## 1 · FIN-039 — `is_demo` נכתב ולא נקרא 🔴

### מנגנון ההשחתה המלא

```
supabase.select("*")   →  { is_demo: true, ... }   בלי isDemo        [App:1242]
        ↓
cleanTrades()          →  isDemo: t.isDemo || isSim || isHive || false   [App:158]
                          t.isDemo === undefined  ⇒  מזריק false מפורש
        ↓
כל שמירה עתידית        →  tradeForSupabase  →  Boolean(undefined) = false
                       →  UPDATE ... is_demo = false        ⟵ השחתה קבועה
```

אין `tradeFromSupabase` בריפו. הכתיבה נכתבה, הקריאה לא — אסימטריה מלאה.

**ו-`cleanTrades` היא גם משמידת-הראיות:** שורות 149–150 מפשיטות `SIM-` מה-ticker
וממפות `Hive-*` דרך `SETUP_MAP`. הערך ה"נקי" נשמר חזרה. לכן ההיוריסטיקה בשורה 158
לא יכולה להציל אף שורה בסיבוב השני — **היא מחקה בעצמה את מה שהיא מחפשת.**
זה מסביר במדויק למה ל-36 שורות הדמו אין שום סימן. ההיוריסטיקה אינה רשת ביטחון; היא
עבדה בדיוק פעם אחת, ואז השמידה את הקלט שלה.

### התיקון — סימטריה מלאה (עיקרון #1)

**`src/supabaseClient.js` — פונקציה אחות, לצד `tradeForSupabase`:**

```js
export function tradeFromSupabase(row) {
  if (!row || typeof row !== "object") return row;
  const { is_demo, ...rest } = row;
  // undefined = העמודה לא הוחזרה = "לא ידוע". לא false.
  return is_demo === undefined ? rest : { ...rest, isDemo: is_demo === true };
}
```

**`tradeForSupabase` — הפסקת ייצור ה-`false` המפוברק (עיקרון #2):**

```js
if (k === "isDemo") {
  if (v !== undefined) out.is_demo = v === true;   // undefined ⇒ לא כותבים את העמודה
  continue;
}
```

השמטת העמודה מ-`UPDATE` **משמרת את הערך הקיים ב-DB**. זו ההגנה האמיתית על 36 השורות:
גם אם משהו במעלה הזרם יאבד את הדגל, השמירה לא תדרוס אותו.

**`cleanTrades` — הפסקת ההזרקה (הצד השני של עיקרון #2):**

```js
// לפני:  isDemo: t.isDemo || isSimTicker || isHiveSetup || false
// אחרי:
isDemo: (t.isDemo === true || isSimTicker || isHiveSetup) ? true : t.isDemo,
```

כל סימן חיובי ⇒ `true`. אחרת — **מעבירים הלאה כפי שהוא** (`false` / `undefined`).
לעולם לא ממציאים ערך.

**נקודת החיבור:** `tradeFromSupabase` מוחל על גבול ה-DB בלבד — `App:1260` (טעינה)
ו-`App:2322` (mentee). **לא** על מסלול ה-localStorage (`App:1045`, `App:1253`), שם
הנתון כבר camelCase.

### שמונה צרכני `isDemo` — לא שניים

`App:1625` `realTrades` · `App:1645` `menteeRealTrades` · `App:1724` `filteredTrades`
(שלושת אלה מזינים את **כל** שכבת הסטטיסטיקה) · `App:3839` תג DEMO ·
`MobileTradeCard:68` · `psychologyPatterns:62` · `normalizeRow:139` (כותב `false` בייבוא — תקין).

⚠️ **מסלול נפרד שאסור לגעת בו:** `AdminPanel:911,953,956,1045` ו-`App:2286-2291`
קוראים `row.is_demo` ב-snake_case ישירות מ-RPC/`select` ואינם עוברים ב-`cleanTrades`.
`tradeFromSupabase` **לא** מוחל עליהם.

---

## 2 · FIN-040 — `exitDate` נזרק בשקט 🔴 (חמור מכפי שנרשם באודיט)

**העמודה `exitDate` אינה קיימת ב-DB** (אושר מול `information_schema`) ואינה ב-`TRADE_COLUMNS`.

האודיט תיאר זאת כנפילת fallback. **זה יותר מזה: זהו איבוד קלט משתמש בשקט.**
`EditTradeModal.jsx:171-177` מציג שדה `<input type="date">` פעיל בשם "תאריך יציאה".
המשתמש מקליד תאריך → `handleSave` כותב `updated.exitDate` (:84) → `tradeForSupabase`
זורק אותו ללא זכר → `initForm:420` קורא `trade.exitDate` שלעולם אינו חוזר →
**השדה ריק בפתיחה הבאה, בלי שום הודעה.** המשתמש מזין נתון, האפליקציה מאשרת שמירה,
והנתון לא קיים. מסווג מחדש כ-🔴.

### התיקון — חיווט ל-`closedAt` (הכרעה מאושרת: אופציה 2)

`closedAt` (`timestamptz`) הוא העמודה האמיתית, נכתב בזרימת הסגירה (`App:2057`)
ובייבוא (`normalizeRow:106-109`, שכבר מקפל `exitDate` → `closedAt` נכון).
הוספת עמודה חדשה הייתה יוצרת **שני מקורות אמת לאותה עובדה** — הדפוס שהאודיט כולו מתאר.

- `initForm` — `exitDay: localDayKey(trade.closedAt) || ""` במקום `exitDate: trade.exitDate || ""`
- `handleSave` — מוחקים את שורה 84 לחלוטין; התאריך זורם ל-`closedAt` דרך `deriveCloseState` (§3)
- מוסכמת השעה: `` `${day}T20:00:00` `` — **זהה ל-`normalizeRow:108`**, לא ממציאים שנייה

### ניקוי 8 קוראי `t.exitDate`

`App:215` · `App:219` · `App:222` · `App:4876` · `MonthlyReport.js:35` ·
`GrowthPredictor.jsx:243` · `TradeCalendar.jsx:17` · `utils.js:22`

כולם נופלים **תמיד** ל-fallback היום (הערך לעולם אינו קיים) — ההסרה היא **no-op התנהגותי מוכח**.

⚠️ **גבול חד:** מסירים את `exitDate` בלבד. **לא** מחליפים ב-`closedAt` — זה FIN-019/020/021,
קבוצה 4. לכן `MonthlyReport:35` הופך ל-`parseDate(t.date)`. זה **נראה** כמו נסיגה אך זהה
בהתנהגות לקוד של היום; קבוצה 4 תחליף ל-`closedAt` ותתקן את הבאג האמיתי.

⚠️ **מה שנשאר ואסור למחוק:** `src/import/synonyms.js:13,21` ו-`i18n.js` `imp_field_exitDate`
הם **מיפוי כותרות CSV של המשתמש** בייבוא. `normalizeRow` מקפל אותם ל-`closedAt` כראוי.
אלה לא שאריות — הם התכונה.

**עדכון הערות שיהפכו לשקריות:** `utils.js:16-19` · `TradeCalendar.jsx:14` · `MonthlyReport.js:5`.

---

## 3 · FIN-041 — `status` ו-`exit` נפרדים 🔴

`EditTradeModal.jsx:94` — `status: exitN != null ? "CLOSED" : form.status`
`EditTradeModal.jsx:101` — `closedAt: exitN != null ? (trade.closedAt || now) : trade.closedAt`

`initForm:429` טוען `status: trade.status` = `"CLOSED"`. לכן ניקוי שדה ה-exit:
`status` נשאר `"CLOSED"` ו-`closedAt` נשמר → עסקה `CLOSED` בלי `exit`.
שתי השורות נכשלות באותו כיוון. זו הזרימה **היחידה** שמייצרת את המצב; `handleCloseSubmit`
(`App:2051`) עקבי.

### התיקון — פונקציה טהורה אחת (מכסה גם 40 וגם 41)

**`src/lib/tradeCloseState.js`** (חדש):

```js
export function deriveCloseState({ exit, exitDay, prev }) {
  if (exit == null) return { status: "OPEN", closedAt: null };
  const closedAt = exitDay
    ? new Date(`${exitDay}T20:00:00`).toISOString()
    : (prev?.closedAt ?? new Date().toISOString());
  return { status: "CLOSED", closedAt };
}
```

`status` נגזר מנוכחות `exit` — **המצב הבלתי-עקבי הופך לבלתי-ניתן-לביטוי**, לא רק לא-רצוי.
ה-JSX קורא לפונקציה; **הקומפוננטה לא מחולצת.**

---

## 4 · כשל רועש על עמודה לא-מוכרת (עיקרון #3)

`tradeForSupabase` זורק כל מפתח שאינו ב-`TRADE_COLUMNS` **בשקט מוחלט** — זה המנגנון
שבלע את `exitDate` במשך חודשים. התיקון:

```js
const LOCAL_ONLY = new Set(["tradeImage", "tradeImagePreview", "_prediction", "isDemo"]);
// ...בסוף הלולאה, על כל מפתח שנזרק ואינו ב-LOCAL_ONLY:
console.error("[tradeForSupabase] dropped unknown column(s):", dropped.join(", "), trade.id);
```

מפתח מוכר-מקומי → שקט. מפתח **לא** מוכר → `console.error` עם השם המדויק ו-`id` העסקה,
ו-`test:datachain` נכשל. הרכב המדויק של `LOCAL_ONLY` ייגזר בביצוע מצורת אובייקט העסקה
בפועל, ויאומת בבדיקה. **לא מיושם בלי אישור זה** — מוצע כאן, כנדרש.

---

## 5 · חילוץ ללוגיקה טהורה (הכרעה מאושרת)

`cleanTrades` יושבת בתוך `SwingEdge_App.jsx` (6,700 שורות) ו-`EditTradeModal.jsx` הוא JSX.
`node` לא יכול לייבא אף אחד — **שתי הבדיקות הקריטיות אינן ניתנות לכתיבה במצב הנוכחי.**
(אומת: `src/data/tradeOptions.jsx` נכשל ב-`Unknown file extension ".jsx"`;
`src/supabaseClient.js` ו-`src/utils.js` נטענים תקין.)

| חדש | תוכן |
|---|---|
| `src/lib/cleanTrades.js` | `cleanTrades` + `purgeInvalidTrades`, טהור, בלי JSX |
| `src/lib/tradeCloseState.js` | `deriveCloseState` |

**חילוץ לוגיקה, לא קומפוננטות.** `SwingEdge_App.jsx` מייבא במקום להגדיר; `EditTradeModal.jsx`
קורא ל-`deriveCloseState`. אפס שינוי בהתנהגות, אפס שינוי בערכי מחרוזות.

⚠️ **תלות שדורשת טיפול:** `cleanTrades` צורכת `EMOTION_VALUES` מ-`tradeOptions.jsx` —
קובץ JSX שאינו ניתן לייבוא ב-node. הפתרון: `src/data/tradeEnums.js` (טהור) יחזיק את
`SETUP_OPTIONS`/`MARKET_OPTIONS`/`EMOTION_OPTIONS`, ו-`tradeOptions.jsx` **ייצא אותם מחדש**
בדיוק באותם שמות. אפס שינוי ב-`value` (CLAUDE.md §13 — מחרוזות load-bearing), אפס שינוי
בייבוא אצל צרכנים קיימים.

---

## 6 · בדיקות — `scripts/dataChain-test.mjs`

Pure node, בסגנון `userSettings-test.mjs`. נוסף ל-`verify` **לפני** `build`:

```
"test:datachain": "node scripts/dataChain-test.mjs",
"verify": "npm run test:coach && npm run test:import && npm run test:settings && npm run test:datachain && npm run build"
```

| # | בדיקה | מגן על |
|---|---|---|
| 1 | round-trip `isDemo:true` → `is_demo:true` → `isDemo:true` | FIN-039 |
| 2 | round-trip `isDemo:false` משתמר כ-`false` | FIN-039 |
| 3 | `isDemo:undefined` ⇒ המפתח `is_demo` **נעדר** מה-payload | עיקרון #2 |
| 4 | **`cleanTrades` על שורת Supabase `is_demo:true`, ticker `AAPL`, setup `Breakout` → `isDemo` נשאר `true`** | **36 השורות** |
| 5 | `cleanTrades` אינו ממציא `false` על `isDemo:undefined` | עיקרון #2 |
| 6 | מפתח שאינו ב-`TRADE_COLUMNS` ואינו local-only ⇒ `console.error` נקרא | עיקרון #3 |
| 7 | `deriveCloseState({exit:null})` → `{status:"OPEN", closedAt:null}` | FIN-041 |
| 8 | `deriveCloseState` עם `exitDay` → `closedAt` באותו יום, `T20:00:00` | FIN-040 |
| 9 | `deriveCloseState` בלי `exitDay` + `prev.closedAt` → נשמר, לא נדרס | FIN-040 |
| 10 | אינווריאנט: מערך fixture דרך `cleanTrades`+`deriveCloseState` ⇒ אפס `CLOSED && exit==null` | FIN-041 |

בדיקה 4 היא הליבה — היא נכשלת על הקוד של היום ועוברת אחרי התיקון.

---

## 7 · למה אין backfill

**מאומת: `status='CLOSED' AND exit IS NULL` = 0.** אין מה לתקן ב-FIN-041.
**36 שורות הדמו עדיין `true`.** אין מה לשחזר ב-FIN-039 — יש למנוע.

ו-backfill של `is_demo` הוא **בלתי אפשרי עקרונית, לא רק לא-נחוץ**: מבין 249 שורות ה-`false`,
אפס נושאות `SIM-`/`Hive-`. אין שום סימן שמבדיל שורת דמו שכבר התהפכה משורה אמיתית.
כל UPDATE יהיה ניחוש שמשחית 249 שורות תקינות כדי אולי לתקן כמה. **הצעת ה-SQL היא: אין.**

**שער לפני הפריסה** — להריץ שוב, read-only, ולוודא שעדיין 0:

```sql
select count(*) filter (where status='CLOSED' and exit is null) as closed_no_exit,
       count(*) filter (where is_demo)                          as demo_true
from public.trades;
-- ציפייה: closed_no_exit = 0 · demo_true = 36
```

`closed_no_exit > 0` בזמן הפריסה ⇒ **עצור ודווח.** מישהו ייצר הפרה בין התכנון לפריסה,
וזה משנה את התמונה.

---

## 8 · תיעוד הסכימה

אין `create table public.trades` באף אחת מ-13 המיגרציות. הרצתי introspection —
**25 עמודות, תואמות ל-`TRADE_COLUMNS` אחת לאחת, בדיוק.** הסט מדויק להיום.

**מוצע:** `supabase/migrations/20260727HHMMSS_document_trades_schema.sql` —
`create table if not exists public.trades (...)` מה-introspection + `comment on table`
המסביר שזו מיגרציה תיעודית. מול פרודקשן זהו **no-op מוכח** (הטבלה קיימת);
ערכה בהקמת סביבה חדשה מאפס. לפי CLAUDE.md §12 — **Claude כותב את ה-`.sql` בלבד; ניב מריץ.**

### שלוש מגבלות אודיט שה-introspection סוגר

- `entryQuality` הוא **`text`** — והקוד כותב לשם מספר (`entryQuality: 3`). סחיפת
  מחרוזת-מול-מספר **אושרה**, לא רק הוסקה.
- `maxFavorable` · `maxAdverse` · `_capitalAtEntry` — **`numeric`**. ההסקה על סחיפה **הופרכה**.
- `status` — `default 'open'::text` **בלוויאנית**, בעוד הקוד משווה `"OPEN"`.

---

## 9 · לתעד ולא לתקן — ל-`docs/STATE.md` כ-⚠️

1. **14 עסקאות `CLOSED` עם `closedAt IS NULL`** (כולן `is_demo=false`). עוברות את
   אינווריאנט FIN-041 אך שקופות לכל מסלול מבוסס-`closedAt` → קבוצה 4.
2. **`entryQuality` כ-`text` עם כתיבת מספר** → קבוצה 2/7.
3. **`default 'open'` בלוויאנית.** אפס שורות כאלה היום, אך כל `insert` עתידי בלי `status`
   מפורש ייצור שורה שאף השוואה בקוד לא תתפוס. מלכודת רדומה.

---

## 10 · סדר ביצוע

| # | צעד | הערה |
|---|---|---|
| 0 | `npm run test:coach` — **לפני** | בסיס להשוואה, CLAUDE.md §7 |
| 1 | `src/data/tradeEnums.js` + re-export מ-`tradeOptions.jsx` | אפס שינוי ערכים |
| 2 | `src/lib/cleanTrades.js` — חילוץ + תיקון שורה 158 | |
| 3 | `src/lib/tradeCloseState.js` — `deriveCloseState` | |
| 4 | `supabaseClient.js` — `tradeFromSupabase` · תיקון `isDemo` בכתיבה · כשל רועש | |
| 5 | `SwingEdge_App.jsx` — ייבוא + `tradeFromSupabase` ב-1260/2322 | |
| 6 | `EditTradeModal.jsx` — `deriveCloseState`, הסרת `exitDate` | |
| 7 | ניקוי 8 קוראי `exitDate` + 3 הערות שקריות | no-op מוכח |
| 8 | `scripts/dataChain-test.mjs` + `verify` | |
| 9 | ניקוי `AUDIT-...md` שורות 289-290 (`</content>`, `</invoke>`) | פסולת עריכה |
| 10 | `docs/STATE.md` — 3 פריטי ⚠️ (§9) | **באותו קומיט** (§10) |
| 11 | מיגרציה תיעודית `.sql` — נכתבת, **לא מורצת** | §12 |
| 12 | `npm run verify` — **הפלט המלא בדיווח** | §7 |
| 13 | שער pre-deploy (§7) → push | |
| 14 | הודעה למשתמש המושפע לפני שהוא רואה −47% | |

---

## 11 · חזרה אחורה

`git revert` בודד. אין DDL, אין UPDATE, אין state חיצוני. זמן חזרה: דקות.
הסימן לצורך: אותו משתמש מדווח שעסקאות נעלמו **מעבר ל-36** הצפויות.

---

## 12 · מחוץ להיקף — לא ייגע

- שכבת החישוב: `useTradingStats` · `statisticalModels` · `utils.js` `calcTradeMetrics` (קבוצות 2–3)
- החלפת `exitDate` ב-`closedAt` בקוראים (קבוצה 4)
- כל ממצא שאינו FIN-039/040/041 (CLAUDE.md §11)
- כל כתיבה ל-Supabase
