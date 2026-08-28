-- 2026-08-28 · W-CAP · QA account capital restore  (B-268)
--
-- ⛔ NOT a schema migration. It lives beside scripts/retention.sql — the other
-- manually-run file — and ⛔ NOT in supabase/migrations/, because that directory
-- is the schema lineage and this is a one-off data repair on ONE row.
--
-- ⛔ Claude Code does NOT run this. CLAUDE.md §12: Code writes the .sql, Niv runs
-- it in the Supabase SQL Editor.
--
-- ── Why exactly one row ────────────────────────────────────────────────────
-- Measured 28.08 on user_settings (39/39 rows):
--   4/39 carry capital = 2500 (DEFAULT_CAPITAL)
--   2/4  bear the clobber signature — updated_at on the morning of 27.08 AND an
--        onboarding declaration that differs from the stored capital
--   2/4  are pre-incident (updated_at 20.07 / 24.07, zero trades) ⇒ innocent
--
-- ⚠️ And the clobbered value is ⛔ NOT recoverable in general.
-- onboarding.profile.defaults.capital is what the user declared at SIGN-UP, ⛔ not
-- his capital today. Proof: two rows diverge legitimately (4,192.94 vs a declared
-- 49,000 · 59,999 vs 10,000), and the QA account itself declared 1,700 while its
-- real capital is 10,000. ⇒ ⛔ There is NO automatic restore, and ⛔ no UPDATE is
-- run against any other row. Every other affected user gets a BANNER, ⛔ not a write.
--
-- The QA account is the sole exception because its true capital is known
-- independently: the sentinel asserts 10,000.
--
-- ── Before running ─────────────────────────────────────────────────────────
-- 1) Fill the uid below. ⚠️ Claude Code left it deliberately EMPTY.
--    The prefix matching the 08:15 write in the 28.08 diagnosis is 1ad72482 —
--    ⚠️ that is a POINTER for you to verify, ⛔ not an authorization to use it.
-- 2) Run the SELECT first and read the row. If capital is not 2500, ⛔ STOP —
--    the row is not in the state this file was written for.
-- 3) `settings || jsonb_build_object(...)` patches ONE key and preserves every
--    sibling (watchlist / playbook / onboarding / priceAlerts). ⛔ Do not rewrite
--    the whole settings column — that is B-270.

-- ── STEP 1 · read before you write ─────────────────────────────────────────
select user_id,
       settings->>'capital'   as capital_now,
       settings->'onboarding'->'profile'->'defaults'->>'capital' as declared_at_signup,
       updated_at
  from public.user_settings
 where user_id = '<<QA uid — Niv fills this in>>';

-- ── STEP 2 · restore, one row, one key ─────────────────────────────────────
update public.user_settings
   set settings   = settings || jsonb_build_object('capital', 10000),
       updated_at = now()
 where user_id = '<<QA uid — Niv fills this in>>'
   and settings->>'capital' = '2500';   -- ⛔ no-op if the row already moved

-- ── STEP 3 · confirm ───────────────────────────────────────────────────────
select user_id, settings->>'capital' as capital_after, updated_at
  from public.user_settings
 where user_id = '<<QA uid — Niv fills this in>>';
