import { BarChart2, ArrowUpRight, ArrowDownRight, RefreshCw, Radio } from "lucide-react";

const MarketIntel = ({ news, scannerData, pulse }) => {
  return (
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
            {scannerData.map(s => (
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
          {news.map(n => (
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
  );
};

export default MarketIntel;
