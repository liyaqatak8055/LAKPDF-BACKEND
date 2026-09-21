import React, { useState } from 'react';
import { FileUploader } from '../components/FileUploader';
import { Button } from '../components/Button';
import { PdfFile, ProcessingStatus } from '../types';
import { unlockPdf, downloadPdf, formatBytes } from '../services/pdfService';
import {
  Unlock, Lock, X, Eye, EyeOff, Download,
  CheckCircle2, AlertCircle, Info, ShieldCheck
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { NextStepPanel, RelatedActions, ToolStartPanel } from '../components/ToolProductPanels';
import { Helmet } from 'react-helmet-async';
import { ToolSEOContent } from '../components/ToolSEOContent';

export const UnlockPdf: React.FC = () => {
  const [file, setFile] = useState<PdfFile | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<ProcessingStatus>({ isProcessing: false, message: '' });
  const [readyPdf, setReadyPdf] = useState<{ data: Uint8Array; name: string } | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);

  const handleFileSelected = (selectedFiles: File[]) => {
    if (selectedFiles.length > 0) {
      const selected = selectedFiles[0];
      setFile({ id: uuidv4(), file: selected, name: selected.name, size: selected.size });
      setReadyPdf(null);
      setPassword('');
      setNeedsPassword(false);
      setStatus({ isProcessing: false, message: '' });
    }
  };

  const handleUnlock = async () => {
    if (!file) return;
    setStatus({ isProcessing: true, message: 'Unlocking and removing encryption...' });

    try {
      const unlockedBytes = await unlockPdf(file.file, password.trim());
      const outputName = `unlocked-${file.name}`;
      setReadyPdf({ data: unlockedBytes, name: outputName });
      downloadPdf(unlockedBytes, outputName, { autoDownload: false });
      setStatus({ isProcessing: false, message: 'PDF unlocked successfully!', success: true });
    } catch (error: any) {
      console.error(error);
      const errMsg = error?.message || 'Error unlocking PDF.';
      if (errMsg.includes('password') || errMsg.includes('Password')) {
        setNeedsPassword(true);
      }
      setStatus({ isProcessing: false, message: errMsg, error: 'Failed' });
    }
  };

  const handleDownloadReady = () => {
    if (!readyPdf) return;
    downloadPdf(readyPdf.data, readyPdf.name, { autoDownload: true });
  };

  const reset = () => {
    setFile(null);
    setPassword('');
    setNeedsPassword(false);
    setReadyPdf(null);
    setStatus({ isProcessing: false, message: '' });
  };

  return (
    <>
      <Helmet>
        <title>Unlock PDF Online Free | Remove Password from PDF - LAK PDF</title>
        <meta name="description" content="Unlock PDF online free. Remove password and restrictions from protected PDF documents directly in your browser. 100% secure and private." />
        <link rel="canonical" href="https://lakpdf.com/unlock-pdf" />
        <meta property="og:title" content="Unlock PDF Online Free | Remove Password from PDF - LAK PDF" />
        <meta property="og:description" content="Unlock PDF online free. Remove password and restrictions from protected PDF documents directly in your browser." />
        <meta property="og:url" content="https://lakpdf.com/unlock-pdf" />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 rounded-2xl mb-4">
            <Unlock className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Unlock PDF</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-xl mx-auto text-sm sm:text-base">
            Remove passwords, restrictions, and encryption from PDF documents online in seconds. 100% client-side privacy.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              {!file ? (
                <FileUploader
                  onFilesSelected={handleFileSelected}
                  accept=".pdf"
                  multiple={false}
                />
              ) : (
                <div className="space-y-6">
                  {/* Selected file preview */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <div className="p-2.5 bg-primary-50 dark:bg-primary-950/40 rounded-lg text-primary-500">
                        <Unlock className="w-5 h-5" />
                      </div>
                      <div className="truncate">
                        <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate">{file.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{formatBytes(file.size)}</p>
                      </div>
                    </div>
                    <button
                      onClick={reset}
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                      title="Remove file"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Password input section */}
                  <div className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-5 border border-slate-200 dark:border-slate-600 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                        Enter PDF Password {needsPassword ? <span className="text-rose-500 font-bold">*Required</span> : <span className="text-slate-400 font-normal">(if password-protected)</span>}
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Type the document password..."
                          className="w-full px-4 py-2.5 pr-10 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>
                        Your password and document are processed exclusively inside your browser. No files are uploaded to any server.
                      </span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  {!readyPdf ? (
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={handleUnlock}
                      disabled={status.isProcessing}
                      className="w-full py-3 text-base flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700"
                    >
                      <Unlock className="w-5 h-5 mr-2" />
                      {status.isProcessing ? 'Unlocking PDF...' : 'Unlock PDF Document'}
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-3">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                        <div>
                          <p className="font-semibold text-emerald-900 dark:text-emerald-200 text-sm">PDF Unlocked Successfully!</p>
                          <p className="text-xs text-emerald-700 dark:text-emerald-300">All passwords and editing restrictions have been permanently removed.</p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                          variant="primary"
                          size="lg"
                          onClick={handleDownloadReady}
                          className="flex-1 py-3 text-base flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <Download className="w-5 h-5 mr-2" />
                          Download Unlocked PDF
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={reset}
                          className="py-3 px-6"
                        >
                          Unlock Another PDF
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Status/Error message */}
                  {status.message && !readyPdf && (
                    <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                      status.error ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700'
                    }`}>
                      {status.error ? <AlertCircle className="w-4 h-4 shrink-0" /> : <Info className="w-4 h-4 shrink-0" />}
                      <span>{status.message}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <ToolStartPanel
              supportedFormats={['.pdf']}
              fileSizeNote="No strict size limit (processed in-browser)"
              privacyNote="100% private. Files never touch any server."
              workflowSteps={[
                'Upload password-protected PDF',
                'Enter password if required',
                'Download unlocked, restriction-free PDF'
              ]}
            />

            <NextStepPanel
              title="Next Steps"
              steps={[
                'Save the unlocked file for easy access',
                'Compress if file is large for sharing',
                'Annotate or edit pages in PDF Editor'
              ]}
            />

            <RelatedActions
              actions={[
                { label: 'Password Protect PDF', to: '/protect-pdf' },
                { label: 'Redact Sensitive Information', to: '/redact-pdf' },
                { label: 'Compress PDF', to: '/compress' },
              ]}
            />
          </div>
        </div>

        <ToolSEOContent toolKey="/unlock-pdf" />
      </div>
    </>
  );
};

export default UnlockPdf;
