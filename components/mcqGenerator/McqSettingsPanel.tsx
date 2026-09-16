import React from 'react';
import {
  Sparkles,
  Sliders,
  FileText,
  School,
  Globe,
  Gauge,
  ListOrdered,
  Layers,
  ArrowRight,
  RotateCcw,
  Info,
  CheckCircle2,
} from 'lucide-react';
import type { McqFormSettings, McqDifficulty, McqLanguage, McqOptionCount } from './types';

interface McqSettingsPanelProps {
  settings: McqFormSettings;
  onChange: (settings: McqFormSettings) => void;
  onGenerate: () => void;
  disabled?: boolean;
  fileName?: string;
  extractedWordCount?: number;
  onResetDoc?: () => void;
}

const PRESET_COUNTS: number[] = [10, 20, 30, 50];

const DIFFICULTIES: { id: McqDifficulty; label: string; desc: string; badge?: string }[] = [
  { id: 'mixed', label: 'Balanced Mix', desc: 'Optimal blend of easy, medium, and challenging questions', badge: 'Recommended' },
  { id: 'easy', label: 'Fundamental', desc: 'Direct recall, terminology, key facts & definitions' },
  { id: 'medium', label: 'Conceptual', desc: 'Application, reasoning, and multi-concept comprehension' },
  { id: 'hard', label: 'Advanced / Analytical', desc: 'Critical thinking, complex analysis & inference' },
];

const LANGUAGES: { id: McqLanguage; label: string; sub: string; flag: string }[] = [
  { id: 'en', label: 'English', sub: 'Standard Academic', flag: '🇬🇧' },
  { id: 'hi', label: 'हिंदी (Hindi)', sub: 'शुद्ध देवनागरी लिपि', flag: '🇮🇳' },
  { id: 'hinglish', label: 'Hinglish', sub: 'Bilingual / Conversational', flag: '🇮🇳' },
];

export const McqSettingsPanel: React.FC<McqSettingsPanelProps> = ({
  settings,
  onChange,
  onGenerate,
  disabled = false,
  fileName,
  extractedWordCount,
  onResetDoc,
}) => {
  const update = <K extends keyof McqFormSettings>(key: K, value: McqFormSettings[K]) => {
    onChange({
      ...settings,
      [key]: value,
    });
  };

  const effectiveCount = settings.questionCount === 'custom'
    ? (settings.customCount || 20)
    : settings.questionCount;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden transition-all">
      {/* Header with Document Badge */}
      <div className="p-6 md:p-8 bg-gradient-to-r from-emerald-50 via-teal-50/40 to-cyan-50/30 dark:from-emerald-950/30 dark:via-gray-900 dark:to-teal-950/20 border-b border-gray-200/80 dark:border-gray-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                Paper Configuration
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                  Step 2 of 4
                </span>
              </h2>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                Tailor questions, difficulty distribution, and paper layout
              </p>
            </div>
          </div>

          {fileName && (
            <div className="flex items-center gap-2.5 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm">
              <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <div className="text-xs">
                <span className="font-semibold text-gray-800 dark:text-gray-200 block truncate max-w-[200px]" title={fileName}>
                  {fileName}
                </span>
                {extractedWordCount !== undefined && (
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                    ~{extractedWordCount.toLocaleString()} words extracted
                  </span>
                )}
              </div>
              {onResetDoc && (
                <button
                  type="button"
                  onClick={onResetDoc}
                  title="Change Document"
                  className="ml-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Settings Grid */}
      <div className="p-6 md:p-8 space-y-8">
        {/* 1. Question Count Selection */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ListOrdered className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Number of Questions
            </label>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
              Selected: {effectiveCount} Questions
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {PRESET_COUNTS.map((count) => {
              const isSelected = settings.questionCount === count;
              return (
                <button
                  key={count}
                  type="button"
                  onClick={() => update('questionCount', count)}
                  className={`relative p-3.5 rounded-2xl border text-center font-bold transition-all ${
                    isSelected
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-transparent shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-400/40 scale-[1.02]'
                      : 'bg-gray-50 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700/80 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-gray-300'
                  }`}
                >
                  <div className="text-lg leading-none">{count}</div>
                  <div className={`text-[11px] font-medium mt-1 ${isSelected ? 'text-emerald-100' : 'text-gray-500 dark:text-gray-400'}`}>
                    Questions
                  </div>
                  {count === 20 && (
                    <span className={`absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                      isSelected
                        ? 'bg-white text-emerald-800 shadow-sm'
                        : 'bg-emerald-500 text-white'
                    }`}>
                      Ideal
                    </span>
                  )}
                </button>
              );
            })}

            {/* Custom Count Pill */}
            <div
              onClick={() => update('questionCount', 'custom')}
              className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                settings.questionCount === 'custom'
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-500 ring-2 ring-emerald-400/30'
                  : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700/80 hover:border-gray-300'
              }`}
            >
              <div className="text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                Custom
              </div>
              <input
                type="number"
                min={5}
                max={100}
                placeholder="5-100"
                value={settings.customCount ?? ''}
                onChange={(e) => {
                  update('questionCount', 'custom');
                  update('customCount', parseInt(e.target.value, 10) || 20);
                }}
                className="w-full text-center text-sm font-bold bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg py-1 px-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* 2. Difficulty Level */}
        <div>
          <label className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
            <Gauge className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Difficulty Level
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {DIFFICULTIES.map((diff) => {
              const isSelected = settings.difficulty === diff.id;
              return (
                <button
                  key={diff.id}
                  type="button"
                  onClick={() => update('difficulty', diff.id)}
                  className={`relative text-left p-4 rounded-2xl border transition-all ${
                    isSelected
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-500 dark:border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
                      : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/80 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-sm text-gray-900 dark:text-white">
                      {diff.label}
                    </span>
                    {diff.badge && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500 text-white">
                        {diff.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                    {diff.desc}
                  </p>
                  {isSelected && (
                    <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Active</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Options per Question & Language */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Options per Question */}
          <div>
            <label className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Options per Question
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => update('optionCount', 4)}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  settings.optionCount === 4
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/80 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-gray-900 dark:text-white">4 Options</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    A – D
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Standard School, CBSE, College & Board exams
                </p>
              </button>

              <button
                type="button"
                onClick={() => update('optionCount', 5)}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  settings.optionCount === 5
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/80 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-gray-900 dark:text-white">5 Options</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                    A – E
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Banking (IBPS), UPSC, CAT & GRE competitive style
                </p>
              </button>
            </div>
          </div>

          {/* Target Language */}
          <div>
            <label className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
              <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Paper Language
            </label>
            <div className="grid grid-cols-3 gap-2">
              {LANGUAGES.map((lang) => {
                const isSelected = settings.language === lang.id;
                return (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => update('language', lang.id)}
                    className={`p-3 rounded-2xl border text-center transition-all ${
                      isSelected
                        ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-500 ring-2 ring-emerald-500/20'
                        : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/80 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <span className="text-lg block mb-0.5">{lang.flag}</span>
                    <span className="font-bold text-xs text-gray-900 dark:text-white block">
                      {lang.label}
                    </span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 block mt-0.5 truncate">
                      {lang.sub}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 4. Optional Customizations: Topic Focus & School / Institution */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100 dark:border-gray-800">
          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Topic Focus (Optional)
            </label>
            <input
              type="text"
              value={settings.topicFocus}
              onChange={(e) => update('topicFocus', e.target.value)}
              placeholder="e.g. Chapter 4: Cell Division, Monetary Policy"
              className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-gray-900 transition-all"
            />
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
              Leave blank to cover all chapters evenly across the PDF.
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 mb-1.5">
              <School className="w-3.5 h-3.5 text-blue-500" />
              Institution / Exam Header (Optional)
            </label>
            <input
              type="text"
              value={settings.schoolName}
              onChange={(e) => update('schoolName', e.target.value)}
              placeholder="e.g. Delhi Public School • Mid-Term Assessment"
              className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-gray-900 transition-all"
            />
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
              Will appear on the printed PDF test paper header.
            </p>
          </div>
        </div>

        {/* Informative Notice */}
        <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 text-xs">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <p>
            <strong className="font-semibold">Strict Fact Grounding:</strong> Questions are synthesized solely from the uploaded document text. Outside facts and unverified claims are rejected during our automated AI validation step.
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onGenerate}
            disabled={disabled}
            className="w-full group relative flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:via-teal-500 hover:to-cyan-500 text-white font-bold text-base shadow-xl shadow-emerald-600/25 hover:shadow-emerald-500/35 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0"
          >
            <Sparkles className="w-5 h-5 text-emerald-200 group-hover:rotate-12 transition-transform" />
            <span>Generate {effectiveCount} Practice Questions</span>
            <ArrowRight className="w-5 h-5 text-white/80 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};
