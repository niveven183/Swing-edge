// [D] Orchestrate a full import: run every row through normalizeRow, split into
// valid / rejected / duplicates, and count stop-less imports (for the summary
// notice). Duplicate = ticker + date + entry identical to an already-existing
// trade (or to an earlier row in this same file).

import { normalizeRow } from "./normalizeRow.js";

const dupKey = (t) => `${String(t.ticker).toUpperCase()}|${t.date}|${Number(t.entry)}`;

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

  const valid = [];
  const rejected = [];
  const duplicates = [];
  const unresolvedSymbols = [];
  let noStopCount = 0;

  rows.forEach((row, i) => {
    const res = normalizeRow(row, mapping, opts);
    if (!res.ok) {
      rejected.push({ rowNumber: i + 1, code: res.code, detail: res.detail, raw: row });
      return;
    }
    const t = res.trade;
    if (res.unresolvedSymbol) unresolvedSymbols.push({ rowNumber: i + 1, ticker: t.ticker });
    const key = dupKey(t);
    const isDup = existingKeys.has(key) || seenInFile.has(key);
    seenInFile.add(key);
    if (t.stop == null) noStopCount += 1;
    if (isDup) {
      duplicates.push({ rowNumber: i + 1, trade: t });
    } else {
      valid.push(t);
    }
  });

  return {
    valid,          // non-duplicate, importable now
    duplicates,     // flagged; user chooses skip / import anyway
    rejected,       // { rowNumber, code, detail, raw }
    noStopCount,    // among valid+duplicates, how many have stop=null
    unresolvedSymbols, // imported under a security name; no live quote until resolved
    skipped,        // [{ rowNumber, kind }] — dropped by a broker profile, not a trade
    skippedByKind,  // { kind: count }
    counts: {
      total: rows.length + skipped.length,
      valid: valid.length,
      duplicates: duplicates.length,
      rejected: rejected.length,
      unresolvedSymbol: unresolvedSymbols.length,
      skipped: skipped.length,
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
