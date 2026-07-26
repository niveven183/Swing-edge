# Sentinel S2.1 — hydration evidence + suppress false recovery

## Context

The S2 authenticated layer has run 3 times in production (15:42 manual, 17:02, 20:47) and
failed every time with `browser-auth|hydration-failed` — a locator Timeout at 8000ms. The
"✅ recovery" posted at 18:33 was fake: that cycle had MIN=32, outside the 45→09 gate, so the
auth layer never ran at all. **There has not been a single successful pass of the auth layer.**

Two independent bugs produce this state. One makes the monitor lie; the other makes the finding
useless for diagnosis.

### Bug 1 — an absent layer is read as "recovered"

`.github/workflows/sentinel.yml:555` declares recovery for any fingerprint that was in state and
is no longer in the current findings. It never asks whether the layer that produces that
fingerprint actually ran. The public layer runs every cycle, so the assumption holds there. The
auth layer runs once an hour, so on the other ~1.5 runs per hour every `browser-auth|*` incident
disappears from findings for a reason that has nothing to do with recovery — and the next auth
run re-reports it as "תקלה חדשה". Result: a fake recover/new-fault flip twice an hour, and a real
red incident that never accumulates a persistent-fault count.

Verified mechanic: `NEW` is initialized to `{"incidents":{}}` at line 492 and populated **only**
from current faults (line 552). Anything not in this cycle's findings is dropped by construction —
the persist block at line 602 just writes `$NEW`. So suppressing the recovery *message* alone
would silently delete the incident, and the next real failure would report "תקלה חדשה" instead of
"תקלה נמשכת". The carry-forward is therefore part of the same fix, not an optional extra.

### Bug 2 — the finding carries no evidence

`tests-sentinel/sentinel-auth.spec.js:253-270` waits 8s, then reports a hardcoded hypothesis
("ההגדרות לא נטענו מ-Supabase ... DEFAULT_CAPITAL=2500") as the `reason`. Three failures told us
nothing beyond "a locator timed out", and a guess presented as fact poisons every future
diagnosis. The 8s budget itself is suspect: it was sized against a local Mac measurement
(1.8s/3.5s), while the shared runner talking to Supabase is materially slower.

### Intended outcome

Sentinel stops emitting fake recoveries for a layer that did not run, and the next auth run
returns the actual number rendered on screen — so we can tell a real hydration bug (element shows
2,500) apart from an infrastructure timeout (element never appeared).

---

## Change 1 — `.github/workflows/sentinel.yml`

**1a. Pass the gate result into the classify step** (step at line 470)

`AUTH_EXPECTED` is currently exposed only to the *"Run public checks"* step (line 125). The
classify step's `env:` block has just `DISCORD_WEBHOOK` and `GH_EVENT`, so the variable is not
visible where the recovery loop runs. Add it:

```yaml
      - name: Classify, dedup and report
        env:
          DISCORD_WEBHOOK: ${{ secrets.SENTINEL_DISCORD_WEBHOOK }}
          GH_EVENT: ${{ github.event_name }}
          AUTH_EXPECTED: ${{ needs.browser.outputs.auth }}
```

The step runs under `set -uo pipefail`, so every read must use `${AUTH_EXPECTED:-}` (same defensive
form already used at line 448). When the browser job crashes outright the output is empty → treated
as "did not run" → state is preserved. That is the safe direction.

**1b. Skip recovery + carry state forward** (recovery loop, line 555)

Insert immediately after the existing `cur_fps` membership check:

```bash
            # The auth layer runs once an hour. On the other runs a browser-auth
            # fingerprint is absent because the layer never ran, not because it
            # recovered. Carry the incident into NEW untouched — NEW is built from
            # current faults only, so anything not copied here is dropped — and let
            # the next real auth run decide.
            # The quotes are load-bearing: an unquoted browser-auth|* is read as
            # case alternation and would match every fingerprint.
            case "$ofp" in
              'browser-auth|'*)
                if [ "${AUTH_EXPECTED:-}" != "1" ]; then
                  oinc="$(echo "$OLD" | jq -c --arg fp "$ofp" '.incidents[$fp]')"
                  NEW="$(echo "$NEW" | jq --arg fp "$ofp" --argjson inc "$oinc" '.incidents[$fp]=$inc')"
                  echo "auth layer did not run — carrying $ofp forward"
                  continue
                fi
                ;;
            esac
```

Carrying the incident verbatim preserves `firstSeen` / `lastAlerted` / `count`, so the next real
auth failure reports **"תקלה נמשכת"** with a correct count, and the 3h re-alert throttle is not reset.

**1c.** Update the stale persist comment at line 597 — cleared incidents are dropped *except*
auth incidents carried forward above.

> Both sub-changes were dry-run against a simulated state file: with `AUTH_EXPECTED=0` the
> auth incident is carried and no recovery is posted; with `AUTH_EXPECTED=1` recovery is posted
> and the incident is dropped. Non-auth fingerprints (`http|slow`) are unaffected in both cases.
> The quoting trap in 1b was confirmed empirically — the unquoted form matches *every* fingerprint
> and would have suppressed all recoveries site-wide.

---

## Change 2 — `tests-sentinel/sentinel-auth.spec.js`

Two module-scope helpers next to the existing `cleanUrl`/`ignored` helpers:

```js
// The finding must carry the amount actually rendered, never an assumption about it.
async function readCapital(locator) {
  let text = '';
  try { text = (await locator.innerText()).replace(/\s+/g, ' ').trim(); }
  catch (e) { return `אזור ההון לא ניתן לקריאה: ${e.message}`; }
  const m = text.match(/\$\s*([\d,]+(?:\.\d+)?)/);
  return m ? `מוצג: $${m[1]} (טקסט מלא: "${text}")` : `מוצג: "${text}" (לא נמצא סכום)`;
}

// Evidence for the timeout path: what the page showed instead. Redaction runs before
// slicing so a half-cut address cannot survive; findings are posted to Discord.
async function pageStateSnippet(page) {
  let body = '';
  try { body = (await page.locator('body').innerText()).replace(/\s+/g, ' ').trim(); }
  catch (e) { return `גוף הדף לא ניתן לקריאה: ${e.message}`; }
  if (!body) return 'מצב הדף: גוף הדף ריק';
  const safe = body.replace(/[\w.+-]+@[\w.-]+\.\w+/g, '[email]');
  const hit = safe.match(/.{0,80}(?:הון התחלתי|starting capital).{0,80}/i);
  return `מצב הדף: "${(hit ? hit[0] : safe).slice(0, 240)}"`;
}
```

Replace step 2 (lines 253-270) — timeout 8s → 25s, split into two fingerprints, evidence in `got`,
hypothesis removed from `reason`:

```js
  // ---- 2. hydration gate. DEFAULT_CAPITAL (2500 → "2,500") renders before
  // the DB answers; asserting anything against defaults is a false green.
  // 25s, not 8s: the diagnosis was measured on a local Mac (1.8s/3.5s), while the
  // shared runner against Supabase is materially slower — 8s never passed once. ----
  const HYDRATION_TIMEOUT = 25_000;
  const capital = page.locator('span').filter({ hasText: /(הון התחלתי|starting capital)\s*\$/ }).first();
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
```

Two separate 25s budgets map exactly onto the two fingerprints: `waitFor` covers "element never
appeared", `toContainText` covers "element exists, wrong value" (it polls, so a late hydration
still passes). Worst case 50s on the failure path only, well inside the 180s per-test budget.
The early `return` is retained — the rest of the journey must not validate against defaults.

### 2b. Make the Supabase failure visible (same commit)

`watch()` drops every response that is not from our own origin (`if (host !== BASE_HOST) return`,
line 89). That filter hides precisely the signal this whole change is chasing: when the settings
fetch to Supabase fails, we see "the element never loaded" and never learn why.

Widen the response listener **in the auth spec only** — `sentinel-public.spec.js` is untouched:

```js
  const supabaseFailedReq = [];
  page.on('response', (res) => {
    if (res.status() < 400) return;
    let host = '';
    try { host = new URL(res.url()).host; } catch { return; }
    if (host === BASE_HOST) { failedReq.push(`${res.status()} ${cleanUrl(res.url())}`); return; }
    // The own-origin filter above hid the answer to "why did hydration fail".
    if (host.endsWith('.supabase.co')) supabaseFailedReq.push(`${res.status()} ${cleanUrl(res.url())}`);
  });
  return { consoleErrors, pageErrors, failedReq, supabaseFailedReq };
```

Tracked separately from `failedReq` so the two stay distinguishable in the report. In `record()`,
only when non-empty (an empty list adds no finding, so no new noise):

```js
  if (diag.supabaseFailedReq.length) {
    add(COMPONENT, 'browser-auth|supabase_request', 'amber', '🟠',
      'בקשות ל-Supabase במסך המחובר',
      redact(diag.supabaseFailedReq.slice(0, 3).join(' | ')),
      'קריאה ל-Supabase החזירה 4xx/5xx — הסיבה הישירה לכשל בטעינת הנתונים',
      'לפי הסטטוס: 401/403 = RLS/מפתח, 429 = rate limit, 5xx = תקלת שירות',
      'אבחון תלוי-סיבה — הערך לפני פעולה');
  }
```

`cleanUrl` already reduces every URL to `origin + pathname`, so query strings — and any token in
them — never reach the finding. The email redaction is factored into a shared `redact()` helper
used by both `pageStateSnippet` and this finding.

Payoff: the next failure arrives as a matched pair — `hydration-timeout` 🟠 alongside
`supabase_request` 🟠 with a 429/500 — and we have the answer in one cycle instead of two. If
Supabase returns 200 but slowly, the *absence* of the second finding is itself the evidence that
the problem is latency.

`record(diag)` is already called on the hydration failure path (line 268), so the pair is emitted
together without further wiring.

**Not touched:** steps 1 and 3-7, `sentinel-public.spec.js`, application code, the 45→09 gate,
`concurrency`.

---

## Change 3 — `docs/INCIDENTS.md`

Standing convention: every prod/CI incident is logged in the same commit as the fix. Add entry
**#6 — 2026-07-26 — Sentinel reported a fake recovery for a layer that never ran**, covering the
three failed auth runs, both root causes, and the prevention rule (a monitor must never infer
health from the absence of a signal it did not collect).

---

## Known one-time artifact (accepted)

`browser-auth|hydration-failed` is retired by this change but still sits in the cached state. On
the first post-deploy run where the auth layer *does* run, it will be absent while
`AUTH_EXPECTED=1`, so Sentinel posts one genuine-looking "✅ התאוששות" for it, immediately followed
by "תקלה חדשה" under the new fingerprint. Accepted per your call: it self-corrects after one cycle
and costs zero backwards-compatibility code.

---

## Verification

1. `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/sentinel.yml'))"` — YAML parses.
2. `bash -n` on the extracted classify script — no shell syntax error.
3. Re-run the state simulation against the **edited** recovery block (not a hand-copy): assert that
   with `AUTH_EXPECTED=0` no recovery is emitted and the incident survives into `NEW`, and with
   `AUTH_EXPECTED=1` recovery is emitted and it is dropped. This is the only way to prove Bug 1
   without waiting for a production cycle.
4. `npx playwright test --config playwright.sentinel.config.js` — the skip path. `SENTINEL_AUTH`
   is unset, so the auth spec skips (line 214) and only `sentinel-public.spec.js` runs against
   production. This proves the new helpers parse and break nothing; it does **not** exercise the
   hydration gate.
5. Full output of steps 1 and 4 pasted into the report.

**Limitation, stated plainly:** the local `.env` holds only `VITE_SUPABASE_*` and
`VITE_SENTRY_DSN` — no `SENTINEL_QA_EMAIL` / `SENTINEL_QA_PASSWORD`. Running with
`SENTINEL_AUTH=1` locally would hit the `secrets-missing` branch and return immediately, proving
nothing. The evidence-capture path can only be confirmed by the next gated production run
(:50 slot), or by a manual `workflow_dispatch` with `run_auth=true`. I will not claim the
hydration fix is verified before one of those reports back.

## Finish

```
git add tests-sentinel/sentinel-auth.spec.js .github/workflows/sentinel.yml docs/INCIDENTS.md
git commit -m "fix(sentinel): S2 hydration evidence capture + suppress false recovery when auth layer skipped"
git push origin main
```

`docs/INCIDENTS.md` is added to your listed `git add` per the same-commit incident convention.

## Status

Approved 2026-07-26 — 1a/1b/1c, both fingerprints, INCIDENTS #6, the accepted one-time artifact,
and the 2b Supabase-visibility addition. This document is published before the code changes land.
