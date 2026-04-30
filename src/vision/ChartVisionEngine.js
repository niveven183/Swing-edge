import { extractRegions } from './readers/RegionExtractor';
import { readTicker } from './readers/TickerReader';
import { readPrices, findPriceCluster } from './readers/PriceReader';
import { validateSetup } from './brain/TraderLogic';

const MIN_CONFIDENCE = 70;

export async function analyzeChart(imageDataURL, options = {}) {
  const { side = 'LONG', livePrice = null } = options;

  try {
    const regions = await extractRegions(imageDataURL);

    const [tickerResult, priceResult] = await Promise.all([
      readTicker(regions.titleArea, livePrice),
      readPrices(regions.rightAxis, livePrice),
    ]);

    const cluster = findPriceCluster(priceResult.allPrices, livePrice, side);

    const validation = validateSetup(
      tickerResult.ticker,
      cluster.entry,
      cluster.stop,
      cluster.target,
      side,
      livePrice
    );

    const finalTicker = tickerResult.confidence >= MIN_CONFIDENCE ? tickerResult.ticker : '';
    const finalEntry = cluster.confidence >= MIN_CONFIDENCE ? cluster.entry : '';
    const finalStop = cluster.confidence >= MIN_CONFIDENCE ? cluster.stop : '';
    const finalTarget = cluster.confidence >= MIN_CONFIDENCE ? cluster.target : '';

    return {
      success: true,
      ticker: finalTicker,
      entry: finalEntry,
      stop: finalStop,
      target: finalTarget,
      confidence: {
        ticker: tickerResult.confidence,
        prices: cluster.confidence,
        setup: validation.confidence,
      },
      issues: validation.issues,
      raw: {
        tickerCandidate: tickerResult.ticker,
        allPrices: priceResult.allPrices,
      },
    };
  } catch (err) {
    console.error('Vision engine failed:', err);
    return {
      success: false,
      error: err.message,
      ticker: '',
      entry: '',
      stop: '',
      target: '',
      confidence: { ticker: 0, prices: 0, setup: 0 },
      issues: ['ENGINE_ERROR'],
    };
  }
}
