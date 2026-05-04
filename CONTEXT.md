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
