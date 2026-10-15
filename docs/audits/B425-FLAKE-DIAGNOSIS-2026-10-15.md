# B-425 · אבחון — עריכה שלא מגיעה לשורה ב-WebKit/iphone14 (H2 · C4) · 2026-10-15

> §8.1 שלב 1 — **read-only על המוצר**. ⛔ תיקון. תוכנית: `docs/plans/PLAN-2026-10-15-b425-flake-diagnosis.md`
> (אושרה 15.10 עם 3 תיקונים). תוכנית התיקון (ממתינה): `docs/plans/PLAN-2026-10-15-b425-b432-b434-fix.md`.
> **רמה T3 · 0/0/1/1/1.** הכל הרמטי: Supabase סינתטי, ⛔ סוד · ⛔ DB · ⛔ חשבון QA.
> מכשיר: `scripts/probe-flake.mjs` (PR #77, merge `db0e1e8`). self-test S1–S7 ירוק ב-CI על שני הדפדפנים
> (run `38747904843`, ג׳ובי `self-test`) ⇒ המכשיר **רואה** אדום ו**לוכד** אותו (trace + video + diag).

## TL;DR
1. **חתימת H2 של `B-425` שוחזרה — `1/520` ב-iphone14 — וסווגה (א): המחווה ⛔ השפיעה, ⛔ דריסה** (§3א). ⛔ חזרה של `B-406`.
   חתימת C4 של `#33`: `0/120` — ⛔ שוחזרה. כל האדומים: iphone14 בלבד (`0/640` ב-pixel7).
2. **H2 iphone14 `5/520` · C4 iphone14 `3/120`:** 5× (א) מחווה ללא השפעה (פעמון/OK) · 4× (ג) WebKit/צד-שלישי בטעינה (§3).
3. **ממצא מוצר נפרד — `B-432`, (ב) לפי כלל ניב ①:** עריכה שנטענת-מחדש בתוך חלון ה-debounce יוצאת רק דרך
   ה-flush של הפריקה, **והדף מבטל את הבקשה** (`49/50` iphone14 · `27/50` pixel7) (§4).
4. ממצאי-לוואי: `B-431` (אדום H2 שעבר בשקט ב-`MUT-RESURRECT`) · `B-433` (CI הרמטי מדווח לנכס GA של פרודקשן).

## §0 — הבסיס ההיסטורי (נמדד לפני המכשיר)
לוגי `probe-sync` מכל ריצות `eye-playbook` מ-05.10: **46 ג׳ובים ייחודיים** (dedupe לפי job id — `attempts/N/jobs`
מדווח שוב ג׳וב שלא הורץ מחדש; הספירה הראשונה בלי dedupe הכפילה הכל ונזרקה).

| סצנה · מכשיר | אוכלוסייה = זרועות שבהן הסצנה אמורה להיות ירוקה | אדום | Wilson 95% |
|---|---|---|---|
| H2 · iphone14 | HEAD + MUT-RESURRECT | **2/92** — `38424337157` (HEAD, PR #72) · `38434987667` (MUT-RESURRECT, push `22d2e98`) | 0.6%–7.6% |
| H2 · pixel7 | אותן | 0/92 | 0.0%–4.0% |
| C4 · iphone14 | HEAD · BEFORE-408 · M3×7 · M5 | **1/30** — `38639082447`/1 (BEFORE-408, `INCIDENTS#33`) | 0.6%–16.7% |
| C4 · pixel7 | אותן | 0/30 | 0.0%–11.4% |

⚠️ האדום ב-`MUT-RESURRECT` **⛔ נראה עד היום**: הזרוע בודקת רק את H4 (המצופה-אדום) ואת C1/C2 ⇒ `B-431`.

## §1 — המכשיר, ומה שנמדד בבנייתו (ערוצי כשל שתוקנו ⛔ שהונחו)
- **JSON reporter ⛔ נושא `repeatEachIndex`** (Playwright 1.61.1) — החזרות הן רשומות `tests[]` רצופות; האינדקס נגזר
  מהסדר ומוצלב מול סיומת `-repeatN` של תיקיית הפלט. נתפס בשער של המכשיר (exit 1), ⛔ בדיעבד.
- **`video` של ה-config ⛔ מגיע ל-`browser.newContext()`** (trace כן) ⇒ `open()` מקליט וידאו בעצמו תחת DIAG.
- **C4 כתב ראיה רק אחרי ה-poll** ⇒ C4 אדום ⛔ השאיר ראיה (`INCIDENTS#33`). הועבר ל-`finally` (S5 מוכיח).
- **insitu**: שער-סדר — כל חזרה רצה את הסט בסדר הקובץ (שורת ה-spec) וחזרות ⛔ משתלבות; אחרת התא בטל.
- ⚠️ **ההקלטה עצמה מוסיפה עומס** (video + trace לכל ריצה) — אם משהו, היא **מגדילה** את הסיכוי לכשל תזמוני.

## §2 — שיעורי כשל (CI, `ubuntu-latest` + `mcr.microsoft.com/playwright:v1.61.1-noble`)
**שלב 1** — run `38747904843`, 30 לכל תא (insitu: 3 shards × 10):

| עץ · סצנה · דפדפן · mode | אדום | Wilson 95% | C-P 95% |
|---|---|---|---|
| HEAD · H2 · iphone14 · isolated | 0/30 | 0.0–11.4% | 0.0–11.6% |
| HEAD · H2 · iphone14 · insitu | 0/30 | 0.0–11.4% | 0.0–11.6% |
| BEFORE-408 · H2 · iphone14 · isolated | 0/30 | 0.0–11.4% | 0.0–11.6% |
| BEFORE-408 · H2 · iphone14 · insitu | 0/30 | 0.0–11.4% | 0.0–11.6% |
| HEAD · C4 · iphone14 · isolated | 0/30 | 0.0–11.4% | 0.0–11.6% |
| HEAD · C4 · iphone14 · insitu | **1/30** (ג) | 0.6–16.7% | 0.1–17.2% |
| BEFORE-408 · C4 · iphone14 · isolated | **1/30** (ג) | 0.6–16.7% | 0.1–17.2% |
| BEFORE-408 · C4 · iphone14 · insitu | **1/30** (ג) | 0.6–16.7% | 0.1–17.2% |
| pixel7 — 8 התאים המקבילים | 0/30 בכל אחד (`0/240`) | 0.0–11.4% (לתא) | 0.0–11.6% (לתא) |

**שלב 2** — run `38754926645`: הסלמה ל-100 **רק** על מצב שעדיין `0/N` (כלל ניב ②) ⇒ H2 בשני המצבים
(C4 ⛔ הוסלם — אדום בשניהם). insitu: 10 shards × 10.

| עץ · סצנה · דפדפן · mode | אדום | Wilson 95% | C-P 95% |
|---|---|---|---|
| HEAD · H2 · iphone14 · isolated | 0/100 | 0.0–3.7% | 0.0–3.6% |
| HEAD · H2 · iphone14 · insitu | **2/100** | 0.6–7.0% | 0.2–7.0% |
| BEFORE-408 · H2 · iphone14 · isolated | **3/100** | 1.0–8.5% | 0.6–8.5% |
| BEFORE-408 · H2 · iphone14 · insitu | 0/100 | 0.0–3.7% | 0.0–3.6% |
| pixel7 — 4 התאים המקבילים | 0/100 בכל אחד (`0/400`) | 0.0–3.7% (לתא) | 0.0–3.6% (לתא) |

**מצרף H2 · iphone14, שני השלבים:** `5/520` (Wilson 0.4–2.2%) · **pixel7:** `0/520` (Wilson 0.0–0.7%).
**מצרף C4 · iphone14 (שלב 1 בלבד):** `3/120` (Wilson 0.9–7.1%) · **pixel7:** `0/120` (Wilson 0.0–3.1%).
⚠️ «עץ» ⛔ מסביר את האדום: H2 אדום גם ב-HEAD וגם ב-BEFORE-408; **הדפדפן** כן — `0` ב-pixel7 בכל `640`
ריצות הדפדפן הזה בשני השלבים.

**החתימות המקוריות** — מנייה על **כל** ריצות H2/C4 ב-iphone14 בשני השלבים:
- H2 «the alert is gone from this device after the read landed» (`B-425`): **`1/520`** — שוחזרה ב-BEFORE-408 ·
  isolated · repeat 10 ⇒ סווגה ב-§3א.
- C4 «the capital edit never reached the row» (`INCIDENTS#33`): **`0/120`** — ⛔ שוחזרה; ⛔ מסווגת.

## §3 — סיווג כל אדום שנלכד (ציטוטים מה-trace / ציר-הזמן, `t` = ms מפתיחת ה-context)

### §3א — החתימה של `B-425` שוחזרה ⇒ **(א): המחווה ⛔ השפיעה באפליקציה** · ⛔ (ב)
BEFORE-408 · H2 · iphone14 · isolated · repeat 10 (run `38754926645`):
- `t=9732 snap before-ok` — `inputValue: "105"` (ה-`fill` נחת).
- trace `input@call@94` (רגע השיגור): `__playwright_target__` **על כפתור OK** (`BUTTON class="text-[9px] … bg-amber-500/20"`),
  נקודה `(322, 417.25)`; Playwright: «click action done».
- `t=10330 snap after-ok` — `swingEdgePriceAlerts: "{}"` · `swingEdgeSettingsDelta: null` · **`alertInputOpen: 1`**.
  ה-handler של OK (`SwingEdge_App.jsx:4884`) כותב את ההתראה + op ליומן **וסוגר** את השדה — ⛔ אף אחד מהשלושה.
- **⛔ אף כתיבת `EYEPB:105` ל-LS בכל ציר-הזמן.** ביקורת: ב-`MUT-OVERWRITE` (דריסה מכוונת) רואים `set {"EYEPB":105}`
  ואז `set {}` — כאן ⛔ ה-set הראשון. ⇒ **«נקבע ונדרס» (חזרה של `B-406`) מופרך.**
- ⚠️ **⛔ מוכרע** בין «ה-`click` ⛔ נורה» (down/up על מטרה שזזה) ל«נורה על state ריק» (`parseFloat("")` ⇒ ⛔ `v > 0`) —
  שתיהן משאירות ראיה זהה. ⇒ נוסף צופה אירועים (`[evdiag]`: pointerdown/mousedown/mouseup/click/input + `scrollY`).

**אותה צורה עוד שלוש פעמים** (בפעמון «Price Alert»): BEFORE-408 iso r56 · r74 · HEAD insitu s3 r0 — `locator.fill` 20s על
`Set target price`: ב-`input@` של הלחיצה `__playwright_target__` **על כפתור הפעמון**, «click action done», השדה ⛔ נפתח.
ב-3/4 Playwright רשם `element is outside of the viewport` **אחרי** `done scrolling` ⇒ הדף עוד גלל.
+ K1-0 בסצנת ה-debounce (iphone14, שלב 1): אותו `fill` על אותו שדה.
**מנגנון (השערה, ⛔ הוכחה):** `html { scroll-behavior: smooth }` (`src/index.css:576`) מנפיש את ה-scroll-into-view של
Playwright, שבדיקת היציבות שלו רצה **לפניו**. ⇒ תיקון harness ב-PR-2: `tapWhenStable` (§6).
⚠️ **תיקון עצמי:** בטיוטה ראשונה כתבתי «החטאה של 7px» ל-HEAD s3 r0 — המדידה נעשתה על פריים **1.2 שניות אחרי** הלחיצה,
אחרי שהכרטיס זז ~14px אופקית. ברגע השיגור המטרה **הייתה** הפעמון. ה-7px מודדים **תזוזת layout**, ⛔ החטאה.

**HEAD insitu s3 r0 — נזק משני:** הקריאה הוחזקה בשער ⇒ `t=7785 held` · `t=15672 reqfailed "Load request cancelled"` +
`"[hydrate] settings check failed — writes stay blocked"` — **הדדליין של `B-408` (8000ms) ירה בזמן שהשער החזיק.**
השער ⛔ היה כפוף לדדליין ⇒ הסצנה ⛔ מדדה את החלון. ⇒ תיקון harness ב-PR-2 (תוספת ניב ①, §6).

**HEAD insitu s3 r3 — (ג):** `page.reload` 45s timeout. המסמך והנכסים `200` תוך 50ms; בקשת
`www.tradingview-widget.com/embed-widget/ticker-tape` ⛔ הסתיימה ⇒ אירוע `load` ⛔ נורה. צד-שלישי חי בריצה הרמטית.

### §3ב — שלושת אדומי C4 (שלב 1) — (ג) תשתית: ה-`reload` הראשון של C4 נכשל בתוך WebKit, לפני העריכה.

| תא | repeat | הודעה | ראיה |
|---|---|---|---|
| BEFORE-408 · C4 · isolated | 26 | `page.reload: WebKit encountered an internal error` | `t=20508 console.error "Failed to load resource: WebKit encountered an internal error"` · `t=20535 snap assert: upsertsSoFar 0, ls כולו null` |
| HEAD · C4 · insitu s2 | 2 | `page.reload: WebKit encountered an internal error` | trace: `call@1043 reload` ⇒ `FrameManager.frameAbortedNavigation`; network: `GET http://127.0.0.1:46749/app → "WebKit encountered an internal error"` **בו-ברגע** עם ביטול `tradingview-widget.com/…` ×10 ו-`google-analytics.com/g/collect` («Load request cancelled») · `t=6445 snap assert: upsertsSoFar 0` |
| BEFORE-408 · C4 · insitu s2 | 3 | `locator.waitFor: Timeout 30000ms` (`dash()` אחרי ה-reload) | network: `GET /app → 200`, ואז `t=11705–11708` ×6 `"WebKit encountered an internal error"` על משאבים; ⛔ קריאת `user_settings` אחרי ה-reload; האפליקציה ⛔ רונדרה; `t=41882 snap assert: upsertsSoFar 0` |

**למה (ג) ⛔ (א)/(ב):** ⛔ snapshot `before-click`/`after-click` קיים — הבדיקה ⛔ הגיעה לעריכה; ה-store ⛔ קיבל
upsert (`upsertsSoFar: 0`); הכשל הוא של מנוע הדפדפן בטעינת המסמך מ-loopback. **⛔ החתימה של `#33`**
(«the capital edit never reached the row» — poll שנכשל **אחרי** לחיצה שהצליחה).
⚠️ **השערה (⛔ הוכחה):** בשני ה-traces שנפתחו, כשל הניווט חופף לביטול המוני של טעינות צד-שלישי **חיות**
שה-harness ההרמטי ⛔ חוסם. ⇒ תוכנית התיקון חלק A.
⚠️ גם בכל ריצה: `pageerror "Fetch API cannot load …/api/quote… due to access control checks"` — ה-build ההרמטי
⛔ מגיש API; ה-fallback של ה-SPA מחזיר HTML.

## §4 — חלון ה-debounce והפריקה (תיקון ניב ①; סצנה ייעודית `tests-flake/debounce-window.spec.js`)
**D1 — אורך החלון** (n=30 לכל דפדפן, מהלחיצה עד ה-upsert שנושא את הערך): iphone14 CI p50 `992` · p95 `1001` ·
max `1002` ms · pixel7 CI p50 `999` · p95 `1002` · max `1004` ms — מול `DEBOUNCE_MS = 1000`.

**D2 — `reload` אחרי δ** (n=10 לכל δ × דפדפן, CI run `38747904843`):

| δ | iphone14: יצא רק דרך flush · **בוטל ע״י הדף** · אבד (mock) | pixel7: flush · **בוטל** · אבד (mock) |
|---|---|---|
| 0 | 9/10 · **9/10** · 1/10 | 10/10 · **5/10** · 0/10 |
| 250 | 10/10 · **10/10** · 0/10 | 10/10 · **7/10** · 0/10 |
| 500 | 10/10 · **10/10** · 0/10 | 10/10 · **3/10** · 0/10 |
| 750 | 10/10 · **10/10** · 0/10 | 10/10 · **7/10** · 0/10 |
| 900 | 10/10 · **10/10** · 0/10 | 10/10 · **5/10** · 0/10 |
| **Σ** | **49/50 בוטלו** (Wilson 89.5–99.6%) | **27/50 בוטלו** (Wilson 40.4–67.0%) |

ראיה (iphone14, δ=0, ניסוי 0): `req@5830 POST capital=30001` ⇒ `failed@5831 "Load request cancelled"` — **1ms**.
פיגור הביטול בכל 49: `0–10ms`. ⚠️ **«אבד (mock)» הוא חסם תחתון לאובדן:** ה-route ההרמטי רושם את הגוף ברגע
היירוט, **לפני** שהדף מבטל — שרת אמיתי ⛔ מובטח שקיבל בקשה שבוטלה אחרי `1ms`.
**סיווג לפי כלל ניב ①: (ב) באג מוצר ⇒ `B-432`** — הכתיבה רוכבת על `flush` של `beforeunload/pagehide`
(`SwingEdge_App.jsx:2011`, `fetch` בלי `keepalive`) ונקטעת ב-reload. משתמש שסוגר/מנווט/מרענן בתוך השנייה
שאחרי עריכה תלוי בבקשה שהדפדפן עצמו מבטל.

**D3 — סגירת טאב** (`page.close({ runBeforeUnload: true })` + טאב חדש): flush `50/50` iphone14, `49/50` pixel7;
`cancelled` ⛔ נצפה — ⚠️ **ה-context ⛔ מדווח `requestfailed` על דף שנסגר** ⇒ העמודה עיוורת שם, ⛔ «0 בוטלו».

**δ≈0 — `2/40` ניסויים שבהם העריכה ⛔ יצאה מהדף כלל** (iphone14 D2-0 #8 ערך `30009`, פריקה `13ms` אחרי
הלחיצה; pixel7 D3-0 #6 ערך `30007`, `9ms`): ⛔ בקשה עם הערך, ואחרי הטעינה המסך וה-LS מציגים את הערך
**הקודם**. ⛔ **מסווג** — הסצנה רושמת רשת בלבד ו-trace נשמר רק בכשל. השערה בתוכנית התיקון §B שלב 2.

**K1 — ביקורת התראת מחיר** (נתמכת-יומן): pixel7 `0/20` אבדו. iphone14 CI: K1-500 `0/10`; **K1-0 נעצר אחרי
ניסוי 1** — `locator.fill: Timeout 20000ms` על `getByPlaceholder('Set target price')`: הקשה על «Price Alert»
⛔ פתחה את השדה. ⇒ כשל **מכשיר**, ⛔ ממצא; ⚠️ אותה פעולה שבה H2 בונה את העריכה.

## §5 — מה ⛔ הוכרע כאן
- **החתימות של `B-425` ⛔ סווגו** — ⛔ נלכדו. הכרעה בלי ראיה הייתה ניחוש (`R-4`).
- **D3 / δ≈0** — עיוורון מוצהר, ⛔ «0».
- **הסיבתיות של (ג)** — השערה; תוכנית A מודדת אותה.
- **«click ⛔ נורה» מול «state ריק»** ב-§3א — הצופה החדש יכריע במדידה הבאה.

## §6 — B-434: הכרטיס זז 70px · ⛔ אזור לחיצה קטן (נמדד, תיקון עצמי)
מדידת `scratch` read-only על HEAD ההרמטי (iPhone 14/WebKit ×3 · Pixel 7/Chromium ×1, אותו login + עסקה פתוחה + reload של H2):
- **פעמון «Price Alert»:** קופסה **`44×44`** · `min-width/min-height: 44px` (`src/index.css:580-584`, כל `button` מתחת ל-768px) ·
  padding `2px` · אייקון `12×12` · **אזור לחיצה `44×44`** (`elementFromPoint` על רשת ±40px: 1,932 נקודות). **OK:** `44×44`. זהה בשני המנועים.
  ⚠️ **«~14px» שמסרתי לניב היה שגוי** — מדדתי אייקון+padding, ⛔ את הקופסה. ⇒ חצי «אזור הלחיצה» של תוספת ② **מופרך**.
- **layout shift — מאושש:** הפעמון קופץ **70px למטה** אחרי שהכרטיס כבר מוצג — WebKit: פריים **אחד**, `751–862ms` אחרי ה-reload;
  Chromium: 26 פריימים עד `1,420ms`. המקור: בלוק **חדש** `50px` מעל הכרטיסים — «⚠️ Account Equity is a partial sum — these trades
  are excluded … no live price for 1 of 1 open trades» — + `20px` של `space-y-5`. נכנס כשבקשת המחירים מסתיימת בלי מחיר חי.
- ⚠️ **סיכון שנשאר בתנאי ה-harness:** קפיצה של **פריים אחד** ⇒ «קופסה זהה ב-2 פריימים» יכולה להתקיים **לפני** הקפיצה, והלחיצה
  עדיין יכולה לחפוף לה. ⏸️ **הכרעת ניב:** להוסיף לתנאי «בקשת המחירים הוכרעה» (מקור הקפיצה), או להסתפק בתיקון המוצר (תוכנית C).

## §7 — מה PR-2 משנה ב-harness (⛔ מוצר)
| שינוי | איפה | הוכחה |
|---|---|---|
| ① שער שמחזיק בקשה כפוף לדדליין: `SETTINGS_READ_TIMEOUT_MS` **מיובא** מ-`src/lib/userSettings.js` (⛔ מספר קשיח; גם `C5`), שחרור עצמי `2000ms` לפניו; חלון שחצה ⇒ `INSTRUMENT:` — ⛔ אדום של סצנה. `C5` לבדו ⛔ כפוף (הוא מודד את הדדליין). | `tests-eye/hydration.spec.js` · `scripts/probe-flake.mjs` · `scripts/eye-sync-probe.mjs` (`INSTRUMENT` ⛔ נספר כאדום מצופה) | self-test **S9**: גבול `200ms` ⇒ `1` instrument · `0` אדום סצנה |
| ② `tapWhenStable` — scroll, ואז קופסת הכרטיס+המטרה זהה ב-2 פריימים רצופים, ואז לחיצה | `tests-eye/stableTap.js` (עותק אחד) · H2 · K1 | S6: H2×HEAD `0/2` · `0` instrument |
| חסימת GA בריצות הרמטיות (`B-433`, חלקי) | `tests-eye/hermetic.js` | **S8** red-before על העץ הקודם: `18` נשלחו · **`12` נענו**; אחרי: ⛔ נענו |
| צופה אירועים `[evdiag]` (pointerdown/mousedown/mouseup/click/input + `scrollY`) | `tests-eye/hydration.spec.js` (תחת `EYE_FLAKE_DIAG`) | יכריע את §3א במדידה הבאה |
