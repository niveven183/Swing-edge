# גל 3 · שלב 2 — מקור אחד, מחולל, שער (הגירה שומרת-תוכן)

> 13.11 · ענף `wave3-glossary` · בסיס `c31b227` · **רמה: T3** (מהתוכנית). ⛔ שינוי טקסט · ⛔ שינוי UI · ⛔ מחיקת מונח — אלה שלבים 4/3.

## מה זז

| לפני | אחרי |
|---|---|
| `src/data/tooltips.js` (`TRADING_TOOLTIPS` · `TERM_LABELS` · `SETUP_KEY_ALIASES` · `resolveSetupKey`) | **נמחק.** מקור: `src/glossary/terms/<קטגוריה>.js` × 8 (72 מונחים; `aliases` על 22 הסטאפים) |
| `scripts/extract-tooltips.mjs` + `build-glossary.mjs` (דרך קובצי tmp) | **`scripts/build-glossary.mjs` אחד** — טוען · מאמת (מסרב לכתוב על סכימה שבורה) · מחולל 13 קבצים עם `sourceHash` |
| 5 צרכנים ייבאו את `tooltips.js` | `src/glossary/index.js` — `termText` · `termLabel` · `hasTerm` · `resolveSetupKey`. מייבא רק `generated/inline.json` + `short.<lang>.json` ×5, **סטטית** (`B-474` = גל 7) |
| `docs/SwingEdge-Terms-Glossary.md` «70 מונחים · fcd6260» (נסחף ב-2) | מחולל: 72, `sourceHash` בכותרת. `dayOfWeek`/`performanceBySetup` שוייכו ל-`performance` |
| `src/data/glossary.json` | מחולל, אותו מבנה `{label, description}` + `_meta` (הסדר השתנה ⇒ דיף גדול, תוכן זהה) |

⚠️ **סטייה מהתוכנית:** `longForm` ריק בשלב 2 (`long.<lang>.json` = `{}`). התוכנית אמרה «`longForm` = הטקסט הקיים»; כתיבתו עכשיו הייתה יוצרת שני עותקים זהים של 360 מחרוזות באותו מקור, ששער לא יכול להבדיל ביניהם. הטקסט הקיים עובר ל-`longForm` **בשלב 4**, באותו קומיט שבו `short` נכתב מחדש.

## הוכחת זהות — מול `main:src/data/tooltips.js`

```
terms: 72 legacy · hasTerm 72/72
displayed text: 432/432 identical (72 × 5 langs + unknown-lang fallback)
labels: 432/432 identical
resolveSetupKey: 54/54 inputs identical (23 alias names · 23 display forms · Crypto/Other/Retest/Breakdown · empty/null/undefined/nope)
unknown ids answered as terms: 0 
✅ 0 diffs
```
(`fr` = שפה לא מוכרת ⇒ הישן נפל לאנגלית, החדש זהה.) הסקריפט: `git show main:src/data/tooltips.js` מיובא לצד `src/glossary/index.js`, השוואת `entry[lang] || entry.en` מול `termText`, `TERM_LABELS[..]` מול `termLabel`, ו-`resolveSetupKey` על 23 שמות · 23 צורות תצוגה (אות גדולה, `&`) · Crypto/Other/Retest/Breakdown · ריק/null/undefined.

בבאנדל: 360/360 מקטעי שורה ראשונה (חותכים לפני `\n`/מירכאות, שמוסלמים אחרת ב-`JSON.parse`) נמצאו ב-`index-*.js`.

## `test:glossary` — חוליה 35, 32 assertions

M (טעינה, אדום קשה `B-272`) · S (סכימה + ספירה 72) · G (13 קבצים בייט-לבייט + אין קובץ זר) · R (אין `tooltips.js` · נקודת כניסה אחת · `long` ⛔ ב-`index.js` · 31 `term="…"` קיימים · 6 אתרים דינמיים בלדג׳ר · ליטרלים מוזנים · שומרי `hasTerm`/`resolveSetupKey`) · **L — לדג׳רים דו-כיווניים של מה שטרם תוקן**: 18 מותנים · 18 יתומים (משחזר את האבחון) · `<InfoTooltip>` inline ‏18/1/2 · `StatCard info=` 1 · מכסות he>35 ‏18/72 · en>40 ‏16/72 · תבליטים 19/72.

⚠️ גבול: `R6` רואה הזנות `term={term}` רק בתבניות `[label, key, cls, term]` ו-`sCard(…, term)`.

### red-before — 16 מוטנטים על עותק (`node scripts/glossary-test.mjs <root>`)

```
🟢 SURVIVED M0 control (unmutated copy)
🔴 killed  M-a term edited, not regenerated  ⇒ ✗ G·inline.json ✗ G·short.he.json ✗ G·long.he.json ✗ G·short.en.json ✗ G·long.en.json ✗ G·s
🔴 killed  M-b one byte flipped in short.he.json  ⇒ ✗ G·short.he.json 
🔴 killed  M-c term="maxDDx" (broken ?)  ⇒ ✗ R4 ✗ L2 
🔴 killed  M-d ORBBreakout loses ar  ⇒ ✗ S1 
🔴 killed  M-e orphan tilt connected, ledger not moved  ⇒ ✗ L2 
🔴 killed  M-f new inline <InfoTooltip>  ⇒ ✗ L3 
🔴 killed  M-g hasTerm guard removed  ⇒ ✗ R7 
🔴 killed  M-h legacy tooltips.js back + imported  ⇒ ✗ R1 
🔴 killed  M-i index.js imports long.he.json  ⇒ ✗ R3 
🔴 killed  M-j new dynamic term={k}  ⇒ ✗ R5 ✗ L2 
🔴 killed  M-k syntax error in chart.js (hard red)  ⇒ ✗ M2 
🔴 killed  M-l unknown key shwnAt  ⇒ ✗ S1 ✗ G·inline.json ✗ G·short.he.json ✗ G·long.he.json ✗ G·short.en.json ✗ G·long.en.json ✗ G·shor
🔴 killed  M-m alias claimed twice  ⇒ ✗ S1 ✗ G·inline.json ✗ G·short.he.json ✗ G·long.he.json ✗ G·short.en.json ✗ G·long.en.json ✗ G·sho
🔴 killed  M-n fed literal typo stopLos  ⇒ ✗ R6 
🔴 killed  M-o stray generated file  ⇒ ✗ G·stray 
🔴 killed  M-p category written inside a term  ⇒ ✗ M2 
```

## bundle — אותה פקודה כמו בבסיס (אבחון §6)

| chunk | לפני (`c31b227`) raw / gzip | אחרי raw / gzip | Δ gzip |
|---|---|---|---|
| `index-*.js` | 1,691,055 / 506,627 | 1,702,596 / 505,373 | **−1,254 (−0.25%)** |
| `recharts` · `sentry` · `css` | 553,418/155,744 · 197,600/66,063 · 113,701/19,903 | 553,418/155,744 · 197,600/66,065 · 113,701/19,903 | 0 · +2 · 0 |
| טקסט המונחים לבדו | `tooltips.js` 104,893 / 36,626 | `inline.json`+`short.*.json` 118,276 / 35,009 | −1,617 |

צפי התוכנית «~ללא שינוי» — מאושש. raw עלה ב-11,541 (מבנה JSON + `JSON.parse` של Vite), gzip ירד.

## verify

`npm run verify` ⇒ `EXIT=0` · 35/35 חוליות `test:*` + `build`. `test:copy` 16/16 · `test:format` ירוק (אותן אסרציות, מופנות ל-`termText`) · `test:registry` 41/41 (§14.3: 35) · `test:arch` 11/11 (קורפוס 158→168).

## נשאר פתוח (שייך לגל הזה, ⛔ פריט חדש)

- `docs/STATE.md` = 15,957/16,000 בתים. קומיט הסגירה של הגל צריך גיזום ל-`BACKLOG`/`DONE` לפני שהוא כותב.
- שלב 4 (טקסטים he+en ⇒ STOP 2) · שלב 3 (U5 red-before · רכיב · `GlossaryModal` ב-`lazyWithRetry` עטוף `PanelBoundary`, כשל ⇒ הודעה + «נסה שוב» — הכרעת ניב 13.11) · שלב 5.
