import { isFollowedPlan, isOffPlan, qstars, holdDays, realizedAt, realizedDayKey } from "../utils.js";
import { deriveInstrumentCurrency, isAggregatable, isMixedCurrency } from "./instrumentCurrency.js";
import {
  edgeScore, wilsonLowerBound,
  getClosed, outcomeRates, grossPnl, profitFactorFromPnls, toPct,
} from "../intelligence/utils/statisticalModels.js";

// P&L accessor for the already-enriched metric objects this module works with.
// Passed into the shared statisticalModels primitives so they reuse the P&L
// computed once at the top of computeTradingStats instead of re-deriving it —
// same three-outcome rule, one arithmetic path, no second pass over
// calcTradeMetrics.
const pnlOfMetric = (m) => m.pnl || 0;

// R over an array of enriched metrics ({ ...trade, pnl, rMultiple }). `avg` is
// null when no item in the set has a measurable R — a trade without a stop did
// not do 0R, and letting it sit in the denominator drags every average toward
// zero in proportion to how many stops are missing.
function rSumStats(items) {
  let sum = 0, n = 0;
  for (const m of items) {
    if (Number.isFinite(m.rMultiple)) { sum += m.rMultiple; n += 1; }
  }
  return { total: n ? sum : null, avg: n ? sum / n : null, n };
}

/**
 * computeTradingStats — Master Stats Hub (pure)
 *
 * Single source of truth for all trading statistics.
 * Pass either the full trades array (for global stats) or a filtered subset
 * (for journal/filter-aware stats). Pure given (trades, capital,
 * calcTradeMetrics) — EXCEPT for lastWeekStats/lastMonthStats, which read the
 * wall clock (Date.now()) and therefore are not a pure function of the inputs
 * alone.
 *
 * @param {Array}    trades            Array of trade objects.
 * @param {number}   capital           Starting capital (used for equity / drawdown / return %).
 * @param {Function} calcTradeMetrics  (trade) => { pnl, rMultiple }.
 * @returns {Object} Comprehensive stats object (see EMPTY_STATS for shape).
 */
export function computeTradingStats(trades, capital, calcTradeMetrics) {
  // "Closed" has ONE definition, and it lives in statisticalModels.getClosed:
  // status CLOSED *and* an exit price. A row marked closed with no exit has no
  // realized P&L to contribute — counting it inflates the denominator of every
  // rate on the dashboard while adding nothing to the numerator (T3 · decision 1).
  const closed = getClosed(trades);
  const open   = (trades || []).filter(t => t.status === "OPEN");

  if (closed.length === 0) return EMPTY_STATS(capital);

  // ─── Base metrics ──────────────────────────────────────────
  const metrics = closed.map(t => ({ ...t, ...calcTradeMetrics(t) }));

  // Three buckets, not two — break-even is its own outcome (T3 · decision 2).
  const rates   = outcomeRates(metrics, pnlOfMetric);
  const winners = rates.wins;
  const losers  = rates.losses;
  const breakEvens = rates.be;

  const totalPnL = metrics.reduce((s, m) => s + (m.pnl || 0), 0);
  const { grossWin: totalWin, grossLoss: totalLoss } = grossPnl(metrics.map(pnlOfMetric));

  // A shekel and a dollar do not add up, and `totalPnL` above adds them anyway
  // because every figure downstream of it is one number. Rather than silently
  // producing a sum that means nothing, the split is published beside it and the
  // consumer is told when the set is mixed (§2 — no ratio without a denominator,
  // and no total without a unit).
  //
  // ⚠️ המפתח הוא מטבע ה**נייר** הנגזר, ⛔ לא `currencyOf` — זו הייתה קריאה של
  // התווית שמסלול הכתיבה חתם מהעדפת החשבון. יומן של 13 ניירות ת"א ועוד 2
  // אמריקאיים נשא 15 תוויות `USD`, ולכן `currencies.length === 1` והבאנר
  // דמם. שורה שמטבעה לא נמדד אינה תורמת לפילוח — היא נספרת כערבוב.
  //
  // 🔴 `B-142` — ומונה לצדו. סכום מפולח בלי לומר **על כמה עסקאות** הוא נשען הוא
  // מנה בלי מכנה בתחפושת (§2): "₪1,200 · $80" ⛔ אינו מבדיל בין 13 שורות ת"א
  // לשורה אחת. המונה נגזר מאותה לולאה בדיוק ו⛔ אינו מעבר שני.
  const derivations = metrics.map((m) => deriveInstrumentCurrency(m));
  const pnlByCurrency = {};
  const tradesByCurrency = {};
  metrics.forEach((m, i) => {
    if (!isAggregatable(derivations[i])) return;
    const c = derivations[i].code;
    pnlByCurrency[c] = (pnlByCurrency[c] || 0) + (m.pnl || 0);
    tradesByCurrency[c] = (tradesByCurrency[c] || 0) + 1;
  });
  const currencies = Object.keys(pnlByCurrency).sort();
  const mixedCurrency = isMixedCurrency(derivations);

  // SCALE BOUNDARY — the one and only place this module leaves the 0..1
  // convention of statisticalModels and enters the 0..100 convention its UI
  // consumers read (T3 · decision 3). Every rate below crosses via toPct, which
  // carries a null through instead of collapsing it to 0 (A5).
  //
  // These three specifically can never BE null: `closed.length === 0` returned
  // EMPTY_STATS above, so `rates.n >= 1` here. They go through the helper
  // anyway, because a scale crossing that is safe today and unsafe after the
  // next edit is the kind of thing nobody re-audits.
  const winRate  = toPct(rates.winRate);
  const lossRate = toPct(rates.lossRate);
  const beRate   = toPct(rates.beRate);

  const profitFactor = profitFactorFromPnls(metrics.map(pnlOfMetric));
  const avgWin       = winners.length ? totalWin / winners.length : 0;
  const avgLoss      = losers.length  ? totalLoss / losers.length : 0;
  const { avg: avgR, n: rSampleSize } = rSumStats(metrics);
  const bestWin      = winners.length ? Math.max(...winners.map(m => m.pnl)) : 0;
  const worstLoss    = losers.length  ? Math.min(...losers.map(m => m.pnl)) : 0;

  // ─── Equity curve + Max Drawdown ───────────────────────────
  // Ordered by close, not entry: drawdown is a statement about the sequence the
  // account actually lived through, so a January entry closed in June belongs
  // after everything closed in between.
  const sorted = [...metrics].sort((a, b) => (realizedAt(a) ?? 0) - (realizedAt(b) ?? 0));
  let equity = capital;
  let peak = capital;
  let maxDDPct = 0;       // % drawdown from peak equity
  let pnlPeak = 0;
  let pnlEquity = 0;
  let maxDDDollars = 0;   // $ drawdown from PnL peak (legacy compat)
  const equityCurve = sorted.map((m, i) => {
    const pnl = m.pnl || 0;
    equity   += pnl;
    pnlEquity += pnl;
    if (equity > peak) peak = equity;
    if (pnlEquity > pnlPeak) pnlPeak = pnlEquity;
    const ddPct  = peak > 0 ? ((peak - equity) / peak) * 100 : 0;
    const ddDoll = pnlPeak - pnlEquity;
    if (ddPct  > maxDDPct)     maxDDPct = ddPct;
    if (ddDoll > maxDDDollars) maxDDDollars = ddDoll;
    return { index: i + 1, date: realizedDayKey(m), equity, pnl, drawdown: ddPct };
  });
  const currentDrawdown = equityCurve.length
    ? equityCurve[equityCurve.length - 1].drawdown
    : 0;

  // ─── Streaks ───────────────────────────────────────────────
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let tw = 0;
  let tl = 0;
  let currentStreak = 0;
  // Chronological run-length list — [{ type, length }] — emitted from the SAME
  // pass that computes the streak maxima, so the run history and the headline
  // "best streak" can never disagree. Break-even trades are transparent here:
  // they neither extend nor break a run, matching the maxima above.
  const streakRuns = [];
  let runType = null, runLen = 0;
  sorted.forEach((m, i) => {
    const p = m.pnl || 0;
    if (p > 0) {
      tw++; tl = 0;
      if (tw > maxWinStreak) maxWinStreak = tw;
    } else if (p < 0) {
      tl++; tw = 0;
      if (tl > maxLossStreak) maxLossStreak = tl;
    }
    if (p !== 0) {
      const nt = p > 0 ? "win" : "loss";
      if (runType === null || runType === nt) { runType = nt; runLen++; }
      else { streakRuns.push({ type: runType, length: runLen }); runType = nt; runLen = 1; }
    }
    if (i === sorted.length - 1) currentStreak = tw > 0 ? tw : -tl;
  });
  if (runLen > 0 && runType) streakRuns.push({ type: runType, length: runLen });

  // ─── Behavioral ────────────────────────────────────────────
  const planYes = metrics.filter(m => isFollowedPlan(m.followedPlan));
  const planNo  = metrics.filter(m => isOffPlan(m.followedPlan));
  // Same win-rate rule as everywhere else (BE in the denominator, not the
  // numerator). Either bucket can be legitimately empty in an active journal:
  // a trader who never deviated has no `planNo` population, and "0% win rate
  // when you ignored the plan" is then a verdict on trades that do not exist.
  // null | number — `planAdherence` below is the denominator's public form.
  const planFollowedWR = toPct(outcomeRates(planYes, pnlOfMetric).winRate);  // scale boundary
  const planIgnoredWR  = toPct(outcomeRates(planNo,  pnlOfMetric).winRate);  // scale boundary

  // ─── Time-based ────────────────────────────────────────────
  const now = Date.now();
  // Windowed on close, not entry: "last week's P&L" means P&L realized last
  // week. WeeklyReviewTab mirrors this predicate and must stay in step with it.
  const lastWeek  = metrics.filter(m => realizedAt(m) >= now - 7  * 86400000);
  const lastMonth = metrics.filter(m => realizedAt(m) >= now - 30 * 86400000);

  // ─── Breakdowns ────────────────────────────────────────────
  const bySetup        = groupAndAnalyze(metrics, "setup");
  const byEmotion      = groupAndAnalyze(metrics, "emotionAtEntry");
  const byMarket        = groupAndAnalyze(metrics, "marketCondition");
  const byEntryQuality = groupAndAnalyze(metrics, "entryQuality", m => { const q = qstars(m.entryQuality); return q ? `${q}★` : null; });
  const byDayOfWeek    = analyzeByDay(metrics);

  // ─── Edges ─────────────────────────────────────────────────
  const topEdges  = findEdges(metrics, "top");
  const antiEdges = findEdges(metrics, "anti");

  // ─── Hold time ─────────────────────────────────────────────
  const holdValues = metrics.map(m => holdDays(m)).filter(d => d != null);
  const avgHoldDays = holdValues.length
    ? holdValues.reduce((s, d) => s + d, 0) / holdValues.length
    : 0;
  const avgHoldHours = avgHoldDays * 24;

  return {
    // counts
    totalTrades: closed.length,
    total:       closed.length,           // alias (legacy journalStats.total)
    openTrades:  open.length,
    wins:        winners.length,
    losses:      losers.length,
    be:          breakEvens.length,

    // pnl
    totalPnL, totalWin, totalLoss,

    // currency — `totalPnL` is only meaningful when `currencies` holds one entry.
    pnlByCurrency, tradesByCurrency, currencies, mixedCurrency,

    // rates — all 0..100 (see SCALE BOUNDARY above).
    // winRate + lossRate + beRate === 100 exactly; `beRate` exists so that
    // identity holds instead of the BE slice silently going missing.
    winRate, lossRate, beRate, profitFactor,

    // averages
    avgWin, avgLoss, avgR, rSampleSize, bestWin, worstLoss,

    // equity — CLOSED baseline only (single source for realized equity).
    // Full Account Equity = currentEquity + live open P&L, assembled once at
    // the consumer (SwingEdge_App curEquity); open P&L needs live prices,
    // which are component state and must not enter this pure stats hub.
    //
    // ⚠️ **סכום בין-יחידות כשההמרה נכשלת** — `totalPnL` הוא `reduce` על כל
    // העסקאות ו⛔ אינו שואל באיזה מטבע כל איבר. הכותרת ⛔ **אינה צורכת אותו
    // יותר** (`B-142`, 15.08): `curEquity` מורכב מ-`equityBase + closedPnL +
    // openPnL`, ושתי הרגליים מדירות עסקה מסומנת. הערך כאן ⛔ **לא שונה** —
    // צרכניו הנותרים (`returnPct`, `menteeStats`, `monthStats`, `journalStats`)
    // אינם מדפיסים הון או תשואה. ⇒ **בבעלות `B-143`.**
    currentEquity: capital + totalPnL,
    capital,
    returnPct: capital ? (totalPnL / capital) * 100 : 0,
    equityCurve,

    // drawdown
    maxDrawdown: maxDDPct,                // %
    maxDD:       maxDDDollars,            // $ alias (legacy journalStats.maxDD)
    currentDrawdown,

    // streaks
    currentStreak,
    maxWinStreak,
    maxLossStreak,
    bestStreak: maxWinStreak,             // alias
    streakRuns,                           // [{ type: "win"|"loss", length }]

    // behavioral
    planFollowedWR,
    planIgnoredWR,
    planAdherence: closed.length ? (planYes.length / closed.length) * 100 : 0,

    // hold time
    avgHoldHours,
    avgHold: avgHoldDays,                 // alias (legacy journalStats.avgHold in days)

    // time-based
    lastWeekStats:  summarize(lastWeek),
    lastMonthStats: summarize(lastMonth),

    // breakdowns
    bySetup, byEmotion, byMarket, byEntryQuality, byDayOfWeek,

    // edges
    topEdges, antiEdges,

    // raw enriched metrics (closed trades with pnl/rMultiple already attached)
    closedMetrics: metrics,

    isEmpty: false,
  };
}

// ───────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────

// A journal with no closed trades. Every field below is decided by three tests
// applied in order (PLAN-B009.md §1 · §1.1), not by what reads nicely:
//
//   1. RANGE     — can the live path produce this value at all? `bestWin` is
//                  `pnl > 0` by definition, so `bestWin: 0` is not "unmeasured",
//                  it is a value the engine can never emit. Fails here ⇒ null.
//   2. IDENTITY  — is 0 the identity element of the aggregation over the empty
//                  set? Sums and counts: yes. Quotients and extrema: no.
//   3. COLLISION — does the live path produce 0 under some OTHER meaningful
//                  condition? `returnPct: 0` also means "you traded and netted
//                  zero", so the reader cannot tell the two apart.
//
// Pass all three and 0 is a MEASUREMENT that stays. `avgR` has returned null
// for exactly this reason since A5; the rest of the object now says the same
// thing in the same way.
function EMPTY_STATS(capital) {
  return {
    // counts and sums — identity 0 over the empty set, so these are measured
    totalTrades: 0, total: 0, openTrades: 0, wins: 0, losses: 0, be: 0,
    totalPnL: 0, totalWin: 0, totalLoss: 0,
    pnlByCurrency: {}, tradesByCurrency: {}, currencies: [], mixedCurrency: false,
    rSampleSize: 0,
    // quotients — no identity over an empty set
    winRate: null, lossRate: null, beRate: null, profitFactor: null,
    avgWin: null, avgLoss: null, avgR: null,
    planFollowedWR: null, planIgnoredWR: null, planAdherence: null,
    avgHoldHours: null, avgHold: null,
    // extrema — and out of range besides: a win is pnl>0, a loss is pnl<0
    bestWin: null, worstLoss: null,
    // returnPct fails the COLLISION test, not the identity one: 0% is also
    // what an active trader who netted exactly zero sees. Stated plainly
    // rather than filed under the same reason as the quotients above.
    currentEquity: capital, capital, returnPct: null,
    // drawdown is seeded at 0, [0,100] contains 0, and "never declined from
    // peak" is equally true of a journal with nothing in it — all three tests
    // pass, so this 0 is a measurement and stays one.
    equityCurve: [], maxDrawdown: 0, maxDD: 0, currentDrawdown: 0,
    currentStreak: 0, maxWinStreak: 0, maxLossStreak: 0, bestStreak: 0, streakRuns: [],
    // B-065 — same key set as summarize(), which emits four. Three keys here
    // meant a consumer read `.beRate` as undefined on an empty journal and as
    // a number on a full one, and neither is the null that was intended.
    lastWeekStats:  { count: 0, pnl: 0, winRate: null, beRate: null },
    lastMonthStats: { count: 0, pnl: 0, winRate: null, beRate: null },
    bySetup: [], byEmotion: [], byMarket: [], byEntryQuality: [], byDayOfWeek: [],
    topEdges: [], antiEdges: [],
    closedMetrics: [],
    isEmpty: true,
  };
}

function groupAndAnalyze(metrics, field, keyFn) {
  const groups = {};
  metrics.forEach(m => {
    const raw = keyFn ? keyFn(m) : m[field];
    const key = (raw ?? "").toString().trim() || "Unknown";
    if (!groups[key]) groups[key] = [];
    groups[key].push(m);
  });
  return Object.entries(groups).map(([name, items]) => {
    // Same three-outcome rule and same profit-factor path as the top-level
    // figures — a group's win rate must mean what the headline win rate means.
    const rates    = outcomeRates(items, pnlOfMetric);
    const totalPnL = items.reduce((s, m) => s + (m.pnl || 0), 0);
    const r        = rSumStats(items);
    return {
      name,
      count: items.length,
      wins:   rates.wins.length,
      losses: rates.losses.length,
      be:     rates.be.length,
      winRate:  toPct(rates.winRate),   // scale boundary (see computeTradingStats)
      lossRate: toPct(rates.lossRate),
      beRate:   toPct(rates.beRate),
      totalPnL,
      avgPnL: totalPnL / items.length,
      totalR: r.total,
      avgR: r.avg,
      rSampleSize: r.n,
      // Infinity is possible here exactly as it is at the top level. Any
      // consumer that renders this must guard with Number.isFinite — see the
      // journal profit-factor tile in SwingEdge_App.jsx.
      profitFactor: profitFactorFromPnls(items.map(pnlOfMetric)),
    };
  }).sort((a, b) => b.totalPnL - a.totalPnL);
}

function analyzeByDay(metrics) {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const buckets = days.map(d => ({ name: d, items: [] }));
  metrics.forEach(m => {
    if (!m.date) return;
    // Parse at local noon to match the rest of the app and avoid a UTC-midnight
    // off-by-one weekday in negative-UTC timezones.
    const idx = new Date(m.date + "T12:00:00").getDay();
    if (idx >= 0 && idx <= 6) buckets[idx].items.push(m);
  });
  return buckets
    .filter(d => d.items.length > 0)
    .map(d => {
      const rates = outcomeRates(d.items, pnlOfMetric);
      return {
        name: d.name,
        count: d.items.length,
        winRate: toPct(rates.winRate),   // scale boundary
        beRate:  toPct(rates.beRate),
        totalPnL: d.items.reduce((s, m) => s + (m.pnl || 0), 0),
      };
    });
}

// The rolling-window summary. `count` and `pnl` are always measured — an empty
// window really did produce zero trades and zero P&L. The RATES are not: a week
// in which you placed no trades has no win rate, and reporting 0 tells the
// trader they lost every trade in a week they sat out (A5 · §2).
function summarize(metrics) {
  if (!metrics.length) return { count: 0, pnl: 0, winRate: null, beRate: null };
  const rates = outcomeRates(metrics, pnlOfMetric);
  return {
    count: metrics.length,
    pnl: metrics.reduce((s, m) => s + (m.pnl || 0), 0),
    winRate: toPct(rates.winRate),   // scale boundary
    beRate:  toPct(rates.beRate),
  };
}

// Best/worst setup×emotion combos, ranked by the canonical edge definition
// (Wilson × expectancy signal) — the same formula EdgeFinder uses, so the
// Dashboard's Top-Edges list and the AI EdgeCard never disagree on what an
// "edge" is. Anti-edges mirror EdgeFinder: ranked by antiScore and filtered to
// genuinely weak combos (win rate < 50% or negative avg R), rather than a hard
// win-rate cutoff that lets small-sample noise masquerade as an edge.
function findEdges(metrics, type) {
  const combos = {};
  metrics.forEach(m => {
    const key = `${m.setup || "?"} + ${m.emotionAtEntry || "?"}`;
    if (!combos[key]) combos[key] = [];
    combos[key].push(m);
  });
  const minCount = type === "top" ? 3 : 2;
  const scored = Object.entries(combos)
    .filter(([, items]) => items.length >= minCount)
    .map(([name, items]) => {
      const rates = outcomeRates(items, pnlOfMetric);
      const wins = rates.wins.length;
      const n = items.length;
      const { avg: avgR, n: rSampleSize } = rSumStats(items);
      // `?? 0` in the two ranking scores is a declared neutral, not a
      // measurement: a combo with no measurable R ranks on Wilson alone.
      const rScore = avgR ?? 0;
      return {
        name,
        setup: items[0].setup || "?",
        emotion: items[0].emotionAtEntry || "?",
        count: n,
        winRate: toPct(rates.winRate),   // scale boundary
        beRate:  toPct(rates.beRate),
        totalPnL: items.reduce((s, m) => s + (m.pnl || 0), 0),
        avgR,
        rSampleSize,
        score: edgeScore(wins, n, rScore),
        antiScore: (1 - wilsonLowerBound(wins, n)) * (1 + Math.max(0, -rScore)),
      };
    });
  if (type === "top") {
    return scored
      .sort((a, b) => b.score - a.score || (b.avgR ?? 0) - (a.avgR ?? 0))
      .slice(0, 5);
  }
  return scored
    .filter(c => c.winRate < 50 || (c.avgR != null && c.avgR < 0))
    .sort((a, b) => b.antiScore - a.antiScore || (a.avgR ?? 0) - (b.avgR ?? 0))
    .slice(0, 5);
}
