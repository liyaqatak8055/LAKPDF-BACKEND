import { useState, useEffect } from "react";

export const PageLoader: React.FC = () => {
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowFallback(true), 12000);
    return () => window.clearTimeout(timer);
  }, []);

  if (!showFallback) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-6 text-center shadow-sm">
        <h3 className="text-xl font-bold text-slate-900 mb-2">Still loading...</h3>
        <p className="text-slate-600 text-sm mb-5">
          Network ya cache issue ke wajah se page load delay ho raha hai.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700"
          >
            Refresh
          </button>
          <button
            onClick={() => window.location.assign("/")}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
};
