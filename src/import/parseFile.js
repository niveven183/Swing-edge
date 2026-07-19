// [A] File parsing. Turns a CSV/XLSX/XLS file into { headers, rows } where rows
// are arrays aligned by column index (we drive mapping by index, not by header
// name, so duplicate/blank headers are harmless). Pure helpers (parseCSV /
// parseXLSX) are exported for the Node test harness; parseFile is the browser
// entry point that reads a File then dispatches by extension.

import Papa from "papaparse";
import * as XLSX from "xlsx";

const stripBOM = (s) => (typeof s === "string" ? s.replace(/^﻿/, "") : s);

// Trim a matrix to a rectangular { headers, rows }: first non-empty row is the
// header; blank trailing rows are dropped.
function matrixToTable(matrix) {
  const rowsRaw = (matrix || []).filter(
    (r) => Array.isArray(r) && r.some((c) => String(c ?? "").trim() !== "")
  );
  if (rowsRaw.length === 0) return { headers: [], rows: [] };
  const headers = rowsRaw[0].map((h) => String(h ?? "").trim());
  const width = headers.length;
  const rows = rowsRaw.slice(1).map((r) => {
    const out = new Array(width);
    for (let i = 0; i < width; i++) out[i] = r[i] ?? "";
    return out;
  });
  return { headers, rows };
}

// Parse CSV text. papaparse auto-detects the delimiter (comma, ';', tab).
export function parseCSV(text) {
  const clean = stripBOM(text);
  const res = Papa.parse(clean, { skipEmptyLines: "greedy" });
  if (res.errors && res.errors.length) {
    const fatal = res.errors.find((e) => e.type === "Delimiter" || e.type === "Quotes");
    if (fatal && (!res.data || res.data.length === 0)) {
      throw new Error(fatal.message || "CSV parse error");
    }
  }
  return matrixToTable(res.data);
}

// Parse XLSX/XLS from an ArrayBuffer/Uint8Array/Buffer. Returns the same
// { headers, rows } plus sheetNames. `raw:true` keeps Excel serial dates as
// numbers so normalizeRow can convert them deterministically.
export function parseXLSX(data, sheetName) {
  const wb = XLSX.read(data, { type: "array" });
  const sheetNames = wb.SheetNames || [];
  if (sheetNames.length === 0) return { headers: [], rows: [], sheetNames };
  const name = sheetName && sheetNames.includes(sheetName) ? sheetName : sheetNames[0];
  const ws = wb.Sheets[name];
  const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });
  return { ...matrixToTable(matrix), sheetNames, sheet: name };
}

const readAsText = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error || new Error("read error"));
    r.readAsText(file, "UTF-8");
  });

const readAsArrayBuffer = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error || new Error("read error"));
    r.readAsArrayBuffer(file);
  });

// Browser entry: File -> { headers, rows, sheetNames?, kind }. For multi-sheet
// XLSX, pass sheetName to re-parse a chosen sheet.
export async function parseFile(file, sheetName) {
  const ext = (file?.name || "").toLowerCase().split(".").pop();
  if (ext === "xlsx" || ext === "xls" || ext === "xlsm") {
    const buf = await readAsArrayBuffer(file);
    return { kind: "xlsx", ...parseXLSX(new Uint8Array(buf), sheetName) };
  }
  // default: CSV / TSV / txt
  const text = await readAsText(file);
  return { kind: "csv", ...parseCSV(text) };
}
