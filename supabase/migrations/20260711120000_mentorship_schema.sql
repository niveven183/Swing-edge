-- B4.1 — Mentor/Mentee social schema (tables + RLS only; RPCs & UI in later steps).
-- Privacy model A (full transparency): active mentor sees ALL mentee trades + all fields.
-- Client uses anon key → RLS is the sole authorization gate. Every policy is deliberate.
-- Idempotent (drop-then-create / if not exists) and reversible (see teardown block at end).

-- =========================================================================
-- TABLES
-- =========================================================================

create table if not exists public.mentorships (
  id           uuid primary key default gen_random_uuid(),
  mentor_id    uuid not null references auth.users(id) on delete cascade,
  mentee_id    uuid not null references auth.users(id) on delete cascade,
  status       text not null default 'active'
               check (status in ('pending','active','revoked')),
  created_at   timestamptz not null default now(),
  activated_at timestamptz,
  revoked_at   timestamptz,
  constraint mentorship_no_self check (mentor_id <> mentee_id)
);

-- one active pairing per (mentor, mentee); revoked/pending rows don't collide
create unique index if not exists mentorships_active_pair_uniq
  on public.mentorships (mentor_id, mentee_id) where status = 'active';
create index if not exists idx_mentorships_mentor_active
  on public.mentorships (mentor_id) where status = 'active';
create index if not exists idx_mentorships_mentee
  on public.mentorships (mentee_id);

create table if not exists public.mentor_invites (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  mentee_id  uuid not null references auth.users(id) on delete cascade,
  status     text not null default 'open'
             check (status in ('open','redeemed','expired','cancelled')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_by    uuid references auth.users(id) on delete set null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_mentor_invites_mentee
  on public.mentor_invites (mentee_id);

create table if not exists public.mentor_notes (
  id         uuid primary key default gen_random_uuid(),
  trade_id   uuid not null references public.trades(id) on delete cascade,
  mentor_id  uuid not null references auth.users(id) on delete cascade,
  mentee_id  uuid not null references auth.users(id) on delete cascade,
  note       text not null check (char_length(note) between 1 and 5000),
  created_at timestamptz not null default now()
);
create index if not exists idx_mentor_notes_trade  on public.mentor_notes (trade_id);
create index if not exists idx_mentor_notes_mentee on public.mentor_notes (mentee_id);
create index if not exists idx_mentor_notes_mentor on public.mentor_notes (mentor_id);

-- =========================================================================
-- SECURITY-DEFINER HELPER — the core of the isolation model.
-- Runs as owner to bypass mentorships' own RLS (prevents policy recursion),
-- stable so it's evaluated once per statement. search_path pinned to public
-- to block search_path hijacking.
-- =========================================================================

create or replace function public.is_active_mentor(_mentee uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.mentorships
    where mentee_id = _mentee
      and mentor_id = auth.uid()
      and status = 'active'
  );
$$;

revoke all on function public.is_active_mentor(uuid) from public, anon;
grant execute on function public.is_active_mentor(uuid) to authenticated;

-- =========================================================================
-- RLS — trades: ADD mentor read without weakening existing isolation.
-- Existing "users own trades" (FOR ALL, auth.uid()=user_id) is untouched.
-- This policy is SELECT-only → a mentor can never INSERT/UPDATE/DELETE a
-- mentee's trade. Postgres OR-combines permissive SELECT policies:
--   own rows      → matched by "users own trades"
--   mentee rows   → matched here, only while an ACTIVE mentorship exists
--   everyone else → matched by neither → 0 rows
-- =========================================================================

drop policy if exists "mentors read active mentee trades" on public.trades;
create policy "mentors read active mentee trades" on public.trades
  for select to authenticated
  using ( public.is_active_mentor(user_id) );

-- =========================================================================
-- RLS — mentorships
-- =========================================================================

alter table public.mentorships enable row level security;

drop policy if exists "parties read own mentorship" on public.mentorships;
create policy "parties read own mentorship" on public.mentorships
  for select to authenticated
  using (mentor_id = auth.uid() or mentee_id = auth.uid());

-- mentee controls the relationship: can revoke (status -> revoked). Since RLS
-- is row-level (not column-level), scope is the row; column guarding of status
-- transitions is enforced later in the RPC/UI layer.
drop policy if exists "mentee updates own mentorship" on public.mentorships;
create policy "mentee updates own mentorship" on public.mentorships
  for update to authenticated
  using (mentee_id = auth.uid())
  with check (mentee_id = auth.uid());

-- No INSERT policy: mentorships are created only via the (future)
-- redeem_mentor_invite SECURITY DEFINER RPC. Direct client INSERT is blocked.

-- =========================================================================
-- RLS — mentor_invites: mentee manages their own invites. Mentor never reads
-- invites directly (prevents code enumeration); redemption goes through the
-- SECURITY DEFINER RPC added in the next step.
-- =========================================================================

alter table public.mentor_invites enable row level security;

drop policy if exists "mentee manages own invites" on public.mentor_invites;
create policy "mentee manages own invites" on public.mentor_invites
  for all to authenticated
  using (mentee_id = auth.uid())
  with check (mentee_id = auth.uid());

-- =========================================================================
-- RLS — mentor_notes: mentor writes (only for an active mentee), mentor reads
-- own notes, mentee reads notes written about them. Nobody else.
-- =========================================================================

alter table public.mentor_notes enable row level security;

drop policy if exists "mentor writes note" on public.mentor_notes;
create policy "mentor writes note" on public.mentor_notes
  for insert to authenticated
  with check (mentor_id = auth.uid() and public.is_active_mentor(mentee_id));

drop policy if exists "mentor reads own notes" on public.mentor_notes;
create policy "mentor reads own notes" on public.mentor_notes
  for select to authenticated
  using (mentor_id = auth.uid());

drop policy if exists "mentee reads notes on them" on public.mentor_notes;
create policy "mentee reads notes on them" on public.mentor_notes
  for select to authenticated
  using (mentee_id = auth.uid());

-- =========================================================================
-- TEARDOWN (reversible) — to roll this migration back, run:
--   drop policy if exists "mentors read active mentee trades" on public.trades;
--   drop table if exists public.mentor_notes;
--   drop table if exists public.mentor_invites;
--   drop table if exists public.mentorships;
--   drop function if exists public.is_active_mentor(uuid);
-- =========================================================================
