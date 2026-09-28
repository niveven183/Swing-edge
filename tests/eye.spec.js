// tests/eye.spec.js — the first four eye checks a machine judges.
//
// ⚠️ THIS FILE LIVES IN `tests/`, NOT `tests-sentinel/`, AND THAT IS THE POINT.
// `tests-sentinel/*` reports findings and stays green while the app is broken.
// The closure rule this wave rests on (DECISIONS, 24.09) lets a `C-` item close
// on a COMPLETED green CI run — which is only worth anything if the run can go
// red. So: sentinel's CODE conventions, smoke's FAILURE contract.
//
// Each test ends with the same three liveness assertions, because every tool in
// `eyeTools.js` can fail to install, and a tool that never listened reports
// "nothing happened" — a false green (`INCIDENTS#13`).

import { test, expect } from "@playwright/test";
import {
  ONBOARDING_PATTERNS,
  installFlashRecorder,
  readFlashes,
  recordNetwork,
  interceptUserSettings,
  interceptFx,
  blockAllRestWrites,
  login,
  freshUserState,
  redact,
} from "./lib/eyeTools.js";

const BASE_URL = process.env.TEST_URL || "https://swing-edge.com";
const QA_EMAIL = process.env.SENTINEL_QA_EMAIL;
const QA_PASSWORD = process.env.SENTINEL_QA_PASSWORD;
const HAVE_CREDS = !!(QA_EMAIL && QA_PASSWORD);

// ⛔ `test.skip()` on a CI run with no credentials would be a FALSE GREEN — the
// exact thing the closure rule forbids. In CI, missing secrets are RED.
// `smoke.yml` fires only on push/schedule/workflow_dispatch, so there is no fork
// run that could legitimately lack them.
test("eye: QA credentials are wired (CI only)", async () => {
  test.skip(!process.env.CI, "local runs are allowed to have no QA credentials");
  expect(
    HAVE_CREDS,
    "SENTINEL_QA_EMAIL / SENTINEL_QA_PASSWORD are not reaching the test process. Refusing to skip: a skipped auth suite reads as ✅."
  ).toBe(true);
});

test.describe("eye→CI · onboarding + hydration", () => {
  test.skip(!HAVE_CREDS, "no QA credentials (local run)");

  // ── ONE login for three tests (Niv, 24.09 ②). The QA account already
  // authenticates hourly from the sentinel; four more logins per push is cost
  // with no information in it. `C-059`⓵ is the exception — it measures the
  // LOGIN MOMENT itself, so it cannot reuse a session that was already open.
  let STATE = null;
  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({ baseURL: BASE_URL });
    const page = await ctx.newPage();
    await login(page, QA_EMAIL, QA_PASSWORD);
    STATE = await ctx.storageState();
    await ctx.close();
  });

  // Every test asserts the same things about the QA account before it ends.
  //
  // Allowlist is EMPTY by decision (Niv, 24.09 ③) — with ONE measured exception
  // passed in by `C-059`⓸ and explained there. An unexpected write to any table is
  // red, and the message carries the TABLE NAME (`B-335` — the label says what
  // happened, it does not guess).
  //
  // ⚠️ TWO assertions, ⛔ one. `recordNetwork` is a passive `page.on('request')`
  // listener: it proves the app did ⛔ ATTEMPT a write. `blocker.assertInterceptedAll`
  // proves the other half — every attempt that DID happen was fulfilled locally
  // and never reached the row. Either one alone is half the claim.
  function assertAccountUntouched(net, blocker, allow = []) {
    const seen = net.assertAlive();
    const observed = net.writes();
    blocker.assertInterceptedAll(observed);
    expect(
      observed.filter((w) => !allow.includes(w)),
      `unexpected write(s) to the QA account (${seen} /rest/v1 requests observed). Allowed here: ${allow.join(" | ") || "(nothing)"}.`
    ).toEqual([]);
  }

  // ───────────────────────────────────────────────────────────────────────
  // C-059⓸ — a new account (authoritative "no row") IS shown the questionnaire.
  //
  // This is also the POSITIVE CONTROL for the derived patterns (Niv, 24.09 ①):
  // if somebody rewords the onboarding screen, THIS test goes red — instead of
  // C-059⓵ going quietly green forever against a pattern that matches nothing.
  //
  // `freshUserState` strips the `swingEdge*` local keys. Without it the reused
  // session carries `swingEdgeOnboarding`, `SwingEdge_App.jsx:1194` seeds
  // `showOnboarding` from it, and the `else if (showOnboarding === null)` branch
  // at :1876 is never reached — the questionnaire would be absent for a reason
  // that has nothing to do with the row, and the test would lie.
  // ───────────────────────────────────────────────────────────────────────
  test("C-059⓸ — 200 [] (no row) ⇒ the questionnaire IS shown", async ({ browser }) => {
    const ctx = await browser.newContext({ baseURL: BASE_URL, storageState: freshUserState(STATE) });
    const page = await ctx.newPage();
    try {
      const net = recordNetwork(page);
      const blocker = await blockAllRestWrites(page);
      const iv = await interceptUserSettings(page, "empty");
      await installFlashRecorder(page, ONBOARDING_PATTERNS);

      await page.goto("/app", { waitUntil: "load" });

      // The reused storageState survived the reload — we are authenticated, not
      // looking at the login form. Without this the next assertion could pass
      // for the wrong reason on a totally different screen.
      await expect(
        page.locator('input[autocomplete="current-password"]'),
        "storageState did not survive the reload — this run measured a logged-out page"
      ).toHaveCount(0);

      await expect(
        page.getByText(ONBOARDING_PATTERNS[0], { exact: false }).first(),
        "no row in user_settings, yet the onboarding questionnaire never rendered"
      ).toBeVisible({ timeout: 20_000 });

      const flashes = await readFlashes(page);
      const missing = ONBOARDING_PATTERNS.filter((p) => !flashes[p]);
      expect(
        missing,
        `derived onboarding pattern(s) never matched. The screen copy was reworded and the C-059⓵ anchor is now blind:\n${missing.join("\n")}`
      ).toEqual([]);

      iv.assertMatched();
      // ⚠️ THE ONE NON-EMPTY ALLOWLIST IN THIS FILE, AND IT IS A MEASUREMENT.
      // Under a synthetic `200 []` the app is SUPPOSED to write: `loadSettings`
      // marks `empty` WRITABLE on purpose (userSettings.js:194 — "a brand-new user
      // must be able to write his first row") and the persist effect then POSTs it.
      // That write is EXPECTED, and Niv's rule is that an *unexpected* write is red.
      // ⛔ its ABSENCE is asserted: the debounce is 1000ms and this test asserts as
      // soon as the questionnaire is visible, so whether it has fired yet is a race.
      // What is NOT a race, and is asserted: it never reached the database
      // (`assertInterceptedAll`), and no OTHER table was touched.
      assertAccountUntouched(net, blocker, ["POST user_settings"]);
    } finally {
      await ctx.close();
    }
  });

  // ───────────────────────────────────────────────────────────────────────
  // C-059⓵ — a veteran login never flashes the questionnaire.
  //
  // The only test that logs in fresh: it measures the login moment itself.
  // The only test WITHOUT a read interceptor: it runs against the real row.
  // Writes are still blocked (Niv, 24.09 ③).
  // ───────────────────────────────────────────────────────────────────────
  test("C-059⓵ — veteran login ⇒ the questionnaire never appears, not even for a frame", async ({ browser }) => {
    const ctx = await browser.newContext({ baseURL: BASE_URL });
    const page = await ctx.newPage();
    try {
      const net = recordNetwork(page);
      const blocker = await blockAllRestWrites(page); // GETs pass through to the real row
      await installFlashRecorder(page, ONBOARDING_PATTERNS);

      await login(page, QA_EMAIL, QA_PASSWORD);
      await page.waitForLoadState("networkidle").catch(() => {});

      // The steady-state check anybody would have written. It is GREEN whether or
      // not there was a flash — that is precisely why the recorder exists. Kept
      // here as the in-suite control (see K2 in scripts/eye-probe.mjs).
      await expect(page.getByText(ONBOARDING_PATTERNS[0], { exact: false })).toHaveCount(0);

      const flashes = await readFlashes(page);
      const appeared = Object.keys(flashes);
      expect(
        appeared,
        `onboarding copy appeared during a veteran login (t+${appeared.map((p) => Math.round(flashes[p].firstSeenMs)).join("ms, ")}ms). The steady-state check above was green at the same time.`
      ).toEqual([]);

      assertAccountUntouched(net, blocker);
    } finally {
      await ctx.close();
    }
  });

  // ───────────────────────────────────────────────────────────────────────
  // C-036 — a FAILED read is not "this user is new".
  //
  // The opposite branch of the same function. `500` ⇒ `loadFailed` ⇒
  // `writable.delete` ⇒ `setShowOnboarding(false)` (SwingEdge_App.jsx:1841).
  // Showing the questionnaire here would overwrite real capital — irreversible.
  // Skipping it for a genuinely new user costs one sign-in — reversible.
  //
  // ⚠️ Run on the FRESH state deliberately: with `swingEdgeOnboarding` present the
  // questionnaire would be absent no matter what the server said, and the test
  // would pass while proving nothing.
  //
  // 🔴 TWO PHASES, AND THAT IS ⛔ THOROUGHNESS — IT IS A MEASUREMENT.
  // The promise is guarded TWICE and the two guards are not reachable by the same
  // request shape. `SwingEdge_App.jsx:1815` awaits `migrateFromLocalStorage`
  // (`select=user_id`) and its `check-failed` branch RETURNS at `:1822`. Only if
  // that check completes does `loadSettings` (`select=settings`) run and reach
  // `:1830`. Measured 24.09 by `scripts/eye-probe.mjs`: under a blanket 500 the
  // `:1830` guard is NEVER REACHED — a mutant aimed at it was a NO-OP. An earlier
  // draft of this comment claimed "either branch satisfies this"; the probe proved
  // that sentence false, and one phase would have left half the promise unguarded.
  //   phase 1 (`error`)      — the table is unreachable   ⇒ exercises `:1822`
  //   phase 2 (`error-blob`) — the row EXISTS, its blob read 500s ⇒ exercises `:1830`
  // ───────────────────────────────────────────────────────────────────────
  test("C-036 — a failed read ⇒ the questionnaire is NOT shown (both guards)", async ({ browser }) => {
    // One phase = one fresh context: a second load in the same page would carry
    // the state the first one settled, and the measurement would be of that.
    async function phase(mode) {
      const ctx = await browser.newContext({ baseURL: BASE_URL, storageState: freshUserState(STATE) });
      const page = await ctx.newPage();
      try {
        const net = recordNetwork(page);
        const blocker = await blockAllRestWrites(page);
        const iv = await interceptUserSettings(page, mode);
        await installFlashRecorder(page, ONBOARDING_PATTERNS);

        await page.goto("/app", { waitUntil: "load" });

        // Hydration failed ⇒ `hydrationFailed` ⇒ `onboardingSettled` ⇒ the app
        // renders. If this never appears the page is stuck on the loader and the
        // "no questionnaire" assertion below would be vacuously true.
        await page.locator('[data-tour-tab="dashboard"]').waitFor({ state: "visible", timeout: 25_000 });

        const flashes = await readFlashes(page);
        const appeared = Object.keys(flashes);
        expect(
          appeared,
          `[${mode}] a FAILED settings read was treated as "new user" and the questionnaire rendered: ${redact(appeared.join(" | "))}. Completing it would overwrite the real capital.`
        ).toEqual([]);

        iv.assertMatched();
        // Phase 2 is vacuous unless the blob read actually happened — if the
        // existence check had failed we would be re-measuring phase 1 and calling
        // it a second guard.
        if (mode === "error-blob") iv.assertReachedBlobRead();
        assertAccountUntouched(net, blocker);
      } finally {
        await ctx.close();
      }
    }

    await phase("error");      // guard :1822 — migrate check-failed
    await phase("error-blob"); // guard :1830 — loadSettings failed
  });

  // ───────────────────────────────────────────────────────────────────────
  // C-058⓵ — an authenticated load with ZERO user intent writes nothing.
  //
  // `B-361`: a page load with no interaction produced a POST, and the debounce
  // then upserted a blob byte-identical to the row it had just read. The fix
  // seeds `lastSent` from the row at read time (userSettings.js:180).
  //
  // The count is PASSIVE — `page.on('request')` sees the request before routing —
  // so the write is both counted and blocked. Both, not a choice between them.
  // ───────────────────────────────────────────────────────────────────────
  test("C-058⓵ — idle authenticated load ⇒ zero writes", async ({ browser }) => {
    const ctx = await browser.newContext({ baseURL: BASE_URL, storageState: STATE });
    const page = await ctx.newPage();
    try {
      const net = recordNetwork(page);
      const blocker = await blockAllRestWrites(page);

      await page.goto("/app", { waitUntil: "load" });
      await page.locator('[data-tour-tab="dashboard"]').waitFor({ state: "visible", timeout: 25_000 });

      // The persistence effect debounces 1000ms and the unload flush is separate.
      // 8s is comfortably past both without being a budget item.
      await page.waitForTimeout(8_000);

      assertAccountUntouched(net, blocker);
    } finally {
      await ctx.close();
    }
  });

  // ───────────────────────────────────────────────────────────────────────
  // C-061 · B-376 — the "fast user": Log Trade while the paper→capital rate is
  // still in flight. Reproduced ON COMMAND by holding /api/fx (`interceptFx`),
  // ⛔ by racing a clock.
  //
  // Found by the sentinel (`create-failed`, 27.09): the QA account's capital is
  // ILS and SNTNL is a USD paper, so sizing needs USD→ILS. While that request was
  // in flight the form said «אין כרגע שער» and Log Trade answered «הגדל הון…» —
  // advice that fixes nothing (B-335's class). Decisions (Niv, 28.09): loading ⇒
  // Log Trade DISABLED «טוען שער…» (א) · failed ⇒ blocked + «נסה לטעון שער שוב»
  // (F2) · 8s ceiling ⇒ failed.
  //
  // ⛔ No trade is ever created: ⓐ/ⓒ never press Log Trade, ⓑ presses it only
  // while sizing is refused (the guard returns before any write), and every
  // write is blocked + counted regardless (`assertAccountUntouched`).
  // ───────────────────────────────────────────────────────────────────────
  const dialog = (page) => page.locator('[role="dialog"]').first();
  const submitBtn = (page) => dialog(page).getByRole("button", { name: /Log Trade|טוען שער|Loading rate/ });
  const sharesInput = (page) => dialog(page).locator("div.text-center.group").filter({ hasText: /Shares/i }).first().locator("input");
  async function openFilledForm(page) {
    await page.goto("/app", { waitUntil: "load" });
    await page.locator('[data-tour-tab="dashboard"]').waitFor({ state: "visible", timeout: 25_000 });
    // The consent banner sits over the FAB on a fresh device (sentinel step 4
    // declines it the same way). Declining writes localStorage only.
    const decline = page.locator('[data-testid="consent-decline"]');
    if (await decline.count()) await decline.click();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator('[data-tour="add-trade"]').click();
    await page.locator("#log-ticker").fill("SNTNL");
    await page.locator("#log-entry").fill("100");
    await page.locator("#log-stop").fill("99");
    await page.locator("#log-target").fill("102");
  }
  const LOADING_BANNER = /טוען שער USD→|Loading the USD→/;
  const NO_RATE_BANNER = /אין כרגע שער USD→|No USD→\w+ rate right now/;
  const WRONG_ADVICE = /הגדל הון, הדק את הסטופ|Raise capital, tighten the stop/;

  test("C-061ⓐ — rate in flight ⇒ Log Trade disabled «טוען שער…», ⛔ «אין שער»; rate lands ⇒ a size", async ({ browser }) => {
    const ctx = await browser.newContext({ baseURL: BASE_URL, storageState: STATE });
    const page = await ctx.newPage();
    try {
      const net = recordNetwork(page);
      const blocker = await blockAllRestWrites(page);
      const fx = await interceptFx(page, "hold");
      await openFilledForm(page);

      await expect(submitBtn(page), "while the rate is in flight Log Trade must read «טוען שער…» — it read something else").toHaveText(/טוען שער…|Loading rate…/);
      await expect(submitBtn(page)).toBeDisabled();
      await expect(dialog(page)).toContainText(LOADING_BANNER);
      await expect(dialog(page), "a rate that is still LOADING was announced as ABSENT").not.toContainText(NO_RATE_BANNER);

      fx.release();
      await expect(submitBtn(page)).toHaveText(/Log Trade/);
      await expect(submitBtn(page)).toBeEnabled();
      await expect(sharesInput(page)).toHaveValue(/^[1-9]\d*$/);
      await expect(dialog(page)).not.toContainText(LOADING_BANNER);

      fx.assertMatched();
      assertAccountUntouched(net, blocker);
    } finally {
      await ctx.close();
    }
  });

  test("C-061ⓑ — rate fails ⇒ «אין שער» + retry, toast ⛔ «הגדל הון»; retry ⇒ a size", async ({ browser }) => {
    const ctx = await browser.newContext({ baseURL: BASE_URL, storageState: STATE });
    const page = await ctx.newPage();
    try {
      const net = recordNetwork(page);
      const blocker = await blockAllRestWrites(page);
      const fx = await interceptFx(page, "error");
      await openFilledForm(page);

      await expect(dialog(page)).toContainText(NO_RATE_BANNER);
      await expect(submitBtn(page)).toBeEnabled();
      await submitBtn(page).click(); // sizing is refused ⇒ the guard returns before any write
      await expect(page.getByText(/אי-אפשר לחשב גודל פוזיציה ולשמור|cannot be sized or saved/).first()).toBeVisible();
      await expect(page.getByText(WRONG_ADVICE), "the toast gave capital advice for a missing RATE (B-335's class)").toHaveCount(0);

      const retry = page.locator('[data-testid="fx-retry"]');
      await expect(retry, "F2: a failed rate must offer «נסה לטעון שער שוב» — otherwise the form is a dead end").toBeVisible();
      fx.restore();
      await retry.click();
      await expect(sharesInput(page)).toHaveValue(/^[1-9]\d*$/);
      await expect(dialog(page)).not.toContainText(NO_RATE_BANNER);

      fx.assertMatched();
      assertAccountUntouched(net, blocker);
    } finally {
      await ctx.close();
    }
  });

  test("C-061ⓒ — rate never answers ⇒ after 8s «אין שער» + retry (⛔ «טוען» forever)", async ({ browser }) => {
    const ctx = await browser.newContext({ baseURL: BASE_URL, storageState: STATE });
    const page = await ctx.newPage();
    try {
      const net = recordNetwork(page);
      const blocker = await blockAllRestWrites(page);
      const fx = await interceptFx(page, "hang");
      await openFilledForm(page);

      await expect(submitBtn(page)).toHaveText(/טוען שער…|Loading rate…/);
      // FX_SETTLE_MS is 8s from the request's start; 15s is the ceiling for the
      // whole window including the time the form took to fill.
      await expect(page.locator('[data-testid="fx-retry"]'), "a rate that never answers kept the form in «טוען» — the 8s ceiling did not fire").toBeVisible({ timeout: 15_000 });
      await expect(submitBtn(page)).toHaveText(/Log Trade/);
      await expect(dialog(page)).toContainText(NO_RATE_BANNER);

      fx.restore();
      await page.locator('[data-testid="fx-retry"]').click();
      await expect(sharesInput(page)).toHaveValue(/^[1-9]\d*$/);

      fx.assertMatched();
      assertAccountUntouched(net, blocker);
    } finally {
      await ctx.close();
    }
  });

  // ⚪ CONTROL ARM (Niv, 28.09) — green on BOTH trees by design. The plan's §1.2
  // says capital is settled before the form is reachable (render gate :4144 waits
  // for onboardingSettled, set in the same block as setCapital). This holds the
  // settings read 3s and measures that the app shell appeared only AFTER the row
  // reached the page. 🔴 Red here means §1.2 is wrong ⇒ STOP, the fix aimed at
  // the wrong window.
  test("C-061 ⚪ control — settings read delayed ⇒ the form is not reachable before capital settles", async ({ browser }) => {
    const ctx = await browser.newContext({ baseURL: BASE_URL, storageState: STATE });
    const page = await ctx.newPage();
    try {
      const net = recordNetwork(page);
      const blocker = await blockAllRestWrites(page);
      const iv = await interceptUserSettings(page, "delay");
      await page.goto("/app", { waitUntil: "load" });
      await page.locator('[data-tour="add-trade"]').waitFor({ state: "visible", timeout: 25_000 });
      const fabAt = Date.now();
      const settledAt = iv.lastFulfilledAt();
      expect(fabAt, `the Log Trade FAB was reachable ${settledAt - fabAt}ms BEFORE the settings row reached the page`).toBeGreaterThanOrEqual(settledAt);

      iv.assertMatched();
      assertAccountUntouched(net, blocker);
    } finally {
      await ctx.close();
    }
  });
});
