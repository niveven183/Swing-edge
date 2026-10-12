# PLAN — B-415 · שומר ב-`useModalA11y`: ה-rAF ⛔ חוטף פוקוס משדה שכבר נבחר

**רמה: T3** (תשובות §15: לא · כן · לא · כן · לא — שאלה 5 ירדה ל«לא»: השורש נמדד ב-WebKit אמיתי 10.10–12.10).
אבחון: `docs/audits/B415-WEBKIT-DIAGNOSIS-2026-10-10.md` (נדחף, `cb9872e`). הכרעת ניב 10.10: **אופציה B** (שומר ב-hook).
Main ירוק מ-`0342346` (`INCIDENTS#31`, `D-119`).

## Context

`src/hooks/useModalA11y.js:50-51` מריץ `focusFirst()` סינכרונית **ושוב** ב-`requestAnimationFrame` בלי תנאי.
ה-rAF (5–85ms אחרי פתיחה) מעביר את הפוקוס לכפתור ה-X **גם כשהוא כבר על שדה בתוך הדיאלוג** ⇒ קלט שהגיע
לפניו נוחת על הכפתור. נמדד: `fill` `2/90` · עומס מדומה `8/60` · הקלדה אמיתית `19/60` + טיקר `17/60` —
מול `0/60` בכל אחד כשה-rAF הוסר; קצב אנושי `0/120`. זה ה-`B-415` של CI (`#close-exit` ריק, iphone14).
ה-rAF קיים בשביל **late layout** (כשה-pass הסינכרוני לא מצא focusable ונפל ל-container) — ⛔ בשביל לדרוס בחירה.

**מדידה מקדימה לתוכנית (12.10, mac WebKit, iPhone 14, 30/תא) — בדיקה דטרמיניסטית:** פתיחה + פוקוס בשדה
**באותו task** (React מבצע את ה-commit של קליק דיסקרטי ב-microtask ⇒ ה-rAF של ה-hook כבר בתור), ואז שני פריימים:

| | `head` (rAF ⛔ מותנה) | `guard` (התיקון, בסקראץ') |
|--|--|--|
| close · פוקוס ב-`#close-exit` | נחטף ל-X **`30/30`** | נשאר **`30/30`** · `0/30` אבד בהקלדה |
| טופס פתיחה · פוקוס ב-`#log-ticker` | נחטף **`30/30`** | נשאר **`30/30`** · `0/30` |
| idle (⛔ פעולה) — a11y | X `30/30` | X `30/30` ⇒ ⛔ שינוי למקלדת/קורא מסך |

## השינוי

### 1. מוצר — `src/hooks/useModalA11y.js` (שורה אחת ⇒ בלוק)
```js
// The rAF is a follow-up for LATE LAYOUT only: the sync pass found nothing focusable and fell back
// to the container. ⛔ Re-focus when focus already sits on a control inside the dialog — that steals
// it from a field the user (or a test) already chose (B-415: input typed before the rAF landed on X).
const raf = requestAnimationFrame(() => {
  const a = document.activeElement;
  if (a === container || !container.contains(a)) focusFirst();
});
```
`a === container` שומר את מסלול ה-late-layout; `!contains` שומר את מקרה «הפוקוס ברח החוצה». חל על 12 המודאלים.

### 2. Red-before — spec + probe חדשים (hermetic, ⛔ prod)
- **`tests-eye/modal-focus.spec.js`** — `test.skip(!HERMETIC)` (ה-job של prod מריץ את כל `tests-eye/` ב-push).
  לכל מודאל (close · log-trade): פתיחה + `focus()` באותו task (קוד ה-harness הנמדד: המתנה ב-microtasks
  בלבד עד שהשדה קיים) → 2 rAF → אסרציה `activeElement === השדה` → `keyboard.type` → `toHaveValue`.
  + ⚪ idle: ⛔ פעולה ⇒ `activeElement` = הכפתור הראשון (a11y; ירוק בשני העצים ⇒ ⛔ ראיה, רק גדר).
  ⛔ retry · ⛔ המתנת זמן — ההמתנה היא לתנאי (קיום השדה) ולשני פריימים בדיוק.
- **`scripts/eye-focus-probe.mjs`** (`probe:eye:focus`), על `scripts/lib/eyeBuild.mjs` (`makeOnce` · `buildTree` · `serve` · `runSpec` · `readResults`):
  `HEAD` ⇒ ירוק · `MUT-RAF` (מחזיר `const raf = requestAnimationFrame(focusFirst);`) ⇒ **אדום** בשני המודאלים, בשני המכשירים (pixel7 · iphone14). מוטנט שורד ⇒ exit 1.
- **`scripts/eye-cents-probe.mjs`** — שתי זרועות חדשות (בקשת הפרומפט: «mutant שמנקה את השדה ⇒ אדום»):
  `MUT-EXIT-DROP` (`exit:e.target.value` ⇒ `exit:""`) ⇒ a+b אדום על `#close-exit did not take` ·
  `MUT-ENTRY-DROP` (`[key]:e.target.value` ⇒ `[key]:key==="entry"?"":e.target.value`) ⇒ a+b אדום על `#log-entry did not take`.
  שלושת העוגנים נמדדו: התאמה **אחת** בדיוק כל אחד (`B-272`).
- `cents.spec.js` ⛔ משתנה — האסרציות הקיימות (`did not take` / `lost its value before Close Trade`) הן מה שהמוטנטים מודדים.

### 3. CI — `.github/workflows/eye-playbook.yml`
צעד `probe:eye:focus` (`EYE_PROJECTS: pixel7,iphone14`) בתוך ג׳וב `probe-cents` (⛔ ג׳וב חדש — אותה קונטיינר) + העלאת ראיה;
`src/hooks/useModalA11y.js` + `scripts/eye-focus-probe.mjs` לשתי רשימות ה-`paths` (push + pull_request). `package.json`: `"probe:eye:focus"` (⛔ ב-`verify`).

### 4. רישום (באותו PR)
`B-415` ⇒ `DONE` (`D-120`) **בקומיט שאחרי** המיזוג · `INCIDENTS#30` המשך (שורש + תיקון) · `DECISIONS` 10.10 (B נבחר; A נפסל: כל spec עתידי חייב לזכור helper — `B-304`) ·
`CHECKS` `C-068` (פוקוס ראשון במודאל + שדה שנבחר נשאר; באוטומציה `probe:eye:focus`; תנאי-גלישה: נגיעה ב-`useModalA11y.js`) ·
`TRUTH.md` ⛔ (אין שינוי יכולת) · `NEXT` (B-415 יוצא ⇒ ⏸️ הכרעת ניב על השלישי) · `STATE`.

## §8 רמה 2 (הפילטר תפס: «רץ אוטומטית בפרודקשן» — קוד UI)
| ציר | |
|--|--|
| משתמשים | כל מודאל (12). התנהגות idle זהה (נמדד `30/30`); שינוי רק כשהפוקוס כבר על פקד בתוך הדיאלוג |
| נתונים · עלות · סודות | ⛔ · ⛔ · ⛔ (CI: צעד probe ~10 דק׳ בג׳וב קיים) |
| הפיכות | revert של שורה אחת, deploy דקות |
| כשל שקט | late layout שה-pass הסינכרוני פספס ⇒ שמור ע״י `a === container`; ⚪ idle ב-spec מודד שהפוקוס הראשון ⛔ זז |

## Verification (T3 — ⛔ סגירה בלי עין)
1. **מקומי, לפני push:** `npm run verify` (33 + build, `EXIT=0`, פלט מלא) · `EYE_PROJECTS=pixel7,iphone14 npm run probe:eye:focus` (HEAD ירוק · MUT-RAF אדום) · `npm run probe:eye:cents` עם שתי הזרועות החדשות אדומות.
2. **harness האבחון על התיקון** (`docs/audits/B415-…/diag.mjs`, build מהעץ המתוקן): close·`type` · ticker·`type` · close·`fillLoaded` ⇒ `0/30` כל אחד, mac + קונטיינר `v1.61.1-noble` (היו `7/30`·`12/30` · `17/30` · `1/30`·`7/30`).
3. **PR → CI:** `probe-cents` (כולל focus) ירוק על HEAD עם כל המוטנטים אדומים, iphone14 + pixel7 → אני ממזג (⛔ auto-merge).
4. **Production אחרי deploy:** ריצת `eye-playbook` על ה-push ⇒ `cents.spec` `4/4` (he+en × pixel7+iphone14) — **מדד הסגירה של `B-415`**. אדום ב-iphone14 על שדה ⇒ ⛔ סגירה, חוזרים לאבחון.
5. רישום `D-120` + דוח אחד.

⛔ retry אוטומטי · ⛔ להוריד WebKit · ⛔ מחרוזות load-bearing (`B-419` נשאר נפרד) · ⛔ DB · ⛔ קומפוננטות בתוך render.
