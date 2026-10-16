# PLAN 2026-10-16 — חלק B: B-432 + B-435 · local-first (pending לסקלרים + יומן הדלתא) · ⏸️ awaiting approval

> יעד בריפו: `docs/plans/PLAN-2026-10-16-b432-b435-local-first.md`. מחליף את חלק B של `PLAN-2026-10-15-b425-b432-b434-fix.md`
> לפי הכרעות ניב 16.10. סדר הגלים: **B ⇒ A ⇒ C**, כל אחד ב-PR נפרד. ⛔ שורת מוצר לפני אישור התוכנית הזו.

## Context
- **B-432:** עריכה בתוך חלון ה-debounce (`1000ms`) ⛔ שורדת reload. היא יוצאת רק דרך ה-flush של `beforeunload/pagehide` (`SwingEdge_App.jsx:2007-2018`, `fetch` בלי `keepalive`), והדף מבטל אותה: iphone14 CI `49/50`, pixel7 `27/50`.
- **B-435:** בפרודקשן, סטאפ `b4` נעלם אחרי `b5` + reload (run `38863710385`). ה-post-sweep מצא `0` ⇒ חסר גם ב-DB. בקונסול: `6×` `upsert rejected TypeError: Load failed`.
- **הכרעות ניב 16.10:**
  - local-first: pending ב-LS שגובר על DB, ו-`keepalive` כשכבה שנייה.
  - כלל היומן: רשומה נמחקת **רק אחרי 2xx** של ה-upsert שנשא אותה.
  - קונפליקט: השורה גוברת + באנר לא-חוסם + «החל את העריכה שלי».
  - סקלרים ויומן ב-PR אחד.
  - סגירה כוללת עין בפרודקשן; B-432 ו-B-435 נסגרים יחד.

**רמה T3 · 1/1/1/1/1.** הפיכות (נתיב הכתיבה לשורה) · אמון (אובדן שקט) · אבטחה (`fetch` ידני עם access token + apikey) · רוחב · ודאות (המנגנון של B-435 ⛔ ידוע).

## §0 — נמדד לפני התוכנית (⛔ הונח)
1. **שלב 0 (ניב, 16.10, קריאה בלבד):** blob p50 `2,426B` · p90 `2,505B` · p99/max `2,541B` · מעל 64KB: `0` · n=`52`.
   - ⇒ `keepalive` עם blob שלם. בלי דלתא, בלי RPC, בלי מיגרציה.
   - נרשם ב-`DECISIONS` בקומיט התוכנית.
   - ⚠️ בלובים של בדיקת `playbook` עם תמונות מגיעים ל-`~1.09MB` (נמדד ב-scratch). השומר של 60KB חל שם, וה-pending נושא את המשקל.
2. **🔴 B-435 ⛔ שוחזר: `0/13`** (scratch, read-only, iPhone 14/WebKit מקומי).
   - **התרחיש:** הרצף המדויק של `playbook.spec b` — 5 סטאפים עם תמונות `F1_1…5` (6.2MB) שנשמרו מהריצה, ו-reload **מיד** אחרי כל שמירה.
   - **ה-route:** RTT `150ms` + העלאה ב-`2MB/s`, ⛔ מחיל גוף של בקשה שהדף ביטל.
   - **מה נמדד:** כל flush בוטל ונזרק, ואחרי ה-reload היומן שיחזר אותו (`applied POST … playbook=[b1…bk]`). ⇒ **ביטול בפריקה לבדו ⛔ מאבד סטאפ.**
   - **קריאת קוד תואמת:** `settleOps` מוחק op רק כש-`notifySynced` מקבל blob שנושא את התוצאה. `notifySynced` נקרא רק אחרי upsert מאושר (`userSettings.js:188`), או בדילוג שהוכח זהה לשורה שנקראה (`:281`, `:305`). ⇒ **כלל ה-2xx של ניב כבר מתקיים בקוד, ככל שנקרא.**
   - ⇒ ה-red-before שביקשת («על main ‏b4 אבוד») **⛔ קיים במודל הזה.** B-435 דורש תנאי נוסף שהיה בפרודקשן: `6` דחיות ל-`5` צעדים, RTT/רשת אמיתיים, רענון token, לחץ מכסה ב-WebKit Linux.
3. **מפת האפליקציה** (Explore, עם עוגנים):
   - הידרציה `:1830-1972`: סקלרים `:1879-1917`, אוספים `:1925-1937`.
   - מנוי ה-settle `:1818-1825`.
   - אפקט ההתמדה `:1978-2002`.
   - 7 אתרי עריכה: `:7423` · `:7600-7614` · `:7643` · `:7669` · `:7705-7719`.
   - שפה נכתבת ל-LS באפקט `:2127`, ⛔ ב-handler.
   - token סינכרוני: `session` ב-state (`:1252`, `onAuthStateChange :1315`).
   - Toast ⛔ תומך בכפתור פעולה. תבנית באנר עם כפתורים קיימת: `:4273-4302`.

## ✅ אושר 16.10 עם 3 תיקונים (ניב)
1. **inflight — ⛔ קונפליקט שקרי אחרי keepalive:**
   - ה-pending נושא `inflight`: ה-`updated_at` שהלקוח יצר לכתיבה שיצאה, נקבע **לפני** ה-`fetch` (רגיל או keepalive).
   - `decidePending` בטעינה:
     - `row.updated_at === inflight` ⇒ הכתיבה שלנו נחתה ⇒ ניקוי pending, ⛔ באנר.
     - `=== base` ⇒ ⛔ נחתה ⇒ pending גובר ונשלח.
     - אחרת ⇒ קונפליקט אמיתי.
   - red-before: keepalive שהצליח + טעינה ⇒ **`0` באנרים**.
   - mutant (vi): בלי בדיקת `inflight` ⇒ באנר שקרי ⇒ אדום.
   - אותו עיקרון ליומן הדלתא אם רלוונטי לו (נבדק בביצוע ומוצהר).
2. **`updated_at` = version token שהלקוח יוצר.** ⛔ טריגר על הטבלה; ה-default `now()` חל רק על insert (ניב בדק ב-DB, 16.10).
   - `DECISIONS`: **⛔ טריגר שרת על `updated_at`** — הוא ישבור את `inflight`.
   - grep שמוכיח שאין כותב נוסף לטבלה שלא קובע `updated_at` (כולל `migrateFromLocalStorage`, `api/*`). יש ⇒ מתוקן **באותו PR**.
3. **B-0:**
   - וריאנט (d) — לחץ מכסה + blob תמונות `~1MB` — רץ **ראשון**, `N≥50`. ⇒ החשוד העיקרי.
   - + מדידה: מה קורה כשכתיבת היומן/pending ל-LS זורקת `QuotaExceededError` — נבלע בשקט?
   - פריט חדש ב-`BACKLOG` (⛔ בגל): תמונות ה-playbook ⇒ Supabase Storage, ב-blob רק URL.

**סדר:**
- B-0 רץ על ה-runner **במקביל** לכתיבת ה-red-before של הסקלרים. B-432 מוכח ⛔ מחכה ל-B-0.
- B-0 מוצא מנגנון ⇒ התיקון באותו PR.
- `0/N` ⇒ עצירה ודיווח לניב **על B-435 בלבד**; הסקלרים ממשיכים.

## B-0 — שחזור B-435 על ה-runner (לפני שורת מוצר ביומן) · harness בלבד
- **`tests-flake/b435-sequence.spec.js`** — הרצף של `playbook b` בהרמטי, עם route שמדמה שרת שלא קיבל בקשה שבוטלה.
- **וריאנטים:**
  - (a) המודל של ה-scratch;
  - (b) RTT עם jitter (`73–143ms`, `B-408`) + העלאה איטית;
  - (c) רענון access token בתוך הרצף (`/auth/v1/token` מוחזק);
  - (d) לחץ מכסה ב-LS (מילוי מקדים קרוב ל-5MB).
- **מדידה:** `probe-flake` dispatch, iphone14 + pixel7, ≥30 לכל וריאנט על ה-runner.
- **שער:**
  - וריאנט אדום ⇒ המנגנון מסווג מה-diag (`[lsdiag]` + `[evdiag]` + רשת), והתיקון הספציפי נכנס ל-B-1.
  - `0/N` בכולם ⇒ **עצירה ודיווח לניב**, ⛔ ניחוש מנגנון. B-435 ⛔ נסגר בלי מנגנון.

## B-1 — התיקון (`src/lib/userSettings.js` · `src/lib/settingsPending.js` חדש · `SwingEdge_App.jsx` · `src/i18n.js`)
1. **pending לסקלרים** — `swingEdgeSettingsPending = { v:1, base, values:{capital?,riskPct?,lang?,accountCurrency?,capitalCurrency?} }`.
   - נכתב **סינכרונית ב-handler** (⛔ באפקט) דרך פונקציה אחת `recordScalarEdit(field, parsedValue)`.
   - 5 אתרים: עדכון הון · עדכון סיכון · שני כפתורי המטבע · ה-`onChange` של השפה.
   - הערך נשמר **מפורסר** (סוגר את נימוק `"12000"≠12000` של `D-124`).
   - `base` = `updated_at` של השורה בקריאה/כתיבה המאושרת האחרונה.
   - `loadSettings` בוחר `"settings, updated_at"`, ו-`upsertBlob` שומר את ה-`updated_at` שנשלח כשמגיע 2xx.
2. **הידרציה** — פונקציה טהורה `decidePending(row, rowUpdatedAt, pending)`:
   - `base === rowUpdatedAt` ⇒ ה-pending גובר: מוחל מעל `s`, ואפקט ההתמדה שולח.
   - אחרת ⇒ **קונפליקט**: השורה גוברת, וה-`rejected` מוצג בבאנר. ⛔ גובר בשקט.
3. **ניקוי** — pending נמחק **רק אחרי 2xx** של upsert שה-blob שלו נושא את הערכים (לפי שדה).
   - ⏸️ **הכרעה (§ למטה):** דילוג שהוכח זהה לשורה שנקראה — האם נחשב «אושר».
4. **כלל היומן (ניב):** נשמר ומוכרז:
   - `settleOps` נקרא רק מ-`notifySynced` אחרי upsert מאושר.
   - `Load failed` / ביטול / timeout / `{error}` ⇒ ⛔ settle.
   - נבדק ב-red-before (ii) ו-mutant (iv). אם B-0 מוצא מסלול שמפר אותו, התיקון נכנס כאן.
5. **שכבה 2 — `keepalive`:**
   - ב-`visibilitychange`(hidden) + `pagehide` ⇒ `flushKeepalive(uid, token)`.
   - `fetch(\`${URL}/rest/v1/user_settings?on_conflict=user_id\`, { method:"POST", keepalive:true, headers:{ apikey, Authorization:\`Bearer ${token}\`, "Content-Type":"application/json", Prefer:"resolution=merge-duplicates,return=minimal" }, body })`.
   - **שומר:** `body > 60KB` ⇒ ⛔ שליחה + `console.warn` עם הסיבה והגודל. נשענים על pending/יומן.
   - התשובה ⛔ נצפית אחרי פריקה ⇒ ⛔ settle מכאן. הטעינה הבאה שולחת שוב, ו-2xx מנקה.
   - ⛔ `sendBeacon` (בלי כותרות). ה-token מגיע מ-`sessionRef` (ref של `session`, `:1252`).
6. **באנר קונפליקט** — לא-חוסם (`role="status"`), בתבנית `:4273-4302`.
   - מציג את הערך המקומי שנדחה מול הערך מהשורה.
   - «החל את העריכה שלי» קורא ל-`recordScalarEdit` עם `base` = השורה הנוכחית, ⇒ upsert חדש. + סגירה.
   - **i18n ב-5 שפות** (`src/i18n.js`: en · he · es · pt · ar, מפתחות חדשים). ⛔ `isRTL ? he : en` (הבאג של `B-429`).
   - ⛔ שאלה חוסמת.

## Red-before — לפני שורת מוצר, כל אחד אדום על `main`
- **(i) `test:settings`, בלוק חדש (ערך):**
  - `recordScalarEdit` כותב pending **סינכרונית** עם `base`.
  - `decidePending` מחזיר: גובר כשה-`base` תואם, קונפליקט + `rejected` כשלא.
  - ניקוי רק אחרי 2xx שנושא את הערכים: `{error}` · throw · timeout ⇒ נשאר.
  - `flushKeepalive`:
    - שולח `keepalive:true` + כותרות + גוף מדויק ל-`fetch` מוזרק;
    - גוף מעל 60KB ⇒ ⛔ קריאה + סיבה מתועדת.
- **(ii) `test:hydration` (`hydrate` עם תלות מוזרקת):**
  - pending עם `base` תואם ⇒ הסקלר המקומי מוחל;
  - `base` ישן ⇒ השורה גוברת + `conflict` נקבע.
  - יומן: upsert שנכשל ⇒ ⛔ settle (⚪ אפיון אם ירוק על main — יוצהר).
- **(iii) עין הרמטית (`probe-flake`), route שמבטל בקשות שהדף ביטל:**
  - D2/D3 לסקלרים: על main iphone14 אבוד `≈49/50`, אחרי — `0/50`.
  - δ≈0 (פריקה ב-`<15ms` מהלחיצה): אחרי — `0/N`.
  - רצף B-435 (מ-B-0): אם אדום על main — חייב `b4`+`b5` ב-DB אחרי. אם `0/N` — ⚪ סצנת רגרסיה, מוצהרת.
- **mutants** (כל אחד חייב להרוג לפחות בדיקה אחת):
  - (i) pending נכתב באפקט ⛔ ב-handler ⇒ δ≈0 חוזר.
  - (ii) בלי בדיקת `base` ⇒ בלוק הקונפליקט אדום.
  - (iii) `keepalive:false` ⇒ בלוק ה-flush אדום.
  - (iv) **היומן/pending מתנקה לפני 2xx** (settle ביציאת הבקשה) ⇒ D2 + רצף B-435 עם ביטול ⇒ אבוד.

## עוגנים שזזים (B-272: כשל חילוץ = אדום קשה, ⛔ דילוג)
- **`scripts/hydration-wiring-test.mjs`:**
  - רשימת השמות המוזרקים ל-`hydrate` (`:248-259`) מקבלת את התלויות החדשות.
  - שבעת עוגני `disabled={!capitalSettled}` (`:826-836`) — ה-handlers משתנים, העוגנים נבדקים.
- **`scripts/lib/syncArms.mjs:34-40`:** עוגנים רב-שורתיים של כפתורי ההון/סיכון/מטבע.
- **`scripts/probe-flake.mjs`:** `SELF_C4` (`:161`) · `SELF_FLUSH` (`:164`).
- כל עוגן שזז מעודכן **באותו קומיט**, ונבדק ש-`probe-sync` ו-self-test עדיין רואים אדום על המוטנטים.

## §8 — השלכות
| ציר | |
|---|---|
| משתמשים | כל עורך הגדרות. קונפליקט ⇒ באנר לא-חוסם; ⛔ אובדן שקט. |
| נתונים | ⛔ מיגרציה. `updated_at` כבר קיים. מפתח LS חדש `swingEdgeSettingsPending` (סקלרים בלבד, `<1KB`). הפיך: revert. |
| עלות | עד upsert keepalive אחד לכל פריקה עם שינוי לא-מאושר. Supabase זניח. |
| תקרות | keepalive `64KB` ⇒ שומר `60KB`; p99 `2.5KB` (n=52). |
| אבטחה | `fetch` ידני עם access token של המשתמש עצמו + anon key (כבר בבאנדל). RLS ⛔ משתנה. ⛔ token ב-LS חדש. ⛔ console של token. |
| תחזוקה | שני מנגנונים (pending + יומן) תחת כלל אחד: ⛔ מחיקה בלי 2xx. מוצהר ב-`DECISIONS`. |
| הפיכות | revert של ה-PR. ה-pending נשאר ב-LS ⛔ נקרא ⇒ ⛔ נזק. |
| כשל שקט | keepalive ⛔ נצפה ⇒ ה-pending הוא הרשת; שומר 60KB מתועד. כשל כתיבת pending ⇒ toast `settingsSyncPending` הקיים. |

**פסק דין: ⚠️ בצע עם הגנה** — B-0 קודם; red-before; עין בפרודקשן.

## סגירה (ניב)
- PR נפרד. CI ירוק כולו, כולל `probe-sync` בכל הזרועות. `gh pr merge --merge`.
- **עין בפרודקשן** (חשבון QA, pixel7 + iphone14, אחרי deploy):
  - עריכת הון + reload **בתוך שנייה** ⇒ הערך שורד במסך ובשורה (`qaRest.settingsSnapshot`, קריאה בלבד ב-CI). `restoreCapital` בסוף.
  - + סטאפ + reload מיידי (צורת B-435).
- פריט `CHECKS` חדש לפני הסגירה. `B-432` + `B-435` ⇒ `DONE` יחד (T3, אומת-עין).
- ⚠️ אם B-0 הסתיים ב-`0/N`, B-435 ⛔ נסגר על הסצנה הזו לבדה — הכרעת ניב.

## ✅ הוכרע (ניב 16.10): דילוג שהוכח זהה = «אושר»
**כן, בתנאי** — גם ליומן וגם ל-pending של הסקלרים.
- דילוג (`alreadySent`) מנקה רק כש-`lastSent` נקבע מקריאה או כתיבה מאושרת **בסשן הזה** (⛔ מטמון, ⛔ mirror).
- mutant (v): `lastSent` שנזרע מה-mirror ⇒ ניקוי כוזב ⇒ אדום.
