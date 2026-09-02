import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, FilePlus, History, User } from 'lucide-react';

interface BottomNavProps {
  onMenuClick: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onMenuClick }) => {
  const location = useLocation();
  
  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/tools', icon: FilePlus, label: 'Tools' },
    { path: '/dashboard', icon: History, label: 'Dashboard' },
    { path: '/about', icon: User, label: 'About' },
  ];

  // Check if current route is a tool page (not home)
  const isToolPage = location.pathname !== '/';
  const currentPath = isToolPage ? '/merge' : location.pathname;

  return (
    <>
      {/* Spacer for fixed bottom nav */}
      <div className="h-20" />
      
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 
                      px-2 py-2 pb-safe z-50 safe-area-pb">
        <div className="flex items-center justify-around">
          {/* Home */}
          <Link
            to="/"
            className={`bottom-nav-item ${location.pathname === '/' ? 'active' : ''}`}
          >
            <Home />
            <span className="text-[10px] font-medium">Home</span>
          </Link>

          {/* Tools Dropdown */}
          <div className="relative group">
            <button
              onClick={onMenuClick}
              className={`bottom-nav-item ${isToolPage ? 'active' : ''}`}
            >
              <FilePlus />
              <span className="text-[10px] font-medium">Tools</span>
            </button>
            
            {/* Dropdown menu */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 
                          bg-white rounded-xl shadow-xl border border-slate-200 
                          opacity-0 invisible group-hover:opacity-100 group-hover:visible
                          transition-all duration-200 min-w-48 p-2">
              <div className="grid grid-cols-2 gap-1">
                <Link to="/merge" className="px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg">
                  Merge PDF
                </Link>
                <Link to="/split" className="px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg">
                  Split PDF
                </Link>
                <Link to="/compress" className="px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg">
                  Compress
                </Link>
                <Link to="/convert" className="px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg">
                  Convert
                </Link>
                <Link to="/pdf-to-word" className="px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg">
                  To Word
                </Link>
                <Link to="/img-to-pdf" className="px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg">
                  Image to PDF
                </Link>
              </div>
            </div>
          </div>

          {/* Dashboard */}
          <Link
            to="/dashboard"
            className={`bottom-nav-item ${location.pathname === '/dashboard' ? 'active' : ''}`}
          >
            <History />
            <span className="text-[10px] font-medium">Dashboard</span>
          </Link>

          {/* About */}
          <Link
            to="/about"
            className={`bottom-nav-item ${location.pathname === '/about' ? 'active' : ''}`}
          >
            <User />
            <span className="text-[10px] font-medium">About</span>
          </Link>
        </div>
      </div>
      
      <style>{`
        .pb-safe {
          padding-bottom: max(8px, env(safe-area-inset-bottom));
        }
        .safe-area-pb {
          padding-bottom: env(safe-area-inset-bottom);
        }
      `}</style>
    </>
  );
};
