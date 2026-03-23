import { Filter, Search, ArrowUpRight, ArrowDownRight } from "lucide-react";

const Scanner = ({ scanFilter, setScanFilter, filteredScanner, setForm, setShowForm }) => {
  return (
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
  );
};

export default Scanner;
