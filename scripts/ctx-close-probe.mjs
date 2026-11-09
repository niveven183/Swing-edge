// scripts/ctx-close-probe.mjs — B-454 (09.11): the red-before for tests-eye/ctxClose.js. Zero CI, zero
// production: a loopback origin that answers after DELAY ms, a context route that awaits `route.fetch()`
// (exactly cents.spec.js:144-155), and a teardown that happens while that fetch is in flight.
//
//   node scripts/ctx-close-probe.mjs            ⇒ OLD (ctx.close) must be RED, NEW (closeCtx) must be GREEN
//
// The helper is imported from tests-eye/ — the REAL bytes, not a copy. Exit 1 = the instrument is blind
// (OLD did not fail often enough to prove anything) or the fix does not hold.
import http from "node:http";
import { chromium } from "@playwright/test";
import { closeCtx } from "../tests-eye/ctxClose.js";

const N = Number(process.env.N || 50), DELAY = 400, NEED_RED = Math.ceil(N * 0.9);
const srv = http.createServer((req, res) => { setTimeout(() => { res.setHeader("content-type", "application/json"); res.end("[]"); }, DELAY); });
await new Promise((r) => srv.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${srv.address().port}`;
const browser = await chromium.launch();

const errors = [];
process.on("unhandledRejection", (e) => errors.push(String(e && e.message || e)));

async function once(close) {
  errors.length = 0;
  const ctx = await browser.newContext();
  await ctx.route(/\/settings/, async (route) => { const res = await route.fetch(); await route.fulfill({ response: res }); });
  const page = await ctx.newPage();
  await page.goto(origin + "/ok").catch(() => {});
  page.evaluate((o) => fetch(o + "/settings").catch(() => {}), origin).catch(() => {});
  await new Promise((r) => setTimeout(r, 120)); // the GET is in flight, the "test body" is over
  await close(ctx);
  await new Promise((r) => setTimeout(r, DELAY + 300)); // a late rejection has time to land
  return errors.some((m) => /Request context disposed/.test(m));
}

const OLD = (ctx) => ctx.close();
const NEW = closeCtx;
let oldRed = 0, newRed = 0;
for (let i = 0; i < N; i++) { if (await once(OLD)) oldRed++; if (await once(NEW)) newRed++; }
await browser.close(); srv.close();
console.log(`OLD ctx.close(): ${oldRed}/${N} 'Request context disposed' · NEW closeCtx(): ${newRed}/${N}`);
if (oldRed < NEED_RED) { console.log(`❌ instrument blind: OLD red ${oldRed}/${N} < ${NEED_RED} — this probe proves nothing`); process.exit(1); }
if (newRed !== 0) { console.log(`❌ the fix does not hold: ${newRed}/${N}`); process.exit(1); }
console.log("✅ red-before proven (OLD red) · fix holds (NEW 0)");
