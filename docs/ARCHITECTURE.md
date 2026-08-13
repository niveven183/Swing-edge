# Architecture Map

> ⚠️ **שכבת התמצאות. ההסבר המלא: [PROJECT-GUIDE.md](PROJECT-GUIDE.md).**
> This file answers *where does X live*. It does **not** explain *why*, and it is
> **not** a verification guide — both live in `PROJECT-GUIDE.md`.
>
> ⚠️ **Every count below was re-measured 13.08 against `HEAD`.** The previous
> revision claimed `~5200` lines and **4** workflows; both were stale by a wide
> margin (`7911` and `17`). ⛔ Don't trust a number here without re-running the
> command next to it.

See [CONTEXT.md](../CONTEXT.md) for deep product/engine detail.

## Root
- `SwingEdge_App.jsx` — the app's root component (**7,911 lines**, single-file by
  design; post-launch split planned). Mounted at `/app`.
  _`wc -l < SwingEdge_App.jsx`_
- `index.html`, `main.jsx` (in `src/`) — Vite entry, wraps the app in
  `<BrowserRouter>`. `/` = `LandingGate` (redirects to `/app` if
  authenticated, else `LandingPage`).

## `src/components/` — **35 `.jsx`** (+ **4** in `ui/`)
_`ls src/components/*.jsx | wc -l`_

UI screens and modals: `AuthScreen`, `LandingPage`, `OnboardingScreen` /
`OnboardingTour`, `EditTradeModal`, `MonthlyReportModal` / `MonthlyReportTab`,
`GrowthPredictor`, `AdminPanel`, `TradeCalendar`, `LegalPages`, `HelpModal`,
`FeedbackTab`, `TradingViewSearch` / `TradingViewWidgets`, `TickerLogo`,
`ToastProvider`, plus password/reset/billing modals. `ui/` holds shared
primitives (incl. `setupGraphs.jsx`, used by `tradeOptions.jsx`).

## `src/data/`
- `tradeEnums.js` — **single source of truth** for Setup / Market Condition /
  Emotion. Pure data, no JSX, so plain Node (`cleanTrades` and its test) can
  import it. ⚠️ **Load-bearing:** the `value` strings are compared directly by
  `DecisionCoach`, `MarketRegime`, `cleanTrades`/`purgeInvalidTrades`, and
  `VALID_EMOTIONS`. Never rename a `value`.
- `tradeOptions.jsx` — **re-exports every name from `tradeEnums.js`** and adds
  the React/graph layer. ⛔ Not a second source — import from either.
- `tooltips.js` — term dictionary in **5 languages** (en/he/es/pt/ar), **72
  terms**, plus `TERM_LABELS` (also 72), consumed by `TermTooltip`.
  ⚠️ `glossary.json` is **derived** from it — after editing a tooltip run
  `npm run glossary` in the same commit, or `test:copy` #5 catches the drift.
  _`node -e "import('./src/data/tooltips.js').then(m=>console.log(Object.keys(m.TRADING_TOOLTIPS).length))"`_
- `tickers.js`, `glossary.json` — symbol list and glossary content (see
  `scripts/build-glossary.mjs`).

## `src/intelligence/` — the coaching engine — **18 `.js`**, `core/` holds **12**
_`find src/intelligence -name '*.js' | wc -l` · `ls src/intelligence/core/*.js | wc -l`_

- `SwingEdgeAI.js` — public entry points: `analyzeNewTrade` (Log New Trade)
  and `analyzeStandalone` (Trade Analyzer). Both ultimately call `coachTrade`
  — there is no second analysis path.
- `core/DecisionCoach.js` — `coachTrade()` builds the `checks[]` array and
  0–100 confidence band; `ideaFromForm()` maps raw form fields into the
  canonical `idea` object; `coachingToAnalyzerView()` adapts rich output to
  the Analyzer's flat shape.
- `core/` (rest) — `MarketRegime`, `TradeDNA`, `EdgeFinder`, `TiltProtection`,
  `AntiEdgeLock`, `GrowthTracker`, `AdaptiveLessons`, `EdgeDecayAlert`,
  `MonthlyReport`, `CoachPersona`, `LearningEngine` — supporting analysis
  modules, each single-purpose. **11 + `DecisionCoach` = 12.**
- `ui/IntelligenceUI.jsx` — renders coaching output (e.g. the live
  DecisionCoachPanel in the new-trade form).
- `utils/` — `statisticalModels.js`, `psychologyPatterns.js`.
- `calibration.js` + `calibration.json` — reader over the values the Analyst
  agent proposes by PR. Every consumer passes its own hardcoded fallback, so
  an empty `{}` changes nothing.
- `knowledge.js` + `knowledge/*.json` (setups · rules · psychology · regimes)
  — same additive shape. ⚠️ **Not imported anywhere yet** — wiring is a later
  phase, so don't read its presence as "the engine uses it".

## `api/*` — Vercel serverless functions — **10 endpoints** + `api/_lib/` (**3**)
_`ls api/*.js | wc -l`_

Full list: `earnings` · `feedback` · `fx` · `health` · `notify` · `ocr` ·
`quote` · `send-invites` · `symbol-search` · `verify-turnstile`.
`_lib/`: `cors.js` · `rateLimit.js` · `replyLedger.js`. Detail on four of them:

- `health.js` — probes Supabase, Finnhub, Twelve Data, CoinGecko in parallel;
  consumed by **Sentinel** (§3 "API health") and by UptimeRobot.
- `quote.js` — price proxy (Finnhub for stocks/ETFs, CoinGecko for crypto),
  routes around Yahoo Finance's Vercel IP block; same response shape as the
  old Yahoo client parser expects.
- `symbol-search.js` — proxies TradingView's symbol search (spoofs
  `Referer`, since browsers can't set it); client falls back to Yahoo on
  failure.
- `ocr.js` — reads a chart screenshot via Claude Vision, derives trade levels
  deterministically from the Position tool's delta/percent (Vision's raw
  entry read is a confidence cross-check only, never the price source).

## `.github/workflows/` — **17**
_`ls .github/workflows/*.yml | wc -l`_

⚠️ The previous revision listed **4**. Detail on those four:

- `build.yml` (**Build**) — build gate on every push/PR.
- `health.yml` (**Health Monitor**) — ⚠️ **deprecated 25.07, `workflow_dispatch`
  only.** The previous revision claimed "every 30 min"; the schedule was
  removed when `sentinel.yml` absorbed the same `/api/health` probe. Kept
  dispatchable as a manual backup — don't delete it, and don't rely on it
  firing.
- `smoke.yml` (**Smoke Tests**) — Playwright against production, daily 04:00
  UTC + on push.
- `backup.yml` (**Supabase Backup**) — weekly encrypted `pg_dump`, Sundays
  03:00 UTC, 30-day artifact retention.

The other 13: `analyst` · `arch-auditor` · `daily-digest` · `data-guardian` ·
`email-campaign` · `failure-alert` · `fleet-daily` · `fleet-weekly` ·
`restore-drill` · `sentinel` · `triage` · `user-analytics` · `watchdog`.
They are driven by **31 `.mjs`** in `scripts/`. ⚠️ 9/10 channels are
**outbound only** — see `docs/AGENT-CHANNELS.md`.

## `supabase/migrations/` — **20**
_`ls supabase/migrations | wc -l`_ · ⛔ Claude Code never runs one (`CLAUDE.md` §12).

## i18n — three separate systems, don't conflate them
1. `src/i18n.js` (**2,926 lines**) — the main dictionary: `en` (base) + `he`/`es`/`pt`/`ar`,
   all spread from `en` so missing keys fall back to English. `he`/`ar` are
   RTL, handled at runtime via `isRTLLang()`.
2. `LandingPage.jsx` — its own local `const STR = {...}`, not wired to
   `i18n.js`.
3. `AuthScreen.jsx` — likewise, its own local `const STR = {...}`.

(`GrowthPredictor.jsx` also has a local `STR` — same pattern, scoped to that
component.) When adding a translated string, check which of the three
systems the surrounding component actually reads from.

## Env vars (names only — see `.env.example` / Vercel dashboard for values)
_`grep -rho 'process\.env\.[A-Z_]*' api scripts | sort -u`_

- **Client (`VITE_` prefix ⇒ shipped in the bundle, never a secret):**
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_TURNSTILE_SITE_KEY`,
  `VITE_SENTRY_DSN`.
- **Serverless (`api/`):** `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
  `FINNHUB_API_KEY`, `MARKETDATA_API_KEY`, `ANTHROPIC_API_KEY`,
  `TURNSTILE_SECRET_KEY`.
- **CI only (`scripts/` + workflows):** `BACKUP_PASSPHRASE`, `SUPABASE_DB_URL`,
  `MAIL_HOST` / `MAIL_PORT` / `MAIL_USERNAME` / `MAIL_PASSWORD`,
  `SENTINEL_DISCORD_WEBHOOK`, `GITHUB_TOKEN`, `PROD_URL`, `DRY_RUN`.

## Deploy flow
`git push origin main` → **Build** workflow gates the push → Vercel
auto-deploys `main` → new JS/CSS bundle gets a content hash (e.g.
`index-BcsUYqwS.js`) → Smoke tests verify production post-deploy (daily +
on push).
