# SwingEdge — Deep Functional + UX Audit
**Date:** 2026-07-17 · **Base commit:** `5f3fa4a` · **Mode:** read-only (zero code changes)
**Team:** senior QA + senior product designer · **Bar:** Linear / Robinhood
**Method:** live preview (Vite dev, guest/localStorage mode). All aggregate + per-trade
numbers computed independently from the 30-trade demo set (ground-truth script) and
compared to the digit against every tab. Full CRUD lifecycle exercised locally with a
real trade (create → close → delete). Preview state was backed up and fully restored;
no production data touched, no repo files changed.

> **Scope note — what the local preview could NOT exercise:** the preview runs with no
> Supabase and no `/api/*` serverless backend. That means live market data (Market Intel
> overview + live quotes), the auth screen (Turnstile/login), and any Supabase-backed
> write (Notebook, mentor invites, password change) could not be driven end-to-end here.
> Where a finding depends on that, it is flagged **[env]** and reasoned from source.

---

## 1. Findings

Severity: 🔴 broken/functional · 🟠 hurts experience · 🟡 polish · 💭 suggestion

| # | Tab | Finding | Exact repro | Sev | Proposed fix |
|---|-----|---------|-------------|-----|--------------|
| 1 | Dashboard / DNA | **Trading-DNA panel goes stale after closing a trade** — sample count and scores keep the pre-close values until a reload or another add/delete. Violates the cross-tab sync principle: Dashboard reads "31 עסקאות סגורות" while the DNA card reads "· 30 עסקאות" for the same data. | Load 30 real trades → note DNA "30". Add a trade (→ open) then **Close** it. Dashboard closed-count = 31, equity/WR/streak all update, but DNA still says "30". Reload → DNA jumps to "31". | 🔴 | `calculateTradeDNA` cache key at `src/intelligence/core/TradeDNA.js:163` is `length_firstDate_lastDate_lastId`. Closing (or editing exit/entry/stop/shares of the last trade) changes none of those, so the stale memo is returned. Add a status/exit-sensitive term to the key (e.g. count of closed + hash of `status|exit` per trade, or a data-version counter bumped on every trade mutation). |
| 2 | Log Trade / Coach | **Duplicate coach insight** — the Decision Coach shows two near-identical Breakout cards: "Breakout היסטורית מפסיד אצלך — 25% הצלחה ב-4 עסקאות" **and** "Breakout היסטורית חלש אצלך — 25% הצלחה ב-4 עסקאות". Same stat, two cards, different adjective. | New trade, setup=Breakout (פריצה), any Trending-Up context, with the 30-trade history loaded. | 🟠 | De-dupe insights that resolve to the same (channel, setup, stat). Emit one card per underlying signal in `DecisionCoach.js`. |
| 3 | Journal / insights | **Contradictory superlatives** — two insight cards each claim "your strongest setup": Higher Low (100%, 4 trades) and Pullback-to-20-EMA (100%, 6 trades). Analytics correctly picks the larger-sample winner (Pullback). Also two near-duplicate FOMO cards ("100% of FOMO entries lost" and "4/4 FOMO trades lost money"). | Journal tab with 30 real trades loaded; read the insight strip. | 🟠 | Pick a single "strongest setup" using the same tiebreak Analytics uses (sample size, then WR). Collapse the two FOMO cards into one. |
| 4 | Global (any confirm) | **Invalid DOM nesting: `<button>` inside `<button>` inside `<button>`** — the confirm dialog renders the backdrop and the panel as `<button>` elements wrapping the real action buttons. React logs `validateDOMNesting(...): <button> cannot appear as a descendant of <button>` every time a confirm opens (delete trade, reset journal, bulk delete). Also an a11y problem (nested interactive controls; panel announced as a button). | Journal → delete any trade → console shows the warning. | 🟡 | `src/components/ToastProvider.jsx:109-130`: make the backdrop a `<div onClick>` and the panel a `<div role="dialog" aria-modal="true">`; keep only the two real `<button>`s. |
| 5 | Notebook | **Notebook is silently non-functional in guest mode.** With no Supabase/auth, `canDB` is false, so `handleSave` returns immediately — but the Save button is only disabled on empty/`saving`, so it looks active. User types, counter increments, clicks "שמור רשומה", and nothing happens: no note, no error, no "sign in to save" hint. Every other feature persists to localStorage in guest mode, so this is inconsistent and looks broken. | Guest session → Notebook → type → click Save. Empty-state stays, textarea keeps text, zero feedback. | 🟠 | Either add a localStorage fallback (matching the rest of the app) or, when `!canDB`, disable Save + show an inline "sign in to save notes" message. `src/components/NotebookTab.jsx:49-60`. |
| 6 | Feedback | **Diagnostic "screen" shows a raw untranslated id** for feedback opened from Notebook, Weekly Review, or Settings. `TAB_LABEL_KEYS` omits `notebook`/`weeklyReview`/`settings`, so `screenLabel` falls back to the raw id — the report reads "מסך: notebook" instead of "מחברת". | On Notebook → open user menu → Feedback. Context panel shows `מסך  notebook`. | 🟡 | `src/components/FeedbackTab.jsx:36-43`: add `notebook`, `weeklyReview`, `settings` (→ their i18n keys) to `TAB_LABEL_KEYS`. |
| 7 | Dashboard vs Analytics | **Return% precision mismatch** — the same value renders "57.1%" on the Dashboard KPI and "57.07%" on Analytics. Not wrong, but two roundings of one number breaks the "identical to the digit" rule. | Compare Dashboard equity KPI subtitle to Analytics return figure with 30 trades. | 🟡 | Route both through one formatter (e.g. `formatPct` / a shared `formatReturnPct`) so rounding is identical everywhere. |
| 8 | Journal | **Per-trade P&L rounded to whole dollars diverges from precise aggregates.** Cells use `fmt$(Math.round(pnl))`, so demo-25 shows **+$57.00** (true 57.40) and demo-26 shows **+$80.00** (true 79.50). The column doesn't sum to the exact net-P&L shown elsewhere (+$1,426.75). | Journal list P&L column vs Dashboard net P&L. | 🟡 | Decide one policy: either show cents per row (`fmt$(pnl)`), or clearly label the column as rounded. Aggregates should always use unrounded values (they already do). |
| 9 | Log Trade / sizing | **Position sizing floors at 1 share with no over-risk warning.** At extreme prices (entry 999,999 / stop 900,000 on a $2,500 account) the 1%-risk size rounds below 1 and is floored to 1 share → MAX RISK renders **$99,999** (≈40× the account) while the panel still says "מבוסס על סיכון 1%". No NaN/crash (values format cleanly), but the risk claim is silently false. | New trade with huge entry/stop values; read SHARES / MAX RISK / R:R. | 💭 | When floored shares push risk above the configured %, surface a warning ("position exceeds your 1% risk — reduce size or capital too small for this instrument"). |
| 10 | Market Intel | **[env] Market overview has no failure state.** On fetch failure the panel shows only "טוען נתוני שוק…" and silently retries every 15 s forever — no error text, no "couldn't load" fallback. In the preview (no `/api`) it never resolves; in production a real outage would show an eternal spinner. | Market Intel tab in preview; overview never leaves the loading state. | 💭 | After N failed retries show a lightweight "market data unavailable — retrying" state with a manual retry, instead of an indefinite spinner. `SwingEdge_App.jsx:1716-1736`. |
| 11 | Dashboard | **Equity curve counts the open trade as a data point** — "31 נקודות נתונים" while closed metrics say 30. The extra point carries no realized P&L (flat), so equity value is unaffected, but the point count diverges from the closed-trade count. | Add one open trade → Dashboard equity-curve caption reads 31 while "30 עסקאות סגורות". | 💭 | Either exclude open trades from the curve or relabel the caption ("nodes" incl. the live marker) so the number isn't read as a closed-trade count. |
| 12 | Tools | **Analyzer/Calculator are direction-agnostic** — both accept a stop on the "wrong" side (e.g. stop above entry for an implied long) and compute on `|entry-stop|` with no warning, unlike Log Trade which blocks it via `validateTradeInputs`. | Position Calculator with stop > entry; no warning shown. | 💭 | Reuse `validateTradeInputs` (or at least a direction hint) in the Tools calculators for consistency with Log Trade. |
| 13 | Tools / Analyzer | **"similar trades" label when no setup is selected** — `stopDistribution` includes ALL setups/asset classes but still calls them "העסקאות הדומות שלך", which overstates comparability. | Analyzer with a ticker but no setup chosen. | 💭 | Say "your trades" (not "similar") when no setup filter is applied. `DecisionCoach.js:54-68`. |

---

## 2. Cross-tab consistency (Niv's sync principle)

Verified against the 30-trade demo set injected as real. **Ground truth:** equity $3,926.75 ·
net P&L +$1,426.75 · WR 73.33% · avg R +1.15R · 22W/8L · return 57.07% · maxDD 2.29% / $83 ·
profit factor 6.16 · win streak 5.

| Metric | Dashboard | Journal | Analytics | Monthly report | DNA card | Identical? |
|--------|-----------|---------|-----------|----------------|----------|:---:|
| Account equity | $3,926.75 | — | $3,926.75 | $3,926.75 | — | ✅ |
| Net P&L (closed) | +$1,426.75 | (Δ, see #8) | +$1,426.75 | +$1,426.75 | — | ✅ / ⚠ per-row #8 |
| Win rate | 73% | 73% | 73% | 73% | — | ✅ |
| Avg R | +1.15R | — | +1.15R | — | — | ✅ |
| Closed count | 30 | 30 | 30 | 30 (April slice) | **30/31** | ⚠ **#1** |
| Return % | **57.1%** | — | **57.07%** | — | — | ⚠ **#7** |
| Win streak | 5 | — | 5 | — | — | ✅ |
| Sample size (post-close) | 31 closed | 31 | 31 | — | **30 (stale)** | 🔴 **#1** |

The two hard divergences are **#1** (DNA stale sample/scores after close) and **#7** (return
rounding). Everything else matches to the digit across tabs.

---

## 3. Per-tab chapters

### לוח בקרה / Dashboard — tested & mostly passing
Verified every KPI against ground truth (equity, net P&L, WR, avg R, streak, today's P&L,
return, DNA scores, edges, DD). All correct. Open-trade handling is good: an open trade
does not touch closed P&L, and the "⚠️ חסר מחיר ל-1 עסקאות" flag correctly counts it.
Issues: DNA stale-on-close (#1), return rounding (#7), equity-curve node count (#11).

### יומן / Journal — tested & mostly passing
Row rendering, status chips, per-trade R, filters, and the pro-stats bar all correct.
Create/close/delete all reflect here immediately. Issues: contradictory "strongest setup"
+ duplicate FOMO insights (#3), per-row P&L rounding (#8).

### מחברת / Notebook — **broken in guest mode**
Composer, counter, and empty state render, but Save is a silent no-op without Supabase/auth
(#5). Edit/delete paths are equally gated. Untestable end-to-end here; logic reviewed from source.

### סקירה שבועית / Weekly Review — empty state passing
Empty state clean; no crash with 0 real trades. (Full weekly aggregation with a today-dated
trade shares the same stats hub already verified on Dashboard/Analytics.)

### כלים / Tools — tested & passing (with notes)
Position Calculator math correct (shares, pos value, max risk, R:R). Analyzer quote fetch is
[env]-gated. Notes: direction-agnostic inputs (#12), "similar trades" labelling (#13).

### ניתוח ביצועים / Analytics — tested & passing
All aggregates match ground truth to the digit; correctly picks the larger-sample "strongest
setup" (where Journal contradicts itself). Only the return-precision rounding (#7) differs.

### מודיעין שוק / Market Intel — partially testable
Watchlist renders; **client-side sort (A-Z / % / $ / sector) works** (verified sector regroup).
Live prices + overview are [env]-gated. Finding: no failure state on the overview (#10).

### פידבק / Feedback — tested & passing (not submitted)
Type radiogroup (with arrow-key a11y), char counter, privacy toggle, and origin-tab capture
all work. Dual-path submit (Supabase `/api/feedback` **+** EmailJS) is resilient by design.
**Not submitted** — EmailJS would send a real email from the preview. Finding: raw screen id
for some origin tabs (#6).

### הגדרות / Settings — tested & passing
Theme (auto/light/dark), language (5 langs), capital ($2,500), risk (1%), tilt threshold (3%),
tilt meter (clean month), playbook (empty), CSV/PDF export (counts 30 trades / July 2026), and
the danger-zone reset (password-gated) all present and coherent. The demo-loader's advertised
"~22 WIN · ~8 LOSS · Win Rate ~73%" **matches ground truth exactly** (22/8, 73.33%). Security
actions (change password, mentor invite, reset) are auth-gated and [env]-untestable here.

### Onboarding — tested & passing
Welcome → 5 questions (each with a gated Continue and a progress bar) → "analyzing" →
personalized profile summary + 3 recommendations. The capital entered ($5,000) correctly flows
to `swingEdgeCapital`. Minor product note: a swing-trading app offers "Day Trading" as a
strategy option.

### Auth — [env] not testable
`AuthScreen` (Turnstile + Supabase login) is inert without a backend; reviewed from source only.

### Console
Across the entire traversal (all tabs, full CRUD, edge cases, onboarding) the **only** console
error was the `validateDOMNesting` button-nesting warning (#4). No NaN / Infinity / undefined /
crash anywhere — including the extreme-value trade (+$999,999 prices, 18-char ticker).

---

## 4. Verdict

**Readiness (1-10):**

| Tab | Score | Why |
|-----|:---:|-----|
| Dashboard | 8 | Numbers correct; DNA stale-on-close (#1) is the one real dent |
| Journal | 8 | Solid; insight de-dup (#3) + row rounding (#8) |
| Notebook | 4 | Silently broken for guest users (#5) |
| Weekly Review | 8 | Clean where testable |
| Tools | 8 | Calculator correct; direction-agnostic polish (#12/#13) |
| Analytics | 9 | Matches ground truth; only rounding (#7) |
| Market Intel | 7 | Sort works; needs a failure state (#10), rest [env] |
| Feedback | 9 | Well-built + resilient; tiny label bug (#6) |
| Settings | 9 | Comprehensive and accurate |
| Onboarding | 9 | Polished, gated, capital flows through |

**Executive summary.** SwingEdge is in strong shape: the stats engine is trustworthy —
every headline number (equity, P&L, win rate, avg R, drawdown, streaks, edges) reconciles
to the digit against an independent computation, and the full create → close → delete
lifecycle updates every tab correctly. The single functional defect worth blocking on is
**#1**: closing a trade leaves the Trading-DNA panel showing stale numbers until a reload,
because the DNA memo cache key ignores trade status/exit — a direct violation of the
cross-tab sync principle (Dashboard 31 vs DNA 30). After that, the meaningful items are
UX-integrity, not math: the **Notebook silently does nothing for guest users** (#5), the
**Coach/Journal show duplicate or self-contradicting insight cards** (#2/#3), and a global
**button-in-button** confirm-dialog warning (#4). The remaining items are polish and
suggestions. No crashes, no NaN, and extreme inputs are handled gracefully.
