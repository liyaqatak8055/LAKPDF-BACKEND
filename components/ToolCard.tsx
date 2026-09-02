import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Zap, Sparkles } from 'lucide-react';

interface ToolCardProps {
  title: string;
  description: string;
  to: string;
  icon: React.ReactNode;
  popular?: boolean;
  comingSoon?: boolean;
}

export const ToolCard: React.FC<ToolCardProps> = ({
  title,
  description,
  to,
  icon,
  popular = false,
  comingSoon = false,
}) => {
  return (
    <Link
      to={to}
      className={`group relative flex h-full flex-col overflow-hidden rounded-lg border bg-white p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md dark:bg-dark-surface md:p-5 ${
        comingSoon
          ? 'border-indigo-200/70 bg-gradient-to-b from-white to-indigo-50/20 dark:border-indigo-900/40 dark:from-dark-surface dark:to-indigo-950/20'
          : popular
            ? 'border-primary-200 dark:border-primary-800'
            : 'border-slate-200 dark:border-dark-border'
      }`}
    >
      {comingSoon ? (
        <div className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300 md:right-4 md:top-4">
          <Sparkles className="h-3 w-3 text-indigo-500" />
          <span>Coming Soon</span>
        </div>
      ) : popular ? (
        <div className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-primary-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-primary-600 md:right-4 md:top-4">
          <Zap className="h-3 w-3 fill-current" />
          <span className="hidden md:inline">Popular</span>
        </div>
      ) : null}

      <div
        className={`mb-3 inline-flex rounded-lg p-2.5 transition-colors md:mb-5 md:p-3 ${
          comingSoon
            ? 'bg-indigo-50 text-indigo-500 dark:bg-indigo-950 dark:text-indigo-400'
            : popular
              ? 'bg-primary-50 text-primary-500'
              : 'bg-slate-100 text-slate-600 group-hover:bg-primary-50 group-hover:text-primary-500'
        }`}
      >
        {icon}
      </div>

      <h3 className="mb-1 text-base font-bold text-slate-900 dark:text-dark-text-primary md:mb-2 md:text-xl">
        {title}
      </h3>
      <p className="mb-3 flex-grow text-xs leading-relaxed text-slate-500 line-clamp-2 dark:text-dark-text-secondary md:mb-6 md:text-sm md:line-clamp-none">
        {description}
      </p>

      <div className={`mt-auto flex items-center text-xs font-semibold md:text-sm ${
        comingSoon
          ? 'text-indigo-500 group-hover:text-indigo-600 dark:text-indigo-400'
          : 'text-primary-400 group-hover:text-primary-500'
      }`}>
        {comingSoon ? (
          <>
            Preview <span className="ml-1 hidden md:inline">Tool</span>
          </>
        ) : (
          <>
            Open <span className="ml-1 hidden md:inline">Tool</span>
          </>
        )}
        <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
};

