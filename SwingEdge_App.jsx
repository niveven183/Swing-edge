import { useState, useEffect, useMemo } from "react";
import {
  LayoutDashboard, BookOpen, BarChart2, Rss, Search,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  Plus, X, Zap
} from "lucide-react";

import Dashboard   from "./src/components/Dashboard";
import Journal     from "./src/components/Journal";
import Analytics   from "./src/components/Analytics";
import MarketIntel from "./src/components/MarketIntel";
import Scanner     from "./src/components/Scanner";

import { CAPITAL, RISK_PCT, calcTradeMetrics } from "./src/utils";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
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

// ─── NAV ──────────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard",   icon: LayoutDashboard },
  { id: "journal",   label: "Journal",     icon: BookOpen },
  { id: "analytics", label: "Analytics",   icon: BarChart2 },
  { id: "intel",     label: "Market Intel", icon: Rss },
  { id: "scanner",   label: "Scanner",     icon: Search },
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

  const totalPnL  = closedTrades.reduce((a, t) => a + (calcTradeMetrics(t).pnl || 0), 0);
  const winRate   = closedTrades.length ? closedTrades.filter(t => (calcTradeMetrics(t).pnl || 0) > 0).length / closedTrades.length * 100 : 0;
  const avgR      = closedTrades.length ? closedTrades.reduce((a, t) => a + (calcTradeMetrics(t).rMultiple || 0), 0) / closedTrades.length : 0;
  const curEquity = CAPITAL + totalPnL;

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
        {tab === "dashboard" && (
          <Dashboard
            equityCurve={equityCurve}
            closedTrades={closedTrades}
            openTrades={openTrades}
            totalPnL={totalPnL}
            winRate={winRate}
            avgR={avgR}
            curEquity={curEquity}
          />
        )}
        {tab === "journal" && (
          <Journal
            trades={trades}
            openTrades={openTrades}
            closedTrades={closedTrades}
            setShowForm={setShowForm}
          />
        )}
        {tab === "analytics" && (
          <Analytics
            trades={trades}
            closedTrades={closedTrades}
            equityCurve={equityCurve}
            totalPnL={totalPnL}
            winRate={winRate}
            avgR={avgR}
          />
        )}
        {tab === "intel" && (
          <MarketIntel
            news={MOCK_NEWS}
            scannerData={SCANNER_DATA}
            pulse={pulse}
          />
        )}
        {tab === "scanner" && (
          <Scanner
            scanFilter={scanFilter}
            setScanFilter={setScanFilter}
            filteredScanner={filteredScanner}
            setForm={setForm}
            setShowForm={setShowForm}
          />
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
