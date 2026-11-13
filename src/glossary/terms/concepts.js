// src/glossary/terms/concepts.js — מושגים / AI
// ⛔ מקור האמת היחיד למונחים האלה. עריכה כאן ⇒ `npm run glossary` באותו קומיט (test:glossary תופס סחיפה).
// פורמט (גל 3): short = הגדרה במשפט אחד ≤18 מילים · example = "לדוגמה:"/"Example:" במספרים היפותטיים · caveat אחד לכל היותר · longForm = הטקסט המלא (מודאל המילון).
// pendingTranslation: es/pt/ar עדיין בטקסט הישן — שלב 5.

/** @type {import("../types.js").GlossaryTerm[]} */
export default [
  {
    id: "dna",
    computedIn: ["src/intelligence/core/TradeDNA.js:150"],
    related: ["dnaRisk", "discipline", "dnaConsistency", "dnaGrowth"],
    shownAt: ["src/intelligence/ui/IntelligenceUI.jsx — דשבורד · כרטיס ה-DNA"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "DNA מסחרי",
        short: "ארבעה ציונים 0–100 — ניהול סיכון, משמעת, עקביות וצמיחה — מחושבים מהעסקאות הסגורות שלך.",
        example: "לדוגמה: סיכון ממוצע של 2% לעסקה ⇒ ציון ניהול סיכון 50.",
        caveat: "המשמעת נשענת על הסימון 'עקבתי אחרי התוכנית' — דיווח עצמי.",
        longForm: "ה-DNA המסחרי שלך הוא ארבעה ציונים 0–100, מחושבים מהעסקאות הסגורות:\n\nניהול סיכון — הסיכון הממוצע לעסקה כאחוז מההון. משמעת — אחוז העסקאות שסימנת 'עקבתי אחרי התוכנית'. עקביות — פיזור תוצאות ה-R. צמיחה — שיפוע ה-R המצטבר ב-20 העסקאות האחרונות.\n\nשלושה מהם נמדדים מהעסקאות; המשמעת היא דיווח עצמי. ציון שאין לו נתונים מוצג כ-—, לא כ-50.",
      },
      en: {
        label: "Trading DNA",
        short: "Four 0–100 scores — risk, discipline, consistency, growth — from your closed trades.",
        example: "Example: 2% average risk per trade ⇒ risk score 50.",
        caveat: "Discipline is the self-reported 'followed my plan' flag.",
        longForm: "Your Trading DNA is four 0–100 scores computed from your closed trades:\n\nRisk management — your average risk per trade as a percentage of capital. Discipline — the share of trades you marked 'followed my plan'. Consistency — the spread of your R outcomes. Growth — the slope of cumulative R over your last 20 trades.\n\nThree are measured from the trades; discipline is a self-report. A score with no data shows as —, never as 50.",
      },
      es: {
        label: "Trading DNA",
        short: "Tu Trading DNA mide 4 dimensiones centrales de tu personalidad como trader:\n\n• Gestión de Riesgo (0-100): Qué tan bien controlas las pérdidas\n• Disciplina (0-100): ¿Sigues tus reglas?\n• Consistencia (0-100): Resultados estables en distintas condiciones\n• Crecimiento (0-100): ¿Estás mejorando con el tiempo?\n\nBasado en tu historial real de operaciones — no en autoevaluación.",
      },
      pt: {
        label: "Trading DNA",
        short: "O teu Trading DNA mede 4 dimensões centrais da tua personalidade como trader:\n\n• Gestão de Risco (0-100): Quão bem controlas as perdas\n• Disciplina (0-100): Segues as tuas regras?\n• Consistência (0-100): Resultados estáveis em diferentes condições\n• Crescimento (0-100): Estás a melhorar com o tempo?\n\nBaseado no teu histórico real de operações — não em autoavaliação.",
      },
      ar: {
        label: "Trading DNA",
        short: "يقيس Trading DNA الخاص بك 4 أبعاد أساسية لشخصيتك كمتداول:\n\n• إدارة المخاطر (0-100): مدى تحكّمك في الخسائر\n• الانضباط (0-100): هل تتّبع قواعدك؟\n• الاتّساق (0-100): نتائج مستقرّة عبر ظروف مختلفة\n• النموّ (0-100): هل تتحسّن مع الوقت؟\n\nمبني على سجلّ صفقاتك الحقيقي — لا على التقييم الذاتي.",
      },
    },
  },
  {
    id: "edge",
    computedIn: ["src/lib/tradingStats.js:538"],
    sources: ["WILSON"],
    related: ["antiEdge", "wilson"],
    shownAt: ["SwingEdge_App.jsx — דשבורד · אנליטיקס · כרטיסי Edge", "src/intelligence/ui/IntelligenceUI.jsx — כרטיס Edge", "src/components/LandingPage.jsx — דף הנחיתה · הדגשת מונח"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "Edge",
        short: "צירופי סטאפ ורגש שבהם אחוז ההצלחה וה-R שלך הכי חזקים, מדורגים לפי ציון Wilson.",
        example: "לדוגמה: Breakout + Calm · 4 רווחיות מ-5 · R ממוצע \u200e+1.2R.",
        caveat: "דרושות 3 עסקאות לפחות; זה דירוג, לא מבחן מובהקות.",
        longForm: "ה-Edge שלך — עד 5 צירופי סטאפ × רגש שבהם הביצועים שלך הכי חזקים, לפי היסטוריית העסקאות.\n\nצירוף נכנס רק אם יש לו 3 עסקאות לפחות, והדירוג הוא ציון Wilson של אחוז ההצלחה כפול (1 + R ממוצע). זה דירוג יחסי ולא מבחן מובהקות סטטיסטית — במדגם קטן, Edge יכול להיעלם.",
      },
      en: {
        label: "Edge",
        short: "Setup-and-emotion pairs where your win rate and R are strongest, ranked by Wilson score.",
        example: "Example: Breakout + Calm · 4 of 5 won · average +1.2R.",
        caveat: "Needs 3+ trades; a ranking, not a significance test.",
        longForm: "Your Edge — up to 5 setup × emotion pairs where your results are strongest, from your trade history.\n\nA pair qualifies only with at least 3 trades, and it is ranked by the Wilson score of its win rate times (1 + average R). It is a relative ranking, not a statistical significance test — on a small sample an edge can disappear.",
      },
      es: {
        label: "Edge",
        short: "Tu Edge — setups donde tienes una ventaja estadísticamente significativa según tu historial real de operaciones.\n\nAlta win rate + R promedio positivo = edge real. Estos son los setups que más deberías operar. El mercado te paga por hacerlos.",
      },
      pt: {
        label: "Edge",
        short: "O teu Edge — setups onde tens uma vantagem estatisticamente significativa segundo o teu histórico real de operações.\n\nWin rate alta + R médio positivo = edge real. Estes são os setups que mais deves operar. O mercado paga-te para os fazeres.",
      },
      ar: {
        label: "Edge",
        short: "الـ Edge الخاص بك — نماذج دخول تملك فيها أفضلية ذات دلالة إحصائية بناءً على سجلّ صفقاتك الحقيقي.\n\nنسبة ربح عالية + متوسّط R موجب = أفضلية حقيقية. هذه النماذج هي التي يجب أن تتداولها أكثر. السوق يدفع لك مقابل تنفيذها.",
      },
    },
  },
  {
    id: "antiEdge",
    computedIn: ["src/lib/tradingStats.js:538"],
    sources: ["WILSON"],
    related: ["edge"],
    shownAt: ["SwingEdge_App.jsx — דשבורד · אנליטיקס · כרטיסי Edge", "src/intelligence/ui/IntelligenceUI.jsx — כרטיס Edge"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "Anti-Edge",
        short: "צירופי סטאפ ורגש שבהם אחוז ההצלחה שלך מתחת ל-50% או ה-R הממוצע שלילי.",
        example: "לדוגמה: Breakout + FOMO · רווח אחד מ-4 · R ממוצע \u200e−0.8R.",
        caveat: "דרושות 2 עסקאות לפחות; מוצגים עד 5.",
        longForm: "Anti-Edge — עד 5 צירופי סטאפ × רגש שבהם אחוז ההצלחה מתחת ל-50% או ה-R הממוצע שלילי, בצירוף של 2 עסקאות לפחות.\n\nתתקן אותם (תבין למה הם נכשלים אצלך) או תפסיק לסחור אותם. הימנעות מ-Anti-Edge חשובה כמו ניצול Edge.",
      },
      en: {
        label: "Anti-Edge",
        short: "Setup-and-emotion pairs where your win rate is below 50% or your average R is negative.",
        example: "Example: Breakout + FOMO · 1 win out of 4 · average R −0.8R.",
        caveat: "Needs at least 2 trades; up to 5 are shown.",
        longForm: "Anti-Edge — up to 5 setup × emotion pairs where your win rate is below 50% or your average R is negative, for pairs with at least 2 trades.\n\nEither fix them (study why they fail for you) or stop trading them. Avoiding anti-edges is as important as exploiting edges.",
      },
      es: {
        label: "Anti-Edge",
        short: "Anti-Edge — setups donde pierdes dinero de forma consistente según tu historial de operaciones.\n\nWin rate baja + R negativo = tu anti-edge personal. O corriges estos setups (estudia por qué te fallan) o dejas de operarlos por completo.\n\nEvitar los anti-edges es tan importante como explotar los edges.",
      },
      pt: {
        label: "Anti-Edge",
        short: "Anti-Edge — setups onde perdes dinheiro de forma consistente segundo o teu histórico de operações.\n\nWin rate baixa + R negativo = o teu anti-edge pessoal. Ou corriges estes setups (estuda por que te falham) ou deixas de os operar por completo.\n\nEvitar os anti-edges é tão importante como explorar os edges.",
      },
      ar: {
        label: "Anti-Edge",
        short: "Anti-Edge — نماذج دخول تخسر فيها المال باستمرار بناءً على سجلّ صفقاتك.\n\nنسبة ربح منخفضة + R سالب = الأنتي-إيدج الشخصي لديك. إمّا أن تُصلح هذه النماذج (ادرس لماذا تفشل معك) أو تتوقّف عن تداولها نهائياً.\n\nتجنّب الأنتي-إيدج لا يقلّ أهمية عن استغلال الإيدج.",
      },
    },
  },
  {
    id: "tilt",
    computedIn: ["src/intelligence/core/TiltProtection.js:76"],
    sources: ["DOUGLAS", "STEEN"],
    related: ["emotionAngry", "winStreak"],
    shownAt: ["src/intelligence/ui/IntelligenceUI.jsx — דשבורד · Tilt Shield", "src/components/LandingPage.jsx — דף הנחיתה · הדגשת מונח"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "Tilt",
        short: "מצב רגשי שמוציא אותך מהכללים שלך — לרוב אחרי הפסדים — ומוביל למסחר נקמה.",
        example: "לדוגמה: 3 הפסדים ברצף ⇒ Tilt Shield מתריע לפני העסקה הבאה.",
        caveat: "כלל אצבע: הפסקה אחרי 2 הפסדים רצופים.",
        longForm: "Tilt — מצב רגשי שגורם לסטייה מכללי המסחר שלך. נפוץ אחרי הפסדים גדולים, פספוס תנועה גדולה, או רצף רווחים שיוצר ביטחון-יתר.\n\nסימנים: הגדלת פוזיציה, מסחר תכוף יותר, התעלמות מסטופים. Tilt Shield מתריע על 3 הפסדים ברצף ומעלה, על עסקה זמן קצר אחרי הפסד, על 4 עסקאות ומעלה ביום, על מסחר מחוץ לשעות ועל 2 חריגות מהתוכנית בשבוע.\n\nכלל אצבע: הפסקה אחרי 2 הפסדים רצופים.",
      },
      en: {
        label: "Tilt",
        short: "An emotional state that pushes you off your rules, usually after losses.",
        example: "Example: 3 losses in a row ⇒ Tilt Shield warns before the next trade.",
        caveat: "Rule of thumb: take a break after 2 consecutive losses.",
        longForm: "Tilt — an emotional state that makes you deviate from your trading rules. Common after large losses, missing a big move, or a winning streak that breeds overconfidence.\n\nSigns: larger positions, more frequent trades, ignored stops. Tilt Shield warns on 3+ losses in a row, a trade soon after a loss, 4+ trades in a day, trading outside your hours, and 2 plan deviations in a week.\n\nRule of thumb: take a break after 2 consecutive losses.",
      },
      es: {
        label: "Tilt",
        short: "Tilt — estado emocional que te hace desviarte de tus reglas de trading.\n\nComún tras: grandes pérdidas, perderte un gran movimiento, o una racha de ganancias que genera exceso de confianza.\n\nSeñales: aumentar el tamaño de posición, operar con más frecuencia, ignorar los stops.\n\nPrevención: pausa obligatoria tras 2+ pérdidas consecutivas.",
      },
      pt: {
        label: "Tilt",
        short: "Tilt — estado emocional que te faz desviar das tuas regras de trading.\n\nComum após: grandes perdas, perder um grande movimento, ou uma sequência de ganhos que gera excesso de confiança.\n\nSinais: aumentar o tamanho de posição, operar com mais frequência, ignorar os stops.\n\nPrevenção: pausa obrigatória após 2+ perdas consecutivas.",
      },
      ar: {
        label: "Tilt",
        short: "Tilt — حالة عاطفية تجعلك تنحرف عن قواعد تداولك.\n\nشائعة بعد: خسائر كبيرة، أو تفويت حركة كبيرة، أو سلسلة انتصارات تولّد ثقة مفرطة.\n\nالعلامات: زيادة حجم الصفقة، التداول بوتيرة أعلى، تجاهل أوامر الوقف.\n\nالوقاية: استراحة إلزامية بعد خسارتين متتاليتين أو أكثر.",
      },
    },
  },
  {
    id: "marketRegime",
    computedIn: ["src/intelligence/core/MarketRegime.js"],
    sources: ["MURPHY"],
    related: ["dna"],
    shownAt: ["src/components/EditTradeModal.jsx — עריכת עסקה · מצב שוק", "src/intelligence/ui/IntelligenceUI.jsx — דשבורד · מחוון מצב שוק"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "מצב שוק",
        short: "סביבת השוק, נקראת מ-SPY/QQQ מול ממוצע 20 יום, מרוחב הסקטורים ומהתנודתיות.",
        example: "לדוגמה: מחיר מעל ממוצע 20 יום עולה ורוב הסקטורים עולים ⇒ שוק עולה.",
        caveat: "מבוסס מחירי שוק, לא העסקאות שלך.",
        longForm: "מצב שוק — סביבת השוק הנוכחית, נקראת מפעולת מחיר אמיתית (לא מהעסקאות שלך). מחושב מ-SPY/QQQ מול הממוצע הנע ל-20 יום, אחוז מגמה, כמה סקטורים עולים (רוחב שוק) ותנודתיות ממומשת.\n\n• שוק עולה: המחיר מעל ממוצע נע עולה ל-20 יום עם השתתפות רחבה. העדף פריצות ותיקונים.\n• שוק יורד: המחיר מתחת לממוצע נע יורד ל-20 יום, חולשה רחבה. העדף שורטים או שב בצד.\n• שוק צדדי/טווח: אין מגמה נטו — המחיר תקוע בין תמיכה להתנגדות. סחור בקצוות, הימנע מפריצות.\n• תנודתיות גבוהה: תנודות יומיות חדות שולטות. כלל אצבע: הקטן גודל בכ-50% והרחב סטופים.\n• תנודתיות נמוכה: שוק שקט ודחוס — צפה לתנועות קטנות.\n\nמציג 'נתונים לא מספיקים' כשאין מספיק היסטוריית מחירים לסיווג.",
      },
      en: {
        label: "Market Regime",
        short: "The market environment, read from SPY/QQQ versus their 20-day average, sector breadth and volatility.",
        example: "Example: price above a rising 20-day average with most sectors rising ⇒ Bull Trend.",
        caveat: "Based on market prices, not your trades.",
        longForm: "Market Regime — the current market environment, read from real price action (not your trades). Computed from SPY/QQQ versus their 20-day average, trend %, how many sector ETFs are rising (breadth) and realized volatility.\n\n• Bull Trend: price above a rising 20-day average with broad participation. Favor breakouts and pullbacks.\n• Bear Trend: price below a falling 20-day average, broad weakness. Favor shorts or stand aside.\n• Choppy/Range: no net trend — price stuck between support and resistance. Fade the extremes, avoid breakouts.\n• High Volatility: large daily swings dominate. Rule of thumb: cut size ~50% and widen stops.\n• Low Volatility: quiet, coiled tape — expect small moves.\n\nShows 'insufficient data' when there isn't enough price history to classify.",
      },
      es: {
        label: "Régimen de Mercado",
        short: "Régimen de Mercado — el entorno de mercado actual, leído de la acción real del precio (no de tus operaciones). Se calcula con SPY/QQQ frente a su media de 20 días, el % de tendencia, cuántos ETF sectoriales suben (amplitud) y la volatilidad realizada.\n\n• Tendencia Alcista: Tendencia al alza — precio por encima de una media de 20 días creciente con participación amplia. Favorece breakouts y pullbacks.\n• Tendencia Bajista: Tendencia a la baja — precio por debajo de una media de 20 días decreciente, debilidad amplia. Favorece cortos o mantente al margen.\n• Lateral/Rango: Sin tendencia neta — precio atrapado entre soporte y resistencia. Opera los extremos, evita breakouts.\n• Alta Volatilidad: Dominan los fuertes vaivenes diarios. Reduce tamaño ~50% y amplía stops.\n• Baja Volatilidad: Mercado tranquilo y comprimido — espera movimientos pequeños.\n\nMuestra 'Datos insuficientes' cuando no hay suficiente historial de precios para clasificar.",
      },
      pt: {
        label: "Regime de Mercado",
        short: "Regime de Mercado — o ambiente de mercado atual, lido da ação real do preço (não das tuas operações). Calculado a partir de SPY/QQQ face à média de 20 dias, % de tendência, quantos ETF setoriais sobem (amplitude) e volatilidade realizada.\n\n• Tendência de Alta: Tendência de subida — preço acima de uma média de 20 dias ascendente com participação ampla. Favorece breakouts e pullbacks.\n• Tendência de Baixa: Tendência de descida — preço abaixo de uma média de 20 dias descendente, fraqueza ampla. Favorece vendas ou fica de fora.\n• Lateral/Range: Sem tendência líquida — preço preso entre suporte e resistência. Opera os extremos, evita breakouts.\n• Alta Volatilidade: Dominam as fortes oscilações diárias. Reduz tamanho ~50% e amplia stops.\n• Baixa Volatilidade: Mercado calmo e comprimido — espera movimentos pequenos.\n\nMostra 'Dados insuficientes' quando não há histórico de preços suficiente para classificar.",
      },
      ar: {
        label: "نظام السوق",
        short: "نظام السوق — بيئة السوق الحالية، تُقرأ من حركة السعر الحقيقية (وليس من صفقاتك). يُحسب من SPY/QQQ مقابل متوسّطها المتحرّك لـ20 يومًا، ونسبة الاتجاه، وكم قطاعًا يرتفع (اتساع السوق)، والتقلّب المحقَّق.\n\n• اتجاه صاعد: اتجاه صعودي — السعر فوق متوسّط 20 يومًا صاعد بمشاركة واسعة. فضّل الاختراقات والتراجعات.\n• اتجاه هابط: اتجاه هبوطي — السعر تحت متوسّط 20 يومًا هابط، ضعف واسع. فضّل البيع أو ابقَ جانبًا.\n• عرضي/نطاق: لا اتجاه صافٍ — السعر محصور بين الدعم والمقاومة. تاجر عند الأطراف وتجنّب الاختراقات.\n• تقلّب عالٍ: تسيطر التذبذبات اليومية الحادة. قلّل الحجم ~50% ووسّع أوامر الوقف.\n• تقلّب منخفض: سوق هادئ ومضغوط — توقّع حركات صغيرة.\n\nيعرض 'بيانات غير كافية' عند عدم توفّر تاريخ أسعار كافٍ للتصنيف.",
      },
    },
  },
  {
    id: "discipline",
    computedIn: ["src/intelligence/utils/psychologyPatterns.js:106"],
    related: ["dna", "grade", "entryQuality"],
    shownAt: ["src/intelligence/ui/IntelligenceUI.jsx — דשבורד · כרטיס ה-DNA · שורה"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "משמעת",
        short: "אחוז העסקאות הסגורות שסימנת בהן 'עקבתי אחרי התוכנית'.",
        example: "לדוגמה: סימנת 'כן' ב-8 מתוך 10 ⇒ 80.",
        caveat: "דיווח עצמי; עסקה שלא סומנה לא נספרת.",
        longForm: "אחוז העסקאות הסגורות שסימנת בהן 'עקבתי אחרי התוכנית' — סטופ, גודל פוזיציה ויעד, בלי לסטות מרגש. עסקה שלא סומנה לא נספרת במכנה.\n\nזה דיווח עצמי: המערכת לא בודקת אם הסטופ כובד בפועל.",
      },
      en: {
        label: "Discipline",
        short: "The share of your closed trades you marked 'followed my plan'.",
        example: "Example: you marked 'yes' on 8 of 10 ⇒ 80.",
        caveat: "Self-reported; an unmarked trade is not counted.",
        longForm: "The share of your closed trades you marked 'followed my plan' — stop, size and target, without emotional deviation. An unmarked trade is not in the denominator.\n\nIt is a self-report: the app does not check whether the stop was actually honored.",
      },
      es: {
        label: "Disciplina",
        short: "Si seguiste tu plan — stop, tamaño, objetivo — sin desviación emocional. El núcleo de la rentabilidad a largo plazo.",
      },
      pt: {
        label: "Disciplina",
        short: "Se seguiste o teu plano — stop, tamanho, alvo — sem desvio emocional. O núcleo da rentabilidade a longo prazo.",
      },
      ar: {
        label: "الانضباط",
        short: "ما إذا كنت اتّبعت خطّتك — وقف الخسارة، الحجم، الهدف — دون انحراف عاطفي. جوهر الربحية على المدى الطويل.",
      },
    },
  },
  {
    id: "dnaRisk",
    computedIn: ["src/intelligence/core/TradeDNA.js:164"],
    related: ["dna", "riskPerTrade"],
    shownAt: ["src/intelligence/ui/IntelligenceUI.jsx — דשבורד · כרטיס ה-DNA · שורה"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "ניהול סיכון",
        short: "ציון 0–100 לפי הסיכון הממוצע לעסקה, כאחוז מההון בעת הכניסה.",
        example: "לדוגמה: 1% ומטה ⇒ 100 · 2% ⇒ 50 · 3% ומעלה ⇒ 0.",
        caveat: "לא מודד אם כיבדת את הסטופ.",
        longForm: "ציון ניהול הסיכון נגזר מהסיכון הממוצע לעסקה — המרחק לסטופ × מספר המניות, כאחוז מההון בעת הכניסה. עד 1% — 100; כל אחוז מעל זה מוריד 50 נקודות; מ-3% ומעלה — 0.\n\nהוא לא מודד אם כיבדת את הסטופ או אם גודל הפוזיציה אחיד — רק כמה סיכנת בממוצע.",
      },
      en: {
        label: "Risk management",
        short: "A 0–100 score from your average risk per trade as a percentage of capital.",
        example: "Example: 1% or less ⇒ 100 · 2% ⇒ 50 · 3%+ ⇒ 0.",
        caveat: "Does not measure whether you honored the stop.",
        longForm: "The risk score comes from your average risk per trade — distance to stop × shares, as a percentage of capital at entry. Up to 1% scores 100; each percentage point above that removes 50; 3% or more scores 0.\n\nIt does not measure whether you honored the stop or kept position size uniform — only how much you risked on average.",
      },
      es: {
        label: "Risk",
        short: "Mide cuán consistente eres gestionando el riesgo: tamaño de posición uniforme, respetar los stops y no superar el riesgo planificado por operación. Una puntuación baja significa riesgo inconsistente, la mayor amenaza para una cuenta.",
      },
      pt: {
        label: "Risk",
        short: "Mede o quão consistente você é na gestão de risco: tamanho de posição uniforme, respeitar os stops e não exceder o risco planeado por operação. Uma pontuação baixa significa risco inconsistente — a maior ameaça a uma conta.",
      },
      ar: {
        label: "Risk",
        short: "يقيس مدى اتّساقك في إدارة المخاطر: حجم صفقة موحّد، واحترام أوامر وقف الخسارة، وعدم تجاوز المخاطرة المخطّطة لكل صفقة. الدرجة المنخفضة تعني مخاطرة غير متّسقة — وهي أكبر تهديد للحساب.",
      },
    },
  },
  {
    id: "dnaConsistency",
    computedIn: ["src/intelligence/core/TradeDNA.js:190"],
    related: ["dna", "sharpe"],
    shownAt: ["src/intelligence/ui/IntelligenceUI.jsx — דשבורד · כרטיס ה-DNA · שורה"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "עקביות",
        short: "ציון 0–100 לפי פיזור תוצאות ה-R שלך: פיזור קטן = ציון גבוה.",
        example: "לדוגמה: סטיית תקן 0R ⇒ 100 · 1.5R ⇒ 50 · 3R ומעלה ⇒ 0.",
        caveat: "דרושות 2 עסקאות עם R לפחות.",
        longForm: "ציון העקביות נגזר מסטיית התקן של תוצאות ה-R בעסקאות סגורות עם סטופ: 1 − (סטיית תקן ÷ 3), ומ-3R ומעלה — 0.\n\nציון גבוה = תוצאות דומות זו לזו; נמוך = תוצאות שתלויות בכמה עסקאות קיצוניות. דרושות 2 עסקאות עם R לפחות, אחרת מוצג —.",
      },
      en: {
        label: "Consistency",
        short: "A 0–100 score from the spread of your R outcomes; less spread scores higher.",
        example: "Example: standard deviation 0R ⇒ 100 · 1.5R ⇒ 50 · 3R+ ⇒ 0.",
        caveat: "Needs 2+ trades with an R.",
        longForm: "The consistency score comes from the standard deviation of R across closed trades with a stop: 1 − (standard deviation ÷ 3), and 0 from 3R up.\n\nHigh means outcomes that resemble each other; low means results that hinge on a few extreme trades. It needs at least 2 trades with an R, otherwise it shows —.",
      },
      es: {
        label: "Consistency",
        short: "Mide la estabilidad de tu rendimiento a lo largo del tiempo: si los resultados son uniformes o dependen de unas pocas operaciones enormes. Alta consistencia es un método fiable; baja, resultados aleatorios.",
      },
      pt: {
        label: "Consistency",
        short: "Mede a estabilidade do seu desempenho ao longo do tempo: se os resultados são uniformes ou dependem de poucas operações enormes. Alta consistência é um método confiável; baixa, resultados aleatórios.",
      },
      ar: {
        label: "Consistency",
        short: "يقيس استقرار أدائك عبر الزمن: هل النتائج متّسقة أم تعتمد على عدد قليل من الصفقات الضخمة. الاتّساق العالي يعني منهجاً يمكن الاعتماد عليه؛ والمنخفض يعني نتائج عشوائية.",
      },
    },
  },
  {
    id: "dnaGrowth",
    computedIn: ["src/intelligence/core/TradeDNA.js:199"],
    related: ["dna", "equityCurve"],
    shownAt: ["src/intelligence/ui/IntelligenceUI.jsx — דשבורד · כרטיס ה-DNA · שורה"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "צמיחה",
        short: "ציון 0–100 לפי שיפוע ה-R המצטבר ב-20 העסקאות הסגורות האחרונות; 50 = שטוח.",
        example: "לדוגמה: R מצטבר שעולה בכ-\u200e+0.5R לעסקה ⇒ כ-75.",
        caveat: "מעל \u200e+1R לעסקה ⇒ 100; מתחת ל-\u200e−1R ⇒ 0.",
        longForm: "ציון הצמיחה נגזר משיפוע ה-R המצטבר ב-20 העסקאות הסגורות האחרונות עם סטופ. שיפוע אפס = 50; שיפוע של \u200e+1R לעסקה ומעלה = 100; \u200e−1R ומטה = 0.\n\nהוא מודד מגמה בתוצאות, לא למידה: ציון עולה אומר שה-R המצטבר עולה בעסקאות האחרונות.",
      },
      en: {
        label: "Growth",
        short: "A 0–100 score from the slope of cumulative R over your last 20 closed trades; 50 = flat.",
        example: "Example: cumulative R rising about +0.5R per trade ⇒ about 75.",
        caveat: "Above +1R per trade ⇒ 100; below −1R ⇒ 0.",
        longForm: "The growth score comes from the slope of cumulative R over your last 20 closed trades with a stop. A flat slope = 50; +1R per trade or more = 100; −1R or less = 0.\n\nIt measures a trend in results, not learning: a rising score means cumulative R is climbing over your recent trades.",
      },
      es: {
        label: "Growth",
        short: "Mide tu tendencia de mejora: si aprendes de los datos y mejoras con el tiempo, o repites los mismos errores. Una puntuación creciente es la curva correcta para un trader en desarrollo.",
      },
      pt: {
        label: "Growth",
        short: "Mede a sua tendência de melhoria: se aprende com os dados e melhora ao longo do tempo, ou repete os mesmos erros. Uma pontuação crescente é a curva certa para um trader em desenvolvimento.",
      },
      ar: {
        label: "Growth",
        short: "يقيس اتجاه تحسّنك: هل تتعلّم من البيانات وتتحسّن مع الوقت، أم تكرّر الأخطاء نفسها. الدرجة المتصاعدة هي المنحنى الصحيح للمتداول الذي يتطوّر.",
      },
    },
  },
  {
    id: "setup",
    related: ["performanceBySetup", "breakout"],
    shownAt: ["src/components/LandingPage.jsx — דף הנחיתה · הדגשת מונח"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "סטאפ (Setup)",
        short: "תבנית הכניסה לעסקה — התנאים המדויקים שבהם נכנסת לפוזיציה.",
        example: "לדוגמה: Breakout, Pullback או Bull Flag.",
      },
      en: {
        label: "Setup",
        short: "Your entry pattern — the exact conditions under which you take a position.",
        example: "Example: Breakout, Pullback or Bull Flag.",
      },
      es: {
        label: "Setup",
        short: "Your entry pattern — the exact conditions under which you take a position.\nExample: Breakout, Pullback or Bull Flag.",
      },
      pt: {
        label: "Setup",
        short: "Your entry pattern — the exact conditions under which you take a position.\nExample: Breakout, Pullback or Bull Flag.",
      },
      ar: {
        label: "Setup",
        short: "Your entry pattern — the exact conditions under which you take a position.\nExample: Breakout, Pullback or Bull Flag.",
      },
    },
  },
];
