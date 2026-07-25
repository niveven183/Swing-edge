-- =========================================================================
-- Invite send RPCs — approve-and-send in one server-side hop (S3.1, DB layer).
--
-- WHY: today an admin approves waitlist rows in the panel, then separately runs
-- the "Email Campaign" GitHub Action to send. S3.2 collapses that into one click
-- (approve ⇒ send) via a Vercel function. These three RPCs are the DB half of
-- that flow — the Vercel function (NOT this task) is their only intended caller;
-- an admin session may also call them directly for smoke tests.
--
-- The caps live HERE, server-side, so a client can never widen them:
--   • daily approval cap = 120 (Asia/Jerusalem calendar day) — counts only rows
--     NEWLY approved; an already-approved row never spends quota twice.
--   • per-call batch cap  = 25.
-- The send-list dedup is copied WORD-FOR-WORD from the workflow's fetch query
-- (.github/workflows/email-campaign.yml) so the workflow and the Vercel path can
-- never double-send the same campaign to the same address.
--
-- Mirrors the 24.07 admin RPC pattern (20260719120000_admin_rpcs.sql,
-- 20260724092315_waitlist_approval.sql): security definer · search_path=public ·
-- is_admin() gate · revoke from public/anon · grant to authenticated. Idempotent
-- (create or replace) and reversible (TEARDOWN at the bottom).
--
-- admin_waitlist_approve (24.07) is intentionally LEFT UNTOUCHED for backward
-- compatibility. No table/column is dropped; no service-role key appears here.
--
-- NOT run automatically on prod — applied manually by the operator.
-- =========================================================================

-- 1) admin_invite_quota() → today's approval budget for the panel/Vercel fn.
--    approved_today counts the whole waitlist on the Asia/Jerusalem calendar day.
create or replace function public.admin_invite_quota()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  DAILY_CAP constant int := 120;
  _approved_today int;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select count(*) into _approved_today
  from public.waitlist
  where (approved_at at time zone 'Asia/Jerusalem')::date
        = (now() at time zone 'Asia/Jerusalem')::date;

  return json_build_object(
    'approved_today', _approved_today,
    'daily_cap',      DAILY_CAP,
    'remaining',      greatest(DAILY_CAP - _approved_today, 0)
  );
end;
$$;

revoke all on function public.admin_invite_quota() from public, anon;
grant execute on function public.admin_invite_quota() to authenticated;

-- 2) admin_invite_send(_ids, _campaign) → approve the given rows (up to the caps)
--    and return the addresses that must be emailed NOW. Caps are in-body
--    constants, never client parameters. Every check aborts BEFORE any mutation.
create or replace function public.admin_invite_send(
  _ids uuid[],
  _campaign text default 'waitlist_launch'
)
returns table (email text)
language plpgsql
security definer
set search_path = public
as $$
declare
  DAILY_CAP constant int := 120;
  BATCH_CAP constant int := 25;
  _approved_today int;
  _new_count      int;
  _remaining      int;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  -- Serialize concurrent sends (double-click / slow network). Without this, two
  -- requests can both read approved_today=100 between check (c) and update (d),
  -- both pass, and land at 150 — the cap silently breached. Transaction-scoped:
  -- auto-released at commit/rollback.
  perform pg_advisory_xact_lock(hashtext('swingedge_invite_send'));

  -- a. nothing to do.
  if _ids is null or array_length(_ids, 1) is null then
    raise exception 'לא נבחרו נמענים';
  end if;

  -- b. batch ceiling.
  if array_length(_ids, 1) > BATCH_CAP then
    raise exception 'אפשר לאשר עד % נמענים בקריאה אחת; התקבלו %',
      BATCH_CAP, array_length(_ids, 1);
  end if;

  -- c. daily ceiling — count ONLY the rows that will actually be newly approved
  --    (approved_at is null). Already-approved rows don't spend quota again.
  select count(*) into _approved_today
  from public.waitlist
  where (approved_at at time zone 'Asia/Jerusalem')::date
        = (now() at time zone 'Asia/Jerusalem')::date;

  select count(*) into _new_count
  from public.waitlist
  where id = any(_ids) and approved_at is null;

  if _approved_today + _new_count > DAILY_CAP then
    _remaining := greatest(DAILY_CAP - _approved_today, 0);
    raise exception 'חריגה מהתקרה היומית: אושרו היום %, נותרו %, התבקשו % חדשים (מקסימום יומי %)',
      _approved_today, _remaining, _new_count, DAILY_CAP;
  end if;

  -- d. only now mutate: mark the not-yet-approved rows approved.
  update public.waitlist
    set approved_at = now()
    where id = any(_ids) and approved_at is null;

  -- e. recipients to send to now. dedup block is BYTE-IDENTICAL to the fetch in
  --    email-campaign.yml. distinct guards the projection against duplicate
  --    waitlist rows for one address (both would send before any log row exists,
  --    so ON CONFLICT can't help) — the NOT EXISTS itself is unchanged.
  return query
    select distinct w.email::text
    from public.waitlist w
    where w.id = any(_ids)
      and w.approved_at is not null
      and not exists (select 1 from public.email_campaign_log l
                      where l.campaign = _campaign
                        and lower(l.email) = lower(w.email)
                        and l.status = 'sent');
end;
$$;

revoke all on function public.admin_invite_send(uuid[], text) from public, anon;
grant execute on function public.admin_invite_send(uuid[], text) to authenticated;

-- 3) admin_log_campaign_send(_campaign, _rows) → record send results. Idempotent
--    against email_campaign_log_uniq (campaign, lower(email)). Returns how many
--    rows were actually inserted (post ON CONFLICT). _rows = [{email,status,error}].
create or replace function public.admin_log_campaign_send(_campaign text, _rows jsonb)
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

  insert into public.email_campaign_log (campaign, email, status, error)
  select _campaign, x.email, x.status, nullif(x.error, '')
  from jsonb_to_recordset(_rows) as x(email text, status text, error text)
  on conflict do nothing;

  get diagnostics _n = row_count;
  return _n;
end;
$$;

revoke all on function public.admin_log_campaign_send(text, jsonb) from public, anon;
grant execute on function public.admin_log_campaign_send(text, jsonb) to authenticated;

-- =========================================================================
-- TEARDOWN (reversible):
--   drop function if exists public.admin_log_campaign_send(text, jsonb);
--   drop function if exists public.admin_invite_send(uuid[], text);
--   drop function if exists public.admin_invite_quota();
-- =========================================================================
