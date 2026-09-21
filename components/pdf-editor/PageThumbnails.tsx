import React from 'react';
import type { PdfDocument } from '../../types/pdfEditor';
import { FileText } from 'lucide-react';

interface PageThumbnailsProps {
  document: PdfDocument;
  currentPage: number;
  onPageSelect: (page: number) => void;
}

export const PageThumbnails: React.FC<PageThumbnailsProps> = ({
  document,
  currentPage,
  onPageSelect,
}) => {
  const total = document?.totalPages || document?.pages?.length || 0;
  if (!document || total === 0) {
    return (
      <div className="text-slate-400 dark:text-slate-500 text-xs text-center p-4">
        No pages detected
      </div>
    );
  }

  const pageNumbers = Array.from({ length: total }, (_, i) => i + 1);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
        Pages ({total})
      </div>
      {pageNumbers.map((pageNum) => {
        const isCurrent = currentPage === pageNum;
        return (
          <button
            key={pageNum}
            type="button"
            onClick={() => onPageSelect(pageNum)}
            className={`group relative p-2 rounded-xl transition-all text-left cursor-pointer border ${
              isCurrent
                ? 'bg-primary-50 dark:bg-primary-950/60 border-primary-500 shadow-sm ring-1 ring-primary-500/20'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
            title={`Go to Page ${pageNum}`}
          >
            <div className="aspect-[3/4] bg-slate-100 dark:bg-slate-800/80 rounded-lg flex flex-col items-center justify-center border border-slate-200/60 dark:border-slate-700/60 overflow-hidden relative shadow-2xs">
              <FileText className={`w-5 h-5 ${isCurrent ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400'}`} />
              <span className={`text-[10px] mt-1 font-bold ${isCurrent ? 'text-primary-700 dark:text-primary-300' : 'text-slate-500'}`}>
                Page {pageNum}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
