# WAVE1-DIAGNOSIS — 2026-10-28 · גל 1/7 «אבטחה וכסף» · שלב A (read-only)

> **רמה: T3 · תשובות: לא/כן/כן/כן/כן** (הפיכות: התיקון עצמו ⛔ בלתי-הפיך — אין DB/מייל; אמון: F2 סכום כספי שגוי;
> אבטחה: F1 XSS + F3 טוקנים לספק שלישי; רוחב: 6+ קבצי קוד; ודאות: כל ממצא היה השערת מחקר).
> **⛔ אפס תיקון בשלב הזה.** כל מספר כאן נמדד על `9f47d5f` (עץ נקי) — פלט מודבק, ⛔ סיכום.

## Safety gate

```
git pull origin main → Already up to date. PULL_EXIT=0
nothing to commit, working tree clean
HEAD 9f47d5feb9343f1031e4367bf8b213bfd02f120c · DESCENDANT_OK · core.hooksPath=.githooks
git worktree list → /Users/nivhareven/Swing-edge 9f47d5f [main]   (worktree אחד)
```

## תקציר — 5/5 שוחזרו, 3 עם פער שמשנה את תכנון התיקון ⇒ **עצירה**

| # | שוחזר? | BEFORE (נמדד) | פער מול הפרומפט | משנה תכנון? |
|---|--------|----------------|------------------|--------------|
| F1 | ✅ | payload רץ; ה-popup באותו origin, קרא טוקן מ-`localStorage` וכתב אותו ל-`window.opener` | אין. וקטור הייבוא: `ticker` עובר רק `toUpperCase` (`normalizeRow.js:161`); `setup`/`lessonLearned` מהייבוא ריקים | ⛔ |
| F2 | ✅ | ₪ + `$100` + `₪200`, שער 3.7 ⇒ מוצג **`₪300`**, ערך-זהב **`₪570`** (שבועי וחודשי) | 🔴 **החודשי ⛔ אינו החלפת prop** — `MonthlyReport.js` (מנוע, `src/intelligence/`) ⛔ מכיר `fxUnconverted` ומסכם עסקה לא-מומרת כאילו הומרה. 🟠 שער `B-144` עיוור ל-`src/components/` | ✅ |
| F3 | ✅ | `refresh_token`+`access_token` ב-`request.url` של **event** בזמן טעינה, וב-`request.url`·`url.full`·`spans[].description` של **transaction** | אין במנגנון. ⚠️ ⛔ נבדק מול פרויקט ה-Sentry בפרודקשן | ⛔ |
| F4 | ✅ חלקית | `0` קריאות `captureException` בלקוח — ניב ⛔ יודע על כשל כתיבה | 🔴 **⛔ שקט למשתמש**: `7/7` האתרים כבר מציגים `toast.error`. 🟠 `tradeWrite.js` זורק את `status`/`code` ⇒ התגים שהפרומפט מבקש ⛔ קיימים בלי לגעת בו | ✅ |
| F5 | ✅ | **84 רינדורי-שורש / 60 שנ׳** (טאב גלוי, מחובר, שוק סגור) | 🔴 בלי שני הטיימרים: **18 / 60 שנ׳** ⇒ «קרוב ל-0» ⛔ בר-השגה בגל. 🟠 `pulse` נקרא ב-**3** אתרים ⛔ 1, ואחד מהם (`:7394`) הוא החלפת **צבע** שרצה בכל מצב שוק | ✅ |

---

## F1 · XSS בייצוא ה-PDF

**קוד (9f47d5f):** `exportMonthlyPDF` (`SwingEdge_App.jsx:484`) בונה HTML במחרוזת ומזריק `${t.date}`·`${t.ticker}`·`${t.side}`·`${t.setup ?? "-"}` (`:570-573`)
ו-`${l.ticker}`·`${l.lesson}` (`:583`) גולמיים, ואז `window.open("", "_blank")` + `win.document.write(html)` (`:716-718`).
`about:blank` שנפתח מהדף **יורש את ה-origin**. ה-CSP ב-`vercel.json:18` הוא `Content-Security-Policy-Report-Only` ⇒ ⛔ חוסם.

**אוכלוסיית האינטרפולציות בתבנית** (סווג לפי מקור):

| ערך | מקור | קלט משתמש? |
|-----|------|------------|
| `t.date`·`t.ticker`·`t.side`·`t.setup`·`l.ticker`·`l.lesson` | שורת `trades` (הקלדה/ייבוא) | ✅ |
| `monthName`·`year`·`now.toLocale…` | `Date` מקומי | ⛔ |
| `equityIncomplete` | מונים מספריים + `currency` | ⚠️ `currency` = `dispCcy` מההגדרות (רשימה סגורה), ⛔ טקסט חופשי |
| `fmtPaperPrice`·`fmtDollar`·`fmtR`·`formatPct`·`sym` | מספרים + `CURRENCY_SYMBOL[code]` | ⛔ |
| `pathD`·`areaD`·`chartW/H` | מספרים | ⛔ |

**Reproduction** — הבייטים **האמיתיים** של `exportMonthlyPDF` (חילוץ לפי עוגן, בדיוק-פעם-אחת), עם ה-helpers האמיתיים מ-`src/utils.js`
ו-`statisticalModels.js`, ב-`esbuild` → Chromium אמיתי. `lessonLearned = <img src=x onerror=window.__xss=1>`;
`setup = <img src=y onerror="window.opener.__stolen=localStorage.getItem('sb-demo-auth-token')">`:

```json
{
  "root": "/Users/nivhareven/Swing-edge",
  "popupOrigin": "http://127.0.0.1:59994 | http://127.0.0.1:59994/",
  "openerOrigin": "http://127.0.0.1:59994/",
  "popup.__xss": 1,
  "opener.__stolen (localStorage via setup cell)": "FAKE-ACCESS-TOKEN",
  "imgElementsInPopup": 2,
  "lessonTextContent": "AAPL: "
}
```

⇒ שני תאים (`lesson` ו-`setup`) הריצו קוד; ה-popup קרא את `localStorage` של האפליקציה **ושלח את הטוקן לחלון הפותח**.
`lessonTextContent` ריק מהמחרוזת — הטקסט **לא** הוצג כמחרוזת אלא נבלע כאלמנט.

**כל ה-sinks של HTML גולמי בריפו** (`grep -rnE "document\.write|innerHTML|dangerouslySetInnerHTML|insertAdjacentHTML|outerHTML|srcdoc"` על `src api scripts SwingEdge_App.jsx index.html public emails tests-eye tests-sentinel`):

| אתר | מקור הנתון | מסונן? | הכרעה |
|-----|-----------|--------|--------|
| `SwingEdge_App.jsx:718` `win.document.write(html)` | שורות `trades` של המשתמש | ⛔ | 🔴 **F1 — מתוקן בגל** |
| `SwingEdge_App.jsx:2184`·`:2221` `container.innerHTML = ""` | ריק קבוע | — | בטוח (ניקוי) |
| `SwingEdge_App.jsx:2203` `script.innerHTML = JSON.stringify({symbol: chartSymbol,…})` | `chartSymbol` = טיקר שהמשתמש בחר | `JSON.stringify` | בטוח מ-XSS אצלנו: תוכן של `<script>` הוא raw-text ⛔ מפוענח כ-HTML; הסקריפט של TradingView קורא אותו כ-JSON. ⚠️ ⛔ נבדק: `</script>` בטיקר |
| `src/components/TradingViewWidgets.jsx:10`·`:18` | ריק | — | בטוח |
| `src/components/TradingViewWidgets.jsx:15` `script.innerHTML = JSON.stringify(config)` | config קבוע בקוד | — | בטוח |
| `index.html:201` `boot.innerHTML = '…'` | ליטרל קבוע (הודעת כשל טעינה) | — | בטוח |
| `public/chart-upload-guide.html:454/459/462/476` | `COPY`/`scene()` קבועים בקובץ | — | בטוח (סטטי) |
| `scripts/sentinel-count-probe.mjs:107` `insertAdjacentHTML` | probe בדיקות | — | ⛔ בפרודקשן |
| `tests-sentinel/evidence.js:208` `c.outerHTML` | **קריאה** ⛔ כתיבה | — | ⛔ sink |
| `scripts/arch-auditor.mjs:311-317` | גלאי `dangerouslySetInnerHTML` | — | ⚠️ **הגלאי עיוור ל-`document.write`/`innerHTML`** ⇒ `B-` לגל |

`dangerouslySetInnerHTML`: **0** שימושים בקוד המוצר.

---

## F2 · שבועי וחודשי ⛔ ממירים מטבע

**קוד:** `SwingEdge_App.jsx:8237` (`MonthlyReportTab calcMetrics={calcTradeMetrics}`) ו-`:8250` (`WeeklyReviewTab calcMetrics={calcTradeMetrics}`)
מוסרים את ה-calc **הגולמי** ומדפיסים ב-`currency={dispCcy}`. `B-300` ו-`:2636/2643/2657/2737` כבר עברו ל-`stableCalcTradeMetrics` (`:2574`, `makeConvertingCalc(paperAcctTable, dispCcy, paperAcctStatus)`).

**Reproduction** — המודולים האמיתיים (`makeConvertingCalc` · `computeTradingStats` · `generateMonthlyReport`) ב-Node, חשבון ILS,
`AAPL` (נייר USD מאומת) `+$100` ו-`TEVA` `instrumentCurrency:"ILS"` `+₪200`, שער `3.7`:

```
paperCurrencyOf: USD ILS
per-trade raw: 100 200 | conv: 370 200
{
  "gold_ILS": 570,
  "weekly_BEFORE_rawCalc_totalPnL": 300,
  "weekly_HEAD_convCalc_totalPnL": 570,
  "analytics_stats_same_inputs": 570,
  "monthly_BEFORE_rawCalc_netPnL": 300,
  "monthly_convCalc_netPnL": 570
}
{
  "noRate_usdFlag": "no_table",
  "noRate_stats_totalPnL": 200,
  "noRate_stats_fxUnconvertedCount": 1,
  "noRate_monthly_netPnL": 300,
  "note": "monthly should be 200 (₪ only) + disclosure of 1 excluded"
}
```

⇒ BEFORE מציג `₪300` במקום `₪570` (`$100` נקרא כ-`₪100`). החלפת ה-calc מביאה את **שני** המסכים ל-`570` = אותו מספר שהטאב הראשי מחשב.

🔴 **פער ① — החודשי ⛔ אינו החלפת prop.** כשחסר שער (`no_table`), `computeTradingStats` **מחריג וסופר** (`200`, `fxUnconvertedCount: 1`) —
אבל `generateMonthlyReport` מחזיר **`300`**: `MonthlyReport.js:45-47` (`enrich`) קורא `m.pnl` ⛔ בודק `m.fxUnconverted`, ומסכם `$100` לתוך סכום שקלי.
כלומר אחרי החלפת ה-calc לבדה, בכל יום שבו השער טרם נחת החודשי **עדיין** יציג סכום מעורב — רק בשקט יותר. בנוסף:
`MonthlyReport.js:47` `typeof m.pnl === "number" ? m.pnl : 0` (ברירת-מחדל `0`), וכל הנגזרות (`dailyMap` `:320`, `bestTrade`/`worstTrade` `:345-347`,
`vsLastMonth` `:368`, `bySetup` `:116`) רצות על אותה `e.pnl`.
**הכרעה נדרשת:** התיקון שהפרומפט מתאר («מחריגים ומציגים כמה הוחרגו») חי ב-`src/intelligence/core/MonthlyReport.js` — מנוע הדוח, ⛔ בקומפוננטה.
⇒ נגיעה ב-`src/intelligence/` (`test:coach` לפני+אחרי) **מעבר להמרה הטהורה**. האלטרנטיבה (calc מומר בלי סינון במנוע) משאירה את `B-142` פתוח בחודשי.

🟠 **פער ② — שער `B-144` עיוור לשבועי.** `instrument-currency-test.mjs:1435` סופר `useTradingStats(` ב-`SwingEdge_App.jsx` **בלבד** (`4/4`).
`WeeklyReviewTab.jsx:63` (`useTradingStats(weekly, capital, calcMetrics, null)`) ⛔ נספר. ההערה `:59-62` **מנמקת** את ה-`null` (calc גולמי ⇒ ⛔ יחידה),
ולכן התיקון חייב להפוך גם אותה ל-`currency`, באותו קומיט, ולהרחיב את השער — אחרת רגרסיה תהיה ירוקה.

🟠 **שקט נוסף בשבועי:** `WeeklyReviewTab.jsx:119` `const pnl = wStats.totalPnL || 0;` ⇒ ⛔ גילוי של `fxUnconvertedCount` על המסך. `Delta` בחודשי (`MonthlyReportTab.jsx:65`) — `toLocaleString()` על כסף, מחוץ לגל (`test:cents`).

---

## F3 · טוקנים ל-Sentry

**קוד:** `src/main.jsx:43-81` `Sentry.init` — ⛔ `beforeSend`, ⛔ `beforeSendTransaction`, ⛔ `beforeBreadcrumb`; `tracesSampleRate: 0.1`;
`replaysOnErrorSampleRate: 1.0` בלי `replayIntegration`. `src/supabaseClient.js:13-19` — `detectSessionInUrl: true`, flow ברירת-מחדל (implicit) ⇒ הטוקנים ב-hash.
`@sentry/react` `10.67.0`.

**Reproduction** — `vite build` של **העץ** (הבייטים האמיתיים של `main.jsx`) עם `VITE_SENTRY_DSN=http://f3probekey@127.0.0.1:47811/1` (ingest מדומה ב-`ctx.route`) ו-Supabase הסינתטי
(`tests-eye/hermetic.js`). Chromium אמיתי טוען `/app#access_token=<JWT>&…&refresh_token=RTSECRETF3PROBE&token_type=bearer&type=recovery`.
`captureMessage` דרך ה-scope של ה-SDK פעם ברגע שה-client קיים (ה-hash עדיין בכתובת) ופעם אחרי 5 שנ׳. דגימת ה-trace נכפתה **עד `DOMContentLoaded` בלבד**
(Sentry דוגם את ה-pageload ב-`init`); כפייה קבועה של `Math.random` הכניסה את האפליקציה המחוברת ללולאה אינסופית — נמדד, ⛔ נשאר.
⚠️ שגיאות שנזרקו מ-init-script נזרקו ע"י `thirdPartyErrorFilterIntegration` (אין frame של האפליקציה) — לכן ה-event נמדד דרך ה-scope:

```json
[
  { "scenario": "recovery-hash", "envelopes": 11,
    "types": ["session","event","session","session","transaction","session","event","session","event","session","transaction"],
    "refreshTokenIn": ["1:event","4:transaction"],
    "accessTokenIn":  ["1:event","4:transaction"],
    "recoveryTypeIn": ["1:event","4:transaction"],
    "fields": ["item.request.url","transaction.contexts.trace.data.url.full","transaction.spans[].description","transaction.request.url"] },
  { "scenario": "pkce-query", "envelopes": 10,
    "types": ["session","event","session","transaction","session","event","session","event","session","transaction"],
    "refreshTokenIn": [], "accessTokenIn": [],
    "pkceCodeIn": ["1:event","3:transaction","5:event"],
    "recoveryTypeIn": ["1:event","3:transaction","5:event"],
    "fields": ["item.request.url","transaction.contexts.trace.data.url.full","transaction.spans[].description","transaction.request.url"] }
]
```

**מה נמדד:**
- 🔴 **transaction** (pageload, נדגם ב-`10%` מהטעינות בפרודקשן): `refresh_token` + `access_token` ב-**3** שדות. כל חזרת OAuth / magic-link / איפוס-סיסמה שנדגמה ⇒ session חי אצל ספק שלישי. **אותו כשל כמו `INCIDENTS#12`, בערוץ שלישי.**
- 🔴 **event** שנלכד בזמן הטעינה (לפני ש-supabase-js מוחק את ה-hash): `request.url` נושא את שני הטוקנים. event מאוחר (אחרי מחיקת ה-hash): **נקי** — `0/2` events מאוחרים.
- ✅ **breadcrumbs:** ⛔ נשאו טוקן במדידה הזו (המחיקה ב-`replaceState` קרתה לפני הניווט). `beforeBreadcrumb` נשאר כהגנה, ⛔ כתיקון-מדוד.
- ✅ **replay:** `0` envelopes מסוג `replay_*` מתוך `21` — אין `replayIntegration` ⇒ `replaysOnErrorSampleRate` הוא **config מת** (⛔ דליפה).
- ⚠️ `?code=` (PKCE) נשאר בכתובת לאורך כל החיים כי האפליקציה ⛔ משתמשת ב-PKCE — ⛔ מסלול שקורה היום, אבל ה-scrub יכסה אותו.

**גבול הראיה:** בייטים אמיתיים + SDK אמיתי + דפדפן אמיתי, **⛔ מול פרויקט ה-Sentry בפרודקשן**. האם טוקנים כבר נקלטו — ⛔ נמדד, ⛔ יש לי גישה.
⇒ **בדיקה של ניב:** Sentry → Performance/Discover, חיפוש `access_token` / `refresh_token` ב-`request.url`/`transaction` ב-90 הימים האחרונים. אם יש — הכרעת rotation/מחיקת אירועים (ניב בלבד).

---

## F4 · כשלי כתיבת עסקה ⛔ מגיעים לטלמטריה

**קוד:** `grep captureException|captureMessage` על `SwingEdge_App.jsx src` (מלבד `main.jsx`) ⇒ **0**. `PanelBoundary` = `Sentry.ErrorBoundary` (קריסות רינדור בלבד);
`priceService.js:115` = breadcrumb בלבד.

| שורה | מסלול | `console.error` | `toast.error` |
|------|-------|-----------------|----------------|
| `:3300` | insert | ✅ | ✅ |
| `:3357` | close-update | ✅ | ✅ |
| `:3399` | delete | ✅ | ✅ |
| `:3456` | bulk delete | ✅ | ✅ |
| `:3495` | update | ✅ | ✅ |
| `:3549` | import insert | ✅ | ✅ |
| `:3598` | import undo | ✅ | ✅ |

🔴 **פער ① — ⛔ «רק console».** המשתמש **רואה** כל כשל (`7/7` toast). מה שחסר הוא הצד של ניב: `0/7` מגיעים ל-Sentry ⇒ אין ספירה, אין התראה.
התיקון נשאר כפי שהפרומפט מתאר (טלמטריה בלבד, ⛔ UX), אבל ההערה «⛔ toast חדש (זה B-440)» אינה רלוונטית — אין מה להוסיף.

🟠 **פער ② — `status`/`code` ⛔ קיימים.** `classifyRows` (`tradeWrite.js:41-42`) מחזיר `{ ok:false, reason:"error", message, rows:0 }` — `error.code` (PostgREST/PG) ו-`res.status` (HTTP) **נזרקים**.
⇒ תגים זמינים בלי לגעת ב-`tradeWrite.js`: `op` · `table` · `reason` (`error`/`threw`/`none`/`partial`/`too-many`/`unconfigured`).
תגי `status`+`code` מחייבים הוספת שדות (additive) ל-`classifyRows` ⇒ `test:write` לפני+אחרי.
⛔ **`res.message` ⛔ נשלח בשום מקרה** — הודעת PG על הפרת CHECK כוללת «Failing row contains (…)», כלומר את ערכי השורה.

🟠 **B-455:** `loadFailed` (`src/lib/userSettings.js:394`) הוא נקודת הכשל של קריאת `user_settings`. `captureMessage` שם = side-effect בלבד, אבל הקובץ בתחום
`test:hydration`+`test:settings` ⇒ שניהם לפני+אחרי. ⛔ retry, ⛔ שינוי ב-`writable`/`lastSent`/`lastToken`.

---

## F5 · טיימרים שמרנדרים את השורש

**קוד:** `SwingEdge_App.jsx:1624-1625` (`pulse`, `tickerIdx`), `:2988-2996` (שני ה-intervals).
`tickerIdx` — `grep -n "tickerIdx"` ⇒ הצהרה (`:1625`) + setter (`:2989`) בלבד ⇒ **0 קוראים**. ✅ אומת.
`pulse` — **3 קוראים** (⛔ 1 כמו בפרומפט):

| שורה | אלמנט | מה `pulse` עושה |
|------|-------|------------------|
| `:4610` | נקודת מצב-שוק בכותרת | `opacity` `1 ↔ 0.55` כשהשוק פתוח, `0.85` אחרת |
| `:7394` | נקודה ליד «Market Overview» | `bg-emerald-400 ↔ bg-emerald-700` — **צבע**, ו**בכל מצב שוק** |
| `:8962` | נקודת מצב-שוק בפוטר | זהה ל-`:4610` |

**Reproduction** — `buildTree` (`scripts/lib/eyeBuild.mjs`) בשלוש זרועות, hermetic, התחברות בטופס עם פרטי ה-fixture של `hermetic.js`,
`__REACT_DEVTOOLS_GLOBAL_HOOK__` מדומה שסופר commits ובודק אם הקומפוננטה בעלת שרשרת ה-hooks הארוכה (`276` = `SwingEdge`) רונדרה מחדש
(`memoizedState` ≠ `alternate.memoizedState`). 12 שנ׳ התייצבות + 15 שנ׳ אחרי התחברות, ואז **60 שנ׳** בלי אינטראקציה:

```json
{
  "BEFORE":         { "signedIn": true, "path": "/app", "visibility": "visible", "seconds": 60, "commitsPerMin": 84, "rootRendersPerMin": 84, "rootHookCount": 276 },
  "NO_TIMERS":      { "signedIn": true, "path": "/app", "visibility": "visible", "seconds": 60, "commitsPerMin": 18, "rootRendersPerMin": 18, "rootHookCount": 276 },
  "NO_TICKER_ONLY": { "signedIn": true, "path": "/app", "visibility": "visible", "seconds": 60, "commitsPerMin": 31, "rootRendersPerMin": 31, "rootHookCount": 276 }
}
```

⇒ `84 / 60 שנ׳` → `18 / 60 שנ׳` בלי שני הטיימרים (`−66`; התיאוריה: `30` מ-`tickerIdx` + `40` מ-`pulse` = `70`). `84/84` commits רינדרו את השורש.
`git status` אחרי שלוש הזרועות: נקי (`buildTree` שחזר ואימת byte-identical).

🔴 **פער ① — «HEAD קרוב ל-0» ⛔ בר-השגה.** `18 / 60 שנ׳` נשארים ממקורות אחרים — מועמדים (⛔ נמדד לפי מקור): `setMarketState` כל `30s` (`:2319`), רענון מחירים (`:2351`),
רענון סקירת-שוק (`:2412`), `setTiltTick` כל `60s` (`:2761`), ועדכוני state שכל fetch מייצר. ⇒ סף הקבלה בשלב C: **`≤ 20 / 60 שנ׳`**, ⛔ `~0`; הורדת השאר = גל אחר.
🟠 **פער ② — שלושה צרכנים, שתי צורות.** `:4610`/`:8962` = keyframes על `opacity`; `:7394` = keyframes על `background-color` ש⛔ תלוי במצב שוק — לשמר בדיוק.
⚠️ **גבולות המדידה:** n=1 לזרוע · שוק **סגור** (09:xx UTC) · טאב גלוי · headless. «הנקודה מהבהבת כשהשוק פתוח» בשלב C דורש שעון מדומה או שעות מסחר.

---

## מה נדרש מניב לפני שלב B

1. **F2-חודשי:** לאשר נגיעה ב-`src/intelligence/core/MonthlyReport.js` (סינון `fxUnconverted` + מונה מוחרגים ב-`enrich`/סיכום, `test:coach` לפני+אחרי) — **או** להשאיר את החודשי מחוץ לגל.
2. **F4:** תגים `op`/`table`/`reason` בלבד — **או** גם `status`/`code`, שמחייבים שדה additive ב-`classifyRows` (`test:write`).
3. **F5:** לאשר סף `≤ 20 / 60 שנ׳` במקום `~0`.
4. **F3:** בדיקת פרויקט ה-Sentry בפרודקשן (טוקנים שכבר נקלטו?) — ניב בלבד; משפיעה על `INCIDENTS` ועל rotation.

כלי ה-repro (חילוץ-עוגן ל-F1, Node ל-F2, build+ingest מדומה ל-F3, `buildTree` שלוש-זרועות ל-F5) נשמרו מחוץ לריפו ויועברו לתשתית הקיימת בשלב C.
