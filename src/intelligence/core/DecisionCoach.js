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

// Utility — build a derived "idea" from the raw trade form fields.
const ideaFromForm = (form) => {
  const entry  = Number(form.entry) || 0;
  const stop   = Number(form.stop)  || 0;
  const target = Number(form.target) || 0;
  const risk    = Math.abs(entry - stop);
  const reward  = target ? Math.abs(target - entry) : 0;
  const rrNum   = risk > 0 && reward > 0 ? reward / risk : 0;
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

const emotionalCheck = (dna, idea) => {
  if (!idea.emotionAtEntry) return null;
  if (idea.emotionAtEntry === "FOMO") return {
    icon: "🚨", kind: "skip", weight: -15,
    text: {
      en: "FOMO entry — historically your worst emotional state. Wait 15 minutes.",
      he: "כניסה מתוך FOMO — היסטורית המצב הרגשי הכי גרוע שלך. חכה 15 דקות.",
    },
  };
  if (idea.emotionAtEntry === "Confident") return {
    icon: "🧠", kind: "go", weight: 6,
    text: {
      en: "Confident state — stay mechanical and respect your stop.",
      he: "מצב בטוח — שמור על משמעת וכבד את הסטופ.",
    },
  };
  if (dna && idea.emotionAtEntry) {
    const weak = (dna.weaknesses?.emotions || []).find(e => e.key === idea.emotionAtEntry);
    if (weak) return {
      icon: "⚠️", kind: "warn", weight: -6,
      text: {
        en: `You tend to lose trading under "${idea.emotionAtEntry}".`,
        he: `אתה נוטה להפסיד כשאתה במצב "${idea.emotionAtEntry}".`,
      },
    };
  }
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

// ─── PUBLIC API ──────────────────────────────────────────────────────────────
// coachTrade: { form, trades, dna, edges, regime, lang }
export const coachTrade = ({ form, trades = [], dna = null, edges = null, regime = null } = {}) => {
  if (!form || !form.entry || !form.stop) {
    return {
      verdict: "PENDING",
      confidence: 0,
      insights: [],
      historicalContext: null,
      edgeMatch: null,
      expectedR: null,
    };
  }

  const idea = ideaFromForm(form);
  const dist = stopDistribution(trades, idea);

  const checks = [
    directionCheck(idea),
    rrCheck(idea),
    stopDistanceCheck(idea, dist),
    patternMatchCheck(dna, idea),
    emotionalCheck(dna, idea),
    sequentialCheck(trades),
    regimeCheck(regime, idea),
  ].filter(Boolean);

  // Score aggregation, clipped to a 0..100 confidence band.
  const rawScore = checks.reduce((s, c) => s + c.weight, 0);
  const confidence = Math.max(0, Math.min(100, 50 + rawScore * 2));
  const verdict = verdictFrom(rawScore);

  // Edge match + anti-edge match
  const edgeMatch     = edges ? matchIdeaToEdge(edges, idea)     : null;
  const antiEdgeMatch = edges ? matchIdeaToAntiEdge(edges, idea) : null;
  if (edgeMatch && edgeMatch.matched) {
    checks.push({
      icon: "🎯", kind: "go", weight: 10,
      text: {
        en: `Matches your top edge: ${edgeMatch.edge.pattern} (${edgeMatch.edge.winRate}% win).`,
        he: `תואם ל-Edge המוביל שלך: ${edgeMatch.edge.pattern} (${edgeMatch.edge.winRate}% הצלחה).`,
      },
    });
  }
  if (antiEdgeMatch && antiEdgeMatch.matched) {
    checks.push({
      icon: "☠️", kind: "skip", weight: -15,
      text: {
        en: `Matches a losing pattern: ${antiEdgeMatch.antiEdge.pattern} (${antiEdgeMatch.antiEdge.winRate}% win).`,
        he: `תואם לדפוס מפסיד: ${antiEdgeMatch.antiEdge.pattern} (${antiEdgeMatch.antiEdge.winRate}% הצלחה).`,
      },
    });
  }

  // Personalised DNA advice (adds informational bullets only).
  const dnaRecs = getPersonalizedRecommendations(dna, idea) || [];
  for (const r of dnaRecs) {
    checks.push({
      icon: r.kind === "weakness" ? "⚠️" : r.kind === "strength" ? "⭐" : "💡",
      kind: r.kind === "weakness" ? "warn" : "info",
      weight: 0,
      text: { en: r.en, he: r.he },
    });
  }

  // Expected R — calibrate from similar historical trades when possible.
  const history = historicalContextFor(trades, idea);
  const expectedR = history ? Number(history.avgReturn) : null;
  if (expectedR != null && history && history.similarTrades >= 3) {
    checks.push({
      icon: "📈", kind: "info", weight: 0,
      text: {
        en: `Expected return based on ${history.similarTrades} similar trades: ${expectedR >= 0 ? "+" : ""}${expectedR.toFixed(2)}R.`,
        he: `תשואה צפויה לפי ${history.similarTrades} עסקאות דומות: ${expectedR >= 0 ? "+" : ""}${expectedR.toFixed(2)}R.`,
      },
    });
  }

  return {
    verdict,
    confidence: Math.round(confidence),
    insights: checks,
    historicalContext: history,
    edgeMatch,
    antiEdgeMatch,
    expectedR,
    idea,
  };
};
