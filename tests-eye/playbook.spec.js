// tests-eye/playbook.spec.js — C-064 closed by a machine (Niv, 04.10): the Playbook image
// wave (B-015 · B-038, `714f0e4`) measured end-to-end on the real app, step by step.
//
// Plan: docs/plans/PLAN-2026-10-04-c064-eye-auto.md
//
// TWO TARGETS, ONE SPEC:
//   · production (CI, `eye-playbook.yml`)  — the QA account, real Supabase, one real
//     /api/ocr call. Writes happen (that IS the claim) and are swept afterwards.
//   · hermetic (EYE_HERMETIC=1)            — a local build against a STATEFUL synthetic
//     Supabase (tests-eye/hermetic.js). This is how `scripts/eye-playbook-probe.mjs` shows
//     every step RED on deliberately broken code. A step never seen red is not a test.
//
// FAILURE CONTRACT = smoke's: a hard `expect`, ⛔ a finding. Missing credentials in CI is RED.
// ⛔ Playwright trace: it records storage and would carry the QA refresh_token into a public
// artifact (`E11`). Screenshots are taken by hand, with `@`-text and the header masked.

import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { login, redact, installFlashRecorder, readFlashes } from "../tests/lib/eyeTools.js";
import { exactRx, containsRx, TOAST_TEXTS } from "./labels.js";
import { readManifest, fileFor } from "./fixtures.js";
import { readPrices, closeOcr } from "./ocr.js";
import { installHermetic, newStore, DUMMY_EMAIL, DUMMY_PASSWORD } from "./hermetic.js";
import { sweep, PREFIX_ROOT, TRADE_TICKER } from "./qaRest.js";

const HERMETIC = process.env.EYE_HERMETIC === "1";
const QA_EMAIL = HERMETIC ? DUMMY_EMAIL : process.env.SENTINEL_QA_EMAIL;
const QA_PASSWORD = HERMETIC ? DUMMY_PASSWORD : process.env.SENTINEL_QA_PASSWORD;
const HAVE_CREDS = !!(QA_EMAIL && QA_PASSWORD);
const STORED_CAP = 200 * 1024; // src/lib/imageResize.js STORED_CAP_BYTES — the claim under test
const GATE = 7; // ≥7/8 axis prices read exactly (prompt §4d)
const RUN = process.env.GITHUB_RUN_ID || `local${Date.now().toString(36)}`;
const EVIDENCE = process.env.EYE_EVIDENCE_DIR || join(process.cwd(), "eye-evidence");

const sha = (s) => createHash("sha256").update(s).digest("hex");
const b64Bytes = (dataUrl) => Buffer.from(String(dataUrl).split(",")[1] || "", "base64").length;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ⛔ `test.skip()` without credentials on CI would read as ✅ — the closure rule forbids it.
test("C-064 · QA credentials and REST cleanup are wired (CI only)", async () => {
  test.skip(!process.env.CI || HERMETIC, "local / hermetic runs need no QA credentials");
  expect(HAVE_CREDS, "SENTINEL_QA_EMAIL / SENTINEL_QA_PASSWORD are not reaching the test process").toBe(true);
  expect(!!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY), "SUPABASE_URL / SUPABASE_ANON_KEY missing — the cleanup net could not run").toBe(true);
});

// Two bottom overlays a real phone user dismisses before anything else — handled the way the
// user does, whenever they appear (`addLocatorHandler`), ⛔ hidden by CSS. Installed BEFORE the
// first navigation: measured in CI 04.10 (run 37198734958) and reproduced locally — on the short
// iPhone 14 viewport (664px) the consent banner covers the LOGIN submit button, so every
// iPhone step died on a click timeout while Pixel 7 (915px) was green.
//   · consent banner — declined (the privacy-preserving answer; the sentinel's choice).
//   · iOS install banner (src/components/IOSInstallBanner.jsx) — iOS UA only, armed 1.5s after
//     the consent choice, `fixed bottom-4 z-[90]`. Its copy is hard-coded Hebrew there, so it is
//     anchored on that copy; a reword stops the handler and turns every iPhone step RED with
//     Playwright's "intercepts pointer events" — loud, ⛔ silent.
//   ⚠️ CI 04.10 (run 37199864386): in WebKit the handler's click on the banner's X landed while
//   the banner was still animating in ("element is not stable") — the handler "finished" and the
//   banner stayed, 2/5 iPhone steps red. So the device starts in the state of an iPhone user who
//   dismissed it ONCE before: the dismissal key is a DEVICE key (userScopedStorage DEVICE_KEYS —
//   it survives login), read from the component's own source, exactly-once or hard red (B-272).
//   The handler stays as the net if the key is ever renamed.
const IOS_DISMISS_KEY = (() => {
  const src = readFileSync(join(process.cwd(), "src", "components", "IOSInstallBanner.jsx"), "utf8");
  const m = [...src.matchAll(/const DISMISS_KEY = "([^"]+)";/g)];
  if (m.length !== 1) throw new Error(`[eye] IOSInstallBanner DISMISS_KEY matched ${m.length}× (must be 1) — refusing to guess the key (B-272)`);
  return m[0][1];
})();

async function installOverlayHandlers(page) {
  // http(s) only: init scripts also run on about:blank, whose opaque origin has no localStorage.
  await page.addInitScript((k) => { if (location.protocol.startsWith("http")) localStorage.setItem(k, "1"); }, IOS_DISMISS_KEY);
  await page.addLocatorHandler(page.locator('[data-testid="consent-decline"]'), (btn) => btn.click());
  const iosBanner = page.locator("div.fixed").filter({ hasText: "התקן את SwingEdge" });
  await page.addLocatorHandler(iosBanner, (b) => b.getByRole("button", { name: "סגור" }).click());
}

test.describe("C-064 · Playbook images (B-015 · B-038)", () => {
  test.skip(!HAVE_CREDS, "no QA credentials (local run) — use the hermetic probe");

  let manifest;
  let STATE = null;
  const cleanup = { pre: null, post: null };

  // Device options of the running project, so manually-created contexts keep the emulation.
  const ctxOpts = (info) => {
    const u = info.project.use;
    const pick = ["viewport", "screen", "userAgent", "deviceScaleFactor", "isMobile", "hasTouch", "locale", "timezoneId", "colorScheme"];
    return Object.fromEntries(pick.filter((k) => u[k] !== undefined).map((k) => [k, u[k]]));
  };

  test.beforeAll(async ({ browser }, info) => {
    manifest = readManifest();
    if (!HERMETIC) {
      // pre-sweep: a crashed earlier run may have left e2e-c064-* rows. Removed and REPORTED.
      cleanup.pre = await sweep(QA_EMAIL, QA_PASSWORD);
      console.log(`[C-064] pre-sweep: trades ${cleanup.pre.trades.found} · setups ${cleanup.pre.playbook.found}`);
      const ctx = await browser.newContext({ ...ctxOpts(info), baseURL: info.project.use.baseURL });
      const page = await ctx.newPage();
      await installOverlayHandlers(page);
      await login(page, QA_EMAIL, QA_PASSWORD);
      STATE = await ctx.storageState();
      await ctx.close();
    }
  });

  test.afterAll(async ({}, info) => {
    await closeOcr();
    if (HERMETIC) return;
    // Every test context is closed by now — the RMW cannot race the app (fix ①).
    cleanup.post = await sweep(QA_EMAIL, QA_PASSWORD);
    const dir = join(EVIDENCE, info.project.name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "cleanup.json"), JSON.stringify(cleanup, null, 2));
    console.log(`[C-064] post-sweep: trades found ${cleanup.post.trades.found} → after ${cleanup.post.trades.after} · setups found ${cleanup.post.playbook.found} → after ${cleanup.post.playbook.after} · blob sha256 ${cleanup.post.blobSha256.slice(0, 16)} · rest-of-blob ${cleanup.post.restHashBefore === cleanup.post.restHashAfter ? "identical" : "CHANGED"}`);
  });

  // ── one app session per test ─────────────────────────────────────────────
  async function openApp(browser, info) {
    const ctx = await browser.newContext({ ...ctxOpts(info), baseURL: info.project.use.baseURL, ...(STATE ? { storageState: STATE } : {}) });
    const store = HERMETIC ? newStore() : null;
    if (HERMETIC) await installHermetic(ctx, store);
    const page = await ctx.newPage();
    await installOverlayHandlers(page);
    await installFlashRecorder(page, TOAST_TEXTS);
    // Console errors are evidence for a red step (redacted — the artifact is public).
    const consoleErrors = [];
    page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(redact(m.text()).slice(0, 400)); });
    page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${redact(e.message).slice(0, 400)}`));
    const ocrRequests = [];
    page.on("request", (r) => { if (/\/api\/ocr(\?|$)/.test(r.url())) ocrRequests.push(r.method()); });
    if (HERMETIC) await login(page, QA_EMAIL, QA_PASSWORD);
    else {
      await page.goto("/app", { waitUntil: "load" });
      await page.locator('[data-tour-tab="dashboard"]').waitFor({ state: "visible", timeout: 30_000 });
    }
    const prefix = `${PREFIX_ROOT}${RUN}-${info.project.name}-`;
    const dir = join(EVIDENCE, info.project.name);
    mkdirSync(dir, { recursive: true });
    const shot = (name) => page.screenshot({ path: join(dir, `${name}.png`), mask: [page.locator("header"), page.getByText(/@/)] });
    // On a red step: a screenshot of the moment + the console, BEFORE cleanup changes the screen.
    const onFail = async (step) => {
      await shot(`${step}-FAILED`).catch(() => {});
      const onScreen = await page.locator('[role="status"], [role="alert"]').allInnerTexts().catch(() => []);
      writeFileSync(join(dir, `${step}-console.txt`), [
        "── status/alert on screen ──", ...onScreen.map((t) => redact(t).replace(/\s+/g, " ").slice(0, 300)),
        "── open dialog text ──", redact(await page.locator('[role="dialog"]').last().innerText({ timeout: 2_000 }).catch(() => "(no dialog)")).replace(/\s+/g, " ").slice(0, 1500),
        "── console errors ──", ...(consoleErrors.length ? consoleErrors : ["(none)"]),
      ].join("\n"));
    };
    return { ctx, page, store, prefix, dir, shot, ocrRequests, onFail };
  }

  const panelOf = (page) => page.getByRole("heading", { name: exactRx("personalPlaybook") })
    .locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]');

  async function openPlaybook(page) {
    await page.getByRole("button", { name: exactRx("openUserMenu") }).click();
    await page.getByRole("button", { name: exactRx("settings") }).click();
    const panel = panelOf(page);
    await panel.waitFor({ state: "visible", timeout: 20_000 });
    await panel.scrollIntoViewIfNeeded();
    return panel;
  }

  async function reloadToPlaybook(page) {
    await page.reload({ waitUntil: "load" });
    await page.locator('[data-tour-tab="dashboard"]').waitFor({ state: "visible", timeout: 30_000 });
    return openPlaybook(page);
  }

  const readPlaybook = (page) => page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem("swingEdgePlaybook") || "[]"); } catch { return "UNPARSEABLE"; }
  });

  // `expect` = "image" | "rejected" | null (no file at all)
  async function addSetup(page, panel, name, fixture, expectOutcome) {
    await panel.getByRole("button", { name: exactRx("addSetup") }).click();
    await panel.getByPlaceholder("Breakout, Pullback…").fill(name);
    if (fixture) {
      const failedToast = page.getByRole("status").getByText(containsRx("playbookImageFailed"));
      // A toast from the PREVIOUS rejection (7s) must be gone first, or "a toast is visible"
      // would be answered by the old one — an attribution error, ⛔ a measurement.
      if (expectOutcome === "rejected") await expect(failedToast).toHaveCount(0, { timeout: 15_000 });
      await panel.locator('input[type="file"]').setInputFiles(fileFor(manifest, fixture));
      if (expectOutcome === "image") {
        await expect(panel.getByText(containsRx("imageLoaded")), `${fixture}: the stored-profile resize did not attach an image`).toBeVisible({ timeout: 45_000 });
      } else {
        await expect(failedToast, `${fixture}: no "image failed" toast`).toBeVisible({ timeout: 45_000 });
        await expect(panel.getByText(containsRx("imageLoaded"))).toHaveCount(0);
      }
    }
    await panel.getByRole("button", { name: exactRx("saveSetup") }).click();
    await expect(panel.getByRole("button", { name: exactRx("saveSetup") })).toHaveCount(0, { timeout: 10_000 });
  }

  const cardOf = (panel, name) => panel.locator("div.overflow-hidden")
    .filter({ has: panel.page().locator("span", { hasText: new RegExp(`^${esc(name)}$`) }) });

  async function imageLoaded(panel, name) {
    const img = cardOf(panel, name).locator(`img[alt="${name}"]`);
    await expect(img, `${name}: no <img> in the card`).toHaveCount(1, { timeout: 15_000 });
    return img.evaluate(async (el) => { if (!el.complete) await el.decode().catch(() => {}); return el.naturalWidth; });
  }

  // UI delete of OUR setups only, then the local copy must hold 0 of them. The DB copy is
  // proven by the post-sweep, after the context is closed.
  async function deleteOurSetups(page, prefix) {
    try {
      const panel = await openPlaybook(page);
      for (const s of (await readPlaybook(page)).filter((x) => x?.name?.startsWith(prefix))) {
        const done = page.waitForResponse((r) => /\/rest\/v1\/user_settings/.test(r.url()) && r.request().method() !== "GET", { timeout: 10_000 }).catch(() => null);
        await cardOf(panel, s.name).locator("button:has(svg)").click();
        await expect(cardOf(panel, s.name)).toHaveCount(0, { timeout: 10_000 });
        await done;
      }
      const left = (await readPlaybook(page)).filter((x) => x?.name?.startsWith(prefix));
      expect(left.map((x) => x.name), "e2e setups left in localStorage after the UI delete").toEqual([]);
    } catch (e) {
      // The REST sweep in afterAll is the net — but a broken UI delete is still REPORTED.
      console.log(`[C-064] UI delete failed (REST sweep will retry): ${redact(e.message).split("\n")[0]}`);
      throw e;
    }
  }

  // Body first, cleanup always; a cleanup failure is red too, but never MASKS the body's error.
  async function withSetups(app, step, body) {
    let bodyErr = null;
    try { await body(); } catch (e) { bodyErr = e; await app.onFail(step); }
    let delErr = null;
    try { await deleteOurSetups(app.page, app.prefix); } catch (e) { delErr = e; }
    await app.ctx.close();
    if (bodyErr) throw bodyErr;
    if (delErr) throw delErr;
  }

  async function noErrorToast(page) {
    const f = await readFlashes(page);
    expect(Object.keys(f), "an error toast flashed during a save that should have succeeded").toEqual([]);
  }

  // ── a ────────────────────────────────────────────────────────────────────
  test("a · setup + 3.5MB+ photo survives a reload, image ≤200KB, no error", async ({ browser }, info) => {
    const app = await openApp(browser, info);
    const { page, prefix, shot } = app;
    await withSetups(app, "a", async () => {
      const name = `${prefix}a`;
      let panel = await openPlaybook(page);
      await addSetup(page, panel, name, "F1_1", "image");
      await shot("a-1-saved");
      panel = await reloadToPlaybook(page);
      const s = (await readPlaybook(page)).find((x) => x?.name === name);
      expect(s, "the setup is gone after reload").toBeTruthy();
      expect(String(s.imagePreview).startsWith("data:image/jpeg"), "stored image is not a JPEG data-URL").toBe(true);
      const bytes = b64Bytes(s.imagePreview);
      console.log(`[C-064 a] ${info.project.name}: stored ${bytes} B (cap ${STORED_CAP})`);
      expect(bytes).toBeLessThanOrEqual(STORED_CAP);
      expect(await imageLoaded(panel, name)).toBeGreaterThan(0);
      await shot("a-2-after-reload");
      await noErrorToast(page);
    });
  });

  // ── b ────────────────────────────────────────────────────────────────────
  test("b · five setups with photos, reload after each — k/k survive, earlier images byte-stable", async ({ browser }, info) => {
    const app = await openApp(browser, info);
    const { page, prefix, shot } = app;
    await withSetups(app, "b", async () => {
      const hashes = {};
      let panel = await openPlaybook(page);
      for (let k = 1; k <= 5; k++) {
        await addSetup(page, panel, `${prefix}b${k}`, `F1_${k}`, "image");
        panel = await reloadToPlaybook(page);
        const ours = (await readPlaybook(page)).filter((x) => x?.name?.startsWith(`${prefix}b`));
        expect(ours.map((x) => x.name).sort(), `after setup ${k} + reload`).toEqual(Array.from({ length: k }, (_, i) => `${prefix}b${i + 1}`));
        for (const s of ours) {
          expect(typeof s.imagePreview === "string" && s.imagePreview.length > 0, `${s.name} lost its image`).toBe(true);
          const h = sha(s.imagePreview);
          if (hashes[s.name]) expect(h, `${s.name}: stored image changed between reloads`).toBe(hashes[s.name]);
          hashes[s.name] = h;
          expect(await imageLoaded(panel, s.name), `${s.name}: image does not render`).toBeGreaterThan(0);
        }
        await shot(`b-${k}-after-reload`);
      }
      await noErrorToast(page);
    });
  });

  // ── c ────────────────────────────────────────────────────────────────────
  test("c · not-an-image / truncated / over-cap photo ⇒ toast, setup saved without image", async ({ browser }, info) => {
    const app = await openApp(browser, info);
    const { page, prefix, shot } = app;
    await withSetups(app, "c", async () => {
      let panel = await openPlaybook(page);
      for (const f of ["F3a", "F3b", "F1x"]) {
        await addSetup(page, panel, `${prefix}c-${f}`, f, "rejected");
        await shot(`c-${f}-toast`);
      }
      panel = await reloadToPlaybook(page);
      const list = await readPlaybook(page);
      for (const f of ["F3a", "F3b", "F1x"]) {
        const s = list.find((x) => x?.name === `${prefix}c-${f}`);
        expect(s, `${f}: setup was not saved`).toBeTruthy();
        expect(s.imagePreview ?? null, `${f}: a rejected image was stored anyway`).toBeNull();
      }
      await shot("c-after-reload");
    });
  });

  // ── d ────────────────────────────────────────────────────────────────────
  test("d · chart axis prices are still readable after the stored profile (OCR ≥7/8)", async ({ browser }, info) => {
    const app = await openApp(browser, info);
    const { page, prefix, shot, dir } = app;
    const report = {};
    await withSetups(app, "d", async () => {
      let panel = await openPlaybook(page);
      for (const f of ["F2", "F2s", "F2b"]) await addSetup(page, panel, `${prefix}d-${f}`, f, "image");
      panel = await reloadToPlaybook(page);
      await shot("d-after-reload");
      const list = await readPlaybook(page);
      for (const f of ["F2", "F2s", "F2b"]) {
        const meta = manifest[f];
        const s = list.find((x) => x?.name === `${prefix}d-${f}`);
        expect(s?.imagePreview, `${f}: no stored image after reload`).toBeTruthy();
        writeFileSync(join(dir, `stored-${f}.jpg`), Buffer.from(s.imagePreview.split(",")[1], "base64"));
        const orig = `data:${meta.mime};base64,${fileFor(manifest, f).buffer.toString("base64")}`;
        const control = await readPrices(orig, meta);
        const stored = await readPrices(s.imagePreview, meta);
        report[f] = { gate: meta.gate, font: meta.font, source: [meta.w, meta.h], storedPx: stored.natural, storedBytes: b64Bytes(s.imagePreview), control: `${control.hits}/${control.of}`, stored: `${stored.hits}/${stored.of}`, missing: stored.missing, read: stored.text };
        console.log(`[C-064 d] ${info.project.name} ${f} (${meta.font}px, ${meta.w}×${meta.h} → ${stored.natural.join("×")}, ${report[f].storedBytes} B): control ${report[f].control} · stored ${report[f].stored}${meta.gate ? " (GATE)" : " (measurement)"}`);
        // Control arm: the proxy must read the ORIGINAL perfectly, or the measurement is void.
        expect(control.hits, `${f}: OCR control on the ORIGINAL read ${control.hits}/${control.of} — the proxy is broken, the measurement is void`).toBe(control.of);
      }
      writeFileSync(join(dir, "ocr.json"), JSON.stringify(report, null, 2));
      test.info().annotations.push({ type: "ocr", description: JSON.stringify(Object.fromEntries(Object.entries(report).map(([k, v]) => [k, v.stored]))) });
      const g = report.F2;
      expect(Number(g.stored.split("/")[0]), `F2 (33px): stored image read ${g.stored}, missing ${g.missing.join(",")}`).toBeGreaterThanOrEqual(GATE);
    });
  });

  // ── e ────────────────────────────────────────────────────────────────────
  test("e · trade form with a chart image: preview works, saved trade carries no tradeImage", async ({ browser }, info) => {
    const app = await openApp(browser, info);
    const { page, prefix, shot, ocrRequests } = app;
    const note = `${prefix}e`;
    const ours = () => page.evaluate((n) => {
      try { return (JSON.parse(localStorage.getItem("swingEdgeTrades") || "[]") || []).filter((t) => t && t.notes === n); } catch { return "UNPARSEABLE"; }
    }, note);
    try {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.locator('[data-tour="add-trade"]').click();
      const dialog = page.locator('[role="dialog"]').last();
      const ocrDone = page.waitForResponse((r) => /\/api\/ocr(\?|$)/.test(r.url()), { timeout: 30_000 }).catch(() => null);
      await dialog.locator('input[type="file"]').first().setInputFiles(fileFor(manifest, "F2"));
      await expect(dialog.locator('img[alt="Trade chart"]'), "no preview after choosing the chart").toBeVisible({ timeout: 30_000 });
      const ocr = await ocrDone;
      const ocrOutcome = ocr ? `HTTP ${ocr.status()}` : "no response in 30s";
      console.log(`[C-064 e] ${info.project.name}: /api/ocr ${ocrOutcome} · calls ${ocrRequests.length}`);
      test.info().annotations.push({ type: "ocr-call", description: ocrOutcome });
      expect(ocrRequests.length, "more than one /api/ocr call for one upload").toBeLessThanOrEqual(1);
      await shot("e-1-preview");

      await page.locator("#log-ticker").fill(TRADE_TICKER);
      await page.locator("#log-entry").fill("100");
      await page.locator("#log-stop").fill("99");
      await page.locator("#log-target").fill("102");
      // Notes live in the collapsed "Trade Context" section (SwingEdge_App.jsx, showTradeContext).
      const ctxToggle = dialog.locator('button[aria-expanded]').filter({ hasText: /הקשר העסקה|Trade Context/ });
      if ((await ctxToggle.getAttribute("aria-expanded")) !== "true") await ctxToggle.click();
      await page.locator("#log-notes").fill(note);
      await expect(page.locator("#log-ticker")).toHaveValue(TRADE_TICKER);
      const submit = page.getByRole("button", { name: /Log Trade/ });
      await expect(submit).toBeEnabled({ timeout: 25_000 });
      await submit.click();

      // BEFORE the reload: the load is REPLACE-from-DB and LOCAL_ONLY strips the field, so a
      // post-reload check alone is structurally blind to tradeImage being written back (M9).
      await expect.poll(async () => (await ours()).length, { timeout: 20_000, message: "the TEST trade never reached swingEdgeTrades" }).toBe(1);
      const pre = (await ours())[0];
      expect(Object.hasOwn(pre, "tradeImage"), "tradeImage written into swingEdgeTrades (before reload)").toBe(false);
      await shot("e-2-saved");

      await page.reload({ waitUntil: "load" });
      await page.locator('[data-tour-tab="dashboard"]').waitFor({ state: "visible", timeout: 30_000 });
      await expect.poll(async () => (await ours()).length, { timeout: 20_000, message: "the TEST trade is gone after reload" }).toBe(1);
      const post = (await ours())[0];
      expect(Object.hasOwn(post, "tradeImage"), "tradeImage present in swingEdgeTrades (after reload)").toBe(false);
    } catch (e) {
      await app.onFail("e");
      throw e;
    } finally {
      await app.ctx.close(); // the trade is removed by the REST sweep, with every context closed
    }
  });

  // ── f ────────────────────────────────────────────────────────────────────
  // B-406 (05.10): a setup added WHILE the settings read is in flight. The read is HELD in this
  // browser (a GET — nothing is written by the hold), the setup is added in the window, the
  // read is released. Then a SECOND, fresh context (the beforeAll storage state, which never saw
  // this setup) must show it — so it is proven to be in the DB row, ⛔ only in this tab.
  // `@deployed`: production must carry the fix — a pull_request run skips it (eye-playbook.yml).
  test("f · @deployed a setup added while the settings read is in flight survives (B-406)", async ({ browser }, info) => {
    const app = await openApp(browser, info);
    const { page, prefix, shot } = app;
    await withSetups(app, "f", async () => {
      const name = `${prefix}f-window`;
      await page.waitForTimeout(2_500); // the first hydration and its write settle
      let held = 0, release = null, armed = true;
      await page.route(/\/rest\/v1\/user_settings/, async (route) => {
        if (armed && route.request().method() === "GET") { held++; await new Promise((r) => { release = r; }); }
        return route.fallback();
      });
      await page.reload({ waitUntil: "load" });
      await page.locator('[data-tour-tab="dashboard"]').waitFor({ state: "visible", timeout: 30_000 });
      await expect.poll(() => held, { message: "the settings read was not held — there is no window to test", timeout: 10_000 }).toBeGreaterThan(0);
      const panel = await openPlaybook(page);
      await addSetup(page, panel, name, null, null);
      await shot("f-1-added-in-window");
      armed = false;
      release?.();
      await page.waitForTimeout(4_000); // hydration + the 1000ms debounce + the upsert
      const local = (await readPlaybook(page)).map((x) => x?.name);
      expect(local, "B-406: the setup is gone from this tab once the read landed").toContain(name);
      const journal = await page.evaluate(() => localStorage.getItem("swingEdgeSettingsDelta"));
      expect(journal, "the journal still holds an op after the write was confirmed").toBeNull();

      // The DB proof: a context that never saw this setup.
      const ctx2 = await browser.newContext({ ...ctxOpts(info), baseURL: info.project.use.baseURL, ...(STATE ? { storageState: STATE } : {}) });
      try {
        if (HERMETIC) await installHermetic(ctx2, app.store);
        const p2 = await ctx2.newPage();
        await installOverlayHandlers(p2);
        if (HERMETIC) await login(p2, QA_EMAIL, QA_PASSWORD);
        else {
          await p2.goto("/app", { waitUntil: "load" });
          await p2.locator('[data-tour-tab="dashboard"]').waitFor({ state: "visible", timeout: 30_000 });
        }
        await p2.waitForTimeout(3_000);
        const p2Panel = await openPlaybook(p2);
        await expect(cardOf(p2Panel, name), "B-406: the setup never reached the DB row").toHaveCount(1, { timeout: 15_000 });
        await p2.screenshot({ path: join(app.dir, "f-2-second-context.png") }).catch(() => {});
      } finally {
        await ctx2.close();
      }
    });
  });
});
