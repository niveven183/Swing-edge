import { defineConfig, devices } from "@playwright/test";

// C-064 eye suite (tests-eye/). Separate from playwright.config.js on purpose: the smoke
// config collects `./tests` on every push, and this suite WRITES to the QA account and makes
// one paid /api/ocr call — it runs only from .github/workflows/eye-playbook.yml.
//
// · workers 1, not parallel: both devices use the SAME QA row; the settings blob is
//   last-writer-wins, so two devices at once would clobber each other's playbook.
// · retries 0: a retry re-writes to production and hides the first failure.
// · trace OFF: a trace records storage — the QA refresh_token in a public artifact (E11).
// · EYE_CHROMIUM: a local executable override when the bundled browser revision is absent.
const BASE_URL = process.env.TEST_URL || "https://swing-edge.com";
const chromiumLaunch = process.env.EYE_CHROMIUM ? { executablePath: process.env.EYE_CHROMIUM } : {};

export default defineConfig({
  testDir: "./tests-eye",
  globalSetup: "./tests-eye/global-setup.js",
  timeout: 300_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  reporter: [["list"], ["json", { outputFile: process.env.EYE_JSON || "eye-evidence/results.json" }]],
  use: {
    baseURL: BASE_URL,
    trace: "off",
    screenshot: "off",
    video: "off",
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
  },
  projects: [
    { name: "pixel7", use: { ...devices["Pixel 7"], launchOptions: chromiumLaunch } },
    { name: "iphone14", use: { ...devices["iPhone 14"] } },
    // B-404 · B-405 — the overlay matrix needs the short and the narrow screens too
    // (measured 04.10: iPhone SE 568 · Galaxy S8 360 wide · 14 Pro Max 740). The playbook
    // suite stays on the two devices above; these run tests-eye/overlay.spec.js only.
    { name: "iphoneSE", testMatch: /overlay\.spec\.js/, use: { ...devices["iPhone SE"] } },
    { name: "iphone14promax", testMatch: /overlay\.spec\.js/, use: { ...devices["iPhone 14 Pro Max"] } },
    { name: "galaxyS8", testMatch: /overlay\.spec\.js/, use: { ...devices["Galaxy S8"], launchOptions: chromiumLaunch } },
  ],
});
