import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../components/Button';
import { pdfjs, formatBytes } from '../services/pdfService';
import { GitCompare, Upload, X, ChevronLeft, ChevronRight, Layers, FileDiff, ZoomIn, ZoomOut, AlertCircle, RefreshCw } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { ToolSEOContent } from '../components/ToolSEOContent';

type ViewMode = 'side-by-side' | 'overlay' | 'diff';
type PageSyncMode = 'clamp' | 'strict';

export const ComparePdf: React.FC = () => {
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  
  // Loaded PDF Documents (Proxies)
  const [pdf1Doc, setPdf1Doc] = useState<any>(null);
  const [pdf2Doc, setPdf2Doc] = useState<any>(null);

  // Comparison State
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side');
  const [scale, setScale] = useState(1.0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [diffStats, setDiffStats] = useState<{ percent: number; pixels: number } | null>(null);
  const [diffThreshold, setDiffThreshold] = useState(24);
  const [overlayOpacity, setOverlayOpacity] = useState(50);
  const [ignoreNearWhite, setIgnoreNearWhite] = useState(true);
  const [pageSyncMode, setPageSyncMode] = useState<PageSyncMode>('clamp');

  // Canvas Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvas1Ref = useRef<HTMLCanvasElement>(null);
  const canvas2Ref = useRef<HTMLCanvasElement>(null);
  const diffCanvasRef = useRef<HTMLCanvasElement>(null);
  const renderRunIdRef = useRef(0);

  // 1. Load Documents when files change
  useEffect(() => {
    let url1 = '';
    let url2 = '';

    const loadDocuments = async () => {
      if (!file1 || !file2) {
        setPdf1Doc(null);
        setPdf2Doc(null);
        return;
      }

      setIsProcessing(true);
      setLoadingError(null);

      try {
        // Use Blob URLs for better performance and reliability than ArrayBuffers
        url1 = URL.createObjectURL(file1);
        url2 = URL.createObjectURL(file2);

        // Load File 1
        const loadingTask1 = pdfjs.getDocument(url1);
        const doc1 = await loadingTask1.promise;
        
        // Load File 2
        const loadingTask2 = pdfjs.getDocument(url2);
        const doc2 = await loadingTask2.promise;

        setPdf1Doc(doc1);
        setPdf2Doc(doc2);
        setNumPages(Math.max(doc1.numPages, doc2.numPages));
        setCurrentPage(1);
      } catch (error: any) {
        console.error("Error loading PDF documents:", error);
        setLoadingError(error.message || "Failed to load PDF documents.");
      } finally {
        setIsProcessing(false);
      }
    };

    loadDocuments();

    // Cleanup Blob URLs to prevent memory leaks
    return () => {
      if (url1) URL.revokeObjectURL(url1);
      if (url2) URL.revokeObjectURL(url2);
    };
  }, [file1, file2]);

  // 2. Render Pages when state changes
  useEffect(() => {
    if (!pdf1Doc || !pdf2Doc) return;
    renderPages();
  }, [pdf1Doc, pdf2Doc, currentPage, scale, viewMode, diffThreshold, ignoreNearWhite, pageSyncMode]);

  useEffect(() => {
    if (!file1 || !file2) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        setCurrentPage((p) => Math.max(1, p - 1));
      } else if (event.key === 'ArrowRight') {
        setCurrentPage((p) => Math.min(numPages, p + 1));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [file1, file2, numPages]);

  const drawMissingPage = (ctx: CanvasRenderingContext2D, width: number, height: number, label: string) => {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#cbd5e1';
    ctx.strokeRect(1, 1, Math.max(1, width - 2), Math.max(1, height - 2));
    ctx.fillStyle = '#475569';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, width / 2, height / 2);
  };

  const renderPages = async () => {
    if (!canvas1Ref.current || !canvas2Ref.current) return;
    const renderRunId = ++renderRunIdRef.current;
    setIsProcessing(true);
    setDiffStats(null); // Reset stats while rendering

    try {
      // Fetch Pages
      // Handle edge case where one doc has fewer pages
      const hasPage1 = currentPage <= pdf1Doc.numPages;
      const hasPage2 = currentPage <= pdf2Doc.numPages;
      const pageNum1 = pageSyncMode === 'strict' ? currentPage : Math.min(currentPage, pdf1Doc.numPages);
      const pageNum2 = pageSyncMode === 'strict' ? currentPage : Math.min(currentPage, pdf2Doc.numPages);

      const page1 = pageNum1 >= 1 && pageNum1 <= pdf1Doc.numPages ? await pdf1Doc.getPage(pageNum1) : null;
      const page2 = pageNum2 >= 1 && pageNum2 <= pdf2Doc.numPages ? await pdf2Doc.getPage(pageNum2) : null;
      if (renderRunIdRef.current !== renderRunId) return;

      const viewport1 = page1?.getViewport({ scale });
      const viewport2 = page2?.getViewport({ scale });

      // Use the dimensions of the larger page to size canvases
      const width = Math.max(viewport1?.width || 0, viewport2?.width || 0, 600);
      const height = Math.max(viewport1?.height || 0, viewport2?.height || 0, 800);

      // Prepare Canvases
      [canvas1Ref.current, canvas2Ref.current, diffCanvasRef.current].forEach(c => {
        if (c) {
          c.width = width;
          c.height = height;
          // Clear previous content
          const ctx = c.getContext('2d');
          ctx?.clearRect(0, 0, width, height);
        }
      });

      // Render Page 1
      const ctx1 = canvas1Ref.current.getContext('2d');
      if (ctx1 && page1 && viewport1) {
        await page1.render({ canvasContext: ctx1, viewport: viewport1 }).promise;
      } else if (ctx1) {
        drawMissingPage(ctx1, width, height, pageSyncMode === 'strict' ? 'Page missing in File A' : 'Page unavailable');
      }

      // Render Page 2
      const ctx2 = canvas2Ref.current.getContext('2d');
      if (ctx2 && page2 && viewport2) {
        await page2.render({ canvasContext: ctx2, viewport: viewport2 }).promise;
      } else if (ctx2) {
        drawMissingPage(ctx2, width, height, pageSyncMode === 'strict' ? 'Page missing in File B' : 'Page unavailable');
      }
      if (renderRunIdRef.current !== renderRunId) return;

      // Calculate Diff if needed
      if (viewMode === 'diff' && ctx1 && ctx2 && diffCanvasRef.current) {
        calculateDiff(ctx1, ctx2, width, height);
      }

      if (pageSyncMode === 'strict' && (!hasPage1 || !hasPage2)) {
        setLoadingError('Strict page mapping: one file has no page at this index.');
      } else {
        setLoadingError(null);
      }

    } catch (e: any) {
      console.error("Render error", e);
      setLoadingError("Error rendering page: " + (e.message || "Unknown error"));
    } finally {
      if (renderRunIdRef.current === renderRunId) {
        setIsProcessing(false);
      }
    }
  };

  const calculateDiff = (ctx1: CanvasRenderingContext2D, ctx2: CanvasRenderingContext2D, width: number, height: number) => {
    try {
      const img1 = ctx1.getImageData(0, 0, width, height);
      const img2 = ctx2.getImageData(0, 0, width, height);
      const diff = ctx1.createImageData(width, height);
      
      let diffPixels = 0;
      const totalPixels = width * height;

      for (let i = 0; i < img1.data.length; i += 4) {
        const r1 = img1.data[i];
        const g1 = img1.data[i+1];
        const b1 = img1.data[i+2];
        const a1 = img1.data[i+3];

        const r2 = img2.data[i];
        const g2 = img2.data[i+1];
        const b2 = img2.data[i+2];
        const a2 = img2.data[i+3];

        // Pixel Diff Algorithm
        // Ignore fully transparent pixels in both
        if (a1 === 0 && a2 === 0) continue;

        // Threshold for noise
        const threshold = diffThreshold;
        const bothNearWhite = r1 > 245 && g1 > 245 && b1 > 245 && r2 > 245 && g2 > 245 && b2 > 245;
        if (ignoreNearWhite && bothNearWhite) {
          continue;
        }

        if (Math.abs(r1 - r2) > threshold || Math.abs(g1 - g2) > threshold || Math.abs(b1 - b2) > threshold || Math.abs(a1 - a2) > threshold) {
           // Highlight Diff in Red
           diff.data[i] = 255;     // R
           diff.data[i+1] = 0;     // G
           diff.data[i+2] = 0;     // B
           diff.data[i+3] = 255;   // A
           diffPixels++;
        } else {
           // Fade out identical pixels (Grayish) to make red pop
           const gray = (r1 + g1 + b1) / 3;
           const alpha = 40; // Low opacity for context
           diff.data[i] = gray;
           diff.data[i+1] = gray;
           diff.data[i+2] = gray;
           diff.data[i+3] = alpha; 
        }
      }

      const diffCtx = diffCanvasRef.current?.getContext('2d');
      if (diffCtx) {
        diffCtx.putImageData(diff, 0, 0);
      }

      setDiffStats({
        pixels: diffPixels,
        percent: (diffPixels / totalPixels) * 100
      });
    } catch (e) {
      console.error("Diff calculation error", e);
    }
  };

  const handleReset = () => {
    setFile1(null);
    setFile2(null);
    setPdf1Doc(null);
    setPdf2Doc(null);
    setDiffStats(null);
    setCurrentPage(1);
    setLoadingError(null);
    setDiffThreshold(24);
    setOverlayOpacity(50);
    setIgnoreNearWhite(true);
    setPageSyncMode('clamp');
  };

  return (
    <>
      <Helmet>
        <title>Compare PDF Online Free | Find PDF Differences - LAK PDF</title>
        <meta name="description" content="Compare PDF files online for free and detect page-level differences quickly." />
        <link rel="canonical" href="https://lakpdf.com/compare-pdf" />
        <meta property="og:title" content="Compare PDF Online Free | Find PDF Differences - LAK PDF" />
        <meta property="og:description" content="Compare PDF files online for free and detect page-level differences quickly." />
        <meta property="og:url" content="https://lakpdf.com/compare-pdf" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://lakpdf.com/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Compare PDF Files Online Free - LAK PDF" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Compare PDF Files Online Free - LAK PDF" />
        <meta name="twitter:description" content="Compare two PDF files online and highlight differences instantly." />
        <meta name="twitter:image" content="https://lakpdf.com/og-image.png" />
      </Helmet>
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-100 rounded-lg text-violet-600">
                <GitCompare className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Compare PDF</h1>
                {file1 && file2 && (
                  <p className="text-xs text-slate-500">Comparing page {currentPage} of {numPages}</p>
                )}
              </div>
            </div>

            {file1 && file2 && (
              <div className="flex items-center gap-4">
                {/* View Modes */}
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button 
                    onClick={() => setViewMode('side-by-side')}
                    className={`p-2 rounded-md flex items-center gap-2 text-sm font-medium transition-all ${viewMode === 'side-by-side' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                    title="Side by Side View"
                  >
                    <LayoutSplitIcon /> <span className="hidden sm:inline">Split</span>
                  </button>
                  <button 
                    onClick={() => setViewMode('overlay')}
                    className={`p-2 rounded-md flex items-center gap-2 text-sm font-medium transition-all ${viewMode === 'overlay' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                    title="Overlay View"
                  >
                    <Layers className="w-4 h-4" /> <span className="hidden sm:inline">Overlay</span>
                  </button>
                  <button 
                    onClick={() => setViewMode('diff')}
                    className={`p-2 rounded-md flex items-center gap-2 text-sm font-medium transition-all ${viewMode === 'diff' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                    title="Difference Highlight"
                  >
                    <FileDiff className="w-4 h-4" /> <span className="hidden sm:inline">Diff</span>
                  </button>
                </div>

                <div className="h-8 w-px bg-slate-200 mx-2"></div>

                <Button variant="secondary" size="sm" onClick={handleReset}>
                  <RefreshCw className="w-4 h-4 mr-2" /> New
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Toolbar */}
        {file1 && file2 && (
          <div className="border-t border-slate-100 bg-slate-50 px-4 py-2">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
               {/* Pagination */}
               <div className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 p-1 shadow-sm">
                 <button 
                   onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                   disabled={currentPage === 1 || isProcessing}
                   className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30"
                 >
                   <ChevronLeft className="w-4 h-4" />
                 </button>
                 <span className="text-sm font-medium w-24 text-center select-none">
                   Page {currentPage} / {numPages}
                 </span>
                 <button 
                   onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
                   disabled={currentPage === numPages || isProcessing}
                   className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30"
                 >
                   <ChevronRight className="w-4 h-4" />
                 </button>
               </div>

               {/* Zoom */}
               <div className="flex items-center gap-2">
                 <button 
                   onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
                   className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                 >
                   <ZoomOut className="w-4 h-4" />
                 </button>
                 <span className="text-sm font-mono w-16 text-center">{Math.round(scale * 100)}%</span>
                 <button 
                   onClick={() => setScale(s => Math.min(3, s + 0.25))}
                   className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                 >
                   <ZoomIn className="w-4 h-4" />
                 </button>
               </div>

               <div className="flex items-center gap-2 text-sm">
                 <span className="text-slate-500">Page map</span>
                 <select
                   value={pageSyncMode}
                   onChange={(e) => setPageSyncMode(e.target.value as PageSyncMode)}
                   className="px-2 py-1 rounded border border-slate-300 bg-white text-slate-700"
                 >
                   <option value="clamp">Clamp</option>
                   <option value="strict">Strict</option>
                 </select>
               </div>

               {viewMode === 'diff' && (
                 <div className="flex items-center gap-3">
                   <label className="text-sm text-slate-500">Sensitivity</label>
                   <input
                     type="range"
                     min={5}
                     max={60}
                     value={diffThreshold}
                     onChange={(e) => setDiffThreshold(parseInt(e.target.value, 10))}
                   />
                   <span className="text-xs font-mono w-10 text-right">{diffThreshold}</span>
                   <label className="text-xs text-slate-500 flex items-center gap-1">
                     <input
                       type="checkbox"
                       checked={ignoreNearWhite}
                       onChange={(e) => setIgnoreNearWhite(e.target.checked)}
                     />
                     Ignore white bg
                   </label>
                 </div>
               )}

               {viewMode === 'overlay' && (
                 <div className="flex items-center gap-3">
                   <label className="text-sm text-slate-500">Overlay</label>
                   <input
                     type="range"
                     min={15}
                     max={85}
                     value={overlayOpacity}
                     onChange={(e) => setOverlayOpacity(parseInt(e.target.value, 10))}
                   />
                   <span className="text-xs font-mono w-10 text-right">{overlayOpacity}%</span>
                 </div>
               )}
            </div>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {!file1 || !file2 ? (
          /* Upload State */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mt-12">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-700 text-center">Original Document (File A)</h3>
              {!file1 ? (
                 <label className="flex flex-col items-center justify-center h-80 border-2 border-dashed border-violet-200 rounded-3xl bg-white hover:bg-violet-50 cursor-pointer transition-colors shadow-sm group">
                   <div className="w-16 h-16 bg-violet-100 text-violet-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Upload className="w-8 h-8" />
                   </div>
                   <span className="font-bold text-violet-700">Select Original PDF</span>
                   <p className="text-sm text-slate-400 mt-2">Drop file here</p>
                   <input type="file" accept=".pdf" className="hidden" onChange={(e) => e.target.files && setFile1(e.target.files[0])} />
                 </label>
              ) : (
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 relative">
                   <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-red-500 font-bold text-xs shrink-0">PDF</div>
                     <div className="overflow-hidden">
                       <p className="font-bold text-slate-800 truncate">{file1.name}</p>
                       <p className="text-sm text-slate-500">{formatBytes(file1.size)}</p>
                     </div>
                   </div>
                   <button onClick={() => setFile1(null)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500"><X /></button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-700 text-center">Modified Document (File B)</h3>
              {!file2 ? (
                 <label className="flex flex-col items-center justify-center h-80 border-2 border-dashed border-pink-200 rounded-3xl bg-white hover:bg-pink-50 cursor-pointer transition-colors shadow-sm group">
                   <div className="w-16 h-16 bg-pink-100 text-pink-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Upload className="w-8 h-8" />
                   </div>
                   <span className="font-bold text-pink-700">Select New PDF</span>
                   <p className="text-sm text-slate-400 mt-2">Drop file here</p>
                   <input type="file" accept=".pdf" className="hidden" onChange={(e) => e.target.files && setFile2(e.target.files[0])} />
                 </label>
              ) : (
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 relative">
                   <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-red-500 font-bold text-xs shrink-0">PDF</div>
                     <div className="overflow-hidden">
                       <p className="font-bold text-slate-800 truncate">{file2.name}</p>
                       <p className="text-sm text-slate-500">{formatBytes(file2.size)}</p>
                     </div>
                   </div>
                   <button onClick={() => setFile2(null)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500"><X /></button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Comparison View */
          <div ref={containerRef} className="flex flex-col items-center justify-center min-h-[600px]">
            
            {loadingError && (
               <div className="mb-6 bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl flex items-center gap-2 shadow-sm animate-in slide-in-from-top-2">
                 <AlertCircle className="w-5 h-5 shrink-0" />
                 <p>{loadingError}</p>
                 <button onClick={handleReset} className="ml-auto text-sm font-bold underline">Try Again</button>
               </div>
            )}

            {isProcessing && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm">
                <div className="bg-white p-4 rounded-xl shadow-xl flex items-center gap-3">
                  <div className="animate-spin w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full"></div>
                  <span className="font-medium text-slate-700">Processing...</span>
                </div>
              </div>
            )}

            {/* Stats Badge */}
            {viewMode === 'diff' && diffStats && !isProcessing && (
              <div className={`mb-6 px-4 py-2 rounded-full border flex items-center gap-2 text-sm font-bold shadow-sm ${diffStats.percent > 0 ? 'bg-red-50 border-red-200 text-red-600' : 'bg-green-50 border-green-200 text-green-600'}`}>
                 <AlertCircle className="w-4 h-4" />
                 {diffStats.percent === 0 
                    ? "Perfect Match! No differences found." 
                    : `${diffStats.percent.toFixed(2)}% Difference Detected (${diffStats.pixels} pixels changed)`}
              </div>
            )}

            {/* Viewports */}
            <div className={`
               transition-all duration-300
               ${viewMode === 'side-by-side' ? 'grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 w-full' : 'relative w-full max-w-full inline-block'}
            `}>
              {/* Canvas 1 */}
              <div className={`
                 bg-white shadow-lg border border-slate-200
                 ${viewMode === 'side-by-side' ? 'w-full overflow-auto' : 'relative z-0'}
                 ${viewMode === 'overlay' ? 'mix-blend-multiply' : ''}
              `}>
                 {viewMode === 'side-by-side' && <div className="bg-slate-100 p-2 text-xs font-bold text-center text-slate-500 border-b">Original</div>}
                 <canvas
                   ref={canvas1Ref}
                   className="block mx-auto"
                   style={{ opacity: viewMode === 'overlay' ? (overlayOpacity / 100) : 1 }}
                 />
              </div>

              {/* Canvas 2 / Overlay */}
              <div className={`
                 bg-white shadow-lg border border-slate-200
                 ${viewMode === 'side-by-side' ? 'w-full overflow-auto' : 'absolute inset-0 z-10'}
                 ${viewMode === 'diff' ? 'hidden' : ''}
                 ${viewMode === 'overlay' ? 'mix-blend-multiply bg-transparent border-none shadow-none pointer-events-none' : ''}
              `}>
                 {viewMode === 'side-by-side' && <div className="bg-slate-100 p-2 text-xs font-bold text-center text-slate-500 border-b">Modified</div>}
                 <canvas
                   ref={canvas2Ref}
                   className="block mx-auto"
                   style={{ opacity: viewMode === 'overlay' ? (overlayOpacity / 100) : 1 }}
                 />
              </div>

               {/* Diff Canvas */}
               <div className={`
                 bg-white shadow-lg border border-slate-200 absolute inset-0 z-20
                 ${viewMode !== 'diff' ? 'hidden' : ''}
              `}>
                 <canvas ref={diffCanvasRef} className="block mx-auto" />
              </div>
            </div>

            {viewMode === 'overlay' && (
               <p className="mt-4 text-sm text-slate-500 flex items-center gap-2">
                 <Layers className="w-4 h-4" /> Overlay Mode: Documents are stacked with 50% opacity. Shifts will appear blurred.
               </p>
            )}

          </div>
        )}
      </div>
      <ToolSEOContent toolKey="/compare-pdf" />
    </div>
    </>
  );
};

// Helper Icon
const LayoutSplitIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <line x1="12" y1="3" x2="12" y2="21" />
  </svg>
);
