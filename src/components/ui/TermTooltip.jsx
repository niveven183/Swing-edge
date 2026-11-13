import InfoTooltip from './InfoTooltip.jsx';
import { termText, termLabel } from '../../glossary/index.js';
import { isRTLLang } from '../../i18n.js';

// Thin, lang-aware wrapper over the accessible InfoTooltip primitive.
// Reads copy from the central glossary (single source: src/glossary/terms → generated/).
// Usage: <TermTooltip term="rr" lang={lang} />  or  <TermTooltip term="rr" lang={lang}>R/R</TermTooltip>
export default function TermTooltip({ term, lang = 'he', label, children }) {
  const desc = termText(term, lang) ?? '';
  const heading = label ?? termLabel(term, lang);

  if (!desc) return children ?? null;

  // Resolve direction from the active language (he/ar = RTL; en/es/pt = LTR),
  // not a hard-coded assumption — keeps copy readable for every language.
  const dir = isRTLLang(lang) ? 'rtl' : 'ltr';

  // Accessible name for the "?" trigger: keep the (often proper-noun) term but
  // translate the wrapper so RTL screen-reader users don't hear English.
  const triggerLabel = heading
    ? (dir === 'rtl' ? `מידע על ${heading}` : `More info: ${heading}`)
    : (dir === 'rtl' ? 'מידע נוסף' : 'More info');

  return (
    <>
      {children != null && <span>{children}</span>}
      <InfoTooltip label={triggerLabel}>
        <div lang={lang} dir={dir} style={{ direction: dir, textAlign: 'start' }}>
          {heading && (
            <div className="font-bold text-emerald-600 dark:text-emerald-400 mb-1.5 text-[13px]">
              {heading}
            </div>
          )}
          <div className="whitespace-pre-line">{desc}</div>
        </div>
      </InfoTooltip>
    </>
  );
}
