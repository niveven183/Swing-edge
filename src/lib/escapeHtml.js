// src/lib/escapeHtml.js — the one escape for HTML built from a string (B-456, wave 1 F1).
//
// 🔴 MEASURED 28.10 (WAVE1-DIAGNOSIS §F1): exportMonthlyPDF interpolated `lessonLearned` and
// `setup` raw into a document written with `window.open("", "_blank")` + `document.write`. The
// popup inherits the app's origin: `<img src=x onerror=…>` in a lesson ran, read the Supabase
// token from localStorage and wrote it into `window.opener`. The CSP is Report-Only.
//
// DECISIONS 28.10: every value that reaches HTML through a string template is escaped here.
// `&` first, so an existing entity is not double-decoded into markup.
export function escapeHtml(value) {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
