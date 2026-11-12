// tests-eye/ctxClose.js — B-454 (B-425 wave, 09.11): ONE teardown for every spec whose route
// callback awaits `route.fetch()` against production (cents · overlay · width). R-6: one copy.
//
// Why (measured, audits/B425-FAMILIES-2026-11.md §2): the callback is a live request to the origin
// (100–1000ms). Since CAS (B-435, 18.10) a settings write answered `201 []` makes the app re-GET, so a
// GET is routinely in flight when the test body has already PASSED and `ctx.close()` runs ⇒
// `route.fetch: Request context disposed` ⇒ a red test with no failed assertion (6/8 prod runs on main
// since 19.10).
//
// `behavior: "wait"` lets the in-flight callbacks FINISH, then the context closes. ⛔ `"ignoreErrors"` —
// Playwright's own suggestion in the error text — would also swallow a GET that really failed (CLAUDE.md §2:
// zero silent failure). ⛔ a timeout · ⛔ a retry · ⛔ an empty catch. A callback that never returns is
// bounded by the test's own timeout, and that is red WITH a reason.
export async function closeCtx(ctx) {
  for (const page of ctx.pages()) await page.unrouteAll({ behavior: "wait" });
  await ctx.unrouteAll({ behavior: "wait" });
  await ctx.close();
}
