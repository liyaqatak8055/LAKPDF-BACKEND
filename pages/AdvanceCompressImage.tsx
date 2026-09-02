import React, { useEffect, useState } from 'react';
import { FileUploader } from '../components/FileUploader';
import { Button } from '../components/Button';
import { compressImagesToTarget, CompressedImage } from '../services/imageService';
import { formatBytes, downloadFile } from '../services/fileHelpers';
import { Image as ImageIcon, Download, RefreshCw, ArrowRight, CheckCircle, Sliders } from 'lucide-react';
import JSZip from 'jszip';
import { Helmet } from 'react-helmet-async';
import { ToolSEOContent } from '../components/ToolSEOContent';

export const AdvanceCompressImage: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [results, setResults] = useState<CompressedImage[]>([]);
  const [targetKB, setTargetKB] = useState<number>(50);
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
    
    setTimeout(async () => {
      try {
        const compressed = await compressImagesToTarget(files, targetKB);
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
      downloadFile(img.compressedBlob, `compressed-${targetKB}kb-${img.file.name.split('.')[0]}.jpg`, { autoDownload: true });
    } else {
      const zip = new JSZip();
      results.forEach((img, idx) => {
        const name = img.file.name.substring(0, img.file.name.lastIndexOf('.')) || `image-${idx+1}`;
        zip.file(`${name}-compressed-${targetKB}kb.jpg`, img.compressedBlob);
      });
      const content = await zip.generateAsync({ type: 'blob' });
      downloadFile(content, 'compressed-images.zip', { autoDownload: true });
    }
  };

  return (
    <>
      <Helmet>
        <title>Compress Image to 50KB Online Free - LAK PDF</title>
        <meta name="description" content="Compress image to 50KB online free for forms, exams and government uploads." />
        <link rel="canonical" href="https://lakpdf.com/advance-compress-img" />
        <meta property="og:title" content="Compress Image to 50KB Online Free - LAK PDF" />
        <meta property="og:description" content="Compress image to 50KB online free for forms, exams and government uploads." />
        <meta property="og:url" content="https://lakpdf.com/advance-compress-img" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://lakpdf.com/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Advanced Image Compressor Online Free - LAK PDF" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Advanced Image Compressor Online Free - LAK PDF" />
        <meta name="twitter:description" content="Advanced image compression with quality control and format conversion." />
        <meta name="twitter:image" content="https://lakpdf.com/og-image.png" />
      </Helmet>
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Compress Image to 50 KB</h1>
        <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto">
          Compress JPG, PNG or WebP images to a specific file size (KB).
        </p>
      </div>

      {files.length === 0 ? (
        <FileUploader
          onFilesSelected={handleFilesSelected}
          accept="image/*"
          icon={<Sliders className="w-12 h-12 text-indigo-400" />}
          title="Select Images"
          description="Drop your images here"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Area */}
          <div className="lg:col-span-2 space-y-6">
             {results.length > 0 ? (
               <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                 <div className="p-4 border-b border-slate-100 bg-indigo-50 flex items-center gap-2">
                   <CheckCircle className="w-5 h-5 text-indigo-500" />
                   <span className="font-bold text-indigo-800">Processing Complete!</span>
                 </div>
                 <div className="divide-y divide-slate-100">
                   {results.map((img, i) => {
                     const savings = img.originalSize - img.compressedSize;
                     const savingsPercent = Math.round((savings / img.originalSize) * 100);
                     const isSuccess = img.compressedSize <= targetKB * 1024 * 1.05; // 5% tolerance
                     
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
                               <span className={`font-bold ${isSuccess ? 'text-indigo-600' : 'text-orange-500'}`}>
                                 {formatBytes(img.compressedSize)}
                               </span>
                             </div>
                           </div>
                         </div>
                         <div className="text-right">
                           <span className={`inline-block text-xs font-bold px-2 py-1 rounded-full mb-1 ${savings > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                             {savings > 0 ? `-${savingsPercent}%` : '0%'}
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
                    <h3 className="text-lg font-bold text-slate-900">Total Size</h3>
                    <p className="text-3xl font-black text-indigo-500 my-2">
                       {formatBytes(results.reduce((acc, c) => acc + c.compressedSize, 0))}
                    </p>
                    <p className="text-sm text-slate-500">
                      Target was {targetKB} KB per image
                    </p>
                  </div>
                  <Button variant="primary" size="lg" className="w-full mb-3 bg-indigo-600 hover:bg-indigo-700" onClick={handleDownloadAll}>
                    <Download className="w-5 h-5 mr-2" /> Download All
                  </Button>
                  <Button variant="secondary" size="md" className="w-full" onClick={() => { setResults([]); }}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Compress More
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-6">
                    <Sliders className="w-5 h-5 text-slate-400" />
                    <h3 className="font-bold text-slate-900">Compression Target</h3>
                  </div>
                  
                  <div className="space-y-6 mb-8">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Target File Size (KB)</label>
                      <div className="flex items-center gap-2">
                         <input 
                           type="number" 
                           min="10" 
                           max="5000" 
                           value={targetKB} 
                           onChange={(e) => setTargetKB(Number(e.target.value))}
                           className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-lg font-bold text-indigo-600 transition-colors"
                         />
                         <span className="font-bold text-slate-400">KB</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        We will adjust the quality to try and match this size. Output will be converted to JPG.
                      </p>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-xl text-xs text-blue-700 leading-relaxed">
                      <strong>Note:</strong> Very small targets might reduce quality significantly. If an image cannot be compressed to your target size even at lowest quality, we will return the smallest possible result.
                    </div>
                  </div>

                  <Button 
                    variant="primary" 
                    size="lg" 
                    className="w-full bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30"
                    onClick={handleCompress}
                    isLoading={isProcessing}
                  >
                    {isProcessing ? 'Compressing...' : 'Compress Now'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      <ToolSEOContent toolKey="/advance-compress-img" />
    </div>
    </>
  );
};
