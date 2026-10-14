# PLAN 2026-10-14 — B-408 · סקלרים בחלון ההידרציה: שער עריכה (אופציה B)

## Context
במכשיר חוזר הממשק חי לפני ש-`loadSettings` חזר, וחמשת רכיבי העריכה ב-Settings **פעילים** בחלון (`SwingEdge_App.jsx:7416-7700` — ⛔ `disabled` כלל). ההידרציה (`:1879-1918`) מחילה «DB גובר» ⇒ עריכה בחלון נדרסת בשקט. אבחון מלא: `docs/audits/B408-SCALAR-HYDRATION-DIAGNOSIS-2026-10-14.md`.

**Safety gate ✅:** `HEAD=3957509=origin/main` · עץ נקי · `hooksPath=.githooks` · ענף עם push ב-60 דק' — `dependabot/*` בלבד (בוט, ⛔ סשן) · `npm run verify` על main ⇒ `VERIFY_EXIT=0`.

## §2 — אבחון (build הרמטי `3957509`, GET `user_settings` מוחזק · Pixel 7/Chromium + iPhone 14/WebKit)
- **2a:** 5 סקלרים, 9 רכיבים, כולם enabled בחלון. `capitalGate` (`D-103`) משבית רק את `Log Trade` (`:2874`) ⇒ ⛔ מוציא אף סקלר מההיקף. `handleOnboardingComplete` ⛔ נגיש בחלון (`B-365`).
- **2b (שרד מסך+LS+DB+רענון):** `capital` · `riskPct` · `capitalCurrency` · `accountCurrency` — **`0/30` בכל אחד, בשני המנועים (`0/240`)**, דטרמיניסטי, ⛔ הודעה. `lang` — `30/30` **במקרה**: `:1915` משווה `s.lang !== lang` מול closure ההרכבה ⇒ ⛔ נדרס כשהשורה = ערך ההרכבה.
- **2c:** ערך שמכשיר B כתב **נשמר** (`100/100`) — A ⛔ דורס. אבל: A **מציג ערך מיושן** בחלון ל-4/5 סקלרים (`80/80`; ההון בשלד) · עריכת A בחלון (סקלר אחר) ⛔ מגיעה ל-DB (`0/100`) · קונפליקט על אותו סקלר — A ⛔ מנצח (`0/60`, כולל `lang`).
- **2d:** חלון הרמטי (ריצה בודדת, n=30, seed=1): Chromium p50 `48ms`/p95 `51ms` · WebKit p50 `140ms`/p95 `176ms`. 2 קריאות טוריות. RTT ל-Supabase p50 `73ms`/p95 `143ms` ⇒ פרודקשן ≈ `~0.2–0.5s` ברשת טובה, `~0.4–1.3s` ב-4G. **החלון אמיתי כשהקריאה איטית/תקועה** — ⛔ «כל משתמש חוזר».
- **2e K6:** A מיושר (יומן משותף ב-LS) · B ⛔ נוגע · כתיבה בו-זמנית — last-writer-wins בשתיהן. ⛔ נפתר.

## §15 — רמה T3 · כן/כן/לא/כן/לא
הפיכות **כן** (עריכה אבודה) · אמון **כן** (הון/סיכון ⇒ גודל פוזיציה) · אבטחה לא · רוחב **כן** · ודאות לא (נמדד היום).

## §3 — השוואה
| | A · יומן דלתא לסקלרים | **B · שער עריכה** |
|---|---|---|
| 2b | ✅ מוחל מעל ה-DB | ✅ עריכה בחלון ⛔ אפשרית; אחרי נחיתה שורדת |
| 2c conflict | ✅ A מנצח (`B-361`) | ✅ ⛔ קונפליקט; ערך B מוצג ונשמר |
| סיכון | op מיושן גובר על ערך חדש ממכשיר אחר עד settle · `"12000"`≠`12000` ⇒ op לנצח בלי parse · ⚠️ **כשל שקט חדש**: בלי טריגר מפורש, עריכת חלון ⛔ נשלחת כשאין שינוי אחר אחרי ההידרציה · `lang` LS נכתב בטיק הבא | שער שלא משתחרר (מכוסה: `hydrationFailed` בפרדיקט + C3 + mutant) |
| UX (2d) | שקוף | חלון `~0.2–0.5s` ⇒ כמעט ⛔ נראה; בקריאה תקועה — «טוען…» כן |
| היקף | `settingsDelta` (`kind:"scalar"`+parse) · 5 `recordOp` · ענף הידרציה × 5 · טריגר התמדה · settle | `disabled={!capitalSettled}` ב-7 אתרי JSX + 3 `role="status"` |
| ערך ב-`test:hydration` | ✅ גוף `hydrate` | טבלת אמת של `capitalSettled` (בייטי הקובץ) מול `capitalGate` האמיתי; חיווט = צורה; **ההוכחה בערך היא ה-eye** |
| mutants | M1 · M2 · M4 | M1 ≡ BEFORE · M3 ×7 · ⛔ M2/M4 (אין יומן) |

**המלצה: B.** מניעה במקום פיוס; פרדיקט קיים (`capitalSettled`, `:1276`, ≡ `capitalGate(...) !== "loading"`); ⛔ מצב חדש, ⛔ נגיעה ב-`settingsDelta`/upsert/`alreadySent`. A מוסיף נתיב כשל שקט כדי לתקן חלון של מאות ms. ⛔ שני מנגנונים.

⚠️ **תנאי הסגירה (§5 בפרומפט) משתנה ב-B — זה מה שאתה מאשר:** «עריכה בחלון ⇒ שורדת» ⇒ **«בחלון: 9 רכיבים מושבתים + `role=status` «טוען…»; אחרי נחיתת הקריאה: עריכה ב-`keyboard.type` שורדת רענון ונכתבת ל-DB»**. מדד x/30 אחרי: עריכות-חלון שהתקבלו ונבלעו `0/30` (מושבת) + עריכה אחרי נחיתה שורדת `30/30`, לכל סקלר × מנוע.

## §3+ — שלוש התוספות (הכרעת ניב 14.10)

**① קריאה תקועה — ⚠️ הנחת הפרומפט ⛔ מתקיימת:** ל-`capitalGate`/`capitalSettled` **אין timeout**. `FX_SETTLE_MS` (8s, `B-376`) חל על טבלאות ה-FX בלבד (`:2314-2322`). `loadSettings`/`migrateFromLocalStorage` (`src/lib/userSettings.js:190`/`:283`) ⛔ נושאים timeout ⇒ GET שלא חוזר ⇒ `hydrationFailed` ⛔ נדלק ⇒ **כבר היום** `Log Trade` נעול לנצח («טוען הון…», `B-386`) והכתיבות חסומות; ב-B גם Settings היה ננעל לנצח. ⇒ **בהיקף:**
- `SETTINGS_READ_TIMEOUT_MS = 8000` (מיושר ל-`FX_SETTLE_MS`; פי ~6 מהערכת ה-4G ב-2d) ב-`userSettings.js`. שתי הקריאות (`select user_id` · `select settings`) רצות מול טיימר + `AbortController` (`.abortSignal()` של postgrest-js `2.110.8`). פקיעה ⇒ **אותו מסלול כשל קיים**: `check-failed` / `loadFailed` ⇒ `hydrationFailed` ⇒ `capitalSettled=true` ⇒ הרכיבים enabled + באנר `B-268` (`role="alert"`, «…עד לרענון מוצלח» = הוראת retry) · הכתיבות נשארות חסומות. ⛔ שינוי בגוף `hydrate`. תשובה מאוחרת **נזרקת** (המירוץ כבר הוכרע; ⛔ נוגעת ב-cache/`lastSent`).
- ⚠️ חסם: ≤ 8s לקריאה תקועה **ראשונה**; ≤ 16s במקרה הקצה (בדיקת הקיום חזרה ב-7.9s ואז ה-load נתקע). מוצהר, ⛔ מוסתר.
- ⚠️ trade-off: קריאה שהייתה מצליחה אחרי >8s הופכת ל«נכשלה» (באנר + רענון) — במקום המתנה עיוורת שבה `Log Trade` ממילא נעול.
- בדיקות: `test:settings` — קריאה שלא חוזרת ⇒ `status:"failed"` תוך הזמן (שעון מוזרק) · תשובה מאוחרת ⛔ מזריעה cache/`lastSent` · אותו לבדיקת הקיום ⇒ `check-failed`. eye `C5 hang` (הרמטי): GET ⛔ משוחרר ⇒ `expect(…).toBeEnabled({timeout: 8s+מרווח})` לתשעת הרכיבים + באנר `B-268` גלוי ⇒ ⛔ נעילה אינסופית. mutant `M5-NOTIMEOUT` (הטיימר הוסר) ⇒ C5 אדום + `test:settings` אדום.

**② אתרי עריכה — grep לכל setter (`setLang`·`setCapital`·`setRiskPct`·`setAccountCurrency`·`setCapitalCurrency`) ב-`SwingEdge_App.jsx`+`src/**`, + כתיבת מפתחות ה-LS שלהם, + העברת setter כ-prop (`={setX}` — 0 תוצאות):**
| אתר | שורה | נגיש בחלון? | מכוסה בשער? |
|---|---|---|---|
| Settings · `<select>` שפה | `:7418` | ✅ | ✅ (B) |
| Settings · input+כפתור הון | `:7588-7606` | ✅ | ✅ |
| Settings · `capitalCurrency` ×2 | `:7630` | ✅ | ✅ |
| Settings · `accountCurrency` ×2 | `:7652` | ✅ | ✅ |
| Settings · input+כפתור סיכון | `:7678-7700` | ✅ | ✅ |
| `handleOnboardingComplete` | `:1228-1244` | ⛔ — מכשיר חוזר: `showOnboarding=false` מהמראה; טרי: שער `onboardingSettled` (`B-365`) | n/a |
| `hydrate` | `:1883-1916` | — כותב מערכת, ⛔ עריכה | n/a |
| `OnboardingScreen` | `src/components/OnboardingScreen.jsx:213/372` | state מקומי ⇒ דרך `handleOnboardingComplete` | n/a |
| `LandingPage` מתג שפה | `src/components/LandingPage.jsx:625-630` | route `/`, state מקומי, ⛔ כותב `swingEdgeLang` | n/a |
| מחשבון גודל פוזיציה (כלים) | `posCalc` `:1654` | state ארעי; ⛔ כותב אף סקלר (0 התאמות setter/LS) | n/a |
| מתג שפה בכותרת/תפריט משתמש | — | **⛔ קיים** (`setLang` נקרא ב-`:7418` בלבד) | — |
⇒ **9 הרכיבים הם כל אתרי העריכה הנגישים.** ⚠️ ממצא אגב (⛔ אתר עריכה ⇒ ⛔ בהיקף ⇒ `BACKLOG`): המחשבון **קורא** `parseFloat(posCalc.capital) || capital` (`:6117`) ⇒ בחלון הוא מגדיר גודל פוזיציה מהון שלא הוכרע — אחות של `B-386` בטופס העסקה.

**③ ערך מיושן בחלון:** מטבעות — כש-`!capitalSettled` **⛔ כפתור מסומן** (שני הכפתורים בסגנון ניטרלי) + `aria-pressed` רק אחרי ההכרעה (`undefined` בחלון, `true/false` אחרי) — כך H6 מודדת «⛔ נבחר בחלון». הון וסיכון — שלד (סיכון נוסף, ⛔ עוד «✂️ ניתן לחיתוך»). שפה — נשארת.

## §4 — שינויים
1. **`SwingEdge_App.jsx`** Settings (`:7409-7714`) בלבד:
   - `disabled={!capitalSettled}` + `disabled:opacity-50 disabled:cursor-not-allowed` על: select שפה · input הון · «Update Capital» · כפתורי `capitalCurrency` · כפתורי `accountCurrency` · input סיכון · «Update Risk».
   - `{!capitalSettled && <p role="status" aria-live="polite">{t.loading}</p>}` בכרטיסי שפה · הון · סיכון. **⛔ מחרוזת חדשה** — `t.loading` קיים ב-5 השפות.
   - «סיכון נוכחי» ⇒ שלד כש-`!capitalSettled` (כמו «הון נוכחי» `:7610`; 2c: ערך מיושן `20/20`).
   - כפתורי המטבע: ⛔ סימון נבחר + `aria-pressed` רק כש-`capitalSettled` (③).
   - ⛔ גוף `hydrate` · ⛔ `settingsDelta` · ⛔ קומפוננטה בתוך render.
1b. **`src/lib/userSettings.js`**: `SETTINGS_READ_TIMEOUT_MS` + מירוץ טיימר/`abortSignal` ב-`loadSettings` ובבדיקת הקיום של `migrateFromLocalStorage` (①). ⛔ upsert · ⛔ `alreadySent` · ⛔ `saveSettings`/`flushSettings`. `test:settings` +בלוק hang.
2. **`scripts/hydration-wiring-test.mjs`** — בלוק `G` (באותה חוליה): `G1`–`G8` **ערך** — ביטוי `capitalSettled` מחולץ מהקובץ, מורץ על 8 צירופים ⇔ `capitalGate` האמיתי (`G2`: failed ⇒ `true`, ⛔ נעילה); `G9`–`G15` צורה — כל אתר נושא `disabled={!capitalSettled}`; `G16` 3 שורות status. שערי-מטא: עוגן ≠ 1 ⇒ אדום קשה (`B-272`).
3. **`tests-eye/hydration.spec.js`**: `H6 scalars-window` (9 רכיבים `toBeDisabled` + status בחלון ⇒ שחרור ⇒ `toBeEnabled` ⇒ `keyboard.type`/לחיצה ⇒ מסך · LS · DB `expect.poll` · רענון) · `C3 failed-read` (GET ⇒ 500 ⇒ enabled + באנר `B-268`) · `C4 not-edited` (B כתב `riskPct=3`, A ⛔ עורך ⇒ 3, DB גובר כמו היום). ⛔ `fill`/`addLocatorHandler`/retry/המתנות-זמן · scroll `instant`.
   **`@deployed`** (spec קיים או ייעודי): אותו מסלול מול production (QA), הון בלבד, שחזור הערך, hash בלוב לפני = אחרי.
4. **`scripts/eye-sync-probe.mjs`** זרועות: `HEAD` ירוק · `BEFORE-408` (`3957509`) ⇒ H6 אדום · `M3-EARLY` (שער על `authReady`) ⇒ H6 · `M3-FAILLOCK` (בלי `hydrationFailed`) ⇒ C3 · `M3-<X>` ×5 ⇒ H6 · `M5-NOTIMEOUT` ⇒ C5 · C1·C2·C4 ירוקים בכל זרוע · עם/בלי `EYE_SEED_HISTORY=1` · Pixel 7 + iPhone 14. node mutants: `NM-FAIL` ⇒ `G2` · `NM-CFG` ⇒ `G5`.
5. **רישום:** `STATE` · `DONE` (`D-124`) · `DECISIONS` (B מול A + תנאי הסגירה) · `CHECKS` (`C-072`) · `TRUTH` · `CLAUDE.md` §7 מניית `test:hydration` (`53 → N`, `B-257`) · `BACKLOG`: השוואת `lang` ב-closure (⛔ נגישה ב-B) · המחשבון קורא הון לא-מוכרע (`:6117`) · באנר `B-268` עברית/אנגלית בלבד (⛔ 5 שפות) · `NEXT`: `B-425` · `B-191` · `B-275`.

## §5 — סדר ביצוע (אחרי אישור, בלי עצירות)
קומיט תוכנית+אבחון (`docs(plan): B-408 … — awaiting approval`) ⇒ ענף `fix/b408-scalar-edit-gate` ⇒ **red-before** (H6 + `G` על HEAD, פלט מודבק) ⇒ תיקון ⇒ `npm run verify` (פלט מלא) + `test:registry` ⇒ probe מקומי ⇒ push `&&` ⇒ PR ⇒ CI עד סיום ⇒ `gh pr merge --merge` ⇒ deploy ⇒ eye `@deployed` מול production ⇒ רישום ⇒ דוח (hashes · x/30 לפני/אחרי · mutants · run ids · מה פתוח). `C-071`: ה-PR נוגע גם ב-`tests-eye/**` ⇒ ⛔ מוכיח, נשאר פתוח.

## Verification
red-before מודבק · `test:hydration` (בלוק G) אדום על HEAD/ירוק אחרי · probe: BEFORE+M3×7 נהרגים, ביקורות ירוקות, שני מנועים · כל ה-eye הקיים ירוק (overlay · width · cents · playbook · sync) · CI ירוק · eye `@deployed` ב-pixel7+iphone14 מול production + hash בלוב.

## ⛔ בגל
K6 · סכמה · upsert/`alreadySent` · מחרוזות load-bearing · `B-425`/`B-191`/`B-427`.

---
**אישור ניב 14.10:** אופציה B + תנאי הסגירה המעודכן + שלוש התוספות (① hang · ② אתרי עריכה · ③ מטבעות בלי סימון בחלון).
