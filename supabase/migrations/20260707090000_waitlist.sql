-- feat(waitlist): waitlist table + RLS (anon insert only, admin-only read)
-- Exact signup counts stay admin-only via the SELECT policy — no anon-facing
-- count endpoint (would leak our exact signup number to anyone).

create table if not exists public.waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  source     text,           -- utm_source
  campaign   text,           -- utm_campaign
  created_at timestamptz not null default now()
);

-- Case-insensitive unique email. Client lowercases before insert; this is the
-- backstop that also powers duplicate detection (error 23505).
create unique index if not exists waitlist_email_lower_uniq
  on public.waitlist (lower(email));

alter table public.waitlist enable row level security;

-- anon may INSERT only (email in, no read back).
create policy waitlist_anon_insert on public.waitlist
  for insert to anon with check (true);

-- Only the authenticated admin may read rows / counts.
create policy waitlist_admin_select on public.waitlist
  for select to authenticated
  using ((auth.jwt() ->> 'email') = 'niveven183@gmail.com');
