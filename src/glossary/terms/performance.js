// src/glossary/terms/performance.js — מדדי ביצוע
// ⛔ מקור האמת היחיד למונחים האלה. עריכה כאן ⇒ `npm run glossary` באותו קומיט (test:glossary תופס סחיפה).

/** @type {import("../types.js").GlossaryTerm[]} */
export default [
  {
    id: "winRate",
    i18n: {
      he: {
        label: "אחוז הצלחה",
        short: "אחוז הזכייה הוא האחוז מהעסקאות הסגורות שהסתיימו ברווח.\n\nמעל 55% זה טוב. אבל אחוז זכייה לבד לא קובע הצלחה — סוחר עם 40% יכול להיות רווחי אם יחס הסיכון-סיכוי שלו גבוה. תסתכל גם על Profit Factor.",
      },
      en: {
        label: "Win Rate",
        short: "Win Rate is the percentage of your closed trades that ended in profit.\n\nAbove 55% is solid. But win rate alone doesn't determine success — a trader with 40% WR can be profitable with strong risk-reward ratios. Focus on Profit Factor too.",
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
    i18n: {
      he: {
        label: "Profit Factor",
        short: "Profit Factor = סה״כ רווחים גולמיים ÷ סה״כ הפסדים גולמיים.\n\n• מעל 1.0 = רווחי\n• מעל 1.5 = Edge בריא\n• מעל 2.0 = רמה מקצועית\n• מעל 3.0 = יוצא דופן\n\nזה אחד המדדים החשובים ביותר במסחר.",
      },
      en: {
        label: "Profit Factor",
        short: "Profit Factor = Total Gross Wins ÷ Total Gross Losses.\n\n• Above 1.0 = profitable\n• Above 1.5 = healthy edge\n• Above 2.0 = professional level\n• Above 3.0 = exceptional\n\nThis is one of the most important metrics in trading.",
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
    i18n: {
      he: {
        label: "R ממוצע",
        short: "ממוצע R-Multiple לעסקה סגורה.\n\nR = רווח העסקה ÷ הסיכון הראשוני למניה. הרווח נגזר מכיוון העסקה: ב-LONG הוא (יציאה − כניסה), וב-SHORT הוא (כניסה − יציאה) — כך ש-SHORT מנצחת היא תמיד R חיובי.\n\n+1.0R אומר שהרווחת בדיוק כמה שסיכנת. שאף ל-+0.3R לפחות כממוצע. סוחרים עילית מגיעים ל-+1.5R עד +2.5R.\n\nרק עסקה עם סטופ ניתנת למדידה ב-R — עסקה בלי סטופ מוחרגת מהממוצע, ואינה נספרת כ-0R. השורה מתחת למספר מראה כמה מהעסקאות הסגורות הממוצע באמת מכסה.",
      },
      en: {
        label: "Avg R",
        short: "Average R-Multiple per closed trade.\n\nR = trade profit ÷ initial risk per share. The profit follows the direction of the trade: on a LONG it is (Exit − Entry), on a SHORT it is (Entry − Exit) — so a winning SHORT is always a positive R.\n\n+1.0R means you made exactly what you risked. Aim for +0.3R or higher as a minimum average. Elite traders average +1.5R to +2.5R.\n\nOnly trades that had a stop can be measured in R — a trade without one is excluded from this average, not counted as 0R. The line under the number shows how many of your closed trades the average actually covers.",
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
    i18n: {
      he: {
        label: "תוחלת",
        short: "תוחלת = (אחוז זכייה × רווח ממוצע) − (אחוז הפסד × הפסד ממוצע).\n\nמראה כמה דולר אתה מצפה לרוויח בממוצע לעסקה. חיובי = יש לך Edge. שלילי = אתה מפסיד לאורך זמן בלי קשר לניצחונות בודדים.",
      },
      en: {
        label: "Expectancy",
        short: "Expectancy = (Win% × Avg Win) − (Loss% × Avg Loss).\n\nTells you the expected dollar profit per trade on average. Positive = your system has edge. Negative = you're losing money over time regardless of individual wins.",
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
    i18n: {
      he: {
        label: "יחס שארפ",
        short: "יחס שארפ מודד תשואה מותאמת לסיכון.\n\n• מעל 1.0 = טוב\n• מעל 2.0 = מצוין\n• מעל 3.0 = יוצא דופן (רמת קרן גידור)\n\nשארפ גבוה = תשואות עקביות בלי תנודות חריפות. חשוב יותר מרווח גולמי להערכת איכות המערכת.",
      },
      en: {
        label: "Sharpe Ratio",
        short: "Sharpe Ratio measures risk-adjusted return.\n\n• Above 1.0 = good\n• Above 2.0 = excellent\n• Above 3.0 = exceptional (hedge fund level)\n\nA high Sharpe means consistent returns without wild swings. More important than raw profit for evaluating system quality.",
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
    i18n: {
      he: {
        label: "ירידה מקסימלית",
        short: "ירידה מקסימלית — הירידה הגדולה ביותר בדולרים מנקודת שיא ביתרת החשבון לנקודת השפל שלפני ההתאוששות.\n\nמספר קטן יותר = פחות רצפי הפסד גדולים ושמירה טובה יותר על הון. ירידות עמוקות פוגעות פסיכולוגית וקשות להתאוששות מתמטית.",
      },
      en: {
        label: "Max Drawdown",
        short: "Maximum Drawdown — the largest dollar drop from a peak in your account balance to the lowest point before recovery.\n\nA smaller number means fewer large losing streaks and better capital preservation. Deep drawdowns are psychologically damaging and hard to recover from mathematically.",
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
    i18n: {
      he: {
        label: "רווח ממוצע",
        short: "הרווח הממוצע בעסקאות מנצחות.",
      },
      en: {
        label: "Avg Win",
        short: "Average profit on winning trades.",
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
    i18n: {
      he: {
        label: "הפסד ממוצע",
        short: "ההפסד הממוצע בעסקאות מפסידות.",
      },
      en: {
        label: "Avg Loss",
        short: "Average loss on losing trades.",
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
    i18n: {
      he: {
        label: "זמן החזקה ממוצע",
        short: "זמן החזקה ממוצע לעסקה סגורה (בימים).\n\nמסחר סווינג מכוון בדרך כלל ל-2-10 ימים. החזקות קצרות מאוד (< 1 יום) מעידות לעיתים על יציאה מוקדמת מדי. החזקות ארוכות מאוד (> 20 ימים) עשויות להצביע על הימנעות מסטופ לוס.",
      },
      en: {
        label: "Avg Hold",
        short: "Average holding period per closed trade (in days).\n\nSwing trading typically targets 2-10 day holds. Very short holds (< 1 day) often indicate cutting trades too early. Very long holds (> 20 days) may suggest avoiding stop-losses.",
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
    i18n: {
      he: {
        label: "עקומת הון",
        short: "עקומת ההון מציגה את יתרת החשבון לאורך זמן.\n\nעקומה חלקה ועולה באופן עקבי = Edge עקבי וניהול סיכון טוב.\nקפיצות חדות = גודל פוזיציה לא עקבי או מסחר רגשי.\nתקופות שטוחות ארוכות = מסחר יתר ללא Edge.",
      },
      en: {
        label: "Equity Curve",
        short: "Your Equity Curve shows account balance over time.\n\nA smooth, steadily rising curve = consistent edge and good risk management.\nJagged spikes = inconsistent position sizing or emotional trading.\nLong flat periods = overtrading without edge.",
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
    i18n: {
      he: {
        label: "Total Return",
        short: "הרווח או ההפסד הכולל מאז תחילת המסחר, באחוזים מההון ההתחלתי. מדד-העל לביצועים — אבל בלי הקשר של סיכון הוא לא מספר את כל הסיפור.",
      },
      en: {
        label: "Total Return",
        short: "Your total profit or loss since you started, as a percentage of starting capital. The headline performance number — but without risk context it doesn't tell the whole story.",
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
    i18n: {
      he: {
        label: "Win Streak",
        short: "מספר העסקאות הרווחיות ברצף. רצף נצחונות בונה ביטחון — אך גם הזמן המסוכן ביותר לביטחון-יתר ולהגדלת סיכון לא ממושמעת.",
      },
      en: {
        label: "Win Streak",
        short: "The number of profitable trades in a row. A winning streak builds confidence — but it's also the most dangerous time for overconfidence and undisciplined risk-taking.",
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
    id: "streakHistory",
    i18n: {
      he: {
        label: "Streak History",
        short: "תיעוד רצפי הנצחונות וההפסדים שלך לאורך זמן. חושף דפוסים רגשיים: האם רצף הפסדים גורם לך לסחור גרוע יותר (tilt), או להתאושש במשמעת.",
      },
      en: {
        label: "Streak History",
        short: "A record of your winning and losing streaks over time. It reveals emotional patterns: does a losing streak make you trade worse (tilt), or do you recover with discipline.",
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
    id: "grade",
    i18n: {
      he: {
        label: "Grade",
        short: "ציון משוקלל (A–F) שמסכם את איכות המסחר שלך לחודש: שילוב של אחוז הצלחה, יחס R, משמעת ועקביות. תמונת-על מהירה — לא תחליף לצלילה לפרטים.",
      },
      en: {
        label: "Grade",
        short: "A weighted score (A–F) summarizing your trading quality for the month: a blend of win rate, R-multiple, discipline and consistency. A quick snapshot — not a substitute for digging into the details.",
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
    i18n: {
      he: {
        label: "Entry Quality",
        short: "דירוג (כוכבים) של עד כמה הכניסה תאמה ל-setup המתוכנן: עיתוי, מחיר, ואישור. דירוג גבוה עקבי הוא סימן למשמעת — גם כשהעסקה עצמה מפסידה.",
      },
      en: {
        label: "Entry Quality",
        short: "A (star) rating of how well your entry matched the planned setup: timing, price, and confirmation. A consistently high rating signals discipline — even when the trade itself loses.",
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
    id: "dayOfWeek",
    i18n: {
      he: {
        label: "רווח/הפסד לפי יום בשבוע",
        short: "הרווח/הפסד שלך מחולק לפי ימי השבוע. חושף באילו ימים אתה עקבית מרוויח או מפסיד — לרבים יש Edge נסתר (או דליפה) שקשור לימים מסוימים כמו שני או שישי.",
      },
      en: {
        label: "P&L by Day of Week",
        short: "Your profit/loss broken down by day of the week. Reveals which days you consistently make or lose money — many traders have a hidden edge (or leak) tied to specific days like Mondays or Fridays.",
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
    i18n: {
      he: {
        label: "ביצועים לפי סטאפ",
        short: "פירוט של כל setup שאתה סוחר — אחוז זכייה, R כולל, ומספר עסקאות. מראה במבט אחד אילו סטאפים נושאים את החשבון שלך ואילו מנקזים אותו. ה-Edges וה-Anti-Edges שלך, זה לצד זה.",
      },
      en: {
        label: "Performance by Setup",
        short: "A breakdown of every setup you trade — win rate, total R, and number of trades. Shows at a glance which setups carry your account and which drain it. Your edges and anti-edges, side by side.",
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
];
