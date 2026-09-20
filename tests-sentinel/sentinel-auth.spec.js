import { test, expect } from '@playwright/test';
import fs from 'node:fs';
// The hydration gate asserts the rendered capital is NOT the default. Importing
// the constant instead of writing `2500` here is the whole point: a literal goes
// blind, silently, on the day the default moves — B-324's class exactly.
import { DEFAULT_CAPITAL } from '../src/utils.js';

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
// POSITIVE health anchors — content that exists only when the panel rendered.
// `toHaveCount(0)` on the crash card is worthless (measured 19.09: it returns in
// 12ms over a page that is about to paint the card, because `count === 0` is
// already true), so the only way to make the absence claim capable of failing is
// to INVERT it: prove the healthy content is there.
//
// ⚠️ ONLY `analytics` QUALIFIES, AND THAT IS A MEASUREMENT, NOT A CHOICE.
// Inside the five boundary ranges there are exactly two machine hooks:
//   analytics 6155-6779 → data-tour="setup-matrix" (:6305) and id="eqFull" (:6192)
//   journal   5039-5519 → data-testid="journal-table" (:5315), data-tour="add-trade" (:5270)
//   risk 4772-5032 · mentoring 4284-4450 · watchlist 6866-6972 → ZERO
//     (no data-*, no id, no role, no aria-label — only Tailwind classNames)
// `setup-matrix` is an unconditional child of the panel root (:6156). The journal
// pair is NOT usable: the table only renders on the third branch of
// :5255/:5264/:5280 and `add-trade` renders on the mutually exclusive empty one,
// so an absent table means "empty journal" at least as often as "crashed" — a
// false RED, which is the same defect wearing the other face.
// ⛔ INVENTING A HOOK FOR THE OTHER FOUR IS A PRODUCT CHANGE, and a hook added to
// pass a gate is R-4. They stay one-shot and are declared, never counted as a pass.
const PANEL_HEALTH = {
  analytics: '[data-tour="setup-matrix"]',
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

// ⚠️ 20.09 (B-335's class) — the `$`-only regex below used to hardcode the sign
// in the OUTPUT too: an ILS display would have reported «לא נמצא סכום» while the
// amount was right there on screen, and a shekel amount would have been printed
// under a dollar sign. The `got` field is labelled "what came back"; prose there
// is a lie about a measurement. Both the match and the echo now carry whichever
// sign was actually rendered.
const CAPITAL_RE = /([$₪])\s*([\d,]+(?:\.\d+)?)/;

async function readCapitalText(locator) {
  try { return (await locator.innerText()).replace(/\s+/g, ' ').trim(); }
  catch { return ''; }
}

// The rendered amount as a NUMBER, or null when none was found. null is the
// admission — ⛔ never 0, which the gate would read as a real (failing) capital.
async function readCapitalNumber(locator) {
  const m = (await readCapitalText(locator)).match(CAPITAL_RE);
  if (!m) return null;
  const n = Number(m[2].replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

// The finding must carry the amount actually rendered, never an assumption about it.
async function readCapital(locator) {
  let text = '';
  try { text = (await locator.innerText()).replace(/\s+/g, ' ').trim(); }
  catch (e) { return `אזור ההון לא ניתן לקריאה: ${e.message}`; }
  const m = text.match(CAPITAL_RE);
  return m ? `מוצג: ${m[1]}${m[2]} (טקסט מלא: "${text}")` : `מוצג: "${text}" (לא נמצא סכום)`;
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
// ⚠️ ATTRIBUTE ANCHOR, NEVER TEXT. Both text forms are MEASURED broken, in
// Chromium against the real cell shape — not reasoned about:
//
//   locator                     SNTNL   SNTNL1   AAPL
//   hasText: '…'  (substring)     2        1       1
//   hasText: /\b…\b/              0        0       1
//   has: [data-testid=…]          1        1       1
//
// · The substring form matches the SNTNL1 row too, so deleteRow's "exactly 1"
//   guard sees 2 and refuses. That is why the word-boundary form replaced it.
// · The word-boundary form matches NOTHING. TickerLogo renders a 2-letter TEXT
//   badge when the logo 404s (TickerLogo.jsx:8-14) and sits flush against
//   {t.ticker} (SwingEdge_App.jsx:5335), so the row Playwright reads is
//   "SNSNTNL1…". The char before the ticker is `N`, a word char, so no boundary
//   exists there. AAPL is the control that proves the badge is the difference
//   and not the regex: FMP returns 200 for AAPL and 404 for both test tickers,
//   so only the test tickers ever fall back — which is exactly why the 3 sacred
//   trades could never have exposed this.
//
// ⚠️ innerText DOES carry a separator ("SN\nSNTNL1…"); hasText matches against
// concatenated textContent and does NOT. A check written against the string the
// author imagines cannot see that gap — the note that stood here claimed
// "verified mutually exclusive" and was measured wrong on BOTH tickers, and the
// first real run after it landed died 71 minutes later. B-312 / INCIDENTS#21.
//
// Attribute equality is exact by construction, so SNTNL and SNTNL1 cannot
// collide by any string rule. Same remedy as JOURNAL_TABLE above (B-146), one
// layer in.
const tickerCell = (page, sym) => page.locator(`[data-testid="trade-ticker-${sym}"]`);

function rowsFor(page, sym) {
  return page.locator(ROWS).filter({ has: tickerCell(page, sym) });
}
function sntnlRows(page) {
  return rowsFor(page, TICKER);
}
// The sacred ticker whose logo LOADS (FMP 200 → <img>, alt is not textContent),
// so it is the only one measured to carry no text badge. Named, not indexed into
// FIXED_TRADES: NVDA/BTC-USD were never measured for this.
const ANCHOR_CONTROL = 'AAPL';

// ─── the anchor counts, printed (B-312) ─────────────────────────────────────
//
// The three anchor controls are Playwright assertions, and a passing assertion
// prints NOTHING. A fully green run left `findings: 0`, `removed 0` and no count
// anywhere, so "3 controls observed" could never be quoted from a log — the one
// string that did appear rode on an incidental yellow finding. These lines print
// the numbers :436-437 already read. Measured counts, never "passed", and no
// assertion of their own.
//
// The control line re-measures the SAME rows at the SAME moment with the shape
// B-305 replaced — `hasText: /\bSNTNL1\b/`. `legacy=0 anchor=1` is the evidence
// the anchor fixed something. `legacy=1` means the TickerLogo badge did not fall
// back on this run, so the journey never carried the 07.09 defect and the anchor
// is unproven — a number to read and stop on, NOT a failure. Measurement only:
// this arm is allowed to fall, which is why it can never throw out of here.
async function logAnchorCounts(page) {
  try {
    const sntnl = await rowsFor(page, TICKER).count();
    const sntnl1 = await rowsFor(page, RISK_TICKER).count();
    const control = await rowsFor(page, ANCHOR_CONTROL).count();
    const legacy = await page.locator(ROWS)
      .filter({ hasText: new RegExp(`\\b${RISK_TICKER}\\b`) })
      .count();
    // eslint-disable-next-line no-console
    console.log(`sentinel anchor: ${TICKER}=${sntnl} ${RISK_TICKER}=${sntnl1} ${ANCHOR_CONTROL}=${control}`);
    // eslint-disable-next-line no-console
    console.log(`sentinel control: legacy=${legacy} anchor=${sntnl1}`);
  } catch (e) {
    // Swallowing the count would be the silent failure this whole item is about.
    // eslint-disable-next-line no-console
    console.log(`sentinel anchor: unmeasured — ${e.message}`);
  }
}
// Anything this run owns, for the leftover sweep: one locator, both tickers.
function testRows(page) {
  return page.locator(ROWS).filter({
    has: page.locator(TEST_TICKERS.map((s) => `[data-testid="trade-ticker-${s}"]`).join(', ')),
  });
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
  // The tab bar itself has to settle before "this tab is missing" can mean
  // anything. A one-shot count that reads 0 because the shell has not painted
  // is indistinguishable from the mentoring tab's LEGITIMATE absence, and the
  // panel is then declared unmeasurable — a yellow that hides a real crash.
  // ⛔ `toHaveCount(0)`: it passes on the first poll, so it cannot separate the
  // two. Only a POSITIVE claim on the bar can (B-334).
  try {
    await expect
      .poll(() => page.locator('[data-tour-tab]').count(), { timeout: 10_000 })
      .toBeGreaterThan(0);
  } catch {
    return 'shell-absent';
  }
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
    try {
      // Settle barrier, and it settles in BOTH directions: healthy content OR
      // the crash card. A slow panel is waited for; a crashed one resolves the
      // moment the card paints, so nothing is paid for the failing case.
      // Panels with no anchor (see PANEL_HEALTH) skip this and stay one-shot.
      const health = PANEL_HEALTH[name];
      if (health) {
        await expect
          .poll(() => page.locator(`${health}, [data-boundary="${name}"]`).count(),
            { timeout: 10_000 })
          .toBeGreaterThan(0);
      }
      n = await page.locator(`[data-boundary="${name}"]`).count();
    }
    catch (e) {
      add(COMPONENT, `browser-auth|boundary-check-failed|${name}`, 'yellow', '🟡',
        `בדיקת גבול הפאנל "${name}" (${phase})`,
        `${e.message}`,
        'הבדיקה עצמה נכשלה — לא ניתן לדעת אם הפאנל קרס',
        'מועמדים: (1) הקונטקסט/הדף נסגר באמצע הספירה (2) ניווט התרחש בזמן הספירה (3) data-boundary ⛔ נכתב ב-PanelBoundary.jsx',
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
  // Settle barrier before the absence claim. The shell anchor is
  // `[data-tour-tab]` (SwingEdge_App.jsx:4268) — it sits OUTSIDE every
  // PanelBoundary, and RootFallback replaces the whole tree, so the two are
  // mutually exclusive: a root crash drives the bar to 0 and holds it there.
  // Polling for EITHER settles fast in both directions and costs the failing
  // case nothing. ⛔ `toHaveCount(0)` on the fallback — it returns on the first
  // poll and can never wait for a crash that has not painted yet (B-334).
  try {
    await expect
      .poll(() => page.locator('[data-tour-tab], [role="alert"] h1').count(),
        { timeout: 15_000 })
      .toBeGreaterThan(0);
  } catch { /* neither painted — the read below runs anyway and reports what it sees */ }
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
  // PRESENCE claim ⇒ toHaveCount genuinely retries (measured 1801ms on a row
  // that mounted late), unlike the absence form. The one-shot count here read 0
  // before the table painted and threw a FALSE RED naming the wrong cause.
  // Playwright's own message carries Expected/Received, so `got` stays MEASURED.
  await expect(rows).toHaveCount(1, { timeout: 15_000 });
  const row = rows.first();
  // Second guard, on the SAME anchor and never on text. The old form read
  // innerText and would have passed here even while rowsFor matched 0 rows —
  // two guards reading two different channels is one guard (B-312).
  await expect(row.locator(`[data-testid="trade-ticker-${sym}"]`))
    .toHaveCount(1, { timeout: 15_000 });
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
  // PRESENCE claim — same reason as deleteRow: the one-shot count could read 0
  // before the table painted and abort the rename with the wrong cause.
  await expect(rows).toHaveCount(1, { timeout: 15_000 });
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
  await logAnchorCounts(page);
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
        `המחיקה ב-UI דווחה כהצליחה, ו-DELETE על ${CLEANUP_FILTER} עוד מצא ${n} שורות`,
        `הניקוי סורק ${TEST_TICKERS.join('/')} ואילו המחיקה ב-UI נגעה בטיקר אחד בלבד ⇒ ⛔ נמדד כאן אם השורה שנשארה היא זו שה-UI כיוון אליה`,
        'מועמדים: (1) מסע קודם קרס בין היצירה לשינוי-השם והשאיר את הטיקר השני (2) המחיקה ב-UI הסירה מה-state ו⛔ נחתה ב-Supabase (3) מחיקה מקבילה מריצה אחרת. ⓶ בלבד מצביע על handleDeleteTrade',
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
      `${e.message}`,
      'רצף הכניסה goto → email → password → submit → סרגל הטאבים נקטע. השלב שנכשל הוא זה שבהודעה, והשלבים שאחריו ⛔ רצו',
      'מועמדים: (1) /app ⛔ נטען (2) עוגני הטופס זזו (3) Supabase Auth דחה או ⛔ ענה (4) הכניסה נחתה וסרגל הטאבים ⛔ רונדר. אם ⓷ — זו התקלה הכי יקרה',
      'rollback — נמוך, מחזיר מצב ידוע-תקין');
    record(diag);
    return;
  }

  // ---- 2. hydration gate. DEFAULT_CAPITAL renders before the DB answers;
  // asserting anything against defaults is a false green.
  // 25s and not 8s: the diagnosis was measured on a local Mac (1.8s/3.5s), while
  // the shared runner against Supabase is materially slower — margin is still right.
  //
  // Selector targets the TOP KPI card (data-tour="equity", SwingEdge_App.jsx:4488),
  // which renders immediately in the KPI row. Its `sub` span is
  // `${startedAt} ${dispSym}${capital}` — the DB-loaded capital.
  // NOT the equity-curve card (SwingEdge_App.jsx:4592, "הון התחלתי"), a chart deep
  // in the page that hydrates late: the old /(הון התחלתי|starting capital)/ selector
  // matched only that card and timed out 4/4 even though hydration had succeeded.
  //
  // ⚠️ 20.09 — this gate used to demand the literal string '10,000' behind a `\$`
  // filter, i.e. it assumed capitalCurrency === accountCurrency === USD. It was
  // written 26.07, seven weeks before B-142 gave the equity base a CONVERSION.
  // With capital=10,000 ILS and accountCurrency=USD the screen correctly renders
  // $3,358 (10000 × 0.33575, the 2026-06-10 base-day fixing) and the gate fired
  // red 12× in 3h against a healthy product — and its `return` below blinded the
  // seven stages after it. See docs/audits/HYDRATION-GATE-DIAGNOSIS-2026-09-20.md.
  //
  // ⛔ The replacement is NOT "any number at all" — that would pass on the 2,500
  // this block exists to catch. THREE conditions, all required:
  //   1. a currency sign from [$₪] — both displays are legitimate
  //   2. ≠ DEFAULT_CAPITAL — imported, never a literal (B-324's class)
  //   3. > 0 — "$0" is a failure, not a success
  // What is NOT asserted is the specific amount: it is a product setting Niv may
  // change, and pinning it here is what made this gate stale in the first place. ----
  const HYDRATION_TIMEOUT = 25_000;
  const DEFAULT_SHOWN = DEFAULT_CAPITAL.toLocaleString('en-US'); // 2500 → "2,500"
  const capital = page.locator('[data-tour="equity"]')
    .locator('span')
    .filter({ hasText: /(התחלה|Started at)\s*[$₪]/ })
    .first();
  let capitalVisible = false;
  try {
    await capital.waitFor({ state: 'visible', timeout: HYDRATION_TIMEOUT });
    capitalVisible = true;
    // Condition 1 is already carried by the filter above; re-assert it on the
    // resolved text so the failure message names it.
    await expect(capital).toContainText(/[$₪]\s*[\d,]/, { timeout: HYDRATION_TIMEOUT });
    const shown = await readCapitalNumber(capital);
    if (shown == null) throw new Error(`לא נמצא סכום בטקסט: "${await readCapitalText(capital)}"`);
    if (shown === DEFAULT_CAPITAL) throw new Error(`ההון המוצג הוא DEFAULT_CAPITAL (${DEFAULT_SHOWN}) — ההגדרות ⛔ נטענו מה-DB`);
    if (!(shown > 0)) throw new Error(`ההון המוצג אינו חיובי: ${shown}`);
  } catch (e) {
    if (capitalVisible) {
      add(COMPONENT, 'browser-auth|hydration-default', 'red', '🔴',
        `הון שאינו DEFAULT_CAPITAL (${DEFAULT_SHOWN}), חיובי, עם סימן מטבע — הסימן שההגדרות נטענו מה-DB`,
        await readCapital(capital),
        `אזור ההון קיים אך נכשל בשער גם אחרי ${HYDRATION_TIMEOUT / 1000} שניות: ${e.message}`,
        'בדוק זמינות Supabase, RLS על user_settings, ושגיאות fetch ב-console',
        'אבחון תלוי-סיבה — הערך לפני פעולה');
    } else {
      add(COMPONENT, 'browser-auth|hydration-timeout', 'amber', '🟠',
        `הון שאינו DEFAULT_CAPITAL (${DEFAULT_SHOWN}), חיובי, עם סימן מטבע — הסימן שההגדרות נטענו מה-DB`,
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
      `${e.message}`,
      'openJournal נקטע: click על טאב היומן ואז המתנה לטבלה. השלב שנכשל הוא זה שבהודעה, והשלבים שאחריו ⛔ רצו',
      'מועמדים: (1) העוגן data-tour-tab="journal" זז או נחסם ⇒ ⛔ הייתה המתנה (2) הטאב נפתח והטבלה ⛔ רונדרה (3) שגיאת JS חוסמת בטאב — בדוק pageerror ב-Sentry',
      'rollback — נמוך, מחזיר מצב ידוע-תקין');
    record(diag);
    return;
  }

  try {
    // ⚠️ הספירה מורמת ל-const כדי ש-`got` ידווח **כמה** — הסמנטיקה זהה.
    // ⛔ **ו⛔ נותר כאן חוב `B-334`** — הפרוזה הקודמת אמרה שכן, והמדידה הפריכה:
    // `openJournal` שמעליה ממתין ל-`journal-table` **נראה**, והטבלה מרונדרת אך
    // ורק בענף השלישי של `:5255/:5264/:5280`, כלומר רק כש-`filteredTrades.length > 0`.
    // ⇒ ברגע שהשורה הזו רצה, סט השורות של אותו render כבר ב-DOM; ספירה חד-פעמית
    // כאן ⛔ יכולה לקרוא אפס-מוקדם. מחסום ההתייצבות **כבר קיים**, במעלה הזרם.
    const stale = await testRows(page).count();
    if (stale > 0) {
      add(COMPONENT, 'browser-auth|stale-testdata', 'amber', '🟠',
        `שרידי עסקת בדיקה (${TEST_TICKERS.join('/')}) ביומן`,
        `נמצאו ${stale} שורות ${TEST_TICKERS.join('/')} ביומן לפני תחילת המסע`,
        'שורות בדיקה מריצה קודמת נשארו — הניקוי של אותה ריצה ⛔ הושלם. ⚠️ מאיזו ריצה ומדוע — ⛔ נמדד כאן',
        'מועמדים: (1) המחיקה ב-UI של הריצה הקודמת נכשלה (2) ניקוי ה-REST ב-afterAll נכשל (3) הריצה הקודמת נקטעה בטיימאאוט. נמחקות אוטומטית בריצה זו; בדוק את לוג הריצה הקודמת ב-Actions',
        'מחיקת שורת בדיקה בלבד — ללא סיכון');
      for (const sym of TEST_TICKERS) {
        if (await rowsFor(page, sym).count() > 0) await deleteRow(page, sym);
      }
    }
  } catch (e) {
    add(COMPONENT, 'browser-auth|sweep-failed', 'amber', '🟠',
      `ניקוי שרידי ${TEST_TICKERS.join('/')} ב-UI`,
      `${e.message}`,
      'ניקוי השרידים נקטע: ספירה ואז deleteRow לכל טיקר. ⚠️ האם שורה אכן נשארה ביומן — ⛔ נמדד; ה-REST ב-afterAll עוד ינסה להסיר',
      'מועמדים: (1) הספירה עצמה זרקה ⇒ ⛔ אושרה שורה כלל (2) deleteRow נכשל על טיקר קיים (3) הדף/הקונטקסט נסגר באמצע. אם חוזר: בדוק את זרימת המחיקה ב-UI ואת ניקוי ה-REST',
      'מחיקת שורת בדיקה בלבד — ללא סיכון');
  }

  // ---- 4. journal render — the live fmtR check (AAPL is closed with no stop) ----
  try {
    const rows = page.locator(ROWS);
    // `toHaveCount` cannot express ">=", so the retry comes from expect.poll.
    // This is the settle barrier for the whole block: once it passes, the table
    // is painted, and the per-ticker counts below are no longer one-shot reads
    // over an empty tbody. Candidate (1) in the finding — "the count ran before
    // the table settled ⇒ nothing was actually missing" — is what this removes.
    await expect
      .poll(() => rows.count(), { timeout: 15_000 })
      .toBeGreaterThanOrEqual(FIXED_TRADES.length);
    const missing = [];
    for (const sym of FIXED_TRADES) {
      if (await rows.filter({ hasText: sym }).count() === 0) missing.push(sym);
    }
    if (missing.length) throw new Error(`עסקאות קבע חסרות: ${missing.join(', ')}`);
  } catch (e) {
    add(COMPONENT, 'browser-auth|journal-render', 'red', '🔴',
      'רינדור 3 עסקאות הקבע (AAPL סגורה ללא stop = בדיקת fmtR החיה)',
      `${e.message}`,
      'בדיקת 3 עסקאות הקבע נכשלה. ההודעה אומרת אם חסרו שורות ואילו טיקרים — ⛔ נמדד כאן אם החישוב עצמו שגוי',
      'מועמדים: (1) הספירה רצה לפני שהטבלה התייצבה ⇒ ⛔ חסר כלום (2) שורת קבע חסרה ב-DB של חשבון ה-QA (3) שגיאת רינדור בשורה. בדוק pageerror ב-Sentry לפני שנוגעים ב-fmtR/calcTradeMetrics',
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
      const b = await page.locator('[data-tour="add-trade"]').boundingBox();
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
  // when the page is scrolled down.
  // ⚠️ 20.09 — this used to read `.last()`, because the empty-state journal
  // rendered a SECOND element carrying the same data-tour. That workaround is
  // gone with B-351: the empty-state button is now `add-first-trade`, so
  // `add-trade` resolves to exactly one element (the FAB) and a future duplicate
  // makes this line throw strict-mode instead of being papered over. ----
  let created = false;
  try {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator('[data-tour="add-trade"]').click();
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
      'רצף היצירה נקטע: FAB → 4 שדות → Log Trade → שורה בטבלה. השלב שנכשל הוא זה שבהודעה, והשלבים שאחריו ⛔ רצו',
      'מועמדים: (1) עוגן ה-FAB או אחד מ-#log-ticker/entry/stop/target זז ⇒ הטופס ⛔ הוגש (2) הטופס הוגש ונדחה בוולידציה (3) הכתיבה ל-trades ⛔ נחתה (4) נחתה והשורה ⛔ רונדרה. ⓷ בלבד מצביע על handleSubmit/Supabase',
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
        'renameToRiskTicker נקטע. השלב שנכשל הוא זה שבהודעה. וגם: בלי השורה הזו הסנטינל בודק ג\'ורנל ש⛔ יכול להכיל את תקלת 07.09, כלומר ירוק חסר-ערך',
        'מועמדים: (1) שער הכניסה ⛔ מצא את השורה ⇒ מודל העריכה ⛔ נפתח (2) המודל נפתח ושדה הטיקר זז (3) השמירה ⛔ נחתה. ⓶/⓷ בלבד מצביעים על EditTradeModal ועל מסלול הכתיבה ל-trades',
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
      'openJournal נקטע בחזרה מסריקת הגבולות: click על טאב היומן ואז המתנה לטבלה. השלב שנכשל הוא זה שבהודעה',
      'מועמדים: (1) העוגן data-tour-tab="journal" זז או נחסם (2) הטאב נפתח והטבלה ⛔ רונדרה (3) סריקת הגבולות השאירה את הדף במצב חריג. בדוק pageerror ב-Sentry ואת ה-deploy האחרון',
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
        'deleteRow נקטע: שער כניסה על השורה → לחיצה על «מחיקה» → אישור בדיאלוג. השלב שנכשל הוא זה שבהודעה, והשלבים שאחריו ⛔ רצו',
        'מועמדים: (1) השורה ⛔ נמצאה ⇒ ⛔ נלחץ כפתור ו⛔ נפתח דיאלוג (2) הכפתור נלחץ והדיאלוג ⛔ נפתח (3) הדיאלוג אושר והמחיקה ⛔ נחתה. ⓶/⓷ בלבד מצביעים על handleDeleteTrade/ConfirmProvider',
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
