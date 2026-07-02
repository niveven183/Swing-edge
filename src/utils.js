export const DEFAULT_CAPITAL = 2500;
export const RISK_PCT = 0.01;

export const calcTradeMetrics = (trade) => {
  if (!trade.exit) return { pnl: null, rMultiple: null };
  const risk = Math.abs(trade.entry - trade.stop) * trade.shares;
  const pnl = trade.side === "LONG"
    ? (trade.exit - trade.entry) * trade.shares
    : (trade.entry - trade.exit) * trade.shares;
  return { pnl, rMultiple: risk > 0 ? pnl / risk : 0 };
};

// Price-only Reward/Risk ratio for a planned setup — independent of position
// size, so it stays valid even when shares are unentered or round to 0.
export const priceBasedRR = (entry, stop, target) => {
  const risk   = Math.abs(entry - stop);
  const reward = Math.abs(target - entry);
  return risk > 0 && reward > 0 ? reward / risk : 0;
};

// Infer trade direction from the setup geometry. Target above entry = LONG
// (profit on the way up), below = SHORT. Falls back to stop side only when no
// target is set, so the analyzer's "stop on wrong side" check stays meaningful.
export const inferSide = (entry, stop, target) => {
  if (target > 0 && target !== entry) return target > entry ? "LONG" : "SHORT";
  if (stop   > 0 && stop   !== entry) return stop  < entry ? "LONG" : "SHORT";
  return "LONG";
};

// Validate a planned trade's geometry against the explicitly chosen side.
// Single source of truth for input validity — shared by Log New Trade and
// (later) the Analyzer. Uses the explicit `side` rather than inferSide, which
// masks reversed input. Returns { valid, reason: { he, en } | null }.
export const validateTradeInputs = (entry, stop, target, side) => {
  const e = Number(entry) || 0;
  const s = Number(stop)  || 0;
  const t = Number(target) || 0;
  const isShort = side === "SHORT";

  if (e <= 0 || s <= 0) return {
    valid: false,
    reason: { he: "הזן מחיר כניסה וסטופ תקינים.", en: "Enter a valid entry and stop price." },
  };
  if (s === e) return {
    valid: false,
    reason: { he: "הסטופ זהה לכניסה — אין סיכון מוגדר.", en: "Stop equals entry — no risk defined." },
  };
  if (!isShort && s > e) return {
    valid: false,
    reason: { he: "ב-LONG הסטופ חייב להיות מתחת לכניסה.", en: "On a LONG the stop must be below entry." },
  };
  if (isShort && s < e) return {
    valid: false,
    reason: { he: "ב-SHORT הסטופ חייב להיות מעל הכניסה.", en: "On a SHORT the stop must be above entry." },
  };
  if (t > 0 && !isShort && t < e) return {
    valid: false,
    reason: { he: "ב-LONG היעד חייב להיות מעל הכניסה.", en: "On a LONG the target must be above entry." },
  };
  if (t > 0 && isShort && t > e) return {
    valid: false,
    reason: { he: "ב-SHORT היעד חייב להיות מתחת לכניסה.", en: "On a SHORT the target must be below entry." },
  };
  return { valid: true, reason: null };
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
