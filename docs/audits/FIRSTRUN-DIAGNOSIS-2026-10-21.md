# גל הפעלה 1 · אבחון — «הדרך לעסקה הראשונה» על `main` · 2026-10-21

> §8.1 שלב 1 — **read-only על המוצר.** ⛔ אף שורת מוצר לא השתנתה. תוכנית: `docs/plans/PLAN-2026-10-21-firstrun-activation.md`
> (אושרה מ-origin `faf691a` עם שני התיקונים). **רמה T3 · כן/לא/לא/כן/כן.**
> העץ הנמדד: `main` = `faf691a` (קבצי המוצר זהים ל-`23d8ea8`) + קבצי בדיקה בלבד (`tests-eye/firstrun.spec.js` ·
> `tests-eye/hermetic.js` [חילוץ `answerRest`, ⛔ שינוי התנהגות] · `playwright.eye.config.js` [שני פרויקטים]).
> הכל הרמטי: Supabase סינתטי (`hermetic.js`), ⛔ סוד · ⛔ DB · ⛔ חשבון QA. מנועים: **WebKit אמיתי** ל-`iphone14`/`iphone14tall`,
> Chromium ל-`pixel7`/`desktop1440`. ראיה: `eye-evidence/diag-firstrun/main/` (מקומי, ⛔ בריפו — ציבורי).

## TL;DR
1. **ששת הממצאים שוחזרו על `main`** (WebKit אמיתי ל-iPhone, Chromium ל-Pixel/דסקטופ, `he`+`en`, `8/8` תאים).
2. **טאפים מ«סיום השאלון» ועד עסקה שמורה: `7`–`8` (חציון `8`) — ⛔ `9`.** הטאפ השמיני בכל תא שבו הוא קיים הוא **תשובה לבאנר ההסכמה** שכיסה CTA במסלול (§1). ⚠️ מספר האודיט `9` ⛔ שוחזר; ההגדרה כאן כתובה בספק, והפער מדווח ו⛔ מוסבר בניחוש.
3. **שני פערים שמשנים את תכנון התיקון ⇒ עצירה (הכרעת התוכנית):**
   - **G1 — `Log Trade` מחוץ ל-viewport ב-`8/8` תאים** (y=`906`–`1104`), גם בדסקטופ. שורת הכפתורים יושבת **בתוך** גוף הגלילה של הטופס; ההערה «fixed footer» (`SwingEdge_App.jsx:8248`, `B-404`) ⛔ נכונה. אותו מבנה ב-`EditTradeModal` (Save/Cancel y=`1038`/900 בדסקטופ). ⛔ בתוכנית.
   - **G2 — CTA הדאשבורד ב-iPhone 14 (`390×664`) מתחת לכרטיס ההסכמה** (y=`489` he · `533` en). התוכנית כיסתה רק את CTA היומן. אחרי התיקון המסלול הראשי ⛔ עובר בו — אבל P2 (מי שסוגר את המודאל) כן.
4. ממצאים נוספים: X של המודאל **מעל המסך** ב-iPhone 14 (y=`-55`/`-97`, ⛔ נגיש בגלילה — מכוסה ע״י תיקון `m-auto` שבתוכנית) · ניגודיות טקסט ה-toast `2.1:1` (צפוי בתוכנית; הסיבה המדויקת §4) · `B-449`…`B-452`.

## §0 — המכשיר, וארבעה תיקוני מכשיר שנעשו תוך כדי (⛔ במוצר)
`tests-eye/firstrun.spec.js` — סצנות: **path** (המסלול הנספר) · **dashboard** (P2: X ⇒ CTA דאשבורד) · **welcome label** (`with-trades`/`empty-control`, `GET trades` +3s) · **journal actions** (דסקטופ, `1440`/`1024`/`768`). הגדרת הטאפ, מדיניות «עקוב אחר ה-CTA הראשי» והקריטריון «בתוך ה-viewport ∧ `elementFromPoint` = היעד, **בלי גלילה**» — בראש הספק.
⚠️ **«אחרי גלילה»** בטבלאות = `scrollIntoViewIfNeeded` (ה«תרופה» של המשתמש). כשהיעד **כבר** על המסך הוא ⛔ גולל ⇒ «מכוסה גם אחרי גלילה» ⛔ פירושו שגלילה ידנית ⛔ הייתה חושפת. ה«תרופה» הנספרת היא תשובה לבאנר.
תיקוני מכשיר בריצות האבחון (כל אחד נצפה בריצה, ⛔ הונח): ① קריאת הטקסט של ה-toast באמצע `animate-fade-in` (opacity 0 ⇒ `0` צמתים) ⇒ המתנה ל-`getAnimations().finished` · ② סטייה תת-פיקסלית (`616+48`=`664`/`664`) ⇒ סובלנות `0.5px` · ③ ה«תרופה» ענתה לבאנר גם כשהמכסה היה **קצה המסך** ⇒ רק כש-`by === "consent banner"` · ④ מירוץ: הדאשבורד מרונדר לפני שההידרציה מחליטה על המודאל ⇒ המתנה למודאל (היעדרו = אדום). + `getByText(TICKER).first()` תפס את הטבלה המוסתרת במובייל ⇒ `filter({visible:true})`.

## §1 — טאפים (מסלול P1) — `main`
| פרויקט | שפה | טאפים | המסלול |
|---|---|---|---|
| iphone14 | he | 8 | welcome: «בואו נתחיל» → dashboard: add first trade → remedy: answer the consent banner to reach «dashboard: add first trade» → journal: add first trade → form: ticker → form: entry → form: stop → form: Log Trade |
| iphone14 | en | 8 | welcome: «Let's begin» → dashboard: add first trade → remedy: answer the consent banner to reach «dashboard: add first trade» → journal: add first trade → form: ticker → form: entry → form: stop → form: Log Trade |
| iphone14tall | he | 8 | welcome: «בואו נתחיל» → dashboard: add first trade → journal: add first trade → remedy: answer the consent banner to reach «journal: add first trade» → form: ticker → form: entry → form: stop → form: Log Trade |
| iphone14tall | en | 7 | welcome: «Let's begin» → dashboard: add first trade → journal: add first trade → form: ticker → form: entry → form: stop → form: Log Trade |
| pixel7 | he | 8 | welcome: «בואו נתחיל» → dashboard: add first trade → journal: add first trade → remedy: answer the consent banner to reach «journal: add first trade» → form: ticker → form: entry → form: stop → form: Log Trade |
| pixel7 | en | 8 | welcome: «Let's begin» → dashboard: add first trade → journal: add first trade → remedy: answer the consent banner to reach «journal: add first trade» → form: ticker → form: entry → form: stop → form: Log Trade |
| desktop1440 | he | 7 | welcome: «בואו נתחיל» → dashboard: add first trade → journal: add first trade → form: ticker → form: entry → form: stop → form: Log Trade |
| desktop1440 | en | 7 | welcome: «Let's begin» → dashboard: add first trade → journal: add first trade → form: ticker → form: entry → form: stop → form: Log Trade |

## §2 — יעדים ⛔ נגישים בלי גלילה (כשלים בלבד, לפני «תרופה»)
| פרויקט | שפה | סצנה | יעד | מכסה / סיבה | rect / viewport |
|---|---|---|---|---|---|
| iphone14 | he | path | welcome: «בואו נתחיל» | outside the viewport | y=647+48 / 664 |
| iphone14 | he | path | dashboard: add first trade | consent banner | y=489+44 / 664 |
| iphone14 | he | path | journal: add first trade | outside the viewport | y=711+44 / 664 |
| iphone14 | he | path | form: Log Trade | outside the viewport | y=1083+44 / 664 |
| iphone14 | he | path | form: Log Trade | outside the viewport | y=943+44 / 664 |
| iphone14 | he | dashboard | welcome: close (X) | outside the viewport | y=-55+44 / 664 |
| iphone14 | en | path | welcome: «Let's begin» | outside the viewport | y=689+48 / 664 |
| iphone14 | en | path | dashboard: add first trade | consent banner | y=533+44 / 664 |
| iphone14 | en | path | journal: add first trade | outside the viewport | y=755+44 / 664 |
| iphone14 | en | path | form: Log Trade | outside the viewport | y=1083+44 / 664 |
| iphone14 | en | path | form: Log Trade | outside the viewport | y=943+44 / 664 |
| iphone14 | en | dashboard | welcome: close (X) | outside the viewport | y=-97+44 / 664 |
| iphone14tall | he | path | journal: add first trade | consent banner | y=711+44 / 844 |
| iphone14tall | he | path | form: Log Trade | outside the viewport | y=1100+44 / 844 |
| iphone14tall | he | path | form: Log Trade | outside the viewport | y=952+44 / 844 |
| iphone14tall | en | path | form: Log Trade | outside the viewport | y=1100+44 / 844 |
| iphone14tall | en | path | form: Log Trade | outside the viewport | y=952+44 / 844 |
| iphone14tall | en | dashboard | welcome: close (X) | outside the viewport | y=-7+44 / 844 |
| pixel7 | he | path | journal: add first trade | consent banner | y=711+44 / 839 |
| pixel7 | he | path | form: Log Trade | outside the viewport | y=1090+44 / 839 |
| pixel7 | he | path | form: Log Trade | outside the viewport | y=942+44 / 839 |
| pixel7 | en | path | journal: add first trade | consent banner | y=711+44 / 839 |
| pixel7 | en | path | form: Log Trade | outside the viewport | y=1104+44 / 839 |
| pixel7 | en | path | form: Log Trade | outside the viewport | y=955+44 / 839 |
| desktop1440 | he | path | form: Log Trade | outside the viewport | y=906+42 / 900 |
| desktop1440 | he | path | form: Log Trade | consent banner | y=781+42 / 900 |
| desktop1440 | he | path | edit: save | outside the viewport | y=1038+42 / 900 |
| desktop1440 | he | path | edit: cancel | outside the viewport | y=1038+42 / 900 |
| desktop1440 | en | path | form: Log Trade | outside the viewport | y=906+42 / 900 |
| desktop1440 | en | path | form: Log Trade | consent banner | y=781+42 / 900 |
| desktop1440 | en | path | edit: save | outside the viewport | y=1038+42 / 900 |
| desktop1440 | en | path | edit: cancel | outside the viewport | y=1038+42 / 900 |

⚠️ ב-`5/6` תאי המובייל ה«תרופה» ענתה לבאנר במסלול (⛔ ב-`iphone14tall · en`, שבו הבדיקה גם נעצרה לפני המודאלים) ⇒ בדיקת מודאלי Close/Edit **עם הבאנר** ⛔ רצה שם על `main` (רצה בדסקטופ: Close ✓ · Edit Save/Cancel מחוץ ל-viewport). תיפתח אחרי התיקון (אז ⛔ «תרופה»).

## §3 — ניגודיות המודאל (WCAG 2.x, רקע מורכב)
| פרויקט | שפה | בהיר (שער) | כהה (ביקורת) |
|---|---|---|---|
| iphone14 | he | light min 1.13 (8/10 < 4.5) · icon 7.76 | dark min 7.49 · icon 6.47 |
| iphone14 | en | light min 1.13 (8/10 < 4.5) · icon 7.76 | dark min 7.49 · icon 6.47 |
| iphone14tall | he | light min 1.13 (8/10 < 4.5) · icon 7.76 | dark min 7.49 · icon 6.47 |
| iphone14tall | en | light min 1.13 (8/10 < 4.5) · icon 7.76 | dark min 7.49 · icon 6.47 |
| pixel7 | he | light min 1.13 (8/10 < 4.5) · icon 7.76 | dark min 7.49 · icon 6.47 |
| pixel7 | en | light min 1.13 (8/10 < 4.5) · icon 7.76 | dark min 7.49 · icon 6.47 |
| desktop1440 | he | light min 1.13 (8/10 < 4.5) · icon 7.76 | dark min 7.49 · icon 6.47 |
| desktop1440 | en | light min 1.13 (8/10 < 4.5) · icon 7.76 | dark min 7.49 · icon 6.47 |

פירוט צמתים (Pixel 7 · he · בהיר):
| טקסט | fg | bg | יחס |
|---|---|---|---|
| ברוכים הבאים ל-SwingEdge 👋 | `#1b2419` | `#0a100d` | 1.2 |
| המערכת שלנו לומדת אותך — ולכל למידה צריך נתונים. | `#4a5848` | `#0a100d` | 2.54 |
| איך מפיקים ממנה את המקסימום: | `#6b7868` | `#0a100d` | 4.13 |
| הזינו לפחות 10 עסקאות | `#1b2419` | `#111714` | 1.13 |
| — מהיומן הקיים שלכם או ידנית. מ-10 עסקאות ה-Coac | `#4a5848` | `#111714` | 2.4 |
| חקרו את כל הטאבים | `#1b2419` | `#111714` | 1.13 |
| — Trading DNA, Edge Finder, ניתוח עסקה עם צילום  | `#4a5848` | `#111714` | 2.4 |
| יש רעיון או משהו שלא עובד? טאב הפידבק פתוח — לשי | `#4a5848` | `#0a100d` | 2.54 |
| סוחר טוב מודד. סוחר מצוין נמדד. | `#00c076` | `#0a100d` | 8.05 |
| בואו נתחיל | `#04120c` | `#00d484` | 9.8 |

## §4 — toast
| פרויקט | שפה | אזור ריק לפני הטאפ הראשון | success בבהיר | error בבהיר |
|---|---|---|---|---|
| iphone14 | he | empty region 36×32 bg rgb(255, 255, 255) border 4 shown=true | success 2.1 (#00c805/#ebfbeb) | error 4.84 (#c8201f/#fae9e9) |
| iphone14 | en | empty region 36×32 bg rgb(255, 255, 255) border 4 shown=true | success 2.1 (#00c805/#ebfbeb) | error 4.84 (#c8201f/#fae9e9) |
| iphone14tall | he | empty region 36×32 bg rgb(255, 255, 255) border 4 shown=true | success 2.1 (#00c805/#ebfbeb) | error 4.84 (#c8201f/#fae9e9) |
| iphone14tall | en | empty region 36×32 bg rgb(255, 255, 255) border 4 shown=true | success 2.1 (#00c805/#ebfbeb) | error 4.84 (#c8201f/#fae9e9) |
| pixel7 | he | empty region 36×32 bg rgb(255, 255, 255) border 4 shown=true | success 2.1 (#00c805/#ebfbeb) | error 4.84 (#c8201f/#fae9e9) |
| pixel7 | en | empty region 36×32 bg rgb(255, 255, 255) border 4 shown=true | success 2.1 (#00c805/#ebfbeb) | error 4.84 (#c8201f/#fae9e9) |
| desktop1440 | he | empty region 36×32 bg rgb(255, 255, 255) border 4 shown=true | success 2.1 (#00c805/#ebfbeb) | error 4.84 (#c8201f/#fae9e9) |
| desktop1440 | en | empty region 36×32 bg rgb(255, 255, 255) border 4 shown=true | success 2.1 (#00c805/#ebfbeb) | error 4.84 (#c8201f/#fae9e9) |

**שורשים (נקראו בקוד):** ① `index.css:683` `[role="status"][class*="fixed"]` פוגע **רק** במיכל (`ToastProvider.jsx:37`), מאז ש-`B-388` (01.10) נתן לו `role="status"` · `:704` (RTL) צובע border על **כל** `role="status"` ב-RTL. ② טקסט ה-toast: `index.css:132` — `.bg-emerald-500\/10 { … color: var(--accent-emerald) }` גובר על `text-emerald-200` (אותה ספציפיות, מאוחר יותר) ⇒ `#00c805` על `#ebfbeb` = `2.1:1`. info מחושב (⛔ נצפה): `#0284c7` על `#ebf5fb` = `3.70:1`. ⇒ **תיקון `text-*-800` כמחלקת utility ⛔ יגבר** — נדרש צבע בהיר-בלבד על הצאצא (`[html:not(.dark)_&]:text-[#hex]`), כך שבכהה ⛔ קיים כלל ⇒ הצבע המחושב זהה. מחושב לתיקון: success `7.15` · error `6.83` · info `6.84` (טקסט) · אייקונים `5.10`–`5.36`.

## §5 — נוסח הכפתור הראשי בזמן טעינת עסקאות (+3s)
| פרויקט | שפה | יומן | רצף נוסחים | נוסח סופי |
|---|---|---|---|---|
| iphone14 | he | with-trades | begin | בואו נתחיל |
| iphone14 | he | empty-control | begin | בואו נתחיל |
| iphone14 | en | with-trades | begin | Let's begin |
| iphone14 | en | empty-control | begin | Let's begin |
| iphone14tall | he | with-trades | begin | בואו נתחיל |
| iphone14tall | he | empty-control | begin | בואו נתחיל |
| iphone14tall | en | with-trades | begin | Let's begin |
| iphone14tall | en | empty-control | begin | Let's begin |
| pixel7 | he | with-trades | begin | בואו נתחיל |
| pixel7 | he | empty-control | begin | בואו נתחיל |
| pixel7 | en | with-trades | begin | Let's begin |
| pixel7 | en | empty-control | begin | Let's begin |
| desktop1440 | he | with-trades | begin | בואו נתחיל |
| desktop1440 | he | empty-control | begin | בואו נתחיל |
| desktop1440 | en | with-trades | begin | Let's begin |
| desktop1440 | en | empty-control | begin | Let's begin |

על `main` הנוסח «תעד את העסקה הראשונה שלך» ⛔ קיים ⇒ `with-trades` ירוק טריוויאלית ו-`empty-control` אדום — **זה הצפוי**; הביקורת היא שמוכיחה שהשער מודד את הטעינה אחרי התיקון.

## §6 — פעולות היומן בדסקטופ
| שפה | רוחב | מחוץ | x | מיכל הגלילה | רוחב עמוד |
|---|---|---|---|---|---|
| he | 768 | 7/7 off | x -1009..-868 | scroller 20..748 | page 768/768 |
| he | 1024 | 7/7 off | x -695..-588 | scroller 20..1004 | page 1024/1024 |
| he | 1440 | 7/7 off | x -279..-172 | scroller 20..1420 | page 1440/1440 |
| en | 768 | 7/7 off | x 1753..1894 | scroller 20..748 | page 768/768 |
| en | 1024 | 7/7 off | x 1729..1836 | scroller 20..1004 | page 1024/1024 |
| en | 1440 | 7/7 off | x 1729..1836 | scroller 20..1420 | page 1440/1440 |

⚠️ האודיט מסר x=`1552` (en, 1440) — כאן `1729`: רוחב העמודות תלוי בתוכן היומן (כאן `EYE_SEED_HISTORY` + שורה פתוחה). הממצא זהה, המספר תלוי-נתונים. ⛔ גלילה אופקית של **העמוד** בשום רוחב.

## §7 — השאלון (גל 2 — נרשם, ⛔ נשפט)
| פרויקט | שפה | מכוסים | |
|---|---|---|---|
| iphone14 | he | 1/12 | finish (⛔ counted):outside the viewport |
| iphone14 | en | 1/12 | finish (⛔ counted):outside the viewport |
| iphone14tall | he | 0/12 |  |
| iphone14tall | en | 0/12 |  |
| pixel7 | he | 0/12 |  |
| pixel7 | en | 0/12 |  |
| desktop1440 | he | 0/12 |  |
| desktop1440 | en | 0/12 |  |

## §8 — מה ⛔ נמדד
- iOS פיזי (WebKit בדסקטופ, אמולציית UA+viewport). · פרודקשן (הסצנה תרוץ שם רק אחרי merge). · משתמש ש**כבר** ענה לבאנר ההסכמה. · נגישות מקלדת/קורא מסך. · info toast במסך. · ניגודיות על רקע גרדיאנט (`B-451`).

## §9 — הכרעה נדרשת (עצירה לפי התוכנית)
- **G1:** להעביר את שורת הכפתורים של Log Trade ושל Edit ל**פוטר קבוע** מחוץ לגוף הגלילה (`shrink-0`), + `MUT-FOOTER`. מקטין את שטח הגלילה בגובה הפוטר; ⛔ משנה לוגיקה.
- **G2:** CTA הדאשבורד ב-`390×664` — (א) דחיסת כרטיס «ברוך הבא» במובייל (אימוג׳י/ריווח) כך שה-CTA עולה מעל הכרטיס; אם ⛔ מספיק ⇒ (ב) נגיעה בגובה באנר ההסכמה = **החלטת ניב** (משטח משפטי).
