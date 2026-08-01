// [C] Broker-specific import profiles. A profile engages only when the broker's
// full column fingerprint is present, and it decides exactly three things: which
// rows are trades, which side each trade is, and what goes into `ticker`. Every
// row it drops is reported with its action type — nothing is discarded quietly.
// A file that matches no profile takes the generic route, untouched.

import { matchHeader, normalizeSide } from "./synonyms.js";
import { looksLikeSymbol } from "./detectColumns.js";
import { matrixToTable } from "./parseFile.js";
import { num } from "./normalizeRow.js";

// Brokers type their quotes with whatever their export tool emits: IBI writes
// `שווי כולל בש”ח` with a curly U+201D and `המרת מט״ח` with a U+05F4 gershayim.
// Without folding those onto one form no hand-typed fingerprint can ever match.
const GERSHAYIM = /[“”״"]/g;
const GERESH = /[‘’׳']/g;

export const normHeaderText = (raw) =>
  String(raw ?? "")
    .replace(GERSHAYIM, '"')
    .replace(GERESH, "'")
    .replace(/\s+/g, " ")
    .trim();

const IBI_COLUMNS = [
  "שם נייר",
  "מספר נייר",
  "פעולה",
  "כמות",
  "שער עלות ממוצע",
  "שווי במטבע",
  'שווי כולל בש"ח',
  "תאריך הוראה",
  "תאריך נכונות",
  "אחוז מס",
  "סכום מס משוער בישראל",
];

const ALTSHULER_COLUMNS = [
  "תאריך",
  "סוג פעולה",
  "שם נייר",
  "מס' נייר / סימבול",
  "כמות",
  "שער ביצוע",
  "מטבע",
  "עמלת פעולה",
  "עמלות נלוות",
  'תמורה במט"ח',
  "תמורה בשקלים",
  "יתרה שקלית",
  "אומדן מס רווחי הון",
];

// Whitelist, not blacklist. Measured against both real exports: IBI carries 12
// action types of which 2 are trades, Altshuler 11 of which 6. A blacklist built
// on the types we happened to have seen would have admitted every type we had
// not — including `דיבדנד`, which Altshuler spells without the second yod.
const TRADE_PREFIXES = ["קנייה", "קניה", "מכירה"];

const isTradeAction = (value) => {
  const k = normHeaderText(value);
  return k !== "" && TRADE_PREFIXES.some((p) => k.startsWith(p));
};

// A foreign security reaches us as "NFLX US" in the name column while the symbol
// column sits empty; an Israeli one has a Hebrew name and a numeric id.
const SYMBOL_WITH_SUFFIX = /^([A-Za-z][A-Za-z0-9.\-]{0,5})\s+US$/;

const symbolFrom = (raw) => {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  if (looksLikeSymbol(s)) return s.toUpperCase();
  const m = s.match(SYMBOL_WITH_SUFFIX);
  return m ? m[1].toUpperCase() : null;
};

// A closed trade does not need a tradable symbol: P&L, R and every statistic are
// derived from the prices in the file itself. Only an open position needs a live
// quote. So when no symbol can be found the security name is imported as-is and
// the row is flagged, rather than the trade being thrown away.
export function resolveTicker(candidates, nameRaw) {
  for (const c of candidates) {
    const sym = symbolFrom(c);
    if (sym) return { ticker: sym, unresolved: false };
  }
  const name = String(nameRaw ?? "").trim();
  if (!name) return { ticker: "", unresolved: false };
  return { ticker: name, unresolved: true };
}

const PROFILES = [
  {
    id: "ibi",
    label: "IBI",
    columns: IBI_COLUMNS,
    minColumns: 8,
    actionColumn: "פעולה",
    nameColumn: "שם נייר",
    symbolColumn: null,
    // Sign of the quantity, verified consistent on 243/243 trade rows.
    sideFrom: (row, ctx) => {
      const q = num(row[ctx.qty]);
      if (q == null || q === 0) return null;
      return q > 0 ? "LONG" : "SHORT";
    },
    tickerFrom: (row, ctx) => resolveTicker([row[ctx.name]], row[ctx.name]),
  },
  {
    id: "altshuler",
    label: "אלטשולר שחם",
    columns: ALTSHULER_COLUMNS,
    minColumns: 9,
    actionColumn: "סוג פעולה",
    nameColumn: "שם נייר",
    symbolColumn: "מס' נייר / סימבול",
    // The quantity is positive even on sells, so its sign carries no direction.
    // The action text is the only source.
    sideFrom: (row, ctx) => (ctx.action < 0 ? null : normalizeSide(row[ctx.action])),
    tickerFrom: (row, ctx) =>
      resolveTicker(
        [ctx.symbol < 0 ? "" : row[ctx.symbol], row[ctx.name]],
        row[ctx.name]
      ),
  },
];

const indexOfHeader = (headers, name) => {
  if (!name) return -1;
  const want = normHeaderText(name);
  return headers.findIndex((h) => normHeaderText(h) === want);
};

const fingerprintHits = (matrix, columns) => {
  const want = new Set(columns.map(normHeaderText));
  let best = 0;
  for (const row of matrix || []) {
    if (!Array.isArray(row)) continue;
    const seen = new Set();
    for (const cell of row) {
      const k = normHeaderText(cell);
      if (k && want.has(k)) seen.add(k);
    }
    if (seen.size > best) best = seen.size;
  }
  return best;
};

// The first row carrying at least 4 recognisable headers across at least 3
// distinct fields. Measured margin: the real header rows score 7/5 (IBI) and
// 8/6 (Altshuler), every other row in both files tops out at 1/1.
export function findHeaderRow(matrix) {
  const rows = matrix || [];
  for (let i = 0; i < rows.length; i++) {
    if (!Array.isArray(rows[i])) continue;
    let cells = 0;
    const fields = new Set();
    for (const cell of rows[i]) {
      const m = matchHeader(cell);
      if (!m) continue;
      cells += 1;
      fields.add(m.field);
    }
    if (cells >= 4 && fields.size >= 3) return i;
  }
  return -1;
}

// A single column name is not a fingerprint: `שם נייר` and `פעולה` both appear
// in files that are not IBI exports. Requiring most of an 11- or 13-column array
// is what keeps a profile from swallowing a file it was never written for.
export function detectProfile(matrix) {
  let best = null;
  for (const p of PROFILES) {
    const hits = fingerprintHits(matrix, p.columns);
    if (hits < p.minColumns) continue;
    if (!best || hits > best.hits) best = { profile: p, hits };
  }
  return best ? best.profile : null;
}

// matrix -> { headers, rows, skipped, skippedByKind, sideResolver, tickerResolver }.
// `rows` holds trades only; `skipped` names the action type of every row dropped.
export function applyProfile(profile, matrix) {
  const headerIdx = findHeaderRow(matrix);
  if (headerIdx < 0) {
    return { profile, headerIdx: -1, headers: [], rows: [], skipped: [], skippedByKind: {} };
  }
  const { headers, rows } = matrixToTable(matrix, headerIdx);
  const ctx = {
    action: indexOfHeader(headers, profile.actionColumn),
    qty: indexOfHeader(headers, "כמות"),
    name: indexOfHeader(headers, profile.nameColumn),
    symbol: indexOfHeader(headers, profile.symbolColumn),
  };
  if (ctx.action < 0) {
    throw new Error(
      `broker profile "${profile.id}": action column "${profile.actionColumn}" not found in [${headers.join(", ")}]`
    );
  }

  const kept = [];
  const skipped = [];
  const skippedByKind = {};
  rows.forEach((row, i) => {
    const raw = String(row[ctx.action] ?? "").trim();
    if (isTradeAction(raw)) {
      kept.push(row);
      return;
    }
    const kind = raw || "(ריק)";
    skipped.push({ rowNumber: i + 1, kind });
    skippedByKind[kind] = (skippedByKind[kind] || 0) + 1;
  });

  return {
    profile,
    headerIdx,
    headers,
    rows: kept,
    skipped,
    skippedByKind,
    sideResolver: (row) => profile.sideFrom(row, ctx),
    tickerResolver: (row) => profile.tickerFrom(row, ctx),
  };
}

export { PROFILES, TRADE_PREFIXES, isTradeAction };
