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
// stop distance). The spec reads `shares` from the saved trade and picks the close delta from them
// (DELTAS below). The expected string is `fmtMoney` (src/utils.js — the app's own formatter).
//
// 🆕 09.10 (B-300 closed): THE POPULATION is the QA row's REAL capital (₪) again — the `$` override
// below is gone. The paper (EYEPB, alphabetic) is USD, so the toast is a CONVERSION: the expected
// string comes from the rate the APP itself received from /api/fx (captured off the wire) through
// the app's own `buildRateTable`/`convert` — ⛔ a hard-coded rate. It must be a number, not "—",
// carry ₪, and the saved label must be the PAPER's currency (⛔ the capital's — B-340).
// (Historical note, 08.10:) THE POPULATION — `$` capital (Niv 08.10, DECISIONS; INCIDENTS #30). The QA row's capital is ₪,
// and a hand-typed alphabetic ticker under ₪ capital is `B-300`: the form stamps `ILS`,
// `deriveInstrumentCurrency` returns `contradicted` and the toast carries NO number ("—"). K2 is
// therefore measured on the `$` population: every context reads the settings row with
// `capitalCurrency`/`accountCurrency` = USD (and, in b, `lang` stripped) and answers its settings
// WRITES locally ⇒ ⛔ any write to the QA row (the sweep's rest-of-blob hash proves it).
// ⛔ The ₪ coverage returns to the QA's real capital when `B-300` meets its closing condition.
// The precondition is the app's REAL derivation (`deriveInstrumentCurrency` + `isAggregatable`)
// and the derived code must equal the account currency (identity) — ⛔ the stored label compared
// with the capital, which is the tautological gate CLAUDE.md §7 forbids (it hid `B-300`).
//
// Cleanup: ticker EYEPB + notes `e2e-c064-…` ⇒ the existing REST sweep (tests-eye/qaRest.js).
// ⛔ Playwright trace (E11).

import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { login, redact } from "../tests/lib/eyeTools.js";
import { fmtMoney } from "../src/utils.js";
import { buildRateTable, convert } from "../src/lib/fx.js";
import { deriveInstrumentCurrency, isAggregatable } from "../src/lib/instrumentCurrency.js";
import { installHermetic, newStore, DUMMY_EMAIL, DUMMY_PASSWORD } from "./hermetic.js";
import { sweep, PREFIX_ROOT, TRADE_TICKER } from "./qaRest.js";

const HERMETIC = process.env.EYE_HERMETIC === "1";
const QA_EMAIL = HERMETIC ? DUMMY_EMAIL : process.env.SENTINEL_QA_EMAIL;
const QA_PASSWORD = HERMETIC ? DUMMY_PASSWORD : process.env.SENTINEL_QA_PASSWORD;
const HAVE_CREDS = !!(QA_EMAIL && QA_PASSWORD);
const RUN = process.env.GITHUB_RUN_ID || `local${Date.now().toString(36)}`;
const EVIDENCE = process.env.EYE_EVIDENCE_DIR || join(process.cwd(), "eye-evidence");
const ENTRY = 100;
// B-300: the population is the QA row's REAL capital (₪) — no $ override any more. The hermetic arm
// takes its currency from EYE_CCY (default USD ⇒ the K2 arms are byte-identical).
const EXPECT_CCY = process.env.EYE_EXPECT_CCY || (HERMETIC ? (process.env.EYE_CCY || "USD") : "ILS");
// The close delta is picked from the SAVED shares (position sizing decides them, and production's QA
// capital gives a different count than the hermetic store): the first candidate whose P&L — and,
// in a, the setup total base + P&L — prints DIFFERENTLY with and without `Math.round`. That is the
// exact property the mutants break; a delta without it is a test that cannot fail (prod run
// 37760263449: 16 × 0.1247 = 1.9952 ⇒ "+₪2.00" in both trees). 0.1247 stays first ⇒ the hermetic
// probe is unchanged. ⛔ a fallback: no candidate ⇒ RED.
const DELTAS = [0.1247, 0.0347, 0.2213, 0.0123, 0.3301, 0.0471];

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
    if (!HERMETIC) {
      // Read the row AS IT IS (₪ capital; in en without `lang` so the localStorage choice
      // below wins); every settings WRITE of this context is answered locally ⇒ the QA row never
      // changes. Trades are untouched (their own table, swept by ticker + notes prefix).
      await ctx.route(/\/rest\/v1\/user_settings/, async (route) => {
        const req = route.request();
        if (req.method() !== "GET") return route.fulfill({ status: 201, contentType: "application/json", body: "[]" });
        const res = await route.fetch();
        const body = await res.json();
        const view = (r) => {
          if (!(r && r.settings)) return r;
          const settings = { ...r.settings };
          if (lang === "en") delete settings.lang;
          return { ...r, settings };
        };
        return route.fulfill({ response: res, json: Array.isArray(body) ? body.map(view) : view(body) });
      });
    }
    const page = await ctx.newPage();
    await installOverlayHandlers(page);
    if (lang) await page.addInitScript((l) => { if (location.protocol.startsWith("http")) localStorage.setItem("swingEdgeLang", l); }, lang);
    // What the APP received from /api/fx (range answer = the per-day rates the close toast uses).
    const fx = { range: null };
    page.on("response", async (r) => {
      try {
        const u = r.url();
        if (/\/api\/fx\?/.test(u) && /[?&]start=/.test(u) && r.ok()) fx.range = await r.json();
      } catch { /* a response whose body is gone is not a rate; the spec fails on fx.range === null */ }
    });
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
    return { ctx, page, shot, onFail, fx, prefix: `${PREFIX_ROOT}${RUN}-${info.project.name}-cents-` };
  }

  // Log a trade through the real form, then close it at ENTRY + delta through the journal card.
  // Returns the P&L the app should show, computed from the SAVED shares. `bases` = totals the P&L
  // will be added to on screen (B7) — they must stay distinguishable too.
  async function logAndClose(app, note, bases = []) {
    const { page } = app;
    const ours = () => page.evaluate((n) => {
      try { return (JSON.parse(localStorage.getItem("swingEdgeTrades") || "[]") || []).filter((t) => t && t.notes === n); } catch { return "UNPARSEABLE"; }
    }, note);
    // The settings read must have LANDED (hydration writes the currencies to localStorage) before
    // the form stamps the trade — otherwise the trade is priced in the pre-hydration currency.
    if (!HERMETIC) {
      await expect.poll(() => page.evaluate(() => [localStorage.getItem("swingEdgeCapitalCurrency"), localStorage.getItem("swingEdgeAccountCurrency")].join("/")),
        { timeout: 20_000, message: `the capital settings never reached the app (expected ${EXPECT_CCY})` }).toBe(`${EXPECT_CCY}/${EXPECT_CCY}`);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator('[data-tour="add-trade"]').click();
    const dialog = page.locator('[role="dialog"]').last();
    await page.locator("#log-ticker").fill(TRADE_TICKER);
    // The live quote for the ticker (250ms debounce, retried on an unknown symbol) re-renders the
    // form while it runs. Prod run 37780897809 (iphone14 · b): Entry came back EMPTY while Stop,
    // Target and the ticker held ⇒ «Log Trade» disabled for 25s. The prices are typed once the
    // quote has answered — what a person does after the quote panel fills — and every field is
    // asserted to HOLD its value, right after its fill and again before submit, so a recurrence
    // names the field instead of timing out on a disabled button. ⛔ a re-fill: a value the app
    // drops is reported, ⛔ papered over.
    const refresh = dialog.getByRole("button", { name: /Refresh price|רענן מחיר/ });
    await expect(refresh, "the live-quote panel never appeared for the ticker").toBeVisible({ timeout: 10_000 });
    const sawLoading = await expect.poll(() => refresh.isDisabled(), { timeout: 3_000 }).toBe(true).then(() => true, () => false);
    console.log(`[K2] quote fetch ${sawLoading ? "observed (Refresh disabled)" : "NOT observed within 3s"} — waiting for it to settle`);
    await expect(refresh, "the live quote never settled (Refresh price still disabled)").toBeEnabled({ timeout: 30_000 });
    const PRICES = [["#log-ticker", TRADE_TICKER], ["#log-entry", String(ENTRY)], ["#log-stop", "99"], ["#log-target", "102"]];
    for (const [sel, v] of PRICES.slice(1)) {
      await page.locator(sel).fill(v);
      await expect(page.locator(sel), `${sel} did not take "${v}"`).toHaveValue(v);
    }
    const ctxToggle = dialog.locator("button[aria-expanded]").filter({ hasText: /הקשר העסקה|Trade Context/ });
    // The section must END expanded. A single read-then-click raced the ₪ arm's extra re-render on
    // WebKit (CI 37927905044, iphone14·b: `#log-notes` never appeared) — the click landed while the
    // layout moved. Asserted STATE, retried as a whole: ⛔ a value is never re-filled here, only a
    // toggle is re-driven until the app reports `aria-expanded=true`.
    await expect(async () => {
      await ctxToggle.scrollIntoViewIfNeeded();
      if ((await ctxToggle.getAttribute("aria-expanded")) !== "true") await ctxToggle.click();
      await expect(ctxToggle).toHaveAttribute("aria-expanded", "true", { timeout: 1_500 });
    }, "the Trade Context section never expanded").toPass({ timeout: 15_000 });
    await page.locator("#log-notes").fill(note);
    for (const [sel, v] of PRICES) await expect(page.locator(sel), `${sel} lost its value before submit`).toHaveValue(v, { timeout: 1_000 });
    const submit = page.getByRole("button", { name: /Log Trade/ });
    await expect(submit).toBeEnabled({ timeout: 25_000 });
    await submit.click();
    await expect.poll(async () => (await ours()).length, { timeout: 20_000, message: "the TEST trade never reached swingEdgeTrades" }).toBe(1);
    const saved = (await ours())[0];
    const accountCcy = await page.evaluate(() => localStorage.getItem("swingEdgeAccountCurrency"));
    expect(accountCcy, "the app's account currency is unreadable — the expected P&L has no currency (⛔ guessing)").toBeTruthy();
    expect(accountCcy, "the population is not the expected capital currency").toBe(EXPECT_CCY);
    // ⛔ the stored label vs the capital (tautological — it hid B-300). The app's REAL derivation:
    // the toast is a number only when the paper is aggregatable.
    // The PAPER's currency comes from the TICKER alone (what the form priced entry/stop in), ⛔ from
    // the saved row — so the pre-fix tree reaches the toast and fails THERE ("—"), as users saw it.
    const derived = deriveInstrumentCurrency({ ticker: TRADE_TICKER });
    expect(isAggregatable(derived), `ticker-only derivation ${JSON.stringify(derived)} is not aggregatable`).toBe(true);
    expect(Number.isInteger(saved.shares) && saved.shares > 0, `saved shares = ${saved.shares}`).toBe(true);
    // The conversion the app will apply, from the rate the APP received (identity when paper = account).
    const dayKey = await page.evaluate(() => { const d = new Date(), p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; });
    let table = null;
    if (derived.code !== accountCcy) {
      await expect.poll(() => app.fx.range, { timeout: 20_000, message: "the app never received a /api/fx range answer — no rate the spec could mirror" }).not.toBeNull();
      table = buildRateTable(derived.code, accountCcy, app.fx.range.rates, null, [dayKey]);
    }
    const toAcct = (v) => {
      if (derived.code === accountCcy) return v;
      const c = convert(v, derived.code, accountCcy, table, dayKey);
      expect(c.value, `no ${derived.code}→${accountCcy} rate for ${dayKey} in what the app received (${c.reason}) — the toast could only be "—"`).not.toBeNull();
      return c.value;
    };
    const exitOf = (d) => (ENTRY + d).toFixed(4);
    const pnlOf = (d) => toAcct(saved.shares * (Number(exitOf(d)) - ENTRY));
    const tells = (v) => fmtMoney(v, accountCcy) !== fmtMoney(Math.round(v), accountCcy);
    const delta = DELTAS.find((d) => tells(pnlOf(d)) && bases.every((b) => tells(b + pnlOf(d))));
    expect(delta, `no close delta in [${DELTAS}] tells rounding from truth for shares ${saved.shares} · bases [${bases}]`).toBeDefined();
    const EXIT = exitOf(delta);
    const pnl = pnlOf(delta);
    const shown = fmtMoney(pnl, accountCcy);
    expect(shown.endsWith(".00"), `shares ${saved.shares} × ${delta} has no cents — the trade cannot tell rounding from truth`).toBe(false);
    // B-300 — a number, ⛔ "—", carrying the account's symbol.
    expect(shown, "expected P&L string is a dash").not.toBe("—");
    if (accountCcy === "ILS") expect(shown, "expected P&L string lacks ₪").toContain("₪");
    console.log(`[K2] shares ${saved.shares} · exit ${EXIT} · P&L ${shown} (rounded would be ${fmtMoney(Math.round(pnl), accountCcy)})`);

    await page.locator('[data-tour-tab="journal"]').click();
    // An OPEN card is the one that still carries a Close button (status text differs per language).
    const closeBtn = page.getByRole("button", { name: /^\s*(סגור|Close)\s*$/ });
    const card = page.locator("article").filter({ hasText: TRADE_TICKER }).filter({ has: closeBtn });
    await expect(card, "exactly one open EYEPB card (ours)").toHaveCount(1, { timeout: 15_000 });
    await card.locator("button").filter({ hasText: /^\s*(סגור|Close)\s*$/ }).click();
    // Same discipline as the entry form (prod run 37780897809): CI 37929305491 (HEAD · iphone14 · b, a
    // `$` arm this wave did not touch) showed the Close modal still open with Exit EMPTY — the field's
    // value was dropped. Asserted right after the fill and again before the click, so a recurrence
    // names `#close-exit` instead of timing out on a toast. ⛔ no re-fill: a dropped value is reported
    // (B-415), ⛔ papered over.
    await page.locator("#close-exit").fill(EXIT);
    await expect(page.locator("#close-exit"), `#close-exit did not take "${EXIT}"`).toHaveValue(EXIT);
    await expect(page.locator("#close-exit"), `#close-exit lost its value before Close Trade (B-415)`).toHaveValue(EXIT, { timeout: 1_000 });
    await page.getByRole("button", { name: /Close Trade/ }).click();
    return { pnl, shown, accountCcy, shares: saved.shares, savedLabel: saved.currency, paperCode: derived.code };
  }

  // B-340 — asserted AFTER the toast: the saved label is the PAPER's currency (the unit of entry/stop),
  // ⛔ the capital's. (The narrow read rule of B-300 masks a capital label at the toast, so this is
  // the assertion that sees it.)
  const expectPaperLabel = (r) =>
    expect(r.savedLabel, `saved label ${r.savedLabel} must be the paper currency ${r.paperCode} (B-340), ⛔ the capital ${r.accountCcy}`).toBe(r.paperCode);

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

      const r = await logAndClose(app, `${app.prefix}a`, [base]);
      console.log(`[K2 a] ${info.project.name}: shares ${r.shares} · expected ${r.shown} (${r.accountCcy})`);
      await expect(page.getByRole("status").getByText(`רווח ${r.shown} נסגר בהצלחה`, { exact: false }),
        `close toast (he) did not show ${r.shown}`).toBeVisible({ timeout: 10_000 });
      await shot("a-toast");
      expectPaperLabel(r);

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
      expectPaperLabel(r);
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
