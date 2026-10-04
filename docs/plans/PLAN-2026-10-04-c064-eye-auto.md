# PLAN 2026-10-04 — C-064 · eye-check אוטומטי לתמונות Playbook (B-015 · B-038)

## Context
C-064 (עין על שמירת תמונת Playbook מעל 3MB) פתוח מאז `714f0e4`. הכרעת ניב 04.10: נסגר **באוטומציה מלאה**, ⛔ בעין ידנית — כל צעד a–e נמדד, עם ראיה, ועם הוכחה שהבדיקה יכולה להיכשל. בונים על `tests/eye.spec.js` · `tests/lib/eyeTools.js` · `scripts/eye-probe.mjs` (build הרמטי) · `scripts/image-store-probe.mjs` (זרוע LEGACY + מוטנטים).

**Safety gate (נמדד):** `HEAD = origin/main = 4d1def3` · עץ נקי · `core.hooksPath` **לא היה מוגדר** ב-clone הזה ⇒ הותקן לפי §6.

## §15 סיווג — רמה: T3 · תשובות: כן/לא/כן/כן/כן
1 הפיכות **כן** (כתיבה+מחיקה בחשבון QA בפרודקשן) · 2 אמון לא (בדיקה בלבד, ⛔ `src/`) · 3 אבטחה **כן** (workflow + `secrets.`) · 4 רוחב **כן** (≥5 קבצי קוד) · 5 ודאות **כן** (WebKit ב-CI ⛔ נמדד). ⇒ אימות-אחרי = ריצת CI ירוקה מ-`origin` + ראיות (screenshots) — ⛔ אין מסך מוצר שמשתנה.

## §0 — אבחון: הנחות בפרומפט שנמדדו (scratchpad, Chromium מקומי, tesseract.js 5)
| # | הנחה | מדידה | הכרעה |
|---|------|--------|--------|
| ① | F2 עם ציר 12–14px קריא אחרי הפרופיל | 13px: שמור **0–2/8** · 18/24/30/36px: **8/8** · מקור 8/8 בכל גודל · מוטנט 400px·q.2: **0/8** בכל גודל | ניב: שער = **33px** (11pt×3); 13px = שורת stress ל-METRICS + `B-` (⛔ שער); + **F2b** דסקטופ 1920×1080 ציר 12px (⇒ ~8.7px) — מדידה; <7/8 ⇒ `B-` עדיפות גבוהה + הצעת פרופיל חלופי עם מדידת גודל. ⛔ שינוי פרופיל בגל |
| ② | F1 «רעש» ≥3.5MB | רעש מלא: 12.7MB ⇒ שמור **657KB / 249KB > 200KB ⇒ נדחה בתכנון** (a היה אדום בגלל הפיקסצ'ר) · גרדיאנט+רעש ±20: 6.2MB ⇒ **101KB** ✓ | F1 = גרדיאנט+רעש ±20, 4032×3024, JPEG q.95, seed קבוע. רעש מלא = **F1x** ⇒ מסלול הדחייה נבדק ב-c |
| ③ | OCR גולמי מספיק | OCR על כל הגרף: **0/8 גם על המקור** | עיבוד-קדם **קפוא וזהה לכל הזרועות**: חיתוך רצועת הציר (קואורדינטות יחסיות למקור) · ×3 · היפוך+אפור · PSM 11 · whitelist `0-9.` ⇒ מקור 8/8 |
| ④ | `tradeImage` נבדק אחרי reload | הטעינה היא REPLACE-from-DB ו-`LOCAL_ONLY` מסיר את השדה ⇒ בדיקה אחרי reload **עיוורת מבנית** למוטנט M9 | e בודק `swingEdgeTrades` **מיד אחרי השמירה** + אחרי reload; MUT-E חייב להאדים את הראשונה |
| ⑤ | הנתונים נשארים מקומיים | `:1960` `playbook: playbookSetups` ⇒ התמונות נכתבות ל-`user_settings` ב-DB (מסלול `B-400`) | ריצה כותבת ~0.5–1MB לשורת QA ⇒ ניקוי DB חובה |

## §1 — הדיף (בדיקה בלבד, ⛔ `src/` · ⛔ `SwingEdge_App.jsx`)
| קובץ | פעולה |
|------|--------|
| `tests-eye/playbook.spec.js` | **חדש** — צעדים a–e + ניקוי. תיקייה נפרדת ⇒ `playwright.config.js` (smoke) ⛔ נוגע ו⛔ קולט אותו |
| `tests-eye/fixtures.js` | **חדש** — F1(×5 seeds) · F1x · F2(33px) · F2s(13px) · F2b(1920×1080/12px) · F3a(txt→.jpg) · F3b(JPEG חתוך). נוצרים **פעם אחת** ב-globalSetup ב-Chromium, sha256 מודפס, אותם בייטים לשני המכשירים |
| `tests-eye/ocr.js` | **חדש** — worker tesseract + עיבוד-קדם ③ קפוא; traineddata מחבילה נעוצה (⛔ הורדה בזמן ריצה) |
| `playwright.eye.config.js` | **חדש** — `Pixel 7` + `iPhone 14` · `workers:1` (סדרתי — שני מכשירים על אותה שורת QA) · `retries:0` · `testDir:'tests-eye'` |
| `scripts/eye-playbook-probe.mjs` | **חדש** — red-before הרמטי (§3) |
| `.github/workflows/eye-playbook.yml` | **חדש** (§4) |
| `package.json` | devDep `tesseract.js` (נעוץ) · `test:eye:playbook` · `probe:eye:playbook`. ⛔ בשרשרת verify ⇒ «33 חוליות» ⛔ זז |
| `tests/lib/eyeTools.js` | שימוש חוזר: `login` · `redact` · `installFlashRecorder`. אם זריעת ה-session הסינתטי של `eye-probe.mjs` אינה מיוצאת ⇒ חילוץ ל-`seedSyntheticSession` כאן (+ `eye-probe` מייבא) |
| `scripts/verify-evidence.mjs` | שימוש חוזר בסורק הדליפות; אם דורש findings ⇒ דגל `--scan-only` + אסרציה ב-`test:diagnosis` + `test:syntax` |

## §2 — הצעדים (מול production, חשבון QA, תחילית `e2e-c064-<run>-<device>-`)
- **pre-sweep:** שרידי ריצה קודמת בתחילית בלבד ⇒ מוחקים ומדווחים (⛔ שקט).
- **a** סטאפ + F1 ⇒ שמירה ⇒ reload ⇒ הסטאפ קיים · `<img>.naturalWidth>0` · `imagePreview` ב-`swingEdgePlaybook` ≤204,800 בתים מפוענחים · ⛔ toast שגיאה (flash recorder על 3 מחרוזות ה-toast, נגזרות מ-`src/i18n.js` ⛔ ליטרל).
- **b** 5 סטאפים (F1 seeds 1–5, תמונות שונות), reload אחרי כל אחד ⇒ k/k שורדים בשלב k · sha256 של כל data-URL קודם ⛔ משתנה · כל `<img>` נטען.
- **c** F3a · F3b · F1x ⇒ toast `t.playbookImageFailed` (`role=status`) · הסטאפ נשמר עם `imagePreview:null`.
- **d** F2 ⇒ reload ⇒ חילוץ התמונה השמורה ⇒ OCR ≥7/8 (שער). ביקורת: OCR על F2 המקורי = 8/8, אחרת **המדידה פסולה (אדום)**. F2s + F2b = שורות מדידה (annotation + `ocr.json`), ⛔ שער.
- **e** טופס עסקה + F2 ⇒ תצוגה מקדימה גלויה ⇒ קריאת `/api/ocr` אחת (תוצאה נרשמת; כשל ⇒ דיווח, ⛔ החלשה) ⇒ ticker `C064`, notes בתחילית ⇒ המתנה ש-`Log Trade` פעיל (B-376) ⇒ שמירה ⇒ `swingEdgeTrades`: לעסקה ⛔ `tradeImage` (key נעדר) **מיד** ואחרי reload.
- **ניקוי (`finally`):** מחיקת סטאפים בתחילית דרך ה-UI + עסקת `C064` דרך היומן ⇒ אימות 0: `localStorage` + REST GET (`trades`, `user_settings.playbook`) בטוקן QA. רשת ביטחון REST: `DELETE trades?ticker=eq.C064&notes=like.e2e-c064-*`; ל-`user_settings` read-modify-write של מערך `playbook` בלבד, סינון בתחילית, צורה לא צפויה ⇒ אדום ו⛔ כתיבה. ⛔ מחיקה מחוץ לתחילית.

## §3 — הוכחת ערך: `probe:eye:playbook` (הרמטי, ⛔ סודות, ⛔ DB)
build לכל עץ עם מקור Supabase סינתטי (תבנית `eye-probe`), REST מדומה בעל-מצב, `/api/ocr` מדומה. מוטנטים במקום + שחזור + `git diff --exit-code`; התאמה ≠1 ⇒ אדום (`B-272`).
| זרוע | שינוי | צפי |
|------|-------|------|
| HEAD | — | ירוק |
| LEGACY | `savePlaybook`+`handlePlaybookImageUpload` בבייטים קפואים מ-`3d24c23` | **a/b אדום** (F1 גולמי 8.3M תווים > מכסה ⇒ `catch{}`) |
| MUT-D | `STORED_MAX_EDGE_PX=400` · `STORED_Q_PRIMARY=0.2` | **d אדום** |
| MUT-E | M9 מ-`probe:image` (`tradeImage` נכתב שוב) | **e (לפני reload) אדום** |
⛔ מוטנט ששורד / LEGACY ירוק ⇒ exit 1, הבדיקה פסולה. + מדידת פרופיל חלופי (קצה 2000, q .5/.4) על F1/F2b — **דיווח בלבד**.

## §4 — workflow `eye-playbook.yml`
- טריגרים: `workflow_dispatch` · push ל-main עם paths (`imageResize.js` · `playbookStore.js` · `ToastProvider.jsx` · `tests-eye/**` · ה-workflow) · שבועי.
- container `mcr.microsoft.com/playwright:v1.61.1-noble` (WebKit דורש תלויות מערכת; `--with-deps` הוסר מ-smoke כלא-חסום). WebKit לא עולה ⇒ דיווח עם לוג, ⛔ ויתור שקט.
- job `probe` (הרמטי) ⇒ job `prod` (`needs: probe`) · צעד המתנה-ל-deploy מועתק מ-`smoke.yml` · secrets קיימים בלבד (`SENTINEL_QA_*` · `SUPABASE_URL/ANON_KEY`) · concurrency `eye-playbook`, ⛔ cancel · ⛔ שיתוף קבוצת `sentinel` (pending חדש מבטל pending).
- ראיות לכל מכשיר (תמיד, 14 יום): screenshot לכל צעד (mask לאזור החשבון) · התמונה השמורה מ-d · `ocr.json` · `cleanup.json` ⇒ סריקת דליפות (email/JWT/token/סיסמה) ⇒ exit 1 בהתאמה.
- פער רשום: **אמולציה** (UA/viewport/touch), ⛔ iOS פיזי; קריאות = OCR כפרוקסי לעין.

## §4.1 — תיקוני ניב (04.10, באישור)
1. **RMW על `user_settings` רק אחרי סגירת ה-page/context** (הבלוב last-writer-wins, K6). אחריו GET נוסף ⇒ 0 שאריות **+** hash של כל שאר המפתחות בבלוב זהה byte-for-byte לפני/אחרי. שוני ⇒ אדום.
2. **cron שבועי ⛔ בדקות :20/:50** (סלוטי Sentinel על אותו חשבון QA) — דקה אחרת, מתועדת ב-workflow.
3. **WebKit לא עולה ב-CI ⇒ C-064 נסגר על Pixel 7 בלבד**, הפער ב-DECISIONS + `B-` חדש ל-WebKit. ⛔ חסימת הגל · ⛔ הסתרה.
4. **מיזוג עצמי:** PR ירוק (probe + prod בשני המכשירים, או לפי 3) ⇒ merge commit (⛔ squash/force) ⇒ רישום §5 בקומיט המשך ל-main. ⛔ המתנה לניב. דיווח אחד בסוף.

## §5 — רישום בסגירת הגל
C-064 ⇒ נסגר ב-run id ירוק ⇒ `B-015`+`B-038` ⇒ `D-` + מצבות · DECISIONS (נוסח ניב 04.10) · METRICS: M-002 / M-009 / M-014 / M-018 לפי הפרומפט · `B-400` הורדת עדיפות (⛔ סגירה) · INBOX הסרת M-002/M-009 · חדש: שורות METRICS קריאות (13px · F2b) · `B-` 13px · `B-` גבוה אם F2b<7/8 · `CHECKS`/`STATE`/`NEXT` · `DONE` בקומיט הבא.

## Verification
1. מקומי: `npm run probe:eye:playbook` (Chromium) ⇒ HEAD ירוק · LEGACY/MUT-D/MUT-E אדומים — פלט מלא בדיווח.
2. `npm run verify` + `npm run test:registry` — פלט מלא.
3. push ⇒ dispatch ⇒ run ירוק בשני המכשירים · ארטיפקטים · 0 שאריות (cleanup.json) · 0 דליפות.

## סדר עבודה (§9)
1. קובץ זה — קומיט נפרד `docs(plan)`, push ל-`claude/amazing-johnson-r8cj3o` + draft PR.
2. אישור ניב התקבל עם ארבעת התיקונים (§4.1) **לפני** הכתיבה ⇒ הביצוע ממשיך באותו סשן, דיווח אחד בסוף.
3. PR ירוק ⇒ merge commit עצמי ⇒ רישום §5 בקומיט המשך ל-main.
