import { useState, useEffect } from "react";
import { TrendingUp, Target, DollarSign, BarChart2, Zap, CheckCircle, ChevronRight, ChevronLeft, Cpu, Star, Shield, BookOpen } from "lucide-react";

const QUESTIONS = [
  {
    id: "experience",
    icon: BookOpen,
    title: "כמה זמן אתה סוחר?",
    subtitle: "נבנה פרופיל מותאם לרמת הניסיון שלך",
    options: [
      { value: "beginner", label: "פחות משנה", sub: "עדיין לומד", emoji: "🌱" },
      { value: "intermediate", label: "1-3 שנים", sub: "ניסיון בסיסי", emoji: "📈" },
      { value: "advanced", label: "מעל 3 שנים", sub: "סוחר מנוסה", emoji: "🎯" },
    ],
  },
  {
    id: "strategy",
    icon: TrendingUp,
    title: "מה האסטרטגיה שלך?",
    subtitle: "נתאים את הכלים לסגנון המסחר שלך",
    options: [
      { value: "swing", label: "Swing Trading", sub: "החזקה של ימים-שבועות", emoji: "🌊" },
      { value: "day", label: "Day Trading", sub: "כניסות ויציאות ביום אחד", emoji: "⚡" },
      { value: "searching", label: "עדיין מחפש", sub: "בניית הגישה שלי", emoji: "🔍" },
      { value: "combined", label: "משלב", sub: "גמישות לפי תנאי שוק", emoji: "🎨" },
    ],
  },
  {
    id: "portfolioSize",
    icon: DollarSign,
    title: "מה גודל התיק שלך?",
    subtitle: "נגדיר אחוזי סיכון מתאימים",
    options: [
      { value: "small", label: "עד $5K", sub: "תיק מתחיל", emoji: "💼" },
      { value: "medium", label: "$5K - $25K", sub: "תיק בינוני", emoji: "📊" },
      { value: "large", label: "$25K - $100K", sub: "תיק מתקדם", emoji: "💰" },
      { value: "xlarge", label: "מעל $100K", sub: "תיק מקצועי", emoji: "🏦" },
    ],
  },
  {
    id: "goal",
    icon: Target,
    title: "מה המטרה שלך?",
    subtitle: "נתמקד במה שחשוב לך",
    options: [
      { value: "passive", label: "הכנסה פסיבית", sub: "תזרים קבוע מהמסחר", emoji: "🏖️" },
      { value: "growth", label: "צמיחת הון", sub: "הגדלת הון לטווח ארוך", emoji: "🚀" },
      { value: "learning", label: "לימוד", sub: "הבנת שוק ההון", emoji: "🎓" },
      { value: "professional", label: "מסחר מקצועי", sub: "פרנסה עיקרית", emoji: "💎" },
    ],
  },
  {
    id: "frequency",
    icon: BarChart2,
    title: "כמה עסקאות בממוצע בחודש?",
    subtitle: "נתאים את תצוגת הנתונים",
    options: [
      { value: "low", label: "1-5 עסקאות", sub: "מסחר סלקטיבי", emoji: "🎯" },
      { value: "medium", label: "6-15 עסקאות", sub: "פעילות בינונית", emoji: "📅" },
      { value: "high", label: "מעל 15", sub: "פעילות גבוהה", emoji: "⚡" },
    ],
  },
];

const generateProfile = (answers) => {
  const { experience, strategy, portfolioSize, goal, frequency } = answers;

  // Risk percentage based on portfolio size and experience
  let riskPct = 1;
  if (portfolioSize === "small") riskPct = experience === "beginner" ? 0.5 : 1;
  else if (portfolioSize === "medium") riskPct = experience === "advanced" ? 1.5 : 1;
  else if (portfolioSize === "large") riskPct = experience === "advanced" ? 2 : 1.5;
  else riskPct = experience === "advanced" ? 2.5 : 2;

  // Commission based on portfolio size
  let commission = 0;
  if (portfolioSize === "small") commission = 0.65;
  else if (portfolioSize === "medium") commission = 0;
  else commission = 0;

  // Profile summary
  const strategyMap = {
    swing: "Swing Trader",
    day: "Day Trader",
    searching: "לומד שוק ההון",
    combined: "Multi-Strategy Trader",
  };
  const goalMap = {
    passive: "הכנסה פסיבית",
    growth: "צמיחת הון",
    learning: "לימוד וצמיחה",
    professional: "מסחר מקצועי",
  };
  const expMap = {
    beginner: "מתחיל",
    intermediate: "בינוני",
    advanced: "מנוסה",
  };

  const profileName = `${strategyMap[strategy]} ${expMap[experience]}`;

  // Generate 3 personalized recommendations
  const recs = [];

  if (experience === "beginner") {
    recs.push({
      icon: Shield,
      title: "שמור על סיכון נמוך",
      text: `התחל עם ${riskPct}% מהתיק לעסקה. הגנה על הקפיטל חשובה יותר מהרווח הראשון.`,
      color: "cyan",
    });
    recs.push({
      icon: BookOpen,
      title: "תעד כל עסקה",
      text: "השתמש ביומן המסחר לתיעוד כל כניסה. הסוחרים שמנהלים יומן מתפתחים מהר יותר.",
      color: "violet",
    });
    recs.push({
      icon: Target,
      title: "הגדר יחס R:R",
      text: "חפש עסקאות עם יחס של לפחות 2:1 (תגמול לסיכון). זה המפתח לרווחיות לטווח ארוך.",
      color: "amber",
    });
  } else if (experience === "intermediate") {
    recs.push({
      icon: TrendingUp,
      title: "הגדל סלקטיביות",
      text: `עם ${frequency === "high" ? "הרבה" : "מספר מוגבל של"} עסקאות בחודש, התמקד רק בסטאפים עם סבירות גבוהה.`,
      color: "cyan",
    });
    recs.push({
      icon: BarChart2,
      title: "נתח את הביצועים",
      text: "השתמש בלשונית Analytics לניתוח דפוסי הרווח וההפסד שלך. זהה את הסטאפים הטובים ביותר.",
      color: "green",
    });
    recs.push({
      icon: Zap,
      title: "שפר את הכניסות",
      text: "השתמש ב-Trade Analyzer לניתוח כל עסקה לפני הכניסה. זה יעלה את דיוק הביצועים.",
      color: "violet",
    });
  } else {
    recs.push({
      icon: Target,
      title: "אופטימיזציה מתקדמת",
      text: `עם תיק של ${goalMap[goal]}, שקול להגדיל את גודל הפוזיציה לסטאפים עם ביטחון גבוה.`,
      color: "amber",
    });
    recs.push({
      icon: BarChart2,
      title: "מעקב Expectancy",
      text: "מדוד את ה-Expectancy של כל סטאפ. סוחר מנוסה מכיר את ה-edge שלו במספרים מדויקים.",
      color: "cyan",
    });
    recs.push({
      icon: Zap,
      title: "ניהול תיק מלא",
      text: "עקוב אחר הקורלציות בין הפוזיציות הפתוחות. הגבל חשיפה לסקטור אחד.",
      color: "green",
    });
  }

  return {
    profileName,
    riskPct,
    commission,
    summary: `${strategyMap[strategy]} עם ניסיון ${expMap[experience]}, מתמקד ב${goalMap[goal]}`,
    recommendations: recs,
    defaults: { riskPct, commission, capital: portfolioSize },
  };
};

const colorMap = {
  cyan: { border: "border-cyan-500/25", icon: "text-cyan-400", bg: "bg-cyan-500/10" },
  violet: { border: "border-violet-500/25", icon: "text-violet-400", bg: "bg-violet-500/10" },
  amber: { border: "border-amber-500/25", icon: "text-amber-400", bg: "bg-amber-500/10" },
  green: { border: "border-emerald-500/25", icon: "text-emerald-400", bg: "bg-emerald-500/10" },
};

export default function OnboardingScreen({ onComplete }) {
  const [step, setStep] = useState(0); // 0 = welcome, 1-5 = questions, 6 = analysis
  const [answers, setAnswers] = useState({});
  const [selected, setSelected] = useState(null);
  const [profile, setProfile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Fade in
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  const currentQuestion = step >= 1 && step <= 5 ? QUESTIONS[step - 1] : null;
  const progress = step === 0 ? 0 : Math.round((step / 5) * 100);

  const handleOptionSelect = (value) => {
    setSelected(value);
  };

  const handleNext = () => {
    if (step === 0) {
      setStep(1);
      setSelected(null);
      return;
    }
    if (!selected) return;

    const q = QUESTIONS[step - 1];
    const newAnswers = { ...answers, [q.id]: selected };
    setAnswers(newAnswers);
    setSelected(null);

    if (step === 5) {
      // Analyze
      setAnalyzing(true);
      setStep(6);
      setTimeout(() => {
        const p = generateProfile(newAnswers);
        setProfile(p);
        setAnalyzing(false);
      }, 2000);
    } else {
      setStep(s => s + 1);
    }
  };

  const handleBack = () => {
    if (step <= 1) return;
    setStep(s => s - 1);
    const q = QUESTIONS[step - 2];
    setSelected(answers[q?.id] || null);
  };

  const handleFinish = () => {
    const data = {
      completed: true,
      answers,
      profile,
      completedAt: new Date().toISOString(),
    };
    try { localStorage.setItem("swingEdgeOnboarding", JSON.stringify(data)); } catch {}
    setVisible(false);
    setTimeout(() => onComplete(profile), 400);
  };

  return (
    <div
      dir="rtl"
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-[#070c18] transition-opacity duration-400 ${visible ? "opacity-100" : "opacity-0"}`}
      style={{ background: "radial-gradient(ellipse at 50% 0%, #0f172a 0%, #070c18 70%)" }}
    >
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] left-1/4 w-[400px] h-[300px] bg-violet-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg px-4">
        {/* ── WELCOME SCREEN ── */}
        {step === 0 && (
          <div className={`text-center transition-all duration-500 ${visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-cyan-500/30">
                <TrendingUp size={40} className="text-white" />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-white mb-2">
              ברוך הבא ל-<span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">SwingEdge</span>
            </h1>
            <p className="text-slate-400 mb-2 text-sm">פלטפורמת המסחר המקצועית שלך</p>
            <p className="text-slate-500 text-xs mb-8 leading-relaxed max-w-sm mx-auto">
              נקח דקה אחת לבנות את הפרופיל שלך.<br />
              זה יעזור לנו להתאים את הכלים, הגדרות הסיכון<br />
              וההמלצות בדיוק לסגנון המסחר שלך.
            </p>

            <div className="flex justify-center gap-4 mb-8 text-xs text-slate-600">
              <span className="flex items-center gap-1"><CheckCircle size={12} className="text-cyan-500" /> 5 שאלות בלבד</span>
              <span className="flex items-center gap-1"><CheckCircle size={12} className="text-cyan-500" /> פחות מדקה</span>
              <span className="flex items-center gap-1"><CheckCircle size={12} className="text-cyan-500" /> פרטיות מלאה</span>
            </div>

            <button
              onClick={handleNext}
              className="w-full max-w-xs mx-auto flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-600 text-white font-bold text-sm hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-cyan-500/20"
            >
              בואו נתחיל <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* ── QUESTION STEPS ── */}
        {step >= 1 && step <= 5 && currentQuestion && (
          <div className={`transition-all duration-300 ${visible ? "opacity-100" : "opacity-0"}`}>
            {/* Progress bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-slate-600 tracking-widest uppercase">שאלה {step} מתוך 5</span>
                <span className="text-[11px] text-slate-600">{progress}%</span>
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Question card */}
            <div className="bg-[#0d1424] border border-white/[0.08] rounded-2xl p-6 shadow-2xl">
              {/* Icon + title */}
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/20 flex items-center justify-center">
                  <currentQuestion.icon size={20} className="text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{currentQuestion.title}</h2>
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-5 mr-13">{currentQuestion.subtitle}</p>

              {/* Options */}
              <div className="space-y-2.5">
                {currentQuestion.options.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleOptionSelect(opt.value)}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-right transition-all duration-200 group ${
                      selected === opt.value
                        ? "border-cyan-500/50 bg-cyan-500/10 shadow-lg shadow-cyan-500/10"
                        : "border-white/[0.07] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]"
                    }`}
                  >
                    <span className="text-xl flex-shrink-0">{opt.emoji}</span>
                    <div className="flex-1 text-left">
                      <div className={`text-sm font-semibold transition-colors ${selected === opt.value ? "text-cyan-300" : "text-slate-200 group-hover:text-white"}`}>
                        {opt.label}
                      </div>
                      <div className="text-xs text-slate-600">{opt.sub}</div>
                    </div>
                    {selected === opt.value && (
                      <CheckCircle size={16} className="text-cyan-400 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              {/* Navigation */}
              <div className="flex gap-2 mt-5">
                {step > 1 && (
                  <button
                    onClick={handleBack}
                    className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-sm hover:text-white hover:border-white/20 transition flex items-center gap-1"
                  >
                    <ChevronLeft size={14} /> חזור
                  </button>
                )}
                <button
                  onClick={handleNext}
                  disabled={!selected}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    selected
                      ? "bg-gradient-to-r from-cyan-500 to-violet-600 text-white hover:opacity-90 active:scale-98 shadow-lg shadow-cyan-500/20"
                      : "bg-white/5 text-slate-600 cursor-not-allowed"
                  }`}
                >
                  {step === 5 ? "נתח את הפרופיל שלי" : "המשך"}
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── ANALYSIS / RESULTS ── */}
        {step === 6 && (
          <div className="transition-all duration-300">
            {analyzing ? (
              <div className="text-center py-12">
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 flex items-center justify-center">
                      <Cpu size={30} className="text-cyan-400" style={{ animation: "spin 2s linear infinite" }} />
                    </div>
                    <div className="absolute inset-0 rounded-2xl border border-cyan-500/20 animate-ping" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">מנתח את הפרופיל שלך...</h3>
                <p className="text-sm text-slate-500">בונה המלצות מותאמות אישית</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : profile && (
              <div className="space-y-4">
                {/* Success header */}
                <div className="text-center mb-2">
                  <div className="flex justify-center mb-3">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center">
                      <CheckCircle size={28} className="text-emerald-400" />
                    </div>
                  </div>
                  <h2 className="text-xl font-bold text-white mb-1">הפרופיל שלך מוכן!</h2>
                  <p className="text-xs text-slate-500">{profile.summary}</p>
                </div>

                {/* Profile card */}
                <div className="bg-[#0d1424] border border-white/[0.08] rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Star size={14} className="text-amber-400" />
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">סיכום פרופיל</span>
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {profile.profileName.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">{profile.profileName}</div>
                      <div className="text-xs text-slate-500">פרופיל מסחר מותאם אישית</div>
                    </div>
                  </div>

                  {/* Defaults */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white/3 rounded-lg p-2.5 text-center border border-white/5">
                      <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">סיכון לעסקה</div>
                      <div className="text-sm font-bold font-mono text-cyan-400">{profile.riskPct}%</div>
                    </div>
                    <div className="bg-white/3 rounded-lg p-2.5 text-center border border-white/5">
                      <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">עמלה</div>
                      <div className="text-sm font-bold font-mono text-violet-400">${profile.commission}</div>
                    </div>
                    <div className="bg-white/3 rounded-lg p-2.5 text-center border border-white/5">
                      <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">Max R:R</div>
                      <div className="text-sm font-bold font-mono text-emerald-400">2:1</div>
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                <div className="bg-[#0d1424] border border-white/[0.08] rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap size={14} className="text-violet-400" />
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">3 המלצות מותאמות אישית</span>
                  </div>
                  <div className="space-y-2.5">
                    {profile.recommendations.map((rec, i) => {
                      const c = colorMap[rec.color] || colorMap.cyan;
                      return (
                        <div key={i} className={`${c.bg} border ${c.border} rounded-xl p-3 flex gap-3`}>
                          <div className={`flex-shrink-0 w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center ${c.icon}`}>
                            <rec.icon size={14} />
                          </div>
                          <div>
                            <div className={`text-xs font-bold mb-0.5 ${c.icon}`}>{rec.title}</div>
                            <div className="text-xs text-slate-400 leading-relaxed">{rec.text}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* CTA */}
                <button
                  onClick={handleFinish}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-600 text-white font-bold text-sm hover:opacity-90 active:scale-98 transition-all shadow-xl shadow-cyan-500/20"
                >
                  <CheckCircle size={18} />
                  מצוין! בואו נתחיל לסחור
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
