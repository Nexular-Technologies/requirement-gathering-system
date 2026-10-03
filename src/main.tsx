import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// apply saved theme before first paint
try {
  const t = localStorage.getItem("dsops-theme");
  const dark = t ? t === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.classList.toggle("dark", dark);
} catch (_) { /* ignore */ }

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
