// ─── EQUITY BASE — THE ONE POINT THE WHOLE CURVE HANGS FROM ──────────────────
//
// An equity curve is a base plus a running sum of deltas. The deltas were
// already frozen: makeConvertingCalc converts each trade's P&L at the fixing of
// the day it was realized, so a closed trade reports the same profit forever.
// The BASE was not. It was converted at spot, which meant the entire curve slid
// vertically every morning the shekel moved, with nobody having touched a
// trade — and the return % slid with it.
//
// That is a direct breach of the contract stated in fx.js:16-17, which names "a
// point on the equity curve" as a PAST value that must use its own day's rate.
// The curve's own origin was the one place the rule was not applied.
//
// ── Which day is the base day ────────────────────────────────────────────────
//
// There is no "capital was set on" timestamp: `capital` is editable in Settings
// at any time and carries no date. The curve, however, already has an origin —
// the first realized trade. We use THAT day's fixing, and not the day before it
// (which is where the START marker is plotted), for one decisive reason: the
// first realized day is already in `fxDayKeys`, so it is guaranteed present in
// `byDay` after buildRateTable's walk-back. The day before it is not requested,
// and could land on a Saturday. Zero new fetches, and no day that can go
// missing.
//
// ── The degradation path is the whole design ─────────────────────────────────
//
// When there is no fixing for the base day, this returns the capital UNTOUCHED
// in its own currency. It does NOT fall back to spot. Falling back to spot
// would be the original bug wearing a fallback's clothes — and it would be
// invisible, because the number would look perfectly reasonable. This is the
// same refusal useFxRates.js:114 already makes for a trade's P&L, and it only
// triggers when the whole byDay table is empty, in which case no P&L is
// converted either and the curve stays internally consistent in one currency.

import { realizedAt, realizedDayKey } from "../utils.js";
import { convert } from "./fx.js";

/**
 * The day whose fixing anchors the curve: the earliest realized trade's day.
 * Null when nothing has been closed — there is no history to anchor to yet.
 */
export const equityBaseDayKey = (trades = []) => {
  let earliest = null;
  let key = null;
  for (const t of trades) {
    if (!t || t.status !== "CLOSED") continue;
    const at = realizedAt(t);
    if (at == null) continue;
    if (earliest == null || at < earliest) {
      earliest = at;
      key = realizedDayKey(t);
    }
  }
  return key;
};

/**
 * The capital base the equity curve and the return % are computed from.
 *
 * ── B-142 (2026-08-15) · returns a DECISION, not a number ────────────────────
 *
 * 🔴 It used to return a bare number, and the degradation path above meant that
 * number was SOMETIMES denominated in `accountCurrency` and sometimes in
 * `capitalCurrency` — with nothing on it saying which. The caller printed it
 * under the account symbol either way, and divided `curEquity` by it to get the
 * return %. A base in shekels under a dollar sign, and a percentage that is a
 * ratio of two different units. Both silent. That was T10 finding 2 coming back
 * through a side door, and it is exactly the shape `livePnlAmount` already
 * refuses in `useFxRates.js`.
 *
 * ⇒ same shape as every other FX decision in this codebase:
 *
 *   { ok:true,  reason:"identity"|"converted"|"spot", value, currency:accountCurrency }
 *   { ok:false, reason:<convert's own reason>,        value:<raw capital>, currency:capitalCurrency }
 *
 * ⚠️ `value` is NEVER null — unlike `amountAt`. A curve must have an origin, and
 * the contract at the top of this file (the degradation path) says the shortfall
 * comes back as the RAW capital and never as spot. That has not moved. What
 * moved is that the caller now LEARNS which currency it got, instead of assuming.
 *
 * ⛔ No `|| 1` and no guessed rate: `ok:false` is an answer the screen acts on.
 */
export const resolveEquityBase = ({ capital, capitalCurrency, accountCurrency, fxTable, trades = [] }) => {
  const cap = Number(capital) || 0;
  // The refusal keeps the capital AS IT IS, and says so in its own currency.
  const refuse = (reason) => ({ ok: false, reason, value: cap, currency: capitalCurrency });

  // Identity is not a conversion (fx.js:64-67).
  if (capitalCurrency === accountCurrency)
    return { ok: true, reason: "identity", value: cap, currency: accountCurrency };

  const dayKey = equityBaseDayKey(trades);
  if (!dayKey) {
    // No closed trades: the curve is a single point, and a single point is a
    // claim about NOW. Spot is the correct rate for a present value — and it is
    // reported as "spot" rather than "converted" so the distinction stays
    // readable at the call site instead of living only in this comment.
    const { value, reason } = convert(cap, capitalCurrency, accountCurrency, fxTable);
    if (value == null) return refuse(reason || "no_spot_rate");
    return { ok: true, reason: "spot", value, currency: accountCurrency };
  }

  const { value, reason } = convert(cap, capitalCurrency, accountCurrency, fxTable, dayKey);
  // No fixing for the base day → keep the capital as it is. Never spot.
  if (value == null) return refuse(reason || "no_rate_for_day");
  return { ok: true, reason: "converted", value, currency: accountCurrency };
};
