// tests-eye/cents.spec.js — K2 (`B-321` + `B-325`, 05.10) measured on the real app: money that
// carries cents is SHOWN with its cents, ⛔ rounded to a whole unit and then printed as `.00`.
//
// Plan: docs/plans/PLAN-2026-10-05-k2-cents.md
//
// The unit gate is `test:cents` (expressions extracted from SwingEdge_App.jsx, run against the
// real formatters). This spec is the EYE: the same sites, rendered by React in a real browser,
// on production after the deploy (the closing condition) and hermetically in
// `scripts/eye-cents-probe.mjs` (the red-before: MUT-A1 · MUT-B7).
//
//   a · he — close a trade ⇒ the toast · the journal card · the per-trade bar tooltip (B3) ·
//            the setup table cell (B7), the last one measured as a DIFF against the cell before
//            the trade, so other QA trades in the same setup cannot make it pass or fail.
//   b · en — the same close toast in English, + the journal card.
//
// THE NUMBER. The form has no shares field: shares come from position sizing (capital × risk ÷
// stop distance). The spec reads `shares` from the saved trade and closes at entry + 0.1247, so
// P&L = shares × 0.1247 — cents for every share count that is not a multiple of 10,000. The
// expected string is `fmtMoney` (src/utils.js — the app's own formatter) on that number.
// ⛔ A QA account whose capital currency differs from the trade's would need an FX rate the
// spec cannot know ⇒ RED with that reason, ⛔ a guess.
//
// Cleanup: ticker EYEPB + notes `e2e-c064-…` ⇒ the existing REST sweep (tests-eye/qaRest.js).
// ⛔ Playwright trace (E11). The en context reads the settings row with `lang` stripped and
// answers its settings WRITES locally, so the QA row's language is never changed.

import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { login, redact } from "../tests/lib/eyeTools.js";
import { fmtMoney } from "../src/utils.js";
import { installHermetic, newStore, DUMMY_EMAIL, DUMMY_PASSWORD } from "./hermetic.js";
import { sweep, PREFIX_ROOT, TRADE_TICKER } from "./qaRest.js";

const HERMETIC = process.env.EYE_HERMETIC === "1";
const QA_EMAIL = HERMETIC ? DUMMY_EMAIL : process.env.SENTINEL_QA_EMAIL;
const QA_PASSWORD = HERMETIC ? DUMMY_PASSWORD : process.env.SENTINEL_QA_PASSWORD;
const HAVE_CREDS = !!(QA_EMAIL && QA_PASSWORD);
const RUN = process.env.GITHUB_RUN_ID || `local${Date.now().toString(36)}`;
const EVIDENCE = process.env.EYE_EVIDENCE_DIR || join(process.cwd(), "eye-evidence");
const ENTRY = 100;
const DELTA = 0.1247;
const EXIT = "100.1247";

// Same reason as playbook.spec: overlays a real phone user dismisses first, installed before the
// first navigation; the iOS dismissal key read from the component, exactly once (B-272).
const IOS_DISMISS_KEY = (() => {
  const src = readFileSync(join(process.cwd(), "src", "components", "IOSInstallBanner.jsx"), "utf8");
  const m = [...src.matchAll(/const DISMISS_KEY = "([^"]+)";/g)];
  if (m.length !== 1) throw new Error(`[eye] IOSInstallBanner DISMISS_KEY matched ${m.length}× (must be 1) (B-272)`);
  return m[0][1];
})();
async function installOverlayHandlers(page) {
  await page.addInitScript((k) => { if (location.protocol.startsWith("http")) localStorage.setItem(k, "1"); }, IOS_DISMISS_KEY);
  await page.addLocatorHandler(page.locator('[data-testid="consent-decline"]'), (btn) => btn.click());
  const iosBanner = page.locator("div.fixed").filter({ hasText: "התקן את SwingEdge" });
  await page.addLocatorHandler(iosBanner, (b) => b.getByRole("button", { name: "סגור" }).click());
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// "+$1,234.56" / "-₪12.00" ⇒ number. ⛔ a fallback: an unparseable cell is a RED, ⛔ 0.
const parseMoney = (s) => {
  const m = /([+-])\D*([\d,]+\.\d{2})/.exec(String(s));
  if (!m) throw new Error(`not a two-decimal money string: ${JSON.stringify(s)}`);
  return (m[1] === "-" ? -1 : 1) * Number(m[2].replace(/,/g, ""));
};

test.describe("K2 · money keeps its cents on screen (B-321 · B-325) @deployed", () => {
  test.skip(!HAVE_CREDS, "no QA credentials (local run) — use the hermetic probe");

  let STATE = null;
  const cleanup = { pre: null, post: null };
  const ctxOpts = (info) => {
    const u = info.project.use;
    const pick = ["viewport", "screen", "userAgent", "deviceScaleFactor", "isMobile", "hasTouch", "locale", "timezoneId", "colorScheme"];
    return Object.fromEntries(pick.filter((k) => u[k] !== undefined).map((k) => [k, u[k]]));
  };

  test.beforeAll(async ({ browser }, info) => {
    if (HERMETIC) return;
    cleanup.pre = await sweep(QA_EMAIL, QA_PASSWORD);
    console.log(`[K2] pre-sweep: trades ${cleanup.pre.trades.found} · setups ${cleanup.pre.playbook.found}`);
    const ctx = await browser.newContext({ ...ctxOpts(info), baseURL: info.project.use.baseURL });
    const page = await ctx.newPage();
    await installOverlayHandlers(page);
    await login(page, QA_EMAIL, QA_PASSWORD);
    STATE = await ctx.storageState();
    await ctx.close();
  });

  test.afterAll(async ({}, info) => {
    if (HERMETIC) return;
    cleanup.post = await sweep(QA_EMAIL, QA_PASSWORD);
    const dir = join(EVIDENCE, info.project.name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "cents-cleanup.json"), JSON.stringify(cleanup, null, 2));
    console.log(`[K2] post-sweep: trades found ${cleanup.post.trades.found} → after ${cleanup.post.trades.after} · rest-of-blob ${cleanup.post.restHashBefore === cleanup.post.restHashAfter ? "identical" : "CHANGED"}`);
    expect(cleanup.post.trades.after, "e2e trades left in the QA account after the sweep").toBe(0);
  });

  async function openApp(browser, info, lang) {
    const ctx = await browser.newContext({ ...ctxOpts(info), baseURL: info.project.use.baseURL, ...(STATE ? { storageState: STATE } : {}) });
    const store = HERMETIC ? newStore() : null;
    if (HERMETIC) await installHermetic(ctx, store);
    if (lang === "en" && !HERMETIC) {
      // Read the row without `lang` (so the localStorage choice below wins) and keep every settings
      // WRITE of this context local — the QA row's language must not change. Trades are untouched.
      await ctx.route(/\/rest\/v1\/user_settings/, async (route) => {
        const req = route.request();
        if (req.method() !== "GET") return route.fulfill({ status: 201, contentType: "application/json", body: "[]" });
        const res = await route.fetch();
        const body = await res.json();
        const strip = (r) => (r && r.settings ? { ...r, settings: Object.fromEntries(Object.entries(r.settings).filter(([k]) => k !== "lang")) } : r);
        return route.fulfill({ response: res, json: Array.isArray(body) ? body.map(strip) : strip(body) });
      });
    }
    const page = await ctx.newPage();
    await installOverlayHandlers(page);
    if (lang) await page.addInitScript((l) => { if (location.protocol.startsWith("http")) localStorage.setItem("swingEdgeLang", l); }, lang);
    const consoleErrors = [];
    page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(redact(m.text()).slice(0, 400)); });
    page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${redact(e.message).slice(0, 400)}`));
    if (HERMETIC) await login(page, QA_EMAIL, QA_PASSWORD);
    else {
      await page.goto("/app", { waitUntil: "load" });
      await page.locator('[data-tour-tab="dashboard"]').waitFor({ state: "visible", timeout: 30_000 });
    }
    const dir = join(EVIDENCE, info.project.name);
    mkdirSync(dir, { recursive: true });
    const shot = (name) => page.screenshot({ path: join(dir, `cents-${name}.png`), mask: [page.locator("header"), page.getByText(/@/)] });
    const onFail = async (step) => {
      await shot(`${step}-FAILED`).catch(() => {});
      const onScreen = await page.locator('[role="status"], [role="alert"]').allInnerTexts().catch(() => []);
      writeFileSync(join(dir, `cents-${step}-console.txt`), [
        "── status/alert on screen ──", ...onScreen.map((t) => redact(t).replace(/\s+/g, " ").slice(0, 300)),
        "── console errors ──", ...(consoleErrors.length ? consoleErrors : ["(none)"]),
      ].join("\n"));
    };
    return { ctx, page, shot, onFail, prefix: `${PREFIX_ROOT}${RUN}-${info.project.name}-cents-` };
  }

  // Log a trade through the real form, then close it at ENTRY + DELTA through the journal card.
  // Returns the P&L the app should show, computed from the SAVED shares.
  async function logAndClose(app, note) {
    const { page } = app;
    const ours = () => page.evaluate((n) => {
      try { return (JSON.parse(localStorage.getItem("swingEdgeTrades") || "[]") || []).filter((t) => t && t.notes === n); } catch { return "UNPARSEABLE"; }
    }, note);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator('[data-tour="add-trade"]').click();
    const dialog = page.locator('[role="dialog"]').last();
    await page.locator("#log-ticker").fill(TRADE_TICKER);
    await page.locator("#log-entry").fill(String(ENTRY));
    await page.locator("#log-stop").fill("99");
    await page.locator("#log-target").fill("102");
    const ctxToggle = dialog.locator("button[aria-expanded]").filter({ hasText: /הקשר העסקה|Trade Context/ });
    if ((await ctxToggle.getAttribute("aria-expanded")) !== "true") await ctxToggle.click();
    await page.locator("#log-notes").fill(note);
    const submit = page.getByRole("button", { name: /Log Trade/ });
    await expect(submit).toBeEnabled({ timeout: 25_000 });
    await submit.click();
    await expect.poll(async () => (await ours()).length, { timeout: 20_000, message: "the TEST trade never reached swingEdgeTrades" }).toBe(1);
    const saved = (await ours())[0];
    const settings = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem("swingEdgeSettings") || "{}"); } catch { return {}; } });
    const accountCcy = settings.capitalCurrency || settings.accountCurrency || "USD";
    const tradeCcy = saved.currency || "USD";
    expect(tradeCcy, `trade currency ${tradeCcy} ≠ capital currency ${accountCcy} — the expected P&L would need an FX rate (refusing to guess)`).toBe(accountCcy);
    expect(Number.isInteger(saved.shares) && saved.shares > 0, `saved shares = ${saved.shares}`).toBe(true);
    const pnl = saved.shares * DELTA;
    const shown = fmtMoney(pnl, accountCcy);
    expect(shown.endsWith(".00"), `shares ${saved.shares} × ${DELTA} has no cents — the trade cannot tell rounding from truth`).toBe(false);

    await page.locator('[data-tour-tab="journal"]').click();
    // An OPEN card is the one that still carries a Close button (status text differs per language).
    const closeBtn = page.getByRole("button", { name: /^\s*(סגור|Close)\s*$/ });
    const card = page.locator("article").filter({ hasText: TRADE_TICKER }).filter({ has: closeBtn });
    await expect(card, "exactly one open EYEPB card (ours)").toHaveCount(1, { timeout: 15_000 });
    await card.locator("button").filter({ hasText: /^\s*(סגור|Close)\s*$/ }).click();
    await page.locator("#close-exit").fill(EXIT);
    await page.getByRole("button", { name: /Close Trade/ }).click();
    return { pnl, shown, accountCcy, shares: saved.shares };
  }

  // The setup row of the analytics table (B7) — its last cell is `fmt$(s.totalPnL)`.
  async function setupCell(page, setupLabel) {
    await page.locator('[data-tour-tab="analytics"]').click();
    // The first cell carries the label as `span[title=…]` (plus an info button), so match the title.
    const row = page.locator("tr").filter({ has: page.locator(`span[title="${setupLabel}"]`) });
    if ((await row.count()) === 0) return null;
    await expect(row).toHaveCount(1);
    return row.locator("td").last().innerText();
  }

  test("a · he — close toast · journal card · per-trade tooltip (B3) · setup cell (B7) keep their cents", async ({ browser }, info) => {
    const app = await openApp(browser, info, "he");
    const { page, shot } = app;
    try {
      const SETUP = "פריצה"; // the default setup ("Breakout") in Hebrew — the form is not touched
      const before = await setupCell(page, SETUP);
      const base = before == null ? 0 : parseMoney(before);
      console.log(`[K2 a] ${info.project.name}: setup cell before = ${before ?? "(no row)"}`);

      const r = await logAndClose(app, `${app.prefix}a`);
      console.log(`[K2 a] ${info.project.name}: shares ${r.shares} · expected ${r.shown} (${r.accountCcy})`);
      await expect(page.getByRole("status").getByText(`רווח ${r.shown} נסגר בהצלחה`, { exact: false }),
        `close toast (he) did not show ${r.shown}`).toBeVisible({ timeout: 10_000 });
      await shot("a-toast");

      const card = page.locator("article").filter({ hasText: TRADE_TICKER }).filter({ hasText: r.shown });
      await expect(card.first(), `journal card does not show ${r.shown}`).toBeVisible({ timeout: 15_000 });

      const after = await setupCell(page, SETUP);
      expect(after, "no setup row after closing a Breakout trade").not.toBeNull();
      const want = fmtMoney(base + r.pnl, r.accountCcy);
      expect(after.trim(), `B7 setup cell: ${before ?? "—"} + ${r.shown} should read ${want}`).toBe(want);

      // B3 — one bar per closed trade; hover until the tooltip names EYEPB.
      const sec = page.getByText(/^(רווח\/הפסד לפי עסקה|P&L by Trade)$/).locator("xpath=ancestor::div[.//*[contains(@class,'recharts-wrapper')]][1]");
      const bars = sec.locator(".recharts-bar-rectangle");
      const n = await bars.count();
      expect(n, "the per-trade chart has no bars").toBeGreaterThan(0);
      let tip = null;
      // `locator.hover()` with retries. Its actionability check waits until the bar is stable AND
      // receives the pointer — which covers the close toast lying over the chart on the 664px
      // iPhone 14 viewport (measured: elementFromPoint = the toast's div). A detach while recharts
      // re-mounts the paths during its entry animation is caught and retried. The tooltip wrapper
      // EXISTS while empty, so its text is polled (CI 37361308589 went red on a one-shot read).
      // ⚠️ Raw coordinates (`page.mouse.move`) were tried and went red on WebKit in CI
      // (run 37362747806) while green on Chromium — ⛔ go back to them.
      const trail = [];
      for (let i = n - 1; i >= 0 && !tip; i--) {
        for (let k = 0; k < 8 && !tip; k++) {
          try {
            await bars.nth(i).scrollIntoViewIfNeeded({ timeout: 3_000 });
            await bars.nth(i).hover({ timeout: 4_000 });
          } catch (e) {
            trail.push(`bar ${i} try ${k}: ${String(e.message).split("\n")[0].slice(0, 120)}`);
            await page.waitForTimeout(500);
            continue;
          }
          for (let j = 0; j < 10 && !tip; j++) {
            const text = await sec.locator(".recharts-tooltip-wrapper").innerText().catch(() => "");
            if (text.includes(TRADE_TICKER)) tip = text;
            else await page.waitForTimeout(150);
          }
          if (!tip) trail.push(`bar ${i} try ${k}: hovered, tooltip never named ${TRADE_TICKER}`);
        }
      }
      if (!tip) console.log(`[K2 a] ${info.project.name}: B3 hover trail —\n  ${trail.join("\n  ")}`);
      expect(tip, "no bar of the per-trade chart named EYEPB on hover").not.toBeNull();
      expect(tip, `B3 tooltip should show ${r.shown}`).toContain(r.shown);
      await shot("a-analytics");
    } catch (e) {
      await app.onFail("a");
      throw e;
    } finally {
      await app.ctx.close();
    }
  });

  test("b · en — close toast · journal card keep their cents", async ({ browser }, info) => {
    const app = await openApp(browser, info, "en");
    const { page, shot } = app;
    try {
      const r = await logAndClose(app, `${app.prefix}b`);
      await expect(page.getByRole("status").getByText(`Closed with profit ${r.shown}`, { exact: false }),
        `close toast (en) did not show ${r.shown}`).toBeVisible({ timeout: 10_000 });
      await shot("b-toast");
      const card = page.locator("article").filter({ hasText: TRADE_TICKER }).filter({ hasText: r.shown });
      await expect(card.first(), `journal card does not show ${r.shown}`).toBeVisible({ timeout: 15_000 });
    } catch (e) {
      await app.onFail("b");
      throw e;
    } finally {
      await app.ctx.close();
    }
  });
});
