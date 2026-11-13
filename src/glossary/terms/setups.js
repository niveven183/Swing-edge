// src/glossary/terms/setups.js — סטאפים
// ⛔ מקור האמת היחיד למונחים האלה. עריכה כאן ⇒ `npm run glossary` באותו קומיט (test:glossary תופס סחיפה).
// פורמט (גל 3): short = הגדרה במשפט אחד ≤18 מילים · example = "לדוגמה:"/"Example:" במספרים היפותטיים · caveat אחד לכל היותר · longForm = הטקסט המלא (מודאל המילון).
// pendingTranslation: es/pt/ar עדיין בטקסט הישן — שלב 5.
// aliases: שמות תצוגה (מנורמלים: lowercase · & ⇒ and · לא-אלפאנומרי ⇒ רווח) שמטריצת הסטאפים ממפה למונח.
// ⛔ במכוון בלי alias ⇒ resolveSetupKey מחזיר null (בלי "?"): Crypto (סוג נכס) · Other (סל) · Retest/Breakdown (סורק בלבד, אף פעם לא trade.setup).

/** @type {import("../types.js").GlossaryTerm[]} */
export default [
  {
    id: "breakout",
    aliases: ["breakout"],
    sources: ["MURPHY"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · מטריצת סטאפים · תג סטאפ ביומן", "src/components/DayTradesModal.jsx — יומן יומי · תג סטאפ"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "Breakout",
        short: "כניסה כשהמחיר פורץ מעל רמת התנגדות מרכזית, רצוי בנפח עולה.",
        example: "לדוגמה: התנגדות ב-$50 ונר יומי שנסגר ב-$51 בנפח כפול מהממוצע.",
        longForm: "מחיר פורץ מעל רמת התנגדות חשובה עם נפח. עובד טוב בשוק מגמתי.",
      },
      en: {
        label: "Breakout",
        short: "Entering when price breaks above a key resistance level, ideally on rising volume.",
        example: "Example: resistance at $50 and a daily close at $51 on twice the average volume.",
        longForm: "Price breaking above a key resistance level with volume. Best in trending markets.",
      },
      es: {
        label: "Breakout",
        short: "Precio rompiendo por encima de un nivel de resistencia clave con volumen. Funciona mejor en mercados con tendencia.",
      },
      pt: {
        label: "Breakout",
        short: "Preço rompendo acima de um nível de resistência chave com volume. Funciona melhor em mercados com tendência.",
      },
      ar: {
        label: "Breakout",
        short: "السعر يخترق فوق مستوى مقاومة رئيسي مع حجم تداول. يعمل بأفضل شكل في الأسواق ذات الاتجاه.",
      },
    },
  },
  {
    id: "pullback",
    aliases: ["pullback"],
    sources: ["MURPHY"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · מטריצת סטאפים · תג סטאפ ביומן", "src/components/DayTradesModal.jsx — יומן יומי · תג סטאפ"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "Pullback",
        short: "כניסה כשמחיר במגמת עלייה נסוג לתמיכה ואז ממשיך לעלות.",
        example: "לדוגמה: עלייה מ-$40 ל-$50, נסיגה לממוצע הנע ב-$46 וכניסה שם.",
        longForm: "קנייה כשמחיר במגמת עלייה נסוג זמנית לעבר תמיכה — ממוצע נע, רמת פריצה קודמת, או קו מגמה — ואז ממשיך לעלות. כניסה בתיקון נותנת מחיר טוב יותר ו-stop צמוד יותר מאשר מרדף.",
      },
      en: {
        label: "Pullback",
        short: "Entering when an uptrending price pulls back to support and then resumes higher.",
        example: "Example: a run from $40 to $50, a pullback to the moving average at $46, entry there.",
        longForm: "Buying when an uptrending price temporarily retraces toward support — a moving average, a prior breakout level, or a trendline — then resumes higher. Entering on the dip gives a better price and a tighter stop than chasing.",
      },
      es: {
        label: "Pullback",
        short: "Comprar cuando un precio en tendencia alcista retrocede temporalmente hacia un soporte —una media móvil, un nivel de ruptura previo o una línea de tendencia— y luego retoma el alza. Entrar en el retroceso da mejor precio y un stop más ajustado que perseguir.",
      },
      pt: {
        label: "Pullback",
        short: "Comprar quando um preço em tendência de alta recua temporariamente em direção a um suporte — uma média móvel, um nível de rompimento anterior ou uma linha de tendência — e depois retoma a alta. Entrar no recuo dá melhor preço e um stop mais apertado do que perseguir.",
      },
      ar: {
        label: "Pullback",
        short: "الشراء عندما يتراجع سعر في اتجاه صاعد مؤقتاً نحو دعم — متوسط متحرك، أو مستوى اختراق سابق، أو خط اتجاه — ثم يستأنف صعوده. الدخول عند التراجع يمنح سعراً أفضل ووقف خسارة أضيق من المطاردة.",
      },
    },
  },
  {
    id: "bullFlag",
    aliases: ["bull flag"],
    sources: ["BULK"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · מטריצת סטאפים · תג סטאפ ביומן", "src/components/DayTradesModal.jsx — יומן יומי · תג סטאפ"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "Bull Flag",
        short: "התכנסות צרה, יורדת קלות, אחרי עלייה חדה — בנפח מצטמצם.",
        example: "לדוגמה: עלייה מ-$20 ל-$26, ואז 5 ימים בטווח $25–$26.",
        longForm: "התכנסות צרה אחרי תנועה חדה למעלה. נפח חייב להצטמצם בזמן הדגל.",
      },
      en: {
        label: "Bull Flag",
        short: "A tight, slightly falling consolidation after a sharp rise, on shrinking volume.",
        example: "Example: a rise from $20 to $26, then 5 days in a $25–$26 range.",
        longForm: "Tight consolidation after sharp move up. Volume should contract during the flag.",
      },
      es: {
        label: "Bull Flag",
        short: "Consolidación estrecha tras un movimiento brusco al alza. El volumen debe contraerse durante la bandera.",
      },
      pt: {
        label: "Bull Flag",
        short: "Consolidação estreita após um movimento brusco de alta. O volume deve contrair durante a bandeira.",
      },
      ar: {
        label: "Bull Flag",
        short: "تماسك ضيّق بعد حركة صعودية حادّة. يجب أن ينكمش حجم التداول أثناء تكوّن العلم.",
      },
    },
  },
  {
    id: "ORBBreakout",
    aliases: ["orb breakout"],
    sources: ["CRABEL"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · מטריצת סטאפים · תג סטאפ ביומן", "src/components/DayTradesModal.jsx — יומן יומי · תג סטאפ"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "ORB Breakout",
        short: "פריצת השיא או השפל של הדקות הראשונות של המסחר — 5, 15 או 30 דקות.",
        example: "לדוגמה: טווח 15 הדקות הראשונות $30–$31 ⇒ כניסה מעל $31.",
        longForm: "פריצת טווח פתיחה — שבירת שיא/שפל של 5, 15 או 30 הדקות הראשונות. חזק בימי מגמה.",
      },
      en: {
        label: "ORB Breakout",
        short: "A break of the high or low of the first 5, 15 or 30 minutes of trading.",
        example: "Example: a first-15-minute range of $30–$31 ⇒ entry above $31.",
        longForm: "Opening Range Breakout — a break of the first 5, 15 or 30 minutes' high/low. Strong on trend days.",
      },
      es: {
        label: "ORB Breakout",
        short: "Opening Range Breakout — ruptura del máximo/mínimo de los primeros 15-30 min. Fuerte en días de tendencia.",
      },
      pt: {
        label: "ORB Breakout",
        short: "Opening Range Breakout — rompimento da máxima/mínima dos primeiros 15-30 min. Forte em dias de tendência.",
      },
      ar: {
        label: "ORB Breakout",
        short: "Opening Range Breakout — اختراق قمة/قاع أول 15-30 دقيقة. قوي في أيام الاتجاه.",
      },
    },
  },
  {
    id: "VWAPReclaim",
    aliases: ["vwap reclaim"],
    sources: ["STOCKCHARTS"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · מטריצת סטאפים · תג סטאפ ביומן", "src/components/DayTradesModal.jsx — יומן יומי · תג סטאפ"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "VWAP Reclaim",
        short: "המחיר חוזר מעל ה-VWAP — הממוצע המשוקלל בנפח של היום — אחרי שירד מתחתיו.",
        example: "לדוגמה: VWAP ב-$40, ירידה ל-$39.50 וחזרה מעל $40 בנפח.",
        longForm: "מחיר חוזר מעל VWAP אחרי ירידה, בנפח.",
      },
      en: {
        label: "VWAP Reclaim",
        short: "Price reclaims VWAP — the day's volume-weighted average price — after dipping below it.",
        example: "Example: VWAP at $40, a dip to $39.50, then back above $40 on volume.",
        longForm: "Price reclaiming VWAP after a morning dip, on volume.",
      },
      es: {
        label: "VWAP Reclaim",
        short: "El precio recupera el VWAP tras una caída matinal con volumen. Indica compra institucional.",
      },
      pt: {
        label: "VWAP Reclaim",
        short: "O preço recupera o VWAP após uma queda matinal com volume. Indica compra institucional.",
      },
      ar: {
        label: "VWAP Reclaim",
        short: "السعر يستعيد الـ VWAP بعد هبوط صباحي مع حجم تداول. يشير إلى شراء مؤسّسي.",
      },
    },
  },
  {
    id: "higherLow",
    aliases: ["higher low"],
    sources: ["MURPHY"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · מטריצת סטאפים · תג סטאפ ביומן", "src/components/DayTradesModal.jsx — יומן יומי · תג סטאפ"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "Higher Low",
        short: "כל תיקון נעצר מעל השפל הקודם — הסימן של מגמת עלייה.",
        example: "לדוגמה: שפלים ב-$45, ואז $47, ואז $49.",
        longForm: "כל תיקון יוצר שפל גבוה יותר מהקודם. הסטאפ הנקי ביותר במגמה עולה.",
      },
      en: {
        label: "Higher Low",
        short: "Each pullback stops above the previous low — the mark of an uptrend.",
        example: "Example: lows at $45, then $47, then $49.",
        longForm: "Each pullback makes a higher low than the previous. Cleanest setup in uptrend.",
      },
      es: {
        label: "Higher Low",
        short: "Cada retroceso forma un mínimo más alto que el anterior. El setup más limpio en tendencia alcista.",
      },
      pt: {
        label: "Higher Low",
        short: "Cada recuo forma um mínimo mais alto que o anterior. O setup mais limpo em tendência de alta.",
      },
      ar: {
        label: "Higher Low",
        short: "كل تراجع يصنع قاعاً أعلى من السابق. أنظف نموذج في الاتجاه الصاعد.",
      },
    },
  },
  {
    id: "cupAndHandle",
    aliases: ["cup and handle"],
    sources: ["ONEIL"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · מטריצת סטאפים · תג סטאפ ביומן", "src/components/DayTradesModal.jsx — יומן יומי · תג סטאפ"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "Cup & Handle",
        short: "התבססות בצורת U, ואחריה ירידה קצרה ורדודה (ידית) לפני פריצה.",
        example: "לדוגמה: ירידה מ-$60 ל-$48, חזרה ל-$59, ידית עד $56 ופריצה מעל $59.",
        longForm: "התכנסות בצורת U עם ידית צרה מימין. תבנית המשך קלאסית.",
      },
      en: {
        label: "Cup & Handle",
        short: "A U-shaped base followed by a short, shallow dip (the handle) before a breakout.",
        example: "Example: a fall from $60 to $48, back to $59, a handle down to $56, a break above $59.",
        longForm: "U-shaped consolidation with tight handle on right. Classic continuation pattern.",
      },
      es: {
        label: "Cup & Handle",
        short: "Consolidación en forma de U con un asa estrecha a la derecha. Patrón de continuación clásico.",
      },
      pt: {
        label: "Cup & Handle",
        short: "Consolidação em forma de U com uma alça estreita à direita. Padrão de continuação clássico.",
      },
      ar: {
        label: "Cup & Handle",
        short: "تماسك على شكل حرف U مع مقبض ضيّق على اليمين. نموذج استمرار كلاسيكي.",
      },
    },
  },
  {
    id: "failedBreakout",
    aliases: ["failed breakout"],
    sources: ["BULK"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · מטריצת סטאפים · תג סטאפ ביומן", "src/components/DayTradesModal.jsx — יומן יומי · תג סטאפ"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "Failed Breakout",
        short: "פריצה שחוזרת מהר מתחת לרמה שנפרצה — מלכודת לקונים מאוחרים.",
        example: "לדוגמה: פריצה ל-$51 מעל $50, ותוך יום חזרה ל-$49 ⇒ SHORT.",
        longForm: "פריצה שמתהפכת מהר. מלכודת לקונים מאוחרים — שורט בחזרה מתחת לרמת הפריצה.",
      },
      en: {
        label: "Failed Breakout",
        short: "A breakout that quickly falls back below the broken level — a trap for late buyers.",
        example: "Example: a break to $51 above $50, back to $49 within a day ⇒ SHORT.",
        longForm: "Breakout that quickly reverses. Trap for late buyers — short on reclaim of breakout level.",
      },
      es: {
        label: "Failed Breakout",
        short: "Ruptura que se revierte rápidamente. Trampa para compradores tardíos — corto al recuperar el nivel de ruptura.",
      },
      pt: {
        label: "Failed Breakout",
        short: "Rompimento que se reverte rapidamente. Armadilha para compradores atrasados — vendido ao recuperar o nível de rompimento.",
      },
      ar: {
        label: "Failed Breakout",
        short: "اختراق ينعكس بسرعة. فخّ للمشترين المتأخّرين — بيع عند العودة تحت مستوى الاختراق.",
      },
    },
  },
  {
    id: "overextendedFade",
    aliases: ["overextended fade"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · מטריצת סטאפים · תג סטאפ ביומן", "src/components/DayTradesModal.jsx — יומן יומי · תג סטאפ"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "Overextended Fade",
        short: "עסקה נגד המגמה כשהמחיר רחוק באופן חריג מעל ה-20 EMA.",
        example: "לדוגמה: מניה ב-$60 כשה-20 EMA ב-$52 ⇒ SHORT לכיוון הממוצע.",
        caveat: "אין במערכת סף ל'רחוק' — הוא שלך.",
        longForm: "עסקה נגד המגמה כשהמחיר רחוק באופן חריג מעל 20 EMA, לרוב עם RSI גבוה. דורש סבלנות.",
      },
      en: {
        label: "Overextended Fade",
        short: "A counter-trend trade when price is unusually far above the 20 EMA.",
        example: "Example: a stock at $60 with the 20 EMA at $52 ⇒ SHORT toward the average.",
        caveat: "The app sets no threshold for 'far' — it is yours.",
        longForm: "Counter-trend trade when price is unusually far above the 20 EMA, often with a high RSI. Requires patience.",
      },
      es: {
        label: "Overextended Fade",
        short: "Operación contra-tendencia cuando el precio está 8%+ sobre la 20 EMA con RSI alto. Requiere paciencia.",
      },
      pt: {
        label: "Overextended Fade",
        short: "Operação contra-tendência quando o preço está 8%+ acima da 20 EMA com RSI alto. Exige paciência.",
      },
      ar: {
        label: "Overextended Fade",
        short: "صفقة عكس الاتجاه عندما يكون السعر أعلى بـ 8%+ من الـ 20 EMA مع RSI مرتفع. تتطلّب صبراً.",
      },
    },
  },
  {
    id: "EMABounce50",
    aliases: ["ema bounce 50", "50 ema bounce"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · מטריצת סטאפים · תג סטאפ ביומן", "src/components/DayTradesModal.jsx — יומן יומי · תג סטאפ"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "50 EMA Bounce",
        short: "תיקון לממוצע הנע האקספוננציאלי של 50 יום בגרף יומי, וקפיצה ממנו.",
        example: "לדוגמה: 50 EMA ב-$80, שפל יומי $80.20 וסגירה ב-$82.",
        longForm: "תיקון אל 50 EMA בגרף יומי. תמיכה משמעותית במגמות עולות חזקות.",
      },
      en: {
        label: "50 EMA Bounce",
        short: "A pullback to the 50-day exponential moving average on a daily chart, and a bounce off it.",
        example: "Example: 50 EMA at $80, a daily low of $80.20 and a close at $82.",
        longForm: "Pullback to 50 EMA on daily chart. Major support in strong uptrends.",
      },
      es: {
        label: "50 EMA Bounce",
        short: "Retroceso a la 50 EMA en gráfico diario. Soporte importante en tendencias alcistas fuertes.",
      },
      pt: {
        label: "50 EMA Bounce",
        short: "Recuo à 50 EMA no gráfico diário. Suporte importante em tendências de alta fortes.",
      },
      ar: {
        label: "50 EMA Bounce",
        short: "تراجع إلى الـ 50 EMA على الرسم اليومي. دعم مهم في الاتجاهات الصاعدة القوية.",
      },
    },
  },
  {
    id: "trendContinuation",
    aliases: ["trend continuation"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · מטריצת סטאפים · תג סטאפ ביומן", "src/components/DayTradesModal.jsx — יומן יומי · תג סטאפ"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "Trend Continuation",
        short: "כניסה בתיקון רדוד ל-9 EMA בתוך מגמה קיימת.",
        example: "לדוגמה: נסיגה ל-9 EMA ב-$30.10, כניסה ב-$30.30 וסטופ ב-$29.80.",
        longForm: "כניסה בתיקון רדוד אל 9 EMA במגמה מבוססת. סטופים צרים, R גבוה.",
      },
      en: {
        label: "Trend Continuation",
        short: "Entering on a shallow pullback to the 9 EMA within an established trend.",
        example: "Example: a pullback to the 9 EMA at $30.10, entry at $30.30, stop at $29.80.",
        longForm: "Entry on shallow pullback to 9 EMA in established trend. Tight stops, high R.",
      },
      es: {
        label: "Trend Continuation",
        short: "Entrada en un retroceso superficial a la 9 EMA en una tendencia establecida. Stops ajustados, R alto.",
      },
      pt: {
        label: "Trend Continuation",
        short: "Entrada num recuo superficial à 9 EMA numa tendência estabelecida. Stops apertados, R alto.",
      },
      ar: {
        label: "Trend Continuation",
        short: "الدخول عند تراجع سطحي إلى الـ 9 EMA في اتجاه راسخ. أوامر وقف ضيّقة، R مرتفع.",
      },
    },
  },
  {
    id: "gapAndGo",
    aliases: ["gap and go"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · מטריצת סטאפים · תג סטאפ ביומן", "src/components/DayTradesModal.jsx — יומן יומי · תג סטאפ"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "Gap & Go",
        short: "מניה שפתחה בפער כלפי מעלה וממשיכה לעלות בלי לסגור את הפער.",
        example: "לדוגמה: סגירה ב-$20, פתיחה ב-$22 ושיא יומי $24 בלי לרדת מתחת ל-$22.",
        longForm: "מניה פותחת בפער מעלה וממשיכה בלי למלא. הכי טוב עם קטליזטור חדשותי.",
      },
      en: {
        label: "Gap & Go",
        short: "A stock that gaps up at the open and keeps rising without filling the gap.",
        example: "Example: a $20 close, a $22 open and a $24 high without trading below $22.",
        longForm: "Stock gaps up at open and continues higher without filling. Best with news catalyst.",
      },
      es: {
        label: "Gap & Go",
        short: "La acción abre con hueco al alza y continúa sin rellenarlo. Mejor con un catalizador de noticias.",
      },
      pt: {
        label: "Gap & Go",
        short: "A ação abre com gap de alta e continua sem preenchê-lo. Melhor com um catalisador de notícias.",
      },
      ar: {
        label: "Gap & Go",
        short: "يفتح السهم بفجوة صعودية ويواصل دون ملئها. أفضل مع محفّز إخباري.",
      },
    },
  },
  {
    id: "earningsGapPlay",
    aliases: ["earnings gap play"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · מטריצת סטאפים · תג סטאפ ביומן", "src/components/DayTradesModal.jsx — יומן יומי · תג סטאפ"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "Earnings Gap Play",
        short: "מסחר בכיוון הפער שנפתח אחרי דוח רבעוני — למעלה או למטה.",
        example: "לדוגמה: פער \u200e+6% ⇒ LONG מעל שיא הפתיחה; פער \u200e−6% ⇒ SHORT מתחת לשפל הפתיחה.",
        longForm: "סחר בתגובת הפער אחרי דוחות, בכל כיוון: פער למעלה — LONG מעל שיא הפתיחה; פער למטה — SHORT מתחת לשפל הפתיחה. החזק את הזוכים, וצא בסימן הראשון לתנועה נגדך.",
      },
      en: {
        label: "Earnings Gap Play",
        short: "Trading in the direction of the gap that opens after an earnings report — up or down.",
        example: "Example: a +6% gap ⇒ LONG above the opening high; a −6% gap ⇒ SHORT below the opening low.",
        longForm: "Trade the gap reaction after earnings, in either direction: a gap up — LONG above the opening high; a gap down — SHORT below the opening low. Hold winners and exit at the first sign of a move against you.",
      },
      es: {
        label: "Earnings Gap Play",
        short: "Operar la reacción del hueco tras resultados. Mantén las ganadoras, cubre a la primera señal de compra.",
      },
      pt: {
        label: "Earnings Gap Play",
        short: "Operar a reação do gap após resultados. Mantenha as vencedoras, cubra ao primeiro sinal de compra.",
      },
      ar: {
        label: "Earnings Gap Play",
        short: "تداول رد فعل الفجوة بعد نتائج الأرباح. احتفظ بالرابحة، وأغلق عند أول إشارة شراء.",
      },
    },
  },
  {
    id: "rangeBreakout",
    aliases: ["range breakout"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · מטריצת סטאפים · תג סטאפ ביומן", "src/components/DayTradesModal.jsx — יומן יומי · תג סטאפ"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "Range Breakout",
        short: "יציאה מטווח מחירים שנמשך ימים או שבועות.",
        example: "לדוגמה: 3 שבועות בין $40 ל-$44, ואז סגירה ב-$45.",
        longForm: "מחיר שובר מטווח של ימים/שבועות. הכי אמין כשהנפח מתרחב.",
      },
      en: {
        label: "Range Breakout",
        short: "A break out of a price range that lasted days or weeks.",
        example: "Example: 3 weeks between $40 and $44, then a close at $45.",
        longForm: "Price breaking out of multi-day/week range. Most reliable when volume expands.",
      },
      es: {
        label: "Range Breakout",
        short: "El precio rompe un rango de varios días/semanas. Más fiable cuando el volumen se expande.",
      },
      pt: {
        label: "Range Breakout",
        short: "O preço rompe um range de vários dias/semanas. Mais confiável quando o volume se expande.",
      },
      ar: {
        label: "Range Breakout",
        short: "السعر يكسر نطاقاً امتدّ أياماً/أسابيع. أكثر موثوقية عندما يتوسّع حجم التداول.",
      },
    },
  },
  {
    id: "postEarningsStrength",
    aliases: ["post earnings strength"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · מטריצת סטאפים · תג סטאפ ביומן", "src/components/DayTradesModal.jsx — יומן יומי · תג סטאפ"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "Post-Earnings Strength",
        short: "מניה שמחזיקה מעל פער עלייה בימים שאחרי דוח חיובי.",
        example: "לדוגמה: פער מ-$50 ל-$56, ו-5 ימים מעל $55.",
        longForm: "מניה מחזיקה מעל פער-כלפי-מעלה אחרי דוחות חיוביים. סימן של צבירה מוסדית.",
      },
      en: {
        label: "Post-Earnings Strength",
        short: "A stock that holds above an upside gap in the days after a strong report.",
        example: "Example: a gap from $50 to $56, then 5 days above $55.",
        longForm: "Stock holds above gap-up after earnings beat. Institutional accumulation signal.",
      },
      es: {
        label: "Post-Earnings Strength",
        short: "La acción se mantiene sobre el hueco alcista tras superar resultados. Señal de acumulación institucional.",
      },
      pt: {
        label: "Post-Earnings Strength",
        short: "A ação mantém-se acima do gap de alta após superar resultados. Sinal de acumulação institucional.",
      },
      ar: {
        label: "Post-Earnings Strength",
        short: "يحافظ السهم على البقاء فوق الفجوة الصعودية بعد تجاوز التوقّعات. إشارة تجميع مؤسّسي.",
      },
    },
  },
  {
    id: "powerHourBreak",
    aliases: ["power hour break"],
    sources: ["NYSE"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · מטריצת סטאפים · תג סטאפ ביומן", "src/components/DayTradesModal.jsx — יומן יומי · תג סטאפ"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "Power Hour Break",
        short: "פריצה בשעת המסחר האחרונה, 15:00–16:00 לפי שעון ניו יורק.",
        example: "לדוגמה: שיא יומי $70 נפרץ ב-15:20 ⇒ כניסה ב-$70.10.",
        longForm: "פריצה בשעה האחרונה (15:00-16:00 ET). מיצוב מוסדי לקראת סגירה.",
      },
      en: {
        label: "Power Hour Break",
        short: "A breakout in the last trading hour, 3–4 pm New York time.",
        example: "Example: a $70 daily high broken at 3:20 pm ⇒ entry at $70.10.",
        longForm: "Breakout in last hour (3-4pm ET). Institutional positioning into close.",
      },
      es: {
        label: "Power Hour Break",
        short: "Ruptura en la última hora (15:00-16:00 ET). Posicionamiento institucional hacia el cierre.",
      },
      pt: {
        label: "Power Hour Break",
        short: "Rompimento na última hora (15:00-16:00 ET). Posicionamento institucional rumo ao fecho.",
      },
      ar: {
        label: "Power Hour Break",
        short: "اختراق في الساعة الأخيرة (15:00-16:00 ET). تموضع مؤسّسي قبيل الإغلاق.",
      },
    },
  },
  {
    id: "MOCFade",
    aliases: ["moc fade"],
    sources: ["NYSE"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · מטריצת סטאפים · תג סטאפ ביומן", "src/components/DayTradesModal.jsx — יומן יומי · תג סטאפ"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "MOC Fade",
        short: "מסחר נגד תנועה חדה לקראת הסגירה (Market-On-Close), בציפייה לתיקון למחרת.",
        example: "לדוגמה: עלייה של \u200e+4% בשעה האחרונה ⇒ SHORT לקראת הסגירה.",
        caveat: "ב-NYSE פקודות MOC נכנסות עד 15:50 לפי שעון ניו יורק.",
        longForm: "פייד של MOC. מסחר נגד תנועות קיצוניות לקראת סגירה לקראת היפוך למחרת.",
      },
      en: {
        label: "MOC Fade",
        short: "Trading against a sharp move into the close (Market-On-Close), expecting a next-day pullback.",
        example: "Example: a +4% move in the last hour ⇒ SHORT into the close.",
        caveat: "On the NYSE, MOC orders are accepted until 3:50 p.m. New York time.",
        longForm: "Market-On-Close fade. Trade against extended moves into close for next-day reversal.",
      },
      es: {
        label: "MOC Fade",
        short: "Fade de Market-On-Close. Operar contra movimientos extendidos hacia el cierre para un giro al día siguiente.",
      },
      pt: {
        label: "MOC Fade",
        short: "Fade de Market-On-Close. Operar contra movimentos estendidos rumo ao fecho para uma reversão no dia seguinte.",
      },
      ar: {
        label: "MOC Fade",
        short: "Fade على إغلاق السوق. التداول عكس الحركات الممتدّة قبيل الإغلاق توقّعاً لانعكاس في اليوم التالي.",
      },
    },
  },
  {
    id: "overnightHold",
    aliases: ["overnight hold"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · מטריצת סטאפים · תג סטאפ ביומן", "src/components/DayTradesModal.jsx — יומן יומי · תג סטאפ"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "Overnight Hold",
        short: "עסקה שהשארת פתוחה אחרי סגירת יום המסחר.",
        example: "לדוגמה: קנית ב-$30 ב-15:30, והמניה פתחה למחרת ב-$28 ⇒ פער נגדך.",
        caveat: "סטופ לא מגן מפני פער בפתיחה.",
        longForm: "עסקה המוחזקת ללילה. פוטנציאל רווח גבוה יותר אך חשופה לסיכון פער.",
      },
      en: {
        label: "Overnight Hold",
        short: "A trade you left open past the trading-day close.",
        example: "Example: you bought at $30 at 3:30 p.m. and the stock opened at $28 the next day ⇒ a gap against you.",
        caveat: "A stop does not protect against an opening gap.",
        longForm: "Trade held overnight. Higher reward potential but exposed to gap risk.",
      },
      es: {
        label: "Overnight Hold",
        short: "Operación mantenida toda la noche. Mayor potencial de recompensa pero expuesta al riesgo de hueco.",
      },
      pt: {
        label: "Overnight Hold",
        short: "Operação mantida durante a noite. Maior potencial de retorno mas exposta ao risco de gap.",
      },
      ar: {
        label: "Overnight Hold",
        short: "صفقة محتفظ بها طوال الليل. إمكانية ربح أعلى لكنها معرّضة لمخاطر الفجوة.",
      },
    },
  },
  {
    id: "overnightReversal",
    aliases: ["overnight reversal"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · מטריצת סטאפים · תג סטאפ ביומן", "src/components/DayTradesModal.jsx — יומן יומי · תג סטאפ"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "Overnight Reversal",
        short: "מסחר נגד תנועת הלילה בפתיחת המסחר, אחרי אישור.",
        example: "לדוגמה: פער \u200e−3% בפתיחה והמחיר חוזר מעל מחיר הפתיחה ⇒ LONG.",
        longForm: "מסחר היפוך של תנועת לילה בפתיחת השוק. נגד המגמה, דורש אישור.",
      },
      en: {
        label: "Overnight Reversal",
        short: "Trading against the overnight move at the open, after confirmation.",
        example: "Example: a −3% gap at the open and price back above the opening price ⇒ LONG.",
        longForm: "Trade reversal of overnight move at market open. Counter-trend, requires confirmation.",
      },
      es: {
        label: "Overnight Reversal",
        short: "Operar el giro del movimiento nocturno en la apertura. Contra-tendencia, requiere confirmación.",
      },
      pt: {
        label: "Overnight Reversal",
        short: "Operar a reversão do movimento noturno na abertura. Contra-tendência, exige confirmação.",
      },
      ar: {
        label: "Overnight Reversal",
        short: "تداول انعكاس حركة الليل عند افتتاح السوق. عكس الاتجاه، يتطلّب تأكيداً.",
      },
    },
  },
  {
    id: "supportBounce",
    aliases: ["support bounce"],
    sources: ["MURPHY"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · מטריצת סטאפים · תג סטאפ ביומן", "src/components/DayTradesModal.jsx — יומן יומי · תג סטאפ"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "Support Bounce",
        short: "כניסה כשהמחיר יורד לרמת תמיכה מוכרת ומתהפך כלפי מעלה.",
        example: "לדוגמה: תמיכה ב-$25, שפל $25.10, כניסה ב-$25.60 וסטופ ב-$24.80.",
        longForm: "קנייה כשהמחיר יורד לרמת תמיכה ידועה ומתהפך כלפי מעלה. ההיגיון: קונים מגנים על הרמה. ה-stop יושב מתחת לתמיכה — אם היא נשברת, הניתוח בטל.",
      },
      en: {
        label: "Support Bounce",
        short: "Entering when price drops to a known support level and turns up.",
        example: "Example: support at $25, a low of $25.10, entry at $25.60, stop at $24.80.",
        longForm: "Buying when price drops to a known support level and reverses up. The logic: buyers defend the level. The stop sits below support — if it breaks, the thesis is void.",
      },
      es: {
        label: "Support Bounce",
        short: "Comprar cuando el precio cae a un nivel de soporte conocido y rebota al alza. La lógica: los compradores defienden el nivel. El stop va debajo del soporte; si se rompe, la tesis queda anulada.",
      },
      pt: {
        label: "Support Bounce",
        short: "Comprar quando o preço cai a um nível de suporte conhecido e reverte para cima. A lógica: os compradores defendem o nível. O stop fica abaixo do suporte; se romper, a tese é anulada.",
      },
      ar: {
        label: "Support Bounce",
        short: "الشراء عندما يهبط السعر إلى مستوى دعم معروف ثم ينعكس صعوداً. المنطق: المشترون يدافعون عن المستوى. يوضع وقف الخسارة أسفل الدعم — وإذا انكسر، تسقط الفكرة.",
      },
    },
  },
  {
    id: "resistanceBreak",
    aliases: ["resistance break"],
    sources: ["MURPHY"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · מטריצת סטאפים · תג סטאפ ביומן", "src/components/DayTradesModal.jsx — יומן יומי · תג סטאפ"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "Resistance Break",
        short: "כניסה כשהמחיר פורץ רמת התנגדות ספציפית שעצרה אותו בעבר.",
        example: "לדוגמה: נעצר פעמיים ב-$80, ואז נסגר ב-$81 בנפח גבוה.",
        longForm: "כניסה כשהמחיר פורץ מעל רמת התנגדות שבלמה אותו בעבר, רצוי בנפח גבוה. הפריצה מסמנת שקונים השתלטו. שונה מ-Breakout כללי בכך שהיא ממוקדת ברמה ספציפית.",
      },
      en: {
        label: "Resistance Break",
        short: "Entering when price breaks a specific resistance level that stopped it before.",
        example: "Example: stopped twice at $80, then a close at $81 on high volume.",
        longForm: "Entering when price breaks above a resistance level that previously capped it, ideally on high volume. The break signals buyers have taken control. Differs from a generic Breakout by targeting one specific level.",
      },
      es: {
        label: "Resistance Break",
        short: "Entrar cuando el precio rompe por encima de un nivel de resistencia que antes lo frenaba, idealmente con volumen alto. La ruptura indica que los compradores tomaron el control. Se diferencia de un Breakout genérico por enfocarse en un nivel específico.",
      },
      pt: {
        label: "Resistance Break",
        short: "Entrar quando o preço rompe acima de um nível de resistência que antes o travava, idealmente com volume alto. O rompimento sinaliza que os compradores assumiram o controlo. Difere de um Breakout genérico por focar num nível específico.",
      },
      ar: {
        label: "Resistance Break",
        short: "الدخول عندما يخترق السعر مستوى مقاومة كان يكبحه سابقاً، ويُفضّل بحجم تداول عالٍ. الاختراق يشير إلى أن المشترين سيطروا. يختلف عن الـ Breakout العام بتركيزه على مستوى محدّد.",
      },
    },
  },
  {
    id: "pullback20EMA",
    aliases: ["pullback to 20 ema"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · מטריצת סטאפים · תג סטאפ ביומן", "src/components/DayTradesModal.jsx — יומן יומי · תג סטאפ"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "Pullback to 20 EMA",
        short: "כניסה כשמחיר במגמת עלייה נסוג לממוצע הנע האקספוננציאלי של 20 תקופות ומתהפך.",
        example: "לדוגמה: 20 EMA ב-$40, שפל $40.15 וסגירה ב-$41.",
        longForm: "קנייה כשמחיר במגמת עלייה נסוג אל הממוצע הנע של 20 תקופות ומתהפך משם. ה-20 EMA משמש כתמיכה דינמית; הסטאפ מצרף מגמה + נקודת כניסה מדויקת.",
      },
      en: {
        label: "Pullback to 20 EMA",
        short: "Entering when an uptrending price pulls back to the 20-period exponential moving average and turns.",
        example: "Example: 20 EMA at $40, a low of $40.15 and a close at $41.",
        longForm: "Buying when an uptrending price pulls back to the 20-period moving average and bounces. The 20 EMA acts as dynamic support; this setup combines trend with a precise entry point.",
      },
      es: {
        label: "Pullback to 20 EMA",
        short: "Comprar cuando un precio en tendencia alcista retrocede a la media móvil de 20 períodos y rebota. La 20 EMA actúa como soporte dinámico; este setup combina tendencia con un punto de entrada preciso.",
      },
      pt: {
        label: "Pullback to 20 EMA",
        short: "Comprar quando um preço em tendência de alta recua à média móvel de 20 períodos e ressalta. A 20 EMA atua como suporte dinâmico; este setup combina tendência com um ponto de entrada preciso.",
      },
      ar: {
        label: "Pullback to 20 EMA",
        short: "الشراء عندما يرتد سعر في اتجاه صاعد إلى المتوسط المتحرك لـ 20 فترة ثم يرتدّ منه. يعمل الـ 20 EMA كدعم ديناميكي؛ ويجمع هذا النموذج بين الاتجاه ونقطة دخول دقيقة.",
      },
    },
  },
];
