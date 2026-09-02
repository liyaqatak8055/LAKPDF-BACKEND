import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FileUploader } from '../components/FileUploader';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { PdfFile, ProcessingStatus } from '../types';
import { formatBytes } from '../utils/formatBytes';
import {
  Minimize2,
  CheckCircle,
  X,
  Gauge,
  ShieldCheck,
  Zap,
  Download,
  Target,
  SlidersHorizontal,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

import { trackFileProcessing } from '../utils/analytics';
import { NextStepPanel, RelatedActions, ToolStartPanel } from '../components/ToolProductPanels';
import { ToolSEOContent } from '../components/ToolSEOContent';

/* ─── Progress steps ───────────────────────────────────────────────── */
// Progress step labels (used in level-mode fake progress bar)
const progressSteps = [
  { label: 'Uploading PDF...', start: 0, end: 20 },
  { label: 'Analyzing PDF...', start: 20, end: 35 },
  { label: 'Compressing Images...', start: 35, end: 70 },
  { label: 'Optimizing Pages...', start: 70, end: 90 },
  { label: 'Generating Output PDF...', start: 90, end: 100 },
  { label: 'Compression Complete', start: 100, end: 100 },
] as const;

/* ─── Quick target presets ──────────────────────────────────────────── */
const TARGET_PRESETS = [
  { label: '50 KB',  bytes: 50 * 1024 },
  { label: '100 KB', bytes: 100 * 1024 },
  { label: '200 KB', bytes: 200 * 1024 },
  { label: '500 KB', bytes: 500 * 1024 },
  { label: '1 MB',   bytes: 1 * 1024 * 1024 },
  { label: '2 MB',   bytes: 2 * 1024 * 1024 },
  { label: '5 MB',   bytes: 5 * 1024 * 1024 },
];

type Mode = 'level' | 'target';

/* ─── Component ─────────────────────────────────────────────────────── */
const CompressPdf: React.FC = () => {
  // Shared
  const [file, setFile] = useState<PdfFile | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>({ isProcessing: false, message: '' });
  const [compressedSize, setCompressedSize] = useState<number | null>(null);
  const [readyPdf, setReadyPdf] = useState<{ data: Uint8Array; name: string } | null>(null);
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressComplete, setProgressComplete] = useState(false);
  const [targetMissed, setTargetMissed] = useState(false); // when target mode couldn't reach goal

  // Mode switching
  const [mode, setMode] = useState<Mode>('level');

  // Level mode
  const [compressionLevel, setCompressionLevel] = useState<number>(0.7);

  // Target mode
  const [targetPreset, setTargetPreset] = useState<number | null>(null); // bytes
  const [customTargetKB, setCustomTargetKB] = useState<string>('');
  const [customError, setCustomError] = useState<string>('');

  /* ── Derived target bytes ─────────────────────────────────────────── */
  const targetBytes = useMemo<number | null>(() => {
    if (mode !== 'target') return null;
    if (targetPreset !== null) return targetPreset;
    const kb = parseFloat(customTargetKB);
    if (!isNaN(kb) && kb > 0) return Math.round(kb * 1024);
    return null;
  }, [mode, targetPreset, customTargetKB]);

  /* ── Active progress step ─────────────────────────────────────────── */
  const activeStepIndex = useMemo(() => {
    if (progressComplete || progressPercent >= 100) return progressSteps.length - 1;
    const index = progressSteps.findIndex((step) => progressPercent >= step.start && progressPercent < step.end);
    return index >= 0 ? index : 0;
  }, [progressComplete, progressPercent]);

  /* ── Warn before unload while processing ─────────────────────────── */
  useEffect(() => {
    if (!status.isProcessing) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [status.isProcessing]);

  /* ── Pick up preset from size-specific landing pages ─────────────── */
  // Read ?target=<kb> from URL search params — set by the size-specific pages.
  // Using URL params (instead of sessionStorage) is race-condition-free:
  // the param is present as soon as the route renders, on every navigation.
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const targetKb = searchParams.get('target');
    if (!targetKb) return;
    const kb = parseInt(targetKb, 10);
    if (!isNaN(kb) && kb > 0) {
      setMode('target');
      setTargetPreset(kb * 1024); // store as bytes
      setCustomTargetKB('');
      // Clean up the URL without triggering a re-render loop
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]); // re-runs whenever ?target= appears or changes

  /* ── Fake progress animation (level mode) ─────────────────────────── */
  useEffect(() => {
    if (!isProgressOpen || !status.isProcessing || progressComplete || mode === 'target') return;
    const interval = window.setInterval(() => {
      setProgressPercent((cur) => {
        if (cur >= 94) return cur;
        if (cur < 20) return Math.min(20, cur + 4);
        if (cur < 35) return Math.min(35, cur + 3);
        if (cur < 70) return Math.min(70, cur + 2);
        if (cur < 90) return Math.min(90, cur + 1.5);
        return Math.min(94, cur + 0.6);
      });
    }, 260);
    return () => window.clearInterval(interval);
  }, [isProgressOpen, progressComplete, status.isProcessing, mode]);

  /* ── Handlers ─────────────────────────────────────────────────────── */
  const handleFileSelected = (selectedFiles: File[]) => {
    if (selectedFiles.length > 0) {
      setFile({ id: uuidv4(), file: selectedFiles[0], name: selectedFiles[0].name, size: selectedFiles[0].size });
      setCompressedSize(null);
      setReadyPdf(null);
      setProgressPercent(0);
      setProgressComplete(false);
      setIsProgressOpen(false);
      setTargetMissed(false);
    }
  };

  const resetAll = () => {
    setFile(null);
    setCompressedSize(null);
    setReadyPdf(null);
    setIsProgressOpen(false);
    setTargetMissed(false);
  };

  const handleCompress = async () => {
    if (!file) return;
    if (mode === 'target' && targetBytes === null) {
      setCustomError('Please enter a valid target size.');
      return;
    }
    setCustomError('');
    setCompressedSize(null);
    setReadyPdf(null);
    setProgressPercent(0);
    setProgressComplete(false);
    setIsProgressOpen(true);
    setTargetMissed(false);
    setStatus({ isProcessing: true, message: 'Compressing PDF...' });

    setTimeout(async () => {
      try {
        const { compressPdf, compressPdfToTargetSize, downloadPdf } = await import('../services/pdfService');
        let compressedBytes: Uint8Array;

        if (mode === 'target' && targetBytes !== null) {
          compressedBytes = await compressPdfToTargetSize(
            file.file,
            targetBytes,
            (pct) => setProgressPercent(pct),
          );
          // Check if we actually hit the target
          if (compressedBytes.byteLength > targetBytes) {
            setTargetMissed(true);
          }
        } else {
          compressedBytes = await compressPdf(file.file, compressionLevel);
        }

        const newSize = compressedBytes.byteLength;
        setCompressedSize(newSize);
        setReadyPdf({ data: compressedBytes, name: `compressed-${file.name}` });
        trackFileProcessing('Compress PDF', 'pdf', file.size, true);
        downloadPdf(compressedBytes, `compressed-${file.name}`, { autoDownload: false });
        setProgressPercent(100);
        setProgressComplete(true);
        setStatus({ isProcessing: false, message: 'Done!', success: true });
      } catch (error) {
        console.error(error);
        trackFileProcessing('Compress PDF', 'pdf', file.size, false);
        setIsProgressOpen(false);
        setStatus({ isProcessing: false, message: 'Error compressing file.', error: 'Failed' });
      }
    }, 100);
  };

  const handleDownloadReady = async () => {
    if (!readyPdf) return;
    const { downloadPdf } = await import('../services/pdfService');
    downloadPdf(readyPdf.data, readyPdf.name, { autoDownload: true });
  };

  const handleProgressClose = () => {
    if (status.isProcessing) return;
    setIsProgressOpen(false);
  };

  const handleCustomTarget = (val: string) => {
    setCustomError('');
    setTargetPreset(null);
    setCustomTargetKB(val);
  };

  /* ── Derived display values ───────────────────────────────────────── */
  const compressionSavings =
    file && compressedSize !== null && compressedSize < file.size
      ? Math.round((1 - compressedSize / file.size) * 100)
      : 0;

  const levelOptions = [
    {
      level: 0.4,
      title: 'Extreme Compression',
      desc: 'Target ≤ 15% of original — maximum size reduction at 144 DPI. Text stays readable.',
      icon: <Zap className="w-5 h-5 text-orange-500" />,
      color: 'border-orange-200 bg-orange-50',
    },
    {
      level: 0.7,
      title: 'Recommended Compression',
      desc: 'Target ≤ 35% of original — best balance of quality and file size at 192 DPI.',
      icon: <Gauge className="w-5 h-5 text-green-500" />,
      color: 'border-green-200 bg-green-50',
    },
    {
      level: 1.0,
      title: 'Lossless Optimisation',
      desc: 'Structural optimisation only — no quality loss. Smallest reduction.',
      icon: <ShieldCheck className="w-5 h-5 text-blue-500" />,
      color: 'border-blue-200 bg-blue-50',
    },
  ];

  /* ── Render ───────────────────────────────────────────────────────── */
  return (
    <>
      <Helmet>
        <title>Compress PDF Online Free | Reduce PDF Size - LAK PDF</title>
        <meta
          name="description"
          content="Compress PDF online free and reduce file size quickly while keeping quality. Choose compression level or set a custom target size."
        />
        <link rel="canonical" href="https://lakpdf.com/compress" />
        <meta property="og:title" content="Compress PDF Online Free | Reduce PDF Size - LAK PDF" />
        <meta property="og:description" content="Compress PDF online free and reduce file size quickly while keeping quality. Choose compression level or set a custom target size." />
        <meta property="og:url" content="https://lakpdf.com/compress" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://lakpdf.com/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Compress PDF Online Free | Reduce PDF Size - LAK PDF" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Compress PDF Online Free | Reduce PDF Size - LAK PDF" />
        <meta name="twitter:description" content="Compress PDF online free and reduce file size quickly while keeping quality. Choose compression level or set a custom target size." />
        <meta name="twitter:image" content="https://lakpdf.com/og-image.png" />
      </Helmet>

      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Compress PDF</h1>
          <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto">
            Reduce file size while optimizing for maximal PDF quality. Choose a compression level or
            set a <strong>custom target file size</strong>.
          </p>
        </div>

        {!file ? (
          /* ── Upload state ──────────────────────────────────────────── */
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <FileUploader
              onFilesSelected={handleFileSelected}
              multiple={false}
              icon={<Minimize2 className="w-12 h-12 text-green-400" />}
              title="Select PDF file"
              description="Drop your PDF here to compress it"
              helperText="Runs in your browser"
            />
            <ToolStartPanel
              supportedFormats={['PDF']}
              fileSizeNote="No fixed upload cap is enforced. Large files take longer on slower devices."
              privacyNote="Compression runs in your browser."
              workflowSteps={[
                'Upload one PDF.',
                'Choose a compression level or set a target size.',
                'Download the smaller result.',
              ]}
            />
          </div>
        ) : (
          /* ── Settings state ────────────────────────────────────────── */
          <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">

              {/* File info row */}
              <div className="flex items-start justify-between mb-6 pb-5 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center text-red-500 font-bold shrink-0">
                    PDF
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 truncate max-w-[200px] md:max-w-xs">{file.name}</h3>
                    <p className="text-sm text-slate-500">{formatBytes(file.size)}</p>
                  </div>
                </div>
                <button
                  onClick={resetAll}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                  aria-label="Remove file"
                >
                  <X />
                </button>
              </div>

              {/* ── Mode Tabs ─────────────────────────────────────────── */}
              <div className="flex rounded-xl border border-slate-200 p-1 mb-6 bg-slate-50">
                <button
                  onClick={() => setMode('level')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    mode === 'level'
                      ? 'bg-white shadow-sm text-slate-900'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Compression Level
                </button>
                <button
                  onClick={() => setMode('target')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    mode === 'target'
                      ? 'bg-white shadow-sm text-slate-900'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Target className="w-4 h-4" />
                  Target File Size
                </button>
              </div>

              {/* ── Level Mode ─────────────────────────────────────────── */}
              {mode === 'level' && (
                <div className="space-y-3 mb-6">
                  <h4 className="font-bold text-slate-900">Compression Level</h4>
                  <div className="grid grid-cols-1 gap-3">
                    {levelOptions.map((opt) => (
                      <button
                        key={opt.level}
                        onClick={() => setCompressionLevel(opt.level)}
                        disabled={status.isProcessing}
                        className={`relative text-left p-4 rounded-xl border-2 transition-all flex items-start gap-4 ${
                          compressionLevel === opt.level
                            ? opt.color + ' border-current ring-1 ring-offset-0 ring-current'
                            : 'border-slate-100 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className={`p-2 rounded-lg bg-white shadow-sm ${compressionLevel === opt.level ? 'opacity-100' : 'opacity-70'}`}>
                          {opt.icon}
                        </div>
                        <div className="flex-grow">
                          <h5 className={`font-bold ${compressionLevel === opt.level ? 'text-slate-900' : 'text-slate-700'}`}>{opt.title}</h5>
                          <p className="text-sm text-slate-500 mt-0.5">{opt.desc}</p>
                        </div>
                        {compressionLevel === opt.level && (
                          <div className="absolute top-4 right-4 text-green-500">
                            <CheckCircle className="w-5 h-5 fill-current text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Target Size Mode ───────────────────────────────────── */}
              {mode === 'target' && (
                <div className="space-y-5 mb-6">
                  <div>
                    <h4 className="font-bold text-slate-900 mb-1">Target File Size</h4>
                    <p className="text-sm text-slate-500">
                      We'll automatically find the best quality that fits your target. If the target
                      is too small, we'll get as close as possible.
                    </p>
                  </div>

                  {/* Preset chips */}
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Quick Presets</p>
                    <div className="flex flex-wrap gap-2">
                      {TARGET_PRESETS.map((preset) => (
                        <button
                          key={preset.bytes}
                          onClick={() => {
                            setTargetPreset(preset.bytes);
                            setCustomTargetKB('');
                            setCustomError('');
                          }}
                          disabled={status.isProcessing}
                          className={`px-3 py-1.5 rounded-full text-sm font-semibold border-2 transition-all ${
                            targetPreset === preset.bytes && !customTargetKB
                              ? 'bg-violet-600 text-white border-violet-600 shadow'
                              : 'border-slate-200 text-slate-600 hover:border-violet-400 hover:text-violet-700 bg-white'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom input */}
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Custom Size (KB)</p>
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          placeholder="e.g. 350"
                          value={customTargetKB}
                          onChange={(e) => handleCustomTarget(e.target.value)}
                          disabled={status.isProcessing}
                          className={`w-full px-4 py-3 rounded-xl border-2 text-slate-900 font-medium outline-none transition-all ${
                            customTargetKB
                              ? 'border-violet-400 ring-2 ring-violet-100'
                              : 'border-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100'
                          } ${customError ? 'border-red-400' : ''}`}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold pointer-events-none">
                          KB
                        </span>
                      </div>
                      {customTargetKB && (
                        <span className="text-sm text-slate-500 shrink-0">
                          ≈ {formatBytes(parseFloat(customTargetKB) * 1024)}
                        </span>
                      )}
                    </div>
                    {customError && (
                      <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" /> {customError}
                      </p>
                    )}
                  </div>

                  {/* Info note */}
                  {file && targetBytes !== null && (
                    <div className={`flex items-start gap-2 rounded-xl p-3 text-sm ${
                      targetBytes >= file.size
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      <Info className="w-4 h-4 mt-0.5 shrink-0" />
                      {targetBytes >= file.size
                        ? `Your target (${formatBytes(targetBytes)}) is larger than the original (${formatBytes(file.size)}). A lossless save will be used.`
                        : `Target: ${formatBytes(targetBytes)} — reduction of ${Math.round((1 - targetBytes / file.size) * 100)}% from original (${formatBytes(file.size)}).`}
                    </div>
                  )}
                </div>
              )}

              {/* ── Compress Button ────────────────────────────────────── */}
              <Button
                variant="primary"
                size="lg"
                className="w-full bg-green-500 hover:bg-green-600 focus:ring-green-400 shadow-green-500/30"
                onClick={handleCompress}
                isLoading={status.isProcessing}
                disabled={status.isProcessing || (mode === 'target' && targetBytes === null)}
              >
                {status.isProcessing
                  ? mode === 'target'
                    ? 'Finding Best Quality…'
                    : 'Compressing…'
                  : 'Compress PDF'}
              </Button>

              {mode === 'target' && targetBytes === null && !status.isProcessing && (
                <p className="mt-2 text-center text-sm text-slate-400">
                  Choose a preset or enter a custom KB value to enable compression
                </p>
              )}
            </div>

            {/* Side panels */}
            <div className="space-y-4">
              <NextStepPanel
                title="Next step"
                steps={[
                  'Review the original file size.',
                  mode === 'target'
                    ? 'Set your target size using presets or custom KB.'
                    : 'Pick the compression balance you need.',
                  'Download the result after processing.',
                ]}
              />
              <RelatedActions
                actions={[
                  { label: 'Merge PDFs', to: '/merge' },
                  { label: 'PDF to Word', to: '/pdf-to-word' },
                  { label: 'Split PDF', to: '/split' },
                ]}
              />
            </div>
          </div>
        )}

        {/* ── Progress Modal ─────────────────────────────────────────── */}
        <Modal
          isOpen={isProgressOpen}
          onClose={handleProgressClose}
          hideDefaultHeader
          contentClassName="max-w-none w-[min(900px,94vw)] max-h-[88vh] rounded-3xl"
          bodyClassName="overflow-hidden"
          backdropClassName="bg-slate-950/55 backdrop-blur-sm"
        >
          <div className="relative flex max-h-[88vh] min-h-[520px] flex-col bg-[#f7f7fb]">
            {progressComplete && (
              <button
                type="button"
                onClick={handleProgressClose}
                className="absolute right-5 top-5 rounded-full p-2 text-slate-400 hover:bg-white hover:text-slate-700"
                aria-label="Close progress"
              >
                <X className="h-6 w-6" />
              </button>
            )}

            <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 text-center">
              {/* Logo */}
              <div className="mb-9 flex items-center justify-center gap-2">
                <span className="text-4xl font-black tracking-tight text-slate-950">LAK</span>
                <span className="rounded-xl bg-[#e5323f] px-3 py-1.5 text-2xl font-black text-white shadow-sm">PDF</span>
              </div>

              {!progressComplete ? (
                <>
                  <h3 className="text-2xl font-bold text-slate-800">
                    {mode === 'target'
                      ? progressPercent <= 5
                        ? 'Selecting Optimal DPI…'
                        : progressPercent < 80
                        ? `Binary Search — Pass ${Math.min(8, Math.ceil((progressPercent - 5) / 11.25))} / 8`
                        : 'Finalising Output…'
                      : progressSteps[activeStepIndex]?.label.replace('...', '')}
                  </h3>
                  {file && (
                    <p className="mt-4 text-lg font-semibold text-slate-600">
                      {file.name} <span className="font-normal text-slate-500">({formatBytes(file.size)})</span>
                    </p>
                  )}
                  {mode === 'target' && targetBytes !== null && (
                    <p className="mt-3 text-sm text-violet-600 font-semibold">
                      🎯 Target: {formatBytes(targetBytes)}
                    </p>
                  )}
                  {mode === 'target' && (
                    <p className="mt-2 text-xs text-slate-400">
                      Finding highest JPEG quality that fits your target
                    </p>
                  )}
                  <p className="mt-10 text-base text-slate-600">
                    <span className="font-bold">Time left</span>{' '}
                    {Math.max(2, Math.ceil((100 - progressPercent) * (mode === 'target' ? 0.8 : 0.35)))} SECONDS
                    <span className="mx-2 font-bold">-</span>
                    <span className="font-bold">Processing</span> in your browser
                  </p>
                </>
              ) : (
                <>
                  <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full animate-in zoom-in-95 ${targetMissed ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
                    {targetMissed
                      ? <AlertTriangle className="h-9 w-9" />
                      : <CheckCircle className="h-9 w-9" />}
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {targetMissed
                      ? 'Best Achievable Result'
                      : compressionSavings > 0
                        ? 'Compression Complete!'
                        : 'PDF is Already Optimal!'}
                  </h3>

                  {file && compressedSize !== null && (
                    <div className="mt-2 space-y-1">
                      <p className="text-base text-slate-600">
                        {compressionSavings > 0 ? (
                          <>
                            Your PDF is now{' '}
                            <span className="font-bold text-slate-900">{formatBytes(compressedSize)}</span>
                            <span className="ml-1 font-semibold text-green-600">({compressionSavings}% smaller)</span>
                          </>
                        ) : (
                          <>
                            Your file is already at minimal size:{' '}
                            <span className="font-bold text-slate-900">{formatBytes(compressedSize)}</span>
                          </>
                        )}
                      </p>
                      {targetMissed && targetBytes !== null && (
                        <p className="text-sm text-amber-600">
                          Could not reach {formatBytes(targetBytes)} — this is the smallest achievable size.
                        </p>
                      )}
                      {!targetMissed && mode === 'target' && targetBytes !== null && (
                        <p className="text-sm text-green-600 font-semibold">
                          ✓ Target of {formatBytes(targetBytes)} achieved!
                        </p>
                      )}
                    </div>
                  )}

                  {/* Stats grid */}
                  <div className="mt-6 grid w-full max-w-xl grid-cols-3 gap-3">
                    <div className="rounded-xl bg-white p-3 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Original</p>
                      <p className="mt-1 font-bold text-slate-900">{file ? formatBytes(file.size) : '-'}</p>
                    </div>
                    <div className="rounded-xl bg-white p-3 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Result</p>
                      <p className="mt-1 font-bold text-slate-900">
                        {compressedSize !== null ? formatBytes(compressedSize) : '-'}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white p-3 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Saved</p>
                      <p className={`mt-1 font-bold ${compressionSavings > 0 ? 'text-green-600' : 'text-slate-500'}`}>
                        {compressionSavings > 0 ? `${compressionSavings}%` : 'Optimal'}
                      </p>
                    </div>
                  </div>
                  {mode === 'target' && targetBytes !== null && (
                    <div className="mt-3 grid w-full max-w-xl grid-cols-2 gap-3">
                      <div className="rounded-xl bg-white p-3 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your Target</p>
                        <p className="mt-1 font-bold text-violet-700">{formatBytes(targetBytes)}</p>
                      </div>
                      <div className={`rounded-xl p-3 shadow-sm ${targetMissed ? 'bg-amber-50' : 'bg-green-50'}`}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</p>
                        <p className={`mt-1 font-bold text-sm ${targetMissed ? 'text-amber-600' : 'text-green-600'}`}>
                          {targetMissed ? '⚠ Closest possible' : '✓ Target achieved'}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Progress bar footer */}
            <div className="bg-white">
              <div className="h-7 w-full bg-slate-100">
                <div
                  className="h-full bg-[#e5323f] transition-all duration-300 ease-out"
                  style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
                />
              </div>
              <div className="px-6 py-5 text-center">
                <p className="text-3xl font-black text-slate-900">{Math.round(progressPercent)}%</p>
                <p className="mt-0.5 text-base uppercase tracking-wide text-slate-700">
                  {progressComplete
                    ? 'Complete'
                    : mode === 'target'
                    ? progressPercent <= 5
                      ? 'DPI Selection'
                      : 'Binary Search'
                    : progressSteps[activeStepIndex]?.label.replace('...', '')}
                </p>

                {progressComplete && (
                  <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full bg-[#e5323f] hover:bg-[#c92835] shadow-[#e5323f]/25 sm:w-auto sm:min-w-[260px]"
                      onClick={handleDownloadReady}
                    >
                      <Download className="mr-2 h-5 w-5" />
                      Download PDF
                    </Button>
                    <Button
                      variant="secondary"
                      size="lg"
                      className="w-full sm:w-auto"
                      onClick={resetAll}
                    >
                      Compress Another File
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Modal>
      </div>
      <ToolSEOContent toolKey="/compress" />
    </>
  );
};

export default CompressPdf;
