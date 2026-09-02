import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { FileUploader } from '../components/FileUploader';
import { Button } from '../components/Button';
import { convertWordToPdf } from '../services/officeService';
import { downloadPdf, formatBytes } from '../services/fileHelpers';
import { FileType2, X, Download, ArrowRight, CheckCircle, ShieldCheck } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { NextStepPanel, RelatedActions, ToolStartPanel } from '../components/ToolProductPanels';
import { ToolSEOContent } from '../components/ToolSEOContent';

export const WordToPdf: React.FC = () => {
  const [file, setFile] = useState<{file: File, id: string, name: string, size: number} | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [readyPdf, setReadyPdf] = useState<{ blob: Blob; name: string } | null>(null);
  const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });

  const handleFileSelected = (selectedFiles: File[]) => {
    if (selectedFiles.length > 0) {
      setFile({
        id: uuidv4(),
        file: selectedFiles[0],
        name: selectedFiles[0].name,
        size: selectedFiles[0].size,
      });
      setReadyPdf(null);
      setStatus({ type: 'idle', message: '' });
    }
  };

  const handleConvert = async () => {
    if (!file) return;
    setIsProcessing(true);
    setReadyPdf(null);
    setStatus({ type: 'idle', message: 'Converting Word document to PDF...' });
    try {
      const blob = await convertWordToPdf(file.file);
      const outputFilename = `${file.name.replace(/\.[^/.]+$/, "")}.pdf`;
      setReadyPdf({ blob, name: outputFilename });
      downloadPdf(blob, outputFilename, { autoDownload: true });
      setStatus({ type: 'success', message: 'PDF ready & downloaded automatically!' });
    } catch (e) {
      console.error(e);
      setStatus({ type: 'error', message: 'Error converting Word document' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadReady = () => {
    if (!readyPdf) return;
    downloadPdf(readyPdf.blob, readyPdf.name, { autoDownload: true });
  };

  return (
    <>
      <Helmet>
        <title>Word to PDF Online Free | DOCX to PDF - LAK PDF</title>
        <meta name="description" content="Convert Word to PDF online free. Upload DOC/DOCX and download clean, formatted PDF instantly." />
        <link rel="canonical" href="https://lakpdf.com/word-to-pdf" />
        <meta property="og:title" content="Word to PDF Online Free | DOCX to PDF - LAK PDF" />
        <meta property="og:description" content="Convert Word to PDF online free. Upload DOC/DOCX and download PDF instantly." />
        <meta property="og:url" content="https://lakpdf.com/word-to-pdf" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://lakpdf.com/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Word to PDF Online Free | DOCX to PDF - LAK PDF" />
        <meta name="twitter:description" content="Convert Word to PDF online free. Upload DOC/DOCX and download PDF instantly." />
        <meta name="twitter:image" content="https://lakpdf.com/og-image.png" />
      </Helmet>

    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
          Word to PDF
        </h1>
        <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto">
          Convert DOC and DOCX documents to high-resolution, perfectly formatted PDF files.
        </p>
      </div>

      {!file ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <FileUploader
            onFilesSelected={handleFileSelected}
            multiple={false}
            accept=".docx,.doc"
            icon={<FileType2 className="w-12 h-12 text-blue-600" />}
            title="Select Word file"
            description="Drop your Word document here"
            helperText="100% Client-Side Privacy • Instant Conversion"
          />
          <ToolStartPanel
            supportedFormats={['DOC', 'DOCX']}
            fileSizeNote="No fixed upload cap is enforced. Converts tables, formatting, and images cleanly."
            privacyNote="Word conversion runs 100% in your browser."
            workflowSteps={[
              'Upload one Word document.',
              'Click Convert to PDF in the right sidebar.',
              'Your PDF is downloaded automatically.',
            ]}
          />
        </div>
      ) : (
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px] items-start">
          {/* ── LEFT COLUMN: File Overview & Settings ── */}
          <div className="space-y-6 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-black shrink-0">
                  DOCX
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 truncate max-w-[240px] sm:max-w-md">{file.name}</h3>
                  <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setFile(null);
                  setReadyPdf(null);
                  setStatus({ type: 'idle', message: '' });
                }}
                className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 space-y-2 text-xs text-blue-900">
              <p className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" /> High-Fidelity Formatting Preserved
              </p>
              <p className="opacity-90 leading-relaxed">
                Tables, headings, bullet lists, images, and fonts will be converted into crisp, high-resolution A4 PDF pages with clean unicode characters.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                <span className="text-slate-400 block font-semibold mb-1">Page Format</span>
                <span className="font-bold text-slate-800">A4 Standard (210×297mm)</span>
              </div>
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                <span className="text-slate-400 block font-semibold mb-1">Rendering Quality</span>
                <span className="font-bold text-emerald-600">High Definition (2.5x DPI)</span>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Sticky Convert & Download Sidebar ── */}
          <div className="sticky top-6 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100">
                Conversion Options
              </h3>

              <div className="space-y-4">
                <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">File Type:</span>
                    <span className="font-bold text-slate-800">Microsoft Word</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Target:</span>
                    <span className="font-bold text-slate-800">Adobe PDF (.pdf)</span>
                  </div>
                </div>

                {!readyPdf ? (
                  <button
                    type="button"
                    onClick={handleConvert}
                    disabled={isProcessing}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#e5323f] hover:bg-[#d4202d] text-white py-4 px-6 text-base font-extrabold shadow-lg shadow-red-500/25 transition-all hover:scale-[1.02] active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
                  >
                    {isProcessing ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Converting to PDF...</span>
                      </div>
                    ) : (
                      <>
                        <span>Convert to PDF</span>
                        <ArrowRight className="h-5 w-5" />
                      </>
                    )}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-2.5">
                      <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-slate-900">PDF Ready & Downloaded!</p>
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

                {status.message && !isProcessing && (
                  <p className={`text-xs text-center font-medium ${status.type === 'error' ? 'text-red-600' : status.type === 'success' ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {status.message}
                  </p>
                )}
              </div>
            </div>

            <NextStepPanel
              title="Next step"
              steps={[
                'Review the selected document.',
                'Click Convert to PDF.',
                'PDF is generated and downloaded automatically.',
              ]}
            />
            <RelatedActions
              actions={[
                { label: 'PDF to Word', to: '/pdf-to-word' },
                { label: 'Compress PDF', to: '/compress' },
                { label: 'Merge PDFs', to: '/merge-pdf' },
              ]}
            />
          </div>
        </div>
      )}
      <ToolSEOContent toolKey="/word-to-pdf" />
    </div>
    </>
  );
};
