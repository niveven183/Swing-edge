import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import SwingEdge from "../SwingEdge_App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <SwingEdge />
  </StrictMode>
);
