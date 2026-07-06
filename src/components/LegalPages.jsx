import { Link } from "react-router-dom";
import Logo from "./Logo.jsx";

/* Static legal pages (/terms, /privacy). Content is the FINAL Hebrew copy —
   rendered verbatim, never machine-translated. For non-Hebrew UI we show a
   short "English version coming soon" notice above the binding Hebrew text.
   Language is read from the app's canonical key so the notice matches the UI. */

function getLang() {
  try {
    return localStorage.getItem("swingEdgeLang") || "he";
  } catch {
    return "he";
  }
}

const C = {
  bg: "#0a0f1e",
  border: "rgba(255,255,255,0.08)",
  text: "#F8FAFC",
  secondary: "#CBD5E1",
  muted: "#94a3b8",
  accent: "#16D687",
};

const paraStyle = { fontSize: 16, lineHeight: 1.85, color: C.secondary, margin: "0 0 20px" };
const leadStyle = { color: C.text, fontWeight: 700 };

function Para({ lead, children }) {
  return (
    <p style={paraStyle}>
      {lead && <strong style={leadStyle}>{lead} </strong>}
      {children}
    </p>
  );
}

function Item({ lead, children }) {
  return (
    <li style={{ fontSize: 16, lineHeight: 1.85, color: C.secondary, paddingInlineStart: 6 }}>
      <strong style={leadStyle}>{lead} </strong>
      {children}
    </li>
  );
}

function LegalShell({ title, updated, children }) {
  const showEnNotice = getLang() !== "he";
  return (
    <div
      dir="rtl"
      lang="he"
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily: "'Heebo', system-ui, sans-serif",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <header style={{ borderBottom: `1px solid ${C.border}`, padding: "16px clamp(16px,4vw,40px)" }}>
        <div style={{ maxWidth: 780, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <Link to="/" style={{ textDecoration: "none" }} aria-label="SwingEdge">
            <Logo size={30} variant="white" />
          </Link>
          <Link to="/" style={{ textDecoration: "none", color: C.secondary, fontSize: 14, fontWeight: 600 }}>
            ← חזרה לאתר
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: 780, margin: "0 auto", padding: "clamp(32px,5vw,56px) clamp(16px,4vw,40px) 80px" }}>
        {showEnNotice && (
          <div
            dir="ltr"
            style={{
              background: "rgba(22,214,135,0.08)",
              border: "1px solid rgba(22,214,135,0.25)",
              borderRadius: 12,
              padding: "12px 16px",
              marginBottom: 32,
              fontSize: 14,
              fontWeight: 600,
              color: C.accent,
            }}
          >
            English version coming soon
          </div>
        )}

        <h1 style={{ fontSize: "clamp(28px,4vw,40px)", fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 8px" }}>{title}</h1>
        <div style={{ fontSize: 14, color: C.muted, marginBottom: 32 }}>{updated}</div>

        {children}
      </main>
    </div>
  );
}

export function PrivacyPage() {
  return (
    <LegalShell title="מדיניות פרטיות" updated="עודכן: יולי 2026">
      <Para lead="מי אנחנו:">SwingEdge — יומן מסחר אישי. יצירת קשר: niveven183@gmail.com</Para>
      <Para lead="מה אנחנו אוספים:">(א) כתובת מייל וסיסמה מוצפנת — לצורך חשבון; (ב) נתוני העסקאות והיומן שאתה מזין — לתפעול השירות עבורך בלבד; (ג) נתוני שימוש אנונימיים (עמודים, ביצועים) — לשיפור המוצר; (ד) דיווחי שגיאות טכניים; (ה) כתובת מייל שנמסרה בהרשמה לרשימת המתנה — לצורך עדכון על פתיחת הגישה למוצר בלבד; ניתן להסרה בכל עת בפנייה במייל.</Para>
      <Para lead="איפה זה נשמר:">בספקי ענן מאובטחים — Supabase (בסיס נתונים ואימות), Vercel (אירוח ואנליטיקה), Sentry (שגיאות). הנתונים מוצפנים בתעבורה ובמנוחה אצל הספקים.</Para>
      <Para lead="מה אנחנו לא עושים:">לא מוכרים ולא מעבירים את הנתונים שלך לצד שלישי לצרכי שיווק. לא ניגשים לחשבון המסחר האמיתי שלך — SwingEdge אינו מחובר לברוקר ואינו מבצע עסקאות.</Para>
      <Para lead={`הזכויות שלך (לפי חוק הגנת הפרטיות, התשמ"א-1981):`}>עיון בנתוניך, תיקונם ומחיקתם. מחיקת חשבון = מחיקת כל נתוני היומן שלך. פנה במייל ונטפל תוך 30 יום.</Para>
      <Para lead="עוגיות:">משתמשים באחסון מקומי (local storage) הנחוץ לתפעול בלבד — התחברות והעדפות. אין עוגיות פרסום.</Para>
      <Para lead="קטינים:">השירות מיועד לבני 18 ומעלה.</Para>
      <Para lead="שינויים:">נעדכן עמוד זה בכל שינוי מהותי; המשך שימוש = הסכמה לגרסה המעודכנת.</Para>
    </LegalShell>
  );
}

export function TermsPage() {
  return (
    <LegalShell title="תנאי שימוש" updated="עודכן: יולי 2026">
      <Para lead="הבהרה חשובה — לא ייעוץ השקעות:">
        {`SwingEdge הוא כלי לניהול יומן מסחר, מעקב וניתוח ביצועים אישיים בלבד. המידע, הנתונים, החישובים וההתראות באפליקציה — לרבות נתוני שוק, ניתוחי AI ומחשבוני פוזיציה — אינם מהווים ייעוץ השקעות, שיווק השקעות או המלצה לביצוע עסקה כהגדרתם בחוק הסדרת העיסוק בייעוץ השקעות, בשיווק השקעות ובניהול תיקי השקעות, התשנ"ה-1995, ואינם מותאמים לצרכיו האישיים של משתמש כלשהו. מסחר בניירות ערך ובמטבעות קריפטוגרפיים כרוך בסיכון ממשי לאובדן כספך. ביצועי עבר אינם מעידים על ביצועים עתידיים. נתוני השוק מסופקים ע"י צדדים שלישיים ועשויים להיות שגויים או מעוכבים.`}
      </Para>

      <ol style={{ paddingInlineStart: 22, margin: 0, display: "flex", flexDirection: "column", gap: 16 }}>
        <Item lead="השירות:">SwingEdge מספק יומן מסחר, כלי ניתוח אישיים ונתוני שוק. השירות ניתן כפי-שהוא (As-Is) וללא התחייבות לזמינות, דיוק או התאמה למטרה מסוימת.</Item>
        <Item lead="לא ייעוץ:">כמפורט לעיל — אתה האחראי הבלעדי להחלטות המסחר שלך.</Item>
        <Item lead="חשבון:">גיל 18+; פרטים נכונים; שמירה על סודיות הסיסמה; חשבון אחד אישי ולא-מסחרי למשתמש.</Item>
        <Item lead="שימוש אסור:">הנדסה לאחור, scraping, עומס מכוון, הפצה מחדש של נתוני השוק, או כל שימוש בלתי חוקי.</Item>
        <Item lead="קניין רוחני:">הקוד, העיצוב והתוכן — קניין SwingEdge. הנתונים שאתה מזין — שלך.</Item>
        <Item lead="הגבלת אחריות:">בשום מקרה לא נהיה אחראים לנזק ישיר או עקיף, כולל הפסדי מסחר, אובדן נתונים או אובדן רווחים, הנובעים מהשימוש בשירות או מהסתמכות על מידע בו — במידה המרבית המותרת בדין. אחריותנו המצטברת לא תעלה על הסכום ששילמת ב-12 החודשים האחרונים (או 100 ₪, הגבוה מביניהם).</Item>
        <Item lead="סיום:">רשאים להשעות/לסגור חשבון בגין הפרת תנאים; אתה רשאי למחוק את חשבונך בכל עת.</Item>
        <Item lead="דין וסמכות שיפוט:">דיני מדינת ישראל; סמכות ייחודית לבתי המשפט המוסמכים במחוז תל אביב.</Item>
        <Item lead="שינויים:">נעדכן תנאים אלה לפי הצורך; שינוי מהותי יוצג באפליקציה.</Item>
      </ol>
    </LegalShell>
  );
}
