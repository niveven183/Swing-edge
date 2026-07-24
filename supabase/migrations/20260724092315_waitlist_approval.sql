-- =========================================================================
-- Waitlist approval gate — manual entry-pace control for the beta.
--
-- A new waitlist signup does NOT get an automatic invite. An admin approves
-- rows explicitly (sets approved_at); email sending is a SEPARATE future task.
-- Safety gate: if something breaks, just don't approve — no email goes out.
--
-- Mirrors the existing admin RPC pattern (20260719120000_admin_rpcs.sql):
-- security definer · search_path=public · is_admin() gate · revoke/grant.
-- Read-only for anon/public; only authenticated admins can call.
--
-- NOT run automatically on prod — applied manually by the operator.
-- =========================================================================

-- 1) New column only. null = pending, non-null = approved. Idempotent.
--    Existing columns / RLS on public.waitlist are left untouched.
alter table public.waitlist add column if not exists approved_at timestamptz;

-- 2) admin_waitlist_list() → pending-first list for the Admin console.
--    Returns only the columns below (no extra PII). Pending rows sort first.
create or replace function public.admin_waitlist_list(_limit int default 200)
returns table (
  id          uuid,
  email       text,
  source      text,
  campaign    text,
  created_at  timestamptz,
  approved_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
    select w.id, w.email::text, w.source, w.campaign, w.created_at, w.approved_at
    from public.waitlist w
    order by w.approved_at nulls first, w.created_at desc
    limit greatest(_limit, 0);
end;
$$;

revoke all on function public.admin_waitlist_list(int) from public, anon;
grant execute on function public.admin_waitlist_list(int) to authenticated;

-- 3) admin_waitlist_approve() → mark selected rows approved. One-way,
--    idempotent (already-approved rows are excluded by approved_at is null),
--    returns the number of rows actually updated. No un-approve in this version.
create or replace function public.admin_waitlist_approve(_ids uuid[])
returns int
language plpgsql
security definer
set search_path = public
as $$
declare _n int;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  update public.waitlist
    set approved_at = now()
    where id = any(_ids) and approved_at is null;
  get diagnostics _n = row_count;
  return _n;
end;
$$;

revoke all on function public.admin_waitlist_approve(uuid[]) from public, anon;
grant execute on function public.admin_waitlist_approve(uuid[]) to authenticated;

-- =========================================================================
-- TEARDOWN (reversible):
--   drop function if exists public.admin_waitlist_approve(uuid[]);
--   drop function if exists public.admin_waitlist_list(int);
--   alter table public.waitlist drop column if exists approved_at;
-- =========================================================================
