// tests-eye/labels.js — every UI string this suite clicks or waits for, DERIVED
// from src/i18n.js across ALL languages, ⛔ hand-typed.
//
// A hand-typed label is a silent blind spot the day the copy changes: a toast
// pattern that no longer matches makes "no error toast appeared" (step a) green
// forever. So a key missing in any language is a HARD failure here (B-272), ⛔
// a skip, and the patterns follow the copy wherever it moves.

import translations, { LANGUAGES } from "../src/i18n.js";

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Every language's value for `key`. Throws when any language lacks it. */
export function allLangs(key) {
  const out = [];
  for (const { code } of LANGUAGES) {
    const v = translations[code]?.[key];
    if (typeof v !== "string" || v.trim() === "") {
      throw new Error(`[labels] i18n key "${key}" is missing in "${code}" — refusing to build a pattern that cannot match that UI (B-272).`);
    }
    out.push(v);
  }
  return [...new Set(out)];
}

/** Exact accessible-name matcher across languages (whitespace-trimmed). */
export const exactRx = (key) => new RegExp(`^\\s*(?:${allLangs(key).map(esc).join("|")})\\s*$`);
/** Substring matcher across languages. */
export const containsRx = (key) => new RegExp(allLangs(key).map(esc).join("|"));

// The three playbook toasts (SwingEdge_App.jsx savePlaybook / handlePlaybookImageUpload).
export const TOAST_KEYS = ["playbookImageNotSaved", "playbookNotSaved", "playbookImageFailed"];
export const TOAST_TEXTS = TOAST_KEYS.flatMap(allLangs);
