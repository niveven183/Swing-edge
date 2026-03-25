import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from "recharts";
import { DollarSign, TrendingUp, Target, Activity } from "lucide-react";
import StatCard from "./StatCard";
import { CAPITAL, calcTradeMetrics, fmt$, fmtR } from "../utils";

const Dashboard = ({ equityCurve, closedTrades, openTrades, totalPnL, winRate, avgR, curEquity }) => {
  return (
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
  );
};

export default Dashboard;
