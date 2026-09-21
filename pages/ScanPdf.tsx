import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from '../components/Button';
import { imagesToPdfScan, downloadPdf, renderPdfPagesToCanvases } from '../services/pdfService';
import {
  detectDocumentCorners,
  findPhysicalDocumentQuad,
  warpPerspective,
  processDocumentScan,
  DocumentCorners,
  ScanFilterType,
  Point
} from '../utils/documentScanner';
import {
  Camera,
  Trash2,
  Download,
  RotateCw,
  ArrowUp,
  ArrowDown,
  ImagePlus,
  CheckCircle,
  ArrowRight,
  X,
  Sparkles,
  FileText,
  Check,
  Crop,
  Eye,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Sliders,
  ShieldCheck,
  FileCheck
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { NextStepPanel, RelatedActions } from '../components/ToolProductPanels';
import { ToolSEOContent } from '../components/ToolSEOContent';

export interface ScanItem {
  id: string;
  name: string;
  size: number;
  originalCanvas: HTMLCanvasElement;
  previewUrl: string;
  rotation: number; // 0, 90, 180, 270
  filter: ScanFilterType;
  corners: DocumentCorners;
  deskew: boolean;
  removeShadows: boolean;
  sharpen: boolean;
  isProcessing?: boolean;
}

const isCustomCropped = (corners: DocumentCorners, origW: number, origH: number): boolean => {
  if (!corners) return false;
  const dTL = Math.hypot(corners.topLeft.x - 0, corners.topLeft.y - 0);
  const dTR = Math.hypot(corners.topRight.x - origW, corners.topRight.y - 0);
  const dBR = Math.hypot(corners.bottomRight.x - origW, corners.bottomRight.y - origH);
  const dBL = Math.hypot(corners.bottomLeft.x - 0, corners.bottomLeft.y - origH);
  return (dTL + dTR + dBR + dBL) > 15;
};

export const ScanPdf: React.FC = () => {
  const [scans, setScans] = useState<ScanItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [docName, setDocName] = useState('scanned-document');
  const [pageSize, setPageSize] = useState<'a4' | 'auto'>('a4');
  const [margin, setMargin] = useState<'none' | 'small'>('none');
  const [globalFilter, setGlobalFilter] = useState<ScanFilterType>('auto');
  const [enableOcrLayer, setEnableOcrLayer] = useState(false);
  const [readyPdf, setReadyPdf] = useState<{
    bytes: Uint8Array;
    name: string;
    originalSize: number;
    finalSize: number;
  } | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [activeStepText, setActiveStepText] = useState('');

  // Modals state
  const [editingCornersItemId, setEditingCornersItemId] = useState<string | null>(null);
  const [previewItemId, setPreviewItemId] = useState<string | null>(null);

  // Camera Modal State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [lastSnapToast, setLastSnapToast] = useState<string | null>(null);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      scans.forEach((s) => URL.revokeObjectURL(s.previewUrl));
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      streamRef.current = stream;
      setIsCameraOpen(true);
    } catch (err) {
      console.warn('Direct webcam access not available, falling back to camera file input', err);
      cameraInputRef.current?.click();
    }
  };

  useEffect(() => {
    if (isCameraOpen && streamRef.current && videoRef.current) {
      const video = videoRef.current;
      video.srcObject = streamRef.current;
      video.play().catch((e) => console.warn('Video stream play warning:', e));
    }
  }, [isCameraOpen]);

  // Helper to render an enhanced preview canvas to an Object URL
  const generatePreviewBlobUrl = async (
    originalCanvas: HTMLCanvasElement,
    corners: DocumentCorners,
    filter: ScanFilterType,
    rotation: number,
    deskew: boolean,
    removeShadows: boolean,
    sharpen: boolean
  ): Promise<string> => {
    // Process through pipeline on a scaled working canvas for instant preview speed
    const maxDimension = 1400;
    const scale = Math.min(1, maxDimension / Math.max(originalCanvas.width, originalCanvas.height));

    let workCanvas = originalCanvas;
    let scaledCorners = corners;

    if (scale < 1) {
      workCanvas = document.createElement('canvas');
      workCanvas.width = Math.round(originalCanvas.width * scale);
      workCanvas.height = Math.round(originalCanvas.height * scale);
      const ctx = workCanvas.getContext('2d')!;
      ctx.drawImage(originalCanvas, 0, 0, workCanvas.width, workCanvas.height);

      scaledCorners = {
        topLeft: { x: corners.topLeft.x * scale, y: corners.topLeft.y * scale },
        topRight: { x: corners.topRight.x * scale, y: corners.topRight.y * scale },
        bottomRight: { x: corners.bottomRight.x * scale, y: corners.bottomRight.y * scale },
        bottomLeft: { x: corners.bottomLeft.x * scale, y: corners.bottomLeft.y * scale },
        confidence: corners.confidence
      };
    }

    let processed = await processDocumentScan(workCanvas, {
      corners: scaledCorners,
      filter,
      deskew,
      removeShadows,
      sharpen
    });

    // Handle card rotation if specified
    if (rotation !== 0) {
      const is90or270 = rotation === 90 || rotation === 270;
      const rotCanvas = document.createElement('canvas');
      rotCanvas.width = is90or270 ? processed.height : processed.width;
      rotCanvas.height = is90or270 ? processed.width : processed.height;
      const rCtx = rotCanvas.getContext('2d')!;
      rCtx.save();
      rCtx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
      rCtx.rotate((rotation * Math.PI) / 180);
      rCtx.drawImage(processed, -processed.width / 2, -processed.height / 2);
      rCtx.restore();
      processed = rotCanvas;
    }

    return new Promise((resolve) => {
      processed.toBlob(
        (blob) => {
          if (blob) {
            resolve(URL.createObjectURL(blob));
          } else {
            resolve(processed.toDataURL('image/jpeg', 0.85));
          }
        },
        'image/jpeg',
        0.88
      );
    });
  };

  // Convert uploaded image or canvas to ScanItem
  const createScanItemFromCanvas = async (
    canvas: HTMLCanvasElement,
    pageTitle: string,
    fileSize: number
  ): Promise<ScanItem> => {
    // 1. Detect document edges & 4 corners
    const corners = detectDocumentCorners(canvas);

    // 2. Generate initial preview with stable orientation
    const previewUrl = await generatePreviewBlobUrl(
      canvas,
      corners,
      globalFilter,
      0,
      false, // deskew = false on upload to keep document 100% stable and upright
      true,  // removeShadows
      true   // sharpen
    );

    return {
      id: uuidv4(),
      name: pageTitle,
      size: fileSize,
      originalCanvas: canvas,
      previewUrl,
      rotation: 0,
      filter: globalFilter,
      corners,
      deskew: false, // Default deskew false so no accidental tilting occurs
      removeShadows: true,
      sharpen: true
    };
  };

  const addImagesOrPdf = async (files: File[]) => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setActiveStepText('Analyzing uploaded pages and detecting document boundaries...');

    try {
      const newItems: ScanItem[] = [];

      for (const file of files) {
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          setActiveStepText(`Rendering high-resolution pages from ${file.name}...`);
          const renderedPages = await renderPdfPagesToCanvases(
            file,
            300,
            50,
            (cur, total) => {
              setActiveStepText(`Rendering PDF Page ${cur} of ${total} at 300 DPI...`);
            }
          );

          for (const p of renderedPages) {
            const pageName = `Page ${scans.length + newItems.length + 1}`;
            const item = await createScanItemFromCanvas(p.canvas, pageName, file.size / renderedPages.length);
            newItems.push(item);
          }
        } else if (file.type.startsWith('image/')) {
          const img = new Image();
          const objUrl = URL.createObjectURL(file);
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
            img.src = objUrl;
          });
          URL.revokeObjectURL(objUrl);

          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0);

          const pageName = `Page ${scans.length + newItems.length + 1}`;
          const item = await createScanItemFromCanvas(canvas, pageName, file.size);
          newItems.push(item);
        }
      }

      setScans((prev) => [...prev, ...newItems]);
      setReadyPdf(null);
      setStatusMessage('');
    } catch (err: any) {
      console.error('Failed to import scan input:', err);
      setStatusMessage(`Failed to process input: ${err.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
      setActiveStepText('');
    }
  };

  const capturePhotoFromStream = async (closeModal: boolean = false) => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight || video.readyState < 2) {
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const nextPageIndex = scans.length + 1;
    const item = await createScanItemFromCanvas(canvas, `Page ${nextPageIndex}`, 500000);
    setScans((prev) => [...prev, item]);
    setReadyPdf(null);

    setLastSnapToast(`Page ${nextPageIndex} Snapped!`);
    setTimeout(() => setLastSnapToast(null), 1600);

    if (closeModal) {
      setIsCameraOpen(false);
      stopCamera();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addImagesOrPdf(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const removeScan = (id: string) => {
    setScans((prev) => {
      const target = prev.find((s) => s.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((s) => s.id !== id);
    });
    setReadyPdf(null);
  };

  const rotateScan = async (id: string) => {
    const item = scans.find((s) => s.id === id);
    if (!item) return;

    const nextRot = (item.rotation + 90) % 360;
    const newUrl = await generatePreviewBlobUrl(
      item.originalCanvas,
      item.corners,
      item.filter,
      nextRot,
      item.deskew,
      item.removeShadows,
      item.sharpen
    );

    setScans((prev) =>
      prev.map((s) => (s.id === id ? { ...s, rotation: nextRot, previewUrl: newUrl } : s))
    );
    setReadyPdf(null);
  };

  const updateScanFilter = async (id: string, filter: ScanFilterType) => {
    const item = scans.find((s) => s.id === id);
    if (!item) return;

    const newUrl = await generatePreviewBlobUrl(
      item.originalCanvas,
      item.corners,
      filter,
      item.rotation,
      item.deskew,
      item.removeShadows,
      item.sharpen
    );

    setScans((prev) =>
      prev.map((s) => (s.id === id ? { ...s, filter, previewUrl: newUrl } : s))
    );
    setReadyPdf(null);
  };

  const applyGlobalFilter = async (filter: ScanFilterType) => {
    setGlobalFilter(filter);
    setIsProcessing(true);
    setActiveStepText(`Applying ${filterLabels[filter]} filter to all pages...`);

    try {
      const updated = await Promise.all(
        scans.map(async (item) => {
          const newUrl = await generatePreviewBlobUrl(
            item.originalCanvas,
            item.corners,
            filter,
            item.rotation,
            item.deskew,
            item.removeShadows,
            item.sharpen
          );
          return { ...item, filter, previewUrl: newUrl };
        })
      );
      setScans(updated);
      setReadyPdf(null);
    } finally {
      setIsProcessing(false);
      setActiveStepText('');
    }
  };

  const moveScan = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === scans.length - 1)
    )
      return;

    const next = [...scans];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const temp = next[index];
    next[index] = next[targetIdx];
    next[targetIdx] = temp;
    setScans(next);
    setReadyPdf(null);
  };

  // Full High-Resolution Processing for PDF Generation
  const processFullResolutionPage = async (item: ScanItem): Promise<File> => {
    // 1. Run pipeline on full native resolution
    let processed = await processDocumentScan(
      item.originalCanvas,
      {
        corners: item.corners,
        filter: item.filter,
        deskew: item.deskew,
        removeShadows: item.removeShadows,
        sharpen: item.sharpen
      },
      (step) => setActiveStepText(`${item.name}: ${step}`)
    );

    // 2. Rotate if user requested
    if (item.rotation !== 0) {
      const is90or270 = item.rotation === 90 || item.rotation === 270;
      const rotCanvas = document.createElement('canvas');
      rotCanvas.width = is90or270 ? processed.height : processed.width;
      rotCanvas.height = is90or270 ? processed.width : processed.height;
      const rCtx = rotCanvas.getContext('2d')!;
      rCtx.save();
      rCtx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
      rCtx.rotate((item.rotation * Math.PI) / 180);
      rCtx.drawImage(processed, -processed.width / 2, -processed.height / 2);
      rCtx.restore();
      processed = rotCanvas;
    }

    return new Promise((resolve) => {
      processed.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], `${item.name}.jpg`, { type: 'image/jpeg' }));
          } else {
            resolve(new File([], `${item.name}.jpg`, { type: 'image/jpeg' }));
          }
        },
        'image/jpeg',
        0.92 // CamScanner high visual quality
      );
    });
  };

  const handleGeneratePdf = async () => {
    if (scans.length === 0) return;
    setIsProcessing(true);
    setStatusMessage('Preparing CamScanner high-definition pages...');

    try {
      const processedFiles: File[] = [];
      const ocrLayers: string[] = [];

      let totalOriginalBytes = 0;
      for (const s of scans) {
        totalOriginalBytes += s.size || 1000000;
      }

      for (let i = 0; i < scans.length; i++) {
        const item = scans[i];
        setActiveStepText(`Processing page ${i + 1} of ${scans.length} (${item.name})...`);
        const file = await processFullResolutionPage(item);
        processedFiles.push(file);

        if (enableOcrLayer) {
          try {
            setActiveStepText(`Extracting searchable OCR layer for page ${i + 1}...`);
            const tesseractMod = await import('tesseract.js');
            const Tesseract = (tesseractMod as any).default || tesseractMod;
            const {
              data: { text }
            } = await Tesseract.recognize(file, 'eng');
            ocrLayers.push(text || '');
          } catch (e) {
            console.warn('OCR layer extraction skipped:', e);
            ocrLayers.push('');
          }
        }
      }

      setActiveStepText('Assembling document pages into standard PDF...');
      const pdfBytes = await imagesToPdfScan(processedFiles, {
        format: pageSize,
        margin: margin,
        quality: 0.92,
        ocrTextLayers: enableOcrLayer ? ocrLayers : []
      });

      const cleanDocName = docName.trim() ? docName.trim().replace(/\.pdf$/i, '') : 'scanned-document';
      const fileName = `${cleanDocName}.pdf`;

      setReadyPdf({
        bytes: pdfBytes,
        name: fileName,
        originalSize: totalOriginalBytes,
        finalSize: pdfBytes.byteLength
      });

      downloadPdf(pdfBytes, fileName, { autoDownload: true });
      setStatusMessage('Scanned PDF successfully generated & downloaded!');
    } catch (err: any) {
      console.error(err);
      setStatusMessage(`Failed to create scanned PDF: ${err.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
      setActiveStepText('');
    }
  };

  const handleDownloadReady = () => {
    if (!readyPdf) return;
    downloadPdf(readyPdf.bytes, readyPdf.name, { autoDownload: true });
  };

  const filterLabels: Record<ScanFilterType, string> = {
    auto: '✨ Auto Enhance',
    magic: '🪄 Magic Color',
    color: '🌈 Color',
    bw: '📄 B&W Doc',
    grayscale: '🔘 Grayscale',
    high_contrast: '⚡ High Contrast',
    original: '📷 Original'
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const editingItem = scans.find((s) => s.id === editingCornersItemId);
  const previewItem = scans.find((s) => s.id === previewItemId);

  return (
    <>
      <Helmet>
        <title>Scan Document Online Free | CamScanner-Grade Document Scanner - LAK PDF</title>
        <meta
          name="description"
          content="Scan documents online free with phone camera, photos, or PDF upload. Automatic boundary detection, perspective correction, shadow removal, and original image preservation."
        />
        <link rel="canonical" href="https://lakpdf.com/scan-pdf" />
        <meta property="og:title" content="Scan Document Online Free | Document Scanner - LAK PDF" />
        <meta
          property="og:description"
          content="Scan documents online free with camera or photos. Automatic contrast enhancement, B&W filters, and A4 page layout."
        />
        <meta property="og:url" content="https://lakpdf.com/scan-pdf" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://lakpdf.com/og-image.png" />
      </Helmet>

      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept="image/*,application/pdf"
        multiple
        className="hidden"
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileInputChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-xs font-bold mb-3 shadow-xs">
            <Sparkles className="w-3.5 h-3.5" /> CamScanner-Grade Document Vision
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-2.5">
            Scan Document
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto">
            Scan documents, photos, or existing PDFs with automatic boundary detection, perspective
            correction, and shadow removal — preserving 100% of the original document imagery.
          </p>
        </div>

        {/* ── STEP 1: Capture or Upload Screen ── */}
        {scans.length === 0 ? (
          <div className="max-w-3xl mx-auto grid gap-5 sm:grid-cols-2">
            {/* Camera Capture Card */}
            <div
              onClick={startCamera}
              className="group relative flex flex-col items-center justify-center p-8 bg-gradient-to-b from-blue-50/60 to-white rounded-3xl border-2 border-dashed border-blue-300 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 transition-all cursor-pointer text-center"
            >
              <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
                <Camera className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Take Photo with Camera</h3>
              <p className="text-xs text-slate-500 max-w-xs mb-4">
                Use your mobile or webcam to scan physical paper documents page by page.
              </p>
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-sm group-hover:bg-blue-700">
                <Camera className="w-3.5 h-3.5" /> Start Camera Scan
              </span>
            </div>

            {/* Photo / PDF Upload Card */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="group relative flex flex-col items-center justify-center p-8 bg-gradient-to-b from-slate-50/60 to-white rounded-3xl border-2 border-dashed border-slate-300 hover:border-[#e5323f] hover:shadow-xl hover:shadow-red-500/10 transition-all cursor-pointer text-center"
            >
              <div className="w-16 h-16 bg-[#e5323f] text-white rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-red-500/30 group-hover:scale-110 transition-transform">
                <ImagePlus className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Upload Images or PDF</h3>
              <p className="text-xs text-slate-500 max-w-xs mb-4">
                Select photos (JPG, PNG, WEBP) or existing scanned PDF files to clean and enhance.
              </p>
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-sm group-hover:bg-slate-800">
                <ImagePlus className="w-3.5 h-3.5" /> Select Files
              </span>
            </div>
          </div>
        ) : (
          /* ── STEP 2: Document Studio (Split Workspace) ── */
          <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px] items-start">
            {/* ── LEFT COLUMN: Scanned Pages Gallery & Filters ── */}
            <div className="space-y-4">
              {/* Header Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900 text-sm">
                    {scans.length} Scanned Page{scans.length > 1 ? 's' : ''}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    High Fidelity (No OCR Reconstruction)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" /> + Camera
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    <ImagePlus className="w-3.5 h-3.5" /> + Add Files
                  </button>
                </div>
              </div>

              {/* Global Filter Bar */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1.5 shrink-0">
                  <Sparkles className="w-4 h-4 text-orange-500" /> Enhancement Mode:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      'auto',
                      'magic',
                      'color',
                      'bw',
                      'grayscale',
                      'high_contrast',
                      'original'
                    ] as ScanFilterType[]
                  ).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => applyGlobalFilter(f)}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                        globalFilter === f
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {filterLabels[f]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pages Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {scans.map((scan, index) => (
                  <div
                    key={scan.id}
                    className="group relative bg-white rounded-2xl border border-slate-200 hover:border-slate-300 p-4 shadow-xs transition-all flex flex-col"
                  >
                    {/* Card Header */}
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2.5 py-0.5 rounded-lg bg-slate-900 text-white text-[11px] font-bold">
                          Page {index + 1}
                        </span>
                        {isCustomCropped(scan.corners, scan.originalCanvas.width, scan.originalCanvas.height) ? (
                          <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 font-semibold px-1.5 py-0.5 rounded">
                            Adjusted
                          </span>
                        ) : (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold px-1.5 py-0.5 rounded">
                            Auto-Enhanced
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveScan(index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                          title="Move Up"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveScan(index, 'down')}
                          disabled={index === scans.length - 1}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                          title="Move Down"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => rotateScan(scan.id)}
                          className="p-1 text-slate-500 hover:text-orange-600 cursor-pointer ml-0.5"
                          title="Rotate 90°"
                        >
                          <RotateCw className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeScan(scan.id)}
                          className="p-1 text-slate-400 hover:text-red-500 cursor-pointer ml-0.5"
                          title="Delete Page"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Live Paper Sheet Preview Container */}
                    <div className="w-full flex items-center justify-center p-3 bg-slate-100/70 rounded-xl mb-2.5 border border-slate-200/80 relative group/preview">
                      <div
                        className={`relative w-full ${
                          pageSize === 'a4'
                            ? 'aspect-[210/297] max-w-[260px]'
                            : 'aspect-[4/3] max-w-[260px]'
                        } bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden flex items-center justify-center transition-all duration-200 ${
                          margin === 'none' ? 'p-0' : 'p-3'
                        }`}
                      >
                        <div className="w-full h-full flex items-center justify-center overflow-hidden bg-white relative">
                          <img
                            src={scan.previewUrl}
                            alt={scan.name}
                            className="max-h-full max-w-full object-contain rounded-xs transition-all duration-200"
                          />
                        </div>
                      </div>

                      {/* Floating overlay actions on image preview */}
                      <div className="absolute bottom-4 inset-x-6 flex items-center justify-center gap-2 opacity-90 group-hover/preview:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => setEditingCornersItemId(scan.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900/85 hover:bg-slate-900 text-white rounded-xl text-[11px] font-bold backdrop-blur-xs shadow-md cursor-pointer transition-transform active:scale-95"
                          title="Adjust 4 Document Corners"
                        >
                          <Crop className="w-3.5 h-3.5 text-orange-400" />
                          <span>Crop & Perspective</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewItemId(scan.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900/85 hover:bg-slate-900 text-white rounded-xl text-[11px] font-bold backdrop-blur-xs shadow-md cursor-pointer transition-transform active:scale-95"
                          title="Compare Before and After"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-400" />
                          <span>Before / After</span>
                        </button>
                      </div>
                    </div>

                    {/* Per-Card Filter Picker */}
                    <div className="flex items-center justify-between gap-1 pt-2 border-t border-slate-100 text-[10px]">
                      <span className="text-slate-400 font-semibold">Filter:</span>
                      <div className="flex flex-wrap gap-1">
                        {(
                          ['auto', 'magic', 'color', 'bw', 'grayscale', 'original'] as ScanFilterType[]
                        ).map((f) => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => updateScanFilter(scan.id, f)}
                            className={`px-2 py-0.5 rounded font-bold capitalize cursor-pointer transition-colors ${
                              scan.filter === f
                                ? 'bg-orange-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {f === 'bw' ? 'B&W' : f === 'auto' ? 'Auto' : f}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── RIGHT COLUMN: Sticky PDF Export Sidebar ── */}
            <div className="sticky top-6 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100 flex items-center justify-between">
                  <span>Document Settings</span>
                  <span className="text-xs text-slate-400 font-normal">
                    {scans.length} Page{scans.length > 1 ? 's' : ''}
                  </span>
                </h3>

                <div className="space-y-4">
                  {/* File Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      File Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={docName}
                        onChange={(e) => {
                          setDocName(e.target.value);
                          setReadyPdf(null);
                        }}
                        placeholder="scanned-document"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 pr-12"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-semibold">
                        .pdf
                      </span>
                    </div>
                  </div>

                  {/* Page Size */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Page Size
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setPageSize('a4');
                          setReadyPdf(null);
                        }}
                        className={`py-2 px-3 rounded-xl font-bold border cursor-pointer flex items-center justify-center gap-1.5 transition-all ${
                          pageSize === 'a4'
                            ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {pageSize === 'a4' && <Check className="w-3.5 h-3.5 shrink-0" />}
                        <span>A4 Standard</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPageSize('auto');
                          setReadyPdf(null);
                        }}
                        className={`py-2 px-3 rounded-xl font-bold border cursor-pointer flex items-center justify-center gap-1.5 transition-all ${
                          pageSize === 'auto'
                            ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {pageSize === 'auto' && <Check className="w-3.5 h-3.5 shrink-0" />}
                        <span>Fit to Image</span>
                      </button>
                    </div>
                  </div>

                  {/* Margins */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Page Margins
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setMargin('none');
                          setReadyPdf(null);
                        }}
                        className={`py-2 px-3 rounded-xl font-bold border cursor-pointer flex items-center justify-center gap-1.5 transition-all ${
                          margin === 'none'
                            ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {margin === 'none' && <Check className="w-3.5 h-3.5 shrink-0" />}
                        <span>No Margin (Full)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMargin('small');
                          setReadyPdf(null);
                        }}
                        className={`py-2 px-3 rounded-xl font-bold border cursor-pointer flex items-center justify-center gap-1.5 transition-all ${
                          margin === 'small'
                            ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {margin === 'small' && <Check className="w-3.5 h-3.5 shrink-0" />}
                        <span>Small Margin</span>
                      </button>
                    </div>
                  </div>

                  {/* Searchable OCR Layer Toggle */}
                  <div className="pt-2 border-t border-slate-100">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div className="pr-2">
                        <span className="block text-xs font-bold text-slate-800">
                          Searchable Text (OCR)
                        </span>
                        <span className="block text-[11px] text-slate-500 leading-tight">
                          Invisible layer for text selection without altering visual document
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={enableOcrLayer}
                        onChange={(e) => {
                          setEnableOcrLayer(e.target.checked);
                          setReadyPdf(null);
                        }}
                        className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 cursor-pointer"
                      />
                    </label>
                  </div>

                  {/* Summary Box */}
                  <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 space-y-1.5 border border-slate-100">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Scans:</span>
                      <span className="font-bold text-slate-800">
                        {scans.length} Page{scans.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Filter Applied:</span>
                      <span className="font-bold text-orange-600">
                        {filterLabels[globalFilter]}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Target Size:</span>
                      <span className="font-bold text-slate-800">
                        {pageSize === 'a4' ? 'A4 (210×297mm)' : 'Original Ratio'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Quality:</span>
                      <span className="font-bold text-emerald-600">CamScanner HD (300 DPI)</span>
                    </div>
                  </div>

                  {/* PRIMARY ACTION BUTTON */}
                  {!readyPdf ? (
                    <button
                      type="button"
                      onClick={handleGeneratePdf}
                      disabled={isProcessing || scans.length === 0}
                      className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#e5323f] hover:bg-[#d4202d] text-white py-4 px-6 text-base font-extrabold shadow-lg shadow-red-500/25 transition-all hover:scale-[1.02] active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
                    >
                      {isProcessing ? (
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Processing Document...</span>
                        </div>
                      ) : (
                        <>
                          <span>Save & Download PDF</span>
                          <ArrowRight className="h-5 w-5" />
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-slate-900">
                              Scan Completed Successfully!
                            </p>
                            <p className="text-[10px] text-slate-500 truncate max-w-[200px]">
                              {readyPdf.name}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-[11px] pt-1 border-t border-emerald-200/60 text-slate-600">
                          <div>
                            Original Size: <b>{formatFileSize(readyPdf.originalSize)}</b>
                          </div>
                          <div>
                            Final PDF: <b>{formatFileSize(readyPdf.finalSize)}</b>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="primary"
                        size="lg"
                        className="w-full py-4 text-base font-bold bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30 cursor-pointer"
                        onClick={handleDownloadReady}
                      >
                        <Download className="w-5 h-5 mr-2" />
                        Download PDF Again
                      </Button>
                    </div>
                  )}

                  {activeStepText && (
                    <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-medium flex items-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0"></div>
                      <span className="truncate">{activeStepText}</span>
                    </div>
                  )}

                  {statusMessage && !isProcessing && (
                    <p className="text-xs text-center font-medium text-emerald-600">
                      {statusMessage}
                    </p>
                  )}
                </div>
              </div>

              <NextStepPanel
                title="CamScanner Technology"
                steps={[
                  'Original visual document is 100% preserved (photos, tables, borders, and signatures).',
                  'Corners and perspective are corrected automatically with manual fine-tuning available.',
                  'Paper background is whitened and lighting shadows are eliminated.',
                ]}
              />
              <RelatedActions
                actions={[
                  { label: 'JPG to PDF', to: '/img-to-pdf' },
                  { label: 'OCR PDF (Extract Text)', to: '/ocr-pdf' },
                  { label: 'Compress PDF', to: '/compress' },
                ]}
              />
            </div>
          </div>
        )}

        {/* ── LIVE WEBCAM MODAL ── */}
        {isCameraOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-slate-900 rounded-3xl p-5 sm:p-6 max-w-xl w-full text-white space-y-4 shadow-2xl border border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                    <Camera className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base">Camera Document Scanner</h3>
                    <p className="text-[11px] text-slate-400">
                      Position paper inside the frame & snap
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-slate-800 text-blue-400 text-xs font-bold border border-slate-700">
                    {scans.length} Page{scans.length !== 1 ? 's' : ''} Scanned
                  </span>
                  <button
                    onClick={() => {
                      setIsCameraOpen(false);
                      stopCamera();
                    }}
                    className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="relative aspect-[4/3] bg-black rounded-2xl overflow-hidden flex items-center justify-center border border-slate-700 shadow-inner">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-6 border-2 border-dashed border-white/50 rounded-xl pointer-events-none flex items-center justify-center">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-white/70 bg-black/50 px-2.5 py-1 rounded">
                    Position Document Here
                  </span>
                </div>

                {/* Snap Toast Feedback */}
                {lastSnapToast && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-emerald-500 text-white rounded-full font-bold text-xs shadow-lg animate-bounce flex items-center gap-1.5">
                    <Check className="w-4 h-4" /> {lastSnapToast}
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => capturePhotoFromStream(false)}
                  className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/25 text-sm cursor-pointer transition-all active:scale-95"
                >
                  <Camera className="w-4 h-4" /> Snap & Keep Scanning
                </button>
                <button
                  type="button"
                  onClick={() => capturePhotoFromStream(true)}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-5 py-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-semibold border border-slate-700 text-sm cursor-pointer transition-all"
                >
                  <Check className="w-4 h-4 text-emerald-400" /> Snap & Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL 1: 4-CORNER MANUAL ADJUSTMENT (CamScanner Style) ── */}
        {editingItem && (
          <CornerAdjustmentModal
            item={editingItem}
            onClose={() => setEditingCornersItemId(null)}
            onSave={async (updatedCorners) => {
              const newUrl = await generatePreviewBlobUrl(
                editingItem.originalCanvas,
                updatedCorners,
                editingItem.filter,
                editingItem.rotation,
                editingItem.deskew,
                editingItem.removeShadows,
                editingItem.sharpen
              );

              setScans((prev) =>
                prev.map((s) =>
                  s.id === editingItem.id
                    ? { ...s, corners: updatedCorners, previewUrl: newUrl }
                    : s
                )
              );
              setEditingCornersItemId(null);
              setReadyPdf(null);
            }}
          />
        )}

        {/* ── MODAL 2: BEFORE / AFTER PREVIEW (Zoom & Comparison) ── */}
        {previewItem && (
          <BeforeAfterComparisonModal
            item={previewItem}
            onClose={() => setPreviewItemId(null)}
          />
        )}

        <ToolSEOContent toolKey="/scan-pdf" />
      </div>
    </>
  );
};

/**
 * Interactive 4-Corner Manual Adjustment Modal
 * Allows dragging the 4 corners (TL, TR, BR, BL) with real-time loupe / magnifier
 */
const CornerAdjustmentModal: React.FC<{
  item: ScanItem;
  onClose: () => void;
  onSave: (corners: DocumentCorners) => void;
}> = ({ item, onClose, onSave }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [corners, setCorners] = useState<DocumentCorners>({ ...item.corners });
  const [activeCorner, setActiveCorner] = useState<keyof Omit<DocumentCorners, 'confidence'> | null>(null);
  const [imgDisplayBounds, setImgDisplayBounds] = useState<{
    width: number;
    height: number;
    left: number;
    top: number;
  }>({ width: 1, height: 1, left: 0, top: 0 });

  const originalCanvas = item.originalCanvas;
  const origW = originalCanvas.width;
  const origH = originalCanvas.height;

  // Recalculate rendered image dimensions inside the container
  const updateDisplayBounds = useCallback(() => {
    if (!containerRef.current) return;
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;

    const scale = Math.min(cw / origW, ch / origH);
    const rw = origW * scale;
    const rh = origH * scale;
    const rx = (cw - rw) / 2;
    const ry = (ch - rh) / 2;

    setImgDisplayBounds({ width: rw, height: rh, left: rx, top: ry });
  }, [origW, origH]);

  useEffect(() => {
    updateDisplayBounds();
    window.addEventListener('resize', updateDisplayBounds);
    return () => window.removeEventListener('resize', updateDisplayBounds);
  }, [updateDisplayBounds]);

  // Transform between canvas coordinates and display pixels
  const toDisplay = (p: Point): Point => {
    const scale = imgDisplayBounds.width / origW;
    return {
      x: imgDisplayBounds.left + p.x * scale,
      y: imgDisplayBounds.top + p.y * scale
    };
  };

  const toOriginal = (clientX: number, clientY: number): Point => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const xInContainer = clientX - rect.left;
    const yInContainer = clientY - rect.top;

    const scale = origW / imgDisplayBounds.width;
    const origX = (xInContainer - imgDisplayBounds.left) * scale;
    const origY = (yInContainer - imgDisplayBounds.top) * scale;

    return {
      x: Math.max(0, Math.min(origW, Math.round(origX))),
      y: Math.max(0, Math.min(origH, Math.round(origY)))
    };
  };

  const handlePointerDown = (cornerKey: keyof Omit<DocumentCorners, 'confidence'>) => {
    setActiveCorner(cornerKey);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeCorner) return;
    const newPt = toOriginal(e.clientX, e.clientY);
    setCorners((prev) => ({
      ...prev,
      [activeCorner]: newPt,
      confidence: 1.0 // user manually confirmed
    }));
  };

  const handlePointerUp = () => {
    setActiveCorner(null);
  };

  const handleAutoDetect = () => {
    const detected = findPhysicalDocumentQuad(originalCanvas);
    setCorners(detected);
  };

  const handleResetFull = () => {
    setCorners({
      topLeft: { x: 0, y: 0 },
      topRight: { x: origW, y: 0 },
      bottomRight: { x: origW, y: origH },
      bottomLeft: { x: 0, y: origH },
      confidence: 1.0
    });
  };

  const cTL = toDisplay(corners.topLeft);
  const cTR = toDisplay(corners.topRight);
  const cBR = toDisplay(corners.bottomRight);
  const cBL = toDisplay(corners.bottomLeft);

  const polygonPoints = `${cTL.x},${cTL.y} ${cTR.x},${cTR.y} ${cBR.x},${cBR.y} ${cBL.x},${cBL.y}`;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xs flex flex-col p-3 sm:p-6 select-none"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between text-white pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Crop className="w-5 h-5 text-orange-400" />
          <div>
            <h3 className="text-sm sm:text-base font-bold">Adjust Document Boundaries</h3>
            <p className="text-[11px] text-slate-400">
              Drag the 4 corner pins to match the paper document edges
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAutoDetect}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-orange-400" /> Auto Detect
          </button>
          <button
            type="button"
            onClick={handleResetFull}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5 text-blue-400" /> Full Page
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Interactive Canvas Area */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden flex items-center justify-center my-3 touch-none"
      >
        {/* Render Original Image as Base */}
        <canvas
          ref={(node) => {
            if (node && originalCanvas) {
              node.width = origW;
              node.height = origH;
              const ctx = node.getContext('2d')!;
              ctx.drawImage(originalCanvas, 0, 0);
            }
          }}
          style={{
            width: `${imgDisplayBounds.width}px`,
            height: `${imgDisplayBounds.height}px`,
            position: 'absolute',
            left: `${imgDisplayBounds.left}px`,
            top: `${imgDisplayBounds.top}px`
          }}
          className="shadow-2xl rounded"
        />

        {/* SVG Overlay for Polygons & Lines */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ width: '100%', height: '100%' }}
        >
          {/* Shaded Document Quad */}
          <polygon
            points={polygonPoints}
            fill="rgba(249, 115, 22, 0.18)"
            stroke="#f97316"
            strokeWidth="2.5"
            strokeDasharray="5 3"
          />
        </svg>

        {/* 4 Draggable Corner Handles */}
        {[
          { key: 'topLeft', pt: cTL, label: 'TL' },
          { key: 'topRight', pt: cTR, label: 'TR' },
          { key: 'bottomRight', pt: cBR, label: 'BR' },
          { key: 'bottomLeft', pt: cBL, label: 'BL' }
        ].map((h) => (
          <div
            key={h.key}
            onPointerDown={() =>
              handlePointerDown(h.key as keyof Omit<DocumentCorners, 'confidence'>)
            }
            style={{
              position: 'absolute',
              left: `${h.pt.x}px`,
              top: `${h.pt.y}px`,
              transform: 'translate(-50%, -50%)'
            }}
            className={`w-9 h-9 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing z-20 transition-transform ${
              activeCorner === h.key
                ? 'scale-125 ring-4 ring-orange-400 bg-white'
                : 'hover:scale-110 bg-orange-500 text-white'
            } shadow-lg border-2 border-white`}
          >
            <div className="w-3 h-3 rounded-full bg-orange-600"></div>
          </div>
        ))}

        {/* Magnifier / Loupe when dragging a corner */}
        {activeCorner && (
          <div className="absolute top-4 left-4 bg-black/90 p-2 rounded-2xl border border-orange-500/80 shadow-2xl flex flex-col items-center gap-1 z-30 pointer-events-none">
            <span className="text-[10px] uppercase font-bold text-orange-400 tracking-wider">
              {activeCorner} Magnifier
            </span>
            <div className="w-32 h-32 rounded-xl overflow-hidden border border-white/30 relative">
              <canvas
                ref={(node) => {
                  if (node && originalCanvas) {
                    node.width = 128;
                    node.height = 128;
                    const ctx = node.getContext('2d')!;
                    const pt = corners[activeCorner];
                    const cropSize = 80;
                    ctx.drawImage(
                      originalCanvas,
                      pt.x - cropSize / 2,
                      pt.y - cropSize / 2,
                      cropSize,
                      cropSize,
                      0,
                      0,
                      128,
                      128
                    );
                    // Crosshair in center
                    ctx.strokeStyle = '#f97316';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(64, 40);
                    ctx.lineTo(64, 88);
                    ctx.moveTo(40, 64);
                    ctx.lineTo(88, 64);
                    ctx.stroke();
                  }
                }}
                className="w-full h-full"
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-800">
        <span className="text-xs text-slate-400">
          Tip: Grab pins to un-tilt any photographed paper
        </span>
        <div className="flex items-center gap-2.5">
          <Button variant="secondary" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            className="bg-orange-600 hover:bg-orange-700 font-bold"
            onClick={() => onSave(corners)}
          >
            <Check className="w-4 h-4 mr-1.5" /> Apply Crop & Flatten
          </Button>
        </div>
      </div>
    </div>
  );
};

/**
 * Before / After Comparison Modal with Zoom & Pan
 * Shows that content, text, photos, and lines are visually preserved and enhanced.
 */
const BeforeAfterComparisonModal: React.FC<{
  item: ScanItem;
  onClose: () => void;
}> = ({ item, onClose }) => {
  const [viewMode, setViewMode] = useState<'split' | 'enhanced' | 'original'>('split');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [sliderPos, setSliderPos] = useState<number>(50); // percentage

  const origCanvas = item.originalCanvas;
  const origDataUrl = origCanvas.toDataURL('image/jpeg', 0.85);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xs flex flex-col p-3 sm:p-6 select-none">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between text-white pb-3 border-b border-slate-800 gap-2">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-blue-400" />
          <div>
            <h3 className="text-sm sm:text-base font-bold">
              Before vs After Comparison — {item.name}
            </h3>
            <p className="text-[11px] text-slate-400">
              Verify 100% visual fidelity: photos, text, tables, and borders are preserved
            </p>
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1.5 bg-slate-800/90 p-1 rounded-xl text-xs">
          <button
            type="button"
            onClick={() => setViewMode('split')}
            className={`px-3 py-1 rounded-lg font-bold cursor-pointer transition-colors ${
              viewMode === 'split' ? 'bg-orange-600 text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            Split Slider
          </button>
          <button
            type="button"
            onClick={() => setViewMode('enhanced')}
            className={`px-3 py-1 rounded-lg font-bold cursor-pointer transition-colors ${
              viewMode === 'enhanced'
                ? 'bg-orange-600 text-white'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Enhanced Scan
          </button>
          <button
            type="button"
            onClick={() => setViewMode('original')}
            className={`px-3 py-1 rounded-lg font-bold cursor-pointer transition-colors ${
              viewMode === 'original'
                ? 'bg-orange-600 text-white'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Original
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.25))}
            className="p-1.5 bg-slate-800 text-slate-300 hover:text-white rounded-lg cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-slate-300 w-12 text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.min(3.0, z + 0.25))}
            className="p-1.5 bg-slate-800 text-slate-300 hover:text-white rounded-lg cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoomLevel(1)}
            className="px-2 py-1 bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs cursor-pointer font-bold"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Comparison Body */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4 relative">
        <div
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
          className="transition-transform duration-150 flex items-center justify-center max-w-full max-h-full"
        >
          {viewMode === 'split' ? (
            <div className="relative select-none shadow-2xl rounded-xl overflow-hidden border border-slate-700 max-h-[75vh]">
              {/* Background: Processed Enhanced Image */}
              <img
                src={item.previewUrl}
                alt="Enhanced Scan"
                className="max-h-[75vh] w-auto object-contain block"
              />

              {/* Foreground: Original Image with Clip Path */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
              >
                <img
                  src={origDataUrl}
                  alt="Original"
                  className="max-h-[75vh] w-auto object-contain block"
                />
              </div>

              {/* Draggable Divider Line */}
              <div
                style={{ left: `${sliderPos}%` }}
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-xl pointer-events-none z-10"
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center shadow-lg border-2 border-white text-[10px] font-bold">
                  ↔
                </div>
              </div>

              {/* Interactive Range Slider Overlay */}
              <input
                type="range"
                min="0"
                max="100"
                value={sliderPos}
                onChange={(e) => setSliderPos(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
              />

              {/* Labels */}
              <span className="absolute top-3 left-3 bg-black/75 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-md z-10 border border-white/20">
                Original Upload
              </span>
              <span className="absolute top-3 right-3 bg-emerald-600/85 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-md z-10 border border-white/20">
                CamScanner Enhanced
              </span>
            </div>
          ) : viewMode === 'enhanced' ? (
            <div className="relative select-none shadow-2xl rounded-xl overflow-hidden border border-slate-700 max-h-[75vh]">
              <img
                src={item.previewUrl}
                alt="Enhanced Scan"
                className="max-h-[75vh] w-auto object-contain rounded"
              />
              <span className="absolute top-3 right-3 bg-emerald-600/85 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-md border border-white/20">
                CamScanner Enhanced Scan
              </span>
            </div>
          ) : (
            <div className="relative select-none shadow-2xl rounded-xl overflow-hidden border border-slate-700 max-h-[75vh]">
              <img
                src={origDataUrl}
                alt="Original"
                className="max-h-[75vh] w-auto object-contain rounded"
              />
              <span className="absolute top-3 left-3 bg-black/75 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-md border border-white/20">
                Original Input
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs text-slate-400">
        <span>Slide horizontally to inspect contrast, paper whitening, and photo sharpness</span>
        <Button variant="secondary" size="md" onClick={onClose}>
          Close Preview
        </Button>
      </div>
    </div>
  );
};

export default ScanPdf;
