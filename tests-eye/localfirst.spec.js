// tests-eye/localfirst.spec.js — B-432 + B-435 closure on PRODUCTION (QA account), Pixel 7 + iPhone 14.
//
// Plan: docs/plans/PLAN-2026-10-16-b432-b435-local-first.md · Hermetic red-before + mutants:
// tests-flake/debounce-window.spec.js D4 (PRE-B432 50/50 lost ⇒ HEAD 0/50) · scripts/pending-mutants.mjs ·
// test:settings 13 · test:hydration P1–P6.
//
// THE CLAIM (closure, Niv 16.10): an edit followed by a reload WITHIN A SECOND survives — in the DB row, on both
// devices. h1: the capital (a scalar — the pending, layer 1, + keepalive, layer 2). h2: a Playbook setup (the B-435
// shape — the delta journal). The click→reload interval is MEASURED and must be < 1000ms, or the scene measured
// nothing.
//
// `@deployed`: production must carry the fix ⇒ runs on push to main (after wait-deploy), dispatch and schedule
// (eye-playbook.yml runs only playbook.spec on a pull_request).
//
// QA ROW HYGIENE: the capital is restored through the app and the setup deleted through the app; the blob sha256
// must be identical before/after (a restore that did not land is repaired over REST only after every context is
// closed — K6 — and the scene is RED anyway). The setup carries the e2e prefix, so the C-064 sweep is the net.
// ⛔ fill · ⛔ addLocatorHandler · ⛔ retry · ⛔ timed waits — conditions only.

import { test, expect } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { exactRx, containsRx } from "./labels.js";
import { settingsSnapshot, settingsDiag, restoreCapital, sweep, PREFIX_ROOT } from "./qaRest.js";
import { attachB435Diag } from "./b435diag.js";

const HERMETIC = process.env.EYE_HERMETIC === "1";
const QA_EMAIL = process.env.SENTINEL_QA_EMAIL;
const QA_PASSWORD = process.env.SENTINEL_QA_PASSWORD;
const EVIDENCE = process.env.EYE_EVIDENCE_DIR || join(process.cwd(), "eye-evidence");
const RUN = process.env.GITHUB_RUN_ID || "local";

const IOS_DISMISS_KEY = (() => {
  const src = readFileSync(join(process.cwd(), "src", "components", "IOSInstallBanner.jsx"), "utf8");
  const m = [...src.matchAll(/const DISMISS_KEY = "([^"]+)";/g)];
  if (m.length !== 1) throw new Error(`[eye] IOSInstallBanner DISMISS_KEY matched ${m.length}× (must be 1) — refusing to guess the key (B-272)`);
  return m[0][1];
})();

test.describe("B-432 · B-435 · @deployed an edit reloaded within a second survives in the row", () => {
  test.skip(HERMETIC, "production only — the hermetic scenes are debounce-window.spec.js D4/D5 + b435-sequence.spec.js");
  test.skip(!process.env.CI && !(QA_EMAIL && QA_PASSWORD), "local run without QA credentials");

  const ctxOpts = (info) => {
    const u = info.project.use;
    const pick = ["viewport", "screen", "userAgent", "deviceScaleFactor", "isMobile", "hasTouch", "locale", "timezoneId", "colorScheme"];
    return Object.fromEntries(pick.filter((k) => u[k] !== undefined).map((k) => [k, u[k]]));
  };
  const dash = (page) => page.locator('[data-tour-tab="dashboard"]').waitFor({ state: "visible", timeout: 30_000 });
  const capCard = (page) => page.locator("div.rounded-xl", { has: page.getByRole("heading", { name: exactRx("portfolioCapitalTitle") }) }).last();
  const capLine = (page) => page.locator("p", { hasText: containsRx("currentCapital") }).first();
  const panelOf = (page) => page.getByRole("heading", { name: exactRx("personalPlaybook") }).locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]');
  const digits = (s) => Number(String(s).replace(/[^0-9.]/g, ""));
  const shown = async (page) => digits(await capLine(page).locator("span").first().textContent());

  async function openSettings(page) {
    await page.getByRole("button", { name: exactRx("openUserMenu") }).click();
    await page.getByRole("button", { name: exactRx("settings") }).click();
    await expect(capCard(page).locator('input[type="number"]'), "the capital control never enabled — the read never settled").toBeEnabled();
  }
  async function typeInto(page, locator, text) {
    await locator.click();
    await page.keyboard.type(text);
  }
  // Click «Update Capital» and reload AT ONCE. Returns ms from the click resolving to the reload being ISSUED
  // (the unload) — ⛔ to the load finishing, which on production alone can exceed a second.
  async function editAndReload(page, value) {
    await typeInto(page, capCard(page).locator('input[type="number"]'), String(value));
    await capCard(page).getByRole("button", { name: exactRx("updateCapital") }).click();
    const tClick = Date.now();
    const reloading = page.reload({ waitUntil: "load" });
    const issuedMs = Date.now() - tClick;
    await reloading;
    return issuedMs;
  }

  test("h · @deployed capital + setup, each reloaded within a second, reach the row and survive", async ({ browser }, info) => {
    expect(!!(QA_EMAIL && QA_PASSWORD), "SENTINEL_QA_EMAIL / SENTINEL_QA_PASSWORD are not reaching the test process").toBe(true);
    const dir = join(EVIDENCE, "localfirst", info.project.name);
    mkdirSync(dir, { recursive: true });
    const before = await settingsSnapshot(QA_EMAIL, QA_PASSWORD);
    expect(typeof before.capital === "number" && before.capital > 0, "the QA row carries no positive capital — nothing honest to restore").toBe(true);
    expect(before.ours, "e2e setups already in the QA row — a crashed run left residue (the sweep is the net)").toEqual([]);
    const target = before.capital + 2;
    const setupName = `${PREFIX_ROOT}lf-${RUN}-${info.project.name}`;
    const report = { before: { sha: before.sha.slice(0, 16) }, steps: {} };

    const ctx = await browser.newContext({ ...ctxOpts(info), baseURL: info.project.use.baseURL });
    let bodyPassed = false;
    let diagRef = null;
    try {
      const page = await ctx.newPage();
      // B-435 (Niv 17.10, 2ב): the detector, attached before the first navigation.
      const diag = await attachB435Diag(page, { label: "localfirst-h", project: info.project.name, prefix: PREFIX_ROOT, dir, snapshot: () => settingsDiag(QA_EMAIL, QA_PASSWORD) });
      diagRef = diag;
      await page.addInitScript((k) => { if (location.protocol.startsWith("http")) localStorage.setItem(k, "1"); }, IOS_DISMISS_KEY);
      const shot = (name) => page.screenshot({ path: join(dir, `${name}.png`), mask: [page.locator("header"), page.getByText(/@/)] });
      await page.goto("/app", { waitUntil: "load" });
      await page.locator('[data-testid="consent-decline"]').click();
      await typeInto(page, page.locator('input[type="email"]'), QA_EMAIL);
      await typeInto(page, page.locator('input[autocomplete="current-password"]'), QA_PASSWORD);
      await page.locator('button[type="submit"]').first().click();
      await dash(page);
      await openSettings(page);
      await diag.step("start");

      // h1 — the scalar.
      const ms1 = await editAndReload(page, target);
      report.steps.capitalClickToReloadMs = ms1;
      expect(ms1, "the reload did not follow the click within a second — the scene measured nothing").toBeLessThan(1000);
      await dash(page);
      await diag.step("h1"); // before the row assertion: a red step still carries its line
      await expect.poll(async () => (await settingsSnapshot(QA_EMAIL, QA_PASSWORD)).capital, { message: "B-432: the capital edited and reloaded within a second never reached the row", timeout: 20_000 }).toBe(target);
      await openSettings(page);
      await expect.poll(() => shown(page), { message: "B-432: the capital did not survive the reload on screen" }).toBe(target);
      await shot("h1-capital-after-reload");
      report.steps.capital = "in the row + on screen";

      // h2 — the Playbook setup (the B-435 shape: add, reload at once).
      const panel = panelOf(page);
      await panel.scrollIntoViewIfNeeded();
      await panel.getByRole("button", { name: exactRx("addSetup") }).click();
      await panel.getByPlaceholder("Breakout, Pullback…").fill(setupName);
      await panel.getByRole("button", { name: exactRx("saveSetup") }).click();
      const t2 = Date.now();
      const reloading2 = page.reload({ waitUntil: "load" });
      report.steps.setupClickToReloadMs = Date.now() - t2; // to the reload being issued (the unload)
      await reloading2;
      expect(report.steps.setupClickToReloadMs, "the reload did not follow the save within a second").toBeLessThan(1000);
      await dash(page);
      await diag.step("h2");
      await diag.flush(); // the h2 row read lands before the cleanup below writes
      await expect.poll(async () => (await settingsSnapshot(QA_EMAIL, QA_PASSWORD)).ours, { message: "B-435: the setup saved and reloaded within a second never reached the row", timeout: 20_000 }).toContain(setupName);
      await openSettings(page);
      await expect(panelOf(page).getByText(setupName, { exact: true }), "B-435: the setup is gone from the device after the reload").toBeVisible();
      await shot("h2-setup-after-reload");
      report.steps.setup = "in the row + on screen";

      // Clean up through the app: delete the setup, restore the capital (normal pace — the 2xx is awaited).
      await panelOf(page).locator("div.overflow-hidden").filter({ has: page.locator("span", { hasText: new RegExp(`^${setupName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) }) }).locator("button:has(svg)").first().click();
      await expect.poll(async () => (await settingsSnapshot(QA_EMAIL, QA_PASSWORD)).ours, { message: "the in-app delete never reached the row", timeout: 20_000 }).toEqual([]);
      await typeInto(page, capCard(page).locator('input[type="number"]'), String(before.capital));
      await capCard(page).getByRole("button", { name: exactRx("updateCapital") }).click();
      await expect.poll(async () => (await settingsSnapshot(QA_EMAIL, QA_PASSWORD)).capital, { message: "the in-app capital restore never reached the row", timeout: 20_000 }).toBe(before.capital);
      bodyPassed = true;
    } finally {
      // B-435: the last row read lands in the log BEFORE the cleanup below rewrites the row.
      if (diagRef) await diagRef.flush();
      await ctx.close();
      let after = await settingsSnapshot(QA_EMAIL, QA_PASSWORD);
      if (after.ours.length) { await sweep(QA_EMAIL, QA_PASSWORD); report.restNet = "e2e setup swept over REST"; after = await settingsSnapshot(QA_EMAIL, QA_PASSWORD); }
      if (after.capital !== before.capital) { after = await restoreCapital(QA_EMAIL, QA_PASSWORD, before.capital); report.restNet = `${report.restNet ? report.restNet + " · " : ""}capital restored over REST`; }
      report.after = { sha: String(after.sha).slice(0, 16), identical: after.sha === before.sha };
      writeFileSync(join(dir, "h.json"), JSON.stringify(report, null, 2));
      console.log(`[B-432/B-435] ${info.project.name}: click→reload ${report.steps.capitalClickToReloadMs}ms/${report.steps.setupClickToReloadMs}ms · blob ${report.before.sha} → ${report.after.sha} · ${report.after.identical ? "identical" : "CHANGED"}`);
      if (bodyPassed) expect(after.sha, "the QA blob is not byte-identical after the scene").toBe(before.sha);
    }
  });
});
