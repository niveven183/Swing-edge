-- ─── ADMIN RPCs · A RATE WITH A DENOMINATOR THAT CAN HOLD IT ────────────────
--
-- ⛔ NOT RUN by Claude Code. Niv runs this in the SQL Editor (CLAUDE.md §12).
--
-- Three rates in 20260719120000_admin_rpcs.sql answer a question nobody asked.
-- The failure is the same one in all three, which is why all three move here
-- together: fixing one and leaving two sick is booking a meeting with ourselves
-- in a month.
--
-- ── Wound 1 · `else 0` on an empty population ────────────────────────────────
--
-- `case when _total > 0 then round(…) else 0 end` reports 0% for a table with
-- no rows. "0% of trades have a stop" reads as "nobody sets stops". The truth
-- is "there are no trades". Same for avg_trades_user with no users. NULL is the
-- answer to a question about an empty set; 0 is a claim. Line :249 of the
-- original already got this right with `nullif(count(*), 0)` — these three
-- simply never caught up.
--
-- ── Wound 2 · a denominator that cannot hold what was counted ────────────────
--
-- CLAUDE.md §2: "before reporting a rate — can the denominator even contain
-- what was counted?" `pct_with_stop` divided by `_total`, which INCLUDES demo
-- trades. Demo rows are seeded by us, they all carry stops, and they are not
-- behaviour. The number was measuring the seed fixture, not the users. So the
-- numerator and the denominator now share one population: real trades.
--
-- `avg_trades_user` has the same shape — total trades (demo included) over
-- total users — so it too counts seeding as usage.
--
-- ── Wound 3 · a rate with no counts beside it ────────────────────────────────
--
-- A rounded percent cannot be un-rounded. AdminPanel.jsx already says so in
-- prose ("reconstructing it from a rounded percent would be fake precision")
-- and prints only the denominator it happens to have. The raw counts now ship
-- with the rate, so the panel can render 41/41 rather than 100%.
--
-- Idempotent: both functions are `create or replace`, and the grants are
-- restated so a fresh database that runs only this file is not left open.

-- ─── admin_overview() ────────────────────────────────────────────────────────
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
  _real_trades    int;
  _new_users_week int;
  _trades_week    int;
  _waitlist       int;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select count(*) into _total_users from auth.users;
  select count(*) into _total_trades from public.trades;
  -- The population `avg_trades_user` is actually about: trades a human entered.
  select count(*) into _real_trades from public.trades where not is_demo;
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
    'real_trades',     _real_trades,
    'new_users_week',  _new_users_week,
    'trades_week',     _trades_week,
    'waitlist_count',  _waitlist,
    -- NULL with no users. There is no average of nothing, and 0 would say the
    -- users we have enter no trades.
    'avg_trades_user', round(_real_trades::numeric / nullif(_total_users, 0), 1)
  );
end;
$$;

revoke all on function public.admin_overview() from public, anon;
grant execute on function public.admin_overview() to authenticated;

-- ─── admin_trades_agg() ──────────────────────────────────────────────────────
create or replace function public.admin_trades_agg()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _total      int;
  _demo       int;
  _real       int;
  _with_stop  int;
  _with_setup int;
  _win_rate   numeric;
  _avg_pnl    numeric;
  _top        text;
  _by_status  json;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  -- Numerator and denominator drawn from ONE population: real trades. Before
  -- this, `_with_stop` counted demo rows and `_total` did too, so the rate
  -- described our seed fixture.
  select
    count(*),
    count(*) filter (where is_demo),
    count(*) filter (where not is_demo),
    count(*) filter (where not is_demo and stop is not null),
    count(*) filter (where not is_demo and setup is not null and setup <> '')
  into _total, _demo, _real, _with_stop, _with_setup
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
    'real_count',     _real,
    'win_rate',       _win_rate,
    'avg_pnl',        _avg_pnl,
    -- The raw counts travel WITH the rate, so the panel can print 41/41.
    'with_stop',      _with_stop,
    'with_setup',     _with_setup,
    'pct_with_stop',  round(100.0 * _with_stop / nullif(_real, 0), 1),
    'pct_with_setup', round(100.0 * _with_setup / nullif(_real, 0), 1),
    'top_ticker',     coalesce(_top, '—'),
    'by_status',      coalesce(_by_status, '{}'::json)
  );
end;
$$;

revoke all on function public.admin_trades_agg() from public, anon;
grant execute on function public.admin_trades_agg() to authenticated;
