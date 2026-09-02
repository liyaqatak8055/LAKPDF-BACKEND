import React from 'react';
import { Download, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { isToolRoute } from '../utils/toolUsage';
import {
  clearLatestDownload,
  getLatestDownload,
  subscribeLatestDownload,
  triggerDownloadFromCenter,
} from '../utils/downloadCenter';

export const DownloadCenter: React.FC = () => {
  const [latest, setLatest] = React.useState(getLatestDownload());
  const location = useLocation();

  React.useEffect(() => subscribeLatestDownload(setLatest), []);

  const isToolPage = isToolRoute(location.pathname);
  if (!latest || !isToolPage) return null;

  const handleDownload = () => {
    triggerDownloadFromCenter(latest);
  };

  return (
    <div className="w-full border-t border-slate-200/80 bg-white/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">
              {latest.autoDownloaded ? 'Download complete' : 'File is ready'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[190px]">{latest.filename}</p>
            <button
              type="button"
              onClick={handleDownload}
              className="mt-1.5 inline-flex items-center gap-1 text-sm font-medium text-slate-700 underline hover:text-slate-900"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>
          <button
            type="button"
            onClick={clearLatestDownload}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      </div>
    </div>
  );
};
