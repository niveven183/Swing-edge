import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Shield, LayoutDashboard, Users as UsersIcon, BookOpen, MessageCircle,
  Settings as SettingsIcon, ScrollText, RefreshCw, CheckCircle2, Trash2,
  Search, Ban, Download, Activity, Lock, X,
  AlertTriangle, TrendingUp, Mail, Database, Zap, Calendar,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { supabase, isSupabaseConfigured } from "../supabaseClient.js";
import { useToast, useConfirm } from "./ToastProvider.jsx";
import { pluralize } from "../i18n.js";

const ADMIN_EMAIL = "niveven183@gmail.com";

const BANNED_USERS_KEY = "swingEdgeBannedUsers";
const REVIEWED_FEEDBACK_KEY = "swingEdgeReviewedFeedback";
const FEATURE_FLAGS_KEY = "swingEdgeFeatureFlags";

const DEFAULT_FLAGS = {
  betaBadge: true,
  feedbackTab: true,
  maintenanceMode: false,
  maxTradesPerUser: 200,
};

const TAB_DEFS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "users", label: "Users", icon: UsersIcon },
  { id: "trades", label: "Trades", icon: BookOpen },
  { id: "feedback", label: "Feedback", icon: MessageCircle },
  { id: "system", label: "System", icon: SettingsIcon },
  { id: "logs", label: "Logs", icon: ScrollText },
];

// ════════════════════════════════════════════════════════════════════════════
//  Helpers — pure functions (kept inline; not exported)
// ════════════════════════════════════════════════════════════════════════════

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch { return fallback; }
}

function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function formatDate(ts) {
  if (!ts) return "—";
  try { return new Date(ts).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }); }
  catch { return "—"; }
}

function formatDateTime(ts) {
  if (!ts) return "—";
  try { return new Date(ts).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" }); }
  catch { return "—"; }
}

function shortEmail(email) {
  if (!email) return "—";
  if (email.length <= 24) return email;
  return email.slice(0, 21) + "…";
}

function formatWeekLabel(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(+d)) return "—";
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function downloadCSV(rows, filename, columns) {
  if (!rows || !rows.length) return;
  const cols = columns || Object.keys(rows[0]);
  const escape = (v) => {
    if (v == null) return "";
    const s = String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [
    cols.join(","),
    ...rows.map((r) => cols.map((c) => escape(r[c])).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function isWithinDays(ts, days) {
  if (!ts) return false;
  const d = new Date(ts).getTime();
  if (Number.isNaN(d)) return false;
  return Date.now() - d <= days * 86400000;
}

// ════════════════════════════════════════════════════════════════════════════
//  Local UI primitives
// ════════════════════════════════════════════════════════════════════════════

function KpiCard({ label, value, sub, accent = "cyan", icon: Icon, loading = false }) {
  const tone = {
    cyan: "from-cyan-500/15 to-cyan-500/0 border-cyan-500/20 text-cyan-300",
    violet: "from-violet-500/15 to-violet-500/0 border-violet-500/20 text-violet-300",
    emerald: "from-emerald-500/15 to-emerald-500/0 border-emerald-500/20 text-emerald-300",
    amber: "from-amber-500/15 to-amber-500/0 border-amber-500/20 text-amber-300",
    rose: "from-rose-500/15 to-rose-500/0 border-rose-500/20 text-rose-300",
    slate: "from-slate-500/15 to-slate-500/0 border-slate-500/20 text-slate-300",
  }[accent] || "";
  return (
    <div className={`bg-gradient-to-br ${tone} border rounded-2xl p-4 backdrop-blur`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold tracking-widest uppercase text-slate-300">{label}</span>
        {Icon && <Icon size={14} className="opacity-50" />}
      </div>
      {loading ? (
        <div className="skeleton h-7 w-20" />
      ) : (
        <div className="text-2xl font-extrabold font-mono text-white tabular-nums">{value}</div>
      )}
      {sub && <div className="text-[10px] mt-1 opacity-60">{sub}</div>}
    </div>
  );
}

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center gap-1 text-[10px]">
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="px-2 py-1 rounded border border-white/10 text-slate-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Previous page"
      >‹</button>
      <span className="px-2 text-slate-500 font-mono">
        {page} / {totalPages}
      </span>
      <button
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="px-2 py-1 rounded border border-white/10 text-slate-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Next page"
      >›</button>
    </div>
  );
}

function Modal({ open, onClose, title, children, wide = false }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`w-full ${wide ? "max-w-4xl" : "max-w-md"} bg-[var(--bg-elevated)] dark:bg-[#0d1424] border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-[var(--border-subtle)] dark:border-white/[0.06] flex items-center justify-between">
          <span className="text-sm font-bold text-white">{title}</span>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-auto p-5">{children}</div>
      </div>
    </div>
  );
}

function Badge({ tone = "slate", children }) {
  const styles = {
    slate: "bg-slate-500/15 text-slate-300 border-slate-500/30",
    emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    rose: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    cyan: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    amber: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    violet: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  };
  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold tracking-wide uppercase ${styles[tone] || styles.slate}`}>
      {children}
    </span>
  );
}

function GapNote({ children }) {
  return (
    <div className="text-[10px] text-amber-300/80 bg-amber-500/5 border border-amber-500/20 rounded-lg px-2.5 py-1.5 flex items-start gap-1.5">
      <AlertTriangle size={11} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  Password gate — verifies admin's password via Supabase re-auth
// ════════════════════════════════════════════════════════════════════════════

function PasswordGate({ open, onClose, onConfirm, title, message, busy }) {
  const [password, setPassword] = useState("");
  const [err, setErr] = useState(null);
  const [working, setWorking] = useState(false);
  useEffect(() => {
    if (open) { setPassword(""); setErr(null); setWorking(false); }
  }, [open]);
  if (!open) return null;

  const submit = async (e) => {
    e?.preventDefault?.();
    setErr(null);
    setWorking(true);
    try {
      if (!supabase) { setErr("Supabase not configured"); setWorking(false); return; }
      const { data: userData } = await supabase.auth.getUser();
      const email = userData?.user?.email;
      if (!email) { setErr("No active session"); setWorking(false); return; }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setErr("Wrong password"); setWorking(false); return; }
      await onConfirm?.();
      setWorking(false);
    } catch (e2) {
      setErr(e2?.message || "Verification failed");
      setWorking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-[var(--bg-elevated)] dark:bg-[#0d1424] border border-rose-500/30 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-[var(--border-subtle)] dark:border-white/[0.06] bg-rose-500/5 flex items-center gap-2">
          <Lock size={14} className="text-rose-400" />
          <span className="text-sm font-bold text-white">{title || "Confirm Password"}</span>
        </div>
        <div className="p-5 space-y-3">
          {message && <p className="text-xs text-slate-300 leading-relaxed">{message}</p>}
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your account password"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-rose-500/50 focus:outline-none"
          />
          {err && (
            <div className="text-[11px] text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg p-2">{err}</div>
          )}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={!password || working || busy}
              className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:bg-rose-900/40 disabled:text-rose-300/40 disabled:cursor-not-allowed text-white text-sm font-bold transition"
            >
              {working || busy ? "Working…" : "Confirm"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={working || busy}
              className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm hover:bg-white/10 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  ROOT — AdminPanel
// ════════════════════════════════════════════════════════════════════════════

export default function AdminPanel() {
  const [tab, setTab] = useState("overview");
  const [authUser, setAuthUser] = useState(null);
  const [overview, setOverview] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [tradesAgg, setTradesAgg] = useState(null);
  const [tradesList, setTradesList] = useState([]);
  const [newUsersSeries, setNewUsersSeries] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [supaUp, setSupaUp] = useState(null);
  const toast = useToast();

  // Track auth user (defense-in-depth admin check)
  useEffect(() => {
    if (!supabase) return;
    let sub;
    supabase.auth.getSession().then(({ data }) => setAuthUser(data?.session?.user || null));
    const { data } = supabase.auth.onAuthStateChange((_, s) => setAuthUser(s?.user || null));
    sub = data?.subscription;
    return () => sub?.unsubscribe?.();
  }, []);

  // Initial data load — every read goes through a SECURITY DEFINER admin RPC.
  // The browser holds only the anon key; identity is verified in the DB, so a
  // forged client-side isAdmin gets 42501 from every call below.
  const loadAll = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) { setSupaUp(false); setLoading(false); return; }
    setLoading(true);
    try {
      const [ov, ul, ta, tl, nus, fb, wl] = await Promise.all([
        supabase.rpc("admin_overview"),
        supabase.rpc("admin_users_list"),
        supabase.rpc("admin_trades_agg"),
        supabase.rpc("admin_trades_list", { _limit: 5000, _offset: 0, _status: null, _demo: null }),
        supabase.rpc("admin_new_users_series"),
        supabase.rpc("admin_feedback_list"),
        supabase.rpc("admin_waitlist_list", { _limit: 500 }),
      ]);
      for (const r of [ov, ul, ta, tl, nus, fb, wl]) if (r.error) throw r.error;
      setOverview(ov.data || null);
      setUsersList(ul.data || []);
      setTradesAgg(ta.data || null);
      setTradesList(tl.data || []);
      setNewUsersSeries(nus.data || []);
      setFeedback(fb.data || []);
      setWaitlist(wl.data || []);
      setSupaUp(true);
    } catch (e) {
      setSupaUp(false);
      toast.error("Load failed: " + (e?.message || "unknown"));
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Internal admin guard (parent already checks, but defend in depth). This only
  // gates UI visibility — the real enforcement is the is_admin() check in every RPC.
  const email = (authUser?.email || "").toLowerCase();
  const isAdmin = email === ADMIN_EMAIL || authUser?.app_metadata?.role === "admin";
  if (authUser && !isAdmin) return null;

  const reviewedSet = useMemo(() => new Set(readJSON(REVIEWED_FEEDBACK_KEY, [])), [feedback]);
  const unreadFeedbackCount = feedback.reduce((n, f) => {
    if (f.status === "resolved") return n;
    if (reviewedSet.has(f.id)) return n;
    return n + 1;
  }, 0);

  return (
    <div className="space-y-5 animate-fade-in" dir="ltr">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-500/25">
            <Shield size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-white flex items-center gap-2">
              Admin Console
              <Badge tone="rose">Restricted</Badge>
            </h1>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {authUser?.email || "—"} · {(overview?.total_trades ?? tradesList.length)} {pluralize(overview?.total_trades ?? tradesList.length, "trade", "trades")} · {usersList.length} {pluralize(usersList.length, "user", "users")} · {feedback.length} feedback
            </p>
          </div>
        </div>
        <button
          onClick={loadAll}
          disabled={loading}
          className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition border border-cyan-500/20 rounded-lg px-3 py-1.5 disabled:opacity-50"
        >
          <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
          Refresh all
        </button>
      </div>

      {supaUp === false && (
        <GapNote>Supabase is not reachable. Data may be missing or stale.</GapNote>
      )}

      {/* Tab nav */}
      <div className="flex items-center gap-1 border-b border-[var(--border-subtle)] dark:border-white/[0.06] overflow-x-auto">
        {TAB_DEFS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          const showBadge = id === "feedback" && unreadFeedbackCount > 0;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold tracking-wide transition border-b-2 whitespace-nowrap ${
                active ? "text-white border-rose-400" : "text-slate-500 border-transparent hover:text-slate-300"
              }`}
            >
              <Icon size={13} />
              {label}
              {showBadge && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-mono">
                  {unreadFeedbackCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab bodies */}
      {tab === "overview" && <OverviewTab overview={overview} series={newUsersSeries} users={usersList} waitlist={waitlist} loading={loading} toast={toast} onMutate={loadAll} />}
      {tab === "users"    && <UsersTab users={usersList} feedback={feedback} toast={toast} onMutate={loadAll} />}
      {tab === "trades"   && <TradesTab tradesList={tradesList} agg={tradesAgg} toast={toast} onMutate={loadAll} />}
      {tab === "feedback" && <FeedbackTab feedback={feedback} setFeedback={setFeedback} toast={toast} />}
      {tab === "system"   && <SystemTab agg={tradesAgg} totalTrades={overview?.total_trades ?? tradesList.length} feedbackCount={feedback.length} supaUp={supaUp} toast={toast} onMutate={loadAll} />}
      {tab === "logs"     && <LogsTab tradesList={tradesList} feedback={feedback} />}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  TAB 1 — Overview
// ════════════════════════════════════════════════════════════════════════════

function OverviewTab({ overview, series, users, waitlist = [], loading, toast, onMutate }) {
  const totalUsers = overview?.total_users ?? 0;
  const activeUsers = overview?.active_30d ?? 0;
  const totalTrades = overview?.total_trades ?? 0;
  const avgTradesPerUser = overview?.avg_trades_user != null ? Number(overview.avg_trades_user).toFixed(1) : "0";
  const newUsersThisWeek = overview?.new_users_week ?? 0;
  const tradesThisWeek = overview?.trades_week ?? 0;
  const waitlistCount = overview?.waitlist_count ?? null;

  const chartData = useMemo(
    () => (series || []).map((s) => ({ week: formatWeekLabel(s.week_start), count: s.count })),
    [series]
  );

  const topUsers = useMemo(
    () => [...users].sort((a, b) => (b.trade_count || 0) - (a.trade_count || 0)).slice(0, 5),
    [users]
  );

  const pendingCount = useMemo(
    () => waitlist.reduce((n, w) => (w.approved_at ? n : n + 1), 0),
    [waitlist]
  );

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-sm font-bold text-white">Overview</h2>
        <p className="text-[11px] text-slate-500">Live KPIs and platform health, computed server-side via <code className="text-slate-400">admin_overview()</code> (aggregates only).</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <KpiCard label="Total users" value={totalUsers} accent="cyan" icon={UsersIcon} sub="distinct accounts" loading={loading} />
        <KpiCard label="Active (30d)" value={activeUsers} accent="emerald" icon={Activity} sub={`${totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(0) : 0}% of all`} loading={loading} />
        <KpiCard label="Total trades" value={totalTrades.toLocaleString()} accent="violet" icon={BookOpen} loading={loading} />
        <KpiCard label="Avg trades / user" value={avgTradesPerUser} accent="amber" icon={TrendingUp} loading={loading} />
        <KpiCard label="New users this week" value={newUsersThisWeek} accent="rose" icon={Calendar} loading={loading} />
        <KpiCard label="Trades this week" value={tradesThisWeek} accent="slate" icon={Zap} loading={loading} />
        <KpiCard label="Waitlist" value={waitlistCount == null ? "—" : Number(waitlistCount).toLocaleString()} accent="emerald" icon={Mail} sub={`${pendingCount} ממתינים לאישור`} loading={loading} />
      </div>

      <div className="bg-[var(--bg-elevated)] dark:bg-[#0d1424] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-white tracking-wide uppercase">New users per week</h3>
          <span className="text-[10px] text-slate-500">last 7 weeks</span>
        </div>
        <div className="h-56">
          {loading ? (
            <div className="flex items-center justify-center h-full text-slate-600 text-xs">
              <RefreshCw size={14} className="animate-spin mr-2" /> Loading…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="week" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <RTooltip
                  contentStyle={{ background: "#0d1424", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                  cursor={{ fill: "rgba(34,211,238,0.08)" }}
                />
                <Bar dataKey="count" fill="#22d3ee" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <p className="text-[10px] text-slate-600 mt-2">
          Real new-user counts from <code>auth.users.created_at</code>, bucketed by week (server-side).
        </p>
      </div>

      <div className="bg-[var(--bg-elevated)] dark:bg-[#0d1424] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-2xl p-4">
        <h3 className="text-xs font-bold text-white tracking-wide uppercase mb-3">Top 5 active users</h3>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-600 border-b border-[var(--border-subtle)] dark:border-white/[0.06] text-[10px] tracking-widest uppercase">
              <th className="p-2 text-left font-semibold">Email</th>
              <th className="p-2 text-right font-semibold">Trades</th>
              <th className="p-2 text-left font-semibold">Last active</th>
              <th className="p-2 text-left font-semibold">Joined</th>
            </tr>
          </thead>
          <tbody>
            {topUsers.map((u) => (
              <tr key={u.user_id} className="border-b border-white/[0.04]">
                <td className="p-2 font-mono text-slate-200">{u.email || u.user_id?.slice(0, 8) || "—"}</td>
                <td className="p-2 font-mono text-right text-cyan-400 tabular-nums">{u.trade_count}</td>
                <td className="p-2 font-mono text-[11px] text-slate-500">{formatDateTime(u.last_active)}</td>
                <td className="p-2 font-mono text-[11px] text-slate-500">{formatDate(u.created_at)}</td>
              </tr>
            ))}
            {topUsers.length === 0 && (
              <tr><td colSpan={4} className="p-6 text-center text-slate-600 text-xs">No data yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <WaitlistTable waitlist={waitlist} loading={loading} toast={toast} onMutate={onMutate} />
    </div>
  );
}

// Waitlist approval gate — pending rows are selectable; approving sets
// approved_at server-side. Approval marks entry only; no email is sent here.
function WaitlistTable({ waitlist = [], loading, toast, onMutate }) {
  const confirm = useConfirm();
  const [selected, setSelected] = useState(() => new Set());
  const [busy, setBusy] = useState(false);

  const pendingIds = useMemo(
    () => waitlist.filter((w) => !w.approved_at).map((w) => w.id),
    [waitlist]
  );
  const allPendingSelected = pendingIds.length > 0 && pendingIds.every((id) => selected.has(id));

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected(allPendingSelected ? new Set() : new Set(pendingIds));

  const approve = async () => {
    const ids = [...selected];
    if (!ids.length) return;
    const ok = await confirm({
      title: "אישור נבחרים",
      message: `לאשר ${ids.length} נרשמים? פעולה חד-כיוונית (אין ביטול אישור). לא נשלח אימייל בשלב זה.`,
      confirmText: "אשר",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("admin_waitlist_approve", { _ids: ids });
      if (error) throw error;
      toast.success(`אושרו ${data ?? 0} נרשמים`);
      setSelected(new Set());
      await onMutate?.();
    } catch (e) {
      toast.error("אישור נכשל: " + (e?.message || "unknown"));
    }
    setBusy(false);
  };

  const exportCsv = () =>
    downloadCSV(
      waitlist,
      `waitlist-${new Date().toISOString().slice(0, 10)}.csv`,
      ["email", "source", "campaign", "created_at", "approved_at"]
    );

  return (
    <div className="bg-[var(--bg-elevated)] dark:bg-[#0d1424] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <h3 className="text-xs font-bold text-white tracking-wide uppercase">Waitlist</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={approve}
            disabled={busy || selected.size === 0}
            className="flex items-center gap-1 text-[10px] text-emerald-400 border border-emerald-500/30 rounded-lg px-2.5 py-1.5 hover:bg-emerald-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
          ><CheckCircle2 size={11} /> אשר נבחרים ({selected.size})</button>
          <button
            onClick={exportCsv}
            disabled={waitlist.length === 0}
            className="flex items-center gap-1 text-[10px] text-cyan-400 border border-cyan-500/30 rounded-lg px-2.5 py-1.5 hover:bg-cyan-500/10 disabled:opacity-40"
          ><Download size={11} /> Export CSV</button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-600 border-b border-[var(--border-subtle)] dark:border-white/[0.06] text-[10px] tracking-widest uppercase">
              <th className="p-2 text-left font-semibold w-8">
                <input
                  type="checkbox"
                  className="w-3.5 h-3.5"
                  checked={allPendingSelected}
                  onChange={toggleAll}
                  disabled={pendingIds.length === 0}
                  aria-label="select all pending"
                />
              </th>
              <th className="p-2 text-left font-semibold">Email</th>
              <th className="p-2 text-left font-semibold">Source</th>
              <th className="p-2 text-left font-semibold">Campaign</th>
              <th className="p-2 text-left font-semibold">Joined</th>
              <th className="p-2 text-left font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {waitlist.map((w) => {
              const approved = !!w.approved_at;
              return (
                <tr key={w.id} className="border-b border-white/[0.04]">
                  <td className="p-2">
                    {!approved && (
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5"
                        checked={selected.has(w.id)}
                        onChange={() => toggle(w.id)}
                        aria-label={`select ${w.email}`}
                      />
                    )}
                  </td>
                  <td className="p-2 font-mono text-slate-200">{w.email || "—"}</td>
                  <td className="p-2 font-mono text-[11px] text-slate-500">{w.source || "—"}</td>
                  <td className="p-2 font-mono text-[11px] text-slate-500">{w.campaign || "—"}</td>
                  <td className="p-2 font-mono text-[11px] text-slate-500">{formatDate(w.created_at)}</td>
                  <td className="p-2">
                    <Badge tone={approved ? "emerald" : "amber"}>{approved ? "מאושר" : "ממתין"}</Badge>
                  </td>
                </tr>
              );
            })}
            {waitlist.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-600 text-xs">
                  {loading ? "Loading…" : "No data yet"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  TAB 2 — Users
// ════════════════════════════════════════════════════════════════════════════

function UsersTab({ users, feedback, toast, onMutate }) {
  const confirm = useConfirm();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all"); // all | active | inactive
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null); // { user } — feedback viewer
  const [pwGate, setPwGate] = useState(null); // { user, kind: 'delete' }
  const [banned, setBanned] = useState(() => new Set(readJSON(BANNED_USERS_KEY, [])));

  const PER_PAGE = 20;

  const filtered = useMemo(() => {
    let list = users;
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((u) => (u.email || "").toLowerCase().includes(q) || (u.user_id || "").toLowerCase().includes(q));
    }
    if (filter === "active") list = list.filter((u) => isWithinDays(u.last_active, 30));
    if (filter === "inactive") list = list.filter((u) => !isWithinDays(u.last_active, 30));
    return [...list].sort((a, b) => (b.last_active || "").localeCompare(a.last_active || ""));
  }, [users, query, filter]);

  useEffect(() => { setPage(1); }, [query, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageRows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const toggleBan = useCallback((email) => {
    if (!email) return;
    const next = new Set(banned);
    if (next.has(email)) {
      next.delete(email);
      toast.info(`${email} unbanned (local only)`);
    } else {
      next.add(email);
      toast.success(`${email} added to ban list (local only — auth ban requires Supabase dashboard)`);
    }
    setBanned(next);
    writeJSON(BANNED_USERS_KEY, Array.from(next));
  }, [banned, toast]);

  const askDeleteUserData = (user) => {
    confirm({
      title: "Delete user data",
      message: `This will delete all trades and feedback for ${user.email || user.user_id}. The auth account itself will remain (use Supabase dashboard to remove it).`,
      confirmText: "Continue",
      cancelText: "Cancel",
      danger: true,
    }).then((ok) => { if (ok) setPwGate({ user, kind: "delete" }); });
  };

  const executeDelete = async () => {
    const user = pwGate?.user;
    if (!user || !supabase) return;
    try {
      if (!user.user_id) throw new Error("Missing user id");
      const { error } = await supabase.rpc("admin_delete_user_data", { _target: user.user_id });
      if (error) throw error;
      toast.success("User data deleted");
      setPwGate(null);
      onMutate?.();
    } catch (e) {
      toast.error("Delete failed: " + (e?.message || ""));
      setPwGate(null);
    }
  };

  return (
    <div className="space-y-3">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-bold text-white">Users</h2>
          <p className="text-[11px] text-slate-500">Real accounts from <code className="text-slate-400">auth.users</code> via <code className="text-slate-400">admin_users_list()</code>. {filtered.length} of {users.length} shown.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={12} className="absolute top-1/2 -translate-y-1/2 left-2 text-slate-600" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search email…"
              className="bg-white/5 border border-white/10 rounded-lg pl-7 pr-2 py-1.5 text-[11px] text-white placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none w-48 font-mono"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white focus:border-cyan-500/50 focus:outline-none"
          >
            <option value="all">All</option>
            <option value="active">Active (30d)</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </header>

      <div className="bg-[var(--bg-elevated)] dark:bg-[#0d1424] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-600 border-b border-[var(--border-subtle)] dark:border-white/[0.06] text-[10px] tracking-widest uppercase bg-white/[0.02]">
                <th className="p-2 text-left font-semibold">Email</th>
                <th className="p-2 text-left font-semibold">Joined</th>
                <th className="p-2 text-left font-semibold">Last activity</th>
                <th className="p-2 text-right font-semibold">Trades</th>
                <th className="p-2 text-left font-semibold">Provider</th>
                <th className="p-2 text-left font-semibold">Status</th>
                <th className="p-2 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((u) => {
                const active = isWithinDays(u.last_active, 30);
                const isBanned = u.email && banned.has(u.email);
                return (
                  <tr key={u.user_id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="p-2 font-mono text-slate-200" title={u.email || u.user_id}>
                      {shortEmail(u.email) || (u.user_id ? u.user_id.slice(0, 8) + "…" : "—")}
                      {isBanned && <Badge tone="rose">Banned</Badge>}
                    </td>
                    <td className="p-2 font-mono text-[11px] text-slate-500">{formatDate(u.created_at)}</td>
                    <td className="p-2 font-mono text-[11px] text-slate-500">{formatDateTime(u.last_active)}</td>
                    <td className="p-2 font-mono text-right text-cyan-400 tabular-nums">{u.trade_count}</td>
                    <td className="p-2 font-mono text-[11px] text-slate-400">{u.provider || "—"}</td>
                    <td className="p-2">
                      <Badge tone={active ? "emerald" : "slate"}>{active ? "Active" : "Inactive"}</Badge>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setModal({ user: u })}
                          title="View feedback"
                          className="p-1.5 rounded border border-violet-500/30 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20"
                        ><MessageCircle size={11} /></button>
                        <button
                          onClick={() => toggleBan(u.email)}
                          disabled={!u.email}
                          title="Toggle ban (local only)"
                          className="p-1.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 disabled:opacity-30 disabled:cursor-not-allowed"
                        ><Ban size={11} /></button>
                        <button
                          onClick={() => askDeleteUserData(u)}
                          title="Delete user data"
                          className="p-1.5 rounded border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                        ><Trash2 size={11} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {pageRows.length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-slate-600 text-xs">No users match</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between p-3 border-t border-[var(--border-subtle)] dark:border-white/[0.06]">
          <span className="text-[10px] text-slate-500 font-mono">
            {pageRows.length ? `${(page - 1) * PER_PAGE + 1}–${(page - 1) * PER_PAGE + pageRows.length}` : "0"} of {filtered.length}
          </span>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      </div>

      {/* Feedback viewer (trade content is never exposed to the admin panel) */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal ? `Feedback — ${modal.user.email || modal.user.user_id}` : ""}
        wide
      >
        {modal && <UserFeedbackView user={modal.user} feedback={feedback} />}
      </Modal>

      <PasswordGate
        open={!!pwGate}
        onClose={() => setPwGate(null)}
        onConfirm={executeDelete}
        title="Confirm — delete user data"
        message={pwGate ? `Re-enter your password to delete all data for ${pwGate.user.email || pwGate.user.user_id}.` : ""}
      />
    </div>
  );
}

function UserFeedbackView({ user, feedback }) {
  const list = useMemo(() => feedback.filter((f) =>
    (user.email && f.user_email === user.email) ||
    (user.user_id && f.user_id === user.user_id)
  ), [feedback, user]);
  if (!list.length) return <p className="text-xs text-slate-500">No feedback from this user.</p>;
  const emoji = { bug: "🐛", idea: "💡", love: "⭐", question: "❓" };
  return (
    <div className="space-y-2">
      {list.map((f) => (
        <div key={f.id} className="bg-white/3 border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-lg p-3">
          <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-1">
            <span>{emoji[f.type] || "💬"}</span>
            <span>{formatDateTime(f.created_at)}</span>
            {f.status === "resolved" && <Badge tone="emerald">Resolved</Badge>}
          </div>
          <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">{f.message}</p>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  TAB 3 — Trades
// ════════════════════════════════════════════════════════════════════════════

function TradesTab({ tradesList, agg, toast, onMutate }) {
  const confirm = useConfirm();
  const [filters, setFilters] = useState({
    email: "", from: "", to: "", status: "all", hideDemo: false,
  });
  const [page, setPage] = useState(1);
  const PER_PAGE = 50;

  // tradesList is metadata only (no ticker/entry/exit/pnl/notes). Filtering
  // happens client-side on the already-privacy-scrubbed rows.
  const filtered = useMemo(() => {
    let list = tradesList;
    if (filters.hideDemo) list = list.filter((t) => !t.is_demo);
    if (filters.email) list = list.filter((t) =>
      (t.user_id || "").toLowerCase().includes(filters.email.toLowerCase()) ||
      (t.user_email || "").toLowerCase().includes(filters.email.toLowerCase())
    );
    if (filters.status !== "all") list = list.filter((t) => t.status === filters.status);
    if (filters.from) list = list.filter((t) => (t.trade_date || t.created_at || "") >= filters.from);
    if (filters.to) list = list.filter((t) => (t.trade_date || t.created_at || "") <= filters.to + "T23:59:59");
    return list;
  }, [tradesList, filters]);

  useEffect(() => { setPage(1); }, [filters]);

  // Platform-wide stats come from admin_trades_agg() — computed in the DB, only
  // aggregate scalars ever leave the server.
  const stats = {
    total: agg?.total ?? 0,
    winRate: agg?.win_rate == null ? "—" : `${agg.win_rate}%`,
    avgPnl: agg?.avg_pnl == null ? "—" : `$${agg.avg_pnl}`,
    topTicker: agg?.top_ticker || "—",
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageRows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const deleteTrade = async (t) => {
    const ok = await confirm({
      title: "Delete trade", message: `Remove trade from ${t.trade_date || formatDate(t.created_at)} (${t.user_email || t.user_id || "—"})?`,
      confirmText: "Delete", cancelText: "Cancel", danger: true,
    });
    if (!ok) return;
    try {
      const { error } = await supabase.rpc("admin_delete_trade", { _id: t.id });
      if (error) throw error;
      toast.success("Trade deleted");
      onMutate?.();
    } catch (e) {
      toast.error("Delete failed: " + (e?.message || ""));
    }
  };

  // CSV is metadata-only — mirrors the privacy contract of admin_trades_list.
  const exportCols = ["id", "user_email", "trade_date", "status", "is_demo", "has_stop", "has_setup"];
  const toCsvRow = (t) => ({
    id: t.id, user_email: t.user_email || "", trade_date: t.trade_date || "",
    status: t.status, is_demo: t.is_demo ? "true" : "false",
    has_stop: t.has_stop ? "true" : "false", has_setup: t.has_setup ? "true" : "false",
  });

  return (
    <div className="space-y-3">
      <header>
        <h2 className="text-sm font-bold text-white">Trades</h2>
        <p className="text-[11px] text-slate-500">Moderation metadata only — no ticker, price, P&amp;L, or notes. {filtered.length} rows after filters.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total (platform)" value={stats.total.toLocaleString()} accent="cyan" />
        <KpiCard label="Win rate" value={stats.winRate} accent="emerald" />
        <KpiCard label="Avg P&L" value={stats.avgPnl} accent="violet" />
        <KpiCard label="Top ticker" value={stats.topTicker} accent="amber" />
      </div>

      <div className="bg-[var(--bg-elevated)] dark:bg-[#0d1424] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-xl p-3 flex flex-wrap items-center gap-2">
        <input
          value={filters.email}
          onChange={(e) => setFilters((f) => ({ ...f, email: e.target.value }))}
          placeholder="user id / email…"
          className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none w-40 font-mono"
        />
        <input
          type="date"
          value={filters.from}
          onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
          className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white focus:border-cyan-500/50 focus:outline-none"
        />
        <span className="text-[10px] text-slate-600">→</span>
        <input
          type="date"
          value={filters.to}
          onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
          className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white focus:border-cyan-500/50 focus:outline-none"
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white focus:border-cyan-500/50 focus:outline-none"
        >
          <option value="all">All</option>
          <option value="OPEN">OPEN</option>
          <option value="CLOSED">CLOSED</option>
        </select>
        <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.hideDemo}
            onChange={(e) => setFilters((f) => ({ ...f, hideDemo: e.target.checked }))}
            className="w-3.5 h-3.5"
          />
          Hide demo
        </label>
        <div className="flex-1" />
        <button
          onClick={() => downloadCSV(tradesList.map(toCsvRow), `swing-edge-trades-all-${new Date().toISOString().slice(0, 10)}.csv`, exportCols)}
          className="flex items-center gap-1 text-[10px] text-emerald-400 border border-emerald-500/30 rounded-lg px-2.5 py-1.5 hover:bg-emerald-500/10"
        ><Download size={11} /> All CSV</button>
        <button
          onClick={() => downloadCSV(filtered.map(toCsvRow), `swing-edge-trades-filtered-${new Date().toISOString().slice(0, 10)}.csv`, exportCols)}
          className="flex items-center gap-1 text-[10px] text-cyan-400 border border-cyan-500/30 rounded-lg px-2.5 py-1.5 hover:bg-cyan-500/10"
        ><Download size={11} /> Filtered CSV</button>
      </div>

      <div className="bg-[var(--bg-elevated)] dark:bg-[#0d1424] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-600 border-b border-[var(--border-subtle)] dark:border-white/[0.06] text-[10px] tracking-widest uppercase bg-white/[0.02]">
                <th className="p-2 text-left">User</th>
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Demo</th>
                <th className="p-2 text-center">Stop</th>
                <th className="p-2 text-center">Setup</th>
                <th className="p-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((t) => (
                <tr key={t.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="p-2 font-mono text-[10px] text-slate-400" title={t.user_id}>
                    {t.user_email || (t.user_id ? t.user_id.slice(0, 8) + "…" : "—")}
                  </td>
                  <td className="p-2 font-mono text-[10px] text-slate-500">{t.trade_date || formatDate(t.created_at)}</td>
                  <td className="p-2 text-[11px]">{t.status}</td>
                  <td className="p-2">{t.is_demo ? <Badge tone="amber">Demo</Badge> : <span className="text-slate-600 text-[11px]">—</span>}</td>
                  <td className="p-2 text-center">{t.has_stop ? <span className="text-emerald-400">✓</span> : <span className="text-slate-600">—</span>}</td>
                  <td className="p-2 text-center">{t.has_setup ? <span className="text-emerald-400">✓</span> : <span className="text-slate-600">—</span>}</td>
                  <td className="p-2 text-right">
                    <button
                      onClick={() => deleteTrade(t)}
                      title="Delete"
                      className="p-1.5 rounded border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                    ><Trash2 size={11} /></button>
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-slate-600 text-xs">No trades match</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between p-3 border-t border-[var(--border-subtle)] dark:border-white/[0.06]">
          <span className="text-[10px] text-slate-500 font-mono">
            {pageRows.length ? `${(page - 1) * PER_PAGE + 1}–${(page - 1) * PER_PAGE + pageRows.length}` : "0"} of {filtered.length}
          </span>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  TAB 4 — Feedback
// ════════════════════════════════════════════════════════════════════════════

function FeedbackTab({ feedback, setFeedback, toast }) {
  const confirm = useConfirm();
  const [reviewed, setReviewed] = useState(() => new Set(readJSON(REVIEWED_FEEDBACK_KEY, [])));
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const persistReviewed = (set) => {
    setReviewed(new Set(set));
    writeJSON(REVIEWED_FEEDBACK_KEY, Array.from(set));
  };

  const getStatus = (f) => {
    if (f.status === "resolved") return "resolved";
    if (reviewed.has(f.id)) return "reviewed";
    return "new";
  };

  const filtered = useMemo(() => {
    let list = feedback;
    if (filterType !== "all") list = list.filter((f) => f.type === filterType);
    if (filterStatus !== "all") list = list.filter((f) => getStatus(f) === filterStatus);
    return list;
  }, [feedback, filterType, filterStatus, reviewed]);

  const markReviewed = (id) => {
    const next = new Set(reviewed);
    if (next.has(id)) next.delete(id); else next.add(id);
    persistReviewed(next);
  };

  const markResolved = async (id, resolved) => {
    try {
      const nextStatus = resolved ? "resolved" : "new";
      const { data, error } = await supabase.rpc("admin_set_feedback_status", { _id: id, _status: nextStatus });
      if (error) throw error;
      if (!data) throw new Error("No rows updated (check permissions)");
      setFeedback((rs) => rs.map((r) => (r.id === id ? { ...r, status: nextStatus } : r)));
      toast.success(resolved ? "Resolved ✓" : "Reopened");
    } catch (e) {
      toast.error("Update failed: " + (e?.message || ""));
    }
  };

  const remove = async (id) => {
    const ok = await confirm({
      title: "Delete feedback", message: "Permanently remove this entry?",
      confirmText: "Delete", cancelText: "Cancel", danger: true,
    });
    if (!ok) return;
    try {
      const { error } = await supabase.rpc("admin_delete_feedback", { _id: id });
      if (error) throw error;
      setFeedback((rs) => rs.filter((r) => r.id !== id));
      toast.success("Deleted");
    } catch (e) {
      toast.error("Delete failed: " + (e?.message || ""));
    }
  };

  const counts = useMemo(() => ({
    new: feedback.filter((f) => getStatus(f) === "new").length,
    reviewed: feedback.filter((f) => getStatus(f) === "reviewed").length,
    resolved: feedback.filter((f) => getStatus(f) === "resolved").length,
  }), [feedback, reviewed]);

  const typeEmoji = { bug: "🐛", idea: "💡", love: "⭐", question: "❓" };
  const statusTone = { new: "rose", reviewed: "amber", resolved: "emerald" };

  return (
    <div className="space-y-3">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-bold text-white">Feedback</h2>
          <p className="text-[11px] text-slate-500">
            <Badge tone="rose">{counts.new}</Badge> new · <Badge tone="amber">{counts.reviewed}</Badge> reviewed · <Badge tone="emerald">{counts.resolved}</Badge> resolved
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white focus:border-cyan-500/50 focus:outline-none">
            <option value="all">All status</option>
            <option value="new">New</option>
            <option value="reviewed">Reviewed</option>
            <option value="resolved">Resolved</option>
          </select>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white focus:border-cyan-500/50 focus:outline-none">
            <option value="all">All types</option>
            <option value="bug">🐛 bug</option>
            <option value="idea">💡 idea</option>
            <option value="love">⭐ love</option>
            <option value="question">❓ question</option>
          </select>
        </div>
      </header>

      <div className="space-y-2">
        {filtered.map((f) => {
          const status = getStatus(f);
          return (
            <div key={f.id} className="bg-[var(--bg-elevated)] dark:bg-[#0d1424] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-xl p-3">
              <div className="flex items-start gap-3 flex-wrap">
                <div className="text-xl">{typeEmoji[f.type] || "💬"}</div>
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[11px] font-mono text-cyan-300">{f.user_email || "anonymous"}</span>
                    <span className="text-[10px] text-slate-500">{formatDateTime(f.created_at)}</span>
                    <Badge tone={statusTone[status]}>{status}</Badge>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">{f.message}</p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    onClick={() => markReviewed(f.id)}
                    title="Mark as reviewed (local)"
                    className={`text-[10px] px-2 py-1 rounded border ${reviewed.has(f.id) ? "bg-amber-500/20 border-amber-500/40 text-amber-200" : "bg-white/5 border-white/10 text-slate-400 hover:text-white"}`}
                  >Reviewed</button>
                  <button
                    onClick={() => markResolved(f.id, f.status !== "resolved")}
                    className={`text-[10px] px-2 py-1 rounded border ${f.status === "resolved" ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-200" : "bg-white/5 border-white/10 text-slate-400 hover:text-white"}`}
                  >{f.status === "resolved" ? "✓ Resolved" : "Resolve"}</button>
                  <button
                    onClick={() => remove(f.id)}
                    title="Delete"
                    className="text-[10px] px-2 py-1 rounded border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 flex items-center justify-center gap-1"
                  ><Trash2 size={10} /> Delete</button>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="p-6 text-center text-slate-600 text-xs">No feedback matches.</div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  TAB 5 — System
// ════════════════════════════════════════════════════════════════════════════

function SystemTab({ agg, totalTrades, feedbackCount, supaUp, toast, onMutate }) {
  const confirm = useConfirm();
  const [flags, setFlags] = useState(() => ({ ...DEFAULT_FLAGS, ...readJSON(FEATURE_FLAGS_KEY, {}) }));
  const [pwGate, setPwGate] = useState(null); // 'clearDemos'
  const [healthTick, setHealthTick] = useState(0);
  const [health, setHealth] = useState({ ok: supaUp, latency: null });

  const demoCount = agg?.demo_count ?? 0;

  // Ping supabase every 30s
  useEffect(() => {
    let cancelled = false;
    const ping = async () => {
      if (!supabase) { if (!cancelled) setHealth({ ok: false, latency: null }); return; }
      const t0 = performance.now();
      try {
        const { error } = await supabase.from("trades").select("id", { count: "exact", head: true }).limit(1);
        const dt = Math.round(performance.now() - t0);
        if (!cancelled) setHealth({ ok: !error, latency: dt });
      } catch {
        if (!cancelled) setHealth({ ok: false, latency: null });
      }
    };
    ping();
    const id = setInterval(() => setHealthTick((n) => n + 1), 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, [healthTick]);

  const saveFlag = (key, value) => {
    const next = { ...flags, [key]: value };
    setFlags(next);
    writeJSON(FEATURE_FLAGS_KEY, next);
    toast.success(`Flag "${key}" saved`);
  };

  const askClearDemos = async () => {
    const ok = await confirm({
      title: "Clear demo trades",
      message: `Permanently delete all ${demoCount} demo trades across all users?`,
      confirmText: "Continue", cancelText: "Cancel", danger: true,
    });
    if (ok) setPwGate("clearDemos");
  };

  const executeClearDemos = async () => {
    try {
      const { error } = await supabase.rpc("admin_delete_demo_trades");
      if (error) throw error;
      toast.success("Demo trades cleared");
      setPwGate(null);
      onMutate?.();
    } catch (e) {
      toast.error("Clear failed: " + (e?.message || ""));
      setPwGate(null);
    }
  };

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-sm font-bold text-white">System</h2>
        <p className="text-[11px] text-slate-500">App-wide controls — demo data, feature flags, and health.</p>
      </header>

      {/* 5.1 Demo Trades */}
      <section className="bg-[var(--bg-elevated)] dark:bg-[#0d1424] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white tracking-wide uppercase">Demo trades</h3>
          <span className="text-[11px] text-slate-400 font-mono">{demoCount} in DB</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            disabled
            title="Reload requires the app's seed function — out of scope for the admin panel"
            className="flex items-center gap-1 text-[11px] px-3 py-2 rounded-lg border border-slate-500/20 bg-slate-500/5 text-slate-500 cursor-not-allowed"
          >
            <RefreshCw size={11} /> Reload demo trades
          </button>
          <button
            onClick={askClearDemos}
            disabled={demoCount === 0}
            className="flex items-center gap-1 text-[11px] px-3 py-2 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Trash2 size={11} /> Clear all demo trades
          </button>
        </div>
        <GapNote>
          "Reload" runs from the app at sign-in; the admin panel doesn't import the seed function. Use the sign-in flow to re-seed.
        </GapNote>
      </section>

      {/* 5.2 Feature flags */}
      <section className="bg-[var(--bg-elevated)] dark:bg-[#0d1424] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-xl p-4 space-y-3">
        <h3 className="text-xs font-bold text-white tracking-wide uppercase">Feature flags</h3>
        <p className="text-[10px] text-slate-600">Stored in localStorage (this admin's browser only). Server-side sync is out of scope.</p>
        <FlagRow label="Beta badge" desc="Show 'Beta' label across the app" value={flags.betaBadge} onChange={(v) => saveFlag("betaBadge", v)} />
        <FlagRow label="Feedback tab" desc="Expose the Feedback tab to all users" value={flags.feedbackTab} onChange={(v) => saveFlag("feedbackTab", v)} />
        <FlagRow label="Maintenance mode" desc="Display a maintenance banner site-wide" value={flags.maintenanceMode} onChange={(v) => saveFlag("maintenanceMode", v)} danger />
        <div className="flex items-center justify-between gap-2 py-2 border-t border-white/[0.04]">
          <div>
            <div className="text-[12px] text-slate-200 font-semibold">Max trades / user (Free tier)</div>
            <div className="text-[10px] text-slate-500">Hard cap enforced client-side</div>
          </div>
          <input
            type="number" min="0" max="100000"
            value={flags.maxTradesPerUser}
            onChange={(e) => saveFlag("maxTradesPerUser", Number(e.target.value) || 0)}
            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white w-24 text-right font-mono focus:border-cyan-500/50 focus:outline-none"
          />
        </div>
      </section>

      {/* 5.3 App health */}
      <section className="bg-[var(--bg-elevated)] dark:bg-[#0d1424] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-xl p-4 space-y-3">
        <h3 className="text-xs font-bold text-white tracking-wide uppercase">App health</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <HealthRow
            icon={Database}
            label="Supabase"
            ok={health.ok}
            detail={health.ok ? `${health.latency ?? "?"}ms` : "Not reachable"}
          />
          <HealthRow
            icon={BookOpen}
            label="Trades rows"
            ok
            detail={`${Number(totalTrades || 0).toLocaleString()}`}
          />
          <HealthRow
            icon={MessageCircle}
            label="Feedback rows"
            ok
            detail={`${Number(feedbackCount || 0).toLocaleString()}`}
          />
        </div>
        <GapNote>
          Last-deploy time requires the Vercel API. Open Vercel directly for build/deploy history.
        </GapNote>
      </section>

      <PasswordGate
        open={pwGate === "clearDemos"}
        onClose={() => setPwGate(null)}
        onConfirm={executeClearDemos}
        title="Confirm — clear demo trades"
        message="Re-enter your password to delete every row in the trades table where is_demo = true."
      />
    </div>
  );
}

function FlagRow({ label, desc, value, onChange, danger }) {
  return (
    <div className="flex items-center justify-between gap-2 py-2 border-t border-white/[0.04]">
      <div>
        <div className={`text-[12px] font-semibold ${danger ? "text-rose-200" : "text-slate-200"}`}>{label}</div>
        <div className="text-[10px] text-slate-500">{desc}</div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-10 h-5 rounded-full transition ${value ? (danger ? "bg-rose-500" : "bg-emerald-500") : "bg-slate-700"}`}
        aria-pressed={value}
      >
        <span className={`absolute top-0.5 ${value ? "right-0.5" : "left-0.5"} w-4 h-4 rounded-full bg-white shadow transition-all`} />
      </button>
    </div>
  );
}

function HealthRow({ icon: Icon, label, ok, detail }) {
  return (
    <div className="bg-white/[0.02] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-lg p-3 flex items-center gap-3">
      <Icon size={14} className={ok ? "text-emerald-400" : "text-rose-400"} />
      <div className="flex-1">
        <div className="text-[11px] text-slate-300 font-semibold">{label}</div>
        <div className="text-[10px] text-slate-500 font-mono">{detail}</div>
      </div>
      <span className={`w-2 h-2 rounded-full ${ok ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  TAB 6 — Logs (synthesized feed)
// ════════════════════════════════════════════════════════════════════════════

function LogsTab({ tradesList, feedback }) {
  const [filter, setFilter] = useState("all");
  const [tick, setTick] = useState(0);

  // Auto-refresh ticker every 60s (forces re-derivation; parent owns data refresh)
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const feed = useMemo(() => {
    const events = [];

    // Track first-seen user → "new user" event
    const firstSeen = new Map();
    [...tradesList].sort((a, b) => (a.created_at || "").localeCompare(b.created_at || "")).forEach((t) => {
      const k = t.user_id;
      if (!k || firstSeen.has(k) || !t.created_at) return;
      firstSeen.set(k, { ts: t.created_at, user: t.user_email || k });
    });
    [...feedback].sort((a, b) => (a.created_at || "").localeCompare(b.created_at || "")).forEach((f) => {
      const k = f.user_email || f.user_id;
      if (!k || firstSeen.has(k) || !f.created_at) return;
      firstSeen.set(k, { ts: f.created_at, user: f.user_email || f.user_id });
    });
    firstSeen.forEach((v) => {
      events.push({
        ts: v.ts, kind: "system", category: "system",
        actor: v.user, summary: "first activity — likely new user",
      });
    });

    tradesList.forEach((t) => {
      events.push({
        ts: t.created_at, kind: "trade", category: "trades",
        actor: t.user_email || t.user_id || "—",
        summary: "added trade",
      });
    });
    feedback.forEach((f) => {
      events.push({
        ts: f.created_at, kind: "feedback", category: "system",
        actor: f.user_email || f.user_id || "anon",
        summary: `submitted feedback (${f.type || "—"})`,
      });
    });

    return events
      .filter((e) => !!e.ts)
      .sort((a, b) => b.ts.localeCompare(a.ts))
      .slice(0, 200);
  }, [tradesList, feedback, tick]);

  const filtered = useMemo(() => {
    if (filter === "all") return feed;
    if (filter === "auth") return [];
    return feed.filter((e) => e.category === filter);
  }, [feed, filter]);

  const kindTone = { trade: "cyan", feedback: "violet", system: "amber" };
  const kindIcon = { trade: BookOpen, feedback: MessageCircle, system: Activity };

  return (
    <div className="space-y-3">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-bold text-white">Activity logs</h2>
          <p className="text-[11px] text-slate-500">Synthesized from <code className="text-slate-400">trades</code> + <code className="text-slate-400">feedback</code> timestamps. Last 200 events. Auto-refresh: 60s.</p>
        </div>
        <div className="flex items-center gap-1">
          {[
            { v: "all", label: "All" },
            { v: "trades", label: "Trades" },
            { v: "auth", label: "Auth", disabled: true },
            { v: "system", label: "System" },
          ].map((opt) => (
            <button
              key={opt.v}
              onClick={() => !opt.disabled && setFilter(opt.v)}
              disabled={opt.disabled}
              title={opt.disabled ? "Auth events require service_role" : undefined}
              className={`text-[10px] px-2 py-1 rounded border transition ${
                filter === opt.v && !opt.disabled
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                  : opt.disabled
                  ? "bg-white/3 text-slate-700 border-white/5 cursor-not-allowed"
                  : "bg-white/3 text-slate-400 border-white/10 hover:text-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </header>

      <GapNote>
        Auth events (sign-in / signup) aren't accessible with the anon key. "Auth" filter is disabled.
      </GapNote>

      <div className="bg-[var(--bg-elevated)] dark:bg-[#0d1424] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-xl overflow-hidden">
        <div className="max-h-[520px] overflow-y-auto divide-y divide-white/[0.04]">
          {filtered.length === 0 && (
            <div className="p-6 text-center text-slate-600 text-xs">No events</div>
          )}
          {filtered.map((e, idx) => {
            const Icon = kindIcon[e.kind] || Activity;
            return (
              <div key={idx} className="flex items-start gap-3 p-3 hover:bg-white/[0.02]">
                <Icon size={13} className={`mt-0.5 ${
                  e.kind === "trade" ? "text-cyan-400" :
                  e.kind === "feedback" ? "text-violet-400" : "text-amber-400"
                }`} />
                <span className="text-[10px] text-slate-600 font-mono shrink-0 w-32">{formatDateTime(e.ts)}</span>
                <span className="text-[10px] font-mono text-slate-300 shrink-0 max-w-[200px] truncate" title={e.actor}>{e.actor}</span>
                <Badge tone={kindTone[e.kind]}>{e.kind}</Badge>
                <span className="text-[11px] text-slate-300 flex-1">{e.summary}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
