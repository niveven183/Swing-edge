const BLOCKLIST = new Set([
  'ARCA', 'NYSE', 'NASDAQ', 'BINANCE', 'AMEX', 'CRYPTO', 'OANDA', 'BATS',
  'LONG', 'SHORT', 'BUY', 'SELL', 'ENTRY', 'EXIT', 'STOP', 'TARGET', 'LIMIT',
  'OPEN', 'HIGH', 'LOW', 'CLOSE', 'VOL', 'VOLUME', 'LAST', 'BID', 'ASK',
  'EMA', 'SMA', 'RSI', 'MACD', 'VWAP', 'ATR', 'BB', 'ADX',
  'USD', 'EUR', 'GBP', 'JPY', 'BTC', 'ETH', 'USDT',
  'IMG', 'PNG', 'JPG', 'QTY', 'AMOUNT', 'RISK',
]);

export function parseTradingViewTool(rawText, side = 'LONG') {
  const result = { entry: '', stop: '', target: '', ticker: '', rr: '', qty: '' };

  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const fullText = lines.join(' ');

  // Target: 35.30 (4.879%) ...
  const targetMatch = fullText.match(/Target[:\s]+(\d+\.?\d*)\s*\(/i);
  const targetDelta = targetMatch ? parseFloat(targetMatch[1]) : null;

  // Stop: 10.79 (1.491%) ...
  const stopMatch = fullText.match(/Stop[:\s]+(\d+\.?\d*)\s*\(/i);
  const stopDelta = stopMatch ? parseFloat(stopMatch[1]) : null;

  // Qty: 11
  const qtyMatch = fullText.match(/Qty[:\s]+(\d+)/i);
  if (qtyMatch) result.qty = qtyMatch[1];

  // Risk/reward ratio: 3.27
  const rrMatch = fullText.match(/(?:Risk[\/\\]reward|R\/R)[:\s]+(\d+\.?\d*)/i);
  if (rrMatch) result.rr = rrMatch[1];

  // Ticker patterns (priority order)
  const tickerPatterns = [
    /(?:NASDAQ|NYSE|AMEX|BINANCE):([A-Z]{1,6})/i,
    /\b([A-Z]{2,5})\s+\d{2,4}\.\d{2}\b/,
    /\b([A-Z]{2,5})\s*[·•]\s*\d+[DWMHm]/,
  ];

  for (const pattern of tickerPatterns) {
    const match = fullText.match(pattern);
    if (match && !BLOCKLIST.has(match[1].toUpperCase())) {
      result.ticker = match[1].toUpperCase();
      break;
    }
  }

  // Current price — look for known ticker followed by a price
  const priceNearTicker = fullText.match(
    /(?:SPY|NVDA|AAPL|MSFT|QQQ|TSLA|AMD|META|GOOGL|AMZN|BTC)\s*(\d{1,6}\.?\d{0,2})/i
  );
  let currentPrice = priceNearTicker ? parseFloat(priceNearTicker[1]) : null;

  // If we found a ticker from patterns above, try its price too
  if (!currentPrice && result.ticker) {
    const re = new RegExp(result.ticker + '\\s*(\\d{1,6}\\.?\\d{0,2})', 'i');
    const m = fullText.match(re);
    if (m) currentPrice = parseFloat(m[1]);
  }

  // Calculate entry/stop/target from deltas + current price.
  // currentPrice is always entry — never stop.
  if (currentPrice && targetDelta && stopDelta) {
    if (side === 'LONG') {
      result.entry  = currentPrice.toFixed(2)
      result.target = (currentPrice + targetDelta).toFixed(2)
      result.stop   = (currentPrice - stopDelta).toFixed(2)
    } else {
      result.entry  = currentPrice.toFixed(2)
      result.target = (currentPrice - targetDelta).toFixed(2)
      result.stop   = (currentPrice + stopDelta).toFixed(2)
    }
    return result;
  }

  // Fallback: find 3 prices from text
  const allPrices = extractAllPricesFromText(fullText);
  if (allPrices.length >= 3) {
    const cluster = findBestCluster(allPrices, currentPrice, side);
    if (cluster) {
      result.entry = cluster.entry;
      result.stop = cluster.stop;
      result.target = cluster.target;
    }
  }

  return result;
}

function extractAllPricesFromText(text) {
  const regex = /\b(\d{1,6}\.\d{2})\b/g;
  const matches = text.match(regex) || [];
  return [...new Set(matches.map(m => parseFloat(m)))].filter(n => n > 1 && n < 999999);
}

function findBestCluster(prices, referencePrice, side) {
  const sorted = [...prices].sort((a, b) => b - a);
  let bestCluster = null;
  let bestScore = -Infinity;

  for (let i = 0; i < sorted.length - 2; i++) {
    for (let j = i + 1; j < sorted.length - 1; j++) {
      for (let k = j + 1; k < sorted.length; k++) {
        const high = sorted[i], mid = sorted[j], low = sorted[k];
        const spread = ((high - low) / low) * 100;
        if (spread < 0.3 || spread > 20) continue;

        const midPos = (mid - low) / (high - low);
        if (midPos < 0.15 || midPos > 0.85) continue;

        let score = 100 - Math.abs(midPos - 0.4) * 80;

        if (referencePrice) {
          const distMid  = Math.abs(mid  - referencePrice) / referencePrice * 100;
          const distLow  = Math.abs(low  - referencePrice) / referencePrice * 100;
          // Reward clusters where entry (mid) ≈ livePrice
          if (distMid < 3)  score += 80;
          else if (distMid < 10) score += 30;
          else if (distMid > 30) score -= 60;
          // Penalise clusters where stop (low) ≈ livePrice — that would be wrong
          if (distLow < distMid) score -= 50;
        }

        if (score > bestScore) {
          bestScore = score;
          bestCluster = { high, mid, low };
        }
      }
    }
  }

  if (!bestCluster) return null;

  if (side === 'LONG') {
    return {
      entry: bestCluster.mid.toFixed(2),
      stop: bestCluster.low.toFixed(2),
      target: bestCluster.high.toFixed(2),
    };
  } else {
    return {
      entry: bestCluster.mid.toFixed(2),
      stop: bestCluster.high.toFixed(2),
      target: bestCluster.low.toFixed(2),
    };
  }
}
