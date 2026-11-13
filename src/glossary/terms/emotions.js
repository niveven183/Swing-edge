// src/glossary/terms/emotions.js — רגשות
// ⛔ מקור האמת היחיד למונחים האלה. עריכה כאן ⇒ `npm run glossary` באותו קומיט (test:glossary תופס סחיפה).
// פורמט (גל 3): short = הגדרה במשפט אחד ≤18 מילים · example = "לדוגמה:"/"Example:" במספרים היפותטיים · caveat אחד לכל היותר · longForm = הטקסט המלא (מודאל המילון).
// pendingTranslation: es/pt/ar עדיין בטקסט הישן — שלב 5.

/** @type {import("../types.js").GlossaryTerm[]} */
export default [
  {
    id: "emotionConfident",
    sources: ["DOUGLAS"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · מקרא ביצועים לפי רגש"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "Confident",
        short: "ביטחון שנשען על setup תקף ועל ניתוח, לא על רצף רווחים.",
        example: "לדוגמה: כל התנאים שכתבת התקיימו ונכנסת בגודל הרגיל.",
        caveat: "אחרי רצף רווחים — בדוק שזה לא ביטחון-יתר.",
        longForm: "ביטחון מבוסס ניתוח, לא יוהרה. כשהוא נשען על setup תקף — מוביל לביצוע ממושמע. כשהוא הופך לביטחון-יתר אחרי רצף נצחונות, הוא מסוכן.",
      },
      en: {
        label: "Confident",
        short: "Confidence grounded in a valid setup and analysis, not in a winning streak.",
        example: "Example: every condition you wrote down was met and you entered at normal size.",
        caveat: "After a winning streak, check that it is not overconfidence.",
        longForm: "Confidence grounded in analysis, not bravado. When based on a valid setup it drives disciplined execution; when it tips into overconfidence after a win streak, it becomes risky.",
      },
      es: {
        label: "Confident",
        short: "Confianza basada en el análisis, no en la arrogancia. Sobre un setup válido impulsa una ejecución disciplinada; si se convierte en exceso de confianza tras una racha ganadora, se vuelve peligrosa.",
      },
      pt: {
        label: "Confident",
        short: "Confiança baseada na análise, não em arrogância. Sobre um setup válido gera execução disciplinada; se virar excesso de confiança após uma sequência de vitórias, torna-se arriscada.",
      },
      ar: {
        label: "Confident",
        short: "ثقة مبنية على التحليل وليست غروراً. عندما تستند إلى نموذج دخول صحيح تؤدي إلى تنفيذ منضبط؛ وعندما تتحول إلى ثقة مفرطة بعد سلسلة انتصارات تصبح خطيرة.",
      },
    },
  },
  {
    id: "emotionCalm",
    sources: ["DOUGLAS"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · מקרא ביצועים לפי רגש"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "Calm",
        short: "נכנסת בלי לחץ ובלי מרדף, לפי התוכנית.",
        example: "לדוגמה: חיכית למחיר שתכננת והצבת סטופ ויעד מראש.",
        longForm: "המצב הרגשי האופטימלי לסוחר. שלווה מאפשרת לעקוב אחרי התוכנית בלי לרדוף או להיבהל. עסקאות שנפתחות ברוגע נוטות לדבוק ב-stop וב-target.",
      },
      en: {
        label: "Calm",
        short: "You entered without pressure or chasing, according to plan.",
        example: "Example: you waited for your planned price and set the stop and target in advance.",
        longForm: "The optimal emotional state for a trader. Calm lets you follow your plan without chasing or panicking. Trades opened calmly tend to respect their stop and target.",
      },
      es: {
        label: "Calm",
        short: "El estado emocional óptimo para un trader. La calma te permite seguir tu plan sin perseguir ni entrar en pánico. Las operaciones abiertas con calma tienden a respetar su stop y objetivo.",
      },
      pt: {
        label: "Calm",
        short: "O estado emocional ideal para um trader. A calma permite seguir o seu plano sem perseguir nem entrar em pânico. Operações abertas com calma tendem a respeitar o stop e o alvo.",
      },
      ar: {
        label: "Calm",
        short: "الحالة العاطفية المثلى للمتداول. الهدوء يتيح لك اتّباع خطتك دون مطاردة أو ذعر. الصفقات التي تُفتح بهدوء تميل إلى احترام وقف الخسارة والهدف.",
      },
    },
  },
  {
    id: "emotionPatient",
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · מקרא ביצועים לפי רגש"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "Patient",
        short: "חיכית ל-setup שעומד בכל הקריטריונים שלך, במקום להיכנס לכל תנועה.",
        example: "לדוגמה: דילגת על שתי פריצות חלשות ונכנסת בשלישית.",
        longForm: "המתנה ל-setup שבאמת עומד בקריטריונים, במקום להיכנס לכל תנועה. סבלנות היא לרוב ההבדל בין סוחר רווחי למפסיד — היא מסננת עסקאות באיכות נמוכה.",
      },
      en: {
        label: "Patient",
        short: "You waited for a setup that met all your criteria instead of entering every move.",
        example: "Example: you skipped two weak breakouts and took the third.",
        longForm: "Waiting for a setup that genuinely meets your criteria instead of entering every move. Patience is often what separates a profitable trader from a losing one — it filters out low-quality trades.",
      },
      es: {
        label: "Patient",
        short: "Esperar un setup que realmente cumpla tus criterios en lugar de entrar en cada movimiento. La paciencia suele ser lo que separa a un trader rentable de uno perdedor: filtra las operaciones de baja calidad.",
      },
      pt: {
        label: "Patient",
        short: "Esperar por um setup que realmente cumpra os seus critérios em vez de entrar em cada movimento. A paciência costuma ser o que separa um trader lucrativo de um perdedor — filtra operações de baixa qualidade.",
      },
      ar: {
        label: "Patient",
        short: "انتظار نموذج دخول يستوفي معاييرك فعلاً بدلاً من الدخول في كل حركة. الصبر غالباً ما يفصل بين المتداول الرابح والخاسر، فهو يُصفّي الصفقات منخفضة الجودة.",
      },
    },
  },
  {
    id: "emotionNeutral",
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · מקרא ביצועים לפי רגש"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "Neutral",
        short: "נכנסת בלי מטען רגשי — לא נלהב ולא חושש.",
        example: "לדוגמה: עוד עסקה מתוך התוכנית, בלי ציפייה מיוחדת.",
        longForm: "כניסה ללא מטען רגשי — לא נלהב ולא חושש. מצב יציב שמאפשר החלטות אובייקטיביות לפי הנתונים בלבד. בסיס טוב, גם אם פחות חד מ-\"רגוע\".",
      },
      en: {
        label: "Neutral",
        short: "You entered with no emotional charge — neither excited nor fearful.",
        example: "Example: one more trade from the plan, with no special expectation.",
        longForm: "Entering with no emotional charge — neither excited nor fearful. A stable state that allows objective, data-driven decisions. A solid baseline, even if less sharp than \"Calm\".",
      },
      es: {
        label: "Neutral",
        short: "Entrar sin carga emocional, ni eufórico ni temeroso. Un estado estable que permite decisiones objetivas basadas en datos. Una buena base, aunque menos afilada que \"Calm\".",
      },
      pt: {
        label: "Neutral",
        short: "Entrar sem carga emocional — nem eufórico nem receoso. Um estado estável que permite decisões objetivas e baseadas em dados. Uma boa base, ainda que menos afiada que \"Calm\".",
      },
      ar: {
        label: "Neutral",
        short: "الدخول دون شحنة عاطفية، لا متحمّس ولا خائف. حالة مستقرة تتيح قرارات موضوعية مبنية على البيانات. أساس جيّد، وإن كان أقل حدّة من \"Calm\".",
      },
    },
  },
  {
    id: "emotionHesitant",
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · מקרא ביצועים לפי רגש"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "Hesitant",
        short: "היססת בכניסה — לרוב כשה-setup לא ברור או שהביטחון נמוך.",
        example: "לדוגמה: חיכית לעוד נר ונכנסת $0.50 מעל המחיר שתכננת.",
        longForm: "היסוס בכניסה — לרוב סימן ש-setup לא ברור או שביטחון העצמי נמוך. כניסות מהוססות נוטות לכניסה מאוחרת, stop קרוב מדי, או יציאה מוקדמת מפחד.",
      },
      en: {
        label: "Hesitant",
        short: "You hesitated at entry — usually when the setup is unclear or confidence is low.",
        example: "Example: you waited for one more candle and entered $0.50 above your planned price.",
        longForm: "Hesitation at entry — usually a sign the setup isn't clear or confidence is low. Hesitant entries tend to mean entering late, placing the stop too tight, or exiting early out of fear.",
      },
      es: {
        label: "Hesitant",
        short: "Vacilación en la entrada, normalmente señal de que el setup no está claro o la confianza es baja. Las entradas vacilantes suelen implicar entrar tarde, poner el stop demasiado ajustado o salir antes por miedo.",
      },
      pt: {
        label: "Hesitant",
        short: "Hesitação na entrada — geralmente sinal de que o setup não está claro ou a confiança está baixa. Entradas hesitantes tendem a significar entrar tarde, colocar o stop apertado demais ou sair cedo por medo.",
      },
      ar: {
        label: "Hesitant",
        short: "التردّد عند الدخول، وغالباً ما يكون علامة على أن نموذج الدخول غير واضح أو أن الثقة منخفضة. الدخول المتردّد يميل إلى التأخّر في الدخول، أو وضع وقف خسارة ضيّق جداً، أو الخروج مبكراً بدافع الخوف.",
      },
    },
  },
  {
    id: "emotionNervous",
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · מקרא ביצועים לפי רגש"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "Nervous",
        short: "מתח שהעיב על שיקול הדעת שלך בזמן העסקה.",
        example: "לדוגמה: בדקת את המחיר כל דקה והזזת את הסטופ פעמיים.",
        caveat: "לעיתים סימן שהפוזיציה גדולה מדי.",
        longForm: "מתח שמקשה על קבלת החלטות. עצבנות מובילה לבדיקת מחיר אובססיבית, הזזת stop, ויציאות פזיזות. לרוב מעידה על פוזיציה גדולה מדי או חוסר ביטחון ב-setup.",
      },
      en: {
        label: "Nervous",
        short: "Tension that clouded your judgment during the trade.",
        example: "Example: you checked the price every minute and moved the stop twice.",
        caveat: "Sometimes a sign the position is too large.",
        longForm: "Tension that clouds decision-making. Nervousness leads to obsessive price-checking, moving the stop, and impulsive exits. Often a sign the position is too large or the setup isn't trusted.",
      },
      es: {
        label: "Nervous",
        short: "Tensión que nubla la toma de decisiones. El nerviosismo lleva a revisar el precio de forma obsesiva, mover el stop y salir impulsivamente. Suele indicar una posición demasiado grande o falta de confianza en el setup.",
      },
      pt: {
        label: "Nervous",
        short: "Tensão que prejudica a tomada de decisão. O nervosismo leva a verificar o preço de forma obsessiva, mexer no stop e sair por impulso. Costuma indicar uma posição grande demais ou falta de confiança no setup.",
      },
      ar: {
        label: "Nervous",
        short: "توتّر يُشوّش اتخاذ القرار. العصبية تؤدي إلى مراقبة السعر بهوس، وتحريك وقف الخسارة، والخروج المتسرّع. وغالباً ما تدل على أن حجم الصفقة كبير جداً أو عدم الثقة في نموذج الدخول.",
      },
    },
  },
  {
    id: "emotionFOMO",
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · מקרא ביצועים לפי רגש"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "FOMO",
        short: "נכנסת כי המחיר זז חזק ופחדת להחמיץ, בלי setup תקף.",
        example: "לדוגמה: המניה עלתה \u200e+6% ונכנסת בשיא בלי סטופ ברור.",
        longForm: "\"פחד מהחמצה\" — כניסה לעסקה רק כי המחיר זז בחדות, בלי setup תקף. אחד הדפוסים ההפסדיים ביותר: כניסה מאוחרת, מרדף אחרי המחיר, ו-stop רחוק. דגל אזהרה.",
      },
      en: {
        label: "FOMO",
        short: "You entered because price moved hard and you feared missing out, with no valid setup.",
        example: "Example: the stock was up +6% and you entered at the high with no clear stop.",
        longForm: "\"Fear Of Missing Out\" — entering a trade just because price moved sharply, with no valid setup. One of the most destructive patterns: late entry, chasing price, and a distant stop. A red flag.",
      },
      es: {
        label: "FOMO",
        short: "\"Miedo a quedarse fuera\" — entrar en una operación solo porque el precio se movió con fuerza, sin un setup válido. Uno de los patrones más destructivos: entrada tardía, perseguir el precio y un stop lejano. Una señal de alerta.",
      },
      pt: {
        label: "FOMO",
        short: "\"Medo de ficar de fora\" — entrar numa operação só porque o preço se moveu com força, sem um setup válido. Um dos padrões mais destrutivos: entrada tardia, perseguir o preço e um stop distante. Um sinal de alerta.",
      },
      ar: {
        label: "FOMO",
        short: "\"الخوف من تفويت الفرصة\" — الدخول في صفقة لمجرّد أن السعر تحرّك بحدّة، دون نموذج دخول صحيح. من أكثر الأنماط تدميراً: دخول متأخّر، ومطاردة السعر، ووقف خسارة بعيد. علامة تحذير.",
      },
    },
  },
  {
    id: "emotionAngry",
    sources: ["STEEN"],
    shownAt: ["SwingEdge_App.jsx — אנליטיקס · מקרא ביצועים לפי רגש"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "Angry",
        short: "כעס אחרי הפסד שדחף אותך להחזיר אותו מיד — מסחר נקמה.",
        example: "לדוגמה: הפסדת $200 ופתחת מיד עסקה בגודל כפול.",
        longForm: "כעס אחרי הפסד — הדלק של \"מסחר נקמה\". במצב הזה הסוחר מנסה להחזיר הפסד מיד, מגדיל סיכון, ונכנס לעסקאות גרועות. זה המצב שבו מאבדים חשבונות. עצור.",
      },
      en: {
        label: "Angry",
        short: "Anger after a loss that pushed you to win it back at once — revenge trading.",
        example: "Example: you lost $200 and immediately opened a trade at double size.",
        longForm: "Anger after a loss — the fuel of \"revenge trading\". In this state a trader tries to win back a loss immediately, raises risk, and takes bad trades. This is how accounts blow up. Stop.",
      },
      es: {
        label: "Angry",
        short: "Ira tras una pérdida — el combustible del \"trading de venganza\". En este estado el trader intenta recuperar la pérdida de inmediato, aumenta el riesgo y entra en malas operaciones. Así se revientan las cuentas. Detente.",
      },
      pt: {
        label: "Angry",
        short: "Raiva após uma perda — o combustível do \"trading de vingança\". Nesse estado o trader tenta recuperar a perda de imediato, aumenta o risco e faz operações ruins. É assim que se destroem contas. Pare.",
      },
      ar: {
        label: "Angry",
        short: "الغضب بعد الخسارة — وقود \"التداول الانتقامي\". في هذه الحالة يحاول المتداول استعادة خسارته فوراً، فيرفع المخاطرة ويدخل صفقات سيئة. هكذا تُدمَّر الحسابات. توقّف.",
      },
    },
  },
];
