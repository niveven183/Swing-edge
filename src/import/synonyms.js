// Bilingual (he+en) column-name dictionary for journal import.
// Matching is case-insensitive, trimmed, and diacritic/punctuation-loose (see
// normKey). `fees` is detected only so it is not mis-mapped onto another field —
// SwingEdge has no fees column, so it is dropped after detection.

export const FIELD_SYNONYMS = {
  ticker:   ["ticker", "symbol", "instrument", "asset", "stock", "סימול", "נייר", "מניה", "שם נייר", "שם המניה", "שם הנייר", "מספר נייר", "מס נייר", "מס' נייר"],
  side:     ["side", "direction", "position", "type", "action", "l/s", "long", "short", "buy", "sell", "כיוון", "סוג", "פעולה", "קנייה", "קניה", "מכירה", "סוג פעולה", "סוג הפעולה", "סוג עסקה"],
  entry:    ["entry", "entry price", "buy price", "open price", "price in", "avg price", "average price", "cost", "cost basis", "מחיר כניסה", "כניסה", "מחיר קנייה", "מחיר קניה", "שער", "שער ביצוע", "שער עלות", "שער עלות ממוצע", "שער קנייה", "שער קניה", "מחיר ביצוע", "מחיר"],
  exit:     ["exit", "exit price", "sell price", "close price", "price out", "מחיר יציאה", "יציאה", "מחיר מכירה", "שער מכירה", "מחיר סגירה"],
  shares:   ["qty", "quantity", "shares", "size", "position size", "volume", "units", "amount", "no. of shares", "כמות", "יחידות", "מניות", "כמות ניירות", "כמות יחידות"],
  date:     ["date", "entry date", "trade date", "open date", "opened", "תאריך", "תאריך כניסה", "תאריך פתיחה", "יום", "תאריך ביצוע", "תאריך הוראה", "תאריך עסקה"],
  exitDate: ["exit date", "close date", "closed", "closed date", "תאריך יציאה", "תאריך סגירה", "תאריך מכירה"],
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

// Token-subset fallback candidates. Tokens are matched as substrings so Hebrew
// prefixes still hit ("סוג הפעולה" contains "פעולה"), which in turn makes short
// tokens dangerous: "l/s" normalizes to "l s", and a bare `includes("l")` +
// `includes("s")` claims "stop loss price" and "total shares sold" for `side`.
// Hence the length floors — a 2-char token is only trustworthy when it has to
// co-occur with others, and a lone token needs 3.
const FALLBACK_CANDIDATES = (() => {
  const out = [];
  for (const [syn, field] of SYNONYM_TO_FIELD) {
    const tokens = syn.split(" ");
    const floor = tokens.length > 1 ? 2 : 3;
    if (tokens.some((tok) => tok.length < floor)) continue;
    out.push({ tokens, field, score: syn.replace(/ /g, "").length });
  }
  return out;
})();

// Exact header matches must outrank every token-subset match, whatever its length.
const EXACT_BONUS = 1000;

// header → { field, score } | null. The score exists so callers can rank
// competing columns. Within the fallback the longest synonym wins, which is
// what makes specific beat generic regardless of field declaration order:
// "מחיר יעד" (7) beats "מחיר" (4), "שער עלות ממוצע" (12) beats "שער" (3).
export const matchHeader = (header) => {
  const k = normKey(header);
  if (!k) return null;
  if (SYNONYM_TO_FIELD.has(k)) return { field: SYNONYM_TO_FIELD.get(k), score: EXACT_BONUS + k.length };
  let best = null;
  for (const cand of FALLBACK_CANDIDATES) {
    if (!cand.tokens.every((tok) => k.includes(tok))) continue;
    if (!best || cand.score > best.score || (cand.score === best.score && cand.tokens.length > best.tokens.length)) {
      best = { field: cand.field, score: cand.score, tokens: cand.tokens };
    }
  }
  return best ? { field: best.field, score: best.score } : null;
};

// Exact-ish header → field (after normalization). Returns null when unknown.
export const fieldForHeader = (header) => matchHeader(header)?.field ?? null;

// Side value normalization: text → "LONG" | "SHORT" | null.
export const normalizeSide = (raw) => {
  const k = normKey(raw);
  if (!k) return null;
  if (/^(long|buy|b|l|קנייה|קניה)$/.test(k) || k.includes("long") || k.includes("buy")) return "LONG";
  if (/^(short|sell|s)$/.test(k) || k.includes("short") || k.includes("sell") || k.includes("מכיר")) return "SHORT";
  if (k.includes("קני")) return "LONG";
  return null;
};
