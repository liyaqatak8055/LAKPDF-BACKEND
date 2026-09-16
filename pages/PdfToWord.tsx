import React, { useState, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from '../components/Button';
import { convertPdfToWord } from '../services/officeService';
import { downloadFile, formatBytes, getPdfPageCount } from '../services/pdfService';
import {
  FileText,
  CheckCircle,
  AlertCircle,
  Download,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Table,
  Zap,
  Upload,
} from 'lucide-react';
import { ToolSEOContent } from '../components/ToolSEOContent';
import { trackEvent } from '../utils/analytics';

export const PdfToWord: React.FC = () => {
  const [file, setFile] = useState<{ file: File; name: string; size: number } | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [readyDocx, setReadyDocx] = useState<{ blob: Blob; name: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Directly convert file with maximum accuracy
  const startDirectConversion = async (selectedFile: File) => {
    setIsProcessing(true);
    setProgress(5);
    setStatusMessage('Reading PDF document structure...');
    setReadyDocx(null);
    setErrorMessage(null);

    try {
      // 1. Get total page count
      let totalPages = 1;
      try {
        totalPages = await getPdfPageCount(selectedFile);
        setPageCount(totalPages);
      } catch {
        // Fallback page count
      }

      setProgress(15);
      setStatusMessage(`Analyzing ${totalPages} ${totalPages === 1 ? 'page' : 'pages'} with high-precision layout detection...`);

      // 2. Perform direct high-accuracy conversion
      const docxBlob = await convertPdfToWord(selectedFile, {
        method: 'auto',
        preserveLayout: true,
        onProgress: (current, total, msg) => {
          const pct = Math.min(95, Math.max(15, Math.round((current / total) * 90)));
          setProgress(pct);
          setStatusMessage(msg || `Converting page ${current} of ${total}...`);
        },
      });

      setProgress(100);
      setStatusMessage('Word document ready!');

      const outputFilename = `${selectedFile.name.replace(/\.pdf$/i, '')}.docx`;
      setReadyDocx({ blob: docxBlob, name: outputFilename });

      // 3. Instant automatic download
      downloadFile(docxBlob, outputFilename, { autoDownload: true });

      trackEvent({
        category: 'PdfToWord',
        action: 'direct_conversion_success',
        label: `${totalPages}_pages`,
      });
    } catch (err: any) {
      console.error('PDF to Word conversion failed:', err);
      setErrorMessage(
        err?.message || 'Could not convert this PDF. The document may be encrypted or corrupted.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      processSelectedFile(files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const processSelectedFile = (selectedFile: File) => {
    const isPdf =
      selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setErrorMessage('Please select a valid PDF document (.pdf).');
      return;
    }

    setFile({
      file: selectedFile,
      name: selectedFile.name,
      size: selectedFile.size,
    });

    // Directly trigger conversion automatically without requiring any option selection
    startDirectConversion(selectedFile);
  };

  const resetAll = () => {
    setFile(null);
    setPageCount(null);
    setIsProcessing(false);
    setProgress(0);
    setStatusMessage('');
    setReadyDocx(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleManualDownload = () => {
    if (!readyDocx) return;
    downloadFile(readyDocx.blob, readyDocx.name, { autoDownload: true });
  };

  return (
    <>
      <Helmet>
        <title>PDF to Word Online Free | Convert PDF to DOCX - LAK PDF</title>
        <meta
          name="description"
          content="Convert PDF to Word online free. Export accurate, fully editable DOCX from any PDF with typography, tables, and headings preserved. 100% private."
        />
        <link rel="canonical" href="https://lakpdf.com/pdf-to-word" />
        <meta property="og:title" content="PDF to Word Online Free | Convert PDF to DOCX - LAK PDF" />
        <meta
          property="og:description"
          content="Convert PDF to Word online free. Accurate, fully editable DOCX from any PDF. 100% private in your browser."
        />
        <meta property="og:url" content="https://lakpdf.com/pdf-to-word" />
        <meta property="og:type" content="website" />
      </Helmet>

      {/* Pure White Background Outer Container */}
      <div className="min-h-screen bg-white text-slate-800 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs sm:text-sm font-bold mb-3 border border-blue-200/60 shadow-sm">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Direct 1-Click Conversion • High Precision Layout • 100% Private</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-3">
              PDF to <span className="text-blue-600">Word</span>
            </h1>

            <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-500">
              Convert your PDF into an accurate, fully editable Microsoft Word (.docx) document.
              Headings, tables, paragraphs, and formatting are preserved with maximum fidelity.
            </p>
          </div>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,application/pdf"
            className="hidden"
          />

          {/* Main Card Container (Pure White) */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-100/70 p-6 sm:p-10 mb-12">
            {/* 1. INITIAL STATE: Drag and Drop Upload Zone */}
            {!file && (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="relative rounded-2xl border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/20 hover:bg-blue-50/40 p-10 sm:p-14 text-center cursor-pointer transition-all group"
              >
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/25 mb-6 group-hover:scale-105 transition-transform">
                  <FileText className="w-10 h-10" />
                </div>

                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                  Select PDF to Convert to Word
                </h3>
                <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
                  Drag and drop your PDF document here, or click to choose from your computer.
                  Conversion starts automatically with zero configuration needed.
                </p>

                <Button
                  variant="primary"
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 text-base font-bold shadow-md shadow-blue-600/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  <Upload className="w-5 h-5 mr-2" />
                  Select PDF Document
                </Button>

                <div className="mt-8 flex flex-wrap justify-center items-center gap-6 text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Direct 1-Click Conversion
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Table className="w-4 h-4 text-emerald-500" />
                    Tables & Headings Preserved
                  </span>
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-500" />
                    100% Private (No Server Uploads)
                  </span>
                </div>
              </div>
            )}

            {/* 2. PROCESSING STATE: Direct Conversion in Progress */}
            {file && isProcessing && (
              <div className="py-10 text-center space-y-6">
                <div className="inline-flex p-4 rounded-2xl bg-blue-50 text-blue-600 mb-2">
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>

                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">
                    Converting PDF to Word (.docx)...
                  </h3>
                  <p className="text-sm text-slate-500">
                    {file.name} • {formatBytes(file.size)}
                    {pageCount ? ` • ${pageCount} pages` : ''}
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="max-w-md mx-auto space-y-2">
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(8, progress)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs font-semibold text-slate-500">
                    <span>{statusMessage || 'Processing...'}</span>
                    <span>{progress}%</span>
                  </div>
                </div>

                <p className="text-xs text-slate-400">
                  Running lossless client-side conversion. Your file stays strictly on your computer.
                </p>
              </div>
            )}

            {/* 3. SUCCESS STATE: Completed & Downloaded */}
            {file && !isProcessing && readyDocx && (
              <div className="py-6 text-center space-y-6">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-lg shadow-emerald-500/10 mb-2">
                  <CheckCircle className="w-10 h-10" />
                </div>

                <div>
                  <h3 className="text-2xl font-extrabold text-slate-900 mb-1">
                    Conversion Complete!
                  </h3>
                  <p className="text-sm text-slate-600 max-w-md mx-auto">
                    Your editable Word document has been accurately generated and your download
                    started automatically.
                  </p>
                </div>

                {/* File info card */}
                <div className="max-w-md mx-auto p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-extrabold flex items-center justify-center text-xs shrink-0">
                      DOCX
                    </div>
                    <div className="truncate">
                      <p className="font-bold text-sm text-slate-900 truncate">{readyDocx.name}</p>
                      <p className="text-xs text-slate-500">
                        Microsoft Word Document • {pageCount ? `${pageCount} pages` : 'Ready'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-100/70 px-2.5 py-1 rounded-full shrink-0">
                    Ready
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto pt-2">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 shadow-md shadow-blue-600/20"
                    onClick={handleManualDownload}
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download Word Again
                  </Button>

                  <Button
                    variant="secondary"
                    size="lg"
                    className="w-full sm:w-auto font-bold py-3.5 border-slate-300 hover:bg-slate-50"
                    onClick={resetAll}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Convert Another PDF
                  </Button>
                </div>
              </div>
            )}

            {/* 4. ERROR STATE */}
            {file && !isProcessing && errorMessage && (
              <div className="py-8 text-center space-y-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-200">
                  <AlertCircle className="w-8 h-8" />
                </div>

                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">
                    Conversion Encountered an Issue
                  </h3>
                  <p className="text-sm text-rose-600 max-w-md mx-auto">{errorMessage}</p>
                </div>

                <div className="flex items-center justify-center gap-3">
                  <Button
                    variant="primary"
                    onClick={() => file && startDirectConversion(file.file)}
                    className="bg-blue-600 hover:bg-blue-700 font-bold"
                  >
                    Try Again
                  </Button>
                  <Button variant="secondary" onClick={resetAll}>
                    Upload Another PDF
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SEO & Informational Content */}
      <div className="bg-white">
        <ToolSEOContent toolKey="/pdf-to-word" />
      </div>
    </>
  );
};

export default PdfToWord;
