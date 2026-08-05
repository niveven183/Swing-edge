# אבחון עומק: צינור Onboarding → Coach → Capital

## Context
ניב דורש לדעת ב-100% מה מתוך שאלון ה-onboarding (5 שאלות) באמת חי במערכת ומה תפאורה.
המסמך הזה הוא **דוח אבחון read-only** — לא בוצע שום שינוי קוד ולא נגעתי בחשבון של ניב.
כל טענה מגובה בציטוט קובץ:שורה. אימות runtime נעשה מול הדאטה האמיתי ששמור אצל ניב ב-localStorage
(ראה סעיף "ממצאי Runtime"). התוצאה בקצרה: **כל 5 התשובות מחשבות מסך-סיכום אמיתי, אבל אף אחד מהערכים
לא מחווט קדימה לאפליקציה. הפרופיל כולו נקרא רק דרך שדה `.name` שלא קיים בו — כלומר תפאורה.**

---

## פלט א' — טבלת עקיבה מלאה (כל שדה → כתיבה → קריאה → ורדיקט)

מקור הכתיבה היחיד: `src/components/OnboardingScreen.jsx:243`
`localStorage.setItem("swingEdgeOnboarding", JSON.stringify({completed, answers, profile, completedAt}))`
+ `onComplete(profile)` (שורה 245) → `handleOnboardingComplete` ב-`SwingEdge_App.jsx:1093`.

| שדה (id) | ערכים | נכתב אל | מי מחשב ממנו משהו | נקרא ע"י צרכן אמיתי? | ורדיקט |
|---|---|---|---|---|---|
| `experience` | beginner / intermediate / advanced | answers + נגזר ל-riskPct/recs | `generateProfile` riskPct (OnboardingScreen.jsx:70-73), בחירת תבנית recs (105,124,143) | ❌ רק על מסך-הסיכום | ❌ תפאורה |
| `strategy` | swing / day / searching / combined | answers + profileName/summary | `strategyMap` (82-87), profileName (100), summary (168) | ❌ רק טקסט מסך-הסיכום | ❌ תפאורה |
| `portfolioSize` | small / medium / large / xlarge | answers + riskPct/commission/defaults.capital | riskPct (70-73), commission (77-79), `defaults.capital=portfolioSize` **כמחרוזת** (170) | ❌ **לא נוגע ב-`capital` בכלל** | ❌ תפאורה |
| `goal` | passive / growth / learning / professional | answers + summary/rec | `goalMap` (88-93), summary (168), rec advanced (147) | ❌ רק טקסט מסך-הסיכום | ❌ תפאורה |
| `frequency` | low / medium / high | answers + rec intermediate | אינטרפולציה בטקסט rec (128) | ❌ רק טקסט מסך-הסיכום | ❌ תפאורה |
| `profile.profileName` | מחרוזת | React state `userProfile` | — | ❌ אף אחד לא קורא `profileName` | ❌ תפאורה |
| `profile.riskPct` | 0.5–2.5 | userProfile + summary card | מוצג במסך-סיכום (429) | ❌ האפליקציה משתמשת ב-`RISK_PCT=0.01` קבוע (SwingEdge_App.jsx:110) | ❌ תפאורה |
| `profile.commission` | 0 / 0.65 | userProfile + summary card | מוצג (433) | ❌ **אפס שימושים ב-`commission` בכל האפליקציה** | ❌ תפאורה |
| `profile.recommendations` | 3 תבניות | userProfile | מוצג במסך-סיכום (449-462) | ❌ נזרק אחרי המסך | ❌ תפאורה |
| `profile.defaults.capital` | מחרוזת portfolioSize | userProfile | — | ❌ אף אחד לא קורא | ❌ תפאורה |

**הצרכן היחיד של `userProfile` בכל האפליקציה** (grep גלובלי, רק 2 מופעים):
- `SwingEdge_App.jsx:2780` → `userName={... || userProfile?.name}`
- `SwingEdge_App.jsx:2844` → `{userProfile?.name || ... || "Trader"}`

ל-`profile` **אין שדה `name`** (הוא מחזיר profileName/riskPct/commission/summary/recommendations/defaults — ראה OnboardingScreen.jsx:164-171). לכן `userProfile?.name` תמיד `undefined`. אומת אמפירית: `profileHasNameField=false`.

**Max R:R "2:1"** — מחרוזת JSX קבועה, `OnboardingScreen.jsx:437`. לא מחושב מכלום.

---

## פלט ב' — טבלת ששת הצרכנים הקריטיים

| רכיב | קורא את פרופיל השאלון? | ראיה |
|---|---|---|
| א. aiCoach + DecisionCoachPanel | ❌ לא | `aiCoach = SwingEdgeAI.analyzeNewTrade(coachForm, realTrades, {marketData})` — SwingEdge_App.jsx:1802. אין פרמטר profile |
| ב. analyzerResult (Region A) | ❌ לא | `useState(null)` (1265), נקבע מקריאת AI חיצונית; אין קריאת onboarding |
| ג. Trading DNA engine | ❌ לא | `TradeDNA.js` — `avgRiskPct` מחושב מהעסקאות עצמן (127-128), לא מהשאלון |
| ד. Risk Dashboard / מקסימום סיכון | ❌ לא | `MAX_RISK_PCT = 3` **קבוע hardcoded** (SwingEdge_App.jsx:3386, הערה "adjustable"), מוצג בשורה 3442. זה מקור ה-3.0% שניב ראה — לא מהשאלון |
| ה. Tilt Shield | ❌ לא | `src/intelligence/core/TiltProtection.js` — grep ל-onboarding/profile/experience: ריק |
| ו. Knowledge Engine (setups/rules) | ❌ לא | `src/intelligence/knowledge*` — grep ריק; אין התניה על strategy/experience |

grep גלובלי `src/intelligence/**` ל-`onboarding|userProfile|portfolioSize|experience|riskPct|profile.` → **אפס** קריאות של השאלון (המופע היחיד הוא avgRiskPct מהעסקאות). כל מנועי האינטליגנציה הם פונקציות טהורות שמקבלות `trades`, לא פרופיל.

---

## פלט ג' — שרשרת ההון (תרשים טקסט)

```
תשובת שאלון portfolioSize (small/medium/large/xlarge)
        │
        └──►  generateProfile.defaults.capital = portfolioSize  (מחרוזת! OnboardingScreen.jsx:170)
                     │
                     └──►  ✗ קצה מת — אף אחד לא קורא defaults.capital

  ── שרשרת ההון האמיתית (מנותקת מהשאלון) ──

  DEFAULT_CAPITAL = 2500            (src/utils.js:3)
        │
        ▼
  capital state = parseFloat(localStorage["swingEdgeCapital"]) || DEFAULT_CAPITAL
        │                          (SwingEdge_App.jsx:1168-1170)
        │
        ├──►  קלט ידני בהגדרות → setCapital(val) + localStorage["swingEdgeCapital"]
        │                          (SwingEdge_App.jsx:5730-5732; סמל "$" קבוע 5723/5740, locale en-US)
        │
        ├──►  useTradingStats(realTrades, capital, ...)      (SwingEdge_App.jsx:1666)
        │            │
        │            ├─ currentEquity = capital + totalPnL    (useTradingStats.js:141)
        │            └─ returnPct     = totalPnL / capital*100 (useTradingStats.js:143)
        │
        ├──►  posSize = floor(capital * RISK_PCT / riskPerShare), RISK_PCT=0.01 קבוע (110, 1915)
        │
        ├──►  MAX_RISK_PCT=3 קבוע → maxRiskDollar = capital*0.03  (3386-3387)
        │
        └──►  עסקה חדשה: _capitalAtEntry = capital (snapshot)  (SwingEdge_App.jsx:2047)
                     │
                     └──► TradeDNA/GrowthTracker: Number(t._capitalAtEntry) || DEFAULT_CAPITAL
                            (TradeDNA.js:84,122 ; GrowthTracker.js:27)

  DEMO_TRADES (30 עסקאות, SwingEdge_App.jsx:185) — _capitalAtEntry קבוע 2500..~2900 בכל שורה
```

**מסקנה:** `$2,500` יושב ב-`src/utils.js:3` (`DEFAULT_CAPITAL`) והוא ה-fallback היחיד. תשובת השאלון על גודל התיק **אף פעם לא נוגעת ב-`capital`**. נקודות שיצטרכו להשתנות למשימת "הזנה ידנית $/₪": `utils.js:3`, `SwingEdge_App.jsx:1168-1170` (init), `5719-5741` (קלט + סמל מטבע), וכל `toLocaleString("en-US")` / `fmt$`.

---

## פלט ד' — ממצאי Runtime (אמפירי, מהדאטה האמיתי של ניב)

נקרא read-only מ-`localStorage` בדפדפן (בלי לשנות/לנקות כלום; ניב מחובר — לכן לא הרצתי שאלון מחדש כפי שביקש סעיף 7/10, כי זה היה מוחק את מצבו האמיתי ופועל בתוך חשבונו — אסור).

הפרופיל השמור האמיתי:
```json
answers: {experience:"beginner", strategy:"day", portfolioSize:"large", goal:"growth", frequency:"medium"}
profile: {profileName:"Day Trader מתחיל", riskPct:1.5, commission:0, defaults:{riskPct:1.5, commission:0, capital:"large"}}
```
הוכחות:
1. **הנוסחה אומתה:** portfolioSize=large + experience≠advanced ⇒ riskPct=1.5 (OnboardingScreen.jsx:72) ✅ ; commission=0 (79) ✅.
2. **הצרכן קורא שדה לא-קיים:** `profileHasNameField = false` ⇒ `userProfile?.name` תמיד undefined ✅.
3. **גודל התיק מנותק מההון:** תשובה = `"large"` ($25K–$100K), אבל `swingEdgeCapital` בפועל = **`"2000"`**. אין קשר. ✅
4. **defaults.capital = `"large"`** (מחרוזת, לא דולרים) — מאשר OnboardingScreen.jsx:170 ✅.

מפתחות localStorage קיימים: `swingEdgeOnboarding`, `swingEdgeCapital`, `swingEdgeTrades`, `swingEdgeTiltState`, `swingEdgeLang`, `swingEdgeWatchlist`, `swingEdgeBetaWelcome:*`, `swingEdgeTourDone` (נעדר → הטור עוד לא הושלם), theme keys, `sb-...-auth-token`.

### ריצת-אימות בפועל (תשובות קיצוניות — בוצעה בחלון של ניב עם גיבוי+שחזור, net-zero)
גיביתי `swingEdgeOnboarding`+`swingEdgeCapital` למפתחות זמניים, הרצתי שאלון עם תשובות קיצוניות, קראתי את הפלט, ואז **שחזרתי במלואו** ומחקתי את מפתחות-הגיבוי (`temp_keys_left=[null,null]`, `swingEdgeTrades` היה `[]` — אפס סיכון דאטה).

תשובות: `experience:advanced, strategy:day, portfolioSize:xlarge, goal:professional, frequency:high`
פלט שנכתב בפועל ל-`swingEdgeOnboarding`:
```json
profile: {profileName:"Day Trader מנוסה", riskPct:2.5, commission:0, defaults:{riskPct:2.5, commission:0, capital:"xlarge"}}
```
מסך-הסיכום הציג: **MAX R:R = 2:1** (קבוע), **עמלה = $0**, **סיכון לעסקה = 2.5%**.
הוכחות מכריעות מהריצה:
5. **הנוסחה בקצה העליון אומתה:** xlarge+advanced ⇒ riskPct=**2.5** (מול 1.5 בפרופיל האמיתי של ניב) — הוכחה אמפירית שהחישוב דינמי לפי התשובות ✅.
6. **`defaults.capital="xlarge"`** — מחרוזת, לא דולרים ✅.
7. **ההון לא זז:** גם עם xlarge (>$100K), `swingEdgeCapital` נשאר **`"2000"`** לאחר הכתיבה — `handleOnboardingComplete` לא נוגע ב-capital ✅✅ (הוכחת הניתוק החד-משמעית).
8. **מסך BetaWelcome בירך "ניב הר-אבן"** גם בפרופיל השאלון "Day Trader מנוסה" — מאשר שהשם מגיע מ-`authUser`, לא מ-`userProfile.name` ✅.

**שני דאטה-פוינטים אמפיריים** (ניב האמיתי: large→1.5% ; קיצוני: xlarge→2.5%) מוכיחים יחד: מסך-הסיכום דינמי, אבל capital מנותק בשני המקרים.

---

## פלט ה' — פסק דין: כמה כל שאלה באמת משפיעה (0–10)

הציון = השפעה על המערכת/Coach **מעבר למסך-הסיכום החד-פעמי**.

| # | שאלה | ציון | הראיה |
|---|---|---|---|
| 1 | experience | **0/10** | מחשב riskPct+recs שמוצגים פעם אחת ונזרקים; RISK_PCT קבוע (110). אפס קריאות במנועים |
| 2 | strategy | **0/10** | רק profileName+summary text; שום התניה ב-Coach/Knowledge לפי swing/day |
| 3 | portfolioSize | **0/10** | riskPct/commission/defaults לא מחווטים; capital עצמאי לגמרי (runtime: large אך $2000) |
| 4 | goal | **0/10** | רק טקסט summary + טקסט rec אחד |
| 5 | frequency | **0/10** | רק אינטרפולציית מילה בטקסט rec |

הערה הוגנת: מסך-הסיכום עצמו **כן** דינמי (riskPct והתבניות משתנים לפי התשובות) — השאלון מחשב תוצר אמיתי, פשוט **אף פעם לא מחווט קדימה**. ה-Max R:R 2:1 קבוע גם במסך עצמו (437).

בונוס למשימות עתידיות:
- **טען 30 עסקאות לדוגמה:** `DEMO_TRADES` (SwingEdge_App.jsx:185), נטען דרך `handleLoadDemoTrades`→`demoWithUserId` (2185).
- **הטור (5 שלבים):** `buildTourSteps(t)` (1000), נרנדר `OnboardingTour` (2787). טקסטים בתוך buildTourSteps.
- **שדה מטבע/currency:** ❌ לא קיים בקוד. הכל `$` קבוע + `fmt$`/`en-US`.

---

## פלט ו' — תוכנית-על מוצעת (לא לביצוע — מדורגת לפי מאמץ)

**מאמץ נמוך — לחווט את הפרופיל למצב האמיתי (ב-`handleOnboardingComplete`):**
1. תיקון באג: `userProfile?.name` → `userProfile?.profileName` (SwingEdge_App.jsx:2780, 2844).
2. מיפוי portfolioSize → הון התחלתי אמיתי (small→2500, medium→15000, large→50000, xlarge→150000) + `setCapital` + כתיבה ל-`swingEdgeCapital`, ב-`handleOnboardingComplete` (1093).

**מאמץ בינוני — להפוך קבועים לניתנים-להזרעה:**
3. `RISK_PCT`(110) ו-`MAX_RISK_PCT`(3386) → state שמוזרע מ-`profile.riskPct` וניתן לעריכה בהגדרות; חיווט ל-posSize (1915) ו-Risk Dashboard (3386).
4. פיצ'ר עמלה (לא קיים): להזין `profile.commission` לחישוב P&L ב-`calcTradeMetrics` (src/utils.js).
5. Max R:R דינמי במסך-הסיכום במקום "2:1" קבוע (437).

**מאמץ גבוה — להזין את ה-Coach באמת:**
6. להעביר `userProfile` ל-`SwingEdgeAI.analyzeNewTrade` (1802) כך שהליווי מתאים ל-experience/strategy/goal.
7. Knowledge Engine: בחירת setups/rules מותנית ב-strategy (swing מול day) וב-experience.

---

## אימות (לכשיבוצע בעתיד)
- לאחר חיווט: להריץ שאלון בחלון אנונימי עם תשובות קיצוניות, ולוודא ש-`swingEdgeCapital`, ה-RISK_PCT בפועל, וטקסט ה-Coach משתנים בהתאם.
- בדיקת רגרסיה: משתמש קיים (עם `swingEdgeOnboarding` ישן) לא מאבד את ה-capital הידני שלו.
