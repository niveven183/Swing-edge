# PLAN — Sentinel S2: שכבת QA מחוברת (יישום spec + חיווט)

- **תאריך**: 2026-07-26
- **סטטוס**: ממתין לאישור (הקומיט הזה אינו אישור לביצוע)
- **קבצים שייגעו**: `tests-sentinel/sentinel-auth.spec.js` (חדש) · `.github/workflows/sentinel.yml`
- **מקור אמת**: [docs/SENTINEL-S2-DIAGNOSIS-2026-07-25.md](../SENTINEL-S2-DIAGNOSIS-2026-07-25.md) (S2 שלב 1/2)

## Context

Sentinel היום בודק רק את המשטח האנונימי (`sentinel-public.spec.js`: דף הבית + מסך ה-auth).
כל באג שקורה **אחרי** לוגין — כמו קריסת `fmtR` על עסקה סגורה ללא stop — לא נתפס בכלל.
S2 סוגר את הפער: spec שני שמתחבר בחשבון QA ייעודי, מאמת hydration אמיתי מה-DB,
מרנדר את היומן, יוצר ומוחק עסקת בדיקה (`SNTNL`), ומנקה אחרי עצמו ב-REST גם אם קרס באמצע.

**שני ממצאים בקוד החי סותרים את האבחון** — הסלקטורים נכתבים לפי הקוד, והסתירות יתועדו בגוף ה-commit
(הוחלט: לא לערוך את קובץ האבחון):

| האבחון אומר | הקוד החי |
|---|---|
| כפתור שמירה `"→ Log Trade"` | `Log Trade →` (`SwingEdge_App.jsx:6485`, אנגלית קשיחה, לא i18n) → locator: `/Log Trade/` |
| "אין שדה notes חופשי בטופס" | `#log-notes` קיים (`:6455`, מאחורי מקטע מתקדם) — **לא ייכנס ל-spec בשום צורה**; האבחון החי קבע שהוא לא בטופס, ואסטרטגיית `SNTNL` לא צריכה אותו |

**שתי מלכודות שהאבחון לא תיעד** (נמצאו בקוד, שתיהן היו מפילות את הריצה):
1. `[data-tour="add-trade"]` מופיע **פעמיים** — ה-FAB הגלובלי (`:6669`) ועוד כפתור במצב יומן ריק (`:3744`). `MOCK_TRADES = []` (`:113`), כלומר לפני hydration היומן ריק והכפתור השני **כן** מרונדר → strict-mode violation. פתרון: `.last()` (ה-FAB תמיד אחרון ב-DOM).
2. ה-FAB מקבל `opacity-0 pointer-events-none` כשגוללים למטה (`fabVisible`, `:1055`,`:6671`) → קליק ייתקע. פתרון: `window.scrollTo(0,0)` לפני הפתיחה. ההגנה העיקרית היא ה-hydration gate (שלב 2) — הוא חייב לעבור לפני כל אינטראקציה.

---

## קובץ 1 (חדש): `tests-sentinel/sentinel-auth.spec.js`

מבנה זהה ל-`tests-sentinel/sentinel-public.spec.js`: אותו חוזה `add()` בן 9 שדות
(`component, fp, severity, emoji, checked, got, reason, fix, risk`), אותו `cleanUrl`/`ignored`, אפס hard-fail.
נאסף ב-`playwright.sentinel.config.js` אוטומטית (`testDir: ./tests-sentinel`, `workers: 1` → רץ אחרי הציבורי).

**קונפיגורציה**
- `OUTPUT = process.env.BROWSER_FINDINGS_AUTH || 'browser-findings-auth.json'` — קובץ נפרד, לא דורס.
- `SUPA_URL = SUPABASE_URL || VITE_SUPABASE_URL`, `SUPA_KEY = SUPABASE_ANON_KEY || VITE_SUPABASE_ANON_KEY`
  (קונבנציית `api/health.js:36`).
- `test.skip(process.env.SENTINEL_AUTH !== '1', ...)` בראש הקובץ → בריצה ציבורית שום דבר לא רץ ולא נכתב קובץ.
- חסרים `SENTINEL_QA_EMAIL`/`PASSWORD` → מבחן בודד שכותב 🟡 `browser-auth|secrets-missing` ויוצא (ה-`afterAll` כן כותב את הקובץ).

**`watch(page)`** — כמו הציבורי + חוסם לפי **מקור**: מתעלם מ-`console.error` ש-`msg.location().url` שלו מכיל
`assets/sentry-` (מלכודת 2 באבחון: טקסט ההודעה "Cannot listen to the event…" לא מכיל "sentry", ולכן `IGNORE_SUBSTR` הקיים לא חוסם).

**מבחן אחד רציף** (`authenticated journey`) — לא 7 מבחנים, כי Playwright פותח context חדש לכל מבחן והלוגין היה נשרף 7 פעמים.
כל שלב ב-`try` נפרד: כשל → finding והמשך.
`test.setTimeout(180_000)` בתוך ה-spec — **חריגה מודעת מהבריף**: הקונפיג לא נוגע (60s הוא per-test), אבל מסע רציף של 7 שלבים
שבו כל שלב כושל בולע עד 15s (actionTimeout) חייב יותר מ-60s, אחרת timeout חותך ממצאים.

| # | שלב | סלקטורים (מהקוד החי) | כשל → finding |
|---|---|---|---|
| 1 | login | `input[type="email"]` · `input[autocomplete="current-password"]` · `button[type="submit"]` → הצלחה = `[data-tour-tab="dashboard"]` נראה | 🔴 `browser-auth\|login-failed` |
| 2 | hydration gate | `span` שמכיל `/(הון התחלתי\|starting capital)\s*\$/` (`:4592`, דו-לשוני) → הטקסט חייב להכיל `10,000`. `2,500` = `DEFAULT_CAPITAL` (`src/utils.js:3`) = לא נטען מה-DB. timeout 8s | 🔴 `browser-auth\|hydration-failed` + **עצירה** (שלבים 3-7 מדולגים; אימות מול ברירות מחדל = דיווח שקר) |
| 3 | sweep שרידים | `[data-tour-tab="journal"]` → שורת `SNTNL` קיימת? | 🟠 `browser-auth\|stale-testdata` + מחיקה ב-UI (אותו נתיב כמו שלב 7) |
| 4 | journal render | `table.w-full.text-xs tbody tr` (count ≥ 3) + הטקסטים `AAPL`,`NVDA`,`BTC-USD` קיימים. זו בדיקת `fmtR` החיה — AAPL סגורה ללא stop חייבת להיות שם | 🔴 `browser-auth\|journal-render` |
| 5 | create | `window.scrollTo(0,0)` → קליק על `[data-tour="add-trade"]`**`.last()`** — **רק המסלול של המשתמש, אפס מסלול עוקף** (`setShowForm` ישיר/`page.evaluate` אסורים; המטרה היא לבדוק את הכפתור עצמו) → `#log-ticker=SNTNL`, `#log-entry=100`, `#log-stop=99`, `#log-target=102` (LONG, stop<entry — `validateTradeInputs`) → `getByRole('button',{name:/Log Trade/})`. אישור = שורת `SNTNL` בטבלה (לא toast — הוא נעלם) | 🔴 `browser-auth\|create-failed` |
| 6 | tabs | `[data-tour-tab="analytics"]` → חזרה ל-`dashboard` (3 טאבים, אין Coach) | 🔴 `browser-auth\|tab-switch` |
| 7 | delete | שורת `SNTNL` → `button[title="מחיקה"], button[title="Delete"]` בתוכה → `[role="dialog"]` (overlay של `ConfirmProvider`, `src/components/ToastProvider.jsx:109`) → `getByRole('button',{name:/^(מחק\|Delete)$/})` (cancel = ביטול/Cancel, אין חפיפה) → השורה נעלמה | 🔴 `browser-auth\|delete-failed` |

בסוף: `record()` הופך `pageErrors`/`consoleErrors`/`failedReq` ל-🔴 `browser-auth|pageerror`, 🟠 `browser-auth|console_error`, 🟠 `browser-auth|failed_request`.
`component` בכל הממצאים: `"דפדפן (מחובר)"` — כדי שההודעה ב-Discord תבדיל מהשכבה הציבורית.

**חוק מגן מוחלט**: כל אינטראקציית מחיקה נגזרת מ-
`page.locator('table.w-full.text-xs tbody tr').filter({ hasText: 'SNTNL' })`, ולפני הקליק נאמת `count() === 1`.
אין ולו קליק מחיקה אחד ברמת ה-page. 3 עסקאות הקבע (AAPL/NVDA/BTC-USD) לא נגיעות בשום תרחיש.
(הכרטיסים המובייליים `md:hidden` — 6 כפתורי מחיקה ל-3 שורות — נחתכים ממילא ע"י ה-scope לטבלת הדסקטופ.)

**`afterAll` — ניקוי מובטח** (רץ גם אם המבחן קרס/timeout), ב-`fetch` גלובלי של Node 20:
1. חסרים `SUPA_URL`/`SUPA_KEY` → 🟡 `browser-auth|cleanup-unconfigured` (לקונה בהגדרה, לא תקלת פרודקשן) ודילוג על ניקוי ה-REST בלבד.
2. `POST {SUPA_URL}/auth/v1/token?grant_type=password` (apikey + JSON body) → `access_token`.
3. `DELETE {SUPA_URL}/rest/v1/trades?ticker=eq.SNTNL` · `apikey`, `Authorization: Bearer <token>`, `Prefer: return=representation`.
   ה-RLS (`supabase/migrations/20260708150000_trades_rls_policy.sql`) מבטיח מחיקה של שורות `SNTNL` של חשבון ה-QA בלבד.
4. הוחזרו שורות אף שהמחיקה ב-UI "הצליחה" → 🟠 `browser-auth|ui-delete-incomplete`. ה-REST עצמו נכשל → 🔴 `browser-auth|cleanup-failed` (זבל היה נצבר בפרודקשן כל שעה).
5. כותב `browser-findings-auth.json` ויוצא 0. **אפס טוקנים/סיסמאות ללוג** — רק סטטוסים וספירות.

---

## קובץ 2: `.github/workflows/sentinel.yml`

1. **`workflow_dispatch.inputs.run_auth`** — boolean, `default: true` (ההרצה הידנית הראשונה בודקת את המסלול המלא).
2. **`browser` job**: `timeout-minutes: 8 → 12`, ותוספת `outputs: { auth: "${{ steps.gate.outputs.auth }}" }`.
3. **צעד חדש `gate`** (לפני ריצת Playwright) שכותב ל-`$GITHUB_ENV` **וגם** ל-`$GITHUB_OUTPUT`:
   ```bash
   MIN="$((10#$(date -u +%M)))"
   auth=0
   { [ "$MIN" -ge 45 ] || [ "$MIN" -le 14 ]; } && auth=1     # ריצת ה-:50 בלבד
   [ "$GH_EVENT" = "workflow_dispatch" ] && { auth=0; [ "${RUN_AUTH:-true}" = "true" ] && auth=1; }
   ```
   **החלון 45→14 ולא 45–59** (חריגה מודעת, שומרת על כוונת הבריף): מתזמן GitHub מאחר דרך קבע 5–15 דק', ריצת ה-`:50`
   נוחתת לא פעם אחרי חצות השעה — עם 45–59 שכבת ה-auth הייתה **פשוט לא רצה** בשקט. ריצת ה-`:20` לא יכולה להקדים, ולכן לא נכנסת לחלון.
4. **`env` לצעד ה-Playwright**: `SENTINEL_QA_EMAIL`, `SENTINEL_QA_PASSWORD`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` (מ-`secrets`).
   `SENTINEL_AUTH` כבר זמין דרך `$GITHUB_ENV`.
5. **artifact**: אותו artifact, שני נתיבים — `browser-findings.json` + `browser-findings-auth.json`.
6. **`watch` job**: `AUTH_EXPECTED: ${{ needs.browser.outputs.auth }}` ל-env של "Run public checks", וארגון-מחדש של בלוק המיזוג
   (שורות 383-397) לשלושה קבצים. ההחלטות נכנסות ל-`faults.ndjson` **לפני** האגרגציה, והמיזוג נעשה בפקודה אחת:
   ```bash
   jq -s '[ .[] | if type=="array" then .[] else . end ]' faults.ndjson $BROWSER_FILES > faults.json
   ```
   (שורות ה-NDJSON הן אובייקטים ונשמרות; כל קובץ findings הוא מערך ומשוטח. `jq -s 'add'` היה קורס על ערבוב אובייקט+מערך.)
   הקובץ המחובר חסר ו-`AUTH_EXPECTED=1` → 🟡 `browser-auth|unavailable`. חסר ו-`0` → תקין (`add_summary "דפדפן מחובר" "לא רץ"`).
   `AUTH_EXPECTED` ריק (ה-job קרס) → לא ממציאים fault; ה-🟠 `browser|unavailable` הקיים מכסה.
   ה-fallback במקרה כשל jq יחזור ל-`jq -s '.' faults.ndjson` (ולא ל-`[]`) כדי לא לאבד תקלות אמיתיות.

**לא נוגעים**: שום סעיף אחר ב-workflow, `sentinel-public.spec.js`, `playwright.sentinel.config.js`, ואפס שינויי קוד אפליקציה.

---

## פעולה שדרושה מניב (לא חוסמת)

`SUPABASE_URL` ו-`SUPABASE_ANON_KEY` **אינם** secrets/vars בריפו (יש רק `SUPABASE_DB_URL` — connection string של פוסטגרס, לא REST).
עד שיתווספו, ה-spec מדלג על **ניקוי ה-REST בלבד** (המחיקה ב-UI כן רצה) ומדווח 🟡 `browser-auth|cleanup-unconfigured`.
**סודות מזין ניב בלבד — Claude לא מריץ `gh secret set`.** שני ה-secrets שנדרשים:
- `SUPABASE_URL` — `https://zicstkfkwhzvmdkzpidm.supabase.co` (מזהה הפרויקט מהאבחון, סעיף 8)
- `SUPABASE_ANON_KEY` — ה-anon הפומבי (מופיע ממילא ב-bundle)

ברגע שיוגדרו, הניקוי המובטח נדלק לבד — אפס שינויי קוד. עד אז ההגנה היא sweep השרידים בשלב 3 של הריצה הבאה.

---

## אימות

1. **מסלול הדילוג** (ללא מוטציה): `npx playwright test --config playwright.sentinel.config.js` → הציבורי עובר, שכבת ה-auth מדולגת, `browser-findings-auth.json` לא נוצר.
2. **מסלול מלא** — ⚠️ מבצע מוטציה חיה בחשבון ה-QA בפרודקשן (יוצר ומוחק `SNTNL`); יורץ רק באישור ניב:
   ```
   SENTINEL_AUTH=1 SENTINEL_QA_EMAIL=… SENTINEL_QA_PASSWORD=… \
     npx playwright test --config playwright.sentinel.config.js tests-sentinel/sentinel-auth.spec.js
   ```
   מצפים ל-`[]` (או רק 🟡 `cleanup-unconfigured`) ב-`browser-findings-auth.json`, ולא לטוקן/סיסמה בפלט.
3. **בדיקת שפיות ב-UI** אחרי הריצה: היומן מציג בדיוק 3 עסקאות (AAPL/NVDA/BTC-USD), אין `SNTNL`, ההון `$10,000`.
4. **YAML**: `python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/sentinel.yml'))"` + `jq` על בלוק המיזוג עם קבצי דמה.
5. **אחרי push**: `gh workflow run Sentinel -f run_auth=true` → `gh run watch` → מאמתים ש-`gate` הדפיס `auth: 1`, שה-artifact מכיל שני קבצים, ושהודעת Discord אחת נשלחה.

## סיום המשימה (אחרי אישור)
`git add tests-sentinel/sentinel-auth.spec.js .github/workflows/sentinel.yml` → commit
`feat(sentinel): S2 authenticated QA layer — login, journal, create/delete SNTNL, guaranteed cleanup`
(עם שתי סתירות האבחון ושתי המלכודות בגוף ההודעה) → `git push origin main`.
