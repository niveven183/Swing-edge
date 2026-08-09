// scripts/analytics-contract-test.mjs — every analytics event is born filtered,
// and no event can carry anything a user typed.
//
// WHY THIS EXISTS. GA4 could see that /app was loaded and nothing after that.
// In-app tabs are `useState`, not routes (src/lib/consent.js ROUTES), so a
// session that stalled in onboarding and a session that logged ten trades were
// the same single page_view. The wave that fixed it adds screen_view plus three
// funnel events, and both halves of that addition can rot silently:
//
//   1. THE GATE. window.gtag is a global. Any file can reach it directly and
//      ship an event that never passed readConsent() — the user declined, the
//      event goes out anyway, and nothing anywhere says so.
//   2. THE PAYLOAD. This repo is PUBLIC and GA4 is a third party. A parameter
//      that starts as an enum and grows into "whatever the model returned" is
//      one careless spread away, and it would carry tickers or a failure string
//      containing user text.
//
// TWO KINDS OF ASSERTION HERE, AND THE DIFFERENCE MATTERS — same split as
// capability-guard-test.mjs. 1-7 REALLY RUN src/lib/consent.js against a stubbed
// window/localStorage: the consent gate and the enum clamps are executed, not
// text-matched, because that is where a silent regression actually hides. 8-14
// are STATIC assertions over source text, because there is no vitest/jsdom in
// this repo and running JSX under node needs a transformer.
//
// A static assertion proves the call is WRITTEN, not that it RUNS. That is the
// honest limit of 8-14.

import { readFileSync } from "node:fs";

const APP = new URL("../SwingEdge_App.jsx", import.meta.url);
const CONSENT = new URL("../src/lib/consent.js", import.meta.url);
const app = readFileSync(APP, "utf8");
const consentSrc = readFileSync(CONSENT, "utf8");

let pass = 0;
const failures = [];
function ok(n, label, cond, detail = "") {
  if (cond) { pass++; console.log(`  ✅ ${n}. ${label}`); }
  else { failures.push(`${n}. ${label}${detail ? ` — ${detail}` : ""}`); console.log(`  ❌ ${n}. ${label}${detail ? ` — ${detail}` : ""}`); }
}

// The 12 screens, measured from the `tab === "…"` render branches in
// SwingEdge_App.jsx plus `onboarding` (a blocking screen, not a tab).
// `analyzer` and `position` are deliberately ABSENT: an effect rewrites them to
// `tools` in the same tick, so reporting them would count a screen no one saw.
const EXPECTED_SCREENS = [
  "admin", "analytics", "dashboard", "feedback", "intel", "journal",
  "mentoring", "notebook", "onboarding", "settings", "tools", "weeklyReview",
];

// The closed parameter allowlist. Every key any event may carry, ever.
// All five are an enum or a boolean — none can hold a string a user typed.
const ALLOWED_PARAMS = new Set([
  "screen_name", "source", "ok", "detected", "confidence_bucket", "page_location",
]);

console.log("\n── analytics contract ──────────────────────────────────────\n");

// ── 1-7: real execution against a stubbed browser ──────────────────────────
const sent = [];
let consentValue = null;
globalThis.window = { gtag: (...args) => sent.push(args) };
globalThis.localStorage = {
  getItem: (k) => (k === "swingEdgeConsent" && consentValue
    ? JSON.stringify({ v: 1, analytics: consentValue, ts: "2026-08-09T00:00:00.000Z" })
    : null),
  setItem: () => {},
};

const mod = await import(CONSENT.href);
const paramsOf = (name) => {
  const hit = sent.find((c) => c[0] === "event" && c[1] === name);
  return hit ? hit[2] : null;
};

// 1. The gate itself. Without a grant nothing leaves — this is the property the
//    whole wave rests on, and the reason every rate must name the consenting
//    population as its denominator rather than the whole user base.
consentValue = "denied";
sent.length = 0;
mod.trackScreenView?.("dashboard");
mod.trackEvent?.("ocr_result", { detected: true });
ok(1, "no grant → zero events leave", sent.length === 0, `${sent.length} slipped through`);

// From here on the user has consented.
consentValue = "granted";

// 2. The happy path.
sent.length = 0;
mod.trackScreenView?.("journal");
ok(2, "screen_view carries the screen_name",
  paramsOf("screen_view")?.screen_name === "journal",
  JSON.stringify(paramsOf("screen_view")));

// 3. An unknown screen collapses, exactly as ROUTES → "/other" already does for
//    paths. A tab added next month cannot silently widen what we send.
sent.length = 0;
mod.trackScreenView?.("some_future_tab");
ok(3, "unknown screen collapses to \"other\"",
  paramsOf("screen_view")?.screen_name === "other",
  JSON.stringify(paramsOf("screen_view")));

// 4. The transient aliases. `tab` really does hold "analyzer" for one tick
//    before the effect rewrites it to "tools"; reporting it would invent a
//    screen visit that never happened.
let aliasesClamped = true;
for (const alias of ["analyzer", "position"]) {
  sent.length = 0;
  mod.trackScreenView?.(alias);
  if (paramsOf("screen_view")?.screen_name !== "other") aliasesClamped = false;
}
ok(4, "transient aliases analyzer/position never report as screens", aliasesClamped);

// 5. Strict boolean: a truthy object must not become the payload.
sent.length = 0;
mod.trackOcrAttempted?.({ some: "response" });
mod.trackOcrAttempted?.(true);
const okValues = sent.filter((c) => c[1] === "ocr_attempted").map((c) => c[2]?.ok);
ok(5, "ocr_attempted coerces ok to a strict boolean",
  okValues.length === 2 && okValues[0] === false && okValues[1] === true,
  JSON.stringify(okValues));

// 6. Same clamp on the form's source.
sent.length = 0;
mod.trackTradeFormOpened?.("whatever-the-caller-passed");
ok(6, "trade_form_opened clamps source to the enum",
  paramsOf("trade_form_opened")?.source === "manual",
  JSON.stringify(paramsOf("trade_form_opened")));

// 7. The list is the contract.
const actualScreens = mod.SCREEN_NAMES ? [...mod.SCREEN_NAMES].sort() : [];
ok(7, "SCREEN_NAMES is exactly the 12 measured screens",
  JSON.stringify(actualScreens) === JSON.stringify([...EXPECTED_SCREENS].sort()),
  `got ${actualScreens.length}: ${actualScreens.join(",")}`);

// ── 8-14: static assertions over the app source ────────────────────────────

// 8. ONE transition point. Seven scattered calls would drift the moment an
//    eighth tab lands; a single effect on `tab` cannot.
// `showOnboarding` is allowed alongside `tab` in the dependency list: onboarding
// is a screen too, and it is not a tab. What this pins is that `tab` is in there
// and that there is exactly ONE such effect.
const tabEffects = app.match(/useEffect\(\s*\(\)\s*=>\s*\{[^}]*trackScreenView\([^)]*\)[^}]*\},\s*\[\s*tab\b[^\]]*\]\s*\)/gs) || [];
ok(8, "screen_view fires from a single useEffect keyed on tab",
  tabEffects.length === 1, `${tabEffects.length} matching effects`);

// 9-10. The two funnel events that had no call site at all.
const onboardingFn = app.slice(app.indexOf("const handleOnboardingComplete"), app.indexOf("// ── SUPABASE AUTH ──"));
ok(9, "onboarding_completed fires in handleOnboardingComplete",
  /trackOnboardingCompleted\(\)/.test(onboardingFn));
ok(10, "trade_form_opened is wired", /trackTradeFormOpened\(/.test(app));

// 11. THE POINT OF ocr_attempted. ocr_result only ever fired on the success
//     path, so we had a numerator with no denominator — successes over nothing.
//     The failure exits are what make the rate mean anything, so assert the
//     event reaches them rather than merely existing somewhere.
const attemptCalls = (app.match(/trackOcrAttempted\(/g) || []).length;
const inCatch = /catch\s*\{[^}]*trackOcrAttempted\(\s*false\s*\)/s.test(app)
  || /trackOcrAttempted\(\s*ocrOk\s*\)/.test(app);
ok(11, "ocr_attempted reaches every OCR exit, failures included",
  attemptCalls >= 7 && inCatch, `${attemptCalls} call sites, failure path ${inCatch ? "covered" : "MISSING"}`);

// 12. The gate is only a gate if nothing walks around it. index.html is excluded
//     on purpose — it DEFINES window.gtag, and the loader must run before any
//     module exists to wrap it.
const strayGtag = /(?<!window\.)\bgtag\s*\(/.test(app);
ok(12, "zero direct gtag() in the app outside the wrapper", !strayGtag);

// 13. THE PII FENCE. Extract the keys of every trackEvent literal in both files
//     and hold them against the closed list.
const seenKeys = new Set();
for (const src of [app, consentSrc]) {
  for (const m of src.matchAll(/trackEvent\(\s*["'][a-z_]+["']\s*,\s*\{([^}]*)\}/gs)) {
    // Anchored to the object's start or a comma. A bare `\w+:` also matches the
    // ternary in `{ screen_name: SET.has(s) ? s : "other" }` and reports `s` as
    // a parameter that does not exist.
    for (const k of m[1].matchAll(/(?:^|,)\s*([A-Za-z_][A-Za-z0-9_]*)\s*:/g)) seenKeys.add(k[1]);
  }
}
const strayKeys = [...seenKeys].filter((k) => !ALLOWED_PARAMS.has(k));
ok(13, "every event parameter is on the closed allowlist",
  strayKeys.length === 0, strayKeys.length ? `stray: ${strayKeys.join(", ")}` : "");

// 14. An event that counts a trade the database rejected is a number that lies —
//     and because the sentinel is a localStorage key, it lies PERMANENTLY: there
//     is no second first-trade. So the call must sit after the row count came
//     back, not next to the optimistic setTrades.
const submit = app.slice(app.indexOf("const predictionSnapshot"), app.indexOf("const handleCloseSubmit"));
const awaitAt = submit.indexOf("const res = await writing");
const trackAt = submit.indexOf("trackFirstTradeSaved()");
ok(14, "first_trade_saved fires only after the write is verified",
  awaitAt !== -1 && trackAt > awaitAt,
  trackAt === -1 ? "no call in handleSubmit" : trackAt < awaitAt ? "fires before the await — counts rolled-back trades" : "");

console.log(`\n── ${pass}/${pass + failures.length} passed ──`);
if (failures.length) {
  console.log("\nFAILED:");
  for (const f of failures) console.log(`  · ${f}`);
  process.exit(1);
}
console.log("analytics contract: OK\n");
