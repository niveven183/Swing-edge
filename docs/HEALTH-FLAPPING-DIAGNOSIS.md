# /api/health Flapping Diagnosis — 2026-07-19

Read-only diagnosis. No code changed in this pass.

## Background

UptimeRobot has been alternating DOWN/UP on `/api/health` in cycles of minutes
(reported: DOWN ~20:26 IL, UP ~20:14 IL — i.e. ~17:14–17:29 UTC). A prior code
read of [api/health.js](../api/health.js) found the logic sound: only
`supabase` is a hard-fail (503) dependency, `finnhub`/`twelvedata`/`coingecko`
are non-fatal (reported as `warnings`, still 200), every check has a 5s
`AbortController` timeout. This pass pulled live data to find the actual
trigger.

## Method

1. Vercel runtime logs + error clusters for `/api/health`, project
   `prj_JaOaPmjgAQSN8yL8UGmF2SHobQVk` (`swing-edge`).
2. Inspected response bodies/timings from whatever requests were captured.
3. Direct live probe: 5× `curl` against `https://swing-edge.com/api/health`,
   30s apart, with full timing breakdown.
4. Checked Vercel deploy history and Supabase project status for
   `zicstkfkwhzvmdkzpidm` for correlated events (deploy cutover, DB pause).

## Findings

| # | Check | Result |
|---|---|---|
| 1 | Vercel plan log retention | **Hobby = 1 hour.** Explicit API message: "requested window likely exceeds your plan's runtime-log retention (Hobby 1h, Pro 1 day, Enterprise 3 days)." A `7d`/`24h` request silently clamps to the last hour. |
| 2 | Runtime errors (`get_runtime_errors`, 24h) | **None** for the project. |
| 3 | `/api/health` requests captured in the last hour (this window happens to cover the reported 17:14–17:29 UTC flap) | **3 requests, all HTTP 200.** `17:14:35 HEAD 200`, `17:20:05 HEAD 200`, `17:29:59 GET 200`. Zero 503s logged. |
| 4 | Live probe, 5× 30s apart (just now, 18:15–18:17 UTC) | **5/5 → HTTP 200.** `time_total`: 1.88s (first/coldest), 0.69s, 1.49s, 0.71s, 0.87s. |
| 5 | Per-check timings from live probe bodies | `supabase`: 959/360/700/340/504 ms — well under the 5000ms timeout, no near-timeout latency, no pause/cold-start signature. `finnhub` 39–83ms, `twelvedata` 24–168ms, `coingecko` 38–64ms. |
| 6 | `warnings` field in every single live probe | **`["twelvedata"]` present in all 5/5** responses — TwelveData is *consistently* flagged (non-fatal, still 200), not an intermittent blip. |
| 7 | Supabase project status | `ACTIVE_HEALTHY` (not paused). Free-tier auto-pause requires ~7 days of inactivity; the constant health-check + app traffic makes this implausible as the cause. |
| 8 | Last deploy vs. incident window | Latest deploy (`bb80480`, gate2.1) went out at **10:36 UTC** — ~7 hours before the 17:14–17:29 UTC flap window. No deploy-cutover correlation. |
| 9 | Vercel/Supabase security advisories | Found unrelated pre-existing RLS/SECURITY DEFINER warnings on the Supabase project — out of scope for this diagnosis, not touched. |

## Root cause

**Not proven server-side.** Every request we can actually observe — both the
3 requests Vercel logged inside the exact incident window, and 5 fresh
live probes just now — returned 200 quickly (0.69–1.9s), with `supabase`
timings nowhere near its 5000ms timeout. There is no 503 anywhere in the
data, no runtime error, no deploy correlation, and no Supabase pause/cold-start
signature. The code is not observed to be the trigger.

**Leading suspect, ranked:**

1. **UptimeRobot monitor configuration** (most likely). If the monitor's own
   timeout is tight (e.g. 5–10s) relative to an occasional slower cold start
   (we saw the coldest of our 5 probes take 1.88s — a longer idle period
   before a check could plausibly push this higher), or if it alerts on a
   single failed check instead of requiring N consecutive failures, that
   alone reproduces "DOWN for a minute or two, then UP" without any real
   server-side degradation. We could not inspect UptimeRobot's own
   timeout/interval/alert-threshold settings — no MCP tool for it was
   available in this session, so this is inferred, not confirmed.
2. **Vercel edge-level interference** (bot/challenge/deployment-protection
   intercepting the automated monitor traffic before it reaches the
   function). Not directly checkable with the tools available this session;
   flagged as a gap, not evidence.
3. **Network flakiness between UptimeRobot's probe location and
   swing-edge.com** (DNS/TLS). Our own probes connected fast and cleanly
   (0.01–0.13s connect time) — no evidence of this, but the 1-hour log
   retention means we can't retroactively confirm or rule this out for past
   occurrences beyond the window we happened to catch.

**Ruled out:** code logic bug in `api/health.js`, Supabase free-tier
pause/cold-start, deploy-cutover timing, sustained runtime errors.

**Disclosed gap:** Vercel Hobby's 1-hour log retention is the hard limit on
how far back this diagnosis can reach. We got lucky that the reported
incident window fell inside the last hour; anything older is unverifiable
via Vercel logs.

## Recommendation (staged)

**(B) Monitor settings — do this first, zero risk, directly matches the evidence:**
- Turn on "alert after N failures" / confirmation-based alerting in
  UptimeRobot (e.g. require 2 consecutive failed checks) instead of alerting
  on a single miss. This is the standard fix for exactly this flapping
  pattern and requires no deploy.
- Increase the monitor's per-check timeout to comfortably clear observed
  worst-case latency (our coldest probe was 1.88s; give it headroom — 15–30s).
- If the monitor does keyword/content matching on the response body, double
  check it isn't keying off the *absence* of `"warnings"` — TwelveData's
  warning is present in every response right now (finding #6), so a naive
  keyword rule expecting a "clean" body would misfire on every single check.

**(A) Code — optional, defense-in-depth, only if (B) doesn't fully resolve it:**
- Add one lightweight internal retry (short backoff) around `checkSupabase()`
  specifically, since it's the sole hard-fail dependency — protects against
  a single transient network blip being escalated to a 503. Small, contained
  change to `api/health.js`.

**(C) Combined:** Apply (B) now since it's the best evidence-to-risk ratio.
Revisit (A) only if flapping continues after the monitor-side fix — at that
point the extra data point (does raising monitor thresholds alone fix it?)
will tell us whether the code even needs to change.
