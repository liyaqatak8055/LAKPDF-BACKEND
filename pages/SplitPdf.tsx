import React, { useState, useEffect, useRef } from 'react';
import { FileUploader } from '../components/FileUploader';
import { Button } from '../components/Button';
import { PdfFile, ProcessingStatus } from '../types';
import { pdfjs, downloadPdf, formatBytes } from '../services/pdfService';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { Scissors, FileText, Download, X, CheckSquare, Square, ChevronRight, Layers, AlertCircle, CheckCircle2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { NextStepPanel, RelatedActions, ToolStartPanel } from '../components/ToolProductPanels';
import { Helmet } from 'react-helmet-async';
import { ToolSEOContent } from '../components/ToolSEOContent';

type SplitMode = 'all' | 'range' | 'custom';

interface PageThumb {
  id: string;
  index: number; // 0-based
  img: string;
}

const SplitPdf: React.FC = () => {
  const [file, setFile] = useState<PdfFile | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>({ isProcessing: false, message: '' });
  const [readyZip, setReadyZip] = useState<{ blob: Blob; name: string } | null>(null);
  const [readySingle, setReadySingle] = useState<{ data: Uint8Array; name: string } | null>(null);

  const [totalPages, setTotalPages] = useState(0);
  const [thumbs, setThumbs] = useState<PageThumb[]>([]);
  const [thumbsLoading, setThumbsLoading] = useState(false);

  // Split modes
  const [splitMode, setSplitMode] = useState<SplitMode>('all');
  const [rangeInput, setRangeInput] = useState('');
  const [rangeError, setRangeError] = useState('');
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());

  const pdfDocRef = useRef<any>(null);

  // Load thumbnails when file is set
  useEffect(() => {
    if (!file) {
      setThumbs([]);
      setTotalPages(0);
      setSelectedPages(new Set());
      pdfDocRef.current = null;
      return;
    }

    const load = async () => {
      setThumbsLoading(true);
      try {
        const arrayBuffer = await file.file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        pdfDocRef.current = pdf;
        setTotalPages(pdf.numPages);

        const newThumbs: PageThumb[] = [];
        for (let i = 1; i <= Math.min(pdf.numPages, 50); i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.4 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport }).promise;
            newThumbs.push({ id: uuidv4(), index: i - 1, img: canvas.toDataURL('image/jpeg', 0.7) });
          }
        }
        setThumbs(newThumbs);
      } catch (e) {
        console.error(e);
        setStatus({ isProcessing: false, message: 'Failed to load PDF preview.', error: 'Error' });
      } finally {
        setThumbsLoading(false);
      }
    };

    load();
  }, [file]);

  const handleFileSelected = (selectedFiles: File[]) => {
    if (selectedFiles.length > 0) {
      setFile({ id: uuidv4(), file: selectedFiles[0], name: selectedFiles[0].name, size: selectedFiles[0].size });
      setReadyZip(null);
      setReadySingle(null);
      setStatus({ isProcessing: false, message: '' });
      setSplitMode('all');
      setRangeInput('');
      setRangeError('');
      setSelectedPages(new Set());
    }
  };

  const parseRange = (input: string, max: number): number[] | null => {
    const pages = new Set<number>();
    const parts = input.split(',');
    for (const part of parts) {
      const t = part.trim();
      if (!t) continue;
      if (t.includes('-')) {
        const [a, b] = t.split('-').map(s => parseInt(s.trim(), 10));
        if (isNaN(a) || isNaN(b) || a < 1 || b > max || a > b) return null;
        for (let i = a; i <= b; i++) pages.add(i - 1);
      } else {
        const n = parseInt(t, 10);
        if (isNaN(n) || n < 1 || n > max) return null;
        pages.add(n - 1);
      }
    }
    return pages.size > 0 ? Array.from(pages).sort((a, b) => a - b) : null;
  };

  const togglePage = (index: number) => {
    setSelectedPages(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedPages.size === totalPages) {
      setSelectedPages(new Set());
    } else {
      setSelectedPages(new Set(Array.from({ length: totalPages }, (_, i) => i)));
    }
  };

  const getTargetPages = (): number[] | null => {
    if (splitMode === 'all') return Array.from({ length: totalPages }, (_, i) => i);
    if (splitMode === 'range') {
      if (!rangeInput.trim()) { setRangeError('Please enter a page range.'); return null; }
      const pages = parseRange(rangeInput, totalPages);
      if (!pages) { setRangeError(`Invalid range. Use format like 1-3, 5, 7-9 (max ${totalPages} pages).`); return null; }
      setRangeError('');
      return pages;
    }
    if (splitMode === 'custom') {
      if (selectedPages.size === 0) { setStatus({ isProcessing: false, message: 'Please select at least one page.', error: 'No pages' }); return null; }
      return Array.from(selectedPages).sort((a, b) => a - b);
    }
    return null;
  };

  const handleSplitToZip = async () => {
    if (!file) return;
    const pages = getTargetPages();
    if (!pages) return;

    setStatus({ isProcessing: true, message: `Splitting ${pages.length} page(s)...` });
    setReadyZip(null);
    setReadySingle(null);

    try {
      const arrayBuffer = await file.file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const zip = new JSZip();

      for (let i = 0; i < pages.length; i++) {
        setStatus({ isProcessing: true, message: `Processing page ${i + 1} of ${pages.length}...` });
        const newPdf = await PDFDocument.create();
        const [copiedPage] = await newPdf.copyPages(pdfDoc, [pages[i]]);
        newPdf.addPage(copiedPage);
        const pdfBytes = await newPdf.save();
        zip.file(`page_${pages[i] + 1}.pdf`, pdfBytes);
      }

      const outputName = `split-${file.name.replace('.pdf', '')}.zip`;
      const blob = await zip.generateAsync({ type: 'blob' });
      setReadyZip({ blob, name: outputName });
      setStatus({ isProcessing: false, message: `Done! ${pages.length} pages extracted as ZIP.`, success: true });
    } catch (error) {
      console.error(error);
      setStatus({ isProcessing: false, message: 'Error splitting file.', error: 'Failed' });
    }
  };

  const handleExtractSingle = async () => {
    if (!file) return;
    const pages = getTargetPages();
    if (!pages) return;

    setStatus({ isProcessing: true, message: 'Extracting pages into single PDF...' });
    setReadyZip(null);
    setReadySingle(null);

    try {
      const arrayBuffer = await file.file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const newPdf = await PDFDocument.create();
      const copiedPages = await newPdf.copyPages(pdfDoc, pages);
      copiedPages.forEach(p => newPdf.addPage(p));
      const pdfBytes = await newPdf.save();
      const outputName = `extracted-${file.name}`;
      setReadySingle({ data: pdfBytes, name: outputName });
      setStatus({ isProcessing: false, message: `Done! ${pages.length} page(s) combined into one PDF.`, success: true });
    } catch (error) {
      console.error(error);
      setStatus({ isProcessing: false, message: 'Error extracting pages.', error: 'Failed' });
    }
  };

  const handleDownloadZip = () => {
    if (!readyZip) return;
    const url = URL.createObjectURL(readyZip.blob);
    const a = document.createElement('a');
    a.href = url; a.download = readyZip.name; a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadSingle = () => {
    if (!readySingle) return;
    downloadPdf(readySingle.data, readySingle.name, { autoDownload: true });
  };

  const reset = () => {
    setFile(null); setReadyZip(null); setReadySingle(null);
    setStatus({ isProcessing: false, message: '' }); setRangeInput(''); setRangeError('');
    setSelectedPages(new Set()); setSplitMode('all');
  };

  return (
    <>
      <Helmet>
        <title>Split PDF Online Free | Extract Pages - LAK PDF</title>
        <meta name="description" content="Split PDF online for free. Extract pages or separate PDF files in one click." />
        <link rel="canonical" href="https://lakpdf.com/split" />
        <meta property="og:title" content="Split PDF Online Free | Extract Pages - LAK PDF" />
        <meta property="og:description" content="Split PDF online for free. Extract pages or separate PDF files in one click." />
        <meta property="og:url" content="https://lakpdf.com/split" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://lakpdf.com/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Split PDF Online Free | Extract PDF Pages - LAK PDF" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Split PDF Online Free | Extract PDF Pages - LAK PDF" />
        <meta name="twitter:description" content="Split PDF online for free. Extract pages or separate PDF files in one click." />
        <meta name="twitter:image" content="https://lakpdf.com/og-image.png" />
      </Helmet>
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Split PDF</h1>
        <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto">
          Extract all pages, a custom range, or handpick specific pages from your PDF.
        </p>
      </div>

      {!file ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <FileUploader
            onFilesSelected={handleFileSelected}
            multiple={false}
            icon={<Scissors className="w-12 h-12 text-orange-400" />}
            title="Select PDF file"
            description="Drop your PDF here to split it"
            helperText="Runs in your browser — no upload needed"
          />
          <ToolStartPanel
            supportedFormats={['PDF']}
            fileSizeNote="No fixed cap. Large files need more browser memory."
            privacyNote="Splitting runs entirely in your browser."
            workflowSteps={[
              'Upload your PDF.',
              'Choose how to split: all pages, page range, or pick pages.',
              'Download individual files as ZIP or combined PDF.',
            ]}
          />
        </div>
      ) : (
        <div className="space-y-5">
          {/* File Header */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center text-red-500 font-bold shrink-0 text-xs">PDF</div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 truncate">{file.name}</p>
                <p className="text-sm text-slate-500">{formatBytes(file.size)} • {totalPages || '...'} pages</p>
              </div>
            </div>
            <button onClick={reset} className="text-slate-400 hover:text-red-500 transition-colors shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Selector */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4">Choose Split Mode</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {([
                { key: 'all', icon: <Layers className="w-5 h-5" />, label: 'All Pages', desc: 'Extract every page as a separate PDF' },
                { key: 'range', icon: <ChevronRight className="w-5 h-5" />, label: 'Page Range', desc: 'e.g. 1-3, 5, 7-10' },
                { key: 'custom', icon: <CheckSquare className="w-5 h-5" />, label: 'Pick Pages', desc: 'Select pages from thumbnail grid' },
              ] as const).map(m => (
                <button
                  key={m.key}
                  onClick={() => { setSplitMode(m.key); setRangeError(''); }}
                  className={`p-4 rounded-xl border text-left transition-all ${splitMode === m.key ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-slate-200 hover:border-orange-300 text-slate-600'}`}
                >
                  <div className="flex items-center gap-2 mb-1 font-semibold">{m.icon}{m.label}</div>
                  <p className="text-xs opacity-70">{m.desc}</p>
                </button>
              ))}
            </div>

            {/* Range Input */}
            {splitMode === 'range' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Page Range <span className="text-slate-400 font-normal">(e.g. 1-3, 5, 7-9)</span>
                </label>
                <input
                  type="text"
                  value={rangeInput}
                  onChange={e => { setRangeInput(e.target.value); setRangeError(''); }}
                  placeholder={`e.g. 1-5, 8, 10-${totalPages}`}
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 ${rangeError ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                />
                {rangeError && (
                  <p className="text-red-600 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{rangeError}</p>
                )}
                {rangeInput && !rangeError && (() => {
                  const pages = parseRange(rangeInput, totalPages);
                  return pages ? <p className="text-green-600 text-xs mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />{pages.length} page(s) selected</p> : null;
                })()}
              </div>
            )}
          </div>

          {/* Thumbnail Grid for custom mode or info */}
          {(splitMode === 'custom' || splitMode === 'all') && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-800">
                  {splitMode === 'custom' ? 'Pick Pages to Extract' : 'Page Preview'}
                </h3>
                {splitMode === 'custom' && totalPages > 0 && (
                  <button onClick={handleSelectAll} className="text-xs text-orange-600 hover:underline">
                    {selectedPages.size === totalPages ? 'Deselect All' : 'Select All'}
                  </button>
                )}
                {splitMode === 'custom' && <span className="text-xs text-slate-500">{selectedPages.size} selected</span>}
              </div>
              {thumbsLoading ? (
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="aspect-[3/4] bg-slate-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-80 overflow-y-auto">
                  {thumbs.map((thumb, i) => {
                    const isSelected = selectedPages.has(thumb.index);
                    return (
                      <button
                        key={thumb.id}
                        onClick={() => splitMode === 'custom' && togglePage(thumb.index)}
                        className={`relative group aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all ${
                          splitMode === 'custom'
                            ? isSelected
                              ? 'border-orange-400 ring-2 ring-orange-200'
                              : 'border-slate-200 hover:border-orange-300'
                            : 'border-slate-200 cursor-default'
                        }`}
                      >
                        <img src={thumb.img} alt={`Page ${thumb.index + 1}`} className="w-full h-full object-cover" />
                        {splitMode === 'custom' && (
                          <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${isSelected ? 'bg-orange-500/20' : 'bg-transparent group-hover:bg-orange-500/10'}`}>
                            <div className={`absolute top-1 right-1 ${isSelected ? 'text-orange-500' : 'text-transparent group-hover:text-slate-400'}`}>
                              {isSelected ? <CheckSquare className="w-4 h-4 drop-shadow" /> : <Square className="w-4 h-4 drop-shadow" />}
                            </div>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] text-center py-0.5">{thumb.index + 1}</div>
                      </button>
                    );
                  })}
                  {totalPages > 50 && (
                    <div className="aspect-[3/4] bg-slate-50 border border-dashed border-slate-200 rounded-lg flex items-center justify-center text-xs text-slate-400 text-center p-2">
                      +{totalPages - 50} more pages
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Status message */}
          {status.message && (
            <div className={`rounded-xl px-4 py-3 text-sm flex items-center gap-2 ${status.error ? 'bg-red-50 border border-red-200 text-red-700' : status.success ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-blue-50 border border-blue-200 text-blue-700'}`}>
              {status.error ? <AlertCircle className="w-4 h-4 shrink-0" /> : status.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : null}
              {status.message}
            </div>
          )}

          {/* Action buttons */}
          {readyZip ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-3">
              <p className="text-sm text-slate-600 font-medium">✅ Ready to download</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="primary" size="lg" className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleDownloadZip}>
                  <Download className="w-5 h-5 mr-2" /> Download ZIP ({readyZip.name})
                </Button>
                <Button variant="secondary" size="lg" className="flex-1" onClick={reset}>
                  Split Another PDF
                </Button>
              </div>
            </div>
          ) : readySingle ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-3">
              <p className="text-sm text-slate-600 font-medium">✅ Ready to download</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="primary" size="lg" className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleDownloadSingle}>
                  <Download className="w-5 h-5 mr-2" /> Download PDF
                </Button>
                <Button variant="secondary" size="lg" className="flex-1" onClick={reset}>
                  Split Another PDF
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="primary"
                  size="lg"
                  className="flex-1"
                  onClick={handleSplitToZip}
                  isLoading={status.isProcessing}
                  disabled={status.isProcessing || thumbsLoading}
                >
                  <Scissors className="w-5 h-5 mr-2" />
                  {status.isProcessing ? status.message : 'Split to ZIP (Separate Files)'}
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  className="flex-1"
                  onClick={handleExtractSingle}
                  isLoading={status.isProcessing}
                  disabled={status.isProcessing || thumbsLoading || splitMode === 'all'}
                  title={splitMode === 'all' ? 'Select a range or custom pages first' : ''}
                >
                  <FileText className="w-5 h-5 mr-2" />
                  Extract to Single PDF
                </Button>
              </div>
              <p className="text-xs text-slate-400 mt-3 text-center">
                "Split to ZIP" → Each page as a separate file &nbsp;|&nbsp; "Extract to Single PDF" → Selected pages as one PDF
              </p>
            </div>
          )}
        </div>
      )}
      <ToolSEOContent toolKey="/split" />
    </div>
    </>
  );
};

export default SplitPdf;
