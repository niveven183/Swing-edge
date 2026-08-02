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
import {
  detectProfile, applyProfile, isTradeAction, nonSecurityKind, unitDivisor,
} from "../src/import/brokerProfiles.js";
import { normalizeSide } from "../src/import/synonyms.js";
import { fifoMatch } from "../src/import/fifoMatch.js";

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
const runProfile = (file, opts = {}) => {
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
    unitResolver: applied.unitResolver,
    skipped: applied.skipped,
    skippedByKind: applied.skippedByKind,
    ...opts,
  });
  return { parsed, profile, applied, det, res };
};

console.log("test:import — pipeline over 14 fixtures\n");

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
  // The seed used to be a 3-field stub. It only ever worked because dupKey
  // ignored everything else; an object with no shares and no status could never
  // exist in public.trades. T5 widened the key, so the seed is now written the
  // way the app actually hands existing trades over. The assertions below are
  // unchanged — the expectation was not moved, the input was made real.
  const existingTrades = [{
    ticker: "AAPL", date: "2026-03-01", entry: 100, exit: 110, shares: 10,
    status: "CLOSED", closedAt: new Date("2026-03-01T20:00:00").toISOString(),
  }];
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
  // The pre-T9 shape, kept verbatim. T9 adds exactly one key — `currency`, the
  // additive column of migration 20260802140000 — and the expected shape below
  // is *derived* from this string rather than retyped, so any second change to
  // the trade shape still fails this gate.
  const TRADE_KEYS_PRE_T9 = "id,ticker,date,createdAt,side,entry,stop,target,exit,shares,status,setup,notes," +
    "marketCondition,emotionAtEntry,entryQuality,tradeImage,exitReason,followedPlan,lessonLearned," +
    "maxFavorable,maxAdverse,closedAt,_capitalAtEntry,_prediction,isDemo";
  const TRADE_KEYS = TRADE_KEYS_PRE_T9.replace("side,", "side,currency,");
  check("T9 adds exactly one key",
    TRADE_KEYS.split(",").length - TRADE_KEYS_PRE_T9.split(",").length, 1);
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

// ── T5: FIFO ────────────────────────────────────────────────────────────────
// The engine is a pure function, so 18-26 drive it directly with hand-built
// trades: no file, no parser, no mapping in the way. Every expected number in
// the comments was computed by hand before the code was run.

const mk = (ticker, side, entry, shares, date) => ({
  id: `${ticker}-${side}-${date}-${entry}`,
  ticker, side, entry, shares, date,
  createdAt: new Date(`${date}T14:30:00`).toISOString(),
  stop: null, target: null, exit: null, status: "OPEN", closedAt: null,
});
const pnl = (t) =>
  t.side === "LONG" ? (t.exit - t.entry) * t.shares : (t.entry - t.exit) * t.shares;
const near = (name, actual, expected) => {
  const ok = Math.abs(actual - expected) < 1e-9;
  if (!ok) { failures++; console.error(`  ✗ ${name}: expected ${expected}, got ${actual}`); }
  else console.log(`  ✓ ${name} = ${actual}`);
};

// 18) Full 1:1 match.
//     buy 100 @150 (01/03) + sell 100 @160 (05/03)
//     -> 1 closed: entry 150, exit 160, shares 100, date 03-01, closedAt 03-05
//     -> pnl = (160-150) * 100 = 1,000 ; 0 open
{
  console.log("18) FIFO — full 1:1 match");
  const { closedTrades, openTrades, log } = fifoMatch([
    mk("ACME", "LONG", 150, 100, "2026-03-01"),
    mk("ACME", "SHORT", 160, 100, "2026-03-05"),
  ]);
  check("closed", closedTrades.length, 1);
  check("open", openTrades.length, 0);
  const c = closedTrades[0];
  check("side", c.side, "LONG");
  check("entry", c.entry, 150);
  check("exit", c.exit, 160);
  check("shares", c.shares, 100);
  check("date = buy date", c.date, "2026-03-01");
  check("closedAt date = sell date", c.closedAt.slice(0, 10), "2026-03-05");
  check("status", c.status, "CLOSED");
  check("stop stays null (R contract)", c.stop, null);
  check("pnl not stored", "pnl" in c, false);
  check("derived pnl", pnl(c), 1000);
  check("log.matched", log.matched, 1);
}

// 19) Partial — buy larger than sell.
//     buy 100 @150 + sell 40 @160
//     -> closed 40 (pnl = 10 * 40 = 400) + open LONG 60 @150
{
  console.log("19) FIFO — partial fill (buy > sell)");
  const { closedTrades, openTrades, log } = fifoMatch([
    mk("ACME", "LONG", 150, 100, "2026-03-01"),
    mk("ACME", "SHORT", 160, 40, "2026-03-05"),
  ]);
  check("closed", closedTrades.length, 1);
  check("closed shares", closedTrades[0].shares, 40);
  check("derived pnl", pnl(closedTrades[0]), 400);
  check("open", openTrades.length, 1);
  check("open side", openTrades[0].side, "LONG");
  check("open remainder", openTrades[0].shares, 60);
  check("open entry unchanged", openTrades[0].entry, 150);
  check("open status", openTrades[0].status, "OPEN");
  check("log.partialFills", log.partialFills, 1);
}

// 20) Split — one sell spanning two buys.
//     buy 40 @100 + buy 60 @110 + sell 100 @120
//     -> closed (40, 100->120) pnl = 20*40 =   800
//     -> closed (60, 110->120) pnl = 10*60 =   600
//     -> total 1,400 ; 0 open
{
  console.log("20) FIFO — split sell across two buys");
  const { closedTrades, openTrades, log } = fifoMatch([
    mk("ACME", "LONG", 100, 40, "2026-03-01"),
    mk("ACME", "LONG", 110, 60, "2026-03-02"),
    mk("ACME", "SHORT", 120, 100, "2026-03-05"),
  ]);
  check("closed", closedTrades.length, 2);
  check("open", openTrades.length, 0);
  check("leg1 oldest first", closedTrades[0].entry, 100);
  check("leg1 shares", closedTrades[0].shares, 40);
  check("leg1 pnl", pnl(closedTrades[0]), 800);
  check("leg2 entry", closedTrades[1].entry, 110);
  check("leg2 shares", closedTrades[1].shares, 60);
  check("leg2 pnl", pnl(closedTrades[1]), 600);
  check("total pnl", pnl(closedTrades[0]) + pnl(closedTrades[1]), 1400);
  check("log.splitSells", log.splitSells, 1);
  check("distinct ids", closedTrades[0].id === closedTrades[1].id, false);
}

// 21) Two securities in parallel — a sell must not reach into another book.
//     AAA buy 10 @50 · BBB buy 5 @20 · AAA sell 10 @55
//     -> closed AAA pnl = 5 * 10 = 50 ; open = BBB only
{
  console.log("21) FIFO — two securities in parallel");
  const { closedTrades, openTrades } = fifoMatch([
    mk("AAA", "LONG", 50, 10, "2026-03-01"),
    mk("BBB", "LONG", 20, 5, "2026-03-02"),
    mk("AAA", "SHORT", 55, 10, "2026-03-03"),
  ]);
  check("closed", closedTrades.length, 1);
  check("closed ticker", closedTrades[0].ticker, "AAA");
  check("closed pnl", pnl(closedTrades[0]), 50);
  check("open", openTrades.length, 1);
  check("open ticker", openTrades[0].ticker, "BBB");
  check("BBB size untouched", openTrades[0].shares, 5);
}

// 22) Orphan sell -> SHORT open. Not an error (rule 3).
{
  console.log("22) FIFO — orphan sell opens a SHORT");
  const { closedTrades, openTrades, log } = fifoMatch([mk("ACME", "SHORT", 90, 30, "2026-03-01")]);
  check("closed", closedTrades.length, 0);
  check("open", openTrades.length, 1);
  check("side", openTrades[0].side, "SHORT");
  check("shares", openTrades[0].shares, 30);
  check("entry", openTrades[0].entry, 90);
  check("status", openTrades[0].status, "OPEN");
  check("log.orphanSells", log.orphanSells, 1);
}

// 23) All buys -> all open, nothing matched.
{
  console.log("23) FIFO — all buys stay open");
  const { closedTrades, openTrades, log } = fifoMatch([
    mk("AAA", "LONG", 10, 1, "2026-03-01"),
    mk("BBB", "LONG", 20, 2, "2026-03-02"),
    mk("CCC", "LONG", 30, 3, "2026-03-03"),
  ]);
  check("closed", closedTrades.length, 0);
  check("open", openTrades.length, 3);
  check("log.matched", log.matched, 0);
  check("log.unmatchedBuys", log.unmatchedBuys, 3);
  check("file order kept", openTrades.map((t) => t.ticker).join(","), "AAA,BBB,CCC");
}

// 24) Newest-first file — the sell is listed before the buy it closes.
//     Without reversal the sell would become an orphan SHORT and the buy would
//     stay open: 0 closed, 2 open. With it: 1 closed, pnl = (160-150)*10 = 100.
{
  console.log("24) FIFO — newest-first file is reversed");
  const { closedTrades, openTrades, log } = fifoMatch([
    mk("ACME", "SHORT", 160, 10, "2026-03-05"),
    mk("ACME", "LONG", 150, 10, "2026-03-01"),
  ]);
  check("orderNote", log.orderNote, "reversed");
  check("reversedFileOrder", log.reversedFileOrder, true);
  check("closed", closedTrades.length, 1);
  check("open", openTrades.length, 0);
  check("pnl", pnl(closedTrades[0]), 100);
  check("no orphan", log.orphanSells, 0);

  // A mixed file is left alone and said so — guessing would be worse.
  const mixed = fifoMatch([
    mk("ACME", "LONG", 150, 10, "2026-03-01"),
    mk("ACME", "LONG", 150, 10, "2026-03-09"),
    mk("ACME", "SHORT", 160, 20, "2026-03-05"),
  ]);
  check("mixed not reversed", mixed.log.reversedFileOrder, false);
  check("mixed named in log", mixed.log.orderNote, "mixed");
  // Sorted by date the sell (03-05) sits between the two buys, so it can only
  // reach the first: closed 10 @150->160 (pnl 100) + orphan SHORT 10.
  check("mixed closed", mixed.closedTrades.length, 1);
  check("mixed orphan remainder", mixed.log.orphanSells, 1);
}

// 25) Same day, no time column — the row order breaks the tie.
//     buy 10 @100 and sell 10 @105 both on 03-01, buy listed first.
//     -> 1 closed, pnl = 5 * 10 = 50
{
  console.log("25) FIFO — same-day tie broken by row order");
  const same = fifoMatch([
    mk("ACME", "LONG", 100, 10, "2026-03-01"),
    mk("ACME", "SHORT", 105, 10, "2026-03-01"),
  ]);
  check("orderNote flat", same.log.orderNote, "flat");
  check("closed", same.closedTrades.length, 1);
  check("pnl", pnl(same.closedTrades[0]), 50);

  // Sell listed first on the same day: dates are equal, so nothing signals a
  // reversed file and the tie-break stands. This is the known limit — it is
  // asserted, not hidden.
  const flipped = fifoMatch([
    mk("ACME", "SHORT", 105, 10, "2026-03-01"),
    mk("ACME", "LONG", 100, 10, "2026-03-01"),
  ]);
  check("flipped same-day closed", flipped.closedTrades.length, 0);
  check("flipped becomes orphan SHORT + open LONG", flipped.openTrades.length, 2);
}

// 26) Fractional quantities.
//     buy 2.5 @400 + sell 1.5 @420 -> closed 1.5 (pnl = 20 * 1.5 = 30)
//     + open 1.0 . 2.5 - 1.5 = 1 is exact in binary, so also check 0.3 - 0.1.
{
  console.log("26) FIFO — fractional quantities");
  const a = fifoMatch([
    mk("BRKA", "LONG", 400, 2.5, "2026-03-01"),
    mk("BRKA", "SHORT", 420, 1.5, "2026-03-05"),
  ]);
  near("closed shares", a.closedTrades[0].shares, 1.5);
  near("closed pnl", pnl(a.closedTrades[0]), 30);
  near("open remainder", a.openTrades[0].shares, 1);

  const b = fifoMatch([
    mk("BRKA", "LONG", 100, 0.3, "2026-03-01"),
    mk("BRKA", "SHORT", 110, 0.1, "2026-03-05"),
  ]);
  near("float remainder 0.3-0.1", b.openTrades[0].shares, 0.2);
  check("float leaves exactly one open lot", b.openTrades.length, 1);

  // An exact-to-the-epsilon close must not leave a phantom lot behind.
  const c = fifoMatch([
    mk("BRKA", "LONG", 100, 0.1, "2026-03-01"),
    mk("BRKA", "LONG", 100, 0.2, "2026-03-02"),
    mk("BRKA", "SHORT", 110, 0.3, "2026-03-05"),
  ]);
  check("0.1+0.2 fully closed", c.openTrades.length, 0);
  check("two legs", c.closedTrades.length, 2);
}

// 27) The dupKey regression — the reason FIFO could not ship without it.
//     Scenario 20's split produces two closed trades sharing ticker|date|entry.
//     Under the old 3-field key the second was a duplicate and, with the default
//     "skip duplicates", vanished. Both must now survive.
{
  console.log("27) dupKey — split fills are not duplicates");
  const { res } = runProfile("ibi-fifo.xlsx", { fifo: true });
  check("duplicates", res.counts.duplicates, 0);
  const acme = res.valid.filter((t) => t.ticker === "ACME CORP" && t.status === "CLOSED");
  check("both ACME closes survive", acme.length, 2);
  check("same ticker|date|entry", acme.every((t) => t.date === "2026-01-05" && t.entry === 150), true);
  check("distinct exits", acme.map((t) => t.exit).sort((a, b) => a - b).join(","), "160,170");

  // A real duplicate — every field identical — is still caught (condition 1).
  const dupTwice = buildImport(
    [["AAA", "Long", "100", "110", "10", "2026-03-01", ""],
     ["AAA", "Long", "100", "110", "10", "2026-03-01", ""]],
    { ticker: 0, side: 1, entry: 2, exit: 3, shares: 4, date: 5, stop: 6 },
    { dateFormat: "YYYY-MM-DD", capital: 2500 }
  );
  check("identical rows still duplicate", dupTwice.counts.duplicates, 1);
  check("first one kept", dupTwice.counts.valid, 1);

  // Same ticker|date|entry, different exit and size -> both kept.
  const partials = buildImport(
    [["AAA", "Long", "100", "110", "40", "2026-03-01", ""],
     ["AAA", "Long", "100", "120", "60", "2026-03-01", ""]],
    { ticker: 0, side: 1, entry: 2, exit: 3, shares: 4, date: 5, stop: 6 },
    { dateFormat: "YYYY-MM-DD", capital: 2500 }
  );
  check("differing exit/shares kept", partials.counts.valid, 2);
  check("no false duplicate", partials.counts.duplicates, 0);
}

// 28) The gate: the generic route never reaches the engine.
{
  console.log("28) FIFO gate — generic route untouched");
  const { parsed } = runProfile("generic-baseline.csv");
  const det = detectColumns(parsed.headers, parsed.rows);
  const off = buildImport(parsed.rows, det.mapping, { dateFormat: det.dateFormat, capital: 2500 });
  check("fifo null when not asked", off.fifo, null);
  check("valid unchanged", off.counts.valid, 2);
  check("closed+open = valid", off.counts.closed + off.counts.open, off.counts.valid);

  // And the whole broker file, end to end, with both denominators intact.
  const { res, applied } = runProfile("ibi-fifo.xlsx", { fifo: true });
  check("trade rows kept", applied.rows.length, 8);
  check("non-trade skipped", applied.skipped.length, 1);
  check("fifo ran", res.fifo !== null, true);
  check("closed produced", res.fifo.closed, 4);   // ACME 40+60, WIDGET 20+30
  check("open produced", res.fifo.open, 2);       // AAPL buy, GLOBEX orphan sell
  check("tradesIn", res.fifo.log.tradesIn, 8);
  // File-row denominator: every row of the file lands somewhere (§2).
  check("rows accounted for",
    res.counts.rejected + res.counts.skipped + res.counts.accepted, res.counts.total);
  // Trade-level denominator: a different population, stated separately.
  check("trades accounted for",
    res.counts.valid + res.counts.duplicates, res.fifo.closed + res.fifo.open);
  check("closed shown", res.counts.closed, 4);
  check("open shown", res.counts.open, 2);
  // Caught by eye in the browser, not by an assertion: 8 rows carry an
  // unresolved security name but they become 6 trades, and the screen read
  // "7 imported under a name only" above "6 trades imported". A count can
  // never exceed the population it is printed against (§2).
  // ACME (3 rows -> 2 closed), WIDGET (3 -> 2 closed), GLOBEX (1 -> 1 open) = 5.
  // AAPL resolves to a symbol and is excluded.
  check("unresolved counted over trades", res.counts.unresolvedSymbol, 5);
  check("unresolved never exceeds trades",
    res.counts.unresolvedSymbol <= res.counts.valid + res.counts.duplicates, true);
  check("AAPL still not flagged",
    res.unresolvedSymbols.some((u) => u.ticker === "AAPL"), false);
  check("every closed passes getClosed",
    res.valid.filter((t) => t.status === "CLOSED" && t.exit != null).length, 4);
  const globex = res.valid.find((t) => t.ticker === "GLOBEX PLC");
  check("orphan sell is a SHORT", globex?.side, "SHORT");
  check("orphan sell positive size", globex?.shares, 7);
  // WIDGET: buys 20 @100 and 30 @110, one sell of 50 @120.
  // -> 20 * (120-100) = 400 and 30 * (120-110) = 300, total 700.
  const widget = res.valid.filter((t) => t.ticker === "WIDGET LTD" && t.status === "CLOSED");
  check("widget legs", widget.length, 2);
  near("widget total pnl", widget.reduce((s, t) => s + pnl(t), 0), 700);
}

// ── T9: currency and unit ───────────────────────────────────────────────────

// 29) The second gate. `מס ששולם` is booked by IBI as a *buy* at a par rate of
//     100, so it passes the action whitelist exactly as a real purchase does.
//     Nine such rows reached a live account. The gate keys on the security name
//     because that is where the distinction lives.
{
  console.log("29) second gate — pseudo-securities are not trades");
  check("מס ששולם", nonSecurityKind("מס ששולם"), "תנועת מס");
  check("זיכוי מס", nonSecurityKind("זיכוי מס"), "תנועת מס");
  check("מס תקבולים   26", nonSecurityKind("מס תקבולים   26"), "תנועת מס");
  check("B USD/ILS 3.170", nonSecurityKind("B USD/ILS 3.170"), 'המרת מט"ח');
  check("S USD/ILS 3.100", nonSecurityKind("S USD/ILS 3.100"), 'המרת מט"ח');
  // Substring, not token — a real security keeps its place.
  check("מסילות is a security", nonSecurityKind("מסילות בע\"מ"), null);
  check("מספנות is a security", nonSecurityKind("מספנות ישראל"), null);
  check("מזרחי טפחות", nonSecurityKind("מזרחי טפחות"), null);
  check("NFLX US", nonSecurityKind("NFLX US"), null);
  check("empty", nonSecurityKind(""), null);
  // And the action whitelist still stands on its own: the verb of a tax row is
  // a genuine buy, which is precisely why one gate was not enough.
  check("the tax row's verb passes the whitelist", isTradeAction("קנייה"), true);
}

// 30) Mixed file, both gates, end to end. 8 rows: 4 trades (2 ILS + 2 USD),
//     3 pseudo-securities, 1 dividend.
//     מזרחי quoted 12000 agorot -> 120 ₪ ; sold 13000 -> 130 ₪
//       pnl = (130 - 120) * 100 = 1,000 ₪
//     NFLX  quoted 77.79 $ (unchanged) ; sold 90 $
//       pnl = (90 - 77.79) * 20 = 244.2 $
{
  console.log("30) IBI mixed currency — agorot and dollars in one file");
  const { res, applied } = runProfile("ibi-currency.xlsx", { fifo: true });
  check("trade rows kept", applied.rows.length, 4);
  check("rows dropped", applied.skipped.length, 4);
  check("tax rows named", applied.skippedByKind["תנועת מס"], 2);
  check("fx row named", applied.skippedByKind['המרת מט"ח'], 1);
  check("dividend still caught by the action gate",
    applied.skippedByKind["דיבידנד - תשלום"], 1);
  check("no pseudo-security became a trade",
    res.valid.some((t) => nonSecurityKind(t.ticker) != null), false);
  check("rows accounted for",
    res.counts.rejected + res.counts.skipped + res.counts.accepted, res.counts.total);

  const ils = res.valid.find((t) => t.ticker === "מזרחי טפחות");
  check("ILS currency", ils.currency, "ILS");
  near("agorot divided by 100 — entry", ils.entry, 120);
  near("agorot divided by 100 — exit", ils.exit, 130);
  check("ILS shares untouched", ils.shares, 100);
  near("ILS pnl", pnl(ils), 1000);

  const usd = res.valid.find((t) => t.ticker === "NFLX");
  check("USD currency", usd.currency, "USD");
  near("dollar price untouched — entry", usd.entry, 77.79);
  near("dollar price untouched — exit", usd.exit, 90);
  near("USD pnl", pnl(usd), 244.2);

  // The point of the fixture: neither security's unit leaked into the other.
  check("two currencies in one file",
    [...new Set(res.valid.map((t) => t.currency))].sort().join(","), "ILS,USD");
  check("both closed", res.counts.closed, 2);
  check("nothing left open", res.counts.open, 0);
}

// 31) Altshuler — the currency is stated, the unit is still derived.
//     בנק לאומי 4000 agorot -> 40 ₪, sold 4500 -> 45 ₪ : (45-40)*30 = 150 ₪
//     NFLX 25.5 $ -> 30 $ : (30-25.5)*12 = 54 $
{
  console.log("31) Altshuler — currency from the column, unit from arithmetic");
  const { res, applied } = runProfile("altshuler-agorot.csv", { fifo: true });
  check("all four rows are trades", applied.rows.length, 4);
  check("nothing skipped", applied.skipped.length, 0);

  const ils = res.valid.find((t) => t.ticker === "בנק לאומי");
  check("ILS from the מטבע column", ils.currency, "ILS");
  near("agorot converted", ils.entry, 40);
  near("agorot converted on exit", ils.exit, 45);
  near("ILS pnl", pnl(ils), 150);

  const usd = res.valid.find((t) => t.ticker === "NFLX");
  check("USD from the מטבע column", usd.currency, "USD");
  near("dollar untouched", usd.entry, 25.5);
  near("USD pnl", pnl(usd), 54);

  // The whole altshuler-full fixture keeps working, with a currency on each row.
  const full = runProfile("altshuler-full.csv", { fifo: true }).res;
  check("full file still 3 closed", full.counts.closed, 3);
  check("full file currencies",
    [...new Set(full.valid.map((t) => t.currency))].sort().join(","), "ILS,USD");
}

// 32) The unit ratio itself, and the refusal to guess. A row that resolves to
//     neither 1.00 nor 0.01 is rejected and named — it is never rounded to the
//     nearer of the two.
{
  console.log("32) unit ratio — resolves or refuses, never guesses");
  check("major unit", unitDivisor(1555.8, 20, 77.79), 1);
  check("agorot", unitDivisor(12000, 100, 12000), 100);
  check("Yitzhak's דיסקונט row", unitDivisor(14990.4, 432, 3470), 100);
  check("negative sell", unitDivisor(-13000, -100, 13000), 100);
  check("neither -> null", unitDivisor(500, 100, 100), null);
  check("zero gross -> null", unitDivisor(100, 0, 50), null);
  check("missing value -> null", unitDivisor(null, 10, 10), null);

  // A generic file has no resolver: factor 1 and the account currency, exactly
  // as it behaved before T9.
  const generic = runCSV("en-standard.csv");
  check("generic entry untouched", generic.res.valid[0].entry, 150);
  check("generic defaults to USD", generic.res.valid[0].currency, "USD");
  const ils = runCSV("en-standard.csv", { defaultCurrency: "ILS" });
  check("account currency honoured", ils.res.valid[0].currency, "ILS");
  check("account currency does not scale", ils.res.valid[0].entry, 150);

  // And a row whose arithmetic does not resolve is rejected with a reason, not
  // imported at some plausible-looking price.
  const bad = normalizeRow(["X", "10", "100"], { ticker: 0, shares: 1, entry: 2 }, {
    unitResolver: () => ({ error: "bad_unit" }),
  });
  check("rejected", bad.ok, false);
  check("named", bad.code, "bad_unit");
  check("has a Hebrew reason", typeof bad.detail?.he, "string");
}

console.log("");
if (failures > 0) {
  console.error(`❌ test:import — ${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("✅ test:import — all fixtures passed (32 scenarios)");
