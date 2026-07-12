-- B4.2 — Mentor invite flow RPCs (create + redeem).
-- Adds the SECURITY DEFINER layer B4.1 deliberately left out: mentorships has no
-- INSERT policy, so a pairing can be born ONLY through redeem_mentor_invite().
-- Does NOT touch existing RLS, is_active_mentor, or trades. Revoke stays mentee-only
-- via the existing "mentee updates own mentorship" policy (no RPC needed).
-- Idempotent (create or replace) and reversible (see teardown at end).

-- =========================================================================
-- create_mentor_invite() — mentee mints a short, unique, shareable code.
-- Runs as owner but the row is always stamped with auth.uid() as mentee_id,
-- so a caller can only ever create invites for themselves.
-- =========================================================================

create or replace function public.create_mentor_invite()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid      uuid := auth.uid();
  -- Crockford-ish base32, ambiguous glyphs (0/O/1/I/L/U) removed.
  _alphabet text := '23456789ABCDEFGHJKMNPQRSTVWXYZ';
  _code     text;
  _i        int;
begin
  if _uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  for _attempt in 1..10 loop
    _code := '';
    for _i in 1..8 loop
      _code := _code || substr(_alphabet, 1 + floor(random() * length(_alphabet))::int, 1);
    end loop;
    begin
      insert into public.mentor_invites (code, mentee_id) values (_code, _uid);
      return _code;
    exception when unique_violation then
      -- collision on code (or a rare duplicate) → retry with a fresh code
      continue;
    end;
  end loop;

  raise exception 'could not generate a unique invite code, try again';
end;
$$;

revoke all on function public.create_mentor_invite() from public, anon;
grant execute on function public.create_mentor_invite() to authenticated;

-- =========================================================================
-- redeem_mentor_invite(_code) — mentor claims a code → creates active mentorship.
-- ATOMIC claim: a single UPDATE ... WHERE status='open' ... RETURNING is the
-- check-and-set. Two mentors racing on the same code → exactly one UPDATE
-- matches the still-'open' row; the loser gets 0 rows and a clean error.
-- All validation lives here (client holds only the anon key).
-- =========================================================================

create or replace function public.redeem_mentor_invite(_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid    uuid := auth.uid();
  _mentee uuid;
  _mid    uuid;
  _row    record;
begin
  if _uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  -- Atomic claim: flip open→redeemed and grab the mentee in one shot.
  -- mentee_id <> _uid keeps a self-invite from ever being claimed.
  update public.mentor_invites
     set status = 'redeemed', used_by = _uid, used_at = now()
   where code = _code
     and status = 'open'
     and expires_at > now()
     and mentee_id <> _uid
  returning mentee_id into _mentee;

  if _mentee is null then
    -- Claim failed — diagnose why for a precise, honest error message.
    select mentee_id, status, expires_at into _row
      from public.mentor_invites
     where code = _code;
    if not found then
      raise exception 'invalid code';
    elsif _row.mentee_id = _uid then
      raise exception 'cannot mentor yourself';
    elsif _row.status <> 'open' then
      raise exception 'code already used';
    elsif _row.expires_at <= now() then
      raise exception 'code expired';
    else
      raise exception 'invalid code';
    end if;
  end if;

  -- Create the pairing. A duplicate active pair trips the partial unique index;
  -- catching it rolls the whole function back (invite stays open, no orphan).
  begin
    insert into public.mentorships (mentor_id, mentee_id, status, activated_at)
    values (_uid, _mentee, 'active', now())
    returning id into _mid;
  exception when unique_violation then
    raise exception 'already mentoring this user';
  end;

  return _mid;
end;
$$;

revoke all on function public.redeem_mentor_invite(text) from public, anon;
grant execute on function public.redeem_mentor_invite(text) to authenticated;

-- =========================================================================
-- TEARDOWN (reversible):
--   drop function if exists public.redeem_mentor_invite(text);
--   drop function if exists public.create_mentor_invite();
-- =========================================================================
