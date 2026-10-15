import { defineConfig } from "@playwright/test";
import eye from "./playwright.eye.config.js";

// B-425 (15.10) — the flake-diagnosis config for scripts/probe-flake.mjs. Plan:
// docs/plans/PLAN-2026-10-15-b425-flake-diagnosis.md
//
// The eye config, with exactly ONE difference: trace · video · screenshot are kept for every
// FAILING test. Everything that shapes the population — timeout · expect.timeout ·
// actionTimeout · navigationTimeout · retries 0 · workers 1 · the devices — is inherited
// untouched; a different timeout would measure a different population.
//
// ⛔ E11: the eye config keeps trace OFF because against production a trace records the QA
// refresh_token in a public artifact. This config is HERMETIC ONLY: the app is built against
// the synthetic Supabase (tests-eye/hermetic.js — a dummy, unsigned session) and served from
// loopback. It refuses to load anywhere else, so it can never point at swing-edge.com.
if (process.env.EYE_HERMETIC !== "1") throw new Error("playwright.flake.config.js: EYE_HERMETIC=1 is required — trace is allowed only against the synthetic origin (E11)");
const url = (() => { try { return new URL(process.env.TEST_URL || ""); } catch { return null; } })();
if (!url || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)) {
  throw new Error(`playwright.flake.config.js: TEST_URL must be a loopback build, got "${process.env.TEST_URL || ""}" (E11)`);
}

export default defineConfig({
  ...eye,
  // tests-eye/hydration.spec.js (H2 · C4 and their neighbours) + tests-flake/ (the
  // debounce/reload scene, which exists only here — ⛔ collected by the eye config or by prod).
  testDir: ".",
  testMatch: /(tests-eye\/hydration|tests-flake\/[^/]+)\.spec\.js$/,
  use: { ...eye.use, trace: "retain-on-failure", video: "retain-on-failure", screenshot: "only-on-failure" },
  outputDir: process.env.EYE_FLAKE_OUT || "eye-evidence/probe-flake/test-results",
});
