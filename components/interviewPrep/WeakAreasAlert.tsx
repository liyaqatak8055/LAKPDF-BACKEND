import React from 'react';
import { AlertTriangle, Compass, CheckCircle2 } from 'lucide-react';

interface WeakAreasAlertProps {
  weakAreas: string[];
  onFilterTopic?: (topic: string) => void;
}

export const WeakAreasAlert: React.FC<WeakAreasAlertProps> = ({ weakAreas, onFilterTopic }) => {
  if (!weakAreas || weakAreas.length === 0) return null;

  return (
    <div className="bg-amber-50/70 border border-amber-200/80 rounded-3xl p-5 sm:p-6 shadow-xs">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200 mt-0.5">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm sm:text-base font-bold text-amber-950">
            Recommended Preparation Focus Areas
          </h4>
          <p className="text-xs text-amber-900 mt-0.5">
            Based on your resume skills and question profile, interviewers are likely to test depth in these specific concepts:
          </p>

          <div className="flex flex-wrap gap-2 mt-3.5">
            {weakAreas.map((area, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onFilterTopic?.(area)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-amber-200 hover:border-amber-300 text-amber-900 shadow-xs hover:bg-amber-50/40 transition-all"
              >
                <Compass className="w-3.5 h-3.5 text-amber-600" />
                <span>{area}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
