# Incident Log

Every production incident gets one short entry: what broke, root cause, fix, prevention.

## #1 — 2026-07-05 — Weekly Supabase backup failed (pg_dump aborted)
- **Symptom:** `Supabase Backup` workflow failed; no encrypted artifact produced.
- **Root cause:** `pg_dump: aborting because of server version mismatch` — runner's default
  client was v16.14 while Supabase server is v17.6. pg_dump refuses when client < server.
- **Scope:** Backup only. Data Guardian was unaffected (its `psql` query client does not enforce
  the version rule; connectivity/URL/secret/sslmode were all fine).
- **Fix:** Install `postgresql-client-17` and prepend its bin to `$GITHUB_PATH` (commit `b40df50`).
- **Prevention:** Pin the pg client major to the server major in any workflow running pg_dump/pg_restore.

## #2 — 2026-07-06 — Digest "psql" error + admin Resolve button silently broken
- **Symptom:** Daily Digest surfaced a "psql" feedback error; AdminPanel "Resolve" toasted
  "Update failed" and no feedback could ever be resolved (all rows stuck at status `new`).
- **Root cause:** Schema drift — code referenced a non-existent `feedback.resolved` column
  (`daily-digest.mjs` queries, `AdminPanel.jsx` reads/writes). The canonical column is `status`
  (`new` / `reviewed` / `resolved`); no migration ever created `resolved`.
- **Fix:** Point all reads/writes at `status`; digest uses `status IS DISTINCT FROM 'resolved'`
  (NULL-safe). This commit.
- **Prevention:** Data Guardian idea — add a check that every column referenced by scripts/app
  queries actually exists in the live schema, to catch drift before it ships.

## #3 — 2026-07-07 — AdminPanel Resolve appeared to toggle then silently rolled back
- **Symptom:** Clicking Resolve in the Feedback panel flashed a green check for a moment, then
  reverted — status was never actually persisted, no error shown.
- **Root cause:** `public.feedback` RLS had INSERT (public) + SELECT (admin) policies but no
  UPDATE policy. Under RLS, an UPDATE with no matching policy affects 0 rows without raising an
  error. `markResolved()` in `AdminPanel.jsx` only checked `error`, not row count, so the
  optimistic UI update looked successful and then desynced from the DB on next refetch.
- **Fix:** Added `feedback_admin_update` UPDATE policy (admin-only, same email check as SELECT)
  via migration `20260707130000_feedback_admin_update.sql`. Hardened `markResolved()` to
  `.select()` after update and throw if zero rows come back, so a future silent RLS gap fails
  loudly with a toast instead of a fake success. Commit `22ceccc`.
- **Prevention:** Any table with client-side writes needs explicit INSERT/UPDATE/DELETE policies
  reviewed together — a missing policy fails silently, not loudly, under RLS.

## #4 — 2026-07-15 — Two mobile layout bugs found in production verification (390px)
- **Symptom:** On swing-edge.vercel.app at 390×844 (iPhone emulation): (A) the Analytics "Setup
  Matrix" table overflowed its `overflow-x-auto` wrapper; in RTL, `scrollLeft` starts at 0 and
  shows the table's *end*, so the Avg R column was clipped with no visible affordance that
  scrolling would reveal it. (B) `MobileTradeCard`'s setup badge could overlap the price-range
  text and the delete button on the Journal tab.
- **Root cause (A):** `SwingEdge_App.jsx`'s Setup Matrix table used default `table-layout: auto`
  with an unconstrained setup-name column — any wide combination of setup name + monospace P&L
  value could push the table wider than its wrapper, and RTL's default scroll position hides the
  overflow instead of revealing it. **(B):** `MobileTradeCard.jsx`'s meta row combined
  `flex-wrap` with a `margin-inline-start: auto` ("ms-auto") actions div — a fragile combination
  where auto-margin placement on a wrapped line is inconsistent, especially under RTL, and can
  render elements on top of each other instead of cleanly stacking.
- **Fix:** (A) `table-fixed sm:table-auto` with explicit `w-[Npx] sm:w-auto` widths (measured
  against real + synthetic worst-case content) on the 4 numeric/badge columns; only the setup-name
  column truncates (with a `title` tooltip), numbers/badges never do. Verified at both 390px and
  343px (the actual production width) with zero table overflow and zero clipped numeric cells.
  (B) Split the actions (Close/Delete) out of the wrapping meta row into their own dedicated row
  (`flex items-center justify-end gap-1`, no `ms-auto`), eliminating the flex-wrap + auto-margin
  interaction entirely. Verified zero pairwise element overlap and that the delete button is
  hit-testable at its own coordinates.
- **Prevention:** Avoid `margin-inline-start/end: auto` inside any `flex-wrap` container —
  auto-margin placement is a single-line trick and behaves unreliably once wrapping occurs,
  especially in RTL. For `table-layout: auto` tables inside `overflow-x-auto` wrappers on mobile,
  either constrain/truncate the variable-width column explicitly or switch to `table-fixed` with
  measured column widths — don't rely on the browser to shrink content-driven columns to fit.

## #5 — 2026-07-20 — Domain suspension (ICANN registrant verification) — first prod outage
- **Symptom:** Both domains showed **Invalid Configuration** in Vercel; users hit
  `ERR_CONNECTION_REFUSED`. The site was completely unreachable for ~24h (19/07 evening —
  20/07 11:30). Code and deployments were entirely healthy — nothing in the app was at fault.
- **Root cause:** A Namecheap "verify contact information" email (ICANN registrant verification)
  with a **19/07 deadline** went unactioned. When the deadline passed the registrar **suspended
  the domain**, which propagated through DNS and pulled the domains offline. Not a Vercel, build,
  or DNS-config problem — a registrant-verification lapse.
- **Misread precursor:** UptimeRobot began **flapping on the evening of 19/07**
  (see `docs/audits/HEALTH-FLAPPING-DIAGNOSIS.md`). It was attributed to transient blips; in reality it
  was the suspension propagating through DNS. The `/api/health` hardening done in response
  (`b98135e`) was chasing the wrong root cause but remains a legitimate improvement and stays.
- **Process failure:** The Dispatcher agent classified the registrar email as "account noise,"
  and Claude confirmed that classification — so a 🔴 infrastructure-critical message was triaged
  away instead of surfaced.
- **Fix:** Completed the registrant verification at 11:22 → domain returned to **ACTIVE**
  immediately → DNS recovered within minutes and both domains resolved again.
- **Prevention:** Auto-Renew confirmed **ON** (verified). Agent directive: **infrastructure email
  (registrar / domain / DNS / hosting) is 🔴 and NEVER "noise"** — always surface it. Add an
  UptimeRobot monitor on the **domain itself** (not just the app health endpoint). Calendar
  reminder set for **June 2027** ahead of the next verification/renewal window.

## #6 — 2026-07-26 — Sentinel declared "recovery" for a layer that never ran
- **Symptom:** Discord received a green "✅ התאוששות — דפדפן (מחובר)" at 18:33 on 25/07, implying the
  authenticated QA layer had returned to health. It had not. That cycle ran at MIN=32 — outside the
  45→09 gate — so the auth layer never executed. Every one of its three real runs (15:42 manual,
  17:02, 20:47) failed with `browser-auth|hydration-failed`; there has never been a successful pass.
- **Root cause A (fake recovery):** the recovery block in `sentinel.yml` declared recovery for any
  fingerprint present in state and absent from the current findings, without ever asking whether the
  layer that produces it had run. That assumption holds for the public layer (runs every cycle) but
  not for the auth layer (runs once an hour). Because `NEW` is built exclusively from current faults,
  the incident was also dropped from state — so the next auth run re-reported it as "תקלה חדשה".
  Net effect: a recovered/new-fault flip twice an hour and a red incident that never accumulated a
  persistent-fault count.
- **Root cause B (no evidence):** the hydration gate waited 8s — a budget sized against a local Mac
  measurement (1.8s/3.5s), not a shared runner talking to Supabase — and on failure reported a
  hardcoded hypothesis ("ההגדרות לא נטענו מ-Supabase … DEFAULT_CAPITAL=2500") in the `reason` field.
  Three failures produced no observation beyond "a locator timed out". A guess printed as fact also
  anchored every subsequent diagnosis.
- **Root cause C (blind to the actual cause):** the response listener in `sentinel-auth.spec.js`
  discarded every non-own-origin response, so a failing Supabase call — the most likely reason
  hydration never completes — was invisible by construction.
- **Fix:** (A) skip recovery declaration for `browser-auth|*` fingerprints when `AUTH_EXPECTED != 1`
  and carry those incidents into the new state verbatim, preserving firstSeen/lastAlerted/count;
  `AUTH_EXPECTED` is now also passed to the classify step, which previously could not see it.
  (B) 8s → 25s, split into `hydration-default` 🔴 (element present, value ≠ 10,000 = a real
  production bug) and `hydration-timeout` 🟠 (element absent = infrastructure), with the observed
  amount or a redacted page snippet in `got`, and the hypothesis removed from `reason`.
  (C) capture 4xx/5xx from `*.supabase.co` as `browser-auth|supabase_request` 🟠. This commit.
- **Prevention:** **A monitor must never infer health from the absence of a signal it did not
  collect.** Any check that runs on a gate/schedule narrower than the reporting cycle must state
  whether it ran, and the reporter must consult that before declaring anything recovered. Related:
  a finding's `reason` field carries observations only — hypotheses belong in `fix`.

## #7 — 2026-07-28 — User Analytics reported green while every metric was off by one row
- **Symptom:** The first `workflow_dispatch` run of `user-analytics.yml` (`dry_run=true`) finished
  **green with zero warnings**, and printed `count-run-1: trades=NaN distinct_users=NaN`. The query
  itself was fine — the psql call returned data — but every metric in the report was reading one row
  higher than it should.
- **Root cause:** `scripts/user-analytics.mjs` prefixes each query with
  `SET default_transaction_read_only = on;`. Without `-q`, psql prints the command tag `SET` on
  stdout, so `rows[0]` was `["SET"]` and every subsequent index was shifted by one. `fleet-daily.yml`
  has always used `-tAq`; the new script used `-tAF '|'` and dropped the `-q`. Worse, nothing
  asserted that a count parsed as a number, so `NaN` propagated through the whole report silently —
  a textbook §2 violation authored by me.
- **Scope:** The verification dispatch only. Nothing was emailed or posted (the run was a dry run),
  and no cron existed yet — which is exactly why the dry run was mandated before enabling it.
- **Fix:** `-tAqF '|'` (commit `ed6903a`), plus two independent guards: a command-tag detector that
  drops a leading `SET`/`BEGIN`/`COMMIT` row **and warns**, and a `Number.isFinite` assertion on the
  determinism probe that fails loudly instead of carrying `NaN` forward.
- **Prevention:** **`-q` is load-bearing whenever a query is prefixed with `SET`** — treat it as part
  of the psql contract, not formatting. And **any number that reaches a report must be asserted
  finite at the point it is parsed**; a `NaN` that renders as "NaN" and still colours the run green
  is a silent failure regardless of how visible the string looks. New reporting workflows ship
  `workflow_dispatch`-only with a `dry_run` default of `true`, and the cron is enabled in a separate
  commit only after a human reads the raw counts.

## #8 — 2026-07-28 — Per-user analytics lines printed into a world-readable Actions log
- **Symptom:** The first **live** run of `user-analytics.yml` (`30346816924`) succeeded, but a scan
  of its public log found three short user IDs (`user_92a06c0c`, `user_ad1a0494`, `user_1ad72482`)
  in plain text. This repo is PUBLIC, so the log is world-readable.
- **Root cause:** **GitHub Actions logs an action's `with:` inputs.** The email step passed the full
  report inline as `body: ${{ steps.analytics.outputs.report }}`, so the entire detailed report —
  including the per-user anomaly lines that the whole design exists to keep off public surfaces —
  was echoed to stdout before the mail was ever sent. The plan explicitly forbade artifacts and job
  summaries and I honoured both; I did not consider the step log itself as a third channel.
- **Scope:** One run's log. No journal content was involved (it is never read — only counted), no
  emails or full UUIDs appeared, and no secret was exposed. The leaked values were 8-character ID
  prefixes.
- **Fix:** Commit `84418fd` — the report is written to `analytics-report.txt` and passed as
  `body: file://analytics-report.txt` (the `file://` prefix was verified against the action's own
  `action.yml` and `main.js` before relying on it, so the log now shows only the path); the `report`
  output was removed from `GITHUB_OUTPUT` entirely, leaving only `date`/`color`/`summary`, all
  aggregate; every short ID is registered with `::add-mask::` the moment it is created, so any future
  step that echoes one prints `***`; the file is written **outside** `.analytics-state` because that
  directory is persisted to the Actions cache, which is also public-readable; both paths are
  gitignored. Verification run `30347127540`: 0 short IDs, 0 emails, 0 non-infra UUIDs.
- **Prevention:** **On a public repo, an action's `with:` inputs are a publication channel — enumerate
  it alongside artifacts, job summaries and stdout.** Sensitive content is handed to an action by
  file path, never inline. Any value that must not appear in a log gets `::add-mask::` at creation
  time as defence in depth, not at the point of use. Every new reporting workflow's first live run is
  followed by a grep of its public log for IDs, addresses and UUIDs before it is left to run daily.
- **Process miss (disclosed):** `CLAUDE.md` §10 requires a CI incident to be logged **in the same
  commit as its fix**. `84418fd` shipped without this entry; it is being added in a follow-up commit
  rather than quietly folded into unrelated work.

## #9 — 2026-07-28 — A correct numerator over a population that could not hold the field
- **Symptom:** The live User Analytics report stated that `followedPlan`, `exitReason`,
  `maxFavorable` and `lessonLearned` were filled in **33%** of trades. Four independent optional
  fields returning the identical figure is not a behavioural finding — it is the signature of a
  shared denominator. The number was read as a user-discipline gap and a product conclusion was
  built on it (that the close form was missing those inputs). It was not.
- **Root cause:** the `FIELDS` loop measured every field against the CTE `clean` with no population
  filter. Close-time fields are written by the close modal, which an **open** trade never reaches,
  so open trades entered the denominator as guaranteed zeros. `33%` was therefore exactly the
  **closed-trade share** — the metric was measuring how many trades were closed, under five
  different field names. Scoped to closed trades: `followedPlan` 100%, `exitReason` 100%,
  `maxFavorable`/`maxAdverse`/`lessonLearned` 60%. The fields were in the close form all along
  (`SwingEdge_App.jsx:6483`/`6488`/`6495`, persisted at `1992-1995`).
- **Scope:** every daily report since the agent went live, plus the ad-hoc analysis derived from it.
  No user-facing surface and no data were affected — the defect was in measurement and in the
  decisions it invited.
- **The same error, three times in 48h:** "61% without `stop`" (denominator included demo trades),
  "47% demo loss" (denominator included accounts that never traded), "33% close fields" (this one).
  In all three the numerator was right. A rate is only falsifiable when its denominator is visible,
  so the fix is not "be careful" — it is to make the denominator impossible to omit.
- **Fix (commit `e9060c9`):** every measured field carries an explicit population (`POP_ALL` /
  `POP_CLOSED`) with **no default** — adding a field forces the choice rather than inheriting a
  wrong one. Every rendered rate prints numerator, denominator and population name by construction
  (`41/41 סגורות`), and `assertRatiosCarryDenominator()` **throws** if a line with `%` lacks them
  (verified by negative test: injecting `• המרה: 28%` exits 1 and sends nothing). The funnel, which
  had been printing bare ratios, was brought under the same guard. `CLAUDE.md` §2 carries the rule
  for ad-hoc queries and prompts, where two of the three instances originated and where no assert
  can reach.
- **The rule caught its own author, immediately.** While writing this fix I reported the corrected
  `maxFavorable`/`maxAdverse` as **80%/30%**. Re-deriving them against the script's own CTE gave
  **60%/60%**. The cause was the same class of defect one level up: my cohort was "users with ≥3
  trades" where the corrected metric uses "users with ≥3 **closed** trades". I had stated a rate
  without stating its denominator, so nothing — not even the paragraph arguing for denominators —
  had made it checkable. **A rule that its author can violate inside the commit that introduces it
  is a rule that must be enforced mechanically, not remembered.** That is the entire argument for
  the assert and for §2 existing in the repo rather than in a habit.
- **Prevention:** before reporting any rate, ask **"can this denominator contain the thing I am
  counting?"** If not, the number measures population size, not behaviour. Two independent
  populations returning the same percentage for unrelated fields is a denominator alarm, not a
  correlation. And exposing the denominator is not cosmetic — it invalidates bad conclusions in
  the line itself: the corrected close-field cohort is **one user**, which the report now prints as
  "קוהורט 1-2 משתמשים", so "100% followedPlan" disqualifies itself on sight without anyone
  needing to recall who is in the cohort.

---

## #10 — 2026-08-01 — A key rotation left every existing backup undecryptable, and the drill found it 12h later

- **Symptom:** the quarterly Restore Drill (`restore-drill.yml`, 01.08 04:00 UTC) failed. It pulled
  the latest green backup — the 26.07 artifact — and `openssl enc -d` rejected it. The workflow was
  correct, the backup file was intact, and the drill was right to be red.
- **Root cause:** `BACKUP_PASSPHRASE` was rotated. Rotation replaces the key used for **future**
  encryption; it does nothing to artifacts already on disk. Every stored backup had been encrypted
  with the previous key, and that key was gone. The next scheduled `backup.yml` run (Sunday 03:00
  UTC) would have produced the first artifact readable with the new key — so from the moment of
  rotation until that run, **the effective restore capability was zero**.
- **Why nobody knew for ~12 hours:** nothing in the system asserts "a backup exists that the
  *current* key can open." `backup.yml` was green (it had not run since), the secret was set
  correctly, and the app was unaffected. The only mechanism that could detect this state is the
  drill, and the drill runs quarterly. The gap was found by the calendar, not by a guard.
- **Scope:** no data was lost and no user was affected. What was lost was the *ability to recover*
  had anything gone wrong in that window — the worst class of silent failure, because it is
  invisible precisely until the moment it matters.
- **Closure (same day, ~1h):** a manual Backup #10 was run, producing an artifact encrypted with the
  current key, followed immediately by Restore Drill #4 — green: **189 rows across 11 tables**, and
  a full manifest match including indexes. The exposure window was closed within the hour of
  discovery.
- **Lesson:** **a key rotation is not complete until a backup encrypted with the new key exists and
  has been restored.** Rotating the secret is one third of the procedure; the manual backup and the
  drill are the other two, and all three belong in the same sitting. Waiting for the next cron run
  means accepting a restore-capability outage of up to a week, with nothing on any dashboard saying so.
- **Prevention:** `docs/RUNBOOK.md` now carries the three-step rotation procedure inline, so the
  backup and the drill cannot be read as optional follow-ups.

## #11 — 2026-08-02 — A Tel Aviv stock entered 100× too large, and the trade object had no way to say otherwise

- **Symptom:** a live user (`a0556783290`) reported a **$280,000 loss on a ~50,000₪ account** after
  importing his IBI journal. 41 trades. Every price on every Israeli row was 100× its real value,
  and every one of them was rendered with a hard-coded `$`.
- **Root cause — two independent defects that compounded:**
  1. **Unit.** A TASE security is quoted in **agorot** (1/100 ₪) and the cell does not say so.
     `normalizeRow.js:58` strips `₪ $ € £ , %` before `Number()`, by design — so the magnitude
     entered the pipeline with no unit attached and nothing downstream could recover it.
  2. **Currency.** `public.trades` had **no currency column at all**, and every money formatter
     hard-coded `"$"`. Even if the unit had been right, the app could not have told the user which
     currency he was looking at. The system did not get the answer wrong; it had no place to store one.
- **Why no gate caught it:** every existing import guard tests *geometry* (stop vs entry vs target)
  or *presence* (ticker, entry, qty). All of them pass on a row that is internally consistent and
  uniformly 100× too big — the geometry of a correct trade survives multiplication by a constant.
  There was no guard on **scale**, because scale had never been representable.
- **Fix (`4154198`, `3e7c3f1`, `5977ba5`, `0aff647`):** the unit is now **derived from the row's own
  arithmetic** — the ratio between the booked trade value and (rate × quantity) resolves to 1 or
  0.01; anything else is rejected as `bad_unit` with a reason code rather than guessed. Currency
  became an attribute of both the trade and the account, and `fmtMoney(n, currency)` is the single
  source of the symbol. A second, independent gate (`nonSecurityKind`) drops IBI's pseudo-securities
  — tax debits and FX conversions, which the broker books as *purchases*.
- **A 100%-certain measurement that refuted the convenient explanation:** the 9 tax rows were first
  assumed to be residue from an old import. They are not. All 9 carry `entry = 100` exactly, and the
  arithmetic gate provably **cannot** catch them: quantity 666.94 at rate 100 yields a ratio of
  exactly 0.01 — bit-identical to a legitimate agorot quote. The two gates are genuinely independent,
  and merging them into one test with two conditions would have produced a gate blind to one class.
- **Zero-harm decision:** the 41 damaged trades are **not** repaired by `UPDATE`. Dividing by 100
  after the fact assumes all 41 are agorot-quoted — unverifiable without the source file, which is
  in the owner's Drive trash. The remedy is user-initiated (delete and re-import), communicated by
  email. A silent write on a live user's trading data is exactly the failure class this log exists for.
- **Found only in the browser, after the code was "done":** a DOM read of a shekel trade returned
  `$120 / $74 / … / ₪130 / +₪1,000.00` — price and P&L in shekels, entry and stop still in dollars.
  16 hard-coded `$` sites survived a full code review and a green `verify`. **A currency bug is a
  rendering bug, and rendering is not provable from source.**
- **Lesson:** **a number without a unit is not a number.** The import pipeline stripped the one piece
  of information that made the magnitude meaningful, and no schema field existed to carry it — so
  the loss of meaning was structural, not accidental. Any parser that normalizes away a symbol must
  first record what the symbol meant.
- **Prevention:** `test:import` now carries a fixture with an Israeli security **and** a dollar
  security in the same file, asserting no cross-contamination; `bad_unit` and `bad_currency` are
  first-class rejection codes with user-visible reasons; `tradingStats` exposes `pnlByCurrency` and
  `mixedCurrency`, and a mixed-currency journal renders a banner stating that the total is not a
  real sum. **⛔ Still open:** OCR is unaware of agorot (⏭️ in `STATE.md`), and the `currency`
  column awaits Niv running the migration (⏸️).

## #12 — 2026-08-06 — Supabase access tokens may have been sent to Google Analytics in `page_location`
- **Symptom:** none. **No monitor fired, no user reported anything, and nothing was broken.**
  Found by reading `index.html:135` while planning an unrelated SPA-pageview change. Had the
  wave not touched that exact line, the leak would still be live.
- **Root cause — two safe defaults that are unsafe together:**
  1. `src/supabaseClient.js:13` sets `detectSessionInUrl: true` and no `flowType`, so
     supabase-js v2 uses the **implicit** flow: every OAuth / password-recovery return lands on
     `https://swing-edge.com/#access_token=…&refresh_token=…` before the client strips the hash.
  2. `gtag('config', …, { send_page_view: true })` defaults `page_location` to
     `document.location.href` — **fragment included** — and the GA block in `index.html` runs
     at document parse time, i.e. **before** supabase-js has cleared the hash.
  Neither default is wrong on its own. The bug lives in the seam, which is why a review of
  either file alone reads as correct.
- **Scope (bounded, upper bound — the true number is not knowable from the server):**
  window `e8c2d3b` (2026-07-27, GA4 added) → this fix, 10 days. `detectSessionInUrl` predates it
  by three months (`bb8cc06`) but was harmless until GA4 arrived. Eligible population: **20/41
  users are Google OAuth, of whom 8/41 signed in during the window; 0/41 password recoveries.**
  So **at most 8/41 users** could have been affected, and only the subset that granted analytics
  consent — **consent lives in `localStorage`, so that subset cannot be counted server-side.**
  ⛔ Do not read "8" as the number of affected users; it is the ceiling of a number we cannot measure.
- **Fix (this commit):** `page_location` is pinned to `location.origin + location.pathname` in
  the `config` call. This also covers the PKCE `?code=` variant, since neither query nor fragment
  survives. Manually sent `page_view` events must pass `page_location` explicitly — config params
  become defaults for later events, so an omitted one silently reuses the load-time path.
- **Why it shipped:** the GA4 review asked "does this send PII?" and correctly answered no —
  **no line of our code passes a token to gtag.** The token was contributed by a *default* in a
  library, through the URL, which no reviewer of either file was looking at.
- **Lesson:** **a default that reads the ambient environment is an input you did not declare.**
  `page_location` was never written down anywhere in the repo, and that is exactly why it was
  never reviewed. Any analytics call that defaults to "the current URL" must be pinned the day
  it is added, not the day someone notices what else is in the URL.
- **Prevention:** the `config` block now carries the reason inline so the next editor cannot
  remove the pin without reading why. **⛔ Still open:** no automated check asserts that nothing
  resembling a token reaches an outbound analytics call — this class is currently caught by
  reading only. The CSP work (⏭️ S2) is the nearest structural guard.

## #13 — 2026-08-05 — `blockAnalytics()` never blocked anything: three files, one glob, ten days of CI traffic in GA4
> ⚠️ **Dating note — this entry is not out of order.** #12 is labelled 2026-08-06, but its commit
> `08ca710`, like every commit around it (`f74428e` 22:39, `57c2832` 22:42, `91177b1` 23:11), is
> stamped **2026-08-05 +0300**. The docs have been running one calendar day ahead of the commits.
> This entry uses the **git-verifiable** date. ⏭️ Niv decides which convention wins; until then
> `git log` is the authority (per this file's own header: a date not verifiable against a commit
> must be marked as such).
- **Symptom:** none. No monitor fired, no test failed, nothing was broken. Found while auditing
  workflow versions (task W) by reading the route pattern, not by any signal. **The function had
  a comment stating exactly what it prevented, and it prevented nothing.**
- **Root cause — a Playwright glob that matches on path segments:**
  `page.route('**/googletagmanager.com/**', …)`. In Playwright, `**/` requires a literal `/`
  immediately before the next token. In `https://www.googletagmanager.com/gtag/js` the character
  before `googletagmanager.com` is a **`.`**, not a `/`. The pattern therefore matched **no URL
  that could ever exist**, the route never fired, and every CI page load sent a real `page_view`
  to `G-VC8PKL4NL1`. Introduced in `e8c2d3b` (2026-07-27) — **the same commit as #12** — which
  added GA4 and the three block helpers together.
- **Scope (measured, not estimated), window `e8c2d3b` 2026-07-27 → this fix 2026-08-05:**
  - smoke: **108 runs × 5 page loads = 540**
  - sentinel: **122 runs × 3 page loads = 366**
  - **≈906 synthetic `page_view` events** against a product with **41 registered / 12 activated
    users**. Only `index.html` carries the GA snippet, and it is the SPA shell, so every route
    load counts.
  - ⚠️ **Every GA4 metric dated before 2026-08-05 is unusable.** The synthetic traffic is not
    separable after the fact: it carries no marker distinguishing it from a real session. **The
    fix date is the baseline; do not compare across it.**
- **Two wrong numbers were sitting in the comments the whole time**, and both are corrected in
  this commit: sentinel's cron `'20,50 * * * *'` **schedules** 48 runs/day, but GitHub actually
  delivered **~12/day** (122 runs / 10 days) — the comment quoted the schedule as if it were a
  measurement. And **"~29 real users" was the activation *rate*** (12/41 = 29%) misread as a
  headcount (§2: no ratio without its denominator). A number nobody re-measured for ten days.
- **The fix exposed a second, independent defect — the console channel discards the URL.**
  Making the block actually work turned smoke **red, 4/6 failed**: `route.abort()` emits
  `Failed to load resource: net::ERR_FAILED`, and `msg.text()` for a resource-load failure
  contains **no URL at all** — the host lives only in `msg.location().url`. All three files
  filtered console errors on `text` alone, so their GA allowlists could not match. Consequences:
  - `tests/smoke.spec.js` — the same blind spot made smoke red on **2026-08-04 and 2026-08-05**:
    a 500 from `api.fontshare.com` was correctly ignored by the response channel (host check) and
    walked straight back in through the console channel, which had no host check. The comment
    promised "third-party 5xx must not fail our smoke" while the code enforced it on **one of two
    paths**. Diagnosing it required downloading the trace artifact by hand.
  - `tests-sentinel/*` — 2 false amber findings per run, which the watch job would have merged,
    classified and reported **forever**. Verified: 2 findings → **0** after the fix.
  **This makes the console-URL fix a hard prerequisite for the glob fix, not a companion to it.**
- **Proof (required before commit, per §2 — a count, not a declaration):**
  old glob → blocked **0**, leaked **2**. New regex → blocked **2**, leaked **0**. Against real
  production → blocked **1** (`gtag/js?id=G-VC8PKL4NL1`), leaked **0**.
  ⚠️ The first version of this proof was **confounded** and discarded: it registered a catch-all
  `**/*` route second, and Playwright evaluates routes in **reverse registration order**, so the
  catch-all would have won regardless. The rerun uses no catch-all.
- **Lesson:** **a comment describing a mechanism is not evidence the mechanism runs.** Three
  files carried the same broken line under three confident comments explaining what it prevented.
  A guard whose failure mode is silence must be tested by **observing it fire** — a blocked-request
  count — because there is no other way to tell a working filter from a dead one.
- **Prevention:** all three now use a regex (`/googletagmanager\.com|google-analytics\.com/`) with
  an inline note stating why it must never become a glob again; `google-analytics.com` is blocked
  too, since `/g/collect` records the hit even if the loader is blocked. Console filters now match
  the location URL as well as the text — as a **provider list, never a host rule**.
  **⛔ Still open:** nothing asserts that a CI run sends zero analytics requests. Until an
  assertion like that exists, this class of failure is caught by reading only.

## #14 — 2026-08-07 — A deleted trade said "deleted" and stayed in the database
- **Symptom:** Sentinel's authenticated layer raised `browser-auth|ui-delete-incomplete`
  (06.08 15:01): the UI delete reported success, the row was gone from the journal, and the
  REST cleanup then found SNTNL rows still in `public.trades`. Intermittent — roughly 3 of the
  12 runs in a 6-hour window, not 12 of 12.
- **Root cause — two defects that only fail together:**
  1. `handleSubmit` fired the INSERT **without `await`** and without keeping the promise
     (`SwingEdge_App.jsx:2416`). A delete issued before that INSERT landed sent a DELETE for an
     id the table did not have yet; the DELETE matched zero rows, and the INSERT landed *after*
     it. The row was in the DB and gone from state.
  2. **PostgREST returns `error: null` for a DELETE that matches zero rows.** Correct behaviour,
     not a bug — but it means `if (error)` can never detect this, and `toast.success` at
     `:2485` was unconditional. The failure had no error to report.
- **What it was NOT — each ruled out by evidence, not by judgement:**
  - **RLS:** `restCleanup()` (`tests-sentinel/sentinel-auth.spec.js:225-286`) deletes the same
    rows as the *same* QA user, with the *same* anon key, under the *same* `users own trades`
    policy — and succeeds. **The finding could only fire when that cleanup removed `n > 0`
    rows, so the finding's own existence proves RLS was working.** RLS failure would also be
    deterministic: 12/12 runs, not 3.
  - **Network:** a transport failure rejects the promise and would have reached the `catch` at
    `:2483` and logged. It also would not correlate with create→delete timing.
  - **Hydration race:** the load effect (`:1495`) is keyed on `[authUser?.id]` and only
    REPLACES client state. It cannot put a row back into the DB. Hydration is how the ghost
    *reappears* to the user, not why it survived.
- **Fix:** `src/lib/tradeDelete.js` (pure, so it is assertable in `verify` — same reason as
  `replyGate.js`). `.select("id")` on the DELETE and `ok` **only for exactly one row**; a
  `pendingWrites` registry makes a delete wait for its own row's in-flight INSERT; a failed
  delete restores the trade **at its original index** and shows the error verbatim.
  ⚠️ The registry releases on **settle, not resolve** — releasing only on success would turn a
  silent failure into a silent hang, which is worse because it has no end state.
- **Proof:** `scripts/deleteTrade-test.mjs`, written first and **observed failing 0/7**, then
  7/7. The old inline logic was separately replayed against `{data:null,error:null}`: the
  `if (error)` branch was not entered, nothing was logged, and the user saw "העסקה נמחקה".
- **Lesson:** **an error check is not a success check.** Where the API can report "nothing
  happened" without reporting an error, only counting the affected rows distinguishes a
  completed write from a no-op. The admin path already knew this — `admin_delete_trade` does
  `get diagnostics _n = row_count` (`admin_rpcs.sql:402`) — and the user path did not.
- **Prevention:** `test:delete` is in the blocking `verify` chain.
  **⛔ Still open (as recorded 07.08):** the same shape survives at 6 more sites — bulk delete,
  edit, close, the two imports, and undo-import — all of them optimistic with an unconditional
  success toast. The fire-and-forget INSERT in `handleSubmit` is the **root of the race** and is
  first in that queue: fixing delete without fixing save leaves the class alive.

### #14 — 2026-08-08 — ✅ CLASS CLOSED 7/7 (the 6 sites above)

- **What changed:** `src/lib/tradeDelete.js` → `src/lib/tradeWrite.js` (`git mv`, both referrers in
  the same commit). Of the 7 call sites it governs only 2 are deletes; a file named `tradeDelete`
  that verifies INSERTs is exactly how a second module with duplicated logic gets born. One pure
  `classifyRows(res, {expected, …})` is now the **only** place where "did this write happen" is
  decided — `deleteTradeRow` · `insertTradeRow` · `updateTradeRow` · `insertTradeRows` ·
  `deleteTradeRows` are all calls to it.
- **The 6 sites, at their measured line numbers** (the numbers carried in the 07.08 prompt were
  stale — `:2416`/`:2485` above are as-recorded and left as-is):
  | # | site | line | fix |
  |---|------|------|-----|
  | 5 | `handleSubmit` INSERT — **the root** | `:2431` | `await` + `.select("id")`; on failure the trade **leaves** state, the form reopens with every value, error verbatim |
  | 3 | `handleCloseSubmit` | `:2564` | verified UPDATE; rollback maps the trade back to OPEN |
  | 4 | `handleEditSubmit` | `:2589` | verified UPDATE; rollback restores the previous values |
  | 2 | `handleBulkDelete` | `:2462` | counter returned vs counter asked; partial restores only the survivors, at their original indexes |
  | 6 | `handleImportTrades` | `:2539` | verified bulk INSERT; only `missingIds` are removed |
  | 7 | `handleUndoImport` | `:2605` | verified bulk DELETE; partial restore + `lastImportIds` re-narrowed to what came back |
- **⚠️ The save rollback is the INVERSE of the delete rollback.** A failed delete puts a row
  **back**; a failed save takes it **out** — the trade was never saved, so leaving it on screen is
  the same lie in the other direction. Both are `restoreAt`/filter on the same state, and reading
  one as a template for the other is the mistake this line exists to prevent.
- **Partial is a third state the old code could not represent.** `error:null` + fewer rows than
  asked was indistinguishable from success, so a bulk write reported the number **requested**.
  `missingIds` makes the difference actionable: the rows that landed stay, only the rest roll back,
  and the toast says `נמחקו 3 מתוך 5` instead of `5`.
- **Proof — `scripts/tradeWrite-test.mjs`: red baseline 7/20, now 20/20.** The baseline is
  **reproducible, not a number someone wrote in a log**: `scripts/fixtures/tradeWrite-legacy.mjs`
  is the pre-wave logic, committed, and
  `TRADEWRITE_IMPL=../scripts/fixtures/tradeWrite-legacy.mjs node scripts/tradeWrite-test.mjs`
  reprints it on demand → `FAILED: 1, 2, 6, 8, 9, 10, 12, 13, 14, 15, 16, 18, 20`.
- **7 of the 20 assertions pass vacuously on the old code** (3, 4, 5, 7, 11, 17, 19) — they are
  regression guards, not evidence. **Two predictions in the approved plan were falsified by the
  measurement and are recorded so they are not re-assumed:** #9 was predicted vacuous and is not
  (it also asserts `.select()` was called, which the old path never did); #11 was not predicted
  vacuous and is (the legacy `createPendingWrites` is a no-op, so `wait()` returns immediately).
- **Lesson (beyond #14's own):** a fix that closes 1 of 7 instances of a class leaves the class
  open, and the queue only stays visible if the remaining instances are enumerated **by line** at
  the time of the first fix. That enumeration is what made this wave mechanical.
- **⚠️ Found while closing this class, NOT fixed (AdminPanel is out of this wave's scope):** the
  admin path invented the row-count rule — every delete RPC is `returns int` over
  `get diagnostics _n = row_count` (`20260719120000_admin_rpcs.sql:383,403,423,443`) — and then
  **the client throws the count away.** `AdminPanel.jsx:960` (`admin_delete_trade`), `:1261`
  (`admin_delete_feedback`) and `:1525` (`admin_delete_demo_trades`) all destructure `{ error }`
  only, so a 0-row admin delete toasts "Deleted". The count is already on the wire; nothing needs
  to be added server-side, only read. `:1234` (`admin_set_feedback_status`) already does this
  correctly (`if (!data) throw`) — from #3, which is where the rule entered this codebase.
  Tracked in `docs/STATE.md`.

### #14 — 2026-08-08 — ✅ THE ADMIN RPC SITES, 3/3 — the class is closed in both files

- **What changed:** all three sites now go through `rpcCountVerified` over the **same**
  `classifyRows` — no second module, no duplicated verdict. `AdminPanel.jsx:960` and `:1261`
  expect exactly 1 and surface the error verbatim; the feedback row leaves local state only
  **after** the count confirms it left the DB.
- **⚠️ The classifier had to be widened, and this is the load-bearing detail:** the count arrives
  in two shapes. `.select("id")` on a table write answers with the rows; an RPC declared
  `returns int` answers with the **number alone**. `classifyRows` read `data.length` only, so
  pointing the panel at it unchanged would have scored **every** RPC as zero — a fix that turns
  every admin delete into a false failure. `countOf` normalises both, inside the one classifier.
- **⚠️ `:1525` is deliberately not asserted for equality.** `admin_delete_demo_trades` deletes by
  predicate (`where is_demo = true`), so no expected count exists; `expected: null` reports the
  number instead of judging it. Asserting against the `demoCount` on screen would manufacture
  failures out of a stale read. "cleared 0" is truthful and visible — the old unconditional
  "Demo trades cleared" was not.
- **Prevention:** `test:write` 20 → **25** assertions, in the blocking `verify` chain. Red baseline
  **9/25** against `scripts/fixtures/tradeWrite-legacy.mjs` (21, 22, 24 failing), reproducible at
  any time, not a number in a log. ⚠️ 23 and 25 pass **vacuously** on the old shape — the panel
  did handle errors; what it never did was count.
- **⚠️ A prediction of mine was disproved, again by measurement:** I marked 22 ("1 row = success")
  as vacuous. It **separates**, because it demands `rows === 1` and the old shape returns no
  counter at all. Same correction as 9 and 11 in the previous wave — the third time a vacuity
  call was wrong, which is why the marking is measured and not reasoned.
- **Lesson:** the rule was invented on the server side of this repo in #3 and had been sitting
  correct and unread ever since. A silent failure can survive not because the mechanism is
  missing but because **nobody read the value it already returns** — so when a class is closed,
  the sweep must cover every file that calls the same kind of write, not every file that shares
  the same code.

## #15 — 2026-08-11 — A production CI agent stopped parsing, and 20 green verify links said nothing
- **Symptom:** the `User Analytics` workflow, run `31470184666` (11.08 07:44 UTC, HEAD `d7e4a4d`),
  failed after **6 seconds** in step *Compose analytics report* with
  `SyntaxError: missing ) after argument list` at `scripts/user-analytics.mjs:320`, raised inside
  `compileSourceTextModule`. **1/1 runs since the commit** — the last green was `c4810f17`
  (10.08 08:12 UTC) with 10 more green behind it; `d7e4a4d` landed 17:39 the same day. The
  denominator is 1 because the agent runs daily and this was its first run after the commit.
- **Root cause — a SQL comment convention carried into a place with no comments:** the previous
  wave added explanatory comments to the `gatherStuck()` query at `:330-334`, and those comments
  quoted column names in markdown style, with backticks. The query is a **template literal**
  opened at `:320`. `--` is a comment in SQL and **is not** a comment in JavaScript, and inside a
  template literal there is no comment syntax **at all** — the first backtick simply closes the
  string. From there the parser reads bare identifiers inside an unclosed `q(` argument list.
- **What it was NOT — each ruled out by a controlled experiment, not by judgement:**
  - **The Hebrew, and the multi-line-ness.** This was the stated hypothesis. The same comment
    block, Hebrew and multi-line, with the backticks removed and nothing else changed, parses.
    Backticks alone, in an otherwise ASCII single-line comment, do not.
  - **The SQL.** A parse error means **no line of the file ever ran**, so the new `date <
    (current_date - 30)` predicate was never sent to Supabase. Independently corroborated: the
    same query run by hand against production returned a row count, so the SQL is valid.
- **⚠️ The rule this incident was first written with was wrong, and the measurement is the
  finding:** the audit — and the prompt that approved it — both said "an **even** number of
  backticks compiles and produces wrong SQL silently." **Parity is not the criterion.** Measured
  over 19 realistic phrasings:
  1. **11/11** where the quoted text opens with an identifier character (`` `date` ``,
     `` `createdAt` ``) fail `node --check`, even and odd alike. Once the string closes, a bare
     identifier sits against an expression, and that is never valid.
  2. **8/8** where it opens with a **punctuator that continues an expression** (`` `.length` ``,
     `` `,x,` ``, `` `+1` ``, `` `[0]` ``) **compile cleanly.**
  3. And the comma case is the silent one: `` q(`${CTE}\n -- note `,label,` mid\n SELECT count(*)
     FROM clean`) `` compiles, runs, and hands `q()` **three arguments instead of one** — the
     first being the truncated string ending at `-- note `. The `SELECT` is gone and **nothing is
     raised**. `q(sql, label)` takes exactly two arguments in this agent, so this is the shape of
     the existing code, not a hypothetical.
     **⚠️ The boundary of the silence was measured, not assumed:** it requires the token between
     the commas to **resolve**. With a name that is in scope (`label`) it is fully silent —
     `args=3`, `sql="WITH clean AS (…)\n -- note "`, `SELECT` absent, exit 0. With one that is not
     (`x`) it throws `x is not defined` at runtime, loudly. Part of even this class announces
     itself; the part that does not is the part that matters, and no amount of `--check` or smoke
     running separates them in advance — only refusing the character does.
- **⚠️ Why `npm run verify` was green — and this is the larger half of the incident:**
  **0/5 CI agents were covered by the chain** (`user-analytics` · `analyst` · `data-guardian` ·
  `daily-digest` · `arch-auditor`). `build` touches the frontend only. The single link that
  touches the broken file — `horizon-test.mjs:213`, block 10 — was added **in the same commit that
  broke it**, and it does `readFileSync` + regex: it reads the file as **text** and never imports
  or parses it. 140/140 passed on a file that does not compile. No assertion lied; none was asked.
- **Fix:** the comment is kept — it is the justification for the column change — and rewritten
  with bare column names, plus a standing note saying why backticks may never return here.
  The gate is `scripts/script-syntax-test.mjs`, chain link 21 (`test:syntax`): `node --check` over
  every `.mjs`/`.cjs`/`.js` in `scripts/` + `api/`, an explicit corpus floor and a 5/5 agent-roster
  assertion so a shrunken corpus cannot pass in silence, and a third check forbidding a backtick on
  any line whose trimmed content opens with `--`.
- **⚠️ `node --check` and not dynamic `import()`, decided by measurement:** `import()` would also
  catch module-level errors, but **2/5 agents call `main()` with no entrypoint guard**
  (`user-analytics.mjs:853`, `data-guardian.mjs:305`; the other three guard on
  `process.argv[1] === import.meta.url`). Importing them would open a Supabase connection, write
  files, and in one case `process.exit(1)` — killing the test process. Adding the guards is a
  separate decision, filed in STATE. `node --check` parses without executing a line, and is
  therefore correct **for as long as** 2/5 are unguarded.
- **⛔ Coverage stated, not implied:** check 3 catches the comment class, which is 19/19 of what
  was measured. It does **not** catch a backtick on a non-comment SQL line; there, only `node
  --check` protects, and only for the identifier-leading class. Closing that gap needs a real
  parser and there is no `acorn` in the tree. Registered, not closed. `.sql` files are excluded on
  purpose — `scripts/retention.sql` carries 6 backticks in `--` comments and they are entirely
  correct, because that file is run by hand in the SQL Editor and is not JavaScript.
- **Proof:** observed failing twice, once per class. Restoring `` `date` `` failed check 2
  (`43/44 compile`) and check 3, `exit=1`. Restoring `` `,label,` `` **passed** `node --check` and
  check 2 (`44/44`) and was caught by check 3 alone, `exit=1` — which is the whole reason check 3
  exists. File restored byte-for-byte after each, and `scripts/user-analytics.mjs` was then run
  locally end-to-end, not merely `--check`ed.
- **Registry item closed alongside:** `upsertBlob` (`src/lib/userSettings.js`) awaited the upsert
  without destructuring `{ error }`. `supabase-js` **returns** errors rather than throwing them, so
  an RLS denial or a constraint violation resolved the promise and vanished; the `try/catch` only
  ever saw network faults. The same module already destructures at `:104` and `:145`, and so does
  `tradeWrite.js:39`. ⛔ The contract is unchanged — a settings write still never throws; the
  failure is now visible in the console instead of disappearing.
- **Lesson:** a test that reads a file as text proves the bytes are there, not that the program
  runs. The gap was not that a check was weak — it was that **the question "does this file
  parse?" had never been asked of anything outside `src/`**, and a chain can be twenty links long
  and still have a denominator of zero for an entire class of artifact. When adding coverage for a
  file, the first assertion is the cheapest one: can the runtime load it.

## #16 — 2026-08-11 — 61 trades carry a currency nobody measured, and three independent guards could not fire
- **Symptom:** `BE` (NASDAQ, dollar-quoted) was saved 11.08 11:52:45 UTC with `currency="ILS"`.
  Prices were stored correctly — only the label lied — so the lie surfaces nowhere in the price
  and everywhere in a ratio against capital: the risk board read **0.596%** against the user's
  1% ceiling where the truth is **1.787%** (ECB fixing 10.08; ×3.0005, ⛔ not ×3.3 — 3.3 was the
  reciprocal 0.333 read backwards). **The reverse direction was worse and was not known:** 13 Tel
  Aviv rows (`1081843`·`440016`·`587014`·`691212`, user `e403e391`, all OPEN) are quoted in
  agorot and labelled USD — 4,061,818 as stored = **101.55× the 40,000 capital**, against
  40,618.18 = **1.0155×** in agorot.
- **Root cause — one line:** `SwingEdge_App.jsx:2457` stamps `currency: capitalCurrency` on every
  manual trade. ⚠️ The comment at `:2443` correctly rejected the **display** currency and chose
  the **capital** currency; the failure is that a third currency — the one the instrument
  actually trades in — was never weighed. **The write path never asked the market.**
  📌 The source of truth already existed and was thrown away: `priceService.js:385` returns
  `currency_code` from TradingView and passes it through `onPick`; `handleSymbolPick` read
  `type`+`symbol` only.
- **⚠️ Why nothing caught it — the structural half, and the larger one:** three independent
  guards (`SwingEdge_App.jsx:4188` risk board · `TradeDNA.js:81` · `GrowthTracker.riskMgmtScore`)
  each tested `currencyOf(t) === capitalCurrency`. The write path **guarantees** that equality.
  **Three layers of defence, none of which could ever fire** — not a bug in any one of them, a
  tautology shared by all three. And the mixed-currency banner (`tradingStats.js:200`) keyed off
  the same stored label: 13 TASE rows + 2 US rows, all labelled USD, `mixedCurrency=false`.
  ⛔ The banner was silent precisely because every row was wrong in the same direction.
- **⛔ What this was NOT:** not a display bug. The label is **written to the database**, and
  45/61 rows are right **by accident** — their owner happens to hold dollars. Correcting 14 rows
  would have left the mechanism intact and the next row wrong again.
- **Fix (wave א', read-side only):** `src/lib/instrumentCurrency.js` — a pure module deriving the
  **instrument's** currency at read time on a four-rung evidence ladder
  (`MEASURED`→`CONTRADICTED`→`ASSUMED`→`AMBIGUOUS`). All three guards and `pnlByCurrency` now
  compare against the derivation, so they **can** fail; 18 assertions were observed failing
  before the wiring and 10 more against `HEAD` for the display layer.
  📌 **The derivation is never saved.** A stored flag would go stale in silence the moment the
  provider starts returning `currency_code`; block 9 of the gate forbids a derived DB column.
  ⚠️ **The aggregate gate is "is this group proven single-currency", ⛔ not "is every row
  verified"** — the strict reading would exclude 47/61 rows and replace one silent failure with
  another. `ASSUMED` counts and **says so in the UI**; `CONTRADICTED`/`AMBIGUOUS` leave the
  aggregate, are **shown marked** in both render paths, and a group containing one is not proven
  single-currency ⇒ the banner lights.
- **Gate:** `scripts/instrument-currency-test.mjs`, chain link 22 (`test:instrument`), **105
  assertions**. Blocks 5–7 run three journals where the guard **must** block and where it did not.
- **⚠️ Still open, deliberately:** the 61 stored labels are **unchanged** — they are simply no
  longer trusted. ⛔ The `BE` row was not corrected; it is the evidence. Wave ב' (the 13 TASE
  rows) waits on advance notice to `e403e391`; the migration is ⏸️ blocked on Niv (§12).
