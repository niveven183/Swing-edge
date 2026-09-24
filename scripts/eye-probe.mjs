// scripts/eye-probe.mjs — the RED-BEFORE arm for tests/eye.spec.js.
//
//   npm run probe:eye
//
// ⛔ NOT in the verify chain — it needs a real browser and a real `vite build`,
// like `test:smoke` and `probe:boundary`. `probe:` is a different prefix from
// `test:`, so the "33 חוליות ואז build" count in CLAUDE.md §7 does ⛔ not move
// (measured: `npm run test:registry`, EXIT=0, 24.09).
//
// ── WHY IT EXISTS ───────────────────────────────────────────────────────────
// The closure rule this wave rests on (DECISIONS, 24.09) lets a `C-` item close
// on a COMPLETED green CI run — *provided the assertion was observed red on
// deliberately broken code*. A test that has never been seen red is a green
// light wired to nothing. This script is where the red is produced.
//
// ── WHY IT IS HERMETIC ──────────────────────────────────────────────────────
// `.env` carries three names only — VITE_SUPABASE_URL · VITE_SUPABASE_ANON_KEY
// · VITE_SENTRY_DSN. There are ⛔ QA credentials locally (measured), and this
// script will ⛔ ask for any (CLAUDE.md §12). So each tree is built with a
// SYNTHETIC Supabase origin injected through the shell environment, and every
// request to it is fulfilled locally:
//
//   · zero secrets          — no credential is read, typed or printed
//   · zero network          — nothing leaves the machine
//   · zero writes           — the real QA row cannot be reached from here
//
// Verified empirically: the only `*.supabase.co` host present in the probe
// bundle is the synthetic one. A build that leaked the real project would put a
// second host in `assets/*.js`, and M5 below measures exactly that.
//
// ── THE MUTANTS ─────────────────────────────────────────────────────────────
// One per test, each a single targeted source replacement, applied IN PLACE and
// restored in a `finally`. 🔴 A no-op mutant produces a FALSE red-before — it
// certifies a blind test — so every replacement is gated on matching EXACTLY
// ONCE (`B-272`), and the restore is verified with `git diff --exit-code`.
//
// ⛔ Editing bytes in the minified bundle instead: brittle, and brittleness
// there IS the no-op of the paragraph above.
//
// ── THE CONTROL ARM (K1–K4) MUST STAY GREEN ─────────────────────────────────
// K2 is the whole argument for the flash recorder existing. It runs the
// post-hoc steady-state check — the check anybody would have written —
//
//     await page.waitForLoadState('networkidle');
//     await expect(page.getByText(…)).toHaveCount(0);   // ✅ green
//
// against the SAME mutant tree on which the flash recorder goes red. A red K2
// would mean the recorder proved nothing that a plain assertion could not.
// ⛔ A green control is not a bonus here; a green control is the requirement.
//
// K4 is the POSITIVE CONTROL for the derived patterns: it requires the
// onboarding copy to actually be *seen* by the recorder on a tree where the
// questionnaire is genuinely shown. Without it, a reworded screen would make
// `C-059⓵` silently green forever against patterns that match nothing.
//
// ── WHAT THIS STILL DOES NOT COVER ──────────────────────────────────────────
// The real QA account · real Supabase auth · the real production bundle · RTL ·
// contrast · a screen reader. Those live in the CI arm (`tests/eye.spec.js`)
// and in the `C-` eye checks, and nowhere else.

import { createServer } from "node:http";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, extname, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { chromium } from "playwright";

import {
  ONBOARDING_PATTERNS,
  installFlashRecorder,
  readFlashes,
  recordNetwork,
  interceptUserSettings,
  blockAllRestWrites,
  login,
  freshUserState,
  redact,
} from "../tests/lib/eyeTools.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const APP = join(ROOT, "SwingEdge_App.jsx");
const USER_SETTINGS = join(ROOT, "src", "lib", "userSettings.js");
const SPEC = join(ROOT, "tests", "eye.spec.js");

// Synthetic origin. ⛔ Never the real project — see the header.
const SB_HOST = "eyeprobe.supabase.co";
const SB_URL = `https://${SB_HOST}`;
const SB_ANON = "eyeprobe-anon-key-not-a-secret";
const USER_ID = "00000000-0000-4000-8000-0000000000ee";
const DUMMY_EMAIL = "qa@eye-probe.invalid"; // .invalid is reserved by RFC 2606
const DUMMY_PASSWORD = "eye-probe-not-a-secret";

let failures = 0;
const ok = (name, cond, detail = "") => {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    failures++;
    console.log(`  ✗ ${name}${detail ? ` — ${redact(detail)}` : ""}`);
  }
};
const die = (msg) => {
  console.log(`\n❌ eye-probe: ${redact(msg)}`);
  process.exit(1);
};

// ═══ META — the probe must not be able to pass by measuring nothing ═════════
console.log("\n── META ───────────────────────────────────────────────────");

// M1 — the tools import and derive. A throw here is the extractor meta-gate in
// eyeTools firing, and it is a hard red by design (B-272), ⛔ a skip.
ok(
  `M1 eyeTools derived ${ONBOARDING_PATTERNS.length} collision-free onboarding pattern(s)`,
  Array.isArray(ONBOARDING_PATTERNS) && ONBOARDING_PATTERNS.length >= 2,
  `patterns=${ONBOARDING_PATTERNS.length}`
);

// M2 — the probe and the CI spec must not drift apart. This is SHAPE only: it
// proves the four titles still live in the spec, ⛔ that they assert the same
// thing. Stated plainly because a shape gate read as a value gate is `R-4`.
const specSrc = readFileSync(SPEC, "utf8");
const SPEC_TITLES = ["C-059⓸", "C-059⓵", "C-036", "C-058⓵"];
const missingTitles = SPEC_TITLES.filter((t) => !specSrc.includes(t));
ok(
  "M2 all four test identifiers still exist in tests/eye.spec.js (shape only)",
  missingTitles.length === 0,
  `missing=${missingTitles.join(",")}`
);

// M3 — the spec consumes the same tools this probe consumes. A spec that
// stopped importing the recorder would leave this probe proving a tool nobody
// uses.
const REQUIRED_IMPORTS = [
  "ONBOARDING_PATTERNS",
  "installFlashRecorder",
  "readFlashes",
  "recordNetwork",
  "interceptUserSettings",
  "blockAllRestWrites",
  "freshUserState",
];
const missingImports = REQUIRED_IMPORTS.filter((n) => !specSrc.includes(n));
ok(
  "M3 the spec imports every tool this probe exercises",
  missingImports.length === 0,
  `missing=${missingImports.join(",")}`
);

// M4 — the working tree must be clean for the two files we mutate in place, so
// that `git diff --exit-code` after the restore is a real verification and not
// a comparison against dirt that was already there.
for (const f of [APP, USER_SETTINGS]) {
  try {
    execFileSync("git", ["diff", "--quiet", "--", f], { cwd: ROOT });
  } catch {
    die(
      `${f.replace(ROOT + "/", "")} has uncommitted changes. This probe edits it in place ` +
        `and verifies the restore with \`git diff\`. Commit or stash first — ⛔ the restore ` +
        `check would be meaningless.`
    );
  }
}
ok("M4 both mutation targets are clean in git (restore is verifiable)", true);

// ═══ MUTANTS ════════════════════════════════════════════════════════════════
// Each entry: the ONE string replaced, and why that string is the bug.
const MUTANTS = {
  A: {
    test: "C-059⓸",
    file: USER_SETTINGS,
    what: 'loadSettings: "empty" ⇒ "failed" — an authoritative "no row" is read as a failed read',
    find: 'return { status: "empty", settings: mirror };',
    repl: 'return { status: "failed", settings: mirror };',
  },
  B: {
    test: "C-059⓵",
    file: APP,
    // ⚠️ Chosen so the questionnaire is rendered and then CORRECTED by hydration
    // (the row carries onboarding.completed:true ⇒ setShowOnboarding(false)).
    // A mutant that showed it permanently would redden K2 as well, and a red
    // control voids the treatment.
    what: "showOnboarding lazy init forced to `true` ⇒ the questionnaire is rendered before hydration settles, then corrected — a genuine FLASH",
    find:
      '    try { if (localStorage.getItem("swingEdgeOnboarding")) return false; } catch { }\n' +
      "    return isSupabaseConfigured ? null : true;",
    repl: "    return true;",
  },
  // 🔴 C-036 IS GUARDED TWICE AND NEEDS TWO MUTANTS — measured, ⛔ assumed.
  // The first draft of this probe had ONE mutant here, aimed at `loadFailed`, and
  // it came back a NO-OP. Reason: `SwingEdge_App.jsx:1815` awaits
  // `migrateFromLocalStorage` FIRST and its `check-failed` branch RETURNS at
  // `:1822`, so under a blanket 500 `loadSettings` is never called at all. One
  // mutant would have certified C-036 "proven red" with half its promise blind —
  // which is the precise failure mode this probe exists to prevent.
  C: {
    test: "C-036⒜",
    mode: "error",
    file: APP,
    what: 'the :1822 guard inverted — a check we could not complete is treated as "this user is new"',
    find: 'setShowOnboarding(false); // B-365 — a failed read is ⛔ "this user is new"',
    repl: 'setShowOnboarding(true); // B-365 — a failed read is ⛔ "this user is new"',
  },
  E: {
    test: "C-036⒝",
    mode: "error-blob",
    file: USER_SETTINGS,
    what: 'loadFailed: "failed" ⇒ "empty" — a FAILED blob read is treated as "this user is new"',
    find: 'return { status: "failed", settings: readMirror() };',
    repl: 'return { status: "empty", settings: readMirror() };',
  },
  D: {
    test: "C-058⓵",
    file: USER_SETTINGS,
    what: "the B-361 fix removed: the hash of the blob just READ is no longer seeded ⇒ the debounce re-sends it",
    find: "lastSent.set(userId, stableStringify(data.settings));",
    repl: "lastSent.delete(userId);",
  },
};

// M5 is measured per build (below). M6: every mutant matches exactly once.
for (const [key, m] of Object.entries(MUTANTS)) {
  const src = readFileSync(m.file, "utf8");
  const hits = src.split(m.find).length - 1;
  if (hits !== 1) {
    die(
      `M6 mutant ${key} (${m.test}): its anchor matched ${hits} time(s), expected exactly 1. ` +
        `A no-op mutant certifies a BLIND test — re-anchor it, ⛔ soften this gate (B-272).`
    );
  }
}
ok(`M6 all ${Object.keys(MUTANTS).length} mutants match their anchor exactly once`, true);

// ═══ BUILD ══════════════════════════════════════════════════════════════════
const WORK = await mkdtemp(join(tmpdir(), "eye-probe-"));
const builtTrees = [];

async function buildTree(key) {
  const outDir = join(WORK, `dist-${key}`);
  const m = key === "base" ? null : MUTANTS[key];
  let original = null;

  if (m) {
    original = await readFile(m.file, "utf8");
    // The exactly-once gate already ran above; re-assert on the live bytes so a
    // concurrent edit cannot slip a second match in between.
    if (original.split(m.find).length - 1 !== 1) {
      die(`mutant ${key}: anchor count moved between the meta gate and the build. Aborting.`);
    }
    await writeFile(m.file, original.replace(m.find, m.repl), "utf8");
  }

  try {
    execFileSync("npx", ["vite", "build", "--outDir", outDir, "--emptyOutDir", "--logLevel", "error"], {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        VITE_SUPABASE_URL: SB_URL,
        VITE_SUPABASE_ANON_KEY: SB_ANON,
        VITE_SENTRY_DSN: "",
      },
    });
  } finally {
    if (m) {
      await writeFile(m.file, original, "utf8");
      try {
        execFileSync("git", ["diff", "--exit-code", "--", m.file], { cwd: ROOT });
      } catch {
        die(
          `mutant ${key}: the source file was NOT restored byte-identically. ` +
            `Restore it by hand before doing anything else: git checkout -- ${m.file}`
        );
      }
    }
  }

  builtTrees.push({ key, outDir });
  return outDir;
}

// ═══ SERVER ═════════════════════════════════════════════════════════════════
const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json",
};

async function serve(distDir) {
  const server = createServer(async (req, res) => {
    const url = req.url.split("?")[0];
    const rel = url === "/" ? "index.html" : url.replace(/^\//, "");
    try {
      const buf = await readFile(join(distDir, rel));
      res.writeHead(200, { "content-type": TYPES[extname(rel)] || "application/octet-stream" });
      return res.end(buf);
    } catch {
      // SPA fallback — /app must reach index.html, exactly as Vercel rewrites it.
      if (!extname(rel)) {
        try {
          const buf = await readFile(join(distDir, "index.html"));
          res.writeHead(200, { "content-type": "text/html" });
          return res.end(buf);
        } catch {}
      }
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("Not Found");
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { server, port: server.address().port };
}

// ═══ SYNTHETIC SUPABASE ═════════════════════════════════════════════════════
const b64url = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
function session() {
  const now = Math.floor(Date.now() / 1000);
  const access_token = [
    b64url({ alg: "HS256", typ: "JWT" }),
    b64url({ sub: USER_ID, aud: "authenticated", role: "authenticated", iat: now, exp: now + 3600, email: DUMMY_EMAIL }),
    "eye-probe-not-a-signature",
  ].join(".");
  return {
    access_token,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: now + 3600,
    refresh_token: "eye-probe-refresh",
    user: {
      id: USER_ID,
      aud: "authenticated",
      role: "authenticated",
      email: DUMMY_EMAIL,
      app_metadata: { provider: "email" },
      user_metadata: {},
      created_at: new Date(0).toISOString(),
    },
  };
}

// Context-level handler for the synthetic origin. Page-level handlers installed
// by eyeTools sit ABOVE this one and reach it through `route.fallback()`, which
// is exactly the layering tests/eye.spec.js relies on.
//
// ⚠️ `/rest/v1/trades` deliberately answers `[]`. An empty journal makes
// SwingEdge_App.jsx:4586 render `{t.welcomeTitle}` = "ברוך הבא ל-SwingEdge!" on
// the DASHBOARD — the very collision the pattern derivation filters out. Serving
// an empty journal means the probe exercises that collision on every run instead
// of assuming the filter works.
async function installSupabase(ctx, { row, onWrite }) {
  await ctx.route(new RegExp(`https://${SB_HOST.replace(/\./g, "\\.")}/`), async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const method = req.method();

    if (method === "OPTIONS") {
      return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*" }, body: "" });
    }
    if (path.startsWith("/auth/v1/token") || path.startsWith("/auth/v1/signup")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session()) });
    }
    if (path.startsWith("/auth/v1/user")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session().user) });
    }
    if (path.startsWith("/auth/v1/logout")) {
      return route.fulfill({ status: 204, body: "" });
    }
    if (path.startsWith("/rest/v1/user_settings")) {
      if (method === "GET") {
        const body = row === null ? "[]" : JSON.stringify([{ user_id: USER_ID, settings: row }]);
        return route.fulfill({ status: 200, contentType: "application/json", body });
      }
      if (onWrite) onWrite(req.postData());
      return route.fulfill({ status: 201, contentType: "application/json", body: "[]" });
    }
    if (method === "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    }
    return route.fulfill({ status: 204, body: "" });
  });
}

// ═══ CALIBRATION ════════════════════════════════════════════════════════════
// `C-058⓵` asserts that an idle authenticated load writes NOTHING. That is only
// meaningful against a row the app already agrees with — the B-361 fixpoint.
// Rather than hand-writing that blob (which would be an assumption, and would
// rot the first time a key is added to the persist patch), we MEASURE it: serve
// a seed row, capture what the app upserts, feed it back, and repeat until two
// consecutive rounds are byte-identical.
//
// ⚠️ Calibration runs on the BASELINE tree only, and the fixpoint it finds is
// then held constant for every tree. Calibrating per-tree would let mutant D
// calibrate away the very write it is supposed to cause.
const SEED_ROW = {
  capital: 10000,
  onboarding: {
    completed: true,
    answers: {},
    profile: {},
    completedAt: "2026-01-01T00:00:00.000Z",
  },
};

async function calibrate(port, browser) {
  let row = SEED_ROW;
  let previous = null;
  for (let round = 1; round <= 4; round++) {
    let captured = null;
    const ctx = await browser.newContext({ baseURL: `http://127.0.0.1:${port}` });
    await installSupabase(ctx, {
      row,
      onWrite: (body) => {
        if (captured) return;
        try {
          const parsed = JSON.parse(body);
          const one = Array.isArray(parsed) ? parsed[0] : parsed;
          if (one && one.settings) captured = one.settings;
        } catch {}
      },
    });
    const page = await ctx.newPage();
    await login(page, DUMMY_EMAIL, DUMMY_PASSWORD);
    await page.waitForTimeout(4000);
    await ctx.close();

    if (!captured) {
      // No write at all ⇒ the app already agrees with `row`. That IS the fixpoint.
      return { row, rounds: round, converged: true };
    }
    const now = JSON.stringify(captured);
    if (previous === now) return { row: captured, rounds: round, converged: true };
    previous = now;
    row = captured;
  }
  return { row, rounds: 4, converged: false };
}

// ═══ THE FOUR TESTS, re-stated against the hermetic tree ════════════════════
// ⚠️ These mirror tests/eye.spec.js. They use the REAL tools — a stub here would
// measure the stub. M2/M3 above hold the two files from drifting apart in shape;
// ⛔ nothing can hold them from drifting in meaning except reading both.

async function testC059d(browser, port, state) {
  // 200 [] (no row) ⇒ the questionnaire IS shown.
  const ctx = await browser.newContext({
    baseURL: `http://127.0.0.1:${port}`,
    storageState: freshUserState(state),
  });
  const serverWrites = [];
  await installSupabase(ctx, { row: null, onWrite: () => serverWrites.push("user_settings") });
  const page = await ctx.newPage();
  try {
    const net = recordNetwork(page);
    const blocker = await blockAllRestWrites(page);
    const iv = await interceptUserSettings(page, "empty");
    await installFlashRecorder(page, ONBOARDING_PATTERNS);
    await page.goto("/app", { waitUntil: "load" });

    const loggedOut = await page.locator('input[autocomplete="current-password"]').count();
    let visible = false;
    try {
      await page.getByText(ONBOARDING_PATTERNS[0], { exact: false }).first().waitFor({ state: "visible", timeout: 20_000 });
      visible = true;
    } catch {}
    const flashes = await readFlashes(page);
    const missing = ONBOARDING_PATTERNS.filter((p) => !flashes[p]);
    return {
      loggedOut,
      visible,
      missing,
      matched: (() => { try { return iv.assertMatched(); } catch (e) { return 0; } })(),
      writes: net.writes(),
      escaped: escapedWrites(net, blocker),
      serverWrites,
      restSeen: (() => { try { return net.assertAlive(); } catch { return 0; } })(),
      flashCount: Object.keys(flashes).length,
    };
  } finally {
    await ctx.close();
  }
}

async function testC059a(browser, port, row) {
  // Veteran login ⇒ the questionnaire never appears, not even for a frame.
  // The only test that logs in fresh, and the only one with no read interceptor.
  const ctx = await browser.newContext({ baseURL: `http://127.0.0.1:${port}` });
  const serverWrites = [];
  await installSupabase(ctx, { row, onWrite: () => serverWrites.push("user_settings") });
  const page = await ctx.newPage();
  try {
    const net = recordNetwork(page);
    const blocker = await blockAllRestWrites(page);
    await installFlashRecorder(page, ONBOARDING_PATTERNS);

    await login(page, DUMMY_EMAIL, DUMMY_PASSWORD);
    await page.waitForLoadState("networkidle").catch(() => {});

    // The post-hoc steady-state check — the control arm (§0(iii)).
    const steadyState = await page.getByText(ONBOARDING_PATTERNS[0], { exact: false }).count();
    const flashes = await readFlashes(page);
    return {
      steadyState,
      appeared: Object.keys(flashes),
      timings: Object.fromEntries(Object.entries(flashes).map(([p, v]) => [p, Math.round(v.firstSeenMs)])),
      recorderInstalled: flashes !== undefined && flashes !== null,
      writes: net.writes(),
      escaped: escapedWrites(net, blocker),
      serverWrites,
    };
  } finally {
    await ctx.close();
  }
}

// ⚠️ `mode` is a PARAMETER because C-036 has two guards and they are reachable
// only by two different request shapes — see the comment on MUTANTS.C.
async function testC036(browser, port, state, mode) {
  // A failed read ⇒ the questionnaire is NOT shown.
  const serverWrites = [];
  const ctx = await browser.newContext({
    baseURL: `http://127.0.0.1:${port}`,
    storageState: freshUserState(state),
  });
  await installSupabase(ctx, { row: null, onWrite: () => serverWrites.push("user_settings") });
  const page = await ctx.newPage();
  try {
    const net = recordNetwork(page);
    const blocker = await blockAllRestWrites(page);
    const iv = await interceptUserSettings(page, mode);
    await installFlashRecorder(page, ONBOARDING_PATTERNS);
    await page.goto("/app", { waitUntil: "load" });

    let rendered = false;
    try {
      await page.locator('[data-tour-tab="dashboard"]').waitFor({ state: "visible", timeout: 25_000 });
      rendered = true;
    } catch {}
    const flashes = await readFlashes(page);
    return {
      rendered,
      appeared: Object.keys(flashes),
      matched: (() => { try { return iv.assertMatched(); } catch { return 0; } })(),
      // Phase 2 is vacuous unless the BLOB read actually ran — if the existence
      // check had failed we would be re-measuring phase 1 under a second name.
      reachedBlob: (() => { try { return !!iv.assertReachedBlobRead(); } catch { return false; } })(),
      writes: net.writes(),
      escaped: escapedWrites(net, blocker),
      serverWrites,
    };
  } finally {
    await ctx.close();
  }
}

// `recordNetwork` proves the app did ⛔ ATTEMPT a write. This proves the other
// half: every attempt was fulfilled LOCALLY and never reached the server. A
// non-empty result is a write that escaped the blocker.
function escapedWrites(net, blocker) {
  try {
    blocker.assertInterceptedAll(net.writes());
    return [];
  } catch (e) {
    return [String(e.message || e)];
  }
}

async function testC058a(browser, port, state, row) {
  // Idle authenticated load ⇒ zero writes.
  const ctx = await browser.newContext({ baseURL: `http://127.0.0.1:${port}`, storageState: state });
  const serverWrites = [];
  await installSupabase(ctx, { row, onWrite: () => serverWrites.push("user_settings") });
  const page = await ctx.newPage();
  try {
    const net = recordNetwork(page);
    const blocker = await blockAllRestWrites(page);
    await page.goto("/app", { waitUntil: "load" });
    let rendered = false;
    try {
      await page.locator('[data-tour-tab="dashboard"]').waitFor({ state: "visible", timeout: 25_000 });
      rendered = true;
    } catch {}
    await page.waitForTimeout(8_000); // debounce is 1000ms; unload flush is separate
    return {
      rendered,
      writes: net.writes(),
      escaped: escapedWrites(net, blocker),
      serverWrites,
      restSeen: (() => { try { return net.assertAlive(); } catch { return 0; } })(),
    };
  } finally {
    await ctx.close();
  }
}

async function loginState(browser, port, row) {
  const ctx = await browser.newContext({ baseURL: `http://127.0.0.1:${port}` });
  await installSupabase(ctx, { row });
  const page = await ctx.newPage();
  await login(page, DUMMY_EMAIL, DUMMY_PASSWORD);
  const state = await ctx.storageState();
  await ctx.close();
  return state;
}

// ═══ RUN ════════════════════════════════════════════════════════════════════
let browser;
try {
  console.log("\n── BUILD ──────────────────────────────────────────────────");
  const distBase = await buildTree("base");

  // M5 — the synthetic origin is the ONLY Supabase host in the built bundle.
  const bundleHosts = new Set();
  {
    const { readdirSync } = await import("node:fs");
    for (const f of readdirSync(join(distBase, "assets"))) {
      if (!f.endsWith(".js")) continue;
      const txt = readFileSync(join(distBase, "assets", f), "utf8");
      for (const h of txt.match(/[a-z0-9]{6,}\.supabase\.co/g) || []) bundleHosts.add(h);
    }
  }
  ok(
    "M5 the probe bundle contains the synthetic Supabase host and no other",
    bundleHosts.size === 1 && bundleHosts.has(SB_HOST),
    `hosts=${[...bundleHosts].join(",")}`
  );
  console.log(`  · base tree built`);

  browser = await chromium.launch();
  const { server: srvBase, port: portBase } = await serve(distBase);

  console.log("\n── CALIBRATION (measuring the B-361 fixpoint row) ─────────");
  const cal = await calibrate(portBase, browser);
  ok(
    `M7 the persist fixpoint converged in ${cal.rounds} round(s)`,
    cal.converged,
    "the app never stopped rewriting its own row — C-058⓵ would be measuring calibration noise, ⛔ the fix"
  );
  const ROW = cal.row;
  console.log(`  · row keys: ${Object.keys(ROW).sort().join(", ")}`);

  const stateBase = await loginState(browser, portBase, ROW);

  // ── BASELINE: all four tests must be GREEN on the real tree ───────────────
  console.log("\n── BASELINE (real tree — all four must be GREEN) ──────────");
  const bD = await testC059d(browser, portBase, stateBase);
  ok("⓸ C-059⓸ baseline: storageState survived the reload", bD.loggedOut === 0, `password inputs=${bD.loggedOut}`);
  ok("⓸ C-059⓸ baseline: 200 [] ⇒ the questionnaire IS shown", bD.visible);
  ok("⓸ C-059⓸ baseline: the user_settings interceptor matched", bD.matched > 0, `matched=${bD.matched}`);
  // ⚠️ THE ONE ALLOWED WRITE IN THIS FILE, AND IT IS A MEASUREMENT, ⛔ A SOFTENING.
  // Under a synthetic `200 []` the app is SUPPOSED to write: `userSettings.js:194`
  // marks `empty` WRITABLE on purpose ("a brand-new user must be able to write his
  // first row"). So `POST user_settings` is EXPECTED here — Niv's rule is that an
  // *unexpected* write is red. ⛔ its presence is asserted either: the debounce is
  // 1000ms and we assert as soon as the questionnaire is visible, so whether it has
  // fired yet is a race, and racing assertions are how a suite starts lying.
  ok(
    "⓸ C-059⓸ baseline: no write to any table OTHER than the expected new-user row",
    bD.writes.filter((w) => w !== "POST user_settings").length === 0,
    bD.writes.join(" | ")
  );
  ok("⓸ C-059⓸ baseline: every write attempt was blocked locally", bD.escaped.length === 0, bD.escaped.join(" | "));
  ok("⓸ C-059⓸ baseline: the SERVER saw zero writes (structural)", bD.serverWrites.length === 0, bD.serverWrites.join(" | "));

  const bA = await testC059a(browser, portBase, ROW);
  ok("⓵ C-059⓵ baseline: no onboarding copy at any frame", bA.appeared.length === 0, JSON.stringify(bA.timings));
  ok("⓵ C-059⓵ baseline: zero writes to any table", bA.writes.length === 0, bA.writes.join(" | "));
  ok("⓵ C-059⓵ baseline: the SERVER saw zero writes (structural)", bA.serverWrites.length === 0, bA.serverWrites.join(" | "));

  // ── C-036 has TWO guards and they need two request shapes — see MUTANTS.C ──
  const b36a = await testC036(browser, portBase, stateBase, "error");
  ok("③ C-036⒜ baseline: the app rendered (assertion is not vacuous)", b36a.rendered);
  ok("③ C-036⒜ baseline: whole-table 500 ⇒ the questionnaire is NOT shown", b36a.appeared.length === 0, b36a.appeared.join(" | "));
  ok("③ C-036⒜ baseline: the user_settings interceptor matched", b36a.matched > 0, `matched=${b36a.matched}`);
  ok("③ C-036⒜ baseline: the SERVER saw zero writes (structural)", b36a.serverWrites.length === 0, b36a.serverWrites.join(" | "));

  const b36b = await testC036(browser, portBase, stateBase, "error-blob");
  ok("③ C-036⒝ baseline: the app rendered (assertion is not vacuous)", b36b.rendered);
  ok("③ C-036⒝ baseline: row EXISTS + blob read 500s ⇒ the questionnaire is NOT shown", b36b.appeared.length === 0, b36b.appeared.join(" | "));
  // 🔴 Without this, ⒝ is just ⒜ under a second name: if the existence check had
  // failed the app would have returned at :1822 and :1830 would never have run.
  ok("③ C-036⒝ baseline: the loadSettings failure branch was actually REACHED", b36b.reachedBlob, "the app returned at the migrate check (:1822) — ⒝ would be vacuous");
  ok("③ C-036⒝ baseline: the SERVER saw zero writes (structural)", b36b.serverWrites.length === 0, b36b.serverWrites.join(" | "));

  const b58 = await testC058a(browser, portBase, stateBase, ROW);
  ok("④ C-058⓵ baseline: the app rendered", b58.rendered);
  ok("④ C-058⓵ baseline: idle authenticated load ⇒ ZERO writes", b58.writes.length === 0, b58.writes.join(" | "));
  ok("④ C-058⓵ baseline: the recorder saw real /rest/v1 traffic", b58.restSeen > 0, `rest=${b58.restSeen}`);
  ok("④ C-058⓵ baseline: the SERVER saw zero writes (structural)", b58.serverWrites.length === 0, b58.serverWrites.join(" | "));

  // ── CONTROL ARM ───────────────────────────────────────────────────────────
  console.log("\n── CONTROL ARM K1·K3·K4 (must be GREEN) ───────────────────");
  ok("K1 baseline ⓵: the post-hoc steady-state check is green", bA.steadyState === 0, `count=${bA.steadyState}`);
  ok("K3 baseline ⓵: the recorder was actually installed — 'no flash' ⛔ 'no recorder'", bA.recorderInstalled);
  ok(
    `K4 baseline ⓸: all ${ONBOARDING_PATTERNS.length} derived patterns were SEEN (positive control)`,
    bD.missing.length === 0,
    `never matched: ${bD.missing.join(" | ")} — the screen copy was reworded and C-059⓵ is now blind`
  );

  srvBase.close();

  // ── MUTANTS: each test must go RED on its own mutant ──────────────────────
  const matrix = [];
  for (const key of ["A", "B", "C", "E", "D"]) {
    const m = MUTANTS[key];
    console.log(`\n── MUTANT ${key} → ${m.test} ────────────────────────────────`);
    console.log(`  · ${m.what}`);
    const dist = await buildTree(key);
    const { server, port } = await serve(dist);
    try {
      if (key === "A") {
        const st = await loginState(browser, port, ROW);
        const r = await testC059d(browser, port, st);
        ok(`⓸ C-059⓸ goes RED on mutant A (questionnaire absent)`, r.visible === false, `visible=${r.visible}`);
        matrix.push([m.test, key, r.visible === false]);
      } else if (key === "B") {
        const r = await testC059a(browser, port, ROW);
        ok(`⓵ C-059⓵ goes RED on mutant B (flash recorded)`, r.appeared.length > 0, `appeared=${r.appeared.length}`);
        console.log(`    flash timings: ${JSON.stringify(r.timings)}`);
        // 🔴 K2 — the whole argument for the recorder.
        ok(
          "K2 CONTROL on mutant B: the post-hoc steady-state check is GREEN while the recorder is RED",
          r.steadyState === 0,
          `count=${r.steadyState} — a RED control would mean a plain assertion could have caught this, ⇒ the recorder proves nothing`
        );
        matrix.push([m.test, key, r.appeared.length > 0]);
      } else if (key === "C" || key === "E") {
        const st = await loginState(browser, port, ROW);
        const r = await testC036(browser, port, st, m.mode);
        // For ⒝ a green "questionnaire absent" would be indistinguishable from
        // "the branch never ran", so the reachability gate is checked FIRST.
        if (key === "E") {
          ok("③ C-036⒝ mutant E: the loadSettings failure branch was REACHED", r.reachedBlob, "otherwise the red/green below means nothing");
        }
        ok(`③ ${m.test} goes RED on mutant ${key} (questionnaire shown on a FAILED read)`, r.appeared.length > 0, `appeared=${r.appeared.join(" | ")}`);
        matrix.push([m.test, key, r.appeared.length > 0]);
      } else {
        const st = await loginState(browser, port, ROW);
        const r = await testC058a(browser, port, st, ROW);
        ok(`④ C-058⓵ goes RED on mutant D (idle load wrote)`, r.writes.length > 0, `writes=${r.writes.join(" | ")}`);
        console.log(`    writes observed: ${r.writes.join(" | ") || "(none)"}`);
        matrix.push([m.test, key, r.writes.length > 0]);
      }
    } finally {
      server.close();
    }
  }

  console.log("\n── RED-BEFORE MATRIX ──────────────────────────────────────");
  for (const [test, key, red] of matrix) {
    console.log(`  ${red ? "🔴" : "⚪"} ${test.padEnd(9)} mutant ${key}: ${red ? "RED on the mutant tree" : "GREEN — ⛔ the mutant is a NO-OP"}`);
  }
} finally {
  if (browser) await browser.close();
  await rm(WORK, { recursive: true, force: true }).catch(() => {});
  // Last line of defence: the two sources must be exactly as git has them.
  for (const f of [APP, USER_SETTINGS]) {
    try {
      execFileSync("git", ["diff", "--quiet", "--", f], { cwd: ROOT });
    } catch {
      console.log(`\n🔴 ${f.replace(ROOT + "/", "")} WAS NOT RESTORED. Run: git checkout -- ${f}`);
      failures++;
    }
  }
}

console.log("\n" + "─".repeat(60));
if (failures) {
  console.log(`❌ eye-probe: ${failures} FAILED`);
  process.exit(1);
}
console.log("✅ eye-probe: every assertion passed, in real Chromium, on real `vite build` output.");
// ⚠️ DERIVED, ⛔ hand-written. An earlier draft of this line said "four" and was
// wrong the moment C-036 grew its second guard — that is `B-324` in miniature,
// inside the very script whose job is to refuse unmeasured claims.
console.log(
  `   ⚠️  ${Object.keys(MUTANTS).length} assertion(s) observed RED on ${Object.keys(MUTANTS).length} deliberately broken trees and GREEN on the`
);
console.log("   real one. The control arm stayed green ⇒ the flash recorder is measuring");
console.log("   something a post-hoc assertion cannot see.");
console.log("   ⛔ NOT covered here: the real QA account · real Supabase auth · the production");
console.log("   bundle · RTL · contrast · a screen reader. Those live in CI and in the C- checks.");
