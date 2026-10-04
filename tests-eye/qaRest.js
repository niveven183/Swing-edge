// tests-eye/qaRest.js — the cleanup safety net for the QA account (production only).
//
// SCOPE IS A PREFIX, NEVER A GUESS: only playbook setups whose name starts with
// `e2e-c064-` and only trades with ticker `EYEPB` AND notes starting with `e2e-c064-` are
// ever touched. RLS ("users own their rows") limits every call to the QA account itself.
//
// 🔴 THE SETTINGS BLOB IS LAST-WRITER-WINS (K6). A read-modify-write while an app page is
// open can be overwritten by the app's debounced upsert, or overwrite it. So `sweep()` is
// called ONLY with every browser context closed (Niv, 04.10, fix ①), and every RMW is
// proven: a second GET must show 0 residue AND every OTHER key of the blob byte-identical
// before/after. A difference is red, ⛔ a warning.

import { createHash } from "node:crypto";

export const PREFIX_ROOT = "e2e-c064-";
// ⚠️ Letters only, ⛔ "C064": a ticker with digits falls through instrumentCurrency's regexes
// (unverified_instrument ⇒ no shares ⇒ B-345 blocks the save) — measured 04.10 in the probe.
export const TRADE_TICKER = "EYEPB";

const SUPA_URL = process.env.SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_ANON_KEY;
const sha = (s) => createHash("sha256").update(s).digest("hex");

export function restConfigured() {
  return !!(SUPA_URL && SUPA_KEY);
}

async function token(email, password) {
  const res = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPA_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`[qaRest] auth HTTP ${res.status}`);
  const j = await res.json();
  if (!j?.access_token || !j?.user?.id) throw new Error("[qaRest] auth response had no access_token / user.id");
  return { token: j.access_token, uid: j.user.id };
}

async function rest(path, tok, { method = "GET", body, prefer } = {}) {
  const res = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SUPA_KEY,
      Authorization: `Bearer ${tok}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`[qaRest] ${method} ${path.split("?")[0]} → HTTP ${res.status}`);
  return text ? JSON.parse(text) : null;
}

const isOurs = (s) => typeof s?.name === "string" && s.name.startsWith(PREFIX_ROOT);
const withoutPlaybook = (settings) => {
  const { playbook, ...rest } = settings;
  return JSON.stringify(rest);
};

/**
 * Remove every e2e-c064- trace from the QA account and PROVE it. Returns a report; throws on
 * any unexpected shape, any residue after the sweep, or any change outside the prefix.
 */
export async function sweep(email, password) {
  if (!restConfigured()) throw new Error("[qaRest] SUPABASE_URL / SUPABASE_ANON_KEY missing — refusing to report a cleanup that never ran");
  const { token: tok, uid } = await token(email, password);
  const report = { trades: {}, playbook: {} };

  // ── trades ──
  const tradeFilter = `user_id=eq.${uid}&ticker=eq.${TRADE_TICKER}&notes=like.${encodeURIComponent(PREFIX_ROOT)}*`;
  const found = await rest(`trades?select=id&${tradeFilter}`, tok);
  report.trades.found = found.length;
  if (found.length) {
    const del = await rest(`trades?${tradeFilter}&select=id`, tok, { method: "DELETE", prefer: "return=representation" });
    report.trades.deleted = del.length;
  } else {
    report.trades.deleted = 0;
  }
  report.trades.after = (await rest(`trades?select=id&${tradeFilter}`, tok)).length;

  // ── settings blob (playbook array only) ──
  const read = async () => {
    const rows = await rest(`user_settings?select=settings&user_id=eq.${uid}`, tok);
    if (!Array.isArray(rows) || rows.length !== 1) throw new Error(`[qaRest] user_settings: expected exactly 1 row for the QA account, got ${Array.isArray(rows) ? rows.length : typeof rows} — refusing to write`);
    const s = rows[0].settings;
    if (!s || typeof s !== "object" || Array.isArray(s)) throw new Error("[qaRest] user_settings.settings is not an object — refusing to write");
    if (s.playbook !== undefined && !Array.isArray(s.playbook)) throw new Error("[qaRest] settings.playbook is not an array — refusing to write");
    return s;
  };
  const before = await read();
  const pb = before.playbook || [];
  report.playbook.found = pb.filter(isOurs).length;
  report.restHashBefore = sha(withoutPlaybook(before));
  let after = before;
  if (report.playbook.found) {
    await rest(`user_settings?user_id=eq.${uid}`, tok, {
      method: "PATCH",
      prefer: "return=minimal",
      body: { settings: { ...before, playbook: pb.filter((s) => !isOurs(s)) } },
    });
    after = await read();
  }
  report.playbook.after = (after.playbook || []).filter(isOurs).length;
  report.playbook.kept = (after.playbook || []).length;
  report.restHashAfter = sha(withoutPlaybook(after));
  report.blobSha256 = sha(JSON.stringify(after));

  if (report.trades.after !== 0) throw new Error(`[qaRest] ${report.trades.after} EYEPB test trade(s) survived the sweep`);
  if (report.playbook.after !== 0) throw new Error(`[qaRest] ${report.playbook.after} e2e-c064- setup(s) survived the sweep`);
  if (report.restHashBefore !== report.restHashAfter) throw new Error("[qaRest] keys OUTSIDE the playbook changed during the sweep — the RMW raced the app or touched what it must not");
  return report;
}
