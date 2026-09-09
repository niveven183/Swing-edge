// ─── ⑥① THE FIRING OBSERVATION (B-304) ─────────────────────────────────────
//
//   node scripts/boundary-render-probe.mjs
//
// ⛔ NOT in the verify chain — it needs a real browser, like `test:smoke`.
// `test:boundary` proves the BYTES; this proves the BEHAVIOUR.
//
// WHY IT EXISTS: the wave rule is "⛔ an alerting layer is not considered to
// exist until it has been observed firing on an artificial failure." A harness
// that greps for `onError` proves the string is present, not that React routes
// a real throw into it. AUDIT-2026-09-07 measured 3 "existing" layers and 0/3
// saw the outage — every one of them was present in the source.
//
// So this bundles the REAL src/components/PanelBoundary.jsx against the REAL
// @sentry/react, renders three sibling panels in real Chromium, makes the
// middle one throw the exact 07.09 shape (`null.toFixed`), and then reads:
//   1. are the SIBLINGS still in the DOM and laid out (blast radius contained)
//   2. is the error CARD visible with non-zero box (§3.3 — never a silent null)
//   3. did Sentry produce an event with level=fatal + tags.boundary
//   4. did the Discord side-channel POST to /api/alert
//
// ⚠️ Sentry is init'd with a throwaway DSN and `beforeSend` returning null:
// the event is fully built and enriched by the real SDK, then dropped instead
// of being transmitted. Nothing leaves the machine.
//
// ⛔ WHAT THIS STILL DOES NOT COVER: Tailwind is not compiled here, so this
// measures LAYOUT, not colour, contrast, RTL or a screen reader. Those live in
// the C- eye check and nowhere else.

import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import { chromium } from "playwright";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

let failures = 0;
const ok = (name, cond, detail = "") => {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    failures++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
};

// Everything above the render call is identical in both arms, so the ONLY
// difference measured below is where the boundary sits.
const PRELUDE = `
import React from "react";
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import PanelBoundary from "${join(ROOT, "src/components/PanelBoundary.jsx")}";

window.__events = [];
window.__alerts = [];

// Real SDK, real event pipeline, dropped at the last step.
Sentry.init({
  dsn: "https://0000000000000000000000000000000@o0.ingest.sentry.io/0",
  enabled: true,
  defaultIntegrations: false,
  beforeSend: (event) => { window.__events.push(event); return null; },
});

const realFetch = window.fetch;
window.fetch = (url, opts) => {
  window.__alerts.push({ url: String(url), body: opts && opts.body });
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
};

// The exact 07.09 shape: one null field, in one cell, in one panel.
function BoomPanel() {
  const trade = { riskPct: null };
  return <div>{trade.riskPct.toFixed(2)}%</div>;
}
const Alive = ({ id }) => <div data-testid={id}>alive: {id}</div>;
const root = createRoot(document.getElementById("root"));
`;

// ARM 1 — after B-304: one contained boundary around the panel that throws.
const ENTRY_TREATMENT =
  PRELUDE +
  `
root.render(
  <div>
    <Alive id="sibling-before" />
    <PanelBoundary name="risk"><BoomPanel /></PanelBoundary>
    <Alive id="sibling-after" />
  </div>
);
`;

// ARM 2 — the CONTROL: the 07.09 shape. ONE boundary around the whole app,
// exactly as src/main.jsx had it. This arm is what makes the treatment mean
// something: without it, "the siblings survived" could just as easily be a
// statement about React as about this wave.
const ENTRY_CONTROL =
  PRELUDE +
  `
root.render(
  <Sentry.ErrorBoundary fallback={<p>משהו השתבש. רענן את הדף.</p>}>
    <div>
      <Alive id="sibling-before" />
      <BoomPanel />
      <Alive id="sibling-after" />
    </div>
  </Sentry.ErrorBoundary>
);
`;

const run = async (ENTRY) => {
  const dir = await mkdtemp(join(tmpdir(), "b304-probe-"));
  const entryPath = join(dir, "entry.jsx");
  const bundlePath = join(dir, "bundle.js");
  const htmlPath = join(dir, "index.html");

  await writeFile(entryPath, ENTRY, "utf8");
  await esbuild.build({
    entryPoints: [entryPath],
    bundle: true,
    outfile: bundlePath,
    format: "iife",
    loader: { ".js": "jsx", ".jsx": "jsx" },
    // Vite compiles with the automatic runtime; PanelBoundary.jsx has no
    // `import React`. esbuild defaults to the classic transform, which would
    // measure a bundling choice rather than the component.
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
    absWorkingDir: ROOT,
    // The entry lives in tmp, so Node resolution would walk up from /tmp and
    // find nothing. Point it at the repo's real node_modules instead.
    nodePaths: [join(ROOT, "node_modules")],
    logLevel: "silent",
  });
  await writeFile(
    htmlPath,
    `<!doctype html><html dir="rtl"><body><div id="root"></div><script src="./bundle.js"></script></body></html>`,
    "utf8"
  );

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on("pageerror", (e) => consoleErrors.push(String(e)));
  await page.goto("file://" + htmlPath);
  await page.waitForTimeout(600);

  const probe = await page.evaluate(() => {
    const box = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { w: r.width, h: r.height, text: el.textContent || "" };
    };
    return {
      siblingBefore: box('[data-testid="sibling-before"]'),
      siblingAfter: box('[data-testid="sibling-after"]'),
      card: box('[data-boundary="risk"]'),
      cardRole: document.querySelector('[data-boundary="risk"]')?.getAttribute("role"),
      buttons: document.querySelectorAll('[data-boundary="risk"] button').length,
      bodyText: document.body.textContent || "",
      events: window.__events,
      alerts: window.__alerts,
    };
  });

  await browser.close();
  await rm(dir, { recursive: true, force: true });
  return { probe, consoleErrors };
};

const { probe, consoleErrors } = await run(ENTRY_TREATMENT);
const { probe: ctrl } = await run(ENTRY_CONTROL);
const ev = probe.events[0];
const alert = probe.alerts.find((a) => a.url.includes("/api/alert"));

console.log("\n── ⑥①-0  CONTROL: the 07.09 shape (ONE boundary for the app) ──");
console.log("   ⚠️ These SHOULD be dead. A green control means the treatment proves nothing.");
ok(
  "C1  the sibling BEFORE the crash is GONE from the DOM",
  !ctrl.siblingBefore,
  ctrl.siblingBefore ? "it survived — the control is not reproducing 07.09" : ""
);
ok("C2  the sibling AFTER  the crash is GONE from the DOM", !ctrl.siblingAfter);
ok(
  "C3  one null field took the WHOLE tree down",
  !ctrl.bodyText.includes("alive:"),
  `body=${JSON.stringify(ctrl.bodyText.slice(0, 60))}`
);
ok("C4  ⛔ no panel-level card exists to tell the user what died", !ctrl.card);

console.log("\n── ⑥①-A  blast radius: do the SIBLINGS survive? ──");
ok("B1  sibling before the crashed panel is in the DOM", !!probe.siblingBefore);
ok("B2  sibling after  the crashed panel is in the DOM", !!probe.siblingAfter);
ok(
  "B3  both siblings are laid out (non-zero box)",
  !!probe.siblingBefore?.h && !!probe.siblingAfter?.h,
  `before=${probe.siblingBefore?.h} after=${probe.siblingAfter?.h}`
);
ok(
  "B4  the throwing panel did NOT take the tree down",
  probe.bodyText.includes("alive: sibling-before") && probe.bodyText.includes("alive: sibling-after")
);

console.log("\n── ⑥①-B  §3.3: the card SHOUTS, it never swallows ──");
ok("B5  error card rendered for the crashed panel", !!probe.card);
ok("B6  card is visible (non-zero box)", !!probe.card?.h, `h=${probe.card?.h}`);
ok("B7  card names the panel in Hebrew", (probe.card?.text || "").includes("לוח הסיכון"));
ok("B8  card states the crash was reported", (probe.card?.text || "").includes("דווח"));
ok("B9  card carries role=alert", probe.cardRole === "alert", `role=${probe.cardRole}`);
ok("B10 card offers exactly one way back", probe.buttons === 1, `buttons=${probe.buttons}`);
ok(
  "B11 ⛔ card leaks neither the message nor a stack",
  !(probe.card?.text || "").includes("toFixed") && !(probe.card?.text || "").includes("at ")
);

console.log("\n── ⑥①-C  Sentry: level=fatal, not routine noise ──");
ok("B12 Sentry produced exactly one event", probe.events.length === 1, `n=${probe.events.length}`);
ok("B13 event level is fatal", ev?.level === "fatal", `level=${ev?.level}`);
ok("B14 event is tagged with the boundary", ev?.tags?.boundary === "risk", `tag=${ev?.tags?.boundary}`);
ok("B15 event carries the boundary context", !!ev?.contexts?.boundary, JSON.stringify(ev?.contexts?.boundary || {}));
ok("B16 context names the panel and the release", ev?.contexts?.boundary?.panel === "risk" && !!ev?.contexts?.boundary?.release);
ok(
  "B17 the real error made it into the event",
  JSON.stringify(ev?.exception || {}).includes("toFixed")
);

console.log("\n── ⑥①-D  the operator side-channel actually fired ──");
ok("B18 a POST reached /api/alert", !!alert, `alerts=${JSON.stringify(probe.alerts.map((a) => a.url))}`);
let body = null;
try { body = JSON.parse(alert?.body || "null"); } catch { /* left null → B19 fails loudly */ }
ok("B19 alert body is JSON", !!body);
ok("B20 alert names the boundary", body?.boundary === "risk", `boundary=${body?.boundary}`);
ok("B21 alert carries a message and a release", !!body?.message && !!body?.release);
ok("B22 ⛔ no webhook URL crossed the client boundary", !JSON.stringify(probe.alerts).includes("discord.com"));

console.log("\n" + "─".repeat(60));
if (consoleErrors.length) {
  console.log(`   note: ${consoleErrors.length} pageerror(s) — React re-throws after catching; expected.`);
  if (failures) consoleErrors.forEach((e) => console.log(`         ${e.split("\n")[0]}`));
}
if (failures) {
  console.log(`❌ boundary-render-probe: ${26 - failures}/26 passed, ${failures} FAILED`);
  process.exit(1);
}
console.log("✅ boundary-render-probe: 26/26 — OBSERVED in real Chromium.");
console.log("   ⚠️  Tailwind is not compiled here ⇒ this measured LAYOUT, ⛔ not");
console.log("   colour, contrast, RTL or a screen reader. Those live in the C- eye check.");
