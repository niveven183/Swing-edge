// [B] Auto-detect which column maps to which SwingEdge field. Header synonyms
// first; ambiguous/blank headers fall back to content sniffing (a column that is
// all dates -> date; all L/S tokens -> side). Also infers the date format
// (DD/MM vs MM/DD) from the data, defaulting to DD/MM for the Israeli audience.

import { fieldForHeader, normalizeSide, MAPPABLE_FIELDS } from "./synonyms.js";

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

  // Pass 1 — header synonyms.
  headers.forEach((h, idx) => {
    const field = fieldForHeader(h);
    if (field && MAPPABLE_FIELDS.includes(field)) assign(field, idx);
  });

  // Pass 2 — content sniffing for still-unmapped critical columns.
  const sample = rows.slice(0, 40);
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
