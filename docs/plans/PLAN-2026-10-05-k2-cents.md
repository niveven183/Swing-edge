<!-- docs/plans/PLAN-2026-10-05-k2-cents.md — approved by Niv 05.10 «מאושר כמו שהוא» + הערת F2 -->

# K2 — `B-321` + `B-325`: כסף שמעוגל לפני מעצב דו-ספרתי

**רמה: T3 · תשובות: לא/כן/לא/כן/לא.** ש2 («כן»): כסף על המסך. ש4 («כן»): `SwingEdge_App.jsx`, `test:cents`, spec עין, probe ו-workflow. ש5 («לא»): כל השורות נמדדו היום על `c71f256`.
§8 פילטר: «נוגע בכסף?» — כן, אבל **תצוגה בלבד**, ⛔ DB ⛔ ערך שמור (טבלת ההשלכות בסוף).
Safety gate ✅: HEAD=`c71f256` · עץ נקי · `hooksPath=.githooks`.

## Context
`Math.round(pnl)` רץ לפני `fmt$`/`fmtBalance`/`fmtAcct`, וכל אחד מהם כופה 2 ספרות ⇒ `+$12.00` על ערך אמיתי של `12.47`. המחלקה כוללת `14` אתרים (`D-068`): `5` תוקנו ב-15.09, ו-`9` מוצהרים פגומים ב-`test:cents`. אלה `A1` (toast סגירת עסקה, `B-321`) ו-`B1`–`B8` (payloads של גרפים/טבלה, `B-325`). הכרעת ניב 30.09: לבטל את «Math.round נשמר» ב-toast.

## §3 — עובדות (נמדדו היום)

**ⓐ+ⓑ מיפוי.** נסרקו `SwingEdge_App.jsx`, `src/`, `api/`. הדפוסים: `Math.round|floor|ceil` · `toFixed(0)` · `parseInt` · `maximumFractionDigits:0`. בסך הכול ~150 מופעים; כאן רק אלה שנוגעים בכסף.
**שמירה: `0` אתרים של כסף.** P&L ו-R ⛔ נשמרים (נגזרים מ-entry/exit/shares). ב-`tradeWrite.js` · `import/` · `userSettings.js` · `handleCloseSubmit` (`exit: parseFloat`) ⛔ אין עיגול.

| # | מיקום (היום) | ערך | תצוגה/שמירה | מעצב | מטבע | סיווג |
|---|---|---|---|---|---|---|
| A1 | `:3199` | `Math.round(pnl)` ב-toast סגירה | תצוגה | `fmtAcct` (2 ספרות) | חשבון (ממיר) | 🔴 **במחלקה** — `B-321` |
| B1 | `:384` | `equity: Math.round(balance)` | תצוגה (tooltip `:4834`·`:6405`) | `fmtBalance` | dispCcy | 🔴 `B-325` |
| B1′ | `:384` | `pnl: Math.round(pnl)` באותה נקודה | — | — | — | ⚪ **שדה מת** (אין צרכן; נמדד) — מוסר העיגול יחד עם B1 |
| B2 | `:524` | `equity: Math.round(runBalance)` | ⚠️ **גיאומטריית SVG ב-PDF בלבד** (`toY(p.equity)`) | ⛔ טקסט | — | 🟡 `B-325`; **ה-`consumerAnchor` בלדג׳ר שגוי** — הוא מצביע על tooltip של B1 |
| B3 | `:6424` | `pnl: Math.round(calcTradeMetrics(t).pnl \|\| 0)` | tooltip | `fmt$` | dispCcy | 🔴 `B-325` |
| B4 | `:6468` | `pnl: Math.round(dayLookup[day]?.totalPnL \|\| 0)` | tooltip | `fmt$` | dispCcy | 🔴 `B-325` |
| B5 | `:6689` | `pnl: Math.round(m.pnl)` | tooltip | `fmt$` | dispCcy | 🔴 `B-325` |
| B6 | `:6699` | `totalPnL: Math.round(e.totalPnL)` | tooltip | `fmt$` | dispCcy | 🔴 `B-325` |
| B7 | `:6718` | `totalPnL: Math.round(s.totalPnL)` | **תא טבלה** | `fmt$` | dispCcy | 🔴 `B-325` |
| B8 | `:6726` | `pnl: Math.round(pnl)` | tooltip | `fmt$` | dispCcy | 🔴 `B-325` |
| K | `:839`/`:844` | `fmtPrice(Math.round(avgWin))` (מאמן) | תצוגה | `fmtPrice` (⛔ כופה) | — | ⚪ ביקורת `K1`/`K2` — ⛔ נוגעים |
| K | `:965` · `:4688`–`:4691` · `:5113` · `:6384` | `Math.round(capital/equityBase).toLocaleString()` | תצוגה | שלם, ⛔ `.00` | חשבון | ⚪ שלם-מכוון (`K6`, 15.09) — ⛔ נוגעים |
| K | `:407` `fmtAxisMoney` · `fmt$0` (צירים, לוח שנה) | שלם | ציר/תא צר | `fmt$0` | — | ⚪ שלם-מכוון («cents do not fit», `utils.js:192`) |
| K | `GrowthPredictor.jsx:130`/`:144` | תחזית 24 חודש | תצוגה | שלם | — | ⚪ מכוון ומתועד («no meaningful cents») |
| K | `GrowthTracker.js:186` | `netPnl: Math.round(Σ)` | — | — | — | ⚪ **שדה מת** (0 צרכנים, נמדד) — רישום בלבד |
| K | `DayTradesModal.jsx:137` | `$` + `totals.pnl.toFixed(0)`, לא-ממיר | תצוגה | ידני | `$` קשיח | ⛔ **K1 / `B-187`** — ⛔ נוגעים, רק רישום |
| ⓒ | `positionSizing.js:70` `Math.floor` · `:87` `parseInt` | **מניות** | — | — | — | ⚪ ביודעין — ⛔ נוגעים |
| — | MonthlyReport · DNA · Coach · EdgeFinder ועוד | `Math.round(winRate*100)` וכדומה | אחוזים/ציונים | — | — | ⛔ כסף |

**ממצאים מחוץ למחלקה ⇒ נרשמים, ⛔ מתוקנים כאן:**
- **F1 (נמדד):** ב-PDF החודשי `fmtDollar` (`:547`) ו-`curEquity` (`:630`·`:681`) משתמשים ב-`minimumFractionDigits:2` **בלי max** ⇒ `(12.4751)` → `"12.475"`. אלה 3 ספרות על כסף ⛔ חלקו של K2, ובנוסף מעצב שני בניגוד ל-§13 ⇒ `B-` חדש.
- **F2:** (ניב 05.10: ה-`B-` החדש מציין במפורש שני מקרי מדידה — **קריפטו מתחת לסנט, למשל `0.00001234`**, ו**מניה בתל"א באגורות**.) `entry/stop/target = String(x.toFixed(2))` במילוי אוטומטי מציטוט/OCR (`:2974`·`:3010`·`:3788`–`:4056`). זה **מחיר** ⛔ כסף, אבל הוא **נשמר**, ומחיר מתחת לסנט / באגורות תל"א מאבד דיוק ⇒ `B-` חדש להכרעה.
- **F3:** B3 מוזן מ-`calcTradeMetrics` **גולמי** ומוצג תחת dispCcy ⇒ משפחת K1 ⇒ הערה ב-`B-045`.
- **F4:** ההערה ב-`:3191`–`:3195` («🔴 החוב מופיע כאן — רווח של $500 מוכרז ₪500») **התיישנה**: `fmtAcct` = `acctDecision` ⇒ ממיר. היא נכתבת מחדש יחד עם A1.

**ⓓ red-before (נמדד, `npm run test:cents`):** `9/9` האתרים מרנדרים `"+$1,234.00"`/`"$1,234.00"` על קלט `1234.47`, ו-`A1`–`B8` מסומנים `LEDGER 9/9 פגומים-בהצהרה`.

## §1 — הכרעות ניב לרישום (בקומיט התוכנית)
- `NEXT`: `B-321` · `B-408` · `B-275` — מאושר ⇒ ההערה «⏸️ להכרעת ניב» מוסרת מ-`NEXT`/`STATE`.
- `INBOX` 24.09 (מספר הון מהבהב) ⇒ **מוסר**: ככל הנראה `B-376`/`D-103`, ולא שוחזר מאז; ⛔ `B-` חדש. שורה ב-`DECISIONS`.
- `INBOX` 30.09 (דוח הסריקה) ⇒ **מוסר**: גל ההמשך בוצע ב-`1dfb187`. אותה שורת `DECISIONS`.
- `INBOX` 30.09 (`49ba27d` בלי deploy) ⇒ **נשאר** עד 14.10.

## שינויים

**1. `SwingEdge_App.jsx` — 9 אתרים, הסרת `Math.round` בלבד:**
- A1 `:3199` ⇒ `fmtAcct(closedTrade, pnl)`. נכתבת מחדש ההערה `:3191`–`:3197` (F4 + ביטול «נשמר», `DECISIONS`).
- B1 `:384` ⇒ `equity: balance, … pnl` (גם B1′).
- B2 `:524` ⇒ `equity: runBalance`.
- B3–B8 ⇒ הערך הגולמי. ⛔ **ה-`|| 0` ב-B3/B4 נשאר**: פגם נפרד ‹R-2› שנרשם ב-`B-325`, ⛔ נסגר כאן.
- ⛔ נוגעים: מעצבים · צירים · `domain` · FIFO · מחרוזות load-bearing · ערכים שמורים · K1. סיכון הציר מ-`B-325` נבדק: כל `YAxis` צורך `fmt$0`/`fmtAxisMoney` (שלם) ⇒ התוויות נשארות שלמות. העין (§5) מאשרת.

**2. `scripts/cents-precision-test.mjs` (`test:cents`):**
- `A1`, `B1`–`B8` עוברים `state: "OPEN:…"` → `"WAVE"`, באותו קומיט. הלדג׳ר ההפוך הוא מה שמכריח את זה.
- **תיקון B2:** `consumer: null` ו-`consumerAnchor` = הצרכן האמיתי (`toY(p.equity).toFixed(1)`), כלומר נבדק הערך ⛔ דרך מעצב שאין לו.
- **זרוע ביקורת חדשה (`Z*`)** על כל 14 האתרים: `1234` ⇒ שלם נשאר שלם (`+$1,234.00` = `fmt$(1234)`) · `0` ⇒ `+$0.00` · `-12.47` ⇒ `-$12.47`. הסימן ⛔ אובד.
- **עקביות (`S*`):** לכל קבוצה (B3 עסקאות · B4 ימים · B5 חודשים · B6 רגשות · B7 setups) מריצים את ביטוי השדה המחולץ על שורות `[0.4, 0.4, 0.4, 12.47, -3.10]`. אז `Σ שורות = Σ גולמי` (±1e-9), ו-`fmt$(Σ שורות) = fmt$(סה״כ)`. על HEAD זה אדום (`9` מול `10.57`).
- `K1`–`K6` ללא שינוי, וחייבים להישאר ירוקים.
- **`--mutants`** (⛔ בשרשרת, כמו `probe:image:mutants`): ל-9 האתרים, כל אחד בנפרד, `Math.round` מוחזר בעותק זמני ומורץ עם `--app` ⇒ האתר **ובדיקת העקביות שלו** חייבים אדום. בנוסף ריצת ביקורת על עותק לא-משונה, שחייבת להיות ירוקה. הפקודה: `npm run probe:cents:mutants`.
- ⚠️ המנייה ב-`CLAUDE.md` §7 («`49` assertions») זזה ביד ⇒ `B-257`, כמו בכל גל. השרשרת נשארת `33` ⛔ זזה.

**3. עין מול production — `tests-eye/cents.spec.js` (`@deployed`):**
- חשבון QA. נוצרת עסקה `EYEPB` עם notes `e2e-c064-cents-*` (ה-sweep הקיים מנקה אותה): entry `100` · shares `1` · סגירה ב-`112.47` ⇒ P&L `+12.47`.
- **toast he:** `רווח +$12.47 נסגר בהצלחה`. **toast en:** עסקה שנייה, `Closed with profit +$12.47`. המטבע לפי מטבע ההון של QA, נמדד בזמן ריצה.
- **מסך היומן:** תא ה-P&L בשורה = `+$12.47` (A2, ביקורת). **אנליטיקס:** תא setup (B7) = סכום שתי העסקאות `+$24.94`, ו-tooltip בריחוף על העמודה היחידה ב-B3 ובעקומת ההון (B1).
- **שפה:** en מוגדר דרך `localStorage.swingEdgeLang` לפני הטעינה. אם בשורת ה-QA יש `lang`, ה-context של en משנה את תגובת ה-GET (קריאה בלבד) **וחוסם** כתיבות `user_settings` באותו context ⇒ ⛔ כתיבת שפה ל-DB. הניקוי מוודא שאר-הבלוב זהה, כמו `playbook.spec`.
- ריחוף שנכשל = **אדום**, ⛔ דילוג. ⛔ trace (`E11`).
- **red-before:** `scripts/eye-cents-probe.mjs` הרמטי (`tests-eye/hermetic.js` + `scripts/lib/eyeBuild.mjs`). זרוע HEAD ירוקה. `MUT-A1` (`Math.round` חוזר ב-toast) ⇒ צעד ה-toast אדום. `MUT-B7` ⇒ תא ה-setup אדום. שני מכשירים.
- **`eye-playbook.yml`:** job `probe-cents` + `paths` (`scripts/eye-cents-probe.mjs`, `scripts/cents-precision-test.mjs`). ב-PR, `prod` מריץ רק את `playbook.spec`, ולכן `cents.spec` רץ מול production **רק אחרי deploy** ב-push ל-main = **תנאי הסגירה**.

**4. רישום:**
- `DECISIONS`: ביטול «Math.round נשמר» (הכרעת 30.09) + שורת INBOX.
- `INBOX`: מוסרות 2 שורות.
- `BACKLOG`: `B-` חדש ל-F1 ול-F2 · הערות ב-`B-045` (F3) וב-`B-187` (`toFixed(0)`) · `B-321`/`B-325` → DONE אחרי prod.
- `CHECKS`: `C-049` → באוטומציה.
- `STATE` · `NEXT` · `METRICS`, אם יש מדידה.

## סדר (§9)
1. אחרי היציאה: התוכנית → `docs/plans/PLAN-2026-10-05-k2-cents.md` + רישום §1 (DECISIONS/INBOX/NEXT/STATE). קומיט `docs(plan): … — awaiting approval`, push, **STOP**.
2. אחרי אישור: שינויי הטסט (2) על HEAD ⇒ **red-before** (`A1`/`B*` + `S*` אדומים, פלט מודבק).
3. שינוי (1) ⇒ `test:cents` ירוק · `probe:cents:mutants` `9/9` נהרגו · `npm run verify` exit 0.
4. spec + probe (3) ⇒ probe מקומי pixel7: HEAD ירוק · MUT-A1/MUT-B7 אדומים.
5. PR (draft) → CI ירוק → מיזוג → deploy → `cents.spec` מול production, he+en, pixel7+iphone14 ירוק ⇒ DONE + דוח אחד.

## השלכות (§8 רמה 2)
| ציר | |
|---|---|
| משתמשים | כולם רואים אגורות אמיתיות ב-toast ובגרפים, ⛔ `.00` מומצא |
| נתונים | ⛔ DB · ⛔ ערך שמור · הפיך ב-revert |
| עלות | +~10 דק׳ Actions לכל ריצת eye (`probe-cents`) |
| אבטחה | QA קיים, ⛔ סוד חדש; סריקת דליפה קיימת |
| כשל שקט | עיגול שחוזר ⇒ `test:cents` (לדג׳ר + `S*`) + mutants אדומים |
| הפיכות | `git revert` של קומיט אחד, דקות |

## אסור
⛔ K1 (לוח שנה / DayTradesModal / המרה) · ⛔ FIFO · ⛔ מחרוזות load-bearing · ⛔ קומפוננטות ב-render · ⛔ ערכים שמורים · ⛔ שינוי מעצבים ב-`utils.js` · ⛔ `|| 0` (נשאר כמות שהוא, ⛔ נוגעים).
