import { useState } from "react";
import { Zap, ShieldCheck, TrendingUp, Sparkles, Eye, EyeOff, ArrowRight, Mail, Lock, User, BarChart2, Phone, KeyRound } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../supabaseClient.js";

const GoogleIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
    <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
  </svg>
);

const InputField = ({ icon: Icon, type = "text", placeholder, value, onChange, rightSlot, ...rest }) => (
  <div className="relative">
    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"><Icon size={16} /></span>
    <input type={type} placeholder={placeholder} value={value} onChange={onChange} dir="rtl"
      className="w-full bg-[#0a0f1e] border border-white/[0.10] rounded-xl px-4 py-3 pr-10 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition"
      {...rest} />
    {rightSlot && (
      <button type="button" tabIndex={-1} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition" onClick={rightSlot.onClick}>
        {rightSlot.node}
      </button>
    )}
  </div>
);

const EXPERIENCE_OPTIONS = [
  { value: "beginner",     label: "מתחיל — פחות משנה" },
  { value: "intermediate", label: "בינוני — 1–3 שנים" },
  { value: "advanced",     label: "מנוסה — 3+ שנים" },
];

const TABS = [
  { id: "login",  label: "כניסה" },
  { id: "signup", label: "הרשמה" },
  { id: "phone",  label: "טלפון" },
];

export default function AuthScreen() {
  const [mode, setMode]           = useState("login");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [success, setSuccess]     = useState(null);
  const [showPass, setShowPass]   = useState(false);

  // email/password
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");

  // signup extras
  const [fullName, setFullName]   = useState("");
  const [experience, setExperience] = useState("beginner");

  // phone OTP
  const [phone, setPhone]         = useState("");
  const [otp, setOtp]             = useState("");
  const [otpSent, setOtpSent]     = useState(false);

  const reset = () => { setError(null); setSuccess(null); };

  /* ── Login ── */
  const handleLogin = async (e) => {
    e.preventDefault(); reset();
    if (!email || !password) { setError("נא למלא מייל וסיסמה."); return; }
    if (!isSupabaseConfigured || !supabase) { setError("Supabase לא מוגדר."); return; }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (err) throw err;
    } catch (e) {
      setError(e.message?.includes("Invalid login credentials") ? "מייל או סיסמה שגויים." : (e.message || "שגיאה בהתחברות."));
    } finally { setLoading(false); }
  };

  /* ── Signup ── */
  const handleSignup = async (e) => {
    e.preventDefault(); reset();
    if (!fullName.trim()) { setError("נא להזין שם."); return; }
    if (!email || !password) { setError("נא למלא מייל וסיסמה."); return; }
    if (password.length < 8) { setError("הסיסמה חייבת להכיל לפחות 8 תווים."); return; }
    if (!isSupabaseConfigured || !supabase) { setError("Supabase לא מוגדר."); return; }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signUp({
        email: email.trim(), password,
        options: { data: { full_name: fullName.trim(), experience } },
      });
      if (err) throw err;
      setSuccess("נרשמת בהצלחה!");
    } catch (e) {
      setError(e.message?.includes("already registered") ? "המייל הזה כבר רשום — נסה להתחבר." : (e.message || "שגיאה בהרשמה."));
    } finally { setLoading(false); }
  };

  /* ── Forgot ── */
  const handleForgot = async (e) => {
    e.preventDefault(); reset();
    if (!email) { setError("הזן מייל לשחזור."); return; }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
      if (err) throw err;
      setSuccess("נשלח לך מייל לאיפוס סיסמה.");
    } catch (e) {
      setError(e.message || "שגיאה בשליחה.");
    } finally { setLoading(false); }
  };

  /* ── Phone: send OTP ── */
  const handleSendOtp = async (e) => {
    e.preventDefault(); reset();
    let normalized = phone.trim().replace(/\s|-/g, "");
    if (!normalized) { setError("הזן מספר טלפון."); return; }
    // Convert Israeli local format to E.164
    if (normalized.startsWith("05")) normalized = "+972" + normalized.slice(1);
    if (!normalized.startsWith("+")) { setError("הוסף קידומת בינ״ל, למשל +972..."); return; }
    if (!isSupabaseConfigured || !supabase) { setError("Supabase לא מוגדר."); return; }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithOtp({ phone: normalized });
      if (err) throw err;
      setPhone(normalized);
      setOtpSent(true);
      setSuccess(`קוד נשלח ל-${normalized}`);
    } catch (e) {
      setError(e.message || "שגיאה בשליחת הקוד. ודא שאימות טלפון מופעל ב-Supabase.");
    } finally { setLoading(false); }
  };

  /* ── Phone: verify OTP ── */
  const handleVerifyOtp = async (e) => {
    e.preventDefault(); reset();
    if (otp.length < 4) { setError("הזן את הקוד שקיבלת."); return; }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.verifyOtp({ phone, token: otp, type: "sms" });
      if (err) throw err;
    } catch (e) {
      setError(e.message?.includes("Token has expired") ? "הקוד פג תוקף — שלח שוב." : (e.message || "קוד שגוי."));
    } finally { setLoading(false); }
  };

  /* ── Google ── */
  const handleGoogle = async () => {
    reset();
    if (!isSupabaseConfigured || !supabase) { setError("Supabase לא מוגדר."); return; }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
      if (err) throw err;
    } catch (e) {
      setError(e.message || "שגיאה בהתחברות עם Google.");
      setLoading(false);
    }
  };

  const switchMode = (m) => { setMode(m); setOtpSent(false); setOtp(""); reset(); };

  const showGoogle = mode === "login" || mode === "signup";

  return (
    <div dir="rtl" className="min-h-screen w-full bg-[#0a0f1e] text-slate-200 flex items-center justify-center px-5 py-10 relative overflow-hidden" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[480px] h-[480px] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[520px] h-[520px] rounded-full bg-violet-600/10 blur-3xl" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[200px] rounded-full bg-cyan-400/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Beta badge */}
        <div className="flex justify-center mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-cyan-500/15 to-violet-500/15 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold tracking-[0.2em] uppercase">
            <Sparkles size={11} /> Closed Beta · v1.0
          </span>
        </div>

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center shadow-[0_0_40px_rgba(6,182,212,0.35)] mb-4">
            <Zap size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-wider text-white">SWING<span className="text-cyan-400">EDGE</span></h1>
          <p className="mt-2 text-sm text-slate-400 text-center">היומן החכם לסוחרי סווינג</p>
        </div>

        {/* Feature pills */}
        {mode !== "forgot" && (
          <div className="grid grid-cols-3 gap-2 mb-6">
            {[{ icon: TrendingUp, label: "יומן חכם" }, { icon: ShieldCheck, label: "ניהול סיכון" }, { icon: Sparkles, label: "AI Coach" }].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-2 py-3">
                <Icon size={16} className="text-cyan-400" />
                <span className="text-[11px] text-slate-300 font-semibold">{label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0d1424]/80 backdrop-blur-md p-6 shadow-2xl">

          {/* Tabs */}
          {mode !== "forgot" && (
            <div className="flex rounded-xl bg-[#0a0f1e] border border-white/[0.07] p-1 mb-6">
              {TABS.map((t) => (
                <button key={t.id} type="button" onClick={() => switchMode(t.id)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold tracking-wide transition ${mode === t.id ? "bg-gradient-to-r from-cyan-500/20 to-violet-500/20 text-cyan-300 border border-cyan-500/30" : "text-slate-500 hover:text-slate-300"}`}>
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {/* ── LOGIN ── */}
          {mode === "login" && (
            <form onSubmit={handleLogin} className="flex flex-col gap-3">
              <InputField icon={Mail} type="email" placeholder="מייל" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
              <InputField icon={Lock} type={showPass ? "text" : "password"} placeholder="סיסמה" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password"
                rightSlot={{ onClick: () => setShowPass(p => !p), node: showPass ? <EyeOff size={15} /> : <Eye size={15} /> }} />
              <div className="text-right">
                <button type="button" onClick={() => { setMode("forgot"); reset(); }} className="text-[11px] text-cyan-500 hover:text-cyan-300 transition">שכחת סיסמה?</button>
              </div>
              <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 mt-1 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 hover:opacity-90 disabled:opacity-50 text-white font-bold text-sm py-3 transition shadow-lg">
                {loading ? "מתחבר..." : <><span>כניסה</span><ArrowRight size={15} /></>}
              </button>
            </form>
          )}

          {/* ── SIGNUP ── */}
          {mode === "signup" && (
            <form onSubmit={handleSignup} className="flex flex-col gap-3">
              <InputField icon={User} placeholder="שם מלא" value={fullName} onChange={e => setFullName(e.target.value)} autoComplete="name" />
              <InputField icon={Mail} type="email" placeholder="מייל" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
              <InputField icon={Lock} type={showPass ? "text" : "password"} placeholder="סיסמה (8 תווים לפחות)" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password"
                rightSlot={{ onClick: () => setShowPass(p => !p), node: showPass ? <EyeOff size={15} /> : <Eye size={15} /> }} />
              <div className="relative">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"><BarChart2 size={16} /></span>
                <select value={experience} onChange={e => setExperience(e.target.value)} dir="rtl"
                  className="w-full bg-[#0a0f1e] border border-white/[0.10] rounded-xl px-4 py-3 pr-10 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition appearance-none">
                  {EXPERIENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 mt-1 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 hover:opacity-90 disabled:opacity-50 text-white font-bold text-sm py-3 transition shadow-lg">
                {loading ? "נרשם..." : <><span>יצירת חשבון</span><ArrowRight size={15} /></>}
              </button>
            </form>
          )}

          {/* ── PHONE OTP ── */}
          {mode === "phone" && !otpSent && (
            <form onSubmit={handleSendOtp} className="flex flex-col gap-3">
              <p className="text-xs text-slate-500 text-center mb-1">הכנס מספר ישראלי (050...) או בינ״ל (+1...)</p>
              <InputField icon={Phone} type="tel" placeholder="מספר טלפון" value={phone} onChange={e => setPhone(e.target.value)} autoComplete="tel" inputMode="tel" dir="ltr" />
              <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 hover:opacity-90 disabled:opacity-50 text-white font-bold text-sm py-3 transition shadow-lg">
                {loading ? "שולח..." : <><span>שלח קוד SMS</span><ArrowRight size={15} /></>}
              </button>
            </form>
          )}

          {mode === "phone" && otpSent && (
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-3">
              <p className="text-xs text-slate-400 text-center">הוזן קוד 6 ספרות שנשלח ל-<span className="text-cyan-400 font-mono">{phone}</span></p>
              <input
                type="text" inputMode="numeric" maxLength={6} placeholder="קוד אימות"
                value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
                className="w-full bg-[#0a0f1e] border border-white/[0.10] rounded-xl px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] text-cyan-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition"
                dir="ltr"
              />
              <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 hover:opacity-90 disabled:opacity-50 text-white font-bold text-sm py-3 transition shadow-lg">
                {loading ? "מאמת..." : <><KeyRound size={15} /><span>אמת קוד</span></>}
              </button>
              <button type="button" onClick={() => { setOtpSent(false); setOtp(""); reset(); }} className="text-[11px] text-slate-500 hover:text-slate-300 text-center transition">← שלח קוד חדש</button>
            </form>
          )}

          {/* ── FORGOT ── */}
          {mode === "forgot" && (
            <form onSubmit={handleForgot} className="flex flex-col gap-3">
              <p className="text-sm text-slate-300 text-center mb-1">הזן את המייל שלך ונשלח קישור לאיפוס.</p>
              <InputField icon={Mail} type="email" placeholder="מייל" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
              <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 hover:opacity-90 disabled:opacity-50 text-white font-bold text-sm py-3 transition shadow-lg">
                {loading ? "שולח..." : "שלח קישור"}
              </button>
              <button type="button" onClick={() => { setMode("login"); reset(); }} className="text-[11px] text-slate-500 hover:text-slate-300 text-center transition">← חזרה לכניסה</button>
            </form>
          )}

          {/* Feedback */}
          {error   && <p className="mt-4 text-[12px] text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2 text-center leading-relaxed">{error}</p>}
          {success && <p className="mt-4 text-[12px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2 text-center leading-relaxed">{success}</p>}

          {/* Google divider */}
          {showGoogle && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-white/[0.07]" />
                <span className="text-[11px] text-slate-600">או</span>
                <div className="flex-1 h-px bg-white/[0.07]" />
              </div>
              <button type="button" onClick={handleGoogle} disabled={loading} dir="ltr"
                className="w-full flex items-center justify-center gap-3 rounded-xl bg-white hover:bg-slate-50 disabled:opacity-60 text-slate-800 font-semibold text-sm py-3 transition shadow-lg shadow-black/30">
                <GoogleIcon size={18} />
                <span>Continue with Google</span>
              </button>
            </>
          )}

          <p className="mt-5 text-[11px] text-slate-600 text-center leading-relaxed">הנתונים שלך נשמרים מאובטחים ב-Supabase.</p>
        </div>

        <p className="mt-6 text-center text-[11px] text-slate-600 tracking-wide">© {new Date().getFullYear()} SwingEdge · Built for Swing Traders</p>
      </div>
    </div>
  );
}
