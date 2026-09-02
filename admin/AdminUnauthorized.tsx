import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';
import { adminService } from '../services/authService';

export const AdminUnauthorized: React.FC = () => {
  const navigate = useNavigate();

  const handleSwitchAccount = async () => {
    await adminService.logout();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-900">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-xl">
        <div className="w-16 h-16 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Access Denied</h1>
        <p className="text-slate-600 text-sm leading-relaxed mb-6 font-medium">
          You are authenticated, but your account does not have administrator privileges to access the LakPDF Admin Panel.
        </p>

        <div className="space-y-3">
          <Link
            to="/"
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md shadow-emerald-600/20 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to LakPDF Home
          </Link>

          <button
            onClick={handleSwitchAccount}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 text-sm font-bold shadow-sm transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign in as different user
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminUnauthorized;
