// ─── LEARNING ENGINE ─────────────────────────────────────────────────────────
// Closes the feedback loop. Each time a trade is closed we compare what the
// system predicted against what actually happened, and use that to reweight
// the recommendation channels (patterns, emotions, market regimes).
//
// The weights live in localStorage under a single key so the trader owns them.

import { getClosed, isWin, rOf } from "../utils/statisticalModels.js";

const LOCAL_KEY = "swingEdgeLearningWeights";

// Baseline weights — neutral at 1.0 each. They drift above/below as the model
// learns whether a channel's historical signal lined up with real outcomes.
const DEFAULT_WEIGHTS = {
  setup: 1.0,
  emotion: 1.0,
  market: 1.0,
  rr: 1.0,
  time: 1.0,
};

// Learning rate — small enough that one noisy trade can't swing the model.
const ETA = 0.03;
// Hard clamp so a pathological streak can't collapse a channel to zero.
const MIN = 0.3, MAX = 2.0;

// ─── PERSISTED STATE ─────────────────────────────────────────────────────────
const readState = () => {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(LOCAL_KEY) : null;
    if (!raw) return { weights: { ...DEFAULT_WEIGHTS }, calibration: [] };
    const parsed = JSON.parse(raw);
    return {
      weights: { ...DEFAULT_WEIGHTS, ...(parsed.weights || {}) },
      calibration: parsed.calibration || [],
    };
  } catch {
    return { weights: { ...DEFAULT_WEIGHTS }, calibration: [] };
  }
};

const writeState = (state) => {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
    }
  } catch { /* ignore */ }
};

export const getWeights = () => readState().weights;
export const resetLearning = () => writeState({ weights: { ...DEFAULT_WEIGHTS }, calibration: [] });

// ─── CORE UPDATE ─────────────────────────────────────────────────────────────
// Update weights after a single closed trade, given the prediction we made at
// entry time (stored on the trade as `_prediction`). The prediction shape:
//   { verdict:"GO"|"CAUTION"|"SKIP", confidence:0..100,
//     channels: { setup:number, emotion:number, market:number, rr:number, time:number } }
//
// The channel numbers are signed: +1 means "we thought this pushed toward GO",
// -1 means "we thought this pushed toward SKIP". We compare against the
// realised outcome (win=+1, loss=-1) and shift the weight accordingly.
export const reinforceFromTrade = (trade) => {
  if (!trade || trade.status !== "CLOSED" || trade.exit == null) return null;
  const pred = trade._prediction;
  if (!pred || !pred.channels) return null;

  const outcome = isWin(trade) ? 1 : -1;
  const state = readState();

  for (const [channel, signal] of Object.entries(pred.channels)) {
    if (typeof signal !== "number" || !Number.isFinite(signal)) continue;
    const agreement = Math.sign(signal) === outcome ? 1 : -1;
    const current = state.weights[channel] ?? 1.0;
    const next = current + ETA * agreement * Math.min(1, Math.abs(signal));
    state.weights[channel] = Math.min(MAX, Math.max(MIN, next));
  }

  // Calibration log: keep the last 100 (verdict, outcome) pairs to report
  // how accurate the coach has been.
  state.calibration = [
    ...state.calibration,
    { verdict: pred.verdict, conf: pred.confidence, outcome, r: rOf(trade), at: new Date().toISOString() },
  ].slice(-100);

  writeState(state);
  return state;
};

// Rebuild weights from scratch using the full closed-trade history.
// Used on first run / after "reset" / when history is imported.
export const rebuildFromHistory = (trades) => {
  writeState({ weights: { ...DEFAULT_WEIGHTS }, calibration: [] });
  for (const t of getClosed(trades)) reinforceFromTrade(t);
  return readState();
};

// ─── REPORTING ───────────────────────────────────────────────────────────────
// Accuracy of the engine's GO / SKIP calls.
//
// CAUTION is deliberately outside the accuracy figure (FIN-037). GO and SKIP
// are falsifiable predictions — a GO that lost was wrong. CAUTION is a hedge:
// no outcome can contradict it, so it has no truth value to average. The old
// code scored every CAUTION as correct, which pinned that bucket at 100% and
// dragged the headline number up with it — a book of nothing but CAUTION
// reported perfect accuracy.
//
// `accuracy` therefore reads over `scoredN`, not `n`, and `accuracyBasis`
// names the population out loud so no caller can print the ratio without its
// denominator (CLAUDE.md §2). CAUTION still reports `n`, `wins`/`losses` and
// `avgR` — what happened is knowable; whether it was "right" is not.
const SCORABLE = new Set(["GO", "SKIP"]);

export const calibrationReport = () => {
  const state = readState();
  const cal = state.calibration;
  if (!cal.length) {
    return { n: 0, scoredN: 0, accuracy: null, accuracyBasis: "GO/SKIP", byVerdict: {} };
  }

  const byVerdict = {};
  for (const e of cal) {
    const v = e.verdict || "UNKNOWN";
    if (!byVerdict[v]) {
      byVerdict[v] = {
        n: 0, correct: 0, wins: 0, losses: 0,
        rSum: 0, rSampleSize: 0, avgR: null, scorable: SCORABLE.has(v),
      };
    }
    const b = byVerdict[v];
    b.n += 1;
    if (e.outcome ===  1) b.wins   += 1;
    if (e.outcome === -1) b.losses += 1;
    // A GO is "correct" when the trade won; a SKIP is "correct" when it lost.
    if (b.scorable && ((v === "GO" && e.outcome === 1) || (v === "SKIP" && e.outcome === -1))) {
      b.correct += 1;
    }
    // The log stores `r: null` for trades where R was never measurable. Those
    // entries still count toward accuracy — the verdict was still right or
    // wrong — but they cannot enter an R average in either position.
    if (Number.isFinite(e.r)) {
      b.rSum += e.r;
      b.rSampleSize += 1;
    }
  }

  let scoredN = 0;
  let totalCorrect = 0;
  for (const v of Object.keys(byVerdict)) {
    const b = byVerdict[v];
    b.avgR = b.rSampleSize ? b.rSum / b.rSampleSize : null;
    if (b.scorable) {
      b.accuracy = b.correct / b.n;
      scoredN      += b.n;
      totalCorrect += b.correct;
    } else {
      // null, not 0: an unscorable verdict has no accuracy, and 0 would read
      // as "always wrong" exactly the way the old 1 read as "always right".
      b.accuracy = null;
      b.correct  = null;
    }
  }

  return {
    n: cal.length,
    scoredN,
    accuracy: scoredN ? totalCorrect / scoredN : null,
    accuracyBasis: "GO/SKIP",
    byVerdict,
  };
};

// Tier of intelligence the engine has unlocked, based on history depth.
export const capabilities = (sampleSize) => ({
  basicInsights:      sampleSize >= 10,
  patternRecognition: sampleSize >= 50,
  forecasting:        sampleSize >= 100,
  mlGrade:            sampleSize >= 500,
});
