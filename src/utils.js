export const CAPITAL = 25000;
export const RISK_PCT = 0.01;

export const calcTradeMetrics = (trade) => {
  if (!trade.exit) return { pnl: null, rMultiple: null };
  const risk = Math.abs(trade.entry - trade.stop) * trade.shares;
  const pnl = trade.side === "LONG"
    ? (trade.exit - trade.entry) * trade.shares
    : (trade.entry - trade.exit) * trade.shares;
  return { pnl, rMultiple: risk > 0 ? pnl / risk : 0 };
};

export const fmt$ = (n) => n >= 0
  ? `+$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
  : `-$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

export const fmtR = (r) => r >= 0 ? `+${r.toFixed(2)}R` : `${r.toFixed(2)}R`;

// ─── followedPlan NORMALIZATION ───────────────────────────────────────────────
// `followedPlan` is true | false | "Partially" | null in the UI, but the DB
// column is text, so after a Supabase round-trip booleans come back as the
// STRINGS "true" / "false". Read-side normalization only — DB writes untouched.
// "Partially" is intentionally neutral: it counts as neither followed nor a
// deviation (preserving the original pre-bug behavior).
export const isFollowedPlan = (v) => v === true || v === "true";
export const isOffPlan = (v) => v === false || v === "false";

// ─── entryQuality NORMALIZATION ───────────────────────────────────────────────
// The form rates entry quality on a 1-5 star scale, but legacy/sample trades
// stored values up to 10. Normalize any value to 1-5 (halve+round the old
// 1-10 scale, preserving rank) so the stars render and the analytics group
// consistently. Returns 0 when there is no value.
export const qstars = (v) => {
  const n = Number(v) || 0;
  if (n <= 0) return 0;
  return n > 5 ? Math.min(5, Math.ceil(n / 2)) : Math.round(n);
};
