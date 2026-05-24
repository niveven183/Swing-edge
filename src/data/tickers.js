export const POPULAR_TICKERS = [
  // Mega Cap
  { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', sector: 'Technology' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Technology' },
  { symbol: 'META', name: 'Meta Platforms Inc.', sector: 'Technology' },
  { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Automotive' },
  { symbol: 'BRK.B', name: 'Berkshire Hathaway', sector: 'Financials' },
  { symbol: 'LLY', name: 'Eli Lilly', sector: 'Healthcare' },
  { symbol: 'V', name: 'Visa Inc.', sector: 'Financials' },
  { symbol: 'JPM', name: 'JPMorgan Chase', sector: 'Financials' },
  { symbol: 'UNH', name: 'UnitedHealth Group', sector: 'Healthcare' },
  { symbol: 'XOM', name: 'Exxon Mobil', sector: 'Energy' },
  { symbol: 'MA', name: 'Mastercard', sector: 'Financials' },
  { symbol: 'AVGO', name: 'Broadcom Inc.', sector: 'Technology' },
  // Popular Swing Trades
  { symbol: 'AMD', name: 'Advanced Micro Devices', sector: 'Technology' },
  { symbol: 'PLTR', name: 'Palantir Technologies', sector: 'Technology' },
  { symbol: 'SMCI', name: 'Super Micro Computer', sector: 'Technology' },
  { symbol: 'ARM', name: 'Arm Holdings', sector: 'Technology' },
  { symbol: 'MRVL', name: 'Marvell Technology', sector: 'Technology' },
  { symbol: 'CRWD', name: 'CrowdStrike Holdings', sector: 'Technology' },
  { symbol: 'PANW', name: 'Palo Alto Networks', sector: 'Technology' },
  { symbol: 'SNOW', name: 'Snowflake Inc.', sector: 'Technology' },
  { symbol: 'NET', name: 'Cloudflare Inc.', sector: 'Technology' },
  { symbol: 'DDOG', name: 'Datadog Inc.', sector: 'Technology' },
  { symbol: 'MDB', name: 'MongoDB Inc.', sector: 'Technology' },
  { symbol: 'COIN', name: 'Coinbase Global', sector: 'Financials' },
  { symbol: 'HOOD', name: 'Robinhood Markets', sector: 'Financials' },
  { symbol: 'SOFI', name: 'SoFi Technologies', sector: 'Financials' },
  { symbol: 'UPST', name: 'Upstart Holdings', sector: 'Financials' },
  { symbol: 'AFRM', name: 'Affirm Holdings', sector: 'Financials' },
  { symbol: 'SHOP', name: 'Shopify Inc.', sector: 'Technology' },
  { symbol: 'SQ', name: 'Block Inc.', sector: 'Financials' },
  { symbol: 'PYPL', name: 'PayPal Holdings', sector: 'Financials' },
  { symbol: 'NFLX', name: 'Netflix Inc.', sector: 'Communications' },
  { symbol: 'DIS', name: 'Walt Disney Co.', sector: 'Communications' },
  { symbol: 'SPOT', name: 'Spotify Technology', sector: 'Communications' },
  { symbol: 'SNAP', name: 'Snap Inc.', sector: 'Communications' },
  { symbol: 'PINS', name: 'Pinterest Inc.', sector: 'Communications' },
  { symbol: 'UBER', name: 'Uber Technologies', sector: 'Industrials' },
  { symbol: 'LYFT', name: 'Lyft Inc.', sector: 'Industrials' },
  { symbol: 'ABNB', name: 'Airbnb Inc.', sector: 'Consumer' },
  { symbol: 'BKNG', name: 'Booking Holdings', sector: 'Consumer' },
  { symbol: 'RIVN', name: 'Rivian Automotive', sector: 'Automotive' },
  { symbol: 'LCID', name: 'Lucid Group', sector: 'Automotive' },
  { symbol: 'F', name: 'Ford Motor Co.', sector: 'Automotive' },
  { symbol: 'GM', name: 'General Motors', sector: 'Automotive' },
  { symbol: 'NIO', name: 'NIO Inc.', sector: 'Automotive' },
  { symbol: 'XPEV', name: 'XPeng Inc.', sector: 'Automotive' },
  // ETFs
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', sector: 'ETF' },
  { symbol: 'QQQ', name: 'Invesco QQQ ETF', sector: 'ETF' },
  { symbol: 'IWM', name: 'iShares Russell 2000', sector: 'ETF' },
  { symbol: 'DIA', name: 'SPDR Dow Jones ETF', sector: 'ETF' },
  { symbol: 'VIX', name: 'CBOE Volatility Index', sector: 'Index' },
  { symbol: 'GLD', name: 'SPDR Gold Shares', sector: 'ETF' },
  { symbol: 'SLV', name: 'iShares Silver ETF', sector: 'ETF' },
  { symbol: 'TLT', name: 'iShares 20+ Year Treasury', sector: 'ETF' },
  { symbol: 'HYG', name: 'iShares HY Corp Bond', sector: 'ETF' },
  { symbol: 'XLK', name: 'Technology Select SPDR', sector: 'ETF' },
  { symbol: 'XLF', name: 'Financial Select SPDR', sector: 'ETF' },
  { symbol: 'XLE', name: 'Energy Select SPDR', sector: 'ETF' },
  { symbol: 'XLV', name: 'Health Care Select SPDR', sector: 'ETF' },
  { symbol: 'ARKK', name: 'ARK Innovation ETF', sector: 'ETF' },
  { symbol: 'SOXS', name: 'Direxion Semi Bear 3x', sector: 'ETF' },
  { symbol: 'SOXL', name: 'Direxion Semi Bull 3x', sector: 'ETF' },
  { symbol: 'TQQQ', name: 'ProShares UltraPro QQQ', sector: 'ETF' },
  { symbol: 'SQQQ', name: 'ProShares UltraPro Short QQQ', sector: 'ETF' },
  // Crypto
  { symbol: 'BTC-USD', name: 'Bitcoin', sector: 'Crypto' },
  { symbol: 'ETH-USD', name: 'Ethereum', sector: 'Crypto' },
  { symbol: 'SOL-USD', name: 'Solana', sector: 'Crypto' },
  { symbol: 'BNB-USD', name: 'Binance Coin', sector: 'Crypto' },
  { symbol: 'XRP-USD', name: 'Ripple', sector: 'Crypto' },
  { symbol: 'DOGE-USD', name: 'Dogecoin', sector: 'Crypto' },
  { symbol: 'BTC', name: 'Bitcoin', sector: 'Crypto' },
  { symbol: 'ETH', name: 'Ethereum', sector: 'Crypto' },
  { symbol: 'MSTR', name: 'MicroStrategy', sector: 'Technology' },
  // Healthcare
  { symbol: 'MRNA', name: 'Moderna Inc.', sector: 'Healthcare' },
  { symbol: 'BNTX', name: 'BioNTech SE', sector: 'Healthcare' },
  { symbol: 'PFE', name: 'Pfizer Inc.', sector: 'Healthcare' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare' },
  { symbol: 'ABBV', name: 'AbbVie Inc.', sector: 'Healthcare' },
  { symbol: 'GILD', name: 'Gilead Sciences', sector: 'Healthcare' },
  { symbol: 'REGN', name: 'Regeneron Pharma', sector: 'Healthcare' },
  { symbol: 'BIIB', name: 'Biogen Inc.', sector: 'Healthcare' },
  // Finance
  { symbol: 'GS', name: 'Goldman Sachs', sector: 'Financials' },
  { symbol: 'MS', name: 'Morgan Stanley', sector: 'Financials' },
  { symbol: 'BAC', name: 'Bank of America', sector: 'Financials' },
  { symbol: 'WFC', name: 'Wells Fargo', sector: 'Financials' },
  { symbol: 'C', name: 'Citigroup Inc.', sector: 'Financials' },
  { symbol: 'BX', name: 'Blackstone Inc.', sector: 'Financials' },
  { symbol: 'KKR', name: 'KKR & Co.', sector: 'Financials' },
];

export function searchTickers(query) {
  if (!query || query.length < 1) return [];
  const q = query.toUpperCase().trim();
  return POPULAR_TICKERS
    .filter(t =>
      t.symbol.startsWith(q) ||
      t.name.toUpperCase().includes(q)
    )
    .slice(0, 8);
}

export function getTickerMeta(symbol) {
  return POPULAR_TICKERS.find(t => t.symbol === symbol) ?? null;
}
