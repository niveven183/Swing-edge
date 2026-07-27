# PLAN — GA4 + Consent Mode v2 + באנר הסכמה + /privacy

**תאריך:** 2026-07-27 · **Measurement ID:** `G-VC8PKL4NL1` · **Property:** `547224198`
**סטטוס:** approved with corrections (אישור שני התקבל — ממשיכים לביצוע)

---

## Context — למה זה נעשה

29 משתמשים, activation 31%, ו**אפס נראות** על מה שקורה אחרי הכניסה הראשונה. אנחנו
לא יודעים אם משתמש שנרשם ולא רשם עסקה נתקע במסך מסוים, נטש בטעינה, או פשוט לא חזר.
`docs/STATE.md` מציב את זה כ-🔴 עכשיו ("שבוע הבנת משתמשים").

ה-GA4 property כבר קיים ומוגדר (retention 14 חודשים, Google Signals כבוי) — **התג עצמו
לא מותקן.** המשימה: להתקין אותו נכון מהצעד הראשון — deny-by-default, הסכמה מפורשת,
ובלי לזהם את הדאטה בתעבורת CI.

**התוצאה המכוונת:** funnel אמין של landing → הרשמה → עסקה ראשונה → חזרה ביום 7.

---

## ניתוח השלכות (CLAUDE.md §8) — הפילטר נתפס

הפילטר תפס על שני צירים: **רץ אוטומטית בפרודקשן** ו**נוגע בפרטיות משתמשים**.
(לא נוגע ב-DB, לא בכסף/מיילים, לא מוסיף סוד, הפיך.)

| ציר | הערכה |
|-----|--------|
| **משתמשים** | כל 29 המשתמשים + כל מבקר אנונימי יראו באנר חד-פעמי בתחתית המסך. לא חוסם, לא modal — ניתן להתעלם ולהמשיך לעבוד. אחרי בחירה אחת הוא לא חוזר לעולם. משתמש שבוחר "לא תודה" מקבל שירות זהה לחלוטין. |
| **נתונים** | **הפיך במלואו.** אין מיגרציה, אין שינוי סכימה, אפס נגיעה ב-Supabase. הנתון היחיד שנוצר הוא מפתח `swingEdgeConsent` ב-localStorage של הדפדפן (`{v,analytics,ts}`) ועוגיות `_ga*` — **רק אחרי אישור מפורש**. rollback = revert הקומיט; המפתח הנותר בדפדפנים נקרא ומתעלמים ממנו. |
| **עלות** | **₪0.** gtag.js נטען מ-CDN של Google, לא עובר דרך Vercel ולא נספר ב-bandwidth. GA4 חינמי עד 10M events/חודש — אנחנו בסדרי גודל של אלפים. אפס דקות Actions נוספות. אפס עומס Supabase. גודל bundle: `consent.js` + `ConsentBanner.jsx/.css` ≈ 2KB gzipped. |
| **תקרות ספק** | GA4 free tier: 10M hits/חודש — לא רלוונטי. **התקרה האמיתית שכמעט נשברה: זיהום דאטה.** `sentinel.yml` רץ `'20,50 * * * *'` = 48 ריצות/יום × 2 עמודים, ועוד `smoke.yml` יומי + על כל push. זה ~100+ pageviews סינתטיים ביום מול 29 משתמשים אמיתיים — יחס של 3:1 רעש לאות. **מנוטרל ב-route abort** (שלב 8–10). |
| **אבטחה** | אין סוד חדש. Measurement ID הוא מזהה ציבורי מעצם הגדרתו (מופיע בכל בקשת רשת). אין שינוי ב-RLS. אין חשיפת נתוני משתמש — GA4 מקבל pageview + user-agent + IP מקוצר, ואפס תוכן יומן. `ads_data_redaction: true` מוסיף שכבה. **הערה:** `anonymize_ip` הוא פרמטר של Universal Analytics ו-no-op ב-GA4 (שם קיצוץ ה-IP הוא ברירת מחדל בצד השרת) — נשאר כי נדרש, אבל **סיפור הציות הוא Consent Mode v2 + deny-by-default**, לא הוא. |
| **תחזוקה (§3 — מבחן מטרת-העל)** | ✅ **מקטין עבודה ידנית.** הכפתור הפעיל ב-/privacy מבטל פניות ידניות בנושא ביטול הסכמה. חסימת GA בטסטים מבטלת צורך בסינון internal-traffic ידני ב-GA4 UI. הצעד הידני היחיד שנוסף הוא חד-פעמי (אימות Enhanced Measurement בקונסולת GA4). **חוב יחיד:** ה-gutter של 104px/92px ב-CSS צמוד ל-FAB ב-`SwingEdge_App.jsx:6671` — ולכן נאכף באסרשן ב-sentinel במקום להישען על זיכרון. |
| **הפיכות** | `git revert` + push. זמן חזרה: משך deploy של Vercel, ~90 שניות. אין מצב ביניים שבור: אם ה-JS של הבאנר נכשל, ה-default הוא denied והתג פשוט לא אוסף. |
| **כשל שקט** | **זה הציר המסוכן, ומטופל מפורשות בשלושה מקומות.** (1) הכשל השקט הקלאסי כאן — `consent default` לא נורה ראשון, והתג אוסף לפני הסכמה. **הוכחה:** `dataLayer[0]` חייב להיות ה-default, ופרמטר `gcs=G100` בבקשת `g/collect`. אימות זה חובה. (2) SPA בלי Enhanced Measurement history-events רושם רק pageview אחד — `/app` ייראה מת ונסיק מסקנה הפוכה לגמרי. (3) הרעלת CI — 100 pageviews/יום היו הופכים כל מסקנת activation לשקר, בלי שום שגיאה בשום מקום. |

**פסק דין: ⚠️ בצע עם הגנה.**
ההגנות המחייבות: `dataLayer[0] === consent default` מאומת בטסט · `gcs=G100` מאומת ידנית ·
route-abort ל-GA בשלושת ה-specs · אסרשן אי-חפיפה עם ה-FAB ב-sentinel-auth ·
אימות שדיאלוג `ConfirmProvider` מכסה את הבאנר.

---

## החלטות שאושרו (4/4 — אפשרות 1)

1. **CI:** allowlist **וגם** route-abort. ה-abort מונע את השגיאה מלכתחילה; ה-allowlist הוא רשת ביטחון.
2. **/privacy:** כפתור ביטול פעיל (`ConsentControl`), לא הוראה טכנית. ביטול קל כמו הסכמה.
3. **IOSInstallBanner:** נדחה עד להכרעת ההסכמה (~3 שורות, בקובץ שלו בלבד).
4. **@vercel/analytics:** נשאר ללא gating — cookieless, ללא מזהה מתמיד. **בתנאי** שהפער מוסבר במפורש ב-/privacy.

**אילוץ נוסף:** אין נגיעה ב-`main.jsx` מעבר לשתי שורות חיווט הבאנר. `inject()` נשאר במקומו.

---

## התובנה הגאומטרית (לב הפתרון)

ה-FAB (`data-tour="add-trade"`, `SwingEdge_App.jsx:6671`) הוא
`fixed bottom-6 right-6 rtl:right-auto rtl:left-6` — כלומר **תמיד בפינת ה-inline-end**,
בשני הכיוונים. באנר שמעוגן ל-**inline-start** בתוך lane שיורש כיוון מ-`documentElement`
(אותו מקור בדיוק שה-`rtl:` של Tailwind נשען עליו) נוחת תמיד בצד הנגדי.

**אי-החפיפה נכונה מעצם המבנה, לא בזכות z-index.** לכן הקליק של sentinel-auth על ה-FAB
עובד ללא תלות בסדר הערימה.

נדחו: פס full-width ב-`bottom:0` (ה-FAB הוא `fixed` ומתעלם מ-padding של body → היה
דורש שינוי ב-`SwingEdge_App.jsx`) · pill ממורכז ב-`bottom-4` (נוחת בדיוק על
`IOSInstallBanner` ועל סרגל ה-undo).

---

## קבצים

### חדשים
| קובץ | תפקיד |
|------|--------|
| `src/lib/consent.js` | מקור-אמת-אחד ל-`swingEdgeConsent`. `readConsent` · `grantAnalytics` · `denyAnalytics` · `revokeAnalytics` · `subscribeConsent`. לצד `src/lib/userSettings.js` הקיים. |
| `src/components/ConsentBanner.jsx` | הבאנר. עברית בלבד. |
| `src/components/ConsentBanner.css` | CSS ידני (לא Tailwind — §override של `index.css` ממפה מחדש utilities של צבע; תקדים: `LandingPage.css`). |

### לשינוי
| קובץ | שינוי |
|------|--------|
| `index.html` | בלוק GA אחרי ה-theme resolver, לפני ה-`<style>` של ה-boot loader. |
| `src/main.jsx` | `import ConsentBanner` + רינדור אחרי `</Routes>` בתוך `<BrowserRouter>`. **זה הכל.** |
| `src/components/IOSInstallBanner.jsx` | דחייה עד הכרעת הסכמה (~3 שורות). |
| `src/components/LegalPages.jsx` | 3 פסקאות מתוקנות + פסקת Vercel + `ConsentControl` + padding תחתון + תאריך. |
| `tests/smoke.spec.js` | allowlist + route-abort + טסט חיובי ל-consent default. |
| `tests-sentinel/sentinel-public.spec.js` | route-abort. |
| `tests-sentinel/sentinel-auth.spec.js` | route-abort + אסרשן אי-חפיפה + decline. |
| `docs/STATE.md` · `docs/DECISIONS.md` | §10 — באותו קומיט. |

---

## 1 · `index.html`

**מיקום מדויק:** מיד אחרי ה-`</script>` של ה-pre-paint theme resolver, לפני
`<!-- Boot loader styling -->`. אחרי ארבעת ה-preconnect של הפונטים.

`dns-prefetch` ולא `preconnect`: כבר יש 3 preconnects שמתחרים על sockets והפונטים
render-blocking. gtag.js הוא async ולא קריטי — רזולוציית DNS היא עיקר הרווח בלי לתפוס socket.

```html
<!-- ═══ Google Analytics 4 + Consent Mode v2 ═══
     הסדר בבלוק הזה נושא-משקל:
       1. dataLayer + shim   2. consent DEFAULT (הכל denied)
       3. שחזור אישור שמור   4. config   5. gtag.js async
     gtag.js הוא async ומופיע אחרי הבלוק, ולכן אינו יכול לרוץ לפניו —
     סדר המסמך מבטיח ש-denied הוא dataLayer[0] בכל טעינה, ללא תנאי.
     אין להוסיף CSP בלי nonce/hash לבלוק הזה ולתוקן-הערכה שמעליו. -->
<link rel="dns-prefetch" href="https://www.googletagmanager.com" />
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;

  /* 1) deny by default. לעולם לא מותנה, לעולם לא מדולג. */
  gtag('consent', 'default', {
    ad_storage:            'denied',
    ad_user_data:          'denied',
    ad_personalization:    'denied',
    analytics_storage:     'denied',
    functionality_storage: 'granted',
    security_storage:      'granted'
  });
  gtag('set', 'ads_data_redaction', true);

  /* 2) שחזור אישור קודם. קריאת רשומת ההסכמה שלנו אינה מעקב ואינה כותבת דבר.
     כל כשל parse / מפתח חסר / גרסה לא תואמת נופל דרך ונשאר denied (fail-closed). */
  try {
    var raw = localStorage.getItem('swingEdgeConsent');
    if (raw) {
      var c = JSON.parse(raw);
      if (c && c.v === 1 && c.analytics === 'granted') {
        gtag('consent', 'update', { analytics_storage: 'granted' });
      }
    }
  } catch (e) {}

  gtag('js', new Date());
  gtag('config', 'G-VC8PKL4NL1', { anonymize_ip: true, send_page_view: true });
</script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-VC8PKL4NL1"></script>
```

**למה השחזור ב-head ולא ב-React:** אם הוא ב-React, כל משתמש חוזר שאישר מאבד את
ה-pageview הראשון של כל טעינה — `main.jsx` רץ אחרי ש-gtag.js כבר שלח. האילוץ "אין
localStorage לפני הסכמה" חל על **כתיבת** מצב מעקב; קריאת רשומת ההסכמה שלנו היא
תנאי הכרחי לכיבוד הבחירה, והבלוק אינו כותב דבר.

**`wait_for_update` הושמט במכוון** — נועד ל-CMP אסינכרוני. שלנו סינכרוני, ולכן היה
רק מעכב כל pageview ראשון ב-500ms ואז שולח denied בכל מקרה.

---

## 2 · `src/lib/consent.js`

צורת האחסון: `{ v: 1, analytics: 'granted' | 'denied', ts: '<ISO 8601>' }`

JSON ולא מחרוזת: מאפשר bump ל-`v` כדי לשאול מחדש אחרי שינוי מדיניות, מתעד **מתי**
ניתנה ההסכמה, ומאפשר הוספת `ad_storage` בעתיד בלי מיגרציה שוברת. הקורא סלחני
בכוונה — JSON פגום / גרסה לא מוכרת / ערך לא צפוי → `null` → הבאנר חוזר → denied.

`revokeAnalytics()` מוחק גם את עוגיות `_ga*` (`_ga` ו-`_ga_VC8PKL4NL1`) על כל וריאנטי
הדומיין — מדיניות שמבטיחה ביטול בלי למחוק את המזהה היא הבטחה שקרית.

---

## 3 · `src/components/ConsentBanner.css`

```
.se-consent          position:fixed · inset-inline:0 · inset-block-end:0
                     z-index:91 · justify-content:flex-start · padding:12px
                     pointer-events:none          ← ה-lane לעולם לא חוטף קליק
.se-consent__card    pointer-events:auto          ← רק הכרטיס אינטראקטיבי
                     box-sizing:border-box
                     inline-size: min(640px, calc(100% - 104px))
```

### 🔴 תיקון 1 — z-index 91, לא 95

`z-[95]` **תפוס** בשני מקומות, שניהם `fixed inset-0` על כל המסך (אומת מול origin/main):

| קובץ | שורה | תפקיד |
|------|------|--------|
| `src/components/ToastProvider.jsx` | 109 | ה-overlay של `ConfirmProvider` |
| `src/components/AdminPanel.jsx` | 248 | דיאלוג אישור מסוכן |

באנר ב-95 שמופיע אחריהם ב-DOM היה **צף מעל דיאלוג אישור** — היפוך מוחלט של הכוונה.

**`z-index: 91`** — מעל `z-[90]` (IOSInstallBanner, סרגל undo, `AdminPanel.jsx:169`)
ומתחת ל-`z-[95]` (שני הדיאלוגים), ל-`--z-dropdown:100`, `--z-modal:300`, `--z-toast:400`.

טוקני ה-Z-index יושבים ב-**`src/design/tokens.css:111-115`** (לא ב-`src/index.css`).
הבאנר לא משתמש בהם כי כל ה-overlays הקיימים משתמשים ב-`z-[9x]` שרירותי מתחת לסקאלה.
**לא להעלות מעל 120** — היה מנקב את ה-spotlight של `OnboardingTour` (`fixed inset-0 z-[120]`).

### 🟠 תיקון 2 — חשבון גאומטרי מלא

ה-`592` נכון, אבל הפירוק בגרסה הקודמת היה דו-משמעי. הפירוק המלא, ב-viewport של **720px**:

```
lane  .se-consent    inset-inline:0        → משתרע 0 … 720
      padding:12px   (שני צדי inline)      → תיבת תוכן 12 … 708  =  696px
card  inline-size    min(640, 100% − 104)
                     100% = 696  (תיבת התוכן של ה-lane, לא ה-viewport)
                     696 − 104 = 592       → card = min(640,592) = 592px
      justify-content:flex-start           → card משתרע 12 … 604
FAB   right-6 (24px) + w-14 (56px)         → FAB  משתרע 640 … 696
                                    מרווח  =  640 − 604  =  36px  ✅
```

**ה-104px = 24px (inset של ה-FAB) + 56px (רוחב ה-FAB) + 24px (מרווח).**
ה-24px שהחסרתי הוא `padding:12px` **משני הצדדים**, לא צד אחד — שם נולדה הדו-משמעות.

**החלטה: `padding: 12px` נשאר כפי שנכתב.** התוצאה 592px ומרווח 36px.
ב-1440px: card = min(640, 1416−104) = **640px**, מרווח עצום.

מתחת ל-720px ה-media query הופך ל-full-width ומרים את כל ה-lane מעל ה-FAB
(`padding-block-end: calc(92px + env(safe-area-inset-bottom))`, כאשר
92px = 24px inset + 56px FAB + 12px מרווח) — המרווח הופך מאופקי לאנכי.

### שאר ה-CSS

⚠️ **רגולטורי:** שני הכפתורים חולקים מחלקה אחת `.se-consent__btn` וחייבים להישאר
זהים בגודל, radius, משקל, צבע וניגודיות. אין `--primary`, אין tint ל"מאשר".

`prefers-reduced-motion: reduce` → `animation:none` + `transition:none`.
כל ה-insets לוגיים — אפס `left`/`right` פיזי.
צבעים מטוקני v3: `--v3-bg-panel` · `--v3-line` · `--v3-accent` · `--v3-text-hi/mid`.

---

## 4 · `src/components/ConsentBanner.jsx`

```jsx
<div className="se-consent" role="region" aria-label="הודעת פרטיות">
  <div className="se-consent__card" dir="rtl" lang="he">
```

⚠️ **`dir="rtl"` על הכרטיס, לעולם לא על ה-lane.** `SwingEdge_App.jsx:1500` משנה את
`documentElement.dir` לפי שפה; אילו ה-lane היה נעול ל-rtl, במצב אנגלית הוא היה נוחת
בצד הפיזי-ימני ומכסה את ה-FAB. ה-lane חייב לרשת כיוון.

`role="region"` ולא `dialog` — אין focus trap, אין מודאליות. אחרון ב-`#root` ⇒ אחרון
ב-tab order, מה שנכון להודעה לא-מודאלית.

**נוסח (מדויק, לא מרוכך):**
> אנחנו משתמשים ב-Google Analytics כדי להבין איך משתמשים באתר ולשפר אותו. בלי אישורך
> לא נשמרות עוגיות ולא נוצר מזהה מתמשך בדפדפן שלך. [מדיניות הפרטיות]

הניסוח המתבקש "זה נטען רק אם תאשר" היה **שקר** — gtag.js נטען תמיד, ועם
`analytics_storage: denied` GA4 עדיין שולח ping חסר-עוגייה. הנוסח לעיל אומר את מה שנכון
בפועל. **לא לרכך אותו בחזרה.**

`data-testid="consent-accept"` / `consent-decline` — נדרשים ל-sentinel.
`visible` נקבע ב-`useEffect` ולא ברינדור: localStorage שזורק (Safari פרטי) לא ישבור paint.

**עברית בלבד** (לא דרך `src/i18n.js`): הבאנר מקשר למדיניות שמרנדרת מפורשות
"English version coming soon" — באנר מתורגם שמצביע על מסמך מחייב לא-מתורגם גרוע
מבאנר עקבי בעברית. בנוסף `main.jsx` הוא מחוץ לכל context של שפה, וחיווט היה יוצר
מקור-אמת שני ל-`swingEdgeLang`. כשל-LegalPages תהיה גרסה אנגלית — מתרגמים את שניהם יחד.

---

## 5 · `src/main.jsx` — שתי שורות

```jsx
<BrowserRouter>
  <Routes>…</Routes>
  <ConsentBanner />        {/* ← נוסף */}
</BrowserRouter>
```

בתוך ה-router כי `<Link to="/privacy">` דורש context — `<a href>` היה גורם reload מלא
ומשגר את המשתמש ב-`/app` דרך מסלול שחזור ה-session של Supabase ללא סיבה.
מחוץ ל-`<Routes>` כדי שיופיע בכל ארבעת המסלולים. **אפס שינוי ב-`SwingEdge_App.jsx`.**

אין צורך ב-portal: `#root` (`src/index.css:53`) מגדיר רק צבעים ופונטים — אין `transform`
/ `filter` / `contain`, ולכן `position:fixed` נפתר מול ה-viewport. `IOSInstallBanner`
כבר נשען על זה מעומק גדול יותר בעץ.

---

## 6 · `src/components/IOSInstallBanner.jsx`

בתוך ה-effect הקיים, אחרי שומרי `isIOS()`/`isStandalone()` — להחליף את ה-`setTimeout`
החשוף ב-arm מותנה: יורה רק אם `readConsent() !== null`, ונרשם ל-`subscribeConsent`
כדי להיפתח מיד אחרי הבחירה. cleanup מנקה גם timer וגם מנוי.

---

## 7 · `src/components/LegalPages.jsx`

**(א) "עוגיות" (L108) — מוחלף.** הנוסח הנוכחי ("אין עוגיות פרסום… local storage לתפעול
בלבד") הופך ללא-מדויק ברגע שהתג עולה. הנוסח החדש מפרט Consent Mode v2, ארבעת
המפתחות ב-denied, היעדר Google Signals ורימרקטינג, ואת מפתח `swingEdgeConsent`.

**(ב) `<ConsentControl />` — פסקה חדשה מיד אחריה.** מציגה מצב נוכחי, מאפשרת שינוי לשני
הכיוונים, מוחקת `_ga*` בביטול. כפתור בסגנון ה-`C.accent` המקומי של הקובץ.

**(ג) סעיף (ג) ב"מה אנחנו אוספים" (L104) — מתוקן.** מבחין במפורש בין Vercel Analytics
(ללא עוגיות, ללא מזהה אישי) לבין GA4 (רק אחרי אישור).

**(ד) "איפה זה נשמר" (L105) — מתוקן.** מוסיף את Google, העברה מחוץ לישראל תחת
Google Ads DPT + SCCs, ו-retention 14 חודשים.

**(ה) פסקה ייעודית — למה Vercel Analytics אינו מגודר.** תנאי מחייב מהחלטה 4/4:
הקו הוא **עוגיות מול ללא-עוגיות**, לא "אנליטיקס מול לא". בלי ההסבר זה נראה כחוסר עקביות.

**(ו)** `LegalShell` padding תחתון `80px` → `clamp(80px, 24vh, 240px)` — שהבאנר לא יחתוך
את הפסקה האחרונה במובייל. **(ז)** עדכון `updated=`.

---

## 8–10 · טסטים

**`tests/smoke.spec.js` — הסיכון הגבוה ביותר.** `CONSOLE_ERROR_ALLOWLIST` הוא `[]`
(אומת, L13), `assertClean` עושה `.toEqual([])`, ו-`smoke.yml` רץ על
`push: branches: [main]` — כלומר ה-deploy שמביא את GA מריץ אותו. כל 4xx מ-`g/collect`
צץ כשגיאת קונסולה ומפיל את הריצה.

1. `CONSOLE_ERROR_ALLOWLIST = ['google-analytics','googletagmanager','doubleclick','gtag']` — **ותו לא.**
2. `await page.route('**/googletagmanager.com/**', r => r.abort())` בשלושת ה-specs.
3. טסט חיובי אחד (בלי route-block): `dataLayer[0]` הוא `['consent','default',{…denied…}]`,
   ו-`localStorage.getItem('swingEdgeConsent')` הוא `null` לפני בחירה.

**`sentinel-auth.spec.js`** — context טרי בכל ריצה ⇒ הבאנר תמיד למעלה. במקום "לקוות
שהקליק יעבור", מוסיפים לפני שלב 5 (~L400) אסרשן boundingBox שהכרטיס אינו חופף ל-FAB
(finding 🔴 עם המידות בפועל אם כן), ואז `consent-decline` — כך תעבורת Sentinel לעולם
לא נוחתת ב-GA4 גם אם ה-abort יפוספס. עטוף ב-`try/catch` — הבאנר אופציונלי ולעולם לא
מפיל ריצה. זו ההגנה שתופס drift ב-gutter של 104px.

**`sentinel-public.spec.js`** — route-abort בלבד. ה-`IGNORE_SUBSTR` שלו כבר מכיל את
ארבע התבניות, והוא רק עושה `waitFor` על `header#top` — אינו לוחץ ב-lane התחתון.

---

## 11 · GA4 admin (ללא קוד, אך מחייב)

⚠️ **Enhanced Measurement → "Page changes based on browser history events" חייב להיות ON.**
SwingEdge הוא SPA; בלעדיו אף מסלול פנימי לא נספר, `/app` ייראה מת, ונסיק שהמשתמשים
לא פעילים כשלמעשה פשוט לא נמדדו. זהו הכשל השקט מס' 2 מהטבלה.
בנוסף: retention 14 חודשים (קיים) · Google Signals **off** (קיים) · אישור DPT.

---

## 12 · `docs/DECISIONS.md` — באותו קומיט

| 2026-07-27 | GA4 מגודר בהסכמה, @vercel/analytics לא | GA4 כותב עוגיות `_ga` מתמידות; Vercel Analytics cookieless וללא מזהה אישי — הקו הוא עוגיות, לא "אנליטיקס". הפער מוסבר במפורש ב-/privacy | גידור שניהם — היה מוחק את קו הבסיס · אי-גידור שניהם — GA4 כותב עוגיות |

שורה שנייה: הבאנר ב-`z-index:91` — מעל `z-[90]` ומתחת ל-`z-[95]` של `ConfirmProvider`
ו-`AdminPanel`; ה-gutter 104px/92px צמוד ל-`SwingEdge_App.jsx:6671` ונאכף באסרשן ב-sentinel.

---

## אימות

### 🟡 תיקון 3 — אימות מקומי, לא preview URL

אין PR ואין merge בזרימה הזו — ה-push ל-main **הוא** הדיפלוי, ו-`smoke.yml` יורה עליו.
לכן השער חייב להיות מקומי, **לפני** ה-push:

```bash
npm run verify                 # test:coach → test:import → test:settings → build
npm run build && npm run preview          # vite preview על :4173
TEST_URL=http://localhost:4173 npx playwright test
TEST_URL=http://localhost:4173 npx playwright test -c playwright.sentinel.config.js
```

**רק אם שתי הקונפיגורציות ירוקות — push.**

⚠️ **סייג ידוע:** `vite preview` מגיש קבצים סטטיים בלבד ואינו מריץ את הפונקציות
תחת `api/`. טסטי smoke שתלויים ב-`/api/quote` ייכשלו מקומית מסיבה שאינה קשורה
לשינוי הזה. השער הרלוונטי כאן הוא **טסטי הקונסולה, המסלולים ו-consent** — הם חייבים
לעבור. אם צריך כיסוי מלא כולל API: `vercel dev` במקום `npm run preview`.

`grep -r "G-VC8PKL4NL1" dist/` — לאישור שה-ID נמצא בפלט הבנייה.

### Consent defaults — פרופיל incognito נקי, `/`

1. לפני נגיעה: אין `swingEdgeConsent` ב-localStorage, אין עוגיית `_ga*`.
2. `dataLayer[0]` = `["consent","default",{…ארבעתם denied…}]` — **אינדקס 0, לא 1.**
3. Network → `g/collect` → ה-URL מכיל **`gcs=G100`**. זו ההוכחה המכרעת — **screenshot.**

**מסלול אישור:** "מאשר" → הרשומה `{"v":1,"analytics":"granted",…}`, עוגיית `_ga` מופיעה,
ה-`g/collect` הבא נושא `gcs=G101`.
**רענון** → `dataLayer[0]` עדיין ה-default המלא ו-`dataLayer[1]` הוא ה-update; ה-`g/collect`
**הראשון** של הטעינה כבר `gcs=G101`. זה מוכיח את השחזור ב-head — הצעד שהכי נוטה לחשוף טעות.

**מסלול סירוב (פרופיל טרי):** "לא תודה" → `denied`, אין `_ga`, `gcs=G100`. רענון → הבאנר
לא חוזר, עדיין `G100`.

**ביטול:** ב-/privacy אחרי אישור → הרשומה מתהפכת, עוגיות `_ga*` נעלמות, הבאנר לא חוזר.

### 🔴 אימות z-index (מתיקון 1) — חוסם

עם הבאנר פתוח, לפתוח דיאלוג אישור של `ConfirmProvider` (למשל מחיקת עסקה ב-`/app`).
**הדיאלוג חייב לכסות את הבאנר במלואו** — ה-overlay השחור `bg-black/70` עליו.
אם הבאנר צף מעל הדיאלוג → **🔴 ועצירה.**

### אי-חפיפה עם ה-FAB

מחובר ב-`/app` עם הבאנר פתוח, ב-360/390/719/720/768/1024/1440px, ועם
`documentElement.dir` כפוי ל-`'rtl'` **וגם** `'ltr'` (14 צירופים). בכל אחד:
```js
const a = document.querySelector('.se-consent__card').getBoundingClientRect();
const b = document.querySelector('[data-tour="add-trade"]').getBoundingClientRect();
a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top   // true
```
ב-720px המרווח הצפוי הוא **36px** (ראה החשבון בסעיף 3).

### שאר האימותים

**משקל כפתורים שווה:** רוחב שני ה-`.se-consent__btn` זהה, ו-diff של `getComputedStyle`
על `background-color`/`color`/`border`/`font-weight`/`font-size`/`border-radius` ריק.

reduced-motion דרך DevTools Rendering · iOS emulation — באנר ההתקנה לא מופיע כל עוד
ההסכמה תלויה · Tab לשני הכפתורים עם focus ring נראה.

**אחרי deploy:** GA4 Realtime מראה את הסשן המאושר שלך תוך ~30ש' — ו**לא** מראה hit
סינתטי ב-`:20`/`:50` הבא. זו ההוכחה שה-route-abort עובד.

---

## סיכונים שנותרים (מודעים, לא חסומים)

1. **ה-pageview הראשון של משתמש מאשר הוא חסר-עוגייה.** האישור מגיע אחרי ה-`g/collect`
   הראשון ו-GA4 לא שולח מחדש. landing → הרשמה — בדיוק הקפיצה שמעניינת — ממודלת ולא
   מיוחסת בעמוד הראשון. **מקבלים.** לא "לתקן" עם `page_view` ידני — יגרום ספירה כפולה.
2. **`OnboardingTour` (`fixed inset-0 z-[120]`) מכסה את הבאנר** בדיוק למשתמש הראשוני.
   הבאנר נשאר שם אחרי הסיור. **לא להעלות z-index מעל 120.**
3. **סרגל ה-undo-import** (`SwingEdge_App.jsx:6644`, `bottom-4 z-[90]`) — חפיפה תיאורטית.
   דורש ייבוא יומן, רחוק מאוד מרגע ההסכמה. לא שווה נגיעה ב-`SwingEdge_App.jsx`.
4. **CSP עתידי** ישבור את שני ה-inline scripts ב-head. יידרשו nonce/hash + `script-src`
   ל-googletagmanager + `connect-src` ל-`*.google-analytics.com`.

---

## סדר ביצוע

**קומיט 1 — הפיצ'ר (סעיפים 1–7):**
1. `index.html` — בלוק GA
2. `src/lib/consent.js`
3. `src/components/ConsentBanner.css`
4. `src/components/ConsentBanner.jsx`
5. `src/main.jsx` — 2 שורות
6. `src/components/IOSInstallBanner.jsx`
7. `src/components/LegalPages.jsx`

**קומיט 2 — הגנות הטסטים (סעיפים 8–10)**, אם המשימה מתקרבת ל-timeout.
**נקודת הפיצול היחידה היא אחרי סעיף 7. אין פיצול באמצע.**

**בשני המקרים:** `docs/STATE.md` + `docs/DECISIONS.md` באותו קומיט (§10) ·
`npm run verify` פלט מלא · שער האימות המקומי · `git add` מפורש ·
`feat(analytics): GA4 with consent mode v2` · `git push origin main`.
