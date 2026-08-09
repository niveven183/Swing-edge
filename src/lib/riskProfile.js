// ─── RISK PROFILE — WHERE AN ACCOUNT SIZE BECOMES A RISK POLICY ──────────────
//
// Onboarding asks for a capital amount and the currency it is measured in, and
// turns the pair into a per-trade risk %. The PAIR is the point. Classifying a
// bare amount against a dollar threshold is how ₪10,000 — a small account by
// any reading — walked away with a medium account's risk. That is not a
// hypothetical: 1/2 of the shekel onboardings in production got double the
// risk they should have (AUDIT 2026-08-09 §4א).
//
// ── Why a table per currency, and not a conversion ──────────────────────────
//
// A live rate would make the BOUNDARY move. Two users typing the same ₪15,000
// a month apart would land in different buckets — not because they differ, but
// because the shekel did. fx.js exists to forbid precisely that ("a number
// that moves by itself is a lie"), and a policy edge that drifts with the
// market is not a policy.
//
// This does not contradict the 08.08 decision that an event gets its day's
// rate. That rule preserves a stored VALUE from the past. Nothing is stored
// here: the amount is classified once, only the resulting riskPct is kept, and
// it is never re-derived. There is no past value to freeze.
//
// The ILS row is anchored at a round 3.0 ₪/$ and uses deliberately round
// numbers. It is a DECLARED POLICY, not a quote — which is why it does not go
// stale the way a rate would.
//
// A third currency is a new row here, and nowhere else. `riskProfile-test`
// asserts that every currency the onboarding picker offers has one, so adding
// a picker option without a policy fails the build instead of silently
// classifying shekels as dollars — the exact failure this file was born from.

/** Upper edge of each bucket, in the currency's own units. */
export const BUCKET_THRESHOLDS = {
  USD: { small: 5_000, medium: 25_000, large: 100_000 },
  ILS: { small: 15_000, medium: 75_000, large: 300_000 },
};

/**
 * Which size bucket an account falls in.
 *
 * `currency` must be a key of BUCKET_THRESHOLDS — the onboarding whitelists it
 * before calling, and the test above keeps that guarantee true.
 */
export const bucketFor = (amount, currency) => {
  const n = Number(amount) || 0;
  const t = BUCKET_THRESHOLDS[currency];
  if (!t) return null;
  if (n < t.small) return "small";
  if (n < t.medium) return "medium";
  if (n <= t.large) return "large";
  return "xlarge";
};

/** Per-trade risk %, by bucket and self-reported experience. */
export const riskPctFor = (bucket, experience) => {
  if (bucket === "small") return experience === "beginner" ? 0.5 : 1;
  if (bucket === "medium") return experience === "advanced" ? 1.5 : 1;
  if (bucket === "large") return experience === "advanced" ? 2 : 1.5;
  if (bucket === "xlarge") return experience === "advanced" ? 2.5 : 2;
  return 1;
};

/**
 * Per-share commission assumption. Only the smallest bucket carries one; the
 * larger tiers assume a commission-free broker.
 */
export const commissionFor = (bucket) => (bucket === "small" ? 0.65 : 0);
