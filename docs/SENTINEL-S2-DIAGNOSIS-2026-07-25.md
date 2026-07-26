# SENTINEL S2 — אבחון חי (read-only)

- **תאריך אבחון**: 2026-07-26 (שם הקובץ נשמר לפי תכנון S2: 2026-07-25)
- **חשבון**: `sentinel.qa@swing-edge.com` (חשבון QA ייעודי)
- **סוג**: אבחון חי בלבד — אפס שינויי קוד, אפס מוטציה בנתונים. אושר במפורש מסלול (A): ללא יצירה/מחיקה חיה.
- **מטרה**: לספק סלקטורים, שערים (gates) ותזמונים אמיתיים לכתיבת ה-spec המחובר בשלב 2/2. הפער ש-S2 סוגר: S1.5 בודק רק את המשטח האנונימי; באגים אחרי לוגין (כמו `fmtR`) לא נתפסים.
- **הון QA**: התחלה $10,000, נוכחי $8,700 (משקף עסקת AAPL סגורה בהפסד). 3 עסקאות קבע: AAPL (סגורה, ללא stop), NVDA (פתוחה), BTC-USD (פתוחה).

> הערה על ראיות: ערכי הסלקטורים והתזמונים נלכדו חי בפרודקשן. אישורי ה-toast של שמירה/מחיקה (סעיפים 6–7) **לא נצפו חי** — מסלול (A) — ותועדו מהקוד. יאומתו ממילא בהרצת ה-spec הראשונה (שם `afterAll` מנקה).

---

## 1. לוגין

| פריט | סלקטור | הערה |
|---|---|---|
| שדה מייל | `input[type="email"]` (placeholder "אימייל") | טאב "כניסה" פעיל כברירת מחדל |
| שדה סיסמה | `input[type="password"]` (placeholder "סיסמה") · תואם גם `input[autocomplete="current-password"]` שבו משתמש spec S1.5 | |
| כפתור כניסה | `button[type="submit"]` (טקסט "כניסה", ירוק) | |
| טאב הרשמה | `button` "הרשמה" | לא בשימוש S2 |
| שכחת סיסמה | `button` "שכחת סיסמה?" | |
| Google | `button` "המשך עם Google" | לא בשימוש S2 |

- **URL לפני**: `/app` (מסך auth). **URL אחרי הצלחה**: `/app` — **ללא שינוי** (SPA; אין route חדש). אין להסתמך על שינוי URL כסימן התחברות.
- **האלמנט הראשון שמעיד שהאפליקציה נטענה**: סרגל הטאבים `[data-tour-tab="dashboard"]` + כותרת ההון. נחיתה ישירה על לוח בקרה.

## 2. מודאלים

**אין.** לאחר התחברות נחיתה ישירה על לוח בקרה, ללא מודאל כלשהו (שאלון/סיור/BetaWelcome). אומת ב-localStorage: `swingEdgeTourDone`, `swingEdgeOnboarding`, `swingEdgeBetaWelcome:<uid>` קיימים ומסומנים.

## 3. Hydration (קריטי)

- `DEFAULT_CAPITAL = 2500` (`src/utils.js:3`) — ברירת מחדל לפני טעינת DB.
- **הסימן היציב שההגדרות נטענו מה-DB**: הטקסט **"התחלה $10,000"** (en: **"Started at $10,000"**) ב-`sub` של כרטיס ה-KPI העליון `[data-tour="equity"]` (`SwingEdge_App.jsx:3143`), שנטען מיד ב-KPI Row + הון נוכחי "$8,700". אימות מול 2500 = דיווח שקר.
- ⚠ **הסלקטור הנכון = הכרטיס העליון `[data-tour="equity"]`, לא הטקסט "הון התחלתי".** המחרוזת `הון התחלתי` / `starting capital` מופיעה **רק** בכרטיס עקומת ההון (`SwingEdge_App.jsx:4592`) — גרף עמוק בעמוד שנטען מאוחר. סלקטור שמכוון אליה נכשל 4/4 ב-`hydration-timeout` למרות ש-hydration הצליח (ראה מלכודות).
- אותות פנימיים (קוד): `hydrationDone === true` / `hydratedRef.current === true` (`SwingEdge_App.jsx:1338-1339`).
- **זמן**: fetch נתונים מ-Supabase החל ~1332ms, נמשך ~445ms → נתונים זמינים ~1777ms; התייצבות מלאה (POST `user_settings`) ~3.5s. (פירוט בסעיף 9.)

## 4. טאבים

8 טאבים, כולם `[data-tour-tab="<id>"]`:

| id | תווית |
|---|---|
| `dashboard` | לוח בקרה |
| `journal` | יומן |
| `notebook` | מחברת |
| `weeklyReview` | סקירה שבועית |
| `tools` | כלים |
| `analytics` | ניתוח ביצועים |
| `intel` | מודיעין שוק |
| `feedback` | פידבק |

- **אין טאב "Coach".** S2 יכסה **3 טאבים**: `dashboard`, `journal`, `analytics` (לא 4).

## 5. יומן + אימות AAPL ללא stop (הבדיקה המרכזית)

- מעבר: `[data-tour-tab="journal"]`.
- **סלקטור שמוכיח רינדור עסקאות**: `table.w-full.text-xs tbody tr` (count ≥ 1). כותרת: "3 סה"כ · 2 פתוחות · 1 סגורה".
- **AAPL סגורה ללא stop רונדרה בלי קריסה**: עמודת stop ריקה ("$" ללא מספר), עמודת R מציגה "–", אין `pageerror`. מגובה בקוד null-safe: `fmtR` (`src/utils.js:106`, מחזיר "—") ו-`calcTradeMetrics` (`src/utils.js:38`, `if (trade.stop == null) return {pnl, rMultiple:null}`).
- ✅ הבדיקה שקרסה ב-S1.5 (fmtR אחרי לוגין) עוברת חי.

## 6. עסקה חדשה

- **פתיחה**: `[data-tour="add-trade"]` (aria-label "עסקה חדשה") — כפתור + צף.
- **שדות** (כולם `input[type=text]`):

| שדה | סלקטור | חובה |
|---|---|---|
| Ticker | `#log-ticker` (placeholder "לדוגמה: AAPL") | ✔ |
| Entry | `#log-entry` (placeholder "0.00") | ✔ |
| Stop | `#log-stop` (placeholder "0.00") | ✔ (ראה validation) |
| Target | `#log-target` (placeholder "0.00") | — |
| Setup | `#log-setup` (`button` aria "Setup Type", haspopup listbox; ברירת מחדל "פריצה") | dropdown |
| Market Condition | `#log-market-condition` (`button` aria "Market Condition"; ברירת מחדל "מגמת עלייה") | dropdown |

- **ערכי Setup חוקיים**: Breakout, Pullback, Support Bounce, Resistance Break, Other (`src/data/tradeOptions.jsx:33`).
- **ערכי Emotion חוקיים** (קוד): Confident, Calm, Patient, Neutral, Hesitant, Nervous, FOMO, Angry (`src/data/tradeOptions.jsx:48`). ⚠ `#log-emotion` **אינו מופיע בטופס היצירה** — כנראה רק בעריכה/סגירה. לא לחפש אותו ב-flow היצירה.
- **stop חובה**: כפתור השמירה `disabled={!form.ticker || !entryN || !stopN}` (`SwingEdge_App.jsx:6483`), ובבדיקה `if (!form.ticker || !entryN || !stopN) return;` (`:1996`). ⚠ ליצור עם stop תקין בצד הנכון (`validateTradeInputs`, `src/utils.js:64`): ב-LONG stop < entry.
- **כפתור שמירה**: `button` "→ Log Trade".
- **אישור שמירה** (קוד, לא נצפה חי): toast `"<TICKER> נוספה ליומן"` + `setShowForm(false)` + `setTab("journal")` (`:2046-2048`).

### shape מלא של עסקה ב-DB (26 שדות)
`id, user_id, ticker, side, date, entry, stop, target, shares, setup, marketCondition, emotionAtEntry, status, exit, exitReason, closedAt, createdAt, _capitalAtEntry, notes, followedPlan, entryQuality, lessonLearned, maxAdverse, maxFavorable, isDemo, is_demo`

- **שדות שממולאים אוטומטית ע"י ה-UI** (חייבים להיות ב-insert של spec כדי לשקף עסקה זהת-מבנה): `id`, `user_id`, `date`, `status`, `createdAt`, `closedAt`, `_capitalAtEntry`.
- **פער notes**: `notes` הוא עמודת DB אמיתית, אבל **טופס היצירה לא חושף שדה notes חופשי** (השדה התחתון "הקשר העסקה" הוא dropdown של ערכים קבועים, `button` — לא טקסט חופשי). ראה "מלכודות" לאסטרטגיית הזיהוי/ניקוי החדשה.
- דוגמה: AAPL (סגורה) — `stop=null`, `target=null`.

## 7. מחיקה

- **כפתור בשורה**: `button[title="מחיקה"]` (טקסט 🗑️).
- ⚠ **6 כפתורי מחיקה ל-3 שורות** (layout כפול desktop/mobile) — חובה למקד לפי שורה, לא גלובלית.
- ⚠ **ל-`<tr>` אין `id`/`data-trade-id`** ב-DOM (ה-`key={t.id}` של React לא נחשף) — זיהוי שורה לפי טקסט בלבד.
- **דיאלוג אישור** (קוד): `confirmDialog()` כותרת "מחיקת עסקה"/"Delete Trade", כפתור אישור "מחק"/"Delete" (`:2088`).
- **הצלחה** (קוד): toast "העסקה נמחקה" (`:2110`), השורה מוסרת דרך `setTrades(prev => prev.filter(...))` (`:2098`).

## 8. רעש בסיס

- **רעש טעינה (יורחב ל-IGNORE_SUBSTR)**: `[ERROR] Cannot listen to the event from the provided iframe, contentWindow is not available` — מקור `https://swing-edge.com/assets/sentry-*.js`, נורה ~10 פעמים ב-burst בזמן mount. ⚠ **מלכודת**: `watch()` תופס `console.error` לפי `msg.text()`, וטקסט ההודעה **אינו מכיל "sentry"** (רק ה-URL של המקור כן) → `IGNORE_SUBSTR` הנוכחי לא חוסם → 🟠 קבוע כל ריצה. ראה "מלכודות" להרחבה הנכונה.
- `[INFO] [SwingEdge] Build v1.0.1 — <ts>` — INFO, `watch()` מתעלם (תופס רק `type==='error'`). לא רעש.
- **60ש' idle על הדשבורד (השוק CLOSED)**: **0 בקשות network, 0 שגיאות console** (אומת גם ב-`performance.getEntriesByType('resource')` — 0 בקשות בחלון). אין 4xx/5xx ב-origin עצמו.
- בקשות Supabase (`zicstkfkwhzvmdkzpidm.supabase.co`) הן צד-ג' (≠ `BASE_HOST`) → `watch()` מתעלם ממילא.
- **לא נקבע: רעש מחזורי בשעות מסחר** — השוק היה CLOSED בזמן האבחון, ולכן polling מחירים לא נצפה (WebSocket נתמך בדפדפן אך לא נצפתה פעילות). ראה "מלכודות".

## 9. תזמונים

| אירוע | נמדד |
|---|---|
| DOMContentLoaded | 733ms |
| load event | 2052ms |
| fetch נתונים (trades/user_settings/mentorships) | התחלה ~1332ms, משך ~445ms → זמין ~1777ms |
| התייצבות מלאה (POST user_settings) | ~3381ms → ~3.5s |
| מעבר טאב | client-side, מיידי (<100ms, לא נמדד במדויק) |
| לוגין → app | SPA מיידי (ללא route) |

- **המלצת timeouts לשלב 2**: פי ~3 מהנמדד (רשת של runner ב-CI איטית ממק מקומי). למשל hydration gate ~5–6s. הקונפיג הקיים (`playwright.sentinel.config.js`: navigation 30s, action 15s, expect 15s, test 60s) נותן מרווח מספק.

## 10. REST / RLS (נקרא, לא הורץ)

- מדיניות: `supabase/migrations/20260708150000_trades_rls_policy.sql` — `"users own trades" for all using (auth.uid()=user_id) with check (auth.uid()=user_id)` → **מתירה DELETE עם ה-JWT של המשתמש** (auth.uid() תואם user_id).
- **צורת קריאת הניקוי (מעודכנת — לפי ticker, ראה מלכודות)**:
  `DELETE {SUPABASE_URL}/rest/v1/trades?ticker=eq.SNTNL`
  Headers: `apikey: <anon-key>`, `Authorization: Bearer <user-JWT>`.
  ה-RLS מבטיח שנמחקות רק שורות `SNTNL` של אותו user_id (חשבון ה-QA).

---

## טבלת סלקטורים מרוכזת

| רכיב | סלקטור |
|---|---|
| מייל / סיסמה / כניסה | `input[type=email]` · `input[type=password]` · `button[type=submit]` |
| טאב | `[data-tour-tab="dashboard\|journal\|analytics"]` |
| כפתור עסקה חדשה | `[data-tour="add-trade"]` |
| Ticker / Entry / Stop / Target | `#log-ticker` · `#log-entry` · `#log-stop` · `#log-target` |
| Setup / Market Condition | `#log-setup` · `#log-market-condition` |
| כפתור שמירה | `button` "→ Log Trade" |
| טבלת עסקאות (proof) | `table.w-full.text-xs tbody tr` |
| שורת SNTNL (S2) | השורה שמכילה טקסט `SNTNL` → כפתור `button[title="מחיקה"]` בתוכה |

---

## מלכודות שזוהו

1. **אסטרטגיית זיהוי/ניקוי S2 משתנה מ-notes ל-ticker ייעודי** (החלטת ארכיטקטורה, נובעת מפער ה-notes בסעיף 6):
   - עסקת הבדיקה תיווצר **תמיד עם ticker קבוע: `SNTNL`** (לא סימבול אמיתי — לא ניתן להתבלבל, לא מתנגש ב-AAPL/NVDA/BTC-USD).
   - **זיהוי בטבלה**: locator של השורה לפי הטקסט `SNTNL` → כפתור המחיקה בתוכה. עוקף גם את היעדר ה-id בשורות וגם את 6 כפתורי המחיקה.
   - **ניקוי REST מובטח**: `DELETE /rest/v1/trades?ticker=eq.SNTNL` (במקום `notes=eq.SENTINEL-QA` — לא בר-מימוש כי ה-UI לא מתייג notes).
   - **חוקי מגן**: לעולם לא למחוק שורה שאינה מכילה `SNTNL`. 3 עסקאות הקבע (AAPL/NVDA/BTC-USD) קדושות.

2. **מלכודת sentry iframe error**: ההרחבה הנדרשת ל-`IGNORE_SUBSTR` היא לפי **URL של ה-frame/source** (`assets/sentry-`), **לא** לפי טקסט ההודעה — כי הטקסט "Cannot listen to the event…" אינו מכיל "sentry". אם `watch()` יסנן רק לפי `msg.text()`, יש להוסיף חוסם על מיקום המקור (`msg.location().url`) או על מחרוזת ההודעה עצמה.

3. **polling מחירים לא נצפה כי השוק CLOSED** → "לא נקבע: רעש מחזורי בשעות מסחר". המלצה לשלב 2: **ריצת ה-spec הראשונה בשעות מסחר תרחיב את רשימת ההתעלמות** (ייתכן polling ל-origin עצמו או ל-quotes API של צד-ג').

4. **אין טאב Coach** → ה-spec של שלב 2 מכסה `dashboard`, `journal`, `analytics` (3 טאבים, לא 4).

5. **timeouts שלב 2 = פי 3 מהנמדד** (נתונים ~1.8s, settle ~3.5s מקומית) — רשת של runner ב-CI איטית יותר.

6. **URL לא משתנה אחרי לוגין** (SPA) — לא להסתמך על route כסימן התחברות; להמתין לאלמנט (`[data-tour-tab="dashboard"]` / הון 10,000).

7. **`<tr>` בלי id + 6 כפתורי מחיקה ל-3 שורות** — כל פעולה על שורה חייבת להיות scoped לשורה שזוהתה לפי טקסט.

8. **מלכודת סלקטור ה-hydration — שני כרטיסים מציגים את אותו נתון**: המחרוזת `הון התחלתי` / `starting capital` קיימת **רק** בכרטיס עקומת ההון (`SwingEdge_App.jsx:4592`), גרף שנטען מאוחר בעמוד. הכרטיס העליון `[data-tour="equity"]` (`:3143`) מציג את אותו הון־התחלה כ-`sub` בטקסט **"התחלה $10,000"** / **"Started at $10,000"** (`t.startedAt`, `i18n.js:119/781`) ונטען מיד. סלקטור שכוון למחרוזת "הון התחלתי" נכשל 4/4 ב-`hydration-timeout` (ראיה מ-22:57: הקטע שנלכד הראה "התחלה $10,000" — כלומר hydration הצליח). **מדד תמיד את הכרטיס העליון לפי `[data-tour="equity"]`, לא לפי טקסט הגרף.**
