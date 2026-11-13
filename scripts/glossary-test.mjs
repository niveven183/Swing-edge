// test:glossary — המילון הוא מקור אחד, והעותקים שלו לא נסחפים.
//
// WHY. עד גל 3 (13.11) טקסט המונחים חי בשמונה מקומות: src/data/tooltips.js,
// עותק ב-src/data/glossary.json, עותק ב-docs (שנסחף ל-70/72 בלי שאף שער ראה),
// ועוד חמישה משטחים inline. "?" שמפנה למונח שלא קיים החזיר null בשקט.
// השער הזה הוא מה שמחזיק את ההבטחה של src/glossary/:
//   S  — הסכימה של כל מונח (5 שפות · label+short · מפתח לא מוכר = אדום)
//   G  — כל קובץ מחולל זהה בייט-לבייט למה שהמחולל מפיק עכשיו מהמקור (sourceHash)
//   R  — אין "?" שבור: כל term= סטטי קיים · כל אתר דינמי בלדג'ר · נקודת ייבוא אחת
//   F  — פורמט הטקסט המוצג (גל 3 שלב 4): הגדרה במשפט אחד ≤18 מילים · "לדוגמה:"/"Example:" ·
//        he ≤35 / en ≤40 מילים · בלי \n\n / • · LRM לפני מספר מסומן בעברית · mustContain · מקור/חישוב
//   W  — איפה מוצג: shownAt של כל מונח = הקבצים שבאמת מרנדרים אותו; יתום ⇔ glossaryOnly
//   L  — לדג'רים מדויקים (מותנים · <InfoTooltip> · שפות שממתינות לתרגום). דו-כיווני:
//        מי שמתקן בלי להזיז את השורה — מקבל אדום, וכך גם מי שמקלקל.
//
// ⛔ כשל טעינה/חילוץ הוא אדום קשה, ⛔ דילוג (B-272).
// Usage: node scripts/glossary-test.mjs [root]   (root ⇒ מוטנטים על עותק)

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const ROOT = path.resolve(process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));
const imp = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);

let pass = 0;
const fails = [];
function check(id, label, ok, detail = "") {
  if (ok) { pass++; console.log(`  ✓ ${id}  ${label}`); }
  else { fails.push(id); console.error(`  ✗ ${id}  ${label}${detail ? `\n        ${detail}` : ""}`); }
}
function hardFail(id, label, err) {
  check(id, label, false, String(err?.stack ?? err));
  console.error(`\n❌ test:glossary — כשל טעינה הוא אדום קשה (B-272). ${pass} עברו, ${fails.length} נכשלו.`);
  process.exit(1);
}

// ── ledgers (step 4 — 13.11) ────────────────────────────────────────────────
const TERM_COUNT = 80;
const LANGS = ["he", "en", "es", "pt", "ar"];
// אתרי term={…} שאינם ליטרל. כל ערך: הביטוי המדויק ⇒ ספירה. חדש = הכרעה + שורה כאן.
const DYNAMIC_SITES = {
  "SwingEdge_App.jsx": { "term": 1, "emoKey": 1, "resolveSetupKey(s.setup)": 1, "key": 1 },
  "src/components/DayTradesModal.jsx": { "key": 1 },
  "src/components/EditTradeModal.jsx": { "term": 1 },
  "src/components/MonthlyReportTab.jsx": { "term": 1 },
  "src/intelligence/ui/IntelligenceUI.jsx": { 'good ? "edge" : "antiEdge"': 1, "r.term": 1 },
};
// מה מוזן לאתרי term={term}/r.term: מערך [label, key, cls, term] · sCard(…, term) · שורה { term: "x" }.
// ⚠️ גבול: הזנה בתבנית אחרת ⛔ נראית כאן — היא תיתפס רק אם המונח לא קיים ו-TermTooltip יחזיר null.
const FED = {
  "SwingEdge_App.jsx": ["stopLoss", "takeProfit"],
  "src/components/EditTradeModal.jsx": ["stopLoss", "takeProfit"],
  "src/components/MonthlyReportTab.jsx": ["winRate", "avgR"],
  "src/intelligence/ui/IntelligenceUI.jsx": ["dnaRisk", "discipline", "dnaConsistency", "dnaGrowth"],
};
// אתרים דינמיים שמוגנים בשער ⇒ לא יכולים לרנדר "?" שבור. הסרת השער = אדום.
const GUARDS = [
  ["SwingEdge_App.jsx", "{hasTerm(emoKey) && <TermTooltip term={emoKey}"],
  ["SwingEdge_App.jsx", "{resolveSetupKey(s.setup) && <TermTooltip term={resolveSetupKey(s.setup)}"],
  ["SwingEdge_App.jsx", "if (!key) return null;\n  return <TermTooltip term={key}"],
  ["src/components/DayTradesModal.jsx", "if (!key) return null;\n  return <TermTooltip term={key}"],
];
// סטאפים מגיעים למסך דרך resolveSetupKey בשני הקבצים האלה; רגשות — דרך emoKey ב-App.
const SETUP_FILES = ["SwingEdge_App.jsx", "src/components/DayTradesModal.jsx"];
const EMOTION_FILES = ["SwingEdge_App.jsx"];
const LANDING = "src/components/LandingPage.jsx"; // מזהים = ערכי SURFACE_KEY
const CONDITIONAL = ["pullback20EMA", "bullFlag", "ORBBreakout", "VWAPReclaim", "higherLow", "cupAndHandle", "failedBreakout", "overextendedFade", "EMABounce50", "trendContinuation", "gapAndGo", "earningsGapPlay", "rangeBreakout", "postEarningsStrength", "powerHourBreak", "MOCFade", "overnightHold", "overnightReversal"];
// <InfoTooltip> מחוץ ל-src/components/ui. App 7 = StatCard הגנרי (1) + 6 תוויות טופס (CATEGORY_TOOLTIP — ממתין להכרעת ניב, STOP 2).
const INFOTOOLTIP_SITES = { "SwingEdge_App.jsx": 7, "src/components/EditTradeModal.jsx": 2 };
const STATCARD_INFO = 0; // App: StatCard info={…} — 0 מגל 3 (כרטיס ההון עבר למונח accountEquity)
// שלב 4: es/pt/ar ממתינים לתרגום בכל 80 המונחים. שלב 5 מרוקן ⇒ השורה הופכת ל-0.
const PENDING = ["es", "pt", "ar"];
// פורמט
const CAP = { he: 35, en: 40 }, DEF_CAP = 18, EX = { he: "לדוגמה:", en: "Example:" };
const MEASURED_CATS = ["performance", "analytics", "metrics"];
const MEASURED_IDS = ["dna", "dnaRisk", "dnaConsistency", "dnaGrowth", "discipline", "edge", "antiEdge", "tilt", "marketRegime", "riskPerTrade", "riskLimits", "positionSize"];
const SELF_RATED = { entryQuality: "דירוג שהמשתמש נותן — אין חישוב לצטט" };

// ── M · load ────────────────────────────────────────────────────────────────
console.log("\nM · טעינה");
let gen, terms, enums;
try { gen = await imp("scripts/build-glossary.mjs"); } catch (e) { hardFail("M1", "המחולל נטען", e); }
check("M1", "המחולל נטען (scripts/build-glossary.mjs)", typeof gen.loadTerms === "function" && typeof gen.buildArtifacts === "function");
try {
  const r = await gen.loadTerms(ROOT);
  if (r.loadErrors.length) throw new Error(r.loadErrors.join("\n"));
  terms = r.terms;
} catch (e) { hardFail("M2", "8 קבצי המקור נטענים", e); }
check("M2", `8 קבצי המקור נטענים (${terms.length} מונחים)`, true);
try { enums = await imp("src/data/tradeEnums.js"); } catch (e) { hardFail("M3", "tradeEnums נטען", e); }
if (!Array.isArray(enums.EMOTION_VALUES) || !Array.isArray(enums.SETUP_VALUES)) hardFail("M3", "EMOTION_VALUES/SETUP_VALUES", "missing");
check("M3", `tradeEnums: ${enums.EMOTION_VALUES.length} רגשות · ${enums.SETUP_VALUES.length} סטאפים`, true);

const corpus = ["SwingEdge_App.jsx"];
(function walk(d) {
  for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (p !== path.join("src", "glossary")) walk(p); }
    else if (/\.(jsx?|mjs)$/.test(e.name)) corpus.push(p);
  }
})("src");
const SRC = Object.fromEntries(corpus.map((f) => [f, fs.readFileSync(path.join(ROOT, f), "utf8")]));
check("M4", `קורפוס JSX/JS נקרא (${corpus.length} קבצים)`, corpus.length > 50 && SRC["SwingEdge_App.jsx"].length > 100000);

// ── S · schema ──────────────────────────────────────────────────────────────
console.log("\nS · סכימה");
let sources;
try { sources = (await imp("src/glossary/sources.js")).default; } catch (e) { hardFail("M5", "src/glossary/sources.js נטען", e); }
const issues = gen.validateTerms(terms, sources);
check("S1", "כל המונחים תקינים (id · 5 שפות · label+short · בלי מפתח לא מוכר · aliases · sources · related)", issues.length === 0, issues.slice(0, 15).join("\n        "));
check("S2", `ספירת מונחים = ${TERM_COUNT} (לדג'ר — שינוי מכוון מזיז את השורה)`, terms.length === TERM_COUNT, `נמדד ${terms.length}`);
const ids = new Set(terms.map((t) => t.id));

// ── G · generated copies ────────────────────────────────────────────────────
console.log("\nG · עותקים מחוללים");
const { sourceHash, files } = gen.buildArtifacts(terms);
for (const [rel, want] of Object.entries(files)) {
  const p = path.join(ROOT, rel);
  const have = fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
  check(`G·${path.basename(rel)}`, `${rel} זהה למחולל (sourceHash ${sourceHash})`, have === want,
    have === null ? "הקובץ חסר — הרץ `npm run glossary`" : "נסחף — הרץ `npm run glossary` באותו קומיט");
}
const genDir = path.join(ROOT, "src/glossary/generated");
const stray = fs.readdirSync(genDir).filter((f) => !files[`src/glossary/generated/${f}`]);
check("G·stray", "אין ב-generated/ קובץ שהמחולל לא מפיק", stray.length === 0, stray.join(", "));

// ── R · references ──────────────────────────────────────────────────────────
console.log("\nR · הפניות");
const legacyImporters = Object.entries(SRC).filter(([, s]) => /data\/tooltips(\.js)?["']/.test(s)).map(([f]) => f);
const scriptsDir = path.join(ROOT, "scripts");
for (const f of fs.readdirSync(scriptsDir)) {
  if (/\.m?js$/.test(f) && f !== "glossary-test.mjs" && /src\/data\/tooltips\.js["']/.test(fs.readFileSync(path.join(scriptsDir, f), "utf8"))) legacyImporters.push(`scripts/${f}`);
}
check("R1", "src/data/tooltips.js לא קיים ואף קובץ לא מייבא אותו", !fs.existsSync(path.join(ROOT, "src/data/tooltips.js")) && legacyImporters.length === 0, legacyImporters.join(", "));

const genImporters = Object.entries(SRC).filter(([, s]) => /glossary\/generated\//.test(s)).map(([f]) => f);
check("R2", "אף קובץ מחוץ ל-src/glossary לא מייבא את generated/ ישירות (נקודת כניסה אחת)", genImporters.length === 0, genImporters.join(", "));
const indexSrc = fs.readFileSync(path.join(ROOT, "src/glossary/index.js"), "utf8");
check("R3", "index.js לא מייבא long.*.json (הטקסט הארוך ⛔ בצ'אנק הראשי)", !/long\.\w+\.json/.test(indexSrc));
// R8 — the long text reaches the app ONLY through the lazy dialog body: src/glossary/long.js is imported by
// GlossaryBody.jsx alone, and GlossaryBody is never imported statically (⛔ a static import = it is in the main chunk).
const longImporters = Object.entries(SRC).filter(([, s]) => /from\s+["'][^"']*glossary\/long(\.js)?["']/.test(s)).map(([f]) => f);
const bodyStatic = Object.entries(SRC).filter(([, s]) => /import\s+\w+\s+from\s+["'][^"']*GlossaryBody(\.jsx)?["']/.test(s)).map(([f]) => f);
const bodyDynamic = Object.entries(SRC).filter(([, s]) => /import\(\s*["'][^"']*GlossaryBody\.jsx["']\s*\)/.test(s)).map(([f]) => f);
check("R8", "הטקסט הארוך רק דרך import() — long.js ⇐ GlossaryBody בלבד · GlossaryBody ⇐ import() בלבד",
  JSON.stringify(longImporters) === JSON.stringify([path.join("src", "components", "GlossaryBody.jsx")]) && bodyStatic.length === 0 && bodyDynamic.length === 1,
  `long.js ⇐ ${longImporters.join(", ") || "—"} · סטטי ${bodyStatic.join(", ") || "—"} · דינמי ${bodyDynamic.join(", ") || "—"}`);

const staticIds = [];
const dynamic = {};
for (const [f, s] of Object.entries(SRC)) {
  if (f.endsWith(path.join("ui", "TermTooltip.jsx"))) continue; // הערת שימוש בלבד
  for (const m of s.matchAll(/<TermTooltip\s+term=(?:"(\w+)"|\{([^}]*)\})/g)) {
    if (m[1]) staticIds.push([f, m[1]]);
    else { (dynamic[f] ??= {}); dynamic[f][m[2].trim()] = (dynamic[f][m[2].trim()] ?? 0) + 1; }
  }
}
const broken = staticIds.filter(([, id]) => !ids.has(id));
check("R4", `כל term="…" סטטי קיים במקור (${staticIds.length} אתרים)`, staticIds.length > 0 && broken.length === 0, broken.map(([f, id]) => `${f}: ${id}`).join(", "));
check("R5", "אתרי term={…} דינמיים = הלדג'ר בדיוק", JSON.stringify(dynamic, Object.keys(dynamic).sort()) === JSON.stringify(DYNAMIC_SITES, Object.keys(DYNAMIC_SITES).sort()) && Object.keys(dynamic).every((f) => JSON.stringify(Object.entries(dynamic[f]).sort()) === JSON.stringify(Object.entries(DYNAMIC_SITES[f] ?? {}).sort())),
  `נמדד ${JSON.stringify(dynamic)}`);
const ternary = Object.values(dynamic).flatMap((o) => Object.keys(o)).flatMap((e) => [...e.matchAll(/"(\w+)"/g)].map((m) => m[1]));
const fedBad = [];
for (const [f, list] of Object.entries(FED)) for (const id of list) {
  if (!ids.has(id)) fedBad.push(`${f}: ${id} לא קיים`);
  if (!new RegExp(`(, "${id}"(\\]|\\)))|(term: "${id}")`).test(SRC[f] ?? "")) fedBad.push(`${f}: ${id} כבר לא מוזן`);
}
check("R6", `ליטרלים בטרנרי (${ternary.length}) ובהזנות term={term} (${Object.values(FED).flat().length}) קיימים ומוזנים`, ternary.every((id) => ids.has(id)) && fedBad.length === 0, fedBad.join(", "));
const guardMiss = GUARDS.filter(([f, g]) => !(SRC[f] ?? "").includes(g.replace(/\\n/g, "\n")));
check("R7", "אתרים דינמיים מגודרים (hasTerm / resolveSetupKey לפני הרינדור)", guardMiss.length === 0, guardMiss.map((x) => x[1]).join(" | "));

// ── W · where each term is shown ────────────────────────────────────────────
console.log("\nW · איפה מוצג");
const { resolveSetupKey, termText } = await imp("src/glossary/index.js");
const reachFiles = new Map([...ids].map((k) => [k, new Set()]));
const hit = (k, f) => { if (reachFiles.has(k)) reachFiles.get(k).add(f); };
for (const [f, id] of staticIds) hit(id, f);
for (const [f, o] of Object.entries(dynamic)) for (const e of Object.keys(o)) for (const m of e.matchAll(/"(\w+)"/g)) hit(m[1], f);
for (const [f, list] of Object.entries(FED)) for (const id of list) hit(id, f);
for (const v of enums.EMOTION_VALUES) for (const f of EMOTION_FILES) hit(`emotion${v}`, f);
const aliasTargets = new Set(terms.filter((t) => t.aliases).map((t) => t.id));
for (const k of aliasTargets) for (const f of SETUP_FILES) hit(k, f);
const surf = (SRC[LANDING] ?? "").match(/const SURFACE_KEY = \{([\s\S]*?)\};/);
if (!surf) hardFail("W0", "SURFACE_KEY נמצא ב-LandingPage.jsx", "anchor missing");
const landingIds = [...new Set([...surf[1].matchAll(/:\s*"(\w+)"/g)].map((m) => m[1]))];
check("W0", `מונחי דף הנחיתה קיימים במקור (${landingIds.length})`, landingIds.length > 0 && landingIds.every((k) => ids.has(k)), landingIds.filter((k) => !ids.has(k)).join(", "));
for (const k of landingIds) hit(k, LANDING);
const shownBad = [];
for (const t of terms) {
  const want = [...reachFiles.get(t.id)].sort();
  const have = [...new Set((t.shownAt ?? []).map((x) => x.split(" — ")[0]))].sort();
  if (JSON.stringify(want) !== JSON.stringify(have)) shownBad.push(`${t.id}: shownAt [${have.join(", ")}] ≠ נמדד [${want.join(", ")}]`);
  if ((t.shownAt ?? []).some((x) => !/ — \S/.test(x))) shownBad.push(`${t.id}: shownAt בלי תיאור ("קובץ — איפה")`);
}
check("W1", "shownAt של כל מונח = הקבצים שמרנדרים אותו בפועל (דו-כיווני)", shownBad.length === 0, shownBad.slice(0, 12).join("\n        "));
const orphans = [...ids].filter((k) => reachFiles.get(k).size === 0).sort();
const gOnly = terms.filter((t) => t.glossaryOnly).map((t) => t.id).sort();
check("W2", `יתום ⇔ glossaryOnly מנומק (${gOnly.length}: ${gOnly.join(" · ")})`, JSON.stringify(orphans) === JSON.stringify(gOnly), `יתומים ${orphans.join(" ")} · glossaryOnly ${gOnly.join(" ")}`);
const conditional = [...aliasTargets].filter((k) => !enums.SETUP_VALUES.some((v) => resolveSetupKey(v) === k));
const same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
check("W3", `סטאפים מותנים (מגיעים למסך רק מעסקה שמורה) = ${CONDITIONAL.length}`, same(conditional, CONDITIONAL), `נמדד ${conditional.length}: ${conditional.join(" ")}`);

// ── F · format of the displayed text ────────────────────────────────────────
console.log("\nF · פורמט");
const wc = (x) => x.trim().split(/\s+/).filter(Boolean).length;
const live = (t) => LANGS.filter((l) => !(t.pendingTranslation ?? []).includes(l));
const fb = { def: [], ex: [], cap: [], shape: [], lrm: [], must: [], src: [], file: [] };
for (const t of terms) {
  for (const l of live(t)) {
    const x = t.i18n[l]; const shown = termText(t.id, l);
    if (wc(x.short) > DEF_CAP || /[.!?](\s|$)[\s\S]*[.!?](\s|$)/.test(x.short) || x.short.includes("\n")) fb.def.push(`${t.id}.${l} (${wc(x.short)})`);
    if (EX[l] && !(x.example ?? "").startsWith(EX[l])) fb.ex.push(`${t.id}.${l}`);
    if (CAP[l] && wc(shown) > CAP[l]) fb.cap.push(`${t.id}.${l} ${wc(shown)}>${CAP[l]}`);
    if (/\n\n|•/.test(shown)) fb.shape.push(`${t.id}.${l}`);
    if ((l === "he" || l === "ar") && /(^|[^\u200e])[+\u2212]\d/.test(shown)) fb.lrm.push(`${t.id}.${l}`);
    for (const m of t.mustContain?.[l] ?? []) if (!shown.includes(m)) fb.must.push(`${t.id}.${l} ⇏ ${m}`);
  }
  const measured = MEASURED_CATS.includes(t.category) || MEASURED_IDS.includes(t.id);
  if (measured && !SELF_RATED[t.id] && !(t.computedIn?.length || t.sources?.length)) fb.src.push(t.id);
  for (const c of t.computedIn ?? []) if (!fs.existsSync(path.join(ROOT, c.split(":")[0]))) fb.file.push(`${t.id}: ${c}`);
}
check("F1", `הגדרה = משפט אחד ≤${DEF_CAP} מילים (he+en)`, fb.def.length === 0, fb.def.join(", "));
check("F2", "דוגמה פותחת ב-\"לדוגמה:\" / \"Example:\" (he+en)", fb.ex.length === 0, fb.ex.join(", "));
check("F3", `טקסט מוצג ≤${CAP.he} מילים בעברית · ≤${CAP.en} באנגלית`, fb.cap.length === 0, fb.cap.join(", "));
check("F4", "בלי \\n\\n ובלי • בטקסט המוצג", fb.shape.length === 0, fb.shape.join(", "));
check("F5", "מספר מסומן (+/−) בעברית/ערבית נושא LRM לפניו", fb.lrm.length === 0, fb.lrm.join(", "));
check("F6", "mustContain מתקיים בטקסט המוצג", fb.must.length === 0, fb.must.join(", "));
check("F7", "כל מונח שמתאר מספר מחושב נושא computedIn או sources", fb.src.length === 0, fb.src.join(", "));
check("F8", "כל computedIn מצביע על קובץ קיים", fb.file.length === 0, fb.file.join(", "));

// ── L · ledgers ─────────────────────────────────────────────────────────────
console.log("\nL · לדג'רים");
const info = {};
for (const [f, src] of Object.entries(SRC)) {
  if (f.startsWith(path.join("src", "components", "ui"))) continue;
  const n = (src.match(/<InfoTooltip\b/g) ?? []).length;
  if (n) info[f] = n;
}
check("L1", "<InfoTooltip> מחוץ ל-ui/ = הלדג'ר", same(Object.entries(info).map((e) => e.join(":")), Object.entries(INFOTOOLTIP_SITES).map((e) => e.join(":"))), `נמדד ${JSON.stringify(info)}`);
const statInfo = (SRC["SwingEdge_App.jsx"].match(/\binfo=\{/g) ?? []).length;
check("L2", `StatCard info={…} = ${STATCARD_INFO}`, statInfo === STATCARD_INFO, `נמדד ${statInfo}`);
const pendBad = terms.filter((t) => !same(t.pendingTranslation ?? [], PENDING)).map((t) => t.id);
check("L3", `שפות שממתינות לתרגום = [${PENDING.join(", ")}] בכל המונחים (שלב 5 מרוקן)`, pendBad.length === 0, pendBad.join(", "));

const total = pass + fails.length;
console.log(`\n${pass}/${total} assertions passed`);
if (fails.length) { console.error(`❌ test:glossary: ${fails.length} נכשלו — ${fails.join(" · ")}`); process.exit(1); }
console.log("✅ glossary: מקור אחד, עותקים זהים, אין \"?\" שבור");
