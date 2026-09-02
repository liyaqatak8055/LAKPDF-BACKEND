import React, { useState, useEffect } from 'react';
import { FileUploader } from '../components/FileUploader';
import { Button } from '../components/Button';
import { PdfFile, ProcessingStatus } from '../types';
import { pdfjs, downloadPdf, formatBytes } from '../services/pdfService';
import { PDFDocument, degrees } from 'pdf-lib';
import {
  RotateCw, RotateCcw, X, Download, CheckSquare, Square,
  Undo2, RefreshCw, CheckCircle2, AlertCircle
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { NextStepPanel, RelatedActions, ToolStartPanel } from '../components/ToolProductPanels';
import { Helmet } from 'react-helmet-async';
import { ToolSEOContent } from '../components/ToolSEOContent';

interface PageItem {
  id: string;
  index: number; // 0-based
  img: string;
  rotation: 0 | 90 | 180 | 270;
}

export const RotatePdf: React.FC = () => {
  const [file, setFile] = useState<PdfFile | null>(null);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<ProcessingStatus>({ isProcessing: false, message: '' });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<PageItem[][]>([]);
  const [readyPdf, setReadyPdf] = useState<{ data: Uint8Array; name: string } | null>(null);

  // Load thumbnails
  useEffect(() => {
    if (!file) { setPages([]); setSelectedIds(new Set()); setHistory([]); return; }

    const load = async () => {
      setLoading(true);
      try {
        const ab = await file.file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: ab }).promise;
        const newPages: PageItem[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.45 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport }).promise;
            newPages.push({ id: uuidv4(), index: i - 1, img: canvas.toDataURL('image/jpeg', 0.75), rotation: 0 });
          }
        }
        setPages(newPages);
      } catch (e) {
        console.error(e);
        setStatus({ isProcessing: false, message: 'Failed to load PDF pages.', error: 'Error' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [file]);

  const recordHistory = (next: PageItem[]) => {
    setHistory(prev => [...prev.slice(-20), pages]);
    setPages(next);
    setReadyPdf(null);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    setPages(history[history.length - 1]);
    setHistory(prev => prev.slice(0, -1));
    setReadyPdf(null);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === pages.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(pages.map(p => p.id)));
  };

  const rotateSelected = (delta: 90 | -90) => {
    if (selectedIds.size === 0) {
      // Rotate all if nothing selected
      const next = pages.map(p => ({
        ...p,
        rotation: (((p.rotation + delta) + 360) % 360) as PageItem['rotation']
      }));
      recordHistory(next);
    } else {
      const next = pages.map(p =>
        selectedIds.has(p.id)
          ? { ...p, rotation: (((p.rotation + delta) + 360) % 360) as PageItem['rotation'] }
          : p
      );
      recordHistory(next);
    }
  };

  const rotateSinglePage = (id: string, delta: 90 | -90) => {
    const next = pages.map(p =>
      p.id === id
        ? { ...p, rotation: (((p.rotation + delta) + 360) % 360) as PageItem['rotation'] }
        : p
    );
    recordHistory(next);
  };

  const resetAllRotations = () => {
    const next = pages.map(p => ({ ...p, rotation: 0 as const }));
    recordHistory(next);
    setSelectedIds(new Set());
  };

  const handleProcess = async () => {
    if (!file || pages.length === 0) return;
    setStatus({ isProcessing: true, message: 'Applying rotations...' });
    setReadyPdf(null);

    try {
      const ab = await file.file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(ab);
      const pdfPages = pdfDoc.getPages();

      pages.forEach((item) => {
        const page = pdfPages[item.index];
        if (page && item.rotation !== 0) {
          const cur = page.getRotation().angle;
          page.setRotation(degrees(cur + item.rotation));
        }
      });

      const outputBytes = await pdfDoc.save();
      const outputName = `rotated-${file.name}`;
      setReadyPdf({ data: outputBytes, name: outputName });
      setStatus({ isProcessing: false, message: 'Done! Rotated PDF ready.', success: true });
    } catch (error) {
      console.error(error);
      setStatus({ isProcessing: false, message: 'Error rotating PDF.', error: 'Failed' });
    }
  };

  const handleDownload = () => {
    if (!readyPdf) return;
    downloadPdf(readyPdf.data, readyPdf.name, { autoDownload: true });
  };

  const rotatedCount = pages.filter(p => p.rotation !== 0).length;

  return (
    <>
      <Helmet>
        <title>Rotate PDF Pages Online Free - LAK PDF</title>
        <meta name="description" content="Rotate PDF pages online free. Fix page orientation in a few clicks." />
        <link rel="canonical" href="https://lakpdf.com/rotate" />
        <meta property="og:title" content="Rotate PDF Pages Online Free - LAK PDF" />
        <meta property="og:description" content="Rotate PDF pages online free. Fix page orientation in a few clicks." />
        <meta property="og:url" content="https://lakpdf.com/rotate" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://lakpdf.com/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Rotate PDF Pages Online Free - LAK PDF" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Rotate PDF Pages Online Free - LAK PDF" />
        <meta name="twitter:description" content="Rotate PDF pages online free. Fix page orientation in a few clicks." />
        <meta name="twitter:image" content="https://lakpdf.com/og-image.png" />
      </Helmet>
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Rotate PDF</h1>
        <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto">
          Rotate individual pages or all pages at once. Click pages to select, then rotate.
        </p>
      </div>

      {!file ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <FileUploader
            onFilesSelected={(files) => {
              if (files.length > 0) {
                setFile({ id: uuidv4(), file: files[0], name: files[0].name, size: files[0].size });
                setStatus({ isProcessing: false, message: '' });
                setReadyPdf(null);
              }
            }}
            multiple={false}
            icon={<RotateCw className="w-12 h-12 text-purple-400" />}
            title="Select PDF file"
            description="Drop your PDF here to rotate pages"
            helperText="Runs in your browser"
          />
          <ToolStartPanel
            supportedFormats={['PDF']}
            fileSizeNote="No fixed cap. Large files may take a moment to preview."
            privacyNote="Rotation runs in your browser."
            workflowSteps={[
              'Upload your PDF.',
              'Click pages to select. Rotate selected or all pages.',
              'Download the corrected PDF.',
            ]}
          />
        </div>
      ) : (
        <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* Main area */}
          <div className="space-y-4">
            {/* File header */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center text-red-500 font-bold text-xs shrink-0">PDF</div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{file.name}</p>
                  <p className="text-sm text-slate-500">{formatBytes(file.size)} • {pages.length} pages</p>
                </div>
              </div>
              <button onClick={() => { setFile(null); setReadyPdf(null); setStatus({ isProcessing: false, message: '' }); }} className="text-slate-400 hover:text-red-500 shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Toolbar */}
            {pages.length > 0 && !loading && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 flex flex-wrap items-center gap-2">
                <button
                  onClick={handleSelectAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
                >
                  {selectedIds.size === pages.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  {selectedIds.size === pages.length ? 'Deselect All' : 'Select All'}
                </button>

                <div className="h-5 w-px bg-slate-200" />

                <button
                  onClick={() => rotateSelected(-90)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-purple-50 hover:border-purple-300 text-slate-600"
                >
                  <RotateCcw className="w-4 h-4" />
                  {selectedIds.size > 0 ? `Left (${selectedIds.size})` : 'All Left'}
                </button>
                <button
                  onClick={() => rotateSelected(90)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-purple-50 hover:border-purple-300 text-slate-600"
                >
                  <RotateCw className="w-4 h-4" />
                  {selectedIds.size > 0 ? `Right (${selectedIds.size})` : 'All Right'}
                </button>

                <div className="h-5 w-px bg-slate-200" />

                <button
                  onClick={handleUndo}
                  disabled={history.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-30"
                >
                  <Undo2 className="w-4 h-4" /> Undo
                </button>
                <button
                  onClick={resetAllRotations}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-red-50 hover:border-red-300 text-slate-600"
                >
                  <RefreshCw className="w-4 h-4" /> Reset All
                </button>

                {rotatedCount > 0 && (
                  <span className="ml-auto text-xs text-purple-600 bg-purple-50 border border-purple-200 px-2 py-1 rounded-full">
                    {rotatedCount} page(s) rotated
                  </span>
                )}
              </div>
            )}

            {/* Thumbnail Grid */}
            {loading ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="aspect-[3/4] bg-slate-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                <p className="text-xs text-slate-500 mb-3">
                  Click to select pages. Hover to see per-page rotate buttons. Rotation badge shows current angle.
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-[520px] overflow-y-auto">
                  {pages.map((page) => {
                    const isSelected = selectedIds.has(page.id);
                    return (
                      <div
                        key={page.id}
                        onClick={() => toggleSelect(page.id)}
                        className={`group relative aspect-[3/4] rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                          isSelected ? 'border-purple-400 ring-2 ring-purple-200' : 'border-slate-200 hover:border-purple-300'
                        }`}
                      >
                        <img
                          src={page.img}
                          alt={`Page ${page.index + 1}`}
                          className="w-full h-full object-cover transition-transform duration-300"
                          style={{ transform: `rotate(${page.rotation}deg)` }}
                        />
                        {/* Page number */}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] text-center py-0.5">
                          {page.index + 1}
                        </div>
                        {/* Rotation badge */}
                        {page.rotation !== 0 && (
                          <div className="absolute top-1 left-1 bg-purple-500 text-white text-[9px] px-1 rounded">
                            {page.rotation}°
                          </div>
                        )}
                        {/* Selection indicator */}
                        <div className={`absolute top-1 right-1 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                          {isSelected ? <CheckSquare className="w-4 h-4 text-purple-500 drop-shadow" /> : <Square className="w-4 h-4 text-white drop-shadow" />}
                        </div>
                        {/* Hover rotation buttons */}
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); rotateSinglePage(page.id, -90); }}
                            className="p-1.5 bg-white/90 rounded-full hover:bg-white text-purple-700 shadow"
                            title="Rotate left"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); rotateSinglePage(page.id, 90); }}
                            className="p-1.5 bg-white/90 rounded-full hover:bg-white text-purple-700 shadow"
                            title="Rotate right"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Status */}
            {status.message && (
              <div className={`rounded-xl px-4 py-3 text-sm flex items-center gap-2 ${status.error ? 'bg-red-50 border border-red-200 text-red-700' : status.success ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-blue-50 border border-blue-200 text-blue-700'}`}>
                {status.error ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                {status.message}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 mb-4">Apply Rotation</h3>
              <div className="space-y-3">
                {readyPdf ? (
                  <Button variant="primary" size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleDownload}>
                    <Download className="w-5 h-5 mr-2" /> Download PDF
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full bg-purple-500 hover:bg-purple-600"
                    onClick={handleProcess}
                    isLoading={status.isProcessing}
                    disabled={status.isProcessing || loading || rotatedCount === 0}
                  >
                    {status.isProcessing ? 'Saving...' : `Apply & Download${rotatedCount > 0 ? ` (${rotatedCount} page${rotatedCount > 1 ? 's' : ''})` : ''}`}
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="w-full" onClick={() => { setFile(null); setReadyPdf(null); setStatus({ isProcessing: false, message: '' }); }}>
                  Choose Different PDF
                </Button>
              </div>
              {rotatedCount === 0 && !loading && pages.length > 0 && (
                <p className="text-xs text-slate-400 mt-3 text-center">Rotate at least one page to enable download</p>
              )}
            </div>

            <NextStepPanel
              title="Tips"
              steps={[
                'Click pages to select. Selected pages are highlighted.',
                'Use toolbar to rotate selected or all pages at once.',
                'Hover over any page for quick rotate buttons.',
                'Use Undo to reverse last rotation action.',
              ]}
            />
            <RelatedActions
              actions={[
                { label: 'Organize PDF', to: '/organize-pdf' },
                { label: 'Delete pages', to: '/delete-page' },
                { label: 'Add page numbers', to: '/page-number' },
              ]}
            />
          </div>
        </div>
      )}
      <ToolSEOContent toolKey="/rotate" />
    </div>
    </>
  );
};
