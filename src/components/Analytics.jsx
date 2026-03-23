import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell
} from "recharts";
import { Layers, CheckCircle, Activity, TrendingUp } from "lucide-react";
import StatCard from "./StatCard";
import { CAPITAL, calcTradeMetrics, fmt$, fmtR } from "../utils";

const Analytics = ({ trades, closedTrades, equityCurve, totalPnL, winRate, avgR }) => {
  return (
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
  );
};

export default Analytics;
