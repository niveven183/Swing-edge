// tests-eye/wave1.spec.js — fix round 1/7 «security & money» (B-456 … B-460).
//
// Plan: docs/plans/PLAN-2026-10-28-wave1-security-money.md · diagnosis: docs/audits/WAVE1-DIAGNOSIS-2026-10-28.md
//
// Five scenes, one per finding, each measuring what the USER's browser does with the deployed bytes:
//   F1  the monthly PDF: a lesson `<img src=x onerror=window.__xss=1>` must stay TEXT in the popup
//   F2  ₪ account, +$100 (AAPL) + ₪200 (TEVA, file_cell): weekly + monthly + analytics = ₪570 at 3.7;
//       with no rate ₪200 + «no FX rate for 1 of 2» (BEFORE: ₪300 everywhere)
//   F3  a password-recovery return `/app#access_token=…&refresh_token=…`: ⛔ token in ANY Sentry envelope
//   F4  an insert answered 500 + PG "Failing row contains (WAVEFX, 187.45)": one write_failure event,
//       tags {op, table, status, code, reason}, ⛔ price · ⛔ ticker · ⛔ PG text
//   F5  the three dots blink in CSS (open), sit still when closed, and do not move under reduced-motion
//
// TARGETS: hermetic (EYE_HERMETIC=1, scripts/eye-wave1-probe.mjs — HEAD · BEFORE · mutants) and production
// (QA account: REAL auth; `/rest/v1/user_settings` + `/rest/v1/trades` answered from a local store, every
// other REST write blocked; Sentry envelopes are routed to a local collector and ⛔ forwarded — nothing
// this spec does reaches the production Sentry project; `/api/fx` is answered locally so the gold is exact).

import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { blockAllRestWrites } from "../tests/lib/eyeTools.js";
import { allLangs, exactRx, containsRx } from "./labels.js";
import { installHermetic, answerRest, newStore, DUMMY_EMAIL, DUMMY_PASSWORD } from "./hermetic.js";

const HERMETIC = process.env.EYE_HERMETIC === "1";
const QA_EMAIL = HERMETIC ? DUMMY_EMAIL : process.env.SENTINEL_QA_EMAIL;
const QA_PASSWORD = HERMETIC ? DUMMY_PASSWORD : process.env.SENTINEL_QA_PASSWORD;
const EVIDENCE = process.env.EYE_EVIDENCE_DIR || join(process.cwd(), "eye-evidence");
const ARM = process.env.EYE_ARM || (HERMETIC ? "hermetic" : "production");
const INGEST_RX = /\/api\/\d+\/envelope\//;
const RATE = 3.7;
const XSS = "<img src=x onerror=window.__xss=1>";
const F4_TICKER = "WAVEFX"; // letters only: a digit makes the paper currency unverified ⇒ no size ⇒ no INSERT (measured 28.10)
const F4_PRICE = "187.45";
const PG_TEXT = `Failing row contains (${F4_TICKER}, ${F4_PRICE})`;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// «no FX rate for 1 of M»: the weekly window holds 2 closed trades, the reported (previous) month 5.
const noRateRx = (m) => new RegExp(allLangs("unconvertedClosedWarn").map((s) => esc(s.replace("{n}", "1").replace("{m}", String(m)))).join("|"));

const ctxOpts = (info) => {
  const u = info.project.use;
  const pick = ["viewport", "screen", "userAgent", "deviceScaleFactor", "isMobile", "hasTouch", "locale", "timezoneId"];
  return Object.fromEntries(pick.filter((k) => u[k] !== undefined).map((k) => [k, u[k]]));
};

/** Parse every item of every captured envelope ⇒ [{type, body}] (bodies that are not JSON are kept raw). */
const items = (envelopes) => envelopes.flatMap((e) => {
  const lines = e.split("\n").filter(Boolean);
  const out = [];
  for (let i = 1; i + 1 < lines.length; i += 2) {
    let h = {}; try { h = JSON.parse(lines[i]); } catch { /* raw */ }
    let body = lines[i + 1]; try { body = JSON.parse(lines[i + 1]); } catch { /* raw */ }
    out.push({ type: h.type || "?", body });
  }
  return out;
});

test.describe("wave 1 — security & money (B-456 … B-460)", () => {
  test.skip(!(QA_EMAIL && QA_PASSWORD), "no QA credentials (local run) — use the hermetic probe");

  async function open(browser, info, lang, store, scene, { fx = "rate", colorScheme = "dark", clock = null, reducedMotion = "no-preference" } = {}) {
    const ctx = await browser.newContext({ ...ctxOpts(info), baseURL: info.project.use.baseURL, colorScheme, reducedMotion });
    if (HERMETIC) await installHermetic(ctx, store);
    await ctx.addInitScript((l) => { if (l === "en") try { localStorage.setItem("swingEdgeLang", "en"); } catch { /* storage blocked */ } }, lang);
    // Sentry: every envelope is answered here and ⛔ forwarded (both modes).
    const envelopes = [];
    await ctx.route(INGEST_RX, async (route) => {
      envelopes.push(route.request().postData() || "");
      await route.fulfill({ status: 200, headers: { "access-control-allow-origin": "*" }, body: "{}" });
    });
    // /api/fx: a fixed rate, or no rate at all.
    await ctx.route(/\/api\/fx\?/, (route) => {
      if (fx === "none") return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "wave1: no rate" }) });
      const q = new URL(route.request().url()).searchParams;
      const base = q.get("base"), sym = q.get("symbols"), start = q.get("start"), end = q.get("end");
      const r = base === sym ? 1 : base === "USD" ? RATE : 1 / RATE;
      if (start && end) {
        const rates = {};
        for (let d = new Date(`${start}T00:00:00Z`); d <= new Date(`${end}T00:00:00Z`); d = new Date(d.getTime() + 864e5)) rates[d.toISOString().slice(0, 10)] = { [sym]: r };
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ base, start, end, rates }) });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ base, date: new Date().toISOString().slice(0, 10), rates: { [sym]: r } }) });
    });
    const page = await ctx.newPage();
    if (clock) await page.clock.setFixedTime(new Date(clock));
    if (!HERMETIC) {
      await blockAllRestWrites(page);
      await page.route(/\/rest\/v1\/(user_settings|trades)(\?|$)/, async (route) => {
        if (!store.userId) store.userId = await page.evaluate(() => {
          for (const k of Object.keys(localStorage)) if (/^sb-.*-auth-token$/.test(k)) { try { return JSON.parse(localStorage.getItem(k)).user.id; } catch { /* below */ } }
          return null;
        });
        if (!store.userId) throw new Error("[wave1] production: no session user id — the local store would answer the wrong user");
        if (!(await answerRest(route, store))) return route.fallback();
      });
    }
    const dir = join(EVIDENCE, "wave1", ARM, info.project.name);
    mkdirSync(dir, { recursive: true });
    const shot = (name, opts = {}) => page.screenshot({ path: join(dir, `${scene}-${lang}-${name}.png`), mask: [page.getByText(/@/)], ...opts }).catch(() => {});
    return { ctx, page, store, envelopes, dir, shot };
  }

  async function signIn(page, lang) {
    await page.goto("/", { waitUntil: "load" });
    await page.getByRole("button", { name: lang === "en" ? "EN" : "עב", exact: true }).click();
    await page.evaluate(() => { history.pushState({}, "", "/app"); dispatchEvent(new PopStateEvent("popstate")); });
    await page.locator('input[type="email"]').waitFor({ state: "visible", timeout: 20_000 });
    await page.locator('input[type="email"]').fill(QA_EMAIL);
    await page.locator('input[autocomplete="current-password"]').fill(QA_PASSWORD);
    await page.locator('button[type="submit"]').first().click();
    await page.locator('[data-tour-tab="journal"]').first().waitFor({ state: "visible", timeout: 30_000 });
  }
  const tab = async (page, id) => { await page.locator(`[data-tour-tab="${id}"]`).filter({ visible: true }).first().click(); await page.waitForTimeout(800); };
  // The consent card sits at the bottom on a fresh device — answered as a user would: decline (the
  // privacy-preserving choice). ⛔ addLocatorHandler (overlay.spec header).
  const closeOverlays = async (page) => {
    const b = page.locator('[data-testid="consent-decline"]');
    if (await b.isVisible().catch(() => false)) await b.click();
  };

  const nowIso = () => new Date(Date.now() - 3600_000).toISOString();
  const today = () => new Date().toISOString().slice(0, 10);
  const row = (o) => ({ side: "LONG", status: "CLOSED", setup: "Breakout", emotionAtEntry: "Neutral", marketCondition: "Trending Up", entryQuality: 3, notes: "wave1", ...o });

  // ── F1 · the PDF export does not run the lesson ─────────────────────────────────────────────────────────
  for (const lang of ["he", "en"]) {
    test(`F1 · ${lang} — a lesson with markup is TEXT in the exported PDF (B-456)`, async ({ browser }, info) => {
      const store = newStore();
      store.trades = [row({ id: "w1-f1", ticker: "AAPL", entry: 100, exit: 110, stop: 95, shares: 1, date: today(), closedAt: nowIso(), currency: "USD", currency_source: "manual_capital", lessonLearned: XSS })];
      const app = await open(browser, info, lang, store, "F1");
      try {
        await signIn(app.page, lang);
        await closeOverlays(app.page);
        await app.page.getByRole("button", { name: exactRx("openUserMenu") }).click();
        await app.page.getByRole("button", { name: exactRx("settings") }).click();
        const btn = app.page.getByRole("button", { name: containsRx("createPdf") }).first();
        await btn.scrollIntoViewIfNeeded();
        const [popup] = await Promise.all([app.page.waitForEvent("popup", { timeout: 20_000 }), btn.click()]);
        await popup.waitForLoadState("load").catch(() => {});
        await popup.waitForTimeout(800);
        const r = await popup.evaluate(() => ({ xss: window.__xss ?? null, imgs: document.querySelectorAll(".lessons img").length, li: [...document.querySelectorAll(".lessons li")].map((l) => l.textContent) }));
        await popup.screenshot({ path: join(app.dir, `F1-${lang}-popup.png`) }).catch(() => {});
        writeFileSync(join(app.dir, `F1-${lang}.json`), JSON.stringify(r, null, 2));
        expect(r.xss, "B-456: the lesson's onerror RAN in the same-origin popup").toBeNull();
        expect(r.imgs, "B-456: the lesson became an <img> element").toBe(0);
        expect(r.li.some((t) => t.includes(XSS)), `B-456: the lesson is not shown as literal text — got ${JSON.stringify(r.li)}`).toBe(true);
        await popup.close();
      } finally { await app.ctx.close(); }
    });
  }

  // ── F2 · weekly + monthly + analytics agree, converted ──────────────────────────────────────────────────
  for (const lang of ["he", "en"]) {
    for (const fx of ["rate", "none"]) {
      test(`F2 · ${lang} · ${fx === "rate" ? "rate 3.7 ⇒ ₪570" : "no rate ⇒ ₪200 + 1 excluded"} — weekly · monthly · analytics (B-457)`, async ({ browser }, info) => {
        const store = newStore();
        store.settings.capitalCurrency = "ILS";
        store.settings.accountCurrency = "ILS";
        // The weekly window (last 7 days): +$100 + ₪200. The monthly report shows COMPLETED months only and
        // needs 5 trades ⇒ the previous month: the same pair + three ₪ break-evens. Analytics (all time) = both.
        const prevMid = new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12) - 15 * 864e5;
        const pIso = new Date(prevMid).toISOString(), pDay = pIso.slice(0, 10);
        const pair = (tag, date, closedAt) => [
          row({ id: `w1-f2-usd-${tag}`, ticker: "AAPL", entry: 100, exit: 110, stop: 95, shares: 10, date, closedAt, currency: "USD", currency_source: "manual_capital" }),
          row({ id: `w1-f2-ils-${tag}`, ticker: "TEVA", entry: 30, exit: 32, stop: 29, shares: 100, date, closedAt, currency: "ILS", currency_source: "file_cell" }),
        ];
        store.trades = [
          ...pair("week", today(), nowIso()),
          ...pair("month", pDay, pIso),
          ...[1, 2, 3].map((i) => row({ id: `w1-f2-be${i}`, ticker: "TEVA", entry: 30, exit: 30, stop: 29, shares: 100, date: pDay, closedAt: pIso, currency: "ILS", currency_source: "file_cell" })),
        ];
        const gold = fx === "rate" ? "570" : "200";
        const goldAll = fx === "rate" ? "1,140" : "400"; // analytics, all time = week + previous month
        const app = await open(browser, info, lang, store, `F2-${fx}`, { fx });
        const { page } = app;
        try {
          await signIn(page, lang);
          await closeOverlays(page);
          await page.waitForTimeout(2500); // the FX table lands (or is refused)
          const seen = {};
          const amounts = (t) => (t.match(/[-+]?₪\s?[\d,]+(?:\.\d+)?/g) || []);
          const isGold = (t) => new RegExp(`^[+]?₪\\s?${gold}(?:\\.00)?$`).test(t.trim());
          await tab(page, "weeklyReview");
          // The weekly hero P&L — the one serif number on the screen.
          seen.weeklyHero = (await page.locator(".se-serif").first().innerText()).trim();
          seen.weekly = await page.locator("body").innerText();
          await app.shot("weekly");
          await tab(page, "tools");
          await page.getByRole("button", { name: containsRx("dnaReport") }).first().click();
          await page.waitForTimeout(800);
          // The report opens on the PREVIOUS completed month — where the five trades are.
          // The monthly summary cards' values (the Net P&L card is one of them).
          seen.monthlyCards = (await page.locator(".text-xl.font-bold.font-mono").allInnerTexts()).map((x) => x.trim());
          seen.monthly = await page.locator("body").innerText();
          await app.shot("monthly");
          await tab(page, "analytics");
          await page.waitForTimeout(800);
          seen.analytics = await page.locator("body").innerText();
          writeFileSync(join(app.dir, `F2-${fx}-${lang}.json`), JSON.stringify({ gold, weeklyHero: seen.weeklyHero, monthlyCards: seen.monthlyCards, goldAll, analyticsAmounts: amounts(seen.analytics).slice(0, 16) }, null, 2));
          expect.soft(isGold(seen.weeklyHero), `B-457 (weekly): the hero P&L is «${seen.weeklyHero}», expected ₪${gold}`).toBe(true);
          expect.soft(seen.monthlyCards.some(isGold), `B-457 (monthly): no summary card shows ₪${gold} — cards: ${seen.monthlyCards.join(" | ")}`).toBe(true);
          expect.soft(seen.monthlyCards.some((t) => /^[+]?₪\s?300(?:\.00)?$/.test(t)), "B-457 (monthly): ₪300 — the $ trade was summed as ₪").toBe(false);
          // analytics: the same engine on the same calc ⇒ the gold is on screen (positive check only — axis ticks are numbers too)
          expect.soft(new RegExp(`₪\\s?${goldAll}(?:\\.00)?(?![\\d,])`).test(seen.analytics), `B-457 (analytics, all time): ₪${goldAll} is not on screen — ${amounts(seen.analytics).slice(0, 10).join(" ")}`).toBe(true);
          if (fx === "none") {
            expect.soft(noRateRx(2).test(seen.weekly), "B-457: the weekly review does not say «no FX rate for 1 of 2»").toBe(true);
            expect.soft(noRateRx(5).test(seen.monthly), "B-457: the monthly report does not say «no FX rate for 1 of 5»").toBe(true);
          }
        } finally { await app.ctx.close(); }
      });
    }
  }

  // ── F3 · a token in the URL never reaches Sentry ────────────────────────────────────────────────────────
  test("F3 — a recovery return `/app#access_token=…&refresh_token=…`: 0 token values in every Sentry envelope (B-458)", async ({ browser }, info) => {
    const store = newStore();
    const app = await open(browser, info, "he", store, "F3");
    const { page } = app;
    try {
      const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
      const now = Math.floor(Date.now() / 1000);
      const AT = [b64({ alg: "HS256", typ: "JWT" }), b64({ sub: "00000000-0000-4000-8000-0000000000c6", aud: "authenticated", role: "authenticated", exp: now + 3600 }), "SIGWAVE1F3"].join(".");
      const RT = "RTSECRETWAVE1F3";
      // Sampling forced ONLY until DOMContentLoaded (Sentry samples the pageload in init) — then restored;
      // an event is captured through the SDK's own scope as early as it exists (the hash is still there).
      await page.addInitScript(() => {
        const r = Math.random; Math.random = () => r() * 0.09;
        document.addEventListener("DOMContentLoaded", () => { Math.random = r; }, { once: true });
        const cap = (tag) => { const c = window.__SENTRY__ && window.__SENTRY__[window.__SENTRY__.version]; const s = c && c.defaultCurrentScope; if (!s || !s.getClient()) return false; s.captureMessage(`wave1-f3-${tag}`); return true; };
        const iv = setInterval(() => { if (cap("early")) clearInterval(iv); }, 2);
        setTimeout(() => cap("late"), 5000);
      });
      await page.goto(`/app#access_token=${AT}&expires_at=${now + 3600}&expires_in=3600&refresh_token=${RT}&token_type=bearer&type=recovery`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(8000);
      const all = app.envelopes.join("\n");
      const types = items(app.envelopes).map((x) => x.type);
      writeFileSync(join(app.dir, "F3.json"), JSON.stringify({ envelopes: app.envelopes.length, types }, null, 2));
      expect(types.includes("transaction") && types.includes("event"), `F3 is INCONCLUSIVE: no transaction or no event reached the collector (${types.join(",")})`).toBe(true);
      expect(all.includes(RT), "B-458: the refresh_token reached a Sentry envelope").toBe(false);
      expect(all.includes(AT.slice(-10)), "B-458: the access_token reached a Sentry envelope").toBe(false);
    } finally { await app.ctx.close(); }
  });

  // ── F4 · a failed insert is reported with tags only ─────────────────────────────────────────────────────
  test("F4 — an insert answered 500 + PG row text ⇒ one write_failure event, closed tags, ⛔ price/ticker/PG text (B-459)", async ({ browser }, info) => {
    const store = newStore();
    const app = await open(browser, info, "en", store, "F4");
    const { page } = app;
    try {
      // Registered AFTER the store route ⇒ tried first. Only the INSERT fails; the journal GET still answers.
      let posts = 0;
      await page.route(/\/rest\/v1\/trades(\?|$)/, (route) => route.request().method() === "POST" && ++posts
        ? route.fulfill({ status: 500, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify({ code: "23514", message: `new row violates check constraint — ${PG_TEXT}`, details: PG_TEXT, hint: `${F4_TICKER} ${F4_PRICE}` }) })
        : route.fallback());
      await signIn(page, "en");
      await closeOverlays(page);
      await tab(page, "journal");
      await page.locator('[data-tour="add-trade"]').filter({ visible: true }).first().click();
      await page.locator("#log-ticker").fill(F4_TICKER);
      await page.waitForTimeout(1200);
      await page.locator("#log-entry").fill(F4_PRICE);
      await page.locator("#log-stop").fill("180");
      const submit = page.locator('[role="dialog"]').getByRole("button", { name: /Log Trade/ });
      await expect(submit).toBeEnabled({ timeout: 25_000 });
      await submit.click();
      await page.waitForTimeout(3000);
      await app.shot("after-submit");
      const toastText = await page.locator('[role="status"], [role="alert"]').allInnerTexts().catch(() => []);
      // A LATER, unrelated event — the console.error("Supabase insert failed:", …, PG text) breadcrumb rides on
      // it unless scrubBreadcrumb cut it to its first argument. Without this the G-crumb check is vacuous.
      await page.evaluate(() => { const c = window.__SENTRY__ && window.__SENTRY__[window.__SENTRY__.version]; c && c.defaultCurrentScope.captureMessage("wave1-f4-later"); });
      await page.waitForTimeout(2500);
      const evs = items(app.envelopes).filter((x) => x.type === "event" && x.body && typeof x.body === "object");
      const wf = evs.filter((e) => e.body.tags && e.body.tags.kind === "write_failure");
      const later = evs.find((e) => e.body.message === "wave1-f4-later" || e.body.message?.formatted === "wave1-f4-later");
      const crumb = (later?.body.breadcrumbs || []).find((b) => b.category === "console" && /Supabase insert failed/.test(b.message || ""));
      writeFileSync(join(app.dir, "F4.json"), JSON.stringify({ posts, toastText, events: evs.length, writeFailures: wf.map((e) => e.body.tags), laterCrumb: crumb || null, laterCrumbs: (later?.body.breadcrumbs || []).map((b) => `${b.category}:${(b.message || "").slice(0, 60)}`) }, null, 2));
      expect(posts, "F4 is INCONCLUSIVE: the form never sent the INSERT").toBeGreaterThan(0);
      expect(crumb, "G-crumb is INCONCLUSIVE: the later event carries no «Supabase insert failed» console breadcrumb").toBeTruthy();
      expect(crumb.message, "G-crumb: the console breadcrumb carries more than its first argument").toBe("Supabase insert failed:");
      expect(wf.length, "B-459: no write_failure event reached Sentry for the failed insert").toBe(1);
      const t = wf[0].body.tags;
      expect({ op: t.op, table: t.table, status: t.status, code: t.code, reason: t.reason }).toEqual({ op: "insert", table: "trades", status: 500, code: "23514", reason: "error" });
      const wire = JSON.stringify(wf[0].body);
      expect(wire.includes(F4_PRICE) || wire.includes(F4_TICKER) || wire.includes("Failing row"), "B-459: the write_failure event carries trade data / PG text").toBe(false);
      expect(app.envelopes.join("\n").includes("Failing row"), "B-459 · G-crumb: the PG row text reached SOME envelope (a console breadcrumb?)").toBe(false);
    } finally { await app.ctx.close(); }
  });

  // ── F5 · the dots ───────────────────────────────────────────────────────────────────────────────────────
  // Locate the three dots on BOTH trees (BEFORE has no se-pulse-* class): the market dot is the rounded span
  // whose next sibling repeats its colour; the overview dot is the rounded span right after the mo_title label.
  const MO_TITLES = JSON.stringify(allLangs("mo_title").map((x) => x.trim()));
  const DOTS = `(() => {
    const MO = ${MO_TITLES};
    const out = [];
    for (const el of document.querySelectorAll("span.rounded-full")) {
      const r = el.getBoundingClientRect(); if (!r.width || r.width > 10) continue;
      const next = el.nextElementSibling, prev = el.previousElementSibling;
      const where = el.closest("footer") ? "footer" : (next && next.style && next.style.color && el.style.backgroundColor) ? "header" : (prev && prev.tagName === "SPAN" && MO.includes(prev.textContent.trim())) ? "overview" : null;
      if (!where) continue;
      const s = getComputedStyle(el), b = getComputedStyle(el, "::before"), a = getComputedStyle(el, "::after");
      out.push({ where, cls: el.className, anim: s.animationName, opacity: s.opacity, bg: s.backgroundColor, before: b.animationName, after: a.animationName, box: [r.x, r.y, r.width, r.height].map(Math.round) });
    }
    return out;
  })()`;
  const OPEN_AT = "2026-10-27T15:00:00Z";   // Tuesday 11:00 New York — regular session
  const CLOSED_AT = "2026-10-25T15:00:00Z"; // Sunday
  // One language: the dots are not text (he = RTL, the harder layout). he + en load is F1/F2.
  for (const lang of ["he"]) {
    test(`F5 · ${lang} — the three dots blink in CSS when open · still when closed · ⛔ motion under reduced-motion (B-460)`, async ({ browser }, info) => {
      const runs = {};
      for (const [mode, clock, reducedMotion] of [["open", OPEN_AT, "no-preference"], ["closed", CLOSED_AT, "no-preference"], ["reduced", OPEN_AT, "reduce"]]) {
        const app = await open(browser, info, lang, newStore(), `F5-${mode}`, { clock, reducedMotion });
        const { page } = app;
        try {
          await signIn(page, lang);
          await closeOverlays(page);
          await page.waitForTimeout(1500);
          const dash = await page.evaluate(DOTS);
          for (const [i, d] of dash.entries()) {
            const clip = { x: Math.max(0, d.box[0] - 14), y: Math.max(0, d.box[1] - 10), width: 120, height: d.box[3] + 20 };
            await app.shot(`${d.where}${i}-a`, { clip });
            await page.waitForTimeout(1500);
            await app.shot(`${d.where}${i}-b`, { clip });
          }
          await tab(page, "intel");
          await page.waitForTimeout(1200);
          const intel = (await page.evaluate(DOTS)).filter((d) => d.where === "overview");
          for (const [i, d] of intel.entries()) {
            const clip = { x: Math.max(0, d.box[0] - 60), y: Math.max(0, d.box[1] - 10), width: 160, height: d.box[3] + 20 };
            await app.shot(`overview${i}-a`, { clip });
            await page.waitForTimeout(1500);
            await app.shot(`overview${i}-b`, { clip });
          }
          runs[mode] = { dash, intel };
        } finally { await app.ctx.close(); }
      }
      writeFileSync(join(EVIDENCE, "wave1", ARM, info.project.name, `F5-${lang}.json`), JSON.stringify(runs, null, 2));
      const market = (m) => runs[m].dash.filter((d) => d.where === "header" || d.where === "footer");
      expect(market("open").length, "F5 is INCONCLUSIVE: no market-state dot found").toBeGreaterThan(0);
      expect(runs.open.intel.length, "F5 is INCONCLUSIVE: no Market Overview dot found").toBe(1);
      for (const d of market("open")) expect.soft(d.anim, `B-460 (${d.where}, open): the dot is not a CSS animation`).toBe("se-pulse-opacity");
      for (const d of market("closed")) { expect.soft(d.anim, `B-460 (${d.where}, closed): animates while closed`).toBe("none"); expect.soft(d.opacity, `B-460 (${d.where}, closed)`).toBe("0.85"); }
      expect.soft(runs.open.intel[0].before, "B-460 (overview): the glow is not a CSS animation").toBe("livePulse, se-pulse-on");
      expect.soft(runs.open.intel[0].after, "B-460 (overview): the dark frame is not a CSS animation").toBe("se-pulse-off");
      for (const d of market("reduced")) expect.soft(d.anim, `B-460 (${d.where}, reduced-motion): still animates`).toBe("none");
      for (const d of runs.reduced.intel) { expect.soft(d.before, "B-460 (overview, reduced-motion): glow animates").toBe("none"); expect.soft(d.after, "B-460 (overview, reduced-motion): frame animates").toBe("none"); }
    });
  }
});
