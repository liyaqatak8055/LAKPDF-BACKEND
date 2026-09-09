import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Zap, Sparkles } from 'lucide-react';
import { ToolStoryAnimation } from './ToolStoryAnimation';

interface ToolCardProps {
  title: string;
  description: string;
  to: string;
  icon: React.ReactNode;
  popular?: boolean;
  comingSoon?: boolean;
}

const TOOL_THEMES: Record<string, { gradient: string; shadow: string; accent: string }> = {
  '/merge': {
    gradient: 'from-blue-500 via-blue-600 to-indigo-600',
    shadow: 'shadow-blue-500/25',
    accent: 'text-blue-500',
  },
  '/split': {
    gradient: 'from-rose-500 via-pink-500 to-orange-500',
    shadow: 'shadow-rose-500/25',
    accent: 'text-rose-500',
  },
  '/compress': {
    gradient: 'from-purple-500 via-purple-600 to-indigo-600',
    shadow: 'shadow-purple-500/25',
    accent: 'text-purple-500',
  },
  '/organize-pdf': {
    gradient: 'from-amber-500 via-orange-500 to-red-500',
    shadow: 'shadow-amber-500/25',
    accent: 'text-amber-500',
  },
  '/img-to-pdf': {
    gradient: 'from-pink-500 via-rose-500 to-red-500',
    shadow: 'shadow-pink-500/25',
    accent: 'text-pink-500',
  },
  '/pdf-to-img': {
    gradient: 'from-indigo-500 via-blue-500 to-cyan-500',
    shadow: 'shadow-indigo-500/25',
    accent: 'text-indigo-500',
  },
  '/compress-img': {
    gradient: 'from-teal-500 via-emerald-500 to-cyan-500',
    shadow: 'shadow-teal-500/25',
    accent: 'text-teal-500',
  },
  '/advance-compress-img': {
    gradient: 'from-cyan-500 via-sky-500 to-blue-600',
    shadow: 'shadow-cyan-500/25',
    accent: 'text-cyan-500',
  },
  '/convert': {
    gradient: 'from-amber-500 via-yellow-500 to-orange-500',
    shadow: 'shadow-amber-500/25',
    accent: 'text-amber-500',
  },
  '/pdf-to-word': {
    gradient: 'from-blue-600 via-sky-500 to-cyan-500',
    shadow: 'shadow-blue-600/25',
    accent: 'text-blue-500',
  },
  '/pdf-to-powerpoint': {
    gradient: 'from-red-500 via-rose-500 to-orange-500',
    shadow: 'shadow-red-500/25',
    accent: 'text-red-500',
  },
  '/word-to-pdf': {
    gradient: 'from-blue-500 via-indigo-500 to-purple-600',
    shadow: 'shadow-blue-500/25',
    accent: 'text-blue-500',
  },
  '/powerpoint-to-pdf': {
    gradient: 'from-orange-500 via-amber-500 to-rose-600',
    shadow: 'shadow-orange-500/25',
    accent: 'text-orange-500',
  },
  '/rotate': {
    gradient: 'from-amber-500 via-orange-400 to-yellow-500',
    shadow: 'shadow-amber-500/25',
    accent: 'text-amber-500',
  },
  '/page-number': {
    gradient: 'from-fuchsia-500 via-pink-500 to-rose-500',
    shadow: 'shadow-fuchsia-500/25',
    accent: 'text-fuchsia-500',
  },
  '/watermark': {
    gradient: 'from-teal-500 via-cyan-500 to-emerald-600',
    shadow: 'shadow-teal-500/25',
    accent: 'text-teal-500',
  },
  '/crop-pdf': {
    gradient: 'from-cyan-500 via-teal-500 to-blue-500',
    shadow: 'shadow-cyan-500/25',
    accent: 'text-cyan-500',
  },
  '/scan-pdf': {
    gradient: 'from-emerald-500 via-teal-500 to-green-600',
    shadow: 'shadow-emerald-500/25',
    accent: 'text-emerald-500',
  },
  '/sign-pdf': {
    gradient: 'from-emerald-500 via-teal-600 to-cyan-600',
    shadow: 'shadow-emerald-500/25',
    accent: 'text-emerald-500',
  },
  '/ocr-pdf': {
    gradient: 'from-violet-500 via-purple-500 to-indigo-600',
    shadow: 'shadow-violet-500/25',
    accent: 'text-violet-500',
  },
  '/compare-pdf': {
    gradient: 'from-blue-500 via-indigo-500 to-purple-600',
    shadow: 'shadow-blue-500/25',
    accent: 'text-blue-500',
  },
  '/delete-page': {
    gradient: 'from-rose-500 via-red-500 to-orange-600',
    shadow: 'shadow-rose-500/25',
    accent: 'text-rose-500',
  },
  '/summarizer-qa': {
    gradient: 'from-purple-600 via-pink-600 to-rose-500',
    shadow: 'shadow-pink-500/30',
    accent: 'text-pink-500',
  },
  '/detect-duplicates': {
    gradient: 'from-indigo-500 via-purple-500 to-blue-600',
    shadow: 'shadow-indigo-500/25',
    accent: 'text-indigo-500',
  },
  '/ai-pdf-to-mcq': {
    gradient: 'from-amber-500 via-orange-500 to-rose-500',
    shadow: 'shadow-amber-500/30',
    accent: 'text-amber-500',
  },
  '/pdf-editor': {
    gradient: 'from-fuchsia-500 via-purple-500 to-indigo-600',
    shadow: 'shadow-fuchsia-500/25',
    accent: 'text-fuchsia-500',
  },
  '/ai-interview-generator': {
    gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
    shadow: 'shadow-emerald-500/30',
    accent: 'text-emerald-500',
  },
};

export const ToolCard: React.FC<ToolCardProps> = ({
  title,
  description,
  to,
  icon,
  popular = false,
  comingSoon = false,
}) => {
  const theme = TOOL_THEMES[to] || {
    gradient: 'from-primary-500 to-rose-600',
    shadow: 'shadow-primary-500/25',
    accent: 'text-primary-500',
  };

  return (
    <Link
      to={to}
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-white p-3.5 transition-transform transition-shadow duration-200 ease-out hover:-translate-y-1.5 hover:shadow-xl dark:bg-dark-surface md:p-5 water-tank-card tool-card-grid-item ${comingSoon
          ? 'border-indigo-200/70 bg-gradient-to-b from-white to-indigo-50/20 hover:border-indigo-400 hover:shadow-indigo-100/50 dark:border-indigo-900/40 dark:from-dark-surface dark:to-indigo-950/20'
          : popular
            ? 'border-primary-200/80 hover:border-primary-400 hover:shadow-primary-100/50 dark:border-primary-800'
            : 'border-slate-200/90 hover:border-sky-300 hover:shadow-sky-100/50 dark:border-dark-border dark:hover:border-sky-700/50'
        }`}
    >
      {/* ── Water Tank Dynamic Liquid ── */}
      <div className="water-tank-body" aria-hidden="true">
        <div className="water-wave-layer-3" />
        <div className="water-wave-layer-2" />
        <div className="water-wave-layer-1" />
        <div className="water-surface-highlight" />
        <div className="water-bubble water-bubble-1" />
        <div className="water-bubble water-bubble-2" />
        <div className="water-bubble water-bubble-3" />
        <div className="water-bubble water-bubble-4" />
      </div>

      {/* ── Micro-Story Transformation Animation on Water ── */}
      <ToolStoryAnimation toolId={to} />

      <div className="relative z-10 flex h-full flex-col">
        {comingSoon ? (
          <div className="absolute right-0 top-0 flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            <Sparkles className="h-3 w-3 text-indigo-700 dark:text-indigo-300" />
            <span>Coming Soon</span>
          </div>
        ) : popular ? (
          <div className="absolute right-0 top-0 flex items-center gap-1 rounded-md bg-primary-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-primary-700 dark:bg-primary-950/50 dark:text-primary-300">
            <Zap className="h-3 w-3 fill-current text-primary-700 dark:text-primary-300" />
            <span className="hidden md:inline">Popular</span>
          </div>
        ) : null}

        {/* ── Modern Premium 3D-Gradient Icon Box ── */}
        <div
          className={`mb-3 inline-flex w-fit items-center justify-center rounded-2xl p-2.5 sm:p-3 text-white bg-gradient-to-br ${theme.gradient} shadow-md ${theme.shadow} transition-all duration-300 group-hover:scale-110 group-hover:-rotate-3 group-hover:shadow-lg md:mb-4`}
        >
          <div className="h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center text-white">
            {icon}
          </div>
        </div>

        <h3 className="mb-1 text-sm font-bold text-slate-900 transition-colors group-hover:text-primary-600 dark:text-dark-text-primary dark:group-hover:text-primary-400 md:mb-2 md:text-base lg:text-lg">
          {title}
        </h3>
        <p className="mb-3 flex-grow text-xs leading-relaxed text-slate-600 line-clamp-2 dark:text-slate-300 md:mb-4 md:text-sm md:line-clamp-none">
          {description}
        </p>

        <div className={`mt-auto flex items-center text-xs font-semibold md:text-sm ${comingSoon
            ? 'text-indigo-500 group-hover:text-indigo-600 dark:text-indigo-400'
            : 'text-primary-500 group-hover:text-primary-600 dark:text-primary-400'
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
          <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
};

