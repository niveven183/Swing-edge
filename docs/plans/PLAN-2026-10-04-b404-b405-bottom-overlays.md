# PLAN 2026-10-04 — B-404 + B-405 · באנרים תחתונים לא מכסים CTA במובייל

## Context
גל C-064 חשף ‹R-3›: באנר ההסכמה ו-`IOSInstallBanner` (שניהם `fixed bottom`) מכסים כפתורי ליבה במובייל, ושום אימות ⛔ ראה זאת כי הבדיקות סוגרות באנרים (`addLocatorHandler`) או רצות על viewport גבוה. המטרה: אף CTA ליבה ⛔ מכוסה, בלי לגעת בלוגיקת ההסכמה (משפטי) — פריסה ותזמון בלבד, עם שער שנצפה אדום.

**Safety gate:** HEAD=`d1e05e1`=origin/main · עץ נקי · hooksPath=`.githooks` ✅.

## §15 — רמה: T3 · כן/לא/כן/כן/כן
1 הפיכות כן (פריסה פונה-משתמש בפרודקשן; revert = deploy) · 2 אמון לא · 3 אבטחה **כן** (מסך ההתחברות + משטח ההסכמה — ספק ⇒ כן) · 4 רוחב כן (≥5 קבצי קוד) · 5 ודאות כן (WebKit ⛔ נמדד מקומית).

## §0 — עובדות שנמדדו (build הרמטי של HEAD · Chromium עם UA+viewport של כל מכשיר · `elementFromPoint` במרכז היעד אחרי `scrollIntoView`)

### 2a — מטריצה (זהה ב-he ו-en, פרט למספרי פיקסלים)
| מכשיר (viewport) | באנר | login | הרשמה | FAB | Log Trade | שמירת סטאפ |
|---|---|---|---|---|---|---|
| Pixel 7 (412×839) | הסכמה | ✅ | 🔴 | ✅ | 🔴 | ✅ |
| iPhone SE (320×568) | הסכמה | 🔴 | 🔴 | ✅ | ✅ | ✅ |
| iPhone SE | iOS | n/a¹ | n/a¹ | 🔴 | 🔴 | ✅ |
| iPhone 14 (390×664) | הסכמה | 🔴 | 🔴 | ✅ | ✅ | ✅ |
| iPhone 14 | iOS | n/a¹ | n/a¹ | 🔴 | 🔴 | ✅ |
| iPhone 14 Pro Max (430×740) | הסכמה | 🔴 | 🔴 | ✅ | 🔴 | ✅ |
| iPhone 14 Pro Max | iOS | n/a¹ | n/a¹ | 🔴 | 🔴 | ✅ |
| Galaxy S8 (360×740) | הסכמה | 🔴 | 🔴 | ✅ | 🔴 | ✅ |

**סה"כ לכל שפה: `18/34` תאים מכוסים** — הסכמה `12/25` (5 מכשירים × 5 יעדים) · iOS `6/9` (3 iPhone × 3 יעדים במסך המחובר). שתי השפות: `36/68`; ‏he=en בכל תא. ¹ `IOSInstallBanner` מורכב רק ב-`SwingEdge_App` (`:4222`), ⛔ במסך ההתחברות. FAB ⛔ מכוסה ע"י ההסכמה — הכרטיס שומר `104px` ל-FAB (`ConsentBanner.css`).
⚠️ הכיסוי של ההסכמה **לא מוגבל ל-iPhone 14**: גם Pixel 7 (הרשמה · Log Trade) ו-Galaxy S8.

### 2b — האם גלילה חושפת? **לא — חסימה עד אינטראקציה עם הבאנר, ⛔ חיכוך-גלילה.**
- login/הרשמה: צריך `51–183px` גלילה, יש `0–87px` (אין מקום מתחת לכפתור).
- Log Trade: בכותרת-תחתונה קבועה של מודאל `max-h-[90vh] flex-col` (`:8008`) ⇒ גלילת התוכן ⛔ מזיזה אותו.
- FAB: מוסתר בגלילה (`fabVisible` ⇒ `translate-y-24 opacity-0 pointer-events-none`, `:8642`) ⇒ «גלילה חושפת» = הכפתור נעלם.
- היציאה היחידה: לחיצה על הבאנר (בחירת הסכמה / X של iOS). משתמש שלא מבין זאת רואה כפתור «מת».

### 2c — חשיפה: **⛔ אין לי נתון.**
אין UA פר-משתמש ב-`public` (בדקתי migrations; FeedbackTab מצרף browser/os **לטקסט** ההודעה בלבד, אופציונלי). Vercel Analytics = מצטבר, ⛔ פר-משתמש. מקור אפשרי: `auth.sessions.user_agent` (GoTrue) — ⛔ אומת שקיים אצלנו, sessions נגזמות ⇒ חלקי. ⛔ Code לא מריץ מול פרודקשן. **SQL ל-ניב (read-only, ספירות בלבד):**
```sql
SET default_transaction_read_only = on;
SELECT count(*) AS stuck,
  count(*) FILTER (WHERE EXISTS (SELECT 1 FROM auth.sessions s WHERE s.user_id=u.id)) AS with_session,
  count(*) FILTER (WHERE EXISTS (SELECT 1 FROM auth.sessions s WHERE s.user_id=u.id AND s.user_agent ~* 'iPhone|iPad|iPod')) AS ios
FROM auth.users u
WHERE u.deleted_at IS NULL AND u.banned_until IS NULL AND u.email_confirmed_at IS NOT NULL
  AND u.created_at < now() - interval '7 days'
  AND (SELECT count(*) FROM public.trades t WHERE t.user_id=u.id) <= 1
  AND NOT EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id=u.id);
```
(מסנן `stuck_users` מ-`email-campaign.yml`; המכנה לדיווח = `with_session`, ⛔ `stuck`.)

## §1 — הפתרון (פריסה + תזמון; ⛔ לוגיקת consent · ⛔ מחרוזות · ⛔ קומפוננטה בתוך render)
כיוון ניב אושר במדידה, עם תיקון אחד: **padding לבד ⛔ מספיק** ל-Log Trade (כותרת-תחתונה במודאל) ול-FAB (`fixed`) ⇒ צריך גם להזיז אותם.

1. **`src/lib/bottomOverlay.js` (חדש)** — מקור-אמת אחד לגובה הבאנר התחתון: `setOverlay(id, px)`/`clearOverlay(id)` ⇒ `--se-bottom-overlay` על `documentElement` = המקסימום. פונקציה טהורה `overlayInset(map)` לבדיקה ב-node.
2. **`ConsentBanner.jsx`/`.css`** — `ResizeObserver` על הכרטיס ⇒ `setOverlay("consent", h)`; ניקוי כשהבאנר נעלם. CSS: `@media (max-height: 760px)` מצמצם padding/רווחים (טקסט, כפתורים ושוויון-המשקל המשפטי ⛔ משתנים). ⛔ נגיעה ב-`readConsent`/`subscribeConsent`/הלחצנים.
3. **`IOSInstallBanner.jsx`** — `setOverlay("ios", h)` · **תזמון:** prop `ready` מ-`SwingEdge_App` = `realTrades.length > 0 && !showTour && !showOnboarding` («אחרי פעולה ראשונה» = עסקה ראשונה) · ⛔ מוצג כש-`[aria-modal="true"]` קיים (MutationObserver; מוסתר ונחשף שוב). ⛔ שינוי ב-`DISMISS_KEY`/`isIOS`.
4. **צרכנים (Tailwind ליטרלי עם `var()`, ⛔ אינטרפולציה):** שורש `AuthScreen` ושורש המעטפת ב-`SwingEdge_App` ⇒ `pb-[var(--se-bottom-overlay,0px)]` (מקום גלילה) · FAB ⇒ `bottom-[calc(1.5rem+var(--se-bottom-overlay,0px))]` · מעטפת מודאל Log Trade ⇒ `pb-[var(--se-bottom-overlay,0px)]` + `max-h-[calc(90vh-var(--se-bottom-overlay,0px))]`.
5. ⚠️ שער הסנטינל הקיים (bounding-box FAB↔כרטיס ההסכמה, `sentinel-auth.spec.js`) חייב להישאר ירוק — FAB שעולה מעל הבאנר רק מגדיל את המרווח.

## §2 — בדיקות
- **`tests-eye/overlay.spec.js` (חדש, אחות ל-playbook):** המטריצה 2a (5 מכשירים × he/en × שני הבאנרים × 5 יעדים) — **⛔ `addLocatorHandler`**, ⛔ סגירת באנר. שער לכל תא: אחרי `scrollIntoView` טבעי, `elementFromPoint` במרכז = היעד; ובנוסף **לחיצה אמיתית** על login (⛔ `el.click()` ב-JS). ראיה: screenshot לכל תא + `overlay.json`. מצב הרמטי + פרודקשן (QA, ⛔ כתיבות מלבד בחירת ההסכמה ב-localStorage).
- **`playwright.eye.config.js`:** 3 פרויקטים נוספים (iPhone SE · iPhone 14 Pro Max · Galaxy S8) עם `testMatch: overlay.spec.js`; playbook נשאר על pixel7/iphone14.
- **probe** (`scripts/eye-overlay-probe.mjs`, build/serve משותפים מחולצים ל-`scripts/lib/eyeBuild.mjs` מ-`eye-playbook-probe.mjs`): **BEFORE** (עץ `d1e05e1`) ⇒ אדום (red-before) · **MUT-PAD** (הסרת צרכני ה-var) ⇒ אדום · **MUT-IOS** (הסרת שומר `ready`/מודאל) ⇒ אדום · HEAD ⇒ ירוק. מוטנט ששורד ⇒ exit 1.
- `npm run verify` + `test:registry`; ⛔ חוליה חדשה בשרשרת («33» ⛔ זז).
- ⚠️ גבול: Chromium/WebKit אמולציה, ⛔ מכשיר פיזי; RTL/ניגודיות נבדקים בצילומים, ⛔ בקורא מסך.

## §3 — workflow
`eye-playbook.yml`: ה-probe החדש רץ ב-job `probe`; prod מריץ את שני ה-specs; paths += `ConsentBanner.*` · `IOSInstallBanner.jsx` · `bottomOverlay.js` · `AuthScreen.jsx`. cron ללא שינוי (`:37`).

## §4 — רישום בסגירה
`B-404`·`B-405` ⇒ `D-114` + מצבות · `DONE` (T3, run id) · `DECISIONS`: «`--se-bottom-overlay` = מקור-אמת לבאנר תחתון; באנר iOS רק אחרי עסקה ראשונה ו⛔ מעל מודאל» · `TRUTH.md` (תזמון באנר iOS פונה-משתמש) · `CHECKS` · `STATE`/`NEXT` · שורת `INBOX`/`METRICS` לתוצאת ה-SQL של 2c כשניב מריץ.

## §5 — תוספות ניב (04.10, באישור)
1. **2c נמדד ע״י הצ'אט** (Supabase read-only, 04.10): `stuck=51` · `with_session=49` · iOS `16/49` (33%) · Android `11/49` (22%) · כלל המשתמשים עם session iOS `20/60` ⇒ שורת `METRICS` חדשה (המכנה = `with_session`), ניסוח **מתאם ⛔ סיבתיות** ⇒ `B-404`/`B-405` מסומנים **מועמד מוביל** לבעיית המשפך (`M-003`).
2. **מדד המשך** ב-`METRICS` (יעד מדידה = deploy + 14 יום): שיעור «הרשמה → עסקה ראשונה» אצל משתמשים חדשים, מפולח iOS/Android/Desktop. השאילתה נכתבת ונשמרת בשורה, ⛔ מורצת.
3. **תנאי סגירת `D-114`:** אחרי merge + deploy — הרצה אחת של `overlay.spec` מול production (5 מכשירים) ירוקה. ⛔ סגירה על preview בלבד.

## Verification
1. מקומי: `probe:eye:overlay` ⇒ BEFORE/MUT-PAD/MUT-IOS אדומים · HEAD ירוק (Chromium).
2. `npm run verify` · `test:registry` · `probe:eye:playbook` נשאר ירוק.
3. PR ⇒ CI: probe (Chromium+WebKit) + prod (5 מכשירים) ירוקים ⇒ merge commit ⇒ רישום ל-main.

## סדר עבודה (§9)
אישור ⇒ `docs/plans/PLAN-2026-10-04-b404-b405-bottom-overlays.md` בקומיט נפרד ⇒ branch מאופס מ-main (ה-PR הקודם מוזג; fast-forward, ⛔ force) ⇒ ביצוע ⇒ PR ⇒ CI ירוק ⇒ merge ⇒ רישום ⇒ דוח אחד.
