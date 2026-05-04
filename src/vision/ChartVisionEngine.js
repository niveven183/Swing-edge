import { extractRegions } from './readers/RegionExtractor';
import { readTicker } from './readers/TickerReader';
import { findPriceCluster } from './readers/PriceReader';
import { validateSetup } from './brain/TraderLogic';
import { preprocessForOCR, preprocessRegion } from './readers/ImagePreprocessor';
import { parseTradingViewTool } from './readers/TradingViewToolParser';
import Tesseract from 'tesseract.js';

export async function analyzeChart(imageDataURL, options = {}) {
  const { side = 'LONG', livePrice = null } = options;

  try {
    // Step 1: crop regions
    const regions = await extractRegions(imageDataURL);

    // Step 2: preprocess — invert dark mode, boost contrast
    const [processedTool, processedTitle, processedTicker] = await Promise.all([
      preprocessForOCR(regions.toolArea),
      preprocessRegion(regions.titleArea),
      preprocessRegion(regions.tickerTag),
    ]);

    // Step 3: OCR all three regions in parallel
    const [toolOCR, titleOCR, tickerOCR] = await Promise.all([
      Tesseract.recognize(processedTool, 'eng'),
      Tesseract.recognize(processedTitle, 'eng', {
        tessedit_char_whitelist:
          'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz:·•|,0123456789DWMHm ',
      }),
      Tesseract.recognize(processedTicker, 'eng', {
        tessedit_char_whitelist:
          'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789. ',
      }),
    ]);

    const toolText = toolOCR.data.text;
    const titleText = titleOCR.data.text;
    const tickerText = tickerOCR.data.text;
    const combinedText = [titleText, tickerText, toolText].join('\n');

    // Step 4: try TradingView Long/Short Position tool parser first
    const tvResult = parseTradingViewTool(combinedText, side);

    // Step 5: TickerReader as fallback for ticker
    const tickerFromReader = await readTicker(processedTitle, livePrice);

    // Step 6: pick best ticker
    const finalTicker = tvResult.ticker || tickerFromReader.ticker || '';

    // Step 7: pick prices — TV parser wins, fallback to price axis
    let finalEntry = tvResult.entry;
    let finalStop = tvResult.stop;
    let finalTarget = tvResult.target;

    if (!finalEntry || !finalStop || !finalTarget) {
      const processedAxis = await preprocessRegion(regions.priceAxis);
      const axisOCR = await Tesseract.recognize(processedAxis, 'eng', {
        tessedit_char_whitelist: '0123456789.,',
      });
      const axisPrices = extractAllPrices(axisOCR.data.text);
      const ref = livePrice || (tvResult.entry ? parseFloat(tvResult.entry) : null);
      const cluster = findPriceCluster(axisPrices, ref, side);

      finalEntry = finalEntry || cluster.entry;
      finalStop = finalStop || cluster.stop;
      finalTarget = finalTarget || cluster.target;
    }

    // Step 8: validate
    const validation = validateSetup(finalTicker, finalEntry, finalStop, finalTarget, side, livePrice);

    // Step 9: strict — clear prices if confidence too low
    if (validation.confidence < 50) {
      finalEntry = '';
      finalStop = '';
      finalTarget = '';
    }

    return {
      success: true,
      ticker: finalTicker,
      entry: finalEntry,
      stop: finalStop,
      target: finalTarget,
      rr: tvResult.rr || '',
      qty: tvResult.qty || '',
      confidence: validation.confidence,
      issues: validation.issues,
      debug: {
        toolText: toolText.substring(0, 200),
        titleText: titleText.substring(0, 100),
        tickerText: tickerText.substring(0, 100),
      },
    };
  } catch (err) {
    console.error('Vision engine v2 failed:', err);
    return {
      success: false,
      error: err.message,
      ticker: '',
      entry: '',
      stop: '',
      target: '',
      confidence: 0,
      issues: ['ENGINE_ERROR'],
    };
  }
}

function extractAllPrices(text) {
  const regex = /\b(\d{1,6}\.\d{2})\b/g;
  const matches = text.match(regex) || [];
  return [...new Set(matches.map(m => parseFloat(m)))].filter(n => n > 1 && n < 999999);
}
