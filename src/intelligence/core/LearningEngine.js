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
// Accuracy of GO / CAUTION / SKIP predictions.
export const calibrationReport = () => {
  const state = readState();
  const cal = state.calibration;
  if (!cal.length) return { n: 0, accuracy: 0, byVerdict: {} };

  const byVerdict = {};
  for (const e of cal) {
    const v = e.verdict || "UNKNOWN";
    if (!byVerdict[v]) byVerdict[v] = { n: 0, correct: 0, avgR: 0 };
    byVerdict[v].n += 1;
    // A GO is "correct" when the trade won; a SKIP is "correct" when it lost.
    const correct =
      (v === "GO"      && e.outcome ===  1) ||
      (v === "SKIP"    && e.outcome === -1) ||
      (v === "CAUTION" && true);
    if (correct) byVerdict[v].correct += 1;
    byVerdict[v].avgR += e.r || 0;
  }
  for (const v of Object.keys(byVerdict)) {
    byVerdict[v].avgR /= byVerdict[v].n;
    byVerdict[v].accuracy = byVerdict[v].correct / byVerdict[v].n;
  }

  const totalCorrect = Object.values(byVerdict).reduce((s, x) => s + x.correct, 0);
  return {
    n: cal.length,
    accuracy: totalCorrect / cal.length,
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
