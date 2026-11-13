// tests-eye/tooltip.spec.js — the "?" term bubble works by touch, sits on the screen, and leads to the glossary.
//
// Plan: docs/plans/PLAN-2026-11-13-glossary-tooltips.md §7 · red-before: scripts/eye-tooltip-probe.mjs
//
// U5 (the bug Niv reported as "the ? doesn't open on the phone"): InfoTooltip opened on `mouseenter` with no
// condition AND toggled on `click`. A touch tap emits BOTH (compatibility mouse events), so the bubble opened
// and closed in the same gesture. The cells below measure what the user sees after a real `tap()`.
//
// Cells (per device × language):
//   tap-open    one tap ⇒ the bubble is visible, and still visible after the gesture settled
//   tap-close   a second tap on the "?" ⇒ the bubble is gone
//   x-end       the ✕ sits at the inline END of the bubble (left in Hebrew, right in English)
//   sheet       below 640px the bubble is a bottom sheet: full width, flush with the viewport bottom
//   toggletip   the "?" says aria-expanded=true while open; the text lives in a role=status region
//   more        "עוד במילון ›" / "More in glossary ›" opens the glossary dialog on that term's long text
//   desktop     (desktop1440 only) hover opens · width ≤ 320 · height ≤ min(60vh, 360) · the arrow points at the "?"
//
// The term is `winRate` on the dashboard KPI row; its text is read from the generated glossary (⛔ a copy here).
// HERMETIC ONLY (tests-eye/hermetic.js): it needs a logged-in app and no network.

import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { login } from "../tests/lib/eyeTools.js";
import { installHermetic, newStore, DUMMY_EMAIL, DUMMY_PASSWORD } from "./hermetic.js";

const HERMETIC = process.env.EYE_HERMETIC === "1";
const TERM = "winRate";
const gl = (f) => JSON.parse(readFileSync(join(process.cwd(), "src", "glossary", "generated", f), "utf8"));
const INLINE = gl("inline.json");
const SHORT = { he: gl("short.he.json"), en: gl("short.en.json") };
const LONG = { he: gl("long.he.json"), en: gl("long.en.json") };
if (!INLINE.terms[TERM] || !SHORT.he.terms[TERM] || !LONG.he.terms[TERM]) throw new Error(`[eye] ${TERM} missing from the generated glossary (B-272)`);
const label = (lang) => INLINE.terms[TERM].label[lang];
const def = (lang) => SHORT[lang].terms[TERM].short;
const longFirst = (lang) => LONG[lang].terms[TERM].split("\n")[0];
const TRIGGER = { he: (l) => `מידע על ${l}`, en: (l) => `More info: ${l}` };

const IOS_DISMISS_KEY = (() => {
  const src = readFileSync(join(process.cwd(), "src", "components", "IOSInstallBanner.jsx"), "utf8");
  const m = [...src.matchAll(/const DISMISS_KEY = "([^"]+)";/g)];
  if (m.length !== 1) throw new Error(`[eye] IOSInstallBanner DISMISS_KEY matched ${m.length}× (must be 1) (B-272)`);
  return m[0][1];
})();

// The bubble = the nearest ancestor of the definition text that is the popover (new: data-term-pop; old: role=tooltip).
const POP = '[data-term-pop], [role="tooltip"]';
async function bubbleBox(page, lang) {
  return page.evaluate(([text, sel]) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent.includes(text)) continue;
      const pop = n.parentElement.closest(sel);
      if (!pop) continue;
      const r = pop.getBoundingClientRect();
      const cs = getComputedStyle(pop);
      if (r.width === 0 || cs.visibility === "hidden" || cs.display === "none") continue;
      return { x: r.x, y: r.y, w: r.width, h: r.height, vw: innerWidth, vh: innerHeight };
    }
    return null;
  }, [def(lang).slice(0, 24), POP]);
}
const settle = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 350)))));

test.describe("glossary · the term bubble", () => {
  test.skip(!HERMETIC, "hermetic only — run through scripts/eye-tooltip-probe.mjs");

  async function openApp(browser, info, lang) {
    const u = info.project.use;
    const pick = ["viewport", "screen", "userAgent", "deviceScaleFactor", "isMobile", "hasTouch", "locale", "timezoneId", "colorScheme"];
    const ctx = await browser.newContext({ ...Object.fromEntries(pick.filter((k) => u[k] !== undefined).map((k) => [k, u[k]])), baseURL: u.baseURL });
    const store = newStore();
    store.settings.lang = lang;
    await installHermetic(ctx, store);
    await ctx.addInitScript(([k, l]) => { if (location.protocol.startsWith("http")) { localStorage.setItem(k, "1"); localStorage.setItem("swingEdgeLang", l); } }, [IOS_DISMISS_KEY, lang]);
    const page = await ctx.newPage();
    await page.addLocatorHandler(page.locator('[data-testid="consent-decline"]'), (btn) => btn.click());
    await login(page, DUMMY_EMAIL, DUMMY_PASSWORD);
    const trigger = page.getByRole("button", { name: TRIGGER[lang](label(lang)), exact: true }).first();
    await trigger.waitFor({ state: "visible", timeout: 15_000 });
    // Centre the "?" so a bottom sheet (≤70vh, content-sized) never lands on top of it.
    await trigger.evaluate((el) => el.scrollIntoView({ block: "center" }));
    return { ctx, page, trigger };
  }
  const touch = (info) => !!info.project.use.hasTouch;
  const press = (info, el) => (touch(info) ? el.tap() : el.click());

  for (const lang of ["he", "en"]) {
    test(`tap-open · ${lang} — one tap opens the bubble and it stays open`, async ({ browser }, info) => {
      test.skip(!touch(info), "touch devices only");
      const { ctx, page, trigger } = await openApp(browser, info, lang);
      try {
        await trigger.tap();
        await settle(page);
        expect(await bubbleBox(page, lang), "U5: after one tap and a settled gesture, the bubble is NOT on screen (opened by mouseenter, closed by the click of the same tap)").not.toBeNull();
      } finally { await ctx.close(); }
    });

    test(`tap-close · ${lang} — a second tap on the "?" closes it`, async ({ browser }, info) => {
      test.skip(!touch(info), "touch devices only");
      const { ctx, page, trigger } = await openApp(browser, info, lang);
      try {
        await trigger.tap(); await settle(page);
        expect(await bubbleBox(page, lang), "precondition: the first tap opened the bubble").not.toBeNull();
        await trigger.tap({ force: true }); await settle(page);
        expect(await bubbleBox(page, lang), "the second tap left the bubble open").toBeNull();
      } finally { await ctx.close(); }
    });

    test(`x-end · ${lang} — the ✕ sits at the inline end`, async ({ browser }, info) => {
      const { ctx, page, trigger } = await openApp(browser, info, lang);
      try {
        await press(info, trigger); await settle(page);
        const b = await bubbleBox(page, lang);
        expect(b, "precondition: the bubble opened").not.toBeNull();
        const x = page.getByRole("button", { name: /^(Close|סגור)$/ }).last();
        await expect(x, "the bubble has a close button").toBeVisible();
        const xb = await x.boundingBox();
        const mid = b.x + b.w / 2, xc = xb.x + xb.width / 2;
        if (lang === "he") expect(xc, `✕ at x=${Math.round(xc)} is right of the bubble centre ${Math.round(mid)} — in RTL the end is LEFT`).toBeLessThan(mid);
        else expect(xc, `✕ at x=${Math.round(xc)} is left of the bubble centre ${Math.round(mid)} — in LTR the end is RIGHT`).toBeGreaterThan(mid);
        await press(info, x); await settle(page);
        expect(await bubbleBox(page, lang), "the ✕ did not close the bubble").toBeNull();
      } finally { await ctx.close(); }
    });

    test(`sheet · ${lang} — below 640px the bubble is a bottom sheet`, async ({ browser }, info) => {
      test.skip((info.project.use.viewport?.width ?? 9999) >= 640, "narrow viewports only");
      const { ctx, page, trigger } = await openApp(browser, info, lang);
      try {
        await press(info, trigger); await settle(page);
        const b = await bubbleBox(page, lang);
        expect(b, "precondition: the bubble opened").not.toBeNull();
        expect(b.w, `bubble width ${Math.round(b.w)} of viewport ${b.vw} — not a full-width sheet`).toBeGreaterThanOrEqual(b.vw - 2);
        expect(Math.abs(b.y + b.h - b.vh), `bubble bottom ${Math.round(b.y + b.h)} vs viewport ${b.vh} — not flush with the bottom`).toBeLessThanOrEqual(2);
        expect(b.h, `sheet height ${Math.round(b.h)} > 70% of ${b.vh}`).toBeLessThanOrEqual(b.vh * 0.7 + 1);
      } finally { await ctx.close(); }
    });

    test(`toggletip · ${lang} — aria-expanded and a status region`, async ({ browser }, info) => {
      const { ctx, page, trigger } = await openApp(browser, info, lang);
      try {
        await expect(trigger).toHaveAttribute("aria-expanded", "false");
        await press(info, trigger); await settle(page);
        await expect(trigger, "the open bubble is not announced as expanded").toHaveAttribute("aria-expanded", "true");
        const region = page.locator('[role="status"]').filter({ hasText: def(lang).slice(0, 24) });
        await expect(region, "the bubble text is not in a role=status region (toggletip)").toHaveCount(1);
      } finally { await ctx.close(); }
    });

    test(`more · ${lang} — "more in glossary" opens the term's long text`, async ({ browser }, info) => {
      const { ctx, page, trigger } = await openApp(browser, info, lang);
      try {
        await press(info, trigger); await settle(page);
        const more = page.getByRole("button", { name: lang === "he" ? /עוד במילון/ : /More in glossary/ });
        await expect(more, "the bubble has no link to the glossary").toBeVisible();
        await press(info, more);
        const dialog = page.getByRole("dialog");
        await expect(dialog, "the glossary dialog did not open").toBeVisible({ timeout: 10_000 });
        await expect(dialog.getByText(longFirst(lang).slice(0, 30)).first(), "the dialog is not on the term's long text").toBeVisible();
      } finally { await ctx.close(); }
    });

    test(`desktop · ${lang} — hover opens; ≤320 wide; ≤min(60vh,360) tall; the arrow points at the "?"`, async ({ browser }, info) => {
      test.skip(touch(info) || (info.project.use.viewport?.width ?? 0) < 1024, "desktop only");
      const { ctx, page, trigger } = await openApp(browser, info, lang);
      try {
        await trigger.hover(); await settle(page);
        const b = await bubbleBox(page, lang);
        expect(b, "hover did not open the bubble").not.toBeNull();
        expect(b.w, `bubble width ${Math.round(b.w)} > 320`).toBeLessThanOrEqual(320.5);
        expect(b.h, `bubble height ${Math.round(b.h)} > min(60vh, 360)`).toBeLessThanOrEqual(Math.min(b.vh * 0.6, 360) + 0.5);
        const tb = await trigger.boundingBox();
        const arrow = await page.evaluate(() => { const a = document.querySelector("[data-term-arrow]"); if (!a) return null; const r = a.getBoundingClientRect(); return r.x + r.width / 2; });
        expect(arrow, "no arrow element").not.toBeNull();
        expect(Math.abs(arrow - (tb.x + tb.width / 2)), "the arrow does not point at the trigger").toBeLessThanOrEqual(3);
      } finally { await ctx.close(); }
    });
  }
});
