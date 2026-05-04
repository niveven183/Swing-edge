# SwingEdge Context

## Chart Vision Engine v2
- src/vision/ChartVisionEngine.js — orchestrator עם preprocessing
- src/vision/readers/ImagePreprocessor.js — dark→light, contrast, threshold, scale×2/×3
- src/vision/readers/TradingViewToolParser.js — מנתח טקסט של Long/Short Position tool
- src/vision/readers/RegionExtractor.js — 5 אזורים: titleArea, toolArea, priceAxis, tickerTag, fullImage
- src/vision/readers/TickerReader.js — blocklist מורחב
- src/vision/readers/PriceReader.js — cluster detection
- src/vision/brain/TraderLogic.js — ולידציות סוחר
- אסטרטגיה: קודם TradingView tool parser → fallback ל-price axis → מחמיר (confidence<50=ריק)
- שלב הבא: Learning Engine + Visual Preview Modal

## Master Stats Hub (useTradingStats)
- src/hooks/useTradingStats.js — Single Source of Truth לכל הסטטיסטיקות
- שימוש כפול ב-SwingEdge_App.jsx:
  - `stats = useTradingStats(trades, capital, calcTradeMetrics)` — גלובלי (Dashboard, Analytics)
  - `journalStats = useTradingStats(filteredTrades, ...)` — מסונן לפי פילטרי ה-Journal
- useMemo — חישוב פעם אחת, עדכון אוטומטי בכל שינוי עסקה
- מטריקות: totalPnL, winRate, profitFactor, avgR, expectancy, maxDrawdown,
  currentStreak, equityCurve, bySetup, byEmotion, byMarket, byDayOfWeek,
  topEdges, antiEdges, lastWeekStats, lastMonthStats, planFollowedWR
- Aliases לתאימות: total, maxDD ($), avgHold (ימים), bestStreak
- closedMetrics — מערך עסקאות סגורות עם pnl/rMultiple כבר מצורפים
- Top/Anti Edges מוצגים בטאבים: Dashboard (ליד EdgeCard) + Analytics (אחרי Insight Cards)
