import React, { useState, useRef, useEffect } from 'react';
import { FileUploader } from '../components/FileUploader';
import { Button } from '../components/Button';
import { pdfjs, saveEditedPdf, EditorAction, downloadPdf } from '../services/pdfService';
import {
  Signature,
  Check,
  Save,
  Eraser,
  ChevronLeft,
  ChevronRight,
  Move,
  Upload,
  Type,
  Undo2,
  Redo2,
  CopyPlus,
  Calendar,
  Trash2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Helmet } from 'react-helmet-async';
import { ToolSEOContent } from '../components/ToolSEOContent';
import {
  cleanSignatureImage,
  generateDateStamp,
  generateTypedSignatureDataUrl,
} from '../utils/signatureUtils';

type SignatureMode = 'draw' | 'upload' | 'type' | 'date';

export interface PlacedSignatureItem {
  id: string;
  page: number;
  dataUrl: string;
  x: number;      // Normalized 0 to 1
  y: number;      // Normalized 0 to 1
  size: number;   // Normalized width (0 to 1)
  aspect: number; // width / height
  type: 'signature' | 'date';
}

export const SignPdf: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [signature, setSignature] = useState<string | null>(null); // Base64 active stamp
  const [signatureMode, setSignatureMode] = useState<SignatureMode>('draw');
  const [inkColor, setInkColor] = useState<'black' | 'blue' | 'original'>('black');
  const [removeBackground, setRemoveBackground] = useState<boolean>(true);
  const [rawUploadDataUrl, setRawUploadDataUrl] = useState<string | null>(null);

  const [isSigning, setIsSigning] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [signatureScale, setSignatureScale] = useState(0.24); // normalized width
  const [signatureAspect, setSignatureAspect] = useState(2.4); // width / height
  const [pageRatios, setPageRatios] = useState<Record<number, number>>({});

  // Placed elements state (supports multiple signatures/dates per page)
  const [placedItems, setPlacedItems] = useState<PlacedSignatureItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [history, setHistory] = useState<PlacedSignatureItem[][]>([]);
  const [future, setFuture] = useState<PlacedSignatureItem[][]>([]);

  // Dragging state
  const [isDraggingPlacedItem, setIsDraggingPlacedItem] = useState(false);
  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null);
  const dragStartItemsRef = useRef<PlacedSignatureItem[] | null>(null);

  // Form typing & date state
  const [typedSignatureText, setTypedSignatureText] = useState('');
  const [typedSignatureFont, setTypedSignatureFont] = useState<'cursive' | 'serif' | 'sans'>('cursive');
  const [customDateText, setCustomDateText] = useState(new Date().toISOString().split('T')[0]);

  const [status, setStatus] = useState(false);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<HTMLCanvasElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const cloneItems = (items: PlacedSignatureItem[]): PlacedSignatureItem[] =>
    items.map((it) => ({ ...it }));

  const applyPlacedItems = (next: PlacedSignatureItem[], trackHistory = true) => {
    setPlacedItems((prev) => {
      if (trackHistory) {
        setHistory((h) => [...h, cloneItems(prev)]);
        setFuture([]);
      }
      return cloneItems(next);
    });
  };

  const setSignatureWithAspect = (dataUrl: string, type: 'signature' | 'date' = 'signature') => {
    const img = new Image();
    img.onload = () => {
      if (img.width > 0 && img.height > 0) {
        const aspect = img.width / img.height;
        setSignatureAspect(aspect);
        setSignature(dataUrl);
      }
    };
    img.src = dataUrl;
  };

  // Re-render preview canvas on page change
  useEffect(() => {
    if (file && pdfCanvasRef.current && pdfContainerRef.current) {
      const render = async () => {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        setTotalPages(pdf.numPages);
        const pageNum = Math.max(1, Math.min(currentPage, pdf.numPages));
        const page = await pdf.getPage(pageNum);

        const containerWidth = pdfContainerRef.current!.clientWidth;
        const viewportUnscaled = page.getViewport({ scale: 1 });
        const scale = Math.min((containerWidth - 32) / viewportUnscaled.width, 1.5);
        const viewport = page.getViewport({ scale });
        const canvas = pdfCanvasRef.current!;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        setPageRatios((prev) => ({ ...prev, [pageNum]: viewport.width / viewport.height }));

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: ctx, viewport }).promise;
        }
      };
      render().catch((error) => {
        console.error('Failed to render PDF preview', error);
      });
    }
  }, [file, currentPage]);

  useEffect(() => {
    const onResize = () => {
      if (!file) return;
      setCurrentPage((p) => p);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [file]);

  // Smooth quadratic bezier signature drawing pad
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e && e.cancelable) e.preventDefault();
    setIsSigning(true);
    const canvas = signaturePadRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = inkColor === 'blue' ? '#002B7F' : '#111111';

    const { offsetX, offsetY } = getCoordinates(e, canvas);
    lastPointRef.current = { x: offsetX, y: offsetY };
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isSigning) return;
    if ('touches' in e && e.cancelable) e.preventDefault();
    const canvas = signaturePadRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx || !lastPointRef.current) return;

    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = inkColor === 'blue' ? '#002B7F' : '#111111';

    const { offsetX, offsetY } = getCoordinates(e, canvas);
    const midX = (lastPointRef.current.x + offsetX) / 2;
    const midY = (lastPointRef.current.y + offsetY) / 2;

    ctx.quadraticCurveTo(lastPointRef.current.x, lastPointRef.current.y, midX, midY);
    ctx.stroke();

    lastPointRef.current = { x: offsetX, y: offsetY };
  };

  const endDrawing = () => {
    setIsSigning(false);
    lastPointRef.current = null;
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      offsetX: clientX - rect.left,
      offsetY: clientY - rect.top,
    };
  };

  const clearSignature = () => {
    const canvas = signaturePadRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    setSignature(null);
  };

  const saveDrawnSignature = () => {
    const canvas = signaturePadRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const hasInk = imageData.some((_, idx) => idx % 4 === 3 && imageData[idx] > 0);
        if (!hasInk) {
          alert('Please draw your signature first.');
          return;
        }
      }
      setSignatureWithAspect(canvas.toDataURL('image/png'), 'signature');
    }
  };

  const handleUploadSignature = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const result = reader.result as string;
      if (!result) return;
      setRawUploadDataUrl(result);
      const cleaned = await cleanSignatureImage(result, {
        removeWhiteBackground: removeBackground,
        inkColor,
      });
      setSignatureWithAspect(cleaned, 'signature');
    };
    reader.readAsDataURL(selected);
    event.target.value = '';
  };

  const reprocessUploadedSignature = async (
    removeBg: boolean,
    color: 'black' | 'blue' | 'original'
  ) => {
    if (!rawUploadDataUrl) return;
    const cleaned = await cleanSignatureImage(rawUploadDataUrl, {
      removeWhiteBackground: removeBg,
      inkColor: color,
    });
    setSignatureWithAspect(cleaned, 'signature');
  };

  const generateTypedSignature = () => {
    const text = typedSignatureText.trim();
    if (!text) {
      alert('Please type your name or signature text.');
      return;
    }
    const color = inkColor === 'blue' ? 'blue' : 'black';
    const dataUrl = generateTypedSignatureDataUrl(text, typedSignatureFont, color);
    setSignatureWithAspect(dataUrl, 'signature');
  };

  const generateQuickDateStamp = () => {
    const color = inkColor === 'blue' ? 'blue' : 'black';
    const dataUrl = generateDateStamp(customDateText, { inkColor: color });
    setSignatureWithAspect(dataUrl, 'date');
  };

  // Click on PDF page to place stamp
  const handlePdfClick = (e: React.MouseEvent) => {
    if (!signature || !pdfCanvasRef.current) return;
    const rect = pdfCanvasRef.current.getBoundingClientRect();
    const ratio = pageRatios[currentPage] || rect.width / rect.height || 1;
    const heightNorm = (signatureScale * ratio) / signatureAspect;
    const rawX = (e.clientX - rect.left) / rect.width;
    const rawY = (e.clientY - rect.top) / rect.height;
    const x = Math.max(0, Math.min(1 - signatureScale, rawX - signatureScale / 2));
    const y = Math.max(0, Math.min(1 - heightNorm, rawY - heightNorm / 2));

    const newItem: PlacedSignatureItem = {
      id: uuidv4(),
      page: currentPage,
      dataUrl: signature,
      x,
      y,
      size: signatureScale,
      aspect: signatureAspect,
      type: signatureMode === 'date' ? 'date' : 'signature',
    };

    applyPlacedItems([...placedItems, newItem], true);
    setSelectedItemId(newItem.id);
  };

  // Dragging placed signatures
  const handlePlacementDragStart = (e: React.MouseEvent, item: PlacedSignatureItem) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedItemId(item.id);
    setSignatureScale(item.size);
    setSignatureAspect(item.aspect);

    const canvas = pdfCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const signatureLeft = item.x * rect.width;
    const signatureTop = item.y * rect.height;

    dragOffsetRef.current = {
      x: e.clientX - (rect.left + signatureLeft),
      y: e.clientY - (rect.top + signatureTop),
    };
    dragStartItemsRef.current = cloneItems(placedItems);
    setIsDraggingPlacedItem(true);
  };

  useEffect(() => {
    if (!isDraggingPlacedItem) return;

    const onPointerMove = (event: MouseEvent) => {
      const canvas = pdfCanvasRef.current;
      if (!canvas || !selectedItemId) return;
      const dragOffset = dragOffsetRef.current;
      if (!dragOffset) return;

      const rect = canvas.getBoundingClientRect();
      const currentItem = placedItems.find((it) => it.id === selectedItemId);
      if (!currentItem) return;

      const ratio = pageRatios[currentPage] || rect.width / rect.height || 1;
      const heightNorm = (currentItem.size * ratio) / currentItem.aspect;
      const x = Math.max(
        0,
        Math.min(1 - currentItem.size, (event.clientX - rect.left - dragOffset.x) / rect.width)
      );
      const y = Math.max(
        0,
        Math.min(1 - heightNorm, (event.clientY - rect.top - dragOffset.y) / rect.height)
      );

      setPlacedItems((prev) =>
        prev.map((it) => (it.id === selectedItemId ? { ...it, x, y } : it))
      );
    };

    const onPointerUp = () => {
      setIsDraggingPlacedItem(false);
      dragOffsetRef.current = null;
      if (dragStartItemsRef.current) {
        const beforeDrag = dragStartItemsRef.current;
        dragStartItemsRef.current = null;
        setHistory((h) => [...h, beforeDrag]);
        setFuture([]);
      }
    };

    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    return () => {
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
    };
  }, [isDraggingPlacedItem, selectedItemId, placedItems, currentPage, pageRatios]);

  const updateSelectedItemSize = (size: number) => {
    setSignatureScale(size);
    if (!selectedItemId) return;

    applyPlacedItems(
      placedItems.map((item) => {
        if (item.id !== selectedItemId) return item;
        const ratio = pageRatios[currentPage] || 1;
        const heightNorm = (size * ratio) / item.aspect;
        const x = Math.max(0, Math.min(1 - size, item.x));
        const y = Math.max(0, Math.min(1 - heightNorm, item.y));
        return { ...item, size, x, y };
      }),
      true
    );
  };

  const deleteSelectedItem = () => {
    if (!selectedItemId) return;
    applyPlacedItems(placedItems.filter((it) => it.id !== selectedItemId), true);
    setSelectedItemId(null);
  };

  const clearCurrentPageItems = () => {
    applyPlacedItems(placedItems.filter((it) => it.page !== currentPage), true);
    setSelectedItemId(null);
  };

  const applyCurrentItemToAllPages = () => {
    const source = placedItems.find((it) => it.id === selectedItemId) || placedItems[placedItems.length - 1];
    if (!source || totalPages < 2) return;

    const newCopies: PlacedSignatureItem[] = [];
    for (let p = 1; p <= totalPages; p++) {
      if (p === source.page) continue;
      const ratio = pageRatios[p] || pageRatios[currentPage] || 1;
      const heightNorm = (source.size * ratio) / source.aspect;
      newCopies.push({
        id: uuidv4(),
        page: p,
        dataUrl: source.dataUrl,
        x: Math.max(0, Math.min(1 - source.size, source.x)),
        y: Math.max(0, Math.min(1 - heightNorm, source.y)),
        size: source.size,
        aspect: source.aspect,
        type: source.type,
      });
    }

    applyPlacedItems([...placedItems, ...newCopies], true);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setFuture((f) => [cloneItems(placedItems), ...f]);
    setPlacedItems(cloneItems(previous));
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    const [next, ...rest] = future;
    setFuture(rest);
    setHistory((h) => [...h, cloneItems(placedItems)]);
    setPlacedItems(cloneItems(next));
  };

  const handleDownload = async () => {
    if (!file || placedItems.length === 0) return;
    setStatus(true);

    const actions: EditorAction[] = placedItems.map((item) => ({
      id: item.id,
      type: 'image',
      pageIndex: Math.max(0, item.page - 1),
      imageData: item.dataUrl,
      x: item.x,
      y: item.y,
      width: item.size,
    }));

    try {
      const newPdf = await saveEditedPdf(file, actions);
      downloadPdf(newPdf, `signed-${file.name}`, { autoDownload: true });
    } catch (e) {
      console.error(e);
      alert('Failed to save signed PDF.');
    } finally {
      setStatus(false);
    }
  };

  const currentPageItems = placedItems.filter((it) => it.page === currentPage);

  return (
    <>
      <Helmet>
        <title>Sign PDF Online Free | Add Signature & Date - LAK PDF</title>
        <meta
          name="description"
          content="Sign PDF online free with transparent signatures and permanent form flattening. 100% private in browser with zero vector blur."
        />
        <link rel="canonical" href="https://lakpdf.com/sign-pdf" />
        <meta property="og:title" content="Sign PDF Online Free | Add Signature & Date - LAK PDF" />
        <meta
          property="og:description"
          content="Sign PDF online free. Transparent signatures, date stamps, and permanent vector flattening."
        />
        <meta property="og:url" content="https://lakpdf.com/sign-pdf" />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Permanent Vector Form Flattening • Transparent Signatures
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">Sign PDF & Form Fill</h1>
          <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto">
            Draw, type, or upload transparent signatures. Permanently stamp signatures and dates onto any PDF.
          </p>
        </div>

        {!file ? (
          <FileUploader
            onFilesSelected={(f) => {
              setFile(f[0]);
              setCurrentPage(1);
              setTotalPages(0);
              setPlacedItems([]);
              setHistory([]);
              setFuture([]);
              setSelectedItemId(null);
            }}
            multiple={false}
            icon={<Signature className="w-12 h-12 text-indigo-500" />}
            title="Select PDF Document"
            description="Drop the document you want to sign or fill"
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* PDF Preview Area */}
            <div
              className="lg:col-span-2 bg-slate-100 p-4 rounded-2xl overflow-hidden flex flex-col items-center shadow-inner"
              ref={pdfContainerRef}
            >
              <div className="shadow-lg bg-white rounded-t-xl overflow-hidden">
                <div className="flex items-center justify-between bg-white border-b border-slate-200 px-4 py-2.5">
                  <div className="text-xs font-semibold text-slate-600">
                    Page {currentPage} of {totalPages || 1}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages || 1, p + 1))}
                      disabled={currentPage >= (totalPages || 1)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="relative select-none">
                  <canvas
                    ref={pdfCanvasRef}
                    onClick={handlePdfClick}
                    className="bg-white cursor-crosshair block"
                  />

                  {/* Render all placed items on current page */}
                  {currentPageItems.map((item) => {
                    const isSelected = item.id === selectedItemId;
                    return (
                      <div
                        key={item.id}
                        onMouseDown={(e) => handlePlacementDragStart(e, item)}
                        className={`absolute cursor-move select-none group transition-shadow ${
                          isSelected
                            ? 'border-2 border-indigo-600 ring-2 ring-indigo-200 bg-indigo-50/20'
                            : 'border-2 border-dashed border-indigo-400/80 hover:border-indigo-600'
                        }`}
                        style={{
                          left: `${item.x * 100}%`,
                          top: `${item.y * 100}%`,
                          width: `${item.size * 100}%`,
                        }}
                      >
                        <img
                          src={item.dataUrl}
                          alt="Signature stamp"
                          draggable={false}
                          className="w-full h-auto pointer-events-none block"
                        />
                        {isSelected && (
                          <div className="absolute -top-3 -right-3 flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteSelectedItem();
                              }}
                              className="w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-md"
                              title="Delete this signature"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-3 text-xs text-slate-500 text-center">
                Click anywhere on the document to place stamp. Click on any stamp to select or drag.
              </div>
            </div>

            {/* Sidebar Controls */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 h-fit space-y-6">
              <div>
                <h3 className="font-bold text-slate-900 mb-3 flex items-center justify-between">
                  <span>Sign & Stamp</span>
                  <span className="text-xs font-normal text-slate-400">Step 1 of 2</span>
                </h3>

                {/* Mode Selector */}
                <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-xl mb-4">
                  <button
                    onClick={() => setSignatureMode('draw')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                      signatureMode === 'draw'
                        ? 'bg-white shadow-xs text-indigo-700'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Draw
                  </button>
                  <button
                    onClick={() => setSignatureMode('upload')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                      signatureMode === 'upload'
                        ? 'bg-white shadow-xs text-indigo-700'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Upload
                  </button>
                  <button
                    onClick={() => setSignatureMode('type')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                      signatureMode === 'type'
                        ? 'bg-white shadow-xs text-indigo-700'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Type
                  </button>
                  <button
                    onClick={() => setSignatureMode('date')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                      signatureMode === 'date'
                        ? 'bg-white shadow-xs text-indigo-700'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Date
                  </button>
                </div>

                {/* Ink Color Picker */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-600">Ink Color:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setInkColor('black');
                        if (rawUploadDataUrl) reprocessUploadedSignature(removeBackground, 'black');
                      }}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                        inkColor === 'black'
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-black inline-block" />
                      Black
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInkColor('blue');
                        if (rawUploadDataUrl) reprocessUploadedSignature(removeBackground, 'blue');
                      }}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                        inkColor === 'blue'
                          ? 'border-blue-900 bg-blue-900 text-white'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-[#002B7F] inline-block" />
                      Royal Blue
                    </button>
                  </div>
                </div>

                {/* MODE 1: DRAW */}
                {signatureMode === 'draw' && (
                  <div className="space-y-3">
                    <div className="border border-slate-200 rounded-xl bg-slate-50 overflow-hidden touch-none relative">
                      <canvas
                        ref={signaturePadRef}
                        width={300}
                        height={140}
                        className="w-full cursor-pencil block bg-white"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={endDrawing}
                        onMouseLeave={endDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={endDrawing}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={clearSignature} className="flex-1">
                        <Eraser className="w-4 h-4 mr-1.5" /> Clear
                      </Button>
                      <Button variant="primary" size="sm" onClick={saveDrawnSignature} className="flex-1 bg-indigo-600">
                        <Check className="w-4 h-4 mr-1.5" /> Use Signature
                      </Button>
                    </div>
                  </div>
                )}

                {/* MODE 2: UPLOAD */}
                {signatureMode === 'upload' && (
                  <div className="space-y-3">
                    <input
                      ref={uploadInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/bmp"
                      className="hidden"
                      onChange={handleUploadSignature}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() => uploadInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" /> Upload Photo / Scan
                    </Button>

                    <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none pt-1">
                      <input
                        type="checkbox"
                        checked={removeBackground}
                        onChange={(e) => {
                          const next = e.target.checked;
                          setRemoveBackground(next);
                          reprocessUploadedSignature(next, inkColor);
                        }}
                        className="w-4 h-4 rounded border-slate-300 accent-indigo-600"
                      />
                      <span>Auto-Remove Paper Background (Transparent PNG)</span>
                    </label>
                  </div>
                )}

                {/* MODE 3: TYPE */}
                {signatureMode === 'type' && (
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Type your name / signature"
                      value={typedSignatureText}
                      onChange={(e) => setTypedSignatureText(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <select
                      value={typedSignatureFont}
                      onChange={(e) =>
                        setTypedSignatureFont(e.target.value as 'cursive' | 'serif' | 'sans')
                      }
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-700"
                    >
                      <option value="cursive">Cursive Script (Handwritten)</option>
                      <option value="serif">Elegant Serif (Formal)</option>
                      <option value="sans">Clean Sans (Modern)</option>
                    </select>
                    <Button variant="primary" size="sm" className="w-full bg-indigo-600" onClick={generateTypedSignature}>
                      <Type className="w-4 h-4 mr-2" /> Generate Signature
                    </Button>
                  </div>
                )}

                {/* MODE 4: DATE */}
                {signatureMode === 'date' && (
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="e.g. 2026-10-07"
                      value={customDateText}
                      onChange={(e) => setCustomDateText(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setCustomDateText(new Date().toISOString().split('T')[0])}
                        className="text-[11px] text-indigo-600 hover:underline"
                      >
                        Today (YYYY-MM-DD)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date();
                          setCustomDateText(`${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`);
                        }}
                        className="text-[11px] text-indigo-600 hover:underline"
                      >
                        DD/MM/YYYY
                      </button>
                    </div>
                    <Button variant="primary" size="sm" className="w-full bg-indigo-600" onClick={generateQuickDateStamp}>
                      <Calendar className="w-4 h-4 mr-2" /> Use Date Stamp
                    </Button>
                  </div>
                )}
              </div>

              {/* Active Stamp Preview & Placement Controls */}
              {signature && (
                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-center">
                    <span className="text-[11px] font-semibold text-slate-500 block mb-1">Active Stamp</span>
                    <img src={signature} alt="Active stamp preview" className="max-h-14 mx-auto block" />
                  </div>

                  {/* Size slider */}
                  <div>
                    <div className="flex justify-between text-xs text-slate-600 font-medium mb-1">
                      <span>Size</span>
                      <span className="text-indigo-600 font-bold">{Math.round(signatureScale * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={50}
                      value={Math.round(signatureScale * 100)}
                      onChange={(e) => updateSelectedItemSize(parseInt(e.target.value, 10) / 100)}
                      className="w-full accent-indigo-600"
                    />
                  </div>

                  {/* Action buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleUndo}
                      disabled={history.length === 0}
                    >
                      <Undo2 className="w-3.5 h-3.5 mr-1" /> Undo
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleRedo}
                      disabled={future.length === 0}
                    >
                      <Redo2 className="w-3.5 h-3.5 mr-1" /> Redo
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={clearCurrentPageItems}
                      disabled={currentPageItems.length === 0}
                      className="flex-1 text-rose-600 hover:text-rose-700"
                    >
                      <Eraser className="w-3.5 h-3.5 mr-1" /> Clear Page
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={applyCurrentItemToAllPages}
                      disabled={placedItems.length === 0 || totalPages < 2}
                      className="flex-1"
                    >
                      <CopyPlus className="w-3.5 h-3.5 mr-1" /> All Pages
                    </Button>
                  </div>
                </div>
              )}

              {/* Vector Flattening Security Guarantee */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-left">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Permanent Vector Flattening</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Transparent signatures & AcroForm fields are permanently burned into the vector stream. Zero blurry whole-page rasterization.
                </p>
              </div>

              {/* Save & Download Action */}
              <div className="pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20"
                  disabled={placedItems.length === 0}
                  onClick={handleDownload}
                  isLoading={status}
                >
                  <Save className="w-5 h-5 mr-2" /> Save & Download Signed PDF
                </Button>
                {placedItems.length > 0 ? (
                  <p className="text-xs text-slate-500 mt-2 text-center flex items-center justify-center gap-1">
                    <Move className="w-3 h-3 text-indigo-600" /> {placedItems.length} stamp(s) placed across document
                  </p>
                ) : (
                  <p className="text-xs text-amber-600 mt-2 text-center">
                    Create a signature and click on the PDF to place.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        <ToolSEOContent toolKey="/sign-pdf" />
      </div>
    </>
  );
};
