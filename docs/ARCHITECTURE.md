# Architecture Map

For humans and future sessions — what lives where. See [CONTEXT.md](../CONTEXT.md)
for deep product/engine detail; this file is the orientation layer.

## Root
- `SwingEdge_App.jsx` — the app's root component (~5200 lines, single-file by
  design; post-launch split planned). Mounted at `/app`.
- `index.html`, `main.jsx` (in `src/`) — Vite entry, wraps the app in
  `<BrowserRouter>`. `/` = `LandingGate` (redirects to `/app` if
  authenticated, else `LandingPage`).

## `src/components/`
UI screens and modals: `AuthScreen`, `LandingPage`, `OnboardingScreen` /
`OnboardingTour`, `EditTradeModal`, `MonthlyReportModal` / `MonthlyReportTab`,
`GrowthPredictor`, `AdminPanel`, `TradeCalendar`, `LegalPages`, `HelpModal`,
`FeedbackTab`, `TradingViewSearch` / `TradingViewWidgets`, `TickerLogo`,
`ToastProvider`, plus password/reset/billing modals. `ui/` holds shared
primitives (incl. `setupGraphs.jsx`, used by `tradeOptions.jsx`).

## `src/data/`
- `tradeOptions.jsx` — **single source of truth** for Setup / Market
  Condition / Emotion options. ⚠️ **Load-bearing:** the `value` strings are
  compared directly by `DecisionCoach`, `MarketRegime`,
  `cleanTrades`/`purgeInvalidTrades`, and `VALID_EMOTIONS`. Never rename a
  `value`.
- `tooltips.js` — bilingual (he/en) term dictionary (~38 terms) +
  `TERM_LABELS`, consumed by `TermTooltip`.
- `tickers.js`, `glossary.json` — symbol list and glossary content (see
  `scripts/build-glossary.mjs`).

## `src/intelligence/` — the coaching engine
- `SwingEdgeAI.js` — public entry points: `analyzeNewTrade` (Log New Trade)
  and `analyzeStandalone` (Trade Analyzer). Both ultimately call `coachTrade`
  — there is no second analysis path.
- `core/DecisionCoach.js` — `coachTrade()` builds the `checks[]` array and
  0–100 confidence band; `ideaFromForm()` maps raw form fields into the
  canonical `idea` object; `coachingToAnalyzerView()` adapts rich output to
  the Analyzer's flat shape.
- `core/` (rest) — `MarketRegime`, `TradeDNA`, `EdgeFinder`, `TiltProtection`,
  `AntiEdgeLock`, `GrowthTracker`, `AdaptiveLessons`, `EdgeDecayAlert`,
  `MonthlyReport` — supporting analysis modules, each single-purpose.
- `ui/IntelligenceUI.jsx` — renders coaching output (e.g. the live
  DecisionCoachPanel in the new-trade form).
- `utils/` — `statisticalModels.js`, `psychologyPatterns.js`.

## `api/*` — Vercel serverless functions
- `health.js` — probes Supabase, Finnhub, Twelve Data, CoinGecko in parallel;
  backs the Health Monitor workflow and UptimeRobot.
- `quote.js` — price proxy (Finnhub for stocks/ETFs, CoinGecko for crypto),
  routes around Yahoo Finance's Vercel IP block; same response shape as the
  old Yahoo client parser expects.
- `symbol-search.js` — proxies TradingView's symbol search (spoofs
  `Referer`, since browsers can't set it); client falls back to Yahoo on
  failure.
- `ocr.js` — reads a chart screenshot via Claude Vision, derives trade levels
  deterministically from the Position tool's delta/percent (Vision's raw
  entry read is a confidence cross-check only, never the price source).

## `.github/workflows/`
- `build.yml` (**Build**) — build gate on every push/PR.
- `health.yml` (**Health Monitor**) — runs `api/health` every 30 min, alerts
  on 503.
- `smoke.yml` (**Smoke Tests**) — Playwright against production, daily 04:00
  UTC + on push.
- `backup.yml` (**Supabase Backup**) — weekly encrypted `pg_dump`, Sundays
  03:00 UTC, 30-day artifact retention.

## i18n — three separate systems, don't conflate them
1. `src/i18n.js` — the main dictionary: `en` (base) + `he`/`es`/`pt`/`ar`,
   all spread from `en` so missing keys fall back to English. `he`/`ar` are
   RTL, handled at runtime via `isRTLLang()`.
2. `LandingPage.jsx` — its own local `const STR = {...}`, not wired to
   `i18n.js`.
3. `AuthScreen.jsx` — likewise, its own local `const STR = {...}`.

(`GrowthPredictor.jsx` also has a local `STR` — same pattern, scoped to that
component.) When adding a translated string, check which of the three
systems the surrounding component actually reads from.

## Env vars (names only — see `.env.example` / Vercel dashboard for values)
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, `FINNHUB_API_KEY`, `MARKETDATA_API_KEY`,
`ANTHROPIC_API_KEY`, `VITE_SENTRY_DSN`. CI-only secrets: `BACKUP_PASSPHRASE`,
`SUPABASE_DB_URL`.

## Deploy flow
`git push origin main` → **Build** workflow gates the push → Vercel
auto-deploys `main` → new JS/CSS bundle gets a content hash (e.g.
`index-BcsUYqwS.js`) → Smoke tests verify production post-deploy (daily +
on push).
