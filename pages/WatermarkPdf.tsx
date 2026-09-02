import React, { useEffect, useState } from 'react';
import { FileUploader } from '../components/FileUploader';
import { Button } from '../components/Button';
import { PdfFile, ProcessingStatus } from '../types';
import { watermarkPdf, downloadPdf, formatBytes } from '../services/pdfService';
import { Type, X, Image as ImageIcon, Check, Grid3X3, RotateCw, LayoutGrid, Download } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { NextStepPanel, RelatedActions, ToolStartPanel } from '../components/ToolProductPanels';
import { Helmet } from 'react-helmet-async';
import { ToolSEOContent } from '../components/ToolSEOContent';

export const WatermarkPdf: React.FC = () => {
  const [file, setFile] = useState<PdfFile | null>(null);
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'text' | 'image'>('text');

  // Text Options
  const [text, setText] = useState('');
  const [color, setColor] = useState('#000000');
  const [textSize, setTextSize] = useState(60);

  // Image Options
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageScale, setImageScale] = useState(50);

  // Common Options
  const [opacity, setOpacity] = useState(0.5);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState(5); // 1-9 Grid (5 is center)
  const [isMosaic, setIsMosaic] = useState(false);

  const [status, setStatus] = useState<ProcessingStatus>({ isProcessing: false, message: '' });
  const [readyPdf, setReadyPdf] = useState<{ data: Uint8Array; name: string } | null>(null);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const handleFileSelected = (selectedFiles: File[]) => {
    if (selectedFiles.length > 0) {
      setFile({
        id: uuidv4(),
        file: selectedFiles[0],
        name: selectedFiles[0].name,
        size: selectedFiles[0].size,
      });
      setReadyPdf(null);
    }
  };

  const handleImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        const img = e.target.files[0];
        if (imagePreview) URL.revokeObjectURL(imagePreview);
        setImageFile(img);
        setImagePreview(URL.createObjectURL(img));
    }
  };

  const handleProcess = async () => {
    if (!file) return;
    if (activeTab === 'text' && !text) return;
    if (activeTab === 'image' && !imageFile) return;

    setStatus({ isProcessing: true, message: 'Applying watermark...' });

    try {
      let imageBytes: ArrayBuffer | undefined;
      let imageType: 'png' | 'jpg' | undefined;

      if (activeTab === 'image' && imageFile) {
        imageBytes = await imageFile.arrayBuffer();
        imageType = imageFile.type.includes('png') ? 'png' : 'jpg';
      }

      const watermarkedBytes = await watermarkPdf(file.file, {
        type: activeTab,
        text,
        color,
        size: activeTab === 'text' ? textSize : imageScale,
        imageBytes,
        imageType,
        opacity,
        position,
        isMosaic,
        rotation
      });

      const outputName = `watermarked-${file.name}`;
      setReadyPdf({ data: watermarkedBytes, name: outputName });
      downloadPdf(watermarkedBytes, outputName, { autoDownload: false });
      setStatus({ isProcessing: false, message: 'Done! File ready to download.', success: true });
    } catch (error) {
      console.error(error);
      setStatus({ isProcessing: false, message: 'Error processing file.', error: 'Failed' });
    }
  };

  const handleDownloadReady = () => {
    if (!readyPdf) return;
    downloadPdf(readyPdf.data, readyPdf.name, { autoDownload: true });
  };

  return (
    <>
      <Helmet>
        <title>Watermark PDF Online Free | Add Text Watermark - LAK PDF</title>
        <meta name="description" content="Add text watermark to PDF online free for branding and document protection." />
        <link rel="canonical" href="https://lakpdf.com/watermark" />
        <meta property="og:title" content="Watermark PDF Online Free | Add Text Watermark - LAK PDF" />
        <meta property="og:description" content="Add text watermark to PDF online free for branding and document protection." />
        <meta property="og:url" content="https://lakpdf.com/watermark" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://lakpdf.com/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Watermark PDF Online Free | Add Text Watermark - LAK PDF" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Watermark PDF Online Free | Add Text Watermark - LAK PDF" />
        <meta name="twitter:description" content="Add text watermark to PDF online free for branding and document protection." />
        <meta name="twitter:image" content="https://lakpdf.com/og-image.png" />
      </Helmet>
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Watermark PDF</h1>
        <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto">
          Stamp an image or text over your PDF in seconds.
        </p>
      </div>

      {!file ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <FileUploader
            onFilesSelected={handleFileSelected}
            multiple={false}
            icon={<Type className="w-12 h-12 text-red-400" />}
            title="Select PDF file"
            description="Drop your PDF here"
            helperText="Runs in your browser"
          />
          <ToolStartPanel
            supportedFormats={['PDF input', 'PNG watermark image', 'JPG watermark image']}
            fileSizeNote="No fixed upload cap is enforced. Large PDFs and images use more browser memory."
            privacyNote="Watermarking runs in your browser."
            workflowSteps={[
              'Upload one PDF.',
              'Choose text or image watermark settings.',
              'Preview, apply, and download the PDF.',
            ]}
          />
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8">
            {/* Options Sidebar */}
            <div className="w-full lg:w-1/3 space-y-6">
                
                {/* File Info */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 bg-red-100 text-red-500 font-bold rounded flex items-center justify-center shrink-0">PDF</div>
                        <span className="font-medium text-slate-700 truncate">{file.name}</span>
                    </div>
                    <button onClick={() => { setFile(null); setReadyPdf(null); }} className="text-slate-400 hover:text-red-500"><X size={20} /></button>
                </div>

                <NextStepPanel
                  title="Next step"
                  steps={[
                    'Choose text or image mode.',
                    'Adjust placement, opacity, and rotation.',
                    'Preview before applying the watermark.',
                  ]}
                />

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="flex border-b border-slate-200">
                        <button 
                            className={`flex-1 py-4 flex flex-col items-center gap-2 text-sm font-medium transition-colors ${activeTab === 'text' ? 'bg-white text-red-500 border-b-2 border-red-500' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                            onClick={() => setActiveTab('text')}
                        >
                            <Type size={24} />
                            Place Text
                        </button>
                        <button 
                             className={`flex-1 py-4 flex flex-col items-center gap-2 text-sm font-medium transition-colors ${activeTab === 'image' ? 'bg-white text-red-500 border-b-2 border-red-500' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                             onClick={() => setActiveTab('image')}
                        >
                            <ImageIcon size={24} />
                            Place Image
                        </button>
                    </div>

                    <div className="p-6 space-y-6">
                        {activeTab === 'text' ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Text</label>
                                    <input 
                                        type="text" 
                                        value={text}
                                        onChange={(e) => setText(e.target.value)}
                                        placeholder="e.g. Confidential"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                     <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Size</label>
                                        <input 
                                            type="number"
                                            value={textSize}
                                            onChange={(e) => setTextSize(Number(e.target.value))}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"
                                        />
                                     </div>
                                     <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Color</label>
                                        <div className="flex gap-2">
                                            <input 
                                                type="color" 
                                                value={color}
                                                onChange={(e) => setColor(e.target.value)}
                                                className="h-10 w-10 p-0 border-0 rounded cursor-pointer"
                                            />
                                            <div className="flex-grow h-10 border border-slate-300 rounded-lg flex items-center px-3 text-sm text-slate-500">
                                                {color}
                                            </div>
                                        </div>
                                     </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Upload Image</label>
                                    {imagePreview ? (
                                        <div className="relative aspect-video bg-slate-100 rounded-lg overflow-hidden border border-slate-200 group">
                                            <img src={imagePreview} className="w-full h-full object-contain" />
                                            <button 
                                                onClick={() => {
                                                  if (imagePreview) URL.revokeObjectURL(imagePreview);
                                                  setImageFile(null);
                                                  setImagePreview(null);
                                                }}
                                                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                                            <ImageIcon className="text-slate-400 mb-2" />
                                            <span className="text-sm text-slate-500">Click to upload image</span>
                                            <input type="file" accept="image/*" className="hidden" onChange={handleImageSelected} />
                                        </label>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Scale: {imageScale}%</label>
                                    <input 
                                        type="range"
                                        min="10"
                                        max="100"
                                        value={imageScale}
                                        onChange={(e) => setImageScale(Number(e.target.value))}
                                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-500"
                                    />
                                </div>
                            </div>
                        )}
                        
                        <div className="border-t border-slate-100 pt-6 space-y-6">
                            {/* Position */}
                            <div className="flex gap-6">
                                <div className="w-24 shrink-0">
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Position</label>
                                    <div className={`grid grid-cols-3 gap-1 ${isMosaic ? 'opacity-30 pointer-events-none' : ''}`}>
                                        {[1,2,3,4,5,6,7,8,9].map(i => (
                                            <button
                                                key={i}
                                                onClick={() => { setPosition(i); setIsMosaic(false); }}
                                                className={`w-full aspect-square border rounded-md transition-all ${
                                                    position === i && !isMosaic
                                                    ? 'bg-red-500 border-red-500' 
                                                    : 'bg-white border-slate-200 hover:bg-slate-50'
                                                }`}
                                            >
                                                {position === i && !isMosaic && <div className="w-2 h-2 bg-white rounded-full mx-auto" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex-grow space-y-4">
                                     <label className="flex items-center gap-3 cursor-pointer p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                                         <div className={`w-5 h-5 border rounded flex items-center justify-center ${isMosaic ? 'bg-red-500 border-red-500' : 'border-slate-300'}`}>
                                            {isMosaic && <Check size={14} className="text-white" />}
                                         </div>
                                         <input type="checkbox" checked={isMosaic} onChange={(e) => setIsMosaic(e.target.checked)} className="hidden" />
                                         <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                             <LayoutGrid size={16} /> Mosaic
                                         </div>
                                     </label>

                                     <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Rotation</label>
                                        <div className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2">
                                            <RotateCw size={16} className="text-slate-400" />
                                            <select 
                                                value={rotation}
                                                onChange={(e) => setRotation(Number(e.target.value))}
                                                className="bg-transparent w-full outline-none text-sm text-slate-700"
                                            >
                                                <option value={0}>Do not rotate</option>
                                                <option value={45}>45 degrees</option>
                                                <option value={90}>90 degrees</option>
                                                <option value={-45}>-45 degrees</option>
                                                <option value={-90}>-90 degrees</option>
                                            </select>
                                        </div>
                                     </div>
                                </div>
                            </div>

                            {/* Transparency */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Transparency: {Math.round(opacity * 100)}%</label>
                                <input 
                                    type="range"
                                    min="0.1"
                                    max="1"
                                    step="0.1"
                                    value={opacity}
                                    onChange={(e) => setOpacity(parseFloat(e.target.value))}
                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-500"
                                />
                            </div>
                        </div>

                        {readyPdf ? (
                            <Button variant="primary" size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleDownloadReady}>
                                <Download className="w-5 h-5 mr-2" />
                                Download PDF
                            </Button>
                        ) : (
                            <Button 
                                variant="primary"
                                size="lg"
                                className="w-full bg-red-600 hover:bg-red-700"
                                onClick={handleProcess}
                                isLoading={status.isProcessing}
                                disabled={(activeTab === 'text' && !text) || (activeTab === 'image' && !imageFile)}
                            >
                                {status.isProcessing ? 'Processing...' : 'Add Watermark'}
                            </Button>
                        )}
                    </div>
                </div>
                <RelatedActions
                  actions={[
                    { label: 'Add page numbers', to: '/page-number' },
                    { label: 'Rotate PDF', to: '/rotate' },
                    { label: 'Sign PDF', to: '/sign-pdf' },
                  ]}
                />
            </div>

            {/* Preview Area */}
            <div className="w-full lg:w-2/3 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center p-8 min-h-[500px]">
                <div className="relative w-full max-w-md aspect-[1/1.41] bg-white shadow-xl flex overflow-hidden">
                    <div className="absolute inset-0 p-8 flex"
                        style={{
                           alignItems: isMosaic ? 'flex-start' : 
                                       [1,2,3].includes(position) ? 'flex-start' : 
                                       [4,5,6].includes(position) ? 'center' : 'flex-end',
                           justifyContent: isMosaic ? 'flex-start' :
                                           [1,4,7].includes(position) ? 'flex-start' : 
                                           [2,5,8].includes(position) ? 'center' : 'flex-end',
                           flexWrap: isMosaic ? 'wrap' : 'nowrap',
                           gap: isMosaic ? '50px' : '0'
                        }}
                    >
                       {isMosaic ? (
                           // Mosaic Preview (Rough Approximation)
                           Array.from({length: 12}).map((_, i) => (
                               <div key={i} style={{ opacity, transform: `rotate(${rotation}deg)` }}>
                                    {activeTab === 'text' ? (
                                        <span style={{ fontSize: `${textSize/2}px`, color, fontWeight: 'bold' }}>{text || 'Watermark'}</span>
                                    ) : imagePreview ? (
                                        <img src={imagePreview} style={{ width: `${imageScale}px` }} />
                                    ) : (
                                        <div className="w-10 h-10 bg-slate-200" />
                                    )}
                               </div>
                           ))
                       ) : (
                           // Single Position Preview
                           <div style={{ opacity, transform: `rotate(${rotation}deg)` }}>
                                {activeTab === 'text' ? (
                                    <span style={{ fontSize: `${textSize}px`, color, fontWeight: 'bold', whiteSpace: 'nowrap' }}>{text || 'Watermark'}</span>
                                ) : imagePreview ? (
                                    <img src={imagePreview} style={{ width: `${imageScale * 2}px` }} />
                                ) : (
                                    <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 rounded bg-slate-50 text-slate-400">
                                        <ImageIcon />
                                        <span className="text-xs">Image</span>
                                    </div>
                                )}
                           </div>
                       )}
                    </div>

                    {/* Fake PDF Content lines */}
                    <div className="absolute inset-0 p-8 pointer-events-none -z-10 opacity-20 flex flex-col gap-4">
                        {Array.from({length: 20}).map((_,i) => (
                            <div key={`watermark_line_${i}`} className="h-2 bg-slate-800 rounded w-full" style={{ width: `${[75, 90, 60, 85, 95, 70, 80, 65, 90, 85, 75, 80, 95, 60, 85, 70, 90, 75, 80, 65][i % 20]}%` }} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
      )}
      <ToolSEOContent toolKey="/watermark" />
    </div>
    </>
  );
};
