// tests-eye/width.spec.js — B-424: no main tab may be WIDER than the phone it is on.
//
// THE BUG (13.10, PR #73 CI run 38453088378 + local measurement): on the English analytics tab the
// "More info: Equity Curve" button in the hero header stuck out past the card — left 393 · right 437 on a
// 412px screen ⇒ `scrollWidth 437`. A page wider than the viewport makes mobile browsers widen the layout
// viewport: the page pans sideways and the fixed FAB is pushed partly off-screen (CI: the FAB's click
// landed on a chart svg). Nothing in the suite measured page WIDTH, so it surfaced only by accident.
//
// THE CHECK, per tab: `document.scrollingElement.scrollWidth ≤ innerWidth`. A red names the leaf
// elements that cross the right edge (tag · aria-label · text), so the cause is in the message.
// Tabs: journal · analytics · settings · tools — he + en — the five overlay.spec devices.
//
// TARGETS: hermetic (EYE_HERMETIC=1 — `scripts/eye-width-probe.mjs`; EYE_SEED_HISTORY=1 gives the
// journal production's shape) and production (QA account, EVERY REST write blocked — read-only).
//
// ⛔ `overflow: hidden` on body/main as a fix: it would turn this gate green and leave the button cut off.

import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { blockAllRestWrites, login } from "../tests/lib/eyeTools.js";
import { exactRx } from "./labels.js";
import { installHermetic, newStore, DUMMY_EMAIL, DUMMY_PASSWORD } from "./hermetic.js";

const HERMETIC = process.env.EYE_HERMETIC === "1";
const QA_EMAIL = HERMETIC ? DUMMY_EMAIL : process.env.SENTINEL_QA_EMAIL;
const QA_PASSWORD = HERMETIC ? DUMMY_PASSWORD : process.env.SENTINEL_QA_PASSWORD;
const EVIDENCE = process.env.EYE_EVIDENCE_DIR || join(process.cwd(), "eye-evidence");

// Overlays a real phone user dismisses first (same reason as cents.spec / playbook.spec): the width of a
// banner is not this gate's question. The iOS key is read from the component, exactly once (B-272).
const IOS_DISMISS_KEY = (() => {
  const src = readFileSync(join(process.cwd(), "src", "components", "IOSInstallBanner.jsx"), "utf8");
  const m = [...src.matchAll(/const DISMISS_KEY = "([^"]+)";/g)];
  if (m.length !== 1) throw new Error(`[width] IOSInstallBanner DISMISS_KEY matched ${m.length}× (must be 1) (B-272)`);
  return m[0][1];
})();

// Each tab and how a user reaches it. Settings lives in the user menu, the rest in the main nav.
const TABS = [
  { id: "journal" },
  { id: "analytics" },
  { id: "settings", viaMenu: true },
  { id: "tools" },
];

test.describe("B-424 — no main tab is wider than the phone", () => {
  test.skip(!(QA_EMAIL && QA_PASSWORD), "no QA credentials (local run) — use the hermetic probe");

  const ctxOpts = (info) => {
    const u = info.project.use;
    const pick = ["viewport", "screen", "userAgent", "deviceScaleFactor", "isMobile", "hasTouch", "locale", "timezoneId"];
    return Object.fromEntries(pick.filter((k) => u[k] !== undefined).map((k) => [k, u[k]]));
  };

  for (const lang of ["he", "en"]) {
    test(`${lang} — journal · analytics · settings · tools fit the screen`, async ({ browser }, info) => {
      const ctx = await browser.newContext({ ...ctxOpts(info), baseURL: info.project.use.baseURL });
      const store = HERMETIC ? newStore() : null;
      if (HERMETIC) {
        store.settings.lang = lang;
        await installHermetic(ctx, store);
      }
      await ctx.addInitScript(([l, k]) => {
        if (!location.protocol.startsWith("http")) return;
        localStorage.setItem("swingEdgeLang", l);
        localStorage.setItem(k, "1");
      }, [lang, IOS_DISMISS_KEY]);
      const page = await ctx.newPage();
      await page.addLocatorHandler(page.locator('[data-testid="consent-decline"]'), (btn) => btn.click());
      if (!HERMETIC) {
        // Read-only on production: every REST write is answered locally; the settings blob is read
        // with THIS run's language.
        await blockAllRestWrites(page);
        await page.route(/\/rest\/v1\/user_settings/, async (route) => {
          if (route.request().method() !== "GET") return route.fallback();
          const res = await route.fetch();
          const rows = await res.json().catch(() => null);
          if (Array.isArray(rows) && rows[0]?.settings) rows[0].settings.lang = lang;
          return route.fulfill({ response: res, json: rows });
        });
      }
      const dir = join(EVIDENCE, "width", info.project.name);
      mkdirSync(dir, { recursive: true });
      const results = [];
      try {
        await login(page, QA_EMAIL, QA_PASSWORD);
        await expect.poll(() => page.evaluate(() => document.documentElement.lang), { timeout: 20_000, message: "app language" }).toBe(lang);
        for (const tab of TABS) {
          if (tab.viaMenu) {
            await page.getByRole("button", { name: exactRx("openUserMenu") }).click();
            await page.getByRole("button", { name: exactRx(tab.id) }).click();
          } else {
            // Re-driven until active: a click that lands during a hydration re-render is lost (iphone14promax·en,
            // local 13.10; same as cents.spec's openAnalytics). ⛔ a value is touched — only navigation.
            const btn = page.locator(`[data-tour-tab="${tab.id}"]`);
            await expect(async () => {
              if (!/border-emerald-400/.test((await btn.getAttribute("class")) || "")) await btn.click({ timeout: 3_000 });
              await expect(btn).toHaveClass(/border-emerald-400/, { timeout: 2_000 });
            }, `the ${tab.id} tab never became active`).toPass({ timeout: 20_000 });
          }
          // The width is read once the layout has settled: two equal readings 250ms apart.
          let prev = -1, m = null;
          for (let k = 0; k < 20; k++) {
            m = await page.evaluate(() => {
              const se = document.scrollingElement;
              const W = window.innerWidth;
              const over = [];
              for (const el of document.querySelectorAll("body *")) {
                const r = el.getBoundingClientRect();
                // Either edge: in RTL the overflow runs off the LEFT (iphoneSE·he, 13.10: "+28px, no leaf").
                const out = (b) => b.width > 0 && (b.right > W + 0.5 || b.left < -0.5);
                if (!out(r)) continue;
                if (getComputedStyle(el).position === "fixed") continue;
                if ([...el.children].some((c) => out(c.getBoundingClientRect()))) continue; // leaves only
                over.push(`${el.tagName.toLowerCase()}${el.getAttribute("aria-label") ? `[aria-label="${el.getAttribute("aria-label")}"]` : ""} ${r.left < -0.5 ? `left=${Math.round(r.left)}` : `right=${Math.round(r.right)}`} «${(el.textContent || "").trim().slice(0, 30)}»`);
              }
              return { sw: se.scrollWidth, iw: W, over: over.slice(0, 5) };
            });
            if (m.sw === prev) break;
            prev = m.sw;
            await page.waitForTimeout(250);
          }
          results.push({ tab: tab.id, ...m });
          await page.screenshot({ path: join(dir, `${lang}-${tab.id}.png`), mask: [page.locator("header"), page.getByText(/@/)] }).catch(() => {});
          expect.soft(m.sw, `B-424 · ${lang} · ${tab.id}: the page is ${m.sw - m.iw}px wider than the ${m.iw}px screen — crossing the edge: ${m.over.join(" | ") || "(no leaf found)"}`).toBeLessThanOrEqual(m.iw);
        }
      } finally {
        writeFileSync(join(dir, `${lang}.json`), JSON.stringify(results, null, 2));
        await ctx.close();
      }
    });
  }
});
