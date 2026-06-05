import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css";

const Check = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

export default function LandingPage() {
  const navigate = useNavigate();
  const goApp = () => navigate("/app");

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll(".landing .reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="landing" style={{ scrollBehavior: "smooth" }}>
      <a href="#main" className="skip">דלג לתוכן הראשי</a>

      {/* NAV */}
      <nav aria-label="ניווט ראשי">
        <div className="wrap nav-in">
          <a className="logo" href="#" aria-label="SwingEdge — דף הבית">
            <span className="logo-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M3 17l5-5 4 3 6-8" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /><circle cx="18" cy="7" r="2.4" fill="#fff" /></svg></span>
            Swing<b>Edge</b>
          </a>
          <div className="nav-links">
            <a href="#how">איך זה עובד</a>
            <a href="#features">יכולות</a>
            <a href="#download">הורדה</a>
            <a href="#pricing">תמחור</a>
            <button className="nav-cta" onClick={goApp}>התחל חינם</button>
          </div>
        </div>
      </nav>

      <main id="main">

        {/* HERO */}
        <header className="hero">
          <div className="wrap hero-grid">
            <div className="hero-copy">
              <span className="badge-live reveal"><span className="d" aria-hidden="true"></span> בינה מלאכותית · מבוססת על ה-DNA האישי שלך</span>
              <h1 className="reveal" style={{ animationDelay: ".05s" }}>
                תפסיק לנחש. <br />תתחיל <span className="u">לדעת</span> <br />איזה סוחר <span className="g">אתה באמת.</span>
              </h1>
              <p className="sub reveal" style={{ animationDelay: ".12s" }}>
                כל יומן מספר לך מה <b>כבר קרה</b>. SwingEdge מנתח כל עסקה מול ההיסטוריה האישית שלך — <b>שנייה לפני שאתה לוחץ Save</b>. הוא יודע מתי אתה מנצח, ובדיוק מתי אתה עומד לעשות את הטעות שכבר עלתה לך ביוקר.
              </p>
              <div className="cta-row reveal" style={{ animationDelay: ".2s" }}>
                <button className="btn-primary" onClick={goApp}>
                  התחל חינם — בלי כרטיס
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                <a className="btn-ghost" href="#how">
                  <span className="play" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M8 5v14l11-7z" fill="var(--iris-deep)" /></svg></span>
                  ראה איך זה עובד
                </a>
              </div>
              <p className="micro reveal" style={{ animationDelay: ".28s" }}>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                התחלה ב-30 שניות · עברית מלאה · עובד גם מהנייד
              </p>
            </div>

            <div className="hero-visual reveal" style={{ animationDelay: ".18s" }} aria-label="הדגמה של מסך מאמן ההחלטות" role="img">
              <div className="app-card">
                <div className="app-top">
                  <div className="app-brand"><span className="m" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M3 17l5-5 4 3 6-8" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span> SwingEdge</div>
                  <span className="app-pro">PRO</span>
                </div>
                <div className="app-body">
                  <div className="coach-head">
                    <span className="ic" aria-hidden="true">🧠</span>
                    <span className="ti">מאמן החלטות · עסקה חדשה</span>
                    <span className="verdict">דלג · 18%</span>
                  </div>
                  <div className="signal bad"><span className="si" aria-hidden="true">🔴</span><span><b>Breakout ב-Volatile:</b> רק 22% הצלחה ב-9 עסקאות שלך.</span></div>
                  <div className="signal warn"><span className="si" aria-hidden="true">⚠️</span><span><b>כניסה מתוך FOMO</b> — המצב הרגשי הכי גרוע שלך. חכה 15 דק'.</span></div>
                  <div className="signal ok"><span className="si" aria-hidden="true">✅</span><span><b>יחס סיכוי/סיכון 2.0:1</b> — עובר את הרף שלך.</span></div>
                  <div className="hist">בעסקאות דומות: 13 עסקאות · 31% הצלחה · ‎-0.40R ממוצע</div>
                </div>
              </div>
              <div className="float-stat fs-1">
                <div className="l">Win Rate החודש</div>
                <div className="v up">▲ 57%</div>
              </div>
              <div className="float-stat fs-2">
                <div className="l">ציון חודשי</div>
                <div className="v iris">B+</div>
              </div>
            </div>
          </div>
        </header>

        {/* TRUST */}
        <section className="trust" aria-label="נתונים מרכזיים">
          <div className="wrap trust-in">
            <div className="trust-item"><div className="n"><span className="g">5</span></div><div className="c">ממדים ב-Trade DNA</div></div>
            <div className="trust-div" aria-hidden="true"></div>
            <div className="trust-item"><div className="n"><span className="i">∞</span></div><div className="c">עסקאות — ללא הגבלה</div></div>
            <div className="trust-div" aria-hidden="true"></div>
            <div className="trust-item"><div className="n">5</div><div className="c">שפות · עברית מלאה</div></div>
            <div className="trust-div" aria-hidden="true"></div>
            <div className="trust-item"><div className="n"><span className="g">0₪</span></div><div className="c">להתחלה · ללא כרטיס</div></div>
          </div>
        </section>

        {/* PROBLEM */}
        <section className="block problem" aria-labelledby="prob-h">
          <div className="wrap">
            <p className="eyebrow reveal">האמת שאף יומן לא יספר לך</p>
            <h2 className="h2 reveal" id="prob-h">לא חסר לך מידע. <br />חסר לך <span style={{ color: "var(--iris-deep)" }}>מראה</span>.</h2>
            <p className="lead reveal">אתה רושם עסקאות, אבל אף אחד לא אומר לך את האמת הלא-נוחה על איך אתה באמת סוחר. הדפוסים שמפסידים חוזרים שוב ושוב — כי הם בלתי נראים לך.</p>
            <div className="prob-grid">
              <div className="prob-card reveal">
                <span className="prob-emo" aria-hidden="true">🔁</span>
                <h3>אותה טעות. שוב ושוב.</h3>
                <p>נכנסת מתוך FOMO. הזזת סטופ. רדפת אחרי הנר. אתה יודע שזה קרה — אבל תמיד רק אחרי שזה כבר עלה לך כסף.</p>
              </div>
              <div className="prob-card reveal" style={{ animationDelay: ".08s" }}>
                <span className="prob-emo" aria-hidden="true">🌫️</span>
                <h3>ה-Edge שלך מוסתר ממך</h3>
                <p>איזה setup באמת עובד לך? באיזה מצב שוק? באיזו שעה? התשובות קבורות בתוך מאות עסקאות שמעולם לא ניתחת לעומק.</p>
              </div>
              <div className="prob-card reveal" style={{ animationDelay: ".16s" }}>
                <span className="prob-emo" aria-hidden="true">🪦</span>
                <h3>יומן רגיל = ארכיון מת</h3>
                <p>Excel ויומנים אחרים רק אוגרים נתונים. הם לעולם לא יעצרו אותך ויגידו: "רגע — את העסקה הזו אתה עומד להפסיד".</p>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES BENTO */}
        <section className="block" id="features" aria-labelledby="feat-h">
          <div className="wrap">
            <p className="eyebrow reveal">לא עוד כלי. שותף.</p>
            <h2 className="h2 reveal" id="feat-h">מאמן אישי שיודע <br /><span style={{ color: "var(--green-deep)" }}>בדיוק</span> מי אתה.</h2>
            <p className="lead reveal">ארבעה מנועי בינה שעובדים על ה-DNA הספציפי שלך — לא על תיאוריות גנריות מיוטיוב.</p>

            <div className="bento">
              <div className="cell cell-big reveal">
                <div className="tag iris">⚡ Live Decision Coach</div>
                <h3>הוא עוצר אותך לפני הטעות — לא אחריה</h3>
                <p>אתה מזין עסקה. תוך שנייה, המאמן סורק את כל ההיסטוריה שלך — ה-setup, הרגש, מצב השוק, יחס הסיכון — ופוסק: GO, היזהר, או דלג. כמו חבר ותיק שמכיר כל טעות שעשית, ולא מפחד להגיד לך אותה.</p>
                <div className="cell-hero-visual">
                  <div className="signal bad" style={{ margin: "0 0 8px" }}><span className="si" aria-hidden="true">🔴</span><span><b>Breakout ב-Volatile:</b> 22% הצלחה אצלך</span></div>
                  <div className="signal ok" style={{ margin: 0 }}><span className="si" aria-hidden="true">✅</span><span><b>R:R 2.3:1</b> — מצוין</span></div>
                </div>
              </div>

              <div className="cell cell-sm reveal" style={{ animationDelay: ".08s" }}>
                <span className="cell-ico" aria-hidden="true">🧬</span>
                <h3>Trade DNA</h3>
                <p>הדיוקן שלך ב-5 ממדים: סיכון, משמעת, עקביות, צמיחה ורגש.</p>
              </div>

              <div className="cell cell-sm reveal" style={{ animationDelay: ".12s" }}>
                <span className="cell-ico" aria-hidden="true">✨</span>
                <h3>Edge Finder</h3>
                <p>חושף אוטומטית את ה-setups, השעות והתנאים שבהם אתה הכי רווחי.</p>
              </div>

              <div className="cell cell-md reveal" style={{ animationDelay: ".16s" }}>
                <div className="tag">📊 דוח DNA חודשי</div>
                <h3>הראי שמראה לך כמה השתפרת</h3>
                <p>בתחילת כל חודש: ציון אישי, החוזק שהכי השתלם לך, החולשה שעלתה לך הכי הרבה — ופעולה אחת ברורה להחודש הבא.</p>
                <div className="cell-hero-visual">
                  <div className="dna-row"><span className="lab">Bull Flag</span><span className="dna-track"><span className="dna-fill" style={{ width: "100%", background: "var(--green)" }}></span></span><span className="dna-val" style={{ color: "var(--green-deep)" }}>100%</span></div>
                  <div className="dna-row"><span className="lab">Breakout</span><span className="dna-track"><span className="dna-fill" style={{ width: "25%", background: "var(--red)" }}></span></span><span className="dna-val" style={{ color: "var(--red)" }}>25%</span></div>
                </div>
              </div>

              <div className="cell cell-md reveal" style={{ animationDelay: ".2s" }}>
                <div className="tag iris">🛡️ Tilt Protection</div>
                <h3>בלם חירום לרגעים שאתה לא בשיא</h3>
                <p>רצף הפסדים? שעה חריגה? המערכת מזהה את ה-tilt לפניך — ועוצרת אותך לפני שהרגש ינהל לך את התיק.</p>
                <div className="cell-hero-visual">
                  <div className="signal warn" style={{ margin: 0 }}><span className="si" aria-hidden="true">⚠️</span><span>3 הפסדים ברצף — שקול הפסקה של 30 דק'.</span></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW */}
        <section className="block how" id="how" aria-labelledby="how-h">
          <div className="wrap">
            <p className="eyebrow reveal">פשוט. מהיר. עובד.</p>
            <h2 className="h2 reveal" id="how-h">3 צעדים בינך לבין <span style={{ color: "var(--iris-deep)" }}>סוחר טוב יותר</span></h2>
            <p className="lead reveal">בלי התקנות מסובכות, בלי הגדרות אינסופיות. נכנסים — ומתחילים.</p>
            <div className="steps">
              <div className="step reveal">
                <div className="step-n" aria-hidden="true">1</div>
                <h3>רשום עסקה</h3>
                <p>entry, stop, target, ה-setup והרגש שהיית בו. 20 שניות, וזהו.</p>
              </div>
              <div className="step reveal" style={{ animationDelay: ".1s" }}>
                <div className="step-n" aria-hidden="true">2</div>
                <h3>המערכת לומדת אותך</h3>
                <p>כל עסקה מחדדת את ה-DNA שלך. המנוע מזהה דפוסים שהעין שלך מפספסת.</p>
              </div>
              <div className="step reveal" style={{ animationDelay: ".2s" }}>
                <div className="step-n" aria-hidden="true">3</div>
                <h3>קבל אזהרות חיות</h3>
                <p>מהעסקה הבאה — המאמן כבר עובד. כל החלטה נמדדת מול מי שאתה באמת.</p>
              </div>
            </div>
          </div>
        </section>

        {/* DOWNLOAD */}
        <section className="block download" id="download" aria-labelledby="dl-h">
          <div className="wrap dl-in">
            <p className="eyebrow reveal">בכל מקום שבו אתה סוחר</p>
            <h2 className="h2 reveal" id="dl-h">המאמן שלך. <br />על כל מסך.</h2>
            <p className="lead reveal">אפליקציית דסקטופ מהירה ל-Mac ו-Windows — או פשוט פתח בדפדפן והתקן בלחיצה. הנתונים שלך מסונכרנים בכל מקום.</p>
            <div className="dl-btns">
              <button className="dl-btn reveal" onClick={goApp} aria-label="הורד את SwingEdge ל-macOS">
                <svg viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M17.05 12.04c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.09-2.01-3.76-2.04-1.6-.16-3.12.94-3.93.94-.81 0-2.06-.92-3.39-.89-1.74.03-3.35 1.01-4.25 2.57-1.81 3.14-.46 7.79 1.3 10.34.86 1.25 1.89 2.65 3.24 2.6 1.3-.05 1.79-.84 3.36-.84 1.57 0 2.01.84 3.39.81 1.4-.02 2.29-1.27 3.14-2.53.99-1.45 1.4-2.85 1.42-2.93-.03-.01-2.72-1.04-2.75-4.13zM14.5 4.5c.72-.87 1.2-2.08 1.07-3.29-1.03.04-2.28.69-3.02 1.56-.66.77-1.24 2-1.09 3.18 1.15.09 2.32-.58 3.04-1.45z" /></svg>
                <span className="t"><small>הורד עבור</small><b>macOS</b></span>
              </button>
              <button className="dl-btn reveal" style={{ animationDelay: ".08s" }} onClick={goApp} aria-label="הורד את SwingEdge ל-Windows">
                <svg viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M3 5.1L10.4 4v7.3H3V5.1zm0 13.8l7.4 1v-7.2H3v6.2zm8.3 1.1L21 21v-8.6h-9.7v7.6zM11.3 4L21 2.7v8.6h-9.7V4z" /></svg>
                <span className="t"><small>הורד עבור</small><b>Windows</b></span>
              </button>
            </div>
            <p className="dl-web reveal" style={{ animationDelay: ".16s" }}>מעדיף בלי התקנה? <button onClick={goApp}>פתח ישירות בדפדפן ←</button></p>
          </div>
        </section>

        {/* PRICING */}
        <section className="block" id="pricing" aria-labelledby="price-h">
          <div className="wrap">
            <p className="eyebrow reveal">תמחור הוגן. בלי כוכביות.</p>
            <h2 className="h2 reveal" id="price-h">התחל חינם. <br />שדרג כשאתה <span style={{ color: "var(--green-deep)" }}>מרוויח</span>.</h2>
            <p className="lead reveal">כל הליבה — חינם, לתמיד. בלי כרטיס אשראי, בלי הפתעות בסוף החודש.</p>
            <div className="price-grid">
              <div className="plan reveal">
                <div className="plan-name">Free</div>
                <div className="plan-price">0₪</div>
                <p className="plan-desc">כל מה שצריך כדי להתחיל להשתפר כבר היום</p>
                <ul>
                  <li><Check /> יומן עסקאות ללא הגבלה</li>
                  <li><Check /> Trade DNA + Edge Finder</li>
                  <li><Check /> Live Decision Coach בסיסי</li>
                  <li><Check /> Dashboard + אנליטיקה מלאה</li>
                </ul>
                <button className="plan-btn free" onClick={goApp}>התחל חינם</button>
              </div>
              <div className="plan pro reveal" style={{ animationDelay: ".1s" }}>
                <span className="plan-pop">הבחירה של המקצוענים</span>
                <div className="plan-name">Pro</div>
                <div className="plan-price">$19<small>/חודש</small></div>
                <p className="plan-desc">לסוחר שמתייחס לעצמו ברצינות</p>
                <ul>
                  <li><Check /> <b>כל מה שב-Free, ובנוסף:</b></li>
                  <li><Check /> דוח DNA חודשי מלא + תובנות עומק</li>
                  <li><Check /> סריקת צ'ארט אוטומטית מצילום מסך</li>
                  <li><Check /> סיכומים יומיים אוטומטיים בטלגרם</li>
                </ul>
                <button className="plan-btn paid" onClick={goApp}>התחל 14 ימי ניסיון</button>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* FINAL CTA */}
      <section className="final" aria-labelledby="final-h">
        <div className="wrap in">
          <h2 className="reveal" id="final-h">העסקה הבאה שלך <br />מגיעה <span className="g">בעוד דקות.</span></h2>
          <p className="reveal" style={{ animationDelay: ".08s" }}>השאלה היחידה: תיכנס אליה עיוור — או עם מאמן שמכיר כל מהלך שלך?</p>
          <button className="btn-primary reveal" onClick={goApp} style={{ animationDelay: ".16s" }}>
            התחל חינם עכשיו
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <p className="micro reveal" style={{ animationDelay: ".24s", marginTop: "20px" }}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            ללא כרטיס אשראי · ביטול בכל עת · עברית מלאה
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="wrap">
          <div className="foot-in">
            <a className="logo" href="#" style={{ color: "#fff" }} aria-label="SwingEdge — דף הבית">
              <span className="logo-mark" style={{ width: "30px", height: "30px" }} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M3 17l5-5 4 3 6-8" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
              Swing<b style={{ color: "var(--green)" }}>Edge</b>
            </a>
            <nav className="foot-links" aria-label="ניווט תחתון">
              <a href="#features">יכולות</a>
              <a href="#download">הורדה</a>
              <a href="#pricing">תמחור</a>
              <button onClick={goApp}>כניסה</button>
            </nav>
            <div className="foot-copy">© 2026 SwingEdge</div>
          </div>
          <p className="disclaimer">
            SwingEdge הוא כלי לניהול וניתוח יומן מסחר בלבד. אין לראות בתוכן באפליקציה או בדף זה ייעוץ השקעות, המלצה לרכישה או מכירה של נייר ערך כלשהו, או תחליף לייעוץ פיננסי מקצועי. מסחר בשוק ההון כרוך בסיכון להפסד הון. ביצועי עבר אינם מעידים על ביצועים עתידיים. כל החלטת מסחר היא באחריות המשתמש בלבד.
          </p>
        </div>
      </footer>
    </div>
  );
}
