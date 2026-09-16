import React from 'react';
import { Check, Loader2, Circle } from 'lucide-react';

export type ProcessingStage = 1 | 2 | 3 | 4 | 5 | 6;

interface ProcessingProgressProps {
  currentStage: ProcessingStage;
  stageName?: string;
}

const PHASES = [
  { step: 1, title: 'Uploading resume', desc: 'Securely receiving document payload' },
  { step: 2, title: 'Reading resume', desc: 'Extracting text and structure' },
  { step: 3, title: 'Identifying your profile', desc: 'Detecting role level and education' },
  { step: 4, title: 'Detecting skills & experience', desc: 'Validating frameworks, databases and tools' },
  { step: 5, title: 'Analyzing projects', desc: 'Structuring architectural deep dives' },
  { step: 6, title: 'Preparing interview questions', desc: 'Personalizing prioritized question kit' },
];

export const ProcessingProgress: React.FC<ProcessingProgressProps> = ({ currentStage }) => {
  return (
    <div className="max-w-2xl mx-auto my-8 p-6 sm:p-8 bg-white rounded-3xl border border-slate-200 shadow-sm animate-in fade-in">
      <div className="text-center mb-6">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 mb-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-600" />
          Analyzing Resume Facts
        </span>
        <h3 className="text-xl font-bold text-slate-900">Crafting Your Interview Plan</h3>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
          We extract only information present in your resume. No assumptions or generic placeholders.
        </p>
      </div>

      <div className="space-y-3">
        {PHASES.map((phase) => {
          const isDone = currentStage > phase.step;
          const isCurrent = currentStage === phase.step;
          const isPending = currentStage < phase.step;

          return (
            <div
              key={phase.step}
              className={`flex items-start gap-3.5 p-3 rounded-2xl transition-all duration-200 ${
                isCurrent
                  ? 'bg-rose-50/70 border border-rose-200 shadow-xs'
                  : isDone
                  ? 'bg-slate-50/60 border border-transparent'
                  : 'opacity-40'
              }`}
            >
              {/* Step indicator */}
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs transition-colors ${
                  isDone
                    ? 'bg-emerald-600 text-white'
                    : isCurrent
                    ? 'bg-primary-600 text-white animate-pulse'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {isDone ? (
                  <Check className="w-4 h-4" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Circle className="w-3 h-3" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p
                    className={`text-sm font-semibold ${
                      isCurrent ? 'text-primary-950 font-bold' : isDone ? 'text-slate-800' : 'text-slate-500'
                    }`}
                  >
                    {phase.title}
                  </p>
                  {isCurrent && (
                    <span className="text-[11px] font-semibold text-primary-600 uppercase tracking-wider">
                      In progress...
                    </span>
                  )}
                  {isDone && (
                    <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Verified
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{phase.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
