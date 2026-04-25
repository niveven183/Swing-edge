import { useState } from "react";
import emailjs from "@emailjs/browser";
import {
  MessageCircle,
  Send,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "../supabaseClient.js";

const EMAILJS_SERVICE_ID = "service_jxkivjs";
const EMAILJS_TEMPLATE_ID = "template_q0u4f7c";
const EMAILJS_PUBLIC_KEY = "ZAh-yUGwSDqZztQOE";

const FEEDBACK_TYPES = [
  { value: "bug", emoji: "🐛", label: "באג / משהו לא עבד" },
  { value: "idea", emoji: "💡", label: "רעיון לשיפור" },
  { value: "love", emoji: "⭐", label: "משהו שאהבתי" },
  { value: "question", emoji: "❓", label: "שאלה" },
];

export default function FeedbackTab({ user }) {
  const [selectedType, setSelectedType] = useState("bug");
  const [feedbackText, setFeedbackText] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null); // { kind: "success" | "error", msg }

  const reset = () => {
    setFeedbackText("");
    setSelectedType("bug");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!feedbackText.trim() || sending) return;

    setSending(true);
    setStatus(null);

    const payload = {
      user_id: user?.id || null,
      user_email: user?.email || "anonymous",
      type: selectedType,
      message: feedbackText.trim(),
    };

    let supabaseOk = false;
    let emailOk = false;

    try {
      if (isSupabaseConfigured && supabase) {
        const { error: dbError } = await supabase
          .from("feedback")
          .insert([payload]);
        if (!dbError) supabaseOk = true;
        else console.warn("Supabase feedback insert failed:", dbError.message);
      }
    } catch (err) {
      console.warn("Supabase feedback error:", err);
    }

    try {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          user_email: payload.user_email,
          type: selectedType,
          message: payload.message,
          date: new Date().toLocaleString("he-IL"),
        },
        EMAILJS_PUBLIC_KEY
      );
      emailOk = true;
    } catch (err) {
      console.warn("EmailJS send failed:", err);
    }

    setSending(false);

    if (supabaseOk || emailOk) {
      setStatus({
        kind: "success",
        msg: "תודה! הדיווח התקבל ויבחן על ידי הצוות 🙌",
      });
      reset();
    } else {
      setStatus({
        kind: "error",
        msg: "לא הצלחנו לשלוח את הדיווח. בדוק חיבור לאינטרנט ונסה שוב.",
      });
    }
  };

  const selected = FEEDBACK_TYPES.find((t) => t.value === selectedType);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Hero */}
      <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-cyan-500/5 via-[#0d1424]/60 to-violet-500/5 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0">
            <MessageCircle size={22} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-extrabold text-white">
                עזור לנו להשתפר 🚀
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 text-[10px] font-bold tracking-widest uppercase border border-cyan-500/20">
                <Sparkles size={10} /> Beta
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              כל דיווח שלך מגיע ישירות לצוות. אנחנו קוראים הכל — ובונים את
              SwingEdge על סמך מה שחשוב לך.
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-white/[0.08] bg-[#0d1424]/60 p-5 md:p-6 space-y-5"
      >
        {/* Type selector as cards */}
        <div>
          <label className="block text-[11px] font-bold tracking-widest uppercase text-slate-400 mb-2">
            סוג הדיווח
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {FEEDBACK_TYPES.map((type) => {
              const active = selectedType === type.value;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setSelectedType(type.value)}
                  className={`rounded-xl border px-3 py-3 text-right transition ${
                    active
                      ? "border-cyan-400/60 bg-gradient-to-br from-cyan-500/15 to-violet-500/10 text-white shadow-inner"
                      : "border-white/[0.08] bg-white/[0.02] text-slate-300 hover:border-white/20 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="text-xl mb-1">{type.emoji}</div>
                  <div className="text-xs font-semibold leading-tight">
                    {type.label}
                  </div>
                </button>
              );
            })}
          </div>
          {/* Accessible native select fallback for SR users / narrow UI */}
          <label className="sr-only" htmlFor="feedback-type-select">
            סוג הדיווח
          </label>
          <select
            id="feedback-type-select"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="sr-only"
          >
            {FEEDBACK_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.emoji} {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Textarea */}
        <div>
          <label
            htmlFor="feedback-text"
            className="block text-[11px] font-bold tracking-widest uppercase text-slate-400 mb-2"
          >
            {selected?.emoji} תאר בפירוט
          </label>
          <textarea
            id="feedback-text"
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            rows={6}
            maxLength={2000}
            placeholder="ספר לנו מה קרה, מה אהבת, או מה היית רוצה שיהיה אחרת..."
            className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/50 focus:bg-white/[0.05] transition leading-relaxed resize-y"
            required
          />
          <div className="flex items-center justify-between mt-1.5 text-[11px] text-slate-500">
            <span>הדיווח נשלח ישירות לצוות SwingEdge</span>
            <span className="font-mono">{feedbackText.length}/2000</span>
          </div>
        </div>

        {/* Sender preview */}
        {user?.email && (
          <div className="text-[11px] text-slate-500 border border-white/[0.06] rounded-lg bg-white/[0.02] px-3 py-2">
            <span className="text-slate-400 font-semibold">נשלח מטעם:</span>{" "}
            <span className="font-mono text-cyan-300">{user.email}</span>
          </div>
        )}

        {/* Status message */}
        {status && (
          <div
            className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm border ${
              status.kind === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                : "border-rose-500/30 bg-rose-500/10 text-rose-200"
            }`}
          >
            {status.kind === "success" ? (
              <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={18} className="text-rose-400 shrink-0 mt-0.5" />
            )}
            <span className="leading-relaxed">{status.msg}</span>
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={!feedbackText.trim() || sending}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm px-5 py-3 transition shadow-lg shadow-cyan-500/20"
          >
            <Send size={15} />
            {sending ? "שולח..." : "שלח דיווח"}
          </button>
        </div>
      </form>

      {/* Footer note */}
      <p className="text-center text-[11px] text-slate-500">
        💡 טיפ: ככל שתכתוב בפירוט יותר — כך נוכל לעזור לך מהר יותר.
      </p>
    </div>
  );
}
