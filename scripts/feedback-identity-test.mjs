// scripts/feedback-identity-test.mjs — who a feedback row is allowed to claim to be.
//
// Drives the real /api/feedback handler with a stubbed Supabase, so applyCors,
// the rate limiter, every validation gate and the insert payload run for real.
// Only the network is faked.
//
// WHY THIS EXISTS. /api/feedback has no auth gate BY DESIGN — a user stuck before
// login must still be able to report it (api/feedback.js header comment). The gap
// was that "no auth gate" had been implemented as "believe whatever identity the
// body claims". /api/notify then resolves a reply recipient from that row and
// mails it, so a forged user_email turned an admin's "reply" click into a branded
// SwingEdge email to a stranger. Scenarios A–C are that hole, frozen shut.
//
// D is the counterweight and the reason this file is not just three asserts: the
// public path must keep returning 200 without a token. A "fix" that closes A–C by
// requiring auth would pass three checks and break the only escape hatch a locked-
// out user has. D fails loudly if that ever happens.
//
// E covers the far end of the same chain in api/notify.js — untouched by this
// change, asserted here because that is where a forged address would have been
// spent. Every scenario carries its own x-forwarded-for: /api/feedback allows
// 3/min/IP, so a shared IP would quietly turn scenario 4 into a 429 and report a
// pass that never ran.
//
//   node scripts/feedback-identity-test.mjs

process.env.VITE_SUPABASE_URL = "https://stub.supabase.co";
process.env.VITE_SUPABASE_ANON_KEY = "stub-anon-key";
process.env.SUPABASE_URL = "https://stub.supabase.co";
process.env.SUPABASE_ANON_KEY = "stub-anon-key";

const TOKEN_UID = "11111111-1111-4111-8111-111111111111";
const TOKEN_EMAIL = "owner@example.com";
const VICTIM_UID = "22222222-2222-4222-8222-222222222222";
const VICTIM_EMAIL = "victim@example.com";
const FEEDBACK_ID = "33333333-3333-4333-8333-333333333333";

const realFetch = globalThis.fetch;

// What the stubbed GoTrue says about the presented token, and what the insert saw.
let tokenValid = true;
let inserted = null;
let insertCalls = 0;

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);

  if (u.includes("/auth/v1/user")) {
    return tokenValid
      ? jsonResponse({ id: TOKEN_UID, email: TOKEN_EMAIL })
      : jsonResponse({ error: "invalid token" }, 401);
  }
  if (u.includes("/rest/v1/feedback")) {
    insertCalls++;
    const rows = JSON.parse(opts.body || "[]");
    inserted = Array.isArray(rows) ? rows[0] : rows;
    return jsonResponse([inserted], 201);
  }
  if (u.includes("/rpc/is_admin")) return jsonResponse(true);
  if (u.includes("/rpc/admin_feedback_list")) {
    return jsonResponse([{ id: FEEDBACK_ID, user_email: "anonymous", type: "bug" }]);
  }
  if (u.includes("/email_campaign_log")) return jsonResponse([]);

  throw new Error(`unexpected fetch: ${u}`);
};

function makeRes() {
  const out = { statusCode: null, body: null, headers: {} };
  const res = {
    setHeader(k, v) { out.headers[k] = v; },
    status(code) { out.statusCode = code; return res; },
    json(obj) { out.body = obj; return res; },
    end() { return res; },
  };
  return { res, out };
}

async function callFeedback(handler, { ip, auth, body }) {
  inserted = null;
  insertCalls = 0;
  const headers = {
    origin: "https://swing-edge.com",
    "content-type": "application/json",
    "x-forwarded-for": ip,
  };
  if (auth) headers.authorization = auth;
  const { res, out } = makeRes();
  await handler({ method: "POST", headers, body }, res);
  return out;
}

const feedback = (await import("../api/feedback.js")).default;
const notify = (await import("../api/notify.js")).default;

const failures = [];
let ran = 0;

function check(id, title, cond, detail) {
  ran++;
  if (cond) {
    console.log(`✅ ${id} — ${title}`);
  } else {
    failures.push(id);
    console.error(`❌ ${id} — ${title}`);
    console.error(`   ${detail}`);
  }
}

// ── A ── anonymous caller asserts a stranger's identity ──────────────────────
tokenValid = true;
{
  const out = await callFeedback(feedback, {
    ip: "203.0.113.1",
    body: { user_id: VICTIM_UID, user_email: VICTIM_EMAIL, type: "bug", message: "forged" },
  });
  check(
    "A",
    "no token → body identity is discarded, row is anonymous",
    out.statusCode === 200 && inserted?.user_id === null && inserted?.user_email === "anonymous",
    `status=${out.statusCode} user_id=${JSON.stringify(inserted?.user_id)} ` +
      `user_email=${JSON.stringify(inserted?.user_email)} — a forged address reached the row`
  );
}

// ── B ── authenticated caller asserts someone else's identity ────────────────
{
  const out = await callFeedback(feedback, {
    ip: "203.0.113.2",
    auth: "Bearer stub-jwt",
    body: { user_id: VICTIM_UID, user_email: VICTIM_EMAIL, type: "bug", message: "forged" },
  });
  check(
    "B",
    "valid token → identity comes from the token, not the body",
    out.statusCode === 200 && inserted?.user_id === TOKEN_UID && inserted?.user_email === TOKEN_EMAIL,
    `status=${out.statusCode} user_id=${JSON.stringify(inserted?.user_id)} ` +
      `user_email=${JSON.stringify(inserted?.user_email)} — expected ${TOKEN_UID} / ${TOKEN_EMAIL}`
  );
}

// ── C ── a presented token that does not verify ──────────────────────────────
{
  tokenValid = false;
  const out = await callFeedback(feedback, {
    ip: "203.0.113.3",
    auth: "Bearer rubbish",
    body: { user_id: VICTIM_UID, user_email: VICTIM_EMAIL, type: "bug", message: "forged" },
  });
  check(
    "C",
    "invalid token → 401, nothing written",
    out.statusCode === 401 && insertCalls === 0,
    `status=${out.statusCode} insertCalls=${insertCalls} — a broken token is an attack signal, ` +
      `not an anonymous user; it must not fall through to an anonymous insert`
  );
  tokenValid = true;
}

// ── D ── the public path, which this change must not cost us ─────────────────
{
  const out = await callFeedback(feedback, {
    ip: "203.0.113.4",
    body: { type: "bug", message: "locked out, cannot sign in" },
  });
  check(
    "D",
    "no token → the locked-out user can still report (200)",
    out.statusCode === 200 && insertCalls === 1 && inserted?.user_email === "anonymous",
    `status=${out.statusCode} insertCalls=${insertCalls} — the public escape hatch is broken, ` +
      `which is worse than the hole this file exists to close`
  );
}

// ── E ── api/notify.js refuses to mail an anonymous row ──────────────────────
{
  const { res, out } = makeRes();
  await notify(
    {
      method: "POST",
      headers: { origin: "https://swing-edge.com", authorization: "Bearer stub-admin-jwt" },
      body: { feedback_id: FEEDBACK_ID, template: "files_received" },
    },
    res
  );
  check(
    "E",
    'notify refuses user_email="anonymous" before any send',
    out.statusCode === 400 && out.body?.error === "feedback_has_no_valid_email",
    `status=${out.statusCode} body=${JSON.stringify(out.body)} — an anonymous row must not ` +
      `reach the transporter`
  );
}

globalThis.fetch = realFetch;

if (failures.length > 0) {
  console.error(
    `❌ feedback-identity: ${failures.length}/${ran} assertions failed (${failures.join(", ")}).`
  );
  process.exit(1);
}
console.log(`✅ feedback-identity: ${ran}/${ran} assertions passed.`);
