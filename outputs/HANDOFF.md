# SwingEdge — Session Handoff
> Generated: 2026-06-22 | Last commit: `2655f11` (feat(ocr): serverless Claude Vision endpoint)

---

## A. מי אני ומה הפרויקט

**SwingEdge** — יומן מסחר SaaS, React + Vite + Tailwind + Supabase, בילינגואלי (עברית ראשי).
Live: `swing-edge.vercel.app` | Repo: `niveven183/Swing-edge` (branch `main`).
החזון: מאמן AI אישי לסוחר — מנתח כניסות, עוקב אחר הרגלים, מזהה edge.

---

## B. שיטת העבודה (קריטי — שמרה אותנו נקיים)

| שחקן | תפקיד |
|------|--------|
| **Claude chat** | אסטרטגיה + כותב פרומפטים + מאמת deploy חי דרך מחבר Vercel |
| **Claude Code** | מבצע קוד + git + push |
| **Niv** | מריץ פרומפטים במצב Plan, מאשר, בודק UI חי |

**זרימת עבודה:**
```
chat שולח פרומפט
  → Niv מריץ ב-Plan Mode
  → Code מחזיר Plan
  → Niv שולח ל-chat
  → chat נותן דגשים + מאשר
  → Niv שולח ל-Code → רץ
  → chat מאמת חי
```

**כללי ברזל:**
- **משימה אחת לפרומפט.** גדולות מפוצלות (3 → 3a/3b/3c).
- **אימות deploy: מחבר Vercel, לא curl.** curl נתקל ב-anti-bot. hash מקומי ≠ חי (Vercel בונה עצמאית).
- כל פרומפט: header + "קרא, אל תשנה" + diagnosis → Plan → execute + git block.
- `index.css` ממפה Tailwind text utils ל-CSS vars → מסכי dark צריכים inline colors.

---

## C. מה הושלם (כל שלב — אומת מול git log)

| שלב | commit | מה | אומת חי |
|-----|--------|----|----------|
| **1** | `034beff` | `validateTradeInputs` (src/utils.js) — קלט לא תקין → "—" + אדום | ✅ |
| **1.5** | `18d1bed` | כרטיסי פוזיציה — posSize=0 → single-share baseline | ✅ |
| **2** | `160098a` | איחוד מנוע: `coachTrade`, adapter `coachingToAnalyzerView`, נקודת כניסה `analyzeStandalone` | ✅ |
| **3a** | `611bef0` | מחיר חי ב-Analyzer — reuse `fetchQuote` (`src/priceService.js:258`) | ✅ |
| **3b** | `0ada3d5` | חלון עשיר ב-Analyzer (Trade Context) — מדליק checks רדומים | ✅ |
| **3c** | `6006220` | כפתור איפוס מחשבון (X לתמונה כבר היה קיים) | ✅ |
| **4** | `37e0e51` | שדרוג מאמן: dedup רגש, תיעדוף insights, רמז R/R דו-לשוני | ✅ |
| **5a** | `2655f11` | `api/ocr.js` — serverless Claude Vision (sonnet-4-6), no-guess 3 שכבות, מפתח server-side בלבד | ✅ build |
| + | `2940a67` | דף נחיתה | ✅ |
| + | `b99230a` | מסך כניסה | ✅ |
| + | `20ae7f0` | לוגו ירוק | ✅ |

---

## D. תקלות / ממצאים פתוחים (אומתו מול קוד)

### 🔴 ANTHROPIC_API_KEY חסר ב-Vercel
- **מצב:** המפתח **לא** בקובץ `.env` המקומי ולא בהגדרות Vercel (נבדק ישירות).
- **תוצאה:** `api/ocr` מחזיר `500 config_error` לכל בקשה.
- **פעולה נדרשת:** Niv חייב להוסיף `ANTHROPIC_API_KEY` ב-Vercel → Settings → Environment Variables → Production + Preview + Development.
- **חשוב:** אל תתחיל 5c לפני שהמפתח מוגדר — הוספה שלו היא תנאי מקדים.

### 🟡 inferSide מסווה קלט הפוך
- **מיקום:** `SwingEdge_App.jsx:2095` (בתוך `analyzeTradeStandalone`).
- לא נשבר אבל: אם משתמש ממלא LONG אבל stop > entry, `inferSide` מחשב SHORT בשקט. לזכור באיחודים עתידיים.

### 🟡 ChartVisionEngine.js (Tesseract) עדיין בקוד
- **מיקום:** `src/vision/ChartVisionEngine.js` — ממשיך להיות בשימוש ב-"Log New Trade" image upload (`SwingEdge_App.jsx:2036`).
- ב-5c מחברים `api/ocr` ל-Analyzer בלבד. Tesseract ב-Log New Trade יוסר/יוחלף ב-5d.

### 🟡 chunk size אזהרה
- Bundle ~1.6MB (> 500kB). אזהרת build. לא קריטי לפונקציונליות.

---

## E. ארכיטקטורה — עובדות קנוניות

```
SwingEdge_App.jsx (5527 שורות)
├── SwingEdgeAI.js                            ← נקודת כניסה למנוע
│   └── src/intelligence/core/DecisionCoach.js
│       ├── ideaFromForm(form)                 ← :15
│       ├── coachTrade({...})                  ← מנוע ראשי
│       ├── coachingToAnalyzerView(coaching)   ← adapter ל-Analyzer
│       └── checks:
│           ├── emotionalCheck()               ← :214
│           ├── setupMarketComboCheck()        ← :192
│           ├── patternMatchCheck()            ← :169
│           ├── entryQualityCheck()            ← :247
│           └── regimeCheck()                  ← :301
├── src/utils.js
│   ├── calcTradeMetrics, fmt$, fmtR, qstars
│   ├── priceBasedRR, inferSide
│   └── validateTradeInputs
├── src/priceService.js
│   └── fetchQuote()                           ← :258
├── api/ocr.js                                 ← OCR serverless (Vision)
│   └── POST /api/ocr { image, side }
│       → { ticker, entry, stop, target, side, confidence }
└── src/vision/ChartVisionEngine.js            ← Tesseract (Log New Trade בלבד)
```

**state חשוב ב-SwingEdge_App.jsx:**
- `analyzerForm` state: `line 1095` — `{ ticker, entry, stop, target, shares, setup, notes, marketCondition, emotionAtEntry, entryQuality }`
- `azEntry/azStop/azTarget`: lines 1722–1724 (`parseFloat(analyzerForm.*)`)
- `handleAnalyzerImageUpload`: line 2066 — **כרגע דקורטיבי** (מגדיר preview בלבד)
- `analyzeTradeStandalone`: line 2085 — קורא ל-`SwingEdgeAI.analyzeStandalone`
- Default account: `$2,500` (`line 1016`, localStorage key `swingEdgeCapital`)
- Default risk: `1%` (`src/utils.js:2`, CAPITAL const = 25000 — אבל account בפועל מ-localStorage)
- localStorage key לעסקאות: `swingEdgeTrades`

---

## F. המשימה הבאה + Roadmap

```
✅ 5a — api/ocr.js serverless (Vision, standalone, no quota)
⬜ 5b — מכסה OCR: 5 חינם / 20 Pro, חיווי "X uses left"
         Supabase table ocr_usage + isPro ב-user_metadata
⬜ 5c — חיבור api/ocr ל-handleAnalyzerImageUpload (היום דקורטיבי)
         + בורר LONG/SHORT לפני העלאה
         + הזרמת JSON → analyzerForm (entry/stop/target/ticker)
         + תצוגת confidence
         ⚠️ דורש ANTHROPIC_API_KEY ב-Vercel קודם!
⬜ 5d — אותו חיבור ב-Log New Trade (מחליף ChartVisionEngine/Tesseract)
⬜ Stripe — חסום (Privacy + ToS + עו"ד)
⬜ GA4 — backlog
⬜ <head> meta — עדכון
```

---

## G. כלכלת OCR (אושר)

Vision Sonnet: ~$0.004–$0.15 לקריאה (תלוי גודל תמונה).
מכסה 5/20 — זניחה כלכלית. Pro $19/חודש → עלות OCR גרושים.
