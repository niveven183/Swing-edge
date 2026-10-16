// tests-eye/hydration.spec.js — B-406 · B-397 · B-407: hydration never overwrites what the user did.
//
// Plan: docs/plans/PLAN-2026-10-05-b406-b397-hydration-delta.md
// Diagnosis (the same scenes, measured red on 19959e6): docs/audits/B406-HYDRATION-DIAGNOSIS-2026-10-05.md
//
// HERMETIC ONLY (EYE_HERMETIC=1, tests-eye/hermetic.js): every scene needs the user_settings READ
// held while the user acts, and "another device" writing the row — both are the synthetic
// origin's to give. The production counterpart is step f of tests-eye/playbook.spec.js.
//
// THE WINDOW. Phase 1 logs in and lets the first hydration finish, so the device is RETURNING
// (`swingEdgeOnboarding` exists ⇒ the UI is live before hydration settles — the only state in
// which the window exists; a fresh device waits behind the onboarding gate). Phase 2 reloads
// with the user_settings GET held; the user acts; the read is released; a reload reads back.
//
// SCENES (each a test; the probe scripts/eye-sync-probe.mjs reads them by the leading tag):
//   H1 playbook-window   · a setup added in the window survives (B-406)
//   H2 alerts-window     · a price alert set in the window survives (B-406)
//   H3 other-device      · a setup another device wrote is shown, and NOT erased by this
//                          device's next write (B-397)
//   H4 tombstone         · a setup deleted in the window does NOT come back from the DB
//   H5 fresh-device      · a new browser gets the user's watchlist, ⛔ the defaults (B-407)
//   C1 control-new-user  · no row, nothing local: the app settles (onboarding), nothing journaled
//   C2 control-db-only   · a fresh device with data only in the DB loads all of it
// B-408 (14.10) — the five scalars (capital · riskPct · lang · capitalCurrency · accountCurrency).
// Option B (Niv 14.10): ⛔ a merge — the nine Settings controls are DISABLED until the read has
// spoken (`capitalSettled`), and a read that never answers ends as a failure within
// SETTINGS_READ_TIMEOUT_MS. Diagnosis: docs/audits/B408-SCALAR-HYDRATION-DIAGNOSIS-2026-10-14.md
//   H6 scalars-window    · in the window: 9 controls disabled · 3 role=status · ⛔ currency shown
//                          selected · risk is a skeleton; once the read lands, an edit (typed)
//                          survives — screen · localStorage · DB · reload
//   C3 failed-read       · a read that FAILS settles the gate: controls enabled + the B-268 banner
//   C4 not-edited        · a value another device wrote and this one did not edit: DB wins, as today
//   C5 hang              · a read that NEVER answers: within the deadline the controls are enabled and
//                          the B-268 banner is shown — ⛔ a lock for the session
// ⛔ fill · ⛔ addLocatorHandler · ⛔ retry · ⛔ timed waits in these four: conditions only.

import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { installHermetic, newStore, DUMMY_EMAIL, DUMMY_PASSWORD } from "./hermetic.js";
import { exactRx, containsRx } from "./labels.js";
import { tapWhenStable } from "./stableTap.js";
// B-425 (Niv 15.10, ①): the product's own deadline, IMPORTED — ⛔ a mirrored number. The spec runs
// against a BUILD, but every arm restores src/ before the spec starts, so this is HEAD's constant;
// the module is node-safe (supabaseClient yields null without import.meta.env, as in test:settings).
import { SETTINGS_READ_TIMEOUT_MS } from "../src/lib/userSettings.js";

const HERMETIC = process.env.EYE_HERMETIC === "1";
const EVIDENCE = process.env.EYE_EVIDENCE_DIR || join(process.cwd(), "eye-evidence");
const DELTA_KEY = "swingEdgeSettingsDelta";
// B-425 (15.10) — flake diagnosis (scripts/probe-flake.mjs). OBSERVERS ONLY, and only with
// EYE_FLAKE_DIAG=1: ⛔ an expect, a wait or a timeout changes. Without the flag every scene is
// byte-for-byte the behaviour it had. Plan: docs/plans/PLAN-2026-10-15-b425-flake-diagnosis.md
const DIAG = process.env.EYE_FLAKE_DIAG === "1";
const DIAG_KEYS = ["swingEdgePriceAlerts", "swingEdgeCapital", "swingEdgeRiskPct", DELTA_KEY];

// B-425 (Niv 15.10, ①) — EVERY gate that holds a request is subject to the product's deadline.
// The app races the settings read against SETTINGS_READ_TIMEOUT_MS (B-408); a window held past it
// ends in the DESIGNED failure state (writes blocked + the B-268 banner) and the scene no longer
// measures the window it claims (measured: probe-flake run 38754926645, HEAD H2 insitu — the read
// held 7.9s, then «settings check failed — writes stay blocked»). ⇒ the gate releases itself
// GATE_MARGIN_MS before the deadline, and a scene whose window outlived that bound fails as
// INSTRUMENT — ⛔ a red of the scene. ⛔ Raising the product's timeout to let a test pass.
// C5 holds UNBOUNDED on purpose: it is the scene that measures the deadline itself.
const GATE_MARGIN_MS = 2_000;
const GATE_MAX_HOLD_MS = (() => {
  // Self-test only (scripts/probe-flake.mjs S9): a tiny bound proves the INSTRUMENT path fires.
  const o = process.env.EYE_SELFTEST_GATE_HOLD_MS;
  if (o === undefined || o === "") return SETTINGS_READ_TIMEOUT_MS - GATE_MARGIN_MS;
  const n = Number(o);
  if (!(n > 0)) throw new Error(`EYE_SELFTEST_GATE_HOLD_MS must be a positive number, got "${o}"`);
  return n;
})();
if (!(GATE_MAX_HOLD_MS > 0)) throw new Error(`SETTINGS_READ_TIMEOUT_MS (${SETTINGS_READ_TIMEOUT_MS}) leaves no window after a ${GATE_MARGIN_MS}ms margin`);

// One timeline per test: user_settings traffic (method · status · the three fields the two scenes
// are about) · the read gate · console + page errors · every localStorage write to DIAG_KEYS
// (an init script logs them from inside the page with the page's own clock) · snapshots taken
// at named moments. t = ms since the context opened.
async function makeDiag(ctx) {
  const t0 = Date.now();
  const events = [];
  const ev = (kind, data = {}) => events.push({ t: Date.now() - t0, kind, ...data });
  const pick = (req) => {
    try {
      const b = JSON.parse(req.postData() || "null");
      const row = Array.isArray(b) ? b[0] : b;
      const st = row?.settings;
      return st ? { priceAlerts: st.priceAlerts, capital: st.capital, riskPct: st.riskPct } : null;
    } catch (e) { return { unparsable: String(e.message || e) }; }
  };
  const isSettings = (u) => /\/rest\/v1\/user_settings/.test(u);
  // B-433: the production GA property must never hear from a hermetic run — recorded so the
  // self-test (S8) can prove the block: requests attempted (the check is not blind), none answered.
  const isGA = (u) => /^https:\/\/(www\.)?(google-analytics|googletagmanager)\.com\//.test(u);
  ctx.on("request", (r) => {
    if (isSettings(r.url())) ev("req", { method: r.method(), body: r.method() === "GET" ? undefined : pick(r) });
    if (isGA(r.url())) ev("ga", { phase: "req", host: new URL(r.url()).host });
  });
  ctx.on("response", (r) => {
    if (isSettings(r.url())) ev("res", { method: r.request().method(), status: r.status() });
    if (isGA(r.url())) ev("ga", { phase: "res", host: new URL(r.url()).host, status: r.status() });
  });
  ctx.on("requestfailed", (r) => {
    if (isSettings(r.url())) ev("reqfailed", { method: r.method(), failure: r.failure()?.errorText ?? null, body: r.method() === "GET" ? undefined : pick(r) });
    if (isGA(r.url())) ev("ga", { phase: "failed", host: new URL(r.url()).host, failure: r.failure()?.errorText ?? null });
  });
  ctx.on("console", (m) => {
    const text = m.text();
    const ls = /^\[lsdiag\] (\d+) (set|remove) (\S+) ?(.*)$/s.exec(text);
    const de = /^\[evdiag\] (\d+) (\S+) (\S+) ([01]) (-?\d+) ?(.*)$/s.exec(text);
    if (ls) events.push({ t: Number(ls[1]) - t0, kind: "ls", op: ls[2], key: ls[3], value: ls[4] || null });
    else if (de) events.push({ t: Number(de[1]) - t0, kind: "dom", type: de[2], target: de[3], trusted: de[4] === "1", scrollY: Number(de[5]), value: de[6] || null });
    else ev("console", { type: m.type(), text: text.slice(0, 2000) });
  });
  ctx.on("weberror", (e) => ev("pageerror", { error: String(e.error()?.stack || e.error()).slice(0, 2000) }));
  await ctx.addInitScript((keys) => {
    const set = Storage.prototype.setItem, rm = Storage.prototype.removeItem;
    Storage.prototype.setItem = function (k, v) { if (keys.includes(k)) console.debug(`[lsdiag] ${Date.now()} set ${k} ${String(v).slice(0, 500)}`); return set.call(this, k, v); };
    Storage.prototype.removeItem = function (k) { if (keys.includes(k)) console.debug(`[lsdiag] ${Date.now()} remove ${k}`); return rm.call(this, k); };
    // B-425: which events reached which BUTTON/INPUT, in the capture phase, with scrollY — what
    // separates «the click never fired (down/up on a moving target)» from «it fired on empty state».
    for (const type of ["pointerdown", "mousedown", "mouseup", "click", "input"]) {
      document.addEventListener(type, (e) => {
        const t = e.target;
        if (!t || (t.tagName !== "BUTTON" && t.tagName !== "INPUT" && !(t.closest && t.closest("button")))) return;
        const el = t.tagName === "INPUT" ? t : t.closest("button");
        const id = el.tagName === "INPUT" ? `INPUT[${el.placeholder || el.type}]` : `BUTTON[${(el.title || el.textContent || "").trim().slice(0, 16).replace(/\s+/g, "_")}]`;
        console.debug(`[evdiag] ${Date.now()} ${type} ${id} ${e.isTrusted ? 1 : 0} ${Math.round(window.scrollY)} ${type === "input" ? String(el.value).slice(0, 20) : ""}`);
      }, true);
    }
  }, DIAG_KEYS);
  const upserts = () => events.filter((e) => e.kind === "req" && e.method !== "GET").length;
  // A snapshot that cannot be taken is RECORDED as such (⛔ swallowed): the timeline says why.
  const snap = async (page, tag, extra = {}) => {
    try {
      const ls = await page.evaluate((keys) => Object.fromEntries(keys.map((k) => [k, localStorage.getItem(k)])), DIAG_KEYS);
      ev("snap", { tag, ls, upsertsSoFar: upserts(), ...extra });
    } catch (e) { ev("snap-failed", { tag, error: String(e.message || e).split("\n")[0] }); }
  };
  return { ev, snap, events, t0 };
}

test.describe("B-406 · B-397 · B-407 — hydration merges, ⛔ overwrites", () => {
  test.skip(!HERMETIC, "hermetic only — the production step is playbook.spec.js f");

  // B-425: the config's `video` does NOT reach contexts made with browser.newContext() (measured
  // 15.10 — trace did, video did not), so under EYE_FLAKE_DIAG open() records it itself. Kept and
  // attached only when the test did not end as expected; a pass deletes it. Status is final HERE.
  let diagVideos = [];
  test.afterEach(async ({}, info) => {
    const vids = diagVideos;
    diagVideos = [];
    for (const v of vids) {
      if (info.status !== info.expectedStatus) await info.attach("video", { path: v, contentType: "video/webm" });
      else rmSync(v, { force: true });
    }
  });

  const ctxOpts = (info) => {
    const u = info.project.use;
    const pick = ["viewport", "screen", "userAgent", "deviceScaleFactor", "isMobile", "hasTouch", "locale", "timezoneId"];
    return Object.fromEntries(pick.filter((k) => u[k] !== undefined).map((k) => [k, u[k]]));
  };

  // `reducedMotion` (B-425, Niv 15.10 (i)): the held window of H1/H4 was CSS motion — measured (local iphone14
  // trace): every click spent ~450ms in Playwright's stability loop while transitions/animations ran
  // (open Settings → add → save: ~1,450ms; with reduced motion: 473ms). `prefers-reduced-motion: reduce` is a
  // real user setting the product honors (src/index.css:778). ⛔ a timeout · ⛔ a margin · ⛔ src/. The
  // literal (i) «open Settings before arming» is impossible: the reload IS the window, and `tab` resets to
  // the dashboard on every load (SwingEdge_App.jsx:1499).
  async function open(browser, info, seed = {}, { noRow = false, reducedMotion = false } = {}) {
    const ctx = await browser.newContext({ ...ctxOpts(info), baseURL: info.project.use.baseURL, ...(reducedMotion ? { reducedMotion: "reduce" } : {}), ...(DIAG ? { recordVideo: { dir: join(info.outputDir, "diag-video") } } : {}) });
    const diag = DIAG ? await makeDiag(ctx) : null;
    const store = newStore();
    store.settings.lang = "en";
    store.settings.playbook = [];
    store.settings.watchlist = [];
    store.settings.priceAlerts = {};
    Object.assign(store.settings, seed);
    await installHermetic(ctx, store);
    // The iOS install banner is not what this suite measures (B-405 has its own gate).
    await ctx.addInitScript(() => { if (location.protocol.startsWith("http")) localStorage.setItem("swingEdgeIosInstallDismissed", "1"); });
    let rowMissing = noRow;
    await ctx.route(/\/rest\/v1\/user_settings/, (route) => {
      const m = route.request().method();
      if (rowMissing && m === "GET") {
        const single = /vnd\.pgrst\.object/.test(route.request().headers()["accept"] || "");
        return route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: single ? "null" : "[]" });
      }
      if (rowMissing && m !== "GET" && m !== "OPTIONS") rowMissing = false; // the first write creates the row
      return route.fallback();
    });
    // `window` = every hold since the gate was ARMED. ⚠️ Measured (PR-2 CI run 38807495195, HEAD H1 iphone14):
    // loadSettings reads TWICE in sequence; when the first hold auto-releases while still armed, the second
    // GET is held too. The window runs from the FIRST hold — the first cut measured from the latest one and
    // reported «held 914ms» for a ~6.9s window. release() frees every pending hold.
    const gate = { armed: false, held: 0, release: null, fail: false, unbounded: false, window: null, pending: [] };
    await ctx.route(/\/rest\/v1\/user_settings/, async (route) => {
      // B-408 C3 — a read the server REFUSES (⛔ "no row"): the failure path, measured on screen.
      if (route.request().method() === "GET" && gate.fail) {
        return route.fulfill({ status: 500, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify({ message: "eye: refused" }) });
      }
      if (route.request().method() === "GET" && gate.armed) {
        gate.held++;
        const hold = { at: Date.now(), autoReleased: false };
        if (!gate.window) gate.window = { start: hold.at, holds: [] };
        gate.window.holds.push(hold);
        diag?.ev("gate", { state: "held", held: gate.held });
        await new Promise((res) => {
          let timer = null;
          gate.pending.push(() => { clearTimeout(timer); res(); });
          gate.release = () => { for (const free of gate.pending.splice(0)) free(); };
          // B-425 ①: released BEFORE the product's deadline, never after it (C5 alone is unbounded).
          if (!gate.unbounded) timer = setTimeout(() => {
            hold.autoReleased = true;
            diag?.ev("gate", { state: "auto-released", afterMs: Date.now() - hold.at });
            res();
          }, GATE_MAX_HOLD_MS);
        });
        diag?.ev("gate", { state: "released" });
      }
      return route.fallback();
    });
    const page = await ctx.newPage();
    if (DIAG) diagVideos.push(await page.video().path());
    const dir = join(EVIDENCE, "hydration", info.project.name);
    mkdirSync(dir, { recursive: true });
    // B-425: --repeat-each runs a scene N times into ONE directory — repeat 0 keeps the old names.
    const sfx = info.repeatEachIndex ? `-r${info.repeatEachIndex}` : "";
    const shot = (name) => page.screenshot({ path: join(dir, `${name}${sfx}.png`) }).catch(() => {});
    return { ctx, page, store, gate, dir, shot, sfx, diag };
  }

  const dash = (page) => page.locator('[data-tour-tab="dashboard"]').waitFor({ state: "visible", timeout: 30_000 });
  const ls = (page, k) => page.evaluate((k) => localStorage.getItem(k), k);
  const json = async (page, k) => JSON.parse((await ls(page, k)) || "null");

  // B-425 ①: the window must close before its bound. Called right before the scene releases the read —
  // the ONLY source of INSTRUMENT. A scene that fails EARLIER for its own reason stays a scene red (in an
  // arm that expects H6 red, its toBeDisabled times out at 15s, long after the 6s release — that red is
  // the product's, ⛔ the instrument's). The measured window is logged so the margin is a number.
  function windowIntact(app, scene) {
    const { gate } = app;
    const w = gate.window;
    if (gate.unbounded || !w) return;
    const heldFor = Date.now() - w.start;
    const autoReleased = w.holds.filter((h) => h.autoReleased).length;
    gate.windowMs = heldFor;
    app.diag?.ev("gate", { state: "window-closed", heldFor, bound: GATE_MAX_HOLD_MS, holds: w.holds.length, autoReleased });
    console.log(`[window] ${scene} held ${heldFor}ms over ${w.holds.length} read(s) · auto-released ${autoReleased} · bound ${GATE_MAX_HOLD_MS}ms · deadline ${SETTINGS_READ_TIMEOUT_MS}ms`);
    if (autoReleased || heldFor >= GATE_MAX_HOLD_MS) {
      throw new Error(`INSTRUMENT: the held settings read outlived its bound — window ${heldFor}ms over ${w.holds.length} held read(s), ${autoReleased} auto-released, bound ${GATE_MAX_HOLD_MS}ms (SETTINGS_READ_TIMEOUT_MS ${SETTINGS_READ_TIMEOUT_MS} − ${GATE_MARGIN_MS}ms); the scene no longer measures the window (B-425)`);
    }
  }


  async function login(page) {
    await page.goto("/app");
    await page.locator('[data-testid="consent-decline"]').click({ timeout: 10_000 }).catch(() => {});
    await page.locator('input[type="email"]').fill(DUMMY_EMAIL);
    await page.locator('input[autocomplete="current-password"]').fill(DUMMY_PASSWORD);
    await page.locator('button[type="submit"]').first().click();
    await dash(page);
  }

  // Phase 1 → phase 2: the device is returning, and the next read is held.
  async function reloadIntoWindow(app) {
    const { page, gate } = app;
    await page.waitForTimeout(2_500); // the first hydration + its debounced write settle
    gate.window = null;
    gate.armed = true;
    app.diag?.ev("gate", { state: "armed" });
    await page.reload({ waitUntil: "load" });
    await dash(page);
    await expect.poll(() => gate.held, { message: "the user_settings read must be held — otherwise there is no window", timeout: 10_000 }).toBeGreaterThan(0);
  }

  async function releaseAndReload(app, scene) {
    const { page, gate } = app;
    windowIntact(app, scene);
    gate.armed = false;
    gate.release?.();
    app.diag?.ev("gate", { state: "release-called" });
    await page.waitForTimeout(3_500); // hydration + the 1000ms debounce + the upsert
    app.diag?.ev("reload", { by: "releaseAndReload" });
    await page.reload({ waitUntil: "load" });
    await dash(page);
    await page.waitForTimeout(2_500);
  }

  // B-425 (Niv 15.10, (i)): where the held window's time goes — stdout only, ⛔ behaviour. Read by
  // scripts/probe-flake.mjs (window p50/p95/max per step) to decide what can leave the window.
  function mark(app, step) {
    const w = app.gate.window;
    if (w) console.log(`[window-step] ${step} +${Date.now() - w.start}ms`);
  }

  async function openSettings(page) {
    await page.getByRole("button", { name: exactRx("openUserMenu") }).click();
    await page.getByRole("button", { name: exactRx("settings") }).click();
  }

  async function addSetup(page, name, app = null) {
    await page.getByRole("button", { name: exactRx("addSetup") }).click();
    if (app) mark(app, "add-form-open");
    await page.getByPlaceholder("Breakout, Pullback…").fill(name);
    if (app) mark(app, "name-typed");
    await page.getByRole("button", { name: exactRx("saveSetup") }).click();
    if (app) mark(app, "save-clicked");
    await expect(page.getByRole("button", { name: exactRx("saveSetup") })).toHaveCount(0, { timeout: 10_000 });
  }

  const names = (l) => (l || []).map((x) => x.name);
  const evidence = (app, tag, data) => writeFileSync(join(app.dir, `${tag}${app.sfx}.json`), JSON.stringify(data, null, 2));
  // B-425: the diag timeline is written for EVERY run (pass or fail) — the passes are the baseline.
  // ⛔ a status here: inside `finally` testInfo still says "passed" while the error propagates;
  // probe-flake joins each timeline to its verdict from the JSON report by repeatEachIndex.
  const writeDiag = (app, tag, info) => {
    if (!app.diag) return;
    writeFileSync(join(app.dir, `${tag}-diag${app.sfx}.json`), JSON.stringify({ scene: tag, project: info.project.name, repeat: info.repeatEachIndex, events: app.diag.events }, null, 2));
  };

  test("H1 playbook-window — a setup added while the settings read is in flight survives", async ({ browser }, info) => {
    const app = await open(browser, info, {}, { reducedMotion: true });
    const { page, store } = app;
    try {
      await login(page);
      await reloadIntoWindow(app);
      mark(app, "in-window");
      await openSettings(page);
      mark(app, "settings-open");
      await addSetup(page, "H1-WINDOW", app);
      mark(app, "setup-added");
      await releaseAndReload(app, "H1");
      const local = await json(page, "swingEdgePlaybook");
      evidence(app, "H1", { local: names(local), db: names(store.settings.playbook), journal: await ls(page, DELTA_KEY) });
      await app.shot("H1");
      expect(names(local), "B-406: the setup is gone from this device after the read landed").toContain("H1-WINDOW");
      expect(names(store.settings.playbook), "B-406: the setup never reached the DB").toContain("H1-WINDOW");
      expect(await ls(page, DELTA_KEY), "the journal must be empty once the write is confirmed").toBeNull();
    } finally { writeDiag(app, "H1", info); await app.ctx.close(); }
  });

  test("H2 alerts-window — a price alert set while the settings read is in flight survives", async ({ browser }, info) => {
    const app = await open(browser, info);
    const { page, store } = app;
    try {
      await login(page);
      // An OPEN trade to hang the alert on.
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
      await reloadIntoWindow(app);
      mark(app, "in-window");
      await tapWhenStable(page, page.locator('button[title="Price Alert"]').first(), "Price Alert");
      mark(app, "alert-open");
      await page.getByPlaceholder("Set target price").fill("105");
      if (app.diag) await app.diag.snap(page, "before-ok", { inputValue: await page.getByPlaceholder("Set target price").inputValue() });
      await tapWhenStable(page, page.getByRole("button", { name: "OK", exact: true }), "OK");
      // B-425: the ONE moment that tells "the tap never landed" from "set, then lost".
      if (app.diag) await app.diag.snap(page, "after-ok", { alertInputOpen: await page.getByPlaceholder("Set target price").count(), dbNow: store.settings.priceAlerts });
      await releaseAndReload(app, "H2");
      const local = await json(page, "swingEdgePriceAlerts");
      evidence(app, "H2", { local, db: store.settings.priceAlerts, journal: await ls(page, DELTA_KEY), windowMs: app.gate.windowMs, bound: GATE_MAX_HOLD_MS });
      await app.diag?.snap(page, "assert", { dbNow: store.settings.priceAlerts });
      await app.shot("H2");
      expect(local?.EYEPB, "B-406: the alert is gone from this device after the read landed").toBe(105);
      expect(store.settings.priceAlerts?.EYEPB, "B-406: the alert never reached the DB").toBe(105);
    } finally { writeDiag(app, "H2", info); await app.ctx.close(); }
  });

  test("H3 other-device — what another device wrote is shown, and this device's write keeps it", async ({ browser }, info) => {
    const app = await open(browser, info, { playbook: [{ id: 1, name: "S1", description: "", imagePreview: null }] });
    const { page, store } = app;
    try {
      await login(page);
      await page.waitForTimeout(2_500);
      // Another device adds S2 to the row; this device's local copy still holds only S1.
      store.settings.playbook = [...store.settings.playbook, { id: 2, name: "S2-OTHER-DEVICE", description: "", imagePreview: null }];
      await page.reload({ waitUntil: "load" });
      await dash(page);
      await page.waitForTimeout(2_500);
      await openSettings(page);
      await expect(page.getByText("S2-OTHER-DEVICE", { exact: true }), "B-397: the other device's setup is hidden by the stale local copy").toBeVisible();
      await addSetup(page, "S3-THIS-DEVICE");
      await page.waitForTimeout(2_500);
      evidence(app, "H3", { db: names(store.settings.playbook) });
      await app.shot("H3");
      expect(names(store.settings.playbook), "B-397: this device's write erased the other device's setup").toEqual(expect.arrayContaining(["S1", "S2-OTHER-DEVICE", "S3-THIS-DEVICE"]));
    } finally { await app.ctx.close(); }
  });

  test("H4 tombstone — a setup deleted while the read is in flight does not come back", async ({ browser }, info) => {
    const S = (id, name) => ({ id, name, description: "", imagePreview: null });
    const app = await open(browser, info, { playbook: [S(1, "KEEP"), S(2, "H4-DELETE-ME")] }, { reducedMotion: true });
    const { page, store } = app;
    try {
      await login(page);
      await reloadIntoWindow(app);
      mark(app, "in-window");
      await openSettings(page);
      mark(app, "settings-open");
      const card = page.locator("div.overflow-hidden").filter({ has: page.locator("span", { hasText: /^H4-DELETE-ME$/ }) });
      await card.locator("button:has(svg)").first().click();
      await expect(page.getByText("H4-DELETE-ME", { exact: true })).toHaveCount(0, { timeout: 10_000 });
      mark(app, "setup-deleted");
      await releaseAndReload(app, "H4");
      const local = await json(page, "swingEdgePlaybook");
      evidence(app, "H4", { local: names(local), db: names(store.settings.playbook) });
      await app.shot("H4");
      expect(names(local), "the deleted setup came back from the DB").not.toContain("H4-DELETE-ME");
      expect(names(store.settings.playbook), "the deleted setup is still in the DB").not.toContain("H4-DELETE-ME");
      expect(names(local), "the setup that was NOT deleted is gone").toContain("KEEP");
    } finally { writeDiag(app, "H4", info); await app.ctx.close(); }
  });

  test("H5 fresh-device — a new browser gets the user's watchlist, not the defaults", async ({ browser }, info) => {
    const mine = [{ ticker: "AAPL", setup: "Custom", chartSym: "NASDAQ:AAPL" }, { ticker: "KO", setup: "Custom", chartSym: "NYSE:KO" }];
    const app = await open(browser, info, { watchlist: mine });
    const { page, store } = app;
    try {
      await login(page);
      await page.waitForTimeout(3_500);
      const local = await json(page, "swingEdgeWatchlist");
      evidence(app, "H5", { local: (local || []).map((w) => w.ticker), db: (store.settings.watchlist || []).map((w) => w.ticker) });
      expect((local || []).map((w) => w.ticker), "B-407: the default watchlist replaced the user's on this device").toEqual(["AAPL", "KO"]);
      expect((store.settings.watchlist || []).map((w) => w.ticker), "B-407: the default watchlist was written over the user's in the DB").toEqual(["AAPL", "KO"]);
    } finally { await app.ctx.close(); }
  });

  test("C1 control-new-user — no row, nothing local: the app settles (onboarding), nothing journaled", async ({ browser }, info) => {
    const app = await open(browser, info, {}, { noRow: true });
    const { page, store } = app;
    try {
      await page.goto("/app");
      await page.locator('[data-testid="consent-decline"]').click({ timeout: 10_000 }).catch(() => {});
      await page.locator('input[type="email"]').fill(DUMMY_EMAIL);
      await page.locator('input[autocomplete="current-password"]').fill(DUMMY_PASSWORD);
      await page.locator('button[type="submit"]').first().click();
      // A brand-new user lands on the onboarding questionnaire (or the dashboard) — ⛔ a hang.
      await expect(page.locator('[data-tour-tab="dashboard"]').or(page.getByRole("heading", { level: 1, name: /SwingEdge/ })).first()).toBeVisible({ timeout: 20_000 });
      await page.waitForTimeout(2_500);
      evidence(app, "C1", { journal: await ls(page, DELTA_KEY) });
      await app.shot("C1");
      expect(await ls(page, DELTA_KEY), "a new user has no device changes to journal").toBeNull();
    } finally { await app.ctx.close(); }
  });

  test("C2 control-db-only — a fresh device with data only in the DB loads all of it", async ({ browser }, info) => {
    const app = await open(browser, info, {
      playbook: [{ id: 1, name: "DB-ONLY", description: "", imagePreview: null }],
      priceAlerts: { AAPL: 300 },
    });
    const { page } = app;
    try {
      await login(page);
      await page.waitForTimeout(3_000);
      await openSettings(page);
      await expect(page.getByText("DB-ONLY", { exact: true })).toBeVisible();
      expect((await json(page, "swingEdgePriceAlerts"))?.AAPL).toBe(300);
      await app.shot("C2");
    } finally { await app.ctx.close(); }
  });
  // ── B-408 (14.10) ─────────────────────────────────────────────────────────────────────
  // B-425 (Niv 15.10, ①): SETTINGS_READ_TIMEOUT_MS is IMPORTED from src/lib/userSettings.js (top of
  // file) — ⛔ mirrored: a hand copy here is what would drift. C5 allows the deadline + a margin.
  const READ_DEADLINE_MS = SETTINGS_READ_TIMEOUT_MS;
  const B408 = { capital: 12345, riskPct: 2.5, capitalCurrency: "ILS", accountCurrency: "ILS", lang: "es" };

  // A real user: tap the field, type. ⛔ fill.
  async function typeInto(page, locator, text) {
    await locator.click();
    await page.keyboard.type(text);
  }

  // Login without a single swallowed step: the consent banner is a hard click (⛔ .catch).
  async function loginReturning(page) {
    await page.goto("/app");
    await page.locator('[data-testid="consent-decline"]').click();
    await typeInto(page, page.locator('input[type="email"]'), DUMMY_EMAIL);
    await typeInto(page, page.locator('input[autocomplete="current-password"]'), DUMMY_PASSWORD);
    await page.locator('button[type="submit"]').first().click();
    await dash(page);
    // RETURNING = the first hydration wrote the onboarding mirror (the only state with a window).
    await expect.poll(() => ls(page, "swingEdgeOnboarding"), { message: "the device never became returning — there is no window" }).not.toBeNull();
  }

  // `unbounded`: C5 only — the scene that measures the product's deadline must hold past it.
  async function reloadHeld(app, { unbounded = false } = {}) {
    app.gate.unbounded = unbounded;
    app.gate.window = null;
    app.gate.armed = true;
    await app.page.reload({ waitUntil: "load" });
    await dash(app.page);
    await expect.poll(() => app.gate.held, { message: "the user_settings read must be held — otherwise there is no window" }).toBeGreaterThan(0);
  }

  const card = (page, key) => page.locator("div.rounded-xl", { has: page.getByRole("heading", { name: exactRx(key) }) }).last();
  const ccyBox = (page, key) => page.locator("div.mt-4", { has: page.getByRole("heading", { name: exactRx(key) }) }).last();
  const capLine = (page) => page.locator("p", { hasText: containsRx("currentCapital") }).first();
  const riskLine = (page) => page.locator("p", { hasText: containsRx("currentRisk") }).first();
  const ctl = (page) => ({
    lang: card(page, "language").locator("select"),
    capitalInput: card(page, "portfolioCapitalTitle").locator('input[type="number"]'),
    capitalBtn: card(page, "portfolioCapitalTitle").getByRole("button", { name: exactRx("updateCapital") }),
    capUSD: ccyBox(page, "capitalCurrencyTitle").getByRole("button", { name: /USD/ }),
    capILS: ccyBox(page, "capitalCurrencyTitle").getByRole("button", { name: /ILS/ }),
    accUSD: ccyBox(page, "accountCurrencyTitle").getByRole("button", { name: /USD/ }),
    accILS: ccyBox(page, "accountCurrencyTitle").getByRole("button", { name: /ILS/ }),
    riskInput: card(page, "riskPerTradeTitle").locator('input[type="number"]'),
    riskBtn: card(page, "riskPerTradeTitle").getByRole("button", { name: exactRx("updateRisk") }),
  });
  const statusLines = (page) => page.locator('p[role="status"]').filter({ hasText: exactRx("loading") });
  const failBanner = (page) => page.getByRole("alert").filter({ hasText: /couldn't read your settings|לא הצלחנו לקרוא את ההגדרות/ });
  const digits = (s) => Number(String(s).replace(/[^0-9.]/g, ""));

  async function expectAllEnabled(page) {
    for (const [name, loc] of Object.entries(ctl(page))) await expect(loc, `B-408: ${name} must be enabled once the read has spoken`).toBeEnabled();
  }

  test("H6 scalars-window — the five scalars are locked while the read is in flight, and an edit after it survives", async ({ browser }, info) => {
    const app = await open(browser, info);
    const { page, store, gate } = app;
    try {
      await loginReturning(page);
      await reloadHeld(app);
      await openSettings(page);
      const c = ctl(page);
      // ① the window: nothing the user can change, and the screen says why.
      for (const [name, loc] of Object.entries(c)) await expect(loc, `B-408: ${name} is editable while the settings read is in flight — its edit would be overwritten by the DB`).toBeDisabled();
      await expect(statusLines(page), "B-408: the three cards must say «loading» while the controls are locked").toHaveCount(3);
      for (const name of ["capUSD", "capILS", "accUSD", "accILS"]) await expect(c[name], `B-408 ③: ${name} carries a selection before the DB has spoken`).not.toHaveAttribute("aria-pressed");
      await expect(riskLine(page).locator("span.animate-pulse"), "B-408: the risk shown in the window is a stale local number — it must be a skeleton").toHaveCount(1);
      await app.shot("H6-1-window");
      // ② the read lands ⇒ the gate opens (a condition, ⛔ a sleep). B-425 ①: before the bound.
      windowIntact(app, "H6");
      gate.armed = false;
      gate.release?.();
      await expectAllEnabled(page);
      await expect(statusLines(page)).toHaveCount(0);
      // ③ the user edits — typed, tapped, selected.
      await typeInto(page, c.capitalInput, String(B408.capital));
      await c.capitalBtn.click();
      await typeInto(page, c.riskInput, String(B408.riskPct));
      await c.riskBtn.click();
      await c.capILS.click();
      await c.accILS.click();
      await c.lang.selectOption(B408.lang); // a native <select>: selectOption IS the user's gesture
      const screen = async () => ({
        capital: digits(await capLine(page).locator("span").first().textContent()),
        riskPct: digits(await riskLine(page).locator("span").first().textContent()),
        capitalCurrency: (await ctl(page).capILS.getAttribute("aria-pressed")) === "true" ? "ILS" : "USD",
        accountCurrency: (await ctl(page).accILS.getAttribute("aria-pressed")) === "true" ? "ILS" : "USD",
        lang: await page.evaluate(() => document.documentElement.lang),
      });
      const local = async () => ({
        capital: Number(await ls(page, "swingEdgeCapital")),
        riskPct: Number(await ls(page, "swingEdgeRiskPct")),
        capitalCurrency: await ls(page, "swingEdgeCapitalCurrency"),
        accountCurrency: await ls(page, "swingEdgeAccountCurrency"),
        lang: await ls(page, "swingEdgeLang"),
      });
      const db = () => ({ capital: store.settings.capital, riskPct: store.settings.riskPct, capitalCurrency: store.settings.capitalCurrency, accountCurrency: store.settings.accountCurrency, lang: store.settings.lang });
      const s1 = await screen();
      const l2 = await local();
      expect(s1, "(1) the screen right after the edit").toEqual(B408);
      expect(l2, "(2) localStorage").toEqual(B408);
      await expect.poll(db, { message: "(3) the DB row never received the edit" }).toEqual(B408);
      // ④ a reload reads it back from the row.
      await page.reload({ waitUntil: "load" });
      await dash(page);
      await openSettings(page);
      await expectAllEnabled(page);
      const s4 = await screen();
      evidence(app, "H6", { window: "disabled", windowMs: gate.windowMs, bound: GATE_MAX_HOLD_MS, screen: s1, local: l2, db: db(), afterReload: s4 });
      await app.shot("H6-2-after-reload");
      expect(s4, "(4) after a reload").toEqual(B408);
    } finally { gate.release?.(); await app.ctx.close(); }
  });

  test("C3 failed-read — a refused read settles the gate: controls enabled, the B-268 banner shown", async ({ browser }, info) => {
    const app = await open(browser, info);
    const { page, gate } = app;
    try {
      await loginReturning(page);
      gate.fail = true;
      await page.reload({ waitUntil: "load" });
      await dash(page);
      await expect(failBanner(page), "the failed read must be announced (B-268)").toBeVisible();
      await openSettings(page);
      await expectAllEnabled(page);
      await expect(statusLines(page)).toHaveCount(0);
      evidence(app, "C3", { banner: true, enabled: true });
      await app.shot("C3");
    } finally { await app.ctx.close(); }
  });

  test("C4 not-edited — a value another device wrote, and this one did not touch, wins as today", async ({ browser }, info) => {
    const app = await open(browser, info);
    const { page, store } = app;
    try {
      await loginReturning(page);
      store.settings.riskPct = 3; // another device; this one still holds 1 locally
      await page.reload({ waitUntil: "load" });
      await dash(page);
      await openSettings(page);
      await expectAllEnabled(page);
      await expect(riskLine(page).locator("span").first()).toHaveText(/^\s*3%\s*$/);
      expect(await ls(page, "swingEdgeRiskPct")).toBe("3");
      // This device then writes something ELSE — the whole blob goes out; riskPct must still be 3.
      await typeInto(page, ctl(page).capitalInput, "11111");
      if (app.diag) await app.diag.snap(page, "before-click", { inputValue: await ctl(page).capitalInput.inputValue() });
      await ctl(page).capitalBtn.click();
      // B-425: the ONE moment that tells "the click never landed" from "set, then never written".
      if (app.diag) await app.diag.snap(page, "after-click", { inputValue: await ctl(page).capitalInput.inputValue(), dbNow: store.settings.capital });
      await expect.poll(() => store.settings.capital, { message: "the capital edit never reached the row" }).toBe(11111);
      expect(store.settings.riskPct, "this device wrote its stale riskPct over the other device's").toBe(3);
    } finally {
      // B-425: written on failure too — before, a red C4 left no evidence at all (INCIDENTS#33).
      evidence(app, "C4", { riskPct: store.settings.riskPct, capital: store.settings.capital });
      await app.diag?.snap(page, "assert", { dbNow: store.settings.capital });
      writeDiag(app, "C4", info);
      await app.ctx.close();
    }
  });

  test("C5 hang — a settings read that never answers ends within the deadline: controls enabled + B-268 banner", async ({ browser }, info) => {
    const app = await open(browser, info);
    const { page, gate } = app;
    try {
      await loginReturning(page);
      await reloadHeld(app, { unbounded: true }); // ⛔ released — this read never answers
      const t0 = Date.now();
      await expect(failBanner(page), "B-408: a hung settings read is never announced — the session waits forever").toBeVisible({ timeout: READ_DEADLINE_MS + 7_000 });
      const took = Date.now() - t0;
      await openSettings(page);
      await expectAllEnabled(page);
      evidence(app, "C5", { msToFailure: took, deadline: READ_DEADLINE_MS });
      await app.shot("C5");
      expect(took, "the failure arrived far past the deadline").toBeLessThanOrEqual(READ_DEADLINE_MS + 7_000);
    } finally { gate.release?.(); await app.ctx.close(); }
  });
});
