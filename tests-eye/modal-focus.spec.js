// tests-eye/modal-focus.spec.js — B-415: a modal ⛔ steals focus from a field that already has it.
//
// Plan: docs/plans/PLAN-2026-10-12-b415-modal-focus.md · audit: docs/audits/B415-WEBKIT-DIAGNOSIS-2026-10-10.md
// Red-before: scripts/eye-focus-probe.mjs (MUT-RAF restores the unconditional rAF ⇒ RED).
//
// THE BUG. useModalA11y focused the dialog's first control (the X button) synchronously AND again in an
// unconditional requestAnimationFrame. Input that reached a field before that frame landed on the X button:
// CI saw `#close-exit` empty on iPhone 14 (WebKit) — measured 10.10 at fill 2/90 · real typing 19/60 · 0/60
// with the rAF removed.
//
// THE MEASUREMENT IS DETERMINISTIC, ⛔ a race: the open click and the field's `focus()` run in ONE page task.
// React commits a discrete click in a microtask, so the field is awaited in MICROTASKS only (⛔ a task, ⛔ a
// timer) — the hook's rAF is then already queued and has not run. Two frames later an unconditional rAF has
// moved focus to X every time (30/30 measured 12.10), a guarded one has not (30/30). ⛔ retry · ⛔ timeouts as
// waits: the only waits are "the field exists" and exactly two frames.
//
// ⚪ idle — nobody touches the dialog ⇒ focus is on its first control after the frames (keyboard / screen
// reader users). Green in BOTH trees ⇒ ⛔ evidence for the fix; it is the fence that says the fix did not
// move first focus.
//
// HERMETIC ONLY: the prod job runs every tests-eye spec on push, and this one needs a seeded open trade.

import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { login } from "../tests/lib/eyeTools.js";
import { installHermetic, newStore, USER_ID, DUMMY_EMAIL, DUMMY_PASSWORD } from "./hermetic.js";

const HERMETIC = process.env.EYE_HERMETIC === "1";
const TICKER = "EYEFC";

// The iOS install banner sits over the bottom of an iPhone viewport; dismissed by its own key, read from
// the component exactly once (B-272). Same mechanism as cents.spec / playbook.spec.
const IOS_DISMISS_KEY = (() => {
  const src = readFileSync(join(process.cwd(), "src", "components", "IOSInstallBanner.jsx"), "utf8");
  const m = [...src.matchAll(/const DISMISS_KEY = "([^"]+)";/g)];
  if (m.length !== 1) throw new Error(`[eye] IOSInstallBanner DISMISS_KEY matched ${m.length}× (must be 1) (B-272)`);
  return m[0][1];
})();

const todayKey = () => { const d = new Date(), p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
const openTrade = () => ({
  id: "eye-focus-1", user_id: USER_ID, ticker: TICKER, side: "LONG", date: todayKey(),
  entry: 100, stop: 99, target: 102, exit: null, shares: 10, status: "OPEN",
  setup: "Breakout", marketCondition: "Trending Up", emotionAtEntry: "Neutral", entryQuality: 3,
  followedPlan: null, exitReason: null, notes: "e2e-focus", lessonLearned: null, maxFavorable: null, maxAdverse: null,
  _capitalAtEntry: 10000, createdAt: new Date().toISOString(), closedAt: null, is_demo: false,
  currency: "USD", currency_source: "manual_capital", source: "manual",
});

test.describe("B-415 · a modal keeps the field that already has focus", () => {
  test.skip(!HERMETIC, "hermetic only — run through scripts/eye-focus-probe.mjs");

  async function openApp(browser, info) {
    const u = info.project.use;
    const pick = ["viewport", "screen", "userAgent", "deviceScaleFactor", "isMobile", "hasTouch", "locale", "timezoneId", "colorScheme"];
    const ctx = await browser.newContext({ ...Object.fromEntries(pick.filter((k) => u[k] !== undefined).map((k) => [k, u[k]])), baseURL: u.baseURL });
    const store = newStore();
    store.trades.push(openTrade());
    await installHermetic(ctx, store);
    const page = await ctx.newPage();
    await page.addInitScript((k) => { if (location.protocol.startsWith("http")) localStorage.setItem(k, "1"); }, IOS_DISMISS_KEY);
    await page.addLocatorHandler(page.locator('[data-testid="consent-decline"]'), (btn) => btn.click());
    await login(page, DUMMY_EMAIL, DUMMY_PASSWORD);
    return { ctx, page };
  }

  // Click `opener` and — in the SAME task — focus `field` (unless idle). Returns where focus SETTLED two
  // frames later, plus whether the field existed before the first frame (a precondition, ⛔ a result).
  async function openAndSettle(page, opener, field, { idle = false } = {}) {
    await opener.evaluate((b) => b.setAttribute("data-b415-open", "1"));
    return page.evaluate(async ([sel, idleMode]) => {
      const b = document.querySelector("[data-b415-open]");
      b.removeAttribute("data-b415-open");
      await new Promise((r) => requestAnimationFrame(r)); // start right after a frame
      b.click();
      let el = null;
      for (let spins = 0; spins < 50 && !(el = document.querySelector(sel)); spins++) await Promise.resolve();
      const existed = !!el;
      if (el && !idleMode) el.focus();
      const focusedNow = document.activeElement === el;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const a = document.activeElement;
      const dialog = a && a.closest('[role="dialog"]');
      const firstControl = dialog && dialog.querySelector("button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href]");
      return { existed, focusedNow, settled: a ? (a.id ? `#${a.id}` : `${a.tagName}[${a.getAttribute("aria-label") || ""}]`) : null, onFirstControl: !!a && a === firstControl };
    }, [field, idle]);
  }

  const CASES = [
    { name: "close modal · #close-exit", field: "#close-exit", value: "100.1247",
      opener: async (page) => {
        await page.locator('[data-tour-tab="journal"]').click();
        const close = page.locator("article").filter({ hasText: TICKER }).locator("button").filter({ hasText: /^\s*(סגור|Close)\s*$/ });
        await expect(close, "exactly one Close button on the seeded open trade").toHaveCount(1, { timeout: 15_000 });
        return close;
      } },
    { name: "log-trade form · #log-ticker", field: "#log-ticker", value: "EYEFT",
      opener: async (page) => { await page.evaluate(() => window.scrollTo(0, 0)); return page.locator('[data-tour="add-trade"]'); } },
  ];

  for (const c of CASES) {
    test(`${c.name} — the field keeps focus and the typed value`, async ({ browser }, info) => {
      const { ctx, page } = await openApp(browser, info);
      try {
        const r = await openAndSettle(page, await c.opener(page), c.field);
        expect(r.existed, `${c.field} did not exist before the first frame — the measurement is void`).toBe(true);
        expect(r.focusedNow, `${c.field} did not take focus() — the measurement is void`).toBe(true);
        expect(r.settled, `B-415: two frames after open, focus moved from ${c.field} to ${r.settled}`).toBe(c.field);
        await page.keyboard.type(c.value);
        await expect(page.locator(c.field), `B-415: typed "${c.value}" did not land in ${c.field}`).toHaveValue(c.value);
      } finally {
        await ctx.close();
      }
    });

    test(`${c.name} — ⚪ idle: first focus is still the dialog's first control`, async ({ browser }, info) => {
      const { ctx, page } = await openApp(browser, info);
      try {
        const r = await openAndSettle(page, await c.opener(page), c.field, { idle: true });
        expect(r.existed, `${c.field} did not exist before the first frame — the measurement is void`).toBe(true);
        expect(r.onFirstControl, `⚪ idle: focus settled on ${r.settled}, ⛔ the dialog's first control`).toBe(true);
      } finally {
        await ctx.close();
      }
    });
  }
});
