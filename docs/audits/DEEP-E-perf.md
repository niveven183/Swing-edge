# DEEP · פאזה E — ביצועים · זיכרון · bundle

**סוג:** אבחון read-only (§8.1 שלב 1) · **רמה:** T3 · **תשובות:** 1-לא / 2-לא / 3-לא / 4-כן / 5-כן
**HEAD בתחילת האבחון:** `a70d73a` · עץ נקי · **0 קבצים שונו**
**מוחרג:** `B-176`/`B-178` (מוקפא עד 26.08 14:18Z)
**סביבה:**
· **bundle** — `npm run build` מקומי ב-HEAD `a70d73a`; ייחוס בייטים מ-build מקביל **עם** sourcemaps ב-`/tmp/deepe-dist` (hash זהה ב-`recharts`/`sentry`/`date-fns` ⇒ אותם בייטים).
· **טעינה** — Lighthouse 12 מקומי מול **פרודקשן** `https://swing-edge.com`, פרופיל mobile/simulated.
· **אינטראקציה** — build פרודקשן מוגש ב-`vite preview` על `localhost:4173`, Chromium headless, 500 עסקאות סינתטיות ב-`localStorage`.
· **API** — `curl` מול פרודקשן.
**⛔ פרודקשן לא שונתה.** כל הכתיבה הייתה ל-`localStorage` בפריוויו מקומי ול-`/tmp`.

---

## מנייה

| # | חומרה | אתר | כותרת | תלות |
|---|--------|-----|--------|-------|
| E-01 | **P1** | `vite.config.js` (`manualChunks`) + `dist/index.html` | `react-dom` נכלא בתוך chunk של `recharts` ו-`react` בתוך `sentry` — React ⛔ אינו יכול לרוץ לפני 750 kB של גרפים ודיווח שגיאות, **גם בדף הנחיתה** | — |
| E-02 | **P1** | `SwingEdge_App.jsx:36` → `src/components/ImportJournalModal.jsx:4` → `src/import/parseFile.js:7-8` | `xlsx`+`papaparse` = **377.4 kB raw (24.6% מה-chunk הראשי)** במסלול הקריטי של כל מבקר; אתר `lazy` **אחד בלבד** בכל הריפו, והוא ⛔ אינו זה | E-01 |
| E-03 | **P1** | `SwingEdge_App.jsx:5126-5149` | בחירת שורה ביומן עולה **122.7 ms סינכרוני ב-500 עסקאות** ומשנה **3 צמתי DOM** — כל 500 השורות מרונדרות מחדש, בשני עצים במקביל | — |
| E-04 | **P2** | `SwingEdge_App.jsx:5277,5280` | ה-`memo` שב-`MobileTradeCard.jsx:172` **מנוטרל** ע"י props של פונקציות inline באתר הקריאה | E-03 |
| E-05 | **P2** | `vercel.json` (היעדר) | נכסים עם hash בשם מוגשים `max-age=0, must-revalidate` — 5/5 revalidate בכל ניווט | — |
| E-06 | **P2** | `dist/index.html` (head) | שני מקורות פונטים חיצוניים חוסמי-רינדור עולים **1,745 ms מתוך 2,530** תמורת 3.9 kB CSS | — |
| E-07 | **P2** | `vercel.json` (אין `regions`) | edge ב-Frankfurt, **compute ב-us-east** לאפליקציה ישראלית; cold start נמדד **+962 ms** | — |
| E-08 | **P2** | `src/components/AuthScreen.jsx:438` | ה-`addEventListener` **היחיד** בריפו בלי `remove` — מחזיק closure על script קבוע ב-`document.head` | — |
| E-09 | **P3** | `dist/index.html` (gtag) | `gtag.js` = **172 kB · 42% לא בשימוש · 169 ms bootup**, נטען ללא תלות בהסכמה | D-01 → פאזה H |

**מנייה: P0 = 0 · P1 = 3 · P2 = 5 · P3 = 1 · סה"כ 9 · נקי = 7**

**⛔ אין P0 בפאזה הזו, וזו מדידה ולא ויתור:** שום ממצא כאן ⛔ אינו גורם למשתמש לראות **מספר שגוי**, ⛔ אינו פרצת אבטחה ו⛔ אינו אובדן נתונים. איטיות היא איטיות.

**נקי (נמדד, ⛔ לא הונח):**
`E-N1` **אין `moment`** באף chunk; `lodash` קיים **רק טרנזיטיבית בתוך `recharts`** (36.0 kB) ו⛔ אינו תלות ישירה.
`E-N2` **9 `setInterval` מול 9 `clearInterval`** — 12/12 קבצים מאוזנים ב-`SwingEdge_App.jsx` (9/9).
`E-N3` **CLS = 0** בפרודקשן mobile — ⛔ אין קפיצות פריסה.
`E-N4` **server-response = 60 ms** — השרת ⛔ אינו צוואר הבקבוק; המשקל הוא.
`E-N5` **`modulepreload` עובד** — 4 ה-chunks של האפליקציה נמשכים במקביל.
`E-N6` **ה-commit ל-DOM מינימלי** — MutationObserver מדד **3 רשומות · 3 צמתים** לקליק גם ב-500 עסקאות. המימואיזציה של ה**פלט** תקינה; הבזבוז הוא **במעלה הזרם**.
`E-N7` **הזיכרון חוזר** — heap טיפס ל-**72 MB** במהלך 16 קליקים ב-500 עסקאות וחזר ל-**26.6 MB** במנוחה ⇒ ⛔ אין הצטברות באותו מסלול.

**⛔ לא נמדד — מגבלת כלי, ⛔ לא ממצא:** ראה §"מה לא ניתן היה למדוד" בסוף.
**↩️ חזרה בי משתי טענות מוקדמות של האבחון עצמו:** ראה §"תיקון מכשיר" בסוף. ⛔ אין להשתמש במספרים שנמשכו משם.

---

## E-01 · **P1** · `vite.config.js` (`manualChunks`) + `dist/index.html`

**מה נמדד.** ייחוס בייטים לפי sourcemap (VLQ, סגמנט מחזיק את העמודות מעצמו ועד הסגמנט הבא), על ה-build עם ה-sourcemaps:

```
=== recharts-BsRpwJDZ.js ===  totalBytes=553458 (540.5 kB)  unattributed=0.3%
   259.7  48.1%   npm:recharts
   127.9  23.7%   npm:react-dom      ← React DOM יושב כאן
    36.0   6.7%   npm:lodash
=== sentry-Dj8z5und.js ===    totalBytes=197493 (192.9 kB)  unattributed=0.5%
   119.9  62.2%   npm:@sentry/browser
    62.1  32.2%   npm:@sentry/browser-utils
     6.4   3.3%   npm:react          ← React עצמו יושב כאן
```

ושלושתם נטענים **סטטית** בכל דף, מ-`dist/index.html`:

```
<script type="module" crossorigin src="/assets/index-C1E4LHcf.js">
<link rel="modulepreload" crossorigin href="/assets/sentry-Dj8z5und.js">
<link rel="modulepreload" crossorigin href="/assets/recharts-BsRpwJDZ.js">
<link rel="modulepreload" crossorigin href="/assets/date-fns-D-lZSzxs.js">
```

משקל כולל שנשלח (מדוד, `gzip -c | wc -c`):

| נכס | raw | gzip |
|-----|-----|------|
| `index-C1E4LHcf.js` | 1,642,226 | 490,622 |
| `recharts-BsRpwJDZ.js` | 553,418 | 156,092 |
| `sentry-Dj8z5und.js` | 197,451 | 66,127 |
| `date-fns-D-lZSzxs.js` | 22,587 | 6,464 |
| `AdminPanel-DdTxwvTc.js` (lazy) | 61,319 | 16,560 |
| `index-DL1LuIfv.css` | 109,285 | 19,351 |
| **JS סה"כ** | **2,477,001 (2,419 kB)** | **734,814 (717 kB)** |

**שורש הבעיה (⛔ לא הסימפטום).** ההערה ב-`vite.config.js` מצהירה שהפיצול קיים כדי ש-
*"each vendor caches independently"*. `manualChunks` מונה **עלים בלבד** (`recharts` · `@sentry/react` · `date-fns`), ו-Rollup משייך תלות **משותפת** ל-chunk שמשך אותה ראשון. התוצאה הפוכה מהכוונה: `react-dom` נבלע לתוך `recharts` ו-`react` לתוך `sentry`, ומכיוון ששני ה-chunks מיובאים סטטית — **אין דף באפליקציה שיכול לרנדר לפני שהורדו ונותחו 750 kB של קוד גרפים ודיווח שגיאות**, כולל דף הנחיתה שאין בו ולו גרף אחד. זה בדיוק מה שמייצר `unused-javascript` של 528 KiB (E-02).

**התיקון הזול והלא-הרסני.** להוציא את `react`/`react-dom`/`react-router` ל-chunk `vendor-react` מפורש ב-`manualChunks`, כך ש-`recharts` ו-`sentry` מפסיקים להיות המחזיקים שלהם.

**⛔ מה אסור בתיקון.** ⛔ **אין לבטל את `manualChunks` כליל** — אז הכול חוזר ל-chunk אחד ענק והבעיה גדלה. ⛔ **אין להסיר את `modulepreload`** — `E-N5` מדד שהוא עובד ומקביל את המשיכות; הבעיה היא **מה** מקדימים, ⛔ לא ה-preload.

---

## E-02 · **P1** · `SwingEdge_App.jsx:36` → `ImportJournalModal.jsx:4` → `src/import/parseFile.js:7-8`

**מה נמדד.** ייחוס ה-chunk הראשי, 262 מקורות, 0.2% לא-מיוחס:

```
chunk=index-C1E4LHcf.js  totalBytes=1572493 (1535.6 kB)
   357.9  23.3%   npm:xlsx           ← גדול מקובץ האפליקציה עצמו
   249.9  16.3%   app:SwingEdge_App.jsx
    98.9   6.4%   app:src/i18n.js
    97.5   6.3%   npm:@supabase/auth-js
    74.6   4.9%   app:src/data/tooltips.js
    55.8   3.6%   app:src/components/LandingPage.jsx
    19.5   1.3%   npm:papaparse
```

שרשרת הייבוא, סטטית לכל אורכה:

```
SwingEdge_App.jsx:36   import ImportJournalModal from "./src/components/ImportJournalModal.jsx";
ImportJournalModal.jsx:4  import { parseFile } from "../import/parseFile.js";
parseFile.js:7-8          import Papa from "papaparse";  import * as XLSX from "xlsx";
```

וספירת אתרי הפיצול בכל הריפו:

```
=== dynamic import() sites ===
SwingEdge_App.jsx:34: const AdminPanel = lazyWithRetry(() => import("./src/components/AdminPanel.jsx"));
```

**סך אתרי `import()` הדינמי בכל `SwingEdge_App.jsx` + `src/` (כל קוד המוצר) = 1**, והוא `AdminPanel`. ⛔ זהו מספר מוחלט, ⛔ לא שיעור.

**שורש הבעיה.** `xlsx` (357.9 kB) + `papaparse` (19.5 kB) = **377.4 kB raw, 24.6% מה-chunk הראשי**, נדרשים אך ורק כאשר משתמש פותח את מודאל ייבוא היומן. הם במסלול הקריטי כי המודאל מיובא סטטית מהשורש. `xlsx` לבדו **גדול יותר מכל `SwingEdge_App.jsx`** (357.9 מול 249.9 kB). Lighthouse מודד את התוצאה ישירות: **70% מה-chunk הראשי לא בשימוש** בטעינה.

**התיקון הזול והלא-הרסני.** להפוך את `ImportJournalModal` ל-`lazyWithRetry` — התשתית **כבר קיימת** ב-`SwingEdge_App.jsx:16-34` ומשמשת את `AdminPanel`, כולל retry.

**⛔ מה אסור בתיקון.** ⛔ **אין להחליף את `xlsx` בפרסר "קליל"** — `src/import/` נשען עליו לקריאת גיליונות מרובים והחלפה היא שינוי במסלול כתיבה (`test:import` + `test:write`), ⛔ לא אופטימיזציה. ⛔ **אין לפצל את `parseFile.js` עצמו** — הוא נקרא גם מ-harness ה-Node של הבדיקות; הגבול הנכון הוא המודאל.

---

## E-03 · **P1** · `SwingEdge_App.jsx:5126-5149`

**מה נמדד.** אותו מכשיר בדיוק, אותה סשן, שלוש אוכלוסיות. חציון של 16 דגימות (select+deselect × 8 שורות):

| עסקאות | חציון קליק | טווח | צמתי DOM | צמתים/עסקה |
|--------|------------|------|-----------|-------------|
| 10 | **2.9 ms** | 2.2–8.3 | 845 | — |
| 100 | **24.1 ms** | 20.3–32.9 | 5,997 | 57.2 |
| 500 | **122.7 ms** | 102.7–130.1 | 28,824 | 57.1 |

**הקנה-מידה ליניארי:** 0.236 ms/שורה בקטע 10→100, 0.246 ms/שורה בקטע 100→500.

MutationObserver סביב קליק בודד ב-500 עסקאות:

```json
{ "syncMs": 111.6, "mutationRecords": 3, "distinctNodesTouched": 3,
  "kinds": { "childList": 1, "attributes": 2 }, "domNodes": 28829 }
```

**הניסוי המכריע — מה בדיוק גורר את העלות.** עם **500 עסקאות ב-state ללא שינוי**, סינון לפי טיקר צמצם את השורות ה**מרונדרות** ל-50:

| מצב | עסקאות ב-state | שורות מרונדרות | חציון קליק |
|-----|----------------|------------------|-------------|
| ללא סינון | 500 | 500 | **122.7 ms** |
| מסונן ל-`IONQ` | **500** | **50** | **15.7 ms** |

ירידה של **87%** בזמן שמערך העסקאות ⛔ לא השתנה ⇒ העלות נגזרת מ**שורות מרונדרות**, ⛔ לא מגודל המערך.

**שורש הבעיה (⛔ לא הסימפטום).** ב-`SwingEdge_App.jsx:5126` השורות נבנות inline בתוך ה-JSX של קומפוננטת האב:

```jsx
5126  {sortedFilteredTrades.map(t => {
5127    const { pnl, rMultiple } = calcTradeMetrics(t);
5130    const isSelected = selectedTrades.has(t.id);
5131    // נגזר ברינדור, ⛔ לעולם לא נשמר. `strategy` נעדר → stale=false.
5132    const hz = horizonState(t, { strategy: userProfile?.strategy });
```

**⛔ אין כאן קומפוננטת-שורה, ולכן ⛔ אין למה להצמיד `memo`.** כל שינוי state באב — וה-`onChange` של תיבת הסימון ב-`:5140` הוא בדיוק כזה — מריץ מחדש את כל ה-`map`, כולל **500 קריאות `calcTradeMetrics` (`:5127`) ו-500 קריאות `horizonState` (`:5132`)**, כדי לשנות **3 צמתי DOM**. זה בדיוק המצב ש-CLAUDE.md §13 (אנטי-flicker) מזהיר מפניו, בגרסה חמורה יותר: שם הקומפוננטה מוגדרת בתוך render, כאן היא ⛔ אינה קיימת בכלל.

**מכפיל שני, נמדד.** שני העצים מרונדרים **בו-זמנית**. ב-500 עסקאות: `input[aria-label="בחר עסקה"]` = **1,000** (500 טבלה + 500 כרטיסי מובייל), ובמצב המסונן 100 (50+50). `getComputedStyle` על מיכל הטבלה החזיר `display: "none"` בעוד 50 שורותיו ⛔ עדיין ב-DOM. `hidden md:block` / `md:hidden` הם **CSS בלבד** — React מרנדר ומיישב את שני העצים בכל viewport. מכאן 57 צמתי DOM לעסקה.

**מה זה אומר למשתמש.** ב-500 עסקאות, כל סימון שורה מקפיא את הממשק ל-~0.12 s **במכשיר הפיתוח**. הקנה-מידה ליניארי ⇒ 1,000 עסקאות ≈ 0.25 s, ובמכשיר נייד איטי פי 4 זה עובר את סף "נשבר".

**התיקון הזול והלא-הרסני.** לחלץ את גוף ה-`map` לקומפוננטת `TradeRow` ב-module scope עטופה ב-`memo`, בדיוק כפי ש-`MobileTradeCard` כבר בנוי — **וגם** לתקן את `E-04`, אחרת התיקון יהיה inert מאותה סיבה.

**⛔ מה אסור בתיקון.** ⛔ **אין להכניס virtualization כצעד ראשון** — הוא מסתיר את העלות במקום להסירה, שובר את `data-testid="journal-table"` שעליו Sentinel נשען (`B-146`), ומייצר מסך שאי-אפשר לחפש בו ב-Ctrl+F. ⛔ **אין להעביר את `calcTradeMetrics`/`horizonState` לשדות שמורים בעסקה** — שתיהן גזירות בזמן קריאה **בכוונה** (`test:instrument` בלוק 9 חוסם עמודת DB נגזרת; ההערה ב-`:5131` אומרת זאת מפורשות).

**תלות.** התיקון חייב לכלול את `E-04`.

---

## E-04 · **P2** · `SwingEdge_App.jsx:5277,5280`

**מה נמדד.** `src/components/MobileTradeCard.jsx` **כן** ממואיזה:

```
1:   import { memo } from "react";
172: export default memo(MobileTradeCardImpl);
```

אבל אתר הקריאה מעביר פונקציות inline, שנוצרות מחדש בכל render של האב:

```jsx
5268  {sortedFilteredTrades.map(t => (
5277    onClose={(tr) => { setClosingTrade(tr); setShowCloseForm(true); }}
5279    isSelected={selectedTrades.has(t.id)}
5280    onToggleSelect={(id, next) => { ... }}
```

**שורש הבעיה.** `memo` משווה props השוואה רדודה. `onClose` ו-`onToggleSelect` הן זהויות חדשות בכל render ⇒ ההשוואה **תמיד** נכשלת ⇒ `memo` ⛔ לעולם אינו חוסך render, לאף כרטיס. ההגנה קיימת בקוד ו**אינרטית בפועל** — וזו הצורה המסוכנת יותר, כי קריאה שטחית של `MobileTradeCard.jsx` מראה `memo` ומרגיעה.

**התיקון הזול והלא-הרסני.** לעטוף את שני ה-handlers ב-`useCallback` עם תלויות יציבות (הם כבר משתמשים ב-`setSelectedTrades(prev => …)` ולכן ⛔ אינם תלויים ב-`selectedTrades`).

**⛔ מה אסור בתיקון.** ⛔ **אין להסיר את `memo`** בטענה ש"הוא לא עוזר" — הוא לא עוזר **כי** ה-props שבורים; הסרתו מנציחה את העלות.

**תלות.** `E-03`.

---

## E-05 · **P2** · `vercel.json` (היעדר כלל `Cache-Control`)

**מה נמדד.** פרודקשן, 4/4 נכסים כולל שלושה עם hash תוכן בשם:

```
=== /assets/index-vp1EnWy1.js ===   cache-control: public, max-age=0, must-revalidate   x-vercel-cache: HIT
=== /assets/recharts-BsRpwJDZ.js === cache-control: public, max-age=0, must-revalidate   x-vercel-cache: HIT
=== /assets/index-DL1LuIfv.css ===  cache-control: public, max-age=0, must-revalidate   x-vercel-cache: HIT
=== / ===                            cache-control: public, max-age=0, must-revalidate   x-vercel-cache: HIT
```

**שורש הבעיה.** `vercel.json:2-3` מגדיר `buildCommand` ו-`outputDirectory` מפורשים, ולכן Vercel מתייחס לפרויקט כסטטי גנרי ו⛔ אינו מחיל את כותרות ה-`immutable` של פריסט Vite; ובלוק `headers` שב-`vercel.json:9-21` נושא כותרות אבטחה בלבד ו⛔ אינו מפצה. התוצאה: קובץ ששמו **כבר** נושא את ה-hash של תוכנו — כלומר ⛔ אינו יכול להשתנות לעולם — מקבל revalidate בכל ניווט. ההערה ב-`vite.config.js` על *"each vendor caches independently"* מובסת כאן פעם שנייה, הפעם ע"י כותרת.

**התיקון הזול והלא-הרסני.** כלל `headers` ל-`/assets/(.*)` עם `public, max-age=31536000, immutable`.

**⛔ מה אסור בתיקון.** ⛔ **אסור בתכלית האיסור להחיל `immutable` על `/index.html`** — `index.html` הוא הקובץ **היחיד** שמצביע על ה-hashes החדשים; הקפאתו הופכת את בעיית ה-chunk המיושן של `B-164` לקבועה ובלתי-הפיכה עבור כל דפדפן שכבר קיבל את הכותרת.

---

## E-06 · **P2** · `dist/index.html` (head)

**מה נמדד.** Lighthouse mobile מול פרודקשן, פירוט `render-blocking-resources` (סה"כ 2,530 ms):

```
  964ms    2813B  https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre...
  781ms    1104B  https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700
  316ms   19672B  https://swing-edge.com/assets/index-DL1LuIfv.css
```

ומדדי הליבה באותה ריצה:

| מדד | ערך |
|-----|------|
| Performance score | **54** |
| FCP | **7.0 s** |
| LCP | **9.2 s** |
| Speed Index | 8.6 s |
| TTI | 9.2 s |
| TBT | 190 ms |
| CLS | **0** |
| server-response | **60 ms** |
| unused-javascript | **528 KiB** |
| main-thread work | 1.7 s |

**שורש הבעיה.** **1,745 ms מתוך 2,530 (69%) הם שני מקורות חיצוניים נוספים** שמספקים יחד **3,917 בייט** של CSS. העלות ⛔ אינה הבייטים — היא DNS+TLS+handshake לשני origins שהדפדפן טרם פגש, על החוט הקריטי לפני הפיקסל הראשון. הצירוף `TBT 190 ms` מול `FCP 7.0 s` מוכיח את זה: המעבד ⛔ אינו העומס, **ההמתנה לרשת היא**.

**התיקון הזול והלא-הרסני.** `<link rel="preconnect">` לארבעת מקורות הפונטים בראש ה-`<head>` — משנה סדר, ⛔ לא תוכן.

**⛔ מה אסור בתיקון.** ⛔ **אין להסיר את הפונטים** — `Frank Ruhl Libre` ו-`Heebo` הם הטיפוגרפיה העברית של המוצר; זו החלטת מוצר, ⛔ לא נטל ביצועים.

---

## E-07 · **P2** · `vercel.json` (אין מפתח `regions`)

**מה נמדד.**

```
x-vercel-id: fra1::iad1::dgdt9-1787763050829-4732690adc7b
```

הפורמט הוא `[edge region]::[compute region]::[id]` ⇒ **edge בפרנקפורט, compute בוושינגטון (us-east-1)**. `grep` על `vercel.json` מחזיר `buildCommand` ו-`outputDirectory` בלבד — **⛔ אין מפתח `regions`**, ולכן נבחר ברירת המחדל `iad1`.

**זמנים (6 קריאות רצופות ל-`/api/fx`, כולן 200):** 0.226 · 0.234 · 0.222 · 0.274 · 0.269 · 0.216 s ⇒ חציון חם ≈ **0.23 s**.
**cold start** נמדד קודם באותו אבחון: **1.185 s** מול 0.223 s חם ⇒ **+962 ms**. ⚠️ **תצפית בודדת** — cold start ⛔ אינו ניתן לזימון לפי דרישה, ולכן המספר מדווח עם תנאיו ו⛔ לא כחציון.

**שורש הבעיה.** קהל היעד ישראלי (המוצר עברית-ראשית), ה-edge כבר בפרנקפורט, וה-compute חוצה אוקיינוס בכל קריאה שאינה במטמון.

**התיקון הזול והלא-הרסני.** `"regions": ["fra1"]` ב-`vercel.json`.

**⛔ מה אסור בתיקון.** ⛔ **אין לשנות אזור בלי לוודא את מיקום פרויקט ה-Supabase** — פונקציה ב-`fra1` מול DB ב-`us-east` מזיזה את ההשהיה במקום להסירה. המדידה הזו ⛔ לא בוצעה כאן ⇒ **פריט לפאזה G**.

---

## E-08 · **P2** · `src/components/AuthScreen.jsx:438`

**מה נמדד.** ספירה גולמית על `SwingEdge_App.jsx` + `src/`:

```
setInterval:  9     clearInterval: 9
addEventListener:    33     removeEventListener: 32
```

וזיווג **לפי קובץ** מבודד את החריג היחיד — 1 מתוך 12 קבצים:

```
ok       SwingEdge_App.jsx 9 9
ok       src/components/LandingPage.jsx 5 5
MISMATCH src/components/AuthScreen.jsx 1 0
ok       src/components/ui/SmartSelect.jsx 5 5
ok       src/components/ui/InfoTooltip.jsx 4 4
... (7 קבצים נוספים מאוזנים)
```

הקוד ב-`:427-447`:

```js
if (window.turnstile) { render(); }
else {
  let script = document.querySelector(`script[src="${SRC}"]`);
  if (!script) { script = document.createElement("script"); ... document.head.appendChild(script); }
  script.addEventListener("load", render);      // :438 — ⛔ אף פעם לא מוסר
}
return () => {
  cancelled = true;
  try { if (widgetId && window.turnstile) window.turnstile.remove(widgetId); } catch {}
};
```

**שורש הבעיה.** ה-cleanup מגן על ה**אפקט** דרך `cancelled`, אבל ה-listener נשאר על ה-script — שנשאר ב-`document.head` לצמיתות — ומחזיק את ה-closure `render` ואת כל מה שהוא לוכד. **הדליפה חסומה ⛔ ואינה בלתי-מוגבלת:** mount שני ואילך נכנס לענף `window.turnstile` ב-`:427` ו⛔ אינו מוסיף listener נוסף.

**התיקון הזול והלא-הרסני.** `script.removeEventListener("load", render)` בתוך ה-cleanup הקיים.

**⛔ מה אסור בתיקון.** ⛔ **אין להסיר את ה-script מ-`document.head`** ב-cleanup — הענף ב-`:427` מניח שהוא נשאר; הסרתו הופכת דליפה חסומה לטעינה חוזרת בכל mount.

**⚠️ ממצא נלווה שאינו ביצועים ועובר לפאזה F:** ל-`:438` יש listener ל-`load` ו-**⛔ אין listener ל-`error`**. script של Cloudflare שנחסם ⇒ `render` ⛔ לעולם לא נקרא ⇒ תיבה ריקה בגובה 65px, ⛔ בלי הודעה. נרשם כאן כדי ש⛔ לא ייפול בין הפאזות.

---

## E-09 · **P3** · `dist/index.html` (gtag)

**מה נמדד.** Lighthouse, `unused-javascript` (סה"כ 528 KiB):

```
 70%  333675  https://swing-edge.com/assets/index-vp1EnWy1.js
 67%  104584  https://swing-edge.com/assets/recharts-BsRpwJDZ.js
 42%   71473  https://www.googletagmanager.com/gtag/js?id=G-VC8PKL4NL1
 52%   31386  https://swing-edge.com/assets/sentry-Dj8z5und.js
```

`gtag.js` = 172 kB, `bootup-time` 169 ms, והוא ב-`<head>` של `index.html` **ללא תלות בהסכמה**.

**שורש הבעיה.** ⛔ **לא בעיית ביצועים בעיקרה.** המשקל הוא סימפטום; השאלה למה סקריפט אנליטיקה נטען לפני שנתנה הסכמה היא שאלת פרטיות.

**התיקון + מה אסור בו.** ⛔ **⛔ אין לגעת בזה בפאזה E.** מועבר במלואו לפאזה H יחד עם `D-01`.

**תלות.** `D-01`.

---

## ⛔ מה לא ניתן היה למדוד — מגבלת כלי, ⛔ לא ממצא

**E2 · מגמת heap לאורך סשן ארוך.** הפריוויו רץ headless וה-דף **קבוע `hidden`**:

```json
{ "hidden": true, "visibilityState": "hidden", "hasFocus": false }
```

לכן `setTimeout` מווסת ברקע: בדיקת מחזורי ניווט שתוכננה ל-60 קליקים ב-7.2 s התקדמה **8 צעדים ב-~35 s**. ⛔ **אין להסיק "אין דליפה"** מכך ש-`E-N7` מדד חזרה של heap — `E-N7` מכסה מסלול **אחד** (קליקים ביומן), ⛔ לא סשן ארוך עם מעברי טאבים.
⚠️ המדידות הסינכרוניות ב-`E-03` ⛔ **אינן** מושפעות — הן נמדדות **בתוך** dispatch ו⛔ אינן נשענות על טיימר. אם כבר, מצב `hidden` מרגיע פולינג רקע ⇒ 122.7 ms הוא **חסם תחתון**.
⇒ **שורה ב-`CHECKS`.**

**E5 · שחזור cold start.** ⛔ אינו ניתן לזימון; תצפית אחת בלבד (E-07).

**מיקום Supabase מול אזור ה-compute.** ⛔ לא נמדד ⇒ פאזה G.

**⚠️ הערת דיוק על ה-hashes.** ייחוס הבייטים בוצע על build מקומי (`index-C1E4LHcf.js`) בעוד פרודקשן מגישה `index-vp1EnWy1.js`. `recharts` · `sentry` · `date-fns` · ה-CSS נושאים hash **זהה** בשניהם ⇒ תוכן זהה. ה-chunk הראשי בלבד נבנה מקומית ⇒ אחוזי הייחוס שלו מתייחסים ל-build המקומי ב-`a70d73a`.

---

## ↩️ תיקון מכשיר — שתי טענות של האבחון עצמו נמשכות בזאת

**§2 של CLAUDE.md דורש הוכחה, ⛔ לא עקביות עם מה שכבר נאמר.** שתי טענות מוקדמות שלי בפאזה הזו לא שרדו מדידה חוזרת, ומתועדות כאן כדי ש⛔ לא ייכנסו ל-`DEEP-SUMMARY`:

**1 · "קנה מידה סופר-ליניארי ~n^1.7" — נמשך.** נגזר מ-13.1 ms ב-10 עסקאות ו-358.8 ms ב-500. מדידה חוזרת נקייה, סשן אחד ומכשיר אחד: **2.9 / 24.1 / 122.7 ms**. 0.236 מול 0.246 ms לשורה בשני הקטעים ⇒ **ליניארי**. ה-358.8 ms ⛔ **לא שוחזר** ו⛔ אינו מדווח. ה-13.1 ms היה זיהום warm-up — הדגימות הגולמיות ב-10 עסקאות פותחות ב-`8.3, 7.2` ומתייצבות סביב 2.7 (חציון 16 דגימות = 2.9).

**2 · "העלות גדלה עם גודל אוסף הנבחרים" — הופרכה.** ההשערה נבדקה בשני זרועות ב-500 עסקאות:

| זרוע | תנאי | דגימות | חציון |
|------|-------|---------|--------|
| A — מבודדת | הבחירה מתאפסת לפני כל קליק (`selBefore`=0 ב-8/8) | 16 | **122.0 ms** |
| B — מצטברת | הבחירה גדלה 0→15 | 16 | **123.0 ms** |

זרוע B, לפי סדר: 116.6 · 121.8 · 123.8 · 130.3 · 100.0 · 127.3 · 123.5 · 121.5 · 132.4 · 109.6 · 127.3 · 122.5 · 121.4 · 123.4 · 110.4 · 128.6 — **⛔ אין מגמה**. חתימת `selectedIds.includes(id)` בתוך `map` ⛔ **אינה** ההסבר; `selectedTrades` הוא `Set` ו-`:5130` משתמש ב-`.has()`. ההסבר האמיתי הוא `E-03`: **מספר השורות המרונדרות**, ⛔ לא גודל הבחירה.

**הלקח, ולא בפעם הראשונה באבחון הזה:** סטייה בלתי-מוסברת בין שתי מדידות היא **חשד נגד המכשיר לפני שהיא ממצא נגד המוצר**.

---

## מה נדרש להיכנס למרשם (⛔ רישום בלבד, בפאזת הסיכום)

`E-01` · `E-02` · `E-03` · `E-04` · `E-05` · `E-06` · `E-07` · `E-08` — 8 פריטים חדשים ל-`BACKLOG`.
`E-09` — ⛔ אינו פריט עצמאי; מתמזג לפאזה H מול `D-01`.
`CHECKS` — מגמת heap בסשן ארוך (⛔ לא נמדדה, מגבלת כלי).
פאזה G — מיקום פרויקט Supabase מול אזור compute (תלוי ב-`E-07`).
פאזה F — היעדר listener ל-`error` על script ה-Turnstile (`AuthScreen.jsx:438`).

---

## ניקיון

`dist/` נבנה מחדש (gitignored). מחוץ לריפו: `/tmp/deepe-dist` · `/tmp/deepe-attrib.mjs` · `/tmp/lh-mobile.json` · `/tmp/deepe-wire` · `/tmp/adds.txt` · `/tmp/rems.txt`.
הפריוויו ב-`localhost:4173` מחזיק **500 עסקאות סינתטיות** ב-`localStorage` — מפתח העזר `__deepe_backup` והגלובל `window.__deepe` **הוסרו**.
**⛔ פרודקשן לא שונתה. 0 קבצי קוד שונו.**
