# PLAN-2026-10-28-wave1-security-money — גל 1/7 «אבטחה וכסף» (F1–F5)

**רמה: T3 · תשובות: לא/כן/כן/כן/כן.** בסיס: `3de334d` (אבחון `docs/audits/WAVE1-DIAGNOSIS-2026-10-28.md`, אושר ע״י ניב 28.10 עם 5 הכרעות).

## Context

האבחון שחזר 5/5 ממצאים על `9f47d5f`: XSS בייצוא ה-PDF שקורא טוקן מ-`localStorage` (F1), שבועי/חודשי מציגים `₪300` במקום `₪570` (F2),
`refresh_token`/`access_token` נשלחים ל-Sentry ב-transaction וב-event בזמן טעינה (F3), `0/7` כשלי כתיבה מגיעים לטלמטריה (F4),
`84` רינדורי-שורש בדקה ב-idle (F5). ניב הכריע: F2 כולל את `MonthlyReport.js`; F4 עם `status`/`code` דרך `tradeWrite.js`; F5 יעד `≤ 20/60שנ׳`.

## §8 רמה 2

| ציר | הערכה |
|-----|--------|
| משתמשים | כל משתמש: ייצוא PDF בטוח · ₪ עם עסקאות $ רואים סכום מומר + שורת «אין שער ל-N מתוך M» · אפס שינוי UX ב-F3/F4/F5 (מלבד הנקודות שהופכות ל-CSS — מראה זהה) |
| נתונים | ⛔ DB · ⛔ מיגרציה · ⛔ שינוי סכימה. הכל בזמן קריאה |
| עלות | Sentry: +אירוע לכל כשל כתיבה (נדיר) · Actions: job hermetic אחד חדש ב-`eye-playbook.yml` (~10 דק׳) |
| אבטחה | סוגר XSS + דליפת טוקנים. ⛔ סוד חדש. ⛔ `err.message`/`details`/`hint` לעולם לא נשלחים |
| הפיכות | `git revert` של ה-merge commit ⇒ פריסה תוך ~3 דק׳ |
| כשל שקט | scrub שמפספס שדה ⇒ נתפס ב-probe (0 מופעים בכל envelope) · סינון חודשי שנשבר ⇒ ערך-זהב ב-`test:engine` |

**פסק דין: ⚠️ בצע עם הגנה** — PR אחד, commit לכל ממצא, red-before + מוטנט לכל אחד.

## ממצא חדש מהתכנון (נכנס לגל — אושר ע״י ניב 28.10, יחד עם `reason` ושלושת התיקונים ①②③)

**G-crumb:** ה-SDK רושם כל `console.error` כ-breadcrumb. `console.error("Supabase insert failed:", res.reason, res.message)` (7 אתרים, נשארים לפי ההכרעה)
⇒ הודעת PG («Failing row contains (…)») נוסעת על **כל** event הבא. ⇒ ב-`beforeBreadcrumb`: breadcrumb מסוג `console` שומר את **הארגומנט הראשון בלבד**
ומוחק `data.arguments`; ו-`beforeSend` מוחק `breadcrumbs` מאירועי `kind: write_failure | settings_read_failure`. הבדיקה של ניב («message עם מחיר ⛔ מגיע ל-transport») תופסת את זה.

## Branch · commits

`feat/wave1-security-money` מ-`main`. commit לכל ממצא, בסדר: F3 → F4 → F1 → F2 → F5 → probe/spec → registry. PR → CI → **merge commit** (⛔ squash) → deploy → eye ב-prod → commit סגירה.

## F1 · escape בייצוא ה-PDF

- **חדש** `src/lib/escapeHtml.js` — `escapeHtml(v)`: `null/undefined → ""`, `String(v)`, החלפת `& < > " '` (`&` ראשון).
- `SwingEdge_App.jsx` `exportMonthlyPDF` (`:484`): `esc()` על **כל** ערך-מחרוזת בתבנית — `t.date`·`t.ticker`·`t.side`·`t.setup`·`l.ticker`·`l.lesson`·`monthName`·`equityIncomplete`·`currency`. מספרים ופלט `fmt*` נשארים. ⛔ החלפת מנגנון.
- `scripts/arch-auditor.mjs` (~15 שורות, ⇒ באותו PR לפי ההכרעה <30): בדיקת `SECURITY` חדשה ל-`document.write(`·`insertAdjacentHTML(`·`.innerHTML =`/`.outerHTML =`; פטור: הקצאת `""` ו-`JSON.stringify(` לתוך `<script>`; קובץ שמייבא `escapeHtml` מסומן «מסונן». אתר יחיד שנשאר (`:718`) מסונן ⇒ ⛔ ממצא.
- **בדיקות:** `test:format` — ערכי `escapeHtml` (5 תווים, `null`, מספר, payload מלא) + צורה: כל `${t.`/`${l.` בגוף `exportMonthlyPDF` עטוף `esc(` (חילוץ-עוגן, כשל חילוץ = אדום). `test:arch` — 3 מקרים חדשים (document.write ⇒ ממצא · `innerHTML = ""` ⇒ ⛔ · עם escapeHtml ⇒ ⛔).
- **red-before/מוטנט:** scene `F1` ב-`tests-eye/wave1.spec.js` (למטה): `lessonLearned=<img src=x onerror=window.__xss=1>` + payload ב-`setup` ⇒ HEAD: `popup.__xss` undefined, `0` `<img>`, הטקסט מוצג מילולית. BEFORE (`9f47d5f`) אדום · MUT-F1 (הסרת `esc` מ-`l.lesson`) אדום.

## F2 · המרה בשבועי ובחודשי

- `SwingEdge_App.jsx:8237/:8250`: `calcMetrics={stableCalcTradeMetrics}` לשתי הקומפוננטות.
- `src/components/WeeklyReviewTab.jsx:63`: `useTradingStats(weekly, capital, calcMetrics, currency)` + היפוך הערה `:59-62` (B-144). שורת גילוי מתחת לסכום כש-`wStats.fxUnconvertedCount > 0`, דרך המפתח **הקיים** `t.unconvertedClosedWarn` («אין שער ל-{n} מתוך {m} עסקאות סגורות», קיים ב-5 שפות ⇒ ⛔ מחרוזת חדשה). `n = fxUnconvertedCount`, `m = fxUnconvertedCount + fxAggregatableCount`. כולם מוחרגים ⇒ `—` במקום `₪0`.
- `src/intelligence/core/MonthlyReport.js` — **אותה חלוקה בדיוק כמו `computeTradingStats` (`tradingStats.js:66-97`)**: `enrich` נושא `fxUnconverted`; ספירות/שיעורים/R על **כל** העסקאות; כל סכום כסף (`summarize.net` · `groupBy.net` · `dailyMap` · `bestTrade`/`worstTrade` · `vsLastMonth.netPnL` · `findBestMonth`) על הקבוצה המומרת בלבד. `summary` מקבל `fxUnconvertedCount`/`fxAggregatableCount` (גם בענף `< 5` עסקאות).
- `src/components/MonthlyReportTab.jsx`: שורת גילוי זהה מתחת ל-`mr_netPnL` כש-`summary.fxUnconvertedCount > 0`.
- **בדיקות:** `test:engine` — ערכי-זהב `generateMonthlyReport`: עם שער `netPnL = 570`, `fxUnconvertedCount = 0`; בלי שער `netPnL = 200`, `fxUnconvertedCount = 1`, `fxAggregatableCount = 1`, `winRate` על `2/2`. `test:instrument` — אותם זהבים ל-`computeTradingStats` של השבועי + **הרחבת שער B-144**: סריקת `src/components/**/*.jsx` — כל `useTradingStats(` מחוץ ל-`SwingEdge_App.jsx` מצהיר יחידה ⛔ `null`, ושני אתרי ה-prop ב-`SwingEdge_App.jsx` (`MonthlyReportTab`/`WeeklyReviewTab`) מוסרים `stableCalcTradeMetrics`. `test:coach` לפני+אחרי.
- **red-before/מוטנטים:** BEFORE אדום בשני הזהבים (570 ו-200) · MUT-F2a (החזרת `calcTradeMetrics` לשבועי) ⇒ שער B-144 אדום · MUT-F2b (הסרת הסינון מ-`summarize`) ⇒ `test:engine` אדום (300≠200) · MUT-F2c (החזרת `calcTradeMetrics` לחודשי) ⇒ אדום. ב-spec: חשבון ILS, `/api/fx` מדומה `3.7` ⇒ `₪570` בשבועי ובחודשי = אותו מספר בטאב הניתוח; `/api/fx` 503 ⇒ `₪200` + «אין שער ל-1 מתוך 2».

## F3 · scrub ל-Sentry

- **חדש** `src/lib/sentryScrub.js`: `scrubUrl(s)` — `access_token`·`refresh_token`·`provider_token`·`code`·`token_hash`·`type` מוחלפים ב-`[Filtered]` **רק כפרמטרי query או fragment בתוך מחרוזת URL** (`[?#&]name=…`). חיתוך `#…` **רק** במחרוזת שמתחילה ב-`http(s)://` או ב-`/`, או שמכילה אחד ממפתחות הטוקן. `scrubEvent(e)` — הליכה עמוקה על **ערכי** מחרוזת (כולל `request.url`·`contexts.trace.data["url.full"]`·`spans[].description`·`spans[].data`·`transaction`·`breadcrumbs[].data.from/to/url`). ⛔ **אינו מסנן לפי שם מפתח באובייקט** ⇒ `tags.code` של F4 שורד (תיקון ניב ①). `scrubBreadcrumb(b)` — scrub + כלל `console` (G-crumb).
- `src/main.jsx`: `beforeSend`·`beforeSendTransaction`·`beforeBreadcrumb` קוראים למודול. **הסרת** `replaysOnErrorSampleRate`.
- **בדיקות:** `test:analytics` — 5 URL-ים אמיתיים של Supabase (implicit/recovery/magiclink/PKCE/`token_hash`) + אירוע/transaction/breadcrumb מדומים ⇒ `0` מופעים; צורה: שלושת ה-hooks ב-`main.jsx`, ⛔ `replaysOnErrorSampleRate`. `test:analytics` לפני+אחרי (main.jsx).
  **(תיקון ①)** אירוע `write_failure` עם `tags.code = "23514"` ו-`request.url` עם `?code=abc` ⇒ אחרי scrub: `tags.code === "23514"` ו-`request.url` מכיל `code=[Filtered]`. מוטנט: scrub שמסנן לפי שם מפתח ⇒ אדום.
  **(תיקון ②)** `"Trade #3 failed"` ו-`"rank #1"` ⇒ ללא שינוי (byte-identical).
- **red-before/מוטנט:** `scripts/sentry-scrub-probe.mjs` (`probe:sentry`, ⛔ בשרשרת — דפדפן אמיתי): מעבר של ה-repro מהאבחון (build אמיתי + ingest מדומה + hash של recovery). HEAD: `0` מופעים של `access_token`/`refresh_token`/`RTSECRET` בכל envelope · BEFORE (`9f47d5f`) ≥ 1 · MUT-F3 (`beforeSend`/`beforeSendTransaction` מחזירים event כמו שהוא) אדום.
- **INCIDENTS#40** בכל מקרה: «דליפה מאומתת ב-build, היקף בפרודקשן לפי בדיקת ניב (Data Scrubbing הופעל 28.10)».

## F4 · טלמטריית כשלי כתיבה

- `src/lib/tradeWrite.js` `classifyRows`/`settle`: שדות **additive** `status` (`res.status ?? null`) ו-`code` (`error.code ?? null`). ⛔ שינוי ב-`ok`/`reason`/`message`/`rows`.
- **חדש** `src/lib/telemetry.js`: `reportWriteFailure(op, res)` ⇒ `Sentry.captureException(new Error("trade_write_failed"), { tags: { kind: "write_failure", op, table: "trades", status, code, reason }, fingerprint: ["trade_write_failed", op, String(code)] })`. ⛔ `message`/`details`/`hint`/payload. `reportSettingsReadFailure(err)` ⇒ `captureMessage("settings_read_failed", { tags: { kind, status, code } })`.
  `reason` (אושר ע״י ניב): **enum סגור** המיוצא מ-`tradeWrite.js` בלבד (`WRITE_REASONS` — רשימה מפורשת בקוד: `error`·`threw`·`none`·`partial`·`too-many`·`unconfigured` + ה-`noneReason` שהאתרים מוסרים). כל ערך אחר ⇒ `"other"` (תיקון ③).
- 7 אתרי `SwingEdge_App.jsx` (`:3300`·`:3357`·`:3399`·`:3456`·`:3495`·`:3549`·`:3598`): `reportWriteFailure(op, res)` ליד ה-`console.error` הקיים. ⛔ toast חדש, ⛔ שינוי UX.
- `src/lib/userSettings.js` `loadFailed` (`:394`): `reportSettingsReadFailure(err)` — side-effect בלבד. ⛔ retry, ⛔ `writable`/`lastSent`/`lastToken`/CAS/pending/journal.
- **בדיקות:** `test:write` — `status`/`code` נישאים בערך; `reportWriteFailure` עם capture מוזרק ⇒ tags בדיוק `{kind,op,table,status,code,reason}`, ⛔ `message` (payload עם `187.45` + `AAPL` ⇒ ⛔ בשום שדה); `reason` עם טקסט חופשי שמכיל `"AAPL"` ⇒ נשלח `"other"` (תיקון ③); צורה: 7/7 אתרים קוראים ל-helper. `test:settings` + `test:hydration` לפני+אחרי; `test:settings` — `loadFailed` קורא ל-reporter עם tags בלבד.
- **red-before/מוטנט:** scene `F4` ב-spec: `POST /rest/v1/trades` ⇒ 500 עם `message: "Failing row contains (AAPL, 187.45)"`, `code: "23514"` ⇒ ingest מדומה קיבל event עם `op=insert`·`status=500`·`code=23514`, ו-`187.45`/`AAPL`/`Failing row` ⛔ בשום envelope. MUT-F4 (הסרת הקריאה) ⇒ אדום.

## F5 · טיימרים → CSS

- `SwingEdge_App.jsx`: הסרת `tickerIdx` (`:1625`) + interval (`:2988`); הסרת `pulse` (`:1624`) + interval (`:2993`).
- `src/index.css`: שתי אנימציות, תקופה `3s` (= 2×1500ms), `step-end` למראה הנוכחי (הבהוב חד):
  `.se-pulse-opacity` (`1 ↔ 0.55`) — מוחל רק כש-`marketState === OPEN` ב-`:4610` וב-`:8962`; סגור ⇒ `opacity:0.85` סטטי כמו היום.
  `.se-pulse-emerald` (`#34d399 ↔ #047857`, עם מעבר 150ms כמו `transition-colors` היום) — `:7394`, בכל מצב שוק כמו היום.
  `@media (prefers-reduced-motion: reduce)`: `animation: none` (פתוח ⇒ `opacity:1`, ירוק ⇒ `#34d399`).
- **בדיקות:** חוליה חדשה **`test:perf`** (`scripts/render-budget-test.mjs`): ⛔ `tickerIdx` · ⛔ `setPulse` · ⛔ `pulse ?` · 3/3 צרכנים נושאים את המחלקות · כלל reduced-motion קיים. ⇒ השרשרת `33 → 34` + פרוזת `CLAUDE.md` §7 באותו commit (`test:registry` §14.3).
- **red-before/מוטנט:** `scripts/render-count-probe.mjs` (`probe:renders`): ה-hook המדומה מהאבחון. HEAD `≤ 20/60שנ׳` · BEFORE `84/60שנ׳` · MUT-F5 (החזרת interval של `setPulse`) `> 20` ⇒ אדום. + זרועות פירוק ל-18 הנותרים (כיבוי כל אחד מ-`:2319`·`:2351`·`:2412`·`:2761`) ⇒ שורת `B-` עם פירוק לפי מקור.
  **צילום לפני/אחרי של 3 הנקודות** ב-iPhone 14 + 1440, שעון מדומה (`page.clock`) לשוק פתוח ולשוק סגור, שני שלבי ההבהוב; + reduced-motion ⇒ `getComputedStyle().animationName === "none"`.

## spec ו-CI

- **חדש** `tests-eye/wave1.spec.js` — scenes F1/F2/F4/F5 + F3 (ingest מנותב ב-`ctx.route` ⇒ **⛔ מועבר ל-Sentry האמיתי**), he + en. בפרודקשן: auth אמיתי של QA ו-`answerRest` מקומי (כמו `firstrun.spec.js`) ⇒ שורת ה-QA ⛔ נקראת ⛔ נכתבת.
- `playwright.eye.config.js`: `iphone14tall`/`desktop1440` `testMatch` ⇒ `/(firstrun|wave1)\.spec\.js/`.
- **חדש** `scripts/eye-wave1-probe.mjs` (`probe:eye:wave1`) על `scripts/lib/eyeBuild.mjs`: HEAD ירוק · BEFORE (`9f47d5f`) אדום · MUT-F1/F3/F4/F5 אדומים.
- `.github/workflows/eye-playbook.yml`: job `probe-wave1` (תבנית `probe-firstrun`). ⛔ נכנס ל-`prod.needs` (`workflow-gate-test` G2/G3 נשארים ירוקים).

## רישום (§10/§14)

- `B-456` F1 · `B-457` F2 · `B-458` F3 · `B-459` F4 · `B-460` F5 · `B-461` arch-auditor עיוור (נסגר ב-PR) · `B-462` 18 רינדורים/דקה עם פירוק · `B-463` TradingView `chartSymbol` עם `</script>` ⛔ נבדק (BACKLOG, נימוק: raw-text, ⛔ HTML) · `B-464` `MonthlyReport.js:47` `: 0` על `pnl` חסר (`R-2`, מחוץ לגל).
- `B-455`: «נוספה טלמטריה (`settings_read_failed`), retry ממתין למדידה».
- DECISIONS: «escape חובה לכל HTML שנבנה ממחרוזת עם קלט משתמש» · «כל כשל כתיבה מדווח ל-Sentry עם tags בלבד» · «console breadcrumb = ארגומנט ראשון בלבד».
- `INCIDENTS#40` (F3) · `TRUTH.md` (שבועי/חודשי מומרים + גילוי) · `CHECKS` `C-076` (3 הנקודות + שורת הגילוי) **לפני** הסגירה · STATE/NEXT · HANDOFF מקומי (⛔ קומיט).
- `CLAUDE.md` §7: מניות assertions של החוליות שזזו (write · analytics · arch · format · engine · instrument · settings · `test:perf` חדש) ⇒ `B-257` נשאר פתוח.
- סגירה: `DONE` + `D-` לכל `B-` עם run id **בקומיט הבא** (§14 — קומיט ⛔ נושא את ה-hash של עצמו).

## Verification

1. לפני כל נגיעה: `test:coach` · `test:write` · `test:analytics` · `test:settings` · `test:hydration` · `test:engine` · `test:instrument` (בסיס).
2. אחרי כל commit: החוליה של הממצא, פלט מלא.
3. `npm run probe:sentry` · `probe:renders` · `probe:eye:wave1` — HEAD/BEFORE/מוטנטים, פלט מלא.
4. `npm run verify` (34 חוליות + build) **bare**, `; echo "EXIT=$?"` · `test:registry` · כל ה-probes הקיימים (`probe:eye:*` · `probe:pending` · `probe:cents:mutants` · `probe:boundary`). ⛔ הרחבת timeout/סף.
5. PR → CI ירוק על כל SHA → merge commit → deploy → `eye-playbook` prod job (QA, iPhone 14 · Pixel 7 · 1440, he+en) ⇒ run id.
6. Report: hash · טבלת F1–F5 (שוחזר · BEFORE · HEAD · מוטנט) · רינדורים לדקה · רשימת sinks · «סיימתי» עם `..HEAD -> main`.

## ⛔ אסור (מהפרומפט)
DB/מיגרציות/סודות/env · הידרציה/CAS/pending/journal/`capitalGate`/מחרוזות load-bearing · החלפת מנגנון ה-PDF · שינוי לוגיקת הסקירה מעבר להמרה · עיצוב · force-push/squash.
