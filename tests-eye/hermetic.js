// tests-eye/hermetic.js — a STATEFUL synthetic Supabase for the red-before arm
// (`scripts/eye-playbook-probe.mjs`). Same idea as `scripts/eye-probe.mjs`: the app is
// built against a synthetic origin, every request to it is fulfilled here, so the probe
// needs zero secrets and can never reach the QA row.
//
// ⚠️ STATEFUL, unlike eye-probe's: C-064 is about what SURVIVES A RELOAD, so the blob the
// app upserts must come back on the next GET, and an inserted trade must come back from the
// journal load. A stateless mock would make every reload step measure the mock.

export const SB_HOST = process.env.EYE_SB_HOST || "eyeplaybook.supabase.co";
export const USER_ID = "00000000-0000-4000-8000-0000000000c6";
export const DUMMY_EMAIL = "qa@eye-playbook.invalid"; // RFC 2606
export const DUMMY_PASSWORD = "eye-playbook-not-a-secret";

const b64url = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
function session() {
  const now = Math.floor(Date.now() / 1000);
  const user = {
    id: USER_ID, aud: "authenticated", role: "authenticated", email: DUMMY_EMAIL,
    app_metadata: { provider: "email" }, user_metadata: {}, created_at: new Date(0).toISOString(),
  };
  return {
    access_token: [b64url({ alg: "HS256", typ: "JWT" }), b64url({ sub: USER_ID, aud: "authenticated", role: "authenticated", iat: now, exp: now + 3600, email: DUMMY_EMAIL }), "not-a-signature"].join("."),
    token_type: "bearer", expires_in: 3600, expires_at: now + 3600, refresh_token: "eye-playbook-refresh", user,
  };
}

// The row a returning, onboarded user has — so the questionnaire, the tour and the beta
// welcome never sit on top of the Playbook panel.
export const SEED_SETTINGS = {
  capital: 10000,
  riskPct: 1,
  // USD capital + a USD ticker ⇒ the identity rate: no /api/fx round trip can hold the
  // submit gate (B-376) shut in a build that has no API behind it.
  accountCurrency: "USD",
  capitalCurrency: "USD",
  tourDone: true,
  betaWelcome: true,
  welcomeSeen: true,
  onboarding: { completed: true, answers: {}, profile: {}, completedAt: "2026-01-01T00:00:00.000Z" },
};

/** One store per test — reloads inside a test see it, the next test starts clean. */
export function newStore() {
  const settings = structuredClone(SEED_SETTINGS);
  // B-300 — `EYE_CCY=ILS` seeds the population the QA row actually has (a ₪ capital). The
  // default stays USD so every other arm is byte-identical.
  if (process.env.EYE_CCY === "ILS") { settings.capitalCurrency = "ILS"; settings.accountCurrency = "ILS"; }
  // B-435 · CAS (17.10): a real row ALWAYS carries `updated_at` (NOT NULL, default now()). A seed without one made
  // every load read «no version» ⇒ every write an INSERT ⇒ 409 ⇒ conflict — a state production cannot reach.
  return { settings, updatedAt: SEED_TOKEN, trades: process.env.EYE_SEED_HISTORY === "1" ? seedHistory() : [], ocrCalls: 0 };
}
export const SEED_TOKEN = "2026-01-01T00:00:00.123456+00:00"; // µs, like a row written by the column default

// ── B-435 · CAS (17.10) — the synthetic server behaves like PostgREST on user_settings ─────────────────────
// · tokens are compared as INSTANTS and returned in PG's text form (`…+00:00`, trailing zeros trimmed) — an
//   echo of the client's `…Z` would leave the «.123Z ≠ .123+00:00» class invisible here, exactly as before;
// · PATCH with `updated_at=eq.X` applies ONLY when the row's instant equals X ⇒ `[{updated_at}]`, else `[]`;
//   a PATCH WITHOUT that filter applies unconditionally — as PG would (mutant vii must die of the overwrite,
//   ⛔ of this server refusing it);
// · POST with `Prefer: resolution=merge-duplicates` (the trees before CAS: PRE-B432 · BEFORE-408) = the old
//   unconditional apply; a plain POST is an INSERT ⇒ 409 / 23505 when the row exists.
export function pgMicros(t) {
  const m = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?(Z|[+-]\d{2}:?\d{2})$/.exec(String(t ?? ""));
  if (!m) return null;
  const sec = Date.parse(`${m[1]}${m[3] === "Z" ? "Z" : m[3].replace(/^([+-]\d{2})(\d{2})$/, "$1:$2")}`);
  return Number.isNaN(sec) ? null : sec * 1000 + Number((m[2] || "").padEnd(6, "0"));
}
export function pgText(t) {
  const us = pgMicros(t);
  if (us == null) return t ?? null;
  const d = new Date(Math.floor(us / 1000));
  const frac = String(us % 1_000_000).padStart(6, "0").replace(/0+$/, "");
  return `${d.toISOString().slice(0, 19)}${frac ? `.${frac}` : ""}+00:00`;
}
/** Apply one user_settings write to the store with PostgREST semantics. Returns { status, body }. */
export function applySettingsWrite(store, method, url, headers, postData) {
  const q = new URL(url).searchParams;
  const prefer = headers["prefer"] || "";
  const body = JSON.parse(postData || "{}");
  const row = Array.isArray(body) ? body[0] : body;
  const set = (r) => { store.settings = r.settings; if (r.updated_at) store.updatedAt = r.updated_at; store.rowGone = false; };
  if (method === "POST") {
    if (/resolution=merge-duplicates/.test(prefer)) { if (row && row.settings) set(row); return { status: 201, body: [] }; }
    if (!store.rowGone) return { status: 409, body: { code: "23505", message: 'duplicate key value violates unique constraint "user_settings_pkey"' } };
    set(row);
    return { status: 201, body: [{ updated_at: pgText(store.updatedAt) }] };
  }
  if (method === "PATCH") {
    if (store.rowGone) return { status: 200, body: [] };
    const cond = q.get("updated_at");
    if (cond != null) {
      const want = pgMicros(cond.replace(/^eq\./, ""));
      if (want == null || want !== pgMicros(store.updatedAt)) return { status: 200, body: [] };
    }
    set({ settings: row.settings ?? store.settings, updated_at: row.updated_at });
    return { status: 200, body: [{ updated_at: pgText(store.updatedAt) }] };
  }
  return null;
}

// B-045 (13.10) — `EYE_SEED_HISTORY=1` gives the hermetic journal the SHAPE production's QA journal has, which
// an empty store cannot: production run 38434987667 went red on two things the empty store never shows —
//   ① a non-empty Breakout base whose cent tail flips the sum: −$44.9836 ⇒ ₪−148.44588 (rate 3.3) prints
//      "-₪148.45", yet base + ₪41.151 prints "-₪107.29" while "-₪148.45" + ₪41.151 prints "-₪107.30";
//   ② a month worth thousands beside this month's few-₪ bar (−$3000 ⇒ ₪−9,900) ⇒ that bar is ~1px tall.
// Both are prior months, so this month's B5 bar and the B8 dot are the spec's trade alone. ⛔ the default:
// every other arm stays byte-identical (empty journal).
export function seedHistory() {
  const row = (id, ticker, setup, date, closedAt, shares, entry, exit) => ({
    id, user_id: USER_ID, ticker, side: "LONG", entry, stop: entry - 1, target: entry + 2, shares, exit,
    status: "CLOSED", date, closedAt, setup, notes: `seed-history-${id}`, emotionAtEntry: "Neutral",
    marketCondition: "Trending Up", entryQuality: 3, currency: "USD", currency_source: "manual_capital",
  });
  return [
    row("seed-h1", "SEEDA", "Breakout", "2026-08-10", "2026-08-12T15:00:00.000Z", 10, 100, 95.50164),
    row("seed-h2", "SEEDB", "Pullback", "2026-09-02", "2026-09-04T15:00:00.000Z", 100, 100, 70),
  ];
}

/** Synthetic FX answer (frankfurter shape of api/fx.js). The spec reads what the APP received, never this constant. */
export const FX_MOCK_RATE = 3.3;

const eqParam = (url, col) => {
  const v = new URL(url).searchParams.get(col);
  if (!v) return null;
  if (v.startsWith("eq.")) return [decodeURIComponent(v.slice(3))];
  const m = /^in\.\((.*)\)$/.exec(v);
  return m ? m[1].split(",").map((s) => decodeURIComponent(s.replace(/^"|"$/g, ""))) : null;
};

// supabase-js asks for a single object via this Accept header (`.single()`/`.maybeSingle()`).
function json(route, status, body, req) {
  const single = /vnd\.pgrst\.object/.test(req.headers()["accept"] || "");
  const payload = single ? (Array.isArray(body) ? body[0] ?? null : body) : body;
  return route.fulfill({ status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(payload) });
}

/**
 * Answer one `/rest/v1/user_settings` or `/rest/v1/trades` request from `store`. Returns the
 * fulfil promise, or `null` when the path is neither table (the caller decides what happens then).
 * Shared by `installHermetic` (synthetic origin) and the production arm of tests-eye/firstrun.spec.js,
 * which keeps the REAL auth and answers these two tables locally — the QA row is never read or written.
 * `store.tradesDelayMs` (firstrun, B-445): holds the journal GET back, so a scene can watch the UI
 * while the trades have not landed. Absent ⇒ 0 ⇒ every existing caller is unchanged.
 */
export async function answerRest(route, store) {
  // Production (firstrun): the session is the REAL QA user's, so the rows must carry that id.
  const uid = store.userId || USER_ID;
  const req = route.request();
  const url = req.url();
  const path = new URL(url).pathname;
  const method = req.method();
  if (path.startsWith("/rest/v1/user_settings")) {
    // B-432 · B-435 (16.10): the row carries its VERSION TOKEN (`updated_at`, written by the client) — without
    // it every load reads «no base» and the base/inflight decision is never exercised (a blind arm).
    if (method === "GET") { await json(route, 200, store.rowGone ? [] : [{ user_id: uid, settings: store.settings, updated_at: pgText(store.updatedAt) }], req); return true; }
    const r = applySettingsWrite(store, method, url, req.headers(), req.postData());
    if (r) { await json(route, r.status, r.body, req); return true; }
    // ⛔ the silent 204 below for a settings write this server does not model (B-272 for the fake server).
    console.error(`[hermetic] unmodelled user_settings ${method} ${url}`);
    await route.fulfill({ status: 500, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify({ message: `hermetic: unmodelled ${method}` }) }); return true;
  }
  if (path.startsWith("/rest/v1/trades")) {
    if (method === "GET") {
      if (store.tradesDelayMs > 0) await new Promise((ok) => setTimeout(ok, store.tradesDelayMs));
      const ids = eqParam(url, "user_id");
      await json(route, 200, ids && !ids.includes(uid) ? [] : store.trades, req); return true;
    }
    if (method === "POST") {
      const body = JSON.parse(req.postData() || "[]");
      const rows = (Array.isArray(body) ? body : [body]).map((r, i) => ({ ...r, id: r.id ?? `h-${Date.now()}-${i}` }));
      store.trades.push(...rows);
      await json(route, 201, rows.map((r) => ({ id: r.id })), req); return true;
    }
    if (method === "PATCH") {
      const ids = eqParam(url, "id") || [];
      const patch = JSON.parse(req.postData() || "{}");
      const hit = store.trades.filter((t) => ids.includes(String(t.id)));
      hit.forEach((t) => Object.assign(t, patch));
      await json(route, 200, hit.map((t) => ({ id: t.id })), req); return true;
    }
    if (method === "DELETE") {
      const ids = eqParam(url, "id") || [];
      const hit = store.trades.filter((t) => ids.includes(String(t.id)));
      store.trades = store.trades.filter((t) => !ids.includes(String(t.id)));
      await json(route, 200, hit.map((t) => ({ id: t.id })), req); return true;
    }
  }
  return false;
}

export async function installHermetic(ctx, store) {
  await ctx.route(new RegExp(`https://${SB_HOST.replace(/\./g, "\\.")}/`), async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const method = req.method();
    if (method === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" }, body: "" });
    if (path.startsWith("/auth/v1/token") || path.startsWith("/auth/v1/signup")) return json(route, 200, session(), req);
    if (path.startsWith("/auth/v1/user")) return json(route, 200, session().user, req);
    if (path.startsWith("/auth/v1/logout")) return route.fulfill({ status: 204, body: "" });

    if (await answerRest(route, store)) return;
    if (method === "GET") return json(route, 200, [], req);
    return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*" }, body: "" });
  });

  // /api/fx — ILS arm only: the build has no API behind it. Spot + range, every calendar day in the range.
  await ctx.route(/\/api\/fx\?/, (route) => {
    const q = new URL(route.request().url()).searchParams;
    const base = q.get("base"), sym = q.get("symbols");
    const start = q.get("start"), end = q.get("end");
    if (start && end) {
      const rates = {};
      for (let d = new Date(`${start}T00:00:00Z`); d <= new Date(`${end}T00:00:00Z`); d = new Date(d.getTime() + 864e5)) rates[d.toISOString().slice(0, 10)] = { [sym]: FX_MOCK_RATE };
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ base, start, end, rates }) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ base, date: new Date().toISOString().slice(0, 10), rates: { [sym]: FX_MOCK_RATE } }) });
  });

  // B-433 (Niv 15.10): a hermetic run must never report to the PRODUCTION Google Analytics property
  // (G-VC8PKL4NL1). Measured: probe-flake self-test S8 on the tree before this — 18 GA requests from two
  // hermetic H2 runs, 12 answered (`gcs=G100` consent-mode pings: page_view · scroll). Aborted here, so
  // the app's consent-default-denied path still runs (window.gtag is the inline stub) — only the
  // network leaves. The remaining third-party hosts are B-425 (ג), plan A — ⛔ in this change.
  // The proof is the diag's `ga` events (probe-flake S8: attempted > 0, answered = 0) — ⛔ a counter here.
  await ctx.route(/^https:\/\/(www\.)?(google-analytics|googletagmanager)\.com\//, (route) => route.abort("blockedbyclient"));

  // /api/ocr is a PAID Vision call in production — the hermetic arm never makes it.
  await ctx.route(/\/api\/ocr(\?|$)/, (route) => {
    store.ocrCalls++;
    return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "hermetic" }) });
  });
}
