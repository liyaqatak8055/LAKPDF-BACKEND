import React, { useState } from 'react';
import {
  FileText,
  FileDown,
  RotateCcw,
  Eye,
  EyeOff,
  Edit3,
  Trash2,
  CheckCircle2,
  HelpCircle,
  School,
  Clock,
  Award,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { MCQPaper, MCQItem, McqPdfExportOptions } from './types';
import { McqQuestionEditorModal } from './McqQuestionEditorModal';
import { McqPdfExportModal } from './McqPdfExportModal';

interface McqPaperPreviewProps {
  paper: MCQPaper;
  onUpdatePaper: (updatedPaper: MCQPaper) => void;
  onGenerateAgain: () => void;
  onExportPdf: (options: McqPdfExportOptions) => Promise<void>;
  isExportingPdf?: boolean;
}

export const McqPaperPreview: React.FC<McqPaperPreviewProps> = ({
  paper,
  onUpdatePaper,
  onGenerateAgain,
  onExportPdf,
  isExportingPdf = false,
}) => {
  // Modes: 'student' (answers hidden) vs 'teacher' (answers and explanations highlighted)
  const [viewMode, setViewMode] = useState<'student' | 'teacher'>('student');
  const [showAnswerKeyDrawer, setShowAnswerKeyDrawer] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Student test interaction: allow student to pick options on screen to practice!
  const [userSelections, setUserSelections] = useState<Record<number, string>>({});

  const handleSelectOption = (qIdx: number, optionId: string) => {
    if (viewMode === 'teacher') return;
    setUserSelections((prev) => ({
      ...prev,
      [qIdx]: prev[qIdx] === optionId ? '' : optionId,
    }));
  };

  const handleDeleteQuestion = (idxToDelete: number) => {
    if (!window.confirm(`Delete question #${idxToDelete + 1}?`)) return;
    const updated = paper.questions.filter((_, idx) => idx !== idxToDelete);
    onUpdatePaper({
      ...paper,
      questions: updated,
      total_questions: updated.length,
      totalQuestions: updated.length,
    });
  };

  const handleSaveQuestion = (updatedQ: MCQItem) => {
    if (editingIndex === null) return;
    const updatedQuestions = [...paper.questions];
    updatedQuestions[editingIndex] = updatedQ;
    onUpdatePaper({
      ...paper,
      questions: updatedQuestions,
    });
  };

  const totalCount = paper.questions.length;
  const answeredCount = Object.values(userSelections).filter(Boolean).length;
  const correctCount = paper.questions.reduce((acc, q, idx) => {
    const key = q.correctOption || q.correctOptionId;
    return userSelections[idx] === key ? acc + 1 : acc;
  }, 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto transition-all animate-in fade-in duration-300">
      {/* Top Action Bar */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-4 md:p-6 border border-gray-200 dark:border-gray-800 shadow-xl flex flex-wrap items-center justify-between gap-4 sticky top-4 z-20 backdrop-blur-md bg-white/95 dark:bg-gray-900/95">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-gray-900 dark:text-white text-base">
                Question Paper Preview
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/70 dark:text-emerald-300">
                {totalCount} Questions
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {viewMode === 'student'
                ? 'Student Exam Mode: Answers hidden for practice'
                : 'Teacher Review Mode: Answers & explanations revealed'}
            </p>
          </div>
        </div>

        {/* View Mode Toggle & Primary Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Mode Switcher */}
          <div className="flex items-center p-1 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('student')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'student'
                  ? 'bg-white dark:bg-gray-900 text-emerald-700 dark:text-emerald-300 shadow-sm font-bold'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Student View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('teacher')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'teacher'
                  ? 'bg-white dark:bg-gray-900 text-emerald-700 dark:text-emerald-300 shadow-sm font-bold'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Teacher View</span>
            </button>
          </div>

          {/* Answer Key Sheet Toggle */}
          <button
            type="button"
            onClick={() => setShowAnswerKeyDrawer(!showAnswerKeyDrawer)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-all"
          >
            <span>Answer Key</span>
            {showAnswerKeyDrawer ? (
              <ChevronUp className="w-3.5 h-3.5 text-gray-500" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
            )}
          </button>

          {/* Generate Again button */}
          <button
            type="button"
            onClick={onGenerateAgain}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-all"
            title="Re-generate questions from same PDF"
          >
            <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
            <span>Generate Again</span>
          </button>

          {/* Primary Export Button */}
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/25 transition-all hover:scale-[1.02]"
          >
            <FileDown className="w-4 h-4" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* Answer Key Drawer / Accordion */}
      {showAnswerKeyDrawer && (
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border-2 border-emerald-500/30 dark:border-emerald-500/20 shadow-xl animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Master Answer Key Matrix
              </h3>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Total {totalCount} Items
            </span>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2.5">
            {paper.questions.map((q, idx) => (
              <div
                key={q.id || idx}
                className="p-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 text-center"
              >
                <div className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                  Q{idx + 1}
                </div>
                <div className="text-sm font-black text-emerald-700 dark:text-emerald-400">
                  {q.correctOption || q.correctOptionId}
                </div>
              </div>
            ))}
          </div>

          {answeredCount > 0 && viewMode === 'student' && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400">
                Practice Score: <strong>{correctCount} / {answeredCount}</strong> answered correctly ({Math.round((correctCount / answeredCount) * 100)}%)
              </span>
              <button
                type="button"
                onClick={() => setUserSelections({})}
                className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
              >
                Reset My Answers
              </button>
            </div>
          )}
        </div>
      )}

      {/* The Authentic Examination Paper Container */}
      <div className="bg-white dark:bg-gray-950 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden print:border-none print:shadow-none">
        {/* Paper Header / Title Block */}
        <div className="p-8 border-b-2 border-dashed border-gray-200 dark:border-gray-800 text-center relative bg-gray-50/40 dark:bg-gray-900/30">
          {paper.schoolName ? (
            <div className="text-sm md:text-base font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400 mb-1 flex items-center justify-center gap-2">
              <School className="w-4 h-4" />
              {paper.schoolName}
            </div>
          ) : (
            <div className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">
              LAKPDF Examination Suite
            </div>
          )}

          <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            {paper.title || 'Practice Question Paper'}
          </h1>

          <div className="flex flex-wrap items-center justify-center gap-6 mt-4 text-xs font-semibold text-gray-600 dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Time Allowed: {paper.timeAllowedMinutes || Math.round(totalCount * 1.5)} Minutes
            </span>
            <span className="flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              Maximum Marks: {totalCount} Marks (1 Mark each)
            </span>
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              Total Questions: {totalCount}
            </span>
          </div>

          {/* Student Fill-in Box (Authentic Exam Appearance) */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-xs text-left">
            <div>
              <span className="font-bold text-gray-500 dark:text-gray-400 uppercase text-[10px] block">
                Candidate Name
              </span>
              <div className="h-5 border-b border-gray-300 dark:border-gray-700 mt-1"></div>
            </div>
            <div>
              <span className="font-bold text-gray-500 dark:text-gray-400 uppercase text-[10px] block">
                Roll / ID Number
              </span>
              <div className="h-5 border-b border-gray-300 dark:border-gray-700 mt-1"></div>
            </div>
            <div>
              <span className="font-bold text-gray-500 dark:text-gray-400 uppercase text-[10px] block">
                Date / Room
              </span>
              <div className="h-5 border-b border-gray-300 dark:border-gray-700 mt-1"></div>
            </div>
          </div>

          {/* Exam Instructions */}
          <div className="mt-4 text-left p-3 rounded-xl bg-gray-100/60 dark:bg-gray-800/50 text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">
            <strong className="text-gray-800 dark:text-gray-200">General Instructions:</strong> Each question has multiple choice options with exactly one correct answer. No negative marking unless otherwise instructed. Select the most accurate choice.
          </div>
        </div>

        {/* SECTION A: Questions */}
        <div className="p-6 md:p-10 space-y-8">
          <div className="flex items-center justify-between border-b pb-2 border-gray-200 dark:border-gray-800">
            <h3 className="font-black text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">
              SECTION A — MULTIPLE CHOICE QUESTIONS
            </h3>
            <span className="text-xs font-semibold text-gray-400">
              [1 mark each]
            </span>
          </div>

          {paper.questions.map((question, qIdx) => {
            const isAnswered = Boolean(userSelections[qIdx]);
            const correctKey = question.correctOption || question.correctOptionId;
            const revealAnswer = viewMode === 'teacher';

            // Extract available options
            const optionKeys = ['A', 'B', 'C', 'D', 'E'].filter(
              (k) => question.options && question.options[k] !== undefined && question.options[k] !== ''
            );

            return (
              <div
                key={question.id || qIdx}
                className="group relative p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 hover:border-emerald-400/50 dark:hover:border-emerald-500/40 bg-white dark:bg-gray-900/60 transition-all"
              >
                {/* Question Header & Edit/Delete Toolbar */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5 border border-emerald-200/60 dark:border-emerald-800/60">
                      {qIdx + 1}
                    </span>
                    <p className="font-bold text-gray-900 dark:text-gray-100 text-sm md:text-base leading-snug">
                      {question.question}
                    </p>
                  </div>

                  {/* Per-question quick actions */}
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => setEditingIndex(qIdx)}
                      title="Edit question & options"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(qIdx)}
                      title="Delete question"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Options list */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 ml-0 sm:ml-10">
                  {optionKeys.map((key) => {
                    const optionText = question.options[key] || '';
                    const isSelected = userSelections[qIdx] === key;
                    const isKeyAnswer = key === correctKey;

                    let optStyle = 'bg-gray-50/70 dark:bg-gray-800/40 border-gray-200/70 dark:border-gray-800 text-gray-800 dark:text-gray-200 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20';

                    if (revealAnswer) {
                      if (isKeyAnswer) {
                        optStyle = 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 dark:border-emerald-500 font-semibold text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500/30';
                      }
                    } else if (isSelected) {
                      optStyle = 'bg-emerald-50/80 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-semibold ring-1 ring-emerald-400/40';
                    }

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleSelectOption(qIdx, key)}
                        className={`flex items-start gap-3 p-3 rounded-xl border text-left text-xs transition-all ${optStyle}`}
                      >
                        <span
                          className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center flex-shrink-0 transition-colors ${
                            revealAnswer && isKeyAnswer
                              ? 'bg-emerald-600 text-white'
                              : isSelected
                              ? 'bg-emerald-600 text-white'
                              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-700'
                          }`}
                        >
                          {key}
                        </span>
                        <span className="flex-1 mt-0.5 leading-relaxed">{optionText}</span>
                        {revealAnswer && isKeyAnswer && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation / Rationale (visible in Teacher mode) */}
                {revealAnswer && question.explanation && (
                  <div className="mt-3.5 ml-0 sm:ml-10 p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2 animate-in fade-in">
                    <HelpCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <div>
                      <strong className="font-bold">Correct Answer: Option {correctKey}</strong>
                      <p className="mt-0.5 text-[11px] leading-relaxed opacity-95">
                        {question.explanation}
                      </p>
                    </div>
                  </div>
                )}

                {/* Topic Pill */}
                {question.topic && (
                  <div className="mt-2.5 ml-0 sm:ml-10 flex items-center gap-1 text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                    <span>Topic:</span>
                    <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                      {question.topic}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Question Editor Modal */}
      {editingIndex !== null && paper.questions[editingIndex] && (
        <McqQuestionEditorModal
          question={paper.questions[editingIndex]}
          questionIndex={editingIndex}
          isOpen={editingIndex !== null}
          onClose={() => setEditingIndex(null)}
          onSave={handleSaveQuestion}
        />
      )}

      {/* PDF Export Modal */}
      {isExportModalOpen && (
        <McqPdfExportModal
          paper={paper}
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          onExport={onExportPdf}
          isExporting={isExportingPdf}
        />
      )}
    </div>
  );
};
