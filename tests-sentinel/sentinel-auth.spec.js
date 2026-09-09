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
// B-305 (09.09) — REPRESENTATIVENESS. On 07.09 the site was broken for 18h34m
// while 6/6 sentinel runs reported success. The sentinel did not "miss" it: it
// was asked a question about a journal that COULD NOT CONTAIN THE CASE.
// FIXED_TRADES are 3/3 USD-denominated, so `riskInCapital` always returns
// `identity` and `riskPct === null` was never produced — and `null.toFixed`
// was never thrown. A green check over a population that cannot hold the
// phenomenon is not evidence (CLAUDE.md §2). Hence RISK_TICKER below.
//
// GUARD RAILS:
// · The test trades always use SNTNL / SNTNL1 — never a real symbol.
// · Every delete interaction is scoped to a table row whose text matches the
//   ticker on WORD BOUNDARIES. A bare substring 'SNTNL' also matches 'SNTNL1',
//   which would make deleteRow's "exactly 1 row" guard see 2 and refuse — or,
//   worse, act on the wrong row. The three permanent QA trades
//   (AAPL/NVDA/BTC-USD) are sacred.
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
// The representativeness fixture (B-305). SNTNL1 carries a digit inside an
// otherwise alphabetic string, so it falls BETWEEN instrumentCurrency.js's two
// regexes (ALPHA_TICKER :135, NUMERIC_TICKER :134) and reaches the fallthrough:
// AMBIGUOUS/unrecognized_ticker → !isAggregatable → riskInCapital refuses
// `unverified_instrument` → riskDollar null → riskPct null. With a stop and
// shares > 0 that is EXACTLY the 07.09 row.
//
// ⚠️ It is produced by RENAMING an existing SNTNL trade, never by creating it.
// sizePosition refuses an unverified paper outright (positionSizing.js:54), so
// creating SNTNL1 through the form yields shares = null → hasStop false → the
// old guard renders "—" and nothing throws. EditTradeModal carries `shares` as
// a raw field and never calls sizePosition, so the rename preserves 100 shares.
// Measured both ways in scripts/sentinel-firing-probe.mjs — the create path is
// kept there as a CONTROL arm precisely because it looks right and is not.
const RISK_TICKER = 'SNTNL1';
const TEST_TICKERS = [TICKER, RISK_TICKER];
const FIXED_TRADES = ['AAPL', 'NVDA', 'BTC-USD'];
// The five contained panels (SwingEdge_App.jsx :4253/:4737/:5004/:6109/:6812).
// Checked SEPARATELY and never as one sweep: B-304 split the blast radius, so a
// dead risk panel now leaves the journal rendering. A single "is the page ok"
// assertion would be green while a panel is dead — R-4 in a costume.
const PANELS = ['risk', 'journal', 'mentoring', 'analytics', 'watchlist'];
// ⚠️ Each panel mounts ONLY on its own tab (the five `{tab === "…" && (` blocks
// at :4252/:4423/:5003/:6108/:6729). Counting [data-boundary="risk"] while the
// journal tab is open returns 0 for a panel that never rendered — a green over a
// population that CANNOT contain the phenomenon, which is the exact defect B-305
// exists to remove (CLAUDE.md §2). So the sweep VISITS the tab first, and when it
// cannot, it says so in yellow instead of counting zero.
const PANEL_TAB = {
  risk: 'dashboard',      // SwingEdge_App.jsx:4737, inside {tab === "dashboard"}
  journal: 'journal',     // :5004
  mentoring: 'mentoring', // :4253 — ⚠️ the tab button itself only exists when
                          //          myMentees.length > 0 (:4232-4234)
  analytics: 'analytics', // :6109
  watchlist: 'intel',     // :6812, inside {tab === "intel"}
};
const COMPONENT = 'דפדפן (מחובר)';
// Scoped to the journal table's own data-testid, NOT to `table.w-full.text-xs`:
// that class trio matches 3 tables in SwingEdge_App.jsx and 3 more in AdminPanel.jsx
// (B-146). Two consequences, both real: `waitFor` below hit a strict-mode violation,
// and `rows.count()` in check 4 is compared as `n < FIXED_TRADES.length` — so rows
// borrowed from a second matching table INFLATE the count and make the assertion
// pass when it should fail. An over-counting check is a silent pass, not a nuisance.
const JOURNAL_TABLE = '[data-testid="journal-table"]';
const ROWS = `${JOURNAL_TABLE} tbody tr`;

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
//
// ⚠️ WORD-BOUNDARY REGEX, NOT A SUBSTRING. `hasText: 'SNTNL'` is a substring
// match, so it also matches the SNTNL1 row: `\b` sits between a word and a
// non-word char, and L→1 is word→word, so /\bSNTNL\b/ rejects "SNTNL1" while
// /\bSNTNL1\b/ rejects "SNTNL". Verified mutually exclusive. Without this the
// guard in deleteRow counts 2 and the whole delete path dies the moment the
// representativeness fixture exists — the same over-counting defect the
// JOURNAL_TABLE comment above describes (B-146).
function rowsFor(page, sym) {
  return page.locator(ROWS).filter({ hasText: new RegExp(`\\b${sym}\\b`) });
}
function sntnlRows(page) {
  return rowsFor(page, TICKER);
}
// Anything this run owns, for the leftover sweep: one locator, both tickers.
function testRows(page) {
  return page.locator(ROWS).filter({ hasText: new RegExp(`\\b(?:${TEST_TICKERS.join('|')})\\b`) });
}

// ─── E1 — did any error boundary open? ──────────────────────────────────────
//
// The third blocker, and the one nobody had measured: before this commit the
// two sentinel specs contained ZERO assertions that an error card is absent.
// A boundary is designed to keep the page alive, so a crashed panel produces a
// perfectly loadable page — every other check stays green while the user looks
// at a dead box.
//
// MATCHED ON MACHINE HOOKS, NEVER ON TEXT. `data-boundary` is written by
// PanelBoundary.jsx:78 and `role="alert"`+`h1` is the RootFallback shape
// (main.jsx:107-127). Matching the copy instead would be both fragile and
// wrong: LandingPage.jsx:101 renders the string "משהו השתבש. נסה שוב עוד רגע."
// as a normal waitlist error, so a text assertion reports a crash on a healthy
// marketing page.
//
// ONE FINDING PER PANEL. B-304 gave each panel its own boundary, so a dead
// risk board leaves the journal rendering; a single page-level assertion would
// be green while a panel is dead. Per-panel fingerprints also let the watch
// job de-dup and name which board died.
//
// NOT pageerror: React routes an error caught by a boundary to onCaughtError,
// not to window.reportError, so `page.on('pageerror')` may never fire for
// exactly the crash this check exists to catch. The DOM is the evidence.
//
// ⚠️ AND THE SWEEP IS ONLY EVIDENCE WHILE THE FIXTURE IS LIVE. `phase` carries
// whether SNTNL1 actually reached the journal: five green panels over a journal
// that holds only the 3 USD trades is precisely the 6/6 success of 07.09.
async function gotoTab(page, id) {
  const btn = page.locator(`[data-tour-tab="${id}"]`);
  if (await btn.count() === 0) return 'absent';
  await btn.first().click();
  // The active tab is the one carrying border-emerald-400 (:4239). Waiting for
  // the class rather than a fixed sleep is what makes "the panel rendered" a
  // measured fact instead of an assumption.
  await expect(btn.first()).toHaveClass(/border-emerald-400/, { timeout: 10_000 });
  return 'active';
}

async function sweepBoundaries(page, phase) {
  for (const name of PANELS) {
    const tabId = PANEL_TAB[name];
    let state = '';
    try { state = await gotoTab(page, tabId); }
    catch (e) { state = `error: ${e.message}`; }

    if (state !== 'active') {
      // NOT green. The mentoring tab is absent for an account with no mentees,
      // so its boundary is structurally unmeasurable here — declared, never
      // counted as a pass.
      add(COMPONENT, `browser-auth|boundary-unmeasurable|${name}`, 'yellow', '🟡',
        `גבול הפאנל "${name}" (טאב ${tabId}, ${phase})`,
        state === 'absent' ? `הטאב "${tabId}" אינו קיים במסך הזה` : `הטאב "${tabId}" לא נפתח — ${state}`,
        'הפאנל לא רונדר בכלל ⇒ הבדיקה ⛔ יכולה לירות — ירוק כאן אינו ראיה שהוא חי',
        `בדוק שהטאב "${tabId}" נגיש לחשבון ה-QA; mentoring דורש myMentees.length > 0`,
        'בדיקה בלבד — ללא סיכון');
      continue;
    }

    let n = 0;
    try { n = await page.locator(`[data-boundary="${name}"]`).count(); }
    catch (e) {
      add(COMPONENT, `browser-auth|boundary-check-failed|${name}`, 'yellow', '🟡',
        `בדיקת גבול הפאנל "${name}" (${phase})`,
        `${e.message}`,
        'הבדיקה עצמה נכשלה — לא ניתן לדעת אם הפאנל קרס',
        'ודא ש-data-boundary עדיין נכתב ב-PanelBoundary.jsx',
        'בדיקה בלבד — ללא סיכון');
      continue;
    }
    if (n > 0) {
      add(COMPONENT, `browser-auth|panel-crashed|${name}`, 'red', '🔴',
        `פאנל "${name}" רונדר ללא כרטיס שגיאה (${phase})`,
        `נמצאו ${n} כרטיסי [data-boundary="${name}"] במסך`,
        `ה-Error Boundary של "${name}" נפתח — הפאנל הזה מת אצל המשתמש בזמן ששאר המסך נראה תקין`,
        'בדוק את ה-issue ב-Sentry (tag boundary=' + name + '); זו קריסת רינדור, לא תקלת רשת',
        'rollback — נמוך, מחזיר מצב ידוע-תקין');
    }
  }
  // The root net. It has no data- hook (main.jsx is product code and this wave
  // does not touch it), so the anchor is structural: RootFallback is the only
  // role="alert" that contains an <h1>. PanelBoundary's card is role="alert"
  // too but renders a <span>, so the two cannot be confused.
  try {
    if (await page.locator('[role="alert"] h1').count() > 0) {
      add(COMPONENT, 'browser-auth|root-crashed', 'red', '🔴',
        `גבול השורש של האפליקציה (${phase})`,
        'RootFallback מרונדר — role="alert" עם h1',
        'כל האפליקציה קרסה, לא פאנל בודד — המשתמש רואה מסך שגיאה במקום המוצר',
        'בדוק את ה-issue ב-Sentry (boundary=root) ואת ה-deploy האחרון',
        'rollback — נמוך, מחזיר מצב ידוע-תקין');
    }
  } catch { /* ⛔ בולעים: כשל הלוקייטור עצמו כבר מדווח לכל פאנל למעלה */ }
}

async function openJournal(page) {
  await page.locator('[data-tour-tab="journal"]').click();
  await page.locator(JOURNAL_TABLE).waitFor({ state: 'visible', timeout: 15_000 });
}

// Deletes one test row through the UI, exactly the way a user would.
// Refuses to click anything unless exactly one row matches the ticker.
async function deleteRow(page, sym = TICKER) {
  const rows = rowsFor(page, sym);
  const n = await rows.count();
  if (n !== 1) throw new Error(`expected exactly 1 ${sym} row, found ${n}`);
  const row = rows.first();
  const rowText = (await row.innerText()).toUpperCase();
  if (!rowText.includes(sym)) throw new Error(`row guard failed: no ${sym} in row text`);
  await row.locator('button[title="מחיקה"], button[title="Delete"]').first().click();
  const dialog = page.locator('[role="dialog"]');
  await dialog.waitFor({ state: 'visible', timeout: 10_000 });
  await dialog.getByRole('button', { name: /^(מחק|Delete)$/ }).click();
  await expect(rowsFor(page, sym)).toHaveCount(0, { timeout: 15_000 });
}

// Renames SNTNL → SNTNL1 through the edit modal. This is the SUPPLIER of the
// 07.09 shape; see the RISK_TICKER comment for why creating it directly cannot
// work. The first input in the modal is the ticker field (EditTradeModal.jsx
// :148-152), and its current value is asserted before anything is typed — the
// same "refuse unless certain" rule deleteRow follows, because a blind fill
// into the wrong field would silently corrupt entry, stop or shares.
async function renameToRiskTicker(page) {
  const rows = rowsFor(page, TICKER);
  const n = await rows.count();
  if (n !== 1) throw new Error(`expected exactly 1 ${TICKER} row to rename, found ${n}`);
  await rows.first().locator('button[title="עריכה"], button[title="Edit"]').first().click();
  const dialog = page.locator('[role="dialog"]');
  await dialog.waitFor({ state: 'visible', timeout: 10_000 });
  const tickerInput = dialog.locator('input').first();
  const current = await tickerInput.inputValue();
  if (current !== TICKER) {
    throw new Error(`edit modal guard failed: first input holds "${current}", expected ${TICKER}`);
  }
  await tickerInput.fill(RISK_TICKER);
  await dialog.getByRole('button', { name: /(שמור שינויים|Save Changes)/ }).click();
  await dialog.waitFor({ state: 'detached', timeout: 10_000 });
  // The row is the proof, not the toast — and shares must have survived the
  // edit, otherwise hasStop is false and the fixture is benign again.
  await expect(rowsFor(page, RISK_TICKER)).toHaveCount(1, { timeout: 15_000 });
  await expect(rowsFor(page, TICKER)).toHaveCount(0, { timeout: 15_000 });
}

// Guaranteed cleanup: runs even when the journey crashed before its own delete.
// RLS ("users own trades") limits this to the QA account's own test rows.
//
// ⚠️ CLOSED LIST, NEVER A PATTERN. `in.(SNTNL,SNTNL1)` names both tickers this
// spec can create; `like.SNTNL*` would have been shorter and would delete any
// future real symbol that happens to start with those letters. The journey can
// crash between the create and the rename, so BOTH names must be swept — a
// cleanup that only knows the name it hoped for leaves rows in production.
const CLEANUP_FILTER = `ticker=in.(${TEST_TICKERS.join(',')})`;

async function restCleanup() {
  if (!SUPA_URL || !SUPA_KEY) {
    add(COMPONENT, 'browser-auth|cleanup-unconfigured', 'yellow', '🟡',
      `ניקוי REST של עסקאות ${TEST_TICKERS.join('/')}`,
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
      `הנפקת טוקן לניקוי ${TEST_TICKERS.join('/')} (auth/v1/token)`,
      `${e.message}`,
      'ה-spec לא יכול לנקות אחרי עצמו — עסקאות בדיקה יצטברו בפרודקשן כל שעה',
      'בדוק את SUPABASE_URL/ANON_KEY ואת סיסמת חשבון ה-QA; 401/403 = מפתח לא מתאים',
      'אבחון תלוי-סיבה — הערך לפני פעולה');
    return;
  }

  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/trades?${CLEANUP_FILTER}`, {
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
    console.log(`sentinel rest cleanup: removed ${n} ${TEST_TICKERS.join('/')} row(s)`);
    if (n > 0 && uiDeleteOk) {
      add(COMPONENT, 'browser-auth|ui-delete-incomplete', 'amber', '🟠',
        'האם המחיקה ב-UI באמת הגיעה ל-DB',
        `המחיקה ב-UI דווחה כהצליחה אך ${n} שורות בדיקה עוד היו ב-DB`,
        'ה-UI מסיר את השורה מה-state אך המחיקה ב-Supabase לא נשמרה',
        'בדוק את handleDeleteTrade ב-SwingEdge_App.jsx ואת שגיאות ה-delete ב-console',
        'אבחון תלוי-סיבה — הערך לפני פעולה');
    }
  } catch (e) {
    add(COMPONENT, 'browser-auth|cleanup-failed', 'red', '🔴',
      `DELETE /rest/v1/trades?${CLEANUP_FILTER}`,
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
test('authenticated journey: login → journal → SNTNL → SNTNL1 → boundaries → delete', async ({ page }) => {
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
    if (await testRows(page).count() > 0) {
      add(COMPONENT, 'browser-auth|stale-testdata', 'amber', '🟠',
        `שרידי עסקת בדיקה (${TEST_TICKERS.join('/')}) ביומן`,
        'נמצאה שורת בדיקה מריצה קודמת — הניקוי הקודם לא הושלם',
        'המחיקה ב-UI או ניקוי ה-REST של הריצה הקודמת נכשלו',
        'נמחקה אוטומטית בריצה זו; בדוק את לוג הריצה הקודמת ב-Actions',
        'מחיקת שורת בדיקה בלבד — ללא סיכון');
      for (const sym of TEST_TICKERS) {
        if (await rowsFor(page, sym).count() > 0) await deleteRow(page, sym);
      }
    }
  } catch (e) {
    add(COMPONENT, 'browser-auth|sweep-failed', 'amber', '🟠',
      `ניקוי שרידי ${TEST_TICKERS.join('/')} ב-UI`,
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

  // ---- 5b. B-305 — turn the trade into the 07.09 shape. ----
  // The rename is the whole point of this wave: SNTNL is USD-derived and can
  // never produce riskPct === null, so the journey up to here asks a question
  // its own journal cannot answer. SNTNL1 falls through instrumentCurrency's two
  // regexes → unverified_instrument → riskDollar null → riskPct null, WITH a stop
  // and 100 shares. That row is measured (scripts/sentinel-firing-probe.mjs) to
  // throw under the 51a12d2 guard and render "—" under the current one.
  let fixtureLive = false;
  if (created) {
    try {
      await renameToRiskTicker(page);
      fixtureLive = true;
    } catch (e) {
      add(COMPONENT, 'browser-auth|fixture-failed', 'red', '🔴',
        `הפיכת ${TICKER} ל-${RISK_TICKER} דרך מודל העריכה (מתקן הייצוגיות)`,
        `${e.message}`,
        'העריכה נשברה — וגם: בלי השורה הזו הסנטינל בודק ג\'ורנל ש⛔ יכול להכיל את תקלת 07.09, כלומר ירוק חסר-ערך',
        'בדוק את EditTradeModal (שדה הטיקר :148-152, שמירה :402-405) ואת מסלול הכתיבה ל-trades',
        'rollback — נמוך, מחזיר מצב ידוע-תקין');
    }
  }

  // ---- 6. tabs + E1: did any error boundary open? ----
  // Replaces the old 3-click tab hop. Same coverage (analytics/dashboard/journal
  // are three of the five stops) plus intel and mentoring, and every stop is now
  // asserted rather than merely visited.
  await sweepBoundaries(page, fixtureLive ? `${RISK_TICKER} ביומן` : `⚠️ ${RISK_TICKER} ⛔ ביומן`);
  try {
    await openJournal(page);
  } catch (e) {
    add(COMPONENT, 'browser-auth|tab-switch', 'red', '🔴',
      'חזרה לטאב היומן אחרי סריקת הגבולות',
      `${e.message}`,
      'טאב לא נטען — חלק מהאפליקציה לא נגיש למשתמש מחובר',
      'בדוק שגיאות JS בטאב שנפל ואת ה-deploy האחרון',
      'rollback — נמוך, מחזיר מצב ידוע-תקין');
  }

  // ---- 7. delete through the UI ----
  // The row now carries RISK_TICKER when the rename landed; deleting the ticker
  // that is actually on screen, never the one we hoped for.
  if (created) {
    try {
      await deleteRow(page, fixtureLive ? RISK_TICKER : TICKER);
      uiDeleteOk = true;
    } catch (e) {
      add(COMPONENT, 'browser-auth|delete-failed', 'red', '🔴',
        `מחיקת עסקת הבדיקה דרך ה-UI (כולל דיאלוג האישור)`,
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
