# 📘 SwingEdge — מילון מונחים · 5 שפות

> ⛔ קובץ מחולל — אל תערוך. המקור: `src/glossary/terms/` · הרץ `npm run glossary`.
> sourceHash `30d651feac2a5bd6` · **80 מונחים** · 5 שפות (עברית · English · Español · Português · العربية).

---

## תוכן עניינים
- **מדדי ביצוע** (15)
- **אנליטיקס — גרפים וכרטיסי תובנה** (12)
- **מדדים נוספים** (5)
- **מושגים / AI** (10)
- **ניהול סיכון** (5)
- **סטאפים** (22)
- **רגשות** (8)
- **פעולות ותכונות** (3)

---

## מדדי ביצוע

### `winRate` — Win Rate · אחוז הצלחה

| שפה | הסבר |
|---|---|
| **עברית** | אחוז העסקאות הסגורות שהסתיימו ברווח.<br>לדוגמה: 6 רווחיות מתוך 10 סגורות = 60%.<br>עסקת Break-even נספרת במכנה ואינה רווח; אחוז הצלחה לבדו אינו מעיד על רווחיות. |
| **English** | The share of your closed trades that ended in profit.<br>Example: 6 winners out of 10 closed trades = 60%.<br>Break-even trades count in the denominator, not as wins; win rate alone does not show profitability. |
| **Español** | El porcentaje de tus operaciones cerradas que terminaron en ganancia.<br>Ejemplo: 6 ganadoras de 10 operaciones cerradas = 60%.<br>El break-even cuenta en el denominador, no como ganancia; la Win Rate sola no indica rentabilidad. |
| **Português** | A porcentagem das suas operações fechadas que terminaram com lucro.<br>Exemplo: 6 vencedoras de 10 operações fechadas = 60%.<br>O break-even conta no denominador, não como ganho; a Win Rate sozinha não mostra lucratividade. |
| **العربية** | نسبة صفقاتك المغلقة التي انتهت بربح.<br>مثال: 6 رابحة من أصل 10 صفقات مغلقة = 60%.<br>صفقات التعادل (Break-even) تُحتسب في المقام لا كأرباح؛ وWin Rate وحدها لا تدلّ على الربحية. |

### `profitFactor` — Profit Factor

| שפה | הסבר |
|---|---|
| **עברית** | סך הרווחים הגולמיים חלקי סך ההפסדים הגולמיים בעסקאות הסגורות.<br>לדוגמה: הרווחת $3,000 והפסדת $2,000 ⇒ 1.5; מעל 1 = הרווחת יותר משהפסדת.<br>בלי אף הפסד הערך הוא ∞; מחושב לפני עמלות. |
| **English** | Gross profit divided by gross loss across your closed trades.<br>Example: you won $3,000 and lost $2,000 ⇒ 1.5; above 1 means you won more than you lost.<br>With no losses at all it reads ∞; computed before commissions. |
| **Español** | Ganancia bruta dividida por la pérdida bruta de tus operaciones cerradas.<br>Ejemplo: ganaste $3,000 y perdiste $2,000 ⇒ 1.5; más de 1 indica que ganaste más de lo que perdiste.<br>Sin pérdidas marca ∞; se calcula antes de comisiones. |
| **Português** | Lucro bruto dividido pela perda bruta das suas operações fechadas.<br>Exemplo: você ganhou $3,000 e perdeu $2,000 ⇒ 1.5; acima de 1 significa que você ganhou mais do que perdeu.<br>Sem nenhuma perda, mostra ∞; calculado antes das comissões. |
| **العربية** | إجمالي الربح مقسوماً على إجمالي الخسارة في صفقاتك المغلقة.<br>مثال: ربحت $3,000 وخسرت $2,000 ⇒ 1.5؛ أعلى من 1 يعني أنك ربحت أكثر مما خسرت.<br>بلا أي خسارة تكون القيمة ∞؛ ويُحسب قبل العمولات. |

### `avgR` — Avg R · R ממוצע

| שפה | הסבר |
|---|---|
| **עברית** | ממוצע ה-R בעסקאות סגורות; R = רווח ÷ הסיכון לפי הסטופ השמור, לפי הכיוון (LONG/SHORT).<br>לדוגמה: סיכנת $100 והרווחת $150 ⇒ ‎+1.5R.<br>עסקה בלי סטופ מוחרגת מהממוצע ואינה נספרת כ-0R. |
| **English** | Average R of closed trades; R = profit ÷ risk at the saved stop, by direction (LONG/SHORT).<br>Example: you risked $100 and made $150 ⇒ +1.5R.<br>A trade without a stop is excluded, not counted as 0R. |
| **Español** | R promedio de operaciones cerradas; R = ganancia ÷ riesgo al stop guardado, según dirección (LONG/SHORT).<br>Ejemplo: arriesgaste $100 y ganaste $150 ⇒ +1.5R.<br>Una operación sin stop se excluye, no cuenta como 0R. |
| **Português** | R médio das operações fechadas; R = lucro ÷ risco no stop salvo, conforme a direção (LONG/SHORT).<br>Exemplo: você arriscou $100 e ganhou $150 ⇒ +1.5R.<br>Uma operação sem stop é excluída, não contada como 0R. |
| **العربية** | متوسّط R للصفقات المغلقة؛ R = الربح ÷ المخاطرة حتى الوقف المحفوظ، حسب الاتجاه (LONG/SHORT).<br>مثال: خاطرت بـ $100 وربحت $150 ⇒ ‎+1.5R.<br>الصفقة بلا وقف تُستثنى، ولا تُحتسب كـ 0R. |

### `expectancy` — Expectancy · תוחלת

| שפה | הסבר |
|---|---|
| **עברית** | כמה R הרווחת בממוצע לעסקה סגורה, כשעסקאות Break-even נספרות במכנה.<br>לדוגמה: חצי רווחים של ‎+2R וחצי הפסדים של ‎−1R ⇒ ‎+0.5R לעסקה.<br>נמדד ב-R ולא בדולרים. |
| **English** | The average R you made per closed trade, with break-even trades in the denominator.<br>Example: half the trades win +2R and half lose −1R ⇒ +0.5R per trade.<br>Measured in R, not dollars. |
| **Español** | El R promedio que ganaste por operación cerrada, contando el break-even en el denominador.<br>Ejemplo: la mitad gana +2R y la mitad pierde −1R ⇒ +0.5R por operación.<br>Se mide en R, no en dólares. |
| **Português** | O R médio que você ganhou por operação fechada, contando o break-even no denominador.<br>Exemplo: metade ganha +2R e metade perde −1R ⇒ +0.5R por operação.<br>Medida em R, não em dólares. |
| **العربية** | متوسّط R الذي حقّقته لكل صفقة مغلقة، مع احتساب صفقات التعادل (Break-even) في المقام.<br>مثال: نصف الصفقات تربح ‎+2R والنصف يخسر ‎−1R ⇒ ‎+0.5R لكل صفقة.<br>يُقاس بـ R، لا بالدولار. |

### `sharpe` — Per-trade Sharpe (R) · Sharpe לעסקה (R)

| שפה | הסבר |
|---|---|
| **עברית** | ממוצע ה-R לעסקה חלקי סטיית התקן של ה-R — תשואה ליחידת תנודתיות.<br>לדוגמה: ממוצע ‎+0.5R וסטיית תקן 1R ⇒ 0.5.<br>בלי ריבית חסרת סיכון ובלי שנתיות — אינו בר-השוואה ל-Sharpe של קרן. |
| **English** | Mean R per trade divided by the standard deviation of R.<br>Example: an average of +0.5R with a 1R standard deviation ⇒ 0.5.<br>No risk-free rate and no annualizing — not comparable to a fund's Sharpe ratio. |
| **Español** | El R medio por operación dividido por la desviación estándar del R.<br>Ejemplo: promedio de +0.5R con desviación estándar de 1R ⇒ 0.5.<br>Sin tasa libre de riesgo ni anualización — no es comparable con el Sharpe de un fondo. |
| **Português** | O R médio por operação dividido pelo desvio padrão do R.<br>Exemplo: média de +0.5R com desvio padrão de 1R ⇒ 0.5.<br>Sem taxa livre de risco e sem anualização — não é comparável ao Sharpe de um fundo. |
| **العربية** | متوسّط R لكل صفقة مقسوماً على الانحراف المعياري لـ R.<br>مثال: متوسّط ‎+0.5R مع انحراف معياري 1R ⇒ 0.5.<br>بلا معدّل خالٍ من المخاطر وبلا تحويل سنوي — لا يُقارَن بنسبة شارب لصندوق. |

### `maxDD` — Max Drawdown · ירידה מקסימלית

| שפה | הסבר |
|---|---|
| **עברית** | הירידה הגדולה ביותר, בסכום כסף, משיא ה-P&L המצטבר של העסקאות הסגורות עד השפל שאחריו.<br>לדוגמה: ה-P&L המצטבר עלה ל-$2,000 וירד ל-$1,200 ⇒ $800.<br>נמדד בסכום ולא באחוזים מההון. |
| **English** | The largest drop, in money, from a peak in your cumulative closed-trade P&L to the low after it.<br>Example: cumulative P&L rose to $2,000 and fell to $1,200 ⇒ $800.<br>Measured as an amount, not as a percentage of capital. |
| **Español** | La mayor caída, en dinero, desde un pico de tu P&L acumulado de operaciones cerradas hasta el mínimo posterior.<br>Ejemplo: el P&L acumulado subió a $2,000 y cayó a $1,200 ⇒ $800.<br>Se mide como monto, no como porcentaje del capital. |
| **Português** | A maior queda, em dinheiro, de um pico do seu P&L acumulado de operações fechadas até o fundo seguinte.<br>Exemplo: o P&L acumulado subiu para $2,000 e caiu para $1,200 ⇒ $800.<br>Medido como valor, não como porcentagem do capital. |
| **العربية** | أكبر هبوط، بالمال، من قمّة في P&L التراكمي لصفقاتك المغلقة إلى القاع الذي تلاها.<br>مثال: ارتفع P&L التراكمي إلى $2,000 ثم هبط إلى $1,200 ⇒ $800.<br>يُقاس كمبلغ، لا كنسبة مئوية من رأس المال. |

### `avgWin` — Avg Win · רווח ממוצע

| שפה | הסבר |
|---|---|
| **עברית** | הרווח הממוצע בעסקאות הסגורות שהסתיימו ברווח.<br>לדוגמה: רווחים של $100 ושל $300 ⇒ $200. |
| **English** | The average profit on your closed trades that ended in profit.<br>Example: wins of $100 and $300 ⇒ $200. |
| **Español** | La ganancia media de tus operaciones cerradas ganadoras.<br>Ejemplo: ganancias de $100 y $300 ⇒ $200. |
| **Português** | O lucro médio das suas operações fechadas que terminaram com lucro.<br>Exemplo: ganhos de $100 e $300 ⇒ $200. |
| **العربية** | متوسّط الربح في صفقاتك المغلقة التي انتهت بربح.<br>مثال: أرباح $100 و$300 ⇒ $200. |

### `avgLoss` — Avg Loss · הפסד ממוצע

| שפה | הסבר |
|---|---|
| **עברית** | ההפסד הממוצע בעסקאות הסגורות שהסתיימו בהפסד.<br>לדוגמה: הפסדים של $50 ושל $150 ⇒ $100. |
| **English** | The average loss on your closed trades that ended in a loss.<br>Example: losses of $50 and $150 ⇒ $100. |
| **Español** | La pérdida media de tus operaciones cerradas perdedoras.<br>Ejemplo: pérdidas de $50 y $150 ⇒ $100. |
| **Português** | A perda média das suas operações fechadas que terminaram em perda.<br>Exemplo: perdas de $50 e $150 ⇒ $100. |
| **العربية** | متوسّط الخسارة في صفقاتك المغلقة التي انتهت بخسارة.<br>مثال: خسائر $50 و$150 ⇒ $100. |

### `avgHold` — Avg Hold · זמן החזקה ממוצע

| שפה | הסבר |
|---|---|
| **עברית** | מספר הימים הממוצע בין הכניסה ליציאה בעסקאות סגורות.<br>לדוגמה: עסקאות של 2 ושל 6 ימים ⇒ 4 ימים.<br>ימים קלנדריים מעוגלים; כניסה ויציאה באותו יום = 0. |
| **English** | The average number of days between entry and exit on closed trades.<br>Example: trades of 2 and 6 days ⇒ 4 days.<br>Rounded calendar days; same-day entry and exit = 0. |
| **Español** | La media de días entre entrada y salida en las operaciones cerradas.<br>Ejemplo: operaciones de 2 y 6 días ⇒ 4 días.<br>Días naturales redondeados; entrar y salir el mismo día = 0. |
| **Português** | O número médio de dias entre a entrada e a saída nas operações fechadas.<br>Exemplo: operações de 2 e 6 dias ⇒ 4 dias.<br>Dias corridos arredondados; entrada e saída no mesmo dia = 0. |
| **العربية** | متوسّط عدد الأيام بين الدخول والخروج في الصفقات المغلقة.<br>مثال: صفقتان مدّتهما 2 و6 أيام ⇒ 4 أيام.<br>أيام تقويمية مقرّبة؛ الدخول والخروج في اليوم نفسه = 0. |

### `equityCurve` — Equity Curve · עקומת הון

| שפה | הסבר |
|---|---|
| **עברית** | יתרת החשבון לאורך זמן: בסיס ההון ועוד ה-P&L המצטבר אחרי כל עסקה שנסגרה.<br>לדוגמה: בסיס $10,000, עסקה של ‎+$200 ואחריה ‎−$50 ⇒ $10,200 ואז $10,150.<br>כל נקודה היא יום סגירה; פוזיציות פתוחות לא נכללות. |
| **English** | Your account balance over time: your capital base plus cumulative P&L after each closed trade.<br>Example: a $10,000 base, +$200 then −$50 ⇒ $10,200, then $10,150.<br>Each point is a closing day; open positions excluded. |
| **Español** | El saldo de tu cuenta en el tiempo: tu capital base más el P&L acumulado tras cada operación cerrada.<br>Ejemplo: base de $10,000, +$200 y luego −$50 ⇒ $10,200, luego $10,150.<br>Cada punto es un día de cierre; posiciones abiertas excluidas. |
| **Português** | O saldo da conta ao longo do tempo: a base de capital mais o P&L acumulado após cada operação fechada.<br>Exemplo: base de $10,000, +$200 e depois −$50 ⇒ $10,200, depois $10,150.<br>Cada ponto é um dia de fechamento; exclui posições abertas. |
| **العربية** | رصيد حسابك عبر الزمن: قاعدة رأس المال لديك مضافاً إليها P&L التراكمي بعد كل صفقة مغلقة.<br>مثال: قاعدة $10,000، ثم ‎+$200 ثم ‎−$50 ⇒ $10,200 ثم $10,150.<br>كل نقطة هي يوم إغلاق؛ المراكز المفتوحة مستثناة. |

### `totalReturn` — Total Return · תשואה כוללת

| שפה | הסבר |
|---|---|
| **עברית** | ה-P&L של העסקאות הסגורות כאחוז מבסיס ההון שהגדרת.<br>לדוגמה: ‎+$500 על בסיס $10,000 ⇒ ‎+5%.<br>פוזיציות פתוחות לא נכללות. |
| **English** | Your closed-trade P&L as a percentage of the capital base you set.<br>Example: +$500 on a $10,000 base ⇒ +5%.<br>Open positions are not included. |
| **Español** | Tu P&L de operaciones cerradas como % del capital base que configuraste.<br>Ejemplo: +$500 sobre una base de $10,000 ⇒ +5%.<br>No incluye posiciones abiertas. |
| **Português** | Seu P&L de operações fechadas como % da base de capital que você definiu.<br>Exemplo: +$500 sobre uma base de $10,000 ⇒ +5%.<br>Não inclui posições abertas. |
| **العربية** | P&L صفقاتك المغلقة كنسبة مئوية من قاعدة رأس المال التي حدّدتها.<br>مثال: ‎+$500 على قاعدة $10,000 ⇒ ‎+5%.<br>المراكز المفتوحة غير مشمولة. |

### `winStreak` — Current Streak · רצף נוכחי

| שפה | הסבר |
|---|---|
| **עברית** | מספר העסקאות הרווחיות ברציפות עד העסקה הסגורה האחרונה.<br>לדוגמה: 3 רווחים ברצף ⇒ 3; השורה מתחת מציגה את הרצף הטוב ביותר.<br>רצף הפסדים מוצג כ-0, לא כמספר שלילי. |
| **English** | The number of profitable trades in a row, up to your latest closed trade.<br>Example: 3 wins in a row ⇒ 3; the line below shows your best streak.<br>A losing streak shows as 0, not as a negative number. |
| **Español** | El número de ganadoras seguidas hasta tu última operación cerrada.<br>Ejemplo: 3 ganadoras seguidas ⇒ 3; la línea de abajo muestra tu mejor racha.<br>Una racha perdedora se muestra como 0, no como número negativo. |
| **Português** | O número de ganhos seguidos até sua última operação fechada.<br>Exemplo: 3 ganhos seguidos ⇒ 3; a linha abaixo mostra sua melhor sequência.<br>Uma sequência de perdas aparece como 0, não como número negativo. |
| **العربية** | عدد الصفقات الرابحة المتتالية حتى آخر صفقة مغلقة لديك.<br>مثال: 3 أرباح متتالية ⇒ 3؛ السطر أدناه يوضّح أفضل سلسلة لك.<br>سلسلة الخسائر تظهر 0، لا كرقم سالب. |

### `grade` — Monthly Grade · ציון חודשי

| שפה | הסבר |
|---|---|
| **עברית** | ציון A–F לחודש: 40% אחוז הצלחה, 30% R, 20% משמעת ו-10% עקביות.<br>לדוגמה: 72/100 ⇒ B (A מ-85 · B מ-70 · C מ-55 · D מ-40).<br>המשמעת נשענת על הסימון 'עקבתי אחרי התוכנית'. |
| **English** | An A–F grade for the month: 40% win rate, 30% R, 20% discipline, 10% consistency.<br>Example: 72/100 ⇒ B (A 85+ · B 70+ · C 55+ · D 40+).<br>Discipline is the self-reported 'followed my plan' flag. |
| **Español** | Una nota A–F del mes: 40% Win Rate, 30% R, 20% disciplina, 10% consistencia.<br>Ejemplo: 72/100 ⇒ B (A 85+ · B 70+ · C 55+ · D 40+).<br>La disciplina es la marca autodeclarada 'seguí mi plan'. |
| **Português** | Uma nota A–F para o mês: 40% Win Rate, 30% R, 20% disciplina, 10% consistência.<br>Exemplo: 72/100 ⇒ B (A 85+ · B 70+ · C 55+ · D 40+).<br>Disciplina é a marcação autodeclarada 'segui meu plano'. |
| **العربية** | تقييم A–F للشهر: 40% Win Rate، و30% R، و20% انضباط، و10% اتساق.<br>مثال: 72/100 ⇒ B (A 85+ · B 70+ · C 55+ · D 40+).<br>الانضباط هو علامة 'اتّبعت خطّتي' التي تحدّدها بنفسك. |

### `entryQuality` — Entry Quality · איכות כניסה

| שפה | הסבר |
|---|---|
| **עברית** | דירוג 1–5 כוכבים שנתת לכניסה: עד כמה העיתוי, המחיר והאישור תאמו לתוכנית.<br>לדוגמה: נכנסת במחיר שתכננת אחרי אישור ⇒ 5 כוכבים.<br>דירוג עצמי — לא נמדד מהמחירים. |
| **English** | A 1–5 star rating you gave your entry: how well timing, price and confirmation matched the plan.<br>Example: you entered at your planned price after confirmation ⇒ 5 stars.<br>Self-rated — not measured from prices. |
| **Español** | Una valoración de 1–5 estrellas que diste a tu entrada: cuánto se ajustaron momento, precio y confirmación al plan.<br>Ejemplo: entraste al precio planeado tras la confirmación ⇒ 5 estrellas.<br>Autoevaluada — no se mide con precios. |
| **Português** | Uma nota de 1–5 estrelas que você deu à sua entrada: quanto timing, preço e confirmação seguiram o plano.<br>Exemplo: você entrou no preço planejado após a confirmação ⇒ 5 estrelas.<br>Autoavaliada — não é medida pelos preços. |
| **العربية** | تقييم من 1–5 نجوم منحته لدخولك: مدى توافق التوقيت والسعر والتأكيد مع الخطة.<br>مثال: دخلت عند سعرك المخطّط بعد التأكيد ⇒ 5 نجوم.<br>تقييم ذاتي — لا يُقاس من الأسعار. |

### `accountEquity` — Account Equity · הון החשבון

| שפה | הסבר |
|---|---|
| **עברית** | בסיס ההון שהגדרת ועוד ה-P&L המצטבר מעסקאות סגורות ופתוחות.<br>לדוגמה: בסיס $10,000 ועוד ‎+$600 ⇒ $10,600.<br>הסיכון לעסקה מחושב מבסיס ההון הקבוע, לא מההון הנוכחי. |
| **English** | The capital base you set plus cumulative P&L from closed and open trades.<br>Example: a $10,000 base plus +$600 ⇒ $10,600.<br>Per-trade risk is sized from your fixed capital base, not current equity. |
| **Español** | Tu capital base configurado más el P&L acumulado de operaciones cerradas y abiertas.<br>Ejemplo: una base de $10,000 más +$600 ⇒ $10,600.<br>El riesgo por operación se calcula sobre tu capital base fijo, no el actual. |
| **Português** | Sua base de capital definida mais o P&L acumulado das operações fechadas e abertas.<br>Exemplo: uma base de $10,000 mais +$600 ⇒ $10,600.<br>O risco por operação usa sua base de capital fixa, não o patrimônio atual. |
| **العربية** | قاعدة رأس المال التي حدّدتها مضافاً إليها P&L التراكمي من الصفقات المغلقة والمفتوحة.<br>مثال: قاعدة $10,000 مضافاً إليها ‎+$600 ⇒ $10,600.<br>المخاطرة لكل صفقة تُحسب من قاعدة رأس المال الثابتة، لا من رأس المال الحالي. |

## אנליטיקס — גרפים וכרטיסי תובנה

### `streakHistory` — Streak History · היסטוריית רצפים

| שפה | הסבר |
|---|---|
| **עברית** | רצפי הרווחים וההפסדים שלך לפי סדר הזמן, כל רצף כעמודה.<br>לדוגמה: 3 רווחים ואחריהם 2 הפסדים ⇒ שתי עמודות, 3 ו-2. |
| **English** | Your winning and losing streaks in time order, one bar per streak.<br>Example: 3 wins then 2 losses ⇒ two bars, 3 and 2. |
| **Español** | Rachas ganadoras y perdedoras en orden temporal, una barra por racha.<br>Ejemplo: 3 ganadas, luego 2 perdidas ⇒ dos barras, 3 y 2. |
| **Português** | Sequências de ganho e perda em ordem temporal, uma barra por sequência.<br>Exemplo: 3 ganhos, depois 2 perdas ⇒ duas barras, 3 e 2. |
| **العربية** | سلاسل أرباحك وخسائرك بترتيب زمني، عمود واحد لكل سلسلة.<br>مثال: 3 أرباح ثم 2 خسائر ⇒ عمودان، 3 و2. |

### `dayOfWeek` — P&L by Day of Week · רווח/הפסד לפי יום בשבוע

| שפה | הסבר |
|---|---|
| **עברית** | ה-P&L המצטבר לפי היום בשבוע שבו נכנסת לעסקה.<br>לדוגמה: עסקה שנפתחה בשני ונסגרה ברביעי נספרת לשני. |
| **English** | Cumulative P&L by the weekday you entered the trade.<br>Example: a trade opened Monday and closed Wednesday counts for Monday. |
| **Español** | G/P acumulado según el día de la semana de entrada.<br>Ejemplo: operación abierta el lunes y cerrada el miércoles cuenta para el lunes. |
| **Português** | L/P acumulado pelo dia da semana em que você entrou.<br>Exemplo: operação aberta na segunda e fechada na quarta conta para a segunda. |
| **العربية** | الربح/الخسارة التراكمي حسب يوم الأسبوع الذي دخلت فيه الصفقة.<br>مثال: صفقة فُتحت يوم الاثنين وأُغلقت يوم الأربعاء تُحسب ليوم الاثنين. |

### `performanceBySetup` — Performance by Setup · ביצועים לפי סטאפ

| שפה | הסבר |
|---|---|
| **עברית** | כרטיס לכל סטאפ שסחרת: מספר עסקאות, אחוז הצלחה ו-R כולל.<br>לדוגמה: Breakout · 8 עסקאות · 50% · ‎+4R. |
| **English** | One card per setup you traded: trade count, win rate and total R.<br>Example: Breakout · 8 trades · 50% · +4R. |
| **Español** | Una tarjeta por setup operado: nº de operaciones, Win Rate y R total.<br>Ejemplo: Breakout · 8 operaciones · 50% · +4R. |
| **Português** | Um card por setup operado: nº de operações, Win Rate e R total.<br>Exemplo: Breakout · 8 operações · 50% · +4R. |
| **العربية** | بطاقة لكل سيناريو تداولته: عدد الصفقات وWin Rate وإجمالي R.<br>مثال: Breakout · 8 صفقات · 50% · ‎+4R. |

### `winRateBySetup` — Win Rate by Setup · אחוז הצלחה לפי סטאפ

| שפה | הסבר |
|---|---|
| **עברית** | גובה העמודה הוא אחוז ההצלחה של הסטאפ; המספר מעליה הוא מספר העסקאות.<br>לדוגמה: עמודה סגולה = 50% ומעלה, אפורה = מתחת ל-50%.<br>ממוין לפי מספר העסקאות. |
| **English** | Bar height is the setup's win rate; the number above it is the trade count.<br>Example: a purple bar = 50% or more, a gray bar = below 50%.<br>Sorted by trade count. |
| **Español** | La altura de cada barra es el Win Rate del setup; arriba, el nº de operaciones.<br>Ejemplo: barra morada = 50% o más, gris = menos del 50%.<br>Ordenado por nº de operaciones. |
| **Português** | A altura da barra é o Win Rate do setup; o número acima, o nº de operações.<br>Exemplo: barra roxa = 50% ou mais, cinza = abaixo de 50%.<br>Ordenado pelo nº de operações. |
| **العربية** | ارتفاع العمود هو Win Rate السيناريو؛ والرقم فوقه هو عدد الصفقات.<br>مثال: عمود بنفسجي = 50% أو أكثر، عمود رمادي = أقل من 50%.<br>مرتّب حسب عدد الصفقات. |

### `bestDay` — Best Day · היום הטוב ביותר

| שפה | הסבר |
|---|---|
| **עברית** | יום השבוע עם ה-P&L הכולל הגבוה ביותר, לפי יום הכניסה.<br>לדוגמה: שני ‎+$400, שלישי ‎+$150 ⇒ שני.<br>לא מתחשב במספר העסקאות. |
| **English** | The weekday with the highest total P&L, by entry day.<br>Example: Monday +$400, Tuesday +$150 ⇒ Monday.<br>Trade count is not taken into account. |
| **Español** | El día de la semana con mayor G/P total, según el día de entrada.<br>Ejemplo: lunes +$400, martes +$150 ⇒ lunes.<br>No considera el número de operaciones. |
| **Português** | O dia da semana com o maior L/P total, pelo dia de entrada.<br>Exemplo: segunda +$400, terça +$150 ⇒ segunda.<br>Não leva em conta o número de operações. |
| **العربية** | يوم الأسبوع صاحب أعلى ربح/خسارة إجمالي، حسب يوم الدخول.<br>مثال: الاثنين ‎+$400، الثلاثاء ‎+$150 ⇒ الاثنين.<br>لا يأخذ عدد الصفقات في الحسبان. |

### `bestSetup` — Best Setup · הסטאפ הטוב ביותר

| שפה | הסבר |
|---|---|
| **עברית** | הסטאפ עם אחוז ההצלחה הגבוה ביותר; בתיקו — זה עם יותר עסקאות.<br>לדוגמה: Pullback ב-70% מ-10 עסקאות קודם ל-Breakout ב-60%.<br>אין סף מדגם: עסקה אחת ב-100% יכולה לזכות. Unknown לא נכלל. |
| **English** | The setup with the highest win rate; on a tie, the one with more trades.<br>Example: Pullback at 70% over 10 trades ranks above Breakout at 60%.<br>No minimum sample: one trade at 100% can win. Unknown is excluded. |
| **Español** | El setup con mayor Win Rate; si hay empate, el de más operaciones.<br>Ejemplo: Pullback al 70% en 10 operaciones supera a Breakout al 60%.<br>Sin muestra mínima: una operación al 100% puede ganar. Se excluye Unknown. |
| **Português** | O setup com maior Win Rate; em caso de empate, o de mais operações.<br>Exemplo: Pullback com 70% em 10 operações supera Breakout com 60%.<br>Sem amostra mínima: uma operação com 100% pode vencer. Unknown fica de fora. |
| **العربية** | السيناريو صاحب أعلى Win Rate؛ وعند التعادل، صاحب العدد الأكبر من الصفقات.<br>مثال: Pullback بنسبة 70% على 10 صفقات يتقدّم على Breakout بنسبة 60%.<br>لا حدّ أدنى للعيّنة: صفقة واحدة بنسبة 100% قد تفوز. Unknown مستبعَد. |

### `bestEmotion` — Best Emotion · הרגש הטוב ביותר

| שפה | הסבר |
|---|---|
| **עברית** | הרגש שסימנת בכניסה עם אחוז ההצלחה הגבוה ביותר; בתיקו — זה עם יותר עסקאות.<br>לדוגמה: Calm ב-65% קודם ל-Confident ב-55%.<br>אין סף מדגם. |
| **English** | The entry emotion you marked with the highest win rate; on a tie, the one with more trades.<br>Example: Calm at 65% ranks above Confident at 55%.<br>No minimum sample. |
| **Español** | La emoción de entrada que marcaste con mayor Win Rate; si hay empate, la de más operaciones.<br>Ejemplo: Calm al 65% supera a Confident al 55%.<br>Sin muestra mínima. |
| **Português** | A emoção de entrada que você marcou com maior Win Rate; em caso de empate, a de mais operações.<br>Exemplo: Calm com 65% supera Confident com 55%.<br>Sem amostra mínima. |
| **العربية** | شعور الدخول الذي حدّدته صاحب أعلى Win Rate؛ وعند التعادل، صاحب العدد الأكبر من الصفقات.<br>مثال: Calm بنسبة 65% يتقدّم على Confident بنسبة 55%.<br>لا حدّ أدنى للعيّنة. |

### `rDistribution` — R Distribution · התפלגות R

| שפה | הסבר |
|---|---|
| **עברית** | כמה עסקאות סגורות נפלו בכל טווח R, משמאל להפסד ועד ימין לרווח.<br>לדוגמה: עסקה של ‎+1.4R נספרת בטווח 1R עד 2R.<br>עסקאות בלי סטופ לא נספרות. |
| **English** | How many closed trades fell in each R range, losses left to wins right.<br>Example: a +1.4R trade counts in the 1R to 2R range.<br>Trades without a stop are not counted. |
| **Español** | Nº de operaciones cerradas por rango de R: pérdidas a la izquierda, ganancias a la derecha.<br>Ejemplo: una de +1.4R cae en el rango 1R a 2R.<br>Sin stop, la operación no se cuenta. |
| **Português** | Nº de operações fechadas por faixa de R: perdas à esquerda, ganhos à direita.<br>Exemplo: uma operação de +1.4R conta na faixa de 1R a 2R.<br>Operações sem stop não são contadas. |
| **العربية** | عدد الصفقات المغلقة في كل نطاق R، الخسائر يساراً والأرباح يميناً.<br>مثال: صفقة بـ ‎+1.4R تُحسب في نطاق 1R إلى 2R.<br>الصفقات بلا وقف خسارة لا تُحسب. |

### `pnlByMonth` — P&L by Month · רווח/הפסד לפי חודש

| שפה | הסבר |
|---|---|
| **עברית** | סכום ה-P&L של העסקאות הסגורות לכל חודש, לפי תאריך הכניסה.<br>לדוגמה: במרץ ‎+$200, ‎−$50 ו-‎+$100 ⇒ ‎+$250.<br>עסקה שלא הומרה למטבע ההון לא נספרת. |
| **English** | The sum of closed-trade P&L for each month, by entry date.<br>Example: in March +$200, −$50 and +$100 ⇒ +$250.<br>A trade not converted to your capital currency is not counted. |
| **Español** | Suma del G/P de operaciones cerradas por mes, según la fecha de entrada.<br>Ejemplo: en marzo +$200, −$50 y +$100 ⇒ +$250.<br>No cuenta la operación no convertida a la moneda de tu capital. |
| **Português** | Soma do L/P das operações fechadas por mês, pela data de entrada.<br>Exemplo: em março +$200, −$50 e +$100 ⇒ +$250.<br>Uma operação não convertida para a moeda do seu capital não é contada. |
| **العربية** | مجموع ربح/خسارة الصفقات المغلقة لكل شهر، حسب تاريخ الدخول.<br>مثال: في مارس ‎+$200 و‎−$50 و‎+$100 ⇒ ‎+$250.<br>الصفقة غير المحوّلة إلى عملة رأس مالك لا تُحسب. |

### `emotionPerformance` — Emotion Performance · ביצועים לפי רגש

| שפה | הסבר |
|---|---|
| **עברית** | סך ה-P&L של העסקאות הסגורות לפי הרגש שסימנת בכניסה.<br>לדוגמה: FOMO · 4 עסקאות · ‎−$300.<br>עסקה בלי רגש מסומן נספרת כ-Unknown. |
| **English** | Total closed-trade P&L by the emotion you marked at entry.<br>Example: FOMO · 4 trades · −$300.<br>A trade with no emotion marked counts as Unknown. |
| **Español** | G/P total de operaciones cerradas según la emoción que marcaste al entrar.<br>Ejemplo: FOMO · 4 operaciones · −$300.<br>Sin emoción marcada, cuenta como Unknown. |
| **Português** | L/P total das operações fechadas pela emoção que você marcou na entrada.<br>Exemplo: FOMO · 4 operações · −$300.<br>Sem emoção marcada, conta como Unknown. |
| **العربية** | إجمالي ربح/خسارة الصفقات المغلقة حسب الشعور الذي حدّدته عند الدخول.<br>مثال: FOMO · 4 صفقات · ‎−$300.<br>الصفقة بلا شعور محدّد تُحسب كـ Unknown. |

### `setupMatrix` — Setup Matrix · מטריצת סטאפים

| שפה | הסבר |
|---|---|
| **עברית** | טבלה לכל סטאפ: עסקאות, אחוז הצלחה, R ממוצע ו-P&L, ממוינת לפי P&L.<br>לדוגמה: Breakout · 8 · 50% · ‎+0.4R · ‎+$600. |
| **English** | A table per setup: trades, win rate, average R and P&L, sorted by P&L.<br>Example: Breakout · 8 · 50% · +0.4R · +$600. |
| **Español** | Una tabla por setup: operaciones, Win Rate, R promedio y G/P, ordenada por G/P.<br>Ejemplo: Breakout · 8 · 50% · +0.4R · +$600. |
| **Português** | Uma tabela por setup: operações, Win Rate, R médio e L/P, ordenada por L/P.<br>Exemplo: Breakout · 8 · 50% · +0.4R · +$600. |
| **العربية** | جدول لكل سيناريو: الصفقات وWin Rate ومتوسط R والربح/الخسارة، مرتّب بالربح/الخسارة.<br>مثال: Breakout · 8 · 50% · ‎+0.4R · ‎+$600. |

### `holdTimeVsPnl` — Hold Time vs P&L · זמן החזקה מול רווח

| שפה | הסבר |
|---|---|
| **עברית** | כל נקודה היא עסקה סגורה: ימי ההחזקה בציר אחד וה-P&L בציר השני.<br>לדוגמה: נקודה ב-5 ימים וב-‎+$300 = עסקה שהחזקת 5 ימים והרוויחה $300.<br>עסקה שלא הומרה למטבע ההון לא מוצגת. |
| **English** | Each dot is a closed trade: holding days against P&L.<br>Example: a dot at 5 days and +$300 = held 5 days, made $300.<br>Trades not converted to your capital currency are not shown. |
| **Español** | Cada punto, una operación cerrada: días de tenencia frente a G/P.<br>Ejemplo: punto en 5 días y +$300 = 5 días abierta, ganó $300.<br>No se muestran operaciones sin convertir a tu moneda de capital. |
| **Português** | Cada ponto é uma operação fechada: dias de posição contra L/P.<br>Exemplo: ponto em 5 dias e +$300 = mantida 5 dias, lucrou $300.<br>Operações não convertidas à moeda do seu capital não aparecem. |
| **العربية** | كل نقطة صفقة مغلقة: أيام الاحتفاظ مقابل الربح/الخسارة.<br>مثال: نقطة عند 5 أيام و‎+$300 = احتُفظ بها 5 أيام وربحت $300.<br>الصفقات غير المحوّلة إلى عملة رأس مالك لا تُعرض. |

## מדדים נוספים

### `rr` — Risk / Reward · סיכון / סיכוי · R/R

| שפה | הסבר |
|---|---|
| **עברית** | היחס בין הסיכון לרווח הפוטנציאלי, בכתיב סיכון:סיכוי.<br>לדוגמה: סטופ $2 מתחת לכניסה ויעד $6 מעליה ⇒ 1:3. |
| **English** | The ratio between your risk and the potential reward, written risk:reward.<br>Example: a stop $2 below entry and a target $6 above ⇒ 1:3. |
| **Español** | La relación entre tu riesgo y el beneficio potencial, escrita riesgo:beneficio.<br>Ejemplo: stop $2 bajo la entrada y objetivo $6 sobre ella ⇒ 1:3. |
| **Português** | A relação entre o seu risco e o retorno potencial, escrita risco:retorno.<br>Exemplo: um stop $2 abaixo da entrada e um alvo $6 acima ⇒ 1:3. |
| **العربية** | النسبة بين مخاطرتك والعائد المحتمل، تُكتب مخاطرة:عائد.<br>مثال: وقف خسارة أدنى الدخول بـ $2 وهدف أعلاه بـ $6 ⇒ 1:3. |

### `rMultiple` — R-Multiple

| שפה | הסבר |
|---|---|
| **עברית** | תוצאת העסקה ביחידות של הסיכון לפי הסטופ השמור, לפי הכיוון: LONG (יציאה − כניסה), SHORT (כניסה − יציאה).<br>לדוגמה: סיכנת $40 והרווחת $100 ⇒ ‎+2.5R.<br>פער פתיחה מעבר לסטופ יכול לתת הפסד גדול מ-‎−1R. |
| **English** | Your result in units of risk at the saved stop: LONG (Exit − Entry), SHORT (Entry − Exit).<br>Example: you risked $40 and made $100 ⇒ +2.5R.<br>An opening gap past the stop can lose more than −1R. |
| **Español** | Tu resultado en unidades de riesgo del stop guardado: LONG (Salida − Entrada), SHORT (Entrada − Salida).<br>Ejemplo: arriesgaste $40, ganaste $100 ⇒ +2.5R.<br>Un gap de apertura tras el stop puede perder más de −1R. |
| **Português** | Seu resultado em unidades de risco no stop salvo: LONG (Saída − Entrada), SHORT (Entrada − Saída).<br>Exemplo: você arriscou $40 e ganhou $100 ⇒ +2.5R.<br>Um gap de abertura além do stop pode perder mais que −1R. |
| **العربية** | نتيجتك بوحدات المخاطرة عند وقف الخسارة المحفوظ: LONG (الخروج − الدخول)، SHORT (الدخول − الخروج).<br>مثال: خاطرت بـ $40 وربحت $100 ⇒ ‎+2.5R.<br>فجوة افتتاح تتجاوز وقف الخسارة قد تخسر أكثر من ‎−1R. |

### `mfeMae` — MFE / MAE

| שפה | הסבר |
|---|---|
| **עברית** | כמה הלכה העסקה לטובתך (MFE) וכמה נגדך (MAE) לפני שנסגרה.<br>לדוגמה: נכנסת ב-$100, המחיר עלה ל-$106 וירד ל-$97 ⇒ MFE $6, MAE $3.<br>נמדד רק אם מילאת את השדות בעסקה. |
| **English** | How far a trade ran in your favor (MFE) and against you (MAE) before it closed.<br>Example: entry $100, high $106, low $97 ⇒ MFE $6, MAE $3.<br>Only if you filled in the fields. |
| **Español** | Cuánto avanzó una operación a tu favor (MFE) y en tu contra (MAE) antes de cerrarse.<br>Ejemplo: entrada $100, máximo $106, mínimo $97 ⇒ MFE $6, MAE $3.<br>Solo si rellenaste los campos. |
| **Português** | Quanto uma operação andou a seu favor (MFE) e contra você (MAE) antes de fechar.<br>Exemplo: entrada $100, máxima $106, mínima $97 ⇒ MFE $6, MAE $3.<br>Só se você preencheu os campos. |
| **العربية** | إلى أي مدى تحرّكت الصفقة لصالحك (MFE) وضدك (MAE) قبل إغلاقها.<br>مثال: دخول $100، أعلى $106، أدنى $97 ⇒ MFE $6، MAE $3.<br>فقط إذا ملأت الحقول. |

### `wilson` — Wilson Score · ציון Wilson

| שפה | הסבר |
|---|---|
| **עברית** | הגבול התחתון של אחוז ההצלחה ה'אמיתי' ברמת ביטחון 95% — זהיר כשיש מעט עסקאות.<br>לדוגמה: 3 רווחים מ-3 = 100%, אבל הגבול התחתון כ-44%.<br>משמש לדירוג ה-Edge. |
| **English** | The lower bound of your 'true' win rate at 95% confidence — cautious when trades are few.<br>Example: 3 wins out of 3 = 100%, but the lower bound is about 44%.<br>Used to rank your Edge. |
| **Español** | El límite inferior de tu Win Rate 'real' al 95% de confianza — prudente con pocas operaciones.<br>Ejemplo: 3 ganadas de 3 = 100%, pero el límite inferior ronda el 44%.<br>Se usa para ordenar tu Edge. |
| **Português** | O limite inferior do seu Win Rate 'real' com 95% de confiança — cauteloso com poucas operações.<br>Exemplo: 3 vitórias em 3 = 100%, mas o limite inferior é cerca de 44%.<br>Usado para ordenar seu Edge. |
| **العربية** | الحد الأدنى لـ Win Rate 'الحقيقي' لديك بثقة 95% — حذِر عندما تكون الصفقات قليلة.<br>مثال: 3 أرباح من 3 = 100%، لكن الحد الأدنى نحو 44%.<br>تُستخدم لترتيب الـ Edge الخاص بك. |

### `rrBucket3plus` — R/R 3+

| שפה | הסבר |
|---|---|
| **עברית** | עסקאות שהיחס המתוכנן שלהן, סטופ מול יעד, הוא 1:3 ומעלה.<br>לדוגמה: סטופ $1 מתחת לכניסה ויעד $3.50 מעליה ⇒ 1:3.5 ⇒ בקבוצה.<br>ביחס 1:3 מספיק 25% הצלחה כדי לא להפסיד, לפני עמלות. |
| **English** | Trades whose planned ratio, stop versus target, is 1:3 or more.<br>Example: a stop $1 below entry and a target $3.50 above ⇒ 1:3.5 ⇒ in the group.<br>At 1:3, a 25% win rate breaks even, before commissions. |
| **Español** | Operaciones con ratio planificado (stop frente a objetivo) de 1:3 o más.<br>Ejemplo: stop $1 bajo la entrada, objetivo $3.50 sobre ella ⇒ 1:3.5 ⇒ en el grupo.<br>A 1:3, un Win Rate del 25% empata, antes de comisiones. |
| **Português** | Operações cuja relação planejada, stop versus alvo, é 1:3 ou mais.<br>Exemplo: um stop $1 abaixo da entrada e um alvo $3.50 acima ⇒ 1:3.5 ⇒ no grupo.<br>Em 1:3, um Win Rate de 25% empata, antes das comissões. |
| **العربية** | صفقات نسبتها المخططة، وقف الخسارة مقابل الهدف، 1:3 أو أكثر.<br>مثال: وقف خسارة أدنى الدخول بـ $1 وهدف أعلاه بـ $3.50 ⇒ 1:3.5 ⇒ ضمن المجموعة.<br>عند 1:3، يحقق Win Rate بنسبة 25% التعادل، قبل العمولات. |

## מושגים / AI

### `dna` — Trading DNA · DNA מסחרי

| שפה | הסבר |
|---|---|
| **עברית** | ארבעה ציונים 0–100 — ניהול סיכון, משמעת, עקביות וצמיחה — מחושבים מהעסקאות הסגורות שלך.<br>לדוגמה: סיכון ממוצע של 2% לעסקה ⇒ ציון ניהול סיכון 50.<br>המשמעת נשענת על הסימון 'עקבתי אחרי התוכנית' — דיווח עצמי. |
| **English** | Four 0–100 scores — risk, discipline, consistency, growth — from your closed trades.<br>Example: 2% average risk per trade ⇒ risk score 50.<br>Discipline is the self-reported 'followed my plan' flag. |
| **Español** | Cuatro puntuaciones 0–100 — riesgo, disciplina, consistencia, crecimiento — de tus operaciones cerradas.<br>Ejemplo: 2% de riesgo medio por operación ⇒ riesgo 50.<br>Disciplina = la marca autodeclarada 'seguí mi plan'. |
| **Português** | Quatro pontuações 0–100 — risco, disciplina, consistência, crescimento — das suas operações fechadas.<br>Exemplo: risco médio de 2% por operação ⇒ risco 50.<br>Disciplina é a marcação autodeclarada 'segui meu plano'. |
| **العربية** | أربع درجات 0–100 — المخاطرة والانضباط والاتساق والنمو — من صفقاتك المغلقة.<br>مثال: متوسط مخاطرة 2% لكل صفقة ⇒ درجة مخاطرة 50.<br>الانضباط هو علامة 'اتبعت خطتي' التي تضعها بنفسك. |

### `edge` — Edge

| שפה | הסבר |
|---|---|
| **עברית** | צירופי סטאפ ורגש שבהם אחוז ההצלחה וה-R שלך הכי חזקים, מדורגים לפי ציון Wilson.<br>לדוגמה: Breakout + Calm · 4 רווחיות מ-5 · R ממוצע ‎+1.2R.<br>דרושות 3 עסקאות לפחות; זה דירוג, לא מבחן מובהקות. |
| **English** | Setup-and-emotion pairs where your win rate and R are strongest, ranked by Wilson score.<br>Example: Breakout + Calm · 4 of 5 won · average +1.2R.<br>Needs 3+ trades; a ranking, not a significance test. |
| **Español** | Pares setup-emoción con tu Win Rate y tu R más fuertes, ordenados por puntuación Wilson.<br>Ejemplo: Breakout + Calm · 4 de 5 ganadas · media +1.2R.<br>Mínimo 3 operaciones; un ranking, no una prueba de significancia. |
| **Português** | Pares setup-emoção com seu Win Rate e seu R mais fortes, ordenados pelo escore de Wilson.<br>Exemplo: Breakout + Calm · 4 de 5 vencedoras · média +1.2R.<br>Exige 3+ operações; um ranking, não teste de significância. |
| **العربية** | أزواج نموذج دخول وعاطفة يكون فيها Win Rate و R لديك في أقوى حالاتهما، مرتبة حسب درجة Wilson.<br>مثال: Breakout + Calm · 4 رابحة من 5 · متوسط ‎+1.2R.<br>يتطلب 3 صفقات أو أكثر؛ هذا ترتيب، لا اختبار دلالة إحصائية. |

### `antiEdge` — Anti-Edge

| שפה | הסבר |
|---|---|
| **עברית** | צירופי סטאפ ורגש שבהם אחוז ההצלחה שלך מתחת ל-50% או ה-R הממוצע שלילי.<br>לדוגמה: Breakout + FOMO · רווח אחד מ-4 · R ממוצע ‎−0.8R.<br>דרושות 2 עסקאות לפחות; מוצגים עד 5. |
| **English** | Setup-and-emotion pairs where your win rate is below 50% or your average R is negative.<br>Example: Breakout + FOMO · 1 win out of 4 · average R −0.8R.<br>Needs at least 2 trades; up to 5 are shown. |
| **Español** | Pares de setup y emoción donde tu Win Rate está por debajo del 50% o tu R promedio es negativo.<br>Ejemplo: Breakout + FOMO · 1 ganada de 4 · R promedio −0.8R.<br>Requiere al menos 2 operaciones; se muestran hasta 5. |
| **Português** | Pares de setup e emoção em que seu Win Rate está abaixo de 50% ou seu R médio é negativo.<br>Exemplo: Breakout + FOMO · 1 vencedora em 4 · R médio −0.8R.<br>Exige pelo menos 2 operações; são exibidos até 5. |
| **العربية** | أزواج نموذج دخول وعاطفة يكون فيها Win Rate لديك أقل من 50% أو متوسط R سالبًا.<br>مثال: Breakout + FOMO · ربح واحد من 4 · متوسط R ‎−0.8R.<br>يتطلب صفقتين على الأقل؛ تُعرض حتى 5. |

### `tilt` — Tilt

| שפה | הסבר |
|---|---|
| **עברית** | מצב רגשי שמוציא אותך מהכללים שלך ומוביל למסחר נקמה.<br>לדוגמה: 3 הפסדים ברצף ⇒ Tilt Shield מתריע לפני העסקה הבאה.<br>כלל אצבע: הפסקה קצרה אחרי רצף הפסדים; Tilt Shield מתריע מ-3. |
| **English** | An emotional state that pushes you off your rules.<br>Example: 3 losses in a row ⇒ Tilt Shield warns before the next trade.<br>Rule of thumb: take a short break after a losing streak; Tilt Shield warns from 3. |
| **Español** | Un estado emocional que te saca de tus reglas.<br>Ejemplo: 3 pérdidas seguidas ⇒ Tilt Shield avisa antes de la siguiente operación.<br>Regla general: pausa corta tras una racha perdedora; Tilt Shield avisa desde 3. |
| **Português** | Um estado emocional que tira você das suas regras.<br>Exemplo: 3 perdas seguidas ⇒ o Tilt Shield avisa antes da próxima operação.<br>Regra prática: pausa curta após uma sequência de perdas; o Tilt Shield avisa a partir de 3. |
| **العربية** | حالة عاطفية تُخرجك عن قواعدك.<br>مثال: 3 خسائر متتالية ⇒ ينبّهك Tilt Shield قبل الصفقة التالية.<br>قاعدة عامة: خذ استراحة قصيرة بعد سلسلة خسائر؛ ينبّه Tilt Shield ابتداءً من 3. |

### `marketRegime` — Market Regime · מצב שוק

| שפה | הסבר |
|---|---|
| **עברית** | סביבת השוק, נקראת מ-SPY/QQQ מול ממוצע 20 יום, מרוחב הסקטורים ומהתנודתיות.<br>לדוגמה: מחיר מעל ממוצע 20 יום עולה ורוב הסקטורים עולים ⇒ שוק עולה.<br>מבוסס מחירי שוק, לא העסקאות שלך. |
| **English** | The market environment, read from SPY/QQQ versus their 20-day average, sector breadth and volatility.<br>Example: price above a rising 20-day average with most sectors rising ⇒ Bull Trend.<br>Based on market prices, not your trades. |
| **Español** | Entorno de mercado según SPY/QQQ frente a su media de 20 días, amplitud sectorial y volatilidad.<br>Ejemplo: precio sobre una media de 20 días al alza y la mayoría de sectores subiendo ⇒ Tendencia Alcista.<br>Usa precios de mercado, no tus operaciones. |
| **Português** | Ambiente de mercado lido de SPY/QQQ versus a média de 20 dias, amplitude setorial e volatilidade.<br>Exemplo: preço acima de uma média de 20 dias em alta e a maioria dos setores subindo ⇒ Tendência de Alta.<br>Usa preços de mercado, não suas operações. |
| **العربية** | بيئة السوق، تُقرأ من SPY/QQQ مقابل متوسط 20 يومًا، واتساع القطاعات، والتقلب.<br>مثال: السعر فوق متوسط 20 يومًا صاعد ومعظم القطاعات ترتفع ⇒ اتجاه صاعد.<br>مبني على أسعار السوق، لا على صفقاتك. |

### `discipline` — Discipline · משמעת

| שפה | הסבר |
|---|---|
| **עברית** | אחוז העסקאות הסגורות שסימנת בהן 'עקבתי אחרי התוכנית'.<br>לדוגמה: סימנת 'כן' ב-8 מתוך 10 ⇒ 80.<br>דיווח עצמי; עסקה שלא סומנה לא נספרת. |
| **English** | The share of your closed trades you marked 'followed my plan'.<br>Example: you marked 'yes' on 8 of 10 ⇒ 80.<br>Self-reported; an unmarked trade is not counted. |
| **Español** | La proporción de tus operaciones cerradas que marcaste 'seguí mi plan'.<br>Ejemplo: marcaste 'sí' en 8 de 10 ⇒ 80.<br>Autodeclarado; una operación sin marcar no cuenta. |
| **Português** | A fração das suas operações fechadas que você marcou 'segui meu plano'.<br>Exemplo: você marcou 'sim' em 8 de 10 ⇒ 80.<br>Autodeclarado; operação sem marcação não conta. |
| **العربية** | نسبة صفقاتك المغلقة التي وضعت عليها علامة 'اتبعت خطتي'.<br>مثال: وضعت 'نعم' على 8 من 10 ⇒ 80.<br>تقرير ذاتي؛ الصفقة غير المعلَّمة لا تُحتسب. |

### `dnaRisk` — Risk management · ניהול סיכון

| שפה | הסבר |
|---|---|
| **עברית** | ציון 0–100 לפי הסיכון הממוצע לעסקה, כאחוז מההון בעת הכניסה.<br>לדוגמה: 1% ומטה ⇒ 100 · 2% ⇒ 50 · 3% ומעלה ⇒ 0.<br>לא מודד אם כיבדת את הסטופ. |
| **English** | A 0–100 score from your average risk per trade as a percentage of capital.<br>Example: 1% or less ⇒ 100 · 2% ⇒ 50 · 3%+ ⇒ 0.<br>Does not measure whether you honored the stop. |
| **Español** | Puntuación 0–100 según tu riesgo medio por operación como porcentaje del capital.<br>Ejemplo: 1% o menos ⇒ 100 · 2% ⇒ 50 · 3%+ ⇒ 0.<br>No mide si respetaste el stop. |
| **Português** | Pontuação 0–100 a partir do seu risco médio por operação como porcentagem do capital.<br>Exemplo: 1% ou menos ⇒ 100 · 2% ⇒ 50 · 3%+ ⇒ 0.<br>Não mede se você respeitou o stop. |
| **العربية** | درجة 0–100 مبنية على متوسط مخاطرتك لكل صفقة كنسبة مئوية من رأس المال.<br>مثال: 1% أو أقل ⇒ 100 · 2% ⇒ 50 · 3% فأكثر ⇒ 0.<br>لا تقيس ما إذا كنت احترمت وقف الخسارة. |

### `dnaConsistency` — Consistency · עקביות

| שפה | הסבר |
|---|---|
| **עברית** | ציון 0–100 לפי פיזור תוצאות ה-R שלך: פיזור קטן = ציון גבוה.<br>לדוגמה: סטיית תקן 0R ⇒ 100 · 1.5R ⇒ 50 · 3R ומעלה ⇒ 0.<br>דרושות 2 עסקאות עם R לפחות. |
| **English** | A 0–100 score from the spread of your R outcomes; less spread scores higher.<br>Example: standard deviation 0R ⇒ 100 · 1.5R ⇒ 50 · 3R+ ⇒ 0.<br>Needs 2+ trades with an R. |
| **Español** | Puntuación 0–100 por la dispersión de tus resultados en R; menos dispersión, más puntos.<br>Ejemplo: desviación estándar 0R ⇒ 100 · 1.5R ⇒ 50 · 3R+ ⇒ 0.<br>Mínimo 2 operaciones con R. |
| **Português** | Pontuação 0–100 a partir da dispersão dos seus resultados em R; menos dispersão pontua mais.<br>Exemplo: desvio padrão 0R ⇒ 100 · 1.5R ⇒ 50 · 3R+ ⇒ 0.<br>Exige 2+ operações com R. |
| **العربية** | درجة 0–100 مبنية على تشتت نتائج R لديك؛ كلما قل التشتت ارتفعت الدرجة.<br>مثال: انحراف معياري 0R ⇒ 100 · 1.5R ⇒ 50 · 3R فأكثر ⇒ 0.<br>تتطلب صفقتين أو أكثر لها R. |

### `dnaGrowth` — Growth · צמיחה

| שפה | הסבר |
|---|---|
| **עברית** | ציון 0–100 לפי שיפוע ה-R המצטבר ב-20 העסקאות הסגורות האחרונות; 50 = שטוח.<br>לדוגמה: R מצטבר שעולה בכ-‎+0.5R לעסקה ⇒ כ-75.<br>מעל ‎+1R לעסקה ⇒ 100; מתחת ל-‎−1R ⇒ 0. |
| **English** | A 0–100 score from the slope of cumulative R over your last 20 closed trades; 50 = flat.<br>Example: cumulative R rising about +0.5R per trade ⇒ about 75.<br>Above +1R per trade ⇒ 100; below −1R ⇒ 0. |
| **Español** | Puntuación 0–100 según la pendiente del R acumulado en tus últimas 20 operaciones cerradas; 50 = plano.<br>Ejemplo: R acumulado que sube ~+0.5R por operación ⇒ ~75.<br>Más de +1R por operación ⇒ 100; menos de −1R ⇒ 0. |
| **Português** | Pontuação 0–100 pela inclinação do R acumulado nas suas últimas 20 operações fechadas; 50 = plano.<br>Exemplo: R acumulado subindo ~+0.5R por operação ⇒ ~75.<br>Acima de +1R por operação ⇒ 100; abaixo de −1R ⇒ 0. |
| **العربية** | درجة 0–100 مبنية على ميل R التراكمي في آخر 20 صفقة مغلقة لك؛ 50 = مستوٍ.<br>مثال: R تراكمي يرتفع بنحو ‎+0.5R لكل صفقة ⇒ نحو 75.<br>فوق ‎+1R لكل صفقة ⇒ 100؛ تحت ‎−1R ⇒ 0. |

### `setup` — Setup · סטאפ (Setup)

| שפה | הסבר |
|---|---|
| **עברית** | תבנית הכניסה לעסקה — התנאים המדויקים שבהם נכנסת לפוזיציה.<br>לדוגמה: Breakout, Pullback או Bull Flag. |
| **English** | Your entry pattern — the exact conditions under which you take a position.<br>Example: Breakout, Pullback or Bull Flag. |
| **Español** | Tu patrón de entrada — las condiciones exactas bajo las que abres una posición.<br>Ejemplo: Breakout, Pullback o Bull Flag. |
| **Português** | Seu padrão de entrada — as condições exatas em que você abre uma posição.<br>Exemplo: Breakout, Pullback ou Bull Flag. |
| **العربية** | نمط دخولك — الشروط الدقيقة التي تفتح فيها مركزًا.<br>مثال: Breakout أو Pullback أو Bull Flag. |

## ניהול סיכון

### `riskPerTrade` — Risk per Trade · סיכון לעסקה

| שפה | הסבר |
|---|---|
| **עברית** | כמה אחוזים מההון קבעת שתפסיד בעסקה אחת אם הסטופ נפגע.<br>לדוגמה: הון $10,000 וסיכון 1% ⇒ הפסד מקסימלי $100.<br>כלל אצבע: עד 2% לעסקה (Elder). |
| **English** | The percentage of capital you chose to lose on one trade if the stop is hit.<br>Example: $10,000 capital and 1% risk ⇒ a $100 maximum loss.<br>Rule of thumb: up to 2% per trade (Elder). |
| **Español** | El % del capital que elegiste perder en una operación si se toca el stop.<br>Ejemplo: capital de $10,000 y 1% de riesgo ⇒ pérdida máxima de $100.<br>Regla general: hasta 2% por operación (Elder). |
| **Português** | O % do capital que você escolheu perder numa operação se o stop for atingido.<br>Exemplo: capital de $10,000 e risco de 1% ⇒ perda máxima de $100.<br>Regra prática: até 2% por operação (Elder). |
| **العربية** | نسبة رأس المال التي اخترت خسارتها في صفقة واحدة إذا ضُرب وقف الخسارة.<br>مثال: رأس مال $10,000 ومخاطرة 1% ⇒ خسارة قصوى $100.<br>قاعدة عامة: حتى 2% لكل صفقة (Elder). |

### `riskLimits` — Risk Limits · תקרות סיכון

| שפה | הסבר |
|---|---|
| **עברית** | שתי תקרות: הסיכון לעסקה שבחרת, ותקרה לכל הפוזיציות הפתוחות — פי 2, בין 3% ל-5%.<br>לדוגמה: 1% ⇒ 3% · 2% ⇒ 4% · 3% ⇒ 5%.<br>התקרה ÷ סיכון לעסקה = פוזיציות מלאות במקביל. |
| **English** | Your per-trade risk, plus a cap on all open positions: 2× it, between 3% and 5%.<br>Example: 1% ⇒ 3% · 2% ⇒ 4% · 3% ⇒ 5%.<br>Cap ÷ per-trade risk = how many full-size positions fit at once. |
| **Español** | Tu riesgo por operación y un tope para todas las posiciones abiertas: el doble, entre 3% y 5%.<br>Ejemplo: 1% ⇒ 3% · 2% ⇒ 4% · 3% ⇒ 5%.<br>Tope ÷ riesgo por operación = cuántas posiciones completas caben. |
| **Português** | Seu risco por operação e um teto para todas as posições abertas: o dobro, entre 3% e 5%.<br>Exemplo: 1% ⇒ 3% · 2% ⇒ 4% · 3% ⇒ 5%.<br>Teto ÷ risco por operação = quantas posições completas cabem juntas. |
| **العربية** | مخاطرتك لكل صفقة، مع سقف لجميع المراكز المفتوحة: ضعفها، بين 3% و5%.<br>مثال: 1% ⇒ 3% · 2% ⇒ 4% · 3% ⇒ 5%.<br>السقف ÷ المخاطرة لكل صفقة = عدد المراكز الكاملة الممكنة في آنٍ واحد. |

### `positionSize` — Position Size · גודל פוזיציה

| שפה | הסבר |
|---|---|
| **עברית** | מספר המניות = (הון × אחוז סיכון) ÷ המרחק בין הכניסה לסטופ.<br>לדוגמה: $10,000 × 1% = $100; כניסה $100 וסטופ $97 ⇒ 33 מניות.<br>תמיד מעוגל כלפי מטה. |
| **English** | Shares = (capital × risk %) ÷ the distance between entry and stop.<br>Example: $10,000 × 1% = $100; entry $100 and stop $97 ⇒ 33 shares.<br>Always rounded down. |
| **Español** | Acciones = (capital × % de riesgo) ÷ distancia entre entrada y stop.<br>Ejemplo: $10,000 × 1% = $100; entrada $100 y stop $97 ⇒ 33 acciones.<br>Siempre redondeado hacia abajo. |
| **Português** | Ações = (capital × % de risco) ÷ a distância entre a entrada e o stop.<br>Exemplo: $10,000 × 1% = $100; entrada $100 e stop $97 ⇒ 33 ações.<br>Sempre arredondado para baixo. |
| **العربية** | عدد الأسهم = (رأس المال × نسبة المخاطرة) ÷ المسافة بين الدخول ووقف الخسارة.<br>مثال: $10,000 × 1% = $100؛ دخول $100 ووقف $97 ⇒ 33 سهماً.<br>يُقرَّب دائماً للأسفل. |

### `stopLoss` — Stop Loss · סטופ לוס

| שפה | הסבר |
|---|---|
| **עברית** | המחיר שקבעת מראש ליציאה מעסקה מפסידה, כדי להגביל את ההפסד לסיכון שתכננת.<br>לדוגמה: LONG בכניסה $50 וסטופ מתחת לתמיכה ב-$48 ⇒ סיכון $2 למניה.<br>ה-R וגודל הפוזיציה מחושבים מהסטופ השמור בעסקה. |
| **English** | The price you set in advance to exit a losing trade, capping the loss at your plan.<br>Example: LONG at $50, stop below support at $48 ⇒ $2 risk per share.<br>R and position size use the saved stop. |
| **Español** | El precio fijado antes para salir de una operación perdedora, limitando la pérdida a tu plan.<br>Ejemplo: LONG a $50, stop bajo soporte en $48 ⇒ riesgo $2 por acción.<br>R y tamaño de posición usan el stop guardado. |
| **Português** | O preço que você define antes para sair de uma operação perdedora, limitando a perda ao plano.<br>Exemplo: LONG a $50, stop abaixo do suporte em $48 ⇒ $2 de risco por ação.<br>R e tamanho da posição usam o stop salvo. |
| **العربية** | السعر الذي تحدّده مسبقاً للخروج من صفقة خاسرة، فتبقى الخسارة ضمن خطتك.<br>مثال: LONG عند $50، ووقف تحت الدعم عند $48 ⇒ مخاطرة $2 للسهم.<br>يعتمد R وحجم المركز على الوقف المحفوظ. |

### `takeProfit` — Take Profit

| שפה | הסבר |
|---|---|
| **עברית** | מחיר היעד שקבעת לסגירת עסקה מנצחת.<br>לדוגמה: כניסה $100 וסטופ $98 ⇒ יעד ברירת המחדל $104 (1:2).<br>ברירת המחדל בגרף ובמאמן היא 1:2. |
| **English** | The target price you set to close a winning trade.<br>Example: entry $100 and stop $98 ⇒ a default target of $104 (1:2).<br>The default on the chart and in the coach is 1:2. |
| **Español** | El precio objetivo que fijas para cerrar una operación ganadora.<br>Ejemplo: entrada $100 y stop $98 ⇒ objetivo por defecto $104 (1:2).<br>Por defecto, en el gráfico y en el coach, es 1:2. |
| **Português** | O preço-alvo que você define para fechar uma operação vencedora.<br>Exemplo: entrada $100 e stop $98 ⇒ alvo padrão de $104 (1:2).<br>O padrão no gráfico e no coach é 1:2. |
| **العربية** | السعر المستهدف الذي تحدّده لإغلاق صفقة رابحة.<br>مثال: دخول $100 ووقف $98 ⇒ هدف افتراضي $104 (1:2).<br>الافتراضي في الرسم البياني وفي المدرّب هو 1:2. |

## סטאפים

### `breakout` — Breakout

| שפה | הסבר |
|---|---|
| **עברית** | כניסה כשהמחיר פורץ מעל רמת התנגדות מרכזית, רצוי במחזור מסחר עולה.<br>לדוגמה: התנגדות ב-$50 ונר יומי שנסגר ב-$51 במחזור מסחר כפול מהממוצע. |
| **English** | Entering when price breaks above a key resistance level, ideally on rising volume.<br>Example: resistance at $50 and a daily close at $51 on twice the average volume. |
| **Español** | Entrar cuando el precio rompe una resistencia clave, idealmente con volumen creciente.<br>Ejemplo: resistencia en $50 y cierre diario en $51 con el doble del volumen medio. |
| **Português** | Entrar quando o preço rompe uma resistência chave, idealmente com volume crescente.<br>Exemplo: resistência em $50 e fechamento diário em $51 com o dobro do volume médio. |
| **العربية** | الدخول عندما يخترق السعر مستوى مقاومة رئيسياً، ويُفضّل مع حجم تداول متزايد.<br>مثال: مقاومة عند $50 وإغلاق يومي عند $51 بضعف متوسط حجم التداول. |

### `pullback` — Pullback

| שפה | הסבר |
|---|---|
| **עברית** | כניסה כשמחיר במגמת עלייה נסוג לתמיכה ואז ממשיך לעלות.<br>לדוגמה: עלייה מ-$40 ל-$50, נסיגה לממוצע הנע ב-$46 וכניסה שם. |
| **English** | Entering when an uptrending price pulls back to support and then resumes higher.<br>Example: a run from $40 to $50, a pullback to the moving average at $46, entry there. |
| **Español** | Entrar cuando un precio en tendencia alcista retrocede a un soporte y luego retoma el alza.<br>Ejemplo: subida de $40 a $50, retroceso a la media móvil en $46 y entrada ahí. |
| **Português** | Entrar quando um preço em tendência de alta recua até um suporte e depois retoma a alta.<br>Exemplo: alta de $40 para $50, recuo até a média móvel em $46 e entrada ali. |
| **العربية** | الدخول عندما يتراجع سعر في اتجاه صاعد إلى دعم ثم يستأنف صعوده.<br>مثال: صعود من $40 إلى $50، ثم تراجع إلى المتوسط المتحرك عند $46، والدخول هناك. |

### `bullFlag` — Bull Flag

| שפה | הסבר |
|---|---|
| **עברית** | התכנסות צרה, יורדת קלות, אחרי עלייה חדה — במחזור מסחר מצטמצם.<br>לדוגמה: עלייה מ-$20 ל-$26, ואז 5 ימים בטווח $25–$26. |
| **English** | A tight, slightly falling consolidation after a sharp rise, on shrinking volume.<br>Example: a rise from $20 to $26, then 5 days in a $25–$26 range. |
| **Español** | Consolidación estrecha y levemente bajista tras una fuerte subida, con volumen decreciente.<br>Ejemplo: subida de $20 a $26 y luego 5 días en un rango de $25–$26. |
| **Português** | Consolidação estreita e levemente descendente após uma alta forte, com volume em queda.<br>Exemplo: alta de $20 para $26 e depois 5 dias em uma faixa de $25–$26. |
| **العربية** | تماسك ضيّق ومائل قليلاً للهبوط بعد صعود حاد، مع انكماش حجم التداول.<br>مثال: صعود من $20 إلى $26، ثم 5 أيام في نطاق $25–$26. |

### `ORBBreakout` — ORB Breakout

| שפה | הסבר |
|---|---|
| **עברית** | פריצת השיא או השפל של הדקות הראשונות של המסחר — 5, 15 או 30 דקות.<br>לדוגמה: טווח 15 הדקות הראשונות $30–$31 ⇒ כניסה מעל $31. |
| **English** | A break of the high or low of the first 5, 15 or 30 minutes of trading.<br>Example: a first-15-minute range of $30–$31 ⇒ entry above $31. |
| **Español** | Ruptura del máximo o mínimo de los primeros 5, 15 o 30 minutos de sesión.<br>Ejemplo: rango de $30–$31 en los primeros 15 minutos ⇒ entrada sobre $31. |
| **Português** | Rompimento da máxima ou mínima dos primeiros 5, 15 ou 30 minutos do pregão.<br>Exemplo: faixa de $30–$31 nos primeiros 15 min ⇒ entrada acima de $31. |
| **العربية** | اختراق قمة أو قاع أول 5 أو 15 أو 30 دقيقة من التداول.<br>مثال: نطاق $30–$31 في أول 15 دقيقة ⇒ الدخول فوق $31. |

### `VWAPReclaim` — VWAP Reclaim

| שפה | הסבר |
|---|---|
| **עברית** | המחיר חוזר מעל ה-VWAP — הממוצע המשוקלל במחזור המסחר של היום — אחרי שירד מתחתיו.<br>לדוגמה: VWAP ב-$40, ירידה ל-$39.50 וחזרה מעל $40 במחזור מסחר. |
| **English** | Price reclaims VWAP — the day's volume-weighted average price — after dipping below it.<br>Example: VWAP at $40, a dip to $39.50, then back above $40 on volume. |
| **Español** | El precio recupera el VWAP — el precio medio del día ponderado por volumen — tras caer por debajo.<br>Ejemplo: VWAP en $40, caída a $39.50 y regreso sobre $40 con volumen. |
| **Português** | O preço recupera o VWAP — o preço médio do dia ponderado por volume — após cair abaixo dele.<br>Exemplo: VWAP em $40, queda para $39.50 e volta acima de $40 com volume. |
| **العربية** | يستعيد السعر الـ VWAP — متوسط سعر اليوم المرجّح بحجم التداول — بعد هبوطه دونه.<br>مثال: VWAP عند $40، هبوط إلى $39.50، ثم عودة فوق $40 مع حجم تداول. |

### `higherLow` — Higher Low

| שפה | הסבר |
|---|---|
| **עברית** | כל תיקון נעצר מעל השפל הקודם — הסימן של מגמת עלייה.<br>לדוגמה: שפלים ב-$45, ואז $47, ואז $49. |
| **English** | Each pullback stops above the previous low — the mark of an uptrend.<br>Example: lows at $45, then $47, then $49. |
| **Español** | Cada retroceso para sobre el mínimo previo — señal de tendencia alcista.<br>Ejemplo: mínimos en $45, luego $47, luego $49. |
| **Português** | Cada recuo para acima da mínima anterior — marca de tendência de alta.<br>Exemplo: mínimas em $45, depois $47, depois $49. |
| **العربية** | كل تراجع يتوقف فوق القاع السابق — علامة الاتجاه الصاعد.<br>مثال: قيعان عند $45، ثم $47، ثم $49. |

### `cupAndHandle` — Cup & Handle

| שפה | הסבר |
|---|---|
| **עברית** | התבססות בצורת U, ואחריה ירידה קצרה ורדודה (ידית) לפני פריצה.<br>לדוגמה: ירידה מ-$60 ל-$48, חזרה ל-$59, ידית עד $56 ופריצה מעל $59. |
| **English** | A U-shaped base followed by a short, shallow dip (the handle) before a breakout.<br>Example: a fall from $60 to $48, back to $59, a handle down to $56, a break above $59. |
| **Español** | Una base en forma de U seguida de una caída corta y poco profunda (el asa) antes de la ruptura.<br>Ejemplo: caída de $60 a $48, regreso a $59, asa hasta $56 y ruptura sobre $59. |
| **Português** | Uma base em forma de U seguida de uma queda curta e rasa (a alça) antes do rompimento.<br>Exemplo: queda de $60 para $48, volta a $59, alça até $56 e rompimento acima de $59. |
| **العربية** | قاعدة على شكل حرف U يتبعها تراجع قصير وضحل (المقبض) قبل الاختراق.<br>مثال: هبوط من $60 إلى $48، عودة إلى $59، مقبض حتى $56، ثم اختراق فوق $59. |

### `failedBreakout` — Failed Breakout

| שפה | הסבר |
|---|---|
| **עברית** | פריצה שחוזרת מהר מתחת לרמה שנפרצה — מלכודת לקונים מאוחרים.<br>לדוגמה: פריצה ל-$51 מעל $50, ותוך יום חזרה ל-$49 ⇒ SHORT. |
| **English** | A breakout that quickly falls back below the broken level — a trap for late buyers.<br>Example: a break to $51 above $50, back to $49 within a day ⇒ SHORT. |
| **Español** | Una ruptura que vuelve rápido por debajo del nivel roto — una trampa para compradores tardíos.<br>Ejemplo: ruptura a $51 sobre $50 y vuelta a $49 en un día ⇒ SHORT. |
| **Português** | Rompimento que volta rápido abaixo do nível rompido — armadilha para compradores atrasados.<br>Exemplo: rompimento para $51 acima de $50 e volta a $49 em um dia ⇒ SHORT. |
| **العربية** | اختراق يعود سريعاً تحت المستوى المخترَق — فخّ للمشترين المتأخرين.<br>مثال: اختراق إلى $51 فوق $50، ثم عودة إلى $49 خلال يوم ⇒ SHORT. |

### `overextendedFade` — Overextended Fade

| שפה | הסבר |
|---|---|
| **עברית** | עסקה נגד המגמה כשהמחיר רחוק באופן חריג מעל ה-20 EMA.<br>לדוגמה: מניה ב-$60 כשה-20 EMA ב-$52 ⇒ SHORT לכיוון הממוצע.<br>אין במערכת סף ל'רחוק' — הוא שלך. |
| **English** | A counter-trend trade when price is unusually far above the 20 EMA.<br>Example: a stock at $60 with the 20 EMA at $52 ⇒ SHORT toward the average.<br>The app sets no threshold for 'far' — it is yours. |
| **Español** | Operación contra tendencia cuando el precio está inusualmente lejos sobre la 20 EMA.<br>Ejemplo: acción en $60 con la 20 EMA en $52 ⇒ SHORT hacia la media.<br>La app no fija un umbral para 'lejos' — lo decides tú. |
| **Português** | Operação contra a tendência com o preço incomumente distante acima da 20 EMA.<br>Exemplo: ação a $60 com a 20 EMA em $52 ⇒ SHORT em direção à média.<br>O app não define um limite para 'distante' — quem decide é você. |
| **العربية** | صفقة عكس الاتجاه عندما يكون السعر بعيداً بشكل غير معتاد فوق الـ 20 EMA.<br>مثال: سهم عند $60 والـ 20 EMA عند $52 ⇒ SHORT نحو المتوسط.<br>لا يحدد التطبيق عتبة لـ'بعيد' — العتبة لك. |

### `EMABounce50` — 50 EMA Bounce

| שפה | הסבר |
|---|---|
| **עברית** | תיקון לממוצע הנע האקספוננציאלי של 50 יום בגרף יומי, וקפיצה ממנו.<br>לדוגמה: 50 EMA ב-$80, שפל יומי $80.20 וסגירה ב-$82. |
| **English** | A pullback to the 50-day exponential moving average on a daily chart, and a bounce off it.<br>Example: 50 EMA at $80, a daily low of $80.20 and a close at $82. |
| **Español** | Un retroceso a la media móvil exponencial de 50 días en el gráfico diario, y un rebote en ella.<br>Ejemplo: 50 EMA en $80, mínimo diario de $80.20 y cierre en $82. |
| **Português** | Um recuo até a média móvel exponencial de 50 dias no gráfico diário, e um repique a partir dela.<br>Exemplo: 50 EMA em $80, mínima diária de $80.20 e fechamento em $82. |
| **العربية** | تراجع إلى المتوسط المتحرك الأسي لـ 50 يوماً على الرسم اليومي، ثم ارتداد منه.<br>مثال: 50 EMA عند $80، قاع يومي $80.20، وإغلاق عند $82. |

### `trendContinuation` — Trend Continuation

| שפה | הסבר |
|---|---|
| **עברית** | כניסה בתיקון רדוד ל-9 EMA בתוך מגמה קיימת.<br>לדוגמה: נסיגה ל-9 EMA ב-$30.10, כניסה ב-$30.30 וסטופ ב-$29.80. |
| **English** | Entering on a shallow pullback to the 9 EMA within an established trend.<br>Example: a pullback to the 9 EMA at $30.10, entry at $30.30, stop at $29.80. |
| **Español** | Entrar en un retroceso superficial a la 9 EMA dentro de una tendencia establecida.<br>Ejemplo: retroceso a la 9 EMA en $30.10, entrada en $30.30 y stop en $29.80. |
| **Português** | Entrar em um recuo raso até a 9 EMA dentro de uma tendência estabelecida.<br>Exemplo: recuo até a 9 EMA em $30.10, entrada em $30.30 e stop em $29.80. |
| **العربية** | الدخول عند تراجع سطحي إلى الـ 9 EMA ضمن اتجاه راسخ.<br>مثال: تراجع إلى الـ 9 EMA عند $30.10، دخول عند $30.30، ووقف عند $29.80. |

### `gapAndGo` — Gap & Go

| שפה | הסבר |
|---|---|
| **עברית** | מניה שפתחה בפער כלפי מעלה וממשיכה לעלות בלי לסגור את הפער.<br>לדוגמה: סגירה ב-$20, פתיחה ב-$22 ושיא יומי $24 בלי לרדת מתחת ל-$22. |
| **English** | A stock that gaps up at the open and keeps rising without filling the gap.<br>Example: a $20 close, a $22 open and a $24 high without trading below $22. |
| **Español** | Una acción que abre con hueco al alza y sigue subiendo sin cerrar el hueco.<br>Ejemplo: cierre en $20, apertura en $22 y máximo de $24 sin cotizar por debajo de $22. |
| **Português** | Uma ação que abre com gap de alta e continua subindo sem fechar o gap.<br>Exemplo: fechamento em $20, abertura em $22 e máxima de $24 sem negociar abaixo de $22. |
| **العربية** | سهم يفتح بفجوة صعودية ويواصل الصعود دون ملء الفجوة.<br>مثال: إغلاق عند $20، افتتاح عند $22، وقمة $24 دون التداول تحت $22. |

### `earningsGapPlay` — Earnings Gap Play

| שפה | הסבר |
|---|---|
| **עברית** | מסחר בכיוון הפער שנפתח אחרי דוח רבעוני — למעלה או למטה.<br>לדוגמה: פער ‎+6% ⇒ LONG מעל שיא הפתיחה; פער ‎−6% ⇒ SHORT מתחת לשפל הפתיחה. |
| **English** | Trading in the direction of the gap that opens after an earnings report — up or down.<br>Example: a +6% gap ⇒ LONG above the opening high; a −6% gap ⇒ SHORT below the opening low. |
| **Español** | Operar en la dirección del hueco tras un informe de resultados, al alza o a la baja.<br>Ejemplo: hueco +6% ⇒ LONG sobre el máximo de apertura; hueco −6% ⇒ SHORT bajo el mínimo de apertura. |
| **Português** | Operar na direção do gap que abre após a divulgação de resultados, para cima ou para baixo.<br>Exemplo: gap +6% ⇒ LONG acima da máxima de abertura; gap −6% ⇒ SHORT abaixo da mínima de abertura. |
| **العربية** | التداول في اتجاه الفجوة التي تفتح بعد تقرير الأرباح — صعوداً أو هبوطاً.<br>مثال: فجوة ‎+6% ⇒ LONG فوق قمة الافتتاح؛ فجوة ‎−6% ⇒ SHORT تحت قاع الافتتاح. |

### `rangeBreakout` — Range Breakout

| שפה | הסבר |
|---|---|
| **עברית** | יציאה מטווח מחירים שנמשך ימים או שבועות.<br>לדוגמה: 3 שבועות בין $40 ל-$44, ואז סגירה ב-$45. |
| **English** | A break out of a price range that lasted days or weeks.<br>Example: 3 weeks between $40 and $44, then a close at $45. |
| **Español** | Salida de un rango de precios que duró días o semanas.<br>Ejemplo: 3 semanas entre $40 y $44 y luego un cierre en $45. |
| **Português** | Saída de uma faixa de preço que durou dias ou semanas.<br>Exemplo: 3 semanas entre $40 e $44 e depois um fechamento em $45. |
| **العربية** | خروج من نطاق سعري استمر أياماً أو أسابيع.<br>مثال: 3 أسابيع بين $40 و$44، ثم إغلاق عند $45. |

### `postEarningsStrength` — Post-Earnings Strength

| שפה | הסבר |
|---|---|
| **עברית** | מניה שמחזיקה מעל פער עלייה בימים שאחרי דוח חיובי.<br>לדוגמה: פער מ-$50 ל-$56, ו-5 ימים מעל $55. |
| **English** | A stock that holds above an upside gap in the days after a strong report.<br>Example: a gap from $50 to $56, then 5 days above $55. |
| **Español** | Acción que se mantiene sobre un hueco alcista en los días tras un buen informe.<br>Ejemplo: hueco de $50 a $56 y luego 5 días sobre $55. |
| **Português** | Ação que se mantém acima de um gap de alta nos dias após um balanço forte.<br>Exemplo: gap de $50 para $56 e depois 5 dias acima de $55. |
| **العربية** | سهم يبقى فوق فجوة صعودية في الأيام التي تلي تقريراً قوياً.<br>مثال: فجوة من $50 إلى $56، ثم 5 أيام فوق $55. |

### `powerHourBreak` — Power Hour Break

| שפה | הסבר |
|---|---|
| **עברית** | פריצה בשעת המסחר האחרונה, 15:00–16:00 לפי שעון ניו יורק (בדרך כלל 22:00–23:00 שעון ישראל).<br>לדוגמה: שיא יומי $70 נפרץ ב-15:20 ⇒ כניסה ב-$70.10. |
| **English** | A breakout in the last trading hour, 3–4 pm New York time.<br>Example: a $70 daily high broken at 3:20 pm ⇒ entry at $70.10. |
| **Español** | Ruptura en la última hora de sesión, 15:00–16:00 en Nueva York.<br>Ejemplo: máximo diario de $70 roto a las 15:20 ⇒ entrada en $70.10. |
| **Português** | Rompimento na última hora do pregão, 15h–16h em Nova York.<br>Exemplo: máxima diária de $70 rompida às 15h20 ⇒ entrada em $70.10. |
| **العربية** | اختراق في آخر ساعة تداول، 15:00–16:00 بتوقيت نيويورك.<br>مثال: كسر القمة اليومية $70 عند 15:20 ⇒ الدخول عند $70.10. |

### `MOCFade` — MOC Fade

| שפה | הסבר |
|---|---|
| **עברית** | מסחר נגד תנועה חדה לקראת הסגירה (Market-On-Close), בציפייה לתיקון למחרת.<br>לדוגמה: עלייה של ‎+4% בשעה האחרונה ⇒ SHORT לקראת הסגירה.<br>ב-NYSE פקודות MOC נכנסות עד 15:50 לפי שעון ניו יורק. |
| **English** | Trading against a sharp move into the close (Market-On-Close), expecting a next-day pullback.<br>Example: a +4% move in the last hour ⇒ SHORT into the close.<br>On the NYSE, MOC orders are accepted until 3:50 p.m. New York time. |
| **Español** | Operar contra un movimiento brusco al cierre (Market-On-Close), esperando un retroceso al día siguiente.<br>Ejemplo: +4% en la última hora ⇒ SHORT hacia el cierre.<br>En la NYSE, las órdenes MOC se aceptan hasta las 15:50 hora de Nueva York. |
| **Português** | Operar contra um movimento forte rumo ao fechamento (Market-On-Close), esperando uma correção no dia seguinte.<br>Exemplo: +4% na última hora ⇒ SHORT rumo ao fechamento.<br>Na NYSE, ordens MOC são aceitas até 15h50, horário de Nova York. |
| **العربية** | التداول عكس حركة حادة قبيل الإغلاق (Market-On-Close)، توقعاً لتراجع في اليوم التالي.<br>مثال: حركة ‎+4% في الساعة الأخيرة ⇒ SHORT قبيل الإغلاق.<br>في NYSE تُقبل أوامر MOC حتى 15:50 بتوقيت نيويورك. |

### `overnightHold` — Overnight Hold

| שפה | הסבר |
|---|---|
| **עברית** | עסקה שהשארת פתוחה אחרי סגירת יום המסחר.<br>לדוגמה: קנית ב-$30 ב-15:30, והמניה פתחה למחרת ב-$28 ⇒ פער נגדך.<br>סטופ לא מגן מפני פער בפתיחה. |
| **English** | A trade you left open past the trading-day close.<br>Example: you bought at $30 at 3:30 p.m. and the stock opened at $28 the next day ⇒ a gap against you.<br>A stop does not protect against an opening gap. |
| **Español** | Una operación que dejaste abierta después del cierre de la sesión.<br>Ejemplo: compraste a $30 a las 15:30 y la acción abrió a $28 al día siguiente ⇒ hueco en tu contra.<br>Un stop no protege frente a un hueco de apertura. |
| **Português** | Uma operação que você deixou aberta depois do fechamento do pregão.<br>Exemplo: você comprou a $30 às 15h30 e a ação abriu a $28 no dia seguinte ⇒ um gap contra você.<br>Um stop não protege contra um gap de abertura. |
| **العربية** | صفقة تركتها مفتوحة بعد إغلاق يوم التداول.<br>مثال: اشتريت عند $30 الساعة 15:30، وافتتح السهم عند $28 في اليوم التالي ⇒ فجوة ضدك.<br>وقف الخسارة لا يحمي من فجوة الافتتاح. |

### `overnightReversal` — Overnight Reversal

| שפה | הסבר |
|---|---|
| **עברית** | מסחר נגד תנועת הלילה בפתיחת המסחר, אחרי אישור.<br>לדוגמה: פער ‎−3% בפתיחה והמחיר חוזר מעל מחיר הפתיחה ⇒ LONG. |
| **English** | Trading against the overnight move at the open, after confirmation.<br>Example: a −3% gap at the open and price back above the opening price ⇒ LONG. |
| **Español** | Operar contra el movimiento nocturno en la apertura, tras confirmación.<br>Ejemplo: hueco de −3% al abrir y el precio vuelve sobre el precio de apertura ⇒ LONG. |
| **Português** | Operar contra o movimento noturno na abertura, após confirmação.<br>Exemplo: gap de −3% na abertura e o preço volta acima do preço de abertura ⇒ LONG. |
| **العربية** | التداول عكس حركة الليل عند الافتتاح، بعد التأكيد.<br>مثال: فجوة ‎−3% عند الافتتاح وعودة السعر فوق سعر الافتتاح ⇒ LONG. |

### `supportBounce` — Support Bounce

| שפה | הסבר |
|---|---|
| **עברית** | כניסה כשהמחיר יורד לרמת תמיכה מוכרת ומתהפך כלפי מעלה.<br>לדוגמה: תמיכה ב-$25, שפל $25.10, כניסה ב-$25.60 וסטופ ב-$24.80. |
| **English** | Entering when price drops to a known support level and turns up.<br>Example: support at $25, a low of $25.10, entry at $25.60, stop at $24.80. |
| **Español** | Entrar cuando el precio cae a un nivel de soporte conocido y gira al alza.<br>Ejemplo: soporte en $25, mínimo $25.10, entrada en $25.60 y stop en $24.80. |
| **Português** | Entrar quando o preço cai até um nível de suporte conhecido e vira para cima.<br>Exemplo: suporte em $25, mínima $25.10, entrada em $25.60, stop em $24.80. |
| **العربية** | الدخول عندما يهبط السعر إلى مستوى دعم معروف ثم ينعطف صعوداً.<br>مثال: دعم عند $25، قاع $25.10، دخول عند $25.60، ووقف عند $24.80. |

### `resistanceBreak` — Resistance Break

| שפה | הסבר |
|---|---|
| **עברית** | כניסה כשהמחיר פורץ רמת התנגדות ספציפית שעצרה אותו בעבר.<br>לדוגמה: נעצר פעמיים ב-$80, ואז נסגר ב-$81 במחזור מסחר גבוה. |
| **English** | Entering when price breaks a specific resistance level that stopped it before.<br>Example: stopped twice at $80, then a close at $81 on high volume. |
| **Español** | Entrar cuando el precio rompe un nivel de resistencia concreto que antes lo frenó.<br>Ejemplo: se frenó dos veces en $80 y luego cerró en $81 con volumen alto. |
| **Português** | Entrar quando o preço rompe um nível de resistência específico que o travou antes.<br>Exemplo: travou duas vezes em $80 e depois fechou em $81 com volume alto. |
| **العربية** | الدخول عندما يخترق السعر مستوى مقاومة محدداً أوقفه من قبل.<br>مثال: توقف مرتين عند $80، ثم أغلق عند $81 بحجم تداول مرتفع. |

### `pullback20EMA` — Pullback to 20 EMA

| שפה | הסבר |
|---|---|
| **עברית** | כניסה כשמחיר במגמת עלייה נסוג לממוצע הנע האקספוננציאלי של 20 תקופות ומתהפך.<br>לדוגמה: 20 EMA ב-$40, שפל $40.15 וסגירה ב-$41. |
| **English** | Entering when an uptrending price pulls back to the 20-period exponential moving average and turns.<br>Example: 20 EMA at $40, a low of $40.15 and a close at $41. |
| **Español** | Entrar cuando un precio en tendencia alcista retrocede a la media móvil exponencial de 20 períodos y gira.<br>Ejemplo: 20 EMA en $40, mínimo de $40.15 y cierre en $41. |
| **Português** | Entrar quando um preço em tendência de alta recua até a média móvel exponencial de 20 períodos e vira.<br>Exemplo: 20 EMA em $40, mínima de $40.15 e fechamento em $41. |
| **العربية** | الدخول عندما يتراجع سعر في اتجاه صاعد إلى المتوسط المتحرك الأسي لـ 20 فترة ثم ينعطف.<br>مثال: 20 EMA عند $40، قاع $40.15، وإغلاق عند $41. |

## רגשות

### `emotionConfident` — Confident

| שפה | הסבר |
|---|---|
| **עברית** | ביטחון שנשען על סטאפ תקף ועל ניתוח, לא על רצף רווחים.<br>לדוגמה: כל התנאים שכתבת התקיימו ונכנסת בגודל הרגיל.<br>אחרי רצף רווחים — בדוק שזה לא ביטחון-יתר. |
| **English** | Confidence grounded in a valid setup and analysis, not in a winning streak.<br>Example: every condition you wrote down was met and you entered at normal size.<br>After a winning streak, check that it is not overconfidence. |
| **Español** | Confianza basada en un setup válido y en el análisis, no en una racha ganadora.<br>Ejemplo: se cumplieron todas las condiciones que anotaste y entraste con tu tamaño normal.<br>Tras una racha ganadora, comprueba que no sea exceso de confianza. |
| **Português** | Confiança apoiada em setup válido e análise, não em sequência de ganhos.<br>Exemplo: todas as condições que você anotou se cumpriram e você entrou no tamanho normal.<br>Após uma sequência de ganhos, veja se não é excesso de confiança. |
| **العربية** | ثقة مبنية على نموذج دخول صحيح وعلى التحليل، لا على سلسلة أرباح.<br>مثال: تحققت كل الشروط التي دوّنتها ودخلت بحجمك المعتاد.<br>بعد سلسلة أرباح، تحقّق من أنها ليست ثقة مفرطة. |

### `emotionCalm` — Calm

| שפה | הסבר |
|---|---|
| **עברית** | נכנסת בלי לחץ ובלי מרדף, לפי התוכנית.<br>לדוגמה: חיכית למחיר שתכננת והצבת סטופ ויעד מראש. |
| **English** | You entered without pressure or chasing, according to plan.<br>Example: you waited for your planned price and set the stop and target in advance. |
| **Español** | Entraste sin presión y sin perseguir el movimiento, según el plan.<br>Ejemplo: esperaste tu precio planificado y fijaste el stop y el objetivo de antemano. |
| **Português** | Você entrou sem pressão e sem correr atrás, de acordo com o plano.<br>Exemplo: você esperou o preço planejado e definiu o stop e o alvo com antecedência. |
| **العربية** | دخلت دون ضغط ودون مطاردة، وفقًا للخطة.<br>مثال: انتظرت السعر الذي خططت له وحددت وقف الخسارة والهدف مسبقًا. |

### `emotionPatient` — Patient

| שפה | הסבר |
|---|---|
| **עברית** | חיכית לסטאפ שעומד בכל הקריטריונים שלך, במקום להיכנס לכל תנועה.<br>לדוגמה: דילגת על שתי פריצות חלשות ונכנסת בשלישית. |
| **English** | You waited for a setup that met all your criteria instead of entering every move.<br>Example: you skipped two weak breakouts and took the third. |
| **Español** | Esperaste un setup que cumpliera todos tus criterios en vez de entrar en cada movimiento.<br>Ejemplo: omitiste dos breakouts débiles y tomaste el tercero. |
| **Português** | Esperou um setup que cumprisse todos os seus critérios em vez de entrar em cada movimento.<br>Exemplo: você pulou dois breakouts fracos e pegou o terceiro. |
| **العربية** | انتظرت نموذج دخول يستوفي كل معاييرك بدلًا من الدخول في كل حركة.<br>مثال: تجاوزت اختراقين ضعيفين ودخلت في الثالث. |

### `emotionNeutral` — Neutral

| שפה | הסבר |
|---|---|
| **עברית** | נכנסת בלי מטען רגשי — לא נלהב ולא חושש.<br>לדוגמה: עוד עסקה מתוך התוכנית, בלי ציפייה מיוחדת. |
| **English** | You entered with no emotional charge — neither excited nor fearful.<br>Example: one more trade from the plan, with no special expectation. |
| **Español** | Entraste sin carga emocional — ni entusiasmado ni temeroso.<br>Ejemplo: una operación más del plan, sin una expectativa especial. |
| **Português** | Você entrou sem carga emocional — nem empolgado nem com medo.<br>Exemplo: mais uma operação do plano, sem expectativa especial. |
| **العربية** | دخلت دون شحنة عاطفية — لا متحمسًا ولا خائفًا.<br>مثال: صفقة أخرى من الخطة، دون توقّع خاص. |

### `emotionHesitant` — Hesitant

| שפה | הסבר |
|---|---|
| **עברית** | היססת בכניסה — לרוב כשהסטאפ לא ברור או שהביטחון נמוך.<br>לדוגמה: חיכית לעוד נר ונכנסת $0.50 מעל המחיר שתכננת. |
| **English** | You hesitated at entry — usually when the setup is unclear or confidence is low.<br>Example: you waited for one more candle and entered $0.50 above your planned price. |
| **Español** | Dudaste al entrar — normalmente cuando el setup no está claro o la confianza es baja.<br>Ejemplo: esperaste una vela más y entraste $0.50 por encima de tu precio planificado. |
| **Português** | Você hesitou na entrada — geralmente quando o setup não está claro ou a confiança está baixa.<br>Exemplo: você esperou mais um candle e entrou $0.50 acima do preço planejado. |
| **العربية** | تردّدت عند الدخول — غالبًا عندما يكون نموذج الدخول غير واضح أو الثقة منخفضة.<br>مثال: انتظرت شمعة أخرى ودخلت أعلى من سعرك المخطط بـ $0.50. |

### `emotionNervous` — Nervous

| שפה | הסבר |
|---|---|
| **עברית** | מתח שהעיב על שיקול הדעת שלך בזמן העסקה.<br>לדוגמה: בדקת את המחיר כל דקה והזזת את הסטופ פעמיים.<br>לעיתים סימן שהפוזיציה גדולה מדי. |
| **English** | Tension that clouded your judgment during the trade.<br>Example: you checked the price every minute and moved the stop twice.<br>Sometimes a sign the position is too large. |
| **Español** | Tensión que nubló tu juicio durante la operación.<br>Ejemplo: revisaste el precio cada minuto y moviste el stop dos veces.<br>A veces indica que la posición es demasiado grande. |
| **Português** | Tensão que turvou seu julgamento durante a operação.<br>Exemplo: você checou o preço a cada minuto e moveu o stop duas vezes.<br>Às vezes indica que a posição está grande demais. |
| **العربية** | توتّر شوّش حكمك أثناء الصفقة.<br>مثال: كنت تتحقق من السعر كل دقيقة وحرّكت وقف الخسارة مرتين.<br>أحيانًا علامة على أن حجم الصفقة كبير جدًا. |

### `emotionFOMO` — FOMO

| שפה | הסבר |
|---|---|
| **עברית** | נכנסת כי המחיר זז חזק ופחדת להחמיץ, בלי סטאפ תקף.<br>לדוגמה: המניה עלתה ‎+6% ונכנסת בשיא בלי סטופ ברור. |
| **English** | You entered because price moved hard and you feared missing out, with no valid setup.<br>Example: the stock was up +6% and you entered at the high with no clear stop. |
| **Español** | Entraste porque el precio se movió fuerte y temías quedarte fuera, sin un setup válido.<br>Ejemplo: la acción subía +6% y entraste en el máximo sin un stop claro. |
| **Português** | Você entrou porque o preço se moveu forte e teve medo de ficar de fora, sem um setup válido.<br>Exemplo: a ação subia +6% e você entrou na máxima sem um stop claro. |
| **العربية** | دخلت لأن السعر تحرّك بقوة وخشيت أن تفوتك الفرصة، دون نموذج دخول صحيح.<br>مثال: كان السهم مرتفعًا ‎+6% ودخلت عند القمة دون وقف خسارة واضح. |

### `emotionAngry` — Angry

| שפה | הסבר |
|---|---|
| **עברית** | כעס אחרי הפסד שדחף אותך להחזיר אותו מיד — מסחר נקמה.<br>לדוגמה: הפסדת $200 ופתחת מיד עסקה בגודל כפול. |
| **English** | Anger after a loss that pushed you to win it back at once — revenge trading.<br>Example: you lost $200 and immediately opened a trade at double size. |
| **Español** | Ira tras una pérdida que te empujó a recuperarla enseguida — trading de venganza.<br>Ejemplo: perdiste $200 y enseguida abriste una operación del doble de tamaño. |
| **Português** | Raiva após uma perda que levou você a recuperá-la na hora — trading de vingança.<br>Exemplo: você perdeu $200 e abriu na hora uma operação com o dobro do tamanho. |
| **العربية** | غضب بعد خسارة دفعك إلى استعادتها فورًا — التداول الانتقامي.<br>مثال: خسرت $200 وفتحت فورًا صفقة بضعف الحجم. |

## פעולות ותכונות

### `chartCalcPosition` — Calculate Position · חשב פוזיציה

| שפה | הסבר |
|---|---|
| **עברית** | ממלא את מחשבון הפוזיציה מהגרף: טיקר, מחיר חי ככניסה, סטופ ויעד 1:2.<br>לדוגמה: כניסה $50 וסטופ $48 ⇒ יעד $54. |
| **English** | Fills the position calculator from the chart: ticker, live price as entry, a stop and a 1:2 target.<br>Example: entry $50 and stop $48 ⇒ target $54. |
| **Español** | Rellena la calculadora de posición desde el gráfico: ticker, precio en vivo como entrada, stop y objetivo 1:2.<br>Ejemplo: entrada $50 y stop $48 ⇒ objetivo $54. |
| **Português** | Preenche a calculadora de posição pelo gráfico: ticker, preço ao vivo como entrada, stop e alvo 1:2.<br>Exemplo: entrada $50 e stop $48 ⇒ alvo $54. |
| **العربية** | يملأ حاسبة الصفقة من الرسم البياني: الرمز، والسعر الحي كدخول، ووقف، وهدف 1:2.<br>مثال: دخول $50 ووقف $48 ⇒ هدف $54. |

### `chartAddToJournal` — Add to Journal · הוסף ליומן

| שפה | הסבר |
|---|---|
| **עברית** | פותח עסקה חדשה ביומן מהגרף — טיקר, מחיר חי, סטופ מוצע ויעד 1:2 — לבדיקה ושמירה.<br>לדוגמה: כניסה $50, סטופ $48 ויעד $54 ממולאים, ושמרת. |
| **English** | Opens a journal trade from the chart, prefilled with ticker, live price, a stop and a 1:2 target.<br>Example: entry $50, stop $48 and target $54 filled in, and you saved. |
| **Español** | Abre una operación en el diario desde el gráfico, prellenada con ticker, precio en vivo, stop y objetivo 1:2.<br>Ejemplo: se rellenaron entrada $50, stop $48 y objetivo $54, y guardaste. |
| **Português** | Abre uma operação no diário pelo gráfico, pré-preenchida com ticker, preço ao vivo, stop e alvo 1:2.<br>Exemplo: entrada $50, stop $48 e alvo $54 preenchidos, e você salvou. |
| **العربية** | يفتح صفقة في اليوميّة من الرسم البياني، معبّأة مسبقاً بالرمز والسعر الحي ووقف وهدف 1:2.<br>مثال: عُبّئت قيم الدخول $50 والوقف $48 والهدف $54، ثم حفظت. |

### `visionOcr` — Vision OCR

| שפה | הסבר |
|---|---|
| **עברית** | קורא עסקה מצילום מסך של הגרף וממלא את השדות במקום הקלדה.<br>לדוגמה: העלית צילום עם כניסה, סטופ ויעד ⇒ השדות התמלאו.<br>בדוק את הערכים לפני השמירה. |
| **English** | Reads a trade from a chart screenshot and fills the fields instead of typing.<br>Example: you uploaded a screenshot with entry, stop and target ⇒ the fields were filled.<br>Check the values before saving. |
| **Español** | Lee una operación desde una captura del gráfico y rellena los campos en lugar de escribirlos.<br>Ejemplo: subiste una captura con entrada, stop y objetivo ⇒ los campos se rellenaron.<br>Revisa los valores antes de guardar. |
| **Português** | Lê uma operação a partir de um print do gráfico e preenche os campos em vez de você digitar.<br>Exemplo: você enviou um print com entrada, stop e alvo ⇒ os campos foram preenchidos.<br>Confira os valores antes de salvar. |
| **العربية** | يقرأ صفقة من لقطة شاشة للرسم البياني ويملأ الحقول بدلاً من الكتابة.<br>مثال: رفعت لقطة شاشة فيها الدخول والوقف والهدف ⇒ امتلأت الحقول.<br>تحقّق من القيم قبل الحفظ. |
