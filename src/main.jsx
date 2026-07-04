import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import * as Sentry from "@sentry/react";
import "./index.css";
import SwingEdge from "../SwingEdge_App.jsx";
import LandingGate from "./components/LandingGate.jsx";
import { ToastProvider, ConfirmProvider } from "./components/ToastProvider.jsx";
import { ThemeProvider } from "./contexts/ThemeContext.jsx";
import { inject } from "@vercel/analytics";

inject();

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
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

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<p>משהו השתבש. רענן את הדף.</p>}>
      <ThemeProvider>
        <ToastProvider>
          <ConfirmProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<LandingGate />} />
                <Route path="/app" element={<SwingEdge />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </ConfirmProvider>
        </ToastProvider>
      </ThemeProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>
);
