// tests-flake/b435-sequence.spec.js — B-435 (16.10), wave B step B-0: reproduce, on the runner, the
// production loss of a Playbook setup — playbook.spec b's sequence (add a setup with a photo, reload
// IMMEDIATELY, ×5) against the hermetic build. Plan: docs/plans/PLAN-2026-10-16-b432-b435-local-first.md
//
// THE SERVER MODEL. A request the page CANCELS (the reload) is ⛔ applied — what a real server sees when
// the client aborted before the body arrived (production run 38863710385 logged 6× «upsert rejected
// TypeError: Load failed»). RTT + upload time are simulated per request.
//
// SCENES (probe-flake reads them by the leading tag; red = a setup lost = DATA, ⛔ an instrument failure)
//   Q1 model  — the scratch model that went 0/13 locally (RTT 150ms, upload 2MB/s): the control.
//   Q2 quota  — the same + localStorage pre-filled (after login) to EYE_B435_FREE chars below the quota the
//               browser itself reports, so the ~1MB of images (×2: list + mirror) push writes past it.
//               Records every QuotaExceededError the app's storage writes throw — and whether it was said.
// HERMETIC ONLY. Reachable only through scripts/probe-flake.mjs (playwright.flake.config.js).

import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { installHermetic, newStore, DUMMY_EMAIL, DUMMY_PASSWORD } from "../tests-eye/hermetic.js";
import { exactRx, containsRx } from "../tests-eye/labels.js";

const HERMETIC = process.env.EYE_HERMETIC === "1";
const EVIDENCE = process.env.EYE_EVIDENCE_DIR || join(process.cwd(), "eye-evidence", "probe-flake");
const FIXTURES = process.env.EYE_B435_FIXTURES; // dir with F1_1…F1_5.jpg (≥3.5MB photos, playbook.spec's)
const RTT_MS = 150, UPLOAD_BPS = 2e6;
const FREE_CHARS = Number(process.env.EYE_B435_FREE || "1500000");

test.describe("B-435 — a Playbook setup lost after the next add + reload", () => {
  test.skip(!HERMETIC, "hermetic only — scripts/probe-flake.mjs");
  test.skip(!FIXTURES, "EYE_B435_FIXTURES (the F1_* photos) is required");

  let videos = [];
  test.afterEach(async ({}, info) => {
    const v = videos; videos = [];
    for (const p of v) {
      if (info.status !== info.expectedStatus) await info.attach("video", { path: p, contentType: "video/webm" });
      else rmSync(p, { force: true });
    }
  });

  const ctxOpts = (info) => {
    const u = info.project.use;
    const pick = ["viewport", "screen", "userAgent", "deviceScaleFactor", "isMobile", "hasTouch", "locale", "timezoneId"];
    return Object.fromEntries(pick.filter((k) => u[k] !== undefined).map((k) => [k, u[k]]));
  };

  async function run(browser, info, scene, { quota }) {
    test.setTimeout(280_000);
    const ctx = await browser.newContext({ ...ctxOpts(info), baseURL: info.project.use.baseURL, recordVideo: { dir: join(info.outputDir, "diag-video") } });
    const store = newStore();
    Object.assign(store.settings, { lang: "en", playbook: [], watchlist: [], priceAlerts: {} });
    await installHermetic(ctx, store);
    await ctx.addInitScript(() => { if (location.protocol.startsWith("http")) localStorage.setItem("swingEdgeIosInstallDismissed", "1"); });
    // Every storage write that throws, from inside the page, with the key — and the app's own console.
    await ctx.addInitScript(() => {
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) {
        try { return set.call(this, k, v); } catch (e) {
          if (k !== "zzB435Filler") console.debug(`[quota] ${Date.now()} ${k} ${String(v).length} ${e.name}`);
          throw e;
        }
      };
    });
    const t0 = Date.now();
    const events = [];
    const ev = (kind, data = {}) => events.push({ t: Date.now() - t0, kind, ...data });
    const cancelled = new Set();
    ctx.on("console", (m) => {
      const q = /^\[quota\] (\d+) (\S+) (\d+) (\S+)$/.exec(m.text());
      if (q) events.push({ t: Number(q[1]) - t0, kind: "quota", key: q[2], chars: Number(q[3]), error: q[4] });
      else if (m.type() === "error" || m.type() === "warning") ev("console", { type: m.type(), text: m.text().slice(0, 400) });
    });
    ctx.on("requestfailed", (r) => { if (/user_settings/.test(r.url())) { cancelled.add(r); ev("reqfailed", { method: r.method(), failure: r.failure()?.errorText ?? null }); } });
    const names = (body) => { try { const b = JSON.parse(body || "{}"); const row = Array.isArray(b) ? b[0] : b; return (row?.settings?.playbook || []).map((s) => s.name); } catch { return ["UNPARSEABLE"]; } };
    await ctx.route(/\/rest\/v1\/user_settings/, async (route) => {
      const req = route.request();
      if (req.method() !== "POST") return route.fallback();
      const body = req.postData() || "";
      ev("post", { bytes: body.length, playbook: names(body) });
      await new Promise((r) => setTimeout(r, RTT_MS + (body.length / UPLOAD_BPS) * 1000)); // ⚠️ the simulated network, ⛔ a wait for a condition
      if (cancelled.has(req)) { ev("dropped", { bytes: body.length, playbook: names(body) }); return route.abort().catch(() => {}); }
      ev("applied", { bytes: body.length, playbook: names(body) });
      return route.fallback().catch((e) => ev("fallback-error", { error: String(e.message).split("\n")[0] }));
    });
    const page = await ctx.newPage();
    videos.push(await page.video().path());
    const dir = join(EVIDENCE, "hydration", info.project.name);
    mkdirSync(dir, { recursive: true });
    const sfx = info.repeatEachIndex ? `-r${info.repeatEachIndex}` : "";
    const steps = [];
    const toasts = () => page.getByRole("status").allTextContents().catch(() => []);
    try {
      await page.goto("/app");
      await page.locator('[data-testid="consent-decline"]').click();
      await page.locator('input[type="email"]').fill(DUMMY_EMAIL);
      await page.locator('input[autocomplete="current-password"]').fill(DUMMY_PASSWORD);
      await page.locator('button[type="submit"]').first().click();
      await page.locator('[data-tour-tab="dashboard"]').waitFor({ state: "visible", timeout: 30_000 });
      if (quota) {
        // The browser's own quota, measured: fill until it throws, then free FREE_CHARS.
        const q = await page.evaluate((free) => {
          const used = () => { let n = 0; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); n += k.length + (localStorage.getItem(k) || "").length; } return n; };
          let filler = "", step = 1 << 20;
          while (step >= 1024) { try { localStorage.setItem("zzB435Filler", filler + "x".repeat(step)); filler += "x".repeat(step); } catch { step >>= 1; } }
          const capacity = used();
          localStorage.setItem("zzB435Filler", filler.slice(0, Math.max(0, filler.length - free)));
          return { capacityChars: capacity, fillerChars: Math.max(0, filler.length - free), usedAfter: used() };
        }, FREE_CHARS);
        ev("quota-fill", q);
      }
      const panelOf = () => page.getByRole("heading", { name: exactRx("personalPlaybook") }).locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]');
      const openPlaybook = async () => {
        await page.getByRole("button", { name: exactRx("openUserMenu") }).click();
        await page.getByRole("button", { name: exactRx("settings") }).click();
        const p = panelOf(); await p.waitFor({ state: "visible", timeout: 20_000 }); await p.scrollIntoViewIfNeeded(); return p;
      };
      let panel = await openPlaybook();
      for (let k = 1; k <= 5; k++) {
        await panel.getByRole("button", { name: exactRx("addSetup") }).click();
        await panel.getByPlaceholder("Breakout, Pullback…").fill(`b${k}`);
        await panel.locator('input[type="file"]').setInputFiles(join(FIXTURES, `F1_${k}.jpg`));
        await panel.getByText(containsRx("imageLoaded")).waitFor({ state: "visible", timeout: 45_000 });
        await panel.getByRole("button", { name: exactRx("saveSetup") }).click();
        await expect(panel.getByRole("button", { name: exactRx("saveSetup") })).toHaveCount(0, { timeout: 10_000 });
        const before = await toasts();
        ev("saved", { k, toasts: before });
        await page.reload({ waitUntil: "load" }); // ⚠️ IMMEDIATELY — playbook.spec b's shape
        await page.locator('[data-tour-tab="dashboard"]').waitFor({ state: "visible", timeout: 30_000 });
        panel = await openPlaybook();
        // The post-reload hydration has spoken: the read answered and the device list holds every DB item.
        await expect.poll(async () => {
          const local = await page.evaluate(() => JSON.parse(localStorage.getItem("swingEdgePlaybook") || "[]").map((s) => s.name));
          const db = (store.settings.playbook || []).map((s) => s.name);
          return db.every((n) => local.includes(n));
        }, { message: "the device never caught up with the DB after the reload", timeout: 15_000 }).toBe(true);
        const local = await page.evaluate(() => JSON.parse(localStorage.getItem("swingEdgePlaybook") || "[]").map((s) => s.name));
        const journal = await page.evaluate(() => localStorage.getItem("swingEdgeSettingsDelta"));
        const db = (store.settings.playbook || []).map((s) => s.name);
        steps.push({ k, local, db, journal: journal ? JSON.parse(journal) : null, toasts: await toasts() });
        expect(local.sort(), `B-435: after setup ${k} + reload (device)`).toEqual(Array.from({ length: k }, (_, i) => `b${i + 1}`));
      }
    } finally {
      writeFileSync(join(dir, `${scene}${sfx}.json`), JSON.stringify({ scene, steps, db: (store.settings.playbook || []).map((s) => s.name) }, null, 2));
      writeFileSync(join(dir, `${scene}-diag${sfx}.json`), JSON.stringify({ scene, project: info.project.name, repeat: info.repeatEachIndex, events, steps }, null, 2));
      await ctx.close();
    }
  }

  test("Q1 model — the scratch model: a cancelled write ⛔ applied, five setups + immediate reloads", async ({ browser }, info) => {
    await run(browser, info, "Q1", { quota: false });
  });
  test("Q2 quota — the same, with localStorage pre-filled near the browser's own quota", async ({ browser }, info) => {
    await run(browser, info, "Q2", { quota: true });
  });
});
