// scripts/cents-lang-probe.mjs — INCIDENTS#46 (12.11): the red-before for the EXPLICIT language in cents.spec's
// production settings route (tests-eye/centsSettingsRoute.js). Zero CI, zero production: a loopback stub answers
// the settings GET with a row whose `lang` is "en" — the live QA row on 12.11 — and the page reads what the route
// handed it, exactly as the app's hydration would.
//
//   node scripts/cents-lang-probe.mjs   ⇒ OLD (the route as of 0e3defe: `he` passes the row's lang through) must
//                                         hand the app "en" (RED) · NEW must hand it "he" (GREEN) and report the
//                                         row's own lang ("en") to the caller for the fixture verdict.
// The NEW route is imported (the real bytes). OLD is a verbatim copy of the view it replaced, kept here only as the
// control. Exit 1 = blind (OLD not red) or the fix does not hold.
import http from "node:http";
import { chromium } from "@playwright/test";
import { installCentsSettingsRoute } from "../tests-eye/centsSettingsRoute.js";

const ROW = [{ settings: { lang: "en", capitalCurrency: "ILS", accountCurrency: "ILS", capital: 10000 }, updated_at: "2026-11-12T17:43:01Z" }];
const srv = http.createServer((req, res) => {
  if (req.url.startsWith("/rest/v1/user_settings")) { res.setHeader("content-type", "application/json"); res.end(JSON.stringify(ROW)); return; }
  res.setHeader("content-type", "text/html"); res.end("<html><body>stub</body></html>");
});
await new Promise((r) => srv.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${srv.address().port}`;
const browser = await chromium.launch();

// OLD — tests-eye/cents.spec.js at 0e3defe, the `view` inside openApp (verbatim logic).
async function installOld(ctx, lang) {
  await ctx.route(/\/rest\/v1\/user_settings/, async (route) => {
    const req = route.request();
    if (req.method() !== "GET") return route.fulfill({ status: 201, contentType: "application/json", body: "[]" });
    const res = await route.fetch();
    const body = await res.json();
    const view = (r) => { if (!(r && r.settings)) return r; const settings = { ...r.settings }; if (lang === "en") delete settings.lang; return { ...r, settings }; };
    return route.fulfill({ response: res, json: Array.isArray(body) ? body.map(view) : view(body) });
  });
}

async function langSeen(install) {
  const ctx = await browser.newContext();
  const seenRow = { lang: undefined };
  await install(ctx, seenRow);
  const page = await ctx.newPage();
  await page.goto(origin + "/");
  const got = await page.evaluate(async (o) => (await (await fetch(o + "/rest/v1/user_settings?select=settings")).json())[0].settings.lang ?? null, origin);
  await ctx.unrouteAll({ behavior: "wait" });
  await ctx.close();
  return { got, row: seenRow.lang };
}

const old = await langSeen((ctx) => installOld(ctx, "he"));
const neu = await langSeen((ctx, seen) => installCentsSettingsRoute(ctx, "he", (r) => { seen.lang = r.lang; }));
await browser.close(); srv.close();
console.log(`row lang "en", test lang "he" ⇒ OLD hands the app "${old.got}" · NEW hands the app "${neu.got}" and reports the row's lang "${neu.row}"`);
if (old.got !== "en") { console.log("❌ instrument blind: OLD did not pass the row's en through — this probe proves nothing"); process.exit(1); }
if (neu.got !== "he" || neu.row !== "en") { console.log("❌ the fix does not hold"); process.exit(1); }
console.log("✅ red-before proven (OLD ⇒ en, the 12.11 failure) · NEW ⇒ he, and the row's own lang still reaches the verdict");
