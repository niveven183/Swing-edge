import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import SwingEdgeApp from "../SwingEdge_App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <SwingEdgeApp />
  </StrictMode>
);
