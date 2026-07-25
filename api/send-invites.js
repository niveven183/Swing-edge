// ─── INVITE SEND (Vercel serverless function) ──────────────────────────────
// One-click "approve ⇒ send": marks the given waitlist rows approved (server-side
// caps) and emails the launch invite to whoever must be sent NOW. Collapses the
// two-step "approve in panel, then run the Email Campaign Action" flow (S3.2).
//
//   POST /api/send-invites
//   body : { ids: uuid[], campaign?: string }   // campaign defaults to 'waitlist_launch'
//   200  : { sent, failed }                       // (+ log_failed:true if the ledger write failed)
//   400  : { error }                              // Hebrew cap/validation message, shown verbatim in a toast
//
// The DAILY (120) / BATCH (25) caps and the is_admin() gate live in the RPCs
// (admin_invite_send), NOT here — a client can never widen them. This function
// forwards the CALLER'S own Supabase JWT as the RPC Authorization; the security-
// definer function then checks is_admin() itself. No service-role key anywhere.
//
// The Email Campaign GitHub Action stays as the bulk/backup sender; the send-list
// dedup (email_campaign_log) is shared, so the two paths never double-send.

import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";

// Reuse the SPA's Supabase env — VITE_-prefixed vars are present at function
// runtime on Vercel; prefer unprefixed names if ever defined.
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

const CAMPAIGN_DEFAULT = "waitlist_launch";
const TEMPLATE_PATH = "emails/waitlist_launch.html";
const SUBJECT = "ההזמנה שלך ל-SwingEdge 🚀";
const SEND_GAP_MS = 300; // pause between messages — 25 × 300ms is well under maxDuration 60s

// Abort an upstream call that hangs past `ms` — same helper as api/ocr.js.
const fetchWithTimeout = (url, opts = {}, ms = 8000) => {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  return fetch(url, { ...opts, signal: c.signal }).finally(() => clearTimeout(t));
};

// Allow only the app's own origins cross-origin (prod + previews + custom domain).
// Same-origin SPA calls never hit CORS. Mirrors api/ocr.js.
function resolveOrigin(origin) {
  if (!origin) return null;
  try {
    const host = new URL(origin).hostname;
    const ok =
      host === "localhost" || host === "127.0.0.1" || host.endsWith(".vercel.app") ||
      host === "swing-edge.com" || host === "www.swing-edge.com";
    return ok ? origin : null;
  } catch {
    return null;
  }
}

// Verify a Supabase access token via GoTrue. Returns the user on success, else
// null. Also returns the raw token so it can be forwarded to the RPCs.
async function verifyUser(req) {
  const header = req.headers.authorization || req.headers.Authorization || "";
  const m = /^Bearer\s+(.+)$/i.exec(String(header));
  if (!m) return { user: null, token: null };
  const token = m[1].trim();
  if (!token) return { user: null, token: null };
  try {
    const r = await fetchWithTimeout(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
    });
    if (!r.ok) return { user: null, token: null };
    const u = await r.json();
    return u && u.id ? { user: u, token } : { user: null, token: null };
  } catch {
    return { user: null, token: null };
  }
}

// Call a security-definer RPC through PostgREST, forwarding the caller's JWT so
// is_admin() resolves inside the function. Returns { ok, status, data }.
async function callRpc(fn, token, body) {
  const r = await fetchWithTimeout(
    `${SUPABASE_URL}/rest/v1/rpc/${fn}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
    15000
  );
  let data = null;
  try {
    data = await r.json();
  } catch {
    data = null;
  }
  return { ok: r.ok, status: r.status, data };
}

// Minimal encoded fallback used only if the template can't be read at runtime.
// Vercel file tracing can't follow the runtime path.join, so vercel.json pins
// includeFiles:"emails/**" — this stays as a safety net, never the happy path.
const FALLBACK_HTML =
  '<!DOCTYPE html><html dir="rtl" lang="he"><body style="font-family:Arial,Helvetica,sans-serif;background:#f4f8f2;padding:24px;">' +
  '<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;text-align:center;">' +
  '<h1 style="color:#070B0A;">SWING<span style="color:#00C076;">EDGE</span></h1>' +
  '<p style="color:#333;font-size:15px;">המקום שלך מוכן — התחברו כדי להתחיל.</p>' +
  '<p><a href="https://swing-edge.com" style="color:#00C076;">swing-edge.com</a></p>' +
  "</div></body></html>";

function loadTemplate() {
  try {
    return fs.readFileSync(path.join(process.cwd(), TEMPLATE_PATH), "utf-8");
  } catch (e) {
    console.error("[send-invites] template read failed, using fallback:", e?.message || "unknown");
    return FALLBACK_HTML;
  }
}

// Plain-text alternative — same strip-tags as the Email Campaign workflow.
function htmlToText(html) {
  return (
    html
      .replace(/<[^>]+>/g, "")
      .replace(/\n\s*\n+/g, "\n\n")
      .trim() || "SwingEdge"
  );
}

// Best-effort Discord report — mirrors the workflow's 📧 embed. Never throws.
async function reportDiscord(campaign, sent, failed) {
  const webhook = process.env.SENTINEL_DISCORD_WEBHOOK;
  if (!webhook) return;
  try {
    const stamp = new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";
    const desc =
      `📧 Email Campaign — ${campaign}\n` +
      `• נשלחו: ${sent}\n• נכשלו: ${failed}\nנבדק: ${stamp}`;
    const color = failed > 0 ? 15158332 : 3066993; // red : green
    await fetchWithTimeout(
      webhook,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "SwingEdge Fleet",
          embeds: [{ description: desc, color }],
        }),
      },
      8000
    );
  } catch (e) {
    console.error("[send-invites] discord report failed:", e?.message || "unknown");
  }
}

export default async function handler(req, res) {
  // CORS — restricted to the app's own origins. Same-origin SPA calls unaffected.
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

  // Missing Supabase env is a deploy misconfig, not an auth failure.
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    res.status(500).json({ error: "config_error" });
    return;
  }

  // Auth gate — a valid Supabase JWT. is_admin() is enforced inside the RPC.
  const { user, token } = await verifyUser(req);
  if (!user || !token) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  // Body (Vercel auto-parses JSON; stay safe if it arrives as a string).
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  body = body || {};

  const ids = Array.isArray(body.ids) ? body.ids : null;
  if (!ids || ids.length === 0) {
    res.status(400).json({ error: "לא נבחרו נמענים" });
    return;
  }
  const campaign = String(body.campaign || CAMPAIGN_DEFAULT);

  // 1) Approve + get the send-list. Caps/gate enforced server-side in the RPC.
  const approve = await callRpc("admin_invite_send", token, {
    _ids: ids,
    _campaign: campaign,
  });
  if (!approve.ok) {
    // Surface the DB's original message (Hebrew cap/validation text) verbatim.
    const msg =
      (approve.data && (approve.data.message || approve.data.error)) ||
      "אישור נכשל";
    console.error(`[send-invites] admin_invite_send failed status=${approve.status}`);
    res.status(400).json({ error: msg });
    return;
  }

  const emails = Array.isArray(approve.data)
    ? approve.data.map((r) => r && r.email).filter(Boolean)
    : [];
  if (emails.length === 0) {
    res.status(200).json({
      sent: 0,
      failed: 0,
      message: "אין נמענים חדשים (כולם כבר קיבלו)",
    });
    return;
  }

  // 2) Send — one message per recipient, serial, with a small gap between them.
  const html = loadTemplate();
  const text = htmlToText(html);
  const user_ = process.env.MAIL_USERNAME;
  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST || "smtp.gmail.com",
    port: +(process.env.MAIL_PORT || 465),
    secure: true,
    auth: { user: user_, pass: process.env.MAIL_PASSWORD },
  });

  const results = [];
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    try {
      await transporter.sendMail({
        from: `SwingEdge <${user_}>`,
        replyTo: user_,
        to: email,
        subject: SUBJECT,
        text,
        html,
      });
      results.push({ email, status: "sent", error: "" });
      sent++;
    } catch (e) {
      // Never log the address; message only, truncated.
      console.error("[send-invites] send failed:", String(e?.message || "unknown").slice(0, 200));
      results.push({ email, status: "failed", error: String(e?.message || "unknown").slice(0, 200) });
      failed++;
    }
    if (i < emails.length - 1) {
      await new Promise((r) => setTimeout(r, SEND_GAP_MS));
    }
  }

  // 3) Record results in the campaign ledger. A log failure must not fail the
  //    request — surface log_failed so the manual workflow can reconcile.
  let log_failed = false;
  const logRes = await callRpc("admin_log_campaign_send", token, {
    _campaign: campaign,
    _rows: results,
  });
  if (!logRes.ok) {
    log_failed = true;
    console.error(`[send-invites] admin_log_campaign_send failed status=${logRes.status}`);
  }

  // 4) Best-effort Discord report — never blocks the response.
  await reportDiscord(campaign, sent, failed);

  const out = { sent, failed };
  if (log_failed) out.log_failed = true;
  res.status(200).json(out);
}
