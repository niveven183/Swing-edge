import Tesseract from 'tesseract.js';

export async function readPrices(rightAxisDataURL, livePrice = null) {
  try {
    const result = await Tesseract.recognize(rightAxisDataURL, 'eng', {
      tessedit_pageseg_mode: '6',
      tessedit_char_whitelist: '0123456789.,',
    });

    const text = result.data.text;
    const priceRegex = /\b(\d{1,5}(?:[,.]?\d{1,4})?)\b/g;
    const matches = text.match(priceRegex) || [];

    const prices = matches
      .map((m) => parseFloat(m.replace(/,/g, '')))
      .filter((n) => n > 0.01 && n < 999999)
      .filter((v, i, a) => a.indexOf(v) === i);

    return {
      allPrices: prices,
      confidence: result.data.confidence,
    };
  } catch (err) {
    console.error('Price read failed:', err);
    return { allPrices: [], confidence: 0 };
  }
}

export function findPriceCluster(prices, livePrice = null, side = 'LONG') {
  if (prices.length < 3) {
    return { entry: '', stop: '', target: '', confidence: 0 };
  }

  const sorted = [...prices].sort((a, b) => b - a);
  const candidates = [];

  for (let i = 0; i < sorted.length - 2; i++) {
    for (let j = i + 1; j < sorted.length - 1; j++) {
      for (let k = j + 1; k < sorted.length; k++) {
        const high = sorted[i];
        const mid = sorted[j];
        const low = sorted[k];

        const spreadPct = ((high - low) / low) * 100;
        if (spreadPct < 0.3 || spreadPct > 20) continue;

        const midPos = (mid - low) / (high - low);
        if (midPos < 0.15 || midPos > 0.85) continue;

        let score = 100;
        score -= Math.abs(midPos - 0.5) * 50;

        if (livePrice && livePrice > 0) {
          const distFromLive = (Math.abs(mid - livePrice) / livePrice) * 100;
          if (distFromLive < 5) score += 30;
          else if (distFromLive > 30) score -= 50;
        }

        candidates.push({ high, mid, low, score, spreadPct });
      }
    }
  }

  if (candidates.length === 0) {
    return { entry: '', stop: '', target: '', confidence: 0 };
  }

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];

  if (side === 'LONG') {
    return {
      entry: best.mid.toString(),
      stop: best.low.toString(),
      target: best.high.toString(),
      confidence: Math.min(best.score, 100),
    };
  } else {
    return {
      entry: best.mid.toString(),
      stop: best.high.toString(),
      target: best.low.toString(),
      confidence: Math.min(best.score, 100),
    };
  }
}
