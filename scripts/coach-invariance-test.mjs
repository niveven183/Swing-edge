// scripts/coach-invariance-test.mjs — Wave 6.2 anti-regression harness.
//
// Proves the profile-aware coach (CoachPersona) NEVER alters the engine's numeric
// output. Runs the full pipeline (SwingEdgeAI.analyzeNewTrade → coachTrade →
// adaptCoaching) for a spread of synthetic trades × 6 profiles + null, and asserts:
//
//   1. verdict/confidence/sampleSize/expectedR/historicalContext/edgeMatch/
//      antiEdgeMatch/idea/knowledge* are deep-equal across EVERY profile.
//   2. adaptCoaching(x, null) === x  (null profile = identical reference).
//   3. adaptCoaching never mutates its input.
//   4. experience 'intermediate' returns insights deep-equal to the raw engine
//      output (declared identity = enforced identity).
//
// Pure Node, no browser. Run: `node scripts/coach-invariance-test.mjs`.

import assert from "node:assert/strict";
import { SwingEdgeAI } from "../src/intelligence/SwingEdgeAI.js";
import { adaptCoaching } from "../src/intelligence/core/CoachPersona.js";

// ── Profiles under test: {beginner,intermediate,advanced} × {swing,day} + null ──
const PROFILES = {
  "null": null,
  "beginner/swing":     { experience: "beginner",     strategy: "swing", goal: "growth",       frequency: "low" },
  "beginner/day":       { experience: "beginner",     strategy: "day",   goal: "passive",      frequency: "high" },
  "intermediate/swing": { experience: "intermediate", strategy: "swing", goal: "growth",       frequency: "medium" },
  "intermediate/day":   { experience: "intermediate", strategy: "day",   goal: "learning",     frequency: "medium" },
  "advanced/swing":     { experience: "advanced",     strategy: "swing", goal: "professional", frequency: "low" },
  "advanced/day":       { experience: "advanced",     strategy: "day",   goal: "growth",       frequency: "high" },
};

// ── Synthetic candidate trades (diverse: strong / weak+FOMO / earnings / wide / no target) ──
const SCENARIOS = [
  { name: "strong-breakout",
    form: { entry: 100, stop: 95, target: 115, side: "LONG", setup: "Breakout", marketCondition: "Trending Up", emotionAtEntry: "Confident", entryQuality: 5 },
    opts: {} },
  { name: "weak-fomo",
    form: { entry: 100, stop: 99, target: 101, side: "LONG", setup: "Breakout", marketCondition: "Volatile", emotionAtEntry: "FOMO", entryQuality: 2 },
    opts: {} },
  { name: "earnings-window",
    form: { entry: 100, stop: 95, target: 115, side: "LONG", setup: "Breakout", marketCondition: "Trending Up", emotionAtEntry: "Confident", entryQuality: 4 },
    opts: { marketData: { earnings: { symbol: "AAPL", daysUntil: 1 } } } },
  { name: "wide-stop",
    form: { entry: 100, stop: 90, target: 130, side: "LONG", setup: "Pullback", marketCondition: "Trending Up", entryQuality: 3 },
    opts: {} },
  { name: "no-target",
    form: { entry: 100, stop: 97, side: "LONG", setup: "Breakout", marketCondition: "Sideways" },
    opts: {} },
];

// A small closed-trade history (best-effort; the invariance must hold regardless).
const mkClosed = (i, setup, win) => ({
  id: `t${i}`, ticker: "AAPL", side: "LONG", setup, marketCondition: "Trending Up",
  entry: 100, stop: 95, target: 115, exitPrice: win ? 115 : 95,
  pnl: win ? 300 : -100, rMultiple: win ? 3 : -1, status: "closed", closed: true,
  closedAt: `2026-01-${String(10 + i).padStart(2, "0")}T15:00:00Z`,
  openedAt: `2026-01-${String(10 + i).padStart(2, "0")}T14:00:00Z`,
});
const HISTORIES = {
  empty: [],
  seeded: [mkClosed(1, "Breakout", true), mkClosed(2, "Breakout", false), mkClosed(3, "Breakout", true),
           mkClosed(4, "Pullback", true), mkClosed(5, "Pullback", false)],
};

const ENGINE_FIELDS = [
  "verdict", "confidence", "sampleSize", "expectedR", "historicalContext",
  "edgeMatch", "antiEdgeMatch", "idea", "knowledgeWarning", "knowledgeSource", "knowledgeBoost",
];
const engineView = (r) => Object.fromEntries(ENGINE_FIELDS.map((k) => [k, r?.[k]]));

let checks = 0;
const fail = (msg) => { console.error(`\n❌ ${msg}`); process.exit(1); };

for (const [histName, trades] of Object.entries(HISTORIES)) {
  for (const sc of SCENARIOS) {
    const optsOf = (profile) => ({ ...sc.opts, profile });
    const label = `[${histName}] ${sc.name}`;

    // Raw engine output = null-profile run (adaptCoaching passthrough).
    const raw = SwingEdgeAI.analyzeNewTrade(sc.form, trades, optsOf(null));
    const rawEngine = engineView(raw);

    for (const [pname, profile] of Object.entries(PROFILES)) {
      const res = SwingEdgeAI.analyzeNewTrade(sc.form, trades, optsOf(profile));

      // (1) numeric engine output identical across every profile.
      try { assert.deepStrictEqual(engineView(res), rawEngine); checks++; }
      catch { fail(`${label} — engine output diverged for profile "${pname}".`); }

      // (4) intermediate → insights deep-equal to raw engine insights.
      if (profile && profile.experience === "intermediate") {
        try { assert.deepStrictEqual(res.insights, raw.insights); checks++; }
        catch { fail(`${label} — intermediate insights differ from raw for "${pname}".`); }
      }
    }

    // (2) adaptCoaching(x, null) === x (identical reference).
    if (adaptCoaching(raw, null) !== raw) fail(`${label} — adaptCoaching(x, null) is not identity.`);
    checks++;

    // (3) adaptCoaching must not mutate its input.
    const snapshot = structuredClone(raw);
    adaptCoaching(raw, PROFILES["beginner/swing"]);
    adaptCoaching(raw, PROFILES["advanced/day"]);
    try { assert.deepStrictEqual(raw, snapshot); checks++; }
    catch { fail(`${label} — adaptCoaching mutated its input.`); }
  }
}

console.log(`✅ coach-invariance: ${checks} assertions passed across ${SCENARIOS.length} scenarios × ${Object.keys(PROFILES).length} profiles × ${Object.keys(HISTORIES).length} histories.`);
console.log("   verdict / confidence / numbers are byte-identical for every profile including null.");
