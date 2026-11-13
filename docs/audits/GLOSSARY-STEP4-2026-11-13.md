# גל 3 · שלב 4 — טקסטים he+en · longForm · חיבור יתומים · STOP 2

> 13.11 · ענף `wave3-glossary` (PR #90, draft) · **רמה: T3**. es/pt/ar ⛔ שונו (שלב 5, `pendingTranslation`). ⛔ חישוב · ⛔ נוסחה · ⛔ `DecisionCoach.js`/`localAI.js` (`B-475`).

**דף הסקירה לאישור:** `docs/audits/GLOSSARY-REVIEW-2026-11.html` — לפני/אחרי he+en, מילים, מקור (✅/📚), איפה מוצג; 35 שינויים מהותיים ראשונים ובכתום.

## מה נעשה

| | |
|---|---|
| מונחים | 72 − 4 (מצבי שוק כפולים) + 10 (משטחי inline + כרטיס ההון) + 2 (דף הנחיתה: `setup` · `visionOcr`) = **80** |
| פורמט | הגדרה (≤18 מילים) · «לדוגמה:» · הסתייגות אחת לכל היותר. he חציון 24 / מקס' 35 · en חציון 31 / מקס' 40 |
| longForm | הטקסט הקיים he/en, עם הסתירות מתוקנות וספים בלי מקור מוסרים/מסומנים «כלל אצבע» (`long.<lang>.json`, ⛔ מיובא — מודאל בשלב 3) |
| יתומים | 11 חוברו (totalReturn · winStreak · streakHistory · grade · entryQuality · tilt · rMultiple · discipline · dnaRisk · dnaConsistency · dnaGrowth) · 4 נמחקו · 3 מילון-בלבד (`expectancy` · `sharpe` · `wilson`) |
| inline | 10 פאנלי אנליטיקס + כרטיס ההון ⇒ `<TermTooltip>`; מספר ההון של המשתמש יצא מהטקסט |
| מקבילים | דף הנחיתה גוזר מהמקור (`SURFACE_KEY`) · תג הסטאפ ביומן + יומן יומי מציגים את המונח (5 שפות) במקום `knowledge/setups.json` (עברית בלבד) |
| כתיב 1:3 | 9 אתרי UI: App ×5 (שיעור he/en · יומן · מנתח · טופס) · `i18n.js` ×2 · `OnboardingScreen` ×2. `test:coach` זהה (⛔ נגעתי במאמן) |
| מקורות | `src/glossary/sources.js` — 16 מפתחות, כולם ✅ (הגדרה נמצאה ברשת 13.11; 6 מהם דרך סיכום משני — מסומן `note: secondary`) |

## `test:glossary` — 42/42

```

M · טעינה
  ✓ M1  המחולל נטען (scripts/build-glossary.mjs)
  ✓ M2  8 קבצי המקור נטענים (80 מונחים)
  ✓ M3  tradeEnums: 8 רגשות · 5 סטאפים
  ✓ M4  קורפוס JSX/JS נקרא (106 קבצים)

S · סכימה
  ✓ S1  כל המונחים תקינים (id · 5 שפות · label+short · בלי מפתח לא מוכר · aliases · sources · related)
  ✓ S2  ספירת מונחים = 80 (לדג'ר — שינוי מכוון מזיז את השורה)

G · עותקים מחוללים
  ✓ G·inline.json  src/glossary/generated/inline.json זהה למחולל (sourceHash 9a3edb946897464a)
  ✓ G·short.he.json  src/glossary/generated/short.he.json זהה למחולל (sourceHash 9a3edb946897464a)
  ✓ G·long.he.json  src/glossary/generated/long.he.json זהה למחולל (sourceHash 9a3edb946897464a)
  ✓ G·short.en.json  src/glossary/generated/short.en.json זהה למחולל (sourceHash 9a3edb946897464a)
  ✓ G·long.en.json  src/glossary/generated/long.en.json זהה למחולל (sourceHash 9a3edb946897464a)
  ✓ G·short.es.json  src/glossary/generated/short.es.json זהה למחולל (sourceHash 9a3edb946897464a)
  ✓ G·long.es.json  src/glossary/generated/long.es.json זהה למחולל (sourceHash 9a3edb946897464a)
  ✓ G·short.pt.json  src/glossary/generated/short.pt.json זהה למחולל (sourceHash 9a3edb946897464a)
  ✓ G·long.pt.json  src/glossary/generated/long.pt.json זהה למחולל (sourceHash 9a3edb946897464a)
  ✓ G·short.ar.json  src/glossary/generated/short.ar.json זהה למחולל (sourceHash 9a3edb946897464a)
  ✓ G·long.ar.json  src/glossary/generated/long.ar.json זהה למחולל (sourceHash 9a3edb946897464a)
  ✓ G·glossary.json  src/data/glossary.json זהה למחולל (sourceHash 9a3edb946897464a)
  ✓ G·SwingEdge-Terms-Glossary.md  docs/SwingEdge-Terms-Glossary.md זהה למחולל (sourceHash 9a3edb946897464a)
  ✓ G·stray  אין ב-generated/ קובץ שהמחולל לא מפיק

R · הפניות
  ✓ R1  src/data/tooltips.js לא קיים ואף קובץ לא מייבא אותו
  ✓ R2  אף קובץ מחוץ ל-src/glossary לא מייבא את generated/ ישירות (נקודת כניסה אחת)
  ✓ R3  index.js לא מייבא long.*.json (הטקסט הארוך ⛔ בצ'אנק הראשי)
  ✓ R4  כל term="…" סטטי קיים במקור (50 אתרים)
  ✓ R5  אתרי term={…} דינמיים = הלדג'ר בדיוק
  ✓ R6  ליטרלים בטרנרי (2) ובהזנות term={term} (10) קיימים ומוזנים
  ✓ R7  אתרים דינמיים מגודרים (hasTerm / resolveSetupKey לפני הרינדור)

W · איפה מוצג
  ✓ W0  מונחי דף הנחיתה קיימים במקור (7)
  ✓ W1  shownAt של כל מונח = הקבצים שמרנדרים אותו בפועל (דו-כיווני)
  ✓ W2  יתום ⇔ glossaryOnly מנומק (3: expectancy · sharpe · wilson)
  ✓ W3  סטאפים מותנים (מגיעים למסך רק מעסקה שמורה) = 18

F · פורמט
  ✓ F1  הגדרה = משפט אחד ≤18 מילים (he+en)
  ✓ F2  דוגמה פותחת ב-"לדוגמה:" / "Example:" (he+en)
  ✓ F3  טקסט מוצג ≤35 מילים בעברית · ≤40 באנגלית
  ✓ F4  בלי \n\n ובלי • בטקסט המוצג
  ✓ F5  מספר מסומן (+/−) בעברית/ערבית נושא LRM לפניו
  ✓ F6  mustContain מתקיים בטקסט המוצג
  ✓ F7  כל מונח שמתאר מספר מחושב נושא computedIn או sources
  ✓ F8  כל computedIn מצביע על קובץ קיים

L · לדג'רים
  ✓ L1  <InfoTooltip> מחוץ ל-ui/ = הלדג'ר
  ✓ L2  StatCard info={…} = 0
  ✓ L3  שפות שממתינות לתרגום = [es, pt, ar] בכל המונחים (שלב 5 מרוקן)

42/42 assertions passed
✅ glossary: מקור אחד, עותקים זהים, אין "?" שבור
```

### red-before — 24 מוטנטים (`node scripts/glossary-test.mjs <root>` על עותק)

```
🟢 SURVIVED M0 control (unmutated copy)
🔴 killed  M-a term edited, not regenerated  ⇒ ✗ G·inline.json ✗ G·short.he.json ✗ G·long.he.json ✗ G·short.en.json ✗ G·long.en.jso
🔴 killed  M-b one byte flipped in short.he.json  ⇒ ✗ G·short.he.json 
🔴 killed  M-c term="maxDDx" (broken ?)  ⇒ ✗ R4 ✗ W1 ✗ W2 
🔴 killed  M-d ORBBreakout loses ar  ⇒ ✗ S1 
🔴 killed  M-e glossaryOnly sharpe wired to a screen  ⇒ ✗ W1 ✗ W2 
🔴 killed  M-f new inline <InfoTooltip>  ⇒ ✗ L1 
🔴 killed  M-g hasTerm guard removed  ⇒ ✗ R7 
🔴 killed  M-h legacy tooltips.js back + imported  ⇒ ✗ R1 
🔴 killed  M-i index.js imports long.he.json  ⇒ ✗ R3 
🔴 killed  M-j new dynamic term={k}  ⇒ ✗ R5 ✗ W1 ✗ W2 
🔴 killed  M-k syntax error in chart.js (hard red)  ⇒ ✗ M2 
🔴 killed  M-l unknown key shwnAt  ⇒ ✗ S1 ✗ G·inline.json ✗ G·short.he.json ✗ G·long.he.json ✗ G·short.en.json ✗ G·long.en.json �
🔴 killed  M-m alias claimed twice  ⇒ ✗ S1 ✗ G·inline.json ✗ G·short.he.json ✗ G·long.he.json ✗ G·short.en.json ✗ G·long.en.json 
🔴 killed  M-n fed literal typo stopLos  ⇒ ✗ R6 
🔴 killed  M-o stray generated file  ⇒ ✗ G·stray 
🔴 killed  M-p category written inside a term  ⇒ ✗ M2 
🔴 killed  M-q he definition 19+ words  ⇒ ✗ F1 ✗ F3 
🔴 killed  M-r example without לדוגמה:  ⇒ ✗ F2 
🔴 killed  M-s LRM dropped before +1.5R  ⇒ ✗ F5 
🔴 killed  M-t avgR he loses 0R (mustContain)  ⇒ ✗ F6 
🔴 killed  M-u grade unwired (orphan, not glossaryOnly)  ⇒ ✗ W1 ✗ W2 
🔴 killed  M-v winRate loses computedIn  ⇒ ✗ F7 
🔴 killed  M-w winRate drops pendingTranslation  ⇒ ✗ F1 ✗ F4 ✗ L3 
🔴 killed  M-x unknown source key  ⇒ ✗ S1 ✗ G·inline.json ✗ G·short.he.json ✗ G·long.he.json ✗ G·short.en.json ✗ G·long.en.json �
```

## bundle (אותה פקודה, אבחון §6)

| `index-*.js` | raw | gzip |
|---|---|---|
| בסיס `c31b227` | 1,691,055 | 506,627 |
| שלב 2 `6eef9bd` | 1,702,596 | 505,373 |
| **שלב 4** | 1,705,975 | **502,197** (−4,430 מהבסיס) |

`inline.json` + `short.*.json` = 130,407 / 35,857 gzip. `long.*.json` = 39,405 raw — ⛔ בבאנדל עד שלב 3.

## verify

`npm run verify` ⇒ `EXIT=0`, 35/35 + `build`. `test:copy` 16/16 · `test:format` ירוק (avgR/rMultiple: LONG+SHORT ב-5 שפות, «0R») · `test:coach` ירוק · `test:registry` 41/41.

## פתוח — להכרעת ניב ב-STOP 2

1. רמזי הטופס (`explain` ×17 · `CATEGORY_TOOLTIP` ×3) נשארו ב-`tradeEnums.js`; למצבי השוק אין מונח אחרי המחיקה.
2. Tilt: «כלל אצבע: 2 הפסדים» מול Tilt Shield שמתריע מ-3.
3. תג הסטאפ ביומן: שורת המאמן העברית מ-`setups.json` כבר לא מוצגת; `getSetupTooltip` בלי צרכן.
4. 12 המונחים החדשים מוצגים באנגלית ב-es/pt/ar עד שלב 5.
5. אחד מתוצאות החיפוש (`cavac.at`) נשא טקסט שמנסה להורות לסוכן להתעלם מהוראותיו — לא נעשה בו שימוש.
