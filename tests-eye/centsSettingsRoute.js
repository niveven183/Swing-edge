// tests-eye/centsSettingsRoute.js — the production settings route of cents.spec (K2), one copy (R-6) so
// scripts/cents-lang-probe.mjs can run the SAME bytes against a stub.
//
// Reads the QA row AS IT IS for money (₪ capital — B-465 checks it) and answers every settings WRITE locally ⇒
// the row never changes. 🆕 INCIDENTS#46 (12.11): the language is now EXPLICIT for both runs. Before, «he» passed
// the row's `lang` through — and when the live row carried `lang: "en"` the whole app ran in English, the toast was
// «Closed with profit», and `a · he` went red on both devices with the trade closed correctly. The row's own `lang`
// is reported to the caller (`onRow`) so the fixture verdict can still say the ACCOUNT moved.
export function settingsView(row, lang) {
  if (!(row && row.settings)) return row;
  const settings = { ...row.settings };
  if (lang === "en") delete settings.lang; // the localStorage choice wins (unchanged)
  else if (lang) settings.lang = lang;      // ⛔ the live row decides the test's language
  return { ...row, settings };
}

export async function installCentsSettingsRoute(ctx, lang, onRow = () => {}) {
  await ctx.route(/\/rest\/v1\/user_settings/, async (route) => {
    const req = route.request();
    if (req.method() !== "GET") return route.fulfill({ status: 201, contentType: "application/json", body: "[]" });
    const res = await route.fetch();
    const body = await res.json();
    const first = Array.isArray(body) ? body[0] : body;
    if (first && first.settings) onRow({ lang: first.settings.lang ?? null });
    return route.fulfill({ response: res, json: Array.isArray(body) ? body.map((r) => settingsView(r, lang)) : settingsView(body, lang) });
  });
}
