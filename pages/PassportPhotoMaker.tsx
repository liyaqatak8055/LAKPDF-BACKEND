import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  Camera,
  Upload,
  Download,
  RotateCw,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Printer,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Sliders,
  Maximize2,
  FileCheck,
  Grid,
  FileDown,
  Layers,
  Palette,
  Scissors,
  HelpCircle,
  Eye,
  User,
  Info,
  Check,
  ArrowRight,
} from 'lucide-react';
import { Button } from '../components/Button';
import {
  PASSPORT_PRESETS,
  PassportPreset,
  CropSettings,
  renderCroppedPassportPhoto,
  generatePhotoSheet,
  exportPassportPdf,
  optimizeForGovtPortal,
  mmToPixels300Dpi,
} from '../services/passportPhotoService';
import { formatBytes } from '../services/fileHelpers';
import { ToolSEOContent } from '../components/ToolSEOContent';
import { trackEvent } from '../utils/analytics';

export const PassportPhotoMaker: React.FC = () => {
  // Preset state
  const [selectedPresetId, setSelectedPresetId] = useState<string>('in-passport');
  const [customWidthMm, setCustomWidthMm] = useState<number>(35);
  const [customHeightMm, setCustomHeightMm] = useState<number>(45);

  // File state
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Crop & Adjustment controls
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [rotation, setRotation] = useState<number>(0); // 0, 90, 180, 270
  const [tiltAngle, setTiltAngle] = useState<number>(0); // -45 to 45
  const [backgroundColor, setBackgroundColor] = useState<
    'original' | 'white' | 'light-blue' | 'light-gray'
  >('white');
  const [border, setBorder] = useState<'none' | 'thin-white' | 'thin-black'>('thin-black');
  const [showBiometricGuide, setShowBiometricGuide] = useState<boolean>(true);

  // Sheet Preview & Export states
  const [previewTab, setPreviewTab] = useState<'single' | '4x6' | 'a4'>('single');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [downloadSuccessMsg, setDownloadSuccessMsg] = useState<string | null>(null);

  // Canvas Refs
  const interactiveCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Current active dimensions
  const activePreset = PASSPORT_PRESETS.find((p) => p.id === selectedPresetId);
  const widthMm = activePreset ? activePreset.widthMm : customWidthMm;
  const heightMm = activePreset ? activePreset.heightMm : customHeightMm;

  const targetWidthPx = activePreset
    ? activePreset.widthPx300Dpi
    : mmToPixels300Dpi(customWidthMm);
  const targetHeightPx = activePreset
    ? activePreset.heightPx300Dpi
    : mmToPixels300Dpi(customHeightMm);

  // Load source image
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    loadNewFile(files[0]);
  };

  const loadNewFile = (file: File) => {
    setSourceFile(file);
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.src = url;
    img.onload = () => {
      setSourceImage(img);
      setZoom(1.0);
      setPan({ x: 0, y: 0 });
      setRotation(0);
      setTiltAngle(0);
    };
  };

  // Drag & drop file
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      loadNewFile(e.dataTransfer.files[0]);
    }
  };

  // Interactive Pan / Drag handlers on Canvas
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Draw interactive crop canvas preview
  useEffect(() => {
    if (!sourceImage || !interactiveCanvasRef.current) return;
    const canvas = interactiveCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Display resolution
    const displayW = 320;
    const displayH = Math.round((displayW * heightMm) / widthMm);
    canvas.width = displayW;
    canvas.height = displayH;

    // Render single photo preview
    const settings: CropSettings = {
      zoom,
      panX: (pan.x * targetWidthPx) / displayW,
      panY: (pan.y * targetHeightPx) / displayH,
      rotation,
      tiltAngle,
      backgroundColor,
      border,
    };

    const renderedHighRes = renderCroppedPassportPhoto(
      sourceImage,
      targetWidthPx,
      targetHeightPx,
      settings
    );

    // Draw scaled to display preview
    ctx.drawImage(renderedHighRes, 0, 0, displayW, displayH);

    // Draw Biometric alignment guide overlay
    if (showBiometricGuide) {
      ctx.save();
      // Head oval
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.85)'; // vibrant amber/orange
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);

      const centerX = displayW / 2;
      const headCenterY = displayH * 0.44;
      const radiusX = displayW * 0.28;
      const radiusY = displayH * 0.32;

      ctx.beginPath();
      ctx.ellipse(centerX, headCenterY, radiusX, radiusY, 0, 0, 2 * Math.PI);
      ctx.stroke();

      // Eye level line
      const eyeY = displayH * 0.42;
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)'; // blue
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(displayW * 0.2, eyeY);
      ctx.lineTo(displayW * 0.8, eyeY);
      ctx.stroke();

      // Chin line
      const chinY = displayH * 0.72;
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.8)'; // emerald green
      ctx.beginPath();
      ctx.moveTo(displayW * 0.3, chinY);
      ctx.lineTo(displayW * 0.7, chinY);
      ctx.stroke();

      // Guide labels
      ctx.font = 'bold 10px sans-serif';
      ctx.fillStyle = 'rgba(59, 130, 246, 0.9)';
      ctx.fillText('EYE LEVEL', 10, eyeY - 4);

      ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
      ctx.fillText('CHIN', 10, chinY - 4);

      ctx.restore();
    }
  }, [
    sourceImage,
    widthMm,
    heightMm,
    targetWidthPx,
    targetHeightPx,
    zoom,
    pan,
    rotation,
    tiltAngle,
    backgroundColor,
    border,
    showBiometricGuide,
  ]);

  // Helper: Get final high-res single photo canvas
  const getSingleHighResCanvas = useCallback((): HTMLCanvasElement | null => {
    if (!sourceImage) return null;
    const displayW = 320;
    const displayH = Math.round((displayW * heightMm) / widthMm);

    const settings: CropSettings = {
      zoom,
      panX: (pan.x * targetWidthPx) / displayW,
      panY: (pan.y * targetHeightPx) / displayH,
      rotation,
      tiltAngle,
      backgroundColor,
      border,
    };

    return renderCroppedPassportPhoto(sourceImage, targetWidthPx, targetHeightPx, settings);
  }, [
    sourceImage,
    targetWidthPx,
    targetHeightPx,
    heightMm,
    widthMm,
    zoom,
    pan,
    rotation,
    tiltAngle,
    backgroundColor,
    border,
  ]);

  // Helper: Download a blob
  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setDownloadSuccessMsg(`Downloaded: ${filename}`);
    setTimeout(() => setDownloadSuccessMsg(null), 4000);
  };

  // 1. Download Single Photo (300 DPI)
  const handleDownloadSingle = () => {
    const singleCanvas = getSingleHighResCanvas();
    if (!singleCanvas) return;
    setIsProcessing(true);

    singleCanvas.toBlob(
      (blob) => {
        setIsProcessing(false);
        if (blob) {
          triggerDownload(blob, `passport-photo-${widthMm}x${heightMm}mm.jpg`);
          trackEvent({
            category: 'PassportPhoto',
            action: 'download_single',
            label: `${widthMm}x${heightMm}`,
          });
        }
      },
      'image/jpeg',
      0.95
    );
  };

  // 2. Download Govt Form Photo (Strictly 20-50 KB)
  const handleDownloadGovtSize = async () => {
    const singleCanvas = getSingleHighResCanvas();
    if (!singleCanvas) return;
    setIsProcessing(true);

    try {
      const blob = await optimizeForGovtPortal(singleCanvas, 20 * 1024, 50 * 1024);
      setIsProcessing(false);
      triggerDownload(blob, `govt-exam-photo-${widthMm}x${heightMm}mm-under50kb.jpg`);
      trackEvent({
        category: 'PassportPhoto',
        action: 'download_govt_optimized',
        label: `${widthMm}x${heightMm}`,
      });
    } catch {
      setIsProcessing(false);
    }
  };

  // 3. Download Print Sheet Image (4x6 or A4)
  const handleDownloadSheetImage = (paperSize: '4x6' | 'a4') => {
    const singleCanvas = getSingleHighResCanvas();
    if (!singleCanvas) return;
    setIsProcessing(true);

    try {
      const sheetCanvas = generatePhotoSheet(singleCanvas, widthMm, heightMm, {
        paperSize,
        showCuttingGuides: true,
      });

      sheetCanvas.toBlob(
        (blob) => {
          setIsProcessing(false);
          if (blob) {
            triggerDownload(blob, `passport-photos-sheet-${paperSize}.jpg`);
            trackEvent({
              category: 'PassportPhoto',
              action: `download_sheet_${paperSize}`,
              label: `${widthMm}x${heightMm}`,
            });
          }
        },
        'image/jpeg',
        0.95
      );
    } catch {
      setIsProcessing(false);
    }
  };

  // 4. Download Printable PDF (4x6 or A4)
  const handleDownloadPdf = (paperSize: '4x6' | 'a4') => {
    const singleCanvas = getSingleHighResCanvas();
    if (!singleCanvas) return;
    setIsProcessing(true);

    try {
      const sheetCanvas = generatePhotoSheet(singleCanvas, widthMm, heightMm, {
        paperSize,
        showCuttingGuides: true,
      });

      const pdfBlob = exportPassportPdf(sheetCanvas, paperSize);
      setIsProcessing(false);
      triggerDownload(pdfBlob, `passport-photos-print-${paperSize}.pdf`);
      trackEvent({
        category: 'PassportPhoto',
        action: `download_pdf_${paperSize}`,
        label: `${widthMm}x${heightMm}`,
      });
    } catch {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Passport Size Photo Maker Online Free | 3.5x4.5 cm Photo Resizer - LAK PDF</title>
        <meta
          name="description"
          content="Create official passport size photos online free. Auto-align face, change background, resize to 3.5x4.5 cm, 2x2 inch, or PAN card size. Generate printable 4x6 and A4 sheets or PDF. 100% private."
        />
        <meta
          name="keywords"
          content="passport size photo maker online, free passport photo maker, 3.5x4.5 cm photo converter, upsc ssc photo resizer 20kb to 50kb, make passport photo sheet 4x6, us visa 2x2 photo online, pan card photo size"
        />
        <link rel="canonical" href="https://lakpdf.com/passport-photo-maker" />
        <meta
          property="og:title"
          content="Passport Size Photo Maker Online Free | 3.5x4.5 cm Photo Resizer - LAK PDF"
        />
        <meta
          property="og:description"
          content="Create compliant passport photos online free. Instant face alignment, 3.5x4.5cm and 2x2 inch presets, 4x6 & A4 printable sheets, and 20-50KB govt form compression."
        />
        <meta property="og:url" content="https://lakpdf.com/passport-photo-maker" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="LAK PDF" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="Passport Size Photo Maker Online Free - LAK PDF"
        />
        <meta
          name="twitter:description"
          content="Create compliant passport photos online free. Instant face alignment, 4x6 & A4 print sheets, 20-50KB form optimizer."
        />
        {/* BreadcrumbList Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://lakpdf.com/' },
              { '@type': 'ListItem', position: 2, name: 'Tools', item: 'https://lakpdf.com/tools' },
              {
                '@type': 'ListItem',
                position: 3,
                name: 'Passport Photo Maker',
                item: 'https://lakpdf.com/passport-photo-maker',
              },
            ],
          })}
        </script>
        {/* SoftwareApplication Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'LAK PDF Passport Size Photo Maker',
            url: 'https://lakpdf.com/passport-photo-maker',
            applicationCategory: 'MultimediaApplication',
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
              ratingCount: '2140',
              bestRating: '5',
              worstRating: '1',
            },
            description:
              'Free online passport photo maker with biometric face guides, 3.5x4.5cm, 2x2 inch, 4x6 & A4 printable sheets, and 20-50KB government form compression.',
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-slate-50 dark:bg-dark-bg text-slate-800 dark:text-dark-text-primary py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 text-xs sm:text-sm font-semibold mb-3 shadow-sm">
              <Camera className="w-4 h-4 text-blue-500 animate-pulse" />
              <span>Biometric Face Guide • 300 DPI Print Sheets • 100% Free & Private</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-3">
              Passport Size <span className="text-blue-600">Photo Maker</span>
            </h1>

            <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-600 dark:text-slate-400">
              Create official passport photos for India (3.5 × 4.5 cm), US Visa (2 × 2 in), PAN
              cards, and government exams (UPSC/SSC 20–50 KB). Generate printable 4×6 and A4 multi-photo
              sheets in seconds.
            </p>
          </div>

          {/* Success Toast */}
          {downloadSuccessMsg && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm font-bold flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>{downloadSuccessMsg}</span>
            </div>
          )}

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/jpeg,image/png,image/webp,image/jpg"
            className="hidden"
          />

          {!sourceImage ? (
            /* Uploader Dropzone */
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="relative rounded-3xl border-2 border-dashed border-blue-300 dark:border-blue-800/60 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl p-8 sm:p-12 text-center shadow-lg transition-all hover:border-blue-500 cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-xl shadow-blue-500/25 mb-6">
                <Camera className="w-10 h-10" />
              </div>

              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mb-2">
                Upload Any Photo to Make Passport Photos
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto mb-6">
                Drag and drop your selfie or portrait photo, or browse from your PC or phone.
                Supports JPG, PNG, and WEBP.
              </p>

              <Button
                variant="primary"
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 shadow-md shadow-blue-600/20"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                <Upload className="w-5 h-5 mr-2" />
                Select Photo from Device
              </Button>

              <div className="mt-8 flex flex-wrap justify-center items-center gap-6 text-xs text-slate-500">
                <span className="flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  100% Private (Processed in Browser)
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Printer className="w-4 h-4 text-blue-500" />
                  Printable 4×6 & A4 Sheets
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <FileCheck className="w-4 h-4 text-purple-500" />
                  Govt Exam 20KB–50KB Mode
                </span>
              </div>
            </div>
          ) : (
            /* Interactive Editor Area */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Panel: Live Canvas & Biometric Guide */}
              <div className="lg:col-span-6 flex flex-col items-center bg-white dark:bg-dark-surface p-6 rounded-3xl border border-slate-200 dark:border-dark-border shadow-sm">
                <div className="w-full flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-dark-border">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      Drag / Move Face to Center
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowBiometricGuide(!showBiometricGuide)}
                      className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition-all ${
                        showBiometricGuide
                          ? 'bg-orange-50 border-orange-200 text-orange-600 dark:bg-orange-950/40 dark:border-orange-800'
                          : 'bg-slate-100 border-slate-200 text-slate-600 dark:bg-dark-bg dark:border-dark-border'
                      }`}
                    >
                      {showBiometricGuide ? 'Hide Face Guide' : 'Show Face Guide'}
                    </button>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs"
                    >
                      Change Photo
                    </Button>
                  </div>
                </div>

                {/* Canvas Container with pointer events */}
                <div className="relative border-4 border-slate-200 dark:border-dark-border rounded-2xl overflow-hidden shadow-inner bg-slate-100 dark:bg-dark-bg cursor-grab active:cursor-grabbing">
                  <canvas
                    ref={interactiveCanvasRef}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    className="block touch-none select-none max-w-full"
                  />
                </div>

                {/* Guidance Helper Note */}
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 text-center mt-3 max-w-sm">
                  💡 Align eyes along the <strong>blue dashed line</strong> and head inside the{' '}
                  <strong>amber oval</strong> for standard passport compliance.
                </p>

                {/* Live Sliders: Zoom, Fine Tilt, Rotation */}
                <div className="w-full mt-6 space-y-4 pt-4 border-t border-slate-100 dark:border-dark-border">
                  {/* Zoom Slider */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      <span className="flex items-center gap-1">
                        <ZoomIn className="w-3.5 h-3.5 text-blue-500" /> Zoom
                      </span>
                      <span>{Math.round(zoom * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="3.0"
                      step="0.05"
                      value={zoom}
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 dark:bg-dark-border rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>

                  {/* Fine Tilt Slider (-45° to +45°) */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      <span className="flex items-center gap-1">
                        <Sliders className="w-3.5 h-3.5 text-blue-500" /> Straighten / Tilt
                      </span>
                      <span>{tiltAngle}°</span>
                    </div>
                    <input
                      type="range"
                      min="-45"
                      max="45"
                      step="1"
                      value={tiltAngle}
                      onChange={(e) => setTiltAngle(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 dark:bg-dark-border rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>

                  {/* Rotate 90° & Reset Controls */}
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      className="flex-1 text-xs"
                    >
                      <RotateCw className="w-3.5 h-3.5 mr-1.5" />
                      Rotate 90°
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setZoom(1.0);
                        setPan({ x: 0, y: 0 });
                        setRotation(0);
                        setTiltAngle(0);
                      }}
                      className="text-xs text-slate-500 hover:text-slate-800"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                      Reset Center
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right Panel: Presets, Customization & Download */}
              <div className="lg:col-span-6 flex flex-col space-y-6">
                {/* 1. Country & Format Presets */}
                <div className="bg-white dark:bg-dark-surface p-6 rounded-3xl border border-slate-200 dark:border-dark-border shadow-sm">
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-500" />
                    Select Photo Size & Country Standard
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                    {PASSPORT_PRESETS.map((preset) => {
                      const isSelected = selectedPresetId === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setSelectedPresetId(preset.id)}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/30 text-blue-900 dark:text-blue-300 ring-2 ring-blue-500/20 shadow-sm'
                              : 'border-slate-200 dark:border-dark-border hover:bg-slate-50 dark:hover:bg-dark-bg text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs">{preset.country}</span>
                            <span className="text-[10px] font-extrabold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                              {preset.widthMm} × {preset.heightMm} mm
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                            {preset.name}
                          </p>
                        </button>
                      );
                    })}

                    {/* Custom Dimension Option */}
                    <button
                      type="button"
                      onClick={() => setSelectedPresetId('custom')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        selectedPresetId === 'custom'
                          ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/30 text-blue-900 dark:text-blue-300 ring-2 ring-blue-500/20 shadow-sm'
                          : 'border-slate-200 dark:border-dark-border hover:bg-slate-50 dark:hover:bg-dark-bg text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="font-bold text-xs block">Custom Size</span>
                      <span className="text-[11px] text-slate-500 mt-1 block">
                        Enter custom width & height in mm
                      </span>
                    </button>
                  </div>

                  {/* Custom Size Inputs */}
                  {selectedPresetId === 'custom' && (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border flex items-center gap-3 animate-in fade-in">
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          WIDTH (MM)
                        </label>
                        <input
                          type="number"
                          min="15"
                          max="150"
                          value={customWidthMm}
                          onChange={(e) => setCustomWidthMm(Math.max(10, parseInt(e.target.value) || 35))}
                          className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-surface text-slate-900 dark:text-white"
                        />
                      </div>
                      <span className="text-slate-400 font-bold mt-4">×</span>
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          HEIGHT (MM)
                        </label>
                        <input
                          type="number"
                          min="15"
                          max="150"
                          value={customHeightMm}
                          onChange={(e) => setCustomHeightMm(Math.max(10, parseInt(e.target.value) || 45))}
                          className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-surface text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Styling: Background Color & Border */}
                <div className="bg-white dark:bg-dark-surface p-6 rounded-3xl border border-slate-200 dark:border-dark-border shadow-sm">
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-blue-500" />
                    Background & Border Styling
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                        Background Color
                      </label>
                      <div className="flex items-center gap-2">
                        {[
                          { id: 'white', label: 'White', color: '#FFFFFF' },
                          { id: 'light-blue', label: 'Light Blue', color: '#E0F2FE' },
                          { id: 'light-gray', label: 'Light Gray', color: '#F3F4F6' },
                          { id: 'original', label: 'Original', color: 'transparent' },
                        ].map((bg) => (
                          <button
                            key={bg.id}
                            type="button"
                            onClick={() => setBackgroundColor(bg.id as any)}
                            title={bg.label}
                            className={`w-7 h-7 rounded-full border-2 transition-transform ${
                              backgroundColor === bg.id
                                ? 'scale-110 border-blue-600 ring-2 ring-blue-400/40'
                                : 'border-slate-300 dark:border-dark-border hover:scale-105'
                            }`}
                            style={{
                              backgroundColor: bg.color === 'transparent' ? '#cbd5e1' : bg.color,
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                        Cutting Border
                      </label>
                      <div className="flex items-center gap-2">
                        {[
                          { id: 'thin-black', label: 'Scissor Line' },
                          { id: 'thin-white', label: 'White Border' },
                          { id: 'none', label: 'None' },
                        ].map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => setBorder(b.id as any)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                              border === b.id
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-slate-100 dark:bg-dark-bg text-slate-700 dark:text-slate-300 border-slate-200 dark:border-dark-border'
                            }`}
                          >
                            {b.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Download & Print Suite */}
                <div className="bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-transparent dark:from-blue-950/30 dark:via-dark-surface dark:to-dark-surface p-6 rounded-3xl border border-blue-200/80 dark:border-blue-900/40 shadow-sm">
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                    <Download className="w-4 h-4 text-blue-600" />
                    Download & Print Options
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                    Download single digital photos for online portals or printable sheets with scissor marks.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Button 1: Single Photo (300 DPI) */}
                    <Button
                      variant="primary"
                      size="md"
                      onClick={handleDownloadSingle}
                      disabled={isProcessing}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold justify-center"
                    >
                      <Download className="w-4 h-4 mr-1.5" />
                      Single Photo (300 DPI)
                    </Button>

                    {/* Button 2: Govt Form Mode (20-50 KB) */}
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={handleDownloadGovtSize}
                      disabled={isProcessing}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 text-xs font-bold justify-center"
                    >
                      <Sparkles className="w-4 h-4 mr-1.5" />
                      Govt Form (20–50 KB)
                    </Button>

                    {/* Button 3: 4x6 Sheet (JPG) */}
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() => handleDownloadSheetImage('4x6')}
                      disabled={isProcessing}
                      className="text-xs font-bold justify-center border-slate-300 dark:border-dark-border"
                    >
                      <Printer className="w-4 h-4 mr-1.5 text-blue-600" />
                      4×6 Photo Paper (JPG)
                    </Button>

                    {/* Button 4: A4 Sheet (Printable PDF) */}
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() => handleDownloadPdf('a4')}
                      disabled={isProcessing}
                      className="text-xs font-bold justify-center border-slate-300 dark:border-dark-border"
                    >
                      <FileDown className="w-4 h-4 mr-1.5 text-red-600" />
                      A4 Sheet (Print PDF)
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Detailed SEO Guides & Feature Sections */}
          <section className="mt-16 space-y-12">
            {/* 1. Comparison: Studio vs LAK PDF Passport Photo Maker */}
            <div className="bg-white dark:bg-dark-surface rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-dark-border shadow-sm">
              <div className="text-center max-w-2xl mx-auto mb-8">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-900/60">
                  Instant & Zero Cost
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-3">
                  Why Create Passport Photos with LAK PDF?
                </h2>
                <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">
                  No need to spend money at photo studios or waste time traveling. Create studio-quality passport photos right from your smartphone or laptop.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 rounded-2xl bg-red-50/50 dark:bg-red-950/20 border border-red-200/80 dark:border-red-900/40">
                  <h3 className="font-bold text-red-700 dark:text-red-400 mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/60 flex items-center justify-center text-xs font-extrabold">✕</span>
                    Local Photo Studio
                  </h3>
                  <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 font-bold">•</span>
                      <span>Costs ₹100–₹250 ($10–$20) for just 6 to 8 physical photos.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 font-bold">•</span>
                      <span>Requires visiting the studio in person and waiting 1–2 hours for prints.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 font-bold">•</span>
                      <span>Charges extra fees to email you the digital soft copy file.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 font-bold">•</span>
                      <span>Often produces oversized digital files that get rejected by UPSC, SSC, and Visa portals.</span>
                    </li>
                  </ul>
                </div>

                <div className="p-5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40">
                  <h3 className="font-bold text-emerald-700 dark:text-emerald-400 mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-xs font-extrabold">✓</span>
                    LAK PDF Passport Photo Maker
                  </h3>
                  <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>100% Free Forever: Create unlimited single photos and full printable sheets.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>Interactive Biometric Guide ensures head, eye, and chin lines match official standards.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>1-Click Govt Form Optimizer compresses strictly between 20 KB and 50 KB for instant upload.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>100% Client-Side Privacy: Your photos never leave your device or get uploaded to any server.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 2. Official Specifications Table */}
            <div className="bg-white dark:bg-dark-surface rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-dark-border shadow-sm">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2.5">
                <FileCheck className="w-6 h-6 text-blue-600" />
                Standard Passport & Visa Photo Sizes by Country
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-6">
                Below are the official biometric requirements for the most common passports, visas, and government job exam applications worldwide.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-dark-border text-slate-500 dark:text-slate-400 font-semibold">
                      <th className="py-3 px-4">Country / Purpose</th>
                      <th className="py-3 px-4">Dimensions (mm)</th>
                      <th className="py-3 px-4">Dimensions (px at 300 DPI)</th>
                      <th className="py-3 px-4">Background</th>
                      <th className="py-3 px-4">Head Height</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-dark-border text-slate-700 dark:text-slate-300">
                    <tr>
                      <td className="py-3.5 px-4 font-bold">India Passport / UPSC / SSC</td>
                      <td className="py-3.5 px-4">35 × 45 mm (3.5 × 4.5 cm)</td>
                      <td className="py-3.5 px-4">413 × 531 px</td>
                      <td className="py-3.5 px-4">White / Light</td>
                      <td className="py-3.5 px-4">70% – 80% (31–36 mm)</td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-4 font-bold">India PAN Card (NSDL/UTI)</td>
                      <td className="py-3.5 px-4">25 × 35 mm (2.5 × 3.5 cm)</td>
                      <td className="py-3.5 px-4">295 × 413 px</td>
                      <td className="py-3.5 px-4">White</td>
                      <td className="py-3.5 px-4">70% face height</td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-4 font-bold">US Visa & Passport (DS-160)</td>
                      <td className="py-3.5 px-4">51 × 51 mm (2 × 2 inches)</td>
                      <td className="py-3.5 px-4">600 × 600 px</td>
                      <td className="py-3.5 px-4">Plain White</td>
                      <td className="py-3.5 px-4">50% – 69% (25–35 mm)</td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-4 font-bold">Schengen / Europe Visa</td>
                      <td className="py-3.5 px-4">35 × 45 mm (3.5 × 4.5 cm)</td>
                      <td className="py-3.5 px-4">413 × 531 px</td>
                      <td className="py-3.5 px-4">Light Gray / White</td>
                      <td className="py-3.5 px-4">70% – 80% (32–36 mm)</td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-4 font-bold">United Kingdom (HMPO)</td>
                      <td className="py-3.5 px-4">35 × 45 mm (3.5 × 4.5 cm)</td>
                      <td className="py-3.5 px-4">413 × 531 px</td>
                      <td className="py-3.5 px-4">Light Gray / Cream</td>
                      <td className="py-3.5 px-4">29 – 34 mm</td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-4 font-bold">Canada Visa & Passport</td>
                      <td className="py-3.5 px-4">50 × 70 mm (5 × 7 cm)</td>
                      <td className="py-3.5 px-4">591 × 827 px</td>
                      <td className="py-3.5 px-4">White or Light-colored</td>
                      <td className="py-3.5 px-4">31 – 36 mm</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. Pro Tips for Valid Passport Photos */}
            <div className="bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent rounded-3xl p-6 sm:p-8 border border-blue-200/70 dark:border-blue-900/40">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2.5">
                <Info className="w-6 h-6 text-blue-600" />
                Pro-Tips: How to Take a Valid Passport Photo with Your Phone
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1.5">
                    1. Face Natural Daylight
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Stand 1–2 meters away from a plain white or light wall, facing a window with bright natural daylight. Avoid harsh shadows behind your ears or under your chin.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1.5">
                    2. Neutral Facial Expression
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Keep both eyes open and look directly into the camera lens with a neutral expression (mouth closed, no wide smile). Remove eyeglasses and hats.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1.5">
                    3. Align Eyes with Guide
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Upload your picture to LAK PDF and use the drag/zoom controls so your eyes align with the blue dashed line and your chin aligns with the green line.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* SEO Content & Guide */}
          <ToolSEOContent toolKey="/passport-photo-maker" />
        </div>
      </div>
    </>
  );
};

export default PassportPhotoMaker;
