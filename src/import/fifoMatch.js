// [D] FIFO matching. A broker export is a transaction log, not a trade log: one
// row per buy and one per sell. Without matching them every row lands as its own
// open position — which is exactly what user a0556783290 saw ("הכל פתיחת עיסקה").
//
// Pure function, zero UI dependency: trades in -> { closedTrades, openTrades, log }.
// Runs after normalizeRow and only on the broker route; the generic route, where
// a single row already carries both entry and exit, never reaches this file.

// Quantities can be fractional on foreign securities, so "is this lot empty?"
// must not be an equality test against 0.
const EPS = 1e-9;

const newId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// Same convention as normalizeRow.js:123 — a closed trade's timestamp is the
// exit date at 20:00 local. Two places deriving it differently would put
// imported trades on different days depending on which one built them.
const closeStampFor = (date) => new Date(`${date}T20:00:00`).toISOString();

// Broker exports carry no fee column that the schema can hold: TRADE_COLUMNS has
// neither fees nor tax, so normalizeRow drops those cells before a trade object
// ever exists. The engine therefore cannot see them, and says so rather than
// reporting a zero it did not measure (CLAUDE.md §2).
export const FEES_NOTE =
  "not-modelled — no fee/tax column exists in the trade schema, so fee cells are dropped at normalizeRow and are invisible here";

// Neither broker exports a time of day (brokerProfiles.js:25-53), so the only
// tie-break inside one date is the order of the rows in the file. That is safe
// when the file reads oldest-first and wrong when it reads newest-first: a
// same-day sell would be seen before the buy it closes and become an orphan
// SHORT. Only an unambiguous descent is reversed — at least one step down and
// not a single step up. A mixed file is left alone and named in the log, because
// guessing at it would be worse than the stable sort already is.
export function fileOrderNote(trades) {
  let up = 0;
  let down = 0;
  for (let i = 1; i < trades.length; i++) {
    const prev = trades[i - 1]?.date;
    const cur = trades[i]?.date;
    if (!prev || !cur) continue;
    if (cur > prev) up += 1;
    else if (cur < prev) down += 1;
  }
  if (down > 0 && up === 0) return "reversed";
  if (up > 0 && down === 0) return "ascending";
  if (up > 0 && down > 0) return "mixed";
  return "flat";
}

// A closed trade is the buy, carrying the sell's price and date. entry/date/
// createdAt stay the buy's; exit/closedAt become the sell's; shares is the
// matched quantity, not either side's full size. `pnl` is deliberately absent —
// calcTradeMetrics derives it and there is no pnl column (single source of truth).
const closedFrom = (buy, sell, qty) => ({
  ...buy,
  id: newId(),
  shares: qty,
  exit: sell.entry,
  status: "CLOSED",
  closedAt: sell.closedAt || closeStampFor(sell.date),
});

// trades: Trade[] in file-row order (the output of normalizeRow).
// Returns closed trades in the order their sells were processed, open trades in
// file order, and a log that names every decision the engine made.
export function fifoMatch(trades) {
  const input = Array.isArray(trades) ? trades : [];
  const orderNote = fileOrderNote(input);
  const reversedFileOrder = orderNote === "reversed";

  const ordered = reversedFileOrder ? [...input].reverse() : [...input];
  const seq = ordered.map((trade, order) => ({ trade, order }));
  // Stable by construction: equal dates fall back to the (possibly reversed)
  // row index, so the result never depends on the sort implementation.
  seq.sort((a, b) => {
    const da = a.trade.date || "";
    const db = b.trade.date || "";
    if (da < db) return -1;
    if (da > db) return 1;
    return a.order - b.order;
  });

  const books = new Map(); // ticker -> open buy lots, oldest first
  const closedTrades = [];
  const openOut = []; // { order, trade } — re-sorted to file order at the end
  const log = {
    tradesIn: input.length,
    matched: 0,        // closed trades produced
    partialFills: 0,   // buys closed only in part, leaving a remainder open
    splitSells: 0,     // sells that spanned more than one buy
    orphanSells: 0,    // sells with no prior buy -> SHORT
    unmatchedBuys: 0,  // buys never touched by a sell
    reversedFileOrder,
    orderNote,
    fees: FEES_NOTE,
  };

  for (const { trade, order } of seq) {
    const key = String(trade.ticker || "").toUpperCase();

    if (trade.side !== "SHORT") {
      if (!books.has(key)) books.set(key, []);
      books.get(key).push({ trade, order, remaining: trade.shares, touched: false });
      continue;
    }

    // A sell. Consume the oldest open lots of this security, and only this one.
    let toFill = trade.shares;
    const book = books.get(key) || [];
    let legs = 0;
    while (toFill > EPS && book.length > 0) {
      const lot = book[0];
      const qty = Math.min(toFill, lot.remaining);
      closedTrades.push(closedFrom(lot.trade, trade, qty));
      lot.remaining -= qty;
      lot.touched = true;
      toFill -= qty;
      legs += 1;
      if (lot.remaining <= EPS) book.shift();
    }
    log.matched += legs;
    if (legs > 1) log.splitSells += 1;

    if (toFill > EPS) {
      // Rule 3: a sell with nothing to close is a short being opened, not an
      // error. Only the unmatched part opens; a partly-matched sell keeps its
      // original object untouched so nothing is invented when legs === 0.
      log.orphanSells += 1;
      const whole = legs === 0 && Math.abs(toFill - trade.shares) <= EPS;
      openOut.push({ order, trade: whole ? trade : { ...trade, id: newId(), shares: toFill } });
    }
  }

  // Rule 4: whatever no sell reached stays open and enters as usual.
  for (const book of books.values()) {
    for (const lot of book) {
      if (lot.remaining <= EPS) continue;
      if (lot.touched) {
        log.partialFills += 1;
        openOut.push({ order: lot.order, trade: { ...lot.trade, id: newId(), shares: lot.remaining } });
      } else {
        log.unmatchedBuys += 1;
        openOut.push({ order: lot.order, trade: lot.trade });
      }
    }
  }

  openOut.sort((a, b) => a.order - b.order);
  return { closedTrades, openTrades: openOut.map((o) => o.trade), log };
}
