// ─── BOUNDARY ALERT RELAY (Vercel serverless function) ─────────────────────
//
//   POST /api/alert
//   body : { message, boundary, release, route }
//   200  : { ok: true, discord: <status> }   → relayed
//   204-ish semantics: Discord answers 204 on success; we report that number.
//   429  : { error: "rate_limited" }          → capped, nothing sent
//   500  : { error: "config_error" }          → webhook not configured
//
// WHY THIS EXISTS: AUDIT-2026-09-07 measured 18h34m of a broken product with
// 1 of 6 alerting layers firing. Sentry had the error; nobody was looking at
// Sentry. This is the channel that reaches a human (B-307).
//
// ⛔ WHY THE WEBHOOK IS NOT IN THE CLIENT: a webhook URL in the bundle is a
// published secret — anyone who reads the JS can post to the channel forever,
// and rotating it means a redeploy (B-310). It is read here, from env, and is
// NEVER echoed back in any response or error.
//
// ⚠️ HONEST LIMITS OF THE RATE LIMIT — read before trusting it:
//   1. `_lib/rateLimit.js` is per-serverless-instance and resets on cold start.
//      N warm instances can each pass N buckets. It caps accidents and casual
//      abuse; it does NOT stop a determined distributed caller.
//   2. CORS does not help here at all. It is enforced by browsers; curl sends
//      no Origin and gets a full response either way (see _lib/cors.js).
//   So this endpoint is deliberately low-value to abuse: it posts a fixed-shape
//   embed, strips all mentions, and truncates every field. The worst outcome is
//   channel noise, which the caps bound.

import { rateLimit, clientIp } from "./_lib/rateLimit.js";
import { applyCors } from "./_lib/cors.js";

const WEBHOOK = process.env.SENTINEL_DISCORD_WEBHOOK;

const MAX_BODY_BYTES = 4000;

const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

const fetchWithTimeout = (url, opts = {}, ms = 8000) => {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  return fetch(url, { ...opts, signal: c.signal }).finally(() => clearTimeout(t));
};

export default async function handler(req, res) {
  if (applyCors(req, res, { methods: "POST, OPTIONS" })) return;

  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    if (body.length > MAX_BODY_BYTES) {
      res.status(413).json({ error: "payload_too_large" });
      return;
    }
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  body = body || {};

  const message = str(body.message, 300);
  const boundary = str(body.boundary, 60) || "unknown";
  const release = str(body.release, 40) || "unknown";
  const route = str(body.route, 200);

  if (!message) {
    res.status(400).json({ error: "invalid_message" });
    return;
  }

  // Two independent caps, because they stop two different things.
  // Per-IP stops one caller looping. Per boundary+release stops a REAL incident
  // — where thousands of distinct users hit the same broken panel — from
  // burying the channel. A channel that floods gets muted, and a muted channel
  // is the same as no channel (C-026: an alert nobody reads is not an alert).
  const ip = clientIp(req);
  const perIp = rateLimit(`alert:ip:${ip}`, { windowMs: 60 * 1000, max: 5 });
  if (!perIp.allowed) {
    console.warn(`[alert] rate_limited ip=${ip} retryAfter=${perIp.retryAfter}s`);
    res.setHeader("Retry-After", String(perIp.retryAfter));
    res.status(429).json({ error: "rate_limited", scope: "ip", retryAfter: perIp.retryAfter });
    return;
  }

  const perPanel = rateLimit(`alert:panel:${boundary}:${release}`, {
    windowMs: 60 * 1000,
    max: 1,
  });
  if (!perPanel.allowed) {
    console.warn(`[alert] rate_limited panel=${boundary} release=${release}`);
    res.setHeader("Retry-After", String(perPanel.retryAfter));
    res
      .status(429)
      .json({ error: "rate_limited", scope: "panel", retryAfter: perPanel.retryAfter });
    return;
  }

  if (!WEBHOOK) {
    // Named so a misconfigured deploy is greppable in the Vercel function log
    // instead of failing silently — the exact mode `send-invites` was caught in.
    console.error(
      `[alert] SENTINEL_DISCORD_WEBHOOK is not set — boundary alert dropped ` +
        `(boundary=${boundary}, release=${release})`
    );
    res.status(500).json({ error: "config_error" });
    return;
  }

  const payload = {
    username: "SwingEdge Boundary",
    // ⛔ Strips @everyone/@here/role pings. Without this, any caller can make
    // the endpoint mass-ping the server by putting a mention in `message`.
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title: "🔴 פאנל קרס אצל משתמש",
        description: `\`\`\`${message.replace(/`/g, "'")}\`\`\``,
        color: 0xef4444,
        fields: [
          { name: "פאנל", value: boundary, inline: true },
          { name: "גרסה", value: release, inline: true },
          { name: "מסלול", value: route || "—", inline: false },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  };

  let status;
  try {
    const dRes = await fetchWithTimeout(
      WEBHOOK,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      8000
    );
    status = dRes.status;
  } catch (err) {
    console.error(`[alert] discord POST failed: ${err?.message || err}`);
    res.status(502).json({ error: "discord_unreachable" });
    return;
  }

  // Discord answers 204 on success. Anything else is a dead or rotated webhook
  // and must be loud: a relay that reports ok on a 401 is the silent failure
  // this whole wave exists to remove (CLAUDE.md §2).
  if (status !== 204) {
    console.error(`[alert] discord POST -> HTTP ${status} (expected 204)`);
    res.status(502).json({ error: "discord_rejected", discord: status });
    return;
  }

  console.info(`[alert] discord POST -> HTTP 204 boundary=${boundary}`);
  res.status(200).json({ ok: true, discord: status });
}
