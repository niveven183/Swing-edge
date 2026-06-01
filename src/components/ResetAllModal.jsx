import { useState, useEffect } from "react";
import { X, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../supabaseClient.js";

/**
 * Three-step destructive "wipe my journal" flow.
 * props:
 *   - open: bool
 *   - tradesCount: number (informational, shown in step 1)
 *   - lang: "he" | "en"
 *   - onClose(): cancel
 */
export default function ResetAllModal({ open, tradesCount = 0, lang, onClose }) {
  const isHe = lang === "he";
  const [step, setStep] = useState("warn"); // warn | confirm | password | done
  const [typed, setTyped] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [working, setWorking] = useState(false);
  const [providerInfo, setProviderInfo] = useState(null); // { isGoogle, email }

  // Reset state every time the modal is reopened
  useEffect(() => {
    if (!open) return;
    setStep("warn");
    setTyped("");
    setPassword("");
    setError(null);
    setWorking(false);
    setProviderInfo(null);
  }, [open]);

  // Inspect auth provider once we enter the password step
  useEffect(() => {
    if (step !== "password" || !isSupabaseConfigured || !supabase) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data?.user;
        if (cancelled || !user) return;
        const provider = user.app_metadata?.provider;
        const identities = user.identities || [];
        const hasEmailIdentity = identities.some(i => i?.provider === "email");
        const isGoogle = provider === "google" || (!hasEmailIdentity && identities.some(i => i?.provider === "google"));
        setProviderInfo({ isGoogle, email: user.email });
      } catch (e) {
        if (!cancelled) setError(e?.message || (isHe ? "שגיאת אימות" : "Auth error"));
      }
    })();
    return () => { cancelled = true; };
  }, [step, isHe]);

  // ESC closes only when not mid-operation
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (working || step === "done") return;
      onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, working, step, onClose]);

  if (!open) return null;

  async function handleFinalReset() {
    setError(null);
    if (!isSupabaseConfigured || !supabase) {
      setError(isHe ? "Supabase לא מוגדר" : "Supabase is not configured");
      return;
    }
    setWorking(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) throw new Error(isHe ? "אין משתמש מחובר" : "Not signed in");

      // 1) Verify password by re-authenticating
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });
      if (signErr) {
        setError(isHe ? "סיסמה שגויה" : "Wrong password");
        setWorking(false);
        return;
      }

      // 2) Delete all trades for this user
      const { error: delErr } = await supabase
        .from("trades")
        .delete()
        .eq("user_id", user.id);
      if (delErr) {
        setError((isHe ? "שגיאת מחיקה: " : "Delete error: ") + (delErr.message || ""));
        setWorking(false);
        return;
      }

      // 3) Wipe localStorage
      try { localStorage.removeItem("swingEdgeTrades"); } catch {}

      // 4) Show success then hard-reload
      setStep("done");
      setTimeout(() => { window.location.reload(); }, 2000);
    } catch (e) {
      setError(e?.message || (isHe ? "שגיאה" : "Error"));
      setWorking(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#0d1424] border border-rose-500/30 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] bg-rose-500/5">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-rose-400" />
            <span className="text-sm font-bold text-rose-200">
              {isHe ? "אזור מסוכן — איפוס יומן" : "Danger Zone — Reset Journal"}
            </span>
          </div>
          <button
            onClick={() => { if (!working && step !== "done") onClose?.(); }}
            disabled={working || step === "done"}
            className="text-slate-500 hover:text-slate-200 transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {step === "warn" && (
            <>
              <div className="text-2xl">⚠️</div>
              <p className="text-sm text-slate-200">
                {isHe
                  ? `פעולה זו תמחק את כל ${tradesCount} העסקאות שלך.`
                  : `This will permanently delete all ${tradesCount} of your trades.`}
              </p>
              <p className="text-sm text-rose-300/90">
                {isHe ? "פעולה זו לא ניתנת לביטול." : "This action cannot be undone."}
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setStep("confirm")}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold transition"
                >
                  {isHe ? "המשך" : "Continue"}
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm hover:bg-white/10 transition"
                >
                  {isHe ? "ביטול" : "Cancel"}
                </button>
              </div>
            </>
          )}

          {step === "confirm" && (
            <>
              <p className="text-sm text-slate-200">
                {isHe
                  ? "הקלד DELETE כדי לאשר:"
                  : 'Type "DELETE" to confirm:'}
              </p>
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder="DELETE"
                autoFocus
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-rose-500/50 focus:outline-none font-mono"
              />
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setStep("password")}
                  disabled={typed !== "DELETE"}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:bg-rose-900/40 disabled:text-rose-300/40 disabled:cursor-not-allowed text-white text-sm font-bold transition"
                >
                  {isHe ? "המשך" : "Continue"}
                </button>
                <button
                  onClick={() => setStep("warn")}
                  className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm hover:bg-white/10 transition"
                >
                  {isHe ? "חזור" : "Back"}
                </button>
              </div>
            </>
          )}

          {step === "password" && (
            <>
              {providerInfo?.isGoogle ? (
                <>
                  <p className="text-sm text-amber-300">
                    {isHe
                      ? "משתמשי Google לא יכולים לאפס מהאפליקציה. צור קשר עם התמיכה."
                      : "Google users cannot reset from the app. Please contact support."}
                  </p>
                  <button
                    onClick={onClose}
                    className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm hover:bg-white/10 transition"
                  >
                    {isHe ? "סגור" : "Close"}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-200">
                    {isHe ? "הזן את סיסמת ה-Supabase שלך:" : "Enter your Supabase password:"}
                  </p>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isHe ? "סיסמה" : "Password"}
                    autoFocus
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-rose-500/50 focus:outline-none"
                  />
                  {error && (
                    <div className="text-[11px] text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg p-2.5">
                      {error}
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleFinalReset}
                      disabled={!password || working}
                      className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:bg-rose-900/40 disabled:text-rose-300/40 disabled:cursor-not-allowed text-white text-sm font-bold transition"
                    >
                      {working
                        ? isHe ? "מוחק…" : "Deleting…"
                        : isHe ? "אשר ומחק" : "Confirm Reset"}
                    </button>
                    <button
                      onClick={() => setStep("confirm")}
                      disabled={working}
                      className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm hover:bg-white/10 transition disabled:opacity-40"
                    >
                      {isHe ? "חזור" : "Back"}
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {step === "done" && (
            <div className="py-6 text-center space-y-3">
              <CheckCircle2 size={36} className="mx-auto text-emerald-400" />
              <p className="text-sm text-emerald-300 font-medium">
                {isHe ? "היומן אופס בהצלחה" : "Your journal has been reset"}
              </p>
              <p className="text-xs text-slate-500">
                {isHe ? "טוען מחדש..." : "Reloading…"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
