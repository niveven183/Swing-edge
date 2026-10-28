// tests/lib/qaFixture.js — the QA account's live row is a FIXTURE; say so when it moved.
//
// 🔴 B-465 / INCIDENTS#43 (28.10): the QA row was edited by hand to USD/USD at 07:53 UTC.
// Smoke went red 7/7 (C-061ⓐⓑⓒ) and cents K2 4/4 — and both messages blamed the APP:
// «it read something else» · «the capital settings never reached the app». They had
// reached it. They were USD.
//
// This is ONE pure decision, so the two specs cannot drift apart, and it separates the
// two states a currency poll can see:
//   · not_hydrated — the settings never landed (null) ⇒ an app/network question;
//   · fixture      — they landed and are not what the test needs ⇒ the ACCOUNT moved.
// ⛔ It never relaxes a condition: the need is the test's own, unchanged.
//
// Pure (no Playwright) so `test:diagnosis` can assert it in Node.

/**
 * @param {{ capitalCurrency: ?string, accountCurrency: ?string }} row  what the app hydrated
 * @param {{ expect?: string, not?: string }} need
 *   `expect` — capital AND account must both be this code (cents K2: "ILS");
 *   `not`    — the CAPITAL currency must exist and differ from this code (C-061: "USD").
 * @returns {{ ok: boolean, kind: "ok" | "not_hydrated" | "fixture", message: string }}
 */
export function qaFixtureVerdict(row, need) {
  const cc = row?.capitalCurrency ?? null;
  const ac = row?.accountCurrency ?? null;
  const seen = `${cc ?? "null"}/${ac ?? "null"}`;
  if (!need || (!need.expect && !need.not)) {
    throw new Error("qaFixtureVerdict: `need` must carry `expect` or `not` — a check with no need checks nothing");
  }
  const hydrated = need.expect ? cc != null && ac != null : cc != null;
  if (!hydrated) {
    return {
      ok: false,
      kind: "not_hydrated",
      message: `the capital settings never reached the app (capital/account = ${seen}) — the read did not land; this is the app or the network, not the account`,
    };
  }
  const ok = need.expect ? cc === need.expect && ac === need.expect : cc !== need.not;
  if (ok) return { ok: true, kind: "ok", message: `QA account ${seen} meets the need` };
  const wanted = need.expect ? `${need.expect}/${need.expect}` : `a capital currency other than ${need.not}`;
  return {
    ok: false,
    kind: "fixture",
    message: `PRECONDITION — the QA account is ${seen}; this test needs ${wanted}. The ACCOUNT was edited, not the app (INCIDENTS#43): restore the QA row (B-465), do not change the test.`,
  };
}
