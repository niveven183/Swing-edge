// test:import — runs the import pipeline (parse -> detect -> build) against the
// 6 fixtures and asserts exact counts. Regenerates fixtures first so the run is
// deterministic (esp. the XLSX serial-date fixture).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import "./import-fixtures/generate.mjs";

import { parseCSV, parseXLSX } from "../src/import/parseFile.js";
import { detectColumns } from "../src/import/detectColumns.js";
import { buildImport } from "../src/import/buildImport.js";
import { normalizeRow } from "../src/import/normalizeRow.js";
import { detectProfile, applyProfile } from "../src/import/brokerProfiles.js";
import { normalizeSide } from "../src/import/synonyms.js";

const FIX = join(dirname(fileURLToPath(import.meta.url)), "import-fixtures");
let failures = 0;
const check = (name, actual, expected) => {
  const ok = actual === expected;
  if (!ok) { failures++; console.error(`  ✗ ${name}: expected ${expected}, got ${actual}`); }
  else console.log(`  ✓ ${name} = ${actual}`);
};

const runCSV = (file, opts = {}) => {
  const text = readFileSync(join(FIX, file), "utf8");
  const { headers, rows } = parseCSV(text);
  const det = detectColumns(headers, rows);
  return { det, res: buildImport(rows, det.mapping, { dateFormat: det.dateFormat, capital: 2500, ...opts }) };
};

// Column mappings the 6 original fixtures produced before phase-A touched the
// dictionary. These are a frozen contract, not an expectation to be refreshed:
// if one moves, the detection change altered behaviour it had no business
// altering. Fix the code, never this table.
const BASELINE = {
  "en-standard.csv":  '{"ticker":0,"side":1,"entry":2,"exit":3,"shares":4,"date":5,"stop":6,"target":7}',
  "he-semicolon.csv": '{"ticker":0,"side":1,"entry":2,"exit":3,"shares":4,"date":5,"stop":6}',
  "xlsx-serial.xlsx": '{"ticker":0,"side":1,"entry":2,"exit":3,"shares":4,"date":5,"stop":6}',
  "bad-rows.csv":     '{"ticker":0,"side":1,"entry":2,"exit":3,"shares":4,"date":5,"stop":6}',
  "duplicates.csv":   '{"ticker":0,"side":1,"entry":2,"exit":3,"shares":4,"date":5,"stop":6}',
  "perf-200.csv":     '{"ticker":0,"side":1,"entry":2,"exit":3,"shares":4,"date":5,"stop":6}',
};

const detectOnly = (file) => {
  if (file.endsWith(".xlsx")) {
    const { headers, rows } = parseXLSX(new Uint8Array(readFileSync(join(FIX, file))));
    return detectColumns(headers, rows);
  }
  const { headers, rows } = parseCSV(readFileSync(join(FIX, file), "utf8"));
  return detectColumns(headers, rows);
};

const parseAny = (file) =>
  file.endsWith(".xlsx")
    ? parseXLSX(new Uint8Array(readFileSync(join(FIX, file))))
    : parseCSV(readFileSync(join(FIX, file), "utf8"));

// Full broker route: raw matrix -> profile -> mapping -> trades.
const runProfile = (file) => {
  const parsed = parseAny(file);
  const profile = detectProfile(parsed.matrix);
  if (!profile) return { parsed, profile: null };
  const applied = applyProfile(profile, parsed.matrix);
  const det = detectColumns(applied.headers, applied.rows);
  const res = buildImport(applied.rows, det.mapping, {
    dateFormat: det.dateFormat,
    capital: 2500,
    sideResolver: applied.sideResolver,
    tickerResolver: applied.tickerResolver,
    skipped: applied.skipped,
    skippedByKind: applied.skippedByKind,
  });
  return { parsed, profile, applied, det, res };
};

console.log("test:import — pipeline over 13 fixtures\n");

// 0) Baseline regression — blocking gate.
{
  console.log("0) baseline mapping unchanged");
  for (const [file, expected] of Object.entries(BASELINE)) {
    check(`mapping ${file}`, JSON.stringify(detectOnly(file).mapping), expected);
  }
}


// 1) English standard — 5 valid.
{
  console.log("1) en-standard.csv");
  const { det, res } = runCSV("en-standard.csv");
  check("date detected", det.dateDetected, true);
  check("valid", res.counts.valid, 5);
  check("rejected", res.counts.rejected, 0);
  check("open trade status", res.valid.find(t => t.ticker === "MSFT")?.status, "OPEN");
  check("closed trade status", res.valid.find(t => t.ticker === "AAPL")?.status, "CLOSED");
}

// 2) Hebrew ';' + BOM — 3 valid, side & date normalized.
{
  console.log("2) he-semicolon.csv");
  const { det, res } = runCSV("he-semicolon.csv");
  check("valid", res.counts.valid, 3);
  check("rejected", res.counts.rejected, 0);
  check("side normalized LONG", res.valid.find(t => t.ticker === "AAPL")?.side, "LONG");
  check("side normalized SHORT", res.valid.find(t => t.ticker === "TSLA")?.side, "SHORT");
  check("date DD/MM parsed", res.valid.find(t => t.ticker === "AAPL")?.date, "2026-01-05");
}

// 3) XLSX serial dates — 3 valid, dates correct.
{
  console.log("3) xlsx-serial.xlsx");
  const buf = readFileSync(join(FIX, "xlsx-serial.xlsx"));
  const { headers, rows } = parseXLSX(new Uint8Array(buf));
  const det = detectColumns(headers, rows);
  const res = buildImport(rows, det.mapping, { dateFormat: det.dateFormat, capital: 2500 });
  check("valid", res.counts.valid, 3);
  check("serial date parsed", res.valid.find(t => t.ticker === "AAPL")?.date, "2026-01-05");
  check("serial date parsed 2", res.valid.find(t => t.ticker === "NVDA")?.date, "2026-01-07");
}

// 4) Mixed — 2 valid, 3 rejected with expected codes.
{
  console.log("4) bad-rows.csv");
  const { res } = runCSV("bad-rows.csv");
  check("valid", res.counts.valid, 2);
  check("rejected", res.counts.rejected, 3);
  const codes = res.rejected.map(r => r.code).sort().join(",");
  check("reject codes", codes, "bad_stop,no_entry,no_qty");
}

// 5) Duplicates — 1 valid, 2 duplicates (vs seeded existing + in-file repeat).
{
  console.log("5) duplicates.csv");
  const existingTrades = [{ ticker: "AAPL", date: "2026-03-01", entry: 100 }];
  const { res } = runCSV("duplicates.csv", { existingTrades });
  check("valid", res.counts.valid, 1);
  check("duplicates", res.counts.duplicates, 2);
  check("valid is MSFT", res.valid[0]?.ticker, "MSFT");
}

// 6) Performance — 200 valid.
{
  console.log("6) perf-200.csv");
  const t0 = Date.now();
  const { res } = runCSV("perf-200.csv");
  check("valid", res.counts.valid, 200);
  check("rejected", res.counts.rejected, 0);
  console.log(`  ⏱  ${Date.now() - t0}ms`);
}

// 7) IBI-style — every field mapped; symbol column beats the numeric ID column.
{
  console.log("7) ibi-style.csv");
  const { det, res } = runCSV("ibi-style.csv");
  const m = det.mapping;
  check("ticker -> שם נייר", m.ticker, 0);
  check("side   -> פעולה", m.side, 2);
  check("shares -> כמות", m.shares, 3);
  check("entry  -> שער עלות ממוצע", m.entry, 4);
  check("date   -> תאריך הוראה", m.date, 5);
  check("numeric ID column unmapped", Object.values(m).includes(1), false);
  check("valid", res.counts.valid, 3);
}

// 8) Altshuler-style — ticker resolves to the symbol, not the company name.
{
  console.log("8) altshuler-style.csv");
  const { det, res } = runCSV("altshuler-style.csv");
  const m = det.mapping;
  check("date   -> תאריך", m.date, 0);
  check("side   -> סוג פעולה", m.side, 1);
  check("ticker -> מס' נייר / סימול", m.ticker, 3);
  check("shares -> כמות", m.shares, 4);
  check("entry  -> שער ביצוע", m.entry, 5);
  check("company-name column unmapped", Object.values(m).includes(2), false);
  check("ticker value is the symbol", res.valid.find(t => t.ticker === "PLTR")?.ticker, "PLTR");
}

// 9) Specific beats generic + negative case.
{
  console.log("9) precedence.csv");
  const m = detectOnly("precedence.csv").mapping;
  check("entry  -> שער ביצוע (not stolen by שער)", m.entry, 2);
  check("target -> מחיר יעד (not stolen by מחיר)", m.target, 3);
  check("stop   -> מחיר סטופ (not stolen by מחיר)", m.stop, 4);
  check("unknown column stays unmapped", Object.values(m).includes(5), false);
}

// 10) The "l/s" trap — neither header may be read as `side`.
{
  console.log("10) lstrap.csv");
  const m = detectOnly("lstrap.csv").mapping;
  check("shares -> total shares sold", m.shares, 1);
  check("stop   -> stop loss price", m.stop, 2);
  check("side not claimed", m.side, undefined);
}

// 11) IBI profile — header buried under a preamble, whitelist, side from the
//     sign of the quantity, ticker falling back to the security name.
{
  console.log("11) ibi-full.xlsx — broker profile");
  const { profile, applied, det, res } = runProfile("ibi-full.xlsx");
  check("profile detected", profile?.id, "ibi");
  check("header row index", applied.headerIdx, 10);
  check("width 11 preserved", applied.headers.length, 11);
  check("trade rows kept", applied.rows.length, 4);
  check("non-trade rows skipped", applied.skipped.length, 5);
  check("skipped kinds named", Object.keys(applied.skippedByKind).sort().join(","),
    "דיבידנד - תשלום,המרת מט״ח,חיוב ריבית חובה,משיכת כספים,מתנה");
  check("valid", res.counts.valid, 4);
  check("rejected", res.counts.rejected, 0);
  const sell = res.valid.find((t) => t.date === "2026-01-09");
  check("negative qty -> SHORT", sell?.side, "SHORT");
  check("negative qty -> positive shares", sell?.shares, 10);
  check("symbol row resolved", res.valid.find((t) => t.ticker === "AAPL")?.ticker, "AAPL");
  check("name rows flagged", res.counts.unresolvedSymbol, 3);
  check("AAPL not flagged", res.unresolvedSymbols.some((u) => u.ticker === "AAPL"), false);
  check("ticker beats mapped column", det.mapping.ticker, 1); // 'מספר נייר' — resolver overrides
}

// 12) Altshuler profile — side from the action text on all 6 trade spellings.
{
  console.log("12) altshuler-full.csv — broker profile");
  const { profile, applied, res } = runProfile("altshuler-full.csv");
  check("profile detected", profile?.id, "altshuler");
  check("header row index", applied.headerIdx, 0);
  check("width 13 preserved", applied.headers.length, 13);
  check("trade rows kept", applied.rows.length, 6);
  check("non-trade rows skipped", applied.skipped.length, 5);
  check("משיכה skipped", applied.skippedByKind["משיכה"], 1);
  check("הפקדה skipped", applied.skippedByKind["הפקדה"], 1);
  check("דיבדנד skipped", applied.skippedByKind["דיבדנד"], 1);
  check("valid", res.counts.valid, 6);
  check("longs from text", res.valid.filter((t) => t.side === "LONG").length, 3);
  check("shorts from text", res.valid.filter((t) => t.side === "SHORT").length, 3);
  check("positive qty on sells", res.valid.every((t) => t.shares > 0), true);
  check("'NFLX US' -> NFLX", res.valid.filter((t) => t.ticker === "NFLX").length, 2);
  check("hebrew names flagged", res.counts.unresolvedSymbol, 4);
}

// 13) Declared-generic file — no profile, old road, unchanged output.
{
  console.log("13) generic-baseline.csv");
  const { parsed } = runProfile("generic-baseline.csv");
  check("no profile", detectProfile(parsed.matrix), null);
  const det = detectColumns(parsed.headers, parsed.rows);
  const res = buildImport(parsed.rows, det.mapping, { dateFormat: det.dateFormat, capital: 2500 });
  check("mapping", JSON.stringify(det.mapping),
    '{"ticker":0,"side":1,"entry":2,"exit":3,"shares":4,"date":5,"stop":6}');
  check("valid", res.counts.valid, 2);
  check("no unresolved flag on generic route", res.counts.unresolvedSymbol, 0);
}

// 14) The real gate: no profile may swallow a pre-existing fixture.
{
  console.log("14) profiles do not claim the 10 original fixtures");
  for (const f of ["en-standard.csv", "he-semicolon.csv", "xlsx-serial.xlsx", "bad-rows.csv",
                   "duplicates.csv", "perf-200.csv", "ibi-style.csv", "altshuler-style.csv",
                   "precedence.csv", "lstrap.csv"]) {
    check(`no profile for ${f}`, detectProfile(parseAny(f).matrix), null);
  }
}

// 15) normalizeRow on the generic route returns exactly what it returned before
//     the resolvers existed — same result keys, same trade shape.
{
  console.log("15) normalizeRow shape frozen without resolvers");
  const TRADE_KEYS = "id,ticker,date,createdAt,side,entry,stop,target,exit,shares,status,setup,notes," +
    "marketCondition,emotionAtEntry,entryQuality,tradeImage,exitReason,followedPlan,lessonLearned," +
    "maxFavorable,maxAdverse,closedAt,_capitalAtEntry,_prediction,isDemo";
  for (const f of ["en-standard.csv", "he-semicolon.csv", "bad-rows.csv"]) {
    const { headers, rows } = parseCSV(readFileSync(join(FIX, f), "utf8"));
    const det = detectColumns(headers, rows);
    let okRows = 0;
    let resultKeys = new Set();
    let tradeKeys = new Set();
    for (const row of rows) {
      const r = normalizeRow(row, det.mapping, { dateFormat: det.dateFormat, capital: 2500 });
      resultKeys.add(Object.keys(r).join(","));
      if (r.ok) { okRows++; tradeKeys.add(Object.keys(r.trade).join(",")); }
    }
    check(`${f} result keys`, [...resultKeys].filter((k) => k.startsWith("ok,trade")).join("|"), "ok,trade");
    check(`${f} trade keys`, [...tradeKeys].join("|"), okRows ? TRADE_KEYS : "");
  }
}

// 16) The visible counter (ת1). Every row of the file must land in exactly one
//     bucket — a skipped row that no bucket claims is a row lost in silence.
{
  console.log("16) counter — skipped rows counted and itemised");
  for (const [file, expect] of [
    ["ibi-full.xlsx", { valid: 4, skipped: 5 }],
    ["altshuler-full.csv", { valid: 6, skipped: 5 }],
  ]) {
    const { res, applied } = runProfile(file);
    check(`${file} counts.skipped`, res.counts.skipped, expect.skipped);
    check(`${file} counts.valid`, res.counts.valid, expect.valid);
    // The denominator must be able to hold everything counted (CLAUDE.md §2).
    check(`${file} buckets sum to total`,
      res.counts.valid + res.counts.rejected + res.counts.duplicates + res.counts.skipped,
      res.counts.total);
    const kindSum = Object.values(res.skippedByKind).reduce((a, b) => a + b, 0);
    check(`${file} kinds sum to skipped`, kindSum, res.counts.skipped);
    check(`${file} every kind is named`,
      Object.keys(res.skippedByKind).every((k) => k.length > 0), true);
    check(`${file} skippedByKind passed through`,
      JSON.stringify(res.skippedByKind), JSON.stringify(applied.skippedByKind));
  }

  // Generic route: nothing skipped, and the counter still has a denominator.
  const { parsed } = runProfile("generic-baseline.csv");
  const det = detectColumns(parsed.headers, parsed.rows);
  const res = buildImport(parsed.rows, det.mapping, { dateFormat: det.dateFormat, capital: 2500 });
  check("generic counts.skipped", res.counts.skipped, 0);
  check("generic skippedByKind empty", JSON.stringify(res.skippedByKind), "{}");
  check("generic total unmoved", res.counts.total, parsed.rows.length);
}

// 17) `מכר` — the past-tense spelling the `מכיר` term cannot reach.
{
  console.log("17) normalizeSide — מכר reads as SHORT");
  check("מכר", normalizeSide("מכר"), "SHORT");
  check("מכר ניירות", normalizeSide("מכר ניירות"), "SHORT");
  check("מכירה still SHORT", normalizeSide("מכירה"), "SHORT");
  check("קנייה still LONG", normalizeSide("קנייה"), "LONG");
  check("unknown still null", normalizeSide("דיבידנד"), null);
}

console.log("");
if (failures > 0) {
  console.error(`❌ test:import — ${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("✅ test:import — all fixtures passed (17 scenarios)");
