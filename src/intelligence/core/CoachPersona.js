// ─── COACH PERSONA — PROFILE-AWARE PRESENTATION LAYER ────────────────────────
// Wave 6.2. Adapts the Decision Coach's *presentation* to the onboarding profile
// (experience / strategy / goal) WITHOUT ever touching the engine's numeric output.
//
// IRON RULE: verdict, confidence, sampleSize, expectedR, historicalContext,
// edgeMatch, antiEdgeMatch, idea and the knowledge spread are byte-identical for
// every profile — including null. This layer only reorders / filters the display
// `insights` array, attaches an optional sourced `whyLine`, and adds display-only
// `persona` metadata. It operates on a structuredClone and never mutates its input.
//
//   profile === null  → returns the SAME coaching reference, untouched (veteran path).
//   experience 'intermediate' → insights array left deep-equal to the raw engine.
//   'beginner'  → protection-first ordering + sourced "why" lines.
//   'advanced'  → purely-educational info lines collapsed (facts/numbers kept).

import { getWhyLine } from "../knowledgeGlue.js";

// insight id → semantic category. Ids are stamped in DecisionCoach.js (id-only).
const CATEGORY = {
  direction: "protection", stop_distance: "protection", rr: "protection",
  anti_edge: "protection", sequential: "protection",
  emotion: "psych",
  earnings: "timing", regime: "timing", entry_quality: "timing",
  edge: "confirm",
  setup_combo: "basic", pattern: "basic", expected_r: "basic", dna: "basic",
};

// Beginner grouping — "what keeps me safe" first, then psychology, then the rest.
const BEGINNER_RANK = { protection: 0, psych: 1 };
const beginnerRank = (id) => BEGINNER_RANK[CATEGORY[id]] ?? 2;

// Strategy → which knowledge categories surface earliest among equal-weight insights
// (display order only; lower = earlier). swing emphasises market-stage / hold-through /
// structural-stop; day emphasises timing / discipline / entry-quality.
// Never applied to 'intermediate' (identity) or to 'searching'/'combined' (no key).
const STRATEGY_KNOWLEDGE_EMPHASIS = {
  swing: { regime: -2, earnings: -1, stop_distance: -1 },
  day:   { entry_quality: -2, sequential: -1, emotion: -1 },
};

// Advanced hides purely-educational INFO lines only. Never touches actionable
// go/warn/skip, and never `expected_r` — that line carries the number an advanced
// trader wants (refinement: advanced never loses the number).
const ADVANCED_DROP_INFO = new Set(["stop_distance", "setup_combo", "dna"]);

// Beginner "why" — sourced from the knowledge base via knowledgeGlue (Hebrew-only,
// never invented). Only unambiguous id→rule mappings; other ids get no why line.
// A ref may be strategy-conditional ({swing,day,default}); whyRefFor picks the strategy
// key when present, else default — so swing vs day can cite a different sourced rule.
const WHY_REF = {
  direction:     "rule:cut_losses_fast",
  stop_distance: { swing: "rule:stop_is_structural", day: "rule:cut_losses_fast",
                   default: "rule:cut_losses_fast" },
};
const whyRefFor = (id, strategy) => {
  const ref = WHY_REF[id];
  if (!ref) return null;
  if (typeof ref === "string") return ref;
  return ref[strategy] || ref.default || null;
};

const toneFor = (goal) =>
  goal === "growth" || goal === "professional" ? "growth" : "consistency";

// Decorate → stable sort by (key, originalIndex) → strip. Deterministic total order
// independent of the engine's own sort stability.
const reorder = (insights, experience, strategy) => {
  const boost = STRATEGY_KNOWLEDGE_EMPHASIS[strategy] || null;
  const keyOf = (ins) => {
    const base = experience === "beginner" ? beginnerRank(ins.id) * 10 : 0;
    const off = boost ? (boost[ins.id] || 0) : 0;
    return base + off;
  };
  return insights
    .map((ins, i) => ({ ins, i, k: keyOf(ins) }))
    .sort((a, b) => (a.k - b.k) || (a.i - b.i))
    .map((x) => x.ins);
};

export const adaptCoaching = (coaching, profile = null, lang = null) => {
  if (!profile) return coaching; // veteran path — identical reference, zero work.

  const experience = profile.experience || null;
  const strategy = profile.strategy || null;
  const goal = profile.goal || null;

  const out = structuredClone(coaching);
  let insights = Array.isArray(out.insights) ? out.insights : [];

  // 'intermediate' is a declared no-op: leave the insights array exactly as the
  // engine produced it (deep-equal to raw). Only beginner/advanced transform.
  if (experience === "advanced") {
    insights = insights.filter(
      (ins) => !(ins.kind === "info" && ADVANCED_DROP_INFO.has(ins.id))
    );
  }
  if (experience === "beginner" || experience === "advanced") {
    insights = reorder(insights, experience, strategy);
  }
  if (experience === "beginner") {
    insights = insights.map((ins) => {
      const ref = whyRefFor(ins.id, strategy);
      if (!ref) return ins;
      const why = getWhyLine(ref);
      return why ? { ...ins, whyLine: why } : ins;
    });
  }

  out.insights = insights;
  out.persona = { experience, strategy, tone: toneFor(goal) }; // display-only metadata
  return out;
};
