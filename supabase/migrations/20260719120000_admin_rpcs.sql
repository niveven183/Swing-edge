-- Gate 2.1 — Secure Admin Console: server-side SECURITY DEFINER RPCs.
--
-- WHY: public.trades has only "users own trades" RLS (auth.uid() = user_id) and
-- NO admin override, so the Admin Console (reading trades with the admin's own
-- anon-key session) saw only the admin's own rows → "Total Users = 1". Worse,
-- admin identity was a client-side email string and deletes ran client-side.
-- This migration moves every admin read + every destructive action behind
-- SECURITY DEFINER functions that verify admin identity IN THE DATABASE and
-- return AGGREGATES / METADATA ONLY — never trade content (ticker/price/notes).
--
-- Template: mirrors 20260712090000_mentor_invite_rpcs.sql
-- (security definer, search_path locked, revoke from public/anon, grant to
-- authenticated, raise exception on unauthorized). Idempotent + reversible.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- HOW TO ADD / REMOVE AN ADMIN (manual):
--   Admins are rows in public.admins keyed by auth.users.id. To grant admin to
--   another account, run (as service_role / SQL editor):
--       insert into public.admins (user_id)
--       select id from auth.users where lower(email) = 'someone@example.com'
--       on conflict (user_id) do nothing;
--   To revoke:  delete from public.admins where user_id = '<uuid>';
--   The seed below auto-adds niveven183@gmail.com IF that account already exists
--   at migration time. If it doesn't, the DO-block below raises a clear NOTICE
--   so the empty state is never discovered silently (no admin → panel is dead).
-- ─────────────────────────────────────────────────────────────────────────────

-- =========================================================================
-- 0. Admin registry + identity helper
-- =========================================================================

create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- No client-facing policies: the table is readable ONLY through SECURITY
-- DEFINER functions (which run as owner and bypass RLS). RLS on + zero policies
-- = anon/authenticated clients can never select it directly.
alter table public.admins enable row level security;

-- Self-resolving seed (no uuid literal committed to VCS). Idempotent.
insert into public.admins (user_id)
select id from auth.users where lower(email) = 'niveven183@gmail.com'
on conflict (user_id) do nothing;

-- Refinement #1: fail loudly if the seed matched nobody, so we never discover
-- "no admin can pass is_admin()" silently in production.
do $$
begin
  if not exists (select 1 from public.admins) then
    raise notice '[admin_rpcs] admins table is EMPTY — no user will pass is_admin(). Seed manually: insert into public.admins(user_id) select id from auth.users where lower(email)=''<admin-email>'';';
  end if;
end $$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- =========================================================================
-- 1. READ RPCs — aggregates & metadata only (return columns are the contract)
-- =========================================================================

-- admin_overview() → platform scalars. Reads auth.users (real accounts),
-- trades, feedback, waitlist. NO trade content leaves this function.
create or replace function public.admin_overview()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _total_users    int;
  _active_30d     int;
  _total_trades   int;
  _new_users_week int;
  _trades_week    int;
  _waitlist       int;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select count(*) into _total_users from auth.users;
  select count(*) into _total_trades from public.trades;
  select count(*) into _waitlist from public.waitlist;
  select count(*) into _new_users_week
    from auth.users where created_at >= now() - interval '7 days';
  select count(*) into _trades_week
    from public.trades where ("createdAt")::timestamptz >= now() - interval '7 days';

  -- feedback.user_id is text, trades.user_id is uuid → cast to text for the union.
  select count(distinct uid) into _active_30d from (
    select user_id::text uid from public.trades
      where user_id is not null and ("createdAt")::timestamptz >= now() - interval '30 days'
    union
    select user_id from public.feedback
      where user_id is not null and created_at >= now() - interval '30 days'
  ) a;

  return json_build_object(
    'total_users',     _total_users,
    'active_30d',      _active_30d,
    'total_trades',    _total_trades,
    'new_users_week',  _new_users_week,
    'trades_week',     _trades_week,
    'waitlist_count',  _waitlist,
    'avg_trades_user', case when _total_users > 0
                            then round(_total_trades::numeric / _total_users, 1)
                            else 0 end
  );
end;
$$;

revoke all on function public.admin_overview() from public, anon;
grant execute on function public.admin_overview() to authenticated;

-- admin_new_users_series() → REAL new-users-per-week from auth.users.created_at
-- (kills the old "first activity" proxy). Always 7 rows (zero-filled).
create or replace function public.admin_new_users_series()
returns table (week_start date, count int)
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
  select gs::date as week_start, coalesce(c.cnt, 0)::int as count
  from generate_series(
         date_trunc('week', now()) - interval '6 weeks',
         date_trunc('week', now()),
         interval '1 week'
       ) gs
  left join (
    select date_trunc('week', created_at) wk, count(*) cnt
    from auth.users group by 1
  ) c on c.wk = gs
  order by gs;
end;
$$;

revoke all on function public.admin_new_users_series() from public, anon;
grant execute on function public.admin_new_users_series() to authenticated;

-- admin_users_list() → per-user METADATA (real email/join date/provider +
-- counts). NO trade content. Reading auth.users + bypassing trades RLS here is
-- exactly what fixes the "Users = 1" bug.
create or replace function public.admin_users_list()
returns table (
  user_id        uuid,
  email          text,
  created_at     timestamptz,
  last_active    text,
  trade_count    int,
  feedback_count int,
  provider       text
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
  select
    u.id,
    u.email::text,
    u.created_at,
    greatest(t.last_trade, f.last_fb)::text as last_active,
    coalesce(t.cnt, 0)::int,
    coalesce(f.cnt, 0)::int,
    coalesce(
      u.raw_app_meta_data ->> 'provider',
      u.raw_app_meta_data -> 'providers' ->> 0
    )::text
  from auth.users u
  left join (
    select tr.user_id, count(*) cnt, max((tr."createdAt")::timestamptz) last_trade
    from public.trades tr where tr.user_id is not null group by tr.user_id
  ) t on t.user_id = u.id
  left join (
    select fb.user_id, count(*) cnt, max(fb.created_at::timestamptz) last_fb
    from public.feedback fb where fb.user_id is not null group by fb.user_id
  ) f on f.user_id = u.id::text  -- feedback.user_id is text
  order by u.created_at desc;
end;
$$;

revoke all on function public.admin_users_list() from public, anon;
grant execute on function public.admin_users_list() to authenticated;

-- admin_trades_agg() → platform aggregate scalars only. win_rate/avg_pnl are
-- computed INSIDE the DB from entry/exit; only the aggregate number leaves.
create or replace function public.admin_trades_agg()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _total     int;
  _demo      int;
  _with_stop int;
  _with_setup int;
  _win_rate  numeric;
  _avg_pnl   numeric;
  _top       text;
  _by_status json;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select
    count(*),
    count(*) filter (where is_demo),
    count(*) filter (where stop is not null),
    count(*) filter (where setup is not null and setup <> '')
  into _total, _demo, _with_stop, _with_setup
  from public.trades;

  with p as (
    select case when side = 'LONG'
                then (("exit")::numeric - entry::numeric) * shares::numeric
                else (entry::numeric - ("exit")::numeric) * shares::numeric end as pnl
    from public.trades
    where status = 'CLOSED' and "exit" is not null and entry is not null and shares is not null
  )
  select round(100.0 * count(*) filter (where pnl > 0) / nullif(count(*), 0), 1),
         round(avg(pnl), 2)
    into _win_rate, _avg_pnl
  from p;

  select mode() within group (order by ticker)
    into _top
  from public.trades where ticker is not null and ticker <> '';

  select json_object_agg(coalesce(status, 'UNKNOWN'), c)
    into _by_status
  from (select status, count(*) c from public.trades group by status) s;

  return json_build_object(
    'total',          _total,
    'demo_count',     _demo,
    'win_rate',       _win_rate,
    'avg_pnl',        _avg_pnl,
    'pct_with_stop',  case when _total > 0 then round(100.0 * _with_stop / _total, 1) else 0 end,
    'pct_with_setup', case when _total > 0 then round(100.0 * _with_setup / _total, 1) else 0 end,
    'top_ticker',     coalesce(_top, '—'),
    'by_status',      coalesce(_by_status, '{}'::json)
  );
end;
$$;

revoke all on function public.admin_trades_agg() from public, anon;
grant execute on function public.admin_trades_agg() to authenticated;

-- admin_trades_list() → per-row MODERATION METADATA only. Enough to identify &
-- delete a spam/demo trade; exposes ZERO content (no ticker/entry/exit/pnl/
-- notes/emotion). has_stop / has_setup are booleans, not values.
create or replace function public.admin_trades_list(
  _limit  int  default 200,
  _offset int  default 0,
  _status text default null,
  _demo   text default null   -- 'only' | 'hide' | null
)
returns table (
  id         uuid,
  user_id    uuid,
  user_email text,
  trade_date text,
  created_at text,
  status     text,
  is_demo    boolean,
  has_stop   boolean,
  has_setup  boolean
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
  select
    t.id,
    t.user_id,
    u.email::text,
    t.date::text,
    t."createdAt"::text,
    t.status::text,
    coalesce(t.is_demo, false),
    (t.stop is not null),
    (t.setup is not null and t.setup <> '')
  from public.trades t
  left join auth.users u on u.id = t.user_id
  where (_status is null or _status = 'all' or t.status = _status)
    and (_demo is null or (_demo = 'only' and t.is_demo) or (_demo = 'hide' and coalesce(t.is_demo, false) = false))
  order by t."createdAt"::timestamptz desc
  limit greatest(_limit, 0) offset greatest(_offset, 0);
end;
$$;

revoke all on function public.admin_trades_list(int, int, text, text) from public, anon;
grant execute on function public.admin_trades_list(int, int, text, text) to authenticated;

-- admin_feedback_list() → full feedback (intended for admin, per mandate).
create or replace function public.admin_feedback_list()
returns table (
  id         uuid,
  user_id    text,
  user_email text,
  type       text,
  message    text,
  status     text,
  created_at timestamptz
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
  select f.id, f.user_id::text, f.user_email::text, f.type::text,
         f.message::text, f.status::text, f.created_at::timestamptz
  from public.feedback f
  order by f.created_at desc;
end;
$$;

revoke all on function public.admin_feedback_list() from public, anon;
grant execute on function public.admin_feedback_list() to authenticated;

-- =========================================================================
-- 2. DESTRUCTIVE RPCs — admin-verified server-side (replace client deletes).
--    Each returns the affected row count.
-- =========================================================================

create or replace function public.admin_set_feedback_status(_id uuid, _status text)
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
  if _status not in ('new', 'reviewed', 'resolved') then
    raise exception 'invalid status: %', _status;
  end if;
  update public.feedback set status = _status where id = _id;
  get diagnostics _n = row_count;
  return _n;
end;
$$;

revoke all on function public.admin_set_feedback_status(uuid, text) from public, anon;
grant execute on function public.admin_set_feedback_status(uuid, text) to authenticated;

create or replace function public.admin_delete_trade(_id uuid)
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
  delete from public.trades where id = _id;
  get diagnostics _n = row_count;
  return _n;
end;
$$;

revoke all on function public.admin_delete_trade(uuid) from public, anon;
grant execute on function public.admin_delete_trade(uuid) to authenticated;

create or replace function public.admin_delete_feedback(_id uuid)
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
  delete from public.feedback where id = _id;
  get diagnostics _n = row_count;
  return _n;
end;
$$;

revoke all on function public.admin_delete_feedback(uuid) from public, anon;
grant execute on function public.admin_delete_feedback(uuid) to authenticated;

create or replace function public.admin_delete_demo_trades()
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
  delete from public.trades where is_demo = true;
  get diagnostics _n = row_count;
  return _n;
end;
$$;

revoke all on function public.admin_delete_demo_trades() from public, anon;
grant execute on function public.admin_delete_demo_trades() to authenticated;

-- admin_delete_user_data(target) — the most destructive action: wipes all
-- trades + feedback for a user. Refinement #2: an admin can never delete their
-- OWN data through this path (guards against a mis-click self-wipe).
create or replace function public.admin_delete_user_data(_target uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare _t int; _f int;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if _target is null then
    raise exception 'target user_id is required';
  end if;
  if _target = auth.uid() then
    raise exception 'cannot delete own admin data';
  end if;

  delete from public.trades where user_id = _target;
  get diagnostics _t = row_count;
  delete from public.feedback where user_id = _target::text;  -- feedback.user_id is text
  get diagnostics _f = row_count;

  return json_build_object('trades_deleted', _t, 'feedback_deleted', _f);
end;
$$;

revoke all on function public.admin_delete_user_data(uuid) from public, anon;
grant execute on function public.admin_delete_user_data(uuid) to authenticated;

-- =========================================================================
-- TEARDOWN (reversible):
--   drop function if exists public.admin_delete_user_data(uuid);
--   drop function if exists public.admin_delete_demo_trades();
--   drop function if exists public.admin_delete_feedback(uuid);
--   drop function if exists public.admin_delete_trade(uuid);
--   drop function if exists public.admin_set_feedback_status(uuid, text);
--   drop function if exists public.admin_feedback_list();
--   drop function if exists public.admin_trades_list(int, int, text, text);
--   drop function if exists public.admin_trades_agg();
--   drop function if exists public.admin_users_list();
--   drop function if exists public.admin_new_users_series();
--   drop function if exists public.admin_overview();
--   drop function if exists public.is_admin();
--   drop table if exists public.admins;
-- =========================================================================
