# תוכנית — Watchdog + ספים ב-Fleet Daily + פידבק ל-Discord

## Context

הצי מדווח היום ב-12 workflows לדיסקורד (`665c3a7`). שלושה פערים נשארו, כולם באותה
שכבת-דיווח, ולכן משימה אחת:

1. **מוות שקט** — `failure-alert.yml` יורה כשworkflow **נכשל**. שום דבר לא יורה כש-workflow
   **לא רץ בכלל** (cron מושבת, secret פג, ריפו הועבר וכו'). שקט כרגע נראה זהה לבריאות.
2. **Fleet Daily מדווח, לא מתריע** — למדדי הצמיחה (Growth Pulse) אין סף. "עסקאות
   שנוצרו: 0" עוברת בעין כי הצבע תמיד ירוק.
3. **פידבק משתמש** יושב ב-DB, מדווח רק במייל היומי — לא בדיסקורד, שבו ניב בפועל שם לב.

פתרון: workflow חדש (Watchdog) שבודק "מתי כל workflow מתוזמן רץ בהצלחה לאחרונה" מול
טבלת-גיל קבועה; שכבת ספים על Growth Pulse הקיים; והרחבת daily-digest לצבוע/להראות
פידבק ממתין. ללא state חדש, ללא סוד חדש, ללא כתיבה ל-DB.

**ממצא אגבי (לא פעולה נדרשת):** השורה "סינון ה-404 של הלוגו... טרם אומת בפרודקשן"
ב-`docs/STATE.md` כבר **נמחקה** בקומיט הנוכחי (`85c1195`) — *לפני* שהאימות בפועל בוצע.
בדקתי עכשיו את לוג הריצה (`gh run view 30253015899 --log`, ריצת Sentinel
2026-07-27T09:13:31Z): `AUTH_EXPECTED: 1` מופיע ב-step `watch` — כלומר שכבת ה-auth
אכן רצה, וההתאוששות שדווחה הייתה אמיתית (לא כמו אינצידנט #6). הטענה נכונה בדיעבד,
אבל היא נמחקה בלי הוכחה בזמן אמת — סטייה מ-CLAUDE.md §2. אין כאן קובץ למחוק (כבר לא
קיים), רק הערה בדיווח הסופי. **אין עריכת STATE.md בגין סעיף זה.**

---

## ניתוח השלכות (CLAUDE.md §8)

הפילטר תפס: משנה מה שרץ אוטומטית בפרודקשן → טבלה מלאה.

| ציר | הערכה |
|-----|-------|
| **משתמשים** | ניב בלבד (ערוץ דיסקורד פרטי). משתמשי הקצה לא נחשפים לשום שינוי — כל העריכות הן בשכבת monitoring, לא בקוד האפליקציה/`src`/`api`. |
| **נתונים** | הפיך לחלוטין. אין מיגרציה, אין כתיבה חדשה ל-DB. השאילתות החדשות (Watchdog: `gh api` בלבד, אין SQL; Growth Pulse: 2 שאילתות `SELECT count(*)` נוספות; feedback: `SELECT message ... LIMIT 1`) הן read-only טהור, אותה הרשאה קיימת (`SUPABASE_DB_URL` read-only). |
| **עלות** | Watchdog: ~10 קריאות `gh api` + פוסט דיסקורד אחד, פעם ביום, ריצה של דקה-שתיים — זניח מול מכסת Actions. אין תוספת ריצה ל-workflows קיימים, רק עוד כמה שורות bash/JS בתוך צעדים שכבר רצים. |
| **תקרות ספק** | `gh api`: authenticated rate limit 5000/שעה, 10 קריאות ביום = אפסי. Supabase: 2 שאילתות `count()` נוספות ב-Fleet Daily + שאילתת `message` בודדת ב-Daily Digest (רק כש-unresolved>0) — לא נוגע במכסת 500MB. Discord: +1 הודעה יומית קבועה (Watchdog) — לא מתקרב לשום rate limit של webhook. |
| **אבטחה** | Watchdog: `permissions: actions: read` בלבד, `GH_TOKEN: ${{ github.token }}` אוטומטי — אין סוד חדש. פידבק משתמש (טקסט לא-נאמן): עובר **רק** דרך `env:` ברמת הצעד (`FB_SNIPPET`), אף פעם לא `${{ }}` בתוך `run:` — נחתך ל-100 תווים ומנוקה משורות חדשות **בתוך ה-JS** (`daily-digest.mjs`, לפני שהוא בכלל מגיע ל-YAML), לא ב-bash. `jq --arg` עוטף כל ערך כ-JSON string בטוח מול תווים מיוחדים. |
| **תחזוקה** | תואם מטרת-העל (§3): מחליף בדיקה ידנית תקופתית ("מישהו שכח סוכן?") בדיווח יומי אוטומטי. עלות תחזוקה יחידה: טבלת ה-max-age ב-`watchdog.yml` היא רשימה ידנית של 10 קבצים — אם workflow מתוזמן חדש נוסף בעתיד, צריך להוסיף אותו ידנית לטבלה (לא מתגלה אוטומטית). ראוי לתעד את זה כמגבלה ידועה. |
| **הפיכות** | `git revert` על קומיט בודד. `watchdog.yml` הוא קובץ עצמאי חדש — מחיקתו/כיבויו לא משפיע על שום workflow קיים. שינויי הספים ב-Fleet Daily הם תוספת בלוק קוד יחיד, לא שינוי מבנה. |
| **כשל שקט** | הציר הכי רגיש כאן — Watchdog קיים כדי לתפוס בדיוק את זה, אז הוא עצמו חייב לא להיכשל בשקט: (1) אם `gh api` נכשל לworkflow בודד (rate limit/רשת/404) — זו קטגוריה נפרדת ("⚠️ בדיקה נכשלה"), לא נבלעת כ"רענן" ולא כ"אף פעם לא רץ". (2) צעד הדיווח לדיסקורד רץ **תמיד** (ללא `if:`), עם fallback embed 🔴 אם קובץ ה-JSON מהצעד הקודם חסר בכלל — כך שגם קריסה מוחלטת של צעד הבדיקה מולידה פוסט אדום, לא שקט. (3) Watchdog עצמו נוסף לרשימת `failure-alert.yml` כך שקריסה קשה (exit≠0) שלו תדווח גם היא. |

**פסק דין: ✅ בצע.** שכבת monitoring טהורה, read-only, הפיכה לחלוטין, ללא סוד חדש.

---

## שלב 0 — אבחון (בוצע, לתיעוד)

- **Fleet Daily / Growth Pulse**: `fleet-daily.yml:110-187`. שאילתות `psql_q()` ישירות
  על `SUPABASE_DB_URL` (לא סקריפט חיצוני). Discord: `fleet-daily.yml:189-214`,
  `DISCORD_WEBHOOK=${{ secrets.SENTINEL_DISCORD_WEBHOOK }}`, guard `if [ -z ... ]`,
  `jq -n --arg`, `continue-on-error: true`. אין ספים כיום מעבר ל-DB-size (cost step).
- **Daily Digest feedback**: הספירה ב-`scripts/daily-digest.mjs:167-186`
  (`gatherFeedback()`), `SELECT count(*) FROM feedback WHERE status IS DISTINCT FROM
  'resolved'`. Output כרגע: `date`/`attention`/`digest` בלבד (`emitOutputs`, שורות
  335-346). טבלת `feedback`: עמודות `created_at, user_id, user_email, type, message,
  status` (מ-`api/feedback.js`, `AdminPanel.jsx`).
- **Cron מלא של כל ה-workflows המתוזמנים**: sentinel `20,50 * * * *` · daily-digest
  `0 4 * * *` · fleet-daily `0 6 * * *` · smoke `0 4 * * *` (+push ל-main) ·
  data-guardian `0 5 */3 * *` · fleet-weekly `0 7 * * 0` · analyst `0 6 * * 0` ·
  arch-auditor `0 5 * * 0` · backup `0 3 * * 0` · restore-drill `0 4 1 */3 *`
  (רבעוני, משתנה כאן לחודשי). לא מתוזמנים כלל: build, triage, failure-alert,
  email-campaign, health, watchdog (החדש) — נכון שאין להם סף "איחור".
- **`failure-alert.yml:10`**: מערך `workflows: [...]` מתאים לפי `name:` (לא קובץ).

---

## שלב 1 — קובץ חדש `.github/workflows/watchdog.yml`

`name: Watchdog` · `on: schedule '0 8 * * *'` + `workflow_dispatch` ·
`permissions: contents: read, actions: read`.

טבלת max-age (קבועה בראש הסקריפט, לא מפוזרת):
```
sentinel.yml=3   daily-digest.yml=30   fleet-daily.yml=30   smoke.yml=30
data-guardian.yml=80   fleet-weekly.yml=192   analyst.yml=192
arch-auditor.yml=192   backup.yml=192   restore-drill.yml=840
```

לכל workflow: `gh api "/repos/$REPO/actions/workflows/<file>/runs?status=success&per_page=1"`
→ `.workflow_runs[0].updated_at` → גיל בשעות מול הסף. **שלוש קטגוריות נפרדות**, אף
אחת לא נבלעת בשקט:
- 🟢 טרי (בתוך הסף)
- 🟠 מאחר (updated_at קיים אך חורג מהסף) — שם · זמן ריצה אחרון · כמה זמן עבר · הסף
- 🔴 **מעולם לא הצליח** (אין `workflow_runs[0]` בכלל)
- 🔴 **הבדיקה עצמה נכשלה** (`gh api` נכשל/404/timestamp לא תקין) — קטגוריה נפרדת,
  לא "רענן" וגם לא "אף פעם לא רץ"

דיווח: **פעם ביום, תמיד**. ירוק → `"🐕 Watchdog — כל 10 הסוכנים המתוזמנים רצו בזמן"`.
לא ירוק → `"🐕 Watchdog — M סוכנים לא רצו"` + שורה לכל בעיה. צבע: אדום אם יש
never-succeeded/check-failed, אחרת כתום אם יש stale, אחרת ירוק. צעד הדיווח לדיסקורד
**רץ תמיד ללא `if:`**, עם fallback embed 🔴 אם קובץ ה-JSON מהצעד הקודם חסר בכלל —
כדי שגם קריסה של צעד הבדיקה עצמו תדווח, לא תישאר שקטה.

דפוס דיסקורד זהה למקובל: `env:` ברמת הצעד, guard `if [ -z "${DISCORD_WEBHOOK:-}" ]`
עם `::warning::`, `continue-on-error: true` (על צעד הבדיקה, לא על צעד הדיווח),
`jq -n --arg`, אפס `${{ }}` בתוך `run:`.

**הוסף `"Watchdog"` למערך ב-`.github/workflows/failure-alert.yml:10`** — תואם ל-`name:`
של הקובץ החדש.

## שלב 2 — ספים ב-`fleet-daily.yml` (Growth Pulse, שורות 110-187)

עיקרון: **אפס state בין ריצות** — כל סף מגיע משאילתה ישירה בחלון הזמן שלו, לא מהקאש
היומי הקיים (`growth-prev.json` נשאר בדיוק כמו שהוא, לא נוגעים).

שתי שאילתות **חדשות** (חלונות שונים מהמדדים המוצגים בכוונה — 48/72 שעות, לא ה-24
שעות שכבר מוצגות):
```bash
tr48="$(psql_q "SELECT count(*) FROM public.trades WHERE \"createdAt\" >= now() - interval '48 hours';")"
s72="$(psql_q "SELECT count(*) FROM auth.users WHERE created_at >= now() - interval '72 hours';")"
```
ספי activation מחשבים מספר מספרי (`act_pct_num`) מתוך `act`/`tot` הקיימים (ללא
שאילתה נוספת) ומשמשים גם את התצוגה הקיימת וגם את הסף, כדי שלא יהיה drift בין
המספר המוצג למספר שנבדק.

שלושה ספים, כולם 🟠 (`AMBER=15844367`, כבר מוגדר בצעד):
- `tr48` תקין ושווה `0` → "אין עסקאות חדשות ב-48 השעות האחרונות"
- `s72` תקין ושווה `0` → "אין נרשמים חדשים ב-72 השעות האחרונות"
- `act_pct_num` תקין ומתחת ל-25 → "Activation מתחת ל-25%"

כשספי כלשהו נדלק: `color=$AMBER` (במקום `$GREEN` הקבוע כיום בשורה 141), ושורה
"⚠️ דורש תשומת לב:" + השורות שנדלקו **בראש הבלוק**, לפני שורות המדדים הקיימות. כשאף
ספי לא נדלק — הפלט **זהה בייט לבייט** להיום (אותם מדדים, אותו ניסוח, אותו סדר, אותו
צבע). שמירת ה-state (`growth-prev.json`) לא משתנה — `tr48`/`s72` לא נכנסים אליו.

## שלב 3 — פידבק ל-Discord

**`scripts/daily-digest.mjs`**: ב-`gatherFeedback()` (שורות 167-186), כש-`unresolved >
0` — שאילתה נוספת: `SELECT message FROM feedback WHERE status IS DISTINCT FROM
'resolved' ORDER BY created_at DESC LIMIT 1`, מנוקה מ-newlines וחתוכה ל-100 תווים
**בתוך ה-JS** (`.replace(/\r?\n/g," ").slice(0,100)`) — לא ב-bash. `emitOutputs()`
(שורות 335-346) מקבל את אובייקט ה-feedback ומוסיף שני outputs חדשים:
`feedback_unresolved`, `feedback_snippet`. שני מוקדי הקריאה ל-`emitOutputs` (הנתיב
הרגיל ב-`main()` + הנתיב `main().catch(...)` האחרון-מוצא) מתעדכנים בהתאם; הנתיב
הכושל מעביר `null` (מטופל בבטחה).

**`.github/workflows/daily-digest.yml`** (צעד "Report to Discord", שורות 62-76):
`env:` מקבל `FB_UNRESOLVED`/`FB_SNIPPET` מ-`steps.digest.outputs.*` (לעולם לא
`${{ }}` בתוך `run:`). כש-`FB_UNRESOLVED` הוא מספר חיובי: `COLOR=15844367` (כתום)
ושורה "💬 N פידבקים ממתינים" + ה-snippet מתווספות ל-`DESC`. כש-0/חסר — `DESC`/`COLOR`
זהים בייט לבייט להיום. Guard מספרי (`grep -qE '^[0-9]+$'`) מטפל גם במקרה שה-output
עדיין לא קיים (deploy חלקי) — נופל בחזרה להתנהגות הישנה, לא שובר.

## שלב 4 — Restore Drill: רבעוני → חודשי

`.github/workflows/restore-drill.yml`: שורה 15 `cron: '0 4 1 */3 *'` →
`'0 4 1 * *'` (+ תיקון ההערה בשורה 10 מ"Quarterly" ל-"Monthly"). אין שינוי אחר —
staleness guard של 8 ימים (שורות 72-79) בלתי תלוי בתדירות התרגיל.

## שלב 5 — S2.3 (בוצע כבר, ללא עריכת קובץ)

ראה "ממצא אגבי" ב-Context למעלה. `AUTH_EXPECTED=1` אומת בלוג ריצה אמיתית
(`30253015899`, 2026-07-27T09:13:31Z). אין שורת סיכון קיימת ב-`STATE.md` למחוק —
היא כבר נמחקה בקומיט `85c1195`, לפני האימות. **אין פעולה נדרשת כאן מלבד ציון
העובדה בדיווח הסופי.**

---

## קבצים קריטיים

- `.github/workflows/watchdog.yml` (חדש)
- `.github/workflows/fleet-daily.yml` (עריכה — Growth Pulse בלבד, שורות ~110-187)
- `scripts/daily-digest.mjs` (עריכה — `gatherFeedback`/`emitOutputs`)
- `.github/workflows/daily-digest.yml` (עריכה — צעד Discord, שורות 62-76)
- `.github/workflows/failure-alert.yml` (עריכה — שורה 10)
- `.github/workflows/restore-drill.yml` (עריכה — שורות 10, 15)
- `docs/STATE.md` (עדכון בסוף המשימה, לא לפניה — לפי §10)

## נוהל אישור — ארבעה שלבים (ראו CLAUDE.md §9 המעודכן)

הסתירה בין CLAUDE.md §9 המקורי ("לדחוף תוכנית לפני אישור") לבין Plan Mode של
ה-harness ("אין כתיבה עד אישור") התגלתה במהלך הסשן הזה — היא ייצרה חשד לקומיט-רפאים
(התוכנית תוארה בצ'אט אך לא נכתבה בפועל לריפו). התיקון (`docs/DECISIONS.md`
2026-07-27) קובע ארבעה שלבים:

1. **Plan Mode**: מוצגת תוכנית מלאה. ניב מאשר **יציאה מ-Plan Mode** — רשות לכתוב
   קבצים בלבד, לא אישור לביצוע.
2. **הפעולה הראשונה והיחידה** אחרי היציאה: כתיבת התוכנית ל-`docs/plans/`, קומיט
   נפרד, push. **עצירה מוחלטת** — אין קוד, אין workflows, אין `npm`, אין `STATE.md`.
3. משיכה מ-`origin/main`, קריאת הקובץ בפועל (לא מהזיכרון), ודיווח פלט `push` מלא —
   ורק אז בקשת אישור לביצוע.
4. **רק לאחר אישור מפורש בשלב 3** מתחיל היישום עצמו (שלבים 1-4 למעלה) + verification
   המלא שהוגדר במשימה (`npm run verify`, בדיקת YAML, grep על `${{ }}` בתוך `run:`,
   עדכון STATE.md, git add מפורש, commit, push).

## אימות (אחרי האישור והיישום)

1. `npm run verify` — פלט מלא מודבק בדיווח.
2. `python3 -c "import yaml,glob; [yaml.safe_load(open(f)) for f in glob.glob('.github/workflows/*.yml')]"` —
   כל קבצי ה-workflow (כולל `watchdog.yml` החדש) תקפים כ-YAML.
3. `grep` על `watchdog.yml` + כל הצעדים החדשים בשלושת הקבצים שנערכו — לוודא **אפס**
   `${{ }}` בתוך בלוקי `run:` (כל ערך דרך `env:` בלבד).
4. `workflow_dispatch` ידני חד-פעמי על `watchdog.yml` (אחרי push) לוודא שהוא רץ בפועל
   ומדווח לדיסקורד — לא מסתמכים רק על "אמור לעבוד" (CLAUDE.md §2).
5. עדכון `docs/STATE.md` (לפני ה-push הסופי, אותו קומיט): 🔴 עכשיו ← "שבוע הבנת
   משתמשים (GA4 מותקן?)" · ✅ נסגר השבוע ← רוטציית webhook (בוצעה 27.07, אומתה חי) +
   Watchdog+ספים+פידבק · ⚠️ הוסף שורה: `api/send-invites.js` קורא
   `SENTINEL_DISCORD_WEBHOOK` שלא קיים ב-Vercel — יוצא בשקט, הדיווח מעולם לא ירה משם.
6. `git add` מפורש לכל קובץ (לא `-A`).
7. commit: `feat(fleet): watchdog agent, growth thresholds, feedback surfacing`.
8. `git push origin main` — פלט מלא כולל `..HEAD -> main`.

**Report סופי**: hash + פלט push מלא + תוצאת workflow_dispatch הידני + הערת S2.3
(כבר בוצע, בלי עריכת קובץ) + סיימתי ✅.
