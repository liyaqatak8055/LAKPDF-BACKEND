import React, { useEffect, useState, useRef, useCallback } from 'react';
import { FileUploader } from '../components/FileUploader';
import { Button } from '../components/Button';
import { compressImagesToTarget, CompressedImage } from '../services/imageService';
import { formatBytes, downloadFile } from '../services/fileHelpers';
import { 
  Download, 
  RefreshCw, 
  ArrowRight, 
  CheckCircle, 
  Sliders, 
  Eye, 
  X, 
  ZoomIn, 
  ZoomOut, 
  Sparkles, 
  ShieldCheck,
  Columns,
  SplitSquareVertical,
  Check,
  Sparkle
} from 'lucide-react';
import JSZip from 'jszip';
import { Helmet } from 'react-helmet-async';
import { ToolSEOContent } from '../components/ToolSEOContent';

type PortalPreset = 'auto' | 'passport' | 'signature' | 'square';
type CompareViewMode = 'split' | 'side-by-side';

interface CompareModalData {
  file: File;
  compressed: CompressedImage;
  originalUrl: string;
  compressedUrl: string;
}

export const AdvanceCompressImage: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [results, setResults] = useState<CompressedImage[]>([]);
  const [targetKB, setTargetKB] = useState<number>(50);
  const [targetFormat, setTargetFormat] = useState<'image/jpeg' | 'image/webp'>('image/jpeg');
  const [portalPreset, setPortalPreset] = useState<PortalPreset>('auto');
  const [enableEdgeClarity, setEnableEdgeClarity] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Comparison modal state
  const [compareModal, setCompareModal] = useState<CompareModalData | null>(null);
  const [compareViewMode, setCompareViewMode] = useState<CompareViewMode>('split');
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const handleFilesSelected = (selectedFiles: File[]) => {
    const images = selectedFiles.filter(f => f.type.startsWith('image/'));
    setFiles(images);
    setResults([]);
  };

  const getPreviewKey = (file: File, index: number) =>
    `${file.name}-${file.size}-${file.lastModified}-${index}`;

  useEffect(() => {
    const next: Record<string, string> = {};
    files.forEach((file, index) => {
      next[getPreviewKey(file, index)] = URL.createObjectURL(file);
    });
    setPreviewUrls(next);

    return () => {
      Object.values(next).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  const handlePresetChange = (preset: PortalPreset) => {
    setPortalPreset(preset);
    if (preset === 'passport') {
      setTargetKB(50);
    } else if (preset === 'signature') {
      setTargetKB(20);
    } else if (preset === 'square') {
      setTargetKB(50);
    }
  };

  const getTargetDimension = (preset: PortalPreset): { width: number; height: number } | undefined => {
    if (preset === 'passport') return { width: 350, height: 450 };
    if (preset === 'signature') return { width: 300, height: 120 };
    if (preset === 'square') return { width: 600, height: 600 };
    return undefined;
  };

  const runCompression = async (
    customFiles = files,
    customKB = targetKB,
    customFormat = targetFormat,
    customPreset = portalPreset,
    customClarity = enableEdgeClarity
  ) => {
    if (customFiles.length === 0) return;
    setIsProcessing(true);

    try {
      const targetDimension = getTargetDimension(customPreset);
      const compressed = await compressImagesToTarget(customFiles, customKB, {
        outputFormat: customFormat,
        targetDimension,
        enableEdgeClarity: customClarity,
      });
      setResults(compressed);
    } catch (e) {
      console.error("Compression failed", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompress = () => {
    runCompression();
  };

  const handleSwitchToWebPAndRecompress = () => {
    setTargetFormat('image/webp');
    runCompression(files, targetKB, 'image/webp', portalPreset, enableEdgeClarity);
  };

  const handleDownloadSingle = (img: CompressedImage) => {
    const ext = img.format === 'image/webp' || targetFormat === 'image/webp' ? 'webp' : 'jpg';
    const baseName = img.file.name.substring(0, img.file.name.lastIndexOf('.')) || 'image';
    downloadFile(img.compressedBlob, `compressed-${targetKB}kb-${baseName}.${ext}`, { autoDownload: true });
  };

  const handleDownloadAll = async () => {
    if (results.length === 0) return;

    if (results.length === 1) {
      handleDownloadSingle(results[0]);
    } else {
      const ext = targetFormat === 'image/webp' ? 'webp' : 'jpg';
      const zip = new JSZip();
      results.forEach((img, idx) => {
        const name = img.file.name.substring(0, img.file.name.lastIndexOf('.')) || `image-${idx+1}`;
        const itemExt = img.format === 'image/webp' ? 'webp' : ext;
        zip.file(`${name}-compressed-${targetKB}kb.${itemExt}`, img.compressedBlob);
      });
      const content = await zip.generateAsync({ type: 'blob' });
      downloadFile(content, 'compressed-images.zip', { autoDownload: true });
    }
  };

  const openCompare = (img: CompressedImage, index: number) => {
    const originalUrl = previewUrls[getPreviewKey(img.file, index)] || URL.createObjectURL(img.file);
    const compressedUrl = URL.createObjectURL(img.compressedBlob);
    setSliderPos(50);
    setZoomLevel(1);
    // If dimensions differ significantly (e.g. passport or signature), default to side-by-side
    const isDimensionChanged = portalPreset !== 'auto';
    setCompareViewMode(isDimensionChanged ? 'side-by-side' : 'split');
    setCompareModal({
      file: img.file,
      compressed: img,
      originalUrl,
      compressedUrl,
    });
  };

  const closeCompare = () => {
    if (compareModal?.compressedUrl) {
      URL.revokeObjectURL(compareModal.compressedUrl);
    }
    setCompareModal(null);
  };

  return (
    <>
      <Helmet>
        <title>Compress Image to 50KB Online Free - LAK PDF</title>
        <meta name="description" content="Compress image to 50KB online free for forms, exams and government uploads with high clarity." />
        <link rel="canonical" href="https://lakpdf.com/advance-compress-img" />
        <meta property="og:title" content="Compress Image to 50KB Online Free - LAK PDF" />
        <meta property="og:description" content="Compress image to 50KB online free for forms, exams and government uploads with high clarity." />
        <meta property="og:url" content="https://lakpdf.com/advance-compress-img" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://lakpdf.com/og-image.png" />
      </Helmet>

      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-3">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            100% Free • UPSC, SSC, NEET & Exam Portal Verified
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Compress Image to 50 KB</h1>
          <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto">
            Compress JPG, PNG or WebP images to exact target size with high visual quality, sharp details and zero pixelation.
          </p>
        </div>

        {files.length === 0 ? (
          <FileUploader
            onFilesSelected={handleFilesSelected}
            accept="image/*"
            icon={<Sliders className="w-12 h-12 text-indigo-400" />}
            title="Select Images"
            description="Drop your images here (JPG, PNG, WebP)"
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Area */}
            <div className="lg:col-span-2 space-y-6">
              {results.length > 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-4 border-b border-slate-100 bg-indigo-50/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-indigo-600" />
                      <span className="font-bold text-indigo-900">Compression Complete!</span>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 bg-white text-indigo-600 rounded-full border border-indigo-200 shadow-sm">
                      Target: ≤ {targetKB} KB
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {results.map((img, i) => {
                      const savings = img.originalSize - img.compressedSize;
                      const savingsPercent = Math.round((savings / img.originalSize) * 100);
                      const isSuccess = img.compressedSize <= targetKB * 1024 * 1.05;
                      
                      return (
                        <div key={i} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div 
                              className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center shrink-0 border border-slate-200 overflow-hidden relative group cursor-pointer"
                              onClick={() => openCompare(img, i)}
                              title="Click to compare before & after"
                            >
                              <img 
                                src={URL.createObjectURL(img.compressedBlob)} 
                                alt="preview" 
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Eye className="w-5 h-5 text-white" />
                              </div>
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-slate-800 truncate max-w-[220px]">{img.file.name}</p>
                              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                                <span className="line-through">{formatBytes(img.originalSize)}</span>
                                <ArrowRight className="w-3 h-3 text-slate-300" />
                                <span className={`font-bold ${isSuccess ? 'text-indigo-600' : 'text-emerald-600'}`}>
                                  {formatBytes(img.compressedSize)}
                                </span>
                                {img.width && img.height && (
                                  <>
                                    <span className="text-slate-300">•</span>
                                    <span className="text-slate-600 font-medium">{img.width}×{img.height}px</span>
                                  </>
                                )}
                                <span className="text-slate-300">•</span>
                                <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                                  {img.format === 'image/webp' ? 'WebP' : 'JPG'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            <span className={`inline-block text-xs font-bold px-2 py-1 rounded-full ${savings > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>
                              {savings > 0 ? `-${savingsPercent}%` : '0%'}
                            </span>
                            <button
                              onClick={() => openCompare(img, i)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200"
                              title="Compare original vs compressed"
                            >
                              <Eye className="w-3.5 h-3.5 text-indigo-600" /> Compare
                            </button>
                            <button
                              onClick={() => handleDownloadSingle(img)}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-indigo-100"
                              title="Download this image"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-800">Selected Images ({files.length})</h3>
                    <button 
                      onClick={() => setFiles([])}
                      className="text-slate-500 hover:text-red-500 text-xs font-medium transition-colors"
                    >
                      Clear Selection
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {files.map((file, i) => (
                      <div key={i} className="relative group aspect-square bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                        <img 
                          src={previewUrls[getPreviewKey(file, i)]} 
                          alt="preview" 
                          className="w-full h-full object-cover" 
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 text-center">
                          <span className="text-white text-xs font-medium">{formatBytes(file.size)}</span>
                          <span className="text-white/80 text-[10px] truncate max-w-full">{file.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Format Recommendation Banner */}
              {targetFormat === 'image/jpeg' && (
                <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 border border-indigo-100/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-start gap-2.5">
                    <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">Pro Quality Tip</h4>
                      <p className="text-xs text-indigo-900 mt-0.5 leading-relaxed">
                        For complex posters or images with fine text, <strong>WebP mode</strong> delivers up to <strong>40% higher resolution</strong> (880px vs 690px) at the exact same 50 KB target.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleSwitchToWebPAndRecompress}
                    className="shrink-0 text-xs font-bold px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <Sparkle className="w-3.5 h-3.5" /> Switch to WebP
                  </button>
                </div>
              )}
            </div>

            {/* Sidebar Controls (ALWAYS VISIBLE & EDITABLE) */}
            <div className="lg:col-span-1 space-y-4">
              {/* If results exist, show compact summary card on top */}
              {results.length > 0 && (
                <div className="bg-indigo-600 text-white rounded-2xl shadow-md p-5 text-center">
                  <h3 className="text-xs font-bold text-indigo-200 uppercase tracking-wider">Compressed Output</h3>
                  <p className="text-3xl font-black my-1.5">
                    {formatBytes(results.reduce((acc, c) => acc + c.compressedSize, 0))}
                  </p>
                  <p className="text-xs text-indigo-100 mb-4">
                    Target ≤ {targetKB} KB • High Definition
                  </p>
                  <div className="space-y-2">
                    <Button 
                      variant="secondary" 
                      size="md" 
                      className="w-full bg-white text-indigo-700 hover:bg-indigo-50 font-bold border-0 shadow-sm" 
                      onClick={handleDownloadAll}
                    >
                      <Download className="w-4 h-4 mr-2" /> Download All ({results.length})
                    </Button>
                    <button 
                      onClick={() => { setResults([]); }}
                      className="text-xs text-indigo-200 hover:text-white transition-colors underline inline-block"
                    >
                      Reset / Clear Output
                    </button>
                  </div>
                </div>
              )}

              {/* Compression Settings Panel */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-24 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-slate-900 text-sm">
                      {results.length > 0 ? 'Adjust & Re-Compress' : 'Compression Settings'}
                    </h3>
                  </div>
                  {results.length > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                      Live
                    </span>
                  )}
                </div>

                {/* Target File Size Input & Presets */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Target File Size (KB)
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      min="5" 
                      max="10000" 
                      value={targetKB} 
                      onChange={(e) => setTargetKB(Math.max(5, Number(e.target.value)))}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-base font-bold text-indigo-600 transition-colors"
                    />
                    <span className="font-bold text-slate-400 text-sm">KB</span>
                  </div>

                  {/* Quick KB Presets */}
                  <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                    {[20, 50, 100, 200, 500].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setTargetKB(preset)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                          targetKB === preset
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {preset} KB
                      </button>
                    ))}
                  </div>
                </div>

                {/* Govt & Exam Portal Presets */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Portal & Exam Presets
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handlePresetChange('auto')}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        portalPreset === 'auto'
                          ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900">Auto (Max Res)</span>
                        {portalPreset === 'auto' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Native aspect ratio</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePresetChange('passport')}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        portalPreset === 'passport'
                          ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900">Passport Photo</span>
                        {portalPreset === 'passport' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">350×450 px • ≤50KB</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePresetChange('signature')}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        portalPreset === 'signature'
                          ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900">Signature</span>
                        {portalPreset === 'signature' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">300×120 px • ≤20KB</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePresetChange('square')}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        portalPreset === 'square'
                          ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900">Square ID</span>
                        {portalPreset === 'square' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">600×600 px • ≤50KB</div>
                    </button>
                  </div>
                </div>

                {/* Output Format Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Output Format
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTargetFormat('image/jpeg')}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        targetFormat === 'image/jpeg'
                          ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900">JPG / JPEG</span>
                        {targetFormat === 'image/jpeg' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">UPSC, SSC, Portals</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTargetFormat('image/webp')}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        targetFormat === 'image/webp'
                          ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900">WebP</span>
                        {targetFormat === 'image/webp' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">40% Higher Res</div>
                    </button>
                  </div>
                </div>

                {/* Smart Edge Clarity Toggle */}
                <div 
                  className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100/80 transition-colors"
                  onClick={() => setEnableEdgeClarity(!enableEdgeClarity)}
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900">Smart Edge Clarity</div>
                    <div className="text-[10px] text-slate-500">Sharpen text & contours automatically</div>
                  </div>
                  <div className={`w-10 h-6 rounded-full transition-colors p-0.5 ${enableEdgeClarity ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${enableEdgeClarity ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </div>

                {/* Action Button */}
                <Button 
                  variant="primary" 
                  size="lg" 
                  className="w-full bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30 text-sm font-bold"
                  onClick={handleCompress}
                  isLoading={isProcessing}
                >
                  {isProcessing 
                    ? 'Processing...' 
                    : results.length > 0 
                      ? 'Apply & Re-Compress' 
                      : 'Compress Now'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Before vs After Comparison Modal */}
        {compareModal && (
          <div 
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeCompare();
            }}
          >
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[94vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-600">
                    <Eye className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Quality Comparison</h3>
                    <p className="text-[11px] text-slate-500 hidden sm:block">
                      Inspect clarity, details, and compression efficiency
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* View Mode Switcher */}
                  <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs font-semibold">
                    <button
                      onClick={() => setCompareViewMode('split')}
                      className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                        compareViewMode === 'split' 
                          ? 'bg-white text-indigo-600 shadow-sm' 
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <SplitSquareVertical className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Split Slider</span>
                    </button>
                    <button
                      onClick={() => setCompareViewMode('side-by-side')}
                      className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                        compareViewMode === 'side-by-side' 
                          ? 'bg-white text-indigo-600 shadow-sm' 
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Columns className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Side by Side</span>
                    </button>
                  </div>

                  {/* Zoom Controls */}
                  <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
                    <button
                      onClick={() => setZoomLevel(Math.max(1, +(zoomLevel - 0.25).toFixed(2)))}
                      className="p-1 text-slate-600 hover:text-indigo-600 rounded"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11px] font-bold px-1.5 text-slate-700 min-w-[40px] text-center">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                      onClick={() => setZoomLevel(Math.min(3, +(zoomLevel + 0.25).toFixed(2)))}
                      className="p-1 text-slate-600 hover:text-indigo-600 rounded"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={closeCompare}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">Original:</span>
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-mono text-slate-700">
                    {formatBytes(compareModal.file.size)}
                  </span>
                </div>

                {/* Quick Split Jumps (only in split view) */}
                {compareViewMode === 'split' && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSliderPos(0)}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                        sliderPos === 0 ? 'bg-indigo-600 text-white' : 'bg-white hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      Before (0%)
                    </button>
                    <button
                      onClick={() => setSliderPos(50)}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                        sliderPos === 50 ? 'bg-indigo-600 text-white' : 'bg-white hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      Split (50%)
                    </button>
                    <button
                      onClick={() => setSliderPos(100)}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                        sliderPos === 100 ? 'bg-indigo-600 text-white' : 'bg-white hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      After (100%)
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <span className="font-bold text-indigo-700">Compressed:</span>
                  <span className="bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 font-mono text-indigo-700 font-bold">
                    {formatBytes(compareModal.compressed.compressedSize)}
                  </span>
                  {compareModal.compressed.width && (
                    <span className="text-slate-500 font-mono hidden sm:inline">
                      ({compareModal.compressed.width}×{compareModal.compressed.height}px)
                    </span>
                  )}
                </div>
              </div>

              {/* Comparison Canvas Area */}
              <div className="relative flex-1 overflow-auto bg-slate-950 flex items-center justify-center p-4 select-none min-h-[360px] sm:min-h-[440px]">
                {compareViewMode === 'split' ? (
                  /* SPLIT SLIDER VIEW */
                  <div 
                    className="relative max-h-[60vh] max-w-full inline-block rounded-lg overflow-hidden shadow-xl"
                    style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
                  >
                    {/* Background: Compressed Image (Shows on Right) */}
                    <img 
                      src={compareModal.compressedUrl} 
                      alt="Compressed"
                      draggable={false}
                      className="max-h-[60vh] max-w-full block object-contain pointer-events-none select-none"
                    />

                    {/* Foreground: Original Image clipped by sliderPos (Shows on Left) */}
                    <div 
                      className="absolute inset-0 overflow-hidden pointer-events-none"
                      style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
                    >
                      <img 
                        src={compareModal.originalUrl} 
                        alt="Original"
                        draggable={false}
                        className="w-full h-full block object-contain select-none"
                      />
                    </div>

                    {/* Divider Line */}
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.8)] pointer-events-none"
                      style={{ left: `${sliderPos}%` }}
                    >
                      <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center border-2 border-indigo-600 text-[10px] font-bold text-indigo-700">
                        ↔
                      </div>
                    </div>

                    {/* Transparent Range Input directly over image for 100% fluid dragging on all devices */}
                    <input 
                      type="range"
                      min="0"
                      max="100"
                      value={sliderPos}
                      onChange={(e) => setSliderPos(Number(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
                      aria-label="Image comparison slider"
                    />

                    {/* Floating Corner Badges */}
                    <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[11px] font-semibold pointer-events-none z-10">
                      Original
                    </div>
                    <div className="absolute top-3 right-3 bg-indigo-600/90 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[11px] font-semibold pointer-events-none z-10">
                      Compressed
                    </div>
                  </div>
                ) : (
                  /* SIDE BY SIDE VIEW */
                  <div 
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-3xl"
                    style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
                  >
                    {/* Original Card */}
                    <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800 flex flex-col">
                      <div className="flex items-center justify-between text-xs text-white mb-2 pb-1 border-b border-slate-800">
                        <span className="font-bold text-slate-300">Original</span>
                        <span className="font-mono text-slate-400">{formatBytes(compareModal.file.size)}</span>
                      </div>
                      <div className="flex-1 flex items-center justify-center min-h-[220px] max-h-[45vh] overflow-hidden rounded-lg bg-black/40">
                        <img 
                          src={compareModal.originalUrl} 
                          alt="Original"
                          draggable={false}
                          className="max-h-[45vh] max-w-full object-contain"
                        />
                      </div>
                    </div>

                    {/* Compressed Card */}
                    <div className="bg-slate-900/90 rounded-xl p-3 border border-indigo-900/50 flex flex-col">
                      <div className="flex items-center justify-between text-xs text-white mb-2 pb-1 border-b border-slate-800">
                        <span className="font-bold text-indigo-400">Compressed</span>
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="text-emerald-400 font-bold">{formatBytes(compareModal.compressed.compressedSize)}</span>
                          {compareModal.compressed.width && (
                            <span className="text-slate-400 text-[10px]">
                              ({compareModal.compressed.width}×{compareModal.compressed.height}px)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 flex items-center justify-center min-h-[220px] max-h-[45vh] overflow-hidden rounded-lg bg-black/40">
                        <img 
                          src={compareModal.compressedUrl} 
                          alt="Compressed"
                          draggable={false}
                          className="max-h-[45vh] max-w-full object-contain"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-slate-500 text-center sm:text-left">
                  {compareViewMode === 'split' 
                    ? 'Drag slider or click buttons to check sharpness. Edge Clarity prevents blur.' 
                    : 'Side-by-side view preserves aspect ratio comparison for passport & signatures.'}
                </p>
                <Button
                  variant="primary"
                  size="md"
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 shadow-sm"
                  onClick={() => handleDownloadSingle(compareModal.compressed)}
                >
                  <Download className="w-4 h-4 mr-1.5" /> Download This Image
                </Button>
              </div>
            </div>
          </div>
        )}

        <ToolSEOContent toolKey="/advance-compress-img" />
      </div>
    </>
  );
};
