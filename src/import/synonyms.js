// Bilingual (he+en) column-name dictionary for journal import.
// Matching is case-insensitive, trimmed, and diacritic/punctuation-loose (see
// normKey). `fees` is detected only so it is not mis-mapped onto another field —
// SwingEdge has no fees column, so it is dropped after detection.

export const FIELD_SYNONYMS = {
  ticker:   ["ticker", "symbol", "instrument", "asset", "stock", "סימול", "נייר", "מניה", "שם נייר", "שם המניה"],
  side:     ["side", "direction", "position", "type", "action", "l/s", "long", "short", "buy", "sell", "כיוון", "סוג", "פעולה", "קנייה", "קניה", "מכירה"],
  entry:    ["entry", "entry price", "buy price", "open price", "price in", "avg price", "average price", "cost", "cost basis", "מחיר כניסה", "כניסה", "מחיר קנייה", "מחיר קניה"],
  exit:     ["exit", "exit price", "sell price", "close price", "price out", "מחיר יציאה", "יציאה", "מחיר מכירה"],
  shares:   ["qty", "quantity", "shares", "size", "position size", "volume", "units", "amount", "no. of shares", "כמות", "יחידות", "מניות"],
  date:     ["date", "entry date", "trade date", "open date", "opened", "תאריך", "תאריך כניסה", "תאריך פתיחה", "יום"],
  exitDate: ["exit date", "close date", "closed", "closed date", "תאריך יציאה", "תאריך סגירה"],
  stop:     ["stop", "stop loss", "stoploss", "sl", "stop price", "סטופ", "סטופ לוס", "מחיר סטופ"],
  target:   ["target", "take profit", "takeprofit", "tp", "target price", "יעד", "מטרה", "מחיר יעד"],
  fees:     ["fees", "fee", "commission", "commissions", "comm", "עמלה", "עמלות"],
};

// Fields the user can map a column to (fees included so it can be explicitly
// parked/ignored; it never becomes a trade field).
export const MAPPABLE_FIELDS = ["ticker", "side", "entry", "exit", "shares", "date", "exitDate", "stop", "target", "fees"];

// Required for a valid imported row (decision #2: qty missing → reject).
export const REQUIRED_FIELDS = ["ticker", "entry", "shares"];

// Normalize a header or cell token for loose matching: lowercase, collapse
// whitespace, strip surrounding punctuation and a leading BOM.
export const normKey = (raw) =>
  String(raw ?? "")
    .replace(/^﻿/, "")
    .toLowerCase()
    .replace(/[_./\\|:#()[\]{}"'`]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Reverse lookup: normalized synonym -> canonical field.
const SYNONYM_TO_FIELD = (() => {
  const map = new Map();
  for (const [field, list] of Object.entries(FIELD_SYNONYMS)) {
    for (const syn of list) map.set(normKey(syn), field);
  }
  return map;
})();

// Exact-ish header → field (after normalization). Returns null when unknown.
export const fieldForHeader = (header) => {
  const k = normKey(header);
  if (!k) return null;
  if (SYNONYM_TO_FIELD.has(k)) return SYNONYM_TO_FIELD.get(k);
  // Token-subset fallback: e.g. "trade entry price ($)" → "entry price" tokens.
  for (const [syn, field] of SYNONYM_TO_FIELD) {
    if (k === syn) return field;
    const synTokens = syn.split(" ");
    if (synTokens.length > 1 && synTokens.every((tok) => k.includes(tok))) return field;
  }
  return null;
};

// Side value normalization: text → "LONG" | "SHORT" | null.
export const normalizeSide = (raw) => {
  const k = normKey(raw);
  if (!k) return null;
  if (/^(long|buy|b|l|קנייה|קניה)$/.test(k) || k.includes("long") || k.includes("buy")) return "LONG";
  if (/^(short|sell|s)$/.test(k) || k.includes("short") || k.includes("sell") || k.includes("מכיר")) return "SHORT";
  if (k.includes("קני")) return "LONG";
  return null;
};
