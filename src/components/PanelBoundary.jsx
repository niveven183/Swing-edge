// ─── PANEL BOUNDARY (B-304 — blast radius) ─────────────────────────────────
//
// On 07.09 a single `t.riskPct` that was null, in one cell, in one table, in
// one tab, took down the journal, the import, the coach, the settings and the
// watchlist — because `src/main.jsx` wrapped the whole app in ONE boundary.
// The variable that decides whether a forgotten guard costs one screen or the
// product is the blast radius, not the guard.
//
// So: one contained boundary per computed panel. A panel that throws is
// replaced by a visible error card; its siblings keep rendering.
//
// ⛔ THE BOUNDARY MUST SHOUT, NEVER SWALLOW (PLAN-2026-09-07 §3.3).
// A boundary that fails quietly turns "broken" into "looks fine" — that is R-4
// wearing a costume, and it would be a worse bug than the crash it contains.
// Hence: every catch reports to Sentry AND renders a card the user can see.
// ⛔ There is no branch here that renders null.
//
// The card deliberately does NOT show the stack: it is a user-facing surface,
// and a stack is both meaningless to a trader and a disclosure risk.

import * as Sentry from "@sentry/react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { reportBoundaryCrash, APP_RELEASE } from "../lib/alertChannel.js";

// Hebrew labels so the card can say WHICH panel died rather than "something".
// A user who is told "the risk board failed" knows the rest of the screen is
// still trustworthy; "something went wrong" tells them to distrust everything.
const PANEL_LABELS = {
  root: "האפליקציה",
  risk: "לוח הסיכון",
  journal: "הג'ורנל",
  mentoring: "המאמן",
  analytics: "האנליטיקה",
  watchlist: "רשימת המעקב",
};

export function panelLabel(name) {
  return PANEL_LABELS[name] || "החלק הזה";
}

export function currentRoute() {
  try {
    return typeof window !== "undefined" ? window.location.pathname : "";
  } catch {
    return "";
  }
}

// Enriches the event the boundary itself sends. This is `beforeCapture` and
// NOT a second `captureException`: Sentry.ErrorBoundary already captures, so
// capturing again would file every crash twice and corrupt the very count we
// are building this channel to trust.
//
// `level: "fatal"` is the point. The boundary sets mechanism.handled = true
// (it has a fallback), so without this a contained crash arrives looking like
// routine noise — indistinguishable from a caught network blip.
export function enrichBoundaryScope(scope, name) {
  scope.setLevel("fatal");
  scope.setTag("boundary", name);
  scope.setContext("boundary", {
    panel: name,
    route: currentRoute(),
    release: APP_RELEASE,
  });
  return scope;
}

export default function PanelBoundary({ name, children }) {
  return (
    <Sentry.ErrorBoundary
      beforeCapture={(scope) => enrichBoundaryScope(scope, name)}
      onError={(error) =>
        reportBoundaryCrash({ error, boundary: name, route: currentRoute() })
      }
      fallback={({ resetError }) => (
        <div
          role="alert"
          data-boundary={name}
          className="bg-[var(--bg-elevated)] dark:bg-[var(--v3-bg-panel)] border border-[var(--v3-loss)]/30 rounded-xl p-4 flex flex-col gap-3"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-[var(--v3-loss)]" />
            <span className="text-sm font-bold text-[var(--v3-loss)]">
              {panelLabel(name)} לא נטען
            </span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            שאר המסך תקין וניתן להמשיך לעבוד. התקלה דווחה אלינו אוטומטית.
          </p>
          <button
            type="button"
            onClick={resetError}
            className="self-start inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/[0.06] text-slate-300 hover:bg-white/[0.1] transition"
          >
            <RefreshCw size={12} />
            נסה שוב
          </button>
        </div>
      )}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}
