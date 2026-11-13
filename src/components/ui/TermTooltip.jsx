import InfoTooltip from './InfoTooltip.jsx';
import { termText, termLabel } from '../../glossary/index.js';
import { glossaryUi, openGlossary } from '../../glossary/ui.js';
import { isRTLLang } from '../../i18n.js';

// Thin, lang-aware wrapper over the accessible InfoTooltip primitive.
// Reads copy from the central glossary (single source: src/glossary/terms → generated/).
// Usage: <TermTooltip term="rr" lang={lang} />  or  <TermTooltip term="rr" lang={lang}>R/R</TermTooltip>
// The bubble ends with "עוד במילון ›", which opens the glossary dialog on this term (wave 3).
export default function TermTooltip({ term, lang = 'he', label, children }) {
  const desc = termText(term, lang) ?? '';
  const heading = label ?? termLabel(term, lang);

  if (!desc) return children ?? null;

  // Resolve direction from the active language (he/ar = RTL; en/es/pt = LTR),
  // not a hard-coded assumption — keeps copy readable for every language.
  const dir = isRTLLang(lang) ? 'rtl' : 'ltr';
  const ui = glossaryUi(lang);

  // Accessible name for the "?" trigger: keep the (often proper-noun) term but
  // translate the wrapper so RTL screen-reader users don't hear English.
  const triggerLabel = heading
    ? (dir === 'rtl' ? `מידע על ${heading}` : `More info: ${heading}`)
    : (dir === 'rtl' ? 'מידע נוסף' : 'More info');

  return (
    <>
      {children != null && <span>{children}</span>}
      <InfoTooltip label={triggerLabel} closeLabel={ui.close} dir={dir}>
        {({ close }) => (
          <div lang={lang} dir={dir} style={{ direction: dir, textAlign: 'start' }}>
            {heading && (
              <div className="font-bold text-emerald-600 dark:text-emerald-400 mb-1.5 text-[13px]">
                {heading}
              </div>
            )}
            <div className="whitespace-pre-line">{desc}</div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); close(); openGlossary(term); }}
              className="mt-2 text-[12px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded"
            >
              {ui.more}
            </button>
          </div>
        )}
      </InfoTooltip>
    </>
  );
}
