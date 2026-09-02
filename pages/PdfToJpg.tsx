import React, { useEffect, useState } from 'react';
import { FileUploader } from '../components/FileUploader';
import { Button } from '../components/Button';
import { PdfFile, ProcessingStatus } from '../types';
import { convertPdfToImages, downloadPdf, formatBytes, pdfjs } from '../services/pdfService';
import { FileImage, X, Image as ImageIcon, Download } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { NextStepPanel, RelatedActions, ToolStartPanel } from '../components/ToolProductPanels';
import { Helmet } from 'react-helmet-async';
import { ToolSEOContent } from '../components/ToolSEOContent';

type DPI = 72 | 150 | 300;

const DPI_OPTIONS: { value: DPI; label: string; desc: string }[] = [
  { value: 72,  label: '72 DPI',  desc: 'Screen — smallest files' },
  { value: 150, label: '150 DPI', desc: 'Balanced — recommended' },
  { value: 300, label: '300 DPI', desc: 'Print — highest quality' },
];

const PdfToJpg: React.FC = () => {
  const [file, setFile] = useState<PdfFile | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [status, setStatus] = useState<ProcessingStatus>({ isProcessing: false, message: '' });
  const [readyZip, setReadyZip]   = useState<{ blob: Blob; name: string } | null>(null);
  const [readyJpg, setReadyJpg]   = useState<{ blob: Blob; name: string } | null>(null);

  const [dpi, setDpi]             = useState<DPI>(150);
  const [pageRange, setPageRange] = useState<string>('all');

  // Derived: is range a single page?
  const isSinglePage = (() => {
    const r = pageRange.trim().toLowerCase();
    if (r === '' || r === 'all') return pageCount === 1;
    if (/^\d+$/.test(r)) return true;
    return false;
  })();

  const handleFileSelected = async (selectedFiles: File[]) => {
    if (selectedFiles.length === 0) return;
    const f = selectedFiles[0];
    const id = uuidv4();
    setFile({ id, file: f, name: f.name, size: f.size });
    setReadyZip(null);
    setReadyJpg(null);
    setPageRange('all');
    // Count pages for UX hints
    try {
      const ab = await f.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: ab }).promise;
      setPageCount(pdf.numPages);
    } catch {
      setPageCount(0);
    }
  };

  const handleConvert = async () => {
    if (!file) return;
    const label = isSinglePage ? 'Converting page to JPG…' : 'Converting PDF pages to JPG…';
    setStatus({ isProcessing: true, message: label });
    setReadyZip(null);
    setReadyJpg(null);

    try {
      const blob = await convertPdfToImages(file.file, dpi, pageRange, isSinglePage);
      if (isSinglePage) {
        const name = `${file.name.replace(/\.pdf$/i, '')}-page.jpg`;
        setReadyJpg({ blob, name });
        setStatus({ isProcessing: false, message: 'Done! JPG ready to download.', success: true });
      } else {
        const name = `images-${file.name.replace(/\.pdf$/i, '')}.zip`;
        setReadyZip({ blob, name });
        setStatus({ isProcessing: false, message: 'Done! ZIP ready to download.', success: true });
      }
    } catch (error) {
      console.error(error);
      setStatus({ isProcessing: false, message: 'Error converting file.', error: 'Failed' });
    }
  };

  const handleDownload = () => {
    if (readyJpg) downloadPdf(readyJpg.blob, readyJpg.name, { autoDownload: true });
    if (readyZip) downloadPdf(readyZip.blob, readyZip.name, { autoDownload: true });
  };

  const reset = () => { setFile(null); setReadyZip(null); setReadyJpg(null); setPageCount(0); setPageRange('all'); };

  return (
    <>
      <Helmet>
        <title>PDF to JPG Online Free | Convert PDF to Images - LAK PDF</title>
        <meta name="description" content="Convert PDF to JPG images online for free. Choose DPI (72/150/300), page range, and download as ZIP or single image." />
        <link rel="canonical" href="https://lakpdf.com/pdf-to-img" />
        <meta property="og:title" content="PDF to JPG Online Free | Convert PDF to Images - LAK PDF" />
        <meta property="og:description" content="Convert PDF to JPG images online for free. Export pages as high-quality images." />
        <meta property="og:url" content="https://lakpdf.com/pdf-to-img" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://lakpdf.com/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="PDF to JPG Online Free | Convert PDF to Images - LAK PDF" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="PDF to JPG Online Free | Convert PDF to Images - LAK PDF" />
        <meta name="twitter:description" content="Convert PDF to JPG images online for free. Export pages as high-quality images." />
        <meta name="twitter:image" content="https://lakpdf.com/og-image.png" />
      </Helmet>

      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">PDF to JPG</h1>
          <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto">
            Convert each PDF page into a high-quality JPG image. Choose DPI, page range, and download instantly.
          </p>
        </div>

        {!file ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <FileUploader
              onFilesSelected={handleFileSelected}
              multiple={false}
              icon={<FileImage className="w-12 h-12 text-yellow-500" />}
              title="Select PDF file"
              description="Drop your PDF here"
              helperText="Runs in your browser"
            />
            <ToolStartPanel
              supportedFormats={['PDF']}
              fileSizeNote="No fixed upload cap. Large PDFs need more browser memory."
              privacyNote="Image extraction runs in your browser."
              workflowSteps={[
                'Upload one PDF.',
                'Choose DPI quality and page range.',
                'Download JPG images or a single JPG.',
              ]}
            />
          </div>
        ) : (
          <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            {/* ── Main panel ─────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-6">
              {/* File header */}
              <div className="flex items-start justify-between pb-5 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center text-red-500 font-bold shrink-0">PDF</div>
                  <div>
                    <h3 className="font-semibold text-slate-900 truncate max-w-[200px] md:max-w-xs">{file.name}</h3>
                    <p className="text-sm text-slate-500">{formatBytes(file.size)}{pageCount > 0 ? ` · ${pageCount} page${pageCount !== 1 ? 's' : ''}` : ''}</p>
                  </div>
                </div>
                <button onClick={reset} className="text-slate-400 hover:text-red-500 transition-colors"><X /></button>
              </div>

              {/* ── Options (always visible) ──────────────────── */}
              <div className="space-y-5">
                  {/* DPI selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      Output Quality (DPI)
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {DPI_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setDpi(opt.value)}
                          className={`rounded-xl border px-3 py-2.5 text-left transition-all ${
                            dpi === opt.value
                              ? 'border-yellow-400 bg-yellow-50 ring-1 ring-yellow-400'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <p className="font-bold text-sm text-slate-900">{opt.label}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Page range */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      Page Range
                      {pageCount > 0 && <span className="ml-2 font-normal normal-case text-slate-400">(PDF has {pageCount} pages)</span>}
                    </label>
                    <input
                      type="text"
                      value={pageRange}
                      onChange={e => { setPageRange(e.target.value); setReadyZip(null); setReadyJpg(null); }}
                      placeholder={`all  or  1-3,5  or  2`}
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    />
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      Examples: <code className="bg-slate-100 px-1 rounded">all</code>&nbsp;
                      <code className="bg-slate-100 px-1 rounded">1-5</code>&nbsp;
                      <code className="bg-slate-100 px-1 rounded">1,3,5</code>&nbsp;
                      <code className="bg-slate-100 px-1 rounded">3</code> (single page = direct JPG download)
                    </p>
                  </div>
              </div>

              {/* ── Info badge ─────────────────────────────────────────── */}
              <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-yellow-500 shrink-0 shadow-sm">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    {isSinglePage ? 'Single JPG download' : 'ZIP of JPG images'}
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {isSinglePage
                      ? 'Page range resolves to one page — download as a single .jpg file.'
                      : 'All selected pages will be exported and packaged into a ZIP archive.'}
                  </p>
                </div>
              </div>

              {/* ── Action buttons ─────────────────────────────────────── */}
              {readyZip || readyJpg ? (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="primary"
                    size="lg"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30"
                    onClick={handleDownload}
                  >
                    <Download className="w-5 h-5 mr-2" />
                    {readyJpg ? 'Download JPG' : 'Download ZIP'}
                  </Button>
                  <Button variant="secondary" size="lg" onClick={() => { setReadyZip(null); setReadyJpg(null); }}>
                    Convert Again
                  </Button>
                </div>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-400 shadow-yellow-500/30"
                  onClick={handleConvert}
                  isLoading={status.isProcessing}
                >
                  {status.isProcessing
                    ? 'Converting…'
                    : isSinglePage
                      ? 'Convert to JPG'
                      : 'Convert to JPG (ZIP)'}
                </Button>
              )}

              {status.message && (
                <p className={`text-xs text-center ${status.error ? 'text-red-600' : status.success ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {status.message}
                </p>
              )}
            </div>

            {/* ── Side panel ─────────────────────────────────────────── */}
            <div className="space-y-4">
              <NextStepPanel
                title="Next step"
                steps={[
                  'Set DPI and page range in Options.',
                  'Click Convert to JPG.',
                  'Download ZIP or single JPG.',
                ]}
              />
              <RelatedActions
                actions={[
                  { label: 'JPG to PDF', to: '/img-to-pdf' },
                  { label: 'Compress image', to: '/compress-img' },
                  { label: 'Split PDF', to: '/split' },
                ]}
              />
            </div>
          </div>
        )}
        <ToolSEOContent toolKey="/pdf-to-img" />
      </div>
    </>
  );
};

export default PdfToJpg;
