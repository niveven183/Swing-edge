# תיקון שער הרגרסיה של test:coach — פיקסצ'רים

## Context

`docs/DECISIONS.md` 2026-07-28: `coach-invariance-test.mjs` בונה עסקאות עם
`status: "closed"` (אותיות קטנות) ו-`exitPrice`, בעוד `getClosed`
(`statisticalModels.js:37`) דורש `status === "CLOSED"` (אותיות גדולות)
ו-`exit != null`. כל עסקאות הפיקסצ'ר נסננות החוצה מהמסלול הסטטיסטי. 110
האסרשנים הגנו על אינווריאנטיות `DecisionCoach` (הקוצ' לא משנה מספרים בין
פרופילים) בלבד — לא על כך שהמתמטיקה עצמה מקבלת נתונים אמיתיים.

זהו תנאי מוקדם לגלי T2-T8 (חילוץ המתמטיקה, קבוצה 2, קבוצה 4 ואילך) —
שער שבור הופך כל אחד מהם להימור.

**מה השלב הזה מספק:** שער שבאמת מריץ 5 עסקאות סגורות דרך `getClosed` →
`calcTradeMetrics`, ומוכיח שהתיקון לא הזיז אף `verdict`.
**מה הוא אינו מספק:** כיסוי לממד ה-"יום" ב-`EdgeFinder` (ראה §ממצא נוסף למטה) —
זה חוב נפרד שנרשם ב-`STATE.md`, לא תוקן כאן.

---

## שלב 0 — אבחון (read-only, בוצע לפני כל שינוי)

### א. מבנה הבדיקה
`SCENARIOS` — 5 עסקאות מועמדות (strong-breakout / weak-fomo / earnings-window /
wide-stop / no-target). `HISTORIES` — שתי היסטוריות: `empty` (0 עסקאות) ו-`seeded`
(5 עסקאות דרך `mkClosed`). לכל שילוב (היסטוריה × תרחיש) × 7 פרופילים (6 + null):
נבדק ש-`engineView(res)` זהה-בייט לכל הפרופילים (אסרשן 1), ש-`intermediate`
זהה ל-raw (אסרשן 4), ש-`adaptCoaching(x,null)===x` (אסרשן 2), ושהיא לא מוטטת
קלט (אסרשן 3). 5×7 + 5 + 5×2 = 110.

### ב. שדות חסרים מעבר ל-status/exit
`calcTradeMetrics` (`src/utils.js:29`) — `pnl = (exit-entry)*shares` (או ההפך
ל-SHORT), ו-`risk = |entry-stop|*shares`. הפיקסצ'ר **לא הכיל `shares` בכלל** —
`undefined * number = NaN`. תיקון `status`/`exit` לבד עדיין היה מחזיר
`rMultiple: NaN` דרך `getClosed`, ו-NaN לא נתפס ע"י שום assert קיים כי הבדיקה
לא משווה ישירות ל-`rMultiple` הגולמי — היא הייתה עוברת "בשקט" עם ביניים שגוי.
נדרש להוסיף `shares`.

`dayOfWeek` (`statisticalModels.js:237`) קורא `trade.createdAt || trade.date` —
לפיקסצ'ר יש רק `closedAt`/`openedAt`, ולכן `dayOfWeek(trade)` הוא תמיד `null`
עבור כל עסקת פיקסצ'ר. זה **לא** נדרש כדי ש-`calcTradeMetrics` יחזיר ערך אמיתי
(היא לא משתמשת ב-day), ולכן מחוץ לגבול המשימה הזו לפי הגדרתה המצומצמת — ראה
"ממצא נוסף" למטה ואת שורת ה-`STATE.md` שנפתחה עבורו.

### ג. צרכנים נוספים
`grep` על `mkClosed`/`HISTORIES` בכל הריפו — אפס תוצאות מחוץ ל-
`coach-invariance-test.mjs` עצמו. אין נזק צולב.

---

## Characterization — baseline קפוא לפני התיקון

הרצה על הקוד הנוכחי (לפני עריכה):

```
✅ coach-invariance: 110 assertions passed across 5 scenarios × 7 profiles × 2 histories.
```

הוכחה נוספת שהבאג אמיתי: הרצת המסלול המלא (`SwingEdgeAI.analyzeNewTrade`) עם
פרופיל `null` על `empty` מול `seeded` **החזירה תוצאה זהה-בייט לחלוטין** בכל חמשת
התרחישים — `sampleSize: 0`, `edgeMatch.matched: false`, `historicalContext: null`
בשני הצדדים. זה בלתי-אפשרי אם ה-5 עסקאות ב-`seeded` היו נראות ע"י המנוע; זו
ההוכחה הישירה שהן לא היו.

---

## התיקון

### 1. `scripts/coach-invariance-test.mjs` — `mkClosed`

| שדה | לפני | אחרי |
|-----|------|------|
| `status` | `"closed"` | `"CLOSED"` |
| `exit` (היה `exitPrice`) | לא היה `exit` כלל | `exit: win ? 115 : 95` |
| `shares` | לא היה | `shares: 20` |

`shares: 20` נבחר כי הוא משחזר **בדיוק** את `pnl`/`rMultiple` שכבר היו כתובים
בפיקסצ'ר (`300/-100`, `3/-1`) — `calcTradeMetrics` עכשיו מחשב את אותם המספרים
בפועל, לא רק מכריז עליהם כליטרל מת. אומת בהרצה, לא הונח.

### 2. אסרשן שמירה חדש (#5)
לכל היסטוריה לא-ריקה: `assert.strictEqual(getClosed(trades).length, trades.length)`.
בלעדיו, אם מישהו ישבור שוב את החוזה (יחליף `status` בחזרה לאותיות קטנות, למשל),
110/111 האסרשנים הקיימים ימשיכו "לעבור" באותה שקיפות שהובילה לבאג הזה מלכתחילה.

### 3. שורת הסיכום
`${checks}` כבר משתנה דינמי — לא נדרש שינוי ידני; עלה אוטומטית מ-110 ל-111.

---

## תוצאה — לפני/אחרי

| | לפני | אחרי |
|---|------|------|
| מספר אסרשנים | 110 | **111** |
| `empty::*` (5 תרחישים) | — | **ללא שינוי** (0 עסקאות, כצפוי) |
| `seeded::*` — `verdict` (5 תרחישים) | GO/SKIP/CAUTION/CAUTION/CAUTION | **זהה** — GO/SKIP/CAUTION/CAUTION/CAUTION |
| `seeded::*` — `sampleSize` | 0 בכולן | **5** בכולן (השינוי הצפוי — זו כל נקודת התיקון) |
| `seeded::strong-breakout` — `confidence` | 100 | 100 (ללא שינוי) |
| `seeded::weak-fomo` — `confidence` | 0 | 0 (ללא שינוי) |
| `seeded::earnings-window` — `confidence` | 62 | **100** — `historicalContext`/`edgeMatch` עכשיו מוזנים אמיתית (3/5 עסקאות "Breakout" ב-"Trending Up" עם win-rate 67%) |
| `seeded::wide-stop` — `confidence` | 70 | 70 (ללא שינוי) |
| `seeded::no-target` — `confidence` | 40 | **64** — אותה סיבה: המנוע כעת רואה 5 עסקאות סגורות אמיתיות |

**verdict לא זז באף תרחיש.** שינויי ה-`confidence` בשני תרחישים (`earnings-window`,
`no-target`) הם **בדיוק** הביטוי של התיקון עצמו — לפני התיקון ה-Coach קיבל
אפס עסקאות היסטוריות תמיד (הבאג), אחריו הוא מקבל את חמש העסקאות שהיו אמורות
להיכנס לחישוב מהתחלה. זה לא "ממצא" נוסף שדורש עצירה — זו התוצאה הישירה
והצפויה של תיקון קלט שהיה שבור. `edgeMatch`/`antiEdgeMatch` נבדקו בנפרד: 5
עסקאות מתפצלות ל-3 Breakout / 2 Pullback, מתחת ל-`MIN_SAMPLE_EDGE=5` לכל צירוף
ממדים ספציפי — ולכן אין edge "מזויף" שנוצר מהתיקון, רק שימוש נכון ב-sample
הגולמי (`historicalContext`).

---

## ✂️ ממצא נוסף — מחוץ לגבול המשימה הזו

`dayOfWeek` (`statisticalModels.js:237`) קורא `trade.createdAt || trade.date`.
פיקסצ'רי `mkClosed` נושאים רק `closedAt`/`openedAt` — **אף שילוב ממדים
ב-`EdgeFinder` שכולל את ממד ה-`day` לא נבדק אי-פעם** על ידי `test:coach`, כי
`groupKey` מחזיר `null` ברגע שממד כלשהו בקומבינציה הוא `null`. זה לא תוקן כאן
(השדה לא נדרש כדי ש-`calcTradeMetrics` יחזיר ערך אמיתי — הגבול המפורש של
המשימה), ונרשם כשורה נפרדת ב-`docs/STATE.md`.

---

## מה נבדק ולא נגעו בו
- `src/` — לא נגע כלל, זו משימת בדיקות
- שום ציפיית `verdict`/`confidence` לא שונתה כדי "לעבור" — כל שינוי בטבלה
  למעלה מוסבר ע"י התיקון עצמו, לא רוכך

---

## אימות — פלט מלא

```
npm run verify
✅ coach-invariance: 111 assertions passed across 5 scenarios × 7 profiles × 2 histories.
✅ test:import — all fixtures passed (10 scenarios)
✅ test:settings — all assertions passed
✅ test:datachain — all assertions passed
✅ r-contract: all assertions passed — null is not 0, and every R metric reports its sample size.
✓ vite build — built in 7.39s
```
פלט מלא מודבק בדיווח לניב (לא רק הסיכום).

---

## §9 — נוהל

תוכנית זו מתעדת משימה שהוראותיה המדויקות (אבחון → תיקון → אסרשן שמירה →
verify) נמסרו ישירות ע"י ניב בפרומפט, כולל עקרון ה-characterization המחייב.
לכן אין כאן שלב Plan Mode נפרד לפני ביצוע — הביצוע בוצע לפי המפרט שסופק,
עם baseline קפוא לפני כל שינוי כנדרש. הקובץ הזה הוא הרישום הפורמלי לפי §9,
נכתב **אחרי** הביצוע והאימות, ולפני commit+push+עצירה.
