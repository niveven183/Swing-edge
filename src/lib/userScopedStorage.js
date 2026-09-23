// src/lib/userScopedStorage.js — what survives a logout, and what must not.
//
// B-361/B-362 context: two accounts share one browser tab. Every `swingEdge*`
// key that describes a PERSON (capital, watchlist, playbook, onboarding…) was
// still sitting in localStorage when the next person signed in, and the
// hydration effect reads some of those keys BEFORE the DB round trip
// (`hadWatchlist` at SwingEdge_App.jsx:1767). Account A's watchlist therefore
// suppressed account B's load and was written back into B's row on the server.
//
// ⛔ THIS IS AN ALLOWLIST, NOT A BLOCKLIST. `DEVICE_KEYS` is the closed set of
// keys that describe the DEVICE rather than the person; everything else under
// the `swingEdge` prefix is deleted. A key added next month is deleted BY
// DEFAULT — the failure direction is "the new setting resets after logout",
// never "the previous user's data leaks into the next user's row". A blocklist
// fails the other way: the one key someone forgot to list is the one that leaks.

// ⚠️ Each entry needs a reason it is device-level. "It felt safe" is not one.
export const DEVICE_KEYS = Object.freeze([
  // 🔴 GDPR. The analytics consent record is a statement about this BROWSER and
  // is read by the head block in index.html before any user exists. Clearing it
  // would silently re-ask — or worse, replay a grant nobody gave.
  "swingEdgeConsent",
  // Read at SwingEdge_App.jsx:1603 BEFORE auth, to pick the UI language of the
  // login screen itself. Clearing it drops the next visitor back to the default
  // language on a screen that has no user to read a preference from.
  "swingEdgeLang",
  // A dismissal of the iOS "add to home screen" prompt. Per-device by
  // definition — the prompt is about this browser, not about a person.
  "swingEdgeIosInstallDismissed",
  // Operator-side overrides, not user state.
  "swingEdgeFeatureFlags",
  "swingEdgeBannedUsers",
]);

const PREFIX = "swingEdge";

// `store` is injectable so the harness can run this against a fake — ⛔ never so
// production can pass something else.
export function clearUserScopedStorage(store) {
  const s = store || (typeof localStorage !== "undefined" ? localStorage : null);
  if (!s) return [];

  // Collect first, delete second. Deleting inside a `key(i)` walk shifts every
  // index above the one removed and silently skips half the keys.
  const doomed = [];
  try {
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (typeof k !== "string" || !k.startsWith(PREFIX)) continue;
      if (DEVICE_KEYS.includes(k)) continue;
      doomed.push(k);
    }
  } catch (e) {
    // A storage we cannot enumerate is a storage we cannot clear. Saying so is
    // the point — a silent return here is the leak coming back.
    console.error("[userScopedStorage] enumeration failed — user-scoped keys NOT cleared", e);
    return [];
  }

  for (const k of doomed) {
    try {
      s.removeItem(k);
    } catch (e) {
      console.error(`[userScopedStorage] failed to remove ${k}`, e);
    }
  }
  return doomed;
}
