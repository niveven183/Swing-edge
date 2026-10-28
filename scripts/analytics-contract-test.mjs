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
const MAIN = new URL("../src/main.jsx", import.meta.url);
const app = readFileSync(APP, "utf8");
const consentSrc = readFileSync(CONSENT, "utf8");
const mainSrc = readFileSync(MAIN, "utf8");

let pass = 0;
const failures = [];
function ok(n, label, cond, detail = "") {
  if (cond) { pass++; console.log(`  ✅ ${n}. ${label}`); }
  else { failures.push(`${n}. ${label}${detail ? ` — ${detail}` : ""}`); console.log(`  ❌ ${n}. ${label}${detail ? ` — ${detail}` : ""}`); }
}

// The 11 screens, measured from the `tab === "…"` render branches in
// SwingEdge_App.jsx plus `onboarding` (a blocking screen, not a tab).
// `analyzer` and `position` are deliberately ABSENT: an effect rewrites them to
// `tools` in the same tick, so reporting them would count a screen no one saw.
// `notebook` was removed 20.09 with the tab itself.
const EXPECTED_SCREENS = [
  "admin", "analytics", "dashboard", "feedback", "intel", "journal",
  "mentoring", "onboarding", "settings", "tools", "weeklyReview",
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
ok(7, "SCREEN_NAMES is exactly the 11 measured screens",
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

// ── 15-17: THE SECOND CHANNEL ──────────────────────────────────────────────
//
// WHY THESE EXIST, AND WHY 1-14 COULD NOT HAVE CAUGHT IT.
// Assertions 1-14 guard `gtag` and nothing else — assertion 12 is literally
// /(?<!window\.)\bgtag\s*\(/. That is structural blindness, not an oversight:
// `@vercel/analytics` never touches gtag, so a full green run said nothing
// about it. INCIDENTS #12 pinned `page_location` for GA4 and closed with
// "⛔ Still open: no automated check asserts that nothing resembling a token
// reaches an outbound analytics call". This is that check, 21 days later, for
// the channel the first fix did not reach.
//
// WHAT LEAKED, MEASURED — not quoted from the backlog row:
// the script Vercel actually serves builds its payload as `{ o: location.href }`
// (docs/audits/AUDIT-B184-vercel-analytics-2026-08-27.md §2). Supabase runs the
// implicit flow (src/supabaseClient.js:13), so an OAuth return lands on
// `/#access_token=…` before the client strips it. Measured in a real browser:
// o = 115 chars WITH the fragment; with the pin, 28 chars without it.
//
// ⛔ THE HONEST LIMIT, same as 8-14: these are STATIC. They prove the pin is
// WRITTEN, not that it RUNS. What proves it runs is the isolated harness in
// §3/§4 of that audit — a real browser, because the served script aborts on
// `navigator.webdriver`, so headless automation measures "no leak" and lies.
//
// ⛔ AND THE PIN IS AN ALLOWLIST, NOT A FILTER. Stripping `access_token` by name
// would be a blacklist, and the next provider renames the parameter. The URL is
// REBUILT from origin + a path that must already be in ROUTES.

const injectCalls = [...mainSrc.matchAll(/\binject\s*\(([\s\S]{0,600}?)\)\s*;/g)];
const injectArgs = injectCalls.length ? injectCalls[0][1] : "";

// 15. The call itself. `inject()` bare is the leaking form, and it is what
//     shipped for 21 days while every one of these assertions was green.
ok(15, "inject() is never called without a beforeSend",
  injectCalls.length === 1 && /beforeSend\s*:/.test(injectArgs),
  injectCalls.length !== 1
    ? `${injectCalls.length} inject() calls found`
    : `args: ${injectArgs.replace(/\s+/g, " ").trim().slice(0, 90) || "(none)"}`);

// 16. The SHAPE of the pin. Built from origin + an allowlisted path — the same
//     construction as consent.js trackPageView, via the same ROUTES set, so a
//     route added next month cannot widen either channel independently. And it
//     must not reach for href/search/hash at all: a pin that reads the full URL
//     and then edits it is one refactor away from being a filter again.
const buildsFromParts = /location\.origin/.test(injectArgs)
  && /location\.pathname/.test(injectArgs)
  && /analyticsPath\s*\(/.test(injectArgs);
const reachesForUrl = /\.href\b|\.search\b|\.hash\b|event\.url\b/.test(injectArgs);
ok(16, "the pin REBUILDS the url from origin + an allowlisted path",
  buildsFromParts && !reachesForUrl,
  !buildsFromParts ? "does not use location.origin + analyticsPath(location.pathname)"
    : "reads href/search/hash — that is a filter, not an allowlist");

// 17. No third door. `window.va` is a global exactly like `gtag`, and `track()`
//     from the same package reaches it without passing through inject()'s
//     beforeSend at all. One file may speak to this channel.
const strayVa = /\bwindow\.va\s*\(/.test(app) || /@vercel\/analytics/.test(app)
  || /@vercel\/analytics/.test(consentSrc);
ok(17, "only src/main.jsx speaks to the Vercel channel", !strayVa,
  "a second call site bypasses the beforeSend pin entirely");

// ── 18-27: THE THIRD CHANNEL — Sentry (B-458, INCIDENTS #40) ───────────────
//
// Measured 28.10 on the real bytes + @sentry/react 10.67 in Chromium (WAVE1-DIAGNOSIS §F3):
// with no hooks on Sentry.init the sampled pageload transaction carried `refresh_token` and
// `access_token` in request.url · url.full · spans[].description. These are VALUE assertions
// on src/lib/sentryScrub.js; that the SDK really calls them is `npm run probe:sentry`.
// ⚠️ 21 and 27 are self-checks: the same predicate run against a mutant scrub must go RED,
// otherwise 20 / 19 could be green against any implementation.
const scrub = await import("../src/lib/sentryScrub.js");
const SECRETS = ["eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1In0.SIGSECRET", "RTSECRET123", "ya29.PROVIDERSECRET", "PKCESECRET0f6b", "pkce_HASHSECRET"];
const REAL_URLS = [
  // implicit OAuth return (Google) — provider_token too
  `https://swing-edge.com/app#access_token=${SECRETS[0]}&expires_at=1793181328&expires_in=3600&provider_token=${SECRETS[2]}&refresh_token=${SECRETS[1]}&token_type=bearer`,
  // password recovery return
  `https://swing-edge.com/app#access_token=${SECRETS[0]}&expires_in=3600&refresh_token=${SECRETS[1]}&token_type=bearer&type=recovery`,
  // PKCE code exchange
  `https://swing-edge.com/app?code=${SECRETS[3]}`,
  // email confirm with token_hash
  `https://swing-edge.com/auth/confirm?token_hash=${SECRETS[4]}&type=email&next=/app`,
  // path-only form, as spans[].description carries it
  `GET /app#access_token=${SECRETS[0]}&refresh_token=${SECRETS[1]}`,
];
const leaks = (x) => SECRETS.filter((sec) => JSON.stringify(x).includes(sec));
const scrubbedUrls = REAL_URLS.map(scrub.scrubUrl);
ok(18, "5 real Supabase return URLs ⇒ 0 token values survive scrubUrl",
  scrubbedUrls.every((u) => leaks(u).length === 0), scrubbedUrls.filter((u) => leaks(u).length).join(" | ").slice(0, 160));

const mkEvent = () => ({
  type: "transaction", transaction: "/app",
  request: { url: REAL_URLS[1] },
  contexts: { trace: { data: { "url.full": REAL_URLS[0] } } },
  spans: [{ description: REAL_URLS[4], data: { "http.url": REAL_URLS[2] } }],
  breadcrumbs: [{ category: "navigation", data: { from: REAL_URLS[1], to: "/app" } }],
  tags: {},
});
const scrubbedEvent = scrub.sentryBeforeSendTransaction(mkEvent());
ok(19, "a transaction with the token in request.url · url.full · spans · breadcrumbs ⇒ 0 secrets",
  leaks(scrubbedEvent).length === 0, `leaked: ${leaks(scrubbedEvent).join(",")}`);

// ① the F3 ↔ F4 collision (Niv 28.10): filtered as a URL parameter VALUE, never by object key.
const codeOk = (fn) => {
  const e = fn({ tags: { kind: "write_failure", code: "23514", op: "insert" }, request: { url: "https://swing-edge.com/app?code=abc" } });
  return e.tags.code === "23514" && /code=\[Filtered\]/.test(e.request.url) && !/code=abc/.test(e.request.url);
};
ok(20, "① tags.code \"23514\" survives · request.url ?code=abc ⇒ code=[Filtered]", codeOk(scrub.sentryBeforeSend));
const KEYED = /^(access_token|refresh_token|provider_token|code|token_hash|type)$/;
const keyFilterMutant = (e) => { const w = (o) => { for (const k of Object.keys(o)) { if (KEYED.test(k)) o[k] = "[Filtered]"; else if (o[k] && typeof o[k] === "object") w(o[k]); } return o; }; return scrub.sentryBeforeSend(w(e)); };
ok(21, "① self-check: a scrub that filters by KEY NAME turns 20 red", codeOk(keyFilterMutant) === false);

// ② a '#' is cut only from a URL-like or token-bearing string.
const plain = ["Trade #3 failed", "rank #1", "Setup #A — 2 of 5", "#hashtag"];
ok(22, "② \"Trade #3 failed\" · \"rank #1\" · non-URL '#' strings ⇒ byte-identical",
  plain.every((x) => scrub.scrubUrl(x) === x), plain.map((x) => `${x}→${scrub.scrubUrl(x)}`).join(" | "));

// G-crumb: the console breadcrumb keeps its FIRST argument only.
const crumb = scrub.scrubBreadcrumb({ category: "console", level: "error",
  message: "Supabase insert failed: error Failing row contains (AAPL, 187.45)",
  data: { logger: "console", arguments: ["Supabase insert failed:", "error", "Failing row contains (AAPL, 187.45)"] } });
ok(23, "G-crumb: console breadcrumb ⇒ first argument only, ⛔ arguments, ⛔ row values",
  crumb.message === "Supabase insert failed:" && !("arguments" in crumb.data) && !/187\.45|AAPL|Failing row/.test(JSON.stringify(crumb)),
  JSON.stringify(crumb).slice(0, 140));

const bare = scrub.sentryBeforeSend({ tags: { kind: "write_failure" }, breadcrumbs: [{ category: "fetch", data: { url: "/api/quote?symbols=AAPL" } }] });
const kept = scrub.sentryBeforeSend({ tags: { kind: "crash" }, breadcrumbs: [{ category: "fetch", data: { url: "/api/quote?symbols=AAPL" } }] });
ok(24, "write_failure / settings_read_failure events ship ⛔ breadcrumbs · other events keep theirs",
  !("breadcrumbs" in bare) && Array.isArray(kept.breadcrumbs) && kept.breadcrumbs.length === 1);

const initArgs = (mainSrc.match(/Sentry\.init\(\{([\s\S]*?)\n\}\);/) || [])[1] || "";
const wired = /beforeSend:\s*sentryBeforeSend,/.test(initArgs)
  && /beforeSendTransaction:\s*sentryBeforeSendTransaction,/.test(initArgs)
  && /beforeBreadcrumb:\s*scrubBreadcrumb,/.test(initArgs)
  && (mainSrc.match(/from "\.\/lib\/sentryScrub\.js"/g) || []).length === 1;
ok(25, "Sentry.init wires all three outbound hooks to src/lib/sentryScrub.js", initArgs !== "" && wired,
  initArgs === "" ? "Sentry.init({ … }) not found exactly — extraction failure is red (B-272)" : "a hook is missing or bound to something else");

ok(26, "⛔ replaysOnErrorSampleRate (no replayIntegration ⇒ dead config)",
  initArgs !== "" && !/^\s*replaysOnErrorSampleRate\s*:/m.test(initArgs));

const passThrough = (e) => e; // MUT-F3: beforeSend returns the event as is
ok(27, "self-check: a pass-through beforeSend turns 19 red", leaks(passThrough(mkEvent())).length > 0);

console.log(`\n── ${pass}/${pass + failures.length} passed ──`);
if (failures.length) {
  console.log("\nFAILED:");
  for (const f of failures) console.log(`  · ${f}`);
  process.exit(1);
}
console.log("analytics contract: OK\n");
