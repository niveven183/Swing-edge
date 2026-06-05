import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import * as Sentry from "@sentry/react";
import "./index.css";
import SwingEdge from "../SwingEdge_App.jsx";
import LandingGate from "./components/LandingGate.jsx";
import { ToastProvider, ConfirmProvider } from "./components/ToastProvider.jsx";
import { ThemeProvider } from "./contexts/ThemeContext.jsx";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.browserTracingIntegration()],
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
