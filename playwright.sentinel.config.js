import { defineConfig, devices } from '@playwright/test';

// Sentinel S1.5 — Layer A browser QA config. Deliberately SEPARATE from
// playwright.config.js: it points at ./tests-sentinel, a directory the default
// smoke config (testDir ./tests) never scans, so `npm run test:smoke` never
// picks these specs up and this config never runs the smoke specs.
//
// The spec here NEVER hard-fails the process on a site problem — it records
// findings into browser-findings.json (consumed by the Sentinel `watch` job).
// So retries are pointless and we want a single deterministic pass.
const BASE_URL = process.env.TEST_URL || 'https://swing-edge.com';

export default defineConfig({
  testDir: './tests-sentinel',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'off',
    screenshot: 'off',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
