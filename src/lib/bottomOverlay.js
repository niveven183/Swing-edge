// src/lib/bottomOverlay.js — ONE source of truth for "how much of the viewport bottom is
// covered by a fixed banner right now" (B-404 · B-405, 04.10).
//
// WHY. Two `fixed bottom` banners — the consent card (src/components/ConsentBanner.jsx) and
// the iOS install prompt (src/components/IOSInstallBanner.jsx) — sat on top of core CTAs on
// short phone viewports: the login/sign-up submit, the FAB and the Log Trade button.
// Measured 04.10 (docs/plans/PLAN-2026-10-04-b404-b405-bottom-overlays.md §0): 18/34 cells
// covered per language, and scrolling could not reveal them (no room below the auth form ·
// Log Trade sits in a fixed modal footer · the FAB hides on scroll).
//
// CONTRACT. Each banner reports the height it covers, measured from the viewport bottom to
// its top edge (`innerHeight - rect.top`, so a lifted lane counts in full). The largest one
// is published as `--se-bottom-overlay` on <html>; layout reserves exactly that much
// (scroll room · FAB lift · modal inset). No banner ⇒ `0px` ⇒ layout identical to before.
// ⛔ It never decides WHETHER a banner shows — consent logic is untouched (legal).

const insets = new Map();
export const OVERLAY_VAR = "--se-bottom-overlay";

/** Pure: the reserve for a set of reported insets. Non-finite or negative reports count as 0. */
export function overlayInset(entries) {
  let max = 0;
  for (const v of entries.values()) if (Number.isFinite(v) && v > max) max = v;
  return Math.ceil(max);
}

function publish() {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty(OVERLAY_VAR, `${overlayInset(insets)}px`);
}

export function setOverlay(id, px) {
  insets.set(id, px);
  publish();
}

export function clearOverlay(id) {
  if (insets.delete(id)) publish();
}

/** How far up from the viewport bottom an element reaches. 0 when it is not on screen. */
export function coveredFromBottom(el) {
  if (!el || typeof window === "undefined") return 0;
  const r = el.getBoundingClientRect();
  if (r.height === 0 || r.top >= window.innerHeight) return 0;
  return Math.max(0, window.innerHeight - r.top);
}
