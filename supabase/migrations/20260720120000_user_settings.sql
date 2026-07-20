-- M1 — user_settings: per-user settings blob, source of truth across origins/devices.
-- Fixes the localStorage-per-origin loss when users move
-- swing-edge.vercel.app -> swing-edge.com (onboarding re-opens, capital resets).
-- Client uses anon key -> RLS is the sole authorization gate. Full per-user
-- isolation: a user can only ever see/write their own row.
-- Idempotent (if-not-exists / drop-then-create) and reversible (teardown below).

-- =========================================================================
-- TABLE
-- =========================================================================

create table if not exists public.user_settings (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  settings   jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- =========================================================================
-- RLS — four explicit policies, each auth.uid() = user_id. Zero cross-user access.
-- =========================================================================

alter table public.user_settings enable row level security;

drop policy if exists "user_settings select own" on public.user_settings;
create policy "user_settings select own" on public.user_settings
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_settings insert own" on public.user_settings;
create policy "user_settings insert own" on public.user_settings
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "user_settings update own" on public.user_settings;
create policy "user_settings update own" on public.user_settings
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_settings delete own" on public.user_settings;
create policy "user_settings delete own" on public.user_settings
  for delete to authenticated
  using (auth.uid() = user_id);

-- =========================================================================
-- TEARDOWN (reversible) — to roll this migration back, run:
--   drop table if exists public.user_settings;
-- =========================================================================
