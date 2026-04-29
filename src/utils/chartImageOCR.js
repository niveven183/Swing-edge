import Tesseract from "tesseract.js";

const TICKER_BLOCKLIST = new Set([
  "THE", "AND", "FOR", "USD", "BUY", "SELL", "MAX", "MIN",
  "OPEN", "HIGH", "LOW", "CLOSE", "VOL", "VOLUME", "DAY",
  "BAR", "RSI", "EMA", "SMA", "MA", "MACD", "ATR",
]);

export async function extractTradeFromImage(imageDataURL, side = "LONG") {
  try {
    const result = await Tesseract.recognize(imageDataURL, "eng");
    const rawText = result.data.text || "";
    const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);

    const ticker = extractTicker(rawText, lines);
    const prices = extractPrices(rawText);
    const classified = classifyPrices(prices, side);

    return {
      success: true,
      ticker: ticker || "",
      entry: classified.entry,
      stop: classified.stop,
      target: classified.target,
      confidence: result.data.confidence,
      raw: rawText,
    };
  } catch (error) {
    console.error("OCR failed:", error);
    return {
      success: false,
      error: error.message,
      ticker: "",
      entry: "",
      stop: "",
      target: "",
    };
  }
}

function extractTicker(text, lines) {
  const exchangeMatch = text.match(
    /(?:NASDAQ|NYSE|BINANCE|COINBASE|AMEX|CRYPTO|BATS|ARCA|OTC)[:\s]+([A-Z]{1,6}(?:USDT|USD|BTC)?)/i
  );
  if (exchangeMatch) return exchangeMatch[1].toUpperCase();

  for (const line of lines.slice(0, 5)) {
    const match = line.match(/\b([A-Z]{2,5})\b/);
    if (match && !TICKER_BLOCKLIST.has(match[1])) {
      return match[1];
    }
  }
  return "";
}

function extractPrices(text) {
  const priceRegex = /\b(\d{1,3}(?:,\d{3})*(?:\.\d{1,4})?|\d+\.\d{2,4})\b/g;
  const matches = text.match(priceRegex) || [];
  return matches
    .map((m) => parseFloat(m.replace(/,/g, "")))
    .filter((n) => Number.isFinite(n) && n > 0.0001 && n < 999999)
    .filter((v, i, a) => a.indexOf(v) === i);
}

function classifyPrices(prices, side) {
  if (prices.length < 3) return { entry: "", stop: "", target: "" };
  const sorted = [...prices].sort((a, b) => b - a);
  const cluster = findThreePriceCluster(sorted);
  if (!cluster) return { entry: "", stop: "", target: "" };

  const [high, mid, low] = cluster;
  if (side === "SHORT") {
    return { entry: String(mid), stop: String(high), target: String(low) };
  }
  return { entry: String(mid), stop: String(low), target: String(high) };
}

function findThreePriceCluster(sortedPrices) {
  if (sortedPrices.length < 3) return null;

  let best = null;
  for (let i = 0; i < sortedPrices.length - 2; i++) {
    const high = sortedPrices[i];
    for (let j = i + 1; j < sortedPrices.length - 1; j++) {
      const mid = sortedPrices[j];
      if (mid >= high) continue;
      for (let k = j + 1; k < sortedPrices.length; k++) {
        const low = sortedPrices[k];
        if (low >= mid) continue;
        const spreadPct = ((high - low) / low) * 100;
        if (spreadPct < 0.5 || spreadPct > 15) continue;

        const upside = high - mid;
        const downside = mid - low;
        if (upside <= 0 || downside <= 0) continue;
        const rr = upside / downside;
        const rrScore = Math.abs(Math.log(rr));
        const tightness = spreadPct;
        const score = rrScore * 2 + tightness * 0.05;

        if (!best || score < best.score) {
          best = { triple: [high, mid, low], score };
        }
      }
    }
  }
  return best ? best.triple : null;
}
