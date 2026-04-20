import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, RefreshCw } from "lucide-react";
import { searchTickers, fetchPrices } from "../priceService.js";

// Maps a Yahoo search result → a TradingView-ready symbol string.
export function toTvSymbol(q) {
  if (!q) return "NASDAQ:NVDA";
  const symbol = (q.symbol || "").toUpperCase();
  const exch = (q.exchange || "").toUpperCase();
  const type = (q.type || q.quoteType || "").toUpperCase();

  if (type === "CRYPTOCURRENCY") {
    const base = symbol.replace("-USD", "").replace("USD", "");
    return `BINANCE:${base}USDT`;
  }
  if (type === "CURRENCY") {
    const s = symbol.replace("=X", "");
    return `FX:${s}`;
  }
  if (type === "INDEX") {
    if (symbol.startsWith("^")) return `TVC:${symbol.slice(1)}`;
    return symbol;
  }
  if (type === "FUTURE") return symbol;

  // Equities / ETFs — prefer Yahoo's exchange hint when sensible
  const exchMap = {
    NMS: "NASDAQ", NGM: "NASDAQ", NCM: "NASDAQ", NAS: "NASDAQ",
    NYQ: "NYSE", NYE: "NYSE", ASE: "AMEX", PCX: "AMEX",
    LSE: "LSE", TOR: "TSX",
  };
  const tvExch = exchMap[exch] || (exch && /^[A-Z]{2,6}$/.test(exch) ? exch : "NASDAQ");
  return `${tvExch}:${symbol}`;
}

// Flatten any TV symbol / raw input into a plain ticker for price lookup.
function cleanSymbol(input) {
  if (!input) return "";
  const raw = input.toUpperCase();
  const afterColon = raw.includes(":") ? raw.split(":")[1] : raw;
  return afterColon.replace(/USDT$|USD$/, "").replace(/-USD$/, "");
}

export default function TradingViewSearch({ value, onPick, livePrices = {}, setLivePrices, placeholder = "Search symbol..." }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const timer = useRef(null);
  const wrap = useRef(null);
  const inputRef = useRef(null);

  const currentTicker = cleanSymbol(value);
  const currentPrice = livePrices[currentTicker]?.price;
  const currentChangePct = livePrices[currentTicker]?.changePct;

  useEffect(() => {
    const handler = (e) => {
      if (wrap.current && !wrap.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const doSearch = useCallback((q) => {
    if (timer.current) clearTimeout(timer.current);
    if (!q || q.length < 1) { setResults([]); return; }
    setLoading(true);
    timer.current = setTimeout(async () => {
      const r = await searchTickers(q);
      setResults(r);
      setLoading(false);
      setActiveIdx(-1);
      if (r.length > 0 && setLivePrices) {
        const top = r.slice(0, 8).map((x) => cleanSymbol(x.symbol));
        fetchPrices(top).then((pd) => {
          if (pd && Object.keys(pd).length > 0) {
            setLivePrices((prev) => ({ ...prev, ...pd }));
          }
        }).catch(() => {});
      }
    }, 250);
  }, [setLivePrices]);

  const pick = (r) => {
    const tvSym = toTvSymbol(r);
    onPick?.(tvSym, r);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pickIdx = activeIdx >= 0 ? activeIdx : 0;
      if (results[pickIdx]) pick(results[pickIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrap} className="relative flex-1 min-w-0">
      <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 focus-within:border-cyan-500/50 transition">
        <Search size={13} className="text-slate-500 shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { const v = e.target.value; setQuery(v); setOpen(true); doSearch(v); }}
          onFocus={() => { setOpen(true); if (query) doSearch(query); }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-xs font-mono text-white placeholder-slate-500 focus:outline-none min-w-0"
        />
        {query && (
          <button onClick={() => { setQuery(""); setResults([]); inputRef.current?.focus(); }}
            className="text-slate-500 hover:text-white transition">
            <X size={12} />
          </button>
        )}
        {loading && <RefreshCw size={11} className="animate-spin text-cyan-400" />}
        {!query && value && (
          <span className="text-[10px] font-mono text-cyan-300 font-bold whitespace-nowrap">
            {value}
            {typeof currentPrice === "number" && <span className="text-slate-400 ml-1">${currentPrice.toFixed(2)}</span>}
            {typeof currentChangePct === "number" && (
              <span className={`ml-1 ${currentChangePct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {currentChangePct >= 0 ? "+" : ""}{currentChangePct.toFixed(2)}%
              </span>
            )}
          </span>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#0d1424] border border-white/10 rounded-lg shadow-2xl z-30 max-h-80 overflow-y-auto">
          {results.map((r, i) => {
            const ticker = cleanSymbol(r.symbol);
            const lp = livePrices[ticker] || livePrices[r.symbol];
            const active = i === activeIdx;
            return (
              <button
                key={`${r.symbol}-${r.exchange}-${i}`}
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => pick(r)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs border-b border-white/[0.04] last:border-0 transition text-left ${active ? "bg-cyan-500/10" : "hover:bg-white/5"}`}
              >
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono font-bold text-white">{r.symbol}</span>
                    <span className="text-[9px] px-1 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                      {r.type || "EQUITY"}
                    </span>
                    {r.exchange && (
                      <span className="text-[9px] text-slate-500">{r.exchange}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 truncate">{r.name}</span>
                </div>
                <div className="text-right shrink-0">
                  {typeof lp?.price === "number" && (
                    <div className="text-[11px] font-mono text-white">${lp.price.toFixed(2)}</div>
                  )}
                  {typeof lp?.changePct === "number" && (
                    <div className={`text-[10px] font-mono ${lp.changePct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {lp.changePct >= 0 ? "+" : ""}{lp.changePct.toFixed(2)}%
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
