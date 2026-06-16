export const TRADING_TOOLTIPS = {

  // ── Performance metrics (rich content) ──────────────────────────────────

  winRate: {
    en: "Win Rate is the percentage of your closed trades that ended in profit.\n\nAbove 55% is solid. But win rate alone doesn't determine success — a trader with 40% WR can be profitable with strong risk-reward ratios. Focus on Profit Factor too.",
    he: "אחוז הזכייה הוא האחוז מהעסקאות הסגורות שהסתיימו ברווח.\n\nמעל 55% זה טוב. אבל אחוז זכייה לבד לא קובע הצלחה — סוחר עם 40% יכול להיות רווחי אם יחס הסיכון-סיכוי שלו גבוה. תסתכל גם על Profit Factor."
  },

  profitFactor: {
    en: "Profit Factor = Total Gross Wins ÷ Total Gross Losses.\n\n• Above 1.0 = profitable\n• Above 1.5 = healthy edge\n• Above 2.0 = professional level\n• Above 3.0 = exceptional\n\nThis is one of the most important metrics in trading.",
    he: "Profit Factor = סה״כ רווחים גולמיים ÷ סה״כ הפסדים גולמיים.\n\n• מעל 1.0 = רווחי\n• מעל 1.5 = Edge בריא\n• מעל 2.0 = רמה מקצועית\n• מעל 3.0 = יוצא דופן\n\nזה אחד המדדים החשובים ביותר במסחר."
  },

  avgR: {
    en: "Average R-Multiple per closed trade.\n\nR = (Exit Price − Entry Price) ÷ Initial Risk Per Share.\n\n+1.0R means you made exactly what you risked. Aim for +0.3R or higher as a minimum average. Elite traders average +1.5R to +2.5R.",
    he: "ממוצע R-Multiple לעסקה סגורה.\n\nR = (מחיר יציאה − מחיר כניסה) ÷ סיכון ראשוני למניה.\n\n+1.0R אומר שהרווחת בדיוק כמה שסיכנת. שאף ל-+0.3R לפחות כממוצע. סוחרים עילית מגיעים ל-+1.5R עד +2.5R."
  },

  expectancy: {
    en: "Expectancy = (Win% × Avg Win) − (Loss% × Avg Loss).\n\nTells you the expected dollar profit per trade on average. Positive = your system has edge. Negative = you're losing money over time regardless of individual wins.",
    he: "תוחלת = (אחוז זכייה × רווח ממוצע) − (אחוז הפסד × הפסד ממוצע).\n\nמראה כמה דולר אתה מצפה לרוויח בממוצע לעסקה. חיובי = יש לך Edge. שלילי = אתה מפסיד לאורך זמן בלי קשר לניצחונות בודדים."
  },

  sharpe: {
    en: "Sharpe Ratio measures risk-adjusted return.\n\n• Above 1.0 = good\n• Above 2.0 = excellent\n• Above 3.0 = exceptional (hedge fund level)\n\nA high Sharpe means consistent returns without wild swings. More important than raw profit for evaluating system quality.",
    he: "יחס שארפ מודד תשואה מותאמת לסיכון.\n\n• מעל 1.0 = טוב\n• מעל 2.0 = מצוין\n• מעל 3.0 = יוצא דופן (רמת קרן גידור)\n\nשארפ גבוה = תשואות עקביות בלי תנודות חריפות. חשוב יותר מרווח גולמי להערכת איכות המערכת."
  },

  maxDD: {
    en: "Maximum Drawdown — the largest dollar drop from a peak in your account balance to the lowest point before recovery.\n\nA smaller number means fewer large losing streaks and better capital preservation. Deep drawdowns are psychologically damaging and hard to recover from mathematically.",
    he: "ירידה מקסימלית — הירידה הגדולה ביותר בדולרים מנקודת שיא ביתרת החשבון לנקודת השפל שלפני ההתאוששות.\n\nמספר קטן יותר = פחות רצפי הפסד גדולים ושמירה טובה יותר על הון. ירידות עמוקות פוגעות פסיכולוגית וקשות להתאוששות מתמטית."
  },

  avgHold: {
    en: "Average holding period per closed trade (in days).\n\nSwing trading typically targets 2-10 day holds. Very short holds (< 1 day) often indicate cutting trades too early. Very long holds (> 20 days) may suggest avoiding stop-losses.",
    he: "זמן החזקה ממוצע לעסקה סגורה (בימים).\n\nמסחר סווינג מכוון בדרך כלל ל-2-10 ימים. החזקות קצרות מאוד (< 1 יום) מעידות לעיתים על יציאה מוקדמת מדי. החזקות ארוכות מאוד (> 20 ימים) עשויות להצביע על הימנעות מסטופ לוס."
  },

  equityCurve: {
    en: "Your Equity Curve shows account balance over time.\n\nA smooth, steadily rising curve = consistent edge and good risk management.\nJagged spikes = inconsistent position sizing or emotional trading.\nLong flat periods = overtrading without edge.",
    he: "עקומת ההון מציגה את יתרת החשבון לאורך זמן.\n\nעקומה חלקה ועולה באופן עקבי = Edge עקבי וניהול סיכון טוב.\nקפיצות חדות = גודל פוזיציה לא עקבי או מסחר רגשי.\nתקופות שטוחות ארוכות = מסחר יתר ללא Edge."
  },

  // ── AI & Analytics (rich content) ────────────────────────────────────────

  dna: {
    en: "Your Trading DNA measures 4 core dimensions of your trading personality:\n\n• Risk Management (0-100): How well you control losses\n• Discipline (0-100): Do you follow your rules?\n• Consistency (0-100): Stable results across different conditions\n• Growth (0-100): Are you improving over time?\n\nBased on your actual trade history — not self-assessment.",
    he: "ה-DNA המסחרי שלך מודד 4 ממדים מרכזיים:\n\n• ניהול סיכון (0-100): כמה טוב אתה שולט בהפסדים\n• משמעת (0-100): האם אתה עוקב אחר הכללים שלך?\n• עקביות (0-100): תוצאות יציבות בתנאים שונים\n• צמיחה (0-100): האם אתה משתפר לאורך זמן?\n\nמבוסס על היסטוריית העסקאות האמיתית שלך — לא הערכה עצמית."
  },

  edge: {
    en: "Your Edge — setups where you have a statistically significant advantage based on your actual trade history.\n\nHigh win rate + positive average R = real edge. These are the setups you should trade most. The market is paying you to do these.",
    he: "ה-Edge שלך — סטאפים שבהם יש לך יתרון סטטיסטי משמעותי לפי היסטוריית העסקאות האמיתית שלך.\n\nאחוז זכייה גבוה + R ממוצע חיובי = Edge אמיתי. אלה הסטאפים שעליך לסחור הכי הרבה. השוק משלם לך על אלה."
  },

  antiEdge: {
    en: "Anti-Edge — setups where you consistently lose money based on your trade history.\n\nLow win rate + negative R = your personal anti-edge. Either fix these setups (study why they fail for you) or stop trading them entirely.\n\nAvoiding anti-edges is as important as exploiting edges.",
    he: "Anti-Edge — סטאפים שבהם אתה מפסיד כסף באופן עקבי לפי היסטוריית העסקאות שלך.\n\nאחוז זכייה נמוך + R שלילי = ה-Anti-Edge האישי שלך. תתקן אותם (תלמד למה הם נכשלים עבורך) או תפסיק לסחור אותם לחלוטין.\n\nהימנעות מ-Anti-Edge חשובה כמו ניצול Edge."
  },

  tilt: {
    en: "Tilt — emotional state that causes you to deviate from your trading rules.\n\nCommon after: large losses, missing a big move, or a string of wins creating overconfidence.\n\nSigns: increasing position size, trading more frequently, ignoring stops.\n\nPrevention: mandatory break after 2+ consecutive losses.",
    he: "Tilt — מצב רגשי שגורם לסטייה מכללי המסחר שלך.\n\nנפוץ אחרי: הפסדים גדולים, פספוס תנועה גדולה, או סדרת ניצחונות שיוצרת בטחון יתר.\n\nסימנים: הגדלת גודל פוזיציה, מסחר תכוף יותר, התעלמות מסטופים.\n\nמניעה: הפסקה חובה אחרי 2+ הפסדים רצופים."
  },

  marketRegime: {
    en: "Market Regime — current market environment that affects which setups work best.\n\n• Bull Trend: Momentum, breakouts, pullback entries work best\n• Bear Trend: Short setups, fade the rip, reduce size\n• Sideways/Range: Mean-reversion, avoid breakouts\n• Volatile: Reduce size by 50%, widen stops",
    he: "מצב שוק — סביבת השוק הנוכחית שמשפיעה על אילו סטאפים עובדים הכי טוב.\n\n• מגמה שורית: מומנטום, פריצות, כניסות בתיקון עובדות הכי טוב\n• מגמה דובית: סטאפי שורט, פייד של עליות, הקטן גודל\n• עצור/טווח: היפוך ממוצע, הימנע מפריצות\n• תנודתי: הקטן גודל ב-50%, הרחב סטופים"
  },

  // ── Risk management (rich content) ───────────────────────────────────────

  riskPerTrade: {
    en: "Maximum risk per trade as % of total account.\n\nProfessional standard:\n• 1% per trade = conservative, sustainable\n• 2% per trade = moderate, still acceptable\n• 5%+ per trade = gambling territory\n\n'Risk of ruin' increases exponentially above 2% per trade.",
    he: "סיכון מקסימלי לעסקה כאחוז מהחשבון הכולל.\n\nסטנדרט מקצועי:\n• 1% לעסקה = שמרני, בר-קיימא\n• 2% לעסקה = מתון, עדיין מקובל\n• 5%+ לעסקה = טריטוריית הימור\n\n'סיכון פשיטת רגל' עולה באופן מעריכי מעל 2% לעסקה."
  },

  positionSize: {
    en: "Position Size = (Account Size × Risk %) ÷ (Entry − Stop Loss)\n\nExample: $10,000 account, 1% risk, $100 entry, $97 stop:\nPosition = $100 ÷ $3 = 33 shares\n\nAlways calculate before entry. Never size by feel.",
    he: "גודל פוזיציה = (גודל חשבון × % סיכון) ÷ (כניסה − סטופ לוס)\n\nדוגמה: חשבון $10,000, סיכון 1%, כניסה $100, סטופ $97:\nפוזיציה = $100 ÷ $3 = 33 מניות\n\nתמיד חשב לפני כניסה. לעולם אל תסיז לפי תחושה."
  },

  stopLoss: {
    en: "Stop Loss — the price level where you exit a losing trade to prevent larger losses.\n\nPlace at a logical technical level:\n• Below key support (long trades)\n• Above key resistance (short trades)\n• Never arbitrary (e.g., 'just $0.50 below entry')\n\nA stop loss is not optional — it's the foundation of risk management.",
    he: "סטופ לוס — רמת המחיר שבה יוצאים מעסקה מפסידה כדי למנוע הפסדים גדולים יותר.\n\nהצב ברמה טכנית הגיונית:\n• מתחת לתמיכה מרכזית (עסקאות לונג)\n• מעל להתנגדות מרכזית (עסקאות שורט)\n• לעולם לא שרירותי (למשל 'רק $0.50 מתחת לכניסה')\n\nסטופ לוס הוא לא אופציונלי — הוא הבסיס של ניהול הסיכון."
  },

  takeProfit: {
    en: "Take Profit — your target price for exiting a winning trade.\n\nMinimum rule: Target must be at least 1.5× your risk (1.5R).\n\nBest practice:\n• Scale out: take 50% at 1R, hold rest to target\n• Use technical levels (resistance, prior highs)\n• Never move target lower when winning",
    he: "Take Profit — מחיר היעד שלך לסגירת עסקה מנצחת.\n\nכלל מינימום: היעד חייב להיות לפחות 1.5× הסיכון שלך (1.5R).\n\nשיטה טובה:\n• צאת חלקית: קח 50% ב-1R, החזק שאר עד היעד\n• השתמש ברמות טכניות (התנגדות, שיאים קודמים)\n• לעולם אל תזיז יעד למטה בזמן שמנצחים"
  },

  rMultiple: {
    en: "R-Multiple = (Exit − Entry) ÷ Initial Risk\n\nExamples:\n+2R = you made 2× what you risked ✓\n+1R = made exactly what you risked ✓\n-1R = lost your planned risk (normal)\n-2R = stop was not honored (problem)\n\nTracking R-Multiple eliminates dollar bias and lets you compare trades objectively.",
    he: "R-Multiple = (יציאה − כניסה) ÷ סיכון ראשוני\n\nדוגמאות:\n+2R = הרווחת פי 2 ממה שסיכנת ✓\n+1R = הרווחת בדיוק מה שסיכנת ✓\n-1R = הפסדת את הסיכון המתוכנן (נורמלי)\n-2R = הסטופ לא כובד (בעיה)\n\nמעקב אחר R-Multiple מסיר הטיית דולר ומאפשר השוואה אובייקטיבית בין עסקאות."
  },

  // ── Setup names (preserved from original) ────────────────────────────────

  breakout: {
    en: "Price breaking above a key resistance level with volume. Best in trending markets.",
    he: "מחיר פורץ מעל רמת התנגדות חשובה עם נפח. עובד טוב בשוק מגמתי."
  },
  pullback: {
    en: "Pullback to 20 EMA in an uptrend. High probability entry when buyers return at support.",
    he: "תיקון אל 20 EMA במגמה עולה. נקודת כניסה בהסתברות גבוהה כשקונים חוזרים בתמיכה."
  },
  bullFlag: {
    en: "Tight consolidation after sharp move up. Volume should contract during the flag.",
    he: "התכנסות צרה אחרי תנועה חדה למעלה. נפח חייב להצטמצם בזמן הדגל."
  },
  ORBBreakout: {
    en: "Opening Range Breakout — first 15-30 min high/low break. Strong on trend days.",
    he: "פריצת טווח פתיחה — שבירת שיא/שפל של 15-30 הדקות הראשונות. חזק בימי מגמה."
  },
  VWAPReclaim: {
    en: "Price reclaiming VWAP after morning dip with volume. Indicates institutional buying.",
    he: "מחיר חוזר מעל VWAP אחרי ירידה עם נפח. מעיד על קנייה מוסדית."
  },
  higherLow: {
    en: "Each pullback makes a higher low than the previous. Cleanest setup in uptrend.",
    he: "כל תיקון יוצר שפל גבוה יותר מהקודם. הסטאפ הנקי ביותר במגמה עולה."
  },
  cupAndHandle: {
    en: "U-shaped consolidation with tight handle on right. Classic continuation pattern.",
    he: "התכנסות בצורת U עם ידית צרה מימין. תבנית המשך קלאסית."
  },
  failedBreakout: {
    en: "Breakout that quickly reverses. Trap for late buyers — short on reclaim of breakout level.",
    he: "פריצה שמתהפכת מהר. מלכודת לקונים מאוחרים — שורט בחזרה מתחת לרמת הפריצה."
  },
  overextendedFade: {
    en: "Counter-trend trade when price is 8%+ above 20 EMA with high RSI. Requires patience.",
    he: "עסקה נגד המגמה כשהמחיר 8%+ מעל 20 EMA עם RSI גבוה. דורש סבלנות."
  },
  EMABounce50: {
    en: "Pullback to 50 EMA on daily chart. Major support in strong uptrends.",
    he: "תיקון אל 50 EMA בגרף יומי. תמיכה משמעותית במגמות עולות חזקות."
  },
  trendContinuation: {
    en: "Entry on shallow pullback to 9 EMA in established trend. Tight stops, high R.",
    he: "כניסה בתיקון רדוד אל 9 EMA במגמה מבוססת. סטופים צרים, R גבוה."
  },
  gapAndGo: {
    en: "Stock gaps up at open and continues higher without filling. Best with news catalyst.",
    he: "מניה פותחת בפער מעלה וממשיכה בלי למלא. הכי טוב עם קטליזטור חדשותי."
  },
  earningsGapPlay: {
    en: "Trade the gap reaction post-earnings. Hold winners, cover into first sign of buying.",
    he: "סחר בתגובת הפער אחרי דוחות. החזק זוכים, כסה בסימן הראשון של קנייה."
  },
  rangeBreakout: {
    en: "Price breaking out of multi-day/week range. Most reliable when volume expands.",
    he: "מחיר שובר מטווח של ימים/שבועות. הכי אמין כשהנפח מתרחב."
  },
  postEarningsStrength: {
    en: "Stock holds above gap-up after earnings beat. Institutional accumulation signal.",
    he: "מניה מחזיקה מעל פער-כלפי-מעלה אחרי דוחות חיוביים. סימן של צבירה מוסדית."
  },
  powerHourBreak: {
    en: "Breakout in last hour (3-4pm ET). Institutional positioning into close.",
    he: "פריצה בשעה האחרונה (15:00-16:00 ET). מיצוב מוסדי לקראת סגירה."
  },
  MOCFade: {
    en: "Market-On-Close fade. Trade against extended moves into close for next-day reversal.",
    he: "פייד של MOC. מסחר נגד תנועות קיצוניות לקראת סגירה לקראת היפוך למחרת."
  },
  overnightHold: {
    en: "Trade held overnight. Higher reward potential but exposed to gap risk.",
    he: "עסקה המוחזקת ללילה. פוטנציאל רווח גבוה יותר אך חשופה לסיכון פער."
  },
  overnightReversal: {
    en: "Trade reversal of overnight move at market open. Counter-trend, requires confirmation.",
    he: "מסחר היפוך של תנועת לילה בפתיחת השוק. נגד המגמה, דורש אישור."
  },

  // ── Added terms (he+en) ──────────────────────────────────────────────────

  rr: {
    en: "Risk/Reward. Potential profit vs. what you risk. 3:1 = you stand to make 3× what you'd lose.",
    he: "יחס סיכון-סיכוי. כמה אתה עלול להרוויח מול כמה אתה מסכן. 3:1 = פוטנציאל רווח פי 3 מההפסד."
  },

  mfeMae: {
    en: "How far a trade ran in your favor (MFE) and against you (MAE) before it closed. Helps tune stops and targets.",
    he: "כמה רחוק לטובתך הלכה העסקה (MFE) וכמה נגדך (MAE) לפני הסגירה. עוזר לכוון סטופים ויעדים."
  },

  wilson: {
    en: "A cautious estimate of your \"true\" win rate when sample size is small. Stops a short hot streak from fooling you.",
    he: "אומדן זהיר לאחוז הזכייה ה\"אמיתי\" שלך כשמספר העסקאות קטן. מונע אשליה מסדרה קצרה של ניצחונות."
  },

  discipline: {
    en: "Whether you followed your plan — stop, size, target — without emotional deviation. The core of long-term profitability.",
    he: "האם עקבת אחרי התוכנית: סטופ, גודל פוזיציה ויעד — בלי לסטות מרגש. הליבה של רווחיות לאורך זמן."
  },

  avgWin: {
    en: "Average profit on winning trades.",
    he: "הרווח הממוצע בעסקאות מנצחות."
  },

  avgLoss: {
    en: "Average loss on losing trades.",
    he: "ההפסד הממוצע בעסקאות מפסידות."
  },
};

// ─── Short, friendly term labels (he+en) ─────────────────────────────────────
// Heading shown at the top of a TermTooltip popover. Same single-source file.
export const TERM_LABELS = {
  // Metrics
  winRate:      { en: "Win Rate",        he: "אחוז זכייה" },
  profitFactor: { en: "Profit Factor",   he: "Profit Factor" },
  avgR:         { en: "Avg R",           he: "R ממוצע" },
  expectancy:   { en: "Expectancy",      he: "תוחלת" },
  sharpe:       { en: "Sharpe Ratio",    he: "יחס שארפ" },
  maxDD:        { en: "Max Drawdown",    he: "ירידה מקסימלית" },
  avgWin:       { en: "Avg Win",         he: "רווח ממוצע" },
  avgLoss:      { en: "Avg Loss",        he: "הפסד ממוצע" },
  avgHold:      { en: "Avg Hold",        he: "זמן החזקה ממוצע" },
  equityCurve:  { en: "Equity Curve",    he: "עקומת הון" },
  rMultiple:    { en: "R-Multiple",      he: "R-Multiple" },
  rr:           { en: "Risk / Reward",   he: "סיכון / סיכוי · R/R" },
  mfeMae:       { en: "MFE / MAE",       he: "MFE / MAE" },
  wilson:       { en: "Wilson Score",    he: "ציון Wilson" },
  // Concepts
  dna:          { en: "Trading DNA",     he: "DNA מסחרי" },
  edge:         { en: "Edge",            he: "Edge" },
  antiEdge:     { en: "Anti-Edge",       he: "Anti-Edge" },
  tilt:         { en: "Tilt",            he: "Tilt" },
  marketRegime: { en: "Market Regime",   he: "מצב שוק" },
  discipline:   { en: "Discipline",      he: "משמעת" },
  // Risk
  riskPerTrade: { en: "Risk per Trade",  he: "סיכון לעסקה" },
  positionSize: { en: "Position Size",   he: "גודל פוזיציה" },
  stopLoss:     { en: "Stop Loss",       he: "סטופ לוס" },
  takeProfit:   { en: "Take Profit",     he: "Take Profit" },
  // Setups
  breakout:           { en: "Breakout",            he: "Breakout" },
  pullback:           { en: "Pullback",            he: "Pullback" },
  bullFlag:           { en: "Bull Flag",           he: "Bull Flag" },
  ORBBreakout:        { en: "ORB Breakout",        he: "ORB Breakout" },
  VWAPReclaim:        { en: "VWAP Reclaim",        he: "VWAP Reclaim" },
  higherLow:          { en: "Higher Low",          he: "Higher Low" },
  cupAndHandle:       { en: "Cup & Handle",        he: "Cup & Handle" },
  failedBreakout:     { en: "Failed Breakout",     he: "Failed Breakout" },
  overextendedFade:   { en: "Overextended Fade",   he: "Overextended Fade" },
  EMABounce50:        { en: "50 EMA Bounce",       he: "50 EMA Bounce" },
  trendContinuation:  { en: "Trend Continuation",  he: "Trend Continuation" },
  gapAndGo:           { en: "Gap & Go",            he: "Gap & Go" },
  earningsGapPlay:    { en: "Earnings Gap Play",   he: "Earnings Gap Play" },
  rangeBreakout:      { en: "Range Breakout",      he: "Range Breakout" },
  postEarningsStrength:{ en: "Post-Earnings Strength", he: "Post-Earnings Strength" },
  powerHourBreak:     { en: "Power Hour Break",    he: "Power Hour Break" },
  MOCFade:            { en: "MOC Fade",            he: "MOC Fade" },
  overnightHold:      { en: "Overnight Hold",      he: "Overnight Hold" },
  overnightReversal:  { en: "Overnight Reversal",  he: "Overnight Reversal" },
};
