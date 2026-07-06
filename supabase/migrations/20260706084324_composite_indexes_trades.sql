-- perf(db): composite indexes on trades for per-user, date-ordered reads
-- Note: column is "createdAt" (camelCase timestamptz), not created_at.

CREATE INDEX IF NOT EXISTS idx_trades_user_date
  ON public.trades (user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_trades_user_created
  ON public.trades (user_id, "createdAt" DESC);
