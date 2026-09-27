# PLAN 2026-09-27 — `B-375`: ראיה נפתחת לכל ממצא סנטינל אדום

**⏸️ awaiting approval.** ⛔ אפס קוד · ⛔ אפס `npm` · ⛔ נגיעה ב-`sentinel.yml`. `B-376` (תיקון המרוץ) — גל נפרד, **אחרי** שיש ראיה.

**שער בטיחות:** `git pull --ff-only origin main` ⇒ `Already up to date.` · `git status --porcelain` ⇒ ריק · `HEAD = 10a8c2b`.
⚠️ `core.hooksPath` **לא היה מוגדר** ב-clone הזה (`git config core.hooksPath` ⇒ exit 1) ⇒ הותקן לפי §6 לפני כל קומיט.

## 0. סיווג §15

**רמה: `T3` · תשובות: כן/לא/כן/כן/כן.**

| # | שאלה | תשובה | למה |
|---|---|---|---|
| Q1 | הפיכות | **כן** | artifact בריפו ציבורי = **פרסום**. צילום שהורד ⛔ נמחק ממחשב של מי שהוריד, גם אם ה-artifact פג ⇒ **טריגר-יחיד** |
| Q2 | אמון | לא | ⛔ מספר פונה-משתמש. הראיה מוצגת לניב בלבד |
| Q3 | אבטחה | **כן** | session של חשבון ה-QA (JWT · refresh token · אימייל) הוא בדיוק מה ש-trace לוכד ⇒ **טריגר-יחיד** |
| Q4 | רוחב | כן | 2 specs + מודול חדש + workflow |
| Q5 | ודאות | כן | הורדה **אנונימית** ⛔ נמדדה (ראה §2.2) |

**אימות-אחרי:** ⛔ «אומת-מקור» לבד — ניב **פותח** את ה-artifact של ריצת התרגיל ורואה צילום + ה-toast. נרשם כ-`C-` חדש לפני סגירה.

---

## 1. זרימה נמדדת: `add()` → JSON → `watch`

| שלב | איפה | נמדד |
|---|---|---|
| `add()` | `tests-sentinel/sentinel-auth.spec.js:140` · `sentinel-public.spec.js:51` | `findings.push({...})` **בלבד**. סינכרוני, ⛔ מקבל `page`. **33 אתרים** (27 auth + 6 public) — נאכף ב-`test:diagnosis` `M4` |
| כתיבה | `afterAll` (`auth:946-951` · `public:191-192`) | `fs.writeFileSync(OUTPUT, …)` |
| העלאה | `sentinel.yml:121-129` | `upload-artifact@v7` · `browser-findings` · **ללא `retention-days`** |
| צריכה | `sentinel.yml:145-149` → `:455-476` → `:500+` | `download-artifact` → merge ל-`faults.json` → embed דיסקורד (5 שדות טקסט) |

### 1.1 איפה `page` זמין ברגע ה-`add()` — 33/33 אתרים נבדקו

| אוכלוסייה | `page` חי ברגע ה-add? | אתרים |
|---|---|---|
| auth — בגוף המבחן / helpers שמקבלים `page` (`sweepBoundaries` · `record(diag)` בסוף) | ✅ | 25/27 |
| auth — `restCleanup` ב-`afterAll` (`:602` · `:634`, `cleanup-failed`) | ⛔ — ה-fixture `page` כבר נסגר | 2/27 |
| public — בתוך `test(...)` + `record(diag, pageKey)` | ✅ | 6/6 |

⇒ **31/33 אתרים יכולים לצלם.** `cleanup-failed` הוא כשל REST ⛔ UI — ראיה שם היא סטטוס HTTP, שכבר ב-`got`. נרשם כגבול, ⛔ חוב.

### 1.2 🔴 הממצא שמשנה את התכנון: צילום ברגע ה-`add()` **⛔ רואה את ה-toast של `B-376`**

- `ToastProvider.jsx:20-23` — `duration = 3000` ⇒ ה-toast נמחק אחרי **3 שניות**.
- `sentinel-auth.spec.js:875` — `expect(sntnlRows(page)).toHaveCount(1, { timeout: 20_000 })` ⇒ ה-`add()` של `create-failed` יורה **~20 שניות אחרי** הלחיצה.
- ⇒ צילום ב-`add()` מגיע **~17 שניות אחרי שה-toast נעלם.** העתקת `screenshot: 'only-on-failure'` הייתה נכשלת **פעמיים**: ⓐ המבחן ⛔ נכשל (`B-374`), ⓑ וגם אם היה נכשל — הצילום בסוף המבחן.
- ⇒ **הלכידה חייבת להיות *מתמשכת* (buffer), ורק *השמירה* מותנית באדום.** זו הנקודה המרכזית של הגל.

---

## 2. 🔴 פרטיות — תשובה מפורשת

### 2.1 מה נמדד

| שאלה | תשובה | איך נמדד |
|---|---|---|
| הריפו ציבורי? | **כן** — `"private": false, "visibility": "public"` | GitHub API `search_repositories repo:niveven183/swing-edge` |
| retention נוכחי של artifacts | **90 יום** | artifact `10927014877` (ריצה `#1082`): `created 2026-09-27T08:37:19Z` · `expires 2026-12-26T08:35:06Z` |
| גודל ה-artifact הנוכחי | **2,519 בתים** | אותו artifact |
| האימייל של חשבון ה-QA כבר ציבורי? | **כן** — `sentinel.qa@swing-edge.com` כתוב ב-`docs/DECISIONS.md` (שורת 21.09) | `grep` |
| האימייל מרונדר ב-UI המחובר? | **כן** — `SwingEdge_App.jsx:4295-4296` (`{authUser.email}` בתפריט המשתמש) | קריאת בייטים |

### 2.2 מי יכול להוריד — ⚠️ **⛔ נמדד מכאן, והמגבלה מוצהרת**

ניסיתי הורדה "אנונימית" של ה-zip: `302` → blob. **אבל** `X-Ratelimit-Limit: 15000` בתגובה ⇒ ה-proxy של הסביבה **מזריק טוקן** (אנונימי = `60`). ⇒ **הבקשה הייתה מאומתת; הורדה אנונימית ⛔ נמדדה.**
**הנחת העבודה — המחמירה:** artifact בריפו ציבורי **ניתן להורדה ע"י כל חשבון GitHub** (זה התיעוד של GitHub; אם גם אנונימית — הנחת העבודה מכסה). **⇒ כל מה שנכנס ל-artifact מתוכנן כאילו הוא ציבורי.** ⛔ «גישה מוגבלת» **אינה** אפשרות בריפו ציבורי — אין ACL ל-artifacts.
📏 **מדידה פתוחה (ניב, 30 שניות):** חלון גלישה בסתר ⇒ `https://github.com/niveven183/Swing-edge/actions/runs/36306653934` ⇒ האם ה-artifact לחיץ להורדה. הממצא ⛔ משנה את ההכרעה, רק מעדכן את §2.1.

### 2.3 מה היה דולף מ-trace — ולכן ⛔ trace

| שדה ב-trace של Playwright | תוכן בחשבון ה-QA | חומרה |
|---|---|---|
| request headers | `Authorization: Bearer <JWT>` (שעה) · `apikey` (anon, ציבורי ממילא) | 🟠 |
| **response body של `/auth/v1/token`** | **`refresh_token`** | 🔴 **השתלטות מתמשכת על ה-session עד revoke** — ⛔ שעה |
| DOM snapshots | ערך שדה האימייל · האימייל בתפריט | 🟡 (כבר ציבורי) |
| storage (בהקשר) | `sb-*-auth-token` ב-localStorage | 🔴 |

⛔ **Redaction של trace zip ⛔ מוכחת** — פורמט פנימי, משתנה בין גרסאות, ו-scrubber שמחמיץ שדה אחד = דליפה **שקטה** (`R-4`). ⛔ **Retention קצר ⛔ פותר** — 1 יום עדיין מספיק להשתלטות. ⚠️ **ההכרעה 21.09 (סיסמה ⛔ תוחלף אחרי חשיפה) ⛔ מצדיקה פתח נוסף** — refresh token הוא משטח **אחר** (עוקף סיסמה, עוקף MFA עתידי).

### 2.4 ⇒ **הכרעה מוצעת: ⛔ trace בכלל. `(ה)` יוצא מהגל.** ה-artifact נושא **רק** מה שנבנה מאפס ע"י הקוד שלנו, דרך מסנן רשימה-לבנה (§3), ⛔ מה ש-Playwright אוסף.

---

## 3. מה נלכד — מדורג (ערך-אבחון מול סיכון)

| # | מה | ערך | סיכון | הגנה | בגל? |
|---|---|---|---|---|---|
| **ג** | **יומן toasts + מוטציות DOM מתמשך** (ring buffer, 60 רשומות: `added`/`removed` · `t` יחסי · טקסט ≤200 תווים) | 🔴 **היחיד שרואה את ה-toast של `B-376`** | נמוך | `redact()` על כל טקסט | ✅ |
| **ג'** | console errors + pageerrors (כבר נאספים ב-`watch()`) — חלון הממצא | גבוה | נמוך | `redact()` · כבר עובר לדיסקורד היום | ✅ |
| **א** | צילום viewport ברגע ה-`add()` + צילום שני אחרי 2s | גבוה — מצב המודאל (נשאר פתוח כש-`handleSubmit` חוזר מוקדם) | 🟡 אימייל | `mask:` על `input[type=email]` · `input[type=password]` · `getByText(QA_EMAIL)` | ✅ |
| **ד** | לוג רשת: `method · origin+path · status · t` (ring 80) | גבוה — «הבקשה ל-`/rest/v1/user_settings` חזרה לפני/אחרי הלחיצה?» | נמוך | **⛔ headers · ⛔ bodies · ⛔ query** (`cleanUrl` הקיים) | ✅ |
| **ב** | `outerHTML` של `[role=dialog]` / המודאל הפתוח (≤100KB) | בינוני | 🟡 React מסנכרן `value` כ-attribute ⇒ אימייל בשדה | `redact()` + הסרת `value` של `type=password` | ✅ |
| **פירורים** | `crumb(label, data)` בנקודות ידועות — **רק** ב-create | 🔴 ל-`B-376` | נמוך | טקסט מרונדר בלבד | ✅ |
| **ה** | trace | גבוה | 🔴 refresh token | — | ⛔ (§2.4) |

### 3.1 ל-`B-376` ספציפית — מה יכריע את `effShares=0`

פירור אחד, **מיד לפני** `Log Trade` (`sentinel-auth.spec.js:873`):
1. **ההון המוצג** — `readCapitalText([data-tour="equity"] …)` (הפונקציה כבר קיימת, `:169`).
2. **שדה ה-SHARES במודאל** — `input[aria-label=t.sharesEditable]` (`SwingEdge_App.jsx:8100-8101`); הערך המוצג הוא `String(suggestedShares)` ⇒ `0` שם **הוא** `effShares=0` על המסך.
3. **האם `capitalSettled`** — נגזר: שלד ה-`animate-pulse` בתפריט (`:4290`) קיים/⛔.
4. `t` מתחילת המסע.

ואחרי הלחיצה — ה-toast נתפס ב-(ג) עם `t`. **הצירוף מכריע:** `SHARES=0` + הון ≠ `DEFAULT_CAPITAL` + toast «⛔ אי-אפשר לשמור בלי גודל פוזיציה» ⇒ הון **נמוך** (⛔ מרוץ). `SHARES=0` + שלד/הון לא-סופי ⇒ **מרוץ**. אחרת ⇒ ההשערה נופלת.
⚠️ **הפירור ⛔ מתקן את `B-376`** — ⛔ המתנה נוספת, ⛔ שינוי סדר. מודד בלבד.

### 3.2 חיווט — ⛔ נגיעה ב-33 אתרי ה-`add()`

- מודול חדש `tests-sentinel/evidence.js`: `installEvidence(page, {mask})` (מתקין `addInitScript` ל-MutationObserver + מאזיני רשת) · `captureRed(fp)` · `crumb()` · `flushEvidence()`.
- **גוף** `add()` בלבד משתנה: `if (severity === 'red') ev.captureRed(fp)`. **החתימה ⛔ זזה** ⇒ `test:diagnosis` `M2` ירוק; **האתרים ⛔ זזים** ⇒ `M4` (`27`+`6`) ירוק.
- `captureRed` **סינכרוני**: מקפיא מיד את ה-buffers (העתק ב-Node, ⛔ await) ומשרשר את הצילום לתור. `flushEvidence()` נקרא **לפני `record(diag)` בסוף המבחן** ובכל `return` מוקדם — ⚠️ זה **4** נקודות `return` מוקדם ב-auth (`:659` · `:689` · `:753` · `:767`) + סוף המבחן ⇒ עטיפה ב-`try/finally` אחת סביב גוף המבחן במקום 5 קריאות.
- ⚠️ **גבול מוצהר:** הצילום רץ בזמן שהמבחן ממשיך לשלב הבא (אחרי `add()` שאינו `return`) ⇒ הצילום עלול להיות של שלב מאוחר ב-~0.3s. **ה-buffers ⛔ נפגעים** — הם מוקפאים סינכרונית. זו הסיבה ש-(ג)+(ד) הם הראיה הראשית, ו-(א) משני.
- פלט: `sentinel-evidence/<NN>-<fp-sanitized>/` = `t0.png` · `t2.png` · `log.json` (toasts/mutations · console · network · crumbs) · `dialog.html` + `sentinel-evidence/manifest.json` (לכל אדום: `captured` / `failed: <e.message>`).
- ⛔ **כשל שקט:** כשל צילום ⛔ נבלע — נרשם ב-manifest **ו**-finding `yellow` `browser-auth|evidence-failed` / `browser|evidence-failed` ⇒ `M4` זז `27→28` · `6→7` **ביד** (`B-324` — הכרעה (ד) למטה).
- `test:diagnosis` (אירוח, ⛔ חוליה חדשה — אותה הכרעה כמו 18.09 «ב»): בלוק חדש — `redact()` על קלט סינתטי שמכיל אימייל · `eyJ…` · `sb-x-auth-token` · `refresh_token` ⇒ ⛔ אף אחד שורד ב-`log.json`/`dialog.html` שנבנה ממנו; ו**זרוע ביקורת**: המסנן הישן (אימייל בלבד) **חייב** להשאיר את ה-JWT ⇒ אדום-לפני נצפה.
- `sentinel.yml`: **צעד העלאה אחד נוסף בלבד** (⛔ לוגיקת שערים, ⛔ נגיעה ב-`watch`):
  ```yaml
  - name: Upload red-finding evidence (B-375)
    if: always()
    uses: actions/upload-artifact@v7
    with:
      name: sentinel-evidence
      path: sentinel-evidence/
      if-no-files-found: ignore
      retention-days: 7
  ```

---

## 4. גודל · retention · זמן

| | ערך | בסיס |
|---|---|---|
| ריצה ירוקה | **0 בתים** נוספים — `if-no-files-found: ignore`, ⛔ תיקייה | — |
| לכל ממצא אדום | 2 PNG ‏1280×720 (~150–400KB יחד, הערכה) + `log.json` ≤50KB + `dialog.html` ≤100KB ⇒ **≤~0.6MB** | caps בקוד |
| תקרת ריצה | 10 ממצאים אדומים ראשונים ⇒ **≤~6MB**; מעבר לזה — manifest בלבד עם `skipped: cap` (⛔ שקט) | — |
| retention | **7 ימים** (מול 90 היום) — חלון אבחון, ⛔ ארכיון | — |
| זמן נוסף | ירוק: ~0 (observer + מאזינים). אדום: ~2.5s לממצא (2s המתנה + 2 צילומים) ⇒ ≤25s ב-10 | — |
| תקציב | job ‏`browser` בריצה `#1082`: **2:13** (`08:35:08→08:37:21`) מתוך `timeout-minutes: 12` ⇒ נשארים ~9:45 | GitHub API `list_workflow_jobs` |
| עלות אחסון | ריפו ציבורי ⇒ Actions storage **ללא חיוב** | — |

---

## 5. השראת אדום מבוקר — `B-375` נסגר ⛔ לחכות לתקלה

### 5.1 התרגיל: **אותו מסלול בדיוק של `B-376`, בלי ליצור עסקה**

`SENTINEL_DRILL=invalid-stop` ⇒ ב-create בלבד: `#log-stop` מקבל `101` במקום `99` (LONG עם stop מעל entry).
⇒ הכפתור **⛔ מושבת** (`disabled` רק על ticker/entry/stop ריקים, `SwingEdge_App.jsx:8344-8345`) ⇒ `handleSubmit` חוזר מוקדם — בשומר `effShares` (`:2969`) **או** ב-`validateTradeInputs` (`:2977`), תלוי מה `sizePosition` מחזיר על stop הפוך (⛔ נמדד — ייקבע ב-P0/P2) — עם toast ⇒ **⛔ נכתבת שורה** ⇒ אחרי 20s `create-failed` **האמיתי** (`:878`) יורה אדום דרך `add()` **האמיתי**.
- **למה זה התרגיל הנכון:** זו **בדיוק** צורת `B-376` (toast של 3s + `return` מוקדם + ⛔ שורה) ⇒ התרגיל מוכיח שה-buffer תופס toast שנעלם 17s לפני ה-`add()`. תרגיל שמכשיל selector היה מוכיח **צילום**, ⛔ **toast**.
- **⛔ פוגע בחשבון:** ⛔ נוצרת עסקה ⇒ `created=false` ⇒ rename/delete ⛔ רצים; `restCleanup` רץ כרגיל (ומוצא 0).
- ⚠️ **שומר:** הדגל נכבד **רק** כש-`GITHUB_EVENT_NAME === 'workflow_dispatch'` **או** ⛔ CI (הרצה מקומית). דגל על ריצה מתוזמנת ⇒ finding `red` `browser-auth|drill-on-schedule` — רועש, ⛔ מתעלם.

### 5.2 איפה רץ התרגיל — ⛔ מזהם ספירת מדדים

`watch` שומר incident state ל-cache ושולח לדיסקורד ⇒ אדום מתורגל דרך `sentinel.yml` היה ⓐ מתועד כ«תקלה חדשה» ⓑ נספר ב-`count` ⓒ מייצר «התאוששות» בריצה הבאה. **שלוש אפשרויות:**

| | מה | זיהום | סחיפה | **המלצה** |
|---|---|---|---|---|
| **א** | workflow נפרד `sentinel-evidence-drill.yml` — `workflow_dispatch` בלבד · אותו `concurrency: sentinel-auth` · job `browser` **בלבד**, ⛔ `watch` | **0** — ⛔ דיסקורד · ⛔ cache · ⛔ state | ⚠️ עותק של 8 צעדי ה-`browser` ⇒ `R-6`. מיטיגציה: assertion ב-`test:diagnosis` שמשווה את בלוק הצעדים בשני הקבצים (⛔ תבנית — השוואת בייטים אחרי נרמול) | ✅ **מומלץ** |
| ב | input `evidence_drill` ב-`sentinel.yml` + `if:` על `watch` | 0 | ⛔ | ⛔ — `if:` על `watch` **הוא** לוגיקת שער; אסור בגל הזה |
| ג | הרצה מקומית מול פרודקשן | 0 | ⛔ | ⛔ ל-auth — דורש סודות ה-QA ⇒ ניב בלבד (§12). ✅ ל-**public** (ראה 5.3) |

### 5.3 אדום-לפני / ירוק-אחרי

| שלב | היכן | צפוי | הוכחה |
|---|---|---|---|
| **P0 — public, מקומי** (Code, ⛔ סודות) | `SENTINEL_DRILL=missing-root` על `render_app` ⇒ `browser\|render_app` אדום | **עץ נוכחי:** `ls sentinel-evidence` ⇒ ⛔ קיים · **עץ חדש:** תיקייה + `manifest.json` `captured: 1/1 אדומים` | פלט מודבק |
| **P1 — auth, CI** (ניב מפעיל dispatch) | `sentinel-evidence-drill.yml` על `10a8c2b` (עץ נוכחי) | **0 ראיה** — ⛔ artifact `sentinel-evidence` | קישור לריצה |
| **P2 — auth, CI** | אותו workflow על עץ הגל | artifact `sentinel-evidence` · `log.json` נושא רשומת toast (`added` ואז `removed` ~3s אחריה — **זו** החתימה שמבדילה toast מבאנר ה-inline הקבוע `:8144-8147`) עם `t` **לפני** ה-`add()`, וטקסטה אחד משני ה-toasts של `handleSubmit` · `t0.png` מראה מודאל פתוח | קישור + ניב **פותח** (§15 `T3` — עין) |
| **P3** | ריצה מתוזמנת אחת אחרי merge | ירוקה · ⛔ artifact `sentinel-evidence` · זמן job ≈ בסיס | קישור |

⚠️ **P1 חייב לרוץ לפני הגל** — אחרת `sentinel-evidence-drill.yml` ⛔ קיים. ⇒ סדר קומיטים: ⓵ workflow התרגיל + דגל התרגיל ב-spec (⛔ evidence) ⇒ push ⇒ P1 ⇒ ⓶ evidence ⇒ push ⇒ P2. כך האדום-לפני הוא **אותו workflow, אותו דגל, אותו חשבון**, והמשתנה היחיד הוא הגל.
⚠️ P0 דורש שהסביבה תגיע ל-`swing-edge.com` — ⛔ נמדד עדיין; אם חסום, P0 יורד ו-P1/P2 נושאים הכל.

**מדד סגירה `B-375`:** P2 ירוק + ניב פתח את ה-artifact (קישור ב-`DONE`) + `C-` חדש ב-`CHECKS`.

---

## 6. הכרעות לניב

| # | שאלה | המלצה |
|---|---|---|
| **א** | ⛔ trace בכלל (§2.4)? | **כן — ⛔ trace.** refresh token ב-body ⛔ ניתן להסתרה מוכחת |
| **ב** | מקום התרגיל (§5.2) | **א — workflow נפרד** + assertion נגד סחיפה |
| **ג** | שורת «• ראיה: <קישור ריצה>» ב-embed הדיסקורד | **⛔ בגל הזה** — נוגע ב-`watch`. נרשם כ-`B-` חדש; עד אז הקישור לריצה כבר קיים בהודעת ה-GitHub |
| **ד** | finding `yellow` ל-`evidence-failed` (`M4` `27→28` · `6→7` **ביד**, `B-324`) — או manifest בלבד? | **yellow** — manifest ב-artifact ש⛔ נפתח הוא כשל שקט |
| **ה** | retention | **7 ימים** |

## 7. ⛔ מחוץ לגל

תיקון `B-376` · `B-374` (מסקנת `success` על אדום) · לוגיקת שערים ב-`sentinel.yml` · `watch` · קוד מוצר (כולל `data-testid` ל-toast — ה-observer **⛔ נשען על class**, בכוונה) · trace.

## 8. מה עלה ואינו ברפו (§10.1) — יירשם בקומיט הביצוע

1. `core.hooksPath` ⛔ מוגדר ב-clone של סשן ענן ⇒ הגנת §5 כבויה **בשקט** עד שמישהו מריץ §6 ידנית (סריקה סביבתית §11 — ⛔ תוקן מעבר להתקנה המקומית).
2. artifact `browser-findings` הקיים: retention **90 יום** בריפו ציבורי — ממצאים מושחרים, אבל 90 ⛔ הוכרע אף פעם.
3. הורדה אנונימית של artifacts — ⛔ נמדדה (§2.2).
