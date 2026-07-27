// ─────────────────────────────────────────────────────────────────────────────
// Trade context enums — SINGLE SOURCE OF TRUTH (pure data, no JSX)
// Setup / Market Condition / Emotion. The `value` strings are canonical and
// load-bearing: DecisionCoach, MarketRegime, cleanTrades/purgeInvalidTrades,
// VALID_EMOTIONS and the journal all compare against them. Never change a value.
//
// Lives in a .js file (not .jsx) so plain Node can import it — `cleanTrades`
// and its test need EMOTION_VALUES without pulling in React.
// `tradeOptions.jsx` re-exports every name here; import from either.
// ─────────────────────────────────────────────────────────────────────────────

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
