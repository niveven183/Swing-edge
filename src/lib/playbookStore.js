// src/lib/playbookStore.js — the ONE place the Playbook is written to localStorage.
//
// WHY. `savePlaybook` was `try { localStorage.setItem(…) } catch {}`: when the quota was
// full the write threw, the catch ate it, React state still held the new setup, and the
// screen looked saved — until a refresh (measured 01.10, B-015: a pre-existing setup list
// came back WITHOUT the new one, and no message ever appeared).
//
// CONTRACT. Never throws, and never reports success it did not get:
//   · "ok"            — the full list is stored.
//   · "image_dropped" — the full list did not fit, so the TARGET setup was stored WITHOUT its
//                       image. ONLY the target loses anything; every other setup's image is
//                       untouched (⛔ no deleting local data to make room).
//   · "failed"        — nothing could be stored. `list` is what the caller should keep on screen;
//                       the caller MUST tell the user.
// `getStorage` is a thunk because merely READING `window.localStorage` can throw (blocked
// storage, some privacy modes) — that has to happen inside the try, not before it.

export const PLAYBOOK_KEY = "swingEdgePlaybook";

export function persistPlaybookSafely(getStorage, updated, targetId = null) {
  try {
    getStorage().setItem(PLAYBOOK_KEY, JSON.stringify(updated));
    return { status: "ok", list: updated };
  } catch (firstError) {
    const target = targetId == null ? null : updated.find((s) => s.id === targetId);
    if (!target || !target.imagePreview) {
      return { status: "failed", list: updated, error: firstError };
    }
    const stripped = updated.map((s) => (s.id === targetId ? { ...s, imagePreview: null } : s));
    try {
      getStorage().setItem(PLAYBOOK_KEY, JSON.stringify(stripped));
      return { status: "image_dropped", list: stripped, error: firstError };
    } catch (secondError) {
      return { status: "failed", list: updated, error: secondError };
    }
  }
}
