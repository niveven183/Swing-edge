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

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const VALID_TYPES = new Set(["bug", "idea", "love", "question"]);
const MAX_MESSAGE_LEN = 5000;

export default async function handler(req, res) {
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

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { error: dbError } = await supabase.from("feedback").insert([
    {
      user_id: body.user_id ?? null,
      user_email: typeof body.user_email === "string" ? body.user_email : "anonymous",
      type: body.type,
      message,
    },
  ]);

  if (dbError) {
    res.status(502).json({ error: "insert_failed", detail: dbError.message || String(dbError) });
    return;
  }

  res.status(200).json({ ok: true });
}
