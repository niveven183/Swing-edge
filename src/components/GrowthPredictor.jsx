import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  Lock,
  Sparkles,
  CheckCircle2,
  XCircle,
  DollarSign,
  Unlock,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

// ─── i18n strings ────────────────────────────────────────────────────────────
const STR = {
  he: {
    title: "תחזית הצמיחה שלך",
    subtitle: "ענה על 3 שאלות על המסחר שלך כדי לפתוח",
    needMore: "הוסף לפחות 5 עסקאות סגורות כדי לפתוח את Growth Predictor",
    needDiversity: "צריך לפחות 2 סוגי Setup ו-2 רגשות שונים כדי לחשב שאלות מותאמות",
    revealBtn: "🔮 גלה את התחזית",
    questionsToUnlock: "3 שאלות לפתיחה",
    correct: "נכון!",
    wrong: "לא מדויק — נסה שוב",
    nextIn: "השאלה הבאה...",
    questionN: (i) => `שאלה ${i + 1} מתוך 3`,
    setupQ: "מה ה-Setup שמביא לך את התוצאות הטובות ביותר?",
    setupExplain: "ה-Setup הזה הניב לך את ה-Win Rate הגבוה ביותר.",
    emotionQ: "מה הרגש שמוביל אותך להחלטות הגרועות ביותר?",
    emotionExplain: "הרגש הזה מתואם אצלך עם תוצאות הכי נמוכות.",
    winrateQ: "מה ה-Win Rate הכולל שלך?",
    winrateExplain: "ה-Win Rate שלך מתוך כל העסקאות הסגורות.",
    unlocked: "🎉 התחזית נפתחה!",
    forecastTitle: "תחזית צמיחה — 24 חודשים",
    monthlyDeposit: "הפקדה חודשית — מנוף את הצמיחה (אופציונלי)",
    enterAmount: "הזן סכום",
    month3: "חודש 3",
    month12: "חודש 12",
    month24: "חודש 24",
    monthlyReturnLabel: "תשואה חודשית ממוצעת",
    basedOn: (t, m) => `מבוסס על ${t} עסקאות סגורות · ${m.toFixed(1)} חודשי נתונים`,
    negativeHeader: "⚠️ לפי הקצב הנוכחי...",
    negativeSubtitle: (val) => `אם תמשיך ככה, ב-12 חודשים תגיע ל-${val}`,
    whatToImprove: "מה לשפר? → Analytics",
    zeroReturn: "אין עדיין מספיק נתונים לחישוב תשואה — המשך לתעד עסקאות",
    fromNow: "מהיום",
    balance: "יתרה",
    reset: "אפס תחזית",
  },
  en: {
    title: "Your Growth Forecast",
    subtitle: "Answer 3 questions to unlock your forecast",
    needMore: "Add at least 5 closed trades to unlock Growth Predictor",
    needDiversity: "Need at least 2 different setups and emotions to generate tailored questions",
    revealBtn: "🔮 Reveal Forecast",
    questionsToUnlock: "3 questions to unlock",
    correct: "Correct!",
    wrong: "Not quite — try again",
    nextIn: "Next question...",
    questionN: (i) => `Question ${i + 1} of 3`,
    setupQ: "Which setup gives you your best results?",
    setupExplain: "This setup has produced your highest win rate.",
    emotionQ: "Which emotion drives your worst decisions?",
    emotionExplain: "This emotion correlates with your lowest outcomes.",
    winrateQ: "What's your overall Win Rate?",
    winrateExplain: "Your win rate across all closed trades.",
    unlocked: "🎉 Forecast unlocked!",
    forecastTitle: "Growth Forecast — 24 months",
    monthlyDeposit: "Monthly Deposit — Amplify Growth (Optional)",
    enterAmount: "Enter amount",
    month3: "Month 3",
    month12: "Month 12",
    month24: "Month 24",
    monthlyReturnLabel: "Average monthly return",
    basedOn: (t, m) => `Based on ${t} closed trades · ${m.toFixed(1)} months of data`,
    negativeHeader: "⚠️ At your current pace...",
    negativeSubtitle: (val) => `If you keep going like this, in 12 months you'll be at ${val}`,
    whatToImprove: "What to improve? → Analytics",
    zeroReturn: "Not enough data yet to compute return — keep logging trades",
    fromNow: "Now",
    balance: "Balance",
    reset: "Reset forecast",
  },
  es: {
    monthlyDeposit: "Depósito Mensual — Amplifica el Crecimiento (Opcional)",
    enterAmount: "Introducir cantidad",
  },
  pt: {
    monthlyDeposit: "Depósito Mensal — Amplie o Crescimento (Opcional)",
    enterAmount: "Inserir valor",
  },
  ar: {
    monthlyDeposit: "إيداع شهري — ضاعف النمو (اختياري)",
    enterAmount: "أدخل المبلغ",
  },
};

// ─── helpers ─────────────────────────────────────────────────────────────────
const STORAGE_KEY = "swingEdgeGrowthUnlocked";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function projectGrowth(capital, monthlyReturn, months, deposit) {
  const data = [];
  const r = monthlyReturn / 100;
  let balance = capital;
  for (let m = 0; m <= months; m++) {
    data.push({
      month: m,
      balance: Math.round(balance),
      label: m === 0 ? "M0" : `M${m}`,
    });
    balance = balance * (1 + r) + deposit;
  }
  return data;
}

function fmtUsd(n) {
  const v = Math.round(n || 0);
  return `$${v.toLocaleString("en-US")}`;
}

// Generate the 3 questions from real data
function generateQuestions(closedTrades, stats, lang) {
  const S = { ...STR.en, ...(STR[lang] || {}) };

  // ── Q1: Best Setup ──
  const setups = (stats.bySetup || []).filter((s) => s.count >= 2 && s.name && s.name !== "Unknown");
  setups.sort((a, b) => b.winRate - a.winRate);
  const bestSetup = setups[0];
  const setupDistractors = setups.slice(1, 4).map((s) => s.name);
  while (setupDistractors.length < 3) {
    const fillers = ["Bull Flag", "ORB Breakout", "Gap and Go", "Power Hour", "Earnings Gap"];
    const next = fillers.find((f) => f !== bestSetup?.name && !setupDistractors.includes(f));
    if (!next) break;
    setupDistractors.push(next);
  }
  const setupOptions = shuffle([
    { text: bestSetup?.name || "—", correct: true },
    ...setupDistractors.slice(0, 3).map((n) => ({ text: n, correct: false })),
  ]);

  // ── Q2: Worst Emotion ──
  const emotions = (stats.byEmotion || []).filter((e) => e.count >= 2 && e.name && e.name !== "Unknown");
  emotions.sort((a, b) => a.winRate - b.winRate);
  const worstEmotion = emotions[0];
  const emotionDistractors = emotions.slice(1, 4).map((e) => e.name);
  while (emotionDistractors.length < 3) {
    const fillers = ["FOMO", "Hesitant", "Angry", "Patient", "Calm", "Confident"];
    const next = fillers.find((f) => f !== worstEmotion?.name && !emotionDistractors.includes(f));
    if (!next) break;
    emotionDistractors.push(next);
  }
  const emotionOptions = shuffle([
    { text: worstEmotion?.name || "—", correct: true },
    ...emotionDistractors.slice(0, 3).map((n) => ({ text: n, correct: false })),
  ]);

  // ── Q3: Win Rate ──
  const wr = Math.round(stats.winRate || 0);
  const buckets = new Set([wr]);
  const offsets = [-25, -15, -10, 10, 15, 25];
  while (buckets.size < 4) {
    const off = offsets[Math.floor(Math.random() * offsets.length)];
    const candidate = Math.max(5, Math.min(95, wr + off));
    buckets.add(candidate);
  }
  const winrateOptions = shuffle(
    Array.from(buckets).map((v) => ({ text: `~${v}%`, correct: v === wr }))
  );

  return [
    { question: S.setupQ, options: setupOptions, explanation: S.setupExplain },
    { question: S.emotionQ, options: emotionOptions, explanation: S.emotionExplain },
    { question: S.winrateQ, options: winrateOptions, explanation: S.winrateExplain },
  ];
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function GrowthPredictor({ trades = [], stats = {}, capital = 0, lang = "en" }) {
  const S = { ...STR.en, ...(STR[lang] || {}) };

  const closedTrades = useMemo(
    () => (trades || []).filter((t) => t.status === "CLOSED"),
    [trades]
  );

  // Diversity check — need 2+ setups and 2+ emotions to build meaningful questions
  const hasDiversity = useMemo(() => {
    const setups = (stats.bySetup || []).filter((s) => s.count >= 2 && s.name && s.name !== "Unknown");
    const emotions = (stats.byEmotion || []).filter((e) => e.count >= 2 && e.name && e.name !== "Unknown");
    return setups.length >= 1 && emotions.length >= 1;
  }, [stats]);

  // ── State ──
  const [phase, setPhase] = useState(() =>
    typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "true"
      ? "chart"
      : "locked"
  );
  const [currentQ, setCurrentQ] = useState(0);
  const [feedback, setFeedback] = useState(null); // null | 'correct' | 'wrong'
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [monthlyDeposit, setMonthlyDeposit] = useState(0);

  // Stable questions per session (regenerate only when stats change materially)
  const questions = useMemo(
    () => generateQuestions(closedTrades, stats, lang),
    [closedTrades, stats, lang]
  );

  // ── Effective capital ──
  const effectiveCapital = capital && capital > 0 ? capital : 5000;

  // ── Monthly return calc ──
  const { monthlyReturn, monthsOfData } = useMemo(() => {
    if (closedTrades.length < 2 || !stats.totalPnL) {
      return { monthlyReturn: 0, monthsOfData: 0 };
    }
    const dates = closedTrades
      .map((t) => {
        const a = t.date ? new Date(t.date).getTime() : null;
        const b = t.exitDate ? new Date(t.exitDate).getTime() : null;
        return [a, b].filter((x) => x && !Number.isNaN(x));
      })
      .flat();
    if (dates.length < 2) return { monthlyReturn: 0, monthsOfData: 0 };
    const first = Math.min(...dates);
    const last = Math.max(...dates);
    const months = Math.max(1, (last - first) / (30 * 86400000));
    const mr = (stats.totalPnL / effectiveCapital) * 100 / months;
    return { monthlyReturn: mr, monthsOfData: months };
  }, [closedTrades, stats.totalPnL, effectiveCapital]);

  // ── Forecast data ──
  const forecastData = useMemo(
    () => projectGrowth(effectiveCapital, monthlyReturn, 24, Number(monthlyDeposit) || 0),
    [effectiveCapital, monthlyReturn, monthlyDeposit]
  );

  const isNegative = monthlyReturn < 0;
  const isZero = monthlyReturn === 0;
  const colorMain = isNegative ? "#fb7185" : "#34d399"; // rose-400 / emerald-400
  const gradId = isNegative ? "gpGradNeg" : "gpGradPos";

  // ── Summary at months ──
  const m3 = forecastData[3]?.balance ?? effectiveCapital;
  const m12 = forecastData[12]?.balance ?? effectiveCapital;
  const m24 = forecastData[24]?.balance ?? effectiveCapital;
  const pct = (val) =>
    effectiveCapital > 0 ? (((val - effectiveCapital) / effectiveCapital) * 100).toFixed(0) : "0";

  // ── Handlers ──
  const handleAnswer = useCallback(
    (idx) => {
      if (feedback === "correct") return; // lock during transition
      const q = questions[currentQ];
      const correct = !!q.options[idx]?.correct;
      setSelectedIdx(idx);
      setFeedback(correct ? "correct" : "wrong");

      if (correct) {
        setTimeout(() => {
          if (currentQ < questions.length - 1) {
            setCurrentQ((c) => c + 1);
            setFeedback(null);
            setSelectedIdx(null);
          } else {
            try {
              localStorage.setItem(STORAGE_KEY, "true");
            } catch {}
            setPhase("chart");
            setFeedback(null);
            setSelectedIdx(null);
          }
        }, 1000);
      } else {
        setTimeout(() => {
          setFeedback(null);
          setSelectedIdx(null);
        }, 1500);
      }
    },
    [feedback, questions, currentQ]
  );

  const handleReset = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setPhase("locked");
    setCurrentQ(0);
    setFeedback(null);
    setSelectedIdx(null);
  }, []);

  const handleStart = useCallback(() => {
    setPhase("questions");
    setCurrentQ(0);
    setFeedback(null);
    setSelectedIdx(null);
  }, []);

  // ── Render: not enough trades ──
  if (closedTrades.length < 5) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900/20 to-slate-900/40 border border-emerald-500/20 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
            <Lock className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-bold text-white text-lg mb-1">{S.title}</h3>
            <p className="text-slate-400 text-sm">{S.needMore}</p>
            <p className="text-slate-500 text-xs mt-2">
              {closedTrades.length} / 5 closed trades
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: insufficient diversity ──
  if (!hasDiversity && phase !== "chart") {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900/20 to-slate-900/40 border border-emerald-500/20 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-bold text-white text-lg mb-1">{S.title}</h3>
            <p className="text-slate-400 text-sm">{S.needDiversity}</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: locked ──
  if (phase === "locked") {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900/20 to-slate-900/40 border border-emerald-500/20 p-6 group hover:border-emerald-500/40 transition-all">
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
            </div>
            <Lock className="w-5 h-5 text-emerald-400/40" />
          </div>
          <h3 className="font-bold text-white text-lg mb-1">{S.title}</h3>
          <p className="text-slate-400 text-sm mb-4">{S.subtitle}</p>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center"
                >
                  <span className="text-[10px] text-slate-400">{i + 1}</span>
                </div>
              ))}
            </div>
            <span className="text-xs text-slate-500">{S.questionsToUnlock}</span>
          </div>
          <button
            onClick={handleStart}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-emerald-500/20"
          >
            {S.revealBtn}
          </button>
        </div>
      </div>
    );
  }

  // ── Render: questions ──
  if (phase === "questions") {
    const q = questions[currentQ];
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900/20 to-slate-900/40 border border-emerald-500/30 p-6">
        {/* Progress dots */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-xs text-emerald-400/80 font-semibold tracking-wider uppercase">
                {S.questionN(currentQ)}
              </div>
              <h3 className="text-white font-bold text-base leading-tight">{S.title}</h3>
            </div>
          </div>
          <div className="flex gap-1.5">
            {questions.map((_, i) => (
              <div
                key={i}
                className={`w-7 h-1.5 rounded-full transition-all ${
                  i < currentQ
                    ? "bg-emerald-500"
                    : i === currentQ
                    ? "bg-emerald-400/60"
                    : "bg-slate-700"
                }`}
              />
            ))}
          </div>
        </div>

        <p className="text-white text-base font-semibold mb-4">{q.question}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {q.options.map((opt, i) => {
            const isSelected = selectedIdx === i;
            const showCorrect = feedback === "correct" && isSelected;
            const showWrong = feedback === "wrong" && isSelected;
            return (
              <button
                key={`${currentQ}-${i}-${opt.text}`}
                onClick={() => handleAnswer(i)}
                disabled={feedback === "correct"}
                className={`relative px-4 py-3 rounded-xl border text-sm font-medium transition-all text-left
                  ${
                    showCorrect
                      ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 ring-2 ring-emerald-400/40"
                      : showWrong
                      ? "bg-rose-500/20 border-rose-400 text-rose-300 ring-2 ring-rose-400/40 animate-pulse"
                      : "bg-slate-800/40 border-slate-700 text-slate-200 hover:border-emerald-500/40 hover:bg-slate-800/70"
                  }
                  disabled:cursor-not-allowed
                `}
              >
                <div className="flex items-center justify-between">
                  <span>{opt.text}</span>
                  {showCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                  {showWrong && <XCircle className="w-5 h-5 text-rose-400" />}
                </div>
              </button>
            );
          })}
        </div>

        {feedback === "wrong" && (
          <div className="mt-4 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            <span className="font-bold">{S.wrong}</span>
            <span className="opacity-80 ml-2">— {q.explanation}</span>
          </div>
        )}
        {feedback === "correct" && (
          <div className="mt-4 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span className="font-bold">{S.correct}</span>
            <span className="opacity-80">— {S.nextIn}</span>
          </div>
        )}
      </div>
    );
  }

  // ── Render: chart (unlocked) ──
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900/15 to-slate-900/40 border border-emerald-500/20 p-5">
      <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            {isNegative ? (
              <TrendingDown className="w-5 h-5 text-rose-400" />
            ) : (
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-white font-bold text-base">
                {isNegative ? S.negativeHeader : S.forecastTitle}
              </h3>
              <Unlock className="w-3.5 h-3.5 text-emerald-400/60" />
            </div>
            <p className="text-slate-400 text-xs mt-0.5">
              {isZero
                ? S.zeroReturn
                : S.basedOn(closedTrades.length, monthsOfData)}
            </p>
          </div>
        </div>
        <button
          onClick={handleReset}
          className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors px-2 py-1 rounded-md border border-slate-700/50 hover:border-slate-600"
          title={S.reset}
        >
          ↺ {S.reset}
        </button>
      </div>

      {/* Monthly return badge + deposit input */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="bg-slate-900/50 border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-xl px-3 py-2.5">
          <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
            {S.monthlyReturnLabel}
          </div>
          <div className={`text-lg font-bold mt-0.5 ${isNegative ? "text-rose-400" : "text-emerald-400"}`}>
            {monthlyReturn >= 0 ? "+" : ""}
            {monthlyReturn.toFixed(2)}%
          </div>
        </div>
        <div className="md:col-span-2 bg-slate-900/50 border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-xl px-3 py-2.5">
          <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            {S.monthlyDeposit}
          </label>
          <input
            type="number"
            step="50"
            value={monthlyDeposit === 0 ? "" : monthlyDeposit}
            onChange={(e) => setMonthlyDeposit(Math.max(0, Number(e.target.value) || 0))}
            placeholder={S.enterAmount}
            className="w-full bg-transparent text-white font-mono text-lg font-bold mt-0.5 focus:outline-none placeholder:text-slate-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
      </div>

      {/* Chart */}
      <div className="bg-[var(--bg-elevated)] dark:bg-[#0d1424] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-xl p-3 mb-4">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={forecastData} margin={{ top: 5, right: 10, left: -5, bottom: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colorMain} stopOpacity={0.4} />
                <stop offset="100%" stopColor={colorMain} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: "#475569" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => (v === 0 ? S.fromNow : `${v}m`)}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#475569" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              domain={["auto", "auto"]}
            />
            <ReferenceLine y={effectiveCapital} stroke="#475569" strokeDasharray="4 4" />
            <Tooltip
              contentStyle={{
                background: "#0d1424",
                border: "1px solid #162032",
                borderRadius: 8,
                fontSize: 11,
              }}
              formatter={(v) => {
                const change =
                  effectiveCapital > 0
                    ? (((v - effectiveCapital) / effectiveCapital) * 100).toFixed(1)
                    : "0";
                return [`${fmtUsd(v)} (${change >= 0 ? "+" : ""}${change}%)`, S.balance];
              }}
              labelFormatter={(l) => (l === 0 ? S.fromNow : `Month ${l}`)}
            />
            <Area
              type="monotone"
              dataKey="balance"
              stroke={colorMain}
              strokeWidth={2}
              fill={`url(#${gradId})`}
              dot={false}
              activeDot={{ r: 4, fill: colorMain }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: S.month3, val: m3 },
          { label: S.month12, val: m12 },
          { label: S.month24, val: m24 },
        ].map((c) => (
          <div
            key={c.label}
            className="bg-slate-900/50 border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-xl px-3 py-2.5"
          >
            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
              {c.label}
            </div>
            <div className={`text-base font-bold mt-0.5 font-mono ${isNegative ? "text-rose-300" : "text-white"}`}>
              {fmtUsd(c.val)}
            </div>
            <div
              className={`text-[10px] mt-0.5 font-mono ${
                Number(pct(c.val)) >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {Number(pct(c.val)) >= 0 ? "+" : ""}
              {pct(c.val)}%
            </div>
          </div>
        ))}
      </div>

      {isNegative && (
        <div className="mt-4 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-rose-300 text-xs">{S.negativeSubtitle(fmtUsd(m12))}</p>
          <span className="text-[11px] text-rose-400/80 font-semibold">{S.whatToImprove}</span>
        </div>
      )}
    </div>
  );
}
