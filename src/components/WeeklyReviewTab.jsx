// ─────────────────────────────────────────────────────────────────────────────
// WeeklyReviewTab.jsx — B3 Weekly Review (rolling last 7 days).
// SUMMARIZES the existing engine — never recomputes. All numbers come from
// useTradingStats (same hook Analytics uses → figures always agree) and
// SwingEdgeAI.getEdges (topEdge / topAntiEdge). One serif flag-moment (weekly P&L).
// CTA "start a new week" records last_reviewed_at in weekly_reviews (no deletes).
// v3 design · he/en i18n · RTL/dark aware.
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo, useState, useEffect } from "react";
import { CalendarCheck, TrendingUp, Target, Flame, AlertTriangle, Sparkles, Hash } from "lucide-react";
import { useTradingStats } from "../hooks/useTradingStats.js";
import { SwingEdgeAI } from "../intelligence/SwingEdgeAI.js";
import { supabase, isSupabaseConfigured } from "../supabaseClient.js";

const PANEL =
  "bg-[var(--v3-bg-panel)] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-[var(--v3-radius-card)]";

const WEEK_MS = 7 * 86400000;

const money = (n) => `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString()}`;
const pct = (n) => `${Math.round(n)}%`;

function fmtDate(d, lang) {
  return d.toLocaleDateString(lang === "he" ? "he-IL" : "en-US", { day: "2-digit", month: "short" });
}

// Small labelled stat cell (JetBrains Mono numbers per v3).
function Stat({ icon: Icon, label, value, tone = "text-[var(--v3-text-hi)]" }) {
  return (
    <div className={`${PANEL} p-4`}>
      <div className="flex items-center gap-1.5 mb-1.5 text-[var(--v3-text-lo)]">
        <Icon size={13} />
        <span className="text-[10px] font-semibold tracking-widest uppercase">{label}</span>
      </div>
      <div className={`font-mono text-2xl font-bold ${tone}`}>{value}</div>
    </div>
  );
}

export default function WeeklyReviewTab({ trades, capital, calcMetrics, authUser, t, lang, isRTL }) {
  const [reviewedAt, setReviewedAt] = useState(null);
  const [marking, setMarking] = useState(false);

  const canDB = isSupabaseConfigured && supabase && authUser?.id;

  // Rolling last-7-days window. Same predicate the engine's lastWeekStats uses,
  // so trade counts / win rate / P&L match Analytics exactly.
  const weekly = useMemo(() => {
    const cutoff = Date.now() - WEEK_MS;
    return (trades || []).filter((tr) => {
      const raw = tr.date || tr.createdAt;
      if (!raw) return false;
      return new Date(raw).getTime() >= cutoff;
    });
  }, [trades]);

  const wStats = useTradingStats(weekly, capital, calcMetrics);
  const edges = useMemo(() => SwingEdgeAI.getEdges(weekly), [weekly]);

  // best/worst setup from the engine breakdown (min sample 2 to avoid noise).
  const { bestSetup, worstSetup } = useMemo(() => {
    const setups = (wStats.bySetup || []).filter((s) => s.count >= 2 && s.name !== "Unknown");
    if (!setups.length) return { bestSetup: null, worstSetup: null };
    const byWin = [...setups].sort((a, b) => b.winRate - a.winRate || b.totalPnL - a.totalPnL);
    return { bestSetup: byWin[0], worstSetup: byWin[byWin.length - 1] };
  }, [wStats.bySetup]);

  const topEdge = edges.topEdge;
  const topAnti = edges.topAntiEdge;
  const strongMsg = topEdge ? topEdge.message?.[lang] || topEdge.message?.en : null;
  const warnMsg = topAnti ? topAnti.message?.[lang] || topAnti.message?.en : null;

  const now = new Date();
  const start = new Date(now.getTime() - WEEK_MS);
  const range = `${fmtDate(start, lang)} – ${fmtDate(now, lang)}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!canDB) return;
      const { data, error } = await supabase
        .from("weekly_reviews")
        .select("last_reviewed_at")
        .eq("user_id", authUser.id)
        .maybeSingle();
      if (cancelled || error) { if (error) console.error("weekly_reviews load:", error); return; }
      if (data?.last_reviewed_at) setReviewedAt(data.last_reviewed_at);
    })();
    return () => { cancelled = true; };
  }, [canDB, authUser?.id]);

  const handleNewWeek = async () => {
    if (!canDB || marking) return;
    setMarking(true);
    const stamp = new Date().toISOString();
    const { error } = await supabase
      .from("weekly_reviews")
      .upsert({ user_id: authUser.id, last_reviewed_at: stamp }, { onConflict: "user_id" });
    setMarking(false);
    if (error) { console.error("weekly_reviews upsert:", error); return; }
    setReviewedAt(stamp);
  };

  const pnl = wStats.totalPnL || 0;
  const pnlTone = pnl >= 0 ? "text-[var(--v3-accent)]" : "text-[var(--v3-loss)]";
  const streak = wStats.currentStreak || 0;
  const streakLabel = streak > 0 ? `${streak}W` : streak < 0 ? `${Math.abs(streak)}L` : "—";

  const empty = wStats.total === 0;

  return (
    <div className="max-w-3xl mx-auto space-y-5" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <CalendarCheck size={18} className="text-[var(--v3-accent)]" />
          <div>
            <h2 className="text-lg font-bold text-[var(--v3-text-hi)] leading-tight">{t.wr_title}</h2>
            <p className="text-xs text-[var(--v3-text-lo)]">{t.wr_subtitle}</p>
          </div>
        </div>
        <span className="text-[11px] font-mono text-[var(--v3-text-mid)] px-2 py-1 rounded-[var(--v3-radius-chip)] bg-white/5">
          {range}
        </span>
      </div>

      {empty ? (
        <div className={`${PANEL} p-10 text-center text-sm text-[var(--v3-text-lo)]`}>
          {t.wr_empty}
        </div>
      ) : (
        <>
          {/* Hero P&L — the single serif flag-moment on this screen */}
          <div className={`${PANEL} p-6 text-center`}>
            <div className="text-[10px] font-semibold tracking-widest uppercase text-[var(--v3-text-lo)] mb-2">
              {t.wr_pnl}
            </div>
            <div className={`se-serif text-5xl md:text-6xl leading-none tracking-tight ${pnlTone}`}>
              {pnl >= 0 ? "+" : ""}{money(pnl)}
            </div>
          </div>

          {/* Stat grid */}
          <div className="grid grid-cols-3 gap-3">
            <Stat icon={Hash} label={t.wr_trades} value={wStats.total} />
            <Stat icon={Target} label={t.wr_winRate} value={pct(wStats.winRate)} />
            <Stat icon={TrendingUp} label={t.wr_streak} value={streakLabel}
                  tone={streak >= 0 ? "text-[var(--v3-accent)]" : "text-[var(--v3-loss)]"} />
          </div>

          {/* Best / Worst setup */}
          {(bestSetup || worstSetup) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {bestSetup && (
                <div className={`${PANEL} p-4`}>
                  <div className="text-[10px] font-semibold tracking-widest uppercase text-[var(--v3-accent)] mb-1">
                    {t.wr_bestSetup}
                  </div>
                  <div className="text-sm font-semibold text-[var(--v3-text-hi)]">{bestSetup.name}</div>
                  <div className="text-[11px] font-mono text-[var(--v3-text-mid)] mt-1">
                    {pct(bestSetup.winRate)} · {bestSetup.count}
                  </div>
                </div>
              )}
              {worstSetup && worstSetup !== bestSetup && (
                <div className={`${PANEL} p-4`}>
                  <div className="text-[10px] font-semibold tracking-widest uppercase text-[var(--v3-warn)] mb-1">
                    {t.wr_worstSetup}
                  </div>
                  <div className="text-sm font-semibold text-[var(--v3-text-hi)]">{worstSetup.name}</div>
                  <div className="text-[11px] font-mono text-[var(--v3-text-mid)] mt-1">
                    {pct(worstSetup.winRate)} · {worstSetup.count}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Strongest pattern (engine topEdge) */}
          <div className={`${PANEL} p-4`}>
            <div className="flex items-center gap-1.5 mb-2 text-[var(--v3-accent)]">
              <Sparkles size={14} />
              <span className="text-[10px] font-semibold tracking-widest uppercase">{t.wr_strongPattern}</span>
            </div>
            {strongMsg ? (
              <p className="text-sm text-[var(--v3-text-hi)] leading-relaxed">{strongMsg}</p>
            ) : bestSetup ? (
              <p className="text-sm text-[var(--v3-text-mid)]">
                {bestSetup.name} — {pct(bestSetup.winRate)} · {bestSetup.count}
              </p>
            ) : (
              <p className="text-sm text-[var(--v3-text-lo)]">{t.wr_noPattern}</p>
            )}
          </div>

          {/* One warning (engine topAntiEdge) */}
          <div className={`${PANEL} p-4`}>
            <div className="flex items-center gap-1.5 mb-2 text-[var(--v3-warn)]">
              <AlertTriangle size={14} />
              <span className="text-[10px] font-semibold tracking-widest uppercase">{t.wr_warning}</span>
            </div>
            {warnMsg ? (
              <p className="text-sm text-[var(--v3-text-hi)] leading-relaxed">{warnMsg}</p>
            ) : worstSetup ? (
              <p className="text-sm text-[var(--v3-text-mid)]">
                {worstSetup.name} — {pct(worstSetup.winRate)} · {worstSetup.count}
              </p>
            ) : (
              <p className="text-sm text-[var(--v3-text-lo)]">{t.wr_noWarning}</p>
            )}
          </div>
        </>
      )}

      {/* CTA — marks reviewed, never deletes data */}
      <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
        {reviewedAt && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[var(--v3-text-lo)]">
            <Flame size={12} className="text-[var(--v3-accent)]" />
            {(t.wr_reviewed || "Reviewed · {date}").replace(
              "{date}",
              new Date(reviewedAt).toLocaleDateString(lang === "he" ? "he-IL" : "en-US", { day: "2-digit", month: "short" })
            )}
          </span>
        )}
        <button
          onClick={handleNewWeek}
          disabled={marking || !canDB}
          className="ms-auto inline-flex items-center gap-1.5 px-5 py-2.5 rounded-[var(--v3-radius-pill)] text-sm font-semibold bg-[var(--v3-accent-glow)] border border-[#00C076]/30 text-[var(--v3-accent)] hover:bg-[var(--v3-accent)]/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <CalendarCheck size={15} />
          {t.wr_cta}
        </button>
      </div>
    </div>
  );
}
