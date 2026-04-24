import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import OnboardingScreen from "./src/components/OnboardingScreen.jsx";
import AuthScreen from "./src/components/AuthScreen.jsx";
import BetaWelcome from "./src/components/BetaWelcome.jsx";
import FeedbackTab from "./src/components/FeedbackTab.jsx";
import IOSInstallBanner from "./src/components/IOSInstallBanner.jsx";
import AdminPanel from "./src/components/AdminPanel.jsx";
import TradingViewSearch from "./src/components/TradingViewSearch.jsx";
import { useToast, useConfirm, Tooltip as UiTooltip } from "./src/components/ToastProvider.jsx";
import { supabase, isSupabaseConfigured } from "./src/supabaseClient.js";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell
} from "recharts";
import {
  LayoutDashboard, BookOpen, BarChart2, Rss,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  Plus, X, RefreshCw, Activity,
  DollarSign, Target, Zap, ArrowUpRight,
  ArrowDownRight, Eye, Layers, Cpu, Radio, FlaskConical,
  Calculator, Copy, Percent, Hash,
  Settings, BookMarked, Thermometer, Trash2, User,
  Download, FileText, Bell, Flame, Globe, LogOut, MessageCircle,
  Shield, Filter, Save, BarChart3
} from "lucide-react";
import { getTranslations, LANGUAGES, isRTLLang } from "./src/i18n.js";
import {
  fetchPrices, fmtVolume, fmtMarketCap, searchTickers,
  fetchQuote, getMarketState, getMarketStateBadge, getRefreshInterval, MARKET_STATE,
} from "./src/priceService.js";
import { analyzeTradeLocal, analyzeTradeLocalText } from "./src/localAI.js";
import { SwingEdgeAI } from "./src/intelligence/SwingEdgeAI.js";
import {
  DNACard, EdgeCard, DecisionCoachPanel, TiltShield, GrowthChart, RegimeIndicator,
} from "./src/intelligence/ui/IntelligenceUI.jsx";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const RISK_PCT = 0.01;

const SECTOR_ETFS = [
  { symbol: "XLE", name: "Energy" },
  { symbol: "XLK", name: "Technology" },
  { symbol: "BTC-USD", name: "Crypto" },
  { symbol: "XLF", name: "Financials" },
  { symbol: "XLV", name: "Healthcare" },
  { symbol: "XLY", name: "Consumer" },
  { symbol: "XLI", name: "Industrials" },
  { symbol: "XLU", name: "Utilities" },
];

const MOCK_TRADES = [];

// ─── DEMO TRADES (loaded via Settings → "Load Demo Trades") ────────────────
// Position sizes computed at 1% risk on a rolling $2,500 account. MAE/MFE
// values are realistic (MFE ≈ peak favorable, MAE ≈ worst adverse tick).
const DEMO_TRADES = [
  {
    id: "demo-1", ticker: "NVDA", side: "LONG", date: "2026-04-05",
    entry: 175.40, stop: 171.30, target: 185.00, exit: 184.20, shares: 6,
    status: "CLOSED", setup: "Pullback", marketCondition: "Trending Up",
    emotionAtEntry: "Confident", entryQuality: 5, followedPlan: true,
    exitReason: "Target Hit",
    notes: "RSI נכנס מעל 50 מ-42, wick rejection ב-171.38, 3 ירוקים ברצף ב-4H",
    lessonLearned: "סבלנות עם setup נקי משתלמת — לא רדפתי, חיכיתי לרי-טסט",
    maxFavorable: 185.10, maxAdverse: 173.90, _capitalAtEntry: 2500.00,
  },
  {
    id: "demo-2", ticker: "AAPL", side: "LONG", date: "2026-04-07",
    entry: 218.50, stop: 215.80, target: 226.00, exit: 225.40, shares: 9,
    status: "CLOSED", setup: "Breakout", marketCondition: "Trending Up",
    emotionAtEntry: "Neutral", entryQuality: 4, followedPlan: true,
    exitReason: "Target Hit",
    notes: "פריצה של $218 אחרי 5 ימי דשדוש, volume 130% מהממוצע",
    lessonLearned: "Breakouts עם volume confirmation — האחוזי הצלחה הכי גבוהים שלי",
    maxFavorable: 226.20, maxAdverse: 217.10, _capitalAtEntry: 2552.80,
  },
  {
    id: "demo-3", ticker: "TSLA", side: "LONG", date: "2026-04-08",
    entry: 285.00, stop: 278.50, target: 298.00, exit: 278.50, shares: 4,
    status: "CLOSED", setup: "Other", marketCondition: "Volatile",
    emotionAtEntry: "FOMO", entryQuality: 2, followedPlan: false,
    exitReason: "Stop Loss",
    notes: "ניסיתי לתפוס breakout ב-$285 אחרי news של דליבריות",
    lessonLearned: "FOMO + שוק choppy = הפסד בטוח. לא שוב!",
    maxFavorable: 287.40, maxAdverse: 278.50, _capitalAtEntry: 2614.90,
  },
  {
    id: "demo-4", ticker: "BTC", side: "LONG", date: "2026-04-09",
    entry: 71250, stop: 69800, target: 74500, exit: 73950, shares: 0.02,
    status: "CLOSED", setup: "Pullback", marketCondition: "Trending Up",
    emotionAtEntry: "Confident", entryQuality: 5, followedPlan: true,
    exitReason: "Target Hit",
    notes: "BTC עשה HL ב-69500 ופרץ resistance של 71K עם volume",
    lessonLearned: "קריפטו עובד מצוין כשיש מבנה ברור של HH/HL",
    maxFavorable: 74480, maxAdverse: 70640, _capitalAtEntry: 2588.90,
  },
  {
    id: "demo-5", ticker: "META", side: "LONG", date: "2026-04-10",
    entry: 612.00, stop: 605.00, target: 628.00, exit: 626.50, shares: 3,
    status: "CLOSED", setup: "Pullback", marketCondition: "Trending Up",
    emotionAtEntry: "Neutral", entryQuality: 4, followedPlan: true,
    exitReason: "Target Hit",
    notes: "מחיר נגע ב-50 EMA, hammer candle, RSI ב-45 מתאושש",
    lessonLearned: "EMA bounces עובדים כשהטרנד הראשי חזק",
    maxFavorable: 627.20, maxAdverse: 609.40, _capitalAtEntry: 2642.90,
  },
  {
    id: "demo-6", ticker: "SPY", side: "LONG", date: "2026-04-11",
    entry: 588.50, stop: 585.20, target: 595.00, exit: 588.80, shares: 8,
    status: "CLOSED", setup: "Breakout", marketCondition: "Sideways",
    emotionAtEntry: "Nervous", entryQuality: 2, followedPlan: true,
    exitReason: "Chart Read",
    notes: "ניסיתי breakout ב-$588 אבל לא היה volume אמיתי",
    lessonLearned: "אם אני מהסס בכניסה — סימן שלא צריך להיכנס. סגרתי בזמן.",
    maxFavorable: 589.90, maxAdverse: 587.10, _capitalAtEntry: 2686.40,
  },
  {
    id: "demo-7", ticker: "AMD", side: "LONG", date: "2026-04-12",
    entry: 168.20, stop: 164.50, target: 178.00, exit: 176.80, shares: 7,
    status: "CLOSED", setup: "Breakout", marketCondition: "Trending Up",
    emotionAtEntry: "Confident", entryQuality: 5, followedPlan: true,
    exitReason: "Target Hit",
    notes: "תבנית Cup and Handle ברורה, פריצה ב-$168 עם volume גבוה",
    lessonLearned: "Cup and Handle — אחת התבניות הכי אמינות שלי",
    maxFavorable: 178.40, maxAdverse: 166.90, _capitalAtEntry: 2688.80,
  },
  {
    id: "demo-8", ticker: "ETH", side: "LONG", date: "2026-04-14",
    entry: 3850, stop: 3760, target: 4050, exit: 3760, shares: 0.3,
    status: "CLOSED", setup: "Pullback", marketCondition: "Volatile",
    emotionAtEntry: "FOMO", entryQuality: 1, followedPlan: false,
    exitReason: "Stop Loss",
    notes: "ניסיתי להחזיר את ההפסד של TSLA — נכנסתי בלי setup ברור",
    lessonLearned: "Revenge trading = הפסד מובטח. לקחת הפסקה אחרי הפסד!",
    maxFavorable: 3880, maxAdverse: 3760, _capitalAtEntry: 2749.00,
  },
  {
    id: "demo-9", ticker: "MSFT", side: "LONG", date: "2026-04-15",
    entry: 445.00, stop: 440.20, target: 458.00, exit: 456.50, shares: 5,
    status: "CLOSED", setup: "Breakout", marketCondition: "Trending Up",
    emotionAtEntry: "Confident", entryQuality: 5, followedPlan: true,
    exitReason: "Target Hit",
    notes: "אחרי דוחות חזקים, gap up ביום ראשון, hold above $445",
    lessonLearned: "Post-earnings strength עובד מצוין כשה-setup pattern נשמר",
    maxFavorable: 457.30, maxAdverse: 443.10, _capitalAtEntry: 2722.00,
  },
  {
    id: "demo-10", ticker: "NVDA", side: "LONG", date: "2026-04-17",
    entry: 195.50, stop: 192.00, target: 205.00, exit: 201.68, shares: 7,
    status: "CLOSED", setup: "Breakout", marketCondition: "Trending Up",
    emotionAtEntry: "Confident", entryQuality: 5, followedPlan: true,
    exitReason: "Chart Read",
    notes: "NVDA פרץ $195 עם buy signals מ-MA short+long, volume rising",
    lessonLearned: "כשכל הסיגנלים מתיישרים — תאמין למערכת",
    maxFavorable: 202.40, maxAdverse: 194.20, _capitalAtEntry: 2779.50,
  },
];

const POPULAR_TICKERS = [
  { symbol: "NVDA", name: "NVIDIA Corporation", exchange: "NASDAQ", type: "EQUITY" },
  { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ", type: "EQUITY" },
  { symbol: "MSFT", name: "Microsoft Corporation", exchange: "NASDAQ", type: "EQUITY" },
  { symbol: "TSLA", name: "Tesla, Inc.", exchange: "NASDAQ", type: "EQUITY" },
  { symbol: "AMZN", name: "Amazon.com, Inc.", exchange: "NASDAQ", type: "EQUITY" },
  { symbol: "GOOGL", name: "Alphabet Inc.", exchange: "NASDAQ", type: "EQUITY" },
  { symbol: "META", name: "Meta Platforms, Inc.", exchange: "NASDAQ", type: "EQUITY" },
  { symbol: "AMD", name: "Advanced Micro Devices", exchange: "NASDAQ", type: "EQUITY" },
  { symbol: "PLTR", name: "Palantir Technologies", exchange: "NASDAQ", type: "EQUITY" },
  { symbol: "SPY", name: "SPDR S&P 500 ETF", exchange: "NYSE", type: "ETF" },
  { symbol: "QQQ", name: "Invesco QQQ Trust", exchange: "NASDAQ", type: "ETF" },
  { symbol: "BTC-USD", name: "Bitcoin", exchange: "CCC", type: "CRYPTOCURRENCY" },
  { symbol: "ETH-USD", name: "Ethereum", exchange: "CCC", type: "CRYPTOCURRENCY" },
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
const generateEquityCurve = (cap, trades = []) => {
  let balance = cap;
  const data = [];
  trades.filter(t => t.status === "CLOSED").forEach(t => {
    const pnl = t.side === "LONG"
      ? (t.exit - t.entry) * t.shares
      : (t.entry - t.exit) * t.shares;
    balance += pnl;
    data.push({ date: t.date, equity: Math.round(balance), ticker: t.ticker, pnl: Math.round(pnl) });
  });
  return [{ date: "2025-01-01", equity: cap, ticker: "START", pnl: 0 }, ...data];
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

// ─── EXPORT HELPERS ───────────────────────────────────────────────────────────
const exportTradesCSV = (trades) => {
  const headers = ["ID","Ticker","Date","Side","Entry","Stop","Target","Shares","Status","Exit","Setup","Notes","Market Condition","Emotion at Entry","Entry Quality","Exit Reason","Followed Plan","Lesson Learned","Max Favorable","Max Adverse","P&L","R-Multiple"];
  const rows = trades.map(t => {
    const m = calcTradeMetrics(t);
    return [
      t.id, t.ticker, t.date, t.side,
      t.entry, t.stop, t.target ?? "", t.shares,
      t.status, t.exit ?? "",
      t.setup ?? "", `"${(t.notes ?? "").replace(/"/g, '""')}"`,
      t.marketCondition ?? "", t.emotionAtEntry ?? "", t.entryQuality ?? "",
      t.exitReason ?? "", t.followedPlan != null ? (t.followedPlan ? "Yes" : "No") : "",
      `"${(t.lessonLearned ?? "").replace(/"/g, '""')}"`,
      t.maxFavorable ?? "", t.maxAdverse ?? "",
      m.pnl != null ? m.pnl.toFixed(2) : "",
      m.rMultiple != null ? m.rMultiple.toFixed(2) : "",
    ].join(",");
  });
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `SwingEdge_Journal_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const exportMonthlyPDF = (trades, capital) => {
  const now = new Date();
  const monthName = now.toLocaleString("en-US", { month: "long" });
  const year = now.getFullYear();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const allClosed = trades.filter(t => t.status === "CLOSED");
  const monthClosed = allClosed.filter(t => {
    const d = new Date(t.date + "T12:00:00");
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });

  const totalPnL = allClosed.reduce((a, t) => a + (calcTradeMetrics(t).pnl || 0), 0);
  const monthPnL = monthClosed.reduce((a, t) => a + (calcTradeMetrics(t).pnl || 0), 0);
  const winRate = allClosed.length ? (allClosed.filter(t => (calcTradeMetrics(t).pnl || 0) > 0).length / allClosed.length * 100).toFixed(1) : "0.0";
  const monthWinRate = monthClosed.length ? (monthClosed.filter(t => (calcTradeMetrics(t).pnl || 0) > 0).length / monthClosed.length * 100).toFixed(1) : "0.0";
  const avgR = allClosed.length ? (allClosed.reduce((a, t) => a + (calcTradeMetrics(t).rMultiple || 0), 0) / allClosed.length).toFixed(2) : "0.00";
  const curEquity = capital + totalPnL;

  // Build equity curve points from all closed trades
  let runBalance = capital;
  const equityPoints = allClosed.map(t => {
    const pnl = calcTradeMetrics(t).pnl || 0;
    runBalance += pnl;
    return { date: t.date, ticker: t.ticker, equity: Math.round(runBalance) };
  });

  // Lessons from this month
  const lessons = monthClosed.filter(t => t.lessonLearned && t.lessonLearned.trim()).map(t => ({ ticker: t.ticker, lesson: t.lessonLearned }));

  const pnlColor = (v) => v >= 0 ? "#10b981" : "#ef4444";
  const fmtDollar = (v) => v >= 0 ? `+$${Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : `-$${Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  // Build equity chart SVG
  const maxEq = Math.max(...equityPoints.map(p => p.equity), curEquity);
  const minEq = Math.min(...equityPoints.map(p => p.equity), capital);
  const chartW = 600, chartH = 150;
  const pts = [{ equity: capital }, ...equityPoints];
  const toX = (i) => (i / (pts.length - 1 || 1)) * chartW;
  const toY = (eq) => chartH - ((eq - minEq) / ((maxEq - minEq) || 1)) * chartH;
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(p.equity).toFixed(1)}`).join(" ");
  const areaD = `${pathD} L${chartW},${chartH} L0,${chartH} Z`;

  const tradeRows = [...monthClosed].reverse().map(t => {
    const m = calcTradeMetrics(t);
    const pnl = m.pnl != null ? m.pnl : 0;
    const r = m.rMultiple != null ? m.rMultiple : 0;
    return `
      <tr>
        <td>${t.date}</td>
        <td><strong>${t.ticker}</strong></td>
        <td>${t.side}</td>
        <td>${t.setup ?? "-"}</td>
        <td>$${t.entry}</td>
        <td>${t.exit != null ? "$" + t.exit : "-"}</td>
        <td style="color:${pnlColor(pnl)};font-weight:600">${fmtDollar(pnl)}</td>
        <td style="color:${pnlColor(r)};font-weight:600">${r >= 0 ? "+" : ""}${r.toFixed(2)}R</td>
        <td>${t.followedPlan != null ? (t.followedPlan ? "✓" : "✗") : "-"}</td>
      </tr>`;
  }).join("");

  const lessonRows = lessons.length
    ? lessons.map(l => `<li><strong>${l.ticker}</strong>: ${l.lesson}</li>`).join("")
    : "<li>No lessons recorded this month.</li>";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>SwingEdge — ${monthName} ${year} Performance Report</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Inter', Arial, sans-serif; background:#fff; color:#111; padding:40px 48px; font-size:13px; }
  h1 { font-size:22px; font-weight:700; color:#0f172a; margin-bottom:4px; }
  .subtitle { color:#64748b; font-size:12px; margin-bottom:32px; }
  .section { margin-bottom:28px; }
  .section-title { font-size:13px; font-weight:700; color:#0f172a; letter-spacing:.06em; text-transform:uppercase; margin-bottom:12px; padding-bottom:6px; border-bottom:1.5px solid #e2e8f0; }
  .kpis { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
  .kpi { background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:14px 16px; }
  .kpi-label { font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:.08em; margin-bottom:4px; }
  .kpi-value { font-size:20px; font-weight:700; font-family:monospace; }
  table { width:100%; border-collapse:collapse; font-size:12px; }
  th { background:#f1f5f9; text-align:left; padding:7px 10px; font-size:10px; text-transform:uppercase; letter-spacing:.06em; color:#475569; font-weight:600; }
  td { padding:7px 10px; border-bottom:1px solid #f1f5f9; }
  tr:last-child td { border-bottom:none; }
  .chart-wrap { background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:16px; }
  svg { display:block; width:100%; }
  .lessons { background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; padding:16px; }
  .lessons li { margin-bottom:6px; line-height:1.5; }
  .footer { margin-top:40px; font-size:10px; color:#94a3b8; text-align:center; border-top:1px solid #e2e8f0; padding-top:12px; }
  @media print {
    body { padding:20px 28px; }
    button { display:none; }
  }
</style>
</head>
<body>
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px">
  <div>
    <h1>SwingEdge — Performance Report</h1>
    <div class="subtitle">${monthName} ${year} &nbsp;·&nbsp; Generated ${now.toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</div>
  </div>
  <button onclick="window.print()" style="padding:8px 18px;background:#0ea5e9;color:#fff;border:none;border-radius:8px;font-weight:600;font-size:12px;cursor:pointer">Save as PDF</button>
</div>

<div class="section">
  <div class="section-title">KPI Summary</div>
  <div class="kpis">
    <div class="kpi">
      <div class="kpi-label">Portfolio Equity</div>
      <div class="kpi-value" style="color:#0f172a">$${curEquity.toLocaleString("en-US",{minimumFractionDigits:2})}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Net P&amp;L (All Time)</div>
      <div class="kpi-value" style="color:${pnlColor(totalPnL)}">${fmtDollar(totalPnL)}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">${monthName} P&amp;L</div>
      <div class="kpi-value" style="color:${pnlColor(monthPnL)}">${fmtDollar(monthPnL)}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Win Rate (All Time)</div>
      <div class="kpi-value" style="color:#0f172a">${winRate}%</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">${monthName} Win Rate</div>
      <div class="kpi-value" style="color:#0f172a">${monthWinRate}%</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Avg R-Multiple</div>
      <div class="kpi-value" style="color:${avgR >= 0 ? "#10b981" : "#ef4444"}">${avgR >= 0 ? "+" : ""}${avgR}R</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Closed Trades</div>
      <div class="kpi-value" style="color:#0f172a">${allClosed.length}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">${monthName} Trades</div>
      <div class="kpi-value" style="color:#0f172a">${monthClosed.length}</div>
    </div>
  </div>
</div>

${equityPoints.length > 0 ? `
<div class="section">
  <div class="section-title">Equity Curve</div>
  <div class="chart-wrap">
    <svg viewBox="0 0 ${chartW} ${chartH}" preserveAspectRatio="none" style="height:150px">
      <defs>
        <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#10b981" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="#10b981" stop-opacity="0.02"/>
        </linearGradient>
      </defs>
      <path d="${areaD}" fill="url(#eqGrad)" />
      <path d="${pathD}" fill="none" stroke="#10b981" stroke-width="2" stroke-linejoin="round"/>
    </svg>
    <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:10px;color:#94a3b8;font-family:monospace">
      <span>Start: $${capital.toLocaleString()}</span>
      <span>Current: $${curEquity.toLocaleString("en-US",{minimumFractionDigits:2})}</span>
    </div>
  </div>
</div>` : ""}

<div class="section">
  <div class="section-title">${monthName} Trade Log</div>
  ${monthClosed.length === 0
    ? `<p style="color:#94a3b8;font-size:12px">No closed trades this month.</p>`
    : `<table>
        <thead><tr>
          <th>Date</th><th>Ticker</th><th>Side</th><th>Setup</th>
          <th>Entry</th><th>Exit</th><th>P&amp;L</th><th>R-Mult</th><th>Plan?</th>
        </tr></thead>
        <tbody>${tradeRows}</tbody>
      </table>`}
</div>

<div class="section">
  <div class="section-title">Lessons Learned</div>
  <div class="lessons">
    <ul style="padding-left:18px;line-height:1.6">
      ${lessonRows}
    </ul>
  </div>
</div>

<div class="footer">SwingEdge Trading Journal &nbsp;·&nbsp; ${monthName} ${year} Performance Report &nbsp;·&nbsp; Confidential</div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
};

// ─── TIME HELPERS ─────────────────────────────────────────────────────────────
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

// ─── TICKER LOGO ─────────────────────────────────────────────────────────────
const TickerLogo = ({ ticker, size = 20, className = "" }) => {
  const [imgError, setImgError] = useState(false);
  const cleanTicker = (ticker || "").replace("-USD", "").toUpperCase();
  if (imgError || !cleanTicker) {
    return (
      <div className={`rounded-full bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-white/10 flex items-center justify-center text-[8px] font-bold text-cyan-400 font-mono flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}>
        {cleanTicker.slice(0, 2)}
      </div>
    );
  }
  return (
    <img
      src={`https://financialmodelingprep.com/image-stock/${cleanTicker}.png`}
      alt={cleanTicker}
      className={`rounded-full bg-white/5 object-cover flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
      onError={() => setImgError(true)}
    />
  );
};

// ─── SMART LESSONS GENERATOR ─────────────────────────────────────────────────
const generateSmartLessons = (closedTrades, calcFn) => {
  if (closedTrades.length < 2) return [];
  const lessons = [];

  // Analyze patterns
  const winners = closedTrades.filter(t => (calcFn(t).pnl || 0) > 0);
  const losers = closedTrades.filter(t => (calcFn(t).pnl || 0) < 0);
  const followedPlanLosers = losers.filter(t => t.followedPlan === false);
  const fomoTrades = closedTrades.filter(t => t.emotionAtEntry === "FOMO");
  const fomoLosers = fomoTrades.filter(t => (calcFn(t).pnl || 0) < 0);

  // Best setup
  const setupMap = {};
  closedTrades.forEach(t => {
    if (!setupMap[t.setup]) setupMap[t.setup] = { wins: 0, losses: 0, totalPnl: 0 };
    const pnl = calcFn(t).pnl || 0;
    if (pnl > 0) setupMap[t.setup].wins++;
    else setupMap[t.setup].losses++;
    setupMap[t.setup].totalPnl += pnl;
  });
  const bestSetup = Object.entries(setupMap).sort((a, b) => {
    const wrA = a[1].wins / (a[1].wins + a[1].losses);
    const wrB = b[1].wins / (b[1].wins + b[1].losses);
    return wrB - wrA;
  })[0];

  if (bestSetup && bestSetup[1].wins + bestSetup[1].losses >= 2) {
    const wr = Math.round(bestSetup[1].wins / (bestSetup[1].wins + bestSetup[1].losses) * 100);
    lessons.push({
      type: "strength",
      title: `${bestSetup[0]} is your best setup`,
      detail: `${wr}% win rate across ${bestSetup[1].wins + bestSetup[1].losses} trades. Focus more on this pattern.`,
      action: `Look for more ${bestSetup[0]} setups and increase position size when confidence is high.`,
    });
  }

  if (followedPlanLosers.length >= 2) {
    lessons.push({
      type: "warning",
      title: "Plan deviation costs you money",
      detail: `${followedPlanLosers.length} losses came from not following your trading plan.`,
      action: "Before every trade, write down your plan. After entry, follow it mechanically.",
    });
  }

  if (fomoTrades.length >= 2 && fomoLosers.length > 0) {
    const fomoLossRate = Math.round(fomoLosers.length / fomoTrades.length * 100);
    lessons.push({
      type: "warning",
      title: "FOMO trades are hurting you",
      detail: `${fomoLossRate}% of your FOMO entries resulted in losses.`,
      action: "When you feel FOMO, wait 15 minutes. If the setup still looks good, enter with smaller size.",
    });
  }

  // Average winner vs average loser
  if (winners.length > 0 && losers.length > 0) {
    const avgWin = winners.reduce((s, t) => s + (calcFn(t).pnl || 0), 0) / winners.length;
    const avgLoss = Math.abs(losers.reduce((s, t) => s + (calcFn(t).pnl || 0), 0) / losers.length);
    if (avgLoss > avgWin * 1.5) {
      lessons.push({
        type: "insight",
        title: "Your losses are bigger than your wins",
        detail: `Average win: $${Math.round(avgWin)} vs average loss: $${Math.round(avgLoss)}.`,
        action: "Tighten your stop losses or widen your targets. Aim for at least 2:1 R/R.",
      });
    }
  }

  // Recent trades lesson from user's own notes
  const recentLessons = closedTrades.filter(t => t.lessonLearned && t.lessonLearned.trim()).slice(-3);
  if (recentLessons.length > 0 && lessons.length < 3) {
    const latest = recentLessons[recentLessons.length - 1];
    lessons.push({
      type: "personal",
      title: `Your latest insight (${latest.ticker})`,
      detail: latest.lessonLearned,
      action: "Review this before your next trade to avoid repeating the same mistake.",
    });
  }

  return lessons.slice(0, 3);
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
      <div className={`absolute top-3 right-3 rtl:right-auto rtl:left-3 opacity-15 ${iconColor}`}>
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

// ─── RIBBON TICKER ────────────────────────────────────────────────────────────
// Shows one symbol on the header ribbon: logo + price + %-change + arrow,
// with a tooltip (open/prev close/high/low) and a short flash when the price
// ticks in either direction.
const RibbonTicker = ({ item }) => {
  const [flash, setFlash] = useState(null); // "green" | "red" | null
  const prevPriceRef = useRef(item.price);
  useEffect(() => {
    const prev = prevPriceRef.current;
    if (typeof prev === "number" && typeof item.price === "number" && prev !== item.price) {
      setFlash(item.price > prev ? "green" : "red");
      const t = setTimeout(() => setFlash(null), 700);
      return () => clearTimeout(t);
    }
    prevPriceRef.current = item.price;
  }, [item.price]);

  const bull = (item.changePct || 0) >= 0;
  const tooltip = [
    item.open != null ? `Open ${item.open.toFixed(2)}` : null,
    item.prevClose != null ? `PrevClose ${item.prevClose.toFixed(2)}` : null,
    item.high != null ? `High ${item.high.toFixed(2)}` : null,
    item.low != null ? `Low ${item.low.toFixed(2)}` : null,
  ].filter(Boolean).join(" · ");

  return (
    <span
      title={tooltip || item.displayTicker}
      className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${bull ? "text-[#10b981]" : "text-[#ef4444]"} ${flash === "green" ? "flash-green" : ""} ${flash === "red" ? "flash-red" : ""}`}
    >
      <TickerLogo ticker={item.displayTicker.replace("-USD","")} size={14} />
      <span className="font-bold">{item.displayTicker}</span>
      {typeof item.price === "number" && (
        <span className="text-slate-300">${item.price.toFixed(2)}</span>
      )}
      <span>{bull ? "▲" : "▼"} {bull ? "+" : ""}{(item.changePct || 0).toFixed(2)}%</span>
    </span>
  );
};

// ─── NAV ──────────────────────────────────────────────────────────────────────
const NAV_KEYS = [
  { id: "dashboard", key: "dashboard",      icon: LayoutDashboard },
  { id: "journal",   key: "journal",        icon: BookOpen },
  { id: "analyzer",  key: "tradeAnalyzer",  icon: FlaskConical },
  { id: "position",  key: "positionCalc",   icon: Calculator },
  { id: "analytics", key: "analytics",      icon: BarChart2 },
  { id: "intel",     key: "marketIntel",    icon: Rss },
  { id: "feedback",  key: "feedback",       icon: MessageCircle },
];

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function SwingEdge() {
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try {
      const saved = localStorage.getItem("swingEdgeOnboarding");
      return !saved;
    } catch { return true; }
  });
  const [userProfile, setUserProfile] = useState(() => {
    try {
      const saved = localStorage.getItem("swingEdgeOnboarding");
      return saved ? JSON.parse(saved).profile : null;
    } catch { return null; }
  });

  const handleOnboardingComplete = (profile) => {
    setUserProfile(profile);
    setShowOnboarding(false);
  };

  // ── SUPABASE AUTH ──
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [session, setSession] = useState(null);
  const authUser = session?.user || null;
  const isAdmin = (authUser?.email || "").toLowerCase() === "niveven183@gmail.com";

  // Toast + Confirm (UX infrastructure)
  const toast = useToast();
  const confirmDialog = useConfirm();

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setAuthReady(true);
      return;
    }
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data?.session || null);
      setAuthReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s || null);
    });
    return () => {
      cancelled = true;
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  const handleLogout = useCallback(async () => {
    if (isSupabaseConfigured && supabase) {
      try { await supabase.auth.signOut(); } catch {}
    }
    setSession(null);
    setShowProfileDropdown(false);
  }, []);

  // Beta welcome — shown once per user after first login
  const [showBetaWelcome, setShowBetaWelcome] = useState(false);
  useEffect(() => {
    if (!authUser) { setShowBetaWelcome(false); return; }
    try {
      const key = `swingEdgeBetaWelcome:${authUser.id}`;
      if (!localStorage.getItem(key)) setShowBetaWelcome(true);
    } catch {}
  }, [authUser?.id]);

  const dismissBetaWelcome = useCallback(() => {
    if (!authUser) return;
    try { localStorage.setItem(`swingEdgeBetaWelcome:${authUser.id}`, "1"); } catch {}
    setShowBetaWelcome(false);
  }, [authUser?.id]);

  const [capital, setCapital] = useState(() => {
    try { return parseFloat(localStorage.getItem("swingEdgeCapital")) || 2500; } catch { return 2500; }
  });
  const [capitalInput, setCapitalInput] = useState("");
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const profileRef = useRef(null);

  const [sectorData, setSectorData] = useState([]);
  const [sectorLoading, setSectorLoading] = useState(false);
  const [sectorLastUpdated, setSectorLastUpdated] = useState(null);

  const [tab, setTab] = useState(() => {
    try {
      const path = (window.location.pathname || "").toLowerCase();
      const hash = (window.location.hash || "").toLowerCase();
      if (path.includes("/admin") || hash.includes("admin")) return "admin";
    } catch {}
    return "dashboard";
  });
  const [trades, setTrades] = useState(() => {
    try {
      const saved = localStorage.getItem("swingEdgeTrades");
      return saved ? JSON.parse(saved) : MOCK_TRADES;
    } catch { return MOCK_TRADES; }
  });
  const [chartSymbol, setChartSymbol] = useState("NASDAQ:NVDA");
  const [chartInterval, setChartInterval] = useState("1D");
  const [chartStyle, setChartStyle] = useState("1");
  const tvRef = useRef(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ticker: "", side: "LONG", entry: "", stop: "", target: "", setup: "Breakout", notes: "", marketCondition: "Trending Up", emotionAtEntry: "Neutral", entryQuality: 3, tradeImage: null, tradeImagePreview: null });
  // Live quote shown in the Add Trade modal (auto-fills Entry Price).
  const [formQuote, setFormQuote] = useState(null);
  const [formQuoteLoading, setFormQuoteLoading] = useState(false);
  const formQuoteTimer = useRef(null);
  const [pulse, setPulse] = useState(false);
  const [tickerIdx, setTickerIdx] = useState(0);
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [closingTrade, setClosingTrade] = useState(null);
  const [closeForm, setCloseForm] = useState({ exit: "", exitReason: "Target Hit", followedPlan: true, lessonLearned: "", maxFavorable: "", maxAdverse: "" });
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Trade Analyzer state
  const [analyzerForm, setAnalyzerForm] = useState({ ticker: "", entry: "", stop: "", target: "", shares: "" });
  const [analyzerImage, setAnalyzerImage] = useState(null);
  const [analyzerImagePreview, setAnalyzerImagePreview] = useState(null);
  const [analyzerResult, setAnalyzerResult] = useState(null);
  const [analyzerLoading, setAnalyzerLoading] = useState(false);

  // Chart AI extraction state
  const [chartAiLoading, setChartAiLoading] = useState(false);
  const [chartAiTarget, setChartAiTarget] = useState(null); // "position" | "journal"

  // Position Calculator state
  const [posCalc, setPosCalc] = useState({ capital: "", risk: "1", entry: "", stop: "", ticker: "" });
  const [posCopied, setPosCopied] = useState(false);

  // Language state
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem("swingEdgeLang") || "he"; } catch { return "he"; }
  });
  const t = useMemo(() => getTranslations(lang), [lang]);
  const isRTL = isRTLLang(lang);

  // Live prices state (global - used everywhere)
  const [livePrices, setLivePrices] = useState({});

  // Price alerts state
  const [priceAlerts, setPriceAlerts] = useState(() => {
    try {
      const saved = localStorage.getItem("swingEdgePriceAlerts");
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [alertNotification, setAlertNotification] = useState(null);
  const [showAlertInput, setShowAlertInput] = useState(null);
  const [alertInputValue, setAlertInputValue] = useState("");

  // Watchlist search state
  const [watchlistSearchResults, setWatchlistSearchResults] = useState([]);
  const [watchlistSearching, setWatchlistSearching] = useState(false);
  const watchlistSearchTimeout = useRef(null);

  // Watchlist sort state
  const [watchlistSortBy, setWatchlistSortBy] = useState("ticker");

  // Personal Playbook state
  const [playbookSetups, setPlaybookSetups] = useState(() => {
    try {
      const saved = localStorage.getItem("swingEdgePlaybook");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [playbookForm, setPlaybookForm] = useState({ name: "", description: "", imagePreview: null });
  const [showPlaybookForm, setShowPlaybookForm] = useState(false);
  const [editingSetupId, setEditingSetupId] = useState(null);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [pricesLastUpdated, setPricesLastUpdated] = useState(null);

  // Light/Dark mode
  const [lightMode, setLightMode] = useState(() => {
    try { return localStorage.getItem("swingEdgeLightMode") === "true"; } catch { return false; }
  });

  // Edit trade state
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingTrade, setEditingTrade] = useState(null);
  const [editForm, setEditForm] = useState({
    ticker: "", side: "LONG", entry: "", stop: "", target: "", shares: "",
    setup: "Breakout", notes: "", marketCondition: "Trending Up",
    emotionAtEntry: "Neutral", entryQuality: 3, status: "OPEN",
    exit: "", exitReason: "Target Hit", followedPlan: null, lessonLearned: "",
    maxFavorable: "", maxAdverse: "",
  });

  // Watchlist state
  const DEFAULT_WATCHLIST = [
    ...SCANNER_DATA.map(s => ({ ticker: s.ticker, price: s.price, change: s.change, setup: s.setup, chartSym: `NASDAQ:${s.ticker}` })),
    { ticker: "BTC", price: null, change: null, setup: "Crypto", chartSym: "BINANCE:BTCUSDT" },
    { ticker: "ETH", price: null, change: null, setup: "Crypto", chartSym: "BINANCE:ETHUSDT" },
  ];
  const [watchlistItems, setWatchlistItems] = useState(() => {
    try {
      const saved = localStorage.getItem("swingEdgeWatchlist");
      return saved ? JSON.parse(saved) : DEFAULT_WATCHLIST;
    } catch { return DEFAULT_WATCHLIST; }
  });
  const [watchlistInput, setWatchlistInput] = useState("");

  // Journal Pro filters
  const [journalFilters, setJournalFilters] = useState({
    ticker: "", setup: "all", result: "all", from: "", to: "", rMin: "", rMax: "",
  });
  const [showJournalFilters, setShowJournalFilters] = useState(false);

  // Persist trades to localStorage
  useEffect(() => {
    try { localStorage.setItem("swingEdgeTrades", JSON.stringify(trades)); } catch {}
  }, [trades]);

  // Persist watchlist to localStorage
  useEffect(() => {
    try { localStorage.setItem("swingEdgeWatchlist", JSON.stringify(watchlistItems)); } catch {}
  }, [watchlistItems]);

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

    const intervalMap = { "1m": "1", "5m": "5", "15m": "15", "1H": "60", "4H": "240", "1D": "D", "1W": "W" };
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
        style: chartStyle || "1",
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
  }, [tab, chartSymbol, chartInterval, chartStyle]);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Global keyboard shortcuts: N=new trade, J=journal, D=dashboard, ESC=close modals
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      const isTyping = tag === "input" || tag === "textarea" || e.target?.isContentEditable;
      if (e.key === "Escape") {
        if (showForm) setShowForm(false);
        if (showCloseForm) { setShowCloseForm(false); setClosingTrade(null); }
        if (showEditForm) { setShowEditForm(false); setEditingTrade(null); }
        if (showProfileDropdown) setShowProfileDropdown(false);
        return;
      }
      if (isTyping) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "n") { e.preventDefault(); setShowForm(true); }
      else if (k === "j") { e.preventDefault(); setTab("journal"); }
      else if (k === "d") { e.preventDefault(); setTab("dashboard"); }
      else if (k === "a") { e.preventDefault(); setTab("analyzer"); }
      else if (k === "i") { e.preventDefault(); setTab("intel"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showForm, showCloseForm, showEditForm, showProfileDropdown]);

  // Sector data fetch
  const fetchSectorData = useCallback(async () => {
    setSectorLoading(true);
    try {
      const results = await Promise.allSettled(
        SECTOR_ETFS.map(s =>
          fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(
            `https://query1.finance.yahoo.com/v8/finance/chart/${s.symbol}?range=1mo&interval=1d`
          )}`)
            .then(r => r.json())
            .then(data => {
              const result = data?.chart?.result?.[0];
              if (!result) return null;
              const closes = (result.indicators?.quote?.[0]?.close || []).filter(c => c !== null && c !== undefined);
              if (closes.length < 2) return null;
              const last = closes[closes.length - 1];
              const prevDay = closes[closes.length - 2];
              const weekAgo = closes[Math.max(0, closes.length - 6)];
              const monthAgo = closes[0];
              return {
                symbol: s.symbol,
                name: s.name,
                price: last,
                dayChange: ((last / prevDay) - 1) * 100,
                weekChange: ((last / weekAgo) - 1) * 100,
                monthChange: ((last / monthAgo) - 1) * 100,
              };
            })
        )
      );
      const fetched = results
        .filter(r => r.status === "fulfilled" && r.value !== null)
        .map(r => r.value);
      if (fetched.length > 0) {
        setSectorData(fetched);
        setSectorLastUpdated(new Date());
      }
    } catch (e) { console.warn("Sector data fetch failed:", e); }
    setSectorLoading(false);
  }, []);

  useEffect(() => {
    if (tab !== "intel") return;
    if (sectorData.length === 0) fetchSectorData();
    const interval = setInterval(fetchSectorData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [tab, fetchSectorData, sectorData.length]);

  // Persist price alerts
  useEffect(() => {
    try { localStorage.setItem("swingEdgePriceAlerts", JSON.stringify(priceAlerts)); } catch {}
  }, [priceAlerts]);

  // Persist language
  useEffect(() => {
    try { localStorage.setItem("swingEdgeLang", lang); } catch {}
  }, [lang]);

  // Global live price fetching - fetches for ALL tickers (ribbon + watchlist + open trades + popular)
  const RIBBON_TICKERS = ["NVDA", "AAPL", "TSLA", "MSFT", "META", "AMD", "BTC", "SPY"];
  const fetchLivePrices = useCallback(async () => {
    const openTickers = trades.filter(t => t.status === "OPEN").map(t => t.ticker);
    const watchTickers = watchlistItems.map(w => w.ticker);
    const popularTickers = POPULAR_TICKERS.map(p => p.symbol.replace("-USD", ""));
    const allTickers = [...new Set([...RIBBON_TICKERS, ...openTickers, ...watchTickers, ...popularTickers])];
    if (allTickers.length === 0) return true;
    setPricesLoading(true);
    let ok = false;
    try {
      const priceData = await fetchPrices(allTickers);
      if (Object.keys(priceData).length > 0) {
        ok = true;
        setLivePrices(prev => ({ ...prev, ...priceData }));
        setPricesLastUpdated(new Date());

        // Check price alerts
        Object.entries(priceAlerts).forEach(([ticker, targetPrice]) => {
          const current = priceData[ticker]?.price;
          if (current && targetPrice) {
            if (current >= targetPrice) {
              setAlertNotification({ ticker, price: current, target: targetPrice });
              setPriceAlerts(prev => { const next = { ...prev }; delete next[ticker]; return next; });
              setTimeout(() => setAlertNotification(null), 8000);
            }
          }
        });
      }
    } catch (e) { console.warn("Live prices fetch failed:", e); }
    setPricesLoading(false);
    return ok;
  }, [trades, watchlistItems, priceAlerts]);

  // Market state — drives badge + refresh cadence. Re-evaluated every 30s so the
  // UI keeps up with session transitions (pre-market → open → after-hours → closed).
  const [marketState, setMarketState] = useState(() => getMarketState());
  useEffect(() => {
    const t = setInterval(() => setMarketState(getMarketState()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Fetch prices globally on mount and re-run at an interval tuned to market state:
  //   OPEN   → 15s
  //   PRE/AFTER → 30s
  //   CLOSED → 5 min
  // On failure, retry once after 10 seconds.
  useEffect(() => {
    let cancelled = false;
    let retryTimer = null;

    const run = async () => {
      const ok = await fetchLivePrices();
      if (cancelled) return;
      if (!ok) {
        retryTimer = setTimeout(() => { if (!cancelled) run(); }, 10000);
      }
    };

    run();
    const interval = setInterval(run, getRefreshInterval(marketState));
    return () => {
      cancelled = true;
      clearInterval(interval);
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [fetchLivePrices, marketState]);

  // Watchlist search handler — dynamic Yahoo Finance search with live prices
  const handleWatchlistSearch = useCallback((query) => {
    setWatchlistInput(query.toUpperCase());
    if (watchlistSearchTimeout.current) clearTimeout(watchlistSearchTimeout.current);
    if (query.length < 1) { setWatchlistSearchResults(POPULAR_TICKERS); return; }
    setWatchlistSearching(true);
    watchlistSearchTimeout.current = setTimeout(async () => {
      const results = await searchTickers(query);
      const final = results.length > 0 ? results : POPULAR_TICKERS;
      setWatchlistSearchResults(final);
      setWatchlistSearching(false);
      // Pre-fetch prices for the first few results so each row can show its price
      const topSyms = final.slice(0, 8).map(r => r.symbol.replace("-USD", ""));
      if (topSyms.length > 0) {
        fetchPrices(topSyms).then(priceData => {
          if (Object.keys(priceData).length > 0) {
            setLivePrices(prev => ({ ...prev, ...priceData }));
          }
        });
      }
    }, 300);
  }, []);

  const handleWatchlistFocus = useCallback(() => {
    if (!watchlistInput) {
      setWatchlistSearchResults(POPULAR_TICKERS);
    }
  }, [watchlistInput]);

  const equityCurve = useMemo(() => generateEquityCurve(capital, trades), [trades, capital]);
  const closedTrades = trades.filter(t => t.status === "CLOSED");
  const openTrades   = trades.filter(t => t.status === "OPEN");

  const totalPnL   = closedTrades.reduce((a, t) => a + (calcTradeMetrics(t).pnl || 0), 0);
  const winRate    = closedTrades.length ? closedTrades.filter(t => (calcTradeMetrics(t).pnl || 0) > 0).length / closedTrades.length * 100 : 0;
  const avgR       = closedTrades.length ? closedTrades.reduce((a, t) => a + (calcTradeMetrics(t).rMultiple || 0), 0) / closedTrades.length : 0;

  // ─── JOURNAL PRO: filtered view + stats ─────────────────────────────────────
  const holdTimeDays = (t) => {
    if (!t.date || !t.exitDate) return null;
    try {
      const d1 = new Date(t.date).getTime();
      const d2 = new Date(t.exitDate).getTime();
      if (!d1 || !d2) return null;
      return Math.max(0, Math.round((d2 - d1) / 86400000));
    } catch { return null; }
  };

  const filteredTrades = useMemo(() => {
    const f = journalFilters;
    return trades.filter(tr => {
      if (f.ticker && !String(tr.ticker || "").toUpperCase().includes(f.ticker.toUpperCase())) return false;
      if (f.setup !== "all" && tr.setup !== f.setup) return false;
      if (f.from && tr.date && tr.date < f.from) return false;
      if (f.to && tr.date && tr.date > f.to) return false;
      const { pnl, rMultiple } = calcTradeMetrics(tr);
      if (f.result !== "all") {
        if (tr.status !== "CLOSED") return false;
        if (f.result === "win" && !(pnl > 0)) return false;
        if (f.result === "loss" && !(pnl < 0)) return false;
        if (f.result === "be" && !(pnl === 0)) return false;
      }
      if (f.rMin !== "" && rMultiple < parseFloat(f.rMin)) return false;
      if (f.rMax !== "" && rMultiple > parseFloat(f.rMax)) return false;
      return true;
    });
  }, [trades, journalFilters]);

  const journalStats = useMemo(() => {
    const closed = filteredTrades.filter(t => t.status === "CLOSED");
    if (closed.length === 0) {
      return { total: 0, wins: 0, losses: 0, winRate: 0, avgWin: 0, avgLoss: 0, profitFactor: 0, maxDD: 0, avgHold: 0, totalPnL: 0 };
    }
    const pnls = closed.map(t => calcTradeMetrics(t).pnl || 0);
    const wins = pnls.filter(p => p > 0);
    const losses = pnls.filter(p => p < 0);
    const avgWin = wins.length ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
    const avgLoss = losses.length ? losses.reduce((a, b) => a + b, 0) / losses.length : 0;
    const sumWins = wins.reduce((a, b) => a + b, 0);
    const sumLosses = Math.abs(losses.reduce((a, b) => a + b, 0));
    const profitFactor = sumLosses > 0 ? sumWins / sumLosses : (sumWins > 0 ? Infinity : 0);
    // Max drawdown on running equity from these trades
    let peak = 0, equity = 0, maxDD = 0;
    pnls.forEach(p => { equity += p; if (equity > peak) peak = equity; const dd = peak - equity; if (dd > maxDD) maxDD = dd; });
    const holds = closed.map(holdTimeDays).filter(d => typeof d === "number");
    const avgHold = holds.length ? holds.reduce((a, b) => a + b, 0) / holds.length : 0;
    return {
      total: closed.length,
      wins: wins.length,
      losses: losses.length,
      winRate: (wins.length / closed.length) * 100,
      avgWin, avgLoss,
      profitFactor,
      maxDD,
      avgHold,
      totalPnL: pnls.reduce((a, b) => a + b, 0),
    };
  }, [filteredTrades]);

  const uniqueSetups = useMemo(() => {
    const s = new Set(trades.map(t => t.setup).filter(Boolean));
    return Array.from(s).sort();
  }, [trades]);

  // ─── SWINGEDGE AI REPORTS ──────────────────────────────────────────────────
  // Memoised against the trades reference — the orchestrator also has an
  // internal WeakMap cache so repeated reads are effectively free.
  const aiDNA          = useMemo(() => SwingEdgeAI.getDNA(trades),          [trades]);
  const aiEdges        = useMemo(() => SwingEdgeAI.getEdges(trades),        [trades]);
  const aiRegime       = useMemo(() => SwingEdgeAI.getRegime(trades),       [trades]);
  const aiGrowth       = useMemo(() => SwingEdgeAI.getGrowth(trades),       [trades]);
  const aiEvolution    = useMemo(() => SwingEdgeAI.getEvolution(trades, 6), [trades]);
  const aiGrowthReport = useMemo(() => SwingEdgeAI.getGrowthReport(trades), [trades]);

  // Tilt re-evaluates on a 60s tick so cooldown expiry and new conditions update.
  const [tiltTick, setTiltTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTiltTick(x => x + 1), 60000);
    return () => clearInterval(id);
  }, []);
  const aiTilt = useMemo(() => SwingEdgeAI.checkTilt(trades), [trades, tiltTick]);

  // Live Decision Coach analysis for the new-trade form.
  const aiCoach = useMemo(
    () => SwingEdgeAI.analyzeNewTrade(form, trades),
    [form, trades]
  );

  // ─── CENTRAL EQUITY ENGINE ──────────────────────────────────────────────────
  // Single source of truth: equity = base capital + closed P&L + live open P&L.
  // Reacts automatically whenever any live price updates.
  // Ticker lookup is variant-safe (handles BTC / BTC-USD / BINANCE:BTCUSDT etc).
  const getLivePrice = useCallback((ticker) => {
    if (!ticker) return null;
    const raw = String(ticker).toUpperCase();
    const candidates = [
      raw,
      raw.replace("-USD", ""),
      `${raw}-USD`,
      raw.replace(/^BINANCE:/, "").replace(/USDT$|USD$/, ""),
    ];
    for (const key of candidates) {
      const lp = livePrices[key];
      if (lp && typeof lp.price === "number") return lp;
    }
    return null;
  }, [livePrices]);

  const openPnL = useMemo(() => {
    return openTrades.reduce((sum, t) => {
      const lp = getLivePrice(t.ticker);
      if (!lp) return sum;
      const pnl = t.side === "LONG"
        ? (lp.price - t.entry) * t.shares
        : (t.entry - lp.price) * t.shares;
      return sum + pnl;
    }, 0);
  }, [openTrades, getLivePrice]);

  const curEquity = useMemo(
    () => capital + totalPnL + openPnL,
    [capital, totalPnL, openPnL]
  );

  // Daily P&L calculation
  const dailyPnL = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayClosed = closedTrades.filter(t => t.date === today);
    const closedToday = todayClosed.reduce((s, t) => s + (calcTradeMetrics(t).pnl || 0), 0);
    // Open P&L change today (approximation using current live prices)
    return closedToday + openPnL;
  }, [closedTrades, openPnL]);

  // Win Streak Counter
  const { currentStreak, bestStreak } = useMemo(() => {
    let current = 0;
    let best = 0;
    const sorted = [...closedTrades].sort((a, b) => a.date.localeCompare(b.date));
    for (const t of sorted) {
      const pnl = calcTradeMetrics(t).pnl || 0;
      if (pnl > 0) {
        current++;
        if (current > best) best = current;
      } else {
        current = 0;
      }
    }
    return { currentStreak: current, bestStreak: best };
  }, [closedTrades]);

  // Smart lessons
  const smartLessons = useMemo(() => generateSmartLessons(closedTrades, calcTradeMetrics), [closedTrades]);

  // Top ticker ribbon — fixed 8 tickers updated with live prices
  const TOP_RIBBON = ["NVDA", "AAPL", "TSLA", "MSFT", "META", "AMD", "BTC-USD", "SPY"];
  const tickerTapeItems = useMemo(() => {
    return TOP_RIBBON.map(display => {
      const lookupKey = display.replace("-USD", "");
      const lp = getLivePrice(lookupKey) || getLivePrice(display);
      return {
        ticker: display,
        displayTicker: display === "BTC-USD" ? "BTC" : display,
        changePct: lp ? lp.changePct : 0,
        price: lp ? lp.price : null,
        open: lp?.regularMarketOpen ?? null,
        high: lp?.regularMarketDayHigh ?? null,
        low: lp?.regularMarketDayLow ?? null,
        prevClose: lp?.previousClose ?? null,
      };
    });
  }, [livePrices]);

  useEffect(() => {
    const t = setInterval(() => setTickerIdx(i => (i + 1) % Math.max(tickerTapeItems.length, 1)), 2000);
    return () => clearInterval(t);
  }, [tickerTapeItems.length]);

  useEffect(() => {
    const t = setInterval(() => setPulse(p => !p), 1500);
    return () => clearInterval(t);
  }, []);

  // Derived form calcs
  const entryN  = parseFloat(form.entry)  || 0;
  const stopN   = parseFloat(form.stop)   || 0;
  const targetN = parseFloat(form.target) || 0;
  const riskPerShare = Math.abs(entryN - stopN);
  const posSize      = riskPerShare > 0 ? Math.floor((capital * RISK_PCT) / riskPerShare) : 0;
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
  const azPortfolioRisk = capital > 0 ? (azDollarRisk / capital) * 100 : 0;
  const azPotGain  = azShares * Math.abs(azTarget - azEntry);
  const azRRRatio  = azDollarRisk > 0 ? azPotGain / azDollarRisk : 0;

  // ─── LIVE QUOTE FOR ADD-TRADE FORM ──────────────────────────────────────────
  // When the form is open and a ticker is entered, fetch a live quote from Yahoo
  // and auto-fill Entry Price. Uses a short debounce so rapid typing doesn't
  // spam the API, and respects a user-edited Entry (won't overwrite).
  const fetchFormQuote = useCallback(async (ticker, { force = false } = {}) => {
    if (!ticker) return;
    setFormQuoteLoading(true);
    try {
      const q = await fetchQuote(ticker);
      if (!q) return;
      setFormQuote({ ...q, ticker: ticker.toUpperCase() });
      // Auto-fill Entry Price only if empty (or a manual refresh was requested).
      setForm(f => {
        if (f.ticker.toUpperCase() !== ticker.toUpperCase()) return f;
        if (!force && f.entry) return f;
        return { ...f, entry: String(q.price.toFixed(2)) };
      });
    } finally {
      setFormQuoteLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!showForm) return;
    if (formQuoteTimer.current) clearTimeout(formQuoteTimer.current);
    const ticker = form.ticker.trim();
    if (!ticker) { setFormQuote(null); return; }
    formQuoteTimer.current = setTimeout(() => fetchFormQuote(ticker), 250);
    return () => { if (formQuoteTimer.current) clearTimeout(formQuoteTimer.current); };
  }, [form.ticker, showForm, fetchFormQuote]);

  const handleSubmit = () => {
    if (!form.ticker || !entryN || !stopN) return;
    // Capture the AI coach's prediction so LearningEngine can grade it at close.
    const predictionSnapshot = {
      verdict: aiCoach?.verdict || null,
      confidence: aiCoach?.confidence ?? null,
      channels: {
        setup:   (aiCoach?.insights || []).filter(i => i.text && /setup|breakout|pullback|retest/i.test(i.text.en || ""))
                  .reduce((s, i) => s + (i.weight > 0 ? 1 : i.weight < 0 ? -1 : 0), 0),
        emotion: (aiCoach?.insights || []).filter(i => i.text && /emotion|fomo|confident|fear/i.test(i.text.en || ""))
                  .reduce((s, i) => s + (i.weight > 0 ? 1 : i.weight < 0 ? -1 : 0), 0),
        market:  (aiCoach?.insights || []).filter(i => i.text && /regime|market/i.test(i.text.en || ""))
                  .reduce((s, i) => s + (i.weight > 0 ? 1 : i.weight < 0 ? -1 : 0), 0),
        rr:      (aiCoach?.insights || []).filter(i => i.text && /r\/r|ratio/i.test(i.text.en || ""))
                  .reduce((s, i) => s + (i.weight > 0 ? 1 : i.weight < 0 ? -1 : 0), 0),
        time:    0,
      },
    };

    const newTrade = {
      id: trades.length + 1,
      ticker: form.ticker.toUpperCase(),
      date: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      side: form.side,
      entry: entryN, stop: stopN, target: targetN,
      shares: posSize, status: "OPEN", exit: null,
      setup: form.setup, notes: form.notes,
      marketCondition: form.marketCondition,
      emotionAtEntry: form.emotionAtEntry,
      entryQuality: form.entryQuality,
      tradeImage: form.tradeImagePreview,
      exitReason: null, followedPlan: null, lessonLearned: null, maxFavorable: null, maxAdverse: null,
      _capitalAtEntry: capital,
      _prediction: predictionSnapshot,
    };
    setTrades(prev => [...prev, newTrade]);
    setForm({ ticker: "", side: "LONG", entry: "", stop: "", target: "", setup: "Breakout", notes: "", marketCondition: "Trending Up", emotionAtEntry: "Neutral", entryQuality: 3, tradeImage: null, tradeImagePreview: null });
    setAiAnalysis(null);
    setShowForm(false);
    setTab("journal");
    toast.success(lang === "he" ? `${newTrade.ticker} נוספה ליומן` : `${newTrade.ticker} added to journal`);
  };

  const handleCloseSubmit = () => {
    if (!closingTrade || !closeForm.exit) return;
    const closedTrade = {
      ...closingTrade,
      status: "CLOSED",
      exit: parseFloat(closeForm.exit),
      closedAt: new Date().toISOString(),
      exitReason: closeForm.exitReason,
      followedPlan: closeForm.followedPlan,
      lessonLearned: closeForm.lessonLearned,
      maxFavorable: parseFloat(closeForm.maxFavorable) || null,
      maxAdverse: parseFloat(closeForm.maxAdverse) || null,
    };
    // Close the loop: grade the prediction we made at entry.
    try { SwingEdgeAI.reinforceFromTrade(closedTrade); } catch { /* learning is best-effort */ }
    setTrades(prev => prev.map(t => t.id === closingTrade.id ? closedTrade : t));
    setShowCloseForm(false);
    setClosingTrade(null);
    setCloseForm({ exit: "", exitReason: "Target Hit", followedPlan: true, lessonLearned: "", maxFavorable: "", maxAdverse: "" });
    const { pnl } = calcTradeMetrics(closedTrade);
    if (pnl > 0) toast.success(lang === "he" ? `רווח ${fmt$(Math.round(pnl))} נסגר בהצלחה` : `Closed with profit ${fmt$(Math.round(pnl))}`);
    else if (pnl < 0) toast.error(lang === "he" ? `הפסד ${fmt$(Math.round(pnl))} — נסגר` : `Closed with loss ${fmt$(Math.round(pnl))}`);
    else toast.info(lang === "he" ? "העסקה נסגרה" : "Trade closed");
  };

  const handleDeleteTrade = async (tradeId) => {
    const ok = await confirmDialog({
      title: lang === "he" ? "מחיקת עסקה" : "Delete Trade",
      message: lang === "he"
        ? "האם למחוק עסקה זו? פעולה זו לא ניתנת לביטול."
        : "Delete this trade? This action cannot be undone.",
      confirmText: lang === "he" ? "מחק" : "Delete",
      cancelText: lang === "he" ? "ביטול" : "Cancel",
      danger: true,
    });
    if (ok) {
      setTrades(prev => prev.filter(t => t.id !== tradeId));
      toast.success(lang === "he" ? "העסקה נמחקה" : "Trade deleted");
    }
  };

  const handleEditOpen = (trade) => {
    setEditingTrade(trade);
    setEditForm({
      ticker: trade.ticker,
      side: trade.side,
      entry: String(trade.entry),
      stop: String(trade.stop),
      target: String(trade.target || ""),
      shares: String(trade.shares),
      setup: trade.setup || "Breakout",
      notes: trade.notes || "",
      marketCondition: trade.marketCondition || "Trending Up",
      emotionAtEntry: trade.emotionAtEntry || "Neutral",
      entryQuality: trade.entryQuality || 3,
      status: trade.status,
      exit: trade.exit != null ? String(trade.exit) : "",
      exitReason: trade.exitReason || "Target Hit",
      followedPlan: trade.followedPlan,
      lessonLearned: trade.lessonLearned || "",
      maxFavorable: trade.maxFavorable != null ? String(trade.maxFavorable) : "",
      maxAdverse: trade.maxAdverse != null ? String(trade.maxAdverse) : "",
    });
    setShowEditForm(true);
  };

  const handleEditSubmit = () => {
    if (!editingTrade) return;
    const exitVal = parseFloat(editForm.exit) || null;
    const updated = {
      ...editingTrade,
      ticker: editForm.ticker.toUpperCase(),
      side: editForm.side,
      entry: parseFloat(editForm.entry) || editingTrade.entry,
      stop: parseFloat(editForm.stop) || editingTrade.stop,
      target: parseFloat(editForm.target) || null,
      shares: parseInt(editForm.shares) || editingTrade.shares,
      setup: editForm.setup,
      notes: editForm.notes,
      marketCondition: editForm.marketCondition,
      emotionAtEntry: editForm.emotionAtEntry,
      entryQuality: editForm.entryQuality,
      status: exitVal != null ? "CLOSED" : editForm.status,
      exit: exitVal,
      exitReason: editForm.exitReason,
      followedPlan: editForm.followedPlan,
      lessonLearned: editForm.lessonLearned,
      maxFavorable: parseFloat(editForm.maxFavorable) || null,
      maxAdverse: parseFloat(editForm.maxAdverse) || null,
    };
    setTrades(prev => prev.map(t => t.id === editingTrade.id ? updated : t));
    setShowEditForm(false);
    setEditingTrade(null);
    toast.success(lang === "he" ? "העסקה עודכנה" : "Trade updated");
  };

  // ─── DEMO TRADES LOADER ─────────────────────────────────────────────────
  // Adds the 10 DEMO_TRADES into the journal (skipping any already present),
  // tags each with the logged-in user_id so they are Supabase-ready, and
  // persists to localStorage through the existing setTrades → useEffect flow.
  const handleLoadDemoTrades = async () => {
    const userId = authUser?.id || null;
    const existingIds = new Set(trades.map(t => t.id));
    const stamped = DEMO_TRADES
      .filter(d => !existingIds.has(d.id))
      .map(d => ({
        ...d,
        user_id: userId,
        createdAt: new Date(d.date + "T14:30:00").toISOString(),
        closedAt:  new Date(d.date + "T20:00:00").toISOString(),
        tradeImage: null,
        _prediction: null,
      }));
    if (stamped.length === 0) {
      toast.info(lang === "he" ? "עסקאות הדמו כבר נטענו" : "Demo trades already loaded");
      return;
    }
    setTrades(prev => [...prev, ...stamped]);
    // Best-effort Supabase upsert — silently no-op if the `trades` table
    // hasn't been provisioned yet (keeps the local flow unaffected).
    if (isSupabaseConfigured && supabase && userId) {
      try {
        await supabase.from("trades").upsert(stamped, { onConflict: "id" });
      } catch { /* ignore — local state is still saved */ }
    }
    toast.success(lang === "he" ? `נטענו ${stamped.length} עסקאות דמו` : `Loaded ${stamped.length} demo trades`);
    setTab("journal");
  };

  const handleAddWatchlistTicker = () => {
    const t = watchlistInput.trim().toUpperCase();
    if (!t || watchlistItems.find(i => i.ticker === t)) { setWatchlistInput(""); return; }
    const cryptoMap = { BTC: "BINANCE:BTCUSDT", ETH: "BINANCE:ETHUSDT" };
    const newItem = { ticker: t, price: null, change: null, setup: "Custom", chartSym: cryptoMap[t] || `NASDAQ:${t}` };
    const updated = [...watchlistItems, newItem];
    setWatchlistItems(updated);
    try { localStorage.setItem("swingEdgeWatchlist", JSON.stringify(updated)); } catch {}
    setWatchlistInput("");
  };

  const handleDeleteWatchlistTicker = (ticker) => {
    const updated = watchlistItems.filter(i => i.ticker !== ticker);
    setWatchlistItems(updated);
    try { localStorage.setItem("swingEdgeWatchlist", JSON.stringify(updated)); } catch {}
  };

  const toggleLightMode = () => {
    setLightMode(v => {
      const next = !v;
      try { localStorage.setItem("swingEdgeLightMode", String(next)); } catch {}
      return next;
    });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setForm(f => ({ ...f, tradeImage: file, tradeImagePreview: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const analyzeTradeWithAI = () => {
    setAiLoading(true); setAiAnalysis(null);
    const text = analyzeTradeLocalText({
      entry: form.entry,
      stop: form.stop,
      target: form.target,
      side: form.side,
      capital,
      shares: posSize,
    });
    setAiAnalysis(text);
    setAiLoading(false);
  };

  const handleAnalyzerImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setAnalyzerImage(file); setAnalyzerImagePreview(ev.target.result); };
    reader.readAsDataURL(file);
  };

  const analyzeTradeStandalone = () => {
    if (!analyzerForm.ticker || !azEntry || !azStop) {
      setAnalyzerResult({ error: "⚠️ Fill at least: Ticker, Entry and Stop Loss." });
      return;
    }
    setAnalyzerLoading(true); setAnalyzerResult(null);
    const result = analyzeTradeLocal({
      entry: azEntry,
      stop: azStop,
      target: azTarget,
      side: "LONG",
      capital,
      shares: azShares,
    });
    setAnalyzerResult(result);
    setAnalyzerLoading(false);
  };

  // ─── CHART QUICK ACTIONS ─────────────────────────────────────────────────
  // Uses the local rule engine to suggest a sensible stop (2% below entry for
  // LONG / above for SHORT) and a 2:1 R/R target based on the live chart price.
  // No external AI required. Emotion/notes/lesson fields are intentionally
  // left empty for the trader to fill in.
  const handleChartAiExtract = (target) => {
    setChartAiTarget(target);
    setChartAiLoading(true);

    let ticker = chartSymbol.includes(":") ? chartSymbol.split(":")[1] : chartSymbol;
    ticker = ticker.replace(/USDT$|USD$/, "") || ticker;
    const tickerUpper = ticker.toUpperCase();

    const livePrice = getLivePrice(tickerUpper)?.price ?? null;
    const entry = livePrice != null ? Number(livePrice.toFixed(2)) : null;

    // Local AI: stop 2% below entry, target at 2:1 R/R
    const side = "LONG";
    const stop = entry != null ? Number((entry * 0.98).toFixed(2)) : null;
    const targetPrice = entry != null && stop != null
      ? Number((entry + (entry - stop) * 2).toFixed(2))
      : null;

    const entryStr = entry != null ? String(entry) : "";
    const stopStr = stop != null ? String(stop) : "";
    const targetStr = targetPrice != null ? String(targetPrice) : "";

    if (target === "position") {
      setPosCalc(f => ({
        ...f,
        ticker: tickerUpper,
        capital: f.capital || String(capital),
        risk: f.risk || "1",
        entry: entryStr || f.entry,
        stop: stopStr || f.stop,
      }));
      setTab("position");
    } else if (target === "journal") {
      setForm({
        ticker: tickerUpper,
        side,
        entry: entryStr,
        stop: stopStr,
        target: targetStr,
        setup: "Breakout",
        notes: "",
        marketCondition: "Trending Up",
        emotionAtEntry: "Neutral",
        entryQuality: 3,
        tradeImage: null,
        tradeImagePreview: null,
      });
      setAiAnalysis(null);
      setShowForm(true);
    }

    setTimeout(() => {
      setChartAiLoading(false);
      setChartAiTarget(null);
    }, 250);
  };

  // Auth gate — block app until we know session state
  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] text-slate-300 flex items-center justify-center" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center animate-pulse">
            <Zap size={20} className="text-white" />
          </div>
          <span className="text-xs tracking-widest uppercase text-slate-500">Loading SwingEdge…</span>
        </div>
      </div>
    );
  }

  if (isSupabaseConfigured && !session) {
    return <AuthScreen />;
  }

  if (showOnboarding) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-slate-200 font-sans flex flex-col" data-theme={lightMode ? "light" : "dark"} dir={isRTL ? "rtl" : "ltr"} style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>

      {/* ── BETA WELCOME (first login only) ── */}
      {showBetaWelcome && (
        <BetaWelcome
          userName={authUser?.user_metadata?.full_name || authUser?.user_metadata?.name || userProfile?.name}
          onStart={dismissBetaWelcome}
        />
      )}

      {/* ── iOS INSTALL BANNER ── */}
      <IOSInstallBanner />

      {/* ── PRICE ALERT NOTIFICATION ── */}
      {alertNotification && (
        <div className="fixed top-20 right-6 rtl:right-auto rtl:left-6 z-[60] animate-bounce bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 rounded-xl p-4 shadow-2xl max-w-xs">
          <div className="flex items-center gap-2 mb-1">
            <Bell size={16} className="text-amber-400" />
            <span className="text-sm font-bold text-amber-300">{t.alertTriggered}</span>
          </div>
          <div className="flex items-center gap-2">
            <TickerLogo ticker={alertNotification.ticker} size={20} />
            <span className="font-mono font-bold text-white">{alertNotification.ticker}</span>
            <span className="text-xs text-slate-400">reached ${alertNotification.price.toFixed(2)}</span>
          </div>
          <button onClick={() => setAlertNotification(null)} className="absolute top-2 right-2 rtl:right-auto rtl:left-2 text-slate-500 hover:text-white"><X size={12} /></button>
        </div>
      )}

      {/* ── HEADER ── */}
      <header dir="ltr" className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] bg-[#0d1424]/90 backdrop-blur-md sticky top-0 z-50">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center">
            <Zap size={14} className="text-white" />
          </div>
          <span className="font-bold text-sm tracking-wider text-white">SWING<span className="text-cyan-400">EDGE</span></span>
          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 tracking-widest uppercase">Pro</span>
        </div>

        {/* Ticker Tape — fixed 8 tickers, flash on price change, tooltip on hover */}
        <div className="hidden md:flex items-center gap-3 text-xs font-mono">
          {tickerTapeItems.map((item) => (
            <RibbonTicker key={item.ticker} item={item} />
          ))}
          {pricesLoading && <RefreshCw size={10} className="animate-spin text-slate-600" />}
        </div>

        {/* Status + Profile */}
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-1.5"
            title={pricesLastUpdated ? `${t.lastUpdated}: ${pricesLastUpdated.toLocaleTimeString()}` : t.live}
          >
            {(() => {
              const badge = getMarketStateBadge(marketState);
              return (
                <>
                  <span
                    className="w-2 h-2 rounded-full transition-colors"
                    style={{
                      backgroundColor: badge.color,
                      opacity: marketState === MARKET_STATE.OPEN ? (pulse ? 1 : 0.55) : 0.85,
                    }}
                  />
                  <span
                    className="text-[10px] font-bold tracking-wider whitespace-nowrap"
                    style={{ color: badge.color }}
                  >
                    {badge.emoji} {badge.label}
                  </span>
                </>
              );
            })()}
            {pricesLastUpdated && (
              <span className="text-[9px] text-slate-600 font-mono hidden md:inline">
                {pricesLastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            )}
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-xs text-slate-500">Account</div>
            <div className="text-sm font-bold font-mono text-cyan-400">${curEquity.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
          </div>
          {/* Profile dropdown */}
          <div className="relative" ref={profileRef}>
            <button onClick={() => setShowProfileDropdown(v => !v)}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 flex items-center justify-center hover:border-cyan-500/60 transition">
              <User size={15} className="text-cyan-400" />
            </button>
            {showProfileDropdown && (
              <>
                {/* Backdrop — clicking anywhere outside closes the menu (also catches iPad/mobile taps) */}
                <div
                  className="fixed inset-0 bg-black/40 backdrop-blur-[1px] z-[9998] animate-fade-in"
                  onClick={() => setShowProfileDropdown(false)}
                />
                <div
                  className="w-60 bg-[#0d1424] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-fade-in"
                  style={{
                    position: "fixed",
                    top: 56,
                    right: 16,
                    maxWidth: "calc(100vw - 32px)",
                    zIndex: 9999,
                  }}
                >
                <div className="px-4 py-3 border-b border-white/[0.06] bg-gradient-to-r from-cyan-500/5 to-violet-500/5">
                  <p className="text-xs font-bold text-white truncate">{userProfile?.name || authUser?.user_metadata?.full_name || "Trader"}</p>
                  {authUser?.email && (
                    <p className="text-[10px] text-slate-400 mt-0.5 font-mono truncate">{authUser.email}</p>
                  )}
                  <p className="text-[10px] text-slate-500 mt-0.5 font-mono">${capital.toLocaleString()} portfolio</p>
                </div>
                <div className="p-2 space-y-1">
                  {isAdmin && (
                    <button onClick={() => { setTab("admin"); setShowProfileDropdown(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-amber-300 hover:bg-amber-500/10 hover:text-amber-200 transition text-left border border-amber-500/20 bg-amber-500/5">
                      <Shield size={13} className="text-amber-400" /> Admin Dashboard
                    </button>
                  )}
                  <button onClick={() => { setTab("settings"); setShowProfileDropdown(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-white/5 hover:text-white transition text-left">
                    <Settings size={13} className="text-cyan-400" /> {t.profileAndSettings}
                  </button>
                  <button onClick={() => { setTab("feedback"); setShowProfileDropdown(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-white/5 hover:text-white transition text-left">
                    <MessageCircle size={13} className="text-cyan-400" /> {t.feedback || "Feedback"}
                  </button>
                  <button onClick={() => { toggleLightMode(); setShowProfileDropdown(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-white/5 hover:text-white transition text-left">
                    <span className="text-sm">{lightMode ? "🌙" : "☀️"}</span>
                    {lightMode ? "Dark Mode" : "Light Mode"}
                  </button>
                  {isSupabaseConfigured && session && (
                    <>
                      <div className="my-1 h-px bg-white/[0.06]" />
                      <button onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-rose-300 hover:bg-rose-500/10 hover:text-rose-200 transition text-left">
                        <LogOut size={13} /> התנתקות
                      </button>
                    </>
                  )}
                </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── NAV ── */}
      <nav className="flex items-center gap-0 px-5 border-b border-white/[0.06] bg-[#0d1424]/60 overflow-x-auto">
        {NAV_KEYS.map(({ id, key, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold tracking-wide transition-all whitespace-nowrap border-b-2
              ${tab === id
                ? "text-white border-cyan-400"
                : "text-slate-500 border-transparent hover:text-slate-300 hover:border-slate-600"}`}>
            <Icon size={13} />
            {t[key]}
          </button>
        ))}
      </nav>

      {/* ── CONTENT ── */}
      <main className="flex-1 overflow-auto p-4 md:p-5 space-y-5">

        {/* ══════════════ DASHBOARD ══════════════ */}
        {tab === "dashboard" && (
          <div className="space-y-5 animate-fade-in">
            {/* KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard label={t.accountEquity}  value={`$${curEquity.toLocaleString("en-US", {minimumFractionDigits:0})}`} sub={`${t.startedAt} $${capital.toLocaleString()}`} trend={totalPnL/capital*100} icon={DollarSign} accent="cyan" />
              <StatCard label={t.netPnlClosed} value={fmt$(Math.round(totalPnL))} sub={`${closedTrades.length} ${t.closedTrades}`} trend={totalPnL/capital*100} icon={TrendingUp} accent={totalPnL >= 0 ? "green" : "red"} />
              <StatCard label={t.winRate} value={`${winRate.toFixed(0)}%`} sub={`${closedTrades.filter(t=>(calcTradeMetrics(t).pnl||0)>0).length}W / ${closedTrades.filter(t=>(calcTradeMetrics(t).pnl||0)<0).length}L`} icon={Target} accent="purple" />
              <StatCard label={t.avgRMultiple} value={fmtR(avgR)} sub={t.perClosedTrade} icon={Activity} accent="amber" />
              <StatCard label={t.dailyPnl} value={fmt$(Math.round(dailyPnL))} sub={t.todayTrades} icon={DollarSign} accent={dailyPnL >= 0 ? "green" : "red"} />
              <StatCard label={t.streakCounter} value={<span className="flex items-center gap-1">{currentStreak > 0 && <Flame size={18} className="text-orange-400" />}{currentStreak}</span>} sub={`${t.bestStreak}: ${bestStreak}`} icon={Zap} accent={currentStreak >= 3 ? "green" : "amber"} />
            </div>

            {/* ══ SWINGEDGE AI — DNA · GROWTH · REGIME ══ */}
            {aiTilt && aiTilt.level > 0 && (
              <TiltShield
                tilt={aiTilt}
                lang={lang}
                onDismiss={() => { SwingEdgeAI.acknowledgeWarning("tilt"); setTiltTick(x => x + 1); }}
                onCooldown={(mins) => { SwingEdgeAI.engageCooldown(mins); setTiltTick(x => x + 1); }}
                onClearCooldown={() => { SwingEdgeAI.clearCooldown(); setTiltTick(x => x + 1); }}
              />
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <DNACard dna={aiDNA} lang={lang} />
              <GrowthChart
                evolution={aiEvolution}
                current={aiGrowth.total}
                delta={aiGrowthReport.delta}
                lang={lang}
              />
              <RegimeIndicator regime={aiRegime} lang={lang} />
            </div>

            {/* Top Edge & Anti-Edge */}
            {(aiEdges?.topEdge || aiEdges?.topAntiEdge) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {aiEdges.topEdge && <EdgeCard edge={aiEdges.topEdge} lang={lang} variant="edge" />}
                {aiEdges.topAntiEdge && <EdgeCard edge={aiEdges.topAntiEdge} lang={lang} variant="anti" />}
              </div>
            )}

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
                    <ReferenceLine y={capital} stroke="#475569" strokeDasharray="4 4" />
                    <Tooltip contentStyle={{ background: "#0d1424", border: "1px solid #162032", borderRadius: 8, fontSize: 11 }} formatter={(v) => [`$${v.toLocaleString()}`, "Equity"]} />
                    <Area type="monotone" dataKey="equity" stroke="#06b6d4" strokeWidth={2} fill="url(#eqGrad)" dot={{ fill: "#06b6d4", r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Open trades */}
              <div className="bg-[#0d1424] border border-white/[0.06] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold tracking-widest uppercase text-slate-500">{t.openPositions}</span>
                  <span className="text-xs bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/20">{openTrades.length}</span>
                </div>
                <div className="space-y-2">
                  {openTrades.map(tr => {
                    const lp = getLivePrice(tr.ticker);
                    const currentPrice = lp?.price;
                    const livePnl = currentPrice
                      ? (tr.side === "LONG" ? (currentPrice - tr.entry) * tr.shares : (tr.entry - currentPrice) * tr.shares)
                      : null;
                    const livePnlPct = currentPrice && tr.entry
                      ? (tr.side === "LONG" ? ((currentPrice / tr.entry) - 1) * 100 : ((tr.entry / currentPrice) - 1) * 100)
                      : null;
                    return (
                      <div key={tr.id} className="bg-white/3 rounded-lg p-3 border border-white/[0.06]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <TickerLogo ticker={tr.ticker} size={18} />
                            <span className="font-bold text-sm text-white font-mono">{tr.ticker}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${tr.side === "LONG" ? "bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20" : "bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20"}`}>{tr.side}</span>
                            <button onClick={() => { setShowAlertInput(showAlertInput === tr.id ? null : tr.id); setAlertInputValue(priceAlerts[tr.ticker] ? String(priceAlerts[tr.ticker]) : ""); }}
                              className={`text-[10px] p-0.5 rounded ${priceAlerts[tr.ticker] ? "text-amber-400" : "text-slate-600 hover:text-amber-400"} transition`}
                              title={t.priceAlert}>
                              <Bell size={12} />
                            </button>
                          </div>
                        </div>
                        {showAlertInput === tr.id && (
                          <div className="mt-1.5 flex gap-1">
                            <input type="number" step="0.01" value={alertInputValue} onChange={e => setAlertInputValue(e.target.value)}
                              placeholder={t.setTargetPrice} className="flex-1 bg-white/5 border border-amber-500/20 rounded px-2 py-0.5 text-[10px] text-white font-mono focus:outline-none" />
                            <button onClick={() => { const v = parseFloat(alertInputValue); if (v > 0) { setPriceAlerts(prev => ({...prev, [tr.ticker]: v})); setShowAlertInput(null); } }}
                              className="text-[9px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30">OK</button>
                          </div>
                        )}
                        {priceAlerts[tr.ticker] && showAlertInput !== tr.id && (
                          <div className="mt-1 text-[9px] text-amber-500/70 font-mono flex items-center gap-1">
                            <Bell size={8} /> Alert @ ${priceAlerts[tr.ticker]}
                          </div>
                        )}
                        <div className="mt-1 grid grid-cols-2 gap-x-3 text-[10px] text-slate-500 font-mono">
                          <span>Entry <span className="text-slate-300">${tr.entry}</span></span>
                          <span>Now <span className={currentPrice ? "text-cyan-300 font-bold" : "text-slate-600"}>{currentPrice ? `$${currentPrice.toFixed(2)}` : "..."}</span></span>
                          <span>Stop <span className="text-[#ef4444]">${tr.stop}</span></span>
                          <span>P&L <span className={livePnl !== null ? (livePnl >= 0 ? "text-[#10b981] font-bold" : "text-[#ef4444] font-bold") : "text-slate-600"}>{livePnl !== null ? fmt$(Math.round(livePnl)) : "..."}</span></span>
                        </div>
                        {livePnlPct !== null && (
                          <div className="mt-1.5 h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${livePnl >= 0 ? "bg-gradient-to-r from-[#10b981] to-cyan-500" : "bg-gradient-to-r from-[#ef4444] to-rose-500"}`}
                              style={{ width: `${Math.min(Math.abs(livePnlPct) * 10, 100)}%` }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {openTrades.length === 0 && (
                    <div className="text-center py-4 text-slate-700 text-xs">No open positions</div>
                  )}
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
                          <td className="py-2 pr-4 font-bold text-white font-mono"><div className="flex items-center gap-1.5"><TickerLogo ticker={t.ticker} size={16} />{t.ticker}</div></td>
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

            {/* ══ RISK DASHBOARD ══ */}
            {(() => {
              const MAX_RISK_PCT = 3; // % of capital — adjustable
              const maxRiskDollar = capital * (MAX_RISK_PCT / 100);

              const openRisks = openTrades.map(t => {
                const riskDollar = Math.abs(t.entry - t.stop) * t.shares;
                const riskPct = capital > 0 ? (riskDollar / capital) * 100 : 0;
                const rrRatio = t.target && Math.abs(t.entry - t.stop) > 0
                  ? Math.abs(t.target - t.entry) / Math.abs(t.entry - t.stop)
                  : null;
                return { ...t, riskDollar, riskPct, rrRatio };
              });

              const totalRiskDollar = openRisks.reduce((s, t) => s + t.riskDollar, 0);
              const totalRiskPct = capital > 0 ? (totalRiskDollar / capital) * 100 : 0;
              const usedPct = Math.min((totalRiskPct / MAX_RISK_PCT) * 100, 100);
              const isOverLimit = totalRiskPct > MAX_RISK_PCT;
              const isWarning = totalRiskPct > MAX_RISK_PCT * 0.7;

              const meterColor = isOverLimit
                ? { bar: "bg-[#ef4444]", text: "text-[#ef4444]", border: "border-[#ef4444]/30", bg: "bg-[#ef4444]/8" }
                : isWarning
                ? { bar: "bg-amber-400", text: "text-amber-400", border: "border-amber-400/30", bg: "bg-amber-400/8" }
                : { bar: "bg-[#10b981]", text: "text-[#10b981]", border: "border-[#10b981]/30", bg: "bg-[#10b981]/8" };

              return (
                <div className="space-y-4">
                  {/* Alert banner */}
                  {isOverLimit && (
                    <div className="flex items-center gap-3 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-xl px-4 py-3">
                      <AlertTriangle size={15} className="text-[#ef4444] shrink-0" />
                      <span className="text-xs text-[#ef4444] font-semibold">
                        אזהרה: סיכון כולל פתוח ({totalRiskPct.toFixed(2)}%) חורג ממגבלת {MAX_RISK_PCT}% — שקול לצמצם פוזיציות
                      </span>
                    </div>
                  )}

                  {/* Section header */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold tracking-widest uppercase text-slate-500">Risk Dashboard</span>
                    <div className="flex-1 h-px bg-white/[0.05]" />
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold font-mono ${meterColor.text} ${meterColor.border} ${meterColor.bg}`}>
                      {isOverLimit ? "OVER LIMIT" : isWarning ? "CAUTION" : "SAFE"}
                    </span>
                  </div>

                  {/* KPI cards + meter */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Total open risk */}
                    <div className={`bg-[#0d1424] border rounded-xl p-4 ${meterColor.border}`}>
                      <span className="text-[11px] font-semibold tracking-widest uppercase text-slate-500 block mb-1">סיכון כולל פתוח</span>
                      <span className={`text-2xl font-bold font-mono ${meterColor.text}`}>{totalRiskPct.toFixed(2)}%</span>
                      <span className="text-xs text-slate-500 block mt-0.5 font-mono">${totalRiskDollar.toFixed(2)}</span>
                      <span className="text-[10px] text-slate-600 mt-1 block">{openTrades.length} עסקאות פתוחות</span>
                    </div>

                    {/* Max allowed risk */}
                    <div className="bg-[#0d1424] border border-white/[0.06] rounded-xl p-4">
                      <span className="text-[11px] font-semibold tracking-widest uppercase text-slate-500 block mb-1">מקסימום סיכון מותר</span>
                      <span className="text-2xl font-bold font-mono text-violet-400">{MAX_RISK_PCT.toFixed(1)}%</span>
                      <span className="text-xs text-slate-500 block mt-0.5 font-mono">${maxRiskDollar.toFixed(2)}</span>
                      <span className="text-[10px] text-slate-600 mt-1 block">מתוך ${capital.toLocaleString()} הון</span>
                    </div>

                    {/* Visual risk meter */}
                    <div className="bg-[#0d1424] border border-white/[0.06] rounded-xl p-4">
                      <span className="text-[11px] font-semibold tracking-widest uppercase text-slate-500 block mb-3">מד סיכון</span>
                      <div className="relative">
                        {/* Meter bar background */}
                        <div className="h-4 bg-white/[0.06] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${meterColor.bar}`}
                            style={{ width: `${usedPct}%` }}
                          />
                        </div>
                        {/* Zone markers */}
                        <div className="flex justify-between mt-1.5 text-[9px] text-slate-600 font-mono">
                          <span>0%</span>
                          <span className="text-amber-600/80">70%</span>
                          <span className="text-[#ef4444]/80">100% ({MAX_RISK_PCT}%)</span>
                        </div>
                        {/* Zone lines */}
                        <div className="absolute top-0 left-0 w-full h-4 pointer-events-none">
                          <div className="absolute h-full w-px bg-amber-500/30" style={{ left: "70%" }} />
                        </div>
                      </div>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className={`text-lg font-bold font-mono ${meterColor.text}`}>{usedPct.toFixed(0)}%</span>
                        <span className="text-[10px] text-slate-600">מהמגבלה</span>
                        <span className="ml-auto text-[10px] text-slate-500 font-mono">
                          נותר: ${Math.max(maxRiskDollar - totalRiskDollar, 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Per-trade risk table */}
                  {openRisks.length > 0 && (
                    <div className="bg-[#0d1424] border border-white/[0.06] rounded-xl p-4">
                      <span className="text-xs font-semibold tracking-widest uppercase text-slate-500 block mb-3">סיכון לכל עסקה פתוחה</span>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-slate-600 border-b border-white/[0.06]">
                              {["Ticker", "Side", "Entry", "Stop", "Shares", "Risk $", "Risk %", "R/R", "Bar"].map(h => (
                                <th key={h} className="pb-2 text-left font-semibold tracking-wider pr-4 whitespace-nowrap">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {openRisks.map(t => {
                              const rowColor = t.riskPct > MAX_RISK_PCT
                                ? "text-[#ef4444]"
                                : t.riskPct > MAX_RISK_PCT * 0.5
                                ? "text-amber-400"
                                : "text-[#10b981]";
                              const barColor = t.riskPct > MAX_RISK_PCT
                                ? "bg-[#ef4444]"
                                : t.riskPct > MAX_RISK_PCT * 0.5
                                ? "bg-amber-400"
                                : "bg-[#10b981]";
                              const barWidth = Math.min((t.riskPct / MAX_RISK_PCT) * 100, 100);
                              return (
                                <tr key={t.id} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                                  <td className="py-2 pr-4 font-bold text-white font-mono">{t.ticker}</td>
                                  <td className="py-2 pr-4">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${t.side === "LONG" ? "bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20" : "bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20"}`}>
                                      {t.side}
                                    </span>
                                  </td>
                                  <td className="py-2 pr-4 font-mono text-slate-300">${t.entry}</td>
                                  <td className="py-2 pr-4 font-mono text-[#ef4444]">${t.stop}</td>
                                  <td className="py-2 pr-4 font-mono text-slate-400">{t.shares}</td>
                                  <td className={`py-2 pr-4 font-bold font-mono ${rowColor}`}>${t.riskDollar.toFixed(2)}</td>
                                  <td className={`py-2 pr-4 font-bold font-mono ${rowColor}`}>{t.riskPct.toFixed(2)}%</td>
                                  <td className="py-2 pr-4 font-mono text-slate-400">
                                    {t.rrRatio !== null ? `${t.rrRatio.toFixed(2)}:1` : "—"}
                                  </td>
                                  <td className="py-2 pr-4 w-24">
                                    <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden w-20">
                                      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${barWidth}%` }} />
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* ══════════════ JOURNAL ══════════════ */}
        {tab === "journal" && (
          <div className="space-y-4 animate-fade-in">
            {/* Smart Lessons Section */}
            {smartLessons.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold tracking-widest uppercase text-violet-400">{t.smartLessons}</span>
                  <div className="flex-1 h-px bg-white/[0.05]" />
                  <span className="text-[10px] text-slate-600">{t.lessonsSubtitle}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {smartLessons.map((lesson, i) => (
                    <div key={i} className={`bg-[#0d1424] border rounded-xl p-4 ${
                      lesson.type === "strength" ? "border-[#10b981]/25" :
                      lesson.type === "warning" ? "border-amber-500/25" :
                      lesson.type === "insight" ? "border-cyan-500/25" :
                      "border-violet-500/25"
                    }`}>
                      <div className="flex items-start gap-2 mb-2">
                        <span className="text-lg">💡</span>
                        <div>
                          <h4 className="text-xs font-bold text-white">{lesson.title}</h4>
                          <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{lesson.detail}</p>
                        </div>
                      </div>
                      <div className={`text-[10px] p-2 rounded-lg mt-2 ${
                        lesson.type === "strength" ? "bg-[#10b981]/5 text-[#10b981]" :
                        lesson.type === "warning" ? "bg-amber-500/5 text-amber-400" :
                        lesson.type === "insight" ? "bg-cyan-500/5 text-cyan-400" :
                        "bg-violet-500/5 text-violet-400"
                      }`}>
                        <span className="font-semibold">→</span> {lesson.action}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {smartLessons.length === 0 && closedTrades.length < 2 && (
              <div className="bg-[#0d1424] border border-violet-500/15 rounded-xl p-4 text-center">
                <span className="text-xs text-slate-600">{t.noLessonsYet}</span>
              </div>
            )}

            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-sm font-bold text-white">{t.tradeJournal}</h2>
                <p className="text-xs text-slate-600 mt-0.5">{trades.length} {t.totalEntries} · {openTrades.length} {t.open} · {closedTrades.length} {t.closed}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => setShowJournalFilters(v => !v)}
                  className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg border transition ${showJournalFilters ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-300" : "bg-white/5 border-white/10 text-slate-400 hover:border-cyan-500/30 hover:text-cyan-300"}`}>
                  <Filter size={11} /> {lang === "he" ? "מסננים" : "Filters"}
                </button>
                <button onClick={() => { exportTradesCSV(filteredTrades); toast.success(lang === "he" ? "יוצא כ-CSV" : "CSV exported"); }}
                  className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:border-emerald-500/30 hover:text-emerald-300 transition">
                  <Download size={11} /> CSV
                </button>
                {openTrades.length > 0 && pricesLastUpdated && (
                  <span className="text-[10px] text-slate-700 font-mono hidden md:inline">
                    {lang === "he" ? "עודכן" : "Updated"} {fmtTimeAgo(pricesLastUpdated)}
                  </span>
                )}
                {openTrades.length > 0 && (
                  <button onClick={fetchLivePrices} disabled={pricesLoading}
                    className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-cyan-400 transition disabled:opacity-40 border border-white/[0.06] rounded-lg px-2 py-1">
                    <RefreshCw size={10} className={pricesLoading ? "animate-spin" : ""} />
                    {pricesLoading ? (lang === "he" ? "טוען…" : "Loading…") : (lang === "he" ? "רענן מחירים" : "Refresh")}
                  </button>
                )}
              </div>
            </div>

            {/* ── PRO STATS BAR ── */}
            {closedTrades.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                <div className="bg-[#0d1424] border border-white/[0.06] rounded-lg p-2.5">
                  <div className="text-[9px] uppercase tracking-widest text-slate-600">{lang === "he" ? "סה״כ סגורות" : "Closed"}</div>
                  <div className="text-sm font-bold text-white font-mono mt-0.5">{journalStats.total}</div>
                </div>
                <div className="bg-[#0d1424] border border-white/[0.06] rounded-lg p-2.5">
                  <div className="text-[9px] uppercase tracking-widest text-slate-600">{lang === "he" ? "אחוז הצלחה" : "Win Rate"}</div>
                  <div className="text-sm font-bold font-mono mt-0.5 text-emerald-300">{journalStats.winRate.toFixed(1)}%</div>
                </div>
                <div className="bg-[#0d1424] border border-white/[0.06] rounded-lg p-2.5">
                  <div className="text-[9px] uppercase tracking-widest text-slate-600">{lang === "he" ? "רווח ממוצע" : "Avg Win"}</div>
                  <div className="text-sm font-bold font-mono mt-0.5 text-emerald-400">{fmt$(Math.round(journalStats.avgWin))}</div>
                </div>
                <div className="bg-[#0d1424] border border-white/[0.06] rounded-lg p-2.5">
                  <div className="text-[9px] uppercase tracking-widest text-slate-600">{lang === "he" ? "הפסד ממוצע" : "Avg Loss"}</div>
                  <div className="text-sm font-bold font-mono mt-0.5 text-rose-400">{fmt$(Math.round(journalStats.avgLoss))}</div>
                </div>
                <div className="bg-[#0d1424] border border-white/[0.06] rounded-lg p-2.5">
                  <div className="text-[9px] uppercase tracking-widest text-slate-600">Profit Factor</div>
                  <div className="text-sm font-bold font-mono mt-0.5 text-cyan-300">{isFinite(journalStats.profitFactor) ? journalStats.profitFactor.toFixed(2) : "∞"}</div>
                </div>
                <div className="bg-[#0d1424] border border-white/[0.06] rounded-lg p-2.5">
                  <div className="text-[9px] uppercase tracking-widest text-slate-600">Max DD</div>
                  <div className="text-sm font-bold font-mono mt-0.5 text-rose-300">{fmt$(Math.round(journalStats.maxDD))}</div>
                </div>
                <div className="bg-[#0d1424] border border-white/[0.06] rounded-lg p-2.5">
                  <div className="text-[9px] uppercase tracking-widest text-slate-600">{lang === "he" ? "זמן החזקה" : "Avg Hold"}</div>
                  <div className="text-sm font-bold font-mono mt-0.5 text-violet-300">{journalStats.avgHold.toFixed(1)}d</div>
                </div>
              </div>
            )}

            {/* ── FILTERS PANEL ── */}
            {showJournalFilters && (
              <div className="bg-[#0d1424] border border-cyan-500/20 rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                <div>
                  <label className="text-[9px] uppercase tracking-widest text-slate-600 block mb-1">Ticker</label>
                  <input value={journalFilters.ticker} onChange={e => setJournalFilters(f => ({ ...f, ticker: e.target.value }))}
                    placeholder="NVDA" className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs font-mono text-white placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none" />
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-widest text-slate-600 block mb-1">Setup</label>
                  <select value={journalFilters.setup} onChange={e => setJournalFilters(f => ({ ...f, setup: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:border-cyan-500/50 focus:outline-none">
                    <option value="all">All</option>
                    {uniqueSetups.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-widest text-slate-600 block mb-1">Result</label>
                  <select value={journalFilters.result} onChange={e => setJournalFilters(f => ({ ...f, result: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:border-cyan-500/50 focus:outline-none">
                    <option value="all">All</option>
                    <option value="win">Win</option>
                    <option value="loss">Loss</option>
                    <option value="be">Break Even</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-widest text-slate-600 block mb-1">From</label>
                  <input type="date" value={journalFilters.from} onChange={e => setJournalFilters(f => ({ ...f, from: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:border-cyan-500/50 focus:outline-none" />
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-widest text-slate-600 block mb-1">To</label>
                  <input type="date" value={journalFilters.to} onChange={e => setJournalFilters(f => ({ ...f, to: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:border-cyan-500/50 focus:outline-none" />
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-widest text-slate-600 block mb-1">R Min</label>
                  <input type="number" step="0.1" value={journalFilters.rMin} onChange={e => setJournalFilters(f => ({ ...f, rMin: e.target.value }))}
                    placeholder="-2" className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs font-mono text-white placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none" />
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-widest text-slate-600 block mb-1">R Max</label>
                  <input type="number" step="0.1" value={journalFilters.rMax} onChange={e => setJournalFilters(f => ({ ...f, rMax: e.target.value }))}
                    placeholder="5" className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs font-mono text-white placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none" />
                </div>
                <div className="col-span-2 md:col-span-4 lg:col-span-7 flex justify-end">
                  <button onClick={() => setJournalFilters({ ticker: "", setup: "all", result: "all", from: "", to: "", rMin: "", rMax: "" })}
                    className="text-[10px] px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition">
                    {lang === "he" ? "נקה מסננים" : "Clear Filters"}
                  </button>
                </div>
              </div>
            )}
            {trades.length === 0 ? (
              <div className="bg-[#0d1424] border border-white/[0.06] rounded-2xl p-12 text-center">
                <BookOpen size={36} className="mx-auto text-slate-600 mb-3" />
                <h3 className="text-sm font-bold text-white mb-2">{lang === "he" ? "אין עדיין עסקאות" : "No trades yet"}</h3>
                <p className="text-xs text-slate-500 mb-4">{lang === "he" ? "התחל את היומן שלך — לחץ על הכפתור למטה או הקש N" : "Start journaling — click below or press N"}</p>
                <button onClick={() => setShowForm(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 text-black font-bold text-xs hover:bg-cyan-400 transition">
                  <Plus size={13} /> {lang === "he" ? "עסקה ראשונה" : "Add First Trade"}
                </button>
              </div>
            ) : filteredTrades.length === 0 ? (
              <div className="bg-[#0d1424] border border-white/[0.06] rounded-2xl p-8 text-center">
                <Filter size={28} className="mx-auto text-slate-600 mb-3" />
                <h3 className="text-sm font-bold text-white mb-1">{lang === "he" ? "אין תוצאות למסננים" : "No matching trades"}</h3>
                <p className="text-xs text-slate-500">{lang === "he" ? "נסה לשנות או לנקות את המסננים" : "Try adjusting the filters"}</p>
              </div>
            ) : (
            <div className="overflow-x-auto bg-[#0d1424] border border-white/[0.06] rounded-xl">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-600 border-b border-white/[0.06] text-[10px] tracking-widest uppercase">
                    {["Ticker","Date","Side","Entry","Stop","Target","Shares","מחיר נוכחי","P&L חי","Exit","P&L","R","Hold","Setup","Mkt","Emotion","★","Exit Rsn","Plan","Lesson","Status","Action"].map(h => (
                      <th key={h} className={`p-3 text-left font-semibold whitespace-nowrap ${h==="מחיר נוכחי"||h==="P&L חי" ? "text-cyan-600" : ""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...filteredTrades].reverse().map(t => {
                    const { pnl, rMultiple } = calcTradeMetrics(t);
                    const isOpen = t.status === "OPEN";
                    const win = !isOpen && pnl > 0;
                    return (
                      <tr key={t.id} className={`border-b border-white/[0.04] transition-colors ${!isOpen && win ? "hover:bg-[#10b981]/[0.04]" : !isOpen ? "hover:bg-[#ef4444]/[0.04]" : "hover:bg-white/[0.03]"}`}>
                        <td className="p-3 font-bold text-white font-mono whitespace-nowrap"><div className="flex items-center gap-1.5"><TickerLogo ticker={t.ticker} size={16} />{t.ticker}</div></td>
                        <td className="p-3 text-slate-500 whitespace-nowrap">{t.date}</td>
                        <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${t.side==="LONG"?"bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20":"bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20"}`}>{t.side}</span></td>
                        <td className="p-3 font-mono text-slate-300">${t.entry}</td>
                        <td className="p-3 font-mono text-[#ef4444]">${t.stop}</td>
                        <td className="p-3 font-mono text-[#10b981]">${t.target}</td>
                        <td className="p-3 font-mono text-slate-400">{t.shares}</td>
                        {/* Current Price */}
                        <td className="p-3 font-mono text-xs whitespace-nowrap">
                          {isOpen ? (() => {
                            const cp = getLivePrice(t.ticker)?.price;
                            return cp
                              ? <span className="text-slate-200 font-bold">${cp.toFixed(2)}</span>
                              : pricesLoading
                                ? <span className="text-slate-600 animate-pulse text-[10px]"><RefreshCw size={8} className="inline animate-spin" /></span>
                                : <span className="text-slate-700">–</span>;
                          })() : <span className="text-slate-700">–</span>}
                        </td>
                        {/* Live P&L */}
                        <td className="p-3 font-bold font-mono text-xs whitespace-nowrap">
                          {(() => {
                            const cp = isOpen ? getLivePrice(t.ticker)?.price : null;
                            if (!cp) return <span className="text-slate-700">–</span>;
                            const lp = t.side === "LONG"
                              ? (cp - t.entry) * t.shares
                              : (t.entry - cp) * t.shares;
                            return <span className={lp >= 0 ? "text-[#10b981]" : "text-[#ef4444]"}>{fmt$(Math.round(lp))}</span>;
                          })()}
                        </td>
                        <td className="p-3 font-mono text-slate-300">{t.exit ? `$${t.exit}` : "–"}</td>
                        <td className={`p-3 font-bold font-mono ${isOpen ? "text-slate-500" : win ? "text-[#10b981]" : "text-[#ef4444]"}`}>
                          {isOpen ? "–" : fmt$(Math.round(pnl))}
                        </td>
                        <td className={`p-3 font-bold font-mono text-xs ${isOpen ? "text-slate-500" : rMultiple >= 0 ? "text-cyan-400" : "text-[#ef4444]"}`}>
                          {isOpen ? "–" : fmtR(rMultiple)}
                        </td>
                        <td className="p-3 text-[10px] font-mono text-violet-300 whitespace-nowrap">
                          {(() => {
                            const d = holdTimeDays(t);
                            if (typeof d !== "number") return <span className="text-slate-700">–</span>;
                            return `${d}d`;
                          })()}
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
                          <div className="flex items-center gap-1 whitespace-nowrap">
                            {isOpen && (
                              <button onClick={()=>{setClosingTrade(t);setShowCloseForm(true);}}
                                className="text-[10px] px-2 py-1 rounded bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#ef4444] hover:opacity-80 transition">
                                Close
                              </button>
                            )}
                            <button onClick={() => handleEditOpen(t)}
                              className="text-[10px] px-1.5 py-1 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:opacity-80 transition"
                              title="עריכה">✏️</button>
                            <button onClick={() => handleDeleteTrade(t.id)}
                              className="text-[10px] px-1.5 py-1 rounded bg-slate-500/10 border border-slate-500/20 text-slate-400 hover:text-red-400 hover:border-red-500/30 transition"
                              title="מחיקה">🗑️</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}
          </div>
        )}

        {/* ══════════════ TRADE ANALYZER ══════════════ */}
        {tab === "analyzer" && (
          <div className="space-y-5 animate-fade-in max-w-3xl mx-auto">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2"><FlaskConical size={15} className="text-violet-400" /> Trade Analyzer</h2>
              <p className="text-xs text-slate-600 mt-0.5">Enter trade data to get an instant rule-based analysis (no API key required).</p>
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
                    className="absolute top-2 right-2 rtl:right-auto rtl:left-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-slate-300 hover:text-white">
                    <X size={11} />
                  </button>
                </div>
              )}

              {/* Analyze button */}
              <button onClick={analyzeTradeStandalone} disabled={analyzerLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500/25 to-cyan-500/25 border border-violet-500/35 text-violet-200 text-sm font-bold hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50">
                {analyzerLoading ? <><RefreshCw size={14} className="animate-spin" /> {t.analyzing}</> : <><Cpu size={14} /> {t.analyzeTrade}</>}
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

        {/* ══════════════ POSITION CALCULATOR ══════════════ */}
        {tab === "position" && (() => {
          const capN   = parseFloat(posCalc.capital) || capital;
          const riskN  = parseFloat(posCalc.risk)    || 0;
          const entN   = parseFloat(posCalc.entry)   || 0;
          const stopN  = parseFloat(posCalc.stop)    || 0;

          const riskDollars   = capN * (riskN / 100);
          const riskPerShare  = entN > 0 && stopN > 0 ? Math.abs(entN - stopN) : 0;
          const shares        = riskPerShare > 0 ? Math.floor(riskDollars / riskPerShare) : 0;
          const posValue      = shares * entN;
          const portPct       = capN > 0 ? (posValue / capN) * 100 : 0;

          const hasResult = capN > 0 && entN > 0 && stopN > 0 && riskPerShare > 0;

          const handleCopyToForm = () => {
            setForm(f => ({
              ...f,
              ticker: posCalc.ticker || f.ticker,
              entry: posCalc.entry,
              stop:  posCalc.stop,
              shares: String(shares),
            }));
            setShowForm(true);
            setPosCopied(true);
            setTimeout(() => setPosCopied(false), 2000);
          };

          // Auto-load live price when ticker changes (variant-safe)
          const tickerPrice = posCalc.ticker ? getLivePrice(posCalc.ticker)?.price ?? null : null;

          return (
            <div className="space-y-5 animate-fade-in max-w-2xl mx-auto">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Calculator size={15} className="text-cyan-400" /> {t.positionCalculator}
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">{t.posCalcSubtitle}</p>
              </div>

              {/* Inputs */}
              <div className="bg-[#0d1424] border border-white/[0.06] rounded-xl p-5 space-y-4">
                <span className="text-[10px] font-semibold tracking-widest uppercase text-slate-500">{t.riskParams}</span>

                {/* Ticker field for auto price loading */}
                <div>
                  <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">{t.ticker}</label>
                  <div className="flex gap-2">
                    <input
                      value={posCalc.ticker}
                      onChange={e => {
                        const tk = e.target.value.toUpperCase();
                        setPosCalc(f => ({ ...f, ticker: tk }));
                        // Auto-load live price (variant-safe)
                        const lp = getLivePrice(tk)?.price;
                        if (lp && !posCalc.entry) {
                          setPosCalc(f => ({ ...f, ticker: tk, entry: String(lp) }));
                        }
                      }}
                      placeholder="NVDA"
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none transition font-mono font-bold tracking-wider"
                    />
                    {tickerPrice && (
                      <button onClick={() => setPosCalc(f => ({ ...f, entry: String(tickerPrice) }))}
                        className="text-[10px] px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono hover:bg-cyan-500/20 transition whitespace-nowrap">
                        ${tickerPrice.toFixed(2)} →
                      </button>
                    )}
                  </div>
                  {posCalc.ticker && !tickerPrice && pricesLoading && (
                    <span className="text-[9px] text-slate-600 mt-1 block">{t.loadingPrice}</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1 flex items-center gap-1">
                      <DollarSign size={10} /> {t.portfolioCapital}
                    </label>
                    <input
                      value={posCalc.capital || ""}
                      onChange={e => setPosCalc(f => ({ ...f, capital: e.target.value }))}
                      placeholder={String(capital)}
                      type="number"
                      min="0"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition font-mono"
                    />
                    <span className="text-[9px] text-slate-700 mt-0.5 block font-mono">Auto: ${capital.toLocaleString()}</span>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1 flex items-center gap-1">
                      <Percent size={10} /> {t.riskPercent}
                    </label>
                    <input
                      value={posCalc.risk}
                      onChange={e => setPosCalc(f => ({ ...f, risk: e.target.value }))}
                      placeholder="1"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1 flex items-center gap-1">
                      <ArrowUpRight size={10} className="text-[#10b981]" /> {t.entryPrice}
                    </label>
                    <input
                      value={posCalc.entry}
                      onChange={e => setPosCalc(f => ({ ...f, entry: e.target.value }))}
                      placeholder="150.00"
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full bg-white/5 border border-[#10b981]/20 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-[#10b981]/50 focus:outline-none focus:ring-1 focus:ring-[#10b981]/20 transition font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1 flex items-center gap-1">
                      <ArrowDownRight size={10} className="text-[#ef4444]" /> {t.stopLossPrice}
                    </label>
                    <input
                      value={posCalc.stop}
                      onChange={e => setPosCalc(f => ({ ...f, stop: e.target.value }))}
                      placeholder="145.00"
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full bg-white/5 border border-[#ef4444]/20 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-[#ef4444]/50 focus:outline-none focus:ring-1 focus:ring-[#ef4444]/20 transition font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Results */}
              {hasResult ? (
                <div className="space-y-3">
                  <span className="text-[10px] font-semibold tracking-widest uppercase text-slate-500">תוצאות חישוב</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#0d1424] border border-cyan-500/25 rounded-xl p-4 flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-widest">
                        <Hash size={10} className="text-cyan-400" /> כמות מניות
                      </div>
                      <div className="text-2xl font-bold font-mono text-cyan-400">{shares.toLocaleString()}</div>
                      <div className="text-xs text-slate-600">shares to buy</div>
                    </div>

                    <div className="bg-[#0d1424] border border-[#ef4444]/25 rounded-xl p-4 flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-widest">
                        <AlertTriangle size={10} className="text-[#ef4444]" /> סיכון בדולרים
                      </div>
                      <div className="text-2xl font-bold font-mono text-[#ef4444]">${riskDollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <div className="text-xs text-slate-600">{riskN}% of capital</div>
                    </div>

                    <div className="bg-[#0d1424] border border-[#10b981]/25 rounded-xl p-4 flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-widest">
                        <DollarSign size={10} className="text-[#10b981]" /> גודל פוזיציה
                      </div>
                      <div className="text-2xl font-bold font-mono text-[#10b981]">${posValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <div className="text-xs text-slate-600">{shares} × ${entN.toFixed(2)}</div>
                    </div>

                    <div className="bg-[#0d1424] border border-violet-500/25 rounded-xl p-4 flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-widest">
                        <Percent size={10} className="text-violet-400" /> אחוז מהתיק
                      </div>
                      <div className="text-2xl font-bold font-mono text-violet-400">{portPct.toFixed(1)}%</div>
                      <div className="text-xs text-slate-600">of ${capN.toLocaleString()} portfolio</div>
                    </div>
                  </div>

                  {/* Copy to trade form button */}
                  <button
                    onClick={handleCopyToForm}
                    className="w-full mt-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-500/50"
                  >
                    <Copy size={14} />
                    {posCopied ? "✓ הועתק לטופס עסקה!" : "העתק לטופס עסקה"}
                  </button>
                </div>
              ) : (
                <div className="bg-[#0d1424] border border-white/[0.06] rounded-xl p-8 text-center">
                  <Calculator size={32} className="text-slate-700 mx-auto mb-3" />
                  <p className="text-sm text-slate-600">הכנס הון תיק, מחיר כניסה וסטופ לוס לחישוב אוטומטי</p>
                </div>
              )}
            </div>
          );
        })()}

        {/* ══════════════ ANALYTICS ══════════════ */}
        {tab === "analytics" && (
          <div className="space-y-5 animate-fade-in">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Total Trades"  value={trades.length}     sub="All time"      icon={Layers}    accent="cyan"   />
              <StatCard label="Win Rate"       value={`${winRate.toFixed(1)}%`} sub={`${closedTrades.filter(t=>(calcTradeMetrics(t).pnl||0)>0).length} wins`} icon={CheckCircle} accent="green" />
              <StatCard label="Avg R Multiple" value={fmtR(avgR)}        sub="Closed trades" icon={Activity}  accent="purple" />
              <StatCard label="Total Return"   value={`${(totalPnL/capital*100).toFixed(2)}%`} sub={`$${Math.round(Math.abs(totalPnL)).toLocaleString()} P&L`} icon={TrendingUp} accent={totalPnL>=0?"green":"red"} />
            </div>

            {/* Full Equity Curve */}
            <div className="bg-[#0d1424] border border-white/[0.06] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Equity Curve</h3>
                  <p className="text-xs text-slate-600">Account balance over time · starting capital ${capital.toLocaleString()}</p>
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
                  <ReferenceLine y={capital} stroke="#475569" strokeDasharray="5 5" label={{ value: "Starting Capital", position: "insideTopRight", fontSize: 9, fill: "#475569" }} />
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

            {/* ── P&L by Day of Week ── */}
            {(() => {
              const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
              const dayMap = {};
              closedTrades.forEach(t => {
                const d = new Date(t.date + "T12:00:00").getDay();
                const name = DAY_NAMES[d];
                if (!dayMap[name]) dayMap[name] = { pnl: 0, count: 0 };
                dayMap[name].pnl += calcTradeMetrics(t).pnl || 0;
                dayMap[name].count += 1;
              });
              const data = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday"].map(day => ({
                day: day.slice(0, 3),
                fullDay: day,
                pnl: Math.round(dayMap[day]?.pnl || 0),
                count: dayMap[day]?.count || 0,
              }));
              return (
                <div className="bg-[#0d1424] border border-white/[0.06] rounded-xl p-5">
                  <h3 className="text-sm font-bold text-white mb-1">P&amp;L by Day of Week</h3>
                  <p className="text-xs text-slate-600 mb-4">Total profit/loss per trading day</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" />
                      <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#475569" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#475569" }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                      <Tooltip
                        contentStyle={{ background: "#0d1424", border: "1px solid #162032", borderRadius: 10, fontSize: 11 }}
                        formatter={(v, n, p) => [`${fmt$(v)} · ${p.payload.count} trade${p.payload.count !== 1 ? "s" : ""}`, "P&L"]}
                        labelFormatter={l => `${["Sun","Mon","Tue","Wed","Thu","Fri"].includes(l) ? ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday"][["Sun","Mon","Tue","Wed","Thu","Fri"].indexOf(l)] : l}`}
                      />
                      <ReferenceLine y={0} stroke="#334155" />
                      <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                        {data.map((d, i) => (
                          <Cell key={i} fill={d.pnl >= 0 ? "#10b981" : "#f43f5e"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              );
            })()}

            {/* ── Win Rate by Setup Bar Chart ── */}
            {(() => {
              const SETUPS = ["Breakout","Pullback","Retest","Breakdown"];
              const data = SETUPS.map(setup => {
                const s = closedTrades.filter(t => t.setup === setup);
                const wins = s.filter(t => (calcTradeMetrics(t).pnl || 0) > 0).length;
                const wr = s.length ? Math.round(wins / s.length * 100) : 0;
                return { setup, winRate: wr, count: s.length };
              });
              return (
                <div className="bg-[#0d1424] border border-white/[0.06] rounded-xl p-5">
                  <h3 className="text-sm font-bold text-white mb-1">Win Rate by Setup</h3>
                  <p className="text-xs text-slate-600 mb-4">Success percentage per setup type</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" />
                      <XAxis dataKey="setup" tick={{ fontSize: 10, fill: "#475569" }} tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#475569" }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                      <Tooltip
                        contentStyle={{ background: "#0d1424", border: "1px solid #162032", borderRadius: 10, fontSize: 11 }}
                        formatter={(v, n, p) => [`${v}% · ${p.payload.count} trade${p.payload.count !== 1 ? "s" : ""}`, "Win Rate"]}
                      />
                      <ReferenceLine y={50} stroke="#475569" strokeDasharray="4 4" label={{ value: "50%", position: "insideTopRight", fontSize: 9, fill: "#475569" }} />
                      <Bar dataKey="winRate" radius={[4, 4, 0, 0]}>
                        {data.map((d, i) => (
                          <Cell key={i} fill={d.winRate >= 50 ? "#8b5cf6" : "#64748b"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              );
            })()}

            {/* ── Insight Cards: Best Day / Best Setup / Best Emotion ── */}
            {(() => {
              const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
              // Best Day
              const dayMap = {};
              closedTrades.forEach(t => {
                const d = new Date(t.date + "T12:00:00").getDay();
                const name = DAY_NAMES[d];
                if (!dayMap[name]) dayMap[name] = { pnl: 0, count: 0 };
                dayMap[name].pnl += calcTradeMetrics(t).pnl || 0;
                dayMap[name].count += 1;
              });
              const bestDayEntry = Object.entries(dayMap).sort((a, b) => b[1].pnl - a[1].pnl)[0];

              // Best Setup
              const SETUPS = ["Breakout","Pullback","Retest","Breakdown"];
              const setupStats = SETUPS.map(setup => {
                const s = closedTrades.filter(t => t.setup === setup);
                const wins = s.filter(t => (calcTradeMetrics(t).pnl || 0) > 0).length;
                const wr = s.length ? wins / s.length * 100 : 0;
                return { setup, winRate: wr, count: s.length };
              }).filter(s => s.count > 0).sort((a, b) => b.winRate - a.winRate);
              const bestSetup = setupStats[0];

              // Best Emotion
              const EMOTIONS = ["Confident","Nervous","FOMO","Neutral"];
              const emotionStats = EMOTIONS.map(em => {
                const e = closedTrades.filter(t => t.emotionAtEntry === em);
                const wins = e.filter(t => (calcTradeMetrics(t).pnl || 0) > 0).length;
                const wr = e.length ? wins / e.length * 100 : 0;
                return { emotion: em, winRate: wr, count: e.length };
              }).filter(e => e.count > 0).sort((a, b) => b.winRate - a.winRate);
              const bestEmotion = emotionStats[0];

              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Best Day */}
                  <div className="bg-[#0d1424] border border-emerald-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-semibold tracking-widest uppercase text-emerald-400">Best Day</span>
                    </div>
                    {bestDayEntry ? (
                      <>
                        <div className="text-2xl font-bold text-white font-mono">{bestDayEntry[0]}</div>
                        <div className="text-xs text-slate-500 mt-1">{fmt$(Math.round(bestDayEntry[1].pnl))} · {bestDayEntry[1].count} trade{bestDayEntry[1].count !== 1 ? "s" : ""}</div>
                      </>
                    ) : (
                      <div className="text-sm text-slate-600">Log closed trades to see insights</div>
                    )}
                  </div>

                  {/* Best Setup */}
                  <div className="bg-[#0d1424] border border-violet-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-semibold tracking-widest uppercase text-violet-400">Best Setup</span>
                    </div>
                    {bestSetup ? (
                      <>
                        <div className="text-2xl font-bold text-white font-mono">{bestSetup.setup}</div>
                        <div className="text-xs text-slate-500 mt-1">{bestSetup.winRate.toFixed(0)}% win rate · {bestSetup.count} trade{bestSetup.count !== 1 ? "s" : ""}</div>
                      </>
                    ) : (
                      <div className="text-sm text-slate-600">Log closed trades to see insights</div>
                    )}
                  </div>

                  {/* Best Emotion */}
                  <div className="bg-[#0d1424] border border-amber-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-semibold tracking-widest uppercase text-amber-400">Best Emotion</span>
                    </div>
                    {bestEmotion ? (
                      <>
                        <div className="text-2xl font-bold text-white font-mono">{bestEmotion.emotion}</div>
                        <div className="text-xs text-slate-500 mt-1">{bestEmotion.winRate.toFixed(0)}% win rate · {bestEmotion.count} trade{bestEmotion.count !== 1 ? "s" : ""}</div>
                      </>
                    ) : (
                      <div className="text-sm text-slate-600">Log closed trades to see insights</div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ══════════════ INTEL ══════════════ */}
        {tab === "intel" && (
          <div className="space-y-4 animate-fade-in">

            {/* Quick Ticker Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-semibold tracking-widest uppercase text-slate-600 mr-1">Quick Jump:</span>
              {watchlistItems.slice(0, 7).map(item => {
                const active = chartSymbol === item.chartSym;
                return (
                  <button key={item.ticker} onClick={() => setChartSymbol(item.chartSym)}
                    className={`text-xs font-mono font-bold px-3 py-1.5 rounded-lg border transition ${
                      active
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                        : "bg-white/3 text-slate-400 border-white/[0.06] hover:bg-cyan-500/10 hover:text-cyan-400 hover:border-cyan-500/20"
                    }`}>
                    {item.ticker}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* TradingView Chart */}
              <div className="md:col-span-2 bg-[#0d1424] border border-white/[0.06] rounded-xl overflow-hidden relative" style={{ height: 520 }}>
                <div className="flex flex-col gap-2 px-4 py-3 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold tracking-widest uppercase text-slate-500 shrink-0">Live Chart</span>
                    <div className="flex-1 min-w-[180px]">
                      <TradingViewSearch
                        value={chartSymbol}
                        onPick={(tvSym) => setChartSymbol(tvSym)}
                        livePrices={livePrices}
                        setLivePrices={setLivePrices}
                        placeholder="Search symbol (NVDA, BTC, EURUSD...)"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex gap-1 flex-wrap">
                      {["1m","5m","15m","1H","4H","1D","1W"].map(tf => (
                        <button key={tf} onClick={() => setChartInterval(tf)}
                          className={`text-[10px] px-2 py-1 rounded transition font-mono font-bold ${chartInterval === tf ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-white/5 text-slate-400 border border-transparent hover:bg-cyan-500/10 hover:text-cyan-400"}`}>
                          {tf}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      {[
                        { id: "1", label: "Candles" },
                        { id: "3", label: "Line" },
                        { id: "0", label: "Bars" },
                      ].map(st => (
                        <button key={st.id} onClick={() => setChartStyle(st.id)}
                          className={`text-[10px] px-2 py-1 rounded transition font-semibold ${chartStyle === st.id ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" : "bg-white/5 text-slate-400 border border-transparent hover:bg-violet-500/10 hover:text-violet-300"}`}>
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div ref={tvRef} style={{ height: "calc(100% - 110px)" }} />

                {/* ── Floating AI Trade Buttons ── */}
                <div className="absolute bottom-4 right-4 rtl:right-auto rtl:left-4 z-10 flex flex-col gap-2">
                  <button
                    onClick={() => handleChartAiExtract("position")}
                    disabled={chartAiLoading}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-xl backdrop-blur-md bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border border-cyan-500/40 text-cyan-300 hover:from-cyan-500/30 hover:to-violet-500/30 hover:border-cyan-400/60 hover:text-white disabled:opacity-50"
                  >
                    {chartAiLoading && chartAiTarget === "position" ? (
                      <><RefreshCw size={13} className="animate-spin" /> מחשב...</>
                    ) : (
                      <><Calculator size={13} /> חשב פוזיציה</>
                    )}
                  </button>
                  <button
                    onClick={() => handleChartAiExtract("journal")}
                    disabled={chartAiLoading}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-xl backdrop-blur-md bg-gradient-to-r from-violet-500/20 to-rose-500/20 border border-violet-500/40 text-violet-300 hover:from-violet-500/30 hover:to-rose-500/30 hover:border-violet-400/60 hover:text-white disabled:opacity-50"
                  >
                    {chartAiLoading && chartAiTarget === "journal" ? (
                      <><RefreshCw size={13} className="animate-spin" /> מעבד...</>
                    ) : (
                      <><BookOpen size={13} /> הוסף ליומן</>
                    )}
                  </button>
                </div>
              </div>

              {/* Watchlist */}
              <div className="bg-[#0d1424] border border-white/[0.06] rounded-xl p-4 flex flex-col" style={{ height: 440 }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold tracking-widest uppercase text-slate-500">{t.watchlist}</span>
                  <div className="flex items-center gap-2">
                    {pricesLoading && <RefreshCw size={10} className="animate-spin text-cyan-400" />}
                    <Radio size={12} className="text-cyan-400" />
                  </div>
                </div>
                {/* Add ticker input with autocomplete */}
                <div className="relative mb-3">
                  <div className="flex gap-1.5">
                    <input
                      value={watchlistInput}
                      onChange={e => handleWatchlistSearch(e.target.value)}
                      onFocus={handleWatchlistFocus}
                      onKeyDown={e => { if (e.key === "Enter") { handleAddWatchlistTicker(); setWatchlistSearchResults([]); } }}
                      placeholder={t.addTicker}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none font-mono"
                    />
                    <button onClick={() => { handleAddWatchlistTicker(); setWatchlistSearchResults([]); }}
                      className="px-2.5 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-xs font-bold hover:bg-cyan-500/25 transition">
                      <Plus size={12} />
                    </button>
                  </div>
                  {/* Search autocomplete dropdown */}
                  {watchlistSearchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#0d1424] border border-white/10 rounded-lg shadow-2xl z-20 max-h-64 overflow-y-auto">
                      {!watchlistInput && (
                        <div className="px-3 py-1.5 text-[9px] text-slate-600 uppercase tracking-widest border-b border-white/[0.06] bg-white/3">
                          {t.popularTickers}
                        </div>
                      )}
                      {watchlistSearchResults.map(r => {
                        const cleanSym = r.symbol.replace("-USD", "");
                        const lp = getLivePrice(cleanSym) || getLivePrice(r.symbol);
                        const isCrypto = r.type === "CRYPTOCURRENCY";
                        const chartSym = isCrypto
                          ? `BINANCE:${cleanSym}USDT`
                          : r.type === "INDEX" ? r.symbol
                          : r.type === "CURRENCY" || r.type === "FUTURE" ? r.symbol
                          : `NASDAQ:${r.symbol}`;
                        const setup = isCrypto ? "Crypto" : r.type === "INDEX" ? "Index" : r.type === "ETF" ? "ETF" : r.type === "CURRENCY" ? "Forex" : r.type === "FUTURE" ? "Future" : "Custom";
                        return (
                          <button key={r.symbol + r.exchange} onClick={() => {
                            const tickerKey = isCrypto ? cleanSym : r.symbol;
                            const item = { ticker: tickerKey, price: null, change: null, setup, chartSym };
                            if (!watchlistItems.find(i => i.ticker === tickerKey)) {
                              const updated = [...watchlistItems, item];
                              setWatchlistItems(updated);
                              try { localStorage.setItem("swingEdgeWatchlist", JSON.stringify(updated)); } catch {}
                            }
                            setWatchlistSearchResults([]);
                            setWatchlistInput("");
                          }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5 transition text-left">
                            <TickerLogo ticker={cleanSym} size={16} />
                            <div className="flex flex-col flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-white">{r.symbol}</span>
                                <span className="text-[8px] px-1 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">{r.type}</span>
                              </div>
                              <span className="text-[10px] text-slate-500 truncate">{r.name}</span>
                            </div>
                            <div className="text-right flex flex-col items-end">
                              {lp?.price != null && (
                                <span className="font-mono text-[10px] text-slate-300">${lp.price.toFixed(2)}</span>
                              )}
                              <span className="text-[9px] text-slate-600">{r.exchange}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Sort controls */}
                <div className="flex items-center gap-1 mb-2">
                  <span className="text-[9px] text-slate-600">{t.sortBy}:</span>
                  {[["ticker","A-Z"],["changePct","%"],["price","$"]].map(([key, label]) => (
                    <button key={key} onClick={() => setWatchlistSortBy(key)}
                      className={`text-[9px] px-1.5 py-0.5 rounded ${watchlistSortBy === key ? "bg-cyan-500/20 text-cyan-400" : "text-slate-600 hover:text-slate-400"} transition`}>
                      {label}
                    </button>
                  ))}
                </div>

                <div className="space-y-1.5 overflow-y-auto flex-1">
                  {[...watchlistItems].sort((a, b) => {
                    const lpA = getLivePrice(a.ticker) || {};
                    const lpB = getLivePrice(b.ticker) || {};
                    if (watchlistSortBy === "changePct") return (lpB.changePct || 0) - (lpA.changePct || 0);
                    if (watchlistSortBy === "price") return (lpB.price || 0) - (lpA.price || 0);
                    return a.ticker.localeCompare(b.ticker);
                  }).map(s => {
                    const lp = getLivePrice(s.ticker);
                    const price = lp?.price ?? s.price;
                    const changePct = lp?.changePct ?? s.change ?? 0;
                    return (
                      <div key={s.ticker}
                        className={`flex items-center justify-between p-2 bg-white/3 rounded-lg border transition group ${chartSymbol === s.chartSym ? "border-cyan-500/40 bg-cyan-500/5" : "border-white/[0.06] hover:border-cyan-500/20 hover:bg-cyan-500/3"}`}>
                        <div className="flex items-center gap-1.5 flex-1 cursor-pointer" onClick={() => setChartSymbol(s.chartSym)}>
                          <TickerLogo ticker={s.ticker} size={18} />
                          <div>
                            <div className="font-bold text-[11px] text-white font-mono">{s.ticker}</div>
                            {lp?.volume ? <div className="text-[8px] text-slate-700 font-mono">Vol: {fmtVolume(lp.volume)}</div> : null}
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-1.5">
                          {price != null ? (
                            <div>
                              <div className="text-[11px] font-mono font-bold text-slate-200">${typeof price === 'number' ? price.toFixed(2) : price}</div>
                              <div className={`text-[9px] font-mono font-semibold flex items-center justify-end gap-0.5 ${changePct>=0?"text-[#10b981]":"text-[#ef4444]"}`}>
                                {changePct>=0?<ArrowUpRight size={8}/>:<ArrowDownRight size={8}/>}
                                {changePct>=0?"+":""}{typeof changePct === 'number' ? changePct.toFixed(2) : changePct}%
                              </div>
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-600 font-mono">{pricesLoading ? <RefreshCw size={8} className="animate-spin" /> : "—"}</div>
                          )}
                          <button onClick={() => handleDeleteWatchlistTicker(s.ticker)}
                            className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition p-0.5 rounded"
                            title={t.removeFromList}>
                            <X size={10} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {watchlistItems.length === 0 && (
                    <div className="text-center py-6 text-slate-700 text-xs">
                      <p>{t.listEmpty}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── SECTOR TRENDS ── */}
            <div className="bg-[#0d1424] border border-white/[0.06] rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold tracking-widest uppercase text-slate-500">Sector Trends</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${pulse ? "bg-emerald-400" : "bg-emerald-700"} transition-colors`} />
                  {sectorLastUpdated && (
                    <span className="text-[10px] text-slate-700">Updated {fmtTimeAgo(sectorLastUpdated)}</span>
                  )}
                </div>
                <button onClick={fetchSectorData} disabled={sectorLoading}
                  className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-cyan-400 transition disabled:opacity-40">
                  <RefreshCw size={10} className={sectorLoading ? "animate-spin" : ""} />
                  {sectorLoading ? "Loading…" : "Refresh"}
                </button>
              </div>

              {/* Loading skeleton */}
              {sectorLoading && sectorData.length === 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-20 bg-white/3 rounded-xl border border-white/[0.06] animate-pulse" />
                  ))}
                </div>
              )}

              {sectorData.length > 0 && (() => {
                const sorted = [...sectorData].sort((a, b) => b.dayChange - a.dayChange);
                const hot = sorted.filter(s => s.dayChange > 0);
                const declining = sorted.filter(s => s.dayChange <= 0).reverse();

                const SectorCard = ({ s }) => (
                  <div className={`rounded-xl border p-3 ${s.dayChange >= 0 ? "bg-[#10b981]/5 border-[#10b981]/15" : "bg-[#ef4444]/5 border-[#ef4444]/15"}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-white">{s.name}</span>
                      <span className={`text-[10px] font-mono font-bold ${s.dayChange >= 0 ? "text-[#10b981]" : "text-[#ef4444]"}`}>
                        {s.dayChange >= 0 ? "+" : ""}{s.dayChange.toFixed(2)}%
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mb-1.5">${s.price.toFixed(2)}</div>
                    <div className="flex gap-2 text-[9px] font-mono">
                      <span className={`px-1.5 py-0.5 rounded ${s.weekChange >= 0 ? "bg-[#10b981]/10 text-[#10b981]" : "bg-[#ef4444]/10 text-[#ef4444]"}`}>
                        7d {s.weekChange >= 0 ? "+" : ""}{s.weekChange.toFixed(1)}%
                      </span>
                      <span className={`px-1.5 py-0.5 rounded ${s.monthChange >= 0 ? "bg-[#10b981]/10 text-[#10b981]" : "bg-[#ef4444]/10 text-[#ef4444]"}`}>
                        1m {s.monthChange >= 0 ? "+" : ""}{s.monthChange.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );

                return (
                  <div className="space-y-4">
                    {/* Comparison bar chart */}
                    <div>
                      <p className="text-[10px] font-semibold tracking-widest uppercase text-slate-600 mb-2">Daily % Change — All Sectors</p>
                      <ResponsiveContainer width="100%" height={120}>
                        <BarChart data={sorted} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#64748b" }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fontSize: 9, fill: "#64748b" }} tickLine={false} axisLine={false} tickFormatter={v => `${v.toFixed(1)}%`} />
                          <ReferenceLine y={0} stroke="#334155" strokeWidth={1} />
                          <Tooltip
                            contentStyle={{ background: "#0d1424", border: "1px solid #1e293b", borderRadius: 8, fontSize: 11 }}
                            formatter={(v) => [`${v.toFixed(2)}%`, "Daily Change"]}
                          />
                          <Bar dataKey="dayChange" radius={[3, 3, 0, 0]}>
                            {sorted.map((s, i) => (
                              <Cell key={i} fill={s.dayChange >= 0 ? "#10b981" : "#ef4444"} fillOpacity={0.8} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Hot sectors */}
                    {hot.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp size={12} className="text-[#10b981]" />
                          <span className="text-[10px] font-bold tracking-widest uppercase text-[#10b981]">Hot Now</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {hot.map(s => <SectorCard key={s.symbol} s={s} />)}
                        </div>
                      </div>
                    )}

                    {/* Declining sectors */}
                    {declining.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingDown size={12} className="text-[#ef4444]" />
                          <span className="text-[10px] font-bold tracking-widest uppercase text-[#ef4444]">Declining Now</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {declining.map(s => <SectorCard key={s.symbol} s={s} />)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {!sectorLoading && sectorData.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 gap-2 text-slate-600">
                  <BarChart2 size={24} />
                  <p className="text-xs">No sector data — click Refresh to load</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════ SETTINGS ══════════════ */}
        {tab === "settings" && (() => {
          // ── Tiltmeter: count "Followed Plan = No" this month ──
          const now = new Date();
          const thisMonth = now.getMonth();
          const thisYear = now.getFullYear();
          const tiltCount = trades.filter(t => {
            if (t.followedPlan !== false) return false;
            const d = new Date(t.date + "T12:00:00");
            return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
          }).length;
          const tiltLevel = tiltCount === 0 ? "safe" : tiltCount <= 2 ? "safe" : tiltCount === 3 ? "warning" : "danger";
          const tiltColor = tiltLevel === "safe" ? "#10b981" : tiltLevel === "warning" ? "#f59e0b" : "#ef4444";
          const tiltBg = tiltLevel === "safe" ? "border-emerald-500/25 bg-emerald-500/5" : tiltLevel === "warning" ? "border-amber-500/25 bg-amber-500/5" : "border-red-500/25 bg-red-500/5";
          const tiltPct = Math.min(tiltCount / 6 * 100, 100);

          // ── Playbook: calculate success rate per setup from journal ──
          const calcSetupSuccess = (setupName) => {
            const matched = trades.filter(t => t.setup === setupName && t.status === "CLOSED");
            if (matched.length === 0) return null;
            const wins = matched.filter(t => (calcTradeMetrics(t).pnl || 0) > 0).length;
            return { rate: Math.round(wins / matched.length * 100), count: matched.length };
          };

          const savePlaybook = (updated) => {
            setPlaybookSetups(updated);
            try { localStorage.setItem("swingEdgePlaybook", JSON.stringify(updated)); } catch {}
          };

          const handlePlaybookSubmit = () => {
            if (!playbookForm.name.trim()) return;
            if (editingSetupId !== null) {
              const updated = playbookSetups.map(s => s.id === editingSetupId ? { ...s, name: playbookForm.name, description: playbookForm.description, imagePreview: playbookForm.imagePreview } : s);
              savePlaybook(updated);
            } else {
              const newSetup = { id: Date.now(), name: playbookForm.name, description: playbookForm.description, imagePreview: playbookForm.imagePreview };
              savePlaybook([...playbookSetups, newSetup]);
            }
            setPlaybookForm({ name: "", description: "", imagePreview: null });
            setShowPlaybookForm(false);
            setEditingSetupId(null);
          };

          const handlePlaybookImageUpload = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => setPlaybookForm(f => ({ ...f, imagePreview: ev.target.result }));
            reader.readAsDataURL(file);
          };

          const startEdit = (setup) => {
            setPlaybookForm({ name: setup.name, description: setup.description, imagePreview: setup.imagePreview });
            setEditingSetupId(setup.id);
            setShowPlaybookForm(true);
          };

          const deleteSetup = (id) => {
            savePlaybook(playbookSetups.filter(s => s.id !== id));
          };

          return (
            <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2"><Settings size={15} className="text-cyan-400" /> {t.settings}</h2>
                <p className="text-xs text-slate-600 mt-0.5">{t.playbookAndDiscipline}</p>
              </div>

              {/* ── LANGUAGE SELECTOR ── */}
              <div className="bg-[#0d1424] border border-violet-500/20 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Globe size={16} className="text-violet-400" />
                  <h3 className="text-sm font-bold text-white">{t.language}</h3>
                </div>
                <p className="text-xs text-slate-500 mb-3">{t.languageDesc}</p>
                <select
                  value={lang}
                  onChange={e => setLang(e.target.value)}
                  dir="ltr"
                  className="w-full border border-violet-500/30 rounded-lg px-3 py-2.5 text-sm text-white focus:border-violet-500/60 focus:outline-none transition font-semibold"
                  style={{ background: "#0d1424" }}
                >
                  {LANGUAGES.map(l => (
                    <option key={l.code} value={l.code}>
                      {l.nativeName} — {l.name}{l.rtl ? " (RTL)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* ── PORTFOLIO CAPITAL ── */}
              <div className="bg-[#0d1424] border border-cyan-500/20 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign size={16} className="text-cyan-400" />
                  <h3 className="text-sm font-bold text-white">הון תיק</h3>
                </div>
                <p className="text-xs text-slate-500 mb-3">עדכן את ההון המדויק של תיק ההשקעות שלך. הערך ישפיע על חישובי גודל פוזיציה, סיכון ותשואה באפליקציה.</p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={capitalInput}
                    onChange={e => setCapitalInput(e.target.value)}
                    placeholder={`${capital.toLocaleString()}`}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition font-mono"
                  />
                  <button
                    onClick={() => {
                      const val = parseFloat(capitalInput);
                      if (val > 0) {
                        setCapital(val);
                        setCapitalInput("");
                        try { localStorage.setItem("swingEdgeCapital", String(val)); } catch {}
                      }
                    }}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-bold hover:opacity-90 transition whitespace-nowrap">
                    עדכן הון
                  </button>
                </div>
                <p className="text-[10px] text-slate-600 mt-2">
                  הון נוכחי: <span className="text-cyan-400 font-mono font-bold">${capital.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                </p>
              </div>

              {/* ── DEMO TRADES ── */}
              <div className="bg-[#0d1424] border border-amber-500/20 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <FlaskConical size={16} className="text-amber-400" />
                  <h3 className="text-sm font-bold text-white">Demo Trades</h3>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  טען 10 עסקאות לדוגמה מציאותיות (7 WIN · 2 LOSS · 1 BE) מהשבועיים האחרונים, כולל MAE/MFE, רגש, לקחים וחישובי 1% risk על הון $2,500.
                </p>
                <button
                  onClick={handleLoadDemoTrades}
                  className="w-full py-2.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold hover:opacity-90 transition flex items-center justify-center gap-2">
                  <Download size={12} /> Load Demo Trades
                </button>
                <p className="text-[10px] text-slate-700 mt-2">
                  * העסקאות נשמרות מקומית ומסונכרנות ל-Supabase תחת ה-user_id שלך (אם מוגדר).
                </p>
              </div>

              {/* ── TILTMETER ── */}
              <div className={`bg-[#0d1424] border rounded-xl p-5 ${tiltBg}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Thermometer size={16} style={{ color: tiltColor }} />
                    <h3 className="text-sm font-bold text-white">Tiltmeter — החודש</h3>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold border"
                    style={{ color: tiltColor, borderColor: tiltColor + "40", background: tiltColor + "15" }}>
                    {tiltLevel === "safe" ? "UNDER CONTROL" : tiltLevel === "warning" ? "⚠ WATCH OUT" : "🔴 TILTING"}
                  </span>
                </div>

                {/* Visual gauge */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-slate-500">Followed Plan = No החודש</span>
                    <span className="text-2xl font-bold font-mono" style={{ color: tiltColor }}>{tiltCount}</span>
                  </div>
                  <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${tiltPct}%`, background: `linear-gradient(to right, #10b981, ${tiltColor})` }} />
                  </div>
                  <div className="flex justify-between mt-1 text-[10px] text-slate-700 font-mono">
                    <span>0</span>
                    <span className="text-amber-600">⚠ 3</span>
                    <span className="text-red-600">🔴 6+</span>
                  </div>
                </div>

                {/* Segments row */}
                <div className="flex gap-1.5 mb-4">
                  {[1,2,3,4,5,6].map(i => {
                    const filled = i <= tiltCount;
                    const segColor = i <= 2 ? "#10b981" : i <= 3 ? "#f59e0b" : "#ef4444";
                    return (
                      <div key={i} className="flex-1 h-4 rounded"
                        style={{ background: filled ? segColor : segColor + "20", border: `1px solid ${segColor}40` }} />
                    );
                  })}
                </div>

                {/* Warning banner */}
                {tiltCount > 3 && (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                    <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
                    <span className="text-xs text-red-300">
                      אזהרה: חרגת 3 פעמים מהתוכנית החודש. שקול להפחית סייז עסקה ולחזור לבסיס.
                    </span>
                  </div>
                )}
                {tiltCount === 3 && (
                  <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                    <AlertTriangle size={14} className="text-amber-400 flex-shrink-0" />
                    <span className="text-xs text-amber-300">
                      התראה: הגעת ל-3 חריגות מהתוכנית החודש. עוד אחת — תפנה לאזור האדום.
                    </span>
                  </div>
                )}
                {tiltCount === 0 && (
                  <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                    <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />
                    <span className="text-xs text-emerald-300">מצוין! עקבת אחר התוכנית בכל עסקאות החודש.</span>
                  </div>
                )}

                <p className="text-[10px] text-slate-700 mt-3">* מחושב מעסקאות סגורות בחודש הנוכחי שסומנו כ-Followed Plan = No</p>
              </div>

              {/* ── PERSONAL PLAYBOOK ── */}
              <div className="bg-[#0d1424] border border-white/[0.06] rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <BookMarked size={16} className="text-violet-400" />
                    <h3 className="text-sm font-bold text-white">Personal Playbook</h3>
                  </div>
                  <button onClick={() => { setPlaybookForm({ name: "", description: "", imagePreview: null }); setEditingSetupId(null); setShowPlaybookForm(v => !v); }}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/30 text-violet-400 hover:opacity-90 transition">
                    <Plus size={11} /> הוסף סטאפ
                  </button>
                </div>

                {/* Add/Edit Form */}
                {showPlaybookForm && (
                  <div className="mb-5 bg-white/3 border border-white/10 rounded-xl p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">שם הסטאפ *</label>
                        <input value={playbookForm.name} onChange={e => setPlaybookForm(f => ({ ...f, name: e.target.value }))}
                          placeholder="Breakout, Pullback…" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-violet-500/50 focus:outline-none transition" />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">תמונה (אופציונלי)</label>
                        <label className="flex items-center gap-2 cursor-pointer w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-400 hover:border-violet-500/30 transition">
                          <Eye size={12} />
                          <span>{playbookForm.imagePreview ? "תמונה נטענה ✓" : "העלה תמונה..."}</span>
                          <input type="file" accept="image/*" onChange={handlePlaybookImageUpload} className="hidden" />
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">תיאור</label>
                      <textarea value={playbookForm.description} onChange={e => setPlaybookForm(f => ({ ...f, description: e.target.value }))}
                        placeholder="תנאי כניסה, תנאי יציאה, הערות…" rows={2}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-violet-500/50 focus:outline-none transition resize-none" />
                    </div>
                    {playbookForm.imagePreview && (
                      <div className="relative rounded-lg overflow-hidden border border-white/10 h-24">
                        <img src={playbookForm.imagePreview} alt="Setup" className="w-full h-full object-cover" />
                        <button onClick={() => setPlaybookForm(f => ({ ...f, imagePreview: null }))}
                          className="absolute top-1 right-1 rtl:right-auto rtl:left-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-slate-300 hover:text-white">
                          <X size={10} />
                        </button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button onClick={handlePlaybookSubmit}
                        className="flex-1 py-2 rounded-lg bg-gradient-to-r from-violet-500 to-cyan-500 text-white text-xs font-bold hover:opacity-90 transition">
                        {editingSetupId !== null ? "עדכן סטאפ" : "שמור סטאפ"}
                      </button>
                      <button onClick={() => { setShowPlaybookForm(false); setEditingSetupId(null); }}
                        className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 text-xs hover:border-white/20 transition">
                        ביטול
                      </button>
                    </div>
                  </div>
                )}

                {/* Playbook list */}
                {playbookSetups.length === 0 ? (
                  <div className="text-center py-8 text-slate-600 text-xs">
                    <BookMarked size={28} className="mx-auto mb-2 opacity-20" />
                    <p>אין סטאפים עדיין — לחץ "הוסף סטאפ" כדי להתחיל</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {playbookSetups.map(setup => {
                      const stats = calcSetupSuccess(setup.name);
                      const successColor = stats === null ? "#475569" : stats.rate >= 60 ? "#10b981" : stats.rate >= 40 ? "#f59e0b" : "#ef4444";
                      return (
                        <div key={setup.id} className="bg-white/3 border border-white/[0.06] rounded-xl overflow-hidden hover:border-violet-500/20 transition">
                          {setup.imagePreview && (
                            <div className="h-28 overflow-hidden">
                              <img src={setup.imagePreview} alt={setup.name} className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div className="p-3">
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <span className="text-sm font-bold text-white">{setup.name}</span>
                              <div className="flex gap-1">
                                <button onClick={() => startEdit(setup)}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-500 hover:text-cyan-400 hover:border-cyan-500/20 transition">
                                  ✎
                                </button>
                                <button onClick={() => deleteSetup(setup.id)}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-500 hover:text-red-400 hover:border-red-500/20 transition">
                                  <Trash2 size={10} />
                                </button>
                              </div>
                            </div>
                            {setup.description && (
                              <p className="text-[11px] text-slate-500 mb-2 leading-relaxed">{setup.description}</p>
                            )}
                            {/* Auto success rate from journal */}
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all"
                                  style={{ width: stats ? `${stats.rate}%` : "0%", background: successColor }} />
                              </div>
                              <span className="text-[10px] font-mono font-bold whitespace-nowrap" style={{ color: successColor }}>
                                {stats ? `${stats.rate}% (${stats.count} עסקאות)` : "אין נתונים ביומן"}
                              </span>
                            </div>
                            <p className="text-[9px] text-slate-700 mt-1">אחוז הצלחה מחושב אוטומטית מהיומן</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── DATA EXPORT ── */}
              <div className="bg-[#0d1424] border border-white/[0.06] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Download size={16} className="text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">ייצוא נתונים</h3>
                </div>
                <p className="text-xs text-slate-500 mb-5">ייצא את יומן המסחר שלך או צור דוח ביצועים חודשי מפורט.</p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {/* CSV Export */}
                  <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                        <Download size={14} className="text-emerald-400" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">יומן מסחר — CSV</div>
                        <div className="text-[10px] text-slate-600">{trades.length} עסקאות</div>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
                      כל העסקאות כולל Entry, Stop, Target, P&L, R-Multiple, רגש, לקחים ועוד.
                    </p>
                    <button
                      onClick={() => exportTradesCSV(trades)}
                      className="w-full py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition flex items-center justify-center gap-1.5">
                      <Download size={12} /> הורד CSV
                    </button>
                  </div>

                  {/* PDF Report */}
                  <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
                        <FileText size={14} className="text-cyan-400" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">דוח ביצועים חודשי — PDF</div>
                        <div className="text-[10px] text-slate-600">{new Date().toLocaleString("en-US",{month:"long",year:"numeric"})}</div>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
                      KPIs, גרף עקומת הון, טבלת עסקאות חודשית ולקחים שנרשמו.
                    </p>
                    <button
                      onClick={() => exportMonthlyPDF(trades, capital)}
                      className="w-full py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 text-xs font-bold hover:bg-cyan-500/20 transition flex items-center justify-center gap-1.5">
                      <FileText size={12} /> צור דוח PDF
                    </button>
                  </div>
                </div>

                <p className="text-[10px] text-slate-700 mt-3">
                  * דוח ה-PDF נפתח בטאב חדש — לחץ על "Save as PDF" בתוך הדוח כדי לשמור.
                </p>
              </div>

            </div>
          );
        })()}

        {/* ══════════════ FEEDBACK ══════════════ */}
        {tab === "feedback" && (
          <FeedbackTab user={authUser} />
        )}

        {/* ══════════════ ADMIN (niveven183@gmail.com only) ══════════════ */}
        {tab === "admin" && (
          isAdmin ? (
            <AdminPanel />
          ) : (
            <div className="flex items-center justify-center py-20">
              <div className="max-w-md text-center bg-[#0d1424] border border-rose-500/30 rounded-2xl p-8 shadow-2xl">
                <Shield size={32} className="text-rose-400 mx-auto mb-3" />
                <h2 className="text-lg font-bold text-white mb-2">Access Denied</h2>
                <p className="text-xs text-slate-400 mb-4">This area is restricted to administrators only.</p>
                <button onClick={() => setTab("dashboard")}
                  className="px-4 py-2 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-xs font-bold hover:bg-cyan-500/25 transition">
                  Back to Dashboard
                </button>
              </div>
            </div>
          )
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

              {/* Live quote badge + Open/High/Low/Pre/After */}
              {form.ticker && (() => {
                const badge = getMarketStateBadge(formQuote?.marketState || marketState);
                const q = formQuote;
                const marketOpen = (formQuote?.marketState || marketState) === MARKET_STATE.OPEN;
                return (
                  <div className="bg-white/3 border border-white/[0.06] rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full border"
                          style={{ color: badge.color, borderColor: badge.color + "40", background: badge.color + "15" }}
                        >
                          {badge.emoji} {marketOpen ? "LIVE" : q ? "LAST CLOSE" : badge.label}
                        </span>
                        {q?.price != null && (
                          <span className="text-sm font-mono font-bold text-white">${q.price.toFixed(2)}</span>
                        )}
                        {q?.changePct != null && (
                          <span className={`text-[11px] font-mono ${q.changePct >= 0 ? "text-[#10b981]" : "text-[#ef4444]"}`}>
                            {q.changePct >= 0 ? "+" : ""}{q.changePct.toFixed(2)}%
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => fetchFormQuote(form.ticker, { force: true })}
                        disabled={formQuoteLoading}
                        title="Refresh price"
                        className="text-slate-400 hover:text-cyan-400 transition p-1 rounded hover:bg-white/5 disabled:opacity-50"
                      >
                        <RefreshCw size={12} className={formQuoteLoading ? "animate-spin" : ""} />
                      </button>
                    </div>
                    <div className="grid grid-cols-5 gap-1 text-[9px] text-slate-500">
                      <div className="text-center">
                        <div className="uppercase tracking-wider">Open</div>
                        <div className="font-mono text-slate-300">{q?.regularMarketOpen != null ? q.regularMarketOpen.toFixed(2) : "—"}</div>
                      </div>
                      <div className="text-center">
                        <div className="uppercase tracking-wider">High</div>
                        <div className="font-mono text-[#10b981]">{q?.regularMarketDayHigh != null ? q.regularMarketDayHigh.toFixed(2) : "—"}</div>
                      </div>
                      <div className="text-center">
                        <div className="uppercase tracking-wider">Low</div>
                        <div className="font-mono text-[#ef4444]">{q?.regularMarketDayLow != null ? q.regularMarketDayLow.toFixed(2) : "—"}</div>
                      </div>
                      <div className="text-center">
                        <div className="uppercase tracking-wider">Pre</div>
                        <div className="font-mono text-amber-400">{q?.preMarketPrice != null ? q.preMarketPrice.toFixed(2) : "—"}</div>
                      </div>
                      <div className="text-center">
                        <div className="uppercase tracking-wider">After</div>
                        <div className="font-mono text-orange-400">{q?.postMarketPrice != null ? q.postMarketPrice.toFixed(2) : "—"}</div>
                      </div>
                    </div>
                  </div>
                );
              })()}

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

              {/* Live Decision Coach — analyses the trade as you type */}
              <DecisionCoachPanel coaching={aiCoach} lang={lang} />

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
                    className="absolute top-1 right-1 rtl:right-auto rtl:left-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-slate-300 hover:text-white">
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

              {/* Local Analysis button */}
              <button onClick={analyzeTradeWithAI} disabled={aiLoading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-500/20 to-cyan-500/20 border border-violet-500/30 text-violet-300 text-sm font-bold hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50">
                {aiLoading ? <><RefreshCw size={13} className="animate-spin" /> {t.analyzing}</> : <><Cpu size={13} /> {t.analyzeTrade}</>}
              </button>

              {/* Local Analysis result */}
              {aiAnalysis && (
                <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-3 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                  <div className="flex items-center gap-1 mb-2 text-violet-400 font-semibold text-[10px] uppercase tracking-wider">
                    <Cpu size={11} /> {t.localAnalysis}
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

      {/* ── EDIT TRADE MODAL ── */}
      {showEditForm && editingTrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#0d1424] border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] bg-gradient-to-r from-cyan-500/5 to-violet-500/5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">✏️ עריכת עסקה — <span className="text-cyan-400 font-mono">{editingTrade.ticker}</span></span>
              </div>
              <button onClick={() => { setShowEditForm(false); setEditingTrade(null); }} className="text-slate-600 hover:text-slate-300 transition">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">Ticker</label>
                  <input value={editForm.ticker} onChange={e => setEditForm(f => ({ ...f, ticker: e.target.value.toUpperCase() }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none transition font-mono font-bold" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">Direction</label>
                  <div className="flex gap-2">
                    {["LONG","SHORT"].map(s => (
                      <button key={s} onClick={() => setEditForm(f => ({ ...f, side: s }))}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition border ${editForm.side===s?(s==="LONG"?"bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30":"bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/30"):"bg-white/3 text-slate-500 border-white/10 hover:border-white/20"}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[["Entry","entry","text-white"],["Stop Loss","stop","text-[#ef4444]"],["Target","target","text-[#10b981]"]].map(([label,key,cls]) => (
                  <div key={key}>
                    <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">{label}</label>
                    <input value={editForm[key]} onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                      placeholder="0.00" className={`w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none transition font-mono ${cls}`} />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">Shares</label>
                  <input value={editForm.shares} onChange={e => setEditForm(f => ({ ...f, shares: e.target.value }))} type="number" min="0"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none transition font-mono" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">Setup Type</label>
                  <select value={editForm.setup} onChange={e => setEditForm(f => ({ ...f, setup: e.target.value }))}
                    className="w-full border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none transition appearance-none" style={{background:"#0d1424"}}>
                    {["Breakout","Pullback","Support Bounce","Resistance Break","Other"].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">Market Condition</label>
                  <select value={editForm.marketCondition} onChange={e => setEditForm(f => ({ ...f, marketCondition: e.target.value }))}
                    className="w-full border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none transition appearance-none" style={{background:"#0d1424"}}>
                    {["Trending Up","Trending Down","Sideways","Volatile"].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">Emotion at Entry</label>
                  <select value={editForm.emotionAtEntry} onChange={e => setEditForm(f => ({ ...f, emotionAtEntry: e.target.value }))}
                    className="w-full border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none transition appearance-none" style={{background:"#0d1424"}}>
                    {["Confident","Nervous","FOMO","Neutral"].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">Entry Quality</label>
                <div className="flex items-center gap-1 mt-1">
                  {[1,2,3,4,5].map(star => (
                    <button key={star} type="button" onClick={() => setEditForm(f => ({ ...f, entryQuality: star }))}
                      className={`text-xl transition-transform hover:scale-110 ${editForm.entryQuality >= star ? "text-amber-400" : "text-slate-700"}`}>★</button>
                  ))}
                  <span className="text-[10px] text-slate-600 ml-1">{editForm.entryQuality}/5</span>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">Notes</label>
                <input value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Trade thesis..." className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none transition" />
              </div>
              {/* Exit fields */}
              <div className="border-t border-white/[0.06] pt-4">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3">שדות סגירה (אם נסגרה)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">Exit Price</label>
                    <input value={editForm.exit} onChange={e => setEditForm(f => ({ ...f, exit: e.target.value }))}
                      placeholder="0.00" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-[#10b981] placeholder-slate-600 focus:border-emerald-500/50 focus:outline-none transition font-mono" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">Exit Reason</label>
                    <select value={editForm.exitReason} onChange={e => setEditForm(f => ({ ...f, exitReason: e.target.value }))}
                      className="w-full border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none transition appearance-none" style={{background:"#0d1424"}}>
                      {["Stop Loss","Target Hit","Chart Read","Fear","Other"].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">MFE</label>
                    <input value={editForm.maxFavorable} onChange={e => setEditForm(f => ({ ...f, maxFavorable: e.target.value }))}
                      placeholder="Highest price" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-[#10b981] placeholder-slate-600 focus:outline-none transition font-mono" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">MAE</label>
                    <input value={editForm.maxAdverse} onChange={e => setEditForm(f => ({ ...f, maxAdverse: e.target.value }))}
                      placeholder="Lowest price" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-[#ef4444] placeholder-slate-600 focus:outline-none transition font-mono" />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">Followed Plan?</label>
                  <div className="flex gap-2">
                    {[true, false].map(val => (
                      <button key={String(val)} onClick={() => setEditForm(f => ({ ...f, followedPlan: val }))}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition border ${editForm.followedPlan===val?(val?"bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30":"bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/30"):"bg-white/3 text-slate-500 border-white/10 hover:border-white/20"}`}>
                        {val ? "✓ Yes" : "✗ No"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-3">
                  <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">Lesson Learned</label>
                  <input value={editForm.lessonLearned} onChange={e => setEditForm(f => ({ ...f, lessonLearned: e.target.value }))}
                    placeholder="One sentence takeaway..." className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-violet-500/50 focus:outline-none transition" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={handleEditSubmit}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-white text-sm font-bold hover:opacity-90 transition">
                  שמור שינויים →
                </button>
                <button onClick={() => { setShowEditForm(false); setEditingTrade(null); }}
                  className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-sm hover:text-white hover:border-white/20 transition">
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FLOATING NEW TRADE BUTTON ── */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-6 right-6 rtl:right-auto rtl:left-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 text-white shadow-2xl shadow-cyan-500/25 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
        title="New Trade"
      >
        <Plus size={24} />
      </button>

      {/* ── FOOTER STATUS BAR ── */}
      <footer className="flex items-center justify-between px-5 py-2 border-t border-white/[0.06] bg-[#0a0f1e] text-[10px] text-slate-700 font-mono">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1"><span className={`w-1.5 h-1.5 rounded-full ${pulse?"bg-emerald-500":"bg-emerald-800"} transition-colors`}/> {t.marketOpen}</span>
          <span>{t.capital}: ${curEquity.toLocaleString("en-US", {minimumFractionDigits: 2})}</span>
          <span>{t.riskPerTradeFooter}</span>
        </div>
        <div className="flex items-center gap-4">
          <span>{t.trades}: {trades.length}</span>
          <span>{t.open}: {openTrades.length}</span>
          <span>SwingEdge Pro v2.0</span>
        </div>
      </footer>
    </div>
  );
}
