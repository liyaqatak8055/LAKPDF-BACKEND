import React, { useState, useEffect, useRef } from 'react';
import { FileUploader } from '../components/FileUploader';
import { Button } from '../components/Button';
import { Scan, FileText, Download, Copy, RefreshCw, Loader2, AlertCircle, CheckCircle, FileType, Settings, Check, Layout } from 'lucide-react';
import { pdfjs, formatBytes } from '../services/pdfService';
import { v4 as uuidv4 } from 'uuid';
import { setLatestDownload } from '../utils/downloadCenter';
import { postProcessOcrText, preprocessCanvasForOcr } from '../utils/ocrPostProcess';
import { Helmet } from 'react-helmet-async';
import { ToolSEOContent } from '../components/ToolSEOContent';

const loadTesseract = async () => {
  const mod = await import('tesseract.js');
  return (mod as any).default || mod;
};

const loadJsPdf = async () => {
  const mod = await import('jspdf');
  return (mod as any).jsPDF;
};

const loadDocx = async () => {
  return import('docx');
};

export const OcrPdf: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'initializing' | 'processing' | 'done' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const workerRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Settings state
  const [language, setLanguage] = useState('eng');
  const [psmMode, setPsmMode] = useState('3'); // '3' is AUTO
  const [enhancement, setEnhancement] = useState<'grayscale' | 'binarize' | 'none'>('grayscale');
  const [resolutionScale, setResolutionScale] = useState<number>(2.5);
  const [preserveLayout, setPreserveLayout] = useState<boolean>(true);

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  const handleFileSelected = (files: File[]) => {
    if (files.length > 0) {
      setFile(files[0]);
      setStatus('idle');
      setText('');
      setProgress(0);
      setStatusMessage('');
    }
  };

  const cleanOcrText = (raw: string, preserveLines: boolean) => {
    if (!raw) return '';
    if (preserveLines) {
      // Normalize line endings and perform basic trim cleanups while keeping line structure
      return raw
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .map(line => line.trim().replace(/\s{2,}/g, ' '))
        .filter(line => line.length > 0)
        .join('\n');
    } else {
      // Use advanced post-processing to merge paragraphs
      return postProcessOcrText(raw);
    }
  };

  const processFile = async () => {
    if (!file) return;
    setStatus('initializing');
    setText('');
    setProgress(0);
    setStatusMessage('Initializing OCR engine... (This may take a moment)');

    try {
      const Tesseract = await loadTesseract();
      const worker = await Tesseract.createWorker(language, 1, {
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
            setStatusMessage(`Recognizing text... ${Math.round(m.progress * 100)}%`);
          } else if (m.status === 'loading tesseract core') {
            setStatusMessage('Loading OCR Core...');
          } else if (m.status === 'initializing api') {
             setStatusMessage('Initializing API...');
          } else {
            setStatusMessage(m.status);
          }
        }
      });
      
      workerRef.current = worker;
      
      // Auto-configure parameters based on settings
      await worker.setParameters({
        tessedit_pageseg_mode: psmMode,
        preserve_interword_spaces: '1',
        user_defined_dpi: '300',
      });

      setStatus('processing');
      let extractedText = '';

      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        const totalPages = pdf.numPages;
        
        for (let i = 1; i <= totalPages; i++) {
           setStatusMessage(`Scanning Page ${i} of ${totalPages}...`);
           
           const page = await pdf.getPage(i);
           const viewport = page.getViewport({ scale: resolutionScale }); 
           
           const canvas = document.createElement('canvas');
           canvas.width = viewport.width;
           canvas.height = viewport.height;
           const ctx = canvas.getContext('2d');
           
           if (ctx) {
             ctx.fillStyle = '#FFFFFF';
             ctx.fillRect(0, 0, canvas.width, canvas.height);
             
             await page.render({ canvasContext: ctx, viewport }).promise;
             
             // Preprocess canvas based on user settings
             let processedCanvas = canvas;
             if (enhancement === 'binarize') {
               processedCanvas = preprocessCanvasForOcr(canvas, {
                 contrastBoost: 1.45,
                 thresholdOffset: -3,
                 binarize: true,
               });
             } else if (enhancement === 'grayscale') {
               processedCanvas = preprocessCanvasForOcr(canvas, {
                 contrastBoost: 1.3,
                 binarize: false,
               });
             }

             const blob = await new Promise<Blob | null>(resolve => processedCanvas.toBlob(resolve, 'image/png'));
             if (blob) {
                 setProgress(0);
                 const { data: { text } } = await worker.recognize(blob);
                 extractedText += cleanOcrText(text, preserveLayout) + "\n\n";
             }
           }
        }
      } else {
        setStatusMessage('Enhancing image...');
        // For direct image uploads, render to a canvas first to apply selected enhancements
        const img = new Image();
        img.src = URL.createObjectURL(file);
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          
          let processedCanvas = canvas;
          if (enhancement === 'binarize') {
            processedCanvas = preprocessCanvasForOcr(canvas, {
              contrastBoost: 1.45,
              thresholdOffset: -3,
              binarize: true,
            });
          } else if (enhancement === 'grayscale') {
            processedCanvas = preprocessCanvasForOcr(canvas, {
              contrastBoost: 1.3,
              binarize: false,
            });
          }

          const blob = await new Promise<Blob | null>(resolve => processedCanvas.toBlob(resolve, 'image/png'));
          if (blob) {
            setStatusMessage('Recognizing text...');
            const { data: { text } } = await worker.recognize(blob);
            extractedText = cleanOcrText(text, preserveLayout);
          }
        }
        URL.revokeObjectURL(img.src);
      }

      setText(extractedText.trim());
      setStatus('done');
      setStatusMessage('OCR Complete!');
      
      await worker.terminate();
      workerRef.current = null;
      
    } catch (e: any) {
      console.error(e);
      setStatusMessage(`Error: ${e.message || "Failed to process"}`);
      setStatus('error');
      if (workerRef.current) {
        await workerRef.current.terminate();
        workerRef.current = null;
      }
    }
  };

  const copyText = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadAsTxt = () => {
    const blob = new Blob([text], { type: 'text/plain' });
    const outputFilename = `${file?.name.split('.')[0] || 'document'}.txt`;
    setLatestDownload({
      filename: outputFilename,
      blob,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = outputFilename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAsPdf = async () => {
    const jsPDF = await loadJsPdf();
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxLineWidth = pageWidth - margin * 2;
    const lineHeight = 7;
    
    const lines = doc.splitTextToSize(text, maxLineWidth);
    let cursorY = margin;
    
    lines.forEach((line: string) => {
      if (cursorY + lineHeight > pageHeight - margin) {
        doc.addPage();
        cursorY = margin;
      }
      doc.text(line, margin, cursorY);
      cursorY += lineHeight;
    });
    
    const outputFilename = `${file?.name.split('.')[0] || 'document'}-clean.pdf`;
    const outputBlob = doc.output('blob');
    setLatestDownload({
      filename: outputFilename,
      blob: outputBlob,
    });
    doc.save(outputFilename);
  };

  const downloadAsWord = async () => {
    const { Document, Packer, Paragraph, TextRun } = await loadDocx();
    const doc = new Document({
      sections: [{
        properties: {},
        children: text.split('\n').map(line => new Paragraph({
          children: [new TextRun(line)],
        })),
      }],
    });

    const blob = await Packer.toBlob(doc);
    const outputFilename = `${file?.name.split('.')[0] || 'document'}.docx`;
    setLatestDownload({
      filename: outputFilename,
      blob,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = outputFilename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setFile(null);
    setText('');
    setStatus('idle');
  };

  return (
    <>
      <Helmet>
        <title>OCR PDF Online Free | Extract Text from PDF - LAK PDF</title>
        <meta name="description" content="OCR PDF online free and extract searchable text from scanned PDF files." />
        <link rel="canonical" href="https://lakpdf.com/ocr-pdf" />
        <meta property="og:title" content="OCR PDF Online Free | Extract Text from PDF - LAK PDF" />
        <meta property="og:description" content="OCR PDF online free and extract searchable text from scanned PDF files." />
        <meta property="og:url" content="https://lakpdf.com/ocr-pdf" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://lakpdf.com/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="OCR PDF Online Free | Extract Text from PDF - LAK PDF" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="OCR PDF Online Free | Extract Text from PDF - LAK PDF" />
        <meta name="twitter:description" content="OCR PDF online free and extract searchable text from scanned PDF files." />
        <meta name="twitter:image" content="https://lakpdf.com/og-image.png" />
      </Helmet>
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">OCR PDF Scanner</h1>
        <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto">
          Convert scanned documents and images into clean, editable text with bilingual support.
        </p>
      </div>

      {!file ? (
        <FileUploader
          onFilesSelected={handleFileSelected}
          multiple={false}
          accept=".pdf, .png, .jpg, .jpeg, .bmp"
          icon={<Scan className="w-12 h-12 text-cyan-500" />}
          title="Select Document"
          description="Drop PDF or Image to scan"
        />
      ) : (
        <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in slide-in-from-bottom-4">
           {/* Left Column: Controls & Status */}
           <div className="w-full lg:w-1/3 space-y-6">
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
               <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-12 h-12 bg-white border border-slate-200 text-cyan-600 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                    {file.type.includes('pdf') ? <FileText className="w-6 h-6" /> : <Scan className="w-6 h-6" />}
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="font-bold text-slate-900 truncate" title={file.name}>{file.name}</h3>
                    <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
                  </div>
                  <button onClick={reset} className="ml-auto text-slate-400 hover:text-red-500">
                    <RefreshCw className="w-5 h-5" />
                  </button>
               </div>

               {/* Configuration Settings */}
               <div className="space-y-4 pt-4 border-t border-slate-100">
                 <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                   <Settings className="w-4 h-4 text-cyan-600" />
                   <span>OCR Settings</span>
                 </div>

                 {/* Language Select */}
                 <div>
                   <label className="block text-xs font-semibold text-slate-600 mb-1">OCR Language</label>
                   <select
                     value={language}
                     onChange={(e) => setLanguage(e.target.value)}
                     disabled={status !== 'idle'}
                     className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 bg-white text-slate-700"
                   >
                     <option value="eng">English (eng)</option>
                     <option value="hin">Hindi (hin)</option>
                     <option value="eng+hin">English + Hindi (eng+hin)</option>
                     <option value="spa">Spanish (spa)</option>
                     <option value="fra">French (fra)</option>
                     <option value="deu">German (deu)</option>
                   </select>
                 </div>

                 {/* Image Filter */}
                 <div>
                   <label className="block text-xs font-semibold text-slate-600 mb-1">Image Filter</label>
                   <select
                     value={enhancement}
                     onChange={(e) => setEnhancement(e.target.value as any)}
                     disabled={status !== 'idle'}
                     className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 bg-white text-slate-700"
                   >
                     <option value="grayscale">Grayscale Contrast (Recommended)</option>
                     <option value="binarize">Black & White Binarize (Scans/Faxes)</option>
                     <option value="none">No Filter (Original)</option>
                   </select>
                 </div>

                 {/* PSM Mode */}
                 <div>
                   <label className="block text-xs font-semibold text-slate-600 mb-1">Layout Detection (PSM)</label>
                   <select
                     value={psmMode}
                     onChange={(e) => setPsmMode(e.target.value)}
                     disabled={status !== 'idle'}
                     className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 bg-white text-slate-700"
                   >
                     <option value="3">Auto Layout (Default)</option>
                     <option value="4">Single Column of Text</option>
                     <option value="6">Single Uniform Text Block</option>
                   </select>
                 </div>

                 {/* Scan Resolution / Scale */}
                 {file.type === 'application/pdf' && (
                   <div>
                     <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                       <span>Scan DPI Resolution</span>
                       <span className="text-cyan-600 font-bold">{resolutionScale === 1.5 ? 'Standard' : resolutionScale === 2.5 ? 'High' : 'Maximum'}</span>
                     </div>
                     <input
                       type="range"
                       min={1.5}
                       max={3.5}
                       step={1.0}
                       value={resolutionScale}
                       onChange={(e) => setResolutionScale(Number(e.target.value))}
                       disabled={status !== 'idle'}
                       className="w-full accent-cyan-500"
                     />
                   </div>
                 )}

                 {/* Preserve Layout */}
                 <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none pt-1">
                   <input
                     type="checkbox"
                     checked={preserveLayout}
                     onChange={(e) => setPreserveLayout(e.target.checked)}
                     disabled={status !== 'idle'}
                     className="w-4 h-4 rounded border-slate-300 accent-cyan-500"
                   />
                   <span>Preserve original line-breaks</span>
                 </label>
               </div>

               {status === 'idle' && (
                  <Button onClick={processFile} className="w-full bg-cyan-600 hover:bg-cyan-700 shadow-cyan-500/20" size="lg">
                    <Scan className="w-5 h-5 mr-2" /> Start OCR Scanning
                  </Button>
               )}

               {(status === 'initializing' || status === 'processing') && (
                 <div className="space-y-6 py-4">
                   <div className="flex flex-col items-center justify-center text-center">
                       <Loader2 className="w-10 h-10 text-cyan-500 animate-spin mb-4" />
                       <h3 className="font-bold text-slate-800 text-lg mb-1">Scanning...</h3>
                       <p className="text-sm text-slate-500">{statusMessage}</p>
                   </div>
                   
                   <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                     <div 
                       className="bg-cyan-500 h-full rounded-full transition-all duration-300 ease-out relative overflow-hidden" 
                       style={{ width: `${Math.max(5, progress)}%` }}
                     >
                       <div className="absolute inset-0 bg-white/30 w-full h-full animate-[shimmer_2s_infinite]"></div>
                     </div>
                   </div>
                 </div>
               )}

               {status === 'error' && (
                 <div className="bg-red-50 p-6 rounded-xl border border-red-100 text-center">
                   <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                   <h3 className="font-bold text-red-700 mb-2">Scan Failed</h3>
                   <p className="text-sm text-red-600 mb-4">{statusMessage}</p>
                   <Button onClick={reset} variant="secondary" className="w-full">Try Again</Button>
                 </div>
               )}

               {status === 'done' && (
                 <div className="bg-green-50 p-6 rounded-xl border border-green-100 text-center space-y-3">
                   <div className="flex flex-col items-center">
                     <CheckCircle className="w-10 h-10 text-green-500 mb-2" />
                     <h3 className="font-bold text-green-700">Success!</h3>
                     <p className="text-xs text-green-600">Document converted successfully.</p>
                   </div>
                   <div className="flex flex-col gap-2">
                     <Button onClick={downloadAsPdf} variant="primary" className="bg-red-600 hover:bg-red-700 w-full">
                       <Download className="w-4 h-4 mr-2" /> Download as PDF
                     </Button>
                     <Button onClick={downloadAsWord} variant="primary" className="bg-blue-600 hover:bg-blue-700 w-full">
                       <FileType className="w-4 h-4 mr-2" /> Download as Word
                     </Button>
                     <Button onClick={downloadAsTxt} variant="secondary" className="w-full">
                       <FileText className="w-4 h-4 mr-2" /> Download Text
                     </Button>
                   </div>
                 </div>
               )}
             </div>
           </div>

           {/* Right Column: MS Word-style Editor */}
           <div className="w-full lg:w-2/3 bg-slate-100 rounded-2xl border border-slate-200 p-3 sm:p-5 md:p-8 flex flex-col items-center min-h-[420px] sm:min-h-[600px] shadow-inner">
               <div className="w-full flex items-center justify-between mb-4 px-2">
                 <span className="text-sm font-semibold text-slate-600 flex items-center gap-1">
                   <Layout className="w-4 h-4 text-cyan-600" />
                   Document Editor
                 </span>
                 {text && (
                   <button
                     onClick={copyText}
                     className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                       copied 
                         ? 'bg-green-50 border-green-200 text-green-700' 
                         : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                     }`}
                   >
                     {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                     {copied ? 'Copied!' : 'Copy Text'}
                   </button>
                 )}
               </div>
               <div className="w-full max-w-full sm:max-w-[210mm] bg-white shadow-xl min-h-[420px] sm:min-h-[297mm] p-4 sm:p-[20mm] md:p-[25mm] relative rounded-lg border border-slate-200">
                 {status !== 'done' && !text ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 pointer-events-none">
                      <Scan className="w-20 h-20 mb-4 opacity-20 animate-pulse" />
                      <p className="text-lg font-medium opacity-50">Document Preview</p>
                      <p className="text-xs opacity-40 mt-1 max-w-[220px] text-center">Your OCR scanned text will appear here ready to edit.</p>
                    </div>
                 ) : (
                   <textarea 
                     ref={textareaRef}
                     className="w-full h-full min-h-[460px] sm:min-h-[800px] bg-transparent text-slate-900 font-sans text-sm sm:text-base leading-relaxed resize-none focus:outline-none"
                     value={text}
                     onChange={(e) => setText(e.target.value)}
                     placeholder="Extracted text will appear here..."
                     spellCheck={false}
                   />
                 )}
               </div>
               
               {status === 'done' && (
                 <div className="mt-4 flex gap-2 text-sm text-slate-500">
                   <span>{text.split(/\s+/).filter(Boolean).length} words</span>
                   <span>•</span>
                   <span>{text.length} characters</span>
                   <span>•</span>
                   <span>Editable Document</span>
                 </div>
               )}
           </div>
        </div>
      )}
      <ToolSEOContent toolKey="/ocr-pdf" />
    </div>
    </>
  );
};
