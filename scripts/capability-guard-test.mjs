// scripts/capability-guard-test.mjs — a browser capability is consumed only after
// an existence check, and its failure is visible to the user.
//
// WHY THIS EXISTS. Three bugs shipped in the same class, and none of them could be
// caught by any verification we run, because our browser HAS every capability they
// assume:
//
//   1. IMAGE PAYLOAD. Three upload paths POSTed a raw File to /api/ocr. A modern
//      Android screenshot exceeds the endpoint's 6MB cap, so the request returned
//      400 image_too_large and the trader saw a generic error. The screen-capture
//      path resized and worked. Same feature, two behaviours.
//   2. CLIPBOARD. navigator.clipboard was consumed with no existence check, inside
//      a try whose catch was empty. In a non-secure context or a WebView the call
//      throws, the catch swallows it, and the button gives ZERO feedback — the code
//      is not copied and the user is not told.
//   3. matchMedia. Consumed unguarded inside useEffect. An old WebView that lacks
//      it throws during the effect and takes the tree down.
//
// #2 and #3 are branches #2/#3/#6 of the six capability branches mapped in
// PLAN-2026-08-06-workflows.md §5. That plan established that device EMULATION
// cannot reach them: it changes the user-agent and the viewport, it does NOT remove
// capabilities. Covering them needs either capability-removal tests in Playwright
// (⏭️, still open) or these static assertions. These are the cheap half, and they
// run in `verify` where a browser does not.
//
// TWO KINDS OF ASSERTION HERE, AND THE DIFFERENCE MATTERS.
// 1-2 RUN the pure arithmetic of src/lib/imageResize.js. That is where a silent
// regression actually hides — the base64 ratio, the rounding direction, the cap
// compared before the encode instead of after — and it is real execution, not text
// matching. 3-8 are STATIC assertions over source text, the same approach
// ocr-contract-test, landing-pricing-test, notify-handle-test and rContract-test
// already take, because there is no component-test infrastructure in this repo
// (no vitest/jest/jsdom) and running JSX under node needs a transformer.
//
// A static assertion proves the guard is WRITTEN, not that it WORKS. That is the
// honest limit of this file, and it is why the Playwright capability-removal tests
// stay on the ⏭️ list rather than being marked covered.

import { readFileSync } from "node:fs";
import {
  fitDimensions,
  exceedsCap,
  MAX_EDGE_PX,
  OCR_CAP_BYTES,
  Q_PRIMARY,
  Q_FALLBACK,
} from "../src/lib/imageResize.js";

const APP = new URL("../SwingEdge_App.jsx", import.meta.url);
const THEME = new URL("../src/contexts/ThemeContext.jsx", import.meta.url);
const appSrc = readFileSync(APP, "utf8");
const themeSrc = readFileSync(THEME, "utf8");

let pass = 0;
const failures = [];
function check(id, label, ok, detail = "") {
  if (ok) { pass++; console.log(`✅ ${id}  ${label}`); }
  else { failures.push({ id, label, detail }); console.error(`❌ ${id}  ${label}${detail ? `\n      ${detail}` : ""}`); }
}

// ── helper: extract a function body by name, brace-balanced ──────────────────
// Static assertions must be scoped to the function they describe. A file-wide
// regex would make assertion 4 fail on handlePlaybookImageUpload, which uses
// readAsDataURL LEGITIMATELY (it writes to localStorage, it is not a send path).
function bodyOf(src, name) {
  const start = src.indexOf(`const ${name} =`);
  if (start === -1) return null;
  const open = src.indexOf("{", start);
  if (open === -1) return null;
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") { depth--; if (depth === 0) return src.slice(start, i + 1); }
  }
  return null;
}

// ── 1. fitDimensions — RUN, not matched ─────────────────────────────────────
{
  const cases = [
    // [w, h, expected w, expected h, why]
    [4000, 2000, 2000, 1000, "landscape over the cap — longest edge pinned, ratio kept"],
    [2000, 4000, 1000, 2000, "portrait over the cap — the SHORT edge must not be the one pinned"],
    [3000, 3000, 2000, 2000, "square over the cap"],
    [1600, 900, 1600, 900, "already under the cap — untouched, never upscaled"],
    [2000, 1000, 2000, 1000, "exactly at the cap — boundary, untouched"],
    // A 1440x3120 Android screenshot, the exact shape that produced the bug.
    [1440, 3120, 923, 2000, "Pixel-class portrait screenshot"],
  ];
  let ok = true;
  const detail = [];
  for (const [w, h, ew, eh, why] of cases) {
    const got = fitDimensions(w, h);
    if (got.w !== ew || got.h !== eh) {
      ok = false;
      detail.push(`${w}x${h} → expected ${ew}x${eh}, got ${got.w}x${got.h}  (${why})`);
    }
  }
  check("1", "fitDimensions — aspect ratio preserved, cap honoured, never upscales", ok, detail.join("\n      "));
}

{
  // Degenerate input must THROW, not silently produce a zero-area canvas.
  let threw = false;
  try { fitDimensions(0, 0); } catch { threw = true; }
  check("1b", "fitDimensions throws on a zero-area frame instead of returning 0x0", threw);
}

// ── 2. exceedsCap — RUN ─────────────────────────────────────────────────────
{
  // base64 decodes to ~3/4 of its length, so the cap in STRING length is cap/0.75.
  const atCap = OCR_CAP_BYTES / 0.75;
  const ok =
    exceedsCap(atCap + 1000) === true &&
    exceedsCap(atCap - 1000) === false &&
    exceedsCap(atCap) === false &&          // boundary is not "exceeds"
    exceedsCap(0) === false;
  check("2", "exceedsCap — measures DECODED bytes (×0.75), boundary excluded", ok,
    `cap=${OCR_CAP_BYTES}B → string length threshold ${Math.round(atCap)}`);
}

{
  const ok = MAX_EDGE_PX === 2000 && OCR_CAP_BYTES === 6 * 1024 * 1024 && Q_PRIMARY === 0.92 && Q_FALLBACK === 0.8;
  check("2b", "constants frozen at grabChartFrame's original values", ok,
    `MAX_EDGE_PX=${MAX_EDGE_PX} OCR_CAP_BYTES=${OCR_CAP_BYTES} Q_PRIMARY=${Q_PRIMARY} Q_FALLBACK=${Q_FALLBACK}`);
}

// ── 3/4. the three SEND paths resize, and none reads the raw file ───────────
const SEND_PATHS = ["handleImageUpload", "handleAnalyzerImageUpload", "handleChartFileFallback"];

{
  const missing = SEND_PATHS.filter((n) => {
    const body = bodyOf(appSrc, n);
    return !body || !body.includes("fileToResizedDataURL");
  });
  check("3", "all three /api/ocr send paths call fileToResizedDataURL", missing.length === 0,
    missing.length ? `not calling it: ${missing.join(", ")}` : "");
}

{
  const raw = SEND_PATHS.filter((n) => {
    const body = bodyOf(appSrc, n);
    return body && /readAsDataURL\s*\(/.test(body);
  });
  check("4", "no send path reads the raw File with readAsDataURL", raw.length === 0,
    raw.length ? `sending un-resized bytes: ${raw.join(", ")}` : "");
}

{
  // The import must exist, or 3 could pass on a comment.
  const ok = /import\s*\{[^}]*fileToResizedDataURL[^}]*\}\s*from\s*["']\.\/src\/lib\/imageResize\.js["']/.test(appSrc);
  check("4b", "fileToResizedDataURL is imported from src/lib/imageResize.js", ok);
}

// ── 5. grabChartFrame holds no duplicate constants ──────────────────────────
{
  // Comments are stripped first. This assertion is about CODE: the caps are
  // explained in prose right there ("caps the longest edge, w ≤ 2000 …"), and an
  // assertion that trips on its own documentation is a false positive that
  // punishes the next person who explains something.
  const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const raw = bodyOf(appSrc, "grabChartFrame");
  const body = raw ? stripComments(raw) : null;
  const dupes = [];
  if (!body) dupes.push("grabChartFrame not found");
  else {
    if (/\b2000\b/.test(body)) dupes.push("literal 2000 (use MAX_EDGE_PX)");
    if (/6\s*\*\s*1024\s*\*\s*1024/.test(body)) dupes.push("literal 6*1024*1024 (use OCR_CAP_BYTES)");
    if (/\b0\.92\b/.test(body)) dupes.push("literal 0.92 (use Q_PRIMARY)");
  }
  check("5", "grabChartFrame imports the caps instead of duplicating them", dupes.length === 0,
    dupes.join(" · "));
}

// ── 6/7. clipboard: existence check, and a failure the user can see ─────────
{
  const sites = [...appSrc.matchAll(/navigator\.clipboard/g)];
  const fnBody = bodyOf(appSrc, "handleCopyInvite");
  const guarded =
    fnBody &&
    /navigator\.clipboard\s*&&/.test(fnBody) &&
    fnBody.indexOf("navigator.clipboard &&") < fnBody.indexOf("await navigator.clipboard");
  check("6", "navigator.clipboard is existence-checked before it is called", Boolean(guarded),
    `${sites.length} site(s) in SwingEdge_App.jsx; handleCopyInvite guard ${guarded ? "present" : "MISSING"}`);
}

{
  const fnBody = bodyOf(appSrc, "handleCopyInvite") || "";
  // An empty catch here is the bug: the copy silently fails and the button lies.
  const emptyCatch = /catch\s*(\([^)]*\))?\s*\{\s*(\/\*[^*]*\*\/|\/\/[^\n]*)?\s*\}/.test(fnBody);
  const tellsUser = /toast\.(error|info|warning)/.test(fnBody);
  check("7", "a failed clipboard write is reported to the user, not swallowed",
    !emptyCatch && tellsUser,
    `${emptyCatch ? "empty catch present · " : ""}${tellsUser ? "" : "no toast on the failure path"}`);
}

// ── 8. every matchMedia is guarded ──────────────────────────────────────────
{
  // Accepts the three shapes already in use: optional chaining, a typeof/truthy
  // ternary, or a surrounding try. Deliberately permissive about STYLE and strict
  // about the property: an unguarded call must not exist.
  const scan = (src, label) => {
    const bad = [];
    const lines = src.split("\n");
    lines.forEach((line, i) => {
      if (!/\bmatchMedia\s*\(/.test(line)) return;
      if (/matchMedia\?\./.test(line)) return;                       // window.matchMedia?.(...)
      if (/typeof\s+window|window\.matchMedia\s*\?|&&\s*window\.matchMedia/.test(line)) return; // ternary/&& guard
      // try-guarded: look back a few lines for an open try in the same block
      const back = lines.slice(Math.max(0, i - 6), i).join("\n");
      if (/\btry\s*\{/.test(back)) return;
      bad.push(`${label}:${i + 1}  ${line.trim()}`);
    });
    return bad;
  };
  const bad = [...scan(appSrc, "SwingEdge_App.jsx"), ...scan(themeSrc, "src/contexts/ThemeContext.jsx")];
  check("8", "every matchMedia call is guarded (?. / typeof / try)", bad.length === 0,
    bad.join("\n      "));
}

// ── verdict ─────────────────────────────────────────────────────────────────
const total = pass + failures.length;
console.log(`\n${pass}/${total} assertions passed`);
if (failures.length) {
  console.error(`\n${failures.length}/${total} FAILED:`);
  for (const f of failures) console.error(`  ❌ ${f.id}  ${f.label}`);
  process.exit(1);
}
console.log("✅ capability guards intact");
