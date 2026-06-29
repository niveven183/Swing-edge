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

  riskLimits: {
    en: "Two separate limits work together:\n\n• Risk/Trade (1%) — the most you risk on a single position.\n• Max Allowed Risk (3%) — the most you risk across ALL open positions combined.\n\nSo you can hold roughly 3 full-size trades at once before hitting your portfolio risk cap.",
    he: "שתי תקרות נפרדות שעובדות יחד:\n\n• סיכון/עסקה (1%) — המקסימום שאתה מסכן בפוזיציה בודדת.\n• מקסימום סיכון מותר (3%) — המקסימום שאתה מסכן בכל הפוזיציות הפתוחות יחד.\n\nכלומר אפשר להחזיק בערך 3 עסקאות בגודל מלא בו-זמנית לפני שמגיעים לתקרת הסיכון של התיק."
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

  // ── Market Intel chart actions (he+en) ───────────────────────────────────

  chartCalcPosition: {
    en: "Auto-fills the Position Calculator from the current chart — ticker, live price as entry, a protective stop and a 2:1 target — then opens it so you can size the trade in one click.",
    he: "ממלא אוטומטית את מחשבון הפוזיציה מהגרף הנוכחי — טיקר, מחיר חי ככניסה, סטופ מגן ויעד 2:1 — ופותח אותו כדי לחשב גודל עסקה בלחיצה אחת."
  },

  chartAddToJournal: {
    en: "Starts a new journal trade from the current chart — ticker, live price, a suggested stop and a 2:1 target pre-filled — ready for you to review and save.",
    he: "פותח עסקה חדשה ביומן מהגרף הנוכחי — טיקר, מחיר חי, סטופ מוצע ויעד 2:1 ממולאים מראש — מוכן לבדיקה ושמירה."
  },

  // ── Setup names (preserved from original) ────────────────────────────────

  breakout: {
    en: "Price breaking above a key resistance level with volume. Best in trending markets.",
    he: "מחיר פורץ מעל רמת התנגדות חשובה עם נפח. עובד טוב בשוק מגמתי."
  },
  pullback: {
    en: "Buying when an uptrending price temporarily retraces toward support — a moving average, a prior breakout level, or a trendline — then resumes higher. Entering on the dip gives a better price and a tighter stop than chasing.",
    he: "קנייה כשמחיר במגמת עלייה נסוג זמנית לעבר תמיכה — ממוצע נע, רמת פריצה קודמת, או קו מגמה — ואז ממשיך לעלות. כניסה בתיקון נותנת מחיר טוב יותר ו-stop צמוד יותר מאשר מרדף.",
    es: "Comprar cuando un precio en tendencia alcista retrocede temporalmente hacia un soporte —una media móvil, un nivel de ruptura previo o una línea de tendencia— y luego retoma el alza. Entrar en el retroceso da mejor precio y un stop más ajustado que perseguir.",
    pt: "Comprar quando um preço em tendência de alta recua temporariamente em direção a um suporte — uma média móvel, um nível de rompimento anterior ou uma linha de tendência — e depois retoma a alta. Entrar no recuo dá melhor preço e um stop mais apertado do que perseguir.",
    ar: "الشراء عندما يتراجع سعر في اتجاه صاعد مؤقتاً نحو دعم — متوسط متحرك، أو مستوى اختراق سابق، أو خط اتجاه — ثم يستأنف صعوده. الدخول عند التراجع يمنح سعراً أفضل ووقف خسارة أضيق من المطاردة."
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

  // ── Emotions (5 languages) ───────────────────────────────────────────────
  emotionConfident: {
    en: "Confidence grounded in analysis, not bravado. When based on a valid setup it drives disciplined execution; when it tips into overconfidence after a win streak, it becomes risky.",
    he: "ביטחון מבוסס ניתוח, לא יוהרה. כשהוא נשען על setup תקף — מוביל לביצוע ממושמע. כשהוא הופך לביטחון-יתר אחרי רצף נצחונות, הוא מסוכן.",
    es: "Confianza basada en el análisis, no en la arrogancia. Sobre un setup válido impulsa una ejecución disciplinada; si se convierte en exceso de confianza tras una racha ganadora, se vuelve peligrosa.",
    pt: "Confiança baseada na análise, não em arrogância. Sobre um setup válido gera execução disciplinada; se virar excesso de confiança após uma sequência de vitórias, torna-se arriscada.",
    ar: "ثقة مبنية على التحليل وليست غروراً. عندما تستند إلى نموذج دخول صحيح تؤدي إلى تنفيذ منضبط؛ وعندما تتحول إلى ثقة مفرطة بعد سلسلة انتصارات تصبح خطيرة."
  },
  emotionCalm: {
    en: "The optimal emotional state for a trader. Calm lets you follow your plan without chasing or panicking. Trades opened calmly tend to respect their stop and target.",
    he: "המצב הרגשי האופטימלי לסוחר. שלווה מאפשרת לעקוב אחרי התוכנית בלי לרדוף או להיבהל. עסקאות שנפתחות ברוגע נוטות לדבוק ב-stop וב-target.",
    es: "El estado emocional óptimo para un trader. La calma te permite seguir tu plan sin perseguir ni entrar en pánico. Las operaciones abiertas con calma tienden a respetar su stop y objetivo.",
    pt: "O estado emocional ideal para um trader. A calma permite seguir o seu plano sem perseguir nem entrar em pânico. Operações abertas com calma tendem a respeitar o stop e o alvo.",
    ar: "الحالة العاطفية المثلى للمتداول. الهدوء يتيح لك اتّباع خطتك دون مطاردة أو ذعر. الصفقات التي تُفتح بهدوء تميل إلى احترام وقف الخسارة والهدف."
  },
  emotionPatient: {
    en: "Waiting for a setup that genuinely meets your criteria instead of entering every move. Patience is often what separates a profitable trader from a losing one — it filters out low-quality trades.",
    he: "המתנה ל-setup שבאמת עומד בקריטריונים, במקום להיכנס לכל תנועה. סבלנות היא לרוב ההבדל בין סוחר רווחי למפסיד — היא מסננת עסקאות באיכות נמוכה.",
    es: "Esperar un setup que realmente cumpla tus criterios en lugar de entrar en cada movimiento. La paciencia suele ser lo que separa a un trader rentable de uno perdedor: filtra las operaciones de baja calidad.",
    pt: "Esperar por um setup que realmente cumpra os seus critérios em vez de entrar em cada movimento. A paciência costuma ser o que separa um trader lucrativo de um perdedor — filtra operações de baixa qualidade.",
    ar: "انتظار نموذج دخول يستوفي معاييرك فعلاً بدلاً من الدخول في كل حركة. الصبر غالباً ما يفصل بين المتداول الرابح والخاسر، فهو يُصفّي الصفقات منخفضة الجودة."
  },
  emotionNeutral: {
    en: "Entering with no emotional charge — neither excited nor fearful. A stable state that allows objective, data-driven decisions. A solid baseline, even if less sharp than \"Calm\".",
    he: "כניסה ללא מטען רגשי — לא נלהב ולא חושש. מצב יציב שמאפשר החלטות אובייקטיביות לפי הנתונים בלבד. בסיס טוב, גם אם פחות חד מ-\"רגוע\".",
    es: "Entrar sin carga emocional, ni eufórico ni temeroso. Un estado estable que permite decisiones objetivas basadas en datos. Una buena base, aunque menos afilada que \"Calm\".",
    pt: "Entrar sem carga emocional — nem eufórico nem receoso. Um estado estável que permite decisões objetivas e baseadas em dados. Uma boa base, ainda que menos afiada que \"Calm\".",
    ar: "الدخول دون شحنة عاطفية، لا متحمّس ولا خائف. حالة مستقرة تتيح قرارات موضوعية مبنية على البيانات. أساس جيّد، وإن كان أقل حدّة من \"Calm\"."
  },
  emotionHesitant: {
    en: "Hesitation at entry — usually a sign the setup isn't clear or confidence is low. Hesitant entries tend to mean entering late, placing the stop too tight, or exiting early out of fear.",
    he: "היסוס בכניסה — לרוב סימן ש-setup לא ברור או שביטחון העצמי נמוך. כניסות מהוססות נוטות לכניסה מאוחרת, stop קרוב מדי, או יציאה מוקדמת מפחד.",
    es: "Vacilación en la entrada, normalmente señal de que el setup no está claro o la confianza es baja. Las entradas vacilantes suelen implicar entrar tarde, poner el stop demasiado ajustado o salir antes por miedo.",
    pt: "Hesitação na entrada — geralmente sinal de que o setup não está claro ou a confiança está baixa. Entradas hesitantes tendem a significar entrar tarde, colocar o stop apertado demais ou sair cedo por medo.",
    ar: "التردّد عند الدخول، وغالباً ما يكون علامة على أن نموذج الدخول غير واضح أو أن الثقة منخفضة. الدخول المتردّد يميل إلى التأخّر في الدخول، أو وضع وقف خسارة ضيّق جداً، أو الخروج مبكراً بدافع الخوف."
  },
  emotionNervous: {
    en: "Tension that clouds decision-making. Nervousness leads to obsessive price-checking, moving the stop, and impulsive exits. Often a sign the position is too large or the setup isn't trusted.",
    he: "מתח שמקשה על קבלת החלטות. עצבנות מובילה לבדיקת מחיר אובססיבית, הזזת stop, ויציאות פזיזות. לרוב מעידה על פוזיציה גדולה מדי או חוסר ביטחון ב-setup.",
    es: "Tensión que nubla la toma de decisiones. El nerviosismo lleva a revisar el precio de forma obsesiva, mover el stop y salir impulsivamente. Suele indicar una posición demasiado grande o falta de confianza en el setup.",
    pt: "Tensão que prejudica a tomada de decisão. O nervosismo leva a verificar o preço de forma obsessiva, mexer no stop e sair por impulso. Costuma indicar uma posição grande demais ou falta de confiança no setup.",
    ar: "توتّر يُشوّش اتخاذ القرار. العصبية تؤدي إلى مراقبة السعر بهوس، وتحريك وقف الخسارة، والخروج المتسرّع. وغالباً ما تدل على أن حجم الصفقة كبير جداً أو عدم الثقة في نموذج الدخول."
  },
  emotionFOMO: {
    en: "\"Fear Of Missing Out\" — entering a trade just because price moved sharply, with no valid setup. One of the most destructive patterns: late entry, chasing price, and a distant stop. A red flag.",
    he: "\"פחד מהחמצה\" — כניסה לעסקה רק כי המחיר זז בחדות, בלי setup תקף. אחד הדפוסים ההפסדיים ביותר: כניסה מאוחרת, מרדף אחרי המחיר, ו-stop רחוק. דגל אזהרה.",
    es: "\"Miedo a quedarse fuera\" — entrar en una operación solo porque el precio se movió con fuerza, sin un setup válido. Uno de los patrones más destructivos: entrada tardía, perseguir el precio y un stop lejano. Una señal de alerta.",
    pt: "\"Medo de ficar de fora\" — entrar numa operação só porque o preço se moveu com força, sem um setup válido. Um dos padrões mais destrutivos: entrada tardia, perseguir o preço e um stop distante. Um sinal de alerta.",
    ar: "\"الخوف من تفويت الفرصة\" — الدخول في صفقة لمجرّد أن السعر تحرّك بحدّة، دون نموذج دخول صحيح. من أكثر الأنماط تدميراً: دخول متأخّر، ومطاردة السعر، ووقف خسارة بعيد. علامة تحذير."
  },
  emotionAngry: {
    en: "Anger after a loss — the fuel of \"revenge trading\". In this state a trader tries to win back a loss immediately, raises risk, and takes bad trades. This is how accounts blow up. Stop.",
    he: "כעס אחרי הפסד — הדלק של \"מסחר נקמה\". במצב הזה הסוחר מנסה להחזיר הפסד מיד, מגדיל סיכון, ונכנס לעסקאות גרועות. זה המצב שבו מאבדים חשבונות. עצור.",
    es: "Ira tras una pérdida — el combustible del \"trading de venganza\". En este estado el trader intenta recuperar la pérdida de inmediato, aumenta el riesgo y entra en malas operaciones. Así se revientan las cuentas. Detente.",
    pt: "Raiva após uma perda — o combustível do \"trading de vingança\". Nesse estado o trader tenta recuperar a perda de imediato, aumenta o risco e faz operações ruins. É assim que se destroem contas. Pare.",
    ar: "الغضب بعد الخسارة — وقود \"التداول الانتقامي\". في هذه الحالة يحاول المتداول استعادة خسارته فوراً، فيرفع المخاطرة ويدخل صفقات سيئة. هكذا تُدمَّر الحسابات. توقّف."
  },

  // ── Market conditions (5 languages) ──────────────────────────────────────
  marketTrendingUp: {
    en: "An uptrending market: higher highs and higher lows. Long setups work best here; trading against the trend is risky.",
    he: "שוק במגמת עלייה: שיאים גבוהים יותר ושפלים גבוהים יותר. ה-setups של מסחר-לונג עובדים הכי טוב כאן; מסחר נגד המגמה מסוכן.",
    es: "Un mercado en tendencia alcista: máximos y mínimos más altos. Los setups en largo funcionan mejor aquí; operar contra la tendencia es arriesgado.",
    pt: "Um mercado em tendência de alta: máximos e mínimos mais altos. Setups comprados funcionam melhor aqui; operar contra a tendência é arriscado.",
    ar: "سوق في اتجاه صاعد: قمم أعلى وقيعان أعلى. نماذج الشراء تعمل بأفضل شكل هنا؛ والتداول عكس الاتجاه محفوف بالمخاطر."
  },
  marketTrendingDown: {
    en: "A downtrending market: lower highs and lower lows. Short setups work best; \"catching a falling knife\" with a long is dangerous.",
    he: "שוק במגמת ירידה: שיאים נמוכים יותר ושפלים נמוכים יותר. setups של שורט עובדים הכי טוב; \"תפיסת סכין נופלת\" בלונג מסוכנת.",
    es: "Un mercado en tendencia bajista: máximos y mínimos más bajos. Los setups en corto funcionan mejor; \"atrapar un cuchillo que cae\" en largo es peligroso.",
    pt: "Um mercado em tendência de baixa: máximos e mínimos mais baixos. Setups vendidos funcionam melhor; \"agarrar uma faca a cair\" comprado é perigoso.",
    ar: "سوق في اتجاه هابط: قمم أدنى وقيعان أدنى. نماذج البيع تعمل بأفضل شكل؛ و\"إمساك السكين الساقط\" بصفقة شراء أمر خطير."
  },
  marketSideways: {
    en: "A market with no clear trend, moving horizontally between support and resistance. Trend setups fail here; range trading (buy support, sell resistance) fits better.",
    he: "שוק ללא מגמה ברורה, נע בטווח אופקי בין תמיכה להתנגדות. setups של מגמה נכשלים כאן; מסחר בטווח (קנייה בתמיכה, מכירה בהתנגדות) מתאים יותר.",
    es: "Un mercado sin tendencia clara, que se mueve horizontalmente entre soporte y resistencia. Los setups de tendencia fallan aquí; el trading de rango (comprar en soporte, vender en resistencia) encaja mejor.",
    pt: "Um mercado sem tendência clara, movendo-se horizontalmente entre suporte e resistência. Setups de tendência falham aqui; o trading de range (comprar no suporte, vender na resistência) encaixa melhor.",
    ar: "سوق بلا اتجاه واضح، يتحرك أفقياً بين الدعم والمقاومة. نماذج الاتجاه تفشل هنا؛ والتداول ضمن النطاق (شراء عند الدعم، بيع عند المقاومة) أنسب."
  },
  marketVolatile: {
    en: "A market with sharp, fast price swings in both directions. Stops get hit easily, and position size should be smaller. Big opportunities but high risk.",
    he: "שוק עם תנודות מחיר חדות ומהירות לשני הכיוונים. ה-stops נפגעים בקלות, גודל הפוזיציה צריך להיות קטן יותר. הזדמנויות גדולות אך סיכון גבוה.",
    es: "Un mercado con oscilaciones de precio bruscas y rápidas en ambas direcciones. Los stops saltan con facilidad y el tamaño de la posición debe ser menor. Grandes oportunidades pero alto riesgo.",
    pt: "Um mercado com oscilações de preço bruscas e rápidas nos dois sentidos. Os stops são atingidos com facilidade e o tamanho da posição deve ser menor. Grandes oportunidades, mas risco elevado.",
    ar: "سوق بتقلّبات سعرية حادّة وسريعة في الاتجاهين. تُضرب أوامر وقف الخسارة بسهولة، وينبغي تصغير حجم الصفقة. فرص كبيرة لكن مخاطرة عالية."
  },

  // ── Setups added (5 languages) ───────────────────────────────────────────
  supportBounce: {
    en: "Buying when price drops to a known support level and reverses up. The logic: buyers defend the level. The stop sits below support — if it breaks, the thesis is void.",
    he: "קנייה כשהמחיר יורד לרמת תמיכה ידועה ומתהפך כלפי מעלה. ההיגיון: קונים מגנים על הרמה. ה-stop יושב מתחת לתמיכה — אם היא נשברת, הניתוח בטל.",
    es: "Comprar cuando el precio cae a un nivel de soporte conocido y rebota al alza. La lógica: los compradores defienden el nivel. El stop va debajo del soporte; si se rompe, la tesis queda anulada.",
    pt: "Comprar quando o preço cai a um nível de suporte conhecido e reverte para cima. A lógica: os compradores defendem o nível. O stop fica abaixo do suporte; se romper, a tese é anulada.",
    ar: "الشراء عندما يهبط السعر إلى مستوى دعم معروف ثم ينعكس صعوداً. المنطق: المشترون يدافعون عن المستوى. يوضع وقف الخسارة أسفل الدعم — وإذا انكسر، تسقط الفكرة."
  },
  resistanceBreak: {
    en: "Entering when price breaks above a resistance level that previously capped it, ideally on high volume. The break signals buyers have taken control. Differs from a generic Breakout by targeting one specific level.",
    he: "כניסה כשהמחיר פורץ מעל רמת התנגדות שבלמה אותו בעבר, רצוי בנפח גבוה. הפריצה מסמנת שקונים השתלטו. שונה מ-Breakout כללי בכך שהיא ממוקדת ברמה ספציפית.",
    es: "Entrar cuando el precio rompe por encima de un nivel de resistencia que antes lo frenaba, idealmente con volumen alto. La ruptura indica que los compradores tomaron el control. Se diferencia de un Breakout genérico por enfocarse en un nivel específico.",
    pt: "Entrar quando o preço rompe acima de um nível de resistência que antes o travava, idealmente com volume alto. O rompimento sinaliza que os compradores assumiram o controlo. Difere de um Breakout genérico por focar num nível específico.",
    ar: "الدخول عندما يخترق السعر مستوى مقاومة كان يكبحه سابقاً، ويُفضّل بحجم تداول عالٍ. الاختراق يشير إلى أن المشترين سيطروا. يختلف عن الـ Breakout العام بتركيزه على مستوى محدّد."
  },
  pullback20EMA: {
    en: "Buying when an uptrending price pulls back to the 20-period moving average and bounces. The 20 EMA acts as dynamic support; this setup combines trend with a precise entry point.",
    he: "קנייה כשמחיר במגמת עלייה נסוג אל הממוצע הנע של 20 תקופות ומתהפך משם. ה-20 EMA משמש כתמיכה דינמית; הסטאפ מצרף מגמה + נקודת כניסה מדויקת.",
    es: "Comprar cuando un precio en tendencia alcista retrocede a la media móvil de 20 períodos y rebota. La 20 EMA actúa como soporte dinámico; este setup combina tendencia con un punto de entrada preciso.",
    pt: "Comprar quando um preço em tendência de alta recua à média móvel de 20 períodos e ressalta. A 20 EMA atua como suporte dinâmico; este setup combina tendência com um ponto de entrada preciso.",
    ar: "الشراء عندما يرتد سعر في اتجاه صاعد إلى المتوسط المتحرك لـ 20 فترة ثم يرتدّ منه. يعمل الـ 20 EMA كدعم ديناميكي؛ ويجمع هذا النموذج بين الاتجاه ونقطة دخول دقيقة."
  },

  // ── DNA sub-scores (5 languages) ─────────────────────────────────────────
  dnaRisk: {
    en: "Measures how consistent you are at managing risk: uniform position size, respecting stops, and not exceeding your planned per-trade risk. A low score means inconsistent risk — the single biggest threat to an account.",
    he: "מודד עד כמה אתה עקבי בניהול סיכון: גודל פוזיציה אחיד, הקפדה על stop, ואי-חריגה מהסיכון המתוכנן לעסקה. ציון נמוך = סיכון לא עקבי, הסכנה הגדולה ביותר לחשבון.",
    es: "Mide cuán consistente eres gestionando el riesgo: tamaño de posición uniforme, respetar los stops y no superar el riesgo planificado por operación. Una puntuación baja significa riesgo inconsistente, la mayor amenaza para una cuenta.",
    pt: "Mede o quão consistente você é na gestão de risco: tamanho de posição uniforme, respeitar os stops e não exceder o risco planeado por operação. Uma pontuação baixa significa risco inconsistente — a maior ameaça a uma conta.",
    ar: "يقيس مدى اتّساقك في إدارة المخاطر: حجم صفقة موحّد، واحترام أوامر وقف الخسارة، وعدم تجاوز المخاطرة المخطّطة لكل صفقة. الدرجة المنخفضة تعني مخاطرة غير متّسقة — وهي أكبر تهديد للحساب."
  },
  dnaConsistency: {
    en: "Measures the stability of your performance over time: are results uniform, or dependent on a few huge trades. High consistency means a method you can rely on; low means random results.",
    he: "מודד את יציבות הביצועים לאורך זמן: האם התוצאות אחידות, או תלויות בכמה עסקאות ענק. עקביות גבוהה = שיטה שניתן לסמוך עליה; נמוכה = תוצאות אקראיות.",
    es: "Mide la estabilidad de tu rendimiento a lo largo del tiempo: si los resultados son uniformes o dependen de unas pocas operaciones enormes. Alta consistencia es un método fiable; baja, resultados aleatorios.",
    pt: "Mede a estabilidade do seu desempenho ao longo do tempo: se os resultados são uniformes ou dependem de poucas operações enormes. Alta consistência é um método confiável; baixa, resultados aleatórios.",
    ar: "يقيس استقرار أدائك عبر الزمن: هل النتائج متّسقة أم تعتمد على عدد قليل من الصفقات الضخمة. الاتّساق العالي يعني منهجاً يمكن الاعتماد عليه؛ والمنخفض يعني نتائج عشوائية."
  },
  dnaGrowth: {
    en: "Measures your improvement trend: are you learning from the data and getting better over time, or repeating the same mistakes. A rising score is the right curve for a developing trader.",
    he: "מודד את מגמת השיפור שלך: האם אתה לומד מהנתונים ומשתפר לאורך זמן, או חוזר על אותן טעויות. ציון עולה = העקומה הנכונה לסוחר מתפתח.",
    es: "Mide tu tendencia de mejora: si aprendes de los datos y mejoras con el tiempo, o repites los mismos errores. Una puntuación creciente es la curva correcta para un trader en desarrollo.",
    pt: "Mede a sua tendência de melhoria: se aprende com os dados e melhora ao longo do tempo, ou repete os mesmos erros. Uma pontuação crescente é a curva certa para um trader em desenvolvimento.",
    ar: "يقيس اتجاه تحسّنك: هل تتعلّم من البيانات وتتحسّن مع الوقت، أم تكرّر الأخطاء نفسها. الدرجة المتصاعدة هي المنحنى الصحيح للمتداول الذي يتطوّر."
  },

  // ── Metrics added (5 languages) ──────────────────────────────────────────
  totalReturn: {
    en: "Your total profit or loss since you started, as a percentage of starting capital. The headline performance number — but without risk context it doesn't tell the whole story.",
    he: "הרווח או ההפסד הכולל מאז תחילת המסחר, באחוזים מההון ההתחלתי. מדד-העל לביצועים — אבל בלי הקשר של סיכון הוא לא מספר את כל הסיפור.",
    es: "Tu ganancia o pérdida total desde que empezaste, como porcentaje del capital inicial. La cifra principal de rendimiento, pero sin contexto de riesgo no cuenta toda la historia.",
    pt: "O seu lucro ou prejuízo total desde que começou, como percentagem do capital inicial. O número principal de desempenho — mas sem contexto de risco não conta a história toda.",
    ar: "إجمالي ربحك أو خسارتك منذ البداية، كنسبة مئوية من رأس المال الابتدائي. الرقم الرئيسي للأداء — لكنه دون سياق المخاطرة لا يروي القصة كاملة."
  },
  winStreak: {
    en: "The number of profitable trades in a row. A winning streak builds confidence — but it's also the most dangerous time for overconfidence and undisciplined risk-taking.",
    he: "מספר העסקאות הרווחיות ברצף. רצף נצחונות בונה ביטחון — אך גם הזמן המסוכן ביותר לביטחון-יתר ולהגדלת סיכון לא ממושמעת.",
    es: "El número de operaciones ganadoras seguidas. Una racha ganadora genera confianza, pero también es el momento más peligroso para el exceso de confianza y un riesgo indisciplinado.",
    pt: "O número de operações vencedoras seguidas. Uma sequência de vitórias gera confiança — mas também é o momento mais perigoso para o excesso de confiança e o risco indisciplinado.",
    ar: "عدد الصفقات الرابحة المتتالية. سلسلة الانتصارات تبني الثقة — لكنها أيضاً أخطر وقت للثقة المفرطة والمخاطرة غير المنضبطة."
  },
  streakHistory: {
    en: "A record of your winning and losing streaks over time. It reveals emotional patterns: does a losing streak make you trade worse (tilt), or do you recover with discipline.",
    he: "תיעוד רצפי הנצחונות וההפסדים שלך לאורך זמן. חושף דפוסים רגשיים: האם רצף הפסדים גורם לך לסחור גרוע יותר (tilt), או להתאושש במשמעת.",
    es: "Un registro de tus rachas ganadoras y perdedoras a lo largo del tiempo. Revela patrones emocionales: ¿una racha perdedora te hace operar peor (tilt) o te recuperas con disciplina?",
    pt: "Um registo das suas sequências de vitórias e derrotas ao longo do tempo. Revela padrões emocionais: uma sequência de perdas faz você operar pior (tilt), ou você recupera com disciplina?",
    ar: "سجلّ لسلاسل انتصاراتك وخسائرك عبر الزمن. يكشف الأنماط العاطفية: هل تجعلك سلسلة الخسائر تتداول بشكل أسوأ (tilt)، أم تتعافى بانضباط؟"
  },
  grade: {
    en: "A weighted score (A–F) summarizing your trading quality for the month: a blend of win rate, R-multiple, discipline and consistency. A quick snapshot — not a substitute for digging into the details.",
    he: "ציון משוקלל (A–F) שמסכם את איכות המסחר שלך לחודש: שילוב של אחוז הצלחה, יחס R, משמעת ועקביות. תמונת-על מהירה — לא תחליף לצלילה לפרטים.",
    es: "Una puntuación ponderada (A–F) que resume la calidad de tu trading del mes: una mezcla de tasa de aciertos, múltiplo R, disciplina y consistencia. Una instantánea rápida, no un sustituto de analizar los detalles.",
    pt: "Uma pontuação ponderada (A–F) que resume a qualidade do seu trading no mês: uma mistura de taxa de acertos, múltiplo R, disciplina e consistência. Um retrato rápido — não substitui analisar os detalhes.",
    ar: "درجة مرجّحة (A–F) تلخّص جودة تداولك خلال الشهر: مزيج من نسبة النجاح ومضاعف R والانضباط والاتّساق. لقطة سريعة — لا تُغني عن التعمّق في التفاصيل."
  },
  entryQuality: {
    en: "A (star) rating of how well your entry matched the planned setup: timing, price, and confirmation. A consistently high rating signals discipline — even when the trade itself loses.",
    he: "דירוג (כוכבים) של עד כמה הכניסה תאמה ל-setup המתוכנן: עיתוי, מחיר, ואישור. דירוג גבוה עקבי הוא סימן למשמעת — גם כשהעסקה עצמה מפסידה.",
    es: "Una calificación (estrellas) de cuán bien tu entrada coincidió con el setup planificado: timing, precio y confirmación. Una calificación alta y constante indica disciplina, incluso cuando la operación pierde.",
    pt: "Uma classificação (estrelas) de quão bem a sua entrada correspondeu ao setup planeado: timing, preço e confirmação. Uma classificação alta e constante indica disciplina — mesmo quando a operação perde.",
    ar: "تقييم (بالنجوم) لمدى مطابقة دخولك للنموذج المخطّط: التوقيت، والسعر، والتأكيد. التقييم العالي المتّسق يدل على الانضباط — حتى عندما تخسر الصفقة نفسها."
  },

  // ── R/R band "3+" (5 languages) ──────────────────────────────────────────
  rrBucket3plus: {
    en: "A group of trades with a risk/reward ratio of 3 or higher — the potential reward is at least 3× the risk. These are the highest-quality trades by ratio: even with a low win rate, winning a fraction of them is enough to be profitable.",
    he: "קבוצת עסקאות עם יחס סיכון/סיכוי של 3 ומעלה: הרווח הפוטנציאלי גדול פי 3 לפחות מהסיכון. אלה העסקאות האיכותיות ביותר מבחינת יחס — גם אם אחוז ההצלחה נמוך, מספיק לנצח בחלקן כדי להיות רווחי.",
    es: "Un grupo de operaciones con una relación riesgo/beneficio de 3 o más: la recompensa potencial es al menos 3× el riesgo. Son las operaciones de mayor calidad por ratio: incluso con una tasa de aciertos baja, ganar una fracción basta para ser rentable.",
    pt: "Um grupo de operações com uma relação risco/retorno de 3 ou mais: o retorno potencial é pelo menos 3× o risco. São as operações de maior qualidade por rácio: mesmo com uma taxa de acertos baixa, ganhar uma fração já basta para ser lucrativo.",
    ar: "مجموعة صفقات بنسبة مخاطرة/عائد تبلغ 3 أو أكثر: العائد المحتمل لا يقل عن 3 أضعاف المخاطرة. هذه أعلى الصفقات جودةً من حيث النسبة: حتى مع نسبة نجاح منخفضة، يكفي الربح في جزء منها لتحقيق الربحية."
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
  riskLimits:   { en: "Risk Limits",     he: "תקרות סיכון" },
  positionSize: { en: "Position Size",   he: "גודל פוזיציה" },
  stopLoss:     { en: "Stop Loss",       he: "סטופ לוס" },
  takeProfit:   { en: "Take Profit",     he: "Take Profit" },
  // Market Intel chart actions
  chartCalcPosition: { en: "Calculate Position", he: "חשב פוזיציה" },
  chartAddToJournal: { en: "Add to Journal",     he: "הוסף ליומן" },
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

  // ── Emotions (5 languages) ───────────────────────────────────────────────
  emotionConfident:  { en: "Confident",  he: "Confident",  es: "Confident",  pt: "Confident",  ar: "Confident" },
  emotionCalm:       { en: "Calm",       he: "Calm",       es: "Calm",       pt: "Calm",       ar: "Calm" },
  emotionPatient:    { en: "Patient",    he: "Patient",    es: "Patient",    pt: "Patient",    ar: "Patient" },
  emotionNeutral:    { en: "Neutral",    he: "Neutral",    es: "Neutral",    pt: "Neutral",    ar: "Neutral" },
  emotionHesitant:   { en: "Hesitant",   he: "Hesitant",   es: "Hesitant",   pt: "Hesitant",   ar: "Hesitant" },
  emotionNervous:    { en: "Nervous",    he: "Nervous",    es: "Nervous",    pt: "Nervous",    ar: "Nervous" },
  emotionFOMO:       { en: "FOMO",       he: "FOMO",       es: "FOMO",       pt: "FOMO",       ar: "FOMO" },
  emotionAngry:      { en: "Angry",      he: "Angry",      es: "Angry",      pt: "Angry",      ar: "Angry" },

  // ── Market conditions (5 languages) ──────────────────────────────────────
  marketTrendingUp:   { en: "Trending Up",   he: "Trending Up",   es: "Trending Up",   pt: "Trending Up",   ar: "Trending Up" },
  marketTrendingDown: { en: "Trending Down", he: "Trending Down", es: "Trending Down", pt: "Trending Down", ar: "Trending Down" },
  marketSideways:     { en: "Sideways",      he: "Sideways",      es: "Sideways",      pt: "Sideways",      ar: "Sideways" },
  marketVolatile:     { en: "Volatile",      he: "Volatile",      es: "Volatile",      pt: "Volatile",      ar: "Volatile" },

  // ── Setups added (5 languages) ───────────────────────────────────────────
  supportBounce:   { en: "Support Bounce",    he: "Support Bounce",    es: "Support Bounce",    pt: "Support Bounce",    ar: "Support Bounce" },
  resistanceBreak: { en: "Resistance Break",  he: "Resistance Break",  es: "Resistance Break",  pt: "Resistance Break",  ar: "Resistance Break" },
  pullback20EMA:   { en: "Pullback to 20 EMA", he: "Pullback to 20 EMA", es: "Pullback to 20 EMA", pt: "Pullback to 20 EMA", ar: "Pullback to 20 EMA" },

  // ── DNA sub-scores (5 languages) ─────────────────────────────────────────
  dnaRisk:        { en: "Risk",        he: "Risk",        es: "Risk",        pt: "Risk",        ar: "Risk" },
  dnaConsistency: { en: "Consistency", he: "Consistency", es: "Consistency", pt: "Consistency", ar: "Consistency" },
  dnaGrowth:      { en: "Growth",      he: "Growth",      es: "Growth",      pt: "Growth",      ar: "Growth" },

  // ── Metrics added (5 languages) ──────────────────────────────────────────
  totalReturn:   { en: "Total Return",   he: "Total Return",   es: "Total Return",   pt: "Total Return",   ar: "Total Return" },
  winStreak:     { en: "Win Streak",     he: "Win Streak",     es: "Win Streak",     pt: "Win Streak",     ar: "Win Streak" },
  streakHistory: { en: "Streak History", he: "Streak History", es: "Streak History", pt: "Streak History", ar: "Streak History" },
  grade:         { en: "Grade",          he: "Grade",          es: "Grade",          pt: "Grade",          ar: "Grade" },
  entryQuality:  { en: "Entry Quality",  he: "Entry Quality",  es: "Entry Quality",  pt: "Entry Quality",  ar: "Entry Quality" },

  // ── R/R band "3+" (5 languages) ──────────────────────────────────────────
  rrBucket3plus: { en: "R/R 3+", he: "R/R 3+", es: "R/R 3+", pt: "R/R 3+", ar: "R/R 3+" },
};

// ─── Setup display-name → glossary-key normalizer ────────────────────────────
// The Setup Matrix renders human display strings ("Cup and Handle", "Gap and Go",
// "EMA Bounce 50", …) but glossary keys are camelCase ("cupAndHandle", "gapAndGo",
// "EMABounce50"). This maps display → key so the canonical SETUP-column "?" resolves.
// Display-only mapping; statistical grouping on the raw trade.setup string is untouched.
// Anything not listed returns null → no "?" is rendered (no broken tooltips).
const SETUP_KEY_ALIASES = {
  'breakout':                'breakout',
  'pullback':                'pullback',
  'pullback to 20 ema':      'pullback20EMA',
  'bull flag':               'bullFlag',
  'orb breakout':            'ORBBreakout',
  'vwap reclaim':            'VWAPReclaim',
  'higher low':              'higherLow',
  'cup and handle':          'cupAndHandle',
  'failed breakout':         'failedBreakout',
  'overextended fade':       'overextendedFade',
  'ema bounce 50':           'EMABounce50',
  '50 ema bounce':           'EMABounce50',
  'trend continuation':      'trendContinuation',
  'gap and go':              'gapAndGo',
  'earnings gap play':       'earningsGapPlay',
  'range breakout':          'rangeBreakout',
  'post earnings strength':  'postEarningsStrength',
  'power hour break':        'powerHourBreak',
  'moc fade':                'MOCFade',
  'overnight hold':          'overnightHold',
  'overnight reversal':      'overnightReversal',
  'support bounce':          'supportBounce',
  'resistance break':        'resistanceBreak',
  // Intentionally unmapped → resolveSetupKey() returns null (no "?"):
  //   'Crypto'  — asset class, not a real setup
  //   'Other'   — catch-all bucket
  //   'Retest', 'Breakdown' — scanner-only, never a trade.setup
};

function normalizeSetupName(name) {
  return String(name)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

// Returns the glossary key for a Setup-Matrix display name, or null when none
// exists (so the caller renders no "?"). Guarded by TRADING_TOOLTIPS membership.
export function resolveSetupKey(displayName) {
  if (!displayName) return null;
  const key = SETUP_KEY_ALIASES[normalizeSetupName(displayName)];
  return key && TRADING_TOOLTIPS[key] ? key : null;
}
