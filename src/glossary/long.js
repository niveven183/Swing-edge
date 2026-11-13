// src/glossary/long.js — the long text (longForm) + language-free facts, for the glossary DIALOG only.
// ⛔ Imported only by src/components/GlossaryBody.jsx, which is itself loaded with import() —
// so none of this enters the main chunk (test:glossary R8). The bubble reads src/glossary/index.js.
import longHe from "./generated/long.he.json" with { type: "json" };
import longEn from "./generated/long.en.json" with { type: "json" };
import longEs from "./generated/long.es.json" with { type: "json" };
import longPt from "./generated/long.pt.json" with { type: "json" };
import longAr from "./generated/long.ar.json" with { type: "json" };
import meta from "./generated/meta.json" with { type: "json" };
import SOURCES from "./sources.js";

const LONG = { he: longHe, en: longEn, es: longEs, pt: longPt, ar: longAr };

/** longForm in `lang`; null when the term has none in that language (es/pt/ar until wave 3 step 5). */
export function longText(id, lang) {
  return (LONG[lang] ?? LONG.en).terms[id] ?? null;
}
/** { sources: [{key,title,url,verified}], related: [id], computedIn: [..], glossaryOnly } */
export function termMeta(id) {
  const m = meta.terms[id] ?? {};
  return { ...m, sources: (m.sources ?? []).map((key) => ({ key, ...SOURCES[key] })) };
}
