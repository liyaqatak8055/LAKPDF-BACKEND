import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Loader2, FileText } from "lucide-react";
import { pdfjs } from "../../services/pdfService";

interface DocumentViewerPanelProps {
  file: File | null;
  className?: string;
}

export const DocumentViewerPanel: React.FC<DocumentViewerPanelProps> = ({ file, className = "" }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pdfDocRef = useRef<any>(null);
  const renderTaskRef = useRef<any>(null);

  const [numPages, setNumPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(0.85);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);

  const isPdf = file ? file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf") : false;
  const isImage = file ? file.type.startsWith("image/") || /\.(png|jpe?g|webp|bmp|gif)$/i.test(file.name) : false;

  // Load PDF Document or Image
  useEffect(() => {
    if (!file) {
      setPdfDoc(null);
      setNumPages(1);
      setCurrentPage(1);
      setImagePreviewUrl(null);
      return;
    }

    if (isImage) {
      const url = URL.createObjectURL(file);
      setImagePreviewUrl(url);
      setIsLoading(false);
      return () => {
        URL.revokeObjectURL(url);
      };
    }

    if (!isPdf) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const loadPdf = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        if (!isMounted) return;

        const loadingTask = pdfjs.getDocument({
          data: arrayBuffer,
          cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version || "5.4.624"}/cmaps/`,
          cMapPacked: true,
        });

        const doc = await loadingTask.promise;
        if (!isMounted) return;

        pdfDocRef.current = doc;
        setPdfDoc(doc);
        setNumPages(doc.numPages || 1);
        setCurrentPage(1);
        setIsLoading(false);
      } catch (err: any) {
        if (!isMounted) return;
        console.error("Error loading PDF preview:", err);
        setError("Could not load PDF document preview.");
        setIsLoading(false);
      }
    };

    loadPdf();

    return () => {
      isMounted = false;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
      pdfDocRef.current = null;
      setPdfDoc(null);
    };
  }, [file, isPdf, isImage]);

  // Render Current PDF Page
  useEffect(() => {
    if (!isPdf || !pdfDoc || !canvasRef.current) return;

    let isCancelled = false;
    setIsRendering(true);

    const renderPage = async () => {
      try {
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {}
        }

        const page = await pdfDoc.getPage(currentPage);
        if (isCancelled || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale: zoom * dpr });

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
        canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;

        const renderContext = {
          canvasContext: ctx,
          viewport,
        };

        const task = page.render(renderContext);
        renderTaskRef.current = task;

        await task.promise;
        if (!isCancelled) {
          setIsRendering(false);
        }
      } catch (err: any) {
        if (err?.name === "RenderingCancelledException") {
          return;
        }
        console.warn("PDF render notice:", err);
        if (!isCancelled) {
          setIsRendering(false);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, [pdfDoc, currentPage, zoom, isPdf, isLoading]);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((p) => p - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < numPages) {
      setCurrentPage((p) => p + 1);
    }
  };

  const handleZoomIn = () => {
    setZoom((z) => Math.min(2.5, Math.round((z + 0.15) * 100) / 100));
  };

  const handleZoomOut = () => {
    setZoom((z) => Math.max(0.4, Math.round((z - 0.15) * 100) / 100));
  };

  const handleFitWidth = () => {
    if (!containerRef.current || !pdfDocRef.current) {
      setZoom(0.85);
      return;
    }
    const containerWidth = containerRef.current.clientWidth - 48; // padding
    if (containerWidth > 200) {
      // Standard page is ~612pt wide
      const targetZoom = Math.min(1.4, Math.max(0.5, containerWidth / 620));
      setZoom(Math.round(targetZoom * 100) / 100);
    } else {
      setZoom(0.85);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col h-full bg-[#f1f4f9] border-r border-slate-200 overflow-hidden select-none ${className}`}
    >
      {/* Document Viewport */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 flex justify-center items-start">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 text-slate-500 py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            <span className="text-xs font-semibold">Loading document preview...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-2 text-slate-500 py-12 text-center max-w-xs">
            <FileText className="w-10 h-10 text-slate-400 mb-1" />
            <span className="text-sm font-semibold text-slate-700">{file?.name}</span>
            <span className="text-xs text-slate-500">{error}</span>
          </div>
        ) : isImage && imagePreviewUrl ? (
          <div className="bg-white rounded-lg shadow-md border border-slate-200/80 overflow-hidden max-w-full">
            <img
              src={imagePreviewUrl}
              alt={file?.name || "Document Preview"}
              style={{ transform: `scale(${zoom})`, transformOrigin: "top center", transition: "transform 0.15s ease" }}
              className="max-w-full h-auto block"
            />
          </div>
        ) : isPdf ? (
          <div className="relative bg-white rounded-lg shadow-lg border border-slate-300/80 overflow-hidden transition-all duration-150">
            {isRendering && (
              <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] flex items-center justify-center z-10">
                <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
              </div>
            )}
            <canvas ref={canvasRef} className="block" />
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center max-w-sm">
            <FileText className="w-12 h-12 text-primary-600 mx-auto mb-3" />
            <p className="font-bold text-slate-800 text-sm">{file?.name}</p>
            <p className="text-xs text-slate-500 mt-1">
              Document text has been analyzed for AI Summary.
            </p>
          </div>
        )}
      </div>

      {/* Floating Bottom Toolbar (Smallpdf Style) */}
      {(isPdf || isImage) && !isLoading && !error && (
        <div className="p-3 flex justify-center shrink-0 z-20">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-slate-200 shadow-md text-slate-700 text-xs font-semibold">
            {/* Page navigation (PDF only) */}
            {isPdf && (
              <>
                <button
                  type="button"
                  onClick={handlePrevPage}
                  disabled={currentPage <= 1}
                  className="p-1 rounded-full hover:bg-slate-100 disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Previous page"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-700" />
                </button>
                <span className="px-1 text-slate-800 text-xs font-semibold select-none min-w-[44px] text-center">
                  {currentPage} / {numPages}
                </span>
                <button
                  type="button"
                  onClick={handleNextPage}
                  disabled={currentPage >= numPages}
                  className="p-1 rounded-full hover:bg-slate-100 disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Next page"
                >
                  <ChevronRight className="w-4 h-4 text-slate-700" />
                </button>
                <span className="h-4 w-[1px] bg-slate-200 mx-1 select-none" />
              </>
            )}

            {/* Zoom Controls */}
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoom <= 0.45}
              className="p-1 rounded-full hover:bg-slate-100 disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5 text-slate-700" />
            </button>
            <span className="px-1 text-slate-800 text-xs font-semibold select-none min-w-[40px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoom >= 2.4}
              className="p-1 rounded-full hover:bg-slate-100 disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5 text-slate-700" />
            </button>

            {isPdf && (
              <>
                <span className="h-4 w-[1px] bg-slate-200 mx-1 select-none" />
                <button
                  type="button"
                  onClick={handleFitWidth}
                  className="p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Fit to width"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-slate-700" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
