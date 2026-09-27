import React from "react";

export const GlobalErrorHandler: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  React.useEffect(() => {
    // Only enable global error handlers in production
    if (import.meta.env.PROD) {
      const CHUNK_RELOAD_KEY = "lakpdf_chunk_reload_once";
      const handleUnhandledError = (event: ErrorEvent) => {
        const errorMessage = event.message || event.error?.message || "";
        const errorStack = event.error?.stack || "";
        const target = event.target as any;
        const targetSrc = String(target?.src || target?.href || event.filename || "");

        // Suppress AdSense, third-party ad-related, ad-blockers (ERR_BLOCKED_BY_CLIENT) and script errors
        const isAdError =
          errorMessage.includes("adsbygoogle") ||
          errorMessage.includes("googlesyndication") ||
          errorMessage.includes("doubleclick") ||
          errorMessage.includes("SecurityError") ||
          errorMessage.includes("cross-origin") ||
          errorMessage.includes("iframe") ||
          errorMessage.includes("gpt") ||
          errorMessage.includes("google_ads") ||
          errorStack.includes("pagead") ||
          errorStack.includes("adservice") ||
          targetSrc.includes("pagead") ||
          targetSrc.includes("googlesyndication") ||
          targetSrc.includes("doubleclick") ||
          (!event.error && (!errorMessage || errorMessage === "Script error."));

        if (isAdError) {
          // Silently suppress ad-related errors
          event.preventDefault();
          event.stopPropagation();
          return false;
        }

        // Only log app-specific errors for debugging
        if (event.error || errorMessage) {
          console.error("[GlobalErrorHandler] Unhandled error:", event.error || errorMessage);
        }
      };

      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        const reason = event.reason?.message || event.reason?.toString() || "";

        // Suppress AdSense promise rejections
        const isAdRejection =
          reason.includes("adsbygoogle") ||
          reason.includes("googlesyndication") ||
          reason.includes("SecurityError") ||
          reason.includes("cross-origin") ||
          reason.includes("iframe") ||
          reason.includes("doubleclick");

        if (isAdRejection) {
          console.debug("[GlobalErrorHandler] Ad promise rejection suppressed:", reason);
          event.preventDefault();
          return false;
        }

        console.error("[GlobalErrorHandler] Unhandled promise rejection:", event.reason);
      };

      // Handle chunk load failures specifically
      const handleChunkError = (event: ErrorEvent) => {
        const errorMessage = event.message || event.error?.message || "";
        // Ignore browser extension errors
        if (errorMessage.includes("chrome-extension://") || errorMessage.includes("moz-extension://")) {
          return;
        }

        const isChunkError =
          errorMessage.includes("Loading chunk") ||
          errorMessage.includes("Failed to fetch dynamically imported module");

        if (isChunkError) {
          console.error("[GlobalErrorHandler] Chunk load failure:", event.error);

          const hasRetried = sessionStorage.getItem(CHUNK_RELOAD_KEY) === "1";
          if (hasRetried) {
            sessionStorage.removeItem(CHUNK_RELOAD_KEY);
            return;
          }

          sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
          setTimeout(() => window.location.reload(), 1000);
          event.preventDefault();
        }
      };

      // Use capture phase to catch errors before they bubble
      window.addEventListener("error", handleUnhandledError, true);
      window.addEventListener("unhandledrejection", handleUnhandledRejection);
      window.addEventListener("error", handleChunkError);

      return () => {
        window.removeEventListener("error", handleUnhandledError, true);
        window.removeEventListener("unhandledrejection", handleUnhandledRejection);
        window.removeEventListener("error", handleChunkError);
      };
    }
  }, []);

  return <>{children}</>;
};
