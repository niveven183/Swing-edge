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
