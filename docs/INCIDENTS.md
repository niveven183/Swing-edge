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
  (see `docs/HEALTH-FLAPPING-DIAGNOSIS.md`). It was attributed to transient blips; in reality it
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
