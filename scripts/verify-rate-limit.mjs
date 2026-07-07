// Standalone check for api/_lib/rateLimit.js — no network, no server, no
// production hit. Run manually: node scripts/verify-rate-limit.mjs
import { rateLimit } from "../api/_lib/rateLimit.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
function assert(cond, msg) {
  if (!cond) {
    failures++;
    console.error(`FAIL: ${msg}`);
  } else {
    console.log(`OK: ${msg}`);
  }
}

async function main() {
  const opts = { windowMs: 200, max: 3 };

  for (let i = 1; i <= 3; i++) {
    const r = rateLimit("test:a", opts);
    assert(r.allowed === true, `request ${i}/3 under max allowed`);
  }

  const blocked = rateLimit("test:a", opts);
  assert(blocked.allowed === false, "request 4 (over max) blocked");
  assert(blocked.retryAfter > 0, "blocked response carries a positive retryAfter");

  await sleep(250);
  const reset = rateLimit("test:a", opts);
  assert(reset.allowed === true, "request after window elapsed is allowed again");

  const other = rateLimit("test:b", opts);
  assert(other.allowed === true, "a different key has its own independent bucket");

  // Sweep-correctness regression check: a short-window key crossing the sweep
  // threshold must never prune a longer-window key's still-fresh history.
  const longKey = "test:long";
  const shortOpts = { windowMs: 50, max: 100 };
  const longOpts = { windowMs: 5000, max: 2 };
  rateLimit(longKey, longOpts); // 1 hit recorded, valid for 5s
  for (let i = 0; i < 20; i++) rateLimit(`test:sweep:${i}`, shortOpts); // churn short-window keys
  await sleep(80); // short-window keys now stale; long key should NOT be
  for (let i = 0; i < 20; i++) rateLimit(`test:sweep:${i + 20}`, shortOpts); // more churn/sweeps
  const longStillCounts = rateLimit(longKey, longOpts);
  assert(
    longStillCounts.allowed === true && longStillCounts.retryAfter === 0,
    "long-window key allowed for its 2nd hit (still has capacity)"
  );
  const longNowBlocked = rateLimit(longKey, longOpts);
  assert(
    longNowBlocked.allowed === false,
    "long-window key correctly blocked at max=2 — its history survived sweeps triggered by short-window keys"
  );

  if (failures > 0) {
    console.error(`\n${failures} assertion(s) failed`);
    process.exit(1);
  }
  console.log("\nAll rate-limit assertions passed");
}

main();
