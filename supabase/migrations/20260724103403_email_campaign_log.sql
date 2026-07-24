-- =========================================================================
-- Email campaign log — dedup ledger for one-shot marketing sends.
--
-- The Email Campaign workflow (.github/workflows/email-campaign.yml) sends to
-- APPROVED waitlist rows only (waitlist.approved_at IS NOT NULL) and records
-- every send here. The workflow's fetch query skips anyone already logged as
-- 'sent' for the same campaign, so nobody receives the same campaign twice.
--
-- Writes come from the workflow via role postgres (bypasses RLS). The RLS
-- policy below only governs app reads: admins only. Same is_admin() pattern
-- as 20260719120000_admin_rpcs.sql.
--
-- NOT run automatically on prod — applied manually by the operator.
-- =========================================================================

create table if not exists public.email_campaign_log (
  id        uuid primary key default gen_random_uuid(),
  campaign  text not null,
  email     text not null,
  sent_at   timestamptz not null default now(),
  status    text not null default 'sent',
  error     text
);

-- One row per (campaign, email) — case-insensitive. Powers the dedup NOT EXISTS
-- and makes the backfill / per-send INSERTs idempotent via ON CONFLICT DO NOTHING.
create unique index if not exists email_campaign_log_uniq
  on public.email_campaign_log (campaign, lower(email));

alter table public.email_campaign_log enable row level security;

-- Admin-only SELECT. No insert/update/delete policy → app clients cannot write;
-- only the workflow's postgres role (which bypasses RLS) writes.
drop policy if exists email_campaign_log_admin_select on public.email_campaign_log;
create policy email_campaign_log_admin_select on public.email_campaign_log
  for select to authenticated using (public.is_admin());

-- =========================================================================
-- TEARDOWN (reversible):
--   drop policy if exists email_campaign_log_admin_select on public.email_campaign_log;
--   drop table if exists public.email_campaign_log;
-- =========================================================================

-- BACKFILL (ניב מריץ ידנית אחרי המיגרציה — 36 נמענים שכבר קיבלו
-- את waitlist_launch בשליחה ידנית ב-24.07):
--   update public.waitlist set approved_at = now() where approved_at is null;
--   insert into public.email_campaign_log (campaign, email, status)
--     select 'waitlist_launch', email, 'sent' from public.waitlist
--     on conflict do nothing;
