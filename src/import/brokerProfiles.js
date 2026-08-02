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

// The second gate — on the security, because the action column cannot carry the
// distinction. IBI books a tax debit as a *buy* of a pseudo-security named after
// the tax, at a par rate of 100: the verb is a genuine קנייה and passes the
// whitelist correctly. Nine such rows reached one live account as trades. The
// currency arithmetic does not catch them either — a tax row of quantity 666.94
// at rate 100 yields a unit ratio of exactly 0.01, identical to a legitimate
// agorot-quoted TASE security. The two gates are independent: one on the unit,
// one on the identity of the security.
const NON_SECURITY = [
  // `מס ששולם` · `זיכוי מס` · `מס תקבולים 26`. Matched on `מס` as a standalone
  // token, never as a substring, so `מסילות`/`מספנות` are untouched.
  { kind: "תנועת מס", re: /(^|\s)מס(\s|$)/ },
  // `B USD/ILS 3.170` — a currency conversion, booked the same way.
  { kind: 'המרת מט"ח', re: /^[BS]\s+[A-Za-z]{3}\s*\/\s*[A-Za-z]{3}\b/ },
];

// Returns the kind of non-security movement, or null for a real security. The
// name, never the action.
export const nonSecurityKind = (raw) => {
  const s = normHeaderText(raw);
  if (!s) return null;
  const hit = NON_SECURITY.find((p) => p.re.test(s));
  return hit ? hit.kind : null;
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

// ── currency and unit ───────────────────────────────────────────────────────
// A TASE security is quoted in agorot, 1/100 of a shekel, and nothing in the
// price cell says so. The two facts a row needs — which currency, and whether
// the quote is in the major unit or in agorot — are derived from the row's own
// arithmetic, so they verify themselves line by line and depend on no list that
// has to be maintained. A row whose numbers do not resolve is rejected and
// named; none is ever guessed.

const closeTo = (v, target, tol = 0.02) =>
  Number.isFinite(v) && Math.abs(v - target) <= Math.abs(target) * tol;

// ₪ per unit of a foreign currency. A plausibility band used to *confirm* that
// a ratio is an exchange rate — never to produce one, and no rate is read from
// anywhere: the conversion this file performs is agorot→shekels, a fixed 100
// inside one currency.
const FX_MIN = 2;
const FX_MAX = 6;

const CURRENCY_SIGNS = {
  $: "USD", USD: "USD", "US$": "USD",
  "₪": "ILS", ILS: "ILS", 'ש"ח': "ILS", NIS: "ILS",
};

// |value| / (|qty| × |rate|) — 1 means the rate is already in the major unit,
// 0.01 means it is in agorot. Verified against the live file that caused this:
// דיסקונט 432 × 34.70 = 14,990.4 against 432 × 3470 = 1,499,040 → 0.01, and
// NFLX 33 × 77.79 = 2,567.07 against itself → 1.00.
const unitDivisor = (value, qty, rate) => {
  if (value == null || qty == null || rate == null) return null;
  const gross = Math.abs(qty) * Math.abs(rate);
  if (!Number.isFinite(gross) || gross === 0) return null;
  const r = Math.abs(value) / gross;
  if (closeTo(r, 1)) return 1;
  if (closeTo(r, 0.01)) return 100;
  return null;
};

const PROFILES = [
  {
    id: "ibi",
    label: "IBI",
    columns: IBI_COLUMNS,
    minColumns: 8,
    actionColumn: "פעולה",
    nameColumn: "שם נייר",
    symbolColumn: null,
    rateColumn: "שער עלות ממוצע",
    valueColumn: "שווי במטבע",
    baseValueColumn: 'שווי כולל בש"ח',
    currencyColumn: null,
    // IBI has no currency column — but it prints the same trade twice, once in
    // the security's own currency and once in shekels, and the ratio between
    // them is the currency.
    unitFrom: (row, ctx) => {
      const value = num(row[ctx.value]);
      const base = num(row[ctx.baseValue]);
      if (value == null || base == null || value === 0) return { error: "bad_currency" };
      const r = Math.abs(base) / Math.abs(value);
      const currency = closeTo(r, 1) ? "ILS" : r >= FX_MIN && r <= FX_MAX ? "USD" : null;
      if (!currency) return { error: "bad_currency" };
      const divisor = unitDivisor(value, num(row[ctx.qty]), num(row[ctx.rate]));
      if (divisor == null) return { error: "bad_unit" };
      return { currency, divisor };
    },
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
    rateColumn: "שער ביצוע",
    valueColumn: 'תמורה במט"ח',
    baseValueColumn: "תמורה בשקלים",
    currencyColumn: "מטבע",
    // Altshuler states the currency outright. The unit still has to be derived:
    // a ₪ row can be quoted in agorot exactly as IBI's is.
    unitFrom: (row, ctx) => {
      const currency = CURRENCY_SIGNS[normHeaderText(row[ctx.currency])];
      if (!currency) return { error: "bad_currency" };
      const divisor = unitDivisor(num(row[ctx.value]), num(row[ctx.qty]), num(row[ctx.rate]));
      if (divisor == null) return { error: "bad_unit" };
      return { currency, divisor };
    },
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
    rate: indexOfHeader(headers, profile.rateColumn),
    value: indexOfHeader(headers, profile.valueColumn),
    baseValue: indexOfHeader(headers, profile.baseValueColumn),
    currency: indexOfHeader(headers, profile.currencyColumn),
  };
  const missing = ["action", "qty", "rate", "value"]
    .filter((k) => ctx[k] < 0)
    .map((k) => profile[`${k}Column`] || "כמות");
  if (profile.currencyColumn ? ctx.currency < 0 : ctx.baseValue < 0) {
    missing.push(profile.currencyColumn || profile.baseValueColumn);
  }
  // Failing loudly on the whole file beats deriving a currency from columns that
  // are not there: the alternative is prices silently off by a factor of 100,
  // which is the bug this profile exists to close.
  if (missing.length) {
    throw new Error(
      `broker profile "${profile.id}": missing column(s) [${missing.join(", ")}] in [${headers.join(", ")}]`
    );
  }

  const kept = [];
  const skipped = [];
  const skippedByKind = {};
  const drop = (i, kind) => {
    skipped.push({ rowNumber: i + 1, kind });
    skippedByKind[kind] = (skippedByKind[kind] || 0) + 1;
  };
  rows.forEach((row, i) => {
    const raw = String(row[ctx.action] ?? "").trim();
    if (!isTradeAction(raw)) return drop(i, raw || "(ריק)");
    const pseudo = nonSecurityKind(row[ctx.name]);
    if (pseudo) return drop(i, pseudo);
    kept.push(row);
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
    unitResolver: (row) => profile.unitFrom(row, ctx),
  };
}

export { PROFILES, TRADE_PREFIXES, isTradeAction, unitDivisor };
