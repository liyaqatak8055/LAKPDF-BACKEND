import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  Wrench,
  ExternalLink,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Save,
  X,
  AlertTriangle,
  PowerOff,
} from 'lucide-react';
import { adminService, AdminToolItem } from '../services/authService';

export const AdminTools: React.FC = () => {
  const [tools, setTools] = useState<AdminToolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Edit Modal State
  const [editingTool, setEditingTool] = useState<AdminToolItem | null>(null);
  const [editStatus, setEditStatus] = useState<'operational' | 'maintenance' | 'disabled'>('operational');
  const [editNotice, setEditNotice] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchTools = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getTools();
      setTools(data.tools || []);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Failed to load tools registry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTools();
  }, []);

  const handleSaveToolStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTool) return;

    setSaving(true);
    setError(null);
    try {
      await adminService.updateToolStatus(editingTool.id, {
        status: editStatus,
        customNotice: editNotice,
      });
      setTools((prev) =>
        prev.map((t) =>
          t.id === editingTool.id
            ? { ...t, status: editStatus, customNotice: editNotice }
            : t
        )
      );
      setSuccessMessage(`Tool settings updated for ${editingTool.name}`);
      setEditingTool(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const categories = ['all', ...Array.from(new Set(tools.map((t) => t.category)))];

  const filteredTools = tools.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.route.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalExecutions = tools.reduce((acc, t) => acc + (t.usageCount || 0), 0);

  return (
    <>
      <Helmet>
        <title>Tool Catalog & Controls | LAK PDF Admin</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">PDF Tools Command & Catalog</h1>
            <p className="text-sm text-slate-600 mt-1">
              Live status toggles, maintenance notices, and runtime telemetry for each tool
            </p>
          </div>

          <button
            onClick={fetchTools}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Status</span>
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-xs text-slate-400 hover:text-slate-700">Dismiss</button>
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between shadow-sm font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-xs text-slate-400 hover:text-slate-700">Dismiss</button>
          </div>
        )}

        {/* Quick Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="text-xs text-slate-500 font-bold uppercase">Total Registered Tools</div>
            <div className="text-3xl font-extrabold text-slate-900 mt-2">{tools.length} Tools</div>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="text-xs text-slate-500 font-bold uppercase">Operational Online</div>
            <div className="text-3xl font-extrabold text-emerald-600 mt-2 flex items-center gap-2">
              <CheckCircle2 className="w-7 h-7" />
              <span>{tools.filter((t) => t.status === 'operational').length} / {tools.length}</span>
            </div>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="text-xs text-slate-500 font-bold uppercase">Aggregate Executions</div>
            <div className="text-3xl font-extrabold text-slate-900 mt-2">
              {totalExecutions.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tools by title, route, or category..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm font-medium"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm font-medium capitalize"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>

        {/* Tools Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Tool Name</th>
                  <th className="py-3.5 px-4">Route</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Executions</th>
                  <th className="py-3.5 px-4">Current Status</th>
                  <th className="py-3.5 px-4 text-right">Configure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 text-sm">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                        <span>Loading tools catalog...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredTools.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 text-sm">
                      No tools found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredTools.map((tool) => {
                    const isMaint = tool.status === 'maintenance';
                    const isDisabled = tool.status === 'disabled';

                    return (
                      <tr key={tool.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 sm:px-6">
                          <div className="font-bold text-slate-900">{tool.name}</div>
                          {tool.customNotice && (
                            <div className="text-[11px] text-amber-700 mt-0.5 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Notice: {tool.customNotice}</span>
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-xs text-emerald-700 font-semibold">
                          {tool.route}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
                            {tool.category}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-extrabold text-slate-900">
                          {tool.usageCount.toLocaleString()}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              isDisabled
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : isMaint
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isDisabled ? 'bg-rose-500' : isMaint ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                            />
                            <span className="capitalize">{tool.status}</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditingTool(tool);
                                setEditStatus(tool.status);
                                setEditNotice(tool.customNotice || '');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-sm transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <Edit3 className="w-3 h-3 text-emerald-600" />
                              <span>Control</span>
                            </button>

                            <a
                              href={tool.route}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-900 transition-colors"
                              title="Open Tool"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL: Configure Tool Status & Notice */}
        {editingTool && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-slate-900">Configure {editingTool.name}</h3>
                <button onClick={() => setEditingTool(null)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveToolStatus} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold uppercase text-slate-700 mb-1.5">Live Tool Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold"
                  >
                    <option value="operational">🟢 Operational (Online)</option>
                    <option value="maintenance">🟡 Maintenance Mode (Warning banner shown)</option>
                    <option value="disabled">🔴 Disabled (Offline)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold uppercase text-slate-700 mb-1.5">
                    Custom Maintenance / Advisory Notice (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={editNotice}
                    onChange={(e) => setEditNotice(e.target.value)}
                    placeholder="e.g. Engine update in progress. Tool will resume in a few moments."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingTool(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{saving ? 'Saving...' : 'Apply Status'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AdminTools;
