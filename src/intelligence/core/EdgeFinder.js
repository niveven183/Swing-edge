// ─── EDGE FINDER ─────────────────────────────────────────────────────────────
// Mines the best and worst combinations of { setup × day × emotion × market ×
// R/R } from the closed trade history. Returns Top Edges and Anti-Edges.

import {
  getClosed, isWin, rOf, avgR, wilsonLowerBound, dayOfWeek, rrBucket,
  MIN_SAMPLE_EDGE,
} from "../utils/statisticalModels.js";

// The dimensions we explore. Keep the combination space small enough that a
// single user's history can produce meaningful samples.
const DIMENSIONS = [
  { key: "setup",          get: t => t.setup || null },
  { key: "day",            get: t => dayOfWeek(t) },
  { key: "emotion",        get: t => t.emotionAtEntry || null },
  { key: "marketCondition",get: t => t.marketCondition || null },
  { key: "rr",             get: t => rrBucket(t) },
];

// Cartesian combinations of 2..N dimensions → keys used for grouping.
// We cap combination size at 4 to keep the pattern space tractable.
const combos = (items, size) => {
  if (size === 0) return [[]];
  if (!items.length) return [];
  const [head, ...tail] = items;
  const withHead = combos(tail, size - 1).map(c => [head, ...c]);
  const withoutHead = combos(tail, size);
  return [...withHead, ...withoutHead];
};

const groupKey = (trade, dims) =>
  dims.map(d => d.get(trade)).some(v => v == null)
    ? null
    : dims.map(d => `${d.key}:${d.get(trade)}`).join(" + ");

const prettyPattern = (key) => key.split(" + ").map(s => s.split(":")[1]).join(" + ");

const scorePattern = (list) => {
  const wins = list.filter(isWin).length;
  const n = list.length;
  return {
    n,
    wins,
    winRate: n ? wins / n : 0,
    avgR: avgR(list),
    // Ranking metric: Wilson-lower-bound on win rate × expectancy signal.
    score: wilsonLowerBound(wins, n) * (1 + Math.max(0, avgR(list))),
    antiScore: (1 - wilsonLowerBound(wins, n)) * (1 + Math.max(0, -avgR(list))),
  };
};

// Find every pattern meeting the minimum sample threshold.
const enumeratePatterns = (trades, dimSize = 3) => {
  const closed = getClosed(trades);
  const dimSubsets = [
    ...combos(DIMENSIONS, 2),
    ...combos(DIMENSIONS, 3),
    ...(dimSize >= 4 ? combos(DIMENSIONS, 4) : []),
  ];

  const buckets = new Map();
  for (const dims of dimSubsets) {
    for (const trade of closed) {
      const k = groupKey(trade, dims);
      if (!k) continue;
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k).push(trade);
    }
  }

  const results = [];
  for (const [key, list] of buckets.entries()) {
    if (list.length < MIN_SAMPLE_EDGE) continue;
    results.push({ key, ...scorePattern(list) });
  }
  return results;
};

// Build a human message from the pattern result, in both languages.
const messagesFor = (result, sign) => {
  const pretty = prettyPattern(result.key);
  const wr = Math.round(result.winRate * 100);
  if (sign === "edge") {
    return {
      en: `Pattern "${pretty}" → ${wr}% win rate, avg ${result.avgR.toFixed(2)}R across ${result.n} trades. Lean into it.`,
      he: `הדפוס "${pretty}" → ${wr}% הצלחה, ${result.avgR.toFixed(2)}R ממוצע ב-${result.n} עסקאות. זה ה-Edge שלך.`,
    };
  }
  return {
    en: `Avoid "${pretty}" — ${wr}% win rate, ${result.avgR.toFixed(2)}R avg across ${result.n} trades.`,
    he: `הימנע מ-"${pretty}" — ${wr}% הצלחה, ${result.avgR.toFixed(2)}R ב-${result.n} עסקאות.`,
  };
};

// ─── PUBLIC API ──────────────────────────────────────────────────────────────
export const findEdges = (trades, { topK = 3 } = {}) => {
  const results = enumeratePatterns(trades, 3);
  if (!results.length) return { edges: [], antiEdges: [], sampleSize: 0 };

  const edges = [...results]
    .sort((a, b) => b.score - a.score || b.avgR - a.avgR)
    .slice(0, topK)
    .map(r => ({
      pattern: prettyPattern(r.key),
      key: r.key,
      winRate: Math.round(r.winRate * 100),
      trades: r.n,
      avgR: Number(r.avgR.toFixed(2)),
      confidence: Number(r.score.toFixed(3)),
      message: messagesFor(r, "edge"),
    }));

  const antiEdges = [...results]
    .sort((a, b) => b.antiScore - a.antiScore || a.avgR - b.avgR)
    .filter(r => r.winRate < 0.5 || r.avgR < 0)
    .slice(0, topK)
    .map(r => ({
      pattern: prettyPattern(r.key),
      key: r.key,
      winRate: Math.round(r.winRate * 100),
      trades: r.n,
      avgR: Number(r.avgR.toFixed(2)),
      message: messagesFor(r, "anti"),
    }));

  return {
    sampleSize: getClosed(trades).length,
    edges,
    antiEdges,
    topEdge: edges[0] || null,
    topAntiEdge: antiEdges[0] || null,
  };
};

// How well does a proposed trade idea match an existing edge?
// Returns { matched: boolean, edge|null, score: 0..1 }.
export const matchIdeaToEdge = (edgeReport, idea) => {
  if (!edgeReport || !edgeReport.edges || !edgeReport.edges.length || !idea) {
    return { matched: false, edge: null, score: 0 };
  }
  const ideaKeyParts = new Set([
    idea.setup            && `setup:${idea.setup}`,
    idea.day              && `day:${idea.day}`,
    idea.emotionAtEntry   && `emotion:${idea.emotionAtEntry}`,
    idea.marketCondition  && `marketCondition:${idea.marketCondition}`,
    idea.rr               && `rr:${idea.rr}`,
  ].filter(Boolean));

  let best = { matched: false, edge: null, score: 0 };
  for (const edge of edgeReport.edges) {
    const parts = edge.key.split(" + ");
    const matches = parts.filter(p => ideaKeyParts.has(p)).length;
    if (matches === parts.length && parts.length > 0) {
      return { matched: true, edge, score: 1 };
    }
    const score = parts.length ? matches / parts.length : 0;
    if (score > best.score) best = { matched: score >= 0.75, edge, score };
  }
  return best;
};

export const matchIdeaToAntiEdge = (edgeReport, idea) => {
  if (!edgeReport || !edgeReport.antiEdges || !edgeReport.antiEdges.length || !idea) {
    return { matched: false, antiEdge: null };
  }
  const ideaKeyParts = new Set([
    idea.setup            && `setup:${idea.setup}`,
    idea.day              && `day:${idea.day}`,
    idea.emotionAtEntry   && `emotion:${idea.emotionAtEntry}`,
    idea.marketCondition  && `marketCondition:${idea.marketCondition}`,
    idea.rr               && `rr:${idea.rr}`,
  ].filter(Boolean));

  for (const anti of edgeReport.antiEdges) {
    const parts = anti.key.split(" + ");
    const matches = parts.filter(p => ideaKeyParts.has(p)).length;
    if (matches === parts.length && parts.length > 0) {
      return { matched: true, antiEdge: anti };
    }
  }
  return { matched: false, antiEdge: null };
};
