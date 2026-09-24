# PLAN 2026-09-23 — הבהוב שאלון האונבורדינג למשתמש חוזר

**סטטוס: ⏸️ awaiting approval.** ⛔ **אבחון בלבד — `0` קבצי קוד נגעו בגל הזה** (§8.1 שלב 1).
כל תשובה למטה נושאת **שורת קוד**; מה שלא נמדד מוצהר כלא-נמדד.

---

## 0 · סיווג §15 — שני סיווגים נפרדים

**הגל הזה (אבחון read-only):** רמה **T1** · תשובות **לא/לא/לא/לא/לא**
1. הפיכות — לא (`0` כתיבות DB · `0` מיילים · `0` מחיקות) · 2. אמון — לא (⛔ מוצג מספר למשתמש)
· 3. אבטחה — לא · 4. רוחב בקוד — לא (`1` קובץ **docs**; §15 מצהיר ש-`docs` ⛔ נספרים)
· 5. ודאות — לא (כל הנחה בפרומפט נמדדה בגל הזה עצמו, פלט מצורף).

**התיקון המוצע (⛔ בגל הזה):** רמה **T3** · תשובות **לא/כן/לא/כן/לא**
2 · **אמון — כן.** משתמש ותיק מקבל מסך שמצהיר «אתה חדש», ולחיצה על «בואו נתחיל»
מפעילה את `handleOnboardingComplete:1201-1228`, שכותב `setCapital(cap)` +
`localStorage.setItem("swingEdgeCapital")` (`:1206-1210`) ו-`riskPct` (`:1211-1215`);
אפקט ההתמדה (`:1882`) דוחף אותם ל-DB ברגע ש-`hydratedRef.current` נפתח ⇒ **ההון
המוצהר-בהרשמה דורס את ההון האמיתי**. זה בדיוק `B-268` בכניסה אחרת.
4 · **רוחב — כן** (`SwingEdge_App.jsx` + הארנס + אולי `userScopedStorage.js`).
⇒ שאלה 2 לבדה ⛔ מספיקה ל-`T3`, אבל `2+` כן ⇒ **`T3`**, ולכן הסגירה שלו תדרוש
**אימות עין** ופריט `CHECKS` חדש, ⛔ אסרציות לבדן.

---

## 1 · המנגנון — מה קובע `showOnboarding`, ומתי ההידרציה דורסת אותו

**מקור יחיד: `localStorage`. ⛔ ברירת מחדל · ⛔ `userProfile` · ⛔ ה-DB.**

```js
// SwingEdge_App.jsx:1184-1189
const [showOnboarding, setShowOnboarding] = useState(() => {
  try {
    const saved = localStorage.getItem("swingEdgeOnboarding");
    return !saved;                 // ⇐ אין מפתח ⇒ true ⇒ "אתה חדש"
  } catch { return true; }         // ⇐ אין localStorage בכלל ⇒ true
});
```

`userProfile:1190-1199` קורא את **אותו מפתח** אך ⛔ מזין את `showOnboarding` —
שני `useState` עצמאיים על מקור אחד.

**הדריסה** יושבת בתוך גוף ה-`hydrate`, ורק בענף אחד:

```js
// SwingEdge_App.jsx:1826-1830
if (s.onboarding?.completed === true) {
  setShowOnboarding(false);
  setUserProfile({ ...s.onboarding.profile, ...(s.onboarding.answers || {}) });
  try { localStorage.setItem("swingEdgeOnboarding", JSON.stringify(s.onboarding)); } catch {}
}
```

⚠️ **הענף הוא חד-כיווני.** יש `setShowOnboarding(false)` ו⛔ קיים `else` שמאשר
`true` — כלומר «הצג שאלון» ⛔ מגיע **לעולם** מה-DB; הוא תמיד הניחוש של `:1187`.

**רוחב החלון.** `hydrate` מבצע **שני round-trips סדרתיים** לפני שהוא מגיע ל-`:1826`:
`migrateFromLocalStorage:1788` (שאילתת `select("user_id")` שמחזירה `exists`,
`userSettings.js:265-276`) ואז `loadSettings:1795` (`select("settings")`,
`userSettings.js:173-177`). `setHydrationDone(true)` הוא המשפט ה**אחרון**, `:1871`.

**מה מרונדר בחלון הזה** — שרשרת ה-`return` המוקדמים, לפי הסדר:

| שורה | תנאי | מה על המסך |
|---|---|---|
| `:4065` | `!authReady` | לוגו פועם + `t.loadingSwingEdge` |
| `:4078` | `isSupabaseConfigured && !session` | `<AuthScreen />` |
| **`:4082`** | **`showOnboarding`** | **`<OnboardingScreen />` ⇐ ההבהוב** |
| `:4086` | — | האפליקציה |

🔴 **`:4082` הוא `if (showOnboarding) {` חשוף — ⛔ `hydrationDone` · ⛔ `hydrationFailed`
· ⛔ `capitalSettled`.** זה השורש: החלטה על זהות המשתמש נלקחת מניחוש מקומי,
מרונדרת במלואה, ומתוקנת שני round-trips מאוחר יותר.

---

## 2 · האם `95865cb` הרחיב את הבאג — מדידה, ⛔ הנחה

הבאג **קדם** ל-`95865cb` (הפרומפט צודק), אבל `95865cb` הוסיף מסלול שלישי שלא היה קיים.

**מה `95865cb` הציג** (`git show --stat 95865cb`): `src/lib/userScopedStorage.js`
**נולד** שם (ב-`3195df2` — `ABSENT`), וכן `AppRoute` ב-`src/main.jsx`
(`3195df2:src/main.jsx` ⛔ מכיל `clearUserScopedStorage` ו⛔ `prevUid`; הוא מרנדר
`<Route path="/app" element={<SwingEdge />} />` **בלי `key`**).

שני שינויים, ושניהם נוגעים כאן:
1. **הטאטוא** — `main.jsx:156-159`: `if (prevUid.current && prevUid.current !== uid) clearUserScopedStorage();`
   יורה גם על `A→null`, כלומר **בהתנתקות**.
2. **ה-remount** — `main.jsx:171`: `<SwingEdge key={uid} />` ⇒ התחברות אחרי
   התנתקות היא **mount טרי**, ולכן `:1184` רץ **שוב**. בעץ הישן הקומפוננטה
   ⛔ התפרקה כלל (אותו `Route`, אותו element) ⇒ `showOnboarding` נשאר `false` בזיכרון.

`swingEdgeOnboarding` מתחיל ב-`swingEdge` ו⛔ נמצא ב-`DEVICE_KEYS`
(`userScopedStorage.js:18-33` — חמישה מפתחות: `Consent`·`Lang`·`IosInstallDismissed`·`FeatureFlags`·`BannedUsers`)
⇒ **הוא נמחק בכל התנתקות**, לפי החוזה המוצהר של המודול (`:10-15`: allowlist, כשל לכיוון «ההגדרה מתאפסת»).

### הטבלה — מסלול × עץ

נמדד ב-`/tmp/path_matrix.mjs`, שמריץ את **בייטי האתחול האמיתיים** של כל עץ
(חילוץ לפי עוגן, `new Function`) ואת `clearUserScopedStorage` ה**אמיתי** מול
`Storage` כפול. פלט מלא:

| מסלול | `3195df2` (לפני) | `3e10bbd` (היום) |
|---|---|---|
| **א** · התחברות אחרי התנתקות, אותו טאב | ⛔ **אין** הבהוב (⛔ mount טרי; `showOnboarding` נשאר `false`) | 🔴 **הבהוב** (mount טרי · אתחול `true`) |
| **ב** · רענון רגיל בלי התנתקות | ⛔ אין (mount טרי · אתחול `false`) | ⛔ אין (mount טרי · אתחול `false`) |
| **ג** · `localStorage` ריק (מכשיר חדש / מכל PWA טרי) | 🔴 **הבהוב** | 🔴 **הבהוב** |

⇒ **`95865cb` הרחיב את הבאג ממסלול אחד לשניים.** מסלול **ג** הוא «זה קרה גם קודם»,
ומסלול **א** הוא חדש — והוא בדיוק המסלול שניב תיאר («משתמש שמתחבר»).

**ממצא נלווה שנמדד באותה ריצה:** הטאטוא מסיר `3` מפתחות —
`["swingEdgeOnboarding","swingEdgeCapital","swingEdgeSettings"]` — ומשאיר `3`:
`["swingEdgeLang","swingEdgeConsent","sb-…-auth-token"]`.
🔴 **`swingEdgeSettings` הוא `MIRROR_KEY` (`userSettings.js:14`)**, ומחיקתו
מרוקנת את `readMirror()` — כלומר במסלול `status === "failed"`
(`userSettings.js:207-214`) המשתמש נשאר גם בלי DB **וגם** בלי מראה מקומית.
⛔ זה ⛔ נסגר כאן; זה פריט נפרד.
⚠️ **ומה שנשמר הוא נכון:** טוקן ה-auth של Supabase ⛔ מתחיל ב-`swingEdge`
(`supabaseClient.js:9-15` — `persistSession: true`, בלי `storageKey` מותאם ⇒
`sb-<ref>-auth-token`) ⇒ הטאטוא ⛔ מנתק את המשתמש. נמדד, ⛔ הונח.

---

## 3 · PWA — מה נמדד, ומה **מוצהר** כלא-נמדד

**נמדד מהקוד:**
- `public/manifest.json`: `"display": "standalone"` · `"start_url": "/"` · `"scope": "/"`.
- 🔴 **`start_url` הוא `/` ו⛔ `/app`** ⇒ כל הפעלה קרה של האפליקציה המותקנת
  עוברת `LandingGate` (`src/main.jsx:245`), ממתינה ל-session, ואז
  `if (session) return <Navigate to="/app" replace />` (`LandingGate.jsx:29`)
  ⇒ `AppRoute` ⇒ `<SwingEdge key={uid} />` = **mount טרי, תמיד**.
  ⚠️ זה ⛔ ייחודי ל-PWA (גם רענון טאב הוא mount טרי) — אבל לחלון PWA **אין**
  מסלול «הטאב נשאר פתוח»: סגירת החלון מסתיימת תמיד בהפעלה קרה.
- ⛔ **אין service worker בכלל** — `grep -rn "serviceWorker" src/ index.html` ⇒ `0` התאמות
  ⇒ ⛔ שכבת cache · ⛔ באנדל ישן · ⛔ אחסון משלו.
- **ההסתעפות היחידה על display-mode בכל המוצר** היא
  `src/components/IOSInstallBanner.jsx:20-21`
  (`matchMedia("(display-mode: standalone)")` · `navigator.standalone`).
  ⛔ אחסון · ⛔ session · ⛔ אונבורדינג מסתעפים על standalone.

⇒ **מהקוד: standalone ⛔ משנה דבר.** כל הבדל שנצפה חייב לבוא מחוץ לקוד.

**מוצהר כלא-נמדד:** האם ה-PWA המותקן מקבל **מחיצת `localStorage` נפרדת**
מהדפדפן. זו תכונת מנוע/מערכת-הפעלה ו⛔ תכונת קוד, ומדידתה דורשת את המכשיר
ו**התחברות לחשבון** — שניהם אסורים בפרומפט הזה. ⚠️ **ואם המחיצה אכן נפרדת,
ההתחברות הראשונה בתוך ה-PWA היא מסלול ג בהגדרה** — מה שמסביר «זה קרה גם קודם»
בלי להזדקק לשום מנגנון נוסף. ⛔ **זו השערה מוצהרת, ⛔ ממצא.**

---

## 4 · מפת המסכים באותה משפחה — מי מחליט «חדש/ריק» לפני `hydrationDone`

| # | מסך | ההחלטה | מגודר על הידרציה? |
|---|---|---|---|
| 1 | **`OnboardingScreen`** `:4082` | `showOnboarding` ← `localStorage:1184` | 🔴 **⛔ מגודר** |
| 2 | **מצב ריק בג'ורנל** `:5315` | `trades.length === 0`; `trades` ← `localStorage:1500`, נפילה ל-`MOCK_TRADES` (`:309` = `[]`) | 🔴 **⛔ מגודר** — ל-`loadTrades:1720-1753` **אין** דגל "נטען" בכלל |
| 3 | `WelcomeAnnouncement` `:4090` | `showWelcome` | ✅ `if (!hydrationDone) return;` (`:1304`) |
| 4 | `BetaWelcome` `:4095` | `showBetaWelcome` | ✅ אותו אפקט, `:1300-1315` |
| 5 | `OnboardingTour` `:4103` | `showTour` | ✅ ברירת מחדל `false` (`:1330`); נדלק רק ב-`dismissBetaWelcome:1358`, שמוגן `hydratedRef.current &&`, או ב-`startTour` ידני |
| 6 | הון · שם פרופיל `:4215`·`:7394`·`:7412` | `capitalSettled` (`:1256`) | ✅ **התבנית שכבר קיימת** — `hydrationDone \|\| hydrationFailed \|\| !isSupabaseConfigured` |
| 7 | באנר `B-268` (`capitalMaybeClobbered`) | נקבע רק בתוך `hydrate`, בענף `status === "ok"` (`:1864-1868`) | ✅ |
| 8 | באנר `hydrationFailed` `:4113` | נקבע רק בתוך `hydrate` | ✅ |
| 9 | `userProfile` `:1190-1199` | אותו `localStorage` של #1 | ⚠️ **חלקית** — הצרכן ב-`:4215` מגודר ב-`!capitalSettled`, המקור ⛔ |
| 10 | רשימת המעקב `:1697-1702` | `DEFAULT_WATCHLIST` כשאין מפתח | ⚠️ **חלקית** — `B-185` כבר שם שומרי `null` על `price`/`changePct`, אבל **הטיקרים** עצמם הם זרע |

🔴 **שניים ⛔ מגודרים (#1 · #2), ושניהם נפגעים מאותו טאטוא** — `swingEdgeTrades`
מתחיל ב-`swingEdge` ⛔ ב-`DEVICE_KEYS` ⇒ נמחק בהתנתקות ⇒ משתמש ותיק רואה גם
«אין לך עדיין עסקאות» עד ש-`loadTrades` נוחת. ⚠️ **זה מסך *שני* באותו גל, ⛔ הערת שוליים.**
⛔ **`MOCK_TRADES` הוא `[]` — נמדד** (`:309`) ⇒ ⛔ מוצגות עסקאות מומצאות; רק מצב-ריק שקרי.

---

## 5 · כיווני תיקון — **שלושה**, עם מחירים. ⛔ נבחר כאן

**הכלל שכולם חייבים לקיים:** ⛔ **מחליטים שמשתמש חדש לפני שההידרציה אמרה זאת.**
ושלושת מצבי `loadSettings` (`userSettings.js:155-164`) חייבים תשובה מפורשת:

| מצב | מה הוא אומר | מה חייב לקרות |
|---|---|---|
| `ok` | יש שורה | ההחלטה **מהשורה** — `completed === true` ⇒ אפליקציה; אחרת ⇒ שאלון |
| `empty` | **אין שורה — סמכותי** | משתמש חדש באמת ⇒ **השאלון מוצג**, ⛔ תקוע בשלד לנצח |
| `failed` | ⛔ ידוע | **⛔ להשאיר תלוי ו⛔ להציג שאלון לוותיק** — ראה מחיר בכל כיוון |

### כיוון A — `showOnboarding` תלת-מצבי + `onboardingSettled` (מראה של `capitalSettled`)

`:1187` מחזיר `null` («⛔ ידוע») כשאין מפתח, ו-`false` כשיש; `:1826` מקבל `else`
מפורש שקובע `true` על `ok`-בלי-`completed` ועל `empty`; `:4082` הופך ל-
`if (showOnboarding === true)`, ולפניו שלד כש-`showOnboarding === null && !settled`.
`failed` ⇒ `hydrationFailed` כבר ב-`capitalSettled:1256` ⇒ settled ⇒ **מציגים את
האפליקציה** עם באנר `:4113` הקיים.
- ✅ **זהה לאידיום שכבר בעץ** (`capitalSettled`) — ⛔ תבנית שנייה למתחזק ללמוד.
- ✅ סוגר **א ו-ג** בבת אחת, ⛔ נוגע ב-`userScopedStorage.js` ⇒ משמעת ה-allowlist ⛔ נפגעת.
- ⚠️ **מחיר:** במצב `failed` **משתמש חדש באמת** מקבל אפליקציה בלי פרופיל.
  זו הכרעת מוצר, ⛔ טכנית: «⛔ לדרוס ותיק» ו«⛔ לנטוש חדש» סותרים, ו-`failed` הוא
  בדיוק הנקודה שבה חייבים להעדיף אחד. ⇒ **דורש הכרעת ניב.**
- ⚠️ נוגע בשרשרת ה-`return` של כל האפליקציה ⇒ `T3`, ⛔ פחות.

### כיוון B — לא למחוק את הראיה: מפתח פר-משתמש

`swingEdgeOnboarding:<uid>` במקום מפתח גלובלי, בדיוק כמו
`swingEdgeBetaWelcome:${authUser.id}` שכבר קיים (`:1312`·`:1355`).
- ✅ **רדיוס פגיעה מינימלי** — ⛔ שינוי ברינדור · ⛔ שלד · ⛔ state חדש.
- 🔴 **⛔ סוגר את מסלול ג** — מכשיר חדש / מכל PWA טרי ממשיך להבהב, וזה בדיוק
  המסלול שניב אמר עליו «זה קרה גם קודם». ⇒ **מטפל בסימפטום של מסלול אחד.**
- 🔴 **ופותח מחדש ויכוח סגור:** `DEVICE_KEYS` הוא allowlist של **התאמות מדויקות**
  (`userScopedStorage.js:50`, `includes(k)`), ומפתח פר-משתמש הוא קבוצה **בלתי חסומה**
  ⇒ הוא יחייב **כלל תחילית** בתוך ה-allowlist, כלומר בדיוק הפרצה ש-`:10-15` נבנה למנוע.
- ⚠️ ובכל מקרה נשאר מפתח מיותם לכל משתמש-לשעבר על המכשיר.

### כיוון C — שלד גורף לפני `:4082`

`if (!capitalSettled) return <skeleton/>;` מעל `:4082`, בלי תלת-מצב.
- ✅ **הזול והקצר ביותר** — שורה אחת, ⛔ שינוי באתחול, ⛔ `else` חדש ב-`hydrate`.
- 🔴 **מחיר על המסלול השכיח:** מסלול **ב** (רענון רגיל) יודע את התשובה **מקומית
  ובצדק** — וכיוון C מעכב את **כל** האפליקציה בשני round-trips גם שם.
  כלומר הוא מתקן `2/3` מסלולים ומחמיר את ה-`1` התקין.
- 🔴 **ומשתמש חדש באמת** בוהה בשלד שני round-trips לפני שהשאלון מופיע —
  המסך הראשון שלו במוצר.
- ⚠️ במצב `failed` `capitalSettled` מתקיים ⇒ נופלים ל-`showOnboarding` המנוחש ⇒
  **ותיק עם DB שנכשל עדיין רואה שאלון.** כלומר C ⛔ סוגר את המקרה הגרוע.

---

## 6 · האסרציה המוצעת `A20` — **נצפתה אדומה על העץ הנוכחי**

**הנוסח המבוקש בפרומפט** («השאלון ⛔ מרונדר בשום רגע לפני `hydrationDone`») ⛔ ניתן
לבנייה ב-`test:hydration` **כפי שהוא**: ההארנס מריץ בייטים ב-`new Function` מחוץ
ל-React ⇒ ⛔ JSX · ⛔ DOM · ⛔ mount. לכן `A20` מוצעת כ**שני חצאים**, ושניהם
**נצפו אדומים בפועל** (`/tmp/a20_probe.mjs`, פלט מלא בדיווח):

- **`A20a` — ערך.** חילוץ לפי עוגן של גוף המאתחל `:1184-1189`, הרצה עם
  `localStorage` ריק. **נמדד: `true`.** ⇒ ✗ **אדום**: «⛔ ידוע» נענה בניחוש ⛔ בהודאה (`R-2`).
- **`A20b` — צורה.** `if (showOnboarding) {` חשוף ב-`:4082`. **נמדד: התאמה אחת.**
  ⇒ ✗ **אדום**: הרינדור יורה על ערך שטרם התיישב.
- **שערי-מטא** (`B-272` — כשל חילוץ הוא אדום קשה, ⛔ דילוג): עוגן ≠ 1 ⇒ עצירה ·
  סוגריים לא מאוזנים ⇒ עצירה. שניהם ירוקים היום (`anchor count = 1` · `128 bytes`).

**הצהרות גבול — חובה, אחרת `A20` תיקרא כמה שהיא איננה:**
1. 🔴 **`A20a` אדומה ב*שני* העצים** (`3e10bbd` **וגם** `3195df2` — נמדד) ⇒ היא מודדת
   את ה**מנגנון**, ⛔ את הרגרסיה של `95865cb`. את הרגרסיה מודדת **טבלת §2**, וזו
   ⛔ אסרציה בשרשרת. מי שיקרא ירוק ב-`A20a` כ«מסלול א נסגר» טועה.
2. ⚠️ **`A20b` היא צורה בלבד** על בייטים של JSX — במחלקת `C1`–`C12` של
   `test:equitystate`. היא מוכיחה שהשער ⛔ חשוף, ⛔ שהמסך נכון.
3. ⛔ **ואף אחת מהשתיים ⛔ מוכיחה שהמשתמש ⛔ רואה את השאלון** — React · DOM ·
   דפדפן אמיתי · PWA · פרודקשן חיים ב-**`C-0xx` חדש בלבד**, ו-`T3` ⛔ נסגר בלעדיו (§15).
4. ⚠️ אם התיקון שייבחר ⛔ ישנה את המאתחל (למשל כיוון B), **`A20a` תישאר אדומה
   לנצח** ⇒ היא ⛔ ניטרלית בין הכיוונים, ובחירת כיוון B מחייבת ניסוח מחדש שלה.
   ⛔ **וריכוך שלה כדי לעבור הוא `R-4`.**

---

## 7 · מה נשאר בלי בית (§10.1) — חוב מוצהר

הפרומפט אוסר `STATE`/`NEXT`/`BACKLOG`/`CHECKS` בגל הזה, ולכן ארבעת הפריטים
שהתגלו כאן **⛔ קיבלו מזהה**, וזה חוב פתוח לגל הבא — ⛔ «נטפל בזה אחר כך»:

1. הבהוב השאלון עצמו (`:1184` + `:4082`) — הפריט שהתוכנית הזו מתארת.
2. מצב-ריק שקרי בג'ורנל (`:5315`) — אותה משפחה, ⛔ אותו קוד.
3. `swingEdgeSettings` (`MIRROR_KEY`) נמחק בטאטוא ⇒ מסלול `failed` נשאר בלי מראה.
4. `C-0xx` חדש — אימות עין ל-`T3`, כולל **PWA standalone** שהוא התנאי שבו נצפה.

🆕 **החוב נסגר 24.09 בקומיט הרישום — ארבעתם קיבלו מזהה, ו⛔ אחד נשאר בלי בית:**

| # | מזהה | שורש | איפה חי | מצב |
|---|------|------|----------|------|
| 1 | **`B-365`** | ‹R-2› | `docs/BACKLOG.md` + 🔴 ב-`docs/STATE.md` | הקוד נדחף ב-`5a97a37`; **⏳ ממתין-לאות** — ⛔ סגירה בלי `C-059` |
| 2 | **`B-367`** | ‹R-4› | `docs/BACKLOG.md` | **פתוח — גל נפרד** (הכרעת ניב 24.09) |
| 3 | **`B-366`** | ‹R-6› | `docs/BACKLOG.md` | פתוח |
| 4 | **`C-059`** | — | `docs/CHECKS.md` | ⓵ ⓶ ⓸ · **⛔ טרם נבדקה** |

⚠️ **ו-⓷ (מצב-ריק בג'ורנל) ⛔ הוא סעיף ב-`C-059`** — הכרעת ניב 24.09 הוציאה
אותו והפכה אותו ל**מדד הסגירה של `B-367`**, כדי ש-`C-059` ⛔ ייוולד חסום מראש על
ממצא **ידוע**. ⛔ **וזו ⛔ הקלה**: הסעיף ⛔ בוטל — הוא עבר בעלים.

⚠️ **`B-367` נושא גם את מה שהמדידה הוסיפה ב-24.09 ו⛔ היה בתוכנית:** ה-`catch`
הבולע ב-`:1779-1781` (והפנימי ב-`:1773`) ⇒ **הדגל חייב להידלק גם במסלול הכשל**,
ומה שמוצג אז — שגיאה או מצב-ריק מסויג — הוא **הכרעת אותו גל**. ⚠️ **ומספרי
השורות בסעיף M0 נסחפו** `:1722-1753` → **`:1754-1785`** (קומיט 1 הוסיף שורות
מעליו) — ⛔ הממצא השתנה; זה בדיוק `B-280`.

---

## 8 · מה הגל הזה ⛔ עשה

`0` קבצי קוד · `0` `src/` · `0` `api/` · `0` `scripts/` · `0` `tests-sentinel/` ·
`0` `.github/` · `0` כתיבות DB · `0` סודות · `0` התחברויות לחשבון · `0` שינוי
ב-`STATE`/`NEXT`/`BACKLOG`/`CHECKS`. הסקריפטים שמדדו חיים ב-`/tmp/` ו⛔ בריפו.

---

# תוכנית מימוש — 23.09, אחרי הכרעות ניב

**סיווג §15 לגל המימוש: `T3` · תשובות `כן/כן/לא/כן/לא`.**
① הפיכות — נוגע במסלול שכותב ל-`user_settings` ⇒ **כן** · ② אמון — הון שנדרס
הוא מספר שגוי בלי ידיעה ⇒ **כן** · ③ אבטחה — ⛔ `auth`/RLS/`api/`/סודות ⇒ **לא** ·
④ רוחב — `SwingEdge_App.jsx` + `scripts/hydration-wiring-test.mjs` + מסלול כתיבה
⇒ **כן** · ⑤ ודאות — כל הנחה נמדדה היום ⇒ **לא**.
⇒ **⛔ סגירה בלי אימות עין** (`C-059`).

## M0 · מדידת דגל העסקאות (סעיף 3) — 🛑 **STOP, ⛔ המצאה**

**נמדד:** `loadTrades` (`:1722-1753`) קורא `setTrades` בלבד, בשניים מארבעת מסלולי
היציאה שלו (שומר · `error`+fallback · הצלחה · `catch`). ⛔ **אין שום דגל.**

```
grep "tradesLoaded|tradesReady|tradesSettled|loadingTrades|tradesLoading"
  SwingEdge_App.jsx src/**  ⇒ 0 hits
setState בתוך גוף האפקט 1722-1753 ⇒ setTrades ×2 בלבד
```

⇒ **סעיף 3 ⛔ מבוצע בגל הזה.** דגל חדש הוא *state* חדש על מסלול טעינה — החלטה,
⛔ ריפקטור, והכלל היה «⛔ תמציא». נרשם כ-**`B-367`** ב-commit 2 עם ארבעת מסלולי
היציאה שדגל כזה יצטרך לכסות. ⚠️ ה-`catch` ב-`:1747` ⛔ עושה fallback — הוא בולע.

## M1 · `SwingEdge_App.jsx` — ששת ה-diff

**① `:1184-1189` — האתחול מפסיק לנחש**
```js
const [showOnboarding, setShowOnboarding] = useState(() => {
  // B-365: המפתח המקומי הוא **מטמון**, ⛔ סמכות. אחרי טאטוא החלפת-משתמש הוא
  // נעדר אצל משתמש ותיק, ו-`!saved` רינדר שאלון מעל חשבון אמיתי — שלחיצה
  // אחת עליו דורסת את ההון (`handleOnboardingComplete`).
  // מפתח קיים ⇒ `false` בטוח: הוא יכול רק **להסתיר**.
  // מפתח נעדר + יש backend ⇒ `null` = ⛔ יודעים. בלי backend אין שורה לחכות
  // לה, המפתח המקומי **הוא** הסמכות ⇒ `true`, בדיוק כמו היום.
  try { if (localStorage.getItem("swingEdgeOnboarding")) return false; } catch { }
  return isSupabaseConfigured ? null : true;
});
```

**② ליד `:1256` — `onboardingSettled` במראה של `capitalSettled`**
```js
// ⚠️ `hydrationFailed` **חייב** להיות כאן, מאותה סיבה בדיוק שב-:1250 — גוף
// ההידרציה חוזר מוקדם ב-:1790 · :1797 ו⛔ מיישב את השאלון, ושער על
// `hydrationDone` לבדו היה משאיר **שלד לנצח** על הסשן שכבר איבד את ה-DB.
const onboardingSettled = showOnboarding !== null || hydrationFailed;
```

**③ `:1790` ו-`:1797` — כישלון ⛔ «משתמש חדש»**
```js
if (m.reason === "check-failed") {
  console.error("[hydrate] settings check failed — writes stay blocked for this session");
  setShowOnboarding(false);        // B-365 — ⛔ שאלון על כישלון
  setHydrationFailed(true);
  return;
}
const { status, settings: s } = await loadSettings(authUser.id);
if (cancelled) return;
if (status === "failed") {
  console.error("[hydrate] settings read failed — writes stay blocked for this session");
  // המראה ש-`loadFailed` מחזיר הוא **לתצוגה**: אם הוא נושא onboarding שהושלם,
  // גם הפרופיל משוחזר ממנו. (הכרעת ניב: «אם יש mirror מקומי — השתמש בו».)
  if (s?.onboarding?.completed === true)
    setUserProfile({ ...s.onboarding.profile, ...(s.onboarding.answers || {}) });
  setShowOnboarding(false);        // ⛔ שאלון לוותיק · חדש אמיתי ישלם בכניסה הבאה
  setHydrationFailed(true);
  return;
}
```
**נימוק מוצהר:** שאלון לוותיק = דריסת הון ב-DB = **בלתי הפיך**. דילוג לחדש =
**הפיך**, נפתר בכניסה הבאה.

**④ `:1826-1830` — מהשתלטות חד-כיוונית ליישוב**
```js
if (s.onboarding?.completed === true) {
  setShowOnboarding(false);
  setUserProfile({ ...s.onboarding.profile, ...(s.onboarding.answers || {}) });
  try { localStorage.setItem("swingEdgeOnboarding", JSON.stringify(s.onboarding)); } catch {}
} else if (showOnboarding === null) {
  // קריאה סמכותית (`ok` בלי onboarding · `empty` = אין שורה) ⇒ הוא באמת חדש.
  // ⚠️ `=== null` ⛔ קישוט: הוא מיישב את ה**לא-ידוע** בלבד ו⛔ סותר `false`
  // שהמטמון המקומי כבר קבע ⇒ משתמש עם מפתח מקומי ושורה בלי onboarding
  // מתנהג **בדיוק** כמו היום.
  setShowOnboarding(true);
}
```

**⑤ `:4082` — שער הרינדור**
```js
// B-365: `null` = ההידרציה ⛔ דיברה. ⛔ שאלון (דורס הון אמיתי) ו⛔ דשבורד ריק
// (נקרא כ«הנתונים שלך נעלמו»). אותו לודר של `!authReady` — ⛔ רכיב חדש.
if (!onboardingSettled) { return (<...אותו בלוק בדיוק של :4066-4075...>); }
if (showOnboarding === true) { return <OnboardingScreen onComplete={handleOnboardingComplete} />; }
```

**⑥ `:1486-1488` — אנליטיקס ⛔ מייחס מסך לפני שהוא ידוע**
```js
useEffect(() => {
  if (!onboardingSettled) return;
  trackScreenView(showOnboarding === true ? "onboarding" : tab);
}, [tab, showOnboarding, onboardingSettled]);
```

**⑦ (סעיף 4) הגנה כפולה על ההון** — `dbCapitalRef` מוכרז **מעל** `:1201`,
נדלק ב-`:1805` על `status === "ok"` בלבד, ונקרא ב-`:1207`:
```js
if (typeof s.capital === "number" && s.capital > 0) {
  if (status === "ok") dbCapitalRef.current = true;   // ⛔ על `empty` — שם `s` הוא המראה
  setCapital(s.capital); …
}
…
if (cap > 0 && !dbCapitalRef.current) { setCapital(cap); localStorage.setItem("swingEdgeCapital", …); }
```
**⛔ שובר חדש אמיתי (מדוד ב-`A24b`):** חדש ⇒ `status === "empty"` ⇒ הדגל נשאר
`false` ⇒ ההון מהשאלון **כן** נכתב.

⚠️ **שלושת הצרכנים האחרים כבר בטוחים** — `:1307` ו-`:1899` משווים `=== false`
מפורשות ⇒ `null` ⛔ מפעיל את ה-welcome ו⛔ כותב `onboarding` ל-DB. הסיור רוכב על
`dismissBetaWelcome` ⇒ מגודר בשרשרת. ⇒ `test:tour` נדרש **ירוק כרגרסיה**.

## M2 · `scripts/hydration-wiring-test.mjs` — שער-לפני

שני עוגנים חדשים (אתחול `showOnboarding` · `handleOnboardingComplete`) + שערי-מטא
(`≠ 1` · איזון סוגריים) — **כשל חילוץ = אדום קשה, ⛔ דילוג** (`B-272`).
`runHydrate` יקלוט `setShowOnboarding` (היום `() => {}` ו⛔ נמדד).
`clearUserScopedStorage` ה**אמיתי** מיובא ל-`A21`.

| # | מה | אדום-לפני? |
|---|----|------------|
| `A20a` | localStorage ריק ⇒ האתחול ⛔ מחזיר `true` | ✅ **נצפתה** |
| `A20b` | שער הרינדור ⛔ `if (showOnboarding)` ערום | ✅ **נצפתה** |
| `A21` | טאטוא אמיתי ⇒ התחברות ⇒ השאלון ⛔ מרונדר לפני יישוב | ✅ **נצפתה** (מטריצת המסלולים) |
| `A22` | `failed` ⇒ יושב ל-`false` (⛔ שאלון) | ✅ אפס קריאות היום |
| `A23` | `empty` ⇒ יושב ל-`true` (**ביקורת**) | ⚠️ **ראו למטה** |
| `A24a` | הון מ-`ok` ⇒ `handleOnboardingComplete` ⛔ דורס | ✅ היום דורס תמיד |
| `A24b` | חדש (`empty`) ⇒ ההון מהשאלון **כן** נכתב (**ביקורת**) | ⛔ ירוקה בשני העצים |

⚠️ **`A23` — הצהרה, ⛔ זיוף.** בקריאת **תוצאה** («המשתמש רואה שאלון») היא
**ירוקה בשני העצים** — וזו בדיוק זרוע ביקורת תקינה (`K1`–`K6` ב-`test:cents`).
בקריאת **יישוב מפורש** («נקראה `setShowOnboarding(true)`») היא **אדומה היום**,
כי היום אפס קריאות. ⇒ אממש את **שתיהן**: `A23` ביקורת ירוקה-בשניהם +
`A23b` יישוב אדום-לפני. ⛔ אציג ירוקה-בשניהם כראיה לתיקון.

⚠️ **`A20a`/`A20b` אדומות גם על `3195df2`** ⇒ הן מודדות **מנגנון**, ⛔ רגרסיה.
**`A21` היא היחידה שירוקה על העץ הישן** ⇒ היא אסרציית הרגרסיה של `95865cb`.

מניית `test:hydration` תזוז `25` → `~33` בפרוזת `CLAUDE.md` §7 — **ביד** ⇒
`B-324`, מוצהר ⛔ נסגר.

## M3 · סדר ביצוע

1. שער-לפני: הוספת האסרציות **בלבד** ⇒ הרצה ⇒ **הדבקת האדום**.
2. ששת ה-diff ב-`SwingEdge_App.jsx`.
3. `test:hydration` · `test:settings` · `test:tour` · `test:analytics` ירוקים.
4. `npm run verify` **ערום**, `$?` נלכד ⇒ `EXIT=0`.
5. `CLAUDE.md` §7 — מניית `test:hydration` + מסלול `userScopedStorage`.
6. **commit 1** `fix(onboarding): tri-state gate — never decide "new user" before hydration` ⇒ push.
7. **commit 2** רישום: `B-365` (ההבהוב) · `B-366` (`MIRROR_KEY` בטאטוא) ·
   `B-367` (דגל העסקאות) · `C-059` (4 סעיפי אימות עין) · `STATE` · `NEXT` ·
   §7 כאן ⇒ `test:registry` ⇒ push.
8. אחרי דיפלוי: `SENTRY_RELEASE.id` בבאנדל הפרודקשן = `HEAD`.

**מזהים נמדדו פנויים:** `B-365` · `B-366` · `B-367` · `C-059` —
`git log --all -S` ⇒ `0` קומיטים, `0` קבצים לכל אחד.

`C-059` ⓵ ותיק: התנתקות→התחברות ⇒ ⛔ שאלון אף לרגע · ⓶ PWA: סגירה→פתיחה ⇒
⛔ שאלון · ⓷ הג'ורנל ⛔ מציג «אין עסקאות» לרגע — ⚠️ **⓷ צפוי להיכשל**: `B-367`
לא תוקן, וזו תצפית ⛔ הבטחה · ⓸ **ביקורת** חשבון חדש ⇒ השאלון **כן** מופיע.

⛔ **`MIRROR_KEY` ⛔ בגל הזה** (סעיף 6) — `B-366` בלבד.
