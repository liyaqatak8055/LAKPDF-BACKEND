import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useLocation } from 'react-router-dom';
import {
  User as UserIcon,
  Mail,
  CalendarDays,
  ShieldCheck,
  Download,
  Clock3,
  Database,
  LogOut,
  Trash2,
  KeyRound,
  Link2,
} from 'lucide-react';
import { Button } from '../components/Button';
import { authService, User } from '../services/authService';

interface FileHistoryItem {
  id: string;
  name: string;
  type: string;
  tool: string;
  timestamp: number;
  size?: number;
}

interface ProfileSettings {
  emailUpdates: boolean;
  weeklySummary: boolean;
  compactDashboard: boolean;
  theme: 'light' | 'dark';
}

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const formatFileSize = (bytes = 0): string => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatWhen = (ts = 0): string => {
  if (!ts) return 'N/A';
  const d = new Date(ts);
  return d.toLocaleString();
};

export const Profile: React.FC = () => {
  const location = useLocation();
  const [user, setUser] = useState<User | null>(() => authService.getCurrentUser());
  const [sendingReset, setSendingReset] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loggingOutAll, setLoggingOutAll] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [settings, setSettings] = useState<ProfileSettings>({
    emailUpdates: true,
    weeklySummary: true,
    compactDashboard: false,
    theme: 'light',
  });
  const [savingSettings, setSavingSettings] = useState(false);

  const history = useMemo(
    () => readJson<FileHistoryItem[]>('lakpdf_file_history', []),
    []
  );
  const stats = useMemo(
    () => readJson<{ toolsUsed: number; filesProcessed: number; lastActive: number }>('lakpdf_stats', {
      toolsUsed: 0,
      filesProcessed: 0,
      lastActive: Date.now(),
    }),
    []
  );

  const totalBytes = useMemo(
    () => history.reduce((acc, item) => acc + Number(item.size || 0), 0),
    [history]
  );
  const storageCapBytes = 100 * 1024 * 1024;
  const storagePct = Math.min(100, Math.round((totalBytes / storageCapBytes) * 100));
  const conversionsCount = useMemo(
    () =>
      history.filter((item) =>
        ['convert', 'pdf-to-word', 'pdf-to-img', 'img-to-pdf', 'word-to-pdf', 'powerpoint-to-pdf'].includes(item.tool)
      ).length,
    [history]
  );

  useEffect(() => {
    let cancelled = false;
    authService.fetchCurrentUser().then((u) => {
      if (!cancelled) setUser(u);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const persisted = readJson<ProfileSettings | null>('lakpdf_profile_settings', null);
    if (persisted) {
      setSettings(persisted);
    }
  }, []);

  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.replace('#', '');
    const timer = window.setTimeout(() => {
      const section = document.getElementById(id);
      if (!section) return;
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (id === 'security') {
        const otpInput = document.getElementById('profile-otp') as HTMLInputElement | null;
        otpInput?.focus();
      }
    }, 150);

    return () => window.clearTimeout(timer);
  }, [location.hash, user?.id]);

  const exportData = () => {
    const payload = {
      profile: user,
      stats,
      history,
      favorites: readJson<string[]>('lakpdf_favorites', []),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `lakpdf-export-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice('Data exported successfully.');
    setError('');
  };

  const sendPasswordReset = async () => {
    if (!user?.email) return;
    setSendingReset(true);
    setNotice('');
    setError('');
    try {
      await authService.requestPasswordReset(user.email);
      setNotice('If your account exists, password reset OTP has been sent to your email.');
    } catch (err: any) {
      setError(err?.message || 'Failed to send password reset OTP.');
    } finally {
      setSendingReset(false);
    }
  };

  const applyTheme = (theme: 'light' | 'dark') => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('lakpdf-theme', theme);
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    setError('');
    setNotice('');
    try {
      localStorage.setItem('lakpdf_profile_settings', JSON.stringify(settings));
      applyTheme(settings.theme);
      setNotice('Settings updated successfully.');
    } catch (err: any) {
      setError(err?.message || 'Failed to save settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const updatePasswordWithOtp = async () => {
    if (!user?.email) return;
    if (user.provider === 'google') {
      setError('Google account password can be changed only from Google Account Security.');
      setNotice('');
      return;
    }
    if (!otp || !newPassword || !confirmPassword) {
      setError('Please fill OTP, new password and confirm password.');
      setNotice('');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      setNotice('');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      setNotice('');
      return;
    }
    setUpdatingPassword(true);
    setError('');
    setNotice('');
    try {
      await authService.resetPassword(user.email, otp, newPassword);
      setNotice('Password changed successfully. Please use new password on next login.');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err?.message || 'Failed to update password.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const logoutAllDevices = async () => {
    setLoggingOutAll(true);
    setNotice('');
    setError('');
    try {
      await authService.logout();
      setUser(null);
      setNotice('Logged out successfully from current session. Other sessions expire on refresh cycle.');
    } catch (err: any) {
      setError(err?.message || 'Logout failed.');
    } finally {
      setLoggingOutAll(false);
    }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    setNotice('');
    setError('');
    try {
      const input = window.prompt('Type DELETE to permanently remove your account.', '');
      if (input !== 'DELETE') {
        setError('Account deletion cancelled. Type DELETE exactly to confirm.');
        return;
      }
      await authService.deleteAccount(input);
      setUser(null);
      setNotice('Your account has been deleted successfully.');
    } catch (err: any) {
      setError(err?.message || 'Failed to delete account.');
    } finally {
      setDeleting(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Profile</h1>
          <p className="text-slate-500 mb-6">Login required to access your profile.</p>
          <Link to="/dashboard">
            <Button variant="primary">Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isGoogleUser = user.provider === 'google';

  return (
    <>
      <Helmet>
        <title>My Profile - LAK PDF</title>
        <meta name="description" content="Manage your LAK PDF account, usage, and security settings." />
      </Helmet>
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">My Profile</h1>
            <p className="text-slate-500 mt-1">Account, usage and security overview</p>
          </div>
          <Button variant="secondary" onClick={exportData}>
            <Download className="w-4 h-4 mr-2" /> Export Data
          </Button>
        </div>

        {notice && (
          <div className="rounded-xl border border-green-200 bg-green-50 text-green-700 px-4 py-3 text-sm">{notice}</div>
        )}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>
        )}

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-4">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-20 h-20 rounded-full object-cover ring-4 ring-primary-100" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center">
                  <UserIcon className="w-10 h-10" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xl font-bold text-slate-900 truncate">{user.name}</p>
                <p className="text-sm text-slate-500 truncate">{user.email}</p>
              </div>
            </div>
            <div className="mt-6 space-y-3 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                <span>{user.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-slate-400" />
                <span>Joined: {user.joinedAt ? new Date(user.joinedAt).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-slate-400" />
                <span>Login Provider: {user.provider === 'google' ? 'Google' : 'Email + Password'}</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Usage Stats</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500">Tools Used</p>
                <p className="text-2xl font-bold text-slate-900">{stats.toolsUsed}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500">PDFs Processed</p>
                <p className="text-2xl font-bold text-slate-900">{stats.filesProcessed}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500">Conversions</p>
                <p className="text-2xl font-bold text-slate-900">{conversionsCount}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500">Last Active</p>
                <p className="text-sm font-semibold text-slate-900">{formatWhen(stats.lastActive)}</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-700">Storage Usage</p>
                <p className="text-sm text-slate-500">{formatFileSize(totalBytes)} / 100 MB</p>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-primary-500 rounded-full transition-all duration-700" style={{ width: `${storagePct}%` }} />
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6" id="settings">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
              <span className="text-sm text-slate-700">Email updates</span>
              <input
                type="checkbox"
                checked={settings.emailUpdates}
                onChange={(e) => setSettings((prev) => ({ ...prev, emailUpdates: e.target.checked }))}
                className="h-4 w-4 accent-primary-500"
              />
            </label>

            <label className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
              <span className="text-sm text-slate-700">Weekly summary</span>
              <input
                type="checkbox"
                checked={settings.weeklySummary}
                onChange={(e) => setSettings((prev) => ({ ...prev, weeklySummary: e.target.checked }))}
                className="h-4 w-4 accent-primary-500"
              />
            </label>

            <label className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
              <span className="text-sm text-slate-700">Compact dashboard</span>
              <input
                type="checkbox"
                checked={settings.compactDashboard}
                onChange={(e) => setSettings((prev) => ({ ...prev, compactDashboard: e.target.checked }))}
                className="h-4 w-4 accent-primary-500"
              />
            </label>

            <div className="rounded-xl border border-slate-200 px-4 py-3">
              <label className="text-sm text-slate-700 block mb-2">Theme</label>
              <select
                value={settings.theme}
                onChange={(e) => setSettings((prev) => ({ ...prev, theme: e.target.value as 'light' | 'dark' }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
          </div>
          <div className="mt-4">
            <Button variant="primary" onClick={saveSettings} isLoading={savingSettings}>
              Save Settings
            </Button>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6" id="activity">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Recent Activity</h2>
          {history.length === 0 ? (
            <p className="text-slate-500">No activity yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="py-2 pr-3">File</th>
                    <th className="py-2 pr-3">Tool</th>
                    <th className="py-2 pr-3">Size</th>
                    <th className="py-2 pr-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 8).map((item) => (
                    <tr key={item.id} className="border-b border-slate-50">
                      <td className="py-2 pr-3 font-medium text-slate-800">{item.name}</td>
                      <td className="py-2 pr-3 text-slate-600">{item.tool}</td>
                      <td className="py-2 pr-3 text-slate-600">{formatFileSize(item.size || 0)}</td>
                      <td className="py-2 pr-3 text-slate-600">{formatWhen(item.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6" id="security">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Security</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!isGoogleUser ? (
              <button
                type="button"
                onClick={sendPasswordReset}
                disabled={sendingReset}
                className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 hover:bg-slate-50 transition-colors"
              >
                <span className="flex items-center gap-2 text-slate-700">
                  <KeyRound className="w-4 h-4" /> Change Password
                </span>
                <span className="text-xs text-slate-400">{sendingReset ? 'Sending...' : 'Send OTP'}</span>
              </button>
            ) : (
              <a
                href="https://myaccount.google.com/security"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 hover:bg-slate-50 transition-colors"
              >
                <span className="flex items-center gap-2 text-slate-700">
                  <KeyRound className="w-4 h-4" /> Manage Google Password
                </span>
                <span className="text-xs text-slate-400">Open</span>
              </a>
            )}

            <button
              type="button"
              onClick={logoutAllDevices}
              disabled={loggingOutAll}
              className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 hover:bg-slate-50 transition-colors"
            >
              <span className="flex items-center gap-2 text-slate-700">
                <LogOut className="w-4 h-4" /> Logout from all devices
              </span>
              <span className="text-xs text-slate-400">{loggingOutAll ? 'Working...' : 'Now'}</span>
            </button>

            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
              <span className="flex items-center gap-2 text-slate-700">
                <ShieldCheck className="w-4 h-4" /> Linked Accounts
              </span>
              <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                {user.provider === 'google' ? 'Google linked' : 'Email linked'}
              </span>
            </div>

            <button
              type="button"
              onClick={deleteAccount}
              disabled={deleting}
              className="flex items-center justify-between rounded-xl border border-red-200 px-4 py-3 hover:bg-red-50 transition-colors"
            >
              <span className="flex items-center gap-2 text-red-600">
                <Trash2 className="w-4 h-4" /> Delete Account
              </span>
              <span className="text-xs text-red-400">{deleting ? 'Checking...' : 'Request'}</span>
            </button>
          </div>

          {!isGoogleUser ? (
            <>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  id="profile-otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter OTP"
                  maxLength={6}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                />
              </div>
              <div className="mt-3">
                <Button variant="secondary" onClick={updatePasswordWithOtp} isLoading={updatingPassword}>
                  Update Password
                </Button>
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              You are logged in with Google. Password changes are managed in your Google account settings.
            </p>
          )}

          <div className="mt-6 rounded-xl border border-slate-200 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-slate-500" />
              <div>
                <p className="text-sm font-medium text-slate-800">API Usage</p>
                <p className="text-xs text-slate-500">Future-ready tracking for AI tool requests</p>
              </div>
            </div>
            <span className="text-sm font-semibold text-slate-700">0 req</span>
          </div>

          <div className="mt-3 rounded-xl border border-slate-200 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock3 className="w-5 h-5 text-slate-500" />
              <div>
                <p className="text-sm font-medium text-slate-800">Download History</p>
                <p className="text-xs text-slate-500">Based on your recent file activity</p>
              </div>
            </div>
            <span className="text-sm font-semibold text-slate-700">{history.length}</span>
          </div>
        </section>
      </div>
    </>
  );
};

export default Profile;
