import React from 'react';
import { Target, CheckCircle2, ShieldAlert, BarChart3, Info } from 'lucide-react';
import { ReadinessScore } from './types';

interface ReadinessScoreCardProps {
  preparedCount: number;
  totalCount: number;
  readiness?: ReadinessScore;
}

export const ReadinessScoreCard: React.FC<ReadinessScoreCardProps> = ({
  preparedCount,
  totalCount,
  readiness,
}) => {
  const preparedPct = totalCount > 0 ? Math.round((preparedCount / totalCount) * 100) : 0;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <span className="text-[11px] font-bold text-primary-600 uppercase tracking-wider bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
            Preparation Tracker
          </span>
          <h3 className="text-lg font-bold text-slate-900 mt-1 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary-600" />
            Interview Readiness Coverage
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-2xl font-black text-slate-900 tracking-tight">
            {preparedCount} <span className="text-sm font-semibold text-slate-400">/ {totalCount}</span>
          </span>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            {preparedPct}% Completed
          </span>
        </div>
      </div>

      {/* Main Overall Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-semibold text-slate-600">
          <span>Overall Preparation Progress</span>
          <span>{preparedPct}%</span>
        </div>
        <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden p-0.5 border border-slate-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary-500 to-rose-600 transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, preparedPct))}%` }}
          ></div>
        </div>
      </div>

      {/* Topic Coverage Breakdown */}
      {readiness && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-150">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Technical</p>
            <p className="text-lg font-extrabold text-slate-900 mt-0.5">{readiness.technical_coverage_pct}%</p>
            <div className="w-full h-1.5 rounded-full bg-slate-200 mt-1.5 overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${readiness.technical_coverage_pct}%` }}
              ></div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-150">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Projects</p>
            <p className="text-lg font-extrabold text-slate-900 mt-0.5">{readiness.projects_coverage_pct}%</p>
            <div className="w-full h-1.5 rounded-full bg-slate-200 mt-1.5 overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full"
                style={{ width: `${readiness.projects_coverage_pct}%` }}
              ></div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-150">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">HR / STAR</p>
            <p className="text-lg font-extrabold text-slate-900 mt-0.5">{readiness.hr_coverage_pct}%</p>
            <div className="w-full h-1.5 rounded-full bg-slate-200 mt-1.5 overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full"
                style={{ width: `${readiness.hr_coverage_pct}%` }}
              ></div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-150">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Resume Claims</p>
            <p className="text-lg font-extrabold text-slate-900 mt-0.5">{readiness.resume_based_pct}%</p>
            <div className="w-full h-1.5 rounded-full bg-slate-200 mt-1.5 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${readiness.resume_based_pct}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory Disclaimer */}
      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 flex items-start gap-2">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <span>
          <strong>Important notice: </strong> This score measures your preparation curriculum coverage across
          recommended resume topics. It does not represent candidate employability or hiring probability.
        </span>
      </div>
    </div>
  );
};
