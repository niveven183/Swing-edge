import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Shield, Users, MessageCircle, BookOpen, Settings as SettingsIcon,
  RefreshCw, CheckCircle2, Trash2, Edit3, Search,
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "../supabaseClient.js";
import { useToast, useConfirm } from "./ToastProvider.jsx";

const ADMIN_TABS = [
  { id: "users", label: "משתמשים", icon: Users },
  { id: "feedback", label: "פידבקים", icon: MessageCircle },
  { id: "trades", label: "עסקאות", icon: BookOpen },
  { id: "config", label: "הגדרות אפליקציה", icon: SettingsIcon },
];

const DEFAULT_APP_CONFIG = {
  systemMessage: "",
  primaryColor: "#06b6d4",
  accentColor: "#8b5cf6",
  maintenanceMode: false,
  welcomeText: "",
};

export default function AdminPanel() {
  const [section, setSection] = useState("users");
  const toast = useToast();

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-500/25">
          <Shield size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-lg font-extrabold text-white flex items-center gap-2">
            Admin Dashboard
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/30 font-mono tracking-widest uppercase">
              Restricted
            </span>
          </h1>
          <p className="text-[11px] text-slate-500 mt-0.5">ניהול מערכת — גישה בלעדית</p>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-white/[0.06]">
        {ADMIN_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSection(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold tracking-wide transition border-b-2 ${
              section === id
                ? "text-white border-rose-400"
                : "text-slate-500 border-transparent hover:text-slate-300"
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {section === "users" && <UsersSection toast={toast} />}
      {section === "feedback" && <FeedbackSection toast={toast} />}
      {section === "trades" && <TradesSection toast={toast} />}
      {section === "config" && <ConfigSection toast={toast} />}
    </div>
  );
}

// ─── USERS ───────────────────────────────────────────────────────────────────
function UsersSection({ toast }) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setError("Supabase לא מוגדר — אין חיבור לרשימת משתמשים מלאה.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Aggregate from `feedback` + `trades` tables if they exist to infer users.
      const emailsMap = new Map();
      try {
        const { data: fb } = await supabase
          .from("feedback")
          .select("user_id,user_email,created_at")
          .order("created_at", { ascending: false });
        (fb || []).forEach((r) => {
          const key = r.user_email || r.user_id;
          if (!key) return;
          const cur = emailsMap.get(key) || { email: r.user_email, id: r.user_id, joined: r.created_at, feedbackCount: 0, tradeCount: 0, lastActivity: r.created_at };
          cur.feedbackCount = (cur.feedbackCount || 0) + 1;
          if (!cur.lastActivity || r.created_at > cur.lastActivity) cur.lastActivity = r.created_at;
          if (!cur.joined || r.created_at < cur.joined) cur.joined = r.created_at;
          emailsMap.set(key, cur);
        });
      } catch {}
      try {
        const { data: tr } = await supabase
          .from("trades")
          .select("user_id,user_email,created_at")
          .order("created_at", { ascending: false });
        (tr || []).forEach((r) => {
          const key = r.user_email || r.user_id;
          if (!key) return;
          const cur = emailsMap.get(key) || { email: r.user_email, id: r.user_id, joined: r.created_at, feedbackCount: 0, tradeCount: 0, lastActivity: r.created_at };
          cur.tradeCount = (cur.tradeCount || 0) + 1;
          if (!cur.lastActivity || r.created_at > cur.lastActivity) cur.lastActivity = r.created_at;
          if (!cur.joined || r.created_at < cur.joined) cur.joined = r.created_at;
          emailsMap.set(key, cur);
        });
      } catch {}

      const { data: sessionData } = await supabase.auth.getSession();
      const me = sessionData?.session?.user;
      if (me?.email) {
        const cur = emailsMap.get(me.email) || {
          email: me.email,
          id: me.id,
          joined: me.created_at,
          feedbackCount: 0,
          tradeCount: 0,
          lastActivity: me.last_sign_in_at || me.created_at,
        };
        cur.joined = me.created_at || cur.joined;
        cur.lastActivity = me.last_sign_in_at || cur.lastActivity;
        emailsMap.set(me.email, cur);
      }

      setUsers(Array.from(emailsMap.values()).sort((a, b) =>
        (b.lastActivity || "").localeCompare(a.lastActivity || "")
      ));
    } catch (e) {
      setError(e?.message || "שגיאה בטעינת משתמשים");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="bg-[#0d1424] border border-white/[0.06] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold tracking-widest uppercase text-slate-400">
          משתמשים רשומים ({users.length})
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 transition border border-cyan-500/20 rounded-lg px-2 py-1 disabled:opacity-50">
          <RefreshCw size={10} className={loading ? "animate-spin" : ""} />
          רענן
        </button>
      </div>
      {error && (
        <div className="mb-3 text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5">
          {error}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-600 border-b border-white/[0.06] text-[10px] tracking-widest uppercase">
              <th className="p-2 text-left font-semibold">Email</th>
              <th className="p-2 text-left font-semibold">הצטרפות</th>
              <th className="p-2 text-right font-semibold">עסקאות</th>
              <th className="p-2 text-right font-semibold">פידבקים</th>
              <th className="p-2 text-left font-semibold">פעילות אחרונה</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.email || u.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition">
                <td className="p-2 font-mono text-slate-200">{u.email || "—"}</td>
                <td className="p-2 font-mono text-slate-500 text-[11px]">{u.joined ? new Date(u.joined).toLocaleDateString("he-IL") : "—"}</td>
                <td className="p-2 font-mono text-right text-cyan-400">{u.tradeCount || 0}</td>
                <td className="p-2 font-mono text-right text-violet-400">{u.feedbackCount || 0}</td>
                <td className="p-2 font-mono text-slate-500 text-[11px]">{u.lastActivity ? new Date(u.lastActivity).toLocaleString("he-IL") : "—"}</td>
              </tr>
            ))}
            {!loading && users.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-slate-600 text-xs">אין משתמשים להצגה עדיין</td></tr>
            )}
            {loading && (
              <tr><td colSpan={5} className="p-6 text-center text-slate-500 text-xs">
                <RefreshCw size={12} className="inline animate-spin mr-2" /> טוען…
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── FEEDBACK ────────────────────────────────────────────────────────────────
function FeedbackSection({ toast }) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("all");
  const confirm = useConfirm();

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("feedback")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRows(data || []);
    } catch (e) {
      toast.error("שגיאה בטעינת פידבקים: " + (e?.message || ""));
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const markResolved = async (id, resolved) => {
    try {
      const { error } = await supabase
        .from("feedback")
        .update({ resolved })
        .eq("id", id);
      if (error) throw error;
      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, resolved } : r)));
      toast.success(resolved ? "סומן כטופל ✓" : "סומן כלא טופל");
    } catch (e) {
      toast.error("לא ניתן לעדכן: " + (e?.message || ""));
    }
  };

  const remove = async (id) => {
    const ok = await confirm({
      title: "מחיקת פידבק",
      message: "האם אתה בטוח שברצונך למחוק את הדיווח הזה? פעולה זו לא ניתנת לביטול.",
      confirmText: "מחק",
      cancelText: "ביטול",
      danger: true,
    });
    if (!ok) return;
    try {
      const { error } = await supabase.from("feedback").delete().eq("id", id);
      if (error) throw error;
      setRows((rs) => rs.filter((r) => r.id !== id));
      toast.success("נמחק");
    } catch (e) {
      toast.error("שגיאת מחיקה: " + (e?.message || ""));
    }
  };

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    if (filter === "resolved") return rows.filter((r) => r.resolved);
    if (filter === "open") return rows.filter((r) => !r.resolved);
    return rows.filter((r) => r.type === filter);
  }, [rows, filter]);

  const typeEmoji = { bug: "🐛", idea: "💡", love: "⭐", question: "❓" };

  return (
    <div className="bg-[#0d1424] border border-white/[0.06] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="text-xs font-semibold tracking-widest uppercase text-slate-400">
          דיווחים ({filtered.length} / {rows.length})
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {[["all", "הכל"], ["open", "פתוח"], ["resolved", "סגור"], ["bug", "🐛"], ["idea", "💡"], ["love", "⭐"], ["question", "❓"]].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={`text-[10px] px-2 py-1 rounded border transition ${
                filter === v ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" : "bg-white/3 text-slate-400 border-white/10 hover:text-white"
              }`}>
              {l}
            </button>
          ))}
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1 text-[10px] text-cyan-400 border border-cyan-500/20 rounded px-2 py-1 hover:bg-cyan-500/10 disabled:opacity-50">
            <RefreshCw size={10} className={loading ? "animate-spin" : ""} />
            רענן
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {filtered.map((r) => (
          <div key={r.id} className={`rounded-xl border p-3 ${r.resolved ? "bg-emerald-500/5 border-emerald-500/15" : "bg-white/3 border-white/[0.06]"}`}>
            <div className="flex items-start gap-3 flex-wrap">
              <div className="text-xl">{typeEmoji[r.type] || "💬"}</div>
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-mono text-cyan-300">{r.user_email || "anonymous"}</span>
                  <span className="text-[9px] text-slate-500">{r.created_at ? new Date(r.created_at).toLocaleString("he-IL") : ""}</span>
                  {r.resolved && <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">טופל</span>}
                </div>
                <p className="text-xs text-slate-200 mt-1 leading-relaxed whitespace-pre-wrap">{r.message}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => markResolved(r.id, !r.resolved)}
                  title={r.resolved ? "סמן כלא טופל" : "סמן כטופל"}
                  className={`text-[10px] p-1.5 rounded border ${r.resolved ? "bg-slate-500/10 border-slate-500/30 text-slate-400" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"} transition`}>
                  <CheckCircle2 size={12} />
                </button>
                <button onClick={() => remove(r.id)}
                  title="מחק"
                  className="text-[10px] p-1.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {!loading && filtered.length === 0 && (
          <div className="p-6 text-center text-slate-600 text-xs">אין דיווחים</div>
        )}
        {loading && (
          <div className="p-6 text-center text-slate-500 text-xs">
            <RefreshCw size={12} className="inline animate-spin mr-2" /> טוען…
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TRADES ──────────────────────────────────────────────────────────────────
function TradesSection({ toast }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const confirm = useConfirm();

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      toast.info("Supabase לא מוגדר — מציג רק עסקאות מקומיות");
      try {
        const local = JSON.parse(localStorage.getItem("swingEdgeTrades") || "[]");
        setRows(local.map((t) => ({ ...t, _localOnly: true, user_email: "local" })));
      } catch { setRows([]); }
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRows(data || []);
    } catch (e) {
      toast.error("שגיאה בטעינת עסקאות: " + (e?.message || ""));
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const remove = async (id, isLocal) => {
    const ok = await confirm({
      title: "מחיקת עסקה",
      message: "למחוק עסקה זו מהמערכת? פעולה זו לא ניתנת לביטול.",
      confirmText: "מחק",
      cancelText: "ביטול",
      danger: true,
    });
    if (!ok) return;
    try {
      if (isLocal) {
        const local = JSON.parse(localStorage.getItem("swingEdgeTrades") || "[]");
        const updated = local.filter((t) => t.id !== id);
        localStorage.setItem("swingEdgeTrades", JSON.stringify(updated));
      } else {
        const { error } = await supabase.from("trades").delete().eq("id", id);
        if (error) throw error;
      }
      setRows((r) => r.filter((x) => x.id !== id));
      toast.success("העסקה נמחקה");
    } catch (e) {
      toast.error("שגיאת מחיקה: " + (e?.message || ""));
    }
  };

  const filtered = useMemo(() => {
    if (!query) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) =>
      (r.ticker || "").toLowerCase().includes(q) ||
      (r.user_email || "").toLowerCase().includes(q) ||
      (r.setup || "").toLowerCase().includes(q)
    );
  }, [rows, query]);

  return (
    <div className="bg-[#0d1424] border border-white/[0.06] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="text-xs font-semibold tracking-widest uppercase text-slate-400">
          כל העסקאות ({filtered.length})
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={12} className="absolute top-1/2 -translate-y-1/2 left-2 rtl:left-auto rtl:right-2 text-slate-600" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="חיפוש..."
              className="bg-white/5 border border-white/10 rounded-lg pl-7 pr-2 rtl:pl-2 rtl:pr-7 py-1.5 text-[11px] text-white placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none w-40 font-mono" />
          </div>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1 text-[10px] text-cyan-400 border border-cyan-500/20 rounded px-2 py-1 hover:bg-cyan-500/10 disabled:opacity-50">
            <RefreshCw size={10} className={loading ? "animate-spin" : ""} />
            רענן
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-600 border-b border-white/[0.06] text-[10px] tracking-widest uppercase">
              {["Ticker", "Email", "Date", "Side", "Entry", "Stop", "Exit", "Status", "Setup", "Action"].map((h) => (
                <th key={h} className="p-2 text-left font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                <td className="p-2 font-mono font-bold text-white">{t.ticker}</td>
                <td className="p-2 font-mono text-[10px] text-slate-500">{t.user_email || "—"}</td>
                <td className="p-2 font-mono text-[10px] text-slate-500">{t.date || (t.created_at && new Date(t.created_at).toLocaleDateString("he-IL"))}</td>
                <td className="p-2 font-mono">{t.side}</td>
                <td className="p-2 font-mono text-slate-300">${t.entry}</td>
                <td className="p-2 font-mono text-rose-400">${t.stop}</td>
                <td className="p-2 font-mono text-emerald-400">{t.exit ? `$${t.exit}` : "—"}</td>
                <td className="p-2 text-[10px]">{t.status}</td>
                <td className="p-2 text-[10px] text-violet-400">{t.setup || "—"}</td>
                <td className="p-2">
                  <button onClick={() => remove(t.id, t._localOnly)}
                    className="text-[10px] p-1.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20">
                    <Trash2 size={10} />
                  </button>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={10} className="p-6 text-center text-slate-600 text-xs">אין עסקאות</td></tr>
            )}
            {loading && (
              <tr><td colSpan={10} className="p-6 text-center text-slate-500 text-xs">
                <RefreshCw size={12} className="inline animate-spin mr-2" /> טוען…
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── APP CONFIG ──────────────────────────────────────────────────────────────
function ConfigSection({ toast }) {
  const [config, setConfig] = useState(() => {
    try {
      const saved = localStorage.getItem("swingEdgeAdminConfig");
      return saved ? { ...DEFAULT_APP_CONFIG, ...JSON.parse(saved) } : DEFAULT_APP_CONFIG;
    } catch { return DEFAULT_APP_CONFIG; }
  });

  const save = () => {
    try {
      localStorage.setItem("swingEdgeAdminConfig", JSON.stringify(config));
      toast.success("ההגדרות נשמרו ✓");
    } catch {
      toast.error("שמירה נכשלה");
    }
  };

  const reset = () => {
    setConfig(DEFAULT_APP_CONFIG);
    localStorage.removeItem("swingEdgeAdminConfig");
    toast.info("אופס להגדרות ברירת מחדל");
  };

  return (
    <div className="bg-[#0d1424] border border-white/[0.06] rounded-xl p-5 space-y-4">
      <div className="text-xs font-semibold tracking-widest uppercase text-slate-400">
        הגדרות אפליקציה
      </div>

      <div>
        <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">הודעת מערכת לכל המשתמשים</label>
        <textarea
          value={config.systemMessage}
          onChange={(e) => setConfig((c) => ({ ...c, systemMessage: e.target.value }))}
          rows={2}
          placeholder="לדוגמה: תחזוקה מתוכננת מחר ב-22:00"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none transition resize-none"
        />
      </div>

      <div>
        <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">טקסט פתיחה (Beta Welcome)</label>
        <input
          value={config.welcomeText}
          onChange={(e) => setConfig((c) => ({ ...c, welcomeText: e.target.value }))}
          placeholder="ברוכים הבאים ל-SwingEdge Beta"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none transition"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">צבע ראשי</label>
          <div className="flex items-center gap-2">
            <input type="color" value={config.primaryColor}
              onChange={(e) => setConfig((c) => ({ ...c, primaryColor: e.target.value }))}
              className="w-10 h-10 rounded border border-white/10 bg-transparent cursor-pointer" />
            <input type="text" value={config.primaryColor}
              onChange={(e) => setConfig((c) => ({ ...c, primaryColor: e.target.value }))}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:border-cyan-500/50 focus:outline-none" />
          </div>
        </div>
        <div>
          <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">צבע משני</label>
          <div className="flex items-center gap-2">
            <input type="color" value={config.accentColor}
              onChange={(e) => setConfig((c) => ({ ...c, accentColor: e.target.value }))}
              className="w-10 h-10 rounded border border-white/10 bg-transparent cursor-pointer" />
            <input type="text" value={config.accentColor}
              onChange={(e) => setConfig((c) => ({ ...c, accentColor: e.target.value }))}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:border-cyan-500/50 focus:outline-none" />
          </div>
        </div>
      </div>

      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
        <input type="checkbox" checked={config.maintenanceMode}
          onChange={(e) => setConfig((c) => ({ ...c, maintenanceMode: e.target.checked }))}
          className="w-4 h-4 rounded border border-white/20 bg-white/5" />
        מצב תחזוקה (קריאה בלבד למשתמשים)
      </label>

      <div className="flex gap-2 pt-2 border-t border-white/[0.06]">
        <button onClick={save}
          className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-violet-500 text-white text-sm font-bold hover:opacity-90 transition">
          שמור שינויים
        </button>
        <button onClick={reset}
          className="px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 text-xs hover:text-white transition">
          אפס
        </button>
      </div>
    </div>
  );
}
