// [D] Normalize one raw row (array) + a column mapping into a full trade object
// that is indistinguishable from a manually-saved trade, or a rejection with a
// reason code. Reuses validateTradeInputs / inferSide from utils.js — single
// source of truth for geometry, no duplicated validation.

import { validateTradeInputs, inferSide } from "../utils.js";
import { normalizeSide } from "./synonyms.js";
import { isExcelSerial } from "./detectColumns.js";

const two = (n) => String(n).padStart(2, "0");
const pad4Year = (y) => (y < 100 ? 2000 + y : y);

// Excel serial (days since 1899-12-30) -> 'YYYY-MM-DD'. Computed in UTC to avoid
// timezone drift.
function serialToYMD(serial) {
  const n = typeof serial === "number" ? serial : Number(String(serial).trim());
  const ms = Math.round((n - 25569) * 86400000); // 25569 = days from 1970-01-01 to 1899-12-30 offset
  const d = new Date(ms);
  if (isNaN(d.getTime())) return null;
  return `${d.getUTCFullYear()}-${two(d.getUTCMonth() + 1)}-${two(d.getUTCDate())}`;
}

// Parse a date-ish value to a local 'YYYY-MM-DD' or null. dateFormat picks
// day/month order for slash/dash values ('DD/MM' | 'MM/DD').
export function parseDate(value, dateFormat = "DD/MM") {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    return `${value.getFullYear()}-${two(value.getMonth() + 1)}-${two(value.getDate())}`;
  }
  const s = String(value).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T].*)?$/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  if (isExcelSerial(value)) return serialToYMD(value);
  const m = s.match(/^(\d{1,4})[/\-.](\d{1,2})[/\-.](\d{1,4})$/);
  if (m) {
    let y, mo, d;
    if (m[1].length === 4) {
      y = Number(m[1]); mo = Number(m[2]); d = Number(m[3]); // YYYY-first
    } else {
      const a = Number(m[1]); const b = Number(m[2]); y = pad4Year(Number(m[3]));
      if (dateFormat === "MM/DD") { mo = a; d = b; } else { d = a; mo = b; }
    }
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return `${y}-${two(mo)}-${two(d)}`;
  }
  return null;
}

// Coerce a numeric cell: strip currency symbols, thousands separators, %, spaces.
// Parenthesised values are treated as negative. Returns null when not finite.
export function num(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  let s = String(value).trim();
  if (!s) return null;
  const neg = /^\(.*\)$/.test(s);
  s = s.replace(/[()]/g, "").replace(/[$₪€£%,\s]/g, "").replace(/[^\d.\-]/g, "");
  if (s === "" || s === "-" || s === ".") return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return neg ? -Math.abs(n) : n;
}

const REASONS = {
  no_ticker: { he: "חסר סימול", en: "Missing ticker" },
  no_entry:  { he: "מחיר כניסה חסר/לא תקין", en: "Missing/invalid entry price" },
  no_qty:    { he: "חסרה כמות", en: "Missing quantity" },
  bad_stop:  { he: "סטופ בצד הלא נכון של הכניסה", en: "Stop on the wrong side of entry" },
};

// mapping: { field: columnIndex }. opts: { dateFormat, capital, todayISO }.
// Returns { ok:true, trade } or { ok:false, code, detail? }.
export function normalizeRow(row, mapping, opts = {}) {
  const dateFormat = opts.dateFormat || "DD/MM";
  const capital = opts.capital ?? 0;
  const today = opts.todayISO || new Date().toISOString().slice(0, 10);
  const cell = (field) => {
    const idx = mapping[field];
    return idx == null || idx < 0 ? "" : row[idx];
  };

  const ticker = String(cell("ticker") ?? "").trim().toUpperCase();
  const entry = num(cell("entry"));
  const shares = num(cell("shares"));
  const stop = num(cell("stop"));
  const target = num(cell("target"));
  const exit = num(cell("exit"));

  if (!ticker) return { ok: false, code: "no_ticker", detail: REASONS.no_ticker };
  if (entry == null || entry <= 0) return { ok: false, code: "no_entry", detail: REASONS.no_entry };
  if (shares == null || shares <= 0) return { ok: false, code: "no_qty", detail: REASONS.no_qty };

  let side = normalizeSide(cell("side"));
  if (!side) side = inferSide(entry, stop, target);

  // Geometry check only when a stop is present (decision #1: no stop is allowed).
  if (stop != null && stop > 0) {
    const v = validateTradeInputs(entry, stop, target, side);
    if (!v.valid) return { ok: false, code: "bad_stop", detail: v.reason || REASONS.bad_stop };
  }

  const date = parseDate(cell("date"), dateFormat) || today;
  const exitDateParsed = parseDate(cell("exitDate"), dateFormat);
  const status = exit != null ? "CLOSED" : "OPEN";
  const closedAt =
    status === "CLOSED"
      ? new Date(`${exitDateParsed || date}T20:00:00`).toISOString()
      : null;

  const trade = {
    id: (typeof crypto !== "undefined" && crypto.randomUUID)
      ? crypto.randomUUID()
      : `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ticker,
    date,
    createdAt: new Date(`${date}T14:30:00`).toISOString(),
    side,
    entry,
    stop: stop != null && stop > 0 ? stop : null,
    target: target != null && target > 0 ? target : null,
    exit,
    shares,
    status,
    setup: "",
    notes: "",
    marketCondition: "",
    emotionAtEntry: "",
    entryQuality: null,
    tradeImage: null,
    exitReason: null,
    followedPlan: null,
    lessonLearned: null,
    maxFavorable: null,
    maxAdverse: null,
    closedAt,
    _capitalAtEntry: capital,
    _prediction: null,
    isDemo: false,
  };
  return { ok: true, trade };
}

export { REASONS };
