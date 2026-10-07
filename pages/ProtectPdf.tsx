import React, { useState, useMemo } from 'react';
import { FileUploader } from '../components/FileUploader';
import { Button } from '../components/Button';
import { PdfFile, ProcessingStatus } from '../types';
import { protectPdf, downloadPdf, formatBytes } from '../services/pdfService';
import {
  Shield, Lock, X, Eye, EyeOff, Download,
  CheckCircle2, AlertCircle, Info, KeyRound,
  Sliders, ChevronDown, ChevronUp, Printer, Copy, Edit3, FileCheck
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

  // Advanced Security Settings
  const [algorithm, setAlgorithm] = useState<'AES-256' | 'RC4'>('AES-256');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [allowPrinting, setAllowPrinting] = useState(true);
  const [allowCopying, setAllowCopying] = useState(true);
  const [allowFillingForms, setAllowFillingForms] = useState(true);
  const [allowModifying, setAllowModifying] = useState(false);
  const [ownerPassword, setOwnerPassword] = useState('');
  const [showOwnerPassword, setShowOwnerPassword] = useState(false);

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
    setStatus({ isProcessing: true, message: 'Encrypting PDF streams (0%)...' });

    try {
      const protectedBytes = await protectPdf(
        file.file,
        password,
        {
          algorithm,
          ownerPassword: ownerPassword.trim() || undefined,
          allowPrinting,
          allowCopying,
          allowFillingForms,
          allowModifying,
        },
        (pct) => {
          setStatus({ isProcessing: true, message: `Encrypting PDF (${pct}%)...` });
        }
      );
      const outputName = `protected-${file.name}`;
      setReadyPdf({ data: protectedBytes, name: outputName });
      downloadPdf(protectedBytes, outputName, { autoDownload: false });
      setStatus({ isProcessing: false, message: 'PDF encrypted successfully with vector quality preserved!', success: true });
    } catch (error: any) {
      console.error(error);
      const errorMsg = error?.message || 'Error protecting file. Please try again.';
      setStatus({ isProcessing: false, message: errorMsg, error: 'Failed' });
    }
  };

  const handleDownloadReady = () => {
    if (!readyPdf) return;
    downloadPdf(readyPdf.data, readyPdf.name, { autoDownload: true });
  };

  const reset = () => {
    setFile(null);
    setPassword('');
    setConfirmPassword('');
    setOwnerPassword('');
    setReadyPdf(null);
    setStatus({ isProcessing: false, message: '' });
  };

  return (
    <>
      <Helmet>
        <title>Protect PDF Online Free | Password Protect PDF - LAK PDF</title>
        <meta name="description" content="Password protect PDF online free with standard AES-256 encryption. Preserves 100% vector fonts, selectable text, and zero cloud uploads." />
        <link rel="canonical" href="https://lakpdf.com/protect-pdf" />
        <meta property="og:title" content="Protect PDF Online Free | Password Protect PDF - LAK PDF" />
        <meta property="og:description" content="Password protect PDF online free with standard AES-256 encryption. Preserves 100% vector fonts, selectable text, and zero cloud uploads." />
        <meta property="og:url" content="https://lakpdf.com/protect-pdf" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://lakpdf.com/og-image.png" />
      </Helmet>

      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 mb-3">
            <Lock size={14} /> ISO 32000-2 AES-256 Encryption &bull; Zero Rasterization
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">Protect PDF</h1>
          <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
            Encrypt your PDF with standard military-grade password protection. Keeps original vector fonts, text layers, and links crystal clear.
          </p>
        </div>

        {!file ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <FileUploader
              onFilesSelected={handleFileSelected}
              multiple={false}
              icon={<Shield className="w-12 h-12 text-indigo-500" />}
              title="Select PDF file"
              description="Drop your PDF here to protect it with password encryption"
              helperText="Runs 100% locally in your browser"
            />
            <ToolStartPanel
              supportedFormats={['PDF documents']}
              fileSizeNote="Zero cloud uploads. Direct vector stream encryption via Web Crypto API."
              privacyNote="Your files and passwords never leave your device."
              workflowSteps={[
                'Upload your PDF document.',
                'Set your document open password & permissions.',
                'Download the encrypted, vector-preserved PDF.',
              ]}
            />
          </div>
        ) : (
          <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-5">
              {/* File card */}
              <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-sm border border-slate-200 dark:border-dark-border p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-950/60 rounded-xl flex items-center justify-center shrink-0">
                    <Shield className="w-6 h-6 text-indigo-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white truncate">{file.name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{formatBytes(file.size)}</p>
                  </div>
                </div>
                <button onClick={reset} className="text-slate-400 hover:text-red-500 shrink-0 cursor-pointer p-1" title="Remove file">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Password & Security Card */}
              <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-sm border border-slate-200 dark:border-dark-border p-6 space-y-5">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-indigo-500" />
                    <h3 className="font-semibold text-slate-800 dark:text-white">Set Open Password</h3>
                  </div>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 dark:bg-dark-bg text-slate-600 dark:text-slate-300 font-mono">
                    {algorithm}
                  </span>
                </div>

                {/* Password field */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Document Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setReadyPdf(null); }}
                      className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-dark-surface focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                      placeholder="Enter open password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Strength indicator */}
                  {password && strength && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 dark:text-slate-400">Password strength</span>
                        <span className={`text-xs font-semibold ${strength.color}`}>{strength.label}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 dark:bg-dark-border rounded-full overflow-hidden">
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
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full pl-10 pr-12 py-3 rounded-xl border bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-dark-surface focus:ring-2 outline-none transition-all text-sm ${
                        passwordsMatch === false
                          ? 'border-red-400 focus:ring-red-400'
                          : passwordsMatch === true
                            ? 'border-green-400 focus:ring-green-400'
                            : 'border-slate-200 dark:border-dark-border focus:ring-indigo-500 focus:border-indigo-500'
                      }`}
                      placeholder="Re-enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordsMatch === false && (
                    <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Passwords do not match
                    </p>
                  )}
                  {passwordsMatch === true && (
                    <p className="text-green-600 text-xs mt-1.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Passwords match
                    </p>
                  )}
                </div>

                {/* ADVANCED PERMISSIONS ACCORDION */}
                <div className="border border-slate-200 dark:border-dark-border rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-dark-bg/60 hover:bg-slate-100 dark:hover:bg-dark-hover flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Sliders size={14} className="text-indigo-500" />
                      <span>Advanced Encryption & Permissions</span>
                    </div>
                    {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  {showAdvanced && (
                    <div className="p-4 space-y-4 bg-white dark:bg-dark-surface border-t border-slate-200 dark:border-dark-border">
                      {/* Encryption Standard */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Encryption Standard
                        </label>
                        <select
                          value={algorithm}
                          onChange={(e) => setAlgorithm(e.target.value as any)}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-bg text-slate-900 dark:text-white rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="AES-256">AES-256 (PDF 2.0 / Adobe Acrobat Standard - Recommended)</option>
                          <option value="RC4">RC4 128-bit (Legacy compatibility mode)</option>
                        </select>
                      </div>

                      {/* Permissions Toggles */}
                      <div className="space-y-2 pt-2">
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Document Permissions
                        </label>

                        <label className="flex items-center justify-between p-2 rounded-lg border border-slate-100 dark:border-dark-border hover:bg-slate-50 dark:hover:bg-dark-bg/40 cursor-pointer">
                          <span className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                            <Printer size={14} className="text-slate-400" /> Allow Printing
                          </span>
                          <input
                            type="checkbox"
                            checked={allowPrinting}
                            onChange={(e) => setAllowPrinting(e.target.checked)}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                          />
                        </label>

                        <label className="flex items-center justify-between p-2 rounded-lg border border-slate-100 dark:border-dark-border hover:bg-slate-50 dark:hover:bg-dark-bg/40 cursor-pointer">
                          <span className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                            <Copy size={14} className="text-slate-400" /> Allow Copying Text & Graphics
                          </span>
                          <input
                            type="checkbox"
                            checked={allowCopying}
                            onChange={(e) => setAllowCopying(e.target.checked)}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                          />
                        </label>

                        <label className="flex items-center justify-between p-2 rounded-lg border border-slate-100 dark:border-dark-border hover:bg-slate-50 dark:hover:bg-dark-bg/40 cursor-pointer">
                          <span className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                            <FileCheck size={14} className="text-slate-400" /> Allow Form Filling & Signatures
                          </span>
                          <input
                            type="checkbox"
                            checked={allowFillingForms}
                            onChange={(e) => setAllowFillingForms(e.target.checked)}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                          />
                        </label>

                        <label className="flex items-center justify-between p-2 rounded-lg border border-slate-100 dark:border-dark-border hover:bg-slate-50 dark:hover:bg-dark-bg/40 cursor-pointer">
                          <span className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                            <Edit3 size={14} className="text-slate-400" /> Allow Modifying Content
                          </span>
                          <input
                            type="checkbox"
                            checked={allowModifying}
                            onChange={(e) => setAllowModifying(e.target.checked)}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                          />
                        </label>
                      </div>

                      {/* Optional Owner / Master Password */}
                      <div className="pt-2">
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Master / Owner Password (Optional)
                        </label>
                        <div className="relative">
                          <input
                            type={showOwnerPassword ? 'text' : 'password'}
                            value={ownerPassword}
                            onChange={(e) => setOwnerPassword(e.target.value)}
                            placeholder="Leave empty to use same password"
                            className="w-full px-3 py-2 pr-9 border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-bg text-slate-900 dark:text-white rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowOwnerPassword(!showOwnerPassword)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {showOwnerPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Used to manage permission settings without changing user access.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Security note */}
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-3 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    <strong>Important:</strong> Save your password in a safe place. True AES-256 encryption cannot be bypassed if the password is lost.
                  </p>
                </div>

                {/* Status message */}
                {status.message && (
                  <div className={`rounded-xl px-4 py-3 text-sm flex items-center gap-2 ${
                    status.error
                      ? 'bg-red-50 border border-red-200 text-red-700'
                      : status.success
                      ? 'bg-green-50 border border-green-200 text-green-700'
                      : 'bg-blue-50 border border-blue-200 text-blue-700'
                  }`}>
                    {status.error ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                    <span>{status.message}</span>
                  </div>
                )}

                {/* Action buttons */}
                {readyPdf ? (
                  <div className="space-y-3">
                    <Button variant="primary" size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700 shadow-md" onClick={handleDownloadReady}>
                      <Download className="w-5 h-5 mr-2" /> Download Encrypted PDF
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full" onClick={reset}>
                      Protect Another PDF
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 shadow-md"
                    onClick={handleProtect}
                    disabled={!canProtect || status.isProcessing}
                    isLoading={status.isProcessing}
                  >
                    <Shield className="w-5 h-5 mr-2" />
                    {status.isProcessing ? 'Encrypting Streams...' : 'Protect PDF'}
                  </Button>
                )}

                {!canProtect && password && (
                  <p className="text-xs text-slate-400 text-center">
                    {password.length < 4 ? 'Minimum 4 characters required' : password !== confirmPassword ? 'Passwords must match' : ''}
                  </p>
                )}

                {/* Quality & Security badges */}
                <div className="pt-2 border-t border-slate-100 dark:border-dark-border flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 size={13} className="text-emerald-500" /> Vector quality preserved
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 size={13} className="text-emerald-500" /> Searchable text intact
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 size={13} className="text-emerald-500" /> 100% Client-side
                  </span>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <NextStepPanel
                title="How it works"
                steps={[
                  'Set a strong open password (letters, numbers, symbols).',
                  'Optionally configure printing and copying permissions.',
                  'Download the encrypted, 100% vector-preserved PDF.',
                ]}
              />

              <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-sm border border-slate-200 dark:border-dark-border p-5">
                <h4 className="font-semibold text-slate-800 dark:text-white mb-3 text-sm">Security Highlights</h4>
                <ul className="space-y-2.5">
                  {[
                    'Standard ISO 32000-2 AES-256',
                    'Zero canvas rasterization',
                    'Acrobat, Chrome & Apple Preview compatible',
                    'No cloud upload or server storage',
                  ].map((tip, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>

              <RelatedActions
                actions={[
                  { label: 'Unlock PDF', to: '/unlock-pdf' },
                  { label: 'Watermark PDF', to: '/watermark' },
                  { label: 'Sign PDF Document', to: '/sign-pdf' },
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
