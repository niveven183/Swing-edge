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
//   🆕 13.10 (B-045): a AND b also read B5 (this month's bar, a DIFF against the bar before the trade)
//            and B8 (the trade's dot) — both converted to the account currency, ⛔ raw paper P&L.
//            ⚠️ iphone14·a (WebKit + RTL) reaches the 9×9 B8 dot through a LOGGED `mouseover` dispatch after
//            the real hover misses (see `hoverUntil`) — that cell is a rendering proof, ⛔ a pointer-level one.
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
// A base read BACK from the screen is rounded to the cent: the true base lies in [b − 0.005, b + 0.005], so
// base + P&L prints as one of (at most) two adjacent cents. Production run 38434987667 (push 22d2e98): the
// B7 base "-₪148.45" + "+₪6.14" printed "-₪142.32" while the spec demanded "-₪142.31". The set is derived from
// the app's own formatter — ⛔ a numeric tolerance on the app's number — and an empty base (null) is exact.
const sumStrings = (base, pnl, ccy) => base == null
  ? [fmtMoney(pnl, ccy)]
  : [...new Set([-0.005, 0, 0.005].map((e) => fmtMoney(base + e + pnl, ccy)))];
const MONEY = /[+-][^\d\s]*[\d,]+\.\d{2}/;
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
    // EVERY range answer is kept WITH the window it was asked for — prod run 37944572577 (the first
    // ₪ closing run) failed `no_rate_for_day` intermittently (3 of 8 cells) while /api/fx had the
    // day's rate: the spec took whichever range answer landed LAST, which could be one for another
    // window (the app asks again as the journal's days change). The spec now picks the answer whose
    // window COVERS the close day, as the app's table does.
    const fx = { ranges: [] };
    page.on("response", async (r) => {
      try {
        const u = new URL(r.url());
        if (u.pathname === "/api/fx" && u.searchParams.get("start") && r.ok()) {
          const body = await r.json();
          fx.ranges.push({ start: u.searchParams.get("start"), end: u.searchParams.get("end"), rates: body.rates || {}, error: body.error || null });
        }
      } catch { /* a response whose body is gone is not a rate; the spec fails on "no covering answer" */ }
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
    // The FAB HIDES on scroll-down and returns only on a scroll-up of >10px per frame (SwingEdge_App.jsx
    // `fabVisible`). The B5 before-read scrolls the analytics tab down, and a smooth (index.css) or
    // coalesced scroll-to-top can miss the reveal: PR #73 CI run 38444103109 (pixel7·b, ILS-HIST) clicked a
    // FAB still `pointer-events-none` for 20s. So: instant top, and — if it is still hidden — the gesture a
    // user makes (down, then up, a frame apart), re-driven until the FAB is actionable. ⛔ a forced click.
    const fab = page.locator('[data-tour="add-trade"]');
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await expect(async () => {
      if (await fab.evaluate((el) => el.classList.contains("pointer-events-none"))) {
        await page.evaluate(async () => {
          const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          window.scrollTo({ top: Math.max(window.scrollY, 300), behavior: "instant" }); await frame();
          window.scrollTo({ top: 0, behavior: "instant" }); await frame();
        });
      }
      await expect(fab).not.toHaveClass(/pointer-events-none/, { timeout: 1_500 });
    }, "the FAB never came back (it hides on scroll-down; a scroll-up reveals it)").toPass({ timeout: 15_000 });
    await fab.click();
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
      const covering = () => app.fx.ranges.filter((x) => x.start <= dayKey && dayKey <= x.end);
      await expect.poll(() => covering().length, { timeout: 20_000, message: `the app never received a /api/fx range answer covering ${dayKey} (answers: ${JSON.stringify(app.fx.ranges.map((x) => [x.start, x.end]))}) — no rate the spec could mirror` }).toBeGreaterThan(0);
      // The app's table is built from its LATEST completed load (`loadRateTable`), so mirror the
      // latest answer whose window covers the day — ⛔ a union the app never holds.
      const last = covering().at(-1);
      table = buildRateTable(derived.code, accountCcy, last.rates, null, [dayKey]);
      console.log(`[K2] rate source: ${covering().length} covering answer(s) · windows ${JSON.stringify(covering().map((x) => [x.start, x.end, Object.keys(x.rates).length, x.error]))}`);
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
    // `far`: with a non-empty base the accepted set spans ±1 cent (sumStrings), so the rounded value must sit
    // farther than that from the true one — otherwise MUT-B7/MUT-B5 could land inside the set.
    const far = (v) => Math.abs(v - Math.round(v)) > 0.02;
    const delta = DELTAS.find((d) => tells(pnlOf(d)) && bases.every((b) => tells(b + pnlOf(d)) && far(b + pnlOf(d))));
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

  // 🆕 13.10 (B-045): B5 «P&L by Month» + B8 «Hold Time vs P&L» were fed the RAW paper P&L under the
  // ₪ symbol (₪3.74 for ₪12.35). Both are measured below in he AND en.
  //
  // Hover a chart mark and return the first tooltip text `done` accepts. Same discipline as the B3 hover
  // (locator.hover() with retries — ⛔ raw coordinates, red on WebKit in CI 37362747806): a detach while
  // recharts re-mounts is retried, and the tooltip text is polled because its wrapper exists while empty.
  async function hoverUntil(page, sec, marks, done, tag, { onlyLast = false } = {}) {
    const n = await marks.count();
    const trail = [];
    for (let i = n - 1; i >= (onlyLast ? n - 1 : 0); i--) {
      for (let k = 0; k < 4; k++) {
        try {
          // Vertical CENTER (away from the bottom edge, where the only B8 dot sat in PR #72 CI run 38358872939),
          // `inline: "nearest"` — ⛔ a horizontal pan. (The iphone14·a red itself is the visual-viewport offset
          // handled in the fallback below; ⛔ an overlay — the hit test returned the dot.)
          await marks.nth(i).evaluate((el) => el.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" }));
          await marks.nth(i).hover({ timeout: 4_000 });
        } catch (e) {
          const lines = String(e.message).split("\n");
          const blocker = lines.find((l) => /intercepts pointer events/.test(l)) || "";
          // What the browser's hit test returns at the mark's center — names a miss instead of guessing it.
          const hit = await marks.nth(i).evaluate((el) => {
            const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
            const h = document.elementFromPoint(x, y);
            return `bbox ${r.width.toFixed(1)}×${r.height.toFixed(1)} @${x.toFixed(0)},${y.toFixed(0)} · hit ${h ? `${h.tagName}.${h.getAttribute("class") || ""}` : "none"}`;
          }).catch(() => "bbox n/a");
          trail.push(`${tag} mark ${i} try ${k}: ${lines[0].slice(0, 120)}${blocker ? ` · ${blocker.trim().slice(0, 160)}` : ""} · ${hit}`);
          // FALLBACK — WebKit + RTL + a 9×9 SVG dot (PR #72 CI run 38358872939, iphone14·a; reproduced in local
          // WebKit). Playwright's computed point lands on the `recharts-surface` svg while `elementFromPoint` at
          // the dot's center returns the dot itself (the RTL page also sits panned by the visual viewport,
          // `visualViewport.offsetLeft` 0–8 — `B-424`); real-pointer variants (center scroll, path target,
          // hit-tested `mouse.move` ± the offset) all missed. The discriminating run: a `mouseover` dispatched
          // on the dot renders the tooltip with the converted value ⇒ pointer geometry, ⛔ the product.
          // Guarded: dispatched ONLY on a mark our own hit test returns (an overlay lying on top — the B3
          // WebKit red, run 37362747806 — is still refused), only after the real hover failed, and LOGGED in
          // the run (C-069 «מה נמצא»). The money assertion is unchanged: React-rendered text from real data.
          const pt = await marks.nth(i).evaluate((el) => {
            const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
            const h = document.elementFromPoint(x, y);
            const vv = window.visualViewport;
            return h && (h === el || el.contains(h)) ? { x, y, dx: vv ? vv.offsetLeft : 0, dy: vv ? vv.offsetTop : 0 } : null;
          }).catch(() => null);
          if (!pt) { await page.waitForTimeout(400); continue; }
          await marks.nth(i).dispatchEvent("mouseover", { bubbles: true });
          trail.push(`${tag} mark ${i} try ${k}: FALLBACK dispatch mouseover on the hit-tested mark (center ${pt.x.toFixed(0)},${pt.y.toFixed(0)} · visual-viewport offset ${pt.dx},${pt.dy})`);
        }
        let text = "";
        for (let j = 0; j < 10 && !text; j++) {
          text = (await sec.locator(".recharts-tooltip-wrapper").innerText().catch(() => "")).trim();
          if (!text) await page.waitForTimeout(150);
        }
        if (text && done(text)) {
          // A fallback that carried the read must say so in the run log (C-069 · "מה נמצא") — ⛔ silently.
          if (trail.length) console.log(`[K2] ${tag} hover trail (answered after) —\n  ${trail.join("\n  ")}`);
          return text;
        }
        trail.push(`${tag} mark ${i} try ${k}: tooltip ${JSON.stringify(text.replace(/\s+/g, " ").slice(0, 80))}`);
        if (text) break; // a tooltip that answered but is not ours — next mark
      }
    }
    console.log(`[K2] ${tag} hover trail —\n  ${trail.join("\n  ")}`);
    return null;
  }
  const chartSection = (page, title) => page.locator("h3").filter({ hasText: title })
    .locator("xpath=ancestor::div[.//*[contains(@class,'recharts-wrapper')]][1]");
  const monthNow = (page) => page.evaluate(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; });

  // B5 — the current month's bar (the trade's entry day is today, and `pnlByMonth` buckets on `t.date`).
  // Bars are sorted ascending ⇒ this month, when it exists, is the LAST bar. Returns null when there is
  // no bar for this month yet. ⛔ a fallback: a tooltip that cannot be parsed is a RED.
  // `before`: the six-chart block renders only when the journal has a closed trade (`closedTrades.length
  // > 0`), so an empty journal (the hermetic store) has NO section ⇒ base 0. The AFTER read never takes
  // that path — a locator that finds nothing there is a RED, so a broken locator cannot pass as "empty".
  // The analytics tab is OPEN once its always-present B3 heading is visible. The click is re-driven until
  // it is: PR #72 CI run 38424339444 (pixel7·b, ILS-MUT-A) — b's first action after login is this read,
  // and a single click landed during the hydration re-render and was lost (15s, heading never shown).
  // ⛔ a value is re-filled here — only a navigation is re-driven, and its END STATE is asserted.
  async function openAnalytics(page) {
    const tab = page.locator('[data-tour-tab="analytics"]');
    const heading = page.getByText(/^(רווח\/הפסד לפי עסקה|P&L by Trade)$/);
    await expect(async () => {
      if (!(await heading.isVisible())) await tab.click({ timeout: 3_000 });
      await expect(heading).toBeVisible({ timeout: 3_000 });
    }, "the analytics tab never rendered").toPass({ timeout: 25_000 });
  }

  // BarChart's tooltip is AXIS-triggered (the column under the pointer), ⛔ by the bar shape. Production run
  // 38434987667 (pixel7·b): this month's +₪6.14 B5 bar beside months worth hundreds was 0.3px tall — no hover
  // and no dispatched event on the shape could open it (B3 has the same exposure: a ~1px EYEPB bar beside a
  // ₪-9,900 one, EYE_SEED_HISTORY). So the pointer goes where a finger does: the bar's column, at mid-height
  // of the plot grid, on the chart surface (a large element — RTL WebKit's few-px offset cannot miss a column).
  // Returns the first tooltip text `done` accepts, or null; the trail is logged either way.
  async function hoverColumn(page, sec, bar, done, tag) {
    const surface = sec.locator(".recharts-surface").first();
    const grid = sec.locator(".recharts-cartesian-grid").first();
    const trail = [];
    let tip = null;
    for (let k = 0; k < 6 && !tip; k++) {
      try {
        await surface.evaluate((el) => el.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" }));
        const [bb, sb, gb] = await Promise.all([bar.boundingBox(), surface.boundingBox(), grid.boundingBox()]);
        await surface.hover({ timeout: 4_000, position: { x: bb.x + bb.width / 2 - sb.x, y: gb.y + gb.height / 2 - sb.y } });
      } catch (e) {
        trail.push(`try ${k}: ${String(e.message).split("\n")[0].slice(0, 140)}`);
        await page.waitForTimeout(400);
        continue;
      }
      let text = "";
      for (let j = 0; j < 10 && !text; j++) {
        text = (await sec.locator(".recharts-tooltip-wrapper").innerText().catch(() => "")).trim();
        if (!text) await page.waitForTimeout(150);
      }
      if (text && done(text)) { tip = text; break; }
      trail.push(`try ${k}: column tooltip ${JSON.stringify(text.replace(/\s+/g, " ").slice(0, 80))}`);
      if (text) break; // the column answered with another bar — the caller moves on
    }
    if (trail.length) console.log(`[K2] ${tag} column hover trail${tip ? " (answered after)" : ""} —\n  ${trail.join("\n  ")}`);
    return tip;
  }

  async function monthBar(page, { before = false } = {}) {
    await openAnalytics(page);
    const month = await monthNow(page);
    const sec = chartSection(page, /^(P&L לפי חודש|P&L by Month)/);
    // Only on an OPEN tab is "no section" an answer (an empty journal renders no six-chart block).
    if (before && (await sec.count()) === 0) return null;
    await expect(sec, "the P&L-by-month chart (B5) is not on the analytics tab").toHaveCount(1, { timeout: 15_000 });
    const bars = sec.locator(".recharts-bar-rectangle");
    if ((await bars.count()) === 0) return null;
    const tip = await hoverColumn(page, sec, bars.last(), () => true, "B5");
    expect(tip, "the last P&L-by-month bar never showed a tooltip").not.toBeNull();
    if (!tip.includes(month)) return null;
    const line = tip.slice(tip.indexOf("P&L"));
    const count = /·\s*(\d+)\s*trade/.exec(line);
    expect(count, `B5 tooltip has no trade count: ${JSON.stringify(tip)}`).not.toBeNull();
    const money = MONEY.exec(line);
    expect(money, `B5 tooltip has no two-decimal amount: ${JSON.stringify(tip)}`).not.toBeNull();
    return { text: line.replace(/\s+/g, " "), money: money[0], value: parseMoney(money[0]), count: Number(count[1]) };
  }

  // B5 after the close = the bar before + this trade's CONVERTED P&L (one of `sumStrings` — the base is read
  // back rounded to the cent; an empty base is exact), and one more trade. Raw vs converted differ ×3.3.
  async function expectMonthBar(page, before, r) {
    const after = await monthBar(page);
    expect(after, "B5 tooltip: no bar for this month after closing a trade").not.toBeNull();
    const want = sumStrings(before ? before.value : null, r.pnl, r.accountCcy);
    if (r.accountCcy === "ILS") expect(after.text, "B5 tooltip lacks ₪").toContain("₪");
    expect(want, `B5 tooltip should show ${want.join(" or ")} (before ${before?.text ?? "— no bar"} + ${r.shown}), got ${after.text}`).toContain(after.money);
    expect(after.count, `B5 tooltip trade count: ${before?.count ?? 0} + 1`).toBe((before?.count ?? 0) + 1);
  }

  // B8 — one dot per closed trade; hover until a tooltip names EYEPB AND carries this trade's P&L.
  async function expectScatterDot(page, r) {
    await openAnalytics(page);
    const sec = chartSection(page, /^(זמן החזקה vs P&L|Hold Time vs P&L)/);
    await expect(sec, "the hold-time scatter (B8) is not on the analytics tab").toHaveCount(1, { timeout: 15_000 });
    // The SHAPE (`path.recharts-symbols`, ~4.5px radius), ⛔ its `<g class="recharts-scatter-symbol">`
    // wrapper: PR #72 CI + local WebKit (iphone14·a) — at the wrapper's center the hit test returned the
    // `recharts-surface` svg, so the dot never received the pointer.
    const dots = sec.locator(".recharts-scatter-symbol .recharts-symbols");
    expect(await dots.count(), "the hold-time scatter has no dots").toBeGreaterThan(0);
    const seen = [];
    const tip = await hoverUntil(page, sec, dots, (t) => {
      if (t.includes(TRADE_TICKER)) seen.push(t.replace(/\s+/g, " "));
      return t.includes(TRADE_TICKER) && t.includes(r.shown);
    }, "B8");
    expect(tip, `B8 tooltip should show ${r.shown} on an ${TRADE_TICKER} dot (EYEPB tooltips seen: ${JSON.stringify(seen)})`).not.toBeNull();
  }

  test("a · he — close toast · journal card · per-trade tooltip (B3) · setup cell (B7) · month bar (B5) · hold scatter (B8)", async ({ browser }, info) => {
    const app = await openApp(browser, info, "he");
    const { page, shot } = app;
    try {
      const SETUP = "פריצה"; // the default setup ("Breakout") in Hebrew — the form is not touched
      const before = await setupCell(page, SETUP);
      const base = before == null ? 0 : parseMoney(before);
      console.log(`[K2 a] ${info.project.name}: setup cell before = ${before ?? "(no row)"}`);
      const month5 = await monthBar(page, { before: true });
      console.log(`[K2 a] ${info.project.name}: B5 this month before = ${month5?.text ?? "(no bar)"}`);

      const r = await logAndClose(app, `${app.prefix}a`, [base, month5?.value ?? 0]);
      console.log(`[K2 a] ${info.project.name}: shares ${r.shares} · expected ${r.shown} (${r.accountCcy})`);
      await expect(page.getByRole("status").getByText(`רווח ${r.shown} נסגר בהצלחה`, { exact: false }),
        `close toast (he) did not show ${r.shown}`).toBeVisible({ timeout: 10_000 });
      await shot("a-toast");
      expectPaperLabel(r);

      const card = page.locator("article").filter({ hasText: TRADE_TICKER }).filter({ hasText: r.shown });
      await expect(card.first(), `journal card does not show ${r.shown}`).toBeVisible({ timeout: 15_000 });

      const after = await setupCell(page, SETUP);
      expect(after, "no setup row after closing a Breakout trade").not.toBeNull();
      const want = sumStrings(before == null ? null : base, r.pnl, r.accountCcy);
      expect(want, `B7 setup cell: ${before ?? "—"} + ${r.shown} should read ${want.join(" or ")}, got ${after.trim()}`).toContain(after.trim());

      // B5 + B8 (before the B3 hover loop, the order b runs them in).
      await expectMonthBar(page, month5, r);
      await expectScatterDot(page, r);

      // B3 — one bar per closed trade; hover until the tooltip names EYEPB.
      const sec = page.getByText(/^(רווח\/הפסד לפי עסקה|P&L by Trade)$/).locator("xpath=ancestor::div[.//*[contains(@class,'recharts-wrapper')]][1]");
      const bars = sec.locator(".recharts-bar-rectangle");
      const n = await bars.count();
      expect(n, "the per-trade chart has no bars").toBeGreaterThan(0);
      // One column per closed trade, newest last: hover each column (axis-triggered — see `hoverColumn`) until
      // the tooltip names EYEPB. (The bar-shape hover it replaces could not reach a ~1px bar.)
      let tip = null;
      for (let i = n - 1; i >= 0 && !tip; i--) tip = await hoverColumn(page, sec, bars.nth(i), (t) => t.includes(TRADE_TICKER), `B3 bar ${i}`);
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

  test("b · en — close toast · journal card · month bar (B5) · hold scatter (B8)", async ({ browser }, info) => {
    const app = await openApp(browser, info, "en");
    const { page, shot } = app;
    try {
      const month5 = await monthBar(page, { before: true });
      console.log(`[K2 b] ${info.project.name}: B5 this month before = ${month5?.text ?? "(no bar)"}`);
      const r = await logAndClose(app, `${app.prefix}b`, [month5?.value ?? 0]);
      await expect(page.getByRole("status").getByText(`Closed with profit ${r.shown}`, { exact: false }),
        `close toast (en) did not show ${r.shown}`).toBeVisible({ timeout: 10_000 });
      await shot("b-toast");
      expectPaperLabel(r);
      const card = page.locator("article").filter({ hasText: TRADE_TICKER }).filter({ hasText: r.shown });
      await expect(card.first(), `journal card does not show ${r.shown}`).toBeVisible({ timeout: 15_000 });
      await expectMonthBar(page, month5, r);
      await expectScatterDot(page, r);
      await shot("b-analytics");
    } catch (e) {
      await app.onFail("b");
      throw e;
    } finally {
      await app.ctx.close();
    }
  });
});
