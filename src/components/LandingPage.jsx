import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "./Logo.jsx";
import "./LandingPage.css";

/* ============================================================
   Bilingual content (he / en). All strings + section data live
   here, mirrored from the Claude Design reference. Colors are
   inline everywhere so src/index.css can't override them.
   ============================================================ */
const STR = {
  he: {
    dir: "rtl",
    nav: [
      { label: "תכונות", href: "#features" },
      { label: "איך זה עובד", href: "#how" },
      { label: "מחירים", href: "#pricing" },
    ],
    ctaStart: "התחל חינם",
    ctaDemo: "ראה איך זה עובד",
    heroBadge: "ה-AI שמכיר את הטריידינג שלך · בזמן אמת",
    heroPre: "היומן ש", heroHi: "לומד אותך", heroPost: " ומלמד אותך",
    heroSub: "היומן היחיד שקורא את ההיסטוריה שלך, תופס את הדפוסים שחוזרים אצלך שוב ושוב, ומראה לך בזמן אמת מה עובד לך ומה שורף לך את החשבון — עוד לפני שלחצת Enter.",
    heroTrust: "בלי כרטיס אשראי · נרשמים ב-30 שניות · הכל בעברית",
    coachTitle: "Decision Coach", coachLive: "Live", coachTrade: "NVDA · Long", coachRR: "R/R 1:2.4",
    statWinLabel: "Win Rate", statScoreLabel: "ציון החודש",
    problemKicker: "הבעיה האמיתית",
    problemTitlePre: "לא חסר לך עוד אינדיקטור. ", problemTitleHi: "חסרה לך מראה.",
    problemCards: [
      { icon: "↻", title: "אותה טעות, שוב ושוב", body: "אתה חוזר על אותו דפוס מפסיד ולא שם לב — כי אין מי שיעצור אותך ברגע הנכון." },
      { icon: "?", title: "אתה לא באמת יודע מה ה-Edge שלך", body: "ה-Edge = הסטאפים שבהם אתה סטטיסטית מרוויח. רוב הסוחרים פשוט מנחשים." },
      { icon: "✕", title: "יומנים = ארכיון מת", body: "Excel מתעד את העבר. הוא לא מזהיר אותך, לא לומד אותך, ולא משפר אותך." },
    ],
    featKicker: "שלושה מנועים שעושים את העבודה",
    featTitlePre: "לא תיאוריות גנריות — ", featTitleHi: "ה-DNA שלך.",
    featCoachTag: "LIVE DECISION COACH",
    featCoachTitle: "ניתוח חי לפני שאתה נכנס לעסקה",
    featCoachBody: "לפני שאתה נכנס לעסקה, המערכת בודקת אותה מול ההיסטוריה שלך ואומרת לך: את הסטאפ הזה אתה מנצח, או שאתה נכנס לבור שכבר נפלת אליו.",
    featDnaTag: "TRADE DNA",
    featDnaTitle: "הפרופיל שלך ב-5 ממדים",
    featDnaBody: "הפרופיל המלא שלך כטריידר — משמעת, ניהול סיכון, עקביות, צמיחה. לא מה שאתה חושב שאתה. מה שהמספרים אומרים שאתה.",
    featEdgeTag: "EDGE FINDER",
    featEdgeTitle: "ה-Edge שלך, שחור על לבן",
    featEdgeBody: "אילו סטאפים באמת מכניסים לך כסף, ואילו רק נראים טוב. שחור על גבי לבן — מהעסקאות שלך, לא מהתחושה.",
    featReportTag: "דוח חודשי",
    featReportTitle: "התקדמות שרואים",
    featReportBody: "פעם בחודש: איפה השתפרת, איפה דימית, ומה לתקן. כמו אימון וידאו אחרי משחק — רק על התיק שלך.",
    featTiltTag: "TILT PROTECTION",
    featTiltTitle: "נעילה כשמזוהה tilt",
    featTiltBody: "כשהמערכת מזהה שאתה על tilt — מסחר נקמה, הגדלת פוזיציות, רדיפה אחרי הפסד — היא נועלת אותך ל-30 דקות. הצלת חשבון אמיתית.",
    howKicker: "שלושה צעדים. זה הכל.",
    howTitle: "שלושה צעדים לסוחר טוב יותר",
    steps: [
      { n: "01", title: "רושם את העסקה", body: "סטאפ, כניסה, סטופ, יעד — 30 שניות וסיימת. גם מצילום מסך של הצ'ארט." },
      { n: "02", title: "המערכת לומדת אותך", body: "כל עסקה מלמדת את ה-AI מי אתה — הדפוסים, החוזקות, והמקומות שאתה נופל בהם שוב ושוב." },
      { n: "03", title: "מקבל את המראה", body: "בזמן אמת, על כל עסקה: מה עבד לך היסטורית, ומה שרף. אתה מחליט — עם דאטה, לא עם תחושת בטן." },
    ],
    quote: "תוך חודש הבנתי שאני מפסיד תמיד באותה שעה ובאותו setup. SwingEdge הראה לי את זה במראה. הפסקתי — ה-Win Rate קפץ.",
    quoteName: "סוחר סווינג", quoteRole: "Beta · 3 חודשים",
    pricingKicker: "מחירים",
    pricingTitle: "התחל חינם. שדרג כשמוכנים.",
    freeName: "Free", freePrice: "0₪", freePer: "לתמיד",
    freeSub: "כל מה שצריך כדי להתחיל לראות את עצמך באמת.",
    freeCta: "התחל עכשיו",
    freeFeatures: ["יומן עסקאות מלא", "Decision Coach בסיסי", "Trade DNA — תמונת מצב"],
    proBadge: "הכי פופולרי", proName: "Pro", proPrice: "$5", proPer: "לחודש",
    proSub: "למי שרציני. כל המנועים, בלי תקרה.",
    proCta: "שדרג ל-Pro",
    proFeatures: ["כל מה שב-Free", "דוח חודשי מלא", "Vision OCR — קליטה מצילום מסך", "Edge Finder מתקדם", "Tilt Protection", "דוחות מעמיקים + ייצוא", "תמיכה מועדפת"],
    finalTitle: "הגרסה הבאה שלך כטריידר מתחילה עכשיו",
    finalSub: "הצטרף לסוחרים שכבר מפסיקים לחזור על אותן טעויות — ומתחילים לראות את ה-Edge שלהם.",
    footerTag: "היומן שלומד אותך ומלמד אותך בזמן אמת.",
    footerCols: [
      { title: "מוצר", links: [{ label: "תכונות", href: "#features" }, { label: "מחירים", href: "#pricing" }, { label: "איך זה עובד", href: "#how" }] },
      { title: "חברה", links: [{ label: "אודות" }, { label: "בלוג" }, { label: "צור קשר" }] },
      { title: "משאבים", links: [{ label: "מדריך" }, { label: "שאלות נפוצות" }, { label: "קהילה" }] },
    ],
    copyright: "© 2026 SwingEdge. כל הזכויות שמורות.",
    privacy: "פרטיות", terms: "תנאי שימוש", soon: "בקרוב",
    disclaimer: "SwingEdge הוא כלי לניהול וניתוח יומן מסחר בלבד. אין לראות בתוכן באפליקציה או בדף זה ייעוץ השקעות, המלצה לרכישה או מכירה של נייר ערך כלשהו, או תחליף לייעוץ פיננסי מקצועי. מסחר בשוק ההון כרוך בסיכון להפסד הון. ביצועי עבר אינם מעידים על ביצועים עתידיים. כל החלטת מסחר היא באחריות המשתמש בלבד.",
  },
  en: {
    dir: "ltr",
    nav: [
      { label: "Features", href: "#features" },
      { label: "How it works", href: "#how" },
      { label: "Pricing", href: "#pricing" },
    ],
    ctaStart: "Start free",
    ctaDemo: "See how it works",
    heroBadge: "The AI that knows your trading · Real-time",
    heroPre: "The journal that ", heroHi: "learns you", heroPost: " — and teaches you",
    heroSub: "The only journal that reads your history, catches the patterns you repeat over and over, and shows you in real time what works for you and what's burning your account — before you ever hit Enter.",
    heroTrust: "No credit card · Sign up in 30 seconds · Hebrew & English",
    coachTitle: "Decision Coach", coachLive: "Live", coachTrade: "NVDA · Long", coachRR: "R/R 1:2.4",
    statWinLabel: "Win Rate", statScoreLabel: "This month",
    problemKicker: "The real problem",
    problemTitlePre: "You're not missing another indicator. ", problemTitleHi: "You're missing a mirror.",
    problemCards: [
      { icon: "↻", title: "The same mistake, again", body: "You repeat the same losing pattern without noticing — because nothing stops you at the right moment." },
      { icon: "?", title: "You don't really know your Edge", body: "Your Edge = the setups where you're statistically profitable. Most traders are just guessing." },
      { icon: "✕", title: "Journals are dead archives", body: "Excel records the past. It never warns you, learns you, or makes you better." },
    ],
    featKicker: "Three engines that do the work",
    featTitlePre: "Not generic theory — ", featTitleHi: "your DNA.",
    featCoachTag: "LIVE DECISION COACH",
    featCoachTitle: "Live analysis before you enter the trade",
    featCoachBody: "Before you enter a trade, the system checks it against your history and tells you: this setup you win, or you're walking into a hole you've already fallen into.",
    featDnaTag: "TRADE DNA",
    featDnaTitle: "Your profile across 5 dimensions",
    featDnaBody: "Your full profile as a trader — discipline, risk management, consistency, growth. Not who you think you are. Who the numbers say you are.",
    featEdgeTag: "EDGE FINDER",
    featEdgeTitle: "Your Edge, in black and white",
    featEdgeBody: "Which setups actually make you money, and which just look good. In black and white — from your trades, not your gut.",
    featReportTag: "MONTHLY REPORT",
    featReportTitle: "Progress you can see",
    featReportBody: "Once a month: where you improved, where you bled, and what to fix. Like game film after the match — only on your book.",
    featTiltTag: "TILT PROTECTION",
    featTiltTitle: "Locks you out on tilt",
    featTiltBody: "When the system detects you're on tilt — revenge trading, sizing up, chasing losses — it locks you out for 30 minutes. A real account-saver.",
    howKicker: "Three steps. That's it.",
    howTitle: "Three steps to a sharper trader",
    steps: [
      { n: "01", title: "Log the trade", body: "Setup, entry, stop, target — 30 seconds and you're done. Even from a screenshot of the chart." },
      { n: "02", title: "The system learns you", body: "Every trade teaches the AI who you are — the patterns, the strengths, and the places you fall into again and again." },
      { n: "03", title: "Get the mirror", body: "In real time, on every trade: what worked for you historically, and what burned. You decide — with data, not a gut feeling." },
    ],
    quote: "Within a month I realized I always lose at the same hour, on the same setup. SwingEdge held up the mirror. I stopped — my Win Rate jumped.",
    quoteName: "Swing trader", quoteRole: "Beta · 3 months",
    pricingKicker: "Pricing",
    pricingTitle: "Start free. Upgrade when you're ready.",
    freeName: "Free", freePrice: "$0", freePer: "forever",
    freeSub: "Everything you need to start really seeing yourself.",
    freeCta: "Start now",
    freeFeatures: ["Full trade journal", "Basic Decision Coach", "Trade DNA — snapshot"],
    proBadge: "Most popular", proName: "Pro", proPrice: "$5", proPer: "per month",
    proSub: "For those who are serious. All the engines, no ceiling.",
    proCta: "Upgrade to Pro",
    proFeatures: ["Everything in Free", "Full monthly report", "Vision OCR — read from screenshots", "Advanced Edge Finder", "Tilt Protection", "Deep reports + export", "Priority support"],
    finalTitle: "Your next version as a trader starts now",
    finalSub: "Join traders who've stopped repeating the same mistakes — and started seeing their real Edge.",
    footerTag: "The journal that learns you and teaches you in real time.",
    footerCols: [
      { title: "Product", links: [{ label: "Features", href: "#features" }, { label: "Pricing", href: "#pricing" }, { label: "How it works", href: "#how" }] },
      { title: "Company", links: [{ label: "About" }, { label: "Blog" }, { label: "Contact" }] },
      { title: "Resources", links: [{ label: "Guide" }, { label: "FAQ" }, { label: "Community" }] },
    ],
    copyright: "© 2026 SwingEdge. All rights reserved.",
    privacy: "Privacy", terms: "Terms", soon: "Soon",
    disclaimer: "SwingEdge is a tool for managing and analyzing a trading journal only. Nothing in the app or on this page constitutes investment advice, a recommendation to buy or sell any security, or a substitute for professional financial advice. Trading the capital markets involves risk of loss of capital. Past performance is not indicative of future results. Every trading decision is the sole responsibility of the user.",
  },
};

const SIGNALS = {
  he: [
    { icon: "✅", text: "Setup תואם לדפוס המנצח שלך — Win Rate היסטורי 71% במצב כזה.", bg: "rgba(0,192,118,0.10)", border: "rgba(0,192,118,0.28)", dot: "#16D687" },
    { icon: "⚠", text: "אתה נכנס 14% מעל הממוצע שלך לכניסה. שקול גודל פוזיציה.", bg: "rgba(232,162,58,0.10)", border: "rgba(232,162,58,0.28)", dot: "#E8A23A" },
    { icon: "✕", text: "3 מתוך 4 הפעמים האחרונות בשעה הזו — הפסד. זהירות.", bg: "rgba(229,72,77,0.10)", border: "rgba(229,72,77,0.28)", dot: "#FF6B6E" },
  ],
  en: [
    { icon: "✅", text: "Setup matches your winning pattern — 71% historical Win Rate here.", bg: "rgba(0,192,118,0.10)", border: "rgba(0,192,118,0.28)", dot: "#16D687" },
    { icon: "⚠", text: "You're entering 14% above your average entry. Consider position size.", bg: "rgba(232,162,58,0.10)", border: "rgba(232,162,58,0.28)", dot: "#E8A23A" },
    { icon: "✕", text: "3 of your last 4 trades at this hour — losses. Caution.", bg: "rgba(229,72,77,0.10)", border: "rgba(229,72,77,0.28)", dot: "#FF6B6E" },
  ],
};

const SIGNAL_CHIPS = {
  he: [
    { label: "דפוס מנצח", bg: "rgba(0,192,118,0.14)", border: "rgba(0,192,118,0.3)", dot: "#16D687" },
    { label: "אזהרה", bg: "rgba(232,162,58,0.14)", border: "rgba(232,162,58,0.3)", dot: "#E8A23A" },
    { label: "מלכודת מוכרת", bg: "rgba(229,72,77,0.14)", border: "rgba(229,72,77,0.3)", dot: "#FF6B6E" },
  ],
  en: [
    { label: "Winning pattern", bg: "rgba(0,192,118,0.14)", border: "rgba(0,192,118,0.3)", dot: "#16D687" },
    { label: "Warning", bg: "rgba(232,162,58,0.14)", border: "rgba(232,162,58,0.3)", dot: "#E8A23A" },
    { label: "Known trap", bg: "rgba(229,72,77,0.14)", border: "rgba(229,72,77,0.3)", dot: "#FF6B6E" },
  ],
};

const DNA_BARS = {
  he: [
    { k: "סיכון", label: "מאוזן", w: "68%" },
    { k: "משמעת", label: "גבוהה", w: "82%" },
    { k: "עקביות", label: "בצמיחה", w: "60%" },
    { k: "צמיחה", label: "חיובי", w: "74%" },
  ],
  en: [
    { k: "Risk", label: "Balanced", w: "68%" },
    { k: "Discipline", label: "High", w: "82%" },
    { k: "Consistency", label: "Growing", w: "60%" },
    { k: "Growth", label: "Positive", w: "74%" },
  ],
};

const TRUST = {
  he: [
    { show: "5", label: "ממדי DNA" },
    { show: "∞", label: "עסקאות ביומן" },
    { show: "1", label: "סוכן AI שמכיר אותך" },
  ],
  en: [
    { show: "5", label: "DNA dimensions" },
    { show: "∞", label: "Trades logged" },
    { show: "1", label: "AI agent that knows you" },
  ],
};

/* Logo mark in the design's rounded, shadowed wrapper. */
function LogoMark({ size = 34, shadow = true }) {
  return (
    <span
      style={{
        display: "inline-flex",
        width: size,
        height: size,
        borderRadius: 9,
        overflow: "hidden",
        boxShadow: shadow ? "0 4px 14px rgba(0,160,100,0.30)" : "none",
      }}
      aria-hidden="true"
    >
      <Logo size={size} showText={false} />
    </span>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const goApp = () => navigate("/app");

  const [lang, setLang] = useState("he");
  const L = STR[lang];
  const dir = L.dir;
  const signals = SIGNALS[lang];
  const signalChips = SIGNAL_CHIPS[lang];
  const dnaBars = DNA_BARS[lang];
  const trust = TRUST[lang];

  // Count-up animation for the showcase stats (cubic ease-out over 1200ms).
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf;
    const dur = 1200;
    const t0 = performance.now();
    const tick = (now) => {
      const raw = Math.min(1, (now - t0) / dur);
      setP(1 - Math.pow(1 - raw, 3));
      if (raw < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const winRate = Math.round(64 * p) + "%";
  const monthScore = (8.2 * p).toFixed(1);

  const activeBtn = {
    border: "none", cursor: "pointer", padding: "5px 12px", borderRadius: 999,
    background: "#00C076", color: "#06281C", fontWeight: 800, fontSize: 13,
    fontFamily: "'Heebo',sans-serif",
  };
  const idleBtn = {
    border: "none", cursor: "pointer", padding: "5px 12px", borderRadius: 999,
    background: "transparent", color: "#5b6b62", fontWeight: 700, fontSize: 13,
    fontFamily: "'Heebo',sans-serif",
  };

  const pill = {
    cursor: "pointer", border: "none", textDecoration: "none",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    borderRadius: 999, background: "#00C076", color: "#06281C", fontWeight: 800,
    fontFamily: "'Heebo',sans-serif",
  };

  return (
    <div
      className="se-landing"
      dir={dir}
      lang={lang}
      style={{
        fontFamily: "'Heebo',system-ui,sans-serif",
        color: "#15201A",
        background: "#F4F8F2",
        minHeight: "100vh",
        overflowX: "hidden",
        lineHeight: 1.5,
        WebkitFontSmoothing: "antialiased",
        scrollBehavior: "smooth",
      }}
    >
      {/* ============ NAV ============ */}
      <nav
        aria-label={lang === "he" ? "ניווט ראשי" : "Main navigation"}
        style={{
          position: "sticky", top: 0, zIndex: 50, display: "flex",
          alignItems: "center", justifyContent: "space-between", gap: 16,
          padding: "14px clamp(16px,4vw,40px)", background: "rgba(244,248,242,0.78)",
          backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)",
          borderBottom: "1px solid rgba(21,32,26,0.06)",
        }}
      >
        <a href="#top" style={{ display: "flex", alignItems: "center", gap: 11, textDecoration: "none", color: "#15201A" }}>
          <LogoMark size={34} />
          <span style={{ fontWeight: 800, fontSize: 19, letterSpacing: "-0.02em" }}>SwingEdge</span>
        </a>
        <div className="se-nav-links" style={{ display: "flex", alignItems: "center", gap: 30 }}>
          {L.nav.map((item) => (
            <a key={item.href} href={item.href} style={{ textDecoration: "none", color: "#3c4a42", fontWeight: 600, fontSize: 15 }}>
              {item.label}
            </a>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "inline-flex", padding: 3, background: "rgba(21,32,26,0.05)", border: "1px solid rgba(21,32,26,0.07)", borderRadius: 999 }}>
            <button onClick={() => setLang("he")} style={lang === "he" ? activeBtn : idleBtn} aria-pressed={lang === "he"}>עב</button>
            <button onClick={() => setLang("en")} style={lang === "en" ? activeBtn : idleBtn} aria-pressed={lang === "en"}>EN</button>
          </div>
          <button onClick={goApp} style={{ ...pill, padding: "10px 20px", fontSize: 15, boxShadow: "0 6px 18px rgba(0,192,118,0.32)" }}>
            {L.ctaStart}
          </button>
        </div>
      </nav>

      {/* ============ HERO ============ */}
      <header id="top" style={{ position: "relative", background: "#070D0A", color: "#fff", overflow: "hidden", padding: "clamp(48px,7vw,96px) clamp(16px,4vw,40px) clamp(60px,8vw,110px)" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(900px 520px at 78% -8%, rgba(0,192,118,0.30), transparent 60%),radial-gradient(700px 520px at 8% 110%, rgba(79,70,229,0.22), transparent 60%)" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.045) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.045) 1px,transparent 1px)", backgroundSize: "54px 54px", WebkitMaskImage: "radial-gradient(120% 90% at 50% 0%, #000 40%, transparent 78%)", maskImage: "radial-gradient(120% 90% at 50% 0%, #000 40%, transparent 78%)" }} />
        <div style={{ position: "relative", maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <div data-reveal="">
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 13px", borderRadius: 999, background: "rgba(0,192,118,0.12)", border: "1px solid rgba(0,192,118,0.30)", fontSize: 13, fontWeight: 700, color: "#7CF3C0", marginBottom: 24 }}>
              <span data-se-float="" style={{ width: 7, height: 7, borderRadius: "50%", background: "#00E08A", boxShadow: "0 0 10px #00E08A", animation: "seGlow 1.8s ease-in-out infinite" }} />
              {L.heroBadge}
            </div>
            <h1 style={{ fontSize: "clamp(42px,7vw,84px)", lineHeight: 1.02, letterSpacing: "-0.035em", fontWeight: 800, margin: "0 0 24px" }}>
              {L.heroPre}
              <span style={{ background: "linear-gradient(100deg,#16D687,#00C076 45%,#5B8CFF)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>{L.heroHi}</span>
              {L.heroPost}
            </h1>
            <p style={{ fontSize: "clamp(16px,1.9vw,21px)", lineHeight: 1.6, color: "#A9B7AF", maxWidth: 600, margin: "0 auto 34px" }}>{L.heroSub}</p>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 13, marginBottom: 22 }}>
              <button onClick={goApp} style={{ ...pill, padding: "16px 34px", fontSize: 17, boxShadow: "0 10px 30px rgba(0,192,118,0.40)" }}>{L.ctaStart}</button>
              <a href="#how" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9, padding: "16px 28px", borderRadius: 999, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.16)", color: "#fff", fontWeight: 700, fontSize: 17 }}>{L.ctaDemo}</a>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "#7E8E85", fontSize: 14, fontWeight: 600, fontStyle: "italic" }}>
              <span style={{ color: "#00E08A" }}>✓</span>{L.heroTrust}
            </div>
          </div>
        </div>
      </header>

      {/* ============ TRUST BAR ============ */}
      <section aria-label={lang === "he" ? "נתונים מרכזיים" : "Key stats"} style={{ background: "#0A100D", color: "#fff", padding: "30px clamp(16px,4vw,40px)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 18 }}>
          {trust.map((t) => (
            <div key={t.label} data-reveal="" style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: "clamp(26px,3.4vw,38px)", color: "#16D687", lineHeight: 1 }}>{t.show}</div>
              <div style={{ fontSize: 13.5, color: "#8F9D94", fontWeight: 600, marginTop: 7 }}>{t.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ PROBLEM ============ */}
      <section style={{ padding: "clamp(64px,8vw,110px) clamp(16px,4vw,40px)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div data-reveal="" style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 48px" }}>
            <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#039E26", marginBottom: 14 }}>{L.problemKicker}</div>
            <h2 style={{ fontSize: "clamp(30px,4.6vw,52px)", lineHeight: 1.08, letterSpacing: "-0.03em", fontWeight: 800, margin: 0 }}>{L.problemTitlePre}<span style={{ color: "#E5484D" }}>{L.problemTitleHi}</span></h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 20 }}>
            {L.problemCards.map((c) => (
              <div key={c.title} data-reveal="" style={{ background: "#fff", border: "1px solid rgba(21,32,26,0.07)", borderRadius: 20, padding: 28, boxShadow: "0 1px 3px rgba(21,32,26,0.04)" }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(229,72,77,0.10)", display: "flex", alignItems: "center", justifyContent: "center", color: "#E5484D", fontSize: 20, fontWeight: 800, marginBottom: 18 }}>{c.icon}</div>
                <h3 style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.01em", margin: "0 0 9px" }}>{c.title}</h3>
                <p style={{ fontSize: 15, lineHeight: 1.6, color: "#5b6b62", margin: 0 }}>{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FEATURES (Bento) ============ */}
      <section id="features" style={{ padding: "clamp(40px,5vw,72px) clamp(16px,4vw,40px) clamp(64px,8vw,110px)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div data-reveal="" style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 44px" }}>
            <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#039E26", marginBottom: 14 }}>{L.featKicker}</div>
            <h2 style={{ fontSize: "clamp(30px,4.6vw,52px)", lineHeight: 1.08, letterSpacing: "-0.03em", fontWeight: 800, margin: 0 }}>{L.featTitlePre}<span style={{ color: "#039E26" }}>{L.featTitleHi}</span></h2>
          </div>

          <div className="se-feat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gridAutoRows: "minmax(150px,auto)", gap: 18 }}>
            {/* Coach (big) */}
            <div data-reveal="" style={{ gridColumn: "span 4", gridRow: "span 2", position: "relative", overflow: "hidden", background: "linear-gradient(160deg,#0E1714,#070D0A)", color: "#fff", borderRadius: 24, padding: "clamp(24px,3vw,38px)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(500px 320px at 85% 10%,rgba(0,192,118,0.22),transparent 60%)" }} />
              <div style={{ position: "relative" }}>
                <span style={{ display: "inline-block", padding: "5px 12px", borderRadius: 999, background: "rgba(0,192,118,0.16)", color: "#7CF3C0", fontSize: 12, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.03em", marginBottom: 18 }}>{L.featCoachTag}</span>
                <h3 style={{ fontSize: "clamp(24px,2.7vw,32px)", fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 12px", maxWidth: 440 }}>{L.featCoachTitle}</h3>
                <p style={{ fontSize: 16, lineHeight: 1.6, color: "#A9B7AF", maxWidth: 430, margin: 0 }}>{L.featCoachBody}</p>
              </div>
              <div style={{ position: "relative", display: "flex", gap: 10, flexWrap: "wrap", marginTop: 24 }}>
                {signalChips.map((c) => (
                  <span key={c.label} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 13px", borderRadius: 11, background: c.bg, border: `1px solid ${c.border}`, fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: "'JetBrains Mono',monospace" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.dot }} />{c.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Trade DNA */}
            <div data-reveal="" style={{ gridColumn: "span 2", gridRow: "span 2", background: "#fff", border: "1px solid rgba(21,32,26,0.07)", borderRadius: 24, padding: 28, display: "flex", flexDirection: "column" }}>
              <span style={{ display: "inline-block", alignSelf: "flex-start", padding: "5px 12px", borderRadius: 999, background: "rgba(79,70,229,0.10)", color: "#4F46E5", fontSize: 12, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", marginBottom: 16 }}>{L.featDnaTag}</span>
              <h3 style={{ fontSize: 21, fontWeight: 800, letterSpacing: "-0.01em", margin: "0 0 8px" }}>{L.featDnaTitle}</h3>
              <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "#5b6b62", margin: "0 0 20px" }}>{L.featDnaBody}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: "auto" }}>
                {dnaBars.map((d) => (
                  <div key={d.k}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 700, color: "#3c4a42", marginBottom: 5 }}><span>{d.k}</span><span style={{ fontFamily: "'JetBrains Mono',monospace", color: "#9aa8a0" }}>{d.label}</span></div>
                    <div style={{ height: 7, borderRadius: 99, background: "rgba(21,32,26,0.07)", overflow: "hidden" }}><div style={{ height: "100%", width: d.w, borderRadius: 99, background: "linear-gradient(90deg,#00C076,#5B8CFF)" }} /></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Edge Finder */}
            <div data-reveal="" style={{ gridColumn: "span 2", background: "#039E26", color: "#fff", borderRadius: 24, padding: 26, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
              <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.10) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.10) 1px,transparent 1px)", backgroundSize: "30px 30px", opacity: 0.5 }} />
              <span style={{ position: "relative", display: "inline-block", alignSelf: "flex-start", padding: "5px 12px", borderRadius: 999, background: "rgba(255,255,255,0.18)", fontSize: 12, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", marginBottom: "auto" }}>{L.featEdgeTag}</span>
              <h3 style={{ position: "relative", fontSize: 20, fontWeight: 800, letterSpacing: "-0.01em", margin: "14px 0 6px" }}>{L.featEdgeTitle}</h3>
              <p style={{ position: "relative", fontSize: 14, lineHeight: 1.5, color: "rgba(255,255,255,0.95)", margin: 0 }}>{L.featEdgeBody}</p>
            </div>

            {/* Monthly Report */}
            <div data-reveal="" style={{ gridColumn: "span 2", background: "#fff", border: "1px solid rgba(21,32,26,0.07)", borderRadius: 24, padding: 26, display: "flex", flexDirection: "column" }}>
              <span style={{ display: "inline-block", alignSelf: "flex-start", padding: "5px 12px", borderRadius: 999, background: "rgba(232,162,58,0.14)", color: "#B97712", fontSize: 12, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", marginBottom: 14 }}>{L.featReportTag}</span>
              <h3 style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.01em", margin: "0 0 6px" }}>{L.featReportTitle}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.5, color: "#5b6b62", margin: "0 0 16px" }}>{L.featReportBody}</p>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 46, marginTop: "auto" }}>
                <span style={{ flex: 1, height: "40%", background: "rgba(3,158,38,0.25)", borderRadius: "4px 4px 0 0" }} />
                <span style={{ flex: 1, height: "62%", background: "rgba(3,158,38,0.4)", borderRadius: "4px 4px 0 0" }} />
                <span style={{ flex: 1, height: "50%", background: "rgba(3,158,38,0.3)", borderRadius: "4px 4px 0 0" }} />
                <span style={{ flex: 1, height: "80%", background: "rgba(3,158,38,0.6)", borderRadius: "4px 4px 0 0" }} />
                <span style={{ flex: 1, height: "100%", background: "#039E26", borderRadius: "4px 4px 0 0" }} />
              </div>
            </div>

            {/* Tilt Protection */}
            <div data-reveal="" style={{ gridColumn: "span 2", background: "#15201A", color: "#fff", borderRadius: 24, padding: 26, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", alignSelf: "flex-start", width: 40, height: 40, borderRadius: 11, background: "rgba(229,72,77,0.18)", color: "#FF7A7E", fontSize: 19, marginBottom: "auto" }}>⏻</span>
              <span style={{ display: "inline-block", alignSelf: "flex-start", padding: "4px 11px", borderRadius: 999, background: "rgba(229,72,77,0.16)", color: "#FF9C9F", fontSize: 11.5, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", margin: "14px 0 8px" }}>{L.featTiltTag}</span>
              <h3 style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.01em", margin: "0 0 5px" }}>{L.featTiltTitle}</h3>
              <p style={{ fontSize: 13.5, lineHeight: 1.5, color: "#A9B7AF", margin: 0 }}>{L.featTiltBody}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section id="how" style={{ background: "#fff", borderTop: "1px solid rgba(21,32,26,0.06)", borderBottom: "1px solid rgba(21,32,26,0.06)", padding: "clamp(64px,8vw,110px) clamp(16px,4vw,40px)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div data-reveal="" style={{ textAlign: "center", maxWidth: 680, margin: "0 auto 56px" }}>
            <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#039E26", marginBottom: 14 }}>{L.howKicker}</div>
            <h2 style={{ fontSize: "clamp(30px,4.6vw,52px)", lineHeight: 1.08, letterSpacing: "-0.03em", fontWeight: 800, margin: 0 }}>{L.howTitle}</h2>
          </div>

          <div className="se-how-grid" style={{ display: "grid", gridTemplateColumns: "0.82fr 1.18fr", gap: "clamp(36px,5vw,72px)", alignItems: "center" }}>
            {/* steps */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              {L.steps.map((step) => (
                <div key={step.n} data-reveal="" style={{ display: "flex", gap: 18, padding: "22px 0", borderBottom: "1px solid rgba(21,32,26,0.08)" }}>
                  <span style={{ flex: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 42, height: 42, borderRadius: 12, background: "rgba(0,192,118,0.10)", border: "1px solid rgba(0,192,118,0.22)", color: "#039E26", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 15 }}>{step.n}</span>
                  <div>
                    <h3 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.01em", margin: "0 0 6px" }}>{step.title}</h3>
                    <p style={{ fontSize: 15, lineHeight: 1.6, color: "#5b6b62", margin: 0 }}>{step.body}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Decision Coach showcase */}
            <div className="se-how-showcase" data-reveal="" style={{ position: "relative", left: -18 }}>
              <div style={{ position: "relative", background: "linear-gradient(180deg,#0E1714,#070D0A)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 28, padding: "clamp(34px,4vw,56px)", boxShadow: "0 36px 80px rgba(7,13,10,0.22)", overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 0, background: "radial-gradient(460px 300px at 82% 8%,rgba(0,192,118,0.20),transparent 62%)" }} />
                <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px)", backgroundSize: "40px 40px", WebkitMaskImage: "radial-gradient(120% 100% at 50% 0%, #000 35%, transparent 80%)", maskImage: "radial-gradient(120% 100% at 50% 0%, #000 35%, transparent 80%)" }} />

                <div style={{ position: "relative" }}>
                  <div style={{ position: "relative", background: "linear-gradient(180deg,#111C18,#0A100D)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 22, padding: 20, boxShadow: "0 30px 70px rgba(0,0,0,0.45),inset 0 1px 0 rgba(255,255,255,0.06)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <LogoMark size={28} shadow={false} />
                        <span style={{ fontWeight: 700, fontSize: 15, color: "#fff", whiteSpace: "nowrap" }}>{L.coachTitle}</span>
                      </div>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, background: "rgba(0,192,118,0.14)", color: "#7CF3C0", fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        <span data-se-float="" style={{ width: 6, height: 6, borderRadius: "50%", background: "#00E08A", animation: "seGlow 1.6s infinite" }} />{L.coachLive}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 15px", borderRadius: 13, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", marginBottom: 14 }}>
                      <span style={{ fontWeight: 800, fontSize: 17, color: "#fff", fontFamily: "'JetBrains Mono',monospace" }}>{L.coachTrade}</span>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "#E8A23A", fontFamily: "'JetBrains Mono',monospace" }}>{L.coachRR}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                      {signals.map((s, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 11, padding: "12px 13px", borderRadius: 12, background: s.bg, border: `1px solid ${s.border}` }}>
                          <span style={{ flex: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 7, background: s.dot, color: "#06140E", fontSize: 13, fontWeight: 800 }}>{s.icon}</span>
                          <span style={{ fontSize: 13.5, lineHeight: 1.45, color: "#D8E2DC", fontWeight: 500 }}>{s.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div data-se-float="" style={{ position: "absolute", insetInlineStart: -14, top: -26, background: "#fff", color: "#15201A", borderRadius: 14, padding: "9px 13px", boxShadow: "0 18px 40px rgba(0,0,0,0.30)", animation: "seFloat 5s ease-in-out infinite" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#5b6b62", marginBottom: 1, whiteSpace: "nowrap" }}>{L.statWinLabel}</div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 21, color: "#039E26" }}>{winRate}</div>
                  </div>
                  <div data-se-float="" style={{ position: "absolute", insetInlineEnd: -14, bottom: -18, background: "#fff", color: "#15201A", borderRadius: 16, padding: "13px 17px", boxShadow: "0 18px 40px rgba(0,0,0,0.30)", animation: "seFloat 6s ease-in-out infinite .6s" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#5b6b62", marginBottom: 2, whiteSpace: "nowrap" }}>{L.statScoreLabel}</div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 26, color: "#15201A" }}>{monthScore}<span style={{ color: "#9aa8a0", fontSize: 18 }}>/10</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ QUOTE ============ */}
      <section style={{ padding: "clamp(64px,8vw,110px) clamp(16px,4vw,40px)" }}>
        <div data-reveal="" style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: 60, lineHeight: 0.6, color: "#00C076", fontWeight: 800, marginBottom: 10 }}>”</div>
          <blockquote style={{ fontSize: "clamp(22px,3.2vw,36px)", lineHeight: 1.32, letterSpacing: "-0.02em", fontWeight: 800, margin: "0 0 26px", color: "#15201A" }}>{L.quote}</blockquote>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg,#00C076,#4F46E5)" }} />
            <span style={{ textAlign: "start" }}>
              <span style={{ display: "block", fontWeight: 800, fontSize: 15 }}>{L.quoteName}</span>
              <span style={{ display: "block", fontSize: 13, color: "#5b6b62" }}>{L.quoteRole}</span>
            </span>
          </div>
        </div>
      </section>

      {/* ============ PRICING ============ */}
      <section id="pricing" style={{ background: "#0A100D", color: "#fff", padding: "clamp(64px,8vw,110px) clamp(16px,4vw,40px)" }}>
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <div data-reveal="" style={{ textAlign: "center", maxWidth: 680, margin: "0 auto 48px" }}>
            <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#16D687", marginBottom: 14 }}>{L.pricingKicker}</div>
            <h2 style={{ fontSize: "clamp(28px,4.4vw,48px)", lineHeight: 1.08, letterSpacing: "-0.03em", fontWeight: 800, margin: 0 }}>{L.pricingTitle}</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 22, alignItems: "stretch" }}>
            {/* Free */}
            <div data-reveal="" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 24, padding: 32, display: "flex", flexDirection: "column" }}>
              <div style={{ fontWeight: 800, fontSize: 18, color: "#fff", marginBottom: 6 }}>{L.freeName}</div>
              <div style={{ color: "#8F9D94", fontSize: 13.5, fontWeight: 600, lineHeight: 1.45, marginBottom: 16 }}>{L.freeSub}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginBottom: 22 }}><span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 42 }}>{L.freePrice}</span><span style={{ color: "#8F9D94", fontSize: 14, fontWeight: 600 }}>{L.freePer}</span></div>
              <button onClick={goApp} style={{ cursor: "pointer", display: "block", width: "100%", textAlign: "center", padding: 13, borderRadius: 12, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.16)", color: "#fff", fontWeight: 800, fontSize: 15, marginBottom: 24, fontFamily: "'Heebo',sans-serif" }}>{L.freeCta}</button>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {L.freeFeatures.map((f) => (
                  <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14.5, color: "#C4CFC9" }}><span style={{ color: "#16D687", fontWeight: 800, flex: "none" }}>✓</span><span>{f}</span></div>
                ))}
              </div>
            </div>

            {/* Pro */}
            <div data-reveal="" style={{ position: "relative", background: "linear-gradient(165deg,#0E2A20,#0B1712)", border: "1.5px solid rgba(0,192,118,0.45)", borderRadius: 24, padding: 32, display: "flex", flexDirection: "column", boxShadow: "0 30px 70px rgba(0,160,100,0.18)" }}>
              <span style={{ position: "absolute", top: -13, insetInlineStart: 32, padding: "5px 13px", borderRadius: 999, background: "#00C076", color: "#06281C", fontSize: 12, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace" }}>{L.proBadge}</span>
              <div style={{ fontWeight: 800, fontSize: 18, color: "#fff", marginBottom: 6 }}>{L.proName}</div>
              <div style={{ color: "#8F9D94", fontSize: 13.5, fontWeight: 600, lineHeight: 1.45, marginBottom: 16 }}>{L.proSub}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginBottom: 22 }}><span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 42, color: "#16D687" }}>{L.proPrice}</span><span style={{ color: "#8F9D94", fontSize: 14, fontWeight: 600 }}>{L.proPer}</span></div>
              <button onClick={goApp} style={{ cursor: "pointer", display: "block", width: "100%", textAlign: "center", padding: 13, borderRadius: 12, background: "#00C076", color: "#06281C", fontWeight: 800, fontSize: 15, marginBottom: 24, boxShadow: "0 10px 26px rgba(0,192,118,0.35)", border: "none", fontFamily: "'Heebo',sans-serif" }}>{L.proCta}</button>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {L.proFeatures.map((f) => (
                  <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14.5, color: "#E1EAE5" }}><span style={{ color: "#16D687", fontWeight: 800, flex: "none" }}>✓</span><span>{f}</span></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section style={{ position: "relative", overflow: "hidden", background: "linear-gradient(120deg,#008555,#00C076 55%,#16D687)", color: "#06281C", padding: "clamp(70px,9vw,120px) clamp(16px,4vw,40px)", textAlign: "center" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.10) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.10) 1px,transparent 1px)", backgroundSize: "46px 46px", WebkitMaskImage: "radial-gradient(120% 100% at 50% 0%, #000 30%, transparent 75%)", maskImage: "radial-gradient(120% 100% at 50% 0%, #000 30%, transparent 75%)" }} />
        <div data-reveal="" style={{ position: "relative", maxWidth: 760, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(34px,5.4vw,64px)", lineHeight: 1.04, letterSpacing: "-0.035em", fontWeight: 800, margin: "0 0 18px" }}>{L.finalTitle}</h2>
          <p style={{ fontSize: "clamp(16px,2vw,20px)", lineHeight: 1.55, color: "rgba(6,40,28,0.78)", fontWeight: 600, margin: "0 0 34px" }}>{L.finalSub}</p>
          <button onClick={goApp} style={{ cursor: "pointer", border: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "17px 42px", borderRadius: 999, background: "#06281C", color: "#16D687", fontWeight: 800, fontSize: 18, boxShadow: "0 16px 40px rgba(6,40,28,0.32)", fontFamily: "'Heebo',sans-serif" }}>{L.ctaStart}</button>
          <div style={{ marginTop: 18, fontSize: 14, fontWeight: 700, color: "rgba(6,40,28,0.7)" }}>{L.heroTrust}</div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer style={{ background: "#070D0A", color: "#fff", padding: "clamp(48px,6vw,72px) clamp(16px,4vw,40px) 40px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexWrap: "wrap", gap: 32, justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ maxWidth: 300 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 14 }}>
              <LogoMark size={34} shadow={false} />
              <span style={{ fontWeight: 800, fontSize: 19, letterSpacing: "-0.02em" }}>SwingEdge</span>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "#8F9D94", margin: 0 }}>{L.footerTag}</p>
          </div>
          <div style={{ display: "flex", gap: "clamp(32px,6vw,72px)", flexWrap: "wrap" }}>
            {L.footerCols.map((col) => (
              <div key={col.title}>
                <div style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "#7E8E83", marginBottom: 14 }}>{col.title}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {col.links.map((lnk) => (
                    lnk.href ? (
                      <a key={lnk.label} href={lnk.href} style={{ textDecoration: "none", color: "#C4CFC9", fontSize: 14, fontWeight: 500 }}>{lnk.label}</a>
                    ) : (
                      <span key={lnk.label} style={{ color: "#6C7A72", fontSize: 14, fontWeight: 500, cursor: "default" }}>{lnk.label} · {L.soon}</span>
                    )
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Legal disclaimer (preserved) */}
        <p style={{ maxWidth: 1100, margin: "36px auto 0", fontSize: 12, lineHeight: 1.6, color: "#8A9890" }}>{L.disclaimer}</p>

        <div style={{ maxWidth: 1100, margin: "24px auto 0", paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "space-between", alignItems: "center", fontSize: 13, color: "#8A9890" }}>
          <span>{L.copyright}</span>
          <div style={{ display: "flex", gap: 22 }}>
            <span style={{ color: "#6C7A72", fontWeight: 500, cursor: "default" }}>{L.privacy} · {L.soon}</span>
            <span style={{ color: "#6C7A72", fontWeight: 500, cursor: "default" }}>{L.terms} · {L.soon}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
