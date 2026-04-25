import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import SwingEdge from "../SwingEdge_App.jsx";
import { ToastProvider, ConfirmProvider } from "./components/ToastProvider.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ToastProvider>
      <ConfirmProvider>
        <SwingEdge />
      </ConfirmProvider>
    </ToastProvider>
  </StrictMode>
);
