// tests-eye/firstrun.spec.js — activation wave 1 (B-443…B-448): the road from «questionnaire done» to
// «first trade saved», as a brand-new user walks it.
//
// Plan: docs/plans/PLAN-2026-10-21-firstrun-activation.md · diagnosis: docs/audits/FIRSTRUN-DIAGNOSIS-2026-10-21.md
//
// THE USER: no `user_settings` row, an empty journal, a fresh device (the consent card was never
// answered), light mode. ⛔ `addLocatorHandler`, ⛔ dismissing a banner to get it out of the way —
// that is what hid B-404/B-405 (overlay.spec header). A banner that blocks a tap is a red, and the
// user's only remedy (answering the banner) is COUNTED as a tap.
//
// THE TAP COUNT. `tap()` = one real pointer tap (⛔ a JS `el.click()`). Typing is not a tap; the tap
// that focuses the field is. The count starts AFTER «מצוין! בואו נתחיל לסחור» (the questionnaire's
// last button, ⛔ counted — the questionnaire is wave 2) and ends when the trade is in the journal,
// the toast says so and the server holds the row. The policy is «follow the primary CTA», and it is
// the SAME on every tree: modal ⇒ its primary button · empty dashboard ⇒ its CTA · empty journal ⇒
// its CTA · the form ⇒ ticker · entry (only if empty) · stop · Log Trade. Budget: ≤ 5 (B-443/B-445).
//
// BEFORE EVERY COUNTED TAP: the target is inside the viewport and `elementFromPoint(centre)` is the
// target — WITHOUT scrolling (B-446). A brand-new user does not know there is something under the
// banner to scroll to. Questionnaire taps scroll like overlay.spec (`clear()`): a cover there is wave 2,
// recorded, ⛔ red here.
//
// CONTRAST: every visible text node of the welcome modal against its composited background
// (alpha-blended ancestors, then whatever is painted under it) ≥ 4.5:1, the close icon ≥ 3:1 —
// light mode is the gate, dark the control (B-444). Toast text the same (B-447). ⛔ axe (a new
// dependency); the WCAG 2.x formula is below, in the open.
//
// TARGETS: hermetic (EYE_HERMETIC=1, `scripts/eye-firstrun-probe.mjs`) and production (QA account:
// REAL auth, `/rest/v1/user_settings` + `/rest/v1/trades` answered from a local store — the QA row is
// never read or written — every other write blocked; `assertNoEscape` proves it).
// ⚠️ Production boundary: «saved» there = the deployed bundle received a success; the real DB write is
// covered by playbook.spec / C-073, ⛔ here.
// ⚠️ English: OnboardingScreen is Hebrew-only (wave 2). An English user is the device key
// `swingEdgeLang=en`, which sends the no-row user through `migrateFromLocalStorage` (a `{lang}` INSERT,
// no capital ⇒ the questionnaire's capital is still written — `dbCapitalRef`, SwingEdge_App.jsx).

import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { blockAllRestWrites, redact } from "../tests/lib/eyeTools.js";
import { containsRx } from "./labels.js";
import { installHermetic, answerRest, newStore, seedHistory, DUMMY_EMAIL, DUMMY_PASSWORD } from "./hermetic.js";

const HERMETIC = process.env.EYE_HERMETIC === "1";
const QA_EMAIL = HERMETIC ? DUMMY_EMAIL : process.env.SENTINEL_QA_EMAIL;
const QA_PASSWORD = HERMETIC ? DUMMY_PASSWORD : process.env.SENTINEL_QA_PASSWORD;
const EVIDENCE = process.env.EYE_EVIDENCE_DIR || join(process.cwd(), "eye-evidence");
// The questionnaire's capital currency (hermetic ILS arm: the submit waits for /api/fx).
const CCY = process.env.FIRSTRUN_CCY === "ILS" ? "ILS" : "USD";
const TAP_BUDGET = 5;
const TICKER = "EYEFR"; // no quote exists for it ⇒ the entry field is never auto-filled ⇒ a deterministic count
const IOS_BANNER_TEXT = "התקן את SwingEdge"; // hard-coded Hebrew in IOSInstallBanner.jsx

// ── anchors read from the source, each exactly once (B-272: an extraction failure is red, ⛔ a skip) ──
const src = (f) => readFileSync(join(process.cwd(), f), "utf8");
const once = (text, rx, what) => {
  const m = [...text.matchAll(rx)];
  if (m.length !== 1) throw new Error(`[firstrun] anchor «${what}» matched ${m.length}× (must be exactly 1) — re-anchor, ⛔ soften (B-272)`);
  return m[0][1];
};
const ONB = src("src/components/OnboardingScreen.jsx");
const ONB_START = once(ONB, /\n\s*(בואו נתחיל) <ChevronRight/g, "onboarding start");
const ONB_FINISH = once(ONB, /\n\s*(מצוין! בואו נתחיל לסחור)/g, "onboarding finish");
const ONB_NEXT = once(ONB, /step === 5 \? "[^"]+" : "([^"]+)"/g, "onboarding next");
const ONB_ANALYZE = once(ONB, /step === 5 \? "([^"]+)" :/g, "onboarding analyze");
// The FIRST option of each choice question, in order (experience · strategy · goal · frequency).
const ONB_FIRST_OPTION = (() => {
  const q = ONB.slice(ONB.indexOf("const QUESTIONS = ["), ONB.indexOf("];", ONB.indexOf("const QUESTIONS = [")));
  const blocks = q.split(/\n  \{\n/).slice(1);
  const firsts = blocks.map((b) => (/type: "amount"/.test(b) ? "AMOUNT" : (/options: \[\s*\{[^}]*label: "([^"]+)"/.exec(b) || [])[1]));
  if (firsts.length !== 5 || firsts.filter((x) => x === "AMOUNT").length !== 1 || firsts.some((x) => !x)) {
    throw new Error(`[firstrun] QUESTIONS shape changed (${JSON.stringify(firsts)}) — the questionnaire driver must be re-anchored (B-272)`);
  }
  return firsts;
})();
const WELCOME = src("src/components/WelcomeAnnouncement.jsx");
const WELCOME_TITLES = [...WELCOME.matchAll(/\n\s*title: "([^"]+)",/g)].map((m) => m[1]);
if (WELCOME_TITLES.length !== 2) throw new Error(`[firstrun] WelcomeAnnouncement titles matched ${WELCOME_TITLES.length}× (must be 2: he + en) (B-272)`);
// The welcome modal's primary CTA, on EVERY tree this spec judges (main: «בואו נתחיל»; after the
// wave: «תעד את העסקה הראשונה שלך» on a loaded empty journal).
const FIRST_TRADE_LABELS = ["תעד את העסקה הראשונה שלך", "Log your first trade"];
const BEGIN_LABELS = ["בואו נתחיל", "Let's begin"];
const PRIMARY_RX = new RegExp(`^\\s*(${[...FIRST_TRADE_LABELS, ...BEGIN_LABELS].map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\s*$`);
const FIRST_TRADE_RX = new RegExp(FIRST_TRADE_LABELS.join("|"));

// ── the browser-side instruments (serialised into the page) ─────────────────────────────────────────
// WCAG 2.x relative luminance / contrast over a composited background.
const INSTRUMENTS = `
window.__eye = (() => {
  const parse = (c) => {
    const m = /^rgba?\\(([^)]+)\\)$/.exec((c || "").trim());
    if (!m) return null;
    const p = m[1].split(/[\\s,\\/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const over = (t, b) => ({ r: t.r * t.a + b.r * (1 - t.a), g: t.g * t.a + b.g * (1 - t.a), b: t.b * t.a + b.b * (1 - t.a), a: 1 });
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const hex = (c) => "#" + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
  // Background UNDER element el at point (x,y): its own and its ancestors' backgrounds first (nearest on
  // top); if none is opaque, whatever is painted below at that point (a fixed toast sits over the page).
  // ⛔ a silent white: an unparsable colour is reported, and the canvas fallback is named in the result.
  function backdrop(el, x, y) {
    const layers = [];
    let opaque = false, bad = null;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (!c) { bad = getComputedStyle(n).backgroundColor; break; }
      if (c.a > 0) layers.push(c);
      if (c.a >= 1) { opaque = true; break; }
    }
    let source = "ancestors";
    if (!opaque && !bad) {
      const chain = new Set(); for (let n = el; n; n = n.parentElement) chain.add(n);
      for (const n of document.elementsFromPoint(x, y)) {
        if (chain.has(n) || el.contains(n)) continue;
        const c = parse(getComputedStyle(n).backgroundColor);
        if (!c) { bad = getComputedStyle(n).backgroundColor; break; }
        if (c.a > 0) layers.push(c);
        if (c.a >= 1) { opaque = true; source = "painted-below"; break; }
      }
    }
    if (!opaque && !bad) { layers.push({ r: 255, g: 255, b: 255, a: 1 }); source = "canvas-white"; }
    let base = layers[layers.length - 1];
    for (let i = layers.length - 2; i >= 0; i--) base = over(layers[i], base);
    return { bg: base, source, bad };
  }
  const visible = (el) => {
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) === 0) return false;
    }
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  // Every visible text node under root.
  function textContrast(root) {
    const out = [];
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let t = w.nextNode(); t; t = w.nextNode()) {
      const txt = t.textContent.trim();
      if (!txt || !/[\\p{L}\\p{N}]/u.test(txt)) continue; // emoji / arrows only ⇒ not text
      const el = t.parentElement;
      if (!el || !visible(el) || el.closest('[aria-hidden="true"]')) continue;
      const range = document.createRange(); range.selectNodeContents(t);
      const rr = range.getBoundingClientRect();
      const fg = parse(getComputedStyle(el).color);
      const { bg, source, bad } = backdrop(el, rr.left + rr.width / 2, rr.top + rr.height / 2);
      if (!fg || bad) { out.push({ text: txt.slice(0, 48), error: "unparsable colour: " + (bad || getComputedStyle(el).color) }); continue; }
      const fgc = over(fg, bg);
      out.push({ text: txt.slice(0, 48), fg: hex(fgc), bg: hex(bg), bgSource: source, ratio: Math.round(ratio(fgc, bg) * 100) / 100 });
    }
    return out;
  }
  function iconContrast(btn) {
    const fg = parse(getComputedStyle(btn).color);
    const r = btn.getBoundingClientRect();
    const { bg, source, bad } = backdrop(btn, r.left + r.width / 2, r.top + r.height / 2);
    if (!fg || bad) return { error: "unparsable colour" };
    const fgc = over(fg, bg);
    return { fg: hex(fgc), bg: hex(bg), bgSource: source, ratio: Math.round(ratio(fgc, bg) * 100) / 100 };
  }
  // In the viewport, and the centre hits the element itself — NO scrolling.
  function clearNow(el) {
    const b = el.getBoundingClientRect();
    const x = b.left + b.width / 2, y = b.top + b.height / 2;
    const inView = b.top >= -0.5 && b.left >= -0.5 && b.bottom <= innerHeight + 0.5 && b.right <= innerWidth + 0.5; // sub-pixel layout, ⛔ a real overflow
    const top = inView ? document.elementFromPoint(x, y) : null;
    const by = !inView ? "outside the viewport" : !top ? "nothing" : top.closest(".se-consent") ? "consent banner"
      : top.closest("div.fixed") && !el.closest("div.fixed")?.contains(top) ? "fixed: " + top.closest("div.fixed").textContent.slice(0, 40)
      : top.tagName + "." + String(top.className).slice(0, 40);
    return { ok: inView && !!top && (top === el || el.contains(top)), by, rect: { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) }, vw: innerWidth, vh: innerHeight };
  }
  // The toast live region: ⛔ painted while it holds nothing (B-447).
  function toastRegion() {
    const el = document.querySelector('[role="status"][aria-live="polite"]');
    if (!el) return { exists: false };
    const s = getComputedStyle(el), r = el.getBoundingClientRect();
    const bg = parse(s.backgroundColor);
    const borders = ["Top", "Right", "Bottom", "Left"].reduce((a, k) => a + parseFloat(s["border" + k + "Width"] || "0"), 0);
    const painted = (bg && bg.a > 0) || borders > 0 || (s.boxShadow && s.boxShadow !== "none");
    return { exists: true, children: el.children.length, w: Math.round(r.width), h: Math.round(r.height), bg: s.backgroundColor, borders, shadow: s.boxShadow, padding: s.padding, shown: r.width * r.height > 0 && painted };
  }
  return { textContrast, iconContrast, clearNow, toastRegion };
})();
`;

test.describe("activation wave 1 — first run: questionnaire done ⇒ first trade saved", () => {
  test.skip(!(QA_EMAIL && QA_PASSWORD), "no QA credentials (local run) — use the hermetic probe");

  const ctxOpts = (info) => {
    const u = info.project.use;
    const pick = ["viewport", "screen", "userAgent", "deviceScaleFactor", "isMobile", "hasTouch", "locale", "timezoneId"];
    return Object.fromEntries(pick.filter((k) => u[k] !== undefined).map((k) => [k, u[k]]));
  };
  const isIOS = (info) => /iPhone|iPad/.test(info.project.use.userAgent || "");
  const isDesktop = (info) => info.project.name.startsWith("desktop");

  /** One context = one device. `store` answers user_settings + trades in BOTH modes. */
  async function open(browser, info, lang, store, scene) {
    const ctx = await browser.newContext({ ...ctxOpts(info), baseURL: info.project.use.baseURL, colorScheme: "light" });
    if (HERMETIC) await installHermetic(ctx, store);
    // The language is a DEVICE key only for English (see header); a Hebrew first-run device has none.
    await ctx.addInitScript(([l, code]) => {
      if (!location.protocol.startsWith("http")) return;
      if (l === "en") localStorage.setItem("swingEdgeLang", "en");
      // eslint-disable-next-line no-eval
      (0, eval)(code);
    }, [lang, INSTRUMENTS]);
    const page = await ctx.newPage();
    const writes = { observed: [], local: [] };
    let blocker = null;
    if (!HERMETIC) {
      // Order matters: Playwright tries the LAST registered route first ⇒ the two local tables win.
      blocker = await blockAllRestWrites(page);
      await page.route(/\/rest\/v1\/(user_settings|trades)(\?|$)/, async (route) => {
        if (!store.userId) store.userId = await page.evaluate(() => {
          for (const k of Object.keys(localStorage)) if (/^sb-.*-auth-token$/.test(k)) { try { return JSON.parse(localStorage.getItem(k)).user.id; } catch { /* below */ } }
          return null;
        });
        if (!store.userId) throw new Error("[firstrun] production: no session user id — the local store would answer the wrong user");
        if (route.request().method() !== "GET") writes.local.push(`${route.request().method()} ${new URL(route.request().url()).pathname}`);
        if (!(await answerRest(route, store))) return route.fallback();
      });
      page.on("request", (r) => { if (/\/rest\/v1\//.test(r.url()) && !["GET", "HEAD", "OPTIONS"].includes(r.method())) writes.observed.push(`${r.method()} ${new URL(r.url()).pathname}`); });
    }
    const dir = join(EVIDENCE, "firstrun", info.project.name);
    mkdirSync(dir, { recursive: true });
    const rec = { scene, lang, project: info.project.name, mode: HERMETIC ? "hermetic" : "production", ccy: CCY, taps: [], clear: [], questionnaire: [], notes: [] };
    const shot = (name) => page.screenshot({ path: join(dir, `${scene}-${lang}-${name}.png`), mask: [page.getByText(/@/)] }).catch(() => {});
    // ⛔ a write reached the network: every non-GET REST request was answered locally (store or blocker).
    const assertNoEscape = () => {
      if (HERMETIC) return;
      const handled = writes.local.length + blocker.list().length;
      expect(writes.observed.length, `a REST write escaped the local answers: observed ${writes.observed.join(" | ")} · local ${writes.local.join(" | ")} · blocked ${blocker.list().join(" | ")}`).toBe(handled);
    };
    return { ctx, page, store, dir, rec, shot, assertNoEscape };
  }

  const finish = async (app) => {
    writeFileSync(join(app.dir, `${app.rec.scene}-${app.rec.lang}.json`), JSON.stringify(app.rec, null, 2));
    await app.ctx.close();
  };

  async function toAuth(page, lang) {
    await page.goto("/", { waitUntil: "load" });
    await page.getByRole("button", { name: lang === "en" ? "EN" : "עב", exact: true }).click();
    await page.evaluate(() => { history.pushState({}, "", "/app"); dispatchEvent(new PopStateEvent("popstate")); });
    await page.locator('input[type="email"]').waitFor({ state: "visible", timeout: 20_000 });
  }
  async function submitLogin(page) {
    await page.locator('input[type="email"]').fill(QA_EMAIL);
    await page.locator('input[autocomplete="current-password"]').fill(QA_PASSWORD);
    await page.locator('button[type="submit"]').first().click();
  }

  const consentUp = (page) => page.locator(".se-consent__card").isVisible().catch(() => false);
  const iosBanner = (page) => page.locator("div.fixed").filter({ hasText: IOS_BANNER_TEXT });
  const welcomeModal = (page) => page.locator("div.fixed.inset-0").filter({ has: page.locator("h1, h2").filter({ hasText: new RegExp(WELCOME_TITLES.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")) }) }).last();
  const welcomePrimary = (page) => welcomeModal(page).getByRole("button", { name: PRIMARY_RX });
  const welcomeClose = (page) => welcomeModal(page).getByRole("button", { name: /^(סגור|Close)$/ });
  const logForm = (page) => page.locator('[role="dialog"][aria-modal="true"]').filter({ has: page.locator("#log-ticker") });
  const dashCta = (page) => page.getByRole("button", { name: containsRx("addFirstTrade") });
  const journalCta = (page) => page.locator('[data-tour="add-first-trade"]');

  /** A counted tap: clear ⇒ tap. Covered ⇒ red (soft — the count continues) + the user's remedy. */
  async function tap(app, locator, label, { count = true } = {}) {
    const { page, rec } = app;
    await locator.waitFor({ state: "visible", timeout: 20_000 });
    await page.waitForTimeout(300); // entry animations settle (a human does not tap mid-fade)
    const r = await locator.evaluate((el) => window.__eye.clearNow(el));
    rec.clear.push({ label, ...r });
    if (isIOS(test.info()) && rec.scene === "path" && !rec.saved) {
      const n = await iosBanner(page).count();
      expect.soft(n, `B-446: the iOS install banner is up before the first trade (at «${label}»)`).toBe(0);
    }
    expect.soft(r.ok, `B-446: «${label}» — centre (${r.rect.x + r.rect.w / 2 | 0},${r.rect.y + r.rect.h / 2 | 0} of ${r.vw}×${r.vh}) is not tappable without scrolling: ${redact(r.by)}`).toBe(true);
    if (count) rec.taps.push(label);
    if (!r.ok) {
      // The user's remedy: scroll to it; if a banner still sits on it, answer the banner (a counted tap).
      await locator.scrollIntoViewIfNeeded();
      await page.waitForTimeout(250);
      const r2 = await locator.evaluate((el) => window.__eye.clearNow(el));
      rec.clear.push({ label: `${label} (after scroll)`, ...r2 });
      if (!r2.ok && r2.by === "consent banner" && (await consentUp(page))) {
        rec.taps.push(`remedy: answer the consent banner to reach «${label}»`);
        await page.locator('[data-testid="consent-decline"]').click();
        await page.waitForTimeout(300);
      }
    }
    await locator.click(); // a real tap — Playwright refuses a covered element
  }

  /** Questionnaire (wave 2, ⛔ counted): scroll like overlay.spec; a cover is recorded, never red. */
  async function qTap(app, locator, label) {
    const { page, rec } = app;
    await locator.waitFor({ state: "visible", timeout: 20_000 });
    await locator.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    const r = await locator.evaluate((el) => window.__eye.clearNow(el));
    rec.questionnaire.push({ label, ok: r.ok, by: r.by });
    await locator.click();
  }

  async function questionnaire(app) {
    const { page } = app;
    const root = page.locator('div.fixed.inset-0[dir="rtl"]').filter({ hasText: ONB_START }).first();
    await root.waitFor({ state: "visible", timeout: 30_000 });
    await qTap(app, page.getByRole("button", { name: new RegExp(`^\\s*${ONB_START}`) }), "start");
    for (let i = 0; i < 5; i++) {
      if (ONB_FIRST_OPTION[i] === "AMOUNT") {
        await qTap(app, page.getByRole("button", { name: new RegExp(`${CCY}$`) }), `currency ${CCY}`);
        await page.locator('input[type="number"]').fill("10000");
      } else {
        await qTap(app, page.locator("button").filter({ hasText: ONB_FIRST_OPTION[i] }).first(), `q${i + 1}: ${ONB_FIRST_OPTION[i]}`);
      }
      await qTap(app, page.getByRole("button", { name: new RegExp(i === 4 ? ONB_ANALYZE : `^\\s*${ONB_NEXT}`) }), i === 4 ? "analyze" : `next ${i + 1}`);
    }
    await qTap(app, page.getByRole("button", { name: new RegExp(ONB_FINISH) }), "finish (⛔ counted)");
  }

  async function contrastOfWelcome(app, scheme) {
    const { page, rec } = app;
    const modal = welcomeModal(page);
    const card = modal.locator("h1, h2").first().locator("xpath=ancestor::div[contains(@class,'rounded-2xl')][1]");
    const texts = await card.evaluate((el) => window.__eye.textContrast(el));
    const icon = await welcomeClose(page).evaluate((el) => window.__eye.iconContrast(el)).catch((e) => ({ error: String(e).slice(0, 120) }));
    rec[`contrast_${scheme}`] = { texts, icon };
    return { texts, icon };
  }

  function judgeContrast(c, scheme, soft = true) {
    const ex = soft ? expect.soft : expect;
    const errs = c.texts.filter((t) => t.error);
    ex(errs, `B-444 (${scheme}): colours the instrument could not read — ${JSON.stringify(errs)}`).toEqual([]);
    ex(c.texts.length, `B-444 (${scheme}): no text measured in the welcome card`).toBeGreaterThan(0);
    const low = c.texts.filter((t) => !t.error && t.ratio < 4.5);
    ex(low, `B-444 (${scheme}): welcome-modal text below 4.5:1 — ${low.map((t) => `«${t.text}» ${t.ratio}:1 (${t.fg} on ${t.bg})`).join(" · ")}`).toEqual([]);
    ex(c.icon.error, `B-444 (${scheme}): the close icon could not be measured`).toBeUndefined();
    if (!c.icon.error) ex(c.icon.ratio, `B-444 (${scheme}): close icon ${c.icon.fg} on ${c.icon.bg}`).toBeGreaterThanOrEqual(3);
  }

  async function setScheme(page, scheme) {
    await page.emulateMedia({ colorScheme: scheme });
    await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains("dark")), { timeout: 5_000 }).toBe(scheme === "dark");
    await page.waitForTimeout(150);
  }

  async function judgeToastRegion(app, when) {
    const t = await app.page.evaluate(() => window.__eye.toastRegion());
    app.rec[`toastRegion_${when}`] = t;
    expect.soft(t.exists, "the toast live region must exist before content arrives (B-388)").toBe(true);
    expect.soft(t.shown, `B-447 (${when}): the EMPTY toast region is painted — ${t.w}×${t.h} · bg ${t.bg} · border ${t.borders}px · shadow ${t.shadow}`).toBe(false);
  }

  async function toastContrast(app, kindLabel, textRx) {
    const { page, rec } = app;
    const toast = page.getByRole("status").locator("> div").filter({ hasText: textRx }).first();
    await toast.waitFor({ state: "visible", timeout: 10_000 });
    // `animate-fade-in` starts at opacity 0 — measured mid-fade the instrument sees no visible text
    // (diagnosis run 1: 0 nodes). Wait for the entry animation to finish, ⛔ a blind sleep.
    await toast.evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => {}))));
    const texts = await toast.evaluate((el) => window.__eye.textContrast(el));
    rec[`toast_${kindLabel}`] = texts;
    const low = texts.filter((x) => x.error || x.ratio < 4.5);
    expect.soft(texts.length, `B-447: no text measured in the ${kindLabel} toast`).toBeGreaterThan(0);
    expect.soft(low, `B-447: ${kindLabel} toast text below 4.5:1 in light mode — ${low.map((x) => `«${x.text}» ${x.ratio}:1 (${x.fg} on ${x.bg}, ${x.bgSource})`).join(" · ")}`).toEqual([]);
    return toast;
  }

  /** Which screen is the user looking at? Priority: form ⇒ welcome ⇒ empty dashboard ⇒ empty journal. */
  async function screenNow(page, timeout = 20_000) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      if (await logForm(page).isVisible().catch(() => false)) return "form";
      if (await welcomePrimary(page).isVisible().catch(() => false)) return "welcome";
      if (await dashCta(page).isVisible().catch(() => false)) return "dashboard";
      if (await journalCta(page).isVisible().catch(() => false)) return "journal";
      await page.waitForTimeout(150);
    }
    return "unknown";
  }

  async function fillAndSave(app, { ticker = TICKER, entry = "100", stop = "99", count = true } = {}) {
    const { page } = app;
    const form = logForm(page);
    await tap(app, form.locator("#log-ticker"), "form: ticker", { count });
    await page.locator("#log-ticker").fill(ticker);
    await page.waitForTimeout(1_000); // the quote lookup runs 250ms after a ticker; let it fill entry if it can
    if (!(await page.locator("#log-entry").inputValue())) {
      await tap(app, form.locator("#log-entry"), "form: entry", { count });
      await page.locator("#log-entry").fill(entry);
    } else app.rec.notes.push(`entry auto-filled: ${await page.locator("#log-entry").inputValue()}`);
    await tap(app, form.locator("#log-stop"), "form: stop", { count });
    await page.locator("#log-stop").fill(stop);
    const submit = form.getByRole("button", { name: /Log Trade/ });
    await expect(submit, "Log Trade stays disabled (capital / rate gate)").toBeEnabled({ timeout: 25_000 });
    await tap(app, submit, "form: Log Trade", { count });
  }

  for (const lang of ["he", "en"]) {
    // ── P1: the primary path, counted ─────────────────────────────────────────────────────────────
    test(`path · ${lang} — no settings row, empty journal: questionnaire done ⇒ saved trade in ≤ ${TAP_BUDGET} taps`, async ({ browser }, info) => {
      const store = newStore();
      store.rowGone = true; store.settings = {};
      const app = await open(browser, info, lang, store, "path");
      const { page, rec, shot } = app;
      try {
        await toAuth(page, lang);
        await expect(page.locator(".se-consent__card"), "fresh device: the consent banner must be up").toBeVisible();
        await submitLogin(page);
        await questionnaire(app);
        rec.notes.push(`settings row after the questionnaire: ${store.rowGone ? "none" : "written"}`);

        // The dashboard renders BEFORE hydration decides on the welcome modal (diagnosis run 2,
        // iphone14tall: the scene tapped the dashboard CTA under a modal that arrived 1 frame later).
        // A first-run user always gets the modal on every tree ⇒ wait for it; its absence is red.
        await expect(welcomePrimary(page), "the welcome modal never appeared for a first-run user").toBeVisible({ timeout: 20_000 });
        let first = true;
        for (let guard = 0; guard < 15; guard++) {
          const s = await screenNow(page);
          if (s === "form" || s === "unknown") { rec.notes.push(`screen: ${s}`); if (s === "unknown") await shot("UNKNOWN-SCREEN"); break; }
          if (s === "welcome") {
            if (first) {
              first = false;
              await page.waitForTimeout(1_500); // a human reads before tapping; trades settle (B-445 label)
              await judgeToastRegion(app, "empty-before-first-tap");
              await shot("welcome-light");
              judgeContrast(await contrastOfWelcome(app, "light"), "light");
              await setScheme(page, "dark");
              await shot("welcome-dark");
              const dark = await contrastOfWelcome(app, "dark");
              await setScheme(page, "light");
              // Dark is the CONTROL: green on both trees. Recorded and judged — red here is a finding in its own right.
              judgeContrast(dark, "dark (control)");
              rec.welcomeLabel = (await welcomePrimary(page).innerText()).trim();
            }
            await tap(app, welcomePrimary(page), `welcome: «${(await welcomePrimary(page).innerText()).trim()}»`);
          } else if (s === "dashboard") {
            await shot("dashboard");
            await tap(app, dashCta(page), "dashboard: add first trade");
          } else if (s === "journal") {
            await tap(app, journalCta(page), "journal: add first trade");
          }
        }
        await expect(logForm(page), "the trade form never opened").toBeVisible();
        await shot("form");
        const xClose = logForm(page).getByRole("button", { name: /^(סגור|Close)$/ }).first();
        const rx = await xClose.evaluate((el) => window.__eye.clearNow(el));
        rec.clear.push({ label: "form: close (X)", ...rx });
        expect.soft(rx.ok, `B-446: the Log Trade close button is not tappable: ${redact(rx.by)}`).toBe(true);
        await fillAndSave(app);

        // Saved = form gone + toast + the row in the journal + the row on the server.
        await expect(page.locator('[aria-modal="true"]'), "the form did not close after Log Trade").toHaveCount(0, { timeout: 20_000 });
        await toastContrast(app, "success", new RegExp(TICKER));
        rec.saved = true;
        await expect.poll(() => store.trades.filter((t) => t.ticker === TICKER).length, { timeout: 20_000, message: "the server never received the trade" }).toBe(1);
        await expect(page.getByText(TICKER).filter({ visible: true }).first(), "the trade is not in the journal").toBeVisible();
        rec.tapCount = rec.taps.length;
        await shot("saved");
        // The empty region again, once the toast has gone.
        await expect.poll(async () => (await page.evaluate(() => window.__eye.toastRegion())).children, { timeout: 15_000 }).toBe(0);
        await judgeToastRegion(app, "empty-after-toast");

        // Error toast (⛔ counted): an invalid stop for a LONG ⇒ validateTradeInputs refuses.
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
        await page.locator('[data-tour="add-trade"]').click();
        await fillAndSave(app, { ticker: "EYEFX", entry: "100", stop: "101", count: false });
        await toastContrast(app, "error", /קלט לא תקין|Invalid input/);
        await page.keyboard.press("Escape");
        await expect(page.locator('[aria-modal="true"]')).toHaveCount(0, { timeout: 5_000 });

        // Close Trade + Edit modals with the banner still up (⛔ counted, ⛔ submitted).
        if (await consentUp(page)) {
          const row = isDesktop(info) ? page.locator('[data-testid="journal-table"] tbody tr').filter({ hasText: TICKER }) : page.locator("div.md\\:hidden > div").filter({ hasText: TICKER });
          await row.locator("button").filter({ hasText: /^\s*(Close|סגור)\s*$/ }).first().click();
          const closeModal = page.locator('[role="dialog"][aria-modal="true"]');
          await closeModal.waitFor({ state: "visible", timeout: 10_000 });
          for (const [lbl, loc] of [["close-trade: submit", closeModal.getByRole("button", { name: /Close Trade/ })], ["close-trade: cancel", closeModal.getByRole("button", { name: /^Cancel$/ })], ["close-trade: X", closeModal.getByRole("button", { name: /^(סגור|Close)$/ })]]) {
            const r = await loc.evaluate((el) => window.__eye.clearNow(el));
            rec.clear.push({ label: lbl, ...r });
            expect.soft(r.ok, `B-446: «${lbl}» is not tappable with the consent banner up: ${redact(r.by)}`).toBe(true);
          }
          await shot("close-modal");
          await page.keyboard.press("Escape");
          await expect(page.locator('[aria-modal="true"]')).toHaveCount(0, { timeout: 5_000 });
          if (isDesktop(info)) await row.locator('button[title="עריכה"], button[title="Edit"]').click();
          else await row.locator(`text=${TICKER}`).first().click();
          const edit = page.locator('[role="dialog"][aria-modal="true"]');
          await edit.waitFor({ state: "visible", timeout: 10_000 });
          for (const [lbl, loc] of [["edit: save", edit.getByRole("button", { name: /שמור שינויים|Save Changes/ })], ["edit: cancel", edit.getByRole("button", { name: /^(ביטול|Cancel)$/ })], ["edit: X", edit.getByRole("button", { name: /^(סגור|Close)$/ })]]) {
            const r = await loc.evaluate((el) => window.__eye.clearNow(el));
            rec.clear.push({ label: lbl, ...r });
            expect.soft(r.ok, `B-446: «${lbl}» is not tappable with the consent banner up: ${redact(r.by)}`).toBe(true);
          }
          await shot("edit-modal");
          await page.keyboard.press("Escape");
        } else rec.notes.push("consent banner answered on the path ⇒ the Close/Edit modal check ran without it (see taps)");

        expect(rec.tapCount, `B-443/B-445: ${rec.tapCount} taps from «questionnaire done» to a saved trade (budget ${TAP_BUDGET}): ${rec.taps.join(" → ")}`).toBeLessThanOrEqual(TAP_BUDGET);
        app.assertNoEscape();
      } finally {
        await finish(app);
      }
    });

    // ── P2: the user who closes the welcome modal ──────────────────────────────────────────────────
    test(`dashboard CTA · ${lang} — welcome closed with X ⇒ the dashboard CTA opens the form in one tap · journal CTA clear`, async ({ browser }, info) => {
      const store = newStore();
      delete store.settings.welcomeSeen;
      store.settings.lang = lang;
      const app = await open(browser, info, lang, store, "dashboard");
      const { page, rec, shot } = app;
      try {
        await toAuth(page, lang);
        await submitLogin(page);
        await welcomePrimary(page).waitFor({ state: "visible", timeout: 30_000 });
        await page.waitForTimeout(1_500);
        await tap(app, welcomeClose(page), "welcome: close (X)");
        await expect(welcomeModal(page)).toHaveCount(0, { timeout: 5_000 });
        await shot("dashboard");
        await tap(app, dashCta(page), "dashboard: add first trade");
        await expect(logForm(page), "B-443: the dashboard's «add first trade» did not open the trade form (it only navigated)").toBeVisible({ timeout: 5_000 });
        await page.keyboard.press("Escape");
        await expect(page.locator('[aria-modal="true"]')).toHaveCount(0, { timeout: 5_000 });
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
        await page.locator('[data-tour-tab="journal"]').first().click();
        await shot("journal-empty");
        await tap(app, journalCta(page), "journal: add first trade", { count: false });
        await expect(logForm(page), "the journal's empty-state CTA did not open the form").toBeVisible({ timeout: 5_000 });
        app.assertNoEscape();
      } finally {
        await finish(app);
      }
    });

    // ── an existing user who never saw the welcome, on a slow network (B-445 · tradesLoaded) ──────
    for (const journal of ["with-trades", "empty-control"]) {
      test(`welcome label · ${lang} · ${journal} — «first trade» only once an EMPTY journal has loaded (trades GET +3s)`, async ({ browser }, info) => {
        const store = newStore();
        delete store.settings.welcomeSeen;
        store.settings.lang = lang;
        store.trades = journal === "with-trades" ? seedHistory() : [];
        store.tradesDelayMs = 3_000;
        const app = await open(browser, info, lang, store, `label-${journal}`);
        const { page, rec } = app;
        await app.ctx.addInitScript((labels) => {
          window.__labels = [];
          const look = () => {
            const t = document.body ? document.body.textContent : "";
            const hit = labels.find((l) => t.includes(l));
            const prev = window.__labels[window.__labels.length - 1];
            const begin = /בואו נתחיל|Let's begin/.test(t) ? "begin" : null;
            const now = hit ? "first-trade" : begin;
            if (now && now !== prev) window.__labels.push(now);
          };
          new MutationObserver(look).observe(document, { subtree: true, childList: true, characterData: true });
        }, FIRST_TRADE_LABELS);
        try {
          await toAuth(page, lang);
          await submitLogin(page);
          await welcomePrimary(page).waitFor({ state: "visible", timeout: 30_000 });
          // The trades land after +3s; watch until then plus 1s.
          await page.waitForTimeout(4_500);
          const seq = await page.evaluate(() => window.__labels);
          rec.labelSequence = seq;
          rec.finalLabel = (await welcomePrimary(page).innerText()).trim();
          if (journal === "with-trades") {
            expect(seq.includes("first-trade"), `B-445: an existing user (trades in the journal) saw «${FIRST_TRADE_LABELS.join(" / ")}» while the trades were loading — sequence ${seq.join(" → ")}`).toBe(false);
            expect(rec.finalLabel).toMatch(/^(בואו נתחיל|Let's begin)$/);
          } else {
            // Control: the same delay, an empty journal ⇒ «begin» until the trades land, then «first trade».
            expect(seq, `control: the label never followed the trades load — sequence ${seq.join(" → ")}`).toEqual(["begin", "first-trade"]);
          }
          app.assertNoEscape();
        } finally {
          await finish(app);
        }
      });
    }

    // ── desktop: every journal action on screen (B-448) ───────────────────────────────────────────
    test(`journal actions · ${lang} — every Close / Edit / Delete inside the viewport at 1440 · 1024 · 768, no page scroll`, async ({ browser }, info) => {
      test.skip(!isDesktop(info), "the journal table renders at ≥ md only (phones get MobileTradeCard)");
      const store = newStore();
      store.settings.lang = lang;
      const open1 = { ...seedHistory()[0], id: "seed-open", ticker: "EYEOP", status: "OPEN", exit: null, closedAt: null, date: "2026-10-01", notes: "seed-open" };
      store.trades = [...seedHistory(), open1];
      const app = await open(browser, info, lang, store, "actions");
      const { page, rec, shot } = app;
      try {
        await toAuth(page, lang);
        await page.locator('[data-testid="consent-decline"]').click(); // this scene measures the TABLE, ⛔ the banner
        await submitLogin(page);
        await page.locator('[data-tour-tab="journal"]').first().click();
        await page.locator('[data-testid="journal-table"] tbody tr').first().waitFor({ state: "visible", timeout: 20_000 });
        rec.widths = {};
        for (const w of [1440, 1024, 768]) {
          await page.setViewportSize({ width: w, height: 900 });
          await page.waitForTimeout(400);
          const r = await page.evaluate(() => {
            const table = document.querySelector('[data-testid="journal-table"]');
            const scroller = table.parentElement;
            const sr = scroller.getBoundingClientRect();
            const btns = [...table.querySelectorAll("tbody tr")].flatMap((tr) => [...tr.querySelectorAll("td:last-child button")].map((b) => ({ b, row: tr.textContent.slice(0, 12) })));
            const out = btns.map(({ b, row }) => {
              const x = b.getBoundingClientRect();
              const cx = x.left + x.width / 2, cy = x.top + x.height / 2;
              const inView = x.left >= 0 && x.right <= innerWidth && x.left >= sr.left - 0.5 && x.right <= sr.right + 0.5;
              const top = inView ? document.elementFromPoint(cx, cy) : null;
              return { row, label: b.title || b.textContent.trim(), x: Math.round(x.left), right: Math.round(x.right), ok: inView && !!top && (top === b || b.contains(top)), by: top ? top.tagName : "outside" };
            });
            return { buttons: out, vw: innerWidth, scrollWidth: document.scrollingElement.scrollWidth, scrollerLeft: Math.round(sr.left), scrollerRight: Math.round(sr.right), scrollLeft: scroller.scrollLeft };
          });
          rec.widths[w] = r;
          await shot(`journal-${w}`);
          expect.soft(r.buttons.length, `${w}px: no action buttons found in the journal table`).toBeGreaterThan(0);
          const off = r.buttons.filter((b) => !b.ok);
          expect.soft(off, `B-448 (${w}px, ${lang}): journal actions outside the viewport/scroller [${r.scrollerLeft}, ${r.scrollerRight}] — ${off.map((b) => `${b.row}/${b.label} x=${b.x}..${b.right}`).join(" · ")}`).toEqual([]);
          expect.soft(r.scrollWidth, `${w}px: the page scrolls sideways`).toBeLessThanOrEqual(r.vw);
        }
        app.assertNoEscape();
      } finally {
        await finish(app);
      }
    });
  }
});

