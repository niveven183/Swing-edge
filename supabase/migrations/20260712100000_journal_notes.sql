-- B3 — journal_notes: free-form trader notebook (NOT tied to a trade).
-- Named journal_notes to stay distinct from mentor_notes (trade-scoped mentor
-- feedback) and from the existing trades.notes column — avoids all confusion.
-- Client uses anon key → RLS is the sole authorization gate. Fully isolated:
-- a user can only ever see/write their own rows.
-- Idempotent (if-not-exists / drop-then-create) and reversible (teardown below).

-- =========================================================================
-- TABLES
-- =========================================================================

create table if not exists public.journal_notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  content    text not null check (char_length(content) between 1 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_journal_notes_user
  on public.journal_notes (user_id, created_at desc);

-- weekly_reviews: one row per user; tracks the last "start a new week"
-- acknowledgement. The Weekly Review window is a rolling last-7-days — this
-- only records that the user reviewed, it never deletes trade data.
create table if not exists public.weekly_reviews (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  last_reviewed_at timestamptz not null default now()
);

-- =========================================================================
-- RLS — full per-user isolation (auth.uid() = user_id)
-- =========================================================================

alter table public.journal_notes enable row level security;

drop policy if exists "users own journal notes" on public.journal_notes;
create policy "users own journal notes" on public.journal_notes
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.weekly_reviews enable row level security;

drop policy if exists "users own weekly review" on public.weekly_reviews;
create policy "users own weekly review" on public.weekly_reviews
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =========================================================================
-- TEARDOWN (reversible) — to roll this migration back, run:
--   drop table if exists public.weekly_reviews;
--   drop table if exists public.journal_notes;
-- =========================================================================
