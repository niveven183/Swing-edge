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
  return { settings: structuredClone(SEED_SETTINGS), trades: [], ocrCalls: 0 };
}

const eqParam = (url, col) => {
  const v = new URL(url).searchParams.get(col);
  if (!v) return null;
  if (v.startsWith("eq.")) return [decodeURIComponent(v.slice(3))];
  const m = /^in\.\((.*)\)$/.exec(v);
  return m ? m[1].split(",").map((s) => decodeURIComponent(s.replace(/^"|"$/g, ""))) : null;
};

export async function installHermetic(ctx, store) {
  const json = (route, status, body, req) => {
    // supabase-js asks for a single object via this Accept header (`.single()`/`.maybeSingle()`).
    const single = /vnd\.pgrst\.object/.test(req.headers()["accept"] || "");
    const payload = single ? (Array.isArray(body) ? body[0] ?? null : body) : body;
    return route.fulfill({ status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(payload) });
  };

  await ctx.route(new RegExp(`https://${SB_HOST.replace(/\./g, "\\.")}/`), async (route) => {
    const req = route.request();
    const url = req.url();
    const path = new URL(url).pathname;
    const method = req.method();
    if (method === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" }, body: "" });
    if (path.startsWith("/auth/v1/token") || path.startsWith("/auth/v1/signup")) return json(route, 200, session(), req);
    if (path.startsWith("/auth/v1/user")) return json(route, 200, session().user, req);
    if (path.startsWith("/auth/v1/logout")) return route.fulfill({ status: 204, body: "" });

    if (path.startsWith("/rest/v1/user_settings")) {
      if (method === "GET") return json(route, 200, [{ user_id: USER_ID, settings: store.settings }], req);
      const body = JSON.parse(req.postData() || "{}");
      const row = Array.isArray(body) ? body[0] : body;
      if (row && row.settings) store.settings = row.settings;
      return json(route, 201, [], req);
    }
    if (path.startsWith("/rest/v1/trades")) {
      if (method === "GET") {
        const ids = eqParam(url, "user_id");
        return json(route, 200, ids && !ids.includes(USER_ID) ? [] : store.trades, req);
      }
      if (method === "POST") {
        const body = JSON.parse(req.postData() || "[]");
        const rows = (Array.isArray(body) ? body : [body]).map((r, i) => ({ ...r, id: r.id ?? `h-${Date.now()}-${i}` }));
        store.trades.push(...rows);
        return json(route, 201, rows.map((r) => ({ id: r.id })), req);
      }
      if (method === "PATCH") {
        const ids = eqParam(url, "id") || [];
        const patch = JSON.parse(req.postData() || "{}");
        const hit = store.trades.filter((t) => ids.includes(String(t.id)));
        hit.forEach((t) => Object.assign(t, patch));
        return json(route, 200, hit.map((t) => ({ id: t.id })), req);
      }
      if (method === "DELETE") {
        const ids = eqParam(url, "id") || [];
        const hit = store.trades.filter((t) => ids.includes(String(t.id)));
        store.trades = store.trades.filter((t) => !ids.includes(String(t.id)));
        return json(route, 200, hit.map((t) => ({ id: t.id })), req);
      }
    }
    if (method === "GET") return json(route, 200, [], req);
    return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*" }, body: "" });
  });

  // /api/ocr is a PAID Vision call in production — the hermetic arm never makes it.
  await ctx.route(/\/api\/ocr(\?|$)/, (route) => {
    store.ocrCalls++;
    return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "hermetic" }) });
  });
}
