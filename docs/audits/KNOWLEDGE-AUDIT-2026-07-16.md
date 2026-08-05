# אודיט בסיס-ידע מול הקאנון — 2026-07-16

**היקף:** 43 רשומות — setups (21) · rules (12) · psychology (6) · regimes (4).
**סטטוס:** read-only. אפס שינוי ב-JSONs. התיקונים המוצעים ליישום בגל 6.1b אחרי אישור.
**הערה על היקף:** ה-brief דיבר על 35 רשומות (setups=13); בפועל setups.json גדל ל-21. כל 21 בוקרו.
**מקורות אימות מספרי:** thepatternsite.com (Bulkowski), Minervini, O'Neil, Van Tharp, Douglas — ראה נספח מתמטי + מקורות בתחתית.

---

## 1. סיכום מנהלים

| חומרה | ספירה |
|---|---|
| ✅ מדויק | 36 |
| 🟠 לא-מדויק / דורש תיקון | 7 |
| 🔴 שגוי | 0 |
| ⚪ לא-ניתן-לאימות | 0 (מקופל כהערות בתוך רשומות) |

**המצב הכללי טוב.** אין ולו טעות ייחוס בוטה (🔴) — כל source מצביע על מקור שאכן אומר את הדבר. הסטטיסטיקות של Bulkowski שבוקרו (cup&handle, bull flag, ascending triangle, H&S) **תואמות כמעט מושלם** למהדורה העדכנית ב-thepatternsite. שבע רשומות דורשות ליטוש נקודתי, רובן קלות.

### 5 הממצאים הקריטיים

1. **🟠 `one_percent_rule` — טעות מתמטית ב-rationale.** הטענה "בסיכון 2% סופגים ~50 הפסדים רצופים עד חצי הון" שגויה. תחת ריבית-דריבית (fixed-fractional) — הבסיס שממנו נגזר ה-"7" לסיכון 10% — התוצאה ל-2% היא **~34**, לא 50. זו המתמטיקה שה-Coach ילמד סוחרים; חייבת להיות מדויקת. (נספח, חישוב A).
2. **🟠 `double_bottom` — שיעור כשל 12% מול 4% קאנוני.** rank 5/39 ✅ ו-+50% ✅ מאומתים, אבל `be_fail: "12% (Eve&Eve)"` מתנגש עם הנתון הרשמי של thepatternsite ל-Eve&Eve: **4% break-even failure**. ה-12% מופיע רק באגרגטורים משניים. יש להתאים ל-4%.
3. **🟠 `failed_breakout` — "60-80% מהפריצות כושלות" מיוחס לרעה ל-Bulkowski.** זה troop של Tradeciety על false-breaks תוך-יומיים, לא סטטיסטיקת תבניות של Bulkowski — שאצלו שיעורי הכשל (BE) לתבניות איכות הם 5-20%. יש לרכך את הייחוס ולהפריד בין "false break אינטרה-דיי" ל-"כשל תבנית".
4. **🟠 `ascending_triangle` — סתירה פנימית.** `entry_criteria` דורש "לפחות **2** נגיעות בהתנגדות", אבל `coach_line` קובע "דורש לפחות **3** נגיעות. שתיים = קו, לא תבנית." שני המספרים באותה רשומה. (הסטטיסטיקות עצמן ✅).
5. **🟠 `episodic_pivot` — ייחוס חסר את מקור המונח.** ההגדרה מדויקת, אבל המונח "Episodic Pivot" נטבע ע"י **Pradeep Bonde (Stockbee)**; ה-source מציין רק "Qullamaggie / Schwager". יש להוסיף את Bonde/Stockbee.

---

## 2. טבלת פסיקה (43 רשומות)

### setups.json (21)

| key | פסיקה | הבעיה | המקור | תיקון מוצע (מוכן להדבקה) |
|---|---|---|---|---|
| `vcp` | ✅ | 2-6 התכווצויות, כל אחת ~חצי, stop 7-8%, Trend Template 50/150/200 — תואם Minervini. coach_line 5/5. | Minervini SEPA | — |
| `breakout_continuation` | ✅ | מהלך 30-100%, קונסולידציה 2-8 שבועות, 10/20MA, win-rate ~25-30% — תואם Qullamaggie. | qullamaggie.com | — |
| `episodic_pivot` | 🟠 | ייחוס [2]: המונח נטבע ע"י Pradeep Bonde (Stockbee), לא מצוין. הגדרה מדויקת. | Bonde / Qullamaggie | source → `"Pradeep Bonde (Stockbee) / Qullamaggie — 'Episodic Pivot' מקורו ב-Stockbee"` |
| `cup_and_handle` | ✅ | סטטיסטיקות מאומתות: BE 5% ✅, +54% ✅, rank 3/39 ✅, target 61%≈63% ✅. חוסר קל: עומק הכוס (O'Neil 12-33%) לא מופיע. | O'Neil · Bulkowski | הוסף ל-entry_criteria: `"עומק כוס 12-33% מהשיא (O'Neil) — כוס רדודה מדי או עמוקה מ-33% חשודה"` |
| `bull_flag` | ✅ | Bulkowski flags מאומת מלא: BE 44% ✅, +9% ✅, target 46% ✅. | Bulkowski flags.html | — |
| `double_bottom` | 🟠 | דיוק [1]: `be_fail "12%"` מול נתון thepatternsite ל-Eve&Eve = **4%**. rank 5/39 ✅, +50% ✅. | Bulkowski eedb.html | stats.be_fail → `"4% (Eve&Eve, thepatternsite)"` |
| `head_and_shoulders` | 🟠 | דיוק [1]+שלמות [3]: avg decline הרשמי **16%** (הטווח "-16% עד -29%" מנופח בקצה העליון). pullback 68% עדכני (✅ תואם "2/3"). `regime_affinity.best=["Trending Up"]` מבלבל לתבנית היפוך דובית. | Bulkowski hst.html | stats.avg_move → `"-16% (ממוצע Bulkowski)"`; להבהיר ב-6.1b את משמעות regime_affinity לתבנית short |
| `ascending_triangle` | 🟠 | שלמות [3]: `entry_criteria` = "2 נגיעות", `coach_line` = "3 נגיעות" — סתירה. סטטיסטיקות ✅ (up-break 63%, +43%, BE 17%). | Bulkowski at.html | ליישר: entry_criteria → `"לפחות 3 נגיעות בהתנגדות ו-2 שפלים עולים"` (ליישר עם coach_line) |
| `orb` | ✅ | NR7 + RVOL, סטופ מובנה — תואם SMB. | SMB Capital | — |
| `parabolic_short` | ✅ | איכותי; אחוזי-המהלך (50-100%/300-1000%, 3-5 ימים) לא ניתנים לאימות מדויק אך סבירים ל-Qullamaggie. | Qullamaggie | — |
| `pullback` | ✅ | Minervini pullback-to-10/20 + O'Neil 50SMA. עקבי. | Minervini · O'Neil | — |
| `support_bounce` | ✅ | Murphy/Wyckoff, role reversal — סטופ מבני מוצדק. | Murphy · Wyckoff | — |
| `resistance_break` | ✅ | תלוי-ווליום, role reversal, retest — עקבי עם Bulkowski. | Murphy · Bulkowski · O'Neil | — |
| `higher_low` | ✅ | price-action, תלוי-מגמה — נכון. | Al Brooks | — |
| `trend_continuation` | ✅ | 50 EMA כפילטר מגמה — עקבי. | trend-following | — |
| `failed_breakout` | 🟠 | דיוק+ייחוס [1][2]: "60-80% מהפריצות כושלות" אינו סטטיסטיקת Bulkowski (אצלו BE לתבניות איכות 5-20%). מבלבל false-break אינטרה-דיי עם כשל תבנית. | Tradeciety (לא Bulkowski) | reliability/stats → `"פריצות שווא נפוצות בשוק צידי; Bulkowski 'busted patterns' נעים חזק בכיוון ההפוך. (אין נתון 60-80% מבוסס Bulkowski)"` |
| `ema_bounce_50` | ✅ | stack שורי 20>50, EMA עולה — נכון. | swing MA classic | — |
| `range_breakout` | ✅ | פילטר ווליום ≥120% סביר, סטופ ATR. | breakout classic | — |
| `breakdown` | ✅ | היפוך Breakout תקין, דורש מגמת ירידה. | inverted mechanics | — |
| `retest` | ✅ | change-of-polarity, ווליום מתכווץ בחזרה — נכון. | break-and-retest | — |
| `post_earnings_strength` | ✅ | מצוין: Ball&Brown 1968 ✅, Bernard&Thomas 1989 ✅, Martineau 2022 ✅, beat 10%→72% (Alpha Architect). ניואנס מחקרי מדויק. | PEAD academic | — |

### rules.json (12)

| key | פסיקה | הבעיה | המקור | תיקון מוצע |
|---|---|---|---|---|
| `volume_on_breakout` | ✅ | מסגור Bulkowski מדויק ("אישור, לא ערובה"). | Bulkowski | — |
| `rvol_first_filter` | ✅ | ספי RVOL 1.5/2/3 — עקבי עם SMB/Qullamaggie. | SMB · Qullamaggie | — |
| `rs_leadership` | ✅ | L של CANSLIM — נכון. | O'Neil | — |
| `market_filter` | ✅ | M של CANSLIM / 10>20MA; דוגמת 2022 קולעת. | O'Neil · Qullamaggie | — |
| `cut_losses_fast` | ✅ | 7-8%; "איבוד 50% דורש +100%" — מתמטיקה נכונה (נספח B). | O'Neil · Minervini | — |
| `one_percent_rule` | 🟠 | דיוק [1]: "בסיכון 2% ~50 הפסדים עד חצי הון" שגוי — התוצאה ~**34** (ריבית-דריבית). ה-"7" ל-10% נכון. ייחוס Van Tharp סביר. | Van Tharp | rationale → `"בסיכון 2% נדרשים ~34 הפסדים רצופים עד חצי הון; בסיכון 10% — רק ~7. ככל שהסיכון לעסקה גדול, קצה התהום קרוב יותר."` |
| `position_sizing` | ✅ | נוסחה נכונה; Van Tharp "position sizing > המערכת". | Van Tharp | — |
| `rr_minimum` | ✅ | היגיון 3:1 נכון. | Van Tharp · Schwager | — |
| `stop_is_structural` | ✅ | 2×ATR/מבנה — Wilder/Minervini. | Wilder · Minervini | — |
| `defined_risk_or_no_trade` | ✅ | SMB — נכון. | SMB Capital | — |
| `pyramid_winners_only` | ✅ | Minervini — לא ממצעים הפסד. | Minervini | — |
| `max_concentration` | 🟠 | שלמות [3]: "~5% מההון **בסיכון** על רעיון בודד" מתוח מול `one_percent_rule` (1% לעסקה) — 5% *סיכון* = פי-5. סביר שהכוונה לתקרת סיכון מצרפי/הקצאה. ייחוס Marcus/Schwager תקין. | Schwager (Marcus) | rationale/rule → להבהיר: `"תקרת סיכון מצרפי על רעיון בודד (כל הפוזיציות הקשורות יחד) — לא לבלבל עם 1% לעסקה בודדת"` |

### psychology.json (6)

| key | פסיקה | הבעיה | המקור | תיקון מוצע |
|---|---|---|---|---|
| `fomo` | ✅ | Douglas #5; related_rules/setups → keys קיימים ✅. | Douglas | — |
| `tilt` | ✅ | Douglas #3; keys קיימים ✅. | Douglas · Steenbarger | — |
| `revenge_trading` | ✅ | keys קיימים ✅. | Douglas | — |
| `overtrading` | ✅ | keys קיימים ✅. | SMB · Douglas | — |
| `fear_of_loss` | ✅ | Douglas #2,#4; keys קיימים ✅. | Douglas | — |
| `five_truths` | ✅ | 5 האמיתות תואמות מילה-במילה את Trading in the Zone. שים לב: schema שונה (items[] במקום definition/symptoms) — ראה סעיף 6.2. | Douglas | — |

**הצלבה [4]:** כל 8 ה-`related_rules`/`related_setups` ב-psychology מצביעים על keys קיימים. אין reference שבור.

### regimes.json (4)

| key | פסיקה | הבעיה | המקור | תיקון מוצע |
|---|---|---|---|---|
| `stage1_basing` | ✅ | Stage 1 + 30-week MA + Wyckoff PS→SC→AR→ST→Spring; mapping "Sideways" ✅. | Weinstein · Wyckoff | — |
| `stage2_advance` | ✅ | ממוצעים stacked 10>20>50>200; mapping "Trending Up" ✅. | Weinstein | — |
| `stage3_top` | ✅ | Wyckoff BC→AR→ST→UTAD; mapping "Volatile" — פשרת-מידול (4 דליים בלבד), לגיטימית. | Weinstein · Wyckoff | (אופציונלי) לתעד ש-Stage 3 ממופה ל-Volatile מחוסר דלי "Topping" ייעודי |
| `stage4_decline` | ✅ | מתחת ל-MA30-שבועי יורד; mapping "Trending Down" ✅. | Weinstein | — |

**הצלבה [4]:** `regimes.mapping` = {Sideways, Trending Up, Volatile, Trending Down} — תואם **בדיוק** את ארבעת ערכי `marketCondition` בקוד (`MarketRegime.js:50-53`, `knowledgeGlue.js:16-20`). כל הדליים מכוסים, אין ערך יתום. ✅

---

## 3. פערי כיסוי [7] — מדורג לפי ערך ל-Coach

| # | מועמד להוספה | מקור | למה חשוב | ערך |
|---|---|---|---|---|
| 1 | **Expectancy כ-rule** — `expectancy = (Win% × avgWin) − (Loss% × avgLoss)`, ב-R | Van Tharp | ה-edge האמיתי. כרגע רק `rr_minimum` נוגע. בלי expectancy אין למה שה-Coach יעגן win-rate מול R:R. | 🔥 גבוה |
| 2 | **Follow-Through Day (FTD)** כ-rule/regime-signal | O'Neil / IBD | האות שקורא את *התחלת* Stage 2. `market_filter` אומר "לונג רק בשוק שורי" אך לא *איך יודעים שהתחיל*. | 🔥 גבוה |
| 3 | **Trend Template מלא (8 קריטריונים)** כ-rule עצמאי | Minervini | כרגע מוטמע רק בתוך `vcp.entry_criteria`. הוא הפילטר של *כל* הלונגים, לא של VCP בלבד. | 🔥 גבוה |
| 4 | **כללי מכירה/רווח של O'Neil** — 20-25% profit-taking, 8-week hold למובילות | O'Neil | כרגע רק צד ההפסד (`cut_losses_fast`). ה-Coach לא יודע לייעץ *מתי לממש*. | בינוני |
| 5 | **Distribution Days count** כ-topping signal | O'Neil / IBD | משלים את `stage3_top` — ספירת ימי הפצה היא האזהרה הכמותית לפני Stage 3/4. | בינוני |
| 6 | **RS-line new-high לפני פריצה** | O'Neil / Minervini | מחדד את `rs_leadership` מ-"RS גבוה" ל-סיגנל מדיד. | בינוני |
| 7 | **מדדי רוחב/בריאות שוק** (A/D, % מעל 50MA) | market breadth | חיזוק כמותי ל-`market_filter`. | נמוך |

---

## 4. מוכנות ל-6.2 (Coach מודע-פרופיל) [8]

**מה קיים:** `coach_line` יחיד לכל setup/rule (עברית בלבד). ל-regimes יש `coach_line` דו-לשוני (he/en). `regime_affinity` על setups — חומר גלם מצוין לסינון לפי מצב-שוק.

**מה 6.2 יצטרך (לא להוסיף עכשיו — רק לתעד):**

1. **וריאנטים של coach_line לפי רמה.** אין `coach_line.beginner` / `.advanced`. סוחר יום-1 וסוחר ותיק צריכים ניסוח שונה לאותו setup. 6.2 יזדקק למבנה כמו `coach_line: { beginner, advanced }` (או key-per-level).
2. **תיוג קושי/סיכון על setups.** `parabolic_short` ו-`episodic_pivot` הם advanced-only; `pullback`/`support_bounce` ידידותיים למתחילים. אין שדה `difficulty` — 6.2 לא יכול לגדר סטאפים לפי פרופיל בלעדיו. (מתחבר ל-riskPct מגל 5).
3. **אי-עקביות schema שתפריע ל-Coach גנרי:**
   - psychology משתמש ב-`correction` (אין `coach_line`) — שונה מ-setups/regimes.
   - `five_truths` בעל schema חריג (`items[]`, אין definition/symptoms).
   - regimes דו-לשוני; setups/rules חד-לשוני.
   6.2 ייהנה מנרמול לשדה coach אחיד + מיפוי `correction`→תפקיד-coach.
4. **rules חסרי `regime_affinity`.** ל-setups יש, ל-rules אין — Coach מודע-מצב-שוק לא יוכל לתעדף כללים לפי regime.

---

## 5. נספח מתמטי [1]

**חישוב A — `one_percent_rule` (הממצא הקריטי).**
מודל ריבית-דריבית (fixed-fractional): הון אחרי n הפסדים רצופים בסיכון f = `(1−f)^n`. פתרון ל-חצי הון: `(1−f)^n = 0.5` → `n = ln(0.5) / ln(1−f)`.
- f = 2%: `n = ln(0.5)/ln(0.98) = (−0.693147)/(−0.020203) = 34.31` → **~34 הפסדים** (לא 50).
- f = 10%: `n = ln(0.5)/ln(0.90) = (−0.693147)/(−0.105361) = 6.58` → **~7 הפסדים** ✅ (הנתון הקיים נכון).

מכיוון שה-"7" נגזר מהמודל המורכב, גם ה-2% חייב להיגזר ממנו → **34, לא 50**. (במודל פשוט/דולרי-קבוע: `0.5/0.02 = 25` — גם לא 50, וגם לא עקבי עם ה-7. אין מודל שמצדיק 50.)

**חישוב B — `cut_losses_fast` ("איבוד 50% דורש +100%").**
החזרה הנדרשת מ-drawdown של d: `r = d/(1−d)`. ל-d = 0.5: `r = 0.5/0.5 = 1.0 = +100%` ✅. הרשומה נכונה.

**חישוב C — ספי Bulkowski שאומתו מול thepatternsite (מהדורה עדכנית):**

| תבנית | שדה | ערך ברשומה | ערך מאומת | פסיקה |
|---|---|---|---|---|
| cup&handle | BE fail / avg / rank / target | 5% / +54% / 3-39 / 63% | 5% / 54% / 3-39 / 61% | ✅ (target 63≈61) |
| bull_flag | BE fail / avg / target | 44% / +9% / 46% | 44% / 9% / 46% | ✅ |
| ascending_triangle | up-break / avg / BE | 63% / +43% / 17% | 63% / 43% / 17% | ✅ |
| head&shoulders | BE / avg / pullback | ~20% / -16..-29% / 50-67% | 19% / -16% / 68% | 🟠 (טווח avg מנופח) |
| double_bottom | BE / avg / rank | 12% / +50% / 5-39 | 4% / 50% / 5-39 | 🟠 (BE 12 מול 4) |

---

## מקורות

- [Bulkowski — Cup with Handle (thepatternsite)](https://thepatternsite.com/cup.html)
- [Bulkowski — Eve & Eve Double Bottoms](https://thepatternsite.com/eedb.html)
- [Bulkowski — Flags / High & Tight Flag studies](https://thepatternsite.com/HTFStudy.html)
- [Bulkowski — Ascending Triangles](https://thepatternsite.com/at.html)
- [Bulkowski — Head-and-Shoulders Tops](https://www.thepatternsite.com/hst.html)
- קוד: `src/intelligence/core/MarketRegime.js:50-53` · `src/intelligence/knowledgeGlue.js:16-20` (ערכי marketCondition)
- גלוסרי: `docs/SwingEdge-Terms-Glossary.md`
