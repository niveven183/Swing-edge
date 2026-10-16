// tests-eye/stableTap.js — B-425 (Niv 15.10, ②): tap only once the CARD holding the target has the
// same bounding box in two consecutive animation frames, AFTER it is in view. One copy for every
// spec that taps a small target on a card that is still laying out (R-6).
//
// Why (measured, probe-flake run 38754926645, iphone14/WebKit): `html { scroll-behavior: smooth }`
// (src/index.css) animates Playwright's scroll-into-view, and Playwright's own stability check runs
// BEFORE that scroll. Four H2 reds had the right element under the pointer at dispatch
// (`__playwright_target__` in the trace) and no effect in the app. A condition, ⛔ a waitForTimeout ·
// ⛔ a retry · ⛔ a force-click.
import { expect } from "@playwright/test";

export async function tapWhenStable(page, locator, what) {
  await locator.scrollIntoViewIfNeeded();
  await expect.poll(() => locator.evaluate((el) => new Promise((done) => {
    const card = (el.closest && el.closest("div.rounded-lg")) || el;
    const box = () => [card, el].map((n) => { const r = n.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].join(","); }).join("|");
    requestAnimationFrame(() => { const one = box(); requestAnimationFrame(() => done(one === box())); });
  })), { message: `${what}: its card never held the same box for two frames` }).toBe(true);
  await locator.click();
}
