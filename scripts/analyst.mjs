// scripts/analyst.mjs — SwingEdge Intelligence Analyst (runs in CI, weekly)
//
// The engine that improves the engine. A statistical feedback-loop analyst that
// compares what the DecisionCoach/MarketRegime engine PREDICTED against what
// actually happened, and surfaces ONLY statistically defensible findings.
//
// This is NOT ML on ~74 trades. It is honest statistics: every claim states its
// sample size `n` and a Wilson 95% confidence interval; nothing with n<8 is ever
// shown; demo/SIM rows are excluded (is_demo IS NOT TRUE).
//
// READ-ONLY by construction: this file issues SELECT statements exclusively, and
// every query is prefixed with `SET default_transaction_read_only = on;`. No
// write verbs (INSERT/UPDATE/DELETE/UPSERT/DROP/ALTER/TRUNCATE) appear anywhere.
// The ONLY file it may write is src/intelligence/calibration.json — and only when
// a proposal clears the high-confidence bar (n>=15 AND Wilson CI excludes 50%).
//
// The engine never persists its prediction (DecisionCoach runs client-side and
// _prediction is stripped before write), so the analyst RECONSTRUCTS each claim
// from the stored trade fields using the same parameter tables, then compares to
// the realized outcome. Mirrors data-guardian.mjs for the psql + Claude + email
// plumbing. Claude only NARRATES the deterministic stats; it never invents a number.

import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { calcTradeMetrics, holdDays, isFollowedPlan } from "../src/utils.js";
import { wilsonLowerBound, edgeScore } from "../src/intelligence/utils/statisticalModels.js";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL || "";

const now = new Date();
const DATE = now.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)

const __dirname = dirname(fileURLToPath(import.meta.url));
const CALIBRATION_PATH = join(__dirname, "..", "src", "intelligence", "calibration.json");

// Read-only guard applied to every statement (belt-and-suspenders).
const RO = "SET default_transaction_read_only = on;";

// Statistical honesty thresholds.
const MIN_N = 8;   // never surface a claim below this
const HIGH_N = 15; // machine-actionable PR proposals require at least this

// ── CURRENT ENGINE VALUES ────────────────────────────────────────────────────
// What the engine currently claims, so we can measure miscalibration. These
// mirror the hardcoded defaults the engine falls back to when calibration.json
// is empty. Only emotionWeights + regimeSizing are machine-actionable (wired via
// src/intelligence/calibration.js); the rest are advisory-only in v1.
const ENGINE = {
  // DecisionCoach.js emotionalCheck — weight per emotionAtEntry (negative = avoid).
  emotionWeights: { FOMO: -15, Confident: 6 },
  // MarketRegime.js ADVICE — position-size multiplier per regime.
  regimeSizing: { BULL_TREND: 1.0, BEAR_TREND: 0.6, CHOPPY: 0.5, HIGH_VOLATILITY: 0.5, LOW_VOLATILITY: 0.8, UNKNOWN: 1.0 },
  // MarketRegime.js ADVICE — setups the engine says to AVOID per regime.
  avoidSetups: {
    BULL_TREND: ["Breakdown", "Resistance Break"],
    BEAR_TREND: ["Breakout"],
    CHOPPY: ["Breakout", "Breakdown"],
    HIGH_VOLATILITY: [], LOW_VOLATILITY: [], UNKNOWN: [],
  },
};

// Trader-tagged marketCondition → engine regime enum (the regime proxy).
const REGIME_OF = {
  "Trending Up": "BULL_TREND",
  "Trending Down": "BEAR_TREND",
  "Sideways": "CHOPPY",
  "Volatile": "HIGH_VOLATILITY",
};

// ── psql helper (identical shape to data-guardian.mjs) ───────────────────────
// The RO prefix runs in the same -c batch as the query, so psql prints a "SET"
// command-status tag on its own line ahead of the result. Drop those tag lines
// before parsing — otherwise JSON.parse chokes on "SET\n[{...}]".
const STATUS_TAG = /^(SET|BEGIN|COMMIT|ROLLBACK)$/;
const stripStatus = (out) =>
  out.split("\n").filter((l) => !STATUS_TAG.test(l.trim()));

function psqlScalar(sql) {
  const out = execFileSync("psql", [SUPABASE_DB_URL, "-tAc", `${RO} ${sql}`], {
    encoding: "utf8",
    timeout: 20000,
    stdio: ["ignore", "pipe", "pipe"],
  });
  return stripStatus(out).join("\n").trim();
}

function psqlRows(sql) {
  const out = execFileSync("psql", [SUPABASE_DB_URL, "-tAF", "|", "-c", `${RO} ${sql}`], {
    encoding: "utf8",
    timeout: 20000,
    stdio: ["ignore", "pipe", "pipe"],
  });
  return stripStatus(out.trim()).filter(Boolean).map((line) => line.split("|"));
}

// ── statistics ───────────────────────────────────────────────────────────────

// Two-sided Wilson score interval on a win-rate proportion. The lower bound is
// the canonical wilsonLowerBound() (reused, single source of truth); the upper
// bound is its symmetric counterpart. A claim "excludes 50%" when the whole
// interval sits above or below 0.5 — that is our bar for statistical defensibility.
const round3 = (x) => Math.round(x * 1000) / 1000;
function wilson(wins, n, z = 1.96) {
  if (!n) return { lo: 0, hi: 0, phat: 0 };
  const phat = wins / n;
  const denom = 1 + (z * z) / n;
  const center = phat + (z * z) / (2 * n);
  const margin = z * Math.sqrt((phat * (1 - phat) + (z * z) / (4 * n)) / n);
  return { lo: wilsonLowerBound(wins, n, z), hi: Math.min(1, (center + margin) / denom), phat };
}
const excludes50 = (ci) => ci.lo > 0.5 || ci.hi < 0.5;

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

// Summ­arise a list of trades into an honest stat block.
function summarize(list) {
  const n = list.length;
  const wins = list.filter((t) => t.pnl > 0).length;
  const rs = list.map((t) => t.r);
  const ci = wilson(wins, n);
  return {
    n,
    wins,
    winRate: n ? Math.round((wins / n) * 100) : 0,
    expR: round3(mean(rs)),           // expectancy in R (realized)
    edge: round3(edgeScore(wins, n, mean(rs))),
    ciLo: Math.round(ci.lo * 100),
    ciHi: Math.round(ci.hi * 100),
    excludes50: excludes50(ci),
  };
}

// ── dimensions for discovery ─────────────────────────────────────────────────
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dowOf = (t) => {
  const d = new Date(String(t.date) + "T12:00:00");
  return isNaN(d.getTime()) ? null : DOW[d.getDay()];
};
const holdBucketOf = (t) => {
  const h = holdDays(t);
  if (h == null) return null;
  if (h === 0) return "0d";
  if (h <= 3) return "1-3d";
  if (h <= 10) return "4-10d";
  return "11d+";
};
const rBucketOf = (t) => {
  const r = t.r;
  if (r <= -1) return "<-1R";
  if (r < 0) return "-1..0R";
  if (r < 1) return "0..1R";
  if (r < 2) return "1..2R";
  return "2R+";
};

// ── DB load ──────────────────────────────────────────────────────────────────
function loadTrades() {
  // Learn which columns exist (schema-drift safe, mirrors the guardian).
  const cols = new Set(
    psqlRows(
      "SELECT column_name FROM information_schema.columns " +
        "WHERE table_schema = 'public' AND table_name = 'trades'"
    ).map((r) => r[0])
  );
  if (cols.size === 0) return [];
  const notDemo = cols.has("is_demo") ? "is_demo IS NOT TRUE" : "true";

  // Return one JSON blob (robust against free-text delimiters). `date` is cast to
  // text; timestamps serialise as ISO strings. Only closed, exited, real trades.
  const sql =
    `SELECT coalesce(json_agg(row_to_json(x)), '[]') FROM (` +
    `SELECT id, ticker, side, date::text AS date, entry, stop, target, exit, shares, ` +
    `setup, "marketCondition", "emotionAtEntry", "entryQuality", "followedPlan", ` +
    `"exitReason", "closedAt", "createdAt" ` +
    `FROM trades WHERE ${notDemo} AND status = 'CLOSED' AND exit IS NOT NULL` +
    `) x`;
  const raw = JSON.parse(psqlScalar(sql) || "[]");

  // Enrich with derived, canonical metrics (single source of truth: src/utils.js).
  return raw
    .map((t) => {
      const { pnl, rMultiple } = calcTradeMetrics(t);
      return { ...t, pnl, r: rMultiple };
    })
    .filter((t) => t.pnl != null && Number.isFinite(t.r));
}

// ── LAYER 1: CALIBRATION (predicted lean vs realized) ────────────────────────
function layer1Calibration(trades) {
  const gaps = [];

  // Emotion claims (machine-actionable): FOMO, Confident.
  for (const [emotion, weight] of Object.entries(ENGINE.emotionWeights)) {
    const list = trades.filter((t) => t.emotionAtEntry === emotion);
    if (list.length < MIN_N) continue;
    const s = summarize(list);
    const lean = weight < 0 ? "avoid" : "prefer";
    // Miscalibration = realized sign disagrees with the engine's lean, with signal.
    const contradicts =
      (weight < 0 && s.expR > 0 && s.excludes50) || (weight > 0 && s.expR < 0 && s.excludes50);
    gaps.push({
      kind: "emotion", key: emotion, param: `emotionWeights.${emotion}`,
      current: weight, lean, ...s, contradicts, actionable: true,
    });
  }

  // Regime-sizing intent (machine-actionable): is realized expectancy aligned
  // with how aggressively the engine sizes this regime?
  const byRegime = new Map();
  for (const t of trades) {
    const reg = REGIME_OF[t.marketCondition];
    if (!reg) continue;
    if (!byRegime.has(reg)) byRegime.set(reg, []);
    byRegime.get(reg).push(t);
  }
  for (const [reg, list] of byRegime) {
    if (list.length < MIN_N) continue;
    const s = summarize(list);
    const sizing = ENGINE.regimeSizing[reg] ?? 1.0;
    gaps.push({
      kind: "regime", key: reg, param: `regimeSizing.${reg}`,
      current: sizing, ...s,
      contradicts: (sizing <= 0.6 && s.expR > 0 && s.excludes50) ||
                   (sizing >= 1.0 && s.expR < 0 && s.excludes50),
      actionable: true,
    });
  }

  // Setup-compatibility verdict (advisory): trades the engine deemed incompatible
  // with the prevailing regime (setup in the avoid list) — did they really fail?
  const incompat = trades.filter((t) => {
    const reg = REGIME_OF[t.marketCondition];
    return reg && (ENGINE.avoidSetups[reg] || []).includes(t.setup);
  });
  if (incompat.length >= MIN_N) {
    gaps.push({ kind: "setup-compat", key: "engine-avoided", param: null,
      current: "AVOID (-10)", ...summarize(incompat), actionable: false });
  }

  return gaps;
}

// ── LAYER 2: DISCOVERY (multi-dimensional edge mining) ───────────────────────
function layer2Discovery(trades) {
  const dims = {
    setup: (t) => t.setup || null,
    emotion: (t) => t.emotionAtEntry || null,
    regime: (t) => REGIME_OF[t.marketCondition] || null,
    dow: dowOf,
    hold: holdBucketOf,
    R: rBucketOf,
  };
  const names = Object.keys(dims);

  // Enumerate 1-, 2- and 3-way combinations of dimensions. Cheap even for the
  // full cross because empty cells cost nothing; the n>=8 filter does the pruning.
  const combos = [];
  for (let i = 0; i < names.length; i++) {
    combos.push([names[i]]);
    for (let j = i + 1; j < names.length; j++) {
      combos.push([names[i], names[j]]);
      for (let k = j + 1; k < names.length; k++) combos.push([names[i], names[j], names[k]]);
    }
  }

  const cells = new Map(); // label -> trades
  let cellsTested = 0;
  for (const combo of combos) {
    const groups = new Map();
    for (const t of trades) {
      const vals = combo.map((d) => dims[d](t));
      if (vals.some((v) => v == null)) continue;
      const label = combo.map((d, idx) => `${d}=${vals[idx]}`).join(", ");
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(t);
    }
    for (const [label, list] of groups) {
      cellsTested++;
      cells.set(label, list);
    }
  }

  const findings = [];
  for (const [label, list] of cells) {
    if (list.length < MIN_N) continue;
    const s = summarize(list);
    if (!s.excludes50) continue; // only statistically defensible cells
    findings.push({ label, ...s });
  }
  // Rank by edge strength; strongest first.
  findings.sort((a, b) => Math.abs(b.winRate - 50) - Math.abs(a.winRate - 50) || b.n - a.n);
  return { cellsTested, significant: findings.length, top: findings.slice(0, 10) };
}

// ── LAYER 3: SELF-CRITIQUE (proposals ranked by impact × confidence) ─────────
function layer3Proposals(gaps, discovery) {
  const proposals = [];

  for (const g of gaps) {
    if (!g.contradicts) continue;
    const confidence = g.excludes50 ? 1 : 0.3;
    const impact = Math.abs(g.expR) * g.n;
    const highConfidence = g.actionable && g.n >= HIGH_N && g.excludes50;

    let proposed = null;
    if (g.kind === "emotion") {
      // Move the weight toward the realized R contribution, bounded to the
      // engine's own [-15, +15] envelope. e.g. FOMO at +0.4R -> +4 (from -15).
      proposed = Math.max(-15, Math.min(15, Math.round(g.expR * 10)));
      if (Math.abs(proposed - g.current) < 3) continue; // ignore noise-level moves
    } else if (g.kind === "regime") {
      // Nudge the size multiplier by the realized edge, bounded to [0.3, 1.0].
      const capped = Math.max(-0.5, Math.min(0.5, g.expR));
      proposed = Math.round(Math.max(0.3, Math.min(1.0, g.current * (1 + capped))) * 10) / 10;
      if (Math.abs(proposed - g.current) < 0.1) continue;
    } else {
      continue; // non-actionable (advisory) gaps don't become proposals
    }

    proposals.push({
      param: g.param, current: g.current, proposed,
      evidence: { n: g.n, winRate: g.winRate, ci: [g.ciLo, g.ciHi], expR: g.expR },
      expectedImpact: round3(impact),
      rank: round3(impact * confidence),
      highConfidence,
    });
  }

  proposals.sort((a, b) => b.rank - a.rank);
  return proposals;
}

// ── LAYER 4: GROWTH TRAJECTORY (rolling edge / discipline / regime-fit) ───────
function layer4Growth(trades) {
  const closedTs = (t) => new Date(t.closedAt || t.createdAt || String(t.date) + "T12:00:00").getTime();
  const sorted = [...trades].filter((t) => Number.isFinite(closedTs(t))).sort((a, b) => closedTs(a) - closedTs(b));

  // Monthly buckets.
  const months = new Map();
  for (const t of sorted) {
    const key = new Date(closedTs(t)).toISOString().slice(0, 7); // YYYY-MM
    if (!months.has(key)) months.set(key, []);
    months.get(key).push(t);
  }
  const regimeFit = (list) => {
    const tagged = list.filter((t) => REGIME_OF[t.marketCondition]);
    if (!tagged.length) return null;
    const fit = tagged.filter((t) => !(ENGINE.avoidSetups[REGIME_OF[t.marketCondition]] || []).includes(t.setup));
    return Math.round((fit.length / tagged.length) * 100);
  };
  const series = [...months.entries()].map(([m, list]) => ({
    month: m,
    n: list.length,
    expR: round3(mean(list.map((t) => t.r))),
    discipline: Math.round((list.filter((t) => isFollowedPlan(t.followedPlan)).length / list.length) * 100),
    regimeFit: regimeFit(list),
  }));

  // Overall expectancy trend = sign of the slope across monthly expectancy.
  const slope = (ys) => {
    const n = ys.length;
    if (n < 2) return 0;
    const xs = ys.map((_, i) => i);
    const mx = mean(xs), my = mean(ys);
    const num = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0);
    const den = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
    return den ? num / den : 0;
  };
  const expSlope = slope(series.map((s) => s.expR));
  const trend = expSlope > 0.02 ? "improving" : expSlope < -0.02 ? "decaying" : "flat";

  // Rolling-20: latest window vs the one before it.
  const roll = (arr, field) => (arr.length ? round3(mean(arr.map((t) => (field === "r" ? t.r : isFollowedPlan(t.followedPlan) ? 1 : 0)))) : null);
  const last20 = sorted.slice(-20), prev20 = sorted.slice(-40, -20);
  const rolling = {
    expR: { last: roll(last20, "r"), prev: roll(prev20, "r") },
    discipline: { last: roll(last20, "d"), prev: roll(prev20, "d") },
  };

  return { series, trend, expSlope: round3(expSlope), rolling };
}

// ── Claude composer (Hebrew narration of deterministic stats) ────────────────
async function composeWithClaude(facts) {
  if (!ANTHROPIC_API_KEY) return null;
  const SYS = [
    "אתה 'האנליסט' של אפליקציית מסחר בשם SwingEdge, המדווח למפתח/סוחר יחיד (Niv).",
    "אתה מנתח סטטיסטי שמשווה מה שהמנוע חזה מול מה שקרה בפועל, ומציע כיולים.",
    "כתוב דוח שבועי בעברית בלבד, טקסט רגיל (ללא Markdown, ללא JSON, ללא כוכביות).",
    "השתמש אך ורק במספרים שסופקו ב-JSON. אסור בהחלט להמציא נתונים או להעריך מספרים.",
    "לכל טענה ציין את גודל המדגם n ואת רווח הסמך (CI). אם אין ממצאים מובהקים — אמור זאת בכנות.",
    "מבנה: (1) שורת פסק-דין ראשית. (2) פערי כיול מובילים. (3) תגליות מובילות.",
    "(4) הצעות מדורגות לכיול המנוע. (5) מגמת צמיחה. היה תמציתי ומקצועי, ללא סיסמאות.",
    "אל תכלול סודות, טוקנים או מפתחות.",
  ].join(" ");
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1600,
        system: SYS,
        messages: [
          { role: "user", content: "הרכב את הדוח השבועי מהעובדות המחושבות (JSON):\n\n" + JSON.stringify(facts, null, 2) },
        ],
      }),
    });
    if (!r.ok) {
      console.error(`::warning::Anthropic API HTTP ${r.status} — using deterministic Hebrew fallback`);
      return null;
    }
    const data = await r.json();
    return data?.content?.[0]?.text?.trim() || null;
  } catch {
    console.error("::warning::Anthropic API call failed — using deterministic Hebrew fallback");
    return null;
  }
}

// ── deterministic Hebrew fallback ────────────────────────────────────────────
function fallbackHe(facts) {
  const L = [];
  L.push(`🧠 SwingEdge — ניתוח שבועי (${DATE})`);
  L.push("");
  if (facts.sampleSize < MIN_N) {
    L.push(`מדגם קטן מדי לניתוח מובהק (${facts.sampleSize} עסקאות סגורות). אין ממצאים להצגה.`);
    return L.join("\n");
  }
  L.push(`בסיס הנתונים: ${facts.sampleSize} עסקאות סגורות (ללא דמו). מגמת צמיחה: ${heTrend(facts.growth.trend)}.`);
  L.push("");
  L.push("פערי כיול:");
  const gaps = facts.calibration.filter((g) => g.contradicts);
  if (!gaps.length) L.push("• לא נמצאו פערי כיול מובהקים (n≥8 ו-CI שאינו כולל 50%).");
  for (const g of gaps) {
    L.push(`• ${g.key}: המנוע כיום ${g.kind === "emotion" ? `משקל ${g.current}` : `סיזינג ${g.current}`}, בפועל ` +
      `winrate ${g.winRate}% (n=${g.n}, CI ${g.ciLo}-${g.ciHi}%), תוחלת ${g.expR}R.`);
  }
  L.push("");
  L.push(`תגליות (מתוך ${facts.discovery.cellsTested} תאים שנבדקו, ${facts.discovery.significant} מובהקים):`);
  if (!facts.discovery.top.length) L.push("• אין תאים מובהקים (n≥8 ו-CI שאינו כולל 50%).");
  for (const d of facts.discovery.top.slice(0, 5)) {
    L.push(`• ${d.label}: winrate ${d.winRate}% (n=${d.n}, CI ${d.ciLo}-${d.ciHi}%), תוחלת ${d.expR}R.`);
  }
  L.push("");
  L.push("הצעות כיול מדורגות:");
  if (!facts.proposals.length) L.push("• אין הצעות מובהקות בשלב זה. המשך לתעד עסקאות.");
  for (const p of facts.proposals) {
    L.push(`• ${p.param}: ${p.current} → ${p.proposed} (n=${p.evidence.n}, CI ${p.evidence.ci[0]}-${p.evidence.ci[1]}%, ` +
      `תוחלת ${p.evidence.expR}R)${p.highConfidence ? " ⭐ ביטחון גבוה" : ""}.`);
  }
  return L.join("\n");
}
function heTrend(t) { return t === "improving" ? "משתפרת" : t === "decaying" ? "נסוגה" : "יציבה"; }

// ── PR body for a high-confidence calibration proposal ───────────────────────
function prBody(highProps, facts) {
  const rows = ["| Parameter | Current | Proposed | n | 95% CI | Expectancy |", "|---|---|---|---|---|---|"];
  for (const p of highProps) {
    rows.push(`| \`${p.param}\` | ${p.current} | ${p.proposed} | ${p.evidence.n} | ${p.evidence.ci[0]}–${p.evidence.ci[1]}% | ${p.evidence.expR}R |`);
  }
  return [
    "## 🧠 Analyst calibration proposal",
    "",
    "Auto-generated by `scripts/analyst.mjs`. **Review before merging — never auto-merged.**",
    "Each proposal cleared the high-confidence bar: **n ≥ 15 AND Wilson 95% CI excludes 50%**,",
    "and targets a wired calibration parameter (not engine logic).",
    "",
    ...rows,
    "",
    `Sample base: ${facts.sampleSize} closed non-demo trades. Growth trend: ${facts.growth.trend}.`,
    "",
    "The engine reads `src/intelligence/calibration.json` additively with safe fallbacks,",
    "so this change only shifts the listed parameters; an empty file = today's behavior.",
    "",
    "_Generated on " + DATE + "._",
  ].join("\n");
}

// ── output plumbing ──────────────────────────────────────────────────────────
function emit(fields) {
  const gho = process.env.GITHUB_OUTPUT;
  if (gho) {
    const d = `ANALYST_${Date.now()}`;
    for (const [k, v] of Object.entries(fields)) {
      if (typeof v === "string" && v.includes("\n")) {
        appendFileSync(gho, `${k}<<${d}\n${v}\n${d}\n`);
      } else {
        appendFileSync(gho, `${k}=${v}\n`);
      }
    }
  }
}

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  if (!SUPABASE_DB_URL) {
    console.error("::warning::SUPABASE_DB_URL not set — Analyst cannot run.");
    return emit({ date: DATE, email_he: "", has_proposal: 0 });
  }

  let trades = [];
  try {
    trades = loadTrades();
  } catch (e) {
    const detail = (e?.stderr || e?.message || "").toString().trim().replace(/\s+/g, " ");
    console.error(`::warning::Analyst could not load trades — ${detail}`);
    return emit({ date: DATE, email_he: "", has_proposal: 0 });
  }

  const facts = {
    date: DATE,
    sampleSize: trades.length,
    overall: trades.length ? summarize(trades) : null,
    calibration: [],
    discovery: { cellsTested: 0, significant: 0, top: [] },
    proposals: [],
    growth: { series: [], trend: "flat", expSlope: 0, rolling: null },
  };

  if (trades.length >= MIN_N) {
    facts.calibration = layer1Calibration(trades);
    facts.discovery = layer2Discovery(trades);
    facts.proposals = layer3Proposals(facts.calibration, facts.discovery);
    facts.growth = layer4Growth(trades);
  }

  // Narrate (Claude) with deterministic Hebrew fallback.
  const email_he = (await composeWithClaude(facts)) || fallbackHe(facts);

  // Dormant PR path: only high-confidence, actionable proposals write the file.
  const highProps = facts.proposals.filter((p) => p.highConfidence);
  let has_proposal = 0, pr_title = "", pr_body = "";
  if (highProps.length) {
    let existing = {};
    try { existing = JSON.parse(readFileSync(CALIBRATION_PATH, "utf8") || "{}"); } catch {}
    const next = { ...existing, emotionWeights: { ...(existing.emotionWeights || {}) }, regimeSizing: { ...(existing.regimeSizing || {}) } };
    for (const p of highProps) {
      const [table, key] = p.param.split(".");
      next[table] = { ...(next[table] || {}), [key]: p.proposed };
    }
    writeFileSync(CALIBRATION_PATH, JSON.stringify(next, null, 2) + "\n");
    has_proposal = 1;
    pr_title = `🧠 Analyst: calibration proposal (${DATE})`;
    pr_body = prBody(highProps, facts);
  }

  emit({ date: DATE, email_he, has_proposal, pr_title, pr_body });

  // Full deterministic stats to the job log (numbers are the source of truth).
  const gss = process.env.GITHUB_STEP_SUMMARY;
  if (gss) appendFileSync(gss, `### 🧠 Analyst — ${trades.length} closed trades (${DATE})\n\n\`\`\`\n${email_he}\n\`\`\`\n`);
  console.log(JSON.stringify(facts, null, 2));
}

main().catch((e) => {
  // Never fail the workflow over the analyst itself.
  console.error("::warning::Analyst failed unexpectedly.", e?.message || e);
  emit({ date: DATE, email_he: "", has_proposal: 0 });
});
