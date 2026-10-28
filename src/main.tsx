import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import "./styles.css";
import "./experience.css";
import "./intelligence.css";
import "./studio.css";
import "./editorial.css";
import "./workspaces.css";
import "./insights.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
