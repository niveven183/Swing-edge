// ─── KNOWLEDGE GLUE ──────────────────────────────────────────────────────────
// Additive bridge between the app's vocabulary (regime enums, setup names) and the
// canonical knowledge reader (./knowledge.js). Holds the small translation maps and
// returns enrichment payloads or null. NEVER throws, NEVER alters a score: callers
// spread the result only when it's non-null, so absent knowledge = today's behavior.

import { getRegimeStage, getSetup } from "./knowledge.js";

// MarketRegime REGIMES enum → knowledge affinity/mapping vocabulary.
const REGIME_ENUM_TO_MAPPING = {
  BULL_TREND:      "Trending Up",
  BEAR_TREND:      "Trending Down",
  CHOPPY:          "Sideways",
  HIGH_VOLATILITY: "Volatile",
  LOW_VOLATILITY:  "Sideways",
  UNKNOWN:         null,
};

// Setup label → knowledge setup key. Covers the app's canonical SETUP_OPTIONS values
// (only "Breakout" has a knowledge entry) plus knowledge display names, so future or
// externally-tagged setups resolve without another edit here. Unmapped → no enrichment.
const SETUP_NAME_TO_KEY = {
  // App canonical value with a knowledge match:
  "Breakout": "breakout_continuation",
  // Knowledge display names (future-proofing):
  "VCP": "vcp",
  "Bull Flag": "bull_flag",
  "Cup & Handle": "cup_and_handle",
  "Double Bottom": "double_bottom",
  "Head & Shoulders": "head_and_shoulders",
  "Ascending Triangle": "ascending_triangle",
  "Episodic Pivot": "episodic_pivot",
  "ORB": "orb",
  "Opening Range Breakout": "orb",
  "Parabolic Short": "parabolic_short",
  "Pullback": "pullback",
  "Support Bounce": "support_bounce",
  "Resistance Break": "resistance_break",
};

/**
 * Weinstein/Wyckoff stage knowledge for a live regime enum.
 * @param {string} regimeEnum e.g. "BULL_TREND"
 * @returns {{stageName:string, coachLine:string, action:string}|null}
 */
export const getRegimeKnowledge = (regimeEnum) => {
  const mapping = REGIME_ENUM_TO_MAPPING[regimeEnum];
  if (!mapping) return null;
  const stage = getRegimeStage(mapping);
  if (!stage) return null;
  return { stageName: stage.name, coachLine: stage.coach_line, action: stage.action };
};

/**
 * Setup↔regime affinity enrichment for a candidate trade. Uses the trade's own
 * marketCondition (already in knowledge vocabulary) — no enum translation needed.
 * @param {{setup?:string, marketCondition?:string}} args
 * @returns {{knowledgeWarning:string, knowledgeSource:string}|{knowledgeBoost:true}|null}
 */
export const getSetupRegimeKnowledge = ({ setup, marketCondition } = {}) => {
  if (!setup || !marketCondition) return null;
  const key = SETUP_NAME_TO_KEY[setup];
  if (!key) return null;
  const s = getSetup(key);
  const affinity = s && s.regime_affinity;
  if (!affinity || typeof affinity !== "object") return null;
  const avoid = Array.isArray(affinity.avoid) ? affinity.avoid : [];
  const best  = Array.isArray(affinity.best) ? affinity.best : [];
  if (avoid.includes(marketCondition)) {
    return { knowledgeWarning: s.coach_line || null, knowledgeSource: s.source || null };
  }
  if (best.includes(marketCondition)) {
    return { knowledgeBoost: true };
  }
  return null;
};
