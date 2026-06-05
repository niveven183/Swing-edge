// ─────────────────────────────────────────────────────────────────────────────
// MonthlyReport.js — Trading DNA Monthly Report engine
//
// Pure, local, no-API analysis of a trader's performance for a single calendar
// month. Buckets CLOSED trades by their realized month (exitDate, falling back to
// entry date) and produces summary metrics, ranked strengths/weaknesses, chart
// series, action items, and an A–F grade.
//
// pnl / rMultiple are NOT stored on trades — always pass calcMetrics(trade) in.
// Insights are returned as i18n template ids (`tid`) + params so the UI can
// localize them; an English `detail` string is included as a safe fallback.
// ─────────────────────────────────────────────────────────────────────────────

const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const round = (v, d = 1) => { const p = Math.pow(10, d); return Math.round((v || 0) * p) / p; };

function parseDate(s) {
  if (!s) return null;
  const dt = new Date(s);
  return isNaN(dt.getTime()) ? null : dt;
}

// The date a trade's P&L is realized in (exit first, entry fallback).
function realizedDate(t) {
  return parseDate(t.exitDate) || parseDate(t.date);
}

function inMonth(t, month, year) {
  const d = realizedDate(t);
  return !!d && d.getMonth() === month && d.getFullYear() === year;
}

// Enrich a trade with computed { pnl, rMultiple } and a couple of derived flags.
function enrich(t, calcMetrics) {
  const m = calcMetrics ? calcMetrics(t) : { pnl: t.pnl ?? null, rMultiple: t.rMultiple ?? null };
  const pnl = typeof m.pnl === "number" ? m.pnl : 0;
  return {
    raw: t,
    ticker: t.ticker || "—",
    pnl,
    r: typeof m.rMultiple === "number" ? m.rMultiple : 0,
    win: pnl > 0,
    setup: (t.setup || "").trim() || "Unspecified",
    emotion: (t.emotionAtEntry || "").trim() || "Unspecified",
    market: (t.marketCondition || "").trim() || "Unspecified",
    followedPlan: t.followedPlan === true,
    offPlan: t.followedPlan === false,
    date: realizedDate(t),
  };
}

// Core numeric summary for a set of enriched trades.
function summarize(list) {
  const n = list.length;
  if (n === 0) return { totalTrades: 0, wins: 0, losses: 0, winRate: 0, netPnL: 0, avgR: 0, rValues: [] };
  let wins = 0, net = 0, rSum = 0;
  const rValues = [];
  for (const e of list) {
    if (e.win) wins++;
    net += e.pnl;
    rSum += e.r;
    rValues.push(e.r);
  }
  return {
    totalTrades: n,
    wins,
    losses: n - wins,
    winRate: round((wins / n) * 100),
    netPnL: round(net, 2),
    avgR: round(rSum / n, 2),
    rValues,
  };
}

// Group enriched trades by a key → [{ name, count, wins, winRate, netPnL }].
function groupBy(list, keyFn, minN = 1) {
  const map = new Map();
  for (const e of list) {
    const k = keyFn(e);
    if (k == null || k === "Unspecified") continue;
    if (!map.has(k)) map.set(k, { name: k, count: 0, wins: 0, net: 0 });
    const g = map.get(k);
    g.count++;
    if (e.win) g.wins++;
    g.net += e.pnl;
  }
  return [...map.values()]
    .filter(g => g.count >= minN)
    .map(g => ({ name: g.name, count: g.count, wins: g.wins, winRate: round((g.wins / g.count) * 100), netPnL: round(g.net, 2) }));
}

function bestWorst(groups) {
  if (!groups.length) return { best: null, worst: null };
  const sorted = [...groups].sort((a, b) => b.winRate - a.winRate || b.count - a.count);
  return { best: sorted[0], worst: sorted[sorted.length - 1] };
}

function stdDev(values) {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

// ── GRADE ────────────────────────────────────────────────────────────────────
function computeGrade(sum, disciplineRatio) {
  const winScore = clamp(sum.winRate, 0, 100);            // 40%
  const rScore = clamp(50 + sum.avgR * 40, 0, 100);       // 30%  (0R→50, +1R→90)
  const discScore = clamp(disciplineRatio * 100, 0, 100); // 20%
  const consScore = clamp(100 - stdDev(sum.rValues) * 25, 0, 100); // 10%
  const score = winScore * 0.4 + rScore * 0.3 + discScore * 0.2 + consScore * 0.1;
  let grade = "F";
  if (score >= 85) grade = "A";
  else if (score >= 70) grade = "B";
  else if (score >= 55) grade = "C";
  else if (score >= 40) grade = "D";
  return { grade, score: round(score) };
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
export function generateMonthlyReport(trades, month, year, calcMetrics) {
  const all = (trades || []).filter(t => t && t.status === "CLOSED");
  const enrichedAll = all.map(t => enrich(t, calcMetrics));

  const cur = enrichedAll.filter(e => e.date && e.date.getMonth() === month && e.date.getFullYear() === year);

  // previous calendar month
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const prev = enrichedAll.filter(e => e.date && e.date.getMonth() === prevMonth && e.date.getFullYear() === prevYear);

  const label = `${MONTHS[month]} ${year}`;
  const period = { month, year, label, monthName: MONTHS[month] };

  const sum = summarize(cur);
  const prevSum = summarize(prev);

  const MIN_TRADES = 5;
  const hasEnoughData = cur.length >= MIN_TRADES;

  // Always-available minimal shape (used by the < 5 fallback UI).
  if (!hasEnoughData) {
    return {
      period,
      hasEnoughData: false,
      minTrades: MIN_TRADES,
      summary: { totalTrades: cur.length, wins: sum.wins, losses: sum.losses, winRate: sum.winRate, netPnL: sum.netPnL, avgR: sum.avgR },
    };
  }

  // ── breakdowns ──
  const bySetup = groupBy(cur, e => e.setup, 1);
  const byEmotion = groupBy(cur, e => e.emotion, 1);
  const byMarket = groupBy(cur, e => e.market, 1);
  const byDow = groupBy(cur, e => (e.date ? DOW[e.date.getDay()] : null), 1);

  const setupRank = bestWorst(bySetup.filter(g => g.count >= 2));
  const emoRank = bestWorst(byEmotion.filter(g => g.count >= 2));
  const dowRank = bestWorst(byDow.filter(g => g.count >= 2));

  const patterns = {
    bestSetup: setupRank.best,
    worstSetup: setupRank.worst,
    bestEmotion: emoRank.best,
    worstEmotion: emoRank.worst,
    bestDayOfWeek: dowRank.best ? { day: dowRank.best.name, winRate: dowRank.best.winRate } : null,
  };

  // ── discipline / tilt ──
  const followedCount = cur.filter(e => e.followedPlan).length;
  const disciplineRatio = followedCount / cur.length;
  const tiltLosses = cur.filter(e => !e.win && (e.offPlan || /fomo|fear|greed|revenge|fomo/i.test(e.emotion))).length;

  // best win streak (chronological)
  const chrono = [...cur].sort((a, b) => (a.date?.getTime() || 0) - (b.date?.getTime() || 0));
  let streak = 0, bestStreak = 0;
  for (const e of chrono) { if (e.win) { streak++; bestStreak = Math.max(bestStreak, streak); } else streak = 0; }

  // overtrading: trades per day
  const perDay = new Map();
  for (const e of cur) {
    if (!e.date) continue;
    const k = e.date.toISOString().slice(0, 10);
    perDay.set(k, (perDay.get(k) || 0) + 1);
  }
  const dayCounts = [...perDay.values()];
  const maxDay = dayCounts.length ? Math.max(...dayCounts) : 0;
  const avgDay = dayCounts.length ? round(dayCounts.reduce((a, b) => a + b, 0) / dayCounts.length, 1) : 0;

  // ── STRENGTHS (max 3) ──
  const strengths = [];
  if (patterns.bestSetup && patterns.bestSetup.winRate >= 55) {
    const s = patterns.bestSetup;
    strengths.push({ tid: "mr_s_bestSetup", cat: "mr_cat_setup", params: { setup: s.name, winRate: s.winRate, trades: s.count }, data: `${s.winRate}% · ${s.count}`, detail: `${s.name} is your edge — ${s.winRate}% win rate over ${s.count} trades` });
  }
  if (patterns.bestEmotion && patterns.bestEmotion.winRate >= 55) {
    const s = patterns.bestEmotion;
    strengths.push({ tid: "mr_s_bestEmotion", cat: "mr_cat_emotion", params: { emotion: s.name, winRate: s.winRate }, data: `${s.winRate}%`, detail: `You trade best when ${s.name} — ${s.winRate}% win rate` });
  }
  if (disciplineRatio >= 0.7) {
    const pct = Math.round(disciplineRatio * 100);
    strengths.push({ tid: "mr_s_discipline", cat: "mr_cat_discipline", params: { pct }, data: `${pct}%`, detail: `Strong discipline — you followed your plan on ${pct}% of trades` });
  }
  if (sum.avgR > 0.2) {
    strengths.push({ tid: "mr_s_expectancy", cat: "mr_cat_expectancy", params: { avgR: sum.avgR }, data: `${sum.avgR}R`, detail: `Positive expectancy — averaging ${sum.avgR}R per trade` });
  }
  if (bestStreak >= 3) {
    strengths.push({ tid: "mr_s_winStreak", cat: "mr_cat_momentum", params: { n: bestStreak }, data: `×${bestStreak}`, detail: `Great momentum — a run of ${bestStreak} wins this month` });
  }
  // Guarantee at least one encouraging strength even on a rough month.
  if (strengths.length === 0) {
    strengths.push({ tid: "mr_s_showedUp", cat: "mr_cat_momentum", params: { n: cur.length }, data: `${cur.length}`, detail: `You logged ${cur.length} trades and kept a record — that's the foundation of improvement` });
  }
  const topStrengths = strengths.slice(0, 3);

  // ── WEAKNESSES (max 3) ──
  const weaknesses = [];
  if (patterns.worstSetup && patterns.worstSetup.winRate <= 45 && patterns.worstSetup !== patterns.bestSetup) {
    const w = patterns.worstSetup;
    weaknesses.push({ tid: "mr_w_worstSetup", cat: "mr_cat_setup", params: { setup: w.name, winRate: w.winRate, trades: w.count }, data: `${w.winRate}% · ${w.count}`, detail: `${w.name} struggled — only ${w.winRate}% win rate over ${w.count} trades` });
  }
  if (patterns.worstEmotion && patterns.worstEmotion.winRate <= 45 && patterns.worstEmotion !== patterns.bestEmotion) {
    const w = patterns.worstEmotion;
    weaknesses.push({ tid: "mr_w_worstEmotion", cat: "mr_cat_emotion", params: { emotion: w.name, winRate: w.winRate }, data: `${w.winRate}%`, detail: `Trading while ${w.name} hurt results — ${w.winRate}% win rate` });
  }
  if (maxDay >= 4 && maxDay >= avgDay * 2) {
    weaknesses.push({ tid: "mr_w_overtrading", cat: "mr_cat_overtrading", params: { max: maxDay, avg: avgDay }, data: `${maxDay}/day`, detail: `Heavy day detected — ${maxDay} trades in one day vs ${avgDay} average` });
  }
  if (tiltLosses >= 2) {
    weaknesses.push({ tid: "mr_w_tilt", cat: "mr_cat_tilt", params: { n: tiltLosses }, data: `${tiltLosses}`, detail: `${tiltLosses} losing trades came from FOMO or breaking your plan` });
  }
  if (disciplineRatio < 0.5) {
    const pct = Math.round(disciplineRatio * 100);
    weaknesses.push({ tid: "mr_w_discipline", cat: "mr_cat_discipline", params: { pct }, data: `${pct}%`, detail: `Plan adherence slipped — followed on only ${pct}% of trades` });
  }
  if (weaknesses.length === 0) {
    weaknesses.push({ tid: "mr_w_refine", cat: "mr_cat_consistency", params: {}, data: "↗", detail: "Few clear weaknesses — focus on scaling what already works" });
  }
  const topWeaknesses = weaknesses.slice(0, 3);

  // ── ACTION ITEMS (3) ──
  const actionItems = [];
  if (patterns.worstSetup && patterns.worstSetup.winRate <= 45 && patterns.worstSetup !== patterns.bestSetup) {
    actionItems.push({ priority: "high", tid: "mr_a_avoidSetup", params: { setup: patterns.worstSetup.name }, action: `Pause or refine ${patterns.worstSetup.name}`, reason: `Low win rate this month (${patterns.worstSetup.winRate}%)` });
  }
  if (tiltLosses >= 2) {
    actionItems.push({ priority: "high", tid: "mr_a_tilt", params: {}, action: "Cut size after a loss", reason: `${tiltLosses} losses came from tilt/off-plan trades` });
  }
  if (disciplineRatio < 0.7) {
    actionItems.push({ priority: "medium", tid: "mr_a_discipline", params: {}, action: "Follow your written plan on every entry", reason: `Plan adherence was ${Math.round(disciplineRatio * 100)}%` });
  }
  if (patterns.bestSetup) {
    actionItems.push({ priority: "medium", tid: "mr_a_leanSetup", params: { setup: patterns.bestSetup.name }, action: `Lean into ${patterns.bestSetup.name}`, reason: `Your strongest setup (${patterns.bestSetup.winRate}%)` });
  }
  if (patterns.worstEmotion && patterns.worstEmotion.winRate <= 45) {
    actionItems.push({ priority: "low", tid: "mr_a_manageEmotion", params: { emotion: patterns.worstEmotion.name }, action: `Add a check before entering while ${patterns.worstEmotion.name}`, reason: `Weakest mindset (${patterns.worstEmotion.winRate}%)` });
  }
  actionItems.push({ priority: "low", tid: "mr_a_consistency", params: {}, action: "Keep journaling every trade", reason: "Consistency compounds your edge" });
  const topActions = actionItems.slice(0, 3);

  // ── CHARTS ──
  const dailyMap = new Map();
  for (const e of cur) {
    if (!e.date) continue;
    const k = e.date.toISOString().slice(0, 10);
    dailyMap.set(k, (dailyMap.get(k) || 0) + e.pnl);
  }
  const dailyPnL = [...dailyMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, pnl]) => ({ date: date.slice(5), pnl: round(pnl, 2) }));

  const weekMap = new Map();
  for (const e of cur) {
    if (!e.date) continue;
    const wk = Math.ceil(e.date.getDate() / 7); // 1..5 within month
    if (!weekMap.has(wk)) weekMap.set(wk, { wins: 0, count: 0 });
    const g = weekMap.get(wk);
    g.count++;
    if (e.win) g.wins++;
  }
  const winRateByWeek = [...weekMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([wk, g]) => ({ week: `W${wk}`, rate: round((g.wins / g.count) * 100) }));

  const setupBreakdown = [...bySetup]
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .map(g => ({ setup: g.name, count: g.count, winRate: g.winRate }));

  // ── SUMMARY (+ deltas) ──
  const sortedByPnl = [...cur].sort((a, b) => b.pnl - a.pnl);
  const bestTrade = sortedByPnl[0] ? { ticker: sortedByPnl[0].ticker, pnl: round(sortedByPnl[0].pnl, 2) } : null;
  const worstTrade = sortedByPnl[sortedByPnl.length - 1] ? { ticker: sortedByPnl[sortedByPnl.length - 1].ticker, pnl: round(sortedByPnl[sortedByPnl.length - 1].pnl, 2) } : null;

  const summary = {
    totalTrades: sum.totalTrades,
    wins: sum.wins,
    losses: sum.losses,
    winRate: sum.winRate,
    netPnL: sum.netPnL,
    avgR: sum.avgR,
    bestTrade,
    worstTrade,
    vsLastMonth: {
      hasPrev: prev.length > 0,
      winRate: round(sum.winRate - prevSum.winRate),
      netPnL: round(sum.netPnL - prevSum.netPnL, 2),
      trades: sum.totalTrades - prevSum.totalTrades,
    },
  };

  const { grade, score } = computeGrade(sum, disciplineRatio);

  return {
    period,
    hasEnoughData: true,
    minTrades: MIN_TRADES,
    summary,
    strengths: topStrengths,
    weaknesses: topWeaknesses,
    patterns,
    charts: { dailyPnL, winRateByWeek, setupBreakdown },
    actionItems: topActions,
    grade,
    gradeScore: score,
  };
}

// Returns { month, year } of the month with the most CLOSED trades — used by the
// ?testReport=1 QA shortcut so the modal can be exercised regardless of today's date.
export function findBestMonth(trades, calcMetrics) {
  const all = (trades || []).filter(t => t && t.status === "CLOSED").map(t => enrich(t, calcMetrics));
  const counts = new Map();
  for (const e of all) {
    if (!e.date) continue;
    const key = `${e.date.getFullYear()}-${e.date.getMonth()}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  if (!counts.size) {
    const now = new Date();
    return { month: now.getMonth(), year: now.getFullYear(), count: 0 };
  }
  let bestKey = null, bestCount = -1;
  for (const [k, c] of counts) { if (c > bestCount) { bestCount = c; bestKey = k; } }
  const [y, m] = bestKey.split("-").map(Number);
  return { month: m, year: y, count: bestCount };
}

export { MONTHS as MONTH_NAMES };
