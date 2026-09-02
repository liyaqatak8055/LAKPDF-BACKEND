import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { runStorageMaintenance } from "./utils/storage";
import { initAnalytics } from "./utils/analytics";

const applyInitialTheme = () => {
  try {
    const stored = localStorage.getItem("lakpdf-theme");
    const theme = stored === "light" || stored === "dark" ? stored : "light";
    document.documentElement.classList.toggle("dark", theme === "dark");
  } catch {
    // ignore
  }
};

const sanitizeStartupStorage = () => {
  const jsonKeys = [
    "lakpdf_session",
    "lakpdf_users_db",
    "lakpdf_reset_tokens",
    "lakpdf_file_history",
    "lakpdf_favorites",
    "lakpdf_stats",
    "lakpdf_feedback",
    "lakpdf_form_profile",
    "lakpdf_form_templates",
    "lakpdf_signatures"
  ];
  try {
    jsonKeys.forEach((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      try {
        JSON.parse(raw);
      } catch {
        localStorage.removeItem(key);
      }
    });
  } catch {
    // ignore storage access errors
  }

  try {
    // Session flags should not persist across broken tabs.
    sessionStorage.removeItem("lakpdf_chunk_reload_once");
  } catch {
    // ignore session storage access errors
  }
};

// 🔹 GLOBAL JS ERROR GUARD (ONE TIME FIX)
// Catches any unhandled errors that could cause SPA to break silently
window.addEventListener("error", (e) => {
  console.error("[GLOBAL ERROR]", e.message, e.filename, e.lineno, e.colno);
  // Don't prevent default - let React Error Boundary handle it if possible
});

window.addEventListener("unhandledrejection", (e) => {
  console.error("[UNHANDLED PROMISE]", e.reason);
});

// SAFE IMPORT UTILITY MOVED TO utils/safeImport.tsx

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Could not find root element");
}

applyInitialTheme();
sanitizeStartupStorage();
runStorageMaintenance();
if (import.meta.env.PROD) {
  initAnalytics();
}

const root = ReactDOM.createRoot(rootElement);

const renderStartupFallback = (message: string) => {
  rootElement.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#f8fafc;">
      <div style="max-width:480px;width:100%;background:white;border:1px solid #e2e8f0;border-radius:12px;padding:24px;font-family:Inter,system-ui,sans-serif;text-align:center;">
        <h2 style="margin:0 0 8px;font-size:24px;color:#0f172a;">App failed to load</h2>
        <p style="margin:0 0 16px;color:#475569;">${message}</p>
        <button id="lakpdf-startup-retry" style="border:0;background:#0f172a;color:white;padding:10px 16px;border-radius:8px;cursor:pointer;font-weight:600;">Refresh</button>
      </div>
    </div>
  `;
  document.getElementById("lakpdf-startup-retry")?.addEventListener("click", () => {
    window.location.reload();
  });
};

try {
  root.render(
    <React.StrictMode>
      <HelmetProvider>
        <ErrorBoundary componentName="Application Shell" showHomeButton={false}>
          <App />
        </ErrorBoundary>
      </HelmetProvider>
    </React.StrictMode>
  );
} catch (error) {
  console.error("[STARTUP ERROR]", error);
  renderStartupFallback("A startup error occurred. Please refresh the page.");
}
