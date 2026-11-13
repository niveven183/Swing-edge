// src/glossary/terms/risk.js — ניהול סיכון
// ⛔ מקור האמת היחיד למונחים האלה. עריכה כאן ⇒ `npm run glossary` באותו קומיט (test:glossary תופס סחיפה).

/** @type {import("../types.js").GlossaryTerm[]} */
export default [
  {
    id: "riskPerTrade",
    i18n: {
      he: {
        label: "סיכון לעסקה",
        short: "סיכון מקסימלי לעסקה כאחוז מהחשבון הכולל.\n\nסטנדרט מקצועי:\n• 1% לעסקה = שמרני, בר-קיימא\n• 2% לעסקה = מתון, עדיין מקובל\n• 5%+ לעסקה = טריטוריית הימור\n\n'סיכון פשיטת רגל' עולה באופן מעריכי מעל 2% לעסקה.",
      },
      en: {
        label: "Risk per Trade",
        short: "Maximum risk per trade as % of total account.\n\nProfessional standard:\n• 1% per trade = conservative, sustainable\n• 2% per trade = moderate, still acceptable\n• 5%+ per trade = gambling territory\n\n'Risk of ruin' increases exponentially above 2% per trade.",
      },
      es: {
        label: "Riesgo por Operación",
        short: "Riesgo máximo por operación como % del total de la cuenta.\n\nEstándar profesional:\n• 1% por operación = conservador, sostenible\n• 2% por operación = moderado, aún aceptable\n• 5%+ por operación = territorio de apuestas\n\nEl 'riesgo de ruina' aumenta exponencialmente por encima del 2% por operación.",
      },
      pt: {
        label: "Risco por Operação",
        short: "Risco máximo por operação como % do total da conta.\n\nPadrão profissional:\n• 1% por operação = conservador, sustentável\n• 2% por operação = moderado, ainda aceitável\n• 5%+ por operação = território de apostas\n\nO 'risco de ruína' aumenta exponencialmente acima de 2% por operação.",
      },
      ar: {
        label: "المخاطرة لكل صفقة",
        short: "أقصى مخاطرة لكل صفقة كنسبة % من إجمالي الحساب.\n\nالمعيار الاحترافي:\n• 1% لكل صفقة = متحفّظ، مستدام\n• 2% لكل صفقة = معتدل، لا يزال مقبولاً\n• 5%+ لكل صفقة = منطقة مقامرة\n\n'مخاطر الإفلاس' ترتفع أُسّياً فوق 2% لكل صفقة.",
      },
    },
  },
  {
    id: "riskLimits",
    i18n: {
      he: {
        label: "תקרות סיכון",
        short: "שתי תקרות שעובדות יחד:\n\n• סיכון/עסקה — המקסימום שאתה מסכן בפוזיציה בודדת. אתה בוחר אותו בהגדרות.\n• מקסימום סיכון מותר — המקסימום שאתה מסכן בכל הפוזיציות הפתוחות יחד. הוא נגזר מסיכון/עסקה: כפול שתיים, אף פעם לא מתחת ל-3% ולא מעל 5%.\n\nחלוקת מקסימום הסיכון המותר בסיכון/עסקה נותנת כמה פוזיציות בגודל מלא אפשר להחזיק בו-זמנית.",
      },
      en: {
        label: "Risk Limits",
        short: "Two limits work together:\n\n• Risk/Trade — the most you risk on a single position. You choose this in Settings.\n• Max Allowed Risk — the most you risk across ALL open positions combined. It is derived from Risk/Trade: twice that value, never below 3% and never above 5%.\n\nDivide Max Allowed Risk by Risk/Trade to see how many full-size positions you can hold at once.",
      },
      es: {
        label: "Límites de Riesgo",
        short: "Dos límites funcionan juntos:\n\n• Riesgo/Operación — lo máximo que arriesgas en una sola posición. Tú lo eliges en Ajustes.\n• Riesgo Máximo Permitido — lo máximo que arriesgas en TODAS las posiciones abiertas combinadas. Se deriva del Riesgo/Operación: el doble, nunca por debajo del 3% ni por encima del 5%.\n\nDivide el Riesgo Máximo Permitido entre el Riesgo/Operación para saber cuántas posiciones de tamaño completo puedes mantener a la vez.",
      },
      pt: {
        label: "Limites de Risco",
        short: "Dois limites funcionam juntos:\n\n• Risco/Operação — o máximo que arriscas numa única posição. És tu que o escolhes nas Definições.\n• Risco Máximo Permitido — o máximo que arriscas em TODAS as posições abertas combinadas. É derivado do Risco/Operação: o dobro, nunca abaixo de 3% nem acima de 5%.\n\nDivide o Risco Máximo Permitido pelo Risco/Operação para saberes quantas posições de tamanho completo podes manter ao mesmo tempo.",
      },
      ar: {
        label: "حدود المخاطرة",
        short: "حدّان يعملان معاً:\n\n• المخاطرة/الصفقة — أقصى ما تخاطر به في صفقة واحدة. أنت تختارها من الإعدادات.\n• أقصى مخاطرة مسموحة — أقصى ما تخاطر به في جميع المراكز المفتوحة مجتمعةً. تُشتقّ من المخاطرة/الصفقة: ضعفها، لا تقلّ عن 3% ولا تزيد عن 5%.\n\nاقسم أقصى مخاطرة مسموحة على المخاطرة/الصفقة لتعرف كم مركزاً بحجم كامل يمكنك الاحتفاظ به في آنٍ واحد.",
      },
    },
  },
  {
    id: "positionSize",
    i18n: {
      he: {
        label: "גודל פוזיציה",
        short: "גודל פוזיציה = (גודל חשבון × % סיכון) ÷ (כניסה − סטופ לוס)\n\nדוגמה: חשבון $10,000, סיכון 1%, כניסה $100, סטופ $97:\nפוזיציה = $100 ÷ $3 = 33 מניות\n\nתמיד חשב לפני כניסה. לעולם אל תסיז לפי תחושה.",
      },
      en: {
        label: "Position Size",
        short: "Position Size = (Account Size × Risk %) ÷ (Entry − Stop Loss)\n\nExample: $10,000 account, 1% risk, $100 entry, $97 stop:\nPosition = $100 ÷ $3 = 33 shares\n\nAlways calculate before entry. Never size by feel.",
      },
      es: {
        label: "Tamaño de Posición",
        short: "Tamaño de Posición = (Tamaño de Cuenta × % Riesgo) ÷ (Entrada − Stop Loss)\n\nEjemplo: cuenta de $10,000, 1% de riesgo, entrada $100, stop $97:\nPosición = $100 ÷ $3 = 33 acciones\n\nCalcula siempre antes de entrar. Nunca dimensiones por intuición.",
      },
      pt: {
        label: "Tamanho de Posição",
        short: "Tamanho de Posição = (Tamanho da Conta × % Risco) ÷ (Entrada − Stop Loss)\n\nExemplo: conta de $10,000, 1% de risco, entrada $100, stop $97:\nPosição = $100 ÷ $3 = 33 ações\n\nCalcula sempre antes de entrar. Nunca dimensiones por intuição.",
      },
      ar: {
        label: "حجم الصفقة",
        short: "حجم الصفقة = (حجم الحساب × % المخاطرة) ÷ (الدخول − وقف الخسارة)\n\nمثال: حساب $10,000، مخاطرة 1%، دخول $100، وقف $97:\nالصفقة = $100 ÷ $3 = 33 سهماً\n\nاحسب دائماً قبل الدخول. لا تحدّد الحجم بالإحساس أبداً.",
      },
    },
  },
  {
    id: "stopLoss",
    i18n: {
      he: {
        label: "סטופ לוס",
        short: "סטופ לוס — רמת המחיר שבה יוצאים מעסקה מפסידה כדי למנוע הפסדים גדולים יותר.\n\nהצב ברמה טכנית הגיונית:\n• מתחת לתמיכה מרכזית (עסקאות לונג)\n• מעל להתנגדות מרכזית (עסקאות שורט)\n• לעולם לא שרירותי (למשל 'רק $0.50 מתחת לכניסה')\n\nסטופ לוס הוא לא אופציונלי — הוא הבסיס של ניהול הסיכון.",
      },
      en: {
        label: "Stop Loss",
        short: "Stop Loss — the price level where you exit a losing trade to prevent larger losses.\n\nPlace at a logical technical level:\n• Below key support (long trades)\n• Above key resistance (short trades)\n• Never arbitrary (e.g., 'just $0.50 below entry')\n\nA stop loss is not optional — it's the foundation of risk management.",
      },
      es: {
        label: "Stop Loss",
        short: "Stop Loss — el nivel de precio donde sales de una operación perdedora para evitar pérdidas mayores.\n\nColócalo en un nivel técnico lógico:\n• Por debajo de un soporte clave (operaciones largas)\n• Por encima de una resistencia clave (operaciones cortas)\n• Nunca arbitrario (p. ej., 'solo $0.50 bajo la entrada')\n\nUn stop loss no es opcional — es la base de la gestión del riesgo.",
      },
      pt: {
        label: "Stop Loss",
        short: "Stop Loss — o nível de preço onde sais de uma operação perdedora para evitar perdas maiores.\n\nColoca-o num nível técnico lógico:\n• Abaixo de um suporte chave (operações compradas)\n• Acima de uma resistência chave (operações vendidas)\n• Nunca arbitrário (ex.: 'só $0.50 abaixo da entrada')\n\nUm stop loss não é opcional — é a base da gestão de risco.",
      },
      ar: {
        label: "Stop Loss",
        short: "Stop Loss — مستوى السعر الذي تخرج عنده من صفقة خاسرة لتفادي خسائر أكبر.\n\nضعه عند مستوى فنّي منطقي:\n• أسفل دعم رئيسي (صفقات الشراء)\n• أعلى مقاومة رئيسية (صفقات البيع)\n• ليس عشوائياً أبداً (مثلاً 'فقط $0.50 تحت الدخول')\n\nوقف الخسارة ليس اختيارياً — إنه أساس إدارة المخاطر.",
      },
    },
  },
  {
    id: "takeProfit",
    i18n: {
      he: {
        label: "Take Profit",
        short: "Take Profit — מחיר היעד שלך לסגירת עסקה מנצחת.\n\nכלל מינימום: היעד חייב להיות לפחות 1.5× הסיכון שלך (1.5R).\n\nשיטה טובה:\n• צאת חלקית: קח 50% ב-1R, החזק שאר עד היעד\n• השתמש ברמות טכניות (התנגדות, שיאים קודמים)\n• לעולם אל תזיז יעד למטה בזמן שמנצחים",
      },
      en: {
        label: "Take Profit",
        short: "Take Profit — your target price for exiting a winning trade.\n\nMinimum rule: Target must be at least 1.5× your risk (1.5R).\n\nBest practice:\n• Scale out: take 50% at 1R, hold rest to target\n• Use technical levels (resistance, prior highs)\n• Never move target lower when winning",
      },
      es: {
        label: "Take Profit",
        short: "Take Profit — tu precio objetivo para salir de una operación ganadora.\n\nRegla mínima: El objetivo debe ser al menos 1.5× tu riesgo (1.5R).\n\nBuena práctica:\n• Salida escalonada: toma 50% en 1R, mantén el resto hasta el objetivo\n• Usa niveles técnicos (resistencia, máximos previos)\n• Nunca muevas el objetivo más abajo cuando vas ganando",
      },
      pt: {
        label: "Take Profit",
        short: "Take Profit — o teu preço-alvo para sair de uma operação vencedora.\n\nRegra mínima: O alvo deve ser pelo menos 1.5× o teu risco (1.5R).\n\nBoa prática:\n• Saída escalonada: tira 50% em 1R, mantém o resto até ao alvo\n• Usa níveis técnicos (resistência, máximos anteriores)\n• Nunca movas o alvo para baixo quando estás a ganhar",
      },
      ar: {
        label: "Take Profit",
        short: "Take Profit — السعر المستهدف للخروج من صفقة رابحة.\n\nالقاعدة الدنيا: يجب أن يكون الهدف 1.5× مخاطرتك على الأقل (1.5R).\n\nأفضل ممارسة:\n• خروج تدريجي: خذ 50% عند 1R، واحتفظ بالباقي حتى الهدف\n• استخدم مستويات فنّية (مقاومة، قمم سابقة)\n• لا تحرّك الهدف للأسفل أبداً وأنت رابح",
      },
    },
  },
];
