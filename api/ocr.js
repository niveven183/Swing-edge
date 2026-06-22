// ─── CHART OCR (Vercel serverless function) ────────────────────────────────
// Reads a trading-chart screenshot with Claude Vision and returns the trade
// levels as clean JSON. Replaces the old Tesseract path (ChartVisionEngine.js),
// which misread prices on dark TradingView charts (read Stop=700 when it was
// ~170). Built standalone (Stage 5a): no quota, no isPro, no UI wiring — those
// land in 5b/5c. The API key lives ONLY here (server-side); it is never shipped
// to the client and is never prefixed VITE_ (so Vite can't bundle it).
//
//   POST /api/ocr
//   body : { image: "<base64 or data:...;base64,...>", side: "LONG"|"SHORT" }
//   200  : { ticker, entry, stop, target, side, confidence }
//
// Low confidence → null, never a guess (3 layers: prompt nulls fields, parser
// coerces non-numbers to null, and a confidence floor clears prices). On any
// upstream/parse failure the endpoint degrades to a safe null result rather
// than throwing a global 500 — mirrors the resilience contract in api/quote.js.

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

// Single source for the model — A/B against Haiku is a one-line change here.
// Sonnet for accuracy: the whole point of the rebuild is reading fine price
// digits off dark charts correctly, which is exactly where Tesseract failed.
const MODEL = "claude-sonnet-4-6";

// Reject oversized payloads — this is an open endpoint. ~6MB decoded.
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

// Below this score we clear the prices instead of surfacing a guess (mirrors
// the old engine's <50 → clear rule). Ticker may survive a low score.
const MIN_CONFIDENCE = 40;

const ALLOWED_MEDIA = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);

// Split a base64 string that may be a full data URL into { mediaType, data }.
// Accepts raw base64 too (defaults to image/png).
function parseImage(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  const m = s.match(/^data:([a-zA-Z0-9.+/-]+);base64,(.*)$/s);
  if (m) {
    const mediaType = m[1].toLowerCase();
    return {
      mediaType: ALLOWED_MEDIA.has(mediaType) ? mediaType : "image/png",
      data: m[2],
    };
  }
  return { mediaType: "image/png", data: s };
}

// Coerce to a finite number, else null — never let a bad value through as text.
const num = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
};

// Pull the first {...} JSON object out of the model's text and parse it. The
// prompt asks for JSON only, but we stay defensive against prose / code fences.
function extractJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {}
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {}
  }
  return null;
}

function buildPrompt(side) {
  const dir =
    side === "SHORT"
      ? "The trade is SHORT: the stop is ABOVE the entry and the target is BELOW the entry."
      : "The trade is LONG: the stop is BELOW the entry and the target is ABOVE the entry.";
  return [
    "You are reading a trading chart screenshot (often TradingView, dark theme,",
    "frequently with a Long/Short Position drawing tool showing entry, stop and",
    "target lines/levels).",
    "",
    "Identify, reading the actual numbers off the chart:",
    "- ticker  : the instrument symbol (e.g. AAPL, BTCUSD). Uppercase, no exchange prefix.",
    "- entry   : the entry price.",
    "- stop    : the stop-loss price.",
    "- target  : the take-profit / target price.",
    "",
    dir,
    "Use this direction only to disambiguate which line is the stop vs the target.",
    "",
    "Return STRICTLY a single JSON object and nothing else (no prose, no markdown):",
    '{"ticker": <string|null>, "entry": <number|null>, "stop": <number|null>, "target": <number|null>, "confidence": <integer 0-100>}',
    "",
    "Rules:",
    "- If you are not confident about a value, return null for THAT field. Do NOT guess.",
    "- confidence reflects your overall certainty about the prices you returned.",
    "- Numbers must be plain numbers (no currency symbols, no thousands separators).",
  ].join("\n");
}

export default async function handler(req, res) {
  // CORS — permissive so the SPA can consume it from any origin.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  // Vercel auto-parses JSON bodies, but stay safe if it arrives as a string.
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  body = body || {};

  const side = String(body.side || "LONG").toUpperCase() === "SHORT" ? "SHORT" : "LONG";

  const img = parseImage(body.image);
  if (!img || !img.data) {
    res.status(400).json({ error: "missing_image" });
    return;
  }
  // Reject oversized images (base64 is ~4/3 of the decoded byte size).
  if (img.data.length * 0.75 > MAX_IMAGE_BYTES) {
    res.status(400).json({ error: "image_too_large" });
    return;
  }

  const KEY = process.env.ANTHROPIC_API_KEY || "";
  if (!KEY) {
    // Real configuration failure — the deploy is missing its env var.
    res.status(500).json({ error: "config_error" });
    return;
  }

  // A safe, no-guess result used whenever the model output can't be trusted.
  const nullResult = {
    ticker: null,
    entry: null,
    stop: null,
    target: null,
    side,
    confidence: 0,
  };

  try {
    const r = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": KEY,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: img.mediaType, data: img.data },
              },
              { type: "text", text: buildPrompt(side) },
            ],
          },
        ],
      }),
    });

    if (!r.ok) {
      // Upstream error (auth, rate limit, 5xx) — recoverable, not our 500.
      res.status(502).json({ error: "vision_failed" });
      return;
    }

    const data = await r.json();
    const text = Array.isArray(data?.content)
      ? data.content.map((b) => (b?.type === "text" ? b.text : "")).join("")
      : "";

    const parsed = extractJson(text);
    if (!parsed || typeof parsed !== "object") {
      // Model returned something unparseable — degrade gracefully, don't 500.
      res.status(200).json(nullResult);
      return;
    }

    let confidence = num(parsed.confidence);
    confidence = confidence === null ? 0 : Math.max(0, Math.min(100, Math.round(confidence)));

    let entry = num(parsed.entry);
    let stop = num(parsed.stop);
    let target = num(parsed.target);

    // Confidence floor — below this we surface no price rather than a guess.
    if (confidence < MIN_CONFIDENCE) {
      entry = null;
      stop = null;
      target = null;
    }

    const ticker =
      typeof parsed.ticker === "string" && parsed.ticker.trim()
        ? parsed.ticker.trim().toUpperCase()
        : null;

    res.status(200).json({ ticker, entry, stop, target, side, confidence });
  } catch {
    // Network / unexpected error — recoverable, degrade gracefully.
    res.status(502).json({ error: "vision_failed" });
  }
}
