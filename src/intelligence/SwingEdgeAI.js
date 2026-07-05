// ─── SWING EDGE AI — ORCHESTRATOR ────────────────────────────────────────────
// Single public entry point for the intelligence layer. Holds a lightweight
// memo cache keyed on the trades array reference so repeated reads inside a
// render pass don't recompute the same DNA / Edge reports.

import { calculateTradeDNA } from "./core/TradeDNA.js";
import { findEdges }         from "./core/EdgeFinder.js";
import { detectMarketRegime }from "./core/MarketRegime.js";
import { checkTilt, engageCooldown, clearCooldown, acknowledgeWarning } from "./core/TiltProtection.js";
import { coachTrade, coachingToAnalyzerView } from "./core/DecisionCoach.js";
import {
  reinforceFromTrade, rebuildFromHistory, calibrationReport,
  capabilities, getWeights, resetLearning,
} from "./core/LearningEngine.js";
import { calculateGrowthScore, generateGrowthReport, dnaEvolutionSeries } from "./core/GrowthTracker.js";
import { detectEdgeDecay }                                                  from "./core/EdgeDecayAlert.js";
import { checkAntiEdgeLocks, isSetupLocked, manualUnlock, manualRelock }   from "./core/AntiEdgeLock.js";

// ─── MEMO CACHE ──────────────────────────────────────────────────────────────
// We cache per trades-array *identity* — the app keeps trades in a single
// useState so this keeps us honest between renders.
const CACHE = new WeakMap();

const memoize = (trades, key, factory) => {
  if (!trades || typeof trades !== "object") return factory();
  let entry = CACHE.get(trades);
  if (!entry) { entry = {}; CACHE.set(trades, entry); }
  if (!(key in entry)) entry[key] = factory();
  return entry[key];
};

// ─── PUBLIC API ──────────────────────────────────────────────────────────────
export const SwingEdgeAI = {
  // Core reports. All are pure functions of `trades` (+ optional snapshot).
  getDNA: (trades)                     => memoize(trades, "dna",    () => calculateTradeDNA(trades)),
  getEdges: (trades)                   => memoize(trades, "edges",  () => findEdges(trades)),
  // opts: { marketData, snapshot }. A bare snapshot object is tolerated. When
  // live marketData is present we compute fresh — the trades-identity memo can't
  // see market changes, and the dashboard already memoizes on the overview object.
  getRegime: (trades, opts = null) => {
    const isOpts = opts && typeof opts === "object" && ("marketData" in opts || "snapshot" in opts);
    const marketData = isOpts ? (opts.marketData ?? null) : null;
    const snapshot   = isOpts ? (opts.snapshot ?? null) : (opts || null);
    if (marketData) return detectMarketRegime(trades, { marketData, snapshot });
    return memoize(trades, snapshot ? "regime:snap" : "regime", () => detectMarketRegime(trades, { snapshot }));
  },
  getGrowth: (trades)                  => memoize(trades, "growth", () => calculateGrowthScore(trades, SwingEdgeAI.getEdges(trades))),
  getGrowthReport: (trades)            => memoize(trades, "growthReport", () => generateGrowthReport(trades, SwingEdgeAI.getEdges(trades))),
  getEvolution:  (trades, months = 6)  => memoize(trades, `evo:${months}`, () => dnaEvolutionSeries(trades, SwingEdgeAI.getEdges(trades), months)),

  // Real-time coaching on a candidate trade. Not memoised — the form state
  // changes on every keystroke.
  analyzeNewTrade: (form, trades = [], opts = null) => coachTrade({
    form,
    trades,
    dna:    SwingEdgeAI.getDNA(trades),
    edges:  SwingEdgeAI.getEdges(trades),
    regime: SwingEdgeAI.getRegime(trades, opts),
  }),

  // Standalone Analyzer — runs the SAME coach engine as analyzeNewTrade, then
  // adapts the rich output to the Analyzer panel's flat shape. Passing `trades`
  // means the Analyzer now benefits from personal history / DNA / regime too.
  analyzeStandalone: (input = {}, trades = [], lang = "en", opts = null) => {
    const coaching = coachTrade({
      form: {
        entry:  input.entry,
        stop:   input.stop,
        target: input.target,
        side:   input.side || "LONG",
        setup:           input.setup,
        marketCondition: input.marketCondition,
        emotionAtEntry:  input.emotionAtEntry,
        entryQuality:    input.entryQuality,
      },
      trades,
      dna:    SwingEdgeAI.getDNA(trades),
      edges:  SwingEdgeAI.getEdges(trades),
      regime: SwingEdgeAI.getRegime(trades, opts),
    });
    return coachingToAnalyzerView(coaching, {
      entry:   input.entry,
      stop:    input.stop,
      target:  input.target,
      shares:  input.shares,
      capital: input.capital,
      lang,
    });
  },

  // Edge health — decay detection and anti-edge locking.
  getEdgeDecay:    (trades)         => memoize(trades, "edgeDecay",    () => detectEdgeDecay(trades)),
  getAntiEdgeLocks:(trades)         => memoize(trades, "antiEdgeLocks",() => checkAntiEdgeLocks(trades)),
  isSetupLocked:   (setup, trades)  => isSetupLocked(setup, checkAntiEdgeLocks(trades)),
  unlockSetup:     (setup)          => manualUnlock(setup),
  relockSetup:     (setup)          => manualRelock(setup),

  // Higher-level insights, packaged for dashboard widgets.
  getInsights: (trades, timeframe = "all") => {
    const dna           = SwingEdgeAI.getDNA(trades);
    const edges         = SwingEdgeAI.getEdges(trades);
    const growth        = SwingEdgeAI.getGrowth(trades);
    const regime        = SwingEdgeAI.getRegime(trades);
    const tilt          = SwingEdgeAI.checkTilt(trades);
    const edgeDecay     = SwingEdgeAI.getEdgeDecay(trades);
    const antiEdgeLocks = SwingEdgeAI.getAntiEdgeLocks(trades);
    return { dna, edges, growth, regime, tilt, edgeDecay, antiEdgeLocks, timeframe };
  },

  // Tilt protection — expose both the read and the state transitions.
  checkTilt:          (trades)        => checkTilt(trades),
  engageCooldown:     (minutes = 30)  => engageCooldown(minutes),
  clearCooldown:      ()              => clearCooldown(),
  acknowledgeWarning: (key)           => acknowledgeWarning(key),

  // Learning loop — call after closing a trade.
  reinforceFromTrade: (trade)  => reinforceFromTrade(trade),
  rebuildLearning:    (trades) => rebuildFromHistory(trades),
  getCalibration:     ()       => calibrationReport(),
  getCapabilities:    (n)      => capabilities(n),
  getLearningWeights: ()       => getWeights(),
  resetLearning:      ()       => resetLearning(),

  // Coach-style convenience used by the dashboard.
  getCoaching: (trades) => {
    const tilt = SwingEdgeAI.checkTilt(trades);
    const dna  = SwingEdgeAI.getDNA(trades);
    return {
      tilt,
      dna,
      headline: tilt.level >= 2
        ? tilt.suggestion
        : dna.sampleSize >= 10
          ? {
              en: `Your edge is strongest on ${(dna.strengths.setups[0]?.key) || "your top setups"} — prefer those today.`,
              he: `ה-Edge שלך הכי חזק על ${(dna.strengths.setups[0]?.key) || "הסטאפים המובילים"} — התמקד בהם היום.`,
            }
          : {
              en: "Log a few more trades — the AI unlocks deeper insights after 10 closed trades.",
              he: "סגור עוד כמה עסקאות — ה-AI פותח תובנות עמוקות אחרי 10 עסקאות סגורות.",
            },
    };
  },
};

export default SwingEdgeAI;
