# PLAN — גל 1b · שארית המטבע (B-427 + B-187) + B-465 · 28.10.2026

**רמה: T3** (תיקון מ-T2 בכותרת): הפיכות לא · **אמון כן** (כסף על המסך) · אבטחה לא · **רוחב כן** (App + 2 קומפוננטות + בדיקות) · ודאות לא (נמדד היום) ⇒ 2 "כן" ⇒ T3 ⇒ אימות עין חובה לסגירה (כבר בפרומפט).
**שער:** main `837f458` נקי · Smoke `40737819334` ✅ `18/18` אחרי שחזור שורת ה-QA (`INCIDENTS#43`).

## Context

גל 1 (F2/B-457) המיר את השבועי והחודשי. נשארו שלושה אתרים שמדפיסים P&L גולמי תחת סמל החשבון, ושערי הבדיקות של `C-061`/`cents` K2 תלויים במצב חי של חשבון ה-QA בלי שער-קדם (`B-465`, נכנס לגל בהכרעת ניב).

## §0 · אבחון נמדד (reproduction לפני תיקון)

רינדור שרת של הקומפוננטות ה**אמיתיות** (esbuild + `renderToStaticMarkup`), חשבון ILS, `+$100` (AAPL) + `+₪200` (TEVA) באותו יום, שער 3.7:

| מקרה | לוח — באדג' חודשי | מודאל — כותרת יום | מודאל — שורה (`fmtAcct`) |
|---|---|---|---|
| **היום** (`calcTradeMetrics` גולמי) | `+₪300` ❌ (זהב ₪570) | `+$300` ❌ | `100` ✓ |
| החלפת calc בלבד, עם שער | `+₪570` ✓ | `+$570` ❌ סמל | **`370` ❌ המרה כפולה** |
| החלפת calc בלבד, בלי שער | `+₪300` ❌ ($ ⛔ הוחרג) | `+$300` ❌ | `100` |

⇒ החלפת ה-calc לבדה **שוברת** את השורות ו⛔ מחריגה. נדרשים שלושה חלקים.

| # | אתר | משתחזר? |
|---|---|---|
| 1 | `TradeCalendar` (`SwingEdge_App.jsx` ~5629 `calcMetrics={calcTradeMetrics}`) + `DayTradesModal.jsx` (`$` קשיח + `toFixed(0)` בכותרת היום) | ✅ (טבלה למעלה) |
| 2 | `exportMonthlyPDF` · `tradeRows` (~571): `m.pnl != null ? m.pnl : 0`, ⛔ סינון `fxUnconverted` | ✅ בקריאת קוד — עם `stableCalcTradeMetrics` בלי שער, `$100` מודפס `+₪100.00`; `pnl` חסר ⇒ `+₪0.00` |
| 3 | `B-187` · טוסט הסגירה — עיגול לפני המרה | **⛔ משתחזר** — K2 (05.10, `B-321`/`D-117`) כבר הסיר את `Math.round` לפני `fmtAcct` (`SwingEdge_App.jsx` ~3318–3325). ⛔ נוגעים; מדווח ונרשם |
| — | `B-464` (`MonthlyReport.js` `enrich`, `pnl` חסר ⇒ `0`) | **⛔ אותו מקום** כמו ה-PDF ⇒ נשאר פתוח, ⛔ בגל |

## §1 · התיקון — אותו מנגנון של F2/B-300 בלבד

**1a · `SwingEdge_App.jsx`:** `<TradeCalendar calcMetrics={stableCalcTradeMetrics}>` (במקום `calcTradeMetrics`).

**1b · `src/components/TradeCalendar.jsx`:**
- `metricsOf` מחזיר גם `fxUnconverted`. ⛔ `?? 0` על `pnl` — `null` נשאר `null` (R-2).
- סכום יומי וחודשי = **רק** עסקאות בלי `fxUnconverted` (אותו כלל של `computeTradingStats`: `aggregatable` למספרי כסף). שיעור ההצלחה — על **כל** האוכלוסייה (כמו `tradingStats.js` ~429: הסימן ⛔ תלוי מטבע).
- יום שכל עסקאותיו הוחרגו ⇒ התא מציג `—` (צבע ניטרלי), ⛔ `₪0`.
- גילוי: בשורת הבאדג'ים של החודש — `t.unconvertedClosedWarn` הקיים ("אין שער ל-{n} מתוך {m} עסקאות סגורות"), רק כש-n>0.
- פורמט: באדג' החודש ⇒ `fmt$` (אגורות, כמו השורות). **תא היום נשאר `fmt$0`** — זה המעצב המתועד ל"משטחים צרים (תאי לוח)" (`src/utils.js:191`), והוא ⛔ ממציא אגורות. ⚠️ **הכרעה לניב** — ראה §5.

**1c · `src/components/DayTradesModal.jsx`:**
- **סכום היום** ⇒ מ-`calcMetrics` (הממיר), רק עסקאות מומרות; פורמט `fmt$(…, currency)` — prop `currency` חדש שמגיע מ-`TradeCalendar` (= `dispCcy`). ⛔ `$` קשיח, ⛔ `toFixed(0)`.
- **שורות** ⇒ נשארות `fmtAcct(tr, rawPnl)` — ה-pnl לשורה נלקח מ-`calcTradeMetrics` (ייבוא מ-`src/utils.js`, חישוב נייר טהור — ⛔ `accountAmount`, ⛔ עותק שני של ההכרעה). זה מונע את ההמרה הכפולה שנמדדה (`370`).
- אותה שורת גילוי `unconvertedClosedWarn` בכותרת כש-n>0; יום שכולו מוחרג ⇒ `—`.

**1d · PDF `tradeRows` (`exportMonthlyPDF`):** `m.fxUnconverted` ⇒ התא `—` + `(no FX rate)` באפור; `m.pnl == null` ⇒ `—` (⛔ `0`). צבע ניטרלי לשניהם. ⛔ שינוי במנגנון ה-PDF (שורת הגילוי `equityIncomplete` הקיימת כבר סופרת `closedNoRate`).

**1e · `B-465` שלב 2:**
- `tests/lib/qaFixture.js` (חדש, טהור): `qaFixtureVerdict({capitalCurrency, accountCurrency}, need)` ⇒ `{ok, message}`; הודעה נוקבת: «PRECONDITION — the QA account is USD/USD; this test needs ILS (expected). The account was edited, not the app (INCIDENTS#43)». מבדיל **⛔ הגיע** (`null`) מ**הגיע-שגוי**.
- `tests/eye.spec.js` `openFilledForm` (C-061ⓐⓑⓒ): אחרי הדשבורד — poll על `swingEdgeCapitalCurrency` עד שאינו `null`, ואז `qaFixtureVerdict` עם `need: "≠USD"`.
- `tests-eye/cents.spec.js:209` (K2): אותו verdict במקום ההודעה «never reached the app».
- ⛔ ריכוך: התנאי זהה; רק ההודעה אומרת את האמת.

## §2 · בדיקות

**ערך (`test:instrument` בלוק 26, אירוח — ⛔ חוליה חדשה):** חילוץ טהור של הסכימה בלוח/מודאל ⇒ ⚠️ הסכומים כרגע inline ב-`useMemo`. ⇒ **פונקציה טהורה אחת** `sumConverted(trades, calc)` ⇒ `{pnl|null, counted, excluded}` ב-`src/lib/tradingStats.js` (ליד `aggregatable` — אותו כלל, ⛔ מנגנון חדש), שתי הקומפוננטות צורכות אותה.
- `C1` חשבון ILS, שער 3.7 ⇒ `570` · `C2` בלי שער ⇒ `200`, `excluded 1`, `counted 1` · `C3` כולן מוחרגות ⇒ `pnl null` · `C4` BEFORE (calc גולמי) ⇒ `300` ≠ `570`.
- **שער B-144:** `S5` הקיים — הלדג׳ר `OPEN = { TradeCalendar: "B-187" }` מתרוקן ⇒ `3/3` צרכני `calcMetrics=` ב-App חייבים `stableCalcTradeMetrics`. 🔴 הלדג׳ר דו-כיווני — תיקון בלי להזיז את השורה = אדום.
- `S6` ⛔ `toFixed(0)` ו⛔ `` `$` `` קשיח בכותרת `DayTradesModal` · `S7` שורות המודאל קוראות `calcTradeMetrics` + `fmtAcct` (⛔ המרה כפולה) · `S8` PDF `tradeRows` ⛔ `: 0` ו-`fxUnconverted` נבדק.
- ⚠️ BEFORE אדום על `99a62f9` לכל אחת (`C1`/`C2`/`S5`/`S6`/`S7`/`S8`) — נצפה לפני התיקון.
- **מוטנט לכל תיקון** (`probe:eye:wave1` — מנגנון קיים): `MUT-F6a` הלוח חוזר ל-calc גולמי · `MUT-F6b` הסינון מוסר · `MUT-F6c` המודאל חוזר ל-`$`/`toFixed(0)` · `MUT-F6d` שורות המודאל על ה-calc הממיר (המרה כפולה) · `MUT-F7` ה-PDF חוזר ל-`: 0`/בלי סינון ⇒ כל אחד חייב אדום.
- **`B-465`:** 4 אסרציות על `qaFixtureVerdict` (`ILS/ILS` ok · `USD/USD` ⇒ הודעת fixture · `null` ⇒ «never reached» · `USD/ILS` מעורב) — מתארחות ב-`test:diagnosis` (אמיתוּת הודעות כשל, מחלקת `B-335`). BEFORE: הקובץ ⛔ קיים ⇒ אדום.
- `CLAUDE.md` §7: מניות `test:instrument` / `test:diagnosis` מוזזות ביד (`B-257`, פתוח) — ⛔ זזה מניית החוליות.

**עין (`tests-eye/wave1.spec.js`, סצנות חדשות F6/F7, אותו harness של F2):**
- F6 · he+en × rate/none: לוח ⇒ תא היום `+₪570` / `+₪200` + "אין שער ל-1 מתוך 2"; מודאל ⇒ `₪` (⛔ `$`), `+₪570.00` / `+₪200.00`, שורת $ = `+₪370.00` (rate) / `—` (none).
- F7 · he: PDF (popup, כמו F1) ⇒ שורת ה-$ בלי שער = `—` + `(no FX rate)`.
- מכשירים: iPhone 14 + desktop 1440 (+ pixel7 כבר ב-probe). BEFORE ⇒ אדום ב-probe; HEAD ⇒ ירוק.
- prod (QA): `prod-wave1` מריץ F6/F7 מול פרודקשן אחרי deploy.

## §3 · רישום

`B-427` ⇒ DONE עם run id; הערה: חלקי השבועי/החודשי נסגרו ב-`B-457` (הפניה, ⛔ מחיקה). `B-187` ⇒ DONE: חלקי הלוח/המודאל כאן; חלק הטוסט ⇒ «⛔ משתחזר — נסגר ב-K2 `D-117`». `B-465` ⇒ DONE. `B-464` נשאר פתוח (⛔ אותו מקום). `C-077` ב-CHECKS לפני הסגירה. `TRUTH.md` (לוח/מודאל/PDF מומרים). STATE/NEXT. `docs/audits/` — §0 של הקובץ הזה הוא הדוח (נדחף לפני קוד).

## §4 · Close

PR → CI ירוק על כל SHA (verify · Smoke · Eye: probe-wave1 + prod-wave1) → merge commit → עין בפרודקשן (QA, iPhone 14 + 1440, he+en) → קומיט סגירה → דוח: hash · טבלת לפני/אחרי · סיימתי.
⛔ DB · סודות · הידרציה/CAS · שינוי מנגנון ה-PDF · עיצוב · force/squash.

## §5 · הכרעות ניב (28.10 — «מאושר כפי שכתוב»)

✅ (1) `fmt$0` בתא היום · ✅ (2) `sumConverted` ב-`tradingStats.js` · ✅ (3) עיגול טבלת המנטי ⇒ `BACKLOG` עם `B-` חדש, ⛔ בגל. ⇒ ממשיכים לביצוע §0–§4, סגירה בעין בפרודקשן.

### הנוסח המקורי של השאלות

1. **תא היום בלוח** — `fmt$0` (שלם, המעצב המתועד לתאים צרים, ⛔ ממציא אגורות) **[המלצה]**, או `fmt$` עם אגורות גם בתא (10px בתא 56px באייפון — סיכון חיתוך).
2. **פונקציה טהורה `sumConverted` ב-`tradingStats.js`** — נדרשת כדי שאסרציות הערך ירוצו ב-Node (הסכומים כרגע inline). אותו כלל `aggregatable`, ⛔ מנגנון חדש. **[המלצה: כן]**
3. **ממצא §11 מחוץ לגל:** טבלת המנטי (`SwingEdge_App.jsx` ~4751/4756) מעגלת `Math.round(pnl*100)/100` **לפני** `fmtAcct` — סטייה של עד אגורה אחרי המרה. ⛔ בגל; שורה ב-BACKLOG.

## Verification

1. BEFORE על `99a62f9`: `test:instrument` בלוק 26 + `test:diagnosis` חדשות ⇒ אדומות (פלט מודבק).
2. אחרי: `npm run verify` מלא (34 חוליות + build), פלט מודבק.
3. `npm run probe:eye:wave1` ב-CI: HEAD ירוק · BEFORE אדום · 5 מוטנטים נהרגו.
4. Smoke ירוק (C-061 עם השער החדש).
5. אחרי merge+deploy: `prod-wave1` F6/F7 ירוק + צילומים iPhone 14 + 1440, he+en — Code מחשב את הסכומים בעצמו (100×3.7+200=570).
