import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Wrench,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  Megaphone,
  Terminal,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import { adminService, User, SystemControlConfig } from '../services/authService';

export const AdminLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [adminUser, setAdminUser] = useState<User | null>(adminService.getCurrentUser());
  const [systemConfig, setSystemConfig] = useState<SystemControlConfig | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    adminService
      .getMe()
      .then((user) => setAdminUser(user))
      .catch(() => {});

    adminService
      .getConfig()
      .then((cfg) => setSystemConfig(cfg))
      .catch(() => {});
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await adminService.logout();
    navigate('/admin/login', { replace: true });
  };

  const navItems = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Users Control', path: '/admin/users', icon: Users },
    { label: 'PDF Tools Control', path: '/admin/tools', icon: Wrench },
    { label: 'Announcements', path: '/admin/announcements', icon: Megaphone },
    { label: 'Live Logs & Telemetry', path: '/admin/logs', icon: Terminal },
    { label: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
    { label: 'Settings & Security', path: '/admin/settings', icon: Settings },
  ];

  const renderSidebarContent = (isMobile = false) => (
    <div className="flex flex-col h-full bg-white">
      {/* Sidebar Header / Logo */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 bg-white shrink-0">
        <Link to="/admin/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight text-slate-900 flex items-center gap-1.5">
              LAK <span className="text-emerald-600">PDF</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                Admin
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium">All-in-One Command Center</div>
          </div>
        </Link>

        {isMobile && (
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto bg-white">
        <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Command Hub
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0 transition-colors" />
              <span className="flex-1">{item.label}</span>
              <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
            </NavLink>
          );
        })}

        <div className="pt-6 px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Public Site
        </div>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors group"
        >
          <ExternalLink className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-slate-600" />
          <span className="flex-1">Open Live Website</span>
        </a>
      </nav>

      {/* Sidebar Footer: Profile & Logout */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/80 shrink-0">
        <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-xs shrink-0">
              {adminUser?.name?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate">
                {adminUser?.name || 'Administrator'}
              </div>
              <div className="text-[10px] text-slate-500 truncate font-medium">
                {adminUser?.email || 'admin@lakpdf.com'}
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 text-xs font-bold transition-colors shadow-sm cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row">
      {/* Mobile Drawer */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
          />
          <aside className="fixed top-0 bottom-0 left-0 w-64 bg-white border-r border-slate-200 z-50 shadow-2xl flex flex-col">
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}

      {/* Desktop Fixed Column Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 h-screen sticky top-0 shrink-0 z-20 shadow-sm">
        {renderSidebarContent(false)}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 min-h-screen">
        {/* Top Header */}
        <header className="h-16 sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-sm font-semibold text-slate-600 hidden sm:flex items-center gap-2">
              <span className="text-slate-500">Admin Portal</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-900 capitalize font-bold">
                {location.pathname.split('/')[2]?.replace('-', ' ') || 'Dashboard'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {systemConfig?.maintenanceMode ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Maintenance Mode Active</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>System Operational</span>
              </div>
            )}
          </div>
        </header>

        {/* Dynamic Nested Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto bg-slate-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
