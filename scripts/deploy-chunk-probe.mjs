// ─── ⑥① THE FIRING OBSERVATION (B-320) ─────────────────────────────────────
//
//   node scripts/deploy-chunk-probe.mjs        (needs a fresh `npm run build`)
//
// ⛔ NOT in the verify chain — it needs a real browser, like `test:smoke` and
// `probe:boundary`.
//
// WHY IT EXISTS: `B-164` shipped a one-shot boot recovery in index.html and it
// was never once observed firing. It could not fire. Vite re-emits the entry
// <script> with a hashed `src` and drops the `id` the guard anchors on, so the
// guard reached `if (!el) return;` on every production page load for its entire
// life. Reading the source proved the guard existed; only running the built
// bytes in a browser proved it was dead (B-320).
//
// The failure it guards: Vercel prunes the assets of a superseded deploy, so a
// tab that fetched index.html seconds before a deploy asks for a chunk name
// that no longer exists. The chunk 404s, the module never executes, React never
// mounts — and no React ErrorBoundary can see it, because nothing mounted.
//
// WHAT IS SERVED: the real `dist/`, with one statically preloaded vendor chunk
// forced to 404. The chunk is derived from the modulepreload links, not
// hardcoded, so renaming a vendor chunk cannot silently empty this probe.
//
// ⚠️ THE CONTROL ARM (C1–C2) MUST STAY "DEAD". It serves the same dist with the
// `id` stripped back off — i.e. the shape that shipped before this fix — and
// measures that the user IS stranded. ⛔ A GREEN CONTROL MEANS THE TREATMENT
// PROVES NOTHING: it would show the recovery came from somewhere else.
//
// ⚠️ THE HEALTHY ARM (H1–H2) IS WHY A1 IS NOT TAUTOLOGICAL. "reloaded OR showed
// a message" also passes for a guard that reloads on every single page load, so
// a clean load is measured separately and must do neither.
//
// ⛔ WHAT THIS STILL DOES NOT COVER: colour, contrast, RTL and a screen reader
// on the failure message — same boundary as C-036 · C-038 · C-039 · C-041 ·
// C-043. Those live in the C- eye check and nowhere else.

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DIST = join(ROOT, "dist");
const ANCHOR = "se-main-script";
const RETRY_KEY = "swingedge-boot-retry";

const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
};

let failures = 0;
const ok = (name, cond, detail = "") => {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    failures++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
};
const die = (msg) => {
  console.log(`\n❌ deploy-chunk-probe: ${msg}`);
  process.exit(1);
};

// ── meta: the probe must not be able to pass by measuring nothing ───────────
console.log("\n── META ───────────────────────────────────────────────────");

let indexHtml;
try {
  indexHtml = await readFile(join(DIST, "index.html"), "utf-8");
} catch {
  die("dist/index.html not found — run `npm run build` first.");
}

const entryTags = (indexHtml.match(/<script\b[^>]*><\/script>/g) || []).filter(
  (t) => /\btype="module"/.test(t) && /\bsrc="/.test(t)
);
if (entryTags.length !== 1) {
  die(`expected exactly 1 module entry <script> in dist/index.html, found ${entryTags.length}.`);
}
ok("M1 dist/index.html has exactly 1 module entry <script>", true);

ok(
  `M2 the entry <script> carries id="${ANCHOR}"`,
  entryTags[0].includes(`id="${ANCHOR}"`),
  `tag=${entryTags[0]}`
);

const preloads = [...indexHtml.matchAll(/<link\s+rel="modulepreload"[^>]*href="([^"]+)"/g)].map(
  (m) => m[1]
);
if (preloads.length === 0) {
  die("no modulepreload links in dist/index.html — nothing statically preloaded to prune.");
}
const VICTIM = preloads[0];
ok(`M3 found ${preloads.length} statically preloaded chunk(s); pruning ${VICTIM}`, true);

// ── the server: real dist, one chunk pruned, optional id strip ───────────────
function serve({ prune, stripAnchor }) {
  const requests = [];
  let pruned = 0;
  const server = createServer(async (req, res) => {
    const url = req.url.split("?")[0];
    requests.push(url);
    if (prune && url === VICTIM) {
      pruned++;
      res.writeHead(404, { "content-type": "text/plain" });
      return res.end("Not Found");
    }
    try {
      const rel = url === "/" ? "index.html" : url.replace(/^\//, "");
      let buf = await readFile(join(DIST, rel));
      if (rel === "index.html" && stripAnchor) {
        buf = Buffer.from(String(buf).replace(` id="${ANCHOR}"`, ""), "utf-8");
      }
      res.writeHead(200, {
        "content-type": TYPES[extname(rel)] || "application/octet-stream",
      });
      res.end(buf);
    } catch {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("Not Found");
    }
  });
  return { server, requests, prunedCount: () => pruned };
}

async function run({ prune, stripAnchor }) {
  const { server, requests, prunedCount } = serve({ prune, stripAnchor });
  await new Promise((r) => server.listen(0, r));
  const { port } = server.address();

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`http://localhost:${port}/`, { waitUntil: "load" });
  await page.waitForTimeout(4000);

  const state = await page.evaluate(
    ({ anchor, retryKey }) => {
      const root = document.getElementById("root");
      return {
        anchorPresent: document.getElementById(anchor) !== null,
        visibleText: (root?.innerText || "").replace(/\s+/g, " ").trim().slice(0, 200),
        rootChildren: [...(root?.children || [])].map((c) => c.id || c.tagName).join(","),
        retryFlag: (() => {
          try {
            return sessionStorage.getItem(retryKey);
          } catch {
            return "n/a";
          }
        })(),
      };
    },
    { anchor: ANCHOR, retryKey: RETRY_KEY }
  );

  await browser.close();
  server.close();

  const htmlRequests = requests.filter((u) => u === "/").length;
  return {
    ...state,
    htmlRequests,
    pruned: prunedCount(),
    reloaded: htmlRequests > 1,
    showsMessage: /רענן|Refresh|נכשלה|Failed to load/.test(state.visibleText),
    mounted: !/^se-boot$/.test(state.rootChildren) && state.rootChildren !== "",
  };
}

const show = (label, r) => {
  console.log(`    ${label}: html=${r.htmlRequests} 404s=${r.pruned} anchor=${r.anchorPresent} ` +
    `retry=${r.retryFlag} root=[${r.rootChildren}]`);
  console.log(`    text: ${JSON.stringify(r.visibleText)}`);
};

// ── H: a healthy load must not trip the guard ────────────────────────────────
console.log("\n── HEALTHY LOAD (guard must stay silent) ──────────────────");
const healthy = await run({ prune: false, stripAnchor: false });
show("healthy", healthy);
ok("H1 a clean load does not reload", healthy.htmlRequests === 1, `html requests=${healthy.htmlRequests}`);
ok("H2 a clean load shows no failure message", !healthy.showsMessage, healthy.visibleText);

// ── A: the treatment — pruned chunk, guard wired ─────────────────────────────
console.log("\n── TREATMENT (pruned chunk, guard wired) ──────────────────");
const treated = await run({ prune: true, stripAnchor: false });
show("treated", treated);
ok("A1 the guard anchor resolves in the built HTML", treated.anchorPresent);
ok("A2 a pruned chunk does not strand the user", treated.reloaded || treated.showsMessage);
ok("A3 recovery is one-shot — exactly one reload, ⛔ not a loop", treated.htmlRequests === 2,
  `html requests=${treated.htmlRequests}`);
ok("A4 the second failure shows a visible, actionable message", treated.showsMessage, treated.visibleText);
ok("A5 the one-shot flag is persisted", treated.retryFlag === "1", `flag=${treated.retryFlag}`);

// ── C: the control — same dist, anchor stripped. MUST stay dead ──────────────
console.log("\n── CONTROL (anchor stripped = the shape that shipped) ─────");
const control = await run({ prune: true, stripAnchor: true });
show("control", control);
ok("C1 control: the anchor is absent", !control.anchorPresent);
ok("C2 control: the user IS stranded — ⛔ a green control voids the treatment",
  !control.reloaded && !control.showsMessage,
  `reloaded=${control.reloaded} message=${control.showsMessage}`);

console.log("\n" + "─".repeat(60));
const TOTAL = 12;
if (failures) {
  console.log(`❌ deploy-chunk-probe: ${TOTAL - failures}/${TOTAL} passed, ${failures} FAILED`);
  process.exit(1);
}
console.log(`✅ deploy-chunk-probe: ${TOTAL}/${TOTAL} — OBSERVED in real Chromium.`);
console.log("   ⚠️  The control arm stayed dead ⇒ the recovery came from the anchor,");
console.log("   ⛔ not from somewhere else. Colour · contrast · RTL · screen reader");
console.log("   are ⛔ measured here — they live in the C- eye check.");
