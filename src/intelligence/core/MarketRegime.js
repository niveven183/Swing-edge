// ─── MARKET REGIME DETECTOR ──────────────────────────────────────────────────
// Classifies the current market state. The app does not yet consume a live
// S&P500 / VIX feed, so this module accepts an optional market snapshot and
// falls back to inferring regime from recent trader-tagged market conditions.

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
export const detectMarketRegime = (trades = [], snapshot = null) => {
  const fromSnap = classifyFromSnapshot(snapshot);
  const regime = fromSnap !== REGIMES.UNKNOWN ? fromSnap : classifyFromTrades(trades);
  const advice = ADVICE[regime] || ADVICE[REGIMES.UNKNOWN];
  return {
    regime,
    source: fromSnap !== REGIMES.UNKNOWN ? "snapshot" : "trades",
    advice,
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
