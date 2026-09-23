#!/usr/bin/env node
/**
 * hydration-wiring-test.mjs — W-CAP · harness לחיווט ההידרציה ב-SwingEdge_App.jsx
 *
 * ⚠️ זו ⛔ אינה "בדיקת טקסט". הבייטים שמורצים כאן הם הבייטים שבקובץ המוצר:
 * ה-harness מחלץ את גופי שלושת ה-useEffect לפי עוגן, ומריץ אותם ב-new Function
 * עם כל תלות מוזרקת כפרמטר. שינוי בלוגיקה משנה את ההרצה.
 *
 * למה חילוץ ולא import: 61 import ברמה העליונה גוררים את כל גרף האפליקציה
 * (recharts · sentry · supabase · lucide · CSS) ⇒ נדרש bundler + DOM. וחילוץ
 * האפקט לקובץ נפרד היה נגיעה בקוד מוצר. ⇒ ⛔ אפס תלות חדשה, ⛔ אפס קוד מוצר.
 *
 * ⛔ מה זה ⛔ אינו מוכיח (C-036 נשאר פתוח): שהבאנר מרונדר · ששני ה-onClick
 * עושים משהו · React עצמו · דפדפן אמיתי · פרודקשן. ראה PLAN §1.4 · §5.
 *
 * שימוש:  node scripts/hydration-wiring-test.mjs [--app <path>]
 */
import { readFileSync } from "node:fs";
// ⛔ מוק — המודול האמיתי. סטאב כאן היה מודד את הסטאב.
import { clearUserScopedStorage, DEVICE_KEYS } from "../src/lib/userScopedStorage.js";

const argv = process.argv.slice(2);
const appIdx = argv.indexOf("--app");
const APP = appIdx >= 0 ? argv[appIdx + 1] : new URL("../SwingEdge_App.jsx", import.meta.url).pathname;
const src = readFileSync(APP, "utf8");

const DEFAULT_CAPITAL = 2500; // src/utils.js:6 — מקור-אמת-אחד, מוזרק ⛔ ולא מחושב

let pass = 0, fail = 0, inv = 0;
const reds = [];
function ok(id, label, cond, got) {
  if (cond) { pass++; console.log(`${id} ${label}: ${got} ✓`); }
  else { fail++; reds.push(id); console.log(`${id} ${label}: ${got} ✗ RED`); }
}
function invariant(id, label, cond, got) {
  if (cond) { inv++; console.log(`${id} ⚪ אינווריאנטה — ${label}: ${got}`); }
  else { fail++; reds.push(id); console.log(`${id} ⚪ אינווריאנטה — ${label}: ${got} ✗ RED`); }
}

/* ── חילוץ ─────────────────────────────────────────────────────────────────
 * שלושה שערי-מטא. כשל חילוץ הוא אדום קשה ⛔ ולעולם לא דילוג: שינוי-שם או
 * ריפורמט בקובץ המוצר עוצר את השרשרת במקום לעבור בשקט (B-272).
 * "בדיקה לא-חד-משמעית ⛔ אינה תוצאה."
 */
function countOccurrences(hay, needle) {
  let n = 0, i = 0;
  for (;;) { const j = hay.indexOf(needle, i); if (j < 0) break; n++; i = j + needle.length; }
  return n;
}

/** סורק קדימה מ-openIdx (שחייב להיות '{') ומחזיר את אינדקס ה-'}' התואם.
 *  מדלג על מחרוזות, template literals, והערות — אחרת סוגר מוקדם. */
function matchBrace(s, openIdx) {
  if (s[openIdx] !== "{") throw new Error("matchBrace: לא נפתח ב-{");
  let depth = 0;
  for (let i = openIdx; i < s.length; i++) {
    const c = s[i], n = s[i + 1];
    if (c === "/" && n === "/") { i = s.indexOf("\n", i); if (i < 0) break; continue; }
    if (c === "/" && n === "*") { i = s.indexOf("*/", i + 2) + 1; continue; }
    if (c === '"' || c === "'" || c === "`") {
      const q = c;
      for (i++; i < s.length; i++) {
        if (s[i] === "\\") { i++; continue; }
        if (s[i] === q) break;
        // ${ ... } בתוך template literal — מדלגים על הביטוי הפנימי
        if (q === "`" && s[i] === "$" && s[i + 1] === "{") i = matchBrace(s, i + 1);
      }
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) return i; }
  }
  throw new Error("matchBrace: סוגריים לא מאוזנים");
}

/** מחלץ ביטוי-פונקציה שלם שמתחיל ב-startIdx ומסתיים ב-} התואם. */
function sliceFn(s, startIdx) {
  const brace = s.indexOf("{", startIdx);
  const end = matchBrace(s, brace);
  return s.slice(startIdx, end + 1);
}

const A_HYDRATE = "const hydrate = async () => {";
const A_PERSIST = "saveSettings(authUser.id, patch);";
const A_UNLOAD  = 'window.addEventListener("beforeunload", flush);';
const A_EFFECT  = "useEffect(() => {";
// A15·A16·A17 (22.09) — D-lite יושב ב**ראש ה-useEffect**, לפני שער ה-early-return,
// ולכן גוף `hydrate` לבדו ⛔ יכול למדוד אותו: בהתנתקות (`authUser = null`) הגוף
// ⛔ נקרא כלל. ⇒ נדרש חילוץ של האפקט **העוטף**, ⛔ עוגן חדש.
const A_DISMISS = "const dismissWelcome = useCallback(() => {";
const A_TOUR    = "const completeTour = useCallback((done) => {";

// שער-מטא 1 — כל עוגן חייב להופיע בדיוק פעם אחת
const counts = {
  hydrate: countOccurrences(src, A_HYDRATE),
  persist: countOccurrences(src, A_PERSIST),
  unload:  countOccurrences(src, A_UNLOAD),
  dismiss: countOccurrences(src, A_DISMISS),
  tour:    countOccurrences(src, A_TOUR),
};
for (const [k, v] of Object.entries(counts)) {
  if (v !== 1) {
    console.error(`\n🔴 חילוץ נכשל — העוגן "${k}" הופיע ${v} פעמים, נדרש בדיוק 1.`);
    console.error("   ⛔ זה ⛔ אינו דילוג. השרשרת נעצרת. עדכן את העוגן ב-scripts/hydration-wiring-test.mjs (B-272).");
    process.exit(1);
  }
}

// גוף hydrate: מ-"async () =>" עד ה-} התואם
const hydrateStart = src.indexOf(A_HYDRATE) + "const hydrate = ".length;
const hydrateSrc = sliceFn(src, hydrateStart);

// אפקט persist / unload: נסיגה מהעוגן ל-useEffect(() => { העוטף
function enclosingEffect(anchor) {
  const at = src.indexOf(anchor);
  const eff = src.lastIndexOf(A_EFFECT, at);
  if (eff < 0) throw new Error("⛔ לא נמצא useEffect עוטף לעוגן: " + anchor);
  return sliceFn(src, eff + "useEffect(".length);
}
const persistSrc = enclosingEffect(A_PERSIST);
const unloadSrc  = enclosingEffect(A_UNLOAD);
// האפקט **העוטף** את hydrate — הבית של D-lite.
const hydrateEffectSrc = enclosingEffect(A_HYDRATE);
// שני ה-useCallback: מחלצים את **פונקציית החץ בלבד**, ⛔ את קריאת useCallback
// (שנושאת מערך תלויות ואינה ניתנת להרצה כאן).
function sliceCallback(anchor, prefix) {
  return sliceFn(src, src.indexOf(anchor) + prefix.length);
}
const dismissSrc = sliceCallback(A_DISMISS, "const dismissWelcome = useCallback(");
const tourSrc    = sliceCallback(A_TOUR, "const completeTour = useCallback(");

// שער-מטא 3 — הזנב המחולץ חייב להיות מה שאנחנו חושבים שהוא
const tailOk = /setHydrationDone\(true\);\s*\}$/.test(hydrateSrc);
const persistTailOk = persistSrc.includes(A_PERSIST);
const unloadTailOk = unloadSrc.includes("removeEventListener");
const hydrateEffectTailOk = /return \(\) => \{ cancelled = true; \};\s*\}$/.test(hydrateEffectSrc)
  && hydrateEffectSrc.includes(A_HYDRATE);
const dismissTailOk = dismissSrc.includes("welcomeSeen: true");
const tourTailOk = tourSrc.includes("tourDone: true");

console.log(`extract hydrate : ${hydrateSrc.split("\n").length} lines ${tailOk ? "✓" : "✗"}`);
console.log(`extract persist : ${persistSrc.split("\n").length} lines ${persistTailOk ? "✓" : "✗"}`);
console.log(`extract unload  : ${unloadSrc.split("\n").length} lines ${unloadTailOk ? "✓" : "✗"}`);
console.log(`extract hyd-eff : ${hydrateEffectSrc.split("\n").length} lines ${hydrateEffectTailOk ? "✓" : "✗"}`);
console.log(`extract dismiss : ${dismissSrc.split("\n").length} lines ${dismissTailOk ? "✓" : "✗"}`);
console.log(`extract tour    : ${tourSrc.split("\n").length} lines ${tourTailOk ? "✓" : "✗"}`);

/* ── מוקים ────────────────────────────────────────────────────────────────
 * ⛔ אין supabase (גם לא מוק של הלקוח) — מוזרקים loadSettings/migrate עצמם.
 * מוק ה-auth הוא { id } בלבד: ⛔ אין טוקן, ⛔ אין סשן, ⛔ אין הרשמה.
 */
const CURRENCY_SYMBOL = { USD: "$", ILS: "₪", EUR: "€" };

/** ⚠️ `length` + `key(i)` ⛔ נוחות — הם החוזה ש-`clearUserScopedStorage` סורק בו.
 *  מוק בלי הימנון היה מריץ סחיפה על אוסף ריק ומחזיר ירוק כוזב. */
function makeLocalStorage(seed = {}) {
  const m = new Map(Object.entries(seed));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    key: (i) => [...m.keys()][i] ?? null,
    get length() { return m.size; },
    _map: m,
  };
}

const tick = () => new Promise((res) => setTimeout(res, 0));

/** מראה ההגדרות — **בדיוק** החוזה החדש: {status, settings}, ⛔ בלי מפתחות ברמה
 *  העליונה. זו הצורה שהמודול באמת מחזיר (src/lib/userSettings.js · loadSettings).
 *
 *  ⚠️ הבחנה שנמדדה ומוצהרת: הכלאה שמשטחת את המראה גם לרמה העליונה היתה מריצה
 *  את שני העצים — אבל היא ⛔ אינה נאמנה לאף חוזה, והיא **מסתירה נקודה עיוורת**:
 *  קוד שיקרא capital מהמעטפה במקום מ-settings היה עובר. ⇒ הצורה כאן היא
 *  הנאמנה, והיא זו שסוגרת את הפער.
 *
 *  ⚠️ ו⛔ לא כל אדום שווה: A7·A8·A9 אדומות בעץ הישן כי **חוזה התלות המוזרקת
 *  עצמו השתנה** (הישן החזיר את אובייקט ההגדרות עצמו), ⛔ לא כי אותה קלט מייצר
 *  התנהגות שונה. הן ראיה **חלשה יותר** מ-A1-A6/A10-A14, וזה נאמר כאן ⛔ ולא
 *  בסגירה. */
function loadResult(status, mirror) {
  return { status, settings: mirror };
}

const MIRROR_OK = { capital: 49000, riskPct: 2, lang: "he", accountCurrency: "USD", welcomeSeen: true };
const MIRROR_2500 = { capital: DEFAULT_CAPITAL, lang: "he", welcomeSeen: false };

function runHydrate({ loadStatus, mirror = MIRROR_OK, migrateReason = null, cancelled = false, storage = {}, uid = "u-probe" }) {
  const calls = { load: 0, hydrationFailed: [], hydrationDone: 0, capital: [], lang: [], clobber: [], errors: [] };
  const hydratedRef = { current: false };
  const welcomeSeenRef = { current: false };
  const localStorage = makeLocalStorage(storage);

  const names = [
    "cancelled", "migrateFromLocalStorage", "authUser", "console", "setHydrationFailed",
    "loadSettings", "setCapital", "localStorage", "CURRENCY_SYMBOL", "setAccountCurrency",
    "setCapitalCurrency", "setRiskPct", "setShowOnboarding", "setUserProfile", "lang",
    "setLang", "setWatchlistItems", "hadWatchlist", "setPriceAlerts", "hadAlerts",
    "setPlaybookSetups", "hadPlaybook", "welcomeSeenRef", "DEFAULT_CAPITAL",
    "setCapitalMaybeClobbered", "hydratedRef", "setHydrationDone",
  ];
  const values = [
    cancelled,
    async () => (migrateReason ? { migrated: false, reason: migrateReason } : { migrated: false }),
    { id: uid },
    { error: (...a) => calls.errors.push(a.map(String).join(" ")), warn() {}, log() {} },
    (v) => calls.hydrationFailed.push(v),
    async () => { calls.load++; return loadResult(loadStatus, mirror); },
    (v) => calls.capital.push(v),
    localStorage, CURRENCY_SYMBOL,
    () => {}, () => {}, () => {}, () => {}, () => {},
    "en",
    (v) => calls.lang.push(v),
    () => {}, false, () => {}, false, () => {}, false,
    welcomeSeenRef, DEFAULT_CAPITAL,
    (v) => calls.clobber.push(v),
    hydratedRef,
    () => { calls.hydrationDone++; },
  ];

  const fn = new Function(...names, "return (" + hydrateSrc + ")")(...values);
  return { promise: fn(), calls, hydratedRef, welcomeSeenRef, localStorage };
}

function runPersist(hydratedRef, uid = "u-probe", { watchlistItems = [] } = {}) {
  const calls = { save: 0, args: [] };
  const names = ["authUser", "hydratedRef", "localStorage", "capital", "riskPct", "lang",
    "accountCurrency", "capitalCurrency", "watchlistItems", "priceAlerts", "playbookSetups",
    "showOnboarding", "userProfile", "saveSettings"];
  const values = [{ id: uid }, hydratedRef, makeLocalStorage(), 49000, 2, "he", "USD",
    "USD", watchlistItems, {}, [], true, null, (...a) => { calls.save++; calls.args.push(a); }];
  new Function(...names, "return (" + persistSrc + ")")(...values)();
  return calls;
}

/** מריץ את גוף ה-useEffect ה**עוטף** של ההידרציה — הבית של D-lite.
 *  ⚠️ `hydrate()` שבתוכו הוא async ⛔ ונקרא בלי await; האסרציות נמדדות **סינכרונית**
 *  מיד אחרי גוף האפקט, וזה בדיוק מה ש-React עושה: הוא מריץ את אפקט ההידרציה ואת
 *  אפקט ההתמדה באותו commit, ⛔ לא מחכה למיקרו-טאסק. ה-cleanup מוחזר ונקרא כדי
 *  לסגור את המסלול האסינכרוני (`cancelled = true`) ⛔ ולא להזליג בין אסרציות. */
function runHydrateEffect({ authUser, hydratedRef, storage = {}, mirror = MIRROR_OK }) {
  const calls = { load: 0, migrate: 0, watchlist: [] };
  // ⚠️ `storage` הוא **או** זרע **או** מופע חי — A18 חייב את המופע שעליו רצה
  // הסחיפה, אחרת הוא מודד אחסון אחר מזה שנוקה.
  const store = typeof storage?.getItem === "function" ? storage : makeLocalStorage(storage);
  const names = [
    "isSupabaseConfigured", "supabase", "authUser", "localStorage",
    "migrateFromLocalStorage", "console", "setHydrationFailed", "loadSettings",
    "setCapital", "CURRENCY_SYMBOL", "setAccountCurrency", "setCapitalCurrency",
    "setRiskPct", "setShowOnboarding", "setUserProfile", "lang", "setLang",
    "setWatchlistItems", "setPriceAlerts", "setPlaybookSetups", "welcomeSeenRef",
    "DEFAULT_CAPITAL", "setCapitalMaybeClobbered", "hydratedRef", "setHydrationDone",
  ];
  const values = [
    true, {}, authUser, store,
    async () => { calls.migrate++; return { migrated: false }; },
    { error() {}, warn() {}, log() {} }, () => {},
    async () => { calls.load++; return loadResult("ok", mirror); },
    () => {}, CURRENCY_SYMBOL, () => {}, () => {},
    () => {}, () => {}, () => {}, "en", () => {},
    (v) => calls.watchlist.push(v), () => {}, () => {}, { current: false },
    DEFAULT_CAPITAL, () => {}, hydratedRef, () => {},
  ];
  const cleanup = new Function(...names, "return (" + hydrateEffectSrc + ")")(...values)();
  return { cleanup, calls, store };
}

/** שני ה-useCallback שכותבים ישירות ל-DB מחוץ לאפקט ההתמדה (:1307 · :1324). */
function runWelcomeAndTourCallbacks({ authUser, hydratedRef }) {
  const calls = { save: 0, args: [] };
  const saveSettings = (...a) => { calls.save++; calls.args.push(a); };
  const localStorage = makeLocalStorage();
  const welcomeSeenRef = { current: false };

  new Function("setShowWelcome", "welcomeSeenRef", "authUser", "saveSettings", "hydratedRef",
    "return (" + dismissSrc + ")")(() => {}, welcomeSeenRef, authUser, saveSettings, hydratedRef)();

  new Function("localStorage", "authUser", "saveSettings", "setShowTour", "setTab", "hydratedRef",
    "return (" + tourSrc + ")")(localStorage, authUser, saveSettings, () => {}, () => {}, hydratedRef)(true);

  return calls;
}

function runUnload(hydratedRef) {
  const calls = { flush: 0 };
  const listeners = {};
  const win = {
    addEventListener: (e, f) => { (listeners[e] = listeners[e] || []).push(f); },
    removeEventListener: (e, f) => { listeners[e] = (listeners[e] || []).filter((x) => x !== f); },
  };
  const names = ["authUser", "hydratedRef", "window", "flushSettings"];
  const values = [{ id: "u-probe" }, hydratedRef, win, () => { calls.flush++; }];
  const cleanup = new Function(...names, "return (" + unloadSrc + ")")(...values)();
  const fire = (e) => (listeners[e] || []).forEach((f) => f());
  return { calls, fire, cleanup };
}

/* ── האסרציות ─────────────────────────────────────────────────────────────*/
const main = async () => {
  console.log("\n──────── מבחינות (19) ────────");

  // A1 · A2 · A5 · A6 — קריאה כושלת
  {
    const r = runHydrate({ loadStatus: "failed" });
    await r.promise;
    ok("A1", "failed ⇒ hydratedRef.current", r.hydratedRef.current === false, String(r.hydratedRef.current));
    ok("A2", "failed ⇒ setHydrationFailed calls", r.calls.hydrationFailed.length === 1, String(r.calls.hydrationFailed.length));
    ok("A5", "failed ⇒ setHydrationDone calls", r.calls.hydrationDone === 0, String(r.calls.hydrationDone));
    ok("A6", "failed ⇒ console.error נושא [hydrate]", r.calls.errors.some((e) => e.includes("[hydrate]")), JSON.stringify(r.calls.errors.slice(0, 1)));
  }

  // A3 · A4 — בדיקת-קיום כושלת ב-migrate
  {
    const r = runHydrate({ loadStatus: "ok", migrateReason: "check-failed" });
    await r.promise;
    ok("A3", "check-failed ⇒ loadSettings calls", r.calls.load === 0, String(r.calls.load));
    ok("A4", "check-failed ⇒ hydratedRef.current", r.hydratedRef.current === false, String(r.hydratedRef.current));
  }

  // A7 · A8 · A9 — המסלול התקין צורך את הצורה החדשה
  {
    const r = runHydrate({ loadStatus: "ok" });
    await r.promise;
    ok("A7", "ok ⇒ setCapital", r.calls.capital.length === 1 && r.calls.capital[0] === 49000, JSON.stringify(r.calls.capital));
    ok("A8", "ok ⇒ setLang", r.calls.lang.length === 1 && r.calls.lang[0] === "he", JSON.stringify(r.calls.lang));
    ok("A9", "ok ⇒ welcomeSeenRef.current", r.welcomeSeenRef.current === true, String(r.welcomeSeenRef.current));
  }

  // A10 — באנר הון=ברירת-מחדל, ⛔ בלי מפתח-ביטול
  {
    const r = runHydrate({ loadStatus: "ok", mirror: MIRROR_2500 });
    await r.promise;
    ok("A10", "ok+2500 ⇒ setCapitalMaybeClobbered", r.calls.clobber.length === 1 && r.calls.clobber[0] === true, JSON.stringify(r.calls.clobber));
  }

  // A11 — cancelled אחרי migrate
  {
    const r = runHydrate({ loadStatus: "ok", cancelled: true });
    await r.promise;
    ok("A11", "cancelled ⇒ loadSettings calls", r.calls.load === 0, String(r.calls.load));
  }

  // A12 · A13 · A14 — מורכבות: הידרציה כושלת ואז הצרכנים, על אותו hydratedRef
  {
    const r = runHydrate({ loadStatus: "failed" });
    await r.promise;
    console.log(`   (אחרי הידרציה כושלת → hydratedRef.current = ${r.hydratedRef.current})`);
    const p = runPersist(r.hydratedRef);
    ok("A12", "failed → persist effect ⇒ saveSettings calls", p.save === 0, String(p.save));
    const u = runUnload(r.hydratedRef);
    u.fire("beforeunload"); u.fire("pagehide");
    ok("A13", "failed → beforeunload+pagehide ⇒ flushSettings calls", u.calls.flush === 0, String(u.calls.flush));
    u.cleanup();
    ok("A14", "failed → +cleanup ⇒ flushSettings calls", u.calls.flush === 0, String(u.calls.flush));
  }

  /* A15 · A16 · A17 — החלפת משתמש באותו טאב (B-361 · D-lite, 22.09)
   * 🔴 `hydratedRef` הוא useRef ש⛔ אופס לעולם, וה-`return` ב-:4050 הוא early-return
   * ⛔ ולא unmount ⇒ אחרי A→B באותו טאב הוא נשאר `true`, ושלושת מסלולי הכתיבה
   * (אפקט ההתמדה · dismissWelcome · completeTour) יורים על B **בערכים של A**. */
  {
    const hydratedRef = { current: true }; // A הושלם
    const r = runHydrateEffect({ authUser: null, hydratedRef }); // התנתקות
    ok("A15", "logout (authUser=null) ⇒ hydratedRef.current", hydratedRef.current === false, String(hydratedRef.current));
    r.cleanup?.();
  }
  {
    const hydratedRef = { current: true }; // A הושלם
    const r = runHydrateEffect({ authUser: { id: "u-B" }, hydratedRef });
    const p = runPersist(hydratedRef, "u-B");
    ok("A16", "user switch A→B ⇒ persist saveSettings calls (בערכים של A)", p.save === 0,
      `${p.save}${p.save ? " → " + JSON.stringify(p.args[0]) : ""}`);
    r.cleanup?.();
  }
  {
    const hydratedRef = { current: true }; // A הושלם
    const r = runHydrateEffect({ authUser: { id: "u-B" }, hydratedRef });
    const c = runWelcomeAndTourCallbacks({ authUser: { id: "u-B" }, hydratedRef });
    ok("A17", "user switch A→B → dismissWelcome+completeTour ⇒ saveSettings calls", c.save === 0,
      `${c.save}${c.save ? " → " + JSON.stringify(c.args.map((a) => a[1])) : ""}`);
    r.cleanup?.();
  }

  /* A18 · A19 — דליפת רשימת-המעקב בין חשבונות (B-361 ⓶, 23.09)
   * 🔴 זה ה**שרת**, ⛔ המסך. `hadWatchlist` (:1767) נמדד מ-localStorage **לפני**
   * כל await ⇒ הרשימה של A, ששרדה את ההתנתקות, **מדכאת** את טעינת הרשימה של B,
   * ואפקט ההתמדה כותב אותה בחזרה לשורה של B ב-DB. ⛔ הצגה — כתיבה.
   *
   * ⚠️ הסחיפה רצה על **מופע** אחסון אחד, והוא זה שמוזרק להידרציה — סחיפה על
   * עותק היתה מודדת ניקיון של אובייקט שאיש ⛔ קורא.
   * ⚠️ `initialWatchlist` ⛔ קישוט: זה בדיוק מה ש-useState עושה ב-:1685 אחרי
   * remount — הוא קורא את האחסון שנוקה. מי שמדלג עליו מניח את מה שנמדד. */
  {
    const store = makeLocalStorage({
      swingEdgeWatchlist: JSON.stringify([{ ticker: "ZZZA", setup: "A-only" }]),
      swingEdgeCapital: "49000",
      swingEdgeConsent: '{"v":1,"analytics":"granted"}',
    });

    clearUserScopedStorage(store); // ← uid A → null, מה שה-wrapper מריץ

    // ⚠️ תצלום **מיד** אחרי הסחיפה, ⛔ בסוף הבלוק: ההידרציה כותבת בחזרה
    // `swingEdgeCapital` (:1759) בערך של B ⇒ בדיקה בסוף הייתה מודדת את הכתיבה
    // החוזרת ומדווחת «⛔ נמחק» על מפתח שכן נמחק. נמדד — A19 ירתה אדום כוזב.
    const afterSweep = { consent: store.getItem("swingEdgeConsent"), capital: store.getItem("swingEdgeCapital") };

    const initialWatchlist = JSON.parse(store.getItem("swingEdgeWatchlist") || "[]");
    const hydratedRef = { current: false };
    const r = runHydrateEffect({
      authUser: { id: "u-B" },
      hydratedRef,
      storage: store,
      mirror: { ...MIRROR_OK, watchlist: [{ ticker: "BBBB", setup: "B-only" }] },
    });
    await tick(); await tick(); await tick();
    const watchlistItems = r.calls.watchlist.length ? r.calls.watchlist.at(-1) : initialWatchlist;
    const p = runPersist({ current: true }, "u-B", { watchlistItems });
    const patch = p.args[0]?.[1];
    const zz = (patch?.watchlist || []).filter((x) => x.ticker === "ZZZA").length;
    ok("A18", "A→B אחרי סחיפה ⇒ פריטי ZZZA ב-patch של B",
      p.save === 1 && p.args[0][0] === "u-B" && zz === 0,
      `save=${p.save} uid=${p.args[0]?.[0]} zzza=${zz} watchlist=${JSON.stringify(patch?.watchlist)}`);
    r.cleanup?.();

    // ⚠️ זרוע ביקורת. בלעדיה «0 דליפות» מתקבל גם ממחיקת **הכל** — כולל ההסכמה
    // ל-GDPR, שהיא הצהרה על הדפדפן ⛔ על האדם.
    ok("A19", "סחיפה ⇒ מפתח רמת-מכשיר שורד · מפתח רמת-משתמש נמחק",
      afterSweep.consent !== null && afterSweep.capital === null,
      `consent=${afterSweep.consent === null ? "null" : "שרד"} capital=${afterSweep.capital}`);
  }

  console.log("\n──────── אינווריאנטות (6) — ⚪ ירוקות בשני העצים, ⛔ אינן מודדות את התיקון ────────");

  // I1 · I2 — משתמש חדש: empty הוא סמכותי וחייב להישאר בר-כתיבה
  {
    const r = runHydrate({ loadStatus: "empty", mirror: {} });
    await r.promise;
    invariant("I1", "empty ⇒ hydratedRef.current (חייב true)", r.hydratedRef.current === true, String(r.hydratedRef.current));
    invariant("I2", "empty ⇒ setCapital calls", r.calls.capital.length === 0, String(r.calls.capital.length));
  }

  // I3 — מפתח-ביטול קיים ⇒ הבאנר ⛔ לא מורם
  {
    const r = runHydrate({ loadStatus: "ok", mirror: MIRROR_2500, storage: { "swingEdgeCapitalConfirmed:u-probe": "1" } });
    await r.promise;
    invariant("I3", "ok+2500+מבוטל ⇒ clobber calls", r.calls.clobber.length === 0, String(r.calls.clobber.length));
  }

  // I4 — empty עם מראה 2500 ⇒ הבאנר ⛔ לא מורם (status !== "ok")
  {
    const r = runHydrate({ loadStatus: "empty", mirror: MIRROR_2500 });
    await r.promise;
    invariant("I4", "empty+2500 ⇒ clobber calls", r.calls.clobber.length === 0, String(r.calls.clobber.length));
  }

  // I5 — שערי-מטא
  invariant("I5", "5 עוגנים ייחודיים · סוגריים מאוזנים · זנב תואם",
    Object.values(counts).every((v) => v === 1)
      && tailOk && persistTailOk && unloadTailOk && hydrateEffectTailOk && dismissTailOk && tourTailOk,
    `anchors=${Object.values(counts).join("/")} tail=${[tailOk, persistTailOk, unloadTailOk, hydrateEffectTailOk, dismissTailOk, tourTailOk].join("/")}`);

  // I6 — רשימת ה-KEEP קפואה. ⚠️ ⛔ מקבעת **תוכן** אלא **סגירוּת**: תוספת
  // מפתח לרשימה היא הרחבת מה ששורד התנתקות ⇒ הכרעה, ⛔ ריפקטור.
  invariant("I6", "DEVICE_KEYS — קפואה ובגודל 5",
    Object.isFrozen(DEVICE_KEYS) && DEVICE_KEYS.length === 5,
    `frozen=${Object.isFrozen(DEVICE_KEYS)} n=${DEVICE_KEYS.length}`);

  const total = pass + inv + fail;
  console.log(`\n${APP}`);
  console.log(`מבחינות: ${pass}/19 · אינווריאנטות: ${inv}/6 · סה"כ ${pass + inv}/${total}`);
  if (fail) {
    console.log(`🔴 אדומות (${fail}): ${reds.join(" · ")}`);
    process.exit(1);
  }
  console.log("✅ hydration wiring: 25/25");
};

main().catch((e) => { console.error("🔴 harness נפל:", e); process.exit(1); });
