import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Shield, LayoutDashboard, Users as UsersIcon, BookOpen, MessageCircle,
  Settings as SettingsIcon, ScrollText, RefreshCw, CheckCircle2, Trash2,
  Search, Ban, Download, ExternalLink, Activity, Eye, Lock, X,
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

function calcTradePnL(t) {
  if (!t || t.exit == null || t.entry == null || t.shares == null) return null;
  const e = Number(t.entry), x = Number(t.exit), s = Number(t.shares);
  if (Number.isNaN(e) || Number.isNaN(x) || Number.isNaN(s)) return null;
  return t.side === "LONG" ? (x - e) * s : (e - x) * s;
}

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

function startOfWeek(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

function bucketByWeek(timestamps, weeks = 7) {
  const thisWeek = startOfWeek(new Date());
  const buckets = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(thisWeek);
    start.setDate(start.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    buckets.push({
      week: `${start.getMonth() + 1}/${start.getDate()}`,
      start, end, count: 0,
    });
  }
  timestamps.forEach((ts) => {
    if (!ts) return;
    const d = new Date(ts);
    if (Number.isNaN(+d)) return;
    for (const b of buckets) {
      if (d >= b.start && d < b.end) { b.count++; break; }
    }
  });
  return buckets.map((b) => ({ week: b.week, count: b.count }));
}

function aggregateUsers(feedback, trades) {
  const idToEmail = new Map();
  feedback.forEach((f) => {
    if (f.user_id && f.user_email) idToEmail.set(f.user_id, f.user_email);
  });

  const map = new Map();
  function touch(userId, email, ts) {
    const key = email || userId;
    if (!key) return null;
    let u = map.get(key);
    if (!u) {
      u = {
        key,
        user_id: userId || null,
        email: email || null,
        trades: 0,
        feedback: 0,
        first: null,
        last: null,
      };
      map.set(key, u);
    }
    if (userId && !u.user_id) u.user_id = userId;
    if (email && !u.email) u.email = email;
    if (ts) {
      if (!u.first || ts < u.first) u.first = ts;
      if (!u.last || ts > u.last) u.last = ts;
    }
    return u;
  }

  feedback.forEach((f) => {
    const u = touch(f.user_id, f.user_email, f.created_at);
    if (u) u.feedback++;
  });
  trades.forEach((t) => {
    const email = idToEmail.get(t.user_id);
    const u = touch(t.user_id, email, t.createdAt);
    if (u) u.trades++;
  });

  return Array.from(map.values());
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
  const [trades, setTrades] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [waitlistCount, setWaitlistCount] = useState(null);
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

  // Initial data load (trades + feedback) — shared across tabs
  const loadAll = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) { setSupaUp(false); setLoading(false); return; }
    setLoading(true);
    try {
      const [tr, fb] = await Promise.all([
        supabase.from("trades").select("*").order("createdAt", { ascending: false }),
        supabase.from("feedback").select("*").order("created_at", { ascending: false }),
      ]);
      if (tr.error) throw tr.error;
      if (fb.error) throw fb.error;
      setTrades(tr.data || []);
      setFeedback(fb.data || []);
      setSupaUp(true);

      // Waitlist count (admin-only via RLS). Isolated so a miss here never
      // breaks the core dashboard — head:true fetches count without rows.
      const wl = await supabase
        .from("waitlist")
        .select("*", { count: "exact", head: true });
      setWaitlistCount(wl.error ? null : wl.count ?? 0);
    } catch (e) {
      setSupaUp(false);
      toast.error("Load failed: " + (e?.message || "unknown"));
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Internal admin guard (parent already checks, but defend in depth)
  const email = (authUser?.email || "").toLowerCase();
  const isAdmin = email === ADMIN_EMAIL || authUser?.app_metadata?.role === "admin";
  if (authUser && !isAdmin) return null;

  // Derived users list (cached via useMemo)
  const users = useMemo(() => aggregateUsers(feedback, trades), [feedback, trades]);

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
              {authUser?.email || "—"} · {trades.length} {pluralize(trades.length, "trade", "trades")} · {users.length} {pluralize(users.length, "user", "users")} · {feedback.length} feedback
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
      {tab === "overview" && <OverviewTab trades={trades} feedback={feedback} users={users} waitlistCount={waitlistCount} loading={loading} />}
      {tab === "users"    && <UsersTab users={users} trades={trades} feedback={feedback} toast={toast} onMutate={loadAll} />}
      {tab === "trades"   && <TradesTab trades={trades} toast={toast} onMutate={loadAll} />}
      {tab === "feedback" && <FeedbackTab feedback={feedback} setFeedback={setFeedback} toast={toast} />}
      {tab === "system"   && <SystemTab trades={trades} feedback={feedback} supaUp={supaUp} toast={toast} onMutate={loadAll} />}
      {tab === "logs"     && <LogsTab trades={trades} feedback={feedback} />}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  TAB 1 — Overview
// ════════════════════════════════════════════════════════════════════════════

function OverviewTab({ trades, feedback, users, waitlistCount, loading }) {
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => isWithinDays(u.last, 30)).length;
  const totalTrades = trades.length;
  const avgTradesPerUser = totalUsers > 0 ? (totalTrades / totalUsers).toFixed(1) : "0";
  const newUsersThisWeek = users.filter((u) => isWithinDays(u.first, 7)).length;
  const tradesThisWeek = trades.filter((t) => isWithinDays(t.createdAt, 7)).length;

  const chartData = useMemo(
    () => bucketByWeek(users.map((u) => u.first), 7),
    [users]
  );

  const topUsers = useMemo(
    () => [...users].sort((a, b) => b.trades - a.trades).slice(0, 5),
    [users]
  );

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-sm font-bold text-white">Overview</h2>
        <p className="text-[11px] text-slate-500">Live KPIs and platform health, computed from <code className="text-slate-400">trades</code> + <code className="text-slate-400">feedback</code> aggregation.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <KpiCard label="Total users" value={totalUsers} accent="cyan" icon={UsersIcon} sub="distinct accounts" loading={loading} />
        <KpiCard label="Active (30d)" value={activeUsers} accent="emerald" icon={Activity} sub={`${totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(0) : 0}% of all`} loading={loading} />
        <KpiCard label="Total trades" value={totalTrades.toLocaleString()} accent="violet" icon={BookOpen} loading={loading} />
        <KpiCard label="Avg trades / user" value={avgTradesPerUser} accent="amber" icon={TrendingUp} loading={loading} />
        <KpiCard label="New users this week" value={newUsersThisWeek} accent="rose" icon={Calendar} loading={loading} />
        <KpiCard label="Trades this week" value={tradesThisWeek} accent="slate" icon={Zap} loading={loading} />
        <KpiCard label="Waitlist" value={waitlistCount == null ? "—" : Number(waitlistCount).toLocaleString()} accent="emerald" icon={Mail} sub="landing signups" loading={loading} />
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
          Proxy: "new user" = first activity (trade or feedback) within that week. Requires service_role for real <code>auth.users.created_at</code>.
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
              <th className="p-2 text-left font-semibold">Joined (proxy)</th>
            </tr>
          </thead>
          <tbody>
            {topUsers.map((u) => (
              <tr key={u.key} className="border-b border-white/[0.04]">
                <td className="p-2 font-mono text-slate-200">{u.email || u.user_id?.slice(0, 8) || "—"}</td>
                <td className="p-2 font-mono text-right text-cyan-400 tabular-nums">{u.trades}</td>
                <td className="p-2 font-mono text-[11px] text-slate-500">{formatDateTime(u.last)}</td>
                <td className="p-2 font-mono text-[11px] text-slate-500">{formatDate(u.first)}</td>
              </tr>
            ))}
            {topUsers.length === 0 && (
              <tr><td colSpan={4} className="p-6 text-center text-slate-600 text-xs">No data yet</td></tr>
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

function UsersTab({ users, trades, feedback, toast, onMutate }) {
  const confirm = useConfirm();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all"); // all | active | inactive
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null); // { kind: 'trades'|'feedback', user }
  const [pwGate, setPwGate] = useState(null); // { user, kind: 'delete' }
  const [banned, setBanned] = useState(() => new Set(readJSON(BANNED_USERS_KEY, [])));

  const PER_PAGE = 20;

  const filtered = useMemo(() => {
    let list = users;
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((u) => (u.email || "").toLowerCase().includes(q) || (u.user_id || "").toLowerCase().includes(q));
    }
    if (filter === "active") list = list.filter((u) => isWithinDays(u.last, 30));
    if (filter === "inactive") list = list.filter((u) => !isWithinDays(u.last, 30));
    return [...list].sort((a, b) => (b.last || "").localeCompare(a.last || ""));
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
      if (user.user_id) {
        const dr1 = await supabase.from("trades").delete().eq("user_id", user.user_id);
        const dr2 = await supabase.from("feedback").delete().eq("user_id", user.user_id);
        if (dr1.error) throw dr1.error;
        if (dr2.error) throw dr2.error;
      } else if (user.email) {
        const dr = await supabase.from("feedback").delete().eq("user_email", user.email);
        if (dr.error) throw dr.error;
      }
      toast.success("User data deleted");
      setPwGate(null);
      onMutate?.();
    } catch (e) {
      toast.error("Delete failed (RLS?): " + (e?.message || ""));
      setPwGate(null);
    }
  };

  return (
    <div className="space-y-3">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-bold text-white">Users</h2>
          <p className="text-[11px] text-slate-500">Aggregated from trades + feedback (anon-key limit). {filtered.length} of {users.length} shown.</p>
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

      <GapNote>
        Provider (Google/Email) requires Supabase service_role and is not available with anon key — column shows "—".
      </GapNote>

      <div className="bg-[var(--bg-elevated)] dark:bg-[#0d1424] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-600 border-b border-[var(--border-subtle)] dark:border-white/[0.06] text-[10px] tracking-widest uppercase bg-white/[0.02]">
                <th className="p-2 text-left font-semibold">Email</th>
                <th className="p-2 text-left font-semibold">Joined (proxy)</th>
                <th className="p-2 text-left font-semibold">Last activity</th>
                <th className="p-2 text-right font-semibold">Trades</th>
                <th className="p-2 text-left font-semibold">Provider</th>
                <th className="p-2 text-left font-semibold">Status</th>
                <th className="p-2 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((u) => {
                const active = isWithinDays(u.last, 30);
                const isBanned = u.email && banned.has(u.email);
                return (
                  <tr key={u.key} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="p-2 font-mono text-slate-200" title={u.email || u.user_id}>
                      {shortEmail(u.email) || (u.user_id ? u.user_id.slice(0, 8) + "…" : "—")}
                      {isBanned && <Badge tone="rose">Banned</Badge>}
                    </td>
                    <td className="p-2 font-mono text-[11px] text-slate-500">{formatDate(u.first)}</td>
                    <td className="p-2 font-mono text-[11px] text-slate-500">{formatDateTime(u.last)}</td>
                    <td className="p-2 font-mono text-right text-cyan-400 tabular-nums">{u.trades}</td>
                    <td className="p-2 font-mono text-[11px] text-slate-600">—</td>
                    <td className="p-2">
                      <Badge tone={active ? "emerald" : "slate"}>{active ? "Active" : "Inactive"}</Badge>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setModal({ kind: "trades", user: u })}
                          title="View trades"
                          className="p-1.5 rounded border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20"
                        ><BookOpen size={11} /></button>
                        <button
                          onClick={() => setModal({ kind: "feedback", user: u })}
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

      {/* View Trades / Feedback modal */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal ? `${modal.kind === "trades" ? "Trades" : "Feedback"} — ${modal.user.email || modal.user.user_id}` : ""}
        wide
      >
        {modal && (modal.kind === "trades" ? (
          <UserTradesView user={modal.user} trades={trades} />
        ) : (
          <UserFeedbackView user={modal.user} feedback={feedback} />
        ))}
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

function UserTradesView({ user, trades }) {
  const list = useMemo(() => {
    if (user.user_id) return trades.filter((t) => t.user_id === user.user_id);
    return [];
  }, [trades, user]);
  if (!list.length) return <p className="text-xs text-slate-500">No trades for this user.</p>;
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-slate-600 border-b border-[var(--border-subtle)] dark:border-white/[0.06] text-[10px] tracking-widest uppercase">
          <th className="p-2 text-left">Ticker</th>
          <th className="p-2 text-left">Date</th>
          <th className="p-2 text-left">Side</th>
          <th className="p-2 text-right">Entry</th>
          <th className="p-2 text-right">Exit</th>
          <th className="p-2 text-right">P&amp;L</th>
          <th className="p-2 text-left">Status</th>
        </tr>
      </thead>
      <tbody>
        {list.map((t) => {
          const pnl = calcTradePnL(t);
          return (
            <tr key={t.id} className="border-b border-white/[0.04]">
              <td className="p-2 font-mono font-bold text-white">{t.ticker}</td>
              <td className="p-2 font-mono text-[11px] text-slate-500">{t.date || formatDate(t.createdAt)}</td>
              <td className="p-2 text-[11px]">{t.side}</td>
              <td className="p-2 font-mono text-right">${t.entry}</td>
              <td className="p-2 font-mono text-right">{t.exit ? `$${t.exit}` : "—"}</td>
              <td className={`p-2 font-mono text-right tabular-nums ${pnl == null ? "text-slate-600" : pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {pnl == null ? "—" : (pnl >= 0 ? "+" : "") + pnl.toFixed(2)}
              </td>
              <td className="p-2 text-[11px]">{t.status}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
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

function TradesTab({ trades, toast, onMutate }) {
  const confirm = useConfirm();
  const [filters, setFilters] = useState({
    email: "", ticker: "", from: "", to: "", status: "all", hideDemo: false,
  });
  const [page, setPage] = useState(1);
  const PER_PAGE = 50;

  // Trades table has no user_email column. Map user_id → email from existing feedback rows is
  // out of scope here (we just expose ticker/email filter for future schema).
  const filtered = useMemo(() => {
    let list = trades;
    if (filters.hideDemo) list = list.filter((t) => !t.is_demo);
    if (filters.ticker) list = list.filter((t) => (t.ticker || "").toLowerCase().includes(filters.ticker.toLowerCase()));
    if (filters.email) list = list.filter((t) =>
      (t.user_id || "").toLowerCase().includes(filters.email.toLowerCase()) ||
      (t.user_email || "").toLowerCase().includes(filters.email.toLowerCase())
    );
    if (filters.status !== "all") list = list.filter((t) => t.status === filters.status);
    if (filters.from) list = list.filter((t) => (t.date || t.createdAt || "") >= filters.from);
    if (filters.to) list = list.filter((t) => (t.date || t.createdAt || "") <= filters.to + "T23:59:59");
    return list;
  }, [trades, filters]);

  useEffect(() => { setPage(1); }, [filters]);

  const stats = useMemo(() => {
    const closed = filtered.filter((t) => t.status === "CLOSED" && t.exit != null);
    const pnls = closed.map((t) => calcTradePnL(t)).filter((v) => v != null);
    const wins = pnls.filter((p) => p > 0).length;
    const sumPnl = pnls.reduce((a, b) => a + b, 0);
    const tickerCount = new Map();
    filtered.forEach((t) => { if (t.ticker) tickerCount.set(t.ticker, (tickerCount.get(t.ticker) || 0) + 1); });
    const top = Array.from(tickerCount.entries()).sort((a, b) => b[1] - a[1])[0];
    return {
      total: filtered.length,
      winRate: closed.length ? ((wins / closed.length) * 100).toFixed(1) : "—",
      avgPnl: pnls.length ? (sumPnl / pnls.length).toFixed(2) : "—",
      topTicker: top ? top[0] : "—",
    };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageRows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const deleteTrade = async (t) => {
    const ok = await confirm({
      title: "Delete trade", message: `Remove ${t.ticker} ${t.side} from ${t.date || formatDate(t.createdAt)}?`,
      confirmText: "Delete", cancelText: "Cancel", danger: true,
    });
    if (!ok) return;
    try {
      const { error } = await supabase.from("trades").delete().eq("id", t.id);
      if (error) throw error;
      toast.success("Trade deleted");
      onMutate?.();
    } catch (e) {
      toast.error("Delete failed (RLS?): " + (e?.message || ""));
    }
  };

  const exportCols = [
    "id", "user_id", "ticker", "side", "date", "entry", "stop", "target",
    "exit", "shares", "status", "setup", "pnl", "is_demo", "createdAt",
  ];
  const toCsvRow = (t) => ({
    id: t.id, user_id: t.user_id, ticker: t.ticker, side: t.side, date: t.date,
    entry: t.entry, stop: t.stop, target: t.target, exit: t.exit, shares: t.shares,
    status: t.status, setup: t.setup, pnl: calcTradePnL(t)?.toFixed(2) ?? "",
    is_demo: t.is_demo ? "true" : "false", createdAt: t.createdAt,
  });

  return (
    <div className="space-y-3">
      <header>
        <h2 className="text-sm font-bold text-white">Trades</h2>
        <p className="text-[11px] text-slate-500">Every trade across all users. {filtered.length} rows after filters.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total" value={stats.total} accent="cyan" />
        <KpiCard label="Win rate" value={stats.winRate === "—" ? "—" : `${stats.winRate}%`} accent="emerald" />
        <KpiCard label="Avg P&L" value={stats.avgPnl === "—" ? "—" : `$${stats.avgPnl}`} accent="violet" />
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
          value={filters.ticker}
          onChange={(e) => setFilters((f) => ({ ...f, ticker: e.target.value }))}
          placeholder="ticker…"
          className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none w-28 font-mono"
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
          onClick={() => downloadCSV(trades.map(toCsvRow), `swing-edge-trades-all-${new Date().toISOString().slice(0, 10)}.csv`, exportCols)}
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
                <th className="p-2 text-left">Ticker</th>
                <th className="p-2 text-left">User</th>
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-left">Side</th>
                <th className="p-2 text-right">Entry</th>
                <th className="p-2 text-right">Exit</th>
                <th className="p-2 text-right">P&amp;L</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Setup</th>
                <th className="p-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((t) => {
                const pnl = calcTradePnL(t);
                return (
                  <tr key={t.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="p-2 font-mono font-bold text-white">{t.ticker}</td>
                    <td className="p-2 font-mono text-[10px] text-slate-500" title={t.user_id}>
                      {t.is_demo ? <Badge tone="amber">Demo</Badge> : t.user_id?.slice(0, 6) + "…"}
                    </td>
                    <td className="p-2 font-mono text-[10px] text-slate-500">{t.date || formatDate(t.createdAt)}</td>
                    <td className="p-2 font-mono text-[11px]">{t.side}</td>
                    <td className="p-2 font-mono text-right">${t.entry}</td>
                    <td className="p-2 font-mono text-right">{t.exit != null ? `$${t.exit}` : "—"}</td>
                    <td className={`p-2 font-mono text-right tabular-nums ${pnl == null ? "text-slate-600" : pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {pnl == null ? "—" : (pnl >= 0 ? "+$" : "-$") + Math.abs(pnl).toFixed(2)}
                    </td>
                    <td className="p-2 text-[11px]">{t.status}</td>
                    <td className="p-2 text-[11px] text-violet-400">{t.setup || "—"}</td>
                    <td className="p-2 text-right">
                      <button
                        onClick={() => deleteTrade(t)}
                        title="Delete"
                        className="p-1.5 rounded border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                      ><Trash2 size={11} /></button>
                    </td>
                  </tr>
                );
              })}
              {pageRows.length === 0 && (
                <tr><td colSpan={10} className="p-6 text-center text-slate-600 text-xs">No trades match</td></tr>
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
      const { error } = await supabase.from("feedback").update({ status: nextStatus }).eq("id", id);
      if (error) throw error;
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
      const { error } = await supabase.from("feedback").delete().eq("id", id);
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

function SystemTab({ trades, feedback, supaUp, toast, onMutate }) {
  const confirm = useConfirm();
  const [flags, setFlags] = useState(() => ({ ...DEFAULT_FLAGS, ...readJSON(FEATURE_FLAGS_KEY, {}) }));
  const [pwGate, setPwGate] = useState(null); // 'clearDemos'
  const [healthTick, setHealthTick] = useState(0);
  const [health, setHealth] = useState({ ok: supaUp, latency: null });

  const demoCount = useMemo(() => trades.filter((t) => t.is_demo).length, [trades]);

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
      const { error } = await supabase.from("trades").delete().eq("is_demo", true);
      if (error) throw error;
      toast.success("Demo trades cleared");
      setPwGate(null);
      onMutate?.();
    } catch (e) {
      toast.error("Clear failed (RLS?): " + (e?.message || ""));
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
            detail={`${trades.length.toLocaleString()}`}
          />
          <HealthRow
            icon={MessageCircle}
            label="Feedback rows"
            ok
            detail={`${feedback.length.toLocaleString()}`}
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

function LogsTab({ trades, feedback }) {
  const [filter, setFilter] = useState("all");
  const [tick, setTick] = useState(0);

  // Auto-refresh ticker every 60s (forces re-derivation; parent owns data refresh)
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const feed = useMemo(() => {
    const events = [];

    // Track first-seen email → "new user" event
    const firstSeen = new Map();
    [...trades].sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || "")).forEach((t) => {
      const k = t.user_id;
      if (!k || firstSeen.has(k) || !t.createdAt) return;
      firstSeen.set(k, { ts: t.createdAt, user: k });
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

    trades.forEach((t) => {
      events.push({
        ts: t.createdAt, kind: "trade", category: "trades",
        actor: t.user_id || "—",
        summary: `added trade ${t.ticker || ""} ${t.side || ""}`.trim(),
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
  }, [trades, feedback, tick]);

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
