// ─────────────────────────────────────────────────────────────────────────────
// Trade context options — SINGLE SOURCE OF TRUTH
// Setup / Market Condition / Emotion. The `value` strings are canonical and
// load-bearing: DecisionCoach, MarketRegime, cleanTrades/purgeInvalidTrades,
// VALID_EMOTIONS and the journal all compare against them. Never change a value.
// Consumed by SmartSelect via getTradeSelectProps() in Log, Analyze and Edit.
// ─────────────────────────────────────────────────────────────────────────────
import TradeGraph from "../components/ui/setupGraphs.jsx";

// tone → semantic color, sourced from design tokens.
export const TONE_COLOR = {
  bull:    "var(--accent-emerald)",
  bear:    "var(--accent-rose)",
  caution: "var(--accent-amber)",
  neutral: "var(--text-tertiary)",
};

// Emotion dots need 8 distinct hues — more than the 4 semantic tokens provide.
// Token values are used where one exists; teal/blue/orange/darkRed are
// centralized HERE (one place, per the "no scattered hardcodes" rule).
const EMO = {
  green:   "var(--accent-emerald)",
  teal:    "#14B8A6",
  blue:    "var(--accent-indigo)",
  slate:   "var(--text-tertiary)",
  amber:   "var(--accent-amber)",
  orange:  "#FB923C",
  red:     "var(--accent-rose)",
  darkRed: "#9F1239",
};

export const SETUP_OPTIONS = [
  { value: "Breakout",         tone: "bull",    explain: { en: "Price breaks key resistance on rising volume.",     he: "מחיר פורץ מעל התנגדות מרכזית עם נפח." } },
  { value: "Pullback",         tone: "bull",    explain: { en: "Uptrend dips to support, then resumes higher.",     he: "מגמת עלייה נסוגה לתמיכה וממשיכה מעלה." } },
  { value: "Support Bounce",   tone: "bull",    explain: { en: "Price rejects a support level and turns up.",       he: "מחיר נבלם ברמת תמיכה ומתהפך כלפי מעלה." } },
  { value: "Resistance Break", tone: "bull",    explain: { en: "Breaks above one specific prior resistance level.", he: "פריצה מעל רמת התנגדות ספציפית קודמת." } },
  { value: "Other",            tone: "neutral", explain: { en: "A setup outside the standard categories.",          he: "סטאפ שאינו נכלל בקטגוריות הסטנדרטיות." } },
];

export const MARKET_OPTIONS = [
  { value: "Trending Up",   tone: "bull",    explain: { en: "Higher highs and higher lows — longs favored.",    he: "שיאים ושפלים עולים — עדיפות ללונג." } },
  { value: "Trending Down", tone: "bear",    explain: { en: "Lower highs and lower lows — shorts favored.",     he: "שיאים ושפלים יורדים — עדיפות לשורט." } },
  { value: "Sideways",      tone: "neutral", explain: { en: "No trend; ranging between support and resistance.", he: "ללא מגמה; נע בטווח בין תמיכה להתנגדות." } },
  { value: "Volatile",      tone: "caution", explain: { en: "Sharp two-way swings — size down, stops vulnerable.", he: "תנודות חדות לשני הכיוונים — הקטן פוזיציה." } },
];

export const EMOTION_OPTIONS = [
  { value: "Confident", emoji: "😎", dot: EMO.green,   explain: { en: "Grounded conviction from a valid setup — execute cleanly.", he: "ביטחון מבוסס setup תקף — בצע בצורה נקייה." } },
  { value: "Calm",      emoji: "😌", dot: EMO.teal,    explain: { en: "The ideal state — follow the plan, no chasing.",          he: "המצב האידיאלי — עקוב אחר התוכנית, בלי מרדף." } },
  { value: "Patient",   emoji: "⏳", dot: EMO.blue,    explain: { en: "Waiting only for setups that meet your criteria.",        he: "ממתין רק ל-setups שעומדים בקריטריונים שלך." } },
  { value: "Neutral",   emoji: "😐", dot: EMO.slate,   explain: { en: "No emotional charge — a stable, objective baseline.",     he: "ללא מטען רגשי — בסיס יציב ואובייקטיבי." } },
  { value: "Hesitant",  emoji: "😕", dot: EMO.amber,   explain: { en: "Unclear setup or low confidence — you enter late.",       he: "setup לא ברור או ביטחון נמוך — כניסה מאוחרת." } },
  { value: "Nervous",   emoji: "😰", dot: EMO.orange,  explain: { en: "Tension clouds judgment — often the position's too large.", he: "מתח מעיב על שיקול הדעת — לרוב פוזיציה גדולה." } },
  { value: "FOMO",      emoji: "🤑", dot: EMO.red,     explain: { en: "Chasing a sharp move with no valid setup.",              he: "מרדף אחרי תנועה חדה בלי setup תקף." } },
  { value: "Angry",     emoji: "😤", dot: EMO.darkRed, explain: { en: "Revenge-trading fuel after a loss — stop now.",           he: "דלק למסחר נקמה אחרי הפסד — עצור עכשיו." } },
];

// Value arrays — import these instead of re-declaring literals anywhere.
export const SETUP_VALUES   = SETUP_OPTIONS.map((o) => o.value);
export const MARKET_VALUES  = MARKET_OPTIONS.map((o) => o.value);
export const EMOTION_VALUES = EMOTION_OPTIONS.map((o) => o.value);

// Category "?" copy (bilingual) — rendered by SmartSelect next to the label.
export const CATEGORY_TOOLTIP = {
  setup:   { en: "The chart pattern or trigger behind your entry.", he: "התבנית או הטריגר שמאחורי הכניסה שלך." },
  market:  { en: "The broader trend context while you entered.",    he: "הקשר המגמה הרחב בזמן הכניסה." },
  emotion: { en: "Your emotional state at the moment of entry.",    he: "המצב הרגשי שלך ברגע הכניסה." },
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
    return { graph, title: v, explainer: pick(o.explain) };
  };

  return { options, renderThumb, renderPreview };
}
