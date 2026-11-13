# GLOSSARY-DIAGNOSIS-2026-11-13 — גל 3, הסברי המונחים (סימני ?)

**שלב 1 של §8.1 — אבחון read-only.** ⛔ אפס תיקון. נמדד על `main` = `71d5653` (עץ נקי, 13.11), אחרי שהמחקר המקורי נעשה על `41b758b` (43 קומיטים אחורה). קבצי המחקר המקוריים (`TOOLTIPS-DRAFTS-2026-10-28.md` · `TOOLTIPS-RESEARCH-2026-10-28.md`) **לא הגיעו לריפו** — ניב 13.11: «כל מה שצריך מהם כתוב בפרומפט». כל מספר כאן נמדד מחדש; הפקודה שמדדה מופיעה מתחת לכל טבלה.

**סיווג:** `T3` · תשובות `לא / כן / לא / כן / כן` (אמון — טקסט שמתאר חישוב · רוחב — 60 אתרי שימוש · ודאות — המחקר בן 16 יום).
**תוכנית:** `docs/plans/PLAN-2026-11-13-glossary-tooltips.md` (`da76567`).

---

## 1. מה זז מאז `41b758b`

| קובץ | שינוי |
|---|---|
| `src/data/tooltips.js` · `src/data/glossary.json` · `InfoTooltip.jsx` · `TermTooltip.jsx` · `build-glossary.mjs` · `extract-tooltips.mjs` · `copy-contract-test.mjs` · `docs/SwingEdge-Terms-Glossary.md` | **0** — לא השתנו |
| `SwingEdge_App.jsx` | `+45 / −47` שורות ⇒ כל מספר שורה מהמחקר הוא השערה; מספרי השורות כאן נמדדו על `71d5653` |

```bash
git diff --stat 41b758b..HEAD -- src/data/tooltips.js src/data/glossary.json src/components/ui/InfoTooltip.jsx src/components/ui/TermTooltip.jsx scripts/build-glossary.mjs scripts/extract-tooltips.mjs scripts/copy-contract-test.mjs docs/SwingEdge-Terms-Glossary.md
git diff --shortstat 41b758b..HEAD -- SwingEdge_App.jsx
```

## 2. מלאי

| מה | נמדד |
|---|---|
| מונחים ב-`TRADING_TOOLTIPS` | **72/72**, כל אחד בצורה `{ar,en,es,he,pt}` |
| `TERM_LABELS` | 72/72, אין תווית בלי טולטיפ ואין טולטיפ בלי תווית |
| he מעל 35 מילים | **18/72** · חציון 24 · מקס' 115 |
| en מעל 40 מילים | **16/72** · חציון 29 · מקס' 121 |
| es / pt / ar | חציון 32 / 32 / 24 · מקס' 148 / 144 / 117 |
| עם תבליטים או פסקאות (`\n\n` או `•`, he או en) | **19/72** |
| אתרי `<TermTooltip>` | **38** ב-5 קבצים (`SwingEdge_App.jsx` · `IntelligenceUI.jsx` · `MonthlyReportTab.jsx` · `EditTradeModal.jsx` · `TermTooltip.jsx` — הערת שימוש) |
| אתרי `<InfoTooltip>` ישירים | **22** ב-4 קבצים |
| מונח שמופנה ואינו קיים (`TermTooltip` מחזיר `children ?? null` בשקט) | **0** היום — אין שער שמונע |

```js
// inv.mjs — node inv.mjs "$PWD"
import { pathToFileURL } from "node:url"; import path from "node:path";
const root = process.argv[2];
const { TRADING_TOOLTIPS: T } = await import(pathToFileURL(path.join(root, "src/data/tooltips.js")).href);
const keys = Object.keys(T); const wc = (s) => s.trim().split(/\s+/).filter(Boolean).length;
for (const l of ["he","en","es","pt","ar"]) {
  const w = keys.map((k) => wc(T[k][l])).sort((a,b)=>a-b); const cap = { he: 35, en: 40 }[l];
  console.log(l, "median", w[w.length >> 1], "max", w.at(-1), cap ? `over ${cap}: ${w.filter((x)=>x>cap).length}/72` : "");
}
console.log("bullets/paragraphs:", keys.filter((k) => /\n\n|•/.test(T[k].en) || /\n\n|•/.test(T[k].he)).length);
```

### 2.1 איפה כל מונח מוצג — 54 נגישים, 18 יתומים

| נגישות | מונחים |
|---|---|
| **ישיר (36)** | `winRate` (App 4875·5512·6610 + `MonthlyReportTab` 179) · `profitFactor` 5524 · `avgR` 4876·6611 · `maxDD` 5540 · `avgHold` 5544 · `equityCurve` 6583 · `dna` (`IntelligenceUI` 73) · `edge`/`antiEdge` (4961·4978·6825·6842 + `IntelligenceUI` 173) · `marketRegime` (`EditTradeModal` 256 + `IntelligenceUI` 496) · `riskPerTrade` 6429 · `riskLimits` 5292·7926 · `positionSize` 6366 · `stopLoss`/`takeProfit` (App 6028 + `EditTradeModal` 210–211, דרך משתנה `term`) · `chartCalcPosition` 7236 · `chartAddToJournal` 7252 · `rr` 6041·8475 · `mfeMae` (`EditTradeModal` 346·357) · `avgWin` 5516 · `avgLoss` 5520 · 8 × `emotion*` (טבלת הרגשות, `emotion${value}`) · `breakout`·`pullback`·`supportBounce`·`resistanceBreak` (מטריצת הסטאפים, `resolveSetupKey` על ערך מהבורר) · `rrBucket3plus` (`IntelligenceUI` 148) · `dayOfWeek` 6677 · `performanceBySetup` 6646 |
| **מותנה (18)** | `pullback20EMA` `bullFlag` `ORBBreakout` `VWAPReclaim` `higherLow` `cupAndHandle` `failedBreakout` `overextendedFade` `EMABounce50` `trendContinuation` `gapAndGo` `earningsGapPlay` `rangeBreakout` `postEarningsStrength` `powerHourBreak` `MOCFade` `overnightHold` `overnightReversal` — מגיעים למסך **רק** אם עסקה שמורה נושאת את שם הסטאפ: הבורר מציע 5 ערכים (`SETUP_VALUES`), 4 מהם עם טולטיפ ו-`Other` בלי. 22 יעדי alias − 4 = 18 |
| **יתום (18)** | `expectancy` `sharpe` `tilt` `rMultiple` `wilson` `discipline` `marketTrendingUp` `marketTrendingDown` `marketSideways` `marketVolatile` `dnaRisk` `dnaConsistency` `dnaGrowth` `totalReturn` `winStreak` `streakHistory` `grade` `entryQuality` |

```js
// reach.mjs — node reach.mjs "$PWD"   (מנוסח מחדש לקריאות; אותה לוגיקה שהריצה את המספרים)
import fs from "node:fs"; import path from "node:path"; import { pathToFileURL } from "node:url";
const root = process.argv[2]; const imp = (p) => import(pathToFileURL(path.join(root, p)).href);
const { TRADING_TOOLTIPS: T, resolveSetupKey } = await imp("src/data/tooltips.js");
const E = await imp("src/data/tradeEnums.js"); const keys = Object.keys(T); const hit = new Set();
const files = ["SwingEdge_App.jsx"]; const walk = (d) => { for (const e of fs.readdirSync(path.join(root, d), { withFileTypes: true })) { const p = path.join(d, e.name); e.isDirectory() ? walk(p) : /\.jsx?$/.test(e.name) && files.push(p); } }; walk("src");
for (const f of files) { if (/TermTooltip\.jsx$|data\/tooltips\.js$/.test(f)) continue; const s = fs.readFileSync(path.join(root, f), "utf8");
  for (const m of s.matchAll(/<TermTooltip term="(\w+)"/g)) hit.add(m[1]);
  for (const m of s.matchAll(/<TermTooltip term=\{good \? "(\w+)" : "(\w+)"\}/g)) { hit.add(m[1]); hit.add(m[2]); }
  for (const k of keys) if (new RegExp(`, "${k}"\\]|, "${k}"\\)`).test(s)) hit.add(k);   // [label, key, cls, term] / sCard(..., term)
  for (const m of s.matchAll(/TRADING_TOOLTIPS\.(\w+)/g)) hit.add(m[1]); }
for (const v of E.EMOTION_VALUES) hit.add(`emotion${v}`);
for (const v of E.SETUP_VALUES) { const k = resolveSetupKey(v); if (k) hit.add(k); }
const alias = [...new Set([...fs.readFileSync(path.join(root, "src/data/tooltips.js"), "utf8").matchAll(/^\s+'[a-z0-9 ]+':\s+'(\w+)',/gm)].map((m) => m[1]))];
const conditional = alias.filter((k) => !hit.has(k));
console.log("direct", keys.filter((k) => hit.has(k)).length, "· conditional", conditional.length, "· orphans", keys.filter((k) => !hit.has(k) && !conditional.includes(k)).join(" "));
```

### 2.2 שמונת המקורות המקבילים

| # | מקור | נמדד | שפות |
|---|---|---|---|
| 1 | `src/data/tooltips.js` | 72 מונחים + `TERM_LABELS` + `SETUP_KEY_ALIASES` (23 שמות ⇒ 22 יעדים) + `resolveSetupKey` | 5 |
| 2 | `src/data/glossary.json` | 72/72 · **0 סחיפה** מול `tooltips.js` (label + description, 5 שפות) · אין צרכן runtime — רק `test:copy` #5 | 5 |
| 3 | `docs/SwingEdge-Terms-Glossary.md` | מצהיר «70 מונחים · commit fcd6260» · 70 כותרות `### \`key\`` ⇒ **נסחף ב-2** | 5 |
| 4 | `LandingPage.jsx` `TERMS` (`:273`) | **7**: `edge` `tilt` `setup` `rr` `winRate` `rMultiple` `visionOcr` · מוצג בהיילייטר של דף הנחיתה | he/en בלבד (14/14) |
| 5 | `tradeEnums.js` `explain` + `CATEGORY_TOOLTIP` (`:66`) | 17 `explain` + 3 קטגוריות · מוצג ב-SmartSelect | he/en בלבד — es/pt/ar רואים אנגלית |
| 6 | `knowledge/setups.json` דרך `getSetupTooltip` (`knowledgeGlue.js:107`) | 21 סטאפים · **21/21 ההגדרות בעברית בלבד**, 0 `definition_en` · מוצג ליד תג הסטאפ ביומן (`SetupTagTip` App:141, `DayTradesModal` 314) **בכל שפה** | he בלבד |
| 7 | `<InfoTooltip>` עם טקסט inline | **11 משטחים**: 10 פאנלים באנליטיקס (App 6712 Win Rate by Setup · 6775 Best Day · 6790 Best Setup · 6805 Best Emotion · 6949 R Distribution · 6975 P&L by Month · 7002 Emotion Performance · 7042 Streak History · 7073 Setup Matrix · 7134 Hold Time vs PnL) + כרטיס ההון (4871, דרך `StatCard info=`) · ועוד 6 אתרי תווית טופס (Setup Type / Market / Emotion ×2) שמציגים את `CATEGORY_TOOLTIP` | he/en בלבד |
| 8 | `HelpModal.jsx` | 43 שורות · 3 פסקאות דרך `t.*` · **אין הגדרות מונחים** ⇒ ⛔ מקור מקביל | 5 (דרך `i18n.js`) |

```bash
node -e 'const g=require("./src/data/glossary.json");import("./src/data/tooltips.js").then(m=>{let d=0;for(const k in m.TRADING_TOOLTIPS)for(const l of ["he","en","es","pt","ar"])if(g[k]?.description?.[l]!==m.TRADING_TOOLTIPS[k][l])d++;console.log(Object.keys(g).length,"drift",d)})'
grep -c '^### `' docs/SwingEdge-Terms-Glossary.md
node -e 'const k=require("./src/intelligence/knowledge/setups.json");const e=Object.entries(k).filter(([a])=>a!=="_meta");console.log(e.filter(([,v])=>/[֐-׿]/.test(v.definition||"")).length+"/"+e.length)'
grep -rn "<InfoTooltip" src SwingEdge_App.jsx | grep -v "src/components/ui/"
```

⚠️ **כרטיס ההון (App 4871) משרשר את בסיס ההון של המשתמש לתוך הטקסט** (`${dispSym}${Math.round(equityBase)…}`). בטקסט סטטי במקור אחד הוא ⛔ יכול להישאר — המספר כבר מוצג בשורת ה-`sub` של אותו כרטיס.

## 3. הנחות מהפרומפט — מאושש / הופרך

| # | הנחה | נמדד | |
|---|---|---|---|
| 1 | 72 מונחים | 72 | ✅ |
| 2 | 21 יתומים | **18** — ועוד 18 מותנים | ❌ |
| 3 | 8 מקורות מקבילים | 7 — `HelpModal` אינו מכיל מונחים | ⚠️ |
| 4 | `SwingEdge-Terms-Glossary.md` נסחף ל-70 | 70 | ✅ |
| 5 | ~11 משטחי InfoTooltip inline, he/en | 11 (10 פאנלים + כרטיס ההון), he/en | ✅ |
| 6 | `tooltips.js` = 36.6KB gzip בצ'אנק הראשי, 5 שפות | 36,626 B gzip · מחרוזות es/ar נמצאו ב-`index-*.js` | ✅ |
| 7 | יש «דף מילון» שאליו `longForm` עובר | **אין** משטח מילון באפליקציה ⇒ מודאל חדש (הכרעת ניב 13.11) | ❌ |
| 8 | `expectancy`/`sharpe` מוצגים | **לא מוצגים בשום מסך** — `TradeDNA.metrics` בלבד ⇒ מילון בלבד (הכרעת ניב) | ❌ |
| 9 | «כתיב 1:3 בכל המוצר» | 24 אתרים בכתיב X:1 מחוץ לטולטיפים; 15 במאמן/`localAI` ⇒ `B-475` | ⚠️ היקף |
| 10 | `winStreak` כולל רצף שלילי | הדשבורד מציג `Math.max(0, currentStreak)` (App 2961) — רצף הפסדים מוצג **0** | ⚠️ |
| 11 | `profitFactor` «לפני עמלות» | אין מודל עמלות בקוד (`grep commission\|fee` ⇒ 0 ב-`utils.js`·`tradingStats.js`·`tradeWrite.js`) | ✅ |
| 12 | `test:format` / `test:copy` קוראים את הטקסט | `format-test.mjs` §7 (`avgR`/`rMultiple`: LONG+SHORT ב-5 שפות · `avgR`: «0R») · `copy-contract-test.mjs` #1–#5 (`riskLimits`) | ✅ |

### 3.1 אתרי היחס בכתיב X:1 — 9 אתרי UI (אומתו שורה-שורה)

| אתר | מה מוצג |
|---|---|
| `SwingEdge_App.jsx:860` | שיעור המאמן (he): «…לפחות 2:1» |
| `SwingEdge_App.jsx:865` | אותו שיעור (en) |
| `SwingEdge_App.jsx:5393` | יחס בשורת היומן: `` `${t.rrRatio.toFixed(2)}:1` `` |
| `SwingEdge_App.jsx:6043` | יחס במנתח: `` `${azRRRatio.toFixed(2)}:1` `` |
| `SwingEdge_App.jsx:8476` | יחס בטופס העסקה: `` `${rrRatio.toFixed(2)}:1` `` |
| `src/i18n.js:554` | `rrExcellent` (en) «beats the 2:1 minimum» |
| `src/i18n.js:1266` | `rrExcellent` (he) |
| `OnboardingScreen.jsx:138` | «יחס של לפחות 2:1» |
| `OnboardingScreen.jsx:514` | ערך «2:1» תחת «Max R:R» |

**לא נספרו:** `OnboardingScreen.jsx:184` ו-`WelcomeAnnouncement.jsx:44` (הערות קוד — יחסי ניגודיות) · `i18n.js:556`/`1268` (`1:1`, סימטרי) · `LandingPage.jsx` 28·120·298·299 (כבר `1:2.4`) · `DecisionCoach.js` 8 + `localAI.js` 7 ⇒ `B-475`.
**בטולטיפים:** `chartCalcPosition` · `chartAddToJournal` (`2:1`, 5 שפות) · `rr` (`3:1`, 5 שפות).
⚠️ שלושת אתרי ה-`toFixed(2)}:1` הם **פורמט תצוגה של מספר**, ⛔ חישוב — היפוך ל-`1:${x}` אינו נוגע ב-`rrRatio`.

```bash
grep -rn "toFixed([0-9])}:1\|}:1\b\|[0-9]:1 R/R\|:1 R\b\|\b[23]:1\b" SwingEdge_App.jsx src --include='*.js' --include='*.jsx' | grep -v "data/tooltips.js\|glossary.json\|DecisionCoach.js\|localAI.js"
```

## 4. סתירות טקסט ⇄ קוד — 17, כולן אומתו

| מונח | הטקסט היום | הקוד | איפה |
|---|---|---|---|
| `dna` | «לא הערכה עצמית» | משמעת = שיעור העסקאות שהמשתמש **סימן** `followedPlan` | `psychologyPatterns.js:106` |
| `discipline` | «האם עקבת אחרי התוכנית» | כנ״ל — דיווח עצמי | שם |
| `dnaRisk` | «גודל פוזיציה אחיד, הקפדה על stop» | `1 − max(0, ממוצע % סיכון − 1%) × 50` ⇒ 1%→100 · 2%→50 · 3%→0 | `TradeDNA.js:164` |
| `dnaConsistency` | «יציבות לאורך זמן» | `1 − min(1, sd(R) ÷ 3)` | `TradeDNA.js:190` |
| `dnaGrowth` | «לומד מהנתונים» | שיפוע R מצטבר ב-20 הסגורות האחרונות | `TradeDNA.js:199` |
| `edge` | «יתרון מובהק סטטיסטית» · «setups» | צירופי סטאפ×רגש · מינ' 3 · top-5 לפי `edgeScore` = Wilson×(1+R) · `isSignificant` מוגדר (`statisticalModels.js:231`) ו⛔ נקרא | `tradingStats.js:538` |
| `antiEdge` | — | מינ' 2 · `WR<50%` או `avgR<0` · top-5 לפי `antiScore` | שם |
| `sharpe` | ספי 1/2/3 · «רמת קרן גידור» | `mean(R) ÷ sd(R)` לעסקה, בלי ריבית, בלי שנתיות | `statisticalModels.js:195` |
| `expectancy` | בדולרים | `expectedValueR` — ב-R, BE במכנה | `statisticalModels.js:156` |
| `rrBucket3plus` | «העסקאות האיכותיות» | יחס **מתוכנן** (יעד/סטופ); 25% = 1/(1+3) לפני עמלות | `statisticalModels.js:345` |
| `dayOfWeek` | «Edge נסתר בשני/שישי» | מקובץ לפי `m.date` = יום **הכניסה** | `tradingStats.js:488` |
| `equityCurve` | «תקופות שטוחות = מסחר יתר» | ⛔ נגזר מהקוד; שגוי לוגית (שטוח = מעט עסקאות או איזון) | — |
| `grade` | «שקלול» בלי משקלות | `0.4·WR + 0.3·R + 0.2·משמעת + 0.1·עקביות` · A≥85 · B≥70 · C≥55 · D≥40 | `MonthlyReport.js:172` |
| `ORBBreakout` | «15–30 דק'» | `knowledge/setups.json` `orb`: «5/15/30 דק'» | — |
| `takeProfit` | «לפחות 1.5R» | פעולות הגרף (`chartCalcPosition`/`chartAddToJournal`) ושיעור המאמן: 2:1 | הכרעה 4 |
| `rr` | `3:1` | הכרעה 7: `1:3` | — |
| «Best Setup» (inline) | «לפי P&L כולל ואחוז הצלחה · תסחור אותו יותר» | הבחירה לפי `winRate` (ראה `test:lessons` בלוק 7) — ההמלצה היא בדיוק מה ש-`B-326` הסיר מהכרטיס | App 6790 |

**caveats שנבדקו מול הקוד:**

| מונח | caveat | הקוד |
|---|---|---|
| `avgR` | בלי סטופ ⇒ מוחרג (⛔ 0R) · לפי כיוון · שורת N/M | `rSampleSub` (App) · `test:format` §7 |
| `winRate` | BE במכנה, ⛔ ניצחון | `winLossBeSub` App 760 מציג `…/ NBE` |
| `profitFactor` | `∞` בלי הפסדים · לפני עמלות | `profitFactorFromPnls` מחזיר `Infinity` · אין עמלות |
| `maxDD` | דולרים מהשיא של P&L מצטבר | `maxDDDollars` (`tradingStats.js:214`), מוצג App 5540 |
| `avgHold` | ימים קלנדריים · אותו יום = 0 | `holdDays` (`utils.js:48`): `round((d2−d1)/86400000)`, `max(0,…)` |
| `riskLimits` | ×2 · רצפה 3% · תקרה 5% · בלי «(1%)» | App 1492: `min(5, max(3, riskPct × 2))` · `test:copy` #1–#4 |

## 5. ממשק — `InfoTooltip.jsx` (175 שורות) / `TermTooltip.jsx` (40)

| נמדד | |
|---|---|
| `onMouseEnter` פותח בלי תנאי · `onClick` עושה toggle | **השערת U5** (⛔ נמדדה): במגע Android, `mouseenter` הסינתטי פותח ואז `click` סוגר |
| רוחב קבוע 280 (`POPOVER_W`) · בלי `max-height` | טקסט של 115 מילים חורג מהמסך |
| חץ ב-`left: 50%` גם כשהבועה הוזזה כדי להיכנס למסך | החץ לא מצביע על הטריגר |
| ✕ ב-`right-2` · `md:hidden` | ב-RTL ה-✕ בצד הלא נכון |
| `role="tooltip"` על תוכן שנפתח בלחיצה | דפוס toggletip נדרש |
| `TermTooltip` מחזיר `children ?? null` כשהמונח חסר | "?" שנעלם בשקט |
| `SetupTagTip` (App 141) · `DayTradesModal` 314 | מציגים את `knowledge/setups.json` — עברית בכל שפה |

## 6. bundle — בסיס

| chunk | raw | gzip |
|---|---|---|
| `index-*.js` | 1,691,055 | 506,627 |
| `recharts-*.js` | 553,418 | 155,744 |
| `sentry-*.js` | 197,600 | 66,063 |
| `index-*.css` | 113,701 | 19,903 |
| `src/data/tooltips.js` לבדו | 104,893 | 36,626 |

```bash
npm run build && for f in dist/assets/*.js dist/assets/*.css; do printf "%s raw %s gzip %s\n" "$(basename $f)" "$(wc -c < $f)" "$(gzip -9 -c $f | wc -c)"; done
```

`i18n.js` = 145,039 B, כל השפות סטטיות; ה-`import()` היחיד באפליקציה הוא `AdminPanel` דרך `lazyWithRetry` (App 22/40); אין service worker. ⇒ טעינה לפי שפה = `B-474` (גל 7, הכרעת ניב).

## 7. בדיקות שקוראות טקסט מונחים

| בדיקה | מה | בגל |
|---|---|---|
| `test:format` §7 | `avgR`·`rMultiple` נושאים LONG+SHORT ב-5 שפות · `avgR` נושא «0R» | נשאר, מופנה לטקסט המוצג |
| `test:copy` #1–#4 | `riskLimits`: ⛔ «(1%)» · ⛔ «(3%)» · ⛔ מספר פוזיציות קשיח · רצפה 3% + תקרה 5% | נשאר |
| `test:copy` #5 | `glossary.json` = `tooltips.js` ל-`riskLimits` | מוחלף בבדיקת hash של `test:glossary` על **כל** העותקים |
| `test:tour` | `data-tour=` ועוגנים | המודאל לא נוגע ב-`NAV_KEYS` |
| `test:lessons` בלוק 7 | אריח Best Setup | הטקסט ה-inline שלו משתנה, הבחירה ⛔ |

## 8. נרשם

`B-473` (`initialStop` — R כשהסטופ נערך) · `B-474` (טעינה עצלה לפי שפה, גל 7) · `B-475` (כתיב 1:3 במאמן וב-`localAI`).
