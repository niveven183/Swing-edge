import { useState, useEffect, useMemo } from "react";
import { X } from "lucide-react";

const SETUPS = ["Breakout", "Pullback", "Support Bounce", "Resistance Break", "Other"];
const MARKETS = ["Trending Up", "Trending Down", "Sideways", "Volatile"];
const EMOTIONS = ["Confident", "Calm", "Patient", "Neutral", "Hesitant", "Nervous", "FOMO", "Angry"];
const EXIT_REASONS = ["Hit Target", "Hit Stop", "Manual Exit", "Trailing Stop", "Other"];

/**
 * Edit trade modal — controlled by parent.
 * props:
 *   - trade: the trade object (or null to hide)
 *   - lang: "he" | "en"
 *   - onClose(): close without saving
 *   - onSave(updatedTrade): persist (parent updates state + Supabase + localStorage)
 */
export default function EditTradeModal({ trade, lang, onClose, onSave }) {
  const isHe = lang === "he";
  const [form, setForm] = useState(() => initForm(trade));
  const [error, setError] = useState(null);

  // Re-init form whenever a new trade is opened
  useEffect(() => {
    setForm(initForm(trade));
    setError(null);
  }, [trade?.id]);

  // ESC to close
  useEffect(() => {
    if (!trade) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [trade, onClose]);

  const showExitFields = useMemo(
    () => (form.exit !== "" && form.exit != null) || form.status === "CLOSED",
    [form.exit, form.status]
  );

  if (!trade) return null;

  function setField(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function validate() {
    const sharesN = Number(form.shares);
    const entryN = Number(form.entry);
    const stopN = Number(form.stop);
    const targetN = form.target === "" ? null : Number(form.target);
    const exitN = form.exit === "" || form.exit == null ? null : Number(form.exit);

    if (!Number.isFinite(sharesN) || sharesN <= 0) {
      return isHe ? "מספר המניות חייב להיות גדול מ-0" : "Shares must be greater than 0";
    }
    if (!Number.isFinite(entryN) || entryN <= 0) {
      return isHe ? "מחיר כניסה חייב להיות גדול מ-0" : "Entry price must be greater than 0";
    }
    if (!Number.isFinite(stopN) || stopN <= 0) {
      return isHe ? "Stop חייב להיות גדול מ-0" : "Stop must be greater than 0";
    }
    if (targetN != null && (!Number.isFinite(targetN) || targetN <= 0)) {
      return isHe ? "Target חייב להיות גדול מ-0" : "Target must be greater than 0";
    }
    if (exitN != null && (!Number.isFinite(exitN) || exitN <= 0)) {
      return isHe ? "Exit חייב להיות גדול מ-0" : "Exit must be greater than 0";
    }
    if (!form.date) {
      return isHe ? "חובה לבחור תאריך כניסה" : "Entry date is required";
    }
    return null;
  }

  function handleSave() {
    const err = validate();
    if (err) { setError(err); return; }

    const exitN = form.exit === "" || form.exit == null ? null : Number(form.exit);
    const updated = {
      ...trade,
      ticker: String(form.ticker || "").toUpperCase(),
      side: form.side,
      date: form.date,
      exitDate: form.exitDate || trade.exitDate || null,
      entry: Number(form.entry),
      stop: Number(form.stop),
      target: form.target === "" ? null : Number(form.target),
      shares: Number(form.shares),
      setup: form.setup,
      notes: form.notes,
      marketCondition: form.marketCondition,
      emotionAtEntry: form.emotionAtEntry,
      entryQuality: form.entryQuality,
      status: exitN != null ? "CLOSED" : form.status,
      exit: exitN,
      exitReason: form.exitReason,
      followedPlan: form.followedPlan,
      lessonLearned: form.lessonLearned,
      maxFavorable: form.maxFavorable === "" ? null : Number(form.maxFavorable),
      maxAdverse: form.maxAdverse === "" ? null : Number(form.maxAdverse),
      closedAt: exitN != null ? (trade.closedAt || new Date().toISOString()) : trade.closedAt,
    };
    onSave?.(updated);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-[var(--bg-elevated)] dark:bg-[#0d1424] border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)] dark:border-white/[0.06] bg-gradient-to-r from-cyan-500/5 to-violet-500/5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">
              ✏️ {isHe ? "עריכת עסקה" : "Edit Trade"} —{" "}
              <span className="text-cyan-400 font-mono">{trade.ticker}</span>
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-600 hover:text-slate-300 transition"
            title={isHe ? "סגור (Esc)" : "Close (Esc)"}
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Ticker + Side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">Ticker</label>
              <input
                value={form.ticker}
                onChange={(e) => setField("ticker", e.target.value.toUpperCase())}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none transition font-mono font-bold"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">{isHe ? "כיוון" : "Direction"}</label>
              <div className="flex gap-2">
                {["LONG", "SHORT"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setField("side", s)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition border ${
                      form.side === s
                        ? s === "LONG"
                          ? "bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30"
                          : "bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/30"
                        : "bg-white/3 text-slate-500 border-white/10 hover:border-white/20"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">{isHe ? "תאריך כניסה" : "Entry Date"}</label>
              <input
                type="date"
                value={form.date || ""}
                onChange={(e) => setField("date", e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none transition font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">{isHe ? "תאריך יציאה" : "Exit Date"}</label>
              <input
                type="date"
                value={form.exitDate || ""}
                onChange={(e) => setField("exitDate", e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none transition font-mono"
              />
            </div>
          </div>

          {/* Prices */}
          <div className="grid grid-cols-3 gap-3">
            {[
              ["Entry", "entry", "text-white"],
              ["Stop Loss", "stop", "text-[#ef4444]"],
              ["Target", "target", "text-[#10b981]"],
            ].map(([label, key, cls]) => (
              <div key={key}>
                <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">{label}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form[key]}
                  onChange={(e) => setField(key, e.target.value)}
                  placeholder="0.00"
                  className={`w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none transition font-mono ${cls}`}
                />
              </div>
            ))}
          </div>

          {/* Shares + Setup */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">{isHe ? "מניות" : "Shares"}</label>
              <input
                type="number"
                min="1"
                value={form.shares}
                onChange={(e) => setField("shares", e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none transition font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">{isHe ? "סוג Setup" : "Setup Type"}</label>
              <select
                value={form.setup}
                onChange={(e) => setField("setup", e.target.value)}
                className="w-full border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none transition appearance-none"
                style={{ background: "#0d1424" }}
              >
                {SETUPS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Market + Emotion */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">{isHe ? "מצב שוק" : "Market Condition"}</label>
              <select
                value={form.marketCondition}
                onChange={(e) => setField("marketCondition", e.target.value)}
                className="w-full border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none transition appearance-none"
                style={{ background: "#0d1424" }}
              >
                {MARKETS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">{isHe ? "רגש בכניסה" : "Emotion at Entry"}</label>
              <select
                value={form.emotionAtEntry}
                onChange={(e) => setField("emotionAtEntry", e.target.value)}
                className="w-full border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none transition appearance-none"
                style={{ background: "#0d1424" }}
              >
                {EMOTIONS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Entry Quality */}
          <div>
            <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">{isHe ? "איכות כניסה" : "Entry Quality"}</label>
            <div className="flex items-center gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setField("entryQuality", star)}
                  className={`text-xl transition-transform hover:scale-110 ${
                    form.entryQuality >= star ? "text-amber-400" : "text-slate-700"
                  }`}
                >
                  ★
                </button>
              ))}
              <span className="text-[10px] text-slate-600 ml-1">{form.entryQuality}/5</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">{isHe ? "הערות" : "Notes"}</label>
            <textarea
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              rows={2}
              placeholder={isHe ? "תזה / הקשר..." : "Trade thesis..."}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none transition resize-y"
            />
          </div>

          {/* Exit section */}
          <div className="border-t border-[var(--border-subtle)] dark:border-white/[0.06] pt-4">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3">
              {isHe ? "שדות סגירה (אם נסגרה)" : "Closing Fields (if closed)"}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">{isHe ? "מחיר יציאה" : "Exit Price"}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.exit}
                  onChange={(e) => setField("exit", e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-[#10b981] placeholder-slate-600 focus:border-emerald-500/50 focus:outline-none transition font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">{isHe ? "סיבת יציאה" : "Exit Reason"}</label>
                <select
                  value={form.exitReason}
                  onChange={(e) => setField("exitReason", e.target.value)}
                  className="w-full border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none transition appearance-none"
                  style={{ background: "#0d1424" }}
                >
                  {EXIT_REASONS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">MFE</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.maxFavorable}
                  onChange={(e) => setField("maxFavorable", e.target.value)}
                  placeholder={isHe ? "מחיר שיא" : "Highest price"}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-[#10b981] placeholder-slate-600 focus:outline-none transition font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">MAE</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.maxAdverse}
                  onChange={(e) => setField("maxAdverse", e.target.value)}
                  placeholder={isHe ? "מחיר שפל" : "Lowest price"}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-[#ef4444] placeholder-slate-600 focus:outline-none transition font-mono"
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">{isHe ? "הלך לפי התוכנית?" : "Followed Plan?"}</label>
              <div className="flex gap-2">
                {[
                  { val: true, label: isHe ? "✓ כן" : "✓ Yes", on: "bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30" },
                  { val: "Partially", label: isHe ? "◐ חלקית" : "◐ Partially", on: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
                  { val: false, label: isHe ? "✗ לא" : "✗ No", on: "bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/30" },
                ].map(({ val, label, on }) => (
                  <button
                    key={String(val)}
                    onClick={() => setField("followedPlan", val)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition border ${
                      form.followedPlan === val ? on : "bg-white/3 text-slate-500 border-white/10 hover:border-white/20"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3">
              <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-1">{isHe ? "לקח שנלמד" : "Lesson Learned"}</label>
              <textarea
                value={form.lessonLearned}
                onChange={(e) => setField("lessonLearned", e.target.value)}
                rows={3}
                placeholder={isHe ? "מה העסקה הזו לימדה אותך?" : "What did this trade teach you?"}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-violet-500/50 focus:outline-none transition resize-y"
              />
            </div>
          </div>

          {error && (
            <div className="text-[11px] text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg p-2.5">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-white text-sm font-bold hover:opacity-90 transition"
            >
              {isHe ? "שמור שינויים →" : "Save Changes →"}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-sm hover:text-white hover:border-white/20 transition"
            >
              {isHe ? "ביטול" : "Cancel"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function initForm(trade) {
  if (!trade) {
    return {
      ticker: "", side: "LONG", date: "", exitDate: "",
      entry: "", stop: "", target: "", shares: "",
      setup: "Breakout", notes: "",
      marketCondition: "Trending Up", emotionAtEntry: "Neutral",
      entryQuality: 3, status: "OPEN",
      exit: "", exitReason: "Hit Target",
      followedPlan: null, lessonLearned: "",
      maxFavorable: "", maxAdverse: "",
    };
  }
  return {
    ticker: trade.ticker || "",
    side: trade.side || "LONG",
    date: trade.date || "",
    exitDate: trade.exitDate || "",
    entry: trade.entry != null ? String(trade.entry) : "",
    stop: trade.stop != null ? String(trade.stop) : "",
    target: trade.target != null ? String(trade.target) : "",
    shares: trade.shares != null ? String(trade.shares) : "",
    setup: trade.setup || "Breakout",
    notes: trade.notes || "",
    marketCondition: trade.marketCondition || "Trending Up",
    emotionAtEntry: trade.emotionAtEntry || "Neutral",
    entryQuality: trade.entryQuality || 3,
    status: trade.status || "OPEN",
    exit: trade.exit != null ? String(trade.exit) : "",
    exitReason: trade.exitReason || "Hit Target",
    followedPlan: trade.followedPlan ?? null,
    lessonLearned: trade.lessonLearned || "",
    maxFavorable: trade.maxFavorable != null ? String(trade.maxFavorable) : "",
    maxAdverse: trade.maxAdverse != null ? String(trade.maxAdverse) : "",
  };
}
