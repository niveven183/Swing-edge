// ─── SINGLE-RECIPIENT REPLY (Vercel serverless function) ────────────────────
// Replies to ONE feedback row with ONE branded template. Exists to delete a
// standing manual step: answering feedback by hand in Gmail, outside the ledger
// and outside every guard (CLAUDE.md §3).
//
//   POST /api/notify
//   body : { feedback_id: uuid, template: <allowlist key>, dry_run?: boolean }
//   200  : { sent, failed, campaign, recipient_masked }   (+ log_failed:true)
//   200  : { sent: 0, reason: "already_sent" }            — ledger dedup
//
// THE RECIPIENT IS NEVER TAKEN FROM THE REQUEST. It is resolved server-side from
// feedback_id. THE TEMPLATE IS NEVER TAKEN FROM THE REQUEST either — the body
// carries a key into a hard-coded allowlist, never HTML and never a path. Those
// two rules are what keep this endpoint from being an open relay wearing our
// branding, and they are the reason the contract looks narrower than it needs to.
//
// Authorization is enforced in the DATABASE, not here: is_admin() via the
// caller's own JWT, and admin_log_campaign_send re-checks it independently.
// No service-role key anywhere.
//
// ⚠️ Ceiling note: the real cap is the LEDGER, not the rate limit. campaign =
// "reply:<feedback_id>" is unique per feedback row, so a given feedback can be
// answered exactly once, forever, even across cold starts. The rate limiter
// below is in-memory per Lambda instance and is a speed bump, not a cap.

import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";
import { resolveOrigin } from "./_lib/cors.js";
import { rateLimit } from "./_lib/rateLimit.js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

// The only templates this endpoint can ever send. Adding a key is a code change
// and a code review; that is the point.
const TEMPLATES = {
  // The subject must not promise more than the body delivers: the picker was
  // fixed, the OCR reading was not, and the body says so explicitly.
  fix_mobile_upload: { file: "emails/fix_mobile_upload.html", subject: "מצאנו את מה שחסם אותך" },
  files_received: { file: "emails/files_received.html", subject: "הקבצים שלך התקבלו" },
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const fetchWithTimeout = (url, opts = {}, ms = 8000) => {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  return fetch(url, { ...opts, signal: c.signal }).finally(() => clearTimeout(t));
};

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

// Has this exact feedback already been answered? Reads the ledger with the
// caller's JWT (email_campaign_log_admin_select covers admins).
async function alreadySent(campaign, token) {
  const url =
    `${SUPABASE_URL}/rest/v1/email_campaign_log` +
    `?campaign=eq.${encodeURIComponent(campaign)}&status=eq.sent&select=id&limit=1`;
  const r = await fetchWithTimeout(url, {
    headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
  });
  // A ledger we cannot read is NOT a ledger that says "no". Fail closed:
  // refusing to send is recoverable, a duplicate send to a real person is not.
  if (!r.ok) {
    console.error(`[notify] ledger read failed status=${r.status} — refusing to send`);
    return "unknown";
  }
  const rows = await r.json().catch(() => null);
  return Array.isArray(rows) && rows.length > 0;
}

// "omrikapara1@example.com" → "om***@example.com". The admin confirms the right
// human by eye without an address ever entering a response, a log, or Discord.
// This exists because feedback.user_email is caller-asserted: api/feedback.js has
// no auth gate BY DESIGN (a user stuck before login must still be able to report),
// so a feedback row can name any address at all.
function maskEmail(email) {
  const s = String(email || "");
  const at = s.indexOf("@");
  if (at < 1) return "***";
  return `${s.slice(0, Math.min(2, at))}***${s.slice(at)}`;
}

function loadTemplate(file) {
  // No fallback here, unlike send-invites: a wrong-looking email to a user we
  // already disappointed is worse than no email. vercel.json pins
  // includeFiles:"emails/**" for this function — without it the read fails.
  return fs.readFileSync(path.join(process.cwd(), file), "utf-8");
}

function htmlToText(html) {
  return (
    html
      .replace(/<[^>]+>/g, "")
      .replace(/\n\s*\n+/g, "\n\n")
      .trim() || "SwingEdge"
  );
}

async function reportDiscord(campaign, sent, failed) {
  const webhook = process.env.SENTINEL_DISCORD_WEBHOOK;
  if (!webhook) {
    console.error(
      "[notify] SENTINEL_DISCORD_WEBHOOK is not set — Discord report skipped " +
        `(campaign=${campaign}, sent=${sent}, failed=${failed})`
    );
    return;
  }
  try {
    const stamp = new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";
    const desc =
      `📧 Feedback reply — ${campaign}\n` + `• נשלחו: ${sent}\n• נכשלו: ${failed}\nנבדק: ${stamp}`;
    await fetchWithTimeout(
      webhook,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "SwingEdge Fleet",
          embeds: [{ description: desc, color: failed > 0 ? 15158332 : 3066993 }],
        }),
      },
      8000
    );
  } catch (e) {
    console.error("[notify] discord report failed:", e?.message || "unknown");
  }
}

export default async function handler(req, res) {
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
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    res.status(500).json({ error: "config_error" });
    return;
  }

  const { user, token } = await verifyUser(req);
  if (!user || !token) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  // Keyed on the verified user id, so it cannot be shed by rotating IPs.
  // 3/10min covers a triage pass over the whole feedback queue; 20/24h stays far
  // below the ~300/day Gmail ceiling shared with send-invites and the campaign
  // workflow, leaving room for a bulk campaign on the same day.
  for (const [suffix, opts] of [
    ["10m", { windowMs: 10 * 60 * 1000, max: 3 }],
    ["24h", { windowMs: 24 * 60 * 60 * 1000, max: 20 }],
  ]) {
    const { allowed, retryAfter } = rateLimit(`${user.id}:notify:${suffix}`, opts);
    if (!allowed) {
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({ error: "rate_limited", retryAfter });
      return;
    }
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

  const feedbackId = String(body.feedback_id || "");
  if (!UUID_RE.test(feedbackId)) {
    res.status(400).json({ error: "invalid_feedback_id" });
    return;
  }
  const tpl = TEMPLATES[String(body.template || "")];
  if (!tpl) {
    res.status(400).json({ error: "invalid_template" });
    return;
  }
  const dryRun = body.dry_run === true;

  // Admin gate — resolved in the database against the caller's own JWT.
  const adminRes = await callRpc("is_admin", token, {});
  if (!adminRes.ok || adminRes.data !== true) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  // Recipient — server-side only, from the feedback row.
  const list = await callRpc("admin_feedback_list", token, {});
  if (!list.ok || !Array.isArray(list.data)) {
    console.error(`[notify] admin_feedback_list failed status=${list.status}`);
    res.status(500).json({ error: "feedback_lookup_failed" });
    return;
  }
  const row = list.data.find((r) => r && r.id === feedbackId);
  if (!row) {
    res.status(404).json({ error: "feedback_not_found" });
    return;
  }
  const recipient = String(row.user_email || "").trim();
  if (!recipient || !/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(recipient)) {
    res.status(400).json({ error: "feedback_has_no_valid_email" });
    return;
  }

  const campaign = `reply:${feedbackId}`;
  const dup = await alreadySent(campaign, token);
  if (dup === "unknown") {
    res.status(503).json({ error: "ledger_unavailable" });
    return;
  }
  if (dup) {
    res.status(200).json({ sent: 0, reason: "already_sent", campaign });
    return;
  }

  let html;
  try {
    html = loadTemplate(tpl.file);
  } catch (e) {
    console.error(`[notify] template read failed (${tpl.file}):`, e?.message || "unknown");
    res.status(500).json({ error: "template_unavailable" });
    return;
  }
  const text = htmlToText(html);

  if (dryRun) {
    res.status(200).json({
      dry_run: true,
      sent: 0,
      campaign,
      subject: tpl.subject,
      template: tpl.file,
      html_bytes: Buffer.byteLength(html, "utf8"),
      text_chars: text.length,
      recipient_masked: maskEmail(recipient),
    });
    return;
  }

  const mailUser = process.env.MAIL_USERNAME;
  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST || "smtp.gmail.com",
    port: +(process.env.MAIL_PORT || 465),
    secure: true,
    auth: { user: mailUser, pass: process.env.MAIL_PASSWORD },
  });

  let sent = 0;
  let failed = 0;
  let error = "";
  try {
    await transporter.sendMail({
      from: `SwingEdge <${mailUser}>`,
      replyTo: mailUser,
      to: recipient,
      subject: tpl.subject,
      text,
      html,
    });
    sent = 1;
  } catch (e) {
    error = String(e?.message || "unknown").slice(0, 200);
    console.error("[notify] send failed:", error);
    failed = 1;
  }

  let log_failed = false;
  const logRes = await callRpc("admin_log_campaign_send", token, {
    _campaign: campaign,
    _rows: [{ email: recipient, status: sent ? "sent" : "failed", error }],
  });
  if (!logRes.ok) {
    log_failed = true;
    console.error(`[notify] admin_log_campaign_send failed status=${logRes.status}`);
  }

  await reportDiscord(campaign, sent, failed);

  const out = { sent, failed, campaign, recipient_masked: maskEmail(recipient) };
  if (log_failed) out.log_failed = true;
  res.status(200).json(out);
}
