# B-415 — שדה מחיר מאבד ערך ב-WebKit · אבחון read-only

**10.10.2026 · רמה: T3** (תשובות §15: לא · כן · לא · כן · כן) · HEAD `9cea2b7` · ⛔ אפס תיקון בגל הזה (§8.1).
ראיות: [`B415-WEBKIT-DIAGNOSIS-2026-10-10/`](B415-WEBKIT-DIAGNOSIS-2026-10-10/) — `diag.mjs` (ה-harness) · `results.json` (28 תאים × 30, יומן אירועים לכל ניסיון שאבד).

## פסק דין

**השורש בקוד המוצר; ההשלכה הנצפית היחידה היא קלט במהירות-מכונה בתוך הפריים הראשון אחרי פתיחת מודאל.**
⛔ **לא נמצא אובדן ערך בקצב אנושי: `0/120`.**

`src/hooks/useModalA11y.js:50-51` — כשמודאל נפתח, `focusFirst()` רץ **סינכרונית** ושוב בתוך
`requestAnimationFrame`, **בלי תנאי**. הרכיב הראשון שמקבל פוקוס הוא כפתור ה-X בכותרת (`aria-label="סגור"`).
אם קלט הגיע לשדה **לפני** ה-rAF, ה-rAF חוטף את הפוקוס ממנו, וכל מה שנשאר להקליד נוחת על הכפתור.

- **`fill` של Playwright** = פוקוס → `insertText`, בשתי הודעות פרוטוקול. rAF שנוחת ביניהן ⇒ הטקסט נוחת
  על הכפתור. בשדה ⛔ מגיע אף `beforeinput`/`input`; הערך ⛔ הופיע לעולם; אותו node בדיוק. **זו החתימה
  של CI** (`<input value="" id="close-exit">` אחרי 33 ניסיונות).
- **הקלדה אמיתית** (`pressSequentially`) מאבדת **יותר**, לא פחות: היא נמשכת עשרות מ״ש ולכן החלון רחב
  יותר. כל מקש שאבד נרשם עם `target = BUTTON[סגור]`.

⚠️ **לפי לשון המבחין בפרומפט (2b, «אובד גם בהקלדה ⇒ באג מוצר») — זה מוצר.** מה שמסווג מחדש את ההשלכה
הוא זרוע `human`: המתנה של 300ms (פחות מזמן תגובה אנושי לראות מודאל ולגעת) + `tap` + הקלדה ב-30ms
למקש ⇒ **`0/30` בכל תא, `0/120` בסה״כ.** ה-rAF נורה **5–85ms** אחרי פתיחת המודאל (נמדד, ראה 2e),
ואדם ⛔ יכול לגעת בשדה ולהקליד בתוך פריים אחד מהופעת המודאל.

## הנחות הפרומפט — נמדדו

| הנחה | נמצא |
|------|------|
| «בקוד לא נמצא מסלול שמנקה» | ✅ נכון, ו⛔ אין צורך בכזה: הערך **לעולם לא נכנס**. ⛔ remount (`0/840`), ⛔ «הופיע ונמחק» (`0/29` שדות שאבדו) |
| «רק WebKit» | ⚠️ נמדד WebKit בלבד. ⛔ נמדד Chromium. המנגנון (rAF בין שתי הודעות פרוטוקול) אינו ספציפי למנוע; ⛔ נטען |
| «מועמד מוביל לבעיית המשפך (iOS = 33% מהתקועים, M-023)» | ⛔ **מופרך משני כיוונים.** (1) `M-023` עצמו: iOS בקרב התקועים **`16/49` = `33%`** = iOS בכלל המשתמשים עם session **`20/60` = `33%`** ⇒ ⛔ אין עודף iOS להסביר. (2) המנגנון ⛔ פוגע בקצב אנושי (`0/120`) |
| «Entry · Exit — 2 שדות» | ⚠️ **3:** גם `#log-ticker` חשוף (ראה «ניסוי טבעי») |

## שחזור — `x/30` לכל תא

**סביבות:** `mac` = Playwright WebKit 26.5 (`webkit-2311`) על macOS · `linux` = `mcr.microsoft.com/playwright:v1.61.1-noble`
(**התמונה של CI**, ⚠️ arm64 דרך colima ⇒ אותו מקור WebKit, ⛔ אותם בייטים כמו ה-amd64 של GitHub).
**מכשיר:** `devices["iPhone 14"]` · **אפליקציה:** `git archive 9cea2b7`, נבנתה מול Supabase סינתטי (`tests-eye/hermetic.js`).
**`norAF`** = אותו עץ, השורה `const raf = requestAnimationFrame(focusFirst);` ⇒ `const raf = 0;` (בסקראץ' בלבד).

| מצב | מה הוא עושה |
|-----|-------------|
| `fill` | `locator.fill()` מיד אחרי הלחיצה שפותחת — **כמו `cents.spec` היום** |
| `type` | `pressSequentially()` מיד אחרי הפתיחה — **הקלדה אמיתית, מקש-מקש** (2b) |
| `human` | 300ms · `tap()` · `keyboard.type` ב-30ms למקש |
| `rafFill` | שני rAF ואז `fill` (2e) |
| `fillLoaded` | `fill`, כשמשימה ארוכה של 25ms רצה ב-focusin של השדה — ⚠️ **סימולציה** של runner עמוס, ⛔ שינוי באפליקציה |
| `rafFillLoaded` | שני rAF ואז `fillLoaded` |

| שדה | מצב | בנייה | סביבה | אבד | ⛔ הופיע | remount | טיקר אבד | מקשים תועים |
|-----|-----|-------|-------|-----|---------|---------|-----------|-------------|
| close | fill | head | linux | **0/30** | — | 0/30 | — | 0/30 |
| close | fill | head | mac | **2/30** | 2/2 | 0/30 | — | 0/30 |
| close | fill | norAF | linux | **0/30** | — | 0/30 | — | 0/30 |
| close | fill | norAF | mac | **0/30** | — | 0/30 | — | 0/30 |
| close | type | head | linux | **12/30** | 12/12 | 0/30 | — | 12/30 |
| close | type | head | mac | **7/30** | 7/7 | 0/30 | — | 7/30 |
| close | type | norAF | linux | **0/30** | — | 0/30 | — | 0/30 |
| close | type | norAF | mac | **0/30** | — | 0/30 | — | 0/30 |
| close | human | head | linux | **0/30** | — | 0/30 | — | 0/30 |
| close | human | head | mac | **0/30** | — | 0/30 | — | 0/30 |
| close | rafFill | head | linux | **0/30** | — | 0/30 | — | 0/30 |
| close | rafFill | head | mac | **0/30** | — | 0/30 | — | 0/30 |
| close | fillLoaded | head | linux | **7/30** | 7/7 | 0/30 | — | 0/30 |
| close | fillLoaded | head | mac | **1/30** | 1/1 | 0/30 | — | 0/30 |
| close | fillLoaded | norAF | linux | **0/30** | — | 0/30 | — | 0/30 |
| close | fillLoaded | norAF | mac | **0/30** | — | 0/30 | — | 0/30 |
| close | rafFillLoaded | head | linux | **0/30** | — | 0/30 | — | 0/30 |
| close | rafFillLoaded | head | mac | **0/30** | — | 0/30 | — | 0/30 |
| entry | fill | head | linux | **0/30** | — | 0/30 | 0/30 | 0/30 |
| entry | fill | head | mac | **0/30** | — | 0/30 | 0/30 | ⛔ נמדד |
| entry | fill | norAF | linux | **0/30** | — | 0/30 | 0/30 | 0/30 |
| entry | type | head | linux | **0/30** | — | 0/30 | 0/30 | 0/30 |
| entry | type | head | mac | **0/30** | — | 0/30 | **17/30** | 17/30 |
| entry | type | norAF | linux | **0/30** | — | 0/30 | 0/30 | 0/30 |
| entry | type | norAF | mac | **0/30** | — | 0/30 | 0/30 | 0/30 |
| entry | human | head | linux | **0/30** | — | 0/30 | 0/30 | 0/30 |
| entry | human | head | mac | **0/30** | — | 0/30 | 0/30 | 0/30 |
| entry | rafFill | head | mac | **0/30** | — | 0/30 | 0/30 | 0/30 |

**מקשים תועים** = `keydown` שה-target שלו ⛔ אינו השדה; **בכל** המקרים שנמדדו הוא `BUTTON[סגור]` (כפתור ה-X).
`fill` ⛔ מייצר `keydown` (הוא `insertText`) ⇒ שם האובדן נמדד ב«⛔ הופיע» + יומן הפוקוס.

### סיכומים (מונה/מכנה)

| השוואה | `head` | `norAF` (rAF הוסר) | המתנה לפריים לפני `fill` |
|--------|--------|--------------------|---------------------------|
| close · `fill` | **`2/90`** ¹ | **`0/60`** | **`0/60`** |
| close · `fillLoaded` | **`8/60`** | **`0/60`** | **`0/60`** |
| close · `type` | **`19/60`** | **`0/60`** | — |
| ticker · `type` (בטופס פתיחה) | **`17/60`** | **`0/60`** | — |
| קצב אנושי (`human`, close+entry, שני השדות שלמים) | **`0/120`** | — | — |

¹ `2/90` = `0/30` linux + `2/30` mac (ריצה 2) + `0/30` mac (ריצה 1 — נשמרה **בפלט הקונסול בלבד**: הקובץ שלה
נדרס בטעות בריצת smoke של 2 ניסיונות בקונטיינר; ⛔ נכלל ב-`results.json`).

## 2c — מה קורה בזמן האובדן (יומן אירועים, capture-phase)

**`fill` טבעי, mac · head · close · ניסיון 7** — ⛔ סימולציה, ⛔ עומס:

```
  0.0 focusin  BUTTON[סגור]   ← focusFirst סינכרוני (פתיחת המודאל)
  4.0 focusout BUTTON[סגור]
  4.0 focusin  #close-exit    ← fill: שלב הפוקוס
  5.0 focusout #close-exit    ← ה-rAF של useModalA11y
  5.0 focusin  BUTTON[סגור]   ← ה-insertText נוחת כאן
      (⛔ beforeinput · ⛔ input על #close-exit · final="" · remount=false)
```

**אותו ניסיון כשהוא מצליח (linux · fill · ניסיון 15)** — ה-rAF נוחת **אחרי** ה-input, חוטף את הפוקוס, והערך שורד:

```
  5.0 focusin  #close-exit
  6.0 beforeinput / 7.0 input "100.1247"
 17.0 focusout #close-exit → focusin BUTTON[סגור]
```

**הקלדה אמיתית, mac · head · close · type** — `final="1"`, מקשים תועים: `0 0 . 1 2 4 7 → BUTTON[סגור]`.
**טופס פתיחה, mac · head · entry · type** — `ticker="E"`, מקשים תועים: `Y E P B → BUTTON[סגור]`.

- **remount:** `0/840` ניסיונות (חותמת `data-b415` על ה-node נשמרה בכל דגימה כל 4ms).
- **ספירת רינדורים של הקומפוננטה — ⛔ נמדדה.** ⚠️ **מיותרת כאן:** ה-DOM מראה שאף אירוע קלט ⛔ הגיע לשדה ⇒
  React ⛔ מעורב באובדן (⛔ `onChange` שלא נורה, ⛔ ערך מבוקר שנדרס).

## 2d — השדות עצמם

`#close-exit` (`SwingEdge_App.jsx:8547`) ו-`#log-entry` (`:8182`) הם `<input>` **טקסט**: ⛔ `type="number"`,
⛔ `inputMode`, ⛔ `onBlur`. מבוקרים מ-state; הכותבים היחידים: ה-`onChange` של השדה, `fetchFormQuote` (`:2967`,
ממלא רק כשריק) ו-`handleCloseSubmit` (`:3193`). ⛔ אף אחד מהם ⛔ מעורב — האובדן קורה **לפני** ה-DOM.

## 2e — תזמון

ה-rAF נורה **5–85ms** אחרי הלחיצה שפותחת — בכל היומן שבו החטיפה נראית (כשהפוקוס כבר על ה-X, ה-rAF ⛔ מייצר אירוע). **כל** אובדן היה focusin של השדה **לפני** ה-rAF.
המתנה לפריים לפני `fill` ⇒ **`0/150`** (`rafFill` close mac+linux + entry mac · `rafFillLoaded` close mac+linux) — כולל תחת
העומס המדומה שמפיל `head` ב-`8/60`.

## ניסוי טבעי בהיסטוריית ה-CI

| | לפני `1d54bab` (08.10) | אחרי |
|--|------------------------|------|
| `cents.spec` ממלא Entry | מיד אחרי פתיחת הטופס (ticker → entry → stop → target ברצף) | **אחרי שהציטוט התייצב** (שניות) |
| מופעים | Entry ריק — run `37780897809` | **`0`** מופעי Entry · **`3/3`** המופעים הבאים על `#close-exit` — השדה **היחיד** שעדיין ממולא מיד אחרי פתיחת המודאל שלו |

⚠️ `#log-ticker` עדיין ממולא מיד אחרי פתיחת הטופס (`cents.spec.js:203`) ⇒ חשוף. אובדן שם ייראה כ«the live-quote
panel never appeared» ⛔ ולא כאובדן שדה.

## אתרי `fill` חשופים (WebKit · מיד אחרי פתיחת מודאל)

| קובץ:שורה | שדה | פרויקטים |
|-----------|-----|-----------|
| `tests-eye/cents.spec.js:203` | `#log-ticker` | pixel7 · **iphone14** |
| `tests-eye/cents.spec.js:291` | `#close-exit` | pixel7 · **iphone14** |
| `tests-eye/overlay.spec.js:229` | `#log-ticker` → `#log-target` | **iPhone ×3** · pixel7 · galaxyS8 |
| `tests-eye/hydration.spec.js:154` | `#log-ticker` → `#log-target` | pixel7 · **iphone14** |

⛔ חשופים: `playbook.spec.js:381` (ממלא אחרי העלאת תמונה, שניות אחרי הפתיחה). ⚠️ `tests/eye.spec.js:300` ו-`tests-sentinel/sentinel-auth.spec.js:907`
באותה תבנית, אבל רצים ב-**Chromium בלבד** ⇒ מחוץ לתחום, ⛔ נמדדו.

## ⛔ נמדד

- **iOS פיזי.** הכל אמולציית WebKit של Playwright.
- **שיעור `fill` טבעי על ה-runner האמיתי (amd64 של GitHub).** כאן: `2/90` (mac) · `0/30` (linux arm64). ה-`fillLoaded` הוא **סימולציה** של runner עמוס, ⛔ מדידה שלו.
- **Chromium.**
- **ספירת רינדורים** (ראה 2c — מיותרת).

## ממצאים סביבתיים (§11 — נרשמו, ⛔ תוקנו)

1. **`B-418` ‹R-1›** — `closeForm` ⛔ מאופס ב-Cancel / Escape / X ⛔ ובפתיחה לעסקה אחרת (רק ב-`handleCloseSubmit`, `:3193`) ⇒ Exit · MFE · MAE · Lesson · Exit Reason · Followed Plan שהוקלדו לעסקה A ובוטלו **מופיעים מראש** במודאל הסגירה של עסקה B. **נמדד בטעות:** זרוע `type` הראשונה צברה `10100.1247` → `110100.1247` → … לאורך 30 פתיחות (ה-harness תוקן ל-reload בין ניסיונות).
2. **`B-419` ‹R-6›** — `exitReason` נושא שני ליטרלים לאותה סיבה: `"Hit Target"` (`:1619` · האופציות `:8554` · `EditTradeModal.jsx:11`) מול `"Target Hit"` (האיפוס `:3193`, ⛔ באופציות) ⇒ מהסגירה השנייה בסשן, ה-`select` מציג «Hit Target» ושומר «Target Hit». `i18n.js:2839-2840` מתרגם את שניהם ⇒ מוסתר בתצוגה. ⛔ תוקן — מחרוזת load-bearing (§13).
3. **INBOX 30.09** (החמצת webhook של Vercel) ⇒ `B-420` (טריאז' §14).
