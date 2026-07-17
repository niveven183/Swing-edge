// ─── DECISION COACH ──────────────────────────────────────────────────────────
// Real-time analysis of a proposed trade. Runs all the sanity checks a senior
// swing trader would shout over your shoulder, and returns a compact verdict.

import {
  getClosed, isWin, rOf, avgR, median, percentile, groupBy, dayOfWeek, rrBucket,
} from "../utils/statisticalModels.js";
import { tradesToday, trailingLossRun, isRevengeWindow } from "../utils/psychologyPatterns.js";
import { matchIdeaToEdge, matchIdeaToAntiEdge } from "./EdgeFinder.js";
import { getPersonalizedRecommendations } from "./TradeDNA.js";
import { isSetupCompatible } from "./MarketRegime.js";
import { getSetupRegimeKnowledge } from "../knowledgeGlue.js";
import { qstars } from "../../utils.js";
import { getEmotionWeight } from "../calibration.js";

// Utility — build a derived "idea" from the raw trade form fields.
const ideaFromForm = (form) => {
  const entry  = Number(form.entry) || 0;
  const stop   = Number(form.stop)  || 0;
  const target = Number(form.target) || 0;
  const risk    = Math.abs(entry - stop);
  const reward  = target ? Math.abs(target - entry) : 0;
  const rrNum   = risk > 0 && reward > 0 ? Math.round((reward / risk) * 100) / 100 : 0;
  const stopPct = entry > 0 && risk > 0 ? (risk / entry) * 100 : 0;
  const rrBand  = rrNum > 0 ? (rrNum < 1 ? "<1" : rrNum < 2 ? "1-2" : rrNum < 3 ? "2-3" : "3+") : null;

  return {
    side: form.side || "LONG",
    setup: form.setup,
    emotionAtEntry: form.emotionAtEntry,
    marketCondition: form.marketCondition,
    entryQuality: Number(form.entryQuality) || null,
    entry, stop, target,
    risk, reward, stopPct,
    rr: rrBand,
    day: dayOfWeek({ createdAt: new Date().toISOString() }),
    _rrNum: rrNum,
  };
};

// Historical context for similar trades (same setup) — what actually happened?
const historicalContextFor = (trades, idea) => {
  const closed = getClosed(trades);
  const similar = idea.setup ? closed.filter(t => t.setup === idea.setup) : closed;
  if (!similar.length) return null;
  const wins = similar.filter(isWin).length;
  return {
    similarTrades: similar.length,
    successRate:   Math.round((wins / similar.length) * 100),
    avgReturn:     avgR(similar).toFixed(2),
  };
};

// Distribution of stop % across similar trades — so we can flag an outlier stop.
const stopDistribution = (trades, idea) => {
  const closed = getClosed(trades).filter(t =>
    t.entry && t.stop && (!idea.setup || t.setup === idea.setup)
  );
  if (closed.length < 3) return null;
  const pcts = closed.map(t => (Math.abs(t.entry - t.stop) / t.entry) * 100);
  return {
    n: pcts.length,
    p25: percentile(pcts, 25),
    p50: median(pcts),
    p75: percentile(pcts, 75),
    p90: percentile(pcts, 90),
  };
};

// ─── CHECK BUILDERS ──────────────────────────────────────────────────────────
// Each check returns either null (skip) or { icon, text, weight, kind }.
// weight: positive pushes GO, negative pushes SKIP.

const rrCheck = (idea) => {
  if (!idea._rrNum || !idea.target) {
    return {
      icon: "📊", kind: "warn", weight: -5,
      text: {
        en: "No target set — define one to validate R/R.",
        he: "לא נקבע יעד — הגדר כדי לאמת את היחס סיכוי/סיכון.",
      },
    };
  }
  const rr = idea._rrNum;
  if (rr >= 3) return {
    icon: "✅", kind: "go", weight: 20,
    text: {
      en: `Excellent R/R ${rr.toFixed(2)}:1 — asymmetric setup.`,
      he: `יחס סיכוי/סיכון מעולה ${rr.toFixed(2)}:1 — סטאפ אסימטרי.`,
    },
  };
  if (rr >= 2) return {
    icon: "✅", kind: "go", weight: 12,
    text: {
      en: `Strong R/R ${rr.toFixed(2)}:1 — passes the 2:1 minimum.`,
      he: `יחס סיכוי/סיכון חזק ${rr.toFixed(2)}:1 — עובר את הרף של 2:1.`,
    },
  };
  if (rr >= 1.5) return {
    icon: "⚠️", kind: "warn", weight: -5,
    text: {
      en: `Marginal R/R ${rr.toFixed(2)}:1 — below your 2:1 preferred floor.`,
      he: `יחס סיכוי/סיכון גבולי ${rr.toFixed(2)}:1 — מתחת לרף 2:1.`,
    },
  };
  return {
    icon: "❌", kind: "skip", weight: -20,
    text: {
      en: `Poor R/R ${rr.toFixed(2)}:1 — not worth the risk.`,
      he: `יחס סיכוי/סיכון ירוד ${rr.toFixed(2)}:1 — לא שווה את הסיכון.`,
    },
  };
};

const directionCheck = (idea) => {
  if (!idea.entry || !idea.stop) return null;
  if (idea.side === "LONG"  && idea.stop >= idea.entry) return {
    icon: "❌", kind: "skip", weight: -100,
    text: { en: "Stop must be BELOW entry on a LONG.", he: "הסטופ חייב להיות מתחת לכניסה בלונג." },
  };
  if (idea.side === "SHORT" && idea.stop <= idea.entry) return {
    icon: "❌", kind: "skip", weight: -100,
    text: { en: "Stop must be ABOVE entry on a SHORT.", he: "הסטופ חייב להיות מעל הכניסה בשורט." },
  };
  return null;
};

const stopDistanceCheck = (idea, dist) => {
  if (!idea.stopPct) return null;
  if (!dist) {
    // Absolute thresholds when we have no personal history.
    if (idea.stopPct > 7) return {
      icon: "⚠️", kind: "warn", weight: -10,
      text: {
        en: `Stop is ${idea.stopPct.toFixed(1)}% away — very wide for a swing entry.`,
        he: `הסטופ מרחק ${idea.stopPct.toFixed(1)}% — רחב מאוד לכניסת סווינג.`,
      },
    };
    if (idea.stopPct < 0.5) return {
      icon: "⚠️", kind: "warn", weight: -5,
      text: {
        en: `Stop is only ${idea.stopPct.toFixed(2)}% away — vulnerable to noise.`,
        he: `הסטופ במרחק ${idea.stopPct.toFixed(2)}% בלבד — פגיע לרעש.`,
      },
    };
    return null;
  }
  if (idea.stopPct <= dist.p25) return {
    icon: "⚠️", kind: "warn", weight: -3,
    text: {
      en: `Stop is tighter than 75% of your similar trades (${idea.stopPct.toFixed(2)}% vs ${dist.p50.toFixed(2)}% median).`,
      he: `הסטופ קרוב יותר מ-75% מהעסקאות הדומות שלך (${idea.stopPct.toFixed(2)}% מול ${dist.p50.toFixed(2)}% חציון).`,
    },
  };
  if (idea.stopPct >= dist.p90) return {
    icon: "⚠️", kind: "warn", weight: -8,
    text: {
      en: `Stop is wider than 90% of your similar trades — reduce size.`,
      he: `הסטופ רחב יותר מ-90% מהעסקאות הדומות שלך — הקטן גודל.`,
    },
  };
  return {
    icon: "📏", kind: "info", weight: 2,
    text: {
      en: `Stop distance ${idea.stopPct.toFixed(2)}% sits inside your normal range.`,
      he: `מרחק הסטופ ${idea.stopPct.toFixed(2)}% בטווח הרגיל שלך.`,
    },
  };
};

const patternMatchCheck = (dna, idea) => {
  if (!idea.setup || !dna || !dna.sampleSize) return null;
  const strong = (dna.strengths?.setups || []).find(s => s.key === idea.setup);
  const weak   = (dna.weaknesses?.setups || []).find(s => s.key === idea.setup);
  if (strong) return {
    icon: "⭐", kind: "go", weight: 15,
    text: {
      en: `${idea.setup} is a winning pattern for you — ${Math.round(strong.winRate * 100)}% win over ${strong.n} trades.`,
      he: `${idea.setup} זה סטאפ מנצח אצלך — ${Math.round(strong.winRate * 100)}% הצלחה ב-${strong.n} עסקאות.`,
    },
  };
  if (weak) return {
    icon: "⚠️", kind: "warn", weight: -12,
    text: {
      en: `${idea.setup} historically loses for you — ${Math.round(weak.winRate * 100)}% win, ${weak.n} trades.`,
      he: `${idea.setup} היסטורית מפסיד אצלך — ${Math.round(weak.winRate * 100)}% הצלחה ב-${weak.n} עסקאות.`,
    },
  };
  return null;
};

// setup × marketCondition combo — the strongest personal insight:
// "Breakout in Volatile = 22% win over 9 of your trades."
const setupMarketComboCheck = (trades, idea) => {
  if (!idea.setup || !idea.marketCondition) return null;
  const closed = getClosed(trades).filter(
    t => t.setup === idea.setup && t.marketCondition === idea.marketCondition
  );
  if (closed.length < 3) return null;
  const wins = closed.filter(isWin).length;
  const wr = Math.round((wins / closed.length) * 100);
  const n = closed.length;
  const s = idea.setup, m = idea.marketCondition;
  const text = {
    en: `${s} in ${m}: ${wr}% win over ${n} of your trades.`,
    he: `${s} ב-${m}: ${wr}% הצלחה ב-${n} עסקאות שלך.`,
    es: `${s} en ${m}: ${wr}% de aciertos en ${n} de tus operaciones.`,
    pt: `${s} em ${m}: ${wr}% de acertos em ${n} das suas operações.`,
    ar: `${s} في ${m}: ${wr}% نجاح في ${n} من صفقاتك.`,
  };
  if (wr <= 35) return { icon: "🔴", kind: "skip", weight: -15, text };
  if (wr >= 60) return { icon: "✅", kind: "go",   weight: 12, text };
  return { icon: "📊", kind: "info", weight: 0, text };
};

const emotionalCheck = (dna, idea) => {
  if (!idea.emotionAtEntry) return null;
  if (idea.emotionAtEntry === "FOMO") return {
    icon: "🚨", kind: "skip", weight: getEmotionWeight("FOMO", -15),
    text: {
      en: "FOMO entry — historically your worst emotional state. Wait 15 minutes.",
      he: "כניסה מתוך FOMO — היסטורית המצב הרגשי הכי גרוע שלך. חכה 15 דקות.",
    },
  };
  if (idea.emotionAtEntry === "Confident") return {
    icon: "🧠", kind: "go", weight: getEmotionWeight("Confident", 6),
    text: {
      en: "Confident state — stay mechanical and respect your stop.",
      he: "מצב בטוח — שמור על משמעת וכבד את הסטופ.",
    },
  };
  if (dna && idea.emotionAtEntry) {
    const weak = (dna.weaknesses?.emotions || []).find(e => e.key === idea.emotionAtEntry);
    if (weak) return {
      icon: "⚠️", kind: "warn", weight: -6,
      dedup: `emotion:${idea.emotionAtEntry}`,
      text: {
        en: `You tend to lose trading under "${idea.emotionAtEntry}".`,
        he: `אתה נוטה להפסיד כשאתה במצב "${idea.emotionAtEntry}".`,
      },
    };
  }
  return null;
};

// entryQuality is the trader's own 1–5 star read of the setup (legacy trades use
// 1–10; qstars normalises both to 1–5). We only speak up at the extremes so the
// default middle rating stays silent.
const entryQualityCheck = (idea) => {
  const q = qstars(idea.entryQuality);
  if (!q) return null;
  const rr = idea._rrNum || 0;
  if (q <= 2 && rr > 0 && rr < 2) return {
    icon: "⚠️", kind: "warn", weight: -6,
    text: {
      en: `Low entry quality (${q}/5) with a marginal R/R — wait for a cleaner setup.`,
      he: `איכות כניסה נמוכה (${q}/5) עם R/R גבולי — חכה לסטאפ נקי יותר.`,
    },
  };
  if (q <= 2) return {
    icon: "⚠️", kind: "warn", weight: -4,
    text: {
      en: `You rated this entry ${q}/5 — double-check your trigger before committing.`,
      he: `דירגת את הכניסה ${q}/5 — ודא את הטריגר לפני שאתה נכנס.`,
    },
  };
  if (q >= 5 && rr >= 2) return {
    icon: "✨", kind: "go", weight: 4,
    text: {
      en: `Top entry quality (${q}/5) backing a strong R/R — clean setup.`,
      he: `איכות כניסה מעולה (${q}/5) עם R/R חזק — סטאפ נקי.`,
    },
  };
  return null;
};

const sequentialCheck = (trades) => {
  const today = tradesToday(trades);
  if (today >= 4) return {
    icon: "🛑", kind: "skip", weight: -12,
    text: {
      en: `Already ${today} trades today — overtrading territory.`,
      he: `כבר ${today} עסקאות היום — איזור של סחר יתר.`,
    },
  };
  if (trailingLossRun(trades) >= 3) return {
    icon: "🛑", kind: "skip", weight: -15,
    text: {
      en: "3+ consecutive losses — step back before the next entry.",
      he: "3+ הפסדים ברצף — עצור לפני הכניסה הבאה.",
    },
  };
  if (isRevengeWindow(trades)) return {
    icon: "⚠️", kind: "warn", weight: -10,
    text: {
      en: "Very soon after a loss — check for revenge-trading impulse.",
      he: "קרוב מאוד להפסד האחרון — בדוק שזה לא revenge trading.",
    },
  };
  return null;
};

// ─── TIMING CHANNEL — EARNINGS AWARENESS ─────────────────────────────────────
// Entering a swing right before earnings is a binary bet (gap ±20%), not a
// setup. earnings: { symbol, nextEarningsDate, daysUntil } | null. Silent when
// absent (crypto / no report in window) — fail-open. daysUntil <= 2 also clamps
// the verdict to CAUTION (applied in coachTrade, outside the score engine).
const earningsDayPhrase = (n, lang) => {
  if (lang === "he") {
    if (n <= 0) return "היום";
    if (n === 1) return "מחר";
    if (n === 2) return "בעוד יומיים";
    return `בעוד ${n} ימים`;
  }
  if (n <= 0) return "today";
  if (n === 1) return "tomorrow";
  return `in ${n} days`;
};

const earningsCheck = (earnings) => {
  if (!earnings || earnings.daysUntil == null) return null;
  const n = earnings.daysUntil;
  if (n > 5 || n < 0) return null;
  const sym = earnings.symbol || "This ticker";
  if (n <= 2) return {
    icon: "📅", kind: "warn", channel: "timing", weight: -20,
    text: {
      en: `⚠️ ${sym} reports ${earningsDayPhrase(n, "en")} — entering now is a binary bet, not a setup.`,
      he: `⚠️ ${sym} מדווחת ${earningsDayPhrase(n, "he")} — כניסה עכשיו = הימור בינארי, לא setup.`,
    },
  };
  return {
    icon: "📅", kind: "warn", channel: "timing", weight: -6,
    text: {
      en: `${sym} reports ${earningsDayPhrase(n, "en")} — consider waiting until after earnings.`,
      he: `${sym} מדווחת ${earningsDayPhrase(n, "he")} — שקול לחכות עד אחרי הדוחות.`,
    },
  };
};

const regimeCheck = (regimeReport, idea) => {
  if (!regimeReport || !idea.setup) return null;
  const compat = isSetupCompatible(regimeReport, idea.setup);
  if (compat === false) return {
    icon: "🌧️", kind: "warn", weight: -10,
    text: {
      en: `${idea.setup} is not favoured by the current regime (${regimeReport.regime}).`,
      he: `${idea.setup} לא מתאים למצב השוק הנוכחי (${regimeReport.regime}).`,
    },
  };
  if (compat === "neutral") return null;
  return null;
};

// ─── VERDICT ─────────────────────────────────────────────────────────────────
const verdictFrom = (score) => {
  if (score >= 15)  return "GO";
  if (score >= -5)  return "CAUTION";
  return "SKIP";
};

// ─── INSIGHT MERGE (display only — never touches the score) ───────────────────
// De-dup: collapse insights that share a `dedup` key (e.g. two generators firing
// on the same weak emotion) to a single line, keeping the one tagged `_prefer`.
const dedupeInsights = (list) => {
  const slot = new Map(); // dedup key → index in result
  const result = [];
  for (const ins of list) {
    if (!ins.dedup) { result.push(ins); continue; }
    const at = slot.get(ins.dedup);
    if (at == null) { slot.set(ins.dedup, result.length); result.push(ins); }
    else if (ins._prefer && !result[at]._prefer) result[at] = ins;
  }
  return result;
};

// Prioritise: surface blockers first, confirmations last — so warnings and
// positives don't interleave randomly. skip → warn → go → info, then by |weight|.
const KIND_RANK = { skip: 0, warn: 1, go: 2, info: 3 };
const prioritizeInsights = (list) =>
  [...list].sort((a, b) =>
    ((KIND_RANK[a.kind] ?? 9) - (KIND_RANK[b.kind] ?? 9)) ||
    (Math.abs(b.weight || 0) - Math.abs(a.weight || 0))
  );

// Stable display id for each insight source — additive tag only, never touches
// weight/kind/text (verdict & confidence are computed from weight alone). Used by
// the CoachPersona presentation layer to reorder/filter/annotate; null passes through.
const withId = (id, ins) => (ins ? { ...ins, id } : ins);

// ─── PUBLIC API ──────────────────────────────────────────────────────────────
// coachTrade: { form, trades, dna, edges, regime, lang }
export const coachTrade = ({ form, trades = [], dna = null, edges = null, regime = null, earnings = null } = {}) => {
  if (!form || !form.entry || !form.stop) {
    return {
      verdict: "PENDING",
      confidence: 0,
      insights: [],
      historicalContext: null,
      edgeMatch: null,
      expectedR: null,
      sampleSize: getClosed(trades).length,
    };
  }

  const idea = ideaFromForm(form);
  const dist = stopDistribution(trades, idea);

  const checks = [
    withId("direction",     directionCheck(idea)),
    withId("rr",            rrCheck(idea)),
    withId("stop_distance", stopDistanceCheck(idea, dist)),
    withId("pattern",       patternMatchCheck(dna, idea)),
    withId("setup_combo",   setupMarketComboCheck(trades, idea)),
    withId("emotion",       emotionalCheck(dna, idea)),
    withId("entry_quality", entryQualityCheck(idea)),
    withId("sequential",    sequentialCheck(trades)),
    withId("regime",        regimeCheck(regime, idea)),
    withId("earnings",      earningsCheck(earnings)),
  ].filter(Boolean);

  // Score aggregation, clipped to a 0..100 confidence band.
  const rawScore = checks.reduce((s, c) => s + c.weight, 0);
  const confidence = Math.max(0, Math.min(100, 50 + rawScore * 2));

  // Verdict engine is untouched — this clamp wraps *around* it: entering within
  // 48h of earnings caps the verdict at CAUTION regardless of how strong the
  // setup scores. Binary event risk is a commercial call, not a score nudge.
  let verdict = verdictFrom(rawScore);
  if (earnings && earnings.daysUntil != null && earnings.daysUntil <= 2 && verdict === "GO") {
    verdict = "CAUTION";
  }

  // Edge match + anti-edge match
  const edgeMatch     = edges ? matchIdeaToEdge(edges, idea)     : null;
  const antiEdgeMatch = edges ? matchIdeaToAntiEdge(edges, idea) : null;
  if (edgeMatch && edgeMatch.matched) {
    checks.push({
      id: "edge", icon: "🎯", kind: "go", weight: 10,
      text: {
        en: `Matches your top edge: ${edgeMatch.edge.pattern} (${edgeMatch.edge.winRate}% win).`,
        he: `תואם ל-Edge המוביל שלך: ${edgeMatch.edge.patternHe || edgeMatch.edge.pattern} (${edgeMatch.edge.winRate}% הצלחה).`,
      },
    });
  }
  if (antiEdgeMatch && antiEdgeMatch.matched) {
    checks.push({
      id: "anti_edge", icon: "☠️", kind: "skip", weight: -15,
      text: {
        en: `Matches a losing pattern: ${antiEdgeMatch.antiEdge.pattern} (${antiEdgeMatch.antiEdge.winRate}% win).`,
        he: `תואם לדפוס מפסיד: ${antiEdgeMatch.antiEdge.patternHe || antiEdgeMatch.antiEdge.pattern} (${antiEdgeMatch.antiEdge.winRate}% הצלחה).`,
      },
    });
  }

  // Personalised DNA advice (adds informational bullets only).
  const dnaRecs = getPersonalizedRecommendations(dna, idea) || [];
  for (const r of dnaRecs) {
    const isEmotion = r.key === "emotion";
    checks.push({
      id: "dna",
      icon: r.kind === "weakness" ? "⚠️" : r.kind === "strength" ? "⭐" : "💡",
      kind: r.kind === "weakness" ? "warn" : "info",
      weight: 0,
      text: { en: r.en, he: r.he },
      // Same emotion can also surface via emotionalCheck — tag both so the merge
      // keeps a single line. This DNA rec carries the actionable "pause" wording,
      // so it wins the de-dup.
      ...(isEmotion ? { dedup: `emotion:${idea.emotionAtEntry}`, _prefer: true } : {}),
    });
  }

  // Expected R — calibrate from similar historical trades when possible.
  const history = historicalContextFor(trades, idea);
  const expectedR = history ? Number(history.avgReturn) : null;
  if (expectedR != null && history && history.similarTrades >= 3) {
    checks.push({
      id: "expected_r", icon: "📈", kind: "info", weight: 0,
      text: {
        en: `Expected return based on ${history.similarTrades} similar trades: ${expectedR >= 0 ? "+" : ""}${expectedR.toFixed(2)}R.`,
        he: `תשואה צפויה לפי ${history.similarTrades} עסקאות דומות: ${expectedR >= 0 ? "+" : ""}${expectedR.toFixed(2)}R.`,
      },
    });
  }

  // Merge for display only — score/verdict were already locked above.
  const insights = prioritizeInsights(dedupeInsights(checks));

  // Additive knowledge layer — display only, never touches score/verdict. Spreads
  // { knowledgeWarning, knowledgeSource } or { knowledgeBoost } when relevant, else {}.
  const knowledge = getSetupRegimeKnowledge({ setup: idea.setup, marketCondition: idea.marketCondition });

  return {
    verdict,
    confidence: Math.round(confidence),
    insights,
    historicalContext: history,
    edgeMatch,
    antiEdgeMatch,
    expectedR,
    idea,
    sampleSize: getClosed(trades).length,
    ...(knowledge || {}),
  };
};

// ─── ANALYZER VIEW ADAPTER ───────────────────────────────────────────────────
// Maps the rich coachTrade output onto the flat shape the standalone Analyzer
// panel renders ({ recommendation, entry_score, stop_logic, rr_assessment,
// explanation }). This lets the Analyzer run on the SAME engine as Log New Trade
// while keeping its existing display. Dollar/portfolio risk — which the coach's
// price-only idea doesn't carry — is recomputed here so the Analyzer keeps
// surfacing it inside the explanation.

const pickInsightText = (insights, re) => {
  const hit = (insights || []).find(i => i.text && re.test(i.text.en || ""));
  return hit ? hit.text : null;
};

const scoreFromConfidence = (c) =>
  c >= 80 ? 5 : c >= 60 ? 4 : c >= 40 ? 3 : c >= 20 ? 2 : 1;

const portfolioRiskNote = (entry, stop, shares, capital, lang) => {
  const dollarRisk = Math.abs(Number(entry) - Number(stop)) * (Number(shares) || 0);
  const cap = Number(capital) || 0;
  const sh = Number(shares) || 0;
  const pct = cap > 0 && sh > 0 ? (dollarRisk / cap) * 100 : 0;
  if (pct <= 0) return "";
  if (lang === "he") {
    if (pct > 2)   return ` סיכון תיק ${pct.toFixed(2)}% מעל יעד 1% — הקטן גודל.`;
    if (pct > 1.2) return ` סיכון תיק ${pct.toFixed(2)}% מעט מעל 1% — סביר.`;
    return ` סיכון תיק ${pct.toFixed(2)}% בתוך כלל ה-1%.`;
  }
  if (pct > 2)   return ` Portfolio risk ${pct.toFixed(2)}% is above 1% target — reduce size.`;
  if (pct > 1.2) return ` Portfolio risk ${pct.toFixed(2)}% slightly above 1% — acceptable.`;
  return ` Portfolio risk ${pct.toFixed(2)}% within 1% rule.`;
};

export const coachingToAnalyzerView = (coaching, { entry, stop, target, shares, capital, lang = "en" } = {}) => {
  if (!coaching || coaching.verdict === "PENDING") {
    return { error: lang === "he" ? "חסר מחיר כניסה או סטופ." : "Missing entry or stop price." };
  }
  const L = (t) => (t ? (t[lang] || t.en) : null);
  const insights = coaching.insights || [];

  const recommendation = coaching.verdict === "GO" ? "GO" : coaching.verdict === "SKIP" ? "SKIP" : "WAIT";
  const entry_score = scoreFromConfidence(coaching.confidence ?? 0);

  const rr_assessment = L(pickInsightText(insights, /R\/R|ratio/i));

  let stop_logic = L(pickInsightText(insights, /\bstop\b/i));
  if (!stop_logic) {
    const sp = coaching.idea?.stopPct;
    stop_logic = sp != null
      ? (lang === "he"
          ? `מרחק הסטופ ${sp.toFixed(2)}% — בטווח סביר.`
          : `Stop distance ${sp.toFixed(2)}% — within a reasonable range.`)
      : null;
  }

  // The lead insight often IS the R/R (or stop) line — which already has its own
  // box above. Repeating it verbatim in the explanation is the duplication users
  // reported, so when the lead matches a boxed line we carry only the incremental
  // portfolio-risk note (and hide the box entirely if nothing else remains).
  const leadRaw = L((insights.find(i => i.kind === "go" || i.kind === "skip") || insights[0] || {}).text) || "";
  const lead = (leadRaw && (leadRaw === rr_assessment || leadRaw === stop_logic)) ? "" : leadRaw;
  const explanation = (lead + portfolioRiskNote(entry, stop, shares, capital, lang)).trim() || null;

  return { recommendation, entry_score, stop_logic, rr_assessment, explanation };
};
