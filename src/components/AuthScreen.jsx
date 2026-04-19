import { useState } from "react";
import { Zap, ShieldCheck, TrendingUp, Sparkles } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../supabaseClient.js";

const GoogleIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
    <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
  </svg>
);

export default function AuthScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGoogleSignIn = async () => {
    setError(null);

    if (!isSupabaseConfigured || !supabase) {
      setError(
        "Supabase לא מוגדר. הוסף VITE_SUPABASE_URL ו-VITE_SUPABASE_ANON_KEY לקובץ .env"
      );
      return;
    }

    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (authError) throw authError;
    } catch (e) {
      setError(e.message || "שגיאה בהתחברות. נסה שוב.");
      setLoading(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen w-full bg-[#0a0f1e] text-slate-200 flex items-center justify-center px-5 py-10 relative overflow-hidden"
      style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[480px] h-[480px] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[520px] h-[520px] rounded-full bg-violet-600/10 blur-3xl" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[200px] rounded-full bg-cyan-400/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Beta ribbon */}
        <div className="flex justify-center mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-cyan-500/15 to-violet-500/15 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold tracking-[0.2em] uppercase">
            <Sparkles size={11} /> Closed Beta · v1.0
          </span>
        </div>

        {/* Logo block */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center shadow-[0_0_40px_rgba(6,182,212,0.35)] mb-4">
            <Zap size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-wider text-white">
            SWING<span className="text-cyan-400">EDGE</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400 text-center">
            היומן החכם לסוחרי סווינג
          </p>
        </div>

        {/* Feature bullets */}
        <div className="grid grid-cols-3 gap-2 mb-8">
          {[
            { icon: TrendingUp, label: "יומן חכם" },
            { icon: ShieldCheck, label: "ניהול סיכון" },
            { icon: Sparkles, label: "AI Coach" },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-2 py-3"
            >
              <Icon size={16} className="text-cyan-400" />
              <span className="text-[11px] text-slate-300 font-semibold">
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Auth card */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0d1424]/80 backdrop-blur-md p-6 shadow-2xl">
          <div className="text-center mb-5">
            <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-cyan-400">
              גרסת בטא
            </p>
            <p className="mt-2 text-sm text-slate-300">
              נבחרת להיות ראשון{" "}
              <span role="img" aria-label="rocket">
                🚀
              </span>
            </p>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            dir="ltr"
            className="w-full flex items-center justify-center gap-3 rounded-xl bg-white hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed text-slate-800 font-semibold text-sm py-3 transition shadow-lg shadow-black/30"
          >
            <GoogleIcon size={18} />
            <span>{loading ? "Connecting..." : "Continue with Google"}</span>
          </button>

          {error && (
            <p className="mt-4 text-[12px] text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2 text-center leading-relaxed">
              {error}
            </p>
          )}

          <p className="mt-5 text-[11px] text-slate-500 text-center leading-relaxed">
            בהתחברות אתה מאשר שימוש ביומן המסחר האישי שלך באפליקציה.
            <br />
            הנתונים שלך נשמרים מאובטחים ב-Supabase.
          </p>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-[11px] text-slate-600 tracking-wide">
          © {new Date().getFullYear()} SwingEdge · Built for Swing Traders
        </p>
      </div>
    </div>
  );
}
