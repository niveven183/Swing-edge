// ─── CHART OCR (Vercel serverless function) ────────────────────────────────
// Reads a trading-chart screenshot with Claude Vision and returns the trade
// levels as clean JSON.
//
// B-deterministic: the model READS deltas and percents off a TradingView Long/Short
// Position tool ("Stop: 4.39 (5.871%)"), and THIS CODE derives all prices. Entry is
// computed as delta/(percent/100) — deterministic math, no Vision reading required.
// Stop/target are then entry ± delta. Vision's read entry is used only as a cross-check
// signal that adjusts confidence, never as a price source. Failed validation nulls the
// specific field rather than surfacing a guess; low confidence or a suspect Vision
// entry nulls all prices.
//
// DIRECTION is its own decision, because the deltas are unsigned: `side` alone decides
// whether the stop lands above or below the entry, so getting it wrong yields a
// plausible, fully-populated, WRONG trade. Three ranked sources, reported in
// `sideSource`: measured geometry (which side of the entry each read line sits on,
// magnitude-verified against the trusted delta) → the model's own LONG/SHORT label →
// the caller's toggle. `sideConflict` says the answer differs from that toggle; the
// client must SHOW that conflict, never resolve it silently.
//
//   POST /api/ocr
//   body : { image: "<base64 or data:...;base64,...>", side: "LONG"|"SHORT" }
//   200  : { ticker, entry, stop, target, side, sideSource, sideConflict, confidence, rrRatio }
//
// entry/stop/target are computed PRICES; deltas/percents/direction stay internal.
// Low confidence or failed validation → null, never a guess. On any upstream or
// parse failure the endpoint degrades to a safe null result rather than a 500.

import { rateLimit } from "./_lib/rateLimit.js";
import { resolveOrigin } from "./_lib/cors.js";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

// Abort an upstream call that hangs past `ms`. Both call sites already wrap
// their fetch in a catch-all that degrades to the same fallback response for
// any error, so a timeout is handled identically to a network failure.
const fetchWithTimeout = (url, opts = {}, ms = 8000) => {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  return fetch(url, { ...opts, signal: c.signal }).finally(() => clearTimeout(t));
};

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

// A read absolute stop/target price is admitted as direction evidence only when its
// DISTANCE from the entry matches the delta we already trust, within this fraction of
// the entry. Same tolerance guards the computed levels against the read ones.
const GEO_TOL = 0.005;

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

// Derive entry deterministically from delta/percent pairs.
// The Position tool encodes percent = (delta / entry) × 100, so:
//   entry = delta / (percent / 100)
// This identity is direction-agnostic — SHORT and LONG use the same formula
// because the label always shows the unsigned distance and its percentage.
// Returns { value, source: "both"|"stop"|"target"|"none", converged: bool|null }
function computeEntry(stopDelta, stopPercent, targetDelta, targetPercent) {
  const eFromStop =
    stopDelta > 0 && stopPercent > 0
      ? tidy(stopDelta / (stopPercent / 100))
      : null;
  const eFromTarget =
    targetDelta > 0 && targetPercent > 0
      ? tidy(targetDelta / (targetPercent / 100))
      : null;

  if (eFromStop !== null && eFromTarget !== null) {
    const relDiff =
      Math.abs(eFromStop - eFromTarget) / Math.max(eFromStop, eFromTarget);
    if (relDiff <= 0.003)
      return { value: tidy((eFromStop + eFromTarget) / 2), source: "both", converged: true };
    // Legs disagree beyond rounding — prefer stop (more prominent label)
    return { value: eFromStop, source: "stop", converged: false };
  }
  if (eFromStop   !== null) return { value: eFromStop,   source: "stop",   converged: null };
  if (eFromTarget !== null) return { value: eFromTarget, source: "target", converged: null };
  return { value: null, source: "none", converged: null };
}

// Direction from ONE read absolute price. The magnitude is verified against the delta
// that was read separately and already trusted; only then is the price's SIGN relative
// to the entry admitted as evidence. That verification is the whole point: it makes
// this a measurement cross-checked by a second measurement, rather than one more label
// the model classified. A price that is off by more than GEO_TOL (a misread digit, the
// tick count, the Amount) proves nothing and returns null instead of a coin flip.
// `longIsAbove` says where that line sits on a LONG: target above the entry, stop below.
function dirFromPrice(entry, price, delta, longIsAbove) {
  if (!(entry > 0) || price === null || delta === null || !(delta > 0)) return null;
  const diff = price - entry;
  if (diff === 0) return null;
  if (Math.abs(Math.abs(diff) - delta) / entry > GEO_TOL) return null;
  return (diff > 0) === longIsAbove ? "LONG" : "SHORT";
}

// Double cross-check. Each leg's delta must agree with its own percent
// (delta/entry*100), and targetDelta/stopDelta must agree with the R/R ratio.
// When entry was computed FROM a leg, that leg's check is tautological — pass
// entrySource to mark it unchecked so it can't contribute to bothLegsFail.
function validate({
  entry,
  stopDelta,
  stopPercent,
  targetDelta,
  targetPercent,
  rrRatio,
  entrySource = "none",
}) {
  const stopTauto   = entrySource === "stop"   || entrySource === "both";
  const targetTauto = entrySource === "target" || entrySource === "both";
  const stopChecked   = !stopTauto   && entry > 0 && stopDelta   !== null && stopPercent   !== null;
  const targetChecked = !targetTauto && entry > 0 && targetDelta !== null && targetPercent !== null;
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
    "The ENTRY is different: it is an absolute PRICE on the Position tool's horizontal entry line —",
    "the price level at which the trade would be entered. Read it from the label on that line itself.",
    "Do NOT read it from the OHLC bar header at the top of the chart, and NOT from the current price",
    "shown in the price scale or live price panel. The panel header says BUY (long) or SELL (short).",
    "The entry price is a full price (e.g. 75.00), much larger than the deltas.",
    "",
    "TWO EXTRA READINGS, taken from the CHART itself and not from the labels:",
    "  - stopPrice   : the absolute PRICE level where the horizontal STOP line sits.",
    "  - targetPrice : the absolute PRICE level where the horizontal TARGET line sits.",
    "Both are full prices on the same scale as the entry (e.g. 70.61 and 87.16) — never a",
    "distance, never a percentage, never the tick count or the Amount. Read each one off the",
    "price scale at the height of that line. They exist only to confirm WHICH SIDE of the entry",
    "each line is on. If you cannot read a line's price level confidently, return null for it:",
    "a null here costs nothing, a wrong number here is worse than no number at all.",
    "",
    "Read the actual numbers off the chart and return:",
    "- ticker          : instrument symbol, uppercase, no exchange prefix (e.g. AFRM, BTCUSD), else null.",
    "- entry           : the entry PRICE (absolute), else null.",
    '- direction       : "LONG" if the panel says BUY / the tool is a Long Position / the target zone is',
    '                    above the entry; "SHORT" if SELL / Short Position / target below entry; else null.',
    "- stopDelta       : the Stop label's first number (price distance), else null.",
    "- stopPercent     : the Stop label's parenthesized percent (number only), else null.",
    "- stopPrice       : the absolute PRICE level of the stop line, else null.",
    "- targetDelta     : the Target label's first number, else null.",
    "- targetPercent   : the Target label's parenthesized percent (number only), else null.",
    "- targetPrice     : the absolute PRICE level of the target line, else null.",
    "- rrRatio         : the risk/reward ratio if the tool shows one (e.g. 2.77), else null.",
    "- hasPositionTool : true only if a Long/Short Position tool is clearly present, else false.",
    "- confidence      : integer 0-100 — your certainty about the numbers you read.",
    "",
    "Return STRICTLY one JSON object and nothing else (no prose, no markdown):",
    '{"ticker": <string|null>, "entry": <number|null>, "direction": <"LONG"|"SHORT"|null>, "stopDelta": <number|null>, "stopPercent": <number|null>, "stopPrice": <number|null>, "targetDelta": <number|null>, "targetPercent": <number|null>, "targetPrice": <number|null>, "rrRatio": <number|null>, "hasPositionTool": <boolean>, "confidence": <integer 0-100>}',
    "",
    "Rules:",
    "- Read digits exactly. Do not round, infer or compute. Unsure about a value → null for THAT field. Never guess.",
    "- All numbers plain: no %, no $, no thousands separators.",
    "- No Position tool → hasPositionTool=false and entry/deltas/percents/prices/direction = null.",
  ].join("\n");
}

// ─── Access control ─────────────────────────────────────────────────────────
// This endpoint spends a paid Anthropic key, so it must not be open to the
// public. Two layers: (1) require a valid Supabase JWT — only logged-in users
// can reach it (the whole SPA already sits behind AuthScreen, so every real
// caller has a session); (2) a best-effort in-memory per-user rate limit as
// defense against an abusive logged-in user.
// Reuse the SPA's Supabase env — the VITE_-prefixed vars are present at function
// runtime on Vercel; prefer unprefixed names if they are ever defined.
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

// Verify a Supabase access token by asking GoTrue who it belongs to. Returns the
// user object on success, null on any failure (missing / expired / invalid).
async function verifyUser(req) {
  const header = req.headers.authorization || req.headers.Authorization || "";
  const m = /^Bearer\s+(.+)$/i.exec(String(header));
  if (!m) return null;
  const token = m[1].trim();
  if (!token) return null;
  try {
    const r = await fetchWithTimeout(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
    });
    if (!r.ok) return null;
    const u = await r.json();
    return u && u.id ? u : null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  // CORS — restricted to the app's own origins (localhost + *.vercel.app).
  // Same-origin SPA calls are unaffected; this blocks cross-origin abuse of the
  // paid Vision endpoint. Authorization must be allowed so the browser can send
  // the Supabase bearer token on any cross-origin call.
  const allowedOrigin = resolveOrigin(req.headers.origin);
  if (allowedOrigin) res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  // Auth gate — verify the Supabase JWT before doing any paid work. Missing
  // Supabase env is a deploy misconfig (surface as config_error, not 401).
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    res.status(500).json({ error: "config_error" });
    return;
  }
  const user = await verifyUser(req);
  if (!user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  // Defense-in-depth: per-user rate limit, two windows (both must pass).
  // Best-effort/in-memory — see api/_lib/rateLimit.js header comment.
  const perMin = rateLimit(`${user.id}:ocr:min`, { windowMs: 60 * 1000, max: 10 });
  const perHour = rateLimit(`${user.id}:ocr:hour`, { windowMs: 60 * 60 * 1000, max: 60 });
  if (!perMin.allowed || !perHour.allowed) {
    const retryAfter = Math.max(perMin.retryAfter, perHour.retryAfter);
    console.warn(`[rate_limited] ocr user=${user.id} retryAfter=${retryAfter}s`);
    res.setHeader("Retry-After", String(retryAfter));
    res.status(429).json({ error: "rate_limited", retryAfter });
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

  // A safe, no-guess result used whenever the model output can't be trusted. Nothing
  // was read, so the direction is the caller's own toggle handed straight back —
  // sideSource "user", and by definition no conflict.
  const nullResult = {
    ticker: null,
    entry: null,
    stop: null,
    target: null,
    side,
    sideSource: "user",
    sideConflict: false,
    confidence: 0,
    rrRatio: null,
  };

  try {
    const r = await fetchWithTimeout(
      ANTHROPIC_URL,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": KEY,
          "anthropic-version": ANTHROPIC_VERSION,
        },
        body: JSON.stringify({
          model: MODEL,
          // 340, not 300: stopPrice/targetPrice add two number fields to the JSON.
          // Scenario C in the contract test is exactly a max_tokens truncation, and
          // it stays frozen — the ceiling moved, the truncation behaviour did not.
          max_tokens: 340,
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
      },
      30000
    );

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
    // The model's certainty here is certainty that there is NO position tool — it
    // says nothing about prices, and there are none. Cap below MIN_CONFIDENCE so
    // every badge reads it as failure, but keep it non-zero: the low end still
    // separates "sure there's no tool" from "could not read the image at all".
    if (parsed.hasPositionTool !== true) {
      res.status(200).json({ ...nullResult, ticker, confidence: Math.min(modelConf, 25) });
      return;
    }

    const visionEntry = num(parsed.entry);         // Vision-read entry — cross-check only
    const stopDelta = num(parsed.stopDelta);
    const targetDelta = num(parsed.targetDelta);
    const stopPercent = num(parsed.stopPercent);
    const targetPercent = num(parsed.targetPercent);
    const stopPriceRead = num(parsed.stopPrice);     // absolute — direction evidence + cross-check
    const targetPriceRead = num(parsed.targetPrice); // absolute — direction evidence + cross-check
    const rrRatioRead = num(parsed.rrRatio);

    // Compute entry deterministically from delta/percent pairs (direction-agnostic).
    // Falls back to visionEntry when no percents are available (source="none").
    const computed = computeEntry(stopDelta, stopPercent, targetDelta, targetPercent);
    const entry = computed.value !== null ? computed.value : visionEntry;

    // ─── Direction — one explicit, ranked hierarchy ────────────────────────
    // The deltas are unsigned magnitudes, so this single decision determines
    // whether the stop lands above or below the entry. A wrong answer here does
    // not look like a failure: it produces a complete, plausible, inverted trade.
    // Hence three ranked sources, and the winner is reported in `sideSource`:
    //   1 "geometry" — measured: which side of the entry each read line sits on,
    //                  with its distance verified against the trusted delta.
    //   2 "tool"     — the model's own LONG/SHORT classification of the panel.
    //                  This is a judgement call by the model; it misread Niv's
    //                  AFRM chart on 01.08, which is why it is no longer first.
    //   3 "user"     — the toggle the caller's form was on. Last, but never
    //                  overridden silently: see `sideConflict`.
    const geoFromTarget = dirFromPrice(entry, targetPriceRead, targetDelta, true);
    const geoFromStop = dirFromPrice(entry, stopPriceRead, stopDelta, false);
    // Two geometric legs that disagree are not evidence, they are noise → null.
    const geoDir =
      geoFromTarget && geoFromStop
        ? geoFromTarget === geoFromStop
          ? geoFromTarget
          : null
        : geoFromTarget || geoFromStop;
    const visionDir =
      parsed.direction === "LONG" || parsed.direction === "SHORT"
        ? parsed.direction
        : null;

    let resolvedSide, sideSource;
    if (geoDir !== null) {
      resolvedSide = geoDir;
      sideSource = "geometry";
    } else if (visionDir !== null) {
      resolvedSide = visionDir;
      sideSource = "tool";
    } else {
      resolvedSide = side;
      sideSource = "user";
    }
    // The answer differs from what the caller's toggle said. This is a CONFLICT
    // for the client to show and the trader to resolve — never a licence to flip
    // the toggle quietly: a silent flip makes an inverted trade internally
    // consistent and lets it past the last validation net (CLAUDE.md §2).
    const sideConflict = resolvedSide !== side;
    // Measured geometry contradicting the model's own label is the exact
    // signature of a misread direction. Geometry wins; confidence pays for it.
    const dirContradiction =
      geoDir !== null && visionDir !== null && geoDir !== visionDir;

    const { stopOk, targetOk, rrOk, stopChecked, targetChecked } = validate({
      entry,
      stopDelta,
      stopPercent,
      targetDelta,
      targetPercent,
      rrRatio: rrRatioRead,
      entrySource: computed.source,
    });

    // bothLegsFail is only meaningful when entry came from Vision (source="none").
    // With a computed entry the source legs are marked unchecked, so
    // stopChecked/targetChecked are false → gate always evaluates false (correct).
    const bothLegsFail =
      computed.source === "none" &&
      stopChecked && targetChecked && !stopOk && !targetOk;

    // Floor / suspect-entry gate → surface no prices, keeping badge<40 honest.
    if (modelConf < MIN_CONFIDENCE || bothLegsFail) {
      res.status(200).json({
        ticker,
        entry: null,
        stop: null,
        target: null,
        side: resolvedSide,
        sideSource,
        sideConflict,
        confidence: bothLegsFail ? Math.min(modelConf, 30) : modelConf,
        rrRatio: null,
      });
      return;
    }

    let { stop, target } = computeLevels(entry, stopDelta, targetDelta, resolvedSide);
    if (!stopOk) stop = null;
    if (!targetOk) target = null;

    // Final cross-check: a computed level must land where the read line actually
    // sits. The read price is never the source — it only gets to veto. This alone
    // catches an inverted direction at the server: computing 79.74 for a stop line
    // read at 68.44 is not a rounding difference, it is the wrong side of the entry.
    if (stop !== null && stopPriceRead !== null && Math.abs(stop - stopPriceRead) / entry > GEO_TOL)
      stop = null;
    if (target !== null && targetPriceRead !== null && Math.abs(target - targetPriceRead) / entry > GEO_TOL)
      target = null;

    // Confidence: aggregate signals from computed-entry quality and R/R agreement,
    // then clamp to [MIN_CONFIDENCE, 100]. A Vision-entry mismatch lowers confidence
    // but never zeros the computed entry — the computation is the trusted source.
    let confAdj = 0;
    if (computed.value !== null) {
      if (computed.converged === true)  confAdj += 5;    // both legs agree
      if (computed.converged === false) confAdj -= 10;   // legs disagree
      if (visionEntry !== null) {
        const relDiff = Math.abs(computed.value - visionEntry) / computed.value;
        confAdj += relDiff <= 0.01 ? 5 : -5;            // Vision agrees / disagrees
      }
    }
    if (!rrOk) confAdj -= 15;
    if (dirContradiction) confAdj -= 25;   // geometry and the model's label disagree

    const confidence = Math.max(MIN_CONFIDENCE, Math.min(100, modelConf + confAdj));

    // Prefer the deterministic ratio from the trusted deltas over the read one.
    const rrRatio =
      stopDelta > 0 && targetDelta !== null
        ? tidy(targetDelta / stopDelta)
        : rrRatioRead;

    res
      .status(200)
      .json({ ticker, entry, stop, target, side: resolvedSide, sideSource, sideConflict, confidence, rrRatio });
  } catch {
    // Network / unexpected error — recoverable, degrade gracefully.
    res.status(502).json({ error: "vision_failed" });
  }
}
