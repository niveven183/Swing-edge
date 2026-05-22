export const TRADING_TOOLTIPS = {
  // Performance metrics
  winRate: {
    en: "Percentage of trades that closed in profit. Above 50% is positive, but profit factor matters more.",
    he: "אחוז העסקאות שנסגרו ברווח. מעל 50% חיובי, אך Profit Factor חשוב יותר."
  },
  profitFactor: {
    en: "Gross wins ÷ gross losses. Above 1.5 is healthy, above 2.0 is professional, above 3.0 is exceptional.",
    he: "סה״כ רווחים חלקי סה״כ הפסדים. מעל 1.5 בריא, מעל 2.0 מקצועי, מעל 3.0 יוצא דופן."
  },
  avgR: {
    en: "Average reward-to-risk multiple per closed trade. R = (Exit - Entry) ÷ Initial Risk. Aim for +0.3R or higher.",
    he: "ממוצע יחס רווח-סיכון לעסקה. R = (יציאה - כניסה) חלקי הסיכון הראשוני. שאף ל-0.3R ומעלה."
  },
  expectancy: {
    en: "Expected profit per trade based on win rate and average win/loss. (Win% × AvgWin) - (Loss% × AvgLoss).",
    he: "רווח ממוצע צפוי לעסקה לפי אחוזי הצלחה. (אחוז זכייה × רווח ממוצע) - (אחוז הפסד × הפסד ממוצע)."
  },
  sharpe: {
    en: "Risk-adjusted return. Above 1.0 is good, above 2.0 is excellent. Measures consistency, not just profit.",
    he: "תשואה מותאמת סיכון. מעל 1.0 טוב, מעל 2.0 מצוין. מודד עקביות, לא רק רווח."
  },
  maxDD: {
    en: "Maximum drawdown — the largest peak-to-trough decline. Below 20% indicates good risk management.",
    he: "ירידה מקסימלית — הירידה הכי גדולה מנקודת שיא. מתחת ל-20% מצביע על ניהול סיכון טוב."
  },
  avgHold: {
    en: "Average holding period per closed trade. Swing trades typically range 2-10 days.",
    he: "זמן החזקה ממוצע לעסקה סגורה. עסקאות סווינג בדרך כלל 2-10 ימים."
  },
  equityCurve: {
    en: "Your account balance over time. A smooth upward curve indicates consistent edge.",
    he: "מאזן החשבון שלך לאורך זמן. עקומה עולה חלקה מעידה על Edge עקבי."
  },

  // Setup names
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

  // AI & Analytics
  dna: {
    en: "Your Trading DNA — 4 personality dimensions: Risk, Discipline, Consistency, Growth.",
    he: "ה-DNA שלך למסחר — 4 ממדי אישיות: סיכון, משמעת, עקביות, צמיחה."
  },
  edge: {
    en: "Setups where you have a statistical advantage based on your history. Lean into these.",
    he: "סטאפים שבהם יש לך יתרון סטטיסטי לפי ההיסטוריה שלך. תתמקד בהם."
  },
  antiEdge: {
    en: "Setups where you lose money historically. Avoid or fix before trading.",
    he: "סטאפים שבהם אתה מפסיד היסטורית. הימנע או תקן לפני מסחר."
  },
  tilt: {
    en: "Emotional state affecting trading decisions. Common after losses or big wins.",
    he: "מצב רגשי המשפיע על החלטות מסחר. נפוץ אחרי הפסדים או רווחים גדולים."
  },
  marketRegime: {
    en: "Current market environment — Bull/Bear/Range. Different setups work in each.",
    he: "סביבת השוק הנוכחית — שורי/דובי/טווח. סטאפים שונים עובדים בכל אחד."
  },

  // Risk
  riskPerTrade: {
    en: "Maximum risk per trade as % of account. 1-2% is professional, 5%+ is gambling.",
    he: "סיכון מקסימלי לעסקה כאחוז מהחשבון. 1-2% מקצועי, 5%+ זה הימור."
  },
  positionSize: {
    en: "Number of shares = Risk Amount ÷ (Entry - Stop). Always calculate before entry.",
    he: "מספר מניות = סכום סיכון חלקי (כניסה - סטופ). תמיד חשב לפני כניסה."
  },
  stopLoss: {
    en: "Price level where you exit if wrong. Place at logical technical level, not arbitrary.",
    he: "רמת מחיר שבה יוצאים אם טעית. הצב ברמה טכנית הגיונית, לא שרירותית."
  },
  takeProfit: {
    en: "Price target for profit-taking. Aim for minimum 1.5R risk-to-reward ratio.",
    he: "יעד מחיר לקיחת רווח. שאף ליחס מינימלי של 1.5R רווח-סיכון."
  },
  rMultiple: {
    en: "Reward ÷ Risk = R Multiple. 2R means you made 2× what you risked.",
    he: "רווח חלקי סיכון = R Multiple. 2R אומר שעשית פי 2 ממה שסיכנת."
  },
};
