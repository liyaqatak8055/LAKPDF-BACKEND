import React from "react";

export const DarkModeExample: React.FC = () => {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface text-slate-800 dark:text-dark-text-primary p-4 transition-colors duration-300">
      <h3 className="text-sm font-semibold mb-1">Dark Mode Example</h3>
      <p className="text-sm text-slate-600 dark:text-dark-text-secondary">
        This card switches colors using Tailwind dark variants.
      </p>
    </div>
  );
};
