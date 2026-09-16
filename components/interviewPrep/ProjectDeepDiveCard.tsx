import React, { useState } from 'react';
import { FolderGit2, ChevronDown, ChevronUp, Layers, Wrench, Lightbulb, MessageSquare } from 'lucide-react';
import { ProjectDeepDive } from './types';

interface ProjectDeepDiveCardProps {
  deepDive: ProjectDeepDive;
  index: number;
}

export const ProjectDeepDiveCard: React.FC<ProjectDeepDiveCardProps> = ({ deepDive, index }) => {
  const [isExpanded, setIsExpanded] = useState(index === 0);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm transition-all hover:border-slate-300">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-start justify-between gap-4 cursor-pointer"
      >
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
              Project #{index + 1} Deep-Dive
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {deepDive.core_questions?.length || 0} core questions
            </span>
          </div>
          <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FolderGit2 className="w-5 h-5 text-amber-600 shrink-0" />
            {deepDive.project_name}
          </h4>
          {deepDive.overview && (
            <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 mt-0.5">{deepDive.overview}</p>
          )}
        </div>

        <button
          type="button"
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
        >
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-6 pt-5 border-t border-slate-100 space-y-5 animate-in fade-in">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            10-Point Technical Interrogation Checklist:
          </p>

          <div className="grid grid-cols-1 gap-3.5">
            {deepDive.core_questions?.map((cq, qIdx) => (
              <div
                key={qIdx}
                className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-slate-900">
                    <span className="text-primary-600 mr-1.5 font-bold">{qIdx + 1}.</span>
                    {cq.question}
                  </p>
                </div>

                {cq.why_ask && (
                  <p className="text-xs text-slate-500 flex items-start gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-slate-700">Interviewer perspective: </strong>
                      {cq.why_ask}
                    </span>
                  </p>
                )}

                {cq.prepare && cq.prepare.length > 0 && (
                  <div className="pt-1 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-600">Be ready to explain:</span>
                    {cq.prepare.map((item, itIdx) => (
                      <span
                        key={itIdx}
                        className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-white border border-slate-200 text-slate-700"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Follow-Up Section */}
          {deepDive.follow_ups && deepDive.follow_ups.length > 0 && (
            <div className="mt-5 p-4 rounded-2xl bg-amber-50/60 border border-amber-200/70 space-y-2">
              <p className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                Interviewer Architecture Follow-Ups:
              </p>
              <div className="space-y-1.5 text-xs text-amber-900">
                {deepDive.follow_ups.map((fu, fIdx) => (
                  <div key={fIdx} className="flex items-start gap-1.5 bg-white/70 p-2.5 rounded-xl border border-amber-100">
                    <span className="font-bold text-amber-700 shrink-0">↳</span>
                    <span>{fu}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
