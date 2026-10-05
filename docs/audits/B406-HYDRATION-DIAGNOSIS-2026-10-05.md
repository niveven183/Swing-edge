# B-406 · B-397 — אבחון הידרציה (05.10, read-only)

> שלב 1 של §8.1: מדידה **לפני** כל נגיעה בקוד. תוכנית: `docs/plans/PLAN-2026-10-05-b406-b397-hydration-delta.md`.
> סביבה: build הרמטי מ-`19959e6` (`VITE_SUPABASE_URL=https://eyeplaybook.supabase.co`) · Chromium 1194 · `tests-eye/hermetic.js` (Supabase סינתטי עם מצב) · GET של `user_settings` מוחזק עד שחרור מבוקר.
> ⚠️ גבול: Chromium בלבד, ⛔ WebKit · ⛔ פרודקשן · ⛔ שתי לשוניות אמיתיות (B-397 מודל «מכשיר אחר» ככתיבה ישירה לשורה הסינתטית).

## §0 — עובדות שנמדדו (3a · build הרמטי מ-`19959e6`, Chromium, `tests-eye/hermetic.js`, GET של `user_settings` מוחזק עד שחרור)
מסלול: שלב 1 התחברות + הידרציה מלאה (המכשיר «חוזר») ⇒ שלב 2 רענון עם GET מוחזק ⇒ פעולה בחלון ⇒ שחרור ⇒ רענון.
**הממשק חי בחלון רק במכשיר חוזר** (`swingEdgeOnboarding` קיים ⇒ `onboardingSettled`); במכשיר טרי השער מחכה. כך בדיוק היה ב-CI `37214635477`: `storageState` נשא `swingEdgePlaybook="[]"`, ו-`had("[]")` מחזיר `false`.

| תרחיש | פעולה | בחלון | אחרי שחרור + רענון | DB |
|---|---|---|---|---|
| `B-406` playbook | הוסף `WINDOW-SETUP` | מקומי `[WINDOW-SETUP]` | 🔴 מקומי `[]` | 🔴 `[]` |
| `B-406` התראות | התראה `EYEPB:105` על עסקה פתוחה | מקומי `{EYEPB:105}` | 🔴 `{}` | 🔴 `{}` |
| `B-397` (שני מכשירים) | מכשיר B כתב `S2`; A מקומי `[S1]` ⇒ A מוסיף `S3` | A ⛔ רואה `S2` | A: `[S1,S3]` | 🔴 `[S1,S3]` — **`S2` נמחק מה-DB** |
| 🆕 watchlist, **מכשיר טרי** | DB `[AAPL,KO]`, התחברות בדפדפן חדש | — | 🔴 מסך = `DEFAULT_WATCHLIST` | 🔴 **DB נדרס ל-10 ברירות המחדל** |
| ביקורת: משתמש חדש (אין שורה, אין מקומי) | — | — | נוצרה שורה, ⛔ קריסה | ✅ |
| ביקורת: מכשיר טרי, playbook/התראות ב-DB בלבד | — | — | ✅ `DB-ONLY` מוצג · `{AAPL:300}` נטען | ✅ |

⚠️ **ממצא חדש מעבר לפרומפט (→ `B-407`):** במכשיר טרי, אפקט ההתמדה של ה-watchlist כותב את `DEFAULT_WATCHLIST` ל-`localStorage` **בטעינת מסך ההתחברות** (האפליקציה מורכבת לפני ה-auth); ההידרציה רצה אחרי ההתחברות ⇒ `hadWatchlist=true` ⇒ ה-DB נזנח, ושינוי הבא נכתב ⇒ **ה-watchlist של המשתמש מוחלף בברירות המחדל בכל דפדפן/מכשיר חדש.** (התנתקות→התחברות באותו טאב ⛔ מושפעת: `clearUserScopedStorage` מוחק את המפתח.) ייתכן שזה מסביר את `46/46` השורות עם ליטרלי `SCANNER_DATA` (`B-185`) — **מתאם, ⛔ הוכחה**; SQL לניב ב-§6.
⚠️ watchlist ב-B-406 (הוספה בחלון) ⛔ שוחזר עד הסוף — אוכלס ב-defaults בשלב 1 (בדיוק `B-407`); מכוסה בבדיקות ה-spec (§4) עם DB לא-ריק.

## §0b — מפת מפתחות הבלוב (3b)
| מפתח | כותב | קורא בהידרציה | הכלל היום |
|---|---|---|---|
| `capital` · `riskPct` · `accountCurrency` · `capitalCurrency` | אפקט ההתמדה (`:1953`) | `:1859-1879` | **DB גובר** (אם תקין) |
| `lang` | התמדה | `:1893` | DB גובר |
| `onboarding` | התמדה (מראה) · `handleOnboardingComplete` | `:1885` | DB גובר אם `completed` |
| `tourDone` · `betaWelcome` · `welcomeSeen` | `completeTour`/`dismissWelcome` (ישירות ל-DB) · התמדה | `:1909-1917` | OR מונוטוני (`true` גובר) |
| `watchlist` | התמדה · `handleSymbolPick :3667` · מחיקה `:3678` | `:1898` | `hadWatchlist` (מקומי לא-ריק גובר) |
| `priceAlerts` | התמדה · הוספה `:4850` · מחיקה-כשהופעלה `:2136` | `:1902` | `hadAlerts` |
| `playbook` | התמדה · `savePlaybook` (`:7243`; הוספה `:7260` · עריכה `:7257` · מחיקה `:7293`) | `:1906` | `hadPlaybook` |
| `_migrated` | `migrateFromLocalStorage` | — | — |
⚠️ גם סקלרים שנערכו **בחלון** נדרסים ע"י «DB גובר» (שינוי הון בזמן הטעינה) ⇒ **`B-408`, ⛔ בגל הזה** (מסלול אחר: שער עריכה/ממשק, ⛔ מיזוג אוספים).

## §0c — הקשר ל-K6 (3c) — ⛔ פותר · ⛔ מחמיר · **מיושר**
K6 = צד ה**כתיבה** (`upsertBlob` מחליף את כל העמודה; שתי לשוניות דורסות). התיקון כאן נוגע בצד ה**קריאה** בלבד, ⛔ משנה את ה-upsert ⛔ את `alreadySent`. הוא **מממש בקריאה את הכרעת ניב 22.09 ל-`B-361`** («המרוחק מנצח + המפתחות שהלשונית שינתה מוחלים מעליו») — ויומן הדלתא שנבנה כאן הוא בדיוק מה שצד הכתיבה של K6 יצטרך (select→מיזוג→upsert). ⚠️ שתי לשוניות באותו דפדפן חולקות את היומן (localStorage) ⇒ ⛔ החמרה. שתי לשוניות שכותבות **בו-זמנית** — עדיין last-writer-wins (K6, פתוח).


## נספח — מדידת מכסה לתיקון ① (05.10, Chromium)
מכסה ריקה `5,242,877` תווים · אחרי מצב G1 של `probe:image` (trades `1.5M` + 5 סטאפים, תמונה `230,351` תווים + מראה) נותרו `1,438,733` · יומן עם ערכים מלאים `1,152,316` (**נכנס**) · יומן-מפתחות `236`. ⇒ G1 הקיים ⛔ יכול להאדים על «value מלא ביומן»; סטאפ שישי דורש ~`460K` ⇒ G1J.

## נספח — סקריפט השחזור (`node repro-b406.mjs <port> <mode>`, מצבים: playbook · watchlist · alerts · b397 · control-new · control-device)
```js
// B-406 / B-397 reproduction — hermetic build, synthetic Supabase (tests-eye/hermetic.js).
// Phase 1: login, first hydration completes (device becomes "returning").
// Phase 2: reload with the user_settings READS held ⇒ the UI is live while hydration waits;
//          the user acts in that window; release; reload; read localStorage + the DB row.
import { chromium } from "/home/user/Swing-edge/node_modules/playwright/index.mjs";
import { installHermetic, newStore, DUMMY_EMAIL, DUMMY_PASSWORD } from "/home/user/Swing-edge/tests-eye/hermetic.js";
const BASE = `http://127.0.0.1:${process.argv[2]}`;
const MODE = process.argv[3];
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, baseURL: BASE });
const store = newStore();
store.settings.lang = "en";
store.settings.playbook = [];
store.settings.watchlist = [];
store.settings.priceAlerts = {};
if (MODE === "b397") store.settings.playbook = [{ id: 1, name: "S1", description: "", imagePreview: null }];
if (MODE === "control-device") { store.settings.playbook = [{ id: 1, name: "DB-ONLY", description: "", imagePreview: null }]; store.settings.watchlist = [{ ticker: "AAPL", setup: "Custom", chartSym: "NASDAQ:AAPL" }, { ticker: "KO", setup: "Custom", chartSym: "NYSE:KO" }]; store.settings.priceAlerts = { AAPL: 300 }; }
let noRow = MODE === "control-new";
await installHermetic(ctx, store);
await ctx.route(/\/rest\/v1\/user_settings/, (r) => {
  if (noRow && r.request().method() === "GET") {
    const single = /vnd\.pgrst\.object/.test(r.request().headers()["accept"] || "");
    return r.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: single ? "null" : "[]" });
  }
  if (noRow && r.request().method() !== "GET") noRow = false; // the first write creates the row
  return r.fallback();
});
await ctx.route(/\/api\/symbol-search/, (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ symbol: "NVDA", exchange: "NASDAQ", description: "NVIDIA", type: "stock", currency_code: "USD" }]) }));
let release; const gate = new Promise((r) => (release = r));
let held = 0, armed = false;
await ctx.route(/\/rest\/v1\/user_settings/, async (route) => {
  if (route.request().method() === "GET" && armed) { held++; await gate; }
  return route.fallback();
});
const page = await ctx.newPage();
const ls = (k) => page.evaluate((k) => localStorage.getItem(k), k);
const dbg = (label) => ls("swingEdgePlaybook").then(async (p) => console.log(`  ${label.padEnd(26)} local playbook=${p} · local watchlist=${(await ls("swingEdgeWatchlist") || "").slice(0, 60)} · local alerts=${await ls("swingEdgePriceAlerts")} · DB playbook=${JSON.stringify(store.settings?.playbook)} · DB watchlist=${JSON.stringify((store.settings?.watchlist || []).map((w) => w.ticker))} · DB alerts=${JSON.stringify(store.settings?.priceAlerts)}`));
const openSettings = async () => {
  await page.getByRole("button", { name: /^\s*Open user menu\s*$/ }).click();
  await page.getByRole("button", { name: /^\s*Settings\s*$/ }).click();
};
const addSetup = async (name) => {
  await page.getByRole("button", { name: /^\s*Add Setup\s*$/ }).click();
  await page.getByPlaceholder("Breakout, Pullback…").fill(name);
  await page.getByRole("button", { name: /^\s*Save Setup\s*$/ }).click();
};

await page.goto("/app");
await page.locator('[data-testid="consent-decline"]').click().catch(() => {});
await page.locator('input[type="email"]').fill(DUMMY_EMAIL);
await page.locator('input[autocomplete="current-password"]').fill(DUMMY_PASSWORD);
await page.locator('button[type="submit"]').first().click();
await page.locator('[data-tour-tab="dashboard"]').waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
if (MODE === "control-new") {
  console.log(`mode=${MODE}: brand-new user, no row, no local data`);
  await page.waitForTimeout(4000);
  await dbg("after first hydration");
  console.log(`  onboarding shown: ${await page.getByText(/experience|ניסיון/i).first().isVisible().catch(() => false)}`);
  await browser.close(); process.exit(0);
}
if (MODE === "control-device") {
  await page.waitForTimeout(4000);
  await openSettings();
  const seen = await page.getByText("DB-ONLY", { exact: true }).isVisible();
  await dbg("fresh device, DB only");
  console.log(`mode=${MODE}: DB-ONLY setup visible on a fresh device: ${seen}`);
  await browser.close(); process.exit(0);
}
if (MODE === "alerts") {
  // phase 1 action: an OPEN trade, so an alert can be set on it later
  await page.locator('[data-tour="add-trade"]').click();
  await page.locator("#log-ticker").fill("EYEPB");
  await page.locator("#log-entry").fill("100");
  await page.locator("#log-stop").fill("99");
  await page.locator("#log-target").fill("102");
  const submit = page.getByRole("button", { name: /Log Trade/ });
  await submit.waitFor({ state: "visible" });
  await page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => /Log Trade/.test(b.textContent) && !b.disabled), null, { timeout: 25000 });
  await submit.click();
  await page.waitForTimeout(1500);
}
await page.waitForTimeout(3000);
await dbg("phase 1 done");
if (MODE === "b397") {
  // another device adds S2 to the row while this device's local copy still holds only S1
  store.settings.playbook = [...store.settings.playbook, { id: 2, name: "S2-OTHER-DEVICE", description: "", imagePreview: null }];
  console.log(`  other device wrote S2 ⇒ DB playbook=${JSON.stringify(store.settings.playbook.map((s) => s.name))}`);
}
armed = MODE !== "b397";
await page.reload({ waitUntil: "load" });
const dash = await page.locator('[data-tour-tab="dashboard"]').waitFor({ state: "visible", timeout: 15000 }).then(() => true, () => false);
console.log(`mode=${MODE} · phase 2 (reload${armed ? ", settings GET held" : ""}): dashboard live=${dash} · held GETs=${held}`);
if (MODE === "playbook") { await openSettings(); await addSetup("WINDOW-SETUP"); }
if (MODE === "watchlist") {
  const input = page.getByPlaceholder("ticker", { exact: true }).first();
  await input.fill("NVDA");
  await page.waitForTimeout(1200);
  await input.press("Enter");
}
if (MODE === "alerts") {
  await page.locator('button[title="Price Alert"]').first().click();
  await page.getByPlaceholder("Set target price").fill("105");
  await page.getByRole("button", { name: "OK", exact: true }).click();
}
if (MODE === "b397") {
  await page.waitForTimeout(3000);
  await openSettings();
  console.log(`  this device shows S2 after hydration: ${await page.getByText("S2-OTHER-DEVICE", { exact: true }).isVisible()}`);
  await addSetup("S3-THIS-DEVICE");
}
await dbg("in window / after action");
armed = false; release();
await page.waitForTimeout(3500);
await dbg("after release (+3.5s)");
await page.reload({ waitUntil: "load" });
await page.locator('[data-tour-tab="dashboard"]').waitFor({ state: "visible", timeout: 15000 });
await page.waitForTimeout(2500);
await dbg("after reload");
await browser.close();
```
