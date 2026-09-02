import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { ToolSEOContent } from '../components/ToolSEOContent';
import { FileUploader } from '../components/FileUploader';
import { Button } from '../components/Button';
import { pdfjs, cropPdf, downloadPdf, formatBytes, getPdfPageCount } from '../services/pdfService';
import {
  Crop, Download, RefreshCw, ChevronLeft, ChevronRight,
  Info, CheckCircle2, AlertCircle, Maximize2, Lock, Move
} from 'lucide-react';

type AspectMode = 'free' | '1:1' | '4:3' | '16:9' | 'a4';

const ASPECT_RATIOS: Record<AspectMode, number | null> = {
  free: null,
  '1:1': 1,
  '4:3': 4 / 3,
  '16:9': 16 / 9,
  a4: 210 / 297,
};

export const CropPdf: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [readyPdf, setReadyPdf] = useState<{ data: Uint8Array; name: string } | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLoading, setPageLoading] = useState(false);

  // Crop selection (normalized 0-1)
  const [selection, setSelection] = useState({ x: 0.1, y: 0.1, width: 0.8, height: 0.8 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'none' | 'move' | 'tl' | 'tr' | 'bl' | 'br' | 'draw'>('none');
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialBox, setInitialBox] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [aspectMode, setAspectMode] = useState<AspectMode>('free');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Aspect ratio math corrector
  const getCorrectedBox = useCallback((x: number, y: number, w: number, h: number) => {
    const ratio = ASPECT_RATIOS[aspectMode];
    if (!ratio || !canvasRef.current) return { x, y, width: w, height: h };
    
    const canvas = canvasRef.current;
    const canvasRatio = canvas.width / canvas.height;
    
    // h_px = w_px / ratio
    // h * canvas.height = (w * canvas.width) / ratio
    // h = w * (canvas.width / canvas.height) / ratio
    let correctedW = w;
    let correctedH = w * canvasRatio / ratio;
    
    // If the corrected height exceeds the boundary, shrink width instead
    if (y + correctedH > 1) {
      correctedH = 1 - y;
      correctedW = correctedH * ratio / canvasRatio;
    }
    
    // Also check width boundary
    if (x + correctedW > 1) {
      correctedW = 1 - x;
      correctedH = correctedW * canvasRatio / ratio;
    }
    
    return { x, y, width: correctedW, height: correctedH };
  }, [aspectMode]);

  // Adjust selection when aspect ratio switches
  useEffect(() => {
    if (file) {
      setSelection(prev => getCorrectedBox(prev.x, prev.y, prev.width, prev.height));
    }
  }, [aspectMode, getCorrectedBox]);

  // Render PDF Page
  const loadPage = useCallback(async (pageNum: number) => {
    if (!file || !canvasRef.current || !containerRef.current) return;
    setPageLoading(true);
    try {
      const ab = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: ab }).promise;
      if (totalPages === 0) setTotalPages(pdf.numPages);
      const page = await pdf.getPage(pageNum);
      const containerWidth = containerRef.current.clientWidth || 600;
      const unscaled = page.getViewport({ scale: 1 });
      const scale = Math.min((containerWidth - 16) / unscaled.width, 1.6);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (ctx) await page.render({ canvasContext: ctx, viewport }).promise;
    } catch (e) {
      console.error(e);
      setError('Failed to render page.');
    } finally {
      setPageLoading(false);
    }
  }, [file, totalPages]);

  useEffect(() => {
    if (file) {
      getPdfPageCount(file).then(n => setTotalPages(n)).catch(() => {});
      loadPage(currentPage);
    }
  }, [file, currentPage, loadPage]);

  // Handle Drag / Resize Pointer Down
  const onPointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const clickX = clientX - rect.left;
    const clickY = clientY - rect.top;

    const px = clickX / rect.width;
    const py = clickY / rect.height;

    // Current crop selection in absolute pixel coordinates
    const selLeft = selection.x * rect.width;
    const selTop = selection.y * rect.height;
    const selRight = (selection.x + selection.width) * rect.width;
    const selBottom = (selection.y + selection.height) * rect.height;

    const hitRadius = 24; // tolerance pixel range for click/touch targets

    const distTL = Math.hypot(clickX - selLeft, clickY - selTop);
    const distTR = Math.hypot(clickX - selRight, clickY - selTop);
    const distBL = Math.hypot(clickX - selLeft, clickY - selBottom);
    const distBR = Math.hypot(clickX - selRight, clickY - selBottom);

    setDragStart({ x: px, y: py });
    setInitialBox({ ...selection });

    if (distTL < hitRadius) {
      setDragMode('tl');
    } else if (distTR < hitRadius) {
      setDragMode('tr');
    } else if (distBL < hitRadius) {
      setDragMode('bl');
    } else if (distBR < hitRadius) {
      setDragMode('br');
    } else if (clickX >= selLeft && clickX <= selRight && clickY >= selTop && clickY <= selBottom) {
      setDragMode('move');
    } else {
      setDragMode('draw');
      setSelection({ x: px, y: py, width: 0, height: 0 });
      setInitialBox({ x: px, y: py, width: 0, height: 0 });
    }
    setIsDragging(true);
  };

  // Handle Drag / Resize Pointer Move
  const onPointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || dragMode === 'none' || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const px = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const py = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

    const dx = px - dragStart.x;
    const dy = py - dragStart.y;

    let nextBox = { ...selection };

    if (dragMode === 'move') {
      let nextX = initialBox.x + dx;
      let nextY = initialBox.y + dy;

      // Keep inside boundary bounds
      if (nextX < 0) nextX = 0;
      if (nextY < 0) nextY = 0;
      if (nextX + initialBox.width > 1) nextX = 1 - initialBox.width;
      if (nextY + initialBox.height > 1) nextY = 1 - initialBox.height;

      nextBox = { ...initialBox, x: nextX, y: nextY };
    } 
    else if (dragMode === 'draw') {
      const x = Math.min(px, dragStart.x);
      const y = Math.min(py, dragStart.y);
      const w = Math.abs(px - dragStart.x);
      const h = Math.abs(py - dragStart.y);
      nextBox = getCorrectedBox(x, y, w, h);
    } 
    else {
      // Resize modes
      let left = initialBox.x;
      let top = initialBox.y;
      let right = initialBox.x + initialBox.width;
      let bottom = initialBox.y + initialBox.height;

      if (dragMode === 'tl') {
        left = Math.min(px, right - 0.05);
        top = Math.min(py, bottom - 0.05);
      } else if (dragMode === 'tr') {
        right = Math.max(px, left + 0.05);
        top = Math.min(py, bottom - 0.05);
      } else if (dragMode === 'bl') {
        left = Math.min(px, right - 0.05);
        bottom = Math.max(py, top + 0.05);
      } else if (dragMode === 'br') {
        right = Math.max(px, left + 0.05);
        bottom = Math.max(py, top + 0.05);
      }

      const w = right - left;
      const h = bottom - top;
      nextBox = getCorrectedBox(left, top, w, h);
    }

    setSelection(nextBox);
  };

  const onPointerUp = () => {
    setIsDragging(false);
    setDragMode('none');
    if (selection.width < 0.03 || selection.height < 0.03) {
      setSelection({ x: 0.1, y: 0.1, width: 0.8, height: 0.8 });
    }
  };

  const handleCrop = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError('');
    setSuccess('');
    setReadyPdf(null);
    try {
      const croppedBytes = await cropPdf(file, selection);
      const outputName = `cropped-${file.name}`;
      setReadyPdf({ data: croppedBytes, name: outputName });
      setSuccess(`PDF cropped successfully! All ${totalPages} page(s) processed.`);
    } catch (e) {
      console.error(e);
      setError('Error cropping PDF. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadReady = () => {
    if (!readyPdf) return;
    downloadPdf(readyPdf.data, readyPdf.name, { autoDownload: true });
  };

  const resetSelection = () => setSelection({ x: 0.05, y: 0.05, width: 0.9, height: 0.9 });

  const selPx = canvasRef.current
    ? {
        left: `${selection.x * 100}%`,
        top: `${selection.y * 100}%`,
        width: `${selection.width * 100}%`,
        height: `${selection.height * 100}%`,
      }
    : {};

  return (
    <>
      <Helmet>
        <title>Crop PDF Online Free | Trim PDF Pages - LAK PDF</title>
        <meta name="description" content="Crop PDF pages online for free. Trim margins and clean up document layout." />
        <link rel="canonical" href="https://lakpdf.com/crop-pdf" />
        <meta property="og:title" content="Crop PDF Online Free | Trim PDF Pages - LAK PDF" />
        <meta property="og:description" content="Crop PDF pages online for free. Trim margins and clean up document layout." />
        <meta property="og:url" content="https://lakpdf.com/crop-pdf" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://lakpdf.com/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Crop PDF Online Free | Trim PDF Pages - LAK PDF" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Crop PDF Online Free | Trim PDF Pages - LAK PDF" />
        <meta name="twitter:description" content="Crop PDF pages online for free. Trim margins and clean up document layout." />
        <meta name="twitter:image" content="https://lakpdf.com/og-image.png" />
      </Helmet>
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Crop PDF</h1>
        <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto">
          Adjust the crop box boundaries below. Drag the box to reposition or use the corner circles to resize.
        </p>
      </div>

      {!file ? (
        <FileUploader
          onFilesSelected={(f) => {
            setFile(f[0]);
            setReadyPdf(null);
            setCurrentPage(1);
            setTotalPages(0);
            setError('');
            setSuccess('');
            setSelection({ x: 0.1, y: 0.1, width: 0.8, height: 0.8 });
          }}
          multiple={false}
          icon={<Crop className="w-12 h-12 text-emerald-500" />}
          title="Select PDF"
          description="Drop your PDF here to crop it"
          helperText="Runs locally in your browser"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_290px] gap-6">
          {/* Preview canvas column */}
          <div className="space-y-3">
            {/* Navigation Header */}
            {totalPages > 1 && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-3 py-2.5 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">Preview: Page {currentPage} of {totalPages}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage <= 1 || pageLoading}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-600" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages || pageLoading}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 transition-all"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </button>
                </div>
              </div>
            )}

            {/* Cropping Canvas Frame */}
            <div className="bg-slate-800 rounded-2xl overflow-hidden p-4 flex justify-center shadow-lg border border-slate-700">
              <div
                className="relative inline-block select-none touch-none"
                ref={containerRef}
                onMouseDown={onPointerDown}
                onMouseMove={onPointerMove}
                onMouseUp={onPointerUp}
                onMouseLeave={onPointerUp}
                onTouchStart={onPointerDown}
                onTouchMove={onPointerMove}
                onTouchEnd={onPointerUp}
              >
                {pageLoading && (
                  <div className="absolute inset-0 bg-slate-700/80 flex items-center justify-center z-25 rounded-lg">
                    <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                <canvas ref={canvasRef} className="block bg-white pointer-events-none max-w-full rounded shadow" />

                {/* Crop Overlay Darkening Outside */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute bg-black/50" style={{ top: 0, left: 0, right: 0, height: `${selection.y * 100}%` }} />
                  <div className="absolute bg-black/50" style={{ bottom: 0, left: 0, right: 0, top: `${(selection.y + selection.height) * 100}%` }} />
                  <div className="absolute bg-black/50" style={{ top: `${selection.y * 100}%`, left: 0, width: `${selection.x * 100}%`, height: `${selection.height * 100}%` }} />
                  <div className="absolute bg-black/50" style={{ top: `${selection.y * 100}%`, left: `${(selection.x + selection.width) * 100}%`, right: 0, height: `${selection.height * 100}%` }} />

                  {/* Interacting Crop Box */}
                  <div
                    className="absolute border-2 border-emerald-400 box-border cursor-move"
                    style={selPx}
                  >
                    {/* Visual resize handles */}
                    <div className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-emerald-500 rounded-full shadow cursor-nwse-resize pointer-events-auto" />
                    <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-emerald-500 rounded-full shadow cursor-nesw-resize pointer-events-auto" />
                    <div className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-emerald-500 rounded-full shadow cursor-nesw-resize pointer-events-auto" />
                    <div className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-emerald-500 rounded-full shadow cursor-nwse-resize pointer-events-auto" />

                    {/* Rule of thirds grid lines */}
                    <div className="absolute inset-0 opacity-25">
                      <div className="absolute border-l border-white/40 h-full" style={{ left: '33.33%' }} />
                      <div className="absolute border-l border-white/40 h-full" style={{ left: '66.66%' }} />
                      <div className="absolute border-t border-white/40 w-full" style={{ top: '33.33%' }} />
                      <div className="absolute border-t border-white/40 w-full" style={{ top: '66.66%' }} />
                    </div>

                    {/* Resize coordinate indicator */}
                    <div className="absolute -bottom-6 left-0 text-white text-[10px] bg-slate-900/80 px-1.5 py-0.5 rounded flex items-center gap-1 shadow">
                      <Move className="w-3 h-3 text-emerald-400" />
                      <span>{Math.round(selection.width * 100)}% × {Math.round(selection.height * 100)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-500 text-center flex items-center justify-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>Drag the center to move, drag the handles to resize. Same crop applies to all {totalPages} page(s).</span>
            </p>
          </div>

          {/* Settings Sidebar Column */}
          <div className="space-y-4">
            {/* File info */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900 text-sm truncate max-w-[160px]" title={file.name}>{file.name}</p>
                  <p className="text-xs text-slate-500">{formatBytes(file.size)} • {totalPages} pages</p>
                </div>
                <button onClick={() => { setFile(null); setReadyPdf(null); }} className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-slate-50 transition-colors">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Aspect ratio locks */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <Lock className="w-4 h-4 text-emerald-500" />
                <h4 className="text-sm font-semibold text-slate-700">Aspect Ratio Lock</h4>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.keys(ASPECT_RATIOS) as AspectMode[]).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setAspectMode(mode)}
                    className={`py-1.5 text-xs rounded-lg border font-semibold transition-all ${
                      aspectMode === mode 
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-700 font-bold shadow-sm' 
                        : 'border-slate-200 hover:border-emerald-300 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {mode === 'free' ? 'Free' : mode === 'a4' ? 'A4 Size' : mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Coordinates Info */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-700">Crop Box Dimensions</h4>
                <button onClick={resetSelection} className="text-xs text-emerald-600 hover:underline flex items-center gap-1 font-semibold">
                  <Maximize2 className="w-3.5 h-3.5" /> Reset Selection
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Left (X)', value: `${Math.round(selection.x * 100)}%` },
                  { label: 'Top (Y)', value: `${Math.round(selection.y * 100)}%` },
                  { label: 'Width (W)', value: `${Math.round(selection.width * 100)}%` },
                  { label: 'Height (H)', value: `${Math.round(selection.height * 100)}%` },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-50 rounded-xl p-2 text-center border border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400">{label}</div>
                    <div className="text-sm font-bold text-slate-700">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Messages */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3 flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
              </div>
            )}

            {/* Output Actions */}
            {readyPdf ? (
              <div className="space-y-2">
                <Button variant="primary" size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700 shadow shadow-emerald-500/20" onClick={handleDownloadReady}>
                  <Download className="w-5 h-5 mr-2" /> Download PDF
                </Button>
                <Button variant="ghost" size="sm" className="w-full" onClick={() => { setReadyPdf(null); setSuccess(''); }}>
                  Adjust Selection
                </Button>
              </div>
            ) : (
              <Button
                variant="primary"
                size="lg"
                className="w-full bg-emerald-600 hover:bg-emerald-700 shadow shadow-emerald-500/20"
                onClick={handleCrop}
                isLoading={isProcessing}
                disabled={isProcessing || selection.width < 0.03 || selection.height < 0.03}
              >
                <Crop className="w-5 h-5 mr-2" />
                {isProcessing ? 'Cropping...' : `Crop & Save PDF`}
              </Button>
            )}
          </div>
        </div>
      )}
      <ToolSEOContent toolKey="/crop-pdf" />
    </div>
    </>
  );
};
