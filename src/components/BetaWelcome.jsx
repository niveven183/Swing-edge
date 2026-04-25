import { Rocket, Users, MessageCircle, ArrowLeft } from "lucide-react";

export default function BetaWelcome({ onStart, userName }) {
  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[100] bg-[#070c18] text-slate-200 flex items-center justify-center px-5 py-8 overflow-y-auto"
      style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 right-0 w-[480px] h-[480px] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-0 -left-40 w-[520px] h-[520px] rounded-full bg-violet-600/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        <div className="rounded-2xl border border-white/[0.08] bg-[#0d1424]/80 backdrop-blur-md p-8 shadow-2xl text-center">
          {/* Badge */}
          <div className="flex justify-center mb-5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-cyan-500/15 to-violet-500/15 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold tracking-[0.2em] uppercase">
              Beta Access · Welcome
            </span>
          </div>

          {/* Hero */}
          <div className="mx-auto w-20 h-20 rounded-3xl bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center shadow-[0_0_40px_rgba(6,182,212,0.35)] mb-5">
            <Rocket size={36} className="text-white" />
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-2">
            ברוך הבא לגרסת הבטא 🚀
          </h1>
          {userName && (
            <p className="text-sm text-cyan-300 font-semibold mb-1">
              שמחים לראות אותך, {userName}
            </p>
          )}
          <p className="text-sm text-slate-400 leading-relaxed mb-6">
            אתה אחד מהסוחרים הראשונים שמקבלים גישה ל-SwingEdge.
            <br />
            כל דיווח שלך בונה את המוצר.
          </p>

          {/* Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-7 text-right">
            {[
              {
                icon: Users,
                title: "קהילה נבחרת",
                body: "אתה בין הסוחרים שמעצבים את המוצר",
              },
              {
                icon: MessageCircle,
                title: "קול ישיר",
                body: "כל פידבק שלך מגיע אלינו — ובאמת משפיע",
              },
              {
                icon: Rocket,
                title: "התקדמות מהירה",
                body: "גרסאות חדשות משתחררות כל שבוע",
              },
            ].map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3.5"
              >
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-2">
                  <Icon size={15} className="text-cyan-400" />
                </div>
                <p className="text-xs font-bold text-white mb-1">{title}</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {body}
                </p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={onStart}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-bold text-sm py-3.5 transition shadow-lg shadow-cyan-500/20"
          >
            בוא נתחיל
            <ArrowLeft size={16} />
          </button>

          <p className="mt-4 text-[11px] text-slate-500">
            הלשונית החדשה 💬 Feedback תמיד פתוחה לך למעלה בתפריט.
          </p>
        </div>
      </div>
    </div>
  );
}
