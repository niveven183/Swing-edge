# AUDIT · B-184 — מה בדיוק דולף מ-`inject()` של Vercel Analytics

**תאריך:** 2026-08-27 · **מצב:** אבחון read-only (§8.1 שלב 1) · **⛔ אפס תיקון בקובץ הזה**
**גל:** `W1a` · **סיווג:** `T3` · תשובות §15: `לא / כן / כן / כן / לא` = **3 «כן»**
(שאלה 3 — אבטחה — היא טריגר-יחיד ⇒ `T3` לבד)

**נכתב כי B-184 עצמו ⛔ אינו הוכחה.** ניב דרש «מה בדיוק דולף — **הוכחה**, ⛔ לא ציטוט
B-184». הדוח הזה מודד; התוכנית (`docs/plans/PLAN-2026-08-27-b184-vercel-analytics.md`)
מכריעה. ⛔ אין כאן שכפול של התוכנית ואין שם שכפול של המדידה — עותק שני נסחף (`R-6`).

---

## §0 — הראיה המקורית של B-184 הייתה **פלט קונסולה ב-dev**, ⛔ לא ביקון בפרודקשן

`docs/audits/DEEP-D-browser.md:38` מצטט:

```
[Vercel Web Analytics] [view] http://localhost:5173/app?utm_probe=1#access_token=FAKE_TOKEN_AUDIT_PROBE&refresh_token=FAKE_REFRESH  /_vercel/insights/view
```

`localhost:5173` ⇒ `isDevelopment()` ⇒ `getScriptSrc` מחזיר
`https://va.vercel-scripts.com/v1/script.debug.js` — **סקריפט אחר**, שמדפיס לקונסולה
במקום לשלוח. ⇒ הממצא היה **קריאה של הדפסה**, ⛔ לא מדידה של תעבורה.

זו בדיוק התבנית שניב קיבע אתמול: **«CSS סטטי ⛔ אינו קובע מה מרונדר»** —
כאן: **קריאת סקריפט ⛔ אינה קובעת מה נשלח.** לכן כל §1–§3 מודדים את הבייטים
שפרודקשן **באמת** מגישה, ואת מה שדפדפן **באמת** מרכיב.

⚠️ **המסקנה של B-184 שרדה** — אבל היא שורדת מהמדידה שלמטה, ⛔ לא מהשורה ההיא.

---

## §1 — הצד המקומי (`npm`) ⛔ אינו שולח כלום

`src/main.jsx:13,15` — שתי השורות היחידות בכל הריפו שנוגעות בחבילה:

```js
import { inject } from "@vercel/analytics";   // :13
inject();                                     // :15   ⛔ ללא ארגומנטים
```

```
$ grep -rn "@vercel/analytics" --include='*.jsx' --include='*.js' src/ *.jsx
src/main.jsx:13:import { inject } from "@vercel/analytics";
```
⇒ **1/1 אתרי שימוש.** ⛔ אין `track()`, ⛔ אין `window.va(...)` ידני בשום מקום.

`node_modules/@vercel/analytics/dist/index.mjs` — `inject()` **רק** מזריק `<script>`:

```js
function inject(props = { debug: true }, confString) {
  if (!isBrowser()) return;
  const { beforeSend, src, dataset } = loadProps(props, confString);
  initQueue();
  if (beforeSend) window.va?.call(window, "beforeSend", beforeSend);
  const script = document.createElement("script");
  script.src = src;                      // ← "/_vercel/insights/script.js" בפרודקשן
  for (const [k, v] of Object.entries(dataset)) script.dataset[k] = v;
  script.defer = true;
  document.head.appendChild(script);
}
```

⇒ **הלכידה והשליחה קורות בסקריפט המרוחק.** כל ניתוח שנעצר בחבילה מפספס את הבאג.

---

## §2 — מה פרודקשן **באמת** מגישה, ומה הוא בונה

```
$ curl -s -o /tmp/va-script.js -w "GET script.js -> HTTP %{http_code}  bytes=%{size_download}\n" \
    https://swing-edge.com/_vercel/insights/script.js
GET script.js -> HTTP 200  bytes=2495

$ shasum -a 256 /tmp/va-script.js
79bf638dd4acdeb9b80c5a4009a3e1986968d615e9557dcf23d91b5e8ad158d8

$ curl -s -X POST -H 'content-type: application/json' -d '{}' \
    https://swing-edge.com/_vercel/insights/view
{"statusCode":400,"code":"FST_ERR_VALIDATION","error":"Bad Request",
 "message":"body must have required property 'o'"}
```

⇒ **ה-ingest חי.** `400` ⛔ אינו `404`: הנקודה קיימת, מפרסרת, ו**דורשת** את השדה `o`.

### 2.1 — בונה ה-URL, מתוך הבייטים שהוגשו

```js
function e(e){ let t=location.href;
  if(e){ let n=new URL(t); if(n.pathname!==e) return n.pathname=e, n.search="", n.href }
  return t }
```

שלוש עובדות מהשורה הזאת:
1. ברירת המחדל היא **`location.href` שלם** — כולל `search` **וכולל `hash`**.
2. מסלול העקיפה (`if(e)`) מנקה **`search` בלבד**. ⛔ **`hash` שורד גם שם.**
3. `e` הוא `p`, שנקבע **רק** ע"י `window.va("pageview",{path})` — קריאה ש§1 מוכיח
   ש⛔ **אינה קיימת בריפו** ⇒ בפועל `p === null` ⇒ תמיד ענף `location.href`.

### 2.2 — בונה המטען

```js
let f=e(p), d=r.referrer, v=a({type:t,url:f,payload:n});
if(!1===v||null===v) return;
v&&(f=v.url, n=v.payload??n);
let y={ o:f, sv:"0.1.3", sdkn:o.sdkn, sdkv:o.sdkv, ts:Date.now(), ...c&&{dp:c},
        ...(i?.withReferrer&&!w?{r:d}:{}), ... };
await fetch("pageview"===t?l:s, {method:"POST", keepalive:!0, ...body:JSON.stringify(y)});
```

⇒ **`o` הוא ה-URL השלם.** ומכאן גם שתי עובדות שהתיקון נשען עליהן:
- `a` הוא ה-`beforeSend` שנרשם דרך `window.vaq` — הוא **מורץ בפועל**, יכול לבטל
  (`false`/`null`) **ויכול לשכתב את `url`**. ⛔ זו ⛔ אינה הבטחה מהתיעוד; זה הקוד שהוגש.
- `dp` (הנתיב) נשלח **בנוסף** ל-`o`, ⛔ לא במקומו.

### 2.3 — הלכידה ב-SPA

```js
if(window.vai||(window.vai=!0,S(),o.disableAutoTrack))return;
w({withReferrer:!0});
let t=history.pushState.bind(history);
history.pushState=function(...n){t(...n);try{R(n[2]),k=e()}catch(a){}},
window.addEventListener("popstate",function(){R(e()),k=e()})
```

⇒ ביקון בטעינה **ועוד אחד בכל `pushState`** — כלומר בכל מעבר ראוט של `react-router`.
⇒ `disableAutoTrack` חוסם את **שניהם**, ו-`S()` (הרישום של `window.va`) רץ **לפניו**.

### 2.4 — 🔴 מלכודת: הסקריפט **מתאבד** תחת אוטומציה

```js
function t(){ return !!(navigator.webdriver || navigator.userAgent.includes("Headless")) }
... if(t()) return;
```

⇒ **Playwright headless היה מודד «אין דליפה» — ⛔ תוצאה שקרית.** כל אימות של הפריט
הזה חייב לרוץ בדפדפן אמיתי. זו הסיבה שהמדידה ב-§3 היא Chrome אמיתי.

---

## §3 — מדידה חיה: הבייטים של פרודקשן, בדפדפן אמיתי, בלי לשלוח כלום

**מתודה.** מארז מבודד ב-`http://127.0.0.1:8731` שמגיש את **הקובץ שהורד מפרודקשן**
(sha256 לעיל), מחליף את `fetch`/`sendBeacon` בלוכד מקומי שמחזיר `200` **ו⛔ אינו שולח**,
ומזריק `<script>` עם אותם `dataset` ש-`inject()` מייצר. הרצה ב-Chrome של ניב דרך
תוסף הדפדפן — `navigator.webdriver=false`, `Headless=false` ⇒ שער §2.4 ⛔ לא ירה.

⚠️ **ה-hash שהוזרק הוא `FAKE_AUDIT_PROBE_B184`** — ⛔ אין טוקן אמיתי בשום שלב,
⛔ לא הוזנו אישורים (§12), ו⛔ שום בקשה ⛔ לא עזבה את המכונה.

> ⚠️ **ניסיון קודם, מדווח ⛔ ולא מוסתר:** לפני המארז ניווטתי לפרודקשן עצמה עם אותו
> hash מזויף. הדפדפן הזה נושא **סשן מחובר חי** (`user_id 1ad72482…`), ולכן זו הייתה
> בדיקה עם סיכון מיותר לסשן של ניב. הופסקה מיד ו⛔ לא חוזרה. המדידה שלמטה ⛔ אינה
> נוגעת בפרודקשן כלל.

### 3.1 — קו הבסיס = המצב של `main.jsx:15` **היום** (`inject()` ללא ארגומנטים)

```
beacons=1
via=fetch  endpoint=/_vercel/insights/view  keys=o|sv|sdkn|sdkv|ts|r
o_len=115  o_has_hash=true  o_has_secret_param=true
o_prefix=http://127.0.0.1:8731/index.html#
```

⇒ 🔴 **ביקון אחד, `POST /_vercel/insights/view`, והשדה `o` נושא את ה-URL השלם —
115 תווים — כולל ה-fragment וכולל שם-הפרמטר של הטוקן.**
**זו ההוכחה.** ⛔ לא ציטוט של B-184, ⛔ לא הדפסת dev, ⛔ לא קריאת CSS/JS סטטית.

### 3.2 — למה ה-fragment בכלל שם: `src/supabaseClient.js:13`

`detectSessionInUrl: true` ובלי `flowType` ⇒ supabase-js v2 בזרימה **implicit** ⇒ כל
חזרת OAuth / שחזור-סיסמה נוחתת על `https://swing-edge.com/#access_token=…&refresh_token=…`
**לפני** שהלקוח מנקה. זהו בדיוק המנגנון של `INCIDENTS#12`, שתוקן ל-gtag **בלבד**.

**GA4 היום, נמדד חי על swing-edge.com:**
`dl=https%3A%2F%2Fswing-edge.com%2Fapp` ⇒ מוצמד, בלי `search` ובלי `#`. ✅ תיקון #12 מחזיק.
⇒ 🔴 **הפער ⛔ אינו תיאורטי: אותו סוד, אותה טעינת עמוד, ערוץ אחד סתום והשני פתוח.**

### 3.3 — שער החוזה ⛔ אינו יכול לראות את זה

```
$ grep -n "vercel\|inject" scripts/analytics-contract-test.mjs
(אפס התאמות)
```
14 האסרציות של `test:analytics` שומרות על `gtag` בלבד. אסרציה 12 (`:167`) היא
`/(?<!window\.)\bgtag\s*\(/` — ⇒ **עיוורון מבני**, ⛔ לא פספוס. `‹R-3›` בדיוק.

---

## §4 — שתי אפשרויות תיקון, **שתיהן נמדדו על אותו מארז**

| וריאנט | מה שונה | ביקונים | `o` | hash | פרמטר-סוד |
|--------|---------|---------|-----|------|------------|
| קו בסיס (היום) | — | **1** | 115 תווים | **true** | **true** |
| **A** · `beforeSend` שמצמיד | `origin + pathname` | **1** | **28 תווים** | **false** | **false** |
| **B** · `disableAutoTrack` | `dataset.disableAutoTrack='1'` | **0** | — | — | — |

וריאנט A, פלט מלא:
```
VARIANT_A beacons=1
endpoint=/_vercel/insights/view  o_len=28  o_has_hash=false  o_has_secret_param=false
o=http://127.0.0.1:8731/a.html
```
⇒ **הדליפה נסגרת וספירת העמודים נשמרת.**

וריאנט B, פלט מלא:
```
VARIANT_B beacons=0  vai=true  va=function  pushStatePatched=false
```
⇒ הסקריפט **נטען** (`vai=true`), `window.va` **קיים**, ⛔ `pushState` לא הוחלף,
ו⛔ **שום ביקון**. כלומר: השתקה מלאה של הלכידה האוטומטית, עם ערוץ ידני שנשאר פתוח.

⚠️ **הצמדה (A) ⛔ אינה מכסה את שאלת ההסכמה, וחסימה (B) ⛔ אינה מכסה את `/privacy`.**
ההכרעה ביניהן ⛔ אינה בדוח הזה — ראה התוכנית.

---

## §5 — מה נשען על Vercel Analytics **היום**

### 5.1 — 🔴 הלוח ⛔ אינו קיים. נמדד היום, ⛔ לא צוטט

```
get_web_analytics(prj_JaOaPmjgAQSN8yL8UGmF2SHobQVk, 2026-07-28 → 2026-08-27)
→ 404 Not Found — {"error":{"code":"not_found","message":"Web Analytics not found."}}
```

מדידה קודמת: `docs/audits/AUDIT-B171b.md:72` — **אותה 404, 24.08.** נמדד שוב **27.08**
כי «מספר שנרשם פעם ולא נמדד שוב ⛔ אינו עובדה».

⇒ 🔴 **שני חצאים במצבים הפוכים: ה-ingest מקבל (`400`, ⛔ לא `404`), הלוח ⛔ אינו קריא.**
⇒ **הנתון עוזב את הדפדפן של המשתמש אל צד שלישי, ואיש ⛔ אינו יכול לקרוא אותו.**
⇒ **אפס דוחות, אפס החלטות ואפס סקריפטים נשענים על המספרים האלה — כי אין מספרים.**

### 5.2 — מה **כן** נשבר: טקסט משפטי שפורסם

`src/components/LegalPages.jsx` — שלוש נגיעות, כולן **פונות-משתמש ומפורסמות**:
- `:156` — «נתוני שימוש: מדידת תנועה בסיסית של Vercel Analytics — ללא עוגיות וללא מזהה
  אישי, **פועלת תמיד**»
- `:157` — «Vercel (אירוח **ומדידת תנועה**)»
- `:162` — פסקה **ייעודית**: «למה Vercel Analytics אינו מותנה באישור … מודד **ספירת
  עמודים בלבד** … ולכן הוא פועל תמיד ומהווה את **קו הבסיס היחיד** שלנו»

⇒ 🔴 **`:162` שקרי כבר עכשיו.** «ספירת עמודים בלבד» ⛔ אינו תיאור של מטען שנושא
`#access_token`. ⇒ הטקסט הזה טעון-תיקון בכל אחד מהמסלולים — כולל «לא לעשות כלום».

### 5.3 — `DECISIONS.md:22` (2026-07-27) — ההחלטה הנעולה

> «GA4 מגודר בהסכמה, @vercel/analytics לא | … Vercel Analytics **cookieless וללא מזהה
> אישי** — הקו הוא עוגיות, לא "אנליטיקס"»

⇒ ההנחה «ללא מזהה אישי» **הופרכה**: טוקן סשן הוא המזהה האישי החזק ביותר במערכת.
⛔ `DECISIONS` הוא append-only ⇒ ⛔ אין לערוך את השורה; נדרשת שורה חדשה עם הדלתא.

### 5.4 — `vercel.json:18` ⛔ **אינו** נשבר — תיקון להנחה שלי

הנחתי מוקדם יותר שה-CSP נשען על זה. **מדדתי — לא:**
- `va.vercel-scripts.com` משמש **רק** ב-`isDevelopment()` (`getScriptSrc`). בפרודקשן
  ה-src הוא `/_vercel/insights/script.js` ⇒ `'self'`.
- `vitals.vercel-insights.com` שייך ל-**Speed Insights**, ⛔ לא ל-Web Analytics.
- הביקון הולך ל-`/_vercel/insights/view` ⇒ גם הוא `'self'`.

⇒ **שתי הרשומות ⛔ לא היו נושאות-משקל לפריט הזה מלכתחילה**, וה-CSP הוא `Report-Only`
בכל מקרה. ⚠️ נרשם כ**סריקה סביבתית (§11), ⛔ לא כתיקון**: הן הופכות לרשומות מתות אם
החבילה תוסר. ניב מחליט.

---

## §6 — מה הדוח הזה ⛔ **אינו** קובע

- ⛔ **אינו** מכריע בין A ל-B ל«הסרה» — ההכרעה בתוכנית, והבחירה של ניב.
- ⛔ **אינו** יודע כמה משתמשים דלפו בפועל. כמו ב-`INCIDENTS#12`, המספר ⛔ אינו ניתן
  למדידה מהשרת. ⛔ **אין להמציא תקרה** — ⛔ לא נמדדה כאן אוכלוסייה.
- ⛔ **אינו** מוכיח מי מנצח את המרוץ בפרודקשן בין הביקון לבין ניקוי ה-hash של
  supabase-js. §3 מוכיח ש**אם** ה-hash קיים ברגע הביקון, הוא נשלח — ו-`INCIDENTS#12`
  כבר קבע שהוא קיים בזמן פרסינג המסמך. ⚠️ **המרוץ עצמו ⛔ לא נמדד**, ובאג אבטחה
  ⛔ אינו נסגר בטענת תזמון.
- ⛔ **אינו** נוגע ב-`SwingEdge_App.jsx`. ⛔ אפס שינויי קוד בגל הזה.
