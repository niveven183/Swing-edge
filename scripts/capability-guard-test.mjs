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
  STORED_MAX_EDGE_PX,
  STORED_Q_PRIMARY,
  STORED_FALLBACK_EDGE_PX,
  STORED_Q_FALLBACK,
  STORED_CAP_BYTES,
  STORED_LADDER,
  chooseStoredEncoding,
} from "../src/lib/imageResize.js";
import { persistPlaybookSafely, PLAYBOOK_KEY } from "../src/lib/playbookStore.js";
import { getTranslations } from "../src/i18n.js";

const APP = new URL("../SwingEdge_App.jsx", import.meta.url);
const THEME = new URL("../src/contexts/ThemeContext.jsx", import.meta.url);
const appSrc = readFileSync(APP, "utf8");
const themeSrc = readFileSync(THEME, "utf8");
const toastSrc = readFileSync(new URL("../src/components/ToastProvider.jsx", import.meta.url), "utf8");
const storeSrc = readFileSync(new URL("../src/lib/playbookStore.js", import.meta.url), "utf8");

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


// ── 12–23. STORED IMAGES (B-015 · B-038 · B-388, 01.10) ─────────────────────
// An image that is KEPT must be small, and a write that cannot land must be SAID.
// 12–14 and 19 RUN real code; 15–18 and 20–23 are static over source text (same limit as
// 3–8). Chromium-quota behaviour and the pixels live in `npm run probe:image` and `C-064`.
// ⛔ A failed extraction is a hard red, never a skip (B-272): bodyOf() returning null fails.
const stripC = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const EMPTY_CATCH = /catch\s*(\([^)]*\))?\s*\{\s*\}/;

{
  const ok = STORED_MAX_EDGE_PX === 1400 && STORED_Q_PRIMARY === 0.7 && STORED_FALLBACK_EDGE_PX === 1000 &&
    STORED_Q_FALLBACK === 0.55 && STORED_CAP_BYTES === 200 * 1024 && STORED_LADDER.length === 2 &&
    STORED_LADDER[0].edge === 1400 && STORED_LADDER[1].edge === 1000;
  check("12", "stored-image profile frozen at the D3 decision (1400/.7 · 1000/.55 · cap 200KB)", ok,
    `edge=${STORED_MAX_EDGE_PX} q=${STORED_Q_PRIMARY} fb=${STORED_FALLBACK_EDGE_PX}/${STORED_Q_FALLBACK} cap=${STORED_CAP_BYTES}`);
}

{
  const small = "x".repeat(Math.floor((STORED_CAP_BYTES / 0.75)) - 10);
  const big = "x".repeat(Math.floor((STORED_CAP_BYTES / 0.75)) + 1000);
  const calls = [];
  const r1 = chooseStoredEncoding((e, q) => { calls.push([e, q]); return small; });
  const r2 = chooseStoredEncoding((e, q) => { calls.push([e, q]); return e === 1400 ? big : small; });
  let threw = null;
  try { chooseStoredEncoding(() => big); } catch (e) { threw = e.message; }
  const ok = r1 === small && calls[0][0] === 1400 && calls.length === 3 && r2 === small &&
    calls[2][0] === 1000 && calls[2][1] === 0.55 && threw === "image_too_large_for_storage";
  check("13", "chooseStoredEncoding — first fit wins, ladder falls back, above the cap REJECTS", ok,
    `calls=${JSON.stringify(calls)} threw=${threw}`);
}

function quotaStorage(limitChars, state = {}) {
  return () => ({
    setItem(k, v) {
      if (v.length > limitChars) { const e = new Error("quota"); e.name = "QuotaExceededError"; throw e; }
      state[k] = v;
    },
  });
}

{
  const detail = [];
  const imgA = "data:image/jpeg;base64," + "A".repeat(400);
  const imgB = "data:image/jpeg;base64," + "B".repeat(5000);
  const list = [{ id: 1, name: "One", description: "d", imagePreview: imgA }, { id: 2, name: "Two", description: "d", imagePreview: imgB }];
  try {

    // control arm: healthy storage ⇒ byte-identical, "ok", no drop
    const st0 = {}; const r0 = persistPlaybookSafely(quotaStorage(1e9, st0), list, 2);
    if (r0.status !== "ok" || st0[PLAYBOOK_KEY] !== JSON.stringify(list)) detail.push("control: healthy storage must store the list byte-identical with status ok");
    // image dropped: only the TARGET loses its image
    const st1 = {}; const r1 = persistPlaybookSafely(quotaStorage(2000, st1), list, 2);
    const saved1 = st1[PLAYBOOK_KEY] ? JSON.parse(st1[PLAYBOOK_KEY]) : null;
    if (r1.status !== "image_dropped") detail.push(`expected image_dropped, got ${r1.status}`);
    if (!saved1 || saved1[1].imagePreview !== null || saved1[1].name !== "Two") detail.push("the target setup must be stored WITHOUT its image but WITH its name");
    if (!saved1 || saved1[0].imagePreview !== imgA) detail.push("another setup's image must be untouched");
    if (!r1.error) detail.push("image_dropped must carry the original error");
    // failed: nothing fits
    const st2 = {}; const r2 = persistPlaybookSafely(quotaStorage(10, st2), list, 2);
    if (r2.status !== "failed" || !r2.error || st2[PLAYBOOK_KEY] !== undefined) detail.push("a total failure must report failed + error and store nothing");
    // target without an image: a retry would change nothing
    let n = 0; const counting = () => ({ setItem() { n++; throw new Error("quota"); } });
    const r3 = persistPlaybookSafely(counting, [{ id: 9, name: "N", description: "", imagePreview: null }], 9);
    if (r3.status !== "failed" || n !== 1) detail.push(`no image to drop ⇒ exactly one attempt, got ${n}`);
    // delete path (no target) failing is reported too
    const r4 = persistPlaybookSafely(quotaStorage(10), list, null);
    if (r4.status !== "failed") detail.push("a write without a target that fails must be failed");
    // the storage getter itself throwing must not escape
    let escaped = false, r5 = null;
    try { r5 = persistPlaybookSafely(() => { throw new Error("blocked"); }, list, 2); } catch { escaped = true; }
    if (escaped || r5.status !== "failed") detail.push("a throwing storage getter must come back as failed, not throw");
  } catch (e) { detail.push(`harness threw: ${e.message} (a store that returns nothing is a failure, not a crash)`); }
  check("14", "persistPlaybookSafely — ok byte-identical · only the TARGET loses its image · failure is reported, never thrown",
    detail.length === 0, detail.join("\n      "));
}

{
  const code = stripC(storeSrc);
  const bad = [];
  if (EMPTY_CATCH.test(code)) bad.push("empty catch in playbookStore.js");
  if ((code.match(/status:\s*"failed"/g) || []).length < 2) bad.push("both failure exits must return status failed");
  check("15", "playbookStore.js has no empty catch and every failure exit says so", bad.length === 0, bad.join(" · "));
}

{
  const raw = bodyOf(appSrc, "savePlaybook");
  const body = raw ? stripC(raw) : null;
  const bad = [];
  if (!body) bad.push("savePlaybook not found");
  else {
    if (!/persistPlaybookSafely\s*\(/.test(body)) bad.push("does not call persistPlaybookSafely");
    if (EMPTY_CATCH.test(body)) bad.push("empty catch");
    if (!/toast\.error\(\s*t\.playbookImageNotSaved\s*[,)]/.test(body)) bad.push("image_dropped is not announced (t.playbookImageNotSaved)");
    if (!/toast\.error\(\s*t\.playbookNotSaved\s*[,)]/.test(body)) bad.push("failed is not announced (t.playbookNotSaved)");
    if (!/setPlaybookSetups\(\s*res\.list\s*\)/.test(body)) bad.push("state must take the list the store actually stored (res.list)");
  }
  check("16", "savePlaybook persists through the store and announces BOTH non-ok outcomes", bad.length === 0, bad.join(" · "));
}

{
  const raw = bodyOf(appSrc, "handlePlaybookImageUpload");
  const body = raw ? stripC(raw) : null;
  const bad = [];
  if (!body) bad.push("handlePlaybookImageUpload not found");
  else {
    if (!/fileToStoredDataURL\s*\(/.test(body)) bad.push("does not call fileToStoredDataURL (raw bytes would be kept)");
    if (/readAsDataURL\s*\(/.test(body)) bad.push("reads the raw File with readAsDataURL");
    if (EMPTY_CATCH.test(body)) bad.push("empty catch");
    if (!/toast\.error\(\s*t\.playbookImageFailed\s*[,)]/.test(body)) bad.push("a rejected image is not announced (t.playbookImageFailed)");
  }
  const imp = /import\s*\{[^}]*fileToStoredDataURL[^}]*\}\s*from\s*["']\.\/src\/lib\/imageResize\.js["']/.test(appSrc) &&
    /import\s*\{[^}]*persistPlaybookSafely[^}]*\}\s*from\s*["']\.\/src\/lib\/playbookStore\.js["']/.test(appSrc);
  if (!imp) bad.push("fileToStoredDataURL / persistPlaybookSafely are not imported");
  check("17", "Playbook upload resizes to the stored profile, rejects loudly, and the helpers are imported", bad.length === 0, bad.join(" · "));
}

{
  const raw = bodyOf(appSrc, "handlePlaybookSubmit");
  const body = raw ? stripC(raw) : null;
  const ok = !!body && /savePlaybook\(\s*updated\s*,\s*editingSetupId\s*\)/.test(body) &&
    /savePlaybook\(\s*\[\s*\.\.\.playbookSetups\s*,\s*newSetup\s*\]\s*,\s*newSetup\.id\s*\)/.test(body);
  check("18", "both Playbook save paths name the target setup (so only ITS image can be dropped)", ok);
}

{
  const keys = ["playbookImageNotSaved", "playbookNotSaved", "playbookImageFailed", "tradesStorageFull"];
  const bad = [];
  const en = getTranslations("en");
  for (const lang of ["en", "he", "es", "pt", "ar"]) {
    const tr = getTranslations(lang);
    for (const k of keys) {
      if (typeof tr[k] !== "string" || tr[k].trim() === "") bad.push(`${lang}.${k}`);
      // A missing key falls back to English at runtime — it LOOKS present. Own string required.
      else if (lang !== "en" && tr[k] === en[k]) bad.push(`${lang}.${k} (English fallback, not translated)`);
    }
  }
  check("19", `the ${keys.length} new messages exist in 5/5 languages (${keys.length * 5}/${keys.length * 5} strings)`, bad.length === 0,
    bad.length ? `missing: ${bad.join(", ")}` : "");
}

{
  const code = stripC(toastSrc);
  const bad = [];
  if (!/role="status"/.test(code)) bad.push('container lacks role="status"');
  if (!/aria-live="polite"/.test(code)) bad.push('container lacks aria-live="polite"');
  if (!/role=\{[^}]*"error"[^}]*"alert"|role=\{[^}]*kind\s*===\s*"error"[^}]*\}/.test(code)) bad.push('error toast lacks role="alert"');
  check("20", "ToastProvider announces: container role=status + aria-live=polite, error toasts role=alert (B-388)", bad.length === 0, bad.join(" · "));
}

{
  const raw = bodyOf(appSrc, "handleSubmit");
  const body = raw ? stripC(raw) : null;
  const bad = [];
  if (!body) bad.push("handleSubmit not found");
  else {
    const i = body.indexOf("const newTrade = {");
    const j = body.indexOf("_prediction: predictionSnapshot", i);
    if (i === -1 || j === -1) bad.push("newTrade literal not found");
    else if (/\btradeImage\s*:/.test(body.slice(i, j))) bad.push("tradeImage is written into the trade again (D1: nothing reads it, LOCAL_ONLY strips it, it only eats swingEdgeTrades quota)");
  }
  check("21", "a new trade does not carry tradeImage (D1) — form preview and OCR upload untouched", bad.length === 0, bad.join(" · "));
}

{
  const i = appSrc.indexOf('localStorage.setItem("swingEdgeTrades", JSON.stringify(trades))');
  const win = i === -1 ? "" : stripC(appSrc.slice(Math.max(0, i - 200), i + 900));
  const bad = [];
  if (i === -1) bad.push("trades persist effect not found");
  else {
    if (!/toast\.error\(\s*t\.tradesStorageFull\s*[,)]/.test(win)) bad.push("a dead trades cache is not announced (t.tradesStorageFull)");
    if (!/tradesPersistWarnedRef/.test(win)) bad.push("no once-per-session guard (the effect runs on every trades change)");
  }
  check("22", "a localStorage failure on the trades cache reaches the user, once per session (B-038)", bad.length === 0, bad.join(" · "));
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
