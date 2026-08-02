import { format } from "date-fns";

export const DEFAULT_CAPITAL = 2500;
export const RISK_PCT = 0.01;

// Returns a LOCAL 'YYYY-MM-DD' key for a date-ish value (full ISO timestamp
// or an already-a-day string). Avoids toISOString(), which would roll a
// late-evening local timestamp into the next UTC day.
export const localDayKey = (raw) => {
  if (!raw) return null;
  if (typeof raw === "string" && raw.length === 10 && raw[4] === "-") return raw;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : format(d, "yyyy-MM-dd");
};

// When a trade's P&L was realized, as a sortable instant. Open trades have no
// close stamp, so they fall back to entry and sort as if realized on entry day.
export const realizedAt = (trade) => {
  const raw = trade?.closedAt || trade?.date;
  if (!raw) return null;
  const ms = new Date(raw).getTime();
  return isNaN(ms) ? null : ms;
};

// The LOCAL calendar day a trade's P&L belongs to. Separate from realizedAt
// because bucketing needs a local day while ordering needs the exact instant.
export const realizedDayKey = (trade) => localDayKey(trade?.closedAt || trade?.date);

// Hold time in calendar days: the day a trade was closed (`closedAt`) minus
// the day it was entered (`date`). `closedAt` is the only close timestamp —
// it is written by every close path, including the Exit Date input.
export const holdDays = (trade) => {
  const startKey = localDayKey(trade?.date);
  const endKey = localDayKey(trade?.closedAt);
  if (!startKey || !endKey) return null;
  const d1 = new Date(startKey + "T00:00:00").getTime();
  const d2 = new Date(endKey + "T00:00:00").getTime();
  if (isNaN(d1) || isNaN(d2)) return null;
  return Math.max(0, Math.round((d2 - d1) / 86400000));
};

export const calcTradeMetrics = (trade) => {
  if (!trade.exit) return { pnl: null, rMultiple: null };
  const pnl = trade.side === "LONG"
    ? (trade.exit - trade.entry) * trade.shares
    : (trade.entry - trade.exit) * trade.shares;
  // Imported trades may have no stop (stop=null). P&L is still real, but R is
  // undefined — never fabricate a risk value; report rMultiple as null so
  // analytics show N/A rather than a synthetic number.
  if (trade.stop == null) return { pnl, rMultiple: null };
  const risk = Math.abs(trade.entry - trade.stop) * trade.shares;
  // risk === 0 means stop === entry (or zero shares): the denominator is
  // undefined, not small. Reporting 0 would show a winning trade as 0.00R.
  return { pnl, rMultiple: risk > 0 ? pnl / risk : null };
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

// `-0 >= 0` is true, so a loss small enough to round away tested as a gain and
// rendered green. Every sign test on a money/R value must go through here so
// the number's color and its printed sign can never disagree.
export const isNegativeValue = (n) => n < 0 || Object.is(n, -0);

// The symbol is derived here and nowhere else. A hard-coded "$" in JSX is how a
// shekel trade came to be printed as dollars.
export const CURRENCY_SYMBOL = { USD: "$", ILS: "₪" };

// A trade without a currency predates the column and is a dollar trade — the
// migration's `default 'USD'` says the same thing on the server side.
export const currencyOf = (trade) =>
  CURRENCY_SYMBOL[trade?.currency] ? trade.currency : "USD";

// Signed money display. The second trap: `NaN >= 0` is false, so a blown-up
// metric fell into the negative branch and rendered as "-$NaN".
const money = (n, digits, currency) => {
  if (!Number.isFinite(n)) return "—";
  const sym = CURRENCY_SYMBOL[currency] || CURRENCY_SYMBOL.USD;
  return `${isNegativeValue(n) ? "-" : "+"}${sym}${Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
};

export const fmtMoney = (n, currency = "USD") => money(n, 2, currency);

// Whole-unit variant for tight surfaces (calendar cells, chart axes) where
// cents do not fit. The sign still lives in the text, never in the color alone.
export const fmtMoney0 = (n, currency = "USD") => money(n, 0, currency);

export const fmt$ = fmtMoney;
export const fmt$0 = fmtMoney0;

// Numeric field parsing at the input boundary. `0` is a value, not a blank:
// `parseFloat(v) || null` silently turned a real MFE/MAE of 0 into "not filled
// in". Garbage still becomes null rather than a stored NaN.
export const numOrNull = (v) => {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// Single source of truth for "format or show em-dash" — never fabricate a
// number for a non-numeric value (null/undefined/NaN).
export const fmtNum = (v, digits = 2) =>
  (typeof v === "number" && !Number.isNaN(v)) ? v.toFixed(digits) : "—";

export const fmtR = (r) =>
  (typeof r === "number" && !Number.isNaN(r))
    ? (isNegativeValue(r) ? `-${Math.abs(r).toFixed(2)}R` : `+${r.toFixed(2)}R`)
    : "—";

// `Number(v) || 0` turned a missing value into a confident "0%". A real 0 and
// "we never measured this" are different claims, and only one of them is a
// number. Empty portfolios still read 0% — EMPTY_STATS carries a numeric 0.
const asNum = (v) => (v === "" || v == null ? NaN : Number(v));

// Win-rate (and any 0..100 percentage) display — single source of truth for
// percentage rounding, so the same value renders identically everywhere.
export const formatPct = (v) =>
  Number.isFinite(asNum(v)) ? `${Math.round(asNum(v))}%` : "—";

// Return-on-capital display — single source of truth so the Dashboard KPI and
// the Analytics figure round the same value to the same digit (#7).
export const formatReturnPct = (v) =>
  Number.isFinite(asNum(v)) ? `${asNum(v).toFixed(2)}%` : "—";

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
