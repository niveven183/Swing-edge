# תוכנית: תמונות Playbook ועסקה — K15 · B-015 + B-038 (+ B-388)

**תאריך:** 2026-10-01 · **סיווג:** `T3` (הפיכות · אמון · רוחב · ודאות = כן; אבטחה = לא) · **מקור:** דוח הסריקה §K15 · אבחון read-only 01.10
**סטטוס:** ✅ **מאושר ע"י ניב (01.10) — אופציה A**, עם D1–D3 למטה. ⛔ DB · ⛔ סודות · ⛔ K6.

---

## 0 · מה נמדד (red-before, Chromium אמיתי, מכסה אמיתית `5,200,000` תווים)

קלט סינתטי: קובץ `3,882,887` בתים ⇒ data-URL של `5,177,207` תווים, + `swingEdgeTrades` של `1.5M` תווים.
הבייטים של `savePlaybook` / `had` / אתחול `playbookSetups` חולצו מ-`SwingEdge_App.jsx` (עוגן, התאמה אחת).

| מקרה | זריקה | בזיכרון | אחרי רענון |
|---|---|---|---|
| A — יש סטאפ, `hadPlaybook=true` | לא | 2 | **1 (החדש נעלם)** |
| B — אין סטאפים | לא | 1 | **0** (ה-DB אולי מציל — לא נמדד) |
| C (ביקורת) — אחרי `fileToResizedDataURL` | לא | 1 | 1 |

⚠️ המדידה **בלי** מירור `swingEdgeSettings` (`userSettings.js:224`) שמכפיל את התמונות ⇒ הכשל האמיתי מוקדם יותר.
`fileToResizedDataURL` הקיים נותן `1,004,834` בתים על אותו קלט ⇒ ⛔ לא מספיק לתקרת 200KB.

## 1 · הכרעות ניב

- **D1 — ⛔ לא כותבים `tradeImage` לעסקה.** אף קורא (`0` קריאות ב-`src/`·`SwingEdge_App.jsx`·`scripts/`·`api/`) · `LOCAL_ONLY` מסיר אותו
  (`supabaseClient.js:87`) · טעינה = REPLACE מה-DB ⇒ אצל משתמש מחובר הוא אובד ממילא, ובדרך מסכן את `swingEdgeTrades`.
  העלאת התמונה ל-OCR ותצוגה מקדימה בטופס **נשארות**. ⛔ **לא מוחקים** `tradeImage` מעסקאות קיימות ב-localStorage.
  `B-` חדש: שמירת גרף לעסקה כפיצ'ר אמיתי (Storage) — החלטת מוצר, לא קיים היום.
- **D2 — `ToastProvider`: `role="status"` + `aria-live="polite"` על המכל, `role="alert"` ל-`error`.** זה `B-388` ⇒ נסגר בגל הזה עם `D-`.
- **D3 — פרמטרים:** `1400px` · `q.7` · תקרה `200KB` · סולם נסיגה `1000px/.55` · **מעבר לתקרה = דחייה** (⛔ לא נפילה לגולמי).

## 2 · שינויים

1. `src/lib/imageResize.js` — קבועים `STORED_*` + `fileToStoredDataURL(file)` (Playbook). חתימות ה-OCR ⛔ לא משתנות.
2. `src/lib/playbookStore.js` (חדש, טהור, ללא React) — `persistPlaybookSafely(storage, updated, targetId)`:
   כשל מלא ⇒ ניסוי שני **רק לסטאפ היעד, בלי תמונתו**; כשל גם שם ⇒ מדווח. ⛔ לא נוגע בתמונות של סטאפים אחרים.
3. `SwingEdge_App.jsx` — `handlePlaybookImageUpload` מקטין לפני ה-state · `savePlaybook` קורא ל-`persistPlaybookSafely` ומציג toast ·
   `:3059` ⇒ `tradeImage: null` (D1) · כשל `:1993` (persist trades) ⇒ toast פעם אחת לסשן.
4. `src/i18n.js` — מפתחות חדשים × 5 שפות (he/en/es/pt/ar).
5. `src/components/ToastProvider.jsx` — ARIA (D2).
6. `scripts/capability-guard-test.mjs` — בלוק חדש (12+) ⇒ **אירוח** ⛔ חוליה חדשה: השרשרת נשארת `33`; מניית `test:capability` זזה ביד ⇒ `B-257`.
7. `scripts/image-store-probe.mjs` + `probe:image` ב-`package.json` — Chromium, ⛔ מחוץ ל-`verify`.

## 3 · mutants (כולם חייבים למות) וזרוע ביקורת

| # | mutant | נהרג על ידי |
|---|---|---|
| M1 | `catch {}` ריק חוזר ב-`persistPlaybookSafely`/`savePlaybook` | אסרציית כשל-מדווח + אסרציית source |
| M2 | דילוג על resize (גולמי) | assert גודל ≤ תקרה |
| M3 | ה-toast לא נקרא בכשל | assert קריאת toast |
| M4 | אין ניסוי שני בלי תמונה | assert סטאפ שורד |
| M5 | הניסוי השני מוחק תמונות של סטאפים אחרים | assert תמונות קיימות שלמות |
| M6 | מפתח i18n חסר ב-`es` | assert 5/5 שפות |
| M7 | ARIA נעלם מ-`ToastProvider` | assert מבני |
| M8 | תקרה מורחבת | assert קבועים |
| M9 | **`tradeImage` נכתב שוב ל-`swingEdgeTrades`** | assert `:3059`-צורה |

**זרוע ביקורת (ירוקה על שני העצים):** תמונה קטנה ומכסה פנויה — נשמרת byte-identical, בלי toast.

## 4 · eye-check — `C-064` (ניב מריץ)

1. Playbook → סטאפ חדש → צילום מסך 3MB+ מהטלפון → שמור → F5.
2. מצופה: הסטאפ קיים **והתמונה חדה**, או הודעה ברורה שהתמונה לא נשמרה.
3. 5 סטאפים עם תמונות → רענון אחרי כל אחד → אף סטאפ לא נעלם.
4. **צעד 5:** צילום גרף עם טקסט קטן (מחירים על הציר) — **קריא** אחרי הרענון.

## 5 · bundle

נמדד לפני/אחרי: `dist/assets/index-*.js` raw + gzip. בסיס (HEAD `3d24c23`): `1,652,652` / `495,277`. צפי `+1.5–2.5KB` raw.

## 6 · ממצאים שנרשמים כ-`B-` בסגירת הגל (§10.1)

⓵ שער `hadPlaybook` מתעלם מ-playbook ב-DB כשיש משהו מקומי (**צמוד ל-K6, ⛔ לפתור**) · ⓶ `writeMirror` `catch {}` + הכפלה ·
⓷ `SwingEdge_App.jsx:1907` `catch {}` · ⓸ תמונה גדולה יכולה להכשיל את כל ה-upsert (לא נמדד) · ⓹ הפניות שורה מיושנות ב-`B-015` · ⓺ D1: גרף לעסקה כפיצ'ר.

## 7 · סדר ביצוע

תוכנית (קומיט זה) ⇒ קוד + מבחנים (red-before מתועד) ⇒ mutants ⇒ `verify` + bundle ⇒ push ⇒ רישום (`D-` ל-`B-388`, `C-064`, `B-` חדשים).
