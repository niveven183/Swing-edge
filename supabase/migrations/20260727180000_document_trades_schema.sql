-- Documentary migration — public.trades
--
-- public.trades is the oldest table in the project and was created by hand in
-- the SQL editor; no migration in this directory ever declared it. That gap
-- means a fresh environment cannot be built from this repo, and it means the
-- 25 column names that src/supabaseClient.js hard-codes in TRADE_COLUMNS have
-- no checked-in counterpart to review against.
--
-- Transcribed verbatim from information_schema on 2026-07-27 against project
-- zicstkfkwhzvmdkzpidm. `if not exists` makes this a proven no-op against
-- production, where the table already exists; its value is a new environment
-- from zero.
--
-- Deliberately NOT included: RLS policies, indexes, triggers. Those live in
-- their own migrations and duplicating them here would create a second source
-- of truth for the same fact.

create table if not exists public.trades (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users(id) on delete cascade,
  ticker            text,
  side              text,
  date              date,
  entry             numeric,
  stop              numeric,
  target            numeric,
  exit              numeric,
  shares            numeric,
  status            text default 'open'::text,
  setup             text,
  "marketCondition" text,
  "emotionAtEntry"  text,
  "entryQuality"    text,
  "followedPlan"    text,
  "exitReason"      text,
  notes             text,
  "lessonLearned"   text,
  "maxFavorable"    numeric,
  "maxAdverse"      numeric,
  "_capitalAtEntry" numeric,
  "createdAt"       timestamptz default now(),
  "closedAt"        timestamptz,
  is_demo           boolean default false
);

comment on table public.trades is
  'Documentary migration (2026-07-27): transcribed from the live schema, not a change. The column set here is the contract TRADE_COLUMNS in src/supabaseClient.js enforces.';

-- Two known drifts are recorded in docs/STATE.md rather than corrected here:
-- `entryQuality` is text while the client writes a number, and `status`
-- defaults to lowercase 'open' while the client compares 'OPEN'. Both are data
-- migrations with their own risk analysis.
