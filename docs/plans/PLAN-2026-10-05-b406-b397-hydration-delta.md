# PLAN 2026-10-05 — B-406 + B-397 · הידרציה: מיזוג דלתא מקומית, ⛔ דריסה

## Context
בטעינה, `hadPlaybook`/`hadWatchlist`/`hadAlerts` נלכדים **לפני** שני `await` לרשת (`SwingEdge_App.jsx:1822-1824`), והכלל היום הוא «מקומי לא-ריק ⇒ ה-DB נזנח · מקומי ריק ⇒ ה-DB דורס». שני הכיוונים מאבדים נתונים **בשקט**: שינוי שנעשה בחלון ההמתנה נדרס (`B-406`), ורשימה מקומית מיושנת מסתירה את ה-DB ואז דורסת אותו (`B-397`). המטרה: אף שינוי של המשתמש ⛔ נעלם, ואף נתון ממכשיר אחר ⛔ נבלע — בלי שינוי סכמה ובלי לגעת ב-K6.

**Safety gate:** HEAD=`19959e6`=origin/main · עץ נקי · hooksPath=`.githooks` ✅.

## §15 — רמה: T3 · כן/כן/לא/כן/לא
1 הפיכות **כן** (כתיבת DB — הבלוב נדרס) · 2 אמון **כן** (נתון נעלם בלי הודעה) · 3 אבטחה לא (⛔ RLS/סודות; ה-upsert ⛔ משתנה) · 4 רוחב **כן** (`SwingEdge_App.jsx` + מודול חדש + `userSettings.js`) · 5 ודאות לא (נמדד היום, §0).

## §0 — עובדות שנמדדו (3a · build הרמטי מ-`19959e6`, Chromium, `tests-eye/hermetic.js`, GET של `user_settings` מוחזק עד שחרור)
מסלול: שלב 1 התחברות + הידרציה מלאה (המכשיר «חוזר») ⇒ שלב 2 רענון עם GET מוחזק ⇒ פעולה בחלון ⇒ שחרור ⇒ רענון.
**הממשק חי בחלון רק במכשיר חוזר** (`swingEdgeOnboarding` קיים ⇒ `onboardingSettled`); במכשיר טרי השער מחכה. כך בדיוק היה ב-CI `37214635477`: `storageState` נשא `swingEdgePlaybook="[]"`, ו-`had("[]")` מחזיר `false`.

| תרחיש | פעולה | בחלון | אחרי שחרור + רענון | DB |
|---|---|---|---|---|
| `B-406` playbook | הוסף `WINDOW-SETUP` | מקומי `[WINDOW-SETUP]` | 🔴 מקומי `[]` | 🔴 `[]` |
| `B-406` התראות | התראה `EYEPB:105` על עסקה פתוחה | מקומי `{EYEPB:105}` | 🔴 `{}` | 🔴 `{}` |
| `B-397` (שני מכשירים) | מכשיר B כתב `S2`; A מקומי `[S1]` ⇒ A מוסיף `S3` | A ⛔ רואה `S2` | A: `[S1,S3]` | 🔴 `[S1,S3]` — **`S2` נמחק מה-DB** |
| 🆕 watchlist, **מכשיר טרי** | DB `[AAPL,KO]`, התחברות בדפדפן חדש | — | 🔴 מסך = `DEFAULT_WATCHLIST` | 🔴 **DB נדרס ל-10 ברירות המחדל** |
| ביקורת: משתמש חדש (אין שורה, אין מקומי) | — | — | נוצרה שורה, ⛔ קריסה | ✅ |
| ביקורת: מכשיר טרי, playbook/התראות ב-DB בלבד | — | — | ✅ `DB-ONLY` מוצג · `{AAPL:300}` נטען | ✅ |

⚠️ **ממצא חדש מעבר לפרומפט (→ `B-407`):** במכשיר טרי, אפקט ההתמדה של ה-watchlist כותב את `DEFAULT_WATCHLIST` ל-`localStorage` **בטעינת מסך ההתחברות** (האפליקציה מורכבת לפני ה-auth); ההידרציה רצה אחרי ההתחברות ⇒ `hadWatchlist=true` ⇒ ה-DB נזנח, ושינוי הבא נכתב ⇒ **ה-watchlist של המשתמש מוחלף בברירות המחדל בכל דפדפן/מכשיר חדש.** (התנתקות→התחברות באותו טאב ⛔ מושפעת: `clearUserScopedStorage` מוחק את המפתח.) ייתכן שזה מסביר את `46/46` השורות עם ליטרלי `SCANNER_DATA` (`B-185`) — **מתאם, ⛔ הוכחה**; SQL לניב ב-§6.
⚠️ watchlist ב-B-406 (הוספה בחלון) ⛔ שוחזר עד הסוף — אוכלס ב-defaults בשלב 1 (בדיוק `B-407`); מכוסה בבדיקות ה-spec (§4) עם DB לא-ריק.

## §0b — מפת מפתחות הבלוב (3b)
| מפתח | כותב | קורא בהידרציה | הכלל היום |
|---|---|---|---|
| `capital` · `riskPct` · `accountCurrency` · `capitalCurrency` | אפקט ההתמדה (`:1953`) | `:1859-1879` | **DB גובר** (אם תקין) |
| `lang` | התמדה | `:1893` | DB גובר |
| `onboarding` | התמדה (מראה) · `handleOnboardingComplete` | `:1885` | DB גובר אם `completed` |
| `tourDone` · `betaWelcome` · `welcomeSeen` | `completeTour`/`dismissWelcome` (ישירות ל-DB) · התמדה | `:1909-1917` | OR מונוטוני (`true` גובר) |
| `watchlist` | התמדה · `handleSymbolPick :3667` · מחיקה `:3678` | `:1898` | `hadWatchlist` (מקומי לא-ריק גובר) |
| `priceAlerts` | התמדה · הוספה `:4850` · מחיקה-כשהופעלה `:2136` | `:1902` | `hadAlerts` |
| `playbook` | התמדה · `savePlaybook` (`:7243`; הוספה `:7260` · עריכה `:7257` · מחיקה `:7293`) | `:1906` | `hadPlaybook` |
| `_migrated` | `migrateFromLocalStorage` | — | — |
⚠️ גם סקלרים שנערכו **בחלון** נדרסים ע"י «DB גובר» (שינוי הון בזמן הטעינה) ⇒ **`B-408`, ⛔ בגל הזה** (מסלול אחר: שער עריכה/ממשק, ⛔ מיזוג אוספים).

## §0c — הקשר ל-K6 (3c) — ⛔ פותר · ⛔ מחמיר · **מיושר**
K6 = צד ה**כתיבה** (`upsertBlob` מחליף את כל העמודה; שתי לשוניות דורסות). התיקון כאן נוגע בצד ה**קריאה** בלבד, ⛔ משנה את ה-upsert ⛔ את `alreadySent`. הוא **מממש בקריאה את הכרעת ניב 22.09 ל-`B-361`** («המרוחק מנצח + המפתחות שהלשונית שינתה מוחלים מעליו») — ויומן הדלתא שנבנה כאן הוא בדיוק מה שצד הכתיבה של K6 יצטרך (select→מיזוג→upsert). ⚠️ שתי לשוניות באותו דפדפן חולקות את היומן (localStorage) ⇒ ⛔ החמרה. שתי לשוניות שכותבות **בו-זמנית** — עדיין last-writer-wins (K6, פתוח).

## §1 — הכיוון: הפרכה חלקית של §4 בפרומפט
**«union לפי id» ⛔ מספיק:** union פשוט מחזיר לחיים פריט שנמחק במכשיר אחר, משאיר פריט מקומי מיושן מעל ה-DB (`B-397` ⛔ נפתר), ובמכשיר טרי מאחד את ברירות המחדל לתוך ה-DB (`B-407` מחמיר). מה שנכון הוא **union מוגבל לשינויים שהמכשיר הזה באמת עשה**:

**יומן דלתא מקומי (`swingEdgeSettingsDelta`) — ה-DB הוא הבסיס, פעולות המשתמש מוחלות מעליו.**
- כל פעולת משתמש על אוסף רושמת op: `{coll, key, op: "put"|"del", value, seq}` — key = `id` (playbook) · `ticker` (watchlist · alerts). 7 אתרי כתיבה (§0b).
- **הידרציה:** `merged = applyDelta(remote, ops)` — היומן נקרא **אחרי** ה-`await` (⇒ op מהחלון נכלל). `put` על id קיים ⇒ **ערך המכשיר גובר** (אין `updatedAt` בפריטים; זו הכרעת `B-361`: מה שהלשונית שינתה מוחל מעל המרוחק). `del` ⇒ הפריט ⛔ חוזר מה-DB = **ה-tombstone**, בלי סכמה.
- **ניקוי:** op נמחק מהיומן רק אחרי `upsert` **מאושר** שהבלוב שלו מכיל את התוצאה (`put` ⇒ הערך שם · `del` ⇒ הפריט חסר). כשל כתיבה ⇒ היומן נשאר ⇒ ההידרציה הבאה מחילה שוב (פעולות אידמפוטנטיות).
- **אין דלתא ⇒ ה-DB גובר** ⇒ `B-397` (`S2` מופיע) · `B-407` (מכשיר טרי מקבל את ה-watchlist שלו).
- **מעבר חד-פעמי (מכשירים קיימים בלי יומן):** מקומי שאינו זהה ל-`DEFAULT_WATCHLIST` ⇒ union פעם אחת (מקומי גובר על אותו id) כדי ⛔ לאבד שינויים ישנים שלא נכתבו (סשנים עם `hydrationFailed`) ⇒ סמן `swingEdgeSettingsDeltaV1`. מחיר מתועד: פריט שנמחק במכשיר אחר עלול לחזור **פעם אחת** במעבר.
- `hydrationFailed` ⇒ ⛔ מיזוג, היומן נשמר (כמו היום: ⛔ כתיבות).
- המפתחות user-scoped ⇒ נמחקים בהתנתקות (`clearUserScopedStorage`, allowlist) ⇒ ⛔ דליפה בין משתמשים.

## §1b — תיקוני ניב 05.10 (באישור)
**① ⛔ ערך ביומן — מפתחות בלבד `{coll,key,op,seq}`.** `put` נפתר בזמן ההחלה מהאוסף המקומי (`localStorage` של האוסף, שנכתב באותה פעולה) ⇒ ⛔ עותק שלישי של `imagePreview`. **נמדד (Chromium, מכסה אמיתית 5,242,877 תווים):** אחרי מצב G1 (trades `1.5M` + 5 סטאפים בתמונה `230,351` תווים + מראה) נותרו `1,438,733`; יומן מלא = `1,152,316` ⇒ **נכנס** ⇒ G1 כמו שהוא **⛔ יכול** להאדים על המוטנט. ⇒ **G1J חדש ב-`probe:image`:** אותו מצב + **סטאפ שישי** עם יומן פעיל ⇒ `6/6` שורדים רענון + היומן ⛔ מכיל `data:`. יומן-מפתחות: `236` תווים ⇒ ירוק; מוטנט «value מלא» ⇒ השישי נופל ל-`image_dropped`/`failed` (1,438,733 − 1,152,316 = 286K < 460K שהשישי דורש) ⇒ **אדום**. G1 המקורי נשאר ירוק.
**② settle גם על דילוג `alreadySent`.** `lastSent` נקבע **רק** מקריאה מאושרת (`loadSettings` ok) או מ-`upsert` מאושר ⇒ דילוג = הוכחה שה-DB מחזיק בדיוק את הבלוב ⇒ `notifySynced(blob)` נקרא גם במסלול הדילוג (ב-timer וב-`flushSettings`). ⛔ כתיבה נוספת. בדיקה: op שתוצאתו כבר ב-DB (נכתב, וה-settle אבד בסגירת טאב) ⇒ ההידרציה הבאה ⇒ דילוג ⇒ היומן מתרוקן. מוטנט: settle רק אחרי upsert ⇒ אדום.
**③ יומן חסום.** איחוד לפי `(coll,key)` — רק ה-op האחרון נשמר ⇒ הגודל ≤ מספר המפתחות שנגעו בהם. תקרה `500` ops / `32KB`; חריגה ⇒ האוסף מתקפל ל-op יחיד `replace` (המקומי גובר על האוסף הזה בהידרציה הבאה — כמו `had*` היום, ⛔ אובדן) + **toast פעם בסשן** (`settingsSyncPending`, i18n 5 שפות, `toast.error` ⇒ `role=alert`). כשל כתיבת היומן עצמו (מכסה) ⇒ אותו toast + `console.error`, ⛔ זריקה שקטה. מוטנט: `catch {}` ריק סביב כתיבת היומן ⇒ אדום (הבדיקה מזריקה `setItem` שזורק ומודדת שה-notifier נקרא).
**M-026 (נמדד ע"י הצ'אט 05.10, Supabase read-only):** `rows_with_watchlist=49` · `exactly_defaults=49/49` · `empty=0` — חסם עליון, ⛔ מבחין «לא שינה» מ«נדרס». ⇒ DECISIONS: אין היום watchlist שאינו ברירת מחדל ⇒ המעבר החד-פעמי (union) ⛔ מסכן אף שורה קיימת.

## §2 — קבצים
- **`src/lib/settingsDelta.js` (חדש, טהור):** `recordOp` · `readOps` · `applyDelta(remote, ops, keyOf)` · `settleOps(sentBlob)` · `legacyMerge`. ⛔ React.
- **`src/lib/userSettings.js`:** hook יחיד `onSettingsSynced(cb)` שנקרא אחרי `upsert` מוצלח **וגם על דילוג `alreadySent`** (②) עם הבלוב — ⛔ שינוי סמנטיקת כתיבה · `alreadySent`/`lastSent` עצמם ⛔ משתנים (`test:settings` לפני ואחרי).
- **`src/i18n.js`:** מפתח `settingsSyncPending` × 5 שפות (③).
- **`scripts/image-store-probe.mjs`:** זרוע G1J (①).
- **`SwingEdge_App.jsx`:** הידרציה `:1822-1824` + `:1898-1908` ⇒ `applyDelta`; 7 אתרי הכתיבה ⇒ `recordOp` לצד ה-setState הקיים (⛔ קומפוננטה בתוך render · ⛔ מחרוזות load-bearing).

## §3 — בדיקות (red-before חובה)
- **`test:hydration` (אירוח, ⛔ חוליה חדשה ⇒ «33» ⛔ זז):** בלוק חדש — ערך על `applyDelta`/`settleOps` + חיווט ההידרציה המחולצת (op מהחלון · B-397 · tombstone · מעבר). אדום על `19959e6` לפני השינוי. ⚠️ המספר בפרוזה זז ביד (`B-257`).
- **`tests-eye/hydration.spec.js` + `scripts/eye-sync-probe.mjs`** (מכונת `eyeBuild.mjs`, הרמטי, Pixel 7 + iPhone 14): התרחישים של §0 כשער. זרועות: HEAD ירוק · **BEFORE** (`19959e6`) אדום · **MUT-EARLY** (קריאת היומן לפני ה-`await`) · **MUT-OVERWRITE** (`applyDelta` ⇒ remote) · **MUT-RESURRECT** (התעלמות מ-`del`) ⇒ כולם אדומים. ביקורת: משתמש חדש · מכשיר טרי (DB בלבד ⇒ הכל נטען, watchlist מה-DB ⛔ defaults) ⇒ ירוקים בכל הזרועות.
- **`tests-eye/playbook.spec.js` צעד `f` מול production:** רענון עם GET של `user_settings` **מושהה** ~4s (קריאה בלבד, הדפדפן שלנו) ⇒ הוספת `e2e-c064-…-f` בחלון ⇒ שחרור ⇒ רענון ⇒ שורד + ניקוי בתחילית. `eye-playbook.yml` paths += הקבצים החדשים.
- **מוטנטים נוספים (תיקוני ניב):** ⓐ value מלא ביומן ⇒ G1J אדום · ⓑ settle רק אחרי upsert (בלי מסלול הדילוג) ⇒ בדיקת ② אדומה · ⓒ `catch {}` ריק סביב כתיבת היומן ⇒ בדיקת ③ אדומה · ⓓ ⛔ איחוד לפי key ⇒ בדיקת הגודל אדומה.
- `npm run verify` (33) · `test:registry` · `probe:image` (LEGACY אדום · G1/G1J/G2/G3 ירוקים).

## §4 — רישום
`B-406`·`B-397`·`B-407` ⇒ `D-115` + מצבות · `B-408` חדש (פתוח) · `DONE` (T3, run id, אומת-מקור) · `DECISIONS`: «יומן דלתא = הבסיס הוא ה-DB, פעולות המכשיר מעליו; ⛔ union עיוור» · `INCIDENTS` (CI `37214635477`) · `CHECKS` · `STATE` · `TRUTH` (watchlist במכשיר חדש) · `METRICS` M-026 (`49/49` = בדיוק ברירות מחדל, נמדד ע"י הצ'אט 05.10 — חסם עליון) · `B-408` (סקלרים בחלון) נרשם ⛔ מתוקן (מאושר).

## §5 — סדר עבודה (§9)
✅ אושר 05.10 (עם 3 תיקונים, §1b) ⇒ קומיט נפרד: `docs/plans/PLAN-2026-10-05-b406-b397-hydration-delta.md` + `docs/audits/B406-HYDRATION-DIAGNOSIS-2026-10-05.md` (§0–§0c + סקריפט השחזור) + **`NEXT` = B-406(+B-397) · B-402 · B-321** ⇒ push ⇒ STOP ⇒ אישור ⇒ branch מ-main ⇒ red-before ⇒ ביצוע ⇒ PR ⇒ CI ירוק ⇒ merge (merge commit) ⇒ ריצה מול production אחרי deploy = תנאי סגירה ⇒ רישום ⇒ דוח אחד.

## §6 — SQL לניב (read-only, ספירות בלבד — `B-407`, היקף)
```sql
SET default_transaction_read_only = on;
SELECT count(*) AS rows_with_watchlist,
  count(*) FILTER (WHERE (SELECT array_agg(w->>'ticker' ORDER BY w->>'ticker') FROM jsonb_array_elements(settings->'watchlist') w)
    = ARRAY['AMD','AVGO','BTC','ETH','META','MSTR','NVDA','PLTR','SMCI','TSLA']) AS exactly_defaults
FROM public.user_settings WHERE jsonb_typeof(settings->'watchlist') = 'array';
```
(המכנה = `rows_with_watchlist`. ⚠️ «בדיוק ברירות המחדל» ⛔ מבחין בין «לא שינה» ל«נדרס» — חסם עליון.)

## Verification
1. red-before: `test:hydration` (בלוק חדש) אדום על `19959e6` · `probe:eye:sync` BEFORE + 3 מוטנטים אדומים, HEAD + ביקורת ירוקים.
2. `npm run verify` · `test:settings` לפני ואחרי · `test:registry`.
3. CI: probe-sync + prod playbook (כולל `f`) ירוקים ⇒ merge ⇒ ריצה על push אחרי deploy ירוקה = סגירת `D-115`.
