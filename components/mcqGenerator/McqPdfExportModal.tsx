import React, { useState } from 'react';
import {
  X,
  FileDown,
  CheckSquare,
  Square,
  FileText,
  School,
  Sparkles,
  HelpCircle,
  Loader2,
} from 'lucide-react';
import type { MCQPaper, McqPdfExportOptions } from './types';

interface McqPdfExportModalProps {
  paper: MCQPaper;
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: McqPdfExportOptions) => Promise<void>;
  isExporting?: boolean;
}

export const McqPdfExportModal: React.FC<McqPdfExportModalProps> = ({
  paper,
  isOpen,
  onClose,
  onExport,
  isExporting = false,
}) => {
  const [includeAnswerKey, setIncludeAnswerKey] = useState(true);
  const [includeExplanations, setIncludeExplanations] = useState(false);
  const [schoolName, setSchoolName] = useState(paper.schoolName || '');
  const [paperTitle, setPaperTitle] = useState(paper.title || 'Practice Examination Paper');

  if (!isOpen) return null;

  const handleDownload = async () => {
    await onExport({
      includeAnswerKey,
      includeExplanations,
      schoolName: schoolName.trim() || undefined,
      language: paper.language,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-emerald-50/60 to-teal-50/30 dark:from-emerald-950/30 dark:to-gray-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Export Question Paper PDF
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Configure layout and answer key visibility
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration Options */}
        <div className="p-6 space-y-5">
          {/* Paper Title */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-500" />
              Paper Title
            </label>
            <input
              type="text"
              value={paperTitle}
              onChange={(e) => setPaperTitle(e.target.value)}
              placeholder="e.g. Mid-Term Practice Assessment"
              className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Institution Name */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <School className="w-3.5 h-3.5 text-blue-500" />
              School / Institution Name
            </label>
            <input
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="e.g. Oxford Public School / Apex Academy"
              className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Checkboxes Card */}
          <div className="space-y-3 pt-2">
            {/* Answer Key Toggle */}
            <div
              onClick={() => setIncludeAnswerKey(!includeAnswerKey)}
              className="flex items-start gap-3 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60 cursor-pointer transition-colors"
            >
              <div className="mt-0.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                {includeAnswerKey ? (
                  <CheckSquare className="w-5 h-5" />
                ) : (
                  <Square className="w-5 h-5 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-gray-900 dark:text-white flex items-center justify-between">
                  <span>Include Answer Key Table</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Appended on a clean, separate final page at the end of the question paper so candidates cannot peek.
                </p>
              </div>
            </div>

            {/* Explanations Toggle */}
            <div
              onClick={() => setIncludeExplanations(!includeExplanations)}
              className="flex items-start gap-3 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60 cursor-pointer transition-colors"
            >
              <div className="mt-0.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                {includeExplanations ? (
                  <CheckSquare className="w-5 h-5" />
                ) : (
                  <Square className="w-5 h-5 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-gray-900 dark:text-white flex items-center justify-between">
                  <span>Include Detailed Explanations</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300">
                    Optional
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Adds full rationales and excerpt references below the answer key matrix. Ideal for self-study and teacher review.
                </p>
              </div>
            </div>
          </div>

          {/* Paper Structure Summary */}
          <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200/60 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <div className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              PDF Generation Blueprint:
            </div>
            <p>• {paper.questions?.length || paper.total_questions || 20} Questions with {paper.optionCount || 4} options formatted in A4 layout</p>
            <p>• Clean headers, candidate name/roll number fill boxes & marks</p>
            <p>• {includeAnswerKey ? 'Answer key isolated on the final page' : 'No answers printed (pure test mode)'}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3 bg-gray-50/50 dark:bg-gray-900/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={isExporting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4" />
                Download PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
