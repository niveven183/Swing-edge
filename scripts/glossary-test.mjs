// test:glossary — המילון הוא מקור אחד, והעותקים שלו לא נסחפים.
//
// WHY. עד גל 3 (13.11) טקסט המונחים חי בשמונה מקומות: src/data/tooltips.js,
// עותק ב-src/data/glossary.json, עותק ב-docs (שנסחף ל-70/72 בלי שאף שער ראה),
// ועוד חמישה משטחים inline. "?" שמפנה למונח שלא קיים החזיר null בשקט.
// השער הזה הוא מה שמחזיק את ההבטחה של src/glossary/:
//   S  — הסכימה של כל מונח (5 שפות · label+short · מפתח לא מוכר = אדום)
//   G  — כל קובץ מחולל זהה בייט-לבייט למה שהמחולל מפיק עכשיו מהמקור (sourceHash)
//   R  — אין "?" שבור: כל term= סטטי קיים · כל אתר דינמי בלדג'ר · נקודת ייבוא אחת
//   L  — לדג'רים מדויקים של מה שגל 3 טרם תיקן (יתומים · inline · מכסות). דו-כיווני:
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

// ── ledgers (step 2 — the numbers step 4 must move) ─────────────────────────
const TERM_COUNT = 72;
const LANGS = ["he", "en", "es", "pt", "ar"];
// אתרי term={…} שאינם ליטרל. כל ערך: הביטוי המדויק ⇒ ספירה. חדש = הכרעה + שורה כאן.
const DYNAMIC_SITES = {
  "SwingEdge_App.jsx": { "term": 1, "emoKey": 1, "resolveSetupKey(s.setup)": 1 },
  "src/components/EditTradeModal.jsx": { "term": 1 },
  "src/components/MonthlyReportTab.jsx": { "term": 1 },
  "src/intelligence/ui/IntelligenceUI.jsx": { 'good ? "edge" : "antiEdge"': 1 },
};
// מה מוזן לאתרי term={term} (מערך [label, key, cls, term] או sCard(…, term)). ⚠️ גבול: הזנה חדשה
// בתבנית אחרת ⛔ נראית כאן — היא תיתפס רק אם המונח לא קיים ו-TermTooltip יחזיר null.
const FED = {
  "SwingEdge_App.jsx": ["stopLoss", "takeProfit"],
  "src/components/EditTradeModal.jsx": ["stopLoss", "takeProfit"],
  "src/components/MonthlyReportTab.jsx": ["winRate", "avgR"],
};
// אתרים דינמיים שמוגנים בשער ⇒ לא יכולים לרנדר "?" שבור. הסרת השער = אדום.
const GUARDS = [
  ["SwingEdge_App.jsx", "{hasTerm(emoKey) && <TermTooltip term={emoKey}"],
  ["SwingEdge_App.jsx", "{resolveSetupKey(s.setup) && <TermTooltip term={resolveSetupKey(s.setup)}"],
];
const CONDITIONAL = ["pullback20EMA", "bullFlag", "ORBBreakout", "VWAPReclaim", "higherLow", "cupAndHandle", "failedBreakout", "overextendedFade", "EMABounce50", "trendContinuation", "gapAndGo", "earningsGapPlay", "rangeBreakout", "postEarningsStrength", "powerHourBreak", "MOCFade", "overnightHold", "overnightReversal"];
const ORPHANS = ["expectancy", "sharpe", "tilt", "rMultiple", "wilson", "discipline", "marketTrendingUp", "marketTrendingDown", "marketSideways", "marketVolatile", "dnaRisk", "dnaConsistency", "dnaGrowth", "totalReturn", "winStreak", "streakHistory", "grade", "entryQuality"];
// <InfoTooltip> מחוץ ל-src/components/ui — טקסט שאינו מהמקור. שלב 4 מוריד ל-0.
const INFOTOOLTIP_SITES = { "SwingEdge_App.jsx": 18, "src/components/DayTradesModal.jsx": 1, "src/components/EditTradeModal.jsx": 2 };
const STATCARD_INFO = 1; // App: StatCard info={…} — כרטיס ההון
// מכסות — נמדד 13.11 על הטקסט המוצג. שלב 4: he ≤35 · en ≤40 · בלי \n\n / • ⇒ 0.
const QUOTA = { heOver35: 18, enOver40: 16, bullets: 19 };

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
const issues = gen.validateTerms(terms);
check("S1", "כל המונחים תקינים (id · 5 שפות · label+short · בלי מפתח לא מוכר · aliases)", issues.length === 0, issues.slice(0, 15).join("\n        "));
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
  if (!new RegExp(`, "${id}"(\\]|\\))`).test(SRC[f] ?? "")) fedBad.push(`${f}: ${id} כבר לא מוזן`);
}
check("R6", `ליטרלים בטרנרי (${ternary.length}) ובהזנות term={term} (${Object.values(FED).flat().length}) קיימים ומוזנים`, ternary.every((id) => ids.has(id)) && fedBad.length === 0, fedBad.join(", "));
const guardMiss = GUARDS.filter(([f, g]) => !(SRC[f] ?? "").includes(g));
check("R7", "אתרים דינמיים מגודרים (hasTerm / resolveSetupKey לפני הרינדור)", guardMiss.length === 0, guardMiss.map((x) => x[1]).join(" | "));

// ── L · ledgers of what wave 3 has not fixed yet ────────────────────────────
console.log("\nL · לדג'רים (מה שגל 3 עוד לא תיקן)");
const { resolveSetupKey, termText } = await imp("src/glossary/index.js");
const reached = new Set([...staticIds.map(([, id]) => id), ...ternary, ...Object.values(FED).flat()]);
for (const v of enums.EMOTION_VALUES) if (ids.has(`emotion${v}`)) reached.add(`emotion${v}`);
for (const v of enums.SETUP_VALUES) { const k = resolveSetupKey(v); if (k) reached.add(k); }
const aliasTargets = new Set(terms.filter((t) => t.aliases).map((t) => t.id));
const conditional = [...aliasTargets].filter((k) => !reached.has(k));
const orphans = [...ids].filter((k) => !reached.has(k) && !aliasTargets.has(k));
const same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
check("L1", `מותנים (סטאפ שמגיע רק מעסקה שמורה) = ${CONDITIONAL.length}`, same(conditional, CONDITIONAL), `נמדד ${conditional.length}: ${conditional.join(" ")}`);
check("L2", `יתומים = ${ORPHANS.length} (שלב 4: לחבר 11 · למחוק 4 · מילון-בלבד 3)`, same(orphans, ORPHANS), `נמדד ${orphans.length}: ${orphans.join(" ")}`);
const info = {};
for (const [f, s] of Object.entries(SRC)) {
  if (f.startsWith(path.join("src", "components", "ui"))) continue;
  const n = (s.match(/<InfoTooltip\b/g) ?? []).length;
  if (n) info[f] = n;
}
check("L3", "<InfoTooltip> מחוץ ל-ui/ = הלדג'ר", same(Object.entries(info).map((e) => e.join(":")), Object.entries(INFOTOOLTIP_SITES).map((e) => e.join(":"))), `נמדד ${JSON.stringify(info)}`);
const statInfo = (SRC["SwingEdge_App.jsx"].match(/\binfo=\{/g) ?? []).length;
check("L4", `StatCard info={…} = ${STATCARD_INFO}`, statInfo === STATCARD_INFO, `נמדד ${statInfo}`);
const wc = (s) => s.trim().split(/\s+/).filter(Boolean).length;
const q = {
  heOver35: [...ids].filter((k) => wc(termText(k, "he")) > 35).length,
  enOver40: [...ids].filter((k) => wc(termText(k, "en")) > 40).length,
  bullets: [...ids].filter((k) => /\n\n|•/.test(termText(k, "he")) || /\n\n|•/.test(termText(k, "en"))).length,
};
check("L5", `מכסות (מדידה): he>35 ${QUOTA.heOver35}/${TERM_COUNT} · en>40 ${QUOTA.enOver40}/${TERM_COUNT} · תבליטים ${QUOTA.bullets}/${TERM_COUNT}`, same(Object.entries(q).map((e) => e.join(":")), Object.entries(QUOTA).map((e) => e.join(":"))), `נמדד ${JSON.stringify(q)}`);

const total = pass + fails.length;
console.log(`\n${pass}/${total} assertions passed`);
if (fails.length) { console.error(`❌ test:glossary: ${fails.length} נכשלו — ${fails.join(" · ")}`); process.exit(1); }
console.log("✅ glossary: מקור אחד, עותקים זהים, אין \"?\" שבור");
