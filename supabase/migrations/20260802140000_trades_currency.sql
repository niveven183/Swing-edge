-- T9 — a currency column on public.trades.
--
-- Why: TASE securities are quoted in agorot (1/100 ₪). The import stripped the
-- currency sign and the number entered the journal context-free, so a share
-- bought at 34.70 ₪ was stored as 3470 and a real account read as a $280,000
-- loss. The import now converts the unit and knows the currency of every row —
-- but a trade object with nowhere to put it loses that knowledge on the first
-- reload.
--
-- Additive only. `default 'USD'` leaves every existing row exactly as it is:
-- zero UPDATE, and a user who never imported a foreign file sees no change.
--
-- ⛔ Claude Code does not run this (CLAUDE.md §12). Niv runs it in the SQL
-- editor. Until it runs, `currency` is dropped on write by
-- src/supabaseClient.js TRADE_COLUMNS and prices are still correct — only the
-- symbol falls back to '$' after a reload.

alter table public.trades
  add column if not exists currency text not null default 'USD';

alter table public.trades
  drop constraint if exists trades_currency_check;

alter table public.trades
  add constraint trades_currency_check check (currency in ('USD', 'ILS'));

-- ── verification ────────────────────────────────────────────────────────────
-- Expect: one row, currency | text | NO | 'USD'::text
--
--   select column_name, data_type, is_nullable, column_default
--   from information_schema.columns
--   where table_schema = 'public' and table_name = 'trades'
--     and column_name = 'currency';
--
-- Expect: every existing row USD, and the count equal to the pre-migration
-- total (90 on 2026-08-02).
--
--   select currency, count(*) from public.trades group by currency;

-- ── rollback ────────────────────────────────────────────────────────────────
--   alter table public.trades drop constraint if exists trades_currency_check;
--   alter table public.trades drop column if exists currency;
