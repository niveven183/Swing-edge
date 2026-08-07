// scripts/notify-handle-test.mjs — the handle on /api/notify, and the two ways
// it can rot.
//
// WHY THIS EXISTS. /api/notify shipped in U with a complete send engine and zero
// call sites: every reply still went through Niv, DevTools and Gmail by hand.
// Building the handle introduces two failure modes that no other test covers.
//
// DRIFT (1, 2, 3, 6, 7). The template allowlist in api/notify.js is the only
// place a template may be named. The moment the UI holds a second copy, the two
// disagree — and they disagree silently, because a template that exists in one
// and not the other simply never appears. 3 catches GET drifting from TEMPLATES;
// 6 catches a hardcoded name in the panel; 7 catches the reverse direction Niv
// named: a template added to notify.js that a client-side filter would swallow
// before it ever reached the picker.
//
// SELF-BLOCKING (4). The POST limiter is 3/10min keyed on user id. If GET shares
// that key, opening the panel three times spends the whole send budget for ten
// minutes and the handle jams itself shut — with no error, because a 429 on a
// list request looks like nothing at all. 4 is the assertion that keeps the
// budget for sends.
//
// GATE (5). "Send is unreachable before a clean dry run" is the human
// verification point the entire endpoint was designed around (api/notify.js
// :113-117 — feedback.user_email is caller-asserted on pre-S2 rows). It lives in
// src/lib/replyGate.js as a pure module precisely so it can be asserted HERE, in
// the blocking chain: AdminPanel.jsx cannot be imported by node (it pulls
// recharts, lucide and supabaseClient), and test:smoke is not in `verify`.
//
// BUDGET (8, 9, 10, 11). The dry run is the mandatory gate before a send, and it
// shared a rate-limit key with the send itself: three previews spent the whole
// 3/10min allowance and the real send answered 429. A gate that closes itself is
// not a gate — it happened in production on 2026-08-07. 8 is the fourth preview
// in a row; 10 and 11 are the two directions of the leak (dry must not spend the
// send budget, send must not spend the dry budget). 9 is the opposite guard: it
// passes before AND after, and exists to fail the day someone widens the SEND
// quota — the one number that protects a real person's inbox.
//
// ⛔ THIS FILE MUST NEVER BE ABLE TO SEND MAIL TO A REAL PERSON.
//    Two shapes of POST appear below, and neither can reach the transporter:
//      · dry_run:true  → returns at api/notify.js:318-330, before createTransport.
//      · dry_run:false → carries MISSING_ID, a well-formed uuid that is absent
//        from the stubbed feedback list, so the handler answers 404 at :288 —
//        45 lines before the transporter is built at :333.
//    Backed by two more layers: MAIL_USERNAME/MAIL_PASSWORD are unset here, and
//    globalThis.fetch is stubbed to throw on any unrecognised URL.
//    ⚠️ A dry_run:false POST must never name a feedback id the stub RESOLVES.
//
//   node scripts/notify-handle-test.mjs

import fs from "fs";
import path from "path";

process.env.VITE_SUPABASE_URL = "https://stub.supabase.co";
process.env.VITE_SUPABASE_ANON_KEY = "stub-anon-key";
process.env.SUPABASE_URL = "https://stub.supabase.co";
process.env.SUPABASE_ANON_KEY = "stub-anon-key";

const FEEDBACK_ID = "44444444-4444-4444-8444-444444444444";
const RECIPIENT = "someone@example.com";

// Well-formed but absent from the stubbed feedback list. 8-11 use it to spend
// the SEND budget without a send: the handler answers 404 at api/notify.js:288,
// and the transporter is not constructed until :333. See the ⛔ note above.
const MISSING_ID = "55555555-5555-4555-8555-555555555555";

// Distinct tokens → distinct user ids → distinct rate-limit buckets. The limiter
// is module-level state shared by every call in this file, so scenarios that do
// not mean to interact must not collide in it.
const TOKENS = {
  "admin-jwt": "aaaaaaaa-1111-4111-8111-111111111111",
  "plain-jwt": "bbbbbbbb-2222-4222-8222-222222222222",
  "budget-jwt": "cccccccc-3333-4333-8333-333333333333",
  "dry4-jwt": "dddddddd-4444-4444-8444-444444444444",
  "send4-jwt": "eeeeeeee-5555-4555-8555-555555555555",
  "dry2send-jwt": "ffffffff-6666-4666-8666-666666666666",
  "send2dry-jwt": "aaaaaaaa-7777-4777-8777-777777777777",
};

let isAdminAnswer = true;

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);

  if (u.includes("/auth/v1/user")) {
    const auth = String(opts.headers?.Authorization || "");
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    const uid = TOKENS[token];
    return uid ? jsonResponse({ id: uid, email: `${token}@example.com` }) : jsonResponse({ error: "bad token" }, 401);
  }
  if (u.includes("/rpc/is_admin")) return jsonResponse(isAdminAnswer);
  if (u.includes("/rpc/admin_feedback_list")) {
    return jsonResponse([{ id: FEEDBACK_ID, user_email: RECIPIENT, type: "bug", status: "new" }]);
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

async function call(handler, { method, token, body }) {
  const headers = { origin: "https://swing-edge.com", "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  const { res, out } = makeRes();
  await handler({ method, headers, body }, res);
  return out;
}

// Namespace import, not a named one: before api/notify.js exports TEMPLATES a
// named import is a link-time SyntaxError that takes the whole file down, and a
// baseline nobody can run is not a baseline.
const notifyMod = await import("../api/notify.js");
const notify = notifyMod.default;
const TEMPLATES = notifyMod.TEMPLATES;
const TEMPLATE_KEYS = TEMPLATES ? Object.keys(TEMPLATES) : null;

let gate = null;
let gateError = "";
try {
  gate = await import("../src/lib/replyGate.js");
} catch (e) {
  gateError = e?.message || String(e);
}

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

// ── 1 ── GET without a token ────────────────────────────────────────────────
{
  const out = await call(notify, { method: "GET" });
  check(
    "1",
    "GET without a token → 401",
    out.statusCode === 401 && out.body?.error === "unauthorized",
    `status=${out.statusCode} body=${JSON.stringify(out.body)} — a method check that ` +
      `runs before the auth check answers 405 and tells an anonymous caller which ` +
      `verbs exist instead of refusing them`
  );
}

// ── 2 ── GET with a valid, non-admin token ──────────────────────────────────
{
  isAdminAnswer = false;
  const out = await call(notify, { method: "GET", token: "plain-jwt" });
  check(
    "2",
    "GET with a non-admin token → 403",
    out.statusCode === 403 && out.body?.error === "forbidden",
    `status=${out.statusCode} body=${JSON.stringify(out.body)} — the template list is ` +
      `behind the same is_admin gate as the send, or it is not behind a gate at all`
  );
  isAdminAnswer = true;
}

// ── 3 ── the list is exactly the allowlist, and carries nothing else ────────
{
  const out = await call(notify, { method: "GET", token: "admin-jwt" });
  const returned = Array.isArray(out.body?.templates) ? out.body.templates : null;
  const keys = returned ? returned.map((t) => t.key) : null;
  const serialized = JSON.stringify(out.body || {});
  const leaksFile = /\.html/.test(serialized);
  const leaksHtml = serialized.includes("<");
  const subjectsPresent =
    !!returned && returned.every((t) => typeof t.subject === "string" && t.subject.length > 0);

  check(
    "3",
    "GET(admin) → keys are exactly Object.keys(TEMPLATES), subjects only, no file and no HTML",
    out.statusCode === 200 &&
      !!TEMPLATE_KEYS &&
      !!keys &&
      keys.length === TEMPLATE_KEYS.length &&
      TEMPLATE_KEYS.every((k) => keys.includes(k)) &&
      subjectsPresent &&
      !leaksFile &&
      !leaksHtml,
    `status=${out.statusCode} exported_TEMPLATES=${TEMPLATE_KEYS ? "yes" : "no (api/notify.js does not export it)"} ` +
      `returned=${JSON.stringify(keys)} expected=${JSON.stringify(TEMPLATE_KEYS)} ` +
      `leaks_file=${leaksFile} leaks_html=${leaksHtml}`
  );
}

// ── 4 ── listing must not spend the send budget ─────────────────────────────
{
  const statuses = [];
  for (let i = 0; i < 5; i++) {
    const out = await call(notify, { method: "GET", token: "budget-jwt" });
    statuses.push(out.statusCode);
  }
  const post = await call(notify, {
    method: "POST",
    token: "budget-jwt",
    body: { feedback_id: FEEDBACK_ID, template: TEMPLATE_KEYS?.[0] || "files_received", dry_run: true },
  });
  check(
    "4",
    "5×GET all 200, and a dry run afterwards is not rate limited",
    statuses.every((s) => s === 200) && post.statusCode !== 429,
    `GET statuses=${JSON.stringify(statuses)} dry_run status=${post.statusCode} ` +
      `body=${JSON.stringify(post.body)} — GET sharing the POST limiter key means opening ` +
      `the panel three times jams the handle shut for ten minutes, silently`
  );
}

// ── 5 ── send is unreachable until a clean dry run for THIS template ────────
{
  if (!gate) {
    check("5", "replyGate blocks send before a clean dry run", false, `src/lib/replyGate.js did not load: ${gateError}`);
  } else {
    const { initialState, reduce, canSend } = gate;
    const key = TEMPLATE_KEYS?.[0] || "files_received";
    const other = TEMPLATE_KEYS?.[1] || "fix_mobile_upload";

    const s0 = initialState();
    const s1 = reduce(s0, { type: "template", key });
    const s2 = reduce(s1, { type: "checking" });
    const s3 = reduce(s2, { type: "checked", ok: true, payload: { dry_run: true, subject: "x" } });
    const s4 = reduce(s3, { type: "template", key: other });
    const sErr = reduce(reduce(s1, { type: "checking" }), { type: "checked", ok: false, error: "boom" });
    const sDup = reduce(
      reduce(s1, { type: "checking" }),
      { type: "checked", ok: true, payload: { sent: 0, reason: "already_sent" } }
    );

    check(
      "5",
      "canSend only after a clean dry run, and switching template revokes it",
      canSend(s0) === false &&
        canSend(s1) === false &&
        canSend(s2) === false &&
        canSend(s3) === true &&
        canSend(s4) === false &&
        canSend(sErr) === false &&
        canSend(sDup) === false,
      `idle=${canSend(s0)} picked=${canSend(s1)} checking=${canSend(s2)} verified=${canSend(s3)} ` +
        `switched=${canSend(s4)} errored=${canSend(sErr)} already_sent=${canSend(sDup)} — ` +
        `a dry run on one template must never license a send of another`
    );
  }
}

// ── 6 ── the panel names no template ────────────────────────────────────────
{
  const src = fs.readFileSync(path.join(process.cwd(), "src/components/AdminPanel.jsx"), "utf-8");
  const found = TEMPLATE_KEYS ? TEMPLATE_KEYS.filter((k) => src.includes(k)) : null;
  check(
    "6",
    "AdminPanel.jsx contains no template key — the list comes from GET or not at all",
    !!TEMPLATE_KEYS && found.length === 0,
    `exported_TEMPLATES=${TEMPLATE_KEYS ? "yes" : "no"} found_in_panel=${JSON.stringify(found)} — ` +
      `a hardcoded name is the second copy this endpoint exists to prevent`
  );
}

// ── 7 ── the picker passes through what the server sent, unfiltered ─────────
{
  if (!gate) {
    check("7", "templatesFrom does not filter the server's list", false, `src/lib/replyGate.js did not load: ${gateError}`);
  } else {
    const { templatesFrom } = gate;
    const synthetic = { key: "a_template_added_later", subject: "נוסחה חדשה" };
    const serverSaid = [
      ...(TEMPLATE_KEYS || ["files_received"]).map((k) => ({ key: k, subject: "s" })),
      synthetic,
    ];
    const got = templatesFrom({ templates: serverSaid });
    const gotKeys = Array.isArray(got) ? got.map((t) => t.key) : null;
    check(
      "7",
      "a template added to notify.js reaches the picker — no client-side allowlist",
      !!gotKeys && gotKeys.length === serverSaid.length && gotKeys.includes(synthetic.key),
      `server sent ${serverSaid.length} → picker got ${JSON.stringify(gotKeys)} — dropping the ` +
        `synthetic key means the UI holds its own allowlist, which is the drift in the ` +
        `opposite direction to 6 and just as silent`
    );
  }
}

// ── shared helpers for 8-11 ─────────────────────────────────────────────────
// A preview: resolves a real feedback row and returns 200 {dry_run:true}.
const dryRun = (token) =>
  call(notify, {
    method: "POST",
    token,
    body: { feedback_id: FEEDBACK_ID, template: TEMPLATE_KEYS?.[0] || "files_received", dry_run: true },
  });

// A send ATTEMPT: spends the send budget and dies at the row lookup (404).
// dry_run is omitted entirely, not set to false — that is what a caller who
// never heard of the flag looks like, and it must count as a send.
const sendAttempt = (token) =>
  call(notify, {
    method: "POST",
    token,
    body: { feedback_id: MISSING_ID, template: TEMPLATE_KEYS?.[0] || "files_received" },
  });

// ── 8 ── a fourth preview in a row is still a preview ───────────────────────
{
  const outs = [];
  for (let i = 0; i < 4; i++) outs.push(await dryRun("dry4-jwt"));
  const statuses = outs.map((o) => o.statusCode);
  const flags = outs.map((o) => o.body?.dry_run === true);
  check(
    "8",
    "4 consecutive dry runs → all 200 and all dry_run:true",
    statuses.every((s) => s === 200) && flags.every(Boolean),
    `statuses=${JSON.stringify(statuses)} dry_run_flags=${JSON.stringify(flags)} ` +
      `last_body=${JSON.stringify(outs[3].body)} — the dry run is the MANDATORY gate before a ` +
      `send. Sharing the send's 3/10min key means the fourth preview answers 429 and the ` +
      `admin cannot reach the send at all. Asserting 200+dry_run:true, not merely "not 429", ` +
      `so a 500 from an unreadable template cannot pass this vacuously`
  );
}

// ── 9 ── the SEND quota is 3/10min and stays there ──────────────────────────
{
  const statuses = [];
  for (let i = 0; i < 4; i++) statuses.push((await sendAttempt("send4-jwt")).statusCode);
  check(
    "9",
    "sends 1-3 reach the lookup (404), the 4th in 10 minutes → 429",
    statuses[0] === 404 && statuses[1] === 404 && statuses[2] === 404 && statuses[3] === 429,
    `statuses=${JSON.stringify(statuses)} expected=[404,404,404,429] — this one passes BEFORE ` +
      `and AFTER the dry/send split; it exists to fail the day the SEND quota is widened. ` +
      `The three 404s are load-bearing: they prove each request actually spent the budget ` +
      `instead of being turned away early, which would make the 429 vacuous`
  );
}

// ── 10 ── previews must not spend the send budget ───────────────────────────
{
  for (let i = 0; i < 5; i++) await dryRun("dry2send-jwt");
  const out = await sendAttempt("dry2send-jwt");
  check(
    "10",
    "5 dry runs then a send → the send is NOT rate limited",
    out.statusCode === 404,
    `send status=${out.statusCode} body=${JSON.stringify(out.body)} expected=404 — this is the ` +
      `production failure of 2026-08-07: previewing before sending consumed the send allowance ` +
      `and the real email answered 429. 404 (not 200) is the pass: the send path was entered ` +
      `and died at the row lookup, well before any transporter`
  );
}

// ── 11 ── sends must not spend the preview budget ───────────────────────────
{
  for (let i = 0; i < 3; i++) await sendAttempt("send2dry-jwt");
  const out = await dryRun("send2dry-jwt");
  check(
    "11",
    "3 sends then a dry run → the dry run is NOT rate limited",
    out.statusCode === 200 && out.body?.dry_run === true,
    `dry status=${out.statusCode} body=${JSON.stringify(out.body)} — the leak in the other ` +
      `direction. If a send spends the preview budget, exhausting the send quota also blinds ` +
      `the admin: no preview, so no way to check who the next email would even go to`
  );
}

console.log(`\n${ran - failures.length}/${ran} passed`);
if (failures.length) {
  console.error(`FAILED: ${failures.join(", ")}`);
  process.exit(1);
}
