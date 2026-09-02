import React, { useCallback, useRef, useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { authService, User } from '../services/authService';
import {
  Mail,
  Lock,
  User as UserIcon,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  KeyRound,
  Eye,
  EyeOff,
  X,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  initialMode?: 'login' | 'signup';
}

type AuthMode = 'login' | 'signup' | 'forgot' | 'reset';

export const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onClose, 
  onLoginSuccess,
  initialMode = 'login' 
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleSdkInitRef = useRef(false);
  const [googleReady, setGoogleReady] = useState(false);

  // Reset state when opening
  React.useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError('');
      setSuccessMsg('');
      setName('');
      setEmail('');
      setPassword('');
      setOtp('');
      setNewPassword('');
      setShowPassword(false);
      setShowNewPassword(false);
      setGoogleReady(false);
    }
  }, [isOpen, initialMode]);

  const loadGoogleScript = () =>
    new Promise<void>((resolve, reject) => {
      if ((window as any).google?.accounts?.id) {
        resolve();
        return;
      }
      const existing = document.querySelector('script[data-google-identity="true"]') as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Failed to load Google script')), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.dataset.googleIdentity = 'true';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google script'));
      document.head.appendChild(script);
    });

  const handleGoogleCredential = useCallback(async (credential: string) => {
    if (!credential) {
      setError('Google sign-in failed. Missing token.');
      return;
    }
    setGoogleLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const user = await authService.loginWithGoogle(credential);
      onLoginSuccess(user);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Google sign-in failed.');
    } finally {
      setGoogleLoading(false);
    }
  }, [onClose, onLoginSuccess]);

  const initGoogleAuth = useCallback(async () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError('Google sign-in is not configured. Missing VITE_GOOGLE_CLIENT_ID.');
      return;
    }

    try {
      await loadGoogleScript();
      const googleSdk = (window as any).google;
      if (!googleSdk?.accounts?.id) {
        throw new Error('Google SDK is not available.');
      }

      if (!googleSdkInitRef.current) {
        googleSdk.accounts.id.initialize({
          client_id: clientId,
          callback: (response: { credential?: string }) => {
            const credential = String(response?.credential || '').trim();
            void handleGoogleCredential(credential);
          },
          auto_select: false,
          cancel_on_tap_outside: true,
          use_fedcm_for_prompt: true,
          itp_support: true,
        });
        googleSdkInitRef.current = true;
      }
      setGoogleReady(true);
      setError('');
    } catch (err: any) {
      setGoogleReady(false);
      setError(err?.message || 'Google sign-in is unavailable right now.');
    }
  }, [handleGoogleCredential]);

  const handleGoogleSignInClick = async () => {
    if (!googleReady) {
      await initGoogleAuth();
    }
    try {
      const googleSdk = (window as any).google;
      if (!googleSdk?.accounts?.id) {
        throw new Error('Google sign-in is unavailable right now.');
      }
      setError('');
      setGoogleLoading(true);
      googleSdk.accounts.id.prompt((notification: any) => {
        if (notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.()) {
          setGoogleLoading(false);
        }
      });
    } catch (err: any) {
      setGoogleLoading(false);
      setError(err?.message || 'Google sign-in is unavailable right now.');
    }
  };

  React.useEffect(() => {
    if (!isOpen) return;
    if (!(mode === 'login' || mode === 'signup')) return;
    void initGoogleAuth();
  }, [isOpen, mode, initGoogleAuth]);

  const handleSocialAuthClick = (provider: 'google' | 'facebook' | 'microsoft') => {
    const providerName = provider[0].toUpperCase() + provider.slice(1);
    setError('');
    setSuccessMsg(`${providerName} login will be available soon.`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const needsEmailValidation = mode === 'login' || mode === 'signup' || mode === 'forgot' || mode === 'reset';
      if (needsEmailValidation && !normalizedEmail) throw new Error('Please enter your email');
      if (needsEmailValidation && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizedEmail)) {
        throw new Error('Please enter a valid email address');
      }

      if (mode === 'signup') {
        if (!name || !password) throw new Error("All fields are required");
        const user = await authService.register(name, normalizedEmail, password);
        onLoginSuccess(user);
        onClose();
      } else if (mode === 'login') {
        if (!password) throw new Error("All fields are required");
        const user = await authService.login(normalizedEmail, password);
        onLoginSuccess(user);
        onClose();
      } else if (mode === 'forgot') {
        await authService.requestPasswordReset(normalizedEmail);
        setEmail(normalizedEmail);
        setSuccessMsg('If this email is registered, OTP has been sent.');
        setMode('reset');
      } else if (mode === 'reset') {
        if (!otp || !newPassword) throw new Error("All fields are required");
        await authService.resetPassword(normalizedEmail, otp, newPassword);
        setSuccessMsg("Password reset successfully! Please login.");
        setMode('login');
        setPassword(''); // Clear old password input if any
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'login': return 'Welcome Back';
      case 'signup': return 'Create Account';
      case 'forgot': return 'Reset Password';
      case 'reset': return 'Verify OTP';
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      hideDefaultHeader
      contentClassName="max-w-[420px] rounded-2xl border border-slate-200/70 bg-white/95 shadow-[0_20px_60px_rgba(0,0,0,0.15)]"
      backdropClassName="bg-slate-900/45 backdrop-blur-[6px]"
    >
      <div className="p-8">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <img src="/icon-192.png" alt="LAK PDF logo" className="w-9 h-9 rounded-lg shadow-sm" />
            <div>
              <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-500">LAK PDF</p>
              <p className="text-sm text-slate-400">Secure document tools</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-slate-900">
            {mode === 'login' ? 'Welcome Back' : getTitle()}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {mode === 'login' && 'Log in to your account'}
            {mode === 'signup' && 'Create your account'}
            {mode === 'forgot' && 'Enter your email to receive OTP'}
            {mode === 'reset' && 'Verify OTP and set a new password'}
          </p>
        </div>

        {(mode === 'login' || mode === 'signup') && (
          <div className="space-y-2 mb-5">
            <button
              type="button"
              onClick={() => void handleGoogleSignInClick()}
              className="w-full h-12 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors flex items-center px-4"
            >
              <span className="w-5 text-base font-bold text-[#DB4437]">G</span>
              <span className="flex-1 text-center text-sm font-medium">Continue with Google</span>
              <span className="w-5" />
            </button>
            <button
              type="button"
              onClick={() => handleSocialAuthClick('facebook')}
              className="w-full h-12 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors flex items-center px-4"
            >
              <span className="w-5 text-base font-bold text-[#1877F2]">f</span>
              <span className="flex-1 text-center text-sm font-medium">Continue with Facebook</span>
              <span className="w-5" />
            </button>
            <button
              type="button"
              onClick={() => handleSocialAuthClick('microsoft')}
              className="w-full h-12 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors flex items-center px-4"
            >
              <span className="w-5 text-base font-semibold text-slate-700">▣</span>
              <span className="flex-1 text-center text-sm font-medium">Continue with Microsoft</span>
              <span className="w-5" />
            </button>
            {googleLoading && (
              <p className="text-xs text-slate-500 text-center">Connecting to Google...</p>
            )}
          </div>
        )}

        {(mode === 'login' || mode === 'signup') && (
          <div className="relative my-5">
            <div className="h-px bg-slate-200" />
            <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-white px-3 text-slate-400 text-xs uppercase tracking-widest">
              or
            </span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-sm text-red-600 animate-in slide-in-from-top-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-lg flex items-center gap-2 text-sm text-green-600 animate-in slide-in-from-top-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div className="space-y-1 animate-in fade-in slide-in-from-bottom-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Full Name</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full h-12 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-primary-400 focus:ring-4 focus:ring-primary-100/50 outline-none transition-all"
                  placeholder="John Doe"
                />
              </div>
            </div>
          )}

          {(mode === 'login' || mode === 'signup' || mode === 'forgot' || mode === 'reset') && (
            <div className="space-y-1 animate-in fade-in slide-in-from-bottom-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full h-12 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-primary-400 focus:ring-4 focus:ring-primary-100/50 outline-none transition-all"
                  placeholder="you@example.com"
                  readOnly={mode === 'reset'}
                />
              </div>
            </div>
          )}

          {(mode === 'login' || mode === 'signup') && (
            <div className="space-y-1 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Password</label>
                {mode === 'login' && (
                  <button 
                    type="button"
                    onClick={() => { setMode('forgot'); setError(''); }}
                    className="text-xs font-semibold text-primary-500 hover:text-primary-600 hover:underline"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full h-12 pl-10 pr-11 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-primary-400 focus:ring-4 focus:ring-primary-100/50 outline-none transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          )}

          {mode === 'reset' && (
            <>
              <div className="space-y-1 animate-in fade-in slide-in-from-bottom-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">One-Time Password (OTP)</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={otp}
                    onChange={e => setOtp(e.target.value)}
                    className="w-full h-12 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-primary-400 focus:ring-4 focus:ring-primary-100/50 outline-none transition-all tracking-widest"
                    placeholder="123456"
                    maxLength={6}
                  />
                </div>
              </div>
              <div className="space-y-1 animate-in fade-in slide-in-from-bottom-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full h-12 pl-10 pr-11 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-primary-400 focus:ring-4 focus:ring-primary-100/50 outline-none transition-all"
                  placeholder="New secure password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </>
          )}

          <Button 
            type="submit" 
            variant="primary" 
            className="w-full h-12 mt-4 rounded-xl shadow-lg shadow-primary-500/25" 
            isLoading={loading}
            size="lg"
          >
            {mode === 'login' && 'Log In'}
            {mode === 'signup' && 'Create Free Account'}
            {mode === 'forgot' && 'Send OTP'}
            {mode === 'reset' && 'Reset Password'}
          </Button>

          {mode === 'forgot' && (
             <Button 
              type="button" 
              variant="ghost" 
              className="w-full" 
              onClick={() => { setMode('login'); setError(''); }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
            </Button>
          )}
        </form>

        {(mode === 'login' || mode === 'signup') && (
          <div className="mt-5 text-center text-sm text-slate-500">
            <span>{mode === 'login' ? "Don't have an account? " : 'Already have an account? '}</span>
            <button
              type="button"
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
              className="font-bold text-primary-600 underline underline-offset-2 hover:text-primary-700"
            >
              {mode === 'login' ? 'Create account' : 'Log in'}
            </button>
          </div>
        )}
      </div>
      
      <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
        <p className="text-xs text-slate-400">
          By continuing, you agree to LAK PDF's Terms of Service and Privacy Policy.
        </p>
      </div>
    </Modal>
  );
};
