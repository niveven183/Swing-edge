// ─── PRICE PROXY (Vercel serverless function) ──────────────────────────────
// Yahoo Finance blocks Vercel's datacenter IPs (429 + null bodies), so live
// prices died in production. This proxy sources prices from two providers and
// routes per asset class, returning the SAME Yahoo-chart-shaped result the
// client (src/priceService.js) already parses — so the UI shape never changes:
//
//   • Stocks/ETFs : Finnhub  /api/v1/quote   (needs FINNHUB_API_KEY)
//   • Crypto      : CoinGecko /simple/price  (keyless, free)
//
// Modes:
//   • Chart : /api/quote?symbols=AAPL,MSFT,BTC-USD,BNB
//             → { "AAPL": <result|null>, "BTC-USD": <result|null>, ... }
//   • Search: /api/quote?search=apple
//             → { quotes: [ { symbol, shortname, quoteType, exchange } ] }
//
// Each symbol resolves independently (Promise.allSettled) → one bad symbol
// never fails the batch, and an upstream outage yields per-symbol null, never
// a global 500.

const FINNHUB_BASE = "https://finnhub.io/api/v1";
const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

// ── Crypto registry ─────────────────────────────────────────────────────────
// base ticker → { id: coingecko id, name: display }. Crypto reaches us in two
// forms: with a "-USD" suffix (BTC-USD, the client's toYahooSymbol output) and
// bare (BNB, XRP — not in that map). cryptoMeta() strips the suffix so both hit.
const CRYPTO = {
  BTC: { id: "bitcoin", name: "Bitcoin" },
  ETH: { id: "ethereum", name: "Ethereum" },
  SOL: { id: "solana", name: "Solana" },
  ADA: { id: "cardano", name: "Cardano" },
  XRP: { id: "ripple", name: "XRP" },
  DOGE: { id: "dogecoin", name: "Dogecoin" },
  AVAX: { id: "avalanche-2", name: "Avalanche" },
  DOT: { id: "polkadot", name: "Polkadot" },
  MATIC: { id: "matic-network", name: "Polygon" },
  LINK: { id: "chainlink", name: "Chainlink" },
  BNB: { id: "binancecoin", name: "BNB" },
  LTC: { id: "litecoin", name: "Litecoin" },
  TRX: { id: "tron", name: "TRON" },
  SHIB: { id: "shiba-inu", name: "Shiba Inu" },
  UNI: { id: "uniswap", name: "Uniswap" },
  ATOM: { id: "cosmos", name: "Cosmos" },
  XLM: { id: "stellar", name: "Stellar" },
  ETC: { id: "ethereum-classic", name: "Ethereum Classic" },
  BCH: { id: "bitcoin-cash", name: "Bitcoin Cash" },
  NEAR: { id: "near", name: "NEAR Protocol" },
  APT: { id: "aptos", name: "Aptos" },
  ARB: { id: "arbitrum", name: "Arbitrum" },
  OP: { id: "optimism", name: "Optimism" },
  FIL: { id: "filecoin", name: "Filecoin" },
};

// Strip an optional -USD / USD tail and look the base up in CRYPTO.
const cryptoMeta = (symbol) => {
  const base = String(symbol || "")
    .toUpperCase()
    .replace(/-?USD$/, "");
  return CRYPTO[base] || null;
};

// ── CoinGecko cache ─────────────────────────────────────────────────────────
// Module-scope, survives warm invocations. 60s TTL absorbs CoinGecko's
// free-tier rate limit (429s) so bursts don't hammer upstream; on failure we
// fall back to whatever is cached, else the symbol resolves to null.
const _cgCache = new Map(); // coingecko id → { data, ts }
const CG_TTL = 60_000;

// Fetch any ids not fresh in cache (one batched call) and refresh the cache.
async function warmCrypto(ids) {
  const now = Date.now();
  const need = ids.filter((id) => {
    const c = _cgCache.get(id);
    return !(c && now - c.ts < CG_TTL);
  });
  if (need.length === 0) return;

  try {
    const url =
      `${COINGECKO_BASE}/simple/price?ids=${encodeURIComponent(need.join(","))}` +
      `&vs_currencies=usd&include_24hr_change=true` +
      `&include_market_cap=true&include_24hr_vol=true`;
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    if (!r.ok) return; // 429 / 5xx → keep stale cache, symbols may resolve null
    const data = await r.json();
    for (const id of need) {
      const d = data?.[id];
      if (d && typeof d.usd === "number") _cgCache.set(id, { data: d, ts: now });
    }
  } catch {
    // network error → keep stale cache
  }
}

// Build a Yahoo-chart-shaped result for one crypto symbol from cached CG data.
function cryptoResult(id, name) {
  const d = _cgCache.get(id)?.data;
  if (!d || typeof d.usd !== "number") return null;
  const price = d.usd;
  const pct = typeof d.usd_24h_change === "number" ? d.usd_24h_change : 0;
  const prevClose = pct ? price / (1 + pct / 100) : price;
  const vol = typeof d.usd_24h_vol === "number" ? d.usd_24h_vol : 0;
  const mcap = typeof d.usd_market_cap === "number" ? d.usd_market_cap : 0;
  return {
    meta: {
      regularMarketPrice: price,
      chartPreviousClose: prevClose,
      previousClose: prevClose,
      regularMarketVolume: vol,
      marketCap: mcap,
      shortName: name,
      currency: "USD",
    },
    indicators: { quote: [{ close: [price], volume: [vol] }] },
  };
}

// ── Finnhub ─────────────────────────────────────────────────────────────────
// Build a Yahoo-chart-shaped result for one stock/ETF from Finnhub /quote.
// Finnhub returns c=0 for unknown symbols → treat as null (no usable price).
async function finnhubResult(symbol, key) {
  if (!key) return null;
  const url = `${FINNHUB_BASE}/quote?symbol=${encodeURIComponent(symbol)}&token=${key}`;
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  if (!r.ok) return null;
  const d = await r.json();
  if (!d || typeof d.c !== "number" || d.c === 0) return null;
  const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  return {
    meta: {
      regularMarketPrice: d.c,
      chartPreviousClose: num(d.pc),
      previousClose: num(d.pc),
      regularMarketOpen: num(d.o),
      regularMarketDayHigh: num(d.h),
      regularMarketDayLow: num(d.l),
    },
    indicators: { quote: [{ close: [d.c] }] },
  };
}

// Map Finnhub security type → the client's quoteType vocabulary.
function mapFinnhubType(type) {
  const t = String(type || "").toLowerCase();
  if (/crypto/.test(t)) return "CRYPTOCURRENCY";
  if (/etf|etp|fund/.test(t)) return "ETF";
  if (/index/.test(t)) return "INDEX";
  return "EQUITY";
}

export default async function handler(req, res) {
  // CORS — permissive so the SPA can consume it from any origin.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const q = req.query || {};
  const KEY = process.env.FINNHUB_API_KEY || "";

  // ── Search mode (fallback path; TradingView proxy is the primary source) ──
  const search = String(q.search || "").trim().slice(0, 64);
  if (search) {
    try {
      const r = await fetch(
        `${FINNHUB_BASE}/search?q=${encodeURIComponent(search)}&token=${KEY}`,
        { headers: { Accept: "application/json" } }
      );
      if (!r.ok) throw new Error(`finnhub ${r.status}`);
      const data = await r.json();
      const quotes = (Array.isArray(data?.result) ? data.result : [])
        .slice(0, 10)
        .map((x) => ({
          symbol: x.symbol,
          shortname: x.description || x.displaySymbol || x.symbol,
          quoteType: mapFinnhubType(x.type),
          exchange: "",
        }));
      res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");
      res.status(200).json({ quotes });
    } catch {
      res.status(502).json({ error: "search_failed" });
    }
    return;
  }

  // ── Chart / quote mode ────────────────────────────────────────────────────
  // Validate to a real ticker charset and cap the count so this open proxy
  // can't be abused to fan out hundreds of parallel upstream fetches.
  const VALID_SYMBOL = /^[A-Z0-9.\-^=]{1,15}$/;
  const symbols = [
    ...new Set(
      String(q.symbols || "")
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter((s) => VALID_SYMBOL.test(s))
    ),
  ].slice(0, 60);

  if (symbols.length === 0) {
    res.status(200).json({});
    return;
  }

  // Partition by asset class.
  const cryptoSyms = [];
  const stockSyms = [];
  for (const sym of symbols) {
    if (cryptoMeta(sym)) cryptoSyms.push(sym);
    else stockSyms.push(sym);
  }

  // Warm all needed CoinGecko ids in one batched call before building results.
  if (cryptoSyms.length) {
    const ids = [...new Set(cryptoSyms.map((s) => cryptoMeta(s).id))];
    await warmCrypto(ids);
  }

  // Stocks fan out in parallel; allSettled keeps one bad symbol from failing all.
  const settled = await Promise.allSettled(
    stockSyms.map((sym) => finnhubResult(sym, KEY))
  );

  const out = {};
  for (const sym of cryptoSyms) {
    const meta = cryptoMeta(sym);
    out[sym] = cryptoResult(meta.id, meta.name);
  }
  stockSyms.forEach((sym, i) => {
    const s = settled[i];
    out[sym] = s.status === "fulfilled" ? s.value : null;
  });

  // Short edge cache — live prices change fast, keep it brief but absorb bursts.
  res.setHeader("Cache-Control", "public, max-age=5, s-maxage=10");
  res.status(200).json(out);
}
