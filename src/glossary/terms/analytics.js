// src/glossary/terms/analytics.js — אנליטיקס — גרפים וכרטיסי תובנה
// ⛔ מקור האמת היחיד למונחים האלה. עריכה כאן ⇒ `npm run glossary` באותו קומיט (test:glossary תופס סחיפה).
// פורמט (גל 3): short = הגדרה במשפט אחד ≤18 מילים · example = "לדוגמה:"/"Example:" במספרים היפותטיים · caveat אחד לכל היותר · longForm = הטקסט המלא (מודאל המילון).
// pendingTranslation: es/pt/ar עדיין בטקסט הישן — שלב 5.

/** @type {import("../types.js").GlossaryTerm[]} */
export default [
  {
    id: "streakHistory",
    computedIn: ["src/lib/tradingStats.js"],
    related: ["winStreak"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · גרף"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "היסטוריית רצפים",
        short: "רצפי הרווחים וההפסדים שלך לפי סדר הזמן, כל רצף כעמודה.",
        example: "לדוגמה: 3 רווחים ואחריהם 2 הפסדים ⇒ שתי עמודות, 3 ו-2.",
        longForm: "תיעוד רצפי הרווחים וההפסדים שלך לאורך זמן, מאותו מעבר כרונולוגי שמחשב את הרצף הנוכחי. הוא חושף דפוסים: האם רצף הפסדים גורם לך לסחור גרוע יותר (Tilt), או שאתה חוזר למשמעת.",
      },
      en: {
        label: "Streak History",
        short: "Your winning and losing streaks in time order, one bar per streak.",
        example: "Example: 3 wins then 2 losses ⇒ two bars, 3 and 2.",
        longForm: "A record of your winning and losing streaks over time, from the same chronological pass that computes the current streak. It reveals patterns: does a losing streak make you trade worse (Tilt), or do you return to discipline.",
      },
      es: {
        label: "Streak History",
        short: "Un registro de tus rachas ganadoras y perdedoras a lo largo del tiempo. Revela patrones emocionales: ¿una racha perdedora te hace operar peor (tilt) o te recuperas con disciplina?",
      },
      pt: {
        label: "Streak History",
        short: "Um registo das suas sequências de vitórias e derrotas ao longo do tempo. Revela padrões emocionais: uma sequência de perdas faz você operar pior (tilt), ou você recupera com disciplina?",
      },
      ar: {
        label: "Streak History",
        short: "سجلّ لسلاسل انتصاراتك وخسائرك عبر الزمن. يكشف الأنماط العاطفية: هل تجعلك سلسلة الخسائر تتداول بشكل أسوأ (tilt)، أم تتعافى بانضباط؟",
      },
    },
  },
  {
    id: "dayOfWeek",
    computedIn: ["src/lib/tradingStats.js:488"],
    related: ["bestDay"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · גרף"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "רווח/הפסד לפי יום בשבוע",
        short: "ה-P&L המצטבר לפי היום בשבוע שבו נכנסת לעסקה.",
        example: "לדוגמה: עסקה שנפתחה בשני ונסגרה ברביעי נספרת לשני.",
        longForm: "הרווח/הפסד שלך מחולק לפי ימי השבוע, לפי יום הכניסה לעסקה (לא יום הסגירה). הוא מראה באילו ימים אתה עקבית מרוויח או מפסיד — בדוק כמה עסקאות יש בכל יום לפני שאתה מסיק מסקנה.",
      },
      en: {
        label: "P&L by Day of Week",
        short: "Cumulative P&L by the weekday you entered the trade.",
        example: "Example: a trade opened Monday and closed Wednesday counts for Monday.",
        longForm: "Your profit/loss broken down by day of the week, by entry day (not exit day). It shows which days you consistently make or lose money — check how many trades sit on each day before drawing a conclusion.",
      },
      es: {
        label: "G/P por Día de la Semana",
        short: "Tu ganancia/pérdida desglosada por día de la semana. Revela en qué días ganas o pierdes dinero de forma consistente — muchos traders tienen un edge oculto (o una fuga) ligado a días concretos como lunes o viernes.",
      },
      pt: {
        label: "L/P por Dia da Semana",
        short: "O teu lucro/perda discriminado por dia da semana. Revela em que dias ganhas ou perdes dinheiro de forma consistente — muitos traders têm um edge oculto (ou uma fuga) ligado a dias específicos como segundas ou sextas.",
      },
      ar: {
        label: "الربح/الخسارة حسب يوم الأسبوع",
        short: "أرباحك/خسائرك موزّعة حسب أيام الأسبوع. تكشف في أي الأيام تربح أو تخسر باستمرار — كثير من المتداولين لديهم أفضلية خفية (أو تسريب) مرتبط بأيام محدّدة كالإثنين أو الجمعة.",
      },
    },
  },
  {
    id: "performanceBySetup",
    computedIn: ["src/lib/tradingStats.js"],
    related: ["setupMatrix", "edge"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · כרטיסי סטאפ"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "ביצועים לפי סטאפ",
        short: "כרטיס לכל סטאפ שסחרת: מספר עסקאות, אחוז הצלחה ו-R כולל.",
        example: "לדוגמה: Breakout · 8 עסקאות · 50% · \u200e+4R.",
        longForm: "פירוט של כל setup שאתה סוחר — אחוז הצלחה, R כולל ומספר עסקאות, ממוין לפי מספר העסקאות. מראה במבט אחד אילו סטאפים נושאים את החשבון שלך ואילו מנקזים אותו.",
      },
      en: {
        label: "Performance by Setup",
        short: "One card per setup you traded: trade count, win rate and total R.",
        example: "Example: Breakout · 8 trades · 50% · +4R.",
        longForm: "A breakdown of every setup you trade — win rate, total R and number of trades, sorted by trade count. Shows at a glance which setups carry your account and which drain it.",
      },
      es: {
        label: "Rendimiento por Setup",
        short: "Un desglose de cada setup que operas — win rate, R total y número de operaciones. Muestra de un vistazo qué setups sostienen tu cuenta y cuáles la drenan. Tus edges y anti-edges, lado a lado.",
      },
      pt: {
        label: "Desempenho por Setup",
        short: "Uma discriminação de cada setup que operas — win rate, R total e número de operações. Mostra num relance quais setups sustentam a tua conta e quais a drenam. Os teus edges e anti-edges, lado a lado.",
      },
      ar: {
        label: "الأداء حسب السيناريو",
        short: "تفصيل لكل setup تتداوله — نسبة الربح، إجمالي R، وعدد الصفقات. يُظهر بنظرة واحدة أي النماذج تحمل حسابك وأيّها يستنزفه. أفضلياتك وأنتي-أفضلياتك، جنباً إلى جنب.",
      },
    },
  },
  {
    id: "winRateBySetup",
    computedIn: ["src/lib/tradingStats.js"],
    related: ["winRate", "performanceBySetup"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · גרף"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "אחוז הצלחה לפי סטאפ",
        short: "גובה העמודה הוא אחוז ההצלחה של הסטאפ; המספר מעליה הוא מספר העסקאות.",
        example: "לדוגמה: עמודה סגולה = 50% ומעלה, אפורה = מתחת ל-50%.",
        caveat: "ממוין לפי מספר העסקאות.",
      },
      en: {
        label: "Win Rate by Setup",
        short: "Bar height is the setup's win rate; the number above it is the trade count.",
        example: "Example: a purple bar = 50% or more, a gray bar = below 50%.",
        caveat: "Sorted by trade count.",
      },
      es: {
        label: "Win Rate by Setup",
        short: "Bar height is the setup's win rate; the number above it is the trade count.\nExample: a purple bar = 50% or more, a gray bar = below 50%.\nSorted by trade count.",
      },
      pt: {
        label: "Win Rate by Setup",
        short: "Bar height is the setup's win rate; the number above it is the trade count.\nExample: a purple bar = 50% or more, a gray bar = below 50%.\nSorted by trade count.",
      },
      ar: {
        label: "Win Rate by Setup",
        short: "Bar height is the setup's win rate; the number above it is the trade count.\nExample: a purple bar = 50% or more, a gray bar = below 50%.\nSorted by trade count.",
      },
    },
  },
  {
    id: "bestDay",
    computedIn: ["SwingEdge_App.jsx:6739"],
    related: ["dayOfWeek"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · כרטיס תובנה"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "היום הטוב ביותר",
        short: "יום השבוע עם ה-P&L הכולל הגבוה ביותר, לפי יום הכניסה.",
        example: "לדוגמה: שני \u200e+$400, שלישי \u200e+$150 ⇒ שני.",
        caveat: "לא מתחשב במספר העסקאות.",
      },
      en: {
        label: "Best Day",
        short: "The weekday with the highest total P&L, by entry day.",
        example: "Example: Monday +$400, Tuesday +$150 ⇒ Monday.",
        caveat: "Trade count is not taken into account.",
      },
      es: {
        label: "Best Day",
        short: "The weekday with the highest total P&L, by entry day.\nExample: Monday +$400, Tuesday +$150 ⇒ Monday.\nTrade count is not taken into account.",
      },
      pt: {
        label: "Best Day",
        short: "The weekday with the highest total P&L, by entry day.\nExample: Monday +$400, Tuesday +$150 ⇒ Monday.\nTrade count is not taken into account.",
      },
      ar: {
        label: "Best Day",
        short: "The weekday with the highest total P&L, by entry day.\nExample: Monday +$400, Tuesday +$150 ⇒ Monday.\nTrade count is not taken into account.",
      },
    },
  },
  {
    id: "bestSetup",
    computedIn: ["SwingEdge_App.jsx:6751"],
    related: ["edge", "performanceBySetup"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · כרטיס תובנה"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "הסטאפ הטוב ביותר",
        short: "הסטאפ עם אחוז ההצלחה הגבוה ביותר; בתיקו — זה עם יותר עסקאות.",
        example: "לדוגמה: Pullback ב-70% מ-10 עסקאות קודם ל-Breakout ב-60%.",
        caveat: "אין סף מדגם: עסקה אחת ב-100% יכולה לזכות. Unknown לא נכלל.",
      },
      en: {
        label: "Best Setup",
        short: "The setup with the highest win rate; on a tie, the one with more trades.",
        example: "Example: Pullback at 70% over 10 trades ranks above Breakout at 60%.",
        caveat: "No minimum sample: one trade at 100% can win. Unknown is excluded.",
      },
      es: {
        label: "Best Setup",
        short: "The setup with the highest win rate; on a tie, the one with more trades.\nExample: Pullback at 70% over 10 trades ranks above Breakout at 60%.\nNo minimum sample: one trade at 100% can win. Unknown is excluded.",
      },
      pt: {
        label: "Best Setup",
        short: "The setup with the highest win rate; on a tie, the one with more trades.\nExample: Pullback at 70% over 10 trades ranks above Breakout at 60%.\nNo minimum sample: one trade at 100% can win. Unknown is excluded.",
      },
      ar: {
        label: "Best Setup",
        short: "The setup with the highest win rate; on a tie, the one with more trades.\nExample: Pullback at 70% over 10 trades ranks above Breakout at 60%.\nNo minimum sample: one trade at 100% can win. Unknown is excluded.",
      },
    },
  },
  {
    id: "bestEmotion",
    computedIn: ["SwingEdge_App.jsx:6768"],
    related: ["emotionPerformance"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · כרטיס תובנה"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "הרגש הטוב ביותר",
        short: "הרגש שסימנת בכניסה עם אחוז ההצלחה הגבוה ביותר; בתיקו — זה עם יותר עסקאות.",
        example: "לדוגמה: Calm ב-65% קודם ל-Confident ב-55%.",
        caveat: "אין סף מדגם.",
      },
      en: {
        label: "Best Emotion",
        short: "The entry emotion you marked with the highest win rate; on a tie, the one with more trades.",
        example: "Example: Calm at 65% ranks above Confident at 55%.",
        caveat: "No minimum sample.",
      },
      es: {
        label: "Best Emotion",
        short: "The entry emotion you marked with the highest win rate; on a tie, the one with more trades.\nExample: Calm at 65% ranks above Confident at 55%.\nNo minimum sample.",
      },
      pt: {
        label: "Best Emotion",
        short: "The entry emotion you marked with the highest win rate; on a tie, the one with more trades.\nExample: Calm at 65% ranks above Confident at 55%.\nNo minimum sample.",
      },
      ar: {
        label: "Best Emotion",
        short: "The entry emotion you marked with the highest win rate; on a tie, the one with more trades.\nExample: Calm at 65% ranks above Confident at 55%.\nNo minimum sample.",
      },
    },
  },
  {
    id: "rDistribution",
    computedIn: ["SwingEdge_App.jsx:6863"],
    related: ["rMultiple", "avgR"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · גרף"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "התפלגות R",
        short: "כמה עסקאות סגורות נפלו בכל טווח R, משמאל להפסד ועד ימין לרווח.",
        example: "לדוגמה: עסקה של \u200e+1.4R נספרת בטווח 1R עד 2R.",
        caveat: "עסקאות בלי סטופ לא נספרות.",
      },
      en: {
        label: "R Distribution",
        short: "How many closed trades fell in each R range, losses left to wins right.",
        example: "Example: a +1.4R trade counts in the 1R to 2R range.",
        caveat: "Trades without a stop are not counted.",
      },
      es: {
        label: "R Distribution",
        short: "How many closed trades fell into each R range, from losses on the left to wins on the right.\nExample: a +1.4R trade counts in the 1R to 2R range.\nTrades without a stop are not counted.",
      },
      pt: {
        label: "R Distribution",
        short: "How many closed trades fell into each R range, from losses on the left to wins on the right.\nExample: a +1.4R trade counts in the 1R to 2R range.\nTrades without a stop are not counted.",
      },
      ar: {
        label: "R Distribution",
        short: "How many closed trades fell into each R range, from losses on the left to wins on the right.\nExample: a +1.4R trade counts in the 1R to 2R range.\nTrades without a stop are not counted.",
      },
    },
  },
  {
    id: "pnlByMonth",
    computedIn: ["SwingEdge_App.jsx:6885"],
    related: ["equityCurve"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · גרף"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "רווח/הפסד לפי חודש",
        short: "סכום ה-P&L של העסקאות הסגורות לכל חודש, לפי תאריך העסקה.",
        example: "לדוגמה: במרץ \u200e+$200, \u200e−$50 ו-\u200e+$100 ⇒ \u200e+$250.",
        caveat: "עסקה שלא הומרה למטבע ההון לא נספרת.",
      },
      en: {
        label: "P&L by Month",
        short: "The sum of closed-trade P&L for each month, by trade date.",
        example: "Example: in March +$200, −$50 and +$100 ⇒ +$250.",
        caveat: "A trade not converted to your capital currency is not counted.",
      },
      es: {
        label: "P&L by Month",
        short: "The sum of closed-trade P&L for each month, by trade date.\nExample: in March +$200, −$50 and +$100 ⇒ +$250.\nA trade not converted to your capital currency is not counted.",
      },
      pt: {
        label: "P&L by Month",
        short: "The sum of closed-trade P&L for each month, by trade date.\nExample: in March +$200, −$50 and +$100 ⇒ +$250.\nA trade not converted to your capital currency is not counted.",
      },
      ar: {
        label: "P&L by Month",
        short: "The sum of closed-trade P&L for each month, by trade date.\nExample: in March +$200, −$50 and +$100 ⇒ +$250.\nA trade not converted to your capital currency is not counted.",
      },
    },
  },
  {
    id: "emotionPerformance",
    computedIn: ["SwingEdge_App.jsx:6904"],
    related: ["bestEmotion"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · גרף"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "ביצועים לפי רגש",
        short: "סך ה-P&L של העסקאות הסגורות לפי הרגש שסימנת בכניסה.",
        example: "לדוגמה: FOMO · 4 עסקאות · \u200e−$300.",
        caveat: "עסקה בלי רגש מסומן נספרת כ-Unknown.",
      },
      en: {
        label: "Emotion Performance",
        short: "Total closed-trade P&L by the emotion you marked at entry.",
        example: "Example: FOMO · 4 trades · −$300.",
        caveat: "A trade with no emotion marked counts as Unknown.",
      },
      es: {
        label: "Emotion Performance",
        short: "Total closed-trade P&L by the emotion you marked at entry.\nExample: FOMO · 4 trades · −$300.\nA trade with no emotion marked counts as Unknown.",
      },
      pt: {
        label: "Emotion Performance",
        short: "Total closed-trade P&L by the emotion you marked at entry.\nExample: FOMO · 4 trades · −$300.\nA trade with no emotion marked counts as Unknown.",
      },
      ar: {
        label: "Emotion Performance",
        short: "Total closed-trade P&L by the emotion you marked at entry.\nExample: FOMO · 4 trades · −$300.\nA trade with no emotion marked counts as Unknown.",
      },
    },
  },
  {
    id: "setupMatrix",
    computedIn: ["SwingEdge_App.jsx:6919"],
    related: ["performanceBySetup", "bestSetup"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · טבלה"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "מטריצת סטאפים",
        short: "טבלה לכל סטאפ: עסקאות, אחוז הצלחה, R ממוצע ו-P&L, ממוינת לפי P&L.",
        example: "לדוגמה: Breakout · 8 · 50% · \u200e+0.4R · \u200e+$600.",
      },
      en: {
        label: "Setup Matrix",
        short: "A table per setup: trades, win rate, average R and P&L, sorted by P&L.",
        example: "Example: Breakout · 8 · 50% · +0.4R · +$600.",
      },
      es: {
        label: "Setup Matrix",
        short: "A table per setup: trades, win rate, average R and P&L, sorted by P&L.\nExample: Breakout · 8 · 50% · +0.4R · +$600.",
      },
      pt: {
        label: "Setup Matrix",
        short: "A table per setup: trades, win rate, average R and P&L, sorted by P&L.\nExample: Breakout · 8 · 50% · +0.4R · +$600.",
      },
      ar: {
        label: "Setup Matrix",
        short: "A table per setup: trades, win rate, average R and P&L, sorted by P&L.\nExample: Breakout · 8 · 50% · +0.4R · +$600.",
      },
    },
  },
  {
    id: "holdTimeVsPnl",
    computedIn: ["SwingEdge_App.jsx:6933"],
    related: ["avgHold"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · גרף פיזור"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "זמן החזקה מול רווח",
        short: "כל נקודה היא עסקה סגורה: ימי ההחזקה בציר אחד וה-P&L בציר השני.",
        example: "לדוגמה: נקודה ב-5 ימים וב-\u200e+$300 = עסקה שהחזקת 5 ימים והרוויחה $300.",
        caveat: "עסקה שלא הומרה למטבע ההון לא מוצגת.",
      },
      en: {
        label: "Hold Time vs P&L",
        short: "Each dot is a closed trade: holding days against P&L.",
        example: "Example: a dot at 5 days and +$300 = held 5 days, made $300.",
        caveat: "Trades not converted to your capital currency are not shown.",
      },
      es: {
        label: "Hold Time vs P&L",
        short: "Each dot is a closed trade: holding days on one axis and P&L on the other.\nExample: a dot at 5 days and +$300 = a trade you held 5 days that made $300.\nA trade not converted to your capital currency is not shown.",
      },
      pt: {
        label: "Hold Time vs P&L",
        short: "Each dot is a closed trade: holding days on one axis and P&L on the other.\nExample: a dot at 5 days and +$300 = a trade you held 5 days that made $300.\nA trade not converted to your capital currency is not shown.",
      },
      ar: {
        label: "Hold Time vs P&L",
        short: "Each dot is a closed trade: holding days on one axis and P&L on the other.\nExample: a dot at 5 days and +$300 = a trade you held 5 days that made $300.\nA trade not converted to your capital currency is not shown.",
      },
    },
  },
];
