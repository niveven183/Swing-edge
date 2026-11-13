// src/glossary/terms/market.js — תנאי שוק
// ⛔ מקור האמת היחיד למונחים האלה. עריכה כאן ⇒ `npm run glossary` באותו קומיט (test:glossary תופס סחיפה).

/** @type {import("../types.js").GlossaryTerm[]} */
export default [
  {
    id: "marketTrendingUp",
    i18n: {
      he: {
        label: "Trending Up",
        short: "שוק במגמת עלייה: שיאים גבוהים יותר ושפלים גבוהים יותר. ה-setups של מסחר-לונג עובדים הכי טוב כאן; מסחר נגד המגמה מסוכן.",
      },
      en: {
        label: "Trending Up",
        short: "An uptrending market: higher highs and higher lows. Long setups work best here; trading against the trend is risky.",
      },
      es: {
        label: "Trending Up",
        short: "Un mercado en tendencia alcista: máximos y mínimos más altos. Los setups en largo funcionan mejor aquí; operar contra la tendencia es arriesgado.",
      },
      pt: {
        label: "Trending Up",
        short: "Um mercado em tendência de alta: máximos e mínimos mais altos. Setups comprados funcionam melhor aqui; operar contra a tendência é arriscado.",
      },
      ar: {
        label: "Trending Up",
        short: "سوق في اتجاه صاعد: قمم أعلى وقيعان أعلى. نماذج الشراء تعمل بأفضل شكل هنا؛ والتداول عكس الاتجاه محفوف بالمخاطر.",
      },
    },
  },
  {
    id: "marketTrendingDown",
    i18n: {
      he: {
        label: "Trending Down",
        short: "שוק במגמת ירידה: שיאים נמוכים יותר ושפלים נמוכים יותר. setups של שורט עובדים הכי טוב; \"תפיסת סכין נופלת\" בלונג מסוכנת.",
      },
      en: {
        label: "Trending Down",
        short: "A downtrending market: lower highs and lower lows. Short setups work best; \"catching a falling knife\" with a long is dangerous.",
      },
      es: {
        label: "Trending Down",
        short: "Un mercado en tendencia bajista: máximos y mínimos más bajos. Los setups en corto funcionan mejor; \"atrapar un cuchillo que cae\" en largo es peligroso.",
      },
      pt: {
        label: "Trending Down",
        short: "Um mercado em tendência de baixa: máximos e mínimos mais baixos. Setups vendidos funcionam melhor; \"agarrar uma faca a cair\" comprado é perigoso.",
      },
      ar: {
        label: "Trending Down",
        short: "سوق في اتجاه هابط: قمم أدنى وقيعان أدنى. نماذج البيع تعمل بأفضل شكل؛ و\"إمساك السكين الساقط\" بصفقة شراء أمر خطير.",
      },
    },
  },
  {
    id: "marketSideways",
    i18n: {
      he: {
        label: "Sideways",
        short: "שוק ללא מגמה ברורה, נע בטווח אופקי בין תמיכה להתנגדות. setups של מגמה נכשלים כאן; מסחר בטווח (קנייה בתמיכה, מכירה בהתנגדות) מתאים יותר.",
      },
      en: {
        label: "Sideways",
        short: "A market with no clear trend, moving horizontally between support and resistance. Trend setups fail here; range trading (buy support, sell resistance) fits better.",
      },
      es: {
        label: "Sideways",
        short: "Un mercado sin tendencia clara, que se mueve horizontalmente entre soporte y resistencia. Los setups de tendencia fallan aquí; el trading de rango (comprar en soporte, vender en resistencia) encaja mejor.",
      },
      pt: {
        label: "Sideways",
        short: "Um mercado sem tendência clara, movendo-se horizontalmente entre suporte e resistência. Setups de tendência falham aqui; o trading de range (comprar no suporte, vender na resistência) encaixa melhor.",
      },
      ar: {
        label: "Sideways",
        short: "سوق بلا اتجاه واضح، يتحرك أفقياً بين الدعم والمقاومة. نماذج الاتجاه تفشل هنا؛ والتداول ضمن النطاق (شراء عند الدعم، بيع عند المقاومة) أنسب.",
      },
    },
  },
  {
    id: "marketVolatile",
    i18n: {
      he: {
        label: "Volatile",
        short: "שוק עם תנודות מחיר חדות ומהירות לשני הכיוונים. ה-stops נפגעים בקלות, גודל הפוזיציה צריך להיות קטן יותר. הזדמנויות גדולות אך סיכון גבוה.",
      },
      en: {
        label: "Volatile",
        short: "A market with sharp, fast price swings in both directions. Stops get hit easily, and position size should be smaller. Big opportunities but high risk.",
      },
      es: {
        label: "Volatile",
        short: "Un mercado con oscilaciones de precio bruscas y rápidas en ambas direcciones. Los stops saltan con facilidad y el tamaño de la posición debe ser menor. Grandes oportunidades pero alto riesgo.",
      },
      pt: {
        label: "Volatile",
        short: "Um mercado com oscilações de preço bruscas e rápidas nos dois sentidos. Os stops são atingidos com facilidade e o tamanho da posição deve ser menor. Grandes oportunidades, mas risco elevado.",
      },
      ar: {
        label: "Volatile",
        short: "سوق بتقلّبات سعرية حادّة وسريعة في الاتجاهين. تُضرب أوامر وقف الخسارة بسهولة، وينبغي تصغير حجم الصفقة. فرص كبيرة لكن مخاطرة عالية.",
      },
    },
  },
];
