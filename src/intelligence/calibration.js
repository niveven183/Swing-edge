// ─── ENGINE CALIBRATION READER ───────────────────────────────────────────────
// Thin, additive reader over ./calibration.json. The Analyst agent
// (scripts/analyst.mjs) proposes values into that file via PR; the engine consumes
// them here with SAFE FALLBACKS so an empty or missing file changes nothing.
//
// CONTRACT: every consumer passes its own current hardcoded value as the
// fallback. If any consumer would behave differently when calibration.json is
// `{}`, that is a bug. The Analyst's write surface is ONLY the two tables read
// below: { emotionWeights, regimeSizing }. It never writes engine logic.

import calibration from "./calibration.json" with { type: "json" };

const table = (name) =>
  (calibration && typeof calibration === "object" && calibration[name]) || {};

// DecisionCoach emotionalCheck — weight applied per `emotionAtEntry`.
export const getEmotionWeight = (emotion, fallback) => {
  const v = table("emotionWeights")[emotion];
  return typeof v === "number" ? v : fallback;
};

// MarketRegime ADVICE — position-size multiplier per regime.
export const getRegimeSizing = (regime, fallback) => {
  const v = table("regimeSizing")[regime];
  return typeof v === "number" ? v : fallback;
};
