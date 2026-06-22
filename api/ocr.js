// ─── CHART OCR (Vercel serverless function) ────────────────────────────────
// Reads a trading-chart screenshot with Claude Vision and returns the trade
// levels as clean JSON.
//
// B-deterministic: the model READS components off a TradingView Long/Short
// Position tool — the entry PRICE plus the stop/target DISTANCES (deltas) and
// their percents — and THIS CODE does the arithmetic. The tool shows stop/target
// as a distance from entry, not an absolute price ("Stop: 4.39 (5.871%)"), so the
// old "read the prices" prompt produced a ~16x error. We compute stop/target from
// entry ± delta, take side from the read direction (body.side as fallback), and
// cross-check each delta against its own percent and against the R/R ratio; a
// misread number fails the check and is dropped rather than surfaced.
//
//   POST /api/ocr
//   body : { image: "<base64 or data:...;base64,...>", side: "LONG"|"SHORT" }
//   200  : { ticker, entry, stop, target, side, confidence, rrRatio }
//
// entry/stop/target are computed PRICES; deltas/percents/direction stay internal.
// Low confidence or failed validation → null, never a guess. On any upstream or
// parse failure the endpoint degrades to a safe null result rather than a 500.

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

// Single source for the model — A/B against Haiku is a one-line change here.
const MODEL = "claude-sonnet-4-6";

// Reject oversized payloads — this is an open endpoint. ~6MB decoded.
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

// Below this score we clear the prices instead of surfacing a guess. Ticker may
// survive a low score. Aligned with the UI badge thresholds (40 low / 70 high).
const MIN_CONFIDENCE = 40;

// Validation tolerances: each delta vs its own percent (in percentage points),
// and targetDelta/stopDelta vs the shown R/R ratio.
const PCT_TOL = 0.5;
const RR_TOL = 0.1;

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

// Coerce to a finite number, else null. Strips thousands separators and a
// trailing % (the model may echo a percent as "5.871%").
const num = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n =
    typeof v === "number"
      ? v
      : parseFloat(String(v).replace(/,/g, "").replace(/%/g, ""));
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

// Strip IEEE-754 float noise (75 - 4.39 = 70.61000000001 → 70.61) while keeping
// real precision for both sub-cent crypto and 5-digit prices. 12 significant
// digits is far past any genuine price precision and only trims artifacts.
const tidy = (n) =>
  n === null || n === undefined ? null : Number(n.toPrecision(12));

// entry ± delta, with the sign set by side. Long: stop below, target above;
// Short: the mirror. Deltas are unsigned magnitudes, so side is required.
function computeLevels(entry, stopDelta, targetDelta, side) {
  if (entry === null) return { stop: null, target: null };
  const sStop = side === "SHORT" ? 1 : -1;
  const sTgt = side === "SHORT" ? -1 : 1;
  return {
    stop: stopDelta !== null ? tidy(entry + sStop * stopDelta) : null,
    target: targetDelta !== null ? tidy(entry + sTgt * targetDelta) : null,
  };
}

// Double cross-check. Each leg's delta must agree with its own percent
// (delta/entry*100), and targetDelta/stopDelta must agree with the R/R ratio.
// A leg without a percent is "unchecked" → it passes but is not evidence, so it
// can't on its own condemn the entry (see bothLegsFail in the handler).
function validate({
  entry,
  stopDelta,
  stopPercent,
  targetDelta,
  targetPercent,
  rrRatio,
}) {
  const stopChecked = entry > 0 && stopDelta !== null && stopPercent !== null;
  const targetChecked =
    entry > 0 && targetDelta !== null && targetPercent !== null;
  const stopOk = stopChecked
    ? Math.abs((stopDelta / entry) * 100 - stopPercent) <= PCT_TOL
    : true;
  const targetOk = targetChecked
    ? Math.abs((targetDelta / entry) * 100 - targetPercent) <= PCT_TOL
    : true;
  const rrOk =
    stopDelta > 0 && targetDelta !== null && rrRatio !== null
      ? Math.abs(targetDelta / stopDelta - rrRatio) <= RR_TOL
      : true;
  return { stopOk, targetOk, rrOk, stopChecked, targetChecked };
}

function buildPrompt() {
  return [
    "You are reading a screenshot of a trading chart, almost always TradingView (dark theme).",
    'The trader has drawn a "Long Position" or "Short Position" tool. That tool overlays the',
    "price with two colored zones and labels for the entry, the stop and the target.",
    "",
    "CRITICAL — how each Stop/Target label is structured:",
    "The Stop and Target labels show the DISTANCE FROM THE ENTRY, never an absolute price.",
    "A label reads like:",
    '  "Target: 12.16 (16.263%) 1,216, Amount: 1692.48"',
    '  "Stop: 4.39 (5.871%) 439, Amount: 750"',
    "For each label read exactly two quantities, by position:",
    "  - delta   = the FIRST number after the label name (e.g. Stop delta = 4.39). It is a",
    "              price distance, usually small relative to the entry price.",
    "  - percent = the number inside parentheses ending in % (e.g. 5.871). Return it WITHOUT the % sign.",
    "The later numbers (the tick count like 439 / 1,216 and the \"Amount: ...\" dollar value) are",
    "NOT prices — IGNORE them completely. Never return the percent, the tick count, or the Amount",
    "as the delta. The delta is always the first number.",
    "",
    "The ENTRY is different: it is an absolute PRICE, shown on the entry line or in the tool's",
    "panel. The panel shows BUY for a long position or SELL for a short position. The entry is a",
    "full price (e.g. 75.00), much larger than the deltas.",
    "",
    "Read the actual numbers off the chart and return:",
    "- ticker          : instrument symbol, uppercase, no exchange prefix (e.g. AFRM, BTCUSD), else null.",
    "- entry           : the entry PRICE (absolute), else null.",
    '- direction       : "LONG" if the panel says BUY / the tool is a Long Position / the target zone is',
    '                    above the entry; "SHORT" if SELL / Short Position / target below entry; else null.',
    "- stopDelta       : the Stop label's first number (price distance), else null.",
    "- stopPercent     : the Stop label's parenthesized percent (number only), else null.",
    "- targetDelta     : the Target label's first number, else null.",
    "- targetPercent   : the Target label's parenthesized percent (number only), else null.",
    "- rrRatio         : the risk/reward ratio if the tool shows one (e.g. 2.77), else null.",
    "- hasPositionTool : true only if a Long/Short Position tool is clearly present, else false.",
    "- confidence      : integer 0-100 — your certainty about the numbers you read.",
    "",
    "Return STRICTLY one JSON object and nothing else (no prose, no markdown):",
    '{"ticker": <string|null>, "entry": <number|null>, "direction": <"LONG"|"SHORT"|null>, "stopDelta": <number|null>, "stopPercent": <number|null>, "targetDelta": <number|null>, "targetPercent": <number|null>, "rrRatio": <number|null>, "hasPositionTool": <boolean>, "confidence": <integer 0-100>}',
    "",
    "Rules:",
    "- Read digits exactly. Do not round, infer or compute. Unsure about a value → null for THAT field. Never guess.",
    "- All numbers plain: no %, no $, no thousands separators.",
    "- No Position tool → hasPositionTool=false and entry/deltas/percents/direction = null.",
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

  const side =
    String(body.side || "LONG").toUpperCase() === "SHORT" ? "SHORT" : "LONG";

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
    rrRatio: null,
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
                source: {
                  type: "base64",
                  media_type: img.mediaType,
                  data: img.data,
                },
              },
              { type: "text", text: buildPrompt() },
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

    const ticker =
      typeof parsed.ticker === "string" && parsed.ticker.trim()
        ? parsed.ticker.trim().toUpperCase()
        : null;

    let modelConf = num(parsed.confidence);
    modelConf =
      modelConf === null ? 0 : Math.max(0, Math.min(100, Math.round(modelConf)));

    // No Position tool → no levels to compute (fallback C lands separately).
    if (parsed.hasPositionTool !== true) {
      res.status(200).json({ ...nullResult, ticker, confidence: modelConf });
      return;
    }

    const entry = num(parsed.entry);
    const stopDelta = num(parsed.stopDelta);
    const targetDelta = num(parsed.targetDelta);
    const stopPercent = num(parsed.stopPercent);
    const targetPercent = num(parsed.targetPercent);
    const rrRatioRead = num(parsed.rrRatio);

    // Side: the read direction wins; the UI hint (body.side) is the fallback.
    const visionDir =
      parsed.direction === "LONG" || parsed.direction === "SHORT"
        ? parsed.direction
        : null;
    const resolvedSide = visionDir || side;

    const { stopOk, targetOk, rrOk, stopChecked, targetChecked } = validate({
      entry,
      stopDelta,
      stopPercent,
      targetDelta,
      targetPercent,
      rrRatio: rrRatioRead,
    });

    // entry is suspect only when BOTH legs were actually checked and both fail
    // (their shared divisor is the culprit). A single failed checked leg nulls
    // only itself — never the whole result on one piece of evidence.
    const bothLegsFail =
      stopChecked && targetChecked && !stopOk && !targetOk;

    // Floor / suspect-entry gate → surface no prices, keeping badge<40 honest.
    if (modelConf < MIN_CONFIDENCE || bothLegsFail) {
      res.status(200).json({
        ticker,
        entry: null,
        stop: null,
        target: null,
        side: resolvedSide,
        confidence: bothLegsFail ? Math.min(modelConf, 30) : modelConf,
        rrRatio: null,
      });
      return;
    }

    let { stop, target } = computeLevels(
      entry,
      stopDelta,
      targetDelta,
      resolvedSide
    );
    if (!stopOk) stop = null;
    if (!targetOk) target = null;

    // R/R mismatch (legs self-consistent but the shown ratio disagrees) trims
    // trust to the medium band, but stays ≥ floor so surfaced values and the
    // badge remain consistent.
    const confidence = rrOk ? modelConf : Math.max(MIN_CONFIDENCE, modelConf - 15);

    // Prefer the deterministic ratio from the trusted deltas over the read one.
    const rrRatio =
      stopDelta > 0 && targetDelta !== null
        ? tidy(targetDelta / stopDelta)
        : rrRatioRead;

    res
      .status(200)
      .json({ ticker, entry, stop, target, side: resolvedSide, confidence, rrRatio });
  } catch {
    // Network / unexpected error — recoverable, degrade gracefully.
    res.status(502).json({ error: "vision_failed" });
  }
}
