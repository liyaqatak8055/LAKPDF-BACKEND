import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useLocation } from 'react-router-dom';
import {
  Clock,
  Star,
  FileText,
  Trash2,
  Zap,
  ArrowRight,
  BarChart3,
  Download,
  HardDrive,
  Database,
} from 'lucide-react';
import { Button } from '../components/Button';
import { RecentFilesSkeleton } from '../components/Skeleton';

interface FileHistoryItem {
  id: string;
  name: string;
  type: string;
  tool: string;
  timestamp: number;
  size?: number;
  downloadUrl?: string;
}

interface DashboardStats {
  toolsUsed: number;
  filesProcessed: number;
  lastActive: number;
}

const safeParse = <T,>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
  return date.toLocaleDateString();
};

const formatSize = (bytes = 0) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

const getToolLabel = (tool: string) => {
  const toolNames: Record<string, string> = {
    merge: 'Merge PDF',
    split: 'Split PDF',
    compress: 'Compress PDF',
    'delete-page': 'Delete Pages',
    'extract-page': 'Extract Pages',
    convert: 'Convert PDF',
    'img-to-pdf': 'Image to PDF',
    'pdf-to-word': 'PDF to Word',
    'pdf-to-img': 'PDF to Image',
    rotate: 'Rotate PDF',
    watermark: 'Watermark PDF',
    'organize-pdf': 'Organize PDF',
    'ocr-pdf': 'OCR PDF',
    'scan-pdf': 'Scan to PDF',
    'sign-pdf': 'Sign PDF',
    'crop-pdf': 'Crop PDF',
  };
  return toolNames[tool] || tool;
};

const getToolPath = (tool: string) => {
  const paths: Record<string, string> = {
    merge: '/merge',
    split: '/split',
    compress: '/compress',
    'delete-page': '/delete-page',
    'extract-page': '/split',
    convert: '/convert',
    'img-to-pdf': '/img-to-pdf',
    'pdf-to-word': '/pdf-to-word',
    'pdf-to-img': '/pdf-to-img',
    rotate: '/rotate',
    watermark: '/watermark',
    'organize-pdf': '/organize-pdf',
    'ocr-pdf': '/ocr-pdf',
    'scan-pdf': '/scan-pdf',
    'sign-pdf': '/sign-pdf',
    'crop-pdf': '/crop-pdf',
  };
  return paths[tool] || '/tools';
};

const getToolIcon = (tool: string) => {
  const icons: Record<string, string> = {
    merge: '📎',
    split: '✂️',
    compress: '📦',
    'delete-page': '🗑️',
    'extract-page': '📄',
    convert: '🔄',
    'img-to-pdf': '🖼️',
    'pdf-to-img': '🖼️',
    'pdf-to-word': '📝',
    rotate: '🔃',
    watermark: '💧',
    'organize-pdf': '🗂️',
    'ocr-pdf': '🔎',
    'scan-pdf': '📷',
    'sign-pdf': '✍️',
  };
  return icons[tool] || '📄';
};

const useCountUp = (target: number, durationMs = 900) => {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frame = 0;
    const startedAt = performance.now();

    const step = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
};

export const Dashboard: React.FC = () => {
  const location = useLocation();
  const [history, setHistory] = useState<FileHistoryItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    toolsUsed: 0,
    filesProcessed: 0,
    lastActive: Date.now(),
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedHistory = localStorage.getItem('lakpdf_file_history');
    const savedFavorites = localStorage.getItem('lakpdf_favorites');
    const savedStats = localStorage.getItem('lakpdf_stats');
    setHistory(safeParse<FileHistoryItem[]>(savedHistory, []));
    setFavorites(safeParse<string[]>(savedFavorites, []));
    setStats(
      safeParse<DashboardStats>(savedStats, {
        toolsUsed: 0,
        filesProcessed: 0,
        lastActive: Date.now(),
      })
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.replace('#', '');
    const timer = window.setTimeout(() => {
      const section = document.getElementById(id);
      section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [location.hash, loading]);

  const totalBytes = useMemo(
    () => history.reduce((acc, item) => acc + Number(item.size || 0), 0),
    [history]
  );
  const compressedCount = useMemo(
    () => history.filter((item) => item.tool.includes('compress')).length,
    [history]
  );
  const conversionsCount = useMemo(
    () =>
      history.filter((item) =>
        ['convert', 'pdf-to-word', 'pdf-to-img', 'img-to-pdf', 'word-to-pdf', 'powerpoint-to-pdf'].includes(item.tool)
      ).length,
    [history]
  );

  const thisWeekCount = useMemo(() => {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    return history.filter((item) => item.timestamp >= sevenDaysAgo).length;
  }, [history]);

  const prevWeekCount = useMemo(() => {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;
    return history.filter((item) => item.timestamp >= fourteenDaysAgo && item.timestamp < sevenDaysAgo).length;
  }, [history]);

  const weeklyGrowthPct = useMemo(() => {
    if (prevWeekCount === 0) return thisWeekCount > 0 ? 100 : 0;
    return Math.round(((thisWeekCount - prevWeekCount) / prevWeekCount) * 100);
  }, [prevWeekCount, thisWeekCount]);

  const dailyActivity = useMemo(() => {
    const buckets: { label: string; count: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const start = new Date(d);
      start.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setHours(23, 59, 59, 999);
      const count = history.filter((item) => item.timestamp >= start.getTime() && item.timestamp <= end.getTime()).length;
      buckets.push({ label: d.toLocaleDateString(undefined, { weekday: 'short' }), count });
    }
    return buckets;
  }, [history]);

  const maxDailyCount = Math.max(1, ...dailyActivity.map((d) => d.count));
  const storageCapBytes = 100 * 1024 * 1024;
  const storagePct = Math.min(100, Math.round((totalBytes / storageCapBytes) * 100));

  const animatedToolsUsed = useCountUp(stats.toolsUsed);
  const animatedFilesProcessed = useCountUp(stats.filesProcessed);
  const animatedFavorites = useCountUp(favorites.length);
  const animatedConversions = useCountUp(conversionsCount);

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('lakpdf_file_history');
  };

  const removeFromHistory = (id: string) => {
    const updated = history.filter((item) => item.id !== id);
    setHistory(updated);
    localStorage.setItem('lakpdf_file_history', JSON.stringify(updated));
  };

  const toggleFavorite = (toolId: string) => {
    const updated = favorites.includes(toolId)
      ? favorites.filter((id) => id !== toolId)
      : [...favorites, toolId];
    setFavorites(updated);
    localStorage.setItem('lakpdf_favorites', JSON.stringify(updated));
  };

  return (
    <>
      <Helmet>
        <title>Dashboard - LAK PDF</title>
        <meta name="description" content="View your PDF processing history, favorites, and statistics" />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Dashboard</h1>
          <p className="text-slate-500">Track your PDF activities and statistics</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-primary-50 rounded-xl">
                <Zap className="w-6 h-6 text-primary-500" />
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${weeklyGrowthPct >= 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                {weeklyGrowthPct >= 0 ? `+${weeklyGrowthPct}%` : `${weeklyGrowthPct}%`}
              </span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{animatedToolsUsed}</p>
            <p className="text-sm text-slate-500">Tools Used</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-50 rounded-xl">
                <FileText className="w-6 h-6 text-blue-500" />
              </div>
              <span className="text-xs text-slate-500">This week {thisWeekCount}</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{animatedFilesProcessed}</p>
            <p className="text-sm text-slate-500">Files Processed</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all" id="favorites">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-50 rounded-xl">
                <Star className="w-6 h-6 text-yellow-500" />
              </div>
              <span className="text-xs text-slate-500">Saved</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{animatedFavorites}</p>
            <p className="text-sm text-slate-500">Favorites</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-violet-50 rounded-xl">
                <BarChart3 className="w-6 h-6 text-violet-500" />
              </div>
              <span className="text-xs text-slate-500">Live</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{animatedConversions}</p>
            <p className="text-sm text-slate-500">Conversions</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2" id="activity">
                  <BarChart3 className="w-5 h-5 text-blue-500" />
                  Activity Chart
                </h2>
                <span className="text-xs text-slate-500">Weekly comparison</span>
              </div>
              <div className="grid grid-cols-7 gap-2 h-44 items-end">
                {dailyActivity.map((bar) => (
                  <div key={bar.label} className="flex flex-col items-center gap-2">
                    <div className="text-xs text-slate-400">{bar.count}</div>
                    <div className="w-full max-w-10 bg-slate-100 rounded-t-md overflow-hidden h-28 flex items-end">
                      <div
                        className="w-full bg-gradient-to-t from-primary-500 to-blue-400 rounded-t-md transition-all duration-700"
                        style={{ height: `${Math.max(8, (bar.count / maxDailyCount) * 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-slate-500">{bar.label}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-sm text-slate-500">
                Last week: <span className="font-semibold text-slate-800">{thisWeekCount}</span> files
                {' • '}
                Previous week: <span className="font-semibold text-slate-800">{prevWeekCount}</span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary-500" />
                  Recent Files
                </h2>
                {history.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearHistory}>
                    <Trash2 className="w-4 h-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>

              {loading ? (
                <RecentFilesSkeleton />
              ) : history.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-500 mb-4">No files processed yet</p>
                  <Link to="/">
                    <Button variant="primary">Start Using Tools</Button>
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-500 border-b border-slate-100">
                        <th className="py-2 pr-3">File</th>
                        <th className="py-2 pr-3">Tool</th>
                        <th className="py-2 pr-3">Date</th>
                        <th className="py-2 pr-3">Size</th>
                        <th className="py-2 pr-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.slice(0, 10).map((item) => (
                        <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 pr-3">
                            <div className="flex items-center gap-2">
                              <span>{getToolIcon(item.tool)}</span>
                              <span className="font-medium text-slate-800 truncate max-w-[220px]">{item.name}</span>
                            </div>
                          </td>
                          <td className="py-3 pr-3 text-slate-600">{getToolLabel(item.tool)}</td>
                          <td className="py-3 pr-3 text-slate-600">{formatDate(item.timestamp)}</td>
                          <td className="py-3 pr-3 text-slate-600">{formatSize(item.size || 0)}</td>
                          <td className="py-3 pr-3">
                            <div className="flex items-center justify-end gap-2">
                              <Link to={getToolPath(item.tool)} className="p-2 rounded-lg hover:bg-slate-100" title="Open tool">
                                <ArrowRight className="w-4 h-4 text-slate-500" />
                              </Link>
                              <button
                                type="button"
                                className={`p-2 rounded-lg ${item.downloadUrl ? 'hover:bg-blue-50' : 'opacity-40 cursor-not-allowed'}`}
                                disabled={!item.downloadUrl}
                                onClick={() => item.downloadUrl && window.open(item.downloadUrl, '_blank')}
                                title={item.downloadUrl ? 'Download' : 'Download not available'}
                              >
                                <Download className="w-4 h-4 text-blue-500" />
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleFavorite(item.tool)}
                                className={`p-2 rounded-lg transition-colors ${
                                  favorites.includes(item.tool)
                                    ? 'text-yellow-500 bg-yellow-50'
                                    : 'text-slate-400 hover:text-yellow-500 hover:bg-yellow-50'
                                }`}
                                title="Favorite"
                              >
                                <Star className={`w-4 h-4 ${favorites.includes(item.tool) ? 'fill-current' : ''}`} />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeFromHistory(item.id)}
                                className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"
                                title="Remove"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-6">
                <Star className="w-5 h-5 text-yellow-500" />
                Favorite Tools
              </h2>

              {favorites.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-slate-500 mb-4">No favorites yet</p>
                  <p className="text-sm text-slate-400">Star tools to add them here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {favorites.map((toolId) => (
                    <Link
                      key={toolId}
                      to={getToolPath(toolId)}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 hover:shadow-sm transition-all"
                    >
                      <span className="font-medium text-slate-700">{getToolLabel(toolId)}</span>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-4">
                <HardDrive className="w-5 h-5 text-indigo-500" />
                Storage
              </h2>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-500">Used</span>
                <span className="font-medium text-slate-900">{formatSize(totalBytes)} / 100 MB</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
                <div className="h-full bg-indigo-500 rounded-full transition-all duration-700" style={{ width: `${storagePct}%` }} />
              </div>
              <p className="text-xs text-slate-500">{compressedCount} compression operations recorded</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-4">
                <Database className="w-5 h-5 text-emerald-500" />
                Pro Metrics
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">API usage</span>
                  <span className="font-medium text-slate-800">0 requests</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Download history</span>
                  <span className="font-medium text-slate-800">{history.length} files</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Last active</span>
                  <span className="font-medium text-slate-800">{formatDate(stats.lastActive)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
