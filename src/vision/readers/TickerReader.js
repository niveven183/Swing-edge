import Tesseract from 'tesseract.js';

const BLOCKLIST = new Set([
  'ARCA', 'NYSE', 'NASDAQ', 'BINANCE', 'COINBASE', 'AMEX', 'CRYPTO', 'OANDA', 'FOREX', 'BATS',
  'LONG', 'SHORT', 'BUY', 'SELL', 'ENTRY', 'EXIT', 'STOP', 'TARGET', 'LIMIT', 'MARKET',
  'OPEN', 'HIGH', 'LOW', 'CLOSE', 'VOL', 'VOLUME', 'LAST', 'BID', 'ASK', 'LIVE', 'PRE', 'AFTER',
  'EMA', 'SMA', 'MA', 'RSI', 'MACD', 'VWAP', 'ATR', 'BB', 'ADX',
  'THE', 'AND', 'FOR', 'USD', 'EUR', 'GBP', 'JPY', 'BTC', 'ETH', 'USDT',
  'CHART', 'TIME', 'DATE', 'VIEW', 'ZOOM', 'ALERT', 'TOOL',
]);

const WHITELIST_PATTERNS = [
  /(?:NASDAQ|NYSE|AMEX|BINANCE|COINBASE):([A-Z]{1,6})/i,
  /\b([A-Z]{2,5})\s*[·•|]\s*\d+[DWMHm]/,
  /\b([A-Z]{2,5})\s*,\s*\d+[DWMHm]/,
];

export async function readTicker(titleAreaDataURL, livePrice = null) {
  try {
    const result = await Tesseract.recognize(titleAreaDataURL, 'eng', {
      tessedit_pageseg_mode: '7',
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ:·•|,0123456789DWMHm ',
    });

    const text = result.data.text;

    for (const pattern of WHITELIST_PATTERNS) {
      const match = text.match(pattern);
      if (match) {
        const ticker = match[1].toUpperCase();
        if (!BLOCKLIST.has(ticker)) {
          return { ticker, confidence: result.data.confidence, source: 'pattern' };
        }
      }
    }

    const standalone = text.match(/\b([A-Z]{2,5})\b/g) || [];
    const candidates = standalone
      .map((t) => t.toUpperCase())
      .filter((t) => !BLOCKLIST.has(t));

    if (candidates.length === 1) {
      return { ticker: candidates[0], confidence: result.data.confidence * 0.7, source: 'standalone' };
    }

    return { ticker: '', confidence: 0, source: 'none' };
  } catch (err) {
    console.error('Ticker read failed:', err);
    return { ticker: '', confidence: 0, source: 'error' };
  }
}
