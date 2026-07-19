// Deterministically (re)generate the 6 import fixtures. Run standalone or via
// import-test.mjs. Text fixtures are written verbatim; the XLSX fixture is built
// with SheetJS using Excel serial dates so the serial-date path is exercised.
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as XLSX from "xlsx";

const DIR = dirname(fileURLToPath(import.meta.url));
mkdirSync(DIR, { recursive: true });
const w = (name, content) => writeFileSync(join(DIR, name), content);

// date 'YYYY-MM-DD' -> Excel serial (1900 date system, matches SheetJS raw).
const toSerial = (ymd) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000) + 25569;
};

// 1) English standard CSV, comma — all valid (1 open trade).
w("en-standard.csv",
`Symbol,Side,Entry,Exit,Qty,Date,Stop,Target
AAPL,Long,150,160,10,2026-01-05,145,165
TSLA,Short,250,240,5,2026-01-06,260,230
NVDA,Long,100,110,20,2026-01-07,95,120
MSFT,Long,300,,8,2026-01-08,290,320
AMD,Short,120,115,15,2026-01-09,128,108
`);

// 2) Hebrew headers, ';' delimiter, UTF-8 BOM — all valid.
w("he-semicolon.csv",
"﻿" +
`סימול;כיוון;מחיר כניסה;מחיר יציאה;כמות;תאריך;סטופ
AAPL;קנייה;150;160;10;05/01/2026;145
TSLA;מכירה;250;240;5;06/01/2026;260
NVDA;קנייה;100;110;20;07/01/2026;95
`);

// 3) XLSX with Excel serial dates — all valid.
const xlsxRows = [
  ["Symbol", "Side", "Entry", "Exit", "Qty", "Date", "Stop"],
  ["AAPL", "Long", 150, 160, 10, toSerial("2026-01-05"), 145],
  ["TSLA", "Short", 250, 240, 5, toSerial("2026-01-06"), 260],
  ["NVDA", "Long", 100, 110, 20, toSerial("2026-01-07"), 95],
];
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(xlsxRows);
XLSX.utils.book_append_sheet(wb, ws, "Trades");
w("xlsx-serial.xlsx", XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));

// 4) Mixed good/bad — 2 valid, 3 rejected (no_qty, bad_stop, no_entry).
w("bad-rows.csv",
`Symbol,Side,Entry,Exit,Qty,Date,Stop
GOOD1,Long,100,110,10,2026-02-01,95
MISSINGQTY,Long,100,110,,2026-02-02,95
REVSTOP,Long,100,110,10,2026-02-03,105
BADENTRY,Long,abc,110,10,2026-02-04,95
GOOD2,Short,50,45,20,2026-02-05,55
`);

// 5) Duplicates — row1/row3 match a seeded existing trade & each other.
w("duplicates.csv",
`Symbol,Side,Entry,Exit,Qty,Date,Stop
AAPL,Long,100,110,10,2026-03-01,95
MSFT,Long,200,210,5,2026-03-02,190
AAPL,Long,100,110,10,2026-03-01,95
`);

// 6) Performance — 200 valid rows.
let perf = "Symbol,Side,Entry,Exit,Qty,Date,Stop\n";
for (let i = 0; i < 200; i++) {
  const day = String((i % 28) + 1).padStart(2, "0");
  perf += `SYM${i},Long,${100 + i},${110 + i},${10 + (i % 5)},2026-04-${day},${90 + i}\n`;
}
w("perf-200.csv", perf);

console.log("fixtures generated in", DIR);
