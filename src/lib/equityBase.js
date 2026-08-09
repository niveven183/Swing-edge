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
 * The capital base the equity curve and the return % are computed from,
 * expressed in the display currency.
 *
 * @returns {number} never null — a base is always a usable number, but a base
 *          that could not be honestly converted stays in its own currency
 *          rather than borrowing today's rate.
 */
export const resolveEquityBase = ({ capital, capitalCurrency, accountCurrency, fxTable, trades = [] }) => {
  const cap = Number(capital) || 0;

  // Identity is not a conversion (fx.js:64-67).
  if (capitalCurrency === accountCurrency) return cap;

  const dayKey = equityBaseDayKey(trades);
  if (!dayKey) {
    // No closed trades: the curve is a single point, and a single point is a
    // claim about NOW. Spot is the correct rate for a present value.
    const { value } = convert(cap, capitalCurrency, accountCurrency, fxTable);
    return value == null ? cap : value;
  }

  const { value } = convert(cap, capitalCurrency, accountCurrency, fxTable, dayKey);
  // No fixing for the base day → keep the capital as it is. Never spot.
  return value == null ? cap : value;
};
