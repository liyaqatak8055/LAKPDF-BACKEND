import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { adminService, User } from '../services/authService';

interface ProtectedAdminRouteProps {
  children: React.ReactNode;
}

export const ProtectedAdminRoute: React.FC<ProtectedAdminRouteProps> = ({ children }) => {
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [status, setStatus] = useState<'loading' | 'authorized' | 'unauthorized' | 'unauthenticated'>('loading');
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;

    const verifyAdmin = async () => {
      try {
        const user = await adminService.getMe();
        if (!isMounted) return;

        if (user && user.role === 'admin') {
          setAdminUser(user);
          setStatus('authorized');
        } else if (user) {
          setStatus('unauthorized');
        } else {
          setStatus('unauthenticated');
        }
      } catch (err: any) {
        if (!isMounted) return;
        const msg = String(err?.message || '');
        if (msg.includes('FORBIDDEN') || msg.includes('403')) {
          setStatus('unauthorized');
        } else {
          setStatus('unauthenticated');
        }
      }
    };

    verifyAdmin();

    return () => {
      isMounted = false;
    };
  }, [location.pathname]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
        <div className="w-12 h-12 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin mb-4" />
        <div className="text-slate-300 text-sm font-medium tracking-wide">
          Verifying Admin Authorization...
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (status === 'unauthorized') {
    return <Navigate to="/admin/unauthorized" replace />;
  }

  return <>{children}</>;
};

export default ProtectedAdminRoute;
