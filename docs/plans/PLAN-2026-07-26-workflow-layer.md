# שכבת הזרימה — CLAUDE.md + STATE.md + DECISIONS.md + hooks + verify

**סטטוס:** אושר 2026-07-26 עם ארבעה תיקונים (מצב S2 האמיתי ב-STATE.md · תור-העל המלא בן 15 הפריטים · תאריך לא-מאומת ב-DECISIONS · בדיקת pre-push דרך stdin במקום `--force`) — כולם משולבים למטה.

## Context

חוקי העבודה של הפרויקט חיים היום בשלושה מקומות שאף אחד מהם אינו הריפו: הזיכרון של Claude-chat, פרומפטים שנכתבים מחדש בכל משימה, ו-`HANDOFF_2026-07-25.md` — קובץ untracked שנמחק ולוקח איתו את הכללים. `CONTEXT.md` (437 שורות) הוא מסמך ידע מצוין אבל הוא ארכיון: הוא מערבב ארכיטקטורה, היסטוריית ספרינטים וכללי עבודה, וכלל #8 בו אפילו **מתיר** force-push — בדיוק הפעולה שהרסה עבודה בעבר.

התוצאה: כל session חדש מתחיל מאפס, וההגנות היחידות הן משמעת אנושית. המשימה מעבירה את החוקים לריפו כך ש-Claude Code טוען אותם אוטומטית, ומגבה את שני הכללים ההרסניים ביותר (force-push, קומיט של HANDOFF) ב-hooks שחוסמים בפועל ולא רק מבקשים.

**אפס שינויי קוד אפליקציה.** `SwingEdge_App.jsx`, `src/`, `api/`, `.github/workflows/` — לא נגעתי, לא אגע.

---

## הרחבת היקף — אושרה תוך כדי התכנון

הפרומפט המקורי מנה 5 קבצים. שלוש התשובות שלך הוסיפו שלושה:

| # | קובץ | מקור ההרשאה |
|---|------|--------------|
| 6 | `.gitignore` | תשובה 2/3 — `.gitignore` = היגיינה יומיומית, hook = הגנה מטעות מכוונת |
| 7 | `CONTEXT.md` (שורה 209 בלבד) | תשובה 1/3 — הרשאה מפורשת: "שני קבצים שסותרים זה את זה בנושא הרסני הם באג בפני עצמו" |
| 8 | `docs/RUNBOOK.md` (append) | הפרומפט עצמו: "הוראת התקנה (core.hooksPath) ב-CLAUDE.md **וב-RUNBOOK**" |

⚠️ **פקודת ה-`git add` שבסוף הפרומפט חסרה שלושה קבצים.** התיקון בסעיף הביצוע למטה.

---

## קובץ 1 — `CLAUDE.md` (שורש) · עברית + מונחים טכניים באנגלית · ≤300 שורות

מסמך פקודות, לא ידע. כל מה שכבר כתוב ב-CONTEXT.md/RUNBOOK.md — הפניה בלבד.

**תוכן העניינים:**

| § | כותרת | תוכן |
|---|--------|------|
| 0 | מה הקובץ הזה | מפת ארבעת הקבצים: `CLAUDE.md`=חוקים · `CONTEXT.md`=ידע וארכיטקטורה · `docs/RUNBOOK.md`=נהלי חירום · `docs/STATE.md`=מצב חי · `docs/DECISIONS.md`=החלטות נעולות. **הצהרה: בסתירה — CLAUDE.md גובר.** |
| 1 | כלל הברזל | "האם מהנדס גוגל + טריידר וול-סטריט היה בונה את זה?" לא → מחדש. |
| 2 | הסטנדרט | אפס כשל שקט · אפס שינוי בלי הוכחה · אפס תלות בזיכרון אנושי. |
| 3 | מטרת-העל | כל פתרון נמדד ב"האם זה מקטין עבודה ידנית לניב לאורך זמן". |
| 4 | Safety gate | `git pull origin main` + עץ נקי לפני כל משימה. נכשל/מלוכלך → **STOP**, לא "אסתדר". |
| 5 | גיט — חוקי ברזל | לעולם לא force-push (**מבטל את CONTEXT.md #8**) · לעולם לא לקומט `HANDOFF*.md` · session אחד בכל רגע, אין worktrees ואין עבודה מקבילה · "סיימתי" תקף **רק** עם פלט push שמכיל `..HEAD -> main`. |
| 6 | התקנת hooks | `git config core.hooksPath .githooks` — פעם אחת לכל clone. הסבר שזו הגדרה מקומית שלא עוברת ב-clone. |
| 7 | verify לפני push | `npm run verify` חובה. להדביק את **הפלט המלא** בדיווח, לא סיכום. |
| 8 | ניתוח השלכות | ראה מסגרת מלאה למטה. |
| 9 | נוהל תוכניות | כל Plan → `docs/plans/PLAN-YYYY-MM-DD-<slug>.md`, commit נפרד `docs(plan): <משימה> — awaiting approval`, push, **ואז** המתנה. הקומיט אינו אישור. |
| 10 | בסיום כל משימה | לעדכן `docs/STATE.md` **לפני** ה-push. אירוע פרודקשן/CI → גם `docs/INCIDENTS.md`, באותו קומיט של התיקון. |
| 11 | סריקה סביבתית | תיקון מיידי רק אם: ודאי 100% **וגם** קשור למשימה **וגם** קטן ובטוח. כל השאר → רשימה נפרדת בדיווח, ניב מחליט. |
| 12 | גבולות קשיחים | מיגרציות: Code כותב `.sql` בלבד, ניב מריץ ב-SQL Editor — Code לעולם לא מריץ. סודות: Code לעולם לא מריץ `gh secret set` ולא מזין סודות, ניב בלבד. |
| 13 | מלכודות קוד ידועות | Tailwind JIT: אין אינטרפולציה דינמית של class — כל ענף מחרוזת ליטרלית עם hex · מחרוזות load-bearing (`setup`/`emotion`/`market` ב-`src/data/tradeOptions.jsx`) לא משתנות בלי אודיט מלא · מקור-אמת-אחד ל-`edge`/`capital`/`VALID_*` · אנטי-flicker: קומפוננטות ב-module scope + `memo` · back-compat ב-`parseChartResult`: רק שדות חדשים. |
| 14 | הפניות | → `CONTEXT.md` §Coding Rules 1–11 (`t.side`, `calcTradeMetrics`, NAV_KEYS…) · §Working procedures (אימות deploy בלי `curl`, אימות מובייל ב-iframe 390px) · `docs/RUNBOOK.md` (שחזור DB, קמפיין מייל) · `docs/INCIDENTS.md` (6 אירועים). |

**§8 — ניתוח השלכות, המסגרת המלאה (הרץ על עצמך לפני כל Plan):**

- **רמה 1 — פילטר שקט.** משנה DB? · נוגע בכסף/מיילים? · מוסיף סוד? · רץ אוטומטית בפרודקשן? · בלתי הפיך? — כל התשובות "לא" → המשך, **אל תציג כלום**.
- **רמה 2 — רק אם הפילטר תפס.** טבלה: משתמשים · נתונים (הפיכות/מיגרציה) · עלות (Vercel/Supabase/דקות Actions/מכסה) · תקרות ספק (Gmail ~300/יום, Finnhub, Supabase 500MB) · אבטחה · תחזוקה (מבחן מטרת-העל) · הפיכות · כשל שקט.
- **פסק דין:** ✅ בצע · ⚠️ בצע עם הגנה · ✂️ פצל · ⛔ אל תבצע.

---

## קובץ 2 — `docs/STATE.md` · ≤100 שורות

הערה בראש הקובץ: *מתעדכן ע"י Claude Code בסיום כל משימה — לפי סיום משימה, לא לפי לוח שנה.*

מבנה קשיח, מאוכלס מ-`docs/INCIDENTS.md` #6, `docs/plans/`, ו-15 הקומיטים האחרונים:

```
עודכן: 2026-07-26 · HEAD: <hash של קומיט המימוש>

🔴 עכשיו  (משימה אחת בלבד)
  S2.3 — סינון 404 של לוגו סימבול. TickerLogo מושך
  financialmodelingprep.com/image-stock/{TICKER}.png; SNTNL אינו סימבול אמיתי
  ולכן 404 ודאי עם fallback תקין. ללא סינון לפי מקור — 🟠 קבוע כל שעה
  על רעש שהמוניטור מייצר לעצמו.

⏭️ הבא בתור
   1. S2.3 — סינון 404 של לוגו סימבול
   2. ניקוי מאוחד — npm audit fix (3 high) · try/catch ל-api/_lib/rateLimit.js ·
      timeout ל-api/verify-turnstile.js · צעד דיסקורד ל-7 הסוכנים שמדווחים רק במייל
      (analyst, arch-auditor, daily-digest, data-guardian, restore-drill, triage,
      failure-alert) · Supabase Backup ו-Smoke Tests שקטים לגמרי ·
      actions/upload-artifact@v4 מתריע Node.js 20 deprecated
   3. רוטציית Discord webhook (4 סוכנים) — אחרי 2 בלבד, אחרת מעדכנים סוד
      ואז מוסיפים צרכנים
   4. שבוע הבנת משתמשים — GA4 (לא מותקן), שאילתת retention day-7, מייל ל-5 פעילים
   5. חובות מוצר במנוע — סתירת כרטיס ההון · +0.00R בלי stop · PROFIT FACTOR ∞;
      כולם ב-calcTradeMetrics, משימה נפרדת עם בדיקות
   6. חובות מוצר בקופי — תג CLOSED בקריפטו · waitlist בלנדינג · ניסוח דוח Growth
   7. מיפוי קבצים במחשב (read-only, דוח מקומי — לא לריפו)
   8. סידור בפועל — מחשב + ריפו
   9. Dispatcher → Actions (IMAP)
  10. Trader Persona → Actions
  11. Gate 2.2 — RLS audit מלא + בדיקת חדירה + rate-limit ל-symbol-search + נגישות
  12. ₪ + Stripe + entitlement (אין ₪ בקוד כלל)
  13. B1 Multi-Account
  14. Track A — לנדינג V2
  15. אודיט 4 קבצי הידע מול הקאנון (Minervini/O'Neil/Weinstein/Tharp)

⏸️ חסום / ממתין לניב
  · Google Workspace  · רשם הדומיין (איש קשר + Auto-Renew)  · מלאי סודות
  · החלטת ריפו פרטי מול דקות Actions  · GA4 Measurement ID

✅ נסגר השבוע
  · S2 — מחזור מלא ראשון בפרודקשן ✅ (26.07 23:16, ידני, 411d1dc): לוגין →
    hydration → יומן → יצירת SNTNL → טאבים → מחיקה → ניקוי REST. שפיות ביומן:
    3 עסקאות בדיוק (AAPL/NVDA/BTC-USD), אפס SNTNL
  · Sentinel #6 — התאוששות שקרית + לכידת ראיות (54713d3, 411d1dc)
  · סיבוב BACKUP_PASSPHRASE + Restore Drill — 222 שורות ב-11 טבלאות אומתו
  · כל 7 תקלות Sentry סומנו Resolved — הלוח נקי
  · שער אישור waitlist + שולח קמפיין  · הגירת Fleet ל-Actions 24/7
  · קריסת Journal (60/137 עסקאות בלי stop)

⚠️ סיכונים פתוחים
  · שכבת auth רצה פעם בשעה בעוד הדיווח כל 20 דק' → אזור עיוור מובנה
  · core.hooksPath הוא config מקומי — clone חדש בלי הגנת hooks
```

---

## קובץ 3 — `docs/DECISIONS.md`

שורה אחת להחלטה: תאריך · ההחלטה · הנימוק · מה נפסל. שבע החלטות + שתיים שזיהיתי בריפו:

| תאריך | החלטה | נימוק | נפסל |
|-------|--------|--------|-------|
| 2026-07-25 | Vercel serverless ל-`send-invites` (לא Supabase Edge Function) | ה-JWT של הקורא מועבר ישירות ל-RPC; אין צורך ב-service-role key | Edge Function (חושף service-role) |
| 2026-07-25 | שליחה מיידית בלחיצה, לא תור מתוזמן | `SEND_GAP_MS=300` → 25 מיילים בתוך `maxDuration` 60s; אין תור לתחזק | תור מתוזמן |
| 2026-07-25 | תקרה יומית נאכפת ב-DB (`admin_invite_send`, DAILY 120 / BATCH 25) | לקוח לא יכול להרחיב אותה; RLS מאמת admin בתוך ה-RPC | אכיפה במשגר (ניתנת לשינוי בקוד) |
| 2026-07-26 | עסקת QA מזוהה לפי `ticker='SNTNL'` | ticker קבוע ביצירה → סחיפה דטרמיניסטית ב-`?ticker=eq.SNTNL` | שדה notes (ניתן לעריכה/מחיקה) |
| 2026-07-26 | חלון gate 45→09 + `concurrency{group:sentinel-auth, cancel-in-progress:false}` | מתזמן GitHub מאחר 5–15 דק'; ה-concurrency הוא ההגנה האמיתית מפני מרוץ SNTNL, החלון רק אופטימיזציה | 45–59 (לא רץ) · 45→14 (חופף ריצת `:20`, auth פעמיים בשעה) |
| 2026-07-26 | `~/Swing-edge` לא זז · session אחד · אין worktrees | נתיבים קשיחים ב-CI ובסוכני Cowork; עבודה מקבילה גרמה ל-force-push. **תאריך ההחלטה המקורי לא אומת** — נהג בפועל קודם; העקבה הקרובה היא `5e65fc7` (2026-05-22, untrack worktrees) אך היא אינה מתעדת את הכלל. התאריך כאן = היום שבו נכתב | worktrees / עבודה מקבילה |
| 2026-07-19 | אין service-role key ב-Vercel — RPC עם security-definer | `is_admin()` נבדק ב-DB, RLS מגביל לנתוני המשתמש | הטמעת service-role (לא ניתן לביקורת) |
| 2026-07-26 | monitor לא מסיק בריאות מהיעדר סיגנל שלא נאסף | בדיקה על gate צר ממחזור הדיווח **חייבת** להצהיר שרצה (`AUTH_EXPECTED`) | הסקת התאוששות מהיעדר תקלה |
| 2026-07-26 | `reason` נושא תצפיות בלבד; היפותזות ב-`fix` | ניחוש שהודפס כעובדה עיגן 3 אבחונים שגויים | היפותזה מקודדת בקשיח |

---

## קובץ 4 — `.githooks/` (מעקב git, `chmod +x`)

`chmod +x` **חובה** — hook לא-executable מדולג בשקט, כלומר fail-open בלי שום סימן.

**`pre-commit`** — חוסם `HANDOFF*.md` ב-staging:
- `git diff-index --cached --diff-filter=ACMRT -z` — `R` כלול (שינוי-שם חומק אחרת), `D` **מוחרג** בכוונה: הסרת HANDOFF מעוקב היא בדיוק התיקון הרצוי.
- הודעה בעברית + פקודת `git restore --staged '<file>'` המדויקת לכל קובץ חורג.

**`pre-push`** — חוסם push שאינו fast-forward אל `refs/heads/main`:
- `git merge-base --is-ancestor` מחזיר **שלושה** מצבים (אומת בריפו, git 2.54): `0`=ancestor · `1`=לא · `128`=אובייקט חסר.
- `remote_sha` אפסים (ענף חדש) → עובר · `local_sha` אפסים (מחיקה) → נחסם **רק ל-main** (מחיקת `claude/*` היא שגרה, יש ~35)
- refs שאינם main, כולל תגיות → מדולגים
- אובייקט מרוחק חסר → `git fetch` שקט אחד עם `GIT_TERMINAL_PROMPT=0`; עדיין חסר → **fail-open עם אזהרה**. הנימוק: השרת דוחה non-FF בעצמו, וחסימה כאן היא false-positive מובטח שיאמן אותך להקליד `--no-verify` רפלקסיבית.

**עקיפה:** `--no-verify` בלבד, לחירום מתועד ב-`INCIDENTS.md`.
❌ **דחיתי** את הצעת ה-`ALLOW_HANDOFF=1` של סוכן התכנון — מנגנון עקיפה שני שלא ביקשת, ו-`.gitignore` מטפל במקרה היומיומי.

**מקרה שייראה כמו false-block:** `git commit --amend` על קומיט שכבר נדחף → non-FF → נחסם. זה נכון לפי הכלל, אבל תרגיש כמו טעות. העקיפה כתובה בתוך הודעת השגיאה.

---

## קובץ 5 — `package.json`

הוספה יחידה, אף script קיים לא משתנה:
```json
"verify": "npm run test:coach && npm run test:import && npm run test:settings && npm run build"
```
(`test:smoke` — Playwright — מחוץ ל-verify בכוונה, לפי המפרט.)

## קובץ 6 — `.gitignore`
הוספת `HANDOFF*.md` ו-`browser-findings*.json` (שניהם untracked כרגע, אף פעם לא קומטו).

## קובץ 7 — `CONTEXT.md` שורה 209, שינוי חד-שורתי
`❌ NEVER force-push to main without explicit user permission ("א" or "כן force")`
→ `❌ NEVER force-push to main. אסור מוחלט — ראה CLAUDE.md §5. נאכף ב-.githooks/pre-push.`
**זה כל השינוי ב-CONTEXT.md.** שום דבר אחר לא נמחק ולא משוכתב.

## קובץ 8 — `docs/RUNBOOK.md`, append
מקטע `## התקנת git hooks (clone חדש)`: `git config core.hooksPath .githooks` + `chmod +x`, אימות, ומתי `--no-verify` לגיטימי.

---

## אימות

1. `npm run verify` — פלט מלא מודבק בדיווח.
2. **pre-commit:** `touch HANDOFF_TEST.md && git add -f HANDOFF_TEST.md && git commit` → חייב לצאת 1 עם ההודעה העברית. ואז `git restore --staged` + `rm`.
3. **pre-commit לא חוסם לגיטימי:** קומיט המימוש עצמו חייב לעבור נקי.
4. **pre-push לא חוסם לגיטימי:** ה-push הרגיל ל-main עובר בשקט. זו הבדיקה החשובה מכולן.
5. **pre-push — בדיקה ישירה דרך stdin, בלי לגעת ב-main.** ה-hook קורא `<local_ref> <local_sha> <remote_ref> <remote_sha>`, ולכן אפשר להאכיל אותו ידנית באפס סיכון:
   - **מקרה חוסם:** `local`=קומיט ישן, `remote`=HEAD (זוג לא-FF מפוברק) → חייב לצאת `1` עם ההודעה העברית
   - **מקרה עובר:** זוג FF תקין → חייב לצאת `0` בשקט

   שני הפלטים מודבקים בדיווח. **לא מריצים `--force` על הענף החי בשביל בדיקה.**

---

## ביצוע (אחרי אישור)

**שלב 0 — פרסום התוכנית.** Plan mode אוסר עליי לקומט, ולכן הפעולה הראשונה בביצוע היא כתיבת `docs/plans/PLAN-2026-07-26-workflow-layer.md`, קומיט `docs(plan): workflow layer — awaiting approval`, ו-push — קומיט נפרד לגמרי, לפני כל שינוי אחר.

**שלב 1 — המימוש:**
```bash
npm run verify
git add CLAUDE.md docs/STATE.md docs/DECISIONS.md docs/RUNBOOK.md .githooks .gitignore package.json CONTEXT.md
git commit -m "chore(workflow): CLAUDE.md rules, STATE.md live status, DECISIONS log, git hooks, verify script"
git push origin main
```
(שלושת הקבצים המודגשים נוספו ל-`git add` שבפרומפט — ראה סעיף הרחבת ההיקף.)

דיווח: פלט `verify` מלא · פלט push מלא עם `..HEAD -> main` · hash · סיימתי ✅
