// tests-eye/scalars.spec.js — B-408 closure on PRODUCTION (QA account), Pixel 7 + iPhone 14.
//
// Plan: docs/plans/PLAN-2026-10-14-b408-scalar-edit-gate.md · Diagnosis:
// docs/audits/B408-SCALAR-HYDRATION-DIAGNOSIS-2026-10-14.md · Hermetic red-before + mutants:
// tests-eye/hydration.spec.js H6 · C3 · C4 · C5 via scripts/eye-sync-probe.mjs.
//
// THE CLAIM (closure condition, Niv 14.10): while the settings read is in flight the nine
// Settings controls are DISABLED and the cards say «loading»; once the read lands an edit,
// TYPED, survives a reload and is written to the DB row.
//
// `@deployed`: production must carry the fix. eye-playbook.yml runs only playbook.spec on a
// pull_request, so this file runs on push to main (after wait-deploy), dispatch and schedule.
//
// QA ROW HYGIENE: the capital is edited through the app and restored through the app; the blob
// sha256 must be identical before/after. A restore that did not land is repaired over REST only
// after every context is closed (K6) — and the scene is RED anyway.
// ⛔ fill · ⛔ addLocatorHandler · ⛔ retry · ⛔ timed waits — conditions only.

import { test, expect } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { exactRx, containsRx } from "./labels.js";
import { settingsSnapshot, restoreCapital } from "./qaRest.js";

const HERMETIC = process.env.EYE_HERMETIC === "1";
const QA_EMAIL = process.env.SENTINEL_QA_EMAIL;
const QA_PASSWORD = process.env.SENTINEL_QA_PASSWORD;
const EVIDENCE = process.env.EYE_EVIDENCE_DIR || join(process.cwd(), "eye-evidence");

// Same derivation as playbook.spec: the iOS install banner's dismissal key, read from the
// component, exactly-once or hard red (B-272). Set BEFORE the first navigation — ⛔ a handler.
const IOS_DISMISS_KEY = (() => {
  const src = readFileSync(join(process.cwd(), "src", "components", "IOSInstallBanner.jsx"), "utf8");
  const m = [...src.matchAll(/const DISMISS_KEY = "([^"]+)";/g)];
  if (m.length !== 1) throw new Error(`[eye] IOSInstallBanner DISMISS_KEY matched ${m.length}× (must be 1) — refusing to guess the key (B-272)`);
  return m[0][1];
})();

test.describe("B-408 · @deployed the five scalars wait for the settings read", () => {
  test.skip(HERMETIC, "production only — the hermetic scenes are hydration.spec.js H6 · C3 · C4 · C5");
  // ⛔ a silent skip on CI: missing credentials there is RED (the test below asserts them).
  test.skip(!process.env.CI && !(QA_EMAIL && QA_PASSWORD), "local run without QA credentials");

  const ctxOpts = (info) => {
    const u = info.project.use;
    const pick = ["viewport", "screen", "userAgent", "deviceScaleFactor", "isMobile", "hasTouch", "locale", "timezoneId", "colorScheme"];
    return Object.fromEntries(pick.filter((k) => u[k] !== undefined).map((k) => [k, u[k]]));
  };
  const dash = (page) => page.locator('[data-tour-tab="dashboard"]').waitFor({ state: "visible", timeout: 30_000 });
  const card = (page, key) => page.locator("div.rounded-xl", { has: page.getByRole("heading", { name: exactRx(key) }) }).last();
  const ccyBox = (page, key) => page.locator("div.mt-4", { has: page.getByRole("heading", { name: exactRx(key) }) }).last();
  const capLine = (page) => page.locator("p", { hasText: containsRx("currentCapital") }).first();
  const ctl = (page) => ({
    lang: card(page, "language").locator("select"),
    capitalInput: card(page, "portfolioCapitalTitle").locator('input[type="number"]'),
    capitalBtn: card(page, "portfolioCapitalTitle").getByRole("button", { name: exactRx("updateCapital") }),
    capUSD: ccyBox(page, "capitalCurrencyTitle").getByRole("button", { name: /USD/ }),
    capILS: ccyBox(page, "capitalCurrencyTitle").getByRole("button", { name: /ILS/ }),
    accUSD: ccyBox(page, "accountCurrencyTitle").getByRole("button", { name: /USD/ }),
    accILS: ccyBox(page, "accountCurrencyTitle").getByRole("button", { name: /ILS/ }),
    riskInput: card(page, "riskPerTradeTitle").locator('input[type="number"]'),
    riskBtn: card(page, "riskPerTradeTitle").getByRole("button", { name: exactRx("updateRisk") }),
  });
  const statusLines = (page) => page.locator('p[role="status"]').filter({ hasText: exactRx("loading") });
  const digits = (s) => Number(String(s).replace(/[^0-9.]/g, ""));

  async function openSettings(page) {
    await page.getByRole("button", { name: exactRx("openUserMenu") }).click();
    await page.getByRole("button", { name: exactRx("settings") }).click();
  }
  async function typeInto(page, locator, text) {
    await locator.click();
    await page.keyboard.type(text);
  }
  async function setCapital(page, value) {
    const c = ctl(page);
    await typeInto(page, c.capitalInput, String(value));
    await c.capitalBtn.click();
    await expect.poll(async () => digits(await capLine(page).locator("span").first().textContent()), { message: "the capital on screen did not take the typed value" }).toBe(value);
  }

  test("g · @deployed in the window the controls are locked; an edit after the read survives a reload and reaches the row", async ({ browser }, info) => {
    expect(!!(QA_EMAIL && QA_PASSWORD), "SENTINEL_QA_EMAIL / SENTINEL_QA_PASSWORD are not reaching the test process").toBe(true);
    const dir = join(EVIDENCE, "scalars", info.project.name);
    mkdirSync(dir, { recursive: true });
    const before = await settingsSnapshot(QA_EMAIL, QA_PASSWORD);
    expect(typeof before.capital === "number" && before.capital > 0, "the QA row carries no positive capital — nothing honest to restore").toBe(true);
    const target = before.capital + 1; // distinct, harmless, and restored below
    const report = { before: { sha: before.sha.slice(0, 16) }, steps: {} };

    const ctx = await browser.newContext({ ...ctxOpts(info), baseURL: info.project.use.baseURL });
    let restoredInApp = false;
    let bodyPassed = false;
    try {
      const page = await ctx.newPage();
      await page.addInitScript((k) => { if (location.protocol.startsWith("http")) localStorage.setItem(k, "1"); }, IOS_DISMISS_KEY);
      const shot = (name) => page.screenshot({ path: join(dir, `${name}.png`), mask: [page.locator("header"), page.getByText(/@/)] });

      // Login, typed. A fresh context ⇒ the consent banner IS shown: declined as a user would.
      await page.goto("/app", { waitUntil: "load" });
      await page.locator('[data-testid="consent-decline"]').click();
      await typeInto(page, page.locator('input[type="email"]'), QA_EMAIL);
      await typeInto(page, page.locator('input[autocomplete="current-password"]'), QA_PASSWORD);
      await page.locator('button[type="submit"]').first().click();
      await dash(page);
      await expect.poll(() => page.evaluate(() => localStorage.getItem("swingEdgeOnboarding")), { message: "the QA device never became returning — there is no window" }).not.toBeNull();

      // The window: hold the settings READ in this browser (a GET — the hold writes nothing).
      let held = 0, release = null, armed = true;
      await page.route(/\/rest\/v1\/user_settings/, async (route) => {
        if (armed && route.request().method() === "GET") { held++; await new Promise((r) => { release = r; }); }
        return route.fallback();
      });
      await page.reload({ waitUntil: "load" });
      await dash(page);
      await expect.poll(() => held, { message: "the settings read was not held — there is no window to test" }).toBeGreaterThan(0);
      await openSettings(page);
      for (const [name, loc] of Object.entries(ctl(page))) await expect(loc, `B-408: ${name} is editable while the settings read is in flight`).toBeDisabled();
      await expect(statusLines(page), "B-408: the cards must say «loading» while locked").toHaveCount(3);
      await shot("g-1-window-locked");
      report.steps.window = "9 disabled · 3 status";

      armed = false;
      release?.();
      for (const [name, loc] of Object.entries(ctl(page))) await expect(loc, `B-408: ${name} stayed locked after the read landed`).toBeEnabled();
      await setCapital(page, target);
      await expect.poll(async () => (await settingsSnapshot(QA_EMAIL, QA_PASSWORD)).capital, { message: "B-408: the typed capital never reached the DB row", timeout: 20_000 }).toBe(target);
      report.steps.db = "typed capital in the row";

      await page.reload({ waitUntil: "load" });
      await dash(page);
      await openSettings(page);
      await expect(ctl(page).capitalInput).toBeEnabled();
      await expect.poll(async () => digits(await capLine(page).locator("span").first().textContent()), { message: "B-408: the capital did not survive the reload" }).toBe(target);
      await shot("g-2-after-reload");
      report.steps.reload = "typed capital after reload";

      // Restore through the app, the same way.
      await setCapital(page, before.capital);
      await expect.poll(async () => (await settingsSnapshot(QA_EMAIL, QA_PASSWORD)).capital, { message: "the in-app restore never reached the row", timeout: 20_000 }).toBe(before.capital);
      restoredInApp = true;
      bodyPassed = true;
    } finally {
      await ctx.close();
      let after = await settingsSnapshot(QA_EMAIL, QA_PASSWORD);
      if (after.capital !== before.capital) {
        after = await restoreCapital(QA_EMAIL, QA_PASSWORD, before.capital);
        report.restNet = "capital restored over REST (the in-app restore did not land)";
      }
      report.after = { sha: after.sha.slice(0, 16), identical: after.sha === before.sha, restoredInApp };
      writeFileSync(join(dir, "g.json"), JSON.stringify(report, null, 2));
      console.log(`[B-408] ${info.project.name}: blob sha256 ${report.before.sha} → ${report.after.sha} · ${report.after.identical ? "identical" : "CHANGED"} · restored in app: ${restoredInApp}`);
      // ⚠️ Asserted only when the body passed: a throw from `finally` would REPLACE the body's
      // error and hide the real red. The comparison is still measured and printed either way.
      if (bodyPassed) expect(after.sha, "the QA blob is not byte-identical after the scene").toBe(before.sha);
    }
  });
});
