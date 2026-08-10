# PLAN 2026-08-10 — גל התיוג

סוגר את החוב האחרון של גל ההון (09.08) + שני פגמי מסך-ראשון.
**המנוע תוקן ב-09.08; הטקסט שמסביר אותו נשאר שגוי.**

---

## 0. Safety gate — עבר

```
git remote -v | head -1  → origin  https://github.com/niveven183/Swing-edge (fetch)  ✅
git log --oneline -1     → c4810f1 feat(analytics): גל GA4 …                          ✅
git pull origin main     → Already up to date.                                        ✅
git status               → nothing to commit, working tree clean                      ✅
```

## 0.1 ניתוח השלכות (§8) — פילטר רמה 1 שקט

משנה DB? **לא.** כסף/מיילים? **לא.** מוסיף סוד? **לא.** רץ אוטומטית
בפרודקשן? **לא.** בלתי הפיך? **לא.** → חמש "לא", אין טבלה. הגל הוא
מחרוזות, class אחד של צבע, `useEffect` אחד, וחוליית בדיקה.

---

## 0.2 שלוש סטיות מהפרומפט — המספרים זזו

| נאמר | נמדד בפועל |
|------|-------------|
| `tooltips.js:123` | **`tooltips.js:121`** (`riskLimits:`) |
| `SwingEdge_App.jsx:1781-1782` כותב `lang` | **`SwingEdge_App.jsx:1810`** (בתוך `useEffect` ב-`:1808-1813`) |
| `maxRiskPct` — `min(5,max(3,r×2))` | ✅ מאושר, **`SwingEdge_App.jsx:1243`** (`STATE:32` אומר `:1232` — גם הוא זז) |

`AuthScreen.jsx:46` ו-`ToastProvider.jsx:58` **אומתו כמדויקים** — שניהם
קוראים `document.documentElement.lang`. ⚠️ הנתיב הוא
`src/components/ToastProvider.jsx`, **לא** `src/components/ui/`.

---

## §1 — הטולטיפ נגזר, לא מקובע · **הכרעה: ניסוח גנרי**

### המדידה שהכריעה

`src/components/ui/TermTooltip.jsx` — החתימה כולה:

```jsx
export default function TermTooltip({ term, lang = 'he', label, children }) {
  const entry = TRADING_TOOLTIPS[term];
  const desc = entry ? (entry[lang] || entry.en) : '';
```

**אין פרמטרים.** `desc` הוא חיפוש מחרוזת סטטי. שני אתרי הקריאה
של `riskLimits` מעבירים `term`+`lang` בלבד:

- `SwingEdge_App.jsx:4244` — כרטיס "מקסימום סיכון מותר" (לוח הסיכונים)
- `SwingEdge_App.jsx:6676` — שורת "תקרת תיק נגזרת" (הגדרות)

⇒ העברת `riskPct` הייתה דורשת prop חדש ב-`TermTooltip`, ב-`InfoTooltip`,
ובכל 40+ אתרי הקריאה. **גל תיוג, לא גל תשתית** → ניסוח גנרי.

### הנוסח החדש (5 שפות, `tooltips.js:121`)

מסביר את **היחס** בלי מספר-דוגמה אישי. 3% ו-5% נשארים — הם **קבועי
הנוסחה**, נכונים לכל משתמש, ואינם ערך-דוגמה:

> **סיכון/עסקה** — המקסימום שאתה מסכן בפוזיציה בודדת. **אתה בוחר אותו** בהגדרות.
> **מקסימום סיכון מותר** — המקסימום בכל הפוזיציות הפתוחות יחד. **נגזר** מסיכון/עסקה: פי 2 ממנו, לא מתחת ל-3% ולא מעל 5%.
> חלוקת מקסימום הסיכון המותר בסיכון/עסקה נותנת כמה פוזיציות בגודל מלא אפשר להחזיק בו-זמנית.

יורדים: `(1%)` · `(3%)` · `בערך 3 עסקאות` — ובכל 5 השפות.

### ⚠️ תלות שנמצאה במדידה — `glossary.json`

`src/data/glossary.json:226` מחזיק **עותק** של `riskLimits`, ונוצר ע"י
`npm run glossary` (`extract-tooltips.mjs` → `build-glossary.mjs`).
הסקריפט **אינו ב-`verify` ואינו ב-`build`** ⇒ בלי הרצה ידנית,
`glossary.json` ישמר את "(1%)" הישן בשקט.
**`npm run glossary` ירוץ, והפלט יקומט באותו קומיט.**

---

## §2 — רצפת ה-3 נראית

**מיקום:** `SwingEdge_App.jsx:4243-4247`, כרטיס "מקסימום סיכון מותר",
מתחת לשורת `{t.fromCapital}`.

**תנאי:** `riskPct * 2 < 3` (הרצפה פעילה — 8/32 המשתמשים ב-0.5%).
**נוסח:** `מינימום מערכת: 3%` / `System minimum: 3%` — מפתח i18n חדש
ב-5 שפות. עובדה, לא אזהרה: `text-slate-600`/`text-[10px]`, אותו סגנון
כמו השורה שמעליה. **בלי צבע אזהרה, בלי אייקון.**

---

## §3 — הבאנר הריק · מדידה מול WCAG AA

### הבאנר — זוהה

`src/components/OnboardingScreen.jsx` — **המסך הראשון של משתמש חדש**,
בדיוק כפי ש-`STATE:99` מתאר. בלוק ההמלצות:

```jsx
// :200-205
const colorMap = {
  green: { border: "border-emerald-500/25", icon: "text-emerald-400", bg: "bg-emerald-500/10" }, …
};
// :529  <div className={`${c.bg} border ${c.border} rounded-xl p-3 flex gap-3`}>
// :534    <div className={`text-xs font-bold mb-0.5 ${c.icon}`}>{rec.title}</div>
```

### למה זה נכשל דווקא במצב בהיר

הכרטיס העוטף (`:520`) הוא `bg-[var(--bg-elevated)] dark:bg-[#0d1424]`.
`src/design/tokens.css:9` — **`:root` הוא בהיר**: `--bg-elevated: #FFFFFF`
(ו-`:152` `color-scheme: light`). ⇒ במצב בהיר `bg-emerald-500/10`
מורכב מעל **לבן**, וטקסט `text-emerald-400` יושב עליו. ירוק על ירוק.

### החישוב (WCAG 2.1, יחס יחסי-לומיננס)

רקע = `emerald-500 #10B981` ב-10% מעל `#FFFFFF` → **`#E7F8F2`**

| משפחה | רקע מורכב | **לפני** (`-400`) | **אחרי** (`-700`) | כהה (`-400` על `#0d1424`) |
|--------|-----------|------------------|-------------------|---------------------------|
| **emerald** (המדווח) | `#E7F8F2` | **1.75:1** ❌ | **4.99:1** ✅ | 8.28:1 ✅ |
| cyan | `#E6F8FB` | 1.65:1 ❌ | 4.89:1 ✅ | 8.79:1 ✅ |
| violet | `#F3EFFE` | 2.41:1 ❌ | 6.29:1 ✅ | 6.13:1 ✅ |
| amber | `#FEF5E7` | 1.54:1 ❌ | 4.65:1 ✅ | 9.48:1 ✅ |

סף AA לטקסט רגיל = **4.5:1**. `-600` נבדק ונפסל (emerald 3.43 · cyan 3.36 · amber 2.95 — **אינו עובר**).

### התיקון

`icon: "text-emerald-700 dark:text-emerald-400"` — **דפוס קיים בריפו**
(`SwingEdge_App.jsx:4536` · `AuthScreen.jsx:461`), **גוון קיים בפלטה**,
אפס צבע מומצא, ומצב כהה לא זז.

### ⚠️ הכרעה נדרשת — שלוש המשפחות האחרות

הדיווח נקב ב**ירוק בלבד**, אך שלושתן אותו אובייקט, אותו פגם, ונמדדו
נכשלות. **הצעה: לתקן את ארבעתן** (עריכה אחת, `colorMap`, אותו דפוס).
אם ניב מעדיף ירוק בלבד — cyan/violet/amber יורדות ל-⚠️ ב-`STATE`
עם המספרים. **⛔ לא אחליט לבד.**

---

## §4 — מתג השפה כותב `lang`

**הכשל:** `src/components/LandingPage.jsx:628-631`

```jsx
const chooseLang = (next) => { setLang(next); setCcy(next === "he" ? "ils" : "usd"); };
```

מעדכן state בלבד. `<html lang>` נשאר `he` מ-`index.html` ⇒ מבקר שבחר
EN (`:721`) מקבל `AuthScreen` בעברית.

**הדפוס שיאומץ — זהה ל-`SwingEdge_App.jsx:1808-1813`:**

```jsx
useEffect(() => {
  try {
    document.documentElement.lang = lang;
    document.documentElement.dir  = dir;
  } catch {}
}, [lang, dir]);
```

`useEffect` על `[lang, dir]`, **לא** בתוך `chooseLang` — כך הוא נכון גם
בטעינה ראשונה, לא רק בלחיצה. `dir` כבר קיים ב-`:632` (`L.dir`).

---

## §5 — בדיקות · חוליה חדשה `test:copy`

`scripts/copy-contract-test.mjs`. שלוש האסרציות חוצות שלושה קבצים
(`tooltips.js` · `LandingPage.jsx` · `OnboardingScreen.jsx`) ואינן
שייכות לאף הרנס קיים.

1. **טולטיפ נגזר** — `riskLimits` ב-5 השפות: אפס `(1%)` · אפס `(3%)`
   · אפס ספירת-עסקאות קשיחה. **+ `glossary.json` תואם ל-`tooltips.js`.**
2. **`lang` נכתב** — בדיקת-מקור ש-`LandingPage.jsx` מכיל
   `document.documentElement.lang =`.
3. **ניגודיות** — פרסור `colorMap`, הרכבה מעל `#FFFFFF`, אסרציה ≥ 4.5:1.

**שלוש נצפות נכשלות על הקוד הישן** (הנדרש: ≥2) — הפלט יודבק.

⚠️ **בדיקת-מקור מוכיחה שהקוד נכתב, לא שהוא עובד** — אותה מגבלה
שנרשמה ב-`STATE:50` על `test:capability`.

**עדכון שרשרת:** `verify` → 19 חוליות · `CLAUDE.md §7` מתעדכן
**באותו קומיט** (הרשימה נגזרת מ-`package.json`, `DECISIONS` 2026-08-08).

---

## §6 — רישום

- **`STATE.md`** — ⚠️ **הקובץ ב-100 שורות בדיוק, התקרה.** עריכה
  **מחליפה**, לא מוסיפה: `:34` (גל התיוג ⏭️→✅) · `:99` (מתוך "שלושה
  חובות" נשארים **42 `catch`** בלבד) · `:27` ("ניגודיות הבאנר" יורד
  מרשימת "אחריהם").
- **`DECISIONS.md`** (append-only, שורה מתוארכת): *"טקסט שמסביר ערך
  נגזר מציג את הערכים בפועל או מנוסח גנרית — מספר-דוגמה קשיח בטולטיפ
  הופך שגוי ברגע שהערך אישי."* + נימוק בחירת הגנרי (תשתית סטטית).
- **`TRUTH.md`** — §10.4: הטולטיפ ושורת הרצפה פונים-משתמש.
- **`INCIDENTS.md`** — ⛔ **לא.** אין אירוע פרודקשן/CI.

---

## אסור — אומת

⛔ אפס נגיעה ב-`riskProfile` / `equityBase` / `fx` / `tradeWrite`
⛔ אפס שינוי בנוסחת `maxRiskPct` (`:1243`) — התיוג מסביר, לא משנה
⛔ אפס נגיעה ב-`notify` / `emails` / `ocr` / `analytics`

## קבצים

`src/data/tooltips.js` · `src/data/glossary.json` (נוצר) · `src/i18n.js`
· `SwingEdge_App.jsx` (§2 בלבד) · `src/components/OnboardingScreen.jsx`
· `src/components/LandingPage.jsx` · `scripts/copy-contract-test.mjs`
(חדש) · `package.json` · `CLAUDE.md` · `docs/STATE.md` ·
`docs/DECISIONS.md` · `docs/TRUTH.md`

---

## שתי שאלות פתוחות לניב

1. **§3 — ארבע משפחות או רק ירוק?** (ברירת המחדל שלי: ארבע)
2. **§2 — שורת הרצפה גם ב-`:6676`** (הגדרות, שם משנים את `riskPct`)
   או בלוח הסיכונים בלבד כפי שנכתב בפרומפט? (ברירת המחדל: לוח בלבד)

**awaiting approval — אפס נגיעה בקוד עד אישור.**
