# PLAN — M · פערי מטבע (T9/T10 follow-up)

## Context

T9 הוסיף `currency` ל-`public.trades`; T10 פיצל `capitalCurrency` (מה שהמספר
*אומר*) מ-`accountCurrency` (מה שהמסך *מציג*). שני הגלים סגרו את הליבה אבל
השאירו שוליים שבהם המטבע עדיין נאבד או מומצא. המשימה סוגרת אותם — **תצוגה,
טופס וייצוא בלבד. אפס כתיבה ל-DB על נתונים קיימים.**

---

## ⚠️ שלוש הנחות בפרומפט שהקוד הפריך

לפני הכל — שלוש מההנחות בפרומפט לא מתקיימות. ניב אישר את שלוש ההפרכות.

| # | ההנחה | מה הקוד אומר |
|---|-------|---------------|
| §1 | "TRADE_COLUMNS אינו כולל currency" | **כן כולל** — `src/supabaseClient.js:57`, נוסף ב-T9. זהו שער-הכתיבה ל-Supabase, **לא** רשימת עמודות הייצוא. הפער אמיתי אבל יושב בשני מקומות אחרים (ראה §1). |
| §2 | "עסקה ידנית נשמרת תמיד USD" | **לא נכון** — `SwingEdge_App.jsx:2383` כבר כותב `currency: capitalCurrency`, עם הערת 8 שורות שמסבירה למה בורר פר-עסקה מסוכן. §2 הפך לנעילת חוזה. |
| §5 | "אחרי 02:00 מקבל את תאריך **המחר**" | **הכיוון הפוך.** הסחיפה אחורה — לאתמול. חלון: 00:00–02:59 מקומי בקיץ (IDT, UTC+3), 00:00–01:59 בחורף (IST, UTC+2). |

**הוכחה ל-§5** (`TZ=Asia/Jerusalem`, הורץ על `main`):

```
local 2026-08-04 00:30:00  ->  toISOString key 2026-08-03
local 2026-08-04 02:59:00  ->  toISOString key 2026-08-03
local 2026-08-04 03:30:00  ->  toISOString key 2026-08-04
local 2026-01-15 00:30:00  ->  toISOString key 2026-01-14
```

---

## §6 (חדש) — ✅ השער נסגר · רדיוס הנזק אפס

**ניב הריץ ב-04.08.2026:**

```
select currency, count(*) from public.trades group by currency;
→ USD | 56        (56/56 = 100% מהשורות בטבלה)
→ אפס שורות ILS
```

**הבאג אמיתי אך מעולם לא נורה** — אף משתמש עוד לא ייבא קובץ גנרי בזמן תצוגה
שקלית. שאילתה ב' מיותרת (אין ILS לסנן) ולא תורץ. **היקף הגל אינו משתנה.**
§6 יורד משער-חוסם לתיקון מונע רגיל.

⚠️ **ל-STATE.md:** "נמדד 04.08.2026 — 0/56 שורות ILS" — כדי שהאפס ייקרא
כמדידה שבוצעה ולא כ"לא נבדק".

### הבאג עצמו (התיקון עומד בעינו)

**`SwingEdge_App.jsx:7200` מעביר את מטבע ה-תצוגה כברירת המחדל של הייבוא.**

```
SwingEdge_App.jsx:7200   accountCurrency={accountCurrency}
ImportJournalModal.jsx:17  ...({ accountCurrency = "USD", ... })
ImportJournalModal.jsx:66  defaultCurrency: accountCurrency
normalizeRow.js:109        currency = unit?.currency || opts.defaultCurrency || "USD"
```

קובץ CSV גנרי (בלי פרופיל ברוקר) שמיובא בזמן שהיומן מוצג בשקלים מקבל
`currency: "ILS"` על **כל** שורה — גם אם המחירים דולריים. זה נכתב ל-Supabase.
אחר כך `fmtPrice` מדפיס ₪ ו-`useFxRates` ממיר **שוב** — עיוות כפול.

**זו התקלה החמורה מכל השש: היחידה שמשחיתה בכתיבה ולא רק בתצוגה.**
זו בדיוק מחלקת הכשל שההערה ב-`SwingEdge_App.jsx:2379` מזהירה ממנה — על נתיב הייבוא.

### התיקון

`SwingEdge_App.jsx:7200` → `capitalCurrency={capitalCurrency}`, ושם הפרופ
במודל משתנה `accountCurrency` → `capitalCurrency` (`ImportJournalModal.jsx:17,66`).
הפרופ משמש **אך ורק** ל-`defaultCurrency` — אין צרכן שני, ולכן השינוי נקי.

⛔ אפס תיקון נתונים קיימים. ממילא אין מה לתקן.

---

## §1 — round-trip של המטבע בייצוא/ייבוא

הפער דו-צדדי, ובשני מקומות שאינם TRADE_COLUMNS:

| צד | מיקום | הבעיה |
|----|--------|--------|
| ייצוא | `SwingEdge_App.jsx:384` — מערך `headers` ב-`exportTradesCSV` | 22 עמודות, אין Currency |
| ייבוא | `src/import/synonyms.js:6-21` — `FIELD_SYNONYMS` + `MAPPABLE_FIELDS` | אין ערך `currency`, ולכן `detectColumns.js:91` **זורק** כל כותרת "מטבע"/"Currency" |

כלומר: גם אילו הייצוא היה כותב את העמודה — הייבוא לא היה קורא אותה. שני התיקונים
חייבים לנחות יחד, אחרת ה-round-trip נשאר שבור.

### שינויים

1. **`src/import/synonyms.js`**
   - `FIELD_SYNONYMS.currency = ["currency","ccy","מטבע","סוג מטבע","מטבע עסקה"]`
   - `MAPPABLE_FIELDS` += `"currency"` · **לא** ל-`REQUIRED_FIELDS`
   - העברת `CURRENCY_SIGNS` מ-`brokerProfiles.js:135` לכאן, וחשיפת
     `normalizeCurrency(raw)` — אח תאום מדויק ל-`normalizeSide` שכבר יושב בקובץ.
     `brokerProfiles.js` מייבא במקום להגדיר.

2. **`src/import/normalizeRow.js:109`** — סדר קדימויות חדש:
   ```
   unitResolver.currency  >  normalizeCurrency(cell("currency"))  >  opts.defaultCurrency
   ```
   - תא ריק → נופל הלאה (לא דחייה)
   - תא **לא ריק ולא מזוהה** → `{ ok:false, code:"bad_currency" }`. אין USD שקט.
     `REASONS.bad_currency` כבר קיים (שורות 73-81) — אין מחרוזת חדשה.
   - ⚠️ **`|| "USD"` הסופי נשאר כפי שהוא, במודע.** הוא החוזה הקיים, והוא תואם
     ל-`default 'USD'` של המיגרציה. הכלל "מטבע חסר = UNMEASURED" אוסר להמציא
     ברירת מחדל **חדשה** — ואני לא מוסיף כזו, רק שכבה מעליה.
     **אבל 56/56 USD מוכיח שאיש עוד לא נגע בנתיב הזה — כלומר הוא לא מוכח.**
     לכן ברירת המחדל עוברת מהערה לבדיקה:
     ```js
     // קובץ גנרי, בלי עמודת מטבע, בלי defaultCurrency → USD במודע ולא בהיסח דעת
     const t = normalizeRow(row, mapping, {});   // ⚠️ בלי defaultCurrency בכוונה
     check("no currency column and no default → USD, deliberately", t.trade.currency, "USD");
     ```
     האסרציה מתעדת את ברירת המחדל כהחלטה. מי שימחק אותה בעתיד ייתקל בבדיקה
     אדומה ויצטרך להחליט במודע, במקום לגלות זאת דרך עסקה שקלית שהודפסה בדולרים.

3. **`ImportJournalModal`** — נדרש `imp_field_currency` (he+en) באותו מילון שבו
   יושב `imp_field_ticker`; בלעדיו התווית בתפריט (`:291`) תרנדר ריקה.

4. **`SwingEdge_App.jsx:384`** — `"Currency"` **בסוף** המערך + `currencyOf(t)` בסוף השורה.
   בסוף ולא באמצע: הייבוא מתאים לפי **שם כותרת** ולא לפי מיקום, ולכן הוספה
   בסוף אינה מזיזה שום צרכן קיים.

### מיפוי צרכנים

| שדה | צרכנים | השפעה |
|------|---------|--------|
| `MAPPABLE_FIELDS` | `ImportJournalModal.jsx:289` (תפריט מיפוי) · `detectColumns.js:91` (מסנן זיהוי-אוטומטי) | שניהם מרוויחים. אין צרכן שלישי. |
| `FIELD_SYNONYMS` | פנימי ל-`synonyms.js` (`SYNONYM_TO_FIELD`, `FALLBACK_CANDIDATES`) | ⚠️ `"currency"` (8 תווים) ו-`"מטבע"` (4) עוברים את רצפת ה-3 של טוקן בודד, ולכן נכנסים ל-fallback. בדקתי התנגשות: `"שער"` כבר שייך ל-`entry` ואינו מכיל "מטבע" — אין גזילה. |
| `exportTradesCSV` | כפתור הייצוא ביומן בלבד | — |
| **ייצוא PDF** (`exportMonthlyPDF`, `SwingEdge_App.jsx:419`) | **עצמאי לחלוטין** — רשימת עמודות משלו, ו**כבר מודע-מטבע** דרך פרמטר `currency` + `CURRENCY_SYMBOL` | ⛔ **לא נוגעים.** |
| `TRADE_COLUMNS` (`supabaseClient.js:30`) | `tradeForSupabase` בלבד | ⛔ **לא נוגעים** — כבר מכיל `currency`. |

### מה נשמר / מה משתנה

| נשמר | משתנה |
|------|--------|
| 22 העמודות הקיימות, בסדרן | נוספת עמודה 23 `Currency` בסוף |
| ייצוא PDF | ללא שינוי |
| קבצי ברוקר (IBI / Altshuler) | ללא שינוי — `unitResolver` עדיין גובר |
| קובץ גנרי בלי עמודת מטבע | ללא שינוי — נופל ל-`defaultCurrency` |
| — | קובץ גנרי **עם** עמודת מטבע: נקרא מהעמודה במקום להיזרק |
| — | ערך מטבע לא מזוהה: השורה נדחית במקום להיטבע USD |

---

## §2 — נעילת חוזה, אפס שינוי קוד

הטופס כבר נכון (`SwingEdge_App.jsx:2383`). לא נוגעים בו — ההערה שמעליו מנמקת
שבורר פר-עסקה הופך את `riskPct` ליחס בין שתי יחידות שונות.

**האסרציה נועלת את החוזה עצמו** (טכניקה קיימת: `rContract-test.mjs:138-141`
כבר סורק את `SwingEdge_App.jsx` כטקסט):

```js
const app = readFileSync(new URL("../SwingEdge_App.jsx", import.meta.url), "utf8");
const i = app.indexOf("const newTrade = {");
const block = app.slice(i, i + 1400);
check("manual trade inherits capitalCurrency", /currency:\s*capitalCurrency/.test(block), true);
check("manual trade never hardcodes a currency literal", /currency:\s*["']/.test(block), false);
```

**איזה refactor נכשל:**
- `currency: "USD"` (או `"ILS"`) → נכשל בשנייה
- `currency: accountCurrency` — בדיוק מחלקת הכשל של §6 → נכשל בראשונה
- מחיקת השדה → נכשל בראשונה

שתיהן ב-`npm run verify`, כלומר חוסמות push.

---

## §3 — אונבורדינג כופה דולרים

`OnboardingScreen.jsx:359-375` — אייקון `DollarSign` קשיח והמלל
"הזן את סכום ההון בדולרים ($)". חמור מזה: **האונבורדינג אינו נוגע ב-`capitalCurrency`
בכלל** — `handleOnboardingComplete` (`SwingEdge_App.jsx:1044-1060`) מגדיר רק
`capital` ו-`riskPct`.

### שינויים

1. בשלב הסכום — בורר USD/ILS **בשכפול מדויק של הבורר הקיים** ב-Settings
   (`SwingEdge_App.jsx:6268-6283`). נשמר ב-`answers.capitalCurrency`.
2. האייקון והמלל נגזרים מהבחירה: `CURRENCY_SYMBOL[ccy]`, "הזן את סכום ההון ב-₪".
3. `generateProfile` (`OnboardingScreen.jsx:76-81`) — `fmtCapital` משתמש ב-`$${...}` קשיח → `CURRENCY_SYMBOL[ccy]`.
4. `handleOnboardingComplete` — `setCapitalCurrency(...)` + `localStorage.setItem("swingEdgeCapitalCurrency", ...)`.
   סנכרון ההגדרות (`SwingEdge_App.jsx:1614`) **כבר** כולל `capitalCurrency` → זולג ל-`user_settings` לבד. אין קוד סנכרון חדש.
5. ברירת מחדל USD — לא המצאה, אלא הסטטוס-קוו שהופך גלוי.

⚠️ **מגבלה מתועדת:** ספי הדליים ב-`generateProfile` (`< 5000` → small) מכוילים
לדולר. ₪10,000 ≈ $2,700 ייכנס ל-medium בעודו חשבון קטן. תיקון נכון דורש FX
במסך הראשון, לפני התחברות — תלות רשת על המסך הכי רגיש במוצר. מקבלים את הקירוב.

**⚠️ שורה ב-STATE אינה מספיקה** — העורך הבא יראה את הספים, לא את STATE. הערה
נכנסת **בקוד, צמוד לספים**, בדפוס `MonthlyReport.js:92` (הערה שמנמקת מה יישבר
ולמה, במקום שבו עלולים לשבור אותו):

```js
// ⚠️ הספים מכוילים לדולר, והמטבע נבחר עכשיו במסך הזה — כלומר ₪10,000
// (≈ $2,700) נופל ל-"medium" בעודו חשבון קטן, ומקבל riskPct של חשבון גדול.
// המרה ל-USD היא התיקון הנכון, אבל היא דורשת קריאת FX על המסך הראשון,
// לפני התחברות — תלות רשת על המסך הרגיש ביותר במוצר. הקירוב מקובל במודע.
// מי שמוסיף כאן מטבע שלישי חייב להכריע בזה קודם. STATE ⚠️ · PLAN 2026-08-05.
const bucket = ...
```

**צרכנים:** `answers` → `userProfile` (spread ב-`:1048`) → blob `swingEdgeOnboarding`
→ סנכרון ב-`:1626`. הוספת מפתח ל-`answers` היא אדיטיבית; `generateProfile`
עושה destructure למפתחות ידועים בלבד. בטוח.

---

## §4 — AdminPanel:929 · הכרעה ונימוק

### הממצא

`admin_trades_agg()` (`supabase/migrations/20260719120000_admin_rpcs.sql:241-251`)
מחשב `avg(pnl)` על **כל** העסקאות הסגורות — **בלי `group by currency`**.
`admin_trades_list` מחזיר metadata בלבד (אין `currency`, אין `pnl`).
**ולכן הלקוח לא יכול לפלח את המספר בשום דרך.** `$${agg.avg_pnl}` שבשורה 929
מטביע סמן דולר על ממוצע שמערבב ₪ ו-$.

### ההכרעה: "—" + הערה · אפס מיגרציה

פילוח פר-מטבע דורש `create or replace function` — כלומר מיגרציה, שנאסרה
מפורשות בגל הזה. אין דרך שלישית: או שהמספר מפולח, או שהוא חסר משמעות.
מספר חסר משמעות לא מוצג.

```jsx
<KpiCard label="Avg P&L" value="—" sub="צבר מעורב USD+ILS" accent="violet" />
```

`KpiCard` (`AdminPanel.jsx:111`) **כבר תומך ב-`sub`** — אין קומפוננטה חדשה.

### כדי שהכרטיס לא ימות — כרטיס חמישי

`admin_trades_agg` כבר מחזיר `pct_with_stop` ו-`pct_with_setup`, **ואף אחד
מהם אינו מרונדר היום**. שניהם חסרי-מטבע במהותם ומודדים משמעת מסחר.

### ⚠️ ממצא — `pct_with_stop` **כן** נופל למחלקת A5. אושר בקוד.

`supabase/migrations/20260719120000_admin_rpcs.sql:267`:

```sql
'pct_with_stop', case when _total > 0 then round(100.0 * _with_stop / _total, 1) else 0 end,
```

**ה-`else 0` הוא הבאג.** מכנה ריק מחזיר `0`, לא `null`. כלומר טבלה ריקה
מרנדרת **"0% עם סטופ"** — משפט שקורא כ"אף אחד לא שם סטופים" בעוד האמת היא
"אין עסקאות בכלל". זו בדיוק המדידה שמודדת את גודל האוכלוסייה ולא התנהגות
(CLAUDE.md §2). אותו פגם ב-`pct_with_setup` (שורה 268).

תיקון ב-RPC דורש מיגרציה → אסור בגל הזה. **לכן הלקוח מגן:**

```jsx
<KpiCard
  label="% with stop"
  // ⚠️ ה-RPC מחזיר 0 על מכנה ריק, לא null (admin_rpcs.sql:267 `else 0`).
  // בלי המשמר הזה טבלה ריקה מציגה "0% עם סטופ" — קריאה הפוכה מהאמת.
  // ⏭️ STATE: שה-RPC יחזיר null על מכנה ריק ויחזיר ספירות גולמיות.
  value={!agg?.total ? "—" : `${agg.pct_with_stop}%`}
  sub={!agg?.total ? "אין עסקאות" : `מתוך ${agg.total} עסקאות`}
  accent="slate"
/>
```

הרשת `grid-cols-2 md:grid-cols-4` (`:970`) → `md:grid-cols-5`.

⚠️ **מכנה בלי מונה:** ה-RPC מחזיר את האחוז בלבד, לא את `_with_stop` הגולמי.
שחזור המונה מאחוז מעוגל הוא דיוק מזויף — לכן ה-`sub` נושא את **המכנה** ואומר
זאת. ⏭️ ב-STATE: שה-RPC יחזיר ספירות גולמיות.

⏭️ **ב-STATE.md:** RPC פר-מטבע (`avg_pnl_by_ccy`) כמשימה עתידית — לא כאן.
📌 **ב-DECISIONS.md:** צבר חוצה-משתמשים לא מוצג כמספר כל עוד אין לו ממד מטבע.

### מה נשמר / מה משתנה

| נשמר | משתנה |
|------|--------|
| ה-RPC — אפס מיגרציה, אפס שינוי SQL | הכרטיס "Avg P&L" מציג `—` + "צבר מעורב USD+ILS" |
| Total · Win rate · Top ticker | נוסף כרטיס "% with stop" מנתונים שכבר מגיעים |
| חוזה הפרטיות של `admin_trades_list` | הרשת: 4 → 5 עמודות ב-md |

---

## §5 — תאריך מקומי בהזנה ידנית

`SwingEdge_App.jsx:2374` · `date: new Date().toISOString().slice(0, 10)`
→ עסקה שנוצרת בין חצות ל-02:59 מקבלת את **תאריך אתמול**.

### תיקון — שימוש חוזר, לא קוד חדש

`src/utils.js:9-14` כבר מחזיק את `localDayKey`, ובהערה שלו כתוב במפורש שהוא
קיים כדי להימנע מ-`toISOString`. מוסיפים לידו אח חסר-ארגומנטים:

```js
export const todayKey = () => format(new Date(), "yyyy-MM-dd");
```

שלושה אתרי קריאה:

| מיקום | היום | אחרי | נימוק |
|--------|-------|-------|--------|
| `SwingEdge_App.jsx:2374` | `new Date().toISOString().slice(0,10)` | `todayKey()` | **הבאג** |
| `src/import/normalizeRow.js:91` | `opts.todayISO \|\| new Date()...` | `opts.todayISO \|\| todayKey()` | אותו באג בדיוק, על נתיב הייבוא — נפילת-אחור כששורה חסרת תאריך |
| `SwingEdge_App.jsx:405` | שם הקובץ המיוצא | `todayKey()` | שורה אחת, אפס סיכון |

### ⛔ מה במפורש לא נוגעים

- **`createdAt: new Date().toISOString()`** (`:2375`) — זו **חותמת רגע**, ו-UTC נכון עבורה.
- **`src/lib/fx.js:110,192`** — מפתחות UTC **בכוונה**: קיבועי ECB מתוארכים ב-UTC. שינוי כאן ישבור את התאמת השערים.
- **עסקאות קיימות** — ⛔ אפס backfill. תיקון קדימה בלבד.
- `AdminPanel.jsx:601,1014,1018` — שמות קבצי CSV אדמיניים, עדיין UTC. מחוץ להיקף → שורה ⚠️ ב-STATE.

### הבדיקה שנצפית נכשלת על הקוד הישן

מריצים בתת-תהליך עם `TZ=Asia/Jerusalem`, כדי ש-TZ של תהליך-האב ושאר אסרציות
התאריך ב-`import-test.mjs` לא יושפעו:

```js
import { execFileSync } from "node:child_process";
const run = (code) => execFileSync(
  process.execPath, ["--input-type=module", "-e", code],
  { env: { ...process.env, TZ: "Asia/Jerusalem" }, encoding: "utf8" }
).trim();

// מקפיאים את "עכשיו" על 2026-08-03T21:30:00Z == 2026-08-04 00:30 מקומי
const FROZEN = `
  const R = Date, FIXED = new R("2026-08-03T21:30:00Z").getTime();
  globalThis.Date = class extends R {
    constructor(...a) { super(...(a.length ? a : [FIXED])); }
    static now() { return FIXED; }
  };`;

check("todayKey() returns the LOCAL day",
  run(`${FROZEN} const {todayKey} = await import("${utilsURL}"); console.log(todayKey());`),
  "2026-08-04");

check("the old expression is what produced yesterday's date",
  run(`${FROZEN} console.log(new Date().toISOString().slice(0,10));`),
  "2026-08-03");
```

האסרציה השנייה היא **עד הרגרסיה**: היא מקבעת את ההתנהגות הישנה כשגויה ומתעדת
את הפער המדויק. הכשל לפני התיקון כבר הודגם בפועל — פלט ההרצה על `main` מובא
בראש המסמך.

---

## פיצול קומיטים — הצעה ונימוק

ארבעה קומיטים, בדחיפה אחת. הקריטריון: **רדיוס נזק שונה = יכולת גלגול-אחור נפרדת.**

| # | קומיט | למה נפרד |
|---|--------|-----------|
| 1 | `fix(date): §5 — todayKey מקומי בהזנה הידנית ובנפילת-האחור של הייבוא` | **ראשון בכוונה.** נוגע ב-`src/utils.js` — מודול משותף — ו-§6 יושב על נתיב הייבוא שקורא תאריכים. אם §5 מכניס רגרסיה, היא מתגלה **לפני** שהיא מתערבבת עם §6. |
| 2 | `fix(import): §6 — ברירת המחדל של הייבוא היא מטבע ההון, לא מטבע התצוגה` | היחיד שמשחית **בכתיבה**. שורה אחת. הפיך לבדו, בלי לגרור כלום. |
| 3 | `feat(currency): §1+§3 — round-trip של המטבע ובורר מטבע באונבורדינג` | היחיד שהוא **יכולת פונה-משתמש** → גורר `docs/TRUTH.md` באותו קומיט (CLAUDE.md §10.4). |
| 4 | `fix(admin): §4 — צבר מעורב אינו מוצג כמספר` | אדמין בלבד, אפס השפעה על משתמשים. |

§2 אינו קומיט — אין בו קוד; האסרציה שלו נוסעת עם קומיט 3.
`docs/STATE.md` נכנס לקומיט האחרון לפני ה-push (CLAUDE.md §10).

---

## קבצים קריטיים

```
SwingEdge_App.jsx                 384, 405, 2374, 7200   §1 §5 §6
src/import/synonyms.js            6-21                    §1
src/import/normalizeRow.js        91, 109                 §1 §5
src/import/brokerProfiles.js      135                     §1 (CURRENCY_SIGNS עובר)
src/components/ImportJournalModal.jsx  17, 66             §6
src/components/OnboardingScreen.jsx    76-81, 359-375     §3
src/components/AdminPanel.jsx     929, 970                §4
src/utils.js                      9-14                    §5 (todayKey לצד localDayKey)
scripts/import-test.mjs           —                       אסרציות §1 §2 §3 §4 §5 §6
docs/{STATE,TRUTH,DECISIONS}.md   —                       §10
```

⛔ **לא נוגעים:** `src/supabaseClient.js` · `src/lib/fx.js` · `exportMonthlyPDF` · `supabase/migrations/`

---

## אימות

1. ✅ שער §6 נסגר — נמדד 04.08.2026: 56/56 USD, 0 שורות ILS. **לא מריצים שוב.**
2. `npm run verify` — **הפלט המלא מודבק**, לא סיכום (CLAUDE.md §7).
   `test:import` הוא השרשרת הרלוונטית; `test:fx` חייב לעבור כי `synonyms.js` נוגע בנתיב המטבע.
3. ידני ב-preview:
   - ייבוא CSV גנרי עם עמודת "מטבע" (₪/$) → כל שורה נושאת את מטבע התא
   - ייבוא עם ערך זבל בעמודה → השורה נדחית עם "לא ניתן לקבוע את מטבע השורה", **לא** USD שקט
   - ייצוא CSV → עמודת `Currency` אחרונה; ייבוא חוזר של אותו קובץ משמר מטבע (**סגירת ה-round-trip**)
   - אונבורדינג ב-₪ → Settings מציג ILS; עסקה ידנית חדשה נושאת ILS
   - AdminPanel → "Avg P&L: —" עם "צבר מעורב USD+ILS", וכרטיס "% with stop" חי
4. `docs/STATE.md` באותו קומיט. אפס force. דיווח = hash + פלט push שמכיל `..HEAD -> main`.

---

## פריטים ל-STATE.md (CLAUDE.md §10.1 — אין פריט יתום)

- ⏭️ RPC פר-מטבע ל-`admin_trades_agg` (`avg_pnl_by_ccy`) + החזרת ספירות גולמיות במקום אחוזים בלבד
- ⏭️ `admin_rpcs.sql:267-268` — `pct_with_stop`/`pct_with_setup` מחזירים `0` על מכנה ריק במקום `null`. הלקוח מגן; המקור עדיין שגוי
- ⚠️ ספי הדליים ב-`generateProfile` מכוילים לדולר; חשבון שקלי מסווג דלי אחד גבוה מדי (הערה גם בקוד, ליד הספים)
- ⚠️ שמות קבצי ה-CSV ב-AdminPanel (601, 1014, 1018) עדיין מתוארכים ב-UTC
- ✅ §6 — **נמדד 04.08.2026: 0/56 שורות ILS.** הבאג היה אמיתי ומעולם לא נורה. האפס הוא מדידה שבוצעה, לא "לא נבדק"
