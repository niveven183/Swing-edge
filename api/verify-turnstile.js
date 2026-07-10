// ─── TURNSTILE VERIFY (Vercel serverless function) ─────────────────────────
// Verifies a Cloudflare Turnstile token server-side before the client runs
// supabase.auth.signUp. Only the *signup* form calls this — signIn is untouched.
//
//   POST /api/verify-turnstile
//   body : { token }
//   200  : { ok: true }              → human-solved token, signup may proceed
//   400  : { error: "turnstile_failed" | "invalid_token" }  → definitive reject
//
// The client treats ONLY a definitive 400 as a hard block. Infra failures here
// (missing secret, Cloudflare down, timeout) return 5xx and the client FAILS
// OPEN — a real user is never permanently locked out of signup by an outage.

import { rateLimit, clientIp } from "./_lib/rateLimit.js";

const SECRET = process.env.TURNSTILE_SECRET_KEY;
const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

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

  const ip = clientIp(req);
  const { allowed, retryAfter } = rateLimit(`turnstile:${ip}`, {
    windowMs: 60 * 1000,
    max: 10,
  });
  if (!allowed) {
    console.warn(`[rate_limited] turnstile ip=${ip} retryAfter=${retryAfter}s`);
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

  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) {
    res.status(400).json({ error: "invalid_token" });
    return;
  }

  if (!SECRET) {
    // Misconfiguration, not a bot. 5xx → client fails open.
    console.error("[turnstile] TURNSTILE_SECRET_KEY is not set");
    res.status(500).json({ error: "config_error" });
    return;
  }

  let data;
  try {
    const form = new URLSearchParams();
    form.append("secret", SECRET);
    form.append("response", token);
    if (ip && ip !== "unknown") form.append("remoteip", ip);

    const cfRes = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    data = await cfRes.json();
  } catch (err) {
    // Cloudflare unreachable / timeout → 5xx so the client fails open.
    console.error(`[turnstile] siteverify request failed: ${err?.message || err}`);
    res.status(502).json({ error: "verify_unavailable" });
    return;
  }

  if (data && data.success === true) {
    res.status(200).json({ ok: true });
    return;
  }

  // Definitive rejection: token invalid, expired, or already used.
  res.status(400).json({ error: "turnstile_failed" });
}
