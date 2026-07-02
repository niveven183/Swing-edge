// ─── INTELLIGENCE UI COMPONENTS ──────────────────────────────────────────────
// React components used by the main app to render the SwingEdge AI output.
// All components take already-computed reports (via SwingEdgeAI) and language
// to stay pure and easy to memoise in the parent.

import { useEffect, useState } from "react";
import InfoTooltip from "../../components/ui/InfoTooltip.jsx";
import TermTooltip from "../../components/ui/TermTooltip.jsx";
import { TRADING_TOOLTIPS } from "../../data/tooltips.js";
import { dayLabel } from "../utils/statisticalModels.js";
import { nTrades } from "../../i18n.js";
import {
  Brain, Sparkles, Shield, Flame, TrendingUp, TrendingDown,
  AlertTriangle, Activity, Target, Compass, Zap, Timer,
  Lock, Unlock, TrendingDown as Decay, BarChart2,
} from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

const pick = (msg, lang) => (msg && typeof msg === "object" ? (msg[lang] || msg.en || "") : msg || "");

// ─── Small utility for a 0..100 bar ──────────────────────────────────────────
const ScoreBar = ({ value, accent = "cyan" }) => {
  const colors = {
    cyan:   "bg-cyan-500 dark:bg-cyan-400",
    green:  "bg-emerald-500 dark:bg-emerald-400",
    amber:  "bg-amber-500 dark:bg-amber-400",
    violet: "bg-violet-500 dark:bg-violet-400",
    rose:   "bg-rose-500 dark:bg-rose-400",
  };
  return (
    <div className="h-1.5 rounded-full bg-slate-200 dark:bg-white/[0.07] overflow-hidden">
      <div
        className={`h-full ${colors[accent] || colors.cyan}`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
};

// ─── DNA CARD ────────────────────────────────────────────────────────────────
export const DNACard = ({ dna, lang = "he" }) => {
  if (!dna) return null;
  const labels = lang === "he"
    ? { title: "ה-DNA המסחרי שלך", risk: "ניהול סיכון", discipline: "משמעת", consistency: "עקביות", growth: "צמיחה", sample: "עסקאות", maturity: { seed: "תחילת הדרך", learning: "לומד", established: "מבוסס", expert: "מומחה" } }
    : { title: "Your Trade DNA", risk: "Risk", discipline: "Discipline", consistency: "Consistency", growth: "Growth", sample: "trades", maturity: { seed: "Seedling", learning: "Learning", established: "Established", expert: "Expert" } };

  const rows = [
    { key: "risk",        value: dna.scores.risk,        accent: "cyan"   },
    { key: "discipline",  value: dna.scores.discipline,  accent: "violet" },
    { key: "consistency", value: dna.scores.consistency, accent: "amber"  },
    { key: "growth",      value: dna.scores.growth,      accent: "green"  },
  ];

  return (
    <div className="bg-white dark:bg-[#0d1424] border border-slate-200 dark:border-violet-500/25 rounded-xl p-4 relative overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain size={16} className="text-violet-500 dark:text-violet-400" />
          <span className="text-xs font-semibold tracking-widest uppercase text-slate-500 dark:text-slate-400">{labels.title}</span>
          <TermTooltip term="dna" lang={lang} />
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-500/20 font-mono">
          {labels.maturity[dna.maturity] || dna.maturity} · {dna.sampleSize} {labels.sample}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {rows.map(r => (
          <div key={r.key} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">{labels[r.key]}</span>
              <span className="text-xs font-bold font-mono text-slate-900 dark:text-white">{r.value}</span>
            </div>
            <ScoreBar value={r.value} accent={r.accent} />
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── PATTERN TAGS ────────────────────────────────────────────────────────────
// Renders a pattern (setup × emotion × day × …) as separate classified chips
// instead of a mechanical "X + Y" string. Each dimension gets its own colour so
// the combo reads as language, not a database label — and the literal " + " (which
// the bidi algorithm breaks in RTL) disappears entirely.
const TAG_TONES = {
  setup:           "bg-violet-100 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-500/20",
  emotion:         "bg-amber-100  dark:bg-amber-500/10  text-amber-700  dark:text-amber-300  border-amber-200  dark:border-amber-500/20",
  day:             "bg-slate-100  dark:bg-white/[0.06]  text-slate-600  dark:text-slate-300  border-slate-200  dark:border-white/10",
  marketCondition: "bg-cyan-100   dark:bg-cyan-500/10   text-cyan-700   dark:text-cyan-300   border-cyan-200   dark:border-cyan-500/20",
  rr:              "bg-teal-100   dark:bg-teal-500/10   text-teal-700   dark:text-teal-300   border-teal-200   dark:border-teal-500/20",
  entryQuality:    "bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-500/20",
};

// Parse an EdgeFinder key ("setup:Bull Flag + emotion:Neutral") into typed parts.
// groupKey joins with " + " and values never contain ":", so this is lossless.
export const parsePatternKey = (key = "") =>
  String(key).split(" + ").map((p) => {
    const idx = p.indexOf(":");
    return idx === -1 ? { dim: "day", value: p } : { dim: p.slice(0, idx), value: p.slice(idx + 1) };
  });

export const PatternTags = ({ parts = [], className = "", lang = "en" }) => {
  const list = (parts || []).filter(p => p && p.value != null && p.value !== "");
  if (!list.length) return null;
  // dir="ltr" keeps the Latin-valued chips in a stable left-to-right order even
  // inside an RTL container; flex-wrap prevents overflow on narrow cards.
  return (
    <div dir="ltr" className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {list.map((p, i) => {
        // Canonical "?" home for the R/R "3+" band — the only rr value with glossary
        // copy. Other bands (<1, 1-2, 2-3) intentionally render no tooltip.
        const showRRHelp = p.dim === "rr" && p.value === "3+" && TRADING_TOOLTIPS.rrBucket3plus;
        return (
          <span
            key={`${p.dim}:${p.value}:${i}`}
            className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-semibold whitespace-nowrap ${TAG_TONES[p.dim] || TAG_TONES.day}`}
          >
            {/* Day-dimension values are display-translated (e.g. "Sun" → "א׳");
                every other dimension renders its raw English value unchanged. */}
            {p.dim === "day" ? dayLabel(p.value, lang) : p.value}
            {showRRHelp && <TermTooltip term="rrBucket3plus" lang={lang} />}
          </span>
        );
      })}
    </div>
  );
};

// ─── EDGE CARD ───────────────────────────────────────────────────────────────
export const EdgeCard = ({ edge, lang = "he", variant = "edge" }) => {
  if (!edge) return null;
  const good = variant === "edge";
  const accent = good
    ? { border: "border-emerald-500/25", text: "text-emerald-400", bg: "bg-emerald-500/8" }
    : { border: "border-rose-500/25",    text: "text-rose-400",    bg: "bg-rose-500/8" };
  const Icon = good ? Sparkles : AlertTriangle;
  const titleHe = good ? "ה-Edge שלך · לאורך זמן" : "דפוס מפסיד";
  const titleEn = good ? "Your Edge · all-time"     : "Pattern to avoid";
  return (
    <div className={`${accent.bg} ${accent.border} border rounded-xl p-4 bg-[#0d1424]`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={15} className={accent.text} />
        <span className={`text-[11px] font-semibold tracking-widest uppercase ${accent.text}`}>
          {lang === "he" ? titleHe : titleEn}
        </span>
        <TermTooltip term={good ? "edge" : "antiEdge"} lang={lang} />
      </div>
      <PatternTags parts={parsePatternKey(edge.key)} className="leading-snug" lang={lang} />
      <div className="mt-2 flex items-center gap-3 text-[11px] font-mono text-slate-400">
        <span className="text-slate-300"><b className="text-white">{edge.winRate}%</b> WR</span>
        <span>·</span>
        <span>{nTrades(edge.trades, lang)}</span>
        <span>·</span>
        <span className={edge.avgR >= 0 ? "text-emerald-400" : "text-rose-400"}>
          {edge.avgR >= 0 ? "+" : ""}{edge.avgR}R
        </span>
      </div>
      <div className="mt-2 text-[11px] text-slate-400 leading-relaxed">
        {pick(edge.message, lang)}
      </div>
    </div>
  );
};

// ─── LIVE INSIGHT ROW ────────────────────────────────────────────────────────
export const LiveInsight = ({ insight, lang = "he" }) => {
  if (!insight) return null;
  const colorFor = {
    go:   "text-emerald-700 dark:text-emerald-400 border-emerald-300/60 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/5",
    warn: "text-amber-700   dark:text-amber-400   border-amber-300/60   dark:border-amber-500/20   bg-amber-50   dark:bg-amber-500/5",
    skip: "text-rose-700    dark:text-rose-400    border-rose-300/60    dark:border-rose-500/20    bg-rose-50    dark:bg-rose-500/5",
    info: "text-slate-600   dark:text-slate-300   border-slate-200      dark:border-white/10       bg-slate-50   dark:bg-white/3",
  }[insight.kind] || "text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/3";
  return (
    <div className={`flex items-start gap-2 px-3 py-2 rounded-lg border ${colorFor} text-[12px] leading-relaxed animate-fade-in`}>
      <span className="text-base leading-none mt-[1px]">{insight.icon}</span>
      <span>{pick(insight.text, lang)}</span>
    </div>
  );
};

// ─── DECISION COACH PANEL ────────────────────────────────────────────────────
const COACH_L = {
  title: { en: "Decision Coach", he: "מאמן החלטות", es: "Coach de Decisiones", pt: "Coach de Decisões", ar: "مدرّب القرار" },
  pending: {
    en: "Enter entry + stop to activate the Decision Coach.",
    he: "הכנס Entry + Stop כדי להפעיל את ה-Decision Coach.",
    es: "Ingresa entrada + stop para activar el Coach de Decisiones.",
    pt: "Insira entrada + stop para ativar o Coach de Decisões.",
    ar: "أدخل سعر الدخول + وقف الخسارة لتفعيل مدرّب القرار.",
  },
};
const VERDICT_L = {
  GO:      { en: "GO",      he: "קדימה",  es: "ADELANTE",   pt: "AVANÇAR", ar: "تقدّم" },
  CAUTION: { en: "CAUTION", he: "זהירות", es: "PRECAUCIÓN", pt: "CAUTELA", ar: "تحذير" },
  SKIP:    { en: "SKIP",    he: "דלג",    es: "OMITIR",     pt: "PULAR",   ar: "تجاوز" },
};
const collectMoreText = (n, lang) => ({
  en: `Collect more trades for an accurate read (${n}/10).`,
  he: `אסוף עוד עסקאות לקבלת ניתוח מדויק (${n}/10).`,
  es: `Reúne más operaciones para un análisis preciso (${n}/10).`,
  pt: `Reúna mais operações para uma análise precisa (${n}/10).`,
  ar: `اجمع المزيد من الصفقات للحصول على تحليل دقيق (${n}/10).`,
}[lang] || `Collect more trades for an accurate read (${n}/10).`);
const historyText = (hc, lang) => ({
  en: `Similar trades: ${hc.similarTrades} count, ${hc.successRate}% win, avg ${hc.avgReturn}R.`,
  he: `בעסקאות דומות: ${hc.similarTrades} עסקאות, ${hc.successRate}% הצלחה, תשואה ממוצעת ${hc.avgReturn}R.`,
  es: `Operaciones similares: ${hc.similarTrades}, ${hc.successRate}% aciertos, promedio ${hc.avgReturn}R.`,
  pt: `Operações similares: ${hc.similarTrades}, ${hc.successRate}% acertos, média ${hc.avgReturn}R.`,
  ar: `صفقات مشابهة: ${hc.similarTrades}، ${hc.successRate}% نجاح، متوسط ${hc.avgReturn}R.`,
}[lang] || `Similar trades: ${hc.similarTrades} count, ${hc.successRate}% win, avg ${hc.avgReturn}R.`);

export const DecisionCoachPanel = ({ coaching, lang = "he" }) => {
  if (!coaching || coaching.verdict === "PENDING") {
    return (
      <div className="bg-white dark:bg-[#0d1424] border border-slate-200 dark:border-white/10 rounded-xl p-4 text-[11px] text-slate-500 dark:text-slate-500">
        {pick(COACH_L.pending, lang)}
      </div>
    );
  }

  // Low-data gate — under 10 real (closed) trades we hide the score/verdict and
  // nudge the trader to collect more data instead of showing a noisy verdict.
  const lowData = coaching.sampleSize != null && coaching.sampleSize < 10;
  const verdictStyle = {
    GO:      { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-400/40 dark:border-emerald-500/30" },
    CAUTION: { bg: "bg-amber-500/10",   text: "text-amber-600   dark:text-amber-400",   border: "border-amber-400/40   dark:border-amber-500/30" },
    SKIP:    { bg: "bg-rose-500/10",    text: "text-rose-600    dark:text-rose-400",    border: "border-rose-400/40    dark:border-rose-500/30" },
  }[coaching.verdict] || { bg: "bg-slate-100 dark:bg-white/5", text: "text-slate-600 dark:text-slate-300", border: "border-slate-200 dark:border-white/10" };
  const verdictLabel = pick(VERDICT_L[coaching.verdict], lang) || coaching.verdict;

  return (
    <div className="bg-white dark:bg-[#0d1424] border border-slate-200 dark:border-violet-500/20 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Compass size={15} className="text-violet-500 dark:text-violet-400" />
          <span className="text-[11px] font-semibold tracking-widest uppercase text-slate-500 dark:text-slate-400">
            {pick(COACH_L.title, lang)}
          </span>
        </div>
        {!lowData && (
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${verdictStyle.border} ${verdictStyle.bg}`}>
            <span className={`text-xs font-bold ${verdictStyle.text}`}>{verdictLabel}</span>
            <span className="text-[10px] text-slate-500 font-mono">{coaching.confidence}%</span>
          </div>
        )}
      </div>

      {lowData && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg border border-amber-300/60 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/5 text-[12px] leading-relaxed text-amber-700 dark:text-amber-400">
          <span className="text-base leading-none mt-[1px]">📈</span>
          <span>{collectMoreText(coaching.sampleSize || 0, lang)}</span>
        </div>
      )}

      <div className="space-y-1.5">
        {coaching.insights.slice(0, 6).map((ins, i) => (
          <LiveInsight key={i} insight={ins} lang={lang} />
        ))}
      </div>

      {!lowData && coaching.historicalContext && (
        <div className="text-[11px] text-slate-500 dark:text-slate-500 border-t border-slate-200 dark:border-white/5 pt-2">
          {historyText(coaching.historicalContext, lang)}
        </div>
      )}
    </div>
  );
};

// ─── TILT SHIELD ─────────────────────────────────────────────────────────────
export const TiltShield = ({ tilt, lang = "he", onDismiss, onCooldown, onClearCooldown }) => {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!tilt || tilt.cooldownRemainingMs <= 0) return;
    const id = setInterval(() => setTick(x => x + 1), 1000);
    return () => clearInterval(id);
  }, [tilt]);

  if (!tilt || tilt.level === 0) return null;

  const remainingMs = Math.max(0, tilt.cooldownUntil - Date.now());
  const mm = String(Math.floor(remainingMs / 60000)).padStart(2, "0");
  const ss = String(Math.floor((remainingMs % 60000) / 1000)).padStart(2, "0");

  const styleByLevel = {
    1: { border: "border-amber-500/30",  bg: "bg-amber-500/10",  text: "text-amber-400", Icon: AlertTriangle },
    2: { border: "border-orange-500/30", bg: "bg-orange-500/10", text: "text-orange-400",Icon: Shield },
    3: { border: "border-rose-500/40",   bg: "bg-rose-500/10",   text: "text-rose-400",  Icon: Shield },
  }[tilt.level];
  const { Icon } = styleByLevel;

  return (
    <div className={`${styleByLevel.bg} ${styleByLevel.border} border rounded-xl p-4 space-y-2`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={16} className={styleByLevel.text} />
          <span className={`text-xs font-semibold uppercase tracking-widest ${styleByLevel.text}`}>
            {pick(tilt.label, lang)}
          </span>
        </div>
        {tilt.level < 3 && onDismiss && (
          <button onClick={onDismiss} className="text-[10px] text-slate-500 hover:text-white transition">
            {lang === "he" ? "הבנתי" : "Dismiss"}
          </button>
        )}
      </div>
      <div className="space-y-1">
        {tilt.indicators.map((ind, i) => (
          <div key={i} className="text-[12px] text-slate-300 leading-relaxed">• {pick(ind, lang)}</div>
        ))}
      </div>
      <div className="text-[12px] text-slate-400 italic">{pick(tilt.suggestion, lang)}</div>
      {tilt.level === 3 && (
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <div className="flex items-center gap-2 text-rose-300 font-mono text-sm">
            <Timer size={14} /> {mm}:{ss}
          </div>
          {onClearCooldown && remainingMs === 0 && (
            <button onClick={onClearCooldown} className="text-[11px] text-slate-400 hover:text-white underline">
              {lang === "he" ? "סיים הפסקה" : "Clear cooldown"}
            </button>
          )}
        </div>
      )}
      {tilt.level === 2 && onCooldown && (
        <button
          onClick={() => onCooldown(30)}
          className="w-full py-2 mt-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold hover:bg-rose-500/20 transition"
        >
          {lang === "he" ? "הפעל הפסקה של 30 דקות" : "Start 30-minute cooldown"}
        </button>
      )}
    </div>
  );
};

// ─── GROWTH SCORE + CHART ────────────────────────────────────────────────────
export const GrowthChart = ({ evolution, current, delta, lang = "he" }) => {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains('dark'))
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  if (!evolution || !evolution.length) return null;
  return (
    <div className="bg-white dark:bg-[#0d1424] border border-slate-200 dark:border-white/10 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Activity size={15} className="text-cyan-500 dark:text-cyan-400" />
          <span className="text-[11px] font-semibold tracking-widest uppercase text-slate-500 dark:text-slate-400">
            {lang === "he" ? "התפתחות כסוחר" : "Trader Growth"}
          </span>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white leading-none">{current}</div>
          {delta != null && (
            <div className={`text-[10px] font-mono ${delta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}
            </div>
          )}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={evolution}>
          <defs>
            <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#00C805" stopOpacity={0.20} />
              <stop offset="100%" stopColor="#00C805" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#ffffff08" : "#00000010"} />
          <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#475569" }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#475569" }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={isDark
            ? { background: "#0d1424", border: "1px solid #162032", borderRadius: 8, fontSize: 11 }
            : { background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 11 }
          } />
          <Area type="monotone" dataKey="score" stroke="#00C805" strokeWidth={2} fill="url(#growthGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── MARKET REGIME INDICATOR ─────────────────────────────────────────────────
export const RegimeIndicator = ({ regime, lang = "he" }) => {
  if (!regime) return null;
  const map = {
    BULL_TREND:      { color: "emerald", Icon: TrendingUp,   labelHe: "שוק עולה",     labelEn: "Bull Trend" },
    BEAR_TREND:      { color: "rose",    Icon: TrendingDown, labelHe: "שוק יורד",     labelEn: "Bear Trend" },
    CHOPPY:          { color: "amber",   Icon: Activity,     labelHe: "שוק צדדי",     labelEn: "Choppy" },
    HIGH_VOLATILITY: { color: "violet",  Icon: Zap,          labelHe: "תנודתיות גבוהה", labelEn: "High Volatility" },
    LOW_VOLATILITY:  { color: "cyan",    Icon: Shield,       labelHe: "תנודתיות נמוכה", labelEn: "Low Volatility" },
    UNKNOWN:         { color: "slate",   Icon: Compass,      labelHe: "לא ברור",       labelEn: "Unknown" },
  }[regime.regime] || { color: "slate", Icon: Compass, labelHe: "לא ברור", labelEn: "Unknown" };

  const { Icon } = map;
  const colorMap = {
    emerald: { text: "text-emerald-400", bg: "bg-emerald-500/10",  border: "border-emerald-500/25" },
    rose:    { text: "text-rose-400",    bg: "bg-rose-500/10",     border: "border-rose-500/25" },
    amber:   { text: "text-amber-400",   bg: "bg-amber-500/10",    border: "border-amber-500/25" },
    violet:  { text: "text-violet-400",  bg: "bg-violet-500/10",   border: "border-violet-500/25" },
    cyan:    { text: "text-cyan-400",    bg: "bg-cyan-500/10",     border: "border-cyan-500/25" },
    slate:   { text: "text-slate-400",   bg: "bg-slate-500/10",    border: "border-slate-500/25" },
  }[map.color];

  return (
    <div className={`${colorMap.bg} ${colorMap.border} border rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={15} className={colorMap.text} />
        <span className={`text-xs font-semibold tracking-widest uppercase ${colorMap.text}`}>
          {lang === "he" ? "מצב שוק" : "Market Regime"}
        </span>
        <TermTooltip term="marketRegime" lang={lang} />
      </div>
      <div className="text-sm font-bold text-white">
        {lang === "he" ? map.labelHe : map.labelEn}
      </div>
      <div className="mt-1.5 text-[11px] text-slate-400 leading-relaxed">
        {pick(regime.advice, lang)}
      </div>
      {regime.advice?.sizing != null && regime.advice.sizing !== 1 && (
        <div className="mt-2 text-[10px] font-mono text-slate-500">
          {lang === "he" ? "גודל פוזיציה מומלץ" : "Suggested sizing"}: {(regime.advice.sizing * 100).toFixed(0)}%
        </div>
      )}
    </div>
  );
};

// ─── EDGE DECAY ALERT CARD ────────────────────────────────────────────────────
// Shows setups whose recent performance is meaningfully below their baseline.
export const EdgeDecayCard = ({ edgeDecay, lang = "he" }) => {
  if (!edgeDecay || !edgeDecay.alerts || !edgeDecay.alerts.length) return null;

  const levelConfig = {
    severe:   { color: "rose",   labelHe: "חמור",    labelEn: "Severe" },
    moderate: { color: "amber",  labelHe: "בינוני",  labelEn: "Moderate" },
    mild:     { color: "yellow", labelHe: "קל",      labelEn: "Mild" },
  };

  const colorMap = {
    rose:   { text: "text-rose-400",   bg: "bg-rose-500/8",   border: "border-rose-500/25",   badge: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
    amber:  { text: "text-amber-400",  bg: "bg-amber-500/8",  border: "border-amber-500/25",  badge: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
    yellow: { text: "text-yellow-400", bg: "bg-yellow-500/8", border: "border-yellow-500/25", badge: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  };

  return (
    <div className="bg-[#0d1424] border border-amber-500/25 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <BarChart2 size={15} className="text-amber-400" />
        <span className="text-[11px] font-semibold tracking-widest uppercase text-amber-400">
          {lang === "he" ? "דעיכת Edge" : "Edge Decay"}
        </span>
        <span className="ml-auto text-[10px] font-mono text-slate-500">
          {lang === "he" ? `${edgeDecay.scanned} סטאפים נסרקו` : `${edgeDecay.scanned} setups scanned`}
        </span>
      </div>

      {edgeDecay.alerts.map((alert) => {
        const cfg   = levelConfig[alert.level] || levelConfig.mild;
        const c     = colorMap[cfg.color] || colorMap.amber;
        return (
          <div key={alert.setup} className={`${c.bg} ${c.border} border rounded-lg p-3 space-y-1.5`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">{alert.setup}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${c.badge}`}>
                {lang === "he" ? cfg.labelHe : cfg.labelEn}
              </span>
            </div>
            <p className={`text-[11px] leading-relaxed ${c.text}`}>
              {pick(alert.message, lang)}
            </p>
            <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500 pt-0.5">
              <span>
                {lang === "he" ? "כל התקופה" : "All-time"}: <b className="text-slate-300">{alert.historicalAvgR}R</b>
              </span>
              <span>→</span>
              <span>
                {lang === "he" ? "אחרון" : "Recent"}: <b className={alert.recentAvgR < 0 ? "text-rose-400" : "text-slate-300"}>{alert.recentAvgR}R</b>
              </span>
              <span>({lang === "he" ? `ירידה של ` : `drop: `}<b className="text-rose-400">{alert.drop}R</b>)</span>
            </div>
            <p className="text-[10px] text-slate-500 italic">{pick(alert.detail, lang)}</p>
          </div>
        );
      })}
    </div>
  );
};

// ─── ANTI-EDGE LOCK CARD ──────────────────────────────────────────────────────
// Shows locked and near-lock setups with unlock controls.
export const AntiEdgeLockCard = ({ antiEdgeLocks, onUnlock, onRelock, lang = "he" }) => {
  if (!antiEdgeLocks) return null;
  const { locked, warnings } = antiEdgeLocks;
  if (!locked.length && !warnings.length) return null;

  const WeekDot = ({ w }) => (
    <div className="flex flex-col items-center gap-0.5" title={w.week}>
      <div
        className={`w-2 h-2 rounded-full ${w.negative ? "bg-rose-500" : "bg-emerald-500"}`}
      />
      <span className="text-[8px] text-slate-600 font-mono">{w.week.slice(-3)}</span>
    </div>
  );

  const SetupRow = ({ s, isLocked }) => (
    <div className={`rounded-lg border p-3 space-y-2 ${
      isLocked
        ? "bg-rose-500/8 border-rose-500/30"
        : "bg-amber-500/8 border-amber-500/30"
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isLocked
            ? <Lock size={12} className="text-rose-400" />
            : <AlertTriangle size={12} className="text-amber-400" />
          }
          <span className="text-sm font-semibold text-white">{s.setup}</span>
        </div>
        {isLocked && (
          <button
            onClick={() => onUnlock && onUnlock(s.setup)}
            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded border border-slate-600/50 bg-slate-700/30 text-slate-400 hover:text-white hover:border-slate-400 transition"
          >
            <Unlock size={9} />
            {lang === "he" ? "בטל חסימה" : "Override"}
          </button>
        )}
        {!isLocked && s.manuallyUnlocked && (
          <button
            onClick={() => onRelock && onRelock(s.setup)}
            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded border border-rose-600/40 bg-rose-900/20 text-rose-400 hover:bg-rose-900/40 transition"
          >
            <Lock size={9} />
            {lang === "he" ? "חסום מחדש" : "Re-lock"}
          </button>
        )}
      </div>

      <p className={`text-[11px] leading-relaxed ${isLocked ? "text-rose-300" : "text-amber-300"}`}>
        {pick(s.message, lang)}
      </p>

      {/* Weekly dots visualisation */}
      <div className="flex items-end gap-1.5 pt-0.5">
        <span className="text-[9px] text-slate-600 mr-1">
          {lang === "he" ? "שבועות אחרונים:" : "Recent weeks:"}
        </span>
        {[...s.weeksData].reverse().map((w) => <WeekDot key={w.week} w={w} />)}
      </div>

      <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500">
        <span>
          {lang === "he" ? "כולל" : "Overall"}: <b className={s.overallAvgR < 0 ? "text-rose-400" : "text-emerald-400"}>{s.overallAvgR}R</b>
        </span>
        <span>·</span>
        <span>WR <b className="text-slate-300">{s.overallWR}%</b></span>
        <span>·</span>
        <span>{nTrades(s.totalTrades, lang)}</span>
      </div>
    </div>
  );

  return (
    <div className="bg-[#0d1424] border border-rose-500/25 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Lock size={15} className="text-rose-400" />
        <span className="text-[11px] font-semibold tracking-widest uppercase text-rose-400">
          {lang === "he" ? "Anti-Edge Lock" : "Anti-Edge Lock"}
        </span>
        {locked.length > 0 && (
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 font-mono">
            {locked.length} {lang === "he" ? "חסומים" : "locked"}
          </span>
        )}
      </div>

      {locked.map((s) => <SetupRow key={s.setup} s={s} isLocked={true} />)}
      {warnings.map((s) => <SetupRow key={s.setup} s={s} isLocked={false} />)}
    </div>
  );
};
