import React, { useState, useMemo } from 'react';
import { FileUploader } from '../components/FileUploader';
import { Button } from '../components/Button';
import { PdfFile, ProcessingStatus } from '../types';
import { protectPdf, downloadPdf, formatBytes } from '../services/pdfService';
import {
  Shield, Lock, X, Eye, EyeOff, Download,
  CheckCircle2, AlertCircle, Info, KeyRound
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { NextStepPanel, RelatedActions, ToolStartPanel } from '../components/ToolProductPanels';
import { Helmet } from 'react-helmet-async';
import { ToolSEOContent } from '../components/ToolSEOContent';

type StrengthLevel = 'weak' | 'fair' | 'good' | 'strong';

interface StrengthInfo {
  level: StrengthLevel;
  score: number;
  label: string;
  color: string;
  barColor: string;
  tips: string[];
}

const getPasswordStrength = (password: string): StrengthInfo => {
  let score = 0;
  const tips: string[] = [];

  if (password.length >= 8) score++;
  else tips.push('At least 8 characters');

  if (password.length >= 12) score++;
  else if (password.length < 12) tips.push('12+ characters recommended');

  if (/[A-Z]/.test(password)) score++;
  else tips.push('Add uppercase letters (A-Z)');

  if (/[a-z]/.test(password)) score++;
  else tips.push('Add lowercase letters (a-z)');

  if (/[0-9]/.test(password)) score++;
  else tips.push('Add numbers (0-9)');

  if (/[^A-Za-z0-9]/.test(password)) score++;
  else tips.push('Add special characters (!@#$)');

  let level: StrengthLevel;
  let label: string;
  let color: string;
  let barColor: string;

  if (score <= 2) { level = 'weak'; label = 'Weak'; color = 'text-red-500'; barColor = 'bg-red-500'; }
  else if (score <= 3) { level = 'fair'; label = 'Fair'; color = 'text-orange-500'; barColor = 'bg-orange-400'; }
  else if (score <= 4) { level = 'good'; label = 'Good'; color = 'text-yellow-500'; barColor = 'bg-yellow-400'; }
  else { level = 'strong'; label = 'Strong'; color = 'text-green-500'; barColor = 'bg-green-500'; }

  return { level, score, label, color, barColor, tips };
};

export const ProtectPdf: React.FC = () => {
  const [file, setFile] = useState<PdfFile | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus] = useState<ProcessingStatus>({ isProcessing: false, message: '' });
  const [readyPdf, setReadyPdf] = useState<{ data: Uint8Array; name: string } | null>(null);

  const strength = useMemo(() => password ? getPasswordStrength(password) : null, [password]);
  const passwordsMatch = confirmPassword ? password === confirmPassword : null;
  const canProtect = !!file && password.length >= 4 && password === confirmPassword;

  const handleFileSelected = (selectedFiles: File[]) => {
    if (selectedFiles.length > 0) {
      setFile({ id: uuidv4(), file: selectedFiles[0], name: selectedFiles[0].name, size: selectedFiles[0].size });
      setReadyPdf(null);
      setStatus({ isProcessing: false, message: '' });
    }
  };

  const handleProtect = async () => {
    if (!file || !password || password !== confirmPassword) return;
    setStatus({ isProcessing: true, message: 'Encrypting PDF...' });

    try {
      const protectedBytes = await protectPdf(file.file, password);
      const outputName = `protected-${file.name}`;
      setReadyPdf({ data: protectedBytes, name: outputName });
      downloadPdf(protectedBytes, outputName, { autoDownload: false });
      setStatus({ isProcessing: false, message: 'PDF protected successfully!', success: true });
    } catch (error) {
      console.error(error);
      setStatus({ isProcessing: false, message: 'Error protecting file. Please try again.', error: 'Failed' });
    }
  };

  const handleDownloadReady = () => {
    if (!readyPdf) return;
    downloadPdf(readyPdf.data, readyPdf.name, { autoDownload: true });
  };

  const reset = () => {
    setFile(null); setPassword(''); setConfirmPassword('');
    setReadyPdf(null); setStatus({ isProcessing: false, message: '' });
  };

  return (
    <>
      <Helmet>
        <title>Protect PDF Online Free | Password Protect PDF - LAK PDF</title>
        <meta name="description" content="Password protect PDF online free. Add encryption to prevent unauthorized access to your PDF." />
        <link rel="canonical" href="https://lakpdf.com/protect-pdf" />
        <meta property="og:title" content="Protect PDF Online Free | Password Protect PDF - LAK PDF" />
        <meta property="og:description" content="Password protect PDF online free. Add encryption to prevent unauthorized access to your PDF." />
        <meta property="og:url" content="https://lakpdf.com/protect-pdf" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://lakpdf.com/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Protect PDF Online Free | Password Protect PDF - LAK PDF" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Protect PDF Online Free | Password Protect PDF - LAK PDF" />
        <meta name="twitter:description" content="Password protect PDF online free. Add encryption to prevent unauthorized access to your PDF." />
        <meta name="twitter:image" content="https://lakpdf.com/og-image.png" />
      </Helmet>
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Shield className="w-9 h-9 text-indigo-600" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Protect PDF</h1>
        <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto">
          Encrypt your PDF with a password so only authorized users can open it.
        </p>
      </div>

      {!file ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <FileUploader
            onFilesSelected={handleFileSelected}
            multiple={false}
            icon={<Shield className="w-12 h-12 text-indigo-500" />}
            title="Select PDF file"
            description="Drop your PDF here to protect it"
            helperText="Runs entirely in your browser"
          />
          <ToolStartPanel
            supportedFormats={['PDF']}
            fileSizeNote="No fixed cap. Encryption runs locally."
            privacyNote="Your file never leaves your device."
            workflowSteps={[
              'Upload your PDF.',
              'Set a strong password (and confirm it).',
              'Download the encrypted PDF.',
            ]}
          />
        </div>
      ) : (
        <div className="mx-auto grid max-w-4xl gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-5">
            {/* File card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                  <Shield className="w-6 h-6 text-indigo-500" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{file.name}</p>
                  <p className="text-sm text-slate-500">{formatBytes(file.size)}</p>
                </div>
              </div>
              <button onClick={reset} className="text-slate-400 hover:text-red-500 shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Password fields */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <KeyRound className="w-5 h-5 text-indigo-500" />
                <h3 className="font-semibold text-slate-800">Set Password</h3>
              </div>

              {/* Password field */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setReadyPdf(null); }}
                    className="w-full pl-9 pr-12 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    placeholder="Enter a strong password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Strength indicator */}
                {password && strength && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Password strength</span>
                      <span className={`text-xs font-semibold ${strength.color}`}>{strength.label}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${strength.barColor}`}
                        style={{ width: `${(strength.score / 6) * 100}%` }}
                      />
                    </div>
                    {strength.tips.length > 0 && strength.level !== 'strong' && (
                      <ul className="space-y-0.5">
                        {strength.tips.slice(0, 2).map((tip, i) => (
                          <li key={i} className="text-xs text-slate-400 flex items-center gap-1">
                            <span className="w-1 h-1 bg-slate-300 rounded-full shrink-0" />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full pl-9 pr-12 py-3 rounded-xl border bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 outline-none transition-all ${
                      passwordsMatch === false
                        ? 'border-red-400 focus:ring-red-400'
                        : passwordsMatch === true
                          ? 'border-green-400 focus:ring-green-400'
                          : 'border-slate-200 focus:ring-indigo-500 focus:border-indigo-500'
                    }`}
                    placeholder="Re-enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordsMatch === false && (
                  <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Passwords do not match
                  </p>
                )}
                {passwordsMatch === true && (
                  <p className="text-green-600 text-xs mt-1.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Passwords match
                  </p>
                )}
              </div>

              {/* Security note */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700">
                  <strong>Important:</strong> Save your password somewhere safe. If you forget it, the encrypted PDF cannot be recovered — even by us.
                </p>
              </div>

              {/* Status */}
              {status.message && (
                <div className={`rounded-xl px-4 py-3 text-sm flex items-center gap-2 ${
                  status.error ? 'bg-red-50 border border-red-200 text-red-700'
                  : status.success ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-blue-50 border border-blue-200 text-blue-700'
                }`}>
                  {status.error ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                  {status.message}
                </div>
              )}

              {/* Action buttons */}
              {readyPdf ? (
                <div className="space-y-3">
                  <Button variant="primary" size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleDownloadReady}>
                    <Download className="w-5 h-5 mr-2" /> Download Protected PDF
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full" onClick={reset}>
                    Protect Another PDF
                  </Button>
                </div>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                  onClick={handleProtect}
                  disabled={!canProtect || status.isProcessing}
                  isLoading={status.isProcessing}
                >
                  <Shield className="w-5 h-5 mr-2" />
                  {status.isProcessing ? 'Encrypting...' : 'Protect PDF'}
                </Button>
              )}

              {!canProtect && password && (
                <p className="text-xs text-slate-400 text-center">
                  {password.length < 4 ? 'Minimum 4 characters required' : password !== confirmPassword ? 'Passwords must match' : ''}
                </p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <NextStepPanel
              title="How it works"
              steps={[
                'Set a strong password (mix of letters, numbers, symbols).',
                'Confirm the password to avoid typos.',
                'Download and share the protected PDF securely.',
              ]}
            />
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <h4 className="font-semibold text-slate-800 mb-3 text-sm">Password Tips</h4>
              <ul className="space-y-2">
                {[
                  '8+ characters minimum',
                  'Use uppercase & lowercase',
                  'Add numbers & symbols',
                  'Avoid common words',
                  'Don\'t use personal info',
                ].map((tip, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-slate-600">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
            <RelatedActions
              actions={[
                { label: 'Unlock PDF', to: '/unlock-pdf' },
                { label: 'Watermark PDF', to: '/watermark' },
                { label: 'Compress PDF', to: '/compress' },
              ]}
            />
          </div>
        </div>
      )}
      <ToolSEOContent toolKey="/protect-pdf" />
    </div>
    </>
  );
};
