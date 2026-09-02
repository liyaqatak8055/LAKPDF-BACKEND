import React, { useState, useRef, useEffect } from 'react';
import { FileUploader } from '../components/FileUploader';
import { Button } from '../components/Button';
import { pdfjs, saveEditedPdf, EditorAction, downloadPdf } from '../services/pdfService';
import { Signature, Check, Save, Eraser, ChevronLeft, ChevronRight, Move, Upload, Type, Undo2, Redo2, CopyPlus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Helmet } from 'react-helmet-async';
import { ToolSEOContent } from '../components/ToolSEOContent';

type SignatureMode = 'draw' | 'upload' | 'type';
type SignaturePlacement = { x: number; y: number; size: number };
type PlacementMap = Record<number, SignaturePlacement>;

export const SignPdf: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [signature, setSignature] = useState<string | null>(null); // Base64 signature
  const [signatureMode, setSignatureMode] = useState<SignatureMode>('draw');
  const [isSigning, setIsSigning] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [signatureScale, setSignatureScale] = useState(0.22); // normalized width
  const [signatureAspect, setSignatureAspect] = useState(2.4); // width / height
  const [placements, setPlacements] = useState<PlacementMap>({});
  const [placementHistory, setPlacementHistory] = useState<PlacementMap[]>([]);
  const [placementFuture, setPlacementFuture] = useState<PlacementMap[]>([]);
  const [pageRatios, setPageRatios] = useState<Record<number, number>>({});
  const [isDraggingPlacedSignature, setIsDraggingPlacedSignature] = useState(false);
  const [typedSignatureText, setTypedSignatureText] = useState('');
  const [typedSignatureFont, setTypedSignatureFont] = useState<'cursive' | 'serif' | 'sans'>('cursive');

  const [status, setStatus] = useState(false);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<HTMLCanvasElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null);
  const dragStartPlacementsRef = useRef<PlacementMap | null>(null);

  const clonePlacements = (value: PlacementMap): PlacementMap => JSON.parse(JSON.stringify(value || {}));

  const applyPlacements = (next: PlacementMap, trackHistory = true) => {
    setPlacements((prev) => {
      const prevSerialized = JSON.stringify(prev);
      const nextSerialized = JSON.stringify(next);
      if (prevSerialized === nextSerialized) return prev;
      if (trackHistory) {
        setPlacementHistory((h) => [...h, clonePlacements(prev)]);
        setPlacementFuture([]);
      }
      return clonePlacements(next);
    });
  };

  const setSignatureWithAspect = (dataUrl: string) => {
    const img = new Image();
    img.onload = () => {
      if (img.width > 0 && img.height > 0) {
        setSignatureAspect(img.width / img.height);
      }
    };
    img.src = dataUrl;
    setSignature(dataUrl);
  };

  // Load + render current page preview
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
      // Trigger re-render on resize for better placement accuracy.
      setCurrentPage((p) => p);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [file]);

  // Signature Pad Logic with Smooth Quadratic Bezier Curves
  const lastPointRef = React.useRef<{ x: number; y: number } | null>(null);

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
    ctx.strokeStyle = '#000000';

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
      offsetY: clientY - rect.top
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

  const saveSignature = () => {
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
      setSignatureWithAspect(canvas.toDataURL('image/png'));
    }
  };

  const handleUploadSignature = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (!result) return;
      setSignatureWithAspect(result);
    };
    reader.readAsDataURL(selected);
    event.target.value = '';
  };

  const generateTypedSignature = () => {
    const text = typedSignatureText.trim();
    if (!text) {
      alert('Please type your name/signature text.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const fontFamily =
      typedSignatureFont === 'cursive'
        ? '"Brush Script MT", "Segoe Script", cursive'
        : typedSignatureFont === 'serif'
          ? 'Georgia, "Times New Roman", serif'
          : '"Trebuchet MS", Arial, sans-serif';
    ctx.fillStyle = '#111111';
    ctx.font = `700 110px ${fontFamily}`;
    ctx.textBaseline = 'middle';
    const metrics = ctx.measureText(text);
    const textWidth = Math.min(canvas.width - 40, Math.ceil(metrics.width));
    const x = Math.max(20, (canvas.width - textWidth) / 2);
    const y = canvas.height / 2;
    ctx.fillText(text, x, y);
    setSignatureWithAspect(canvas.toDataURL('image/png'));
  };

  const handlePdfClick = (e: React.MouseEvent) => {
    if (signature && pdfCanvasRef.current) {
      const rect = pdfCanvasRef.current.getBoundingClientRect();
      const ratio = pageRatios[currentPage] || (rect.width / rect.height) || 1;
      const heightNorm = (signatureScale * ratio) / signatureAspect;
      const rawX = (e.clientX - rect.left) / rect.width;
      const rawY = (e.clientY - rect.top) / rect.height;
      const x = Math.max(0, Math.min(1 - signatureScale, rawX));
      const y = Math.max(0, Math.min(1 - heightNorm, rawY));
      applyPlacements({ ...placements, [currentPage]: { x, y, size: signatureScale } }, true);
    }
  };

  const handlePlacementDragStart = (e: React.MouseEvent<HTMLImageElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const placement = placements[currentPage];
    const canvas = pdfCanvasRef.current;
    if (!placement || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const signatureLeft = placement.x * rect.width;
    const signatureTop = placement.y * rect.height;
    dragOffsetRef.current = {
      x: e.clientX - (rect.left + signatureLeft),
      y: e.clientY - (rect.top + signatureTop)
    };
    dragStartPlacementsRef.current = clonePlacements(placements);
    setIsDraggingPlacedSignature(true);
  };

  useEffect(() => {
    if (!isDraggingPlacedSignature) return;
    const onPointerMove = (event: MouseEvent) => {
      const canvas = pdfCanvasRef.current;
      if (!canvas) return;
      const placement = placements[currentPage];
      if (!placement) return;
      const dragOffset = dragOffsetRef.current;
      if (!dragOffset) return;
      const rect = canvas.getBoundingClientRect();
      const ratio = pageRatios[currentPage] || (rect.width / rect.height) || 1;
      const heightNorm = (placement.size * ratio) / signatureAspect;
      const x = Math.max(0, Math.min(1 - placement.size, (event.clientX - rect.left - dragOffset.x) / rect.width));
      const y = Math.max(0, Math.min(1 - heightNorm, (event.clientY - rect.top - dragOffset.y) / rect.height));
      setPlacements((prev) => ({ ...prev, [currentPage]: { ...placement, x, y } }));
    };
    const onPointerUp = () => {
      setIsDraggingPlacedSignature(false);
      dragOffsetRef.current = null;
      if (dragStartPlacementsRef.current) {
        const beforeDrag = dragStartPlacementsRef.current;
        dragStartPlacementsRef.current = null;
        setPlacementHistory((h) => [...h, beforeDrag]);
        setPlacementFuture([]);
      }
    };
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    return () => {
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
    };
  }, [isDraggingPlacedSignature, placements, currentPage, pageRatios, signatureAspect]);

  const updateCurrentPlacementSize = (size: number) => {
    setSignatureScale(size);
    applyPlacements((() => {
      const prev = placements;
      const placement = prev[currentPage];
      if (!placement) return prev;
      const ratio = pageRatios[currentPage] || 1;
      const heightNorm = (size * ratio) / signatureAspect;
      const x = Math.max(0, Math.min(1 - size, placement.x));
      const y = Math.max(0, Math.min(1 - heightNorm, placement.y));
      return { ...prev, [currentPage]: { ...placement, size, x, y } };
    })(), true);
  };

  const clearCurrentPlacement = () => {
    applyPlacements((() => {
      const prev = placements;
      const next = { ...prev };
      delete next[currentPage];
      return next;
    })(), true);
  };

  const applyCurrentPlacementToAllPages = () => {
    const source = placements[currentPage];
    if (!source || totalPages < 1) return;
    const next: PlacementMap = { ...placements };
    for (let page = 1; page <= totalPages; page++) {
      const ratio = pageRatios[page] || pageRatios[currentPage] || 1;
      const heightNorm = (source.size * ratio) / signatureAspect;
      next[page] = {
        x: Math.max(0, Math.min(1 - source.size, source.x)),
        y: Math.max(0, Math.min(1 - heightNorm, source.y)),
        size: source.size
      };
    }
    applyPlacements(next, true);
  };

  const handleUndoPlacement = () => {
    if (placementHistory.length === 0) return;
    const previous = placementHistory[placementHistory.length - 1];
    setPlacementHistory((h) => h.slice(0, -1));
    setPlacementFuture((f) => [clonePlacements(placements), ...f]);
    setPlacements(clonePlacements(previous));
  };

  const handleRedoPlacement = () => {
    if (placementFuture.length === 0) return;
    const [next, ...rest] = placementFuture;
    setPlacementFuture(rest);
    setPlacementHistory((h) => [...h, clonePlacements(placements)]);
    setPlacements(clonePlacements(next));
  };

  const handleDownload = async () => {
    if (!file || !signature || Object.keys(placements).length === 0) return;
    setStatus(true);

    const actions: EditorAction[] = (Object.entries(placements) as Array<[string, { x: number; y: number; size: number }]>).map(([page, placement]) => {
      const pageNum = Number(page);
      return {
        id: uuidv4(),
        type: 'image',
        pageIndex: Math.max(0, pageNum - 1),
        imageData: signature,
        x: placement.x,
        y: placement.y,
        width: placement.size
      };
    });

    try {
      const newPdf = await saveEditedPdf(file, actions);
      downloadPdf(newPdf, `signed-${file.name}`, { autoDownload: true });
    } catch (e) {
      console.error(e);
      alert("Failed to save PDF");
    } finally {
      setStatus(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Sign PDF Online Free | Add Signature - LAK PDF</title>
        <meta name="description" content="Sign PDF online for free. Add your digital signature and download instantly." />
        <link rel="canonical" href="https://lakpdf.com/sign-pdf" />
        <meta property="og:title" content="Sign PDF Online Free | Add Signature - LAK PDF" />
        <meta property="og:description" content="Sign PDF online for free. Add your digital signature and download instantly." />
        <meta property="og:url" content="https://lakpdf.com/sign-pdf" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://lakpdf.com/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Sign PDF Online Free | Add Signature - LAK PDF" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Sign PDF Online Free | Add Signature - LAK PDF" />
        <meta name="twitter:description" content="Sign PDF online for free. Add your digital signature and download instantly." />
        <meta name="twitter:image" content="https://lakpdf.com/og-image.png" />
      </Helmet>
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Sign PDF</h1>
        <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto">
          Draw your signature and place it on your document.
        </p>
      </div>

      {!file ? (
        <FileUploader
          onFilesSelected={(f) => {
            setFile(f[0]);
            setCurrentPage(1);
            setTotalPages(0);
            setPlacements({});
            setPlacementHistory([]);
            setPlacementFuture([]);
          }}
          multiple={false}
          icon={<Signature className="w-12 h-12 text-indigo-500" />}
          title="Select PDF"
          description="Drop the document you want to sign"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* PDF Preview Area */}
          <div className="lg:col-span-2 bg-slate-100 p-4 rounded-2xl overflow-hidden flex justify-center" ref={pdfContainerRef}>
            <div className="shadow-lg">
              <div className="flex items-center justify-between bg-white border border-slate-200 rounded-t-lg px-3 py-2">
                <div className="text-sm text-slate-600">Page {currentPage} of {totalPages || 1}</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="p-1.5 rounded border border-slate-200 text-slate-600 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages || 1, p + 1))}
                    disabled={currentPage >= (totalPages || 1)}
                    className="p-1.5 rounded border border-slate-200 text-slate-600 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="relative">
                <canvas ref={pdfCanvasRef} onClick={handlePdfClick} className="bg-white cursor-crosshair" />
                {placements[currentPage] && signature && (
                  <img
                    src={signature}
                    onMouseDown={handlePlacementDragStart}
                    onDragStart={(e) => e.preventDefault()}
                    className="absolute border-2 border-indigo-500 border-dashed bg-indigo-50/20 cursor-move select-none"
                    style={{
                      left: `${placements[currentPage].x * 100}%`,
                      top: `${placements[currentPage].y * 100}%`,
                      width: `${placements[currentPage].size * 100}%`
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Controls */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 h-fit">
            <h3 className="font-bold text-slate-900 mb-4">Your Signature</h3>
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setSignatureMode('draw')}
                className={`px-3 py-1.5 rounded text-sm border ${signatureMode === 'draw' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'border-slate-200 text-slate-600'}`}
              >
                Draw
              </button>
              <button
                onClick={() => setSignatureMode('upload')}
                className={`px-3 py-1.5 rounded text-sm border ${signatureMode === 'upload' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'border-slate-200 text-slate-600'}`}
              >
                Upload
              </button>
              <button
                onClick={() => setSignatureMode('type')}
                className={`px-3 py-1.5 rounded text-sm border ${signatureMode === 'type' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'border-slate-200 text-slate-600'}`}
              >
                Type
              </button>
            </div>
            
            {!signature ? (
              <div className="mb-6">
                {signatureMode === 'draw' && (
                  <>
                    <div className="border border-slate-200 rounded-lg bg-slate-50 mb-2 touch-none">
                      <canvas 
                        ref={signaturePadRef} 
                        width={300} 
                        height={150} 
                        className="w-full cursor-pencil"
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
                        <Eraser className="w-4 h-4 mr-2" /> Clear
                      </Button>
                      <Button variant="primary" size="sm" onClick={saveSignature} className="flex-1">
                        <Check className="w-4 h-4 mr-2" /> Use This
                      </Button>
                    </div>
                  </>
                )}
                {signatureMode === 'upload' && (
                  <div className="space-y-3">
                    <input
                      ref={uploadInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleUploadSignature}
                    />
                    <Button variant="secondary" size="sm" className="w-full" onClick={() => uploadInputRef.current?.click()}>
                      <Upload className="w-4 h-4 mr-2" /> Upload Signature Image
                    </Button>
                    <p className="text-xs text-slate-500">Transparent PNG recommended for best output.</p>
                  </div>
                )}
                {signatureMode === 'type' && (
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Type your name"
                      value={typedSignatureText}
                      onChange={(e) => setTypedSignatureText(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2"
                    />
                    <select
                      value={typedSignatureFont}
                      onChange={(e) => setTypedSignatureFont(e.target.value as 'cursive' | 'serif' | 'sans')}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="cursive">Cursive</option>
                      <option value="serif">Serif</option>
                      <option value="sans">Sans</option>
                    </select>
                    <Button variant="primary" size="sm" className="w-full" onClick={generateTypedSignature}>
                      <Type className="w-4 h-4 mr-2" /> Generate Typed Signature
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="mb-6 text-center">
                 <div className="bg-white border border-slate-200 p-4 rounded-lg mb-4">
                   <img src={signature} alt="Signature" className="h-16 mx-auto" />
                 </div>
                 <p className="text-sm text-slate-500 mb-4">
                   Click on any page to place signature. Drag to reposition.
                 </p>
                 <div className="mb-4">
                   <label className="block text-xs text-slate-500 mb-2">Signature Size</label>
                   <input
                     type="range"
                     min={10}
                     max={45}
                     value={Math.round(signatureScale * 100)}
                     onChange={(e) => updateCurrentPlacementSize(parseInt(e.target.value, 10) / 100)}
                     className="w-full"
                   />
                   <div className="text-xs text-slate-500 mt-1">{Math.round(signatureScale * 100)}% width</div>
                 </div>
                 <div className="flex gap-2 mb-4">
                   <Button variant="secondary" size="sm" onClick={clearCurrentPlacement} className="flex-1">
                     <Eraser className="w-4 h-4 mr-2" /> Clear Page Sign
                   </Button>
                 </div>
                 <div className="flex gap-2 mb-4">
                   <Button
                     variant="secondary"
                     size="sm"
                     onClick={handleUndoPlacement}
                     disabled={placementHistory.length === 0}
                     className="flex-1"
                   >
                     <Undo2 className="w-4 h-4 mr-2" /> Undo
                   </Button>
                   <Button
                     variant="secondary"
                     size="sm"
                     onClick={handleRedoPlacement}
                     disabled={placementFuture.length === 0}
                     className="flex-1"
                   >
                     <Redo2 className="w-4 h-4 mr-2" /> Redo
                   </Button>
                 </div>
                 <Button
                   variant="secondary"
                   size="sm"
                   onClick={applyCurrentPlacementToAllPages}
                   disabled={!placements[currentPage] || totalPages < 2}
                   className="w-full mb-3"
                 >
                   <CopyPlus className="w-4 h-4 mr-2" /> Apply To All Pages
                 </Button>
                 <Button variant="secondary" size="sm" onClick={() => setSignature(null)} className="w-full">
                   Redraw Signature
                 </Button>
              </div>
            )}

            <div className="border-t border-slate-100 pt-6">
              <Button 
                variant="primary" 
                size="lg" 
                className="w-full bg-indigo-600"
                disabled={Object.keys(placements).length === 0}
                onClick={handleDownload}
                isLoading={status}
              >
                <Save className="w-5 h-5 mr-2" /> Save & Download
              </Button>
              {signature && (
                <p className="text-xs text-slate-500 mt-2 text-center flex items-center justify-center gap-1">
                  <Move className="w-3 h-3" /> Placed on {Object.keys(placements).length} page(s)
                </p>
              )}
              {Object.keys(placements).length === 0 && signature && (
                 <p className="text-xs text-orange-500 mt-1 text-center">Please click on the PDF to place signature first.</p>
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
