#!/usr/bin/env node
// scripts/tour-contract-test.mjs — the onboarding tour's contract harness.
//
// WHY THIS FILE EXISTS
// `src/components/OnboardingTour.jsx` carried ZERO coverage (measured). Four
// defects were fixed in it and in its two call sites in the same wave, and four
// fixes in an unguarded file is a bet, not engineering. B-351 in particular was a
// DUPLICATE ANCHOR — `data-tour="add-trade"` sat on two elements and
// document.querySelector silently took the one that disappears the moment a trade
// exists. No build error, no test, no alert. The `A*` family below is the gate
// that would have caught it.
//
// HOW IT RUNS THE REAL BYTES, ⛔ A PATTERN
// `SwingEdge_App.jsx` cannot be imported into Node (61 module imports, JSX), and
// `OnboardingTour.jsx` is a React component whose hooks need a renderer. So this
// harness uses the same extract-by-anchor technique `test:hydration` established
// (B-272): it locates a block by a literal anchor, balances its brackets, and runs
// the ACTUAL SOURCE in `new Function` with dependencies injected. The `A*` family
// instead transforms each file with esbuild (which strips comments and normalizes
// JSX attributes) and counts mount sites in the OUTPUT — so a `data-tour="…"`
// written inside a prose comment cannot be miscounted as a real element.
//
// ⛔ EXTRACTION FAILURE IS HARD RED, ⛔ NEVER A SKIP (B-272). A rename or a
// reformat of any anchored block STOPS THE CHAIN. That is the point: a harness
// that silently skips when it can no longer find its target reports green on code
// it never read. The `M*` family enforces it.
//
// WHAT IT DOES NOT COVER: React, the DOM, the browser, RTL rendering, contrast,
// whether the spotlight visually lands on the element. Same boundary as
// C-036 · C-038 · C-039 · C-041 · C-043 · C-049 · C-050 — the screen lives in
// CHECKS alone.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP = path.join(ROOT, "SwingEdge_App.jsx");
const TOUR = path.join(ROOT, "src", "components", "OnboardingTour.jsx");

let pass = 0;
let fail = 0;
const failures = [];

function ok(id, label, cond, detail = "") {
  if (cond) {
    pass++;
    console.log(`  ✓ ${id}  ${label}`);
  } else {
    fail++;
    failures.push(`${id}  ${label}${detail ? ` — ${detail}` : ""}`);
    console.log(`  ✗ ${id}  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

// A meta-gate failure is not a failed assertion, it is a harness that cannot see
// its subject. It aborts immediately rather than letting the families below report
// green on nothing.
function hardFail(id, msg) {
  fail++;
  failures.push(`${id}  ${msg}`);
  console.log(`  ✗ ${id}  ${msg}`);
  console.log(
    "\n⛔ EXTRACTION FAILED — the harness lost its anchor. This is a HARD RED (B-272),\n" +
      "   ⛔ not a skip. Either the block moved/was renamed (update the anchor in the\n" +
      "   same commit) or it was deleted (then say so out loud).\n"
  );
  process.exit(1);
}

// ── extraction ─────────────────────────────────────────────────────────────
// Count literal occurrences; the caller demands exactly 1 before slicing.
function countOf(src, anchor) {
  let n = 0;
  let from = 0;
  for (;;) {
    const at = src.indexOf(anchor, from);
    if (at === -1) return n;
    n++;
    from = at + anchor.length;
  }
}

// Slice from `anchor` through the character that closes the first `open` bracket
// encountered, honouring strings/templates/comments so a brace inside a string
// cannot end the block early.
function sliceBalanced(src, anchor, open, close) {
  const start = src.indexOf(anchor);
  if (start === -1) return null;
  let depth = 0;
  let seen = false;
  let i = start;
  let mode = null; // "'" | '"' | "`" | "//" | "/*"
  while (i < src.length) {
    const c = src[i];
    const c2 = src[i + 1];
    if (mode === "//") {
      if (c === "\n") mode = null;
    } else if (mode === "/*") {
      if (c === "*" && c2 === "/") { mode = null; i++; }
    } else if (mode) {
      if (c === "\\") i++;
      else if (c === mode) mode = null;
    } else if (c === "/" && c2 === "/") { mode = "//"; i++; }
    else if (c === "/" && c2 === "*") { mode = "/*"; i++; }
    else if (c === "'" || c === '"' || c === "`") mode = c;
    else if (c === open) { depth++; seen = true; }
    else if (c === close) {
      depth--;
      if (seen && depth === 0) return { start, end: i + 1, text: src.slice(start, i + 1) };
    }
    i++;
  }
  return null;
}

// Everything the extracted App-scope code references but does not define. A Proxy
// that claims to have every name lets `with` resolve icon identifiers and i18n
// keys without this file hand-listing them — a hand-list is B-324's class.
function stubScope(getter) {
  return new Proxy(
    {},
    {
      has: () => true,
      get: (_t, k) => (k === Symbol.unscopables ? undefined : getter(String(k))),
    }
  );
}

const appSrc = fs.readFileSync(APP, "utf8");
const tourSrc = fs.readFileSync(TOUR, "utf8");

console.log("\n══ tour contract ══════════════════════════════════════════════\n");

// ── M* · meta-gates ────────────────────────────────────────────────────────
console.log("M* · meta (extraction)");

const ANCHORS = [
  ["M1", APP, appSrc, "\nconst NAV_KEYS = ["],
  ["M2", APP, appSrc, "\nconst TOUR_NAV_IDS = NAV_KEYS.map("],
  ["M3", APP, appSrc, "\nconst buildTourSteps = (t) => {"],
  ["M4", APP, appSrc, "const completeTour = useCallback((done) => {"],
  ["M5", TOUR, tourSrc, "    if (stepTab) {"],
  ["M6", TOUR, tourSrc, "  const fwdKey = isRTL ?"],
  ["M7", APP, appSrc, '"data-tour": anchor'], // checked after transform, see A*
];

for (const [id, file, src, anchor] of ANCHORS.slice(0, 6)) {
  const n = countOf(src, anchor);
  if (n !== 1) hardFail(id, `anchor \`${anchor.trim()}\` matched ${n}× in ${path.basename(file)} (expected exactly 1)`);
  ok(id, `anchor \`${anchor.trim().slice(0, 42)}…\` × 1 in ${path.basename(file)}`, true);
}

const navKeysBlock = sliceBalanced(appSrc, "const NAV_KEYS = [", "[", "]");
if (!navKeysBlock) hardFail("M8", "NAV_KEYS brackets did not balance");
const tourIdsLine = appSrc.slice(appSrc.indexOf("const TOUR_NAV_IDS =")).split("\n")[0];
const stepsBlock = sliceBalanced(appSrc, "const buildTourSteps = (t) => {", "{", "}");
if (!stepsBlock) hardFail("M9", "buildTourSteps braces did not balance");
const completeBlock = sliceBalanced(appSrc, "const completeTour = useCallback((done) => {", "(", ")");
if (!completeBlock) hardFail("M10", "completeTour parens did not balance");
const navGuardBlock = sliceBalanced(tourSrc, "    if (stepTab) {", "{", "}");
if (!navGuardBlock) hardFail("M11", "the stepTab guard braces did not balance");
ok("M8", "NAV_KEYS brackets balance", true);
ok("M9", "buildTourSteps braces balance", true);
ok("M10", "completeTour parens balance", true);
ok("M11", "stepTab-guard braces balance", true);

// The arrow-key block runs from the derived keys through the listener's dep array.
const KEY_TAIL = "}, [fwdKey, backKey]);";
const keyStart = tourSrc.indexOf("  const fwdKey = isRTL ?");
const keyEnd = tourSrc.indexOf(KEY_TAIL, keyStart);
if (keyEnd === -1) hardFail("M12", `the arrow-key listener does not end in \`${KEY_TAIL}\` — the dep array is the fix (B-352)`);
const keyBlock = tourSrc.slice(keyStart, keyEnd + KEY_TAIL.length);
ok("M12", `arrow-key block ends in \`${KEY_TAIL}\``, true);

// ── V* · buildTourSteps shape ──────────────────────────────────────────────
console.log("\nV* · tour steps");

let NAV_IDS;
let TOUR_IDS;
try {
  const f = new Function(
    "__scope",
    `with (__scope) {\n${navKeysBlock.text};\n${tourIdsLine}\nreturn { NAV_KEYS, TOUR_NAV_IDS };\n}`
  );
  const r = f(stubScope((k) => ({ __stub: k })));
  NAV_IDS = r.NAV_KEYS.map((n) => n.id);
  TOUR_IDS = r.TOUR_NAV_IDS;
} catch (e) {
  hardFail("M13", `NAV_KEYS / TOUR_NAV_IDS did not evaluate: ${e.message}`);
}

let steps;
try {
  const f = new Function("enT", `${stepsBlock.text};\nreturn buildTourSteps;`);
  steps = f(stubScope((k) => k))({});
} catch (e) {
  hardFail("M14", `buildTourSteps did not evaluate: ${e.message}`);
}

ok("V1", "buildTourSteps returns 14 steps", steps.length === 14, `got ${steps.length}`);
ok(
  "V2",
  "TOUR_NAV_IDS is derived from NAV_KEYS (same ids, same order)",
  JSON.stringify(TOUR_IDS) === JSON.stringify(NAV_IDS),
  `TOUR_NAV_IDS=${JSON.stringify(TOUR_IDS)} NAV_KEYS=${JSON.stringify(NAV_IDS)}`
);
ok("V3", "TOUR_NAV_IDS is non-empty", Array.isArray(TOUR_IDS) && TOUR_IDS.length > 0);

const strayTabs = steps
  .map((s, i) => ({ i: i + 1, tab: s.tab }))
  .filter((s) => s.tab && !NAV_IDS.includes(s.tab));
ok(
  "V4",
  "every step.tab is a member of NAV_KEYS",
  strayTabs.length === 0,
  strayTabs.map((s) => `step ${s.i} → "${s.tab}"`).join(", ")
);

const blank = steps.filter((s, i) => !s.title || !s.body).map((_s, i) => i + 1);
ok("V5", "no step renders a blank title or body", blank.length === 0, `steps ${blank.join(", ")}`);

// ── A* · anchor uniqueness — the gate that would have caught B-351 ─────────
console.log("\nA* · anchors (one selector → exactly one element)");

function collectFiles(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) collectFiles(p, out);
    else if (/\.(jsx|js)$/.test(e.name)) out.push(p);
  }
  return out;
}

const scanFiles = [APP, ...collectFiles(path.join(ROOT, "src"))];
const transformed = new Map();
for (const f of scanFiles) {
  try {
    transformed.set(
      f,
      esbuild.transformSync(fs.readFileSync(f, "utf8"), { loader: "jsx", format: "esm" }).code
    );
  } catch (e) {
    hardFail("M15", `esbuild could not transform ${path.relative(ROOT, f)}: ${e.message}`);
  }
}

// After transform a literal attribute is `"data-tour": "x"` and a forwarded one is
// `"data-tour": <identifier>`. Exactly ONE forwarding site may exist — StatCard —
// because that is what makes counting the `anchor="x"` prop form sound. A second
// one would mean a prop this harness does not know about also mounts anchors.
let forwardSites = 0;
for (const [, code] of transformed) forwardSites += countOf(code, '"data-tour": anchor');
if (forwardSites !== 1)
  hardFail(
    "M7",
    `\`data-tour={anchor}\` forwarding sites = ${forwardSites} (expected exactly 1). ` +
      "A new forwarding component means the prop-form scan below is blind to it."
  );
ok("M7", "exactly one `data-tour={anchor}` forwarding site (StatCard)", true);

const anchored = steps
  .map((s, i) => ({ i: i + 1, sel: s.anchor }))
  .filter((s) => s.sel);

ok("A0", "at least one step is anchored", anchored.length > 0);

for (const { i, sel } of anchored) {
  const m = /^\[data-tour="([^"]+)"\]$/.exec(sel);
  if (!m) {
    ok(`A${i}`, `step ${i} anchor is a [data-tour="…"] selector`, false, `got \`${sel}\``);
    continue;
  }
  const id = m[1];
  const sites = [];
  for (const [f, code] of transformed) {
    const direct = countOf(code, `"data-tour": "${id}"`);
    const viaProp = countOf(code, `anchor: "${id}"`);
    for (let k = 0; k < direct + viaProp; k++) sites.push(path.relative(ROOT, f));
  }
  ok(
    `A${i}`,
    `\`${sel}\` mounts on exactly 1 element`,
    sites.length === 1,
    sites.length === 0 ? "mounts on NOTHING — the step falls back to a centered bubble" : `mounts ${sites.length}×: ${sites.join(", ")}`
  );
}

// ── N* · onNavigate validation (B-353) ─────────────────────────────────────
console.log("\nN* · navigation validation");

// ⚠️ The guard is wrapped because a THROW must fail an assertion, ⛔ kill the run.
// The first pass of this harness let it propagate: the control arm that replaced
// `Array.isArray(navKeys) && navKeys.length > 0` with `true` crashed the process
// on `undefined.includes`, so the run exited non-zero with ZERO ✗ lines — a red
// exit code for the wrong reason, which is CA-4 in its purest form. `threw` is now
// a first-class result and every N assertion below is conditioned on it.
function runNavGuard({ stepTab, navKeys }) {
  const calls = [];
  const errors = [];
  let threw = null;
  try {
    const f = new Function(
      "stepTab",
      "navKeys",
      "onNavigate",
      "console",
      "i",
      "total",
      navGuardBlock.text
    );
    f(stepTab, navKeys, (v) => calls.push(v), { error: (m) => errors.push(String(m)) }, 5, 14);
  } catch (e) {
    threw = e.message;
  }
  return { calls, errors, threw };
}

const nBad = runNavGuard({ stepTab: "ghostTab", navKeys: TOUR_IDS });
ok(
  "N1",
  "an unknown tab does NOT reach onNavigate",
  nBad.threw === null && nBad.calls.length === 0,
  nBad.threw ? `threw: ${nBad.threw}` : `called with ${JSON.stringify(nBad.calls)}`
);
ok("N2", "an unknown tab logs console.error", nBad.errors.length === 1, `${nBad.errors.length} error(s)`);
ok(
  "N3",
  "the error names the offending id",
  nBad.errors.some((e) => e.includes("ghostTab")),
  nBad.errors.join(" | ")
);
// Injected i=5, total=14 → the message must read the 1-based "6/14". An index-only
// message ("step 5") would point the reader at the wrong step.
ok(
  "N4",
  "the error names the step, 1-based (6/14)",
  nBad.errors.some((e) => /\b6\s*\/\s*14\b/.test(e)),
  nBad.errors.join(" | ")
);

const nGood = runNavGuard({ stepTab: NAV_IDS[1], navKeys: TOUR_IDS });
ok(
  "N5",
  `a valid tab ("${NAV_IDS[1]}") DOES reach onNavigate`,
  nGood.threw === null && nGood.calls.length === 1 && nGood.calls[0] === NAV_IDS[1],
  nGood.threw ? `threw: ${nGood.threw}` : JSON.stringify(nGood.calls)
);
ok("N6", "a valid tab logs nothing", nGood.errors.length === 0, nGood.errors.join(" | "));

// ⛔ no `|| "dashboard"`: a rejected tab must produce NO navigation at all. A
// guessed destination is R-2 — the loud admission is the answer.
ok(
  "N7",
  "a rejected tab is not silently replaced by a fallback tab",
  nBad.calls.length === 0 && !/\|\|\s*["']dashboard["']/.test(navGuardBlock.text)
);

// Back-compat is a DECLARED choice, so it is asserted, not assumed.
const nNoKeys = runNavGuard({ stepTab: "ghostTab", navKeys: undefined });
ok(
  "N8",
  "absent navKeys disables validation (back-compat) without throwing",
  nNoKeys.threw === null && nNoKeys.calls.length === 1 && nNoKeys.errors.length === 0,
  nNoKeys.threw ? `threw: ${nNoKeys.threw}` : JSON.stringify(nNoKeys.calls)
);
const nEmpty = runNavGuard({ stepTab: "ghostTab", navKeys: [] });
ok(
  "N9",
  "empty navKeys disables validation (back-compat) without throwing",
  nEmpty.threw === null && nEmpty.calls.length === 1 && nEmpty.errors.length === 0,
  nEmpty.threw ? `threw: ${nEmpty.threw}` : JSON.stringify(nEmpty.calls)
);

// A tour step runs inside useLayoutEffect during render. A guard that throws there
// takes the whole app down, so "never throws" is the contract, ⛔ an implementation
// detail — measured across every shape a caller can realistically pass.
const shapes = [undefined, null, [], TOUR_IDS, ["dashboard"], "dashboard", {}];
const threwOn = shapes
  .map((k) => ({ k, r: runNavGuard({ stepTab: "ghostTab", navKeys: k }) }))
  .filter((x) => x.r.threw);
ok(
  "N11",
  "the guard never throws, whatever navKeys is",
  threwOn.length === 0,
  threwOn.map((x) => `${JSON.stringify(x.k)} → ${x.r.threw}`).join(" | ")
);

// And the wiring: the app must actually hand the component the derived list.
ok(
  "N10",
  "SwingEdge_App renders <OnboardingTour navKeys={TOUR_NAV_IDS}>",
  countOf(appSrc, "navKeys={TOUR_NAV_IDS}") === 1
);

// ── K* · arrow keys follow isRTL (B-352) ───────────────────────────────────
console.log("\nK* · arrow-key direction");

function runKeys(isRTL) {
  let onKey = null;
  const win = {
    addEventListener: (ev, h) => {
      if (ev === "keydown") onKey = h;
    },
    removeEventListener: () => {},
  };
  const hits = [];
  const navRef = { current: { next: () => hits.push("next"), back: () => hits.push("back") } };
  let deps = null;
  const useEffect = (fn, d) => {
    deps = d;
    fn();
  };
  const f = new Function("isRTL", "navRef", "useEffect", "window", `${keyBlock}\nreturn { fwdKey, backKey };`);
  const r = f(isRTL, navRef, useEffect, win);
  const press = (key) => {
    hits.length = 0;
    onKey?.({ key, preventDefault: () => {} });
    return hits[0] ?? null;
  };
  return { ...r, deps, press };
}

const ltr = runKeys(false);
const rtl = runKeys(true);

ok("K1", "LTR: ArrowRight → next", ltr.press("ArrowRight") === "next", `got ${ltr.press("ArrowRight")}`);
ok("K2", "LTR: ArrowLeft → back", ltr.press("ArrowLeft") === "back", `got ${ltr.press("ArrowLeft")}`);
ok("K3", "RTL: ArrowLeft → next", rtl.press("ArrowLeft") === "next", `got ${rtl.press("ArrowLeft")}`);
ok("K4", "RTL: ArrowRight → back", rtl.press("ArrowRight") === "back", `got ${rtl.press("ArrowRight")}`);
ok("K5", "the mapping actually differs between the two directions", ltr.fwdKey !== rtl.fwdKey, `${ltr.fwdKey} vs ${rtl.fwdKey}`);
ok("K6", "forward and back are never the same key", ltr.fwdKey !== ltr.backKey && rtl.fwdKey !== rtl.backKey);
// The `[]` dep array is precisely what made the listener blind to isRTL.
ok("K7", "the listener's dep array is not empty", Array.isArray(ltr.deps) && ltr.deps.length > 0, JSON.stringify(ltr.deps));
ok(
  "K8",
  "the dep array carries the derived keys (so a language flip re-binds)",
  Array.isArray(ltr.deps) && ltr.deps.includes(ltr.fwdKey) && ltr.deps.includes(ltr.backKey),
  JSON.stringify(ltr.deps)
);
ok("K9", "an unrelated key does nothing", ltr.press("Enter") === null);
// ⛔ the navRef stays — it is what stops the listener re-trapping on every step.
ok("K10", "the navRef indirection survives (⛔ handlers in the dep array)", /navRef\.current\.(next|back)\(\)/.test(keyBlock));

// ── P* · tourDone reaches the DB (B-350) ───────────────────────────────────
console.log("\nP* · tour completion persists");

// ⚠️ `hydrated` (22.09, B-361) is a REAL parameter of the block now, ⛔ scaffolding:
// completeTour gained a `hydratedRef.current &&` gate because an account switch in
// the same tab let it upsert `{tourDone:true}` into an un-hydrated user's row with an
// empty merge base ⇒ the whole blob was replaced. P1–P7 describe a HYDRATED user, so
// they inject `true`; the A→B case is measured in test:hydration A17.
function runCompleteTour({ authUser, hydrated = true }, done) {
  const saved = [];
  const store = new Map();
  let deps = null;
  const useCallback = (fn, d) => {
    deps = d;
    return fn;
  };
  const f = new Function(
    "useCallback",
    "localStorage",
    "saveSettings",
    "authUser",
    "setShowTour",
    "setTab",
    "hydratedRef",
    `${completeBlock.text};\nreturn completeTour;`
  );
  const completeTour = f(
    useCallback,
    { setItem: (k, v) => store.set(k, v), getItem: (k) => store.get(k) ?? null },
    (id, patch) => saved.push({ id, patch }),
    authUser,
    () => {},
    () => {},
    { current: hydrated }
  );
  completeTour(done);
  return { saved, store, deps };
}

const p = runCompleteTour({ authUser: { id: "u-1" } }, true);
ok("P1", "completeTour calls saveSettings", p.saved.length === 1, `${p.saved.length} call(s)`);
ok("P2", "saveSettings is given the authenticated user id", p.saved[0]?.id === "u-1", JSON.stringify(p.saved[0]?.id));
ok("P3", "the patch carries tourDone: true", p.saved[0]?.patch?.tourDone === true, JSON.stringify(p.saved[0]?.patch));
ok("P4", "localStorage is still written (the M2b mirror is unchanged)", p.store.get("swingEdgeTourDone") === "1");
ok(
  "P5",
  "the useCallback dep array tracks authUser.id",
  Array.isArray(p.deps) && p.deps.includes("u-1"),
  JSON.stringify(p.deps)
);

// Signed-out: no id to write against. localStorage still holds the flag, and
// ⛔ no guessed id is sent — writing under a placeholder would be R-2.
const pAnon = runCompleteTour({ authUser: null }, true);
ok("P6", "signed out: no DB write is attempted", pAnon.saved.length === 0, JSON.stringify(pAnon.saved));
ok("P7", "signed out: localStorage is still written", pAnon.store.get("swingEdgeTourDone") === "1");

// `tourDone` is a real field in the persistence module's key map — a patch key the
// module does not know is a write that lands nowhere.
const settingsSrc = fs.readFileSync(path.join(ROOT, "src", "lib", "userSettings.js"), "utf8");
ok("P8", "userSettings maps a `tourDone` field", /field:\s*"tourDone"/.test(settingsSrc));

// ── summary ────────────────────────────────────────────────────────────────
console.log("\n───────────────────────────────────────────────────────────────");
console.log(`  ${pass} passed · ${fail} failed · ${pass + fail} assertions`);
if (fail) {
  console.log("\n  failures:");
  for (const f of failures) console.log(`   · ${f}`);
}
console.log(
  "\n  ⚠️  scope: this harness runs the real bytes of buildTourSteps, the stepTab\n" +
    "     guard, the arrow-key listener and completeTour, and counts anchor mounts\n" +
    "     across the transformed tree. It does ⛔ NOT render: React, the DOM, the\n" +
    "     spotlight geometry, RTL layout, contrast and a real browser all live in\n" +
    "     CHECKS alone. Green here ⛔ means the tour looks right on screen.\n"
);
process.exit(fail ? 1 : 0);
