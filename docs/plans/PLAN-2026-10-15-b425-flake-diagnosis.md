# PLAN 2026-10-15 — B-425 · אבחון: עריכה שלא מגיעה לשורה ב-WebKit/iphone14 (H2 · C4)

> יעד בריפו: `docs/plans/PLAN-2026-10-15-b425-flake-diagnosis.md`. **אושר 15.10 עם 3 תיקונים** (סיווג flush-on-unload = (ב) · isolated+insitu במקביל משלב 1 · שני PRs, dispatch בלבד). ⛔ תיקון מוצר. ⛔ `src/`.

## Context
שני אדומים בודדים באותה צורה (iphone14 · עריכה שלא נחתה · ⛔ משוחזרים מקומית 30/30): `probe-sync` H2 (`B-425`, run `38424337157`) ו-ביקורת `C4` בזרוע `BEFORE-408` (`INCIDENTS#33`, run `38639082447`/1). הראיה הקיימת **אינה מבדילה** בין «המחווה לא נקלטה» (בדיקה) ל«נקבע ונדרס/בוטל» (מוצר): H2 שומר `local:{}·db:{}·journal:null` רק **אחרי** release+reload, ו-C4 כותב ראיה **אחרי** ה-`expect.poll` ⇒ C4 שנכשל ⛔ משאיר ראיה כלל. המטרה: שיעור כשל עם מכנה ורווח-סמך, ולכל אדום שנלכד — סיווג (א)/(ב)/(ג) מה-trace.

**Safety gate ✅** `git pull` ⇒ `Already up to date` · `working tree clean` · HEAD `46c4077`.
**רמה: T3 · 0/0/1/1/1** — אבטחה **כן** (workflow חדש + trace בארטיפקט ציבורי = מחלקת `E11`) · רוחב **כן** · ודאות **כן** («התנאי הוא CI» ⛔ נמדד). §8 פילטר: 5×לא ⇒ אין טבלה. הכל **הרמטי**: Supabase סינתטי (`tests-eye/hermetic.js`), ⛔ סוד · ⛔ DB · ⛔ חשבון QA כלל.

## §0 — נמדד כבר (read-only, לפני הפרומפט נקבע ⇒ מפריך חלקית את ההנחה)
כריית לוגי `probe-sync` מכל ריצות `eye-playbook` מ-05.10, **46 ג׳ובים ייחודיים** (dedupe לפי job id — `attempts/N/jobs` מדווח שוב ג׳וב שלא הורץ מחדש):

| סצנה · מכשיר | אוכלוסייה (זרועות שבהן הסצנה אמורה להיות ירוקה) | אדום |
|---|---|---|
| H2 · iphone14 | HEAD + MUT-RESURRECT | **2/92** — `38424337157` (HEAD, `39ae7cc`) · **`38434987667` (MUT-RESURRECT, `22d2e98`) — ⛔ נראה עד היום** |
| H2 · pixel7 | אותן זרועות | 0/92 |
| C4 · iphone14 | HEAD + BEFORE-408 + M3×7 + M5 | 1/30 (`BEFORE-408`) |
| C4 · pixel7 | אותן | 0/30 |

⚠️ **ממצא-לוואי:** H2 אדום ב-MUT-RESURRECT עבר בשקט — ה-probe בודק בזרוע מוטנטית רק את הסצנות **המצופות-אדום** ואת C1/C2, ⇒ אדום בסצנה שלישית ⛔ נבדק. נרשם כ-`B-431` (§11 — ⛔ מתוקן בגל הזה).
⚠️ **כוח סטטיסטי:** ב-p≈2%, `P(0/30)≈55%`, `P(0/60)≈30%`, `P(0/100)≈13%` ⇒ סולם ההסלמה של הפרומפט צפוי להידרש; מתוכנן מראש (§3).

## §1 — המכשיר (קבצים)
1. **`scripts/lib/syncArms.mjs`** (חדש) — חילוץ `ARMS`/`ARM_GREP`/העוגנים מ-`scripts/eye-sync-probe.mjs` ל-`makeArms({ root, die })`, ש-`eye-sync-probe` מייבא. ⛔ שינוי התנהגות — הג׳וב `probe-sync` ב-CI של ה-PR (כל 14 הזרועות) הוא ההוכחה. מונע עותק שני של `BEFORE-408`/`MUT-OVERWRITE` (`R-6`).
2. **`scripts/lib/eyeBuild.mjs` · `runSpec`** — פרמטרים אופציונליים `config` (ברירת מחדל `playwright.eye.config.js`) ו-`extraArgs` (`[]`). ברירות-המחדל ⇒ byte-identical לכל הקוראים הקיימים. נשאר `spawn` אסינכרוני (`INCIDENTS#33`).
3. **`playwright.flake.config.js`** (חדש) — `...eyeConfig` ודורס **רק** `use.trace/video/screenshot = "retain-on-failure"`. `timeout`/`expect.timeout`/`actionTimeout`/`navigationTimeout`/`retries:0`/`workers:1` — **זהים** (אחרת נמדדת אוכלוסייה אחרת). **זורק בטעינה** אלא אם `EYE_HERMETIC==="1"` ו-`TEST_URL` הוא loopback ⇒ ⛔ יכול לרוץ מול פרודקשן (`E11`). `playwright.eye.config.js` ⛔ נוגע (ג׳וב `prod` משתמש בו).
4. **`tests-eye/hydration.spec.js`** — **צופים בלבד**, מאחורי `EYE_FLAKE_DIAG=1`; בלעדיו ההתנהגות זהה. ⛔ שינוי ב-`expect`/timeout/wait כלשהו.
   - `open()`: `page.on("request"/"response"/"requestfailed")` מסונן ל-`user_settings` — `t` (ms מתחילת הטסט) · method · status · מתוך ה-`postData`: `priceAlerts` · `capital` · `riskPct` בלבד; אירועי השער `armed/held/released` עם `t`; `ctx.on("console")` + `page.on("pageerror")` מלאים.
   - **snapshot מיד אחרי המחווה, לפני release** (הנקודה היחידה שמבדילה א׳ מ-ב׳): H2 אחרי `OK` — `swingEdgePriceAlerts` · `swingEdgeSettingsDelta` · האם שדה ההתראה עדיין פתוח · מספר upserts עד כה. C4 אחרי `capitalBtn.click()` — `.value` של השדה · `swingEdgeCapital` · upserts עד כה. + snapshot ברגע ה-assert.
   - קבצי ראיה ממוספרים לפי `info.repeatEachIndex` (אחרת 30 חזרות דורסות קובץ אחד); ראיית C4 עוברת ל-`finally` ⇒ נכתבת גם בכשל.
   - ⚠️ יומן הדלתא של C4 הוא `null` **מתוך התכנון** (סקלרים ⛔ ביומן — אופציה B, `D-124`) — ידווח כך, ⛔ כממצא.
5. **`scripts/probe-flake.mjs`** + `npm run probe:flake` (⛔ ב-`verify` ⇒ מניית §7 ⛔ זזה; עובר `test:syntax`). מקבל `--tree HEAD|BEFORE-408 · --scene H2|C4 · --project · --repeat N · --mode isolated|insitu · --self-test`. בונה עם `buildTree` (Supabase סינתטי — הבדיקה הקיימת שהבאנדל ⛔ מכיל host אמיתי), מגיש, מריץ `--grep "^<scene> "` + `--repeat-each N` (**⛔ retry** — כל חזרה רשומה עצמאית, `retries:0` נשמר). **צובר בעצמו** לפי `repeatEachIndex` מה-JSON (`readResults` שומר רק את האחרון ⇒ 30 היו מתמוטטות ל-1). מדפיס `k/N`, Wilson + Clopper-Pearson 95%, ל-stdout ול-`$GITHUB_STEP_SUMMARY`, + `eye-evidence/probe-flake/<tree>-<scene>-<project>.json`.
   - **exit 1 = המכשיר שבור**, ⛔ «נמצא אדום»: פחות מ-N תוצאות · סטטוס `skipped`/`interrupted` · build/serve נכשל · כשל ללא trace+video+diag · `secrets.` מופיע ב-workflow · משתני `SENTINEL_*` בסביבה. אדום-של-סצנה = **נתון** ⇒ `::warning::` + summary, exit 0.
   - **`--self-test` (red-before של המכשיר):** H2 מול `MUT-OVERWRITE` (אדום דטרמיניסטי) × 2 ⇒ חייב `2/2` אדום **וגם** לכל אחד `trace.zip` + `video.webm` + diag עם snapshot אחרי המחווה; ו-H2 מול HEAD × 2 ⇒ `0/2`. אחרת exit 1. ⚠️ אם trace/video ⛔ נרשמים על `browser.newContext()` ידני — מתגלה כאן, ואז `recordVideo`/`tracing.start` מתווספים ל-`open()` תחת `EYE_FLAKE_DIAG`.
6. **`.github/workflows/probe-flake.yml`** — **`workflow_dispatch` בלבד** (תיקון ניב ③ — ⛔ `pull_request`, ⛔ `push`) עם `repeat` (30) · `mode` (`isolated`/`insitu`/`both`) · `trees` · `scenes` · `projects` · `shards` · `debounce` (bool). ג׳וב `self-test` ⇒ `needs` למטריצה (isolated: 8 תאים · insitu: סטים × projects × shards · debounce: 2 דפדפנים), `fail-fast:false`, אותו container `mcr.microsoft.com/playwright:v1.61.1-noble`, `permissions: contents: read`, ⛔ `secrets.` כלל, ארטיפקט `eye-flake-*` 14 יום. pixel7 = זרוע השוואה. ג׳וב `summary` אחרון מאחד את כל התאים לטבלה אחת.

## §2 — הרצה מקומית לפני CI
`probe:flake --self-test` (iphone14 · WebKit מותקן מקומית) + `--repeat 3` ל-H2/C4 על HEAD (isolated + insitu) + ריצה קצרה של סצנת ה-debounce — הוכחה שהמכשיר רואה אדום ולוכד אותו, ⛔ ממצא. `npm run verify` מלא לפני כל push.

## §3 — סולם המדידה (dispatch מ-`main`, אחרי מיזוג PR-1)
- **(תיקון ניב 15.10 ②) שלב 1 — שני המצבים במקביל, 30 × תא:**
  - **isolated:** `--grep "^<scene> "` + `--repeat-each 30` — 8 תאים (`tree{HEAD,BEFORE-408} × scene{H2,C4} × project{iphone14,pixel7}`).
  - **insitu:** הסצנה **עם שכנותיה בסדר המקורי**, 30 חזרות **של הסט כולו**, ורק הסצנה הנבדקת נספרת במונה (השכנות רצות, ⛔ נספרות). הסט = ה-grep של הזרועה שבה הסצנה רצה היסטורית: HEAD ⇒ הספק המלא (סט אחד שמוֹנה גם H2 וגם C4) · BEFORE-408/C4 ⇒ `(H6|C[3-5])` · BEFORE-408/H2 ⇒ H2 ⛔ רץ שם היסטורית ⇒ הספק המלא, מוצהר. כל 3 האדומים ההיסטוריים נצפו in-situ, ו-isolated כבר נמדד `0/60` פעמיים (מקומית).
  - ⚠️ שער-מטא: `--repeat-each` חייב לשמור את סדר הקובץ בכל חזרה (נמדד מ-`startTime` ב-JSON); אחרת ⇒ 30 הרצות אסינכרוניות טוריות של הסט (`runSpec`), ⛔ `spawnSync`. insitu מפוצל ל-shards מקבילים (ג׳וב/runner עצמאי לכל shard) כדי להישאר בתוך תקרת הג׳וב.
- **שלב 2:** הסלמה ל-100 **רק** על מצב (isolated/insitu) שעדיין `0/N` בסצנה.
- **סצנת debounce/reload (תיקון ניב ①, נמדדת בכל מקרה, גם אם הסיווג (א)):** spec הרמטי ייעודי `tests-flake/debounce-window.spec.js` שרץ **רק** דרך `probe-flake` (`playwright.flake.config.js` `testDir`; ⛔ ב-`tests-eye/`, ⛔ נאסף ע״י ה-config של ה-eye או ע״י `prod` שמריץ `$SPECS` מפורש) — ⛔ שינוי ב-`hydration.spec.js`.
  - **D1 אורך החלון:** עריכת הון (סקלר) ⇒ `t` מהלחיצה ועד ה-upsert הראשון שנושא את הערך, n=30 לכל דפדפן (מול `DEBOUNCE_MS = 1000`, `src/lib/userSettings.js:15`).
  - **D2 reload בתוך החלון:** עריכה ⇒ `page.reload()` אחרי δ ∈ {0, 250, 500, 750, 900} ms ⇒ האם ה-upsert יצא · נחת ב-store · נשאר אחרי ה-reload (מסך + LS). δ הוא **המשתנה הבלתי-תלוי** (השהיה מכוונת, ⛔ המתנה-לתנאי). + אותו דבר עם `page.close({ runBeforeUnload: true })` (סגירת טאב) וגם להתראת מחיר (נתמכת-יומן) כביקורת. n=10 לכל δ × דפדפן.
- דיווח: לכל עץ × סצנה × דפדפן × mode — `k/N` + Wilson + C-P, + הבסיס ההיסטורי מ-§0; D1 p50/p95/max; D2 `נאבד/N` לכל δ.

## §4 — סיווג (לכל אדום שנלכד, ראיה מצוטטת מה-trace עם `t`)
- local **ריק** מיד אחרי המחווה ⇒ המחווה ⛔ נקלטה ⇒ **(א)** (ב-trace: המטרה של ה-tap/type, ה-DOM בזמן הלחיצה).
- local מלא, ⛔ אף upsert עם הערך ⇒ **(ב)** — debounce בוטל/דולג.
- 🔴 **(תיקון ניב 15.10 ①)** הכתיבה רכבה על `flush` של `beforeunload/pagehide` (`SwingEdge_App.jsx:2011`, fetch בלי `keepalive`) ונקטעה ב-reload ⇒ **(ב) באג מוצר**, ⛔ (א): משתמש אמיתי שסוגר טאב או מנווט בתוך חלון ה-debounce מאבד את העריכה. ⇒ `B-` חדש עם הראיה מה-trace; תוכנית התיקון כוללת `keepalive`/`sendBeacon` + red-before + mutant.
- upsert עם הערך ואחריו upsert/הידרציה עם הישן ⇒ **(ב)** מרוץ.
- upsert עם הערך שמגיע אחרי ה-reload/ה-poll ⇒ **(א)** תזמון.
- timeout של goto/action/רשת ⇒ **(ג)**.

## §5 — תוצרים
- **`docs/audits/B425-FLAKE-DIAGNOSIS-2026-10-15.md`** — §0 · שיעורים · סיווג + ציטוטי trace · run IDs.
- **`docs/plans/PLAN-2026-10-1x-b425-<slug>.md`** — `awaiting approval`, ⛔ מבוצע. (ב) ⇒ red-before + mutant מתוכננים. (א) ⇒ תיקון harness בלבד: תנאי במקום `waitForTimeout`, ⛔ retry, ⛔ הגדלת timeout, ⛔ `addLocatorHandler`. (ג) ⇒ לפי הראיה.
- רישום: `BACKLOG` `B-425` (נשאר פתוח, מצביע לתוכנית) + `B-431` (עיוורון MUT-RESURRECT) + `B-` חדש אם flush-on-unload נמדד כאובד · `INCIDENTS#33` המשך (הבסיס ההיסטורי) · `DECISIONS` (trace מותר **רק** ב-config הרמטי שזורק מחוץ ל-loopback — חריג מוצהר ל-`E11`) · `STATE` · `NEXT` (שורת «דרך יישום» של `B-425`). ⛔ `DONE` (B-425 ⛔ נסגר) · ⛔ `CHECKS` (אין מסך).

## §6 — סגירה (תיקון ניב ③ — שני PRs)
- **PR-1 `diag/b425-instrument` — המכשיר בלבד:** `syncArms.mjs` · `runSpec` · `playwright.flake.config.js` · observers ב-`hydration.spec.js` · `tests-flake/debounce-window.spec.js` · `probe-flake.mjs` · `probe-flake.yml` (dispatch בלבד). **תנאי סגירה:** `self-test` ירוק (מקומית, פלט מודבק — dispatch אפשרי רק מ-`main`; ואחרי המיזוג ג׳וב `self-test` הוא השער של כל dispatch) **ו-`probe-sync` ירוק בכל 14 הזרועות** ב-CI של ה-PR (`eye-playbook` רץ על ה-PR כי `tests-eye/**` + `eyeBuild.mjs` זזו). CI ירוק כולו ⇒ `gh pr merge --merge`.
- **הרצה:** `gh workflow run probe-flake.yml --ref main -f …` לפי הסולם (§3). אני בודק את הריצות בעצמי (`gh run watch`/`gh run view` ברקע), ⛔ ממתין להתראות.
- **PR-2 `diag/b425-report`:** אודיט + תוכנית תיקון (`awaiting approval`) + רישום (`BACKLOG` `B-425`/`B-431`/`B-` חדש אם נפתח · `INCIDENTS#33` המשך · `DECISIONS` · `STATE` · `NEXT`). CI ירוק ⇒ `gh pr merge --merge`.
- כל push: `npm run verify && npm run test:registry && git push …` — `&&` בלבד. ⛔ squash · ⛔ force. `ccd_pr` bind אחרי פתיחת כל PR.
- קודם לכל: הקובץ הזה ⇒ `docs/plans/PLAN-2026-10-15-b425-flake-diagnosis.md`, קומיט נפרד `docs(plan): B-425 flake diagnosis — approved with 3 fixes (15.10)` ישירות ל-`main` (כמו `d62b67b`).

## Verification (T3 ללא מסך ⇒ אומת-מקור)
- `self-test` ירוק ב-CI = המכשיר רואה אדום ולוכד trace+video+diag.
- המונים נגזרים **פעמיים**: ע״י `probe-flake.mjs` ובאופן עצמאי ב-`jq` על ה-JSON מהארטיפקט (הורדת ארטיפקטים `eye-flake-*` מה-run שלנו; הרמטי, ⛔ סוד) — חייבים להתאים.
- `probe-sync` בכל 14 הזרועות ירוק/אדום כמצופה אחרי חילוץ `syncArms.mjs`.
- קריאת האודיט והתוכנית מ-`origin/main` אחרי המיזוג; `test:registry` ירוק.

## ⛔ אסור (מהפרומפט, נאכף בתכנון)
`src/` · retries · `addLocatorHandler` · הגדלת timeouts · `spawnSync` בבדיקות (`runSpec` אסינכרוני; `buildTree` הסינכרוני רץ **לפני** שהשרת קיים) · DB · סודות.
