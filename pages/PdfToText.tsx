import React, { useState } from 'react';
import { FileUploader } from '../components/FileUploader';
import { Button } from '../components/Button';
import { PdfFile, ProcessingStatus } from '../types';
import { extractTextFromPdf, formatBytes, downloadFile, pdfjs } from '../services/pdfService';
import { FileText, X, Copy, Download, Scan, RefreshCw, Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { postProcessOcrText, preprocessCanvasForOcr } from '../utils/ocrPostProcess';
import { Helmet } from 'react-helmet-async';
import { ToolSEOContent } from '../components/ToolSEOContent';

const loadTesseract = async () => {
  const mod = await import('tesseract.js');
  return (mod as any).default || mod;
};

export const PdfToText: React.FC = () => {
  const [file, setFile] = useState<PdfFile | null>(null);
  const [text, setText] = useState<string>('');
  const [status, setStatus] = useState<ProcessingStatus>({ isProcessing: false, message: '' });
  const [ocrProgress, setOcrProgress] = useState(0);

  const performOcr = async (file: File) => {
    setStatus({ isProcessing: true, message: 'Scanned PDF detected. Running OCR (this may take a moment)...' });
    try {
      const Tesseract = await loadTesseract();
      let images: string[] = [];
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      
      // Limit pages for browser performance
      const maxPages = Math.min(pdf.numPages, 10); 
      
      for (let i = 1; i <= maxPages; i++) {
         const page = await pdf.getPage(i);
         const viewport = page.getViewport({ scale: 2.6 });
         const canvas = document.createElement('canvas');
         canvas.width = viewport.width;
         canvas.height = viewport.height;
         const ctx = canvas.getContext('2d');
         if (ctx) {
           ctx.fillStyle = '#FFFFFF';
           ctx.fillRect(0, 0, canvas.width, canvas.height);
           await page.render({ canvasContext: ctx, viewport }).promise;
           const processedCanvas = preprocessCanvasForOcr(canvas, {
             contrastBoost: 1.38,
             thresholdOffset: -2,
             binarize: true,
           });
           images.push(processedCanvas.toDataURL('image/png'));
         }
      }

      let fullText = '';
      for (let i = 0; i < images.length; i++) {
        setOcrProgress(Math.round(((i) / images.length) * 100));
        setStatus(prev => ({ ...prev, message: `Processing page ${i + 1} of ${maxPages}...` }));
        
        const result = await Tesseract.recognize(
          images[i],
          'eng',
          { logger: () => {} } // Silent logger
        );
        fullText += `--- Page ${i+1} ---\n${postProcessOcrText(result.data.text)}\n\n`;
      }
      
      if (pdf.numPages > maxPages) {
        fullText += `\n... (OCR limited to first ${maxPages} pages for performance) ...`;
      }

      setText(fullText);
      setStatus({ isProcessing: false, message: '', success: true });
    } catch (e) {
      console.error(e);
      setStatus({ isProcessing: false, message: 'OCR Failed.', error: 'Failed' });
      setText("Could not extract text from this document.");
    }
  };

  const handleFileSelected = async (selectedFiles: File[]) => {
    if (selectedFiles.length > 0) {
      const f = selectedFiles[0];
      setFile({
        id: uuidv4(),
        file: f,
        name: f.name,
        size: f.size,
      });
      setText('');
      setOcrProgress(0);
      
      // Attempt Native Extraction
      setStatus({ isProcessing: true, message: 'Extracting text layer...' });
      try {
        const extracted = await extractTextFromPdf(f);
        const cleanText = extracted.replace(/--- Page \d+ ---/g, '').trim();

        if (cleanText.length < 50) { // Threshold for "empty/scanned"
           // Fallback to OCR
           await performOcr(f);
        } else {
           setText(extracted);
           setStatus({ isProcessing: false, message: '', success: true });
        }
      } catch (e: any) {
        console.error(e);
        // If native extraction fails (e.g. strange format), try OCR
        await performOcr(f);
      }
    }
  };

  const handleDownload = () => {
    const blob = new Blob([text], { type: 'text/plain' });
    downloadFile(blob, `${file?.name.replace('.pdf', '')}.txt`, { autoDownload: true });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    // Visual feedback could be added here
  };

  const handleReset = () => {
    setFile(null);
    setText('');
    setStatus({ isProcessing: false, message: '' });
    setOcrProgress(0);
  };

  return (
    <>
      <Helmet>
        <title>PDF to Text Online Free | Extract Text from PDF - LAK PDF</title>
        <meta name="description" content="Extract text from PDF online free. Copy, download or save plain text from any PDF." />
        <link rel="canonical" href="https://lakpdf.com/pdf-to-text" />
        <meta property="og:title" content="PDF to Text Online Free | Extract Text from PDF - LAK PDF" />
        <meta property="og:description" content="Extract text from PDF online free. Copy, download or save plain text from any PDF." />
        <meta property="og:url" content="https://lakpdf.com/pdf-to-text" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://lakpdf.com/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="PDF to Text Online Free | Extract Text from PDF - LAK PDF" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="PDF to Text Online Free | Extract Text from PDF - LAK PDF" />
        <meta name="twitter:description" content="Extract text from PDF online free. Convert PDF content to plain text instantly." />
        <meta name="twitter:image" content="https://lakpdf.com/og-image.png" />
      </Helmet>
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">PDF to Text</h1>
        <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto">
          Convert PDF documents to plain text. Smartly handles both standard and scanned PDFs.
        </p>
      </div>

      {!file ? (
        <FileUploader
          onFilesSelected={handleFileSelected}
          multiple={false}
          icon={<FileText className="w-12 h-12 text-blue-500" />}
          title="Select PDF file"
          description="Drop your PDF here"
        />
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
             {/* Header */}
             <div className="border-b border-slate-100 bg-slate-50 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center text-red-500 font-bold shrink-0">
                    PDF
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate max-w-[200px] sm:max-w-xs">{file.name}</h3>
                    <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
                  </div>
                </div>
                
                <div className="flex gap-2 w-full sm:w-auto">
                   <Button variant="secondary" size="sm" onClick={handleReset} className="flex-1 sm:flex-none justify-center">
                     <RefreshCw className="w-4 h-4 mr-2" /> Start Over
                   </Button>
                   <Button variant="primary" size="sm" onClick={handleDownload} disabled={!text || status.isProcessing} className="flex-1 sm:flex-none justify-center">
                     <Download className="w-4 h-4 mr-2" /> Download
                   </Button>
                </div>
             </div>

             {/* Content Area */}
             <div className="relative min-h-[320px] sm:min-h-[500px] bg-slate-50">
               {status.isProcessing ? (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-10">
                   <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                   <h3 className="text-lg font-bold text-slate-800 mb-2">Processing Document</h3>
                   <p className="text-slate-500 text-sm max-w-xs text-center">{status.message}</p>
                   {ocrProgress > 0 && (
                     <div className="w-64 h-2 bg-slate-100 rounded-full mt-4 overflow-hidden">
                       <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${ocrProgress}%` }}></div>
                     </div>
                   )}
                 </div>
               ) : null}

               <div className="p-0 h-full">
                 <textarea 
                   className="w-full h-[420px] sm:h-[600px] p-4 sm:p-8 bg-white text-slate-800 font-mono text-xs sm:text-sm leading-relaxed focus:outline-none resize-none"
                   value={text}
                   readOnly
                   placeholder="Extracted text will appear here..."
                 />
               </div>
               
               {/* Floating Actions */}
               {!status.isProcessing && text && (
                 <div className="absolute top-4 right-4 flex gap-2">
                   <button 
                     onClick={handleCopy}
                     className="bg-white/90 backdrop-blur border border-slate-200 shadow-sm text-slate-600 hover:text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all hover:shadow-md"
                   >
                     <Copy className="w-3.5 h-3.5" /> Copy
                   </button>
                 </div>
               )}
             </div>
           </div>
        </div>
      )}
      <ToolSEOContent toolKey="/pdf-to-text" />
    </div>
    </>
  );
};
