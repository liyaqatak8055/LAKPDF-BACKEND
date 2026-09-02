import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Rocket, ArrowRight, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import { Button } from './Button';

interface ComingSoonToolProps {
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  estimatedLaunch?: string;
  relatedTools?: Array<{ label: string; path: string }>;
}

export const ComingSoonTool: React.FC<ComingSoonToolProps> = ({
  title,
  subtitle,
  description,
  features,
  estimatedLaunch = "Coming in Next Major Update",
  relatedTools = [
    { label: "Merge PDF", path: "/merge" },
    { label: "Compress PDF", path: "/compress" },
    { label: "PDF to Word", path: "/pdf-to-word" },
    { label: "Sign PDF", path: "/sign-pdf" }
  ]
}) => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Glow Card */}
      <div className="relative overflow-hidden rounded-3xl border border-primary-200/60 bg-gradient-to-b from-white to-primary-50/30 p-8 md:p-12 shadow-xl shadow-primary-500/5 dark:border-primary-900/40 dark:from-slate-900 dark:to-slate-950">
        {/* Background Ambient Blur */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary-400/10 blur-3xl" />
        <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative z-10 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary-300 bg-primary-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary-700 dark:border-primary-800 dark:bg-primary-950/60 dark:text-primary-300">
            <Rocket className="h-4 w-4 animate-bounce text-primary-600 dark:text-primary-400" />
            <span>AI Feature — Coming Soon</span>
          </div>

          <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl md:text-5xl">
            {title}
          </h1>

          <p className="mt-3 text-lg font-medium text-primary-600 dark:text-primary-400">
            {subtitle}
          </p>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:text-base">
            {description}
          </p>

          {/* Timeline Pill */}
          <div className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>Status: <strong>Under Active Development</strong> • {estimatedLaunch}</span>
          </div>

          {/* Features Preview Box */}
          <div className="mt-10 rounded-2xl border border-slate-200 bg-white/80 p-6 text-left shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              What to Expect in this Tool
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {features.map((feat, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action CTAs */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to="/tools">
              <Button variant="primary" size="lg" className="w-full sm:w-auto">
                Explore Available Tools
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/compress">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                <Zap className="mr-2 h-4 w-4 text-amber-500" />
                Try Compress PDF (Free)
              </Button>
            </Link>
          </div>

          {/* Related ready tools */}
          <div className="mt-8 border-t border-slate-200/80 pt-6 dark:border-slate-800">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Popular 100% Free Tools you can use right now:
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {relatedTools.map((t, idx) => (
                <Link
                  key={idx}
                  to={t.path}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-primary-300 hover:text-primary-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-primary-700"
                >
                  {t.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Privacy Note */}
          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>100% Client-Side Privacy • No permanent document storage</span>
          </div>
        </div>
      </div>
    </div>
  );
};
