import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  ShieldAlert,
  Upload,
  Download,
  Search,
  Trash2,
  EyeOff,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
  FileText,
  Sparkles,
  Info,
  RefreshCw,
  Sliders,
  Check,
  X,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { Button } from '../components/Button';
import {
  RedactionBox,
  searchPdfForRedaction,
  applyRedactionsToPdf,
} from '../services/redactService';
import { formatBytes } from '../services/fileHelpers';
import { ToolSEOContent } from '../components/ToolSEOContent';
import { trackEvent } from '../utils/analytics';

const pdfjs = pdfjsLib as any;

if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions?.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

// Redaction Box Interface with pageIndex & relative percent
export interface ActiveDragState {
  type: 'move' | 'resize';
  handle?: 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
  boxId: string;
  pageIndex: number;
  startClientX: number;
  startClientY: number;
  startXPercent: number;
  startYPercent: number;
  startWPercent: number;
  startHPercent: number;
  containerWidth: number;
  containerHeight: number;
}

// Sub-component for an individual PDF page in the continuous scroll document
interface RedactPageItemProps {
  pageNumber: number; // 1-based
  pdfJsDoc: any;
  scale: number;
  redactions: RedactionBox[];
  selectedBoxId: string | null;
  redactionMode: 'blackout' | 'whiteout';
  onSelectBox: (id: string | null) => void;
  onRemoveBox: (id: string) => void;
  onAddBox: (box: RedactionBox) => void;
  onStartDrag: (drag: ActiveDragState) => void;
}

const RedactPageItem: React.FC<RedactPageItemProps> = ({
  pageNumber,
  pdfJsDoc,
  scale,
  redactions,
  selectedBoxId,
  redactionMode,
  onSelectBox,
  onRemoveBox,
  onAddBox,
  onStartDrag,
}) => {
  const pageIndex = pageNumber - 1;
  const pageCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);

  const [pageDims, setPageDims] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);

  // Render this individual page whenever scale or doc changes
  useEffect(() => {
    if (!pdfJsDoc || !pageCanvasRef.current) return;
    let isCancelled = false;

    const render = async () => {
      try {
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {}
          renderTaskRef.current = null;
        }

        const page = await pdfJsDoc.getPage(pageNumber);
        if (isCancelled) return;

        const viewport = page.getViewport({ scale });
        const canvas = pageCanvasRef.current;
        if (!canvas) return;

        const w = Math.round(viewport.width);
        const h = Math.round(viewport.height);
        canvas.width = w;
        canvas.height = h;
        setPageDims({ width: w, height: h });

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);

        const task = page.render({ canvasContext: ctx, viewport });
        renderTaskRef.current = task;
        await task.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error(`Error rendering page ${pageNumber}:`, err);
        }
      }
    };

    render();
    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, [pdfJsDoc, pageNumber, scale]);

  // Pointer Down on empty canvas -> Draw a new box
  const handlePointerDownCanvas = (e: React.PointerEvent<HTMLDivElement>) => {
    // If target is an existing box or handle, ignore canvas drawing
    if ((e.target as HTMLElement).closest('.redact-box') || (e.target as HTMLElement).closest('.redact-handle') || (e.target as HTMLElement).closest('.redact-delete-btn')) {
      return;
    }

    if (!overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

    onSelectBox(null);
    setIsDrawing(true);
    setDrawStart({ x, y });
    setDrawCurrent({ x, y });
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMoveCanvas = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawing || !overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    setDrawCurrent({ x, y });
  };

  const handlePointerUpCanvas = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawing || !drawStart || !drawCurrent || !overlayRef.current) {
      setIsDrawing(false);
      return;
    }

    const rect = overlayRef.current.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      const x1 = Math.min(drawStart.x, drawCurrent.x);
      const x2 = Math.max(drawStart.x, drawCurrent.x);
      const y1 = Math.min(drawStart.y, drawCurrent.y);
      const y2 = Math.max(drawStart.y, drawCurrent.y);

      const w = x2 - x1;
      const h = y2 - y1;

      // Minimum threshold 5px to avoid accidental taps
      if (w >= 5 && h >= 5) {
        const xPercent = Math.max(0, Math.min(1, x1 / rect.width));
        const yPercent = Math.max(0, Math.min(1, y1 / rect.height));
        const widthPercent = Math.max(0.005, Math.min(1 - xPercent, w / rect.width));
        const heightPercent = Math.max(0.005, Math.min(1 - yPercent, h / rect.height));

        const newId = `redact-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const newBox: RedactionBox = {
          id: newId,
          pageIndex,
          xPercent,
          yPercent,
          widthPercent,
          heightPercent,
          type: redactionMode,
        };

        onAddBox(newBox);
        onSelectBox(newId);
      }
    }

    setIsDrawing(false);
    setDrawStart(null);
    setDrawCurrent(null);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Start moving a box
  const handleStartMoveBox = (box: RedactionBox, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    onSelectBox(box.id);

    onStartDrag({
      type: 'move',
      boxId: box.id,
      pageIndex: box.pageIndex,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startXPercent: box.xPercent,
      startYPercent: box.yPercent,
      startWPercent: box.widthPercent,
      startHPercent: box.heightPercent,
      containerWidth: rect.width,
      containerHeight: rect.height,
    });
  };

  // Start resizing a box via a handle
  const handleStartResize = (box: RedactionBox, handle: 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w', e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    onSelectBox(box.id);

    onStartDrag({
      type: 'resize',
      handle,
      boxId: box.id,
      pageIndex: box.pageIndex,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startXPercent: box.xPercent,
      startYPercent: box.yPercent,
      startWPercent: box.widthPercent,
      startHPercent: box.heightPercent,
      containerWidth: rect.width,
      containerHeight: rect.height,
    });
  };

  const pageRedactions = redactions.filter((r) => r.pageIndex === pageIndex);

  return (
    <div id={`pdf-page-${pageNumber}`} className="flex flex-col items-center mb-8 scroll-mt-6">
      {/* Page Header Badge */}
      <div className="flex items-center justify-between w-full max-w-full px-2 mb-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-white shadow-sm border border-slate-700">
          <FileText className="w-3.5 h-3.5 text-rose-400" />
          Page {pageNumber}
        </span>
        <span className="text-[11px] text-slate-500 font-medium">
          {pageRedactions.length} {pageRedactions.length === 1 ? 'redaction' : 'redactions'}
        </span>
      </div>

      {/* Interactive Canvas & Overlay Container */}
      <div
        ref={overlayRef}
        onPointerDown={handlePointerDownCanvas}
        onPointerMove={handlePointerMoveCanvas}
        onPointerUp={handlePointerUpCanvas}
        className="pdf-page-overlay relative bg-white shadow-2xl rounded-sm cursor-crosshair select-none touch-none shrink-0"
        style={{
          width: pageDims.width ? `${pageDims.width}px` : 'auto',
          height: pageDims.height ? `${pageDims.height}px` : 'auto',
          minWidth: pageDims.width ? `${pageDims.width}px` : 'auto',
          minHeight: pageDims.height ? `${pageDims.height}px` : 'auto',
        }}
      >
        {/* Underlying PDF Canvas */}
        <canvas
          ref={pageCanvasRef}
          className="block pointer-events-none max-w-none"
          style={{
            width: pageDims.width ? `${pageDims.width}px` : 'auto',
            height: pageDims.height ? `${pageDims.height}px` : 'auto',
          }}
        />

        {/* Existing Redaction Boxes on this Page */}
        {pageRedactions.map((box) => {
          const isSelected = selectedBoxId === box.id;

          return (
            <div
              key={box.id}
              data-box-id={box.id}
              onPointerDown={(e) => handleStartMoveBox(box, e)}
              className={`redact-box group absolute select-none transition-shadow ${
                box.type === 'blackout'
                  ? 'bg-black border border-black shadow-md'
                  : 'bg-white border border-slate-300 shadow-md'
              } ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1 shadow-2xl cursor-grab active:cursor-grabbing z-30' : 'hover:ring-2 hover:ring-rose-400 cursor-pointer z-20'}`}
              style={{
                left: `${box.xPercent * 100}%`,
                top: `${box.yPercent * 100}%`,
                width: `${box.widthPercent * 100}%`,
                height: `${box.heightPercent * 100}%`,
              }}
            >
              {/* Permanent Working Delete / Cut Button */}
              <button
                type="button"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onRemoveBox(box.id);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onRemoveBox(box.id);
                }}
                className={`redact-delete-btn absolute -top-3.5 -right-3.5 w-7 h-7 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white cursor-pointer z-50 transition-all ${
                  isSelected ? 'opacity-100 scale-100' : 'opacity-85 group-hover:opacity-100'
                }`}
                title="Cut / Delete Box"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              {/* Move Badge hint for selected box */}
              {isSelected && (
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap pointer-events-none">
                  Drag to Move • Arrows to Nudge
                </div>
              )}

              {/* 8 Resize Handles when box is Selected */}
              {isSelected && (
                <>
                  {/* Top-Left */}
                  <div
                    onPointerDown={(e) => handleStartResize(box, 'nw', e)}
                    className="redact-handle absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-sm cursor-nwse-resize z-40"
                    title="Resize Top-Left"
                  />
                  {/* Top-Center */}
                  <div
                    onPointerDown={(e) => handleStartResize(box, 'n', e)}
                    className="redact-handle absolute -top-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-sm cursor-ns-resize z-40"
                    title="Resize Height (Top)"
                  />
                  {/* Top-Right */}
                  <div
                    onPointerDown={(e) => handleStartResize(box, 'ne', e)}
                    className="redact-handle absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-sm cursor-nesw-resize z-40"
                    title="Resize Top-Right"
                  />
                  {/* Right-Center */}
                  <div
                    onPointerDown={(e) => handleStartResize(box, 'e', e)}
                    className="redact-handle absolute top-1/2 -translate-y-1/2 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-sm cursor-ew-resize z-40"
                    title="Resize Width (Right)"
                  />
                  {/* Bottom-Right */}
                  <div
                    onPointerDown={(e) => handleStartResize(box, 'se', e)}
                    className="redact-handle absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-sm cursor-nwse-resize z-40"
                    title="Resize Bottom-Right"
                  />
                  {/* Bottom-Center */}
                  <div
                    onPointerDown={(e) => handleStartResize(box, 's', e)}
                    className="redact-handle absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-sm cursor-ns-resize z-40"
                    title="Resize Height (Bottom)"
                  />
                  {/* Bottom-Left */}
                  <div
                    onPointerDown={(e) => handleStartResize(box, 'sw', e)}
                    className="redact-handle absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-sm cursor-nesw-resize z-40"
                    title="Resize Bottom-Left"
                  />
                  {/* Left-Center */}
                  <div
                    onPointerDown={(e) => handleStartResize(box, 'w', e)}
                    className="redact-handle absolute top-1/2 -translate-y-1/2 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-sm cursor-ew-resize z-40"
                    title="Resize Width (Left)"
                  />
                </>
              )}
            </div>
          );
        })}

        {/* Live Active Dragging Preview while drawing a new box */}
        {isDrawing && drawStart && drawCurrent && overlayRef.current && (
          <div
            className={`absolute border-2 border-rose-500 pointer-events-none z-40 ${
              redactionMode === 'blackout' ? 'bg-black/75' : 'bg-white/85'
            }`}
            style={{
              left: Math.min(drawStart.x, drawCurrent.x),
              top: Math.min(drawStart.y, drawCurrent.y),
              width: Math.abs(drawCurrent.x - drawStart.x),
              height: Math.abs(drawCurrent.y - drawStart.y),
            }}
          />
        )}
      </div>
    </div>
  );
};

export const RedactPdf: React.FC = () => {
  // File & Document State
  const [file, setFile] = useState<File | null>(null);
  const [pdfJsDoc, setPdfJsDoc] = useState<any | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageScale, setPageScale] = useState<number>(0.9);

  // Redaction boxes state
  const [redactions, setRedactions] = useState<RedactionBox[]>([]);
  const [redactionMode, setRedactionMode] = useState<'blackout' | 'whiteout'>('blackout');
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [activeDrag, setActiveDrag] = useState<ActiveDragState | null>(null);
  const [sanitizeMetadata, setSanitizeMetadata] = useState<boolean>(true);

  // Search auto-redact state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);

  // Processing & Download state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [progressPct, setProgressPct] = useState<number>(0);
  const [downloadBlob, setDownloadBlob] = useState<Blob | null>(null);

  const [unscaledDims, setUnscaledDims] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Refs
  const viewportContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to calculate fit scale
  const calculateFitScale = useCallback((mode: 'page' | 'width', unscaledW: number, unscaledH: number) => {
    if (!viewportContainerRef.current || unscaledW <= 0 || unscaledH <= 0) return 0.85;
    const container = viewportContainerRef.current;
    const availableW = Math.max(260, container.clientWidth - 48);
    const availableH = Math.max(300, (container.clientHeight || 650) - 48);

    if (mode === 'page') {
      const scaleW = availableW / unscaledW;
      const scaleH = availableH / unscaledH;
      const fit = Math.min(scaleW, scaleH);
      return Math.max(0.35, Math.min(1.5, Math.round(fit * 100) / 100));
    } else {
      const scaleW = availableW / unscaledW;
      return Math.max(0.4, Math.min(2.0, Math.round(scaleW * 100) / 100));
    }
  }, []);

  const handleFitPage = () => {
    if (unscaledDims.width > 0 && unscaledDims.height > 0) {
      const scale = calculateFitScale('page', unscaledDims.width, unscaledDims.height);
      setPageScale(scale);
    }
  };

  const handleFitWidth = () => {
    if (unscaledDims.width > 0 && unscaledDims.height > 0) {
      const scale = calculateFitScale('width', unscaledDims.width, unscaledDims.height);
      setPageScale(scale);
    }
  };

  // Jump to specific page
  const scrollToPage = (pageNum: number) => {
    const el = document.getElementById(`pdf-page-${pageNum}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Load PDF file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      loadPdfFile(files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      loadPdfFile(e.dataTransfer.files[0]);
    }
  };

  const loadPdfFile = async (f: File) => {
    setFile(f);
    setRedactions([]);
    setSelectedBoxId(null);
    setDownloadBlob(null);

    try {
      const buffer = await f.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
      const doc = await loadingTask.promise;
      setPdfJsDoc(doc);
      setNumPages(doc.numPages);

      // Inspect first page dimensions to auto-fit properly
      const firstPage = await doc.getPage(1);
      const vp = firstPage.getViewport({ scale: 1.0 });
      setUnscaledDims({ width: vp.width, height: vp.height });

      setTimeout(() => {
        if (viewportContainerRef.current) {
          const fit = calculateFitScale('page', vp.width, vp.height);
          setPageScale(fit);
        } else {
          setPageScale(0.85);
        }
      }, 60);
    } catch (err) {
      console.error('Failed to load PDF in Redact tool:', err);
    }
  };

  // Global window listeners for drag/move & resize
  useEffect(() => {
    if (!activeDrag) return;

    const handleWindowPointerMove = (e: PointerEvent) => {
      const { type, handle, boxId, startClientX, startClientY, startXPercent, startYPercent, startWPercent, startHPercent, containerWidth, containerHeight } = activeDrag;
      if (containerWidth <= 0 || containerHeight <= 0) return;

      const deltaXPercent = (e.clientX - startClientX) / containerWidth;
      const deltaYPercent = (e.clientY - startClientY) / containerHeight;

      setRedactions((prev) =>
        prev.map((box) => {
          if (box.id !== boxId) return box;

          if (type === 'move') {
            // Drag the entire box up, down, left, right
            const newXPercent = Math.max(0, Math.min(1 - startWPercent, startXPercent + deltaXPercent));
            const newYPercent = Math.max(0, Math.min(1 - startHPercent, startYPercent + deltaYPercent));
            return { ...box, xPercent: newXPercent, yPercent: newYPercent };
          }

          if (type === 'resize' && handle) {
            let x = startXPercent;
            let y = startYPercent;
            let w = startWPercent;
            let h = startHPercent;

            const minSize = 0.005;

            // Handle horizontal resizing
            if (handle.includes('e')) {
              w = Math.max(minSize, Math.min(1 - startXPercent, startWPercent + deltaXPercent));
            } else if (handle.includes('w')) {
              const maxLeft = startXPercent + startWPercent - minSize;
              x = Math.max(0, Math.min(maxLeft, startXPercent + deltaXPercent));
              w = startWPercent + (startXPercent - x);
            }

            // Handle vertical resizing (up / down)
            if (handle.includes('s')) {
              h = Math.max(minSize, Math.min(1 - startYPercent, startHPercent + deltaYPercent));
            } else if (handle.includes('n')) {
              const maxTop = startYPercent + startHPercent - minSize;
              y = Math.max(0, Math.min(maxTop, startYPercent + deltaYPercent));
              h = startHPercent + (startYPercent - y);
            }

            return { ...box, xPercent: x, yPercent: y, widthPercent: w, heightPercent: h };
          }

          return box;
        })
      );
    };

    const handleWindowPointerUp = () => {
      setActiveDrag(null);
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
    };
  }, [activeDrag]);

  // Keyboard controls: Delete key to remove, Arrow keys to nudge up/down/left/right
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input/textarea
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (!selectedBoxId) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        removeRedaction(selectedBoxId);
        setSelectedBoxId(null);
        return;
      }

      if (e.key === 'Escape') {
        setSelectedBoxId(null);
        return;
      }

      // Arrow keys to nudge bracket up/down/left/right with exact precision
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 0.01 : 0.002; // Fine step (1-2px) or larger step with Shift

        setRedactions((prev) =>
          prev.map((box) => {
            if (box.id !== selectedBoxId) return box;
            let { xPercent, yPercent, widthPercent, heightPercent } = box;

            if (e.key === 'ArrowUp') yPercent = Math.max(0, yPercent - step);
            if (e.key === 'ArrowDown') yPercent = Math.min(1 - heightPercent, yPercent + step);
            if (e.key === 'ArrowLeft') xPercent = Math.max(0, xPercent - step);
            if (e.key === 'ArrowRight') xPercent = Math.min(1 - widthPercent, xPercent + step);

            return { ...box, xPercent, yPercent };
          })
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBoxId]);

  // Delete a redaction box
  const removeRedaction = (id: string) => {
    setRedactions((prev) => prev.filter((r) => r.id !== id));
    if (selectedBoxId === id) {
      setSelectedBoxId(null);
    }
  };

  // Clear all redactions
  const clearAllRedactions = () => {
    setRedactions([]);
    setSelectedBoxId(null);
  };

  // Auto-search and redact keywords
  const handleSearchAndRedact = async () => {
    if (!file || !searchQuery.trim()) return;
    setIsSearching(true);
    setSearchMessage(null);

    try {
      const matches = await searchPdfForRedaction(file, searchQuery);
      if (matches.length === 0) {
        setSearchMessage(`No matches found for "${searchQuery}".`);
        setIsSearching(false);
        return;
      }

      const newBoxes: RedactionBox[] = matches.map((m, idx) => ({
        id: `search-redact-${Date.now()}-${idx}`,
        pageIndex: m.pageIndex,
        xPercent: m.xPercent,
        yPercent: m.yPercent,
        widthPercent: m.widthPercent,
        heightPercent: m.heightPercent,
        type: redactionMode,
      }));

      setRedactions((prev) => [...prev, ...newBoxes]);
      setSearchMessage(`Redacted ${matches.length} occurrences of "${searchQuery}"!`);
    } catch (err) {
      console.error('Search error:', err);
      setSearchMessage('Could not search text on this PDF.');
    } finally {
      setIsSearching(false);
    }
  };

  // Apply redactions and download sanitized PDF
  const handleApplyRedactions = async () => {
    if (!file) return;
    if (redactions.length === 0) {
      alert('Please draw at least one blackout or whiteout box to redact.');
      return;
    }

    setIsProcessing(true);
    setProgressPct(5);
    setProgressMsg('Starting permanent redaction...');

    try {
      const sanitizedBlob = await applyRedactionsToPdf(file, redactions, {
        sanitizeMetadata,
        onProgress: (pct, msg) => {
          setProgressPct(pct);
          setProgressMsg(msg);
        },
      });

      setDownloadBlob(sanitizedBlob);
      setIsProcessing(false);

      // Trigger instant download
      const url = URL.createObjectURL(sanitizedBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name.replace(/\.pdf$/i, '') + '-redacted.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 3000);

      trackEvent({
        category: 'RedactPdf',
        action: 'download_redacted',
        label: `${redactions.length}_boxes`,
      });
    } catch (err) {
      console.error('Failed to redact PDF:', err);
      setIsProcessing(false);
      alert('An error occurred while redacting this PDF. Please try again.');
    }
  };
  return (
    <>
      <Helmet>
        <title>Redact PDF Online Free | Permanently Blackout Sensitive Info - LAK PDF</title>
        <meta
          name="description"
          content="Permanently redact and blackout sensitive information from PDF online for free. Hide Aadhaar, bank details, phone numbers, and signatures with true pixel sanitization. 100% private."
        />
        <meta
          name="keywords"
          content="redact pdf online free, blackout pdf sensitive info, hide aadhaar number in pdf, black out text in pdf, whiteout pdf online, sanitize pdf metadata, permanently redact pdf"
        />
        <link rel="canonical" href="https://lakpdf.com/redact-pdf" />
        <meta
          property="og:title"
          content="Redact PDF Online Free | Permanently Blackout Sensitive Info - LAK PDF"
        />
        <meta
          property="og:description"
          content="Permanently blackout and erase confidential data from PDFs. True pixel sanitization makes text unrecoverable. 100% client-side privacy."
        />
        <meta property="og:url" content="https://lakpdf.com/redact-pdf" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="LAKPDF" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="Redact PDF Online Free | Permanently Blackout Sensitive Info - LAK PDF"
        />
        <meta
          name="twitter:description"
          content="Permanently blackout and erase confidential data from PDFs. True pixel sanitization makes text unrecoverable. 100% client-side privacy."
        />
        {/* BreadcrumbList Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://lakpdf.com/' },
              { '@type': 'ListItem', position: 2, name: 'Tools', item: 'https://lakpdf.com/tools' },
              { '@type': 'ListItem', position: 3, name: 'Redact PDF', item: 'https://lakpdf.com/redact-pdf' },
            ],
          })}
        </script>
        {/* SoftwareApplication Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'LAK PDF Redact Engine',
            url: 'https://lakpdf.com/redact-pdf',
            applicationCategory: 'SecurityApplication',
            operatingSystem: 'Web, Windows, macOS, Android, iOS',
            browserRequirements: 'Requires JavaScript. Requires HTML5 Canvas.',
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'USD',
            },
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: '4.9',
              ratingCount: '1840',
              bestRating: '5',
              worstRating: '1',
            },
            description:
              'Free online PDF redaction tool. True pixel-level permanent text erasure, blackout/whiteout boxes, auto-search redaction, and metadata sanitization.',
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-slate-50 dark:bg-dark-bg text-slate-800 dark:text-dark-text-primary py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 text-white dark:bg-slate-800 text-xs sm:text-sm font-semibold mb-3 shadow-sm border border-slate-700">
              <EyeOff className="w-4 h-4 text-rose-400" />
              <span>True Permanent Redaction • Pixel-Level Sanitization • 100% Private</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-3">
              Redact & <span className="text-rose-600">Blackout PDF</span>
            </h1>

            <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-600 dark:text-slate-400">
              Permanently blackout confidential information from your PDF documents.
              Erase Aadhaar numbers, bank account details, signatures, and personal data with
              true pixel destruction that cannot be recovered.
            </p>
          </div>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="application/pdf"
            className="hidden"
          />

          {!file ? (
            /* Upload Dropzone */
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="relative rounded-3xl border-2 border-dashed border-rose-300 dark:border-rose-900/60 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl p-8 sm:p-12 text-center shadow-lg transition-all hover:border-rose-500 cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-slate-900 via-rose-900 to-rose-600 text-white shadow-xl shadow-rose-900/25 mb-6">
                <ShieldAlert className="w-10 h-10" />
              </div>

              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mb-2">
                Upload PDF to Redact Sensitive Information
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto mb-6">
                Drag and drop your PDF file here, or click to browse. Ideal for bank statements,
                ID cards, legal contracts, and resumes.
              </p>

              <Button
                variant="primary"
                size="lg"
                className="bg-rose-600 hover:bg-rose-700 text-white px-8 shadow-md shadow-rose-600/20"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                <Upload className="w-5 h-5 mr-2" />
                Select PDF File
              </Button>

              <div className="mt-8 flex flex-wrap justify-center items-center gap-6 text-xs text-slate-500">
                <span className="flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  100% Client-Side (Zero Server Uploads)
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Lock className="w-4 h-4 text-blue-500" />
                  Unrecoverable Pixel Sanitization
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <EyeOff className="w-4 h-4 text-purple-500" />
                  Metadata Scrubbing Included
                </span>
              </div>
            </div>
          ) : (
            /* Interactive Redaction Workspace */
            <div className="space-y-6">
              {/* Top Action & Control Toolbar */}
              <div className="bg-white dark:bg-dark-surface p-4 rounded-2xl border border-slate-200 dark:border-dark-border shadow-sm flex flex-wrap items-center justify-between gap-4">
                {/* Left: Redaction Style (Blackout vs Whiteout) */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 mr-1">Style:</span>
                  <button
                    type="button"
                    onClick={() => setRedactionMode('blackout')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      redactionMode === 'blackout'
                        ? 'bg-black text-white ring-2 ring-slate-400 shadow-sm'
                        : 'bg-slate-100 dark:bg-dark-bg text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full bg-black border border-white" />
                    Blackout
                  </button>

                  <button
                    type="button"
                    onClick={() => setRedactionMode('whiteout')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      redactionMode === 'whiteout'
                        ? 'bg-white text-slate-900 ring-2 ring-rose-500 shadow-sm border border-slate-300'
                        : 'bg-slate-100 dark:bg-dark-bg text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full bg-white border border-slate-400" />
                    Whiteout
                  </button>
                </div>

                {/* Center: Page Navigation & Zoom */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-slate-100 dark:bg-dark-bg px-3 py-1.5 rounded-xl">
                    <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-rose-500" />
                      {numPages} {numPages === 1 ? 'Page' : 'Pages'}
                    </span>
                    {numPages > 1 && (
                      <select
                        onChange={(e) => scrollToPage(Number(e.target.value))}
                        className="text-xs font-medium bg-white dark:bg-dark-surface border border-slate-300 dark:border-dark-border rounded-lg px-2 py-0.5 text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-rose-500"
                      >
                        {Array.from({ length: numPages }, (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            Jump to Page {i + 1}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Zoom Controls */}
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-dark-bg p-1 rounded-xl">
                    <button
                      type="button"
                      disabled={pageScale <= 0.35}
                      onClick={() => setPageScale((s) => Math.max(0.35, Number((s - 0.15).toFixed(2))))}
                      className="p-1.5 rounded-lg text-slate-600 hover:bg-white dark:hover:bg-dark-surface disabled:opacity-30 cursor-pointer"
                      title="Zoom out"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-bold px-1.5 text-slate-700 dark:text-slate-300 min-w-[42px] text-center">
                      {Math.round(pageScale * 100)}%
                    </span>
                    <button
                      type="button"
                      disabled={pageScale >= 2.5}
                      onClick={() => setPageScale((s) => Math.min(2.5, Number((s + 0.15).toFixed(2))))}
                      className="p-1.5 rounded-lg text-slate-600 hover:bg-white dark:hover:bg-dark-surface disabled:opacity-30 cursor-pointer"
                      title="Zoom in"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Fit Mode Presets */}
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-dark-bg p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={handleFitPage}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-dark-surface transition cursor-pointer"
                      title="Fit entire page in view without scrolling"
                    >
                      Fit Page
                    </button>
                    <button
                      type="button"
                      onClick={handleFitWidth}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-dark-surface transition cursor-pointer"
                      title="Fit page width to screen"
                    >
                      Fit Width
                    </button>
                  </div>
                </div>

                {/* Right: Change Document */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs"
                  >
                    Change PDF
                  </Button>
                </div>
              </div>

              {/* Main Split: Continuous Multi-Page Document Feed (Left) & Controls/Summary (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Document View & Continuous Multi-Page Feed */}
                <div className="lg:col-span-8 flex flex-col bg-slate-100 dark:bg-dark-surface/60 rounded-3xl border border-slate-300 dark:border-dark-border overflow-hidden shadow-inner">
                  {/* Top Hint Bar */}
                  <div className="px-4 py-2.5 bg-white dark:bg-dark-surface border-b border-slate-200 dark:border-dark-border flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Sliders className="w-3.5 h-3.5 text-rose-500" />
                      <span>Drag to blackout • Click box to move/drag/resize • Delete key or cut icon to remove</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-900">
                        Continuous All-Pages View
                      </span>
                    </div>
                  </div>

                  {/* Scrollable Document Container showing all pages continuously */}
                  <div
                    ref={viewportContainerRef}
                    className="p-4 sm:p-6 overflow-y-auto overflow-x-auto flex flex-col items-center min-h-[520px] max-h-[82vh] bg-slate-200/50 dark:bg-black/30"
                  >
                    {Array.from({ length: numPages }, (_, idx) => {
                      const pageNum = idx + 1;
                      return (
                        <RedactPageItem
                          key={pageNum}
                          pageNumber={pageNum}
                          pdfJsDoc={pdfJsDoc}
                          scale={pageScale}
                          redactions={redactions}
                          selectedBoxId={selectedBoxId}
                          redactionMode={redactionMode}
                          onSelectBox={setSelectedBoxId}
                          onRemoveBox={removeRedaction}
                          onAddBox={(newBox) => setRedactions((prev) => [...prev, newBox])}
                          onStartDrag={setActiveDrag}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Right: Search, Summary & Finalize */}
                <div className="lg:col-span-4 flex flex-col space-y-6">
                  {/* 1. Keyword Search & Auto-Redact */}
                  <div className="bg-white dark:bg-dark-surface p-5 rounded-3xl border border-slate-200 dark:border-dark-border shadow-sm">
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                      <Search className="w-4 h-4 text-rose-500" />
                      Search & Redact All Matches
                    </h3>
                    <p className="text-xs text-slate-500 mb-3">
                      Automatically find and blackout names, phone numbers, or account numbers across all pages.
                    </p>

                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="e.g. Aadhaar, Phone, Name"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchAndRedact()}
                        className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-white"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleSearchAndRedact}
                        disabled={isSearching || !searchQuery.trim()}
                        className="text-xs font-bold"
                      >
                        {isSearching ? 'Searching...' : 'Redact All'}
                      </Button>
                    </div>

                    {searchMessage && (
                      <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-1">
                        {searchMessage}
                      </p>
                    )}
                  </div>

                  {/* 2. Redaction Status & Management */}
                  <div className="bg-white dark:bg-dark-surface p-5 rounded-3xl border border-slate-200 dark:border-dark-border shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <Layers className="w-4 h-4 text-blue-500" />
                        Redaction Summary
                      </h3>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300">
                        {redactions.length} Boxes Total
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                      {redactions.length === 0
                        ? 'No blackouts drawn yet. Drag anywhere on the document pages to add.'
                        : `${redactions.length} blackout areas configured across ${numPages} pages.`}
                    </p>

                    {/* Selected Box Helper / Nudge hint */}
                    {selectedBoxId && (
                      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-900/50 text-xs text-blue-800 dark:text-blue-300">
                        <div className="font-bold flex items-center justify-between mb-1">
                          <span>Active Box Selected</span>
                          <button
                            type="button"
                            onClick={() => removeRedaction(selectedBoxId)}
                            className="text-rose-600 hover:text-rose-700 font-extrabold text-[11px] underline cursor-pointer"
                          >
                            Delete Box
                          </button>
                        </div>
                        <p className="text-[11px] text-blue-600 dark:text-blue-400">
                          Use mouse drag to move up/down/anywhere. Use <strong>↑ ↓ ← → Arrow keys</strong> for pixel-level nudging. Corner handles to resize.
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAllRedactions}
                        disabled={redactions.length === 0}
                        className="w-full text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border border-red-200 dark:border-red-900/40"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                        Clear All Redactions
                      </Button>
                    </div>
                  </div>

                  {/* 3. Sanitization & Final Export */}
                  <div className="bg-gradient-to-br from-rose-50/70 via-slate-50 to-transparent dark:from-rose-950/20 dark:via-dark-surface dark:to-dark-surface p-5 rounded-3xl border border-rose-200/80 dark:border-rose-900/40 shadow-sm">
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Sanitize & Download
                    </h3>

                    {/* Metadata Toggle */}
                    <label className="flex items-start gap-2.5 mb-5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={sanitizeMetadata}
                        onChange={(e) => setSanitizeMetadata(e.target.checked)}
                        className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 h-4 w-4"
                      />
                      <span className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        <strong>Scrub Metadata:</strong> Erase author, creator, and edit timestamps
                        from document properties for complete anonymity.
                      </span>
                    </label>

                    {/* Download Button */}
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={handleApplyRedactions}
                      disabled={isProcessing || redactions.length === 0}
                      className="w-full bg-rose-600 hover:bg-rose-700 text-white font-extrabold shadow-lg shadow-rose-600/25 justify-center py-3.5"
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          <span>Sanitizing...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          <span>Apply & Download Redacted PDF</span>
                        </>
                      )}
                    </Button>

                    {/* Progress Bar */}
                    {isProcessing && (
                      <div className="mt-4 space-y-1.5 animate-in fade-in">
                        <div className="flex justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400">
                          <span>{progressMsg}</span>
                          <span>{progressPct}%</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-dark-border h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-rose-600 h-full rounded-full transition-all duration-300"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Detailed SEO Guides & Feature Sections */}
          <section className="mt-16 space-y-12">
            {/* 1. Critical Warning: Fake Black Highlighting vs True Redaction */}
            <div className="bg-white dark:bg-dark-surface rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-dark-border shadow-sm">
              <div className="text-center max-w-2xl mx-auto mb-8">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-3 py-1 rounded-full border border-rose-200 dark:border-rose-900/60">
                  Security Warning
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-3">
                  True Redaction vs. Fake Black Highlighting
                </h2>
                <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">
                  Did you know that drawing a black box in basic PDF editors often leaves the confidential text readable underneath?
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 rounded-2xl bg-red-50/50 dark:bg-red-950/20 border border-red-200/80 dark:border-red-900/40">
                  <h3 className="font-bold text-red-700 dark:text-red-400 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    Fake Redaction (Common Danger)
                  </h3>
                  <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 font-bold">•</span>
                      <span>Only puts a colored rectangle graphic on top of the text.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 font-bold">•</span>
                      <span>Anyone can select, copy, and paste the hidden text into Notepad.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 font-bold">•</span>
                      <span>Screen readers and search engines can still index the sensitive data.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 font-bold">•</span>
                      <span>Major cause of privacy breaches in legal and financial disclosures.</span>
                    </li>
                  </ul>
                </div>

                <div className="p-5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40">
                  <h3 className="font-bold text-emerald-700 dark:text-emerald-400 mb-3 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    LAK PDF True Redaction Engine
                  </h3>
                  <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>Pixel-Level Sanitization: Blackout boxes are baked into 300 DPI image pixels.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>The underlying text characters are physically deleted from the file structure.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>Impossible for anyone to copy, inspect, or retrieve the confidential text.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>100% Client-Side Privacy: Your documents never touch external servers.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 2. What Sensitive Information Should You Redact? */}
            <div className="bg-white dark:bg-dark-surface rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-dark-border shadow-sm">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2.5">
                <Info className="w-6 h-6 text-rose-500" />
                What Sensitive Information Should You Redact Before Sharing?
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    title: 'Aadhaar & Social Security Numbers',
                    desc: 'Mask the first 8 digits of your Aadhaar card (XXXX-XXXX-1234) or US SSN to prevent identity theft in KYC and hotel check-ins.',
                  },
                  {
                    title: 'Bank Accounts & Financial Figures',
                    desc: 'Hide account numbers, IFSC codes, transaction amounts, or salary figures in bank statements before sharing proof of income.',
                  },
                  {
                    title: 'Signatures & Biometric Seals',
                    desc: 'Blackout personal handwritten signatures on agreements and receipts to prevent unauthorized signature forgery.',
                  },
                  {
                    title: 'Home Address & Contact Numbers',
                    desc: 'Redact your personal telephone number and home street address on public RTI filings, court documents, and resumes.',
                  },
                  {
                    title: 'Trade Secrets & Pricing Quotes',
                    desc: 'Remove proprietary formulas, confidential discount percentages, and vendor cost structures before sending business proposals.',
                  },
                  {
                    title: 'Medical Records & Diagnoses',
                    desc: 'Anonymize patient names, medical histories, and sensitive health information in clinical trial papers and claim proofs.',
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl border border-slate-100 dark:border-dark-border bg-slate-50/50 dark:bg-dark-bg/40"
                  >
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1.5">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* SEO Content & Guide */}
          <ToolSEOContent toolKey="/redact-pdf" />
        </div>
      </div>
    </>
  );
};

export default RedactPdf;
