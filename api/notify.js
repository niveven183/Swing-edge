// ─── SINGLE-RECIPIENT REPLY (Vercel serverless function) ────────────────────
// Replies to ONE feedback row with ONE branded template. Exists to delete a
// standing manual step: answering feedback by hand in Gmail, outside the ledger
// and outside every guard (CLAUDE.md §3).
//
//   POST /api/notify
//   body : { feedback_id: uuid, template: <allowlist key>, dry_run?: boolean,
//            body_text?: string }                         — the admin-written core
//   200  : { sent, failed, campaign, recipient_masked }   (+ log_failed:true)
//   200  : { sent: 0, reason: "already_sent" }            — ledger dedup
//
//   GET  /api/notify
//   200  : { body_max, templates: [ { key, subject, body } ] }   — admin only
//
// GET exists so the admin panel can populate its template picker WITHOUT holding
// a second copy of the allowlist. Two copies disagree silently: a template
// present in one and absent from the other simply never appears. It returns the
// key and the subject and nothing else — never the file path, never the HTML.
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
// ⚠️ Ceiling note: the real cap is the LEDGER, not the rate limit. Until
// 2026-08-08 that cap was "one reply per feedback, forever" — campaign was
// "reply:<feedback_id>" and nothing else could ever be filed under it. The seven
// templates make that wrong on purpose: "we reproduced your bug" today and "it
// is fixed" next week are two letters about one report. The key now carries a
// server-derived counter AND a content fingerprint, and it is the fingerprint
// that still caps anything — see api/_lib/replyLedger.js. The rate limiter below
// is in-memory per Lambda instance and is a speed bump, not a cap.

import fs from "fs";
import path from "path";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { resolveOrigin } from "./_lib/cors.js";
import { rateLimit } from "./_lib/rateLimit.js";
import { campaignKey, hasFingerprint, nextN } from "./_lib/replyLedger.js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

// The only templates this endpoint can ever send. Adding a key is a code change
// and a code review; that is the point. Exported so the handle's test can derive
// the expected list instead of copying it — a test that copies the allowlist is
// itself the second copy it exists to forbid.
//
// `body: true` marks a SKELETON — a letter whose middle is written by the admin
// in the panel and injected at {{BODY}}. It is the single source of truth for
// "does this template need core text": the panel shows its textarea from this
// flag (served over GET), the validation below requires the field from it, and
// nothing else may hold an opinion about it.
export const TEMPLATES = {
  // ⛔ THE TWO FROZEN ONES. Both already went to real people, and
  // fix_mobile_upload is still the only written answer to the open OCR bug.
  // The subject must not promise more than the body delivers: the picker was
  // fixed, the OCR reading was not, and the body says so explicitly.
  fix_mobile_upload: { file: "emails/fix_mobile_upload.html", subject: "מצאנו את מה שחסם אותך" },
  files_received: { file: "emails/files_received.html", subject: "הקבצים שלך התקבלו" },

  // The seven skeletons. Two frozen templates were serving seven kinds of event,
  // which is why every letter had to stay vague enough to cover all of them.
  reply_bug_fixed: { file: "emails/reply_bug_fixed.html", subject: "הבאג שדיווחת — תוקן", body: true },
  reply_bug_ack: { file: "emails/reply_bug_ack.html", subject: "שחזרנו את הבאג שדיווחת", body: true },
  reply_feature_accepted: { file: "emails/reply_feature_accepted.html", subject: "הרעיון שלך נכנס לתוכנית", body: true },
  reply_feature_declined: { file: "emails/reply_feature_declined.html", subject: "הרעיון שלך — ההחלטה, והנימוק", body: true },
  reply_need_info: { file: "emails/reply_need_info.html", subject: "שאלה אחת, כדי לא לנחש", body: true },
  reply_material_received: { file: "emails/reply_material_received.html", subject: "החומר שלך התקבל", body: true },
  reply_thanks: { file: "emails/reply_thanks.html", subject: "תודה", body: true },
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 2000 characters of core. The measured reply of 07.08 — the most detailed one
// ever written, covering four separate reports — was ~900, so a tighter cap
// would have blocked the very letter this feature exists to make repeatable.
// Upward: escaping can expand a character sixfold (& → &amp;), so 2000 is at
// most ~12KB against a ~5KB skeleton, and Gmail clips a message around 102KB.
// The cap is not there to save bytes; it is there so a stray paste cannot
// produce a letter nobody can read.
const BODY_MAX = 2000;

const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Admin text → paragraphs. Blank line splits, single newline breaks, and NOTHING
// else is honoured: ⛔ no markdown, no link syntax, no tag allowlist. Every
// character the admin typed reaches the recipient as a character, which is the
// only version of this that can be reasoned about.
function renderBody(text) {
  return String(text)
    .replace(/\r\n/g, "\n")
    .trim()
    .split(/\n\s*\n+/)
    .map(
      (p) =>
        `<div style="font-size:15px;color:#3d4a44;line-height:1.75;margin:0 0 16px;">${escapeHtml(p).replace(
          /\n/g,
          "<br>"
        )}</div>`
    )
    .join("\n");
}

// ⚠️ THE REPLACEMENT MUST BE A FUNCTION. String.prototype.replace interprets
// $&, $` and $' inside a string replacement, so a core containing "$&" would
// re-insert the literal "{{BODY}}" into the letter and "$`" would inline the
// entire document prefix. A function replacer is passed through verbatim.
function injectBody(html, text) {
  return html.replace("{{BODY}}", () => renderBody(text));
}

// sha256(template + "\n" + trimmed core), first 8 hex. See replyLedger.js for
// why identity (`n`) and deduplication (this) had to be separated.
function fingerprint(templateKey, bodyText) {
  return crypto
    .createHash("sha256")
    .update(`${templateKey}\n${String(bodyText).trim()}`)
    .digest("hex")
    .slice(0, 8);
}

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

// Every reply already filed against this feedback. One read serves both
// questions — what is the next `n`, and has this exact letter already gone out —
// because two reads could disagree with each other between them.
//
// Reads with the caller's JWT (email_campaign_log_admin_select covers admins).
// ⛔ campaign + status only. The email column is never selected, here or in the
// panel. `limit=200` is a runaway guard, not a real ceiling: 200 replies to one
// feedback row is not a scenario, it is a bug that should be visible.
async function readReplyLedger(feedbackId, token) {
  const url =
    `${SUPABASE_URL}/rest/v1/email_campaign_log` +
    `?campaign=like.${encodeURIComponent(`reply:${feedbackId}*`)}` +
    `&select=campaign,status&limit=200`;
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
  return Array.isArray(rows) ? rows : "unknown";
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
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST" && req.method !== "GET") {
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

  if (req.method === "GET") {
    // A SEPARATE limiter key, deliberately. The send budget below is 3/10min:
    // sharing it would let three panel loads spend the whole allowance and jam
    // the handle shut for ten minutes, with no error a user could see — a 429 on
    // a list request looks like an empty picker. Listing is a read behind the
    // same admin gate, so it only needs a ceiling on runaway loops.
    const { allowed, retryAfter } = rateLimit(`${user.id}:notify_list:10m`, {
      windowMs: 10 * 60 * 1000,
      max: 60,
    });
    if (!allowed) {
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({ error: "rate_limited", retryAfter });
      return;
    }

    const listAdmin = await callRpc("is_admin", token, {});
    if (!listAdmin.ok || listAdmin.data !== true) {
      res.status(403).json({ error: "forbidden" });
      return;
    }

    // `body` travels with the list for the same reason the list travels at all:
    // the panel must not decide for itself which templates take core text. That
    // decision held in two places fails in the worst direction — a textarea that
    // never appears for a template that cannot be sent without one.
    res.status(200).json({
      // ⛔ Served, not duplicated. The panel's character counter and this 400 are
      // the same rule; a hardcoded 2000 in the JSX is a second source of truth
      // that drifts the moment BODY_MAX moves, and drifts toward a counter that
      // says "fine" about a request the server rejects.
      body_max: BODY_MAX,
      templates: Object.entries(TEMPLATES).map(([key, t]) => ({
        key,
        subject: t.subject,
        body: !!t.body,
      })),
    });
    return;
  }

  // Parsed BEFORE the limiter runs, because the limiter has to know which of the
  // two budgets this request belongs to. Pure work, no I/O, and the caller was
  // already authenticated above — moving it up opens no new surface.
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  body = body || {};

  // Strict === true, and the fallback direction is the safe one: "true" as a
  // string, 1, or a missing field all count as a SEND and pay the strict budget.
  // A dry run charged as a send is an inconvenience; a send charged as a dry run
  // is a hole in the quota that protects a real person's inbox.
  const dryRun = body.dry_run === true;

  // Keyed on the verified user id, so it cannot be shed by rotating IPs.
  //
  // ⚠️ THE DRY RUN HAS ITS OWN KEY, AND THAT IS THE POINT. It is the mandatory
  // gate before a send (src/lib/replyGate.js), so while it shared the send's
  // 3/10min allowance three previews shut the send out with a 429 — a gate that
  // closes itself is not a gate. It happened in production on 2026-08-07.
  //
  //   send — 3/10min + 20/24h, UNCHANGED. The daily cap exists because sends
  //   share the ~300/day Gmail ceiling with send-invites and the campaign
  //   workflow. This is the protection against a bulk send by accident.
  //
  //   dry  — 30/10min and NO daily cap. It sends no mail, so the Gmail ceiling
  //   that justifies 20/24h simply does not apply, and a daily number with no
  //   cost behind it is one nobody can justify the day it blocks someone. 30
  //   covers a full triage pass (a queue of 5 previewed against ~6 templates;
  //   replyGate revokes approval on every template switch, so previews multiply).
  //   The ceiling is here to stop a render loop, not an attacker — rateLimit is
  //   in-memory per Lambda and was never a hard global cap.
  const limits = dryRun
    ? [["dry:10m", { windowMs: 10 * 60 * 1000, max: 30 }]]
    : [
        ["10m", { windowMs: 10 * 60 * 1000, max: 3 }],
        ["24h", { windowMs: 24 * 60 * 60 * 1000, max: 20 }],
      ];
  for (const [suffix, opts] of limits) {
    const { allowed, retryAfter } = rateLimit(`${user.id}:notify:${suffix}`, opts);
    if (!allowed) {
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({ error: "rate_limited", retryAfter });
      return;
    }
  }

  const feedbackId = String(body.feedback_id || "");
  if (!UUID_RE.test(feedbackId)) {
    res.status(400).json({ error: "invalid_feedback_id" });
    return;
  }
  const templateKey = String(body.template || "");
  const tpl = TEMPLATES[templateKey];
  if (!tpl) {
    res.status(400).json({ error: "invalid_template" });
    return;
  }

  // ── the admin-written core ────────────────────────────────────────────────
  // Validated here, next to the other pure request checks and before any I/O.
  const hasBodyField = body.body_text !== undefined && body.body_text !== null;
  const bodyText = hasBodyField ? String(body.body_text) : "";
  if (tpl.body) {
    if (!bodyText.trim()) {
      // A skeleton with a hole in it still renders and still sends. The person
      // on the other end gets a branded email that says nothing at all.
      res.status(400).json({ error: "body_text_required" });
      return;
    }
    if (bodyText.length > BODY_MAX) {
      res.status(400).json({ error: "body_text_too_long", max: BODY_MAX, got: bodyText.length });
      return;
    }
  } else if (hasBodyField && bodyText.trim()) {
    // ⚠️ 400, NOT a silent drop. An admin who typed a core and then picked a
    // frozen template would otherwise send a letter missing everything they
    // wrote, with nothing anywhere to say so — §2, אפס כשל שקט.
    res.status(400).json({ error: "body_text_not_supported", template: templateKey });
    return;
  }

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

  const ledger = await readReplyLedger(feedbackId, token);
  if (ledger === "unknown") {
    res.status(503).json({ error: "ledger_unavailable" });
    return;
  }
  const hash = fingerprint(templateKey, bodyText);
  const n = nextN(ledger, feedbackId);
  const campaign = campaignKey(feedbackId, n, hash);

  // Not "has this feedback been answered" any more — that question now has a
  // legitimate yes. The question is whether THIS letter has already gone out.
  // Kept as 200 + reason rather than a 4xx so src/lib/replyGate.js keeps its
  // dedicated already_sent branch instead of surfacing a raw error string.
  if (hasFingerprint(ledger, feedbackId, hash)) {
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
  if (tpl.body) {
    // A skeleton whose slot was renamed or deleted still reads, still renders
    // and still sends — the admin's text just never appears. Refusing is the
    // only way that stays visible.
    if (!html.includes("{{BODY}}")) {
      console.error(`[notify] ${tpl.file} declares body:true but has no {{BODY}} slot`);
      res.status(500).json({ error: "template_missing_body_slot" });
      return;
    }
    html = injectBody(html, bodyText);
  }
  const text = htmlToText(html);

  if (dryRun) {
    res.status(200).json({
      dry_run: true,
      sent: 0,
      campaign,
      n,
      subject: tpl.subject,
      template: tpl.file,
      // ⚠️ THE RENDERED LETTER, not a byte count. With frozen templates the
      // size was a fingerprint of a file the admin could read in the repo. With
      // free text it fingerprints nothing a human can check: the same byte count
      // covers the intended core and a paragraph pasted into the wrong reply.
      // The panel renders this in a fully sandboxed iframe. Dry run ONLY —
      // never on GET, never in a send response.
      html,
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
