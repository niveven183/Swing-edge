import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell
} from "recharts";
import {
  LayoutDashboard, BookOpen, BarChart2, Rss,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  Plus, X, RefreshCw, Activity,
  DollarSign, Target, Zap, ArrowUpRight,
  ArrowDownRight, Eye, Layers, Cpu, Radio, FlaskConical
} from "lucide-react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const CAPITAL = 2500;
const RISK_PCT = 0.01;

const MOCK_TRADES = [
  { id: 1, ticker: "PLTR", date: "2025-03-11", side: "LONG", entry: 147.00, stop: 110.00, target: 221.00, shares: 3, status: "OPEN", exit: null, setup: "Breakout", notes: "Current stop: $148.53 (BE+) · Current: $155.02 · Unrealized: +$24.06" },
  { id: 2, ticker: "CRCL", date: "2025-03-17", side: "LONG", entry: 125.00, stop: 101.00, target: 173.00, shares: 3, status: "OPEN", exit: null, setup: "Breakout", notes: "Current stop: $120.00 (trailed up) · Current: $136.30 · Unrealized: +$33.90" },
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

// ─── NEWS HELPERS ─────────────────────────────────────────────────────────────
const QUICK_TICKERS = ["NVDA", "PLTR", "TSLA", "META", "MSTR"];

const NEWS_RSS_FEEDS = [
  "https://feeds.finance.yahoo.com/rss/2.0/headline?s=NVDA,PLTR,TSLA,META,MSTR&region=US&lang=en-US",
  "https://finance.yahoo.com/rss/topfinstories",
];
const RSS2JSON = "https://api.rss2json.com/v1/api.json";

const fmtTimeAgo = (dateStr) => {
  if (!dateStr) return "recently";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const detectSentiment = (text) => {
  if (/surge|jump|gain|rally|rise|beat|record|upgrade|bull|growth|profit|above|strong/i.test(text)) return "bull";
  if (/fall|drop|decline|crash|miss|lose|cut|downgrade|bear|loss|below|weak|warn/i.test(text)) return "bear";
  return "neutral";
};

const extractTag = (title) => {
  const m = title.match(/\b(NVDA|PLTR|TSLA|META|MSTR|AAPL|MSFT|AMD|AMZN|GOOGL|SPY|QQQ|BTC|ETH)\b/);
  return m ? m[0] : "MARKET";
};

// ─── STAT CARD ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, trend, icon: Icon, accent = "cyan" }) => {
  const accents = {
    cyan:   { border: "border-cyan-500/25", iconColor: "text-cyan-400", bg: "bg-cyan-500/8" },
    green:  { border: "border-[#10b981]/25", iconColor: "text-[#10b981]", bg: "bg-[#10b981]/8" },
    purple: { border: "border-violet-500/25", iconColor: "text-violet-400", bg: "bg-violet-500/8" },
    amber:  { border: "border-amber-500/25", iconColor: "text-amber-400", bg: "bg-amber-500/8" },
    red:    { border: "border-[#ef4444]/25", iconColor: "text-[#ef4444]", bg: "bg-[#ef4444]/8" },
  };
  const { border, iconColor, bg } = accents[accent] || accents.cyan;
  return (
    <div className={`${bg} border ${border} rounded-xl p-4 flex flex-col gap-1 relative overflow-hidden bg-[#0d1424]`}>
      <div className={`absolute top-3 right-3 opacity-15 ${iconColor}`}>
        <Icon size={26} />
      </div>
      <span className="text-[11px] font-semibold tracking-widest uppercase text-slate-500">{label}</span>
      <span className={`text-2xl font-bold font-mono ${iconColor}`}>{value}</span>
      {sub && <span className="text-xs text-slate-600">{sub}</span>}
      {trend !== undefined && (
        <span className={`text-xs font-semibold ${trend >= 0 ? "text-[#10b981]" : "text-[#ef4444]"}`}>
          {trend >= 0 ? "▲" : "▼"} {Math.abs(trend).toFixed(1)}%
        </span>
      )}
    </div>
  );
};

// ─── NAV ──────────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard",      icon: LayoutDashboard },
  { id: "journal",   label: "Journal",        icon: BookOpen },
  { id: "analyzer",  label: "Trade Analyzer", icon: FlaskConical },
  { id: "analytics", label: "Analytics",      icon: BarChart2 },
  { id: "intel",     label: "Market Intel",   icon: Rss },
];

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function SwingEdge() {
  const [tab, setTab] = useState("dashboard");
  const [trades, setTrades] = useState(() => {
    try {
      const saved = localStorage.getItem("swingEdgeTrades");
      return saved ? JSON.parse(saved) : MOCK_TRADES;
    } catch { return MOCK_TRADES; }
  });
  const [chartSymbol, setChartSymbol] = useState("NASDAQ:NVDA");
  const [chartInterval, setChartInterval] = useState("D");
  const tvRef = useRef(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ticker: "", side: "LONG", entry: "", stop: "", target: "", setup: "Breakout", notes: "", marketCondition: "Trending Up", emotionAtEntry: "Neutral", entryQuality: 3, tradeImage: null, tradeImagePreview: null });
  const [pulse, setPulse] = useState(false);
  const [tickerIdx, setTickerIdx] = useState(0);
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [closingTrade, setClosingTrade] = useState(null);
  const [closeForm, setCloseForm] = useState({ exit: "", exitReason: "Target Hit", followedPlan: true, lessonLearned: "", maxFavorable: "", maxAdverse: "" });
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [apiKey, setApiKey] = useState(() => { try { return localStorage.getItem("swingEdgeApiKey") || ""; } catch { return ""; } });
  const [liveNews, setLiveNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsLastUpdated, setNewsLastUpdated] = useState(null);

  // Trade Analyzer state
  const [analyzerForm, setAnalyzerForm] = useState({ ticker: "", entry: "", stop: "", target: "", shares: "" });
  const [analyzerImage, setAnalyzerImage] = useState(null);
  const [analyzerImagePreview, setAnalyzerImagePreview] = useState(null);
  const [analyzerResult, setAnalyzerResult] = useState(null);
  const [analyzerLoading, setAnalyzerLoading] = useState(false);

  // Persist trades to localStorage
  useEffect(() => {
    try { localStorage.setItem("swingEdgeTrades", JSON.stringify(trades)); } catch {}
  }, [trades]);

  // TradingView widget
  useEffect(() => {
    if (tab !== "intel" || !tvRef.current) return;
    const container = tvRef.current;
    container.innerHTML = "";
    const widgetId = "tv_widget_" + Date.now();
    const inner = document.createElement("div");
    inner.id = widgetId;
    inner.style.height = "100%";
    container.appendChild(inner);

    const intervalMap = { "1D": "D", "4H": "240", "1H": "60", "15m": "15" };
    const tvInterval = intervalMap[chartInterval] || chartInterval;

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => {
      if (!window.TradingView) return;
      new window.TradingView.widget({
        autosize: true,
        symbol: chartSymbol,
        interval: tvInterval,
        timezone: "America/New_York",
        theme: "dark",
        style: "1",
        locale: "en",
        toolbar_bg: "#0d1424",
        backgroundColor: "#0a0f1e",
        enable_publishing: false,
        allow_symbol_change: true,
        hide_side_toolbar: false,
        studies: ["Volume@tv-basicstudies"],
        container_id: widgetId,
      });
    };
    document.head.appendChild(script);
    return () => { try { document.head.removeChild(script); } catch {} };
  }, [tab, chartSymbol, chartInterval]);

  // News fetch
  const fetchNews = useCallback(async () => {
    setNewsLoading(true);
    try {
      const results = await Promise.allSettled(
        NEWS_RSS_FEEDS.map(feed =>
          fetch(`${RSS2JSON}?rss_url=${encodeURIComponent(feed)}&count=10`)
            .then(r => r.json())
        )
      );
      const allItems = results.flatMap(r => r.status === "fulfilled" ? (r.value.items || []) : []);
      const seen = new Set();
      const mapped = allItems
        .filter(item => { if (!item.title || seen.has(item.title)) return false; seen.add(item.title); return true; })
        .slice(0, 12)
        .map((item, i) => ({
          id: item.guid || String(i),
          title: item.title?.trim(),
          summary: (item.description || "").replace(/<[^>]*>/g, "").slice(0, 160).trim(),
          image: item.thumbnail || item.enclosure?.link || null,
          source: item.author || (item.link ? new URL(item.link).hostname.replace("www.", "") : "Finance"),
          pubDate: item.pubDate,
          time: fmtTimeAgo(item.pubDate),
          link: item.link || "#",
          sentiment: detectSentiment(item.title || ""),
          tag: extractTag(item.title || ""),
        }));
      if (mapped.length > 0) { setLiveNews(mapped); setNewsLastUpdated(new Date()); }
    } catch (e) { console.warn("News fetch failed:", e); }
    setNewsLoading(false);
  }, []);

  useEffect(() => {
    if (tab !== "intel") return;
    if (liveNews.length === 0) fetchNews();
    const interval = setInterval(fetchNews, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [tab, fetchNews, liveNews.length]);

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

  // Analyzer computed values
  const azEntry  = parseFloat(analyzerForm.entry)  || 0;
  const azStop   = parseFloat(analyzerForm.stop)   || 0;
  const azTarget = parseFloat(analyzerForm.target) || 0;
  const azShares = parseFloat(analyzerForm.shares) || 0;
  const azRiskPerShare = azEntry > 0 && azStop > 0 ? Math.abs(azEntry - azStop) : 0;
  const azDollarRisk   = azRiskPerShare * azShares;
  const azPortfolioRisk = CAPITAL > 0 ? (azDollarRisk / CAPITAL) * 100 : 0;
  const azPotGain  = azShares * Math.abs(azTarget - azEntry);
  const azRRRatio  = azDollarRisk > 0 ? azPotGain / azDollarRisk : 0;

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
      marketCondition: form.marketCondition,
      emotionAtEntry: form.emotionAtEntry,
      entryQuality: form.entryQuality,
      tradeImage: form.tradeImagePreview,
      exitReason: null, followedPlan: null, lessonLearned: null, maxFavorable: null, maxAdverse: null,
    };
    setTrades(prev => [...prev, newTrade]);
    setForm({ ticker: "", side: "LONG", entry: "", stop: "", target: "", setup: "Breakout", notes: "", marketCondition: "Trending Up", emotionAtEntry: "Neutral", entryQuality: 3, tradeImage: null, tradeImagePreview: null });
    setAiAnalysis(null);
    setShowForm(false);
    setTab("journal");
  };

  const handleCloseSubmit = () => {
    if (!closingTrade || !closeForm.exit) return;
    setTrades(prev => prev.map(t => t.id === closingTrade.id ? {
      ...t, status: "CLOSED", exit: parseFloat(closeForm.exit),
      exitReason: closeForm.exitReason, followedPlan: closeForm.followedPlan,
      lessonLearned: closeForm.lessonLearned,
      maxFavorable: parseFloat(closeForm.maxFavorable) || null,
      maxAdverse: parseFloat(closeForm.maxAdverse) || null,
    } : t));
    setShowCloseForm(false);
    setClosingTrade(null);
    setCloseForm({ exit: "", exitReason: "Target Hit", followedPlan: true, lessonLearned: "", maxFavorable: "", maxAdverse: "" });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setForm(f => ({ ...f, tradeImage: file, tradeImagePreview: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const analyzeTradeWithAI = async () => {
    const key = apiKey.trim();
    if (!key) { setAiAnalysis("⚠️ הכנס Anthropic API Key בשדה למטה לפני הניתוח."); return; }
    setAiLoading(true); setAiAnalysis(null);
    const tradeData = `Ticker: ${form.ticker} | Direction: ${form.side} | Entry: ${form.entry} | Stop: ${form.stop} | Target: ${form.target} | Setup: ${form.setup} | Market: ${form.marketCondition} | Emotion: ${form.emotionAtEntry} | Entry Quality: ${form.entryQuality}/5 | R/R: ${rrRatio.toFixed(2)}:1 | Notes: ${form.notes}`;
    const textPrompt = `You are a professional swing trader coach. Analyze this trade setup and respond concisely:\n\n${tradeData}\n\nProvide:\n1. Entry Strength (1-5)\n2. Stop Logic assessment (1 sentence)\n3. R/R Assessment (is it worth it?)\n4. Final Recommendation: GO / WAIT / SKIP\n\nBe direct and brief.`;
    const content = form.tradeImagePreview
      ? [{ type: "image", source: { type: "base64", media_type: "image/jpeg", data: form.tradeImagePreview.split(",")[1] } }, { type: "text", text: textPrompt }]
      : [{ type: "text", text: textPrompt }];
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model: "claude-opus-4-6", max_tokens: 400, messages: [{ role: "user", content }] })
      });
      const data = await res.json();
      if (data.error) { setAiAnalysis("שגיאה: " + data.error.message); }
      else { setAiAnalysis(data.content?.[0]?.text || "No response"); }
    } catch (e) { setAiAnalysis("שגיאת חיבור: " + e.message); }
    setAiLoading(false);
  };

  const handleAnalyzerImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setAnalyzerImage(file); setAnalyzerImagePreview(ev.target.result); };
    reader.readAsDataURL(file);
  };

  const analyzeTradeStandalone = async () => {
    const key = apiKey.trim();
    if (!key) { setAnalyzerResult({ error: "⚠️ הכנס Anthropic API Key — שמור אותו בשדה ה-API Key בחלון Log New Trade." }); return; }
    if (!analyzerForm.ticker || !azEntry || !azStop) { setAnalyzerResult({ error: "⚠️ מלא לפחות: Ticker, Entry ו-Stop Loss." }); return; }
    setAnalyzerLoading(true); setAnalyzerResult(null);
    const tradeData = `Ticker: ${analyzerForm.ticker} | Entry: ${azEntry} | Stop: ${azStop} | Target: ${azTarget || "N/A"} | Shares: ${azShares || "N/A"} | Dollar Risk: $${azDollarRisk.toFixed(2)} | Portfolio Risk: ${azPortfolioRisk.toFixed(2)}% | R/R: ${azRRRatio.toFixed(2)}:1`;
    const prompt = `You are a professional swing trader coach. Analyze this trade setup concisely.

Trade: ${tradeData}

Respond ONLY in this exact JSON format (no markdown, no extra text):
{
  "entry_score": <number 1-5>,
  "stop_logic": "<one sentence assessment of the stop placement>",
  "rr_assessment": "<one sentence — is the R/R worth it?>",
  "recommendation": "<GO|WAIT|SKIP>",
  "explanation": "<2-3 sentences max explaining the recommendation>"
}`;
    const content = analyzerImagePreview
      ? [{ type: "image", source: { type: "base64", media_type: "image/jpeg", data: analyzerImagePreview.split(",")[1] } }, { type: "text", text: prompt }]
      : [{ type: "text", text: prompt }];
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model: "claude-opus-4-6", max_tokens: 500, messages: [{ role: "user", content }] })
      });
      const data = await res.json();
      if (data.error) { setAnalyzerResult({ error: "שגיאה: " + data.error.message }); }
      else {
        const raw = data.content?.[0]?.text || "{}";
        try {
          const parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, "").trim());
          setAnalyzerResult(parsed);
        } catch { setAnalyzerResult({ raw }); }
      }
    } catch (e) { setAnalyzerResult({ error: "שגיאת חיבור: " + e.message }); }
    setAnalyzerLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-slate-200 font-sans flex flex-col" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>

      {/* ── HEADER ── */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] bg-[#0d1424]/90 backdrop-blur-md sticky top-0 z-50">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center">
            <Zap size={14} className="text-white" />
          </div>
          <span className="font-bold text-sm tracking-wider text-white">SWING<span className="text-cyan-400">EDGE</span></span>
          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 tracking-widest uppercase">Pro</span>
        </div>

        {/* Ticker Tape */}
        <div className="hidden md:flex items-center gap-4 text-xs font-mono">
          {TICKERS.map((t, i) => {
            const bull = t.includes("+");
            return (
              <span key={i} className={`transition-all duration-500 ${i === tickerIdx ? "opacity-100 scale-105" : "opacity-40"} ${bull ? "text-[#10b981]" : "text-[#ef4444]"}`}>
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
            <div className="text-sm font-bold font-mono text-cyan-400">${curEquity.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
      </header>

      {/* ── NAV ── */}
      <nav className="flex items-center gap-0 px-5 border-b border-white/[0.06] bg-[#0d1424]/60 overflow-x-auto">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold tracking-wide transition-all whitespace-nowrap border-b-2
              ${tab === id
                ? "text-white border-cyan-400"
                : "text-slate-500 border-transparent hover:text-slate-300 hover:border-slate-600"}`}>
            <Icon size={13} />
            {label}
          </button>
        ))}
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
              <div className="md:col-span-2 bg-[#0d1424] border border-white/[0.06] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold tracking-widest uppercase text-slate-500">Equity Curve</span>
                  <span className="text-xs text-cyan-400 font-mono">{equityCurve.length} data pts</span>
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={equityCurve}>
                    <defs>
                      <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#475569" }} tickLine={false} axisLine={false} />
                    <YAxis domain={["auto", "auto"]} tick={{ fontSize: 9, fill: "#475569" }} tickLine={false} axisLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                    <ReferenceLine y={CAPITAL} stroke="#475569" strokeDasharray="4 4" />
                    <Tooltip contentStyle={{ background: "#0d1424", border: "1px solid #162032", borderRadius: 8, fontSize: 11 }} formatter={(v) => [`$${v.toLocaleString()}`, "Equity"]} />
                    <Area type="monotone" dataKey="equity" stroke="#06b6d4" strokeWidth={2} fill="url(#eqGrad)" dot={{ fill: "#06b6d4", r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Open trades */}
              <div className="bg-[#0d1424] border border-white/[0.06] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold tracking-widest uppercase text-slate-500">Open Positions</span>
                  <span className="text-xs bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/20">{openTrades.length}</span>
                </div>
                <div className="space-y-2">
                  {openTrades.map(t => {
                    const riskPerSh = Math.abs(t.entry - t.stop);
                    const exposure = t.shares * t.entry;
                    return (
                      <div key={t.id} className="bg-white/3 rounded-lg p-3 border border-white/[0.06]">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-white font-mono">{t.ticker}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${t.side === "LONG" ? "bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20" : "bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20"}`}>{t.side}</span>
                        </div>
                        <div className="mt-1 grid grid-cols-2 gap-x-3 text-[10px] text-slate-500 font-mono">
                          <span>Entry <span className="text-slate-300">${t.entry}</span></span>
                          <span>Stop <span className="text-[#ef4444]">${t.stop}</span></span>
                          <span>Target <span className="text-[#10b981]">${t.target}</span></span>
                          <span>Shares <span className="text-slate-300">{t.shares}</span></span>
                        </div>
                        <div className="mt-1.5 h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full" style={{ width: "55%" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Recent Closed */}
            <div className="bg-[#0d1424] border border-white/[0.06] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold tracking-widest uppercase text-slate-500">Recent Closed Trades</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-600 border-b border-white/[0.06]">
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
                        <tr key={t.id} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                          <td className="py-2 pr-4 font-bold text-white font-mono">{t.ticker}</td>
                          <td className="py-2 pr-4 text-slate-500">{t.date}</td>
                          <td className="py-2 pr-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${t.side==="LONG"?"bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20":"bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20"}`}>{t.side}</span></td>
                          <td className="py-2 pr-4 font-mono text-slate-300">${t.entry}</td>
                          <td className="py-2 pr-4 font-mono text-slate-300">${t.exit}</td>
                          <td className="py-2 pr-4 font-mono text-slate-400">{t.shares}</td>
                          <td className={`py-2 pr-4 font-bold font-mono ${win ? "text-[#10b981]" : "text-[#ef4444]"}`}>{fmt$(Math.round(pnl))}</td>
                          <td className={`py-2 pr-4 font-bold font-mono ${rMultiple >= 0 ? "text-cyan-400" : "text-[#ef4444]"}`}>{fmtR(rMultiple)}</td>
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
            </div>
            <div className="overflow-x-auto bg-[#0d1424] border border-white/[0.06] rounded-xl">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-600 border-b border-white/[0.06] text-[10px] tracking-widest uppercase">
                    {["Ticker","Date","Side","Entry","Stop","Target","Shares","Exit","P&L","R","Setup","Mkt","Emotion","★","Exit Rsn","Plan","Lesson","Status","Action"].map(h => (
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
                      <tr key={t.id} className={`border-b border-white/[0.04] transition-colors ${!isOpen && win ? "hover:bg-[#10b981]/[0.04]" : !isOpen ? "hover:bg-[#ef4444]/[0.04]" : "hover:bg-white/[0.03]"}`}>
                        <td className="p-3 font-bold text-white font-mono whitespace-nowrap">{t.ticker}</td>
                        <td className="p-3 text-slate-500 whitespace-nowrap">{t.date}</td>
                        <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${t.side==="LONG"?"bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20":"bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20"}`}>{t.side}</span></td>
                        <td className="p-3 font-mono text-slate-300">${t.entry}</td>
                        <td className="p-3 font-mono text-[#ef4444]">${t.stop}</td>
                        <td className="p-3 font-mono text-[#10b981]">${t.target}</td>
                        <td className="p-3 font-mono text-slate-400">{t.shares}</td>
                        <td className="p-3 font-mono text-slate-300">{t.exit ? `$${t.exit}` : "–"}</td>
                        <td className={`p-3 font-bold font-mono ${isOpen ? "text-slate-500" : win ? "text-[#10b981]" : "text-[#ef4444]"}`}>
                          {isOpen ? "–" : fmt$(Math.round(pnl))}
                        </td>
                        <td className={`p-3 font-bold font-mono text-xs ${isOpen ? "text-slate-500" : rMultiple >= 0 ? "text-cyan-400" : "text-[#ef4444]"}`}>
                          {isOpen ? "–" : fmtR(rMultiple)}
                        </td>
                        <td className="p-3"><span className="text-[10px] px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 whitespace-nowrap">{t.setup}</span></td>
                        <td className="p-3 text-slate-500 text-[10px] whitespace-nowrap">{t.marketCondition || "–"}</td>
                        <td className="p-3 text-slate-500 text-[10px] whitespace-nowrap">{t.emotionAtEntry || "–"}</td>
                        <td className="p-3 text-amber-400 text-xs font-mono">{t.entryQuality ? `${"★".repeat(t.entryQuality)}` : "–"}</td>
                        <td className="p-3 text-[10px] text-slate-500 whitespace-nowrap">
                          {t.exitReason
                            ? <span className="px-2 py-0.5 rounded bg-slate-700/40 text-slate-400 border border-white/[0.06]">{t.exitReason}</span>
                            : <span className="text-slate-700">–</span>}
                        </td>
                        <td className="p-3 text-center">
                          {t.followedPlan === true  && <span className="text-[#10b981] text-sm font-bold">✓</span>}
                          {t.followedPlan === false && <span className="text-[#ef4444] text-sm font-bold">✗</span>}
                          {t.followedPlan == null   && <span className="text-slate-700 text-[10px]">–</span>}
                        </td>
                        <td className="p-3 text-slate-500 text-[10px] max-w-[160px] truncate" title={t.lessonLearned || t.notes}>
                          {t.lessonLearned
                            ? <span className="text-violet-400/80">💡 {t.lessonLearned}</span>
                            : t.notes
                              ? <span className="text-slate-600">{t.notes}</span>
                              : <span className="text-slate-700">–</span>}
                        </td>
                        <td className="p-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${isOpen ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : "bg-slate-500/10 text-slate-500 border border-slate-700"}`}>{t.status}</span></td>
                        <td className="p-3">
                          {isOpen && (
                            <button onClick={()=>{setClosingTrade(t);setShowCloseForm(true);}}
                              className="text-[10px] px-2 py-1 rounded bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#ef4444] hover:opacity-80 transition whitespace-nowrap">
                              Close
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══════════════ TRADE ANALYZER ══════════════ */}
        {tab === "analyzer" && (
          <div className="space-y-5 animate-fade-in max-w-3xl mx-auto">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2"><FlaskConical size={15} className="text-violet-400" /> Trade Analyzer</h2>
              <p className="text-xs text-slate-600 mt-0.5">הכנס נתוני עסקה, העלה תמונה מ-TradingView וקבל ניתוח AI מיידי</p>
            </div>

            {/* Input Fields */}
            <div className="bg-[#0d1424] border border-white/[0.06] rounded-xl p-5 space-y-4">
              <span className="text-[10px] font-semibold tracking-widest uppercase text-slate-500">פרטי העסקה</span>

              {/* Row 1: Ticker + Shares */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">Ticker *</label>
                  <input value={analyzerForm.ticker} onChange={e => setAnalyzerForm(f => ({ ...f, ticker: e.target.value.toUpperCase() }))}
                    placeholder="NVDA" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition font-mono font-bold tracking-wider" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">כמות מניות</label>
                  <input value={analyzerForm.shares} onChange={e => setAnalyzerForm(f => ({ ...f, shares: e.target.value }))}
                    placeholder="10" type="number" min="0" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition font-mono" />
                </div>
              </div>

              {/* Row 2: Entry / Stop / Target */}
              <div className="grid grid-cols-3 gap-3">
                {[["מחיר כניסה *", "entry", "text-white"], ["סטופ לוס *", "stop", "text-[#ef4444]"], ["יעד", "target", "text-[#10b981]"]].map(([label, key, cls]) => (
                  <div key={key}>
                    <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">{label}</label>
                    <input value={analyzerForm[key]} onChange={e => setAnalyzerForm(f => ({ ...f, [key]: e.target.value }))}
                      placeholder="0.00" className={`w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition font-mono ${cls}`} />
                  </div>
                ))}
              </div>

              {/* Auto Calculations */}
              {azEntry > 0 && azStop > 0 && (
                <div className="grid grid-cols-3 gap-3 bg-white/3 rounded-xl p-3 border border-white/[0.06]">
                  <div className="text-center">
                    <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-0.5">R/R Ratio</div>
                    <div className={`text-base font-bold font-mono ${azRRRatio >= 2 ? "text-[#10b981]" : azRRRatio >= 1 ? "text-amber-400" : "text-[#ef4444]"}`}>
                      {azTarget > 0 ? `${azRRRatio.toFixed(2)}:1` : "–"}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-0.5">סיכון בדולרים</div>
                    <div className="text-base font-bold font-mono text-[#ef4444]">
                      {azShares > 0 ? `$${azDollarRisk.toFixed(2)}` : "–"}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-0.5">סיכון מהתיק</div>
                    <div className={`text-base font-bold font-mono ${azPortfolioRisk > 2 ? "text-[#ef4444]" : azPortfolioRisk > 1 ? "text-amber-400" : "text-[#10b981]"}`}>
                      {azShares > 0 ? `${azPortfolioRisk.toFixed(2)}%` : "–"}
                    </div>
                  </div>
                </div>
              )}

              {/* R/R quality badge */}
              {azEntry > 0 && azStop > 0 && azTarget > 0 && (
                <div className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs ${azRRRatio >= 2 ? "bg-emerald-500/5 border-emerald-500/20 text-[#10b981]" : azRRRatio >= 1 ? "bg-amber-500/5 border-amber-500/20 text-amber-400" : "bg-[#ef4444]/5 border-[#ef4444]/20 text-[#ef4444]"}`}>
                  {azRRRatio >= 2 ? <CheckCircle size={13} /> : <AlertTriangle size={13} />}
                  <span>{azRRRatio >= 2 ? "R/R מצוין — עובר סף מינימום 2:1" : azRRRatio >= 1 ? "R/R סביר — שקול להרחיב יעד" : "R/R נמוך — הימנע מעסקאות מתחת ל-1:1"}</span>
                </div>
              )}

              {/* Image Upload */}
              <div>
                <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">תמונה מ-TradingView</label>
                <label className="flex items-center gap-2 cursor-pointer w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-400 hover:border-cyan-500/30 hover:text-cyan-400 transition">
                  <Eye size={12} />
                  <span>{analyzerImage ? analyzerImage.name : "העלה צילום מסך של גרף..."}</span>
                  <input type="file" accept="image/*" onChange={handleAnalyzerImageUpload} className="hidden" />
                </label>
              </div>
              {analyzerImagePreview && (
                <div className="relative rounded-lg overflow-hidden border border-white/10">
                  <img src={analyzerImagePreview} alt="Trade chart" className="w-full h-40 object-cover" />
                  <button onClick={() => { setAnalyzerImage(null); setAnalyzerImagePreview(null); }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-slate-300 hover:text-white">
                    <X size={11} />
                  </button>
                </div>
              )}

              {/* API Key */}
              <div>
                <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">Anthropic API Key</label>
                <input type="password" value={apiKey} onChange={e => { setApiKey(e.target.value); try { localStorage.setItem("swingEdgeApiKey", e.target.value); } catch {} }}
                  placeholder="sk-ant-..." className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-400 placeholder-slate-700 focus:border-violet-500/50 focus:outline-none transition font-mono" />
              </div>

              {/* Analyze button */}
              <button onClick={analyzeTradeStandalone} disabled={analyzerLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500/25 to-cyan-500/25 border border-violet-500/35 text-violet-200 text-sm font-bold hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50">
                {analyzerLoading ? <><RefreshCw size={14} className="animate-spin" /> מנתח...</> : <><Cpu size={14} /> נתח עסקה 🤖</>}
              </button>
            </div>

            {/* Analysis Result */}
            {analyzerResult && (
              <div className="bg-[#0d1424] border border-violet-500/25 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2 text-violet-400 font-semibold text-xs uppercase tracking-wider">
                  <Cpu size={13} /> תוצאת הניתוח
                </div>

                {analyzerResult.error ? (
                  <div className="text-xs text-[#ef4444] bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-lg p-3">{analyzerResult.error}</div>
                ) : analyzerResult.raw ? (
                  <div className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{analyzerResult.raw}</div>
                ) : (
                  <div className="space-y-3">
                    {/* Recommendation banner */}
                    {analyzerResult.recommendation && (
                      <div className={`flex items-center justify-between p-4 rounded-xl border ${
                        analyzerResult.recommendation === "GO"   ? "bg-emerald-500/8 border-emerald-500/30" :
                        analyzerResult.recommendation === "WAIT" ? "bg-amber-500/8 border-amber-500/30" :
                                                                    "bg-[#ef4444]/8 border-[#ef4444]/30"}`}>
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">המלצה</div>
                          <div className={`text-2xl font-bold font-mono ${
                            analyzerResult.recommendation === "GO"   ? "text-[#10b981]" :
                            analyzerResult.recommendation === "WAIT" ? "text-amber-400" :
                                                                        "text-[#ef4444]"}`}>
                            {analyzerResult.recommendation === "GO"   ? "GO ✅" :
                             analyzerResult.recommendation === "WAIT" ? "WAIT ⚠️" :
                                                                         "SKIP ❌"}
                          </div>
                        </div>
                        {analyzerResult.entry_score && (
                          <div className="text-right">
                            <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">ציון כניסה</div>
                            <div className="text-amber-400 font-mono font-bold text-xl">
                              {"★".repeat(analyzerResult.entry_score)}{"☆".repeat(5 - analyzerResult.entry_score)}
                            </div>
                            <div className="text-[10px] text-slate-500">{analyzerResult.entry_score}/5</div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Detail cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {analyzerResult.stop_logic && (
                        <div className="bg-white/3 rounded-xl p-3 border border-white/[0.06]">
                          <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                            <Target size={10} /> סטופ לוס
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">{analyzerResult.stop_logic}</p>
                        </div>
                      )}
                      {analyzerResult.rr_assessment && (
                        <div className="bg-white/3 rounded-xl p-3 border border-white/[0.06]">
                          <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                            <Activity size={10} /> R/R
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">{analyzerResult.rr_assessment}</p>
                        </div>
                      )}
                    </div>

                    {/* Explanation */}
                    {analyzerResult.explanation && (
                      <div className="bg-violet-500/5 border border-violet-500/15 rounded-xl p-3">
                        <div className="text-[10px] text-violet-400 uppercase tracking-widest mb-1.5">הסבר</div>
                        <p className="text-xs text-slate-300 leading-relaxed">{analyzerResult.explanation}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
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
            <div className="bg-[#0d1424] border border-white/[0.06] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Equity Curve</h3>
                  <p className="text-xs text-slate-600">Account balance over time · starting capital ${CAPITAL.toLocaleString()}</p>
                </div>
                <span className={`text-sm font-bold font-mono ${totalPnL>=0?"text-[#10b981]":"text-[#ef4444]"}`}>{fmt$(Math.round(totalPnL))}</span>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={equityCurve} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="eqFull" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#475569" }} tickLine={false} axisLine={false} />
                  <YAxis domain={["auto","auto"]} tick={{ fontSize: 10, fill: "#475569" }} tickLine={false} axisLine={false} tickFormatter={v=>`$${(v/1000).toFixed(1)}k`} />
                  <ReferenceLine y={CAPITAL} stroke="#475569" strokeDasharray="5 5" label={{ value: "Starting Capital", position: "insideTopRight", fontSize: 9, fill: "#475569" }} />
                  <Tooltip
                    contentStyle={{ background: "#0d1424", border: "1px solid #162032", borderRadius: 10, fontSize: 11 }}
                    formatter={(v, n, p) => [`$${v.toLocaleString()} (${p.payload.ticker})`, "Equity"]}
                  />
                  <Area type="monotone" dataKey="equity" stroke="#06b6d4" strokeWidth={2.5} fill="url(#eqFull)" dot={{ fill: "#06b6d4", r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: "#06b6d4" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Per-trade P&L bars */}
            <div className="bg-[#0d1424] border border-white/[0.06] rounded-xl p-5">
              <h3 className="text-sm font-bold text-white mb-4">P&amp;L by Trade</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={closedTrades.map(t => ({ name: t.ticker, pnl: Math.round(calcTradeMetrics(t).pnl || 0) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#475569" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#475569" }} tickLine={false} axisLine={false} tickFormatter={v=>`$${v}`} />
                  <Tooltip contentStyle={{ background: "#0d1424", border: "1px solid #162032", borderRadius: 10, fontSize: 11 }} formatter={v=>[fmt$(v),"P&L"]} />
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
            <div className="bg-[#0d1424] border border-white/[0.06] rounded-xl p-5">
              <h3 className="text-sm font-bold text-white mb-4">Performance by Setup</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {["Breakout","Pullback","Retest","Breakdown"].map(setup => {
                  const s = closedTrades.filter(t => t.setup === setup);
                  const wins = s.filter(t => (calcTradeMetrics(t).pnl||0) > 0).length;
                  const wr = s.length ? wins/s.length*100 : 0;
                  const totalR = s.reduce((a,t) => a + (calcTradeMetrics(t).rMultiple||0), 0);
                  return (
                    <div key={setup} className="bg-white/3 rounded-xl p-3 border border-white/[0.06]">
                      <div className="text-xs font-semibold text-violet-400 mb-2">{setup}</div>
                      <div className="font-bold text-white text-lg font-mono">{wr.toFixed(0)}%</div>
                      <div className="text-[10px] text-slate-500">{s.length} trades · {totalR.toFixed(1)}R total</div>
                      <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full transition-all" style={{ width: `${wr}%` }} />
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

            {/* Quick Ticker Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-semibold tracking-widest uppercase text-slate-600 mr-1">Quick Jump:</span>
              {QUICK_TICKERS.map(tk => {
                const active = chartSymbol === `NASDAQ:${tk}`;
                return (
                  <button key={tk} onClick={() => setChartSymbol(`NASDAQ:${tk}`)}
                    className={`text-xs font-mono font-bold px-3 py-1.5 rounded-lg border transition ${
                      active
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                        : "bg-white/3 text-slate-400 border-white/[0.06] hover:bg-cyan-500/10 hover:text-cyan-400 hover:border-cyan-500/20"
                    }`}>
                    {tk}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* TradingView Chart */}
              <div className="md:col-span-2 bg-[#0d1424] border border-white/[0.06] rounded-xl overflow-hidden" style={{ height: 440 }}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold tracking-widest uppercase text-slate-500">Live Chart</span>
                    <input
                      value={chartSymbol}
                      onChange={e => setChartSymbol(e.target.value.toUpperCase())}
                      onKeyDown={e => { if (e.key === "Enter") e.target.blur(); }}
                      className="text-xs font-mono font-bold text-white bg-white/5 border border-white/10 rounded px-2 py-0.5 w-32 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
                      placeholder="NASDAQ:NVDA"
                    />
                  </div>
                  <div className="flex gap-1">
                    {["1D","4H","1H","15m"].map(tf => (
                      <button key={tf} onClick={() => setChartInterval(tf)}
                        className={`text-[10px] px-2 py-0.5 rounded transition ${chartInterval === tf ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-white/5 text-slate-400 hover:bg-cyan-500/10 hover:text-cyan-400"}`}>
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>
                <div ref={tvRef} style={{ height: "calc(100% - 48px)" }} />
              </div>

              {/* Watchlist */}
              <div className="bg-[#0d1424] border border-white/[0.06] rounded-xl p-4" style={{ height: 440, overflowY: "auto" }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold tracking-widest uppercase text-slate-500">Watchlist</span>
                  <Radio size={12} className="text-cyan-400" />
                </div>
                <div className="space-y-2">
                  {SCANNER_DATA.map(s => (
                    <div key={s.ticker} onClick={() => setChartSymbol(`NASDAQ:${s.ticker}`)}
                      className={`flex items-center justify-between p-2.5 bg-white/3 rounded-lg border transition cursor-pointer ${chartSymbol === `NASDAQ:${s.ticker}` ? "border-cyan-500/40 bg-cyan-500/5" : "border-white/[0.06] hover:border-cyan-500/20 hover:bg-cyan-500/3"}`}>
                      <div>
                        <div className="font-bold text-xs text-white font-mono">{s.ticker}</div>
                        <div className="text-[10px] text-slate-600">{s.setup}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-mono font-bold text-slate-200">${s.price}</div>
                        <div className={`text-[10px] font-mono font-semibold flex items-center justify-end gap-0.5 ${s.change>=0?"text-[#10b981]":"text-[#ef4444]"}`}>
                          {s.change>=0?<ArrowUpRight size={10}/>:<ArrowDownRight size={10}/>}
                          {s.change>=0?"+":""}{s.change}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* News Feed — 2-column cards */}
            <div className="bg-[#0d1424] border border-white/[0.06] rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold tracking-widest uppercase text-slate-500">Market News</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${pulse?"bg-emerald-400":"bg-emerald-700"} transition-colors`} />
                  {newsLastUpdated && (
                    <span className="text-[10px] text-slate-700">Updated {fmtTimeAgo(newsLastUpdated)}</span>
                  )}
                </div>
                <button onClick={fetchNews} disabled={newsLoading}
                  className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-cyan-400 transition disabled:opacity-40">
                  <RefreshCw size={10} className={newsLoading ? "animate-spin" : ""} />
                  {newsLoading ? "Loading…" : "Refresh"}
                </button>
              </div>

              {/* Loading skeleton */}
              {newsLoading && liveNews.length === 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex gap-3 p-3 bg-white/3 rounded-xl border border-white/[0.06] animate-pulse">
                      <div className="w-20 h-16 rounded-lg bg-white/5 flex-shrink-0" />
                      <div className="flex-1 space-y-2 pt-1">
                        <div className="h-2.5 bg-white/5 rounded w-full" />
                        <div className="h-2.5 bg-white/5 rounded w-4/5" />
                        <div className="h-2 bg-white/5 rounded w-1/2 mt-2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* News grid */}
              {!newsLoading || liveNews.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(liveNews.length > 0 ? liveNews : MOCK_NEWS.map(n => ({
                    id: n.id,
                    title: n.headline,
                    summary: "",
                    image: null,
                    source: n.source,
                    time: n.time,
                    link: "#",
                    sentiment: n.sentiment,
                    tag: n.tag,
                  }))).map(n => (
                    <a key={n.id} href={n.link} target="_blank" rel="noopener noreferrer"
                      className="flex gap-3 p-3 bg-white/3 rounded-xl border border-white/[0.06] hover:border-cyan-500/20 hover:bg-cyan-500/[0.03] transition group cursor-pointer no-underline">
                      {/* Image */}
                      <div className="w-20 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-white/5">
                        {n.image ? (
                          <img src={n.image} alt="" className="w-full h-full object-cover"
                            onError={e => { e.currentTarget.style.display = "none"; e.currentTarget.parentElement.classList.add("flex","items-center","justify-center"); }} />
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center text-[10px] font-mono font-bold tracking-wider
                            ${n.sentiment==="bull" ? "bg-emerald-500/10 text-emerald-500" : n.sentiment==="bear" ? "bg-rose-500/10 text-rose-500" : "bg-amber-500/10 text-amber-500"}`}>
                            {n.tag}
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <p className="text-xs font-semibold text-slate-200 group-hover:text-white transition leading-snug line-clamp-2 mb-1">{n.title}</p>
                          {n.summary && (
                            <p className="text-[10px] text-slate-600 leading-relaxed line-clamp-2">{n.summary}</p>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1 h-1 rounded-full flex-shrink-0 ${n.sentiment==="bull"?"bg-emerald-400":n.sentiment==="bear"?"bg-rose-400":"bg-amber-400"}`} />
                            <span className="text-[10px] text-slate-500 truncate max-w-[80px]">{n.source}</span>
                            <span className="text-[10px] text-slate-700">·</span>
                            <span className="text-[10px] text-slate-600">{n.time}</span>
                          </div>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono font-semibold border flex-shrink-0
                            ${(n.tag||"").length <= 4 ? "bg-violet-500/10 text-violet-400 border-violet-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}>
                            {n.tag}
                          </span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        )}

      </main>

      {/* ── TRADE ENTRY MODAL ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#0d1424] border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] bg-gradient-to-r from-cyan-500/5 to-violet-500/5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center">
                  <Plus size={12} className="text-white" />
                </div>
                <span className="text-sm font-bold text-white">Log New Trade</span>
              </div>
              <button onClick={()=>setShowForm(false)} className="text-slate-600 hover:text-slate-300 transition">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Row 1 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">Ticker *</label>
                  <input value={form.ticker} onChange={e=>setForm(f=>({...f,ticker:e.target.value.toUpperCase()}))}
                    placeholder="NVDA" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition font-mono font-bold tracking-wider" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">Direction</label>
                  <div className="flex gap-2">
                    {["LONG","SHORT"].map(s=>(
                      <button key={s} onClick={()=>setForm(f=>({...f,side:s}))}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition border ${form.side===s?(s==="LONG"?"bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30":"bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/30"):"bg-white/3 text-slate-500 border-white/10 hover:border-white/20"}`}>
                        {s==="LONG"?<span className="flex items-center justify-center gap-1"><TrendingUp size={11}/>{s}</span>:<span className="flex items-center justify-center gap-1"><TrendingDown size={11}/>{s}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Prices */}
              <div className="grid grid-cols-3 gap-3">
                {[["Entry *","entry","text-white"],["Stop Loss *","stop","text-[#ef4444]"],["Target","target","text-[#10b981]"]].map(([label,key,cls])=>(
                  <div key={key}>
                    <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">{label}</label>
                    <input value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}
                      placeholder="0.00" className={`w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition font-mono ${cls}`} />
                  </div>
                ))}
              </div>

              {/* Calculated metrics */}
              {entryN > 0 && stopN > 0 && (
                <div className="grid grid-cols-4 gap-2 bg-white/3 rounded-xl p-3 border border-white/[0.06]">
                  <div className="text-center">
                    <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-0.5">Shares</div>
                    <div className="text-sm font-bold font-mono text-cyan-400">{posSize}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-0.5">Pos. Value</div>
                    <div className="text-sm font-bold font-mono text-white">${posValue.toLocaleString()}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-0.5">Max Risk</div>
                    <div className="text-sm font-bold font-mono text-[#ef4444]">${Math.round(potLoss).toLocaleString()}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-0.5">R/R Ratio</div>
                    <div className={`text-sm font-bold font-mono ${rrRatio>=2?"text-[#10b981]":rrRatio>=1?"text-amber-400":"text-[#ef4444]"}`}>{rrRatio.toFixed(2)}:1</div>
                  </div>
                </div>
              )}

              {/* Setup Type + Notes */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">Setup Type</label>
                  <select value={form.setup} onChange={e=>setForm(f=>({...f,setup:e.target.value}))}
                    className="w-full border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none transition appearance-none" style={{background:"#0d1424"}}>
                    {["Breakout","Pullback","Support Bounce","Resistance Break","Other"].map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">Notes</label>
                  <input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
                    placeholder="Trade thesis..." className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none transition" />
                </div>
              </div>

              {/* Market Condition + Emotion */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">Market Condition</label>
                  <select value={form.marketCondition} onChange={e=>setForm(f=>({...f,marketCondition:e.target.value}))}
                    className="w-full border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none transition appearance-none" style={{background:"#0d1424"}}>
                    {["Trending Up","Trending Down","Sideways","Volatile"].map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">Emotion at Entry</label>
                  <select value={form.emotionAtEntry} onChange={e=>setForm(f=>({...f,emotionAtEntry:e.target.value}))}
                    className="w-full border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none transition appearance-none" style={{background:"#0d1424"}}>
                    {["Confident","Nervous","FOMO","Neutral"].map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Entry Quality (stars) + Trade Image */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">Entry Quality</label>
                  <div className="flex items-center gap-1 mt-1">
                    {[1,2,3,4,5].map(star => (
                      <button key={star} type="button" onClick={() => setForm(f=>({...f,entryQuality:star}))}
                        className={`text-xl transition-transform hover:scale-110 ${form.entryQuality >= star ? "text-amber-400" : "text-slate-700"}`}>
                        ★
                      </button>
                    ))}
                    <span className="text-[10px] text-slate-600 ml-1">{form.entryQuality}/5</span>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">Trade Image</label>
                  <label className="flex items-center gap-2 cursor-pointer w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-400 hover:border-cyan-500/30 hover:text-cyan-400 transition">
                    <Eye size={12} />
                    <span>{form.tradeImage ? form.tradeImage.name : "Upload chart..."}</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Image preview */}
              {form.tradeImagePreview && (
                <div className="relative rounded-lg overflow-hidden border border-white/10">
                  <img src={form.tradeImagePreview} alt="Trade chart" className="w-full h-32 object-cover" />
                  <button onClick={() => setForm(f=>({...f,tradeImage:null,tradeImagePreview:null}))}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-slate-300 hover:text-white">
                    <X size={10} />
                  </button>
                </div>
              )}

              {/* RR quality indicator */}
              {entryN > 0 && stopN > 0 && targetN > 0 && (
                <div className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs ${rrRatio>=2?"bg-emerald-500/5 border-emerald-500/20 text-[#10b981]":rrRatio>=1?"bg-amber-500/5 border-amber-500/20 text-amber-400":"bg-[#ef4444]/5 border-[#ef4444]/20 text-[#ef4444]"}`}>
                  {rrRatio>=2?<CheckCircle size={13}/>:<AlertTriangle size={13}/>}
                  <span>{rrRatio>=2?"Great setup — R/R exceeds 2:1 minimum":rrRatio>=1?"Acceptable — consider widening target for better R/R":"Below minimum — avoid setups below 1:1 R/R"}</span>
                </div>
              )}

              {/* API Key input */}
              <div>
                <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">Anthropic API Key (for AI analysis)</label>
                <input type="password" value={apiKey} onChange={e=>{ setApiKey(e.target.value); try { localStorage.setItem("swingEdgeApiKey", e.target.value); } catch {} }}
                  placeholder="sk-ant-..." className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-400 placeholder-slate-700 focus:border-violet-500/50 focus:outline-none transition font-mono" />
              </div>

              {/* AI Analysis button */}
              <button onClick={analyzeTradeWithAI} disabled={aiLoading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-500/20 to-cyan-500/20 border border-violet-500/30 text-violet-300 text-sm font-bold hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50">
                {aiLoading ? <><RefreshCw size={13} className="animate-spin" /> מנתח...</> : <><Cpu size={13} /> נתח עסקה 🤖</>}
              </button>

              {/* AI Analysis result */}
              {aiAnalysis && (
                <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-3 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                  <div className="flex items-center gap-1 mb-2 text-violet-400 font-semibold text-[10px] uppercase tracking-wider">
                    <Cpu size={11} /> AI Analysis
                  </div>
                  {aiAnalysis}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button onClick={handleSubmit}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-white text-sm font-bold hover:opacity-90 transition">
                  Log Trade →
                </button>
                <button onClick={()=>{setShowForm(false);setAiAnalysis(null);}} className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-sm hover:text-white hover:border-white/20 transition">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CLOSE TRADE MODAL ── */}
      {showCloseForm && closingTrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0d1424] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] bg-gradient-to-r from-rose-500/5 to-violet-500/5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-rose-400 to-violet-500 flex items-center justify-center">
                  <X size={12} className="text-white" />
                </div>
                <span className="text-sm font-bold text-white">Close Trade — <span className="text-[#ef4444] font-mono">{closingTrade.ticker}</span></span>
              </div>
              <button onClick={()=>{setShowCloseForm(false);setClosingTrade(null);}} className="text-slate-600 hover:text-slate-300 transition">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Trade summary */}
              <div className="bg-white/3 rounded-xl p-3 border border-white/[0.06] grid grid-cols-3 gap-2 text-center text-[10px]">
                <div><div className="text-slate-600 uppercase tracking-wider">Entry</div><div className="font-mono font-bold text-slate-300">${closingTrade.entry}</div></div>
                <div><div className="text-slate-600 uppercase tracking-wider">Stop</div><div className="font-mono font-bold text-[#ef4444]">${closingTrade.stop}</div></div>
                <div><div className="text-slate-600 uppercase tracking-wider">Target</div><div className="font-mono font-bold text-[#10b981]">${closingTrade.target || "–"}</div></div>
              </div>

              {/* Exit Price + Exit Reason */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">Exit Price *</label>
                  <input value={closeForm.exit} onChange={e=>setCloseForm(f=>({...f,exit:e.target.value}))}
                    placeholder="0.00" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-rose-500/50 focus:outline-none focus:ring-1 focus:ring-rose-500/20 transition font-mono" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">Exit Reason</label>
                  <select value={closeForm.exitReason} onChange={e=>setCloseForm(f=>({...f,exitReason:e.target.value}))}
                    className="w-full border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-rose-500/50 focus:outline-none transition appearance-none" style={{background:"#0d1424"}}>
                    {["Stop Loss","Target Hit","Chart Read","Fear","Other"].map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* MFE + MAE */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">Max Favorable Excursion</label>
                  <input value={closeForm.maxFavorable} onChange={e=>setCloseForm(f=>({...f,maxFavorable:e.target.value}))}
                    placeholder="Highest price reached" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-[#10b981] placeholder-slate-600 focus:border-emerald-500/50 focus:outline-none transition font-mono" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">Max Adverse Excursion</label>
                  <input value={closeForm.maxAdverse} onChange={e=>setCloseForm(f=>({...f,maxAdverse:e.target.value}))}
                    placeholder="Lowest price reached" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-[#ef4444] placeholder-slate-600 focus:border-rose-500/50 focus:outline-none transition font-mono" />
                </div>
              </div>

              {/* Followed Plan */}
              <div>
                <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">Followed Plan?</label>
                <div className="flex gap-2">
                  {[true, false].map(val => (
                    <button key={String(val)} onClick={()=>setCloseForm(f=>({...f,followedPlan:val}))}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition border ${closeForm.followedPlan===val?(val?"bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30":"bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/30"):"bg-white/3 text-slate-500 border-white/10 hover:border-white/20"}`}>
                      {val ? "✓ Yes" : "✗ No"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lesson Learned */}
              <div>
                <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">Lesson Learned</label>
                <input value={closeForm.lessonLearned} onChange={e=>setCloseForm(f=>({...f,lessonLearned:e.target.value}))}
                  placeholder="One sentence takeaway..." className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-violet-500/50 focus:outline-none transition" />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button onClick={handleCloseSubmit}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-violet-500 text-white text-sm font-bold hover:opacity-90 transition">
                  Close Trade →
                </button>
                <button onClick={()=>{setShowCloseForm(false);setClosingTrade(null);}} className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-sm hover:text-white hover:border-white/20 transition">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FLOATING NEW TRADE BUTTON ── */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 text-white shadow-2xl shadow-cyan-500/25 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
        title="New Trade"
      >
        <Plus size={24} />
      </button>

      {/* ── FOOTER STATUS BAR ── */}
      <footer className="flex items-center justify-between px-5 py-2 border-t border-white/[0.06] bg-[#0a0f1e] text-[10px] text-slate-700 font-mono">
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
