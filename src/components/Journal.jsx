import { Plus } from "lucide-react";
import { calcTradeMetrics, fmt$, fmtR } from "../utils";

const Journal = ({ trades, openTrades, closedTrades, setShowForm }) => {
  return (
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
  );
};

export default Journal;
