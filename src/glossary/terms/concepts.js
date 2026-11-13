// src/glossary/terms/concepts.js — מושגים / AI
// ⛔ מקור האמת היחיד למונחים האלה. עריכה כאן ⇒ `npm run glossary` באותו קומיט (test:glossary תופס סחיפה).

/** @type {import("../types.js").GlossaryTerm[]} */
export default [
  {
    id: "dna",
    i18n: {
      he: {
        label: "DNA מסחרי",
        short: "ה-DNA המסחרי שלך מודד 4 ממדים מרכזיים:\n\n• ניהול סיכון (0-100): כמה טוב אתה שולט בהפסדים\n• משמעת (0-100): האם אתה עוקב אחר הכללים שלך?\n• עקביות (0-100): תוצאות יציבות בתנאים שונים\n• צמיחה (0-100): האם אתה משתפר לאורך זמן?\n\nמבוסס על היסטוריית העסקאות האמיתית שלך — לא הערכה עצמית.",
      },
      en: {
        label: "Trading DNA",
        short: "Your Trading DNA measures 4 core dimensions of your trading personality:\n\n• Risk Management (0-100): How well you control losses\n• Discipline (0-100): Do you follow your rules?\n• Consistency (0-100): Stable results across different conditions\n• Growth (0-100): Are you improving over time?\n\nBased on your actual trade history — not self-assessment.",
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
    i18n: {
      he: {
        label: "Edge",
        short: "ה-Edge שלך — סטאפים שבהם יש לך יתרון סטטיסטי משמעותי לפי היסטוריית העסקאות האמיתית שלך.\n\nאחוז זכייה גבוה + R ממוצע חיובי = Edge אמיתי. אלה הסטאפים שעליך לסחור הכי הרבה. השוק משלם לך על אלה.",
      },
      en: {
        label: "Edge",
        short: "Your Edge — setups where you have a statistically significant advantage based on your actual trade history.\n\nHigh win rate + positive average R = real edge. These are the setups you should trade most. The market is paying you to do these.",
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
    i18n: {
      he: {
        label: "Anti-Edge",
        short: "Anti-Edge — סטאפים שבהם אתה מפסיד כסף באופן עקבי לפי היסטוריית העסקאות שלך.\n\nאחוז זכייה נמוך + R שלילי = ה-Anti-Edge האישי שלך. תתקן אותם (תלמד למה הם נכשלים עבורך) או תפסיק לסחור אותם לחלוטין.\n\nהימנעות מ-Anti-Edge חשובה כמו ניצול Edge.",
      },
      en: {
        label: "Anti-Edge",
        short: "Anti-Edge — setups where you consistently lose money based on your trade history.\n\nLow win rate + negative R = your personal anti-edge. Either fix these setups (study why they fail for you) or stop trading them entirely.\n\nAvoiding anti-edges is as important as exploiting edges.",
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
    i18n: {
      he: {
        label: "Tilt",
        short: "Tilt — מצב רגשי שגורם לסטייה מכללי המסחר שלך.\n\nנפוץ אחרי: הפסדים גדולים, פספוס תנועה גדולה, או סדרת ניצחונות שיוצרת בטחון יתר.\n\nסימנים: הגדלת גודל פוזיציה, מסחר תכוף יותר, התעלמות מסטופים.\n\nמניעה: הפסקה חובה אחרי 2+ הפסדים רצופים.",
      },
      en: {
        label: "Tilt",
        short: "Tilt — emotional state that causes you to deviate from your trading rules.\n\nCommon after: large losses, missing a big move, or a string of wins creating overconfidence.\n\nSigns: increasing position size, trading more frequently, ignoring stops.\n\nPrevention: mandatory break after 2+ consecutive losses.",
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
    i18n: {
      he: {
        label: "מצב שוק",
        short: "מצב שוק — סביבת השוק הנוכחית, נקראת מפעולת מחיר אמיתית (לא מהעסקאות שלך). מחושב מ-SPY/QQQ מול הממוצע הנע ל-20 יום, אחוז מגמה, כמה סקטורים עולים (רוחב שוק), ותנודתיות ממומשת.\n\n• שוק עולה: מגמת עלייה — המחיר מעל ממוצע נע עולה ל-20 יום עם השתתפות רחבה. העדף פריצות ותיקונים.\n• שוק יורד: מגמת ירידה — המחיר מתחת לממוצע נע יורד ל-20 יום, חולשה רחבה. העדף שורטים או שב בצד.\n• שוק צדדי/טווח: אין מגמה נטו — המחיר תקוע בין תמיכה להתנגדות. סחור בקצוות, הימנע מפריצות.\n• תנודתיות גבוהה: תנודות יומיות חדות שולטות. הקטן גודל ב-50% והרחב סטופים.\n• תנודתיות נמוכה: שוק שקט ודחוס — צפה לתנועות קטנות.\n\nמציג 'נתונים לא מספיקים' כשאין מספיק היסטוריית מחירים לסיווג.",
      },
      en: {
        label: "Market Regime",
        short: "Market Regime — the current market environment, read from real price action (not your trades). Computed from SPY/QQQ vs their 20-day average, trend %, how many sector ETFs are rising (breadth), and realized volatility.\n\n• Bull Trend: Uptrend — price above a rising 20-day average with broad participation. Favor breakouts and pullbacks.\n• Bear Trend: Downtrend — price below a falling 20-day average, broad weakness. Favor shorts or stand aside.\n• Choppy/Range: No net trend — price stuck between support and resistance. Fade the extremes, avoid breakouts.\n• High Volatility: Large daily swings dominate. Cut size ~50% and widen stops.\n• Low Volatility: Quiet, coiled tape — expect small moves.\n\nShows 'insufficient data' when there isn't enough price history to classify.",
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
    i18n: {
      he: {
        label: "משמעת",
        short: "האם עקבת אחרי התוכנית: סטופ, גודל פוזיציה ויעד — בלי לסטות מרגש. הליבה של רווחיות לאורך זמן.",
      },
      en: {
        label: "Discipline",
        short: "Whether you followed your plan — stop, size, target — without emotional deviation. The core of long-term profitability.",
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
    i18n: {
      he: {
        label: "Risk",
        short: "מודד עד כמה אתה עקבי בניהול סיכון: גודל פוזיציה אחיד, הקפדה על stop, ואי-חריגה מהסיכון המתוכנן לעסקה. ציון נמוך = סיכון לא עקבי, הסכנה הגדולה ביותר לחשבון.",
      },
      en: {
        label: "Risk",
        short: "Measures how consistent you are at managing risk: uniform position size, respecting stops, and not exceeding your planned per-trade risk. A low score means inconsistent risk — the single biggest threat to an account.",
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
    i18n: {
      he: {
        label: "Consistency",
        short: "מודד את יציבות הביצועים לאורך זמן: האם התוצאות אחידות, או תלויות בכמה עסקאות ענק. עקביות גבוהה = שיטה שניתן לסמוך עליה; נמוכה = תוצאות אקראיות.",
      },
      en: {
        label: "Consistency",
        short: "Measures the stability of your performance over time: are results uniform, or dependent on a few huge trades. High consistency means a method you can rely on; low means random results.",
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
    i18n: {
      he: {
        label: "Growth",
        short: "מודד את מגמת השיפור שלך: האם אתה לומד מהנתונים ומשתפר לאורך זמן, או חוזר על אותן טעויות. ציון עולה = העקומה הנכונה לסוחר מתפתח.",
      },
      en: {
        label: "Growth",
        short: "Measures your improvement trend: are you learning from the data and getting better over time, or repeating the same mistakes. A rising score is the right curve for a developing trader.",
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
];
