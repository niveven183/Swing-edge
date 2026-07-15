import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, RefreshCw, AlertCircle } from "lucide-react";
import { searchSymbolsTV, fetchPrices } from "../priceService.js";
import TickerLogo from "./TickerLogo.jsx";
import { getTranslations } from "../i18n.js";

// ─── POPULAR TICKERS (shown immediately on focus) ─────────────────────────
const POPULAR = [
  { symbol: "NVDA",    name: "NVIDIA Corporation",      exchange: "NASDAQ", type: "EQUITY" },
  { symbol: "AAPL",    name: "Apple Inc.",              exchange: "NASDAQ", type: "EQUITY" },
  { symbol: "TSLA",    name: "Tesla, Inc.",             exchange: "NASDAQ", type: "EQUITY" },
  { symbol: "MSFT",    name: "Microsoft Corporation",   exchange: "NASDAQ", type: "EQUITY" },
  { symbol: "META",    name: "Meta Platforms, Inc.",    exchange: "NASDAQ", type: "EQUITY" },
  { symbol: "AMD",     name: "Advanced Micro Devices",  exchange: "NASDAQ", type: "EQUITY" },
  { symbol: "BTC-USD", name: "Bitcoin",                 exchange: "CRYPTO", type: "CRYPTOCURRENCY" },
  { symbol: "SPY",     name: "SPDR S&P 500 ETF",        exchange: "NYSE",   type: "ETF" },
];

// Maps a search result → a TradingView-ready symbol string.
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

  const exchMap = {
    NMS: "NASDAQ", NGM: "NASDAQ", NCM: "NASDAQ", NAS: "NASDAQ",
    NYQ: "NYSE",   NYE: "NYSE",   ASE: "AMEX",   PCX: "AMEX",
    LSE: "LSE",    TOR: "TSX",
  };
  // TradingView already gives clean exchange codes (NASDAQ, NYSE, AMEX, LSE…);
  // the map only rescues legacy Yahoo codes from the fallback path.
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

// Friendly exchange label for the results rows.
function displayExchange(q) {
  const t = (q.type || q.quoteType || "").toUpperCase();
  if (t === "CRYPTOCURRENCY") return "CRYPTO";
  const exch = (q.exchange || "").toUpperCase();
  const exchMap = {
    NMS: "NASDAQ", NGM: "NASDAQ", NCM: "NASDAQ", NAS: "NASDAQ",
    NYQ: "NYSE", NYE: "NYSE", ASE: "AMEX", PCX: "AMEX",
  };
  return exchMap[exch] || exch || t || "";
}

// Short, human label for the asset type pill.
function typeLabel(type) {
  switch ((type || "").toUpperCase()) {
    case "CRYPTOCURRENCY": return "Crypto";
    case "ETF":            return "ETF";
    case "INDEX":          return "Index";
    case "CURRENCY":       return "Forex";
    case "FUTURE":         return "Future";
    default:               return "Stock";
  }
}

// Render a symbol with the matched portion highlighted.
function Highlighted({ text, query }) {
  const q = (query || "").trim();
  if (!q) return <>{text}</>;
  const idx = text.toUpperCase().indexOf(q.toUpperCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-cyan-300 bg-cyan-500/15 rounded px-0.5">
        {text.slice(idx, idx + q.length)}
      </span>
      {text.slice(idx + q.length)}
    </>
  );
}

export default function TradingViewSearch({ value, onPick, livePrices = {}, setLivePrices, placeholder, lang = "he" }) {
  const isRTL = lang === "he" || lang === "ar";
  const t = getTranslations(lang);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [searched, setSearched] = useState(false); // a query-backed search has resolved
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const timer = useRef(null);
  const abortRef = useRef(null);
  const reqIdRef = useRef(0);
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

  // Cleanup any pending timer / in-flight request on unmount.
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (abortRef.current) abortRef.current.abort();
  }, []);

  // Kick live-price prefetch for up to 8 visible result symbols.
  const prefetchPrices = useCallback((items) => {
    if (!setLivePrices || !items || items.length === 0) return;
    const top = items.slice(0, 8).map((x) => cleanSymbol(x.symbol));
    fetchPrices(top).then((pd) => {
      if (pd && Object.keys(pd).length > 0) {
        setLivePrices((prev) => ({ ...prev, ...pd }));
      }
    }).catch(() => {});
  }, [setLivePrices]);

  // Debounced search — 250ms, 1-char min. TradingView source with transparent
  // Yahoo fallback (handled inside searchSymbolsTV). Stale calls are cancelled
  // via AbortController + a monotonic request id so fast typing never flickers.
  const doSearch = useCallback((q) => {
    if (timer.current) clearTimeout(timer.current);
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }

    if (!q || q.length < 1) {
      setResults(POPULAR);
      setLoading(false);
      setError(false);
      setSearched(false);
      setActiveIdx(-1);
      prefetchPrices(POPULAR);
      return;
    }

    setLoading(true);
    setError(false);
    timer.current = setTimeout(async () => {
      const reqId = ++reqIdRef.current;
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const r = await searchSymbolsTV(q, ctrl.signal);
        if (reqId !== reqIdRef.current) return; // a newer search superseded us
        setResults(r);
        setLoading(false);
        setError(false);
        setSearched(true);
        setActiveIdx(-1);
        prefetchPrices(r);
      } catch (e) {
        if (e && e.name === "AbortError") return; // cancelled — ignore
        if (reqId !== reqIdRef.current) return;
        setResults([]);
        setLoading(false);
        setError(true);
        setSearched(true);
      }
    }, 250);
  }, [prefetchPrices]);

  const pick = (r) => {
    const tvSym = toTvSymbol(r);
    onPick?.(tvSym, r);
    setQuery("");
    setResults([]);
    setOpen(false);
    setSearched(false);
    setActiveIdx(-1);
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") { setOpen(false); return; }
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
    }
  };

  const showEmpty = open && searched && !loading && !error && query && results.length === 0;

  return (
    <div ref={wrap} className="relative flex-1 min-w-0">
      <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 focus-within:border-cyan-500/50 transition">
        <Search size={13} className="text-slate-500 shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { const v = e.target.value; setQuery(v); setOpen(true); doSearch(v); }}
          onFocus={() => {
            setOpen(true);
            if (query) doSearch(query);
            else { setResults(POPULAR); setSearched(false); prefetchPrices(POPULAR); }
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder || t.tvSearchPlaceholder}
          className="flex-1 bg-transparent text-xs font-mono text-white placeholder-slate-500 focus:outline-none min-w-0"
        />
        {query && (
          <button onClick={() => { setQuery(""); setResults(POPULAR); setSearched(false); setError(false); inputRef.current?.focus(); }}
            className="text-slate-500 hover:text-white transition" aria-label="clear">
            <X size={12} />
          </button>
        )}
        {loading && <RefreshCw size={11} className="animate-spin text-cyan-400" />}
        {!query && value && (
          <span className="text-[10px] font-mono text-cyan-300 font-bold whitespace-nowrap">
            {value}
            {typeof currentPrice === "number" && <span className={`text-slate-400 ${isRTL ? "mr-1" : "ml-1"}`}>${currentPrice.toFixed(2)}</span>}
            {typeof currentChangePct === "number" && (
              <span className={`${isRTL ? "mr-1" : "ml-1"} ${currentChangePct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {currentChangePct >= 0 ? "+" : ""}{currentChangePct.toFixed(2)}%
              </span>
            )}
          </span>
        )}
      </div>

      {open && (results.length > 0 || showEmpty || error) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-elevated)] dark:bg-[#0d1424] border border-[var(--border-subtle)] dark:border-white/10 rounded-lg shadow-2xl z-30 max-h-80 overflow-y-auto animate-slide-down">
          {!query && results.length > 0 && (
            <div className="px-3 py-1.5 text-[9px] text-slate-500 uppercase tracking-widest border-b border-[var(--border-subtle)] dark:border-white/[0.06] bg-white/3">
              {t.tvPopular}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 px-3 py-3 text-[11px] text-rose-400">
              <AlertCircle size={13} className="shrink-0" />
              <span>{t.tvSearchUnavailable}</span>
            </div>
          )}

          {showEmpty && (
            <div className="px-3 py-3 text-[11px] text-slate-500 text-center">
              {t.tvNoResults} “{query}”
            </div>
          )}

          {results.map((r, i) => {
            const ticker = cleanSymbol(r.symbol);
            const lp = livePrices[ticker] || livePrices[r.symbol];
            const active = i === activeIdx;
            const exch = displayExchange(r);
            const vol = lp?.volume;
            const fmtVol = (v) => {
              if (!v) return null;
              if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
              if (v >= 1e6) return `${(v / 1e6).toFixed(0)}M`;
              if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
              return String(v);
            };
            return (
              <button
                key={`${r.symbol}-${r.exchange}-${i}`}
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => pick(r)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs border-b border-[var(--border-subtle)] dark:border-white/[0.04] last:border-0 transition ${isRTL ? "text-right" : "text-left"} ${active ? "bg-cyan-500/10" : "hover:bg-cyan-500/5"}`}
              >
                <TickerLogo ticker={r.symbol} size={20} />
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono font-bold text-white"><Highlighted text={r.symbol} query={query} /></span>
                    {exch && (
                      <span className="text-[9px] px-1 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                        {exch}
                      </span>
                    )}
                    <span className="text-[9px] px-1 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20">
                      {typeLabel(r.type)}
                    </span>
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
                  {vol != null && (
                    <div className="text-[9px] font-mono text-slate-500">Vol {fmtVol(vol)}</div>
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
