// scripts/build-glossary.mjs — מחולל המילון. `npm run glossary`.
//
// מקור: src/glossary/terms/<category>.js (8 קבצים). הקטגוריה = שם הקובץ.
// פלט (כולם נושאים sourceHash; test:glossary מחולל מחדש בזיכרון ומשווה בייט-לבייט):
//   src/glossary/generated/inline.json        תוויות × 5 שפות + מפת aliases — סינכרוני, בצ'אנק הראשי
//   src/glossary/generated/short.<lang>.json  הטקסט המוצג בבועה (×5)
//   src/glossary/generated/long.<lang>.json   longForm — רק למודאל המילון (×5) ⛔ לייבא מהצ'אנק הראשי
//   src/data/glossary.json                    עותק {label, description} — test:copy #5 קורא אותו
//   docs/SwingEdge-Terms-Glossary.md          עותק קריא
//
// ⛔ המחולל מסרב לכתוב כשהסכימה שבורה — זורק עם רשימת הבעיות (אפס כשל שקט).

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL, fileURLToPath } from "node:url";
import { composeShort as compose } from "../src/glossary/compose.js";

export const LANGS = ["he", "en", "es", "pt", "ar"];
export const CATEGORIES = {
  performance: "מדדי ביצוע",
  analytics: "אנליטיקס — גרפים וכרטיסי תובנה",
  metrics: "מדדים נוספים",
  concepts: "מושגים / AI",
  risk: "ניהול סיכון",
  setups: "סטאפים",
  emotions: "רגשות",
  chart: "פעולות ותכונות",
};
const LANGNAMES = { he: "עברית", en: "English", es: "Español", pt: "Português", ar: "العربية" };
const TERM_KEYS = new Set(["id", "aliases", "computedIn", "related", "sources", "shownAt", "glossaryOnly", "mustContain", "pendingTranslation", "i18n"]);
const TEXT_KEYS = new Set(["label", "short", "example", "caveat", "longForm"]);
const OPTIONAL_TEXT = ["example", "caveat", "longForm"];
const STRING_ARRAYS = ["aliases", "computedIn", "related", "sources", "shownAt", "pendingTranslation"];
export const PENDING_OK = ["es", "pt", "ar"]; // שלב 5 מרוקן — רק שפות אלה רשאיות להמתין לתרגום

// ── load ─────────────────────────────────────────────────────────────────────
// מחזיר { terms: [{...term, category}], loadErrors: [] }. כשל טעינה הוא שגיאה, ⛔ דילוג.
export async function loadTerms(root) {
  const dir = path.join(root, "src/glossary/terms");
  const loadErrors = [];
  const terms = [];
  const present = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".js")).sort() : [];
  for (const f of present) {
    const cat = f.replace(/\.js$/, "");
    if (!CATEGORIES[cat]) loadErrors.push(`${f}: קטגוריה לא מוכרת (מותר: ${Object.keys(CATEGORIES).join(", ")})`);
  }
  for (const cat of Object.keys(CATEGORIES)) {
    const file = path.join(dir, `${cat}.js`);
    if (!fs.existsSync(file)) { loadErrors.push(`${cat}.js: חסר`); continue; }
    let mod;
    try {
      mod = await import(pathToFileURL(file).href + `?t=${fs.statSync(file).mtimeMs}`);
    } catch (e) {
      loadErrors.push(`${cat}.js: ${e.message}`);
      continue;
    }
    if (!Array.isArray(mod.default) || mod.default.length === 0) {
      loadErrors.push(`${cat}.js: export default אינו מערך לא-ריק`);
      continue;
    }
    for (const t of mod.default) {
      // הקטגוריה = שם הקובץ. מפתח category בתוך מונח היה נדרס בשקט ⇒ שגיאה.
      if (Object.prototype.hasOwnProperty.call(t, "category")) loadErrors.push(`${cat}.js/${t.id}: אין לכתוב category בתוך מונח — הקטגוריה היא שם הקובץ`);
      terms.push({ ...t, category: cat });
    }
  }
  return { terms, loadErrors };
}

// ── validate ─────────────────────────────────────────────────────────────────
// sources: מפתחות מ-src/glossary/sources.js (מועבר מבחוץ כדי שהפונקציה תישאר טהורה).
export function validateTerms(terms, sources = null) {
  const issues = [];
  const ids = new Set(terms.map((t) => t.id));
  const seen = new Map();
  const aliasOwner = new Map();
  for (const t of terms) {
    const where = `${t.category}/${t.id ?? "?"}`;
    if (typeof t.id !== "string" || !/^[A-Za-z][A-Za-z0-9]*$/.test(t.id)) issues.push(`${where}: id לא תקין`);
    if (seen.has(t.id)) issues.push(`${where}: id כפול (גם ב-${seen.get(t.id)})`);
    seen.set(t.id, t.category);
    for (const k of Object.keys(t)) if (k !== "category" && !TERM_KEYS.has(k)) issues.push(`${where}: מפתח לא מוכר "${k}"`);
    for (const k of STRING_ARRAYS) {
      if (t[k] !== undefined && !(Array.isArray(t[k]) && t[k].every((x) => typeof x === "string" && x.length > 0))) {
        issues.push(`${where}: ${k} חייב להיות מערך מחרוזות לא-ריקות`);
      }
    }
    if (t.glossaryOnly !== undefined && !(typeof t.glossaryOnly === "string" && t.glossaryOnly.trim())) issues.push(`${where}: glossaryOnly חייב נימוק`);
    for (const l of t.pendingTranslation ?? []) if (!PENDING_OK.includes(l)) issues.push(`${where}: pendingTranslation רק es/pt/ar (קיבל ${l})`);
    if (sources) for (const k of t.sources ?? []) if (!sources[k]) issues.push(`${where}: מקור לא מוכר "${k}" (src/glossary/sources.js)`);
    for (const k of t.related ?? []) if (!ids.has(k)) issues.push(`${where}: related "${k}" אינו מונח`);
    if (t.aliases && t.category !== "setups") issues.push(`${where}: aliases מותר רק בסטאפים`);
    for (const a of t.aliases ?? []) {
      if (!/^[a-z0-9]+( [a-z0-9]+)*$/.test(a)) issues.push(`${where}: alias "${a}" אינו בצורה מנורמלת`);
      if (aliasOwner.has(a)) issues.push(`${where}: alias "${a}" כבר שייך ל-${aliasOwner.get(a)}`);
      aliasOwner.set(a, t.id);
    }
    if (t.mustContain !== undefined) {
      const ok = t.mustContain && typeof t.mustContain === "object" && Object.entries(t.mustContain)
        .every(([l, arr]) => LANGS.includes(l) && Array.isArray(arr) && arr.every((s) => typeof s === "string" && s));
      if (!ok) issues.push(`${where}: mustContain חייב להיות { lang: [מחרוזות] }`);
    }
    if (!t.i18n || typeof t.i18n !== "object") { issues.push(`${where}: חסר i18n`); continue; }
    for (const k of Object.keys(t.i18n)) if (!LANGS.includes(k)) issues.push(`${where}: שפה לא מוכרת "${k}"`);
    for (const l of LANGS) {
      const x = t.i18n[l];
      if (!x || typeof x !== "object") { issues.push(`${where}.${l}: חסר`); continue; }
      for (const k of Object.keys(x)) if (!TEXT_KEYS.has(k)) issues.push(`${where}.${l}: מפתח לא מוכר "${k}"`);
      for (const k of ["label", "short"]) if (!(typeof x[k] === "string" && x[k].trim())) issues.push(`${where}.${l}.${k}: חסר או ריק`);
      for (const k of OPTIONAL_TEXT) if (x[k] !== undefined && !(typeof x[k] === "string" && x[k].trim())) issues.push(`${where}.${l}.${k}: חייב להיות מחרוזת לא-ריקה או להיעדר`);
    }
  }
  return issues;
}

// ── build ────────────────────────────────────────────────────────────────────
const json = (o) => JSON.stringify(o, null, 2) + "\n";

export function sourceHashOf(terms) {
  return crypto.createHash("sha256").update(JSON.stringify(terms)).digest("hex").slice(0, 16);
}

// מחזיר { relPath: content } — טהור; ה-CLI כותב, השער משווה.
export function buildArtifacts(terms) {
  const sourceHash = sourceHashOf(terms);
  const files = {};

  const inline = { sourceHash, terms: {}, setupAliases: {} };
  for (const t of terms) {
    inline.terms[t.id] = { category: t.category, label: Object.fromEntries(LANGS.map((l) => [l, t.i18n[l].label])) };
    for (const a of t.aliases ?? []) inline.setupAliases[a] = t.id;
  }
  files["src/glossary/generated/inline.json"] = json(inline);

  for (const l of LANGS) {
    const short = { sourceHash, lang: l, terms: {} };
    const long = { sourceHash, lang: l, terms: {} };
    for (const t of terms) {
      const x = t.i18n[l];
      short.terms[t.id] = Object.fromEntries(["short", "example", "caveat"].filter((k) => x[k] !== undefined).map((k) => [k, x[k]]));
      if (x.longForm !== undefined) long.terms[t.id] = x.longForm;
    }
    files[`src/glossary/generated/short.${l}.json`] = json(short);
    files[`src/glossary/generated/long.${l}.json`] = json(long);
  }

  const copy = { _meta: { sourceHash, generatedBy: "scripts/build-glossary.mjs", source: "src/glossary/terms/" } };
  for (const t of terms) {
    copy[t.id] = {
      label: Object.fromEntries(LANGS.map((l) => [l, t.i18n[l].label])),
      description: Object.fromEntries(LANGS.map((l) => [l, compose(t.i18n[l])])),
    };
  }
  files["src/data/glossary.json"] = json(copy);

  let md = `# 📘 SwingEdge — מילון מונחים · 5 שפות\n\n`;
  md += `> ⛔ קובץ מחולל — אל תערוך. המקור: \`src/glossary/terms/\` · הרץ \`npm run glossary\`.\n`;
  md += `> sourceHash \`${sourceHash}\` · **${terms.length} מונחים** · 5 שפות (עברית · English · Español · Português · العربية).\n\n---\n\n## תוכן עניינים\n`;
  for (const [cat, title] of Object.entries(CATEGORIES)) md += `- **${title}** (${terms.filter((t) => t.category === cat).length})\n`;
  md += `\n---\n`;
  for (const [cat, title] of Object.entries(CATEGORIES)) {
    md += `\n## ${title}\n`;
    for (const t of terms.filter((x) => x.category === cat)) {
      const he = t.i18n.he.label, en = t.i18n.en.label;
      md += `\n### \`${t.id}\` — ${en}${he !== en ? ` · ${he}` : ""}\n\n| שפה | הסבר |\n|---|---|\n`;
      for (const l of LANGS) md += `| **${LANGNAMES[l]}** | ${compose(t.i18n[l]).replace(/\n/g, "<br>").replace(/\|/g, "\\|")} |\n`;
    }
  }
  files["docs/SwingEdge-Terms-Glossary.md"] = md;
  return { sourceHash, files };
}

// ── CLI ──────────────────────────────────────────────────────────────────────
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(fileURLToPath(import.meta.url), "../..");
  const { terms, loadErrors } = await loadTerms(root);
  const sources = (await import(pathToFileURL(path.join(root, "src/glossary/sources.js")).href)).default;
  const issues = [...loadErrors, ...validateTerms(terms, sources)];
  if (issues.length) {
    console.error(`❌ build-glossary: ${issues.length} בעיות — לא נכתב דבר\n  ` + issues.join("\n  "));
    process.exit(1);
  }
  const { sourceHash, files } = buildArtifacts(terms);
  fs.mkdirSync(path.join(root, "src/glossary/generated"), { recursive: true });
  for (const [rel, content] of Object.entries(files)) fs.writeFileSync(path.join(root, rel), content);
  console.log(`✅ glossary: ${terms.length} מונחים · ${Object.keys(files).length} קבצים · sourceHash ${sourceHash}`);
}
