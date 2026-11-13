// src/glossary/terms/chart.js — פעולות ותכונות
// ⛔ מקור האמת היחיד למונחים האלה. עריכה כאן ⇒ `npm run glossary` באותו קומיט (test:glossary תופס סחיפה).
// פורמט (גל 3): short = הגדרה במשפט אחד ≤18 מילים · example = "לדוגמה:"/"Example:" במספרים היפותטיים · caveat אחד לכל היותר · longForm = הטקסט המלא (מודאל המילון).
// pendingTranslation: es/pt/ar עדיין בטקסט הישן — שלב 5.

/** @type {import("../types.js").GlossaryTerm[]} */
export default [
  {
    id: "chartCalcPosition",
    related: ["positionSize", "takeProfit"],
    shownAt: ["SwingEdge_App.jsx — גרף · פעולות"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "חשב פוזיציה",
        short: "ממלא את מחשבון הפוזיציה מהגרף: טיקר, מחיר חי ככניסה, סטופ ויעד 1:2.",
        example: "לדוגמה: כניסה $50 וסטופ $48 ⇒ יעד $54.",
        longForm: "ממלא אוטומטית את מחשבון הפוזיציה מהגרף הנוכחי — טיקר, מחיר חי ככניסה, סטופ מגן ויעד 1:2 — ופותח אותו כדי לחשב גודל עסקה בלחיצה אחת.",
      },
      en: {
        label: "Calculate Position",
        short: "Fills the position calculator from the chart: ticker, live price as entry, a stop and a 1:2 target.",
        example: "Example: entry $50 and stop $48 ⇒ target $54.",
        longForm: "Auto-fills the Position Calculator from the current chart — ticker, live price as entry, a protective stop and a 1:2 target — then opens it so you can size the trade in one click.",
      },
      es: {
        label: "Calcular Posición",
        short: "Rellena automáticamente la Calculadora de Posición desde el gráfico actual — ticker, precio en vivo como entrada, un stop protector y un objetivo 2:1 — y luego la abre para que dimensiones la operación en un clic.",
      },
      pt: {
        label: "Calcular Posição",
        short: "Preenche automaticamente a Calculadora de Posição a partir do gráfico atual — ticker, preço ao vivo como entrada, um stop protetor e um alvo 2:1 — e depois abre-a para dimensionares a operação num clique.",
      },
      ar: {
        label: "احسب الصفقة",
        short: "يملأ تلقائياً حاسبة الصفقة من الرسم الحالي — الرمز، السعر الحي كدخول، وقف حماية وهدف 2:1 — ثم يفتحها لتحدّد حجم الصفقة بنقرة واحدة.",
      },
    },
  },
  {
    id: "chartAddToJournal",
    related: ["takeProfit"],
    shownAt: ["SwingEdge_App.jsx — גרף · פעולות"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "הוסף ליומן",
        short: "פותח עסקה חדשה ביומן מהגרף — טיקר, מחיר חי, סטופ מוצע ויעד 1:2 — לבדיקה ושמירה.",
        example: "לדוגמה: כניסה $50, סטופ $48 ויעד $54 ממולאים, ואתה שומר.",
        longForm: "פותח עסקה חדשה ביומן מהגרף הנוכחי — טיקר, מחיר חי, סטופ מוצע ויעד 1:2 ממולאים מראש — מוכן לבדיקה ושמירה.",
      },
      en: {
        label: "Add to Journal",
        short: "Opens a journal trade from the chart, prefilled with ticker, live price, a stop and a 1:2 target.",
        example: "Example: entry $50, stop $48 and target $54 filled in, and you save.",
        longForm: "Starts a new journal trade from the current chart — ticker, live price, a suggested stop and a 1:2 target pre-filled — ready for you to review and save.",
      },
      es: {
        label: "Añadir al Diario",
        short: "Inicia una nueva operación en el diario desde el gráfico actual — ticker, precio en vivo, un stop sugerido y un objetivo 2:1 pre-rellenados — lista para que la revises y guardes.",
      },
      pt: {
        label: "Adicionar ao Diário",
        short: "Inicia uma nova operação no diário a partir do gráfico atual — ticker, preço ao vivo, um stop sugerido e um alvo 2:1 pré-preenchidos — pronta para reveres e guardares.",
      },
      ar: {
        label: "أضف إلى اليوميّة",
        short: "يبدأ صفقة جديدة في اليوميّة من الرسم الحالي — الرمز، السعر الحي، وقف مقترح وهدف 2:1 مملوءة مسبقاً — جاهزة لمراجعتك وحفظك.",
      },
    },
  },
  {
    id: "visionOcr",
    computedIn: ["api/ocr.js"],
    shownAt: ["src/components/LandingPage.jsx — דף הנחיתה · הדגשת מונח"],
    pendingTranslation: ["es", "pt", "ar"],
    i18n: {
      he: {
        label: "Vision OCR",
        short: "קורא עסקה מצילום מסך של הגרף וממלא את השדות במקום הקלדה.",
        example: "לדוגמה: העלית צילום עם כניסה, סטופ ויעד ⇒ השדות התמלאו.",
        caveat: "בדוק את הערכים לפני השמירה.",
      },
      en: {
        label: "Vision OCR",
        short: "Reads a trade from a chart screenshot and fills the fields instead of typing.",
        example: "Example: you uploaded a screenshot with entry, stop and target ⇒ the fields were filled.",
        caveat: "Check the values before saving.",
      },
      es: {
        label: "Vision OCR",
        short: "Reads a trade from a chart screenshot and fills the fields instead of typing.\nExample: you uploaded a screenshot with entry, stop and target ⇒ the fields were filled.\nCheck the values before saving.",
      },
      pt: {
        label: "Vision OCR",
        short: "Reads a trade from a chart screenshot and fills the fields instead of typing.\nExample: you uploaded a screenshot with entry, stop and target ⇒ the fields were filled.\nCheck the values before saving.",
      },
      ar: {
        label: "Vision OCR",
        short: "Reads a trade from a chart screenshot and fills the fields instead of typing.\nExample: you uploaded a screenshot with entry, stop and target ⇒ the fields were filled.\nCheck the values before saving.",
      },
    },
  },
];
