// src/glossary/terms/chart.js — פעולות ותכונות
// ⛔ מקור האמת היחיד למונחים האלה. עריכה כאן ⇒ `npm run glossary` באותו קומיט (test:glossary תופס סחיפה).
// פורמט (גל 3): short = הגדרה במשפט אחד ≤18 מילים · example = "לדוגמה:"/"Example:" במספרים היפותטיים · caveat אחד לכל היותר · longForm = הטקסט המלא (מודאל המילון).
// 5 שפות מלאות (שלב 5, 14.11): es/pt/ar מתורגמים מ-he/en, ≤110% מתווי en. שפה שממתינה לתרגום ⇒ pendingTranslation + שורה ב-test:glossary (L3).

/** @type {import("../types.js").GlossaryTerm[]} */
export default [
  {
    id: "chartCalcPosition",
    related: ["positionSize", "takeProfit"],
    shownAt: ["SwingEdge_App.jsx — גרף · פעולות"],
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
        short: "Rellena la calculadora de posición desde el gráfico: ticker, precio en vivo como entrada, stop y objetivo 1:2.",
        example: "Ejemplo: entrada $50 y stop $48 ⇒ objetivo $54.",
        longForm: "Rellena automáticamente la Calculadora de Posición desde el gráfico actual — ticker, precio en vivo como entrada, un stop protector y un objetivo 1:2 — y luego la abre para que dimensiones la operación en un clic.",
      },
      pt: {
        label: "Calcular Posição",
        short: "Preenche a calculadora de posição pelo gráfico: ticker, preço ao vivo como entrada, stop e alvo 1:2.",
        example: "Exemplo: entrada $50 e stop $48 ⇒ alvo $54.",
        longForm: "Preenche automaticamente a Calculadora de Posição a partir do gráfico atual — ticker, preço ao vivo como entrada, um stop de proteção e um alvo 1:2 — e depois a abre para você dimensionar a operação em um clique.",
      },
      ar: {
        label: "احسب الصفقة",
        short: "يملأ حاسبة الصفقة من الرسم البياني: الرمز، والسعر الحي كدخول، ووقف، وهدف 1:2.",
        example: "مثال: دخول $50 ووقف $48 ⇒ هدف $54.",
        longForm: "يملأ تلقائياً حاسبة الصفقة من الرسم البياني الحالي — الرمز، والسعر الحي كدخول، ووقف حماية، وهدف 1:2 — ثم يفتحها لتحدّد حجم الصفقة بنقرة واحدة.",
      },
    },
  },
  {
    id: "chartAddToJournal",
    related: ["takeProfit"],
    shownAt: ["SwingEdge_App.jsx — גרף · פעולות"],
    i18n: {
      he: {
        label: "הוסף ליומן",
        short: "פותח עסקה חדשה ביומן מהגרף — טיקר, מחיר חי, סטופ מוצע ויעד 1:2 — לבדיקה ושמירה.",
        example: "לדוגמה: כניסה $50, סטופ $48 ויעד $54 ממולאים, ושמרת.",
        longForm: "פותח עסקה חדשה ביומן מהגרף הנוכחי — טיקר, מחיר חי, סטופ מוצע ויעד 1:2 ממולאים מראש — מוכן לבדיקה ושמירה.",
      },
      en: {
        label: "Add to Journal",
        short: "Opens a journal trade from the chart, prefilled with ticker, live price, a stop and a 1:2 target.",
        example: "Example: entry $50, stop $48 and target $54 filled in, and you saved.",
        longForm: "Starts a new journal trade from the current chart — ticker, live price, a suggested stop and a 1:2 target pre-filled — ready for you to review and save.",
      },
      es: {
        label: "Añadir al Diario",
        short: "Abre una operación en el diario desde el gráfico, prellenada con ticker, precio en vivo, stop y objetivo 1:2.",
        example: "Ejemplo: se rellenaron entrada $50, stop $48 y objetivo $54, y guardaste.",
        longForm: "Inicia una nueva operación en el diario desde el gráfico actual — ticker, precio en vivo, un stop sugerido y un objetivo 1:2 prellenados — lista para que la revises y la guardes.",
      },
      pt: {
        label: "Adicionar ao Diário",
        short: "Abre uma operação no diário pelo gráfico, pré-preenchida com ticker, preço ao vivo, stop e alvo 1:2.",
        example: "Exemplo: entrada $50, stop $48 e alvo $54 preenchidos, e você salvou.",
        longForm: "Inicia uma nova operação no diário a partir do gráfico atual — ticker, preço ao vivo, um stop sugerido e um alvo 1:2 pré-preenchidos — pronta para você revisar e salvar.",
      },
      ar: {
        label: "أضف إلى اليوميّة",
        short: "يفتح صفقة في اليوميّة من الرسم البياني، معبّأة مسبقاً بالرمز والسعر الحي ووقف وهدف 1:2.",
        example: "مثال: عُبّئت قيم الدخول $50 والوقف $48 والهدف $54، ثم حفظت.",
        longForm: "يبدأ صفقة جديدة في اليوميّة من الرسم البياني الحالي — الرمز، والسعر الحي، ووقف مقترح، وهدف 1:2 معبّأة مسبقاً — جاهزة لتراجعها وتحفظها.",
      },
    },
  },
  {
    id: "visionOcr",
    computedIn: ["api/ocr.js"],
    shownAt: ["src/components/LandingPage.jsx — דף הנחיתה · הדגשת מונח"],
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
        short: "Lee una operación desde una captura del gráfico y rellena los campos en lugar de escribirlos.",
        example: "Ejemplo: subiste una captura con entrada, stop y objetivo ⇒ los campos se rellenaron.",
        caveat: "Revisa los valores antes de guardar.",
      },
      pt: {
        label: "Vision OCR",
        short: "Lê uma operação a partir de um print do gráfico e preenche os campos em vez de você digitar.",
        example: "Exemplo: você enviou um print com entrada, stop e alvo ⇒ os campos foram preenchidos.",
        caveat: "Confira os valores antes de salvar.",
      },
      ar: {
        label: "Vision OCR",
        short: "يقرأ صفقة من لقطة شاشة للرسم البياني ويملأ الحقول بدلاً من الكتابة.",
        example: "مثال: رفعت لقطة شاشة فيها الدخول والوقف والهدف ⇒ امتلأت الحقول.",
        caveat: "تحقّق من القيم قبل الحفظ.",
      },
    },
  },
];
