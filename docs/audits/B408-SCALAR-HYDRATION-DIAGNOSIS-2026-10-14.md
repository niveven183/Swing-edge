# B-408 — סקלרים בחלון ההידרציה · אבחון (14.10, read-only)

> שלב 1 של §8.1: מדידה **לפני** כל נגיעה בקוד. ⛔ אפס תיקון.
> סביבה: build הרמטי מ-`3957509` (`scripts/lib/eyeBuild.mjs` · `VITE_SUPABASE_URL=https://eyeplaybook.supabase.co`) · `tests-eye/hermetic.js` (Supabase סינתטי עם מצב) · GET של `user_settings` מוחזק עד שחרור · **Pixel 7 (Chromium 1194) + iPhone 14 (WebKit 2311)** · Playwright `1.61.1`.
> סקריפט השחזור: נספח א׳ (scratchpad, ⛔ בריפו — ראיה, ⛔ מבחן; המבחן נולד ב-`tests-eye/hydration.spec.js` בשלב הביצוע).
> Safety gate: `HEAD=3957509=origin/main` · עץ נקי · `hooksPath=.githooks` · `npm run verify` על main ⇒ `VERIFY_EXIT=0` (33 חוליות + build).

## §2a — מפת חשיפה (קריאת קוד, `3957509`)

| סקלר | רכיב עריכה (Settings) | זמין בחלון? | כותב | קורא בהידרציה | הכלל היום |
|---|---|---|---|---|---|
| `capital` | input + «Update Capital» `:7588-7606` | ✅ **enabled** — רק ה-placeholder (`···`) והשורה «הון נוכחי» (שלד) מגודרים ב-`capitalSettled`; ⛔ `disabled` | onClick ⇒ `setCapital` + `localStorage` סינכרוני `:7599-7601` · התמדה `:1978-2002` (חסומה עד `hydratedRef`) | `:1879-1885` | **DB גובר**, ⛔ תנאי |
| `capitalCurrency` | 2 כפתורים `:7626-7640` | ✅ enabled | `:7630-7631` (+LS סינכרוני) · התמדה | `:1893-1898` | DB גובר (+ נפילה ל-`accountCurrency`) |
| `accountCurrency` | 2 כפתורים `:7648-7662` | ✅ enabled | `:7652-7653` (+LS סינכרוני) · התמדה | `:1886-1889` | DB גובר |
| `riskPct` | input + «Update Risk» `:7678-7700` | ✅ enabled | `:7693-7695` (+LS סינכרוני) · התמדה | `:1899-1902` | DB גובר (`0.1–10`) |
| `lang` | `<select>` `:7416-7427` | ✅ enabled | `setLang` בלבד; LS נכתב **בטיק הבא** ע"י `:2126-2129` · התמדה | `:1915-1918` | ⚠️ **שונה:** `if (s.lang && s.lang !== lang)` — `lang` הוא ערך ה-closure **בהרכבה** ⇒ DB גובר **רק כש-DB ≠ הערך בהרכבה** |

אתרי כתיבה נוספים: `handleOnboardingComplete` `:1228-1244` (capital · riskPct · capitalCurrency) — ⛔ נגיש בחלון: במכשיר חוזר `showOnboarding=false` מהמראה, ובמכשיר טרי שער `onboardingSettled` (`B-365`) ממתין להידרציה. `src/**` ⛔ מכיל setter נוסף לחמשת הסקלרים (`LandingPage`/`OnboardingScreen` מחזיקים state מקומי משלהם).

**`capitalGate` (`B-376`/`D-103`) ⛔ מוציא אף סקלר מההיקף.** הוא נצרך ב-`:2874` בלבד ⇒ `sizingRefusalReason`/`submitGate` ⇒ משבית את **`Log Trade`** בטופס העסקה. רכיבי ה-Settings (`:7588-7700`) ⛔ נושאים `disabled` כלל — התצוגה מגודרת, **מסלול הכתיבה ⛔**.

⚠️ **נגישות-בפועל (ראה §2d):** `tab` מתאפס ל-`dashboard` בכל טעינה (`:1499-1506`, ⛔ התמדה, ⛔ deep link) ⇒ להגיע ל-Settings ולבצע עריכה הוא מסלול UI של שניות, והחלון הטבעי קצר משנייה. הטריגר המציאותי הוא **קריאה איטית/תקועה** (מובייל לא-יציב · השהיית Supabase) — ⛔ «כל משתמש חוזר». ה-`x/30` למטה מודד **מה קורה כשהחלון קיים**, ⛔ כמה משתמשים נכנסים אליו.

## §2a′ — תוספת 14.10 (בקשת ניב): כל אתרי העריכה + קריאה תקועה

**grep לכל setter** (`setLang`·`setCapital`·`setRiskPct`·`setAccountCurrency`·`setCapitalCurrency`) ב-`SwingEdge_App.jsx`+`src/**`, כתיבת מפתחות ה-LS שלהם, והעברת setter כ-prop (`={setX}` — **0 תוצאות**):

| אתר | שורה | נגיש בחלון? |
|---|---|---|
| Settings · select שפה · input+כפתור הון · 2+2 כפתורי מטבע · input+כפתור סיכון | `:7418` · `:7588-7606` · `:7630` · `:7652` · `:7678-7700` | ✅ — 9 הרכיבים |
| `handleOnboardingComplete` | `:1228-1244` | ⛔ (`B-365`) |
| `hydrate` | `:1883-1916` | כותב מערכת |
| `OnboardingScreen` | `src/components/OnboardingScreen.jsx:213/372` | state מקומי ⇒ `handleOnboardingComplete` |
| `LandingPage` | `src/components/LandingPage.jsx:625-630` | route `/`, ⛔ כותב `swingEdgeLang` |
| מחשבון גודל פוזיציה | `posCalc` `:1654` | ⛔ כותב סקלר; ⚠️ **קורא** `parseFloat(posCalc.capital) \|\| capital` (`:6117`) — הון לא-מוכרע בחלון |
| מתג שפה בכותרת/תפריט | — | ⛔ קיים |

**קריאה תקועה:** ל-`capitalGate`/`capitalSettled` **אין timeout** — `FX_SETTLE_MS` (8s) חל על FX בלבד (`:2314-2322`); `loadSettings`/`migrateFromLocalStorage` ⛔ נושאים timeout ⇒ GET שלא חוזר ⇒ `hydrationFailed` ⛔ נדלק ⇒ `Log Trade` נעול לנצח (`B-386`) והכתיבות חסומות — **כבר היום**.

## §2b — שחזור: עריכה בחלון ⇒ שחרור ⇒ (1) מסך מיד (2) `localStorage` (3) DB (4) אחרי רענון

מסלול לכל חזרה: שורת ה-DB = הערך המקומי של המכשיר (⛔ מכשיר אחר) ⇒ רענון עם GET מוחזק ⇒ Settings ⇒ עריכה (`keyboard.type` לשדות, לחיצה לכפתורים, `selectOption` לבורר) ⇒ שחרור ⇒ המתנה **לתנאי** (שלד «הון נוכחי» נעלם = `capitalSettled`) ⇒ מדידה. (3) = המתנה-לתנאי עד 4 ש' ש-DB = הערך הנערך.

| סקלר | מנוע | (1) מסך מיד | (2) `localStorage` | (3) DB | (4) אחרי רענון | **שרד את ארבעתם** |
|---|---|---|---|---|---|---|
| `capital` | Chromium (Pixel 7) | 0/30 | 0/30 | 0/30 | 0/30 | 🔴 **0/30** |
| `capital` | WebKit (iPhone 14) | 0/30 | 0/30 | 0/30 | 0/30 | 🔴 **0/30** |
| `riskPct` | Chromium | 0/30 | 0/30 | 0/30 | 0/30 | 🔴 **0/30** |
| `riskPct` | WebKit | 0/30 | 0/30 | 0/30 | 0/30 | 🔴 **0/30** |
| `capitalCurrency` | Chromium | 0/30 | 0/30 | 0/30 | 0/30 | 🔴 **0/30** |
| `capitalCurrency` | WebKit | 0/30 | 0/30 | 0/30 | 0/30 | 🔴 **0/30** |
| `accountCurrency` | Chromium | 0/30 | 0/30 | 0/30 | 0/30 | 🔴 **0/30** |
| `accountCurrency` | WebKit | 0/30 | 0/30 | 0/30 | 0/30 | 🔴 **0/30** |
| `lang` | Chromium | 30/30 | 30/30 | 30/30 | 30/30 | ⚠️ 30/30 (במקרה — ראה למטה) |
| `lang` | WebKit | 30/30 | 30/30 | 30/30 | 30/30 | ⚠️ 30/30 |

סה״כ: **`0/240`** עריכות בחלון של ארבעת הסקלרים שרדו (4 סקלרים × 30 חזרות × 2 מנועים), דטרמיניסטי. בחלון עצמו העריכה **מוצגת** (`riskPct`/מטבעות/`lang`: 30/30 «בחלון מציג את העריכה») ואז נעלמת ברגע שהקריאה נוחתת — ⛔ הודעה, ⛔ toast, ⛔ שגיאה בקונסול.

⚠️ **«בחלון מציג את העריכה» `0/30` להון הוא ארטיפקט מדידה, ⛔ ממצא:** בחלון `capitalSettled=false` ⇒ השורה «הון נוכחי» היא span שלד ⇒ הקריאה מחזירה `""`. אבל העובדה ש**היא חושפת** אמיתית: עריכת הון בחלון ⛔ מקבלת **שום משוב** (placeholder `···`, שלד) בזמן שהשדה והכפתור **פעילים לחלוטין**.

⚠️ **`lang` שורד ב-2b — במקרה, ⛔ בתכנון.** ההשוואה `s.lang !== lang` רצה מול ה-closure של ההרכבה; ב-2b נקי השורה = הערך בהרכבה ⇒ ההשוואה `false` ⇒ `setLang` ⛔ נקרא ⇒ העריכה שורדת. ראיה ישירה: בהרצת smoke ראשונה (לפני תיקון ה-baseline בסקריפט) חזרה שבה ה-DB אופס ל-`en` בעוד המכשיר החזיק `es` ⇒ העריכה `pt` **אבדה** (`1/2`). כלומר `lang` נדרס **בדיוק** כשמכשיר אחר שינה אותו — ראה §2c `conflict:lang`.

## §2c — כיוון הפוך (מכשיר B כתב, ל-A עותק מקומי מיושן)

`reverse:<X>` — B כתב `X` לשורה; A (מקומי = הישן) נטען עם GET מוחזק, מציג Settings, **עורך סקלר אחר** בחלון, שחרור. נמדד: האם A מציג/דורס את ערך B, ומה קרה לעריכת A.
`conflict:<X>` — B כתב `X`; A עורך **את אותו `X`** בחלון. נמדד: מי מנצח.

| מצב | מנוע | ערך B נשמר (מסך+DB) | A הציג ערך מיושן בחלון | עריכת A (סקלר אחר) הגיעה ל-DB |
|---|---|---|---|---|
| `reverse:capital` | Chromium · WebKit | 10/10 · 10/10 | ⛔ (שלד) 0/10 · 0/10 | 🔴 0/10 · 0/10 (`riskPct`) |
| `reverse:riskPct` | Chromium · WebKit | 10/10 · 10/10 | ⚠️ 10/10 · 10/10 | 🔴 0/10 · 0/10 (`capital`) |
| `reverse:lang` | Chromium · WebKit | 10/10 · 10/10 | ⚠️ 10/10 · 10/10 | 🔴 0/10 · 0/10 (`riskPct`) |
| `reverse:capitalCurrency` | Chromium · WebKit | 10/10 · 10/10 | ⚠️ 10/10 · 10/10 | 🔴 0/10 · 0/10 (`riskPct`) |
| `reverse:accountCurrency` | Chromium · WebKit | 10/10 · 10/10 | ⚠️ 10/10 · 10/10 | 🔴 0/10 · 0/10 (`riskPct`) |

| מצב | מנוע | עריכת A באותו סקלר מנצחת (מסך+DB) |
|---|---|---|
| `conflict:capital` | Chromium · WebKit | 🔴 0/10 · 0/10 |
| `conflict:riskPct` | Chromium · WebKit | 🔴 0/10 · 0/10 |
| `conflict:lang` | Chromium · WebKit | 🔴 0/10 · 0/10 — **`lang` נדרס כשמכשיר אחר שינה אותו** |

**מסקנה:** מכשיר A ⛔ **דורס** את ערך B (`100/100` נשמר) — «DB גובר» מגן על הכיוון ההפוך. אבל: ① בחלון A **מציג** את הערך המקומי המיושן ל-4 מתוך 5 הסקלרים (`80/80`; ההון מוסתר בשלד) — «סיכון נוכחי 1%» כשהשורה אומרת `3`; ② עריכת A בחלון נבלעת (`0/100`) גם כשהיא בסקלר **אחר** ממה ש-B שינה; ③ בקונפליקט על אותו סקלר A ⛔ מנצח (`0/60`) — כולל `lang`.

## §2d — אורך החלון

נמדד: מרגע שה-dashboard חי (MutationObserver) עד `responseEnd` של קריאת `select=settings` (Resource Timing). ריצה **בודדת** (⛔ במקביל לריצה אחרת), n=30 לכל שורה:

| מנוע | `EYE_SEED_HISTORY` | p50 | p95 | max | בקשות `user_settings` לטעינה |
|---|---|---|---|---|---|
| Chromium (Pixel 7) | 1 | 48ms | 51ms | 52ms | 2 (טוריות) |
| Chromium | 0 | 33ms | 38ms | 42ms | 2 |
| WebKit (iPhone 14) | 1 | 140ms | 176ms | 242ms | 2 |
| WebKit | 0 | 148ms | 201ms | 208ms | 2 |

⚠️ **זה חסם תחתון: המקור הסינתטי עונה מיד.** בפרודקשן: `חלון ≈ הרמטי + 2×RTT (migrate check ⇒ load, טוריות) + auth (רענון טוקן רק כשפג)`. RTT מהמכונה הזו ל-host של Supabase (ללא מפתח, TLS טרי, n=20): **p50 73ms · p95 143ms** ⇒ רשת טובה ≈ `~190–480ms`; מובייל 4G (RTT ×2–4) ≈ `~0.4–1.3s`. **⇒ בתנאים רגילים החלון נסגר לפני שאפשר להגיע ל-Settings** (תפריט ⇒ הגדרות ⇒ הקלדה ⇒ לחיצה). החלון אמיתי כשהקריאה **איטית או תקועה** — בדיוק מה שהשחזור מחזיק.

## §2e — K6 (שתי לשוניות)

K6 = צד ה**כתיבה**: `upsertBlob` מחליף את העמודה כולה ⇒ שתי לשוניות שכותבות בו-זמנית — last-writer-wins. שתי האופציות נוגעות בצד ה**קריאה**/ממשק בלבד, ⛔ ב-`upsertBlob` ⛔ ב-`alreadySent`.
- **A (יומן דלתא לסקלרים):** היומן ב-`localStorage` ⇒ משותף לכל הלשוניות באותו דפדפן (כמו ב-`B-406` §0c). לשונית שמתהדרת רואה op של לשונית אחות ומחילה את הערך המקומי המשותף ⇒ **מיושר** עם ההכרעה ל-`B-361`; ⛔ מחמיר; ⛔ פותר.
- **B (שער עריכה):** אין מצב חדש משותף; כל לשונית נעולה בחלון **שלה** ⇒ ⛔ נוגע.
- **שתי לשוניות שכותבות בו-זמנית — עדיין last-writer-wins בשתי האופציות. K6 נשאר פתוח.**

## נספח א׳ — סקריפט השחזור
`node repro-b408.mjs <dist> <chromium|webkit> <mode> <reps>` · מצבים: `capital` · `riskPct` · `lang` · `capitalCurrency` · `accountCurrency` · `reverse:<X>` · `conflict:<X>` · `window`.

```js
// B-408 reproduction — hermetic build (tests-eye/hermetic.js), user_settings GET held until release.
//   node repro-b408.mjs <distDir> <engine: chromium|webkit> <mode> <reps>
//   modes: capital · riskPct · lang · capitalCurrency · accountCurrency  (2b: edit in the window)
//          reverse:<scalar>                                              (2c: another device wrote it)
//          window                                                        (2d: window length, unheld)
import { chromium, webkit, devices } from "<repo>/node_modules/playwright/index.mjs";
import { installHermetic, newStore, DUMMY_EMAIL, DUMMY_PASSWORD } from "<repo>/tests-eye/hermetic.js";
import { exactRx, containsRx } from "<repo>/tests-eye/labels.js";
import { serve } from "<repo>/scripts/lib/eyeBuild.mjs";

const [, , DIST, ENGINE, MODE, REPS_S] = process.argv;
const REPS = Number(REPS_S || 30);
const { server, port } = await serve(DIST);
const BASE = `http://127.0.0.1:${port}`;
const dev = ENGINE === "webkit" ? devices["iPhone 14"] : devices["Pixel 7"];
const browser = await (ENGINE === "webkit" ? webkit : chromium).launch();
const ctx = await browser.newContext({ ...dev, baseURL: BASE });
const store = newStore();
store.settings.lang = "en";
store.settings.playbook = []; store.settings.watchlist = []; store.settings.priceAlerts = {};
const BASELINE = { capital: 10000, riskPct: 1, lang: "en", capitalCurrency: "USD", accountCurrency: "USD" };
Object.assign(store.settings, BASELINE);
await installHermetic(ctx, store);
await ctx.addInitScript(() => {
  if (!location.protocol.startsWith("http")) return;
  localStorage.setItem("swingEdgeIosInstallDismissed", "1");
  // 2d instrumentation: when does the dashboard first become live?
  const mark = () => { if (!window.__dashAt && document.querySelector('[data-tour-tab="dashboard"]')) window.__dashAt = performance.now(); };
  new MutationObserver(mark).observe(document, { subtree: true, childList: true });
});
const gate = { armed: false, held: 0, release: null };
await ctx.route(/\/rest\/v1\/user_settings/, async (route) => {
  if (route.request().method() === "GET" && gate.armed) { gate.held++; await new Promise((r) => { gate.release = r; }); }
  return route.fallback();
});
const page = await ctx.newPage();
const ls = (k) => page.evaluate((k) => localStorage.getItem(k), k);
const dash = () => page.locator('[data-tour-tab="dashboard"]').waitFor({ state: "visible", timeout: 30_000 });
const until = async (fn, ms) => { const t0 = Date.now(); for (;;) { const v = await fn(); if (v) return true; if (Date.now() - t0 > ms) return false; await new Promise((r) => setTimeout(r, 100)); } };

const openSettings = async () => {
  await page.getByRole("button", { name: exactRx("openUserMenu") }).click();
  await page.getByRole("button", { name: exactRx("settings") }).click();
};
const capLine = () => page.locator("p", { hasText: containsRx("currentCapital") }).first();
const settled = () => capLine().locator("span.animate-pulse").waitFor({ state: "detached", timeout: 30_000 });
const card = (key) => page.locator("div.rounded-xl", { has: page.getByRole("heading", { name: exactRx(key) }) }).last();
const ccyBox = (key) => page.locator("div.mt-4", { has: page.getByRole("heading", { name: exactRx(key) }) }).last();

const S = {
  capital: {
    ls: "swingEdgeCapital", edit: (i) => 12000 + i, parse: (v) => (v == null ? null : Number(v)),
    async set(v) { const c = card("portfolioCapitalTitle"); await c.locator("input[type=number]").click(); await page.keyboard.type(String(v)); await c.getByRole("button", { name: exactRx("updateCapital") }).click(); },
    async screen() { const t = await capLine().locator("span").first().textContent(); return Number(t.replace(/[^0-9.]/g, "")); },
  },
  riskPct: {
    ls: "swingEdgeRiskPct", edit: (i) => 2 + (i % 5) * 0.5, parse: (v) => (v == null ? null : Number(v)),
    async set(v) { const c = card("riskPerTradeTitle"); await c.locator("input[type=number]").click(); await page.keyboard.type(String(v)); await c.getByRole("button", { name: exactRx("updateRisk") }).click(); },
    async screen() { const t = await page.locator("p", { hasText: containsRx("currentRisk") }).first().locator("span").first().textContent(); return Number(t.replace(/[^0-9.]/g, "")); },
  },
  lang: {
    ls: "swingEdgeLang", edit: (i) => (i % 2 ? "pt" : "es"), parse: (v) => v,
    async set(v) { await card("language").locator("select").selectOption(v); },
    async screen() { return page.evaluate(() => document.documentElement.lang); },
  },
  capitalCurrency: {
    ls: "swingEdgeCapitalCurrency", edit: () => "ILS", parse: (v) => v,
    async set(v) { await ccyBox("capitalCurrencyTitle").getByRole("button", { name: new RegExp(v) }).click(); },
    async screen() { const cls = await ccyBox("capitalCurrencyTitle").getByRole("button", { name: /ILS/ }).getAttribute("class"); return cls.includes("v3-accent-glow") ? "ILS" : "USD"; },
  },
  accountCurrency: {
    ls: "swingEdgeAccountCurrency", edit: () => "ILS", parse: (v) => v,
    async set(v) { await ccyBox("accountCurrencyTitle").getByRole("button", { name: new RegExp(v) }).click(); },
    async screen() { const cls = await ccyBox("accountCurrencyTitle").getByRole("button", { name: /ILS/ }).getAttribute("class"); return cls.includes("v3-accent-glow") ? "ILS" : "USD"; },
  },
};

// Phase 1 — login, first hydration completes ⇒ the device is RETURNING.
await page.goto("/app");
await page.locator('[data-testid="consent-decline"]').click({ timeout: 10_000 }).catch(() => {});
await page.locator('input[type="email"]').fill(DUMMY_EMAIL);
await page.locator('input[autocomplete="current-password"]').fill(DUMMY_PASSWORD);
await page.locator('button[type="submit"]').first().click();
await dash();
await until(async () => (await ls("swingEdgeOnboarding")) != null, 10_000);

const reloadHeld = async () => {
  gate.armed = true; gate.held = 0;
  await page.reload({ waitUntil: "load" });
  await dash();
  if (!(await until(() => gate.held > 0, 10_000))) throw new Error("no held GET — no window");
};
const release = () => { gate.armed = false; gate.release?.(); };

const rows = [];
if (S[MODE]) {
  const s = S[MODE];
  for (let i = 0; i < REPS; i++) {
    // Clean 2b: no other device — the row holds exactly what this device holds locally.
    const cur = s.parse(await ls(s.ls)) ?? BASELINE[MODE];
    store.settings[MODE] = cur;
    const v = MODE.endsWith("Currency") ? (cur === "USD" ? "ILS" : "USD") : s.edit(i);
    await reloadHeld();
    await openSettings();
    await s.set(v);
    const inWindow = await s.screen();
    release();
    await settled();
    const screen1 = await s.screen();
    const local2 = s.parse(await ls(s.ls));
    await until(() => store.settings[MODE] === v, 4_000);
    const db3 = store.settings[MODE];
    await page.reload({ waitUntil: "load" });
    await dash(); await openSettings(); await settled();
    const screen4 = await s.screen();
    const ok = [screen1, local2, db3, screen4].every((x) => x === v);
    rows.push({ i, v, inWindow, screen1, local2, db3, screen4, ok });
    console.log(JSON.stringify(rows.at(-1)));
  }
  const n = (k) => rows.filter((r) => r[k] === r.v).length;
  console.log(`SUMMARY ${ENGINE} ${MODE}: survived-all-4 ${rows.filter((r) => r.ok).length}/${REPS} · screen-now ${n("screen1")}/${REPS} · localStorage ${n("local2")}/${REPS} · DB ${n("db3")}/${REPS} · after-reload ${n("screen4")}/${REPS} · in-window-shows-edit ${n("inWindow")}/${REPS}`);
} else if (MODE.startsWith("reverse:")) {
  const X = MODE.split(":")[1];
  const s = S[X];
  const other = X === "riskPct" ? "capital" : "riskPct"; // a DIFFERENT scalar this device edits
  for (let i = 0; i < REPS; i++) {
    // A's local copy holds the baseline; device B writes X to the row.
    Object.assign(store.settings, BASELINE);
    await page.evaluate(([k, v]) => localStorage.setItem(k, v), [s.ls, String(BASELINE[X])]);
    const bVal = X === "capital" ? 20000 + i : X === "riskPct" ? 3 : X === "lang" ? "es" : "ILS";
    store.settings[X] = bVal;
    await reloadHeld();
    await openSettings();
    const staleShown = X === "capital" ? "skeleton" : await s.screen();
    // A edits a DIFFERENT scalar inside the window.
    const ov = S[other].edit(i);
    await S[other].set(ov);
    release();
    await settled();
    const shownAfter = await s.screen();
    await until(() => store.settings[other] === ov, 4_000);
    const dbX = store.settings[X];
    const dbOther = store.settings[other];
    rows.push({ i, bVal, staleShown, shownAfter, dbX, otherEdit: ov, dbOther, bKept: dbX === bVal && shownAfter === bVal });
    console.log(JSON.stringify(rows.at(-1)));
  }
  console.log(`SUMMARY ${ENGINE} reverse:${X}: B's value kept (screen+DB) ${rows.filter((r) => r.bKept).length}/${REPS} · stale value shown in window ${rows.filter((r) => r.staleShown !== "skeleton" && r.staleShown !== r.bVal).length}/${REPS} · A's window edit of ${other} reached DB ${rows.filter((r) => r.dbOther === r.otherEdit).length}/${REPS}`);
} else if (MODE.startsWith("conflict:")) {
  const X = MODE.split(":")[1];
  const s = S[X];
  for (let i = 0; i < REPS; i++) {
    const cur = s.parse(await ls(s.ls)) ?? BASELINE[X];
    const bVal = X === "capital" ? 30000 + i : X === "riskPct" ? (cur === 3 ? 4 : 3) : X === "lang" ? ["es", "pt", "en"].find((l) => l !== cur) : (cur === "USD" ? "ILS" : "USD");
    const aVal = X === "capital" ? 40000 + i : X === "riskPct" ? 5 + (i % 2) : X === "lang" ? ["en", "es", "pt"].find((l) => l !== cur && l !== bVal) : null;
    if (aVal == null) throw new Error("conflict mode: capital · riskPct · lang only (a two-value currency cannot conflict)");
    store.settings[X] = bVal; // device B changed X; this device (A) still holds `cur`
    await reloadHeld(); await openSettings();
    await s.set(aVal);
    release(); await settled();
    const shown = await s.screen();
    await until(() => store.settings[X] === aVal, 4_000);
    rows.push({ i, cur, bVal, aVal, shown, db: store.settings[X], aWins: shown === aVal && store.settings[X] === aVal });
    console.log(JSON.stringify(rows.at(-1)));
  }
  console.log(`SUMMARY ${ENGINE} conflict:${X}: A's window edit wins (screen+DB) ${rows.filter((r) => r.aWins).length}/${REPS}`);
} else if (MODE === "window") {
  const w = [];
  for (let i = 0; i < REPS; i++) {
    await page.reload({ waitUntil: "load" });
    await dash();
    await until(() => page.evaluate(() => performance.getEntriesByType("resource").filter((e) => /user_settings/.test(e.name) && /select=settings/.test(e.name)).length > 0), 10_000);
    const r = await page.evaluate(() => {
      const ends = performance.getEntriesByType("resource").filter((e) => /user_settings/.test(e.name)).map((e) => ({ n: e.name.split("?")[1], start: e.startTime, end: e.responseEnd }));
      return { dashAt: window.__dashAt, ends };
    });
    const loadEnd = Math.max(...r.ends.filter((e) => /select=settings/.test(e.n)).map((e) => e.end));
    const firstStart = Math.min(...r.ends.map((e) => e.start));
    w.push({ window: Math.max(0, loadEnd - r.dashAt), dashAt: r.dashAt, firstStart, loadEnd, gets: r.ends.length });
    console.log(JSON.stringify(w.at(-1)));
  }
  const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
  const ws = w.map((x) => x.window);
  console.log(`SUMMARY ${ENGINE} window(ms, dashboard-live → settings read landed), n=${REPS}: p50 ${q(ws, 0.5).toFixed(0)} · p95 ${q(ws, 0.95).toFixed(0)} · max ${Math.max(...ws).toFixed(0)} · user_settings requests/load ${w[0].gets}`);
}
await browser.close();
server.close();
```
