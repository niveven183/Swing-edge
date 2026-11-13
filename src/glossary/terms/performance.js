// src/glossary/terms/performance.js — מדדי ביצוע
// ⛔ מקור האמת היחיד למונחים האלה. עריכה כאן ⇒ `npm run glossary` באותו קומיט (test:glossary תופס סחיפה).
// פורמט (גל 3): short = הגדרה במשפט אחד ≤18 מילים · example = "לדוגמה:"/"Example:" במספרים היפותטיים · caveat אחד לכל היותר · longForm = הטקסט המלא (מודאל המילון).
// pendingTranslation: es/pt/ar עדיין בטקסט הישן — שלב 5.

/** @type {import("../types.js").GlossaryTerm[]} */
export default [
  {
    id: "winRate",
    computedIn: ["src/lib/tradingStats.js"],
    related: ["profitFactor", "avgR"],
    shownAt: ["SwingEdge_App.jsx — דשבורד · כרטיס KPI · אנליטיקס", "src/components/MonthlyReportTab.jsx — דוח חודשי · כרטיס", "src/components/LandingPage.jsx — דף הנחיתה · הדגשת מונח"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "אחוז הצלחה",
        short: "אחוז העסקאות הסגורות שהסתיימו ברווח.",
        example: "לדוגמה: 6 רווחיות מתוך 10 סגורות = 60%.",
        caveat: "עסקת Break-even נספרת במכנה ואינה רווח; אחוז הצלחה לבדו אינו מעיד על רווחיות.",
        longForm: "אחוז ההצלחה הוא האחוז מהעסקאות הסגורות שהסתיימו ברווח. עסקת Break-even נספרת במכנה ואינה רווח — השורה שמתחת למספר מציגה כמה כאלה היו.\n\nאחוז הצלחה לבדו לא קובע רווחיות: סוחר עם 40% יכול להיות רווחי אם הרווח הממוצע שלו גדול מההפסד הממוצע. הסתכל גם על Profit Factor ועל R ממוצע.",
      },
      en: {
        label: "Win Rate",
        short: "The share of your closed trades that ended in profit.",
        example: "Example: 6 winners out of 10 closed trades = 60%.",
        caveat: "Break-even trades count in the denominator, not as wins; win rate alone does not show profitability.",
        longForm: "Win Rate is the percentage of your closed trades that ended in profit. A break-even trade counts in the denominator and is not a win — the line under the number shows how many there were.\n\nWin rate alone does not decide profitability: a trader at 40% can be profitable when the average win is larger than the average loss. Look at Profit Factor and Avg R too.",
      },
      es: {
        label: "Tasa de Acierto",
        short: "La Win Rate es el porcentaje de tus operaciones cerradas que terminaron en ganancia.\n\nPor encima del 55% es sólido. Pero la win rate por sí sola no determina el éxito — un trader con 40% puede ser rentable con buenas relaciones riesgo-beneficio. Fíjate también en el Profit Factor.",
      },
      pt: {
        label: "Taxa de Acerto",
        short: "A Win Rate é a percentagem das tuas operações fechadas que terminaram em lucro.\n\nAcima de 55% é sólido. Mas a win rate sozinha não determina o sucesso — um trader com 40% pode ser lucrativo com boas relações risco-retorno. Repara também no Profit Factor.",
      },
      ar: {
        label: "نسبة الربح",
        short: "نسبة الربح (Win Rate) هي النسبة المئوية لصفقاتك المغلقة التي انتهت بربح.\n\nأعلى من 55% جيّدة. لكن نسبة الربح وحدها لا تحدّد النجاح — فمتداول بنسبة 40% قد يكون رابحاً إذا كانت نسب المخاطرة/العائد قوية. انظر أيضاً إلى Profit Factor.",
      },
    },
  },
  {
    id: "profitFactor",
    computedIn: ["src/intelligence/utils/statisticalModels.js:187"],
    sources: ["TRADESTATION"],
    related: ["winRate", "avgWin", "avgLoss"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · כרטיס"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "Profit Factor",
        short: "סך הרווחים הגולמיים חלקי סך ההפסדים הגולמיים בעסקאות הסגורות.",
        example: "לדוגמה: הרווחת $3,000 והפסדת $2,000 ⇒ 1.5; מעל 1 = רווח נקי.",
        caveat: "בלי אף הפסד הערך הוא ∞; מחושב לפני עמלות.",
        longForm: "Profit Factor = סך הרווחים הגולמיים ÷ סך ההפסדים הגולמיים, בעסקאות סגורות.\n\nמעל 1 — המסחר הרוויח נטו; מתחת ל-1 — הפסיד. בלי אף עסקה מפסידה אין במה לחלק, והערך מוצג כ-∞. החישוב לפני עמלות: אין במערכת מודל עמלות.",
      },
      en: {
        label: "Profit Factor",
        short: "Gross profit divided by gross loss across your closed trades.",
        example: "Example: you won $3,000 and lost $2,000 ⇒ 1.5; above 1 means a net profit.",
        caveat: "With no losses at all it reads ∞; computed before commissions.",
        longForm: "Profit Factor = total gross profit ÷ total gross loss, across closed trades.\n\nAbove 1 your trading made money net; below 1 it lost. With no losing trade there is nothing to divide by, so it shows ∞. It is computed before commissions — the app has no commission model.",
      },
      es: {
        label: "Profit Factor",
        short: "Profit Factor = Ganancias Brutas Totales ÷ Pérdidas Brutas Totales.\n\n• Por encima de 1.0 = rentable\n• Por encima de 1.5 = ventaja sana\n• Por encima de 2.0 = nivel profesional\n• Por encima de 3.0 = excepcional\n\nEs una de las métricas más importantes en el trading.",
      },
      pt: {
        label: "Profit Factor",
        short: "Profit Factor = Lucros Brutos Totais ÷ Perdas Brutas Totais.\n\n• Acima de 1.0 = lucrativo\n• Acima de 1.5 = vantagem saudável\n• Acima de 2.0 = nível profissional\n• Acima de 3.0 = excecional\n\nÉ uma das métricas mais importantes no trading.",
      },
      ar: {
        label: "Profit Factor",
        short: "Profit Factor = إجمالي الأرباح ÷ إجمالي الخسائر.\n\n• أعلى من 1.0 = رابح\n• أعلى من 1.5 = أفضلية صحّية\n• أعلى من 2.0 = مستوى احترافي\n• أعلى من 3.0 = استثنائي\n\nمن أهم المقاييس في التداول.",
      },
    },
  },
  {
    id: "avgR",
    computedIn: ["src/utils.js:58"],
    sources: ["THARP"],
    related: ["rMultiple", "stopLoss"],
    shownAt: ["SwingEdge_App.jsx — דשבורד · כרטיס KPI · אנליטיקס", "src/components/MonthlyReportTab.jsx — דוח חודשי · כרטיס"],
    pendingTranslation: ["es", "pt", "ar"],
    mustContain: { he: ["LONG", "SHORT", "0R"], en: ["LONG", "SHORT", "0R"] },
    i18n: {
      he: {
        label: "R ממוצע",
        short: "ממוצע ה-R בעסקאות סגורות עם סטופ; R = רווח ÷ הסיכון הראשוני, לפי הכיוון (LONG או SHORT).",
        example: "לדוגמה: סיכנת $100 והרווחת $150 ⇒ \u200e+1.5R.",
        caveat: "עסקה בלי סטופ מוחרגת מהממוצע ואינה נספרת כ-0R.",
        longForm: "ממוצע R-Multiple לעסקה סגורה.\n\nR = רווח העסקה ÷ הסיכון הראשוני למניה. הרווח נגזר מכיוון העסקה: ב-LONG הוא (יציאה − כניסה), וב-SHORT הוא (כניסה − יציאה) — כך ש-SHORT מנצחת היא תמיד R חיובי. \u200e+1.0R אומר שהרווחת בדיוק כמה שסיכנת.\n\nרק עסקה עם סטופ ניתנת למדידה ב-R — עסקה בלי סטופ מוחרגת מהממוצע, ואינה נספרת כ-0R. השורה מתחת למספר מראה כמה מהעסקאות הסגורות הממוצע באמת מכסה.",
      },
      en: {
        label: "Avg R",
        short: "Average R of closed trades with a stop; R = profit ÷ initial risk, by direction (LONG/SHORT).",
        example: "Example: you risked $100 and made $150 ⇒ +1.5R.",
        caveat: "A trade without a stop is excluded, not counted as 0R.",
        longForm: "Average R-Multiple per closed trade.\n\nR = trade profit ÷ initial risk per share. The profit follows the direction of the trade: on a LONG it is (Exit − Entry), on a SHORT it is (Entry − Exit) — so a winning SHORT is always a positive R. +1.0R means you made exactly what you risked.\n\nOnly trades that had a stop can be measured in R — a trade without one is excluded from this average, not counted as 0R. The line under the number shows how many of your closed trades the average actually covers.",
      },
      es: {
        label: "R Promedio",
        short: "R-Multiple promedio por operación cerrada.\n\nR = ganancia de la operación ÷ riesgo inicial por acción. La ganancia sigue la dirección de la operación: en un LONG es (Salida − Entrada), en un SHORT es (Entrada − Salida) — así que un SHORT ganador siempre da un R positivo.\n\n+1.0R significa que ganaste exactamente lo que arriesgaste. Apunta a +0.3R o más como promedio mínimo. Los traders de élite promedian +1.5R a +2.5R.\n\nSolo las operaciones con stop pueden medirse en R — una operación sin stop se excluye de este promedio, no cuenta como 0R. La línea bajo el número muestra cuántas de tus operaciones cerradas cubre realmente el promedio.",
      },
      pt: {
        label: "R Médio",
        short: "R-Multiple médio por operação fechada.\n\nR = lucro da operação ÷ risco inicial por ação. O lucro segue a direção da operação: num LONG é (Saída − Entrada), num SHORT é (Entrada − Saída) — por isso um SHORT vencedor dá sempre um R positivo.\n\n+1.0R significa que ganhaste exatamente o que arriscaste. Aponta para +0.3R ou mais como média mínima. Traders de elite têm média de +1.5R a +2.5R.\n\nSó as operações com stop podem ser medidas em R — uma operação sem stop é excluída desta média, não conta como 0R. A linha por baixo do número mostra quantas das tuas operações fechadas a média cobre realmente.",
      },
      ar: {
        label: "متوسّط R",
        short: "متوسّط R-Multiple لكل صفقة مغلقة.\n\nR = ربح الصفقة ÷ المخاطرة الأوّلية للسهم. الربح يتبع اتّجاه الصفقة: في LONG هو (الخروج − الدخول)، وفي SHORT هو (الدخول − الخروج) — لذلك فإن SHORT الرابحة تعطي دائماً R موجباً.\n\n+1.0R يعني أنك ربحت تماماً ما خاطرت به. استهدف +0.3R أو أعلى كحدّ أدنى للمتوسّط. متداولو النخبة يحقّقون متوسّط +1.5R إلى +2.5R.\n\nالصفقات التي لها وقف خسارة فقط يمكن قياسها بـ R — الصفقة بلا وقف تُستثنى من هذا المتوسّط ولا تُحتسب كـ 0R. السطر أسفل الرقم يوضّح كم صفقة مغلقة يغطّيها المتوسّط فعلياً.",
      },
    },
  },
  {
    id: "expectancy",
    computedIn: ["src/intelligence/utils/statisticalModels.js:156"],
    sources: ["THARP"],
    related: ["avgR", "winRate"],
    pendingTranslation: ["es", "pt", "ar"],
    glossaryOnly: "מחושב ב-TradeDNA.metrics בלבד; אין מסך שמציג את הערך (הכרעת ניב 13.11)",
    i18n: {
      he: {
        label: "תוחלת",
        short: "כמה R הרווחת בממוצע לעסקה סגורה, כשעסקאות Break-even נספרות במכנה.",
        example: "לדוגמה: חצי רווחים של \u200e+2R וחצי הפסדים של \u200e−1R ⇒ \u200e+0.5R לעסקה.",
        caveat: "נמדד ב-R ולא בדולרים.",
        longForm: "תוחלת = (אחוז הצלחה × R ממוצע ברווח) − (אחוז הפסד × R ממוצע בהפסד), כשעסקאות Break-even נספרות במכנה.\n\nהיא מראה כמה R אתה מצפה להרוויח בממוצע לעסקה. חיובית — יש לך Edge; שלילית — אתה מפסיד לאורך זמן בלי קשר לרווחים בודדים. המדידה ב-R ולא בדולרים, כך שהיא לא תלויה בגודל הפוזיציה.",
      },
      en: {
        label: "Expectancy",
        short: "The average R you made per closed trade, with break-even trades in the denominator.",
        example: "Example: half the trades win +2R and half lose −1R ⇒ +0.5R per trade.",
        caveat: "Measured in R, not dollars.",
        longForm: "Expectancy = (Win% × average winning R) − (Loss% × average losing R), with break-even trades in the denominator.\n\nIt shows how many R you expect to make per trade on average. Positive means you have an edge; negative means you lose over time regardless of individual wins. It is measured in R, not dollars, so it does not depend on position size.",
      },
      es: {
        label: "Expectativa",
        short: "Expectativa = (% Ganancias × Ganancia Media) − (% Pérdidas × Pérdida Media).\n\nTe dice el beneficio esperado en dólares por operación en promedio. Positiva = tu sistema tiene ventaja. Negativa = pierdes dinero con el tiempo sin importar las ganancias individuales.",
      },
      pt: {
        label: "Expectativa",
        short: "Expectativa = (% Ganhos × Ganho Médio) − (% Perdas × Perda Média).\n\nDiz-te o lucro esperado em dólares por operação em média. Positiva = o teu sistema tem vantagem. Negativa = perdes dinheiro ao longo do tempo independentemente dos ganhos individuais.",
      },
      ar: {
        label: "التوقّع",
        short: "التوقّع = (نسبة الربح × متوسّط الربح) − (نسبة الخسارة × متوسّط الخسارة).\n\nيخبرك بالربح المتوقّع بالدولار لكل صفقة في المتوسّط. موجب = نظامك يملك أفضلية. سالب = تخسر المال مع الوقت بغضّ النظر عن المكاسب الفردية.",
      },
    },
  },
  {
    id: "sharpe",
    computedIn: ["src/intelligence/utils/statisticalModels.js:195"],
    sources: ["SHARPE"],
    related: ["avgR", "dnaConsistency"],
    pendingTranslation: ["es", "pt", "ar"],
    glossaryOnly: "מחושב ב-TradeDNA.metrics בלבד; אין מסך שמציג את הערך (הכרעת ניב 13.11)",
    i18n: {
      he: {
        label: "Sharpe לעסקה (R)",
        short: "ממוצע ה-R לעסקה חלקי סטיית התקן של ה-R — תשואה ליחידת תנודתיות.",
        example: "לדוגמה: ממוצע \u200e+0.5R וסטיית תקן 1R ⇒ 0.5.",
        caveat: "בלי ריבית חסרת סיכון ובלי שנתיות — אינו בר-השוואה ל-Sharpe של קרן.",
        longForm: "Sharpe לעסקה = ממוצע ה-R ÷ סטיית התקן של ה-R, על עסקאות סגורות.\n\nזו גרסה של יחס Sharpe (Sharpe, 1994), שמחלק תשואה עודפת בתנודתיות שלה. כאן אין ריבית חסרת סיכון ואין שנתיות — היחידה היא עסקה, לא שנה — ולכן המספר אינו בר-השוואה ל-Sharpe של קרן או של מדד. ערך גבוה יותר = תוצאות R עקביות יותר ביחס לממוצע שלהן.",
      },
      en: {
        label: "Per-trade Sharpe (R)",
        short: "Mean R per trade divided by the standard deviation of R.",
        example: "Example: an average of +0.5R with a 1R standard deviation ⇒ 0.5.",
        caveat: "No risk-free rate and no annualizing — not comparable to a fund's Sharpe ratio.",
        longForm: "Per-trade Sharpe = mean R ÷ standard deviation of R, over closed trades.\n\nIt is a variant of the Sharpe ratio (Sharpe, 1994), which divides excess return by its variability. Here there is no risk-free rate and no annualizing — the unit is a trade, not a year — so the number is not comparable to a fund's or an index's Sharpe ratio. Higher means R outcomes that are steadier relative to their mean.",
      },
      es: {
        label: "Ratio de Sharpe",
        short: "El Ratio de Sharpe mide el rendimiento ajustado al riesgo.\n\n• Por encima de 1.0 = bueno\n• Por encima de 2.0 = excelente\n• Por encima de 3.0 = excepcional (nivel de hedge fund)\n\nUn Sharpe alto significa rendimientos consistentes sin oscilaciones bruscas. Más importante que el beneficio bruto para evaluar la calidad del sistema.",
      },
      pt: {
        label: "Rácio de Sharpe",
        short: "O Rácio de Sharpe mede o retorno ajustado ao risco.\n\n• Acima de 1.0 = bom\n• Acima de 2.0 = excelente\n• Acima de 3.0 = excecional (nível de hedge fund)\n\nUm Sharpe alto significa retornos consistentes sem oscilações bruscas. Mais importante que o lucro bruto para avaliar a qualidade do sistema.",
      },
      ar: {
        label: "مقياس شارب",
        short: "يقيس مقياس شارب (Sharpe) العائد المعدّل حسب المخاطرة.\n\n• أعلى من 1.0 = جيّد\n• أعلى من 2.0 = ممتاز\n• أعلى من 3.0 = استثنائي (مستوى صناديق التحوّط)\n\nشارب المرتفع يعني عوائد متّسقة دون تقلّبات حادّة. أهمّ من الربح الخام لتقييم جودة النظام.",
      },
    },
  },
  {
    id: "maxDD",
    computedIn: ["src/lib/tradingStats.js:214"],
    sources: ["CFA"],
    related: ["equityCurve"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · כרטיס"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "ירידה מקסימלית",
        short: "הירידה הגדולה ביותר, בסכום כסף, משיא ה-P&L המצטבר של העסקאות הסגורות עד השפל שאחריו.",
        example: "לדוגמה: ה-P&L המצטבר עלה ל-$2,000 וירד ל-$1,200 ⇒ $800.",
        caveat: "נמדד בסכום ולא באחוזים מההון.",
        longForm: "ירידה מקסימלית — הירידה הגדולה ביותר, בסכום כסף, מנקודת שיא של ה-P&L המצטבר מעסקאות סגורות עד נקודת השפל שאחריה.\n\nהמספר במטבע התצוגה, לא באחוזים מההון. ירידה קטנה יותר = שמירה טובה יותר על הון. ירידות עמוקות קשות להתאוששות: אחרי ירידה של 25% דרושה עלייה של כ-33% כדי לחזור לשיא.",
      },
      en: {
        label: "Max Drawdown",
        short: "The largest drop, in money, from a peak in your cumulative closed-trade P&L to the low after it.",
        example: "Example: cumulative P&L rose to $2,000 and fell to $1,200 ⇒ $800.",
        caveat: "Measured as an amount, not as a percentage of capital.",
        longForm: "Maximum Drawdown — the largest drop, in money, from a peak in your cumulative closed-trade P&L to the low that followed it.\n\nIt is in your display currency, not a percentage of capital. Smaller means better capital preservation. Deep drawdowns are hard to recover from: after a 25% drop you need about a 33% gain to get back to the peak.",
      },
      es: {
        label: "Drawdown Máximo",
        short: "Drawdown Máximo — la mayor caída en dólares desde un pico en el saldo de tu cuenta hasta el punto más bajo antes de recuperarse.\n\nUn número menor significa menos rachas perdedoras grandes y mejor preservación del capital. Los drawdowns profundos son psicológicamente dañinos y difíciles de recuperar matemáticamente.",
      },
      pt: {
        label: "Drawdown Máximo",
        short: "Drawdown Máximo — a maior queda em dólares desde um pico no saldo da tua conta até ao ponto mais baixo antes da recuperação.\n\nUm número menor significa menos sequências perdedoras grandes e melhor preservação de capital. Drawdowns profundos são psicologicamente prejudiciais e difíceis de recuperar matematicamente.",
      },
      ar: {
        label: "أقصى تراجع",
        short: "أقصى تراجع (Max Drawdown) — أكبر هبوط بالدولار من قمّة في رصيد حسابك إلى أدنى نقطة قبل التعافي.\n\nالرقم الأصغر يعني سلاسل خسائر كبيرة أقل وحفاظاً أفضل على رأس المال. التراجعات العميقة مؤذية نفسياً وصعبة التعافي رياضياً.",
      },
    },
  },
  {
    id: "avgWin",
    computedIn: ["src/lib/tradingStats.js"],
    related: ["avgLoss", "profitFactor"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · כרטיס"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "רווח ממוצע",
        short: "הרווח הממוצע בעסקאות הסגורות שהסתיימו ברווח.",
        example: "לדוגמה: רווחים של $100 ושל $300 ⇒ $200.",
        longForm: "הרווח הממוצע בעסקאות מנצחות.",
      },
      en: {
        label: "Avg Win",
        short: "The average profit on your closed trades that ended in profit.",
        example: "Example: wins of $100 and $300 ⇒ $200.",
        longForm: "Average profit on winning trades.",
      },
      es: {
        label: "Ganancia Media",
        short: "Beneficio promedio en operaciones ganadoras.",
      },
      pt: {
        label: "Ganho Médio",
        short: "Lucro médio em operações vencedoras.",
      },
      ar: {
        label: "متوسّط الربح",
        short: "متوسّط الربح في الصفقات الرابحة.",
      },
    },
  },
  {
    id: "avgLoss",
    computedIn: ["src/lib/tradingStats.js"],
    related: ["avgWin", "profitFactor"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · כרטיס"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "הפסד ממוצע",
        short: "ההפסד הממוצע בעסקאות הסגורות שהסתיימו בהפסד.",
        example: "לדוגמה: הפסדים של $50 ושל $150 ⇒ $100.",
        longForm: "ההפסד הממוצע בעסקאות מפסידות.",
      },
      en: {
        label: "Avg Loss",
        short: "The average loss on your closed trades that ended in a loss.",
        example: "Example: losses of $50 and $150 ⇒ $100.",
        longForm: "Average loss on losing trades.",
      },
      es: {
        label: "Pérdida Media",
        short: "Pérdida promedio en operaciones perdedoras.",
      },
      pt: {
        label: "Perda Média",
        short: "Perda média em operações perdedoras.",
      },
      ar: {
        label: "متوسّط الخسارة",
        short: "متوسّط الخسارة في الصفقات الخاسرة.",
      },
    },
  },
  {
    id: "avgHold",
    computedIn: ["src/utils.js:48"],
    related: ["holdTimeVsPnl"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · כרטיס"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "זמן החזקה ממוצע",
        short: "מספר הימים הממוצע בין הכניסה ליציאה בעסקאות סגורות.",
        example: "לדוגמה: עסקאות של 2 ושל 6 ימים ⇒ 4 ימים.",
        caveat: "ימים קלנדריים מעוגלים; כניסה ויציאה באותו יום = 0.",
        longForm: "זמן החזקה ממוצע לעסקה סגורה, בימים קלנדריים מעוגלים. עסקה שנפתחה ונסגרה באותו יום נספרת כ-0.\n\nהשווה אותו לגרף זמן החזקה מול רווח באנליטיקס: הוא מראה אם החזקות ארוכות או קצרות הן אלה שמרוויחות אצלך.",
      },
      en: {
        label: "Avg Hold",
        short: "The average number of days between entry and exit on closed trades.",
        example: "Example: trades of 2 and 6 days ⇒ 4 days.",
        caveat: "Rounded calendar days; same-day entry and exit = 0.",
        longForm: "Average holding period per closed trade, in rounded calendar days. A trade opened and closed on the same day counts as 0.\n\nCompare it with the Hold Time vs P&L chart in Analytics: it shows whether your longer or shorter holds are the ones that make money.",
      },
      es: {
        label: "Tiempo Medio",
        short: "Periodo medio de mantenimiento por operación cerrada (en días).\n\nEl swing trading suele apuntar a mantener 2-10 días. Mantenimientos muy cortos (< 1 día) a menudo indican cerrar operaciones demasiado pronto. Mantenimientos muy largos (> 20 días) pueden sugerir evitar los stop-loss.",
      },
      pt: {
        label: "Tempo Médio",
        short: "Período médio de manutenção por operação fechada (em dias).\n\nO swing trading costuma apontar para manter 2-10 dias. Manutenções muito curtas (< 1 dia) muitas vezes indicam fechar operações cedo demais. Manutenções muito longas (> 20 dias) podem sugerir evitar os stop-loss.",
      },
      ar: {
        label: "متوسّط مدّة الاحتفاظ",
        short: "متوسّط فترة الاحتفاظ لكل صفقة مغلقة (بالأيام).\n\nيستهدف التداول المتأرجح عادةً الاحتفاظ 2-10 أيام. فترات الاحتفاظ القصيرة جداً (< يوم واحد) كثيراً ما تعني إغلاق الصفقات مبكراً. والطويلة جداً (> 20 يوماً) قد تعني تجنّب أوامر وقف الخسارة.",
      },
    },
  },
  {
    id: "equityCurve",
    computedIn: ["src/lib/tradingStats.js:392"],
    related: ["maxDD", "accountEquity"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · גרף"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "עקומת הון",
        short: "יתרת החשבון לאורך זמן: בסיס ההון ועוד ה-P&L המצטבר אחרי כל עסקה שנסגרה.",
        example: "לדוגמה: בסיס $10,000, עסקה של \u200e+$200 ואחריה \u200e−$50 ⇒ $10,200 ואז $10,150.",
        caveat: "כל נקודה היא יום סגירה; פוזיציות פתוחות לא נכללות.",
        longForm: "עקומת ההון מציגה את יתרת החשבון לאורך זמן: בסיס ההון שהגדרת ועוד ה-P&L המצטבר, נקודה אחת לכל עסקה שנסגרה, לפי יום הסגירה.\n\nעקומה שעולה בהדרגה = רווחים שמצטברים בלי ירידות חדות. קפיצות חדות לשני הכיוונים מעידות לרוב על גודל פוזיציה משתנה. פוזיציות פתוחות לא נכללות.",
      },
      en: {
        label: "Equity Curve",
        short: "Your account balance over time: your capital base plus cumulative P&L after each closed trade.",
        example: "Example: a $10,000 base, +$200 then −$50 ⇒ $10,200, then $10,150.",
        caveat: "Each point is a closing day; open positions excluded.",
        longForm: "Your Equity Curve shows account balance over time: the capital base you set plus cumulative P&L, one point per closed trade, by closing day.\n\nA curve that rises gradually means gains accumulating without sharp drops. Sharp jumps in either direction usually point to changing position size. Open positions are not included.",
      },
      es: {
        label: "Curva de Capital",
        short: "Tu Curva de Capital muestra el saldo de la cuenta a lo largo del tiempo.\n\nUna curva suave y en ascenso constante = ventaja consistente y buena gestión del riesgo.\nPicos irregulares = tamaño de posición inconsistente o trading emocional.\nLargos periodos planos = sobreoperar sin ventaja.",
      },
      pt: {
        label: "Curva de Capital",
        short: "A tua Curva de Capital mostra o saldo da conta ao longo do tempo.\n\nUma curva suave e em ascensão constante = vantagem consistente e boa gestão de risco.\nPicos irregulares = tamanho de posição inconsistente ou trading emocional.\nLongos períodos planos = operar em excesso sem vantagem.",
      },
      ar: {
        label: "منحنى رأس المال",
        short: "تُظهر منحنى رأس المال رصيد حسابك عبر الزمن.\n\nمنحنى سلس وصاعد بثبات = أفضلية متّسقة وإدارة مخاطر جيّدة.\nقفزات حادّة = حجم صفقات غير متّسق أو تداول عاطفي.\nفترات مسطّحة طويلة = إفراط في التداول دون أفضلية.",
      },
    },
  },
  {
    id: "totalReturn",
    computedIn: ["src/lib/tradingStats.js:343"],
    related: ["accountEquity", "equityCurve"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · כרטיס"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "תשואה כוללת",
        short: "ה-P&L של העסקאות הסגורות כאחוז מבסיס ההון שהגדרת.",
        example: "לדוגמה: \u200e+$500 על בסיס $10,000 ⇒ \u200e+5%.",
        caveat: "פוזיציות פתוחות לא נכללות.",
        longForm: "הרווח או ההפסד הכולל מעסקאות סגורות, באחוזים מבסיס ההון שהגדרת. פוזיציות פתוחות לא נכללות.\n\nזה מספר-העל לביצועים — אבל בלי הקשר של סיכון (ירידה מקסימלית, R ממוצע) הוא לא מספר את כל הסיפור.",
      },
      en: {
        label: "Total Return",
        short: "Your closed-trade P&L as a percentage of the capital base you set.",
        example: "Example: +$500 on a $10,000 base ⇒ +5%.",
        caveat: "Open positions are not included.",
        longForm: "Your total profit or loss from closed trades, as a percentage of the capital base you set. Open positions are not included.\n\nIt is the headline performance number — but without risk context (max drawdown, average R) it does not tell the whole story.",
      },
      es: {
        label: "Total Return",
        short: "Tu ganancia o pérdida total desde que empezaste, como porcentaje del capital inicial. La cifra principal de rendimiento, pero sin contexto de riesgo no cuenta toda la historia.",
      },
      pt: {
        label: "Total Return",
        short: "O seu lucro ou prejuízo total desde que começou, como percentagem do capital inicial. O número principal de desempenho — mas sem contexto de risco não conta a história toda.",
      },
      ar: {
        label: "Total Return",
        short: "إجمالي ربحك أو خسارتك منذ البداية، كنسبة مئوية من رأس المال الابتدائي. الرقم الرئيسي للأداء — لكنه دون سياق المخاطرة لا يروي القصة كاملة.",
      },
    },
  },
  {
    id: "winStreak",
    computedIn: ["SwingEdge_App.jsx:2961"],
    related: ["streakHistory", "tilt"],
    shownAt: ["SwingEdge_App.jsx — דשבורד · כרטיס הרצף"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "רצף נוכחי",
        short: "מספר העסקאות הרווחיות ברציפות עד העסקה הסגורה האחרונה.",
        example: "לדוגמה: 3 רווחים ברצף ⇒ 3; השורה מתחת מציגה את הרצף הטוב ביותר.",
        caveat: "רצף הפסדים מוצג כ-0, לא כמספר שלילי.",
        longForm: "מספר העסקאות הרווחיות ברצף, עד העסקה הסגורה האחרונה. כשהעסקה האחרונה הפסידה, הכרטיס מציג 0 — רצף הפסדים לא מוצג כאן כמספר שלילי; הוא מופיע בהיסטוריית הרצפים באנליטיקס.\n\nרצף רווחים בונה ביטחון, אבל זה גם הזמן הנפוץ לביטחון-יתר ולהגדלת סיכון שלא תוכננה.",
      },
      en: {
        label: "Current Streak",
        short: "The number of profitable trades in a row, up to your latest closed trade.",
        example: "Example: 3 wins in a row ⇒ 3; the line below shows your best streak.",
        caveat: "A losing streak shows as 0, not as a negative number.",
        longForm: "The number of profitable trades in a row, up to your latest closed trade. When the latest trade lost, the card shows 0 — a losing streak is not shown here as a negative number; it appears in Streak History in Analytics.\n\nA winning streak builds confidence, but it is also a common time for overconfidence and unplanned increases in risk.",
      },
      es: {
        label: "Win Streak",
        short: "El número de operaciones ganadoras seguidas. Una racha ganadora genera confianza, pero también es el momento más peligroso para el exceso de confianza y un riesgo indisciplinado.",
      },
      pt: {
        label: "Win Streak",
        short: "O número de operações vencedoras seguidas. Uma sequência de vitórias gera confiança — mas também é o momento mais perigoso para o excesso de confiança e o risco indisciplinado.",
      },
      ar: {
        label: "Win Streak",
        short: "عدد الصفقات الرابحة المتتالية. سلسلة الانتصارات تبني الثقة — لكنها أيضاً أخطر وقت للثقة المفرطة والمخاطرة غير المنضبطة.",
      },
    },
  },
  {
    id: "grade",
    computedIn: ["src/intelligence/core/MonthlyReport.js:172"],
    related: ["winRate", "avgR", "discipline", "dnaConsistency"],
    shownAt: ["src/components/MonthlyReportTab.jsx — דוח חודשי · ציון"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "ציון חודשי",
        short: "ציון A–F לחודש: 40% אחוז הצלחה, 30% R, 20% משמעת ו-10% עקביות.",
        example: "לדוגמה: 72/100 ⇒ B (A מ-85 · B מ-70 · C מ-55 · D מ-40).",
        caveat: "המשמעת נשענת על הסימון 'עקבתי אחרי התוכנית'.",
        longForm: "ציון משוקלל לחודש: 40% אחוז הצלחה, 30% R, 20% משמעת ו-10% עקביות, על סולם 0–100. A מ-85, B מ-70, C מ-55, D מ-40, ומתחת — F.\n\nרכיב המשמעת נשען על הסימון 'עקבתי אחרי התוכנית' בעסקאות — דיווח עצמי. זו תמונת-על מהירה, לא תחליף לצלילה לפרטים.",
      },
      en: {
        label: "Monthly Grade",
        short: "An A–F grade for the month: 40% win rate, 30% R, 20% discipline, 10% consistency.",
        example: "Example: 72/100 ⇒ B (A 85+ · B 70+ · C 55+ · D 40+).",
        caveat: "Discipline is the self-reported 'followed my plan' flag.",
        longForm: "A weighted grade for the month: 40% win rate, 30% R, 20% discipline and 10% consistency, on a 0–100 scale. A from 85, B from 70, C from 55, D from 40, and F below.\n\nThe discipline part relies on the 'followed my plan' flag on your trades — a self-report. It is a quick snapshot, not a substitute for digging into the details.",
      },
      es: {
        label: "Grade",
        short: "Una puntuación ponderada (A–F) que resume la calidad de tu trading del mes: una mezcla de tasa de aciertos, múltiplo R, disciplina y consistencia. Una instantánea rápida, no un sustituto de analizar los detalles.",
      },
      pt: {
        label: "Grade",
        short: "Uma pontuação ponderada (A–F) que resume a qualidade do seu trading no mês: uma mistura de taxa de acertos, múltiplo R, disciplina e consistência. Um retrato rápido — não substitui analisar os detalhes.",
      },
      ar: {
        label: "Grade",
        short: "درجة مرجّحة (A–F) تلخّص جودة تداولك خلال الشهر: مزيج من نسبة النجاح ومضاعف R والانضباط والاتّساق. لقطة سريعة — لا تُغني عن التعمّق في التفاصيل.",
      },
    },
  },
  {
    id: "entryQuality",
    related: ["discipline"],
    shownAt: ["SwingEdge_App.jsx — טופס עסקה · מנתח עסקה", "src/components/EditTradeModal.jsx — עריכת עסקה"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "איכות כניסה",
        short: "דירוג 1–5 כוכבים שנתת לכניסה: עד כמה העיתוי, המחיר והאישור תאמו לתוכנית.",
        example: "לדוגמה: נכנסת במחיר שתכננת אחרי אישור ⇒ 5 כוכבים.",
        caveat: "דירוג עצמי — לא נמדד מהמחירים.",
        longForm: "דירוג (כוכבים) של עד כמה הכניסה תאמה ל-setup המתוכנן: עיתוי, מחיר ואישור. הדירוג הוא שלך — המערכת לא מודדת אותו מהמחירים.\n\nדירוג גבוה עקבי הוא סימן למשמעת — גם כשהעסקה עצמה מפסידה.",
      },
      en: {
        label: "Entry Quality",
        short: "A 1–5 star rating you gave your entry: how well timing, price and confirmation matched the plan.",
        example: "Example: you entered at your planned price after confirmation ⇒ 5 stars.",
        caveat: "Self-rated — not measured from prices.",
        longForm: "A (star) rating of how well your entry matched the planned setup: timing, price and confirmation. The rating is yours — the app does not measure it from prices.\n\nA consistently high rating signals discipline — even when the trade itself loses.",
      },
      es: {
        label: "Entry Quality",
        short: "Una calificación (estrellas) de cuán bien tu entrada coincidió con el setup planificado: timing, precio y confirmación. Una calificación alta y constante indica disciplina, incluso cuando la operación pierde.",
      },
      pt: {
        label: "Entry Quality",
        short: "Uma classificação (estrelas) de quão bem a sua entrada correspondeu ao setup planeado: timing, preço e confirmação. Uma classificação alta e constante indica disciplina — mesmo quando a operação perde.",
      },
      ar: {
        label: "Entry Quality",
        short: "تقييم (بالنجوم) لمدى مطابقة دخولك للنموذج المخطّط: التوقيت، والسعر، والتأكيد. التقييم العالي المتّسق يدل على الانضباط — حتى عندما تخسر الصفقة نفسها.",
      },
    },
  },
  {
    id: "accountEquity",
    computedIn: ["src/lib/equityState.js"],
    related: ["equityCurve", "riskPerTrade"],
    shownAt: ["SwingEdge_App.jsx — דשבורד · כרטיס ההון"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "הון החשבון",
        short: "בסיס ההון שהגדרת ועוד ה-P&L המצטבר מעסקאות סגורות ופתוחות.",
        example: "לדוגמה: בסיס $10,000 ועוד \u200e+$600 ⇒ $10,600.",
        caveat: "הסיכון לעסקה מחושב מבסיס ההון הקבוע, לא מההון הנוכחי.",
      },
      en: {
        label: "Account Equity",
        short: "The capital base you set plus cumulative P&L from closed and open trades.",
        example: "Example: a $10,000 base plus +$600 ⇒ $10,600.",
        caveat: "Per-trade risk is sized from your fixed capital base, not current equity.",
      },
      es: {
        label: "Account Equity",
        short: "The capital base you set plus cumulative P&L from closed and open trades.\nExample: a $10,000 base plus +$600 ⇒ $10,600.\nPer-trade risk is sized from your fixed capital base, not current equity.",
      },
      pt: {
        label: "Account Equity",
        short: "The capital base you set plus cumulative P&L from closed and open trades.\nExample: a $10,000 base plus +$600 ⇒ $10,600.\nPer-trade risk is sized from your fixed capital base, not current equity.",
      },
      ar: {
        label: "Account Equity",
        short: "The capital base you set plus cumulative P&L from closed and open trades.\nExample: a $10,000 base plus +$600 ⇒ $10,600.\nPer-trade risk is sized from your fixed capital base, not current equity.",
      },
    },
  },
];
