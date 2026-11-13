// src/glossary/terms/metrics.js — מדדים נוספים
// ⛔ מקור האמת היחיד למונחים האלה. עריכה כאן ⇒ `npm run glossary` באותו קומיט (test:glossary תופס סחיפה).
// פורמט (גל 3): short = הגדרה במשפט אחד ≤18 מילים · example = "לדוגמה:"/"Example:" במספרים היפותטיים · caveat אחד לכל היותר · longForm = הטקסט המלא (מודאל המילון).
// pendingTranslation: es/pt/ar עדיין בטקסט הישן — שלב 5.

/** @type {import("../types.js").GlossaryTerm[]} */
export default [
  {
    id: "rr",
    computedIn: ["src/utils.js:75"],
    related: ["takeProfit", "stopLoss", "rrBucket3plus"],
    shownAt: ["SwingEdge_App.jsx — מנתח עסקה · טופס עסקה", "src/components/LandingPage.jsx — דף הנחיתה · הדגשת מונח"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "סיכון / סיכוי · R/R",
        short: "היחס בין הסיכון לרווח הפוטנציאלי, בכתיב סיכון:סיכוי.",
        example: "לדוגמה: סטופ $2 מתחת לכניסה ויעד $6 מעליה ⇒ 1:3.",
        longForm: "יחס סיכון-סיכוי: כמה אתה עלול להרוויח מול כמה אתה מסכן, בכתיב סיכון:סיכוי. 1:3 = פוטנציאל רווח פי 3 מההפסד המתוכנן.",
      },
      en: {
        label: "Risk / Reward",
        short: "The ratio between your risk and the potential reward, written risk:reward.",
        example: "Example: a stop $2 below entry and a target $6 above ⇒ 1:3.",
        longForm: "Risk/Reward: potential profit versus what you risk, written risk:reward. 1:3 = you stand to make 3× your planned loss.",
      },
      es: {
        label: "Riesgo / Beneficio · R/R",
        short: "Riesgo/Beneficio. Beneficio potencial vs. lo que arriesgas. 3:1 = puedes ganar 3× lo que perderías.",
      },
      pt: {
        label: "Risco / Retorno · R/R",
        short: "Risco/Retorno. Lucro potencial vs. o que arriscas. 3:1 = podes ganhar 3× o que perderias.",
      },
      ar: {
        label: "المخاطرة / العائد · R/R",
        short: "المخاطرة/العائد. الربح المحتمل مقابل ما تخاطر به. 3:1 = يمكنك ربح 3× ما قد تخسره.",
      },
    },
  },
  {
    id: "rMultiple",
    computedIn: ["src/utils.js:58"],
    sources: ["THARP"],
    related: ["avgR", "stopLoss"],
    shownAt: ["SwingEdge_App.jsx — דשבורד · עמודת R ביומן", "src/components/LandingPage.jsx — דף הנחיתה · הדגשת מונח"],
    pendingTranslation: ["es", "pt", "ar"],
    mustContain: { he: ["LONG", "SHORT"], en: ["LONG", "SHORT"] },
    i18n: {
      he: {
        label: "R-Multiple",
        short: "תוצאת העסקה ביחידות של הסיכון הראשוני, לפי הכיוון: LONG (יציאה − כניסה), SHORT (כניסה − יציאה).",
        example: "לדוגמה: סיכנת $50 והפסדת $100 ⇒ \u200e−2R — הסטופ לא כובד.",
        caveat: "R נמדד לפי הסטופ השמור בעסקה.",
        longForm: "R-Multiple = רווח העסקה ÷ הסיכון הראשוני. הרווח נגזר מכיוון העסקה: ב-LONG הוא (יציאה − כניסה), וב-SHORT הוא (כניסה − יציאה) — כך ש-SHORT מנצחת היא תמיד R חיובי.\n\n\u200e+2R = הרווחת פי 2 ממה שסיכנת · \u200e−1R = הפסדת את הסיכון המתוכנן · \u200e−2R = הסטופ לא כובד.\n\nהסיכון נמדד לפי הסטופ השמור בעסקה: אם ערכת את הסטופ אחרי הכניסה, ה-R מחושב מהערך החדש. מעקב ב-R מנטרל את גודל הסכום ומאפשר להשוות בין עסקאות.",
      },
      en: {
        label: "R-Multiple",
        short: "A trade's result in units of initial risk: LONG (Exit − Entry), SHORT (Entry − Exit).",
        example: "Example: you risked $50 and lost $100 ⇒ −2R; the stop was not honored.",
        caveat: "Measured against the saved stop.",
        longForm: "R-Multiple = trade profit ÷ initial risk. The profit follows the direction of the trade: on a LONG it is (Exit − Entry), on a SHORT it is (Entry − Exit) — so a winning SHORT is always a positive R.\n\n+2R = you made 2× what you risked · −1R = you lost your planned risk · −2R = the stop was not honored.\n\nRisk is measured against the stop saved on the trade: if you edited the stop after entry, R uses the new value. Tracking R removes dollar-size bias and lets you compare trades.",
      },
      es: {
        label: "R-Multiple",
        short: "R-Multiple = ganancia de la operación ÷ riesgo inicial. La ganancia sigue la dirección de la operación: en un LONG es (Salida − Entrada), en un SHORT es (Entrada − Salida) — así que un SHORT ganador siempre da un R positivo.\n\nEjemplos:\n+2R = ganaste 2× lo que arriesgaste ✓\n+1R = ganaste exactamente lo que arriesgaste ✓\n-1R = perdiste tu riesgo planificado (normal)\n-2R = el stop no se respetó (problema)\n\nSeguir el R-Multiple elimina el sesgo del dólar y te permite comparar operaciones objetivamente.",
      },
      pt: {
        label: "R-Multiple",
        short: "R-Multiple = lucro da operação ÷ risco inicial. O lucro segue a direção da operação: num LONG é (Saída − Entrada), num SHORT é (Entrada − Saída) — por isso um SHORT vencedor dá sempre um R positivo.\n\nExemplos:\n+2R = ganhaste 2× o que arriscaste ✓\n+1R = ganhaste exatamente o que arriscaste ✓\n-1R = perdeste o teu risco planeado (normal)\n-2R = o stop não foi respeitado (problema)\n\nAcompanhar o R-Multiple elimina o viés do dólar e permite comparar operações objetivamente.",
      },
      ar: {
        label: "R-Multiple",
        short: "R-Multiple = ربح الصفقة ÷ المخاطرة الأوّلية. الربح يتبع اتّجاه الصفقة: في LONG هو (الخروج − الدخول)، وفي SHORT هو (الدخول − الخروج) — لذلك فإن SHORT الرابحة تعطي دائماً R موجباً.\n\nأمثلة:\n+2R = ربحت 2× ما خاطرت به ✓\n+1R = ربحت تماماً ما خاطرت به ✓\n-1R = خسرت مخاطرتك المخطّطة (طبيعي)\n-2R = لم يُحترم وقف الخسارة (مشكلة)\n\nتتبّع R-Multiple يزيل انحياز الدولار ويتيح لك مقارنة الصفقات موضوعياً.",
      },
    },
  },
  {
    id: "mfeMae",
    sources: ["SWEENEY"],
    related: ["stopLoss", "takeProfit"],
    shownAt: ["src/components/EditTradeModal.jsx — עריכת עסקה · שדות"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "MFE / MAE",
        short: "כמה הלכה העסקה לטובתך (MFE) וכמה נגדך (MAE) לפני שנסגרה.",
        example: "לדוגמה: נכנסת ב-$100, המחיר עלה ל-$106 וירד ל-$97 ⇒ MFE $6, MAE $3.",
        caveat: "נמדד רק אם מילאת את השדות בעסקה.",
        longForm: "Maximum Favorable Excursion (MFE) — כמה רחוק הלכה העסקה לטובתך לפני הסגירה. Maximum Adverse Excursion (MAE) — כמה רחוק היא הלכה נגדך.\n\nהשוואה בין עסקאות עוזרת לכוון סטופים ויעדים (Sweeney, 1997). השדות ממולאים על ידך — בלי ערך, אין מדידה.",
      },
      en: {
        label: "MFE / MAE",
        short: "How far a trade ran in your favor (MFE) and against you (MAE) before it closed.",
        example: "Example: entry $100, high $106, low $97 ⇒ MFE $6, MAE $3.",
        caveat: "Only if you filled in the fields.",
        longForm: "Maximum Favorable Excursion (MFE) — how far a trade ran in your favor before it closed. Maximum Adverse Excursion (MAE) — how far it ran against you.\n\nComparing them across trades helps tune stops and targets (Sweeney, 1997). You fill in the fields — with no value there is no measurement.",
      },
      es: {
        label: "MFE / MAE",
        short: "Cuán lejos llegó una operación a tu favor (MFE) y en tu contra (MAE) antes de cerrarse. Ayuda a afinar stops y objetivos.",
      },
      pt: {
        label: "MFE / MAE",
        short: "Quão longe uma operação foi a teu favor (MFE) e contra ti (MAE) antes de fechar. Ajuda a afinar stops e alvos.",
      },
      ar: {
        label: "MFE / MAE",
        short: "إلى أي مدى تحرّكت الصفقة لصالحك (MFE) وضدّك (MAE) قبل إغلاقها. يساعد في ضبط أوامر الوقف والأهداف.",
      },
    },
  },
  {
    id: "wilson",
    computedIn: ["src/intelligence/utils/statisticalModels.js:220"],
    sources: ["WILSON"],
    related: ["edge", "winRate"],
    pendingTranslation: ["es", "pt", "ar"],
    glossaryOnly: "משמש לדירוג Edge/Anti-Edge; אין מסך שמציג את הערך עצמו (הכרעת ניב 13.11)",
    i18n: {
      he: {
        label: "ציון Wilson",
        short: "הגבול התחתון של אחוז ההצלחה ה'אמיתי' ברמת ביטחון 95% — זהיר כשיש מעט עסקאות.",
        example: "לדוגמה: 3 רווחים מ-3 = 100%, אבל הגבול התחתון כ-44%.",
        caveat: "משמש לדירוג ה-Edge.",
        longForm: "ציון Wilson (Wilson, 1927) הוא הגבול התחתון של רווח-סמך ברמת 95% לשיעור הצלחה. כשיש מעט עסקאות הוא נמוך בהרבה מהאחוז הגולמי, וככל שהמדגם גדל הוא מתקרב אליו.\n\nכך סדרה קצרה של רווחים לא מדורגת מעל דפוס שהוכח על עשרות עסקאות. המערכת משתמשת בו לדירוג Edge ו-Anti-Edge.",
      },
      en: {
        label: "Wilson Score",
        short: "The lower bound of your 'true' win rate at 95% confidence — cautious when trades are few.",
        example: "Example: 3 wins out of 3 = 100%, but the lower bound is about 44%.",
        caveat: "Used to rank your Edge.",
        longForm: "The Wilson score (Wilson, 1927) is the lower bound of a 95% confidence interval for a success rate. With few trades it sits well below the raw percentage, and it approaches it as the sample grows.\n\nThat keeps a short run of wins from ranking above a pattern proven over dozens of trades. The app uses it to rank Edge and Anti-Edge.",
      },
      es: {
        label: "Wilson Score",
        short: "Una estimación cautelosa de tu win rate \"real\" cuando el tamaño de muestra es pequeño. Evita que una racha corta te engañe.",
      },
      pt: {
        label: "Wilson Score",
        short: "Uma estimativa cautelosa da tua win rate \"real\" quando o tamanho da amostra é pequeno. Evita que uma sequência curta te engane.",
      },
      ar: {
        label: "Wilson Score",
        short: "تقدير حذِر لنسبة ربحك \"الحقيقية\" عندما يكون حجم العيّنة صغيراً. يمنع سلسلة قصيرة ساخنة من خداعك.",
      },
    },
  },
  {
    id: "rrBucket3plus",
    computedIn: ["src/intelligence/utils/statisticalModels.js:345"],
    related: ["rr"],
    shownAt: ["src/intelligence/ui/IntelligenceUI.jsx — תובנות · דפוסים"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "R/R 3+",
        short: "עסקאות שהיחס המתוכנן שלהן, סטופ מול יעד, הוא 1:3 ומעלה.",
        example: "לדוגמה: סטופ $1 מתחת לכניסה ויעד $3.50 מעליה ⇒ 1:3.5 ⇒ בקבוצה.",
        caveat: "ביחס 1:3 מספיק 25% הצלחה כדי לא להפסיד, לפני עמלות.",
        longForm: "קבוצת עסקאות שהיחס המתוכנן שלהן — המרחק ליעד מול המרחק לסטופ — הוא 1:3 ומעלה. זה יחס מתוכנן, לא התוצאה בפועל.\n\nבחשבון: ביחס 1:3 אחוז ההצלחה שבו אין רווח ואין הפסד הוא 1 ÷ (1 + 3) = 25%, לפני עמלות. מעל זה הקבוצה רווחית — אם היעדים אכן הושגו.",
      },
      en: {
        label: "R/R 3+",
        short: "Trades whose planned ratio, stop versus target, is 1:3 or more.",
        example: "Example: a stop $1 below entry and a target $3.50 above ⇒ 1:3.5 ⇒ in the group.",
        caveat: "At 1:3, a 25% win rate breaks even, before commissions.",
        longForm: "The group of trades whose planned ratio — distance to target versus distance to stop — is 1:3 or more. It is the planned ratio, not the realized outcome.\n\nThe arithmetic: at 1:3 the break-even win rate is 1 ÷ (1 + 3) = 25%, before commissions. Above that the group is profitable — if the targets were actually reached.",
      },
      es: {
        label: "R/R 3+",
        short: "Un grupo de operaciones con una relación riesgo/beneficio de 3 o más: la recompensa potencial es al menos 3× el riesgo. Son las operaciones de mayor calidad por ratio: incluso con una tasa de aciertos baja, ganar una fracción basta para ser rentable.",
      },
      pt: {
        label: "R/R 3+",
        short: "Um grupo de operações com uma relação risco/retorno de 3 ou mais: o retorno potencial é pelo menos 3× o risco. São as operações de maior qualidade por rácio: mesmo com uma taxa de acertos baixa, ganhar uma fração já basta para ser lucrativo.",
      },
      ar: {
        label: "R/R 3+",
        short: "مجموعة صفقات بنسبة مخاطرة/عائد تبلغ 3 أو أكثر: العائد المحتمل لا يقل عن 3 أضعاف المخاطرة. هذه أعلى الصفقات جودةً من حيث النسبة: حتى مع نسبة نجاح منخفضة، يكفي الربح في جزء منها لتحقيق الربحية.",
      },
    },
  },
];
