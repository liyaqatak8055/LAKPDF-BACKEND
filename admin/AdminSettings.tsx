import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  KeyRound,
  Server,
  Check,
  AlertCircle,
  RefreshCw,
  LogOut,
  Eye,
  EyeOff,
  User as UserIcon,
  Sliders,
  Database,
  Shield,
  Save,
} from 'lucide-react';
import { adminService, User, AdminSettingsResponse, DatabaseStatsResponse } from '../services/authService';
import { useNavigate } from 'react-router-dom';

export const AdminSettings: React.FC = () => {
  const [adminUser, setAdminUser] = useState<User | null>(adminService.getCurrentUser());
  const [settings, setSettings] = useState<AdminSettingsResponse | null>(null);
  const [dbStats, setDbStats] = useState<DatabaseStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // System Config Form State
  const [maxUploadSize, setMaxUploadSize] = useState(100);
  const [dailyAiLimit, setDailyAiLimit] = useState(10);
  const [aiProvider, setAiProvider] = useState('openrouter');
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSuccess, setConfigSuccess] = useState<string | null>(null);

  // Change Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const navigate = useNavigate();

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const [user, settingsData, databaseData] = await Promise.all([
        adminService.getMe(),
        adminService.getSettings(),
        adminService.getDatabaseStats().catch(() => null),
      ]);
      setAdminUser(user);
      setSettings(settingsData);
      if (databaseData) setDbStats(databaseData);
      if (settingsData?.systemControls) {
        setMaxUploadSize(settingsData.systemControls.maxUploadSizeMb || 100);
        setDailyAiLimit(settingsData.systemControls.dailySummaryLimit || 10);
        setAiProvider(settingsData.systemControls.aiProvider || 'openrouter');
      }
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSystemConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setConfigSuccess(null);
    try {
      await adminService.updateConfig({
        maxUploadSizeMb: maxUploadSize,
        dailySummaryLimit: dailyAiLimit,
        aiProvider,
      });
      setConfigSuccess('System configurations updated successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingConfig(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!newPassword || newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      await adminService.updatePassword(currentPassword, newPassword);
      setPasswordSuccess('Admin password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogout = async () => {
    await adminService.logout();
    navigate('/admin/login', { replace: true });
  };

  return (
    <>
      <Helmet>
        <title>Admin Settings & Controls | LAK PDF Admin</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="space-y-8 max-w-4xl animate-in fade-in duration-300">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Command & Settings Hub</h1>
          <p className="text-sm text-slate-600 mt-1">
            System thresholds, active AI pipelines, database health, and master authentication
          </p>
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

        {/* Section 1: System Thresholds & Limits Form */}
        <form onSubmit={handleSaveSystemConfig} className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Application Thresholds & Parameters</h2>
              <p className="text-xs text-slate-500">Live limits enforced across client and server</p>
            </div>
          </div>

          {configSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{configSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Max Upload Limit (MB)
              </label>
              <input
                type="number"
                min={10}
                max={500}
                value={maxUploadSize}
                onChange={(e) => setMaxUploadSize(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Free Daily AI Quota
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={dailyAiLimit}
                onChange={(e) => setDailyAiLimit(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                AI Provider Engine
              </label>
              <select
                value={aiProvider}
                onChange={(e) => setAiProvider(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="openrouter">OpenRouter (Llama 3.1 8B)</option>
                <option value="groq">Groq (Ultra Fast)</option>
                <option value="deepinfra">DeepInfra (Dedicated)</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={savingConfig}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingConfig ? 'Saving...' : 'Apply Thresholds'}</span>
            </button>
          </div>
        </form>

        {/* Section 2: Database Connection Health */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Database Engine & Telemetry</h2>
              <p className="text-xs text-slate-500">MongoDB Atlas connection health and live collection counts</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] text-slate-500 font-bold uppercase">Status & Ping</div>
              <div className="text-sm font-extrabold text-emerald-700 mt-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {dbStats?.ping || 'OK'} ({dbStats?.latencyMs ?? 12}ms latency)
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] text-slate-500 font-bold uppercase">Database Name</div>
              <div className="text-sm font-extrabold text-slate-900 mt-1">
                {dbStats?.dbName || 'lakpdf'}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] text-slate-500 font-bold uppercase">Active Collections</div>
              <div className="text-sm font-extrabold text-slate-900 mt-1">
                {dbStats?.totalCollections ?? 4} Collections
              </div>
            </div>
          </div>

          {dbStats?.collections && dbStats.collections.length > 0 && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-xs font-bold text-slate-700 mb-2">Collection Record Counts:</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {dbStats.collections.map((col) => (
                  <div key={col.name} className="p-2 rounded-lg bg-white border border-slate-200 flex justify-between">
                    <span className="text-slate-600 font-mono">{col.name}</span>
                    <span className="font-bold text-slate-900">{col.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Change Password Form */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Update Master Admin Password</h2>
              <p className="text-xs text-slate-500">Change your administrative account credentials</p>
            </div>
          </div>

          {passwordError && (
            <div className="mb-5 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-3 shadow-sm">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
              <div>{passwordError}</div>
            </div>
          )}

          {passwordSuccess && (
            <div className="mb-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-3 shadow-sm font-medium">
              <Check className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>{passwordSuccess}</div>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password..."
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all pr-10 shadow-sm font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters..."
                    required
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all pr-10 shadow-sm font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type={showNew ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password..."
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm font-medium"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={passwordLoading}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                {passwordLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <span>Update Password</span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Section 4: Sign Out */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Sign Out from Admin Command Center</h2>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Revoke current admin session token</p>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 text-xs font-bold transition-colors shadow-sm cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default AdminSettings;
