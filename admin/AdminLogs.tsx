import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  Terminal,
  RefreshCw,
  Trash2,
  Filter,
  Search,
  CheckCircle2,
  AlertTriangle,
  Info,
  Shield,
  Zap,
} from 'lucide-react';
import { adminService, SystemLogEntry } from '../services/authService';

export const AdminLogs: React.FC = () => {
  const [logs, setLogs] = useState<SystemLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [search, setSearch] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [cacheClearing, setCacheClearing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      const data = await adminService.getLogs();
      setLogs(data.logs || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchLogs();
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleClearCache = async () => {
    if (!window.confirm('Purge all in-memory AI response caches?')) return;
    setCacheClearing(true);
    try {
      const result = await adminService.clearCache();
      setStatusMessage(result.message || 'Cache purged successfully');
      fetchLogs();
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setCacheClearing(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesType = filterType === 'all' || log.type === filterType;
    const matchesSearch =
      search === '' ||
      log.message.toLowerCase().includes(search.toLowerCase()) ||
      (log.ip && log.ip.includes(search)) ||
      (log.by && log.by.toLowerCase().includes(search.toLowerCase()));
    return matchesType && matchesSearch;
  });

  return (
    <>
      <Helmet>
        <title>Live Logs & Telemetry | LAK PDF Admin</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Live System Logs & Stream
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Real-time audit log stream, server events, security alerts, and memory cache controls
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleClearCache}
              disabled={cacheClearing}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-800 text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span>{cacheClearing ? 'Clearing...' : 'Purge AI Cache'}</span>
            </button>

            <button
              onClick={fetchLogs}
              disabled={loading}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {statusMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{statusMessage}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="text-xs text-slate-400 hover:text-slate-700">
              Dismiss
            </button>
          </div>
        )}

        {/* Filters and Live Stream bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex flex-1 gap-3 w-full sm:w-auto">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search log messages, IP, or user email..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm font-medium"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm font-medium"
            >
              <option value="all">All Events</option>
              <option value="auth">Auth & Security</option>
              <option value="info">System Info</option>
              <option value="warn">Warnings</option>
              <option value="error">Errors</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer self-start sm:self-auto">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
            />
            <span>Auto-poll (5s)</span>
          </label>
        </div>

        {/* Terminal Window */}
        <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
          <div className="h-10 bg-slate-900/90 border-b border-slate-800 px-4 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2 font-mono">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>system_telemetry.log ({filteredLogs.length} events)</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            </div>
          </div>

          <div className="p-4 font-mono text-xs text-slate-200 max-h-[500px] overflow-y-auto space-y-2 divide-y divide-slate-900">
            {filteredLogs.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                No logs found matching filter criteria.
              </div>
            ) : (
              filteredLogs.map((log) => {
                const isError = log.type === 'error';
                const isWarn = log.type === 'warn';
                const isAuth = log.type === 'auth';

                return (
                  <div key={log.id} className="pt-2 flex flex-col sm:flex-row sm:items-start gap-2 hover:bg-slate-900/60 p-1 rounded transition-colors">
                    <span className="text-slate-500 text-[11px] shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>

                    <span
                      className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded shrink-0 ${
                        isError
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : isWarn
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : isAuth
                          ? 'bg-purple-950 text-purple-300 border border-purple-800'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}
                    >
                      {log.type}
                    </span>

                    <span className="flex-1 text-slate-300 leading-relaxed break-all">
                      {log.message}
                    </span>

                    {log.by && (
                      <span className="text-[11px] text-slate-500 shrink-0">
                        by: {log.by}
                      </span>
                    )}

                    {log.ip && (
                      <span className="text-[11px] text-slate-600 shrink-0">
                        [{log.ip}]
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminLogs;
