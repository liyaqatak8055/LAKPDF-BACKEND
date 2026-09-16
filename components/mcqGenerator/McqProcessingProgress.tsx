import React, { useEffect, useState } from 'react';
import {
  FileText,
  Binary,
  Brain,
  ListOrdered,
  CheckCircle2,
  ShieldCheck,
  Award,
  Loader2,
  Sparkles,
} from 'lucide-react';

interface McqProcessingProgressProps {
  currentStageIndex?: number; // 0 to 6
  fileName?: string;
  totalQuestionsRequested?: number;
}

interface StageInfo {
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STAGES: StageInfo[] = [
  {
    title: 'Reading PDF',
    desc: 'Parsing PDF structure, layout streams and text layers...',
    icon: FileText,
  },
  {
    title: 'Extracting content',
    desc: 'Isolating textual units, definitions, figures and tabular facts...',
    icon: Binary,
  },
  {
    title: 'Understanding topics',
    desc: 'Mapping key themes, terminology and semantic dependencies...',
    icon: Brain,
  },
  {
    title: 'Creating questions',
    desc: 'Formulating high-quality stems across the selected difficulty levels...',
    icon: ListOrdered,
  },
  {
    title: 'Checking answer options',
    desc: 'Synthesizing plausible distractors and calibrating choice clarity...',
    icon: CheckCircle2,
  },
  {
    title: 'Validating answers',
    desc: 'Strictly verifying that each key fact is directly grounded in the PDF...',
    icon: ShieldCheck,
  },
  {
    title: 'Preparing question paper',
    desc: 'Formatting paper layout, answer matrix, and pagination...',
    icon: Award,
  },
];

export const McqProcessingProgress: React.FC<McqProcessingProgressProps> = ({
  currentStageIndex: controlledStageIndex,
  fileName,
  totalQuestionsRequested = 20,
}) => {
  // If no external stage controller is supplied, simulate an authentic progression
  const [internalStage, setInternalStage] = useState(0);

  useEffect(() => {
    if (controlledStageIndex !== undefined) return;

    // Simulate steady progression through the 7 stages over ~14-18 seconds
    const intervals = [2200, 2600, 3000, 3500, 3200, 2800, 2000];
    let current = 0;
    let timer: NodeJS.Timeout;

    const advance = () => {
      if (current < STAGES.length - 1) {
        current += 1;
        setInternalStage(current);
        timer = setTimeout(advance, intervals[current] || 2500);
      }
    };

    timer = setTimeout(advance, intervals[0]);
    return () => clearTimeout(timer);
  }, [controlledStageIndex]);

  const activeStage = controlledStageIndex !== undefined ? controlledStageIndex : internalStage;
  const progressPercent = Math.min(
    100,
    Math.round(((activeStage + 1) / STAGES.length) * 100)
  );

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden p-6 md:p-10 max-w-2xl mx-auto my-8 transition-all">
      {/* Top Banner */}
      <div className="text-center mb-8">
        <div className="relative inline-flex items-center justify-center mb-4">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 p-0.5 shadow-xl shadow-emerald-500/30 animate-pulse">
            <div className="w-full h-full bg-white dark:bg-gray-950 rounded-[22px] flex items-center justify-center">
              <Sparkles className="w-9 h-9 text-emerald-600 dark:text-emerald-400 animate-spin" style={{ animationDuration: '8s' }} />
            </div>
          </div>
          <span className="absolute -bottom-1 -right-1 flex h-6 w-6">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-6 w-6 bg-emerald-500 items-center justify-center text-white text-[10px] font-bold">
              AI
            </span>
          </span>
        </div>

        <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
          Generating Practice Question Paper
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5 max-w-md mx-auto">
          Synthesizing <span className="font-semibold text-emerald-600 dark:text-emerald-400">{totalQuestionsRequested} grounded MCQs</span>
          {fileName ? ` from "${fileName}"` : ' from your uploaded document'}
        </p>
      </div>

      {/* Progress Bar & Percentage */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
          <span>Processing Pipeline</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">{progressPercent}%</span>
        </div>
        <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden p-0.5">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-full transition-all duration-700 ease-out shadow-sm"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 7 Distinct Stages List */}
      <div className="space-y-3">
        {STAGES.map((stage, idx) => {
          const isDone = idx < activeStage;
          const isCurrent = idx === activeStage;
          const isPending = idx > activeStage;
          const Icon = stage.icon;

          return (
            <div
              key={stage.title}
              className={`flex items-start gap-4 p-3.5 rounded-2xl border transition-all duration-300 ${
                isCurrent
                  ? 'bg-gradient-to-r from-emerald-50/90 to-teal-50/50 dark:from-emerald-950/40 dark:to-teal-950/20 border-emerald-500/80 shadow-md ring-1 ring-emerald-500/20 scale-[1.01]'
                  : isDone
                  ? 'bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-200/50 dark:border-emerald-900/40 opacity-90'
                  : 'bg-gray-50/50 dark:bg-gray-900/40 border-gray-100 dark:border-gray-800/60 opacity-40'
              }`}
            >
              {/* Status Icon */}
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                  isCurrent
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                    : isDone
                    ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                }`}
              >
                {isCurrent ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isDone ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>

              {/* Stage Description */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4
                    className={`text-sm font-bold ${
                      isCurrent
                        ? 'text-emerald-900 dark:text-emerald-300'
                        : isDone
                        ? 'text-gray-800 dark:text-gray-200'
                        : 'text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    {stage.title}
                  </h4>
                  <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    {idx + 1} / {STAGES.length}
                  </span>
                </div>
                <p
                  className={`text-xs mt-0.5 line-clamp-1 ${
                    isCurrent
                      ? 'text-emerald-700 dark:text-emerald-400/90 font-medium'
                      : isDone
                      ? 'text-gray-500 dark:text-gray-400'
                      : 'text-gray-400 dark:text-gray-600'
                  }`}
                >
                  {stage.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Helpful Guarantee Note */}
      <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800 text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <span>Verifying question balance, correct answer accuracy & distractor independence</span>
        </p>
      </div>
    </div>
  );
};
