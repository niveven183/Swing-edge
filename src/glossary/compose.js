// src/glossary/compose.js — חוק ההרכבה היחיד של הטקסט המוצג בבועה.
// טהור (בלי ייבוא JSON) ⇒ אותה פונקציה רצה באפליקציה, במחולל ובשערים.

/** @param {{short: string, example?: string, caveat?: string}} parts */
export function composeShort(parts) {
  return [parts.short, parts.example, parts.caveat].filter(Boolean).join("\n");
}

// שם תצוגה של סטאפ ⇒ הצורה המנורמלת שב-aliases (אותה לוגיקה שהייתה ב-src/data/tooltips.js).
export function normalizeSetupName(name) {
  return String(name)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}
