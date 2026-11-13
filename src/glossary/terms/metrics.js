// src/glossary/terms/metrics.js — מדדים נוספים
// ⛔ מקור האמת היחיד למונחים האלה. עריכה כאן ⇒ `npm run glossary` באותו קומיט (test:glossary תופס סחיפה).

/** @type {import("../types.js").GlossaryTerm[]} */
export default [
  {
    id: "rr",
    i18n: {
      he: {
        label: "סיכון / סיכוי · R/R",
        short: "יחס סיכון-סיכוי. כמה אתה עלול להרוויח מול כמה אתה מסכן. 3:1 = פוטנציאל רווח פי 3 מההפסד.",
      },
      en: {
        label: "Risk / Reward",
        short: "Risk/Reward. Potential profit vs. what you risk. 3:1 = you stand to make 3× what you'd lose.",
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
    i18n: {
      he: {
        label: "R-Multiple",
        short: "R-Multiple = רווח העסקה ÷ הסיכון הראשוני. הרווח נגזר מכיוון העסקה: ב-LONG הוא (יציאה − כניסה), וב-SHORT הוא (כניסה − יציאה) — כך ש-SHORT מנצחת היא תמיד R חיובי.\n\nדוגמאות:\n+2R = הרווחת פי 2 ממה שסיכנת ✓\n+1R = הרווחת בדיוק מה שסיכנת ✓\n-1R = הפסדת את הסיכון המתוכנן (נורמלי)\n-2R = הסטופ לא כובד (בעיה)\n\nמעקב אחר R-Multiple מסיר הטיית דולר ומאפשר השוואה אובייקטיבית בין עסקאות.",
      },
      en: {
        label: "R-Multiple",
        short: "R-Multiple = trade profit ÷ initial risk. The profit follows the direction of the trade: on a LONG it is (Exit − Entry), on a SHORT it is (Entry − Exit) — so a winning SHORT is always a positive R.\n\nExamples:\n+2R = you made 2× what you risked ✓\n+1R = made exactly what you risked ✓\n-1R = lost your planned risk (normal)\n-2R = stop was not honored (problem)\n\nTracking R-Multiple eliminates dollar bias and lets you compare trades objectively.",
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
    i18n: {
      he: {
        label: "MFE / MAE",
        short: "כמה רחוק לטובתך הלכה העסקה (MFE) וכמה נגדך (MAE) לפני הסגירה. עוזר לכוון סטופים ויעדים.",
      },
      en: {
        label: "MFE / MAE",
        short: "How far a trade ran in your favor (MFE) and against you (MAE) before it closed. Helps tune stops and targets.",
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
    i18n: {
      he: {
        label: "ציון Wilson",
        short: "אומדן זהיר לאחוז הזכייה ה\"אמיתי\" שלך כשמספר העסקאות קטן. מונע אשליה מסדרה קצרה של ניצחונות.",
      },
      en: {
        label: "Wilson Score",
        short: "A cautious estimate of your \"true\" win rate when sample size is small. Stops a short hot streak from fooling you.",
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
    i18n: {
      he: {
        label: "R/R 3+",
        short: "קבוצת עסקאות עם יחס סיכון/סיכוי של 3 ומעלה: הרווח הפוטנציאלי גדול פי 3 לפחות מהסיכון. אלה העסקאות האיכותיות ביותר מבחינת יחס — גם אם אחוז ההצלחה נמוך, מספיק לנצח בחלקן כדי להיות רווחי.",
      },
      en: {
        label: "R/R 3+",
        short: "A group of trades with a risk/reward ratio of 3 or higher — the potential reward is at least 3× the risk. These are the highest-quality trades by ratio: even with a low win rate, winning a fraction of them is enough to be profitable.",
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
