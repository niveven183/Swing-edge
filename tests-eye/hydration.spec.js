// tests-eye/hydration.spec.js — B-406 · B-397 · B-407: hydration never overwrites what the user did.
//
// Plan: docs/plans/PLAN-2026-10-05-b406-b397-hydration-delta.md
// Diagnosis (the same scenes, measured red on 19959e6): docs/audits/B406-HYDRATION-DIAGNOSIS-2026-10-05.md
//
// HERMETIC ONLY (EYE_HERMETIC=1, tests-eye/hermetic.js): every scene needs the user_settings READ
// held while the user acts, and "another device" writing the row — both are the synthetic
// origin's to give. The production counterpart is step f of tests-eye/playbook.spec.js.
//
// THE WINDOW. Phase 1 logs in and lets the first hydration finish, so the device is RETURNING
// (`swingEdgeOnboarding` exists ⇒ the UI is live before hydration settles — the only state in
// which the window exists; a fresh device waits behind the onboarding gate). Phase 2 reloads
// with the user_settings GET held; the user acts; the read is released; a reload reads back.
//
// SCENES (each a test; the probe scripts/eye-sync-probe.mjs reads them by the leading tag):
//   H1 playbook-window   · a setup added in the window survives (B-406)
//   H2 alerts-window     · a price alert set in the window survives (B-406)
//   H3 other-device      · a setup another device wrote is shown, and NOT erased by this
//                          device's next write (B-397)
//   H4 tombstone         · a setup deleted in the window does NOT come back from the DB
//   H5 fresh-device      · a new browser gets the user's watchlist, ⛔ the defaults (B-407)
//   C1 control-new-user  · no row, nothing local: the app settles (onboarding), nothing journaled
//   C2 control-db-only   · a fresh device with data only in the DB loads all of it

import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { installHermetic, newStore, DUMMY_EMAIL, DUMMY_PASSWORD } from "./hermetic.js";
import { exactRx } from "./labels.js";

const HERMETIC = process.env.EYE_HERMETIC === "1";
const EVIDENCE = process.env.EYE_EVIDENCE_DIR || join(process.cwd(), "eye-evidence");
const DELTA_KEY = "swingEdgeSettingsDelta";

test.describe("B-406 · B-397 · B-407 — hydration merges, ⛔ overwrites", () => {
  test.skip(!HERMETIC, "hermetic only — the production step is playbook.spec.js f");

  const ctxOpts = (info) => {
    const u = info.project.use;
    const pick = ["viewport", "screen", "userAgent", "deviceScaleFactor", "isMobile", "hasTouch", "locale", "timezoneId"];
    return Object.fromEntries(pick.filter((k) => u[k] !== undefined).map((k) => [k, u[k]]));
  };

  async function open(browser, info, seed = {}, { noRow = false } = {}) {
    const ctx = await browser.newContext({ ...ctxOpts(info), baseURL: info.project.use.baseURL });
    const store = newStore();
    store.settings.lang = "en";
    store.settings.playbook = [];
    store.settings.watchlist = [];
    store.settings.priceAlerts = {};
    Object.assign(store.settings, seed);
    await installHermetic(ctx, store);
    // The iOS install banner is not what this suite measures (B-405 has its own gate).
    await ctx.addInitScript(() => { if (location.protocol.startsWith("http")) localStorage.setItem("swingEdgeIosInstallDismissed", "1"); });
    let rowMissing = noRow;
    await ctx.route(/\/rest\/v1\/user_settings/, (route) => {
      const m = route.request().method();
      if (rowMissing && m === "GET") {
        const single = /vnd\.pgrst\.object/.test(route.request().headers()["accept"] || "");
        return route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: single ? "null" : "[]" });
      }
      if (rowMissing && m !== "GET" && m !== "OPTIONS") rowMissing = false; // the first write creates the row
      return route.fallback();
    });
    const gate = { armed: false, held: 0, release: null };
    await ctx.route(/\/rest\/v1\/user_settings/, async (route) => {
      if (route.request().method() === "GET" && gate.armed) {
        gate.held++;
        await new Promise((res) => { gate.release = res; });
      }
      return route.fallback();
    });
    const page = await ctx.newPage();
    const dir = join(EVIDENCE, "hydration", info.project.name);
    mkdirSync(dir, { recursive: true });
    const shot = (name) => page.screenshot({ path: join(dir, `${name}.png`) }).catch(() => {});
    return { ctx, page, store, gate, dir, shot };
  }

  const dash = (page) => page.locator('[data-tour-tab="dashboard"]').waitFor({ state: "visible", timeout: 30_000 });
  const ls = (page, k) => page.evaluate((k) => localStorage.getItem(k), k);
  const json = async (page, k) => JSON.parse((await ls(page, k)) || "null");

  async function login(page) {
    await page.goto("/app");
    await page.locator('[data-testid="consent-decline"]').click({ timeout: 10_000 }).catch(() => {});
    await page.locator('input[type="email"]').fill(DUMMY_EMAIL);
    await page.locator('input[autocomplete="current-password"]').fill(DUMMY_PASSWORD);
    await page.locator('button[type="submit"]').first().click();
    await dash(page);
  }

  // Phase 1 → phase 2: the device is returning, and the next read is held.
  async function reloadIntoWindow(app) {
    const { page, gate } = app;
    await page.waitForTimeout(2_500); // the first hydration + its debounced write settle
    gate.armed = true;
    await page.reload({ waitUntil: "load" });
    await dash(page);
    await expect.poll(() => gate.held, { message: "the user_settings read must be held — otherwise there is no window", timeout: 10_000 }).toBeGreaterThan(0);
  }

  async function releaseAndReload(app) {
    const { page, gate } = app;
    gate.armed = false;
    gate.release?.();
    await page.waitForTimeout(3_500); // hydration + the 1000ms debounce + the upsert
    await page.reload({ waitUntil: "load" });
    await dash(page);
    await page.waitForTimeout(2_500);
  }

  async function openSettings(page) {
    await page.getByRole("button", { name: exactRx("openUserMenu") }).click();
    await page.getByRole("button", { name: exactRx("settings") }).click();
  }

  async function addSetup(page, name) {
    await page.getByRole("button", { name: exactRx("addSetup") }).click();
    await page.getByPlaceholder("Breakout, Pullback…").fill(name);
    await page.getByRole("button", { name: exactRx("saveSetup") }).click();
    await expect(page.getByRole("button", { name: exactRx("saveSetup") })).toHaveCount(0, { timeout: 10_000 });
  }

  const names = (l) => (l || []).map((x) => x.name);
  const evidence = (app, tag, data) => writeFileSync(join(app.dir, `${tag}.json`), JSON.stringify(data, null, 2));

  test("H1 playbook-window — a setup added while the settings read is in flight survives", async ({ browser }, info) => {
    const app = await open(browser, info);
    const { page, store } = app;
    try {
      await login(page);
      await reloadIntoWindow(app);
      await openSettings(page);
      await addSetup(page, "H1-WINDOW");
      await releaseAndReload(app);
      const local = await json(page, "swingEdgePlaybook");
      evidence(app, "H1", { local: names(local), db: names(store.settings.playbook), journal: await ls(page, DELTA_KEY) });
      await app.shot("H1");
      expect(names(local), "B-406: the setup is gone from this device after the read landed").toContain("H1-WINDOW");
      expect(names(store.settings.playbook), "B-406: the setup never reached the DB").toContain("H1-WINDOW");
      expect(await ls(page, DELTA_KEY), "the journal must be empty once the write is confirmed").toBeNull();
    } finally { await app.ctx.close(); }
  });

  test("H2 alerts-window — a price alert set while the settings read is in flight survives", async ({ browser }, info) => {
    const app = await open(browser, info);
    const { page, store } = app;
    try {
      await login(page);
      // An OPEN trade to hang the alert on.
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await page.locator('[data-tour="add-trade"]').click();
      await page.locator("#log-ticker").fill("EYEPB");
      await page.locator("#log-entry").fill("100");
      await page.locator("#log-stop").fill("99");
      await page.locator("#log-target").fill("102");
      const submit = page.getByRole("button", { name: /Log Trade/ });
      await expect(submit).toBeEnabled({ timeout: 25_000 });
      await submit.click();
      await expect(page.locator('[aria-modal="true"]')).toHaveCount(0, { timeout: 20_000 });
      await reloadIntoWindow(app);
      await page.locator('button[title="Price Alert"]').first().click();
      await page.getByPlaceholder("Set target price").fill("105");
      await page.getByRole("button", { name: "OK", exact: true }).click();
      await releaseAndReload(app);
      const local = await json(page, "swingEdgePriceAlerts");
      evidence(app, "H2", { local, db: store.settings.priceAlerts, journal: await ls(page, DELTA_KEY) });
      await app.shot("H2");
      expect(local?.EYEPB, "B-406: the alert is gone from this device after the read landed").toBe(105);
      expect(store.settings.priceAlerts?.EYEPB, "B-406: the alert never reached the DB").toBe(105);
    } finally { await app.ctx.close(); }
  });

  test("H3 other-device — what another device wrote is shown, and this device's write keeps it", async ({ browser }, info) => {
    const app = await open(browser, info, { playbook: [{ id: 1, name: "S1", description: "", imagePreview: null }] });
    const { page, store } = app;
    try {
      await login(page);
      await page.waitForTimeout(2_500);
      // Another device adds S2 to the row; this device's local copy still holds only S1.
      store.settings.playbook = [...store.settings.playbook, { id: 2, name: "S2-OTHER-DEVICE", description: "", imagePreview: null }];
      await page.reload({ waitUntil: "load" });
      await dash(page);
      await page.waitForTimeout(2_500);
      await openSettings(page);
      await expect(page.getByText("S2-OTHER-DEVICE", { exact: true }), "B-397: the other device's setup is hidden by the stale local copy").toBeVisible();
      await addSetup(page, "S3-THIS-DEVICE");
      await page.waitForTimeout(2_500);
      evidence(app, "H3", { db: names(store.settings.playbook) });
      await app.shot("H3");
      expect(names(store.settings.playbook), "B-397: this device's write erased the other device's setup").toEqual(expect.arrayContaining(["S1", "S2-OTHER-DEVICE", "S3-THIS-DEVICE"]));
    } finally { await app.ctx.close(); }
  });

  test("H4 tombstone — a setup deleted while the read is in flight does not come back", async ({ browser }, info) => {
    const S = (id, name) => ({ id, name, description: "", imagePreview: null });
    const app = await open(browser, info, { playbook: [S(1, "KEEP"), S(2, "H4-DELETE-ME")] });
    const { page, store } = app;
    try {
      await login(page);
      await reloadIntoWindow(app);
      await openSettings(page);
      const card = page.locator("div.overflow-hidden").filter({ has: page.locator("span", { hasText: /^H4-DELETE-ME$/ }) });
      await card.locator("button:has(svg)").first().click();
      await expect(page.getByText("H4-DELETE-ME", { exact: true })).toHaveCount(0, { timeout: 10_000 });
      await releaseAndReload(app);
      const local = await json(page, "swingEdgePlaybook");
      evidence(app, "H4", { local: names(local), db: names(store.settings.playbook) });
      await app.shot("H4");
      expect(names(local), "the deleted setup came back from the DB").not.toContain("H4-DELETE-ME");
      expect(names(store.settings.playbook), "the deleted setup is still in the DB").not.toContain("H4-DELETE-ME");
      expect(names(local), "the setup that was NOT deleted is gone").toContain("KEEP");
    } finally { await app.ctx.close(); }
  });

  test("H5 fresh-device — a new browser gets the user's watchlist, not the defaults", async ({ browser }, info) => {
    const mine = [{ ticker: "AAPL", setup: "Custom", chartSym: "NASDAQ:AAPL" }, { ticker: "KO", setup: "Custom", chartSym: "NYSE:KO" }];
    const app = await open(browser, info, { watchlist: mine });
    const { page, store } = app;
    try {
      await login(page);
      await page.waitForTimeout(3_500);
      const local = await json(page, "swingEdgeWatchlist");
      evidence(app, "H5", { local: (local || []).map((w) => w.ticker), db: (store.settings.watchlist || []).map((w) => w.ticker) });
      expect((local || []).map((w) => w.ticker), "B-407: the default watchlist replaced the user's on this device").toEqual(["AAPL", "KO"]);
      expect((store.settings.watchlist || []).map((w) => w.ticker), "B-407: the default watchlist was written over the user's in the DB").toEqual(["AAPL", "KO"]);
    } finally { await app.ctx.close(); }
  });

  test("C1 control-new-user — no row, nothing local: the app settles (onboarding), nothing journaled", async ({ browser }, info) => {
    const app = await open(browser, info, {}, { noRow: true });
    const { page, store } = app;
    try {
      await page.goto("/app");
      await page.locator('[data-testid="consent-decline"]').click({ timeout: 10_000 }).catch(() => {});
      await page.locator('input[type="email"]').fill(DUMMY_EMAIL);
      await page.locator('input[autocomplete="current-password"]').fill(DUMMY_PASSWORD);
      await page.locator('button[type="submit"]').first().click();
      // A brand-new user lands on the onboarding questionnaire (or the dashboard) — ⛔ a hang.
      await expect(page.locator('[data-tour-tab="dashboard"]').or(page.getByRole("heading", { level: 1, name: /SwingEdge/ })).first()).toBeVisible({ timeout: 20_000 });
      await page.waitForTimeout(2_500);
      evidence(app, "C1", { journal: await ls(page, DELTA_KEY) });
      await app.shot("C1");
      expect(await ls(page, DELTA_KEY), "a new user has no device changes to journal").toBeNull();
    } finally { await app.ctx.close(); }
  });

  test("C2 control-db-only — a fresh device with data only in the DB loads all of it", async ({ browser }, info) => {
    const app = await open(browser, info, {
      playbook: [{ id: 1, name: "DB-ONLY", description: "", imagePreview: null }],
      priceAlerts: { AAPL: 300 },
    });
    const { page } = app;
    try {
      await login(page);
      await page.waitForTimeout(3_000);
      await openSettings(page);
      await expect(page.getByText("DB-ONLY", { exact: true })).toBeVisible();
      expect((await json(page, "swingEdgePriceAlerts"))?.AAPL).toBe(300);
      await app.shot("C2");
    } finally { await app.ctx.close(); }
  });
});
