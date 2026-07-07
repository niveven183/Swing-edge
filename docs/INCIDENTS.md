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
