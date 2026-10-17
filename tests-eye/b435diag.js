// tests-eye/b435diag.js — the B-435 detector (Niv 17.10, 2ב). Console lines only: ⛔ trace · ⛔ video (E11 —
// the repo is public and a trace carries the QA refresh_token).
//
// B-435 was a production red that left nothing to classify: B-0 measured 0/N under every modelled variant, and
// the code reading (docs/audits/B435-ERROR-PATHS-2026-10-17.md) leaves an UNMEASURED leading hypothesis — an
// orphan write landing late and replacing the whole blob. So the next occurrence has to carry its own evidence.
// One `[B-435 diag]` line per scene step:
//
//   device=  the e2e setups in the device's swingEdgePlaybook          ⎫
//   db=      the e2e setups in the row + the row's updated_at token     ⎬ read at the step, BEFORE any cleanup
//   journal= the delta journal's ops as coll:op:key (keys only)         ⎭ (the post-sweep is ⛔ evidence: the UI
//   pending= the scalar pending's FIELD NAMES + inflight count + base       delete writes the cache first)
//   net=     every user_settings request since the last step: method · the token it SENT · status or failure,
//            and every read with the token it RETURNED ⇒ an older token after a newer one is visible here
//   quota=   every QuotaExceededError thrown by localStorage.setItem, by key
//   app=     the app's own `userSettings:` / `[settingsDelta]` console lines (redacted)
//
// ⛔ VALUES. A setup is printed by its e2e short name, a setup that is not ours as `other`, an id this page
// never saw as `#<id>` (setup ids are client timestamps). Nothing with an `@` is printed — redact() on every
// free-text field. The DB read is NOT awaited at the step: it runs in Node while the scene continues, so the
// diag does not move the save→reload timing it is there to observe; `flush()` awaits it before cleanup.

import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { redact } from "../tests/lib/eyeTools.js";
import { PREFIX_ROOT } from "./qaRest.js";

const counted = (lines) => { const m = new Map(); for (const l of lines) m.set(l, (m.get(l) || 0) + 1); return [...m].map(([l, n]) => (n > 1 ? `${l} ×${n}` : l)); };
const isSettings = (u) => /\/rest\/v1\/user_settings(\?|$)/.test(u);
const tokenOf = (postData) => {
  if (!postData) return "no-body";
  try {
    const b = JSON.parse(postData);
    const row = Array.isArray(b) ? b[0] : b;
    return row?.updated_at ?? "no-token";
  } catch {
    return "unparseable-body"; // said, ⛔ swallowed: the line carries it
  }
};

/**
 * Attach BEFORE the first navigation (the quota wrapper is an init script).
 * `prefix`: this scene's setup-name prefix (short names are relative to it).
 * `snapshot`: async () => ({ ours, token }) — the row, read-only (qaRest.settingsDiag); null when hermetic.
 */
export async function attachB435Diag(page, { label, project, prefix, dir, snapshot }) {
  await page.addInitScript(() => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      try { return set.call(this, k, v); } catch (e) {
        if (e && e.name === "QuotaExceededError") console.debug(`[b435q] ${String(k).startsWith("swingEdge") ? k : "other"}`);
        throw e; // the app's own handling is unchanged
      }
    };
  });
  const net = [];
  const quota = {};
  const app = [];
  const names = new Map(); // setup id -> short name, across reloads (a vanished setup keeps its name here)
  const short = (n) => (typeof n !== "string" ? "other" : n.startsWith(prefix) ? n.slice(prefix.length) : n.startsWith(PREFIX_ROOT) ? "e2e-other" : "other");

  page.on("console", (m) => {
    const t = m.text();
    const q = /^\[b435q\] (\S+)$/.exec(t);
    if (q) { quota[q[1]] = (quota[q[1]] || 0) + 1; return; }
    // First line only (the stack is the bundle's, ⛔ evidence here); one unload fires up to three handlers.
    if (/^(userSettings:|\[settingsDelta\])/.test(t)) app.push(redact(t).split(/\n|\s+at\s/)[0].replace(/\s+/g, " ").slice(0, 240));
  });
  page.on("request", (r) => {
    if (isSettings(r.url()) && r.method() !== "GET") net.push(`${r.method()} sent ${tokenOf(r.postData())}`);
  });
  page.on("response", async (r) => {
    if (!isSettings(r.url())) return;
    const m = r.request().method();
    if (m !== "GET") { net.push(`${m} ${tokenOf(r.request().postData())} → ${r.status()}`); return; }
    let tok;
    try {
      const body = await r.json();
      const row = Array.isArray(body) ? body[0] : body;
      tok = row ? (row.updated_at ?? "no-token") : "no-row";
    } catch (e) {
      tok = `body-unavailable(${redact(e?.message).split("\n")[0].slice(0, 60)})`;
    }
    net.push(`GET → ${r.status()} tok=${tok}`);
  });
  page.on("requestfailed", (r) => {
    if (!isSettings(r.url())) return;
    const m = r.method();
    net.push(`${m}${m === "GET" ? "" : ` ${tokenOf(r.postData())}`} ✗ ${redact(r.failure()?.errorText ?? "unknown")}`);
  });

  mkdirSync(dir, { recursive: true });
  const file = join(dir, `b435-diag-${label}.txt`);
  // ⛔ `@` anywhere: the leak scan (scripts/eye-evidence-scan.mjs) counts every `@` in a text file, and a WebKit
  // stack frame is `fn@url` — measured 17.10, PR #80 run 39006247007: 36 matches, 0 of them an email.
  const emit = (raw) => { const line = raw.replace(/@/g, "(at)"); console.log(line); appendFileSync(file, line + "\n"); };
  let dbPending = null;

  async function step(name) {
    const local = await page.evaluate(() => {
      const out = {};
      const rd = (k) => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return { __error: String(e) }; } };
      out.playbook = rd("swingEdgePlaybook");
      out.journal = rd("swingEdgeSettingsDelta");
      out.pending = rd("swingEdgeSettingsPending");
      return out;
    }).catch((e) => ({ __error: redact(e.message).split("\n")[0] }));
    const pb = Array.isArray(local.playbook) ? local.playbook : [];
    for (const s of pb) if (s && s.id != null && typeof s.name === "string") names.set(String(s.id), short(s.name));
    const keyName = (coll, k) => (coll === "playbook" ? (names.get(String(k)) ?? `#${k}`) : coll === "priceAlerts" || coll === "watchlist" ? "k" : "?");
    const device = local.__error ? `ERR(${local.__error})` : local.playbook?.__error ? "ERR(unparseable)" : `[${pb.map((s) => short(s?.name)).filter((n) => n !== "other").join(",")}]`;
    const journal = Array.isArray(local.journal) ? `[${local.journal.map((o) => `${o.coll}:${o.op}:${keyName(o.coll, o.key)}`).join(",")}]` : local.journal == null ? "[]" : "ERR(not-an-array)";
    const p = local.pending;
    const pending = p == null ? "none" : p.__error ? "ERR(unparseable)" : `[${Object.keys(p.values || {}).join(",")}]/inflight=${Array.isArray(p.inflight) ? p.inflight.length : "?"}/base=${p.base ?? "null"}`;
    const q = Object.keys(quota).length ? Object.entries(quota).map(([k, n]) => `${k}×${n}`).join(",") : "0";
    const head = `[B-435 diag] ${label} ${project} ${name}`;
    emit(`${head} device=${device} journal=${journal} pending=${pending} quota=${q} net=[${net.splice(0).join(" · ")}] app=[${counted(app.splice(0)).join(" · ")}]`);
    for (const k of Object.keys(quota)) delete quota[k];
    // The row, read in Node while the scene goes on (⛔ awaited here — see the header).
    if (dbPending) await dbPending;
    const t0 = Date.now();
    dbPending = (snapshot ? snapshot().then(
      (s) => emit(`${head} db=[${s.ours.map(short).join(",")}] tok=${s.token} (read +${Date.now() - t0}ms)`),
      (e) => emit(`${head} db=ERR(${redact(e?.message).split("\n")[0].slice(0, 120)})`),
    ) : Promise.resolve(emit(`${head} db=n/a(hermetic)`)));
  }
  async function flush() { if (dbPending) await dbPending; dbPending = null; }
  return { step, flush, file };
}
