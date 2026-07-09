import { useState, useEffect, useRef, useId, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import Logo from "./Logo.jsx";
import { supabase, isSupabaseConfigured } from "../supabaseClient.js";
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
    navLogin: "התחבר",
    ctaDemo: "ראה איך זה עובד",
    heroBadge: "ה-AI שמכיר את הטריידינג שלך · בזמן אמת",
    heroH1: "הפסקת לנחש.",
    heroSub: "היומן שקורא את ההיסטוריה שלך ומראה בזמן אמת מה באמת עובד לך — עוד לפני Enter.",
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
    flagLine: "הצטרף לדור החדש של הסוחרים.",
    knowledgeKicker: "מנוע הידע",
    knowledgeTitle: "המאמן שקרא את הספרים",
    knowledgeBody: "כל אזהרה, כל דפוס, כל המלצה — נשענים על המתודולוגיות שבנו את הטריידינג המודרני.",
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
    heroDisclaimer: "SwingEdge אינו ייעוץ השקעות. מסחר כרוך בסיכון לאובדן כספך — כל החלטה באחריותך בלבד.",
    disclaimer: "SwingEdge הוא כלי לניהול וניתוח יומן מסחר בלבד. אין לראות בתוכן באפליקציה או בדף זה ייעוץ השקעות, המלצה לרכישה או מכירה של נייר ערך כלשהו, או תחליף לייעוץ פיננסי מקצועי. מסחר בשוק ההון כרוך בסיכון להפסד הון. ביצועי עבר אינם מעידים על ביצועים עתידיים. כל החלטת מסחר היא באחריות המשתמש בלבד.",
    waitlistKicker: "רשימת המתנה",
    waitlistTitle: "שריין את המקום שלך",
    waitlistSub: "אנחנו פותחים גישה בהדרגה. השאר אימייל ותהיה מהראשונים שיקבלו הזמנה — בלי ספאם, רק העדכון החשוב.",
    waitlistPlaceholder: "האימייל שלך",
    waitlistCta: "שריין מקום",
    waitlistSending: "רגע…",
    waitlistSuccess: "אתה בפנים 🎯 נודיע לך ברגע שנפתח לך גישה.",
    waitlistDup: "אתה כבר ברשימה 🎯 נודיע לך ברגע שנצא לדרך.",
    waitlistInvalid: "רגע — האימייל לא נראה תקין. בדוק שוב?",
    waitlistError: "משהו השתבש. נסה שוב עוד רגע.",
    waitlistUnavailable: "ההרשמה תיפתח ממש בקרוב.",
    waitlistPrivacyNote: "בהרשמה אתה מסכים שנשמור את האימייל לצורך עדכון על ההשקה. פרטים ב",
    waitlistPrivacyLink: "מדיניות הפרטיות",
  },
  en: {
    dir: "ltr",
    nav: [
      { label: "Features", href: "#features" },
      { label: "How it works", href: "#how" },
      { label: "Pricing", href: "#pricing" },
    ],
    ctaStart: "Start free",
    navLogin: "Log in",
    ctaDemo: "See how it works",
    heroBadge: "The AI that knows your trading · Real-time",
    heroH1: "You stopped guessing.",
    heroSub: "The journal that reads your history and shows you, in real time, what actually works for you — before you hit Enter.",
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
    flagLine: "Join the new generation of traders.",
    knowledgeKicker: "The knowledge engine",
    knowledgeTitle: "The coach that read the books",
    knowledgeBody: "Every warning, every pattern, every nudge — grounded in the methodologies that built modern trading.",
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
    heroDisclaimer: "SwingEdge is not investment advice. Trading involves risk of losing your money — every decision is your responsibility alone.",
    disclaimer: "SwingEdge is a tool for managing and analyzing a trading journal only. Nothing in the app or on this page constitutes investment advice, a recommendation to buy or sell any security, or a substitute for professional financial advice. Trading the capital markets involves risk of loss of capital. Past performance is not indicative of future results. Every trading decision is the sole responsibility of the user.",
    waitlistKicker: "Waitlist",
    waitlistTitle: "Reserve your spot",
    waitlistSub: "We're opening access gradually. Drop your email to be among the first to get an invite — no spam, just the one that matters.",
    waitlistPlaceholder: "Your email",
    waitlistCta: "Reserve my spot",
    waitlistSending: "One sec…",
    waitlistSuccess: "You're in 🎯 We'll let you know the moment your access opens.",
    waitlistDup: "You're already on the list 🎯 We'll be in touch the moment we launch.",
    waitlistInvalid: "Hold on — that email doesn't look right. Mind checking?",
    waitlistError: "Something went wrong. Try again in a moment.",
    waitlistUnavailable: "Sign-ups open very soon.",
    waitlistPrivacyNote: "By signing up you agree we'll store your email to notify you about launch. Details in the ",
    waitlistPrivacyLink: "Privacy Policy",
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

// Methodologies the coach's knowledge engine is grounded in. Proper nouns —
// identical in both languages.
const SOURCES = ["Minervini", "O'Neil", "Bulkowski", "Douglas", "Wyckoff", "Qullamaggie"];

/* ============================================================
   Trading-term glossary + inline highlighter.
   Terms that appear in the landing copy get a subtle emphasis
   (bold + accent + dotted underline, SAME font size so line
   layout is untouched) plus a hover/click tooltip explaining
   the essence of the term. Bilingual (he / en).
   ============================================================ */
const TERMS = {
  edge: {
    title: { he: "Edge", en: "Edge" },
    desc: {
      he: "הסטאפים שבהם יש לך יתרון סטטיסטי אמיתי — לפי היסטוריית העסקאות שלך, לא לפי תחושה.",
      en: "The setups where you hold a real statistical advantage — based on your actual trade history, not a hunch.",
    },
  },
  tilt: {
    title: { he: "Tilt", en: "Tilt" },
    desc: {
      he: "מצב רגשי שמוציא אותך מהכללים: מסחר נקמה, הגדלת פוזיציות, רדיפה אחרי הפסד. הרוצח השקט של חשבונות.",
      en: "The emotional state that breaks your rules: revenge trading, sizing up, chasing losses. The silent account-killer.",
    },
  },
  setup: {
    title: { he: "סטאפ (Setup)", en: "Setup" },
    desc: {
      he: "תבנית הכניסה לעסקה — התנאים המדויקים שבהם אתה נכנס לפוזיציה (למשל פריצה, פולבק, דגל).",
      en: "Your entry pattern — the exact conditions under which you take a position (e.g. breakout, pullback, flag).",
    },
  },
  rr: {
    title: { he: "R/R — סיכון / סיכוי", en: "R/R — Risk / Reward" },
    desc: {
      he: "יחס סיכון-סיכוי: כמה אתה עלול להרוויח מול כמה אתה מסכן. 1:2.4 = פוטנציאל רווח פי 2.4 מההפסד.",
      en: "Risk/Reward: potential profit vs. what you risk. 1:2.4 = you stand to make 2.4× what you'd lose.",
    },
  },
  winRate: {
    title: { he: "Win Rate — אחוז זכייה", en: "Win Rate" },
    desc: {
      he: "האחוז מהעסקאות הסגורות שהסתיימו ברווח. מעל 55% זה טוב — אבל לבד זה לא כל הסיפור.",
      en: "The share of your closed trades that ended in profit. Above 55% is solid — but on its own it's not the whole story.",
    },
  },
  rMultiple: {
    title: { he: "R-Multiple", en: "R-Multiple" },
    desc: {
      he: "מודד רווח/הפסד ביחידות של הסיכון: ‎+2R = הרווחת פי 2 מהסיכון, ‎−1R = הפסד מתוכנן. מנטרל את גודל הסכום.",
      en: "Measures P&L in units of risk: +2R = you made 2× your risk, −1R = a planned loss. Removes dollar-size bias.",
    },
  },
  visionOcr: {
    title: { he: "Vision OCR", en: "Vision OCR" },
    desc: {
      he: "קליטת עסקה אוטומטית מצילום מסך של הצ'ארט — במקום להקליד ידנית.",
      en: "Auto-captures a trade straight from a screenshot of your chart — instead of typing it in by hand.",
    },
  },
};

// Surface forms (as they literally appear in the copy) → glossary key.
// Latin terms are guarded with (?<![A-Za-z]) … (?![A-Za-z]) so e.g. the
// "Edge" inside "SwingEdge" is never highlighted. Ordered longest-first
// so multi-word terms win over their fragments.
const TERM_PATTERN =
  /R-Multiple|Vision OCR|Win Rate|(?<![A-Za-z])Setup(?![A-Za-z])|(?<![A-Za-z])setup(?![A-Za-z])|סטאפים|סטאפ|R\/R|(?<![A-Za-z])Edge(?![A-Za-z])|(?<![A-Za-z])Tilt(?![A-Za-z])|(?<![A-Za-z])tilt(?![A-Za-z])/g;
const SURFACE_KEY = {
  "r-multiple": "rMultiple",
  "vision ocr": "visionOcr",
  "win rate": "winRate",
  setup: "setup",
  "סטאפים": "setup",
  "סטאפ": "setup",
  "r/r": "rr",
  edge: "edge",
  tilt: "tilt",
};

const TERM_TONES = {
  light: { color: "#039E26", underline: "rgba(3,158,38,0.45)" },
  dark: { color: "#7CF3C0", underline: "rgba(124,243,192,0.5)" },
  onGreen: { color: "#ffffff", underline: "rgba(255,255,255,0.7)" },
};

/* Single highlighted term: bold + accent + dotted underline (same size),
   with an accessible popover that escapes any overflow:hidden / animated-
   transform ancestor via a portal to <body>. */
function Term({ children, tone = "light", title, desc, lang = "he" }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef(null);
  const popRef = useRef(null);
  const id = useId();
  const palette = TERM_TONES[tone] || TERM_TONES.light;

  const recalc = useCallback(() => {
    const t = ref.current?.getBoundingClientRect();
    if (!t) return;
    const W = 260;
    const popH = popRef.current?.getBoundingClientRect().height || 120;
    const M = 8;
    let left = t.left + t.width / 2 - W / 2;
    left = Math.max(M, Math.min(left, window.innerWidth - W - M));
    const top =
      t.top >= popH + M ? t.top - popH - M : t.bottom + M;
    setPos({ top, left });
  }, []);

  useEffect(() => {
    if (open) requestAnimationFrame(recalc);
  }, [open, recalc]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    const onDoc = (e) => {
      if (!ref.current?.contains(e.target) && !popRef.current?.contains(e.target)) setOpen(false);
    };
    const close = () => setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", recalc);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", recalc);
    };
  }, [open, recalc]);

  return (
    <>
      <span
        ref={ref}
        role="button"
        tabIndex={0}
        aria-label={title}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen((v) => !v); }
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => {
          setTimeout(() => { if (!popRef.current?.matches(":hover")) setOpen(false); }, 140);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        style={{
          fontWeight: 800,
          color: palette.color,
          textDecoration: "underline dotted",
          textDecorationColor: palette.underline,
          textUnderlineOffset: "3px",
          textDecorationThickness: "1.5px",
          whiteSpace: "nowrap",
          cursor: "help",
        }}
      >
        {children}
      </span>

      {open && createPortal(
        <div
          ref={popRef}
          id={id}
          role="tooltip"
          dir={lang === "he" ? "rtl" : "ltr"}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            width: 260,
            zIndex: 9999,
            background: "#0B1712",
            border: "1px solid rgba(0,192,118,0.35)",
            borderRadius: 14,
            padding: "13px 15px",
            boxShadow: "0 18px 44px rgba(7,13,10,0.4)",
            textAlign: "start",
            fontFamily: "'Heebo',sans-serif",
            animation: "seReveal 0.16s ease both",
          }}
        >
          <div style={{ fontWeight: 800, color: "#16D687", fontSize: 13.5, marginBottom: 6 }}>{title}</div>
          <div style={{ fontSize: 13, lineHeight: 1.55, color: "#C4CFC9", whiteSpace: "pre-line" }}>{desc}</div>
        </div>,
        document.body
      )}
    </>
  );
}

/* Scan a plain copy string and wrap any known trading term in <Term>.
   Returns the original string when no term is present (keeps JSX clean). */
function renderTerms(text, lang, tone = "light") {
  if (typeof text !== "string") return text;
  const parts = [];
  let last = 0;
  let key = 0;
  let m;
  TERM_PATTERN.lastIndex = 0;
  while ((m = TERM_PATTERN.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const surface = m[0];
    const def = TERMS[SURFACE_KEY[surface.toLowerCase()]];
    parts.push(
      <Term key={key++} tone={tone} lang={lang} title={def.title[lang]} desc={def.desc[lang]}>
        {surface}
      </Term>
    );
    last = m.index + surface.length;
  }
  if (parts.length === 0) return text;
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function WaitlistForm({ L, lang }) {
  const inputId = useId();
  const msgId = useId();
  // Capture UTM params once, on mount — before any client-side navigation.
  const [utm] = useState(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      return { source: q.get("utm_source"), campaign: q.get("utm_campaign") };
    } catch {
      return { source: null, campaign: null };
    }
  });
  const [email, setEmail] = useState("");
  // status: idle | sending | success | duplicate | error
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const done = status === "success" || status === "duplicate";

  const submit = async (e) => {
    e.preventDefault();
    if (status === "sending" || done) return;

    const clean = email.trim().toLowerCase();
    if (!EMAIL_RE.test(clean)) {
      setStatus("error");
      setMessage(L.waitlistInvalid);
      return;
    }
    if (!isSupabaseConfigured || !supabase) {
      setStatus("error");
      setMessage(L.waitlistUnavailable);
      return;
    }

    setStatus("sending");
    setMessage("");
    const { error } = await supabase
      .from("waitlist")
      .insert({ email: clean, source: utm.source, campaign: utm.campaign });

    if (!error) {
      setStatus("success");
      setMessage(L.waitlistSuccess);
    } else if (error.code === "23505") {
      // Duplicate email — friendly, not an error state.
      setStatus("duplicate");
      setMessage(L.waitlistDup);
    } else {
      console.error("[waitlist] insert failed:", error);
      setStatus("error");
      setMessage(L.waitlistError);
    }
  };

  const okTone = status === "success" || status === "duplicate";
  const field = {
    flex: "1 1 240px", minWidth: 0, padding: "15px 18px", borderRadius: 999,
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.18)",
    color: "#fff", fontSize: 16, fontWeight: 600, fontFamily: "'Heebo',sans-serif",
    outline: "none",
  };

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", width: "100%" }}>
      <form
        onSubmit={submit}
        className="se-waitlist-form"
        style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}
      >
        <label htmlFor={inputId} style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0 }}>
          {L.waitlistPlaceholder}
        </label>
        <input
          id={inputId}
          type="email"
          inputMode="email"
          autoComplete="email"
          dir="ltr"
          required
          placeholder={L.waitlistPlaceholder}
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (status === "error") { setStatus("idle"); setMessage(""); } }}
          disabled={done}
          aria-describedby={message ? msgId : undefined}
          aria-invalid={status === "error"}
          style={{ ...field, textAlign: lang === "he" ? "right" : "left" }}
        />
        <button
          type="submit"
          disabled={status === "sending" || done}
          style={{
            ...( { cursor: "pointer", border: "none", flex: "0 0 auto", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "15px 30px", borderRadius: 999, background: "#00C076", color: "#06281C", fontWeight: 800, fontSize: 16, fontFamily: "'Heebo',sans-serif", boxShadow: "0 10px 26px rgba(0,192,118,0.35)" } ),
            opacity: status === "sending" || done ? 0.7 : 1,
          }}
        >
          {status === "sending" ? L.waitlistSending : done ? "✓" : L.waitlistCta}
        </button>
      </form>
      <div
        id={msgId}
        role="status"
        aria-live="polite"
        style={{ minHeight: 22, marginTop: 14, fontSize: 15, fontWeight: 700, color: okTone ? "#7CF3C0" : status === "error" ? "#FF9B9D" : "transparent" }}
      >
        {message}
      </div>
    </div>
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
  const goWaitlist = () =>
    document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth", block: "center" });

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
        background: "#FFFFFF",
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
          padding: "14px clamp(16px,4vw,40px)", background: "rgba(255,255,255,0.80)",
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
          <button
            onClick={goApp}
            style={{
              border: "none", background: "transparent", cursor: "pointer",
              color: "#3c4a42", fontWeight: 600, fontSize: 15, padding: "8px 10px",
              textDecoration: "none",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
          >
            {L.navLogin}
          </button>
          <button onClick={goWaitlist} style={{ ...pill, padding: "10px 20px", fontSize: 15, boxShadow: "0 6px 18px rgba(0,192,118,0.32)" }}>
            {L.ctaStart}
          </button>
        </div>
      </nav>

      {/* ============ HERO ============ */}
      <header id="top" style={{ position: "relative", background: "#070B0A", color: "#fff", overflow: "hidden", padding: "clamp(48px,7vw,96px) clamp(16px,4vw,40px) clamp(72px,9vw,120px)" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(900px 520px at 50% -12%, rgba(255,255,255,0.05), transparent 62%)" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px)", backgroundSize: "54px 54px", WebkitMaskImage: "radial-gradient(120% 90% at 50% 0%, #000 40%, transparent 78%)", maskImage: "radial-gradient(120% 90% at 50% 0%, #000 40%, transparent 78%)" }} />
        <div style={{ position: "relative", maxWidth: 860, margin: "0 auto", textAlign: "center" }}>
          <div data-reveal="">
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 13px", borderRadius: 999, background: "rgba(0,192,118,0.10)", border: "1px solid rgba(0,192,118,0.24)", fontSize: 13, fontWeight: 700, color: "#7CF3C0", marginBottom: 30 }}>
              <span data-se-float="" style={{ width: 7, height: 7, borderRadius: "50%", background: "#00E08A", boxShadow: "0 0 10px #00E08A", animation: "seGlow 1.8s ease-in-out infinite" }} />
              {L.heroBadge}
            </div>
            <h1 className="se-serif" style={{ fontSize: "clamp(42px,7vw,84px)", lineHeight: 1.02, letterSpacing: "-1px", margin: "0 0 22px" }}>{L.heroH1}</h1>
            <p style={{ fontSize: "clamp(16px,1.7vw,19px)", lineHeight: 1.6, color: "#A9B7AF", maxWidth: 540, margin: "0 auto 34px" }}>{L.heroSub}</p>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
              <button onClick={goWaitlist} style={{ cursor: "pointer", border: "none", height: 44, padding: "0 32px", borderRadius: 36, background: "#00C076", color: "#06281C", fontWeight: 400, fontSize: 16, fontFamily: "'Heebo',sans-serif" }}>{L.ctaStart}</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "#7E8E85", fontSize: 14, fontWeight: 600 }}>
              <span style={{ color: "#00E08A" }}>✓</span>{L.heroTrust}
            </div>
            <a href="/terms" style={{ display: "block", maxWidth: 560, margin: "16px auto 0", color: "#7E8E85", fontSize: 12.5, lineHeight: 1.6, textDecoration: "none" }}>
              {L.heroDisclaimer}
            </a>
          </div>

          {/* Device mockup — CSS dashboard in an angled browser frame.
              Placeholder for a real app screenshot (polish phase A3). */}
          <div className="se-hero-device" data-reveal="" style={{ marginTop: "clamp(56px,7vw,100px)", perspective: 1600 }}>
            <div className="se-hero-frame" style={{ maxWidth: 960, margin: "0 auto", borderRadius: 18, overflow: "hidden", border: "1px solid rgba(255,255,255,0.10)", background: "linear-gradient(180deg,#0E1714,#070D0A)", boxShadow: "0 50px 120px rgba(0,0,0,0.55)" }}>
              {/* title bar */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#FF5F57" }} />
                <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#FEBC2E" }} />
                <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#28C840" }} />
                <span style={{ marginInlineStart: 14, fontSize: 12, color: "#8F9D94", fontFamily: "'JetBrains Mono',monospace" }}>app.swing-edge.com</span>
              </div>
              {/* body */}
              <div style={{ display: "flex", textAlign: "start" }}>
                <div className="se-hero-sidebar" style={{ flex: "none", width: 56, borderInlineEnd: "1px solid rgba(255,255,255,0.06)", padding: "16px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                  <LogoMark size={24} shadow={false} />
                  {[0, 1, 2, 3].map((i) => (
                    <span key={i} style={{ width: 22, height: 22, borderRadius: 7, background: i === 0 ? "rgba(0,192,118,0.16)" : "rgba(255,255,255,0.05)" }} />
                  ))}
                </div>
                <div style={{ flex: 1, minWidth: 0, padding: "clamp(16px,2.4vw,26px)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                    <span style={{ fontWeight: 800, fontSize: 16, color: "#fff" }}>{lang === "he" ? "לוח בקרה" : "Dashboard"}</span>
                    <span style={{ fontSize: 12, color: "#8F9D94", fontFamily: "'JetBrains Mono',monospace" }}>{lang === "he" ? "החודש" : "This month"}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
                    {[
                      { label: L.statWinLabel, value: "68%", accent: "#16D687" },
                      { label: lang === "he" ? "עסקאות" : "Trades", value: "142", accent: "#fff" },
                      { label: L.statScoreLabel, value: "8.2", accent: "#fff" },
                    ].map((t) => (
                      <div key={t.label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 14px" }}>
                        <div style={{ fontSize: 11.5, color: "#8F9D94", fontWeight: 600, marginBottom: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.label}</div>
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 22, color: t.accent, lineHeight: 1 }}>{t.value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 16, marginBottom: 14 }}>
                    <svg viewBox="0 0 320 90" preserveAspectRatio="none" style={{ width: "100%", height: 76, display: "block" }} aria-hidden="true">
                      <defs>
                        <linearGradient id="seHeroArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgba(0,192,118,0.30)" />
                          <stop offset="100%" stopColor="rgba(0,192,118,0)" />
                        </linearGradient>
                      </defs>
                      <path d="M0,72 L40,62 L80,66 L120,46 L160,52 L200,34 L240,38 L280,18 L320,10 L320,90 L0,90 Z" fill="url(#seHeroArea)" />
                      <polyline points="0,72 40,62 80,66 120,46 160,52 200,34 240,38 280,18 320,10" fill="none" stroke="#00C076" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {[
                      { s: "NVDA", side: lang === "he" ? "לונג" : "Long", pnl: "+2.4R", up: true },
                      { s: "AAPL", side: lang === "he" ? "שורט" : "Short", pnl: "-1.0R", up: false },
                      { s: "TSLA", side: lang === "he" ? "לונג" : "Long", pnl: "+1.8R", up: true },
                    ].map((r, i) => (
                      <div key={r.s} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 2px", borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.05)" }}>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 13.5, color: "#fff" }}>{r.s}</span>
                        <span style={{ fontSize: 12.5, color: "#8F9D94", fontWeight: 600 }}>{r.side}</span>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 13.5, color: r.up ? "#16D687" : "#FF6B6E" }}>{r.pnl}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
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
            <h2 className="se-serif" style={{ fontSize: "clamp(30px,4.6vw,52px)", lineHeight: 1.08, letterSpacing: "-0.03em", fontWeight: 400, margin: 0 }}>{L.problemTitlePre}<span style={{ color: "#E5484D" }}>{L.problemTitleHi}</span></h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 20 }}>
            {L.problemCards.map((c) => (
              <div key={c.title} data-reveal="" style={{ background: "#fff", border: "1px solid rgba(21,32,26,0.07)", borderRadius: 20, padding: 28, boxShadow: "0 1px 3px rgba(21,32,26,0.04)" }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(229,72,77,0.10)", display: "flex", alignItems: "center", justifyContent: "center", color: "#E5484D", fontSize: 20, fontWeight: 800, marginBottom: 18 }}>{c.icon}</div>
                <h3 style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.01em", margin: "0 0 9px" }}>{renderTerms(c.title, lang, "light")}</h3>
                <p style={{ fontSize: 15, lineHeight: 1.6, color: "#5b6b62", margin: 0 }}>{renderTerms(c.body, lang, "light")}</p>
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
                <p style={{ fontSize: 16, lineHeight: 1.6, color: "#A9B7AF", maxWidth: 430, margin: 0 }}>{renderTerms(L.featCoachBody, lang, "dark")}</p>
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

            {/* Edge Finder — "black on white", literally. */}
            <div data-reveal="" style={{ gridColumn: "span 2", background: "#fff", color: "#15201A", border: "1px solid rgba(21,32,26,0.07)", borderRadius: 24, padding: 26, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
              <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(21,32,26,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(21,32,26,0.05) 1px,transparent 1px)", backgroundSize: "30px 30px", opacity: 0.6 }} />
              <span style={{ position: "relative", display: "inline-block", alignSelf: "flex-start", padding: "5px 12px", borderRadius: 999, background: "rgba(21,32,26,0.06)", color: "#3c4a42", fontSize: 12, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", marginBottom: "auto" }}>{L.featEdgeTag}</span>
              <h3 style={{ position: "relative", fontSize: 20, fontWeight: 800, letterSpacing: "-0.01em", margin: "14px 0 6px" }}>{renderTerms(L.featEdgeTitle, lang, "light")}</h3>
              <p style={{ position: "relative", fontSize: 14, lineHeight: 1.5, color: "#5b6b62", margin: 0 }}>{renderTerms(L.featEdgeBody, lang, "light")}</p>
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
              <h3 style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.01em", margin: "0 0 5px" }}>{renderTerms(L.featTiltTitle, lang, "dark")}</h3>
              <p style={{ fontSize: 13.5, lineHeight: 1.5, color: "#A9B7AF", margin: 0 }}>{renderTerms(L.featTiltBody, lang, "dark")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FLAG LINE ============ */}
      <section style={{ background: "#070B0A", color: "#fff", padding: "clamp(48px,6vw,84px) clamp(16px,4vw,40px)", textAlign: "center" }}>
        <p data-reveal="" className="se-serif" style={{ maxWidth: 820, margin: "0 auto", fontSize: "clamp(24px,3.4vw,42px)", lineHeight: 1.25, letterSpacing: "-0.02em" }}>{L.flagLine}</p>
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
                    <h3 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.01em", margin: "0 0 6px" }}>{renderTerms(step.title, lang, "light")}</h3>
                    <p style={{ fontSize: 15, lineHeight: 1.6, color: "#5b6b62", margin: 0 }}>{renderTerms(step.body, lang, "light")}</p>
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

      {/* ============ KNOWLEDGE ENGINE ============ */}
      <section style={{ padding: "clamp(56px,7vw,96px) clamp(16px,4vw,40px)" }}>
        <div data-reveal="" style={{ maxWidth: 820, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#039E26", marginBottom: 14 }}>{L.knowledgeKicker}</div>
          <h2 style={{ fontSize: "clamp(26px,4vw,44px)", lineHeight: 1.1, letterSpacing: "-0.03em", fontWeight: 800, margin: "0 0 14px" }}>{L.knowledgeTitle}</h2>
          <p style={{ fontSize: "clamp(15px,1.7vw,17px)", lineHeight: 1.6, color: "#5b6b62", maxWidth: 620, margin: "0 auto" }}>{L.knowledgeBody}</p>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10, marginTop: 26 }}>
            {SOURCES.map((s) => (
              <span key={s} style={{ display: "inline-block", padding: "8px 15px", borderRadius: 999, background: "rgba(21,32,26,0.05)", border: "1px solid rgba(21,32,26,0.10)", color: "#3c4a42", fontSize: 13.5, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace" }}>{s}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ============ QUOTE ============ */}
      <section style={{ padding: "clamp(64px,8vw,110px) clamp(16px,4vw,40px)" }}>
        <div data-reveal="" style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: 60, lineHeight: 0.6, color: "#CBD5CE", fontWeight: 800, marginBottom: 10 }}>”</div>
          <blockquote className="se-serif" style={{ fontSize: "clamp(22px,3.2vw,36px)", lineHeight: 1.32, letterSpacing: "-0.02em", fontWeight: 400, fontStyle: "italic", margin: "0 0 26px", color: "#15201A" }}>{renderTerms(L.quote, lang, "light")}</blockquote>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 42, height: 42, borderRadius: "50%", background: "#E4EAE6", border: "1px solid rgba(21,32,26,0.08)" }} />
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
                  <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14.5, color: "#C4CFC9" }}><span style={{ color: "#16D687", fontWeight: 800, flex: "none" }}>✓</span><span>{renderTerms(f, lang, "dark")}</span></div>
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
                  <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14.5, color: "#E1EAE5" }}><span style={{ color: "#16D687", fontWeight: 800, flex: "none" }}>✓</span><span>{renderTerms(f, lang, "dark")}</span></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ WAITLIST ============ */}
      <section id="waitlist" aria-label={L.waitlistTitle} style={{ position: "relative", overflow: "hidden", background: "#070D0A", color: "#fff", padding: "clamp(64px,8vw,110px) clamp(16px,4vw,40px)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(720px 420px at 50% -10%, rgba(255,255,255,0.05), transparent 62%)" }} />
        <div data-reveal="" style={{ position: "relative", maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 13px", borderRadius: 999, background: "rgba(0,192,118,0.12)", border: "1px solid rgba(0,192,118,0.30)", fontSize: 13, fontWeight: 700, color: "#7CF3C0", marginBottom: 20 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#00E08A", boxShadow: "0 0 10px #00E08A" }} />
            {L.waitlistKicker}
          </div>
          <h2 style={{ fontSize: "clamp(30px,5vw,54px)", lineHeight: 1.06, letterSpacing: "-0.035em", fontWeight: 800, margin: "0 0 16px" }}>{L.waitlistTitle}</h2>
          <p style={{ fontSize: "clamp(16px,1.9vw,20px)", lineHeight: 1.6, color: "#A9B7AF", maxWidth: 520, margin: "0 auto 30px" }}>{L.waitlistSub}</p>
          <WaitlistForm L={L} lang={lang} />
          <p style={{ marginTop: 20, fontSize: 12.5, lineHeight: 1.6, color: "#7E8E85" }}>
            {L.waitlistPrivacyNote}
            <a href="/privacy" style={{ color: "#7CF3C0", textDecoration: "underline" }}>{L.waitlistPrivacyLink}</a>.
          </p>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section style={{ position: "relative", overflow: "hidden", background: "linear-gradient(120deg,#008555,#00C076 55%,#16D687)", color: "#06281C", padding: "clamp(70px,9vw,120px) clamp(16px,4vw,40px)", textAlign: "center" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.10) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.10) 1px,transparent 1px)", backgroundSize: "46px 46px", WebkitMaskImage: "radial-gradient(120% 100% at 50% 0%, #000 30%, transparent 75%)", maskImage: "radial-gradient(120% 100% at 50% 0%, #000 30%, transparent 75%)" }} />
        <div data-reveal="" style={{ position: "relative", maxWidth: 760, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(34px,5.4vw,64px)", lineHeight: 1.04, letterSpacing: "-0.035em", fontWeight: 800, margin: "0 0 18px" }}>{L.finalTitle}</h2>
          <p style={{ fontSize: "clamp(16px,2vw,20px)", lineHeight: 1.55, color: "rgba(6,40,28,0.78)", fontWeight: 600, margin: "0 0 34px" }}>{L.finalSub}</p>
          <button onClick={goWaitlist} style={{ cursor: "pointer", border: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "17px 42px", borderRadius: 999, background: "#06281C", color: "#16D687", fontWeight: 800, fontSize: 18, boxShadow: "0 16px 40px rgba(6,40,28,0.32)", fontFamily: "'Heebo',sans-serif" }}>{L.ctaStart}</button>
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
            <a href="/privacy" style={{ color: "#C4CFC9", fontWeight: 500, textDecoration: "none" }}>{L.privacy}</a>
            <a href="/terms" style={{ color: "#C4CFC9", fontWeight: 500, textDecoration: "none" }}>{L.terms}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
