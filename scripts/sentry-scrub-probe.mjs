// scripts/sentry-scrub-probe.mjs — `npm run probe:sentry` (B-458, wave 1 F3 · INCIDENTS #40).
//
// test:analytics 18-27 prove the scrub's VALUES. This proves the real SDK CALLS it: the real
// bytes of src/main.jsx (vite build) + the real @sentry/react, in real Chromium, with the DSN
// pointed at a routed local ingest and Supabase at the hermetic synthetic origin. Zero secrets.
//
// Arms:
//   HEAD    the tree                                            ⇒ 0 token values in every envelope
//   BEFORE  src/main.jsx as at 9f47d5f (no hooks)               ⇒ ≥ 1 envelope carries a token
//   MUT-F3  beforeSend / beforeSendTransaction pass events through ⇒ ≥ 1 envelope carries a token
// Exit 1 on a red HEAD, a green BEFORE, or a surviving mutant (a blind probe, B-272).
//
// ⚠️ Sampling: tracesSampleRate is 0.1. Math.random is scaled below 0.1 ONLY until
// DOMContentLoaded (Sentry samples the pageload in init, which runs before it) and then restored —
// a constant Math.random sends the signed-in app into an infinite loop (measured 28.10).
// ⚠️ Events are captured through the SDK's own current scope: an error thrown from an init
// script has no first-party frame and thirdPartyErrorFilterIntegration drops it (measured).
// ⛔ Not in `npm run verify`: it needs a real browser, like probe:boundary.

import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
import { buildTree, serve, makeOnce, assertCleanTargets } from "./lib/eyeBuild.mjs";
import { SB_HOST, installHermetic, newStore } from "../tests-eye/hermetic.js";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const MAIN = join(ROOT, "src/main.jsx");
const BEFORE_REF = "9f47d5f";
const INGEST = "127.0.0.1:47811";
const WORK = mkdtempSync(join(tmpdir(), "probe-sentry-"));
let failures = 0;
const die = (m) => { console.error(`❌ ${m}`); process.exit(2); };
const once = makeOnce(die);

const WHOLE = /^[\s\S]*$/;
const before = execFileSync("git", ["show", `${BEFORE_REF}:src/main.jsx`], { cwd: ROOT, encoding: "utf8" });
const ARMS = {
  HEAD: { muts: [], expectLeak: false },
  BEFORE: { muts: [[MAIN, WHOLE, () => before]], expectLeak: true },
  "MUT-F3": {
    muts: [
      [MAIN, "  beforeSend: sentryBeforeSend,\n", () => "  beforeSend: (e) => e,\n"],
      [MAIN, "  beforeSendTransaction: sentryBeforeSendTransaction,\n", () => "  beforeSendTransaction: (e) => e,\n"],
    ],
    expectLeak: true,
  },
};

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const AT = [b64({ alg: "HS256", typ: "JWT" }), b64({ sub: "00000000-0000-4000-8000-0000000000c6", aud: "authenticated", role: "authenticated", exp: now + 3600 }), "SIGPROBESENTRY"].join(".");
const RT = "RTSECRETPROBESENTRY";
const HASH = `#access_token=${AT}&expires_at=${now + 3600}&expires_in=3600&refresh_token=${RT}&token_type=bearer&type=recovery`;
const MARKERS = { refresh_token: RT, access_token: AT.slice(-14) };

async function measure(dir) {
  const { server, port } = await serve(dir);
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext();
    const envelopes = [];
    await ctx.route(`http://${INGEST}/**`, async (route) => {
      envelopes.push(route.request().postData() || "");
      await route.fulfill({ status: 200, headers: { "access-control-allow-origin": "*" }, body: "{}" });
    });
    await installHermetic(ctx, newStore());
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      const r = Math.random;
      Math.random = () => r() * 0.09;
      document.addEventListener("DOMContentLoaded", () => { Math.random = r; }, { once: true });
      const cap = (tag) => {
        const c = window.__SENTRY__ && window.__SENTRY__[window.__SENTRY__.version];
        const s = c && c.defaultCurrentScope;
        if (!s || !s.getClient()) return false;
        s.captureMessage(`probe-sentry-${tag}`);
        return true;
      };
      const iv = setInterval(() => { if (cap("early")) clearInterval(iv); }, 2);
      setTimeout(() => cap("late"), 5000);
    });
    await page.goto(`http://127.0.0.1:${port}/app${HASH}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(7000);
    await page.goto(`http://127.0.0.1:${port}/terms`, { waitUntil: "domcontentloaded" }).catch(() => {});
    await page.waitForTimeout(3000);
    const types = envelopes.map((e) => { try { return JSON.parse(e.split("\n")[1]).type || "event"; } catch { return "?"; } });
    const hits = {};
    for (const [k, m] of Object.entries(MARKERS)) hits[k] = envelopes.map((e, i) => (e.includes(m) ? `${i}:${types[i]}` : null)).filter(Boolean);
    return { envelopes: envelopes.length, types, hits };
  } finally {
    await browser.close();
    server.close();
  }
}

assertCleanTargets(ROOT, [MAIN], die);
for (const [arm, a] of Object.entries(ARMS)) {
  const dir = await buildTree({ root: ROOT, arm, outDir: join(WORK, `dist-${arm}`), mutations: a.muts, once, die,
    env: { VITE_SENTRY_DSN: `http://probesentrykey@${INGEST}/1`, SENTRY_AUTH_TOKEN: "" } });
  const r = await measure(dir);
  const leaked = Object.values(r.hits).some((h) => h.length > 0);
  const sawTx = r.types.includes("transaction");
  const sawEvent = r.types.includes("event");
  // ⛔ A run that never produced a transaction AND an event measured nothing — inconclusive is red.
  const conclusive = sawTx && sawEvent;
  const good = conclusive && leaked === a.expectLeak;
  if (!good) failures++;
  console.log(`${good ? "✅" : "❌"} ${arm.padEnd(7)} envelopes=${r.envelopes} [${r.types.join(",")}] · refresh_token in ${JSON.stringify(r.hits.refresh_token)} · access_token in ${JSON.stringify(r.hits.access_token)}`
    + ` ⇒ ${!conclusive ? "INCONCLUSIVE (no transaction or no event)" : a.expectLeak ? (leaked ? "red as required" : "GREEN — blind probe") : (leaked ? "LEAK on HEAD" : "0 token values")}`);
}
console.log(failures ? `\n❌ probe:sentry — ${failures} arm(s) wrong` : "\n✅ probe:sentry: HEAD 0 tokens in every envelope · BEFORE leaks · MUT-F3 killed");
process.exit(failures ? 1 : 0);
