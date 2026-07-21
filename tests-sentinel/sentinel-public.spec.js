import { test, expect } from '@playwright/test';
import fs from 'node:fs';

// Sentinel S1.5 — Layer A: real-browser QA of the PUBLIC (anon) surface.
// Loads the landing page (/) and the app entry (/app → AuthScreen) in real
// Chromium, verifying they actually render and collecting the JS/network
// problems a user would hit — uncaught errors, console errors, and failed
// requests from OUR OWN origin. Login flows are S2 and out of scope.
//
// CRITICAL CONTRACT: these tests NEVER hard-fail the process on a site problem.
// A render break or JS error is a FINDING, not a test failure — every finding
// is written to browser-findings.json (same shape as the watch job's faults)
// and the Sentinel `watch` job merges + classifies + de-dups + reports it.
// The Playwright run itself should exit 0 unless the harness itself is broken.

const BASE_URL = process.env.TEST_URL || 'https://swing-edge.com';
const BASE_HOST = new URL(BASE_URL).host;
const OUTPUT = process.env.BROWSER_FINDINGS || 'browser-findings.json';

// Third-party noise we never attribute to our own app. Own-origin filtering
// already excludes 3rd-party network requests; this substring list additionally
// suppresses console/pageerror lines that originate from analytics/telemetry.
const IGNORE_SUBSTR = [
  'vercel', 'va.vercel-scripts', '/_vercel/insights',
  'sentry.io', 'ingest.sentry',
  'google-analytics', 'googletagmanager', 'doubleclick', 'gtag',
];

const findings = [];

function add(component, fp, severity, emoji, checked, got, reason, fix, risk) {
  findings.push({ component, fp, severity, emoji, checked, got, reason, fix, risk });
}

// Strip query params + hash for privacy hygiene before anything is logged.
function cleanUrl(u) {
  try { const x = new URL(u); return `${x.origin}${x.pathname}`; }
  catch { return String(u).split('?')[0]; }
}

function ignored(text) {
  const t = (text || '').toLowerCase();
  return IGNORE_SUBSTR.some((p) => t.includes(p));
}

// Attach collectors to a page: console errors, uncaught page errors, and failed
// (>=400) responses from our own origin only.
function watch(page) {
  const consoleErrors = [];
  const pageErrors = [];
  const failedReq = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (ignored(text)) return;
    consoleErrors.push(text);
  });
  page.on('pageerror', (err) => {
    const text = `${err.message}`;
    if (ignored(text)) return;
    pageErrors.push(text);
  });
  page.on('response', (res) => {
    if (res.status() < 400) return;
    let host = '';
    try { host = new URL(res.url()).host; } catch { return; }
    if (host !== BASE_HOST) return; // own origin only — 3rd-party 4xx/5xx ignored
    failedReq.push(`${res.status()} ${cleanUrl(res.url())}`);
  });
  return { consoleErrors, pageErrors, failedReq };
}

// Turn a page's collected diagnostics into findings. label is Hebrew page name.
function record(label, pageKey, diag) {
  if (diag.pageErrors.length) {
    add('דפדפן', `browser|pageerror|${pageKey}`, 'red', '🔴',
      `שגיאות JS לא-תפוסות בטעינת ${label}`,
      diag.pageErrors.slice(0, 3).join(' | '),
      'שגיאת JavaScript לא-תפוסה (uncaught) שוברת את חווית המשתמש בדף',
      'בדוק את ה-stack ב-Sentry/console; גלגל deploy אם נשבר לאחרונה',
      'rollback — נמוך, מחזיר מצב ידוע-תקין');
  }
  if (diag.consoleErrors.length) {
    add('דפדפן', `browser|console_error|${pageKey}`, 'amber', '🟠',
      `console.error בטעינת ${label}`,
      diag.consoleErrors.slice(0, 3).join(' | '),
      'שגיאות console מהמקור שלנו — עלול להצביע על תקלה נסתרת',
      'בדוק את מקור השגיאה; לרוב לא חוסם אך שווה בדיקה',
      'אבחון בלבד — ללא סיכון');
  }
  if (diag.failedReq.length) {
    add('דפדפן', `browser|failed_request|${pageKey}`, 'amber', '🟠',
      `בקשות רשת בטעינת ${label}`,
      diag.failedReq.slice(0, 3).join(' | '),
      'בקשה מהמקור שלנו החזירה 4xx/5xx בזמן טעינת הדף',
      'בדוק את ה-endpoint/asset שנכשל ב-Vercel',
      'אבחון תלוי-סיבה — הערך לפני פעולה');
  }
}

test('landing (/) renders in a real browser', async ({ page }) => {
  const diag = watch(page);
  try {
    await page.goto('/', { waitUntil: 'load' });
    await page.locator('header#top').waitFor({ state: 'visible', timeout: 15_000 });
    await page.locator('header#top h1.se-serif').waitFor({ state: 'visible', timeout: 15_000 });
  } catch {
    add('דפדפן', 'browser|render_landing', 'red', '🔴',
      'header#top + h1.se-serif בדף הבית',
      'הרכיבים לא נראו תוך 15 שניות — הדף לא רונדר',
      'הדף לא רונדר כראוי — deploy שבור או שגיאת JS חוסמת',
      'בדוק את ה-build/deploy האחרון; ודא שה-JS נטען; גלגל אם צריך',
      'rollback — נמוך, מחזיר מצב ידוע-תקין');
  }
  await page.waitForTimeout(1_500); // settle for late console/network errors
  record('דף הבית', 'landing', diag);
  expect(true).toBe(true); // never hard-fail: findings drive the report
});

test('/app renders the auth screen in a real browser', async ({ page }) => {
  const diag = watch(page);
  try {
    await page.goto('/app', { waitUntil: 'load' });
    await page.locator('input[type="email"]').waitFor({ state: 'visible', timeout: 15_000 });
    await page.locator('input[autocomplete="current-password"]').waitFor({ state: 'visible', timeout: 15_000 });
  } catch {
    add('דפדפן', 'browser|render_app', 'red', '🔴',
      'input[type=email] + current-password ב-/app',
      'טופס ההתחברות לא נראה תוך 15 שניות — /app לא רונדר',
      'מסך ה-AuthScreen לא רונדר — deploy שבור או שגיאת JS חוסמת',
      'בדוק את ה-build/deploy האחרון; ודא שה-JS נטען; גלגל אם צריך',
      'rollback — נמוך, מחזיר מצב ידוע-תקין');
  }
  await page.waitForTimeout(1_500);
  record('/app', 'app', diag);
  expect(true).toBe(true);
});

test.afterAll(() => {
  fs.writeFileSync(OUTPUT, JSON.stringify(findings, null, 2));
  // eslint-disable-next-line no-console
  console.log(`sentinel browser findings: ${findings.length} → ${OUTPUT}`);
});
