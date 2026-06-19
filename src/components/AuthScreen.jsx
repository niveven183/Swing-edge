import { useState, useEffect } from "react";
import { Mail, Lock, Eye, EyeOff, User } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../supabaseClient.js";
import Logo from "./Logo.jsx";
import ForgotPassword from "./ForgotPassword.jsx";
import ResetPassword from "./ResetPassword.jsx";

const STR = {
  signIn:        { en: "Sign In",                  he: "כניסה" },
  signUp:        { en: "Sign Up",                  he: "הרשמה" },
  email:         { en: "Email",                    he: "אימייל" },
  password:      { en: "Password",                 he: "סיסמה" },
  confirmPass:   { en: "Confirm password",         he: "אשר סיסמה" },
  nickname:      { en: "Nickname",                 he: "כינוי" },
  forgot:        { en: "Forgot password?",         he: "שכחת סיסמה?" },
  signInBtn:     { en: "Sign In",                  he: "כניסה" },
  signingIn:     { en: "Signing in…",              he: "מתחבר..." },
  create:        { en: "Create Account",           he: "צור חשבון" },
  creating:      { en: "Creating…",                he: "נרשם..." },
  google:        { en: "Continue with Google",     he: "המשך עם Google" },
  or:            { en: "OR",                       he: "או" },
  tagline:       { en: "Your personal markets coach", he: "המאמן האישי שלך לשוק ההון" },
  footer:        { en: "🔒 Your data is encrypted",
                   he: "🔒 הנתונים שלך מוצפנים" },
  errFill:       { en: "Please fill in all fields.", he: "נא למלא את כל השדות." },
  errShort:      { en: "Password must be at least 8 characters.", he: "הסיסמה חייבת להכיל לפחות 8 תווים." },
  errMatch:      { en: "Passwords don't match.",   he: "הסיסמאות לא תואמות." },
  errNick:       { en: "Nickname must be at least 2 characters.", he: "הכינוי חייב להכיל לפחות 2 תווים." },
  errCreds:      { en: "Invalid email or password.", he: "מייל או סיסמה שגויים." },
  errExists:     { en: "This email is already registered — try signing in.", he: "המייל הזה כבר רשום — נסה להתחבר." },
  errSupabase:   { en: "Supabase is not configured.", he: "Supabase לא מוגדר." },
  successSignup: { en: "Account created! Check your email to confirm.", he: "נרשמת בהצלחה! בדוק את האימייל לאישור." },
};

export default function AuthScreen() {
  const lang = (typeof document !== "undefined" && document.documentElement.lang === "en") ? "en" : "he";
  const isRTL = lang === "he";
  const t = (k) => STR[k][lang] || STR[k].en;

  const [tab, setTab]         = useState("signin");
  const [authView, setAuthView] = useState("main");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [nickname, setNickname] = useState("");
  const [show, setShow]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("reset") === "true") setAuthView("reset");
  }, []);

  const resetMsg = () => { setError(""); setSuccess(""); };

  const handleSignIn = async (e) => {
    e.preventDefault();
    resetMsg();
    if (!email || !password) { setError(t("errFill")); return; }
    if (!isSupabaseConfigured || !supabase) { setError(t("errSupabase")); return; }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (err) throw err;
    } catch (err) {
      setError(err.message?.includes("Invalid login") ? t("errCreds") : (err.message || t("errCreds")));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    resetMsg();
    if (!email || !password) { setError(t("errFill")); return; }
    if (!nickname || nickname.trim().length < 2) { setError(t("errNick")); return; }
    if (password.length < 8)  { setError(t("errShort")); return; }
    if (password !== confirm) { setError(t("errMatch")); return; }
    if (!isSupabaseConfigured || !supabase) { setError(t("errSupabase")); return; }
    setLoading(true);
    try {
      const nick = nickname.trim();
      const { error: err } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { nickname: nick, full_name: nick } },
      });
      if (err) throw err;
      setSuccess(t("successSignup"));
    } catch (err) {
      setError(err.message?.includes("already registered") ? t("errExists") : (err.message || ""));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    resetMsg();
    if (!isSupabaseConfigured || !supabase) { setError(t("errSupabase")); return; }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (err) throw err;
    } catch (err) {
      setError(err.message || "");
      setLoading(false);
    }
  };

  const background = {
    minHeight: "100vh",
    backgroundColor: "#0d1117",
    backgroundImage:
      "radial-gradient(ellipse 90% 55% at 50% -5%, rgba(0,192,118,0.14), transparent 65%)," +
      "linear-gradient(rgba(255,255,255,0.11) 1px, transparent 1px)," +
      "linear-gradient(90deg, rgba(255,255,255,0.11) 1px, transparent 1px)",
    backgroundSize: "100% 100%, 52px 52px, 52px 52px",
  };

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      style={{ ...background, fontFamily: "'Inter', 'Heebo', 'Segoe UI', sans-serif" }}
      className="w-full flex items-center justify-center px-5 py-10"
    >
      <div className="w-full max-w-[440px]">

        {/* Hero */}
        <div className="flex flex-col items-center mb-6">
          <Logo size={72} showText={false} />
          <h1
            className="mt-4 text-2xl font-extrabold text-center"
            style={{ letterSpacing: "0.05em", color: "#F8FAFC" }}
          >
            SWING<span style={{ color: "#00C076" }}>EDGE</span>
          </h1>
          <p className="mt-2 text-sm text-center" style={{ color: "#9AA4B2" }}>{t("tagline")}</p>
        </div>

        {/* Card */}
        <div
          className="bg-white"
          style={{
            borderRadius: 28,
            boxShadow:
              "0 4px 8px rgba(15,20,15,0.06), 0 24px 48px rgba(15,20,15,0.09)",
            padding: 32,
          }}
        >
          {authView === "main" && (
            <>
              {/* Tabs */}
              <div className="flex bg-slate-100 rounded-[12px] p-1 mb-6">
                <TabBtn active={tab === "signin"} onClick={() => { setTab("signin"); resetMsg(); }}>
                  {t("signIn")}
                </TabBtn>
                <TabBtn active={tab === "signup"} onClick={() => { setTab("signup"); resetMsg(); }}>
                  {t("signUp")}
                </TabBtn>
              </div>

              {tab === "signin" ? (
                <form onSubmit={handleSignIn} className="flex flex-col gap-3">
                  <Input icon={Mail} type="email" placeholder={t("email")} value={email}
                    onChange={(e) => setEmail(e.target.value)} isRTL={isRTL} autoComplete="email"
                    aria-label={t("email")} />
                  <Input icon={Lock} type={show ? "text" : "password"} placeholder={t("password")}
                    value={password} onChange={(e) => setPassword(e.target.value)} isRTL={isRTL}
                    autoComplete="current-password"
                    rightIcon={show ? EyeOff : Eye} onRightClick={() => setShow((s) => !s)}
                    aria-label={t("password")} />

                  <div className={isRTL ? "text-left" : "text-right"}>
                    <button
                      type="button"
                      onClick={() => { setAuthView("forgot"); resetMsg(); }}
                      className="text-sm text-emerald-600 hover:underline"
                    >
                      {t("forgot")}
                    </button>
                  </div>

                  <FeedbackArea error={error} success={success} />

                  <PrimaryBtn loading={loading}>
                    {loading ? t("signingIn") : t("signInBtn")}
                  </PrimaryBtn>

                  <Divider label={t("or")} />

                  <GoogleBtn onClick={handleGoogle} disabled={loading}>
                    {t("google")}
                  </GoogleBtn>
                </form>
              ) : (
                <form onSubmit={handleSignUp} className="flex flex-col gap-3">
                  <Input icon={User} type="text" placeholder={t("nickname")} value={nickname}
                    onChange={(e) => setNickname(e.target.value)} isRTL={isRTL} autoComplete="nickname"
                    aria-label={t("nickname")} />
                  <Input icon={Mail} type="email" placeholder={t("email")} value={email}
                    onChange={(e) => setEmail(e.target.value)} isRTL={isRTL} autoComplete="email"
                    aria-label={t("email")} />
                  <Input icon={Lock} type={show ? "text" : "password"} placeholder={t("password")}
                    value={password} onChange={(e) => setPassword(e.target.value)} isRTL={isRTL}
                    autoComplete="new-password"
                    rightIcon={show ? EyeOff : Eye} onRightClick={() => setShow((s) => !s)}
                    aria-label={t("password")} />
                  <Input icon={Lock} type={show ? "text" : "password"} placeholder={t("confirmPass")}
                    value={confirm} onChange={(e) => setConfirm(e.target.value)} isRTL={isRTL}
                    autoComplete="new-password"
                    aria-label={t("confirmPass")} />

                  <FeedbackArea error={error} success={success} />

                  <PrimaryBtn loading={loading}>
                    {loading ? t("creating") : t("create")}
                  </PrimaryBtn>

                  <Divider label={t("or")} />

                  <GoogleBtn onClick={handleGoogle} disabled={loading}>
                    {t("google")}
                  </GoogleBtn>
                </form>
              )}
            </>
          )}

          {authView === "forgot" && (
            <ForgotPassword
              lang={lang}
              onBack={() => { setAuthView("main"); resetMsg(); }}
            />
          )}

          {authView === "reset" && (
            <ResetPassword
              lang={lang}
              onComplete={() => { setAuthView("main"); resetMsg(); }}
            />
          )}
        </div>

        <p className="mt-6 text-xs text-center px-4" style={{ color: "#8B95A5" }}>{t("footer")}</p>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 h-10 rounded-[10px] text-sm transition-all ${
        active
          ? "bg-white shadow-sm text-emerald-600 font-semibold"
          : "text-slate-500 hover:text-slate-700 font-medium"
      }`}
    >
      {children}
    </button>
  );
}

function Input({ icon: Icon, rightIcon: RightIcon, onRightClick, isRTL, ...rest }) {
  return (
    <div className="relative">
      <span className={`absolute top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none ${isRTL ? "right-3" : "left-3"}`}>
        <Icon size={18} />
      </span>
      <input
        {...rest}
        dir={isRTL ? "rtl" : "ltr"}
        style={{
          [isRTL ? "paddingRight" : "paddingLeft"]: 44,
          [isRTL ? "paddingLeft" : "paddingRight"]: RightIcon ? 40 : 16,
        }}
        className="w-full h-12 bg-white border-[1.5px] border-slate-200 rounded-[10px] text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition"
      />
      {RightIcon && (
        <button
          type="button"
          tabIndex={-1}
          onClick={onRightClick}
          className={`absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 ${isRTL ? "left-3" : "right-3"}`}
        >
          <RightIcon size={16} />
        </button>
      )}
    </div>
  );
}

function PrimaryBtn({ loading, children }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full h-12 rounded-[12px] font-semibold text-white text-sm transition-all active:scale-[0.98] hover:-translate-y-px disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      style={{
        background: "linear-gradient(135deg, #00C076 0%, #16D687 100%)",
        boxShadow: loading ? "none" : "0 4px 16px rgba(0,192,118,0.30)",
      }}
    >
      {loading && (
        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity="0.3" />
          <path d="M22 12a10 10 0 0 0-10-10" stroke="white" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}
      <span>{children}</span>
    </button>
  );
}

function GoogleBtn({ onClick, disabled, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full h-12 rounded-[12px] bg-white border-[1.5px] border-slate-200 text-slate-700 font-medium text-sm transition hover:bg-slate-50 disabled:opacity-60 flex items-center justify-center gap-3"
    >
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
        <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
        <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
        <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
      </svg>
      <span>{children}</span>
    </button>
  );
}

function Divider({ label }) {
  return (
    <div className="flex items-center gap-3 my-1">
      <div className="flex-1 h-px bg-slate-200" />
      <span className="text-xs text-slate-400 font-medium">{label}</span>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  );
}

function FeedbackArea({ error, success }) {
  if (!error && !success) return null;
  if (error)
    return (
      <p className="text-xs bg-rose-50 border border-rose-200 text-rose-600 rounded-lg px-3 py-2 text-center">
        {error}
      </p>
    );
  return (
    <p className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-3 py-2 text-center">
      {success}
    </p>
  );
}
