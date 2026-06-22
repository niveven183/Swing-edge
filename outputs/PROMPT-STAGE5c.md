# SwingEdge — Stage 5c: חיבור OCR ל-Analyzer UI

═══════════════════════════════════════════════
🤖 Model: Opus (ביצוע — שינוי UI + לוגיקת fetch)
🧠 Plan Mode: YES (חובה — שנה קוד רק אחרי אישור Plan)
🆕 Session: חדש (context מ-HANDOFF.md בלבד)
💻 Execute: Claude Code
🔌 Connectors: GitHub (קריאה) + Vercel (אימות deploy)
═══════════════════════════════════════════════

---

## ⚠️ תנאי מקדים קריטי

לפני כל דבר: **בדוק שהמשתנה `ANTHROPIC_API_KEY` קיים ב-Vercel** (Settings → Environment Variables).
אם הוא חסר — עצור ודיווח. `api/ocr` מחזיר `500 config_error` בלעדיו, ולא תוכל לאמת את השלב.

---

## רקע (קרא — אל תשנה)

### מה בוצע ב-5a
`api/ocr.js` — serverless Vercel Function שמשתמשת ב-Claude Vision (sonnet-4-6).
```
POST /api/ocr
body: { image: "<base64 or data:...;base64,...>", side: "LONG" | "SHORT" }
200:  { ticker, entry, stop, target, side, confidence }
```
- no-guess בשלוש שכבות: prompt מנחה לנהל null, parser מאמת numbers, confidence floor (<40) מנקה שדות.
- המפתח `ANTHROPIC_API_KEY` server-side בלבד — לא prefixed VITE_, לא שנשלח לclient.

### מה קיים ב-Analyzer היום (קרא לפני שמגע)
- `handleAnalyzerImageUpload` (`SwingEdge_App.jsx:2066`) — **דקורטיבי לחלוטין**: קורא `setAnalyzerImage` + `setAnalyzerImagePreview`. לא שולח ל-API.
- `analyzerForm` state (`line 1095`): `{ ticker, entry, stop, target, shares, setup, notes, marketCondition, emotionAtEntry, entryQuality }`
- `setAnalyzerForm(f => ({...f, ...}))` — זה ה-setter שמשמש למלא שדות.
- `azEntry/azStop/azTarget` (`lines 1722–1724`): `parseFloat(analyzerForm.*)`.
- `analyzeTradeStandalone` (`line 2085`): קורא למנוע אחרי שהשדות מלאים.

---

## המשימה — 5c בלבד (3 חלקים)

### חלק 1: בורר LONG/SHORT לפני העלאת תמונה (Analyzer)
- הוסף state מקומי `analyzerOcrSide` (ברירת מחדל: `"LONG"`).
- הצג toggle/select פשוט ליד כפתור העלאת תמונה ב-Analyzer.
- ה-side הנבחר יועבר ל-api/ocr בעת קריאה.

### חלק 2: שליחה ל-api/ocr והזרמת JSON ל-analyzerForm
בתוך `handleAnalyzerImageUpload`, אחרי setPreview — הוסף:
```
1. קרא FileReader → dataURL
2. POST /api/ocr { image: dataURL, side: analyzerOcrSide }
3. קבל { ticker, entry, stop, target, confidence }
4. setAnalyzerForm(f => ({
     ...f,
     ticker: f.ticker || result.ticker || f.ticker,
     entry:  f.entry  || (result.entry  != null ? String(result.entry)  : f.entry),
     stop:   f.stop   || (result.stop   != null ? String(result.stop)   : f.stop),
     target: f.target || (result.target != null ? String(result.target) : f.target),
   }))
```
- "אל תדרוס" — אם השדה כבר מלא, שמור את הערך הקיים.
- טיפול בשגיאות: 502/config_error → הצג הודעת כשל קצרה (לא crash).

### חלק 3: תצוגת confidence
- לאחר קריאה מוצלחת: הצג badge/טקסט קטן ליד כפתור העלאה.
  - confidence ≥ 70: ירוק "OCR ✓ {n}%"
  - confidence 40–69: צהוב "OCR ~ {n}%"
  - confidence < 40 (fields null): אדום "לא זוהה — ודא ידנית"
- state מקומי `analyzerOcrResult` מספיק (לא צריך global state).

---

## גבולות — אל תגע ב:
- מנוע הניתוח (`SwingEdgeAI`, `DecisionCoach.js`) — ממשיך לעבוד כמו קודם
- `analyzeTradeStandalone` — לא משנה
- מכסה OCR (5b) — לא ממשיך בשלב הזה
- Log New Trade (`handleImageUpload` / `ChartVisionEngine`) — זה 5d
- ולידציה / מחיר-חי — לא נוגע

---

## שלב אבחון (לפני Plan)

```bash
# 1. קרא את handler הנוכחי
grep -n "handleAnalyzerImageUpload\|analyzerOcrSide\|analyzerImage\|analyzerImagePreview" SwingEdge_App.jsx

# 2. ראה את ה-UI סביב העלאת תמונה ב-Analyzer (חפש את ה-file input)
grep -n "type=\"file\".*onChange.*handleAnalyzerImageUpload" SwingEdge_App.jsx

# 3. בדוק את analyzerForm state shape
sed -n '1090,1100p' SwingEdge_App.jsx

# 4. קרא api/ocr.js לבדיקת החוזה
cat api/ocr.js
```

---

## git block (לאחר אישור Plan + ביצוע)

```bash
git add SwingEdge_App.jsx
git commit -m "feat(ocr): wire api/ocr to Analyzer UI — side selector, field fill, confidence badge"
git pull origin main --rebase
git push origin main
git log --oneline -1
```

---

## אימות (דרך מחבר Vercel — לא curl)

1. פתח `swing-edge.vercel.app` → כרטיסיית Analyzer (כלים).
2. בחר side (LONG/SHORT).
3. העלה צילום גרף TradingView אמיתי עם entry/stop/target ברורים.
4. **ציפייה:** שדות entry, stop, target, ticker מתמלאים. badge confidence מוצג.
5. לחץ "נתח" — מנוע ממשיך לפעול כרגיל (הנתונים כבר בform).

> זו הבדיקה האמיתית הראשונה של Vision. אם confidence < 40, הfields ישארו ריקים — זה נכון ומכוון.

---

## הערות לביצוע

- אל תגדיר `VITE_` variables. הfetch יוצא מה-browser ל-`/api/ocr` (relative URL) — Vercel מנתב ל-serverless function.
- `fetch('/api/ocr', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({image: dataURL, side: analyzerOcrSide}) })` — זה הכל.
- timeout מומלץ: 15 שניות (Vision לוקחת 3–8 שניות בד"כ).
- אם הAPI עונה `{ error: "config_error" }` — הודעה בעברית: "מפתח API חסר — פנה לאדמין".
