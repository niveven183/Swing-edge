// ─── MARKET REGIME DETECTOR ──────────────────────────────────────────────────
// Classifies the current market state from real price action. The primary path
// reads the dashboard's 30-day market overview (SPY/QQQ closes + the 14
// sector/theme ETFs) — no VIX/ATR feed required. It falls back to a legacy
// snapshot, then to inferring regime from recent trader-tagged market conditions
// (last resort for cold-start / offline). Output is always one of the six load-
// bearing REGIMES enums so every downstream consumer stays back-compatible.

import { getClosed, groupBy } from "../utils/statisticalModels.js";

export const REGIMES = {
  BULL_TREND:      "BULL_TREND",
  BEAR_TREND:      "BEAR_TREND",
  CHOPPY:          "CHOPPY",
  HIGH_VOLATILITY: "HIGH_VOLATILITY",
  LOW_VOLATILITY:  "LOW_VOLATILITY",
  UNKNOWN:         "UNKNOWN",
};

// Snapshot contract (all optional — tolerant):
//   { sp500Change5d: number, sp500Change20d: number, vix: number,
//     atrPct: number, breadth: number (-100..100) }
const classifyFromSnapshot = (snap) => {
  if (!snap) return REGIMES.UNKNOWN;
  const { sp500Change5d, sp500Change20d, vix, atrPct } = snap;

  if (typeof vix === "number") {
    if (vix >= 28) return REGIMES.HIGH_VOLATILITY;
    if (vix <= 13 && typeof atrPct === "number" && atrPct < 1) return REGIMES.LOW_VOLATILITY;
  }

  if (typeof sp500Change20d === "number") {
    if (sp500Change20d > 2 && (sp500Change5d ?? 0) >= 0) return REGIMES.BULL_TREND;
    if (sp500Change20d < -2 && (sp500Change5d ?? 0) <= 0) return REGIMES.BEAR_TREND;
    if (Math.abs(sp500Change20d) <= 1.5) return REGIMES.CHOPPY;
  }
  return REGIMES.UNKNOWN;
};

// Fall back: use the user's last ~15 tagged market conditions.
const classifyFromTrades = (trades, lookback = 15) => {
  const closed = getClosed(trades).slice(-lookback);
  if (!closed.length) return REGIMES.UNKNOWN;
  const groups = groupBy(closed, t => t.marketCondition || "Unknown");
  const [topCondition] = Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  if (!topCondition) return REGIMES.UNKNOWN;

  switch (topCondition[0]) {
    case "Trending Up":   return REGIMES.BULL_TREND;
    case "Trending Down": return REGIMES.BEAR_TREND;
    case "Sideways":      return REGIMES.CHOPPY;
    case "Volatile":      return REGIMES.HIGH_VOLATILITY;
    default:              return REGIMES.UNKNOWN;
  }
};

// ─── LIVE MARKET-DATA CLASSIFIER ─────────────────────────────────────────────
// Consumes the dashboard's 30-day market overview and classifies the tape from
// price action alone. Thresholds are textbook-defensible and tunable here.
const REALIZED_VOL = { LOW: 11, HIGH: 20 }; // annualized %
const TREND_PCT    = { UP: 2, DOWN: -2 };   // SPY window % change
const BREADTH_PCT  = { UP: 60, DOWN: 40 };  // % of sector/theme ETFs positive
const MA_PERIOD    = 20;                     // sessions (1M history ≈ 23 ✓; 50 infeasible)

const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const pctChange = (a, b) => (a > 0 ? (b / a - 1) * 100 : null);

// Simple moving average of the last `period` closes, or null if insufficient.
const sma = (closes, period) =>
  Array.isArray(closes) && closes.length >= period ? mean(closes.slice(-period)) : null;

// Annualized realized volatility (%) from daily log returns.
const realizedVol = (closes) => {
  if (!Array.isArray(closes) || closes.length < 6) return null;
  const rets = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > 0 && closes[i - 1] > 0) rets.push(Math.log(closes[i] / closes[i - 1]));
  }
  if (rets.length < 5) return null;
  const m = mean(rets);
  const variance = mean(rets.map((r) => (r - m) ** 2));
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
};

// Higher-highs/higher-lows structure: split the window and compare extremes.
const trendStructure = (closes) => {
  if (!Array.isArray(closes) || closes.length < 8) return null;
  const mid = Math.floor(closes.length / 2);
  const older = closes.slice(0, mid);
  const recent = closes.slice(mid);
  const hi = (a) => Math.max(...a);
  const lo = (a) => Math.min(...a);
  if (hi(recent) > hi(older) && lo(recent) > lo(older)) return "up";   // HH + HL
  if (hi(recent) < hi(older) && lo(recent) < lo(older)) return "down"; // LH + LL
  return "flat";
};

const findSym = (list, sym) =>
  (list || []).find((e) => e && String(e.sym || "").toUpperCase() === sym) || null;

const tallyBias = (votes) => {
  const bull = votes.filter((v) => v === "bull").length;
  const bear = votes.filter((v) => v === "bear").length;
  if (bull >= 2 && bear === 0) return "bull";
  if (bear >= 2 && bull === 0) return "bear";
  return "range";
};

// Overview shape: { indices:[{sym,weekChangePct,closes}…], sectorsThemes:[…14…] }.
// Returns { regime, trendBias, volatility, confidence, signals } or null when
// there isn't enough data to say anything (caller then falls back).
export const classifyFromMarketData = (overview) => {
  if (!overview || typeof overview !== "object") return null;
  const spy = findSym(overview.indices, "SPY");
  const qqq = findSym(overview.indices, "QQQ");
  const etfs = Array.isArray(overview.sectorsThemes) ? overview.sectorsThemes : [];

  const spyCloses = Array.isArray(spy?.closes) ? spy.closes : [];
  const price = spyCloses.length ? spyCloses[spyCloses.length - 1] : null;
  const ma20 = sma(spyCloses, MA_PERIOD);
  const chgWindow = typeof spy?.weekChangePct === "number" ? spy.weekChangePct : null;
  const vol = realizedVol(spyCloses);
  const structure = trendStructure(spyCloses);
  const qqqCloses = Array.isArray(qqq?.closes) ? qqq.closes : [];
  const qqqMa20 = sma(qqqCloses, MA_PERIOD);
  const qqqPrice = qqqCloses.length ? qqqCloses[qqqCloses.length - 1] : null;

  const breadthPct = etfs.length
    ? (etfs.filter((e) => typeof e.weekChangePct === "number" && e.weekChangePct > 0).length / etfs.length) * 100
    : null;

  const avail = {
    ma:        ma20 != null && price != null,
    trend:     chgWindow != null,
    breadth:   breadthPct != null,
    slope:     spyCloses.length >= 6,
    qqq:       qqqMa20 != null && qqqPrice != null,
    structure: structure != null,
    vol:       vol != null,
  };
  // Need at least one directional criterion to classify at all.
  if (!avail.ma && !avail.trend && !avail.breadth) return null;

  // Directional votes — primary criteria: price-vs-MA, window %, breadth.
  const primary = [];
  if (avail.ma)      primary.push(price > ma20 ? "bull" : "bear");
  if (avail.trend)   primary.push(chgWindow > TREND_PCT.UP ? "bull" : chgWindow < TREND_PCT.DOWN ? "bear" : "neutral");
  if (avail.breadth) primary.push(breadthPct >= BREADTH_PCT.UP ? "bull" : breadthPct <= BREADTH_PCT.DOWN ? "bear" : "neutral");
  const primaryVotes = primary.filter((v) => v !== "neutral");
  let bias = tallyBias(primaryVotes);

  // Confirms (5-session slope, QQQ, HH/HL structure) break a range tie only when
  // primary already leaned one way and confirms strongly agree.
  if (bias === "range") {
    const confirms = [];
    if (avail.slope)     { const c5 = pctChange(spyCloses[spyCloses.length - 6], price); confirms.push(c5 > 0 ? "bull" : c5 < 0 ? "bear" : "neutral"); }
    if (avail.qqq)       confirms.push(qqqPrice > qqqMa20 ? "bull" : "bear");
    if (avail.structure) confirms.push(structure === "up" ? "bull" : structure === "down" ? "bear" : "neutral");
    const cbull = confirms.filter((v) => v === "bull").length;
    const cbear = confirms.filter((v) => v === "bear").length;
    const leanBull = primaryVotes.includes("bull") && !primaryVotes.includes("bear");
    const leanBear = primaryVotes.includes("bear") && !primaryVotes.includes("bull");
    if (leanBull && cbull >= 2) bias = "bull";
    else if (leanBear && cbear >= 2) bias = "bear";
  }

  const volatility = vol == null ? null : vol > REALIZED_VOL.HIGH ? "high" : vol < REALIZED_VOL.LOW ? "low" : "normal";

  // Map onto the load-bearing 6-enum contract. Vol overrides direction: extreme
  // realized vol → HIGH_VOLATILITY (preserves the "cut size ~50%" advice).
  let regime;
  if (volatility === "high") regime = REGIMES.HIGH_VOLATILITY;
  else if (bias === "bull")  regime = REGIMES.BULL_TREND;
  else if (bias === "bear")  regime = REGIMES.BEAR_TREND;
  else if (volatility === "low") regime = REGIMES.LOW_VOLATILITY; // quiet, non-trending
  else regime = REGIMES.CHOPPY;

  const availCount = Object.values(avail).filter(Boolean).length;
  const conflict = primaryVotes.includes("bull") && primaryVotes.includes("bear");
  const confidence = availCount >= 5 && !conflict ? "high" : availCount >= 3 ? "medium" : "low";

  return {
    regime,
    trendBias: bias,
    volatility,
    confidence,
    signals: {
      price, ma20, spyChangePct: chgWindow, realizedVol: vol,
      breadthPct, breadthTotal: etfs.length, structure,
      qqqAboveMa: avail.qqq ? qqqPrice > qqqMa20 : null,
      available: avail,
    },
  };
};

// ─── RECOMMENDATIONS PER REGIME ──────────────────────────────────────────────
const ADVICE = {
  [REGIMES.BULL_TREND]: {
    en: "Bullish tape. Breakouts and pullbacks align — hunt strong RS leaders.",
    he: "שוק עולה. ברייקאאוטים ופולבקים עובדים — התמקד במובילי RS.",
    sizing: 1.0,
    preferredSetups: ["Breakout", "Pullback", "Support Bounce"],
    avoid: ["Breakdown", "Resistance Break"],
  },
  [REGIMES.BEAR_TREND]: {
    en: "Bearish tape. Counter-trend longs fail — focus on short setups or stand aside.",
    he: "שוק יורד. לונגים נגד המגמה נכשלים — התמקד בשורטים או שב בצד.",
    sizing: 0.6,
    preferredSetups: ["Breakdown", "Resistance Break"],
    avoid: ["Breakout"],
  },
  [REGIMES.CHOPPY]: {
    en: "Range-bound market. Avoid breakouts — fade extremes of the range.",
    he: "שוק צדדי. הימנע מברייקאאוטים — סחור בקצוות של הטווח.",
    sizing: 0.5,
    preferredSetups: ["Support Bounce", "Resistance Break"],
    avoid: ["Breakout", "Breakdown"],
  },
  [REGIMES.HIGH_VOLATILITY]: {
    en: "High volatility. Cut position size by ~50% and widen stops with care.",
    he: "תנודתיות גבוהה. הקטן גודל פוזיציה ב-50% והרחב סטופים בזהירות.",
    sizing: 0.5,
    preferredSetups: [],
    avoid: [],
  },
  [REGIMES.LOW_VOLATILITY]: {
    en: "Quiet tape. Expect smaller moves — tighten targets or stand aside for catalyst.",
    he: "שוק שקט. צפה לתנועות קטנות — קצר יעדים או חכה לקטליזטור.",
    sizing: 0.8,
    preferredSetups: ["Pullback"],
    avoid: [],
  },
  [REGIMES.UNKNOWN]: {
    en: "Regime unclear. Default sizing; tag market condition on new trades to improve detection.",
    he: "מצב שוק לא ברור. סחור בגודל רגיל; תייג מצב שוק בעסקאות חדשות כדי לשפר זיהוי.",
    sizing: 1.0,
    preferredSetups: [],
    avoid: [],
  },
};

// ─── PUBLIC API ──────────────────────────────────────────────────────────────
// Returns the regime plus the advice payload needed to render an indicator.
// Second arg accepts { marketData, snapshot }; a bare snapshot object is still
// tolerated for back-compat. Precedence: live market data → snapshot → trades.
export const detectMarketRegime = (trades = [], opts = {}) => {
  const isOpts = opts && typeof opts === "object" && ("marketData" in opts || "snapshot" in opts);
  const marketData = isOpts ? (opts.marketData ?? null) : null;
  const snapshot   = isOpts ? (opts.snapshot ?? null) : (opts || null);

  const fromMarket = classifyFromMarketData(marketData);
  if (fromMarket) {
    return {
      ...fromMarket,
      source: "market",
      advice: ADVICE[fromMarket.regime] || ADVICE[REGIMES.UNKNOWN],
      snapshot: snapshot || null,
      updatedAt: new Date().toISOString(),
    };
  }

  const fromSnap = classifyFromSnapshot(snapshot);
  const regime = fromSnap !== REGIMES.UNKNOWN ? fromSnap : classifyFromTrades(trades);
  return {
    regime,
    source: fromSnap !== REGIMES.UNKNOWN ? "snapshot" : "trades",
    advice: ADVICE[regime] || ADVICE[REGIMES.UNKNOWN],
    confidence: fromSnap !== REGIMES.UNKNOWN ? "medium" : (getClosed(trades).length ? "low" : "insufficient"),
    trendBias: null,
    volatility: null,
    snapshot: snapshot || null,
    updatedAt: new Date().toISOString(),
  };
};

// Convenience: is the candidate setup compatible with the current regime?
export const isSetupCompatible = (regimeReport, setup) => {
  if (!regimeReport || !setup) return true;
  const { avoid, preferredSetups } = regimeReport.advice;
  if (avoid && avoid.includes(setup)) return false;
  if (preferredSetups && preferredSetups.length && !preferredSetups.includes(setup)) {
    return "neutral"; // not forbidden, but not the sweet spot
  }
  return true;
};
