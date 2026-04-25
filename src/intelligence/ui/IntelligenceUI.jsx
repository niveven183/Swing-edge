// ─── INTELLIGENCE UI COMPONENTS ──────────────────────────────────────────────
// React components used by the main app to render the SwingEdge AI output.
// All components take already-computed reports (via SwingEdgeAI) and language
// to stay pure and easy to memoise in the parent.

import { useEffect, useState } from "react";
import {
  Brain, Sparkles, Shield, Flame, TrendingUp, TrendingDown,
  AlertTriangle, Activity, Target, Compass, Zap, Timer,
} from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

const pick = (msg, lang) => (msg && typeof msg === "object" ? (msg[lang] || msg.en || "") : msg || "");

// ─── Small utility for a 0..100 bar ──────────────────────────────────────────
const ScoreBar = ({ value, accent = "cyan" }) => {
  const colors = {
    cyan:   "from-cyan-500 to-cyan-300",
    green:  "from-emerald-500 to-emerald-300",
    amber:  "from-amber-500 to-amber-300",
    violet: "from-violet-500 to-violet-300",
    rose:   "from-rose-500 to-rose-300",
  };
  return (
    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
      <div
        className={`h-full bg-gradient-to-r ${colors[accent] || colors.cyan}`}
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
    <div className="bg-[#0d1424] border border-violet-500/25 rounded-xl p-4 relative overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain size={16} className="text-violet-400" />
          <span className="text-xs font-semibold tracking-widest uppercase text-slate-400">{labels.title}</span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20 font-mono">
          {labels.maturity[dna.maturity] || dna.maturity} · {dna.sampleSize} {labels.sample}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {rows.map(r => (
          <div key={r.key} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">{labels[r.key]}</span>
              <span className="text-xs font-bold font-mono text-white">{r.value}</span>
            </div>
            <ScoreBar value={r.value} accent={r.accent} />
          </div>
        ))}
      </div>
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
  const titleHe = good ? "ה-Edge שלך" : "דפוס להימנע ממנו";
  const titleEn = good ? "Your Edge"   : "Pattern to avoid";
  return (
    <div className={`${accent.bg} ${accent.border} border rounded-xl p-4 bg-[#0d1424]`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={15} className={accent.text} />
        <span className={`text-[11px] font-semibold tracking-widest uppercase ${accent.text}`}>
          {lang === "he" ? titleHe : titleEn}
        </span>
      </div>
      <div className="text-sm font-semibold text-white leading-snug">{edge.pattern}</div>
      <div className="mt-2 flex items-center gap-3 text-[11px] font-mono text-slate-400">
        <span className="text-slate-300"><b className="text-white">{edge.winRate}%</b> WR</span>
        <span>·</span>
        <span>{edge.trades} {lang === "he" ? "עסקאות" : "trades"}</span>
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
    go:   "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
    warn: "text-amber-400   border-amber-500/20   bg-amber-500/5",
    skip: "text-rose-400    border-rose-500/20    bg-rose-500/5",
    info: "text-slate-300   border-white/10       bg-white/3",
  }[insight.kind] || "text-slate-300 border-white/10 bg-white/3";
  return (
    <div className={`flex items-start gap-2 px-3 py-2 rounded-lg border ${colorFor} text-[12px] leading-relaxed animate-fade-in`}>
      <span className="text-base leading-none mt-[1px]">{insight.icon}</span>
      <span>{pick(insight.text, lang)}</span>
    </div>
  );
};

// ─── DECISION COACH PANEL ────────────────────────────────────────────────────
export const DecisionCoachPanel = ({ coaching, lang = "he" }) => {
  if (!coaching || coaching.verdict === "PENDING") {
    return (
      <div className="bg-[#0d1424] border border-white/10 rounded-xl p-4 text-[11px] text-slate-500">
        {lang === "he" ? "הכנס Entry + Stop כדי להפעיל את ה-Decision Coach." : "Enter entry + stop to activate the Decision Coach."}
      </div>
    );
  }
  const verdictStyle = {
    GO:      { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30", label: lang === "he" ? "קדימה" : "GO" },
    CAUTION: { bg: "bg-amber-500/10",   text: "text-amber-400",   border: "border-amber-500/30",   label: lang === "he" ? "זהירות" : "CAUTION" },
    SKIP:    { bg: "bg-rose-500/10",    text: "text-rose-400",    border: "border-rose-500/30",    label: lang === "he" ? "דלג" : "SKIP" },
  }[coaching.verdict] || { bg: "bg-white/5", text: "text-slate-300", border: "border-white/10", label: coaching.verdict };

  return (
    <div className="bg-[#0d1424] border border-violet-500/20 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Compass size={15} className="text-violet-400" />
          <span className="text-[11px] font-semibold tracking-widest uppercase text-slate-400">
            {lang === "he" ? "מאמן החלטות" : "Decision Coach"}
          </span>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${verdictStyle.border} ${verdictStyle.bg}`}>
          <span className={`text-xs font-bold ${verdictStyle.text}`}>{verdictStyle.label}</span>
          <span className="text-[10px] text-slate-500 font-mono">{coaching.confidence}%</span>
        </div>
      </div>
      <div className="space-y-1.5">
        {coaching.insights.slice(0, 6).map((ins, i) => (
          <LiveInsight key={i} insight={ins} lang={lang} />
        ))}
      </div>
      {coaching.historicalContext && (
        <div className="text-[11px] text-slate-500 border-t border-white/5 pt-2">
          {lang === "he"
            ? `בעסקאות דומות: ${coaching.historicalContext.similarTrades} עסקאות, ${coaching.historicalContext.successRate}% הצלחה, תשואה ממוצעת ${coaching.historicalContext.avgReturn}R.`
            : `Similar trades: ${coaching.historicalContext.similarTrades} count, ${coaching.historicalContext.successRate}% win, avg ${coaching.historicalContext.avgReturn}R.`}
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
  if (!evolution || !evolution.length) return null;
  return (
    <div className="bg-[#0d1424] border border-white/10 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Activity size={15} className="text-cyan-400" />
          <span className="text-[11px] font-semibold tracking-widest uppercase text-slate-400">
            {lang === "he" ? "התפתחות כסוחר" : "Trader Growth"}
          </span>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold font-mono text-white leading-none">{current}</div>
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
              <stop offset="0%"   stopColor="#8b5cf6" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
          <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#475569" }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#475569" }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ background: "#0d1424", border: "1px solid #162032", borderRadius: 8, fontSize: 11 }} />
          <Area type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={2} fill="url(#growthGrad)" />
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
