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
