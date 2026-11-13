// src/glossary/index.js — נקודת הייבוא היחידה של טקסט המונחים באפליקציה.
// קורא רק קבצים מחוללים (scripts/build-glossary.mjs). המקור: src/glossary/terms/.
//
// ⛔ long.<lang>.json לא מיובא מכאן — הוא שייך למודאל המילון בלבד (צ'אנק נפרד).
// 🔁 short.<lang>.json מיובאים סטטית בגל 3; טעינה לפי שפה = B-474 (גל 7).

import inline from "./generated/inline.json" with { type: "json" };
import shortHe from "./generated/short.he.json" with { type: "json" };
import shortEn from "./generated/short.en.json" with { type: "json" };
import shortEs from "./generated/short.es.json" with { type: "json" };
import shortPt from "./generated/short.pt.json" with { type: "json" };
import shortAr from "./generated/short.ar.json" with { type: "json" };
import { composeShort, normalizeSetupName } from "./compose.js";

const SHORT = { he: shortHe, en: shortEn, es: shortEs, pt: shortPt, ar: shortAr };

export const GLOSSARY_LANGS = Object.keys(SHORT);

export function hasTerm(id) {
  return Object.prototype.hasOwnProperty.call(inline.terms, id);
}

// הטקסט המוצג בבועה. שפה שאינה אחת מחמש ⇒ אנגלית (כמו `entry[lang] || entry.en` הישן).
// מונח לא קיים ⇒ null. בחמש השפות כל מונח קיים — test:glossary אוכף.
export function termText(id, lang) {
  if (!hasTerm(id)) return null;
  const table = SHORT[lang] ?? SHORT.en;
  const parts = table.terms[id];
  return parts ? composeShort(parts) : null;
}

export function termLabel(id, lang) {
  const label = inline.terms[id]?.label;
  return label?.[lang] || label?.en;
}

// שם סטאפ כפי שמוצג במטריצה ⇒ מזהה מונח, או null כשאין (ואז לא מרונדר "?").
export function resolveSetupKey(displayName) {
  if (!displayName) return null;
  const key = inline.setupAliases[normalizeSetupName(displayName)];
  return key && hasTerm(key) ? key : null;
}
