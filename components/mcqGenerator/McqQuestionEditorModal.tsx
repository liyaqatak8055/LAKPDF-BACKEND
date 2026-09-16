import React, { useState } from 'react';
import { X, Check, Edit3, HelpCircle, CheckCircle2 } from 'lucide-react';
import type { MCQItem } from './types';

interface McqQuestionEditorModalProps {
  question: MCQItem;
  questionIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedQuestion: MCQItem) => void;
}

export const McqQuestionEditorModal: React.FC<McqQuestionEditorModalProps> = ({
  question,
  questionIndex,
  isOpen,
  onClose,
  onSave,
}) => {
  const [editedQuestion, setEditedQuestion] = useState<string>(question.question);

  // Extract keys from question.options
  const optionKeys = ['A', 'B', 'C', 'D', 'E'].filter(
    (k) => question.options && question.options[k] !== undefined && question.options[k] !== ''
  );
  const initialKeys = optionKeys.length > 0 ? optionKeys : ['A', 'B', 'C', 'D'];

  const [editedOptions, setEditedOptions] = useState<{ id: string; text: string }[]>(
    initialKeys.map((k) => ({
      id: k,
      text: question.options ? (question.options[k] || '') : '',
    }))
  );

  const [correctOptionId, setCorrectOptionId] = useState<string>(
    question.correctOptionId || question.correctOption || 'A'
  );
  const [explanation, setExplanation] = useState<string>(question.explanation || '');
  const [topic, setTopic] = useState<string>(question.topic || '');

  if (!isOpen) return null;

  const handleOptionChange = (idx: number, text: string) => {
    const updated = [...editedOptions];
    updated[idx] = { ...updated[idx], text };
    setEditedOptions(updated);
  };

  const handleSave = () => {
    if (!editedQuestion.trim()) return;

    const optMap: { A: string; B: string; C: string; D: string; E?: string; [key: string]: string | undefined } = {
      A: editedOptions.find((o) => o.id === 'A')?.text || '',
      B: editedOptions.find((o) => o.id === 'B')?.text || '',
      C: editedOptions.find((o) => o.id === 'C')?.text || '',
      D: editedOptions.find((o) => o.id === 'D')?.text || '',
    };

    const optE = editedOptions.find((o) => o.id === 'E')?.text;
    if (optE) {
      optMap.E = optE;
    }

    onSave({
      ...question,
      question: editedQuestion.trim(),
      options: optMap,
      correctOption: correctOptionId,
      correctOptionId: correctOptionId,
      explanation: explanation.trim(),
      topic: topic.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-5 md:p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Edit Question {questionIndex + 1}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Modify wording, adjust options, or change the designated correct answer
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Question Text */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
              Question Prompt
            </label>
            <textarea
              rows={3}
              value={editedQuestion}
              onChange={(e) => setEditedQuestion(e.target.value)}
              className="w-full text-sm p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              placeholder="Enter the question text..."
            />
          </div>

          {/* Options List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Answer Options
              </label>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                Click circle to mark as correct answer
              </span>
            </div>

            <div className="space-y-2.5">
              {editedOptions.map((opt, idx) => {
                const isCorrect = correctOptionId === opt.id;
                return (
                  <div
                    key={opt.id}
                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                      isCorrect
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-500 ring-2 ring-emerald-400/20'
                        : 'bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/80'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setCorrectOptionId(opt.id)}
                      title={isCorrect ? 'Correct Answer' : 'Click to select as correct answer'}
                      className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center transition-all flex-shrink-0 ${
                        isCorrect
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-300'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-emerald-200 dark:hover:bg-emerald-900'
                      }`}
                    >
                      {opt.id}
                    </button>

                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      placeholder={`Option ${opt.id} text...`}
                      className="flex-1 text-sm bg-transparent text-gray-900 dark:text-white focus:outline-none placeholder-gray-400"
                    />

                    {isCorrect && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex-shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Correct
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Explanation */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
              Explanation / Rationale (Optional)
            </label>
            <textarea
              rows={2}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              className="w-full text-xs p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              placeholder="Why this answer is correct according to the text..."
            />
          </div>

          {/* Topic Tag */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
              Topic / Chapter (Optional)
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full text-xs p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              placeholder="e.g. Mitosis & Cytokinesis"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 md:p-5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3 bg-gray-50/50 dark:bg-gray-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition-all"
          >
            <Check className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
