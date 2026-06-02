import { useState, useEffect, useRef } from "react";
import { Lock, Eye, EyeOff, X } from "lucide-react";
import { supabase } from "../supabaseClient.js";
import { useToast } from "./ToastProvider.jsx";

export default function ChangePasswordModal({ open, onClose, lang = "he" }) {
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();
  const firstFieldRef = useRef(null);

  const t = (he, en) => (lang === "he" ? he : en);
  const isRTL = lang === "he";

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!open) {
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
      setShowCurrent(false);
      setShowNew(false);
      setError("");
      setLoading(false);
    } else {
      // Focus first field shortly after mount
      const id = setTimeout(() => firstFieldRef.current?.focus(), 50);
      return () => clearTimeout(id);
    }
  }, [open]);

  // Escape closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onClose]);

  const handleSubmit = async () => {
    setError("");
    if (!currentPwd) {
      setError(t("נא הזן סיסמה נוכחית", "Please enter current password"));
      return;
    }
    if (newPwd.length < 8) {
      setError(t("הסיסמה חייבת להכיל לפחות 8 תווים", "Password must be at least 8 characters"));
      return;
    }
    if (newPwd !== confirmPwd) {
      setError(t("הסיסמאות לא תואמות", "Passwords do not match"));
      return;
    }
    if (newPwd === currentPwd) {
      setError(t("הסיסמה החדשה חייבת להיות שונה מהנוכחית", "New password must differ from current"));
      return;
    }

    setLoading(true);
    try {
      if (!supabase) {
        setError(t("Supabase לא מוגדר", "Supabase is not configured"));
        setLoading(false);
        return;
      }

      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user?.email) {
        setError(t("לא ניתן לזהות את המשתמש", "Could not identify user"));
        setLoading(false);
        return;
      }

      // Re-authenticate to verify current password
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: userData.user.email,
        password: currentPwd,
      });
      if (signInErr) {
        setError(t("הסיסמה הנוכחית שגויה", "Current password is incorrect"));
        setLoading(false);
        return;
      }

      const { error: updateErr } = await supabase.auth.updateUser({
        password: newPwd,
      });
      if (updateErr) {
        setError(updateErr.message || t("שגיאה בעדכון הסיסמה", "Failed to update password"));
        setLoading(false);
        return;
      }

      toast.success(t("הסיסמה עודכנה בהצלחה", "Password updated successfully"));
      onClose();
    } catch (e) {
      setError(e?.message || t("שגיאה לא צפויה", "Unexpected error"));
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      role="presentation"
      onClick={loading ? undefined : onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--bg-elevated)] dark:bg-[#0d1424] border border-[var(--border-subtle)] dark:border-white/[0.08] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-subtle)] dark:border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-emerald-400" />
            <h3 id="change-password-title" className="text-sm font-bold text-white">
              {t("שינוי סיסמה", "Change Password")}
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            aria-label={t("סגור", "Close")}
            className="text-slate-400 hover:text-white transition disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {/* Current */}
          <div className="relative">
            <input
              ref={firstFieldRef}
              type={showCurrent ? "text" : "password"}
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
              placeholder={t("סיסמה נוכחית", "Current password")}
              autoComplete="current-password"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/15 transition"
              dir={isRTL ? "rtl" : "ltr"}
            />
            <button
              type="button"
              onClick={() => setShowCurrent((s) => !s)}
              aria-label={showCurrent ? t("הסתר סיסמה", "Hide password") : t("הצג סיסמה", "Show password")}
              className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? "left-3" : "right-3"} text-slate-400 hover:text-slate-200`}
            >
              {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>

          {/* New */}
          <div className="relative">
            <input
              type={showNew ? "text" : "password"}
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder={t("סיסמה חדשה (לפחות 8 תווים)", "New password (8+ chars)")}
              autoComplete="new-password"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/15 transition"
              dir={isRTL ? "rtl" : "ltr"}
            />
            <button
              type="button"
              onClick={() => setShowNew((s) => !s)}
              aria-label={showNew ? t("הסתר סיסמה", "Hide password") : t("הצג סיסמה", "Show password")}
              className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? "left-3" : "right-3"} text-slate-400 hover:text-slate-200`}
            >
              {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>

          {/* Confirm */}
          <input
            type={showNew ? "text" : "password"}
            value={confirmPwd}
            onChange={(e) => setConfirmPwd(e.target.value)}
            placeholder={t("אשר סיסמה חדשה", "Confirm new password")}
            autoComplete="new-password"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/15 transition"
            dir={isRTL ? "rtl" : "ltr"}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loading) handleSubmit();
            }}
          />

          {error && (
            <div
              role="alert"
              className="px-3 py-2 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300"
            >
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm font-medium hover:bg-white/10 transition disabled:opacity-50"
            >
              {t("ביטול", "Cancel")}
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !currentPwd || !newPwd || !confirmPwd}
              className="flex-1 px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t("שומר...", "Saving...") : t("שמור סיסמה", "Save Password")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
