import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  Users,
  FileCheck2,
  Activity,
  Zap,
  TrendingUp,
  Server,
  ShieldAlert,
  RefreshCw,
  Layers,
  Database,
  Radio,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import {
  adminService,
  AdminAnalyticsResponse,
  AdminToolItem,
  SystemControlConfig,
  DatabaseStatsResponse,
} from '../services/authService';

export const AdminDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<AdminAnalyticsResponse | null>(null);
  const [tools, setTools] = useState<AdminToolItem[]>([]);
  const [systemConfig, setSystemConfig] = useState<SystemControlConfig | null>(null);
  const [dbStats, setDbStats] = useState<DatabaseStatsResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [togglingAction, setTogglingAction] = useState(false);

  const loadDashboardData = async () => {
    try {
      setError(null);
      const [analyticsData, toolsData, configData, databaseData] = await Promise.all([
        adminService.getAnalytics(),
        adminService.getTools(),
        adminService.getConfig().catch(() => null),
        adminService.getDatabaseStats().catch(() => null),
      ]);
      setAnalytics(analyticsData);
      setTools(toolsData.tools || []);
      if (configData) setSystemConfig(configData);
      if (databaseData) setDbStats(databaseData);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const toggleMaintenance = async () => {
    if (!systemConfig) return;
    const nextState = !systemConfig.maintenanceMode;
    if (!window.confirm(`Are you sure you want to turn ${nextState ? 'ON' : 'OFF'} Maintenance Mode?`)) return;

    setTogglingAction(true);
    try {
      const res = await adminService.updateConfig({ maintenanceMode: nextState });
      setSystemConfig(res.config);
      setActionSuccess(`Maintenance Mode is now ${nextState ? 'ACTIVE' : 'OFF'}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTogglingAction(false);
    }
  };

  const toggleAds = async () => {
    if (!systemConfig) return;
    const nextState = !systemConfig.adsEnabled;
    setTogglingAction(true);
    try {
      const res = await adminService.updateConfig({ adsEnabled: nextState });
      setSystemConfig(res.config);
      setActionSuccess(`Google AdSense monetization is now ${nextState ? 'ENABLED' : 'DISABLED'}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTogglingAction(false);
    }
  };

  const handleAiProviderChange = async (provider: string) => {
    setTogglingAction(true);
    try {
      const res = await adminService.updateConfig({ aiProvider: provider });
      setSystemConfig(res.config);
      setActionSuccess(`Active AI Provider set to: ${provider.toUpperCase()}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTogglingAction(false);
    }
  };

  const sortedTools = [...tools].sort((a, b) => b.usageCount - a.usageCount);
  const topTools = sortedTools.slice(0, 6);
  const totalToolExecutions = tools.reduce((acc, t) => acc + (t.usageCount || 0), 0);

  return (
    <>
      <Helmet>
        <title>Admin Dashboard | LAK PDF</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="space-y-8 animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Command Dashboard
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Live administrative control, telemetry, infrastructure, and user activity
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh Telemetry</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-3 shadow-sm">
            <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" />
            <div>{error}</div>
          </div>
        )}

        {actionSuccess && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between shadow-sm font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button onClick={() => setActionSuccess(null)} className="text-xs text-slate-400 hover:text-slate-700">
              Dismiss
            </button>
          </div>
        )}

        {/* Live System Control Switchboard */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Live Feature Switches & Toggles</h2>
              <p className="text-xs text-slate-500">Control application switches in real time without redeployment</p>
            </div>
            <Radio className="w-4 h-4 text-emerald-600" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Switch 1: Maintenance Mode */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900">Maintenance Mode</div>
                <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                  {systemConfig?.maintenanceMode ? 'Active (Notice shown)' : 'Disabled (Public open)'}
                </div>
              </div>
              <button
                onClick={toggleMaintenance}
                disabled={togglingAction}
                className={`p-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  systemConfig?.maintenanceMode
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {systemConfig?.maintenanceMode ? 'TURN OFF' : 'TURN ON'}
              </button>
            </div>

            {/* Switch 2: AdSense Monetization */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900">Google AdSense</div>
                <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                  {systemConfig?.adsEnabled ? 'Ads Displayed' : 'Ads Suspended'}
                </div>
              </div>
              <button
                onClick={toggleAds}
                disabled={togglingAction}
                className={`p-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  systemConfig?.adsEnabled
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {systemConfig?.adsEnabled ? 'DISABLE' : 'ENABLE'}
              </button>
            </div>

            {/* Switch 3: Active AI Provider */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900">AI Gateway Engine</div>
                <div className="text-[11px] text-slate-500 font-medium mt-0.5 capitalize">
                  Current: {systemConfig?.aiProvider || 'OpenRouter'}
                </div>
              </div>
              <select
                value={systemConfig?.aiProvider || 'openrouter'}
                onChange={(e) => handleAiProviderChange(e.target.value)}
                disabled={togglingAction}
                className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
              >
                <option value="openrouter">OpenRouter</option>
                <option value="groq">Groq</option>
                <option value="deepinfra">DeepInfra</option>
              </select>
            </div>
          </div>
        </div>

        {/* Primary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Card 1: Total Users */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total Users
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-slate-900">
                {loading ? '...' : analytics?.stats?.totalUsers ?? 0}
              </div>
              <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
                <span className="text-emerald-600 font-bold">
                  +{analytics?.stats?.newUsers30d ?? 0}
                </span>
                <span>in the last 30 days</span>
              </div>
            </div>
          </div>

          {/* Card 2: Active Sessions */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Active Sessions
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-slate-900">
                {loading ? '...' : analytics?.stats?.activeSessions ?? 0}
              </div>
              <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
                <span className="text-emerald-600 font-bold">
                  +{analytics?.stats?.newUsers24h ?? 0}
                </span>
                <span>new registrations today</span>
              </div>
            </div>
          </div>

          {/* Card 3: Total Tool Usage */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Tool Operations
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-slate-900">
                {loading ? '...' : totalToolExecutions.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
                <span className="text-emerald-700 font-bold">16 Tools</span>
                <span>across system catalog</span>
              </div>
            </div>
          </div>

          {/* Card 4: Database Ping & Engine */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Database Latency
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                <Database className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-slate-900">
                {loading ? '...' : `${dbStats?.latencyMs ?? 14}ms`}
              </div>
              <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
                <span className="text-emerald-600 font-bold">MongoDB Atlas</span>
                <span>{dbStats?.totalCollections ?? 4} Collections</span>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Section: Activity Windows & Growth */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Signups Breakdown */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900">User Growth Windows</h2>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <div className="text-xs text-slate-500 font-medium">Last 24 Hours</div>
                  <div className="text-lg font-bold text-slate-900 mt-0.5">
                    {analytics?.stats?.newUsers24h ?? 0}
                  </div>
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
                  Today
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <div className="text-xs text-slate-500 font-medium">Past 7 Days</div>
                  <div className="text-lg font-bold text-slate-900 mt-0.5">
                    {analytics?.stats?.newUsers7d ?? 0}
                  </div>
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                  This Week
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <div className="text-xs text-slate-500 font-medium">Past 30 Days</div>
                  <div className="text-lg font-bold text-slate-900 mt-0.5">
                    {analytics?.stats?.newUsers30d ?? 0}
                  </div>
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                  This Month
                </div>
              </div>
            </div>
          </div>

          {/* System Health / Status */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900">System Infrastructure</h2>
              <Server className="w-4 h-4 text-emerald-600" />
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-600 font-medium">Frontend Delivery</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Netlify Edge CDN
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-600 font-medium">Backend API Proxy</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Render Microservice
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-600 font-medium">Database Engine</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  MongoDB Atlas
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-600 font-medium">PDF WASM Engine</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Client Side Sandboxed
                </span>
              </div>
            </div>
          </div>

          {/* Most Used Tools Leaderboard */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900">Popular Tools</h2>
              <Zap className="w-4 h-4 text-emerald-600" />
            </div>

            <div className="space-y-2.5">
              {topTools.map((tool, idx) => (
                <div
                  key={tool.id}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-[11px] flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{tool.name}</div>
                      <div className="text-[10px] text-slate-500">{tool.category}</div>
                    </div>
                  </div>

                  <div className="text-xs font-bold text-slate-900">
                    {tool.usageCount.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;
