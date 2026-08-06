// ─── FEEDBACK PROXY (Vercel serverless function) ───────────────────────────
// Routes the FeedbackTab Supabase insert through a rate-limited endpoint so a
// bot can't spam the `feedback` table directly with the anon key. The anon
// key still does the actual insert (same RLS as the client-side call — see
// docs/INCIDENTS.md audit finding #3, WITH CHECK(true) on INSERT) — this
// endpoint's job is rate limiting, not authorization.
//
//   POST /api/feedback
//   body : { user_id, user_email, type, message }
//   200  : { ok: true }

import { createClient } from "@supabase/supabase-js";
import { rateLimit, clientIp } from "./_lib/rateLimit.js";
import { applyCors } from "./_lib/cors.js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const VALID_TYPES = new Set(["bug", "idea", "love", "question"]);
const MAX_MESSAGE_LEN = 5000;

const fetchWithTimeout = (url, opts = {}, ms = 8000) => {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  return fetch(url, { ...opts, signal: c.signal }).finally(() => clearTimeout(t));
};

// Three-state on purpose, unlike the verifyUser in api/ocr.js and api/notify.js
// which collapse "no header" and "bad token" into one null. Here the difference
// is the whole point: no header is a legitimate anonymous reporter and must be
// served, while a token that does not verify is an attack signal and must not be
// quietly downgraded to one.
//   { state: "anonymous" }        no Authorization header at all
//   { state: "verified", user }   GoTrue vouched for the token
//   { state: "invalid" }          a token was presented and did not verify
async function identify(req) {
  const header = req.headers.authorization || req.headers.Authorization || "";
  const m = /^Bearer\s+(.+)$/i.exec(String(header));
  if (!m) return { state: "anonymous" };
  const token = m[1].trim();
  if (!token) return { state: "anonymous" };
  try {
    const r = await fetchWithTimeout(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
    });
    if (!r.ok) return { state: "invalid" };
    const u = await r.json();
    return u && u.id ? { state: "verified", user: u } : { state: "invalid" };
  } catch {
    // GoTrue unreachable. Fail closed: the caller asked to be someone, and we
    // cannot confirm it. Serving them as anonymous would silently grant exactly
    // the substitution this endpoint now refuses to make.
    return { state: "invalid" };
  }
}

export default async function handler(req, res) {
  // CORS — restricted to the app's own origins. Still NO auth gate: a user who is
  // stuck before login must be able to report it. What changed is that identity is
  // no longer taken on the caller's word — see identify() and the insert below.
  if (applyCors(req, res, { methods: "POST, OPTIONS", headers: "Content-Type, Authorization" }))
    return;

  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const { allowed, retryAfter } = rateLimit(`feedback:${clientIp(req)}`, {
    windowMs: 60 * 1000,
    max: 3,
  });
  if (!allowed) {
    console.warn(`[rate_limited] feedback ip=${clientIp(req)} retryAfter=${retryAfter}s`);
    res.setHeader("Retry-After", String(retryAfter));
    res.status(429).json({ error: "rate_limited", retryAfter });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  body = body || {};

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    res.status(400).json({ error: "invalid_message" });
    return;
  }
  if (message.length > MAX_MESSAGE_LEN) {
    res.status(400).json({ error: "message_too_long" });
    return;
  }
  if (!VALID_TYPES.has(body.type)) {
    res.status(400).json({ error: "invalid_type" });
    return;
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    res.status(500).json({ error: "config_error" });
    return;
  }

  // Identity is derived here and NEVER read from the body. A caller-asserted
  // user_email does not stop at this table: api/notify.js resolves a reply
  // recipient from the row and mails it, so a forged address turned an admin's
  // "reply" click into a branded SwingEdge email to a stranger.
  const id = await identify(req);
  if (id.state === "invalid") {
    console.warn(`[feedback] rejected unverifiable token ip=${clientIp(req)}`);
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const identity =
    id.state === "verified"
      ? { user_id: id.user.id, user_email: id.user.email || "anonymous" }
      : { user_id: null, user_email: "anonymous" };

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { error: dbError } = await supabase.from("feedback").insert([
    {
      ...identity,
      type: body.type,
      message,
    },
  ]);

  if (dbError) {
    // Log the real cause server-side; never echo Postgres text to the client —
    // it names columns and constraints and helps nobody but an attacker.
    console.error(`[feedback] insert failed: ${dbError.message || String(dbError)}`);
    res.status(502).json({ error: "insert_failed" });
    return;
  }

  res.status(200).json({ ok: true });
}
