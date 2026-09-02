import React, { useState } from 'react';
import { FileUploader } from '../components/FileUploader';
import { Button } from '../components/Button';
import { convertPdfToPowerPoint } from '../services/officeService';
import { downloadFile, formatBytes, getPdfPageCount, parsePageRange } from '../services/pdfService';
import { Presentation, X, Monitor, LayoutTemplate, Gauge, Download, ArrowRight, CheckCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { NextStepPanel, RelatedActions, ToolStartPanel } from '../components/ToolProductPanels';
import { Helmet } from 'react-helmet-async';
import { ToolSEOContent } from '../components/ToolSEOContent';

type LayoutType = 'standard' | 'wide';
type FitType = 'contain' | 'cover';
type QualityPreset = 'compact' | 'balanced' | 'high';

export const PdfToPowerPoint: React.FC = () => {
  const [file, setFile] = useState<{file: File, id: string, name: string, size: number} | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [pageRange, setPageRange] = useState<string>('all');
  const [layout, setLayout] = useState<LayoutType>('wide');
  const [fit, setFit] = useState<FitType>('contain');
  const [quality, setQuality] = useState<QualityPreset>('balanced');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({
    type: 'idle',
    message: ''
  });
  const [readyPptx, setReadyPptx] = useState<{ blob: Blob; name: string } | null>(null);

  const handleFileSelected = async (selectedFiles: File[]) => {
    if (selectedFiles.length > 0) {
      const selected = selectedFiles[0];
      const isPdf = selected.type === 'application/pdf' || selected.name.toLowerCase().endsWith('.pdf');
      if (!isPdf) {
        setStatus({ type: 'error', message: 'Please upload a valid PDF file.' });
        return;
      }

      setFile({
        id: uuidv4(),
        file: selected,
        name: selected.name,
        size: selected.size,
      });
      setProgress(0);
      setPageRange('all');
      setStatus({ type: 'idle', message: '' });
      setReadyPptx(null);
      try {
        const totalPages = await getPdfPageCount(selected);
        setPageCount(totalPages);
      } catch {
        setPageCount(null);
      }
    }
  };

  const handleConvert = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProgress(0);
    setStatus({ type: 'idle', message: 'Preparing conversion...' });

    let selectedPages: number[] | undefined;
    if (pageCount && pageRange.trim().toLowerCase() !== 'all') {
      const parsed = parsePageRange(pageRange, pageCount);
      if (parsed.error || parsed.pages.length === 0) {
        setIsProcessing(false);
        setStatus({ type: 'error', message: parsed.error || 'Invalid page range.' });
        return;
      }
      selectedPages = parsed.pages.map((idx) => idx + 1);
    }

    const presetMap = {
      compact: { scale: 1.5, imageFormat: 'jpeg' as const, imageQuality: 0.75 },
      balanced: { scale: 2, imageFormat: 'jpeg' as const, imageQuality: 0.9 },
      high: { scale: 3, imageFormat: 'png' as const, imageQuality: 1 }
    };
    const preset = presetMap[quality];

    try {
      const blob = await convertPdfToPowerPoint(file.file, {
        layout,
        fit,
        scale: preset.scale,
        imageFormat: preset.imageFormat,
        imageQuality: preset.imageQuality,
        pages: selectedPages,
        onProgress: (current, total) => {
          setProgress(Math.round((current / total) * 100));
          setStatus({ type: 'idle', message: `Converting page ${current} of ${total}...` });
        }
      });
      const outputFilename = `${file.name.replace('.pdf', '')}.pptx`;
      setReadyPptx({ blob, name: outputFilename });
      downloadFile(blob, outputFilename, { autoDownload: true });
      setStatus({ type: 'success', message: 'PowerPoint ready & downloaded automatically!' });
    } catch (e) {
      console.error(e);
      setStatus({ type: 'error', message: `Conversion failed: ${e instanceof Error ? e.message : 'Unknown error'}` });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadReady = () => {
    if (!readyPptx) return;
    downloadFile(readyPptx.blob, readyPptx.name, { autoDownload: true });
  };

  return (
    <>
      <Helmet>
        <title>PDF to PowerPoint Online Free | PDF to PPT - LAK PDF</title>
        <meta name="description" content="Convert PDF to PowerPoint online free. Export PDF slides to editable PPT. Works 100% in your browser." />
        <link rel="canonical" href="https://lakpdf.com/pdf-to-powerpoint" />
        <meta property="og:title" content="PDF to PowerPoint Online Free | PDF to PPT - LAK PDF" />
        <meta property="og:description" content="Convert PDF to PowerPoint online free. Export PDF slides to editable PPT." />
        <meta property="og:url" content="https://lakpdf.com/pdf-to-powerpoint" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://lakpdf.com/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="PDF to PowerPoint Online Free | PDF to PPT - LAK PDF" />
        <meta name="twitter:description" content="Convert PDF to PowerPoint online free. Export PDF slides to editable PPT." />
        <meta name="twitter:image" content="https://lakpdf.com/og-image.png" />
      </Helmet>
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">PDF to PowerPoint</h1>
        <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto">
          Convert your PDF pages into high-fidelity PowerPoint slides (PPTX).
        </p>
      </div>

      {!file ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <FileUploader
            onFilesSelected={handleFileSelected}
            multiple={false}
            accept=".pdf"
            icon={<Presentation className="w-12 h-12 text-orange-600" />}
            title="Select PDF file"
            description="Drop your PDF here"
            helperText="Runs 100% in your browser"
          />
          <ToolStartPanel
            supportedFormats={['PDF']}
            fileSizeNote="No fixed upload cap is enforced. More pages and higher quality settings take longer."
            privacyNote="PowerPoint conversion runs in your browser."
            workflowSteps={[
              'Upload one PDF.',
              'Choose layout, fit, quality, and pages.',
              'Convert, then download PowerPoint slides.',
            ]}
          />
        </div>
      ) : (
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px] items-start">
        <div className="space-y-6 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600 font-bold shrink-0">
                  PPTX
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 truncate max-w-[240px]">{file.name}</h3>
                  <p className="text-sm text-slate-500">
                    {formatBytes(file.size)}{pageCount ? ` • ${pageCount} pages` : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setFile(null);
                  setPageCount(null);
                  setStatus({ type: 'idle', message: '' });
                  setProgress(0);
                  setReadyPptx(null);
                }}
                className="text-slate-400 hover:text-red-500 cursor-pointer"
              >
                <X />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="border border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-slate-700">
                  <Monitor className="w-4 h-4" /> Slide Layout
                </div>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setLayout('wide')}
                    className={`w-full px-3 py-2 text-sm rounded-md border cursor-pointer ${layout === 'wide' ? 'bg-orange-600 text-white border-orange-600' : 'bg-white border-slate-200 text-slate-700'}`}
                  >
                    Widescreen (16:9)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLayout('standard')}
                    className={`w-full px-3 py-2 text-sm rounded-md border cursor-pointer ${layout === 'standard' ? 'bg-orange-600 text-white border-orange-600' : 'bg-white border-slate-200 text-slate-700'}`}
                  >
                    Standard (4:3)
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-slate-700">
                  <LayoutTemplate className="w-4 h-4" /> Fit Mode
                </div>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setFit('contain')}
                    className={`w-full px-3 py-2 text-sm rounded-md border cursor-pointer ${fit === 'contain' ? 'bg-orange-600 text-white border-orange-600' : 'bg-white border-slate-200 text-slate-700'}`}
                  >
                    Fit Entire Page
                  </button>
                  <button
                    type="button"
                    onClick={() => setFit('cover')}
                    className={`w-full px-3 py-2 text-sm rounded-md border cursor-pointer ${fit === 'cover' ? 'bg-orange-600 text-white border-orange-600' : 'bg-white border-slate-200 text-slate-700'}`}
                  >
                    Fill Slide Area
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-slate-700">
                  <Gauge className="w-4 h-4" /> Quality
                </div>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setQuality('compact')}
                    className={`w-full px-3 py-2 text-sm rounded-md border cursor-pointer ${quality === 'compact' ? 'bg-orange-600 text-white border-orange-600' : 'bg-white border-slate-200 text-slate-700'}`}
                  >
                    Compact
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuality('balanced')}
                    className={`w-full px-3 py-2 text-sm rounded-md border cursor-pointer ${quality === 'balanced' ? 'bg-orange-600 text-white border-orange-600' : 'bg-white border-slate-200 text-slate-700'}`}
                  >
                    Balanced
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuality('high')}
                    className={`w-full px-3 py-2 text-sm rounded-md border cursor-pointer ${quality === 'high' ? 'bg-orange-600 text-white border-orange-600' : 'bg-white border-slate-200 text-slate-700'}`}
                  >
                    High Quality
                  </button>
                </div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-4">
              <label className="text-sm font-semibold text-slate-700">Page Range</label>
              <input
                type="text"
                value={pageRange}
                onChange={(e) => setPageRange(e.target.value)}
                placeholder="all or e.g. 1,3,5-8"
                className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 text-xs text-orange-900">
              Note: PDF pages are converted into high-resolution slide layouts.
            </div>
        </div>

        {/* ── RIGHT COLUMN: Sticky Convert Sidebar ── */}
        <div className="sticky top-6 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100">
              PowerPoint Options
            </h3>

            <div className="space-y-4">
              <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Layout:</span>
                  <span className="font-semibold text-slate-800">{layout === 'wide' ? 'Widescreen (16:9)' : 'Standard (4:3)'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Fit:</span>
                  <span className="font-semibold text-slate-800">{fit === 'contain' ? 'Fit Page' : 'Fill Slide'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Quality:</span>
                  <span className="font-semibold text-slate-800 capitalize">{quality}</span>
                </div>
              </div>

              {!readyPptx ? (
                <button
                  type="button"
                  onClick={handleConvert}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#e5323f] hover:bg-[#d4202d] text-white py-4 px-6 text-base font-extrabold shadow-lg shadow-red-500/25 transition-all hover:scale-[1.02] active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
                >
                  {isProcessing ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Converting...</span>
                    </div>
                  ) : (
                    <>
                      <span>Convert to PPTX</span>
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-2.5">
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-slate-900">PPTX Ready!</p>
                      <p className="text-[10px] text-slate-500">{readyPptx.name}</p>
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full py-4 text-base font-bold bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30 cursor-pointer"
                    onClick={handleDownloadReady}
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download PPTX Again
                  </Button>
                </div>
              )}

              {isProcessing && (
                <div className="space-y-2 mt-3">
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-[#e5323f] transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-xs text-slate-500 text-center">{status.message || `${progress}%`}</p>
                </div>
              )}

              {status.message && !isProcessing && (
                <p className={`text-xs text-center font-medium ${status.type === 'error' ? 'text-red-600' : status.type === 'success' ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {status.message}
                </p>
              )}
            </div>
          </div>

          <NextStepPanel
            title="Next step"
            steps={[
              'Review the page count and range.',
              'Choose slide layout, fit mode, and quality.',
            ]}
          />
          <RelatedActions
            actions={[
              { label: 'PowerPoint to PDF', to: '/powerpoint-to-pdf' },
              { label: 'PDF to JPG', to: '/pdf-to-img' },
              { label: 'Compress PDF', to: '/compress' },
            ]}
          />
        </div>
        </div>
      )}
      <ToolSEOContent toolKey="/pdf-to-powerpoint" />
    </div>
    </>
  );
};
