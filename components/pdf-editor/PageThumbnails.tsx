import React from 'react';
import type { PdfDocument } from '../../types/pdfEditor';

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
  if (!document || !document.pages || document.pages.length === 0) {
    return <div className="text-slate-500 text-sm p-4">No pages</div>;
  }

  return (
    <div className="flex flex-col gap-2">
      {document.pages.map((_, pageIndex) => (
        <button
          key={pageIndex}
          onClick={() => onPageSelect(pageIndex + 1)}
          className={`
            relative p-2 rounded-lg transition-all
            ${currentPage === pageIndex + 1
              ? 'bg-blue-100 border-2 border-blue-500 shadow-md'
              : 'bg-slate-100 border border-slate-300 hover:bg-slate-200'
            }
          `}
          title={`Page ${pageIndex + 1}`}
        >
          <div className="aspect-video bg-slate-300 rounded flex items-center justify-center">
            <span className="text-xs text-slate-600 font-medium">{pageIndex + 1}</span>
          </div>
        </button>
      ))}
    </div>
  );
};
