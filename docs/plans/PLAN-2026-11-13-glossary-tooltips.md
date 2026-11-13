# PLAN-2026-11-13 — גל 3: הסברי המונחים (סימני ?)

**מקור:** פרומפט ניב 13.11 (גל 3 בסבב התיקונים, בקשה #1) · אבחון `docs/audits/GLOSSARY-DIAGNOSIS-2026-11-13.md`.
**שלב:** תוכנית בלבד — ⛔ אפס קוד עד אישור מפורש על הקובץ הזה כפי שנדחף.

---


> ✅ **אושרה ע"י ניב 13.11, עם 3 שינויים** (משולבים למטה, מסומנים 🔁):
> 1. 🔁 סדר השלבים: **0 → 2 → 4 → 3 → 5** (שלב 1, red-before ל-U5, נבלע בשלב 3).
> 2. 🔁 **טעינה עצלה לפי שפה — לא בגל הזה** ⇒ `B-474` לגל 7 (מהירות). המבנה (`src/glossary/terms` + `generated/*.json`) כן בגל, מיובא סטטית. מדידת bundle לפני/אחרי נשארת חובה; צפוי ~ללא שינוי.
> 3. 🔁 **כתיב 1:3 — רק בטולטיפים ובאתרי ה-UI.** `DecisionCoach.js` + `localAI.js` (15 אתרים) ⇒ `B-475` נפרד, ⛔ נוגעים; `test:coach` נשאר זהה.
> ברירות המחדל 1–3 של §12 אושרו. דף הסקירה: עמודת "איפה מוצג" + סימון בצבע של מונחים שתוכנם השתנה מהותית.
>
> ⚠️ **תיקוני מדידה אחרי האישור (13.11):** ① בגרסה שהוצגה נכתב «18 אתרי ה-UI» ואחר כך «11». שניהם שגויים: ספירת השורות כללה הערות על ניגודיות צבע (`WelcomeAnnouncement.jsx:44`, `OnboardingScreen.jsx:184`). נמדד שורה-שורה: **9 אתרים** שמציגים יחס בכתיב X:1 מחוץ למאמן — רשימה ב-§3 של האבחון. ② «19 סטאפים מותנים» ⇒ **18** (22 יעדי alias פחות 4 שבבורר).

**רמה: T3 · תשובות: לא / כן / לא / כן / כן** (אמון: טקסט שמתאר חישוב · רוחב: מודול עם 60 אתרי שימוש · ודאות: המחקר על `41b758b`, 43 קומיטים אחורה).
**בסיס המדידה:** `main` = `71d5653`, עץ נקי, 13.11. פילטר §8: אין DB · אין כסף/מיילים · אין סוד · אין ריצה אוטומטית בפרודקשן · הפיך ⇒ בלי טבלת השלכות.

## 1. הקשר

ההסברים שמאחורי סימני ה-"?" הם הכאב מס' 1 של ניב: ארוכים, חלקם סותרים את הקוד, חלקם לא מחוברים לשום מסך, וחלק מהמסכים מסבירים בטקסט inline שקיים רק בעברית/אנגלית. המטרה: מקור אמת אחד לכל מונח, טקסט קצר בפורמט קבוע (הגדרה · דוגמה · caveat), רכיב שעובד במגע, ושער שמונע סחיפה.

## 2. מלאי נמדד (HEAD)

| מה | נמדד |
|---|---|
| מונחים ב-`src/data/tooltips.js` | 72/72, כל אחד ב-5 שפות; `TERM_LABELS` 72/72 |
| חורגים מהמכסה | he >35 מילים: 18/72 (מקס' 115) · en >40: 16/72 (מקס' 121) · עם תבליטים/פסקאות: 19/72 |
| אתרי `<TermTooltip>` | 38 ב-5 קבצים · "?" שבור (מונח חסר ⇒ `null` שקט): 0 היום |
| נגישים ממסך | 54/72 — מתוכם 18 סטאפים נגישים **רק** אם עסקה שמורה נושאת שם סטאפ שאינו בבורר (הבורר מציע 5: 4 עם טולטיפ + Other) |
| **יתומים** | **18/72** (הפרומפט: 21) — רשימה ב-§5 |
| chunk ראשי | 1,691,055 raw · 506,627 gzip; `tooltips.js` = 104,893 raw · 36,626 gzip, כל 5 השפות בתוכו |
| `i18n.js` | 145KB, כל השפות סטטיות; אין באפליקציה טעינת שפה עצלה (import דינמי יחיד: `AdminPanel` דרך `lazyWithRetry`) · אין service worker |

**8 המקורות המקבילים**

| # | מקור | נמדד | מה עושים |
|---|---|---|---|
| 1 | `tooltips.js` | 72 × 5 שפות | מוחלף במקור החדש |
| 2 | `src/data/glossary.json` | 72/72, 0 סחיפה; אין לו צרכן runtime (רק `test:copy` #5) | הופך לעותק מיוצר עם hash |
| 3 | `docs/SwingEdge-Terms-Glossary.md` | 70 מונחים (נסחף ב-2), "commit fcd6260" | מיוצר מהמקור + hash |
| 4 | `LandingPage.jsx` `TERMS` | 7 (edge · tilt · setup · rr · winRate · rMultiple · visionOcr), he/en בלבד | 5 המשותפים נגזרים מהמקור; `setup` ו-`visionOcr` נכנסים כמונחים עם `shownAt: landing` |
| 5 | `tradeEnums.js` `explain` + `CATEGORY_TOOLTIP` | 17 + 3, he/en בלבד (es/pt/ar רואים אנגלית) | עוברים למקור כשדה `hint` ב-5 שפות; `value`/`emoji`/`dot` לא זזים (מחרוזות load-bearing) |
| 6 | `knowledge/setups.json` דרך `getSetupTooltip` | 21 הגדרות, **21/21 בעברית בלבד** — ה-"?" שליד תג הסטאפ ביומן מציג עברית בכל שפה | התצוגה עוברת למונח מהמקור. הקובץ עצמו **לא מאוחד**: הוא קלט של מנוע המאמן (`regime_affinity`, `stats`), מוגן ב-`test:coach` |
| 7 | `<InfoTooltip>` עם טקסט inline | 11 משטחים he/en: 10 פאנלים באנליטיקס + כרטיס ההון | הופכים למונחים (`streakHistory` כבר קיים ⇒ +10 מזהים). כרטיס ההון משרשר היום את בסיס ההון של המשתמש לטקסט ⇒ המספר יוצא |
| 8 | `HelpModal.jsx` | 43 שורות, 3 פסקאות דרך `t.*`, אין הגדרות מונחים | לא מקור מקביל — לא נוגעים |

## 3. הנחות מהפרומפט שנפלו או זזו

1. **21 יתומים ⇒ נמדדו 18.** ועוד 18 סטאפים "מותנים" (ראה §2).
2. **"דף מילון" לא קיים באפליקציה.** `longForm` והקישור "עוד במילון ›" דורשים משטח חדש. ההמלצה: מודאל מילון בטעינה עצלה (לא טאב — טאב נוגע ב-`NAV_KEYS`, בסיור וב-`test:tour`).
3. **`expectancy` ו-`sharpe` לא מוצגים בשום מסך** — מחושבים ב-`TradeDNA.metrics` בלבד. אין "?" לחבר; התווית "Sharpe לעסקה (R)" (הכרעה 2) תחיה במילון בלבד. גם `wilson` כזה.
4. **הכרעה 7 (כתיב 1:3 בכל המוצר) = 24 אתרי קוד מחוץ לטולטיפים** בכתיב ההפוך (X:1): `DecisionCoach.js` 8 · `localAI.js` 7 (ספירת grep, ⛔ אומתו שורה-שורה — `B-475`) · **9 אתרי UI שאומתו שורה-שורה** (`SwingEdge_App.jsx` 5 · `OnboardingScreen` 2 · `i18n.js` 2). שמונה מהם בליבת המאמן, תחת הבייסליין הקפוא של `test:coach`. `LandingPage.jsx` (4) כבר בכתיב 1:N.
5. **רצף שלילי לא מוצג בדשבורד:** `currentStreak = Math.max(0, …)` — רצף הפסדים מוצג כ-0. הטקסט של `winStreak` יתאר את זה; החישוב לא משתנה.
6. **ספירת המונחים תגדל, לא תישאר 72:** 72 − 4 (מצבי שוק כפולים) + 10 (פאנלים inline) + 2 (landing) = **80**.
7. **`test:format` §7 ו-`test:copy` #1–#5 קוראים את הטקסט ישירות** (avgR/rMultiple חייבים "LONG"+"SHORT" ב-5 שפות, avgR חייב "0R", riskLimits: בלי "(1%)"/"(3%)", עם רצפה 3% ותקרה 5%). האסרציות נשארות כלשונן ומופנות לטקסט **המוצג** החדש.
8. **`B-470`:** השער ירוק היום (41/41) ויחזור לאדום ב-16.11 כש-`M-027`/`M-028` יפוגו — מאז מדווחים לפי נוהל 12.11.

## 4. סתירות — אומתו בקוד (כולן קיימות)

| מונח | מה הקוד עושה | איפה |
|---|---|---|
| `dna` / `discipline` | משמעת = שיעור העסקאות שסומנו `followedPlan` — דיווח עצמי | `psychologyPatterns.js:106` |
| `dnaRisk` | `1 − max(0, ממוצע % סיכון − 1%) × 50` ⇒ 1%→100 · 2%→50 · 3%→0 | `TradeDNA.js:164` |
| `dnaConsistency` | `1 − min(1, sd(R) ÷ 3)` | `TradeDNA.js:190` |
| `dnaGrowth` | שיפוע R מצטבר ב-20 הסגורות האחרונות | `TradeDNA.js:199` |
| `edge` / `antiEdge` | צירופי סטאפ×רגש · מינ' 3 (anti: 2) · top-5 לפי Wilson×(1+R) · `isSignificant` מוגדר ולא נקרא | `tradingStats.js:538` |
| `sharpe` | `mean(R) ÷ sd(R)` לעסקה, בלי ריבית ובלי שנתיות | `statisticalModels.js:195` |
| `expectancy` | ב-R, BE במכנה | `statisticalModels.js:156` |
| `rrBucket3plus` | יחס מתוכנן (יעד/סטופ) | `statisticalModels.js:345` |
| `dayOfWeek` | לפי `m.date` — יום הכניסה | `tradingStats.js:488` |
| `grade` | 40/30/20/10 · ספים 85/70/55/40 | `MonthlyReport.js:172` |
| `ORBBreakout` | 5/15/30 דק' (הטקסט: 15–30) | `knowledge/setups.json` |
| `maxDD` | דולרים מהשיא של P&L מצטבר | `tradingStats.js:214`, מוצג ב-App:5540 |
| `avgHold` | ימים קלנדריים מעוגלים; אותו יום = 0 | `utils.js:48` |
| `profitFactor` | `Infinity` בלי הפסדים; אין מודל עמלות בקוד ⇒ "לפני עמלות" נכון | `statisticalModels.js:187` |
| `riskLimits` | `min(5, max(3, סיכון × 2))` | App:1492 |
| `takeProfit` | הטקסט "לפחות 1.5R"; פעולות הגרף והמאמן: 2:1 | מתיישר ל-2:1 (הכרעה 4) |
| "Best Setup" (inline) | הטקסט: "לפי P&L כולל ואחוז הצלחה · תסחור אותו יותר"; הבחירה לפי אחוז הצלחה בלבד | App:6790 — נכתב מחדש בלי ההמלצה |

## 5. יתומים — 18

| פעולה | מונחים |
|---|---|
| **לחבר** למסך שמציג אותם | `totalReturn` (כרטיס App:6612) · `winStreak` (כרטיס הרצף, כולל הסבר שהפסדים מוצגים כ-0) · `streakHistory` (מחליף inline ב-App:7042) · `grade` (דוח חודשי) · `entryQuality` (שדה בטופס) · `tilt` (Tilt Shield) · `rMultiple` (עמודת R ביומן) · `discipline` · `dnaRisk` · `dnaConsistency` · `dnaGrowth` (4 שורות כרטיס ה-DNA) |
| **למחוק** | `marketTrendingUp` · `marketTrendingDown` · `marketSideways` · `marketVolatile` — כפולים ל-SmartSelect (הכרעה 6) |
| **מילון בלבד** (הערך לא מוצג) | `expectancy` · `sharpe` · `wilson` |
| BE בשורת Win Rate | מכוסה ב-caveat של `winRate` — בלי מונח חדש |

## 6. החלטת ארכיטקטורה

**מקור:** `src/glossary/terms/<קטגוריה>.js` — 8 קבצי קטגוריה (לא 80 מודולים, לא קובץ ענק אחד), כל מונח אובייקט מוקלד ב-JSDoc: `id, category, computedIn, related, sources, shownAt, mustContain, hint?, i18n{he,en,es,pt,ar}:{label, short, example, caveat, longForm}`.

**מחולל:** `scripts/build-glossary.mjs` (נכתב מחדש; `extract-tooltips.mjs` נמחק) מייצר ל-`src/glossary/generated/`:
- `inline.json` — תוויות + `hint` לכל השפות; סינכרוני, נשאר בצ'אנק הראשי (נדרש ל-`aria-label` ול-SmartSelect).
- `short.<lang>.json` ×5 — הטקסט המוצג; נטען רק לשפה הפעילה.
- `long.<lang>.json` ×5 — נטען רק במודאל המילון.
- `docs/SwingEdge-Terms-Glossary.md` ו-`src/data/glossary.json` — עותקים מיוצרים.
- כל קובץ נושא `sourceHash`; `test:glossary` מחשב מחדש ⇒ סחיפה = אדום.

🔁 **טעינה — סטטית בגל הזה.** `TermTooltip` מייבא את `inline.json` ואת חמשת `short.<lang>.json` ב-`import` רגיל; אין `store.js`, אין `import()` לפי שפה, אין prefetch ואין מצב "טוען". הפיצול לקבצים לפי שפה נבנה עכשיו כדי ש-`B-474` (גל 7) יהיה החלפת שורת ייבוא ולא ריפקטור.
⏸️ **נקודה אחת פתוחה לאישור ניב (שאלת עצירת שלב 0):** `GlossaryModal` ייטען ב-`lazyWithRetry` הקיים (App:22, כמו `AdminPanel`), וחמשת `long.<lang>.json` מיובאים **בתוכו** סטטית. זה לא טעינה לפי שפה, אבל זה כן `import()` אחד חדש. בלעדיו הטקסט הארוך של 5 השפות נשאר בצ'אנק הראשי לצד הקצר. אם אתה רוצה גם את זה סטטי — אמור, וזה ייכנס ל-`B-474`.

**תוצאה צפויה ל-bundle:** ~ללא שינוי בצ'אנק הראשי אחרי שלב 2 (אותו טקסט, מבנה אחר). אחרי שלב 4 הטקסט המוצג מתקצר והארוך יושב בצ'אנק המודאל — ההפרש יימדד וידווח, לא יוערך.

**מספרים ב-RTL:** `‎` בנתונים לפני כל `+N`/`−N` בעברית ובערבית, נאכף בשער.

## 7. UI — `InfoTooltip` / `TermTooltip`

נמדד היום: `onMouseEnter` פותח ללא תנאי ו-`onClick` עושה toggle · רוחב קבוע 280 · בלי `max-height` · חץ קבוע ב-50% גם כשהבועה הוזזה · ✕ ב-`right-2` · `role="tooltip"` · אין bottom sheet.

**השערת U5 (לא נמדדה):** ב-Android הטאפ מייצר `mouseenter` (פותח) ואז `click` (toggle ⇒ סוגר). **red-before לפני כל תיקון:** `probe:eye:tooltip` הרמטי ב-pixel7 — זרוע BEFORE חייבת להיות אדומה על הרכיב הנוכחי.

התיקון: hover רק תחת `(hover: hover)` · טאפ פותח/סוגר · מתחת ל-640px bottom sheet · דסקטופ `max-width 320`, `max-height min(60vh, 360px)` + גלילה · חץ לפי מרכז הטריגר בפועל · ✕ ב-`end-2` · toggletip (`button aria-expanded` + אזור `role="status"`) · "עוד במילון ›" שפותח את מודאל המילון על המונח.
`GlossaryModal` — טעינה עצלה, עטוף `PanelBoundary`, נפתח גם מתפריט המשתמש.

## 8. שער `test:glossary` (חוליה 35)

schema · מכסות (he ≤35 · en ≤40 · es/pt/ar ≤110% מתווי en · בלי `\n\n`/`•`) · `mustContain` לכל מונח · אין יתומים (לכל מונח `shownAt` שמאומת מול ה-JSX, או `glossaryOnly` מנומק) · אין "?" שבור (כל `term=` סטטי קיים במקור; אתרים דינמיים דרך לדג'ר) · אין טקסט inline ב-`<InfoTooltip>` · סחיפת עותקים (hash) · כל מונח מדד/סיכון עם ≥1 `source` או `computedIn` · LRM. חילוץ שנכשל = אדום קשה (`B-272`).
`test:format` §7 ו-`test:copy` #1–#5 נשארים, מופנים לטקסט המוצג. `CLAUDE.md` §7: 34 → 35 באותו קומיט (§14.3 אוכף).

## 9. שלבי ביצוע

**שלב 0 — אחרי אישור התוכנית:** `docs/plans/PLAN-2026-11-13-glossary-tooltips.md` (קומיט נפרד `docs(plan): … — awaiting approval`) + `docs/audits/GLOSSARY-DIAGNOSIS-2026-11-13.md` (§2–§5 עם הפקודות שמדדו) + רישום `B-473` (`initialStop`) · `B-474` (טעינה עצלה לפי שפה, גל 7) · `B-475` (כתיב 1:3 במאמן וב-`localAI`, 15 אתרים) ⇒ push ⇒ **STOP** (§9). בלי קוד.

🔁 **הסדר: 0 → 2 → 4 → 3 → 5.**

**שלב 2 — מקור + מחולל + שער, הגירה שומרת-תוכן.** הטקסט המוצג זהה בייט-לבייט להיום ב-5 השפות (נבדק בסקריפט השוואה); `longForm` = הטקסט הקיים. מכסות עדיין כבויות. ייבוא סטטי. מדידת bundle אחרי (צפוי ~ללא שינוי).

**שלב 4 — טקסטים he+en.** 80 מונחים בפורמט; תיקון הסתירות גם ב-`longForm`; חיבור 11 יתומים, מחיקת 4; 11 משטחי inline ו-20 ה-`hint`-ים עוברים למקור; יישור 2:1; כתיב 1:3 בטולטיפים וב-**9** אתרי ה-UI. מקורות: כל טענה כמותית מאומתת ברשת, אחרת 📚 ובלי מספר.
  - ⛔ `DecisionCoach.js` ו-`localAI.js` לא נפתחים. `test:coach` רץ לפני ואחרי ופלטו חייב להיות זהה.
  - מכסות נדלקות ל-he+en. es/pt/ar נשארים בטקסט הישן, מסומנים `pendingTranslation`.
  - **דף סקירה** `docs/audits/GLOSSARY-REVIEW-2026-11.html` (מקומי, נשלח אליך): לכל מונח לפני/אחרי he+en · מספר מילים · מקור · דגל · **איפה מוצג (`shownAt`)**. מונחים שתוכנם השתנה מהותית (סתירה שתוקנה) **מסומנים בצבע ומופיעים ראשונים** ⇒ **STOP 2**.

**שלב 3 — UI + מודאל מילון.** תחילה red-before ל-U5 (`probe:eye:tooltip` הרמטי ב-pixel7, בלי תיקון): אם זרוע BEFORE ירוקה — ההשערה נפלה, עוצרים ומדווחים. אחר כך הרכיב החדש, `GlossaryModal`, probe ירוק, ו-`tests-eye/tooltip.spec.js` (נכנס ל-job ה-`prod` הקיים — בלי job חדש ובלי שינוי workflow).

**שלב 5 — אחרי אישור הטקסטים:** תרגום es/pt/ar, מכסות על 5 השפות, צילומים 375 + 1440 · he+en · בהיר+כהה · 5 מונחים (`avgR` · `riskLimits` · `dna` · `ORBBreakout` · `positionSize`).

**סגירה:** verify (נוהל `B-470`) ⇒ PR ⇒ CI ירוק על כל SHA ⇒ merge commit ⇒ `main` ירוק כולל `prod` ⇒ אימות עין על פרודקשן ⇒ קומיט סגירה: `DONE` · `DECISIONS` (7 ההכרעות + הארכיטקטורה) · `STATE` · `NEXT` (גל 2 תובנות · גל 4 נתונים + `B-434`/`B-428`/`B-190` · גל 5 סקירה שבועית) · `TRUTH` · `CHECKS` (`C-078`) · `B-473` (`initialStop`).

## 10. קבצים עיקריים

חדשים: `src/glossary/terms/*.js` · `src/glossary/generated/*` · `src/components/GlossaryModal.jsx` · `scripts/glossary-test.mjs` · `scripts/eye-tooltip-probe.mjs` · `tests-eye/tooltip.spec.js`.
משתנים: `src/components/ui/InfoTooltip.jsx` · `TermTooltip.jsx` · `SwingEdge_App.jsx` (38 אתרים + 11 inline + חיבורים) · `IntelligenceUI.jsx` · `MonthlyReportTab.jsx` · `EditTradeModal.jsx` · `DayTradesModal.jsx` · `LandingPage.jsx` · `tradeEnums.js`/`tradeOptions.jsx` (העתק `explain` בלבד) · `scripts/build-glossary.mjs` · `format-test.mjs` · `copy-contract-test.mjs` · `package.json` · `CLAUDE.md` §7.
נמחקים: `src/data/tooltips.js` · `scripts/extract-tooltips.mjs`.
**לא נוגעים:** חישובים ונוסחאות · `knowledge/setups.json` · ערכי `value` של setup/emotion/market · Supabase · workflows.

## 11. אימות

- `test:glossary` נצפה אדום על מוטנטים (מכסה חורגת · inline חוזר · hash סחוף · `term=` לא קיים) לפני שנספר.
- `probe:eye:tooltip`: BEFORE אדום, HEAD ירוק.
- `test:coach` · `test:cents` · `test:equitystate` · `test:tour` · `test:lessons` · `test:boundary` · `test:copy` · `test:format` — לפני ואחרי כל נגיעה בקבצים שלהם; זרועות הביקורת נשארות ירוקות.
- bundle לפני/אחרי מ-`dist/`, raw + gzip, אותה פקודה.
- T3: צילומים מקומיים + אימות עין על פרודקשן אחרי deploy (he/en · 375/1440 · בהיר/כהה), כולל טאפ אמיתי במובייל מדומה.

## 12. ברירות המחדל — הוכרעו 13.11

1. ✅ **המילון = מודאל**, לא טאב.
2. ✅ **`expectancy` · `sharpe` · `wilson` = מילון בלבד**, לא נמחקים.
3. ✅ **80 מונחים**: 10 הפאנלים ו-2 מונחי ה-landing נכנסים למקור.
4. 🔁 **כתיב 1:3 במאמן וב-`localAI` (15 אתרים) — לא בגל הזה** ⇒ `B-475`.
