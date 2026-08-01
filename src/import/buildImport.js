// [D] Orchestrate a full import: run every row through normalizeRow, split into
// valid / rejected / duplicates, and count stop-less imports (for the summary
// notice). Duplicate = ticker + date + entry identical to an already-existing
// trade (or to an earlier row in this same file).

import { normalizeRow } from "./normalizeRow.js";
import { fifoMatch } from "./fifoMatch.js";

// ticker|date|entry alone is over-aggressive: one buy of 100 closed by sells of
// 40 and 60 produces two legitimate closed trades that share all three, so the
// second was flagged a duplicate and — with the default "skip duplicates" — was
// dropped without a word. The exit price, the matched size and the exit *date*
// are what tell two partial closes apart.
// The exit date is taken date-only, not as the full closedAt stamp: an imported
// close lands at 20:00 while a manual one lands at whatever hour it was saved,
// and comparing timestamps would stop re-imports of a manually closed trade from
// being recognised at all.
const dupKey = (t) =>
  [
    String(t.ticker).toUpperCase(),
    t.date,
    Number(t.entry),
    t.exit == null ? "" : Number(t.exit),
    t.shares == null ? "" : Number(t.shares),
    t.closedAt ? String(t.closedAt).slice(0, 10) : "",
  ].join("|");

// rows: string[][]; mapping: {field:index}; opts: { dateFormat, capital,
// todayISO, existingTrades: [] }.
export function buildImport(rows, mapping, opts = {}) {
  // Rows a broker profile dropped before we ever saw them. They are not rejects
  // — they were never trades — but they must still be counted and named, or the
  // difference between "the file had 55 trades" and "we lost 51 rows" is invisible.
  const skipped = opts.skipped || [];
  const skippedByKind = opts.skippedByKind || {};
  const existing = opts.existingTrades || [];
  const existingKeys = new Set(existing.map(dupKey));
  const seenInFile = new Set();

  const accepted = [];
  const rejected = [];
  let unresolvedSymbols = [];
  const unresolvedTickers = new Set();

  rows.forEach((row, i) => {
    const res = normalizeRow(row, mapping, opts);
    if (!res.ok) {
      rejected.push({ rowNumber: i + 1, code: res.code, detail: res.detail, raw: row });
      return;
    }
    if (res.unresolvedSymbol) {
      unresolvedSymbols.push({ rowNumber: i + 1, ticker: res.trade.ticker });
      unresolvedTickers.add(res.trade.ticker);
    }
    accepted.push({ rowNumber: i + 1, trade: res.trade });
  });

  // Opt-in, and only the broker route opts in: a generic file already carries
  // entry and exit on one row, so matching it would pair trades that were never
  // two halves of anything.
  let fifo = null;
  let items = accepted;
  if (opts.fifo) {
    const m = fifoMatch(accepted.map((a) => a.trade));
    fifo = { closed: m.closedTrades.length, open: m.openTrades.length, log: m.log };
    // A matched trade no longer belongs to a single row, so rowNumber is null
    // rather than a number that would point at the wrong row.
    items = [...m.closedTrades, ...m.openTrades].map((trade) => ({ rowNumber: null, trade }));
    // Recounted over the trades, not the rows. Eight rows carrying an
    // unresolved name become six trades, and reporting "7 imported under a
    // name" beside "6 trades imported" is a count of one population printed
    // against the denominator of another (CLAUDE.md §2).
    unresolvedSymbols = items
      .filter(({ trade }) => unresolvedTickers.has(trade.ticker))
      .map(({ trade }) => ({ rowNumber: null, ticker: trade.ticker }));
  }

  const valid = [];
  const duplicates = [];
  let noStopCount = 0;

  for (const { rowNumber, trade } of items) {
    const key = dupKey(trade);
    const isDup = existingKeys.has(key) || seenInFile.has(key);
    seenInFile.add(key);
    if (trade.stop == null) noStopCount += 1;
    if (isDup) duplicates.push({ rowNumber, trade });
    else valid.push(trade);
  }

  return {
    valid,          // non-duplicate, importable now
    duplicates,     // flagged; user chooses skip / import anyway
    rejected,       // { rowNumber, code, detail, raw }
    noStopCount,    // among valid+duplicates, how many have stop=null
    unresolvedSymbols, // imported under a security name; no live quote until resolved
    skipped,        // [{ rowNumber, kind }] — dropped by a broker profile, not a trade
    skippedByKind,  // { kind: count }
    fifo,           // null when the engine did not run; else { closed, open, log }
    counts: {
      // Two populations, two denominators — they are not interchangeable.
      // File rows:   rejected + skipped + (accepted rows) = total
      // Trades out:  valid + duplicates = closed + open   (= accepted when no FIFO)
      total: rows.length + skipped.length,
      accepted: accepted.length,
      valid: valid.length,
      duplicates: duplicates.length,
      rejected: rejected.length,
      unresolvedSymbol: unresolvedSymbols.length,
      skipped: skipped.length,
      closed: valid.filter((t) => t.status === "CLOSED").length,
      open: valid.filter((t) => t.status !== "CLOSED").length,
    },
  };
}

// Build a CSV string of rejected rows for download: rowNumber, reason(en), then
// the original cells.
export function rejectedToCSV(rejected, headers = []) {
  const esc = (v) => {
    const s = String(v ?? "");
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = ["row", "reason", ...headers].map(esc).join(",");
  const lines = rejected.map((r) =>
    [r.rowNumber, r.detail?.en || r.code, ...(r.raw || [])].map(esc).join(",")
  );
  return [head, ...lines].join("\n");
}
