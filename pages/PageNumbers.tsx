import React, { useState, useEffect, useRef } from 'react';
import { FileUploader } from '../components/FileUploader';
import { Button } from '../components/Button';
import { PdfFile, ProcessingStatus } from '../types';
import { addPageNumbers, downloadPdf, formatBytes, PageNumberPosition, getPdfPageCount, pdfjs } from '../services/pdfService';
import { Hash, X, Download, CheckCircle2, AlertCircle, Eye } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { NextStepPanel, RelatedActions, ToolStartPanel } from '../components/ToolProductPanels';
import { Helmet } from 'react-helmet-async';
import { ToolSEOContent } from '../components/ToolSEOContent';

type NumberingFormat = 'page-only' | 'page-of-total' | 'page-label';

const positionCards: Array<{ key: PageNumberPosition; label: string }> = [
  { key: 'top-left',      label: 'Top Left' },
  { key: 'top-center',    label: 'Top Center' },
  { key: 'top-right',     label: 'Top Right' },
  { key: 'bottom-left',   label: 'Bottom Left' },
  { key: 'bottom-center', label: 'Bottom Center' },
  { key: 'bottom-right',  label: 'Bottom Right' },
];

const previewStyleMap: Record<PageNumberPosition, React.CSSProperties> = {
  'top-left':      { top: 6, left: 6 },
  'top-center':    { top: 6, left: '50%', transform: 'translateX(-50%)' },
  'top-right':     { top: 6, right: 6 },
  'bottom-left':   { bottom: 6, left: 6 },
  'bottom-center': { bottom: 6, left: '50%', transform: 'translateX(-50%)' },
  'bottom-right':  { bottom: 6, right: 6 },
};

export const PageNumbers: React.FC = () => {
  const [file, setFile] = useState<PdfFile | null>(null);
  const [position, setPosition] = useState<PageNumberPosition>('bottom-center');
  const [format, setFormat] = useState<NumberingFormat>('page-of-total');
  const [startNumber, setStartNumber] = useState<number>(1);
  const [fontSize, setFontSize] = useState<number>(12);
  const [margin, setMargin] = useState<number>(20);
  const [color, setColor] = useState<string>('#111111');
  const [showBackground, setShowBackground] = useState<boolean>(true);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>({ isProcessing: false, message: '' });
  const [readyPdf, setReadyPdf] = useState<{ data: Uint8Array; name: string } | null>(null);

  // Live preview
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fileRef = useRef<PdfFile | null>(null);
  fileRef.current = file;

  const handleFileSelected = async (selectedFiles: File[]) => {
    if (selectedFiles.length > 0) {
      const selectedFile = selectedFiles[0];
      if (!selectedFile.name.toLowerCase().endsWith('.pdf') && selectedFile.type !== 'application/pdf') {
        setStatus({ isProcessing: false, message: 'Please select a valid PDF file.', error: 'Invalid file' });
        return;
      }
      setStatus({ isProcessing: false, message: '' });
      const nextFile = { id: uuidv4(), file: selectedFile, name: selectedFile.name, size: selectedFile.size };
      setFile(nextFile);
      setReadyPdf(null);
      setPreviewImg(null);
      try {
        const total = await getPdfPageCount(selectedFile);
        setPageCount(total);
      } catch {
        setPageCount(null);
      }
    }
  };

  // Render live PDF preview with number overlay
  useEffect(() => {
    if (!file) { setPreviewImg(null); return; }
    const render = async () => {
      setPreviewLoading(true);
      try {
        const ab = await file.file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: ab }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.0 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport }).promise;
          setPreviewImg(canvas.toDataURL('image/jpeg', 0.85));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setPreviewLoading(false);
      }
    };
    render();
  }, [file]);

  const handleProcess = async () => {
    if (!file) return;
    setStatus({ isProcessing: true, message: 'Adding page numbers...' });
    try {
      const safeStart = Math.max(1, Number.isFinite(startNumber) ? Math.floor(startNumber) : 1);
      const newPdfBytes = await addPageNumbers(file.file, { position, format, startNumber: safeStart, fontSize, margin, color, showBackground });
      const outputName = `numbered-${file.name}`;
      setReadyPdf({ data: newPdfBytes, name: outputName });
      downloadPdf(newPdfBytes, outputName, { autoDownload: false });
      setStatus({ isProcessing: false, message: 'Page numbers added successfully!', success: true });
    } catch (error) {
      const details = error instanceof Error ? error.message : 'Unknown error';
      setStatus({ isProcessing: false, message: `Error: ${details}`, error: 'Failed' });
    }
  };

  const handleDownloadReady = () => {
    if (!readyPdf) return;
    downloadPdf(readyPdf.data, readyPdf.name, { autoDownload: true });
  };

  // Preview number text
  const previewNum = Math.max(1, Number.isFinite(startNumber) ? Math.floor(startNumber) : 1);
  const previewTotal = pageCount ? pageCount + previewNum - 1 : previewNum + 4;
  const previewText =
    format === 'page-only' ? `${previewNum}` :
    format === 'page-label' ? `Page ${previewNum}` :
    `${previewNum} / ${previewTotal}`;

  return (
    <>
      <Helmet>
        <title>Add Page Numbers to PDF Online Free - LAK PDF</title>
        <meta name="description" content="Add page numbers to PDF online for free with custom position and format." />
        <link rel="canonical" href="https://lakpdf.com/page-number" />
        <meta property="og:title" content="Add Page Numbers to PDF Online Free - LAK PDF" />
        <meta property="og:description" content="Add page numbers to PDF online for free with custom position and format." />
        <meta property="og:url" content="https://lakpdf.com/page-number" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://lakpdf.com/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Add Page Numbers to PDF Online Free - LAK PDF" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Add Page Numbers to PDF Online Free - LAK PDF" />
        <meta name="twitter:description" content="Add page numbers to PDF online for free with custom position and format." />
        <meta name="twitter:image" content="https://lakpdf.com/og-image.png" />
      </Helmet>
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Page Numbers</h1>
        <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto">
          Add page numbers to your PDF — choose position, style, font size, and color. Live preview included.
        </p>
      </div>

      {!file ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <FileUploader
            onFilesSelected={handleFileSelected}
            multiple={false}
            icon={<Hash className="w-12 h-12 text-teal-400" />}
            title="Select PDF file"
            description="Drop your PDF here to add page numbers"
            helperText="Runs entirely in your browser"
          />
          <ToolStartPanel
            supportedFormats={['PDF']}
            fileSizeNote="No fixed cap. Larger PDFs may take longer."
            privacyNote="Page numbering runs in your browser."
            workflowSteps={[
              'Upload your PDF.',
              'Choose position, format, font, and color.',
              'See a live preview, then download.',
            ]}
          />
        </div>
      ) : (
        <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* Main settings panel */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-7">
            {/* File header */}
            <div className="flex items-start justify-between pb-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-red-100 rounded-lg flex items-center justify-center text-red-500 font-bold text-xs shrink-0">PDF</div>
                <div>
                  <p className="font-semibold text-slate-900 truncate max-w-[220px]">{file.name}</p>
                  <p className="text-sm text-slate-500">{formatBytes(file.size)}{pageCount ? ` • ${pageCount} pages` : ''}</p>
                </div>
              </div>
              <button onClick={() => { setFile(null); setPageCount(null); setReadyPdf(null); setStatus({ isProcessing: false, message: '' }); }} className="text-slate-400 hover:text-red-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Position picker */}
            <div>
              <h4 className="font-semibold text-slate-800 mb-3">Position</h4>
              <div className="grid grid-cols-3 gap-2">
                {positionCards.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setPosition(opt.key)}
                    className={`p-3 rounded-xl border transition-all text-center ${position === opt.key ? 'border-teal-500 bg-teal-50 text-teal-700 ring-1 ring-teal-300' : 'border-slate-200 hover:border-teal-300 text-slate-600'}`}
                  >
                    {/* Mini page with number dot */}
                    <div className="w-14 h-20 bg-white border border-slate-200 shadow-sm relative mx-auto mb-2 rounded-sm overflow-hidden">
                      {/* Simulated content lines */}
                      <div className="absolute inset-x-2 space-y-1" style={{ top: '20%' }}>
                        {[70, 90, 60, 80].map((w, i) => (
                          <div key={i} className="h-0.5 bg-slate-200 rounded" style={{ width: `${w}%` }} />
                        ))}
                      </div>
                      {/* Number label */}
                      <div
                        className="absolute text-[7px] font-bold"
                        style={{ color, ...previewStyleMap[opt.key] }}
                      >
                        {previewText}
                      </div>
                    </div>
                    <span className="text-xs font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Format & Start Number */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Number Format</label>
                <select
                  value={format}
                  onChange={e => setFormat(e.target.value as NumberingFormat)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                >
                  <option value="page-of-total">1 / 10 (Page of Total)</option>
                  <option value="page-only">1 (Number Only)</option>
                  <option value="page-label">Page 1 (With Label)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Start Number</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={startNumber}
                  onChange={e => {
                    const v = Number(e.target.value);
                    setStartNumber(Number.isFinite(v) ? Math.max(1, Math.floor(v)) : 1);
                  }}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>
            </div>

            {/* Sliders */}
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Font Size: <span className="text-teal-600">{fontSize}px</span></label>
                <input type="range" min={8} max={32} step={1} value={fontSize} onChange={e => setFontSize(Number(e.target.value))} className="w-full accent-teal-500" />
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5"><span>8</span><span>32</span></div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Margin: <span className="text-teal-600">{margin}px</span></label>
                <input type="range" min={8} max={72} step={1} value={margin} onChange={e => setMargin(Number(e.target.value))} className="w-full accent-teal-500" />
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5"><span>8</span><span>72</span></div>
              </div>
            </div>

            {/* Color + background */}
            <div className="flex items-center gap-5 flex-wrap">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Text Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={color}
                    onChange={e => setColor(e.target.value)}
                    className="h-10 w-14 rounded-xl border border-slate-200 bg-white p-1 cursor-pointer"
                  />
                  <span className="text-sm font-mono text-slate-500">{color.toUpperCase()}</span>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showBackground}
                  onChange={e => setShowBackground(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 accent-teal-500"
                />
                <span>Show background behind number</span>
              </label>
            </div>

            {/* Status */}
            {status.message && (
              <div className={`rounded-xl px-4 py-3 text-sm flex items-center gap-2 ${status.error ? 'bg-red-50 border border-red-200 text-red-700' : status.success ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-blue-50 border border-blue-200 text-blue-700'}`}>
                {status.error ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                {status.message}
              </div>
            )}

            {/* Action */}
            {readyPdf ? (
              <div className="space-y-2">
                <Button variant="primary" size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleDownloadReady}>
                  <Download className="w-5 h-5 mr-2" /> Download PDF
                </Button>
                <Button variant="ghost" size="sm" className="w-full" onClick={() => { setReadyPdf(null); setStatus({ isProcessing: false, message: '' }); }}>
                  Add Numbers Again
                </Button>
              </div>
            ) : (
              <Button
                variant="primary"
                size="lg"
                className="w-full bg-teal-500 hover:bg-teal-600"
                onClick={handleProcess}
                isLoading={status.isProcessing}
                disabled={status.isProcessing}
              >
                <Hash className="w-5 h-5 mr-2" />
                {status.isProcessing ? 'Processing...' : 'Add Page Numbers'}
              </Button>
            )}
          </div>

          {/* Sidebar — Live preview + next steps */}
          <div className="space-y-4">
            {/* Live preview */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="w-4 h-4 text-teal-500" />
                <h4 className="text-sm font-semibold text-slate-700">Live Preview</h4>
              </div>
              <div className="bg-slate-100 rounded-xl overflow-hidden relative" style={{ minHeight: 200 }}>
                {previewLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <div className="w-6 h-6 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : previewImg ? (
                  <div className="relative">
                    <img src={previewImg} alt="Page preview" className="w-full block" />
                    {/* Overlay number at position */}
                    <div
                      className="absolute text-xs font-bold pointer-events-none"
                      style={{
                        ...previewStyleMap[position],
                        color,
                        fontSize: `${Math.max(8, Math.min(14, fontSize * 0.6))}px`,
                        background: showBackground ? 'rgba(255,255,255,0.75)' : 'transparent',
                        padding: showBackground ? '1px 4px' : undefined,
                        borderRadius: showBackground ? 3 : undefined,
                      }}
                    >
                      {previewText}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Preview unavailable</div>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-2 text-center">Preview of page 1 with your number settings</p>
            </div>

            <NextStepPanel
              title="Next step"
              steps={[
                'Choose the position on the mini page cards.',
                'Adjust format, size, color as needed.',
                'Check the live preview, then click Add Page Numbers.',
              ]}
            />
            <RelatedActions
              actions={[
                { label: 'Organize PDF', to: '/organize-pdf' },
                { label: 'Watermark PDF', to: '/watermark' },
                { label: 'Merge PDFs', to: '/merge' },
              ]}
            />
          </div>
        </div>
      )}
      <ToolSEOContent toolKey="/page-number" />
    </div>
    </>
  );
};
