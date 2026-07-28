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
