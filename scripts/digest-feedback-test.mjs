// scripts/digest-feedback-test.mjs — the daily digest must know the reply ledger.
//
// WHY THIS EXISTS. The digest counted `status IS DISTINCT FROM 'resolved'` and
// called the result "פידבקים ממתינים". Measured in production 09.08: 5/8 rows
// are not resolved, but 2 of those 5 had already been answered — the ledger row
// exists, the person got a letter, and the digest still shouted about them every
// morning. An alert that is always lit is an alert that stops being read, and
// that is the failure this file exists to prevent from returning.
//
// The split is two buckets over the SAME population (not-resolved):
//   awaitingReply   — no ledger row  → this is what lights the attention counter
//   repliedPending  — ledger row exists, not yet marked resolved
// `resolved` is in neither. `resolved` AND answered is in neither either — a
// category with zero rows today (0/8), which is exactly why it needs a test:
// nothing in production would notice if it started being counted.
//
// ⚠️ TWO KEY SHAPES, ONE PARSER. The two real ledger rows in production are the
// PRE-2026-08-08 shape `reply:<uuid>` with no counter (42 chars). Every future
// row is `reply:<uuid>:<n>:<h8>`. A classifier that handles only one of them is
// either wrong today or wrong tomorrow. This file pins BOTH — and pins them
// through `parseCampaign` from api/_lib/replyLedger.js, because that module is
// the single source of truth for the key (replyLedger.js:5-7) and a second copy
// of the parse is the exact drift it was built to remove.
//
// ASSERTION 6 IS THE SEPARATING ONE. The snippet must quote the most recent
// feedback that has NO reply — not simply the most recent. On the old code the
// two coincide often enough that a weaker test would pass by luck.
//
//   node scripts/digest-feedback-test.mjs

// Neutralise the module's side effects BEFORE importing it: no DB URL means
// psql is never spawned, no API key means the Anthropic call is skipped, and a
// throwing fetch means no network. On the fixed code the import-guard means
// main() never runs at all; these are belt-and-braces for the pre-fix run.
delete process.env.SUPABASE_DB_URL;
delete process.env.ANTHROPIC_API_KEY;
delete process.env.GITHUB_OUTPUT;
delete process.env.GITHUB_STEP_SUMMARY;
globalThis.fetch = () => Promise.reject(new Error("network disabled in test"));

const failures = [];
let ran = 0;

function check(id, title, cond, detail) {
  ran++;
  if (cond) {
    console.log(`✅ ${id} — ${title}`);
  } else {
    failures.push(id);
    console.log(`❌ ${id} — ${title}\n     ${detail}`);
  }
}

// The two ids that actually carry ledger rows in production (07.08 12:06, 19:09).
const PROD_OLD_A = "eebd6bb1-ff20-4894-9d07-b12026167f2d";
const PROD_OLD_B = "f95b837e-94c7-49cb-893b-4f8242b6f6e9";
const NEW_SHAPE = "11111111-1111-4111-8111-111111111111";
const NO_REPLY_OLD = "22222222-2222-4222-8222-222222222222";
const NO_REPLY_NEW = "33333333-3333-4333-8333-333333333333";
const RESOLVED_PLAIN = "44444444-4444-4444-8444-444444444444";
const RESOLVED_REPLIED = "55555555-5555-4555-8555-555555555555";

let mod = null;
let importError = null;
try {
  mod = await import("./daily-digest.mjs");
} catch (e) {
  importError = e;
}

const classify = mod?.classifyFeedback;

check(
  "0",
  "daily-digest.mjs exports classifyFeedback",
  typeof classify === "function",
  importError
    ? `import threw: ${importError.message}`
    : `export missing — the digest still counts status alone, with no knowledge of the ledger. ` +
      `Exports seen: ${mod ? Object.keys(mod).join(", ") || "(none)" : "(module did not load)"}`
);

if (typeof classify !== "function") {
  console.log(`\n${ran - failures.length}/${ran} assertions passed  (population: 7 classifier cases + 1 export check)`);
  console.error(`FAILED: ${failures.join(", ")} — remaining assertions cannot run without the export.`);
  process.exit(1);
}

// ── the corpus every case below draws from ───────────────────────────────────
const feedback = [
  { id: PROD_OLD_A, status: "new", created_at: "2026-08-01T10:00:00Z" },
  { id: PROD_OLD_B, status: "new", created_at: "2026-08-02T10:00:00Z" },
  { id: NEW_SHAPE, status: "new", created_at: "2026-08-08T10:00:00Z" },
  { id: NO_REPLY_OLD, status: "new", created_at: "2026-08-03T10:00:00Z" },
  { id: NO_REPLY_NEW, status: null, created_at: "2026-08-04T10:00:00Z" },
  { id: RESOLVED_PLAIN, status: "resolved", created_at: "2026-08-05T10:00:00Z" },
  { id: RESOLVED_REPLIED, status: "resolved", created_at: "2026-08-06T10:00:00Z" },
];

const ledger = [
  { campaign: `reply:${PROD_OLD_A}` },
  { campaign: `reply:${PROD_OLD_B}` },
  { campaign: `reply:${NEW_SHAPE}:2:a1b2c3d4` },
  { campaign: `reply:${RESOLVED_REPLIED}:1:deadbeef` },
  { campaign: "why_stopped" },
  { campaign: "waitlist_launch" },
];

const r = classify(feedback, ledger);

check(
  "1",
  "pre-2026-08-08 shape `reply:<uuid>` counts as answered (both real production rows)",
  r.repliedPending === 3 &&
    r.awaitingReply === 2 &&
    !r.awaitingIds?.includes(PROD_OLD_A) &&
    !r.awaitingIds?.includes(PROD_OLD_B),
  `repliedPending=${r.repliedPending} awaitingReply=${r.awaitingReply}. The 07.08 rows carry no ` +
    `:n:h8 — reading them as unanswered puts the two oldest replies back in the morning alert forever`
);

check(
  "2",
  "current shape `reply:<uuid>:<n>:<h8>` counts as answered",
  !r.awaitingIds?.includes(NEW_SHAPE),
  `awaitingIds=${JSON.stringify(r.awaitingIds)} — ${NEW_SHAPE} has a ledger row at n=2 and must not be awaiting`
);

check(
  "3",
  "a not-resolved row with no ledger row is awaiting (null status counts as not-resolved)",
  r.awaitingReply === 2 &&
    r.awaitingIds?.includes(NO_REPLY_OLD) &&
    r.awaitingIds?.includes(NO_REPLY_NEW),
  `awaitingReply=${r.awaitingReply} ids=${JSON.stringify(r.awaitingIds)} — status NULL must behave ` +
    `like the SQL it replaces (IS DISTINCT FROM 'resolved'), not be dropped`
);

check(
  "4",
  "a resolved row with no reply is counted in neither bucket",
  !r.awaitingIds?.includes(RESOLVED_PLAIN) && r.awaitingReply + r.repliedPending === 5,
  `awaiting=${r.awaitingReply} replied=${r.repliedPending} (expected 2+3=5 of 7 rows). ` +
    `Both buckets are over the not-resolved population only`
);

check(
  "5",
  "a resolved row that WAS answered is counted in neither bucket (0/8 in prod today)",
  !r.awaitingIds?.includes(RESOLVED_REPLIED) && r.repliedPending === 3,
  `repliedPending=${r.repliedPending} (expected 3; a 4th would mean RESOLVED_REPLIED was counted). ` +
    `A ledger row must not resurrect a resolved feedback. ` +
    `This category is empty in production, so only this assertion would notice it breaking`
);

check(
  "6",
  "snippet quotes the most recent AWAITING feedback, not the most recent overall",
  r.snippetId === NO_REPLY_NEW,
  `snippetId=${r.snippetId}, expected ${NO_REPLY_NEW} (04.08). The newest row overall is ` +
    `${NEW_SHAPE} (08.08) but it was already answered — quoting it is the old bug in one line`
);

check(
  "7",
  "bulk campaigns never attach to a feedback id",
  r.repliedPending === 3 && r.awaitingReply === 2,
  `email_campaign_log also holds why_stopped / waitlist_launch. parseCampaign returns null for ` +
    `them (replyLedger.js:45-47); coercing them would mark arbitrary feedback as answered`
);

// Empty ledger → the pre-ledger world: everything not-resolved is awaiting.
const empty = classify(feedback, []);
check(
  "8",
  "with an empty ledger every not-resolved row is awaiting (5/7) and the snippet is the newest of them",
  empty.awaitingReply === 5 && empty.repliedPending === 0 && empty.snippetId === NEW_SHAPE,
  `awaiting=${empty.awaitingReply} replied=${empty.repliedPending} snippet=${empty.snippetId} — ` +
    `expected 5/0/${NEW_SHAPE}`
);

const passed = ran - failures.length;
console.log(
  `\n${passed}/${ran} assertions passed  (population: ${feedback.length} feedback rows × ` +
    `${ledger.length} ledger rows, classified through api/_lib/replyLedger.js)`
);
if (failures.length) {
  console.error(`FAILED: ${failures.join(", ")}`);
  process.exit(1);
}
