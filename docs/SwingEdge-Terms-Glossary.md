# 📘 SwingEdge — מילון מונחים · 5 שפות

> מקור אמת יחיד לכל מונחי המערכת. נבנה אוטומטית מ-`src/data/tooltips.js` (commit fcd6260).
> **70 מונחים** · 5 שפות מלאות (עברית · English · Español · Português · العربية).
> תחזוקה: המונחים חיים בקוד ב-`tooltips.js`. קובץ זה מסונכרן ממנו — אל תערוך ידנית, הרץ מחדש את הבנייה.

---

## תוכן עניינים
- **מדדי ביצוע** (15)
- **מדדים נוספים** (5)
- **מושגים / AI** (9)
- **ניהול סיכון** (5)
- **סטאפים** (22)
- **רגשות** (8)
- **תנאי שוק** (4)
- **פעולות גרף** (2)

---

## מדדי ביצוע

### `winRate` — Win Rate · אחוז זכייה

| שפה | הסבר |
|---|---|
| **עברית** | אחוז הזכייה הוא האחוז מהעסקאות הסגורות שהסתיימו ברווח.<br><br>מעל 55% זה טוב. אבל אחוז זכייה לבד לא קובע הצלחה — סוחר עם 40% יכול להיות רווחי אם יחס הסיכון-סיכוי שלו גבוה. תסתכל גם על Profit Factor. |
| **English** | Win Rate is the percentage of your closed trades that ended in profit.<br><br>Above 55% is solid. But win rate alone doesn't determine success — a trader with 40% WR can be profitable with strong risk-reward ratios. Focus on Profit Factor too. |
| **Español** | La Win Rate es el porcentaje de tus operaciones cerradas que terminaron en ganancia.<br><br>Por encima del 55% es sólido. Pero la win rate por sí sola no determina el éxito — un trader con 40% puede ser rentable con buenas relaciones riesgo-beneficio. Fíjate también en el Profit Factor. |
| **Português** | A Win Rate é a percentagem das tuas operações fechadas que terminaram em lucro.<br><br>Acima de 55% é sólido. Mas a win rate sozinha não determina o sucesso — um trader com 40% pode ser lucrativo com boas relações risco-retorno. Repara também no Profit Factor. |
| **العربية** | نسبة الربح (Win Rate) هي النسبة المئوية لصفقاتك المغلقة التي انتهت بربح.<br><br>أعلى من 55% جيّدة. لكن نسبة الربح وحدها لا تحدّد النجاح — فمتداول بنسبة 40% قد يكون رابحاً إذا كانت نسب المخاطرة/العائد قوية. انظر أيضاً إلى Profit Factor. |

### `profitFactor` — Profit Factor

| שפה | הסבר |
|---|---|
| **עברית** | Profit Factor = סה״כ רווחים גולמיים ÷ סה״כ הפסדים גולמיים.<br><br>• מעל 1.0 = רווחי<br>• מעל 1.5 = Edge בריא<br>• מעל 2.0 = רמה מקצועית<br>• מעל 3.0 = יוצא דופן<br><br>זה אחד המדדים החשובים ביותר במסחר. |
| **English** | Profit Factor = Total Gross Wins ÷ Total Gross Losses.<br><br>• Above 1.0 = profitable<br>• Above 1.5 = healthy edge<br>• Above 2.0 = professional level<br>• Above 3.0 = exceptional<br><br>This is one of the most important metrics in trading. |
| **Español** | Profit Factor = Ganancias Brutas Totales ÷ Pérdidas Brutas Totales.<br><br>• Por encima de 1.0 = rentable<br>• Por encima de 1.5 = ventaja sana<br>• Por encima de 2.0 = nivel profesional<br>• Por encima de 3.0 = excepcional<br><br>Es una de las métricas más importantes en el trading. |
| **Português** | Profit Factor = Lucros Brutos Totais ÷ Perdas Brutas Totais.<br><br>• Acima de 1.0 = lucrativo<br>• Acima de 1.5 = vantagem saudável<br>• Acima de 2.0 = nível profissional<br>• Acima de 3.0 = excecional<br><br>É uma das métricas mais importantes no trading. |
| **العربية** | Profit Factor = إجمالي الأرباح ÷ إجمالي الخسائر.<br><br>• أعلى من 1.0 = رابح<br>• أعلى من 1.5 = أفضلية صحّية<br>• أعلى من 2.0 = مستوى احترافي<br>• أعلى من 3.0 = استثنائي<br><br>من أهم المقاييس في التداول. |

### `avgR` — Avg R · R ממוצע

| שפה | הסבר |
|---|---|
| **עברית** | ממוצע R-Multiple לעסקה סגורה.<br><br>R = (מחיר יציאה − מחיר כניסה) ÷ סיכון ראשוני למניה.<br><br>+1.0R אומר שהרווחת בדיוק כמה שסיכנת. שאף ל-+0.3R לפחות כממוצע. סוחרים עילית מגיעים ל-+1.5R עד +2.5R. |
| **English** | Average R-Multiple per closed trade.<br><br>R = (Exit Price − Entry Price) ÷ Initial Risk Per Share.<br><br>+1.0R means you made exactly what you risked. Aim for +0.3R or higher as a minimum average. Elite traders average +1.5R to +2.5R. |
| **Español** | R-Multiple promedio por operación cerrada.<br><br>R = (Precio de Salida − Precio de Entrada) ÷ Riesgo Inicial por Acción.<br><br>+1.0R significa que ganaste exactamente lo que arriesgaste. Apunta a +0.3R o más como promedio mínimo. Los traders de élite promedian +1.5R a +2.5R. |
| **Português** | R-Multiple médio por operação fechada.<br><br>R = (Preço de Saída − Preço de Entrada) ÷ Risco Inicial por Ação.<br><br>+1.0R significa que ganhaste exatamente o que arriscaste. Aponta para +0.3R ou mais como média mínima. Traders de elite têm média de +1.5R a +2.5R. |
| **العربية** | متوسّط R-Multiple لكل صفقة مغلقة.<br><br>R = (سعر الخروج − سعر الدخول) ÷ المخاطرة الأوّلية للسهم.<br><br>+1.0R يعني أنك ربحت تماماً ما خاطرت به. استهدف +0.3R أو أعلى كحدّ أدنى للمتوسّط. متداولو النخبة يحقّقون متوسّط +1.5R إلى +2.5R. |

### `expectancy` — Expectancy · תוחלת

| שפה | הסבר |
|---|---|
| **עברית** | תוחלת = (אחוז זכייה × רווח ממוצע) − (אחוז הפסד × הפסד ממוצע).<br><br>מראה כמה דולר אתה מצפה לרוויח בממוצע לעסקה. חיובי = יש לך Edge. שלילי = אתה מפסיד לאורך זמן בלי קשר לניצחונות בודדים. |
| **English** | Expectancy = (Win% × Avg Win) − (Loss% × Avg Loss).<br><br>Tells you the expected dollar profit per trade on average. Positive = your system has edge. Negative = you're losing money over time regardless of individual wins. |
| **Español** | Expectativa = (% Ganancias × Ganancia Media) − (% Pérdidas × Pérdida Media).<br><br>Te dice el beneficio esperado en dólares por operación en promedio. Positiva = tu sistema tiene ventaja. Negativa = pierdes dinero con el tiempo sin importar las ganancias individuales. |
| **Português** | Expectativa = (% Ganhos × Ganho Médio) − (% Perdas × Perda Média).<br><br>Diz-te o lucro esperado em dólares por operação em média. Positiva = o teu sistema tem vantagem. Negativa = perdes dinheiro ao longo do tempo independentemente dos ganhos individuais. |
| **العربية** | التوقّع = (نسبة الربح × متوسّط الربح) − (نسبة الخسارة × متوسّط الخسارة).<br><br>يخبرك بالربح المتوقّع بالدولار لكل صفقة في المتوسّط. موجب = نظامك يملك أفضلية. سالب = تخسر المال مع الوقت بغضّ النظر عن المكاسب الفردية. |

### `sharpe` — Sharpe Ratio · יחס שארפ

| שפה | הסבר |
|---|---|
| **עברית** | יחס שארפ מודד תשואה מותאמת לסיכון.<br><br>• מעל 1.0 = טוב<br>• מעל 2.0 = מצוין<br>• מעל 3.0 = יוצא דופן (רמת קרן גידור)<br><br>שארפ גבוה = תשואות עקביות בלי תנודות חריפות. חשוב יותר מרווח גולמי להערכת איכות המערכת. |
| **English** | Sharpe Ratio measures risk-adjusted return.<br><br>• Above 1.0 = good<br>• Above 2.0 = excellent<br>• Above 3.0 = exceptional (hedge fund level)<br><br>A high Sharpe means consistent returns without wild swings. More important than raw profit for evaluating system quality. |
| **Español** | El Ratio de Sharpe mide el rendimiento ajustado al riesgo.<br><br>• Por encima de 1.0 = bueno<br>• Por encima de 2.0 = excelente<br>• Por encima de 3.0 = excepcional (nivel de hedge fund)<br><br>Un Sharpe alto significa rendimientos consistentes sin oscilaciones bruscas. Más importante que el beneficio bruto para evaluar la calidad del sistema. |
| **Português** | O Rácio de Sharpe mede o retorno ajustado ao risco.<br><br>• Acima de 1.0 = bom<br>• Acima de 2.0 = excelente<br>• Acima de 3.0 = excecional (nível de hedge fund)<br><br>Um Sharpe alto significa retornos consistentes sem oscilações bruscas. Mais importante que o lucro bruto para avaliar a qualidade do sistema. |
| **العربية** | يقيس مقياس شارب (Sharpe) العائد المعدّل حسب المخاطرة.<br><br>• أعلى من 1.0 = جيّد<br>• أعلى من 2.0 = ممتاز<br>• أعلى من 3.0 = استثنائي (مستوى صناديق التحوّط)<br><br>شارب المرتفع يعني عوائد متّسقة دون تقلّبات حادّة. أهمّ من الربح الخام لتقييم جودة النظام. |

### `maxDD` — Max Drawdown · ירידה מקסימלית

| שפה | הסבר |
|---|---|
| **עברית** | ירידה מקסימלית — הירידה הגדולה ביותר בדולרים מנקודת שיא ביתרת החשבון לנקודת השפל שלפני ההתאוששות.<br><br>מספר קטן יותר = פחות רצפי הפסד גדולים ושמירה טובה יותר על הון. ירידות עמוקות פוגעות פסיכולוגית וקשות להתאוששות מתמטית. |
| **English** | Maximum Drawdown — the largest dollar drop from a peak in your account balance to the lowest point before recovery.<br><br>A smaller number means fewer large losing streaks and better capital preservation. Deep drawdowns are psychologically damaging and hard to recover from mathematically. |
| **Español** | Drawdown Máximo — la mayor caída en dólares desde un pico en el saldo de tu cuenta hasta el punto más bajo antes de recuperarse.<br><br>Un número menor significa menos rachas perdedoras grandes y mejor preservación del capital. Los drawdowns profundos son psicológicamente dañinos y difíciles de recuperar matemáticamente. |
| **Português** | Drawdown Máximo — a maior queda em dólares desde um pico no saldo da tua conta até ao ponto mais baixo antes da recuperação.<br><br>Um número menor significa menos sequências perdedoras grandes e melhor preservação de capital. Drawdowns profundos são psicologicamente prejudiciais e difíceis de recuperar matematicamente. |
| **العربية** | أقصى تراجع (Max Drawdown) — أكبر هبوط بالدولار من قمّة في رصيد حسابك إلى أدنى نقطة قبل التعافي.<br><br>الرقم الأصغر يعني سلاسل خسائر كبيرة أقل وحفاظاً أفضل على رأس المال. التراجعات العميقة مؤذية نفسياً وصعبة التعافي رياضياً. |

### `avgWin` — Avg Win · רווח ממוצע

| שפה | הסבר |
|---|---|
| **עברית** | הרווח הממוצע בעסקאות מנצחות. |
| **English** | Average profit on winning trades. |
| **Español** | Beneficio promedio en operaciones ganadoras. |
| **Português** | Lucro médio em operações vencedoras. |
| **العربية** | متوسّط الربح في الصفقات الرابحة. |

### `avgLoss` — Avg Loss · הפסד ממוצע

| שפה | הסבר |
|---|---|
| **עברית** | ההפסד הממוצע בעסקאות מפסידות. |
| **English** | Average loss on losing trades. |
| **Español** | Pérdida promedio en operaciones perdedoras. |
| **Português** | Perda média em operações perdedoras. |
| **العربية** | متوسّط الخسارة في الصفقات الخاسرة. |

### `avgHold` — Avg Hold · זמן החזקה ממוצע

| שפה | הסבר |
|---|---|
| **עברית** | זמן החזקה ממוצע לעסקה סגורה (בימים).<br><br>מסחר סווינג מכוון בדרך כלל ל-2-10 ימים. החזקות קצרות מאוד (< 1 יום) מעידות לעיתים על יציאה מוקדמת מדי. החזקות ארוכות מאוד (> 20 ימים) עשויות להצביע על הימנעות מסטופ לוס. |
| **English** | Average holding period per closed trade (in days).<br><br>Swing trading typically targets 2-10 day holds. Very short holds (< 1 day) often indicate cutting trades too early. Very long holds (> 20 days) may suggest avoiding stop-losses. |
| **Español** | Periodo medio de mantenimiento por operación cerrada (en días).<br><br>El swing trading suele apuntar a mantener 2-10 días. Mantenimientos muy cortos (< 1 día) a menudo indican cerrar operaciones demasiado pronto. Mantenimientos muy largos (> 20 días) pueden sugerir evitar los stop-loss. |
| **Português** | Período médio de manutenção por operação fechada (em dias).<br><br>O swing trading costuma apontar para manter 2-10 dias. Manutenções muito curtas (< 1 dia) muitas vezes indicam fechar operações cedo demais. Manutenções muito longas (> 20 dias) podem sugerir evitar os stop-loss. |
| **العربية** | متوسّط فترة الاحتفاظ لكل صفقة مغلقة (بالأيام).<br><br>يستهدف التداول المتأرجح عادةً الاحتفاظ 2-10 أيام. فترات الاحتفاظ القصيرة جداً (< يوم واحد) كثيراً ما تعني إغلاق الصفقات مبكراً. والطويلة جداً (> 20 يوماً) قد تعني تجنّب أوامر وقف الخسارة. |

### `equityCurve` — Equity Curve · עקומת הון

| שפה | הסבר |
|---|---|
| **עברית** | עקומת ההון מציגה את יתרת החשבון לאורך זמן.<br><br>עקומה חלקה ועולה באופן עקבי = Edge עקבי וניהול סיכון טוב.<br>קפיצות חדות = גודל פוזיציה לא עקבי או מסחר רגשי.<br>תקופות שטוחות ארוכות = מסחר יתר ללא Edge. |
| **English** | Your Equity Curve shows account balance over time.<br><br>A smooth, steadily rising curve = consistent edge and good risk management.<br>Jagged spikes = inconsistent position sizing or emotional trading.<br>Long flat periods = overtrading without edge. |
| **Español** | Tu Curva de Capital muestra el saldo de la cuenta a lo largo del tiempo.<br><br>Una curva suave y en ascenso constante = ventaja consistente y buena gestión del riesgo.<br>Picos irregulares = tamaño de posición inconsistente o trading emocional.<br>Largos periodos planos = sobreoperar sin ventaja. |
| **Português** | A tua Curva de Capital mostra o saldo da conta ao longo do tempo.<br><br>Uma curva suave e em ascensão constante = vantagem consistente e boa gestão de risco.<br>Picos irregulares = tamanho de posição inconsistente ou trading emocional.<br>Longos períodos planos = operar em excesso sem vantagem. |
| **العربية** | تُظهر منحنى رأس المال رصيد حسابك عبر الزمن.<br><br>منحنى سلس وصاعد بثبات = أفضلية متّسقة وإدارة مخاطر جيّدة.<br>قفزات حادّة = حجم صفقات غير متّسق أو تداول عاطفي.<br>فترات مسطّحة طويلة = إفراط في التداول دون أفضلية. |

### `totalReturn` — Total Return

| שפה | הסבר |
|---|---|
| **עברית** | הרווח או ההפסד הכולל מאז תחילת המסחר, באחוזים מההון ההתחלתי. מדד-העל לביצועים — אבל בלי הקשר של סיכון הוא לא מספר את כל הסיפור. |
| **English** | Your total profit or loss since you started, as a percentage of starting capital. The headline performance number — but without risk context it doesn't tell the whole story. |
| **Español** | Tu ganancia o pérdida total desde que empezaste, como porcentaje del capital inicial. La cifra principal de rendimiento, pero sin contexto de riesgo no cuenta toda la historia. |
| **Português** | O seu lucro ou prejuízo total desde que começou, como percentagem do capital inicial. O número principal de desempenho — mas sem contexto de risco não conta a história toda. |
| **العربية** | إجمالي ربحك أو خسارتك منذ البداية، كنسبة مئوية من رأس المال الابتدائي. الرقم الرئيسي للأداء — لكنه دون سياق المخاطرة لا يروي القصة كاملة. |

### `winStreak` — Win Streak

| שפה | הסבר |
|---|---|
| **עברית** | מספר העסקאות הרווחיות ברצף. רצף נצחונות בונה ביטחון — אך גם הזמן המסוכן ביותר לביטחון-יתר ולהגדלת סיכון לא ממושמעת. |
| **English** | The number of profitable trades in a row. A winning streak builds confidence — but it's also the most dangerous time for overconfidence and undisciplined risk-taking. |
| **Español** | El número de operaciones ganadoras seguidas. Una racha ganadora genera confianza, pero también es el momento más peligroso para el exceso de confianza y un riesgo indisciplinado. |
| **Português** | O número de operações vencedoras seguidas. Uma sequência de vitórias gera confiança — mas também é o momento mais perigoso para o excesso de confiança e o risco indisciplinado. |
| **العربية** | عدد الصفقات الرابحة المتتالية. سلسلة الانتصارات تبني الثقة — لكنها أيضاً أخطر وقت للثقة المفرطة والمخاطرة غير المنضبطة. |

### `streakHistory` — Streak History

| שפה | הסבר |
|---|---|
| **עברית** | תיעוד רצפי הנצחונות וההפסדים שלך לאורך זמן. חושף דפוסים רגשיים: האם רצף הפסדים גורם לך לסחור גרוע יותר (tilt), או להתאושש במשמעת. |
| **English** | A record of your winning and losing streaks over time. It reveals emotional patterns: does a losing streak make you trade worse (tilt), or do you recover with discipline. |
| **Español** | Un registro de tus rachas ganadoras y perdedoras a lo largo del tiempo. Revela patrones emocionales: ¿una racha perdedora te hace operar peor (tilt) o te recuperas con disciplina? |
| **Português** | Um registo das suas sequências de vitórias e derrotas ao longo do tempo. Revela padrões emocionais: uma sequência de perdas faz você operar pior (tilt), ou você recupera com disciplina? |
| **العربية** | سجلّ لسلاسل انتصاراتك وخسائرك عبر الزمن. يكشف الأنماط العاطفية: هل تجعلك سلسلة الخسائر تتداول بشكل أسوأ (tilt)، أم تتعافى بانضباط؟ |

### `grade` — Grade

| שפה | הסבר |
|---|---|
| **עברית** | ציון משוקלל (A–F) שמסכם את איכות המסחר שלך לחודש: שילוב של אחוז הצלחה, יחס R, משמעת ועקביות. תמונת-על מהירה — לא תחליף לצלילה לפרטים. |
| **English** | A weighted score (A–F) summarizing your trading quality for the month: a blend of win rate, R-multiple, discipline and consistency. A quick snapshot — not a substitute for digging into the details. |
| **Español** | Una puntuación ponderada (A–F) que resume la calidad de tu trading del mes: una mezcla de tasa de aciertos, múltiplo R, disciplina y consistencia. Una instantánea rápida, no un sustituto de analizar los detalles. |
| **Português** | Uma pontuação ponderada (A–F) que resume a qualidade do seu trading no mês: uma mistura de taxa de acertos, múltiplo R, disciplina e consistência. Um retrato rápido — não substitui analisar os detalhes. |
| **العربية** | درجة مرجّحة (A–F) تلخّص جودة تداولك خلال الشهر: مزيج من نسبة النجاح ومضاعف R والانضباط والاتّساق. لقطة سريعة — لا تُغني عن التعمّق في التفاصيل. |

### `entryQuality` — Entry Quality

| שפה | הסבר |
|---|---|
| **עברית** | דירוג (כוכבים) של עד כמה הכניסה תאמה ל-setup המתוכנן: עיתוי, מחיר, ואישור. דירוג גבוה עקבי הוא סימן למשמעת — גם כשהעסקה עצמה מפסידה. |
| **English** | A (star) rating of how well your entry matched the planned setup: timing, price, and confirmation. A consistently high rating signals discipline — even when the trade itself loses. |
| **Español** | Una calificación (estrellas) de cuán bien tu entrada coincidió con el setup planificado: timing, precio y confirmación. Una calificación alta y constante indica disciplina, incluso cuando la operación pierde. |
| **Português** | Uma classificação (estrelas) de quão bem a sua entrada correspondeu ao setup planeado: timing, preço e confirmação. Uma classificação alta e constante indica disciplina — mesmo quando a operação perde. |
| **العربية** | تقييم (بالنجوم) لمدى مطابقة دخولك للنموذج المخطّط: التوقيت، والسعر، والتأكيد. التقييم العالي المتّسق يدل على الانضباط — حتى عندما تخسر الصفقة نفسها. |

## מדדים נוספים

### `rr` — Risk / Reward · סיכון / סיכוי · R/R

| שפה | הסבר |
|---|---|
| **עברית** | יחס סיכון-סיכוי. כמה אתה עלול להרוויח מול כמה אתה מסכן. 3:1 = פוטנציאל רווח פי 3 מההפסד. |
| **English** | Risk/Reward. Potential profit vs. what you risk. 3:1 = you stand to make 3× what you'd lose. |
| **Español** | Riesgo/Beneficio. Beneficio potencial vs. lo que arriesgas. 3:1 = puedes ganar 3× lo que perderías. |
| **Português** | Risco/Retorno. Lucro potencial vs. o que arriscas. 3:1 = podes ganhar 3× o que perderias. |
| **العربية** | المخاطرة/العائد. الربح المحتمل مقابل ما تخاطر به. 3:1 = يمكنك ربح 3× ما قد تخسره. |

### `rMultiple` — R-Multiple

| שפה | הסבר |
|---|---|
| **עברית** | R-Multiple = (יציאה − כניסה) ÷ סיכון ראשוני<br><br>דוגמאות:<br>+2R = הרווחת פי 2 ממה שסיכנת ✓<br>+1R = הרווחת בדיוק מה שסיכנת ✓<br>-1R = הפסדת את הסיכון המתוכנן (נורמלי)<br>-2R = הסטופ לא כובד (בעיה)<br><br>מעקב אחר R-Multiple מסיר הטיית דולר ומאפשר השוואה אובייקטיבית בין עסקאות. |
| **English** | R-Multiple = (Exit − Entry) ÷ Initial Risk<br><br>Examples:<br>+2R = you made 2× what you risked ✓<br>+1R = made exactly what you risked ✓<br>-1R = lost your planned risk (normal)<br>-2R = stop was not honored (problem)<br><br>Tracking R-Multiple eliminates dollar bias and lets you compare trades objectively. |
| **Español** | R-Multiple = (Salida − Entrada) ÷ Riesgo Inicial<br><br>Ejemplos:<br>+2R = ganaste 2× lo que arriesgaste ✓<br>+1R = ganaste exactamente lo que arriesgaste ✓<br>-1R = perdiste tu riesgo planificado (normal)<br>-2R = el stop no se respetó (problema)<br><br>Seguir el R-Multiple elimina el sesgo del dólar y te permite comparar operaciones objetivamente. |
| **Português** | R-Multiple = (Saída − Entrada) ÷ Risco Inicial<br><br>Exemplos:<br>+2R = ganhaste 2× o que arriscaste ✓<br>+1R = ganhaste exatamente o que arriscaste ✓<br>-1R = perdeste o teu risco planeado (normal)<br>-2R = o stop não foi respeitado (problema)<br><br>Acompanhar o R-Multiple elimina o viés do dólar e permite comparar operações objetivamente. |
| **العربية** | R-Multiple = (الخروج − الدخول) ÷ المخاطرة الأوّلية<br><br>أمثلة:<br>+2R = ربحت 2× ما خاطرت به ✓<br>+1R = ربحت تماماً ما خاطرت به ✓<br>-1R = خسرت مخاطرتك المخطّطة (طبيعي)<br>-2R = لم يُحترم وقف الخسارة (مشكلة)<br><br>تتبّع R-Multiple يزيل انحياز الدولار ويتيح لك مقارنة الصفقات موضوعياً. |

### `mfeMae` — MFE / MAE

| שפה | הסבר |
|---|---|
| **עברית** | כמה רחוק לטובתך הלכה העסקה (MFE) וכמה נגדך (MAE) לפני הסגירה. עוזר לכוון סטופים ויעדים. |
| **English** | How far a trade ran in your favor (MFE) and against you (MAE) before it closed. Helps tune stops and targets. |
| **Español** | Cuán lejos llegó una operación a tu favor (MFE) y en tu contra (MAE) antes de cerrarse. Ayuda a afinar stops y objetivos. |
| **Português** | Quão longe uma operação foi a teu favor (MFE) e contra ti (MAE) antes de fechar. Ajuda a afinar stops e alvos. |
| **العربية** | إلى أي مدى تحرّكت الصفقة لصالحك (MFE) وضدّك (MAE) قبل إغلاقها. يساعد في ضبط أوامر الوقف والأهداف. |

### `wilson` — Wilson Score · ציון Wilson

| שפה | הסבר |
|---|---|
| **עברית** | אומדן זהיר לאחוז הזכייה ה"אמיתי" שלך כשמספר העסקאות קטן. מונע אשליה מסדרה קצרה של ניצחונות. |
| **English** | A cautious estimate of your "true" win rate when sample size is small. Stops a short hot streak from fooling you. |
| **Español** | Una estimación cautelosa de tu win rate "real" cuando el tamaño de muestra es pequeño. Evita que una racha corta te engañe. |
| **Português** | Uma estimativa cautelosa da tua win rate "real" quando o tamanho da amostra é pequeno. Evita que uma sequência curta te engane. |
| **العربية** | تقدير حذِر لنسبة ربحك "الحقيقية" عندما يكون حجم العيّنة صغيراً. يمنع سلسلة قصيرة ساخنة من خداعك. |

### `rrBucket3plus` — R/R 3+

| שפה | הסבר |
|---|---|
| **עברית** | קבוצת עסקאות עם יחס סיכון/סיכוי של 3 ומעלה: הרווח הפוטנציאלי גדול פי 3 לפחות מהסיכון. אלה העסקאות האיכותיות ביותר מבחינת יחס — גם אם אחוז ההצלחה נמוך, מספיק לנצח בחלקן כדי להיות רווחי. |
| **English** | A group of trades with a risk/reward ratio of 3 or higher — the potential reward is at least 3× the risk. These are the highest-quality trades by ratio: even with a low win rate, winning a fraction of them is enough to be profitable. |
| **Español** | Un grupo de operaciones con una relación riesgo/beneficio de 3 o más: la recompensa potencial es al menos 3× el riesgo. Son las operaciones de mayor calidad por ratio: incluso con una tasa de aciertos baja, ganar una fracción basta para ser rentable. |
| **Português** | Um grupo de operações com uma relação risco/retorno de 3 ou mais: o retorno potencial é pelo menos 3× o risco. São as operações de maior qualidade por rácio: mesmo com uma taxa de acertos baixa, ganhar uma fração já basta para ser lucrativo. |
| **العربية** | مجموعة صفقات بنسبة مخاطرة/عائد تبلغ 3 أو أكثر: العائد المحتمل لا يقل عن 3 أضعاف المخاطرة. هذه أعلى الصفقات جودةً من حيث النسبة: حتى مع نسبة نجاح منخفضة، يكفي الربح في جزء منها لتحقيق الربحية. |

## מושגים / AI

### `dna` — Trading DNA · DNA מסחרי

| שפה | הסבר |
|---|---|
| **עברית** | ה-DNA המסחרי שלך מודד 4 ממדים מרכזיים:<br><br>• ניהול סיכון (0-100): כמה טוב אתה שולט בהפסדים<br>• משמעת (0-100): האם אתה עוקב אחר הכללים שלך?<br>• עקביות (0-100): תוצאות יציבות בתנאים שונים<br>• צמיחה (0-100): האם אתה משתפר לאורך זמן?<br><br>מבוסס על היסטוריית העסקאות האמיתית שלך — לא הערכה עצמית. |
| **English** | Your Trading DNA measures 4 core dimensions of your trading personality:<br><br>• Risk Management (0-100): How well you control losses<br>• Discipline (0-100): Do you follow your rules?<br>• Consistency (0-100): Stable results across different conditions<br>• Growth (0-100): Are you improving over time?<br><br>Based on your actual trade history — not self-assessment. |
| **Español** | Tu Trading DNA mide 4 dimensiones centrales de tu personalidad como trader:<br><br>• Gestión de Riesgo (0-100): Qué tan bien controlas las pérdidas<br>• Disciplina (0-100): ¿Sigues tus reglas?<br>• Consistencia (0-100): Resultados estables en distintas condiciones<br>• Crecimiento (0-100): ¿Estás mejorando con el tiempo?<br><br>Basado en tu historial real de operaciones — no en autoevaluación. |
| **Português** | O teu Trading DNA mede 4 dimensões centrais da tua personalidade como trader:<br><br>• Gestão de Risco (0-100): Quão bem controlas as perdas<br>• Disciplina (0-100): Segues as tuas regras?<br>• Consistência (0-100): Resultados estáveis em diferentes condições<br>• Crescimento (0-100): Estás a melhorar com o tempo?<br><br>Baseado no teu histórico real de operações — não em autoavaliação. |
| **العربية** | يقيس Trading DNA الخاص بك 4 أبعاد أساسية لشخصيتك كمتداول:<br><br>• إدارة المخاطر (0-100): مدى تحكّمك في الخسائر<br>• الانضباط (0-100): هل تتّبع قواعدك؟<br>• الاتّساق (0-100): نتائج مستقرّة عبر ظروف مختلفة<br>• النموّ (0-100): هل تتحسّن مع الوقت؟<br><br>مبني على سجلّ صفقاتك الحقيقي — لا على التقييم الذاتي. |

### `edge` — Edge

| שפה | הסבר |
|---|---|
| **עברית** | ה-Edge שלך — סטאפים שבהם יש לך יתרון סטטיסטי משמעותי לפי היסטוריית העסקאות האמיתית שלך.<br><br>אחוז זכייה גבוה + R ממוצע חיובי = Edge אמיתי. אלה הסטאפים שעליך לסחור הכי הרבה. השוק משלם לך על אלה. |
| **English** | Your Edge — setups where you have a statistically significant advantage based on your actual trade history.<br><br>High win rate + positive average R = real edge. These are the setups you should trade most. The market is paying you to do these. |
| **Español** | Tu Edge — setups donde tienes una ventaja estadísticamente significativa según tu historial real de operaciones.<br><br>Alta win rate + R promedio positivo = edge real. Estos son los setups que más deberías operar. El mercado te paga por hacerlos. |
| **Português** | O teu Edge — setups onde tens uma vantagem estatisticamente significativa segundo o teu histórico real de operações.<br><br>Win rate alta + R médio positivo = edge real. Estes são os setups que mais deves operar. O mercado paga-te para os fazeres. |
| **العربية** | الـ Edge الخاص بك — نماذج دخول تملك فيها أفضلية ذات دلالة إحصائية بناءً على سجلّ صفقاتك الحقيقي.<br><br>نسبة ربح عالية + متوسّط R موجب = أفضلية حقيقية. هذه النماذج هي التي يجب أن تتداولها أكثر. السوق يدفع لك مقابل تنفيذها. |

### `antiEdge` — Anti-Edge

| שפה | הסבר |
|---|---|
| **עברית** | Anti-Edge — סטאפים שבהם אתה מפסיד כסף באופן עקבי לפי היסטוריית העסקאות שלך.<br><br>אחוז זכייה נמוך + R שלילי = ה-Anti-Edge האישי שלך. תתקן אותם (תלמד למה הם נכשלים עבורך) או תפסיק לסחור אותם לחלוטין.<br><br>הימנעות מ-Anti-Edge חשובה כמו ניצול Edge. |
| **English** | Anti-Edge — setups where you consistently lose money based on your trade history.<br><br>Low win rate + negative R = your personal anti-edge. Either fix these setups (study why they fail for you) or stop trading them entirely.<br><br>Avoiding anti-edges is as important as exploiting edges. |
| **Español** | Anti-Edge — setups donde pierdes dinero de forma consistente según tu historial de operaciones.<br><br>Win rate baja + R negativo = tu anti-edge personal. O corriges estos setups (estudia por qué te fallan) o dejas de operarlos por completo.<br><br>Evitar los anti-edges es tan importante como explotar los edges. |
| **Português** | Anti-Edge — setups onde perdes dinheiro de forma consistente segundo o teu histórico de operações.<br><br>Win rate baixa + R negativo = o teu anti-edge pessoal. Ou corriges estes setups (estuda por que te falham) ou deixas de os operar por completo.<br><br>Evitar os anti-edges é tão importante como explorar os edges. |
| **العربية** | Anti-Edge — نماذج دخول تخسر فيها المال باستمرار بناءً على سجلّ صفقاتك.<br><br>نسبة ربح منخفضة + R سالب = الأنتي-إيدج الشخصي لديك. إمّا أن تُصلح هذه النماذج (ادرس لماذا تفشل معك) أو تتوقّف عن تداولها نهائياً.<br><br>تجنّب الأنتي-إيدج لا يقلّ أهمية عن استغلال الإيدج. |

### `tilt` — Tilt

| שפה | הסבר |
|---|---|
| **עברית** | Tilt — מצב רגשי שגורם לסטייה מכללי המסחר שלך.<br><br>נפוץ אחרי: הפסדים גדולים, פספוס תנועה גדולה, או סדרת ניצחונות שיוצרת בטחון יתר.<br><br>סימנים: הגדלת גודל פוזיציה, מסחר תכוף יותר, התעלמות מסטופים.<br><br>מניעה: הפסקה חובה אחרי 2+ הפסדים רצופים. |
| **English** | Tilt — emotional state that causes you to deviate from your trading rules.<br><br>Common after: large losses, missing a big move, or a string of wins creating overconfidence.<br><br>Signs: increasing position size, trading more frequently, ignoring stops.<br><br>Prevention: mandatory break after 2+ consecutive losses. |
| **Español** | Tilt — estado emocional que te hace desviarte de tus reglas de trading.<br><br>Común tras: grandes pérdidas, perderte un gran movimiento, o una racha de ganancias que genera exceso de confianza.<br><br>Señales: aumentar el tamaño de posición, operar con más frecuencia, ignorar los stops.<br><br>Prevención: pausa obligatoria tras 2+ pérdidas consecutivas. |
| **Português** | Tilt — estado emocional que te faz desviar das tuas regras de trading.<br><br>Comum após: grandes perdas, perder um grande movimento, ou uma sequência de ganhos que gera excesso de confiança.<br><br>Sinais: aumentar o tamanho de posição, operar com mais frequência, ignorar os stops.<br><br>Prevenção: pausa obrigatória após 2+ perdas consecutivas. |
| **العربية** | Tilt — حالة عاطفية تجعلك تنحرف عن قواعد تداولك.<br><br>شائعة بعد: خسائر كبيرة، أو تفويت حركة كبيرة، أو سلسلة انتصارات تولّد ثقة مفرطة.<br><br>العلامات: زيادة حجم الصفقة، التداول بوتيرة أعلى، تجاهل أوامر الوقف.<br><br>الوقاية: استراحة إلزامية بعد خسارتين متتاليتين أو أكثر. |

### `marketRegime` — Market Regime · מצב שוק

| שפה | הסבר |
|---|---|
| **עברית** | מצב שוק — סביבת השוק הנוכחית שמשפיעה על אילו סטאפים עובדים הכי טוב.<br><br>• מגמה שורית: מומנטום, פריצות, כניסות בתיקון עובדות הכי טוב<br>• מגמה דובית: סטאפי שורט, פייד של עליות, הקטן גודל<br>• עצור/טווח: היפוך ממוצע, הימנע מפריצות<br>• תנודתי: הקטן גודל ב-50%, הרחב סטופים |
| **English** | Market Regime — current market environment that affects which setups work best.<br><br>• Bull Trend: Momentum, breakouts, pullback entries work best<br>• Bear Trend: Short setups, fade the rip, reduce size<br>• Sideways/Range: Mean-reversion, avoid breakouts<br>• Volatile: Reduce size by 50%, widen stops |
| **Español** | Régimen de Mercado — el entorno de mercado actual que afecta qué setups funcionan mejor.<br><br>• Tendencia Alcista: Momentum, breakouts, entradas en pullback funcionan mejor<br>• Tendencia Bajista: Setups en corto, fade del rebote, reduce tamaño<br>• Lateral/Rango: Reversión a la media, evita breakouts<br>• Volátil: Reduce tamaño 50%, amplía stops |
| **Português** | Regime de Mercado — o ambiente de mercado atual que afeta quais setups funcionam melhor.<br><br>• Tendência de Alta: Momentum, breakouts, entradas em pullback funcionam melhor<br>• Tendência de Baixa: Setups vendidos, fade do repique, reduz tamanho<br>• Lateral/Range: Reversão à média, evita breakouts<br>• Volátil: Reduz tamanho 50%, amplia stops |
| **العربية** | نظام السوق — بيئة السوق الحالية التي تؤثّر على أي النماذج تعمل بأفضل شكل.<br><br>• اتجاه صاعد: الزخم والاختراقات والدخول عند التراجع تعمل بأفضل شكل<br>• اتجاه هابط: نماذج البيع، fade الارتداد، قلّل الحجم<br>• عرضي/نطاق: العودة للمتوسّط، تجنّب الاختراقات<br>• متقلّب: قلّل الحجم 50%، وسّع أوامر الوقف |

### `discipline` — Discipline · משמעת

| שפה | הסבר |
|---|---|
| **עברית** | האם עקבת אחרי התוכנית: סטופ, גודל פוזיציה ויעד — בלי לסטות מרגש. הליבה של רווחיות לאורך זמן. |
| **English** | Whether you followed your plan — stop, size, target — without emotional deviation. The core of long-term profitability. |
| **Español** | Si seguiste tu plan — stop, tamaño, objetivo — sin desviación emocional. El núcleo de la rentabilidad a largo plazo. |
| **Português** | Se seguiste o teu plano — stop, tamanho, alvo — sem desvio emocional. O núcleo da rentabilidade a longo prazo. |
| **العربية** | ما إذا كنت اتّبعت خطّتك — وقف الخسارة، الحجم، الهدف — دون انحراف عاطفي. جوهر الربحية على المدى الطويل. |

### `dnaRisk` — Risk

| שפה | הסבר |
|---|---|
| **עברית** | מודד עד כמה אתה עקבי בניהול סיכון: גודל פוזיציה אחיד, הקפדה על stop, ואי-חריגה מהסיכון המתוכנן לעסקה. ציון נמוך = סיכון לא עקבי, הסכנה הגדולה ביותר לחשבון. |
| **English** | Measures how consistent you are at managing risk: uniform position size, respecting stops, and not exceeding your planned per-trade risk. A low score means inconsistent risk — the single biggest threat to an account. |
| **Español** | Mide cuán consistente eres gestionando el riesgo: tamaño de posición uniforme, respetar los stops y no superar el riesgo planificado por operación. Una puntuación baja significa riesgo inconsistente, la mayor amenaza para una cuenta. |
| **Português** | Mede o quão consistente você é na gestão de risco: tamanho de posição uniforme, respeitar os stops e não exceder o risco planeado por operação. Uma pontuação baixa significa risco inconsistente — a maior ameaça a uma conta. |
| **العربية** | يقيس مدى اتّساقك في إدارة المخاطر: حجم صفقة موحّد، واحترام أوامر وقف الخسارة، وعدم تجاوز المخاطرة المخطّطة لكل صفقة. الدرجة المنخفضة تعني مخاطرة غير متّسقة — وهي أكبر تهديد للحساب. |

### `dnaConsistency` — Consistency

| שפה | הסבר |
|---|---|
| **עברית** | מודד את יציבות הביצועים לאורך זמן: האם התוצאות אחידות, או תלויות בכמה עסקאות ענק. עקביות גבוהה = שיטה שניתן לסמוך עליה; נמוכה = תוצאות אקראיות. |
| **English** | Measures the stability of your performance over time: are results uniform, or dependent on a few huge trades. High consistency means a method you can rely on; low means random results. |
| **Español** | Mide la estabilidad de tu rendimiento a lo largo del tiempo: si los resultados son uniformes o dependen de unas pocas operaciones enormes. Alta consistencia es un método fiable; baja, resultados aleatorios. |
| **Português** | Mede a estabilidade do seu desempenho ao longo do tempo: se os resultados são uniformes ou dependem de poucas operações enormes. Alta consistência é um método confiável; baixa, resultados aleatórios. |
| **العربية** | يقيس استقرار أدائك عبر الزمن: هل النتائج متّسقة أم تعتمد على عدد قليل من الصفقات الضخمة. الاتّساق العالي يعني منهجاً يمكن الاعتماد عليه؛ والمنخفض يعني نتائج عشوائية. |

### `dnaGrowth` — Growth

| שפה | הסבר |
|---|---|
| **עברית** | מודד את מגמת השיפור שלך: האם אתה לומד מהנתונים ומשתפר לאורך זמן, או חוזר על אותן טעויות. ציון עולה = העקומה הנכונה לסוחר מתפתח. |
| **English** | Measures your improvement trend: are you learning from the data and getting better over time, or repeating the same mistakes. A rising score is the right curve for a developing trader. |
| **Español** | Mide tu tendencia de mejora: si aprendes de los datos y mejoras con el tiempo, o repites los mismos errores. Una puntuación creciente es la curva correcta para un trader en desarrollo. |
| **Português** | Mede a sua tendência de melhoria: se aprende com os dados e melhora ao longo do tempo, ou repete os mesmos erros. Uma pontuação crescente é a curva certa para um trader em desenvolvimento. |
| **العربية** | يقيس اتجاه تحسّنك: هل تتعلّم من البيانات وتتحسّن مع الوقت، أم تكرّر الأخطاء نفسها. الدرجة المتصاعدة هي المنحنى الصحيح للمتداول الذي يتطوّر. |

## ניהול סיכון

### `riskPerTrade` — Risk per Trade · סיכון לעסקה

| שפה | הסבר |
|---|---|
| **עברית** | סיכון מקסימלי לעסקה כאחוז מהחשבון הכולל.<br><br>סטנדרט מקצועי:<br>• 1% לעסקה = שמרני, בר-קיימא<br>• 2% לעסקה = מתון, עדיין מקובל<br>• 5%+ לעסקה = טריטוריית הימור<br><br>'סיכון פשיטת רגל' עולה באופן מעריכי מעל 2% לעסקה. |
| **English** | Maximum risk per trade as % of total account.<br><br>Professional standard:<br>• 1% per trade = conservative, sustainable<br>• 2% per trade = moderate, still acceptable<br>• 5%+ per trade = gambling territory<br><br>'Risk of ruin' increases exponentially above 2% per trade. |
| **Español** | Riesgo máximo por operación como % del total de la cuenta.<br><br>Estándar profesional:<br>• 1% por operación = conservador, sostenible<br>• 2% por operación = moderado, aún aceptable<br>• 5%+ por operación = territorio de apuestas<br><br>El 'riesgo de ruina' aumenta exponencialmente por encima del 2% por operación. |
| **Português** | Risco máximo por operação como % do total da conta.<br><br>Padrão profissional:<br>• 1% por operação = conservador, sustentável<br>• 2% por operação = moderado, ainda aceitável<br>• 5%+ por operação = território de apostas<br><br>O 'risco de ruína' aumenta exponencialmente acima de 2% por operação. |
| **العربية** | أقصى مخاطرة لكل صفقة كنسبة % من إجمالي الحساب.<br><br>المعيار الاحترافي:<br>• 1% لكل صفقة = متحفّظ، مستدام<br>• 2% لكل صفقة = معتدل، لا يزال مقبولاً<br>• 5%+ لكل صفقة = منطقة مقامرة<br><br>'مخاطر الإفلاس' ترتفع أُسّياً فوق 2% لكل صفقة. |

### `riskLimits` — Risk Limits · תקרות סיכון

| שפה | הסבר |
|---|---|
| **עברית** | שתי תקרות נפרדות שעובדות יחד:<br><br>• סיכון/עסקה (1%) — המקסימום שאתה מסכן בפוזיציה בודדת.<br>• מקסימום סיכון מותר (3%) — המקסימום שאתה מסכן בכל הפוזיציות הפתוחות יחד.<br><br>כלומר אפשר להחזיק בערך 3 עסקאות בגודל מלא בו-זמנית לפני שמגיעים לתקרת הסיכון של התיק. |
| **English** | Two separate limits work together:<br><br>• Risk/Trade (1%) — the most you risk on a single position.<br>• Max Allowed Risk (3%) — the most you risk across ALL open positions combined.<br><br>So you can hold roughly 3 full-size trades at once before hitting your portfolio risk cap. |
| **Español** | Dos límites separados funcionan juntos:<br><br>• Riesgo/Operación (1%) — lo máximo que arriesgas en una sola posición.<br>• Riesgo Máximo Permitido (3%) — lo máximo que arriesgas en TODAS las posiciones abiertas combinadas.<br><br>Así puedes mantener unas 3 operaciones de tamaño completo a la vez antes de alcanzar tu tope de riesgo de cartera. |
| **Português** | Dois limites separados funcionam juntos:<br><br>• Risco/Operação (1%) — o máximo que arriscas numa única posição.<br>• Risco Máximo Permitido (3%) — o máximo que arriscas em TODAS as posições abertas combinadas.<br><br>Assim podes manter cerca de 3 operações de tamanho completo ao mesmo tempo antes de atingir o teto de risco da carteira. |
| **العربية** | حدّان منفصلان يعملان معاً:<br><br>• المخاطرة/الصفقة (1%) — أقصى ما تخاطر به في صفقة واحدة.<br>• أقصى مخاطرة مسموحة (3%) — أقصى ما تخاطر به في جميع الصفقات المفتوحة مجتمعةً.<br><br>أي يمكنك الاحتفاظ بنحو 3 صفقات بحجم كامل في آنٍ واحد قبل بلوغ سقف مخاطر المحفظة. |

### `positionSize` — Position Size · גודל פוזיציה

| שפה | הסבר |
|---|---|
| **עברית** | גודל פוזיציה = (גודל חשבון × % סיכון) ÷ (כניסה − סטופ לוס)<br><br>דוגמה: חשבון $10,000, סיכון 1%, כניסה $100, סטופ $97:<br>פוזיציה = $100 ÷ $3 = 33 מניות<br><br>תמיד חשב לפני כניסה. לעולם אל תסיז לפי תחושה. |
| **English** | Position Size = (Account Size × Risk %) ÷ (Entry − Stop Loss)<br><br>Example: $10,000 account, 1% risk, $100 entry, $97 stop:<br>Position = $100 ÷ $3 = 33 shares<br><br>Always calculate before entry. Never size by feel. |
| **Español** | Tamaño de Posición = (Tamaño de Cuenta × % Riesgo) ÷ (Entrada − Stop Loss)<br><br>Ejemplo: cuenta de $10,000, 1% de riesgo, entrada $100, stop $97:<br>Posición = $100 ÷ $3 = 33 acciones<br><br>Calcula siempre antes de entrar. Nunca dimensiones por intuición. |
| **Português** | Tamanho de Posição = (Tamanho da Conta × % Risco) ÷ (Entrada − Stop Loss)<br><br>Exemplo: conta de $10,000, 1% de risco, entrada $100, stop $97:<br>Posição = $100 ÷ $3 = 33 ações<br><br>Calcula sempre antes de entrar. Nunca dimensiones por intuição. |
| **العربية** | حجم الصفقة = (حجم الحساب × % المخاطرة) ÷ (الدخول − وقف الخسارة)<br><br>مثال: حساب $10,000، مخاطرة 1%، دخول $100، وقف $97:<br>الصفقة = $100 ÷ $3 = 33 سهماً<br><br>احسب دائماً قبل الدخول. لا تحدّد الحجم بالإحساس أبداً. |

### `stopLoss` — Stop Loss · סטופ לוס

| שפה | הסבר |
|---|---|
| **עברית** | סטופ לוס — רמת המחיר שבה יוצאים מעסקה מפסידה כדי למנוע הפסדים גדולים יותר.<br><br>הצב ברמה טכנית הגיונית:<br>• מתחת לתמיכה מרכזית (עסקאות לונג)<br>• מעל להתנגדות מרכזית (עסקאות שורט)<br>• לעולם לא שרירותי (למשל 'רק $0.50 מתחת לכניסה')<br><br>סטופ לוס הוא לא אופציונלי — הוא הבסיס של ניהול הסיכון. |
| **English** | Stop Loss — the price level where you exit a losing trade to prevent larger losses.<br><br>Place at a logical technical level:<br>• Below key support (long trades)<br>• Above key resistance (short trades)<br>• Never arbitrary (e.g., 'just $0.50 below entry')<br><br>A stop loss is not optional — it's the foundation of risk management. |
| **Español** | Stop Loss — el nivel de precio donde sales de una operación perdedora para evitar pérdidas mayores.<br><br>Colócalo en un nivel técnico lógico:<br>• Por debajo de un soporte clave (operaciones largas)<br>• Por encima de una resistencia clave (operaciones cortas)<br>• Nunca arbitrario (p. ej., 'solo $0.50 bajo la entrada')<br><br>Un stop loss no es opcional — es la base de la gestión del riesgo. |
| **Português** | Stop Loss — o nível de preço onde sais de uma operação perdedora para evitar perdas maiores.<br><br>Coloca-o num nível técnico lógico:<br>• Abaixo de um suporte chave (operações compradas)<br>• Acima de uma resistência chave (operações vendidas)<br>• Nunca arbitrário (ex.: 'só $0.50 abaixo da entrada')<br><br>Um stop loss não é opcional — é a base da gestão de risco. |
| **العربية** | Stop Loss — مستوى السعر الذي تخرج عنده من صفقة خاسرة لتفادي خسائر أكبر.<br><br>ضعه عند مستوى فنّي منطقي:<br>• أسفل دعم رئيسي (صفقات الشراء)<br>• أعلى مقاومة رئيسية (صفقات البيع)<br>• ليس عشوائياً أبداً (مثلاً 'فقط $0.50 تحت الدخول')<br><br>وقف الخسارة ليس اختيارياً — إنه أساس إدارة المخاطر. |

### `takeProfit` — Take Profit

| שפה | הסבר |
|---|---|
| **עברית** | Take Profit — מחיר היעד שלך לסגירת עסקה מנצחת.<br><br>כלל מינימום: היעד חייב להיות לפחות 1.5× הסיכון שלך (1.5R).<br><br>שיטה טובה:<br>• צאת חלקית: קח 50% ב-1R, החזק שאר עד היעד<br>• השתמש ברמות טכניות (התנגדות, שיאים קודמים)<br>• לעולם אל תזיז יעד למטה בזמן שמנצחים |
| **English** | Take Profit — your target price for exiting a winning trade.<br><br>Minimum rule: Target must be at least 1.5× your risk (1.5R).<br><br>Best practice:<br>• Scale out: take 50% at 1R, hold rest to target<br>• Use technical levels (resistance, prior highs)<br>• Never move target lower when winning |
| **Español** | Take Profit — tu precio objetivo para salir de una operación ganadora.<br><br>Regla mínima: El objetivo debe ser al menos 1.5× tu riesgo (1.5R).<br><br>Buena práctica:<br>• Salida escalonada: toma 50% en 1R, mantén el resto hasta el objetivo<br>• Usa niveles técnicos (resistencia, máximos previos)<br>• Nunca muevas el objetivo más abajo cuando vas ganando |
| **Português** | Take Profit — o teu preço-alvo para sair de uma operação vencedora.<br><br>Regra mínima: O alvo deve ser pelo menos 1.5× o teu risco (1.5R).<br><br>Boa prática:<br>• Saída escalonada: tira 50% em 1R, mantém o resto até ao alvo<br>• Usa níveis técnicos (resistência, máximos anteriores)<br>• Nunca movas o alvo para baixo quando estás a ganhar |
| **العربية** | Take Profit — السعر المستهدف للخروج من صفقة رابحة.<br><br>القاعدة الدنيا: يجب أن يكون الهدف 1.5× مخاطرتك على الأقل (1.5R).<br><br>أفضل ممارسة:<br>• خروج تدريجي: خذ 50% عند 1R، واحتفظ بالباقي حتى الهدف<br>• استخدم مستويات فنّية (مقاومة، قمم سابقة)<br>• لا تحرّك الهدف للأسفل أبداً وأنت رابح |

## סטאפים

### `breakout` — Breakout

| שפה | הסבר |
|---|---|
| **עברית** | מחיר פורץ מעל רמת התנגדות חשובה עם נפח. עובד טוב בשוק מגמתי. |
| **English** | Price breaking above a key resistance level with volume. Best in trending markets. |
| **Español** | Precio rompiendo por encima de un nivel de resistencia clave con volumen. Funciona mejor en mercados con tendencia. |
| **Português** | Preço rompendo acima de um nível de resistência chave com volume. Funciona melhor em mercados com tendência. |
| **العربية** | السعر يخترق فوق مستوى مقاومة رئيسي مع حجم تداول. يعمل بأفضل شكل في الأسواق ذات الاتجاه. |

### `pullback` — Pullback

| שפה | הסבר |
|---|---|
| **עברית** | קנייה כשמחיר במגמת עלייה נסוג זמנית לעבר תמיכה — ממוצע נע, רמת פריצה קודמת, או קו מגמה — ואז ממשיך לעלות. כניסה בתיקון נותנת מחיר טוב יותר ו-stop צמוד יותר מאשר מרדף. |
| **English** | Buying when an uptrending price temporarily retraces toward support — a moving average, a prior breakout level, or a trendline — then resumes higher. Entering on the dip gives a better price and a tighter stop than chasing. |
| **Español** | Comprar cuando un precio en tendencia alcista retrocede temporalmente hacia un soporte —una media móvil, un nivel de ruptura previo o una línea de tendencia— y luego retoma el alza. Entrar en el retroceso da mejor precio y un stop más ajustado que perseguir. |
| **Português** | Comprar quando um preço em tendência de alta recua temporariamente em direção a um suporte — uma média móvel, um nível de rompimento anterior ou uma linha de tendência — e depois retoma a alta. Entrar no recuo dá melhor preço e um stop mais apertado do que perseguir. |
| **العربية** | الشراء عندما يتراجع سعر في اتجاه صاعد مؤقتاً نحو دعم — متوسط متحرك، أو مستوى اختراق سابق، أو خط اتجاه — ثم يستأنف صعوده. الدخول عند التراجع يمنح سعراً أفضل ووقف خسارة أضيق من المطاردة. |

### `bullFlag` — Bull Flag

| שפה | הסבר |
|---|---|
| **עברית** | התכנסות צרה אחרי תנועה חדה למעלה. נפח חייב להצטמצם בזמן הדגל. |
| **English** | Tight consolidation after sharp move up. Volume should contract during the flag. |
| **Español** | Consolidación estrecha tras un movimiento brusco al alza. El volumen debe contraerse durante la bandera. |
| **Português** | Consolidação estreita após um movimento brusco de alta. O volume deve contrair durante a bandeira. |
| **العربية** | تماسك ضيّق بعد حركة صعودية حادّة. يجب أن ينكمش حجم التداول أثناء تكوّن العلم. |

### `ORBBreakout` — ORB Breakout

| שפה | הסבר |
|---|---|
| **עברית** | פריצת טווח פתיחה — שבירת שיא/שפל של 15-30 הדקות הראשונות. חזק בימי מגמה. |
| **English** | Opening Range Breakout — first 15-30 min high/low break. Strong on trend days. |
| **Español** | Opening Range Breakout — ruptura del máximo/mínimo de los primeros 15-30 min. Fuerte en días de tendencia. |
| **Português** | Opening Range Breakout — rompimento da máxima/mínima dos primeiros 15-30 min. Forte em dias de tendência. |
| **العربية** | Opening Range Breakout — اختراق قمة/قاع أول 15-30 دقيقة. قوي في أيام الاتجاه. |

### `VWAPReclaim` — VWAP Reclaim

| שפה | הסבר |
|---|---|
| **עברית** | מחיר חוזר מעל VWAP אחרי ירידה עם נפח. מעיד על קנייה מוסדית. |
| **English** | Price reclaiming VWAP after morning dip with volume. Indicates institutional buying. |
| **Español** | El precio recupera el VWAP tras una caída matinal con volumen. Indica compra institucional. |
| **Português** | O preço recupera o VWAP após uma queda matinal com volume. Indica compra institucional. |
| **العربية** | السعر يستعيد الـ VWAP بعد هبوط صباحي مع حجم تداول. يشير إلى شراء مؤسّسي. |

### `higherLow` — Higher Low

| שפה | הסבר |
|---|---|
| **עברית** | כל תיקון יוצר שפל גבוה יותר מהקודם. הסטאפ הנקי ביותר במגמה עולה. |
| **English** | Each pullback makes a higher low than the previous. Cleanest setup in uptrend. |
| **Español** | Cada retroceso forma un mínimo más alto que el anterior. El setup más limpio en tendencia alcista. |
| **Português** | Cada recuo forma um mínimo mais alto que o anterior. O setup mais limpo em tendência de alta. |
| **العربية** | كل تراجع يصنع قاعاً أعلى من السابق. أنظف نموذج في الاتجاه الصاعد. |

### `cupAndHandle` — Cup & Handle

| שפה | הסבר |
|---|---|
| **עברית** | התכנסות בצורת U עם ידית צרה מימין. תבנית המשך קלאסית. |
| **English** | U-shaped consolidation with tight handle on right. Classic continuation pattern. |
| **Español** | Consolidación en forma de U con un asa estrecha a la derecha. Patrón de continuación clásico. |
| **Português** | Consolidação em forma de U com uma alça estreita à direita. Padrão de continuação clássico. |
| **العربية** | تماسك على شكل حرف U مع مقبض ضيّق على اليمين. نموذج استمرار كلاسيكي. |

### `failedBreakout` — Failed Breakout

| שפה | הסבר |
|---|---|
| **עברית** | פריצה שמתהפכת מהר. מלכודת לקונים מאוחרים — שורט בחזרה מתחת לרמת הפריצה. |
| **English** | Breakout that quickly reverses. Trap for late buyers — short on reclaim of breakout level. |
| **Español** | Ruptura que se revierte rápidamente. Trampa para compradores tardíos — corto al recuperar el nivel de ruptura. |
| **Português** | Rompimento que se reverte rapidamente. Armadilha para compradores atrasados — vendido ao recuperar o nível de rompimento. |
| **العربية** | اختراق ينعكس بسرعة. فخّ للمشترين المتأخّرين — بيع عند العودة تحت مستوى الاختراق. |

### `overextendedFade` — Overextended Fade

| שפה | הסבר |
|---|---|
| **עברית** | עסקה נגד המגמה כשהמחיר 8%+ מעל 20 EMA עם RSI גבוה. דורש סבלנות. |
| **English** | Counter-trend trade when price is 8%+ above 20 EMA with high RSI. Requires patience. |
| **Español** | Operación contra-tendencia cuando el precio está 8%+ sobre la 20 EMA con RSI alto. Requiere paciencia. |
| **Português** | Operação contra-tendência quando o preço está 8%+ acima da 20 EMA com RSI alto. Exige paciência. |
| **العربية** | صفقة عكس الاتجاه عندما يكون السعر أعلى بـ 8%+ من الـ 20 EMA مع RSI مرتفع. تتطلّب صبراً. |

### `EMABounce50` — 50 EMA Bounce

| שפה | הסבר |
|---|---|
| **עברית** | תיקון אל 50 EMA בגרף יומי. תמיכה משמעותית במגמות עולות חזקות. |
| **English** | Pullback to 50 EMA on daily chart. Major support in strong uptrends. |
| **Español** | Retroceso a la 50 EMA en gráfico diario. Soporte importante en tendencias alcistas fuertes. |
| **Português** | Recuo à 50 EMA no gráfico diário. Suporte importante em tendências de alta fortes. |
| **العربية** | تراجع إلى الـ 50 EMA على الرسم اليومي. دعم مهم في الاتجاهات الصاعدة القوية. |

### `trendContinuation` — Trend Continuation

| שפה | הסבר |
|---|---|
| **עברית** | כניסה בתיקון רדוד אל 9 EMA במגמה מבוססת. סטופים צרים, R גבוה. |
| **English** | Entry on shallow pullback to 9 EMA in established trend. Tight stops, high R. |
| **Español** | Entrada en un retroceso superficial a la 9 EMA en una tendencia establecida. Stops ajustados, R alto. |
| **Português** | Entrada num recuo superficial à 9 EMA numa tendência estabelecida. Stops apertados, R alto. |
| **العربية** | الدخول عند تراجع سطحي إلى الـ 9 EMA في اتجاه راسخ. أوامر وقف ضيّقة، R مرتفع. |

### `gapAndGo` — Gap & Go

| שפה | הסבר |
|---|---|
| **עברית** | מניה פותחת בפער מעלה וממשיכה בלי למלא. הכי טוב עם קטליזטור חדשותי. |
| **English** | Stock gaps up at open and continues higher without filling. Best with news catalyst. |
| **Español** | La acción abre con hueco al alza y continúa sin rellenarlo. Mejor con un catalizador de noticias. |
| **Português** | A ação abre com gap de alta e continua sem preenchê-lo. Melhor com um catalisador de notícias. |
| **العربية** | يفتح السهم بفجوة صعودية ويواصل دون ملئها. أفضل مع محفّز إخباري. |

### `earningsGapPlay` — Earnings Gap Play

| שפה | הסבר |
|---|---|
| **עברית** | סחר בתגובת הפער אחרי דוחות. החזק זוכים, כסה בסימן הראשון של קנייה. |
| **English** | Trade the gap reaction post-earnings. Hold winners, cover into first sign of buying. |
| **Español** | Operar la reacción del hueco tras resultados. Mantén las ganadoras, cubre a la primera señal de compra. |
| **Português** | Operar a reação do gap após resultados. Mantenha as vencedoras, cubra ao primeiro sinal de compra. |
| **العربية** | تداول رد فعل الفجوة بعد نتائج الأرباح. احتفظ بالرابحة، وأغلق عند أول إشارة شراء. |

### `rangeBreakout` — Range Breakout

| שפה | הסבר |
|---|---|
| **עברית** | מחיר שובר מטווח של ימים/שבועות. הכי אמין כשהנפח מתרחב. |
| **English** | Price breaking out of multi-day/week range. Most reliable when volume expands. |
| **Español** | El precio rompe un rango de varios días/semanas. Más fiable cuando el volumen se expande. |
| **Português** | O preço rompe um range de vários dias/semanas. Mais confiável quando o volume se expande. |
| **العربية** | السعر يكسر نطاقاً امتدّ أياماً/أسابيع. أكثر موثوقية عندما يتوسّع حجم التداول. |

### `postEarningsStrength` — Post-Earnings Strength

| שפה | הסבר |
|---|---|
| **עברית** | מניה מחזיקה מעל פער-כלפי-מעלה אחרי דוחות חיוביים. סימן של צבירה מוסדית. |
| **English** | Stock holds above gap-up after earnings beat. Institutional accumulation signal. |
| **Español** | La acción se mantiene sobre el hueco alcista tras superar resultados. Señal de acumulación institucional. |
| **Português** | A ação mantém-se acima do gap de alta após superar resultados. Sinal de acumulação institucional. |
| **العربية** | يحافظ السهم على البقاء فوق الفجوة الصعودية بعد تجاوز التوقّعات. إشارة تجميع مؤسّسي. |

### `powerHourBreak` — Power Hour Break

| שפה | הסבר |
|---|---|
| **עברית** | פריצה בשעה האחרונה (15:00-16:00 ET). מיצוב מוסדי לקראת סגירה. |
| **English** | Breakout in last hour (3-4pm ET). Institutional positioning into close. |
| **Español** | Ruptura en la última hora (15:00-16:00 ET). Posicionamiento institucional hacia el cierre. |
| **Português** | Rompimento na última hora (15:00-16:00 ET). Posicionamento institucional rumo ao fecho. |
| **العربية** | اختراق في الساعة الأخيرة (15:00-16:00 ET). تموضع مؤسّسي قبيل الإغلاق. |

### `MOCFade` — MOC Fade

| שפה | הסבר |
|---|---|
| **עברית** | פייד של MOC. מסחר נגד תנועות קיצוניות לקראת סגירה לקראת היפוך למחרת. |
| **English** | Market-On-Close fade. Trade against extended moves into close for next-day reversal. |
| **Español** | Fade de Market-On-Close. Operar contra movimientos extendidos hacia el cierre para un giro al día siguiente. |
| **Português** | Fade de Market-On-Close. Operar contra movimentos estendidos rumo ao fecho para uma reversão no dia seguinte. |
| **العربية** | Fade على إغلاق السوق. التداول عكس الحركات الممتدّة قبيل الإغلاق توقّعاً لانعكاس في اليوم التالي. |

### `overnightHold` — Overnight Hold

| שפה | הסבר |
|---|---|
| **עברית** | עסקה המוחזקת ללילה. פוטנציאל רווח גבוה יותר אך חשופה לסיכון פער. |
| **English** | Trade held overnight. Higher reward potential but exposed to gap risk. |
| **Español** | Operación mantenida toda la noche. Mayor potencial de recompensa pero expuesta al riesgo de hueco. |
| **Português** | Operação mantida durante a noite. Maior potencial de retorno mas exposta ao risco de gap. |
| **العربية** | صفقة محتفظ بها طوال الليل. إمكانية ربح أعلى لكنها معرّضة لمخاطر الفجوة. |

### `overnightReversal` — Overnight Reversal

| שפה | הסבר |
|---|---|
| **עברית** | מסחר היפוך של תנועת לילה בפתיחת השוק. נגד המגמה, דורש אישור. |
| **English** | Trade reversal of overnight move at market open. Counter-trend, requires confirmation. |
| **Español** | Operar el giro del movimiento nocturno en la apertura. Contra-tendencia, requiere confirmación. |
| **Português** | Operar a reversão do movimento noturno na abertura. Contra-tendência, exige confirmação. |
| **العربية** | تداول انعكاس حركة الليل عند افتتاح السوق. عكس الاتجاه، يتطلّب تأكيداً. |

### `supportBounce` — Support Bounce

| שפה | הסבר |
|---|---|
| **עברית** | קנייה כשהמחיר יורד לרמת תמיכה ידועה ומתהפך כלפי מעלה. ההיגיון: קונים מגנים על הרמה. ה-stop יושב מתחת לתמיכה — אם היא נשברת, הניתוח בטל. |
| **English** | Buying when price drops to a known support level and reverses up. The logic: buyers defend the level. The stop sits below support — if it breaks, the thesis is void. |
| **Español** | Comprar cuando el precio cae a un nivel de soporte conocido y rebota al alza. La lógica: los compradores defienden el nivel. El stop va debajo del soporte; si se rompe, la tesis queda anulada. |
| **Português** | Comprar quando o preço cai a um nível de suporte conhecido e reverte para cima. A lógica: os compradores defendem o nível. O stop fica abaixo do suporte; se romper, a tese é anulada. |
| **العربية** | الشراء عندما يهبط السعر إلى مستوى دعم معروف ثم ينعكس صعوداً. المنطق: المشترون يدافعون عن المستوى. يوضع وقف الخسارة أسفل الدعم — وإذا انكسر، تسقط الفكرة. |

### `resistanceBreak` — Resistance Break

| שפה | הסבר |
|---|---|
| **עברית** | כניסה כשהמחיר פורץ מעל רמת התנגדות שבלמה אותו בעבר, רצוי בנפח גבוה. הפריצה מסמנת שקונים השתלטו. שונה מ-Breakout כללי בכך שהיא ממוקדת ברמה ספציפית. |
| **English** | Entering when price breaks above a resistance level that previously capped it, ideally on high volume. The break signals buyers have taken control. Differs from a generic Breakout by targeting one specific level. |
| **Español** | Entrar cuando el precio rompe por encima de un nivel de resistencia que antes lo frenaba, idealmente con volumen alto. La ruptura indica que los compradores tomaron el control. Se diferencia de un Breakout genérico por enfocarse en un nivel específico. |
| **Português** | Entrar quando o preço rompe acima de um nível de resistência que antes o travava, idealmente com volume alto. O rompimento sinaliza que os compradores assumiram o controlo. Difere de um Breakout genérico por focar num nível específico. |
| **العربية** | الدخول عندما يخترق السعر مستوى مقاومة كان يكبحه سابقاً، ويُفضّل بحجم تداول عالٍ. الاختراق يشير إلى أن المشترين سيطروا. يختلف عن الـ Breakout العام بتركيزه على مستوى محدّد. |

### `pullback20EMA` — Pullback to 20 EMA

| שפה | הסבר |
|---|---|
| **עברית** | קנייה כשמחיר במגמת עלייה נסוג אל הממוצע הנע של 20 תקופות ומתהפך משם. ה-20 EMA משמש כתמיכה דינמית; הסטאפ מצרף מגמה + נקודת כניסה מדויקת. |
| **English** | Buying when an uptrending price pulls back to the 20-period moving average and bounces. The 20 EMA acts as dynamic support; this setup combines trend with a precise entry point. |
| **Español** | Comprar cuando un precio en tendencia alcista retrocede a la media móvil de 20 períodos y rebota. La 20 EMA actúa como soporte dinámico; este setup combina tendencia con un punto de entrada preciso. |
| **Português** | Comprar quando um preço em tendência de alta recua à média móvel de 20 períodos e ressalta. A 20 EMA atua como suporte dinâmico; este setup combina tendência com um ponto de entrada preciso. |
| **العربية** | الشراء عندما يرتد سعر في اتجاه صاعد إلى المتوسط المتحرك لـ 20 فترة ثم يرتدّ منه. يعمل الـ 20 EMA كدعم ديناميكي؛ ويجمع هذا النموذج بين الاتجاه ونقطة دخول دقيقة. |

## רגשות

### `emotionConfident` — Confident

| שפה | הסבר |
|---|---|
| **עברית** | ביטחון מבוסס ניתוח, לא יוהרה. כשהוא נשען על setup תקף — מוביל לביצוע ממושמע. כשהוא הופך לביטחון-יתר אחרי רצף נצחונות, הוא מסוכן. |
| **English** | Confidence grounded in analysis, not bravado. When based on a valid setup it drives disciplined execution; when it tips into overconfidence after a win streak, it becomes risky. |
| **Español** | Confianza basada en el análisis, no en la arrogancia. Sobre un setup válido impulsa una ejecución disciplinada; si se convierte en exceso de confianza tras una racha ganadora, se vuelve peligrosa. |
| **Português** | Confiança baseada na análise, não em arrogância. Sobre um setup válido gera execução disciplinada; se virar excesso de confiança após uma sequência de vitórias, torna-se arriscada. |
| **العربية** | ثقة مبنية على التحليل وليست غروراً. عندما تستند إلى نموذج دخول صحيح تؤدي إلى تنفيذ منضبط؛ وعندما تتحول إلى ثقة مفرطة بعد سلسلة انتصارات تصبح خطيرة. |

### `emotionCalm` — Calm

| שפה | הסבר |
|---|---|
| **עברית** | המצב הרגשי האופטימלי לסוחר. שלווה מאפשרת לעקוב אחרי התוכנית בלי לרדוף או להיבהל. עסקאות שנפתחות ברוגע נוטות לדבוק ב-stop וב-target. |
| **English** | The optimal emotional state for a trader. Calm lets you follow your plan without chasing or panicking. Trades opened calmly tend to respect their stop and target. |
| **Español** | El estado emocional óptimo para un trader. La calma te permite seguir tu plan sin perseguir ni entrar en pánico. Las operaciones abiertas con calma tienden a respetar su stop y objetivo. |
| **Português** | O estado emocional ideal para um trader. A calma permite seguir o seu plano sem perseguir nem entrar em pânico. Operações abertas com calma tendem a respeitar o stop e o alvo. |
| **العربية** | الحالة العاطفية المثلى للمتداول. الهدوء يتيح لك اتّباع خطتك دون مطاردة أو ذعر. الصفقات التي تُفتح بهدوء تميل إلى احترام وقف الخسارة والهدف. |

### `emotionPatient` — Patient

| שפה | הסבר |
|---|---|
| **עברית** | המתנה ל-setup שבאמת עומד בקריטריונים, במקום להיכנס לכל תנועה. סבלנות היא לרוב ההבדל בין סוחר רווחי למפסיד — היא מסננת עסקאות באיכות נמוכה. |
| **English** | Waiting for a setup that genuinely meets your criteria instead of entering every move. Patience is often what separates a profitable trader from a losing one — it filters out low-quality trades. |
| **Español** | Esperar un setup que realmente cumpla tus criterios en lugar de entrar en cada movimiento. La paciencia suele ser lo que separa a un trader rentable de uno perdedor: filtra las operaciones de baja calidad. |
| **Português** | Esperar por um setup que realmente cumpra os seus critérios em vez de entrar em cada movimento. A paciência costuma ser o que separa um trader lucrativo de um perdedor — filtra operações de baixa qualidade. |
| **العربية** | انتظار نموذج دخول يستوفي معاييرك فعلاً بدلاً من الدخول في كل حركة. الصبر غالباً ما يفصل بين المتداول الرابح والخاسر، فهو يُصفّي الصفقات منخفضة الجودة. |

### `emotionNeutral` — Neutral

| שפה | הסבר |
|---|---|
| **עברית** | כניסה ללא מטען רגשי — לא נלהב ולא חושש. מצב יציב שמאפשר החלטות אובייקטיביות לפי הנתונים בלבד. בסיס טוב, גם אם פחות חד מ-"רגוע". |
| **English** | Entering with no emotional charge — neither excited nor fearful. A stable state that allows objective, data-driven decisions. A solid baseline, even if less sharp than "Calm". |
| **Español** | Entrar sin carga emocional, ni eufórico ni temeroso. Un estado estable que permite decisiones objetivas basadas en datos. Una buena base, aunque menos afilada que "Calm". |
| **Português** | Entrar sem carga emocional — nem eufórico nem receoso. Um estado estável que permite decisões objetivas e baseadas em dados. Uma boa base, ainda que menos afiada que "Calm". |
| **العربية** | الدخول دون شحنة عاطفية، لا متحمّس ولا خائف. حالة مستقرة تتيح قرارات موضوعية مبنية على البيانات. أساس جيّد، وإن كان أقل حدّة من "Calm". |

### `emotionHesitant` — Hesitant

| שפה | הסבר |
|---|---|
| **עברית** | היסוס בכניסה — לרוב סימן ש-setup לא ברור או שביטחון העצמי נמוך. כניסות מהוססות נוטות לכניסה מאוחרת, stop קרוב מדי, או יציאה מוקדמת מפחד. |
| **English** | Hesitation at entry — usually a sign the setup isn't clear or confidence is low. Hesitant entries tend to mean entering late, placing the stop too tight, or exiting early out of fear. |
| **Español** | Vacilación en la entrada, normalmente señal de que el setup no está claro o la confianza es baja. Las entradas vacilantes suelen implicar entrar tarde, poner el stop demasiado ajustado o salir antes por miedo. |
| **Português** | Hesitação na entrada — geralmente sinal de que o setup não está claro ou a confiança está baixa. Entradas hesitantes tendem a significar entrar tarde, colocar o stop apertado demais ou sair cedo por medo. |
| **العربية** | التردّد عند الدخول، وغالباً ما يكون علامة على أن نموذج الدخول غير واضح أو أن الثقة منخفضة. الدخول المتردّد يميل إلى التأخّر في الدخول، أو وضع وقف خسارة ضيّق جداً، أو الخروج مبكراً بدافع الخوف. |

### `emotionNervous` — Nervous

| שפה | הסבר |
|---|---|
| **עברית** | מתח שמקשה על קבלת החלטות. עצבנות מובילה לבדיקת מחיר אובססיבית, הזזת stop, ויציאות פזיזות. לרוב מעידה על פוזיציה גדולה מדי או חוסר ביטחון ב-setup. |
| **English** | Tension that clouds decision-making. Nervousness leads to obsessive price-checking, moving the stop, and impulsive exits. Often a sign the position is too large or the setup isn't trusted. |
| **Español** | Tensión que nubla la toma de decisiones. El nerviosismo lleva a revisar el precio de forma obsesiva, mover el stop y salir impulsivamente. Suele indicar una posición demasiado grande o falta de confianza en el setup. |
| **Português** | Tensão que prejudica a tomada de decisão. O nervosismo leva a verificar o preço de forma obsessiva, mexer no stop e sair por impulso. Costuma indicar uma posição grande demais ou falta de confiança no setup. |
| **العربية** | توتّر يُشوّش اتخاذ القرار. العصبية تؤدي إلى مراقبة السعر بهوس، وتحريك وقف الخسارة، والخروج المتسرّع. وغالباً ما تدل على أن حجم الصفقة كبير جداً أو عدم الثقة في نموذج الدخول. |

### `emotionFOMO` — FOMO

| שפה | הסבר |
|---|---|
| **עברית** | "פחד מהחמצה" — כניסה לעסקה רק כי המחיר זז בחדות, בלי setup תקף. אחד הדפוסים ההפסדיים ביותר: כניסה מאוחרת, מרדף אחרי המחיר, ו-stop רחוק. דגל אזהרה. |
| **English** | "Fear Of Missing Out" — entering a trade just because price moved sharply, with no valid setup. One of the most destructive patterns: late entry, chasing price, and a distant stop. A red flag. |
| **Español** | "Miedo a quedarse fuera" — entrar en una operación solo porque el precio se movió con fuerza, sin un setup válido. Uno de los patrones más destructivos: entrada tardía, perseguir el precio y un stop lejano. Una señal de alerta. |
| **Português** | "Medo de ficar de fora" — entrar numa operação só porque o preço se moveu com força, sem um setup válido. Um dos padrões mais destrutivos: entrada tardia, perseguir o preço e um stop distante. Um sinal de alerta. |
| **العربية** | "الخوف من تفويت الفرصة" — الدخول في صفقة لمجرّد أن السعر تحرّك بحدّة، دون نموذج دخول صحيح. من أكثر الأنماط تدميراً: دخول متأخّر، ومطاردة السعر، ووقف خسارة بعيد. علامة تحذير. |

### `emotionAngry` — Angry

| שפה | הסבר |
|---|---|
| **עברית** | כעס אחרי הפסד — הדלק של "מסחר נקמה". במצב הזה הסוחר מנסה להחזיר הפסד מיד, מגדיל סיכון, ונכנס לעסקאות גרועות. זה המצב שבו מאבדים חשבונות. עצור. |
| **English** | Anger after a loss — the fuel of "revenge trading". In this state a trader tries to win back a loss immediately, raises risk, and takes bad trades. This is how accounts blow up. Stop. |
| **Español** | Ira tras una pérdida — el combustible del "trading de venganza". En este estado el trader intenta recuperar la pérdida de inmediato, aumenta el riesgo y entra en malas operaciones. Así se revientan las cuentas. Detente. |
| **Português** | Raiva após uma perda — o combustível do "trading de vingança". Nesse estado o trader tenta recuperar a perda de imediato, aumenta o risco e faz operações ruins. É assim que se destroem contas. Pare. |
| **العربية** | الغضب بعد الخسارة — وقود "التداول الانتقامي". في هذه الحالة يحاول المتداول استعادة خسارته فوراً، فيرفع المخاطرة ويدخل صفقات سيئة. هكذا تُدمَّر الحسابات. توقّف. |

## תנאי שוק

### `marketTrendingUp` — Trending Up

| שפה | הסבר |
|---|---|
| **עברית** | שוק במגמת עלייה: שיאים גבוהים יותר ושפלים גבוהים יותר. ה-setups של מסחר-לונג עובדים הכי טוב כאן; מסחר נגד המגמה מסוכן. |
| **English** | An uptrending market: higher highs and higher lows. Long setups work best here; trading against the trend is risky. |
| **Español** | Un mercado en tendencia alcista: máximos y mínimos más altos. Los setups en largo funcionan mejor aquí; operar contra la tendencia es arriesgado. |
| **Português** | Um mercado em tendência de alta: máximos e mínimos mais altos. Setups comprados funcionam melhor aqui; operar contra a tendência é arriscado. |
| **العربية** | سوق في اتجاه صاعد: قمم أعلى وقيعان أعلى. نماذج الشراء تعمل بأفضل شكل هنا؛ والتداول عكس الاتجاه محفوف بالمخاطر. |

### `marketTrendingDown` — Trending Down

| שפה | הסבר |
|---|---|
| **עברית** | שוק במגמת ירידה: שיאים נמוכים יותר ושפלים נמוכים יותר. setups של שורט עובדים הכי טוב; "תפיסת סכין נופלת" בלונג מסוכנת. |
| **English** | A downtrending market: lower highs and lower lows. Short setups work best; "catching a falling knife" with a long is dangerous. |
| **Español** | Un mercado en tendencia bajista: máximos y mínimos más bajos. Los setups en corto funcionan mejor; "atrapar un cuchillo que cae" en largo es peligroso. |
| **Português** | Um mercado em tendência de baixa: máximos e mínimos mais baixos. Setups vendidos funcionam melhor; "agarrar uma faca a cair" comprado é perigoso. |
| **العربية** | سوق في اتجاه هابط: قمم أدنى وقيعان أدنى. نماذج البيع تعمل بأفضل شكل؛ و"إمساك السكين الساقط" بصفقة شراء أمر خطير. |

### `marketSideways` — Sideways

| שפה | הסבר |
|---|---|
| **עברית** | שוק ללא מגמה ברורה, נע בטווח אופקי בין תמיכה להתנגדות. setups של מגמה נכשלים כאן; מסחר בטווח (קנייה בתמיכה, מכירה בהתנגדות) מתאים יותר. |
| **English** | A market with no clear trend, moving horizontally between support and resistance. Trend setups fail here; range trading (buy support, sell resistance) fits better. |
| **Español** | Un mercado sin tendencia clara, que se mueve horizontalmente entre soporte y resistencia. Los setups de tendencia fallan aquí; el trading de rango (comprar en soporte, vender en resistencia) encaja mejor. |
| **Português** | Um mercado sem tendência clara, movendo-se horizontalmente entre suporte e resistência. Setups de tendência falham aqui; o trading de range (comprar no suporte, vender na resistência) encaixa melhor. |
| **العربية** | سوق بلا اتجاه واضح، يتحرك أفقياً بين الدعم والمقاومة. نماذج الاتجاه تفشل هنا؛ والتداول ضمن النطاق (شراء عند الدعم، بيع عند المقاومة) أنسب. |

### `marketVolatile` — Volatile

| שפה | הסבר |
|---|---|
| **עברית** | שוק עם תנודות מחיר חדות ומהירות לשני הכיוונים. ה-stops נפגעים בקלות, גודל הפוזיציה צריך להיות קטן יותר. הזדמנויות גדולות אך סיכון גבוה. |
| **English** | A market with sharp, fast price swings in both directions. Stops get hit easily, and position size should be smaller. Big opportunities but high risk. |
| **Español** | Un mercado con oscilaciones de precio bruscas y rápidas en ambas direcciones. Los stops saltan con facilidad y el tamaño de la posición debe ser menor. Grandes oportunidades pero alto riesgo. |
| **Português** | Um mercado com oscilações de preço bruscas e rápidas nos dois sentidos. Os stops são atingidos com facilidade e o tamanho da posição deve ser menor. Grandes oportunidades, mas risco elevado. |
| **العربية** | سوق بتقلّبات سعرية حادّة وسريعة في الاتجاهين. تُضرب أوامر وقف الخسارة بسهولة، وينبغي تصغير حجم الصفقة. فرص كبيرة لكن مخاطرة عالية. |

## פעולות גרף

### `chartCalcPosition` — Calculate Position · חשב פוזיציה

| שפה | הסבר |
|---|---|
| **עברית** | ממלא אוטומטית את מחשבון הפוזיציה מהגרף הנוכחי — טיקר, מחיר חי ככניסה, סטופ מגן ויעד 2:1 — ופותח אותו כדי לחשב גודל עסקה בלחיצה אחת. |
| **English** | Auto-fills the Position Calculator from the current chart — ticker, live price as entry, a protective stop and a 2:1 target — then opens it so you can size the trade in one click. |
| **Español** | Rellena automáticamente la Calculadora de Posición desde el gráfico actual — ticker, precio en vivo como entrada, un stop protector y un objetivo 2:1 — y luego la abre para que dimensiones la operación en un clic. |
| **Português** | Preenche automaticamente a Calculadora de Posição a partir do gráfico atual — ticker, preço ao vivo como entrada, um stop protetor e um alvo 2:1 — e depois abre-a para dimensionares a operação num clique. |
| **العربية** | يملأ تلقائياً حاسبة الصفقة من الرسم الحالي — الرمز، السعر الحي كدخول، وقف حماية وهدف 2:1 — ثم يفتحها لتحدّد حجم الصفقة بنقرة واحدة. |

### `chartAddToJournal` — Add to Journal · הוסף ליומן

| שפה | הסבר |
|---|---|
| **עברית** | פותח עסקה חדשה ביומן מהגרף הנוכחי — טיקר, מחיר חי, סטופ מוצע ויעד 2:1 ממולאים מראש — מוכן לבדיקה ושמירה. |
| **English** | Starts a new journal trade from the current chart — ticker, live price, a suggested stop and a 2:1 target pre-filled — ready for you to review and save. |
| **Español** | Inicia una nueva operación en el diario desde el gráfico actual — ticker, precio en vivo, un stop sugerido y un objetivo 2:1 pre-rellenados — lista para que la revises y guardes. |
| **Português** | Inicia uma nova operação no diário a partir do gráfico atual — ticker, preço ao vivo, um stop sugerido e um alvo 2:1 pré-preenchidos — pronta para reveres e guardares. |
| **العربية** | يبدأ صفقة جديدة في اليوميّة من الرسم الحالي — الرمز، السعر الحي، وقف مقترح وهدف 2:1 مملوءة مسبقاً — جاهزة لمراجعتك وحفظك. |
