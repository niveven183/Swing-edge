# PLAN 2026-08-06 — R: ניקוי וארגון

**סטטוס:** awaiting approval
**HEAD בזמן הכתיבה:** `1063f69`
**Safety gate:** remote `niveven183/Swing-edge` ✅ · `git pull` → Already up to date ✅ · עץ נקי ✅

**עיקרון הגל:** אפס שינוי התנהגות. אין נגיעה ב-`src/**`, `api/**`, workflows, DB, מיילים.

---

## 0. שלוש הנחות בפרומפט שאינן נכונות

כל פריט בשלב 4 נבדק מול הקוד לפני התכנון. שלושה מארבעה **כבר ממומשים**:

| פריט בפרומפט | מצב בפועל | ראיה |
|---|---|---|
| try/catch ל-`rateLimit.js` | **קיים** | `api/_lib/rateLimit.js:47-50` — fail-open, `console.error("[rateLimit] fail-open: …")` |
| timeout ל-`verify-turnstile` | **קיים** | `api/verify-turnstile.js:20-24` — `fetchWithTimeout` עם `AbortController`, 8000ms |
| צעד דיסקורד ל-`arch-auditor.yml` | **קיים** | `.github/workflows/arch-auditor.yml` — step `Report to Discord`, `continue-on-error: true`, בדיקת webhook ריק |
| `npm audit fix` | **הפריט היחיד שנותר** | ראה §4 |

**החלטה:** לא נוגעים בשלושת הראשונים. אין מה לתקן. הטענה בפרומפט ש-`arch-auditor.yml` הוא
"ה-workflow היחיד בלי דיווח" שגויה — הוא אחד מ-14 ה-workflows שכן מדווחים לדיסקורד.

---

## 1. טבלת התלויות (השלב החוסם)

grep על כל הריפו: `.github/workflows/** · scripts/** · package.json · vercel.json ·
playwright*.config.js · *.md · api/**` (למעט `node_modules/`, `dist/`, `.git/`, `playwright-report/`).

### 1.1 קוד יתום

| נתיב | מי מפנה אליו | האם ההפניה תישבר |
|---|---|---|
| `agents/` (`_base.py`, `__init__.py`) | `README.md:35` · `CONTEXT.md:530` · `HIVE_ARCHITECTURE.md:15,98` | טקסט ב-docs בלבד — מתוקן באותו קומיט |
| `core/` (`supervisor.py`, `constants.py`, `__init__.py`) | `README.md:35` · `CONTEXT.md:530` · `HIVE_ARCHITECTURE.md:19,33,52` | טקסט ב-docs בלבד — מתוקן באותו קומיט |
| `HIVE_ARCHITECTURE.md` | `README.md:34` — **קישור markdown אמיתי** · `docs/STATE.md:99` | ✅ כן — מתוקן באותו קומיט |

**אימות "אפס מייבאים" (בוצע מחדש, לא מהזיכרון):**

- `grep -rn "from ['\"].*agents/\|require(.*agents/" src/ api/ *.jsx *.js` → **0 תוצאות**
- `find . -name "*.py" -not -path "./node_modules/*"` → **בדיוק 5 קבצים** — אותם agents/ + core/
- `grep -rn "python\|\.py\b\|agents/\|core/supervisor" .github/ scripts/ package.json vercel.json playwright*.config.js api/`
  → תוצאה יחידה: `email-campaign.yml:284,350` — heredoc שמייצר `send.py` בזמן ריצה. **לא קשור.**
- כל ההתאמות ל-`core/` ב-`CONTEXT.md` (שורות 30, 311-316) הן `src/intelligence/core/` — **מודול JS חי.** לא נוגעים.
- `docs/AGENTS-BLUEPRINT.md:17` מכיל `deploys/agents/growth` — התאמת מחרוזת מקרית, לא הפניה.

### 1.2 דוחות ב-`docs/`

| קובץ | מי מפנה אליו | האם ההפניה תישבר |
|---|---|---|
| `SENTINEL-S2-DIAGNOSIS-2026-07-25.md` | `docs/plans/PLAN-2026-07-26-sentinel-s2-spec.md:6` — **קישור markdown יחסי `../`** | ✅ כן |
| `AGENTS-AUDIT-2026-07-19.md` | `docs/AGENTS-BLUEPRINT.md:21` | טקסט בסוגריים |
| `DEEP-AUDIT-2026-07-17.md` | `CONTEXT.md:623` | טקסט ב-backticks |
| `IMPORT-SPEC-2026-07-18.md` | `CONTEXT.md:630` | טקסט ב-backticks |
| `MOBILE-UX-AUDIT-2026-07-15.md` | `CONTEXT.md:596` | טקסט ב-backticks |
| `ONBOARDING-COACH-AUDIT-2026-07-13.md` | `CONTEXT.md:589` | טקסט ב-backticks |
| `HEALTH-FLAPPING-DIAGNOSIS.md` | `docs/INCIDENTS.md:75` | טקסט ב-backticks |
| `AGENTS-BLUEPRINT.md` | — | ❌ אפס מפנים |
| `KNOWLEDGE-AUDIT-2026-07-16.md` | — | ❌ אפס מפנים |
| `QA-AUDIT-2026-07-13.md` | — | ❌ אפס מפנים |

**סה"כ 8 שורות מפנות** (7 קבצים; `AGENTS-BLUEPRINT.md` גם זז וגם מפנה).

---

## 2. ⛔ הכרעה נדרשת #1 — היקף שלב 3

הכלל בפרומפט: *"נתיב עם ולו מפנה אחד שיישבר — לא זז בגל הזה."*

קריאה מילולית → **7 מתוך 10 לא זזים**, ונשארים בשורש `docs/` בגלל אזכורי טקסט במסמכים.
הדפוס `docs/audits/` נשאר לא-אכוף — וזו בדיוק התקלה שהמשימה באה לתקן.

| אפשרות | מה קורה | תוצאה |
|---|---|---|
| **א׳ — מילולי** | זזים רק 3 חסרי-המפנים (`AGENTS-BLUEPRINT`, `KNOWLEDGE-AUDIT`, `QA-AUDIT`) | בטוח. `docs/` נשאר מעורבב, הדפוס עדיין לא נאכף |
| **ב׳ — מומלץ** | זזים כל 10, **ו-8 שורות המפנים מתעדכנות באותו קומיט** | `docs/` נקי, אפס קישורים מתים |

**נימוק להמלצה ב׳:** מפנה שמתוקן באותו קומיט אינו מפנה ש**נשבר**. זו בדיוק התבנית שהפרומפט
עצמו מורה עליה בשלב 2 (*"⚠️ עדכן את README ו-CONTEXT באותו קומיט — אחרת נשארות הפניות מתות"*).
מטרת השער היא למנוע קישורים מתים, לא למנוע הזזה.
מבחן מטרת-העל (CLAUDE.md §3): א׳ משאיר את העבודה חצי-גמורה ומחייב גל שני — כלומר מוסיף עבודה.

**⛔ לא אעקוף את השער בלי הכרעה מפורשת ממך.**

---

## 3. שלב 2 — יתומים: הכרעה ונימוק

| פריט | הכרעה | נימוק |
|---|---|---|
| `agents/` + `core/` (5 קבצי Python) | **מחיקה** | קוד מת בשפה שאינה בריפו הוא מלכודת: קורא עתידי, או agent ביקורת אוטומטי, מתייחס אליו כמשטח חי ומבזבז עליו עבודה. שחזור מלא: `git show 1063f69:core/supervisor.py` |
| `HIVE_ARCHITECTURE.md` | **`docs/archive/`** | קוד מת מטעה כי הוא *נראה* רץ; מסמך עיצוב מתוארך הוא **רשומה**, לא משטח. זול לשמור וקריא בלי ארכיאולוגיית git |

הפיצול אינו חוסר-עקביות: המבחן הוא "האם הדבר הזה נראה כאילו הוא מורץ". קוד — כן. פרוזה — לא.

**עדכונים באותו קומיט (אחרת נשארות הפניות מתות):**

- `README.md:34-35` — הסרת הקישור ל-`HIVE_ARCHITECTURE.md` והאזכור `agents/`, `core/`
- `CONTEXT.md:529-540` — הסעיף `## Hive Agents Context` מצטמצם לשורת מצביע לארכיון.
  ⚠️ שורה 540 (`Constants: VALID_SETUPS (30) · VALID_EMOTIONS (15) · VALID_MARKETS (14)`) מתייחסת
  ל-`core/constants.py`. המקבילות ב-JS מתועדות ב-`CLAUDE.md §13` וב-`src/data/tradeOptions.jsx`.
  השורה **אינה** נמחקת בשקט — היא עוברת לשורת המצביע כדי לא לאבד את המספרים.
- `docs/STATE.md:98-99` — שתי השורות ⏭️ R נסגרות

---

## 4. שלב 4 — `npm audit fix`

`npm audit` בפועל: **4 פגיעויות — 3 high, 1 moderate** (הפרומפט אמר "3 high"; המונה מדויק כאן).

| חבילה | חומרה | advisory | פעולה |
|---|---|---|---|
| `brace-expansion` 4.0.0–5.0.8 | high | GHSA-rgw5-rvv9-x895 (DoS) | `npm audit fix` ✅ |
| `postcss` <=8.5.22 | moderate | GHSA-fxqj-rqcc-2cmp | `npm audit fix` ✅ |
| `react-router` 7.12.0–8.2.0 | high | GHSA-qwww-vcr4-c8h2 | **⛔ עוצר** |
| `react-router-dom` >=7.12.0-pre.0 | high | תלוי בקודם | **⛔ עוצר** |

### ⛔ הכרעה נדרשת #2 — `react-router`

התיקון דורש `--force`, וה"תיקון" הוא **הורדת גרסה**: `react-router-dom@7.18.1` → `7.11.0`.
שבע גרסאות מינור אחורה, מסומן breaking change.

הפגיעות היא **CSRF ב-RSC Mode** — "RSC Mode CSRF Bypass Allows Action Execution Before 400 Response".
האפליקציה היא SPA צד-לקוח טהור:

- `src/main.jsx:3` — `BrowserRouter, Routes, Route, Navigate, useLocation`
- שאר השימושים: `Navigate` · `Link` ×2 · `useNavigate` (`LandingGate`, `ConsentBanner`, `LegalPages`, `LandingPage`)
- **אפס RSC · אפס server actions · אפס data-router actions**

**המסלול הפגיע אינו קיים בקוד.** הורדת גרסה תכניס רגרסיה ודאית כדי לכסות פגיעות שאינה ניתנת להגעה.

**המלצה:** לא להוריד גרסה. לתעד כסיכון מקובל ב-`docs/DECISIONS.md` עם הנימוק לעיל
ועם תנאי ביטול מפורש: *אם וכאשר האפליקציה תאמץ RSC / server actions — הפריט חוזר לשולחן.*

**נדרש אישורך.** בלי אישור — `npm audit fix` ירוץ בכל מקרה על שתי החבילות הראשונות בלבד,
ו-`react-router` יישאר פתוח וירשם ב-STATE כ-⚠️.

---

## 5. שלב 5 — ⛔ חסום, יורד מהגל

`docs/TASKS-REGISTRY.md` **אינו בעץ**:

- `git ls-files | grep -i TASKS` → `SwingEdge-Master-Tasks.md` בלבד (שם אחר, קובץ אחר)
- `git status` נקי — כלומר גם לא קיים כקובץ לא-מנוטר

לפי ההוראה המפורשת (*"אם אינו שם — STOP, אל תיצור אותו בעצמך"*): **הפריט יורד מהגל.**
`SwingEdge-Master-Tasks.md` לא נערך ולא מוזז.

---

## 6. מה נשמר ומה משתנה

### נשמר — אפס נגיעה

- `SwingEdge_App.jsx` (442KB) ו-`src/i18n.js` — **גדולים בכוונה, לא מפוצלים** (החלטה, לא חוב)
- כל `src/**` · כל `api/**` · `.github/workflows/**` · `scripts/**`
- `package.json`, `vercel.json`, `playwright*.config.js`, `vite.config.js`, `tailwind.config.js`
- אפס מיגרציות · אפס שינוי DB · אפס מיילים · אפס סודות
- `SwingEdge-Master-Tasks.md` · `HANDOFF_2026-07-25.md` (ב-`.gitignore`, אינו מנוטר — לא נגענו)
- 10 מסמכי הקבע בשורש `docs/`: STATE · DECISIONS · INCIDENTS · RUNBOOK · ARCHITECTURE ·
  TRUTH · AGENTS · MASTER_PLAN · LEGAL_NOTES · SwingEdge-Terms-Glossary

### משתנה

- **נמחק:** `agents/` (2 קבצים) · `core/` (3 קבצים)
- **מוזז:** `HIVE_ARCHITECTURE.md` → `docs/archive/` · 10 (או 3, לפי ההכרעה) דוחות → `docs/audits/`
- **נערך:** `README.md` · `CONTEXT.md` · `docs/INCIDENTS.md` · `docs/AGENTS-BLUEPRINT.md` ·
  `docs/plans/PLAN-2026-07-26-sentinel-s2-spec.md` — **שורות מפנים בלבד, אפס שינוי תוכן**
- **lockfile:** `package-lock.json` (+`package.json` אם `postcss` ייבנה מחדש)
- `docs/STATE.md` · `docs/DECISIONS.md`

---

## 7. פיצול קומיטים ונימוק

| # | קומיט | תוכן | למה נפרד |
|---|---|---|---|
| 1 | `chore(cleanup): הסרת agents/ ו-core/ — קוד Python מת בריפו React` | מחיקת 5 קבצי py · `HIVE_ARCHITECTURE.md` → `docs/archive/` · README · CONTEXT · STATE · שורת DECISIONS | מחיקת קוד היא הפעולה היחידה בגל שאינה הפיכה ב-`git mv`. קומיט נפרד = `revert` נקי בפקודה אחת |
| 2 | `docs(organize): דוחות חד-פעמיים → docs/audits/` | `git mv` בלבד · 8 שורות מפנים · STATE | הזזות טהורות. `git mv` שומר היסטוריה. ערבוב עם מחיקה היה מסתיר איזה שינוי שבר מה |
| 3 | `chore(deps): npm audit fix — brace-expansion + postcss` | `package-lock.json` בלבד · STATE | השינוי היחיד שנוגע בעץ התלויות. מבודד כדי ש-`git bisect` יצביע עליו ישירות אם משהו נשבר בבנייה |

כל קומיט נושא את דלתת ה-`STATE.md` שלו — CLAUDE.md §10.1, "אין פריט יתום".
שורת `DECISIONS.md` אחת בקומיט 1 (המחיקה + הנימוק + פקודת השחזור), ואם תאושר ההמלצה —
שורה שנייה ל-`react-router` כסיכון מקובל.

**לפני push:** `npm run verify` מלא, **פלט מודבק בשלמותו** בדיווח. בלי force. בלי `--no-verify`.

---

## 8. ניתוח השלכות (CLAUDE.md §8)

**רמה 1 — פילטר:** משנה DB? ❌ · נוגע בכסף/מיילים? ❌ · מוסיף סוד? ❌ ·
רץ אוטומטית בפרודקשן? ❌ · בלתי הפיך? ⚠️ **כן** — מחיקת קבצים.

הפילטר תפס פריט אחד. רמה 2 מצומצמת לציר הרלוונטי:

| ציר | הערכה |
|---|---|
| הפיכות | מחיקה הפיכה ב-`git show 1063f69:<path>` או `git revert` על קומיט 1. הקבצים בהיסטוריה לנצח |
| כשל שקט | הסיכון היחיד: קישור מת ב-docs. נסגר על ידי כך שכל 8 המפנים מתעדכנים באותו קומיט, ובאימות grep חוזר אחרי ההזזה |
| בנייה | `npm audit fix` נוגע ב-`postcss` — חלק משרשרת הבנייה. `npm run verify` (כולל `build`) הוא השער |
| תחזוקה (§3) | מקטין עבודה ידנית: `docs/` שאפשר לסרוק, בלי 5 קבצי py שכל agent ביקורת מנתח מחדש בכל שבוע |

**פסק דין:** ✅ בצע — בכפוף לשתי ההכרעות ב-§2 ו-§4.

---

## 9. שתי שאלות פתוחות — נדרשת תשובה לפני ביצוע

1. **§2 — היקף שלב 3:** אפשרות א׳ (3 קבצים זזים) או ב׳ (10 זזים + 8 מפנים מתוקנים)?
2. **§4 — `react-router`:** אישור להשאיר בגרסה 7.18.1 ולתעד כסיכון מקובל, במקום להוריד ל-7.11.0?

לאחר מכן: `npm run verify` מלא · STATE + DECISIONS · בלי force · דיווח עם hashes.
