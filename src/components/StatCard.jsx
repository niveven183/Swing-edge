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

export default StatCard;
