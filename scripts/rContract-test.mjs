// test:rcontract — guards the R-multiple null contract (FIN-007/008/009/010/011/012/032/034).
//
// The contract: `calcTradeMetrics` reports `rMultiple: null` whenever R is not
// measurable (no exit, no stop, or stop === entry). A trade without a stop did
// NOT do 0R — it is unmeasurable in R. Every consumer must drop such a trade
// from BOTH the numerator and the denominator, and report how many trades the
// R figure actually rests on.
//
// Why this file exists: `test:coach` cannot catch an R regression. Its fixtures
// (coach-invariance-test.mjs:52) build `status:"closed"` + `exitPrice`, while
// `getClosed` requires `status === "CLOSED" && exit != null`, so every fixture
// trade is filtered out of the statistical path. See docs/DECISIONS.md 2026-07-28.
//
// Pure Node, no network. Run: `node scripts/rContract-test.mjs`.

import { readFileSync } from "node:fs";
import { calcTradeMetrics, fmtR, numOrNull } from "../src/utils.js";
import {
  avgR, rStats, rSampleSize, rValues, expectedValueR, sharpeR, kellyFraction,
  winRate, getClosed, rankSetupEdges, expectancyWeights,
} from "../src/intelligence/utils/statisticalModels.js";
import { calculateGrowthScore } from "../src/intelligence/core/GrowthTracker.js";
import { generateMonthlyReport } from "../src/intelligence/core/MonthlyReport.js";

let failures = 0;
const check = (name, cond) => {
  if (cond) console.log(`  ✓ ${name}`);
  else { failures++; console.error(`  ✗ ${name}`); }
};
const eq = (name, actual, expected) =>
  check(`${name} → ${JSON.stringify(expected)}`, Object.is(actual, expected));

const mk = (i, setup, entry, stop, exit, shares = 10) => ({
  id: `t${i}`, ticker: "AAPL", side: "LONG", setup,
  date: `2026-01-${String(10 + i).padStart(2, "0")}`,
  entry, stop, shares, exit, status: "CLOSED",
  closedAt: `2026-01-${String(10 + i).padStart(2, "0")}T15:00:00Z`,
});

// ── 1 · ZERO REGRESSION ──────────────────────────────────────────────────────
// Reference values captured from the pre-fix code on a portfolio where none of
// the bugs can fire: every trade has a valid stop and none is break-even.
// These numbers must not move by a single bit. This is the first test written
// and the one that makes every other change safe.
{
  console.log("\n1 · zero regression (valid stops, no BE) — numbers must not move");
  const CLEAN = [
    mk(1, "Breakout", 100, 95, 115), mk(2, "Breakout", 100, 95, 90),
    mk(3, "Breakout", 100, 96, 108), mk(4, "Pullback", 50, 48, 56),
    mk(5, "Pullback", 50, 48, 47),   mk(6, "Pullback", 200, 190, 230),
    mk(7, "Breakout", 100, 95, 105), mk(8, "Pullback", 50, 47, 44),
    mk(9, "Breakout", 100, 98, 104), mk(10, "Pullback", 50, 45, 65),
  ];
  const closed = getClosed(CLEAN);
  eq("closed count", closed.length, 10);
  eq("avgR", avgR(closed), 1.15);
  // The one number that moved, and by one ulp: 1.1499999999999997 → 1.15.
  // The old code weighted losses by `1 - winRate`; the new one counts the loss
  // population directly (`losses / n`). `1 - 0.7` is 0.30000000000000004 while
  // `3/10` is exactly 0.3, so the new figure is the more accurate of the two.
  // With no break-even trade in the set, expectancy is avgR by definition —
  // asserted below as an identity so this can never silently drift again.
  eq("expectancyR", expectedValueR(closed), 1.15);
  eq("expectancy === avgR when no trade is break-even", expectedValueR(closed), avgR(closed));
  eq("sharpeR", sharpeR(closed), 0.5321881915893126);
  eq("kelly", kellyFraction(closed), 0.4735294117647058);
  eq("winRate", winRate(closed), 0.7);

  const ranked = rankSetupEdges(CLEAN);
  eq("ranked[0].setup", ranked[0].setup, "Breakout");
  eq("ranked[0].avgR", ranked[0].avgR, 1.2);
  eq("ranked[0].score", ranked[0].score, 0.8261621810607855);
  eq("ranked[1].avgR", ranked[1].avgR, 1.1);
  eq("ranked[1].score", ranked[1].score, 0.48451185763855775);

  // A full-stop portfolio must report a sample size equal to its own size.
  eq("rSampleSize == n when every trade is measurable", rSampleSize(closed), 10);
}

// ── 2 · HALF THE PORTFOLIO HAS NO STOP ───────────────────────────────────────
{
  console.log("\n2 · 10 trades, 5 with stop:null → avgR over 5, rSampleSize 5");
  // The five measurable trades are all exactly +2R, so a diluted mean is
  // unmistakable: correct = 2.0, diluted = 1.0.
  const MIXED = [
    mk(1, "Breakout", 100, 90, 120), mk(2, "Breakout", 100, 90, 120),
    mk(3, "Breakout", 100, 90, 120), mk(4, "Breakout", 100, 90, 120),
    mk(5, "Breakout", 100, 90, 120),
    mk(6, "Breakout", 100, null, 120), mk(7, "Breakout", 100, null, 120),
    mk(8, "Breakout", 100, null, 120), mk(9, "Breakout", 100, null, 120),
    mk(10, "Breakout", 100, null, 120),
  ];
  const closed = getClosed(MIXED);
  eq("closed count (P&L population is still 10)", closed.length, 10);
  eq("avgR computed over the 5 measurable trades", avgR(closed), 2);
  eq("rSampleSize", rSampleSize(closed), 5);
  const st = rStats(closed);
  eq("rStats.n", st.n, 5);
  eq("rStats.avg", st.avg, 2);
  check("rStats.values holds exactly the measurable R's",
    st.values.length === 5 && st.values.every(v => v === 2));
  check("numerator and denominator moved together (avg × n === sum)",
    Math.abs(st.avg * st.n - st.values.reduce((s, v) => s + v, 0)) < 1e-12);
}

// ── 3 · stop === entry ───────────────────────────────────────────────────────
{
  console.log("\n3 · stop === entry → rMultiple null, never 0");
  const m = calcTradeMetrics({ side: "LONG", entry: 100, stop: 100, shares: 10, exit: 115 });
  eq("rMultiple", m.rMultiple, null);
  check("P&L is still real (150)", m.pnl === 150);
  const noStop = calcTradeMetrics({ side: "LONG", entry: 100, stop: null, shares: 10, exit: 115 });
  eq("stop:null → rMultiple", noStop.rMultiple, null);
  const open = calcTradeMetrics({ side: "LONG", entry: 100, stop: 90, shares: 10, exit: null });
  eq("no exit → rMultiple", open.rMultiple, null);
  const ok = calcTradeMetrics({ side: "LONG", entry: 100, stop: 90, shares: 10, exit: 120 });
  eq("valid geometry still computes", ok.rMultiple, 2);
}

// ── 4 · PHANTOM RISK (FIN-011 / FIN-012) ─────────────────────────────────────
{
  console.log("\n4 · stop:null → risk skipped, never the position's full value");
  // entry 100 × 10 shares = $1000 of position value against $2500 capital.
  // Pre-fix, |100 - null| × 10 = 1000 → a 40% "risk" that floors the score.
  const withPhantom = [
    mk(1, "Breakout", 100, 99, 105), mk(2, "Breakout", 100, 99, 105),
    mk(3, "Breakout", 100, null, 105),
  ];
  const onlyReal = [
    mk(1, "Breakout", 100, 99, 105), mk(2, "Breakout", 100, 99, 105),
  ];
  const a = calculateGrowthScore(withPhantom).sub.riskManagement;
  const b = calculateGrowthScore(onlyReal).sub.riskManagement;
  eq("stop:null trade is skipped, not priced at position value", a, b);
  check("score is not floored by a phantom risk", a > 0);

  // FIN-012 — the risk card must not compute |entry - stop| without a guard.
  const app = readFileSync(new URL("../SwingEdge_App.jsx", import.meta.url), "utf8");
  const riskCard = app.slice(app.indexOf("══ RISK DASHBOARD ══"), app.indexOf("══ RISK DASHBOARD ══") + 1200);
  check("risk card guards stop == null before sizing risk",
    /stop\s*==\s*null|stop\s*!=\s*null/.test(riskCard));
}

// ── 5 · MONTHLY REPORT (FIN-008) ─────────────────────────────────────────────
{
  console.log("\n5 · MonthlyReport group avgR is real, not laundered NaN → 0");
  // Six identical +1.4R trades: entry 100, stop 90 (risk $100), exit 114 (P&L $140).
  const R14 = [1, 2, 3, 4, 5, 6].map(i => mk(i, "Breakout", 100, 90, 114));
  const rep = generateMonthlyReport(R14, 0, 2026, calcTradeMetrics);
  check("report has enough data", rep.hasEnoughData === true);
  eq("summary.avgR", rep.summary.avgR, 1.4);
  eq("patterns.bestSetup.avgR (was hardcoded 0.00 by the e.rMultiple typo)",
    rep.patterns.bestSetup.avgR, 1.4);
  eq("patterns.bestSetup.rSampleSize", rep.patterns.bestSetup.rSampleSize, 6);
  check("no group avgR is NaN",
    [rep.patterns.bestSetup, rep.patterns.worstSetup]
      .every(g => g == null || g.avgR === null || Number.isFinite(g.avgR)));

  // A group with no measurable R reports null + n=0, not a fabricated 0.00.
  const noStops = [1, 2, 3, 4, 5, 6].map(i => mk(i, "Breakout", 100, null, 114));
  const rep2 = generateMonthlyReport(noStops, 0, 2026, calcTradeMetrics);
  eq("group avgR with no measurable R", rep2.patterns.bestSetup.avgR, null);
  eq("group rSampleSize with no measurable R", rep2.patterns.bestSetup.rSampleSize, 0);
  eq("summary.avgR with no measurable R", rep2.summary.avgR, null);
  check("grade is still finite when R is unmeasurable", Number.isFinite(rep2.gradeScore));
}

// ── 6 · PDF EXPORT (FIN-009) ─────────────────────────────────────────────────
{
  console.log("\n6 · export shows — for an unmeasurable R, never +0.00R");
  eq("fmtR(null)", fmtR(null), "—");
  eq("fmtR(undefined)", fmtR(undefined), "—");
  eq("fmtR(NaN)", fmtR(NaN), "—");
  eq("fmtR(0) is still a real zero", fmtR(0), "+0.00R");

  const app = readFileSync(new URL("../SwingEdge_App.jsx", import.meta.url), "utf8");
  check("PDF export no longer substitutes 0 for a null rMultiple",
    !/rMultiple\s*!=\s*null\s*\?\s*m\.rMultiple\s*:\s*0/.test(app));
  check("no `.toFixed(2)}R` on a possibly-null R in the export path",
    !/\$\{r\s*>=\s*0\s*\?\s*"\+"\s*:\s*""\}\$\{r\.toFixed\(2\)\}R/.test(app));
}

// ── 7 · NaN / Infinity SWEEP ─────────────────────────────────────────────────
{
  console.log("\n7 · no R function returns NaN or Infinity on any edge portfolio");
  // profitFactor is deliberately excluded: it returns Infinity when there are
  // no losses (FIN-026), which belongs to audit group 7 and is out of scope here.
  const PORTFOLIOS = {
    empty: [],
    single: [mk(1, "Breakout", 100, 90, 120)],
    allNoStop: [1, 2, 3].map(i => mk(i, "Breakout", 100, null, 120)),
    allBreakEven: [1, 2, 3].map(i => mk(i, "Breakout", 100, 90, 100)),
    noLosses: [1, 2, 3].map(i => mk(i, "Breakout", 100, 90, 120)),
    stopEqualsEntry: [1, 2, 3].map(i => mk(i, "Breakout", 100, 100, 120)),
  };
  const FNS = { avgR, expectedValueR, sharpeR, kellyFraction, rSampleSize };
  for (const [pname, trades] of Object.entries(PORTFOLIOS)) {
    const closed = getClosed(trades);
    for (const [fname, fn] of Object.entries(FNS)) {
      const v = fn(closed);
      check(`${fname}(${pname}) is a finite number or null → ${JSON.stringify(v)}`,
        v === null || Number.isFinite(v));
    }
    check(`rValues(${pname}) contains only finite numbers`,
      rValues(closed).every(Number.isFinite));
  }
}

// ── 8 · MAE / MFE (0 is a value, not a blank) ────────────────────────────────
{
  console.log("\n8 · MAE/MFE keep a real 0 and reject garbage");
  eq('numOrNull("0")', numOrNull("0"), 0);
  eq("numOrNull(0)", numOrNull(0), 0);
  eq('numOrNull("")', numOrNull(""), null);
  eq("numOrNull(null)", numOrNull(null), null);
  eq("numOrNull(undefined)", numOrNull(undefined), null);
  eq('numOrNull("abc")', numOrNull("abc"), null);
  eq('numOrNull("2.5")', numOrNull("2.5"), 2.5);
  eq('numOrNull("-1.25")', numOrNull("-1.25"), -1.25);
  eq("numOrNull(Infinity)", numOrNull(Infinity), null);

  const app = readFileSync(new URL("../SwingEdge_App.jsx", import.meta.url), "utf8");
  check("close form no longer uses `parseFloat(x) || null` for MAE/MFE",
    !/parseFloat\(closeForm\.max(Favorable|Adverse)\)\s*\|\|\s*null/.test(app));
}

// ── 9 · BREAK-EVEN IS NOT A LOSS (FIN-032) ───────────────────────────────────
{
  console.log("\n9 · BE sits in its own population; weights sum to 1");
  // 2 wins at +2R, 2 losses at -1R, 2 break-even.
  const WITH_BE = [
    mk(1, "Breakout", 100, 90, 120), mk(2, "Breakout", 100, 90, 120),
    mk(3, "Breakout", 100, 90, 90),  mk(4, "Breakout", 100, 90, 90),
    mk(5, "Breakout", 100, 90, 100), mk(6, "Breakout", 100, 90, 100),
  ];
  const closed = getClosed(WITH_BE);
  const w = expectancyWeights(closed);
  eq("win weight", w.win, 2 / 6);
  eq("loss weight", w.loss, 2 / 6);
  eq("be weight", w.be, 2 / 6);
  check("weights sum to exactly 1", Math.abs(w.win + w.loss + w.be - 1) < 1e-12);
  check("BE is not counted in the loss bucket", w.loss === 2 / 6);

  // Pre-fix, BE fell into `losses` (isWin is pnl > 0), dragging avgLoss toward 0
  // and the expectancy down. Correct value: (2/6)(+2) + (2/6)(-1) + (2/6)(0).
  const expected = (2 / 6) * 2 + (2 / 6) * -1 + (2 / 6) * 0;
  check(`expectancy = ${expected.toFixed(6)} (three populations)`,
    Math.abs(expectedValueR(closed) - expected) < 1e-12);
  const preFix = (2 / 6) * 2 + (1 - 2 / 6) * ((-1 + -1 + 0 + 0) / 4);
  check("expectancy is higher than the pre-fix BE-as-loss value",
    expectedValueR(closed) > preFix);
  check("kelly is finite with BE present", Number.isFinite(kellyFraction(closed)));
}

// ── 10 · SHARPE NEEDS A SAMPLE (FIN-034) ─────────────────────────────────────
{
  console.log("\n10 · sharpeR is null below the minimum sample, not 0");
  eq("one closed trade", sharpeR(getClosed([mk(1, "Breakout", 100, 90, 120)])), null);
  eq("empty portfolio", sharpeR([]), null);
  // Two identical R's → zero dispersion → still not measurable, still not 0.
  eq("zero dispersion", sharpeR(getClosed([
    mk(1, "Breakout", 100, 90, 120), mk(2, "Breakout", 100, 90, 120),
  ])), null);
  check("two distinct R's do produce a number", Number.isFinite(sharpeR(getClosed([
    mk(1, "Breakout", 100, 90, 120), mk(2, "Breakout", 100, 90, 90),
  ]))));
}

// ── 11 · A PORTFOLIO WITH NO MEASURABLE R (acceptance gate) ──────────────────
{
  console.log("\n11 · nothing measurable → null everywhere, never a fabricated 0R");
  const NONE = [1, 2, 3, 4, 5].map(i => mk(i, "Breakout", 100, null, 120));
  const closed = getClosed(NONE);
  eq("closed count (P&L is still real)", closed.length, 5);
  eq("avgR", avgR(closed), null);
  eq("rSampleSize", rSampleSize(closed), 0);
  eq("rStats.avg", rStats(closed).avg, null);
  eq("expectedValueR", expectedValueR(closed), null);
  eq("sharpeR", sharpeR(closed), null);
  eq("kellyFraction", kellyFraction(closed), null);
  eq("the screen renders — and not as 0R", fmtR(avgR(closed)), "—");
  check("rankSetupEdges reports the setup with a null avgR, not 0",
    rankSetupEdges(NONE).every(r => r.avgR === null && r.rSampleSize === 0));
}

// ── SUMMARY ──────────────────────────────────────────────────────────────────
console.log("");
if (failures) {
  console.error(`❌ r-contract: ${failures} assertion(s) failed.`);
  process.exit(1);
}
console.log("✅ r-contract: all assertions passed — null is not 0, and every R metric reports its sample size.");
