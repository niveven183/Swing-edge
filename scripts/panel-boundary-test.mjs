#!/usr/bin/env node
// ─── PANEL BOUNDARY CONTRACT TEST (B-304) ──────────────────────────────────
//
// Guards the blast-radius containment added on 09.09: one contained boundary
// per computed panel, every catch reported, every catch visible.
//
// TWO HALVES, AND THEY ARE NOT EQUAL EVIDENCE — the same split as
// test:equitystate:
//
//   V*  VALUE. Runs the REAL bytes of src/components/PanelBoundary.jsx and
//       src/lib/alertChannel.js. The JSX is transformed by esbuild with our own
//       element factory, and the module's dependencies are INJECTED — so the
//       props Sentry would receive are the props this file actually builds.
//       These can fail on behavior.
//
//   S*  SHAPE ONLY. Byte assertions on SwingEdge_App.jsx and src/main.jsx.
//       They prove five DISTINCT boundaries exist and that the root fallback is
//       no longer a bare <p>. ⛔ They do NOT prove React wires any of it up, and
//       ⛔ they do not prove a human sees the card.
//
// ⛔ WHAT THIS FILE CANNOT DO — the limit is declared, not hidden:
//   React itself · a real browser · the card being visible/legible · RTL ·
//   contrast · a screen reader · production. All of that lives in the C- eye
//   check and NOWHERE else — the same boundary as C-036 · C-038 · C-039 · C-041.
//
// ⛔ EXTRACTION FAILURE IS HARD RED AND NEVER A SKIP (B-272). If esbuild is gone
// or an anchor moves, this exits 1. A renamed export must STOP the chain, not
// quietly measure nothing.

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
// Lets the harness be pointed at a checkout of an older tree to confirm it goes
// RED there. Defaults to this repo; never used by `npm run verify`.
const ROOT = process.env.BOUNDARY_TEST_ROOT || REPO;

let pass = 0;
const failures = [];
function ok(id, cond, detail = "") {
  if (cond) {
    pass++;
    console.log(`  ✓ ${id}`);
  } else {
    failures.push(`${id} — ${detail}`);
    console.log(`  ✗ ${id} — ${detail}`);
  }
}
function hardRed(msg) {
  console.error(`\n⛔ HARD RED (extraction/meta): ${msg}`);
  console.error("   This is a failure, not a skip. See B-272.");
  process.exit(1);
}

// ── META ───────────────────────────────────────────────────────────────────
console.log("\n── META (extraction gates — hard red, never skip) ──");

let esbuild;
try {
  esbuild = await import("esbuild");
} catch (err) {
  hardRed(`esbuild is not importable (${err?.message}). The harness cannot run.`);
}
ok("M1", true, "esbuild importable");

const BOUNDARY_PATH = join(ROOT, "src/components/PanelBoundary.jsx");
if (!existsSync(BOUNDARY_PATH)) hardRed(`missing ${BOUNDARY_PATH}`);
const boundarySrc = readFileSync(BOUNDARY_PATH, "utf8");
ok("M2", boundarySrc.length > 0, "PanelBoundary.jsx read");

const defaultExports = boundarySrc.match(/export default function PanelBoundary/g) || [];
if (defaultExports.length !== 1) {
  hardRed(`expected exactly 1 "export default function PanelBoundary", found ${defaultExports.length}`);
}
ok("M3", true, "single default export anchor");

// ── Load the real module with injected dependencies ────────────────────────
const stripped = boundarySrc
  .split("\n")
  .filter((l) => !/^\s*import\s/.test(l))
  .join("\n")
  .replace(/export default function/, "function")
  .replace(/export function/g, "function");

let transformed;
try {
  transformed = esbuild.transformSync(stripped, {
    loader: "jsx",
    jsxFactory: "h",
    jsxFragment: "Frag",
    format: "cjs",
  }).code;
} catch (err) {
  hardRed(`esbuild could not transform PanelBoundary.jsx: ${err?.message}`);
}

// Our own element factory: a plain inspectable tree, no React involved.
const h = (type, props, ...children) => ({ type, props: props || {}, children: children.flat() });
const Frag = Symbol("Frag");
const flatten = (node, acc = []) => {
  if (node == null || node === false) return acc;
  if (typeof node === "string" || typeof node === "number") {
    acc.push(String(node));
    return acc;
  }
  if (Array.isArray(node)) {
    node.forEach((n) => flatten(n, acc));
    return acc;
  }
  acc.push(node);
  (node.children || []).forEach((c) => flatten(c, acc));
  return acc;
};
const textOf = (node) => flatten(node).filter((n) => typeof n === "string").join(" ");
const nodesOf = (node) => flatten(node).filter((n) => typeof n === "object");

const SentryStub = { ErrorBoundary: Symbol("Sentry.ErrorBoundary") };
const Icon = (name) => Symbol(name);

let alertCalls = [];
const reportBoundaryCrashStub = (arg) => {
  alertCalls.push(arg);
  return true;
};
const APP_RELEASE_STUB = "v-test";

globalThis.window = globalThis.window || { location: { pathname: "/app" } };

let mod;
try {
  const factory = new Function(
    "h", "Frag", "Sentry", "AlertTriangle", "RefreshCw",
    "reportBoundaryCrash", "APP_RELEASE",
    `${transformed}
     return { PanelBoundary, enrichBoundaryScope, panelLabel, currentRoute };`
  );
  mod = factory(
    h, Frag, SentryStub, Icon("AlertTriangle"), Icon("RefreshCw"),
    reportBoundaryCrashStub, APP_RELEASE_STUB
  );
} catch (err) {
  hardRed(`could not evaluate PanelBoundary module: ${err?.message}`);
}
for (const nm of ["PanelBoundary", "enrichBoundaryScope", "panelLabel", "currentRoute"]) {
  if (typeof mod[nm] !== "function") hardRed(`export "${nm}" missing or not a function`);
}
ok("M4", true, "all four exports resolved");

// ── VALUE: scope enrichment (①) ────────────────────────────────────────────
console.log("\n── VALUE: Sentry scope enrichment ──");

function makeScope() {
  const s = { level: null, tags: {}, contexts: {} };
  s.setLevel = (l) => { s.level = l; return s; };
  s.setTag = (k, v) => { s.tags[k] = v; return s; };
  s.setContext = (k, v) => { s.contexts[k] = v; return s; };
  return s;
}

const sRisk = makeScope();
mod.enrichBoundaryScope(sRisk, "risk");
ok("V1", sRisk.level === "fatal", `level=${sRisk.level} (expected "fatal")`);
ok("V2", sRisk.tags.boundary === "risk", `tags.boundary=${sRisk.tags.boundary}`);
ok("V3", !!sRisk.contexts.boundary, "contexts.boundary set");
ok("V4", sRisk.contexts.boundary?.panel === "risk", "context carries panel name");
ok("V5", sRisk.contexts.boundary?.release === APP_RELEASE_STUB, "context carries release");
ok("V6", sRisk.contexts.boundary?.route === "/app", `context carries route (${sRisk.contexts.boundary?.route})`);

const sRoot = makeScope();
mod.enrichBoundaryScope(sRoot, "root");
ok("V7", sRoot.level === "fatal" && sRoot.tags.boundary === "root", "root boundary enriched identically");

// ── VALUE: element wiring ──────────────────────────────────────────────────
console.log("\n── VALUE: boundary element wiring ──");

const CHILD = h("div", { id: "child" });
const el = mod.PanelBoundary({ name: "risk", children: CHILD });
ok("V8", el && el.type === SentryStub.ErrorBoundary, "renders Sentry.ErrorBoundary");
ok("V9", typeof el.props.beforeCapture === "function", "beforeCapture wired");
ok("V10", typeof el.props.onError === "function", "onError wired");
ok("V11", typeof el.props.fallback === "function", "fallback wired");
ok("V12", flatten(el).includes(CHILD), "children passed through");

const sWired = makeScope();
el.props.beforeCapture(sWired);
ok("V13", sWired.level === "fatal" && sWired.tags.boundary === "risk",
   "wired beforeCapture enriches with this panel's name");

alertCalls = [];
const boom = new Error("t.riskPct is null");
el.props.onError(boom);
ok("V14", alertCalls.length === 1, `onError fired the alert channel (${alertCalls.length} calls)`);
ok("V15", alertCalls[0]?.boundary === "risk", "alert carries the boundary name");
ok("V16", alertCalls[0]?.error === boom, "alert carries the error");

// ── VALUE: the card — §3.3 "shout, never swallow" ──────────────────────────
console.log("\n── VALUE: error card (§3.3 — ⛔ no silent null) ──");

let resetCalled = 0;
const card = el.props.fallback({ resetError: () => resetCalled++, error: boom });
ok("V17", card != null, "fallback returns a node, ⛔ not null");
const cardText = textOf(card);
ok("V18", cardText.includes("לוח הסיכון"), `card names the panel (got: ${cardText.slice(0, 60)})`);
ok("V19", /דווח/.test(cardText), "card states the failure was reported");
ok("V20", card.props?.role === "alert", `role=alert (got ${card.props?.role})`);

const buttons = nodesOf(card).filter((n) => n.type === "button");
ok("V21", buttons.length === 1, `exactly one action button (${buttons.length})`);
if (buttons[0]?.props?.onClick) buttons[0].props.onClick();
ok("V22", resetCalled === 1, "button is wired to resetError");

// The card is user-facing: a stack is meaningless to a trader and is a
// disclosure risk. It must name the panel, not the exception.
ok("V23", !cardText.includes("riskPct"), "card does ⛔ NOT leak the error message");
ok("V24", !/stack/i.test(JSON.stringify(card)), "card does ⛔ NOT render a stack");

// ⛔ No name may produce a silent null — that is the R-4-in-costume branch.
const ALL_NAMES = ["root", "risk", "journal", "mentoring", "analytics", "watchlist", "unknown-future-panel"];
const nullNames = ALL_NAMES.filter((n) => {
  const e = mod.PanelBoundary({ name: n, children: CHILD });
  const c = e.props.fallback({ resetError: () => {} });
  return c == null || textOf(c).trim() === "";
});
ok("V25", nullNames.length === 0, `⛔ names rendering empty: ${nullNames.join(", ")}`);

// ── VALUE: alert channel ───────────────────────────────────────────────────
console.log("\n── VALUE: alert channel (client → /api/alert) ──");

const chan = await import(join(ROOT, "src/lib/alertChannel.js"));
const posts = [];
globalThis.fetch = (url, opts) => {
  posts.push({ url, opts });
  return Promise.resolve({ ok: true, status: 200 });
};
chan.resetAlertDedupe();

chan.reportBoundaryCrash({ error: new Error("boom-A"), boundary: "risk", route: "/app" });
ok("V26", posts.length === 1, `POSTed once (${posts.length})`);
ok("V27", posts[0]?.url === "/api/alert", `to /api/alert (got ${posts[0]?.url})`);
const sent = JSON.parse(posts[0]?.opts?.body || "{}");
ok("V28", sent.message.includes("boom-A") && sent.boundary === "risk" && !!sent.release,
   "body carries message + boundary + release");
ok("V29", !JSON.stringify(chan).includes("discord.com"),
   "⛔ no webhook URL anywhere in the client module (B-310)");

chan.reportBoundaryCrash({ error: new Error("boom-A"), boundary: "risk", route: "/app" });
ok("V30", posts.length === 1, `identical crash deduped (${posts.length} posts)`);
chan.reportBoundaryCrash({ error: new Error("boom-A"), boundary: "journal", route: "/app" });
ok("V31", posts.length === 2, "different panel is NOT deduped");

globalThis.fetch = () => Promise.reject(new Error("network down"));
let threw = false;
try {
  chan.reportBoundaryCrash({ error: new Error("boom-C"), boundary: "analytics", route: "/app" });
} catch { threw = true; }
ok("V32", !threw, "⛔ a dead alert channel never throws into the boundary");
// The rejection is handled in a .catch, so its named log lands a tick later.
// Flush it here — otherwise it prints AFTER the pass/fail banner and reads
// like a failure in a run that succeeded.
await new Promise((r) => setTimeout(r, 0));

// ── SHAPE: SwingEdge_App.jsx — five DISTINCT boundaries ────────────────────
console.log("\n── SHAPE ONLY: panel wiring (⛔ proves bytes, ⛔ not rendering) ──");

const appSrc = readFileSync(join(ROOT, "SwingEdge_App.jsx"), "utf8");
const EXPECTED = ["risk", "journal", "mentoring", "analytics", "watchlist"];

const importHits = appSrc.match(/import\s+PanelBoundary\s+from/g) || [];
ok("S1", importHits.length === 1, `PanelBoundary imported once (${importHits.length})`);

const openTags = [...appSrc.matchAll(/<PanelBoundary\s+name="([a-z]+)"\s*>/g)].map((m) => m[1]);
ok("S2", openTags.length === 5, `exactly 5 boundaries (${openTags.length})`);
ok("S3", EXPECTED.every((n) => openTags.includes(n)),
   `covers ${EXPECTED.join(", ")} — got ${openTags.join(", ")}`);
ok("S4", new Set(openTags).size === openTags.length,
   "⛔ no two panels share a boundary — this is what keeps siblings alive");

const closeTags = appSrc.match(/<\/PanelBoundary>/g) || [];
ok("S5", closeTags.length === 5, `5 closing tags (${closeTags.length})`);
ok("S6", /RISK DASHBOARD[\s\S]{0,80}<PanelBoundary name="risk">/.test(appSrc),
   "risk boundary sits at the RISK DASHBOARD anchor");
ok("S7", /<PanelBoundary name="watchlist">[\s\S]{0,300}height: 440/.test(appSrc),
   "watchlist boundary wraps the watchlist panel");

// ── SHAPE: main.jsx — root net is branded and enriched ─────────────────────
const mainSrc = readFileSync(join(ROOT, "src/main.jsx"), "utf8");
ok("S8", !/fallback=\{<p>משהו השתבש\. רענן את הדף\.<\/p>\}/.test(mainSrc),
   "⛔ the bare <p> root fallback is gone (§3.2)");
ok("S9", /<RootFallback\s*\/>/.test(mainSrc), "root fallback is the branded screen");
ok("S10", /^function RootFallback\(/m.test(mainSrc),
   "RootFallback is at module scope (CLAUDE.md §13 anti-flicker)");
ok("S11", /beforeCapture=\{\(scope\)\s*=>\s*enrichBoundaryScope\(scope,\s*"root"\)\}/.test(mainSrc),
   "root boundary enriches scope (level fatal + tag)");
ok("S12", /onError=\{[\s\S]{0,160}reportBoundaryCrash/.test(mainSrc),
   "root boundary fires the alert channel");
ok("S13", /window\.location\.reload\(\)/.test(mainSrc), "root fallback offers a way back");

// ── Result ─────────────────────────────────────────────────────────────────
const total = pass + failures.length;
console.log(`\n${"─".repeat(60)}`);
if (failures.length) {
  console.log(`❌ panel-boundary: ${pass}/${total} passed, ${failures.length} FAILED\n`);
  failures.forEach((f) => console.log(`   ✗ ${f}`));
  process.exit(1);
}
console.log(`✅ panel-boundary: ${pass}/${total} assertions passed`);
console.log("   ⚠️  V* = value (real bytes) · S* = shape only.");
console.log("   ⛔ React, the browser, and the card being VISIBLE live in the C- eye check.");
