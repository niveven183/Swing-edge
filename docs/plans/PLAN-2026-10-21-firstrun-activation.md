# PLAN 2026-10-21 — גל הפעלה 1 · «הדרך לעסקה הראשונה»

## Context
63 נרשמים · 16 תיעדו עסקה (`16/63`) · `36/47` מאלה שלא תיעדו השלימו שאלון ונעצרו. אודיט הרמטי 18.10 (⛔ בריפו — לא נמצא ב-`docs/audits/`) מדד 22 טאפים עד עסקה שמורה. המטרה: מסיום השאלון ועד עסקה שמורה ב-≤5 טאפים, בלי מחסום ניגודיות/באנר/פריסה בדרך — וכל זה נאכף בשער עין הרמטי שנצפה אדום על `main`. ⛔ השאלון עצמו (גל 2) · ⛔ DB · ⛔ סודות.

**Safety gate (20.10):** `git pull` ⇒ Already up to date · HEAD=`23d8ea8`=origin/main · עץ נקי · `hooksPath=.githooks` · worktree יחיד · ⛔ סשן אחר על הריפו (הסשן הרץ היחיד = `vin-project`).

## §15 — רמה: T3 · כן/לא/לא/כן/כן
1 הפיכות **כן** (פריסה פונה-משתמש; revert = deploy) · 2 אמון לא (⛔ מספר/המלצה משתנים) · 3 אבטחה לא (⛔ consent logic · ⛔ auth · ⛔ api) · 4 רוחב כן (≥6 קבצי קוד) · 5 ודאות כן (מספרי האודיט ⛔ נמדדו ע״י Code). ⇒ §8.1: אבחון read-only ⇒ `docs/audits/` ⇒ עצירה ⇒ ביצוע.

## §0 — מה כבר מאומת בקריאה (Plan Mode, ⛔ ריצה)
| # | ממצא | שורש שנמצא בקוד | מצב |
|---|------|------------------|-----|
| 1 | CTA בדאשבורד רק מנווט | `SwingEdge_App.jsx:4812` `onClick={() => setTab('journal')}`; פתיחת הטופס משוכפלת ×3 inline (`:2223` קיצור `N` · `:5620` ריק-יומן · `:8884` FAB) | אושש בקריאה |
| 2 | ניגודיות מודאל בבהיר ~1.2:1 | `WelcomeAnnouncement.jsx:64` כרטיס `bg-[#0A100D]` קבוע; `index.css:97` ממפה `text-white`→`--text-primary` `#1B2419`. **חושב: `1.20:1`** (כותרת) · `2.54:1` (גוף, `--text-secondary`) · תגית `#00C076` על לבן `2.39:1` · X `--text-muted` על לבן `2.48:1` | אושש בחישוב |
| 3 | CTA ראשי אחד מעל הקפל | CTA «בואו נתחיל» = dismiss בלבד, **אחרי** 2 בולטים+שורת פידבק+תגית; `flex items-center` + `overflow-y-auto` חותך את ראש התוכן כשהוא גבוה מה-viewport | לשחזור |
| 4 | באנרים מכסים CTA | הסכמה `z-91` מעל מודאלי **Close Trade** (`:8713`) ו-**Edit** (`EditTradeModal.jsx:124`) `z-50` ללא `--se-bottom-overlay`; CTA ריק-יומן (`:5620`) בזרימה — ייתכן מכוסה במיקומו הראשוני. **iOS: כבר מוגן** (`:4369` `ready={realTrades.length>0…}`, `D-114`) ⇒ אסרציה בלבד. `WelcomeAnnouncement` ⛔ `role="dialog"`/`aria-modal` ⇒ שומר «⛔ מעל מודאל» של באנר iOS עיוור אליו | לשחזור |
| 5 | קופסת toast ריקה | `index.css:683` `[role="status"][class*="fixed"]` פוגע **רק** במיכל (`ToastProvider.jsx:37`) ⇒ padding 16 + border + shadow + רקע לבן. נולד ב-`B-388` (01.10) כשהמיכל קיבל `role="status"`. ‏`:704` (RTL) צובע border ירוק על **כל** `role="status"` ב-RTL (7 אלמנטים) | אושש בקריאה |
| 6 | פעולות היומן מחוץ למסך ב-1440 | `:5661` `overflow-x-auto` + `:5665` 23 עמודות `whitespace-nowrap p-3`, `colAction` אחרונה, ⛔ sticky. `width.spec` מודד רוחב **עמוד** ורק בטלפונים ⇒ עיוור | אושש בקריאה |

⚠️ **פער מספרים לבדיקה ב-A:** קריאת הקוד נותנת על `main` **7** טאפים (מודאל → CTA דאשבורד → CTA יומן → ticker → entry → stop → Log Trade), הפרומפט אומר **9**. ההגדרה תיכתב בספק ובדוח; הפער ידווח, ⛔ יוסבר בניחוש.
⚠️ **Playwright `iPhone 14` = viewport ‏`390×664`** (⛔ `844` — זה המסך). ב-664 חל `ConsentBanner.css:121` (`max-height:760px` ⇒ כרטיס דחוס); ב-844 — הכרטיס המלא. ממצא 4 נצפה ב-844 ⇒ **שני הגבהים נמדדים**: `iphone14` (664, «מעל הקפל» המחמיר) + `iphone14tall` (`390×844`, `firstrun` בלבד). האודיט יאמר איזה מהם משחזר.
✅ **נבדק: מסלול `en` ⛔ שובר הון** — `dbCapitalRef.current = true` רק כש-`s.capital > 0 ∧ status==="ok"` (`:1973-1976`); שורת המיגרציה `{lang,_migrated}` ⛔ נושאת הון ⇒ הון השאלון נכתב.
✅ **נבדק: `test:analytics` #10 = נוכחות בלבד** (`/trackTradeFormOpened\(/`) ⇒ איחוד 3→1 ⛔ שובר.

## שלב A — אבחון מדוד על `main` (⛔ נגיעה בקוד מוצר)
1. **`tests-eye/firstrun.spec.js` (חדש)** — סצנה הרמטית/פרודקשן, `he`+`en` × `iphone14`·`pixel7`·`desktop1440`, ‏`colorScheme: "light"`. **⛔ סגירת באנר הסכמה, ⛔ `addLocatorHandler`** — הבאנר נשאר למעלה כל הדרך.
   - **משתמש בלי שורת הגדרות:** `store = newStore(); store.rowGone = true; store.settings = {}` (המודל כבר קיים ב-`hermetic.js:84`). `en` = מפתח מכשיר `swingEdgeLang` (⇒ מסלול המיגרציה; השאלון עברית בלבד — גל 2) — מוצהר בספק.
   - **השאלון** מונע ע"י עוגנים מ-`OnboardingScreen.jsx` (נגזרים מהקובץ, שער-מטא ≠1 ⇒ אדום, `B-272`), הון `10000` USD (+ זרוע `ILS` הרמטית — שער FX).
   - **מונה טאפים:** `tap(locator, label)` = הקשה אמיתית (⛔ `el.click()` ב-JS) ⇒ `+1`; הקלדה ⛔ נספרת, המיקוד שלפניה כן. **מתחיל אחרי** «מצוין! בואו נתחיל לסחור» (⛔ נספר) · **נגמר** כשהשורה ביומן + toast + הרשומה ב-store. מדיניות «עקוב אחר ה-CTA הראשי» שעובדת על שני העצים: מודאל ⇒ הכפתור הראשי; דאשבורד ריק ⇒ CTA; יומן ריק ⇒ CTA; טופס ⇒ ticker·entry (רק אם ריק)·stop·submit. תקרה 15 ⇒ אדום.
   - **לפני כל טאפ נספר** (⛔ טאפי השאלון): היעד בתוך ה-viewport ו-`elementFromPoint(מרכז)` ∈ היעד, **בלי גלילה** — זה ממצא 4 על כל הדרך. אותה בדיקה על כפתורי «סגור» של כל מודאל בדרך. טאפי השאלון — גלילה כמו משתמש (`clear()` של overlay.spec); כיסוי שם = גל 2 ⇒ נרשם בדוח, ⛔ צובע את הספק.
   - **P2 (מסלול חלופי):** X במודאל ⇒ CTA דאשבורד ⇒ חייב לפתוח `[role=dialog][aria-modal]` של Log Trade **בטאפ אחד**.
   - **ניגודיות:** כל צומת טקסט גלוי במודאל — צבע מחושב מול רקע מורכב (alpha-compositing של אבות עד רקע אטום) ⇒ `≥4.5:1`; אייקון X `≥3:1`. בהיר = שער · כהה = ביקורת (חייב להישאר ירוק בשני העצים). ⛔ axe (תלות חדשה) — חישוב WCAG מפורש.
   - **toast:** לפני הטאפ הראשון — מיכל `[role=status][aria-live]` ⇒ `width*height == 0` **או** (רקע שקוף ∧ border 0 ∧ shadow none). אחרי השמירה: ה-toast גלוי (ביקורת), ואחרי שפג ⇒ שוב לא מוצג. **+ שער ניגודיות טקסט ה-toast (הכרעת ניב 21.10):** הסרת הסלקטור מסירה גם את הלוח הלבן מאחוריו, ו-`Toast` עצמו `text-emerald-200` על `bg-emerald-500/10` ⇒ צפוי לא-קריא בבהיר. השער: טקסט ה-toast הגלוי בבהיר מול הרקע המורכב (toast ⇐ עמוד) `≥4.5:1` — **success** (השמירה בדרך) + **error** (תת-סצנה אחרי השמירה, ⛔ נספרת: stop מעל entry ב-LONG ⇒ `:3162`). כהה = ביקורת: הצבע המחושב של טקסט+רקע ה-toast זהה ל-`main` (`text-emerald-200`/`bg-emerald-500/10` וכו׳). ⚠️ `info` ⛔ נמדד במסך (⛔ מפעיל טבעי בדרך) — מתוקן באותה תבנית, ומוצהר בדוח.
   - **אחרי השמירה (בדיקה בלבד):** מודאל Close Trade + Edit נפתחים ⇒ submit + X עוברים `elementFromPoint` עם הבאנר למעלה ⇒ Escape. CTA ריק-יומן נבדק **לפני** השמירה (מעבר טאב, ⛔ נספר).
   - **iOS:** בכל הדרך עד השמירה ⛔ באנר התקנה.
   - **משתמש ותיק בלי `welcomeSeen` (הכרעת ניב 21.10):** store עם עסקאות (`EYE_SEED_HISTORY`) + `welcomeSeen` חסר + **עיכוב רשת מלאכותי על `GET /rest/v1/trades`** (`3s`, ב-route). דגימה רציפה של המודאל (MutationObserver בדף, מרגע הטעינה ועד אחרי נחיתת העסקאות + `1s`) ⇒ «תעד את העסקה הראשונה שלך» / «Log your first trade» **⛔ הופיע באף רגע**, והכפתור הראשי הוא «בואו נתחיל». ביקורת: אותו עיכוב על יומן **ריק** ⇒ «בואו נתחיל» עד הנחיתה ואז הנוסח מתחלף (מוכיח שהשער מודד את הטעינה, ⛔ דבר אחר).
   - **דסקטופ (`1440×900`, ואז `1024`, `768`):** אחרי השמירה (שורה OPEN = הרחבה ביותר) + `EYE_SEED_HISTORY` — כל כפתור פעולה (Close·✏️·🗑️) בכל שורה: `0 ≤ rect.left ∧ rect.right ≤ innerWidth` ∧ בתוך ה-rect הנראה של מיכל הגלילה ∧ `elementFromPoint` = הכפתור, `scrollLeft` התחלתי. + `scrollWidth ≤ innerWidth` של העמוד (⛔ גלילה אופקית).
   - ראיה: `firstrun.json` (טאפים לפי צעד · ניגודיות לכל צומת · rects) + screenshot למודאל/דאשבורד/טופס/יומן — ⛔ trace (`E11`).
2. **`playwright.eye.config.js`:** פרויקטים `desktop1440` (`Desktop Chrome`, ‏`1440×900`) + `iphone14tall` (`iPhone 14` עם `viewport 390×844`), שניהם `testMatch: /firstrun\.spec\.js/`. `pixel7`/`iphone14` מריצים את הספק אוטומטית.
3. **הרצה על `main`** (HEAD=`23d8ea8`, build הרמטי, Chromium מקומי + WebKit ל-iphone14) ⇒ **`docs/audits/FIRSTRUN-DIAGNOSIS-2026-10-21.md`**: טבלת טאפים מכשיר×שפה(×מטבע) · ניגודיות לכל צומת · מי מכסה מה ובאיזו קואורדינטה · rect מיכל ה-toast · x של כפתורי הפעולה ב-he/en · הפער 9↔מדוד · מה ⛔ שוחזר.
4. קומיט `test+docs(firstrun): diagnosis on main …` ⇒ push ⇒ **עצירה** (§8.1) — או המשך — לפי הכרעת ניב (ראה «הכרעה» למטה).

## שלב B — תיקונים (מהממצאים המדודים; מספרי השורות יאומתו מחדש)
1. **`openTradeForm()` — מקור-אמת אחד** (`useCallback`, setters יציבים): reset + `setOcrStatus(null)` + `setShowForm(true)` + `trackTradeFormOpened("manual")`. מחליף את 3 העותקים (`:2223`·`:5620`·`:8884`) ומחובר ל-CTA הדאשבורד (`:4812`). ⛔ מקור analytics חדש (רשימה סגורה, `test:analytics`).
2. **`WelcomeAnnouncement`:**
   - ניגודיות: כרטיס `bg-white dark:bg-[#0A100D]` (כהה נשאר byte-זהה) · תגית `text-[#047857] dark:text-[#00C076]` (`5.48:1`) · X `text-slate-400` (`--text-tertiary` `4.65:1`). ⛔ אינטרפולציה (§13).
   - CTA ראשי אחד: prop חדש `onLogTrade` + **`firstTrade = tradesLoaded && realTrades.length === 0`** (הכרעת ניב 21.10). `tradesLoaded` = state חדש: `true` רק אחרי `setTrades(cleaned)` של טעינה מ-Supabase שהצליחה (ובמצב local-only — מהאתחול); מתאפס ל-`false` בהחלפת `authUser`; טעינה שנכשלה ⇒ נשאר `false` ⇒ «בואו נתחיל» (⛔ ניחוש «יומן ריק», `R-2`). עד שהטעינה מסתיימת מוצג «בואו נתחיל». `firstTrade` ⇒ «תעד את העסקה הראשונה שלך» / «Log your first trade» ⇒ `dismissWelcome()` ואז `openTradeForm()`. אחרת ⇒ «בואו נתחיל» (התנהגות קיימת, ⛔ שינוי למשתמש עם עסקאות). X/רקע/Escape = סגירה בלבד.
   - קפל: CTA עובר מיד אחרי הכותרת+שורת פתיחה; הבולטים מתחתיו · `p-5 sm:p-8` · ילד `m-auto` במקום `items-center` (⛔ חיתוך ראש התוכן).
   - `role="dialog" aria-modal="true" aria-labelledby` + `useModalA11y` (Escape · מלכודת מיקוד) ⇒ שומר המודאל של באנר iOS רואה אותו.
   - ⛔ נגיעה ב-`dismissWelcome` (עוגן `test:hydration` `A15`–`A17`).
   - ⚠️ שינוי הנוסח הופך «בואו נתחיל» ב-`OnboardingScreen` לייחודי ⇒ `ONBOARDING_PATTERNS` (`tests/lib/eyeTools.js:120`) עשוי לגדול בביטוי אחד. ⛔ שובר (`M3` הוא `≥2`) — נבדק ב-`test:smoke`.
3. **באנרים:** מודאלי Close Trade + Edit ⇒ אותו inset של Log Trade (`paddingBottom: calc(1rem + var(--se-bottom-overlay, 0px))` + `max-h-[calc(90vh-var(--se-bottom-overlay,0px))]`). CTA ריק-יומן — **לפי המדידה**: אם מכוסה במיקומו הראשוני ⇒ דחיסת הכרטיס במובייל (`p-6 sm:p-12`). ⚠️ אם דחיסה ⛔ מספיקה ⇒ **עצירה** — הפתרון הבא נוגע בגובה באנר ההסכמה (משטח משפטי, החלטת ניב).
4. **toast:** הסרת `[role="status"][class*="fixed"]` מ-`index.css:683` ו-`[role="status"]` מ-`:704` (חוק `[class*="toast"]` נשאר — ⛔ פוגע כרגע בדבר). ⛔ נגיעה ב-markup של המיכל (עוגן `M7` ב-`image-store-probe.mjs:55` · `capability-guard-test` #20 · `getByRole("status")` ב-cents/playbook/b435). ⛔ להשאיר את הסלקטור · ⛔ להעביר ל-`B-` נפרד (הכרעת ניב 21.10).
   - **ניגודיות ה-`Toast` באותו PR** (`ToastProvider.jsx`, מפת `styles`): בהיר = טקסט כהה על רקע ירוק עדין — `text-emerald-800 dark:text-emerald-200` (וכך `rose-800`/`cyan-800` ל-error/info), הרקע `bg-*-500/10` נשאר; אייקון `text-*-700 dark:text-*-400`. **כהה = byte-זהה בצבע המחושב** (`dark:` מחזיר בדיוק את הערך הקודם). ⛔ אינטרפולציה — מחרוזות ליטרליות (§13). ⚠️ `capability-guard-test` regexes על קריאות `toast.*` (`:204`·`:337-353`·`:414`) ⛔ נוגעים במפה — יאומת ב-`test:capability`.
5. **עמודת פעולות דביקה:** `th`+`td` אחרונים ⇒ `sticky end-0 z-[1]` + רקע אטום זהה לשורה (כולל נבחרת/hover) + קו-הפרדה. `end-0` לוגי ⇒ RTL נדבק לשמאל. ⛔ `overflow:hidden`. שומר `data-testid="journal-table"` · `tbody tr` · `title` של עריכה/מחיקה (סנטינל).

## שלב C — red-before + מוטנטים: `scripts/eye-firstrun-probe.mjs` (על `scripts/lib/eyeBuild.mjs`)
| זרוע | מה | חייב |
|------|----|------|
| HEAD | העץ אחרי B | הכל ירוק, 4 פרויקטים × he/en |
| BEFORE | קבצי המוצר כקובץ שלם מ-`23d8ea8` (= `main`) | טאפים >5 · ניגודיות · toast · דסקטופ · (באנר אם A מדד אדום) — אדום |
| MUT-DASH | CTA דאשבורד ⇒ `setTab('journal')` | P2 אדום |
| MUT-WELCOME | CTA מודאל ⇒ `onStart` בלבד | טאפים >5 אדום |
| MUT-CONTRAST | כרטיס ⇒ `bg-[#0A100D]` | ניגודיות אדום |
| MUT-FOLD | CTA חוזר אחרי הבולטים | «מעל הקפל» אדום ב-iphone14 |
| MUT-MODALPAD | inset הוסר מ-Close/Edit | באנר אדום |
| MUT-TOAST | הסלקטור הוחזר | toast אדום |
| MUT-TOASTTEXT | מפת `styles` של `Toast` חוזרת ל-`text-*-200` בשני המצבים | ניגודיות toast בבהיר אדום |
| MUT-TRADESLOADED | `firstTrade = realTrades.length === 0` (התנאי `tradesLoaded` הוסר) | «משתמש ותיק» אדום (הנוסח הופיע בזמן העיכוב) |
| MUT-STICKY | `sticky` הוסר | דסקטופ אדום |
| (MUT-EMPTYPAD) | אם B.3 דחס | באנר אדום |
מוטנט ששורד / BEFORE ירוק ⇒ `exit 1`. עוגנים exactly-once (`makeOnce`). `package.json` ⇒ `probe:eye:firstrun`.

## שלב D — CI · רישום · סגירה
- `eye-playbook.yml`: job חדש `probe-firstrun` (WebKit+Chromium, `EYE_PROJECTS=iphone14,iphone14tall,pixel7,desktop1440`) · שני בלוקי `paths` += `scripts/eye-firstrun-probe.mjs` · `eye-evidence/probe-firstrun/` ל-excludes של ה-leak scan וה-artifact · ⛔ ב-`prod.needs` (`workflow-gate-test` G2/G3). prod ב-push כבר מריץ כל `tests-eye/` ⇒ `firstrun.spec` בפרודקשן אחרי deploy.
- **פרודקשן (QA בלבד, אפס כתיבות):** auth אמיתי; `/rest/v1/user_settings` + `/rest/v1/trades` נענים מ-store מקומי (`rowGone`, יומן ריק — אותו קוד של `hermetic.js`, מחולץ לפונקציה משותפת); כל כתיבה אחרת ⇒ `blockAllRestWrites` + `assertInterceptedAll`. ⚠️ גבול: «שמורה» בפרודקשן = הבאנדל הפרוס קיבל הצלחה; כתיבת DB אמיתית מכוסה ב-playbook/`C-073`, ⛔ כאן.
- `npm run verify` (פלט מלא) — ⛔ חוליה חדשה (`33` ⛔ זז) · `test:registry` · `probe:eye:overlay`/`width`/`playbook` נשארים ירוקים.
- ⚠️ **שני שערי מרשם יירו בקומיט הרישום הראשון:** `test:registry` §8.6 משווה ארבעת המספרים בכותרת שכבת השורשים של `BACKLOG` למדוד ⇒ מעודכנים **באותו קומיט** שמוסיף `B-443`+; ו-`STATE` ב-`15,949/16,000` בתים ⇒ גיזום ל-`BACKLOG`/`DONE` **לפני** עריכת `STATE` הראשונה (שלב A), ⛔ ב-D.
- **רישום (§10/§14):** `B-443`…`B-448` (ממצא לכל אחד) ⇒ `DONE` (`D-130`…) בקומיט הבא עם run id · `B-449` ‹R-3› `OnboardingScreen` אותה תבנית ניגודיות (גל 2 — ⛔ נגיעה) · `B-450` פס «בטל ייבוא» (`:8858`, `z-[90]`, ⛔ inset) · `C-075` (עין: מודאל+דאשבורד+יומן דסקטופ) · `DECISIONS`: «CTA ראשי במצב ריק פותח את הטופס; תקציב ≤5 טאפים נאכף ב-`firstrun.spec`» · `TRUTH.md` · `METRICS` `M-031` (טאפים, מכנה = 8 תאים: 4 פרויקטים × 2 שפות) + `M-032` משפך הרשמה→עסקה (SQL read-only לניב, יעד deploy+14) · `STATE` (⚠️ `15,949/16,000` בתים — גיזום ל-BACKLOG) · `NEXT`.
- **Close:** PR ⇒ CI ירוק ⇒ merge commit ⇒ push-run אחרי deploy: `firstrun.spec` ירוק בפרודקשן (4 פרויקטים × he/en) ⇒ רישום ⇒ push עם `..HEAD -> main`.

## Verification
1. `probe:eye:firstrun` מקומי: BEFORE + 9–10 מוטנטים אדומים, HEAD ירוק.
2. `npm run verify` · `test:registry` · probes קיימים.
3. CI: `probe-firstrun` ✅ · `prod` אחרי deploy ✅ (`firstrun` 8 תאים) · leak scan `0`.
4. דוח: hash · טבלת טאפים לפני/אחרי (מכשיר × שפה) · צילום מודאל+דאשבורד לפני/אחרי.

## סדר עבודה (§9)
אישור ⇒ `docs/plans/PLAN-2026-10-21-firstrun-activation.md` בקומיט נפרד `docs(plan): … — awaiting approval` ⇒ push ⇒ עצירה ⇒ Claude קורא מ-origin ⇒ branch מ-main ⇒ A ⇒ (עצירה?) ⇒ B ⇒ C ⇒ D.

## הכרעה (ניב 20.10)
- **אחרי A:** «⛔ העדפה» ⇒ ברירת Code: **המשך ל-B–D אם כל ששת הממצאים שוחזרו ⛔ פער שמשנה את תכנון התיקון.** כל פער כזה (מספר טאפים שמשנה פתרון · ממצא שלא שוחזר · דחיסה ⛔ מספיקה ⇒ נגיעה בבאנר ההסכמה) ⇒ **עצירה + דוח**. הדוח נדחף לפני שורת מוצר ראשונה בכל מקרה (§8.1).
- **משתמש עם עסקאות:** «בואו נתחיל» נשאר (סגירה בלבד); «תעד את העסקה הראשונה שלך» רק ביומן ריק **שנטען** (`tradesLoaded && realTrades.length === 0`).
- **21.10 (תיקוני ניב לתוכנית):** ① ניגודיות ה-`Toast` מתוקנת באותו PR, שער ב-`firstrun.spec` + `MUT-TOASTTEXT` · ② `firstTrade` מותנה ב-`tradesLoaded`, אסרציה עם עיכוב רשת + `MUT-TRADESLOADED`.
