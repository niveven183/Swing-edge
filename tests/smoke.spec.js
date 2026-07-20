import { test, expect } from '@playwright/test';

// Production smoke suite: proves the DEPLOYED app works — pages render, routes
// resolve, and the market-data pipeline returns live data. No login-dependent
// flows (production /app is auth-gated; market data is verified via the public
// /api/quote proxy that powers the Market Overview panel).

const BASE_URL = process.env.TEST_URL || 'https://swing-edge.com';
const BASE_HOST = new URL(BASE_URL).host;

// Substrings of console-error messages we intentionally ignore. Empty for now —
// populate only with known-benign third-party noise, after inspecting a real run.
const CONSOLE_ERROR_ALLOWLIST = [];

// Attach diagnostics to a page: uncaught console errors, page errors, and any
// 5xx from the deployment's own origin (third-party 5xx must not fail our smoke).
function watchErrors(page) {
  const consoleErrors = [];
  const serverErrors = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (CONSOLE_ERROR_ALLOWLIST.some((p) => text.includes(p))) return;
    consoleErrors.push(text);
  });
  page.on('pageerror', (err) => {
    consoleErrors.push(`pageerror: ${err.message}`);
  });
  page.on('response', (res) => {
    if (res.status() < 500) return;
    let host = '';
    try { host = new URL(res.url()).host; } catch { /* ignore */ }
    if (host === BASE_HOST) serverErrors.push(`${res.status()} ${res.url()}`);
  });
  return { consoleErrors, serverErrors };
}

function assertClean({ consoleErrors, serverErrors }) {
  expect(serverErrors, `5xx from ${BASE_HOST}:\n${serverErrors.join('\n')}`).toEqual([]);
  expect(consoleErrors, `console errors:\n${consoleErrors.join('\n')}`).toEqual([]);
}

test('landing page loads with hero and no errors', async ({ page }) => {
  const diag = watchErrors(page);
  await page.goto('/', { waitUntil: 'load' });
  await expect(page).toHaveTitle(/SwingEdge/i);
  await expect(page.locator('header#top')).toBeVisible();
  assertClean(diag);
});

for (const path of ['/terms', '/privacy']) {
  test(`${path} renders with an h1 and Hebrew content`, async ({ page }) => {
    const diag = watchErrors(page);
    await page.goto(path, { waitUntil: 'load' });
    await expect(page.locator('h1').first()).toBeVisible();
    // Assert non-empty Hebrew content (Unicode Hebrew block U+0590–U+05FF).
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).toMatch(/[֐-׿]/);
    assertClean(diag);
  });
}

test('/app loads to auth screen or dashboard with no errors', async ({ page }) => {
  const diag = watchErrors(page);
  await page.goto('/app', { waitUntil: 'load' });
  // Either the AuthScreen (SWINGEDGE heading) or the authenticated dashboard
  // (its <header> banner) must be visible. Production anon state = AuthScreen.
  const authOrDash = page
    .getByRole('heading', { name: /swing\s*edge/i })
    .or(page.getByRole('banner'));
  await expect(authOrDash.first()).toBeVisible();
  assertClean(diag);
});

test('production market-data API returns live data within 30s', async ({ request }) => {
  const symbols = 'SPY,QQQ,DIA,IWM,BTC-USD';
  const path = `/api/quote?symbols=${symbols}`;

  // Endpoint must be reachable and never a 5xx (it degrades to per-symbol null).
  const first = await request.get(path);
  expect(first.status(), 'GET /api/quote status').toBe(200);

  // At least one of the five indices must resolve to live (non-null) data.
  await expect
    .poll(
      async () => {
        const res = await request.get(path);
        if (res.status() !== 200) return 0;
        const body = await res.json();
        return Object.values(body).filter((v) => v && typeof v === 'object').length;
      },
      {
        message: 'Expected >=1 market symbol to return live (non-null) data',
        timeout: 30_000,
        intervals: [1_000, 2_000, 3_000, 5_000],
      },
    )
    .toBeGreaterThanOrEqual(1);
});
