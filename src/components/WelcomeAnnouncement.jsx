import { memo } from "react";
import { BarChart3, Compass, MessageCircle, ArrowLeft, ArrowRight, X } from "lucide-react";

// One-time education modal shown to every user exactly once (tracked by the
// cross-device `welcomeSeen` flag in user_settings). Module-scope + memo so it
// never remounts on parent re-render (anti-flicker lesson). Design System v3.
// Bilingual he/en; en is the fallback for other languages (only he+en specified).
const COPY = {
  he: {
    title: "ברוכים הבאים ל-SwingEdge 👋",
    intro1: "המערכת שלנו לומדת אותך — ולכל למידה צריך נתונים.",
    intro2: "איך מפיקים ממנה את המקסימום:",
    b1Bold: "הזינו לפחות 10 עסקאות",
    b1Body:
      " — מהיומן הקיים שלכם או ידנית. מ-10 עסקאות ה-Coach מתחיל לזהות דפוסים אישיים: מה עובד לכם, איפה אתם מפסידים, ומתי אתם סוחרים ברגש.",
    b2Bold: "חקרו את כל הטאבים",
    b2Body:
      " — Trading DNA, Edge Finder, ניתוח עסקה עם צילום גרף, והמנטור האישי. כל כלי חושף זווית אחרת על המסחר שלכם.",
    b3: "יש רעיון או משהו שלא עובד? טאב הפידבק פתוח — לשירותכם.",
    tagline: "סוחר טוב מודד. סוחר מצוין נמדד.",
    cta: "בואו נתחיל",
  },
  en: {
    title: "Welcome to SwingEdge 👋",
    intro1: "Our system learns you — and every bit of learning needs data.",
    intro2: "How to get the most out of it:",
    b1Bold: "Log at least 10 trades",
    b1Body:
      " — from your existing journal or manually. From 10 trades the Coach starts spotting your personal patterns: what works for you, where you lose, and when you trade on emotion.",
    b2Bold: "Explore every tab",
    b2Body:
      " — Trading DNA, Edge Finder, trade analysis with a chart screenshot, and the personal mentor. Each tool reveals a different angle on your trading.",
    b3: "Got an idea or something not working? The Feedback tab is always open — at your service.",
    tagline: "A good trader measures. A great trader is measured.",
    cta: "Let's begin",
  },
};

function WelcomeAnnouncement({ lang, isRTL, onStart }) {
  const c = COPY[lang] || COPY.en;
  const Arrow = isRTL ? ArrowLeft : ArrowRight;
  const bullets = [
    { Icon: BarChart3, bold: c.b1Bold, body: c.b1Body, emoji: "📊" },
    { Icon: Compass, bold: c.b2Bold, body: c.b2Body, emoji: "🧭" },
  ];

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      onClick={onStart}
      className="fixed inset-0 z-[100] flex items-center justify-center px-5 py-8 overflow-y-auto bg-[#070c18]/90 backdrop-blur-sm text-slate-200"
      style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 right-0 w-[480px] h-[480px] rounded-full bg-[#00C076]/10 blur-3xl" />
        <div className="absolute bottom-0 -left-40 w-[520px] h-[520px] rounded-full bg-[#00C076]/[0.06] blur-3xl" />
      </div>

      <div
        className="relative z-10 w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative rounded-2xl border border-[var(--border-subtle)] dark:border-white/[0.08] bg-[#0A100D] backdrop-blur-md p-8 shadow-2xl">
          {/* Close */}
          <button
            onClick={onStart}
            aria-label={isRTL ? "סגור" : "Close"}
            className="absolute top-4 end-4 text-slate-500 hover:text-white transition"
          >
            <X size={18} />
          </button>

          {/* Hero */}
          <div className="mx-auto w-16 h-16 rounded-2xl bg-[#00C076]/15 border border-[#00C076]/30 flex items-center justify-center mb-5 shadow-[0_0_40px_rgba(0,192,118,0.25)]">
            <span className="text-3xl leading-none">👋</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight text-center mb-4">
            {c.title}
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed text-center">{c.intro1}</p>
          <p className="text-sm text-slate-400 leading-relaxed text-center mb-6">{c.intro2}</p>

          {/* Bullets */}
          <div className="space-y-3 mb-5">
            {bullets.map(({ Icon, bold, body, emoji }) => (
              <div
                key={bold}
                className="flex items-start gap-3 rounded-xl border border-[var(--border-subtle)] dark:border-white/[0.08] bg-white/[0.03] p-3.5"
              >
                <div className="shrink-0 w-9 h-9 rounded-lg bg-[#00C076]/10 border border-[#00C076]/20 flex items-center justify-center">
                  <Icon size={16} className="text-[#00C076]" />
                </div>
                <p className="text-[13px] text-slate-300 leading-relaxed">
                  <span aria-hidden="true">{emoji} </span>
                  <span className="font-bold text-white">{bold}</span>
                  {body}
                </p>
              </div>
            ))}
          </div>

          {/* Feedback line */}
          <p className="text-[13px] text-slate-300 leading-relaxed mb-5">
            <span aria-hidden="true">💬 </span>
            {c.b3}
          </p>

          {/* Tagline */}
          <p className="text-center text-sm font-bold text-[#00C076] mb-6">{c.tagline}</p>

          {/* CTA */}
          <button
            onClick={onStart}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#00C076] hover:bg-[#00d484] text-[#04120c] font-bold text-sm py-3.5 transition shadow-lg shadow-[#00C076]/20"
          >
            {c.cta}
            <Arrow size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(WelcomeAnnouncement);
