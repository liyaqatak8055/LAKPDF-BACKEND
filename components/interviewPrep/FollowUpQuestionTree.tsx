import React, { useState } from 'react';
import { GitFork, ChevronDown, ChevronUp, CornerDownRight, MessageSquare, Sparkles } from 'lucide-react';
import { PrepQuestionItem } from './types';

interface FollowUpQuestionTreeProps {
  questions: PrepQuestionItem[];
}

export const FollowUpQuestionTree: React.FC<FollowUpQuestionTreeProps> = ({ questions }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  // Filter questions that have rich follow-ups
  const questionsWithFollowUps = questions.filter((q) => q.follow_ups && q.follow_ups.length > 0);

  if (questionsWithFollowUps.length === 0) return null;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider bg-purple-50 px-2.5 py-0.5 rounded-md border border-purple-200 flex items-center gap-1">
          <GitFork className="w-3.5 h-3.5" /> Probing Simulator
        </span>
      </div>

      <h3 className="text-lg font-bold text-slate-900 mt-1">
        Interviewer Follow-Up Tree
      </h3>
      <p className="text-xs text-slate-500 mb-5">
        Interviewers rarely stop at the initial question. Prepare for the multi-level drill-down questions they ask next.
      </p>

      <div className="space-y-4">
        {questionsWithFollowUps.slice(0, 5).map((q, idx) => {
          const isOpen = expandedIndex === idx;

          return (
            <div
              key={q.id || idx}
              className="rounded-2xl border border-slate-200 bg-slate-50/50 overflow-hidden transition-all"
            >
              {/* Parent Question Bar */}
              <div
                onClick={() => setExpandedIndex(isOpen ? null : idx)}
                className="p-4 cursor-pointer hover:bg-slate-100/70 flex items-start justify-between gap-3 transition-colors"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[11px] font-bold">
                      Root Question {idx + 1}
                    </span>
                    <span>{q.category}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 leading-snug">
                    {q.question}
                  </h4>
                </div>

                <div className="text-slate-400 p-1 shrink-0">
                  {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>

              {/* Tree Branches */}
              {isOpen && (
                <div className="p-4 border-t border-slate-200 bg-white space-y-3 animate-in fade-in">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Interviewer Drill-Down Sequence:
                  </p>

                  <div className="space-y-2.5 pl-2 relative border-l-2 border-purple-200 ml-3">
                    {q.follow_ups?.map((fu, fIdx) => (
                      <div key={fIdx} className="relative pl-4 space-y-1">
                        <div className="absolute -left-[9px] top-2 w-3.5 h-3.5 rounded-full bg-purple-100 border-2 border-purple-500 flex items-center justify-center">
                          <span className="w-1 h-1 rounded-full bg-purple-600"></span>
                        </div>
                        <div className="p-3 rounded-xl bg-purple-50/40 border border-purple-100 text-xs text-purple-950 flex items-start gap-2">
                          <CornerDownRight className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-purple-900">Level {fIdx + 1} Follow-up: </span>
                            <span className="text-slate-800">{fu}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
