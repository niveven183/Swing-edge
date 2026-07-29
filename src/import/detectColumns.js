// [B] Auto-detect which column maps to which SwingEdge field. Header synonyms
// first; ambiguous/blank headers fall back to content sniffing (a column that is
// all dates -> date; all L/S tokens -> side). Also infers the date format
// (DD/MM vs MM/DD) from the data, defaulting to DD/MM for the Israeli audience.

import { matchHeader, normalizeSide, MAPPABLE_FIELDS } from "./synonyms.js";

const DATE_TEXT_RE = /^\s*\d{1,4}[/\-.]\d{1,2}[/\-.]\d{1,4}\s*$/;
const ISO_RE = /^\s*\d{4}-\d{2}-\d{2}([ T].*)?$/;

// Excel serial date range: ~1954 (20000) .. ~2079 (65000). Keeps us from
// mistaking a share count or price for a date.
export const isExcelSerial = (v) => {
  const n = typeof v === "number" ? v : Number(String(v).trim());
  return Number.isFinite(n) && n >= 20000 && n <= 65000 && String(v).trim() !== "";
};

export const looksLikeDate = (v) => {
  if (v == null || v === "") return false;
  if (v instanceof Date) return true;
  const s = String(v).trim();
  if (DATE_TEXT_RE.test(s) || ISO_RE.test(s)) return true;
  if (isExcelSerial(v)) return true;
  return false;
};

export const looksLikeSide = (v) => normalizeSide(v) != null;

// A tradable ticker, deliberately US-shaped: AAPL, BRK.B, RDS-A. Used only to
// break a tie between two columns that both claim `ticker` — a broker file
// often carries both a display name and the symbol, and only the symbol can be
// priced or charted. Known limit: Israeli numeric security IDs (e.g. 1159250)
// do NOT match, and such a file falls back to the header score. That is
// intentional here; broker profiles (phase B) are where numeric IDs belong.
const SYMBOL_RE = /^[A-Z][A-Z0-9.\-]{0,5}$/;
export const looksLikeSymbol = (v) => SYMBOL_RE.test(String(v ?? "").trim());

const colValues = (rows, idx) =>
  rows.map((r) => r[idx]).filter((v) => v != null && String(v).trim() !== "");

const majority = (values, pred, threshold = 0.7) => {
  if (values.length === 0) return false;
  const hits = values.filter(pred).length;
  return hits / values.length >= threshold;
};

// Infer DD/MM vs MM/DD from a date column's slash/dash-formatted values.
// If any row has a first component > 12 -> DD/MM. If any has a second > 12 ->
// MM/DD. Otherwise ambiguous -> default DD/MM (Israeli convention).
export function inferDateFormat(values) {
  let sawDayFirst = false;
  let sawMonthFirst = false;
  for (const v of values) {
    const s = String(v).trim();
    if (ISO_RE.test(s)) continue; // unambiguous
    const m = s.match(/^(\d{1,4})[/\-.](\d{1,2})[/\-.](\d{1,4})$/);
    if (!m) continue;
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (m[1].length === 4) continue; // YYYY-first is ISO-like, unambiguous
    if (a > 12 && a <= 31) sawDayFirst = true;
    if (b > 12 && b <= 31) sawMonthFirst = true;
  }
  if (sawDayFirst && !sawMonthFirst) return { dateFormat: "DD/MM", ambiguous: false };
  if (sawMonthFirst && !sawDayFirst) return { dateFormat: "MM/DD", ambiguous: false };
  // none decisive (all components <= 12) -> ambiguous, default DD/MM
  return { dateFormat: "DD/MM", ambiguous: true };
}

// headers: string[]; rows: string[][] (sample, ideally the full set or first N).
// Returns { mapping: {field:index}, dateFormat, dateFormatAmbiguous, dateDetected }.
export function detectColumns(headers, rows) {
  const mapping = {};
  const usedCols = new Set();
  const assign = (field, idx) => {
    if (idx < 0 || usedCols.has(idx)) return;
    if (mapping[field] != null) return; // first match wins
    mapping[field] = idx;
    usedCols.add(idx);
  };

  const sample = rows.slice(0, 40);

  // Pass 1 — header synonyms. When several columns claim the same field the
  // winner is the strongest header match, not the leftmost column: brokers
  // order their columns differently, and Altshuler puts the company name
  // ("שם נייר") before the actual symbol ("מס' נייר / סימול").
  const candidates = new Map();
  headers.forEach((h, idx) => {
    const m = matchHeader(h);
    if (!m || !MAPPABLE_FIELDS.includes(m.field)) return;
    if (!candidates.has(m.field)) candidates.set(m.field, []);
    candidates.get(m.field).push({ idx, score: m.score });
  });
  for (const [field, list] of candidates) {
    // For `ticker`, content outranks the header: an exactly-matching "שם נייר"
    // would otherwise beat a fallback-matched symbol column and leave us with
    // untradable display text. Same principle pass 2 already uses for date/side.
    let pool = list;
    if (field === "ticker" && list.length > 1) {
      const symbolic = list.filter((c) => majority(colValues(sample, c.idx), looksLikeSymbol));
      if (symbolic.length > 0) pool = symbolic;
    }
    assign(field, pool.reduce((a, b) => (b.score > a.score ? b : a)).idx);
  }

  // Pass 2 — content sniffing for still-unmapped critical columns.
  headers.forEach((_, idx) => {
    if (usedCols.has(idx)) return;
    const vals = colValues(sample, idx);
    if (vals.length === 0) return;
    if (mapping.date == null && majority(vals, looksLikeDate)) { assign("date", idx); return; }
    if (mapping.side == null && majority(vals, looksLikeSide)) { assign("side", idx); return; }
  });

  const dateDetected = mapping.date != null;
  let dateFormat = "DD/MM";
  let dateFormatAmbiguous = true;
  if (dateDetected) {
    const df = inferDateFormat(colValues(rows, mapping.date));
    dateFormat = df.dateFormat;
    dateFormatAmbiguous = df.ambiguous;
  }

  return { mapping, dateFormat, dateFormatAmbiguous, dateDetected };
}
