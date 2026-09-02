import React from "react";

// Wraps dynamic imports to prevent blank pages on load errors.
export const safeImport = async (
  importFn: () => Promise<any>,
  componentName: string
) => {
  const CHUNK_RELOAD_KEY = "lakpdf_chunk_reload_once";
  const IMPORT_TIMEOUT_MS = 15000;
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error("Dynamic import timeout")), IMPORT_TIMEOUT_MS);
    });
    const module = await Promise.race([importFn(), timeoutPromise]);
    console.log(`[SAFE IMPORT] Successfully loaded ${componentName}`);
    return module;
  } catch (error) {
    console.error(`[SAFE IMPORT] Failed to load ${componentName}:`, error);

    const errorMessage = error instanceof Error ? error.message : String(error || "");
    const isChunkFailure =
      errorMessage.includes("Loading chunk") ||
      errorMessage.includes("Failed to fetch dynamically imported module") ||
      errorMessage.includes("Dynamic import timeout");

    if (isChunkFailure) {
      const hasRetried = sessionStorage.getItem(CHUNK_RELOAD_KEY) === "1";
      if (!hasRetried) {
        sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
        window.setTimeout(() => window.location.reload(), 300);
      } else {
        sessionStorage.removeItem(CHUNK_RELOAD_KEY);
      }
    }

    return {
      default: () => (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-red-50 rounded-xl shadow-lg border border-red-200 p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">
              Failed to Load {componentName}
            </h2>
            <p className="text-slate-600 mb-6 leading-relaxed">
              This component could not be loaded. Please refresh the page to try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-red-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-600 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      )
    };
  }
};
