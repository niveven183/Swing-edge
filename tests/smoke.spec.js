import { test, expect } from '@playwright/test';

// Production smoke suite: proves the DEPLOYED app works — pages render, routes
// resolve, and the market-data pipeline returns live data. No login-dependent
// flows (production /app is auth-gated; market data is verified via the public
// /api/quote proxy that powers the Market Overview panel).

const BASE_URL = process.env.TEST_URL || 'https://swing-edge.com';
const BASE_HOST = new URL(BASE_URL).host;

// Substrings of console-error messages we intentionally ignore: known-benign
// third-party noise only. GA is blocked at the route level below, so nothing here
// should ever fire — these four are the safety net if another load path slips through.
const CONSOLE_ERROR_ALLOWLIST = ['google-analytics', 'googletagmanager', 'doubleclick', 'gtag'];

// Never let CI traffic reach GA4. Measured over 2026-07-27..08-05: smoke ran 108 times
// (5 page loads each = 540) and sentinel 122 times (3 each = 366) — ~906 synthetic
// page_views against a product with 41 registered / 12 activated users, with no error
// surfacing anywhere.
// ⚠️ Two numbers that used to sit here were wrong and are corrected above: sentinel's
// cron schedules 48/day but GitHub actually delivers ~12/day (122 runs / 10 days), and
// "~29 real users" was the activation RATE (12/41 = 29%) misread as a user count.
//
// REGEX, NOT GLOB — and that is the entire point. The previous pattern,
// '**/googletagmanager.com/**', matched NOTHING: Playwright globs align on path
// segments, so '**/' demands a '/' immediately before the host, but in
// 'https://www.googletagmanager.com/...' the character there is '.'. The route never
// fired and every CI run shipped a real page_view to G-VC8PKL4NL1 — for months,
// silently, behind a comment promising the opposite. See docs/INCIDENTS.md #13.
// google-analytics.com is blocked too: /g/collect is the endpoint that actually
// records the hit, so blocking only the loader leaves a second path open.
// Never replace this with a glob.
const ANALYTICS_HOSTS = /googletagmanager\.com|google-analytics\.com/;

async function blockAnalytics(page) {
  await page.route(ANALYTICS_HOSTS, (route) => route.abort());
}

function hostOf(url) {
  try { return new URL(url).host; } catch { return ''; }
}

// Attach diagnostics to a page: uncaught console errors, page errors, and any
// 5xx from the deployment's own origin (third-party 5xx must not fail our smoke).
//
// The console channel enforces the SAME host rule as the response channel. It did
// not, and that gap is what made smoke red on 2026-08-04 and 2026-08-05: a 500 from
// api.fontshare.com was correctly ignored by the response channel (host !== BASE_HOST)
// and then walked straight back in through the console channel, which filtered on
// nothing but four GA substrings. The comment promised "third-party 5xx must not fail
// our smoke" while the code enforced it on one of two paths. See docs/INCIDENTS.md #13.
//
// The URL lives in msg.location(), NOT in msg.text(). A failed resource load reports
// exactly "Failed to load resource: the server responded with a status of 500 ()" —
// no URL at all. That is why diagnosing the 2026-08-05 failure required downloading
// the trace artifact by hand, and why the URL is now appended to every recorded error.
function watchErrors(page) {
  const consoleErrors = [];
  const serverErrors = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    const url = msg.location()?.url || '';
    if (CONSOLE_ERROR_ALLOWLIST.some((p) => text.includes(p) || url.includes(p))) return;
    // Attributable to a third party -> not our deployment failing. Unattributable
    // (no URL: inline script, page-level error) -> keep it and fail loud.
    if (url && hostOf(url) !== BASE_HOST) return;
    consoleErrors.push(url ? `${text}  [${url}]` : text);
  });
  page.on('pageerror', (err) => {
    consoleErrors.push(`pageerror: ${err.message}`);
  });
  page.on('response', (res) => {
    if (res.status() < 500) return;
    if (hostOf(res.url()) === BASE_HOST) serverErrors.push(`${res.status()} ${res.url()}`);
  });
  return { consoleErrors, serverErrors };
}

function assertClean({ consoleErrors, serverErrors }) {
  expect(serverErrors, `5xx from ${BASE_HOST}:\n${serverErrors.join('\n')}`).toEqual([]);
  expect(consoleErrors, `console errors:\n${consoleErrors.join('\n')}`).toEqual([]);
}

test('landing page loads with hero and no errors', async ({ page }) => {
  await blockAnalytics(page);
  const diag = watchErrors(page);
  await page.goto('/', { waitUntil: 'load' });
  await expect(page).toHaveTitle(/SwingEdge/i);
  await expect(page.locator('header#top')).toBeVisible();
  assertClean(diag);
});

for (const path of ['/terms', '/privacy']) {
  test(`${path} renders with an h1 and Hebrew content`, async ({ page }) => {
    await blockAnalytics(page);
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
  await blockAnalytics(page);
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

// The load-bearing invariant: consent must be denied at dataLayer[0], before anything
// else is queued. If this drifts, the tag collects before consent and nothing errors.
// gtag.js is still route-blocked here — the inline head block populates dataLayer on
// its own, so the assertion holds without emitting a synthetic hit to GA4.
test('consent defaults to denied before any choice is made', async ({ page }) => {
  await blockAnalytics(page);
  await page.goto('/', { waitUntil: 'load' });

  const first = await page.evaluate(() => Array.from(window.dataLayer[0]));
  expect(first[0]).toBe('consent');
  expect(first[1]).toBe('default');
  expect(first[2]).toMatchObject({
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
  });

  const stored = await page.evaluate(() => localStorage.getItem('swingEdgeConsent'));
  expect(stored).toBeNull();
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
