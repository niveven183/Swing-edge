import { defineConfig, devices } from '@playwright/test';

// Smoke suite targets the deployed app (production by default). Override with TEST_URL.
const BASE_URL = process.env.TEST_URL || 'https://swing-edge.com';
const CI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: CI ? 1 : undefined,
  reporter: CI
    ? [['list'], ['html', { open: 'never' }], ['github']]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },

    // A single Desktop Chrome project is why the `capture` bug hid: verification
    // narrowed the WIDTH but never changed the PLATFORM, so a mobile-only code path
    // was never executed. Pixel 5 gives a real mobile UA + touch + viewport.
    //
    // ⚠️ Read what this does and does NOT buy, because the gap is easy to misread as
    // covered. Emulation changes the user-agent, the viewport and touch support. It
    // does NOT REMOVE CAPABILITIES: `navigator.clipboard` and `matchMedia` still exist
    // here exactly as they do on desktop. So of the six capability branches, this
    // project meaningfully covers #5 (`parseUA`) and touches #6 — it cannot reach #2
    // (clipboard missing) or #3 (matchMedia missing), which need `addInitScript` +
    // `delete` to simulate absence, and it must not be pointed at #4 (iOS): Chromium
    // cannot honestly emulate `navigator.standalone`/`platform`, so an iOS "pass" here
    // would be a FALSE GREEN — worse than no coverage, because it stops the search.
    //
    // Scoped with `grep`, deliberately, so no new tests are added in this wave and the
    // spec files stay untouched. The two chosen tests are the only ones whose outcome
    // can differ by platform: they render the app shell and execute its JS. /terms and
    // /privacy assert static Hebrew text, and the consent test asserts `dataLayer[0]` —
    // both are platform-independent by construction, so running them twice would double
    // the runtime and the production page_views while proving nothing new.
    {
      name: 'mobile-android',
      use: { ...devices['Pixel 5'] },
      grep: /landing page loads|\/app loads to auth screen/,
    },
  ],
});
