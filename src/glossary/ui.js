// src/glossary/ui.js — the glossary's own UI strings (bubble + dialog), 5 languages, one place.
// Event bus: any "?" can open the glossary dialog on a term without a prop chain through the app.

export const GLOSSARY_UI = {
  he: { title: "מילון מונחים", more: "עוד במילון ›", close: "סגור", search: "חיפוש מונח", loading: "טוען את המילון…", none: "אין מונח כזה", sources: "מקורות", calc: "איך מחושב" },
  en: { title: "Glossary", more: "More in glossary ›", close: "Close", search: "Search a term", loading: "Loading the glossary…", none: "No such term", sources: "Sources", calc: "How it is computed" },
  es: { title: "Glosario", more: "Más en el glosario ›", close: "Cerrar", search: "Buscar un término", loading: "Cargando el glosario…", none: "No hay tal término", sources: "Fuentes", calc: "Cómo se calcula" },
  pt: { title: "Glossário", more: "Mais no glossário ›", close: "Fechar", search: "Pesquisar um termo", loading: "A carregar o glossário…", none: "Nenhum termo assim", sources: "Fontes", calc: "Como é calculado" },
  ar: { title: "المسرد", more: "المزيد في المسرد ›", close: "إغلاق", search: "ابحث عن مصطلح", loading: "جارٍ تحميل المسرد…", none: "لا يوجد مصطلح كهذا", sources: "المصادر", calc: "كيف يُحسب" },
};
export const glossaryUi = (lang) => GLOSSARY_UI[lang] ?? GLOSSARY_UI.en;

const EVENT = "swingedge:glossary-open";
/** Open the glossary dialog; `id` = the term to land on ("" = the index). */
export function openGlossary(id = "") {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { id } }));
}
/** Subscribe (App only). Returns the unsubscribe. */
export function onGlossaryOpen(fn) {
  const h = (e) => fn(e.detail?.id ?? "");
  window.addEventListener(EVENT, h);
  return () => window.removeEventListener(EVENT, h);
}

// Category headings in the dialog (category = the source file name). es/pt/ar fall back to English until step 5.
const CATS = {
  he: { performance: "מדדי ביצוע", analytics: "אנליטיקס", metrics: "מדדים נוספים", concepts: "מושגים", risk: "ניהול סיכון", setups: "סטאפים", emotions: "רגשות", chart: "פעולות ותכונות" },
  en: { performance: "Performance", analytics: "Analytics", metrics: "More metrics", concepts: "Concepts", risk: "Risk management", setups: "Setups", emotions: "Emotions", chart: "Actions & features" },
};
export const glossaryCategory = (cat, lang) => (CATS[lang] ?? CATS.en)[cat] ?? cat;
