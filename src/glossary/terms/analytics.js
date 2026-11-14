// src/glossary/terms/analytics.js — אנליטיקס — גרפים וכרטיסי תובנה
// ⛔ מקור האמת היחיד למונחים האלה. עריכה כאן ⇒ `npm run glossary` באותו קומיט (test:glossary תופס סחיפה).
// פורמט (גל 3): short = הגדרה במשפט אחד ≤18 מילים · example = "לדוגמה:"/"Example:" במספרים היפותטיים · caveat אחד לכל היותר · longForm = הטקסט המלא (מודאל המילון).
// 5 שפות מלאות (שלב 5, 14.11): es/pt/ar מתורגמים מ-he/en, ≤110% מתווי en. שפה שממתינה לתרגום ⇒ pendingTranslation + שורה ב-test:glossary (L3).

/** @type {import("../types.js").GlossaryTerm[]} */
export default [
  {
    id: "streakHistory",
    computedIn: ["src/lib/tradingStats.js"],
    related: ["winStreak"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · גרף"],
    i18n: {
      he: {
        label: "היסטוריית רצפים",
        short: "רצפי הרווחים וההפסדים שלך לפי סדר הזמן, כל רצף כעמודה.",
        example: "לדוגמה: 3 רווחים ואחריהם 2 הפסדים ⇒ שתי עמודות, 3 ו-2.",
        longForm: "תיעוד רצפי הרווחים וההפסדים שלך לאורך זמן, מאותו מעבר כרונולוגי שמחשב את הרצף הנוכחי. הוא חושף דפוסים: האם רצף הפסדים גורם לך לסחור גרוע יותר (Tilt), או שאתה חוזר למשמעת.",
      },
      en: {
        label: "Streak History",
        short: "Your winning and losing streaks in time order, one bar per streak.",
        example: "Example: 3 wins then 2 losses ⇒ two bars, 3 and 2.",
        longForm: "A record of your winning and losing streaks over time, from the same chronological pass that computes the current streak. It reveals patterns: does a losing streak make you trade worse (Tilt), or do you return to discipline.",
      },
      es: {
        label: "Historial de Rachas",
        short: "Rachas ganadoras y perdedoras en orden temporal, una barra por racha.",
        example: "Ejemplo: 3 ganadas, luego 2 perdidas ⇒ dos barras, 3 y 2.",
        longForm: "Un registro de tus rachas ganadoras y perdedoras a lo largo del tiempo, del mismo recorrido cronológico que calcula la racha actual. Revela patrones: si una racha perdedora te hace operar peor (Tilt) o si vuelves a la disciplina.",
      },
      pt: {
        label: "Histórico de Sequências",
        short: "Sequências de ganho e perda em ordem temporal, uma barra por sequência.",
        example: "Exemplo: 3 ganhos, depois 2 perdas ⇒ duas barras, 3 e 2.",
        longForm: "Um registro das suas sequências de ganhos e perdas ao longo do tempo, da mesma passagem cronológica que calcula a sequência atual. Revela padrões: se uma sequência de perdas faz você operar pior (Tilt) ou se você volta à disciplina.",
      },
      ar: {
        label: "سجل السلاسل",
        short: "سلاسل أرباحك وخسائرك بترتيب زمني، عمود واحد لكل سلسلة.",
        example: "مثال: 3 أرباح ثم 2 خسائر ⇒ عمودان، 3 و2.",
        longForm: "سجلّ لسلاسل أرباحك وخسائرك عبر الزمن، من المرور الزمني نفسه الذي يحسب السلسلة الحالية. يكشف الأنماط: هل تجعلك سلسلة الخسائر تتداول بشكل أسوأ (Tilt)، أم تعود إلى الانضباط.",
      },
    },
  },
  {
    id: "dayOfWeek",
    computedIn: ["src/lib/tradingStats.js:488"],
    related: ["bestDay"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · גרף"],
    i18n: {
      he: {
        label: "רווח/הפסד לפי יום בשבוע",
        short: "ה-P&L המצטבר לפי היום בשבוע שבו נכנסת לעסקה.",
        example: "לדוגמה: עסקה שנפתחה בשני ונסגרה ברביעי נספרת לשני.",
        longForm: "הרווח/הפסד שלך מחולק לפי ימי השבוע, לפי יום הכניסה לעסקה (לא יום הסגירה). הוא מראה באילו ימים אתה עקבית מרוויח או מפסיד — בדוק כמה עסקאות יש בכל יום לפני שאתה מסיק מסקנה.",
      },
      en: {
        label: "P&L by Day of Week",
        short: "Cumulative P&L by the weekday you entered the trade.",
        example: "Example: a trade opened Monday and closed Wednesday counts for Monday.",
        longForm: "Your profit/loss broken down by day of the week, by entry day (not exit day). It shows which days you consistently make or lose money — check how many trades sit on each day before drawing a conclusion.",
      },
      es: {
        label: "G/P por Día de la Semana",
        short: "G/P acumulado según el día de la semana de entrada.",
        example: "Ejemplo: operación abierta el lunes y cerrada el miércoles cuenta para el lunes.",
        longForm: "Tus ganancias/pérdidas desglosadas por día de la semana, según el día de entrada (no el de salida). Muestra qué días ganas o pierdes dinero de forma constante; revisa cuántas operaciones hay en cada día antes de sacar una conclusión.",
      },
      pt: {
        label: "L/P por Dia da Semana",
        short: "L/P acumulado pelo dia da semana em que você entrou.",
        example: "Exemplo: operação aberta na segunda e fechada na quarta conta para a segunda.",
        longForm: "Seu lucro/prejuízo dividido por dia da semana, pelo dia de entrada (não de saída). Mostra em quais dias você ganha ou perde dinheiro de forma consistente; verifique quantas operações há em cada dia antes de tirar uma conclusão.",
      },
      ar: {
        label: "الربح/الخسارة حسب يوم الأسبوع",
        short: "الربح/الخسارة التراكمي حسب يوم الأسبوع الذي دخلت فيه الصفقة.",
        example: "مثال: صفقة فُتحت يوم الاثنين وأُغلقت يوم الأربعاء تُحسب ليوم الاثنين.",
        longForm: "ربحك/خسارتك موزّعة حسب يوم الأسبوع، وفق يوم الدخول (لا يوم الخروج). يُظهر الأيام التي تربح أو تخسر فيها باستمرار؛ تحقّق من عدد الصفقات في كل يوم قبل استخلاص أي نتيجة.",
      },
    },
  },
  {
    id: "performanceBySetup",
    computedIn: ["src/lib/tradingStats.js"],
    related: ["setupMatrix", "edge"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · כרטיסי סטאפ"],
    i18n: {
      he: {
        label: "ביצועים לפי סטאפ",
        short: "כרטיס לכל סטאפ שסחרת: מספר עסקאות, אחוז הצלחה ו-R כולל.",
        example: "לדוגמה: Breakout · 8 עסקאות · 50% · \u200e+4R.",
        longForm: "פירוט של כל סטאפ שאתה סוחר — אחוז הצלחה, R כולל ומספר עסקאות, ממוין לפי מספר העסקאות. מראה במבט אחד אילו סטאפים נושאים את החשבון שלך ואילו מנקזים אותו.",
      },
      en: {
        label: "Performance by Setup",
        short: "One card per setup you traded: trade count, win rate and total R.",
        example: "Example: Breakout · 8 trades · 50% · +4R.",
        longForm: "A breakdown of every setup you trade — win rate, total R and number of trades, sorted by trade count. Shows at a glance which setups carry your account and which drain it.",
      },
      es: {
        label: "Rendimiento por Setup",
        short: "Una tarjeta por setup operado: nº de operaciones, Win Rate y R total.",
        example: "Ejemplo: Breakout · 8 operaciones · 50% · +4R.",
        longForm: "Un desglose de cada setup que operas: Win Rate, R total y número de operaciones, ordenado por número de operaciones. Muestra de un vistazo qué setups sostienen tu cuenta y cuáles la drenan.",
      },
      pt: {
        label: "Desempenho por Setup",
        short: "Um card por setup operado: nº de operações, Win Rate e R total.",
        example: "Exemplo: Breakout · 8 operações · 50% · +4R.",
        longForm: "Um detalhamento de cada setup que você opera: Win Rate, R total e número de operações, ordenado pelo número de operações. Mostra de relance quais setups sustentam sua conta e quais a drenam.",
      },
      ar: {
        label: "الأداء حسب السيناريو",
        short: "بطاقة لكل سيناريو تداولته: عدد الصفقات وWin Rate وإجمالي R.",
        example: "مثال: Breakout · 8 صفقات · 50% · \u200e+4R.",
        longForm: "تفصيل لكل سيناريو تتداوله: Win Rate وإجمالي R وعدد الصفقات، مرتّبة حسب عدد الصفقات. يُظهر بنظرة واحدة أيّ السيناريوهات تحمل حسابك وأيّها يستنزفه.",
      },
    },
  },
  {
    id: "winRateBySetup",
    computedIn: ["src/lib/tradingStats.js"],
    related: ["winRate", "performanceBySetup"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · גרף"],
    i18n: {
      he: {
        label: "אחוז הצלחה לפי סטאפ",
        short: "גובה העמודה הוא אחוז ההצלחה של הסטאפ; המספר מעליה הוא מספר העסקאות.",
        example: "לדוגמה: עמודה סגולה = 50% ומעלה, אפורה = מתחת ל-50%.",
        caveat: "ממוין לפי מספר העסקאות.",
      },
      en: {
        label: "Win Rate by Setup",
        short: "Bar height is the setup's win rate; the number above it is the trade count.",
        example: "Example: a purple bar = 50% or more, a gray bar = below 50%.",
        caveat: "Sorted by trade count.",
      },
      es: {
        label: "Win Rate por Setup",
        short: "La altura de cada barra es el Win Rate del setup; arriba, el nº de operaciones.",
        example: "Ejemplo: barra morada = 50% o más, gris = menos del 50%.",
        caveat: "Ordenado por nº de operaciones.",
      },
      pt: {
        label: "Win Rate por Setup",
        short: "A altura da barra é o Win Rate do setup; o número acima, o nº de operações.",
        example: "Exemplo: barra roxa = 50% ou mais, cinza = abaixo de 50%.",
        caveat: "Ordenado pelo nº de operações.",
      },
      ar: {
        label: "Win Rate حسب السيناريو",
        short: "ارتفاع العمود هو Win Rate السيناريو؛ والرقم فوقه هو عدد الصفقات.",
        example: "مثال: عمود بنفسجي = 50% أو أكثر، عمود رمادي = أقل من 50%.",
        caveat: "مرتّب حسب عدد الصفقات.",
      },
    },
  },
  {
    id: "bestDay",
    computedIn: ["SwingEdge_App.jsx:6739"],
    related: ["dayOfWeek"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · כרטיס תובנה"],
    i18n: {
      he: {
        label: "היום הטוב ביותר",
        short: "יום השבוע עם ה-P&L הכולל הגבוה ביותר, לפי יום הכניסה.",
        example: "לדוגמה: שני \u200e+$400, שלישי \u200e+$150 ⇒ שני.",
        caveat: "לא מתחשב במספר העסקאות.",
      },
      en: {
        label: "Best Day",
        short: "The weekday with the highest total P&L, by entry day.",
        example: "Example: Monday +$400, Tuesday +$150 ⇒ Monday.",
        caveat: "Trade count is not taken into account.",
      },
      es: {
        label: "Mejor Día",
        short: "El día de la semana con mayor G/P total, según el día de entrada.",
        example: "Ejemplo: lunes +$400, martes +$150 ⇒ lunes.",
        caveat: "No considera el número de operaciones.",
      },
      pt: {
        label: "Melhor Dia",
        short: "O dia da semana com o maior L/P total, pelo dia de entrada.",
        example: "Exemplo: segunda +$400, terça +$150 ⇒ segunda.",
        caveat: "Não leva em conta o número de operações.",
      },
      ar: {
        label: "أفضل يوم",
        short: "يوم الأسبوع صاحب أعلى ربح/خسارة إجمالي، حسب يوم الدخول.",
        example: "مثال: الاثنين \u200e+$400، الثلاثاء \u200e+$150 ⇒ الاثنين.",
        caveat: "لا يأخذ عدد الصفقات في الحسبان.",
      },
    },
  },
  {
    id: "bestSetup",
    computedIn: ["SwingEdge_App.jsx:6751"],
    related: ["edge", "performanceBySetup"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · כרטיס תובנה"],
    i18n: {
      he: {
        label: "הסטאפ הטוב ביותר",
        short: "הסטאפ עם אחוז ההצלחה הגבוה ביותר; בתיקו — זה עם יותר עסקאות.",
        example: "לדוגמה: Pullback ב-70% מ-10 עסקאות קודם ל-Breakout ב-60%.",
        caveat: "אין סף מדגם: עסקה אחת ב-100% יכולה לזכות. Unknown לא נכלל.",
      },
      en: {
        label: "Best Setup",
        short: "The setup with the highest win rate; on a tie, the one with more trades.",
        example: "Example: Pullback at 70% over 10 trades ranks above Breakout at 60%.",
        caveat: "No minimum sample: one trade at 100% can win. Unknown is excluded.",
      },
      es: {
        label: "Mejor Setup",
        short: "El setup con mayor Win Rate; si hay empate, el de más operaciones.",
        example: "Ejemplo: Pullback al 70% en 10 operaciones supera a Breakout al 60%.",
        caveat: "Sin muestra mínima: una operación al 100% puede ganar. Se excluye Unknown.",
      },
      pt: {
        label: "Melhor Setup",
        short: "O setup com maior Win Rate; em caso de empate, o de mais operações.",
        example: "Exemplo: Pullback com 70% em 10 operações supera Breakout com 60%.",
        caveat: "Sem amostra mínima: uma operação com 100% pode vencer. Unknown fica de fora.",
      },
      ar: {
        label: "أفضل سيناريو",
        short: "السيناريو صاحب أعلى Win Rate؛ وعند التعادل، صاحب العدد الأكبر من الصفقات.",
        example: "مثال: Pullback بنسبة 70% على 10 صفقات يتقدّم على Breakout بنسبة 60%.",
        caveat: "لا حدّ أدنى للعيّنة: صفقة واحدة بنسبة 100% قد تفوز. Unknown مستبعَد.",
      },
    },
  },
  {
    id: "bestEmotion",
    computedIn: ["SwingEdge_App.jsx:6768"],
    related: ["emotionPerformance"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · כרטיס תובנה"],
    i18n: {
      he: {
        label: "הרגש הטוב ביותר",
        short: "הרגש שסימנת בכניסה עם אחוז ההצלחה הגבוה ביותר; בתיקו — זה עם יותר עסקאות.",
        example: "לדוגמה: Calm ב-65% קודם ל-Confident ב-55%.",
        caveat: "אין סף מדגם.",
      },
      en: {
        label: "Best Emotion",
        short: "The entry emotion you marked with the highest win rate; on a tie, the one with more trades.",
        example: "Example: Calm at 65% ranks above Confident at 55%.",
        caveat: "No minimum sample.",
      },
      es: {
        label: "Mejor Emoción",
        short: "La emoción de entrada que marcaste con mayor Win Rate; si hay empate, la de más operaciones.",
        example: "Ejemplo: Calm al 65% supera a Confident al 55%.",
        caveat: "Sin muestra mínima.",
      },
      pt: {
        label: "Melhor Emoção",
        short: "A emoção de entrada que você marcou com maior Win Rate; em caso de empate, a de mais operações.",
        example: "Exemplo: Calm com 65% supera Confident com 55%.",
        caveat: "Sem amostra mínima.",
      },
      ar: {
        label: "أفضل شعور",
        short: "شعور الدخول الذي حدّدته صاحب أعلى Win Rate؛ وعند التعادل، صاحب العدد الأكبر من الصفقات.",
        example: "مثال: Calm بنسبة 65% يتقدّم على Confident بنسبة 55%.",
        caveat: "لا حدّ أدنى للعيّنة.",
      },
    },
  },
  {
    id: "rDistribution",
    computedIn: ["SwingEdge_App.jsx:6863"],
    related: ["rMultiple", "avgR"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · גרף"],
    i18n: {
      he: {
        label: "התפלגות R",
        short: "כמה עסקאות סגורות נפלו בכל טווח R, משמאל להפסד ועד ימין לרווח.",
        example: "לדוגמה: עסקה של \u200e+1.4R נספרת בטווח 1R עד 2R.",
        caveat: "עסקאות בלי סטופ לא נספרות.",
      },
      en: {
        label: "R Distribution",
        short: "How many closed trades fell in each R range, losses left to wins right.",
        example: "Example: a +1.4R trade counts in the 1R to 2R range.",
        caveat: "Trades without a stop are not counted.",
      },
      es: {
        label: "Distribución de R",
        short: "Nº de operaciones cerradas por rango de R: pérdidas a la izquierda, ganancias a la derecha.",
        example: "Ejemplo: una de +1.4R cae en el rango 1R a 2R.",
        caveat: "Sin stop, la operación no se cuenta.",
      },
      pt: {
        label: "Distribuição de R",
        short: "Nº de operações fechadas por faixa de R: perdas à esquerda, ganhos à direita.",
        example: "Exemplo: uma operação de +1.4R conta na faixa de 1R a 2R.",
        caveat: "Operações sem stop não são contadas.",
      },
      ar: {
        label: "توزيع R",
        short: "عدد الصفقات المغلقة في كل نطاق R، الخسائر يساراً والأرباح يميناً.",
        example: "مثال: صفقة بـ \u200e+1.4R تُحسب في نطاق 1R إلى 2R.",
        caveat: "الصفقات بلا وقف خسارة لا تُحسب.",
      },
    },
  },
  {
    id: "pnlByMonth",
    computedIn: ["SwingEdge_App.jsx:6885"],
    related: ["equityCurve"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · גרף"],
    i18n: {
      he: {
        label: "רווח/הפסד לפי חודש",
        short: "סכום ה-P&L של העסקאות הסגורות לכל חודש, לפי תאריך הכניסה.",
        example: "לדוגמה: במרץ \u200e+$200, \u200e−$50 ו-\u200e+$100 ⇒ \u200e+$250.",
        caveat: "עסקה שלא הומרה למטבע ההון לא נספרת.",
      },
      en: {
        label: "P&L by Month",
        short: "The sum of closed-trade P&L for each month, by entry date.",
        example: "Example: in March +$200, −$50 and +$100 ⇒ +$250.",
        caveat: "A trade not converted to your capital currency is not counted.",
      },
      es: {
        label: "G/P por Mes",
        short: "Suma del G/P de operaciones cerradas por mes, según la fecha de entrada.",
        example: "Ejemplo: en marzo +$200, −$50 y +$100 ⇒ +$250.",
        caveat: "No cuenta la operación no convertida a la moneda de tu capital.",
      },
      pt: {
        label: "L/P por Mês",
        short: "Soma do L/P das operações fechadas por mês, pela data de entrada.",
        example: "Exemplo: em março +$200, −$50 e +$100 ⇒ +$250.",
        caveat: "Uma operação não convertida para a moeda do seu capital não é contada.",
      },
      ar: {
        label: "الربح/الخسارة حسب الشهر",
        short: "مجموع ربح/خسارة الصفقات المغلقة لكل شهر، حسب تاريخ الدخول.",
        example: "مثال: في مارس \u200e+$200 و\u200e−$50 و\u200e+$100 ⇒ \u200e+$250.",
        caveat: "الصفقة غير المحوّلة إلى عملة رأس مالك لا تُحسب.",
      },
    },
  },
  {
    id: "emotionPerformance",
    computedIn: ["SwingEdge_App.jsx:6904"],
    related: ["bestEmotion"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · גרף"],
    i18n: {
      he: {
        label: "ביצועים לפי רגש",
        short: "סך ה-P&L של העסקאות הסגורות לפי הרגש שסימנת בכניסה.",
        example: "לדוגמה: FOMO · 4 עסקאות · \u200e−$300.",
        caveat: "עסקה בלי רגש מסומן נספרת כ-Unknown.",
      },
      en: {
        label: "Emotion Performance",
        short: "Total closed-trade P&L by the emotion you marked at entry.",
        example: "Example: FOMO · 4 trades · −$300.",
        caveat: "A trade with no emotion marked counts as Unknown.",
      },
      es: {
        label: "Rendimiento por Emoción",
        short: "G/P total de operaciones cerradas según la emoción que marcaste al entrar.",
        example: "Ejemplo: FOMO · 4 operaciones · −$300.",
        caveat: "Sin emoción marcada, cuenta como Unknown.",
      },
      pt: {
        label: "Desempenho por Emoção",
        short: "L/P total das operações fechadas pela emoção que você marcou na entrada.",
        example: "Exemplo: FOMO · 4 operações · −$300.",
        caveat: "Sem emoção marcada, conta como Unknown.",
      },
      ar: {
        label: "الأداء حسب الشعور",
        short: "إجمالي ربح/خسارة الصفقات المغلقة حسب الشعور الذي حدّدته عند الدخول.",
        example: "مثال: FOMO · 4 صفقات · \u200e−$300.",
        caveat: "الصفقة بلا شعور محدّد تُحسب كـ Unknown.",
      },
    },
  },
  {
    id: "setupMatrix",
    computedIn: ["SwingEdge_App.jsx:6919"],
    related: ["performanceBySetup", "bestSetup"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · טבלה"],
    i18n: {
      he: {
        label: "מטריצת סטאפים",
        short: "טבלה לכל סטאפ: עסקאות, אחוז הצלחה, R ממוצע ו-P&L, ממוינת לפי P&L.",
        example: "לדוגמה: Breakout · 8 · 50% · \u200e+0.4R · \u200e+$600.",
      },
      en: {
        label: "Setup Matrix",
        short: "A table per setup: trades, win rate, average R and P&L, sorted by P&L.",
        example: "Example: Breakout · 8 · 50% · +0.4R · +$600.",
      },
      es: {
        label: "Matriz de Setups",
        short: "Una tabla por setup: operaciones, Win Rate, R promedio y G/P, ordenada por G/P.",
        example: "Ejemplo: Breakout · 8 · 50% · +0.4R · +$600.",
      },
      pt: {
        label: "Matriz de Setups",
        short: "Uma tabela por setup: operações, Win Rate, R médio e L/P, ordenada por L/P.",
        example: "Exemplo: Breakout · 8 · 50% · +0.4R · +$600.",
      },
      ar: {
        label: "مصفوفة السيناريوهات",
        short: "جدول لكل سيناريو: الصفقات وWin Rate ومتوسط R والربح/الخسارة، مرتّب بالربح/الخسارة.",
        example: "مثال: Breakout · 8 · 50% · \u200e+0.4R · \u200e+$600.",
      },
    },
  },
  {
    id: "holdTimeVsPnl",
    computedIn: ["SwingEdge_App.jsx:6933"],
    related: ["avgHold"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · גרף פיזור"],
    i18n: {
      he: {
        label: "זמן החזקה מול רווח",
        short: "כל נקודה היא עסקה סגורה: ימי ההחזקה בציר אחד וה-P&L בציר השני.",
        example: "לדוגמה: נקודה ב-5 ימים וב-\u200e+$300 = עסקה שהחזקת 5 ימים והרוויחה $300.",
        caveat: "עסקה שלא הומרה למטבע ההון לא מוצגת.",
      },
      en: {
        label: "Hold Time vs P&L",
        short: "Each dot is a closed trade: holding days against P&L.",
        example: "Example: a dot at 5 days and +$300 = held 5 days, made $300.",
        caveat: "Trades not converted to your capital currency are not shown.",
      },
      es: {
        label: "Tiempo de Tenencia vs G/P",
        short: "Cada punto, una operación cerrada: días de tenencia frente a G/P.",
        example: "Ejemplo: punto en 5 días y +$300 = 5 días abierta, ganó $300.",
        caveat: "No se muestran operaciones sin convertir a tu moneda de capital.",
      },
      pt: {
        label: "Tempo de Posição vs L/P",
        short: "Cada ponto é uma operação fechada: dias de posição contra L/P.",
        example: "Exemplo: ponto em 5 dias e +$300 = mantida 5 dias, lucrou $300.",
        caveat: "Operações não convertidas à moeda do seu capital não aparecem.",
      },
      ar: {
        label: "مدة الاحتفاظ مقابل الربح/الخسارة",
        short: "كل نقطة صفقة مغلقة: أيام الاحتفاظ مقابل الربح/الخسارة.",
        example: "مثال: نقطة عند 5 أيام و\u200e+$300 = احتُفظ بها 5 أيام وربحت $300.",
        caveat: "الصفقات غير المحوّلة إلى عملة رأس مالك لا تُعرض.",
      },
    },
  },
];
