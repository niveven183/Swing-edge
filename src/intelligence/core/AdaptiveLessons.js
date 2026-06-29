// ─── ADAPTIVE LESSONS ────────────────────────────────────────────────────────
// Detects personal behavioural patterns across closed trades and converts them
// into bilingual lessons that slot directly into the existing `smartLessons`
// renderer ({ type, title, detail, action }).
//
// P&L and R-multiple are NOT stored on the trade object — they are derived per
// call via the `calcMetrics(trade)` function passed in from the host app.

import { rankSetupEdges, MIN_SAMPLE_EDGE } from '../utils/statisticalModels.js';

const pnlOf = (t, calc) => {
  try { return calc(t)?.pnl ?? 0; } catch { return 0; }
};
const rOf = (t, calc) => {
  try { return calc(t)?.rMultiple ?? 0; } catch { return 0; }
};

const SEVERITY_TO_TYPE = {
  critical: 'warning',
  high: 'warning',
  medium: 'insight',
  info: 'strength',
};

const PATTERNS = [
  {
    id: 'fomo_late_entry',
    severity: 'high',
    detect: (trades, calc) => {
      const fomo = trades.filter(t => String(t.emotionAtEntry || '').toLowerCase().includes('fomo'));
      if (fomo.length < 2) return null;
      const lose = fomo.filter(t => pnlOf(t, calc) < 0);
      if (lose.length / fomo.length < 0.5) return null;
      return { count: lose.length, total: fomo.length };
    },
    render: ({ count, total }, lang) => lang === 'he' ? {
      title: 'FOMO = הדלף הגדול שלך',
      detail: `${count}/${total} עסקאות שנפתחו ב-FOMO הפסידו כסף.`,
      action: 'חכה לאישור הסטאפ לפני כניסה — בלי FOMO.',
    } : {
      title: 'FOMO is your biggest leak',
      detail: `${count}/${total} FOMO entries lost money.`,
      action: 'Wait for setup confirmation before entering.',
    },
  },
  {
    id: 'overtrading_friday',
    severity: 'medium',
    detect: (trades, calc) => {
      const fri = trades.filter(t => {
        const d = new Date(t.date || t.openDate || '');
        return !isNaN(d) && d.getDay() === 5;
      });
      if (fri.length < 3) return null;
      const friWR = fri.filter(t => pnlOf(t, calc) > 0).length / fri.length;
      const allWR = trades.filter(t => pnlOf(t, calc) > 0).length / trades.length;
      if (friWR >= allWR - 0.15) return null;
      return { wr: Math.round(friWR * 100), allWR: Math.round(allWR * 100) };
    },
    render: ({ wr, allWR }, lang) => lang === 'he' ? {
      title: 'יום שישי מחליש אותך',
      detail: `אחוז זכייה ביום שישי ${wr}% — נמוך ב-${allWR - wr}% מהממוצע.`,
      action: 'שקול להפחית סחר בימי שישי או לדלג עליהם.',
    } : {
      title: 'Friday is your weakest day',
      detail: `Friday win rate ${wr}% — ${allWR - wr}% below your average.`,
      action: 'Consider reducing or skipping Friday trades.',
    },
  },
  {
    id: 'cut_winners_early',
    severity: 'high',
    detect: (trades, calc) => {
      const winners = trades.filter(t => pnlOf(t, calc) > 0);
      if (winners.length < 5) return null;
      const early = winners.filter(t => rOf(t, calc) < 1.0);
      if (early.length / winners.length < 0.5) return null;
      return { count: early.length, total: winners.length };
    },
    render: ({ count, total }, lang) => lang === 'he' ? {
      title: 'אתה יוצא מזוכים מוקדם מדי',
      detail: `${count}/${total} עסקאות מנצחות נסגרו מתחת ל-1R.`,
      action: 'סמוך על היעדים שלך — אל תקצר רווחים.',
    } : {
      title: 'You cut winners too early',
      detail: `${count}/${total} winning trades closed under 1R.`,
      action: 'Trust your targets — let winners run.',
    },
  },
  {
    id: 'stop_discipline',
    severity: 'critical',
    detect: (trades, calc) => {
      const losses = trades.filter(t => pnlOf(t, calc) < 0);
      if (losses.length < 3) return null;
      const big = losses.filter(t => Math.abs(rOf(t, calc)) > 1.5);
      if (big.length < 2) return null;
      return { count: big.length };
    },
    render: ({ count }, lang) => lang === 'he' ? {
      title: 'משמעת סטופ נשברת',
      detail: `${count} עסקאות חרגו מהפסד של 1.5R.`,
      action: 'סטופים קשיחים בלבד — ההפסדים הגדולים הורסים חשבון.',
    } : {
      title: 'Stop discipline is breaking',
      detail: `${count} trades exceeded 1.5R loss.`,
      action: 'Hard stops only — big losses destroy accounts.',
    },
  },
  {
    id: 'best_setup_underused',
    severity: 'medium',
    detect: (trades) => {
      const top = rankSetupEdges(trades, { minSample: MIN_SAMPLE_EDGE })[0];
      if (!top || top.winRate < 55) return null;
      return { setup: top.setup, wr: top.winRate, count: top.n };
    },
    render: ({ setup, wr, count }, lang) => lang === 'he' ? {
      title: `${setup} — ה-Edge החזק שלך`,
      detail: `${wr}% זכייה על פני ${count} עסקאות — הסטאפ החזק ביותר שלך.`,
      action: 'סחור אותו אגרסיבי יותר — תן לו יותר משקל.',
    } : {
      title: `${setup} is your edge (all-time)`,
      detail: `${wr}% win rate across ${count} trades — your strongest setup.`,
      action: 'Trade it more aggressively.',
    },
  },
  {
    id: 'discipline_improving',
    severity: 'info',
    detect: (trades, calc) => {
      const sorted = [...trades].sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
      if (sorted.length < 10) return null;
      const half = Math.floor(sorted.length / 2);
      const first = sorted.slice(0, half);
      const last = sorted.slice(half);
      const firstWR = first.filter(t => pnlOf(t, calc) > 0).length / first.length;
      const lastWR = last.filter(t => pnlOf(t, calc) > 0).length / last.length;
      if (lastWR <= firstWR + 0.1) return null;
      return { improvement: Math.round((lastWR - firstWR) * 100) };
    },
    render: ({ improvement }, lang) => lang === 'he' ? {
      title: 'אתה משתפר',
      detail: `אחוז הזכייה שלך עלה ב-${improvement}% בעסקאות האחרונות.`,
      action: 'אתה מפתח Edge אמיתי — המשך באותו קצב.',
    } : {
      title: 'You are improving',
      detail: `Your recent win rate is up ${improvement}% vs earlier trades.`,
      action: "You're developing real edge — keep going.",
    },
  },
];

export class AdaptiveLessons {
  static generate(trades, calcMetrics, lang = 'he') {
    if (!Array.isArray(trades) || trades.length < 5 || typeof calcMetrics !== 'function') {
      return [];
    }
    const out = [];
    for (const p of PATTERNS) {
      try {
        const data = p.detect(trades, calcMetrics);
        if (!data) continue;
        const text = p.render(data, lang);
        out.push({
          id: p.id,
          type: SEVERITY_TO_TYPE[p.severity] || 'insight',
          title: text.title,
          detail: text.detail,
          action: text.action,
        });
      } catch { /* skip broken pattern */ }
    }
    const order = { warning: 0, insight: 1, strength: 2 };
    return out.sort((a, b) => (order[a.type] ?? 9) - (order[b.type] ?? 9));
  }
}

export default AdaptiveLessons;
