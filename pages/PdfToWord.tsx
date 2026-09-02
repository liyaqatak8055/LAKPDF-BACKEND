import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { FileUploader } from '../components/FileUploader';
import { Button } from '../components/Button';
import { convertPdfToWord, convertPdfToWordOCR, detectPdfType, detectPdfScriptProfile, PdfScriptProfile } from '../services/officeService';
import { downloadFile, formatBytes, getPdfPageCount, parsePageRange } from '../services/pdfService';
import { FileText, X, Zap, Scan, CheckCircle, AlertCircle, LayoutGrid, Pencil, Download, ArrowRight } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { NextStepPanel, RelatedActions, ToolStartPanel } from '../components/ToolProductPanels';
import { ToolSEOContent } from '../components/ToolSEOContent';

type ConversionMethod = 'auto' | 'ocr';
type PdfType = 'text' | 'scanned' | null;
type OutputMode = 'layout' | 'editable';
type OcrStrength = 'fast' | 'balanced' | 'accurate';
type DocumentPreset = 'general' | 'ticket' | 'invoice' | 'form';

export const PdfToWord: React.FC = () => {
  const [file, setFile] = useState<{file: File, id: string, name: string, size: number} | null>(null);
  const [pdfType, setPdfType] = useState<PdfType>(null);
  const [conversionMethod, setConversionMethod] = useState<ConversionMethod>('auto');
  const [outputMode, setOutputMode] = useState<OutputMode>('editable');
  const [ocrStrength, setOcrStrength] = useState<OcrStrength>('balanced');
  const [documentPreset, setDocumentPreset] = useState<DocumentPreset>('general');
  const [includeReviewSection, setIncludeReviewSection] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [pageRange, setPageRange] = useState<string>('all');
  const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });
  const [scriptProfile, setScriptProfile] = useState<PdfScriptProfile | null>(null);
  const [readyDocx, setReadyDocx] = useState<{ blob: Blob; name: string } | null>(null);

  const handleFileSelected = async (selectedFiles: File[]) => {
    if (selectedFiles.length > 0) {
      const selectedFile = selectedFiles[0];
      const isPdf = selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf');
      if (!isPdf) {
        setStatus({ type: 'error', message: 'Please select a valid PDF file.' });
        return;
      }
      const fileData = {
        id: uuidv4(),
        file: selectedFile,
        name: selectedFile.name,
        size: selectedFile.size,
      };

      setFile(fileData);
      setPdfType(null);
      setConversionMethod('auto');
      setOutputMode('editable');
      setOcrStrength('balanced');
      setDocumentPreset('general');
      setIncludeReviewSection(true);
      setProgress(0);
      setPageRange('all');
      setStatus({ type: 'idle', message: '' });
      setPageCount(null);
      setScriptProfile(null);
      setReadyDocx(null);

      // Auto-detect PDF type
      setIsDetecting(true);
      try {
        const totalPages = await getPdfPageCount(selectedFile);
        setPageCount(totalPages);
        const [detectedType, profile] = await Promise.all([
          detectPdfType(selectedFile),
          detectPdfScriptProfile(selectedFile)
        ]);
        setPdfType(detectedType);
        setScriptProfile(profile);
        // Auto-select best method based on detected type
        if (detectedType === 'scanned' || profile.forceOcr) {
          setConversionMethod('ocr');
        }
      } catch (error) {
        console.error('PDF type detection failed:', error);
        setPdfType('text'); // Default to text if detection fails
      } finally {
        setIsDetecting(false);
      }
    }
  };

  const handleConvert = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProgress(0);
    setStatus({ type: 'idle', message: 'Preparing conversion...' });
    setReadyDocx(null);

    let selectedPages: number[] | undefined;
    if (pageCount && pageRange.trim().toLowerCase() !== 'all') {
      const parsed = parsePageRange(pageRange, pageCount);
      if (parsed.error || parsed.pages.length === 0) {
        setIsProcessing(false);
        setStatus({ type: 'error', message: parsed.error || 'Invalid page range.' });
        return;
      }
      selectedPages = parsed.pages.map((idx) => idx + 1);
    }

    try {
      let blob: Blob;

      if (conversionMethod === 'auto') {
        const shouldForceOcr = scriptProfile?.forceOcr === true;
        if (pdfType === 'text' && !shouldForceOcr) {
          // Text PDFs should prefer direct extraction for stable output.
          blob = await convertPdfToWord(file.file, { method: 'text' });
          setProgress(100);
        } else {
          const language = 'eng';
          blob = await convertPdfToWordOCR(file.file, language, {
            preserveLayout: outputMode === 'layout',
            pages: selectedPages,
            forceOcr: true,
            ocrStrength,
            preset: documentPreset,
            includeReviewSection,
            onProgress: (current, total) => {
              setProgress(Math.round((current / total) * 100));
              setStatus({ type: 'idle', message: `Processing page ${current} of ${total}...` });
            }
          });
        }
      } else {
        // OCR mode: use selected language
        const effectiveLanguage = 'eng';
        blob = await convertPdfToWordOCR(file.file, effectiveLanguage, {
          preserveLayout: outputMode === 'layout',
          pages: selectedPages,
          forceOcr: true,
          ocrStrength,
          preset: documentPreset,
          includeReviewSection,
          onProgress: (current, total) => {
            setProgress(Math.round((current / total) * 100));
            setStatus({ type: 'idle', message: `Processing page ${current} of ${total}...` });
          }
        });
      }

      const outputFilename = `${file.name.replace('.pdf', '')}.docx`;
      setReadyDocx({ blob, name: outputFilename });
      downloadFile(blob, outputFilename, { autoDownload: true });
      setStatus({ type: 'success', message: 'Word file ready & downloaded automatically!' });
    } catch (e) {
      console.error(e);
      setStatus({ type: 'error', message: `Conversion failed: ${e instanceof Error ? e.message : 'Unknown error'}` });
    } finally {
      setIsProcessing(false);
    }
  };

  const getMethodDescription = () => {
    switch (conversionMethod) {
      case 'auto':
        return 'Smart OCR conversion - automatically optimized for your PDF';
      case 'ocr':
        return 'Advanced OCR processing with language selection';
      default:
        return '';
    }
  };

  const handleDownloadReady = () => {
    if (!readyDocx) return;
    downloadFile(readyDocx.blob, readyDocx.name, { autoDownload: true });
  };

  return (
    <>
      <Helmet>
        <title>PDF to Word Online Free | Convert PDF to DOCX - LAK PDF</title>
        <meta name="description" content="Convert PDF to Word online free. Export fully editable DOCX from any PDF with smart OCR detection. No signup required." />
        <link rel="canonical" href="https://lakpdf.com/pdf-to-word" />
        <meta property="og:title" content="PDF to Word Online Free | Convert PDF to DOCX - LAK PDF" />
        <meta property="og:description" content="Convert PDF to Word online free. Export fully editable DOCX from any PDF with smart OCR detection. No signup required." />
        <meta property="og:url" content="https://lakpdf.com/pdf-to-word" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://lakpdf.com/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="PDF to Word Online Free | Convert PDF to DOCX - LAK PDF" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="PDF to Word Online Free | Convert PDF to DOCX - LAK PDF" />
        <meta name="twitter:description" content="Convert PDF to Word online free. Export fully editable DOCX from any PDF with smart OCR detection. No signup required." />
        <meta name="twitter:image" content="https://lakpdf.com/og-image.png" />
      </Helmet>
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">PDF to Word</h1>
        <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto">
          Convert your PDF files to editable Word documents with smart detection and OCR support.
        </p>
      </div>

      {!file ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <FileUploader
            onFilesSelected={handleFileSelected}
            multiple={false}
            accept=".pdf"
            icon={<FileText className="w-12 h-12 text-blue-600" />}
            title="Select PDF file"
            description="Drop your PDF here - we'll auto-detect the type"
            helperText="Runs 100% in your browser"
          />
          <ToolStartPanel
            supportedFormats={['PDF']}
            fileSizeNote="No fixed upload cap is enforced. Scanned or large PDFs can take longer to process."
            privacyNote="Detection, OCR, and conversion run in your browser."
            workflowSteps={[
              'Upload one PDF.',
              'Review detected type and output options.',
              'Convert and download the Word file.',
            ]}
          />
        </div>
      ) : (
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px] items-start">
        <div className="space-y-6">
          {/* File Info */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center text-red-500 font-bold shrink-0">
                  PDF
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 truncate max-w-[240px]">{file.name}</h3>
                  <p className="text-sm text-slate-500">
                    {formatBytes(file.size)}{pageCount ? ` • ${pageCount} pages` : ''}
                  </p>
                </div>
              </div>
              <button onClick={() => { setFile(null); setPageCount(null); setScriptProfile(null); setStatus({ type: 'idle', message: '' }); setReadyDocx(null); }} className="text-slate-400 hover:text-red-500 cursor-pointer">
                <X />
              </button>
            </div>

            {/* PDF Type Detection */}
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                {isDetecting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm font-medium text-slate-700">Detecting PDF type...</span>
                  </>
                ) : pdfType ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-sm font-medium text-slate-700">
                      Detected: {pdfType === 'text' ? 'Text-based PDF' : 'Scanned/Image PDF'}
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                    <span className="text-sm font-medium text-slate-700">Could not detect PDF type</span>
                  </>
                )}
              </div>
              {pdfType && (
                <p className="text-xs text-slate-500">{getMethodDescription()}</p>
              )}
              {scriptProfile?.forceOcr && (
                <p className="text-xs text-amber-700 mt-2">
                  {scriptProfile.reason}
                </p>
              )}
            </div>
          </div>

          {/* Conversion Options */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Conversion Method</h3>

            {/* Method Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              <button
                onClick={() => setConversionMethod('auto')}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  conversionMethod === 'auto'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Zap className="w-6 h-6 mx-auto mb-2" />
                <div className="text-sm font-medium">Auto Detect</div>
                <div className="text-xs opacity-75">Smart OCR</div>
              </button>

              <button
                onClick={() => setConversionMethod('ocr')}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  conversionMethod === 'ocr'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Scan className="w-6 h-6 mx-auto mb-2" />
                <div className="text-sm font-medium">OCR</div>
                <div className="text-xs opacity-75">Advanced</div>
              </button>
            </div>

            {(conversionMethod === 'ocr' || (conversionMethod === 'auto' && pdfType === 'scanned')) && (
              <div className="border-t border-slate-100 pt-4">
                <p className="text-sm font-medium text-slate-700">OCR Language: English (fixed)</p>
                <p className="text-xs text-slate-500 mt-1">Hindi option temporarily disabled for stable output.</p>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Document Preset</label>
                    <select
                      value={documentPreset}
                      onChange={(e) => setDocumentPreset(e.target.value as DocumentPreset)}
                      className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="general">General</option>
                      <option value="ticket">Ticket</option>
                      <option value="invoice">Invoice</option>
                      <option value="form">Form</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">OCR Strength</label>
                    <select
                      value={ocrStrength}
                      onChange={(e) => setOcrStrength(e.target.value as OcrStrength)}
                      className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="fast">Fast</option>
                      <option value="balanced">Balanced</option>
                      <option value="accurate">Accurate</option>
                    </select>
                  </div>
                </div>
                <label className="mt-3 flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={includeReviewSection}
                    onChange={(e) => setIncludeReviewSection(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Add low-confidence review list at end of DOCX
                </label>
              </div>
            )}

            <div className="border-t border-slate-100 pt-4 mt-4">
              <div className="text-sm font-medium text-slate-700 mb-3">Output Style</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setOutputMode('layout')}
                  className={`p-3 rounded-xl border-2 transition-all cursor-pointer ${
                    outputMode === 'layout'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <LayoutGrid className="w-5 h-5 mx-auto mb-1" />
                  <div className="text-sm font-medium">Layout Preserve</div>
                  <div className="text-xs opacity-75">Forms/Tables Best</div>
                </button>
                <button
                  onClick={() => setOutputMode('editable')}
                  className={`p-3 rounded-xl border-2 transition-all cursor-pointer ${
                    outputMode === 'editable'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Pencil className="w-5 h-5 mx-auto mb-1" />
                  <div className="text-sm font-medium">Editable Text</div>
                  <div className="text-xs opacity-75">Paragraph Focused</div>
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                `Layout Preserve` ticket/invoice/table documents ke liye recommended hai.
              </p>
            </div>

            <div className="border-t border-slate-100 pt-4 mt-4">
              <label className="text-sm font-medium text-slate-700">Page Range</label>
              <input
                type="text"
                value={pageRange}
                onChange={(e) => setPageRange(e.target.value)}
                placeholder="all or 1,3,5-8"
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-500 mt-2">Use `all` for full document, or ranges like `1,3,7-10`.</p>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Sticky Convert & Actions Sidebar ────────────────── */}
        <div className="sticky top-6 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100">
              PDF to Word Options
            </h3>

            <div className="space-y-4">
              <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Pages:</span>
                  <span className="font-semibold text-slate-800">{pageRange || 'All'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Mode:</span>
                  <span className="font-semibold text-slate-800">{outputMode === 'layout' ? 'Layout Preserve' : 'Editable Text'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Method:</span>
                  <span className="font-semibold text-slate-800">{conversionMethod === 'auto' ? 'Auto Detect' : 'OCR'}</span>
                </div>
              </div>

              {/* Convert / Download Actions */}
              {!readyDocx ? (
                <button
                  type="button"
                  onClick={handleConvert}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#e5323f] hover:bg-[#d4202d] text-white py-4 px-6 text-base font-extrabold shadow-lg shadow-red-500/25 transition-all hover:scale-[1.02] active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
                >
                  {isProcessing ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Converting...</span>
                    </div>
                  ) : (
                    <>
                      <span>Convert to Word</span>
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-2.5">
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-slate-900">Word File Ready!</p>
                      <p className="text-[10px] text-slate-500">{readyDocx.name}</p>
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full py-4 text-base font-bold bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30 cursor-pointer"
                    onClick={handleDownloadReady}
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download Word Again
                  </Button>
                </div>
              )}

              {/* Progress Bar */}
              {isProcessing && (
                <div className="mt-3">
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#e5323f] h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(10, progress)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 text-center">
                    {status.message || 'Processing your PDF...'}
                  </p>
                </div>
              )}

              {status.message && !isProcessing && (
                <p className={`mt-2 text-xs text-center font-medium ${status.type === 'error' ? 'text-red-600' : status.type === 'success' ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {status.message}
                </p>
              )}
            </div>
          </div>

          <NextStepPanel
            title="Next step"
            steps={[
              'Review the detected PDF type.',
              'Choose the output style and page range.',
              'Convert and download the Word file.',
            ]}
          />
          <RelatedActions
            actions={[
              { label: 'OCR PDF', to: '/ocr-pdf' },
              { label: 'PDF to PowerPoint', to: '/pdf-to-powerpoint' },
              { label: 'Compress PDF', to: '/compress' },
            ]}
          />
        </div>
        </div>
      )}
    </div>
      <ToolSEOContent toolKey="/pdf-to-word" />
    </>
  );
};
