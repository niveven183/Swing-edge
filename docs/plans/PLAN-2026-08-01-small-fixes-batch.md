# PLAN — מקבץ תיקונים קטנים (7 סגירות)

**תאריך:** 2026-08-01
**סטטוס:** awaiting approval
**Safety gate:** `git pull --ff-only origin main` → `Already up to date` · `git status` → נקי

---

## 0. אימות הנחות — חמש סטיות מול הפרומפט

לפני התוכנית עצמה. כל סטייה אומתה מול הקוד, לא מול הזיכרון.

### 0.1 🔴 `avgMaeMfe` אין לה ולו צרכן אחד בריפו

```
$ grep -rn 'avgMaeMfe' . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist
src/intelligence/utils/psychologyPatterns.js:114:export const avgMaeMfe = (trades) => {
```

**1/1 המופעים הוא ההגדרה עצמה. אפס import, אפס קריאה.**

זה מפריך את מה שכתוב היום ב-`docs/STATE.md:457`:
> "לא נצפה במסך ישירות, **אבל מזין לקחים שכן נצפים**"

הוא אינו מזין דבר. ההשלכה: **פריט 1ב אינו תיקון באג פעיל — הוא פירוק מוקש
לפני שמישהו יחווט אותו.** עדיין שווה לתקן (הפונקציה מיוצאת, והחיווט הבא יירש
את המכנה השגוי בשקט), אבל אסור לדווח עליו כתיקון להתנהגות שמשתמש רואה היום.
`STATE.md:457` יתוקן באותו commit.

### 0.2 🟡 `psychologyPatterns.js:117` אינו `?? 0` על R

`STATE.md:457` מתאר אותו כ-"`?? 0` על R בתוך השוואת דפוסים רגשיים".
בפועל (שורות 115–118):

```js
const closed = getClosed(trades).filter(t => t.maxAdverse != null || t.maxFavorable != null);
const mae = closed.map(t => Math.abs(Number(t.maxAdverse) || 0));
const mfe = closed.map(t => Math.abs(Number(t.maxFavorable) || 0));
```

זה `Number(...) || 0` על **MAE/MFE**, לא על R. תיאור הפרומפט מדויק; תיאור
`STATE.md` שגוי. משפחת הבאג זהה (ברירת מחדל שמחליפה נתון אמיתי), הערך המספרי
לא. `STATE.md` יתוקן.

### 0.3 🟡 `api/send-invites.js` — ה-env בשורה 134 הוא הזניח מבין השלושה

הפרומפט מצביע על `~133`. המדויק הוא **134**:

```js
const webhook = process.env.SENTINEL_DISCORD_WEBHOOK;
if (!webhook) return;                 // ← היציאה השקטה
```

אבל בסריקת אותו קובץ (סעיף ציד):

| env | שורה | מצב |
|---|---|---|
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | 175 | ✅ **יש** שער רועש — `res.status(500).json({error:"config_error"})` |
| `SENTINEL_DISCORD_WEBHOOK` | 134 | 🔴 יציאה שקטה — **פריט 4** |
| `MAIL_USERNAME` / `MAIL_PASSWORD` | 235–240 | 🔴 **אפס שער.** חסר → `nodemailer` נבנה עם `auth:{user:undefined}` וכל מייל נכשל אחד-אחד בלולאה |

הפער ב-`MAIL_*` חמור יותר מזה שהתבקש: הוא בנתיב המיילים עצמו, וכשלונו מתחזה
ל-"כל הנמענים נכשלו" במקום ל-"הפונקציה לא מוגדרת". **אינו בהיקף שביקשת** —
מוצע כתת-פריט 4ב להחלטתך, ברירת מחדל: לא לבצע.

### 0.4 🟡 `LandingPage.jsx` מכיל שתי שפות, לא חמש

`const STR = { he: {...}, en: {...} }` (שורות 13/103). פריט 3ב נוגע ב-he+en בלבד.
פריטים 1א/2/5/6 נוגעים ב-5 השפות ב-`src/i18n.js`.

### 0.5 🟢 `test:coach` — 111 נכון, `CLAUDE.md §7` מיושן

```
$ npm run test:coach
✅ coach-invariance: 111 assertions passed across 5 scenarios × 7 profiles × 2 histories.
```

הפרומפט (111) צודק. `CLAUDE.md §7` כותב "110 assertions" ומתאר את `verify`
כ-`test:coach → test:import → test:settings → build`, בעוד `package.json:18`
מריץ **שישה** מבחנים (`+ test:datachain + test:rcontract + test:tradingstats`).
תיקון תיעודי, נכלל בפריט 7.

---

## 1. ניתוח השלכות (§8)

**רמה 1 — הפילטר תפס:** "נוגע במיילים" (פריט 4) · "רץ אוטומטית בפרודקשן"
(פריט 4 + `fleet-daily.yml` בפריט 3ג). לכן טבלה מלאה.

| ציר | הערכה |
|---|---|
| משתמשים | 1א/2/5/6 = כל משתמש מחובר. 3א = מחזיקי קריפטו בלבד. 3ב = מבקרי לנדינג. 3ג/4/7 = ניב בלבד |
| נתונים | **אפס כתיבה ל-DB. אפס מיגרציה.** אין שינוי בסכימת העסקה. 6 משנה *מתי* ערכי OCR נכנסים לטופס — לא מה נשמר |
| עלות | 0₪. אין קריאת רשת חדשה, אין job חדש. 3א **מוריד** קריאות (לא משנה `getRefreshInterval` — הוא נגזר מ-`marketState` הגלובלי, `App:1508`) |
| תקרות ספק | ללא נגיעה. פריט 4 מוסיף `console.error` בלבד — אפס מיילים נוספים |
| אבטחה | אין סוד חדש, אין הדפסת סוד. פריט 4 מדפיס **שם** משתנה, לא ערך |
| תחזוקה (§3) | 6 מוסיף צעד ידני אחד (אישור) ומסיר תיקון ידני של שדה שגוי — **נטו חיובי** לפי עדות 31.07. 1א/5 מסירים "למה המספר הזה מוזר?" |
| הפיכות | הכל ב-commit אחד ניתן ל-`git revert`. אין מצב מתמשך |
| כשל שקט | פריט 4 **מסיר** אחד. 1א/1ב/5 מסירים שקר שקט. 6 הופך מילוי שקט לגלוי |

**פסק דין:** ✅ בצע לפריטים 1–3, 5–7 · ⚠️ פריט 4 עם הגנה (רק `console.error`,
בלי לגעת בנתיב השליחה) · ⛔ **4ב לא מבוצע** ללא אישור נפרד.

---

## 2. הביצוע — פריט אחר פריט

### פריט 1א — מסנן R ביומן · `SwingEdge_App.jsx:1638-1657`

**היום** (`:1654-1655`):
```js
if (f.rMin !== "" && rMultiple < parseFloat(f.rMin)) return false;
if (f.rMax !== "" && rMultiple > parseFloat(f.rMax)) return false;
```
`rMultiple === null` → `null < 1` הוא `true` → העסקה נעלמת. `null > -1` הוא
`true` → נשארת. **הנראות נקבעת במקרה, בלי סימן על המסך.**

**אחרי — החלטת ניב הנעולה:** עסקה בלתי-מדידה **אינה משתתפת בהשוואת טווח**.
מסנן R לא פעיל → הכל גלוי. מסנן פעיל → מוחרגת, ונספרת בגלוי.

```js
const { filteredTrades, rHiddenCount } = useMemo(() => {
  const f = journalFilters;
  const rActive = f.rMin !== "" || f.rMax !== "";
  let hidden = 0;
  const list = trades.filter(tr => {
    /* …כל המסננים שאינם R, ללא שינוי… */
    const { pnl, rMultiple } = calcTradeMetrics(tr);
    /* …מסנן result, ללא שינוי… */
    if (rActive) {
      // בלתי-מדידה: מוחרגת מהשוואת הטווח, לעולם לא נכפית ל-0
      if (!Number.isFinite(rMultiple)) { hidden++; return false; }
      if (f.rMin !== "" && rMultiple < parseFloat(f.rMin)) return false;
      if (f.rMax !== "" && rMultiple > parseFloat(f.rMax)) return false;
    }
    return true;
  });
  return { filteredTrades: list, rHiddenCount: hidden };
}, [trades, journalFilters]);
```

`Number.isFinite` ולא `!= null` — הוא דוחה גם `NaN` וגם `null`, והוא כבר
הקונבנציה של `rValues` (`statisticalModels.js:55`).

**התצוגה:** מתחת לשדות rMin/rMax (`:3650-3659`), מוצג רק כש-`rHiddenCount > 0`:
```jsx
{rHiddenCount > 0 && (
  <div className="col-span-2 md:col-span-4 lg:col-span-7 text-[10px] text-amber-400/90">
    {plural(t, "rFilterHidden", rHiddenCount)}
  </div>
)}
```

מפתח i18n חדש `rFilterHidden` (+`_one`, +`_two` לערבית) ב-5 השפות.

### פריט 1ב — `src/intelligence/utils/psychologyPatterns.js:113-124`

המכנה היום הוא `mae.length` — אורך המערך, שהוא אורך **`closed`**, כי כל עסקה
מקבלת ערך גם כשאין לה. עסקה עם MFE ובלי MAE נספרת כ-MAE של 0 ומדללת את הממוצע.

```js
// null/""/לא-מספר → null. חובה לחסום null לפני Number(): Number(null)===0
// ו-isFinite(0) הוא true — בדיוק המוקש המתועד ב-DECISIONS על profitFactor.
const numOrNull = (v) => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export const avgMaeMfe = (trades) => {
  const closed = getClosed(trades);
  const mae = closed.map(t => numOrNull(t.maxAdverse)).filter(v => v != null).map(Math.abs);
  const mfe = closed.map(t => numOrNull(t.maxFavorable)).filter(v => v != null).map(Math.abs);
  const avg = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
  return {
    avgMae: avg(mae), maeN: mae.length,   // מונה ומכנה נעים יחד
    avgMfe: avg(mfe), mfeN: mfe.length,
    n: closed.length,
  };
};
```

**שינוי חוזה:** `avgMae`/`avgMfe` מחזירים `null` במקום `0` כשאין מה למדוד —
"אין מדידה" אינו "מדדנו אפס". בטוח לחלוטין כי אין צרכן (§0.1). מוסיף
`maeN`/`mfeN` כדי שכל צרכן עתידי יקבל מכנה בלי לחשב אותו לבד.
`export` של `numOrNull` — לא. נשאר מקומי עד שיהיה צרכן שני.

### פריט 2 — ריבוי · `src/i18n.js`

היום: `t.riskUnmeasured.replace("{n}", 1)` → "ל-**1 עסקאות** פתוחות אין סטופ".

עוזר מקומי ב-`i18n.js`, לא ספרייה:
```js
// ריבוי מינימלי: מפתח בסיס + סיומות _one/_two אופציונליות.
// _two קיים בשביל ערבית (מספר זוגי) — שאר השפות פשוט לא מגדירות אותו.
export function plural(t, key, n) {
  const form = (n === 1 && t[`${key}_one`]) || (n === 2 && t[`${key}_two`]) || t[key] || "";
  return form.replace("{n}", n);
}
```

`riskUnmeasured_one` בחמש השפות; `riskUnmeasured` (הבסיס) נשאר לרבים.
`App:3393` עובר ל-`plural(t, "riskUnmeasured", unmeasuredRiskCount)`.

⚠️ **מגבלה מוצהרת:** ערבית מבחינה גם בין 3–10 ל-11+. העוזר לא. הצורה הבסיסית
נוסחה שתתאים ל-3–10; ב-11+ היא תקינה תחבירית-חלקית. תיעוד — לא העמדת פנים.
שורת ⚠️ ב-`STATE.md`.

### פריט 3א — תג CLOSED על קריפטו · `src/priceService.js:153`

**המקור אותר.** `parseChartResult` קובע:
```js
const state = getMarketState();   // ← שעות מסחר US, לכל סימבול ללא הבחנה
```
`getMarketState()` מחזיר `CLOSED` בשבת/ראשון ובלילה (`:44-51`). BTC-USD נסחר
24/7 — ולכן ב-3 לפנות בוקר הבורסה "סגורה" בזמן שהמחיר זז. הצרכנים:
`App:3979-3981` (Analyzer) ו-`App:6154-6156` (טופס הוספה), שניהם מציגים
`marketOpen ? "LIVE" : "LAST CLOSE"`.

```js
// קריפטו נסחר 24/7 — שעות ה-US אינן חלות עליו. הסימבול מגיע כאן אחרי
// toYahooSymbol, כלומר BTC → BTC-USD.
const isCryptoSymbol = (s) => /-USD$/.test(String(s || "").toUpperCase());
const state = isCryptoSymbol(yahooSymbol) ? MARKET_STATE.OPEN : getMarketState();
```

**מלכודת `parseChartResult` (CLAUDE.md §13) נשמרת:** לא נוסף שדה, לא הוסר שדה,
לא שונה טיפוס. `marketState` נשאר מחרוזת מאותו enum. משתנה **ערכו** עבור
קריפטו — שזה התיקון עצמו.
`displayPrice` (`:155-160`): ל-crypto אין `preMarketPrice`/`postMarketPrice`,
ולכן גם קודם וגם עכשיו הוא נופל ל-`price`. אפס שינוי.
`getRefreshInterval` נגזר מה-state **הגלובלי** (`App:1508`) ולא מהציטוט — אפס
שינוי בתדירות ה-polling ובעלות.

### פריט 3ב — קופי waitlist בלנדינג · `src/components/LandingPage.jsx:89-101,178-190`

מוגבל למה ש-`docs/TRUTH.md` מתיר (🟢 בלבד), ומוביל-פעולה.
⚠️ **תלוי בפריט 6:** `TRUTH.md:21` מתאר OCR כ-"אוטומטי מלא (העלאה → מילוי)".
פריט 6 מכניס אישור באמצע. לכן הקופי **לא** יטען מילוי אוטומטי, ו-`TRUTH.md:21`
מתעדכן באותו commit (§10.4).

| מפתח | היום (he) | מוצע (he) |
|---|---|---|
| `waitlistTitle` | שריין את המקום שלך | קבל גישה מוקדמת |
| `waitlistSub` | אנחנו פותחים גישה בהדרגה. השאר אימייל ותהיה מהראשונים שיקבלו הזמנה — בלי ספאם, רק העדכון החשוב. | השאר אימייל ותקבל הזמנה כשייפתח. מה מחכה: כל עסקה נבדקת מול ההיסטוריה שלך **לפני** שאתה שומר, ואחוז ההצלחה שמופיע הוא שלך — לא ממוצע של מישהו אחר. בלי ספאם. |
| `waitlistCta` | שריין מקום | שלח לי הזמנה |

עוגנים ב-TRUTH: שורה 18 (בדיקה מול היסטוריה, 🟢) · שורה 19 (win-rate אישי לפני
Save, 🟢 · סף ≥3). en במקביל. **ניב מאשר או מחליף את הנוסח — זו קריאה שיווקית.**

### פריט 3ג — תווית דוח Growth

| קובץ | היום | אחרי |
|---|---|---|
| `.github/workflows/fleet-daily.yml:198` | `• רשימת המתנה: $(show "$wlTot")` | `• סך שורות waitlist: $(show "$wlTot")` |
| `scripts/user-analytics.mjs:505` | `waitlist: "רשימת המתנה"` | `waitlist: "סך שורות waitlist"` |

שניהם — אחרת אותו מספר נושא שני שמות בשני דוחות. `wlTot` הוא ספירת שורות בטבלה,
לא "אנשים שממתינים" (שורה שאושרה נשארת בספירה) — התווית החדשה מתארת את מה שנספר.

### פריט 4 — כשל שקט · `api/send-invites.js:134`

```js
const webhook = process.env.SENTINEL_DISCORD_WEBHOOK;
if (!webhook) {
  console.error("[send-invites] SENTINEL_DISCORD_WEBHOOK missing — Discord report skipped");
  return;
}
```
שם המשתנה בלבד, לעולם לא ערכו. נתיב השליחה לא נגוע.

**4ב — לא מבוצע ללא אישור.** שער ל-`MAIL_USERNAME`/`MAIL_PASSWORD` (§0.3):
```js
if (!process.env.MAIL_USERNAME || !process.env.MAIL_PASSWORD) {
  console.error("[send-invites] MAIL_USERNAME/MAIL_PASSWORD missing");
  res.status(500).json({ error: "config_error" });
  return;
}
```
זה **משנה התנהגות** (500 מוקדם במקום N כשלונות פר-מייל), ולכן חורג מ-§11.
ברירת מחדל: שורת ⚠️ ב-`STATE.md`, בלי קוד.

### פריט 5 — FIN-030 · `SwingEdge_App.jsx:3601`

```js
{Number.isFinite(journalStats.profitFactor)
  ? journalStats.profitFactor.toFixed(2)
  : journalStats.profitFactor === Infinity ? t.pfNoLosses : "—"}
```

**המנוע לא נגוע.** `statisticalModels.js:161-169` מתעד ש-`Infinity` הוא סנטינל
מוצהר ושהחזרת `null` תעבור דרך `isFinite` ותקרוס על `.toFixed`. התיקון בשכבת
התצוגה בלבד, בדיוק כפי שנקבע.
`profitFactor === 0` (אפס זכיות ואפס הפסדים) הוא סופי → ממשיך להציג `0.00`. ללא שינוי.
מפתח `pfNoLosses` ×5: he "אין הפסדים" · en "No losses" · es "Sin pérdidas" ·
pt "Sem perdas" · ar "لا خسائر".
**זהו אתר התצוגה היחיד** — `grep -rn '∞' src SwingEdge_App.jsx` מחזיר 4 מופעים,
מהם 2 דקורטיביים בלנדינג (`:238,243`), 1 הערה, וזה.

### פריט 6 — מסך אישור OCR · `SwingEdge_App.jsx:2432-2470`

⛔ **`api/ocr.js` לא נגוע.** צד לקוח בלבד.

היום: התשובה נכנסת ישירות ל-`setAnalyzerForm` (`:2457-2464`) — מילוי שקט.
אחרי: התשובה יושבת ב-state ביניים, המשתמש רואה ומאשר.

```js
setAnalyzerOcrResult({
  status: "review",
  confidence: result.confidence ?? 0,
  fields: { ticker: result.ticker ?? null, entry: result.entry ?? null,
            stop: result.stop ?? null, target: result.target ?? null, side: sideAtUpload },
});
```

`OcrReviewCard` — **module scope + `memo`** (מלכודת אנטי-flicker, §13): היא
מחזיקה שדות קלט, והגדרה בתוך render תרנדר את העץ מחדש בכל הקלדה.
- כל שדה בשורה משלו, ערך ניתן לעריכה לפני החלה
- `null` → תגית "לא זוהה" + מסגרת ענבר
- `confidence < 40` → באנר ענבר מעל כל הכרטיס
- "החל על הטופס" → אותו merge שקיים היום, כולל השמירה על
  `f.ticker || …` (לעולם לא לדרוס שדה שמולא ביד)
- "בטל" → משליך, הטופס לא נגע

⚠️ **סטייה מהבקשה:** ביקשת confidence **פר-שדה**. חוזה `/api/ocr` מחזיר
`confidence` **אחד** לכל התוצאה. פר-שדה דורש שינוי ב-`api/ocr.js` — מחוץ להיקף
בהוראתך. לכן: ביטחון כללי אחד + סימון פר-שדה לפי `null`. שורת ⏭️ ב-`STATE.md`.

מפתחות i18n חדשים ×5: `ocrReviewTitle`, `ocrReviewApply`, `ocrReviewDiscard`,
`ocrReviewNotDetected`, `ocrReviewLowConfidence`, `ocrReviewConfidence`.

### פריט 7 — `CLAUDE.md`

§10.2 חדש אחרי §10.1:

```markdown
### 10.2 אין פידבק יתום

כל פידבק משתמש מסתיים באחד משלושה מצבים. אין רביעי:

(א) **פריט ב-`docs/STATE.md`** (⏭️ או ⏸️) עם הציון "פידבק משתמש &lt;תאריך&gt;"
(ב) **resolved — תוקן**, עם הפניה לקומיט
(ג) **resolved — נדחה**, עם שורת נימוק ב-`STATE.md` ✅

"Reviewed" בפאנל הפידבק הוא מצב **ביניים**, לא סוף. סימון Reviewed בלי אחד
משלושת המצבים לעיל = הפידבק נעלם.

בכל פרומפט שנוגע בפידבק, לפני ה-push:
**"האם כל פידבק שנגעתי בו הגיע לאחד משלושת המצבים?"**
```

בנוסף (§0.5): §7 מתוקן ל-111 assertions ולשרשרת בת ששת המבחנים שב-`package.json:18`.

---

## 3. סעיף ציד — ממצאים מחוץ להיקף

לא מתוקנים. שורת ⚠️ ב-`STATE.md` לכל אחד (§10.1).

1. **`avgMaeMfe` מיוצאת ואינה נצרכת** (§0.1) — `STATE.md:457` טוען אחרת
2. **`MAIL_USERNAME`/`MAIL_PASSWORD` בלי שער** — `send-invites.js:235` (§0.3)
3. **`scripts/user-analytics.mjs:553`** — `pct: "∞"` כשהבסיס 0. מנה בלי מכנה בר-משמעות (§2 "אפס מנה בלי מכנה") — לבדוק אם `assertRatiosCarryDenominator` תופס אותה
4. **`LandingPage.jsx` — he/en בלבד** בעוד האפליקציה ב-5 שפות (§0.4)
5. **ריבוי ערבי 3–10 מול 11+** לא נתמך בעוזר החדש (פריט 2)
6. **`CLAUDE.md §7` מיושן** — מתוקן בפריט 7, נרשם כאן לשקיפות

---

## 4. אימות

```bash
npm run verify   # coach(111) → import → settings → datachain → rcontract → tradingstats → build
```
פלט מלא מודבק בדיווח (§7). `test:coach` לפני **וגם** אחרי הנגיעה ב-`src/intelligence/`.

**דפדפן:**
| בדיקה | ציפייה |
|---|---|
| מסנן R, תיק מעורב, rMin ריק | כל העסקאות גלויות, חסרות-R מציגות "—" |
| מסנn R, `rMin = 0` | חסרות-R מוחרגות + "N עסקאות ללא R מוסתרות" |
| אותו מסנן עם N=1 | "עסקה אחת ללא R מוסתרת" — יחיד תקין |
| PF בתיק ללא הפסדים | "אין הפסדים", לא `∞` |
| BTC-USD בטופס בסופ״ש | 🟢 LIVE, לא ⚫ CLOSED |
| העלאת צילום ב-Analyzer | כרטיס אישור; הטופס **ריק** עד "החל" |
| אותו זרימה, שדה שמולא ביד | "החל" אינו דורס אותו |

מובייל ב-iframe 390px (`CONTEXT.md` §Working procedures).

---

## 5. STATE.md — מה מתעדכן

**✅ נסגר:** החלטת מסנן ה-R, בנוסח שנקבע:
> "עסקה בלתי-מדידה: גלויה תמיד, מוחרגת ממסנן R פעיל עם ספירה גלויה"

**מ-⏸️ יוצא:** "מה קורה לעסקה שאינה ניתנת למדידה במסנן ה-R" (`STATE.md:245-246`)
**מתוקן:** `STATE.md:457` — שתי הטענות השגויות (§0.1, §0.2)
**⏭️ נוסף:** confidence פר-שדה ב-OCR (פריט 6) · פריט 4ב אם ניב מאשר
**⚠️ נוסף:** ששת ממצאי הציד (§3)
**TRUTH.md:21** מתעדכן — OCR אינו עוד "אוטומטי מלא" (§10.4)

---

## 6. מה **לא** ייעשה

- ⛔ `api/ocr.js` — לפי הוראה מפורשת
- ⛔ החזרת `null` מ-`profitFactorFromPnls` — מוקש `isFinite(null)`, מתועד
- ⛔ פריט 4ב ללא אישור נפרד
- ⛔ מיגרציה · סוד · force-push
- ⛔ תיקון ששת ממצאי הציד "בדרך" (§11)

---

## 7. סדר commits

1. `docs(plan): מקבץ תיקונים קטנים — awaiting approval` ← **הקומיט הזה. ואז עצירה.**
2. אחרי אישור: הביצוע. `STATE.md` + `TRUTH.md` + `CLAUDE.md` באותו commit של הקוד (§10).
