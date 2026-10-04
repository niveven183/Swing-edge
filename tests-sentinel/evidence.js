// B-375 — openable evidence for every RED sentinel finding.
//
// WHY THIS IS NOT `trace`/`screenshot` IN THE PLAYWRIGHT CONFIG:
//   · The sentinel specs never hard-fail (findings drive the report — B-374), so
//     'retain-on-failure'/'only-on-failure' would NEVER fire.
//   · A red finding's add() often runs long after the moment that matters: the
//     create-failed add() fires ~20s after the click, while a toast lives 3s
//     (ToastProvider.jsx:20-23). A screenshot at add() time cannot see it. So the
//     recording is CONTINUOUS (ring buffers), and only the SAVING is gated on red.
//   · ⛔ trace, by decision (Niv, 28.09 — decision 1): the repo is public, the
//     artifact is downloadable by any GitHub account, and a trace carries the
//     /auth/v1/token response body — a refresh_token, i.e. a persistent session
//     on the QA account. Its redaction cannot be proven, so it does not exist here.
//
// WHAT IS SAVED is built from scratch by THIS file, as an allow-list: DOM text of
// added/removed nodes, method·origin+path·status (⛔ headers ⛔ bodies ⛔ query),
// console/pageerror text, crumbs the spec records, two masked screenshots and the
// open dialog's HTML. Every text file passes redactText() before it hits disk.
//
// DECISION 4 (Niv, 28.09): an evidence failure is ⛔ a new finding. The red finding
// itself carries `evidence` and a `· ראיה: …` suffix on `got`, so the failure rides
// with the alert and the add() population (test:diagnosis M4) does not move.

import fs from 'node:fs';
import path from 'node:path';

export const EVIDENCE_DIR = process.env.SENTINEL_EVIDENCE_DIR || 'sentinel-evidence';
export const MAX_RED = 10; // per spec file per run; beyond it the finding says so
const RING = { mut: 60, transient: 30, net: 80, con: 30, crumbs: 20 };
const TEXT_CAP = 200;
const HTML_CAP = 100_000;
const TRANSIENT_MS = 10_000; // a node that lived ≤10s — the toast signature
const SECOND_SHOT_MS = 2_000;

// Allow-list output still gets scrubbed: text on screen is whatever the app chose
// to render, and the QA address is rendered in the user menu (SwingEdge_App.jsx:4296).
export function redactText(input, secrets = []) {
  let s = String(input ?? '');
  for (const sec of secrets) {
    if (sec && String(sec).length >= 4) s = s.split(String(sec)).join('[secret]');
  }
  return s
    .replace(/eyJ[\w-]{5,}\.[\w-]{5,}\.[\w-]*/g, '[jwt]')
    .replace(/\bBearer\s+[\w.~+/=-]+/gi, 'Bearer [redacted]')
    .replace(/sb-[a-z0-9]+-auth-token[\w.-]*/gi, '[sb-auth-key]')
    .replace(/("?(?:access_token|refresh_token|provider_token|provider_refresh_token|apikey|api_key|password)"?\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s&"',}]+)/gi, '$1[redacted]')
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, '[email]');
}

// A crumb value is either what the screen showed — "—" included, that IS a
// measurement — or an explicit admission. ⛔ '' and ⛔ a swallowed error: the
// first crumb (28.09, run 36399653545) read capital as "" and nobody could tell
// "empty on screen" from "never read".
// Leak patterns for evidence that leaves the runner (public repo ⇒ world-readable artifacts).
// ONE list, consumed by scripts/verify-evidence.mjs (sentinel) and
// scripts/eye-evidence-scan.mjs (C-064 eye suite) — two copies would drift (R-6).
// `text-only`: '@' is an ordinary byte in compressed image data, so in a binary file a hit
// measures the codec, not a leak; the exclusion is printed by every consumer, never silent.
export const LEAK_PATTERNS = [
  ['@', /@/g, 'text-only'],
  ['eyJ', /eyJ/g],
  ['Bearer', /Bearer/g],
  ['refresh_token', /refresh_token/g],
  ['access_token', /access_token/g],
  ['apikey', /apikey/gi],
  ['sb-*-auth-token', /sb-[a-z0-9]+-auth-token/gi],
];

export const UNMEASURED = 'לא נמדד: ';
export async function measure(fn) {
  try {
    const v = await fn();
    if (v == null) return `${UNMEASURED}הערך חסר (null)`;
    const text = String(v).replace(/\s+/g, ' ').trim();
    return text === '' ? `${UNMEASURED}הטקסט על המסך ריק` : text;
  } catch (e) {
    return `${UNMEASURED}${String(e?.message ?? e).split('\n')[0]}`;
  }
}

function cleanUrl(u) {
  try { const x = new URL(u); return `${x.origin}${x.pathname}`; }
  catch { return String(u).split('?')[0].split('#')[0]; }
}

function ring(arr, max, item) {
  arr.push(item);
  if (arr.length > max) arr.shift();
}

// Runs INSIDE the page, before the app's own scripts, on every navigation.
function installInPage(cfg) {
  if (window.__sentinelEv) return;
  const ev = { mut: [], transient: [] };
  window.__sentinelEv = ev;
  const seen = new WeakMap();
  // Rendered text only: textContent would also carry <script>/<style> bodies —
  // measured leaking an inline script's literal into log.json (28.09, local run).
  const SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEMPLATE: 1 };
  const text = (n) => {
    if (SKIP[n.nodeName]) return '';
    const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT, {
      acceptNode: (t) => { for (let p = t.parentNode; p && p !== n.parentNode; p = p.parentNode) if (SKIP[p.nodeName]) return NodeFilter.FILTER_REJECT; return NodeFilter.FILTER_ACCEPT; },
    });
    let out = '';
    while (out.length < cfg.cap * 2 && w.nextNode()) out += ` ${w.currentNode.nodeValue}`;
    return out.replace(/\s+/g, ' ').trim().slice(0, cfg.cap);
  };
  const push = (arr, max, item) => { arr.push(item); if (arr.length > max) arr.shift(); };
  new MutationObserver((records) => {
    const now = Date.now();
    for (const r of records) {
      for (const n of r.addedNodes) {
        if (n.nodeType !== 1) continue;
        const tx = text(n);
        seen.set(n, { at: now, text: tx });
        if (tx) push(ev.mut, cfg.mut, { t: now, op: 'added', tag: n.tagName.toLowerCase(), text: tx });
      }
      for (const n of r.removedNodes) {
        if (n.nodeType !== 1) continue;
        const s = seen.get(n);
        const tx = s ? s.text : text(n);
        if (tx) push(ev.mut, cfg.mut, { t: now, op: 'removed', tag: n.tagName.toLowerCase(), text: tx });
        if (s && s.text && now - s.at <= cfg.transientMs) {
          push(ev.transient, cfg.transient, { t: s.at, removedAt: now, livedMs: now - s.at, text: s.text });
        }
      }
    }
  }).observe(document, { childList: true, subtree: true });
}

const byLabel = new Map(); // label → { rows, seq } shared by every page of one spec file

function statusText(st) {
  if (st.ok) return st.partial ? `נשמרה חלקית (${st.files} קבצים; ⛔ ${st.partial}) — ${st.dir}` : `נשמרה (${st.files} קבצים) — ${st.dir}`;
  return `⛔ נשמרה — ${st.reason}`;
}

// Attach the final status to the finding, exactly once.
function settle(finding, st) {
  if (finding.evidence) return;
  finding.evidence = statusText(st);
  finding.got = `${finding.got} · ראיה: ${finding.evidence}`;
}

// Called from add() for every red finding. Synchronous on purpose: the Node-side
// rings are frozen HERE, at the moment of the finding.
export function recordEvidence(rec, finding) {
  if (!rec) { settle(finding, { ok: false, reason: 'אין מקליט ראיות פעיל בקובץ הזה' }); return; }
  rec.capture(finding);
}

export async function createEvidence(page, { label, secrets = [] }) {
  if (!byLabel.has(label)) byLabel.set(label, { rows: [], seq: 0 });
  const shared = byLabel.get(label);
  const st = {
    active: true, queue: Promise.resolve(), pending: [],
    net: [], con: [], crumbs: [], rows: shared.rows,
  };
  const red = (s) => redactText(s, secrets);

  await page.addInitScript(installInPage, { cap: TEXT_CAP, mut: RING.mut, transient: RING.transient, transientMs: TRANSIENT_MS });
  page.on('response', (res) => {
    ring(st.net, RING.net, { t: Date.now(), method: res.request().method(), url: cleanUrl(res.url()), status: res.status() });
  });
  page.on('requestfailed', (req) => {
    ring(st.net, RING.net, { t: Date.now(), method: req.method(), url: cleanUrl(req.url()), status: 'failed', error: req.failure()?.errorText || '' });
  });
  page.on('console', (msg) => {
    const type = msg.type();
    if (type === 'error' || type === 'warning') ring(st.con, RING.con, { t: Date.now(), type, text: msg.text().slice(0, 300) });
  });
  page.on('pageerror', (err) => ring(st.con, RING.con, { t: Date.now(), type: 'pageerror', text: String(err.message).slice(0, 300) }));

  const masks = () => {
    const m = [page.locator('input[type="email"]'), page.locator('input[type="password"]')];
    for (const s of secrets) if (s && String(s).includes('@')) m.push(page.getByText(String(s)));
    return m;
  };

  async function run(finding, idx, at, snap) {
    const dir = path.join(EVIDENCE_DIR, `${label}-${String(idx).padStart(2, '0')}-${finding.fp.replace(/[^\w.-]+/g, '_').slice(0, 60)}`);
    fs.mkdirSync(dir, { recursive: true });
    const files = [];
    const errors = [];
    let inPage = null;
    try {
      inPage = await page.evaluate(() => (window.__sentinelEv
        ? { mut: window.__sentinelEv.mut.slice(), transient: window.__sentinelEv.transient.slice(), url: location.origin + location.pathname }
        : null));
      if (!inPage) errors.push('יומן המוטציות ⛔ הותקן בדף');
    } catch (e) { errors.push(`יומן הדף: ${e.message}`); }
    try {
      await page.screenshot({ path: path.join(dir, 't0.png'), mask: masks(), timeout: 5_000 });
      files.push('t0.png');
    } catch (e) { errors.push(`t0.png: ${e.message}`); }
    try {
      const dialogs = page.locator('[role="dialog"]');
      if (await dialogs.count()) {
        // Live input values are copied into attributes: for B-376 the SHARES value
        // on screen IS the measurement. Passwords never leave as a value.
        const html = await dialogs.last().evaluate((el) => {
          const c = el.cloneNode(true);
          const live = el.querySelectorAll('input');
          c.querySelectorAll('input').forEach((i, k) => {
            i.setAttribute('value', i.type === 'password' ? '[redacted]' : (live[k] ? live[k].value : ''));
          });
          return c.outerHTML;
        });
        fs.writeFileSync(path.join(dir, 'dialog.html'), red(html).slice(0, HTML_CAP));
        files.push('dialog.html');
      }
    } catch (e) { errors.push(`dialog.html: ${e.message}`); }
    await page.waitForTimeout(SECOND_SHOT_MS).catch((e) => errors.push(`המתנה: ${e.message}`));
    try {
      await page.screenshot({ path: path.join(dir, 't2.png'), mask: masks(), timeout: 5_000 });
      files.push('t2.png');
    } catch (e) { errors.push(`t2.png: ${e.message}`); }
    // Every entry carries dtMs relative to the finding: negative = before it.
    const rel = (arr) => (arr || []).map((x) => ({ dtMs: x.t - at, ...x }));
    const log = {
      fp: finding.fp,
      severity: finding.severity,
      findingAt: new Date(at).toISOString(),
      url: inPage?.url || null,
      note: 'dtMs < 0 = before the finding. transient = nodes that lived ≤10s (toasts).',
      crumbs: rel(snap.crumbs),
      transient: rel(inPage?.transient),
      mutations: rel(inPage?.mut),
      console: rel(snap.con),
      network: rel(snap.net),
      captureErrors: errors,
    };
    fs.writeFileSync(path.join(dir, 'log.json'), red(JSON.stringify(log, null, 2)));
    files.push('log.json');
    return { ok: true, files: files.length, dir, partial: errors.length ? errors.join('; ').slice(0, 300) : '' };
  }

  const rec = {
    crumb(name, data) {
      ring(st.crumbs, RING.crumbs, { t: Date.now(), name, data });
    },
    capture(finding) {
      const at = Date.now();
      if (!st.active) { settle(finding, { ok: false, reason: 'הממצא נרשם אחרי סוף מסע הדפדפן — ⛔ דף חי ללכידה' }); return; }
      shared.seq += 1;
      const idx = shared.seq;
      if (idx > MAX_RED) {
        const r = { ok: false, reason: `תקרת ${MAX_RED} ממצאים אדומים לריצה` };
        st.rows.push({ fp: finding.fp, status: statusText(r) });
        settle(finding, r);
        return;
      }
      const snap = { net: st.net.slice(), con: st.con.slice(), crumbs: st.crumbs.slice() };
      const job = st.queue.then(() => run(finding, idx, at, snap))
        .catch((e) => ({ ok: false, reason: `הלכידה זרקה: ${e.message}` }))
        .then((r) => { st.rows.push({ fp: finding.fp, status: statusText(r) }); settle(finding, r); });
      st.queue = job;
      st.pending.push(job);
    },
    // Wait for every capture queued so far — used before an action that would
    // change what the capture must see (e.g. closing the modal).
    async drain() {
      await Promise.all(st.pending);
    },
    async flush() {
      await Promise.all(st.pending);
      if (st.rows.length) {
        fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
        fs.writeFileSync(path.join(EVIDENCE_DIR, `manifest-${label}.json`), red(JSON.stringify(st.rows, null, 2)));
      }
    },
    close() { st.active = false; },
  };
  return rec;
}
