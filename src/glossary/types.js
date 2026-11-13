// src/glossary/types.js — JSDoc בלבד; אין קוד ריצה.
// המבנה שכל קובץ ב-src/glossary/terms/ מייצא. נאכף ב-test:glossary (מפתח לא מוכר = אדום).

/**
 * @typedef {"he"|"en"|"es"|"pt"|"ar"} GlossaryLang
 */

/**
 * @typedef {Object} GlossaryText
 * @property {string} label      כותרת המונח (מוצגת בראש הבועה וב-aria-label של ה-"?")
 * @property {string} short      ההגדרה המוצגת בבועה
 * @property {string} [example]  "לדוגמה: …" — מספרים היפותטיים בלבד
 * @property {string} [caveat]   הסתייגות אחת לכל היותר
 * @property {string} [longForm] הטקסט המלא — נטען רק במודאל המילון
 */

/**
 * @typedef {Object} GlossaryTerm
 * @property {string} id                       מזהה יציב (camelCase); הקטגוריה = שם הקובץ
 * @property {string[]} [aliases]              סטאפים בלבד: שמות תצוגה מנורמלים ⇒ resolveSetupKey
 * @property {string[]} [computedIn]           file:line של החישוב שהטקסט מתאר
 * @property {string[]} [related]              מזהי מונחים קשורים
 * @property {string[]} [sources]              מפתחות מקור (THARP, SHARPE, ELDER…)
 * @property {string[]} [shownAt]              איפה ה-"?" מוצג
 * @property {string} [glossaryOnly]           נימוק כשאין מסך שמציג את הערך
 * @property {Object<string, string[]>} [mustContain]  lang ⇒ מחרוזות שחייבות להופיע בטקסט המוצג
 * @property {Record<GlossaryLang, GlossaryText>} i18n
 */

export {};
