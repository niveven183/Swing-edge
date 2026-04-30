# SwingEdge Context

## Chart Vision Engine v1 (החלף את chartImageOCR.js)
- src/vision/ChartVisionEngine.js — orchestrator ראשי
- src/vision/readers/ — RegionExtractor, TickerReader, PriceReader
- src/vision/brain/TraderLogic.js — ולידציות של סוחר
- מחמיר: confidence < 70 → שדה ריק
- שלב הבא: LineDetector + Learning Engine + Visual Preview
