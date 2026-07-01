import fs from 'fs';
import os from 'os';
import path from 'path';

// Intermediate hand-off files produced by extract-tooltips.mjs
const TT_TMP = path.join(os.tmpdir(), 'swingedge-tt.json');
const TL_TMP = path.join(os.tmpdir(), 'swingedge-tl.json');
const TT = JSON.parse(fs.readFileSync(TT_TMP,'utf8'));
const TL = JSON.parse(fs.readFileSync(TL_TMP,'utf8'));

// Category mapping (by key)
const CATS = {
  'מדדי ביצוע': ['winRate','profitFactor','avgR','expectancy','sharpe','maxDD','avgWin','avgLoss','avgHold','equityCurve','totalReturn','winStreak','streakHistory','grade','entryQuality'],
  'מדדים נוספים': ['rr','rMultiple','mfeMae','wilson','rrBucket3plus'],
  'מושגים / AI': ['dna','edge','antiEdge','tilt','marketRegime','discipline','dnaRisk','dnaConsistency','dnaGrowth'],
  'ניהול סיכון': ['riskPerTrade','riskLimits','positionSize','stopLoss','takeProfit'],
  'סטאפים': ['breakout','pullback','bullFlag','ORBBreakout','VWAPReclaim','higherLow','cupAndHandle','failedBreakout','overextendedFade','EMABounce50','trendContinuation','gapAndGo','earningsGapPlay','rangeBreakout','postEarningsStrength','powerHourBreak','MOCFade','overnightHold','overnightReversal','supportBounce','resistanceBreak','pullback20EMA'],
  'רגשות': ['emotionConfident','emotionCalm','emotionPatient','emotionNeutral','emotionHesitant','emotionNervous','emotionFOMO','emotionAngry'],
  'תנאי שוק': ['marketTrendingUp','marketTrendingDown','marketSideways','marketVolatile'],
  'פעולות גרף': ['chartCalcPosition','chartAddToJournal'],
};
const LANGNAMES = {he:'עברית',en:'English',es:'Español',pt:'Português',ar:'العربية'};
const LANGORDER = ['he','en','es','pt','ar'];

// Track categorized keys
const seen = new Set();
let md = `# 📘 SwingEdge — מילון מונחים · 5 שפות

> מקור אמת יחיד לכל מונחי המערכת. נבנה אוטומטית מ-\`src/data/tooltips.js\` (commit fcd6260).
> **70 מונחים** · 5 שפות מלאות (עברית · English · Español · Português · العربية).
> תחזוקה: המונחים חיים בקוד ב-\`tooltips.js\`. קובץ זה מסונכרן ממנו — אל תערוך ידנית, הרץ מחדש את הבנייה.

---

## תוכן עניינים
`;
for(const cat of Object.keys(CATS)){
  const n = CATS[cat].filter(k=>TT[k]||TL[k]).length;
  md += `- **${cat}** (${n})\n`;
}
md += `\n---\n`;

for(const [cat,keys] of Object.entries(CATS)){
  const present = keys.filter(k=>TT[k]||TL[k]);
  if(!present.length) continue;
  md += `\n## ${cat}\n`;
  for(const k of present){
    seen.add(k);
    const label = TL[k] || {};
    const desc = TT[k] || {};
    const title = label.en || k;
    const heLabel = label.he && label.he!==label.en ? ` · ${label.he}` : '';
    md += `\n### \`${k}\` — ${title}${heLabel}\n\n`;
    if(Object.keys(desc).length){
      md += `| שפה | הסבר |\n|---|---|\n`;
      for(const l of LANGORDER){
        if(desc[l]){
          const dir = (l==='he'||l==='ar')?'':''; // md tables don't do dir; keep raw
          const txt = desc[l].replace(/\n/g,'<br>').replace(/\|/g,'\\|');
          md += `| **${LANGNAMES[l]}** | ${txt} |\n`;
        }
      }
    } else {
      md += `*(תווית בלבד — אין הסבר נפרד)*\n`;
    }
  }
}

// Any uncategorized keys?
const allKeys = new Set([...Object.keys(TT),...Object.keys(TL)]);
const uncat = [...allKeys].filter(k=>!seen.has(k));
if(uncat.length){
  md += `\n## לא מקוטלג\n${uncat.map(k=>'`'+k+'`').join(', ')}\n`;
}

fs.writeFileSync('docs/SwingEdge-Terms-Glossary.md', md);
console.log('Glossary written. Categorized:', seen.size, 'Uncategorized:', uncat.length);
if(uncat.length) console.log('Uncat keys:', uncat.join(', '));

// Also emit clean JSON for future help-page use
const combined = {};
for(const k of allKeys){
  combined[k] = { label: TL[k]||null, description: TT[k]||null };
}
fs.writeFileSync('src/data/glossary.json', JSON.stringify(combined,null,2));
console.log('JSON written:', Object.keys(combined).length, 'terms');
