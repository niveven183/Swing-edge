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
//   metrics:   { winRate, avgR, expectancyR, profitFactor, sharpe, kelly, streaks },
//   updatedAt
// }

import {
  getClosed, isWin, pnlOf, rValues, rStats, winRate, avgR, expectedValueR,
  profitFactor, sharpeR, streaks, kellyFraction, groupBy, dayOfWeek,
  wilsonLowerBound, to100, MIN_SAMPLE_R, stddev,
  MIN_SAMPLE_DNA, MIN_SAMPLE_PATTERNS, MIN_SAMPLE_FORECAST, MIN_SAMPLE_ML,
} from "../utils/statisticalModels.js";
import { disciplineRate, emotionPerformance } from "../utils/psychologyPatterns.js";
import { qstars } from "../../utils.js";
import { deriveInstrumentCurrency, matchesCapital } from "../../lib/instrumentCurrency.js";
import { isFollowedPlan } from "../../utils.js";

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
  const { avg, n: rN } = rStats(list);
  return {
    n,
    wins,
    winRate: n ? wins / n : 0,
    avgR: avg,               // number | null
    rSampleSize: rN,
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

  // `?? 0` is a declared neutral for a tiebreaker, not a measurement: a group
  // with no measurable R is ordered on Wilson confidence alone. The filters
  // below compare against null deliberately — null is neither > 0 nor < 0, so
  // an unmeasurable group qualifies on its win rate or not at all.
  const strengths = [...entries]
    .sort((a, b) => b.confidence - a.confidence || (b.avgR ?? 0) - (a.avgR ?? 0))
    .slice(0, topK)
    .filter(e => e.winRate > 0.5 || (e.avgR != null && e.avgR > 0));

  const weaknesses = [...entries]
    .sort((a, b) => a.confidence - b.confidence || (a.avgR ?? 0) - (b.avgR ?? 0))
    .slice(0, topK)
    .filter(e => e.winRate < 0.5 || (e.avgR != null && e.avgR < 0));

  return { strengths, weaknesses };
};

// A risk % is riskDollars / capital. When the two are denominated in different
// currencies the quotient is not a percentage, it is an exchange rate wearing a
// % sign — the same unit mismatch the risk board already gates with `sameCcy`.
// `capitalCurrency` is optional and omitting it reproduces the currency-blind
// behaviour EXACTLY, so a single-currency journal is byte-identical. There is
// deliberately no conversion here: this engine holds no rate table, and a
// number marked unmeasured is worth more than a number quietly guessed.
//
// ⚠️ הצד השמאלי הוא מטבע ה**נייר** הנגזר, ⛔ לא `currencyOf(t)`. הביטוי הישן
// קרא את התווית ש-`SwingEdge_App.jsx:2457` חתם מהעדפת החשבון, ולכן החזיר
// `true` בהגדרה — שער שאינו יכול להיכשל אינו שער.
const measurableRisk = (closed, capitalCurrency) =>
  capitalCurrency == null
    ? closed
    : closed.filter(t => matchesCapital(deriveInstrumentCurrency(t), capitalCurrency));

// ─── STYLE INFERENCE ─────────────────────────────────────────────────────────
// Pragmatic heuristics — translates behaviour into a 0..100 "style" band.
const inferStyle = (trades, capitalCurrency = null) => {
  const closed = getClosed(trades);
  if (!closed.length) {
    return { aggression: 50, patience: 50, discipline: 50, tilt: 0 };
  }

  // Aggression: average portfolio risk taken per trade, relative to 1% baseline.
  // Only the risk population is currency-gated — patience, discipline and tilt
  // below count behaviour, not money, and a shekel trade is behaviour too.
  const risks = measurableRisk(closed, capitalCurrency)
    .map(t => {
      const entry = Number(t.entry);
      const stop = Number(t.stop);
      const shares = Number(t.shares);
      if (!Number.isFinite(entry) || !Number.isFinite(stop) || !Number.isFinite(shares)) return 0;
      const riskPerShare = Math.abs(entry - stop);
      // No capital recorded at entry → UNMEASURED, not DEFAULT_CAPITAL. The
      // default turned "we don't know" into a confident 2,500 and scored the
      // trader's aggression against a number nobody ever entered.
      const capital = Number(t._capitalAtEntry);
      if (!Number.isFinite(capital) || capital <= 0) return 0;
      return (riskPerShare * shares) / capital;
    })
    .filter(r => r > 0 && Number.isFinite(r));
  const avgRisk = risks.length ? risks.reduce((s, x) => s + x, 0) / risks.length : 0.01;
  const aggression = to100(Math.min(1, avgRisk / 0.02)); // 2% = fully aggressive

  // Patience: prefer to close on plan vs. panic out. Use exitReason & followedPlan.
  const planCloses = closed.filter(t => isFollowedPlan(t.followedPlan)).length;
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
// B-156: each of the four scores has its own zero-population condition — the
// SAME condition that already existed to trigger the fabricated 50/100
// fallback, now returning null instead. No new thresholds are invented here
// (PLAN-B156.md §1); `closed.length===0` is no longer a single shared
// early-return because the four populations can be empty independently (e.g.
// a non-empty journal with zero measurable risk — §2 below).
const computeScores = (trades, capitalCurrency = null) => {
  const closed = getClosed(trades);

  // Risk score — 100 means always within the 1% rule, falls as risk drifts up.
  // `risks.length===0` is "no denominator" in the literal sense (CLAUDE.md
  // §2) — it used to fall through a `: 0.01` placeholder average and print a
  // confident 100 for a population of zero. Unifies the closed-journal-empty
  // path (old :141) and the no-measurable-risk path (old :156) into one.
  const risks = measurableRisk(closed, capitalCurrency)
    .map(t => {
      const entry = Number(t.entry);
      const stop = Number(t.stop);
      const shares = Number(t.shares);
      if (!Number.isFinite(entry) || !Number.isFinite(stop) || !Number.isFinite(shares)) return 0;
      const capital = Number(t._capitalAtEntry);
      if (!Number.isFinite(capital) || capital <= 0) return 0;
      return (Math.abs(entry - stop) * shares) / capital;
    })
    .filter(r => r > 0 && Number.isFinite(r));
  const risk = risks.length
    ? to100(Math.max(0, 1 - Math.max(0, (risks.reduce((s, x) => s + x, 0) / risks.length) - 0.01) * 50))
    : null;

  // Discipline — share of trades where the plan was followed. disciplineRate
  // already returns null on an empty population; the old `== null ? 50` was
  // itself the mistranslation from "unmeasured" to "exactly average".
  const dRate = disciplineRate(closed);
  const discipline = dRate == null ? null : to100(dRate);

  // Consistency — penalise high variance of R-outcomes, over the measurable
  // population only. A null R entering this sum used to read as 0 and pull the
  // variance down, scoring an unmeasurable book as highly consistent.
  //
  // B-156 §7 (side-by-side, decided 20.08): this used to reimplement variance
  // inline as POPULATION variance (÷n), while GrowthTracker.consistencyScore
  // calls the shared `stddev()` from statisticalModels.js, which is SAMPLE
  // variance (÷n−1, Bessel's correction). On the same 2-trade fixture the two
  // engines produced different numbers (33 vs 6) even after the threshold
  // was unified — the threshold was one symptom, the inline reimplementation
  // was the actual drift (CLAUDE.md §13, "single source of truth… inline
  // calculation = drift"). `stddev()` is already the convention every other
  // consumer uses (e.g. `sharpeR`); TradeDNA now calls it too instead of
  // carrying its own copy of the formula.
  const rs = rValues(closed);
  let consistency = null;
  if (rs.length >= MIN_SAMPLE_R) {
    const sd = stddev(rs);
    consistency = to100(Math.max(0, 1 - Math.min(1, sd / 3)));
  }

  // Growth — rolling equity slope over the last 20 measurable closed trades.
  // A single null in this cumulative sum turned the whole curve to NaN. With
  // zero R-values there is no slope to measure — the old formula happened to
  // converge on 50 when series.length===1, which was never a deliberate
  // "unmeasured" signal, just an accident of the arithmetic.
  const recentR = rValues(closed).slice(-20);
  let growth = null;
  if (recentR.length) {
    const startEquity = 1;
    let balance = startEquity;
    const series = [startEquity];
    for (const r of recentR) series.push(balance += r);
    const slope = (series[series.length - 1] - series[0]) / series.length;
    growth = to100(0.5 + Math.max(-0.5, Math.min(0.5, slope / 2)));
  }

  return { risk, discipline, consistency, growth };
};

// ─── PUBLIC API ──────────────────────────────────────────────────────────────
// Single-entry cache: avoids recomputing for the same trade set.
let _dnaCache = { key: null, result: null };

export const calculateTradeDNA = (allTrades = [], capitalCurrency = null) => {
  // The key must satisfy TWO properties at once, because this single-entry slot
  // is shared across callers:
  //   (a) Mutation-sensitivity — closing or editing a trade (status / exit /
  //       entry / stop / shares) changes the DNA, but leaves length + first/last
  //       date + last id untouched. A length+date-only key returned a STALE memo
  //       after a close (Dashboard 31 vs DNA 30). So we fold in closedCount plus
  //       a cheap per-trade hash of the DNA-relevant fields.
  //   (b) People-distinction — the mentor dashboard computes a mentee's DNA
  //       through this same function (App: menteeDNA), so the key must never let
  //       one person's trades collide with another's in the shared slot. The
  //       first/last date + last id terms are kept, and the id-inclusive hash
  //       makes a cross-person collision effectively impossible.
  const _last = allTrades[allTrades.length - 1];
  let _sig = 0, _closed = 0;
  for (const t of allTrades) {
    if (t.status === "CLOSED" || t.exit != null || t.exitPrice != null) _closed++;
    // ⚠️ `ticker` נכנס לחתימה כי אוכלוסיית הסיכון נגזרת ממנו מאז גל מטבע
    // הנייר. בלעדיו שני יומנים שנבדלים **רק** בטיקר מקבלים מפתח זהה, והמשבצת
    // המשותפת מחזירה את ה-DNA של האחר — בשקט.
    const s = `${t.id}|${t.ticker ?? ''}|${t.status}|${t.exitPrice ?? t.exit ?? ''}|${t.entry}|${t.stop}|${t.shares}`;
    for (let i = 0; i < s.length; i++) _sig = (_sig * 31 + s.charCodeAt(i)) | 0;
  }
  //   (c) Currency-sensitivity — the risk population is gated by
  //       `capitalCurrency`, so flipping it changes the scores while every term
  //       above stays identical. It has to be in the key.
  const _cacheKey = `${allTrades.length}_${_closed}_${allTrades[0]?.date || ''}_${_last?.date || ''}_${_last?.id || ''}_${_sig}_${capitalCurrency || ''}`;
  if (_dnaCache.key === _cacheKey && _dnaCache.result !== null) return _dnaCache.result;

  const closed = getClosed(allTrades);
  const n = closed.length;

  const setupsRank       = rankGroups(closed, t => t.setup);
  const emotionsRank     = rankGroups(closed, t => t.emotionAtEntry);
  const marketsRank      = rankGroups(closed, t => t.marketCondition);
  const daysRank         = rankGroups(closed, dayOfWeek, { minN: 2 });
  const entryQualityRank = rankGroups(closed, t => { const q = qstars(t.entryQuality); return q ? `${q}★` : null; });

  const result = {
    sampleSize: n,
    totalTrades: (allTrades || []).length,
    maturity: maturityFor(n),
    scores: computeScores(closed, capitalCurrency),
    style: inferStyle(closed, capitalCurrency),
    strengths: {
      setups:        setupsRank.strengths,
      emotions:      emotionsRank.strengths,
      markets:       marketsRank.strengths,
      daysOfWeek:    daysRank.strengths,
      entryQuality:  entryQualityRank.strengths,
    },
    weaknesses: {
      setups:        setupsRank.weaknesses,
      emotions:      emotionsRank.weaknesses,
      markets:       marketsRank.weaknesses,
      daysOfWeek:    daysRank.weaknesses,
      entryQuality:  entryQualityRank.weaknesses,
    },
    metrics: {
      winRate:      winRate(closed),
      avgR:         avgR(closed),          // number | null
      rSampleSize:  rValues(closed).length,
      expectancyR:  expectedValueR(closed),
      profitFactor: profitFactor(closed),
      sharpe:       sharpeR(closed),
      kelly:        kellyFraction(closed),
      streaks:      streaks(closed),
      emotions:     emotionPerformance(closed),
    },
    updatedAt: new Date().toISOString(),
  };

  _dnaCache = { key: _cacheKey, result };
  return result;
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
