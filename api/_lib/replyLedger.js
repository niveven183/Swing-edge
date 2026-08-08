// The reply campaign key, and the only place it is ever parsed or built.
//
// WHY A SHARED MODULE. Two sides read this string and they must agree: the
// server derives the next `n` from it (api/notify.js) and the panel renders
// "N replies sent" from it (AdminPanel.jsx). A second copy of the parse is the
// exact drift the GET template list was built to remove, and it fails silently —
// a key the panel cannot parse is a reply that simply stops appearing on screen.
//
// WHY api/_lib AND NOT src/lib. This directory is already proven to bundle into
// the serverless function (cors.js, rateLimit.js), and that is the half nothing
// runnable on this machine can verify. The other half — the client import — is
// proven by `npm run build` on every push. Putting it in src/ would have swapped
// a verifiable risk for an unverifiable one.
//
// ─── THE KEY ────────────────────────────────────────────────────────────────
//
//   reply:<feedback_id>:<n>:<h8>
//
// <n>  a running counter, ALWAYS derived server-side as max+1. The client never
//      sends it. Until 2026-08-08 the key was `reply:<feedback_id>` with no
//      counter, which locked a feedback row to exactly one reply forever — and
//      that contradicts the whole point of the seven templates: "we reproduced
//      the bug" today and "it is fixed" next week are two letters about one
//      report. Rows in the old shape are read as n=1; two of them exist in
//      production (07.08 12:06 and 19:09) and must keep rendering.
//
// <h8> the first 8 hex of sha256(template + "\n" + trimmed body). This is the
//      part that is NOT decoration. A server-derived monotonic counter can never
//      collide with itself, so `reply:<id>:<n>` alone silently DELETES the only
//      duplicate protection the endpoint ever had: two clicks on send produce
//      n=1 and n=2 and mail the same letter twice. Identity is not deduplication;
//      deduplication needs the content. See docs/DECISIONS.md 2026-08-08.
//
// The whole thing lives inside the existing `campaign` text column on purpose —
// ⛔ zero migrations. ~55 characters.

const PREFIX = "reply:";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// "reply:<id>"                → { id, n: 1, hash: "" }   ← pre-2026-08-08 rows
// "reply:<id>:3"              → { id, n: 3, hash: "" }
// "reply:<id>:3:a1b2c3d4"     → { id, n: 3, hash: "a1b2c3d4" }
// anything else               → null
//
// Returns null rather than throwing or guessing: `email_campaign_log` also holds
// bulk campaigns ("why_stopped", "waitlist_launch"), and a parser that coerced
// those into feedback ids would attach a reply badge to nothing at all.
export function parseCampaign(campaign) {
  const s = String(campaign || "");
  if (!s.startsWith(PREFIX)) return null;
  const [id, rawN, hash, ...rest] = s.slice(PREFIX.length).split(":");
  if (rest.length) return null;
  if (!UUID_RE.test(id)) return null;
  if (rawN === undefined) return { id, n: 1, hash: "" };
  if (!/^[1-9][0-9]*$/.test(rawN)) return null;
  return { id, n: Number(rawN), hash: hash === undefined ? "" : hash };
}

export function campaignKey(feedbackId, n, hash) {
  return `${PREFIX}${feedbackId}:${n}:${hash}`;
}

// ⚠️ Counts EVERY row, including status:"failed". `n` is an identity, not a
// success tally: re-using the number of an attempt that already went out — and
// a failed row may well mean the mail left and the ledger write was what broke —
// would file two different letters under one key, in the only record of what a
// user was ever told.
export function nextN(rows, feedbackId) {
  let max = 0;
  for (const r of rows || []) {
    const p = parseCampaign(r?.campaign);
    if (p && p.id === feedbackId && p.n > max) max = p.n;
  }
  return max + 1;
}

// Only `sent` rows block. A failed attempt never reached the person, so
// refusing to retry it would strand the reply with no way to release it.
//
// ⚠️ The two production rows from 07.08 carry no fingerprint, so they match
// nothing here and cannot block a new reply. That is deliberate: we do not know
// what they said, and blocking on an unknown is how a feature becomes unusable.
export function hasFingerprint(rows, feedbackId, hash) {
  if (!hash) return false;
  return (rows || []).some((r) => {
    if (r?.status !== "sent") return false;
    const p = parseCampaign(r?.campaign);
    return !!p && p.id === feedbackId && p.hash === hash;
  });
}

// Ledger rows → { [feedbackId]: { count, lastSentAt, lastStatus } }, for the
// panel badge. Old and new shapes collapse to the same map, which is the point.
export function summarize(rows) {
  const out = {};
  for (const r of rows || []) {
    const p = parseCampaign(r?.campaign);
    if (!p) continue;
    const cur = out[p.id] || { count: 0, lastSentAt: null, lastStatus: "" };
    cur.count += 1;
    const at = r?.sent_at || null;
    if (at && (!cur.lastSentAt || String(at) > String(cur.lastSentAt))) {
      cur.lastSentAt = at;
      cur.lastStatus = r?.status || "";
    } else if (!cur.lastSentAt && !cur.lastStatus) {
      cur.lastStatus = r?.status || "";
    }
    out[p.id] = cur;
  }
  return out;
}
