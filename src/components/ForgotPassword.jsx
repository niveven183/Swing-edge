import { useState } from "react";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../supabaseClient.js";

const T = {
  title:        { en: "Forgot password?",                  he: "שכחת סיסמה?" },
  subtitle:     { en: "Enter your email and we'll send you a reset link.", he: "הזן את האימייל שלך ונשלח לך קישור לאיפוס." },
  email:        { en: "Email",                              he: "אימייל" },
  send:         { en: "Send reset link",                    he: "שלח קישור איפוס" },
  sending:      { en: "Sending…",                           he: "שולח..." },
  back:         { en: "Back to sign in",                    he: "חזרה לכניסה" },
  checkEmail:   { en: "Check your email",                   he: "בדוק את האימייל שלך" },
  sentTo:       { en: "We sent a reset link to",            he: "שלחנו קישור איפוס אל" },
  tryAnother:   { en: "Try another email",                  he: "נסה אימייל אחר" },
  notConfigured:{ en: "Supabase is not configured.",        he: "Supabase לא מוגדר." },
};

export default function ForgotPassword({ onBack, lang = "he" }) {
  const t = (k) => T[k][lang] || T[k].en;
  const isRTL = lang === "he";

  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email) { setError(lang === "he" ? "הזן אימייל." : "Please enter your email."); return; }
    if (!isSupabaseConfigured || !supabase) { setError(t("notConfigured")); return; }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/?reset=true`,
      });
      if (err) throw err;
      setSent(true);
    } catch (err) {
      setError(err.message || (lang === "he" ? "שגיאה בשליחה." : "Failed to send."));
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div dir={isRTL ? "rtl" : "ltr"} className="flex flex-col items-center text-center gap-4 py-2">
        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
          <CheckCircle2 size={36} className="text-emerald-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">{t("checkEmail")}</h2>
        <p className="text-sm text-slate-500">
          {t("sentTo")} <span className="font-semibold text-slate-700">{email}</span>
        </p>
        <button
          type="button"
          onClick={() => { setSent(false); setEmail(""); }}
          className="text-sm text-emerald-600 hover:underline mt-1"
        >
          {t("tryAnother")}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-slate-500 hover:text-slate-700 mt-2 inline-flex items-center gap-1"
        >
          <ArrowLeft size={14} /> {t("back")}
        </button>
      </div>
    );
  }

  return (
    <div dir={isRTL ? "rtl" : "ltr"}>
      <h2 className="text-xl font-bold text-slate-900 mb-1">{t("title")}</h2>
      <p className="text-sm text-slate-500 mb-5">{t("subtitle")}</p>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <InputField
          icon={Mail}
          type="email"
          placeholder={t("email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          isRTL={isRTL}
          autoComplete="email"
        />

        {error && (
          <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 text-center">
            {error}
          </p>
        )}

        <PrimaryButton loading={loading}>
          {loading ? t("sending") : t("send")}
        </PrimaryButton>

        <button
          type="button"
          onClick={onBack}
          className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center justify-center gap-1 mt-1"
        >
          <ArrowLeft size={14} /> {t("back")}
        </button>
      </form>
    </div>
  );
}

function InputField({ icon: Icon, isRTL, ...rest }) {
  const padSide = isRTL ? "paddingRight: 44px" : "paddingLeft: 44px";
  return (
    <div className="relative">
      <span
        className={`absolute top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none ${isRTL ? "right-3" : "left-3"}`}
      >
        <Icon size={18} />
      </span>
      <input
        {...rest}
        dir={isRTL ? "rtl" : "ltr"}
        style={{ [isRTL ? "paddingRight" : "paddingLeft"]: 44 }}
        className="w-full h-12 bg-white border-[1.5px] border-slate-200 rounded-[10px] px-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition"
      />
    </div>
  );
}

function PrimaryButton({ loading, children }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full h-12 rounded-[12px] font-semibold text-white text-sm transition-all active:scale-[0.98] hover:-translate-y-px disabled:opacity-70 disabled:cursor-not-allowed"
      style={{
        background: "linear-gradient(135deg, #00C076 0%, #16D687 100%)",
        boxShadow: loading ? "none" : "0 4px 16px rgba(0,192,118,0.30)",
      }}
    >
      {children}
    </button>
  );
}
