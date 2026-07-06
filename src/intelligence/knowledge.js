// ─── KNOWLEDGE ENGINE READER ─────────────────────────────────────────────────
// Thin, additive reader over ./knowledge/*.json — canonical trading knowledge
// (setups / rules / psychology / regimes). Mirrors calibration.js: static JSON
// imports with SAFE FALLBACKS. Every getter is wrapped and NEVER throws; a missing
// or malformed entry returns null (or [] for list getters), so absent knowledge
// leaves today's behavior byte-for-byte unchanged.
//
// NOTE: this module is intentionally NOT imported anywhere yet — wiring is Phase 2.

import setups from "./knowledge/setups.json" with { type: "json" };
import rules from "./knowledge/rules.json" with { type: "json" };
import psychology from "./knowledge/psychology.json" with { type: "json" };
import regimes from "./knowledge/regimes.json" with { type: "json" };

const pick = (source, key) => {
  try {
    if (!source || typeof source !== "object" || key === "_meta") return null;
    const v = source[key];
    return v && typeof v === "object" ? v : null;
  } catch {
    return null;
  }
};

/**
 * Canonical setup definition by key (e.g. "vcp", "bull_flag").
 * @param {string} key
 * @returns {object|null} setup entry, or null if absent/invalid.
 */
export const getSetup = (key) => pick(setups, key);

/**
 * Trading rule by key (e.g. "one_percent_rule", "rr_minimum").
 * @param {string} key
 * @returns {object|null} rule entry, or null if absent/invalid.
 */
export const getRule = (key) => pick(rules, key);

/**
 * Psychology pattern by key (e.g. "fomo", "tilt", "five_truths").
 * @param {string} key
 * @returns {object|null} psychology entry, or null if absent/invalid.
 */
export const getPsychology = (key) => pick(psychology, key);

/**
 * Regime stage resolved by either its key ("stage2_advance") OR its marketCondition
 * mapping value ("Trending Up" / "Trending Down" / "Volatile" / "Sideways").
 * @param {string} mappingOrKey
 * @returns {object|null} regime stage entry, or null if absent/invalid.
 */
export const getRegimeStage = (mappingOrKey) => {
  try {
    if (!regimes || typeof regimes !== "object" || !mappingOrKey) return null;
    const direct = pick(regimes, mappingOrKey);
    if (direct) return direct;
    for (const [key, stage] of Object.entries(regimes)) {
      if (key === "_meta") continue;
      if (stage && typeof stage === "object" && stage.mapping === mappingOrKey) {
        return stage;
      }
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * All setups as an array (excludes _meta).
 * @returns {object[]} setup entries, or [] if unavailable.
 */
export const getAllSetups = () => {
  try {
    if (!setups || typeof setups !== "object") return [];
    return Object.entries(setups)
      .filter(([key]) => key !== "_meta")
      .map(([, value]) => value)
      .filter((v) => v && typeof v === "object");
  } catch {
    return [];
  }
};

/**
 * True when at least one knowledge source loaded with usable content.
 * @returns {boolean}
 */
export const knowledgeAvailable = () => {
  try {
    const has = (src) =>
      !!src && typeof src === "object" &&
      Object.keys(src).some((k) => k !== "_meta");
    return has(setups) || has(rules) || has(psychology) || has(regimes);
  } catch {
    return false;
  }
};
