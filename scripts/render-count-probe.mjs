// scripts/render-count-probe.mjs — `npm run probe:renders` (B-460 · B-462, wave 1 F5).
//
// test:perf pins the SHAPE (no root timer for a dot). This counts what the user's device pays:
// how many times the root component (the function component with the longest hook chain — 276 on
// 28.10, i.e. SwingEdge) re-renders in 60 s on a signed-in, idle, visible tab. Real bytes (vite
// build), real React, real Chromium, hermetic Supabase. A stub __REACT_DEVTOOLS_GLOBAL_HOOK__ sees
// every commit; the root "rendered" when its fiber's memoizedState ≠ its alternate's.
//
// Arms (exit 1 on any wrong verdict — a blind probe is red, B-272):
//   HEAD     the tree                                       ⇒ ≤ 20 / 60 s   (Niv 28.10: was 84)
//   BEFORE   SwingEdge_App.jsx + src/index.css at 9f47d5f   ⇒ ≥ 60 / 60 s
//   MUT-F5   HEAD + the 1.5 s setPulse interval put back     ⇒ > 20 / 60 s
// --breakdown (B-462): HEAD minus ONE of the four remaining intervals per arm — the delta is that
//   source's share of the residual. Reported, never judged.
// ⚠️ The market state is whatever the clock says (the intervals run in every state). n = 1 per arm.
// ⛔ Not in `npm run verify`: it needs a real browser, like probe:boundary.

import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
import { buildTree, serve, makeOnce, assertCleanTargets } from "./lib/eyeBuild.mjs";
import { installHermetic, newStore, DUMMY_EMAIL, DUMMY_PASSWORD } from "../tests-eye/hermetic.js";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const APP = join(ROOT, "SwingEdge_App.jsx");
const CSS = join(ROOT, "src/index.css");
const BEFORE_REF = "9f47d5f";
const SECS = 60;
const WORK = mkdtempSync(join(tmpdir(), "probe-renders-"));
const die = (m) => { console.error(`❌ ${m}`); process.exit(2); };
const once = makeOnce(die);
const WHOLE = /^[\s\S]*$/;
const show = (f) => execFileSync("git", ["show", `${BEFORE_REF}:${f.replace(ROOT + "/", "")}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

const ANCHOR = "  // blink in CSS now (.se-pulse-opacity · .se-pulse-emerald, src/index.css). Pinned by test:perf.\n";
const off = (find, repl) => [APP, find, () => repl];
const ARMS = {
  HEAD: { muts: [], max: 20 },
  BEFORE: { muts: [[APP, WHOLE, () => show(APP)], [CSS, WHOLE, () => show(CSS)]], min: 60 },
  "MUT-F5": { muts: [[APP, ANCHOR, () => `${ANCHOR}  const [pulse, setPulse] = useState(false); useEffect(() => { const t = setInterval(() => setPulse(p => !p), 1500); return () => clearInterval(t); }, []); void pulse;\n`]], over: 20 },
};
const BREAKDOWN = {
  "NO-MARKET": [off("const t = setInterval(() => setMarketState(getMarketState()), 30_000);", "const t = null;")],
  "NO-PRICES": [off("const interval = setInterval(run, getRefreshInterval(marketState));", "const interval = null;")],
  "NO-OVERVIEW": [off("const interval = setInterval(run, getOverviewRefreshInterval(marketState));", "const interval = null;")],
  "NO-TILT": [off("const id = setInterval(() => setTiltTick(x => x + 1), 60000);", "const id = null;")],
};
if (process.argv.includes("--breakdown")) for (const [k, muts] of Object.entries(BREAKDOWN)) ARMS[k] = { muts, report: true };

async function count(dir) {
  const { server, port } = await serve(dir);
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext();
    await installHermetic(ctx, newStore());
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      const st = { commits: 0, rootRenders: 0, topHooks: 0, armed: false };
      window.__rc = st;
      const hooksOf = (f) => { let n = 0, h = f.memoizedState; while (h && n < 5000 && typeof h === "object" && "next" in h) { n++; h = h.next; } return n; };
      const findTop = (fiber) => { let best = null, bestN = 0; const stack = [fiber]; let g = 0;
        while (stack.length && g++ < 200000) { const f = stack.pop(); if (typeof f.type === "function") { const n = hooksOf(f); if (n > bestN) { bestN = n; best = f; } } if (f.sibling) stack.push(f.sibling); if (f.child) stack.push(f.child); }
        return [best, bestN]; };
      window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = { supportsFiber: true, renderers: new Map(), inject() { return 1; }, checkDCE() {}, onCommitFiberUnmount() {}, onPostCommitFiberRoot() {},
        onCommitFiberRoot(_id, root) { if (!st.armed) return; st.commits++; const [top, n] = findTop(root.current); if (!top || n < 100) return; st.topHooks = Math.max(st.topHooks, n);
          if (top.alternate && top.memoizedState !== top.alternate.memoizedState) st.rootRenders++; } };
    });
    await page.goto(`http://127.0.0.1:${port}/app`, { waitUntil: "commit" });
    await page.locator('input[type="email"]').fill(DUMMY_EMAIL);
    await page.locator('input[autocomplete="current-password"]').fill(DUMMY_PASSWORD);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(15000);
    const signedIn = (await page.locator('input[type="email"]').count()) === 0;
    await page.evaluate(() => { window.__rc.armed = true; });
    await page.waitForTimeout(SECS * 1000);
    const r = await page.evaluate(() => ({ ...window.__rc }));
    return { signedIn, renders: r.rootRenders, commits: r.commits, hooks: r.topHooks, visible: await page.evaluate(() => document.visibilityState) };
  } finally {
    await browser.close();
    server.close();
  }
}

assertCleanTargets(ROOT, [APP, CSS], die);
let failures = 0;
const results = {};
for (const [arm, a] of Object.entries(ARMS)) {
  const dir = await buildTree({ root: ROOT, arm, outDir: join(WORK, `dist-${arm}`), mutations: a.muts, once, die });
  const r = await count(dir);
  results[arm] = r;
  const conclusive = r.signedIn && r.visible === "visible" && r.hooks >= 100;
  let ok = conclusive, verdict = "";
  if (!conclusive) verdict = "INCONCLUSIVE (not signed in, hidden tab, or no root found)";
  else if (a.max != null) { ok = r.renders <= a.max; verdict = ok ? `≤ ${a.max}` : `> ${a.max} — RED HEAD`; }
  else if (a.min != null) { ok = r.renders >= a.min; verdict = ok ? `≥ ${a.min} as measured before` : `< ${a.min} — BEFORE did not reproduce`; }
  else if (a.over != null) { ok = r.renders > a.over; verdict = ok ? `> ${a.over} — mutant killed` : `≤ ${a.over} — mutant SURVIVED`; }
  else verdict = `Δ vs HEAD = ${results.HEAD ? results.HEAD.renders - r.renders : "?"} (report)`;
  if (!ok) failures++;
  console.log(`${ok ? "✅" : "❌"} ${arm.padEnd(12)} ${String(r.renders).padStart(3)} root renders / ${SECS} s · ${r.commits} commits · root hooks ${r.hooks} ⇒ ${verdict}`);
}
console.log(failures ? `\n❌ probe:renders — ${failures} arm(s) wrong` : "\n✅ probe:renders: HEAD within budget · BEFORE reproduced · MUT-F5 killed");
process.exit(failures ? 1 : 0);
