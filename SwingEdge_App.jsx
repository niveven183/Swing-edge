import { useState, useEffect, useCallback, useMemo, useRef, useId, memo, lazy, Suspense, Fragment } from "react";
import OnboardingScreen from "./src/components/OnboardingScreen.jsx";
import AuthScreen from "./src/components/AuthScreen.jsx";
import Logo from "./src/components/Logo.jsx";
import HelpModal from "./src/components/HelpModal.jsx";
import PrivacyModal from "./src/components/PrivacyModal.jsx";
import ChartGuideModal from "./src/components/ChartGuideModal.jsx";
import BillingModal from "./src/components/BillingModal.jsx";
import BetaWelcome from "./src/components/BetaWelcome.jsx";
import OnboardingTour from "./src/components/OnboardingTour.jsx";
import FeedbackTab from "./src/components/FeedbackTab.jsx";
import IOSInstallBanner from "./src/components/IOSInstallBanner.jsx";
// Admin-only, self-contained, and off the normal tab flow → lazy-loaded so its
// bundle (incl. recharts) is fetched only when an admin opens the Admin tab.
function lazyWithRetry(importFn) {
  return lazy(() =>
    importFn().catch((err) => {
      const isChunkError =
        /Failed to fetch dynamically imported module/i.test(err?.message || "") ||
        err?.name === "ChunkLoadError";
      if (!isChunkError) throw err;

      const flagKey = "chunk-reloaded-adminpanel";
      if (sessionStorage.getItem(flagKey)) {
        throw err;
      }
      sessionStorage.setItem(flagKey, "1");
      window.location.reload();
      return new Promise(() => {});
    })
  );
}
const AdminPanel = lazyWithRetry(() => import("./src/components/AdminPanel.jsx"));
import EditTradeModal from "./src/components/EditTradeModal.jsx";
import ResetAllModal from "./src/components/ResetAllModal.jsx";
import ChangePasswordModal from "./src/components/ChangePasswordModal.jsx";
import { useTheme } from "./src/contexts/ThemeContext.jsx";
import TradingViewSearch from "./src/components/TradingViewSearch.jsx";
import TickerLogo from "./src/components/TickerLogo.jsx";
import MobileTradeCard from "./src/components/MobileTradeCard.jsx";
import { TVTickerTape } from "./src/components/TradingViewWidgets.jsx";
import { useToast, useConfirm } from "./src/components/ToastProvider.jsx";
import { supabase, isSupabaseConfigured, tradeForSupabase } from "./src/supabaseClient.js";
import { calcTradeMetrics, fmt$, fmtR, formatPct, formatReturnPct, qstars, priceBasedRR, inferSide, validateTradeInputs, DEFAULT_CAPITAL, holdDays } from "./src/utils.js";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell,
  ScatterChart, Scatter
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
  Shield, Filter, Save, BarChart3, ChevronDown, HelpCircle, Lock,
  CreditCard, Smartphone, Wrench, Sun, Moon, Monitor, KeyRound, ExternalLink, RotateCcw, Pencil,
  Users, GraduationCap, UserPlus, NotebookPen, CalendarCheck
} from "lucide-react";
import { getTranslations, LANGUAGES, isRTLLang, nTrades, labelFor } from "./src/i18n.js";
import {
  fetchPrices, fmtVolume, fmtMarketCap, searchTickers,
  fetchQuote, fetchEarnings, getMarketState, getMarketStateBadge, getRefreshInterval, MARKET_STATE,
  fetchMarketOverview, getOverviewRefreshInterval, MARKET_OVERVIEW,
} from "./src/priceService.js";
import { POPULAR_TICKERS as STATIC_TICKERS, getTickerMeta, searchTickers as searchStaticTickers } from "./src/data/tickers.js";
import { SwingEdgeAI } from "./src/intelligence/SwingEdgeAI.js";
import { calculateTradeDNA } from "./src/intelligence/core/TradeDNA.js";
import { dayLabel } from "./src/intelligence/utils/statisticalModels.js";
import {
  DNACard, EdgeCard, DecisionCoachPanel, TiltShield, GrowthChart, RegimeIndicator, PatternTags,
} from "./src/intelligence/ui/IntelligenceUI.jsx";
import { useTradingStats } from "./src/hooks/useTradingStats.js";
import InfoTooltip from "./src/components/ui/InfoTooltip.jsx";
import TermTooltip from "./src/components/ui/TermTooltip.jsx";
import SmartSelect from "./src/components/ui/SmartSelect.jsx";
import useModalA11y from "./src/hooks/useModalA11y.js";
import { getTradeSelectProps, CATEGORY_TOOLTIP, EMOTION_VALUES } from "./src/data/tradeOptions.jsx";
import { TRADING_TOOLTIPS, resolveSetupKey } from "./src/data/tooltips.js";
import { getSetupTooltip } from "./src/intelligence/knowledgeGlue.js";
import { TradeCalendar } from "./src/components/TradeCalendar.jsx";
import { AdaptiveLessons } from "./src/intelligence/core/AdaptiveLessons.js";
import GrowthPredictor from "./src/components/GrowthPredictor.jsx";
import MonthlyReportTab from "./src/components/MonthlyReportTab.jsx";
import MonthlyReportModal from "./src/components/MonthlyReportModal.jsx";
import NotebookTab from "./src/components/NotebookTab.jsx";
import WeeklyReviewTab from "./src/components/WeeklyReviewTab.jsx";
import { generateMonthlyReport, findBestMonth } from "./src/intelligence/core/MonthlyReport.js";
// "?" beside a mapped setup tag — canonical name/definition/coach line. Returns
// null for unmapped / "Other" / empty setups, so the tag stays plain (as before).
function SetupTagTip({ setup, isRTL }) {
  const st = getSetupTooltip(setup);
  if (!st) return null;
  const dir = isRTL ? 'rtl' : 'ltr';
  return (
    <InfoTooltip label={isRTL ? `מידע על ${st.name}` : `More info: ${st.name}`}>
      <div dir={dir} style={{ direction: dir, textAlign: 'start' }}>
        <div className="font-bold text-emerald-600 dark:text-emerald-400 mb-1.5 text-[13px]">{st.name}</div>
        {st.definition && <div className="whitespace-pre-line mb-2">{st.definition}</div>}
        {st.coachLine && <div className="whitespace-pre-line text-slate-600 dark:text-slate-300">{st.coachLine}</div>}
      </div>
    </InfoTooltip>
  );
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const MOCK_TRADES = [];

// ─── TRADE DATA SANITIZER ────────────────────────────────────────────────────
// Cleans legacy localStorage entries: maps Hive/SIM setup codes to friendly
// names, normalizes invalid emotions, strips SIM- ticker prefix, and flags
// demo trades.
function cleanTrades(trades) {
  const SETUP_MAP = {
    'Hive-S1_premarket': 'Gap and Go',
    'Hive-S2_open': 'ORB Breakout',
    'Hive-S3_midday': 'Bull Flag',
    'Hive-S4_close': 'Power Hour Break',
    'Hive-S5_postmarket': 'Earnings Gap Play',
    'Hive-setup': 'Breakout',
    'Hive-Earnings Gap Play': 'Earnings Gap Play',
    'Hive-Overnight Reversal': 'Overnight Reversal',
    'Hive-MOC Fade': 'MOC Fade',
    'Hive-Power Hour Break': 'Power Hour Break',
    'Hive-Gap and Go': 'Gap and Go',
    'Hive-Overnight Hold': 'Overnight Hold',
    'SIM-PREMARKET': 'Gap and Go',
    'SIM-OPEN': 'ORB Breakout',
    'SIM-MIDDAY': 'Bull Flag',
    'SIM-CLOSE': 'Power Hour Break',
    'SIM-POSTMARKET': 'Earnings Gap Play',
    'SIM-SETUPTEST': 'Breakout',
    '50 EMA Bounce': 'EMA Bounce 50',
    'Revenge Trade': 'Range Breakout'
  };
  const VALID_EMOTIONS = EMOTION_VALUES;
  if (!Array.isArray(trades)) return trades;
  return trades.map(t => {
    const isSimTicker = typeof t.ticker === 'string' && t.ticker.startsWith('SIM-');
    const isHiveSetup = typeof t.setup === 'string' && t.setup.startsWith('Hive-');
    return {
      ...t,
      ticker: isSimTicker ? t.ticker.replace('SIM-', '') : t.ticker,
      setup: SETUP_MAP[t.setup] || t.setup,
      emotionAtEntry: VALID_EMOTIONS.includes(t.emotionAtEntry) ? t.emotionAtEntry : 'Neutral',
      // Supabase stores followedPlan as text → reads return "true"/"false".
      // Normalize to boolean so every `=== true` consumer works. "Partially"/null pass through.
      followedPlan:
        t.followedPlan === true  || t.followedPlan === "true"  ? true  :
        t.followedPlan === false || t.followedPlan === "false" ? false :
        t.followedPlan,
      isDemo: t.isDemo || isSimTicker || isHiveSetup || false,
    };
  });
}

function purgeInvalidTrades(trades) {
  const FAKE_TICKERS = [
    'PREMARKET','CLOSE','OPEN','MIDDAY',
    'POSTMARKET','SETUPTEST'
  ];
  const VALID_MARKETS_MAP = {
    'Trend': 'Trending Up',
    'Unknown': 'Sideways',
    'Mixed': 'Volatile'
  };
  if (!Array.isArray(trades)) return trades;
  return trades
    .filter(t => !FAKE_TICKERS.includes(t.ticker))
    .map(t => ({
      ...t,
      marketCondition: VALID_MARKETS_MAP[t.marketCondition] || t.marketCondition
    }));
}

// ─── DEMO TRADES (loaded via Settings/Journal → "Load Demo Trades") ───────
// 30 trades · ~22 WIN · ~8 LOSS · Win rate ~73% · Mar 18 – Apr 24, 2026.
// maxFavorable/maxAdverse = delta values (not absolute prices).
// isDemo:true on each object — used for filtering real vs demo stats.
const DEMO_TRADES = [
  // שבוע 1: 18-22 מרץ 2026
  {
    id: "demo-1", ticker: "NVDA", side: "LONG", date: "2026-03-18",
    entry: 164.50, stop: 161.20, target: 172.00, exit: 171.30, shares: 14,
    status: "CLOSED", setup: "Higher Low", marketCondition: "Trending Up",
    emotionAtEntry: "Confident", entryQuality: 9, followedPlan: true,
    exitReason: "Hit Target",
    notes: "NVDA יצר Higher Low ב-$164.27, פריצה עם volume גבוה. RSI עלה מ-38 ל-52.",
    lessonLearned: "HL מעל תחתית קודמת = סיגנל חזק. הרי-טסט הראשון של reversal הכי משתלם.",
    maxFavorable: 6.80, maxAdverse: -1.20, _capitalAtEntry: 2500, isDemo: true,
  },
  {
    id: "demo-2", ticker: "AAPL", side: "LONG", date: "2026-03-19",
    entry: 218.50, stop: 215.20, target: 226.00, exit: 225.80, shares: 11,
    status: "CLOSED", setup: "Breakout", marketCondition: "Trending Up",
    emotionAtEntry: "Calm", entryQuality: 8, followedPlan: true,
    exitReason: "Hit Target",
    notes: "AAPL פריצת קונסולידציה 4 ימים. Volume +120% מהממוצע, סגירה מעל $218.50.",
    lessonLearned: "Breakouts עם volume confirmation = הסטאפ הכי חזק. לחכות לסגירת 15m מעל הרמה.",
    maxFavorable: 7.30, maxAdverse: -0.80, _capitalAtEntry: 2595, isDemo: true,
  },
  {
    id: "demo-3", ticker: "TSLA", side: "LONG", date: "2026-03-20",
    entry: 381.30, stop: 374.50, target: 398.00, exit: 374.50, shares: 6,
    status: "CLOSED", setup: "Failed Breakout", marketCondition: "Sideways",
    emotionAtEntry: "FOMO", entryQuality: 4, followedPlan: false,
    exitReason: "Stop Loss",
    notes: "ניסיתי breakout ב-$381 על news. נכנסתי בלי לחכות לאישור volume, שוק choppy.",
    lessonLearned: "FOMO + שוק sideways = הפסד בטוח. לא להיכנס על news בלי setup ברור.",
    maxFavorable: 1.20, maxAdverse: -6.80, _capitalAtEntry: 2675, isDemo: true,
  },
  {
    id: "demo-4", ticker: "BTC-USD", side: "LONG", date: "2026-03-22",
    entry: 70250, stop: 68500, target: 73500, exit: 73100, shares: 0.035,
    status: "CLOSED", setup: "Higher Low", marketCondition: "Sideways",
    emotionAtEntry: "Patient", entryQuality: 8, followedPlan: true,
    exitReason: "Hit Target",
    notes: "BTC עשה HL ב-$68,800 מעל LL הקודם. פריצה של $70K עם volume גבוה, RSI ב-55.",
    lessonLearned: "BTC על HL בולט עם volume = הזדמנות מצוינת אפילו בשוק sideways.",
    maxFavorable: 2850, maxAdverse: -420, _capitalAtEntry: 2634, isDemo: true,
  },
  // שבוע 2: 25-29 מרץ 2026
  {
    id: "demo-5", ticker: "META", side: "LONG", date: "2026-03-25",
    entry: 612.00, stop: 605.00, target: 628.00, exit: 626.50, shares: 4,
    status: "CLOSED", setup: "EMA Bounce 50", marketCondition: "Trending Up",
    emotionAtEntry: "Neutral", entryQuality: 7, followedPlan: true,
    exitReason: "Hit Target",
    notes: "META נגעה ב-50 EMA בדיוק, hammer candle ב-1H. RSI ב-45 מתאושש.",
    lessonLearned: "EMA bounces עובדים מצוין כשהטרנד הראשי חזק. ה-50 EMA היא תמיכה דינמית.",
    maxFavorable: 14.50, maxAdverse: -2.10, _capitalAtEntry: 2733, isDemo: true,
  },
  {
    id: "demo-6", ticker: "AMD", side: "LONG", date: "2026-03-26",
    entry: 165.40, stop: 161.50, target: 175.00, exit: 174.20, shares: 13,
    status: "CLOSED", setup: "Cup and Handle", marketCondition: "Trending Up",
    emotionAtEntry: "Confident", entryQuality: 10, followedPlan: true,
    exitReason: "Hit Target",
    notes: "AMD Cup and Handle מושלמת — Cup של 5 שבועות, Handle של 4 ימים. פריצת rim עם volume +180%.",
    lessonLearned: "Cup and Handle = תבנית הכי אמינה. הסבלנות לחכות ל-handle pullback השתלמה.",
    maxFavorable: 8.80, maxAdverse: -1.50, _capitalAtEntry: 2791, isDemo: true,
  },
  {
    id: "demo-7", ticker: "SPY", side: "LONG", date: "2026-03-27",
    entry: 588.50, stop: 585.20, target: 595.00, exit: 588.80, shares: 4,
    status: "CLOSED", setup: "Range Breakout", marketCondition: "Sideways",
    emotionAtEntry: "Hesitant", entryQuality: 5, followedPlan: "Partially",
    exitReason: "Manual Exit",
    notes: "Breakout ב-$588 אחרי 3 ימי דשדוש. Volume חלש, שוק ניטרלי.",
    lessonLearned: "אם אני מהסס בכניסה — סימן שלא צריך להיכנס. סגרתי בזמן לפני שיהפוך ל-loss.",
    maxFavorable: 2.10, maxAdverse: -1.80, _capitalAtEntry: 2905, isDemo: true,
  },
  {
    id: "demo-8", ticker: "MSFT", side: "LONG", date: "2026-03-28",
    entry: 415.80, stop: 410.50, target: 430.00, exit: 429.20, shares: 5,
    status: "CLOSED", setup: "Pullback to 20 EMA", marketCondition: "Trending Up",
    emotionAtEntry: "Calm", entryQuality: 9, followedPlan: true,
    exitReason: "Hit Target",
    notes: "MSFT פולבק נקי ל-20 EMA ב-$415.80, RSI עלה מ-42 ל-48, hammer candle ב-1H.",
    lessonLearned: "MSFT + 20 EMA = הסטאפ הכי אמין שלי בלארג קאפ. תמיד לחכות לאישור.",
    maxFavorable: 13.40, maxAdverse: -1.20, _capitalAtEntry: 2906, isDemo: true,
  },
  // שבוע 3: 1-5 אפריל 2026
  {
    id: "demo-9", ticker: "ETH-USD", side: "LONG", date: "2026-04-01",
    entry: 3450, stop: 3360, target: 3650, exit: 3360, shares: 0.65,
    status: "CLOSED", setup: "Range Breakout", marketCondition: "Volatile",
    emotionAtEntry: "Angry", entryQuality: 2, followedPlan: false,
    exitReason: "Stop Loss",
    notes: "ניסיתי להחזיר הפסד TSLA. נכנסתי ל-ETH בלי setup ברור — revenge trade קלאסי.",
    lessonLearned: "Revenge trading = הפסד מובטח. אחרי הפסד — הפסקה של שעה לפחות.",
    maxFavorable: 45, maxAdverse: -90, _capitalAtEntry: 2973, isDemo: true,
  },
  {
    id: "demo-10", ticker: "NVDA", side: "LONG", date: "2026-04-02",
    entry: 175.40, stop: 171.30, target: 185.00, exit: 184.20, shares: 14,
    status: "CLOSED", setup: "Pullback to 20 EMA", marketCondition: "Trending Up",
    emotionAtEntry: "Confident", entryQuality: 9, followedPlan: true,
    exitReason: "Hit Target",
    notes: "NVDA פולבק נקי ל-20 EMA. RSI עלה מ-42 ל-52, wick rejection ב-$171.38 ב-4H.",
    lessonLearned: "סבלנות עם setup נקי משתלמת. לא רדפתי, חיכיתי לרי-טסט מדויק.",
    maxFavorable: 8.80, maxAdverse: -1.60, _capitalAtEntry: 2915, isDemo: true,
  },
  {
    id: "demo-11", ticker: "TSLA", side: "SHORT", date: "2026-04-03",
    entry: 388.50, stop: 395.00, target: 372.00, exit: 374.20, shares: 6,
    status: "CLOSED", setup: "Failed Breakout", marketCondition: "Trending Down",
    emotionAtEntry: "Patient", entryQuality: 8, followedPlan: true,
    exitReason: "Hit Target",
    notes: "TSLA כשל בפריצה של $395 (resistance). Short entry ב-$388.50 עם stop מעל high.",
    lessonLearned: "Failed breakouts עובדים מצוין בכיוון ההפוך. השוק כבר היה חלש.",
    maxFavorable: -14.30, maxAdverse: 3.20, _capitalAtEntry: 3038, isDemo: true,
  },
  {
    id: "demo-12", ticker: "QQQ", side: "LONG", date: "2026-04-04",
    entry: 490.20, stop: 485.50, target: 501.00, exit: 485.50, shares: 3,
    status: "CLOSED", setup: "Breakout", marketCondition: "Volatile",
    emotionAtEntry: "FOMO", entryQuality: 3, followedPlan: false,
    exitReason: "Stop Loss",
    notes: "נכנסתי ל-QQQ breakout בשוק volatile. Volume לא אישר, שוק היה choppy.",
    lessonLearned: "Breakouts בשוק volatile ללא volume = false breakout. לבדוק VIX לפני entry.",
    maxFavorable: 1.20, maxAdverse: -4.70, _capitalAtEntry: 3124, isDemo: true,
  },
  {
    id: "demo-13", ticker: "AAPL", side: "LONG", date: "2026-04-07",
    entry: 235.40, stop: 231.20, target: 244.00, exit: 243.20, shares: 12,
    status: "CLOSED", setup: "Pullback to 20 EMA", marketCondition: "Trending Up",
    emotionAtEntry: "Confident", entryQuality: 9, followedPlan: true,
    exitReason: "Hit Target",
    notes: "AAPL פולבק ל-20 EMA ב-$235. Volume נמוך על הפולבק — מוכרים מיצו כוח.",
    lessonLearned: "Volume נמוך על pullback = מוכרים חלשים. כניסה עם RSI מ-45 ל-52.",
    maxFavorable: 7.80, maxAdverse: -1.30, _capitalAtEntry: 3110, isDemo: true,
  },
  {
    id: "demo-14", ticker: "AMD", side: "LONG", date: "2026-04-08",
    entry: 195.80, stop: 191.50, target: 206.00, exit: 205.20, shares: 12,
    status: "CLOSED", setup: "Higher Low", marketCondition: "Trending Up",
    emotionAtEntry: "Calm", entryQuality: 8, followedPlan: true,
    exitReason: "Hit Target",
    notes: "AMD Higher Low ב-$194.80. Technicals מתיישרים, MA stack תקין.",
    lessonLearned: "AMD מגיב טוב ל-HL בטרנד עולה. להמתין לאישור ב-1H לפני כניסה.",
    maxFavorable: 9.40, maxAdverse: -1.80, _capitalAtEntry: 3215, isDemo: true,
  },
  {
    id: "demo-15", ticker: "MSFT", side: "LONG", date: "2026-04-09",
    entry: 418.20, stop: 413.50, target: 430.00, exit: 418.80, shares: 5,
    status: "CLOSED", setup: "EMA Bounce 50", marketCondition: "Sideways",
    emotionAtEntry: "Neutral", entryQuality: 6, followedPlan: "Partially",
    exitReason: "Manual Exit",
    notes: "MSFT bounce מ-50 EMA אבל שוק sideways. יצאתי מוקדם בפרופיט קטן.",
    lessonLearned: "EMA bounces בשוק sideways = פחות אמינים. לקחת רווח קטן ולא להיות חמדן.",
    maxFavorable: 3.20, maxAdverse: -2.10, _capitalAtEntry: 3326, isDemo: true,
  },
  {
    id: "demo-16", ticker: "NVDA", side: "SHORT", date: "2026-04-10",
    entry: 181.50, stop: 186.00, target: 172.00, exit: 172.80, shares: 13,
    status: "CLOSED", setup: "Trend Continuation", marketCondition: "Trending Down",
    emotionAtEntry: "Confident", entryQuality: 9, followedPlan: true,
    exitReason: "Hit Target",
    notes: "NVDA שבר תמיכה ב-$182. Trend continuation קצר — short עם momentum.",
    lessonLearned: "Shorts בטרנד יורד = אותה לוגיקה כמו longs בטרנד עולה. לא לפחד.",
    maxFavorable: -8.70, maxAdverse: 2.10, _capitalAtEntry: 3329, isDemo: true,
  },
  {
    id: "demo-17", ticker: "META", side: "LONG", date: "2026-04-13",
    entry: 632.00, stop: 625.50, target: 648.00, exit: 647.20, shares: 4,
    status: "CLOSED", setup: "Cup and Handle", marketCondition: "Trending Up",
    emotionAtEntry: "Patient", entryQuality: 10, followedPlan: true,
    exitReason: "Hit Target",
    notes: "META Cup and Handle קלאסית. Handle pullback ל-$628, פריצת rim ב-$632.",
    lessonLearned: "מ-meta למדתי שהתבנית הזו צריכה זמן. הסבלנות שילמה.",
    maxFavorable: 15.20, maxAdverse: -1.80, _capitalAtEntry: 3440, isDemo: true,
  },
  {
    id: "demo-18", ticker: "BTC-USD", side: "LONG", date: "2026-04-14",
    entry: 74500, stop: 72800, target: 78000, exit: 73200, shares: 0.032,
    status: "CLOSED", setup: "Range Breakout", marketCondition: "Volatile",
    emotionAtEntry: "Hesitant", entryQuality: 4, followedPlan: "Partially",
    exitReason: "Stop Loss",
    notes: "BTC breakout ב-$74.5K אבל crypto volatile. יצאתי ב-partial loss.",
    lessonLearned: "Crypto volatile + hesitant = combination גרועה. לסחור עם conviction.",
    maxFavorable: 800, maxAdverse: -1300, _capitalAtEntry: 3500, isDemo: true,
  },
  {
    id: "demo-19", ticker: "TSLA", side: "LONG", date: "2026-04-16",
    entry: 420.00, stop: 414.50, target: 434.00, exit: 414.50, shares: 7,
    status: "CLOSED", setup: "Breakout", marketCondition: "Volatile",
    emotionAtEntry: "FOMO", entryQuality: 3, followedPlan: false,
    exitReason: "Stop Loss",
    notes: "TSLA ניסה breakout ב-$420 אבל rejected. FOMO כניסה בלי אישור.",
    lessonLearned: "TSLA volatile + FOMO = שילוב מסוכן. להמתין תמיד לאישור volume.",
    maxFavorable: 2.50, maxAdverse: -5.50, _capitalAtEntry: 3458, isDemo: true,
  },
  {
    id: "demo-20", ticker: "AAPL", side: "LONG", date: "2026-04-18",
    entry: 268.50, stop: 264.20, target: 278.00, exit: 277.30, shares: 9,
    status: "CLOSED", setup: "Pullback to 20 EMA", marketCondition: "Trending Up",
    emotionAtEntry: "Patient", entryQuality: 9, followedPlan: true,
    exitReason: "Hit Target",
    notes: "AAPL pullback ל-20 EMA אחרי 12 ימי עלייה. Volume נמוך על הפולבק, RSI ב-48.",
    lessonLearned: "Pullbacks לAAPL ב-20 EMA = entries איכותיים. הסבלנות חיונית.",
    maxFavorable: 8.80, maxAdverse: -1.50, _capitalAtEntry: 3415, isDemo: true,
  },
  {
    id: "demo-21", ticker: "AMD", side: "LONG", date: "2026-04-19",
    entry: 290.40, stop: 285.00, target: 305.00, exit: 303.50, shares: 7,
    status: "CLOSED", setup: "EMA Bounce 50", marketCondition: "Trending Up",
    emotionAtEntry: "Calm", entryQuality: 8, followedPlan: true,
    exitReason: "Hit Target",
    notes: "AMD bounce מ-50 EMA ב-$290 אחרי 3 ימי דחיסה. RSI ב-50, volume סביר.",
    lessonLearned: "AMD מגיב יפה ל-50 EMA. סבלנות עם הסטאפים הקלאסיים.",
    maxFavorable: 12.60, maxAdverse: -2.30, _capitalAtEntry: 3494, isDemo: true,
  },
  {
    id: "demo-22", ticker: "META", side: "LONG", date: "2026-04-22",
    entry: 622.00, stop: 615.50, target: 638.00, exit: 615.50, shares: 4,
    status: "CLOSED", setup: "Breakout", marketCondition: "Trending Down",
    emotionAtEntry: "FOMO", entryQuality: 4, followedPlan: false,
    exitReason: "Stop Loss",
    notes: "ניסיתי breakout ב-$622 אבל השוק נחלש. Bull trap קלאסי.",
    lessonLearned: "Breakouts בשוק יורד = bull traps. לבדוק כיוון השוק לפני כל entry.",
    maxFavorable: 1.80, maxAdverse: -6.50, _capitalAtEntry: 3585, isDemo: true,
  },
  {
    id: "demo-23", ticker: "NVDA", side: "LONG", date: "2026-04-23",
    entry: 199.80, stop: 196.50, target: 208.00, exit: 207.20, shares: 12,
    status: "CLOSED", setup: "Pullback to 20 EMA", marketCondition: "Trending Up",
    emotionAtEntry: "Confident", entryQuality: 10, followedPlan: true,
    exitReason: "Hit Target",
    notes: "NVDA pullback ל-20 EMA ב-$199.80 עם hammer. Volume נמוך על הפולבק.",
    lessonLearned: "NVDA + 20 EMA + Trending Up = setup מנצח. הסטאפ הכי רווחי שלי.",
    maxFavorable: 7.40, maxAdverse: -1.20, _capitalAtEntry: 3559, isDemo: true,
  },
  {
    id: "demo-24", ticker: "MSFT", side: "LONG", date: "2026-04-23",
    entry: 424.20, stop: 419.50, target: 436.00, exit: 434.80, shares: 5,
    status: "CLOSED", setup: "Post Earnings Strength", marketCondition: "Trending Up",
    emotionAtEntry: "Confident", entryQuality: 9, followedPlan: true,
    exitReason: "Hit Target",
    notes: "MSFT אחרי דוחות חזקים — beat EPS ב-12%. Gap up + hold above $424.",
    lessonLearned: "Post-earnings עם beat גדול = momentum trade מנצח. לא להחמיץ.",
    maxFavorable: 11.80, maxAdverse: -1.60, _capitalAtEntry: 3647, isDemo: true,
  },
  {
    id: "demo-25", ticker: "AMD", side: "LONG", date: "2026-04-24",
    entry: 305.00, stop: 300.50, target: 315.00, exit: 313.20, shares: 7,
    status: "CLOSED", setup: "Trend Continuation", marketCondition: "Trending Up",
    emotionAtEntry: "Patient", entryQuality: 9, followedPlan: true,
    exitReason: "Hit Target",
    notes: "AMD trend continuation אחרי הרמת רף. Volume תקין, MA stack מושלם.",
    lessonLearned: "AMD בטרנד חזק = עקבי. לא לחפש כניסות אגרסיביות, פשוט לעקוב.",
    maxFavorable: 8.20, maxAdverse: -1.80, _capitalAtEntry: 3701, isDemo: true,
  },
  {
    id: "demo-26", ticker: "BTC-USD", side: "LONG", date: "2026-04-24",
    entry: 76200, stop: 74500, target: 79500, exit: 78850, shares: 0.030,
    status: "CLOSED", setup: "Pullback to 20 EMA", marketCondition: "Trending Up",
    emotionAtEntry: "Patient", entryQuality: 8, followedPlan: true,
    exitReason: "Hit Target",
    notes: "BTC pullback ל-20 EMA ב-$76.2K. Volume על הכניסה +200%.",
    lessonLearned: "BTC עם EMA pullback + volume = נוסחה עובדת.",
    maxFavorable: 2650, maxAdverse: -420, _capitalAtEntry: 3758, isDemo: true,
  },
  {
    id: "demo-27", ticker: "TSLA", side: "LONG", date: "2026-04-22",
    entry: 388.00, stop: 382.50, target: 402.00, exit: 384.50, shares: 6,
    status: "CLOSED", setup: "Range Breakout", marketCondition: "Sideways",
    emotionAtEntry: "Hesitant", entryQuality: 5, followedPlan: "Partially",
    exitReason: "Manual Exit",
    notes: "Breakout ב-$388 אבל volume לא משכנע. בשוק sideways יצאתי מוקדם.",
    lessonLearned: "לא כל breakout שווה. ה-volume הוא המורה האמיתי.",
    maxFavorable: 2.80, maxAdverse: -3.50, _capitalAtEntry: 3759, isDemo: true,
  },
  {
    id: "demo-28", ticker: "AAPL", side: "SHORT", date: "2026-04-21",
    entry: 282.50, stop: 287.00, target: 273.00, exit: 287.00, shares: 8,
    status: "CLOSED", setup: "Failed Breakout", marketCondition: "Trending Up",
    emotionAtEntry: "Angry", entryQuality: 3, followedPlan: false,
    exitReason: "Stop Loss",
    notes: "ניסיתי short ב-AAPL אחרי כישלון פריצה אבל שוק trending up.",
    lessonLearned: "אסור לסחור short בשוק trending up חזק. הולך נגד המומנטום הראשי.",
    maxFavorable: -2.40, maxAdverse: 4.50, _capitalAtEntry: 3736, isDemo: true,
  },
  {
    id: "demo-29", ticker: "NVDA", side: "LONG", date: "2026-04-20",
    entry: 191.00, stop: 187.50, target: 199.00, exit: 198.50, shares: 13,
    status: "CLOSED", setup: "Higher Low", marketCondition: "Trending Up",
    emotionAtEntry: "Confident", entryQuality: 9, followedPlan: true,
    exitReason: "Hit Target",
    notes: "NVDA HL ב-$190 אחרי טסט קצר. Volume על הrebound גבוה, RSI מתאושש.",
    lessonLearned: "HL בטרנד עולה = entries הכי טובים שלי. לחכות לאישור ולהיכנס.",
    maxFavorable: 7.50, maxAdverse: -1.20, _capitalAtEntry: 3700, isDemo: true,
  },
  {
    id: "demo-30", ticker: "SPY", side: "LONG", date: "2026-04-24",
    entry: 595.20, stop: 591.00, target: 604.00, exit: 603.20, shares: 6,
    status: "CLOSED", setup: "Trend Continuation", marketCondition: "Trending Up",
    emotionAtEntry: "Calm", entryQuality: 8, followedPlan: true,
    exitReason: "Hit Target",
    notes: "SPY trend continuation — כלל השוק trending up, MA stack מושלם.",
    lessonLearned: "SPY בטרנד חזק = safe trade. לסחור עם השוק, לא נגדו.",
    maxFavorable: 8.00, maxAdverse: -1.80, _capitalAtEntry: 3736, isDemo: true,
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
  const sortedTrades = [...trades]
    .filter(t => t.status === "CLOSED")
    .sort((a, b) => new Date(a.date || a.exitDate) - new Date(b.date || b.exitDate));
  sortedTrades.forEach(t => {
    const pnl = calcTradeMetrics(t).pnl || 0;
    balance += pnl;
    const d = t.date || t.exitDate;
    data.push({ date: d, equity: Math.round(balance), ticker: t.ticker, pnl: Math.round(pnl) });
  });
  const firstRaw = sortedTrades[0]?.date || sortedTrades[0]?.exitDate;
  const anchorDate = firstRaw
    ? new Date(new Date(firstRaw).getTime() - 86_400_000).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  return [{ date: anchorDate, equity: cap, ticker: "START", pnl: 0 }, ...data];
};

// Axis-only money formatter: full dollars under $10k (keeps near-flat equity curves
// legible so ticks don't all collapse to one "$Xk" string), k-notation above.
const fmtAxisMoney = (v) => {
  const n = Number(v) || 0;
  if (Math.abs(n) >= 10000) {
    const k = n / 1000;
    return `$${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return `$${Math.round(n).toLocaleString("en-US")}`;
};

// Display-only Y domain for the equity curve. Pads the real min/max; when the curve is
// effectively flat, fabricates a small readable band so recharts emits distinct ticks
// instead of six identical labels. Does not alter any equity/P&L value.
const equityYDomain = (curve) => {
  const vals = (curve || []).map(p => p && p.equity).filter(v => Number.isFinite(v));
  if (!vals.length) return ["auto", "auto"];
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const span = hi - lo;
  if (span < 1) {
    const pad = Math.max(50, Math.abs(hi) * 0.02);
    return [Math.floor(lo - pad), Math.ceil(hi + pad)];
  }
  const pad = span * 0.08;
  return [Math.floor(lo - pad), Math.ceil(hi + pad)];
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
// fmt$, fmtR, and calcTradeMetrics are imported from ./src/utils.js above.
// fmtDollar (below) is a separate local function used only for HTML export.

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
      t.exitReason ?? "", t.followedPlan === "Partially" ? "Partially" : t.followedPlan != null ? (t.followedPlan ? "Yes" : "No") : "",
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

// Aggregates come from useTradingStats (single source): `stats` = all-time,
// `monthStats` = same hook scoped to the current month. Per-trade rows/equity
// points stay local (per-trade calcTradeMetrics is the canonical source).
const exportMonthlyPDF = (trades, capital, stats, monthStats, accountEquity) => {
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

  const totalPnL = stats.totalPnL;
  const monthPnL = monthStats.totalPnL;
  const winRate = formatPct(stats.winRate);
  const monthWinRate = formatPct(monthStats.winRate);
  const avgR = stats.avgR.toFixed(2);
  // Unified full Account Equity (closed + live open P&L), passed from the
  // component so the report matches the dashboard exactly.
  const curEquity = accountEquity;

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
        <td>${t.followedPlan === "Partially" ? "◐" : t.followedPlan != null ? (t.followedPlan ? "✓" : "✗") : "-"}</td>
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
      <div class="kpi-value" style="color:#0f172a">${winRate}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">${monthName} Win Rate</div>
      <div class="kpi-value" style="color:#0f172a">${monthWinRate}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Avg R-Multiple</div>
      <div class="kpi-value" style="color:${avgR >= 0 ? "#10b981" : "#ef4444"}">${avgR >= 0 ? "+" : ""}${avgR}R</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Closed Trades</div>
      <div class="kpi-value" style="color:#0f172a">${stats.totalTrades}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">${monthName} Trades</div>
      <div class="kpi-value" style="color:#0f172a">${monthStats.totalTrades}</div>
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
    <ul style="padding-inline-start:18px;line-height:1.6">
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

// ─── SMART LESSONS GENERATOR ─────────────────────────────────────────────────
// "overnight_hold" → "Overnight Hold". Safe on already-clean labels ("Breakout").
const snakeToTitle = (s) =>
  String(s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const generateSmartLessons = (closedTrades, calcFn, lang = 'he') => {
  if (closedTrades.length < 2) return [];
  const he = lang === 'he';
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
  // Tiebreak: win rate, then sample size — matches Analytics so both surfaces
  // name the SAME "strongest setup" when two setups share a win rate. (#3)
  const bestSetup = Object.entries(setupMap).sort((a, b) => {
    const wrA = a[1].wins / (a[1].wins + a[1].losses);
    const wrB = b[1].wins / (b[1].wins + b[1].losses);
    const nA = a[1].wins + a[1].losses;
    const nB = b[1].wins + b[1].losses;
    return (wrB - wrA) || (nB - nA);
  })[0];

  if (bestSetup && bestSetup[1].wins + bestSetup[1].losses >= 2) {
    const n = bestSetup[1].wins + bestSetup[1].losses;
    const wr = Math.round(bestSetup[1].wins / n * 100);
    const setup = labelFor("setup", snakeToTitle(bestSetup[0]), lang);
    lessons.push(he ? {
      channel: "best_setup",
      type: "strength",
      title: `${setup} הוא הסטאפ החזק ביותר שלך`,
      detail: `${wr}% הצלחה על פני ${n} עסקאות. התמקד יותר בתבנית הזו.`,
      action: `חפש עוד סטאפים של ${setup} והגדל את גודל הפוזיציה כשהביטחון גבוה.`,
    } : {
      channel: "best_setup",
      type: "strength",
      title: `${setup} is your best setup`,
      detail: `${wr}% win rate across ${n} trades. Focus more on this pattern.`,
      action: `Look for more ${setup} setups and increase position size when confidence is high.`,
    });
  }

  if (followedPlanLosers.length >= 2) {
    lessons.push(he ? {
      type: "warning",
      title: "סטייה מהתוכנית עולה לך כסף",
      detail: `${followedPlanLosers.length} הפסדים נבעו מאי-עמידה בתוכנית המסחר שלך.`,
      action: "לפני כל עסקה, כתוב את התוכנית שלך. אחרי הכניסה, עקוב אחריה בצורה מכנית.",
    } : {
      type: "warning",
      title: "Plan deviation costs you money",
      detail: `${followedPlanLosers.length} losses came from not following your trading plan.`,
      action: "Before every trade, write down your plan. After entry, follow it mechanically.",
    });
  }

  if (fomoTrades.length >= 2 && fomoLosers.length > 0) {
    const fomoLossRate = Math.round(fomoLosers.length / fomoTrades.length * 100);
    lessons.push(he ? {
      channel: "fomo",
      type: "warning",
      title: "עסקאות FOMO פוגעות בך",
      detail: `${fomoLossRate}% מכניסות ה-FOMO שלך הסתיימו בהפסד.`,
      action: "כשאתה מרגיש FOMO, חכה 15 דקות. אם הסטאפ עדיין נראה טוב, היכנס בגודל קטן יותר.",
    } : {
      channel: "fomo",
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
      lessons.push(he ? {
        type: "insight",
        title: "ההפסדים שלך גדולים מהרווחים",
        detail: `רווח ממוצע: $${Math.round(avgWin)} מול הפסד ממוצע: $${Math.round(avgLoss)}.`,
        action: "הדק את הסטופים או הרחב את היעדים. שאף ליחס סיכון-סיכוי של לפחות 2:1.",
      } : {
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
    lessons.push(he ? {
      type: "personal",
      title: `התובנה האחרונה שלך (${latest.ticker})`,
      detail: latest.lessonLearned,
      action: "עבור על זה לפני העסקה הבאה שלך.",
    } : {
      type: "personal",
      title: `Your latest insight (${latest.ticker})`,
      detail: latest.lessonLearned,
      action: "Review this before your next trade.",
    });
  }

  return lessons.slice(0, 3);
};

// ─── STAT CARD ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, trend, trendText, icon: Icon, accent = "cyan", info }) => {
  const accents = {
    cyan:   { border: "border-cyan-500/25", iconColor: "text-cyan-400", bg: "bg-cyan-500/8" },
    green:  { border: "border-[#10b981]/25", iconColor: "text-[#10b981]", bg: "bg-[#10b981]/8" },
    purple: { border: "border-violet-500/25", iconColor: "text-violet-400", bg: "bg-violet-500/8" },
    amber:  { border: "border-amber-500/25", iconColor: "text-amber-400", bg: "bg-amber-500/8" },
    red:    { border: "border-[#ef4444]/25", iconColor: "text-[#ef4444]", bg: "bg-[#ef4444]/8" },
  };
  const { border, iconColor, bg } = accents[accent] || accents.cyan;
  return (
    <div className={`${bg} border ${border} rounded-xl p-4 flex flex-col gap-1 relative overflow-hidden bg-[var(--bg-elevated)] dark:bg-[#0d1424]`}>
      <div className={`absolute top-3 right-3 rtl:right-auto rtl:left-3 opacity-15 ${iconColor}`}>
        <Icon size={26} />
      </div>
      <span className="text-[11px] font-semibold tracking-widest uppercase text-slate-500 flex items-center gap-1">
        <span className="pe-7 md:pe-0">{label}</span>
        {info && <InfoTooltip label={typeof label === "string" ? label : "info"}>{info}</InfoTooltip>}
      </span>
      <span className={`text-lg md:text-2xl font-bold font-mono ${iconColor}`}>{value}</span>
      {sub && <span className="text-xs text-slate-600">{sub}</span>}
      {trend !== undefined && (
        <span className={`text-xs font-semibold ${trend >= 0 ? "text-[#10b981]" : "text-[#ef4444]"}`}>
          {trend >= 0 ? "▲" : "▼"} {trendText != null ? trendText : `${Math.abs(trend).toFixed(1)}%`}
        </span>
      )}
    </div>
  );
};

// ─── USER MENU ITEM ──────────────────────────────────────────────────────────
const UserMenuItem = ({ icon: Icon, label, color = "text-slate-300", onClick }) => (
  <button
    onClick={onClick}
    className="w-full h-10 px-3 flex items-center gap-3 rounded-lg hover:bg-[#1a2235] active:bg-[#0d9488] transition-[background-color] duration-150 text-start group"
  >
    <Icon size={16} className={`${color} group-active:text-white`} />
    <span className="text-sm text-slate-200 font-medium group-active:text-white">{label}</span>
  </button>
);

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
  { id: "notebook",  key: "notebookTab",     icon: NotebookPen },
  { id: "weeklyReview", key: "weeklyReviewTab", icon: CalendarCheck },
  { id: "tools",     key: "tools",           icon: Wrench },
  { id: "analytics", key: "analytics",      icon: BarChart2 },
  { id: "intel",     key: "marketIntel",    icon: Rss },
  { id: "feedback",  key: "feedback",       icon: MessageCircle },
];

// ─── ONBOARDING TOUR STEPS (wave 3a) ───────────────────────────────────────────
// All anchors live on the dashboard / always-visible nav, so the tour runs without
// driving the UI into modals. Tilt Shield has no anchor (it only renders during an
// active tilt) — an anchorless centered bubble explains the concept instead.
const buildTourSteps = (t) => [
  { anchor: '[data-tour="main-nav"]',    title: t.tourNavTitle,   body: t.tourNavBody },
  { anchor: '[data-tour="trading-dna"]', title: t.tourDnaTitle,   body: t.tourDnaBody },
  { anchor: null,                        title: t.tourTiltTitle,  body: t.tourTiltBody },
  { anchor: '[data-tour-tab="journal"]', title: t.tourCoachTitle, body: t.tourCoachBody },
  { anchor: '[data-tour-tab="journal"]', title: t.tourOcrTitle,   body: t.tourOcrBody },
];

// Module-scope + memo (not defined inside the render IIFE): stable component identity
// means the ~5-min overview refresh reconciles cards in place instead of remounting
// them, so the sparklines/bars never flash. Both read i18n names via the `t` prop.
const moFmtPrice = (p) =>
  typeof p !== "number" || !Number.isFinite(p)
    ? "—"
    : p >= 1000
    ? p.toLocaleString("en-US", { maximumFractionDigits: 0 })
    : p.toFixed(2);

// One index "pulse" card: name, latest close, weekly % with arrow, and a sparkline.
const MarketPulseCard = memo(({ item, t }) => {
  const up = item.weekChangePct >= 0;
  const color = up ? "var(--v3-accent)" : "var(--v3-loss)";
  const data = (item.closes || []).map((c, i) => ({ i, c }));
  const gid = `mo-spark-${item.sym}`;
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] dark:border-white/[0.06] bg-white/[0.02] p-3">
      <div className="text-[11px] font-bold text-white truncate">{t[item.key] || item.sym}</div>
      <div className="text-sm font-mono font-bold text-slate-100 mt-0.5">${moFmtPrice(item.price)}</div>
      <div className="text-[11px] font-mono font-semibold flex items-center gap-0.5 mt-0.5" style={{ color }}>
        {up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
        {up ? "+" : ""}{item.weekChangePct.toFixed(2)}%
      </div>
      {data.length >= 2 && (
        <div className="mt-1.5 h-8 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
              <defs>
                <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis hide domain={['dataMin', 'dataMax']} />
              <Area type="monotone" dataKey="c" stroke={color} strokeWidth={1.5} fill={`url(#${gid})`} dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
});

// Placeholder for an index whose data hasn't converged yet (upstream per-symbol
// null / cold-start partial). Keeps the Market Pulse grid full so the row never
// shows a gap; fills with a real card once the value arrives.
const MarketPulseCardSkeleton = memo(({ item, t }) => (
  <div className="rounded-xl border border-[var(--border-subtle)] dark:border-white/[0.06] bg-white/[0.02] p-3">
    <div className="text-[11px] font-bold text-white truncate">{t[item.key] || item.sym}</div>
    <div className="text-sm font-mono font-bold text-slate-500 mt-0.5">—</div>
    <div className="text-[11px] font-mono font-semibold text-slate-600 mt-0.5">—</div>
  </div>
));

// One sector/theme card: name, weekly % with arrow, and a proportional bar scaled to
// the strongest mover (maxAbs). Bar width anchors to the reading edge, so it's RTL-safe.
const SectorThemeCard = memo(({ item, t, maxAbs }) => {
  const up = item.weekChangePct >= 0;
  const color = up ? "var(--v3-accent)" : "var(--v3-loss)";
  const pct = maxAbs > 0 ? Math.min(100, (Math.abs(item.weekChangePct) / maxAbs) * 100) : 0;
  const name = t[item.key] || item.sym;
  return (
    <div
      className="rounded-lg border border-[var(--border-subtle)] dark:border-white/[0.06] bg-white/[0.02] p-2.5"
      aria-label={`${name}: ${up ? "+" : ""}${item.weekChangePct.toFixed(2)}%`}
    >
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <span className="text-[11px] font-bold text-white truncate">{name}</span>
        <span className="text-[10px] font-mono font-bold flex items-center gap-0.5 shrink-0" style={{ color }}>
          {up ? <ArrowUpRight size={9} /> : <ArrowDownRight size={9} />}
          {up ? "+" : ""}{item.weekChangePct.toFixed(2)}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
});

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
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      // Merge the onboarding answers (experience/strategy/goal/frequency) into the
      // profile so the coach can read them — additive, existing consumers untouched.
      return parsed?.profile ? { ...parsed.profile, ...(parsed.answers || {}) } : null;
    } catch { return null; }
  });

  const handleOnboardingComplete = (profile) => {
    // Re-read the just-written answers so userProfile carries them from first load.
    let answers = {};
    try { answers = JSON.parse(localStorage.getItem("swingEdgeOnboarding") || "{}").answers || {}; } catch {}
    setUserProfile({ ...profile, ...answers });
    const cap = Number(profile?.defaults?.capital);
    if (cap > 0) {
      setCapital(cap);
      try { localStorage.setItem("swingEdgeCapital", String(cap)); } catch {}
    }
    const rp = Number(profile?.defaults?.riskPct);
    if (rp >= 0.1 && rp <= 10) {
      setRiskPct(rp);
      try { localStorage.setItem("swingEdgeRiskPct", String(rp)); } catch {}
    }
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

  // Guided tour — runs once, right after BetaWelcome is dismissed (wave 3a).
  // Default false so plain reloads and existing users never auto-trigger; only
  // dismissBetaWelcome (brand-new flow) or a manual Help launch sets it true.
  const [showTour, setShowTour] = useState(false);
  const completeTour = useCallback(() => {
    try { localStorage.setItem("swingEdgeTourDone", "1"); } catch {}
    setShowTour(false);
  }, []);
  const startTour = useCallback(() => {
    setTab("dashboard");
    setShowTour(true);
  }, []);

  const dismissBetaWelcome = useCallback(() => {
    if (!authUser) return;
    try { localStorage.setItem(`swingEdgeBetaWelcome:${authUser.id}`, "1"); } catch {}
    setShowBetaWelcome(false);
    try {
      if (!localStorage.getItem("swingEdgeTourDone")) { setTab("dashboard"); setShowTour(true); }
    } catch {}
  }, [authUser?.id]);

  const [capital, setCapital] = useState(() => {
    try { return parseFloat(localStorage.getItem("swingEdgeCapital")) || DEFAULT_CAPITAL; } catch { return DEFAULT_CAPITAL; }
  });
  const [capitalInput, setCapitalInput] = useState("");

  // Personal risk-per-trade %, seeded once from the onboarding profile, editable in Settings.
  // Stored as a percent (1 = 1%), not a fraction. Settings is the source of truth after seeding.
  const [riskPct, setRiskPct] = useState(() => {
    try {
      const s = parseFloat(localStorage.getItem("swingEdgeRiskPct"));
      if (s >= 0.1 && s <= 10) return s;
    } catch {}
    const p = Number(userProfile?.defaults?.riskPct);
    return (p >= 0.1 && p <= 10) ? p : 1;
  });
  const [riskInput, setRiskInput] = useState("");
  // Portfolio-wide risk cap, derived from per-trade risk. Floor of 3 preserves the
  // pre-wave default (1% per trade → 3% cap) for users with no profile.
  const maxRiskPct = useMemo(() => Math.min(5, Math.max(3, riskPct * 2)), [riskPct]);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const profileRef = useRef(null);

  // Modals + PWA install
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showChartGuide, setShowChartGuide] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [pwaPromptEvent, setPwaPromptEvent] = useState(null);
  useEffect(() => {
    const onBeforeInstall = (e) => {
      e.preventDefault();
      setPwaPromptEvent(e);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);
  const handleInstallPwa = useCallback(async () => {
    if (!pwaPromptEvent) return;
    try {
      pwaPromptEvent.prompt();
      const choice = await pwaPromptEvent.userChoice;
      if (choice?.outcome === "accepted") setPwaPromptEvent(null);
    } catch {}
    setShowProfileDropdown(false);
  }, [pwaPromptEvent]);

  const [tab, setTab] = useState(() => {
    try {
      const path = (window.location.pathname || "").toLowerCase();
      const hash = (window.location.hash || "").toLowerCase();
      if (path.includes("/admin") || hash.includes("admin")) return "admin";
    } catch {}
    return "dashboard";
  });

  // Remember the last non-feedback tab, so the Feedback tab can attach it as
  // context (once Feedback is open, the "current" tab is always "feedback").
  const feedbackOriginRef = useRef("dashboard");
  useEffect(() => {
    if (tab !== "feedback") feedbackOriginRef.current = tab;
  }, [tab]);

  useEffect(() => {
    try { localStorage.removeItem("swingEdgeDashboardVariant"); } catch {}
  }, []);
  const [toolsTab, setToolsTab] = useState('analyzer');
  useEffect(() => {
    if (tab === 'analyzer' || tab === 'position') {
      setToolsTab(tab === 'position' ? 'calc' : 'analyzer');
      setTab('tools');
    }
  }, [tab]);
  const [trades, setTrades] = useState(() => {
    try {
      const saved = localStorage.getItem("swingEdgeTrades");
      const parsed = saved ? JSON.parse(saved) : MOCK_TRADES;
      const cleaned = purgeInvalidTrades(cleanTrades(parsed));
      try { localStorage.setItem("swingEdgeTrades", JSON.stringify(cleaned)); } catch {}
      return cleaned;
    } catch { return MOCK_TRADES; }
  });
  const [chartSymbol, setChartSymbol] = useState("NASDAQ:NVDA");
  const [chartInterval, setChartInterval] = useState("1D");
  const [chartStyle, setChartStyle] = useState("1");
  const tvRef = useRef(null);
  const [showForm, setShowForm] = useState(false);
  const [fabVisible, setFabVisible] = useState(true);
  const mainScrollRef = useRef(null);
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;
    let lastWinY = window.scrollY;
    let lastMainY = mainScrollRef.current ? mainScrollRef.current.scrollTop : 0;
    let ticking = false;
    const evaluate = () => {
      const winY = window.scrollY;
      const mainY = mainScrollRef.current ? mainScrollRef.current.scrollTop : 0;
      const winDelta = winY - lastWinY;
      const mainDelta = mainY - lastMainY;
      if (winDelta > 10 || mainDelta > 10) setFabVisible(false);
      else if (winDelta < -10 || mainDelta < -10) setFabVisible(true);
      lastWinY = winY;
      lastMainY = mainY;
      ticking = false;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(evaluate);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    const mainEl = mainScrollRef.current;
    mainEl?.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      mainEl?.removeEventListener("scroll", onScroll);
    };
  }, []);
  const [form, setForm] = useState({ ticker: "", side: "LONG", entry: "", stop: "", target: "", shares: "", setup: "Breakout", notes: "", marketCondition: "Trending Up", emotionAtEntry: "Neutral", entryQuality: 3, tradeImage: null, tradeImagePreview: null });
  const [showTradeContext, setShowTradeContext] = useState(false);
  const [ocrStatus, setOcrStatus] = useState(null);
  // Live quote shown in the Add Trade modal (auto-fills Entry Price).
  const [formQuote, setFormQuote] = useState(null);
  const [formQuoteLoading, setFormQuoteLoading] = useState(false);
  const formQuoteTimer = useRef(null);
  const [pulse, setPulse] = useState(false);
  const [tickerIdx, setTickerIdx] = useState(0);
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [closingTrade, setClosingTrade] = useState(null);

  // Accessible-dialog behavior (focus-in, focus-trap, focus-restore, Esc) for the
  // two inline modals. Esc is bubble-phase so SmartSelect's capture-phase Esc still
  // closes an open dropdown first, then the modal.
  const logTitleId = useId();
  const closeTitleId = useId();
  const logModalRef = useModalA11y({ active: showForm, onClose: () => setShowForm(false) });
  const closeModalRef = useModalA11y({ active: showCloseForm, onClose: () => { setShowCloseForm(false); setClosingTrade(null); } });
  const [closeForm, setCloseForm] = useState({ exit: "", exitReason: "Hit Target", followedPlan: true, lessonLearned: "", maxFavorable: "", maxAdverse: "" });

  // Trade Analyzer state
  const [analyzerForm, setAnalyzerForm] = useState({ ticker: "", entry: "", stop: "", target: "", shares: "", setup: "Breakout", notes: "", marketCondition: "Trending Up", emotionAtEntry: "Neutral", entryQuality: 3 });
  const [showAnalyzerContext, setShowAnalyzerContext] = useState(false);
  const [analyzerImage, setAnalyzerImage] = useState(null);
  const [analyzerImagePreview, setAnalyzerImagePreview] = useState(null);
  const [analyzerResult, setAnalyzerResult] = useState(null);
  // OCR (Claude Vision via /api/ocr): chosen side disambiguates stop vs target;
  // analyzerOcrResult drives the confidence badge. { status, confidence }.
  const [analyzerOcrSide, setAnalyzerOcrSide] = useState("LONG");
  const [analyzerOcrResult, setAnalyzerOcrResult] = useState(null);
  const [analyzerLoading, setAnalyzerLoading] = useState(false);
  // Live quote shown in the Analyzer (auto-fills Entry Price). Mirrors the Add-Trade form mechanism.
  const [analyzerQuote, setAnalyzerQuote] = useState(null);
  const [analyzerQuoteLoading, setAnalyzerQuoteLoading] = useState(false);
  const analyzerQuoteTimer = useRef(null);

  // Chart AI extraction state
  const [chartAiLoading, setChartAiLoading] = useState(false);
  const [chartAiTarget, setChartAiTarget] = useState(null); // "position" | "journal"
  // Screenshot → OCR (mirrors handleImageUpload). chartOcrStatus drives the badge
  // beside the chart buttons; the refs survive the async screen-picker / native
  // file dialog so the fallback path routes to the right target with the right side.
  const [chartOcrStatus, setChartOcrStatus] = useState(null); // { status, confidence } | null
  const chartFileRef = useRef(null);   // hidden fallback <input type=file>
  const chartTargetRef = useRef(null); // "position" | "journal"
  const chartSideRef = useRef("LONG"); // side hint captured at click (avoids stale closure)

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

  // Theme (auto / light / dark) — driven by ThemeProvider
  const { mode: themeMode, setMode: setThemeMode, resolved: themeResolved } = useTheme();

  // Change password modal
  const [showChangePassword, setShowChangePassword] = useState(false);

  // Mentoring (B4.2) — invite/redeem flow + active relationships
  const [mentorInviteCode, setMentorInviteCode] = useState("");
  const [mentorCodeCopied, setMentorCodeCopied] = useState(false);
  const [redeemCodeInput, setRedeemCodeInput] = useState("");
  const [mentorBusy, setMentorBusy] = useState(false);
  const [myMentors, setMyMentors] = useState([]);   // mentorships where I am the mentee
  const [myMentees, setMyMentees] = useState([]);   // mentorships where I am the mentor

  // Mentor Dashboard (B4.3) — read-only view into an active mentee's data.
  // Kept strictly separate from the mentor's OWN trades/stats/DNA. No writes ever.
  const [mentoringMenteeId, setMentoringMenteeId] = useState(null); // selected mentee user_id
  const [menteeTrades, setMenteeTrades] = useState([]);             // selected mentee's trades
  const [menteeTeasers, setMenteeTeasers] = useState({});           // { [mentee_id]: {count, winRate} }
  const [menteeLoading, setMenteeLoading] = useState(false);

  // Mentor Notes (B4.4) — mentor writes notes on a mentee's trade (mentor_notes).
  // mentor side: notes I wrote on the selected mentee's trades, keyed by trade_id.
  // mentee side: notes written ABOUT me (read-only), shown in my Journal, by trade_id.
  const [menteeNotesByTrade, setMenteeNotesByTrade] = useState({}); // mentor view
  const [myTradeNotes, setMyTradeNotes] = useState({});            // mentee view (Journal)
  const [noteEditorTradeId, setNoteEditorTradeId] = useState(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteBusy, setNoteBusy] = useState(false);

  // Edit trade state (modal owns its form; we just track the open trade)
  const [editingTrade, setEditingTrade] = useState(null);
  const showEditForm = editingTrade != null;

  // Bulk selection state for the Journal table
  const [selectedTrades, setSelectedTrades] = useState(() => new Set());

  // Reset-all (Danger Zone) modal toggle
  const [showResetAll, setShowResetAll] = useState(false);

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

  // Journal Pro filters
  const [journalFilters, setJournalFilters] = useState({
    ticker: "", setup: "all", result: "all", from: "", to: "", rMin: "", rMax: "",
  });
  const [showJournalFilters, setShowJournalFilters] = useState(false);
  const [journalView, setJournalView] = useState('table');

  // ── Load trades: Supabase is source of truth; localStorage is fallback ──
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !authUser?.id) return;
    let cancelled = false;
    const loadTrades = async () => {
      try {
        const { data, error } = await supabase
          .from("trades")
          .select("*")
          .eq("user_id", authUser.id)
          .order("date", { ascending: false });
        if (cancelled) return;
        if (error) {
          console.error("Error loading trades from Supabase:", error);
          try {
            const local = localStorage.getItem("swingEdgeTrades");
            if (local) {
              const cleaned = purgeInvalidTrades(cleanTrades(JSON.parse(local)));
              setTrades(cleaned);
            }
          } catch {}
          return;
        }
        // REPLACE — not merge
        const cleaned = purgeInvalidTrades(cleanTrades(data || []));
        setTrades(cleaned);
      } catch (e) {
        console.error("Supabase load failed:", e);
      }
    };
    loadTrades();
    return () => { cancelled = true; };
  }, [authUser?.id]);

  // Persist trades to localStorage
  useEffect(() => {
    try { localStorage.setItem("swingEdgeTrades", JSON.stringify(trades)); } catch {}
  }, [trades]);

  // Persist watchlist to localStorage
  useEffect(() => {
    try { localStorage.setItem("swingEdgeWatchlist", JSON.stringify(watchlistItems)); } catch {}
  }, [watchlistItems]);

  // TradingView Advanced Chart — modern embed. The legacy tv.js widget mounted
  // but served no candle data (black chart, OHLC ∅); this embed reads its JSON
  // config from the script's text content and renders into the container.
  useEffect(() => {
    if (tab !== "intel" || !tvRef.current) return;
    const container = tvRef.current;
    container.innerHTML = "";

    const intervalMap = { "1m": "1", "5m": "5", "15m": "15", "1H": "60", "4H": "240", "1D": "D", "1W": "W" };
    const tvInterval = intervalMap[chartInterval] || chartInterval;

    const wrapper = document.createElement("div");
    wrapper.className = "tradingview-widget-container";
    wrapper.style.height = "100%";
    wrapper.style.width = "100%";
    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    widget.style.height = "100%";
    widget.style.width = "100%";
    wrapper.appendChild(widget);

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: chartSymbol,
      interval: tvInterval,
      timezone: "America/New_York",
      theme: "dark",
      style: chartStyle || "1",
      locale: "en",
      toolbar_bg: "#0d1424",
      enable_publishing: false,
      allow_symbol_change: true,
      hide_side_toolbar: false,
      studies: ["Volume@tv-basicstudies"],
      support_host: "https://www.tradingview.com",
    });
    wrapper.appendChild(script);
    container.appendChild(wrapper);

    return () => { try { container.innerHTML = ""; } catch {} };
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
        if (showEditForm) { setEditingTrade(null); }
        if (showProfileDropdown) setShowProfileDropdown(false);
        return;
      }
      if (isTyping) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "n") { e.preventDefault(); setForm({ ticker:"", side:"LONG", entry:"", stop:"", target:"", shares:"", setup:"Breakout", notes:"", marketCondition:"Trending Up", emotionAtEntry:"Neutral", entryQuality:3, tradeImage:null, tradeImagePreview:null }); setOcrStatus(null); setShowForm(true); }
      else if (k === "j") { e.preventDefault(); setTab("journal"); }
      else if (k === "d") { e.preventDefault(); setTab("dashboard"); }
      else if (k === "a") { e.preventDefault(); setTab("analyzer"); }
      else if (k === "i") { e.preventDefault(); setTab("intel"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showForm, showCloseForm, showEditForm, showProfileDropdown]);

  // Persist price alerts
  useEffect(() => {
    try { localStorage.setItem("swingEdgePriceAlerts", JSON.stringify(priceAlerts)); } catch {}
  }, [priceAlerts]);

  // Persist language
  useEffect(() => {
    try { localStorage.setItem("swingEdgeLang", lang); } catch {}
  }, [lang]);

  // Sync document-level lang/dir so third-party widgets (TradingView, native form
  // widgets) match the user's selected language. Without this, <html lang="he" dir="rtl">
  // from index.html stays stale forever after a user picks en/es/pt.
  useEffect(() => {
    try {
      document.documentElement.lang = lang;
      document.documentElement.dir  = isRTL ? "rtl" : "ltr";
    } catch {}
  }, [lang, isRTL]);

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

  // Market Overview (indices + sectors/themes) over a selectable range: 1D / 1W /
  // 1M, default 1W. Cadence tracks market state (5 min open → 30 min closed);
  // re-arms on state transitions AND range switches, and only the ACTIVE range
  // polls. Data is cached per-range in state, so switching back to a visited range
  // renders instantly (no spinner, no flicker); the service keeps a per-range
  // last-known-good accumulator so partial cold-start responses converge. Retry
  // once after 15s on failure.
  const [moRange, setMoRange] = useState(7); // 1 | 7 | 30
  const [moByRange, setMoByRange] = useState({}); // { [days]: overviewData }
  const marketOverview = moByRange[moRange] ?? null;
  // Market regime always reads the 30-day (≈23-session) window so its 20-SMA /
  // realized-vol / structure criteria are computable regardless of the card's
  // visible 1D/1W/1M toggle.
  const regimeOverview = moByRange[30] ?? null;
  useEffect(() => {
    let cancelled = false;
    let retryTimer = null;

    const run = async () => {
      try {
        const data = await fetchMarketOverview(moRange);
        if (!cancelled && data) setMoByRange((prev) => ({ ...prev, [moRange]: data }));
      } catch {
        if (!cancelled) retryTimer = setTimeout(() => { if (!cancelled) run(); }, 15000);
      }
    };

    run();
    const interval = setInterval(run, getOverviewRefreshInterval(marketState));
    return () => {
      cancelled = true;
      clearInterval(interval);
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [marketState, moRange]);

  // Keep the 30-day overview warm for regime detection even when the visible
  // toggle is 1D/1W. Rides the same cached fetch (server caches history ~60min;
  // in-flight requests dedupe) — no extra API budget.
  useEffect(() => {
    if (moRange === 30) return; // already fetched by the effect above
    let cancelled = false;
    const run = async () => {
      try {
        const data = await fetchMarketOverview(30);
        if (!cancelled && data) setMoByRange((prev) => ({ ...prev, 30: data }));
      } catch { /* degrades to trade-tag fallback until data lands */ }
    };
    run();
    const interval = setInterval(run, getOverviewRefreshInterval(marketState));
    return () => { cancelled = true; clearInterval(interval); };
  }, [marketState, moRange]);

  const realTrades = useMemo(() => trades.filter(t => !t.isDemo), [trades]);
  const demoTrades = useMemo(() => trades.filter(t => t.isDemo), [trades]);
  const equityCurve = useMemo(() => generateEquityCurve(capital, realTrades), [realTrades, capital]);
  const closedTrades = realTrades.filter(t => t.status === "CLOSED");
  const openTrades   = realTrades.filter(t => t.status === "OPEN");
  // Journal header counter: counts over the SAME base the journal list renders
  // (all trades incl. demo), so total/open/closed stay internally consistent.
  const openCountAll   = useMemo(() => trades.filter(t => t.status === "OPEN").length, [trades]);
  const closedCountAll = useMemo(() => trades.filter(t => t.status === "CLOSED").length, [trades]);

  // Stable reference for the pure calcTradeMetrics function — prevents
  // useTradingStats from re-running its useMemo on every render.
  const stableCalcTradeMetrics = useCallback(calcTradeMetrics, []);

  // ─── MASTER STATS HUB — single source of truth ──────────────────────────────
  const stats = useTradingStats(realTrades, capital, stableCalcTradeMetrics);
  const { totalPnL, winRate, avgR } = stats;

  // Mentor Dashboard (B4.3) — derived analytics for the SELECTED mentee. Kept
  // separate from the mentor's own `stats`/`aiDNA` so the two never mix. Both
  // hooks run unconditionally with an empty default until a mentee is chosen.
  const menteeRealTrades = useMemo(() => menteeTrades.filter(t => !t.isDemo), [menteeTrades]);
  const menteeStats = useTradingStats(menteeRealTrades, capital, stableCalcTradeMetrics);
  const menteeDNA = useMemo(() => calculateTradeDNA(menteeRealTrades), [menteeRealTrades]);

  // Current-month subset fed through the same hub — powers the monthly PDF export.
  const currentMonthRealTrades = useMemo(() => {
    const now = new Date();
    const m = now.getMonth();
    const y = now.getFullYear();
    return realTrades.filter(t => {
      if (!t.date) return false;
      const d = new Date(t.date + "T12:00:00");
      return d.getMonth() === m && d.getFullYear() === y;
    });
  }, [realTrades]);
  const monthStats = useTradingStats(currentMonthRealTrades, capital, stableCalcTradeMetrics);

  // ─── MONTHLY REPORT — auto-popup modal (start of month, once) + QA shortcut ──
  const [showReportModal, setShowReportModal] = useState(false);
  const [autoReport, setAutoReport] = useState(null);
  useEffect(() => {
    try {
      // QA shortcut: ?testReport=1 forces the modal with the busiest month,
      // ignoring the date guard and localStorage. Documented for manual testing.
      const params = new URLSearchParams(window.location.search);
      if (params.get("testReport") === "1") {
        const { month, year } = findBestMonth(realTrades, calcTradeMetrics);
        const report = generateMonthlyReport(realTrades, month, year, calcTradeMetrics);
        if (report.hasEnoughData) { setAutoReport(report); setShowReportModal(true); }
        return;
      }
      const now = new Date();
      const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      const key = `swingEdgeReportShown:${prevYear}-${prevMonth}`;
      if (now.getDate() <= 7 && !localStorage.getItem(key)) {
        const report = generateMonthlyReport(realTrades, prevMonth, prevYear, calcTradeMetrics);
        if (report.hasEnoughData) {
          setAutoReport(report);
          setShowReportModal(true);
          localStorage.setItem(key, "1");
        }
      }
    } catch { /* non-fatal */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── JOURNAL PRO: filtered view + stats ─────────────────────────────────────
  const holdTimeDays = (t) => holdDays(t);

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

  // Single source of order for both desktop table and mobile cards.
  const sortedFilteredTrades = useMemo(
    () => [...filteredTrades].sort((a, b) => String(b.date || "").localeCompare(String(a.date || ""))),
    [filteredTrades]
  );

  // journalStats — same hub, scoped to the user's journal filters.
  // Stats exclude demo trades; the table itself still renders them with a badge.
  const filteredRealTrades = useMemo(
    () => filteredTrades.filter(t => !t.isDemo),
    [filteredTrades]
  );
  const journalStats = useTradingStats(filteredRealTrades, capital, stableCalcTradeMetrics);

  const uniqueSetups = useMemo(() => {
    const s = new Set(trades.map(t => t.setup).filter(Boolean));
    return Array.from(s).sort();
  }, [trades]);

  // ─── SWINGEDGE AI REPORTS ──────────────────────────────────────────────────
  // Memoised against the trades reference — the orchestrator also has an
  // internal WeakMap cache so repeated reads are effectively free.
  const aiDNA          = useMemo(() => SwingEdgeAI.getDNA(realTrades),          [realTrades]);
  const aiEdges        = useMemo(() => SwingEdgeAI.getEdges(realTrades),        [realTrades]);
  const aiRegime       = useMemo(() => SwingEdgeAI.getRegime(realTrades, { marketData: regimeOverview }), [realTrades, regimeOverview]);
  const aiGrowth       = useMemo(() => SwingEdgeAI.getGrowth(realTrades),       [realTrades]);
  const aiEvolution    = useMemo(() => SwingEdgeAI.getEvolution(realTrades, 6), [realTrades]);
  const aiGrowthReport = useMemo(() => SwingEdgeAI.getGrowthReport(realTrades), [realTrades]);

  // Tilt re-evaluates on a 60s tick so cooldown expiry and new conditions update.
  const [tiltTick, setTiltTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTiltTick(x => x + 1), 60000);
    return () => clearInterval(id);
  }, []);
  const aiTilt = useMemo(() => SwingEdgeAI.checkTilt(realTrades), [realTrades, tiltTick]);

  // Live Decision Coach analysis for the new-trade form.
  // Debounced 300ms so typing entry/stop/target doesn't recompute on every keystroke.
  const [coachForm, setCoachForm] = useState(form);
  useEffect(() => {
    const id = setTimeout(() => setCoachForm(form), 300);
    return () => clearTimeout(id);
  }, [form]);

  // Earnings awareness (timing channel). Keyed on the ticker alone so entry/stop
  // keystrokes don't refetch. Fail-open: any failure → null → Coach runs normally.
  const [coachEarnings, setCoachEarnings] = useState(null);
  useEffect(() => {
    const ticker = form.ticker.trim();
    if (!ticker) { setCoachEarnings(null); return; }
    let cancelled = false;
    const id = setTimeout(async () => {
      const e = await fetchEarnings(ticker);
      if (!cancelled) setCoachEarnings(e);
    }, 300);
    return () => { cancelled = true; clearTimeout(id); };
  }, [form.ticker]);

  const aiCoach = useMemo(
    () => SwingEdgeAI.analyzeNewTrade(coachForm, realTrades, {
      marketData: { ...(regimeOverview || {}), earnings: coachEarnings },
      profile: userProfile,
    }),
    [coachForm, realTrades, regimeOverview, coachEarnings, userProfile]
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

  // Live open P&L. Trades missing a live price are NOT silently dropped — they are
  // counted (missingCount) so the UI can disclose the gap. We never invent a price
  // or fall back to last-known: transparency over guessing.
  const openPnL = useMemo(() => {
    let value = 0, missingCount = 0;
    for (const t of openTrades) {
      const lp = getLivePrice(t.ticker);
      if (!lp) { missingCount++; continue; }
      value += t.side === "LONG"
        ? (lp.price - t.entry) * t.shares
        : (t.entry - lp.price) * t.shares;
    }
    return { value, missingCount };
  }, [openTrades, getLivePrice]);

  // Single source of truth for full Account Equity: realized closed equity
  // (from the stats hub) + live open P&L. Every consumer — Header, StatCard,
  // Footer, and the PDF export — reads this one value.
  const curEquity = useMemo(
    () => stats.currentEquity + openPnL.value,
    [stats.currentEquity, openPnL]
  );

  // Daily P&L calculation
  const dailyPnL = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayClosed = closedTrades.filter(t => t.date === today);
    const closedToday = todayClosed.reduce((s, t) => s + (calcTradeMetrics(t).pnl || 0), 0);
    // Open P&L change today (approximation using current live prices)
    return closedToday + openPnL.value;
  }, [closedTrades, openPnL]);

  // Win Streak Counter (delegated to Master Stats Hub).
  // stats.currentStreak is signed (negative for losing streak); the dashboard
  // counter shows wins-only, so clamp to >= 0 to preserve the original UX.
  const currentStreak = Math.max(0, stats.currentStreak);
  const bestStreak    = stats.maxWinStreak;

  // Smart lessons
  const smartLessons = useMemo(() => {
    const base = generateSmartLessons(closedTrades, calcTradeMetrics, lang) || [];
    const adaptive = AdaptiveLessons.generate(closedTrades, calcTradeMetrics, lang) || [];
    // Adaptive lessons that describe the SAME signal as a base lesson map onto a
    // shared semantic channel, so the strip never shows two "strongest setup" or
    // two FOMO cards. (#3)
    const ADAPTIVE_CHANNEL = { best_setup_underused: "best_setup", fomo_late_entry: "fomo" };
    const seenId = new Set(base.map(l => l.id).filter(Boolean));
    const seenCh = new Set(base.map(l => l.channel).filter(Boolean));
    const merged = [...base];
    for (const l of adaptive) {
      const ch = ADAPTIVE_CHANNEL[l.id];
      if (l.id && seenId.has(l.id)) continue;
      if (ch && seenCh.has(ch)) continue;
      merged.push(l);
      if (l.id) seenId.add(l.id);
      if (ch) seenCh.add(ch);
    }
    return merged;
  }, [closedTrades, lang]);

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
  const riskPerShare   = Math.abs(entryN - stopN);
  const rewardPerShare = Math.abs(targetN - entryN);
  const posSize        = riskPerShare > 0 ? Math.floor((capital * (riskPct / 100)) / riskPerShare) : 0;
  const posValue       = posSize * entryN;
  const potLoss        = posSize * riskPerShare;
  // R/R is a price-only ratio — independent of position size — so the card always
  // agrees with the Decision Coach even when posSize floors to 0 on a small account.
  const rrRatio        = priceBasedRR(entryN, stopN, targetN);
  // True when the risk-%-sized position rounds below a single share (high price / wide stop / small capital).
  const posSizeTooSmall = riskPerShare > 0 && posSize === 0;
  // Geometry validity against the explicitly chosen side — drives the invalid-input
  // state (cards show "—", a red banner explains why, and save is blocked).
  const tradeValidity = validateTradeInputs(entryN, stopN, targetN, form.side);
  // Editable shares: `form.shares` is a manual override (raw positive-int string, "" = untouched).
  // suggestedShares mirrors the risk-%-sized value the card shows (1 when posSizeTooSmall).
  // effShares drives Pos.Value / Max Risk so an override recomputes them live; R/R stays price-only.
  // Sticky by design — changing entry/stop recomputes the suggestion but leaves the override in place.
  const suggestedShares   = posSizeTooSmall ? 1 : posSize;
  const sharesOverrideStr = (form.shares ?? "").toString();
  const sharesOverrideN   = parseInt(sharesOverrideStr, 10);
  const hasSharesOverride = sharesOverrideStr !== "" && sharesOverrideN > 0 && sharesOverrideN !== suggestedShares;
  const effShares   = sharesOverrideStr !== "" && sharesOverrideN > 0 ? sharesOverrideN : suggestedShares;
  const effPosValue = effShares * entryN;
  const effPotLoss  = effShares * riskPerShare;
  // Actual portfolio risk of the sized position. When the 1-share floor (or a
  // manual override) pushes this above the configured %, the "based on X% risk"
  // claim is false — surface an honest over-risk warning without blocking. (#9)
  const effRiskPct  = capital > 0 ? (effPotLoss / capital) * 100 : 0;
  const isOverRisk  = tradeValidity.valid && effShares > 0 && effRiskPct > riskPct + 0.05;

  // Analyzer computed values
  const azEntry  = parseFloat(analyzerForm.entry)  || 0;
  const azStop   = parseFloat(analyzerForm.stop)   || 0;
  const azTarget = parseFloat(analyzerForm.target) || 0;
  const azShares = parseFloat(analyzerForm.shares) || 0;
  const azRiskPerShare = azEntry > 0 && azStop > 0 ? Math.abs(azEntry - azStop) : 0;
  const azDollarRisk   = azRiskPerShare * azShares;
  const azPortfolioRisk = capital > 0 ? (azDollarRisk / capital) * 100 : 0;
  const azRRRatio  = priceBasedRR(azEntry, azStop, azTarget);

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

  // ─── LIVE QUOTE FOR TRADE ANALYZER ──────────────────────────────────────────
  // Same mechanism as the Add-Trade form: when the Analyzer tab is active and a
  // ticker is entered, fetch a live quote (reuses fetchQuote) and auto-fill Entry.
  const fetchAnalyzerQuote = useCallback(async (ticker, { force = false } = {}) => {
    if (!ticker) return;
    setAnalyzerQuoteLoading(true);
    try {
      const q = await fetchQuote(ticker);
      if (!q) return;
      setAnalyzerQuote({ ...q, ticker: ticker.toUpperCase() });
      setAnalyzerForm(f => {
        if (f.ticker.toUpperCase() !== ticker.toUpperCase()) return f;
        if (!force && f.entry) return f;
        return { ...f, entry: String(q.price.toFixed(2)) };
      });
    } finally {
      setAnalyzerQuoteLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!(tab === "tools" && toolsTab === "analyzer")) return;
    if (analyzerQuoteTimer.current) clearTimeout(analyzerQuoteTimer.current);
    const ticker = analyzerForm.ticker.trim();
    if (!ticker) { setAnalyzerQuote(null); return; }
    analyzerQuoteTimer.current = setTimeout(() => fetchAnalyzerQuote(ticker), 250);
    return () => { if (analyzerQuoteTimer.current) clearTimeout(analyzerQuoteTimer.current); };
  }, [analyzerForm.ticker, tab, toolsTab, fetchAnalyzerQuote]);

  const handleSubmit = () => {
    if (!form.ticker || !entryN || !stopN) return;
    // Block geometrically invalid trades from being saved (reversed stop/target).
    const validity = validateTradeInputs(entryN, stopN, targetN, form.side);
    if (!validity.valid) {
      toast.error((lang === "he" ? "קלט לא תקין — " : "Invalid input — ") + (validity.reason?.[lang] || validity.reason?.en));
      return;
    }
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
      id: (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      ticker: form.ticker.toUpperCase(),
      date: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      side: form.side,
      entry: entryN, stop: stopN, target: targetN,
      shares: effShares, status: "OPEN", exit: null,
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
    // Sync new trade to Supabase (primary source of truth)
    if (isSupabaseConfigured && supabase && authUser?.id) {
      supabase.from("trades").insert(tradeForSupabase({ ...newTrade, user_id: authUser.id, is_demo: false }))
        .then(({ error }) => { if (error) console.error("Supabase insert failed:", error); });
    }
    setForm({ ticker: "", side: "LONG", entry: "", stop: "", target: "", shares: "", setup: "Breakout", notes: "", marketCondition: "Trending Up", emotionAtEntry: "Neutral", entryQuality: 3, tradeImage: null, tradeImagePreview: null });
    setOcrStatus(null);
    setShowForm(false);
    setTab("journal");
    toast.success(lang === "he" ? `${newTrade.ticker} נוספה ליומן` : `${newTrade.ticker} added to journal`);
  };

  const handleCloseSubmit = async () => {
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
    // Sync close to Supabase
    if (isSupabaseConfigured && supabase && authUser?.id && closedTrade.id) {
      try {
        const { error } = await supabase.from("trades")
          .update(tradeForSupabase(closedTrade))
          .eq("id", closedTrade.id)
          .eq("user_id", authUser.id);
        if (error) console.error("Supabase close-update failed:", error);
      } catch (e) { console.error("Supabase close-update threw:", e); }
    }
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
      // Sync delete to Supabase
      if (isSupabaseConfigured && supabase && authUser?.id && tradeId) {
        try {
          const { error } = await supabase.from("trades")
            .delete()
            .eq("id", tradeId)
            .eq("user_id", authUser.id);
          if (error) console.error("Supabase delete failed:", error);
        } catch (e) { console.error("Supabase delete threw:", e); }
      }
      toast.success(lang === "he" ? "העסקה נמחקה" : "Trade deleted");
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedTrades);
    if (!ids.length) return;
    const ok = await confirmDialog({
      title: lang === "he" ? "מחיקת עסקאות" : "Delete Trades",
      message: lang === "he"
        ? `האם למחוק ${ids.length} עסקאות שנבחרו? פעולה זו לא ניתנת לביטול.`
        : `Delete the ${ids.length} selected trades? This action cannot be undone.`,
      confirmText: lang === "he" ? "מחק" : "Delete",
      cancelText: lang === "he" ? "ביטול" : "Cancel",
      danger: true,
    });
    if (!ok) return;
    const idSet = new Set(ids);
    setTrades(prev => prev.filter(t => !idSet.has(t.id)));
    if (isSupabaseConfigured && supabase && authUser?.id) {
      try {
        const { error } = await supabase.from("trades")
          .delete()
          .in("id", ids)
          .eq("user_id", authUser.id);
        if (error) console.error("Supabase bulk delete failed:", error);
      } catch (e) { console.error("Supabase bulk delete threw:", e); }
    }
    setSelectedTrades(new Set());
    toast.success(
      lang === "he" ? `${ids.length} עסקאות נמחקו` : `${ids.length} trades deleted`
    );
  };

  const handleEditOpen = (trade) => {
    setEditingTrade(trade);
  };

  // Receives the fully built `updated` trade from <EditTradeModal />
  const handleEditSubmit = async (updated) => {
    if (!updated || !updated.id) return;
    setTrades(prev => prev.map(t => t.id === updated.id ? updated : t));
    // Sync edit to Supabase
    if (isSupabaseConfigured && supabase && authUser?.id && updated.id) {
      try {
        const { error } = await supabase.from("trades")
          .update(tradeForSupabase(updated))
          .eq("id", updated.id)
          .eq("user_id", authUser.id);
        if (error) console.error("Supabase update failed:", error);
      } catch (e) { console.error("Supabase update threw:", e); }
    }
    setEditingTrade(null);
    toast.success(lang === "he" ? "העסקה עודכנה" : "Trade updated");
  };

  // ─── DEMO TRADES LOADER ─────────────────────────────────────────────────
  // Replaces any existing demo trades with the full 30-trade set,
  // preserving all real (non-demo) trades. Each run assigns fresh UUIDs
  // so re-loading is always clean. Persists via setTrades → useEffect.
  const handleLoadDemoTrades = async () => {
    const userId = authUser?.id || null;

    // 1. Keep only real trades, discard old demo trades
    const realTrades = trades.filter(t => !t.isDemo);
    const demoWithUserId = DEMO_TRADES.map((t, i) => {
      // Deterministic 1–15 calendar-day swing hold, derived from index so the
      // scatter spreads across the X-axis identically on every reload.
      const holdD = (i % 15) + 1;
      const close = new Date(t.date + "T20:00:00");
      close.setDate(close.getDate() + holdD);   // local-time add → holdDays == holdD
      const now = new Date();
      if (close.getTime() > now.getTime()) close.setTime(now.getTime()); // never future
      return {
        ...t,
        user_id: userId,
        id: crypto.randomUUID(),        // fresh UUID every load — no stale IDs
        createdAt: new Date(t.date + "T14:30:00").toISOString(),
        closedAt:  close.toISOString(),
        tradeImage: null,
        _prediction: null,
      };
    });

    // 2. Update state → useEffect auto-saves to localStorage
    setTrades([...realTrades, ...demoWithUserId]);

    // 3. Best-effort Supabase: delete old demos, insert fresh ones
    if (isSupabaseConfigured && supabase && userId) {
      try {
        await supabase.from("trades")
          .delete()
          .eq("user_id", userId)
          .eq("isDemo", true);
        await supabase.from("trades")
          .upsert(demoWithUserId, { onConflict: "id" });
      } catch { /* ignore — local state is still saved */ }
    }

    toast.success(lang === "he" ? `נטענו ${demoWithUserId.length} עסקאות דמו` : `Loaded ${demoWithUserId.length} demo trades`);
    setTab("journal");
  };

  // ── Mentoring (B4.2) ──────────────────────────────────────────────────
  // Load active relationships in both directions. RLS lets each party read
  // only their own mentorship rows, so these two queries are self-scoped.
  const loadMentorships = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase || !authUser?.id) return;
    const [asMentee, asMentor] = await Promise.all([
      supabase.from("mentorships").select("id,mentor_id,created_at").eq("mentee_id", authUser.id).eq("status", "active"),
      supabase.from("mentorships").select("id,mentee_id,created_at").eq("mentor_id", authUser.id).eq("status", "active"),
    ]);
    if (!asMentee.error) setMyMentors(asMentee.data || []);
    if (!asMentor.error) setMyMentees(asMentor.data || []);
  }, [authUser?.id]);

  useEffect(() => { loadMentorships(); }, [loadMentorships]);

  const handleCreateInvite = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    setMentorBusy(true);
    try {
      const { data, error } = await supabase.rpc("create_mentor_invite");
      if (error) { toast.error(error.message); return; }
      setMentorInviteCode(data);
      setMentorCodeCopied(false);
    } finally { setMentorBusy(false); }
  }, [toast]);

  const handleCopyInvite = useCallback(async () => {
    if (!mentorInviteCode) return;
    try {
      await navigator.clipboard.writeText(mentorInviteCode);
      setMentorCodeCopied(true);
      setTimeout(() => setMentorCodeCopied(false), 2000);
    } catch { /* clipboard blocked — code stays visible for manual copy */ }
  }, [mentorInviteCode]);

  const handleRedeemInvite = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    const code = redeemCodeInput.trim().toUpperCase();
    if (!code) return;
    setMentorBusy(true);
    try {
      const { error } = await supabase.rpc("redeem_mentor_invite", { _code: code });
      if (error) { toast.error(error.message); return; }
      toast.success(lang === "he" ? "התחברת כמנטור" : "Connected as mentor");
      setRedeemCodeInput("");
      await loadMentorships();
    } finally { setMentorBusy(false); }
  }, [redeemCodeInput, toast, lang, loadMentorships]);

  // Mentee-side revoke only (existing RLS permits mentee UPDATE). Sets the row
  // to 'revoked' → is_active_mentor flips to false, cutting the mentor's access.
  const handleRevokeMentor = useCallback(async (id) => {
    if (!isSupabaseConfigured || !supabase || !authUser?.id) return;
    const ok = await confirmDialog({
      title: lang === "he" ? "ביטול מנטור" : "Revoke Mentor",
      message: lang === "he"
        ? "לבטל את גישת המנטור לעסקאות שלך? ניתן להזמין מחדש בעתיד."
        : "Revoke this mentor's access to your trades? You can re-invite later.",
      confirmText: lang === "he" ? "בטל גישה" : "Revoke",
      cancelText: lang === "he" ? "ביטול" : "Cancel",
      danger: true,
    });
    if (!ok) return;
    const { error } = await supabase.from("mentorships")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("id", id).eq("mentee_id", authUser.id);
    if (error) { toast.error(error.message); return; }
    toast.success(lang === "he" ? "הגישה בוטלה" : "Access revoked");
    await loadMentorships();
  }, [authUser?.id, confirmDialog, toast, lang, loadMentorships]);

  // ── Mentor Dashboard (B4.3) — read-only ───────────────────────────────
  // Teaser stats (trade count + win rate) for every active mentee in one shot.
  // RLS's SELECT-only "mentors read active mentee trades" returns rows only for
  // active mentees, so this can never leak a revoked/foreign user's data.
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const ids = myMentees.map((m) => m.mentee_id);
    if (ids.length === 0) { setMenteeTeasers({}); return; }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("trades")
        .select("user_id,status,side,entry,exit,shares,stop,is_demo")
        .in("user_id", ids);
      if (cancelled || error || !data) return;
      const byUser = {};
      for (const row of data) {
        if (row.is_demo) continue; // teaser mirrors real trades only
        const u = row.user_id;
        (byUser[u] ||= { count: 0, closed: 0, wins: 0 });
        byUser[u].count += 1;
        if (row.status === "CLOSED") {
          byUser[u].closed += 1;
          if ((calcTradeMetrics(row).pnl || 0) > 0) byUser[u].wins += 1;
        }
      }
      const teasers = {};
      for (const [u, s] of Object.entries(byUser)) {
        teasers[u] = { count: s.count, winRate: s.closed ? (s.wins / s.closed) * 100 : 0 };
      }
      if (!cancelled) setMenteeTeasers(teasers);
    })();
    return () => { cancelled = true; };
  }, [myMentees]);

  // Load one mentee's full trade set on selection. Normalized through the same
  // cleanTrades/purge pipeline as the mentor's own trades so DNA/stats match.
  const selectMentee = useCallback(async (menteeId) => {
    if (!isSupabaseConfigured || !supabase || !menteeId) return;
    setMentoringMenteeId(menteeId);
    setMenteeLoading(true);
    try {
      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", menteeId)
        .order("date", { ascending: false });
      if (error) { toast.error(error.message); setMenteeTrades([]); return; }
      setMenteeTrades(purgeInvalidTrades(cleanTrades(data || [])));
    } finally {
      setMenteeLoading(false);
    }
  }, [toast]);

  // If a mentee is revoked while selected, drop the stale view.
  useEffect(() => {
    if (mentoringMenteeId && !myMentees.some((m) => m.mentee_id === mentoringMenteeId)) {
      setMentoringMenteeId(null);
      setMenteeTrades([]);
      setMenteeNotesByTrade({});
      setNoteEditorTradeId(null);
    }
  }, [myMentees, mentoringMenteeId]);

  // ── Mentor Notes (B4.4) ───────────────────────────────────────────────
  // Group a flat notes array into { [trade_id]: [notes...] }.
  const groupNotesByTrade = (rows) => {
    const by = {};
    for (const r of rows || []) (by[r.trade_id] ||= []).push(r);
    return by;
  };

  // Mentor: load the notes I wrote on a mentee's trades. RLS "mentor reads own
  // notes" scopes this to auth.uid(), so it returns only my own notes.
  const loadMenteeNotes = useCallback(async (menteeId) => {
    if (!isSupabaseConfigured || !supabase || !menteeId) return;
    const { data, error } = await supabase
      .from("mentor_notes")
      .select("id,trade_id,note,created_at")
      .eq("mentee_id", menteeId)
      .order("created_at", { ascending: true });
    if (!error) setMenteeNotesByTrade(groupNotesByTrade(data));
  }, []);

  // Load mentee notes whenever the selected mentee changes.
  useEffect(() => {
    if (mentoringMenteeId) loadMenteeNotes(mentoringMenteeId);
    else setMenteeNotesByTrade({});
  }, [mentoringMenteeId, loadMenteeNotes]);

  // Mentee: load notes written ABOUT me for my Journal (read-only). RLS
  // "mentee reads notes on them" scopes this to auth.uid().
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !authUser?.id) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("mentor_notes")
        .select("id,trade_id,note,created_at")
        .eq("mentee_id", authUser.id)
        .order("created_at", { ascending: true });
      if (!cancelled && !error) setMyTradeNotes(groupNotesByTrade(data));
    })();
    return () => { cancelled = true; };
  }, [authUser?.id]);

  // Mentor writes a note on a mentee's trade. Insert only — RLS "mentor writes
  // note" requires mentor_id = auth.uid() AND is_active_mentor(mentee_id).
  const handleAddNote = useCallback(async (tradeId) => {
    if (!isSupabaseConfigured || !supabase || !authUser?.id || !mentoringMenteeId) return;
    const text = noteDraft.trim();
    if (!text) return;
    setNoteBusy(true);
    try {
      const { error } = await supabase.from("mentor_notes").insert({
        trade_id: tradeId, mentor_id: authUser.id, mentee_id: mentoringMenteeId, note: text,
      });
      if (error) { toast.error(error.message); return; }
      setNoteDraft("");
      setNoteEditorTradeId(null);
      await loadMenteeNotes(mentoringMenteeId);
      toast.success(lang === "he" ? "ההערה נשמרה" : "Note saved");
    } finally { setNoteBusy(false); }
  }, [authUser?.id, mentoringMenteeId, noteDraft, toast, lang, loadMenteeNotes]);

  // Unified symbol pick from the professional search: add to watchlist (if new)
  // AND load it on the chart — one action, one search box.
  const handleSymbolPick = useCallback((tvSym, r) => {
    if (!tvSym) return;
    const type = (r?.type || "").toUpperCase();
    const isCrypto = type === "CRYPTOCURRENCY";
    const rawSym = (r?.symbol || tvSym.split(":").pop() || "").toUpperCase();
    const cleanSym = rawSym.replace(/-USD$/, "").replace(/USDT$/, "");
    const tickerKey = isCrypto ? cleanSym : rawSym;
    const setup = isCrypto ? "Crypto"
      : type === "INDEX" ? "Index"
      : type === "ETF" ? "ETF"
      : type === "CURRENCY" ? "Forex"
      : type === "FUTURE" ? "Future"
      : "Custom";
    setWatchlistItems(prev => {
      if (prev.find(i => i.ticker === tickerKey)) return prev;
      const updated = [...prev, { ticker: tickerKey, price: null, change: null, setup, chartSym: tvSym }];
      try { localStorage.setItem("swingEdgeWatchlist", JSON.stringify(updated)); } catch {}
      return updated;
    });
    setChartSymbol(tvSym);
  }, []);

  const handleDeleteWatchlistTicker = (ticker) => {
    const updated = watchlistItems.filter(i => i.ticker !== ticker);
    setWatchlistItems(updated);
    try { localStorage.setItem("swingEdgeWatchlist", JSON.stringify(updated)); } catch {}
  };

  // POST an image to the OCR endpoint with the caller's Supabase JWT attached.
  // The serverless function rejects anonymous calls to protect its paid Vision
  // key; every user here is logged in (the app sits behind AuthScreen).
  const postOcr = async (dataURL, side, signal) => {
    let token = null;
    try {
      const { data } = await supabase.auth.getSession();
      token = data?.session?.access_token || null;
    } catch {}
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetch("/api/ocr", {
      method: "POST",
      headers,
      body: JSON.stringify({ image: dataURL, side }),
      signal,
    });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataURL = ev.target.result;
      const sideAtUpload = form.side; // capture before async — avoids a stale form.side from an older closure
      // Reset prior read before analyzing a new image.
      setForm(f => ({ ...f, ticker: "", entry: "", stop: "", target: "", tradeImage: file, tradeImagePreview: dataURL }));
      setOcrStatus({ status: "processing", confidence: 0 });
      // Vision can take 3–8s; bail out at 15s so the UI never hangs.
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      try {
        const res = await postOcr(dataURL, sideAtUpload, controller.signal);
        clearTimeout(timer);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setOcrStatus({ status: err.error === "config_error" ? "config_error" : "error", confidence: 0 });
          return;
        }
        const result = await res.json();
        // Never overwrite a field the trader already filled by hand.
        setForm(f => ({
          ...f,
          ticker: f.ticker || result.ticker || f.ticker,
          entry:  f.entry  || (result.entry  != null ? String(result.entry.toFixed(2))  : f.entry),
          stop:   f.stop   || (result.stop   != null ? String(result.stop.toFixed(2))   : f.stop),
          target: f.target || (result.target != null ? String(result.target.toFixed(2)) : f.target),
        }));
        setOcrStatus({ status: "ok", confidence: result.confidence ?? 0 });
      } catch {
        clearTimeout(timer);
        setOcrStatus({ status: "error", confidence: 0 });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyzerImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataURL = ev.target.result;
      const sideAtUpload = analyzerOcrSide; // capture before async — avoids a stale side from an older closure
      setAnalyzerImage(file);
      setAnalyzerImagePreview(dataURL);
      setAnalyzerOcrResult({ status: "processing", confidence: 0 });
      // Vision can take 3–8s; bail out at 15s so the UI never hangs.
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      try {
        const res = await postOcr(dataURL, sideAtUpload, controller.signal);
        clearTimeout(timer);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setAnalyzerOcrResult({
            status: err.error === "config_error" ? "config_error" : "error",
            confidence: 0,
          });
          return;
        }
        const result = await res.json();
        // Never overwrite a field the trader already filled by hand.
        setAnalyzerForm(f => ({
          ...f,
          ticker: f.ticker || result.ticker || f.ticker,
          entry:  f.entry  || (result.entry  != null ? String(result.entry.toFixed(2))  : f.entry),
          stop:   f.stop   || (result.stop   != null ? String(result.stop.toFixed(2))   : f.stop),
          target: f.target || (result.target != null ? String(result.target.toFixed(2)) : f.target),
        }));
        setAnalyzerOcrResult({ status: "ok", confidence: result.confidence ?? 0 });
      } catch {
        clearTimeout(timer);
        setAnalyzerOcrResult({ status: "error", confidence: 0 });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyzerReset = () => {
    setAnalyzerForm({ ticker: "", entry: "", stop: "", target: "", shares: "",
      setup: "Breakout", notes: "", marketCondition: "Trending Up",
      emotionAtEntry: "Neutral", entryQuality: 3 });
    setAnalyzerQuote(null);
    setAnalyzerQuoteLoading(false);
    setAnalyzerImage(null);
    setAnalyzerImagePreview(null);
    setAnalyzerResult(null);
    setAnalyzerOcrSide("LONG");
    setAnalyzerOcrResult(null);
  };

  const analyzeTradeStandalone = () => {
    if (!analyzerForm.ticker || !azEntry || !azStop) {
      setAnalyzerResult({ error: "⚠️ Fill at least: Ticker, Entry and Stop Loss." });
      return;
    }
    setAnalyzerLoading(true); setAnalyzerResult(null);
    const result = SwingEdgeAI.analyzeStandalone({
      entry: azEntry,
      stop: azStop,
      target: azTarget,
      side: inferSide(azEntry, azStop, azTarget),
      capital,
      shares: azShares,
      setup: analyzerForm.setup,
      notes: analyzerForm.notes,
      marketCondition: analyzerForm.marketCondition,
      emotionAtEntry: analyzerForm.emotionAtEntry,
      entryQuality: analyzerForm.entryQuality,
    }, realTrades, lang, { marketData: regimeOverview });
    setAnalyzerResult(result);
    setAnalyzerLoading(false);
  };

  // ─── CHART QUICK ACTIONS — screenshot → OCR ──────────────────────────────
  // The two floating chart buttons capture ONE frame of the current tab and send
  // it to /api/ocr, which reads the real TradingView Long/Short Position tool.
  // The TradingView iframe is cross-origin (its DOM is unreadable) but pixel
  // capture via getDisplayMedia is allowed — that is the whole point. The result
  // routes to the journal form or the position calculator. Where screen capture
  // is unavailable (iOS/Safari/mobile) or the user cancels the picker, we fall
  // back to the existing file/camera input — never to a hard-coded template.

  // Draw one frame of a display-capture stream to a canvas and return a JPEG data
  // URL, downscaled to ≤2000px wide and kept under the endpoint's 6MB ceiling.
  // The CALLER stops the stream's tracks (see handleChartAiExtract) — this only reads.
  const grabChartFrame = (stream) =>
    new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      const fail = (e) => reject(e instanceof Error ? e : new Error("capture_failed"));
      video.onerror = () => fail(new Error("video_error"));
      video.onloadedmetadata = () => {
        video.play().then(() => {
          // One rAF lets the first frame paint before we read pixels.
          requestAnimationFrame(() => {
            try {
              let w = video.videoWidth;
              let h = video.videoHeight;
              if (!w || !h) { fail(new Error("empty_frame")); return; }
              if (w > 2000) { h = Math.round((h * 2000) / w); w = 2000; }
              const canvas = document.createElement("canvas");
              canvas.width = w;
              canvas.height = h;
              canvas.getContext("2d").drawImage(video, 0, 0, w, h);
              let dataURL = canvas.toDataURL("image/jpeg", 0.92);
              // Safety net vs the /api/ocr 6MB cap (base64 ≈ 4/3 of raw bytes).
              if (dataURL.length * 0.75 > 6 * 1024 * 1024) {
                dataURL = canvas.toDataURL("image/jpeg", 0.8);
              }
              resolve(dataURL);
            } catch (e) { fail(e); }
          });
        }).catch(fail);
      };
    });

  // Route an OCR result to the journal form or the position calculator. Never
  // overwrites a field the trader already filled by hand (mirrors handleImageUpload).
  const routeChartOcr = (result, target, dataURL) => {
    const confidence = result.confidence ?? 0;
    if (target === "position") {
      setPosCalc(f => ({
        ...f,
        ticker: result.ticker || f.ticker,
        capital: f.capital || String(capital),
        risk: f.risk || "1",
        entry: result.entry != null ? String(result.entry.toFixed(2)) : f.entry,
        stop:  result.stop  != null ? String(result.stop.toFixed(2))  : f.stop,
      }));
      setTab("position");
    } else {
      setForm(f => ({
        ...f,
        ticker: f.ticker || result.ticker || f.ticker,
        entry:  f.entry  || (result.entry  != null ? String(result.entry.toFixed(2))  : f.entry),
        stop:   f.stop   || (result.stop   != null ? String(result.stop.toFixed(2))   : f.stop),
        target: f.target || (result.target != null ? String(result.target.toFixed(2)) : f.target),
        tradeImagePreview: f.tradeImagePreview || dataURL, // show the captured frame for verification
      }));
      setOcrStatus({ status: "ok", confidence }); // journal-modal badge, matches handleImageUpload
      setShowForm(true);
    }
    setChartOcrStatus({ status: "ok", confidence });
  };

  // Shared OCR call for BOTH the capture path and the file-fallback path. Mirrors
  // handleImageUpload: 15s abort, config_error vs error, then route by target.
  const runChartOcr = async (dataURL, target, sideHint) => {
    setChartOcrStatus({ status: "processing", confidence: 0 });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await postOcr(dataURL, sideHint, controller.signal);
      clearTimeout(timer);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setChartOcrStatus({ status: err.error === "config_error" ? "config_error" : "error", confidence: 0 });
        return;
      }
      const result = await res.json();
      routeChartOcr(result, target, dataURL);
    } catch {
      clearTimeout(timer);
      setChartOcrStatus({ status: "error", confidence: 0 });
    } finally {
      setChartAiLoading(false);
      setChartAiTarget(null);
    }
  };

  // Graceful fallback: open the file/camera picker. Clearing the loading flag
  // BEFORE the native dialog matters — a cancelled file dialog fires no event, so
  // a spinner tied to it would hang. handleChartFileFallback re-arms it if a file
  // is actually chosen.
  const openChartFallback = () => {
    setChartAiLoading(false);
    setChartAiTarget(null);
    chartFileRef.current?.click();
  };

  // onChange for the hidden fallback input — runs the same OCR → route pipeline.
  // Reads target/side from refs because this fires long after the original click.
  const handleChartFileFallback = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file later
    if (!file) return;
    const target = chartTargetRef.current || "journal";
    const reader = new FileReader();
    reader.onload = (ev) => {
      setChartAiTarget(target);
      setChartAiLoading(true);
      runChartOcr(ev.target.result, target, chartSideRef.current);
    };
    reader.readAsDataURL(file);
  };

  // Click handler for the two floating chart buttons.
  const handleChartAiExtract = async (target, ev) => {
    if (chartAiLoading) return;              // guard the double-click race
    const btn = ev?.currentTarget || null;   // capture now — currentTarget is nulled after the event
    const sideHint = target === "journal" ? form.side : "LONG"; // side snapshot (API reads direction anyway)
    chartTargetRef.current = target;
    chartSideRef.current = sideHint;
    setChartAiTarget(target);
    setChartAiLoading(true);

    const md = navigator.mediaDevices;
    if (!md || typeof md.getDisplayMedia !== "function") {
      // No screen capture (iOS/Safari/mobile). This runs synchronously inside the
      // click gesture, so the file/camera dialog is allowed to open.
      openChartFallback();
      return;
    }

    let stream;
    try {
      stream = await md.getDisplayMedia({
        video: { width: { ideal: 2560 }, height: { ideal: 1440 } },
        audio: false,
        preferCurrentTab: true,
        selfBrowserSurface: "include",
      });
    } catch {
      // Cancelled / denied is NOT an error — fall back to the file input.
      btn?.focus();
      openChartFallback();
      return;
    }

    let dataURL;
    try {
      dataURL = await grabChartFrame(stream);
    } catch {
      setChartOcrStatus({ status: "error", confidence: 0 });
      setChartAiLoading(false);
      setChartAiTarget(null);
      return;
    } finally {
      // Stop the capture the instant we have the frame — BEFORE the OCR round trip
      // — so the screen is never shared during the network call (privacy + memory).
      stream.getTracks().forEach(tr => tr.stop());
      btn?.focus(); // return focus to the button now the picker has closed
    }

    await runChartOcr(dataURL, target, sideHint);
  };

  // Auth gate — block app until we know session state
  if (!authReady) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] dark:bg-[#0a0f1e] text-slate-300 flex items-center justify-center" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="animate-pulse">
            <Logo size={40} showText={false} />
          </div>
          <span className="text-xs tracking-widest uppercase text-slate-500">{t.loadingSwingEdge}</span>
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
    <div className="min-h-screen bg-[var(--bg-primary)] dark:bg-[#0a0f1e] text-slate-200 font-sans flex flex-col" dir={isRTL ? "rtl" : "ltr"} style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>

      {/* ── BETA WELCOME (first login only) ── */}
      {showBetaWelcome && (
        <BetaWelcome
          userName={authUser?.user_metadata?.full_name || authUser?.user_metadata?.name || userProfile?.profileName}
          onStart={dismissBetaWelcome}
        />
      )}

      {/* ── GUIDED TOUR (once, after BetaWelcome — wave 3a) ── */}
      {showTour && (
        <OnboardingTour steps={buildTourSteps(t)} onClose={completeTour} t={t} isRTL={isRTL} />
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
          <button onClick={() => setAlertNotification(null)} aria-label={lang === "he" ? "סגור" : "Dismiss"} className="absolute top-2 right-2 rtl:right-auto rtl:left-2 text-slate-500 hover:text-white"><X size={12} /></button>
        </div>
      )}

      {/* ── HEADER ── */}
      <header dir="ltr" className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-subtle)] dark:border-white/[0.06] bg-[var(--bg-elevated)] sticky top-0 z-50" style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top))" }}>
        {/* Logo + User Menu (left side, combined) */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowProfileDropdown(v => !v)}
            className="flex items-center gap-2 hover:bg-white/[0.04] active:bg-white/[0.07] rounded-lg px-2 py-1 transition whitespace-nowrap shrink-0"
            aria-label={t.openUserMenu}
          >
            <Logo size={28} showText={false} />
            <span className="font-bold text-sm tracking-wider text-white whitespace-nowrap">SWING<span className="text-emerald-400">EDGE</span></span>
            <span className="ms-1 text-[10px] px-1.5 py-0.5 rounded text-slate-500 border border-slate-700 tracking-widest uppercase hidden sm:inline">{t.pro}</span>
            <ChevronDown size={13} className={`text-slate-400 transition-transform ${showProfileDropdown ? "rotate-180" : ""}`} />
          </button>
          {showProfileDropdown && (
            <>
              <button type="button"
                className="fixed inset-0 bg-black/40 backdrop-blur-[1px] z-[9998] animate-fade-in"
                onClick={() => setShowProfileDropdown(false)}
              />
              <div
                className="bg-[#131a2c] border border-[var(--border-subtle)] dark:border-white/[0.08] rounded-xl overflow-hidden animate-fade-in flex flex-col"
                style={{
                  position: "fixed",
                  top: 60,
                  left: 16,
                  width: 280,
                  maxWidth: "calc(100vw - 32px)",
                  maxHeight: "calc(100vh - 80px)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                  zIndex: 99999,
                }}
              >
                {/* HEADER */}
                <div className="px-4 py-3 border-b border-[var(--border-subtle)] dark:border-white/[0.06] bg-gradient-to-r from-cyan-500/5 to-violet-500/5">
                  <p className="text-sm font-bold text-white truncate">{userProfile?.profileName || authUser?.user_metadata?.full_name || "Trader"}</p>
                  {authUser?.email && (
                    <p className="text-[11px] text-slate-400 mt-0.5 font-mono truncate">{authUser.email}</p>
                  )}
                  <span className="inline-block mt-2 text-[9px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold tracking-wider uppercase">
                    {t.betaTester}
                  </span>
                </div>

                {/* SCROLLABLE BODY */}
                <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                  {/* TOOLS */}
                  <div className="px-2 py-1.5 text-[9px] font-bold tracking-widest uppercase text-slate-500">{t.tools}</div>
                  <UserMenuItem icon={MessageCircle} label={t.sendFeedback}  color="text-violet-400" onClick={() => { setTab("feedback"); setShowProfileDropdown(false); }} />
                  <UserMenuItem icon={Settings}      label={t.settings}      color="text-cyan-400"    onClick={() => { setTab("settings"); setShowProfileDropdown(false); }} />
                  <UserMenuItem icon={HelpCircle}    label={t.helpDocs}      color="text-blue-400"   onClick={() => { setShowHelpModal(true); setShowProfileDropdown(false); }} />
                  <UserMenuItem icon={Bell}          label={t.notifications} color="text-amber-400"  onClick={() => { toast.info(t.notifications); setShowProfileDropdown(false); }} />
                  {pwaPromptEvent && (
                    <UserMenuItem icon={Smartphone} label={t.installApp} color="text-cyan-400" onClick={() => { handleInstallPwa(); }} />
                  )}

                  {isAdmin && (
                    <>
                      <div className="my-1.5 h-px bg-white/[0.06]" />
                      <div className="px-2 py-1.5 text-[9px] font-bold tracking-widest uppercase text-amber-400">{t.admin}</div>
                      <UserMenuItem icon={Shield} label={t.adminPanel} color="text-amber-300" onClick={() => { setTab("admin"); setShowProfileDropdown(false); }} />
                    </>
                  )}

                  <div className="my-1.5 h-px bg-white/[0.06]" />

                  {/* ACCOUNT */}
                  <div className="px-2 py-1.5 text-[9px] font-bold tracking-widest uppercase text-slate-500">{t.account}</div>
                  <UserMenuItem icon={Lock}       label={t.privacySecurity} color="text-slate-300"   onClick={() => { setShowPrivacyModal(true); setShowProfileDropdown(false); }} />
                  <UserMenuItem icon={CreditCard} label={t.billingAndPlan}  color="text-emerald-400" onClick={() => { setShowBillingModal(true); setShowProfileDropdown(false); }} />
                  {isSupabaseConfigured && session && (
                    <button
                      onClick={handleLogout}
                      className="w-full h-10 px-3 flex items-center gap-3 rounded-lg hover:bg-rose-500/10 transition-[background-color] duration-150 text-start text-rose-400">
                      <LogOut size={16} />
                      <span className="text-sm font-semibold flex-1">{t.logout}</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Status + Account (right side) */}
        <div className="flex items-center gap-3 min-w-0">
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
          <div className="text-end hidden sm:block">
            <div className="text-xs text-slate-500">{t.account}</div>
            <div className="text-sm font-bold font-mono text-cyan-400">${curEquity.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
      </header>

      {/* ── LIVE TICKER TAPE (TradingView) ── */}
      <TVTickerTape />

      {/* ── NAV ── */}
      <nav data-tour="main-nav" className="flex flex-wrap sm:flex-nowrap items-center justify-center sm:justify-start gap-0 px-2 sm:px-5 border-b border-[var(--border-subtle)] dark:border-white/[0.06] bg-[var(--bg-elevated)] sm:overflow-x-auto">
        {[
          ...NAV_KEYS,
          // Mentoring tab (B4.3) — only for users who are an active mentor.
          ...(myMentees.length > 0 ? [{ id: "mentoring", key: "mentoringTab", icon: Users }] : []),
        ].map(({ id, key, icon: Icon }) => (
          <button key={id} data-tour-tab={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-3 text-xs font-semibold tracking-wide transition-all whitespace-nowrap border-b-2 shrink-0
              ${tab === id
                ? "text-white border-emerald-400"
                : "text-slate-500 border-transparent hover:text-slate-300 hover:border-slate-600"}`}>
            <Icon size={13} />
            {t[key]}
          </button>
        ))}
      </nav>

      {/* ── CONTENT ── */}
      <main ref={mainScrollRef} className="flex-1 p-4 md:p-5 space-y-5 pb-24 md:pb-5">

        {/* ══════════════ MENTORING (B4.3 — read-only mentee view) ══════════════ */}
        {tab === "mentoring" && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-[var(--v3-accent)]" />
              <h2 className="text-lg font-bold text-white">{t.mentoringTab}</h2>
            </div>
            <p className="text-xs text-[var(--v3-text-lo)] -mt-3">{t.mentoringPickMentee}</p>

            {/* Mentee list — teaser (count + win rate) per active mentee */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {myMentees.map((m) => {
                const teaser = menteeTeasers[m.mentee_id];
                const active = mentoringMenteeId === m.mentee_id;
                return (
                  <button
                    key={m.id}
                    onClick={() => selectMentee(m.mentee_id)}
                    className={`text-start rounded-[var(--v3-radius-card)] p-4 border transition-all bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)]
                      ${active
                        ? "border-[var(--v3-accent)] ring-1 ring-[var(--v3-accent)]/40"
                        : "border-[var(--border-subtle)] dark:border-white/[0.06] hover:border-[var(--v3-accent)]/40"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-bold text-[var(--v3-accent)] tracking-wider">
                        {m.mentee_id.slice(0, 8)}
                      </span>
                      {active && <Eye size={14} className="text-[var(--v3-accent)]" />}
                    </div>
                    <div className="mt-2 text-xs text-[var(--v3-text-mid)]">
                      {teaser
                        ? `${teaser.count} ${t.tradesUnit} · ${formatPct(teaser.winRate)} ${t.winRateShort}`
                        : t.menteeNoTrades}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected mentee panel — read-only */}
            {mentoringMenteeId && (
              <div className="space-y-4">
                {/* Context banner — clearly separates mentee data from the mentor's own */}
                <div className="flex flex-wrap items-center gap-2 rounded-[var(--v3-radius-card)] px-4 py-3 bg-[var(--v3-accent-glow)] border border-[var(--v3-accent)]/30">
                  <Eye size={15} className="text-[var(--v3-accent)]" />
                  <span className="text-sm font-semibold text-white">
                    {t.viewingAsMentor} <span className="font-mono text-[var(--v3-accent)]">{mentoringMenteeId.slice(0, 8)}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-[var(--v3-radius-pill)] bg-[var(--v3-accent)]/15 text-[var(--v3-accent)]">
                    <Lock size={10} /> {t.readOnlyNotice}
                  </span>
                </div>

                {menteeLoading ? (
                  <div className="text-center text-sm text-[var(--v3-text-lo)] py-10">…</div>
                ) : menteeRealTrades.length === 0 ? (
                  <div className="text-center text-sm text-[var(--v3-text-lo)] py-10">{t.menteeNoTrades}</div>
                ) : (
                  <>
                    {/* Trading DNA — the mentee's, not the mentor's */}
                    <DNACard dna={menteeDNA} lang={lang} />

                    {/* Core stat cards from the mentee's own stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <StatCard label={t.winRate}      value={formatPct(menteeStats.winRate)} sub={`${menteeStats.wins}W / ${menteeStats.losses}L`} icon={Target}     accent="purple" />
                      <StatCard label={t.avgRMultiple} value={fmtR(menteeStats.avgR)}         sub={t.perClosedTrade}                                icon={Activity}   accent="amber" />
                      <StatCard label={t.netPnlClosed} value={fmt$(Math.round(menteeStats.totalPnL * 100) / 100)} sub={`${menteeStats.total} ${t.closedTrades}`} icon={TrendingUp} accent={menteeStats.totalPnL >= 0 ? "green" : "red"} />
                      <StatCard label={t.streakCounter} value={menteeStats.currentStreak}      sub={`${t.bestStreak}: ${menteeStats.bestStreak}`}    icon={Zap}        accent={menteeStats.currentStreak >= 3 ? "green" : "amber"} />
                    </div>

                    {/* Read-only trade table — NO edit/close/delete/bulk affordances */}
                    <div className="rounded-[var(--v3-radius-card)] border border-[var(--border-subtle)] dark:border-white/[0.06] overflow-x-auto bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)]">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-[11px] uppercase tracking-widest text-[var(--v3-text-lo)] border-b border-[var(--border-subtle)] dark:border-white/[0.06]">
                            <th className="text-start font-semibold px-3 py-2">{t.ticker || "Ticker"}</th>
                            <th className="text-start font-semibold px-3 py-2">{t.side || "Side"}</th>
                            <th className="text-start font-semibold px-3 py-2">{t.date || "Date"}</th>
                            <th className="text-end font-semibold px-3 py-2">{t.entry || "Entry"}</th>
                            <th className="text-end font-semibold px-3 py-2">{t.exit || "Exit"}</th>
                            <th className="text-end font-semibold px-3 py-2">P&amp;L</th>
                            <th className="text-end font-semibold px-3 py-2">R</th>
                            <th className="text-center font-semibold px-3 py-2">{t.notesLabel}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {menteeRealTrades.map((tr) => {
                            const mm = calcTradeMetrics(tr);
                            const closed = tr.status === "CLOSED";
                            const notes = menteeNotesByTrade[tr.id] || [];
                            const editing = noteEditorTradeId === tr.id;
                            return (
                              <Fragment key={tr.id}>
                              <tr className="border-b border-[var(--border-subtle)] dark:border-white/[0.04]">
                                <td className="px-3 py-2 font-mono font-bold text-white">{tr.ticker}</td>
                                <td className="px-3 py-2 text-[var(--v3-text-mid)]">{tr.side}</td>
                                <td className="px-3 py-2 text-[var(--v3-text-lo)] font-mono">{tr.date}</td>
                                <td className="px-3 py-2 text-end font-mono text-[var(--v3-text-mid)]">{tr.entry != null ? `$${tr.entry}` : "—"}</td>
                                <td className="px-3 py-2 text-end font-mono text-[var(--v3-text-mid)]">{closed && tr.exit != null ? `$${tr.exit}` : "—"}</td>
                                <td className={`px-3 py-2 text-end font-mono font-semibold ${!closed ? "text-[var(--v3-text-lo)]" : (mm.pnl || 0) >= 0 ? "text-[var(--v3-accent)]" : "text-[var(--v3-loss)]"}`}>
                                  {closed ? fmt$(Math.round((mm.pnl || 0) * 100) / 100) : "—"}
                                </td>
                                <td className={`px-3 py-2 text-end font-mono ${!closed ? "text-[var(--v3-text-lo)]" : (mm.rMultiple || 0) >= 0 ? "text-[var(--v3-accent)]" : "text-[var(--v3-loss)]"}`}>
                                  {closed ? fmtR(mm.rMultiple) : "—"}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <button
                                    onClick={() => { setNoteEditorTradeId(editing ? null : tr.id); setNoteDraft(""); }}
                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-[var(--v3-radius-chip)] text-xs font-semibold transition-colors
                                      ${editing ? "bg-[var(--v3-accent)]/20 text-[var(--v3-accent)]" : "text-[var(--v3-text-lo)] hover:text-[var(--v3-accent)] hover:bg-white/5"}`}
                                    title={t.addNote}
                                  >
                                    <MessageCircle size={13} />
                                    {notes.length > 0 && <span className="font-mono">{notes.length}</span>}
                                  </button>
                                </td>
                              </tr>
                              {editing && (
                                <tr className="bg-white/[0.02]">
                                  <td colSpan={8} className="px-3 py-3">
                                    <div className="space-y-2">
                                      {notes.length > 0 && (
                                        <ul className="space-y-1.5">
                                          {notes.map((n) => (
                                            <li key={n.id} className="text-xs text-[var(--v3-text-mid)] bg-[var(--v3-accent-glow)] border border-[var(--v3-accent)]/20 rounded-[var(--v3-radius-chip)] px-3 py-2">
                                              <span className="whitespace-pre-wrap break-words">{n.note}</span>
                                              <span className="block mt-1 text-[10px] text-[var(--v3-text-lo)] font-mono">{new Date(n.created_at).toLocaleString()}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                      <div className="flex items-start gap-2">
                                        <textarea
                                          value={noteDraft}
                                          onChange={(e) => setNoteDraft(e.target.value.slice(0, 5000))}
                                          rows={2}
                                          maxLength={5000}
                                          placeholder={t.notePlaceholder}
                                          className="flex-1 text-sm bg-white/5 border border-[var(--border-subtle)] dark:border-white/[0.10] rounded-lg px-3 py-2 text-white placeholder:text-[var(--v3-text-lo)] focus:border-[var(--v3-accent)] focus:outline-none resize-y"
                                        />
                                        <button
                                          onClick={() => handleAddNote(tr.id)}
                                          disabled={noteBusy || !noteDraft.trim()}
                                          className="shrink-0 px-3 py-2 rounded-lg text-sm font-semibold bg-[var(--v3-accent-glow)] border border-[#00C076]/30 text-[var(--v3-accent)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--v3-accent)]/20 transition-colors"
                                        >
                                          {t.saveNote}
                                        </button>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                              </Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══════════════ DASHBOARD ══════════════ */}
        {tab === "dashboard" && (
          <div className="space-y-5 animate-fade-in">
            <>
            {realTrades.length === 0 && (
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-6 text-center mb-6">
                <div className="text-5xl mb-3">👋</div>
                <h2 className="text-white font-bold text-xl mb-2">{t.welcomeTitle}</h2>
                <p className="text-slate-400 text-sm mb-4 leading-relaxed">
                  {t.welcomeBody1}<br/>
                  {t.welcomeBody2}
                </p>
                <button
                  onClick={() => setTab('journal')}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/20">
                  ➕ {t.addFirstTrade}
                </button>
              </div>
            )}
            {/* KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard label={t.accountEquity}  value={`$${curEquity.toLocaleString("en-US", {minimumFractionDigits:0})}`} sub={`${t.startedAt} $${capital.toLocaleString()}`} trend={totalPnL/capital*100} icon={DollarSign} accent="cyan"
                info={lang === "he"
                  ? `הון = בסיס ההון שהגדרת ($${capital.toLocaleString()}) בתוספת P&L מצטבר מעסקאות סגורות ופתוחות. הסיכון לכל עסקה מחושב תמיד מבסיס ההון הקבוע — לא מההון הנוכחי.`
                  : `Equity = your capital base ($${capital.toLocaleString()}) plus cumulative P&L from closed & open trades. Per-trade risk is always sized from your fixed capital base — not current equity.`} />
              <StatCard label={t.netPnlClosed} value={fmt$(Math.round(totalPnL * 100) / 100)} sub={`${closedTrades.length} ${t.closedTrades}`} trend={stats.returnPct} trendText={formatReturnPct(stats.returnPct)} icon={TrendingUp} accent={totalPnL >= 0 ? "green" : "red"} />
              <StatCard label={<span className="flex items-center gap-1">{t.winRate}<TermTooltip term="winRate" lang={lang} /></span>} value={formatPct(winRate)} sub={`${closedTrades.filter(t=>(calcTradeMetrics(t).pnl||0)>0).length}W / ${closedTrades.filter(t=>(calcTradeMetrics(t).pnl||0)<0).length}L`} icon={Target} accent="purple" />
              <StatCard label={<span className="flex items-center gap-1">{t.avgRMultiple}<TermTooltip term="avgR" lang={lang} /></span>} value={fmtR(avgR)} sub={t.perClosedTrade} icon={Activity} accent="amber" />
              <StatCard label={t.dailyPnl} value={fmt$(Math.round(dailyPnL))} sub={t.todayTrades} icon={DollarSign} accent={dailyPnL >= 0 ? "green" : "red"} />
              <StatCard label={t.streakCounter} value={<span className="flex items-center gap-1">{currentStreak > 0 && <Flame size={18} className="text-orange-400" />}{currentStreak}</span>} sub={`${t.bestStreak}: ${bestStreak}`} icon={Zap} accent={currentStreak >= 3 ? "green" : "amber"} />
            </div>

            {/* Missing live-price disclosure — Account Equity & Today's P&L exclude these open trades */}
            {openPnL.missingCount > 0 && (
              <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-amber-500 rtl:flex-row-reverse">
                <AlertTriangle size={14} />
                <span>{t.missingPriceWarn.replace('{n}', String(openPnL.missingCount))}</span>
              </div>
            )}

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
              <div data-tour="trading-dna"><DNACard dna={aiDNA} lang={lang} /></div>
              <GrowthChart
                evolution={aiEvolution}
                current={aiGrowth.total}
                delta={aiGrowthReport.delta}
                lang={lang}
              />
              <RegimeIndicator regime={aiRegime} lang={lang} />
            </div>

            {/* ══ GROWTH PREDICTOR — 3 questions + 24mo compound forecast ══ */}
            <GrowthPredictor
              trades={realTrades}
              stats={stats}
              capital={capital}
              lang={lang}
            />

            {/* Top Edge & Anti-Edge */}
            {(aiEdges?.topEdge || aiEdges?.topAntiEdge) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {aiEdges.topEdge && <EdgeCard edge={aiEdges.topEdge} lang={lang} variant="edge" />}
                {aiEdges.topAntiEdge && <EdgeCard edge={aiEdges.topAntiEdge} lang={lang} variant="anti" />}
              </div>
            )}

            {/* ── Master Stats Hub — Top Edges / Anti-Edges (Setup × Emotion) ── */}
            {(stats.topEdges.length > 0 || stats.antiEdges.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stats.topEdges.length > 0 && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4">
                    <h3 className="text-emerald-400 font-bold text-sm mb-3 flex items-center gap-1.5">🎯 {t.topEdges}<TermTooltip term="edge" lang={lang} /></h3>
                    {stats.topEdges.map((edge, i) => (
                      <div key={edge.name || i} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                        <div>
                          <PatternTags parts={[{ dim: "setup", value: edge.setup }, { dim: "emotion", value: edge.emotion }]} lang={lang} />
                          <div className="text-slate-400 text-xs">{nTrades(edge.count, lang)}</div>
                        </div>
                        <div className="text-end">
                          <div className="text-emerald-400 font-bold text-sm">{formatPct(edge.winRate)} WR</div>
                          <div className="text-slate-300 text-xs">${edge.totalPnL.toFixed(0)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {stats.antiEdges.length > 0 && (
                  <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4">
                    <h3 className="text-rose-400 font-bold text-sm mb-3 flex items-center gap-1.5">⚠️ {t.antiEdges}<TermTooltip term="antiEdge" lang={lang} /></h3>
                    {stats.antiEdges.map((edge, i) => (
                      <div key={edge.name || i} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                        <div>
                          <PatternTags parts={[{ dim: "setup", value: edge.setup }, { dim: "emotion", value: edge.emotion }]} lang={lang} />
                          <div className="text-slate-400 text-xs">{nTrades(edge.count, lang)}</div>
                        </div>
                        <div className="text-end">
                          <div className="text-rose-400 font-bold text-sm">{formatPct(edge.winRate)} WR</div>
                          <div className="text-slate-300 text-xs">${edge.totalPnL.toFixed(0)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Mini Equity + Open Positions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Equity mini */}
              <div className="md:col-span-2 bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold tracking-widest uppercase text-slate-500">{t.equityCurve}</span>
                  <span className="text-xs text-cyan-400 font-mono">{equityCurve.length} {t.dataPts}</span>
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={equityCurve}>
                    <defs>
                      <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--v3-info)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="var(--v3-info)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--v3-line)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--v3-text-lo)" }} tickLine={false} axisLine={false} tickFormatter={v => typeof v === "string" && v.length === 10 && v[4] === "-" ? v.slice(5) : v} minTickGap={40} />
                    <YAxis domain={equityYDomain(equityCurve)} tick={{ fontSize: 11, fill: "var(--v3-text-lo)" }} tickLine={false} axisLine={false} tickFormatter={fmtAxisMoney} width={52} />
                    <ReferenceLine y={capital} stroke="var(--v3-text-lo)" strokeDasharray="4 4" />
                    <Tooltip contentStyle={{ background: "var(--v3-bg-panel)", border: "1px solid var(--v3-line)", borderRadius: 8, fontSize: 11 }} formatter={(v) => [`$${v.toLocaleString()}`, "Equity"]} />
                    <Area type="monotone" dataKey="equity" stroke="var(--v3-info)" strokeWidth={2} fill="url(#eqGrad)" dot={{ fill: "var(--v3-info)", r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Open trades */}
              <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-xl p-4">
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
                      <div key={tr.id} className="bg-white/3 rounded-lg p-3 border border-[var(--border-subtle)] dark:border-white/[0.06]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <TickerLogo ticker={tr.ticker} size={18} />
                            <span className="font-bold text-sm text-white font-mono">{tr.ticker}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${tr.side === "LONG" ? "bg-[var(--v3-accent)]/10 text-[var(--v3-accent)] border border-[var(--v3-accent)]/20" : "bg-[var(--v3-loss)]/10 text-[var(--v3-loss)] border border-[var(--v3-loss)]/20"}`}>{tr.side}</span>
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
                          <span>Stop <span className="text-[var(--v3-loss)]">${tr.stop}</span></span>
                          <span>P&L <span className={livePnl !== null ? (livePnl >= 0 ? "text-[var(--v3-accent)] font-bold" : "text-[var(--v3-loss)] font-bold") : "text-slate-600"}>{livePnl !== null ? fmt$(Math.round(livePnl)) : "..."}</span></span>
                        </div>
                        {livePnlPct !== null && (
                          <div className="mt-1.5 h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${livePnl >= 0 ? "bg-gradient-to-r from-[var(--v3-accent)] to-cyan-500" : "bg-gradient-to-r from-[var(--v3-loss)] to-rose-500"}`}
                              style={{ width: `${Math.min(Math.abs(livePnlPct) * 10, 100)}%` }} />
                          </div>
                        )}
                        <div className="mt-2 flex justify-end">
                          <button onClick={() => { setClosingTrade(tr); setShowCloseForm(true); }}
                            className="text-[10px] px-2 py-1 rounded bg-[var(--v3-loss)]/10 border border-[var(--v3-loss)]/20 text-[var(--v3-loss)] hover:opacity-80 transition">
                            Close
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {openTrades.length === 0 && (
                    <div className="text-center py-4 text-slate-700 text-xs">{t.noOpenPositions}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Closed */}
            {(() => {
              const recentClosed = closedTrades.slice(-5).reverse();
              return (
            <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold tracking-widest uppercase text-slate-500">{t.recentClosed}</span>
              </div>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-600 border-b border-[var(--border-subtle)] dark:border-white/[0.06]">
                      {[t.colTicker,t.colDate,t.colSide,t.colEntry,t.colExit,t.colShares,"P&L",t.colRMultiple,t.colSetup].map(h => (
                        <th key={h} className="pb-2 text-start font-semibold tracking-wider pe-4">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentClosed.map(t => {
                      const { pnl, rMultiple } = calcTradeMetrics(t);
                      const win = pnl > 0;
                      return (
                        <tr key={t.id} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                          <td className="py-2 pe-4 font-bold text-white font-mono"><div className="flex items-center gap-1.5"><TickerLogo ticker={t.ticker} size={16} />{t.ticker}</div></td>
                          <td className="py-2 pe-4 text-slate-500">{t.date}</td>
                          <td className="py-2 pe-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${t.side==="LONG"?"bg-[var(--v3-accent)]/10 text-[var(--v3-accent)] border border-[var(--v3-accent)]/20":"bg-[var(--v3-loss)]/10 text-[var(--v3-loss)] border border-[var(--v3-loss)]/20"}`}>{t.side}</span></td>
                          <td className="py-2 pe-4 font-mono text-slate-300">${t.entry}</td>
                          <td className="py-2 pe-4 font-mono text-slate-300">${t.exit}</td>
                          <td className="py-2 pe-4 font-mono text-slate-400">{t.shares}</td>
                          <td className={`py-2 pe-4 font-bold font-mono ${win ? "text-[var(--v3-accent)]" : "text-[var(--v3-loss)]"}`}>{fmt$(Math.round(pnl))}</td>
                          <td className={`py-2 pe-4 font-bold font-mono ${rMultiple >= 0 ? "text-cyan-400" : "text-[var(--v3-loss)]"}`}>{fmtR(rMultiple)}</td>
                          <td className="py-2 pe-4"><span className="inline-flex items-center gap-1"><span className="text-[10px] px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">{labelFor("setup", t.setup, lang)}</span><SetupTagTip setup={t.setup} isRTL={isRTL} /></span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden flex flex-col gap-2">
                {recentClosed.map(t => (
                  <MobileTradeCard key={t.id} trade={t} isRTL={isRTL} lang={lang} />
                ))}
              </div>
            </div>
              );
            })()}

            {/* ══ RISK DASHBOARD ══ */}
            {(() => {
              const MAX_RISK_PCT = maxRiskPct; // % of capital — derived from per-trade risk state
              const maxRiskDollar = capital * (MAX_RISK_PCT / 100);

              const openRisks = openTrades.map(t => {
                const riskDollar = Math.abs(t.entry - t.stop) * t.shares;
                const riskPct = capital > 0 ? (riskDollar / capital) * 100 : 0;
                const rrRatio = t.target ? priceBasedRR(t.entry, t.stop, t.target) : null;
                return { ...t, riskDollar, riskPct, rrRatio };
              });

              const totalRiskDollar = openRisks.reduce((s, t) => s + t.riskDollar, 0);
              const totalRiskPct = capital > 0 ? (totalRiskDollar / capital) * 100 : 0;
              const usedPct = Math.min((totalRiskPct / MAX_RISK_PCT) * 100, 100);
              const isOverLimit = totalRiskPct > MAX_RISK_PCT;
              const isWarning = totalRiskPct > MAX_RISK_PCT * 0.7;

              const meterColor = isOverLimit
                ? { bar: "bg-[var(--v3-loss)]", text: "text-[var(--v3-loss)]", border: "border-[var(--v3-loss)]/30", bg: "bg-[var(--v3-loss)]/8" }
                : isWarning
                ? { bar: "bg-amber-400", text: "text-amber-400", border: "border-amber-400/30", bg: "bg-amber-400/8" }
                : { bar: "bg-[var(--v3-accent)]", text: "text-[var(--v3-accent)]", border: "border-[var(--v3-accent)]/30", bg: "bg-[var(--v3-accent)]/8" };

              return (
                <div className="space-y-4">
                  {/* Alert banner */}
                  {isOverLimit && (
                    <div className="flex items-center gap-3 bg-[var(--v3-loss)]/10 border border-[var(--v3-loss)]/30 rounded-xl px-4 py-3">
                      <AlertTriangle size={15} className="text-[var(--v3-loss)] shrink-0" />
                      <span className="text-xs text-[var(--v3-loss)] font-semibold">
                        {t.warningRiskOver}
                      </span>
                    </div>
                  )}

                  {/* Section header */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold tracking-widest uppercase text-slate-500">{t.riskDashboard}</span>
                    <div className="flex-1 h-px bg-white/[0.05]" />
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold font-mono ${meterColor.text} ${meterColor.border} ${meterColor.bg}`}>
                      {isOverLimit ? t.riskOverLimit : isWarning ? t.riskCaution : t.riskSafe}
                    </span>
                  </div>

                  {/* KPI cards + meter */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Total open risk */}
                    <div className={`bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border rounded-xl p-4 ${meterColor.border}`}>
                      <span className="text-[11px] font-semibold tracking-widest uppercase text-slate-500 block mb-1">{t.totalOpenRisk}</span>
                      <span className={`text-2xl font-bold font-mono ${meterColor.text}`}>{totalRiskPct.toFixed(2)}%</span>
                      <span className="text-xs text-slate-500 block mt-0.5 font-mono">${totalRiskDollar.toFixed(2)}</span>
                      <span className="text-[10px] text-slate-600 mt-1 block">{openTrades.length} {t.openTradesCount}</span>
                    </div>

                    {/* Max allowed risk */}
                    <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-xl p-4">
                      <span className="text-[11px] font-semibold tracking-widest uppercase text-slate-500 mb-1 flex items-center gap-1">{t.maxAllowedRisk}<TermTooltip term="riskLimits" lang={lang} /></span>
                      <span className="text-2xl font-bold font-mono text-violet-400">{MAX_RISK_PCT.toFixed(1)}%</span>
                      <span className="text-xs text-slate-500 block mt-0.5 font-mono">${maxRiskDollar.toFixed(2)}</span>
                      <span className="text-[10px] text-slate-600 mt-1 block">{t.fromCapital} ${capital.toLocaleString()}</span>
                    </div>

                    {/* Visual risk meter */}
                    <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-xl p-4">
                      <span className="text-[11px] font-semibold tracking-widest uppercase text-slate-500 block mb-3">{t.riskMeter}</span>
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
                          <span className="text-[var(--v3-loss)]/80">100% ({MAX_RISK_PCT}%)</span>
                        </div>
                        {/* Zone lines */}
                        <div className="absolute top-0 left-0 w-full h-4 pointer-events-none">
                          <div className="absolute h-full w-px bg-amber-500/30" style={{ left: "70%" }} />
                        </div>
                      </div>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className={`text-lg font-bold font-mono ${meterColor.text}`}>{usedPct.toFixed(0)}%</span>
                        <span className="text-[10px] text-slate-600">{t.ofLimit}</span>
                        <span className="ms-auto text-[10px] text-slate-500 font-mono">
                          {t.remaining}: ${Math.max(maxRiskDollar - totalRiskDollar, 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Per-trade risk table */}
                  {openRisks.length > 0 && (
                    <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-xl p-4">
                      <span className="text-xs font-semibold tracking-widest uppercase text-slate-500 block mb-3">{t.riskPerTrade}</span>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-slate-600 border-b border-[var(--border-subtle)] dark:border-white/[0.06]">
                              {["Ticker", "Side", "Entry", "Stop", "Shares", "Risk $", "Risk %", "R/R", "Bar"].map(h => (
                                <th key={h} className="pb-2 text-start font-semibold tracking-wider pe-4 whitespace-nowrap">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {openRisks.map(t => {
                              const rowColor = t.riskPct > MAX_RISK_PCT
                                ? "text-[var(--v3-loss)]"
                                : t.riskPct > MAX_RISK_PCT * 0.5
                                ? "text-amber-400"
                                : "text-[var(--v3-accent)]";
                              const barColor = t.riskPct > MAX_RISK_PCT
                                ? "bg-[var(--v3-loss)]"
                                : t.riskPct > MAX_RISK_PCT * 0.5
                                ? "bg-amber-400"
                                : "bg-[var(--v3-accent)]";
                              const barWidth = Math.min((t.riskPct / MAX_RISK_PCT) * 100, 100);
                              return (
                                <tr key={t.id} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                                  <td className="py-2 pe-4 font-bold text-white font-mono">{t.ticker}</td>
                                  <td className="py-2 pe-4">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${t.side === "LONG" ? "bg-[var(--v3-accent)]/10 text-[var(--v3-accent)] border border-[var(--v3-accent)]/20" : "bg-[var(--v3-loss)]/10 text-[var(--v3-loss)] border border-[var(--v3-loss)]/20"}`}>
                                      {t.side}
                                    </span>
                                  </td>
                                  <td className="py-2 pe-4 font-mono text-slate-300">${t.entry}</td>
                                  <td className="py-2 pe-4 font-mono text-[var(--v3-loss)]">${t.stop}</td>
                                  <td className="py-2 pe-4 font-mono text-slate-400">{t.shares}</td>
                                  <td className={`py-2 pe-4 font-bold font-mono ${rowColor}`}>${t.riskDollar.toFixed(2)}</td>
                                  <td className={`py-2 pe-4 font-bold font-mono ${rowColor}`}>{t.riskPct.toFixed(2)}%</td>
                                  <td className="py-2 pe-4 font-mono text-slate-400">
                                    {t.rrRatio !== null ? `${t.rrRatio.toFixed(2)}:1` : "—"}
                                  </td>
                                  <td className="py-2 pe-4 w-24">
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
            </>
          </div>
        )}

        {/* ══════════════ JOURNAL ══════════════ */}
        {tab === "journal" && (
          <div className="space-y-4 animate-fade-in">
            {/* Smart Lessons Section */}
            {smartLessons.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold tracking-widest uppercase text-[var(--v3-purple)]">{t.smartLessons}</span>
                  <div className="flex-1 h-px bg-white/[0.05]" />
                  <span className="text-[10px] text-slate-600">{t.lessonsSubtitle}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {smartLessons.map((lesson, i) => (
                    <div key={lesson.title || `${lesson.type}_${i}`} className={`bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border rounded-xl p-4 ${
                      lesson.type === "strength" ? "border-[#00C076]/25" :
                      lesson.type === "warning" ? "border-amber-500/25" :
                      lesson.type === "insight" ? "border-[#06b6d4]/25" :
                      "border-[#A78BFA]/25"
                    }`}>
                      <div className="flex items-start gap-2 mb-2">
                        <span className="text-lg">💡</span>
                        <div>
                          <h4 className="text-xs font-bold text-white">{lesson.title}</h4>
                          <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{lesson.detail}</p>
                        </div>
                      </div>
                      <div className={`text-[10px] p-2 rounded-lg mt-2 ${
                        lesson.type === "strength" ? "bg-[#00C076]/5 text-[var(--v3-accent)]" :
                        lesson.type === "warning" ? "bg-amber-500/5 text-amber-400" :
                        lesson.type === "insight" ? "bg-[#06b6d4]/5 text-[var(--v3-info)]" :
                        "bg-[#A78BFA]/5 text-[var(--v3-purple)]"
                      }`}>
                        <span className="font-semibold">→</span> {lesson.action}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {smartLessons.length === 0 && closedTrades.length < 2 && (
              <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[#A78BFA]/15 rounded-xl p-4 text-center">
                <span className="text-xs text-slate-600">{t.noLessonsYet}</span>
              </div>
            )}

            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-sm font-bold text-white">{t.tradeJournal}</h2>
                <p className="text-xs text-slate-600 mt-0.5">{trades.length} {t.totalEntries} · {openCountAll} {t.open} · {closedCountAll} {t.closed}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => setShowJournalFilters(v => !v)}
                  className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg border transition ${showJournalFilters ? "bg-[#06b6d4]/15 border-[#06b6d4]/30 text-[var(--v3-info)]" : "bg-white/5 border-white/10 text-slate-400 hover:border-[#06b6d4]/30 hover:text-[var(--v3-info)]"}`}>
                  <Filter size={11} /> {lang === "he" ? "מסננים" : "Filters"}
                </button>
                <button onClick={() => { exportTradesCSV(filteredTrades); toast.success(lang === "he" ? "יוצא כ-CSV" : "CSV exported"); }}
                  className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:border-[#00C076]/30 hover:text-[var(--v3-accent)] transition">
                  <Download size={11} /> CSV
                </button>
                {openTrades.length > 0 && pricesLastUpdated && (
                  <span className="text-[10px] text-slate-700 font-mono hidden md:inline">
                    {lang === "he" ? "עודכן" : "Updated"} {fmtTimeAgo(pricesLastUpdated)}
                  </span>
                )}
                {openTrades.length > 0 && (
                  <button onClick={fetchLivePrices} disabled={pricesLoading}
                    className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-[var(--v3-info)] transition disabled:opacity-40 border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-lg px-2 py-1">
                    <RefreshCw size={10} className={pricesLoading ? "animate-spin" : ""} />
                    {pricesLoading ? (lang === "he" ? "טוען…" : "Loading…") : (lang === "he" ? "רענן מחירים" : "Refresh")}
                  </button>
                )}
              </div>
            </div>

            {/* ── PRO STATS BAR ── */}
            {closedTrades.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-lg p-2.5">
                  <div className="text-[9px] uppercase tracking-widest text-slate-600">{lang === "he" ? "סה״כ סגורות" : "Closed"}</div>
                  <div className="text-sm font-bold text-white font-mono mt-0.5">{journalStats.total}</div>
                </div>
                <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-lg p-2.5">
                  <div className="text-[9px] uppercase tracking-widest text-slate-600 flex items-center gap-1">{lang === "he" ? "אחוז הצלחה" : "Win Rate"}<TermTooltip term="winRate" lang={lang} /></div>
                  <div className="text-sm font-bold font-mono mt-0.5 text-[var(--v3-accent)]">{formatPct(journalStats.winRate)}</div>
                </div>
                <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-lg p-2.5">
                  <div className="text-[9px] uppercase tracking-widest text-slate-600 flex items-center gap-1">{lang === "he" ? "רווח ממוצע" : "Avg Win"}<TermTooltip term="avgWin" lang={lang} /></div>
                  <div className="text-sm font-bold font-mono mt-0.5 text-[var(--v3-accent)]">{fmt$(Math.round(journalStats.avgWin))}</div>
                </div>
                <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-lg p-2.5">
                  <div className="text-[9px] uppercase tracking-widest text-slate-600 flex items-center gap-1">{lang === "he" ? "הפסד ממוצע" : "Avg Loss"}<TermTooltip term="avgLoss" lang={lang} /></div>
                  <div className="text-sm font-bold font-mono mt-0.5 text-[var(--v3-loss)]">{fmt$(-Math.round(journalStats.avgLoss))}</div>
                </div>
                <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-lg p-2.5">
                  <div className="text-[9px] uppercase tracking-widest text-slate-600 flex items-center gap-1">{t.profitFactor}<TermTooltip term="profitFactor" lang={lang} /></div>
                  <div className="text-sm font-bold font-mono mt-0.5 text-[var(--v3-info)]">{isFinite(journalStats.profitFactor) ? journalStats.profitFactor.toFixed(2) : "∞"}</div>
                </div>
                <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-lg p-2.5">
                  <div className="text-[9px] uppercase tracking-widest text-slate-600 flex items-center gap-1">{t.maxDD}<TermTooltip term="maxDD" lang={lang} /></div>
                  <div className="text-sm font-bold font-mono mt-0.5 text-[var(--v3-loss)]">{fmt$(-Math.round(journalStats.maxDD))}</div>
                </div>
                <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-lg p-2.5">
                  <div className="text-[9px] uppercase tracking-widest text-slate-600 flex items-center gap-1">{lang === "he" ? "זמן החזקה" : "Avg Hold"}<TermTooltip term="avgHold" lang={lang} /></div>
                  <div className="text-sm font-bold font-mono mt-0.5 text-[var(--v3-purple)]">{journalStats.avgHold.toFixed(1)}d</div>
                </div>
              </div>
            )}

            {/* ── FILTERS PANEL ── */}
            {showJournalFilters && (
              <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[#06b6d4]/20 rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                <div>
                  <label className="text-[9px] uppercase tracking-widest text-slate-600 block mb-1">{t.ticker}</label>
                  <input value={journalFilters.ticker} onChange={e => setJournalFilters(f => ({ ...f, ticker: e.target.value }))}
                    placeholder={t.tickerPlaceholder} className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs font-mono text-white placeholder-slate-600 focus:border-[#06b6d4]/50 focus:outline-none" />
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-widest text-slate-600 block mb-1">{t.filterSetup}</label>
                  <select value={journalFilters.setup} onChange={e => setJournalFilters(f => ({ ...f, setup: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:border-[#06b6d4]/50 focus:outline-none">
                    <option value="all">{t.filterAll}</option>
                    {uniqueSetups.map(s => <option key={s} value={s}>{labelFor("setup", s, lang)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-widest text-slate-600 block mb-1">{t.filterResult}</label>
                  <select value={journalFilters.result} onChange={e => setJournalFilters(f => ({ ...f, result: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:border-[#06b6d4]/50 focus:outline-none">
                    <option value="all">{t.filterAll}</option>
                    <option value="win">{t.resultWin}</option>
                    <option value="loss">{t.resultLoss}</option>
                    <option value="be">{t.resultBE}</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-widest text-slate-600 block mb-1">{t.filterFrom}</label>
                  <input type="date" value={journalFilters.from} onChange={e => setJournalFilters(f => ({ ...f, from: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:border-[#06b6d4]/50 focus:outline-none" />
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-widest text-slate-600 block mb-1">{t.filterTo}</label>
                  <input type="date" value={journalFilters.to} onChange={e => setJournalFilters(f => ({ ...f, to: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:border-[#06b6d4]/50 focus:outline-none" />
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-widest text-slate-600 block mb-1">{t.filterRMin}</label>
                  <input type="number" step="0.1" value={journalFilters.rMin} onChange={e => setJournalFilters(f => ({ ...f, rMin: e.target.value }))}
                    placeholder="-2" className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs font-mono text-white placeholder-slate-600 focus:border-[#06b6d4]/50 focus:outline-none" />
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-widest text-slate-600 block mb-1">{t.filterRMax}</label>
                  <input type="number" step="0.1" value={journalFilters.rMax} onChange={e => setJournalFilters(f => ({ ...f, rMax: e.target.value }))}
                    placeholder="5" className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs font-mono text-white placeholder-slate-600 focus:border-[#06b6d4]/50 focus:outline-none" />
                </div>
                <div className="col-span-2 md:col-span-4 lg:col-span-7 flex justify-end">
                  <button onClick={() => setJournalFilters({ ticker: "", setup: "all", result: "all", from: "", to: "", rMin: "", rMax: "" })}
                    className="text-[10px] px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition">
                    {lang === "he" ? "נקה מסננים" : "Clear Filters"}
                  </button>
                </div>
              </div>
            )}
            {/* ── VIEW TOGGLE: Table / Calendar ── */}
            <div className="flex gap-1 p-1 bg-[var(--surface-sunken)] dark:bg-white/[0.04] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-xl w-fit">
              <button
                type="button"
                onClick={() => setJournalView('table')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${journalView === 'table'
                    ? 'bg-white dark:bg-[var(--v3-accent-glow)] shadow-sm dark:shadow-none text-emerald-700 dark:text-[var(--v3-accent)]'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                {lang === 'he' ? '📋 טבלה' : '📋 Table'}
              </button>
              <button
                type="button"
                onClick={() => setJournalView('calendar')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${journalView === 'calendar'
                    ? 'bg-white dark:bg-[var(--v3-accent-glow)] shadow-sm dark:shadow-none text-emerald-700 dark:text-[var(--v3-accent)]'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                {lang === 'he' ? '📅 לוח שנה' : '📅 Calendar'}
              </button>
            </div>

            {journalView === 'calendar' ? (
              <TradeCalendar
                trades={filteredTrades.filter(t => t.status === 'CLOSED')}
                calcMetrics={calcTradeMetrics}
                lang={lang}
              />
            ) : trades.length === 0 ? (
              <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-2xl p-12 text-center">
                <BookOpen size={36} className="mx-auto text-slate-600 mb-4" />
                <h3 className="se-serif text-2xl md:text-3xl text-white mb-2 tracking-tight">{lang === "he" ? "כאן מתחיל התיעוד שלך" : "Your record starts here"}</h3>
                <p className="text-xs text-slate-500 mb-5 max-w-sm mx-auto leading-relaxed">{lang === "he" ? "כל עסקה היא נתון. הוסף את הראשונה — או טען 30 לדוגמה." : "Every trade is a data point. Add your first — or load 30 demo trades."}</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button onClick={() => { setForm({ ticker:"", side:"LONG", entry:"", stop:"", target:"", shares:"", setup:"Breakout", notes:"", marketCondition:"Trending Up", emotionAtEntry:"Neutral", entryQuality:3, tradeImage:null, tradeImagePreview:null }); setOcrStatus(null); setShowForm(true); }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--v3-accent)] text-black font-bold text-xs hover:opacity-90 transition">
                    <Plus size={13} /> {lang === "he" ? "עסקה ראשונה" : "Add First Trade"}
                  </button>
                  <button onClick={handleLoadDemoTrades}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-300 font-bold text-xs hover:opacity-90 transition">
                    <Download size={13} /> 📊 {lang === "he" ? "טען עסקאות לדוגמה" : "Load Demo Trades"}
                  </button>
                </div>
              </div>
            ) : filteredTrades.length === 0 ? (
              <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-2xl p-8 text-center">
                <Filter size={28} className="mx-auto text-slate-600 mb-3" />
                <h3 className="text-sm font-bold text-white mb-1">{t.nothingMatches}</h3>
                <p className="text-xs text-slate-500">{lang === "he" ? "רופף את המסננים כדי לראות יותר" : "Loosen the filters to see more"}</p>
              </div>
            ) : (
            <>
            {selectedTrades.size > 0 && (
              <div className="sticky top-0 z-10 bg-[#00C076]/10 border border-[#00C076]/30 rounded-xl p-3 mb-3 flex items-center justify-between backdrop-blur shadow-sm">
                <span className="text-sm font-medium text-[var(--v3-accent)]">
                  {lang === "he"
                    ? `${selectedTrades.size} עסקאות נבחרו`
                    : `${selectedTrades.size} trades selected`}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedTrades(new Set())}
                    className="px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5 rounded-lg border border-white/10 transition"
                  >
                    {lang === "he" ? "בטל" : "Cancel"}
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="px-3 py-1.5 text-sm bg-[var(--v3-loss)] hover:opacity-90 text-white rounded-lg font-medium transition"
                  >
                    🗑️ {lang === "he" ? "מחק נבחרים" : "Delete Selected"}
                  </button>
                </div>
              </div>
            )}
            <div className="hidden md:block overflow-x-auto bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-xl">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-600 border-b border-[var(--border-subtle)] dark:border-white/[0.06] text-[10px] tracking-widest uppercase">
                    <th className="p-3 text-start font-semibold w-8">
                      <input
                        type="checkbox"
                        aria-label={lang === "he" ? "בחר הכל" : "Select all"}
                        ref={(el) => {
                          if (!el) return;
                          const total = filteredTrades.length;
                          const selectedVisible = filteredTrades.filter(t => selectedTrades.has(t.id)).length;
                          el.indeterminate = selectedVisible > 0 && selectedVisible < total;
                        }}
                        checked={filteredTrades.length > 0 && filteredTrades.every(t => selectedTrades.has(t.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTrades(new Set(filteredTrades.map(t => t.id)));
                          } else {
                            setSelectedTrades(new Set());
                          }
                        }}
                        className="w-3.5 h-3.5 rounded border border-white/20 bg-white/5 cursor-pointer accent-[var(--v3-info)]"
                      />
                    </th>
                    {[t.colTicker,t.colDate,t.colSide,t.colEntry,t.colStop,t.colTarget,t.colShares,t.currentPrice,t.livePnl,t.colExit,"P&L","R",t.colHold,t.colSetup,t.colMkt,t.colEmotion,"★",t.colExitReason,t.colPlan,t.colLesson,t.colStatus,t.colAction].map(h => (
                      <th key={h} className={`p-3 text-start font-semibold whitespace-nowrap ${h===t.currentPrice||h===t.livePnl ? "text-[var(--v3-info)]" : ""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedFilteredTrades.map(t => {
                    const { pnl, rMultiple } = calcTradeMetrics(t);
                    const isOpen = t.status === "OPEN";
                    const win = !isOpen && pnl > 0;
                    const isSelected = selectedTrades.has(t.id);
                    return (
                      <tr key={t.id} className={`border-b border-white/[0.04] transition-colors ${isSelected ? "bg-[#06b6d4]/[0.06]" : ""} ${!isOpen && win ? "hover:bg-[#00C076]/[0.04]" : !isOpen ? "hover:bg-[#F43F5E]/[0.04]" : "hover:bg-white/[0.03]"}`}>
                        <td className={`p-3 w-8 border-s-[3px] ${isOpen ? "border-[#06b6d4]/40" : win ? "border-[var(--v3-accent)]" : "border-[var(--v3-loss)]"}`}>
                          <input
                            type="checkbox"
                            aria-label={lang === "he" ? "בחר עסקה" : "Select trade"}
                            checked={isSelected}
                            onChange={(e) => {
                              setSelectedTrades(prev => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(t.id);
                                else next.delete(t.id);
                                return next;
                              });
                            }}
                            className="w-3.5 h-3.5 rounded border border-white/20 bg-white/5 cursor-pointer accent-[var(--v3-info)]"
                          />
                        </td>
                        <td className="p-3 font-bold text-white font-mono whitespace-nowrap"><div className="flex items-center gap-1.5"><TickerLogo ticker={t.ticker} size={16} />{t.ticker}{t.isDemo && <span className="text-xs bg-slate-700 text-slate-400 px-1 py-0.5 rounded ms-1 font-normal">DEMO</span>}</div></td>
                        <td className="p-3 text-slate-500 whitespace-nowrap">{t.date}</td>
                        <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${t.side==="LONG"?"bg-[#00C076]/10 text-[var(--v3-accent)] border border-[#00C076]/20":"bg-[#F43F5E]/10 text-[var(--v3-loss)] border border-[#F43F5E]/20"}`}>{t.side}</span></td>
                        <td className="p-3 font-mono text-slate-300">${t.entry}</td>
                        <td className="p-3 font-mono text-[var(--v3-loss)]">${t.stop}</td>
                        <td className="p-3 font-mono text-[var(--v3-accent)]">${t.target}</td>
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
                            return <span className={lp >= 0 ? "text-[var(--v3-accent)]" : "text-[var(--v3-loss)]"}>{fmt$(Math.round(lp))}</span>;
                          })()}
                        </td>
                        <td className="p-3 font-mono text-slate-300">{t.exit ? `$${t.exit}` : "–"}</td>
                        <td className={`p-3 font-bold font-mono text-sm ${isOpen ? "text-slate-500" : win ? "text-[var(--v3-accent)]" : "text-[var(--v3-loss)]"}`}>
                          {isOpen ? "–" : fmt$(pnl)}
                        </td>
                        <td className={`p-3 font-bold font-mono text-xs ${isOpen ? "text-slate-500" : rMultiple >= 0 ? "text-[var(--v3-info)]" : "text-[var(--v3-loss)]"}`}>
                          {isOpen ? "–" : fmtR(rMultiple)}
                        </td>
                        <td className="p-3 text-[10px] font-mono text-[var(--v3-purple)] whitespace-nowrap">
                          {(() => {
                            const d = holdTimeDays(t);
                            if (typeof d !== "number") return <span className="text-slate-700">–</span>;
                            return d === 0 ? "<1d" : `${d}d`;
                          })()}
                        </td>
                        <td className="p-3"><span className="inline-flex items-center gap-1"><span className="text-[10px] px-2 py-0.5 rounded bg-[#A78BFA]/10 text-[var(--v3-purple)] border border-[#A78BFA]/20 whitespace-nowrap">{labelFor("setup", t.setup, lang)}</span><SetupTagTip setup={t.setup} isRTL={isRTL} /></span></td>
                        <td className="p-3 text-slate-500 text-[10px] whitespace-nowrap">{t.marketCondition ? labelFor("market", t.marketCondition, lang) : "–"}</td>
                        <td className="p-3 text-slate-500 text-[10px] whitespace-nowrap">{t.emotionAtEntry ? labelFor("emotion", t.emotionAtEntry, lang) : "–"}</td>
                        <td className="p-3 text-amber-400 text-xs font-mono">{qstars(t.entryQuality) ? `${"★".repeat(qstars(t.entryQuality))}` : "–"}</td>
                        <td className="p-3 text-[10px] text-slate-500 whitespace-nowrap">
                          {t.exitReason
                            ? <span className="px-2 py-0.5 rounded bg-slate-700/40 text-slate-400 border border-[var(--border-subtle)] dark:border-white/[0.06]">{labelFor("exitReason", t.exitReason, lang)}</span>
                            : <span className="text-slate-700">–</span>}
                        </td>
                        <td className="p-3 text-center">
                          {t.followedPlan === true        && <span className="text-[var(--v3-accent)] text-sm font-bold">✓</span>}
                          {t.followedPlan === false       && <span className="text-[var(--v3-loss)] text-sm font-bold">✗</span>}
                          {t.followedPlan === "Partially" && <span className="text-amber-400 text-sm font-bold">◐</span>}
                          {t.followedPlan == null         && <span className="text-slate-700 text-[10px]">–</span>}
                        </td>
                        <td className="p-3 text-slate-500 text-[10px] max-w-[200px] align-top">
                          <div className="truncate" title={t.lessonLearned || t.notes}>
                            {t.lessonLearned
                              ? <span className="text-[#A78BFA]/80">💡 {t.lessonLearned}</span>
                              : t.notes
                                ? <span className="text-slate-600">{t.notes}</span>
                                : <span className="text-slate-700">–</span>}
                          </div>
                          {(myTradeNotes[t.id] || []).length > 0 && (
                            <div className="mt-1.5 space-y-1" title={t.mentorNoteLabel}>
                              {(myTradeNotes[t.id] || []).map((n) => (
                                <div key={n.id} className="flex items-start gap-1 text-[10px] leading-snug text-[var(--v3-accent)] bg-[var(--v3-accent-glow)] border border-[var(--v3-accent)]/20 rounded px-1.5 py-1 whitespace-normal break-words">
                                  <MessageCircle size={10} className="mt-0.5 shrink-0" />
                                  <span className="break-words">{n.note}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="p-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${isOpen ? "bg-[#06b6d4]/10 text-[var(--v3-info)] border border-[#06b6d4]/20" : "bg-slate-500/10 text-slate-500 border border-slate-700"}`}>{labelFor("status", t.status, lang)}</span></td>
                        <td className="p-3">
                          <div className="flex items-center gap-1 whitespace-nowrap">
                            {isOpen && (
                              <button onClick={()=>{setClosingTrade(t);setShowCloseForm(true);}}
                                className="text-[10px] px-2 py-1 rounded bg-[#F43F5E]/10 border border-[#F43F5E]/20 text-[var(--v3-loss)] hover:opacity-80 transition">
                                Close
                              </button>
                            )}
                            <button onClick={() => handleEditOpen(t)}
                              className="text-[10px] px-1.5 py-1 rounded bg-[#06b6d4]/10 border border-[#06b6d4]/20 text-[var(--v3-info)] hover:opacity-80 transition"
                              title={lang === "he" ? "עריכה" : "Edit"}>✏️</button>
                            <button onClick={() => handleDeleteTrade(t.id)}
                              className="text-[10px] px-1.5 py-1 rounded bg-slate-500/10 border border-slate-500/20 text-slate-400 hover:text-red-400 hover:border-red-500/30 transition"
                              title={lang === "he" ? "מחיקה" : "Delete"}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="md:hidden flex flex-col gap-2">
              {sortedFilteredTrades.map(t => (
                <MobileTradeCard
                  key={t.id}
                  trade={t}
                  lang={lang}
                  onClick={handleEditOpen}
                  onClose={(tr) => { setClosingTrade(tr); setShowCloseForm(true); }}
                  onDelete={handleDeleteTrade}
                  isSelected={selectedTrades.has(t.id)}
                  onToggleSelect={(id, next) => {
                    setSelectedTrades(prev => {
                      const s = new Set(prev);
                      if (next) s.add(id); else s.delete(id);
                      return s;
                    });
                  }}
                  mentorNotes={myTradeNotes[t.id]}
                  isRTL={isRTL}
                />
              ))}
            </div>
            </>
            )}
          </div>
        )}

        {/* ══════════════ TOOLS — sub-nav ══════════════ */}
        {tab === "tools" && (
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit mx-auto">
            <button
              onClick={() => setToolsTab('analyzer')}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${toolsTab === 'analyzer' ? 'bg-white shadow-sm text-emerald-700' : 'text-[#475569] hover:text-[#334155]'}`}
            >
              🧪 {lang === 'he' ? 'ניתוח עסקה' : 'Trade Analyzer'}
            </button>
            <button
              onClick={() => setToolsTab('calc')}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${toolsTab === 'calc' ? 'bg-white shadow-sm text-emerald-700' : 'text-[#475569] hover:text-[#334155]'}`}
            >
              🧮 {lang === 'he' ? 'מחשבון פוזיציה' : 'Position Calculator'}
            </button>
            <button
              onClick={() => setToolsTab('report')}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${toolsTab === 'report' ? 'bg-white shadow-sm text-emerald-700' : 'text-[#475569] hover:text-[#334155]'}`}
            >
              📈 {t.dnaReport}
            </button>
          </div>
        )}

        {/* ══════════════ TRADE ANALYZER ══════════════ */}
        {tab === "tools" && toolsTab === 'analyzer' && (
          <div className="space-y-5 animate-fade-in max-w-3xl mx-auto">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2.5 tracking-tight"><FlaskConical size={17} className="text-[var(--v3-purple)]" /> {t.tradeAnalyzer}</h2>
              <p className="text-xs text-slate-500 mt-1">{t.analyzerSubtitle}</p>
            </div>

            {/* Input Fields */}
            <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[var(--border-subtle)] dark:border-[var(--v3-line)] rounded-[var(--v3-radius-card)] p-5 space-y-5 shadow-[var(--shadow-card)]">
              <span className="text-[10px] font-semibold tracking-widest uppercase text-[var(--v3-purple)]">{t.tradeDetails}</span>

              {/* Row 1: Ticker + Shares */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 tracking-widest uppercase block mb-1.5">{t.ticker} *</label>
                  <input value={analyzerForm.ticker} onChange={e => setAnalyzerForm(f => ({ ...f, ticker: e.target.value.toUpperCase() }))}
                    placeholder={t.tickerPlaceholder} className="w-full bg-white/5 border border-[var(--v3-line)] rounded-[var(--v3-radius-chip)] px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-[var(--v3-info)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--v3-info)]/20 transition font-mono font-bold tracking-wider" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 tracking-widest uppercase block mb-1.5">{t.sharesToBuy}</label>
                  <input value={analyzerForm.shares} onChange={e => setAnalyzerForm(f => ({ ...f, shares: e.target.value }))}
                    placeholder="10" type="number" min="0" className="w-full bg-white/5 border border-[var(--v3-line)] rounded-[var(--v3-radius-chip)] px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-[var(--v3-info)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--v3-info)]/20 transition font-mono" />
                </div>
              </div>

              {/* Live quote badge + Open/High/Low/Pre/After (reuses Add-Trade form mechanism) */}
              {analyzerForm.ticker && (() => {
                const badge = getMarketStateBadge(analyzerQuote?.marketState || marketState);
                const q = analyzerQuote;
                const marketOpen = (analyzerQuote?.marketState || marketState) === MARKET_STATE.OPEN;
                return (
                  <div className="bg-white/3 border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-xl p-3">
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
                          <span className={`text-[11px] font-mono ${q.changePct >= 0 ? "text-[var(--v3-accent)]" : "text-[var(--v3-loss)]"}`}>
                            {q.changePct >= 0 ? "+" : ""}{q.changePct.toFixed(2)}%
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => fetchAnalyzerQuote(analyzerForm.ticker, { force: true })}
                        disabled={analyzerQuoteLoading}
                        title="Refresh price"
                        aria-label={lang === "he" ? "רענן מחיר" : "Refresh price"}
                        className="text-slate-400 hover:text-cyan-400 transition p-1 rounded hover:bg-white/5 disabled:opacity-50"
                      >
                        <RefreshCw size={12} className={analyzerQuoteLoading ? "animate-spin" : ""} />
                      </button>
                    </div>
                    <div className="grid grid-cols-5 gap-1 text-[9px] text-slate-500">
                      <div className="text-center">
                        <div className="uppercase tracking-wider">Open</div>
                        <div className="font-mono text-slate-300">{q?.regularMarketOpen != null ? q.regularMarketOpen.toFixed(2) : "—"}</div>
                      </div>
                      <div className="text-center">
                        <div className="uppercase tracking-wider">High</div>
                        <div className="font-mono text-[var(--v3-accent)]">{q?.regularMarketDayHigh != null ? q.regularMarketDayHigh.toFixed(2) : "—"}</div>
                      </div>
                      <div className="text-center">
                        <div className="uppercase tracking-wider">Low</div>
                        <div className="font-mono text-[var(--v3-loss)]">{q?.regularMarketDayLow != null ? q.regularMarketDayLow.toFixed(2) : "—"}</div>
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

              {/* Row 2: Entry / Stop / Target */}
              <div className="grid grid-cols-3 gap-3">
                {[[t.entry, "entry", "text-white", null], [t.stopLoss, "stop", "text-[var(--v3-loss)]", "stopLoss"], [t.target, "target", "text-[var(--v3-accent)]", "takeProfit"]].map(([label, key, cls, term]) => (
                  <div key={key}>
                    <label className="text-[10px] text-slate-500 tracking-widest uppercase mb-1.5 flex items-center gap-1">{label}{term && <TermTooltip term={term} lang={lang} />}</label>
                    <input value={analyzerForm[key]} onChange={e => setAnalyzerForm(f => ({ ...f, [key]: e.target.value }))}
                      placeholder="0.00" className={`w-full bg-white/5 border border-[var(--v3-line)] rounded-[var(--v3-radius-chip)] px-3 py-2.5 text-sm placeholder-slate-600 focus:border-[var(--v3-info)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--v3-info)]/20 transition font-mono ${cls}`} />
                  </div>
                ))}
              </div>

              {/* Auto Calculations */}
              {azEntry > 0 && azStop > 0 && (
                <div className="grid grid-cols-3 gap-3 bg-white/[0.03] rounded-[var(--v3-radius-chip)] p-3.5 border border-[var(--border-subtle)] dark:border-[var(--v3-line)]">
                  <div className="text-center">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">R/R Ratio<TermTooltip term="rr" lang={lang} /></div>
                    <div className={`text-lg font-bold font-mono ${azRRRatio >= 2 ? "text-[var(--v3-accent)]" : azRRRatio >= 1 ? "text-[var(--v3-warn)]" : "text-[var(--v3-loss)]"}`}>
                      {azTarget > 0 ? `${azRRRatio.toFixed(2)}:1` : "–"}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{t.riskInDollars}</div>
                    <div className="text-lg font-bold font-mono text-[var(--v3-loss)]">
                      {azShares > 0 ? `$${azDollarRisk.toFixed(2)}` : "–"}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{t.riskOfPortfolio}</div>
                    <div className={`text-lg font-bold font-mono ${azPortfolioRisk > 2 ? "text-[var(--v3-loss)]" : azPortfolioRisk > 1 ? "text-[var(--v3-warn)]" : "text-[var(--v3-accent)]"}`}>
                      {azShares > 0 ? `${azPortfolioRisk.toFixed(2)}%` : "–"}
                    </div>
                  </div>
                </div>
              )}

              {/* R/R quality badge */}
              {azEntry > 0 && azStop > 0 && azTarget > 0 && (
                <div className={`flex items-center gap-2 p-2.5 rounded-[var(--v3-radius-chip)] border text-xs ${azRRRatio >= 2 ? "bg-[var(--v3-accent)]/5 border-[var(--v3-accent)]/20 text-[var(--v3-accent)]" : azRRRatio >= 1 ? "bg-[var(--v3-warn)]/5 border-[var(--v3-warn)]/20 text-[var(--v3-warn)]" : "bg-[var(--v3-loss)]/5 border-[var(--v3-loss)]/20 text-[var(--v3-loss)]"}`}>
                  {azRRRatio >= 2 ? <CheckCircle size={13} /> : <AlertTriangle size={13} />}
                  <span>{azRRRatio >= 2 ? t.rrExcellent : azRRRatio >= 1 ? t.rrFair : t.rrLow}</span>
                </div>
              )}

              {/* Image Upload */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] text-slate-600 tracking-widest uppercase">{t.imageFromTradingView}</label>
                  <button type="button" onClick={() => setShowChartGuide(true)}
                    aria-label={isRTL ? "איך לצלם עסקה מהצ'ארט (מדריך) — How to screenshot a trade chart (guide)" : "How to screenshot a trade chart (guide) — איך לצלם עסקה מהצ'ארט"}
                    className="text-[10px] text-[var(--v3-info)]/70 hover:text-[var(--v3-info)] border border-[var(--v3-info)]/30 hover:border-[var(--v3-info)]/60 rounded-full w-4 h-4 flex items-center justify-center transition shrink-0">
                    ?
                  </button>
                </div>
                {/* Direction tells Vision which line is the stop vs the target before reading the chart. */}
                <div className="flex gap-1.5 mb-2">
                  {["LONG", "SHORT"].map((s) => (
                    <button key={s} type="button" onClick={() => setAnalyzerOcrSide(s)}
                      aria-pressed={analyzerOcrSide === s}
                      className={`flex-1 px-3 py-1.5 rounded-[var(--v3-radius-chip)] text-[11px] font-semibold tracking-wide uppercase border transition ${
                        analyzerOcrSide === s
                          ? (s === "LONG"
                              ? "bg-[var(--v3-accent)]/10 border-[var(--v3-accent)]/40 text-[var(--v3-accent)]"
                              : "bg-[var(--v3-loss)]/10 border-[var(--v3-loss)]/40 text-[var(--v3-loss)]")
                          : "bg-white/5 border-[var(--v3-line)] text-slate-500 hover:text-slate-300"
                      }`}>
                      {s === "LONG" ? (lang === "he" ? "לונג" : "Long") : (lang === "he" ? "שורט" : "Short")}
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-2 cursor-pointer w-full bg-white/5 border border-[var(--v3-line)] rounded-[var(--v3-radius-chip)] px-3 py-2.5 text-xs text-slate-400 hover:border-[var(--v3-info)]/30 hover:text-[var(--v3-info)] transition">
                  <Eye size={12} />
                  <span>{analyzerImage ? analyzerImage.name : t.uploadChart}</span>
                  <input type="file" accept="image/*" onChange={handleAnalyzerImageUpload} className="hidden" />
                </label>
              </div>
              {/* OCR confidence badge */}
              {analyzerOcrResult && (() => {
                const { status, confidence } = analyzerOcrResult;
                const ok = status === "ok";
                const high = ok && confidence >= 70;
                const mid = ok && confidence >= 40 && confidence < 70;
                const low = ok && confidence < 40;
                const tone =
                  status === "processing" ? "bg-[var(--v3-info)]/5 border-[var(--v3-info)]/20 text-[var(--v3-info)]" :
                  high ? "bg-[var(--v3-accent)]/5 border-[var(--v3-accent)]/20 text-[var(--v3-accent)]" :
                  mid  ? "bg-[var(--v3-warn)]/5 border-[var(--v3-warn)]/20 text-[var(--v3-warn)]" :
                         "bg-[var(--v3-loss)]/5 border-[var(--v3-loss)]/20 text-[var(--v3-loss)]";
                let icon, text;
                if (status === "processing") { icon = <RefreshCw size={12} className="animate-spin" />; text = lang === "he" ? "קורא גרף…" : "Reading chart…"; }
                else if (status === "config_error") { icon = <AlertTriangle size={12} />; text = lang === "he" ? "מפתח API חסר — פנה לאדמין" : "API key missing — contact admin"; }
                else if (status === "error") { icon = <AlertTriangle size={12} />; text = lang === "he" ? "שגיאת OCR — נסה שוב" : "OCR failed — try again"; }
                else if (high) { icon = <CheckCircle size={12} />; text = `OCR ✓ ${confidence}%`; }
                else if (mid)  { icon = <CheckCircle size={12} />; text = `OCR ~ ${confidence}%`; }
                else { icon = <AlertTriangle size={12} />; text = lang === "he" ? "לא זוהה — ודא ידנית" : "Not detected — verify manually"; }
                return (
                  <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[11px] ${tone}`}>
                    {icon}<span>{text}</span>
                  </div>
                );
              })()}
              {analyzerImagePreview && (
                <div className="relative rounded-lg overflow-hidden border border-white/10">
                  <img src={analyzerImagePreview} alt="Trade chart" className="w-full h-40 object-cover" />
                  <button onClick={() => { setAnalyzerImage(null); setAnalyzerImagePreview(null); setAnalyzerOcrResult(null); }}
                    aria-label={lang === "he" ? "הסר תמונה" : "Remove image"}
                    className="absolute top-2 right-2 rtl:right-auto rtl:left-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-slate-300 hover:text-white">
                    <X size={11} />
                  </button>
                </div>
              )}

              {/* ── Trade context (journaling metadata) — collapsed by default. Reuses Log New Trade fields so the smart checks (emotion/setup/market) light up here too. ── */}
              <button type="button" onClick={()=>setShowAnalyzerContext(v=>!v)}
                aria-expanded={showAnalyzerContext}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-[var(--v3-radius-chip)] bg-white/[0.03] border border-[var(--border-subtle)] dark:border-[var(--v3-line)] text-slate-400 hover:text-white hover:border-white/20 transition">
                <span className="text-[10px] tracking-widest uppercase font-semibold">{lang === "he" ? "הקשר העסקה" : "Trade Context"}</span>
                <ChevronDown size={14} className={`transition-transform ${showAnalyzerContext ? "rotate-180" : ""}`} />
              </button>

              {showAnalyzerContext && (
                <div className="space-y-4 animate-fade-in">
                  {/* Setup Type + Notes */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="az-setup" className="text-[10px] text-slate-500 tracking-widest uppercase mb-1.5 flex items-center gap-1">Setup Type<InfoTooltip label="Setup Type">{lang === 'he' ? CATEGORY_TOOLTIP.setup.he : CATEGORY_TOOLTIP.setup.en}</InfoTooltip></label>
                      <SmartSelect id="az-setup" ariaLabel="Setup Type" value={analyzerForm.setup} onChange={v=>setAnalyzerForm(f=>({...f,setup:v}))} dir={isRTL?'rtl':'ltr'} {...getTradeSelectProps('setup', lang)} />
                    </div>
                    <div>
                      <label htmlFor="az-notes" className="text-[10px] text-slate-500 tracking-widest uppercase block mb-1.5">Notes</label>
                      <input id="az-notes" value={analyzerForm.notes} onChange={e=>setAnalyzerForm(f=>({...f,notes:e.target.value}))}
                        placeholder="Trade thesis..." className="w-full bg-white/5 border border-[var(--v3-line)] rounded-[var(--v3-radius-chip)] px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-[var(--v3-info)]/50 focus:outline-none transition" />
                    </div>
                  </div>

                  {/* Market Condition + Emotion */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="az-market-condition" className="text-[10px] text-slate-500 tracking-widest uppercase mb-1.5 flex items-center gap-1">{t.marketCondition}<InfoTooltip label="Market Condition">{lang === 'he' ? CATEGORY_TOOLTIP.market.he : CATEGORY_TOOLTIP.market.en}</InfoTooltip></label>
                      <SmartSelect id="az-market-condition" ariaLabel="Market Condition" value={analyzerForm.marketCondition} onChange={v=>setAnalyzerForm(f=>({...f,marketCondition:v}))} dir={isRTL?'rtl':'ltr'} {...getTradeSelectProps('market', lang)} />
                    </div>
                    <div>
                      <label htmlFor="az-emotion" className="text-[10px] text-slate-500 tracking-widest uppercase mb-1.5 flex items-center gap-1">{t.emotionAtEntry}<InfoTooltip label="Emotion at Entry">{lang === 'he' ? CATEGORY_TOOLTIP.emotion.he : CATEGORY_TOOLTIP.emotion.en}</InfoTooltip></label>
                      <SmartSelect id="az-emotion" ariaLabel="Emotion at Entry" value={analyzerForm.emotionAtEntry} onChange={v=>setAnalyzerForm(f=>({...f,emotionAtEntry:v}))} dir={isRTL?'rtl':'ltr'} {...getTradeSelectProps('emotion', lang)} />
                    </div>
                  </div>

                  {/* Entry Quality (stars) */}
                  <div>
                    <label className="text-[10px] text-slate-500 tracking-widest uppercase block mb-1.5">{t.entryQuality}</label>
                    <div className="flex items-center gap-1 mt-1">
                      {[1,2,3,4,5].map(star => (
                        <button key={star} type="button" onClick={() => setAnalyzerForm(f=>({...f,entryQuality:star}))}
                          className={`text-xl transition-transform hover:scale-110 ${analyzerForm.entryQuality >= star ? "text-amber-400" : "text-slate-700"}`}>
                          ★
                        </button>
                      ))}
                      <span className="text-[10px] text-slate-600 ms-1">{analyzerForm.entryQuality}/5</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Analyze button + Reset */}
              <div className="flex gap-2">
                <button onClick={analyzeTradeStandalone} disabled={analyzerLoading}
                  className="flex-1 py-3 rounded-[var(--v3-radius-chip)] bg-gradient-to-r from-[var(--v3-purple)]/25 to-[var(--v3-info)]/25 border border-[var(--v3-purple)]/35 text-violet-200 text-sm font-bold hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-[0_4px_16px_var(--v3-purple-glow)]">
                  {analyzerLoading ? <><RefreshCw size={14} className="animate-spin" /> {t.analyzing}</> : <><Cpu size={14} /> {t.analyzeTrade}</>}
                </button>
                <button onClick={handleAnalyzerReset} disabled={analyzerLoading}
                  aria-label={lang === "he" ? "איפוס" : "Reset"}
                  className="py-3 px-5 rounded-[var(--v3-radius-chip)] border border-[var(--v3-line)] text-slate-400 text-sm font-semibold hover:text-white hover:border-white/20 hover:bg-white/5 transition disabled:opacity-50">
                  {lang === "he" ? "איפוס" : "Reset"}
                </button>
              </div>
            </div>

            {/* Analysis Result */}
            {analyzerResult && (() => {
              const rec = analyzerResult.recommendation;
              const heroTone =
                rec === "GO"   ? { border: "border-[var(--v3-accent)]/40", glow: "var(--shadow-lg), 0 0 44px var(--v3-accent-glow)", icon: "text-[var(--v3-accent)]" } :
                rec === "WAIT" ? { border: "border-[var(--v3-warn)]/40",   glow: "var(--shadow-lg), 0 0 44px var(--v3-warn-glow)",   icon: "text-[var(--v3-warn)]" } :
                rec === "SKIP" ? { border: "border-[var(--v3-loss)]/40",   glow: "var(--shadow-lg), 0 0 44px var(--v3-loss-glow)",   icon: "text-[var(--v3-loss)]" } :
                                 { border: "border-[var(--v3-purple)]/25", glow: "var(--shadow-lg)", icon: "text-[var(--v3-purple)]" };
              return (
              <div className={`bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border ${heroTone.border} rounded-[var(--v3-radius-card)] p-5 space-y-4`} style={{ boxShadow: heroTone.glow }}>
                <div className={`flex items-center gap-2 ${heroTone.icon} font-semibold text-xs uppercase tracking-wider`}>
                  <Cpu size={13} /> {t.analysisResult}
                </div>

                {analyzerResult.error ? (
                  <div className="text-xs text-[var(--v3-loss)] bg-[var(--v3-loss)]/5 border border-[var(--v3-loss)]/20 rounded-[var(--v3-radius-chip)] p-3">{analyzerResult.error}</div>
                ) : analyzerResult.raw ? (
                  <div className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{analyzerResult.raw}</div>
                ) : (
                  <div className="space-y-3">
                    {/* Recommendation banner */}
                    {analyzerResult.recommendation && (
                      <div className={`flex items-center justify-between p-5 rounded-[var(--v3-radius-card)] border ${
                        analyzerResult.recommendation === "GO"   ? "bg-[var(--v3-accent)]/8 border-[var(--v3-accent)]/30" :
                        analyzerResult.recommendation === "WAIT" ? "bg-[var(--v3-warn)]/8 border-[var(--v3-warn)]/30" :
                                                                    "bg-[var(--v3-loss)]/8 border-[var(--v3-loss)]/30"}`}>
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">{t.recommendation}</div>
                          <div className={`text-3xl font-bold font-mono tracking-tight ${
                            analyzerResult.recommendation === "GO"   ? "text-[var(--v3-accent)]" :
                            analyzerResult.recommendation === "WAIT" ? "text-[var(--v3-warn)]" :
                                                                        "text-[var(--v3-loss)]"}`}>
                            {analyzerResult.recommendation === "GO"   ? "GO ✅" :
                             analyzerResult.recommendation === "WAIT" ? "WAIT ⚠️" :
                                                                         "SKIP ❌"}
                          </div>
                        </div>
                        {analyzerResult.entry_score && (
                          <div className="text-end">
                            <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">{t.entryScore}</div>
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
                        <div className="bg-white/[0.03] rounded-[var(--v3-radius-chip)] p-3.5 border border-[var(--border-subtle)] dark:border-[var(--v3-line)]">
                          <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                            <Target size={10} className="text-[var(--v3-loss)]" /> {t.stopLossLabel}
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">{analyzerResult.stop_logic}</p>
                        </div>
                      )}
                      {analyzerResult.rr_assessment && (
                        <div className="bg-white/[0.03] rounded-[var(--v3-radius-chip)] p-3.5 border border-[var(--border-subtle)] dark:border-[var(--v3-line)]">
                          <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                            <Activity size={10} className="text-[var(--v3-info)]" /> R/R
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">{analyzerResult.rr_assessment}</p>
                        </div>
                      )}
                    </div>

                    {/* Explanation — strips any sentence already shown in the Stop or R/R box
                        so the panel never repeats a line (the reported duplication). No info is
                        lost: the stripped text still lives in its own box above. Box hides if
                        nothing incremental remains. */}
                    {(() => {
                      const rr = (analyzerResult.rr_assessment || "").trim();
                      const stop = (analyzerResult.stop_logic || "").trim();
                      let exp = (analyzerResult.explanation || "").trim();
                      if (!exp) return null;
                      for (const dup of [rr, stop]) {
                        if (dup && exp.includes(dup)) exp = exp.split(dup).join(" ");
                      }
                      exp = exp.replace(/\s{2,}/g, " ").replace(/^[\s.,—–-]+/, "").trim();
                      if (exp.length < 6) return null;
                      return (
                        <div className="bg-[var(--v3-purple)]/5 border border-[var(--v3-purple)]/15 rounded-[var(--v3-radius-chip)] p-3">
                          <div className="text-[10px] text-[var(--v3-purple)] uppercase tracking-widest mb-1.5">{t.explanation}</div>
                          <p className="text-xs text-slate-300 leading-relaxed">{exp}</p>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
              );
            })()}
          </div>
        )}

        {/* ══════════════ POSITION CALCULATOR ══════════════ */}
        {tab === "tools" && toolsTab === 'calc' && (() => {
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
          const calcPosSizeTooSmall = riskPerShare > 0 && shares === 0;

          const handleCopyToForm = () => {
            setForm(f => ({
              ...f,
              ticker: posCalc.ticker || f.ticker,
              entry: posCalc.entry,
              stop:  posCalc.stop,
              shares: String(shares),
              tradeImage: null,
              tradeImagePreview: null,
            }));
            setOcrStatus(null);
            setShowForm(true);
            setPosCopied(true);
            setTimeout(() => setPosCopied(false), 2000);
          };

          const handlePosCalcReset = () => {
            setPosCalc({ capital: "", risk: "1", entry: "", stop: "", ticker: "" });
            setPosCopied(false);
          };

          // Auto-load live price when ticker changes (variant-safe)
          const tickerPrice = posCalc.ticker ? getLivePrice(posCalc.ticker)?.price ?? null : null;

          return (
            <div className="space-y-5 animate-fade-in max-w-2xl mx-auto">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Calculator size={15} className="text-cyan-400" /> {t.positionCalculator}<TermTooltip term="positionSize" lang={lang} />
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">{t.posCalcSubtitle}</p>
              </div>

              {/* Inputs */}
              <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold tracking-widest uppercase text-slate-500">{t.riskParams}</span>
                  <button onClick={handlePosCalcReset}
                    aria-label={lang === "he" ? "איפוס" : "Reset"}
                    className="text-[10px] tracking-widest uppercase text-slate-500 hover:text-white transition">
                    {lang === "he" ? "איפוס" : "Reset"}
                  </button>
                </div>

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
                      placeholder={t.tickerPlaceholder}
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
                      <Percent size={10} /> {t.riskPercent}<TermTooltip term="riskPerTrade" lang={lang} />
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
                      <ArrowUpRight size={10} className="text-[var(--v3-accent)]" /> {t.entryPrice}
                    </label>
                    <input
                      value={posCalc.entry}
                      onChange={e => setPosCalc(f => ({ ...f, entry: e.target.value }))}
                      placeholder="150.00"
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full bg-white/5 border border-[var(--v3-accent)]/20 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-[var(--v3-accent)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--v3-accent)]/20 transition font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1 flex items-center gap-1">
                      <ArrowDownRight size={10} className="text-[var(--v3-loss)]" /> {t.stopLossPrice}
                    </label>
                    <input
                      value={posCalc.stop}
                      onChange={e => setPosCalc(f => ({ ...f, stop: e.target.value }))}
                      placeholder="145.00"
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full bg-white/5 border border-[var(--v3-loss)]/20 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-[var(--v3-loss)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--v3-loss)]/20 transition font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Results */}
              {hasResult ? (
                <div className="space-y-3">
                  <span className="text-[10px] font-semibold tracking-widest uppercase text-slate-500">{t.calcResults}</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-cyan-500/25 rounded-xl p-4 flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-widest">
                        <Hash size={10} className="text-cyan-400" /> {t.sharesToBuy}
                      </div>
                      <div className="text-2xl font-bold font-mono text-cyan-400">{shares.toLocaleString()}</div>
                      <div className="text-xs text-slate-600">{t.sharesToBuyDesc}</div>
                    </div>

                    <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[var(--v3-loss)]/25 rounded-xl p-4 flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-widest">
                        <AlertTriangle size={10} className="text-[var(--v3-loss)]" /> {t.riskInDollars}
                      </div>
                      <div className="text-2xl font-bold font-mono text-[var(--v3-loss)]">${riskDollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <div className="text-xs text-slate-600">{riskN}% {t.ofCapital}</div>
                    </div>

                    <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[var(--v3-accent)]/25 rounded-xl p-4 flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-widest">
                        <DollarSign size={10} className="text-[var(--v3-accent)]" /> {t.positionSize}
                      </div>
                      <div className="text-2xl font-bold font-mono text-[var(--v3-accent)]">${posValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <div className="text-xs text-slate-600">{shares} × ${entN.toFixed(2)}</div>
                    </div>

                    <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-violet-500/25 rounded-xl p-4 flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-widest">
                        <Percent size={10} className="text-violet-400" /> {t.portfolioPct}
                      </div>
                      <div className="text-2xl font-bold font-mono text-violet-400">{portPct.toFixed(1)}%</div>
                      <div className="text-xs text-slate-600">{t.ofPortfolio} ${capN.toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Position-too-small hint — explains why Shares/Value are 0 */}
                  {calcPosSizeTooSmall && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg border text-xs bg-amber-500/5 border-amber-500/20 text-amber-400">
                      <AlertTriangle size={13} />
                      <span>{lang === "he"
                        ? "בסיכון הזה הסטופ רחב מדי ל-1 מניה — הגדל הון או הדק את הסטופ."
                        : "At this risk level the stop is too wide for even 1 share — raise capital or tighten the stop."}</span>
                    </div>
                  )}

                  {/* Copy to trade form button */}
                  <button
                    onClick={handleCopyToForm}
                    className="w-full mt-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-500/50"
                  >
                    <Copy size={14} />
                    {posCopied ? `✓ ${t.copiedToForm}` : t.copyToTradeForm}
                  </button>
                </div>
              ) : (
                <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-xl p-8 text-center">
                  <Calculator size={32} className="text-slate-700 mx-auto mb-3" />
                  <p className="text-sm text-slate-600">
                    {entN > 0 && stopN > 0 && entN === stopN ? t.stopEqualsEntry : t.enterDataToCalc}
                  </p>
                </div>
              )}
            </div>
          );
        })()}

        {/* ══════════════ ANALYTICS ══════════════ */}
        {tab === "analytics" && (
          <div className="space-y-8 animate-fade-in">
            {/* ═══════════ HERO — the story of your account ═══════════ */}
            <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-2xl p-6 md:p-8">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <span className="text-[11px] font-semibold tracking-widest uppercase text-slate-500">
                    {lang === "he" ? "הסיפור של החשבון שלך" : "The story of your account"}
                  </span>
                  <div className={`se-serif mt-2 text-5xl md:text-6xl leading-none tracking-tight ${totalPnL>=0?"text-[var(--v3-accent)]":"text-[var(--v3-loss)]"}`}>
                    {fmt$(Math.round(totalPnL * 100) / 100)}
                  </div>
                  <div className="mt-2.5 flex items-center gap-2 text-xs text-slate-500">
                    <span className={`font-mono font-semibold ${totalPnL>=0?"text-[var(--v3-accent)]":"text-[var(--v3-loss)]"}`}>
                      {totalPnL>=0?"▲":"▼"} {formatReturnPct(stats.returnPct)}
                    </span>
                    <span className="text-slate-600">·</span>
                    <span>{lang === "he" ? `הון התחלתי $${capital.toLocaleString()}` : `starting capital $${capital.toLocaleString()}`}</span>
                  </div>
                </div>
                <span className="text-[11px] font-semibold tracking-widest uppercase text-slate-500 flex items-center gap-1 shrink-0">
                  {t.equityCurve}<TermTooltip term="equityCurve" lang={lang} />
                </span>
              </div>
              <ResponsiveContainer width="100%" height={340}>
                <AreaChart data={equityCurve} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="eqFull" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--v3-info)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--v3-info)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--v3-line)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--v3-text-lo)" }} tickLine={false} axisLine={false} tickFormatter={v => typeof v === "string" && v.length === 10 && v[4] === "-" ? v.slice(5) : v} minTickGap={40} />
                  <YAxis domain={equityYDomain(equityCurve)} tick={{ fontSize: 11, fill: "var(--v3-text-lo)" }} tickLine={false} axisLine={false} tickFormatter={fmtAxisMoney} width={52} />
                  <ReferenceLine y={capital} stroke="var(--v3-text-lo)" strokeDasharray="5 5" label={{ value: lang === "he" ? "הון התחלתי" : "Starting Capital", position: "insideTopRight", fontSize: 9, fill: "var(--v3-text-lo)" }} />
                  <Tooltip
                    contentStyle={{ background: "var(--v3-bg-panel)", border: "1px solid var(--v3-line)", borderRadius: 10, fontSize: 11 }}
                    formatter={(v, n, p) => [`$${v.toLocaleString()} (${p.payload.ticker})`, "Equity"]}
                  />
                  <Area type="monotone" dataKey="equity" stroke="var(--v3-info)" strokeWidth={2.5} fill="url(#eqFull)" dot={{ fill: "var(--v3-info)", r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: "var(--v3-info)" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Supporting KPI strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label={t.totalTrades}  value={realTrades.length} sub={t.allTime}      icon={Layers}    accent="cyan"   />
              <StatCard label={<span className="flex items-center gap-1">{t.winRate}<TermTooltip term="winRate" lang={lang} /></span>} value={formatPct(winRate)} sub={`${stats.wins} ${t.wins}`} icon={CheckCircle} accent="green" />
              <StatCard label={<span className="flex items-center gap-1">{t.avgRMultiple}<TermTooltip term="avgR" lang={lang} /></span>} value={fmtR(avgR)} sub={t.closedTrades} icon={Activity}  accent="purple" />
              <StatCard label={t.totalReturn}   value={formatReturnPct(stats.returnPct)} sub={`$${Math.round(Math.abs(totalPnL)).toLocaleString()} P&L`} icon={TrendingUp} accent={totalPnL>=0?"green":"red"} />
            </div>

            {/* Per-trade P&L bars */}
            <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-xl p-6">
              <h3 className="text-[11px] font-semibold tracking-widest uppercase text-slate-500 mb-4">{t.pnlByTrade}</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={closedTrades.map(t => ({ name: t.ticker, pnl: Math.round(calcTradeMetrics(t).pnl || 0) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--v3-line)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--v3-text-lo)" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--v3-text-lo)" }} tickLine={false} axisLine={false} tickFormatter={v=>`$${v}`} />
                  <Tooltip contentStyle={{ background: "var(--v3-bg-panel)", border: "1px solid var(--v3-line)", borderRadius: 10, fontSize: 11 }} formatter={v=>[fmt$(v),"P&L"]} />
                  <ReferenceLine y={0} stroke="var(--v3-text-lo)" />
                  <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                    {closedTrades.map((t, i) => {
                      const { pnl } = calcTradeMetrics(t);
                      return <Cell key={i} fill={pnl > 0 ? "var(--v3-accent)" : "var(--v3-loss)"} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Setup breakdown — dynamic grouping from actual trade data */}
            <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-xl p-6">
              <h3 className="text-[11px] font-semibold tracking-widest uppercase text-slate-500 mb-4 flex items-center gap-1.5">{t.perfBySetup}<TermTooltip term="performanceBySetup" lang={lang} /></h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[...stats.bySetup]
                  .sort((a, b) => b.count - a.count)
                  .map((s) => (
                    <div key={s.name} className="bg-white/3 rounded-xl p-3 border border-[var(--border-subtle)] dark:border-white/[0.06]">
                      <div className="text-xs font-semibold text-[var(--v3-purple)] mb-2 truncate" title={labelFor("setup", s.name, lang)}>{labelFor("setup", s.name, lang)}</div>
                      <div className="font-bold text-white text-lg font-mono">{formatPct(s.winRate)}</div>
                      <div className="text-[10px] text-slate-500">{nTrades(s.count, lang)} · {s.totalR.toFixed(1)}R {t.rTotal}</div>
                      <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[var(--v3-purple)] to-[var(--v3-info)] rounded-full transition-all" style={{ width: `${s.winRate}%` }} />
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* ── P&L by Day of Week ── */}
            {(() => {
              const dayLookup = Object.fromEntries(stats.byDayOfWeek.map(d => [d.name, d]));
              const data = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday"].map(day => ({
                day: day.slice(0, 3),
                fullDay: day,
                pnl: Math.round(dayLookup[day]?.totalPnL || 0),
                count: dayLookup[day]?.count || 0,
              }));
              return (
                <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-xl p-6">
                  <h3 className="text-[11px] font-semibold tracking-widest uppercase text-slate-500 mb-1 flex items-center gap-1.5">{t.pnlByDay}<TermTooltip term="dayOfWeek" lang={lang} /></h3>
                  <p className="text-xs text-slate-600 mb-4">{t.pnlByDaySubtitle}</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--v3-line)" />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--v3-text-lo)" }} tickLine={false} axisLine={false} tickFormatter={v => dayLabel(v, lang)} />
                      <YAxis tick={{ fontSize: 11, fill: "var(--v3-text-lo)" }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                      <Tooltip
                        contentStyle={{ background: "var(--v3-bg-panel)", border: "1px solid var(--v3-line)", borderRadius: 10, fontSize: 11 }}
                        formatter={(v, n, p) => [`${fmt$(v)} · ${nTrades(p.payload.count, lang)}`, "P&L"]}
                        labelFormatter={l => lang === "he"
                          ? dayLabel(l, "he")
                          : (["Sun","Mon","Tue","Wed","Thu","Fri"].includes(l) ? ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday"][["Sun","Mon","Tue","Wed","Thu","Fri"].indexOf(l)] : l)}
                      />
                      <ReferenceLine y={0} stroke="var(--v3-text-lo)" />
                      <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                        {data.map((d, i) => (
                          <Cell key={i} fill={d.pnl >= 0 ? "var(--v3-accent)" : "var(--v3-loss)"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              );
            })()}

            {/* ── Win Rate by Setup Bar Chart — dynamic grouping ── */}
            {(() => {
              const data = stats.bySetup
                .map((s) => ({ setup: s.name, winRate: Math.round(s.winRate), count: s.count }))
                .filter(d => d.count > 0)
                .sort((a, b) => b.count - a.count);
              const short = name => name.length > 11 ? name.slice(0, 10) + "…" : name;
              return (
                <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-xl p-6">
                  <h3 className="text-[11px] font-semibold tracking-widest uppercase text-slate-500 mb-1 flex items-center gap-1.5">{t.winRateBySetup}<InfoTooltip label="Win Rate by Setup">{lang === 'he' ? 'אחוז הזכייה לכל סטאפ. עמודות סגולות = מעל 50% WR. עמודות אפורות = מתחת ל-50%. גובה העמודה = מספר עסקאות.' : 'Win rate per setup. Purple bars = above 50% WR. Gray bars = below 50%. Bar height = trade count.'}</InfoTooltip></h3>
                  <p className="text-xs text-slate-600 mb-4">{t.winRateBySetupSubtitle}</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--v3-line)" />
                      <XAxis dataKey="setup" tick={{ fontSize: 11, fill: "var(--v3-text-lo)" }} tickLine={false} axisLine={false} tickFormatter={v => short(labelFor("setup", v, lang))} angle={-45} textAnchor="end" interval={0} height={70} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--v3-text-lo)" }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                      <Tooltip
                        contentStyle={{ background: "var(--v3-bg-panel)", border: "1px solid var(--v3-line)", borderRadius: 10, fontSize: 11 }}
                        formatter={(v, n, p) => [`${v}% · ${nTrades(p.payload.count, lang)}`, "Win Rate"]}
                        labelFormatter={l => labelFor("setup", l, lang)}
                      />
                      <ReferenceLine y={50} stroke="var(--v3-text-lo)" strokeDasharray="4 4" label={{ value: "50%", position: "insideTopRight", fontSize: 9, fill: "var(--v3-text-lo)" }} />
                      <Bar dataKey="winRate" radius={[4, 4, 0, 0]} label={{ position: "top", fontSize: 9, fill: "var(--v3-text-mid)", formatter: (v, entry) => entry?.payload?.count ? `${entry.payload.count}t` : "" }}>
                        {data.map((d, i) => (
                          <Cell key={i} fill={d.winRate >= 50 ? "var(--v3-purple)" : "var(--v3-text-lo)"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              );
            })()}

            {/* ── Insight Cards: Best Day / Best Setup / Best Emotion ── */}
            {(() => {
              // Best Day — from the hub's day breakdown (single source)
              const bestDayEntry = [...stats.byDayOfWeek]
                .sort((a, b) => b.totalPnL - a.totalPnL)
                .map(d => [d.name, { pnl: d.totalPnL, count: d.count }])[0];

              // Best Setup — from the hub's setup breakdown (single source).
              // Win rate, then sample size — same deterministic tiebreak the
              // Journal insight strip uses, so both name the same setup. (#3)
              const bestSetup = [...stats.bySetup]
                .filter(s => s.count > 0)
                .sort((a, b) => (b.winRate - a.winRate) || (b.count - a.count))
                .map(s => ({ setup: s.name, winRate: s.winRate, count: s.count }))[0];

              // Best Emotion — local whitelist aggregation over the hub's enriched
              // closed metrics (pnl from the single source). Kept local because the
              // whitelist excludes missing-emotion trades, unlike byEmotion grouping.
              const EMOTIONS = ["Confident","Calm","Patient","Neutral","Hesitant","Nervous","FOMO","Angry"];
              const emotionStats = EMOTIONS.map(em => {
                const e = stats.closedMetrics.filter(m => m.emotionAtEntry === em);
                const wins = e.filter(m => (m.pnl || 0) > 0).length;
                const wr = e.length ? wins / e.length * 100 : 0;
                return { emotion: em, winRate: wr, count: e.length };
              }).filter(e => e.count > 0).sort((a, b) => b.winRate - a.winRate);
              const bestEmotion = emotionStats[0];

              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Best Day */}
                  <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-emerald-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-semibold tracking-widest uppercase text-emerald-400 flex items-center gap-1">{t.bestDay}<InfoTooltip label="Best Day">{lang === 'he' ? 'יום השבוע שבו הרווחת הכי הרבה מבחינת P&L כולל ומספר עסקאות.' : 'The weekday where you made the most total P&L and traded most successfully.'}</InfoTooltip></span>
                    </div>
                    {bestDayEntry ? (
                      <>
                        <div className="text-2xl font-bold text-white font-mono">{dayLabel(bestDayEntry[0], lang)}</div>
                        <div className="text-xs text-slate-500 mt-1">{fmt$(Math.round(bestDayEntry[1].pnl))} · {nTrades(bestDayEntry[1].count, lang)}</div>
                      </>
                    ) : (
                      <div className="text-sm text-slate-600">{t.logClosedForInsights}</div>
                    )}
                  </div>

                  {/* Best Setup */}
                  <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[var(--v3-purple)]/25 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-semibold tracking-widest uppercase text-[var(--v3-purple)] flex items-center gap-1">{t.bestSetup}<InfoTooltip label="Best Setup">{lang === 'he' ? 'הסטאפ הרווחי ביותר שלך לפי P&L כולל ואחוז הצלחה. זה ה-Edge שלך — תסחור אותו יותר.' : 'Your most profitable setup by total P&L and win rate. This is your edge — trade it more.'}</InfoTooltip></span>
                    </div>
                    {bestSetup ? (
                      <>
                        <div className="text-2xl font-bold text-white font-mono">{labelFor("setup", bestSetup.setup, lang)}</div>
                        <div className="text-xs text-slate-500 mt-1">{formatPct(bestSetup.winRate)} {t.winRate} · {nTrades(bestSetup.count, lang)}</div>
                      </>
                    ) : (
                      <div className="text-sm text-slate-600">{t.logClosedForInsights}</div>
                    )}
                  </div>

                  {/* Best Emotion */}
                  <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-amber-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-semibold tracking-widest uppercase text-amber-400 flex items-center gap-1">{t.bestEmotion}<InfoTooltip label="Best Emotion">{lang === 'he' ? 'המצב הרגשי שבו אתה מניב הכי טוב. כשאתה מרגיש ככה — הביצועים שלך חדים יותר.' : 'The emotional state where you perform best. When you feel this way, your trading is sharper.'}</InfoTooltip></span>
                    </div>
                    {bestEmotion ? (
                      <>
                        <div className="text-2xl font-bold text-white font-mono">{labelFor("emotion", bestEmotion.emotion, lang)}</div>
                        <div className="text-xs text-slate-500 mt-1">{formatPct(bestEmotion.winRate)} {t.winRate} · {nTrades(bestEmotion.count, lang)}</div>
                      </>
                    ) : (
                      <div className="text-sm text-slate-600">{t.logClosedForInsights}</div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* ── Master Stats Hub — Top Edges / Anti-Edges (Setup × Emotion) ── */}
            {(stats.topEdges.length > 0 || stats.antiEdges.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stats.topEdges.length > 0 && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4">
                    <h3 className="text-emerald-400 font-bold text-sm mb-3 flex items-center gap-1.5">🎯 {t.topEdges}<TermTooltip term="edge" lang={lang} /></h3>
                    {stats.topEdges.map((edge, i) => (
                      <div key={edge.name || i} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                        <div>
                          <PatternTags parts={[{ dim: "setup", value: edge.setup }, { dim: "emotion", value: edge.emotion }]} lang={lang} />
                          <div className="text-slate-400 text-xs">{nTrades(edge.count, lang)}</div>
                        </div>
                        <div className="text-end">
                          <div className="text-emerald-400 font-bold text-sm">{formatPct(edge.winRate)} WR</div>
                          <div className="text-slate-300 text-xs">${edge.totalPnL.toFixed(0)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {stats.antiEdges.length > 0 && (
                  <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4">
                    <h3 className="text-rose-400 font-bold text-sm mb-3 flex items-center gap-1.5">⚠️ {t.antiEdges}<TermTooltip term="antiEdge" lang={lang} /></h3>
                    {stats.antiEdges.map((edge, i) => (
                      <div key={edge.name || i} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                        <div>
                          <PatternTags parts={[{ dim: "setup", value: edge.setup }, { dim: "emotion", value: edge.emotion }]} lang={lang} />
                          <div className="text-slate-400 text-xs">{nTrades(edge.count, lang)}</div>
                        </div>
                        <div className="text-end">
                          <div className="text-rose-400 font-bold text-sm">{formatPct(edge.winRate)} WR</div>
                          <div className="text-slate-300 text-xs">${edge.totalPnL.toFixed(0)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ═══════════ NEW: 6 ADDITIONAL ANALYTICS CHARTS ═══════════ */}
            {closedTrades.length > 0 && (() => {
              // 1. R Distribution
              const rBuckets = [
                { range: "< -2R", min: -Infinity, max: -2, count: 0 },
                { range: "-2 to -1R", min: -2, max: -1, count: 0 },
                { range: "-1 to 0R", min: -1, max: 0, count: 0 },
                { range: "0 to 1R", min: 0, max: 1, count: 0 },
                { range: "1 to 2R", min: 1, max: 2, count: 0 },
                { range: "2 to 3R", min: 2, max: 3, count: 0 },
                { range: "> 3R", min: 3, max: Infinity, count: 0 },
              ];
              closedTrades.forEach(t => {
                const { rMultiple } = calcTradeMetrics(t);
                if (rMultiple == null) return;
                const b = rBuckets.find(b => rMultiple >= b.min && rMultiple < b.max);
                if (b) b.count++;
              });

              // 2. P&L by Month
              const monthMap = {};
              closedTrades.forEach(t => {
                const d = t.exitDate || t.date;
                if (!d) return;
                const { pnl } = calcTradeMetrics(t);
                if (pnl == null) return;
                const key = d.slice(0, 7); // YYYY-MM
                if (!monthMap[key]) monthMap[key] = { month: key, pnl: 0, count: 0 };
                monthMap[key].pnl += pnl;
                monthMap[key].count += 1;
              });
              const pnlByMonth = Object.values(monthMap)
                .sort((a, b) => a.month.localeCompare(b.month))
                .map(m => ({ ...m, pnl: Math.round(m.pnl) }));

              // 3. Emotion Performance — over the hub's enriched closed metrics
              const emoMap = {};
              stats.closedMetrics.forEach(m => {
                const e = m.emotionAtEntry || "Neutral";
                if (!emoMap[e]) emoMap[e] = { emotion: e, count: 0, wins: 0, totalPnL: 0 };
                emoMap[e].count++;
                if ((m.pnl ?? 0) > 0) emoMap[e].wins++;
                emoMap[e].totalPnL += m.pnl ?? 0;
              });
              const emotionStatsArr = Object.values(emoMap).map(e => ({
                ...e,
                totalPnL: Math.round(e.totalPnL),
                winRate: e.count ? Math.round(e.wins / e.count * 100) : 0,
              }));

              // 4. Streak History
              const sorted = [...closedTrades].sort((a, b) =>
                new Date(a.date || 0) - new Date(b.date || 0));
              const streaks = [];
              let cur = 0, curType = null;
              sorted.forEach(t => {
                const { pnl } = calcTradeMetrics(t);
                if (pnl == null || pnl === 0) return;
                const isWin = pnl > 0;
                const nt = isWin ? "win" : "loss";
                if (curType === null || curType === nt) { curType = nt; cur++; }
                else { streaks.push({ type: curType, length: cur }); curType = nt; cur = 1; }
              });
              if (cur > 0 && curType) streaks.push({ type: curType, length: cur });
              const maxStreak = streaks.reduce((m, s) => Math.max(m, s.length), 1);

              // 5. Setup Matrix — from the hub's setup breakdown (single source)
              const setupMatrix = stats.bySetup.map(s => ({
                setup: s.name,
                count: s.count,
                wins: s.wins,
                totalR: s.totalR,
                winRate: s.count ? Math.round(s.winRate) : 0,
                avgR: s.count ? s.avgR.toFixed(2) : "0",
                totalPnL: Math.round(s.totalPnL),
              })).sort((a, b) => b.totalPnL - a.totalPnL);

              // 6. Hold Time vs P&L
              const holdScatter = closedTrades.map(t => {
                const { pnl } = calcTradeMetrics(t);
                const hold = holdDays(t);
                if (pnl == null || hold == null) return null;
                return { hold, pnl: Math.round(pnl), ticker: t.ticker };
              }).filter(Boolean);

              const darkTooltip = { background: "var(--v3-bg-panel)", border: "1px solid var(--v3-line)", borderRadius: 10, fontSize: 11, color: "var(--v3-text-mid)" };

              return (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* R Distribution */}
                    <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-xl p-6">
                      <h3 className="text-[11px] font-semibold tracking-widest uppercase text-slate-500 mb-1 flex items-center gap-1.5">
                        {lang === "he" ? "התפלגות R Multiple" : "R Multiple Distribution"}
                        <InfoTooltip label="R Distribution">
                          {lang === "he"
                            ? "כמה עסקאות בכל טווח R. רוב העסקאות ב-0-1R = יוצא מוקדם מדי."
                            : "Trades per R range. Most in 0-1R = exiting too early."}
                        </InfoTooltip>
                      </h3>
                      <p className="text-xs text-slate-600 mb-4">{lang === "he" ? "איפה העסקאות נוחתות — המנצחות מימין" : "Where your trades land — winners cluster right"}</p>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={rBuckets} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--v3-line)" />
                          <XAxis dataKey="range" tick={{ fontSize: 11, fill: "var(--v3-text-lo)" }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: "var(--v3-text-lo)" }} tickLine={false} axisLine={false} />
                          <Tooltip contentStyle={darkTooltip} />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                            {rBuckets.map((entry, i) => (
                              <Cell key={i} fill={entry.max <= 0 ? "var(--v3-loss)" : "var(--v3-accent)"} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* P&L by Month */}
                    <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-xl p-6">
                      <h3 className="text-[11px] font-semibold tracking-widest uppercase text-slate-500 mb-1 flex items-center gap-1.5">
                        {lang === "he" ? "P&L לפי חודש" : "P&L by Month"}
                        <InfoTooltip label="P&L by Month">
                          {lang === "he"
                            ? "רווח/הפסד חודשי. עוזר לזהות חודשים חזקים וחלשים."
                            : "Monthly P&L. Spot your strong and weak months."}
                        </InfoTooltip>
                      </h3>
                      <p className="text-xs text-slate-600 mb-4">{lang === "he" ? "לוח התוצאות חודש-אחר-חודש" : "Your month-by-month scoreboard"}</p>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={pnlByMonth} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--v3-line)" />
                          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--v3-text-lo)" }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: "var(--v3-text-lo)" }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                          <Tooltip contentStyle={darkTooltip} formatter={(v, n, p) => [`${fmt$(v)} · ${p.payload.count} trade${p.payload.count !== 1 ? "s" : ""}`, "P&L"]} />
                          <ReferenceLine y={0} stroke="var(--v3-text-lo)" />
                          <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                            {pnlByMonth.map((d, i) => (
                              <Cell key={i} fill={d.pnl >= 0 ? "var(--v3-accent)" : "var(--v3-loss)"} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Emotion Performance */}
                    <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-xl p-6">
                      <h3 className="text-[11px] font-semibold tracking-widest uppercase text-slate-500 mb-1 flex items-center gap-1.5">
                        {lang === "he" ? "ביצועים לפי רגש" : "Performance by Emotion"}
                        <InfoTooltip label="Emotion Performance">
                          {lang === "he"
                            ? "P&L כולל לפי רגש בכניסה. FOMO/Angry שלילי = להימנע."
                            : "Total P&L by entry emotion. Negative FOMO/Angry = avoid."}
                        </InfoTooltip>
                      </h3>
                      <p className="text-xs text-slate-600 mb-4">{lang === "he" ? "הרגש שמרוויח לך כסף" : "Which emotion pays off"}</p>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={emotionStatsArr} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--v3-line)" />
                          <XAxis dataKey="emotion" tick={{ fontSize: 11, fill: "var(--v3-text-lo)" }} tickLine={false} axisLine={false} tickFormatter={v => labelFor("emotion", v, lang)} />
                          <YAxis tick={{ fontSize: 11, fill: "var(--v3-text-lo)" }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                          <Tooltip contentStyle={darkTooltip} formatter={(v, n, p) => [`${fmt$(v)} · ${formatPct(p.payload.winRate)} WR`, "P&L"]} />
                          <ReferenceLine y={0} stroke="var(--v3-text-lo)" />
                          <Bar dataKey="totalPnL" radius={[4, 4, 0, 0]}>
                            {emotionStatsArr.map((e, i) => (
                              <Cell key={i} fill={e.totalPnL >= 0 ? "var(--v3-accent)" : "var(--v3-loss)"} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      {/* Named legend — canonical "?" home for each emotion (chart axis can't host tooltips) */}
                      <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3 pt-3 border-t border-white/[0.06]">
                        {emotionStatsArr.map((e) => {
                          const emoKey = `emotion${e.emotion}`;
                          return (
                            <span key={e.emotion} className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                              <span className={`w-2 h-2 rounded-full ${e.totalPnL >= 0 ? "bg-emerald-500" : "bg-rose-500"}`} />
                              {labelFor("emotion", e.emotion, lang)}
                              {TRADING_TOOLTIPS[emoKey] && <TermTooltip term={emoKey} lang={lang} />}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Streak History */}
                    <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-xl p-6">
                      <h3 className="text-[11px] font-semibold tracking-widest uppercase text-slate-500 mb-1 flex items-center gap-1.5">
                        {lang === "he" ? "היסטוריית רצפים" : "Streak History"}
                        <InfoTooltip label="Streak History">
                          {lang === "he"
                            ? "רצפי ניצחונות/הפסדים. רצף הפסד ארוך = איתות לעצור ולנשום."
                            : "Win/loss streaks. Long loss streak = stop and reassess."}
                        </InfoTooltip>
                      </h3>
                      <p className="text-xs text-slate-600 mb-4">{lang === "he" ? `${streaks.length} רצפים · מקסימום ${maxStreak}` : `${streaks.length} streaks · max ${maxStreak}`}</p>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pe-1">
                        {streaks.length === 0 ? (
                          <p className="text-xs text-slate-600 text-center py-8">{lang === "he" ? "עוד אין מספיק עסקאות — סגור כמה כדי לראות רצפים." : "Not enough trades yet — close a few to see your streaks."}</p>
                        ) : streaks.map((s, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-slate-500 w-14 shrink-0">
                              {s.type === "win" ? (lang === "he" ? "ניצחון" : "Win") : (lang === "he" ? "הפסד" : "Loss")} ×{s.length}
                            </span>
                            <div className="flex-1 bg-white/5 rounded-full h-3 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${s.type === "win" ? "bg-[var(--v3-accent)]" : "bg-[var(--v3-loss)]"}`}
                                style={{ width: `${Math.max(8, (s.length / maxStreak) * 100)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Setup Matrix */}
                  <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-xl p-6">
                    <h3 className="text-[11px] font-semibold tracking-widest uppercase text-slate-500 mb-1 flex items-center gap-1.5">
                      {lang === "he" ? "מטריצת סטאפים" : "Setup Matrix"}
                      <InfoTooltip label="Setup Matrix">
                        {lang === "he"
                          ? "ביצועים מלאים לכל סטאפ: עסקאות, WR%, ממוצע R, רווח כולל."
                          : "Full performance per setup: trades, WR%, avg R, total P&L."}
                      </InfoTooltip>
                    </h3>
                    <p className="text-xs text-slate-600 mb-4">{lang === "he" ? "מסודר לפי רווח כולל" : "Sorted by total P&L"}</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm table-fixed sm:table-auto">
                        <thead>
                          <tr className="text-[10px] text-slate-500 uppercase tracking-wider border-b border-[var(--border-subtle)] dark:border-white/[0.06]">
                            <th className="text-start py-2 px-1 sm:px-0 font-semibold">{lang === "he" ? "סטאפ" : "Setup"}</th>
                            <th className="text-center py-2 px-1 sm:px-0 font-semibold w-[46px] sm:w-auto">{lang === "he" ? "עסקאות" : "Trades"}</th>
                            <th className="text-center py-2 px-1 sm:px-0 font-semibold w-[49px] sm:w-auto">{t.wrPct}</th>
                            <th className="text-center py-2 px-1 sm:px-0 font-semibold w-[44px] sm:w-auto">{t.avgRShort}</th>
                            <th className="text-end py-2 px-1 sm:px-0 font-semibold w-[78px] sm:w-auto">{lang === "he" ? "רווח כולל" : "Total P&L"}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {setupMatrix.map(s => (
                            <tr key={s.setup} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                              <td className="py-2.5 px-1 sm:px-0 font-semibold text-white">
                                <span className="flex items-center gap-1 min-w-0">
                                  <span
                                    className="truncate text-[10px] sm:text-sm sm:overflow-visible sm:whitespace-normal"
                                    title={labelFor("setup", s.setup, lang)}
                                  >
                                    {labelFor("setup", s.setup, lang)}
                                  </span>
                                  {resolveSetupKey(s.setup) && <TermTooltip term={resolveSetupKey(s.setup)} lang={lang} />}
                                </span>
                              </td>
                              <td className="py-2.5 px-1 sm:px-0 text-center text-slate-400 font-mono text-[10px] sm:text-sm">{s.count}</td>
                              <td className="py-2.5 px-1 sm:px-0 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  s.winRate >= 60 ? "bg-emerald-500/15 text-emerald-400"
                                  : s.winRate >= 40 ? "bg-amber-500/15 text-amber-400"
                                  : "bg-rose-500/15 text-rose-400"
                                }`}>{formatPct(s.winRate)}</span>
                              </td>
                              <td className="py-2.5 px-1 sm:px-0 text-center font-mono text-[10px] sm:text-sm text-slate-300">{s.avgR}R</td>
                              <td className={`py-2.5 px-1 sm:px-0 text-end font-mono font-bold text-[10px] sm:text-sm ${s.totalPnL >= 0 ? "text-[var(--v3-accent)]" : "text-[var(--v3-loss)]"}`}>
                                {fmt$(s.totalPnL)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Hold Time vs P&L Scatter */}
                  {holdScatter.length > 0 && (
                    <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-xl p-6">
                      <h3 className="text-[11px] font-semibold tracking-widest uppercase text-slate-500 mb-1 flex items-center gap-1.5">
                        {lang === "he" ? "זמן החזקה vs P&L" : "Hold Time vs P&L"}
                        <InfoTooltip label="Hold Time vs PnL">
                          {lang === "he"
                            ? "כל נקודה = עסקה אחת. רואים אם החזקה ארוכה משתלמת."
                            : "Each dot = one trade. Reveals if longer holds pay off."}
                        </InfoTooltip>
                      </h3>
                      <p className="text-xs text-slate-600 mb-4">{nTrades(holdScatter.length, lang)}</p>
                      <ResponsiveContainer width="100%" height={280}>
                        <ScatterChart margin={{ top: 10, right: 16, left: 0, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--v3-line)" />
                          <XAxis
                            type="number"
                            dataKey="hold"
                            name="Days"
                            domain={[0, 'dataMax']}
                            allowDecimals={false}
                            tick={{ fontSize: 11, fill: "var(--v3-text-lo)" }}
                            tickLine={false}
                            axisLine={false}
                            label={{ value: lang === "he" ? "ימי החזקה" : "Days held", position: "insideBottom", offset: -2, fontSize: 10, fill: "var(--v3-text-lo)" }}
                          />
                          <YAxis
                            type="number"
                            dataKey="pnl"
                            name="P&L"
                            tick={{ fontSize: 11, fill: "var(--v3-text-lo)" }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={v => `$${v}`}
                          />
                          <ReferenceLine y={0} stroke="var(--v3-text-lo)" />
                          <Tooltip
                            cursor={{ strokeDasharray: "3 3" }}
                            content={({ payload }) => {
                              if (!payload?.length) return null;
                              const d = payload[0].payload;
                              return (
                                <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[var(--border-subtle)] dark:border-[var(--v3-line)] rounded-lg px-3 py-2 text-xs shadow-xl">
                                  <p className="font-mono font-bold text-[var(--text-primary)] dark:text-white">{d.ticker}</p>
                                  <p className="text-slate-400">{lang === "he" ? "ימים" : "Days"}: {d.hold}</p>
                                  <p className={d.pnl >= 0 ? "text-[var(--v3-accent)]" : "text-[var(--v3-loss)]"}>{fmt$(d.pnl)}</p>
                                </div>
                              );
                            }}
                          />
                          <Scatter data={holdScatter}>
                            {holdScatter.map((entry, i) => (
                              <Cell key={i} fill={entry.pnl >= 0 ? "var(--v3-accent)" : "var(--v3-loss)"} fillOpacity={0.75} />
                            ))}
                          </Scatter>
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* ══════════════ INTEL ══════════════ */}
        {tab === "intel" && (
          <div className="space-y-4 animate-fade-in">

            {/* Screen header — frames the monitor. Sharp & readable (Heebo bold), no serif. */}
            <header className="mb-1">
              <span className="text-[11px] font-semibold tracking-widest uppercase text-slate-500">
                {lang === "he" ? "מודיעין שוק" : "Market Intel"}
              </span>
              <h2 className="mt-1.5 text-xl md:text-2xl font-bold tracking-tight text-white">
                {lang === "he" ? "מה השוק עושה עכשיו" : "What the market is doing now"}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {lang === "he" ? "קרא את המפה לפני שאתה נכנס לפוזיציה." : "Read the tape before you size your next trade."}
              </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* TradingView Chart */}
              <div className="md:col-span-2 relative">
                <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-xl overflow-hidden" style={{ height: 520 }}>
                  <div ref={tvRef} style={{ height: "100%" }} />
                </div>

                {/* ── AI Trade Buttons (screenshot → OCR) — below chart on mobile, overlay on desktop ── */}
                <div className="mt-2 z-10 flex flex-row flex-wrap justify-end gap-2 md:mt-0 md:absolute md:bottom-4 md:right-4 rtl:md:right-auto rtl:md:left-4 md:flex-col md:flex-nowrap md:justify-start">
                  {/* Capture/OCR status — announced to assistive tech */}
                  {chartOcrStatus && (() => {
                    const { status, confidence } = chartOcrStatus;
                    const ok = status === "ok";
                    const high = ok && confidence >= 70;
                    const mid  = ok && confidence >= 40 && confidence < 70;
                    const tone =
                      status === "processing" ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-200" :
                      high ? "bg-emerald-500/10 border-emerald-500/30 text-[#10b981]" :
                      mid  ? "bg-amber-500/10 border-amber-500/30 text-amber-300" :
                             "bg-[#ef4444]/10 border-[#ef4444]/30 text-[#fca5a5]";
                    let icon, text;
                    if (status === "processing") { icon = <RefreshCw size={12} className="animate-spin" />; text = t.ocrProcessing; }
                    else if (status === "config_error") { icon = <AlertTriangle size={12} />; text = t.ocrConfigError; }
                    else if (status === "error") { icon = <AlertTriangle size={12} />; text = t.ocrError; }
                    else if (high) { icon = <CheckCircle size={12} />; text = `OCR ✓ ${confidence}%`; }
                    else if (mid)  { icon = <CheckCircle size={12} />; text = `OCR ~ ${confidence}%`; }
                    else { icon = <AlertTriangle size={12} />; text = t.ocrLowConfidence; }
                    return (
                      <div role="status" aria-live="polite" className={`flex items-center justify-center gap-2 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold shadow-xl backdrop-blur-md ${tone}`}>
                        {icon}<span>{text}</span>
                      </div>
                    );
                  })()}
                  <div className="flex items-center justify-end gap-1.5">
                    <TermTooltip term="chartCalcPosition" lang={lang} />
                    <button
                      onClick={(e) => handleChartAiExtract("position", e)}
                      disabled={chartAiLoading}
                      aria-label={t.chartCapturePositionAria}
                      aria-busy={chartAiLoading && chartAiTarget === "position"}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-xl backdrop-blur-md bg-[var(--v3-info-glow)] border border-[var(--v3-info)] text-[var(--v3-info)] hover:bg-[var(--v3-info)] hover:border-[var(--v3-info)] hover:text-white disabled:opacity-50"
                    >
                      {chartAiLoading && chartAiTarget === "position" ? (
                        <><RefreshCw size={13} className="animate-spin" /> {t.calculating}</>
                      ) : (
                        <><Calculator size={13} /> {t.calculatePosition}</>
                      )}
                    </button>
                  </div>
                  <div className="flex items-center justify-end gap-1.5">
                    <TermTooltip term="chartAddToJournal" lang={lang} />
                    <button
                      onClick={(e) => handleChartAiExtract("journal", e)}
                      disabled={chartAiLoading}
                      aria-label={t.chartCaptureJournalAria}
                      aria-busy={chartAiLoading && chartAiTarget === "journal"}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-xl backdrop-blur-md bg-[var(--v3-purple-glow)] border border-[var(--v3-purple)] text-[var(--v3-purple)] hover:bg-[var(--v3-purple)] hover:border-[var(--v3-purple)] hover:text-white disabled:opacity-50"
                    >
                      {chartAiLoading && chartAiTarget === "journal" ? (
                        <><RefreshCw size={13} className="animate-spin" /> {t.processing}</>
                      ) : (
                        <><BookOpen size={13} /> {t.addToJournal}</>
                      )}
                    </button>
                  </div>
                  {/* Graceful fallback: file / camera picker when screen capture is unavailable or cancelled */}
                  <input ref={chartFileRef} type="file" accept="image/*" capture="environment" onChange={handleChartFileFallback} className="hidden" aria-hidden="true" tabIndex={-1} />
                </div>
              </div>

              {/* Watchlist */}
              <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-xl p-4 flex flex-col" style={{ height: 440 }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold tracking-widest uppercase text-slate-500">{t.watchlist}</span>
                  <div className="flex items-center gap-2">
                    {pricesLoading && <RefreshCw size={10} className="animate-spin text-[var(--v3-info)]" />}
                    <Radio size={12} className="text-[var(--v3-info)]" />
                  </div>
                </div>
                {/* Professional symbol search — full-market autocomplete via
                    TradingView (Yahoo fallback). Picks add to the watchlist and
                    load the chart in one action. */}
                <div className="flex mb-3">
                  <TradingViewSearch
                    value={chartSymbol}
                    onPick={handleSymbolPick}
                    livePrices={livePrices}
                    setLivePrices={setLivePrices}
                    placeholder={t.addTicker}
                    lang={lang}
                  />
                </div>

                {/* Sort controls */}
                <div className="flex items-center gap-1 mb-2">
                  <span className="text-[9px] text-slate-600">{t.sortBy}:</span>
                  {[["ticker","A-Z"],["changePct","%"],["price","$"],["sector",t.sectorSort]].map(([key, label]) => (
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
                    if (watchlistSortBy === "sector") {
                      const sa = getTickerMeta(a.ticker)?.sector ?? "zzz";
                      const sb = getTickerMeta(b.ticker)?.sector ?? "zzz";
                      return sa.localeCompare(sb);
                    }
                    return a.ticker.localeCompare(b.ticker);
                  }).map(s => {
                    const lp = getLivePrice(s.ticker);
                    const price = lp?.price ?? s.price;
                    const changePct = lp?.changePct ?? s.change ?? 0;
                    const meta = getTickerMeta(s.ticker);
                    const sectorColor = meta?.sector === 'ETF' ? 'bg-blue-500/20 text-blue-400' :
                      meta?.sector === 'Crypto' ? 'bg-amber-500/20 text-amber-400' :
                      meta?.sector === 'Technology' ? 'bg-purple-500/20 text-purple-400' :
                      meta?.sector === 'Healthcare' ? 'bg-emerald-500/20 text-emerald-400' :
                      meta?.sector === 'Financials' ? 'bg-sky-500/20 text-sky-400' :
                      meta?.sector === 'Automotive' ? 'bg-orange-500/20 text-orange-400' :
                      meta?.sector === 'Communications' ? 'bg-pink-500/20 text-pink-400' :
                      'bg-slate-500/20 text-slate-400';
                    return (
                      <div key={s.ticker}
                        className={`flex items-center justify-between p-2 bg-white/3 rounded-lg border transition group ${chartSymbol === s.chartSym ? "border-[var(--v3-info)] bg-[var(--v3-info-glow)]" : "border-[var(--border-subtle)] dark:border-white/[0.06] hover:border-[var(--v3-info)] hover:bg-[var(--v3-info-glow)]"}`}>
                        <button type="button" className="flex items-center gap-1.5 flex-1 text-end" onClick={() => setChartSymbol(s.chartSym)} aria-label={t.selectStock}>
                          <TickerLogo ticker={s.ticker} size={18} />
                          <div>
                            <div className="font-bold text-[11px] text-white font-mono">{s.ticker}</div>
                            {meta ? (
                              <div className="flex items-center gap-1 mt-0.5">
                                <span dir="ltr" className="text-[11px] text-slate-500 truncate max-w-[72px] text-start">{meta.name}</span>
                                <span className={`text-[7px] px-1 rounded-full font-medium ${sectorColor}`}>{labelFor("sector", meta.sector, lang)}</span>
                              </div>
                            ) : lp?.volume ? (
                              <div className="text-[8px] text-slate-700 font-mono">Vol: {fmtVolume(lp.volume)}</div>
                            ) : null}
                          </div>
                        </button>
                        <div className="text-end flex items-center gap-1.5">
                          {price != null ? (
                            <div>
                              <div className="text-[11px] font-mono font-bold text-slate-200">${typeof price === 'number' ? price.toFixed(2) : price}</div>
                              <div className={`text-[9px] font-mono font-semibold flex items-center justify-end gap-0.5 ${changePct>=0?"text-[var(--v3-accent)]":"text-[var(--v3-loss)]"}`}>
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

            {/* ── MARKET OVERVIEW ── weekly change across indices, sectors & themes */}
            <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-semibold tracking-widest uppercase text-slate-500">{t.mo_title}</span>
                <span className={`w-1.5 h-1.5 rounded-full ${pulse ? "bg-emerald-400" : "bg-emerald-700"} transition-colors`} />
                <span className="text-[10px] text-slate-700">
                  {moRange === 1 ? t.mo_change1d : moRange === 30 ? t.mo_change1m : t.mo_change1w}
                </span>
                <div className="flex items-center gap-1 ms-auto">
                  {[[1, "1D"], [7, "1W"], [30, "1M"]].map(([days, label]) => (
                    <button key={days} onClick={() => setMoRange(days)}
                      className={`text-[9px] px-1.5 py-0.5 rounded ${moRange === days ? "bg-cyan-500/20 text-cyan-400" : "text-slate-600 hover:text-slate-400"} transition`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {!marketOverview || (marketOverview.indices.length === 0 && marketOverview.sectorsThemes.length === 0) ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2 text-slate-600">
                  <RefreshCw size={20} className="animate-spin" />
                  <p className="text-xs text-center">{t.mo_loading}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Row 1 — Market Pulse (indices). Render every configured index;
                       ones that haven't resolved yet get a placeholder so a partial
                       upstream response shows the full row instead of a broken gap. */}
                  <div>
                    <p className="text-[10px] font-semibold tracking-widest uppercase text-slate-600 mb-2">{t.mo_pulse}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                      {MARKET_OVERVIEW.indices.map(cfg => {
                        const loaded = marketOverview.indices.find(x => x.sym === cfg.sym.toUpperCase());
                        return loaded
                          ? <MarketPulseCard key={cfg.sym} item={loaded} t={t} />
                          : <MarketPulseCardSkeleton key={cfg.sym} item={cfg} t={t} />;
                      })}
                    </div>
                  </div>

                  {/* Row 2 — Sectors & Themes, sorted best → worst */}
                  {marketOverview.sectorsThemes.length > 0 && (() => {
                    const st = marketOverview.sectorsThemes;
                    const maxAbs = Math.max(...st.map(s => Math.abs(s.weekChangePct)), 0.01);
                    const top = st[0], bottom = st[st.length - 1];
                    const fmt = (s) => `${t[s.key] || s.sym} ${s.weekChangePct >= 0 ? "+" : ""}${s.weekChangePct.toFixed(1)}%`;
                    return (
                      <div>
                        <p className="text-[10px] font-semibold tracking-widest uppercase text-slate-600 mb-2">{t.mo_sectorsThemes}</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2"
                          role="img" aria-label={`${t.mo_ariaMovers}. ${fmt(top)}, ${fmt(bottom)}`}>
                          {st.map(item => (
                            <SectorThemeCard key={item.sym} item={item} t={t} maxAbs={maxAbs} />
                          ))}
                        </div>
                      </div>
                    );
                  })()}
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
          const tiltCount = realTrades.filter(t => {
            if (t.followedPlan !== false) return false;
            const d = new Date(t.date + "T12:00:00");
            return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
          }).length;
          const tiltLevel = tiltCount === 0 ? "safe" : tiltCount <= 2 ? "safe" : tiltCount === 3 ? "warning" : "danger";
          const tiltColor = tiltLevel === "safe" ? "#00C076" : tiltLevel === "warning" ? "#F59E0B" : "#F43F5E";
          const tiltBg = tiltLevel === "safe" ? "border-[#00C076]/25 bg-[var(--v3-accent-glow)]" : tiltLevel === "warning" ? "border-[#F59E0B]/25 bg-[var(--v3-warn-glow)]" : "border-[#F43F5E]/25 bg-[#F43F5E]/5";
          const tiltPct = Math.min(tiltCount / 6 * 100, 100);

          // ── Playbook: calculate success rate per setup from journal ──
          const calcSetupSuccess = (setupName) => {
            const matched = realTrades.filter(t => t.setup === setupName && t.status === "CLOSED");
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
                <h2 className="text-sm font-bold text-white flex items-center gap-2"><Settings size={15} className="text-[var(--v3-text-mid)]" /> {t.settings}</h2>
                <p className="text-xs text-[var(--v3-text-lo)] mt-0.5">{t.playbookAndDiscipline}</p>
              </div>

              {/* ── APPEARANCE (Theme) ── */}
              <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span aria-hidden="true" className="text-base">🎨</span>
                  <h3 className="text-sm font-bold text-white">{t.appearance}</h3>
                </div>
                <p className="text-xs text-[var(--v3-text-lo)] mb-3">{t.appearanceDesc}</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "auto",  icon: Monitor, label: t.themeAuto,  desc: t.themeSystem },
                    { value: "light", icon: Sun,     label: t.themeLight },
                    { value: "dark",  icon: Moon,    label: t.themeDark  },
                  ].map((opt) => {
                    const Icon = opt.icon;
                    const isActive = themeMode === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setThemeMode(opt.value)}
                        aria-label={opt.label}
                        aria-pressed={isActive}
                        className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border transition-all ${
                          isActive
                            ? "border-[var(--v3-accent)] bg-[var(--v3-accent-glow)]"
                            : "border-[var(--border-subtle)] dark:border-white/[0.08] hover:border-white/20"
                        }`}
                      >
                        <Icon size={18} className={isActive ? "text-emerald-700 dark:text-[var(--v3-accent)]" : "text-[var(--v3-text-lo)]"} />
                        <span className={`text-xs font-semibold ${isActive ? "text-emerald-700 dark:text-[var(--v3-accent)]" : "text-[var(--v3-text-mid)]"}`}>
                          {opt.label}
                        </span>
                        {opt.desc && (
                          <span className="text-[10px] text-[var(--v3-text-lo)]">{opt.desc}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {themeMode === "auto" && (
                  <p className="text-xs text-[var(--v3-text-lo)] mt-3">
                    {t.themeCurrentlyLabel} {themeResolved === "dark" ? t.themeDark : t.themeLight} ({t.themeSystemPreference})
                  </p>
                )}
              </div>

              {/* ── LANGUAGE SELECTOR ── */}
              <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Globe size={16} className="text-[var(--v3-text-mid)]" />
                  <h3 className="text-sm font-bold text-white">{t.language}</h3>
                </div>
                <p className="text-xs text-[var(--v3-text-lo)] mb-3">{t.languageDesc}</p>
                <select
                  value={lang}
                  onChange={e => setLang(e.target.value)}
                  dir="ltr"
                  className="w-full bg-white/5 border border-[var(--border-subtle)] dark:border-white/[0.10] rounded-lg px-3 py-2.5 text-sm text-white focus:border-[var(--v3-accent)] focus:outline-none transition font-semibold"
                >
                  {LANGUAGES.map(l => (
                    <option key={l.code} value={l.code}>
                      {l.nativeName}
                    </option>
                  ))}
                </select>
              </div>

              {/* ── SECURITY (Change Password) ── */}
              {(() => {
                const provider = authUser?.app_metadata?.provider || "email";
                const isGoogle = provider === "google";
                return (
                  <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <KeyRound size={16} className="text-[var(--v3-text-mid)]" />
                      <h3 className="text-sm font-bold text-white">{t.security}</h3>
                    </div>
                    {isGoogle ? (
                      <div className="p-3 bg-[var(--v3-info-glow)] border border-[#06b6d4]/30 rounded-xl">
                        <p className="text-xs text-[var(--v3-text-mid)] leading-relaxed">
                          {t.googleSignedInInfo}
                        </p>
                        <a
                          href="https://myaccount.google.com/security"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-[var(--v3-info)] hover:underline"
                        >
                          {t.manageOnGoogle}
                          <ExternalLink size={11} />
                        </a>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-[var(--v3-text-lo)] mb-3">
                          {t.changePassword}
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowChangePassword(true)}
                          className="w-full px-4 py-2.5 rounded-lg bg-[var(--v3-accent-glow)] border border-[#00C076]/30 text-[var(--v3-accent)] text-xs font-bold hover:bg-[#00C076]/20 transition flex items-center justify-between"
                        >
                          <span className="flex items-center gap-2">
                            <Lock size={12} />
                            {t.changePassword}
                          </span>
                          <span className="text-[var(--v3-text-lo)]">{isRTL ? "←" : "→"}</span>
                        </button>
                      </>
                    )}
                  </div>
                );
              })()}

              {/* ── MENTORING (B4.2) ── */}
              <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Users size={16} className="text-[var(--v3-text-mid)]" />
                  <h3 className="text-sm font-bold text-white">{t.mentoringTitle}</h3>
                </div>
                <p className="text-xs text-[var(--v3-text-lo)] mb-4">{t.mentoringDesc}</p>

                {/* Mentee side — mint an invite code */}
                <div className="mb-5">
                  <p className="text-[11px] font-semibold text-[var(--v3-text-mid)] mb-2 flex items-center gap-1.5">
                    <UserPlus size={12} /> {t.mentoringInviteHeading}
                  </p>
                  {mentorInviteCode ? (
                    <div className="flex gap-2">
                      <code className="flex-1 bg-white/5 border border-[var(--border-subtle)] dark:border-white/[0.10] rounded-lg px-3 py-2 text-sm text-[var(--v3-accent)] font-mono font-bold tracking-widest text-center select-all">
                        {mentorInviteCode}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopyInvite}
                        className="px-3 py-2 rounded-lg bg-[var(--v3-accent-glow)] border border-[#00C076]/30 text-[var(--v3-accent)] text-xs font-bold hover:bg-[#00C076]/20 transition flex items-center gap-1.5 whitespace-nowrap">
                        {mentorCodeCopied ? <CheckCircle size={13} /> : <Copy size={13} />}
                        {mentorCodeCopied ? t.mentoringCopied : t.mentoringCopy}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleCreateInvite}
                      disabled={mentorBusy}
                      className="w-full px-4 py-2.5 rounded-lg bg-[var(--v3-accent-glow)] border border-[#00C076]/30 text-[var(--v3-accent)] text-xs font-bold hover:bg-[#00C076]/20 transition disabled:opacity-50 flex items-center justify-center gap-2">
                      <UserPlus size={13} /> {t.mentoringInviteBtn}
                    </button>
                  )}
                  <p className="text-[10px] text-[var(--v3-text-lo)] mt-2">{t.mentoringInviteHint}</p>
                </div>

                {/* Mentor side — redeem a code */}
                <div className="mb-5">
                  <p className="text-[11px] font-semibold text-[var(--v3-text-mid)] mb-2 flex items-center gap-1.5">
                    <GraduationCap size={13} /> {t.mentoringRedeemHeading}
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={redeemCodeInput}
                      onChange={e => setRedeemCodeInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleRedeemInvite(); }}
                      placeholder={t.mentoringRedeemPlaceholder}
                      maxLength={8}
                      className="flex-1 bg-white/5 border border-[var(--border-subtle)] dark:border-white/[0.10] rounded-lg px-3 py-2 text-sm text-white placeholder-[var(--v3-text-lo)] focus:border-[var(--v3-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--v3-accent-glow)] transition font-mono uppercase tracking-widest"
                    />
                    <button
                      type="button"
                      onClick={handleRedeemInvite}
                      disabled={mentorBusy || !redeemCodeInput.trim()}
                      className="px-4 py-2 rounded-lg bg-[var(--v3-accent-glow)] border border-[#00C076]/30 text-[var(--v3-accent)] text-xs font-bold hover:bg-[#00C076]/20 transition disabled:opacity-50 whitespace-nowrap">
                      {t.mentoringConnect}
                    </button>
                  </div>
                </div>

                {/* My mentors — mentee can revoke */}
                {myMentors.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[11px] font-semibold text-[var(--v3-text-mid)] mb-2">{t.mentoringMyMentors}</p>
                    <div className="space-y-1.5">
                      {myMentors.map(m => (
                        <div key={m.id} className="flex items-center justify-between bg-white/5 border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-lg px-3 py-2">
                          <span className="text-xs font-mono text-[var(--v3-text-mid)]">
                            {t.mentoringMentorLabel} ····{m.mentor_id.slice(-4)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRevokeMentor(m.id)}
                            className="text-[11px] font-bold text-[var(--v3-loss)] hover:underline flex items-center gap-1">
                            <Trash2 size={11} /> {t.mentoringRevoke}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* My mentees — read-only (mentee controls the relationship) */}
                {myMentees.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-[var(--v3-text-mid)] mb-2">{t.mentoringMyMentees}</p>
                    <div className="space-y-1.5">
                      {myMentees.map(m => (
                        <div key={m.id} className="flex items-center justify-between bg-white/5 border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-lg px-3 py-2">
                          <span className="text-xs font-mono text-[var(--v3-text-mid)]">
                            {t.mentoringMenteeLabel} ····{m.mentee_id.slice(-4)}
                          </span>
                          <span className="text-[10px] text-[var(--v3-accent)] font-semibold">{t.mentoringActive}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ── PORTFOLIO CAPITAL ── */}
              <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign size={16} className="text-[var(--v3-text-mid)]" />
                  <h3 className="text-sm font-bold text-white">{t.portfolioCapitalTitle}</h3>
                </div>
                <p className="text-xs text-[var(--v3-text-lo)] mb-3">{t.updateCapitalDesc}</p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={capitalInput}
                    onChange={e => setCapitalInput(e.target.value)}
                    placeholder={`${capital.toLocaleString()}`}
                    className="flex-1 bg-white/5 border border-[var(--border-subtle)] dark:border-white/[0.10] rounded-lg px-3 py-2 text-sm text-white placeholder-[var(--v3-text-lo)] focus:border-[var(--v3-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--v3-accent-glow)] transition font-mono"
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
                    className="px-4 py-2 rounded-lg bg-[var(--v3-accent-glow)] border border-[#00C076]/30 text-[var(--v3-accent)] text-xs font-bold hover:bg-[#00C076]/20 transition whitespace-nowrap">
                    {t.updateCapital}
                  </button>
                </div>
                <p className="text-[10px] text-[var(--v3-text-lo)] mt-2">
                  {t.currentCapital}: <span className="text-[var(--v3-accent)] font-mono font-bold">${capital.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                </p>
              </div>

              {/* ── RISK PER TRADE ── */}
              <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Percent size={16} className="text-[var(--v3-text-mid)]" />
                  <h3 className="text-sm font-bold text-white">{t.riskPerTradeTitle}</h3>
                </div>
                <p className="text-xs text-[var(--v3-text-lo)] mb-3">{t.riskPerTradeDesc}</p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.25"
                    min="0.1"
                    max="10"
                    value={riskInput}
                    onChange={e => setRiskInput(e.target.value)}
                    placeholder={`${riskPct}`}
                    className="flex-1 bg-white/5 border border-[var(--border-subtle)] dark:border-white/[0.10] rounded-lg px-3 py-2 text-sm text-white placeholder-[var(--v3-text-lo)] focus:border-[var(--v3-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--v3-accent-glow)] transition font-mono"
                  />
                  <button
                    onClick={() => {
                      const val = parseFloat(riskInput);
                      if (val >= 0.1 && val <= 10) {
                        setRiskPct(val);
                        setRiskInput("");
                        try { localStorage.setItem("swingEdgeRiskPct", String(val)); } catch {}
                      }
                    }}
                    className="px-4 py-2 rounded-lg bg-[var(--v3-accent-glow)] border border-[#00C076]/30 text-[var(--v3-accent)] text-xs font-bold hover:bg-[#00C076]/20 transition whitespace-nowrap">
                    {t.updateRisk}
                  </button>
                </div>
                <p className="text-[10px] text-[var(--v3-text-lo)] mt-2">
                  {t.currentRisk}: <span className="text-[var(--v3-accent)] font-mono font-bold">{riskPct}%</span>
                </p>
                <p className="text-[10px] text-[var(--v3-text-lo)] mt-1 flex items-center gap-1">
                  {t.portfolioCapDerived}: <span className="text-violet-400 font-mono font-bold">{maxRiskPct}%</span>
                  <TermTooltip term="riskLimits" lang={lang} />
                </p>
              </div>

              {/* ── DEMO TRADES ── */}
              <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <FlaskConical size={16} className="text-[var(--v3-info)]" />
                  <h3 className="text-sm font-bold text-white">{t.demoTrades}</h3>
                </div>
                <p className="text-xs text-[var(--v3-text-lo)] mb-3">
                  {t.loadDemoLong}
                </p>
                <button
                  onClick={handleLoadDemoTrades}
                  className="w-full py-2.5 rounded-lg bg-[var(--v3-info-glow)] border border-[#06b6d4]/30 text-[var(--v3-info)] text-xs font-bold hover:bg-[#06b6d4]/20 transition flex items-center justify-center gap-2">
                  <Download size={12} /> 📊 {t.loadDemoBtn}
                </button>
                <p className="text-[10px] text-[var(--v3-text-lo)] mt-2">
                  {t.loadDemoNote}
                </p>
              </div>

              {/* ── TILTMETER ── */}
              <div className={`bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border rounded-xl p-5 ${tiltBg}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Thermometer size={16} style={{ color: tiltColor }} />
                    <h3 className="text-sm font-bold text-white">{t.tiltmeter}</h3>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold border"
                    style={{ color: tiltColor, borderColor: tiltColor + "40", background: tiltColor + "15" }}>
                    {tiltLevel === "safe" ? t.tiltCalm : tiltLevel === "warning" ? t.tiltWatch : t.tiltTilting}
                  </span>
                </div>

                {/* Visual gauge */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-[var(--v3-text-lo)]">{t.followedPlanNo}</span>
                    <span className="text-2xl font-bold font-mono" style={{ color: tiltColor }}>{tiltCount}</span>
                  </div>
                  <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${tiltPct}%`, background: `linear-gradient(to right, #00C076, ${tiltColor})` }} />
                  </div>
                  <div className="flex justify-between mt-1 text-[10px] text-[var(--v3-text-lo)] font-mono">
                    <span>0</span>
                    <span style={{ color: "var(--v3-warn)" }}>⚠ 3</span>
                    <span style={{ color: "var(--v3-loss)" }}>🔴 6+</span>
                  </div>
                </div>

                {/* Segments row */}
                <div className="flex gap-1.5 mb-4">
                  {[1,2,3,4,5,6].map(i => {
                    const filled = i <= tiltCount;
                    const segColor = i <= 2 ? "#00C076" : i <= 3 ? "#F59E0B" : "#F43F5E";
                    return (
                      <div key={i} className="flex-1 h-4 rounded"
                        style={{ background: filled ? segColor : segColor + "20", border: `1px solid ${segColor}40` }} />
                    );
                  })}
                </div>

                {/* Warning banner */}
                {tiltCount > 3 && (
                  <div className="flex items-center gap-2 bg-[#F43F5E]/10 border border-[#F43F5E]/30 rounded-lg p-3">
                    <AlertTriangle size={14} className="text-[var(--v3-loss)] flex-shrink-0" />
                    <span className="text-xs text-[var(--v3-loss)]">
                      {t.tiltWarn3}
                    </span>
                  </div>
                )}
                {tiltCount === 3 && (
                  <div className="flex items-center gap-2 bg-[var(--v3-warn-glow)] border border-[#F59E0B]/30 rounded-lg p-3">
                    <AlertTriangle size={14} className="text-[var(--v3-warn)] flex-shrink-0" />
                    <span className="text-xs text-[var(--v3-warn)]">
                      {t.tiltAlert3}
                    </span>
                  </div>
                )}
                {tiltCount === 0 && (
                  <div className="flex items-center gap-2 bg-[var(--v3-accent-glow)] border border-[#00C076]/30 rounded-lg p-3">
                    <CheckCircle size={14} className="text-[var(--v3-accent)] flex-shrink-0" />
                    <span className="text-xs text-[var(--v3-accent)]">{t.tiltClean}</span>
                  </div>
                )}

                <p className="text-[10px] text-[var(--v3-text-lo)] mt-3">{t.tiltNote}</p>
              </div>

              {/* ── PERSONAL PLAYBOOK ── */}
              <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <BookMarked size={16} className="text-[var(--v3-purple)]" />
                    <h3 className="text-sm font-bold text-white">{t.personalPlaybook}</h3>
                  </div>
                  <button onClick={() => { setPlaybookForm({ name: "", description: "", imagePreview: null }); setEditingSetupId(null); setShowPlaybookForm(v => !v); }}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[var(--v3-purple-glow)] border border-[#A78BFA]/30 text-[var(--v3-purple)] hover:bg-[#A78BFA]/20 transition">
                    <Plus size={11} /> {t.addSetup}
                  </button>
                </div>

                {/* Add/Edit Form */}
                {showPlaybookForm && (
                  <div className="mb-5 bg-white/3 border border-[var(--border-subtle)] dark:border-white/[0.10] rounded-xl p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-[var(--v3-text-lo)] tracking-widest uppercase block mb-1">{t.setupName}</label>
                        <input value={playbookForm.name} onChange={e => setPlaybookForm(f => ({ ...f, name: e.target.value }))}
                          placeholder="Breakout, Pullback…" className="w-full bg-white/5 border border-[var(--border-subtle)] dark:border-white/[0.10] rounded-lg px-3 py-2 text-sm text-white placeholder-[var(--v3-text-lo)] focus:border-[var(--v3-purple)] focus:outline-none transition" />
                      </div>
                      <div>
                        <label className="text-[10px] text-[var(--v3-text-lo)] tracking-widest uppercase block mb-1">{t.imageOptional}</label>
                        <label className="flex items-center gap-2 cursor-pointer w-full bg-white/5 border border-[var(--border-subtle)] dark:border-white/[0.10] rounded-lg px-3 py-2 text-xs text-[var(--v3-text-mid)] hover:border-[#A78BFA]/40 transition">
                          <Eye size={12} />
                          <span>{playbookForm.imagePreview ? `${t.imageLoaded} ✓` : t.uploadImage}</span>
                          <input type="file" accept="image/*" onChange={handlePlaybookImageUpload} className="hidden" />
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-[var(--v3-text-lo)] tracking-widest uppercase block mb-1">{t.description}</label>
                      <textarea value={playbookForm.description} onChange={e => setPlaybookForm(f => ({ ...f, description: e.target.value }))}
                        placeholder={t.setupDescPlaceholder} rows={2}
                        className="w-full bg-white/5 border border-[var(--border-subtle)] dark:border-white/[0.10] rounded-lg px-3 py-2 text-sm text-white placeholder-[var(--v3-text-lo)] focus:border-[var(--v3-purple)] focus:outline-none transition resize-none" />
                    </div>
                    {playbookForm.imagePreview && (
                      <div className="relative rounded-lg overflow-hidden border border-[var(--border-subtle)] dark:border-white/[0.10] h-24">
                        <img src={playbookForm.imagePreview} alt="Setup" className="w-full h-full object-cover" />
                        <button onClick={() => setPlaybookForm(f => ({ ...f, imagePreview: null }))}
                          aria-label={lang === "he" ? "הסר תמונה" : "Remove image"}
                          className="absolute top-1 right-1 rtl:right-auto rtl:left-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-[var(--v3-text-mid)] hover:text-white">
                          <X size={10} />
                        </button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button onClick={handlePlaybookSubmit}
                        className="flex-1 py-2 rounded-lg bg-[var(--v3-accent)] text-[#070B0A] text-xs font-bold hover:opacity-90 transition">
                        {editingSetupId !== null ? t.updateSetup : t.saveSetup}
                      </button>
                      <button onClick={() => { setShowPlaybookForm(false); setEditingSetupId(null); }}
                        className="px-4 py-2 rounded-lg bg-white/5 border border-[var(--border-subtle)] dark:border-white/[0.10] text-[var(--v3-text-mid)] text-xs hover:border-white/20 transition">
                        {t.cancel}
                      </button>
                    </div>
                  </div>
                )}

                {/* Playbook list */}
                {playbookSetups.length === 0 ? (
                  <div className="text-center py-8 text-[var(--v3-text-lo)] text-xs">
                    <BookMarked size={28} className="mx-auto mb-2 opacity-20" />
                    <p>{t.noSetupsYet}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {playbookSetups.map(setup => {
                      const stats = calcSetupSuccess(setup.name);
                      const successColor = stats === null ? "#7A8783" : stats.rate >= 60 ? "#00C076" : stats.rate >= 40 ? "#F59E0B" : "#F43F5E";
                      return (
                        <div key={setup.id} className="bg-white/3 border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-xl overflow-hidden hover:border-[#A78BFA]/25 transition">
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
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-[var(--border-subtle)] dark:border-white/[0.10] text-[var(--v3-text-lo)] hover:text-[var(--v3-info)] hover:border-[#06b6d4]/25 transition">
                                  ✎
                                </button>
                                <button onClick={() => deleteSetup(setup.id)}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-[var(--border-subtle)] dark:border-white/[0.10] text-[var(--v3-text-lo)] hover:text-[var(--v3-loss)] hover:border-[#F43F5E]/25 transition">
                                  <Trash2 size={10} />
                                </button>
                              </div>
                            </div>
                            {setup.description && (
                              <p className="text-[11px] text-[var(--v3-text-lo)] mb-2 leading-relaxed">{setup.description}</p>
                            )}
                            {/* Auto success rate from journal */}
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all"
                                  style={{ width: stats ? `${stats.rate}%` : "0%", background: successColor }} />
                              </div>
                              <span className="text-[10px] font-mono font-bold whitespace-nowrap" style={{ color: successColor }}>
                                {stats ? `${stats.rate}% (${nTrades(stats.count, lang)})` : t.noJournalData}
                              </span>
                            </div>
                            <p className="text-[9px] text-[var(--v3-text-lo)] mt-1">{t.successRateFromJournal}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── DATA EXPORT ── */}
              <div className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Download size={16} className="text-[var(--v3-text-mid)]" />
                  <h3 className="text-sm font-bold text-white">{t.dataExport}</h3>
                </div>
                <p className="text-xs text-[var(--v3-text-lo)] mb-5">{t.exportDesc}</p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {/* CSV Export */}
                  <div className="bg-white/[0.03] border border-[var(--border-subtle)] dark:border-white/[0.08] rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-[var(--v3-accent-glow)] border border-[#00C076]/20 flex items-center justify-center flex-shrink-0">
                        <Download size={14} className="text-[var(--v3-accent)]" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{t.journalCsv}</div>
                        <div className="text-[10px] text-[var(--v3-text-lo)]">{nTrades(trades.length, lang)}</div>
                      </div>
                    </div>
                    <p className="text-[11px] text-[var(--v3-text-lo)] mb-3 leading-relaxed">
                      {t.csvIncludes}
                    </p>
                    <button
                      onClick={() => exportTradesCSV(trades)}
                      className="w-full py-2 rounded-lg bg-[var(--v3-accent-glow)] border border-[#00C076]/25 text-[var(--v3-accent)] text-xs font-bold hover:bg-[#00C076]/20 transition flex items-center justify-center gap-1.5">
                      <Download size={12} /> {t.downloadCsv}
                    </button>
                  </div>

                  {/* PDF Report */}
                  <div className="bg-white/[0.03] border border-[var(--border-subtle)] dark:border-white/[0.08] rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-[var(--v3-info-glow)] border border-[#06b6d4]/20 flex items-center justify-center flex-shrink-0">
                        <FileText size={14} className="text-[var(--v3-info)]" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{t.monthlyPdf}</div>
                        <div className="text-[10px] text-[var(--v3-text-lo)]">{new Date().toLocaleString("en-US",{month:"long",year:"numeric"})}</div>
                      </div>
                    </div>
                    <p className="text-[11px] text-[var(--v3-text-lo)] mb-3 leading-relaxed">
                      {t.pdfIncludes}
                    </p>
                    <button
                      onClick={() => exportMonthlyPDF(realTrades, capital, stats, monthStats, curEquity)}
                      className="w-full py-2 rounded-lg bg-[var(--v3-info-glow)] border border-[#06b6d4]/25 text-[var(--v3-info)] text-xs font-bold hover:bg-[#06b6d4]/20 transition flex items-center justify-center gap-1.5">
                      <FileText size={12} /> {t.createPdf}
                    </button>
                  </div>
                </div>

                <p className="text-[10px] text-[var(--v3-text-lo)] mt-3">
                  {t.pdfNote}
                </p>
              </div>

              {/* ── DANGER ZONE ── */}
              <div className="mt-8 p-4 border border-[#F43F5E]/30 bg-[#F43F5E]/5 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">⚠️</span>
                  <h3 className="font-bold text-[var(--v3-loss)] text-sm">
                    {lang === "he" ? "אזור מסוכן" : "Danger Zone"}
                  </h3>
                </div>
                <p className="text-sm text-[#F43F5E]/80 mb-3">
                  {lang === "he"
                    ? "מחיקת כל העסקאות לא ניתנת לביטול. נדרשת סיסמת חשבון לאימות."
                    : "Resetting all trades cannot be undone. Account password is required to confirm."}
                </p>
                <button
                  onClick={() => setShowResetAll(true)}
                  className="px-4 py-2 bg-[var(--v3-loss)] hover:opacity-90 text-white rounded-lg text-sm font-medium transition"
                >
                  {lang === "he" ? "אפס יומן" : "Reset Journal"}
                </button>
              </div>

            </div>
          );
        })()}

        {/* ══════════════ DNA MONTHLY REPORT (Tools → report sub-tab) ══════════════ */}
        {tab === "tools" && toolsTab === 'report' && (
          <MonthlyReportTab
            trades={realTrades}
            calcMetrics={calcTradeMetrics}
            t={t}
            lang={lang}
            isRTL={isRTL}
          />
        )}

        {/* ══════════════ NOTEBOOK (B3 — free-form trader notes) ══════════════ */}
        {tab === "notebook" && (
          <NotebookTab authUser={authUser} t={t} lang={lang} isRTL={isRTL} />
        )}

        {/* ══════════════ WEEKLY REVIEW (B3 — rolling 7-day engine summary) ══════════════ */}
        {tab === "weeklyReview" && (
          <WeeklyReviewTab
            trades={realTrades}
            capital={capital}
            calcMetrics={calcTradeMetrics}
            authUser={authUser}
            t={t}
            lang={lang}
            isRTL={isRTL}
          />
        )}

        {/* ══════════════ FEEDBACK ══════════════ */}
        {tab === "feedback" && (
          <FeedbackTab user={authUser} lang={lang} originTab={feedbackOriginRef.current} />
        )}

        {/* ══════════════ ADMIN (niveven183@gmail.com only) ══════════════ */}
        {tab === "admin" && (
          isAdmin ? (
            <Suspense fallback={<div className="flex items-center justify-center py-20 text-slate-400 text-sm">…</div>}>
              <AdminPanel />
            </Suspense>
          ) : (
            <div className="flex items-center justify-center py-20">
              <div className="max-w-md text-center bg-[var(--bg-elevated)] dark:bg-[#0d1424] border border-rose-500/30 rounded-2xl p-8 shadow-2xl">
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
          <div ref={logModalRef} role="dialog" aria-modal="true" aria-labelledby={logTitleId} tabIndex={-1} className="w-full max-w-2xl bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[var(--border-subtle)] dark:border-[var(--v3-line)] rounded-[var(--v3-radius-card)] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col focus:outline-none">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)] dark:border-[var(--v3-line)] bg-gradient-to-r from-[var(--v3-accent-glow)] to-[var(--v3-purple-glow)]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-[var(--v3-radius-chip)] bg-gradient-to-br from-[var(--v3-accent)] to-[var(--v3-purple)] flex items-center justify-center">
                  <Plus size={12} className="text-white" />
                </div>
                <span id={logTitleId} className="text-sm font-bold text-white">Log New Trade</span>
              </div>
              <button onClick={()=>setShowForm(false)} aria-label={lang === "he" ? "סגור" : "Close"} className="text-[var(--v3-text-lo)] hover:text-[var(--v3-text-mid)] transition">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Row 1 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="log-ticker" className="text-[10px] text-[var(--v3-text-lo)] tracking-widest uppercase block mb-1">Ticker *</label>
                  <input id="log-ticker" value={form.ticker} onChange={e=>setForm(f=>({...f,ticker:e.target.value.toUpperCase()}))}
                    placeholder={t.tickerPlaceholder} className="w-full bg-white/5 border border-[var(--border-subtle)] dark:border-[var(--v3-line)] rounded-[var(--v3-radius-chip)] px-3 py-2 text-sm text-white placeholder-[var(--v3-text-lo)] focus:border-[var(--v3-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--v3-accent-glow)] transition font-mono font-bold tracking-wider" />
                </div>
                <div>
                  <label className="text-[10px] text-[var(--v3-text-lo)] tracking-widest uppercase block mb-1">Direction</label>
                  <div className="flex gap-2">
                    {["LONG","SHORT"].map(s=>(
                      <button key={s} onClick={()=>setForm(f=>({...f,side:s}))}
                        className={`flex-1 py-2 rounded-[var(--v3-radius-chip)] text-xs font-bold transition border ${form.side===s?(s==="LONG"?"bg-[var(--v3-accent)]/20 text-[var(--v3-accent)] border-[var(--v3-accent)]/30":"bg-[var(--v3-loss)]/20 text-[var(--v3-loss)] border-[var(--v3-loss)]/30"):"bg-white/3 text-[var(--v3-text-lo)] border-[var(--v3-line)] hover:border-white/20"}`}>
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
                  <div className="bg-white/3 border border-[var(--border-subtle)] dark:border-[var(--v3-line)] rounded-[var(--v3-radius-chip)] p-3">
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
                          <span className={`text-[11px] font-mono ${q.changePct >= 0 ? "text-[var(--v3-accent)]" : "text-[var(--v3-loss)]"}`}>
                            {q.changePct >= 0 ? "+" : ""}{q.changePct.toFixed(2)}%
                          </span>
                        )}
                        {coachEarnings?.daysUntil != null && coachEarnings.daysUntil >= 0 && coachEarnings.daysUntil <= 5 && (
                          <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full border bg-[var(--v3-warn)]/10 border-[var(--v3-warn)]/30 text-[var(--v3-warn)]">
                            {lang === "he"
                              ? `📅 Earnings בעוד ${coachEarnings.daysUntil} ימים`
                              : `📅 Earnings in ${coachEarnings.daysUntil}d`}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => fetchFormQuote(form.ticker, { force: true })}
                        disabled={formQuoteLoading}
                        title="Refresh price"
                        aria-label={lang === "he" ? "רענן מחיר" : "Refresh price"}
                        className="text-[var(--v3-text-mid)] hover:text-[var(--v3-info)] transition p-1 rounded hover:bg-white/5 disabled:opacity-50"
                      >
                        <RefreshCw size={12} className={formQuoteLoading ? "animate-spin" : ""} />
                      </button>
                    </div>
                    <div className="grid grid-cols-5 gap-1 text-[9px] text-[var(--v3-text-lo)]">
                      <div className="text-center">
                        <div className="uppercase tracking-wider">Open</div>
                        <div className="font-mono text-[var(--v3-text-mid)]">{q?.regularMarketOpen != null ? q.regularMarketOpen.toFixed(2) : "—"}</div>
                      </div>
                      <div className="text-center">
                        <div className="uppercase tracking-wider">High</div>
                        <div className="font-mono text-[var(--v3-accent)]">{q?.regularMarketDayHigh != null ? q.regularMarketDayHigh.toFixed(2) : "—"}</div>
                      </div>
                      <div className="text-center">
                        <div className="uppercase tracking-wider">Low</div>
                        <div className="font-mono text-[var(--v3-loss)]">{q?.regularMarketDayLow != null ? q.regularMarketDayLow.toFixed(2) : "—"}</div>
                      </div>
                      <div className="text-center">
                        <div className="uppercase tracking-wider">Pre</div>
                        <div className="font-mono text-[var(--v3-warn)]">{q?.preMarketPrice != null ? q.preMarketPrice.toFixed(2) : "—"}</div>
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
                {[["Entry *","entry","text-white"],["Stop Loss *","stop","text-[var(--v3-loss)]"],["Target","target","text-[var(--v3-accent)]"]].map(([label,key,cls])=>(
                  <div key={key}>
                    <label htmlFor={`log-${key}`} className="text-[10px] text-[var(--v3-text-lo)] tracking-widest uppercase block mb-1">{label}</label>
                    <input id={`log-${key}`} value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}
                      placeholder="0.00" className={`w-full bg-white/5 border border-[var(--border-subtle)] dark:border-[var(--v3-line)] rounded-[var(--v3-radius-chip)] px-3 py-2 text-sm placeholder-[var(--v3-text-lo)] focus:border-[var(--v3-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--v3-accent-glow)] transition font-mono ${cls}`} />
                  </div>
                ))}
              </div>

              {/* Calculated metrics */}
              {entryN > 0 && stopN > 0 && (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Shield size={12} className="text-[var(--v3-info)]/70" />
                      <span className="text-[10px] font-semibold tracking-widest uppercase text-[var(--v3-text-lo)]">{t.riskMgmtSuggestion}</span>
                    </div>
                    <span className="block text-[9px] text-[var(--v3-text-lo)]">{t.riskMgmtSuggestionHint}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 bg-white/3 rounded-[var(--v3-radius-chip)] p-3 border border-[var(--border-subtle)] dark:border-[var(--v3-line)]">
                  <div className="text-center group">
                    <div className="text-[10px] text-[var(--v3-text-lo)] uppercase tracking-wider mb-0.5">Shares</div>
                    {tradeValidity.valid ? (
                      <div className="flex items-center justify-center gap-1">
                        <Pencil size={10} aria-hidden className="shrink-0 text-[var(--v3-text-lo)] group-hover:text-[var(--v3-text-mid)] transition-colors pointer-events-none" />
                        <input
                          type="text" inputMode="numeric" aria-label={t.sharesEditable}
                          value={sharesOverrideStr !== "" ? sharesOverrideStr : String(suggestedShares)}
                          onFocus={e => e.target.select()}
                          onChange={e => {
                            const v = e.target.value.replace(/[^0-9]/g, "").replace(/^0+/, "");
                            setForm(f => ({ ...f, shares: v }));
                          }}
                          style={{ width: `${Math.max((sharesOverrideStr !== "" ? sharesOverrideStr : String(suggestedShares)).length, 1) + 1}ch` }}
                          className={`min-w-0 text-center text-sm font-bold font-mono !bg-transparent rounded px-0.5 focus:outline-none ${posSizeTooSmall?"!text-[var(--v3-warn)]":"!text-[var(--v3-info)]"}`}
                        />
                      </div>
                    ) : (
                      <div className="text-sm font-bold font-mono text-[var(--v3-text-lo)]">—</div>
                    )}
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-[var(--v3-text-lo)] uppercase tracking-wider mb-0.5">Pos. Value</div>
                    <div className={`text-sm font-bold font-mono truncate ${tradeValidity.valid?"text-white":"text-[var(--v3-text-lo)]"}`}>{tradeValidity.valid?`$${effPosValue.toLocaleString()}`:"—"}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-[var(--v3-text-lo)] uppercase tracking-wider mb-0.5">Max Risk</div>
                    <div className={`text-sm font-bold font-mono truncate ${tradeValidity.valid?"text-[var(--v3-loss)]":"text-[var(--v3-text-lo)]"}`}>{tradeValidity.valid?`$${Math.round(effPotLoss).toLocaleString()}`:"—"}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-[var(--v3-text-lo)] uppercase tracking-wider mb-0.5 flex items-center justify-center gap-1">R/R Ratio<TermTooltip term="rr" lang={lang} /></div>
                    <div className={`text-sm font-bold font-mono ${tradeValidity.valid?(targetN>0?(rrRatio>=2?"text-[var(--v3-accent)]":rrRatio>=1?"text-[var(--v3-warn)]":"text-[var(--v3-loss)]"):"text-[var(--v3-text-lo)]"):"text-[var(--v3-text-lo)]"}`}>{tradeValidity.valid?(targetN>0?`${rrRatio.toFixed(2)}:1`:"–"):"—"}</div>
                  </div>
                  </div>
                  {hasSharesOverride && (
                    <button type="button" onClick={() => setForm(f => ({ ...f, shares: "" }))}
                      className="flex items-center gap-1 mx-auto text-[10px] text-[var(--v3-text-lo)] hover:text-[var(--v3-info)] transition-colors">
                      <RotateCcw size={10} /> {t.resetToSuggested}
                    </button>
                  )}
                </div>
              )}

              {/* Invalid-input banner — single red signal when the geometry is wrong for the chosen side */}
              {entryN > 0 && stopN > 0 && !tradeValidity.valid && (
                <div className="flex items-center gap-2 p-2.5 rounded-[var(--v3-radius-chip)] border text-xs bg-[var(--v3-loss)]/5 border-[var(--v3-loss)]/20 text-[var(--v3-loss)]">
                  <AlertTriangle size={13} />
                  <span>{(lang === "he" ? "קלט לא תקין — " : "Invalid input — ") + (tradeValidity.reason?.[lang] || tradeValidity.reason?.en)}</span>
                </div>
              )}

              {/* Position-too-small hint — explains why Shares/Value/Risk are 0 (R/R stays valid).
                  Suppressed when the over-risk warning below already covers this trade. */}
              {tradeValidity.valid && posSizeTooSmall && !isOverRisk && (
                <div className="flex items-center gap-2 p-2.5 rounded-[var(--v3-radius-chip)] border text-xs bg-[var(--v3-warn)]/5 border-[var(--v3-warn)]/20 text-[var(--v3-warn)]">
                  <AlertTriangle size={13} />
                  <span>{lang === "he"
                    ? `בסיכון ${riskPct}% הפוזיציה קטנה ממניה אחת — הכרטיסים מציגים מינימום של מניה אחת. הגדל הון או הדק את הסטופ. ה-R/R תקף.`
                    : `At ${riskPct}% risk the position is under one share — cards show the 1-share minimum. Raise capital or tighten the stop. R/R is valid.`}</span>
                </div>
              )}

              {/* Over-risk warning — the sized position risks more than the configured % (#9) */}
              {isOverRisk && (
                <div className="flex items-center gap-2 p-2.5 rounded-[var(--v3-radius-chip)] border text-xs bg-[var(--v3-loss)]/5 border-[var(--v3-loss)]/20 text-[var(--v3-loss)]">
                  <AlertTriangle size={13} />
                  <span>{lang === "he"
                    ? `הפוזיציה חורגת מסיכון ${riskPct}% — סיכון בפועל ${effRiskPct.toFixed(1)}%. ההון קטן מדי למכשיר הזה, או הקטן גודל.`
                    : `Position exceeds your ${riskPct}% risk — actual risk ${effRiskPct.toFixed(1)}%. Capital is too small for this instrument, or reduce size.`}</span>
                </div>
              )}

              {/* Setup + Market — surfaced above the coach so manual entry drives the canonical line live */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="log-setup" className="text-[10px] text-[var(--v3-text-lo)] tracking-widest uppercase mb-1 flex items-center gap-1">Setup Type<InfoTooltip label="Setup Type">{lang === 'he' ? CATEGORY_TOOLTIP.setup.he : CATEGORY_TOOLTIP.setup.en}</InfoTooltip></label>
                  <SmartSelect id="log-setup" ariaLabel="Setup Type" value={form.setup} onChange={v=>setForm(f=>({...f,setup:v}))} dir={isRTL?'rtl':'ltr'} {...getTradeSelectProps('setup', lang)} />
                </div>
                <div>
                  <label htmlFor="log-market-condition" className="text-[10px] text-[var(--v3-text-lo)] tracking-widest uppercase mb-1 flex items-center gap-1">Market Condition<InfoTooltip label="Market Condition">{lang === 'he' ? CATEGORY_TOOLTIP.market.he : CATEGORY_TOOLTIP.market.en}</InfoTooltip></label>
                  <SmartSelect id="log-market-condition" ariaLabel="Market Condition" value={form.marketCondition} onChange={v=>setForm(f=>({...f,marketCondition:v}))} dir={isRTL?'rtl':'ltr'} {...getTradeSelectProps('market', lang)} />
                </div>
              </div>

              {/* Live Decision Coach — analyses the trade as you type (only on valid input) */}
              {/* Hero halo — wrapper glow tinted by the live verdict; reads aiCoach.verdict only, never mutates it */}
              {tradeValidity.valid && (() => {
                const heroTone =
                  aiCoach?.verdict === "GO"      ? { border: "border-[var(--v3-accent)]/40", glow: "var(--shadow-lg), 0 0 40px var(--v3-accent-glow)" } :
                  aiCoach?.verdict === "CAUTION" ? { border: "border-[var(--v3-warn)]/40",   glow: "var(--shadow-lg), 0 0 40px var(--v3-warn-glow)" }   :
                  aiCoach?.verdict === "SKIP"    ? { border: "border-[var(--v3-loss)]/40",   glow: "var(--shadow-lg), 0 0 40px var(--v3-loss-glow)" }   :
                                                   { border: "border-[var(--v3-accent)]/20", glow: "var(--shadow-lg)" };
                return (
                  <div className={`rounded-[var(--v3-radius-card)] border ${heroTone.border} p-1.5 bg-[var(--v3-accent-glow)]/30 transition-shadow`} style={{ boxShadow: heroTone.glow }}>
                    {tradeValidity.valid && <DecisionCoachPanel coaching={aiCoach} lang={lang} />}
                  </div>
                );
              })()}

              {/* TradingView screenshot → OCR auto-fill (top-level, mirrors the Analyzer) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] text-[var(--v3-text-lo)] tracking-widest uppercase">{t.imageFromTradingView}</label>
                  <button type="button" onClick={() => setShowChartGuide(true)}
                    aria-label={isRTL ? "איך לצלם עסקה מהצ'ארט (מדריך) — How to screenshot a trade chart (guide)" : "How to screenshot a trade chart (guide) — איך לצלם עסקה מהצ'ארט"}
                    className="text-[10px] text-[var(--v3-info)]/70 hover:text-[var(--v3-info)] border border-[var(--v3-info)]/30 hover:border-[var(--v3-info)]/60 rounded-full w-4 h-4 flex items-center justify-center transition shrink-0">
                    ?
                  </button>
                </div>
                <label className="flex items-center gap-2 cursor-pointer w-full bg-white/5 border border-[var(--border-subtle)] dark:border-[var(--v3-line)] rounded-[var(--v3-radius-chip)] px-3 py-2 text-xs text-[var(--v3-text-mid)] hover:border-[var(--v3-accent)]/40 hover:text-[var(--v3-accent)] transition">
                  <Eye size={12} />
                  <span>{form.tradeImage ? form.tradeImage.name : t.uploadChart}</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
                <p className="text-[10px] text-[var(--v3-text-lo)] mt-1 leading-snug">{t.ocrTooltip}</p>
                <p className="text-[9px] text-[var(--v3-text-lo)] mt-1 leading-snug">{lang === "he"
                  ? "נשמר מקומית להפעלה זו בלבד — עדיין לא נשמר בענן."
                  : "Saved locally for this session — not stored in the cloud yet."}</p>
              </div>

              {/* Image preview */}
              {form.tradeImagePreview && (
                <div className="relative rounded-[var(--v3-radius-chip)] overflow-hidden border border-[var(--border-subtle)] dark:border-[var(--v3-line)]">
                  <img src={form.tradeImagePreview} alt="Trade chart" className="w-full h-32 object-cover" />
                  <button onClick={() => { setForm(f=>({...f,tradeImage:null,tradeImagePreview:null})); setOcrStatus(null); }}
                    aria-label={lang === "he" ? "הסר תמונה" : "Remove image"}
                    className="absolute top-1 right-1 rtl:right-auto rtl:left-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-slate-300 hover:text-white">
                    <X size={10} />
                  </button>
                </div>
              )}

              {/* OCR confidence badge — graded, mirrors the Analyzer */}
              {ocrStatus && (() => {
                const { status, confidence } = ocrStatus;
                const ok = status === "ok";
                const high = ok && confidence >= 70;
                const mid  = ok && confidence >= 40 && confidence < 70;
                const tone =
                  status === "processing" ? "bg-[var(--v3-info)]/5 border-[var(--v3-info)]/20 text-[var(--v3-info)]" :
                  high ? "bg-[var(--v3-accent)]/5 border-[var(--v3-accent)]/20 text-[var(--v3-accent)]" :
                  mid  ? "bg-[var(--v3-warn)]/5 border-[var(--v3-warn)]/20 text-[var(--v3-warn)]" :
                         "bg-[var(--v3-loss)]/5 border-[var(--v3-loss)]/20 text-[var(--v3-loss)]";
                let icon, text;
                if (status === "processing") { icon = <RefreshCw size={12} className="animate-spin" />; text = lang === "he" ? "קורא גרף…" : "Reading chart…"; }
                else if (status === "config_error") { icon = <AlertTriangle size={12} />; text = lang === "he" ? "מפתח API חסר — פנה לאדמין" : "API key missing — contact admin"; }
                else if (status === "error") { icon = <AlertTriangle size={12} />; text = lang === "he" ? "שגיאת OCR — נסה שוב" : "OCR failed — try again"; }
                else if (high) { icon = <CheckCircle size={12} />; text = `OCR ✓ ${confidence}%`; }
                else if (mid)  { icon = <CheckCircle size={12} />; text = `OCR ~ ${confidence}%`; }
                else { icon = <AlertTriangle size={12} />; text = lang === "he" ? "לא זוהה — ודא ידנית" : "Not detected — verify manually"; }
                return (
                  <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-[var(--v3-radius-chip)] border text-[11px] ${tone}`}>
                    {icon}<span>{text}</span>
                  </div>
                );
              })()}

              {/* ── Trade context (journaling metadata) — collapsed by default ── */}
              <button type="button" onClick={()=>setShowTradeContext(v=>!v)}
                aria-expanded={showTradeContext}
                className="w-full flex items-center justify-between px-3 py-2 rounded-[var(--v3-radius-chip)] bg-white/3 border border-[var(--border-subtle)] dark:border-[var(--v3-line)] text-[var(--v3-text-mid)] hover:text-white hover:border-white/20 transition">
                <span className="text-[10px] tracking-widest uppercase font-semibold">{lang === "he" ? "הקשר העסקה" : "Trade Context"}</span>
                <ChevronDown size={14} className={`transition-transform ${showTradeContext ? "rotate-180" : ""}`} />
              </button>

              {showTradeContext && (
                <div className="space-y-4 animate-fade-in">
              {/* Notes + Emotion (Setup + Market are surfaced above, next to the coach) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="log-notes" className="text-[10px] text-[var(--v3-text-lo)] tracking-widest uppercase block mb-1">Notes</label>
                  <input id="log-notes" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
                    placeholder="Trade thesis..." className="w-full bg-white/5 border border-[var(--border-subtle)] dark:border-[var(--v3-line)] rounded-[var(--v3-radius-chip)] px-3 py-2 text-sm text-white placeholder-[var(--v3-text-lo)] focus:border-[var(--v3-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--v3-accent-glow)] transition" />
                </div>
                <div>
                  <label htmlFor="log-emotion" className="text-[10px] text-[var(--v3-text-lo)] tracking-widest uppercase mb-1 flex items-center gap-1">Emotion at Entry<InfoTooltip label="Emotion at Entry">{lang === 'he' ? CATEGORY_TOOLTIP.emotion.he : CATEGORY_TOOLTIP.emotion.en}</InfoTooltip></label>
                  <SmartSelect id="log-emotion" ariaLabel="Emotion at Entry" value={form.emotionAtEntry} onChange={v=>setForm(f=>({...f,emotionAtEntry:v}))} dir={isRTL?'rtl':'ltr'} {...getTradeSelectProps('emotion', lang)} />
                </div>
              </div>

              {/* Entry Quality (stars) */}
              <div>
                <label className="text-[10px] text-[var(--v3-text-lo)] tracking-widest uppercase block mb-1">Entry Quality</label>
                <div className="flex items-center gap-1 mt-1">
                  {[1,2,3,4,5].map(star => (
                    <button key={star} type="button" onClick={() => setForm(f=>({...f,entryQuality:star}))}
                      className={`text-xl transition-transform hover:scale-110 ${form.entryQuality >= star ? "text-[var(--v3-warn)]" : "text-slate-700"}`}>
                      ★
                    </button>
                  ))}
                  <span className="text-[10px] text-[var(--v3-text-lo)] ms-1">{form.entryQuality}/5</span>
                </div>
              </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button onClick={handleSubmit}
                  disabled={!form.ticker || !entryN || !stopN}
                  className="flex-1 py-2.5 rounded-[var(--v3-radius-chip)] bg-gradient-to-r from-[var(--v3-accent)] to-[var(--v3-purple)] text-white text-sm font-bold hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:opacity-40">
                  Log Trade →
                </button>
                <button onClick={() => {
                    setForm({ ticker:"", side:"LONG", entry:"", stop:"", target:"", shares:"", setup:"Breakout", notes:"", marketCondition:"Trending Up", emotionAtEntry:"Neutral", entryQuality:3, tradeImage:null, tradeImagePreview:null });
                    setOcrStatus(null);
                    setFormQuote(null);
                    setFormQuoteLoading(false);
                  }}
                  className="px-4 py-2.5 rounded-[var(--v3-radius-chip)] bg-white/5 border border-[var(--border-subtle)] dark:border-[var(--v3-line)] text-[var(--v3-text-mid)] text-sm hover:text-white hover:border-white/20 transition">
                  {lang === "he" ? "איפוס" : "Reset"}
                </button>
                <button onClick={()=>setShowForm(false)} className="px-4 py-2.5 rounded-[var(--v3-radius-chip)] bg-white/5 border border-[var(--border-subtle)] dark:border-[var(--v3-line)] text-[var(--v3-text-mid)] text-sm hover:text-white hover:border-white/20 transition">
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
          <div ref={closeModalRef} role="dialog" aria-modal="true" aria-labelledby={closeTitleId} tabIndex={-1} className="w-full max-w-md bg-[var(--bg-elevated)] dark:bg-[#0d1424] border border-white/10 rounded-2xl shadow-2xl overflow-hidden focus:outline-none">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)] dark:border-white/[0.06] bg-gradient-to-r from-rose-500/5 to-violet-500/5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-rose-400 to-violet-500 flex items-center justify-center">
                  <X size={12} className="text-white" />
                </div>
                <span id={closeTitleId} className="text-sm font-bold text-white">Close Trade — <span className="text-[#ef4444] font-mono">{closingTrade.ticker}</span></span>
              </div>
              <button onClick={()=>{setShowCloseForm(false);setClosingTrade(null);}} aria-label={lang === "he" ? "סגור" : "Close"} className="text-slate-600 hover:text-slate-300 transition">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Trade summary */}
              <div className="bg-white/3 rounded-xl p-3 border border-[var(--border-subtle)] dark:border-white/[0.06] grid grid-cols-3 gap-2 text-center text-[10px]">
                <div><div className="text-slate-600 uppercase tracking-wider">Entry</div><div className="font-mono font-bold text-slate-300">${closingTrade.entry}</div></div>
                <div><div className="text-slate-600 uppercase tracking-wider">Stop</div><div className="font-mono font-bold text-[#ef4444]">${closingTrade.stop}</div></div>
                <div><div className="text-slate-600 uppercase tracking-wider">Target</div><div className="font-mono font-bold text-[#10b981]">${closingTrade.target || "–"}</div></div>
              </div>

              {/* Exit Price + Exit Reason */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="close-exit" className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">{t.exitPrice}</label>
                  <input id="close-exit" value={closeForm.exit} onChange={e=>setCloseForm(f=>({...f,exit:e.target.value}))}
                    placeholder="0.00" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-rose-500/50 focus:outline-none focus:ring-1 focus:ring-rose-500/20 transition font-mono" />
                </div>
                <div>
                  <label htmlFor="close-exit-reason" className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">{t.exitReason}</label>
                  <select id="close-exit-reason" value={closeForm.exitReason} onChange={e=>setCloseForm(f=>({...f,exitReason:e.target.value}))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-rose-500/50 focus:outline-none focus:ring-1 focus:ring-rose-500/20 transition">
                    {["Hit Target","Hit Stop","Manual Exit","Trailing Stop","Other"].map(s=><option key={s} value={s}>{labelFor("exitReason", s, lang)}</option>)}
                  </select>
                </div>
              </div>

              {/* MFE + MAE */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="close-mfe" className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">{t.mfe}</label>
                  <input id="close-mfe" value={closeForm.maxFavorable} onChange={e=>setCloseForm(f=>({...f,maxFavorable:e.target.value}))}
                    placeholder={t.mfePlaceholder} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-[#10b981] placeholder-slate-600 focus:border-emerald-500/50 focus:outline-none transition font-mono" />
                </div>
                <div>
                  <label htmlFor="close-mae" className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">{t.mae}</label>
                  <input id="close-mae" value={closeForm.maxAdverse} onChange={e=>setCloseForm(f=>({...f,maxAdverse:e.target.value}))}
                    placeholder={t.maePlaceholder} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-[#ef4444] placeholder-slate-600 focus:border-rose-500/50 focus:outline-none transition font-mono" />
                </div>
              </div>

              {/* Followed Plan */}
              <div>
                <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">{t.followedPlan}</label>
                <div className="flex gap-2">
                  {[
                    { val: true, label: t.planYes, on: "bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30" },
                    { val: "Partially", label: t.planPartially, on: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
                    { val: false, label: t.planNo, on: "bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/30" },
                  ].map(({ val, label, on }) => (
                    <button key={String(val)} onClick={()=>setCloseForm(f=>({...f,followedPlan:val}))}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition border ${closeForm.followedPlan===val ? on : "bg-white/3 text-slate-500 border-white/10 hover:border-white/20"}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lesson Learned */}
              <div>
                <label htmlFor="close-lesson" className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">Lesson Learned</label>
                <textarea id="close-lesson" value={closeForm.lessonLearned} onChange={e=>setCloseForm(f=>({...f,lessonLearned:e.target.value}))}
                  rows={3}
                  placeholder="What did this trade teach you?" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-violet-500/50 focus:outline-none transition resize-y" />
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
      <EditTradeModal
        trade={editingTrade}
        lang={lang}
        onClose={() => setEditingTrade(null)}
        onSave={handleEditSubmit}
      />

      {/* ── RESET ALL (DANGER ZONE) MODAL ── */}
      <ResetAllModal
        open={showResetAll}
        tradesCount={trades.length}
        lang={lang}
        onClose={() => setShowResetAll(false)}
      />

      {/* ── MONTHLY REPORT AUTO MODAL ── */}
      {showReportModal && autoReport && (
        <MonthlyReportModal
          report={autoReport}
          t={t}
          lang={lang}
          isRTL={isRTL}
          onClose={() => setShowReportModal(false)}
          onOpenFull={() => { setTab("tools"); setToolsTab("report"); setShowReportModal(false); }}
        />
      )}

      {/* ── HELP MODAL ── */}
      {showHelpModal && <HelpModal onClose={() => setShowHelpModal(false)} onStartTour={() => { setShowHelpModal(false); startTour(); }} t={t} demoCount={DEMO_TRADES.length} />}

      {/* ── PRIVACY MODAL ── */}
      {showPrivacyModal && <PrivacyModal onClose={() => setShowPrivacyModal(false)} t={t} />}
      {showChartGuide && <ChartGuideModal onClose={() => setShowChartGuide(false)} lang={lang} />}

      {/* ── BILLING MODAL ── */}
      {showBillingModal && <BillingModal onClose={() => setShowBillingModal(false)} t={t} />}

      {/* ── CHANGE PASSWORD MODAL ── */}
      <ChangePasswordModal
        open={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        lang={lang}
      />

      {/* ── FLOATING NEW TRADE BUTTON ── */}
      <button
        onClick={() => { setForm({ ticker:"", side:"LONG", entry:"", stop:"", target:"", shares:"", setup:"Breakout", notes:"", marketCondition:"Trending Up", emotionAtEntry:"Neutral", entryQuality:3, tradeImage:null, tradeImagePreview:null }); setOcrStatus(null); setShowForm(true); }}
        className={`fixed bottom-6 right-6 rtl:right-auto rtl:left-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 text-white shadow-2xl shadow-cyan-500/25 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform motion-reduce:transition-none ${fabVisible ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0 pointer-events-none"}`}
        style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
        aria-label={t.newTrade}
        title={t.newTrade}
      >
        <Plus size={24} />
      </button>

      {/* ── LEGAL DISCLAIMER ROW ── */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-1.5 border-t border-[var(--border-subtle)] dark:border-white/[0.06] bg-[var(--bg-primary)] dark:bg-[#0a0f1e] text-[10px] text-slate-600 dark:text-slate-400 font-mono">
        <a href="/terms" target="_blank" rel="noopener noreferrer" className="hover:underline">{t.footerDisclaimer}</a>
        <span className="flex items-center gap-2">
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="hover:underline">{t.footerTerms}</a>
          <span aria-hidden="true">·</span>
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:underline">{t.footerPrivacy}</a>
        </span>
      </div>

      {/* ── FOOTER STATUS BAR ── */}
      <footer className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-2 border-t border-[var(--border-subtle)] dark:border-white/[0.06] bg-[var(--bg-primary)] dark:bg-[#0a0f1e] text-[10px] text-slate-700 font-mono" style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}>
        <div className="flex items-center gap-4">
          {(() => {
            const fBadge = getMarketStateBadge(marketState);
            const fOpen = marketState === MARKET_STATE.OPEN;
            return (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full transition-colors" style={{ backgroundColor: fBadge.color, opacity: fOpen ? (pulse ? 1 : 0.55) : 0.85 }} />
                <span style={{ color: fBadge.color }}>{fBadge.emoji} {fBadge.label}</span>
              </span>
            );
          })()}
          <span>{t.accountEquity}: ${curEquity.toLocaleString("en-US", {minimumFractionDigits: 2})}</span>
          <span>{t.riskPerTradeFooter}</span>
        </div>
        <div className="flex items-center gap-4">
          <span>{t.trades}: {trades.length}</span>
          <span>{t.open}: {openTrades.length}</span>
          <span className="hidden md:inline">SwingEdge Pro v{typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev"}</span>
        </div>
      </footer>
    </div>
  );
}
