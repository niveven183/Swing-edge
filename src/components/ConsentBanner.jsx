import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { readConsent, grantAnalytics, denyAnalytics, subscribeConsent } from "../lib/consent.js";
import { useBottomOverlay } from "../hooks/useBottomOverlay.js";
import "./ConsentBanner.css";

// Hebrew only, deliberately not routed through src/i18n.js: the banner links to a
// policy that renders "English version coming soon", so a translated banner pointing
// at an untranslated binding document is worse than a consistent Hebrew one. main.jsx
// also sits outside any language context — wiring one here would create a second
// source of truth for swingEdgeLang. Translate both together when LegalPages gets an
// English version.
export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  // Resolved in an effect, not during render: a throwing localStorage (Safari
  // private mode) must not break paint.
  useEffect(() => {
    if (readConsent() === null) setVisible(true);
    return subscribeConsent(() => setVisible(false));
  }, []);

  // B-404 — layout only: report how much of the viewport bottom the card covers, so the app
  // reserves that space (scroll room · FAB lift · modal inset) instead of hiding CTAs under it.
  // ⛔ It never influences whether the banner shows; the consent decision above is untouched.
  const cardRef = useRef(null);
  useBottomOverlay("consent", cardRef, visible);

  if (!visible) return null;

  return (
    <div className="se-consent" role="region" aria-label="הודעת פרטיות">
      {/* dir="rtl" belongs on the card, never on the lane: SwingEdge_App.jsx:1500
          rewrites documentElement.dir by language, and a lane locked to rtl would
          land on the physical right and cover the FAB whenever the UI is English. */}
      <div ref={cardRef} className="se-consent__card" dir="rtl" lang="he">
        <p className="se-consent__text">
          אנחנו משתמשים ב-Google Analytics כדי להבין איך משתמשים באתר ולשפר אותו. בלי
          אישורך לא נשמרות עוגיות ולא נוצר מזהה מתמשך בדפדפן שלך.{" "}
          <Link to="/privacy" className="se-consent__link">
            מדיניות הפרטיות
          </Link>
        </p>
        <div className="se-consent__actions">
          <button
            type="button"
            className="se-consent__btn"
            data-testid="consent-accept"
            onClick={grantAnalytics}
          >
            מאשר
          </button>
          <button
            type="button"
            className="se-consent__btn"
            data-testid="consent-decline"
            onClick={denyAnalytics}
          >
            לא תודה
          </button>
        </div>
      </div>
    </div>
  );
}
