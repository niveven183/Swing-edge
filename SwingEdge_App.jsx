import { useState, useEffect, useCallback, useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell
} from "recharts";
import {
  LayoutDashboard, BookOpen, BarChart2, Rss, Search,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  Plus, X, ChevronDown, Filter, RefreshCw, Activity,
  DollarSign, Target, Shield, Zap, ArrowUpRight,
  ArrowDownRight, Clock, Eye, Layers, Cpu, Radio
} from "lucide-react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const CAPITAL = 25000;
const RISK_PCT = 0.01;

const MOCK_TRADES = [
  { id: 1, ticker: "NVDA", date: "2025-01-06", side: "LONG", entry: 138.50, stop: 134.20, target: 148.00, shares: 59, status: "CLOSED", exit: 147.80, setup: "Breakout", notes: "Strong vol. confirmation" },
  { id: 2, ticker: "AMD",  date: "2025-01-10", side: "LONG", entry: 122.00, stop: 118.50, target: 131.00, shares: 71, status: "CLOSED", exit: 130.50, setup: "Pullback",  notes: "Clean retest of 50 EMA" },
  { id: 3, ticker: "SMCI", date: "2025-01-15", side: "LONG", entry: 52.40,  stop: 50.10,  target: 57.50,  shares: 108, status: "CLOSED", exit: 49.80,  setup: "Breakout",  notes: "Stop hit — false break" },
  { id: 4, ticker: "META", date: "2025-01-22", side: "LONG", entry: 598.00, stop: 585.00, target: 625.00, shares: 19, status: "CLOSED", exit: 624.00, setup: "Retest",    notes: "Support held perfectly" },
  { id: 5, ticker: "TSLA", date: "2025-02-03", side: "SHORT",entry: 385.00, stop: 395.00, target: 362.00, shares: 25, status: "CLOSED", exit: 363.00, setup: "Breakdown", notes: "Bear flag confirmed" },
  { id: 6, ticker: "AVGO", date: "2025-02-11", side: "LONG", entry: 215.00, stop: 208.00, target: 232.00, shares: 35, status: "CLOSED", exit: 231.50, setup: "Pullback",  notes: "Fib 0.618 hold" },
  { id: 7, ticker: "AAPL", date: "2025-02-20", side: "LONG", entry: 225.00, stop: 219.00, target: 238.00, shares: 41, status: "CLOSED", exit: 235.00, setup: "Breakout",  notes: "ATH breakout" },
  { id: 8, ticker: "PLTR", date: "2025-03-05", side: "LONG", entry: 94.00,  stop: 89.50,  target: 103.50, shares: 55, status: "OPEN",   exit: null,    setup: "Retest",    notes: "AI catalyst" },
  { id: 9, ticker: "MSTR", date: "2025-03-10", side: "LONG", entry: 318.00, stop: 305.00, target: 348.00, shares: 19, status: "OPEN",   exit: null,    setup: "Breakout",  notes: "BTC correlation" },
];

const MOCK_NEWS = [
  { id: 1, source: "Reuters",      time: "2m ago",  headline: "Fed signals patience on rate cuts amid sticky inflation data", tag: "MACRO",  sentiment: "neutral" },
  { id: 2, source: "Bloomberg",    time: "14m ago", headline: "NVIDIA posts record data center revenue, raises FY26 outlook", tag: "NVDA",   sentiment: "bull" },
  { id: 3, source: "WSJ",          time: "31m ago", headline: "Semiconductor export restrictions tighten — SMCI, AMD in focus", tag: "SEMI",   sentiment: "bear" },
  { id: 4, source: "CNBC",         time: "1h ago",  headline: "Meta AI investment accelerates — $65B capex plan confirmed", tag: "META",   sentiment: "bull" },
  { id: 5, source: "MarketWatch",  time: "2h ago",  headline: "Options market pricing 8% move in TSLA on earnings Thursday", tag: "TSLA",   sentiment: "neutral" },
  { id: 6, source: "Seeking Alpha",time: "3h ago",  headline: "Palantir secures $480M DoD contract — analyst upgrades follow", tag: "PLTR",   sentiment: "bull" },
];

const SCANNER_DATA = [
  { ticker: "NVDA", price: 142.30, change: +3.2,  vol: "98M",  float: "24.4B", rs: 92, setup: "Breakout",  atr: 5.2 },
  { ticker: "PLTR", price: 97.80,  change: +5.8,  vol: "112M", float: "2.1B",  rs: 96, setup: "Breakout",  atr: 3.8 },
  { ticker: "AVGO", price: 221.50, change: +1.9,  vol: "22M",  float: "467B",  rs: 88, setup: "Pullback",  atr: 7.1 },
  { ticker: "META", price: 618.00, change: +2.1,  vol: "18M",  float: "1.56T", rs: 85, setup: "Retest",    atr: 14.2 },
  { ticker: "AMD",  price: 118.40, change: -1.4,  vol: "45M",  float: "192B",  rs: 71, setup: "Pullback",  atr: 4.9 },
  { ticker: "MSTR", price: 334.00, change: +6.2,  vol: "8M",   float: "34B",   rs: 94, setup: "Breakout",  atr: 22.1 },
  { ticker: "SMCI", price: 48.20,  change: -3.1,  vol: "31M",  float: "11.2B", rs: 55, setup: "Breakdown", atr: 3.1 },
  { ticker: "TSLA", price: 278.50, change: -2.4,  vol: "88M",  float: "893B",  rs: 62, setup: "Breakdown", atr: 12.8 },
];

// ─── EQUITY CURVE GENERATION ─────────────────────────────────────────────────
const generateEquityCurve = () => {
  let balance = CAPITAL;
  const data = [];
  MOCK_TRADES.filter(t => t.status === "CLOSED").forEach(t => {
    const pnl = t.side === "LONG"
      ? (t.exit - t.entry) * t.shares
      : (t.entry - t.exit) * t.shares;
    balance += pnl;
    data.push({ date: t.date, equity: Math.round(balance), ticker: t.ticker, pnl: Math.round(pnl) });
  });
  return [{ date: "2025-01-01", equity: CAPITAL, ticker: "START", pnl: 0 }, ...data];
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const calcTradeMetrics = (trade) => {
  if (!trade.exit) return { pnl: null, rMultiple: null };
  const risk = Math.abs(trade.entry - trade.stop) * trade.shares;
  const pnl = trade.side === "LONG"
    ? (trade.exit - trade.entry) * trade.shares
    : (trade.entry - trade.exit) * trade.shares;
  return { pnl, rMultiple: risk > 0 ? pnl / risk : 0 };
};

const fmt$ = (n) => n >= 0
  ? `+$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
  : `-$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

const fmtR = (r) => r >= 0 ? `+${r.toFixed(2)}R` : `${r.toFixed(2)}R`;

// ─── STAT CARD ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, trend, icon: Icon, accent = "cyan" }) => {
  const accents = {
    cyan:   "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 text-emerald-400",
    green:  "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 text-emerald-400",
    purple: "from-violet-500/10 to-violet-500/5 border-violet-500/20 text-violet-400",
    amber:  "from-amber-500/10 to-amber-500/5 border-amber-500/20 text-amber-400",
    red:    "from-rose-500/10 to-rose-500/5 border-rose-500/20 text-rose-400",
  };
  const cls = accents[accent] || accents.cyan;
  return (
    <div className={`bg-gradient-to-br ${cls} border rounded-xl p-4 flex flex-col gap-1 relative overflow-hidden`}>
      <div className="absolute top-3 right-3 opacity-20">
        <Icon size={28} />
      </div>
      <span className="text-xs font-medium tracking-widest uppercase text-slate-500">{label}</span>
      <span className="text-2xl font-bold text-slate-100 font-mono">{value}</span>
      {sub && <span className="text-xs text-slate-500">{sub}</span>}
      {trend !== undefined && (
        <span className={`text-xs font-semibold ${trend >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
          {trend >= 0 ? "▲" : "▼"} {Math.abs(trend).toFixed(1)}%
        </span>
      )}
    </div>
  );
};

// ─── NAV ──────────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard",  icon: LayoutDashboard },
  { id: "journal",   label: "Journal",    icon: BookOpen },
  { id: "analytics", label: "Analytics",  icon: BarChart2 },
  { id: "intel",     label: "Market Intel",icon: Rss },
  { id: "scanner",   label: "Scanner",    icon: Search },
];

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function SwingEdge() {
  const [tab, setTab] = useState("dashboard");
  const [trades, setTrades] = useState(MOCK_TRADES);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ticker: "", side: "LONG", entry: "", stop: "", target: "", setup: "Breakout", notes: "" });
  const [scanFilter, setScanFilter] = useState({ ticker: "", setup: "All", minVol: "" });
  const [pulse, setPulse] = useState(false);
  const [tickerIdx, setTickerIdx] = useState(0);

  const equityCurve = useMemo(() => generateEquityCurve(), [trades]);
  const closedTrades = trades.filter(t => t.status === "CLOSED");
  const openTrades   = trades.filter(t => t.status === "OPEN");

  const totalPnL   = closedTrades.reduce((a, t) => a + (calcTradeMetrics(t).pnl || 0), 0);
  const winRate    = closedTrades.length ? closedTrades.filter(t => (calcTradeMetrics(t).pnl || 0) > 0).length / closedTrades.length * 100 : 0;
  const avgR       = closedTrades.length ? closedTrades.reduce((a, t) => a + (calcTradeMetrics(t).rMultiple || 0), 0) / closedTrades.length : 0;
  const curEquity  = CAPITAL + totalPnL;

  // Ticker tape
  const TICKERS = ["NVDA +3.2%", "PLTR +5.8%", "META +2.1%", "AVGO +1.9%", "AMD -1.4%", "TSLA -2.4%", "MSTR +6.2%", "SMCI -3.1%"];
  useEffect(() => {
    const t = setInterval(() => setTickerIdx(i => (i + 1) % TICKERS.length), 2000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setPulse(p => !p), 1500);
    return () => clearInterval(t);
  }, []);

  // Derived form calcs
  const entryN  = parseFloat(form.entry)  || 0;
  const stopN   = parseFloat(form.stop)   || 0;
  const targetN = parseFloat(form.target) || 0;
  const riskPerShare = Math.abs(entryN - stopN);
  const posSize      = riskPerShare > 0 ? Math.floor((CAPITAL * RISK_PCT) / riskPerShare) : 0;
  const posValue     = posSize * entryN;
  const potGain      = posSize * Math.abs(targetN - entryN);
  const potLoss      = posSize * riskPerShare;
  const rrRatio      = potLoss > 0 ? potGain / potLoss : 0;

  const handleSubmit = () => {
    if (!form.ticker || !entryN || !stopN) return;
    const newTrade = {
      id: trades.length + 1,
      ticker: form.ticker.toUpperCase(),
      date: new Date().toISOString().slice(0, 10),
      side: form.side,
      entry: entryN, stop: stopN, target: targetN,
      shares: posSize, status: "OPEN", exit: null,
      setup: form.setup, notes: form.notes,
    };
    setTrades(prev => [...prev, newTrade]);
    setForm({ ticker: "", side: "LONG", entry: "", stop: "", target: "", setup: "Breakout", notes: "" });
    setShowForm(false);
    setTab("journal");
  };

  const filteredScanner = SCANNER_DATA.filter(s => {
    const tickOk  = !scanFilter.ticker || s.ticker.includes(scanFilter.ticker.toUpperCase());
    const setupOk = scanFilter.setup === "All" || s.setup === scanFilter.setup;
    return tickOk && setupOk;
  });

  return (
    <div className="min-h-screen bg-[#07090f] text-slate-200 font-sans flex flex-col" style={{ fontFamily: "'Inter', 'DM Sans', 'Segoe UI', sans-serif" }}>

      {/* ── HEADER ── */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-[#09101a]/90 backdrop-blur-md sticky top-0 z-50">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center">
            <Zap size={14} className="text-white" />
          </div>
          <span className="font-bold text-sm tracking-wider text-white">SWING<span className="text-emerald-400">EDGE</span></span>
          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 tracking-widest uppercase">Pro</span>
        </div>

        {/* Ticker Tape */}
        <div className="hidden md:flex items-center gap-4 text-xs font-mono">
          {TICKERS.map((t, i) => {
            const bull = t.includes("+");
            return (
              <span key={i} className={`transition-all duration-500 ${i === tickerIdx ? "opacity-100 scale-105" : "opacity-40"} ${bull ? "text-emerald-400" : "text-rose-400"}`}>
                {t}
              </span>
            );
          })}
        </div>

        {/* Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${pulse ? "bg-emerald-400" : "bg-emerald-600"} transition-colors`} />
            <span className="text-[10px] text-slate-500 tracking-wider">LIVE</span>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-xs text-slate-500">Account</div>
            <div className="text-sm font-bold font-mono text-emerald-400">${curEquity.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
      </header>

      {/* ── NAV ── */}
      <nav className="flex items-center gap-1 px-4 pt-3 pb-0 border-b border-white/5 overflow-x-auto">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold tracking-wide rounded-t-lg transition-all whitespace-nowrap
              ${tab === id
                ? "bg-[#0d1a14] text-emerald-400 border border-white/10 border-b-[#07090f] -mb-px"
                : "text-slate-500 hover:text-slate-300"}`}>
            <Icon size={13} />
            {label}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-500 text-white hover:opacity-90 transition mb-1">
          <Plus size={13} /> New Trade
        </button>
      </nav>

      {/* ── CONTENT ── */}
      <main className="flex-1 overflow-auto p-4 md:p-5 space-y-5">

        {/* ══════════════ DASHBOARD ══════════════ */}
        {tab === "dashboard" && (
          <div className="space-y-5 animate-fade-in">
            {/* KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Account Equity"  value={`$${curEquity.toLocaleString()}`} sub={`Started at $${CAPITAL.toLocaleString()}`} trend={totalPnL/CAPITAL*100} icon={DollarSign} accent="cyan" />
              <StatCard label="Net P&L (Closed)" value={fmt$(Math.round(totalPnL))} sub={`${closedTrades.length} closed trades`} trend={totalPnL/CAPITAL*100} icon={TrendingUp} accent={totalPnL >= 0 ? "green" : "red"} />
              <StatCard label="Win Rate" value={`${winRate.toFixed(0)}%`} sub={`${closedTrades.filter(t=>(calcTradeMetrics(t).pnl||0)>0).length}W / ${closedTrades.filter(t=>(calcTradeMetrics(t).pnl||0)<0).length}L`} icon={Target} accent="purple" />
              <StatCard label="Avg R Multiple" value={fmtR(avgR)} sub="Per closed trade" icon={Activity} accent="amber" />
            </div>

            {/* Mini Equity + Open Positions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Equity mini */}
              <div className="md:col-span-2 bg-[#0c1118] border border-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold tracking-widest uppercase text-slate-500">Equity Curve</span>
                  <span className="text-xs text-emerald-400 font-mono">{equityCurve.length} data pts</span>
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={equityCurve}>
                    <defs>
                      <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#475569" }} tickLine={false} axisLine={false} />
                    <YAxis domain={["auto", "auto"]} tick={{ fontSize: 9, fill: "#475569" }} tickLine={false} axisLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                    <ReferenceLine y={CAPITAL} stroke="#475569" strokeDasharray="4 4" />
                    <Tooltip contentStyle={{ background: "#0c1118", border: "1px solid #1a3a2e", borderRadius: 8, fontSize: 11 }} formatter={(v) => [`$${v.toLocaleString()}`, "Equity"]} />
                    <Area type="monotone" dataKey="equity" stroke="#10b981" strokeWidth={2} fill="url(#eqGrad)" dot={{ fill: "#10b981", r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Open trades */}
              <div className="bg-[#0c1118] border border-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold tracking-widest uppercase text-slate-500">Open Positions</span>
                  <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">{openTrades.length}</span>
                </div>
                <div className="space-y-2">
                  {openTrades.map(t => {
                    const riskPerSh = Math.abs(t.entry - t.stop);
                    const exposure = t.shares * t.entry;
                    return (
                      <div key={t.id} className="bg-white/3 rounded-lg p-3 border border-white/5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-white font-mono">{t.ticker}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${t.side === "LONG" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"}`}>{t.side}</span>
                        </div>
                        <div className="mt-1 grid grid-cols-2 gap-x-3 text-[10px] text-slate-500 font-mono">
                          <span>Entry <span className="text-slate-300">${t.entry}</span></span>
                          <span>Stop <span className="text-rose-400">${t.stop}</span></span>
                          <span>Target <span className="text-emerald-400">${t.target}</span></span>
                          <span>Shares <span className="text-slate-300">{t.shares}</span></span>
                        </div>
                        <div className="mt-1.5 h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full" style={{ width: "55%" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Recent Closed */}
            <div className="bg-[#0c1118] border border-white/5 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold tracking-widest uppercase text-slate-500">Recent Closed Trades</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-600 border-b border-white/5">
                      {["Ticker","Date","Side","Entry","Exit","Shares","P&L","R Multiple","Setup"].map(h => (
                        <th key={h} className="pb-2 text-left font-semibold tracking-wider pr-4">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {closedTrades.slice(-5).reverse().map(t => {
                      const { pnl, rMultiple } = calcTradeMetrics(t);
                      const win = pnl > 0;
                      return (
                        <tr key={t.id} className="border-b border-white/3 hover:bg-white/3 transition-colors">
                          <td className="py-2 pr-4 font-bold text-white font-mono">{t.ticker}</td>
                          <td className="py-2 pr-4 text-slate-500">{t.date}</td>
                          <td className="py-2 pr-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${t.side==="LONG"?"bg-emerald-500/10 text-emerald-400":"bg-rose-500/10 text-rose-400"}`}>{t.side}</span></td>
                          <td className="py-2 pr-4 font-mono text-slate-300">${t.entry}</td>
                          <td className="py-2 pr-4 font-mono text-slate-300">${t.exit}</td>
                          <td className="py-2 pr-4 font-mono text-slate-400">{t.shares}</td>
                          <td className={`py-2 pr-4 font-bold font-mono ${win ? "text-emerald-400" : "text-rose-400"}`}>{fmt$(Math.round(pnl))}</td>
                          <td className={`py-2 pr-4 font-bold font-mono ${rMultiple >= 0 ? "text-teal-400" : "text-rose-400"}`}>{fmtR(rMultiple)}</td>
                          <td className="py-2 pr-4"><span className="text-[10px] px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">{t.setup}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════ JOURNAL ══════════════ */}
        {tab === "journal" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white">Trade Journal</h2>
                <p className="text-xs text-slate-600 mt-0.5">{trades.length} total entries · {openTrades.length} open · {closedTrades.length} closed</p>
              </div>
              <button onClick={() => setShowForm(true)} className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-500 text-white hover:opacity-90 transition">
                <Plus size={12} /> Log Trade
              </button>
            </div>
            <div className="overflow-x-auto bg-[#0c1118] border border-white/5 rounded-xl">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-600 border-b border-white/5 text-[10px] tracking-widest uppercase">
                    {["Ticker","Date","Side","Entry","Stop","Target","Shares","Exit","P&L","R","Setup","Status","Notes"].map(h => (
                      <th key={h} className="p-3 text-left font-semibold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...trades].reverse().map(t => {
                    const { pnl, rMultiple } = calcTradeMetrics(t);
                    const isOpen = t.status === "OPEN";
                    const win = !isOpen && pnl > 0;
                    return (
                      <tr key={t.id} className="border-b border-white/3 hover:bg-white/3 transition-colors">
                        <td className="p-3 font-bold text-white font-mono whitespace-nowrap">{t.ticker}</td>
                        <td className="p-3 text-slate-500 whitespace-nowrap">{t.date}</td>
                        <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${t.side==="LONG"?"bg-emerald-500/10 text-emerald-400":"bg-rose-500/10 text-rose-400"}`}>{t.side}</span></td>
                        <td className="p-3 font-mono text-slate-300">${t.entry}</td>
                        <td className="p-3 font-mono text-rose-400">${t.stop}</td>
                        <td className="p-3 font-mono text-emerald-400">${t.target}</td>
                        <td className="p-3 font-mono text-slate-400">{t.shares}</td>
                        <td className="p-3 font-mono text-slate-300">{t.exit ? `$${t.exit}` : "–"}</td>
                        <td className={`p-3 font-bold font-mono ${isOpen ? "text-slate-500" : win ? "text-emerald-400" : "text-rose-400"}`}>
                          {isOpen ? "–" : fmt$(Math.round(pnl))}
                        </td>
                        <td className={`p-3 font-bold font-mono text-xs ${isOpen ? "text-slate-500" : rMultiple >= 0 ? "text-teal-400" : "text-rose-400"}`}>
                          {isOpen ? "–" : fmtR(rMultiple)}
                        </td>
                        <td className="p-3"><span className="text-[10px] px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 whitespace-nowrap">{t.setup}</span></td>
                        <td className="p-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${isOpen ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-slate-500/10 text-slate-500 border border-slate-700"}`}>{t.status}</span></td>
                        <td className="p-3 text-slate-600 max-w-[140px] truncate" title={t.notes}>{t.notes}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══════════════ ANALYTICS ══════════════ */}
        {tab === "analytics" && (
          <div className="space-y-5 animate-fade-in">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Total Trades"  value={trades.length}     sub="All time"      icon={Layers}    accent="cyan"   />
              <StatCard label="Win Rate"       value={`${winRate.toFixed(1)}%`} sub={`${closedTrades.filter(t=>(calcTradeMetrics(t).pnl||0)>0).length} wins`} icon={CheckCircle} accent="green" />
              <StatCard label="Avg R Multiple" value={fmtR(avgR)}        sub="Closed trades" icon={Activity}  accent="purple" />
              <StatCard label="Total Return"   value={`${(totalPnL/CAPITAL*100).toFixed(2)}%`} sub={`$${Math.round(Math.abs(totalPnL)).toLocaleString()} P&L`} icon={TrendingUp} accent={totalPnL>=0?"green":"red"} />
            </div>

            {/* Full Equity Curve */}
            <div className="bg-[#0c1118] border border-white/5 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Equity Curve</h3>
                  <p className="text-xs text-slate-600">Account balance over time · starting capital $25,000</p>
                </div>
                <span className={`text-sm font-bold font-mono ${totalPnL>=0?"text-emerald-400":"text-rose-400"}`}>{fmt$(Math.round(totalPnL))}</span>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={equityCurve} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="eqFull" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#475569" }} tickLine={false} axisLine={false} />
                  <YAxis domain={["auto","auto"]} tick={{ fontSize: 10, fill: "#475569" }} tickLine={false} axisLine={false} tickFormatter={v=>`$${(v/1000).toFixed(1)}k`} />
                  <ReferenceLine y={CAPITAL} stroke="#475569" strokeDasharray="5 5" label={{ value: "Starting Capital", position: "insideTopRight", fontSize: 9, fill: "#475569" }} />
                  <Tooltip
                    contentStyle={{ background: "#0c1118", border: "1px solid #1a3a2e", borderRadius: 10, fontSize: 11 }}
                    formatter={(v, n, p) => [`$${v.toLocaleString()} (${p.payload.ticker})`, "Equity"]}
                  />
                  <Area type="monotone" dataKey="equity" stroke="#10b981" strokeWidth={2.5} fill="url(#eqFull)" dot={{ fill: "#10b981", r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: "#10b981" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Per-trade P&L bars */}
            <div className="bg-[#0c1118] border border-white/5 rounded-xl p-5">
              <h3 className="text-sm font-bold text-white mb-4">P&amp;L by Trade</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={closedTrades.map(t => ({ name: t.ticker, pnl: Math.round(calcTradeMetrics(t).pnl || 0) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#475569" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#475569" }} tickLine={false} axisLine={false} tickFormatter={v=>`$${v}`} />
                  <Tooltip contentStyle={{ background: "#0c1118", border: "1px solid #1a3a2e", borderRadius: 10, fontSize: 11 }} formatter={v=>[fmt$(v),"P&L"]} />
                  <ReferenceLine y={0} stroke="#334155" />
                  <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                    {closedTrades.map((t, i) => {
                      const { pnl } = calcTradeMetrics(t);
                      return <Cell key={i} fill={pnl > 0 ? "#10b981" : "#f43f5e"} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Setup breakdown */}
            <div className="bg-[#0c1118] border border-white/5 rounded-xl p-5">
              <h3 className="text-sm font-bold text-white mb-4">Performance by Setup</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {["Breakout","Pullback","Retest","Breakdown"].map(setup => {
                  const s = closedTrades.filter(t => t.setup === setup);
                  const wins = s.filter(t => (calcTradeMetrics(t).pnl||0) > 0).length;
                  const wr = s.length ? wins/s.length*100 : 0;
                  const totalR = s.reduce((a,t) => a + (calcTradeMetrics(t).rMultiple||0), 0);
                  return (
                    <div key={setup} className="bg-white/3 rounded-xl p-3 border border-white/5">
                      <div className="text-xs font-semibold text-violet-400 mb-2">{setup}</div>
                      <div className="font-bold text-white text-lg font-mono">{wr.toFixed(0)}%</div>
                      <div className="text-[10px] text-slate-500">{s.length} trades · {totalR.toFixed(1)}R total</div>
                      <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all" style={{ width: `${wr}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════ INTEL ══════════════ */}
        {tab === "intel" && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Chart placeholder */}
              <div className="md:col-span-2 bg-[#0c1118] border border-white/5 rounded-xl overflow-hidden" style={{ height: 420 }}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                  <span className="text-xs font-semibold tracking-widest uppercase text-slate-500">TradingView Chart</span>
                  <div className="flex gap-2">
                    {["1D","4H","1H","15m"].map(tf => (
                      <button key={tf} className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-400 transition">{tf}</button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center h-[calc(100%-48px)] gap-3 text-slate-700">
                  <div className="w-14 h-14 rounded-2xl bg-white/3 flex items-center justify-center border border-white/5">
                    <BarChart2 size={24} className="text-slate-600" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-500">TradingView Embed</p>
                    <p className="text-xs text-slate-700 mt-1">Connect your TradingView account<br />to display live charts here</p>
                  </div>
                  <button className="text-xs px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 text-emerald-400 hover:opacity-80 transition">
                    Connect TradingView →
                  </button>
                </div>
              </div>

              {/* Watchlist */}
              <div className="bg-[#0c1118] border border-white/5 rounded-xl p-4" style={{ height: 420, overflowY: "auto" }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold tracking-widest uppercase text-slate-500">Watchlist</span>
                  <Radio size={12} className="text-emerald-400" />
                </div>
                <div className="space-y-2">
                  {SCANNER_DATA.map(s => (
                    <div key={s.ticker} className="flex items-center justify-between p-2.5 bg-white/3 rounded-lg border border-white/5 hover:border-emerald-500/20 hover:bg-emerald-500/3 transition cursor-pointer">
                      <div>
                        <div className="font-bold text-xs text-white font-mono">{s.ticker}</div>
                        <div className="text-[10px] text-slate-600">{s.setup}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-mono font-bold text-slate-200">${s.price}</div>
                        <div className={`text-[10px] font-mono font-semibold flex items-center justify-end gap-0.5 ${s.change>=0?"text-emerald-400":"text-rose-400"}`}>
                          {s.change>=0?<ArrowUpRight size={10}/>:<ArrowDownRight size={10}/>}
                          {s.change>=0?"+":""}{s.change}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* News Feed */}
            <div className="bg-[#0c1118] border border-white/5 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold tracking-widest uppercase text-slate-500">Market News</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${pulse?"bg-emerald-400":"bg-emerald-700"} transition-colors`} />
                </div>
                <button className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-emerald-400 transition">
                  <RefreshCw size={10} /> Refresh
                </button>
              </div>
              <div className="space-y-2">
                {MOCK_NEWS.map(n => (
                  <div key={n.id} className="flex items-start gap-3 p-3 bg-white/3 rounded-lg border border-white/5 hover:border-white/10 transition cursor-pointer group">
                    <div className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${n.sentiment==="bull"?"bg-emerald-400":n.sentiment==="bear"?"bg-rose-400":"bg-amber-400"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-300 group-hover:text-white transition leading-relaxed">{n.headline}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-slate-600">{n.source}</span>
                        <span className="text-[10px] text-slate-700">·</span>
                        <span className="text-[10px] text-slate-600">{n.time}</span>
                      </div>
                    </div>
                    <span className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold border ${n.tag.length<=4?"bg-violet-500/10 text-violet-400 border-violet-500/20":"bg-amber-500/10 text-amber-400 border-amber-500/20"}`}>{n.tag}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════ SCANNER ══════════════ */}
        {tab === "scanner" && (
          <div className="space-y-4 animate-fade-in">
            {/* Filters */}
            <div className="bg-[#0c1118] border border-white/5 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Filter size={13} className="text-emerald-400" />
                <span className="text-xs font-semibold tracking-widest uppercase text-slate-500">Scanner Filters</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] text-slate-600 tracking-wider uppercase block mb-1">Ticker</label>
                  <input value={scanFilter.ticker} onChange={e => setScanFilter(f=>({...f,ticker:e.target.value}))}
                    placeholder="e.g. NVDA" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition font-mono" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-600 tracking-wider uppercase block mb-1">Setup</label>
                  <select value={scanFilter.setup} onChange={e=>setScanFilter(f=>({...f,setup:e.target.value}))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:border-emerald-500/50 focus:outline-none transition appearance-none" style={{background:"#0c1118"}}>
                    {["All","Breakout","Pullback","Retest","Breakdown"].map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-600 tracking-wider uppercase block mb-1">Min RS Score</label>
                  <input placeholder="e.g. 80" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:border-emerald-500/50 focus:outline-none transition font-mono" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-600 tracking-wider uppercase block mb-1">Sector</label>
                  <select className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:border-emerald-500/50 focus:outline-none transition appearance-none" style={{background:"#0c1118"}}>
                    {["All","Technology","Semiconductors","AI/Cloud","Fintech"].map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <button className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-500 text-white hover:opacity-90 transition font-semibold">
                  <Search size={11} /> Scan
                </button>
                <button onClick={()=>setScanFilter({ticker:"",setup:"All",minVol:""})} className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition">
                  Clear
                </button>
                <span className="ml-auto text-[10px] text-slate-600">{filteredScanner.length} results</span>
              </div>
            </div>

            {/* Scanner Results */}
            <div className="bg-[#0c1118] border border-white/5 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] tracking-widest uppercase text-slate-600 border-b border-white/5">
                    {["Ticker","Price","Change","Volume","Float","RS Score","Setup","ATR","Action"].map(h=>(
                      <th key={h} className="p-3 text-left font-semibold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredScanner.map(s => (
                    <tr key={s.ticker} className="border-b border-white/3 hover:bg-white/3 transition-colors group">
                      <td className="p-3 font-bold text-white font-mono">{s.ticker}</td>
                      <td className="p-3 font-mono text-slate-300">${s.price}</td>
                      <td className={`p-3 font-bold font-mono ${s.change>=0?"text-emerald-400":"text-rose-400"}`}>
                        <span className="flex items-center gap-0.5">{s.change>=0?<ArrowUpRight size={11}/>:<ArrowDownRight size={11}/>}{s.change>=0?"+":""}{s.change}%</span>
                      </td>
                      <td className="p-3 font-mono text-slate-400">{s.vol}</td>
                      <td className="p-3 font-mono text-slate-400">{s.float}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold font-mono ${s.rs>=90?"text-emerald-400":s.rs>=80?"text-teal-400":s.rs>=70?"text-amber-400":"text-rose-400"}`}>{s.rs}</span>
                          <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${s.rs}%`, background: s.rs>=90?"#10b981":s.rs>=80?"#14b8a6":s.rs>=70?"#f59e0b":"#f43f5e" }} />
                          </div>
                        </div>
                      </td>
                      <td className="p-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${s.setup==="Breakout"?"bg-emerald-500/10 text-emerald-400 border-emerald-500/20":s.setup==="Pullback"?"bg-violet-500/10 text-violet-400 border-violet-500/20":s.setup==="Retest"?"bg-amber-500/10 text-amber-400 border-amber-500/20":"bg-rose-500/10 text-rose-400 border-rose-500/20"}`}>{s.setup}</span></td>
                      <td className="p-3 font-mono text-slate-400">${s.atr}</td>
                      <td className="p-3">
                        <button onClick={() => { setForm(f=>({...f, ticker: s.ticker, entry: String(s.price)})); setShowForm(true); }}
                          className="text-[10px] px-2 py-1 rounded bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 text-emerald-400 hover:opacity-80 transition opacity-0 group-hover:opacity-100">
                          + Log
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ── TRADE ENTRY MODAL ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#0c1118] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-gradient-to-r from-emerald-500/5 to-teal-500/5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center">
                  <Plus size={12} className="text-white" />
                </div>
                <span className="text-sm font-bold text-white">Log New Trade</span>
              </div>
              <button onClick={()=>setShowForm(false)} className="text-slate-600 hover:text-slate-300 transition">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Row 1 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">Ticker *</label>
                  <input value={form.ticker} onChange={e=>setForm(f=>({...f,ticker:e.target.value.toUpperCase()}))}
                    placeholder="NVDA" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition font-mono font-bold tracking-wider" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">Direction</label>
                  <div className="flex gap-2">
                    {["LONG","SHORT"].map(s=>(
                      <button key={s} onClick={()=>setForm(f=>({...f,side:s}))}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition border ${form.side===s?(s==="LONG"?"bg-emerald-500/20 text-emerald-400 border-emerald-500/30":"bg-rose-500/20 text-rose-400 border-rose-500/30"):"bg-white/3 text-slate-500 border-white/10 hover:border-white/20"}`}>
                        {s==="LONG"?<span className="flex items-center justify-center gap-1"><TrendingUp size={11}/>{s}</span>:<span className="flex items-center justify-center gap-1"><TrendingDown size={11}/>{s}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Prices */}
              <div className="grid grid-cols-3 gap-3">
                {[["Entry *","entry","text-white"],["Stop Loss *","stop","text-rose-400"],["Target","target","text-emerald-400"]].map(([label,key,cls])=>(
                  <div key={key}>
                    <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">{label}</label>
                    <input value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}
                      placeholder="0.00" className={`w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm placeholder-slate-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition font-mono ${cls}`} />
                  </div>
                ))}
              </div>

              {/* Calculated metrics */}
              {entryN > 0 && stopN > 0 && (
                <div className="grid grid-cols-4 gap-2 bg-white/3 rounded-xl p-3 border border-white/5">
                  <div className="text-center">
                    <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-0.5">Shares</div>
                    <div className="text-sm font-bold font-mono text-emerald-400">{posSize}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-0.5">Pos. Value</div>
                    <div className="text-sm font-bold font-mono text-white">${posValue.toLocaleString()}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-0.5">Max Risk</div>
                    <div className="text-sm font-bold font-mono text-rose-400">${Math.round(potLoss).toLocaleString()}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-0.5">R/R Ratio</div>
                    <div className={`text-sm font-bold font-mono ${rrRatio>=2?"text-emerald-400":rrRatio>=1?"text-amber-400":"text-rose-400"}`}>{rrRatio.toFixed(2)}:1</div>
                  </div>
                </div>
              )}

              {/* Setup + Notes */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">Setup</label>
                  <select value={form.setup} onChange={e=>setForm(f=>({...f,setup:e.target.value}))}
                    className="w-full border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500/50 focus:outline-none transition appearance-none" style={{background:"#0c1118"}}>
                    {["Breakout","Pullback","Retest","Breakdown","Other"].map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">Notes</label>
                  <input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
                    placeholder="Trade thesis..." className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-emerald-500/50 focus:outline-none transition" />
                </div>
              </div>

              {/* RR quality indicator */}
              {entryN > 0 && stopN > 0 && targetN > 0 && (
                <div className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs ${rrRatio>=2?"bg-emerald-500/5 border-emerald-500/20 text-emerald-400":rrRatio>=1?"bg-amber-500/5 border-amber-500/20 text-amber-400":"bg-rose-500/5 border-rose-500/20 text-rose-400"}`}>
                  {rrRatio>=2?<CheckCircle size={13}/>:<AlertTriangle size={13}/>}
                  <span>{rrRatio>=2?"Great setup — R/R exceeds 2:1 minimum":rrRatio>=1?"Acceptable — consider widening target for better R/R":"Below minimum — avoid setups below 1:1 R/R"}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button onClick={handleSubmit}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white text-sm font-bold hover:opacity-90 transition">
                  Log Trade →
                </button>
                <button onClick={()=>setShowForm(false)} className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-sm hover:text-white hover:border-white/20 transition">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FOOTER STATUS BAR ── */}
      <footer className="flex items-center justify-between px-5 py-2 border-t border-white/5 bg-[#07090f] text-[10px] text-slate-700 font-mono">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1"><span className={`w-1.5 h-1.5 rounded-full ${pulse?"bg-emerald-500":"bg-emerald-800"} transition-colors`}/> Market Open</span>
          <span>Capital: $25,000</span>
          <span>Risk/Trade: 1%</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Trades: {trades.length}</span>
          <span>Open: {openTrades.length}</span>
          <span>SwingEdge Pro v1.0</span>
        </div>
      </footer>
    </div>
  );
}
