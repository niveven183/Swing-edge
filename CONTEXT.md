# SwingEdge — Project Context

## Project Overview
SwingEdge הוא יומן מסחר מקצועי לסוחרי סווינג.
- **Stack:** React 18 + Vite 6 + Tailwind 3 + Recharts + date-fns 4
- **Deployment:** Vercel (auto from `main`)
- **Auth:** Supabase (Email + Google + Forgot/Reset Password)
- **Repo:** niveven183/Swing-edge
- **Local path:** /Users/nivhareven/Swing-edge
- **Supabase project:** zicstkfkwhzvmdkzpidm

## Current Build
- ⚠️ **Bundle hashes are deliberately not pinned here.** They drift on every build, and the
  Vercel-deployed hash will always differ from a local one (Vercel rebuilds independently), so a
  hash written into this file is stale the moment it is committed and misleads the next reader.
  What matters is that the bundle **rolled**, not that hashes match — see "Verify live deploys".
  For the current live hash use the Vercel connector or `fleet-weekly.yml`'s vitals step.

## Architecture
- `SwingEdge_App.jsx` — root component, ~5200 lines (single-file by design, post-launch split planned).
- `src/hooks/useTradingStats.js` — single source of truth for all aggregated stats.
- Auth flow: `AuthScreen` → (optional `ForgotPassword`) → `ResetPassword` (triggered by `?reset=true` in URL).
- **Routing (react-router-dom@7.17.0):** `main.jsx` wraps in `<BrowserRouter>`. `/` = `LandingGate` (redirects to `/app` if authenticated, else `LandingPage`). `/app` = `SwingEdge_App.jsx`.
- **R/R (single source):** all screens use `priceBasedRR(entry, stop, target)` + `inferSide(entry, stop, target)` from `src/utils.js`. Side-agnostic; SHORT handled correctly everywhere.
  - ⚠️ `inferSide` *infers* direction from price geometry, so it masks reversed/garbage input (a SHORT typed as LONG still "looks" valid). For validation and analysis pass the **explicit `side`** — do not rely on `inferSide`.
- **Term accessibility (single source):** `src/data/tooltips.js` = bilingual dictionary (~38 terms, he+en) + `TERM_LABELS`. `TermTooltip` (thin wrapper over `InfoTooltip`) is the only component that should render `?` term tooltips.

## Unified Analysis Engine (canonical — single source)
Both the **Log New Trade** form and the standalone **Trade Analyzer** run on one engine, `coachTrade`. There is no second analysis path.
- `coachTrade({ form, trades, dna, edges, regime })` — `src/intelligence/core/DecisionCoach.js:291`. Builds the `checks[]` array, aggregates a 0–100 confidence band, returns rich coaching output.
- `ideaFromForm(form)` — `DecisionCoach.js:14`. Maps `side / setup / emotionAtEntry / marketCondition / entryQuality` (+ entry/stop/target geometry) into the `idea` object every check consumes.
- **Log New Trade** entry point: `SwingEdgeAI.analyzeNewTrade(form, trades, snapshot)` — `src/intelligence/SwingEdgeAI.js:44`.
- **Trade Analyzer** entry point: `SwingEdgeAI.analyzeStandalone(input, trades, lang)` — `SwingEdgeAI.js:55` → `coachTrade` → `coachingToAnalyzerView(coaching, { entry, stop, target, shares, capital, lang })` adapter (`DecisionCoach.js:414`) flattens the rich output onto the flat shape the Analyzer view expects (`$risk` preserved in `explanation`).
- **Approach A (Adapter):** the Analyzer was unified *onto* `coachTrade` via the adapter — `coachTrade` itself was not modified, so Log New Trade behavior is byte-identical to before the unification.
- **Input validation (single source):** `validateTradeInputs(entry, stop, target, side)` — `src/utils.js:34`. Bilingual, LONG+SHORT, uses the **explicit `side`**. Invalid input → position cards render `"—"`, a red banner shows, and `handleSubmit` blocks the save (no garbage metrics persisted).

## Design System v3 (complete — all 9 screens)
- **Tokens:** `src/design/tokens.css:117-142`, `--v3-` namespace, 5 semantic channels + `-glow` rgba variants each: `--v3-accent #00C076` (profit), `--v3-loss #F43F5E`, `--v3-info #06b6d4` (equity/live data), `--v3-purple #A78BFA` (setup identity), `--v3-warn #F59E0B` (caution tier).
- **Rollout:** all 9 screens converted — Dashboard, Calc, Analytics, Navbar+Intel, Journal, Settings, Analyzer, Log New Trade (commits `7d4fc7e`, `20f415e`, `b623563` and the v3 series that followed).
- **Migration model (intentional, in-file comment at `tokens.css:118`):** screens migrate one at a time; the old token layer stays until every screen is converted — both systems coexist by design, not oversight.
- **`DecisionCoachPanel`** (`src/intelligence/ui/IntelligenceUI.jsx`) — verdict-driven styling keyed off `coaching.verdict`: `GO`=emerald, `CAUTION`=amber, `SKIP`=rose (glow-halo variant on the Log New Trade hero).
- ⚠️ **Tailwind gotcha:** `bg-[var(--v3-x)]/opacity` does not compile — use a hex-with-opacity value or the token's `-glow` variant instead.
- **Serif font budget:** 3–4 in-app uses only (Analytics hero, Journal empty state, Weekly Review) — don't expand without reason.

## Track B Features
- **B2 — Earnings Awareness** (`1d37162`): `api/earnings.js` — Finnhub `/calendar/earnings`, 6h cache (`EARN_TTL`), fail-open (stale cache or `null` on error), crypto symbols → `null`. Feeds a `timing` channel into Decision Coach; verdict clamps `GO→CAUTION` when `daysUntil≤2`.
- **B4 — Mentorship (full)** (`6949c8a`→`92ca3dd`): `supabase/migrations/20260711120000_mentorship_schema.sql` + `20260712090000_mentor_invite_rpcs.sql`. 3 tables — `mentorships`, `mentor_invites`, `mentor_notes` — plus `is_active_mentor()` (SECURITY DEFINER). RPCs `create_mentor_invite()` (8-char Crockford base32 code) and `redeem_mentor_invite(code)` (atomic compare-and-set claim). Mentor dashboard is read-only; notes are mentor-writes / mentee-reads. Model: full transparency, invite active immediately on redemption.
- **B3 — Notebook + Weekly Review** (`88cc6c8`): `supabase/migrations/20260712100000_journal_notes.sql`. `journal_notes` (free-form, 1–10k chars) + `weekly_reviews` (`last_reviewed_at`, rolling 7-day window). Summarizes the existing analysis engine's output — no new analysis logic added.
- **B1 — Multi-Account: NOT built.** Diagnosed/audited only. Deferred decisions (recorded here so they aren't re-litigated): per-account capital, real+paper account types only, `ON DELETE RESTRICT`, mentor sees all of a mentee's accounts.

## Tabs Structure (NAV_KEYS)
`dashboard | journal | notebook | weeklyReview | tools | analytics | intel | feedback` —
**8 tabs**, defined at `SwingEdge_App.jsx:644`. Note `id` ≠ `key`: the i18n keys for the last four
are `notebookTab`, `weeklyReviewTab`, `marketIntel`, `feedback`.

⚠️ The `tools` tab has a sub-nav: `'analyzer' | 'calc' | 'report'`.
If the URL points to `/analyzer` or `/position`, a `useEffect` routes the user into the `tools` tab automatically.
The `report` sub-tab renders the Trading DNA Monthly Report.

## Data Schema
localStorage key: `swingEdgeTrades`

⚠️ **The client shape below is not the DB shape.** The authoritative column list is
`TRADE_COLUMNS` in **`src/supabaseClient.js:29`** — 25 columns, verified against
`information_schema` on 2026-07-27. There is **no `create table public.trades` anywhere in the
repo** (14 migrations, none declaring columns), so `TRADE_COLUMNS` is the only written source of
truth for what the table actually holds. A documentation-only migration that declares the schema
is an open gap.

```ts
Trade = {
  id: string,
  ticker: string,
  date: "YYYY-MM-DD",        // entry date
  // ⚠️ exitDate is NOT a DB column and never was. It survives only as an *import*
  // field (src/import/synonyms.js) and is folded into `closedAt` by deriveCloseState.
  // Never persist it; never read it as a close date. See "Data chain" below.
  closedAt: string | null,   // ISO — the real close timestamp column
  createdAt: string,         // ISO — ⚠️ for imported trades this is the CSV date, not write time
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

## Data chain — the boundary layer (FIN Group 1, 2026-07-27)

Every trade crossing the Supabase boundary goes through **one pair of sister functions** in
`src/supabaseClient.js`. They exist because the asymmetry between them *was* the bug: `is_demo`
was written but never read back, so demo trades silently became real after a reload.

- **`tradeForSupabase(trade)` (`:67`)** — write side. Drops anything not in `TRADE_COLUMNS`.
  A dropped key that is **not** in `LOCAL_ONLY` (`:60` — `tradeImage`, `tradeImagePreview`,
  `_prediction`, `openDate`) triggers `console.error` naming the keys and the trade id. This is
  the mechanism that previously swallowed `exitDate` in silence.
- **`tradeFromSupabase(row)` (`:92`)** — read side. Undoes the single rename the write side
  performs. `is_demo` that is null/absent stays **absent**, so the client never sees a fabricated
  `isDemo: false`.
- **`isDemo: undefined` omits the column** rather than writing `false` — a save cannot clobber a
  flag it does not know about.
- **`src/lib/cleanTrades.js`** — `cleanTrades` / `purgeInvalidTrades`, extracted out of
  `SwingEdge_App.jsx` as pure logic. `cleanTrades` is what strips `SIM-` / `Hive-` prefixes, which
  means the old demo-detection heuristic erased its own input and could only ever work once.
- **`src/lib/tradeCloseState.js`** — `deriveCloseState({ exit, exitDay, prev })`. `status` is
  **derived from the presence of `exit`**, so `CLOSED` without an `exit` is not merely undesirable,
  it is inexpressible. Clearing `exit` reopens the trade and clears `closedAt`.
- **`npm run test:datachain`** (`scripts/dataChain-test.mjs`, 22 assertions) guards all of the
  above and runs inside `npm run verify`.

## Fleet & monitoring layer (17 workflow files)

`.github/workflows/` — 17 files, 12 of them on a `schedule`. Two watchers sit above the rest and
catch **different** failure modes; neither replaces the other:

- **`failure-alert.yml`** — `workflow_run` on 11 named workflows, fires on `conclusion == 'failure'`.
  Catches **"ran and failed", immediately.** Deliberately excludes Smoke Tests / Build /
  Supabase Backup (covered by `triage.yml`'s own `workflow_run` list) and Restore Drill
  (self-alarms on `always() && status != 'pass'`) to avoid duplicate mail.
- **`watchdog.yml`** (08:00 UTC) — asks "when did each scheduled workflow last *succeed*?" against
  a fixed `MAXAGE` table (hours), and **always** posts to Discord, green included. Catches
  **"never ran at all"** — cron disabled, secret expired, workflow file broken — which
  `failure-alert` structurally cannot see, because no `failure` event is ever emitted.
  It also greps the checked-out tree for `schedule:` triggers missing from `MAXAGE` and for
  `MAXAGE` keys with no file, so the table cannot drift silently. **`watchdog.yml` excludes
  itself from `MAXAGE` by design (`:100`) — its own silent death is the one uncovered case.**

| Workflow | Cron (UTC) | Role |
|---|---|---|
| `sentinel.yml` | `20,50 * * * *` | Public-domain + authenticated QA against **production**, real browser (Playwright). De-dupes repeat incidents via the Actions cache; its own silence is treated as a fault (heartbeat 4×/day) |
| `daily-digest.yml` | `0 4 * * *` | Daily digest; unresolved user feedback also goes to Discord |
| `smoke.yml` | `0 4 * * *` | Playwright smoke; also runs on every push to `main` |
| `fleet-daily.yml` | `0 6 * * *` | Fleet vitals + Growth Pulse (3 🟠 thresholds: 0 trades/48h, 0 signups/72h, activation < 25%) |
| `user-analytics.yml` | `30 6 * * *` | Daily user-behaviour report — see below |
| `fleet-weekly.yml` | `0 7 * * 0` | Weekly vitals + `TRUTH.md` staleness check |
| `watchdog.yml` | `0 8 * * *` | Watches the watchers |
| `arch-auditor.yml` | `0 5 * * 0` | Architecture audit |
| `analyst.yml` | `0 6 * * 0` | Analyst report |
| `backup.yml` | `0 3 * * 0` | Encrypted Supabase backup |
| `data-guardian.yml` | `0 5 */3 * *` | Data invariants |
| `restore-drill.yml` | `0 4 1 * *` | Monthly restore drill (was quarterly) |

Non-scheduled: `build.yml`, `health.yml`, `triage.yml`, `email-campaign.yml`, `failure-alert.yml`.

### Discord reporting pattern (the standard for new workflows)
`env:` **at step level** + a runtime gate + `continue-on-error: true` + `jq` for the payload:

```yaml
- name: Report to Discord
  continue-on-error: true          # a reporting failure must never fail the job
  env:
    DISCORD_WEBHOOK: ${{ secrets.SENTINEL_DISCORD_WEBHOOK }}
    X_SUMMARY: ${{ steps.foo.outputs.summary }}
  run: |
    if [ -z "${DISCORD_WEBHOOK:-}" ]; then
      echo "::warning::SENTINEL_DISCORD_WEBHOOK not set — skipping Discord."; exit 0
    fi
    payload="$(jq -n --arg d "$X_SUMMARY" --argjson c 3066993 '{embeds:[{description:$d,color:$c}]}')"
    curl -sS -o /dev/null -w 'discord POST -> HTTP %{http_code}\n' \
      -X POST -H "Content-Type: application/json" -d "$payload" "$DISCORD_WEBHOOK"
```

Rules this encodes:
- **`${{ }}` belongs in `env:`, never inside `run:`.** Interpolating an expression directly into a
  shell body is a command-injection vector — the value is pasted as *script text*, not as data.
- A **runtime** gate (`[ -z … ]` + `::warning::`), not `if: env.X != ''`, so a missing secret is
  announced rather than silently skipped.
- `jq -n` builds the JSON; never hand-concatenate a payload containing user or report text.
- ⚠️ **Two files still deviate: `triage.yml` and `restore-drill.yml`** carry `${{ }}` inside `run:`
  blocks. Known, not yet migrated — do not copy that shape into anything new.

### 🔒 Public-repo constraint (load-bearing)
The repo is **public**, so run logs, job summaries, artifacts **and the Actions cache** are all
world-readable. Consequences that are already baked into the fleet:
- Per-user detail goes out by **email only**; Discord gets aggregates; stdout carries aggregate
  integers.
- **GitHub Actions logs an action's `with:` inputs.** Content handed to an action inline is
  therefore published. Sensitive bodies are passed **by file path**
  (`body: file://analytics-report.txt`), never inline. See `docs/INCIDENTS.md` #8.
- `::add-mask::` any value that must not appear in a log, at the moment it is created.

### `user-analytics.yml` + `scripts/user-analytics.mjs`
Daily "what do users actually do after signup" report, built entirely on data Supabase already
stores: **zero instrumentation, zero writes, zero schema change.** Four privacy red lines are
enforced by guards that **throw rather than degrade**: journal content (`notes`, `lessonLearned`,
`journal_notes.*`, `mentor_notes.*`) is never read, only counted and measured for length; user ids
are truncated to 8 chars; behaviour and structure only; **k-anonymity** — any segment under 3 users
is reported as `"1-2"`. Day-over-day state (aggregate integers only) lives in the Actions cache,
plus a **volume-swing alarm**: any aggregate moving more than ±20% against yesterday gets its own
🟠 line, and a >20% *drop* turns the report red. That guard exists because a user deleted 173 rows
on 2026-07-27 and — with no `deleted_at` and no `updatedAt` on `trades` — **no time-window query
could see it**; it went unnoticed for ~3 hours.

## Analytics & privacy (GA4 + Consent Mode v2)

- **GA4 `G-VC8PKL4NL1`**, configured in `index.html` in a fixed 5-step order: dataLayer + shim →
  `consent default` **all denied** → replay a stored grant → `config` → async `gtag.js`. The order
  is load-bearing: `gtag.js` is async and appears *after* the block, so it cannot run first.
- **Deny by default.** The consent default is pushed as `dataLayer[0]` unconditionally.
  `gcs=G100` → `G101` on the wire is the proof that a grant took effect.
- **`src/lib/consent.js`** is the single source of truth for the `swingEdgeConsent` record
  (`{v, analytics, ts}`): `readConsent` / `grantAnalytics` / `denyAnalytics` / `revokeAnalytics`
  (which also deletes `_ga*` cookies) / `subscribeConsent`.
- `src/components/ConsentBanner.jsx` — non-modal Hebrew banner; `ConsentControl` on `/privacy`
  gives a working opt-out.
- ⚠️ **`anonymize_ip` is a no-op in GA4** (it is a Universal Analytics parameter; it is passed in
  `config` but carries no compliance weight). Compliance comes from **Consent Mode**, not from it.
- **`@vercel/analytics` is deliberately not gated** (`src/main.jsx:12`) — it is cookieless and
  stores no identifier on the device. The reasoning is spelled out to the user on `/privacy`.
- **Data-pollution guard:** the Playwright specs abort requests to googletagmanager and
  `sentinel-auth` clicks decline — otherwise the monitoring fleet would manufacture ~100 synthetic
  pageviews/day against a real user base of ~29.

## Financial-integrity audit (2026-07-27) — reference, not duplicated here

Full document: **`docs/audits/AUDIT-2026-07-27-financial-integrity.md`** — 46 findings
(🔴 27 · 🟠 14 · 🟡 4 · ⚪ 1). Read it there; do not restate its findings elsewhere.

The one structural fact worth carrying in context, because it explains most of the symptoms:
**the app has two parallel statistical universes that disagree on three axes at once.**

| | `src/hooks/useTradingStats.js` | `src/intelligence/utils/statisticalModels.js` |
|---|---|---|
| winRate scale | 0–100 | 0–1 |
| drawdown | percent | fraction |
| break-even | neither win nor loss | **counted as a loss** |
| "closed" | `status === "CLOSED"` | `status === "CLOSED" && exit != null` |

On top of both, `SwingEdge_App.jsx` recomputes equity curve, position size, W/L counts and total
P&L **inline** — a third path answerable to neither.

Repair order is fixed: **Group 1 (data chain) → 2 (single source of truth) → 3 (the R contract) →
4 (dates)**. **Group 1 is done** (see "Data chain" above). Note that the audit's own stop-rate
numbers were re-measured on 2026-07-28 after a 173-row deletion — the corrected figures are at the
top of §6 of the audit.

## Journal import — known state

Pipeline: `parseFile` → `detectColumns` → `normalizeRow` → `buildImport` (`src/import/`).
`REQUIRED_FIELDS = ["ticker", "entry", "shares"]` (`synonyms.js:24`) — a row missing any of the
three is rejected.

🔴 **The dictionary is missing `שער`** — the standard Hebrew word for *price* at Israeli brokers.
`FIELD_SYNONYMS.entry` (`synonyms.js:9`) lists `מחיר כניסה`, `כניסה`, `מחיר קנייה`, `מחיר קניה`,
and nothing else in Hebrew. Verified by reading the file. Consequence: an IBI or Altshuler export
maps **no** `entry` column, `entry` is required, and **every row is rejected** — the user sees an
import that produces zero valid trades with no obvious reason.

Broker-specific facts (observed by Niv in real exports — **not** verifiable from this repo):
- **IBI** — headers on **row 11**, signed quantity, and **6 of 8 action types are not trades** at
  all (dividends, fees, transfers…). Price column: *שער עלות ממוצע*.
- **Altshuler** — headers on **row 1**, unsigned quantity, `side` must be read from a text column,
  symbol column present. Price column: *שער ביצוע*.

Two conclusions that should shape any import work:
1. **There is no "Israeli format" — there is a profile per broker.** The two differ on header row,
   sign convention, and how direction is expressed.
2. **The current model assumes "one row = one complete trade".** Brokers export an **action
   ledger**: a trade is opened by one row and closed by another, possibly months apart, with
   non-trade rows interleaved. Mapping columns better will not bridge that gap on its own.

## Key Components

### Main
- `SwingEdge_App.jsx` — root. `AdminPanel` is lazy-loaded via a `lazyWithRetry` wrapper (top of file): detects stale-chunk `ChunkLoadError`, reloads once via a `sessionStorage` flag, then gives up (commit `60d6fe0`).
- `src/hooks/useTradingStats.js` — stats aggregation
- `src/supabaseClient.js` — Supabase client + sync
- `src/utils.js` — canonical math helpers: `calcTradeMetrics`, `fmt$`, `fmtR`, `CAPITAL`, `RISK_PCT`, `priceBasedRR(entry,stop,target)`, `inferSide(entry,stop,target)`

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
- `ui/TermTooltip.jsx` — thin wrapper over `InfoTooltip`; looks up term in `TRADING_TOOLTIPS` + renders `TERM_LABELS[term]` as the trigger. Use this for all `?` term tooltips.
- `TradeCalendar.jsx` — monthly calendar with P&L per day. Props: `{ trades, calcMetrics, lang }`
- `src/components/TradingViewSearch.jsx` — professional symbol autocomplete (debounce, AbortController, keyboard nav)
- `src/components/PrivacyModal.jsx` — privacy/security modal (accessible from profile dropdown)

### Data
- `src/data/tooltips.js` — `TRADING_TOOLTIPS` (~38 terms, bilingual he+en) + `TERM_LABELS` (display labels per term). Single source for all term definitions.
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
- `api/quote.js` — Vercel serverless function. **Stocks/ETFs → Finnhub** (`/api/v1/quote`, requires `FINNHUB_API_KEY` env var). **Crypto → CoinGecko** (`/simple/price`, keyless). Yahoo Finance was the original source but is blocked on Vercel IPs (429 / TLS handshake failure) and is no longer used for quote data. Finnhub responses cached 15s in-memory (`_fhCache`) with stale-on-error fallback to absorb 429 rate limits.
- `api/symbol-search.js` — Vercel serverless function; proxies TradingView symbol search (spoofs `Referer` header). Dev proxy in `vite.config.js`.
- `api/earnings.js` — see Track B2 above.
- `api/health.js` — dependency health check. `NON_FATAL = new Set(["twelvedata","finnhub","coingecko"])`; Supabase is the sole hard-fail dependency — 503 only if Supabase (or a future non-listed check) fails, non-fatal services degrade to a `warnings` array with 200.
- `api/verify-turnstile.js` — Cloudflare Turnstile bot protection on signup only (not signin), fail-open on 5xx. Requires Vercel env vars `VITE_TURNSTILE_SITE_KEY` (frontend, `AuthScreen.jsx`) + `TURNSTILE_SECRET_KEY` (server).

### Vision (legacy, still in repo)
- `src/vision/ChartVisionEngine.js` — TradingView screenshot parser
- `src/vision/readers/*` — image preprocessing + price-axis reader

## Features Built (Recent Updates)
- ✅ **Stage 1 — shared input validation + invalid-input state** (034beff): `validateTradeInputs(entry,stop,target,side)` in `src/utils.js:34`. Bilingual, LONG+SHORT, uses the explicit `side` (not `inferSide`, which masks reversed input). Invalid input → cards show `"—"` + red banner + `handleSubmit` blocks the save.
- ✅ **Stage 1.5 — position cards single-share baseline** (18d1bed): when input is *valid* but `posSize` floors to 0 (default account $2,500 + 1% risk → `posSizeTooSmall` at `SwingEdge_App.jsx:1716`), cards fall back to a single-share baseline — `SHARES=1` (amber), `POS=$entry`, `MAX RISK=$riskPerShare` (rendered `SwingEdge_App.jsx:5165–5173`). R/R unchanged; sharpened amber banner.
- ✅ **Stage 2 — unified analysis engine** (160098a): Approach A (Adapter). Both Log New Trade and the Analyzer now run on `coachTrade`. Analyzer goes `analyzeStandalone` → `coachingToAnalyzerView` (`DecisionCoach.js:414`); gains history/DNA + bilingual; `$risk` preserved in `explanation`. `coachTrade` untouched → Log New Trade identical.
- ✅ **Stage 3a — live price in Trade Analyzer** (611bef0): reuses `fetchQuote` (`priceService.js:258`, Finnhub/CoinGecko via `api/quote.js`). 250ms debounce, gated on the Analyzer sub-tab being active; auto-fills `entry` only when empty.
- ✅ **Stage 3b — rich Trade Context in Analyzer** (0ada3d5): Analyzer form (`SwingEdge_App.jsx:1095`) gained `setup / notes / marketCondition / emotionAtEntry / entryQuality` (reusing Log New Trade UI). Fed to the engine via `analyzeStandalone` → `ideaFromForm`, which lights up checks that were dormant in the Analyzer path (it never supplied those fields): `emotionalCheck`, `setupMarketComboCheck`, `patternMatchCheck`, `regimeCheck`.
- ✅ **Landing page** (2940a67): `src/components/LandingPage.jsx`, bilingual he/en, hero + bento features + pricing; CTAs → `AuthScreen`.
- ✅ **Auth screen redesign** (b99230a, 8dd3a85): `src/components/AuthScreen.jsx` — dark grid background, required `nickname` (Supabase `user_metadata`), tagline "המאמן האישי שלך לשוק ההון".
- ✅ **New green logo** (20ae7f0): zigzag price-curve logo across favicon set + `src/components/Logo.jsx` + LandingPage.
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
- ✅ **Shared price-based R/R helper** (1feab31): `priceBasedRR` + `inferSide` added to `src/utils.js`. Analyzer fixed (`azRRRatio` was shares-based, hardcoded LONG); 4 call-sites unified. Position Calculator has no target field → no R/R there.
- ✅ **Term accessibility infrastructure** (4275fd0): `TermTooltip` component + bilingual glossary expanded in `src/data/tooltips.js` (was ~32 terms; added rr/mfeMae/wilson/discipline + `TERM_LABELS`). rr tooltip is definition-only, no trade recommendation.
- ✅ **Term accessibility rollout** (876e2e9): 13 old `InfoTooltip` usages → `TermTooltip`; 11 new terms gained `?` across all 6 screens. Entry form kept clean (selective `.map`).
- ✅ **SEO full** (b93d053): `robots.txt` + `sitemap.xml` in `public/` (served before SPA rewrite, no `vercel.json` change needed). JSON-LD `WebApplication`/`FinanceApplication`, hreflang he/en/x-default, Twitter cards, `og:image` absolute URL.
- ✅ **Log New Trade redesign + bug fixes** (c429ebd): SHORT bug fixed (root: `posSize` crash, not sign issue). R/R in form moved to price-based. Full window audit + redesign (`max-w-2xl`, Trade Context collapsible). Entry Quality connected to Edge Finder/Trade DNA/stats via `qstars()` (1–10 → 1–5). Local Analysis merged into Decision Coach (button+box removed). OCR retained with "לא בענן" caption.
- ✅ **R/R card shows "–" until target entered** (7a6c1a6): Consistency with Analyzer and Journal; prevents misleading "10.00:1 green" before target is typed.
- ✅ **UI polish** (2179c63): Calculator floor hint when shares=0. Max DD tooltip `$`-aligned (was `%`). Avg Win / Avg Loss gained `?` + added to glossary.

## Workflow
- **Claude chat** (Opus/Sonnet via claude.ai) writes prompts and designs features.
- **Claude Code** (this session, Sonnet) executes: reads files, edits code, runs build, commits, pushes.
- **Vercel** auto-deploys from `main` — deployment is the final validation step.
- Hive agents (Python) write `PROPOSALS.md` / `TASKS.md` prompts overnight; Claude Code implements them.

### Working procedures (handoff-critical)
- **One task per prompt.** Split large tasks into sub-stages (Stage 3 → 3a / 3b / 3c / 3d). Keeps each diff reviewable and each deploy verifiable.
- **Verify live deploys via Claude chat + the Vercel connector — not `curl`.** `curl` hits the "Vercel Security Checkpoint" anti-bot wall (`x-vercel-mitigated: challenge`) and fails. The local build hash will **always** differ from the deployed one (Vercel rebuilds independently); what matters is that the bundle *rolled*, not that the hashes match.
- **Verify commit hashes via `github.com/[repo]/commits/main.atom`** — the Atom feed of `main` returns the latest commit SHAs without hitting the GitHub API rate-limit (bypasses the 60 req/hr unauthenticated cap). Use it to confirm a push landed on `origin/main`.
- **Mobile verification = emulation on the *production* URL inside a 390px iframe.** Chrome's own window has a floor of ~500px, so a raw resize can't reach true phone widths — an embedded 390px iframe (iPhone-class) against the deployed site is the reliable way to reproduce mobile layout. Landscape/RTL clipping and safe-area behavior only show up here, not in a resized desktop window.
- **Read-only tests run against a real account.** Verification of live data (stats, calendar, journal counts) is done by observing a real logged-in account read-only — no writes, no test-trade pollution.
- **Prompt structure:** header (model / plan-mode / session / connectors) → "read, don't change" guardrail → diagnosis → Plan → execute → mandatory git block.
- **`src/index.css` override layer** (~L86–100): a restyle layer that remaps Tailwind text-color utilities (`.text-white`, `.text-slate-*`, etc.) to CSS variables. Dark screens fight this layer — prefer inline colors over Tailwind text utilities there.
- **`npm run test:coach` is mandatory before any change to an intelligence engine** (`scripts/coach-invariance-test.mjs`, 110 assertions) — asserts `coaching.verdict` is byte-identical across the fixture set. Run it before *and* after touching anything under `src/intelligence/` (including `CoachPersona`, `DecisionCoach.js`, knowledge-base data files) to catch accidental verdict drift.
- **`npm run test:import` (6 fixtures) is mandatory alongside `test:coach`** — run it before any change under `src/import/` or to the trade schema. Guards the CSV/XLSX parse → column-detect → normalize → build pipeline against silent regressions (synthetic-zero leakage, date misparsing, column-mapping drift).
- **Waves 8+10 lesson — "done" requires an explicit push to `main`.** A task is only complete when the push output shows the branch landing on `main` (`..HEAD -> main` in the report). Working on a `claude/*` branch **without pushing to `main`** was caught **twice** by an independent tarball verification — the local commit existed but the deploy never rolled. Always confirm the `-> main` line before reporting "סיימתי".

## Coding Rules (Hive agents + Claude Code)
1. ❌ NEVER access `trade.pnl` directly — ✅ `const { pnl } = calcTradeMetrics(trade)` (import from `./src/utils.js`)
2. ❌ NEVER use `t.direction` — ✅ `t.side`
3. ❌ NEVER use `t.reason` / `t.lesson` — ✅ `t.notes` / `t.lessonLearned`
4. ❌ NEVER add a new `useState` without checking if existing state can be reused
5. ❌ NEVER hardcode user-facing strings — ✅ `lang === 'he' ? '...' : '...'`
6. ❌ NEVER add new tab to NAV_KEYS without consulting CONTEXT.md — current 8: `dashboard, journal, notebook, weeklyReview, tools, analytics, intel, feedback`
7. ❌ NEVER break TradingView widget config in Market Intel
8. ❌ NEVER force-push to main. אסור מוחלט — ראה `CLAUDE.md` §5. נאכף ב-`.githooks/pre-push`.
9. ❌ NEVER read-modify-write localStorage in render — ✅ `useState` + `useEffect`
10. ❌ NEVER fetch from APIs without try/catch + fallback
11. ❌ NEVER call `edgeScore`/`rankSetupEdges` inline — ✅ import from `src/intelligence/utils/statisticalModels.js`

### Procedures that changed (2026-07) — these override the older text above
- **Plan Mode is no longer the approval channel.** `CLAUDE.md` §9: approval to leave Plan Mode is
  permission to **write files only**. The first and only action after leaving it is writing the
  full plan to `docs/plans/PLAN-YYYY-MM-DD-<slug>.md`, its own commit
  (`docs(plan): … — awaiting approval`), push, **then stop**. Claude re-reads the pushed file from
  origin — not from memory — before execution begins. Plans travel through the repo, not the chat.
- **Git hooks are mandatory and are not inherited by `clone`.** `.githooks/pre-commit` (blocks
  `HANDOFF*.md`) and `.githooks/pre-push` (blocks non-fast-forward). `core.hooksPath` is **local
  config**, so a fresh clone has no protection until:
  `git config core.hooksPath .githooks && chmod +x .githooks/*`
- **`npm run verify` is now 5 steps:** `test:coach` → `test:import` → `test:settings` →
  `test:datachain` → `build`. Paste the full output; "passed" is not proof.
- **`git add` names files explicitly.** Never `git add .` / `-A` — it is how `.env`, report files
  and stray artifacts get committed.
- **Measurement: `count(*)`, never `reltuples`.** The `rows` value from Supabase MCP `list_tables`
  is `pg_class.reltuples` — a planner estimate refreshed only by autovacuum. Any number that
  reaches a report or a document must come from an exact count, and must carry the date it was
  measured, or it goes stale in silence.
- **A difference between two measurements: check what changed in the data before suspecting the
  tool.** On 2026-07-27 a 285→114 gap was attributed to measurement instability; it was a real
  deletion of 173 rows, and both read paths had been correct the whole time.

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
npm run verify                      # 5 steps — paste the full output, not a summary
git add path/to/file …              # explicit paths only — never `git add .` or `-A`
git commit -m "[descriptive message]"
git push origin main
git log --oneline -1
# "סיימתי" is valid only if the push output contains `..HEAD -> main`
```

## Auto-recovery Rules
⚠️ **This section was rewritten 2026-07-28. The previous version told the agent to run
`git checkout --theirs .` on conflict — that discards work with no confirmation and directly
contradicts `CLAUDE.md` §4. It must not be reintroduced.**

- **Unclean tree or a failed `pull` → STOP and report.** No auto-`stash`, no `checkout --`, no
  "I'll sort it out". An unfamiliar file may be Niv's work in progress.
- **Merge conflict → STOP and report.** Never resolve by picking a side wholesale.
- **Push rejected → STOP and report.** Never force-push: no `--force`, no `--force-with-lease`,
  not "with approval" (`CLAUDE.md` §5, enforced by `.githooks/pre-push`).
- Build fail → `npm install && npm run build`, then read the actual error before changing anything.
- Bypassing a hook is `--no-verify` only, emergencies only, **and it is logged in
  `docs/INCIDENTS.md`**.

## Pending Tasks (Roadmap)

### Sprint 2 — Open
1. ⏳ GA4 / Analytics integration — **blocked on Niv** (needs Measurement ID G-XXXX from GA4 account)
2. ✅ SEO — meta tags, sitemap, og:image — **CLOSED** (b93d053)
3. ⏳ Privacy Policy + Terms of Service pages — **blocked on Niv** (legal review required; blocks Stripe)
4. ⏳ Stripe (Free / Pro $19 / Team $49) — **blocked on Niv** (identity + bank; after Privacy+ToS)
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

## QA Status (2026-06-16 Session)

### Fixed this session
- **F1** 🟠 R/R card showed "10.00:1 green" before target entered → fixed (7a6c1a6)
- **F2** 🟡 Calculator floor hint missing when shares=0 → fixed (2179c63)
- **F3** 🟡 Max DD tooltip showed `%` instead of `$` → fixed (2179c63)
- **F4** 🟡 Avg Win / Avg Loss had no `?` tooltip → fixed (2179c63)

### Backlog (🔵 non-critical, not yet scheduled)
- **F5:** Glossary terms `sharpe` + `expectancy` exist in `tooltips.js` but no `?` is wired on any screen.
- **F6:** TradeDNA 4 dimensions (Risk/Discipline/Consistency/Growth) — umbrella `dna` tooltip exists; individual dimension `?` not added. `discipline` key is in glossary but not connected to a label in any `.map`.
- **F7:** `✕` close button in `InfoTooltip` uses `right-2` physical offset → incorrect position in RTL (cosmetic only).
- **F8:** `?` trigger does not open on keyboard `focus` (only `Enter`/`Space` on click) — valid for click-tooltip pattern; optional a11y upgrade.

## Stage 4 — Coach Upgrade (open gaps, identified 2026-06-22)
After the engine unification (Stage 2) and the Analyzer rich-context wiring (Stage 3b), these coach-quality gaps surfaced and are the focus of Stage 4:
- **English insights under a Hebrew UI** — coach output is still English while the surrounding interface is Hebrew. Needs a full bilingual pass on the coach strings.
- **Duplicate message** — "You tend to lose under Neutral" appears twice (once as ⚠️, once as 💡). De-dup needed.
- **Contradictory insights** — a positive edge ("Matches top edge 100% win") is shown alongside a warning ("tend to lose under Neutral") for the *same* trade. Needs prioritization / conflict resolution before display.
- **`notes` / `lessonLearned` not analyzed** — both are persisted but the coach never reads them.
- **`entryQuality` consumed only in the Analyzer path** — pre-3b it was read but unused; Stage 3b wired it into the Analyzer, but coverage is still partial.

## Roadmap — On the axis (next)
- **Stage 3c** — X / reset control for the uploaded image and the calculator in the Analyzer.
- **Stage 3d** — image that actually analyzes (gated on the OCR decision in Stage 5).
- **Stage 5 — OCR architecture decision.** `src/vision/ChartVisionEngine.js` uses Tesseract.js, which is architecturally too weak for a dark TradingView chart. `handleAnalyzerImageUpload` currently only calls `setPreview` — the upload is decorative until OCR is resolved.

## Hive Agents Context — retired 2026-08-06
The Python orchestrator (`agents/_base.py`, `core/supervisor.py`, `core/constants.py`) was
**deleted**: 5 files, zero importers, never wired into the React app. Design record kept at
`docs/archive/HIVE_ARCHITECTURE.md`. Recover code with `git show 1063f69:core/supervisor.py`.

Its `VALID_SETUPS` / `VALID_EMOTIONS` / `VALID_MARKETS` were **Python-side constants and are
gone with it** — they never matched the app. The live, canonical enums are
`SETUP_VALUES` · `EMOTION_VALUES` · `MARKET_VALUES` in `src/data/tradeEnums.js`
(single source of truth; `tradeOptions.jsx` re-exports them). Those `value` strings are
**load-bearing** — see `CLAUDE.md` §13 before touching one.

## Cowork Autonomous Agents
Run **outside this repo** (no code here references them) — ops/maintenance agents, distinct from the trading-idea Hive agents above:
- **#7 Dispatcher** [🔧] — hourly. Reads email alerts, diagnoses, drafts a Claude Code prompt as a Gmail draft. Never executes directly.
- **#8 Cost** [💰] — daily.
- **#9 Growth** [📈] — daily.
- **#10 Vitals** [📊] — weekly.

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

---

## Distribution-Readiness Waves 1–4.1 (2026-07)

A pre-distribution sprint: wire the onboarding→coach pipeline, fix data-viz honesty, complete bilingual coverage, and make the app usable on a real phone. Each wave is one reviewable commit.

- **Wave 1 — onboarding wired** (`c74c512`): onboarding now feeds the app for real. `profileName` is captured and used; capital is entered **manually in `$`** (no more hardcoded default) and drives **bucket derivation** downstream. Closes the "onboarding is decorative" gap from the pipeline audit (`ee359fd`, `docs/ONBOARDING-COACH-AUDIT-2026-07-13.md`).
- **Wave 2 — R-01 hold-time scatter** (`e9bad7d`): the Hold-vs-P&L scatter had a hard floor that flattened the axis. Fix removes the floor, uses an **auto domain**, and spreads the demo holds so the distribution is legible instead of collapsed onto one value.
- **Wave 3 — i18n sweep (he+en full)** (`9efa423`): localized remaining hardcoded UI strings + enum **display labels** via a central `labelFor(kind, value, lang)` helper in **`src/i18n.js`** (single source for enum→label). `regimes.json` made **bilingual** (regime knowledge in he+en). **L-01 reclassified** as a user-facing-text issue.
- **Wave 4 — mobile layout** (`4e70fd7`): **FAB hide-on-scroll** wired to both `window` and the `main` scroll container (closes M-02/R-05 from the earlier QA); **footer wraps** instead of overflowing (M-01); **StatCard** value/label made responsive with proper padding (M-03/M-05); setup **badge unclipped**.
- **Wave 4.1 — mobile hotfix** (`834870d`): Setup Matrix table switched to **`table-fixed sm:table-auto`** with explicit column widths (**46/49/44/78px**) so it fits the viewport without RTL clipping; mobile trade card reflowed to **3 rows** so the meta row no longer overlaps. Root cause + prevention logged in `docs/INCIDENTS.md` (`table-layout: auto` let a variable-width column blow past the viewport in RTL).

### Mobile UX Audit (2026-07-15) — verdict: ready to distribute
`docs/MOBILE-UX-AUDIT-2026-07-15.md` (`bd6c388`). Full mobile pass, HE/EN, emulated at 390px against production.
- **Score: 0 🔴 blockers · 3 🟠 fix-soon · 7 🟡 polish.** No finding blocks distribution — verdict is "good enough for a first friends round."
- **The 3 🟠 (fix before *wider* distribution):**
  - **M-01** — dark-theme muted text fails WCAG AA (`#334155` on `#0d1424` = 1.84:1); raise `--text-muted`/`--text-tertiary` to ≥`#8A97A8` (~4.6:1).
  - **M-02** — language leak: Analytics "Win Rate by Setup" shows English setup names under Hebrew (axis `tickFormatter`/tooltip `labelFormatter` bypass `labelFor`); wrap both in `labelFor("setup", …, lang)` (`SwingEdge_App.jsx:4758`/`4763`).
  - **M-03** — no `env(safe-area-inset-*)` despite `viewport-fit=cover`; FAB/footer sit under the home indicator. Add safe-area padding to FAB/footer + sticky headers.
- The 7 🟡 (M-04…M-10): sub-11px fonts, small "?" touch targets, TradingView ∅ placeholders, degenerate equity Y-axis, contradictory Journal counters, theme-default mismatch (landing dark / `/app` auto→light).

## Waves 6–7 — Coach knowledge audit + charts polish (2026-07, CLOSED)

- **Wave 6.1 — knowledge audit** (`698dc1c`): 43 knowledge-base entries audited against the trading canon (setups/rules/psychology/regimes). Findings documented in the audit doc; no code changes in this commit (docs only).
- **Wave 6.1b — apply corrections** (`6f9678d`): 7 items from the audit applied — **values only, keys untouched** (no schema/API break; downstream consumers unaffected).
- **Wave 6.2 — profile-aware coach** (`be8fe4f`): new **`CoachPersona`** adaptation layer sits on top of `coachTrade` — adapts tone/emphasis to the user's profile without touching the underlying verdict logic. Verified with a dedicated **coach-invariance test** (110 assertions): the `verdict` field is byte-identical before/after the persona layer for every fixture. This is the regression guard for the whole coach engine going forward.
- **Wave 6.3 — strategy-aware emphasis + profile recommendations** (`3f6b081`): knowledge emphasis now varies by the trader's stated strategy; profile-ready screen recommendations overhauled to use this.
- **Wave 7 — charts + polish** (`9f3f5ac`): closes QA-AUDIT (R-02..R-04, P-01..P-05) + MOBILE-UX-AUDIT (M-04..M-10) + production scroll dead-zone **D1**. Display/layout only:
  - **D1** — removed an inert nested `overflow-auto` on `<main>`; the document is now the sole scroller (this was the root cause of the production scroll dead-zone).
  - Dynamic equity Y-domain + `fmtAxisMoney` → distinct tick labels (R-02/M-08); chart axis ticks 9–10px → **11px** (M-05).
  - Footer version now sourced from **`__APP_VERSION__`** (single source = `package.json`) (P-02).
  - Active-tab text contrast emerald-600 → 700, ≥4.5:1 (P-04).
  - Watchlist name 8px → 11px + `dir=ltr` ellipsis (M-04/P-05).
  - `InfoTooltip` **`?`** hit area enlarged to 44×44 (visual glyph still 20px) (M-06).
  - Journal counters aligned to one base array — total/open/closed no longer drift (M-09).
  - `ThemeContext` initial resolved mode now matches `index.html` pre-paint — no boot flash (M-10).
  - `MarketPulseCardSkeleton` placeholders added for unresolved indices — no row-gap while loading (R-04).

## Waves 8–10 — Deep audit → audit fixes → tour → universal import (2026-07, CLOSED)

- **Deep audit** (`950774a`, `docs/DEEP-AUDIT-2026-07-17.md`): full functional + UX audit across **all tabs**, flows, and data consistency. Verdict **1🔴 / 3🟠 / 4🟡**, backed by a **ground-truth script** (independent recomputation of the displayed metrics).
- **Wave 8 — audit fixes** (`819d169`): applied the audit findings —
  - **DNA cache invalidation** — cache key now sensitive to `status`/`exit` (so closing/editing a trade busts the cache) **+ mentee separation** (a mentor viewing a mentee no longer reads the mentor's own cached DNA).
  - **Coach insight dedup** — collapses duplicate/mirrored insights before display.
  - **Guest notebook state** — notebook state handled correctly for guest (non-persisted) sessions.
  - **Dialog semantics** + **formatting consistency** across screens.
- **Wave 9 — guided tour** (`6989c42`): 15-step **tab-navigating** product tour — `onNavigate` + **retry** + **centered fallback** when an anchor is missing; **19 `data-tour` anchors**; **`en` fallback** for untranslated steps; **restart from Settings**. Satisfies source-of-truth requirement **#4 ✅**.
- **Import spec** (`d0d42e1`, `docs/IMPORT-SPEC-2026-07-18.md` — **the source-of-truth for the import format**), gated pre-implementation, then **Wave 10 — universal import** (`0c8f2f3`):
  - **CSV/XLSX** import under **`src/import/`** — `parseFile` / `detectColumns` / `normalizeRow` / `buildImport` / `synonyms`.
  - **Smart bilingual column mapping** (he+en synonyms) **+ content sniffing** to disambiguate ambiguous headers.
  - **Excel serial dates** handled, **DD/MM** as the default interpretation.
  - **Per-row validation** — `stop = null` is allowed; **zero synthetic values** (guarded in `calcTradeMetrics`, so a missing field never becomes a fake `0`).
  - **Rejected-rows report** + **undo** via session-state.
  - **Permanent demo removal** — the demo *source* is deleted for good; **`isDemo` stays in the schema** (only the source was removed, not the flag). Satisfies requirement **#5 ✅**. **Verified in production** (bundle `D88-aYgu`).
  - **Dependencies:** `papaparse` from npm; **`xlsx` from the SheetJS CDN `0.20.3`** — **intentional**: it carries CVE fixes absent from npm's `0.18.5`; integrity is pinned in the lockfile and the rationale is documented in `IMPORT-SPEC`. ⚠️ **Not a suspicious dependency** — future reviews should not flag it.

### Super-status — all 5 of Niv's source-of-truth requirements shipped ✅
1. **Manual capital in `$`** — Wave 1 (`c74c512`).
2. **Coach adapts to profile** — Wave 6.2 (`be8fe4f`).
3. **Real recommendations** — Wave 6.3 (`3f6b081`).
4. **Comprehensive tour** — Wave 9 (`6989c42`).
5. **Import + demo removal** — Wave 10 (`0c8f2f3`).

The product is feature-complete; the launch is live.

## 2026-07-20 — Infrastructure Day (CLOSED)
- **Auth → custom domain** — Supabase Site URL + Redirect URLs moved to swing-edge.com.
- **Settings persistence (M1/M2a/M2b)** — `user_settings` jsonb + RLS; `src/lib/userSettings.js` (load/save/flush/migrate); a hydration effect reconciles DB→state; a persist effect gated on `hydratedRef` so the first render can't clobber real data; localStorage stays a mirror.
- **Defaults aligned to swing-edge.com** (`0132112`) — `/api/ocr` CORS allowlist + smoke/health/playwright fallbacks; `*.vercel.app` still allowed (previews).
- **INC #5** closed. **Welcome modal** — one-time, all users, cross-device (`welcomeSeen` flag in `user_settings`); takes precedence over betaWelcome.

## Next up (הבא בתור)
1. **Gate 2** — full **RLS audit** + **penetration** testing + **rate-limit** on `symbol-search` + **accessibility findings** from the Architecture Auditor report (alt / aria / RTL).
2. **₪ + Stripe + pricing** — currency work is the central task (₪ pricing) + Stripe billing + **entitlement for founding users** (blocked on Privacy/ToS + identity/bank per the Sprint 2 backlog above).
3. **B1 — Multi-Account** — build the deferred multi-account model (per-account capital, real+paper types, `ON DELETE RESTRICT`, mentor sees all accounts).
4. **Track A** — next after the above land.
