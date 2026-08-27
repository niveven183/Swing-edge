import { StrictMode, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import * as Sentry from "@sentry/react";
import "./index.css";
import SwingEdge from "../SwingEdge_App.jsx";
import LandingGate from "./components/LandingGate.jsx";
import { TermsPage, PrivacyPage } from "./components/LegalPages.jsx";
import { ToastProvider, ConfirmProvider } from "./components/ToastProvider.jsx";
import { ThemeProvider } from "./contexts/ThemeContext.jsx";
import ConsentBanner from "./components/ConsentBanner.jsx";
import { trackPageView, analyticsPath } from "./lib/consent.js";
import { inject } from "@vercel/analytics";

// ⛔ NEVER call inject() bare. The script Vercel serves builds its payload as
// `{ o: location.href }` — fragment included — and supabase-js runs the implicit
// flow (src/supabaseClient.js:13), so every OAuth return lands on
// `/#access_token=…&refresh_token=…` before the client strips the hash. Bare
// inject() therefore ships a live session token to a third party on those loads.
//
// This is INCIDENTS #12 in the second channel: that fix pinned `page_location`
// for gtag and left this one open, because @vercel/analytics never touches gtag
// and the contract test guarded gtag only. Measured in a real browser against
// the bytes production actually serves: o was 115 chars WITH the fragment, and
// 28 chars without it once pinned — the pageview still counts either way.
// Full measurement: docs/audits/AUDIT-B184-vercel-analytics-2026-08-27.md
//
// The url is REBUILT from origin + an allowlisted path. It is deliberately not
// a filter: nothing here looks for "access_token", because a filter only knows
// the parameter names someone already thought of. Pinned by test:analytics 15-16.
inject({
  beforeSend: (event) => ({
    ...event,
    url: window.location.origin + analyticsPath(window.location.pathname),
  }),
});

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  enabled: import.meta.env.PROD,
  tracesSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.browserTracingIntegration(),
    // Drop errors whose stack is made up EXCLUSIVELY of non-first-party frames
    // (browser extensions / injected <anonymous> scripts). Matches against the
    // `applicationKey` embedded at build time by @sentry/vite-plugin, so it only
    // ever discards code that isn't ours — a real app error, even one that passes
    // through a third-party frame, is kept.
    Sentry.thirdPartyErrorFilterIntegration({
      filterKeys: ["swing-edge"],
      behaviour: "drop-error-if-exclusively-contains-third-party-frames",
    }),
  ],
  // Belt-and-suspenders runtime net (works even without module metadata):
  // silence the exact injected-script signature we diagnosed plus common
  // browser-extension / third-party noise.
  ignoreErrors: [
    "Cannot read properties of undefined (reading 'getBoundingClientRect')",
    "Can't find variable: getBoundingClientRect",
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    /^Non-Error promise rejection captured/,
    /extension context invalidated/i,
  ],
  // Errors whose top frame originates from a browser extension or an injected
  // <anonymous> script are never ours — never report them.
  denyUrls: [
    /extensions\//i,
    /^chrome-extension:\/\//i,
    /^moz-extension:\/\//i,
    /^safari-web-extension:\/\//i,
    /^<anonymous>$/,
  ],
});

console.info('[SwingEdge] Build v1.0.1 — ' + new Date().toISOString());

// gtag('config') already emits the load pageview, so the seed is the path the
// document loaded with — comparing against it is what keeps the first render from
// counting twice (a doubled load pageview moves bounce rate with no behavior change).
// Comparing rather than a "first run" flag also survives StrictMode's double effect.
function RouteTracker() {
  const { pathname } = useLocation();
  const last = useRef(typeof window !== "undefined" ? window.location.pathname : null);
  useEffect(() => {
    if (pathname === last.current) return;
    last.current = pathname;
    trackPageView(pathname);
  }, [pathname]);
  return null;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<p>משהו השתבש. רענן את הדף.</p>}>
      <ThemeProvider>
        <ToastProvider>
          <ConfirmProvider>
            <BrowserRouter>
              <RouteTracker />
              <Routes>
                <Route path="/" element={<LandingGate />} />
                <Route path="/app" element={<SwingEdge />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              <ConsentBanner />
            </BrowserRouter>
          </ConfirmProvider>
        </ToastProvider>
      </ThemeProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>
);
