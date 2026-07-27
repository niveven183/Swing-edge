// ─────────────────────────────────────────────────────────────────────────────
// Trade context options — the React-facing half.
// The canonical `value` strings live in ./tradeEnums.js (pure data, Node-
// importable) and are re-exported here unchanged, so every existing
// `from "./tradeOptions.jsx"` import keeps working.
// This file owns only what needs JSX: getTradeSelectProps() for SmartSelect.
// ─────────────────────────────────────────────────────────────────────────────
import TradeGraph from "../components/ui/setupGraphs.jsx";
import { labelFor } from "../i18n.js";
import {
  TONE_COLOR,
  SETUP_OPTIONS,
  MARKET_OPTIONS,
  EMOTION_OPTIONS,
  SETUP_VALUES,
  MARKET_VALUES,
  EMOTION_VALUES,
  CATEGORY_TOOLTIP,
} from "./tradeEnums.js";

export {
  TONE_COLOR,
  SETUP_OPTIONS,
  MARKET_OPTIONS,
  EMOTION_OPTIONS,
  SETUP_VALUES,
  MARKET_VALUES,
  EMOTION_VALUES,
  CATEGORY_TOOLTIP,
};

const BY_KIND = { setup: SETUP_OPTIONS, market: MARKET_OPTIONS, emotion: EMOTION_OPTIONS };

// Builds the { options, renderThumb, renderPreview } bundle a SmartSelect needs.
// `kind`: "setup" | "market" | "emotion". `lang`: active UI language.
export function getTradeSelectProps(kind, lang = "en") {
  const options = BY_KIND[kind] || [];
  const map = Object.fromEntries(options.map((o) => [o.value, o]));
  const isEmotion = kind === "emotion";
  const pick = (obj) => obj[lang] || obj.en;

  const renderThumb = (v) => {
    const o = map[v];
    if (!o) return null;
    if (isEmotion) {
      return (
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" style={{ fontSize: 16, lineHeight: 1 }}>{o.emoji}</span>
          <span aria-hidden="true" className="rounded-full" style={{ width: 6, height: 6, background: o.dot, flexShrink: 0 }} />
        </span>
      );
    }
    return <TradeGraph value={v} size={22} color={TONE_COLOR[o.tone]} />;
  };

  const renderPreview = (v) => {
    const o = map[v];
    if (!o) return null;
    const graph = isEmotion
      ? <span aria-hidden="true" style={{ fontSize: 52, lineHeight: 1 }}>{o.emoji}</span>
      : <TradeGraph value={v} size={132} color={TONE_COLOR[o.tone]} />;
    return { graph, title: labelFor(kind, v, lang), explainer: pick(o.explain) };
  };

  // Display-only localized label for a stored option value (fail-open to value).
  const getOptionLabel = (v) => labelFor(kind, v, lang);

  return { options, renderThumb, renderPreview, getOptionLabel };
}
