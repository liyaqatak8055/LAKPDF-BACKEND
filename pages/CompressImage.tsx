import React, { useEffect, useState } from 'react';
import { FileUploader } from '../components/FileUploader';
import { Button } from '../components/Button';
import { compressImages, CompressedImage } from '../services/imageService';
import { formatBytes, downloadFile } from '../services/fileHelpers';
import { 
  Image as ImageIcon, 
  Download, 
  Settings, 
  RefreshCw, 
  ArrowRight, 
  CheckCircle, 
  Sparkles, 
  ShieldCheck, 
  Eye, 
  X, 
  Maximize2 
} from 'lucide-react';
import JSZip from 'jszip';
import { Helmet } from 'react-helmet-async';
import { ToolSEOContent } from '../components/ToolSEOContent';

type QualityPreset = 'lossless' | 'balanced' | 'compact' | 'custom';

interface ImageResultItem extends CompressedImage {
  originalUrl: string;
  compressedUrl: string;
}

export const CompressImage: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [results, setResults] = useState<ImageResultItem[]>([]);
  const [preset, setPreset] = useState<QualityPreset>('lossless');
  const [quality, setQuality] = useState<number>(0.85);
  const [format, setFormat] = useState<'original' | 'image/jpeg' | 'image/png' | 'image/webp'>('original');
  const [isProcessing, setIsProcessing] = useState(false);
  const [comparingIndex, setComparingIndex] = useState<number | null>(null);

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

  useEffect(() => {
    return () => {
      results.forEach((r) => {
        try {
          URL.revokeObjectURL(r.originalUrl);
          URL.revokeObjectURL(r.compressedUrl);
        } catch (_) {}
      });
    };
  }, [results]);

  const handlePresetChange = (selected: QualityPreset) => {
    setPreset(selected);
    if (selected === 'lossless') {
      setQuality(0.85);
    } else if (selected === 'balanced') {
      setQuality(0.75);
    } else if (selected === 'compact') {
      setQuality(0.60);
    }
  };

  const handleCompress = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    
    setTimeout(async () => {
      try {
        const compressed = await compressImages(files, quality, format);
        const withUrls: ImageResultItem[] = compressed.map((c) => ({
          ...c,
          originalUrl: URL.createObjectURL(c.file),
          compressedUrl: URL.createObjectURL(c.compressedBlob),
        }));
        setResults(withUrls);
      } catch (e) {
        console.error("Compression failed", e);
      } finally {
        setIsProcessing(false);
      }
    }, 80);
  };

  const handleDownloadSingle = (img: CompressedImage, index: number) => {
    const rawExt = img.compressedBlob.type.split('/')[1] || 'jpeg';
    const ext = rawExt === 'jpeg' ? 'jpg' : rawExt;
    const baseName = img.file.name.substring(0, img.file.name.lastIndexOf('.')) || `image-${index + 1}`;
    downloadFile(img.compressedBlob, `${baseName}-compressed.${ext}`, { autoDownload: true });
  };

  const handleDownloadAll = async () => {
    if (results.length === 0) return;

    if (results.length === 1) {
      handleDownloadSingle(results[0], 0);
    } else {
      const zip = new JSZip();
      results.forEach((img, idx) => {
        const rawExt = img.compressedBlob.type.split('/')[1] || 'jpeg';
        const ext = rawExt === 'jpeg' ? 'jpg' : rawExt;
        const baseName = img.file.name.substring(0, img.file.name.lastIndexOf('.')) || `image-${idx + 1}`;
        zip.file(`${baseName}-compressed.${ext}`, img.compressedBlob);
      });
      const content = await zip.generateAsync({ type: 'blob' });
      downloadFile(content, 'compressed-images.zip', { autoDownload: true });
    }
  };

  return (
    <>
      <Helmet>
        <title>Compress Image Online Free | Reduce Image Size Without Quality Loss - LAK PDF</title>
        <meta name="description" content="Compress JPG, PNG, and WebP images online free without losing quality. 100% original resolution preserved, zero blur, instant size reduction." />
        <link rel="canonical" href="https://lakpdf.com/compress-img" />
        <meta property="og:title" content="Compress Image Online Free | Zero Quality Loss - LAK PDF" />
        <meta property="og:description" content="Compress JPG, PNG, and WebP images without losing quality. 100% original dimensions preserved." />
        <meta property="og:url" content="https://lakpdf.com/compress-img" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://lakpdf.com/og-image.png" />
      </Helmet>

      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            Visually Lossless Engine — Zero Quality Loss
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">Compress Images Without Quality Loss</h1>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
            Reduce JPG, PNG, and WebP file size significantly while keeping 100% original resolution and crystal-clear sharpness.
          </p>
        </div>

        {files.length === 0 ? (
          <FileUploader
            onFilesSelected={handleFilesSelected}
            accept="image/*"
            icon={<ImageIcon className="w-12 h-12 text-teal-500" />}
            title="Select Images"
            description="Drop your JPG, PNG, or WebP images here"
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Area */}
            <div className="lg:col-span-2 space-y-6">
              {results.length > 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-4 border-b border-slate-100 bg-teal-50/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-teal-600" />
                      <span className="font-bold text-teal-900 text-sm sm:text-base">
                        Compression Complete ({results.length} {results.length === 1 ? 'image' : 'images'})
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-teal-700 bg-white border border-teal-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-teal-600" /> 1:1 Resolution Kept
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {results.map((img, i) => {
                      const savings = img.originalSize - img.compressedSize;
                      const savingsPercent = Math.max(0, Math.round((savings / img.originalSize) * 100));
                      const resUrl = img.compressedUrl;

                      return (
                        <div key={i} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="relative w-14 h-14 bg-slate-100 rounded-xl overflow-hidden shrink-0 border border-slate-200">
                              {resUrl ? (
                                <img src={resUrl} alt="compressed preview" className="w-full h-full object-cover" />
                              ) : (
                                <ImageIcon className="w-6 h-6 text-slate-400 m-auto mt-4" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 truncate max-w-[220px] sm:max-w-xs text-sm">
                                {img.file.name}
                              </p>
                              <div className="flex items-center gap-2 text-xs mt-0.5">
                                <span className="text-slate-400 line-through">{formatBytes(img.originalSize)}</span>
                                <ArrowRight className="w-3 h-3 text-slate-300" />
                                <span className="text-teal-600 font-bold">{formatBytes(img.compressedSize)}</span>
                              </div>
                              {img.width && img.height && (
                                <div className="text-[11px] text-slate-500 font-medium mt-1 flex items-center gap-1">
                                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                                  {img.width} × {img.height} px (100% sharp)
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <span className="inline-block bg-teal-100 text-teal-800 text-xs font-bold px-2.5 py-1 rounded-full">
                              -{savingsPercent}%
                            </span>
                            <button
                              type="button"
                              onClick={() => setComparingIndex(i)}
                              className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-1 transition-all"
                              title="Compare original and compressed visual quality"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-500" /> Compare
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadSingle(img, i)}
                              className="px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg flex items-center gap-1 transition-all shadow-xs"
                            >
                              <Download className="w-3.5 h-3.5" /> Save
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
                    <h3 className="font-bold text-slate-800 text-base">Selected Images ({files.length})</h3>
                    <span className="text-xs text-slate-500 font-medium">
                      Total: {formatBytes(files.reduce((acc, f) => acc + f.size, 0))}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {files.map((file, i) => (
                      <div key={i} className="relative group aspect-square bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-xs">
                        <img 
                          src={previewUrls[getPreviewKey(file, i)]} 
                          alt="preview" 
                          className="w-full h-full object-cover" 
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 text-center">
                          <p className="text-white text-xs font-medium truncate w-full">{file.name}</p>
                          <span className="text-teal-300 text-[11px] font-bold mt-1">{formatBytes(file.size)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 flex justify-end">
                    <button 
                      onClick={() => setFiles([])}
                      className="text-slate-500 hover:text-rose-600 text-xs font-semibold transition-colors"
                    >
                      Clear Selection
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar Controls */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-24">
                {results.length > 0 ? (
                  <>
                    <div className="text-center mb-6">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Overall Space Saved</h3>
                      <p className="text-4xl font-black text-teal-600 my-2">
                        {Math.max(0, Math.round((results.reduce((acc, curr) => acc + (curr.originalSize - curr.compressedSize), 0) / results.reduce((acc, curr) => acc + curr.originalSize, 0)) * 100))}%
                      </p>
                      <p className="text-xs text-slate-500">
                        From {formatBytes(results.reduce((acc, c) => acc + c.originalSize, 0))} down to <span className="text-slate-900 font-bold">{formatBytes(results.reduce((acc, c) => acc + c.compressedSize, 0))}</span>
                      </p>
                    </div>

                    <div className="p-3 bg-teal-50/70 border border-teal-200/80 rounded-xl mb-6 text-xs text-teal-900 space-y-1">
                      <div className="font-semibold flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
                        Zero Quality Degradation
                      </div>
                      <p className="text-teal-700 leading-relaxed">
                        1:1 pixel dimensions and visual sharpness are 100% maintained.
                      </p>
                    </div>

                    <Button variant="primary" size="lg" className="w-full mb-3 bg-teal-600 hover:bg-teal-700" onClick={handleDownloadAll} disabled={results.length === 0}>
                      <Download className="w-4 h-4 mr-2" /> Download {results.length > 1 ? "All Images (ZIP)" : "Compressed Image"}
                    </Button>
                    <Button variant="secondary" size="md" className="w-full" onClick={() => { setResults([]); }}>
                      <RefreshCw className="w-4 h-4 mr-2" /> Compress More
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-5">
                      <Settings className="w-5 h-5 text-teal-600" />
                      <h3 className="font-bold text-slate-900 text-base">Quality & Settings</h3>
                    </div>
                    
                    <div className="space-y-5 mb-6">
                      {/* Quality Presets */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                          Compression Mode
                        </label>
                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={() => handlePresetChange('lossless')}
                            className={`w-full p-2.5 rounded-xl border text-left flex items-start justify-between transition-all ${
                              preset === 'lossless'
                                ? 'border-teal-500 bg-teal-50/50 ring-2 ring-teal-100 text-slate-900'
                                : 'border-slate-200 hover:border-slate-300 text-slate-700'
                            }`}
                          >
                            <div>
                              <div className="text-xs font-bold flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-teal-600" /> Visually Lossless (Recommended)
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">100% identical quality, 30-70% size reduction</p>
                            </div>
                            <span className="text-[11px] font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-md">85%</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handlePresetChange('balanced')}
                            className={`w-full p-2.5 rounded-xl border text-left flex items-start justify-between transition-all ${
                              preset === 'balanced'
                                ? 'border-teal-500 bg-teal-50/50 ring-2 ring-teal-100 text-slate-900'
                                : 'border-slate-200 hover:border-slate-300 text-slate-700'
                            }`}
                          >
                            <div>
                              <div className="text-xs font-bold">Balanced</div>
                              <p className="text-[11px] text-slate-500 mt-0.5">High sharpness with greater size reduction</p>
                            </div>
                            <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">75%</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handlePresetChange('compact')}
                            className={`w-full p-2.5 rounded-xl border text-left flex items-start justify-between transition-all ${
                              preset === 'compact'
                                ? 'border-teal-500 bg-teal-50/50 ring-2 ring-teal-100 text-slate-900'
                                : 'border-slate-200 hover:border-slate-300 text-slate-700'
                            }`}
                          >
                            <div>
                              <div className="text-xs font-bold">Maximum Savings</div>
                              <p className="text-[11px] text-slate-500 mt-0.5">For strict email or portal upload limits</p>
                            </div>
                            <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">60%</span>
                          </button>
                        </div>
                      </div>

                      {/* Custom Slider */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-semibold text-slate-700">Custom Quality</label>
                          <span className="text-xs font-bold text-teal-700">{Math.round(quality * 100)}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="0.2" 
                          max="1.0" 
                          step="0.05" 
                          value={quality} 
                          onChange={(e) => {
                            setQuality(parseFloat(e.target.value));
                            setPreset('custom');
                          }}
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                          <span>Smaller Size</span>
                          <span>Perceptually Lossless (100%)</span>
                        </div>
                      </div>

                      {/* Output Format */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Output Format</label>
                        <select 
                          value={format} 
                          onChange={(e) => setFormat(e.target.value as any)}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                        >
                          <option value="original">Auto - Smart Compression (Keeps JPG/PNG/WebP, Zero Quality Loss)</option>
                          <option value="image/jpeg">JPEG (Universal Compatibility)</option>
                          <option value="image/webp">WebP (Modern High Compression + Transparency)</option>
                          <option value="image/png">PNG (Lossless Graphics)</option>
                        </select>
                      </div>

                      {/* Resolution Guarantee Box */}
                      <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-[11px] text-slate-600 space-y-1">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-teal-600" />
                          100% Original Resolution Kept
                        </div>
                        <p>
                          Image dimensions (width & height) will not be shrunk or blurred. Output remains identical in size and clarity.
                        </p>
                      </div>
                    </div>

                    <Button 
                      variant="primary" 
                      size="lg" 
                      className="w-full bg-teal-600 hover:bg-teal-700 shadow-teal-600/20"
                      onClick={handleCompress}
                      isLoading={isProcessing}
                    >
                      {isProcessing ? 'Compressing Without Loss...' : 'Compress Images'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        
        <ToolSEOContent toolKey="/compress-img" />
      </div>

      {/* Interactive Quality Inspection / Compare Modal */}
      {comparingIndex !== null && results[comparingIndex] && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in fade-in">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2">
                  <Eye className="w-5 h-5 text-teal-600" /> Visual Quality Inspection
                </h3>
                <p className="text-xs text-slate-500">Compare original image with compressed output</p>
              </div>
              <button
                type="button"
                onClick={() => setComparingIndex(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Original */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Original Image</span>
                  <span className="text-slate-500 font-medium">{formatBytes(results[comparingIndex].originalSize)}</span>
                </div>
                <div className="aspect-video bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 flex items-center justify-center">
                  <img
                    src={results[comparingIndex].originalUrl}
                    alt="original"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              {/* Compressed */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-teal-700 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-teal-600" /> Compressed Result
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-teal-700 font-bold">{formatBytes(results[comparingIndex].compressedSize)}</span>
                    <span className="bg-teal-100 text-teal-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded">
                      -{Math.round(((results[comparingIndex].originalSize - results[comparingIndex].compressedSize) / results[comparingIndex].originalSize) * 100)}%
                    </span>
                  </div>
                </div>
                <div className="aspect-video bg-slate-100 rounded-2xl overflow-hidden border border-teal-200 flex items-center justify-center">
                  <img
                    src={results[comparingIndex].compressedUrl}
                    alt="compressed"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <div className="text-xs text-slate-600 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                <span>Dimensions: <strong>{results[comparingIndex].width} × {results[comparingIndex].height} px</strong> (100% sharp & identical)</span>
              </div>
              <Button
                variant="primary"
                size="sm"
                className="bg-teal-600 hover:bg-teal-700"
                onClick={() => handleDownloadSingle(results[comparingIndex], comparingIndex)}
              >
                <Download className="w-3.5 h-3.5 mr-1" /> Download
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
