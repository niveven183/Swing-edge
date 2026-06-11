# SwingEdge — Project Context

## Project Overview
SwingEdge הוא יומן מסחר מקצועי לסוחרי סווינג.
- **Stack:** React 18 + Vite 6 + Tailwind 3 + Recharts + date-fns 4
- **Deployment:** Vercel (auto from `main`)
- **Auth:** Supabase (Email + Google + Forgot/Reset Password)
- **Repo:** niveven183/Swing-edge
- **Local path:** /Users/nivhareven/Swing-edge
- **Supabase project:** zicstkfkwhzvmdkzpidm

## Architecture
- `SwingEdge_App.jsx` — root component, ~5200 lines (single-file by design, post-launch split planned).
- `src/hooks/useTradingStats.js` — single source of truth for all aggregated stats.
- Auth flow: `AuthScreen` → (optional `ForgotPassword`) → `ResetPassword` (triggered by `?reset=true` in URL).
- **Routing (react-router-dom@7.17.0):** `main.jsx` wraps in `<BrowserRouter>`. `/` = `LandingGate` (redirects to `/app` if authenticated, else `LandingPage`). `/app` = `SwingEdge_App.jsx`.

## Tabs Structure (NAV_KEYS)
`dashboard | journal | tools | analytics | intel | feedback`

⚠️ The `tools` tab has a sub-nav: `'analyzer' | 'calc' | 'report'`.
If the URL points to `/analyzer` or `/position`, a `useEffect` routes the user into the `tools` tab automatically.
The `report` sub-tab renders the Trading DNA Monthly Report.

## Data Schema
localStorage key: `swingEdgeTrades`

```ts
Trade = {
  id: string,
  ticker: string,
  date: "YYYY-MM-DD",        // entry date
  exitDate: "YYYY-MM-DD",    // exit date (closed trades only)
  side: "LONG" | "SHORT",    // ⚠️ NOT t.direction
  status: "OPEN" | "CLOSED",
  setup: string,
  emotionAtEntry: "FOMO" | "Confident" | "Patient" | "Neutral" | "Hesitant" | "Calm" | "Angry" | "Nervous",
  notes: string,             // ⚠️ NOT t.reason
  lessonLearned: string,     // ⚠️ NOT t.lesson
  followedPlan: true | false | "Partially",
  marketCondition: "Trending Up" | "Trending Down" | "Volatile" | "Sideways",
  maxFavorable: number,
  maxAdverse: number,
  _capitalAtEntry: number,
  isDemo: boolean,
  entry: number, exit: number, stop: number, shares: number,
}
```

🚨 **CRITICAL:** `pnl` and `rMultiple` are **not stored** on the trade.
Compute via: `const { pnl, rMultiple } = calcTradeMetrics(trade)`
`calcTradeMetrics` lives in **`src/utils.js:4`** — single canonical source. `SwingEdge_App.jsx` imports it from there (line 20). Do not redefine it locally.

⚠️ **followedPlan normalization:** Supabase stores this as text and returns `"true"` / `"false"` strings.
The load path in App (line ~112) normalizes to boolean: `"true"→true`, `"false"→false`, `"Partially"` passes through.
Always compare with `=== true` / `=== false`; never rely on raw string equality elsewhere.

## Key Components

### Main
- `SwingEdge_App.jsx` — root
- `src/hooks/useTradingStats.js` — stats aggregation
- `src/supabaseClient.js` — Supabase client + sync
- `src/utils.js` — canonical math helpers: `calcTradeMetrics`, `fmt$`, `fmtR`, `CAPITAL`, `RISK_PCT`

### Routing
- `main.jsx` — `<BrowserRouter>` wraps everything
- `src/components/LandingGate.jsx` — `/` route: redirects to `/app` if authenticated, else shows `LandingPage`
- `src/components/LandingPage.jsx` + `LandingPage.css` — public landing / waitlist page
- `src/hooks/useSupabaseSession.js` — hook for auth session detection used by `LandingGate`

### Auth
- `AuthScreen.jsx` — Sign In / Sign Up / Google
- `ForgotPassword.jsx` — `resetPasswordForEmail`
- `ResetPassword.jsx` — `updateUser({ password })` (loaded when `?reset=true`)
- `Logo.jsx` — SVG swing-wave logo (3 variants)

### UI
- `ui/InfoTooltip.jsx` — tooltip with `position:fixed` + viewport-aware
- `TradeCalendar.jsx` — monthly calendar with P&L per day. Props: `{ trades, calcMetrics, lang }`
- `src/components/TradingViewSearch.jsx` — professional symbol autocomplete (debounce, AbortController, keyboard nav)
- `src/components/PrivacyModal.jsx` — privacy/security modal (accessible from profile dropdown)

### Data
- `src/data/tooltips.js` — `TRADING_TOOLTIPS` (18 metrics + setup names, bilingual)
- `src/data/tickers.js` — 90+ `POPULAR_TICKERS` + `searchTickers()` + `getTickerMeta()`

### Intelligence
- `src/intelligence/core/LearningEngine.js` — adaptive channel reweighting
- `src/intelligence/core/AdaptiveLessons.js` — 6 patterns → personal lessons (min 5 trades + Wilson score + 55% floor before calling something an "edge")
- `src/intelligence/core/TiltProtection.js` — tilt detection
- `src/intelligence/core/TradeDNA.js` — 4 dimensions: Risk · Discipline · Consistency · Growth
- `src/intelligence/core/EdgeFinder.js` — per-setup edge calculation (formula unchanged; extracted to canonical util)
- `src/intelligence/core/MonthlyReport.js` — Trading DNA monthly report data
- `src/intelligence/ui/IntelligenceUI.jsx` — renders intelligence tab content
- `src/intelligence/utils/statisticalModels.js` — **`edgeScore` + `rankSetupEdges`** (Wilson interval, single source of truth for "Your Edge" across Dashboard / Lessons / Monthly Report)

### Services
- `src/priceService.js` — client-side price layer: `searchSymbolsTV()` (TradingView via serverless proxy) + quote fetch + 5min cache + CORS proxy fallbacks. ⚠️ Yahoo Finance helpers (`toYahooSymbol`, `fromYahooSymbol`, etc.) remain in file but are unused for live quotes — kept for search fallback only.
- `api/quote.js` — Vercel serverless function. **Stocks/ETFs → Finnhub** (`/api/v1/quote`, requires `FINNHUB_API_KEY` env var). **Crypto → CoinGecko** (`/simple/price`, keyless). Yahoo Finance was the original source but is blocked on Vercel IPs (429 / TLS handshake failure) and is no longer used for quote data.
- `api/symbol-search.js` — Vercel serverless function; proxies TradingView symbol search (spoofs `Referer` header). Dev proxy in `vite.config.js`.

### Vision (legacy, still in repo)
- `src/vision/ChartVisionEngine.js` — TradingView screenshot parser
- `src/vision/readers/*` — image preprocessing + price-axis reader

## Features Built (Recent Updates)
- ✅ InfoTooltips on all metrics (Dashboard + Analytics + Tools)
- ✅ Tools tab — Trade Analyzer + Position Calculator unified
- ✅ New SVG Logo (swing wave + S)
- ✅ Light-theme Auth (Sign In + Sign Up + Google + Forgot Password)
- ✅ Reset Password flow (`?reset=true` URL detection)
- ✅ Calendar view in Journal (date-fns)
- ✅ Adaptive Lessons system (6 patterns)
- ✅ Analytics 6 new charts: R distribution · P&L by month · Emotion perf · Streaks · Setup matrix · Hold vs P&L
- ✅ Market Intel: 90+ tickers · instant autocomplete · sector badges · reactive sector trends · emerald quick-jump pills
- ✅ **Landing page + routing** (a0143e7): `/` = public landing, `/app` = app; auth-aware redirect via `LandingGate`
- ✅ **Removed Live Market Overview** (341703b): TradingView embed stripped from Dashboard — cleaner UI, fewer API calls
- ✅ **Professional symbol search** (80439ef): full-market autocomplete via TradingView + Yahoo fallback, serverless proxy in `api/symbol-search.js`
- ✅ **DNA Report → Tools tab** (fd1c4c5): Trading DNA Monthly Report moved from standalone tab to `tools > report` sub-tab; verified real data via `calcTradeMetrics`
- ✅ **i18n consistency** (146a4d1): ~60 strings fixed, 30 new keys (he+en); professional terms stay English, rest consistent
- ✅ **Core formula unified + P&L transparency** (a545e6c): `calcTradeMetrics` consolidated to `src/utils.js` only; `openPnL` now surfaces `missingCount` with amber AlertTriangle warning instead of silent skip
- ✅ **QA fixes** (038166a): discipline string↔bool, winrate rounding, loss/DD sign, equity dates, footer market status
- ✅ **serverless price proxy** (1a793bb): `api/quote.js` added; `followedPlan` string→bool normalization at load
- ✅ **Dark-mode header bar + equity START anchor tick** (b01a6fb)
- ✅ **Live Decision Coach** (DecisionCoachPanel): real-time AI coaching panel in the new-trade form — analyses setup/emotion/market/R:R as you type (debounced 300ms, `useMemo`-based `aiCoach`)
- ✅ **Finnhub + CoinGecko prices** (1d0a887): Yahoo Finance blocked on Vercel IPs → `api/quote.js` now routes stocks/ETFs to Finnhub and crypto to CoinGecko (keyless)
- ✅ **Sector week/month null fix** (3ccbe2c): Intel tab stores `null` (not `0`) for sectors with no week/month data — prevents misleading "0%" display
- ✅ **Wilson metric for "Your Edge"** (d4fb060): `edgeScore`/`rankSetupEdges` in `statisticalModels.js` is now the single source of truth for edge scores. Dashboard, Lessons, and Monthly Report all derive from it. Minimum 5 trades + Wilson score + 55% win-rate floor required before a setup is called an "edge". Period labels ("all-time" / "this month") added per screen.
- ✅ **A11y: aria-label + htmlFor** (cc32b45): All icon buttons now carry bilingual `aria-label` (he/en). All form labels use `htmlFor` associations. WCAG 2.1 AA compliance across Auth + Journal + Tools.
- ✅ **Nervous emotion + Hebrew plural + calculator guard** (8432258): Added `"Nervous"` to `emotionAtEntry` enum. Hebrew plural strings fixed (e.g. "עסקה" / "עסקאות"). Position calculator now shows a clear message when `entry === stop` (zero-risk guard) instead of silently returning `∞`.
- ✅ **TradeCalendar dark mode** (2b27dfc): All calendar day cells, headers, and P&L badges now use proper Tailwind dark-mode variants — no more light-grey wash in dark theme.

## Workflow
- **Claude chat** (Opus/Sonnet via claude.ai) writes prompts and designs features.
- **Claude Code** (this session, Sonnet) executes: reads files, edits code, runs build, commits, pushes.
- **Vercel** auto-deploys from `main` — deployment is the final validation step.
- Hive agents (Python) write `PROPOSALS.md` / `TASKS.md` prompts overnight; Claude Code implements them.

## Coding Rules (Hive agents + Claude Code)
1. ❌ NEVER access `trade.pnl` directly — ✅ `const { pnl } = calcTradeMetrics(trade)` (import from `./src/utils.js`)
2. ❌ NEVER use `t.direction` — ✅ `t.side`
3. ❌ NEVER use `t.reason` / `t.lesson` — ✅ `t.notes` / `t.lessonLearned`
4. ❌ NEVER add a new `useState` without checking if existing state can be reused
5. ❌ NEVER hardcode user-facing strings — ✅ `lang === 'he' ? '...' : '...'`
6. ❌ NEVER add new tab to NAV_KEYS without consulting CONTEXT.md — current: `dashboard, journal, tools, analytics, intel, feedback`
7. ❌ NEVER break TradingView widget config in Market Intel
8. ❌ NEVER force-push to main without explicit user permission ("א" or "כן force")
9. ❌ NEVER read-modify-write localStorage in render — ✅ `useState` + `useEffect`
10. ❌ NEVER fetch from APIs without try/catch + fallback
11. ❌ NEVER call `edgeScore`/`rankSetupEdges` inline — ✅ import from `src/intelligence/utils/statisticalModels.js`

## Mandatory Prompt Structure (every Claude Code prompt)
- 🎯 Model: Sonnet (CSS/fix) or Opus (architecture/design/new feature)
- 🧠 Plan Mode: YES/NO
- 🆕 Session: new/existing
- 💻 Where: Claude Code / Terminal
- 🔌 Connectors: list needed (GitHub, Vercel, Supabase, Image Search, etc.)
- 🧩 Plugins: list if needed
- End with mandatory git+build+push block.

## Mandatory Git Block (end of every prompt)
```bash
npm run build
git add .
git commit -m "[descriptive message]"
git pull origin main --rebase
git push origin main
git log --oneline -1
# echo "סיימתי ✅"
```

## Auto-recovery Rules
- Conflict → `git checkout --theirs . && git add . && git commit`
- Build fail → `npm install && npm run build`
- Push rejected → `git pull origin main --rebase && git push origin main`

## Pending Tasks (Roadmap)

### Sprint 2 — Open
1. ⏳ GA4 / Analytics integration (Google Analytics 4)
2. ⏳ SEO — meta tags, sitemap, og:image
3. ⏳ Privacy Policy + Terms of Service pages (legal)
4. ⏳ Stripe (Free / Pro $19 / Team $49)
5. ✅ Comprehensive QA pass — **CLOSED** (a11y cc32b45, emotions/calc 8432258, calendar dark 2b27dfc)

### Backlog
6. ⏳ Sentry / error monitoring full setup
7. ⏳ 30 professional demo trades (prompt: `12-PRO-30-TRADES-PROMPT.md`)
8. ✅ Landing page + Waitlist — done (a0143e7)
9. ✅ Live Decision Coach — done (DecisionCoachPanel in new-trade form)
10. ✅ Trading DNA monthly report — done (fd1c4c5, moved to Tools > report)
11. ⏳ Tilt Shield (full)
12. ⏳ Telegram bot — daily summaries
13. ✅ Real-time market API — done (Finnhub stocks + CoinGecko crypto, 1d0a887)
14. ⏳ Apple Login (Phase 2 — Apple Developer $99)
15. ⏳ Split `SwingEdge_App.jsx` (5200+ lines) — POST-LAUNCH

## FIX 2A Math Audit — CLOSED (P1 + P2 + P3 ✅)

The full math audit is complete. Every aggregate metric now flows through a single
source of truth; no metric is computed in two places.

### P1 — Formula Unification ✅
- `calcTradeMetrics` unified to one canonical formula (`src/utils.js`); `openPnL` exposes missing-price.

### P2 — Formula & Semantic Drift ✅
- `fmt$` / `fmtR` consolidated in `src/utils.js`, imported in App.
- `expectancy` aligned to one canonical (dollar-value) definition.
- `winRate` standardized to 0–100 scale across all paths.
- `breakeven` semantics unified in streak logic.

### P3 — Inline Computation Sprawl ✅
- **Analytics tab** now reads setup/day/emotion/matrix aggregates from `useTradingStats` (hub extended with `totalR`/`avgR`).
- **PDF export** receives `stats` + `monthStats` (hub-scoped current month) instead of recomputing.
- **Equity curve** uses `calcTradeMetrics` (single pnl formula across hub, Analytics, PDF).
- CSV export left as raw per-trade dump (each row's `calcTradeMetrics` is canonical — no aggregate).
- Kept local (per-trade shaping, no aggregate twin): R-distribution, P&L-by-month, streak history, hold-vs-P&L scatter, per-trade bars.

## Hive Agents Context
`agents/_base.py` + `core/supervisor.py` — Python orchestrator.
- **S1** Pre-market (15:00) — Gap and Go
- **S2** Open (16:45) — ORB Breakout
- **S3** Mid-day (19:00) — Bull Flag
- **S4** Close (22:55) — Power Hour Break
- **S5** Post-market (23:30) — Earnings Gap Play
- **Supervisor** (23:55) — preflight + daily flush + weekly cleanup + Tech Team v2 audit → `PROPOSALS.md` + `TASKS.md`

Agents write **prompts** for Claude Code, not code directly.
Constants: `VALID_SETUPS` (30) · `VALID_EMOTIONS` (15) · `VALID_MARKETS` (14) + aliases.

## Known Issues / Workarounds
- Supabase Phone Auth = disabled (Twilio cost)
- Apple Login = disabled ($99/year)
- `holdDays`/`daysHeld` does **not** exist — compute from `date` + `exitDate`
- `t.date` is `"YYYY-MM-DD"` only — no hour data
- favicon PNG kept as fallback for old Safari
- **Yahoo Finance blocked on Vercel IPs** — returns 429 / TLS handshake failure from Vercel's server-side environment. Use `api/quote.js` (Finnhub + CoinGecko) for all live quote data.
- `followedPlan` arrives as `"true"`/`"false"` strings from Supabase — must normalize at load (done in App ~L112); do not compare with `=== true` on raw Supabase data.

---

## Recent Audit & Fixes (2026-05-26)

**Audited:** `SwingEdge_App.jsx` (5186 lines), all hooks/components/intelligence modules, services, config.

### Critical bugs fixed
1. **TradeCalendar.jsx (~L30)** — `String(raw).slice(0,10)` on `null`/`undefined` produced a `"null"` bucket of orphan trades on the calendar. Now rejects non-string `raw` and explicitly drops `"null"`/`"undefined"` keys.
2. **TradeDNA.js (`inferStyle` L77, `computeScores` L113)** — `Math.abs(t.entry - t.stop) * t.shares` silently propagated `NaN` into Risk dimensions when any field was missing/non-numeric. Now coerces with `Number(...)`, skips trades with non-finite fields, filters with `Number.isFinite`.
3. **priceService.js (`fetchOneQuote` catch L165)** — full proxy/Yahoo failure was swallowed silently. Now `console.warn` with symbol + reason for observability; return contract unchanged (callers still get `null`).

### Backlog — deferred (medium / cosmetic)
- 3× `key={i}` in list maps (App lines ~2236 / ~2253 / ~2580) → use stable `edge.ticker` / `lesson.id`.
- `useTradingStats.js:176` — function ref in deps array; wrap parent `calcTradeMetrics` in `useCallback`.
- `TradeDNA.calculateTradeDNA` recomputes O(n) on every edit — memoize by last-trade-id.
- i18n gaps: `TradeCalendar.jsx:110` hardcoded `עסקאות`; `TiltProtection.js:62–100` hardcoded EN/HE without a lang fallback.
- ✅ A11y: `aria-label` on all icon buttons + `htmlFor` label associations — fixed (cc32b45).
- Unused exports: `toYahooSymbol`/`fromYahooSymbol` in `priceService`. (`closedMetrics` now consumed by Analytics emotion blocks.)
- 9× `console.log` in error paths → switch to `console.warn` for consistency.

### Audit clean
- No `t.pnl` / `t.direction` / `t.reason` / `t.lesson` direct accesses anywhere in `SwingEdge_App.jsx`.
- No hardcoded Supabase keys, no `dangerouslySetInnerHTML`.
- All Supabase mutations + localStorage writes already wrapped in try/catch with cancellation tokens.
- All division operations guarded against zero.
