// ─────────────────────────────────────────────────────────────────────────────
// MonthlyReportTab.jsx — Trading DNA Monthly Report (dedicated tab)
// Vertical-scroll report: header + grade, summary cards, strengths, weaknesses,
// charts (daily P&L, win-rate by week, setup breakdown), and action items.
// All data is computed locally via generateMonthlyReport. Dark/Light + RTL aware.
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo, useState } from "react";
import {
  BarChart, Bar, Cell, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, CheckCircle, AlertTriangle, Award } from "lucide-react";
import { generateMonthlyReport, MONTH_NAMES } from "../intelligence/core/MonthlyReport.js";

// ── helpers ──
const interp = (str, params = {}) =>
  String(str || "").replace(/\{(\w+)\}/g, (_, k) => (params[k] != null ? params[k] : `{${k}}`));

const insightTitle = (t, ins) => t[ins.cat] || ins.cat || "";
const insightDetail = (t, ins) => (t[ins.tid] ? interp(t[ins.tid], ins.params) : ins.detail);

const GRADE_STYLE = {
  A: { ring: "from-emerald-400 to-teal-500", text: "text-emerald-500 dark:text-emerald-400", chip: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30" },
  B: { ring: "from-cyan-400 to-blue-500", text: "text-cyan-500 dark:text-cyan-400", chip: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border-cyan-500/30" },
  C: { ring: "from-amber-400 to-yellow-500", text: "text-amber-500 dark:text-amber-400", chip: "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30" },
  D: { ring: "from-orange-400 to-amber-500", text: "text-orange-500 dark:text-orange-400", chip: "bg-orange-500/15 text-orange-600 dark:text-orange-300 border-orange-500/30" },
  F: { ring: "from-rose-400 to-red-500", text: "text-rose-500 dark:text-rose-400", chip: "bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30" },
};

const PRIORITY_STYLE = {
  high: "bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30",
  medium: "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30",
  low: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border-cyan-500/30",
};

const CARD = "bg-white dark:bg-[#0d1424] border border-slate-200 dark:border-white/10 rounded-xl";

function monthLabel(t, monthIdx, year) {
  const arr = Array.isArray(t.mr_months) ? t.mr_months : MONTH_NAMES;
  return `${arr[monthIdx] || MONTH_NAMES[monthIdx]} ${year}`;
}

function isDarkMode() {
  return typeof document !== "undefined" && document.documentElement.classList.contains("dark");
}

function SectionHeader({ icon: Icon, color, children, right }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon size={15} className={color} />
        <span className="text-[11px] font-semibold tracking-widest uppercase text-slate-500 dark:text-slate-400">{children}</span>
      </div>
      {right}
    </div>
  );
}

function Delta({ value, suffix = "", t, money }) {
  if (value == null || value === 0) return <span className="text-[10px] text-slate-400 dark:text-slate-500">—</span>;
  const up = value > 0;
  const fmt = money ? `$${Math.abs(value).toLocaleString()}` : `${Math.abs(value)}${suffix}`;
  return (
    <span className={`text-[10px] font-mono font-semibold ${up ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>
      {up ? "▲" : "▼"} {fmt} <span className="text-slate-400 dark:text-slate-500 font-normal">{t.mr_vsLastMonth}</span>
    </span>
  );
}

export default function MonthlyReportTab({ trades, calcMetrics, t, lang, isRTL }) {
  // default to the previous completed month
  const now = new Date();
  const defMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const defYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const [sel, setSel] = useState({ month: defMonth, year: defYear });

  // last 12 month options
  const monthOptions = useMemo(() => {
    const out = [];
    const base = new Date(now.getFullYear(), now.getMonth(), 1);
    for (let i = 1; i <= 12; i++) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
      out.push({ month: d.getMonth(), year: d.getFullYear() });
    }
    return out;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const report = useMemo(
    () => generateMonthlyReport(trades, sel.month, sel.year, calcMetrics),
    [trades, sel.month, sel.year, calcMetrics]
  );

  const dark = isDarkMode();
  const tooltipStyle = dark
    ? { background: "#0d1424", border: "1px solid #162032", borderRadius: 8, fontSize: 11, color: "#fff" }
    : { background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 11, color: "#0f172a" };
  const gridStroke = dark ? "#ffffff10" : "#00000010";
  const axisTick = { fontSize: 10, fill: dark ? "#94a3b8" : "#475569" };

  const selector = (
    <select
      value={`${sel.year}-${sel.month}`}
      onChange={(e) => { const [y, m] = e.target.value.split("-").map(Number); setSel({ month: m, year: y }); }}
      className="text-xs font-semibold bg-white dark:bg-[#0d1424] border border-slate-200 dark:border-white/15 rounded-lg px-3 py-1.5 text-slate-700 dark:text-slate-200 outline-none focus:border-cyan-400 cursor-pointer"
    >
      {monthOptions.map((o) => (
        <option key={`${o.year}-${o.month}`} value={`${o.year}-${o.month}`}>{monthLabel(t, o.month, o.year)}</option>
      ))}
    </select>
  );

  // ── HEADER ──
  const gs = GRADE_STYLE[report.grade] || GRADE_STYLE.C;
  const header = (
    <div className={`${CARD} p-5`}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          {report.hasEnoughData && (
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gs.ring} flex items-center justify-center shadow-lg shrink-0`}>
              <span className="text-3xl font-black text-white">{report.grade}</span>
            </div>
          )}
          <div>
            <div className="text-[11px] font-semibold tracking-widest uppercase text-slate-400 dark:text-slate-500">{t.dnaReport}</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{monthLabel(t, sel.month, sel.year)}</div>
            {report.hasEnoughData && (
              <div className={`inline-flex items-center gap-1 mt-1 text-[10px] px-2 py-0.5 rounded-full border font-semibold ${gs.chip}`}>
                <Award size={11} /> {t.mr_grade}: {report.grade} · {report.gradeScore}/100
              </div>
            )}
          </div>
        </div>
        {selector}
      </div>
    </div>
  );

  // ── < 5 trades fallback ──
  if (!report.hasEnoughData) {
    return (
      <div className="space-y-5 animate-fade-in" dir={isRTL ? "rtl" : "ltr"}>
        {header}
        <div className={`${CARD} p-10 text-center`}>
          <div className="text-5xl mb-3">📊</div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">{t.mr_notEnoughTitle}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            {interp(t.mr_notEnough, { n: report.summary.totalTrades, min: report.minTrades })}
          </p>
          <div className="mt-4 inline-flex items-center gap-2">
            <div className="h-2 w-40 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
              <div className="h-full bg-cyan-400" style={{ width: `${Math.min(100, (report.summary.totalTrades / report.minTrades) * 100)}%` }} />
            </div>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{report.summary.totalTrades}/{report.minTrades}</span>
          </div>
        </div>
      </div>
    );
  }

  const { summary, charts } = report;
  const sCard = (label, value, extra) => (
    <div className={`${CARD} p-4`}>
      <div className="text-[10px] font-semibold tracking-widest uppercase text-slate-400 dark:text-slate-500 mb-1">{label}</div>
      <div className="text-xl font-bold font-mono text-slate-900 dark:text-white leading-none">{value}</div>
      <div className="mt-1.5">{extra}</div>
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in" dir={isRTL ? "rtl" : "ltr"}>
      {header}

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {sCard(t.mr_totalTrades, summary.totalTrades, summary.vsLastMonth.hasPrev ? <Delta value={summary.vsLastMonth.trades} t={t} /> : <span className="text-[10px] text-slate-400">{summary.wins}W / {summary.losses}L</span>)}
        {sCard(t.mr_winRate, `${summary.winRate}%`, summary.vsLastMonth.hasPrev ? <Delta value={summary.vsLastMonth.winRate} suffix="%" t={t} /> : null)}
        {sCard(t.mr_netPnL, <span className={summary.netPnL >= 0 ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}>{summary.netPnL >= 0 ? "+" : ""}${summary.netPnL.toLocaleString()}</span>, summary.vsLastMonth.hasPrev ? <Delta value={summary.vsLastMonth.netPnL} money t={t} /> : null)}
        {sCard(t.mr_avgR, <span className={summary.avgR >= 0 ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}>{summary.avgR >= 0 ? "+" : ""}{summary.avgR}R</span>, summary.bestTrade ? <span className="text-[10px] text-slate-400 dark:text-slate-500">{t.mr_best}: {summary.bestTrade.ticker}</span> : null)}
      </div>

      {/* STRENGTHS */}
      <div className={`${CARD} p-5`}>
        <SectionHeader icon={CheckCircle} color="text-emerald-500 dark:text-emerald-400">{t.mr_strengths}</SectionHeader>
        <div className="grid md:grid-cols-3 gap-3">
          {report.strengths.map((ins, i) => (
            <div key={i} className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">✅ {insightTitle(t, ins)}</span>
                {ins.data && <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-300">{ins.data}</span>}
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug">{insightDetail(t, ins)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* WEAKNESSES */}
      <div className={`${CARD} p-5`}>
        <SectionHeader icon={AlertTriangle} color="text-amber-500 dark:text-amber-400">{t.mr_weaknesses}</SectionHeader>
        <div className="grid md:grid-cols-3 gap-3">
          {report.weaknesses.map((ins, i) => (
            <div key={i} className="rounded-lg border border-amber-500/20 bg-amber-500/[0.06] p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">⚠️ {insightTitle(t, ins)}</span>
                {ins.data && <span className="text-[10px] font-mono text-amber-600 dark:text-amber-300">{ins.data}</span>}
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug">{insightDetail(t, ins)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CHARTS */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Daily P&L */}
        <div className={`${CARD} p-4`}>
          <SectionHeader icon={TrendingUp} color="text-cyan-500 dark:text-cyan-400">{t.mr_dailyPnL}</SectionHeader>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={charts.dailyPnL}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="date" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(34,211,238,0.06)" }} formatter={(v) => [`$${v}`, t.mr_netPnL]} />
              <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                {charts.dailyPnL.map((d, i) => (
                  <Cell key={i} fill={d.pnl >= 0 ? "#10B981" : "#F43F5E"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Win rate by week */}
        <div className={`${CARD} p-4`}>
          <SectionHeader icon={Award} color="text-violet-500 dark:text-violet-400">{t.mr_winRateByWeek}</SectionHeader>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={charts.winRateByWeek}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="week" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={axisTick} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, t.mr_winRate]} />
              <Line type="monotone" dataKey="rate" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 3, fill: "#8B5CF6" }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Setup breakdown (horizontal) */}
      <div className={`${CARD} p-4`}>
        <SectionHeader icon={TrendingDown} color="text-cyan-500 dark:text-cyan-400">{t.mr_setupBreakdown}</SectionHeader>
        <ResponsiveContainer width="100%" height={Math.max(120, charts.setupBreakdown.length * 38)}>
          <BarChart data={charts.setupBreakdown} layout="vertical" margin={{ left: 10, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={axisTick} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
            <YAxis type="category" dataKey="setup" tick={axisTick} axisLine={false} tickLine={false} width={90} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(34,211,238,0.06)" }} formatter={(v, n, p) => [`${v}% · ${p.payload.count} ${t.mr_tradesShort}`, t.mr_winRate]} />
            <Bar dataKey="winRate" radius={[0, 4, 4, 0]}>
              {charts.setupBreakdown.map((d, i) => (
                <Cell key={i} fill={d.winRate >= 50 ? "#22d3ee" : "#fb923c"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ACTION ITEMS */}
      <div className={`${CARD} p-5`}>
        <SectionHeader icon={TrendingUp} color="text-cyan-500 dark:text-cyan-400" right={<span className="text-[10px] text-slate-400 dark:text-slate-500">{t.mr_forNextMonth}</span>}>{t.mr_actionItems}</SectionHeader>
        <div className="space-y-2.5">
          {report.actionItems.map((a, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-3">
              <div className="w-6 h-6 rounded-full bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{a.tid && t[a.tid] ? interp(t[a.tid], a.params) : a.action}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold uppercase ${PRIORITY_STYLE[a.priority] || PRIORITY_STYLE.low}`}>{t[`mr_priority_${a.priority}`] || a.priority}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{a.reason}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
