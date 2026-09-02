import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  Megaphone,
  Save,
  CheckCircle,
  AlertCircle,
  Eye,
  ExternalLink,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { adminService, SystemControlConfig } from '../services/authService';

export const AdminAnnouncements: React.FC = () => {
  const [config, setConfig] = useState<SystemControlConfig | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [text, setText] = useState('');
  const [link, setLink] = useState('');
  const [type, setType] = useState<'info' | 'warning' | 'success'>('info');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getConfig();
      setConfig(data);
      if (data.announcementBanner) {
        setEnabled(data.announcementBanner.enabled ?? true);
        setText(data.announcementBanner.text || '');
        setLink(data.announcementBanner.link || '');
        setType(data.announcementBanner.type || 'info');
      }
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Failed to load announcement config');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await adminService.updateConfig({
        announcementBanner: {
          enabled,
          text: text.trim(),
          link: link.trim(),
          type,
        },
      });
      setConfig(updated.config);
      setSuccess('Site-wide Announcement Banner updated successfully!');
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Failed to save announcement banner');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Announcements & Banners | LAK PDF Admin</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="space-y-8 max-w-4xl animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Site-wide Announcements & Banners
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Broadcast top-bar messages, release alerts, and notices to all public visitors in real time
            </p>
          </div>

          <button
            onClick={fetchConfig}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            <div>{error}</div>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-3 shadow-sm font-medium">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>{success}</div>
          </div>
        )}

        {/* Live Banner Preview Box */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Eye className="w-4 h-4 text-emerald-600" />
            <span>Live Visitor Preview</span>
          </div>

          {enabled ? (
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-sm font-medium transition-all ${
                type === 'info'
                  ? 'bg-blue-50 border-blue-200 text-blue-900'
                  : type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Megaphone className="w-4 h-4 shrink-0 opacity-80" />
                <span>{text || 'Enter banner text below...'}</span>
              </div>

              {link && (
                <span className="inline-flex items-center gap-1 text-xs font-bold underline shrink-0">
                  <span>Learn More</span>
                  <ExternalLink className="w-3 h-3" />
                </span>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs text-center font-medium">
              Announcement Banner is currently <strong>Disabled</strong>. Turn on the switch below to display it to visitors.
            </div>
          )}
        </div>

        {/* Banner Configuration Form */}
        <form onSubmit={handleSave} className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Banner Display Status</h2>
              <p className="text-xs text-slate-500 mt-0.5">Toggle visibility on the public header</p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Announcement Message
              </label>
              <textarea
                rows={2}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="e.g. 🚀 All 16+ PDF tools are running at 100% speed with client-side privacy."
                required
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                  Action Link URL (Optional)
                </label>
                <input
                  type="text"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="/compress or https://..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                  Banner Style Theme
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="info">Info (Clean Blue)</option>
                  <option value="success">Success (Emerald Green)</option>
                  <option value="warning">Alert (Warm Amber)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Publishing Changes...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Publish Announcement</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default AdminAnnouncements;
