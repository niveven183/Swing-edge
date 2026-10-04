// scripts/lib/eyeBuild.mjs — the shared machinery of the hermetic red-before probes
// (scripts/eye-playbook-probe.mjs · scripts/eye-overlay-probe.mjs): mutate the tree in place,
// build it against the synthetic Supabase origin, restore and PROVE the restore, serve the
// build, and run one tests-eye spec against it.
//
// One copy, two probes: the rules below were each learned by a red run (04.10) and must not
// be re-learned per probe (R-6).

import { createServer } from "node:http";
import { readFile, writeFile, readdir } from "node:fs/promises";
import { readFileSync, existsSync } from "node:fs";
import { execFileSync, spawn } from "node:child_process";
import { join, extname } from "node:path";
import { SB_HOST } from "../../tests-eye/hermetic.js";

/** Exactly-once anchor gate (B-272 — a no-op mutant certifies a blind test). */
export function makeOnce(die) {
  return (src, find, label) => {
    const n = typeof find === "string" ? src.split(find).length - 1 : (src.match(find) || []).length;
    if (n !== 1) die(`${label}: anchor matched ${n}× (must be exactly 1 — a no-op mutant is a blind test, B-272)`);
  };
}

/**
 * Two different failures that must not read the same (B-335): git unable to read the repo
 * (CI 04.10 — a HOME override hid `safe.directory`) is ⛔ "the file has uncommitted changes".
 */
export function assertCleanTargets(root, files, die) {
  for (const f of files) {
    let dirty;
    try {
      dirty = execFileSync("git", ["status", "--porcelain", "--", f], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    } catch (e) {
      die(`git cannot read the repository (${String(e.stderr || e.message).split("\n")[0]}) — the restore check is impossible`);
    }
    if (dirty.trim()) die(`${f.replace(root + "/", "")} has uncommitted changes — the restore check would be meaningless`);
  }
}

/**
 * Apply `mutations` ([file, find, replFn]) in place, `vite build` into `outDir`, restore every
 * file and verify the restore with git. A string `find` is replaced once; a RegExp uses the
 * replacement function.
 */
export async function buildTree({ root, arm, outDir, mutations, once, die }) {
  const originals = new Map();
  try {
    for (const [f, find, repl] of mutations) {
      if (!originals.has(f)) originals.set(f, await readFile(f, "utf8"));
      const cur = await readFile(f, "utf8");
      once(cur, find, `${arm} (live bytes)`);
      await writeFile(f, typeof find === "string" ? cur.replace(find, repl()) : cur.replace(find, repl), "utf8");
    }
    execFileSync("npx", ["vite", "build", "--outDir", outDir, "--emptyOutDir", "--logLevel", "error"], {
      cwd: root, stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, VITE_SUPABASE_URL: `https://${SB_HOST}`, VITE_SUPABASE_ANON_KEY: "eye-probe-anon-not-a-secret", VITE_SENTRY_DSN: "" },
    });
  } finally {
    for (const [f, src] of originals) await writeFile(f, src, "utf8");
    for (const f of originals.keys()) {
      try { execFileSync("git", ["diff", "--exit-code", "--quiet", "--", f], { cwd: root }); }
      catch { die(`${arm}: ${f} was NOT restored byte-identically — git checkout -- ${f}`); }
    }
  }
  // The bundle must talk to the synthetic origin only — a real project host here means the
  // hermetic claim is false.
  const assets = join(outDir, "assets");
  const hosts = new Set();
  for (const n of await readdir(assets)) if (n.endsWith(".js")) for (const m of (await readFile(join(assets, n), "utf8")).matchAll(/[a-z0-9-]+\.supabase\.co/g)) hosts.add(m[0]);
  if ([...hosts].some((h) => h !== SB_HOST)) die(`${arm}: bundle references a non-synthetic Supabase host (${[...hosts].join(",")})`);
  return outDir;
}

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json" };

/** Static server with the SPA fallback Vercel applies (/app ⇒ index.html). */
export async function serve(dir) {
  const server = createServer(async (req, res) => {
    const rel = req.url.split("?")[0].replace(/^\//, "") || "index.html";
    try {
      const buf = await readFile(join(dir, rel));
      res.writeHead(200, { "content-type": TYPES[extname(rel)] || "application/octet-stream" });
      return res.end(buf);
    } catch {
      if (!extname(rel)) { res.writeHead(200, { "content-type": "text/html" }); return res.end(await readFile(join(dir, "index.html"))); }
      res.writeHead(404); res.end("Not Found");
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { server, port: server.address().port };
}

/**
 * Run one spec against a served build. ⚠️ ASYNC, ⛔ spawnSync: the static server lives in THIS
 * process — a synchronous child blocks the event loop and every page.goto times out (measured
 * 04.10: HEAD went 5/5 red for exactly that reason).
 */
export function runSpec({ root, spec, projects, port, json, evidenceDir }) {
  return new Promise((done) => {
    let out = "";
    const child = spawn("npx", ["playwright", "test", "-c", "playwright.eye.config.js", spec, ...projects.map((p) => `--project=${p}`)], {
      cwd: root,
      env: { ...process.env, EYE_HERMETIC: "1", TEST_URL: `http://127.0.0.1:${port}`, EYE_JSON: json, EYE_EVIDENCE_DIR: evidenceDir, CI: "" },
    });
    child.stdout.on("data", (d) => { out += d; });
    child.stderr.on("data", (d) => { out += d; });
    child.on("close", (status) => done({ status, out, ok: existsSync(json) }));
  });
}

/**
 * Per-test verdicts from a Playwright JSON report, keyed by `${project}:${key(title)}`. The
 * message keeps the first line plus the "waiting for" / "intercepts pointer events" lines —
 * without them a CI red is undiagnosable from the log.
 */
export function readResults(jsonPath, key) {
  const r = JSON.parse(readFileSync(jsonPath, "utf8"));
  const out = {};
  const walk = (suite) => {
    for (const s of suite.suites || []) walk(s);
    for (const spec of suite.specs || []) for (const t of spec.tests || []) {
      const k = key(spec.title);
      if (!k) continue;
      const res = t.results?.[t.results.length - 1];
      const msg = (res?.errors || []).map((e) => {
        const lines = (e.message || "").replace(/\u001b\[[0-9;]*m/g, "").split("\n");
        return [lines[0], ...lines.filter((l) => /waiting for|intercepts pointer|resolved to|not visible|not stable/.test(l)).slice(-3)].join(" ⟶ ");
      }).join(" | ");
      out[`${t.projectName}:${k}`] = { status: res?.status || t.status, msg };
    }
  };
  for (const s of r.suites || []) walk(s);
  return out;
}
