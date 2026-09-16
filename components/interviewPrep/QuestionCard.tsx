import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Send,
  Loader2,
  CheckCircle2,
  Circle,
  Sparkles,
  Star,
  Award,
  Lightbulb,
  Code2,
  FileText,
  TrendingUp,
} from 'lucide-react';
import { PrepQuestionItem, AnswerEvaluation } from './types';
import { Button } from '../Button';

interface QuestionCardProps {
  question: PrepQuestionItem;
  index: number;
  isPrepared: boolean;
  isSaved?: boolean;
  onTogglePrepared: (id: string) => void;
  onToggleSave?: (id: string) => void;
  onEvaluateAnswer?: (question: PrepQuestionItem, answer: string) => Promise<AnswerEvaluation>;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  index,
  isPrepared,
  isSaved = false,
  onTogglePrepared,
  onToggleSave,
  onEvaluateAnswer,
}) => {
  const [showAnswer, setShowAnswer] = useState(false);
  const [showFollowUps, setShowFollowUps] = useState(false);
  const [isPracticing, setIsPracticing] = useState(false);
  const [practiceAnswer, setPracticeAnswer] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<AnswerEvaluation | null>(null);

  const formattedNumber = `Question ${String(index + 1).padStart(2, '0')}`;

  // Normalized Difficulty
  const getDifficultyBadge = (difficulty?: string) => {
    const diff = (difficulty || 'medium').toLowerCase();
    if (diff === 'easy') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          Easy
        </span>
      );
    }
    if (diff === 'advanced' || diff === 'hard') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          Hard
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        Medium
      </span>
    );
  };

  // Normalized Category Label
  const getCategoryLabel = () => {
    const cat = (question.category || '').toLowerCase();
    if (cat.includes('cod') || question.source === 'coding') return 'Coding';
    if (cat.includes('project') || question.project_name || question.source === 'project') return 'Project';
    if (cat.includes('hr') || cat.includes('behavioral') || question.source === 'behavioral') return 'HR / Behavioral';
    return 'Technical';
  };

  // Normalized Evidence Badge (REPORTED / COMMON / ROLE-RELEVANT)
  const getEvidenceBadge = (type?: string) => {
    if (type === 'REPORTED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
          ● REPORTED
        </span>
      );
    }
    if (type === 'ROLE-RELEVANT') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
          ROLE-RELEVANT
        </span>
      );
    }
    if (type === 'COMMON') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
          COMMON
        </span>
      );
    }
    return null;
  };

  const categoryLabel = getCategoryLabel();
  const isCodingQuestion = categoryLabel === 'Coding';
  const followUps = question.follow_ups || [];
  const hasFollowUps = followUps.length > 0;

  // Determine if answer is document-based or general guidance
  const isDirectlyFromDocument =
    question.source === 'resume' ||
    question.source === 'project' ||
    Boolean(question.project_name);

  const handleEvaluate = async () => {
    if (!practiceAnswer.trim() || isEvaluating || !onEvaluateAnswer) return;
    setIsEvaluating(true);
    try {
      const evalResult = await onEvaluateAnswer(question, practiceAnswer);
      setEvaluation(evalResult);
      // Automatically mark as practiced when user successfully evaluates
      if (!isPrepared) {
        onTogglePrepared(question.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div
      className={`rounded-3xl border transition-all duration-200 p-5 sm:p-6 bg-white shadow-xs ${
        isSaved
          ? 'border-amber-300 ring-1 ring-amber-200 bg-amber-50/10'
          : isPrepared
          ? 'border-emerald-200 bg-emerald-50/10'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Top Meta Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-100">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-slate-500">
            {formattedNumber}
          </span>

          {/* Evidence Type Badge (REPORTED / COMMON / ROLE-RELEVANT) */}
          {getEvidenceBadge(question.evidenceType)}

          {/* Category Pill */}
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {categoryLabel}
          </span>

          {/* Subcategory if available */}
          {question.subcategory && (
            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-50 text-slate-600 border border-slate-200">
              {question.subcategory}
            </span>
          )}

          {/* Coding Language Badge */}
          {question.code_language && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Code2 className="w-3 h-3" />
              {question.code_language}
            </span>
          )}

          {/* Difficulty Badge */}
          {getDifficultyBadge(question.difficulty)}

          {/* Source Company Report if available */}
          {question.sourceReport?.company && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
              🏢 {question.sourceReport.company} {question.sourceReport.date ? `(${question.sourceReport.date})` : ''}
            </span>
          )}

          {/* Project association if present */}
          {question.project_name && (
            <span className="text-xs font-semibold text-slate-500 truncate max-w-[180px]">
              Project: {question.project_name}
            </span>
          )}
        </div>

        {/* Practiced & Save Toggle Actions */}
        <div className="flex items-center gap-2">
          {/* Save Button */}
          <button
            type="button"
            onClick={() => onToggleSave && onToggleSave(question.id)}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              isSaved
                ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
            title={isSaved ? 'Remove from saved' : 'Save question'}
          >
            <Star
              className={`w-3.5 h-3.5 ${
                isSaved ? 'text-amber-500 fill-amber-500' : 'text-slate-400'
              }`}
            />
            <span>{isSaved ? 'Saved' : 'Save'}</span>
          </button>

          {/* Practiced Toggle */}
          <button
            type="button"
            onClick={() => onTogglePrepared(question.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              isPrepared
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
            title={isPrepared ? 'Mark as Need Practice' : 'Mark as Practiced'}
          >
            {isPrepared ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" /> Practiced
              </>
            ) : (
              <>
                <Circle className="w-3.5 h-3.5 text-slate-400" /> Need Practice
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Question Text */}
      <h4 className="text-base sm:text-lg font-bold text-slate-900 leading-snug tracking-tight mb-3">
        {question.question}
      </h4>

      {/* Why they may ask / context / whyImportant */}
      {(question.whyImportant || question.why_ask) && (
        <div className="mb-3 p-3 rounded-2xl bg-slate-50 border border-slate-150 text-xs text-slate-700 flex items-start gap-2.5">
          <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-slate-900 font-semibold">
              {question.whyImportant ? 'Why it matters in interviews: ' : 'Why this question: '}
            </strong>
            <span>{question.whyImportant || question.why_ask}</span>
          </div>
        </div>
      )}

      {/* Action Buttons Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
        <div className="flex flex-wrap items-center gap-2">
          {/* Show Answer Toggle */}
          <button
            type="button"
            onClick={() => setShowAnswer(!showAnswer)}
            className={`text-xs font-bold px-3.5 py-1.5 rounded-xl border transition-colors flex items-center gap-1.5 ${
              showAnswer
                ? 'bg-primary-50 text-primary-800 border-primary-200'
                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-primary-600" />
            {showAnswer ? 'Hide Answer' : 'Show Answer'}
          </button>

          {/* Follow-up Toggle */}
          {hasFollowUps && (
            <button
              type="button"
              onClick={() => setShowFollowUps(!showFollowUps)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors flex items-center gap-1.5 ${
                showFollowUps
                  ? 'bg-purple-50 text-purple-900 border-purple-200'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
              }`}
            >
              Follow-up ({followUps.length})
              {showFollowUps ? (
                <ChevronUp className="w-3 h-3 text-purple-600" />
              ) : (
                <ChevronDown className="w-3 h-3 text-slate-400" />
              )}
            </button>
          )}
        </div>

        {/* Practice Button */}
        <button
          type="button"
          onClick={() => setIsPracticing(!isPracticing)}
          className={`text-xs font-bold px-3.5 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 ${
            isPracticing
              ? 'bg-rose-100 text-rose-900 border border-rose-200'
              : 'text-primary-700 hover:bg-rose-50 border border-rose-200 bg-white'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          {isPracticing ? 'Close Practice' : 'Practice'}
        </button>
      </div>

      {/* 5. Show Answer Expanded Section */}
      {showAnswer && (
        <div className="mt-4 p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 text-xs animate-in fade-in">
          {/* Document or General Guidance Indicator */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-600" />
              Expected Answer
            </span>
            {isDirectlyFromDocument ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                <FileText className="w-3 h-3" /> Based on document
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                <Lightbulb className="w-3 h-3" /> General interview guidance
              </span>
            )}
          </div>

          {/* Answer Text */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 text-slate-800 text-sm leading-relaxed whitespace-pre-line">
            {question.sample_answer?.answer ||
              'Formulate a structured response using specific examples from your projects and domain experience.'}
          </div>

          {/* Key Points */}
          {question.sample_answer?.key_points &&
            question.sample_answer.key_points.length > 0 && (
              <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-100 text-emerald-950">
                <span className="font-bold uppercase tracking-wider block mb-1.5 text-[11px] text-emerald-900">
                  Key Points
                </span>
                <ul className="space-y-1 text-slate-700">
                  {question.sample_answer.key_points.map((kp, kIdx) => (
                    <li key={kIdx} className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>{kp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

          {/* Interview Tip */}
          {(question.sample_answer?.better_approach ||
            question.sample_answer?.interview_tip) && (
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 text-blue-950 flex items-start gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-blue-900 block mb-0.5">
                  Interview Tip
                </strong>
                <p className="text-slate-700 text-xs leading-relaxed">
                  {question.sample_answer.better_approach ||
                    question.sample_answer.interview_tip}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 7. Follow-Up Questions Expanded Section */}
      {showFollowUps && hasFollowUps && (
        <div className="mt-4 p-4 rounded-2xl bg-purple-50/60 border border-purple-150 space-y-2.5 animate-in fade-in">
          <span className="text-xs font-bold text-purple-950 uppercase tracking-wider block">
            Follow-up Questions
          </span>
          <div className="space-y-2">
            {followUps.map((fu, fIdx) => (
              <div
                key={fIdx}
                className="flex items-start gap-2 text-xs text-purple-900 bg-white/90 p-3 rounded-xl border border-purple-100 leading-relaxed"
              >
                <span className="font-bold text-purple-600 shrink-0">
                  ↳ Follow-up {fIdx + 1}:
                </span>
                <span className="font-medium text-slate-800">{fu}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Practice Mode Interactive Evaluation */}
      {isPracticing && (
        <div className="mt-4 p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 animate-in fade-in">
          <label className="text-xs font-bold text-slate-800 block">
            {isCodingQuestion
              ? 'Write your code solution or algorithmic approach below:'
              : 'Draft your answer response below for instant AI feedback:'}
          </label>
          <textarea
            rows={4}
            value={practiceAnswer}
            onChange={(e) => setPracticeAnswer(e.target.value)}
            placeholder={
              isCodingQuestion
                ? 'function solution(...) {\n  // your code here\n}'
                : 'Type your draft response here...'
            }
            className="w-full p-3.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-primary-500 outline-none bg-white font-mono shadow-2xs"
          />

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400">
              {practiceAnswer.trim().split(/\s+/).filter(Boolean).length} words
            </span>
            <Button
              variant="primary"
              size="sm"
              disabled={!practiceAnswer.trim() || isEvaluating || !onEvaluateAnswer}
              onClick={handleEvaluate}
              className="bg-primary-600 hover:bg-primary-700 shadow-xs"
            >
              {isEvaluating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Evaluating...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Evaluate My Answer
                </>
              )}
            </Button>
          </div>

          {/* Feedback Evaluation */}
          {evaluation && (
            <div className="mt-4 p-4 rounded-xl bg-white border border-slate-200 space-y-2.5 text-xs sm:text-sm shadow-xs animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-emerald-600" />
                  AI Score: {evaluation.score} / 10
                  {evaluation.verdict && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 ml-1.5">
                      {evaluation.verdict}
                    </span>
                  )}
                </span>
              </div>
              <p className="text-slate-700 leading-relaxed">{evaluation.feedback}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuestionCard;
