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
- `SwingEdge_App.jsx` — root component, ~5186 lines (single-file by design, post-launch split planned).
- `src/hooks/useTradingStats.js` — single source of truth for all aggregated stats.
- Auth flow: `AuthScreen` → (optional `ForgotPassword`) → `ResetPassword` (triggered by `?reset=true` in URL).

## Tabs Structure (NAV_KEYS)
`dashboard | journal | tools | analytics | intel | feedback`

⚠️ The `tools` tab has a sub-nav: `'analyzer' | 'calc'`.
If the URL points to `/analyzer` or `/position`, a `useEffect` routes the user into the `tools` tab automatically.

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
  emotionAtEntry: "FOMO" | "Confident" | "Patient" | "Neutral" | "Hesitant" | "Calm" | "Angry",
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
`calcTradeMetrics` lives in `SwingEdge_App.jsx` around line 327.

## Key Components

### Main
- `SwingEdge_App.jsx` — root
- `src/hooks/useTradingStats.js` — stats aggregation
- `src/supabaseClient.js` — Supabase client + sync

### Auth
- `AuthScreen.jsx` — Sign In / Sign Up / Google
- `ForgotPassword.jsx` — `resetPasswordForEmail`
- `ResetPassword.jsx` — `updateUser({ password })` (loaded when `?reset=true`)
- `Logo.jsx` — SVG swing-wave logo (3 variants)

### UI
- `ui/InfoTooltip.jsx` — tooltip with `position:fixed` + viewport-aware
- `TradeCalendar.jsx` — monthly calendar with P&L per day. Props: `{ trades, calcMetrics, lang }`

### Data
- `src/data/tooltips.js` — `TRADING_TOOLTIPS` (18 metrics + setup names, bilingual)
- `src/data/tickers.js` — 90+ `POPULAR_TICKERS` + `searchTickers()` + `getTickerMeta()`

### Intelligence
- `src/intelligence/core/LearningEngine.js` — adaptive channel reweighting
- `src/intelligence/core/AdaptiveLessons.js` — 6 patterns → personal lessons
- `src/intelligence/core/TiltProtection.js` — tilt detection
- `src/intelligence/core/TradeDNA.js` — 4 dimensions: Risk · Discipline · Consistency · Growth

### Services
- `src/priceService.js` — Yahoo Finance + 5min cache + CORS proxy fallbacks

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

## Coding Rules (Hive agents + Claude Code)
1. ❌ NEVER access `trade.pnl` directly — ✅ `const { pnl } = calcTradeMetrics(trade)`
2. ❌ NEVER use `t.direction` — ✅ `t.side`
3. ❌ NEVER use `t.reason` / `t.lesson` — ✅ `t.notes` / `t.lessonLearned`
4. ❌ NEVER add a new `useState` without checking if existing state can be reused
5. ❌ NEVER hardcode user-facing strings — ✅ `lang === 'he' ? '...' : '...'`
6. ❌ NEVER add new tab to NAV_KEYS without consulting CONTEXT.md — current: `dashboard, journal, tools, analytics, intel, feedback`
7. ❌ NEVER break TradingView widget config in Market Intel
8. ❌ NEVER force-push to main without explicit user permission ("א" or "כן force")
9. ❌ NEVER read-modify-write localStorage in render — ✅ `useState` + `useEffect`
10. ❌ NEVER fetch from APIs without try/catch + fallback

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
git checkout main
git merge --no-ff $(git branch --show-current) 2>/dev/null || true
git push origin main --force
git log --oneline -1
# echo "סיימתי ✅"
```

## Auto-recovery Rules
- Conflict → `git checkout --theirs . && git add . && git commit`
- Build fail → `npm install && npm run build`
- Push rejected → `git pull origin main --rebase && git push origin main --force`

## Pending Tasks (Roadmap)
1. ⏳ Sentry / error monitoring full setup
2. ⏳ 30 professional demo trades (prompt: `12-PRO-30-TRADES-PROMPT.md`)
3. ⏳ Google Analytics / Mixpanel
4. ⏳ Landing page + Waitlist
5. ⏳ Stripe (Free / Pro $19 / Team $49)
6. ⏳ Live Decision Coach
7. ⏳ Trading DNA monthly report
8. ⏳ Tilt Shield (full)
9. ⏳ Telegram bot — daily summaries
10. ⏳ Real-time market API (replace Yahoo)
11. ⏳ Apple Login (Phase 2 — Apple Developer $99)
12. ⏳ Split `SwingEdge_App.jsx` (5186+ lines) — POST-LAUNCH

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
- A11y: missing `aria-label` on `InfoTooltip` close button, `TradeCalendar` day cells, `AuthScreen` inputs.
- Unused exports: `closedMetrics` in `useTradingStats`, `toYahooSymbol`/`fromYahooSymbol` in `priceService`.
- 9× `console.log` in error paths → switch to `console.warn` for consistency.

### Audit clean
- No `t.pnl` / `t.direction` / `t.reason` / `t.lesson` direct accesses anywhere in `SwingEdge_App.jsx`.
- No hardcoded Supabase keys, no `dangerouslySetInnerHTML`.
- All Supabase mutations + localStorage writes already wrapped in try/catch with cancellation tokens.
- All division operations guarded against zero.
