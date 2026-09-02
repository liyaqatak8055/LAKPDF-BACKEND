import React, { useEffect, useState } from 'react';
import { FileUploader } from '../components/FileUploader';
import { Button } from '../components/Button';
import { compressImages, CompressedImage } from '../services/imageService';
import { formatBytes, downloadFile } from '../services/fileHelpers';
import { Image as ImageIcon, Download, Settings, RefreshCw, X, ArrowRight, CheckCircle } from 'lucide-react';
import JSZip from 'jszip';
import { Helmet } from 'react-helmet-async';
import { ToolSEOContent } from '../components/ToolSEOContent';


export const CompressImage: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [results, setResults] = useState<CompressedImage[]>([]);
  const [quality, setQuality] = useState<number>(0.7);
  const [format, setFormat] = useState<'original' | 'image/jpeg' | 'image/png' | 'image/webp'>('image/jpeg');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFilesSelected = (selectedFiles: File[]) => {
    // Filter for images
    const images = selectedFiles.filter(f => 
      f.type.startsWith('image/')
    );
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

  const handleCompress = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    
    // Tiny delay to allow UI to update
    setTimeout(async () => {
      try {
        const compressed = await compressImages(files, quality, format);
        setResults(compressed);
      } catch (e) {
        console.error("Compression failed", e);
      } finally {
        setIsProcessing(false);
      }
    }, 100);
  };

  const handleDownloadAll = async () => {
    if (results.length === 0) return;

    if (results.length === 1) {
      const img = results[0];
      const ext = img.compressedBlob.type.split('/')[1];
      downloadFile(img.compressedBlob, `compressed-image.${ext}`, { autoDownload: true });
    } else {
      const zip = new JSZip();
      results.forEach((img, idx) => {
        const ext = img.compressedBlob.type.split('/')[1];
        // Try to keep original name or use generic
        const name = img.file.name.substring(0, img.file.name.lastIndexOf('.')) || `image-${idx+1}`;
        zip.file(`${name}-compressed.${ext}`, img.compressedBlob);
      });
      const content = await zip.generateAsync({ type: 'blob' });
      downloadFile(content, 'compressed-images.zip', { autoDownload: true });
    }
  };

  return (
    <>
      <Helmet>
        <title>Compress Image Online Free | Reduce Image Size - LAK PDF</title>
        <meta name="description" content="Compress image online free and reduce JPG/PNG size quickly without losing quality." />
        <link rel="canonical" href="https://lakpdf.com/compress-img" />
        <meta property="og:title" content="Compress Image Online Free | Reduce Image Size - LAK PDF" />
        <meta property="og:description" content="Compress image online free and reduce JPG/PNG size quickly without losing quality." />
        <meta property="og:url" content="https://lakpdf.com/compress-img" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://lakpdf.com/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Compress Image Online Free | Reduce Image Size - LAK PDF" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Compress Image Online Free | Reduce Image Size - LAK PDF" />
        <meta name="twitter:description" content="Compress image online free and reduce JPG/PNG size quickly without losing quality." />
        <meta name="twitter:image" content="https://lakpdf.com/og-image.png" />
      </Helmet>
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Compress Images</h1>
        <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto">
          Reduce JPG, PNG or WebP image size while maintaining the best quality.
        </p>
        
      </div>

      {files.length === 0 ? (
        <FileUploader
          onFilesSelected={handleFilesSelected}
          accept="image/*"
          icon={<ImageIcon className="w-12 h-12 text-teal-400" />}
          title="Select Images"
          description="Drop your images here"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Area */}
          <div className="lg:col-span-2 space-y-6">
             {results.length > 0 ? (
               <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                 <div className="p-4 border-b border-slate-100 bg-teal-50 flex items-center gap-2">
                   <CheckCircle className="w-5 h-5 text-teal-500" />
                   <span className="font-bold text-teal-800">Compression Complete!</span>
                 </div>
                 <div className="divide-y divide-slate-100">
                   {results.map((img, i) => {
                     const savings = img.originalSize - img.compressedSize;
                     const savingsPercent = Math.round((savings / img.originalSize) * 100);
                     return (
                       <div key={i} className="p-4 flex items-center justify-between">
                         <div className="flex items-center gap-3 overflow-hidden">
                           <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                             <ImageIcon className="w-5 h-5 text-slate-400" />
                           </div>
                           <div className="min-w-0">
                             <p className="font-medium text-slate-800 truncate max-w-[150px]">{img.file.name}</p>
                             <div className="flex items-center gap-2 text-xs">
                               <span className="text-slate-400 line-through">{formatBytes(img.originalSize)}</span>
                               <ArrowRight className="w-3 h-3 text-slate-300" />
                               <span className="text-teal-600 font-bold">{formatBytes(img.compressedSize)}</span>
                             </div>
                           </div>
                         </div>
                         <div className="text-right">
                           <span className="inline-block bg-teal-100 text-teal-700 text-xs font-bold px-2 py-1 rounded-full mb-1">
                             -{savingsPercent}%
                           </span>
                         </div>
                       </div>
                     );
                   })}
                 </div>
               </div>
             ) : (
               <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                 <h3 className="font-bold text-slate-800 mb-4">Selected Images ({files.length})</h3>
                 <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                   {files.map((file, i) => (
                     <div key={i} className="relative group aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                        <img 
                          src={previewUrls[getPreviewKey(file, i)]} 
                          alt="preview" 
                          className="w-full h-full object-cover" 
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <span className="text-white text-xs font-medium">{formatBytes(file.size)}</span>
                        </div>
                     </div>
                   ))}
                 </div>
                 <div className="mt-6 flex justify-end">
                    <button 
                      onClick={() => setFiles([])}
                      className="text-slate-500 hover:text-red-500 text-sm font-medium transition-colors"
                    >
                      Clear Selection
                    </button>
                 </div>
               </div>
             )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-24">
              {results.length > 0 ? (
                <>
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-bold text-slate-900">Total Savings</h3>
                    <p className="text-3xl font-black text-teal-500 my-2">
                       {Math.round((results.reduce((acc, curr) => acc + (curr.originalSize - curr.compressedSize), 0) / results.reduce((acc, curr) => acc + curr.originalSize, 0)) * 100)}%
                    </p>
                    <p className="text-sm text-slate-500">
                      Reduced from {formatBytes(results.reduce((acc, c) => acc + c.originalSize, 0))} to <span className="text-slate-900 font-bold">{formatBytes(results.reduce((acc, c) => acc + c.compressedSize, 0))}</span>
                    </p>
                  </div>
                  <Button variant="primary" size="lg" className="w-full mb-3" onClick={handleDownloadAll} disabled={results.length === 0}>
                     Download {results.length > 1 ? "All" : "Image"}
                  </Button>
                  <Button variant="secondary" size="md" className="w-full" onClick={() => { setResults([]); }}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Compress More
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-6">
                    <Settings className="w-5 h-5 text-slate-400" />
                    <h3 className="font-bold text-slate-900">Compression Settings</h3>
                  </div>
                  
                  <div className="space-y-6 mb-8">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Image Quality: {Math.round(quality * 100)}%</label>
                      <input 
                        type="range" 
                        min="0.1" 
                        max="1" 
                        step="0.05" 
                        value={quality} 
                        onChange={(e) => setQuality(parseFloat(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-500"
                      />
                      <div className="flex justify-between text-xs text-slate-400 mt-1">
                        <span>Low size</span>
                        <span>Best quality</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Output Format</label>
                      <select 
                        value={format} 
                        onChange={(e) => setFormat(e.target.value as any)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      >
                         <option value="image/jpeg">JPEG (Recommended)</option>
                         <option value="image/png">PNG</option>
                         <option value="image/webp">WebP (Best Compression)</option>
                      </select>
                    </div>
                  </div>

                  <Button 
                    variant="primary" 
                    size="lg" 
                    className="w-full bg-teal-500 hover:bg-teal-600 shadow-teal-500/30"
                    onClick={handleCompress}
                    isLoading={isProcessing}
                  >
                    {isProcessing ? 'Compressing...' : 'Compress Images'}
                  </Button>
                </>
              )}
              
            </div>
          </div>
        </div>
      )}
      
      <ToolSEOContent toolKey="/compress-img" />
    </div>
    </>
  );
};
