import InfoTooltip from './InfoTooltip.jsx';
import { TRADING_TOOLTIPS, TERM_LABELS } from '../../data/tooltips.js';
import { isRTLLang } from '../../i18n.js';

// Thin, lang-aware wrapper over the accessible InfoTooltip primitive.
// Reads copy from the central glossary (single source: data/tooltips.js).
// Usage: <TermTooltip term="rr" lang={lang} />  or  <TermTooltip term="rr" lang={lang}>R/R</TermTooltip>
export default function TermTooltip({ term, lang = 'he', label, children }) {
  const entry = TRADING_TOOLTIPS[term];
  const desc = entry ? (entry[lang] || entry.en) : '';
  const heading = label ?? (TERM_LABELS[term]?.[lang] || TERM_LABELS[term]?.en);

  if (!desc) return children ?? null;

  // Resolve direction from the active language (he/ar = RTL; en/es/pt = LTR),
  // not a hard-coded assumption — keeps copy readable for every language.
  const dir = isRTLLang(lang) ? 'rtl' : 'ltr';

  return (
    <>
      {children != null && <span>{children}</span>}
      <InfoTooltip label={heading || term}>
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
