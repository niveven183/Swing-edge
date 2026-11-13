// src/glossary/terms/chart.js — פעולות גרף
// ⛔ מקור האמת היחיד למונחים האלה. עריכה כאן ⇒ `npm run glossary` באותו קומיט (test:glossary תופס סחיפה).

/** @type {import("../types.js").GlossaryTerm[]} */
export default [
  {
    id: "chartCalcPosition",
    i18n: {
      he: {
        label: "חשב פוזיציה",
        short: "ממלא אוטומטית את מחשבון הפוזיציה מהגרף הנוכחי — טיקר, מחיר חי ככניסה, סטופ מגן ויעד 2:1 — ופותח אותו כדי לחשב גודל עסקה בלחיצה אחת.",
      },
      en: {
        label: "Calculate Position",
        short: "Auto-fills the Position Calculator from the current chart — ticker, live price as entry, a protective stop and a 2:1 target — then opens it so you can size the trade in one click.",
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
    i18n: {
      he: {
        label: "הוסף ליומן",
        short: "פותח עסקה חדשה ביומן מהגרף הנוכחי — טיקר, מחיר חי, סטופ מוצע ויעד 2:1 ממולאים מראש — מוכן לבדיקה ושמירה.",
      },
      en: {
        label: "Add to Journal",
        short: "Starts a new journal trade from the current chart — ticker, live price, a suggested stop and a 2:1 target pre-filled — ready for you to review and save.",
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
];
