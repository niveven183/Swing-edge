// tests-flake/signin.spec.js — B-425 ⓒ (09.11): the scene behind #41 / #42 / #44ⓐ — "sign in, then the first
// anchor never becomes visible" on WebKit/iPhone. HERMETIC ONLY (playwright.flake.config.js, EYE_HERMETIC=1);
// it exists to be run ×N by scripts/probe-scene.mjs, ⛔ collected by the eye config or by prod.
//
// The same steps as overlay.spec.js `login` (the #41 site): load /app, fill, click submit, wait for the
// dashboard tab with the SAME 30s the overlay spec uses — a different bound would measure a different
// population. A red keeps trace + video + screenshot (flake config) — the picture #41 / #42 never had.
import { test, expect } from "@playwright/test";
import { installHermetic, newStore, DUMMY_EMAIL, DUMMY_PASSWORD } from "../tests-eye/hermetic.js";
import { closeCtx } from "../tests-eye/ctxClose.js";

if (process.env.EYE_HERMETIC !== "1") throw new Error("tests-flake/signin.spec.js is hermetic only (EYE_HERMETIC=1)");

const pick = ["viewport", "screen", "userAgent", "deviceScaleFactor", "isMobile", "hasTouch", "locale", "timezoneId"];

for (const lang of ["he", "en"]) {
  test(`SIGNIN · ${lang} — after the login click the dashboard tab becomes visible`, async ({ browser }, info) => {
    const u = info.project.use;
    const ctx = await browser.newContext({ ...Object.fromEntries(pick.filter((k) => u[k] !== undefined).map((k) => [k, u[k]])), baseURL: u.baseURL });
    const store = newStore();
    store.settings.lang = lang;
    await installHermetic(ctx, store);
    await ctx.addInitScript((l) => { if (location.protocol.startsWith("http")) localStorage.setItem("swingEdgeLang", l); }, lang);
    const page = await ctx.newPage();
    try {
      await page.goto("/app", { waitUntil: "load" });
      const decline = page.locator('[data-testid="consent-decline"]');
      if (await decline.isVisible()) await decline.click();
      await page.locator('input[type="email"]').fill(DUMMY_EMAIL);
      await page.locator('input[autocomplete="current-password"]').fill(DUMMY_PASSWORD);
      await page.locator('button[type="submit"]').first().click();
      await expect(page.locator('[data-tour-tab="dashboard"]'), "SIGNIN: the dashboard tab never became visible after the login click").toBeVisible({ timeout: 30_000 });
    } finally {
      await closeCtx(ctx);
    }
  });
}
