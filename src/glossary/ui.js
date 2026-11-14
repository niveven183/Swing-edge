// src/glossary/ui.js — the glossary's own UI strings (bubble + dialog), 5 languages, one place.
// Event bus: any "?" can open the glossary dialog on a term without a prop chain through the app.

export const GLOSSARY_UI = {
  he: { title: "מילון מונחים", more: "עוד במילון ›", close: "סגור", search: "חיפוש מונח", loading: "טוען את המילון…", none: "אין מונח כזה", sources: "מקורות", calc: "איך מחושב" },
  en: { title: "Glossary", more: "More in glossary ›", close: "Close", search: "Search a term", loading: "Loading the glossary…", none: "No such term", sources: "Sources", calc: "How it is computed" },
  es: { title: "Glosario", more: "Más en el glosario ›", close: "Cerrar", search: "Buscar un término", loading: "Cargando el glosario…", none: "No hay tal término", sources: "Fuentes", calc: "Cómo se calcula" },
  pt: { title: "Glossário", more: "Mais no glossário ›", close: "Fechar", search: "Pesquise um termo", loading: "Carregando o glossário…", none: "Nenhum termo encontrado", sources: "Fontes", calc: "Como é calculado" },
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

// Category headings in the dialog (category = the source file name). A missing language falls back to English.
const CATS = {
  he: { performance: "מדדי ביצוע", analytics: "אנליטיקס", metrics: "מדדים נוספים", concepts: "מושגים", risk: "ניהול סיכון", setups: "סטאפים", emotions: "רגשות", chart: "פעולות ותכונות" },
  en: { performance: "Performance", analytics: "Analytics", metrics: "More metrics", concepts: "Concepts", risk: "Risk management", setups: "Setups", emotions: "Emotions", chart: "Actions & features" },
  es: { performance: "Rendimiento", analytics: "Analítica", metrics: "Más métricas", concepts: "Conceptos", risk: "Gestión del riesgo", setups: "Setups", emotions: "Emociones", chart: "Acciones y funciones" },
  pt: { performance: "Desempenho", analytics: "Análises", metrics: "Mais métricas", concepts: "Conceitos", risk: "Gestão de risco", setups: "Setups", emotions: "Emoções", chart: "Ações e recursos" },
  ar: { performance: "الأداء", analytics: "التحليلات", metrics: "مقاييس إضافية", concepts: "مفاهيم", risk: "إدارة المخاطر", setups: "السيناريوهات", emotions: "المشاعر", chart: "الإجراءات والميزات" },
};
export const glossaryCategory = (cat, lang) => (CATS[lang] ?? CATS.en)[cat] ?? cat;
