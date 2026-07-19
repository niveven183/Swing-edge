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

console.log("test:import — pipeline over 6 fixtures\n");

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

console.log("");
if (failures > 0) {
  console.error(`❌ test:import — ${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("✅ test:import — all fixtures passed (6 scenarios)");
