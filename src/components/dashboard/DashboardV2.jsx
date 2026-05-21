import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer,
} from "recharts";
import InfoTooltip from "../ui/InfoTooltip.jsx";

/* ──────────────────────────────────────────────────────────────────
   DashboardV2 — Clean Luxury direction.
   Pure presentation; data flows in via `stats`, `realTrades`, `trades`.
   Inline subcomponents keep this to a single file per the spec.
   ────────────────────────────────────────────────────────────────── */

const fmtUSD0 = (n) =>
  (n >= 0 ? "+" : "−") + "$" + Math.abs(Math.round(n || 0)).toLocaleString();

const fmtUSDsmall = (n) =>
  "$" + Math.round(n || 0).toLocaleString();

const fmtPct = (n, digits = 1) =>
  (n == null || Number.isNaN(n) ? "—" : `${n.toFixed(digits)}%`);

const fmtR = (n, digits = 2) =>
  (n == null || Number.isNaN(n) || !Number.isFinite(n))
    ? "—"
    : `${n >= 0 ? "+" : ""}${n.toFixed(digits)}R`;

/* ── HeroPnL ──────────────────────────────────────────────────── */
function HeroPnL({ total, pct, count }) {
  const positive = (total || 0) >= 0;
  const [shown, setShown] = useState(0);
  const start = useRef(null);
  const raf = useRef(null);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduce) { setShown(total || 0); return; }
    cancelAnimationFrame(raf.current);
    start.current = null;
    const duration = 1200;
    const from = 0;
    const to = total || 0;
    const tick = (ts) => {
      if (!start.current) start.current = ts;
      const t = Math.min(1, (ts - start.current) / duration);
      // ease-out-quart
      const eased = 1 - Math.pow(1 - t, 4);
      setShown(from + (to - from) * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [total]);

  return (
    <section
      aria-label="Total profit and loss"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border-soft)",
        borderRadius: "var(--radius-xl)",
        padding: "var(--space-8) var(--space-6)",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      <div style={{
        fontFamily: "var(--font-body)",
        fontSize: 12,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
        marginBottom: "var(--space-3)",
      }}>
        Net P&amp;L
      </div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 500,
          fontSize: "clamp(48px, 8vw, 88px)",
          lineHeight: 1,
          color: positive ? "var(--accent-emerald)" : "var(--accent-rose)",
          fontVariantNumeric: "tabular-nums",
          fontFeatureSettings: '"ss01", "ss02"',
        }}
      >
        {fmtUSD0(shown)}
      </div>
      <div style={{
        marginTop: "var(--space-3)",
        fontFamily: "var(--font-mono)",
        fontSize: 13,
        color: "var(--text-secondary)",
      }}>
        {pct == null ? "" : `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`}
        {pct != null && count != null ? " · " : ""}
        {count != null ? `${count} closed` : ""}
      </div>
    </section>
  );
}

/* ── StatCard ─────────────────────────────────────────────────── */
function StatCard({ label, value, hint, tooltip, delayMs = 0 }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setMounted(true), delayMs);
    return () => clearTimeout(id);
  }, [delayMs]);

  return (
    <div
      tabIndex={0}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border-soft)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-soft)",
        padding: "var(--space-5)",
        transition:
          "box-shadow var(--transition-base), transform var(--transition-base), opacity var(--transition-base)",
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(8px)",
        outline: "none",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "var(--shadow-lifted)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "var(--shadow-soft)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
      onFocus={(e) => {
        e.currentTarget.style.boxShadow = `0 0 0 3px var(--focus-ring), var(--shadow-soft)`;
      }}
      onBlur={(e) => {
        e.currentTarget.style.boxShadow = "var(--shadow-soft)";
      }}
    >
      <div style={{
        display: "flex", alignItems: "center", gap: "var(--space-2)",
        fontFamily: "var(--font-body)",
        fontSize: 11,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
        marginBottom: "var(--space-3)",
      }}>
        <span>{label}</span>
        {tooltip && <InfoTooltip label={`About ${label}`}>{tooltip}</InfoTooltip>}
      </div>
      <div style={{
        fontFamily: "var(--font-display)",
        fontWeight: 500,
        fontSize: 36,
        lineHeight: 1.05,
        color: "var(--text-primary)",
        fontVariantNumeric: "tabular-nums",
      }}>
        {value}
      </div>
      {hint && (
        <div style={{
          marginTop: "var(--space-2)",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--text-muted)",
        }}>
          {hint}
        </div>
      )}
    </div>
  );
}

/* ── EquityCurveChart ─────────────────────────────────────────── */
function EquityCurveChart({ data }) {
  const series = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return [];
    return data.map((p, i) => ({
      i,
      equity: p.equity ?? p.value ?? 0,
      date: p.date || "",
    }));
  }, [data]);

  return (
    <section
      aria-label="Equity curve"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border-soft)",
        borderRadius: "var(--radius-xl)",
        padding: "var(--space-6)",
        boxShadow: "var(--shadow-soft)",
        height: 280,
      }}
    >
      <div style={{
        fontFamily: "var(--font-body)",
        fontSize: 11,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
        marginBottom: "var(--space-3)",
      }}>
        Equity Curve
      </div>
      {series.length === 0 ? (
        <div style={{
          height: "calc(100% - 24px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--text-muted)", fontFamily: "var(--font-body)", fontSize: 13,
        }}>
          No closed trades yet.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="calc(100% - 24px)">
          <AreaChart data={series} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="v2EquityFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"  stopColor="#1F9D74" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#1F9D74" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="i"
              tick={{ fill: "#86868F", fontSize: 11, fontFamily: "JetBrains Mono" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#86868F", fontSize: 11, fontFamily: "JetBrains Mono" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => fmtUSDsmall(v)}
              width={64}
            />
            <RTooltip
              contentStyle={{
                background: "var(--surface-elevated)",
                border: "1px solid var(--border-soft)",
                borderRadius: 12,
                boxShadow: "var(--shadow-lifted)",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--text-primary)",
              }}
              labelStyle={{ color: "var(--text-muted)" }}
              formatter={(v) => [fmtUSDsmall(v), "Equity"]}
              labelFormatter={() => ""}
            />
            <Area
              type="monotone"
              dataKey="equity"
              stroke="#1F9D74"
              strokeWidth={2}
              fill="url(#v2EquityFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </section>
  );
}

/* ── OpenPositionsRow ─────────────────────────────────────────── */
function OpenPositionsRow({ openTrades, TickerLogo }) {
  return (
    <section
      aria-label="Open positions"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border-soft)",
        borderRadius: "var(--radius-xl)",
        padding: "var(--space-6)",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      <div style={{
        fontFamily: "var(--font-body)",
        fontSize: 11,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
        marginBottom: "var(--space-4)",
      }}>
        Open Positions
      </div>
      {(!openTrades || openTrades.length === 0) ? (
        <div style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)", fontSize: 13 }}>
          No open positions.
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: "var(--space-3)",
        }}>
          {openTrades.map((t) => {
            const side = t.side || "LONG";
            const sideColor = side === "LONG" ? "var(--accent-emerald)" : "var(--accent-rose)";
            return (
              <div key={t.id} style={{
                background: "var(--surface-sunken)",
                border: "1px solid var(--border-soft)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-3)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  {TickerLogo ? <TickerLogo ticker={t.ticker} size={18} /> : null}
                  <span style={{
                    fontFamily: "var(--font-mono)", fontWeight: 600,
                    color: "var(--text-primary)", fontSize: 13,
                  }}>{t.ticker}</span>
                  <span style={{
                    marginInlineStart: "auto",
                    fontFamily: "var(--font-mono)", fontSize: 10,
                    color: sideColor,
                    background: side === "LONG" ? "var(--accent-emerald-soft)" : "var(--accent-rose-soft)",
                    padding: "2px 6px", borderRadius: "var(--radius-pill)",
                  }}>{side}</span>
                </div>
                <div style={{
                  fontFamily: "var(--font-mono)", fontSize: 11,
                  color: "var(--text-secondary)",
                  display: "flex", justifyContent: "space-between",
                }}>
                  <span>Entry</span><span>${Number(t.entry || 0).toFixed(2)}</span>
                </div>
                <div style={{
                  fontFamily: "var(--font-mono)", fontSize: 11,
                  color: "var(--text-muted)",
                  display: "flex", justifyContent: "space-between",
                }}>
                  <span>Shares</span><span>{t.shares}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ── AIInsightCard ────────────────────────────────────────────── */
function AIInsightCard({ headline, body }) {
  return (
    <section
      aria-label="AI insight"
      style={{
        background:
          "linear-gradient(135deg, rgba(63,79,184,0.08), rgba(63,79,184,0.02))",
        border: "1px solid var(--border-soft)",
        borderRadius: "var(--radius-xl)",
        padding: "var(--space-6)",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      <div style={{
        fontFamily: "var(--font-body)",
        fontSize: 11,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "var(--accent-indigo)",
        marginBottom: "var(--space-3)",
      }}>
        AI Insight
      </div>
      <div style={{
        fontFamily: "var(--font-display)",
        fontStyle: "italic",
        fontWeight: 500,
        fontSize: 22,
        lineHeight: 1.25,
        color: "var(--text-primary)",
        marginBottom: "var(--space-3)",
      }}>
        {headline}
      </div>
      <div style={{
        fontFamily: "var(--font-body)",
        fontSize: 13,
        color: "var(--text-secondary)",
        lineHeight: 1.5,
      }}>
        {body}
      </div>
    </section>
  );
}

/* ── EdgeStrip ────────────────────────────────────────────────── */
function EdgeStrip({ topEdges = [], antiEdges = [] }) {
  if ((!topEdges || topEdges.length === 0) && (!antiEdges || antiEdges.length === 0)) {
    return null;
  }
  const Chip = ({ tone, name, r }) => (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      padding: "var(--space-2) var(--space-4)",
      borderRadius: "var(--radius-pill)",
      background: tone === "emerald" ? "var(--accent-emerald-soft)" : "var(--accent-rose-soft)",
      color: tone === "emerald" ? "var(--accent-emerald)" : "var(--accent-rose)",
      fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600,
    }}>
      <span>{name}</span>
      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 500 }}>{fmtR(r)}</span>
    </span>
  );
  return (
    <section
      aria-label="Your edges"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border-soft)",
        borderRadius: "var(--radius-xl)",
        padding: "var(--space-5) var(--space-6)",
        boxShadow: "var(--shadow-soft)",
        display: "flex", flexWrap: "wrap", gap: "var(--space-3)",
        alignItems: "center",
      }}
    >
      <span style={{
        fontFamily: "var(--font-body)",
        fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase",
        color: "var(--text-muted)", marginInlineEnd: "var(--space-2)",
      }}>
        Edge
      </span>
      {(topEdges || []).slice(0, 4).map((e, i) => (
        <Chip key={"e" + i} tone="emerald" name={e.name || e.setup || e.label || "—"} r={e.avgR ?? e.r ?? 0} />
      ))}
      {(antiEdges || []).slice(0, 3).map((e, i) => (
        <Chip key={"a" + i} tone="rose" name={e.name || e.setup || e.label || "—"} r={e.avgR ?? e.r ?? 0} />
      ))}
    </section>
  );
}

/* ── DashboardV2 (default export) ─────────────────────────────── */
export default function DashboardV2({ stats, realTrades = [], trades = [], TickerLogo, lang }) {
  const openTrades = useMemo(
    () => (realTrades || []).filter((t) => t.status === "OPEN"),
    [realTrades]
  );
  const closedCount = useMemo(
    () => (realTrades || []).filter((t) => t.status === "CLOSED").length,
    [realTrades]
  );

  const total      = stats?.totalPnL ?? 0;
  const pct        = stats?.totalReturnPct ?? null;
  const winRate    = stats?.winRate ?? 0;
  const pf         = stats?.profitFactor ?? 0;
  const avgR       = stats?.avgR ?? 0;
  const equityData = stats?.equityCurve ?? [];
  const topEdges   = stats?.topEdges ?? [];
  const antiEdges  = stats?.antiEdges ?? [];

  const insightHeadline = topEdges?.[0]
    ? `Your edge lives in ${topEdges[0].name || topEdges[0].setup || "your top setup"}.`
    : "Patterns emerge as you log more trades.";
  const insightBody = antiEdges?.[0]
    ? `Watch out for ${antiEdges[0].name || antiEdges[0].setup || "your weak setup"} — it's pulling your average down.`
    : "Keep tagging every trade — discipline reveals the edge.";

  return (
    <div
      lang={lang || undefined}
      style={{
        background: "var(--bg)",
        color: "var(--text-primary)",
        fontFamily: "var(--font-body)",
        padding: "var(--space-6)",
        borderRadius: "var(--radius-xl)",
        display: "grid",
        gap: "var(--space-5)",
        minHeight: 600,
      }}
    >
      <HeroPnL total={total} pct={pct} count={closedCount} />

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: "var(--space-4)",
      }}>
        <StatCard
          label="Win Rate"
          value={fmtPct(winRate, 1)}
          tooltip="% of closed trades that ended in profit."
          delayMs={0}
        />
        <StatCard
          label="Profit Factor"
          value={Number.isFinite(pf) ? pf.toFixed(2) : "∞"}
          tooltip="Gross winners ÷ gross losers. > 1.5 is strong."
          delayMs={80}
        />
        <StatCard
          label="Avg R"
          value={fmtR(avgR, 2)}
          tooltip="Average reward-to-risk multiple per closed trade."
          delayMs={160}
        />
        <StatCard
          label="Total Trades"
          value={String(closedCount)}
          tooltip="Count of closed trades in the current dataset."
          delayMs={240}
        />
      </div>

      <EquityCurveChart data={equityData} />

      <OpenPositionsRow openTrades={openTrades} TickerLogo={TickerLogo} />

      <AIInsightCard headline={insightHeadline} body={insightBody} />

      <EdgeStrip topEdges={topEdges} antiEdges={antiEdges} />
    </div>
  );
}
