// ─── TRADE DNA ───────────────────────────────────────────────────────────────
// A live-updating profile of the trader: strengths, weaknesses, style, scores.
//
// Output shape (stable contract for the rest of the app):
// {
//   sampleSize, maturity: "seed"|"learning"|"established"|"expert",
//   scores: { risk, discipline, consistency, growth },
//   style: { aggression, patience, discipline, tilt },
//   strengths: { setups:[], emotions:[], markets:[], daysOfWeek:[] },
//   weaknesses:{ setups:[], emotions:[], markets:[], daysOfWeek:[] },
//   metrics:   { winRate, avgR, expectancy, profitFactor, sharpe, kelly, streaks },
//   updatedAt
// }

import {
  getClosed, isWin, pnlOf, rOf, winRate, avgR, expectedValueR,
  profitFactor, sharpeR, streaks, kellyFraction, groupBy, dayOfWeek,
  wilsonLowerBound, to100,
  MIN_SAMPLE_DNA, MIN_SAMPLE_PATTERNS, MIN_SAMPLE_FORECAST, MIN_SAMPLE_ML,
} from "../utils/statisticalModels.js";
import { disciplineRate, emotionPerformance } from "../utils/psychologyPatterns.js";

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const maturityFor = (n) => {
  if (n >= MIN_SAMPLE_ML) return "expert";
  if (n >= MIN_SAMPLE_FORECAST) return "established";
  if (n >= MIN_SAMPLE_PATTERNS) return "learning";
  return "seed";
};

// Score a grouping key (e.g. setup name) by Wilson-weighted win rate.
const scoreGroup = (list) => {
  const wins = list.filter(isWin).length;
  const n = list.length;
  return {
    n,
    wins,
    winRate: n ? wins / n : 0,
    avgR: avgR(list),
    totalPnl: list.reduce((s, t) => s + pnlOf(t), 0),
    confidence: wilsonLowerBound(wins, n),
  };
};

// Produce ranked { strengths, weaknesses } lists for a grouping.
const rankGroups = (trades, keyFn, { minN = 3, topK = 3 } = {}) => {
  const groups = groupBy(trades, keyFn);
  const entries = Object.entries(groups)
    .filter(([k]) => k && k !== "null" && k !== "undefined")
    .map(([k, list]) => ({ key: k, ...scoreGroup(list) }))
    .filter(e => e.n >= minN);

  const strengths = [...entries]
    .sort((a, b) => b.confidence - a.confidence || b.avgR - a.avgR)
    .slice(0, topK)
    .filter(e => e.winRate > 0.5 || e.avgR > 0);

  const weaknesses = [...entries]
    .sort((a, b) => a.confidence - b.confidence || a.avgR - b.avgR)
    .slice(0, topK)
    .filter(e => e.winRate < 0.5 || e.avgR < 0);

  return { strengths, weaknesses };
};

// ─── STYLE INFERENCE ─────────────────────────────────────────────────────────
// Pragmatic heuristics — translates behaviour into a 0..100 "style" band.
const inferStyle = (trades) => {
  const closed = getClosed(trades);
  if (!closed.length) {
    return { aggression: 50, patience: 50, discipline: 50, tilt: 0 };
  }

  // Aggression: average portfolio risk taken per trade, relative to 1% baseline.
  const risks = closed
    .map(t => {
      const riskPerShare = Math.abs(t.entry - t.stop);
      const capital = t._capitalAtEntry || 25000;
      return capital > 0 ? (riskPerShare * t.shares) / capital : 0;
    })
    .filter(r => r > 0);
  const avgRisk = risks.length ? risks.reduce((s, x) => s + x, 0) / risks.length : 0.01;
  const aggression = to100(Math.min(1, avgRisk / 0.02)); // 2% = fully aggressive

  // Patience: prefer to close on plan vs. panic out. Use exitReason & followedPlan.
  const planCloses = closed.filter(t => t.followedPlan === true).length;
  const fearCloses = closed.filter(t => t.exitReason === "Fear").length;
  const patience = to100((planCloses - fearCloses) / closed.length + 0.5);

  // Discipline: ratio that followed their plan.
  const dRate = disciplineRate(closed);
  const discipline = dRate == null ? 50 : to100(dRate);

  // Tilt propensity: how often FOMO + off-plan entries coincide with losses.
  const fomo = closed.filter(t => t.emotionAtEntry === "FOMO");
  const fomoLossRate = fomo.length ? fomo.filter(t => !isWin(t)).length / fomo.length : 0;
  const tilt = to100(fomoLossRate * (fomo.length / Math.max(closed.length, 1)) * 2);

  return { aggression, patience, discipline, tilt };
};

// ─── CORE SCORES ─────────────────────────────────────────────────────────────
const computeScores = (trades) => {
  const closed = getClosed(trades);
  if (!closed.length) {
    return { risk: 50, discipline: 50, consistency: 50, growth: 50 };
  }

  // Risk score — 100 means always within the 1% rule, falls as risk drifts up.
  const risks = closed
    .map(t => {
      const capital = t._capitalAtEntry || 25000;
      const rd = Math.abs(t.entry - t.stop) * t.shares;
      return capital > 0 ? rd / capital : 0;
    })
    .filter(r => r > 0);
  const avgRiskPct = risks.length ? risks.reduce((s, x) => s + x, 0) / risks.length : 0.01;
  const risk = to100(Math.max(0, 1 - Math.max(0, avgRiskPct - 0.01) * 50));

  // Discipline — share of trades where the plan was followed.
  const dRate = disciplineRate(closed);
  const discipline = dRate == null ? 50 : to100(dRate);

  // Consistency — penalise high variance of R-outcomes.
  const rs = closed.map(rOf);
  const meanR = rs.reduce((s, x) => s + x, 0) / rs.length;
  const variance = rs.reduce((s, x) => s + (x - meanR) ** 2, 0) / rs.length;
  const sd = Math.sqrt(variance);
  const consistency = to100(Math.max(0, 1 - Math.min(1, sd / 3)));

  // Growth — rolling equity slope over the last 20 closed trades.
  const recent = closed.slice(-20);
  const startEquity = 1;
  let balance = startEquity;
  const series = [startEquity];
  for (const t of recent) series.push(balance += rOf(t));
  const slope = series.length > 1 ? (series[series.length - 1] - series[0]) / series.length : 0;
  const growth = to100(0.5 + Math.max(-0.5, Math.min(0.5, slope / 2)));

  return { risk, discipline, consistency, growth };
};

// ─── PUBLIC API ──────────────────────────────────────────────────────────────
export const calculateTradeDNA = (allTrades = []) => {
  const closed = getClosed(allTrades);
  const n = closed.length;

  const setupsRank      = rankGroups(closed, t => t.setup);
  const emotionsRank    = rankGroups(closed, t => t.emotionAtEntry);
  const marketsRank     = rankGroups(closed, t => t.marketCondition);
  const daysRank        = rankGroups(closed, dayOfWeek, { minN: 2 });

  return {
    sampleSize: n,
    totalTrades: (allTrades || []).length,
    maturity: maturityFor(n),
    scores: computeScores(closed),
    style: inferStyle(closed),
    strengths: {
      setups:      setupsRank.strengths,
      emotions:    emotionsRank.strengths,
      markets:     marketsRank.strengths,
      daysOfWeek:  daysRank.strengths,
    },
    weaknesses: {
      setups:      setupsRank.weaknesses,
      emotions:    emotionsRank.weaknesses,
      markets:     marketsRank.weaknesses,
      daysOfWeek:  daysRank.weaknesses,
    },
    metrics: {
      winRate:      winRate(closed),
      avgR:         avgR(closed),
      expectancy:   expectedValueR(closed),
      profitFactor: profitFactor(closed),
      sharpe:       sharpeR(closed),
      kelly:        kellyFraction(closed),
      streaks:      streaks(closed),
      emotions:     emotionPerformance(closed),
    },
    updatedAt: new Date().toISOString(),
  };
};

// Incremental update: cheapest possible — just recompute from the full set.
// Kept as a named export so the orchestrator can swap in a faster path later.
export const updateDNAWithNewTrade = (_currentDNA, allTrades) =>
  calculateTradeDNA(allTrades);

// Personalised advice for a proposed trade idea, given the trader's DNA.
// idea: { setup, emotionAtEntry, marketCondition, rr }
export const getPersonalizedRecommendations = (dna, idea = {}) => {
  const recs = [];
  if (!dna || !dna.sampleSize) return recs;

  const matchInList = (list, key) => list.find(x => x.key === key);

  // Setup alignment
  if (idea.setup) {
    const strong = matchInList(dna.strengths.setups, idea.setup);
    const weak   = matchInList(dna.weaknesses.setups, idea.setup);
    if (strong) {
      recs.push({
        kind: "strength",
        key: "setup",
        score: Math.round(strong.winRate * 100),
        en: `${idea.setup} is one of your top setups — ${Math.round(strong.winRate * 100)}% win across ${strong.n} trades.`,
        he: `${idea.setup} הוא אחד הסטאפים החזקים שלך — ${Math.round(strong.winRate * 100)}% הצלחה ב-${strong.n} עסקאות.`,
      });
    } else if (weak) {
      recs.push({
        kind: "weakness",
        key: "setup",
        score: Math.round(weak.winRate * 100),
        en: `${idea.setup} is historically weak for you (${Math.round(weak.winRate * 100)}% win, ${weak.n} trades).`,
        he: `${idea.setup} היסטורית חלש אצלך — ${Math.round(weak.winRate * 100)}% הצלחה ב-${weak.n} עסקאות.`,
      });
    }
  }

  // Emotional alignment
  if (idea.emotionAtEntry) {
    const weak = matchInList(dna.weaknesses.emotions, idea.emotionAtEntry);
    if (weak) {
      recs.push({
        kind: "emotion",
        key: "emotion",
        en: `You tend to lose when trading under "${idea.emotionAtEntry}" — pause before entry.`,
        he: `היסטורית אתה מפסיד כשאתה במצב "${idea.emotionAtEntry}" — עצור לרגע לפני כניסה.`,
      });
    }
  }

  // Market regime alignment
  if (idea.marketCondition) {
    const strong = matchInList(dna.strengths.markets, idea.marketCondition);
    if (strong) {
      recs.push({
        kind: "market",
        key: "market",
        en: `Your edge holds in "${idea.marketCondition}" markets — ${Math.round(strong.winRate * 100)}% win.`,
        he: `יש לך Edge בשוק "${idea.marketCondition}" — ${Math.round(strong.winRate * 100)}% הצלחה.`,
      });
    }
  }

  return recs;
};
