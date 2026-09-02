import React, { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from '../components/Button';
import { imagesToPdfScan, downloadPdf } from '../services/pdfService';
import { Camera, Trash2, Download, RotateCw, ArrowUp, ArrowDown, ImagePlus, CheckCircle, ArrowRight, X, Sparkles, FileText, Check, Layers, Maximize2, ShieldCheck } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { NextStepPanel, RelatedActions } from '../components/ToolProductPanels';
import { ToolSEOContent } from '../components/ToolSEOContent';

type FilterMode = 'original' | 'magic' | 'bw' | 'grayscale';

interface ScanItem {
  id: string;
  file: File;
  name: string;
  size: number;
  previewUrl: string;
  rotation: number; // 0, 90, 180, 270
  filter: FilterMode;
}

export const ScanPdf: React.FC = () => {
  const [scans, setScans] = useState<ScanItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [docName, setDocName] = useState('scanned-document');
  const [pageSize, setPageSize] = useState<'a4' | 'auto'>('a4');
  const [margin, setMargin] = useState<'none' | 'small'>('none');
  const [globalFilter, setGlobalFilter] = useState<FilterMode>('magic');
  const [readyPdf, setReadyPdf] = useState<{ bytes: Uint8Array; name: string } | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  
  // Camera Modal State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

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

  const [lastSnapToast, setLastSnapToast] = useState<string | null>(null);

  const capturePhotoFromStream = (closeModal: boolean = false) => {
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

    canvas.toBlob((blob) => {
      if (!blob) return;
      const nextPageIndex = scans.length + 1;
      const file = new File([blob], `scan_page_${nextPageIndex}.jpg`, { type: 'image/jpeg' });
      addImages([file]);
      setLastSnapToast(`Page ${nextPageIndex} Snapped!`);
      setTimeout(() => setLastSnapToast(null), 1600);

      if (closeModal) {
        setIsCameraOpen(false);
        stopCamera();
      }
    }, 'image/jpeg', 0.95);
  };

  const addImages = (files: File[]) => {
    const valid = files.filter((f) => f.type.startsWith('image/'));
    if (valid.length === 0) return;

    const newItems: ScanItem[] = valid.map((file, idx) => ({
      id: uuidv4(),
      file,
      name: `Page ${scans.length + idx + 1}`,
      size: file.size,
      previewUrl: URL.createObjectURL(file),
      rotation: 0,
      filter: globalFilter
    }));

    setScans((prev) => [...prev, ...newItems]);
    setReadyPdf(null);
    setStatusMessage('');
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addImages(Array.from(e.target.files));
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

  const rotateScan = (id: string) => {
    setScans((prev) =>
      prev.map((s) => (s.id === id ? { ...s, rotation: (s.rotation + 90) % 360 } : s))
    );
    setReadyPdf(null);
  };

  const updateScanFilter = (id: string, filter: FilterMode) => {
    setScans((prev) =>
      prev.map((s) => (s.id === id ? { ...s, filter } : s))
    );
    setReadyPdf(null);
  };

  const applyGlobalFilter = (filter: FilterMode) => {
    setGlobalFilter(filter);
    setScans((prev) => prev.map((s) => ({ ...s, filter })));
    setReadyPdf(null);
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

  // Process image filters on a canvas before PDF generation
  const processImageWithFilter = async (item: ScanItem): Promise<File> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const isRotated90or270 = item.rotation === 90 || item.rotation === 270;
        const canvas = document.createElement('canvas');
        canvas.width = isRotated90or270 ? img.height : img.width;
        canvas.height = isRotated90or270 ? img.width : img.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(item.file);
          return;
        }

        // Apply rotation transform
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((item.rotation * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        ctx.restore();

        const width = canvas.width;
        const height = canvas.height;

        // Apply CamScanner-Grade Document Scanner Filters
        if (item.filter !== 'original') {
          const imgData = ctx.getImageData(0, 0, width, height);
          const d = imgData.data;
          const len = d.length;

          if (item.filter === 'bw') {
            // Adaptive Document Binarization (Pure Black/White Scanner)
            const gray = new Uint8Array(width * height);
            for (let i = 0, p = 0; i < len; i += 4, p++) {
              gray[p] = (d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8;
            }

            const integral = new Uint32Array(width * height);
            for (let y = 0; y < height; y++) {
              let sum = 0;
              for (let x = 0; x < width; x++) {
                sum += gray[y * width + x];
                integral[y * width + x] = (y === 0 ? 0 : integral[(y - 1) * width + x]) + sum;
              }
            }

            const s = Math.max(8, Math.floor(Math.min(width, height) / 16));
            const t = 12;

            for (let y = 0; y < height; y++) {
              const y1 = Math.max(0, y - s);
              const y2 = Math.min(height - 1, y + s);
              const countY = y2 - y1;

              for (let x = 0; x < width; x++) {
                const x1 = Math.max(0, x - s);
                const x2 = Math.min(width - 1, x + s);
                const count = countY * (x2 - x1);

                const sum =
                  integral[y2 * width + x2] -
                  integral[y1 * width + x2] -
                  integral[y2 * width + x1] +
                  integral[y1 * width + x1];

                const idx = (y * width + x) * 4;
                const val = gray[y * width + x] * count <= (sum * (100 - t)) / 100 ? 0 : 255;
                d[idx] = val;
                d[idx + 1] = val;
                d[idx + 2] = val;
              }
            }
          } else if (item.filter === 'magic') {
            // CamScanner Magic Color: Background paper whitening + enhanced dark ink
            for (let i = 0; i < len; i += 4) {
              let r = d[i];
              let g = d[i + 1];
              let b = d[i + 2];
              const lum = 0.299 * r + 0.587 * g + 0.114 * b;

              if (lum > 160) {
                const boost = ((lum - 160) / 95) * 85;
                r = Math.min(255, r + boost);
                g = Math.min(255, g + boost);
                b = Math.min(255, b + boost);
              } else {
                r = Math.max(0, r * 0.85);
                g = Math.max(0, g * 0.85);
                b = Math.max(0, b * 0.85);
              }

              r = Math.min(255, Math.max(0, (r - 128) * 1.3 + 128));
              g = Math.min(255, Math.max(0, (g - 128) * 1.3 + 128));
              b = Math.min(255, Math.max(0, (b - 128) * 1.3 + 128));

              d[i] = r;
              d[i + 1] = g;
              d[i + 2] = b;
            }
          } else if (item.filter === 'grayscale') {
            for (let i = 0; i < len; i += 4) {
              let gray = (d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8;
              gray = Math.min(255, Math.max(0, (gray - 128) * 1.25 + 128));
              d[i] = gray;
              d[i + 1] = gray;
              d[i + 2] = gray;
            }
          }

          ctx.putImageData(imgData, 0, 0);
        }

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], `${item.name}.jpg`, { type: 'image/jpeg' }));
          } else {
            resolve(item.file);
          }
        }, 'image/jpeg', 0.95);
      };
      img.onerror = () => resolve(item.file);
      img.src = item.previewUrl;
    });
  };

  const handleGeneratePdf = async () => {
    if (scans.length === 0) return;
    setIsProcessing(true);
    setStatusMessage('Applying scanner filters and generating PDF...');
    try {
      // 1. Filter and process each scanned page
      const processedFiles: File[] = [];
      for (const scan of scans) {
        const file = await processImageWithFilter(scan);
        processedFiles.push(file);
      }

      // 2. Build PDF with chosen Page Size & Margin
      const pdfBytes = await imagesToPdfScan(processedFiles, {
        format: pageSize,
        margin: margin,
        quality: 0.92
      });

      const cleanDocName = docName.trim() ? docName.trim().replace(/\.pdf$/i, '') : 'scanned-document';
      const fileName = `${cleanDocName}.pdf`;
      
      setReadyPdf({ bytes: pdfBytes, name: fileName });
      downloadPdf(pdfBytes, fileName, { autoDownload: true });
      setStatusMessage('Scanned PDF generated & downloaded automatically!');
    } catch (err) {
      console.error(err);
      setStatusMessage('Failed to create scanned PDF. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadReady = () => {
    if (!readyPdf) return;
    downloadPdf(readyPdf.bytes, readyPdf.name, { autoDownload: true });
  };

  const filterLabels: Record<FilterMode, string> = {
    magic: 'Magic Color',
    bw: 'B&W Scanner',
    grayscale: 'Grayscale',
    original: 'Original'
  };

  return (
    <>
      <Helmet>
        <title>Scan to PDF Online Free | Document Scanner - LAK PDF</title>
        <meta name="description" content="Scan documents to PDF online free with camera or photos. Automatic contrast enhancement, B&W filters, and A4 page layout." />
        <link rel="canonical" href="https://lakpdf.com/scan-pdf" />
        <meta property="og:title" content="Scan to PDF Online Free | Document Scanner - LAK PDF" />
        <meta property="og:description" content="Scan documents to PDF online free with camera or photos." />
        <meta property="og:url" content="https://lakpdf.com/scan-pdf" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://lakpdf.com/og-image.png" />
      </Helmet>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept="image/*"
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
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-2.5">
            Scan to PDF
          </h1>
          <p className="text-sm sm:text-base text-slate-500 max-w-2xl mx-auto">
            Capture document photos or upload images to create a clean, high-contrast scanned PDF document.
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
                Use your mobile or laptop camera to scan physical paper documents page by page.
              </p>
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-sm group-hover:bg-blue-700">
                <Camera className="w-3.5 h-3.5" /> Start Camera Scan
              </span>
            </div>

            {/* Photo / Image Upload Card */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="group relative flex flex-col items-center justify-center p-8 bg-gradient-to-b from-slate-50/60 to-white rounded-3xl border-2 border-dashed border-slate-300 hover:border-[#e5323f] hover:shadow-xl hover:shadow-red-500/10 transition-all cursor-pointer text-center"
            >
              <div className="w-16 h-16 bg-[#e5323f] text-white rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-red-500/30 group-hover:scale-110 transition-transform">
                <ImagePlus className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Upload Document Photos</h3>
              <p className="text-xs text-slate-500 max-w-xs mb-4">
                Select one or multiple photos (JPG, PNG, WEBP) from your gallery or computer.
              </p>
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-sm group-hover:bg-slate-800">
                <ImagePlus className="w-3.5 h-3.5" /> Select Images
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
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" /> + Scan Next Page
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    <ImagePlus className="w-3.5 h-3.5" /> + Add Images
                  </button>
                </div>
              </div>

              {/* Global Filter Bar */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1.5 shrink-0">
                  <Sparkles className="w-4 h-4 text-orange-500" /> Scanner Filter:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'magic', label: '🪄 Magic Color' },
                    { id: 'bw', label: '📄 B&W Doc' },
                    { id: 'grayscale', label: '🔘 Grayscale' },
                    { id: 'original', label: '🌈 Original' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => applyGlobalFilter(f.id as FilterMode)}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                        globalFilter === f.id
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {f.label}
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
                      <span className="px-2.5 py-0.5 rounded-lg bg-slate-900 text-white text-[11px] font-bold">
                        Page {index + 1}
                      </span>
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
                    <div className="w-full flex items-center justify-center p-2.5 bg-slate-50 rounded-xl mb-2.5 border border-slate-100">
                      <div
                        className={`relative w-full ${
                          pageSize === 'a4' ? 'aspect-[210/297] max-w-[260px]' : 'aspect-[4/3] max-w-[260px]'
                        } bg-white border ${
                          margin === 'none' ? 'border-slate-200' : 'border-dashed border-orange-300'
                        } rounded-lg shadow-sm overflow-hidden flex items-center justify-center transition-all duration-200 ${
                          margin === 'none' ? 'p-0' : 'p-2.5'
                        }`}
                      >
                        <div className="w-full h-full flex items-center justify-center overflow-hidden bg-slate-100/50">
                          <img
                            src={scan.previewUrl}
                            alt={scan.name}
                            style={{
                              transform: `rotate(${scan.rotation}deg)`,
                              filter:
                                scan.filter === 'bw'
                                  ? 'grayscale(100%) contrast(200%) brightness(110%)'
                                  : scan.filter === 'grayscale'
                                  ? 'grayscale(100%)'
                                  : scan.filter === 'magic'
                                  ? 'contrast(130%) brightness(105%) saturate(110%)'
                                  : 'none'
                            }}
                            className={`max-h-full max-w-full ${
                              margin === 'none' && pageSize === 'a4' ? 'w-full h-full object-cover' : 'object-contain'
                            } rounded transition-all duration-200`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Per-Card Filter Picker */}
                    <div className="flex items-center justify-between gap-1 pt-2 border-t border-slate-100 text-[10px]">
                      <span className="text-slate-400 font-semibold">Filter:</span>
                      <div className="flex flex-wrap gap-1">
                        {(['magic', 'bw', 'grayscale', 'original'] as FilterMode[]).map((f) => (
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
                            {f === 'bw' ? 'B&W' : f}
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
                  <span className="text-xs text-slate-400 font-normal">{scans.length} Page{scans.length > 1 ? 's' : ''}</span>
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
                      <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-semibold">.pdf</span>
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

                  {/* Summary Box */}
                  <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 space-y-1.5 border border-slate-100">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Scans:</span>
                      <span className="font-bold text-slate-800">{scans.length} Page{scans.length > 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Filter Applied:</span>
                      <span className="font-bold text-orange-600">{filterLabels[globalFilter]}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Target Size:</span>
                      <span className="font-bold text-slate-800">{pageSize === 'a4' ? 'A4 (210×297mm)' : 'Original Image Ratio'}</span>
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
                          <span>Generating Scanned PDF...</span>
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
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-2.5">
                        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-slate-900">Scanned PDF Ready & Downloaded!</p>
                          <p className="text-[10px] text-slate-500 truncate max-w-[200px]">{readyPdf.name}</p>
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

                  {statusMessage && !isProcessing && (
                    <p className="text-xs text-center font-medium text-emerald-600">
                      {statusMessage}
                    </p>
                  )}
                </div>
              </div>

              <NextStepPanel
                title="How it works"
                steps={[
                  'Capture or upload paper document pages.',
                  'Choose Magic Color or B&W Scanner filter.',
                  'Download your clean multi-page scanned PDF.',
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
                    <p className="text-[11px] text-slate-400">Position paper inside the frame & snap</p>
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
                <div className="absolute inset-6 border-2 border-dashed border-white/40 rounded-xl pointer-events-none flex items-center justify-center">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-white/40 bg-black/40 px-2 py-1 rounded">
                    Document Frame
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

        <ToolSEOContent toolKey="/scan-pdf" />
      </div>
    </>
  );
};
export default ScanPdf;
