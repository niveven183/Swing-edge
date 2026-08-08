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
// FREE TEXT (12-23). Two frozen templates served seven kinds of event, so every
// letter had to stay vague. The skeleton+core design fixes that and introduces
// three new ways to fail, each with its own group here.
//   · The core is admin keystrokes rendered into an HTML document that reaches a
//     real inbox — 12 and 20 are the escaping and the injection mechanics.
//     13, 14, 22, 23 are the contract around it (required, capped, advertised,
//     and present in the file).
//   · campaign="reply:<id>" allowed exactly one reply per feedback, forever,
//     which the new model contradicts on purpose ("in progress" today, "fixed"
//     next week). 16-19 cover the counter, its back-compat, and the duplicate
//     protection that a server-derived n does NOT provide by itself.
//   · The dry run used to verify a frozen FILE; now it verifies a STRING. 21 is
//     the revocation that keeps preview and delivery the same letter.
// 15 is the opposite guard, like 9: it passes before and after, and exists to
// fail the day the two frozen templates are touched.
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
  "body-jwt": "bbbbbbbb-8888-4888-8888-888888888888",
  "frozen-jwt": "cccccccc-9999-4999-8999-999999999999",
  "ledger-jwt": "dddddddd-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  "dup-jwt": "eeeeeeee-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
};

let isAdminAnswer = true;

// The ledger the stub serves. Default [] keeps 1-11 byte-identical to before the
// reply-counter existed; 16-19 set it per scenario and reset it after.
let ledgerRows = [];

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
  if (u.includes("/email_campaign_log")) return jsonResponse(ledgerRows);

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

// Derived, never listed. 1-11 predate {{BODY}} and must keep exercising a
// template that needs no core text — naming one by hand would break the moment
// the allowlist is reordered, and 6 exists precisely to forbid a second copy of
// these names. On the pre-{{BODY}} code `body` is undefined everywhere, so
// FROZEN_KEYS is the whole allowlist and 1-11 behave exactly as they did.
const FROZEN_KEYS = TEMPLATES ? Object.keys(TEMPLATES).filter((k) => !TEMPLATES[k].body) : [];
const BODY_KEYS = TEMPLATES ? Object.keys(TEMPLATES).filter((k) => TEMPLATES[k].body) : [];
const FROZEN = FROZEN_KEYS[0] || TEMPLATE_KEYS?.[0] || "files_received";
const WITH_BODY = BODY_KEYS[0] || "";

let gate = null;
let gateError = "";
try {
  gate = await import("../src/lib/replyGate.js");
} catch (e) {
  gateError = e?.message || String(e);
}

// The campaign-key parser, shared verbatim by api/notify.js (which derives n)
// and AdminPanel.jsx (which renders the count). It lives in api/_lib next to
// cors.js and rateLimit.js because that directory is already proven to bundle
// into the serverless function, while `npm run build` proves the client half.
let ledgerLib = null;
let ledgerError = "";
try {
  ledgerLib = await import("../api/_lib/replyLedger.js");
} catch (e) {
  ledgerError = e?.message || String(e);
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
    body: { feedback_id: FEEDBACK_ID, template: FROZEN, dry_run: true },
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
    body: { feedback_id: FEEDBACK_ID, template: FROZEN, dry_run: true },
  });

// A send ATTEMPT: spends the send budget and dies at the row lookup (404).
// dry_run is omitted entirely, not set to false — that is what a caller who
// never heard of the flag looks like, and it must count as a send.
const sendAttempt = (token) =>
  call(notify, {
    method: "POST",
    token,
    body: { feedback_id: MISSING_ID, template: FROZEN },
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

// ── shared helper for 12-20 ─────────────────────────────────────────────────
// A preview of a template that carries admin-written core text. Never a send:
// dry_run:true returns before the transporter exists.
const dryBody = (token, template, body_text) =>
  call(notify, {
    method: "POST",
    token,
    body: { feedback_id: FEEDBACK_ID, template, dry_run: true, ...(body_text === undefined ? {} : { body_text }) },
  });

// ── 12 ── admin text is DATA, never markup ──────────────────────────────────
{
  ledgerRows = [];
  const out = await dryBody("body-jwt", WITH_BODY, 'שלום <script>alert(1)</script> & "ציטוט"');
  const html = String(out.body?.html || "");
  check(
    "12",
    "body_text containing <script> is escaped into text, not injected as a tag",
    out.statusCode === 200 &&
      html.includes("&lt;script&gt;") &&
      !html.includes("<script") &&
      html.includes("&amp;") &&
      !html.includes("{{BODY}}"),
    `status=${out.statusCode} error=${out.body?.error} has_escaped=${html.includes("&lt;script&gt;")} ` +
      `has_raw_tag=${html.includes("<script")} placeholder_left=${html.includes("{{BODY}}")} — this is the ` +
      `single largest new surface in the whole wave: the admin's keystrokes land inside a branded ` +
      `HTML document that goes to a real inbox. Escaping is not a nicety here, it is the feature`
  );
}

// ── 13 ── a skeleton without its core is an empty letter ────────────────────
{
  const missing = await dryBody("body-jwt", WITH_BODY, undefined);
  const blank = await dryBody("body-jwt", WITH_BODY, "   \n\n  ");
  check(
    "13",
    "a body-carrying template without body_text → 400 body_text_required",
    missing.statusCode === 400 &&
      missing.body?.error === "body_text_required" &&
      blank.statusCode === 400 &&
      blank.body?.error === "body_text_required",
    `missing=${missing.statusCode}/${missing.body?.error} whitespace_only=${blank.statusCode}/${blank.body?.error} — ` +
      `silently sending the skeleton with a hole in it is the shape of failure this endpoint ` +
      `exists to prevent: the recipient gets a branded email that says nothing`
  );
}

// ── 14 ── the cap, on both sides ────────────────────────────────────────────
{
  const at = "א".repeat(2000);
  const over = "א".repeat(2001);
  const ok = await dryBody("body-jwt", WITH_BODY, at);
  const tooLong = await dryBody("body-jwt", WITH_BODY, over);
  check(
    "14",
    "body_text of 2000 passes, 2001 → 400 body_text_too_long",
    ok.statusCode === 200 &&
      ok.body?.dry_run === true &&
      tooLong.statusCode === 400 &&
      tooLong.body?.error === "body_text_too_long",
    `at_2000=${ok.statusCode}/${ok.body?.error} at_2001=${tooLong.statusCode}/${tooLong.body?.error} — ` +
      `both directions are load-bearing. A cap that also rejects 2000 would have blocked the real ` +
      `07.08 reply (~900 chars of core); no cap at all lets a paste run past Gmail's ~102KB clip`
  );
}

// ── 15 ── ⛔ THE TWO FROZEN TEMPLATES DO NOT MOVE ───────────────────────────
// Passes before AND after the wave, deliberately — like 9, it is a guard, not a
// discovery. Byte equality with the file on disk is the assertion: "still 200"
// would also hold for a template that silently grew a body slot.
{
  const perKey = [];
  for (const k of FROZEN_KEYS) {
    const out = await dryBody("frozen-jwt", k, undefined);
    const onDisk = Buffer.byteLength(fs.readFileSync(path.join(process.cwd(), TEMPLATES[k].file), "utf-8"), "utf8");
    perKey.push({ k, status: out.statusCode, got: out.body?.html_bytes, onDisk });
  }
  const withBody = await dryBody("frozen-jwt", FROZEN, "ליבה שאיש לא ביקש");
  check(
    "15",
    "the frozen templates still render byte-for-byte, and reject a core they have no slot for",
    FROZEN_KEYS.length >= 2 &&
      perKey.every((p) => p.status === 200 && p.got === p.onDisk) &&
      withBody.statusCode === 400 &&
      withBody.body?.error === "body_text_not_supported",
    `frozen=${JSON.stringify(perKey)} with_body=${withBody.statusCode}/${withBody.body?.error} — ` +
      `fix_mobile_upload is still the open OCR bug's only written answer and files_received already ` +
      `went to a real person. ⚠️ 400 (not silent ignore) on the last one: an admin who typed a core ` +
      `and picked a frozen template would otherwise send an email missing everything they wrote`
  );
}

// ── 16 ── back-compat: a pre-counter ledger row is n=1 ──────────────────────
{
  ledgerRows = [{ campaign: `reply:${FEEDBACK_ID}`, status: "sent", sent_at: "2026-08-07T12:06:00Z" }];
  const out = await dryBody("ledger-jwt", WITH_BODY, "המשך לתשובה הראשונה");
  const parsed = ledgerLib ? ledgerLib.parseCampaign(`reply:${FEEDBACK_ID}`) : null;
  ledgerRows = [];
  check(
    "16",
    "an old reply:<id> row counts as n=1, so the next reply is n=2",
    !!ledgerLib &&
      parsed?.id === FEEDBACK_ID &&
      parsed?.n === 1 &&
      out.statusCode === 200 &&
      new RegExp(`^reply:${FEEDBACK_ID}:2:[0-9a-f]{8}$`).test(String(out.body?.campaign || "")),
    `lib=${ledgerLib ? "loaded" : `MISSING (${ledgerError})`} parsed=${JSON.stringify(parsed)} ` +
      `campaign=${out.body?.campaign} status=${out.statusCode} — the two rows written on 07.08 ` +
      `(reply:eebd6bb1…, reply:f95b837e…) carry no :n. Reading them as anything but n=1 either ` +
      `re-uses a key that is already taken or makes the second reply look like the first`
  );
}

// ── 17 ── n is monotonic, and a failed send still burns its number ──────────
{
  ledgerRows = [
    { campaign: `reply:${FEEDBACK_ID}:1:aaaaaaaa`, status: "sent", sent_at: "2026-08-07T12:06:00Z" },
    { campaign: `reply:${FEEDBACK_ID}:2:bbbbbbbb`, status: "failed", sent_at: "2026-08-07T19:09:00Z" },
  ];
  const out = await dryBody("ledger-jwt", WITH_BODY, "תשובה שלישית");
  ledgerRows = [];
  check(
    "17",
    "max(n)+1 is derived server-side, and a failed row consumes its n",
    out.statusCode === 200 &&
      new RegExp(`^reply:${FEEDBACK_ID}:3:[0-9a-f]{8}$`).test(String(out.body?.campaign || "")),
    `campaign=${out.body?.campaign} expected reply:<id>:3:<h8> — n is an IDENTITY, not a success ` +
      `count. Re-using the number of a failed attempt would put two different letters under one key, ` +
      `and the ledger is the only record of what a user was actually told`
  );
}

// ── 18 ── the panel must keep showing the two replies already sent ──────────
// The 07.08 rows are `reply:<uuid>` with no suffix. The ids below reproduce
// their SHAPE (the 8-char prefixes are the real ones from docs/STATE.md); the
// shape is what the parser sees and what would have broken.
{
  const EE = "eebd6bb1-0000-4000-8000-000000000000";
  const F9 = "f95b837e-0000-4000-8000-000000000000";
  const rows = [
    { campaign: `reply:${EE}`, status: "sent", sent_at: "2026-08-07T12:06:00Z" },
    { campaign: `reply:${F9}`, status: "sent", sent_at: "2026-08-07T19:09:00Z" },
    { campaign: `reply:${FEEDBACK_ID}:1:aaaaaaaa`, status: "sent", sent_at: "2026-08-08T09:00:00Z" },
    { campaign: `reply:${FEEDBACK_ID}:2:bbbbbbbb`, status: "sent", sent_at: "2026-08-08T10:00:00Z" },
    { campaign: "why_stopped", status: "sent", sent_at: "2026-08-01T00:00:00Z" },
  ];
  const s = ledgerLib ? ledgerLib.summarize(rows) : null;
  check(
    "18",
    "summarize maps old and new rows alike, counts repeats, and ignores non-reply campaigns",
    !!s &&
      s[EE]?.count === 1 &&
      s[EE]?.lastSentAt === "2026-08-07T12:06:00Z" &&
      s[F9]?.count === 1 &&
      s[FEEDBACK_ID]?.count === 2 &&
      s[FEEDBACK_ID]?.lastSentAt === "2026-08-08T10:00:00Z" &&
      !("why_stopped" in s) &&
      Object.keys(s).length === 3,
    `lib=${ledgerLib ? "loaded" : `MISSING (${ledgerError})`} summary=${JSON.stringify(s)} — ` +
      `AdminPanel.jsx did this with slice("reply:".length), which under the new key returns ` +
      `"<id>:2" and matches no feedback row. The two replies already sent would have vanished from ` +
      `the panel with no error anywhere: exactly the silent-failure class this repo forbids`
  );
}

// ── 19 ── the counter must not become a licence to send the same letter twice ─
{
  ledgerRows = [];
  const first = await dryBody("dup-jwt", WITH_BODY, "אותו תוכן בדיוק");
  const key = String(first.body?.campaign || "");
  // The fingerprint is never recomputed here — the test replays the key the
  // server itself produced. A test that re-implements the hash asserts its own
  // arithmetic, not the server's.
  ledgerRows = [{ campaign: key, status: "sent", sent_at: "2026-08-08T10:00:00Z" }];
  const same = await dryBody("dup-jwt", WITH_BODY, "אותו תוכן בדיוק");
  const other = await dryBody("dup-jwt", WITH_BODY, "תוכן אחר לגמרי");
  ledgerRows = [];
  check(
    "19",
    "identical template+body is blocked; a different body is a legitimate next reply",
    first.statusCode === 200 &&
      /:1:[0-9a-f]{8}$/.test(key) &&
      same.statusCode === 200 &&
      same.body?.reason === "already_sent" &&
      other.statusCode === 200 &&
      other.body?.dry_run === true &&
      /:2:[0-9a-f]{8}$/.test(String(other.body?.campaign || "")),
    `first=${key} same=${JSON.stringify(same.body)} other=${other.body?.campaign} — a server-derived ` +
      `monotonic n can never repeat, so reply:<id>:<n> ALONE would have removed the only duplicate ` +
      `protection that existed and put nothing in its place: two clicks, two identical emails. ` +
      `The content fingerprint is what makes "next reply" and "same reply" different things`
  );
}

// ── 20 ── the replacement string is not a template language ─────────────────
{
  const out = await dryBody("body-jwt", WITH_BODY, "עלות $& ואז $` ואז $'");
  const html = String(out.body?.html || "");
  const doctypes = (html.match(/<!DOCTYPE/gi) || []).length;
  check(
    "20",
    "body_text containing $& / $` / $' lands literally",
    out.statusCode === 200 &&
      html.includes("$&amp;") &&
      html.includes("$`") &&
      !html.includes("{{BODY}}") &&
      doctypes === 1,
    `status=${out.statusCode} has_dollar_amp=${html.includes("$&amp;")} placeholder_left=${html.includes("{{BODY}}")} ` +
      `doctype_count=${doctypes} — String.replace with a STRING replacement interprets $&, $\` and $'. ` +
      `The first re-inserts "{{BODY}}" into the letter and the second inlines the entire document ` +
      `prefix. The injection must use a function replacer`
  );
}

// ── 21 ── editing the core after a clean dry run revokes the send ───────────
{
  if (!gate) {
    check("21", "editing body_text revokes the dry-run approval", false, `src/lib/replyGate.js did not load: ${gateError}`);
  } else {
    const { initialState, reduce, canCheck, canSend } = gate;
    const s1 = reduce(initialState(), { type: "template", key: WITH_BODY || "x", bodyRequired: true });
    const s2 = reduce(s1, { type: "body", text: "ליבה" });
    const s3 = reduce(reduce(s2, { type: "checking" }), { type: "checked", ok: true, payload: { dry_run: true } });
    const s4 = reduce(s3, { type: "body", text: "ליבה ערוכה" });
    check(
      "21",
      "a required-but-empty core blocks the dry run, and editing it after verification blocks the send",
      canCheck(s1) === false &&
        canCheck(s2) === true &&
        canSend(s3) === true &&
        canSend(s4) === false,
      `empty_core_can_check=${canCheck(s1)} filled_can_check=${canCheck(s2)} verified_can_send=${canSend(s3)} ` +
        `after_edit_can_send=${canSend(s4)} — with frozen templates the dry run verified a file. With free ` +
        `text it verifies a STRING, so any edit after it must revoke it exactly the way a template ` +
        `switch does. Otherwise the preview shows one letter and the send delivers another`
    );
  }
}

// ── 22 ── the picker learns which templates need a core, from the server ────
{
  const out = await call(notify, { method: "GET", token: "admin-jwt" });
  const list = Array.isArray(out.body?.templates) ? out.body.templates : [];
  const byKey = Object.fromEntries(list.map((t) => [t.key, t]));
  const serialized = JSON.stringify(out.body || {});
  check(
    "22",
    "GET carries a body flag for every template and still leaks no HTML",
    out.statusCode === 200 &&
      list.length === (TEMPLATE_KEYS?.length || 0) &&
      list.every((t) => typeof t.body === "boolean") &&
      BODY_KEYS.every((k) => byKey[k]?.body === true) &&
      FROZEN_KEYS.every((k) => byKey[k]?.body === false) &&
      !serialized.includes("<") &&
      !/\.html/.test(serialized),
    `status=${out.statusCode} flags=${JSON.stringify(list.map((t) => [t.key, t.body]))} — the panel must ` +
      `not decide for itself which templates take a core. That is the same second copy 6 and 7 forbid, ` +
      `and it fails in the worst direction: a textarea that never appears for a template that requires one`
  );
}

// ── 23 ── the skeletons on disk actually have a slot ────────────────────────
{
  const bad = [];
  for (const k of BODY_KEYS) {
    const src = fs.readFileSync(path.join(process.cwd(), TEMPLATES[k].file), "utf-8");
    const slots = (src.match(/\{\{BODY\}\}/g) || []).length;
    if (slots !== 1) bad.push(`${k}:slots=${slots}`);
    if (!/dir="rtl"/.test(src)) bad.push(`${k}:not-rtl`);
    if (!src.includes("#00C076")) bad.push(`${k}:unbranded`);
  }
  for (const k of FROZEN_KEYS) {
    const src = fs.readFileSync(path.join(process.cwd(), TEMPLATES[k].file), "utf-8");
    if (/\{\{BODY\}\}/.test(src)) bad.push(`${k}:frozen-template-grew-a-slot`);
  }
  const thanks = BODY_KEYS.find((k) => k.includes("thanks"));
  const thanksSrc = thanks ? fs.readFileSync(path.join(process.cwd(), TEMPLATES[thanks].file), "utf-8") : "";
  check(
    "23",
    "all 7 skeletons carry exactly one {{BODY}}, are RTL and branded; reply_thanks asks for nothing",
    BODY_KEYS.length === 7 && bad.length === 0 && !!thanks && !thanksSrc.includes("utm_campaign"),
    `body_templates=${BODY_KEYS.length} (expected 7) problems=${JSON.stringify(bad)} ` +
      `thanks_has_cta=${thanksSrc.includes("utm_campaign")} — a skeleton whose slot was renamed or ` +
      `deleted still renders and still sends: the admin's text simply never appears. And a "thank you" ` +
      `that also asks for something is the mail people learn to stop opening`
  );
}

console.log(`\n${ran - failures.length}/${ran} passed`);
if (failures.length) {
  console.error(`FAILED: ${failures.join(", ")}`);
  process.exit(1);
}
