// tests/lib/eyeTools.js — the three eye→CI tools.
//
// WHY THIS FILE EXISTS
// 44 open `C-` items are manual eye checks. Every one of them costs Niv a browser
// session, and an item nobody has time to re-check is an item that silently rots.
// `PLAN-2026-09-23-eye-to-ci.md` classified which of them a machine can judge;
// this module is the machinery for the first four.
//
// ⛔ THIS IS NOT A `tests-sentinel/` MODULE. That suite's contract is "a site
// problem is a FINDING, never a hard failure" — the run stays green while the app
// is broken, on purpose, because its job is to REPORT. The closure rule this wave
// is built on (DECISIONS, §6 of the phase-0 plan) requires the opposite: a test
// that CAN GO RED. So the code conventions below are borrowed from
// `tests-sentinel/sentinel-auth.spec.js` verbatim (login sequence, regex-never-glob
// routing, redaction, evidence-bearing comments) while the FAILURE contract comes
// from `tests/smoke.spec.js` (hard `expect`).
//
// ⛔ AND THERE IS NO `|| []` / `?? 0` ANYWHERE BELOW. Every tool in here can fail
// to install, and a tool that reports "nothing happened" when it was never
// listening is a FALSE GREEN — the single worst outcome for a test whose whole
// job is to let Niv stop looking. Each tool therefore carries a liveness gate that
// throws. See `INCIDENTS#13`: `page.route('**/googletagmanager.com/**')` matched
// ZERO requests for months because globs align on `/` and the preceding char is
// `.`, and the silence read as success.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

// ───────────────────────────────────────────────────────────────────────────
// 0 · redaction — copied from sentinel-auth.spec.js:156
// The repo is PUBLIC. Artifacts and logs from Actions are world-readable, so an
// assertion message is a publishing surface.
// ───────────────────────────────────────────────────────────────────────────
export function redact(s) {
  return String(s ?? "")
    .replace(/[\w.+-]+@[\w.-]+\.\w+/g, "<email>")
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, "<jwt>")
    .replace(/sb-[\w-]+-auth-token/g, "<auth-key>");
}

// ───────────────────────────────────────────────────────────────────────────
// 1 · ONBOARDING_PATTERNS — derived from source, never hand-typed
//
// 🔴 THE FAILURE THIS GUARDS AGAINST IS REAL AND WAS MEASURED (24.09).
// `C-059`⓵ asserts the questionnaire NEVER appeared. A hand-typed pattern turns
// that assertion into a permanent silent ✅ the day somebody rewords the screen:
// the pattern stops matching, nothing appears, the test is green forever.
//
// Niv's preferred anchors were measured and BOTH are unavailable:
//   · `data-testid` on OnboardingScreen.jsx …… 0 occurrences (measured)
//   · text from `src/i18n.js` ……………………… the welcome copy is HARDCODED in
//     OnboardingScreen.jsx:308, and split across a <span> (`ברוך הבא ל-` +
//     `<span>SwingEdge</span>`), so it is not even one text node.
//
// 🔴 AND THE OBVIOUS PATTERN COLLIDES. `ברוך הבא` / `ברוך הבא ל-` also render at
// `SwingEdge_App.jsx:4583` — the empty-journal dashboard card `{t.welcomeTitle}`
// = "ברוך הבא ל-SwingEdge!", shown to ANY user with `realTrades.length === 0`.
// The QA account reaches that state every time the sentinel deletes its rows. A
// naive pattern would have made `C-059`⓵ FALSELY RED against a correct app.
//
// ⇒ The patterns are EXTRACTED from the welcome block of OnboardingScreen.jsx and
// then filtered to those that appear NOWHERE ELSE in the app source. Collision is
// therefore MEASURED on every run instead of assumed, and a reword changes the
// pattern with the screen. Renaming the screen away breaks extraction ⇒ hard red
// (`B-272`: extraction failure is never a skip).
// ───────────────────────────────────────────────────────────────────────────

const ONBOARDING_SRC = "src/components/OnboardingScreen.jsx";

function appCorpus() {
  // Every file the user-facing copy can live in. ⚠️ `SwingEdge_App.jsx` sits at the
  // REPO ROOT, not under src/ — a corpus scoped to src/ alone is exactly how the
  // `{t.welcomeTitle}` collision above stayed invisible in the first grep.
  const files = [join(REPO, "SwingEdge_App.jsx")];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.jsx?$/.test(name)) files.push(p);
    }
  };
  walk(join(REPO, "src"));
  return files.map((f) => ({ f, text: readFileSync(f, "utf8") }));
}

function deriveOnboardingPatterns() {
  const path = join(REPO, ONBOARDING_SRC);
  const src = readFileSync(path, "utf8"); // ⛔ try/catch: a missing file is a hard red

  // META-GATE M1 — the welcome screen is anchored on the file's ONLY <h1>.
  // Measured 1/1 on 24.09. Two would mean the file was restructured and the slice
  // below is pointing at something else.
  const h1s = src.match(/<h1\b/g) || [];
  if (h1s.length !== 1) {
    throw new Error(`[eyeTools] M1: expected exactly 1 <h1> in ${ONBOARDING_SRC}, found ${h1s.length}. The welcome-screen anchor moved — fix the extractor, do not soften it.`);
  }

  // The welcome block runs from that <h1> to the end of its CTA <button>.
  const start = src.indexOf("<h1");
  const end = src.indexOf("</button>", start);
  // META-GATE M2 — the CTA must close after the anchor.
  if (end === -1) {
    throw new Error(`[eyeTools] M2: no </button> after the <h1> in ${ONBOARDING_SRC}. Extraction failed.`);
  }
  const block = src.slice(start, end);

  // Strip JSX tags and `{expr}` interpolations; what survives is rendered copy.
  const candidates = block
    .replace(/<[^>]*>/g, "\n")
    .replace(/\{[^{}]*\}/g, "\n")
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length >= 8 && /[֐-׿]/.test(s));

  // COLLISION FILTER — keep only copy that exists in exactly ONE place in the app.
  // This is what drops `ברוך הבא ל-` (also at SwingEdge_App.jsx:4583) and
  // `בואו נתחיל` (also in WelcomeAnnouncement.jsx), by MEASUREMENT.
  const corpus = appCorpus();
  const unique = candidates.filter((c) => {
    let hits = 0;
    for (const { text } of corpus) hits += text.split(c).length - 1;
    return hits === 1;
  });

  // META-GATE M3 — at least two survivors. Measured 24.09: the subtitle
  // ("פלטפורמת המסחר המקצועית שלך") and the "5 שאלות בלבד" bullet.
  // ⛔ Softening this to `>= 1` would let a reword silently halve the anchor.
  if (unique.length < 2) {
    throw new Error(`[eyeTools] M3: only ${unique.length} collision-free onboarding phrase(s) derived from ${ONBOARDING_SRC}. The welcome copy was reworded into strings that also appear elsewhere — re-anchor deliberately, do not lower this gate.`);
  }
  return unique;
}

export const ONBOARDING_PATTERNS = deriveOnboardingPatterns();

// ───────────────────────────────────────────────────────────────────────────
// 2 · TOOL 1 — the flash recorder
//
// The blind spot it closes is NOT `waitFor` (which polls on animation frames and
// may legitimately catch a 150ms flash — a control built on it would be green
// intermittently, and an intermittent control is not a control). It is the
// POST-HOC STEADY-STATE check, the shape people actually write:
//
//     await page.waitForLoadState('networkidle');
//     await expect(page.getByText(X)).toHaveCount(0);   // ✅ green, always
//
// A `MutationObserver` installed at document_start sees every intermediate DOM
// state, so "it was there for 120ms and then React replaced it" is recorded
// rather than missed.
// ───────────────────────────────────────────────────────────────────────────
export async function installFlashRecorder(page, patterns) {
  if (!Array.isArray(patterns) || patterns.length === 0) {
    throw new Error("[eyeTools] installFlashRecorder called with no patterns — a recorder watching nothing reports 'never appeared' about everything.");
  }
  await page.addInitScript((pats) => {
    const seen = {};
    // ⚠️ `seen` alone cannot tell "nothing appeared" from "nothing ever looked".
    // `health` is the second half of the answer and `readFlashes` refuses to
    // return a result without it. See the incident note above the observe call.
    const health = { observing: false, callbacks: 0, scans: 0, error: null, target: null };
    window.__eyeFlashes = seen;
    window.__eyeRecorder = health;

    const note = (text, now) => {
      if (!text) return;
      for (const p of pats) {
        if (text.indexOf(p) === -1) continue;
        if (!seen[p]) seen[p] = { firstSeenMs: now, lastSeenMs: now, sample: p };
        else seen[p].lastSeenMs = now;
      }
    };
    const scan = (records) => {
      health.scans++;
      const now = performance.now();
      // The live document — the steady state at this instant.
      note(document.body ? document.body.textContent : "", now);
      // 🔴 AND the nodes the batch ADDED. A node appended and removed inside one
      // task is gone from `document.body` by the time the callback runs, yet that
      // is EXACTLY the flash this tool was built to catch. Reading only the live
      // body would make the recorder blind to its own reason for existing.
      if (!records) return;
      for (const r of records) {
        if (r.type === "characterData") note(r.target ? r.target.textContent : "", now);
        for (const n of r.addedNodes || []) note(n.textContent, now);
      }
    };

    // 🔴 OBSERVE `document`, ⛔ `document.documentElement`.
    // Measured 24.09 in Chromium: inside an `addInitScript` the document is not
    // yet parsed — `document.documentElement` is `null`, `observe()` throws
    // "parameter 1 is not of type 'Node'", and because `window.__eyeFlashes` was
    // already assigned the liveness gate below still passed. The recorder was
    // DEAD and every test reading it returned "never appeared". `document` is a
    // Node and exists at document_start; with `subtree: true` it covers
    // documentElement from the moment it is created.
    // This was caught by the K3/K4 control arm in `scripts/eye-probe.mjs` on its
    // first run — which is the entire argument for that control arm existing.
    try {
      new MutationObserver((records) => { health.callbacks++; scan(records); })
        .observe(document, { subtree: true, childList: true, characterData: true });
      health.observing = true;
      health.target = "document";
    } catch (e) {
      health.error = String((e && e.message) || e);
    }
    scan(null); // the first paint can precede the first mutation
    document.addEventListener("DOMContentLoaded", () => scan(null));
    window.addEventListener("load", () => scan(null));
  }, patterns);
}

export async function readFlashes(page) {
  const out = await page.evaluate(() => ({
    flashes: window.__eyeFlashes,
    health: window.__eyeRecorder,
  }));
  // LIVENESS GATE ① — `undefined` means addInitScript never ran (a navigation to
  // a page in another context, a crash, a Playwright version change). Returning
  // {} here would read as "nothing ever appeared" — the exact false green this
  // module exists to prevent.
  if (!out || out.flashes === undefined || out.flashes === null) {
    throw new Error("[eyeTools] flash recorder was never installed on this page (window.__eyeFlashes is undefined). This is a hard failure, ⛔ an empty result.");
  }
  const h = out.health;
  // LIVENESS GATE ② — installed but DEAD. This is the failure that actually
  // happened (see the observe note above): the object existed, the observer did
  // not. An assertion of "it never appeared" is only worth something if
  // something was looking.
  if (!h || h.observing !== true) {
    throw new Error(`[eyeTools] flash recorder was installed but is NOT observing (error=${h && h.error}, target=${h && h.target}). Every "never appeared" result from this page would be vacuous. Hard failure, ⛔ an empty result.`);
  }
  if (!(h.callbacks > 0)) {
    throw new Error(`[eyeTools] flash recorder observed ZERO DOM mutations on this page (scans=${h.scans}). A page that never mutated is a page that never rendered — the measurement is vacuous. Hard failure.`);
  }
  return out.flashes;
}

// ───────────────────────────────────────────────────────────────────────────
// 3 · TOOL 2 — the network recorder
//
// Passive. `page.on('request')` observes the request BEFORE routing, so a request
// that a route handler later blocks is still COUNTED. That is what lets
// `C-058`⓵ ("zero writes on an idle authenticated load") be measured truthfully
// while the QA account is simultaneously protected from being written to.
// ───────────────────────────────────────────────────────────────────────────
const REST_RE = /\/rest\/v1\/([A-Za-z0-9_]+)/;

// One extractor, one format (`METHOD table`), used by BOTH the passive recorder
// and the blocker — otherwise the two lists could never be compared.
function tableOf(url) {
  const m = REST_RE.exec(String(url));
  return m ? m[1] : "?";
}

export function recordNetwork(page) {
  const all = [];
  page.on("request", (req) => {
    let u;
    try { u = new URL(req.url()); } catch { return; }
    all.push({ method: req.method(), host: u.host, path: u.pathname, ts: Date.now() });
  });
  return {
    all: () => all.slice(),
    // Every mutating call to PostgREST, whatever the table.
    // ⚠️ The allowlist is EMPTY by decision (Niv, 24.09): an unexpected write to
    // the QA account is red, and the message carries the TABLE NAME so the report
    // says what happened instead of guessing (`B-335`).
    writes: () =>
      all
        .filter((r) => r.method !== "GET" && r.method !== "HEAD" && r.method !== "OPTIONS")
        .filter((r) => REST_RE.test(r.path))
        .map((r) => `${r.method} ${r.path.match(REST_RE)[1]}`),
    // LIVENESS GATE — zero writes is only evidence if the recorder was listening.
    // If the page never talked to PostgREST at all, `writes() === []` is vacuous.
    assertAlive: () => {
      const rest = all.filter((r) => REST_RE.test(r.path));
      if (rest.length === 0) {
        throw new Error("[eyeTools] network recorder saw ZERO /rest/v1 requests. 'No writes' would be vacuous — the page never reached the database. Hard failure, ⛔ a pass.");
      }
      return rest.length;
    },
  };
}

// ───────────────────────────────────────────────────────────────────────────
// 4 · TOOL 3 — the state interceptor
//
// `loadSettings` (src/lib/userSettings.js:169-201) returns THREE statuses and the
// three are not interchangeable:
//   ok     — a row.
//   empty  — `maybeSingle` resolved {data:null,error:null}. AUTHORITATIVE "no row"
//            ⇒ `writable.add` ⇒ the questionnaire is correct.
//   failed — an error ⇒ `writable.delete` ⇒ the questionnaire is WRONG, because
//            showing it overwrites real capital (irreversible) while skipping it
//            costs one sign-in (reversible).
// `200 []` and `500` therefore exercise OPPOSITE branches and need two tests.
//
// ⛔ REGEX, NEVER GLOB (`INCIDENTS#13`).
// ───────────────────────────────────────────────────────────────────────────
const USER_SETTINGS_RE = /\/rest\/v1\/user_settings/;

// ⚠️ THE APP MAKES **TWO** READS OF THIS TABLE AND THEY ARE ⛔ INTERCHANGEABLE.
// `SwingEdge_App.jsx:1815` awaits `migrateFromLocalStorage` FIRST — it issues
// `select=user_id` — and its `check-failed` branch RETURNS at `:1822`. Only when
// that check COMPLETES does `loadSettings` run, and it issues `select=settings`.
// 🔴 Measured 24.09 by `scripts/eye-probe.mjs`: under a blanket 500 the
// `loadSettings` "failed" branch at `:1830` is NEVER REACHED — a mutant aimed at
// it is a NO-OP. The probe is how that was found; the third mode is the fix.
//
//   empty       — both reads answer `[]`  (a brand-new user)
//   error       — both reads answer 500   (the table is unreachable ⇒ `check-failed`)
//   error-blob  — the EXISTENCE check SUCCEEDS ("exists") and the BLOB read 500s.
//                 The only way to reach `loadSettings`'s failure branch, and a real
//                 outage shape: a transient failure between two requests issued
//                 milliseconds apart.
export async function interceptUserSettings(page, mode) {
  if (!["empty", "error", "error-blob"].includes(mode)) {
    throw new Error(`[eyeTools] interceptUserSettings: unknown mode ${JSON.stringify(mode)}`);
  }
  const state = { matched: 0, existence: 0, blob: 0 };
  await page.route(USER_SETTINGS_RE, async (route) => {
    const req = route.request();
    if (req.method() !== "GET") return route.fallback(); // writes are handled by blockAllRestWrites
    state.matched += 1;
    const url = req.url();
    const isExistence = /[?&]select=user_id(&|$)/.test(url);
    if (isExistence) state.existence += 1; else state.blob += 1;

    const fail = () => route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ message: "eyeTools: synthetic read failure" }),
    });

    if (mode === "empty") {
      // PostgREST returns an array; `maybeSingle` turns `[]` into {data:null,error:null}.
      return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    }
    if (mode === "error") return fail();

    // ── error-blob ──
    if (!isExistence) return fail();
    // Echo back the id the caller filtered on. ⛔ a hard-coded uuid — that would be
    // a second copy of a fact the request already carries, and it would rot.
    const m = /[?&]user_id=eq\.([^&]+)/.exec(url);
    if (!m) {
      return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "eyeTools: existence check carried no user_id filter" }) });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ user_id: decodeURIComponent(m[1]) }]),
    });
  });
  return {
    // LIVENESS GATE — this is `INCIDENTS#13` itself. A route that matched nothing
    // means the test measured the UNMODIFIED app while believing it measured the
    // intercepted one.
    assertMatched: () => {
      if (state.matched === 0) {
        throw new Error(`[eyeTools] user_settings interceptor (mode=${mode}) matched ZERO GET requests. The test proved nothing about ${mode}. Hard failure.`);
      }
      return state.matched;
    },
    // ⚠️ `error-blob` is worthless unless the BLOB read actually happened: if the
    // existence check had failed, the app would have returned at `:1822` and the
    // branch under test would never have run. Counting the shapes is the only way
    // to tell those two green results apart.
    assertReachedBlobRead: () => {
      if (state.existence === 0) {
        throw new Error(`[eyeTools] interceptUserSettings(${mode}): the existence check (select=user_id) never fired. The app did not follow the path this mode models. Hard failure.`);
      }
      if (state.blob === 0) {
        throw new Error(`[eyeTools] interceptUserSettings(${mode}): the blob read (select=settings) never fired — the app returned at the migrate check (:1822) instead. The loadSettings failure branch was NOT exercised; a green here would be vacuous. Hard failure.`);
      }
      return { existence: state.existence, blob: state.blob };
    },
  };
}

// Blocks every mutating PostgREST call locally. ⚠️ Scoped to /rest/v1 on purpose:
// /auth/v1/token POSTs are Supabase session refresh and must go through, or the
// page loses its session mid-test and the result means nothing.
export async function blockAllRestWrites(page) {
  const blocked = [];
  await page.route(/\/rest\/v1\//, async (route) => {
    const req = route.request();
    const m = req.method();
    if (m === "GET" || m === "HEAD" || m === "OPTIONS") return route.fallback();
    blocked.push(`${m} ${tableOf(req.url())}`);
    return route.fulfill({ status: 204, body: "" });
  });
  return {
    list: () => blocked.slice(),
    // ⚠️ `recordNetwork` proves only that the app did ⛔ ATTEMPT a write; it is a
    // passive `page.on('request')` listener and it fires whether or not anything
    // reached the network. THIS proves the other half — that every attempt that
    // did happen was fulfilled locally by us and therefore never reached the QA
    // account's row. The two together are the "no writes" claim; either alone is
    // half of it.
    assertInterceptedAll: (observed) => {
      const a = [...observed].sort();
      const b = [...blocked].sort();
      if (a.length !== b.length || a.some((x, i) => x !== b[i])) {
        throw new Error(
          `[eyeTools] a write attempt ESCAPED the local blocker and reached the database.\n` +
          `  observed by the passive recorder: ${a.join(" | ") || "(none)"}\n` +
          `  fulfilled locally by the blocker: ${b.join(" | ") || "(none)"}\n` +
          `Hard failure — this is a real write to the QA account.`
        );
      }
      return b.length;
    },
  };
}

// ───────────────────────────────────────────────────────────────────────────
// 5 · session reuse + the "brand-new user" state
// ───────────────────────────────────────────────────────────────────────────

// Copied verbatim from tests-sentinel/sentinel-auth.spec.js — ⛔ reinvented.
export async function login(page, email, password) {
  await page.goto("/app", { waitUntil: "load" });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.locator('button[type="submit"]').first().click();
  await page.locator('[data-tour-tab="dashboard"]').waitFor({ state: "visible", timeout: 20_000 });
}

// A brand-new account is: a valid session, NO user-scoped local keys, NO DB row.
// Reusing a logged-in `storageState` as-is would carry `swingEdgeOnboarding`, and
// `SwingEdge_App.jsx:1194` seeds `showOnboarding` from it — so the `200 []` test
// would take the `else if (showOnboarding === null)` branch as FALSE and the
// questionnaire would not appear, for a reason that has nothing to do with the
// row. Stripping the `swingEdge*` keys is the same operation production performs
// on logout (`src/lib/userScopedStorage.js`), which is why it is the honest model.
export function freshUserState(state) {
  return {
    ...state,
    origins: (state.origins || []).map((o) => ({
      ...o,
      localStorage: (o.localStorage || []).filter((kv) => !kv.name.startsWith("swingEdge")),
    })),
  };
}
