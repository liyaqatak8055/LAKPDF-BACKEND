import React, { useState, useEffect } from 'react';
import { Files, TrendingUp } from 'lucide-react';
import { API_BASE_URL } from '../utils/apiBase';

const fetchFilesProcessedToday = async (): Promise<number | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/metrics/files-processed-today`, {
      method: 'GET',
      credentials: 'omit',
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const data = await response.json();
    const value = Number(data?.filesProcessedToday);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
};

export const UsageCounter: React.FC = () => {
  const [count, setCount] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const filesProcessed = await fetchFilesProcessedToday();
      if (!cancelled) setCount(filesProcessed);
    };
    load();

    const interval = window.setInterval(load, 45_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const formatCount = (num: number): string => num.toLocaleString('en-IN');

  if (!isVisible || count === null) return null;

  return (
    <div 
      className="fixed bottom-4 left-4 z-40 hidden cursor-pointer group sm:block md:left-auto md:right-4"
      onClick={() => setIsVisible(false)}
      title="Close"
    >
      <div className="bg-white rounded-full shadow-lg border border-slate-200 px-4 py-2 
                      flex items-center gap-2 hover:shadow-xl transition-shadow">
        <div className="relative">
          <Files className="w-4 h-4 text-primary-500" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
        </div>
        <span className="text-sm font-semibold text-slate-700">
          {formatCount(count)} files today
        </span>
        <TrendingUp className="w-3 h-3 text-green-500" />
      </div>
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 
                      border-l-8 border-r-8 border-t-8 border-transparent border-t-slate-200"></div>
    </div>
  );
};

// Mini counter for header
export const MiniUsageCounter: React.FC = () => {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchFilesProcessedToday().then((value) => {
      if (!cancelled) setCount(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (count === null) return null;

  return (
    <div className="flex items-center gap-1.5 text-xs text-slate-500">
      <Files className="w-3.5 h-3.5 text-primary-400" />
      <span className="font-medium">{count.toLocaleString('en-IN')} today</span>
    </div>
  );
};
