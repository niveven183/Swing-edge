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

// 7) IBI-style broker export. "שם נייר" carries the symbol while "מספר נייר"
// carries the numeric Israeli security ID — both claim `ticker`, and the
// numeric one even scores higher on the header. Content must break the tie.
w("ibi-style.csv",
`שם נייר,מספר נייר,פעולה,כמות,שער עלות ממוצע,תאריך הוראה
AAPL,1159250,קנייה,10,150,2026-01-05
TSLA,1159251,מכירה,5,250,2026-01-06
NVDA,1159252,קנייה,20,100,2026-01-07
`);

// 8) Altshuler-style broker export. Company name precedes the symbol column,
// so leftmost-wins would map `ticker` onto untradable display text.
w("altshuler-style.csv",
`תאריך,סוג פעולה,שם נייר,מס' נייר / סימול,כמות,שער ביצוע,מטבע
2026-02-03,קנייה,META PLATFORMS INC,PLTR,12,25.5,$
2026-02-04,מכירה,דיסקונט א,NFLX,4,600,$
2026-02-05,קנייה,ALPHABET INC,GOOG,7,180,$
`);

// 9) Specific-beats-generic: "שער ביצוע" must not be stolen by "שער", and
// "מחיר יעד"/"מחיר סטופ" must not be stolen by "מחיר". Last column is in no
// dictionary and must stay unmapped.
w("precedence.csv",
`סימול,כמות,שער ביצוע,מחיר יעד,מחיר סטופ,הערות למסחר
AAPL,10,150,165,145,ניסיון ראשון
TSLA,5,250,270,240,לפי התוכנית
`);

// 10) The "l/s" trap: both headers contain an 'l' and an 's', which the old
// token-subset fallback read as the `side` synonym "l/s".
w("lstrap.csv",
`Symbol,total shares sold,stop loss price,Entry,Date
AAPL,10,145,150,2026-03-02
MSFT,8,290,300,2026-03-03
`);

// ── Broker-profile fixtures ─────────────────────────────────────────────────
// Structure only is taken from the real broker exports: column names, their
// order, and the action-type strings. Every symbol, name, quantity, price and
// date below is invented.

// 11) IBI export. Built as XLSX because that is the real format and because the
// blank preamble rows survive it — a CSV would have them collapsed by the
// parser, and the whole point is that the header sits at index 10.
const IBI_HEADERS = [
  "שם נייר", "מספר נייר", "פעולה", "כמות", "שער עלות ממוצע", "שווי במטבע",
  "שווי כולל בש”ח", "תאריך הוראה", "תאריך נכונות", "אחוז מס",
  "סכום מס משוער בישראל",
];
const blank11 = () => new Array(11).fill("");
const ibiRow = (name, id, action, qty, price, date) =>
  [name, id, action, qty, price, qty * price, qty * price * 3.6, date, date, 25, 0];

const ibiAoa = [
  blank11(), blank11(), blank11(),
  ["תנועות היסטוריות", "", "", "", "", "", "", "", "", "", ""],
  ["חשבון: 0-00000", "", "", "", "", "", "", "", "", "", ""],
  ["תאריך הפקת הקובץ: 01/01/2026", "", "", "", "", "", "", "", "", "", ""],
  ["תאריך נכונות הנתונים: 01/01/2026", "", "", "", "", "", "", "", "", "", ""],
  blank11(),
  ["תאריכים הנכללים בתקופה: 01/01/2026 עד 31/01/2026", "", "", "", "", "", "", "", "", "", ""],
  blank11(),
  IBI_HEADERS,
  ibiRow("ACME CORP", 1100001, "קנייה", 10, 150, "05/01/2026"),
  ibiRow("ACME CORP", 1100001, "מכירה", -10, 160, "09/01/2026"),
  ibiRow("WIDGET LTD", 1100002, "קנייה", 20, 100, "06/01/2026"),
  ibiRow("AAPL", 1100004, "קנייה", 5, 200, "07/01/2026"),
  ibiRow("GLOBEX PLC", 1100003, "המרת מט״ח", 5000, 1, "08/01/2026"),
  ibiRow("ACME CORP", 1100001, "דיבידנד - תשלום", 10, 0.5, "10/01/2026"),
  ibiRow("", "", "חיוב ריבית חובה", 0, 0, "11/01/2026"),
  ibiRow("", "", "מתנה", 1, 0, "12/01/2026"),
  ibiRow("", "", "משיכת כספים", 1000, 1, "13/01/2026"),
];
const ibiWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(ibiWb, XLSX.utils.aoa_to_sheet(ibiAoa), "תנועות");
w("ibi-full.xlsx", XLSX.write(ibiWb, { type: "buffer", bookType: "xlsx" }));

// 12) Altshuler export. Header on row 1, quantity positive on sells too, and a
// foreign security whose symbol hides in the *name* column while the symbol
// column sits empty.
w("altshuler-full.csv",
`תאריך,סוג פעולה,שם נייר,מס' נייר / סימבול,כמות,שער ביצוע,מטבע,עמלת פעולה,עמלות נלוות,תמורה במט"ח,תמורה בשקלים,יתרה שקלית,אומדן מס רווחי הון
03/02/2026,קניה חול מטח,NFLX US,,12,25.5,$,1,0,-306,-1100,5000,0
04/02/2026,מכירה חול מטח,NFLX US,,12,30,$,1,0,360,1300,6300,50
05/02/2026,קניה רצף,מניה ישראלית א,1234567,30,40,₪,2,0,-1200,-1200,5100,0
06/02/2026,מכירה רצף,מניה ישראלית א,1234567,30,45,₪,2,0,1350,1350,6450,20
07/02/2026,קניה שח,מניה ישראלית ב,7654321,15,80,₪,2,0,-1200,-1200,5250,0
08/02/2026,מכירה שח,מניה ישראלית ב,7654321,15,88,₪,2,0,1320,1320,6570,30
09/02/2026,משיכה,,,1000,1,₪,0,0,-1000,-1000,5570,0
10/02/2026,הפקדה,,,2000,1,₪,0,0,2000,2000,7570,0
11/02/2026,דיבדנד,NFLX US,,0,0,$,0,0,12,43,7613,0
12/02/2026,ריבית מזומן בשח,,,0,0,₪,0,0,3,3,7616,0
13/02/2026,העברה מזומן בשח,,,0,0,₪,0,0,5,5,7621,0
`);

// 13) Declared-generic file: must match no profile and travel the old road.
w("generic-baseline.csv",
`Symbol,Side,Entry,Exit,Qty,Date,Stop
ZZZ,Long,10,12,3,2026-05-01,9
YYY,Short,20,18,4,2026-05-02,22
`);

console.log("fixtures generated in", DIR);
