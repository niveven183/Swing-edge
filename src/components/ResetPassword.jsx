import { useState } from "react";
import { Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../supabaseClient.js";

const T = {
  title:       { en: "Set a new password",        he: "הגדר סיסמה חדשה" },
  subtitle:    { en: "Choose a password of at least 8 characters.", he: "בחר סיסמה של 8 תווים לפחות." },
  newPass:     { en: "New password",               he: "סיסמה חדשה" },
  confirmPass: { en: "Confirm password",           he: "אשר סיסמה" },
  update:      { en: "Update password",            he: "עדכן סיסמה" },
  updating:    { en: "Updating…",                  he: "מעדכן..." },
  success:     { en: "Password updated",           he: "הסיסמה עודכנה" },
  mismatch:    { en: "Passwords don't match.",     he: "הסיסמאות לא תואמות." },
  tooShort:    { en: "Password must be at least 8 characters.", he: "הסיסמה חייבת להכיל לפחות 8 תווים." },
  notConfigured: { en: "Supabase is not configured.", he: "Supabase לא מוגדר." },
};

export default function ResetPassword({ onComplete, lang = "he" }) {
  const t = (k) => T[k][lang] || T[k].en;
  const isRTL = lang === "he";

  const [pass, setPass]       = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [done, setDone]       = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (pass.length < 8) { setError(t("tooShort")); return; }
    if (pass !== confirm) { setError(t("mismatch")); return; }
    if (!isSupabaseConfigured || !supabase) { setError(t("notConfigured")); return; }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password: pass });
      if (err) throw err;
      setDone(true);
      setTimeout(() => {
        window.history.replaceState({}, "", "/");
        onComplete?.();
      }, 2000);
    } catch (err) {
      setError(err.message || (lang === "he" ? "שגיאה בעדכון." : "Failed to update."));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div dir={isRTL ? "rtl" : "ltr"} className="flex flex-col items-center text-center gap-4 py-4">
        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
          <CheckCircle2 size={36} className="text-emerald-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">{t("success")}</h2>
      </div>
    );
  }

  return (
    <div dir={isRTL ? "rtl" : "ltr"}>
      <h2 className="text-xl font-bold text-slate-900 mb-1">{t("title")}</h2>
      <p className="text-sm text-slate-500 mb-5">{t("subtitle")}</p>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <PasswordField
          placeholder={t("newPass")}
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          show={show}
          onToggle={() => setShow((s) => !s)}
          isRTL={isRTL}
          autoComplete="new-password"
        />
        <PasswordField
          placeholder={t("confirmPass")}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          show={show}
          onToggle={() => setShow((s) => !s)}
          isRTL={isRTL}
          autoComplete="new-password"
        />

        {error && (
          <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 text-center">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-[12px] font-semibold text-white text-sm transition-all active:scale-[0.98] hover:-translate-y-px disabled:opacity-70"
          style={{
            background: "linear-gradient(135deg, #00C076 0%, #16D687 100%)",
            boxShadow: loading ? "none" : "0 4px 16px rgba(0,192,118,0.30)",
          }}
        >
          {loading ? t("updating") : t("update")}
        </button>
      </form>
    </div>
  );
}

function PasswordField({ show, onToggle, isRTL, ...rest }) {
  return (
    <div className="relative">
      <span className={`absolute top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none ${isRTL ? "right-3" : "left-3"}`}>
        <Lock size={18} />
      </span>
      <input
        {...rest}
        type={show ? "text" : "password"}
        dir={isRTL ? "rtl" : "ltr"}
        style={{ [isRTL ? "paddingRight" : "paddingLeft"]: 44, [isRTL ? "paddingLeft" : "paddingRight"]: 40 }}
        className="w-full h-12 bg-white border-[1.5px] border-slate-200 rounded-[10px] px-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition"
      />
      <button
        type="button"
        onClick={onToggle}
        tabIndex={-1}
        aria-label={lang === "he" ? (show ? "הסתר סיסמה" : "הצג סיסמה") : (show ? "Hide password" : "Show password")}
        className={`absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition ${isRTL ? "left-3" : "right-3"}`}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}
