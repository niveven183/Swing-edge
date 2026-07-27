// ─────────────────────────────────────────────────────────────────────────────
// Trade data sanitizer
// Maps legacy Hive/SIM setup codes to friendly names, normalizes invalid
// emotions, strips the SIM- ticker prefix, and normalizes followedPlan.
//
// Pure — no JSX, no React. Lives here rather than inside SwingEdge_App.jsx so
// it is directly testable (scripts/dataChain-test.mjs).
// ─────────────────────────────────────────────────────────────────────────────
import { EMOTION_VALUES } from "../data/tradeEnums.js";

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

export function cleanTrades(trades) {
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
      // A positive signal promotes to true; otherwise pass the flag through
      // untouched. Never coerce to false — this map also strips the SIM-/Hive-
      // markers the heuristic reads, so a fabricated false here is written back
      // to the DB on the next save and the trade is demoted permanently.
      isDemo: (t.isDemo === true || isSimTicker || isHiveSetup) ? true : t.isDemo,
    };
  });
}

export function purgeInvalidTrades(trades) {
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
