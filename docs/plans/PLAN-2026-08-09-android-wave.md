# PLAN 2026-08-09 — גל אנדרואיד: יכולת דפדפן נצרכת בלי בדיקה

**סטטוס:** awaiting approval · **HEAD בזמן הכתיבה:** `ac9b38f` · **תאריך מ-`git log`:** 2026-08-09 +0300

---

## 0. מה מאחד את שלושת הכשלים

שלושתם באותה מחלקה: **יכולת צד-לקוח נצרכת בלי לוודא שהיא קיימת או שהקלט עומד
בתנאיה, וכשהיא נכשלת — המשתמש לא יודע.** לא באג חישוב, לא באג שרת. בכל שלושת
המקרים הדפדפן שלנו (Chrome דסקטופ) מספק את היכולת, ולכן שום אימות שנעשה עד היום
לא יכול היה לתפוס אותם.

זה גם מה שהופך אותם לבלתי-נראים: **אין שגיאה בלוג, אין שורה ב-Sentry, אין תלונה.**
המשתמש מנסה, לא עובד, והולך.

**§2 ו-§3 כאן הם בדיוק #2 ו-#3 מרשימת שש הסתעפויות היכולת** שמופו ב-
`PLAN-2026-08-06-workflows.md §5` ונרשמו ב-`STATE.md:49` כ-⏭️. הגל הזה סוגר אותן.
**§1 אינו ברשימה כלל** — הוא התגלה בסריקה הנוכחית.

---

## 1. מדידה מחדש — כל מספרי הפרומפט זזו

הפרומפט הזהיר: *"מספרי השורות נרשמו לפני גל ההון שנגע ב-`SwingEdge_App.jsx` — מדוד
כל אחד מחדש. השורה היא רמז, ה-grep הוא האמת."* האזהרה הצדיקה את עצמה — **אף מספר
לא נשאר במקומו**, ושני אתרים לא היו ברשימה בכלל.

### 1.1 תמונה — `readAsDataURL`: ארבעה אתרים, לא שלושה

`grep -rn "readAsDataURL"` על כל הריפו (ללא `node_modules`) מחזיר 4 קריאות + הערה אחת.

| אתר | שורה בפועל | בפרומפט | נשלח ל-`/api/ocr`? | מוקטן? |
|---|---|---|---|---|
| `grabChartFrame` | **3226** (הגדרה) · הקטנה **3240–3252** | ~3078 | כן (דרך `runChartOcr`) | ✅ **הרפרנס** |
| `handleImageUpload` | **3087** | ~2860 | כן | ❌ **גולמי** |
| `handleAnalyzerImageUpload` | **3138** | *לא הופיע* | כן | ❌ **גולמי** |
| `handleChartFileFallback` | **3355** | ~3196 | כן | ❌ **גולמי** |
| `handlePlaybookImageUpload` | **6211** | *לא הופיע* | **לא** — `localStorage` | ❌ גולמי |

**`handleAnalyzerImageUpload:3138` הוא האתר הרביעי שהפרומפט הזהיר שייתכן שנוסף.**
הוא נצרך על ידי מחשבון האנלייזר, שולח ל-`postOcr` בדיוק כמו `handleImageUpload`,
ואין בו שום הקטנה. **שלושה אתרים שבורים, לא שניים.**

**`handlePlaybookImageUpload:6211` אינו מסלול שליחה** — ראה §7 (סריקה סביבתית).

### 1.2 מה `grabChartFrame` עושה נכון (`:3240-3252`)

```js
if (w > 2000) { h = Math.round((h * 2000) / w); w = 2000; }
const canvas = document.createElement("canvas");
canvas.width = w; canvas.height = h;
canvas.getContext("2d").drawImage(video, 0, 0, w, h);
let dataURL = canvas.toDataURL("image/jpeg", 0.92);
// Safety net vs the /api/ocr 6MB cap (base64 ≈ 4/3 of raw bytes).
if (dataURL.length * 0.75 > 6 * 1024 * 1024) {
  dataURL = canvas.toDataURL("image/jpeg", 0.8);
}
```

ארבעה קבועים: **תקרת רוחב 2000px · תקרת מטען 6MB · איכות 0.92 → 0.80**.

### 1.3 clipboard — אתר אחד בלבד

`:2803`, בתוך `handleCopyInvite` (`:2800-2807`). הפרומפט אמר ~2608.

```js
try {
  await navigator.clipboard.writeText(mentorInviteCode);
  setMentorCodeCopied(true);
  setTimeout(() => setMentorCodeCopied(false), 2000);
} catch { /* clipboard blocked — code stays visible for manual copy */ }
```

**ההערה בקוד נכונה בעובדה ושגויה במסקנה.** הקוד אכן נשאר גלוי — `:6358-6362`
מרנדר אותו ב-`<code>` עם `select-all`. אבל **המשתמש לחץ "העתק" וקיבל אפס משוב:**
האייקון לא משתנה, הטקסט לא משתנה, שום דבר לא קורה. מבחינתו הכפתור שבור.

לכן ה-fallback **אינו** "הצג את הקוד" (הוא כבר מוצג) — הוא **להודיע שההעתקה לא
קרתה ושצריך לסמן ידנית.**

⚠️ `0 mentorships` ב-`STATE.md` — זו השערה למנגנון, **לא הוכחה.** אין מדידה שקושרת
את השניים, ולא תהיה. נרשם כהשערה בלבד.

### 1.4 matchMedia — חמישה מופעים, שניים לא מוגנים

| קובץ:שורה | מוגן? | איך |
|---|:---:|---|
| `SwingEdge_App.jsx:1307` | ❌ **לא** | `window.matchMedia(...).matches` חשוף בתוך `useEffect` |
| `src/contexts/ThemeContext.jsx:31` | ✅ כן | `try/catch` עם ברירת מחדל `'light'` |
| `src/contexts/ThemeContext.jsx:42` | ❌ **לא** | `const mq = window.matchMedia(...)` חשוף בתוך `useEffect` |
| `src/components/IOSInstallBanner.jsx:20` | ✅ כן | `window.matchMedia?.(...)?.matches` |
| `src/components/OnboardingTour.jsx:37-38` | ✅ כן | `typeof window !== "undefined" && window.matchMedia ? ... : ...` |

**`SwingEdge_App.jsx:1307` לא הופיע בפרומפט.** זו הסתעפות **#6** מרשימת השש
(`prefers-reduced-motion`), ומצבה זהה ל-`ThemeContext:42`: קריאה חשופה בתוך
`useEffect`. WebView שזורק שם מפיל את העץ בדיוק כמו ב-ThemeContext.

⚠️ `ThemeContext.jsx:31` ו-`:42` **קוראים את אותו media query בשתי הגנות שונות** —
זו בדיוק הא-סימטריה שהפרומפט ביקש ליישר.

---

## 2. §1 — הקטנת תמונה: הכרעת מודול מול helper

### ההכרעה: **מודול** — `src/lib/imageResize.js`

הנימוק **אינו סגנון קוד.** הפרומפט ציין נכון ש-`canvas` אינו זמין ב-Node ולכן
מודול ייבדק בבדיקת-מקור. **אבל זה נכון רק אם הפונקציה מונוליטית.** פיצול לשני
חלקים מייצר בדיקת ריצה אמיתית:

| ייצוא | טהור? | איך נבדק |
|---|:---:|---|
| `MAX_EDGE_PX` · `OCR_CAP_BYTES` · `Q_PRIMARY` · `Q_FALLBACK` | קבועים | ריצה |
| `fitDimensions(w, h, max)` → `{w, h}` | ✅ טהור | **ריצה ב-node** |
| `exceedsCap(dataURLLength, capBytes)` → `boolean` | ✅ טהור | **ריצה ב-node** |
| `fileToResizedDataURL(file)` → `Promise<string>` | ❌ canvas | בדיקת-מקור |

**מה זה קונה:** מתמטיקת ההקטנה ויחס ה-base64 (`length * 0.75`) הם המקום שבו באג
שקט יכול לחזור — off-by-one ביחס, `Math.round` לכיוון הלא נכון, תקרה שמושווית
לפני הקידוד במקום אחרי. אלה **נבדקים בריצה**, לא בהתאמת מחרוזת. רק ה-orchestration
סביב canvas נשאר בבדיקת-מקור.

helper פנימי ב-`SwingEdge_App.jsx` היה חוסך import אחד ומוותר על כל זה.

### `grabChartFrame` — מה כן ומה לא

⛔ **אפס שינוי בפרמטרים, בחתימה, בזרימה ובהתנהגות.** הוא הרפרנס.

✅ **כן:** מייבא את ארבעת הקבועים ואת `fitDimensions`/`exceedsCap` במקום להחזיק
אותם בגוף. **בדיוק אותם ערכים, בדיוק אותה תוצאה, ביט בביט.**

**למה בכל זאת לגעת בו:** `CLAUDE.md` §13 — *"מקור-אמת-אחד ל-`edge`/`capital`/
`VALID_*`. חישוב inline = סחיפה."* אם נשאיר `2000` ו-`6 * 1024 * 1024` בשני
מקומות, השינוי הבא יעדכן אחד וישכח את השני, וזה בדיוק סוג הבאג שהגל הזה סוגר.
זהו **החלפת קבוע כפול בייבוא**, לא refactor של הלוגיקה.

⚠️ אם ההערכה הזו שגויה בעיניך — אמור, ו-`grabChartFrame` יישאר ללא נגיעה כלל
והקבועים יישארו כפולים. זו החלטה שלך, לא שלי.

### כשל ההקטנה — מה קורה

`fileToResizedDataURL` **דוחה** (`reject`) בכל אחד מאלה:

- `img.onerror` — קובץ פגום או פורמט שהדפדפן לא מפענח
- `naturalWidth === 0 || naturalHeight === 0` — תמונה ריקה
- `canvas.toDataURL` זורק — canvas מזוהם או חסר

הקורא תופס ומציג את מצב השגיאה שכבר קיים אצלו
(`setOcrStatus({status:"error"})` / `setAnalyzerOcrResult` / `setChartOcrStatus`).

⛔ **אין נפילה-לאחור לשליחה גולמית.** שליחה גולמית **היא** הבאג — fallback אליה
היה משחזר אותו בדיוק במקרה שבו הוא הכי סביר.

### שלושת האתרים אחרי השינוי

`handleImageUpload` · `handleAnalyzerImageUpload` · `handleChartFileFallback`
מחליפים `new FileReader() + readAsDataURL(file)` ב-`await fileToResizedDataURL(file)`.

⚠️ **שים לב לתופעת לוואי מכוונת:** ב-`handleImageUpload` וב-
`handleAnalyzerImageUpload` ה-dataURL נשמר גם כ-`tradeImagePreview` /
`analyzerImagePreview`. אחרי השינוי ה-preview הוא **התמונה המוקטנת**. זה שיפור
ולא רגרסיה — `STATE.md:96` מתעד ש-`tradeImage` (data-URL) יושב ב-`localStorage`
ו**הוא צרכן המכסה**. הקטנה מקטינה גם את הצריכה שם.

---

## 3. §2 — clipboard: בדיקת קיום + נראות כשל

```js
const handleCopyInvite = useCallback(async () => {
  if (!mentorInviteCode) return;
  const canCopy =
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function";
  if (!canCopy) { toast.info(t.mentoringCopyManual); return; }
  try {
    await navigator.clipboard.writeText(mentorInviteCode);
    setMentorCodeCopied(true);
    setTimeout(() => setMentorCodeCopied(false), 2000);
  } catch {
    toast.error(t.mentoringCopyManual);
  }
}, [mentorInviteCode, toast, t]);
```

- **בדיקת קיום לפני קריאה** — הקשר לא-מאובטח ו-WebView שבהם `navigator.clipboard`
  הוא `undefined` לא מגיעים ל-`await` בכלל
- ⛔ **ה-`catch` מפסיק לבלוע** — גם דחייה (הרשאה נדחתה, מסמך לא ממוקד) מגיעה
  למשתמש
- שני המסלולים מפנים לאותה הודעה: *"לא ניתן להעתיק אוטומטית — סמן את הקוד והעתק
  ידנית"*. הקוד כבר גלוי עם `select-all`, כך שההוראה מבוצעת מיד
- `setMentorCodeCopied(true)` **לא נקרא בכשל** — "הועתק" לא ישקר

**i18n:** מפתח חדש `mentoringCopyManual` ב-`src/i18n.js` — `en` ליד `:339-340`,
`he` ליד `:1039-1040`. ⛔ אין טקסט מוטמע בקוד.

`toast.info` / `toast.error` שניהם קיימים בהיקף (בשימוש ב-`:2519` · `:2794`).

**ספירה: אתר אחד. אין `navigator.clipboard` נוסף בריפו** (מלבד הערה תיעודית
ב-`playwright.config.js:34`, שאינה קוד).

---

## 4. §3 — matchMedia: הגנה אחידה

דפוס אחיד לשני האתרים הלא-מוגנים: **קבל `mq` שעשוי להיות `null`, ואל תקרוס.**

### `src/contexts/ThemeContext.jsx:42`

```js
const mq = (() => {
  try {
    return typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null;
  } catch { return null; }
})();
```

`apply()` משתמש ב-`mq?.matches` (כלומר `'light'` כברירת מחדל — **זהה ל-`:31`**,
וזו כל הנקודה: שני המופעים מחזירים אותו דבר כשהיכולת חסרה). בלוק המאזין מותנה
ב-`if (mode === 'auto' && mq)`.

### `SwingEdge_App.jsx:1307`

```js
let prefersReducedMotion = false;
try { prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false; } catch {}
if (prefersReducedMotion) return;
```

ברירת המחדל `false` **משמרת את ההתנהגות הקיימת** בכל דפדפן שיש לו `matchMedia`
— מי שאין לו מקבל את אנימציית ה-FAB, שהיא ההתנהגות הרווחת היום.

### מה **לא** נכנס

`mq.addListener` (ה-API הישן, לפני `addEventListener`) — WebViews עתיקים מסוימים
מספקים אותו בלבד. ⛔ **לא מיושם בגל הזה.** ההגנה שביקשת היא מפני **היעדר** היכולת
ולא מפני גרסה ישנה שלה, וזו הרחבת סקופ שדורשת החלטה נפרדת. ⏭️ נרשם ב-`STATE`.

⚠️ שלושת המופעים המוגנים (`ThemeContext:31` · `IOSInstallBanner:20` ·
`OnboardingTour:37`) **אינם משתנים** — הם כבר עומדים באינווריאנט בשלוש צורות
תקינות שונות, והבדיקה ב-§5 מקבלת את שלושתן.

---

## 5. §4 — בדיקות: `scripts/capability-guard-test.mjs` (`test:capability`)

בית אחד לשלוש הבדיקות, כי שלושתן **אותו אינווריאנט** — זה שנחקק ב-`DECISIONS`
בסוף הגל. פיצול ל-`ocr-contract-test` (תמונה) + קובץ חדש (clipboard/matchMedia)
היה מפזר כלל אחד על שני קבצים.

| # | סוג | האסרציה | נצפית נכשלת על? |
|---|---|---|---|
| 1 | ריצה | `fitDimensions` — מעל התקרה מוקטן ביחס נשמר; מתחת אינו נוגע; ריבוע; לרוחב; לאורך | פונקציה חדשה |
| 2 | ריצה | `exceedsCap` — `length*0.75` מול 6MB, מעל/מתחת/בדיוק | פונקציה חדשה |
| 3 | מקור | שלושת אתרי השליחה מכילים `fileToResizedDataURL` | ✅ **כן, על הישן** |
| 4 | מקור | אפס `readAsDataURL(` בגוף שלושת אתרי השליחה | ✅ **כן, על הישן** |
| 5 | מקור | `grabChartFrame` אינו מכיל `2000` או `6 * 1024 * 1024` ליטרליים | ✅ **כן, על הישן** |
| 6 | מקור | כל `navigator.clipboard` מוקדם בבדיקת קיום באותה פונקציה | ✅ **כן, על הישן** |
| 7 | מקור | אפס `catch {` ריק בפונקציה שמכילה `navigator.clipboard` | ✅ **כן, על הישן** |
| 8 | מקור | כל `matchMedia` — `?.` או `typeof`-guard או בתוך `try` | ✅ **כן, ×2** |

**5 מתוך 8 האסרציות נצפות נכשלות על הקוד הנוכחי לפני התיקון** — פלט הכשל יודבק
בדיווח. אסרציה שלא נצפתה נכשלת אינה בדיקה.

⚠️ **אסרציה 4 מנוסחת על גוף שלוש הפונקציות ולא על הקובץ**, כי
`handlePlaybookImageUpload:6211` משתמש ב-`readAsDataURL` **לגיטימית** (לא מסלול
שליחה, ראה §7). אסרציה גורפת על הקובץ הייתה נכשלת עליו לשווא ומכריחה אותנו לשנות
קוד שאינו במשימה.

### עדכון השרשרת

חוליה **17**: `test:capability` נכנס ל-`verify` **לפני** `test:arch`.
⚠️ `CLAUDE.md` §7 מתעדכן **באותו קומיט** — 16 → 17 חוליות, כולל שורת ה-trigger
(*"לפני כל נגיעה ב-`src/lib/imageResize.js` או במסלול העלאת תמונה"*).
זו דרישת `DECISIONS` 2026-08-08.

---

## 6. §8 — ניתוח השלכות

**רמה 1:** משנה DB? לא · כסף/מיילים? לא · סוד? לא · **רץ אוטומטית בפרודקשן? כן
— קוד לקוח שנשלח לכל משתמש** · בלתי הפיך? לא. → הפילטר תפס, רמה 2:

| ציר | הערכה |
|---|---|
| משתמשים | **כל מעלה תמונה במובייל.** היום: 400 `image_too_large` בשקט. אחרי: עובד |
| נתונים | אפס DB, אפס מיגרציה. `tradeImagePreview` ב-`localStorage` נעשה **קטן יותר** |
| עלות | **יורדת** — מטען קטן ל-Vision, פחות egress, פחות טוקנים |
| תקרות ספק | ללא שינוי במספר הקריאות, רק בגודלן |
| אבטחה | אפס סודות, אפס RLS, אפס חשיפה. ההקטנה מקומית בדפדפן |
| תחזוקה (§3) | **מקטין עבודה ידנית** — היום כשל כזה מגיע כתלונה שדורשת אבחון ידני |
| הפיכות | `git revert` של קומיט אחד. אין state נלווה |
| כשל שקט | **זה מה שנסגר.** הבדיקה החדשה שומרת שלא יחזור |

**פסק דין: ✅ בצע.**

---

## 7. §11 — סריקה סביבתית: ממצא אחד, לא מתוקן

**`handlePlaybookImageUpload:6205-6211` + `savePlaybook:6188-6191`**

```js
const savePlaybook = (updated) => {
  setPlaybookSetups(updated);
  try { localStorage.setItem("swingEdgePlaybook", JSON.stringify(updated)); } catch {}
};
```

data-URL גולמי של צילום אנדרואיד נכנס ל-`playbookForm.imagePreview` ומשם ל-
`localStorage`. מכסת `localStorage` היא **~5MB לכל המקור** — צילום מסך אחד יכול
למלא אותה. `setItem` זורק `QuotaExceededError`, **ה-`catch` הריק בולע**, המצב
נשאר ב-React בלבד ו**נעלם ברענון**. המשתמש בנה סטאפ, ראה אותו על המסך, ואיבד
אותו בלי מילה.

⚠️ זו **אותה מחלקת כשל** של הגל — אבל **אינו מסלול שליחה ואינו המשימה**, ותיקונו
נוגע גם ב-`savePlaybook` וגם במכסה משותפת עם `tradeImage` (`STATE.md:96`).
`CLAUDE.md` §11 דורש ודאי **וגם** קשור **וגם** קטן-ובטוח — התנאי השלישי אינו
מתקיים.

⏭️ **נרשם ב-`STATE.md`. אתה מחליט.** זהו אחד מ-42 ה-`catch {}` הריקים שכבר
רשומים שם — עכשיו עם מנגנון מדוד ולא רק ספירה.

---

## 8. §5 — רישום

⚠️ **`docs/STATE.md` עומד על 99/100 שורות.** אין מקום לשורות חדשות; העדכון נעשה
**בתוך שורות קיימות**.

| מיקום | השינוי |
|---|---|
| `:5` HEAD | hash הקומיט של הגל |
| `:44` (עומרי) | הגל סוגר את **הפער השלישי והאחרון** — התמונה אולי מעולם לא הגיעה ל-Vision. ⛔ עדיין אין מייל יזום; **האות הוא תשובתו** |
| `:49` (הסתעפויות) | #2 ו-#3 **נסגרו בקוד**; ⏭️ בדיקות הסרת-יכולת ב-Playwright נשארות פתוחות (בדיקת-מקור אינה בדיקת ריצה בדפדפן) |
| שורת ⚠️ קיימת | ⏭️ `handlePlaybookImageUpload` (§7) · ⏭️ `mq.addListener` (§4) |
| ⏭️ הבא | GA4 |

**`docs/DECISIONS.md`** — שורה מתוארכת חדשה (append-only, לא נגיעה בשורות היסטוריות):

> **2026-08-09** — יכולת דפדפן נצרכת **רק אחרי בדיקת קיום**, וכשל שלה חייב להיות
> **נראה למשתמש**. `catch` בולע על יכולת חסרה הוא **באג, לא הגנה**. נגזרת: מטען
> שנשלח לשרת עומד בתקרת השרת **לפני** השליחה — שליחה גולמית "וש השרת יחליט" היא
> אותו כשל שקט בתחפושת.

---

## 9. פיצול הקומיטים

| # | קומיט | תוכן |
|---|---|---|
| 1 | `docs(plan): גל אנדרואיד — awaiting approval` | **הקובץ הזה בלבד.** ואז עצירה |
| 2 | `fix(mobile): הקטנת תמונה לפני שליחה — שלושה אתרים, מקור אחד` | `src/lib/imageResize.js` · 3 אתרים · `grabChartFrame` (קבועים) · `capability-guard-test.mjs` · `package.json` · `CLAUDE.md` §7 |
| 3 | `fix(mobile): clipboard ו-matchMedia — בדיקת קיום וכשל נראה` | `:2803` · `i18n.js` · `ThemeContext:42` · `SwingEdge_App:1307` |
| 4 | `docs(state+decisions): גל אנדרואיד — רישום` | `STATE.md` · `DECISIONS.md` |

קומיטים 2 ו-3 עצמאיים וניתנים ל-revert בנפרד. אפשר לאחד את 4 לתוך 3 אם תעדיף.

---

## 10. גבולות הגל

⛔ אפס נגיעה ב-`api/ocr.js` — הצד שרת סגור ונבדק, הגל צד-לקוח
⛔ אפס מיילים (כולל לעומרי) · אפס מיגרציות · אפס SQL
⛔ אפס נגיעה ב-`notify` / `emails/` / `tradeWrite` / מסלולי הון
⛔ אפס שינוי בפרמטרים או בהתנהגות של `grabChartFrame`
⛔ אפס force-push
⚠️ `STATE.md` ≤ 100 שורות

**אחרי אישור:** `npm run verify` (17 חוליות + build), פלט מלא בדיווח, כולל פלט
הכשל של 5 האסרציות שנצפו נכשלות לפני התיקון.
