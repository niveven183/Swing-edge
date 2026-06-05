import { Navigate } from "react-router-dom";
import { useSupabaseSession } from "../hooks/useSupabaseSession.js";
import LandingPage from "./LandingPage.jsx";
import Logo from "./Logo.jsx";

export default function LandingGate() {
  const { session, ready } = useSupabaseSession();

  // Short loader while the (async) session check resolves — prevents the
  // landing page from flashing for an already-authenticated user.
  if (!ready) {
    return (
      <div
        className="min-h-screen bg-[var(--bg-primary)] dark:bg-[#0a0f1e] text-slate-300 flex items-center justify-center"
        style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="animate-pulse">
            <Logo size={40} showText={false} />
          </div>
          <span className="text-xs tracking-widest uppercase text-slate-500">
            Loading SwingEdge…
          </span>
        </div>
      </div>
    );
  }

  if (session) return <Navigate to="/app" replace />;

  return <LandingPage />;
}
