// scripts/arch-auditor-test.mjs — the auditor must not report what is false,
// and must not stay silent about what is true.
//
// WHY THIS EXISTS. The weekly report carried 16 findings, and the triage on
// 09.08 found three of them false and one check dead. Two separate failures,
// and the dead one is the worse of the pair:
//
//   FALSE POSITIVE (:408). "endpoint ציבורי ללא אימות/הגבלה נראית" fired on
//   api/fx.js and api/symbol-search.js. Both call rateLimit() and both answer
//   429 (fx.js:136/:143, symbol-search.js:32/:39). The title promised to check
//   auth OR rate-limit; the code tested auth only. A report that names a
//   protected endpoint as unprotected teaches Niv to skim the list.
//
//   DEAD CHECK (:241). `noRL.length === apiFiles.length` demanded that EVERY
//   file under api/ lack rate limiting before it would say anything. 12 of 13
//   matched, so the check could never fire — and api/send-invites.js, the one
//   endpoint with no IP limiter, was never mentioned. This is the worse class:
//   the false positive announces itself, the dead check is indistinguishable
//   from a clean bill of health.
//
// The shared defect is an aggregate all-or-nothing condition that silences
// itself. The same shape sat in the RLS check (an unrelated `// Failure policy`
// comment satisfied `\bpolicy\b`) and in the select/limit check (one .limit(1)
// health probe cancelled 21 selects). Per-file answers cannot be silenced by an
// unrelated file, which is the property assertions 1-4 pin.
//
// ACKNOWLEDGED (5-7). A scanner that keeps reporting a decision already taken
// becomes noise, so suppression is allowed — but only WITH a date and a
// reference, only COUNTED out loud, and never by deleting the check. 7 is the
// one that matters: docs/STATE.md:98 names TWO files, so AdminPanel.jsx stays a
// live finding. Silencing it would be widening a decision that was never made.
//
//   node scripts/arch-auditor-test.mjs

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

let mod = null;
let importError = null;
try {
  mod = await import("./arch-auditor.mjs");
} catch (e) {
  importError = e;
}

const REQUIRED = [
  "loadCorpus",
  "apiEndpoints",
  "endpointsMissingRateLimit",
  "endpointsMissingAuth",
  "isAcknowledged",
];
const missing = REQUIRED.filter((n) => typeof mod?.[n] !== "function");

check(
  "0",
  "arch-auditor.mjs exports its checks and does not run the audit on import",
  missing.length === 0,
  importError
    ? `import threw: ${importError.message}`
    : `missing exports: ${missing.join(", ")}. The checks are unreachable while they live ` +
      `inside module-scope functions that only main() calls`
);

if (missing.length) {
  console.log(`\n${ran - failures.length}/${ran} assertions passed  (population: 7 scanner cases + 1 export check)`);
  console.error(`FAILED: ${failures.join(", ")} — remaining assertions cannot run without the exports.`);
  process.exit(1);
}

const { loadCorpus, apiEndpoints, endpointsMissingRateLimit, endpointsMissingAuth, isAcknowledged } = mod;

const corpus = loadCorpus();
const endpoints = apiEndpoints(corpus).map((f) => f.rel);
const noRateLimit = endpointsMissingRateLimit(corpus);
const noAuth = endpointsMissingAuth(corpus);

check(
  "1",
  "api/notify.js is recognised as rate-limited",
  !noRateLimit.includes("api/notify.js"),
  `reported as missing: ${JSON.stringify(noRateLimit)}. notify.js caps 3/10m + 20/24h — ` +
    `a detector that cannot see the existing mechanism is the outdated-pattern failure`
);

check(
  "2",
  "api/send-invites.js IS reported as missing a rate limiter",
  noRateLimit.includes("api/send-invites.js"),
  `reported as missing: ${JSON.stringify(noRateLimit)}. This is the endpoint the all-or-nothing ` +
    `condition swallowed; if it is absent here the check is dead again`
);

check(
  "3",
  "api/fx.js and api/symbol-search.js are NOT reported as unprotected",
  !noAuth.includes("api/fx.js") && !noAuth.includes("api/symbol-search.js"),
  `reported: ${JSON.stringify(noAuth)}. Both call rateLimit() (fx.js:136, symbol-search.js:32) ` +
    `and answer 429 — these were 2 of the 16 findings and both were false`
);

check(
  "4",
  "api/_lib/* is not treated as an endpoint",
  endpoints.length > 0 && !endpoints.some((p) => p.startsWith("api/_lib/")),
  `endpoints=${JSON.stringify(endpoints)}. replyLedger.js is a helper module; calling it an ` +
    `"endpoint without error handling" was finding 14 of 16`
);

const ackBig = (rel, n) =>
  isAcknowledged({ category: "ARCHITECTURE", title: `קובץ ענק (${n} שורות): ${rel}`, evidence: `${rel}:1` });

check(
  "5",
  "the two files STATE.md:98 names are acknowledged, with a date and a reference",
  !!ackBig("SwingEdge_App.jsx", 7504) &&
    !!ackBig("src/i18n.js", 2894) &&
    !!ackBig("SwingEdge_App.jsx", 7504)?.date &&
    !!ackBig("src/i18n.js", 2894)?.ref,
  `App=${JSON.stringify(ackBig("SwingEdge_App.jsx", 7504))} i18n=${JSON.stringify(ackBig("src/i18n.js", 2894))}. ` +
    `A suppression without a date and a reference is an undocumented deletion`
);

check(
  "6",
  "api/send-invites.js rate-limit finding is acknowledged (admin-only path behind is_admin())",
  !!isAcknowledged({
    category: "SECURITY",
    title: "endpoint ללא הגבלת קצב: api/send-invites.js",
    evidence: "api/send-invites.js:1",
  }),
  `not acknowledged. The caps and the is_admin() gate live in the RPC — a rate limit on a locked ` +
    `door is not the missing protection (decision 09.08)`
);

check(
  "7",
  "AdminPanel.jsx is NOT acknowledged — STATE.md:98 names two files, not three",
  !ackBig("src/components/AdminPanel.jsx", 1805),
  `acknowledged=${JSON.stringify(ackBig("src/components/AdminPanel.jsx", 1805))}. Suppressing it ` +
    `would widen a decision that was never taken; it stays a live finding`
);

const passed = ran - failures.length;
console.log(
  `\n${passed}/${ran} assertions passed  (population: ${endpoints.length} api endpoints + ` +
    `${corpus.length} corpus files, read from the working tree)`
);
if (failures.length) {
  console.error(`FAILED: ${failures.join(", ")}`);
  process.exit(1);
}
