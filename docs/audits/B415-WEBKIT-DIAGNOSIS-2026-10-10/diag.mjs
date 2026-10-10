// B-415 diagnosis harness — EVIDENCE copy (docs/audits), ⛔ a gate and ⛔ in any chain. Ran from a scratch dir. Real WebKit (Playwright 1.61.1), iPhone 14 profile,
// hermetic synthetic Supabase (tests-eye/hermetic.js), builds from `git archive HEAD` in the scratchpad.
//
//   node diag.mjs <build: head|norAF> <field: close|entry> <mode: fill|type|rafFill|human> [N=30]
//
// Per trial: open the modal → act on the field → sample the field's value every 4ms (in-page) from the
// open click to +1000ms after the action, with capture-phase focusin/focusout/beforeinput/input/change logs.
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { join, extname } from "node:path";
const REPO = process.env.B415_REPO || process.cwd(); // the repo root (run from it)
const { webkit, devices } = await import(`${REPO}/node_modules/playwright/index.mjs`);
const { installHermetic, newStore, DUMMY_EMAIL, DUMMY_PASSWORD } = await import(`${REPO}/tests-eye/hermetic.js`);

const [build = "head", field = "close", mode = "fill", nArg = "30"] = process.argv.slice(2);
const N = Number(nArg);
const HERE = new URL(".", import.meta.url).pathname;
const DIST = join(HERE, `dist-${build}`);

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".webmanifest": "application/manifest+json", ".woff2": "font/woff2" };
const server = createServer(async (req, res) => {
  const rel = req.url.split("?")[0].replace(/^\//, "") || "index.html";
  try { const buf = await readFile(join(DIST, rel)); res.writeHead(200, { "content-type": TYPES[extname(rel)] || "application/octet-stream" }); res.end(buf); }
  catch { if (!extname(rel)) { res.writeHead(200, { "content-type": "text/html" }); return res.end(await readFile(join(DIST, "index.html"))); } res.writeHead(404); res.end("Not Found"); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const BASE = `http://127.0.0.1:${server.address().port}`;

const DISMISS_KEY = /const DISMISS_KEY = "([^"]+)";/.exec(readFileSync(`${REPO}/src/components/IOSInstallBanner.jsx`, "utf8"))[1];

const browser = await webkit.launch();
const ctx = await browser.newContext({ ...devices["iPhone 14"], baseURL: BASE });
const store = newStore();
await installHermetic(ctx, store);
// Same as the quote of a fake ticker in prod: /api/quote answers 404 (the static server has no API).
const page = await ctx.newPage();
await page.addInitScript((k) => { if (location.protocol.startsWith("http")) localStorage.setItem(k, "1"); }, DISMISS_KEY);
await page.addInitScript(() => {
  window.__ev = [];
  const name = (el) => !el ? null : (el.id ? `#${el.id}` : `${el.tagName}${el.getAttribute && el.getAttribute("aria-label") ? `[${el.getAttribute("aria-label")}]` : ""}`);
  const rec = (e) => window.__ev.push({ t: +performance.now().toFixed(1), type: e.type, tgt: name(e.target), act: name(document.activeElement), data: e.data ?? (e.key || null), v: e.target && "value" in e.target ? e.target.value : undefined });
  for (const t of ["focusin", "focusout", "beforeinput", "input", "change", "keydown"]) document.addEventListener(t, rec, true);
  window.__startSampler = (sel, tag) => {
    window.__samples = []; window.__ev = [];
    window.__t0 = performance.now();
    const id = setInterval(() => {
      const el = document.querySelector(sel);
      if (el && !el.dataset.b415) el.dataset.b415 = tag;
      window.__samples.push({ t: +(performance.now() - window.__t0).toFixed(1), v: el ? el.value : null, stamp: el ? el.dataset.b415 : null, act: document.activeElement ? (document.activeElement.id || document.activeElement.tagName + (document.activeElement.getAttribute("aria-label") ? `[${document.activeElement.getAttribute("aria-label")}]` : "")) : null });
    }, 4);
    window.__stopSampler = () => clearInterval(id);
  };
});
await page.addLocatorHandler(page.locator('[data-testid="consent-decline"]'), (b) => b.click());

await page.goto("/app", { waitUntil: "load" });
await page.locator('input[type="email"]').fill(DUMMY_EMAIL);
await page.locator('input[autocomplete="current-password"]').fill(DUMMY_PASSWORD);
await page.locator('button[type="submit"]').first().click();
await page.locator('[data-tour-tab="dashboard"]').waitFor({ state: "visible", timeout: 30_000 });

const dialog = () => page.locator('[role="dialog"]').last();
const raf2 = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

async function act(sel, value) {
  const el = page.locator(sel);
  if (mode === "fill") await el.fill(value);
  else if (mode === "type") await el.pressSequentially(value);
  else if (mode === "rafFill") { await raf2(); await el.fill(value); }
  else if (mode === "fillLoaded" || mode === "rafFillLoaded") {
    // A busy main thread (a shared CI runner): one 25ms long task when the target field gains focus —
    // ⛔ a change to the app, only to the machine's speed. Armed once, for this field only.
    if (mode === "rafFillLoaded") await raf2();
    await page.evaluate((s) => document.addEventListener("focusin", function h(e) { if (e.target.matches(s)) { document.removeEventListener("focusin", h, true); const t = performance.now(); while (performance.now() - t < 25) {} } }, true), sel);
    await el.fill(value);
  }
  else if (mode === "human") { await page.waitForTimeout(300); await el.tap(); await page.keyboard.type(value, { delay: 30 }); }
  else throw new Error(`mode ${mode}`);
}

// A trade to close (the close-modal trials): typed slowly, human-paced, and verified.
async function seedTrade() {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('[data-tour="add-trade"]').click();
  await page.waitForTimeout(800);
  for (const [s, v] of [["#log-ticker", "EYEPB"], ["#log-entry", "100"], ["#log-stop", "99"], ["#log-target", "102"]]) {
    await page.locator(s).tap(); await page.keyboard.type(v, { delay: 40 }); await page.waitForTimeout(300);
  }
  await page.waitForTimeout(1500);
  for (const [s, v] of [["#log-ticker", "EYEPB"], ["#log-entry", "100"], ["#log-stop", "99"], ["#log-target", "102"]]) {
    const got = await page.locator(s).inputValue();
    if (got !== v) throw new Error(`seed: ${s} = "${got}" (want ${v})`);
  }
  const submit = page.getByRole("button", { name: /Log Trade/ });
  await submit.waitFor({ state: "visible" });
  await page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => /Log Trade/.test(b.textContent) && !b.disabled), null, { timeout: 25_000 });
  await submit.click();
  await page.waitForFunction(() => (JSON.parse(localStorage.getItem("swingEdgeTrades") || "[]") || []).some((t) => t.ticker === "EYEPB" && t.status === "OPEN"), null, { timeout: 20_000 });
  await page.locator('[data-tour-tab="journal"]').click();
}

async function closeDialog() {
  if (field === "close") { // closeForm survives Cancel/Escape (reset only in handleCloseSubmit) ⇒ a fresh app per trial
    await page.reload(); await page.locator('[data-tour-tab="dashboard"]').waitFor({ state: "visible", timeout: 30_000 });
    await page.locator('[data-tour-tab="journal"]').click(); await page.waitForTimeout(300); return;
  }
  const d = dialog();
  if (!(await d.isVisible().catch(() => false))) return;
  await page.keyboard.press("Escape");
  try { await d.waitFor({ state: "hidden", timeout: 3_000 }); }
  catch { await page.reload(); await page.locator('[data-tour-tab="dashboard"]').waitFor({ state: "visible", timeout: 30_000 }); if (field === "close") await page.locator('[data-tour-tab="journal"]').click(); }
  await page.waitForTimeout(300);
}

if (field === "close") await seedTrade();

const results = [];
for (let i = 0; i < N; i++) {
  const tag = `t${i}`;
  let sel, value;
  if (field === "close") {
    sel = "#close-exit"; value = "100.1247";
    const closeBtn = page.getByRole("button", { name: /^\s*(סגור|Close)\s*$/ });
    const card = page.locator("article").filter({ hasText: "EYEPB" }).filter({ has: closeBtn });
    const btn = card.locator("button").filter({ hasText: /^\s*(סגור|Close)\s*$/ });
    await btn.first().scrollIntoViewIfNeeded();
    await page.evaluate(([s, g]) => window.__startSampler(s, g), [sel, tag]);
    await btn.first().click();
    await act(sel, value);
  } else {
    sel = "#log-entry"; value = "100";
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.evaluate(([s, g]) => window.__startSampler(s, g), [sel, tag]);
    await page.locator('[data-tour="add-trade"]').click();
    // The failing prod run 37780897809's sequence: ticker, then the prices, back to back.
    await act("#log-ticker", "EYEPB");
    await act(sel, value);
  }
  const tAct = await page.evaluate(() => +(performance.now() - window.__t0).toFixed(1));
  await page.waitForTimeout(1000);
  const out = await page.evaluate((s) => { window.__stopSampler(); const el = document.querySelector(s); return { final: el ? el.value : null, stamp: el ? el.dataset.b415 : null, samples: window.__samples, ev: window.__ev, active: document.activeElement && (document.activeElement.id || document.activeElement.tagName) }; }, sel);
  const appeared = out.samples.some((x) => x.v === value);
  const firstNonEmpty = out.samples.find((x) => x.v);
  const stamps = [...new Set(out.samples.map((x) => x.stamp).filter(Boolean))];
  const remount = stamps.length > 1 || out.samples.some((x, k) => k > 0 && x.stamp === undefined && out.samples[k - 1].stamp);
  const lost = out.final !== value;
  const fieldIds = field === "close" ? ["#close-exit"] : ["#log-ticker", "#log-entry"];
  const strayKeys = out.ev.filter((e) => e.type === "keydown" && !fieldIds.includes(e.tgt)).map((e) => `${e.data}→${e.tgt}`);
  const ticker = field === "entry" ? await page.locator("#log-ticker").inputValue().catch(() => null) : undefined;
  results.push({ i, lost, strayKeys, final: out.final, appeared, everNonEmpty: !!firstNonEmpty, remount, stamps, tAct, ticker, activeAfter: out.active, ev: out.ev, samples: out.samples.filter((x, k, a) => k === 0 || x.v !== a[k - 1].v || x.act !== a[k - 1].act) });
  process.stdout.write(lost ? "✗" : "·");
  await closeDialog();
}
const lost = results.filter((r) => r.lost);
const summary = { build, field, mode, N, lost: lost.length, lostRate: `${lost.length}/${N}`, lostAppearedThenEmptied: lost.filter((r) => r.appeared).length, lostNeverAppeared: lost.filter((r) => !r.appeared).length, remounts: results.filter((r) => r.remount).length, trialsWithStrayKeys: results.filter((r) => r.strayKeys.length).length, tickerLost: field === "entry" ? results.filter((r) => r.ticker !== "EYEPB").length : undefined };
console.log(`\n${JSON.stringify(summary)}`);
await writeFile(join(HERE, `out-${process.env.B415_TAG || "mac"}-${build}-${field}-${mode}.json`), JSON.stringify({ summary, results }, null, 1));
await browser.close();
server.close();
