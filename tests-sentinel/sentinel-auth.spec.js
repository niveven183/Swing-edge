import { test, expect } from '@playwright/test';
import fs from 'node:fs';

// Sentinel S2 — Layer A2: real-browser QA of the AUTHENTICATED surface.
// S1.5 only covers the anonymous surface, so anything that breaks after login
// (the fmtR crash on a closed trade with no stop, a hydration failure that
// silently shows DEFAULT_CAPITAL) was invisible. This spec logs into the
// dedicated QA account, proves the settings really came from the DB, renders
// the journal, then creates and deletes one throw-away trade.
//
// CRITICAL CONTRACT (same as sentinel-public.spec.js): a site problem is a
// FINDING, never a hard failure. Every finding lands in browser-findings-auth.json
// and the Sentinel `watch` job merges + classifies + de-dups + reports it.
//
// GUARD RAILS:
// · The test trade always uses ticker SNTNL — never a real symbol.
// · Every delete interaction is scoped to a table row containing SNTNL. The
//   three permanent QA trades (AAPL/NVDA/BTC-USD) are sacred.
// · afterAll runs a REST cleanup even if the journey crashed mid-way, so a
//   crashed run cannot leave orphan rows behind in production.
// · Passwords and tokens are never logged or written to findings.

const BASE_URL = process.env.TEST_URL || 'https://swing-edge.com';
const BASE_HOST = new URL(BASE_URL).host;
const OUTPUT = process.env.BROWSER_FINDINGS_AUTH || 'browser-findings-auth.json';

// Off by default: the workflow turns this on for one run an hour (the :50 slot).
const AUTH_ON = process.env.SENTINEL_AUTH === '1';
const QA_EMAIL = process.env.SENTINEL_QA_EMAIL || '';
const QA_PASSWORD = process.env.SENTINEL_QA_PASSWORD || '';
// Same fallback order as api/health.js / api/send-invites.js.
const SUPA_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
const SUPA_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const TICKER = 'SNTNL';
const FIXED_TRADES = ['AAPL', 'NVDA', 'BTC-USD'];
const COMPONENT = 'דפדפן (מחובר)';
const ROWS = 'table.w-full.text-xs tbody tr';

const IGNORE_SUBSTR = [
  'vercel', 'va.vercel-scripts', '/_vercel/insights',
  'sentry.io', 'ingest.sentry',
  'google-analytics', 'googletagmanager', 'doubleclick', 'gtag',
];
// Source-based ignores: the message text cannot identify these, so the console
// message's location URL is what matches.
// · assets/sentry- — the SDK fires ~10 "Cannot listen to the event from the
//   provided iframe" errors on mount; the text has no "sentry" in it.
// · financialmodelingprep.com — TickerLogo (src/components/TickerLogo.jsx:18)
//   loads a logo by symbol. SNTNL is not a real symbol, so the 404 is certain
//   and the letter-badge fallback handles it — noise the test creates for
//   itself, not a product fault.
// Matched by host only. Never match on "404" or "Failed to load resource":
// that would hide a real 404 from our own API — the exact silent failure
// Sentinel exists to catch.
const IGNORE_SOURCE = ['assets/sentry-', 'financialmodelingprep.com'];

const findings = [];
let uiDeleteOk = false;

function add(component, fp, severity, emoji, checked, got, reason, fix, risk) {
  findings.push({ component, fp, severity, emoji, checked, got, reason, fix, risk });
}

function cleanUrl(u) {
  try { const x = new URL(u); return `${x.origin}${x.pathname}`; }
  catch { return String(u).split('?')[0]; }
}

function ignored(text) {
  const t = (text || '').toLowerCase();
  return IGNORE_SUBSTR.some((p) => t.includes(p));
}

// Findings are posted to Discord, and the logged-in UI renders the QA account's
// address in the user menu.
function redact(s) {
  return String(s).replace(/[\w.+-]+@[\w.-]+\.\w+/g, '[email]');
}

// The finding must carry the amount actually rendered, never an assumption about it.
async function readCapital(locator) {
  let text = '';
  try { text = (await locator.innerText()).replace(/\s+/g, ' ').trim(); }
  catch (e) { return `אזור ההון לא ניתן לקריאה: ${e.message}`; }
  const m = text.match(/\$\s*([\d,]+(?:\.\d+)?)/);
  return m ? `מוצג: $${m[1]} (טקסט מלא: "${text}")` : `מוצג: "${text}" (לא נמצא סכום)`;
}

// Evidence for the timeout path: what the page showed instead. Redaction runs
// before slicing so a half-cut address cannot survive it.
async function pageStateSnippet(page) {
  let body = '';
  try { body = (await page.locator('body').innerText()).replace(/\s+/g, ' ').trim(); }
  catch (e) { return `גוף הדף לא ניתן לקריאה: ${e.message}`; }
  if (!body) return 'מצב הדף: גוף הדף ריק';
  const safe = redact(body);
  const hit = safe.match(/.{0,80}(?:הון התחלתי|starting capital).{0,80}/i);
  return `מצב הדף: "${(hit ? hit[0] : safe).slice(0, 240)}"`;
}

function watch(page) {
  const consoleErrors = [];
  const pageErrors = [];
  const failedReq = [];
  const supabaseFailedReq = [];
  const thirdPartyServerErrors = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    let src = '';
    try { src = msg.location()?.url || ''; } catch { src = ''; }
    if (IGNORE_SOURCE.some((p) => src.includes(p))) return;
    const text = msg.text();
    // src is matched against IGNORE_SUBSTR too, not just IGNORE_SOURCE. A
    // route-blocked request reports exactly "Failed to load resource:
    // net::ERR_FAILED" and carries the host ONLY in the location — so the GA
    // entries in IGNORE_SUBSTR could never match, and every aborted GA request
    // became an amber finding. Same defect as the broken glob: a filter that
    // cannot see the field it filters on. See docs/INCIDENTS.md #13.
    // Still a provider list, never a host rule (see IGNORE_SOURCE above).
    if (ignored(text) || ignored(src)) return;
    // src already decided whether to keep this message; it must also reach the
    // report. The text is whatever the app chose to print and often names no
    // resource — the location is the only part that always identifies one.
    consoleErrors.push(src ? `${text} @ ${cleanUrl(src)}` : text);
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
    if (host === BASE_HOST) {
      failedReq.push(`${res.status()} ${cleanUrl(res.url())}`);
      return;
    }
    // Kept separate from failedReq: an own-origin-only filter hides the direct
    // answer to "why did hydration fail". cleanUrl drops the query, so no token
    // from a Supabase URL reaches the finding.
    if (host.endsWith('.supabase.co')) { supabaseFailedReq.push(`${res.status()} ${cleanUrl(res.url())}`); return; }
    // Third-party 4xx still falls through by design (the financialmodelingprep
    // logo among them). A 5xx does not: it is a named resource that broke during
    // the load, and dropping it is what leaves a console.error with no address.
    const url = cleanUrl(res.url());
    if (res.status() >= 500 && !ignored(url)) thirdPartyServerErrors.push(`${res.status()} ${url}`);
  });
  return { consoleErrors, pageErrors, failedReq, supabaseFailedReq, thirdPartyServerErrors };
}

function record(diag) {
  if (diag.pageErrors.length) {
    add(COMPONENT, 'browser-auth|pageerror', 'red', '🔴',
      'שגיאות JS לא-תפוסות במסך המחובר',
      diag.pageErrors.slice(0, 3).join(' | '),
      'שגיאת JavaScript לא-תפוסה אחרי לוגין — שוברת את חווית המשתמש המחובר',
      'בדוק את ה-stack ב-Sentry/console; גלגל deploy אם נשבר לאחרונה',
      'rollback — נמוך, מחזיר מצב ידוע-תקין');
  }
  if (diag.consoleErrors.length) {
    add(COMPONENT, 'browser-auth|console_error', 'amber', '🟠',
      'console.error במסך המחובר',
      diag.consoleErrors.slice(0, 3).join(' | '),
      'שגיאות console מהמקור שלנו — עלול להצביע על תקלה נסתרת',
      'בדוק את מקור השגיאה; לרוב לא חוסם אך שווה בדיקה',
      'אבחון בלבד — ללא סיכון');
  }
  if (diag.failedReq.length) {
    add(COMPONENT, 'browser-auth|failed_request', 'amber', '🟠',
      'בקשות רשת במסך המחובר',
      diag.failedReq.slice(0, 3).join(' | '),
      'בקשה מהמקור שלנו החזירה 4xx/5xx אחרי לוגין',
      'בדוק את ה-endpoint/asset שנכשל ב-Vercel',
      'אבחון תלוי-סיבה — הערך לפני פעולה');
  }
  if (diag.supabaseFailedReq.length) {
    add(COMPONENT, 'browser-auth|supabase_request', 'amber', '🟠',
      'בקשות ל-Supabase במסך המחובר',
      redact(diag.supabaseFailedReq.slice(0, 3).join(' | ')),
      'קריאה ל-Supabase החזירה 4xx/5xx — הסיבה הישירה לכשל בטעינת הנתונים',
      'לפי הסטטוס: 401/403 = RLS/מפתח, 429 = rate limit, 5xx = תקלת שירות',
      'אבחון תלוי-סיבה — הערך לפני פעולה');
  }
  if (diag.thirdPartyServerErrors.length) {
    add(COMPONENT, 'browser-auth|thirdparty_5xx', 'yellow', '🟡',
      '5xx מספק חיצוני במסך המחובר',
      redact(diag.thirdPartyServerErrors.slice(0, 3).join(' | ')),
      'משאב צד-שלישי החזיר 5xx אחרי לוגין — לרוב זה המקור של שגיאת console בלי כתובת',
      'זהה את הספק מהכתובת; מעקב בלבד כל עוד המסך רונדר',
      'ללא פעולה — מעקב');
  }
}

// The desktop table only. The md:hidden mobile cards render the same trades
// (6 delete buttons for 3 trades), and scoping here keeps them out of reach.
function sntnlRows(page) {
  return page.locator(ROWS).filter({ hasText: TICKER });
}

async function openJournal(page) {
  await page.locator('[data-tour-tab="journal"]').click();
  await page.locator('table.w-full.text-xs').waitFor({ state: 'visible', timeout: 15_000 });
}

// Deletes the SNTNL row through the UI, exactly the way a user would.
// Refuses to click anything unless exactly one row matches SNTNL.
async function deleteSntnlRow(page) {
  const rows = sntnlRows(page);
  const n = await rows.count();
  if (n !== 1) throw new Error(`expected exactly 1 ${TICKER} row, found ${n}`);
  const row = rows.first();
  const rowText = (await row.innerText()).toUpperCase();
  if (!rowText.includes(TICKER)) throw new Error(`row guard failed: no ${TICKER} in row text`);
  await row.locator('button[title="מחיקה"], button[title="Delete"]').first().click();
  const dialog = page.locator('[role="dialog"]');
  await dialog.waitFor({ state: 'visible', timeout: 10_000 });
  await dialog.getByRole('button', { name: /^(מחק|Delete)$/ }).click();
  await expect(sntnlRows(page)).toHaveCount(0, { timeout: 15_000 });
}

// Guaranteed cleanup: runs even when the journey crashed before its own delete.
// RLS ("users own trades") limits this to the QA account's own SNTNL rows.
async function restCleanup() {
  if (!SUPA_URL || !SUPA_KEY) {
    add(COMPONENT, 'browser-auth|cleanup-unconfigured', 'yellow', '🟡',
      `ניקוי REST של עסקאות ${TICKER}`,
      'SUPABASE_URL/SUPABASE_ANON_KEY לא מוגדרים — ניקוי ה-REST דולג',
      'ה-secrets של Supabase חסרים ב-CI; המחיקה ב-UI רצה אך אין רשת ביטחון',
      'הוסף SUPABASE_URL + SUPABASE_ANON_KEY ל-GitHub Secrets',
      'הוספת secret — ללא סיכון');
    return;
  }

  let token = '';
  try {
    const res = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: SUPA_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: QA_EMAIL, password: QA_PASSWORD }),
    });
    if (!res.ok) throw new Error(`auth HTTP ${res.status}`);
    token = (await res.json())?.access_token || '';
    if (!token) throw new Error('auth response had no access_token');
  } catch (e) {
    add(COMPONENT, 'browser-auth|cleanup-failed', 'red', '🔴',
      `הנפקת טוקן לניקוי ${TICKER} (auth/v1/token)`,
      `${e.message}`,
      'ה-spec לא יכול לנקות אחרי עצמו — עסקאות בדיקה יצטברו בפרודקשן כל שעה',
      'בדוק את SUPABASE_URL/ANON_KEY ואת סיסמת חשבון ה-QA; 401/403 = מפתח לא מתאים',
      'אבחון תלוי-סיבה — הערך לפני פעולה');
    return;
  }

  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/trades?ticker=eq.${TICKER}`, {
      method: 'DELETE',
      headers: {
        apikey: SUPA_KEY,
        Authorization: `Bearer ${token}`,
        Prefer: 'return=representation',
      },
    });
    if (!res.ok) throw new Error(`delete HTTP ${res.status}`);
    const rows = await res.json();
    const n = Array.isArray(rows) ? rows.length : 0;
    // eslint-disable-next-line no-console
    console.log(`sentinel rest cleanup: removed ${n} ${TICKER} row(s)`);
    if (n > 0 && uiDeleteOk) {
      add(COMPONENT, 'browser-auth|ui-delete-incomplete', 'amber', '🟠',
        'האם המחיקה ב-UI באמת הגיעה ל-DB',
        `המחיקה ב-UI דווחה כהצליחה אך ${n} שורות ${TICKER} עוד היו ב-DB`,
        'ה-UI מסיר את השורה מה-state אך המחיקה ב-Supabase לא נשמרה',
        'בדוק את handleDeleteTrade ב-SwingEdge_App.jsx ואת שגיאות ה-delete ב-console',
        'אבחון תלוי-סיבה — הערך לפני פעולה');
    }
  } catch (e) {
    add(COMPONENT, 'browser-auth|cleanup-failed', 'red', '🔴',
      `DELETE /rest/v1/trades?ticker=eq.${TICKER}`,
      `${e.message}`,
      'ה-spec לא יכול לנקות אחרי עצמו — עסקאות בדיקה יצטברו בפרודקשן כל שעה',
      'בדוק זמינות Supabase ואת מדיניות ה-RLS על trades; 401/403 = מפתח לא מתאים',
      'אבחון תלוי-סיבה — הערך לפני פעולה');
  }
}

test.skip(!AUTH_ON, 'SENTINEL_AUTH != 1 — authenticated layer is off for this run');

// One continuous journey, not seven tests: Playwright gives every test a fresh
// context, which would mean seven logins. The config's 60s per-test budget is
// too small for a 7-step journey where a failing step can burn 15s, and a
// timeout would truncate the findings.
test('authenticated journey: login → journal → create/delete SNTNL', async ({ page }) => {
  test.setTimeout(180_000);

  if (!QA_EMAIL || !QA_PASSWORD) {
    add(COMPONENT, 'browser-auth|secrets-missing', 'yellow', '🟡',
      'פרטי חשבון ה-QA (SENTINEL_QA_EMAIL/PASSWORD)',
      'שכבת ה-QA המחוברת הופעלה אך פרטי ההתחברות חסרים',
      'ה-secrets לא הועברו ל-job — השכבה המחוברת לא נבדקה בכלל',
      'ודא SENTINEL_QA_EMAIL + SENTINEL_QA_PASSWORD ב-GitHub Secrets',
      'הוספת secret — ללא סיכון');
    return;
  }

  // Sentinel traffic must never reach GA4. Measured 2026-07-27..08-05: 122 runs, each
  // loading /app once, against a product with 41 registered / 12 activated users.
  // ⚠️ The old note said "48×/day against ~29 real users" — both wrong: 48 is the cron
  // schedule (actual delivery ~12/day), and 29 was the activation RATE (12/41), not a
  // headcount.
  // REGEX, NOT GLOB: '**/googletagmanager.com/**' matched NOTHING (Playwright globs
  // align on path segments; '**/' demands a '/' before the host, but the character
  // before 'googletagmanager.com' is '.'). See docs/INCIDENTS.md #13.
  await page.route(/googletagmanager\.com|google-analytics\.com/, (route) => route.abort());

  const diag = watch(page);

  // ---- 1. login. The URL does not change (SPA) — wait for the tab bar. ----
  try {
    await page.goto('/app', { waitUntil: 'load' });
    await page.locator('input[type="email"]').fill(QA_EMAIL);
    await page.locator('input[autocomplete="current-password"]').fill(QA_PASSWORD);
    await page.locator('button[type="submit"]').first().click();
    await page.locator('[data-tour-tab="dashboard"]').waitFor({ state: 'visible', timeout: 20_000 });
  } catch (e) {
    add(COMPONENT, 'browser-auth|login-failed', 'red', '🔴',
      'התחברות חשבון ה-QA ב-/app',
      `סרגל הטאבים לא נראה אחרי הכניסה: ${e.message}`,
      'אף משתמש לא מצליח להיכנס — Supabase Auth למטה, deploy שבור, או טופס ההתחברות נשבר',
      'בדוק Supabase Auth ואת ה-deploy האחרון; זו התקלה הכי יקרה — טפל ראשון',
      'rollback — נמוך, מחזיר מצב ידוע-תקין');
    record(diag);
    return;
  }

  // ---- 2. hydration gate. DEFAULT_CAPITAL (2500 → "2,500") renders before
  // the DB answers; asserting anything against defaults is a false green.
  // 25s and not 8s: the diagnosis was measured on a local Mac (1.8s/3.5s), while
  // the shared runner against Supabase is materially slower — margin is still right.
  //
  // Selector targets the TOP KPI card (data-tour="equity", SwingEdge_App.jsx:3143),
  // which renders immediately in the KPI row. Its `sub` span is `${startedAt} $${capital}`
  // → "התחלה $10,000" (he) / "Started at $10,000" (en) — the DB-loaded capital.
  // NOT the equity-curve card (SwingEdge_App.jsx:4592, "הון התחלתי"), a chart deep
  // in the page that hydrates late: the old /(הון התחלתי|starting capital)/ selector
  // matched only that card and timed out 4/4 even though hydration had succeeded. ----
  const HYDRATION_TIMEOUT = 25_000;
  const capital = page.locator('[data-tour="equity"]')
    .locator('span')
    .filter({ hasText: /(התחלה|Started at)\s*\$/ })
    .first();
  let capitalVisible = false;
  try {
    await capital.waitFor({ state: 'visible', timeout: HYDRATION_TIMEOUT });
    capitalVisible = true;
    await expect(capital).toContainText('10,000', { timeout: HYDRATION_TIMEOUT });
  } catch (e) {
    if (capitalVisible) {
      add(COMPONENT, 'browser-auth|hydration-default', 'red', '🔴',
        'הון התחלתי $10,000 — הסימן שההגדרות נטענו מה-DB',
        await readCapital(capital),
        `אזור ההון קיים ומציג ערך שאינו 10,000 גם אחרי ${HYDRATION_TIMEOUT / 1000} שניות`,
        'בדוק זמינות Supabase, RLS על user_settings, ושגיאות fetch ב-console',
        'אבחון תלוי-סיבה — הערך לפני פעולה');
    } else {
      add(COMPONENT, 'browser-auth|hydration-timeout', 'amber', '🟠',
        'הון התחלתי $10,000 — הסימן שההגדרות נטענו מה-DB',
        await pageStateSnippet(page),
        `אזור ההון לא נמצא בדף תוך ${HYDRATION_TIMEOUT / 1000} שניות: ${e.message}`,
        'השווה את קטע הדף שנלכד למסך תקין; דף ריק מצביע על deploy/JS שנפל',
        'אבחון תלוי-סיבה — הערך לפני פעולה');
    }
    record(diag);
    return; // אין להמשיך: אימות מול ברירות מחדל = דיווח שקר
  }

  // ---- 3. journal + leftover sweep ----
  try {
    await openJournal(page);
  } catch (e) {
    add(COMPONENT, 'browser-auth|journal-open', 'red', '🔴',
      'פתיחת טאב היומן וטבלת העסקאות',
      `הטבלה לא נראתה תוך 15 שניות: ${e.message}`,
      'היומן לא רונדר אף שההגדרות נטענו — ייתכן שגיאת JS חוסמת בטאב',
      'בדוק pageerror ב-Sentry ואת רינדור טבלת היומן',
      'rollback — נמוך, מחזיר מצב ידוע-תקין');
    record(diag);
    return;
  }

  try {
    if (await sntnlRows(page).count() > 0) {
      add(COMPONENT, 'browser-auth|stale-testdata', 'amber', '🟠',
        `שרידי עסקת בדיקה (${TICKER}) ביומן`,
        'נמצאה שורת SNTNL מריצה קודמת — הניקוי הקודם לא הושלם',
        'המחיקה ב-UI או ניקוי ה-REST של הריצה הקודמת נכשלו',
        'נמחקה אוטומטית בריצה זו; בדוק את לוג הריצה הקודמת ב-Actions',
        'מחיקת שורת בדיקה בלבד — ללא סיכון');
      await deleteSntnlRow(page);
    }
  } catch (e) {
    add(COMPONENT, 'browser-auth|sweep-failed', 'amber', '🟠',
      `ניקוי שרידי ${TICKER} ב-UI`,
      `${e.message}`,
      'שורת בדיקה ישנה נשארה ביומן — ה-REST של afterAll עוד ינסה להסיר אותה',
      'אם חוזר: בדוק את זרימת המחיקה ב-UI ואת ניקוי ה-REST',
      'מחיקת שורת בדיקה בלבד — ללא סיכון');
  }

  // ---- 4. journal render — the live fmtR check (AAPL is closed with no stop) ----
  try {
    const rows = page.locator(ROWS);
    const n = await rows.count();
    if (n < FIXED_TRADES.length) throw new Error(`נמצאו ${n} שורות, מצופה ${FIXED_TRADES.length} לפחות`);
    const missing = [];
    for (const sym of FIXED_TRADES) {
      if (await rows.filter({ hasText: sym }).count() === 0) missing.push(sym);
    }
    if (missing.length) throw new Error(`עסקאות קבע חסרות: ${missing.join(', ')}`);
  } catch (e) {
    add(COMPONENT, 'browser-auth|journal-render', 'red', '🔴',
      'רינדור 3 עסקאות הקבע (AAPL סגורה ללא stop = בדיקת fmtR החיה)',
      `${e.message}`,
      'טבלת היומן לא רונדרה כראוי — ייתכן ערך null שמפיל את החישוב',
      'בדוק fmtR (src/utils.js:106) ו-calcTradeMetrics (src/utils.js:38) ואת ה-pageerror ב-Sentry',
      'rollback — נמוך, מחזיר מצב ידוע-תקין');
  }

  // ---- 4b. consent banner. The context is fresh every run, so the banner is always
  // up. Its clearance from the FAB is a CSS constant (104px) coupled to
  // SwingEdge_App.jsx:6671 — assert the boxes don't overlap rather than hoping the
  // click lands, then decline so Sentinel traffic never reaches GA4 even if the
  // route-abort above is ever missed. The banner is optional: never fail the run. ----
  try {
    const card = page.locator('.se-consent__card');
    if (await card.count() > 0 && await card.isVisible()) {
      const a = await card.boundingBox();
      const b = await page.locator('[data-tour="add-trade"]').last().boundingBox();
      if (a && b) {
        const clear =
          a.x + a.width <= b.x || b.x + b.width <= a.x ||
          a.y + a.height <= b.y || b.y + b.height <= a.y;
        if (!clear) {
          add(COMPONENT, 'browser-auth|consent-overlaps-fab', 'red', '🔴',
            'באנר ההסכמה אינו חופף לכפתור הוספת העסקה',
            `banner ${JSON.stringify(a)} · FAB ${JSON.stringify(b)}`,
            'הבאנר מכסה את ה-FAB — משתמשים לא יכולים לתעד עסקה עד שיבחרו',
            'בדוק את ה-gutter 104px/92px ב-ConsentBanner.css מול ה-FAB ב-SwingEdge_App.jsx',
            'שינוי CSS בלבד — נמוך');
        }
      }
      await page.locator('[data-testid="consent-decline"]').click();
      await card.waitFor({ state: 'detached', timeout: 5_000 });
    }
  } catch (e) {
    add(COMPONENT, 'browser-auth|consent-check-failed', 'yellow', '🟡',
      'בדיקת באנר ההסכמה',
      `${e.message}`,
      'לא ניתן היה לאמת את הבאנר — הבדיקה עצמה נכשלה, לא בהכרח המוצר',
      'בדוק ש-.se-consent__card ו-data-testid="consent-decline" עדיין קיימים',
      'בדיקה בלבד — ללא סיכון');
  }

  // ---- 5. create. Scroll to top first: the FAB gets pointer-events-none
  // when the page is scrolled down. .last() is the global FAB (the empty-state
  // journal renders a second element with the same data-tour). ----
  let created = false;
  try {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator('[data-tour="add-trade"]').last().click();
    await page.locator('#log-ticker').fill(TICKER);
    await page.locator('#log-entry').fill('100');
    await page.locator('#log-stop').fill('99'); // LONG → stop < entry (validateTradeInputs)
    await page.locator('#log-target').fill('102');
    await page.getByRole('button', { name: /Log Trade/ }).click();
    // The toast disappears — the row in the table is the real proof.
    await expect(sntnlRows(page)).toHaveCount(1, { timeout: 20_000 });
    created = true;
  } catch (e) {
    add(COMPONENT, 'browser-auth|create-failed', 'red', '🔴',
      `יצירת עסקה חדשה (${TICKER}) דרך הטופס`,
      `${e.message}`,
      'משתמשים לא יכולים לתעד עסקה — הפעולה המרכזית באפליקציה שבורה',
      'בדוק את טופס היצירה (handleSubmit) ואת כתיבת trades ל-Supabase',
      'rollback — נמוך, מחזיר מצב ידוע-תקין');
  }

  // ---- 6. tabs (3 tabs — there is no Coach tab) ----
  try {
    await page.locator('[data-tour-tab="analytics"]').click();
    await page.locator('[data-tour-tab="dashboard"]').click();
    await openJournal(page);
  } catch (e) {
    add(COMPONENT, 'browser-auth|tab-switch', 'red', '🔴',
      'מעבר טאבים ניתוח ביצועים → לוח בקרה → יומן',
      `${e.message}`,
      'טאב לא נטען — חלק מהאפליקציה לא נגיש למשתמש מחובר',
      'בדוק שגיאות JS בטאב שנפל ואת ה-deploy האחרון',
      'rollback — נמוך, מחזיר מצב ידוע-תקין');
  }

  // ---- 7. delete through the UI ----
  if (created) {
    try {
      await deleteSntnlRow(page);
      uiDeleteOk = true;
    } catch (e) {
      add(COMPONENT, 'browser-auth|delete-failed', 'red', '🔴',
        `מחיקת עסקת ${TICKER} דרך ה-UI (כולל דיאלוג האישור)`,
        `${e.message}`,
        'משתמשים לא יכולים למחוק עסקה — או שדיאלוג האישור נשבר',
        'בדוק את handleDeleteTrade ואת ConfirmProvider (src/components/ToastProvider.jsx)',
        'rollback — נמוך, מחזיר מצב ידוע-תקין');
    }
  }

  await page.waitForTimeout(1_500); // settle for late console/network errors
  record(diag);
  expect(true).toBe(true); // never hard-fail: findings drive the report
});

test.afterAll(async () => {
  if (!AUTH_ON) return; // public-only run: no output file at all
  await restCleanup();
  fs.writeFileSync(OUTPUT, JSON.stringify(findings, null, 2));
  // eslint-disable-next-line no-console
  console.log(`sentinel auth findings: ${findings.length} → ${OUTPUT}`);
});
