// tests-flake/debounce-window.spec.js — B-425 (Niv 15.10, fix ①): how long is the settings
// debounce window, and does a reload / tab close INSIDE it lose the edit?
//
// Plan: docs/plans/PLAN-2026-10-15-b425-flake-diagnosis.md §3. HERMETIC ONLY, and reachable only
// through scripts/probe-flake.mjs (playwright.flake.config.js) — ⛔ under tests-eye/, so neither the
// eye config nor the prod job ($SPECS) can collect it.
//
// THIS IS A MEASUREMENT, ⛔ a gate: a lost edit is DATA (written to evidence, counted by
// probe-flake), not a red test. A test here goes red only when the INSTRUMENT could not reach an
// outcome (login · the controls never enabled · the post-reload read never settled).
//
// D1  window      — click «Update Capital» ⇒ ms until the upsert carrying that value leaves the
//                   page. n=30 edits, one page (against DEBOUNCE_MS = 1000, src/lib/userSettings.js).
// D2  reload/δ    — edit ⇒ wait δ ms (the INDEPENDENT VARIABLE — a deliberate delay, ⛔ a wait for a
//                   condition) ⇒ page.reload(). Outcome per trial: was an upsert with the value sent
//                   before the unload · did it reach the server (the hermetic route: a request that
//                   reached the network layer is what a real server would have received) · did it
//                   fail in the page · what the device shows after the reload read (screen + LS).
// D3  close/δ     — the same, with page.close({ runBeforeUnload: true }) and a NEW tab (a user who
//                   closes the tab and comes back).
// K1  alert/δ     — control: a price alert (journal-backed, B-406) with a reload at δ. The journal
//                   lives in localStorage ⇒ expected to survive at every δ.

import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { installHermetic, newStore, DUMMY_EMAIL, DUMMY_PASSWORD } from "../tests-eye/hermetic.js";
import { exactRx, containsRx } from "../tests-eye/labels.js";

const HERMETIC = process.env.EYE_HERMETIC === "1";
const EVIDENCE = process.env.EYE_EVIDENCE_DIR || join(process.cwd(), "eye-evidence", "probe-flake");
const N_WINDOW = 30;
const N_TRIALS = 10;
const DELTAS = [0, 250, 500, 750, 900];
const K1_DELTAS = [0, 500];

test.describe("B-425 — the settings debounce window", () => {
  test.skip(!HERMETIC, "hermetic only — scripts/probe-flake.mjs");

  const ctxOpts = (info) => {
    const u = info.project.use;
    const pick = ["viewport", "screen", "userAgent", "deviceScaleFactor", "isMobile", "hasTouch", "locale", "timezoneId"];
    return Object.fromEntries(pick.filter((k) => u[k] !== undefined).map((k) => [k, u[k]]));
  };

  async function open(browser, info) {
    const ctx = await browser.newContext({ ...ctxOpts(info), baseURL: info.project.use.baseURL });
    const store = newStore();
    Object.assign(store.settings, { lang: "en", playbook: [], watchlist: [], priceAlerts: {} });
    await installHermetic(ctx, store);
    await ctx.addInitScript(() => { if (location.protocol.startsWith("http")) localStorage.setItem("swingEdgeIosInstallDismissed", "1"); });
    const t0 = Date.now();
    const net = [];
    const body = (r) => {
      try { const b = JSON.parse(r.postData() || "null"); const row = Array.isArray(b) ? b[0] : b; return row?.settings ?? null; } catch { return null; }
    };
    const isSettings = (u) => /\/rest\/v1\/user_settings/.test(u);
    ctx.on("request", (r) => { if (isSettings(r.url())) net.push({ t: Date.now() - t0, kind: "req", method: r.method(), settings: r.method() === "GET" ? null : body(r) }); });
    ctx.on("response", (r) => { if (isSettings(r.url())) net.push({ t: Date.now() - t0, kind: "res", method: r.request().method(), status: r.status() }); });
    ctx.on("requestfailed", (r) => { if (isSettings(r.url())) net.push({ t: Date.now() - t0, kind: "failed", method: r.method(), failure: r.failure()?.errorText ?? null, settings: r.method() === "GET" ? null : body(r) }); });
    const dir = join(EVIDENCE, "debounce", info.project.name);
    mkdirSync(dir, { recursive: true });
    const now = () => Date.now() - t0;
    return { ctx, store, net, now, dir };
  }

  const dash = (page) => page.locator('[data-tour-tab="dashboard"]').waitFor({ state: "visible", timeout: 30_000 });
  const capCard = (page) => page.locator("div.rounded-xl", { has: page.getByRole("heading", { name: exactRx("portfolioCapitalTitle") }) }).last();
  const capInput = (page) => capCard(page).locator('input[type="number"]');
  const capBtn = (page) => capCard(page).getByRole("button", { name: exactRx("updateCapital") });
  const capLine = (page) => page.locator("p", { hasText: containsRx("currentCapital") }).first();
  const digits = (s) => Number(String(s).replace(/[^0-9.]/g, ""));

  async function login(page) {
    await page.goto("/app");
    await page.locator('[data-testid="consent-decline"]').click();
    await page.locator('input[type="email"]').click();
    await page.keyboard.type(DUMMY_EMAIL);
    await page.locator('input[autocomplete="current-password"]').click();
    await page.keyboard.type(DUMMY_PASSWORD);
    await page.locator('button[type="submit"]').first().click();
    await dash(page);
    await expect.poll(() => page.evaluate(() => localStorage.getItem("swingEdgeOnboarding")), { message: "the device never became returning" }).not.toBeNull();
  }

  async function openSettings(page) {
    await page.getByRole("button", { name: exactRx("openUserMenu") }).click();
    await page.getByRole("button", { name: exactRx("settings") }).click();
    await expect(capInput(page), "the capital control never enabled — the read never settled").toBeEnabled();
  }

  // The device has settled after a (re)load: the read answered and the screen shows what the DB holds.
  async function settled(page, app, since) {
    await dash(page);
    await expect.poll(() => app.net.some((e) => e.kind === "res" && e.method === "GET" && e.t >= since), { message: "the post-reload settings read never answered" }).toBe(true);
    await openSettings(page);
  }

  async function edit(page, value) {
    await capInput(page).click();
    await page.keyboard.type(String(value));
    await capBtn(page).click();
  }

  const sentWith = (app, v, from, to = Infinity) => app.net.filter((e) => e.kind === "req" && e.method !== "GET" && e.settings?.capital === v && e.t >= from && e.t <= to);

  test("D1 window — ms from «Update Capital» to the upsert that carries the value", async ({ browser }, info) => {
    test.setTimeout(240_000);
    const app = await open(browser, info);
    const page = await app.ctx.newPage();
    const samples = [];
    try {
      await login(page);
      await openSettings(page);
      for (let i = 0; i < N_WINDOW; i++) {
        const v = 20_001 + i;
        await edit(page, v);
        const tClick = app.now();
        await expect.poll(() => sentWith(app, v, tClick).length, { message: `D1 #${i}: no upsert ever carried ${v}` }).toBeGreaterThan(0);
        samples.push(sentWith(app, v, tClick)[0].t - tClick);
      }
    } finally {
      writeFileSync(join(app.dir, `D1${info.repeatEachIndex ? `-r${info.repeatEachIndex}` : ""}.json`), JSON.stringify({ scene: "D1", project: info.project.name, n: samples.length, samplesMs: samples, net: app.net }, null, 2));
      await app.ctx.close();
    }
  });

  for (const how of ["reload", "close"]) {
    for (const delta of DELTAS) {
      const tag = `${how === "reload" ? "D2" : "D3"}-${delta}`;
      test(`${tag} ${how} ${delta}ms after «Update Capital» — is the edit kept?`, async ({ browser }, info) => {
        test.setTimeout(280_000);
        const app = await open(browser, info);
        let page = await app.ctx.newPage();
        const trials = [];
        try {
          await login(page);
          await openSettings(page);
          for (let i = 0; i < N_TRIALS; i++) {
            const v = 30_000 + delta * 10 + i + 1;
            await edit(page, v);
            const tClick = app.now();
            await page.waitForTimeout(delta); // ⚠️ the independent variable, ⛔ a wait for a condition
            const tUnload = app.now();
            if (how === "reload") {
              await page.reload({ waitUntil: "load" });
            } else {
              await page.close({ runBeforeUnload: true });
              await expect.poll(() => page.isClosed(), { message: "the tab never closed" }).toBe(true);
              page = await app.ctx.newPage();
              await page.goto("/app");
            }
            const tBack = app.now();
            // ⚠️ since tUnload, ⛔ tBack: reload() resolves on `load`, by which time the read may have
            // answered already (measured 15.10 — every D2/D3 trial "never answered" with tBack).
            await settled(page, app, tUnload);
            const sentBefore = sentWith(app, v, tClick, tUnload).length > 0;
            const sentAround = sentWith(app, v, tClick, tBack).length > 0;
            // ⚠️ The hermetic route records a body the moment the request is INTERCEPTED — before the
            // page can cancel it (measured 15.10: every D2 flush was `cancelled` 1ms after it left). A
            // real server may never see a request the page cancelled, so `reachedServer` is an UPPER
            // bound and `cancelledInPage` is reported beside it, ⛔ folded into it.
            const failed = app.net.filter((e) => e.kind === "failed" && e.settings?.capital === v);
            const shown = digits(await capLine(page).locator("span").first().textContent());
            const local = Number(await page.evaluate(() => localStorage.getItem("swingEdgeCapital")));
            trials.push({ i, value: v, deltaMs: delta, actualDelayMs: tUnload - tClick, sentBeforeUnload: sentBefore, sentByUnloadFlush: !sentBefore && sentAround,
              cancelledInPage: failed.length > 0, failedInPage: failed.map((f) => f.failure), reachedServer: app.store.settings.capital === v, shownAfter: shown, localAfter: local,
              kept: shown === v && local === v && app.store.settings.capital === v });
          }
        } finally {
          writeFileSync(join(app.dir, `${tag}${info.repeatEachIndex ? `-r${info.repeatEachIndex}` : ""}.json`), JSON.stringify({ scene: tag, how, deltaMs: delta, project: info.project.name, n: trials.length, lost: trials.filter((t) => !t.kept).length,
            byFlush: trials.filter((t) => t.sentByUnloadFlush).length, cancelled: trials.filter((t) => t.cancelledInPage).length, trials, net: app.net }, null, 2));
          await app.ctx.close();
        }
      });
    }
  }

  for (const delta of K1_DELTAS) {
    test(`K1-${delta} control: a price alert with a reload ${delta}ms later (journal-backed) is kept`, async ({ browser }, info) => {
      test.setTimeout(280_000);
      const app = await open(browser, info);
      const page = await app.ctx.newPage();
      const trials = [];
      try {
        await login(page);
        // An OPEN trade to hang the alert on (the H2 path).
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
        // Logging a trade lands on the Journal; the alert button lives on the Dashboard's open
        // positions. H2 reaches it through a reload, so K1 does the same (measured 15.10).
        await page.reload({ waitUntil: "load" });
        await dash(page);
        for (let i = 0; i < N_TRIALS; i++) {
          const v = 200 + delta + i + 1;
          await page.locator('button[title="Price Alert"]').first().click();
          await page.getByPlaceholder("Set target price").fill(String(v));
          await page.getByRole("button", { name: "OK", exact: true }).click();
          await page.waitForTimeout(delta); // ⚠️ the independent variable
          const tUnload = app.now();
          await page.reload({ waitUntil: "load" });
          await dash(page);
          await expect.poll(() => app.net.some((e) => e.kind === "res" && e.method === "GET" && e.t >= tUnload), { message: "the post-reload settings read never answered" }).toBe(true);
          // Kept = the device AND the row hold it once the journal has been replayed and confirmed.
          let kept = true;
          try {
            await expect.poll(async () => JSON.parse((await page.evaluate(() => localStorage.getItem("swingEdgePriceAlerts"))) || "{}").EYEPB, { timeout: 10_000 }).toBe(v);
            await expect.poll(() => app.store.settings.priceAlerts?.EYEPB, { timeout: 10_000 }).toBe(v);
          } catch { kept = false; } // ⚠️ a lost alert is the MEASUREMENT here — recorded below, ⛔ swallowed
          trials.push({ i, value: v, deltaMs: delta, kept, local: JSON.parse((await page.evaluate(() => localStorage.getItem("swingEdgePriceAlerts"))) || "null"), db: app.store.settings.priceAlerts });
        }
      } finally {
        writeFileSync(join(app.dir, `K1-${delta}${info.repeatEachIndex ? `-r${info.repeatEachIndex}` : ""}.json`), JSON.stringify({ scene: `K1-${delta}`, deltaMs: delta, project: info.project.name, n: trials.length, lost: trials.filter((t) => !t.kept).length, trials, net: app.net }, null, 2));
        await app.ctx.close();
      }
    });
  }
});
