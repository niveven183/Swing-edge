# 📘 SwingEdge — מילון מונחים · 5 שפות

> ⛔ קובץ מחולל — אל תערוך. המקור: `src/glossary/terms/` · הרץ `npm run glossary`.
> sourceHash `7597dbf08dc2e372` · **80 מונחים** · 5 שפות (עברית · English · Español · Português · العربية).

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
| **Español** | La Win Rate es el porcentaje de tus operaciones cerradas que terminaron en ganancia.<br><br>Por encima del 55% es sólido. Pero la win rate por sí sola no determina el éxito — un trader con 40% puede ser rentable con buenas relaciones riesgo-beneficio. Fíjate también en el Profit Factor. |
| **Português** | A Win Rate é a percentagem das tuas operações fechadas que terminaram em lucro.<br><br>Acima de 55% é sólido. Mas a win rate sozinha não determina o sucesso — um trader com 40% pode ser lucrativo com boas relações risco-retorno. Repara também no Profit Factor. |
| **العربية** | نسبة الربح (Win Rate) هي النسبة المئوية لصفقاتك المغلقة التي انتهت بربح.<br><br>أعلى من 55% جيّدة. لكن نسبة الربح وحدها لا تحدّد النجاح — فمتداول بنسبة 40% قد يكون رابحاً إذا كانت نسب المخاطرة/العائد قوية. انظر أيضاً إلى Profit Factor. |

### `profitFactor` — Profit Factor

| שפה | הסבר |
|---|---|
| **עברית** | סך הרווחים הגולמיים חלקי סך ההפסדים הגולמיים בעסקאות הסגורות.<br>לדוגמה: הרווחת $3,000 והפסדת $2,000 ⇒ 1.5; מעל 1 = הרווחת יותר משהפסדת.<br>בלי אף הפסד הערך הוא ∞; מחושב לפני עמלות. |
| **English** | Gross profit divided by gross loss across your closed trades.<br>Example: you won $3,000 and lost $2,000 ⇒ 1.5; above 1 means you won more than you lost.<br>With no losses at all it reads ∞; computed before commissions. |
| **Español** | Profit Factor = Ganancias Brutas Totales ÷ Pérdidas Brutas Totales.<br><br>• Por encima de 1.0 = rentable<br>• Por encima de 1.5 = ventaja sana<br>• Por encima de 2.0 = nivel profesional<br>• Por encima de 3.0 = excepcional<br><br>Es una de las métricas más importantes en el trading. |
| **Português** | Profit Factor = Lucros Brutos Totais ÷ Perdas Brutas Totais.<br><br>• Acima de 1.0 = lucrativo<br>• Acima de 1.5 = vantagem saudável<br>• Acima de 2.0 = nível profissional<br>• Acima de 3.0 = excecional<br><br>É uma das métricas mais importantes no trading. |
| **العربية** | Profit Factor = إجمالي الأرباح ÷ إجمالي الخسائر.<br><br>• أعلى من 1.0 = رابح<br>• أعلى من 1.5 = أفضلية صحّية<br>• أعلى من 2.0 = مستوى احترافي<br>• أعلى من 3.0 = استثنائي<br><br>من أهم المقاييس في التداول. |

### `avgR` — Avg R · R ממוצע

| שפה | הסבר |
|---|---|
| **עברית** | ממוצע ה-R בעסקאות סגורות; R = רווח ÷ הסיכון לפי הסטופ השמור, לפי הכיוון (LONG/SHORT).<br>לדוגמה: סיכנת $100 והרווחת $150 ⇒ ‎+1.5R.<br>עסקה בלי סטופ מוחרגת מהממוצע ואינה נספרת כ-0R. |
| **English** | Average R of closed trades; R = profit ÷ risk at the saved stop, by direction (LONG/SHORT).<br>Example: you risked $100 and made $150 ⇒ +1.5R.<br>A trade without a stop is excluded, not counted as 0R. |
| **Español** | R-Multiple promedio por operación cerrada.<br><br>R = ganancia de la operación ÷ riesgo inicial por acción. La ganancia sigue la dirección de la operación: en un LONG es (Salida − Entrada), en un SHORT es (Entrada − Salida) — así que un SHORT ganador siempre da un R positivo.<br><br>+1.0R significa que ganaste exactamente lo que arriesgaste. Apunta a +0.3R o más como promedio mínimo. Los traders de élite promedian +1.5R a +2.5R.<br><br>Solo las operaciones con stop pueden medirse en R — una operación sin stop se excluye de este promedio, no cuenta como 0R. La línea bajo el número muestra cuántas de tus operaciones cerradas cubre realmente el promedio. |
| **Português** | R-Multiple médio por operação fechada.<br><br>R = lucro da operação ÷ risco inicial por ação. O lucro segue a direção da operação: num LONG é (Saída − Entrada), num SHORT é (Entrada − Saída) — por isso um SHORT vencedor dá sempre um R positivo.<br><br>+1.0R significa que ganhaste exatamente o que arriscaste. Aponta para +0.3R ou mais como média mínima. Traders de elite têm média de +1.5R a +2.5R.<br><br>Só as operações com stop podem ser medidas em R — uma operação sem stop é excluída desta média, não conta como 0R. A linha por baixo do número mostra quantas das tuas operações fechadas a média cobre realmente. |
| **العربية** | متوسّط R-Multiple لكل صفقة مغلقة.<br><br>R = ربح الصفقة ÷ المخاطرة الأوّلية للسهم. الربح يتبع اتّجاه الصفقة: في LONG هو (الخروج − الدخول)، وفي SHORT هو (الدخول − الخروج) — لذلك فإن SHORT الرابحة تعطي دائماً R موجباً.<br><br>+1.0R يعني أنك ربحت تماماً ما خاطرت به. استهدف +0.3R أو أعلى كحدّ أدنى للمتوسّط. متداولو النخبة يحقّقون متوسّط +1.5R إلى +2.5R.<br><br>الصفقات التي لها وقف خسارة فقط يمكن قياسها بـ R — الصفقة بلا وقف تُستثنى من هذا المتوسّط ولا تُحتسب كـ 0R. السطر أسفل الرقم يوضّح كم صفقة مغلقة يغطّيها المتوسّط فعلياً. |

### `expectancy` — Expectancy · תוחלת

| שפה | הסבר |
|---|---|
| **עברית** | כמה R הרווחת בממוצע לעסקה סגורה, כשעסקאות Break-even נספרות במכנה.<br>לדוגמה: חצי רווחים של ‎+2R וחצי הפסדים של ‎−1R ⇒ ‎+0.5R לעסקה.<br>נמדד ב-R ולא בדולרים. |
| **English** | The average R you made per closed trade, with break-even trades in the denominator.<br>Example: half the trades win +2R and half lose −1R ⇒ +0.5R per trade.<br>Measured in R, not dollars. |
| **Español** | Expectativa = (% Ganancias × Ganancia Media) − (% Pérdidas × Pérdida Media).<br><br>Te dice el beneficio esperado en dólares por operación en promedio. Positiva = tu sistema tiene ventaja. Negativa = pierdes dinero con el tiempo sin importar las ganancias individuales. |
| **Português** | Expectativa = (% Ganhos × Ganho Médio) − (% Perdas × Perda Média).<br><br>Diz-te o lucro esperado em dólares por operação em média. Positiva = o teu sistema tem vantagem. Negativa = perdes dinheiro ao longo do tempo independentemente dos ganhos individuais. |
| **العربية** | التوقّع = (نسبة الربح × متوسّط الربح) − (نسبة الخسارة × متوسّط الخسارة).<br><br>يخبرك بالربح المتوقّع بالدولار لكل صفقة في المتوسّط. موجب = نظامك يملك أفضلية. سالب = تخسر المال مع الوقت بغضّ النظر عن المكاسب الفردية. |

### `sharpe` — Per-trade Sharpe (R) · Sharpe לעסקה (R)

| שפה | הסבר |
|---|---|
| **עברית** | ממוצע ה-R לעסקה חלקי סטיית התקן של ה-R — תשואה ליחידת תנודתיות.<br>לדוגמה: ממוצע ‎+0.5R וסטיית תקן 1R ⇒ 0.5.<br>בלי ריבית חסרת סיכון ובלי שנתיות — אינו בר-השוואה ל-Sharpe של קרן. |
| **English** | Mean R per trade divided by the standard deviation of R.<br>Example: an average of +0.5R with a 1R standard deviation ⇒ 0.5.<br>No risk-free rate and no annualizing — not comparable to a fund's Sharpe ratio. |
| **Español** | El Ratio de Sharpe mide el rendimiento ajustado al riesgo.<br><br>• Por encima de 1.0 = bueno<br>• Por encima de 2.0 = excelente<br>• Por encima de 3.0 = excepcional (nivel de hedge fund)<br><br>Un Sharpe alto significa rendimientos consistentes sin oscilaciones bruscas. Más importante que el beneficio bruto para evaluar la calidad del sistema. |
| **Português** | O Rácio de Sharpe mede o retorno ajustado ao risco.<br><br>• Acima de 1.0 = bom<br>• Acima de 2.0 = excelente<br>• Acima de 3.0 = excecional (nível de hedge fund)<br><br>Um Sharpe alto significa retornos consistentes sem oscilações bruscas. Mais importante que o lucro bruto para avaliar a qualidade do sistema. |
| **العربية** | يقيس مقياس شارب (Sharpe) العائد المعدّل حسب المخاطرة.<br><br>• أعلى من 1.0 = جيّد<br>• أعلى من 2.0 = ممتاز<br>• أعلى من 3.0 = استثنائي (مستوى صناديق التحوّط)<br><br>شارب المرتفع يعني عوائد متّسقة دون تقلّبات حادّة. أهمّ من الربح الخام لتقييم جودة النظام. |

### `maxDD` — Max Drawdown · ירידה מקסימלית

| שפה | הסבר |
|---|---|
| **עברית** | הירידה הגדולה ביותר, בסכום כסף, משיא ה-P&L המצטבר של העסקאות הסגורות עד השפל שאחריו.<br>לדוגמה: ה-P&L המצטבר עלה ל-$2,000 וירד ל-$1,200 ⇒ $800.<br>נמדד בסכום ולא באחוזים מההון. |
| **English** | The largest drop, in money, from a peak in your cumulative closed-trade P&L to the low after it.<br>Example: cumulative P&L rose to $2,000 and fell to $1,200 ⇒ $800.<br>Measured as an amount, not as a percentage of capital. |
| **Español** | Drawdown Máximo — la mayor caída en dólares desde un pico en el saldo de tu cuenta hasta el punto más bajo antes de recuperarse.<br><br>Un número menor significa menos rachas perdedoras grandes y mejor preservación del capital. Los drawdowns profundos son psicológicamente dañinos y difíciles de recuperar matemáticamente. |
| **Português** | Drawdown Máximo — a maior queda em dólares desde um pico no saldo da tua conta até ao ponto mais baixo antes da recuperação.<br><br>Um número menor significa menos sequências perdedoras grandes e melhor preservação de capital. Drawdowns profundos são psicologicamente prejudiciais e difíceis de recuperar matematicamente. |
| **العربية** | أقصى تراجع (Max Drawdown) — أكبر هبوط بالدولار من قمّة في رصيد حسابك إلى أدنى نقطة قبل التعافي.<br><br>الرقم الأصغر يعني سلاسل خسائر كبيرة أقل وحفاظاً أفضل على رأس المال. التراجعات العميقة مؤذية نفسياً وصعبة التعافي رياضياً. |

### `avgWin` — Avg Win · רווח ממוצע

| שפה | הסבר |
|---|---|
| **עברית** | הרווח הממוצע בעסקאות הסגורות שהסתיימו ברווח.<br>לדוגמה: רווחים של $100 ושל $300 ⇒ $200. |
| **English** | The average profit on your closed trades that ended in profit.<br>Example: wins of $100 and $300 ⇒ $200. |
| **Español** | Beneficio promedio en operaciones ganadoras. |
| **Português** | Lucro médio em operações vencedoras. |
| **العربية** | متوسّط الربح في الصفقات الرابحة. |

### `avgLoss` — Avg Loss · הפסד ממוצע

| שפה | הסבר |
|---|---|
| **עברית** | ההפסד הממוצע בעסקאות הסגורות שהסתיימו בהפסד.<br>לדוגמה: הפסדים של $50 ושל $150 ⇒ $100. |
| **English** | The average loss on your closed trades that ended in a loss.<br>Example: losses of $50 and $150 ⇒ $100. |
| **Español** | Pérdida promedio en operaciones perdedoras. |
| **Português** | Perda média em operações perdedoras. |
| **العربية** | متوسّط الخسارة في الصفقات الخاسرة. |

### `avgHold` — Avg Hold · זמן החזקה ממוצע

| שפה | הסבר |
|---|---|
| **עברית** | מספר הימים הממוצע בין הכניסה ליציאה בעסקאות סגורות.<br>לדוגמה: עסקאות של 2 ושל 6 ימים ⇒ 4 ימים.<br>ימים קלנדריים מעוגלים; כניסה ויציאה באותו יום = 0. |
| **English** | The average number of days between entry and exit on closed trades.<br>Example: trades of 2 and 6 days ⇒ 4 days.<br>Rounded calendar days; same-day entry and exit = 0. |
| **Español** | Periodo medio de mantenimiento por operación cerrada (en días).<br><br>El swing trading suele apuntar a mantener 2-10 días. Mantenimientos muy cortos (< 1 día) a menudo indican cerrar operaciones demasiado pronto. Mantenimientos muy largos (> 20 días) pueden sugerir evitar los stop-loss. |
| **Português** | Período médio de manutenção por operação fechada (em dias).<br><br>O swing trading costuma apontar para manter 2-10 dias. Manutenções muito curtas (< 1 dia) muitas vezes indicam fechar operações cedo demais. Manutenções muito longas (> 20 dias) podem sugerir evitar os stop-loss. |
| **العربية** | متوسّط فترة الاحتفاظ لكل صفقة مغلقة (بالأيام).<br><br>يستهدف التداول المتأرجح عادةً الاحتفاظ 2-10 أيام. فترات الاحتفاظ القصيرة جداً (< يوم واحد) كثيراً ما تعني إغلاق الصفقات مبكراً. والطويلة جداً (> 20 يوماً) قد تعني تجنّب أوامر وقف الخسارة. |

### `equityCurve` — Equity Curve · עקומת הון

| שפה | הסבר |
|---|---|
| **עברית** | יתרת החשבון לאורך זמן: בסיס ההון ועוד ה-P&L המצטבר אחרי כל עסקה שנסגרה.<br>לדוגמה: בסיס $10,000, עסקה של ‎+$200 ואחריה ‎−$50 ⇒ $10,200 ואז $10,150.<br>כל נקודה היא יום סגירה; פוזיציות פתוחות לא נכללות. |
| **English** | Your account balance over time: your capital base plus cumulative P&L after each closed trade.<br>Example: a $10,000 base, +$200 then −$50 ⇒ $10,200, then $10,150.<br>Each point is a closing day; open positions excluded. |
| **Español** | Tu Curva de Capital muestra el saldo de la cuenta a lo largo del tiempo.<br><br>Una curva suave y en ascenso constante = ventaja consistente y buena gestión del riesgo.<br>Picos irregulares = tamaño de posición inconsistente o trading emocional.<br>Largos periodos planos = sobreoperar sin ventaja. |
| **Português** | A tua Curva de Capital mostra o saldo da conta ao longo do tempo.<br><br>Uma curva suave e em ascensão constante = vantagem consistente e boa gestão de risco.<br>Picos irregulares = tamanho de posição inconsistente ou trading emocional.<br>Longos períodos planos = operar em excesso sem vantagem. |
| **العربية** | تُظهر منحنى رأس المال رصيد حسابك عبر الزمن.<br><br>منحنى سلس وصاعد بثبات = أفضلية متّسقة وإدارة مخاطر جيّدة.<br>قفزات حادّة = حجم صفقات غير متّسق أو تداول عاطفي.<br>فترات مسطّحة طويلة = إفراط في التداول دون أفضلية. |

### `totalReturn` — Total Return · תשואה כוללת

| שפה | הסבר |
|---|---|
| **עברית** | ה-P&L של העסקאות הסגורות כאחוז מבסיס ההון שהגדרת.<br>לדוגמה: ‎+$500 על בסיס $10,000 ⇒ ‎+5%.<br>פוזיציות פתוחות לא נכללות. |
| **English** | Your closed-trade P&L as a percentage of the capital base you set.<br>Example: +$500 on a $10,000 base ⇒ +5%.<br>Open positions are not included. |
| **Español** | Tu ganancia o pérdida total desde que empezaste, como porcentaje del capital inicial. La cifra principal de rendimiento, pero sin contexto de riesgo no cuenta toda la historia. |
| **Português** | O seu lucro ou prejuízo total desde que começou, como percentagem do capital inicial. O número principal de desempenho — mas sem contexto de risco não conta a história toda. |
| **العربية** | إجمالي ربحك أو خسارتك منذ البداية، كنسبة مئوية من رأس المال الابتدائي. الرقم الرئيسي للأداء — لكنه دون سياق المخاطرة لا يروي القصة كاملة. |

### `winStreak` — Current Streak · רצף נוכחי

| שפה | הסבר |
|---|---|
| **עברית** | מספר העסקאות הרווחיות ברציפות עד העסקה הסגורה האחרונה.<br>לדוגמה: 3 רווחים ברצף ⇒ 3; השורה מתחת מציגה את הרצף הטוב ביותר.<br>רצף הפסדים מוצג כ-0, לא כמספר שלילי. |
| **English** | The number of profitable trades in a row, up to your latest closed trade.<br>Example: 3 wins in a row ⇒ 3; the line below shows your best streak.<br>A losing streak shows as 0, not as a negative number. |
| **Español** | El número de operaciones ganadoras seguidas. Una racha ganadora genera confianza, pero también es el momento más peligroso para el exceso de confianza y un riesgo indisciplinado. |
| **Português** | O número de operações vencedoras seguidas. Uma sequência de vitórias gera confiança — mas também é o momento mais perigoso para o excesso de confiança e o risco indisciplinado. |
| **العربية** | عدد الصفقات الرابحة المتتالية. سلسلة الانتصارات تبني الثقة — لكنها أيضاً أخطر وقت للثقة المفرطة والمخاطرة غير المنضبطة. |

### `grade` — Monthly Grade · ציון חודשי

| שפה | הסבר |
|---|---|
| **עברית** | ציון A–F לחודש: 40% אחוז הצלחה, 30% R, 20% משמעת ו-10% עקביות.<br>לדוגמה: 72/100 ⇒ B (A מ-85 · B מ-70 · C מ-55 · D מ-40).<br>המשמעת נשענת על הסימון 'עקבתי אחרי התוכנית'. |
| **English** | An A–F grade for the month: 40% win rate, 30% R, 20% discipline, 10% consistency.<br>Example: 72/100 ⇒ B (A 85+ · B 70+ · C 55+ · D 40+).<br>Discipline is the self-reported 'followed my plan' flag. |
| **Español** | Una puntuación ponderada (A–F) que resume la calidad de tu trading del mes: una mezcla de tasa de aciertos, múltiplo R, disciplina y consistencia. Una instantánea rápida, no un sustituto de analizar los detalles. |
| **Português** | Uma pontuação ponderada (A–F) que resume a qualidade do seu trading no mês: uma mistura de taxa de acertos, múltiplo R, disciplina e consistência. Um retrato rápido — não substitui analisar os detalhes. |
| **العربية** | درجة مرجّحة (A–F) تلخّص جودة تداولك خلال الشهر: مزيج من نسبة النجاح ومضاعف R والانضباط والاتّساق. لقطة سريعة — لا تُغني عن التعمّق في التفاصيل. |

### `entryQuality` — Entry Quality · איכות כניסה

| שפה | הסבר |
|---|---|
| **עברית** | דירוג 1–5 כוכבים שנתת לכניסה: עד כמה העיתוי, המחיר והאישור תאמו לתוכנית.<br>לדוגמה: נכנסת במחיר שתכננת אחרי אישור ⇒ 5 כוכבים.<br>דירוג עצמי — לא נמדד מהמחירים. |
| **English** | A 1–5 star rating you gave your entry: how well timing, price and confirmation matched the plan.<br>Example: you entered at your planned price after confirmation ⇒ 5 stars.<br>Self-rated — not measured from prices. |
| **Español** | Una calificación (estrellas) de cuán bien tu entrada coincidió con el setup planificado: timing, precio y confirmación. Una calificación alta y constante indica disciplina, incluso cuando la operación pierde. |
| **Português** | Uma classificação (estrelas) de quão bem a sua entrada correspondeu ao setup planeado: timing, preço e confirmação. Uma classificação alta e constante indica disciplina — mesmo quando a operação perde. |
| **العربية** | تقييم (بالنجوم) لمدى مطابقة دخولك للنموذج المخطّط: التوقيت، والسعر، والتأكيد. التقييم العالي المتّسق يدل على الانضباط — حتى عندما تخسر الصفقة نفسها. |

### `accountEquity` — Account Equity · הון החשבון

| שפה | הסבר |
|---|---|
| **עברית** | בסיס ההון שהגדרת ועוד ה-P&L המצטבר מעסקאות סגורות ופתוחות.<br>לדוגמה: בסיס $10,000 ועוד ‎+$600 ⇒ $10,600.<br>הסיכון לעסקה מחושב מבסיס ההון הקבוע, לא מההון הנוכחי. |
| **English** | The capital base you set plus cumulative P&L from closed and open trades.<br>Example: a $10,000 base plus +$600 ⇒ $10,600.<br>Per-trade risk is sized from your fixed capital base, not current equity. |
| **Español** | The capital base you set plus cumulative P&L from closed and open trades.<br>Example: a $10,000 base plus +$600 ⇒ $10,600.<br>Per-trade risk is sized from your fixed capital base, not current equity. |
| **Português** | The capital base you set plus cumulative P&L from closed and open trades.<br>Example: a $10,000 base plus +$600 ⇒ $10,600.<br>Per-trade risk is sized from your fixed capital base, not current equity. |
| **العربية** | The capital base you set plus cumulative P&L from closed and open trades.<br>Example: a $10,000 base plus +$600 ⇒ $10,600.<br>Per-trade risk is sized from your fixed capital base, not current equity. |

## אנליטיקס — גרפים וכרטיסי תובנה

### `streakHistory` — Streak History · היסטוריית רצפים

| שפה | הסבר |
|---|---|
| **עברית** | רצפי הרווחים וההפסדים שלך לפי סדר הזמן, כל רצף כעמודה.<br>לדוגמה: 3 רווחים ואחריהם 2 הפסדים ⇒ שתי עמודות, 3 ו-2. |
| **English** | Your winning and losing streaks in time order, one bar per streak.<br>Example: 3 wins then 2 losses ⇒ two bars, 3 and 2. |
| **Español** | Un registro de tus rachas ganadoras y perdedoras a lo largo del tiempo. Revela patrones emocionales: ¿una racha perdedora te hace operar peor (tilt) o te recuperas con disciplina? |
| **Português** | Um registo das suas sequências de vitórias e derrotas ao longo do tempo. Revela padrões emocionais: uma sequência de perdas faz você operar pior (tilt), ou você recupera com disciplina? |
| **العربية** | سجلّ لسلاسل انتصاراتك وخسائرك عبر الزمن. يكشف الأنماط العاطفية: هل تجعلك سلسلة الخسائر تتداول بشكل أسوأ (tilt)، أم تتعافى بانضباط؟ |

### `dayOfWeek` — P&L by Day of Week · רווח/הפסד לפי יום בשבוע

| שפה | הסבר |
|---|---|
| **עברית** | ה-P&L המצטבר לפי היום בשבוע שבו נכנסת לעסקה.<br>לדוגמה: עסקה שנפתחה בשני ונסגרה ברביעי נספרת לשני. |
| **English** | Cumulative P&L by the weekday you entered the trade.<br>Example: a trade opened Monday and closed Wednesday counts for Monday. |
| **Español** | Tu ganancia/pérdida desglosada por día de la semana. Revela en qué días ganas o pierdes dinero de forma consistente — muchos traders tienen un edge oculto (o una fuga) ligado a días concretos como lunes o viernes. |
| **Português** | O teu lucro/perda discriminado por dia da semana. Revela em que dias ganhas ou perdes dinheiro de forma consistente — muitos traders têm um edge oculto (ou uma fuga) ligado a dias específicos como segundas ou sextas. |
| **العربية** | أرباحك/خسائرك موزّعة حسب أيام الأسبوع. تكشف في أي الأيام تربح أو تخسر باستمرار — كثير من المتداولين لديهم أفضلية خفية (أو تسريب) مرتبط بأيام محدّدة كالإثنين أو الجمعة. |

### `performanceBySetup` — Performance by Setup · ביצועים לפי סטאפ

| שפה | הסבר |
|---|---|
| **עברית** | כרטיס לכל סטאפ שסחרת: מספר עסקאות, אחוז הצלחה ו-R כולל.<br>לדוגמה: Breakout · 8 עסקאות · 50% · ‎+4R. |
| **English** | One card per setup you traded: trade count, win rate and total R.<br>Example: Breakout · 8 trades · 50% · +4R. |
| **Español** | Un desglose de cada setup que operas — win rate, R total y número de operaciones. Muestra de un vistazo qué setups sostienen tu cuenta y cuáles la drenan. Tus edges y anti-edges, lado a lado. |
| **Português** | Uma discriminação de cada setup que operas — win rate, R total e número de operações. Mostra num relance quais setups sustentam a tua conta e quais a drenam. Os teus edges e anti-edges, lado a lado. |
| **العربية** | تفصيل لكل setup تتداوله — نسبة الربح، إجمالي R، وعدد الصفقات. يُظهر بنظرة واحدة أي النماذج تحمل حسابك وأيّها يستنزفه. أفضلياتك وأنتي-أفضلياتك، جنباً إلى جنب. |

### `winRateBySetup` — Win Rate by Setup · אחוז הצלחה לפי סטאפ

| שפה | הסבר |
|---|---|
| **עברית** | גובה העמודה הוא אחוז ההצלחה של הסטאפ; המספר מעליה הוא מספר העסקאות.<br>לדוגמה: עמודה סגולה = 50% ומעלה, אפורה = מתחת ל-50%.<br>ממוין לפי מספר העסקאות. |
| **English** | Bar height is the setup's win rate; the number above it is the trade count.<br>Example: a purple bar = 50% or more, a gray bar = below 50%.<br>Sorted by trade count. |
| **Español** | Bar height is the setup's win rate; the number above it is the trade count.<br>Example: a purple bar = 50% or more, a gray bar = below 50%.<br>Sorted by trade count. |
| **Português** | Bar height is the setup's win rate; the number above it is the trade count.<br>Example: a purple bar = 50% or more, a gray bar = below 50%.<br>Sorted by trade count. |
| **العربية** | Bar height is the setup's win rate; the number above it is the trade count.<br>Example: a purple bar = 50% or more, a gray bar = below 50%.<br>Sorted by trade count. |

### `bestDay` — Best Day · היום הטוב ביותר

| שפה | הסבר |
|---|---|
| **עברית** | יום השבוע עם ה-P&L הכולל הגבוה ביותר, לפי יום הכניסה.<br>לדוגמה: שני ‎+$400, שלישי ‎+$150 ⇒ שני.<br>לא מתחשב במספר העסקאות. |
| **English** | The weekday with the highest total P&L, by entry day.<br>Example: Monday +$400, Tuesday +$150 ⇒ Monday.<br>Trade count is not taken into account. |
| **Español** | The weekday with the highest total P&L, by entry day.<br>Example: Monday +$400, Tuesday +$150 ⇒ Monday.<br>Trade count is not taken into account. |
| **Português** | The weekday with the highest total P&L, by entry day.<br>Example: Monday +$400, Tuesday +$150 ⇒ Monday.<br>Trade count is not taken into account. |
| **العربية** | The weekday with the highest total P&L, by entry day.<br>Example: Monday +$400, Tuesday +$150 ⇒ Monday.<br>Trade count is not taken into account. |

### `bestSetup` — Best Setup · הסטאפ הטוב ביותר

| שפה | הסבר |
|---|---|
| **עברית** | הסטאפ עם אחוז ההצלחה הגבוה ביותר; בתיקו — זה עם יותר עסקאות.<br>לדוגמה: Pullback ב-70% מ-10 עסקאות קודם ל-Breakout ב-60%.<br>אין סף מדגם: עסקה אחת ב-100% יכולה לזכות. Unknown לא נכלל. |
| **English** | The setup with the highest win rate; on a tie, the one with more trades.<br>Example: Pullback at 70% over 10 trades ranks above Breakout at 60%.<br>No minimum sample: one trade at 100% can win. Unknown is excluded. |
| **Español** | The setup with the highest win rate; on a tie, the one with more trades.<br>Example: Pullback at 70% over 10 trades ranks above Breakout at 60%.<br>No minimum sample: one trade at 100% can win. Unknown is excluded. |
| **Português** | The setup with the highest win rate; on a tie, the one with more trades.<br>Example: Pullback at 70% over 10 trades ranks above Breakout at 60%.<br>No minimum sample: one trade at 100% can win. Unknown is excluded. |
| **العربية** | The setup with the highest win rate; on a tie, the one with more trades.<br>Example: Pullback at 70% over 10 trades ranks above Breakout at 60%.<br>No minimum sample: one trade at 100% can win. Unknown is excluded. |

### `bestEmotion` — Best Emotion · הרגש הטוב ביותר

| שפה | הסבר |
|---|---|
| **עברית** | הרגש שסימנת בכניסה עם אחוז ההצלחה הגבוה ביותר; בתיקו — זה עם יותר עסקאות.<br>לדוגמה: Calm ב-65% קודם ל-Confident ב-55%.<br>אין סף מדגם. |
| **English** | The entry emotion you marked with the highest win rate; on a tie, the one with more trades.<br>Example: Calm at 65% ranks above Confident at 55%.<br>No minimum sample. |
| **Español** | The entry emotion you marked with the highest win rate; on a tie, the one with more trades.<br>Example: Calm at 65% ranks above Confident at 55%.<br>No minimum sample. |
| **Português** | The entry emotion you marked with the highest win rate; on a tie, the one with more trades.<br>Example: Calm at 65% ranks above Confident at 55%.<br>No minimum sample. |
| **العربية** | The entry emotion you marked with the highest win rate; on a tie, the one with more trades.<br>Example: Calm at 65% ranks above Confident at 55%.<br>No minimum sample. |

### `rDistribution` — R Distribution · התפלגות R

| שפה | הסבר |
|---|---|
| **עברית** | כמה עסקאות סגורות נפלו בכל טווח R, משמאל להפסד ועד ימין לרווח.<br>לדוגמה: עסקה של ‎+1.4R נספרת בטווח 1R עד 2R.<br>עסקאות בלי סטופ לא נספרות. |
| **English** | How many closed trades fell in each R range, losses left to wins right.<br>Example: a +1.4R trade counts in the 1R to 2R range.<br>Trades without a stop are not counted. |
| **Español** | How many closed trades fell into each R range, from losses on the left to wins on the right.<br>Example: a +1.4R trade counts in the 1R to 2R range.<br>Trades without a stop are not counted. |
| **Português** | How many closed trades fell into each R range, from losses on the left to wins on the right.<br>Example: a +1.4R trade counts in the 1R to 2R range.<br>Trades without a stop are not counted. |
| **العربية** | How many closed trades fell into each R range, from losses on the left to wins on the right.<br>Example: a +1.4R trade counts in the 1R to 2R range.<br>Trades without a stop are not counted. |

### `pnlByMonth` — P&L by Month · רווח/הפסד לפי חודש

| שפה | הסבר |
|---|---|
| **עברית** | סכום ה-P&L של העסקאות הסגורות לכל חודש, לפי תאריך הכניסה.<br>לדוגמה: במרץ ‎+$200, ‎−$50 ו-‎+$100 ⇒ ‎+$250.<br>עסקה שלא הומרה למטבע ההון לא נספרת. |
| **English** | The sum of closed-trade P&L for each month, by entry date.<br>Example: in March +$200, −$50 and +$100 ⇒ +$250.<br>A trade not converted to your capital currency is not counted. |
| **Español** | The sum of closed-trade P&L for each month, by trade date.<br>Example: in March +$200, −$50 and +$100 ⇒ +$250.<br>A trade not converted to your capital currency is not counted. |
| **Português** | The sum of closed-trade P&L for each month, by trade date.<br>Example: in March +$200, −$50 and +$100 ⇒ +$250.<br>A trade not converted to your capital currency is not counted. |
| **العربية** | The sum of closed-trade P&L for each month, by trade date.<br>Example: in March +$200, −$50 and +$100 ⇒ +$250.<br>A trade not converted to your capital currency is not counted. |

### `emotionPerformance` — Emotion Performance · ביצועים לפי רגש

| שפה | הסבר |
|---|---|
| **עברית** | סך ה-P&L של העסקאות הסגורות לפי הרגש שסימנת בכניסה.<br>לדוגמה: FOMO · 4 עסקאות · ‎−$300.<br>עסקה בלי רגש מסומן נספרת כ-Unknown. |
| **English** | Total closed-trade P&L by the emotion you marked at entry.<br>Example: FOMO · 4 trades · −$300.<br>A trade with no emotion marked counts as Unknown. |
| **Español** | Total closed-trade P&L by the emotion you marked at entry.<br>Example: FOMO · 4 trades · −$300.<br>A trade with no emotion marked counts as Unknown. |
| **Português** | Total closed-trade P&L by the emotion you marked at entry.<br>Example: FOMO · 4 trades · −$300.<br>A trade with no emotion marked counts as Unknown. |
| **العربية** | Total closed-trade P&L by the emotion you marked at entry.<br>Example: FOMO · 4 trades · −$300.<br>A trade with no emotion marked counts as Unknown. |

### `setupMatrix` — Setup Matrix · מטריצת סטאפים

| שפה | הסבר |
|---|---|
| **עברית** | טבלה לכל סטאפ: עסקאות, אחוז הצלחה, R ממוצע ו-P&L, ממוינת לפי P&L.<br>לדוגמה: Breakout · 8 · 50% · ‎+0.4R · ‎+$600. |
| **English** | A table per setup: trades, win rate, average R and P&L, sorted by P&L.<br>Example: Breakout · 8 · 50% · +0.4R · +$600. |
| **Español** | A table per setup: trades, win rate, average R and P&L, sorted by P&L.<br>Example: Breakout · 8 · 50% · +0.4R · +$600. |
| **Português** | A table per setup: trades, win rate, average R and P&L, sorted by P&L.<br>Example: Breakout · 8 · 50% · +0.4R · +$600. |
| **العربية** | A table per setup: trades, win rate, average R and P&L, sorted by P&L.<br>Example: Breakout · 8 · 50% · +0.4R · +$600. |

### `holdTimeVsPnl` — Hold Time vs P&L · זמן החזקה מול רווח

| שפה | הסבר |
|---|---|
| **עברית** | כל נקודה היא עסקה סגורה: ימי ההחזקה בציר אחד וה-P&L בציר השני.<br>לדוגמה: נקודה ב-5 ימים וב-‎+$300 = עסקה שהחזקת 5 ימים והרוויחה $300.<br>עסקה שלא הומרה למטבע ההון לא מוצגת. |
| **English** | Each dot is a closed trade: holding days against P&L.<br>Example: a dot at 5 days and +$300 = held 5 days, made $300.<br>Trades not converted to your capital currency are not shown. |
| **Español** | Each dot is a closed trade: holding days on one axis and P&L on the other.<br>Example: a dot at 5 days and +$300 = a trade you held 5 days that made $300.<br>A trade not converted to your capital currency is not shown. |
| **Português** | Each dot is a closed trade: holding days on one axis and P&L on the other.<br>Example: a dot at 5 days and +$300 = a trade you held 5 days that made $300.<br>A trade not converted to your capital currency is not shown. |
| **العربية** | Each dot is a closed trade: holding days on one axis and P&L on the other.<br>Example: a dot at 5 days and +$300 = a trade you held 5 days that made $300.<br>A trade not converted to your capital currency is not shown. |

## מדדים נוספים

### `rr` — Risk / Reward · סיכון / סיכוי · R/R

| שפה | הסבר |
|---|---|
| **עברית** | היחס בין הסיכון לרווח הפוטנציאלי, בכתיב סיכון:סיכוי.<br>לדוגמה: סטופ $2 מתחת לכניסה ויעד $6 מעליה ⇒ 1:3. |
| **English** | The ratio between your risk and the potential reward, written risk:reward.<br>Example: a stop $2 below entry and a target $6 above ⇒ 1:3. |
| **Español** | Riesgo/Beneficio. Beneficio potencial vs. lo que arriesgas. 3:1 = puedes ganar 3× lo que perderías. |
| **Português** | Risco/Retorno. Lucro potencial vs. o que arriscas. 3:1 = podes ganhar 3× o que perderias. |
| **العربية** | المخاطرة/العائد. الربح المحتمل مقابل ما تخاطر به. 3:1 = يمكنك ربح 3× ما قد تخسره. |

### `rMultiple` — R-Multiple

| שפה | הסבר |
|---|---|
| **עברית** | תוצאת העסקה ביחידות של הסיכון לפי הסטופ השמור, לפי הכיוון: LONG (יציאה − כניסה), SHORT (כניסה − יציאה).<br>לדוגמה: סיכנת $40 והרווחת $100 ⇒ ‎+2.5R.<br>פער פתיחה מעבר לסטופ יכול לתת הפסד גדול מ-‎−1R. |
| **English** | Your result in units of risk at the saved stop: LONG (Exit − Entry), SHORT (Entry − Exit).<br>Example: you risked $40 and made $100 ⇒ +2.5R.<br>An opening gap past the stop can lose more than −1R. |
| **Español** | R-Multiple = ganancia de la operación ÷ riesgo inicial. La ganancia sigue la dirección de la operación: en un LONG es (Salida − Entrada), en un SHORT es (Entrada − Salida) — así que un SHORT ganador siempre da un R positivo.<br><br>Ejemplos:<br>+2R = ganaste 2× lo que arriesgaste ✓<br>+1R = ganaste exactamente lo que arriesgaste ✓<br>-1R = perdiste tu riesgo planificado (normal)<br>-2R = el stop no se respetó (problema)<br><br>Seguir el R-Multiple elimina el sesgo del dólar y te permite comparar operaciones objetivamente. |
| **Português** | R-Multiple = lucro da operação ÷ risco inicial. O lucro segue a direção da operação: num LONG é (Saída − Entrada), num SHORT é (Entrada − Saída) — por isso um SHORT vencedor dá sempre um R positivo.<br><br>Exemplos:<br>+2R = ganhaste 2× o que arriscaste ✓<br>+1R = ganhaste exatamente o que arriscaste ✓<br>-1R = perdeste o teu risco planeado (normal)<br>-2R = o stop não foi respeitado (problema)<br><br>Acompanhar o R-Multiple elimina o viés do dólar e permite comparar operações objetivamente. |
| **العربية** | R-Multiple = ربح الصفقة ÷ المخاطرة الأوّلية. الربح يتبع اتّجاه الصفقة: في LONG هو (الخروج − الدخول)، وفي SHORT هو (الدخول − الخروج) — لذلك فإن SHORT الرابحة تعطي دائماً R موجباً.<br><br>أمثلة:<br>+2R = ربحت 2× ما خاطرت به ✓<br>+1R = ربحت تماماً ما خاطرت به ✓<br>-1R = خسرت مخاطرتك المخطّطة (طبيعي)<br>-2R = لم يُحترم وقف الخسارة (مشكلة)<br><br>تتبّع R-Multiple يزيل انحياز الدولار ويتيح لك مقارنة الصفقات موضوعياً. |

### `mfeMae` — MFE / MAE

| שפה | הסבר |
|---|---|
| **עברית** | כמה הלכה העסקה לטובתך (MFE) וכמה נגדך (MAE) לפני שנסגרה.<br>לדוגמה: נכנסת ב-$100, המחיר עלה ל-$106 וירד ל-$97 ⇒ MFE $6, MAE $3.<br>נמדד רק אם מילאת את השדות בעסקה. |
| **English** | How far a trade ran in your favor (MFE) and against you (MAE) before it closed.<br>Example: entry $100, high $106, low $97 ⇒ MFE $6, MAE $3.<br>Only if you filled in the fields. |
| **Español** | Cuán lejos llegó una operación a tu favor (MFE) y en tu contra (MAE) antes de cerrarse. Ayuda a afinar stops y objetivos. |
| **Português** | Quão longe uma operação foi a teu favor (MFE) e contra ti (MAE) antes de fechar. Ajuda a afinar stops e alvos. |
| **العربية** | إلى أي مدى تحرّكت الصفقة لصالحك (MFE) وضدّك (MAE) قبل إغلاقها. يساعد في ضبط أوامر الوقف والأهداف. |

### `wilson` — Wilson Score · ציון Wilson

| שפה | הסבר |
|---|---|
| **עברית** | הגבול התחתון של אחוז ההצלחה ה'אמיתי' ברמת ביטחון 95% — זהיר כשיש מעט עסקאות.<br>לדוגמה: 3 רווחים מ-3 = 100%, אבל הגבול התחתון כ-44%.<br>משמש לדירוג ה-Edge. |
| **English** | The lower bound of your 'true' win rate at 95% confidence — cautious when trades are few.<br>Example: 3 wins out of 3 = 100%, but the lower bound is about 44%.<br>Used to rank your Edge. |
| **Español** | Una estimación cautelosa de tu win rate "real" cuando el tamaño de muestra es pequeño. Evita que una racha corta te engañe. |
| **Português** | Uma estimativa cautelosa da tua win rate "real" quando o tamanho da amostra é pequeno. Evita que uma sequência curta te engane. |
| **العربية** | تقدير حذِر لنسبة ربحك "الحقيقية" عندما يكون حجم العيّنة صغيراً. يمنع سلسلة قصيرة ساخنة من خداعك. |

### `rrBucket3plus` — R/R 3+

| שפה | הסבר |
|---|---|
| **עברית** | עסקאות שהיחס המתוכנן שלהן, סטופ מול יעד, הוא 1:3 ומעלה.<br>לדוגמה: סטופ $1 מתחת לכניסה ויעד $3.50 מעליה ⇒ 1:3.5 ⇒ בקבוצה.<br>ביחס 1:3 מספיק 25% הצלחה כדי לא להפסיד, לפני עמלות. |
| **English** | Trades whose planned ratio, stop versus target, is 1:3 or more.<br>Example: a stop $1 below entry and a target $3.50 above ⇒ 1:3.5 ⇒ in the group.<br>At 1:3, a 25% win rate breaks even, before commissions. |
| **Español** | Un grupo de operaciones con una relación riesgo/beneficio de 3 o más: la recompensa potencial es al menos 3× el riesgo. Son las operaciones de mayor calidad por ratio: incluso con una tasa de aciertos baja, ganar una fracción basta para ser rentable. |
| **Português** | Um grupo de operações com uma relação risco/retorno de 3 ou mais: o retorno potencial é pelo menos 3× o risco. São as operações de maior qualidade por rácio: mesmo com uma taxa de acertos baixa, ganhar uma fração já basta para ser lucrativo. |
| **العربية** | مجموعة صفقات بنسبة مخاطرة/عائد تبلغ 3 أو أكثر: العائد المحتمل لا يقل عن 3 أضعاف المخاطرة. هذه أعلى الصفقات جودةً من حيث النسبة: حتى مع نسبة نجاح منخفضة، يكفي الربح في جزء منها لتحقيق الربحية. |

## מושגים / AI

### `dna` — Trading DNA · DNA מסחרי

| שפה | הסבר |
|---|---|
| **עברית** | ארבעה ציונים 0–100 — ניהול סיכון, משמעת, עקביות וצמיחה — מחושבים מהעסקאות הסגורות שלך.<br>לדוגמה: סיכון ממוצע של 2% לעסקה ⇒ ציון ניהול סיכון 50.<br>המשמעת נשענת על הסימון 'עקבתי אחרי התוכנית' — דיווח עצמי. |
| **English** | Four 0–100 scores — risk, discipline, consistency, growth — from your closed trades.<br>Example: 2% average risk per trade ⇒ risk score 50.<br>Discipline is the self-reported 'followed my plan' flag. |
| **Español** | Tu Trading DNA mide 4 dimensiones centrales de tu personalidad como trader:<br><br>• Gestión de Riesgo (0-100): Qué tan bien controlas las pérdidas<br>• Disciplina (0-100): ¿Sigues tus reglas?<br>• Consistencia (0-100): Resultados estables en distintas condiciones<br>• Crecimiento (0-100): ¿Estás mejorando con el tiempo?<br><br>Basado en tu historial real de operaciones — no en autoevaluación. |
| **Português** | O teu Trading DNA mede 4 dimensões centrais da tua personalidade como trader:<br><br>• Gestão de Risco (0-100): Quão bem controlas as perdas<br>• Disciplina (0-100): Segues as tuas regras?<br>• Consistência (0-100): Resultados estáveis em diferentes condições<br>• Crescimento (0-100): Estás a melhorar com o tempo?<br><br>Baseado no teu histórico real de operações — não em autoavaliação. |
| **العربية** | يقيس Trading DNA الخاص بك 4 أبعاد أساسية لشخصيتك كمتداول:<br><br>• إدارة المخاطر (0-100): مدى تحكّمك في الخسائر<br>• الانضباط (0-100): هل تتّبع قواعدك؟<br>• الاتّساق (0-100): نتائج مستقرّة عبر ظروف مختلفة<br>• النموّ (0-100): هل تتحسّن مع الوقت؟<br><br>مبني على سجلّ صفقاتك الحقيقي — لا على التقييم الذاتي. |

### `edge` — Edge

| שפה | הסבר |
|---|---|
| **עברית** | צירופי סטאפ ורגש שבהם אחוז ההצלחה וה-R שלך הכי חזקים, מדורגים לפי ציון Wilson.<br>לדוגמה: Breakout + Calm · 4 רווחיות מ-5 · R ממוצע ‎+1.2R.<br>דרושות 3 עסקאות לפחות; זה דירוג, לא מבחן מובהקות. |
| **English** | Setup-and-emotion pairs where your win rate and R are strongest, ranked by Wilson score.<br>Example: Breakout + Calm · 4 of 5 won · average +1.2R.<br>Needs 3+ trades; a ranking, not a significance test. |
| **Español** | Tu Edge — setups donde tienes una ventaja estadísticamente significativa según tu historial real de operaciones.<br><br>Alta win rate + R promedio positivo = edge real. Estos son los setups que más deberías operar. El mercado te paga por hacerlos. |
| **Português** | O teu Edge — setups onde tens uma vantagem estatisticamente significativa segundo o teu histórico real de operações.<br><br>Win rate alta + R médio positivo = edge real. Estes são os setups que mais deves operar. O mercado paga-te para os fazeres. |
| **العربية** | الـ Edge الخاص بك — نماذج دخول تملك فيها أفضلية ذات دلالة إحصائية بناءً على سجلّ صفقاتك الحقيقي.<br><br>نسبة ربح عالية + متوسّط R موجب = أفضلية حقيقية. هذه النماذج هي التي يجب أن تتداولها أكثر. السوق يدفع لك مقابل تنفيذها. |

### `antiEdge` — Anti-Edge

| שפה | הסבר |
|---|---|
| **עברית** | צירופי סטאפ ורגש שבהם אחוז ההצלחה שלך מתחת ל-50% או ה-R הממוצע שלילי.<br>לדוגמה: Breakout + FOMO · רווח אחד מ-4 · R ממוצע ‎−0.8R.<br>דרושות 2 עסקאות לפחות; מוצגים עד 5. |
| **English** | Setup-and-emotion pairs where your win rate is below 50% or your average R is negative.<br>Example: Breakout + FOMO · 1 win out of 4 · average R −0.8R.<br>Needs at least 2 trades; up to 5 are shown. |
| **Español** | Anti-Edge — setups donde pierdes dinero de forma consistente según tu historial de operaciones.<br><br>Win rate baja + R negativo = tu anti-edge personal. O corriges estos setups (estudia por qué te fallan) o dejas de operarlos por completo.<br><br>Evitar los anti-edges es tan importante como explotar los edges. |
| **Português** | Anti-Edge — setups onde perdes dinheiro de forma consistente segundo o teu histórico de operações.<br><br>Win rate baixa + R negativo = o teu anti-edge pessoal. Ou corriges estes setups (estuda por que te falham) ou deixas de os operar por completo.<br><br>Evitar os anti-edges é tão importante como explorar os edges. |
| **العربية** | Anti-Edge — نماذج دخول تخسر فيها المال باستمرار بناءً على سجلّ صفقاتك.<br><br>نسبة ربح منخفضة + R سالب = الأنتي-إيدج الشخصي لديك. إمّا أن تُصلح هذه النماذج (ادرس لماذا تفشل معك) أو تتوقّف عن تداولها نهائياً.<br><br>تجنّب الأنتي-إيدج لا يقلّ أهمية عن استغلال الإيدج. |

### `tilt` — Tilt

| שפה | הסבר |
|---|---|
| **עברית** | מצב רגשי שמוציא אותך מהכללים שלך — לרוב אחרי הפסדים — ומוביל למסחר נקמה.<br>לדוגמה: 3 הפסדים ברצף ⇒ Tilt Shield מתריע לפני העסקה הבאה.<br>כלל אצבע: הפסקה אחרי 2 הפסדים רצופים. |
| **English** | An emotional state that pushes you off your rules, usually after losses.<br>Example: 3 losses in a row ⇒ Tilt Shield warns before the next trade.<br>Rule of thumb: take a break after 2 consecutive losses. |
| **Español** | Tilt — estado emocional que te hace desviarte de tus reglas de trading.<br><br>Común tras: grandes pérdidas, perderte un gran movimiento, o una racha de ganancias que genera exceso de confianza.<br><br>Señales: aumentar el tamaño de posición, operar con más frecuencia, ignorar los stops.<br><br>Prevención: pausa obligatoria tras 2+ pérdidas consecutivas. |
| **Português** | Tilt — estado emocional que te faz desviar das tuas regras de trading.<br><br>Comum após: grandes perdas, perder um grande movimento, ou uma sequência de ganhos que gera excesso de confiança.<br><br>Sinais: aumentar o tamanho de posição, operar com mais frequência, ignorar os stops.<br><br>Prevenção: pausa obrigatória após 2+ perdas consecutivas. |
| **العربية** | Tilt — حالة عاطفية تجعلك تنحرف عن قواعد تداولك.<br><br>شائعة بعد: خسائر كبيرة، أو تفويت حركة كبيرة، أو سلسلة انتصارات تولّد ثقة مفرطة.<br><br>العلامات: زيادة حجم الصفقة، التداول بوتيرة أعلى، تجاهل أوامر الوقف.<br><br>الوقاية: استراحة إلزامية بعد خسارتين متتاليتين أو أكثر. |

### `marketRegime` — Market Regime · מצב שוק

| שפה | הסבר |
|---|---|
| **עברית** | סביבת השוק, נקראת מ-SPY/QQQ מול ממוצע 20 יום, מרוחב הסקטורים ומהתנודתיות.<br>לדוגמה: מחיר מעל ממוצע 20 יום עולה ורוב הסקטורים עולים ⇒ שוק עולה.<br>מבוסס מחירי שוק, לא העסקאות שלך. |
| **English** | The market environment, read from SPY/QQQ versus their 20-day average, sector breadth and volatility.<br>Example: price above a rising 20-day average with most sectors rising ⇒ Bull Trend.<br>Based on market prices, not your trades. |
| **Español** | Régimen de Mercado — el entorno de mercado actual, leído de la acción real del precio (no de tus operaciones). Se calcula con SPY/QQQ frente a su media de 20 días, el % de tendencia, cuántos ETF sectoriales suben (amplitud) y la volatilidad realizada.<br><br>• Tendencia Alcista: Tendencia al alza — precio por encima de una media de 20 días creciente con participación amplia. Favorece breakouts y pullbacks.<br>• Tendencia Bajista: Tendencia a la baja — precio por debajo de una media de 20 días decreciente, debilidad amplia. Favorece cortos o mantente al margen.<br>• Lateral/Rango: Sin tendencia neta — precio atrapado entre soporte y resistencia. Opera los extremos, evita breakouts.<br>• Alta Volatilidad: Dominan los fuertes vaivenes diarios. Reduce tamaño ~50% y amplía stops.<br>• Baja Volatilidad: Mercado tranquilo y comprimido — espera movimientos pequeños.<br><br>Muestra 'Datos insuficientes' cuando no hay suficiente historial de precios para clasificar. |
| **Português** | Regime de Mercado — o ambiente de mercado atual, lido da ação real do preço (não das tuas operações). Calculado a partir de SPY/QQQ face à média de 20 dias, % de tendência, quantos ETF setoriais sobem (amplitude) e volatilidade realizada.<br><br>• Tendência de Alta: Tendência de subida — preço acima de uma média de 20 dias ascendente com participação ampla. Favorece breakouts e pullbacks.<br>• Tendência de Baixa: Tendência de descida — preço abaixo de uma média de 20 dias descendente, fraqueza ampla. Favorece vendas ou fica de fora.<br>• Lateral/Range: Sem tendência líquida — preço preso entre suporte e resistência. Opera os extremos, evita breakouts.<br>• Alta Volatilidade: Dominam as fortes oscilações diárias. Reduz tamanho ~50% e amplia stops.<br>• Baixa Volatilidade: Mercado calmo e comprimido — espera movimentos pequenos.<br><br>Mostra 'Dados insuficientes' quando não há histórico de preços suficiente para classificar. |
| **العربية** | نظام السوق — بيئة السوق الحالية، تُقرأ من حركة السعر الحقيقية (وليس من صفقاتك). يُحسب من SPY/QQQ مقابل متوسّطها المتحرّك لـ20 يومًا، ونسبة الاتجاه، وكم قطاعًا يرتفع (اتساع السوق)، والتقلّب المحقَّق.<br><br>• اتجاه صاعد: اتجاه صعودي — السعر فوق متوسّط 20 يومًا صاعد بمشاركة واسعة. فضّل الاختراقات والتراجعات.<br>• اتجاه هابط: اتجاه هبوطي — السعر تحت متوسّط 20 يومًا هابط، ضعف واسع. فضّل البيع أو ابقَ جانبًا.<br>• عرضي/نطاق: لا اتجاه صافٍ — السعر محصور بين الدعم والمقاومة. تاجر عند الأطراف وتجنّب الاختراقات.<br>• تقلّب عالٍ: تسيطر التذبذبات اليومية الحادة. قلّل الحجم ~50% ووسّع أوامر الوقف.<br>• تقلّب منخفض: سوق هادئ ومضغوط — توقّع حركات صغيرة.<br><br>يعرض 'بيانات غير كافية' عند عدم توفّر تاريخ أسعار كافٍ للتصنيف. |

### `discipline` — Discipline · משמעת

| שפה | הסבר |
|---|---|
| **עברית** | אחוז העסקאות הסגורות שסימנת בהן 'עקבתי אחרי התוכנית'.<br>לדוגמה: סימנת 'כן' ב-8 מתוך 10 ⇒ 80.<br>דיווח עצמי; עסקה שלא סומנה לא נספרת. |
| **English** | The share of your closed trades you marked 'followed my plan'.<br>Example: you marked 'yes' on 8 of 10 ⇒ 80.<br>Self-reported; an unmarked trade is not counted. |
| **Español** | Si seguiste tu plan — stop, tamaño, objetivo — sin desviación emocional. El núcleo de la rentabilidad a largo plazo. |
| **Português** | Se seguiste o teu plano — stop, tamanho, alvo — sem desvio emocional. O núcleo da rentabilidade a longo prazo. |
| **العربية** | ما إذا كنت اتّبعت خطّتك — وقف الخسارة، الحجم، الهدف — دون انحراف عاطفي. جوهر الربحية على المدى الطويل. |

### `dnaRisk` — Risk management · ניהול סיכון

| שפה | הסבר |
|---|---|
| **עברית** | ציון 0–100 לפי הסיכון הממוצע לעסקה, כאחוז מההון בעת הכניסה.<br>לדוגמה: 1% ומטה ⇒ 100 · 2% ⇒ 50 · 3% ומעלה ⇒ 0.<br>לא מודד אם כיבדת את הסטופ. |
| **English** | A 0–100 score from your average risk per trade as a percentage of capital.<br>Example: 1% or less ⇒ 100 · 2% ⇒ 50 · 3%+ ⇒ 0.<br>Does not measure whether you honored the stop. |
| **Español** | Mide cuán consistente eres gestionando el riesgo: tamaño de posición uniforme, respetar los stops y no superar el riesgo planificado por operación. Una puntuación baja significa riesgo inconsistente, la mayor amenaza para una cuenta. |
| **Português** | Mede o quão consistente você é na gestão de risco: tamanho de posição uniforme, respeitar os stops e não exceder o risco planeado por operação. Uma pontuação baixa significa risco inconsistente — a maior ameaça a uma conta. |
| **العربية** | يقيس مدى اتّساقك في إدارة المخاطر: حجم صفقة موحّد، واحترام أوامر وقف الخسارة، وعدم تجاوز المخاطرة المخطّطة لكل صفقة. الدرجة المنخفضة تعني مخاطرة غير متّسقة — وهي أكبر تهديد للحساب. |

### `dnaConsistency` — Consistency · עקביות

| שפה | הסבר |
|---|---|
| **עברית** | ציון 0–100 לפי פיזור תוצאות ה-R שלך: פיזור קטן = ציון גבוה.<br>לדוגמה: סטיית תקן 0R ⇒ 100 · 1.5R ⇒ 50 · 3R ומעלה ⇒ 0.<br>דרושות 2 עסקאות עם R לפחות. |
| **English** | A 0–100 score from the spread of your R outcomes; less spread scores higher.<br>Example: standard deviation 0R ⇒ 100 · 1.5R ⇒ 50 · 3R+ ⇒ 0.<br>Needs 2+ trades with an R. |
| **Español** | Mide la estabilidad de tu rendimiento a lo largo del tiempo: si los resultados son uniformes o dependen de unas pocas operaciones enormes. Alta consistencia es un método fiable; baja, resultados aleatorios. |
| **Português** | Mede a estabilidade do seu desempenho ao longo do tempo: se os resultados são uniformes ou dependem de poucas operações enormes. Alta consistência é um método confiável; baixa, resultados aleatórios. |
| **العربية** | يقيس استقرار أدائك عبر الزمن: هل النتائج متّسقة أم تعتمد على عدد قليل من الصفقات الضخمة. الاتّساق العالي يعني منهجاً يمكن الاعتماد عليه؛ والمنخفض يعني نتائج عشوائية. |

### `dnaGrowth` — Growth · צמיחה

| שפה | הסבר |
|---|---|
| **עברית** | ציון 0–100 לפי שיפוע ה-R המצטבר ב-20 העסקאות הסגורות האחרונות; 50 = שטוח.<br>לדוגמה: R מצטבר שעולה בכ-‎+0.5R לעסקה ⇒ כ-75.<br>מעל ‎+1R לעסקה ⇒ 100; מתחת ל-‎−1R ⇒ 0. |
| **English** | A 0–100 score from the slope of cumulative R over your last 20 closed trades; 50 = flat.<br>Example: cumulative R rising about +0.5R per trade ⇒ about 75.<br>Above +1R per trade ⇒ 100; below −1R ⇒ 0. |
| **Español** | Mide tu tendencia de mejora: si aprendes de los datos y mejoras con el tiempo, o repites los mismos errores. Una puntuación creciente es la curva correcta para un trader en desarrollo. |
| **Português** | Mede a sua tendência de melhoria: se aprende com os dados e melhora ao longo do tempo, ou repete os mesmos erros. Uma pontuação crescente é a curva certa para um trader em desenvolvimento. |
| **العربية** | يقيس اتجاه تحسّنك: هل تتعلّم من البيانات وتتحسّن مع الوقت، أم تكرّر الأخطاء نفسها. الدرجة المتصاعدة هي المنحنى الصحيح للمتداول الذي يتطوّر. |

### `setup` — Setup · סטאפ (Setup)

| שפה | הסבר |
|---|---|
| **עברית** | תבנית הכניסה לעסקה — התנאים המדויקים שבהם נכנסת לפוזיציה.<br>לדוגמה: Breakout, Pullback או Bull Flag. |
| **English** | Your entry pattern — the exact conditions under which you take a position.<br>Example: Breakout, Pullback or Bull Flag. |
| **Español** | Your entry pattern — the exact conditions under which you take a position.<br>Example: Breakout, Pullback or Bull Flag. |
| **Português** | Your entry pattern — the exact conditions under which you take a position.<br>Example: Breakout, Pullback or Bull Flag. |
| **العربية** | Your entry pattern — the exact conditions under which you take a position.<br>Example: Breakout, Pullback or Bull Flag. |

## ניהול סיכון

### `riskPerTrade` — Risk per Trade · סיכון לעסקה

| שפה | הסבר |
|---|---|
| **עברית** | כמה אחוזים מההון קבעת שתפסיד בעסקה אחת אם הסטופ נפגע.<br>לדוגמה: הון $10,000 וסיכון 1% ⇒ הפסד מקסימלי $100.<br>כלל אצבע: עד 2% לעסקה (Elder). |
| **English** | The percentage of capital you chose to lose on one trade if the stop is hit.<br>Example: $10,000 capital and 1% risk ⇒ a $100 maximum loss.<br>Rule of thumb: up to 2% per trade (Elder). |
| **Español** | Riesgo máximo por operación como % del total de la cuenta.<br><br>Estándar profesional:<br>• 1% por operación = conservador, sostenible<br>• 2% por operación = moderado, aún aceptable<br>• 5%+ por operación = territorio de apuestas<br><br>El 'riesgo de ruina' aumenta exponencialmente por encima del 2% por operación. |
| **Português** | Risco máximo por operação como % do total da conta.<br><br>Padrão profissional:<br>• 1% por operação = conservador, sustentável<br>• 2% por operação = moderado, ainda aceitável<br>• 5%+ por operação = território de apostas<br><br>O 'risco de ruína' aumenta exponencialmente acima de 2% por operação. |
| **العربية** | أقصى مخاطرة لكل صفقة كنسبة % من إجمالي الحساب.<br><br>المعيار الاحترافي:<br>• 1% لكل صفقة = متحفّظ، مستدام<br>• 2% لكل صفقة = معتدل، لا يزال مقبولاً<br>• 5%+ لكل صفقة = منطقة مقامرة<br><br>'مخاطر الإفلاس' ترتفع أُسّياً فوق 2% لكل صفقة. |

### `riskLimits` — Risk Limits · תקרות סיכון

| שפה | הסבר |
|---|---|
| **עברית** | שתי תקרות: הסיכון לעסקה שבחרת, ותקרה לכל הפוזיציות הפתוחות — פי 2, בין 3% ל-5%.<br>לדוגמה: 1% ⇒ 3% · 2% ⇒ 4% · 3% ⇒ 5%.<br>התקרה ÷ סיכון לעסקה = פוזיציות מלאות במקביל. |
| **English** | Your per-trade risk, plus a cap on all open positions: 2× it, between 3% and 5%.<br>Example: 1% ⇒ 3% · 2% ⇒ 4% · 3% ⇒ 5%.<br>Cap ÷ per-trade risk = how many full-size positions fit at once. |
| **Español** | Dos límites funcionan juntos:<br><br>• Riesgo/Operación — lo máximo que arriesgas en una sola posición. Tú lo eliges en Ajustes.<br>• Riesgo Máximo Permitido — lo máximo que arriesgas en TODAS las posiciones abiertas combinadas. Se deriva del Riesgo/Operación: el doble, nunca por debajo del 3% ni por encima del 5%.<br><br>Divide el Riesgo Máximo Permitido entre el Riesgo/Operación para saber cuántas posiciones de tamaño completo puedes mantener a la vez. |
| **Português** | Dois limites funcionam juntos:<br><br>• Risco/Operação — o máximo que arriscas numa única posição. És tu que o escolhes nas Definições.<br>• Risco Máximo Permitido — o máximo que arriscas em TODAS as posições abertas combinadas. É derivado do Risco/Operação: o dobro, nunca abaixo de 3% nem acima de 5%.<br><br>Divide o Risco Máximo Permitido pelo Risco/Operação para saberes quantas posições de tamanho completo podes manter ao mesmo tempo. |
| **العربية** | حدّان يعملان معاً:<br><br>• المخاطرة/الصفقة — أقصى ما تخاطر به في صفقة واحدة. أنت تختارها من الإعدادات.<br>• أقصى مخاطرة مسموحة — أقصى ما تخاطر به في جميع المراكز المفتوحة مجتمعةً. تُشتقّ من المخاطرة/الصفقة: ضعفها، لا تقلّ عن 3% ولا تزيد عن 5%.<br><br>اقسم أقصى مخاطرة مسموحة على المخاطرة/الصفقة لتعرف كم مركزاً بحجم كامل يمكنك الاحتفاظ به في آنٍ واحد. |

### `positionSize` — Position Size · גודל פוזיציה

| שפה | הסבר |
|---|---|
| **עברית** | מספר המניות = (הון × אחוז סיכון) ÷ המרחק בין הכניסה לסטופ.<br>לדוגמה: $10,000 × 1% = $100; כניסה $100 וסטופ $97 ⇒ 33 מניות.<br>תמיד מעוגל כלפי מטה. |
| **English** | Shares = (capital × risk %) ÷ the distance between entry and stop.<br>Example: $10,000 × 1% = $100; entry $100 and stop $97 ⇒ 33 shares.<br>Always rounded down. |
| **Español** | Tamaño de Posición = (Tamaño de Cuenta × % Riesgo) ÷ (Entrada − Stop Loss)<br><br>Ejemplo: cuenta de $10,000, 1% de riesgo, entrada $100, stop $97:<br>Posición = $100 ÷ $3 = 33 acciones<br><br>Calcula siempre antes de entrar. Nunca dimensiones por intuición. |
| **Português** | Tamanho de Posição = (Tamanho da Conta × % Risco) ÷ (Entrada − Stop Loss)<br><br>Exemplo: conta de $10,000, 1% de risco, entrada $100, stop $97:<br>Posição = $100 ÷ $3 = 33 ações<br><br>Calcula sempre antes de entrar. Nunca dimensiones por intuição. |
| **العربية** | حجم الصفقة = (حجم الحساب × % المخاطرة) ÷ (الدخول − وقف الخسارة)<br><br>مثال: حساب $10,000، مخاطرة 1%، دخول $100، وقف $97:<br>الصفقة = $100 ÷ $3 = 33 سهماً<br><br>احسب دائماً قبل الدخول. لا تحدّد الحجم بالإحساس أبداً. |

### `stopLoss` — Stop Loss · סטופ לוס

| שפה | הסבר |
|---|---|
| **עברית** | המחיר שקבעת מראש ליציאה מעסקה מפסידה, כדי להגביל את ההפסד לסיכון שתכננת.<br>לדוגמה: LONG בכניסה $50 וסטופ מתחת לתמיכה ב-$48 ⇒ סיכון $2 למניה.<br>ה-R וגודל הפוזיציה מחושבים מהסטופ השמור בעסקה. |
| **English** | The price you set in advance to exit a losing trade, capping the loss at your plan.<br>Example: LONG at $50, stop below support at $48 ⇒ $2 risk per share.<br>R and position size use the saved stop. |
| **Español** | Stop Loss — el nivel de precio donde sales de una operación perdedora para evitar pérdidas mayores.<br><br>Colócalo en un nivel técnico lógico:<br>• Por debajo de un soporte clave (operaciones largas)<br>• Por encima de una resistencia clave (operaciones cortas)<br>• Nunca arbitrario (p. ej., 'solo $0.50 bajo la entrada')<br><br>Un stop loss no es opcional — es la base de la gestión del riesgo. |
| **Português** | Stop Loss — o nível de preço onde sais de uma operação perdedora para evitar perdas maiores.<br><br>Coloca-o num nível técnico lógico:<br>• Abaixo de um suporte chave (operações compradas)<br>• Acima de uma resistência chave (operações vendidas)<br>• Nunca arbitrário (ex.: 'só $0.50 abaixo da entrada')<br><br>Um stop loss não é opcional — é a base da gestão de risco. |
| **العربية** | Stop Loss — مستوى السعر الذي تخرج عنده من صفقة خاسرة لتفادي خسائر أكبر.<br><br>ضعه عند مستوى فنّي منطقي:<br>• أسفل دعم رئيسي (صفقات الشراء)<br>• أعلى مقاومة رئيسية (صفقات البيع)<br>• ليس عشوائياً أبداً (مثلاً 'فقط $0.50 تحت الدخول')<br><br>وقف الخسارة ليس اختيارياً — إنه أساس إدارة المخاطر. |

### `takeProfit` — Take Profit

| שפה | הסבר |
|---|---|
| **עברית** | מחיר היעד שקבעת לסגירת עסקה מנצחת.<br>לדוגמה: כניסה $100 וסטופ $98 ⇒ יעד ברירת המחדל $104 (1:2).<br>ברירת המחדל בגרף ובמאמן היא 1:2. |
| **English** | The target price you set to close a winning trade.<br>Example: entry $100 and stop $98 ⇒ a default target of $104 (1:2).<br>The default on the chart and in the coach is 1:2. |
| **Español** | Take Profit — tu precio objetivo para salir de una operación ganadora.<br><br>Regla mínima: El objetivo debe ser al menos 1.5× tu riesgo (1.5R).<br><br>Buena práctica:<br>• Salida escalonada: toma 50% en 1R, mantén el resto hasta el objetivo<br>• Usa niveles técnicos (resistencia, máximos previos)<br>• Nunca muevas el objetivo más abajo cuando vas ganando |
| **Português** | Take Profit — o teu preço-alvo para sair de uma operação vencedora.<br><br>Regra mínima: O alvo deve ser pelo menos 1.5× o teu risco (1.5R).<br><br>Boa prática:<br>• Saída escalonada: tira 50% em 1R, mantém o resto até ao alvo<br>• Usa níveis técnicos (resistência, máximos anteriores)<br>• Nunca movas o alvo para baixo quando estás a ganhar |
| **العربية** | Take Profit — السعر المستهدف للخروج من صفقة رابحة.<br><br>القاعدة الدنيا: يجب أن يكون الهدف 1.5× مخاطرتك على الأقل (1.5R).<br><br>أفضل ممارسة:<br>• خروج تدريجي: خذ 50% عند 1R، واحتفظ بالباقي حتى الهدف<br>• استخدم مستويات فنّية (مقاومة، قمم سابقة)<br>• لا تحرّك الهدف للأسفل أبداً وأنت رابح |

## סטאפים

### `breakout` — Breakout

| שפה | הסבר |
|---|---|
| **עברית** | כניסה כשהמחיר פורץ מעל רמת התנגדות מרכזית, רצוי במחזור מסחר עולה.<br>לדוגמה: התנגדות ב-$50 ונר יומי שנסגר ב-$51 במחזור מסחר כפול מהממוצע. |
| **English** | Entering when price breaks above a key resistance level, ideally on rising volume.<br>Example: resistance at $50 and a daily close at $51 on twice the average volume. |
| **Español** | Precio rompiendo por encima de un nivel de resistencia clave con volumen. Funciona mejor en mercados con tendencia. |
| **Português** | Preço rompendo acima de um nível de resistência chave com volume. Funciona melhor em mercados com tendência. |
| **العربية** | السعر يخترق فوق مستوى مقاومة رئيسي مع حجم تداول. يعمل بأفضل شكل في الأسواق ذات الاتجاه. |

### `pullback` — Pullback

| שפה | הסבר |
|---|---|
| **עברית** | כניסה כשמחיר במגמת עלייה נסוג לתמיכה ואז ממשיך לעלות.<br>לדוגמה: עלייה מ-$40 ל-$50, נסיגה לממוצע הנע ב-$46 וכניסה שם. |
| **English** | Entering when an uptrending price pulls back to support and then resumes higher.<br>Example: a run from $40 to $50, a pullback to the moving average at $46, entry there. |
| **Español** | Comprar cuando un precio en tendencia alcista retrocede temporalmente hacia un soporte —una media móvil, un nivel de ruptura previo o una línea de tendencia— y luego retoma el alza. Entrar en el retroceso da mejor precio y un stop más ajustado que perseguir. |
| **Português** | Comprar quando um preço em tendência de alta recua temporariamente em direção a um suporte — uma média móvel, um nível de rompimento anterior ou uma linha de tendência — e depois retoma a alta. Entrar no recuo dá melhor preço e um stop mais apertado do que perseguir. |
| **العربية** | الشراء عندما يتراجع سعر في اتجاه صاعد مؤقتاً نحو دعم — متوسط متحرك، أو مستوى اختراق سابق، أو خط اتجاه — ثم يستأنف صعوده. الدخول عند التراجع يمنح سعراً أفضل ووقف خسارة أضيق من المطاردة. |

### `bullFlag` — Bull Flag

| שפה | הסבר |
|---|---|
| **עברית** | התכנסות צרה, יורדת קלות, אחרי עלייה חדה — במחזור מסחר מצטמצם.<br>לדוגמה: עלייה מ-$20 ל-$26, ואז 5 ימים בטווח $25–$26. |
| **English** | A tight, slightly falling consolidation after a sharp rise, on shrinking volume.<br>Example: a rise from $20 to $26, then 5 days in a $25–$26 range. |
| **Español** | Consolidación estrecha tras un movimiento brusco al alza. El volumen debe contraerse durante la bandera. |
| **Português** | Consolidação estreita após um movimento brusco de alta. O volume deve contrair durante a bandeira. |
| **العربية** | تماسك ضيّق بعد حركة صعودية حادّة. يجب أن ينكمش حجم التداول أثناء تكوّن العلم. |

### `ORBBreakout` — ORB Breakout

| שפה | הסבר |
|---|---|
| **עברית** | פריצת השיא או השפל של הדקות הראשונות של המסחר — 5, 15 או 30 דקות.<br>לדוגמה: טווח 15 הדקות הראשונות $30–$31 ⇒ כניסה מעל $31. |
| **English** | A break of the high or low of the first 5, 15 or 30 minutes of trading.<br>Example: a first-15-minute range of $30–$31 ⇒ entry above $31. |
| **Español** | Opening Range Breakout — ruptura del máximo/mínimo de los primeros 15-30 min. Fuerte en días de tendencia. |
| **Português** | Opening Range Breakout — rompimento da máxima/mínima dos primeiros 15-30 min. Forte em dias de tendência. |
| **العربية** | Opening Range Breakout — اختراق قمة/قاع أول 15-30 دقيقة. قوي في أيام الاتجاه. |

### `VWAPReclaim` — VWAP Reclaim

| שפה | הסבר |
|---|---|
| **עברית** | המחיר חוזר מעל ה-VWAP — הממוצע המשוקלל במחזור המסחר של היום — אחרי שירד מתחתיו.<br>לדוגמה: VWAP ב-$40, ירידה ל-$39.50 וחזרה מעל $40 במחזור מסחר. |
| **English** | Price reclaims VWAP — the day's volume-weighted average price — after dipping below it.<br>Example: VWAP at $40, a dip to $39.50, then back above $40 on volume. |
| **Español** | El precio recupera el VWAP tras una caída matinal con volumen. Indica compra institucional. |
| **Português** | O preço recupera o VWAP após uma queda matinal com volume. Indica compra institucional. |
| **العربية** | السعر يستعيد الـ VWAP بعد هبوط صباحي مع حجم تداول. يشير إلى شراء مؤسّسي. |

### `higherLow` — Higher Low

| שפה | הסבר |
|---|---|
| **עברית** | כל תיקון נעצר מעל השפל הקודם — הסימן של מגמת עלייה.<br>לדוגמה: שפלים ב-$45, ואז $47, ואז $49. |
| **English** | Each pullback stops above the previous low — the mark of an uptrend.<br>Example: lows at $45, then $47, then $49. |
| **Español** | Cada retroceso forma un mínimo más alto que el anterior. El setup más limpio en tendencia alcista. |
| **Português** | Cada recuo forma um mínimo mais alto que o anterior. O setup mais limpo em tendência de alta. |
| **العربية** | كل تراجع يصنع قاعاً أعلى من السابق. أنظف نموذج في الاتجاه الصاعد. |

### `cupAndHandle` — Cup & Handle

| שפה | הסבר |
|---|---|
| **עברית** | התבססות בצורת U, ואחריה ירידה קצרה ורדודה (ידית) לפני פריצה.<br>לדוגמה: ירידה מ-$60 ל-$48, חזרה ל-$59, ידית עד $56 ופריצה מעל $59. |
| **English** | A U-shaped base followed by a short, shallow dip (the handle) before a breakout.<br>Example: a fall from $60 to $48, back to $59, a handle down to $56, a break above $59. |
| **Español** | Consolidación en forma de U con un asa estrecha a la derecha. Patrón de continuación clásico. |
| **Português** | Consolidação em forma de U com uma alça estreita à direita. Padrão de continuação clássico. |
| **العربية** | تماسك على شكل حرف U مع مقبض ضيّق على اليمين. نموذج استمرار كلاسيكي. |

### `failedBreakout` — Failed Breakout

| שפה | הסבר |
|---|---|
| **עברית** | פריצה שחוזרת מהר מתחת לרמה שנפרצה — מלכודת לקונים מאוחרים.<br>לדוגמה: פריצה ל-$51 מעל $50, ותוך יום חזרה ל-$49 ⇒ SHORT. |
| **English** | A breakout that quickly falls back below the broken level — a trap for late buyers.<br>Example: a break to $51 above $50, back to $49 within a day ⇒ SHORT. |
| **Español** | Ruptura que se revierte rápidamente. Trampa para compradores tardíos — corto al recuperar el nivel de ruptura. |
| **Português** | Rompimento que se reverte rapidamente. Armadilha para compradores atrasados — vendido ao recuperar o nível de rompimento. |
| **العربية** | اختراق ينعكس بسرعة. فخّ للمشترين المتأخّرين — بيع عند العودة تحت مستوى الاختراق. |

### `overextendedFade` — Overextended Fade

| שפה | הסבר |
|---|---|
| **עברית** | עסקה נגד המגמה כשהמחיר רחוק באופן חריג מעל ה-20 EMA.<br>לדוגמה: מניה ב-$60 כשה-20 EMA ב-$52 ⇒ SHORT לכיוון הממוצע.<br>אין במערכת סף ל'רחוק' — הוא שלך. |
| **English** | A counter-trend trade when price is unusually far above the 20 EMA.<br>Example: a stock at $60 with the 20 EMA at $52 ⇒ SHORT toward the average.<br>The app sets no threshold for 'far' — it is yours. |
| **Español** | Operación contra-tendencia cuando el precio está 8%+ sobre la 20 EMA con RSI alto. Requiere paciencia. |
| **Português** | Operação contra-tendência quando o preço está 8%+ acima da 20 EMA com RSI alto. Exige paciência. |
| **العربية** | صفقة عكس الاتجاه عندما يكون السعر أعلى بـ 8%+ من الـ 20 EMA مع RSI مرتفع. تتطلّب صبراً. |

### `EMABounce50` — 50 EMA Bounce

| שפה | הסבר |
|---|---|
| **עברית** | תיקון לממוצע הנע האקספוננציאלי של 50 יום בגרף יומי, וקפיצה ממנו.<br>לדוגמה: 50 EMA ב-$80, שפל יומי $80.20 וסגירה ב-$82. |
| **English** | A pullback to the 50-day exponential moving average on a daily chart, and a bounce off it.<br>Example: 50 EMA at $80, a daily low of $80.20 and a close at $82. |
| **Español** | Retroceso a la 50 EMA en gráfico diario. Soporte importante en tendencias alcistas fuertes. |
| **Português** | Recuo à 50 EMA no gráfico diário. Suporte importante em tendências de alta fortes. |
| **العربية** | تراجع إلى الـ 50 EMA على الرسم اليومي. دعم مهم في الاتجاهات الصاعدة القوية. |

### `trendContinuation` — Trend Continuation

| שפה | הסבר |
|---|---|
| **עברית** | כניסה בתיקון רדוד ל-9 EMA בתוך מגמה קיימת.<br>לדוגמה: נסיגה ל-9 EMA ב-$30.10, כניסה ב-$30.30 וסטופ ב-$29.80. |
| **English** | Entering on a shallow pullback to the 9 EMA within an established trend.<br>Example: a pullback to the 9 EMA at $30.10, entry at $30.30, stop at $29.80. |
| **Español** | Entrada en un retroceso superficial a la 9 EMA en una tendencia establecida. Stops ajustados, R alto. |
| **Português** | Entrada num recuo superficial à 9 EMA numa tendência estabelecida. Stops apertados, R alto. |
| **العربية** | الدخول عند تراجع سطحي إلى الـ 9 EMA في اتجاه راسخ. أوامر وقف ضيّقة، R مرتفع. |

### `gapAndGo` — Gap & Go

| שפה | הסבר |
|---|---|
| **עברית** | מניה שפתחה בפער כלפי מעלה וממשיכה לעלות בלי לסגור את הפער.<br>לדוגמה: סגירה ב-$20, פתיחה ב-$22 ושיא יומי $24 בלי לרדת מתחת ל-$22. |
| **English** | A stock that gaps up at the open and keeps rising without filling the gap.<br>Example: a $20 close, a $22 open and a $24 high without trading below $22. |
| **Español** | La acción abre con hueco al alza y continúa sin rellenarlo. Mejor con un catalizador de noticias. |
| **Português** | A ação abre com gap de alta e continua sem preenchê-lo. Melhor com um catalisador de notícias. |
| **العربية** | يفتح السهم بفجوة صعودية ويواصل دون ملئها. أفضل مع محفّز إخباري. |

### `earningsGapPlay` — Earnings Gap Play

| שפה | הסבר |
|---|---|
| **עברית** | מסחר בכיוון הפער שנפתח אחרי דוח רבעוני — למעלה או למטה.<br>לדוגמה: פער ‎+6% ⇒ LONG מעל שיא הפתיחה; פער ‎−6% ⇒ SHORT מתחת לשפל הפתיחה. |
| **English** | Trading in the direction of the gap that opens after an earnings report — up or down.<br>Example: a +6% gap ⇒ LONG above the opening high; a −6% gap ⇒ SHORT below the opening low. |
| **Español** | Operar la reacción del hueco tras resultados. Mantén las ganadoras, cubre a la primera señal de compra. |
| **Português** | Operar a reação do gap após resultados. Mantenha as vencedoras, cubra ao primeiro sinal de compra. |
| **العربية** | تداول رد فعل الفجوة بعد نتائج الأرباح. احتفظ بالرابحة، وأغلق عند أول إشارة شراء. |

### `rangeBreakout` — Range Breakout

| שפה | הסבר |
|---|---|
| **עברית** | יציאה מטווח מחירים שנמשך ימים או שבועות.<br>לדוגמה: 3 שבועות בין $40 ל-$44, ואז סגירה ב-$45. |
| **English** | A break out of a price range that lasted days or weeks.<br>Example: 3 weeks between $40 and $44, then a close at $45. |
| **Español** | El precio rompe un rango de varios días/semanas. Más fiable cuando el volumen se expande. |
| **Português** | O preço rompe um range de vários dias/semanas. Mais confiável quando o volume se expande. |
| **العربية** | السعر يكسر نطاقاً امتدّ أياماً/أسابيع. أكثر موثوقية عندما يتوسّع حجم التداول. |

### `postEarningsStrength` — Post-Earnings Strength

| שפה | הסבר |
|---|---|
| **עברית** | מניה שמחזיקה מעל פער עלייה בימים שאחרי דוח חיובי.<br>לדוגמה: פער מ-$50 ל-$56, ו-5 ימים מעל $55. |
| **English** | A stock that holds above an upside gap in the days after a strong report.<br>Example: a gap from $50 to $56, then 5 days above $55. |
| **Español** | La acción se mantiene sobre el hueco alcista tras superar resultados. Señal de acumulación institucional. |
| **Português** | A ação mantém-se acima do gap de alta após superar resultados. Sinal de acumulação institucional. |
| **العربية** | يحافظ السهم على البقاء فوق الفجوة الصعودية بعد تجاوز التوقّعات. إشارة تجميع مؤسّسي. |

### `powerHourBreak` — Power Hour Break

| שפה | הסבר |
|---|---|
| **עברית** | פריצה בשעת המסחר האחרונה, 15:00–16:00 לפי שעון ניו יורק (בדרך כלל 22:00–23:00 שעון ישראל).<br>לדוגמה: שיא יומי $70 נפרץ ב-15:20 ⇒ כניסה ב-$70.10. |
| **English** | A breakout in the last trading hour, 3–4 pm New York time.<br>Example: a $70 daily high broken at 3:20 pm ⇒ entry at $70.10. |
| **Español** | Ruptura en la última hora (15:00-16:00 ET). Posicionamiento institucional hacia el cierre. |
| **Português** | Rompimento na última hora (15:00-16:00 ET). Posicionamento institucional rumo ao fecho. |
| **العربية** | اختراق في الساعة الأخيرة (15:00-16:00 ET). تموضع مؤسّسي قبيل الإغلاق. |

### `MOCFade` — MOC Fade

| שפה | הסבר |
|---|---|
| **עברית** | מסחר נגד תנועה חדה לקראת הסגירה (Market-On-Close), בציפייה לתיקון למחרת.<br>לדוגמה: עלייה של ‎+4% בשעה האחרונה ⇒ SHORT לקראת הסגירה.<br>ב-NYSE פקודות MOC נכנסות עד 15:50 לפי שעון ניו יורק. |
| **English** | Trading against a sharp move into the close (Market-On-Close), expecting a next-day pullback.<br>Example: a +4% move in the last hour ⇒ SHORT into the close.<br>On the NYSE, MOC orders are accepted until 3:50 p.m. New York time. |
| **Español** | Fade de Market-On-Close. Operar contra movimientos extendidos hacia el cierre para un giro al día siguiente. |
| **Português** | Fade de Market-On-Close. Operar contra movimentos estendidos rumo ao fecho para uma reversão no dia seguinte. |
| **العربية** | Fade على إغلاق السوق. التداول عكس الحركات الممتدّة قبيل الإغلاق توقّعاً لانعكاس في اليوم التالي. |

### `overnightHold` — Overnight Hold

| שפה | הסבר |
|---|---|
| **עברית** | עסקה שהשארת פתוחה אחרי סגירת יום המסחר.<br>לדוגמה: קנית ב-$30 ב-15:30, והמניה פתחה למחרת ב-$28 ⇒ פער נגדך.<br>סטופ לא מגן מפני פער בפתיחה. |
| **English** | A trade you left open past the trading-day close.<br>Example: you bought at $30 at 3:30 p.m. and the stock opened at $28 the next day ⇒ a gap against you.<br>A stop does not protect against an opening gap. |
| **Español** | Operación mantenida toda la noche. Mayor potencial de recompensa pero expuesta al riesgo de hueco. |
| **Português** | Operação mantida durante a noite. Maior potencial de retorno mas exposta ao risco de gap. |
| **العربية** | صفقة محتفظ بها طوال الليل. إمكانية ربح أعلى لكنها معرّضة لمخاطر الفجوة. |

### `overnightReversal` — Overnight Reversal

| שפה | הסבר |
|---|---|
| **עברית** | מסחר נגד תנועת הלילה בפתיחת המסחר, אחרי אישור.<br>לדוגמה: פער ‎−3% בפתיחה והמחיר חוזר מעל מחיר הפתיחה ⇒ LONG. |
| **English** | Trading against the overnight move at the open, after confirmation.<br>Example: a −3% gap at the open and price back above the opening price ⇒ LONG. |
| **Español** | Operar el giro del movimiento nocturno en la apertura. Contra-tendencia, requiere confirmación. |
| **Português** | Operar a reversão do movimento noturno na abertura. Contra-tendência, exige confirmação. |
| **العربية** | تداول انعكاس حركة الليل عند افتتاح السوق. عكس الاتجاه، يتطلّب تأكيداً. |

### `supportBounce` — Support Bounce

| שפה | הסבר |
|---|---|
| **עברית** | כניסה כשהמחיר יורד לרמת תמיכה מוכרת ומתהפך כלפי מעלה.<br>לדוגמה: תמיכה ב-$25, שפל $25.10, כניסה ב-$25.60 וסטופ ב-$24.80. |
| **English** | Entering when price drops to a known support level and turns up.<br>Example: support at $25, a low of $25.10, entry at $25.60, stop at $24.80. |
| **Español** | Comprar cuando el precio cae a un nivel de soporte conocido y rebota al alza. La lógica: los compradores defienden el nivel. El stop va debajo del soporte; si se rompe, la tesis queda anulada. |
| **Português** | Comprar quando o preço cai a um nível de suporte conhecido e reverte para cima. A lógica: os compradores defendem o nível. O stop fica abaixo do suporte; se romper, a tese é anulada. |
| **العربية** | الشراء عندما يهبط السعر إلى مستوى دعم معروف ثم ينعكس صعوداً. المنطق: المشترون يدافعون عن المستوى. يوضع وقف الخسارة أسفل الدعم — وإذا انكسر، تسقط الفكرة. |

### `resistanceBreak` — Resistance Break

| שפה | הסבר |
|---|---|
| **עברית** | כניסה כשהמחיר פורץ רמת התנגדות ספציפית שעצרה אותו בעבר.<br>לדוגמה: נעצר פעמיים ב-$80, ואז נסגר ב-$81 במחזור מסחר גבוה. |
| **English** | Entering when price breaks a specific resistance level that stopped it before.<br>Example: stopped twice at $80, then a close at $81 on high volume. |
| **Español** | Entrar cuando el precio rompe por encima de un nivel de resistencia que antes lo frenaba, idealmente con volumen alto. La ruptura indica que los compradores tomaron el control. Se diferencia de un Breakout genérico por enfocarse en un nivel específico. |
| **Português** | Entrar quando o preço rompe acima de um nível de resistência que antes o travava, idealmente com volume alto. O rompimento sinaliza que os compradores assumiram o controlo. Difere de um Breakout genérico por focar num nível específico. |
| **العربية** | الدخول عندما يخترق السعر مستوى مقاومة كان يكبحه سابقاً، ويُفضّل بحجم تداول عالٍ. الاختراق يشير إلى أن المشترين سيطروا. يختلف عن الـ Breakout العام بتركيزه على مستوى محدّد. |

### `pullback20EMA` — Pullback to 20 EMA

| שפה | הסבר |
|---|---|
| **עברית** | כניסה כשמחיר במגמת עלייה נסוג לממוצע הנע האקספוננציאלי של 20 תקופות ומתהפך.<br>לדוגמה: 20 EMA ב-$40, שפל $40.15 וסגירה ב-$41. |
| **English** | Entering when an uptrending price pulls back to the 20-period exponential moving average and turns.<br>Example: 20 EMA at $40, a low of $40.15 and a close at $41. |
| **Español** | Comprar cuando un precio en tendencia alcista retrocede a la media móvil de 20 períodos y rebota. La 20 EMA actúa como soporte dinámico; este setup combina tendencia con un punto de entrada preciso. |
| **Português** | Comprar quando um preço em tendência de alta recua à média móvel de 20 períodos e ressalta. A 20 EMA atua como suporte dinâmico; este setup combina tendência com um ponto de entrada preciso. |
| **العربية** | الشراء عندما يرتد سعر في اتجاه صاعد إلى المتوسط المتحرك لـ 20 فترة ثم يرتدّ منه. يعمل الـ 20 EMA كدعم ديناميكي؛ ويجمع هذا النموذج بين الاتجاه ونقطة دخول دقيقة. |

## רגשות

### `emotionConfident` — Confident

| שפה | הסבר |
|---|---|
| **עברית** | ביטחון שנשען על סטאפ תקף ועל ניתוח, לא על רצף רווחים.<br>לדוגמה: כל התנאים שכתבת התקיימו ונכנסת בגודל הרגיל.<br>אחרי רצף רווחים — בדוק שזה לא ביטחון-יתר. |
| **English** | Confidence grounded in a valid setup and analysis, not in a winning streak.<br>Example: every condition you wrote down was met and you entered at normal size.<br>After a winning streak, check that it is not overconfidence. |
| **Español** | Confianza basada en el análisis, no en la arrogancia. Sobre un setup válido impulsa una ejecución disciplinada; si se convierte en exceso de confianza tras una racha ganadora, se vuelve peligrosa. |
| **Português** | Confiança baseada na análise, não em arrogância. Sobre um setup válido gera execução disciplinada; se virar excesso de confiança após uma sequência de vitórias, torna-se arriscada. |
| **العربية** | ثقة مبنية على التحليل وليست غروراً. عندما تستند إلى نموذج دخول صحيح تؤدي إلى تنفيذ منضبط؛ وعندما تتحول إلى ثقة مفرطة بعد سلسلة انتصارات تصبح خطيرة. |

### `emotionCalm` — Calm

| שפה | הסבר |
|---|---|
| **עברית** | נכנסת בלי לחץ ובלי מרדף, לפי התוכנית.<br>לדוגמה: חיכית למחיר שתכננת והצבת סטופ ויעד מראש. |
| **English** | You entered without pressure or chasing, according to plan.<br>Example: you waited for your planned price and set the stop and target in advance. |
| **Español** | El estado emocional óptimo para un trader. La calma te permite seguir tu plan sin perseguir ni entrar en pánico. Las operaciones abiertas con calma tienden a respetar su stop y objetivo. |
| **Português** | O estado emocional ideal para um trader. A calma permite seguir o seu plano sem perseguir nem entrar em pânico. Operações abertas com calma tendem a respeitar o stop e o alvo. |
| **العربية** | الحالة العاطفية المثلى للمتداول. الهدوء يتيح لك اتّباع خطتك دون مطاردة أو ذعر. الصفقات التي تُفتح بهدوء تميل إلى احترام وقف الخسارة والهدف. |

### `emotionPatient` — Patient

| שפה | הסבר |
|---|---|
| **עברית** | חיכית לסטאפ שעומד בכל הקריטריונים שלך, במקום להיכנס לכל תנועה.<br>לדוגמה: דילגת על שתי פריצות חלשות ונכנסת בשלישית. |
| **English** | You waited for a setup that met all your criteria instead of entering every move.<br>Example: you skipped two weak breakouts and took the third. |
| **Español** | Esperar un setup que realmente cumpla tus criterios en lugar de entrar en cada movimiento. La paciencia suele ser lo que separa a un trader rentable de uno perdedor: filtra las operaciones de baja calidad. |
| **Português** | Esperar por um setup que realmente cumpra os seus critérios em vez de entrar em cada movimento. A paciência costuma ser o que separa um trader lucrativo de um perdedor — filtra operações de baixa qualidade. |
| **العربية** | انتظار نموذج دخول يستوفي معاييرك فعلاً بدلاً من الدخول في كل حركة. الصبر غالباً ما يفصل بين المتداول الرابح والخاسر، فهو يُصفّي الصفقات منخفضة الجودة. |

### `emotionNeutral` — Neutral

| שפה | הסבר |
|---|---|
| **עברית** | נכנסת בלי מטען רגשי — לא נלהב ולא חושש.<br>לדוגמה: עוד עסקה מתוך התוכנית, בלי ציפייה מיוחדת. |
| **English** | You entered with no emotional charge — neither excited nor fearful.<br>Example: one more trade from the plan, with no special expectation. |
| **Español** | Entrar sin carga emocional, ni eufórico ni temeroso. Un estado estable que permite decisiones objetivas basadas en datos. Una buena base, aunque menos afilada que "Calm". |
| **Português** | Entrar sem carga emocional — nem eufórico nem receoso. Um estado estável que permite decisões objetivas e baseadas em dados. Uma boa base, ainda que menos afiada que "Calm". |
| **العربية** | الدخول دون شحنة عاطفية، لا متحمّس ولا خائف. حالة مستقرة تتيح قرارات موضوعية مبنية على البيانات. أساس جيّد، وإن كان أقل حدّة من "Calm". |

### `emotionHesitant` — Hesitant

| שפה | הסבר |
|---|---|
| **עברית** | היססת בכניסה — לרוב כשהסטאפ לא ברור או שהביטחון נמוך.<br>לדוגמה: חיכית לעוד נר ונכנסת $0.50 מעל המחיר שתכננת. |
| **English** | You hesitated at entry — usually when the setup is unclear or confidence is low.<br>Example: you waited for one more candle and entered $0.50 above your planned price. |
| **Español** | Vacilación en la entrada, normalmente señal de que el setup no está claro o la confianza es baja. Las entradas vacilantes suelen implicar entrar tarde, poner el stop demasiado ajustado o salir antes por miedo. |
| **Português** | Hesitação na entrada — geralmente sinal de que o setup não está claro ou a confiança está baixa. Entradas hesitantes tendem a significar entrar tarde, colocar o stop apertado demais ou sair cedo por medo. |
| **العربية** | التردّد عند الدخول، وغالباً ما يكون علامة على أن نموذج الدخول غير واضح أو أن الثقة منخفضة. الدخول المتردّد يميل إلى التأخّر في الدخول، أو وضع وقف خسارة ضيّق جداً، أو الخروج مبكراً بدافع الخوف. |

### `emotionNervous` — Nervous

| שפה | הסבר |
|---|---|
| **עברית** | מתח שהעיב על שיקול הדעת שלך בזמן העסקה.<br>לדוגמה: בדקת את המחיר כל דקה והזזת את הסטופ פעמיים.<br>לעיתים סימן שהפוזיציה גדולה מדי. |
| **English** | Tension that clouded your judgment during the trade.<br>Example: you checked the price every minute and moved the stop twice.<br>Sometimes a sign the position is too large. |
| **Español** | Tensión que nubla la toma de decisiones. El nerviosismo lleva a revisar el precio de forma obsesiva, mover el stop y salir impulsivamente. Suele indicar una posición demasiado grande o falta de confianza en el setup. |
| **Português** | Tensão que prejudica a tomada de decisão. O nervosismo leva a verificar o preço de forma obsessiva, mexer no stop e sair por impulso. Costuma indicar uma posição grande demais ou falta de confiança no setup. |
| **العربية** | توتّر يُشوّش اتخاذ القرار. العصبية تؤدي إلى مراقبة السعر بهوس، وتحريك وقف الخسارة، والخروج المتسرّع. وغالباً ما تدل على أن حجم الصفقة كبير جداً أو عدم الثقة في نموذج الدخول. |

### `emotionFOMO` — FOMO

| שפה | הסבר |
|---|---|
| **עברית** | נכנסת כי המחיר זז חזק ופחדת להחמיץ, בלי סטאפ תקף.<br>לדוגמה: המניה עלתה ‎+6% ונכנסת בשיא בלי סטופ ברור. |
| **English** | You entered because price moved hard and you feared missing out, with no valid setup.<br>Example: the stock was up +6% and you entered at the high with no clear stop. |
| **Español** | "Miedo a quedarse fuera" — entrar en una operación solo porque el precio se movió con fuerza, sin un setup válido. Uno de los patrones más destructivos: entrada tardía, perseguir el precio y un stop lejano. Una señal de alerta. |
| **Português** | "Medo de ficar de fora" — entrar numa operação só porque o preço se moveu com força, sem um setup válido. Um dos padrões mais destrutivos: entrada tardia, perseguir o preço e um stop distante. Um sinal de alerta. |
| **العربية** | "الخوف من تفويت الفرصة" — الدخول في صفقة لمجرّد أن السعر تحرّك بحدّة، دون نموذج دخول صحيح. من أكثر الأنماط تدميراً: دخول متأخّر، ومطاردة السعر، ووقف خسارة بعيد. علامة تحذير. |

### `emotionAngry` — Angry

| שפה | הסבר |
|---|---|
| **עברית** | כעס אחרי הפסד שדחף אותך להחזיר אותו מיד — מסחר נקמה.<br>לדוגמה: הפסדת $200 ופתחת מיד עסקה בגודל כפול. |
| **English** | Anger after a loss that pushed you to win it back at once — revenge trading.<br>Example: you lost $200 and immediately opened a trade at double size. |
| **Español** | Ira tras una pérdida — el combustible del "trading de venganza". En este estado el trader intenta recuperar la pérdida de inmediato, aumenta el riesgo y entra en malas operaciones. Así se revientan las cuentas. Detente. |
| **Português** | Raiva após uma perda — o combustível do "trading de vingança". Nesse estado o trader tenta recuperar a perda de imediato, aumenta o risco e faz operações ruins. É assim que se destroem contas. Pare. |
| **العربية** | الغضب بعد الخسارة — وقود "التداول الانتقامي". في هذه الحالة يحاول المتداول استعادة خسارته فوراً، فيرفع المخاطرة ويدخل صفقات سيئة. هكذا تُدمَّر الحسابات. توقّف. |

## פעולות ותכונות

### `chartCalcPosition` — Calculate Position · חשב פוזיציה

| שפה | הסבר |
|---|---|
| **עברית** | ממלא את מחשבון הפוזיציה מהגרף: טיקר, מחיר חי ככניסה, סטופ ויעד 1:2.<br>לדוגמה: כניסה $50 וסטופ $48 ⇒ יעד $54. |
| **English** | Fills the position calculator from the chart: ticker, live price as entry, a stop and a 1:2 target.<br>Example: entry $50 and stop $48 ⇒ target $54. |
| **Español** | Rellena automáticamente la Calculadora de Posición desde el gráfico actual — ticker, precio en vivo como entrada, un stop protector y un objetivo 2:1 — y luego la abre para que dimensiones la operación en un clic. |
| **Português** | Preenche automaticamente a Calculadora de Posição a partir do gráfico atual — ticker, preço ao vivo como entrada, um stop protetor e um alvo 2:1 — e depois abre-a para dimensionares a operação num clique. |
| **العربية** | يملأ تلقائياً حاسبة الصفقة من الرسم الحالي — الرمز، السعر الحي كدخول، وقف حماية وهدف 2:1 — ثم يفتحها لتحدّد حجم الصفقة بنقرة واحدة. |

### `chartAddToJournal` — Add to Journal · הוסף ליומן

| שפה | הסבר |
|---|---|
| **עברית** | פותח עסקה חדשה ביומן מהגרף — טיקר, מחיר חי, סטופ מוצע ויעד 1:2 — לבדיקה ושמירה.<br>לדוגמה: כניסה $50, סטופ $48 ויעד $54 ממולאים, ושמרת. |
| **English** | Opens a journal trade from the chart, prefilled with ticker, live price, a stop and a 1:2 target.<br>Example: entry $50, stop $48 and target $54 filled in, and you saved. |
| **Español** | Inicia una nueva operación en el diario desde el gráfico actual — ticker, precio en vivo, un stop sugerido y un objetivo 2:1 pre-rellenados — lista para que la revises y guardes. |
| **Português** | Inicia uma nova operação no diário a partir do gráfico atual — ticker, preço ao vivo, um stop sugerido e um alvo 2:1 pré-preenchidos — pronta para reveres e guardares. |
| **العربية** | يبدأ صفقة جديدة في اليوميّة من الرسم الحالي — الرمز، السعر الحي، وقف مقترح وهدف 2:1 مملوءة مسبقاً — جاهزة لمراجعتك وحفظك. |

### `visionOcr` — Vision OCR

| שפה | הסבר |
|---|---|
| **עברית** | קורא עסקה מצילום מסך של הגרף וממלא את השדות במקום הקלדה.<br>לדוגמה: העלית צילום עם כניסה, סטופ ויעד ⇒ השדות התמלאו.<br>בדוק את הערכים לפני השמירה. |
| **English** | Reads a trade from a chart screenshot and fills the fields instead of typing.<br>Example: you uploaded a screenshot with entry, stop and target ⇒ the fields were filled.<br>Check the values before saving. |
| **Español** | Reads a trade from a chart screenshot and fills the fields instead of typing.<br>Example: you uploaded a screenshot with entry, stop and target ⇒ the fields were filled.<br>Check the values before saving. |
| **Português** | Reads a trade from a chart screenshot and fills the fields instead of typing.<br>Example: you uploaded a screenshot with entry, stop and target ⇒ the fields were filled.<br>Check the values before saving. |
| **العربية** | Reads a trade from a chart screenshot and fills the fields instead of typing.<br>Example: you uploaded a screenshot with entry, stop and target ⇒ the fields were filled.<br>Check the values before saving. |
