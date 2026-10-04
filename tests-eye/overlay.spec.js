// tests-eye/overlay.spec.js — B-404 · B-405: no bottom banner may cover a core CTA on a phone.
//
// Plan: docs/plans/PLAN-2026-10-04-b404-b405-bottom-overlays.md
//
// ⛔ NO `addLocatorHandler`, ⛔ no closing a banner to "get it out of the way". That is exactly
// what hid both bugs in tests-eye/playbook.spec.js (C-064): the suite dismissed the consent and
// iOS banners like a user, so it could never see that a user who had NOT dismissed them was
// looking at a dead button. Here the banners stay up and every CTA must still be reachable.
//
// THE CHECK, per target: scroll it into view the way a user would (`scrollIntoViewIfNeeded`),
// then `elementFromPoint` at its centre must be the target itself (or inside it). A covered
// centre is red with the name of what covers it. Login is additionally CLICKED for real
// (Playwright's actionability refuses a covered element) — ⛔ a JS `el.click()` anywhere here.
//
// TWO SCENARIOS
//   consent — fresh device, no consent choice ever made: the consent card stays up through
//             login · sign-up · FAB · Log Trade · Save Setup.
//   ios     — iOS UA only: consent declined (the iOS banner arms after a choice). The banner
//             must NOT appear before a first logged trade (B-405 timing), must NOT sit over an
//             open modal, and when it IS up the FAB and Save Setup must stay clear.
//
// TARGETS: hermetic (EYE_HERMETIC=1, tests-eye/hermetic.js — creates one trade to arm the iOS
// banner) and production (QA account, every REST write blocked locally — the suite only
// reads; the iOS "banner shown" half runs only if the QA journal already holds a trade, and
// says so).

import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { blockAllRestWrites, redact } from "../tests/lib/eyeTools.js";
import { exactRx } from "./labels.js";
import { installHermetic, newStore, DUMMY_EMAIL, DUMMY_PASSWORD } from "./hermetic.js";

const HERMETIC = process.env.EYE_HERMETIC === "1";
const QA_EMAIL = HERMETIC ? DUMMY_EMAIL : process.env.SENTINEL_QA_EMAIL;
const QA_PASSWORD = HERMETIC ? DUMMY_PASSWORD : process.env.SENTINEL_QA_PASSWORD;
const EVIDENCE = process.env.EYE_EVIDENCE_DIR || join(process.cwd(), "eye-evidence");
const IOS_BANNER_TEXT = "התקן את SwingEdge"; // hard-coded Hebrew in IOSInstallBanner.jsx

test.describe("B-404 · B-405 — bottom banners never cover a core CTA", () => {
  test.skip(!(QA_EMAIL && QA_PASSWORD), "no QA credentials (local run) — use the hermetic probe");

  const ctxOpts = (info) => {
    const u = info.project.use;
    const pick = ["viewport", "screen", "userAgent", "deviceScaleFactor", "isMobile", "hasTouch", "locale", "timezoneId"];
    return Object.fromEntries(pick.filter((k) => u[k] !== undefined).map((k) => [k, u[k]]));
  };
  const isIOS = (info) => /iPhone|iPad/.test(info.project.use.userAgent || "");

  async function open(browser, info, lang) {
    const ctx = await browser.newContext({ ...ctxOpts(info), baseURL: info.project.use.baseURL });
    const store = HERMETIC ? newStore() : null;
    if (HERMETIC) {
      store.settings.lang = lang;
      await installHermetic(ctx, store);
    }
    // The app language: the device key, plus the DB blob (which wins at hydration) — in
    // production the blob is answered with this run's language and EVERY write is blocked.
    await ctx.addInitScript((l) => { if (location.protocol.startsWith("http")) localStorage.setItem("swingEdgeLang", l); }, lang);
    const page = await ctx.newPage();
    if (!HERMETIC) {
      await blockAllRestWrites(page);
      await page.route(/\/rest\/v1\/user_settings/, async (route) => {
        if (route.request().method() !== "GET") return route.fallback();
        const res = await route.fetch();
        const rows = await res.json().catch(() => null);
        if (Array.isArray(rows) && rows[0]?.settings) rows[0].settings.lang = lang;
        return route.fulfill({ response: res, json: rows });
      });
    }
    const dir = join(EVIDENCE, "overlay", info.project.name);
    mkdirSync(dir, { recursive: true });
    const results = [];
    const shot = (name) => page.screenshot({ path: join(dir, `${name}.png`), mask: [page.locator("header"), page.getByText(/@/)] }).catch(() => {});
    return { ctx, page, store, dir, results, shot };
  }

  // The landing page owns the language switch for the auth screen (it writes <html lang>).
  async function toAuth(page, lang) {
    await page.goto("/", { waitUntil: "load" });
    await page.getByRole("button", { name: lang === "en" ? "EN" : "עב", exact: true }).click();
    await page.evaluate(() => { history.pushState({}, "", "/app"); dispatchEvent(new PopStateEvent("popstate")); });
    await page.locator('input[type="email"]').waitFor({ state: "visible", timeout: 20_000 });
    expect(await page.evaluate(() => document.documentElement.lang), "auth screen language").toBe(lang);
  }

  async function clear(app, label, locator) {
    const { page, results, shot } = app;
    await locator.waitFor({ state: "visible", timeout: 20_000 });
    await locator.scrollIntoViewIfNeeded();
    await page.waitForTimeout(250); // let a smooth scroll and a banner's entry animation settle
    // Like a user: if the centre is covered, keep scrolling the element's scroll container in
    // 40px steps until it clears or nothing is left to scroll (2b: friction ⛔ blocking).
    // A CTA in a non-scrolling footer (Log Trade) or a fixed one (FAB) is judged where it is.
    const r = await locator.evaluate(async (el) => {
      const centre = () => {
        const b = el.getBoundingClientRect();
        const x = b.left + b.width / 2, y = b.top + b.height / 2;
        const top = document.elementFromPoint(x, y);
        const by = !top ? "nothing" : top.closest(".se-consent") ? "consent banner" : top.closest("div.fixed") ? `fixed: ${top.closest("div.fixed").textContent.slice(0, 40)}` : top.tagName;
        return { ok: !!top && (top === el || el.contains(top)), by, y: Math.round(y), vh: innerHeight };
      };
      let sc = el.parentElement;
      while (sc && !(sc.scrollHeight > sc.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement;
      const scroller = sc || document.scrollingElement;
      let res = centre();
      let scrolled = 0;
      // A `fixed` CTA (the FAB) does not move with the page — and the FAB HIDES while the page
      // scrolls — so scrolling it would only turn "covered" into "off-screen". Judged in place.
      const fixed = getComputedStyle(el).position === "fixed";
      while (!fixed && !res.ok && scrolled < 1200) {
        const before = scroller.scrollTop;
        // `instant`: the app sets `scroll-behavior: smooth`, under which scrollTop moves later.
        scroller.scrollTo({ top: before + 40, behavior: "instant" });
        await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
        if (scroller.scrollTop === before) break;
        scrolled += scroller.scrollTop - before;
        res = centre();
      }
      return { ...res, scrolledPx: scrolled };
    });
    results.push({ label, ...r });
    await shot(label.replace(/[^\w-]+/g, "_"));
    expect(r.ok, `${label}: centre (y=${r.y}/${r.vh}) is covered by ${redact(r.by)} even after scrolling ${r.scrolledPx}px`).toBe(true);
  }

  async function login(page) {
    await page.locator('input[type="email"]').fill(QA_EMAIL);
    await page.locator('input[autocomplete="current-password"]').fill(QA_PASSWORD);
    await page.locator('button[type="submit"]').first().click(); // real click — refused if covered
    await page.locator('[data-tour-tab="dashboard"]').waitFor({ state: "visible", timeout: 30_000 });
  }

  async function openSettings(page) {
    await page.getByRole("button", { name: exactRx("openUserMenu") }).click();
    await page.getByRole("button", { name: exactRx("settings") }).click();
  }

  const finish = async (app, info, scenario, lang) => {
    writeFileSync(join(app.dir, `${scenario}-${lang}.json`), JSON.stringify(app.results, null, 2));
    await app.ctx.close();
  };

  for (const lang of ["he", "en"]) {
    test(`consent banner up (never chosen) · ${lang} — login · sign-up · FAB · Log Trade · Save Setup`, async ({ browser }, info) => {
      const app = await open(browser, info, lang);
      const { page } = app;
      try {
        await toAuth(page, lang);
        await expect(page.locator(".se-consent__card"), "the consent banner must be up for this scenario").toBeVisible();
        await clear(app, `${lang}-login-submit`, page.locator('button[type="submit"]').first());
        await page.locator("div.flex.bg-slate-100 > button").nth(1).click(); // sign-up tab
        await clear(app, `${lang}-signup-submit`, page.locator('button[type="submit"]').first());
        await page.locator("div.flex.bg-slate-100 > button").nth(0).click(); // back to sign-in
        await login(page);
        await expect(page.locator(".se-consent__card"), "consent was never chosen — the banner must still be up").toBeVisible();
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" })); // the FAB hides while scrolled down
        await clear(app, `${lang}-fab`, page.locator('[data-tour="add-trade"]'));
        await page.locator('[data-tour="add-trade"]').click();
        await clear(app, `${lang}-log-trade`, page.getByRole("button", { name: /Log Trade/ }));
        await page.keyboard.press("Escape");
        await expect(page.locator('[aria-modal="true"]')).toHaveCount(0);
        await openSettings(page);
        await page.getByRole("button", { name: exactRx("addSetup") }).click();
        await clear(app, `${lang}-save-setup`, page.getByRole("button", { name: exactRx("saveSetup") }));
      } finally {
        await finish(app, info, "consent", lang);
      }
    });

    test(`iOS install banner · ${lang} — never before a first trade, never over a modal, never over a CTA`, async ({ browser }, info) => {
      test.skip(!isIOS(info), "the iOS install banner exists only for an iOS user agent");
      const app = await open(browser, info, lang);
      const { page, store } = app;
      const banner = page.locator("div.fixed").filter({ hasText: IOS_BANNER_TEXT });
      try {
        await toAuth(page, lang);
        await page.locator('[data-testid="consent-decline"]').click(); // the iOS banner arms after a choice
        await login(page);
        const real = () => page.evaluate(() => {
          try { return (JSON.parse(localStorage.getItem("swingEdgeTrades") || "[]") || []).filter((t) => t && !t.isDemo).length; } catch { return -1; }
        });
        await page.waitForTimeout(2_500); // the banner's own arming delay is 1.5s
        let n = await real();
        if (n === 0) {
          await expect(banner, "B-405: the iOS banner showed before the user's first trade").toBeHidden();
          if (HERMETIC) {
            // First real action: log a trade through the form.
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
            await expect.poll(real, { timeout: 20_000 }).toBeGreaterThan(0);
            n = await real();
          }
        }
        app.results.push({ label: `${lang}-real-trades`, n, store: store ? store.trades.length : "prod" });
        if (n === 0) {
          // Production with an empty QA journal: the "shown" half cannot be reached without a
          // write, and this suite writes nothing. Reported, ⛔ silently skipped.
          test.info().annotations.push({ type: "ios-shown-half", description: "QA journal empty — only the 'hidden before a first trade' half was measured" });
          return;
        }
        await expect(banner, "after a first trade the iOS banner should arm (it is the feature)").toBeVisible({ timeout: 5_000 });
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
        await clear(app, `${lang}-ios-fab`, page.locator('[data-tour="add-trade"]'));
        await page.locator('[data-tour="add-trade"]').click();
        await expect(banner, "B-405: the iOS banner sat over an open modal").toBeHidden();
        await clear(app, `${lang}-ios-log-trade`, page.getByRole("button", { name: /Log Trade/ }));
        await page.keyboard.press("Escape");
        await expect(banner, "the banner comes back once the modal is closed").toBeVisible({ timeout: 5_000 });
        await openSettings(page);
        await page.getByRole("button", { name: exactRx("addSetup") }).click();
        await clear(app, `${lang}-ios-save-setup`, page.getByRole("button", { name: exactRx("saveSetup") }));
      } finally {
        await finish(app, info, "ios", lang);
      }
    });
  }
});
