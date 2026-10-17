// tests-flake/b435-sequence.spec.js — B-435 (16.10), wave B step B-0: reproduce, on the runner, the
// production loss of a Playbook setup — playbook.spec b's sequence (add a setup with a photo, reload
// IMMEDIATELY, ×5) against the hermetic build. Plan: docs/plans/PLAN-2026-10-16-b432-b435-local-first.md
//
// THE SERVER MODEL. A request the page CANCELS (the reload) is ⛔ applied — what a real server sees when
// the client aborted before the body arrived (production run 38863710385 logged 6× «upsert rejected
// TypeError: Load failed»). RTT + upload time are simulated per request.
//
// SCENES (probe-flake reads them by the leading tag; red = a setup lost = DATA, ⛔ an instrument failure)
//   Q1 model  — the scratch model that went 0/13 locally (RTT 150ms, upload 2MB/s): the control.
//   Q2 quota  — the same + localStorage pre-filled (after login) to EYE_B435_FREE chars below the quota the
//               browser itself reports, so the ~1MB of images (×2: list + mirror) push writes past it.
//               Records every QuotaExceededError the app's storage writes throw — and whether it was said.
//   Q3 late·1 — B-435 hypothesis 10 (Niv 17.10): a request the page CANCELLED is applied after all — LATE, once
//               ONE request issued after it has been applied (reverse order). Production measured the first half
//               (M-027: pixel7 2/2 requests seen ERR_ABORTED were applied by the server).
//   Q4 late·2 — the same, once TWO later requests have been applied. Predicted from the code BEFORE the run
//               (docs/audits/B435-ERROR-PATHS-2026-10-17.md row 10): Q3 green — the next write to land is the next
//               page's replay, which carries the same blob — and Q4 red — the late blob overtakes a write that
//               already carries the next setup and already settled its journal op.
//               Red = a setup missing in the DB (the device check after each reload, + the DB at the end).
// HERMETIC ONLY. Reachable only through scripts/probe-flake.mjs (playwright.flake.config.js).

import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { installHermetic, newStore, DUMMY_EMAIL, DUMMY_PASSWORD } from "../tests-eye/hermetic.js";
import { exactRx, containsRx } from "../tests-eye/labels.js";

const HERMETIC = process.env.EYE_HERMETIC === "1";
const EVIDENCE = process.env.EYE_EVIDENCE_DIR || join(process.cwd(), "eye-evidence", "probe-flake");
const FIXTURES = process.env.EYE_B435_FIXTURES; // dir with F1_1…F1_5.jpg (≥3.5MB photos, playbook.spec's)
const RTT_MS = 150, UPLOAD_BPS = 2e6;
const FREE_CHARS = Number(process.env.EYE_B435_FREE || "1500000");

test.describe("B-435 — a Playbook setup lost after the next add + reload", () => {
  test.skip(!HERMETIC, "hermetic only — scripts/probe-flake.mjs");
  test.skip(!FIXTURES, "EYE_B435_FIXTURES (the F1_* photos) is required");

  let videos = [];
  test.afterEach(async ({}, info) => {
    const v = videos; videos = [];
    for (const p of v) {
      if (info.status !== info.expectedStatus) await info.attach("video", { path: p, contentType: "video/webm" });
      else rmSync(p, { force: true });
    }
  });

  const ctxOpts = (info) => {
    const u = info.project.use;
    const pick = ["viewport", "screen", "userAgent", "deviceScaleFactor", "isMobile", "hasTouch", "locale", "timezoneId"];
    return Object.fromEntries(pick.filter((k) => u[k] !== undefined).map((k) => [k, u[k]]));
  };

  async function run(browser, info, scene, { quota, lateAfter = 0 }) {
    test.setTimeout(280_000);
    const ctx = await browser.newContext({ ...ctxOpts(info), baseURL: info.project.use.baseURL, recordVideo: { dir: join(info.outputDir, "diag-video") } });
    const store = newStore();
    Object.assign(store.settings, { lang: "en", playbook: [], watchlist: [], priceAlerts: {} });
    await installHermetic(ctx, store);
    await ctx.addInitScript(() => { if (location.protocol.startsWith("http")) localStorage.setItem("swingEdgeIosInstallDismissed", "1"); });
    // Every storage write that throws, from inside the page, with the key — and the app's own console.
    await ctx.addInitScript(() => {
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) {
        try { return set.call(this, k, v); } catch (e) {
          if (k !== "zzB435Filler") console.debug(`[quota] ${Date.now()} ${k} ${String(v).length} ${e.name}`);
          throw e;
        }
      };
    });
    const t0 = Date.now();
    const events = [];
    const ev = (kind, data = {}) => events.push({ t: Date.now() - t0, kind, ...data });
    const cancelled = new Set();
    ctx.on("console", (m) => {
      const q = /^\[quota\] (\d+) (\S+) (\d+) (\S+)$/.exec(m.text());
      if (q) events.push({ t: Number(q[1]) - t0, kind: "quota", key: q[2], chars: Number(q[3]), error: q[4] });
      else if (m.type() === "error" || m.type() === "warning") ev("console", { type: m.type(), text: m.text().slice(0, 400) });
    });
    ctx.on("requestfailed", (r) => { if (/user_settings/.test(r.url())) { cancelled.add(r); ev("reqfailed", { method: r.method(), failure: r.failure()?.errorText ?? null }); } });
    const names = (body) => { try { const b = JSON.parse(body || "{}"); const row = Array.isArray(b) ? b[0] : b; return (row?.settings?.playbook || []).map((s) => s.name); } catch { return ["UNPARSEABLE"]; } };
    // Q3/Q4 — the late queue: cancelled requests waiting for `lateAfter` LATER-issued requests to be applied.
    let issued = 0, busy = 0;
    const late = [];
    const tokenOf = (body) => { try { const b = JSON.parse(body || "{}"); const row = Array.isArray(b) ? b[0] : b; return row?.updated_at ?? null; } catch { return null; } };
    const applyLate = (justApplied) => {
      for (const l of [...late]) {
        if (justApplied > l.seq) l.overtakenBy += 1;
        if (l.overtakenBy < lateAfter) continue;
        late.splice(late.indexOf(l), 1);
        const b = JSON.parse(l.body); const row = Array.isArray(b) ? b[0] : b;
        const rowBefore = { token: store.updatedAt ?? null, playbook: (store.settings.playbook || []).map((x) => x.name) };
        store.settings = row.settings; if (row.updated_at) store.updatedAt = row.updated_at; // hermetic.js POST semantics, verbatim
        ev("late-applied", { seq: l.seq, token: row.updated_at, playbook: names(l.body), over: rowBefore, backwards: rowBefore.token != null && row.updated_at < rowBefore.token });
      }
    };
    await ctx.route(/\/rest\/v1\/user_settings/, async (route) => {
      const req = route.request();
      if (req.method() !== "POST") return route.fallback();
      const body = req.postData() || "";
      const seq = ++issued;
      busy += 1;
      try {
        ev("post", { seq, bytes: body.length, playbook: names(body) });
        await new Promise((r) => setTimeout(r, RTT_MS + (body.length / UPLOAD_BPS) * 1000)); // ⚠️ the simulated network, ⛔ a wait for a condition
        if (cancelled.has(req)) {
          if (lateAfter) { late.push({ seq, body, overtakenBy: 0 }); ev("late-queued", { seq, token: tokenOf(body), playbook: names(body) }); }
          else ev("dropped", { bytes: body.length, playbook: names(body) });
          return await route.abort().catch(() => {});
        }
        ev("applied", { seq, bytes: body.length, playbook: names(body) });
        if (!lateAfter) return await route.fallback().catch((e) => ev("fallback-error", { error: String(e.message).split("\n")[0] }));
        // Late mode applies HERE (hermetic.js POST semantics, verbatim) so that the late ones provably go AFTER this
        // write — a fallback would apply it inside another handler, at a moment this one cannot see.
        const b = JSON.parse(body || "{}"); const row = Array.isArray(b) ? b[0] : b;
        if (row && row.settings) { store.settings = row.settings; if (row.updated_at) store.updatedAt = row.updated_at; }
        applyLate(seq);
        await route.fulfill({ status: 201, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: "[]" })
          .catch((e) => ev("fulfill-after-cancel", { seq, error: String(e.message).split("\n")[0] })); // applied, the page left: what a server sees
      } finally { busy -= 1; }
    });
    const page = await ctx.newPage();
    videos.push(await page.video().path());
    const dir = join(EVIDENCE, "hydration", info.project.name);
    mkdirSync(dir, { recursive: true });
    const sfx = info.repeatEachIndex ? `-r${info.repeatEachIndex}` : "";
    const steps = [];
    const toasts = () => page.getByRole("status").allTextContents().catch(() => []);
    try {
      await page.goto("/app");
      await page.locator('[data-testid="consent-decline"]').click();
      await page.locator('input[type="email"]').fill(DUMMY_EMAIL);
      await page.locator('input[autocomplete="current-password"]').fill(DUMMY_PASSWORD);
      await page.locator('button[type="submit"]').first().click();
      await page.locator('[data-tour-tab="dashboard"]').waitFor({ state: "visible", timeout: 30_000 });
      if (quota) {
        // The browser's own quota, measured: fill until it throws, then free FREE_CHARS.
        const q = await page.evaluate((free) => {
          const used = () => { let n = 0; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); n += k.length + (localStorage.getItem(k) || "").length; } return n; };
          let filler = "", step = 1 << 20;
          while (step >= 1024) { try { localStorage.setItem("zzB435Filler", filler + "x".repeat(step)); filler += "x".repeat(step); } catch { step >>= 1; } }
          const capacity = used();
          localStorage.setItem("zzB435Filler", filler.slice(0, Math.max(0, filler.length - free)));
          return { capacityChars: capacity, fillerChars: Math.max(0, filler.length - free), usedAfter: used() };
        }, FREE_CHARS);
        ev("quota-fill", q);
      }
      const panelOf = () => page.getByRole("heading", { name: exactRx("personalPlaybook") }).locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]');
      const openPlaybook = async () => {
        await page.getByRole("button", { name: exactRx("openUserMenu") }).click();
        await page.getByRole("button", { name: exactRx("settings") }).click();
        const p = panelOf(); await p.waitFor({ state: "visible", timeout: 20_000 }); await p.scrollIntoViewIfNeeded(); return p;
      };
      let panel = await openPlaybook();
      for (let k = 1; k <= 5; k++) {
        await panel.getByRole("button", { name: exactRx("addSetup") }).click();
        await panel.getByPlaceholder("Breakout, Pullback…").fill(`b${k}`);
        await panel.locator('input[type="file"]').setInputFiles(join(FIXTURES, `F1_${k}.jpg`));
        await panel.getByText(containsRx("imageLoaded")).waitFor({ state: "visible", timeout: 45_000 });
        await panel.getByRole("button", { name: exactRx("saveSetup") }).click();
        await expect(panel.getByRole("button", { name: exactRx("saveSetup") })).toHaveCount(0, { timeout: 10_000 });
        const before = await toasts();
        ev("saved", { k, toasts: before });
        await page.reload({ waitUntil: "load" }); // ⚠️ IMMEDIATELY — playbook.spec b's shape
        await page.locator('[data-tour-tab="dashboard"]').waitFor({ state: "visible", timeout: 30_000 });
        panel = await openPlaybook();
        // The post-reload hydration has spoken: the read answered and the device list holds every DB item.
        await expect.poll(async () => {
          const local = await page.evaluate(() => JSON.parse(localStorage.getItem("swingEdgePlaybook") || "[]").map((s) => s.name));
          const db = (store.settings.playbook || []).map((s) => s.name);
          return db.every((n) => local.includes(n));
        }, { message: "the device never caught up with the DB after the reload", timeout: 15_000 }).toBe(true);
        const local = await page.evaluate(() => JSON.parse(localStorage.getItem("swingEdgePlaybook") || "[]").map((s) => s.name));
        const journal = await page.evaluate(() => localStorage.getItem("swingEdgeSettingsDelta"));
        const db = (store.settings.playbook || []).map((s) => s.name);
        steps.push({ k, local, db, journal: journal ? JSON.parse(journal) : null, toasts: await toasts() });
        expect(local.sort(), `B-435: after setup ${k} + reload (device)`).toEqual(Array.from({ length: k }, (_, i) => `b${i + 1}`));
      }
      if (lateAfter) {
        // The last page's replay write lands (b5 in the DB, nothing in flight) — and any late request it releases
        // lands with it. THEN the DB must hold all five: a late overtake after the last write is a loss too.
        await expect.poll(() => busy === 0 && (store.settings.playbook || []).some((s) => s.name === "b5"), { message: "the last page never wrote b5 to the DB", timeout: 20_000 }).toBe(true);
        const finalDb = (store.settings.playbook || []).map((s) => s.name);
        steps.push({ k: "final", db: finalDb, lateLeft: late.length });
        expect(finalDb.sort(), "B-435: the DB at the end").toEqual(["b1", "b2", "b3", "b4", "b5"]);
      }
    } finally {
      writeFileSync(join(dir, `${scene}${sfx}.json`), JSON.stringify({ scene, steps, db: (store.settings.playbook || []).map((s) => s.name) }, null, 2));
      writeFileSync(join(dir, `${scene}-diag${sfx}.json`), JSON.stringify({ scene, project: info.project.name, repeat: info.repeatEachIndex, events, steps }, null, 2));
      await ctx.close();
    }
  }

  test("Q1 model — the scratch model: a cancelled write ⛔ applied, five setups + immediate reloads", async ({ browser }, info) => {
    await run(browser, info, "Q1", { quota: false });
  });
  test("Q2 quota — the same, with localStorage pre-filled near the browser's own quota", async ({ browser }, info) => {
    await run(browser, info, "Q2", { quota: true });
  });
  test("Q3 late·1 — a cancelled write applied after ONE later write (B-435 hypothesis 10)", async ({ browser }, info) => {
    await run(browser, info, "Q3", { quota: false, lateAfter: 1 });
  });
  test("Q4 late·2 — a cancelled write applied after TWO later writes (B-435 hypothesis 10)", async ({ browser }, info) => {
    await run(browser, info, "Q4", { quota: false, lateAfter: 2 });
  });
});
