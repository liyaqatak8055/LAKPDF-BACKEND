import React, { useRef, useState } from 'react';
import {
  Upload,
  FileText,
  AlertCircle,
  FileCheck2,
  RefreshCw,
  Trash2,
  BookOpen,
  Sparkles,
  HelpCircle,
  FileQuestion,
} from 'lucide-react';
import { formatBytes } from '../../services/pdfService';
import { Button } from '../Button';

interface McqUploaderProps {
  onFileLoaded: (file: File, extractedText: string, totalPages: number) => void;
  isLoading: boolean;
  onSampleLoaded: (sampleText: string, sampleTitle: string) => void;
  currentFile: File | null;
  pageCount?: number;
  wordCount?: number;
  onResetFile: () => void;
}

const MAX_PDF_SIZE = 20 * 1024 * 1024; // 20MB

export const McqUploader: React.FC<McqUploaderProps> = ({
  onFileLoaded,
  isLoading,
  onSampleLoaded,
  currentFile,
  pageCount,
  wordCount,
  onResetFile,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<{
    title: string;
    message: string;
    recovery: string;
  } | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [readingStatus, setReadingStatus] = useState('');

  const processFile = async (file: File) => {
    setValidationError(null);

    // 1. File size check
    if (file.size === 0) {
      setValidationError({
        title: 'Empty PDF Document',
        message: 'The uploaded file contains 0 bytes and cannot be processed.',
        recovery: 'Please upload a valid, non-empty study document.',
      });
      return;
    }
    if (file.size > MAX_PDF_SIZE) {
      setValidationError({
        title: 'PDF File Too Large',
        message: `File size (${formatBytes(file.size)}) exceeds the 20MB limit.`,
        recovery: 'Please select a study PDF under 20MB.',
      });
      return;
    }

    // 2. File extension check
    const fileName = (file.name || '').toLowerCase();
    if (!fileName.endsWith('.pdf')) {
      setValidationError({
        title: 'Unsupported File Format',
        message: `"${file.name}" is not a PDF file.`,
        recovery: 'Please upload a PDF document (.pdf) containing study notes or textbook chapters.',
      });
      return;
    }

    // 3. Extract text
    setIsExtracting(true);
    setReadingStatus('Extracting document text...');

    try {
      const { extractTextFromPDF } = await import('../../services/pdfTextExtractor');
      const data = await extractTextFromPDF(file);

      const cleanText = (data?.fullText || '').trim();

      if (!cleanText || cleanText.length < 50) {
        setValidationError({
          title: 'Unable to Read Text from this PDF',
          message:
            'We could not extract readable educational text from this PDF. It appears to be a scanned image or photo without selectable text.',
          recovery:
            'Upload another PDF that contains selectable text, or export directly from Word/Google Docs as PDF.',
        });
        setIsExtracting(false);
        return;
      }

      onFileLoaded(file, cleanText, data.totalPages || 1);
    } catch (err: any) {
      console.error('[McqUploader] text extraction failed:', err);
      setValidationError({
        title: 'PDF Extraction Failure',
        message: err?.message || 'Could not parse text from this PDF document.',
        recovery: 'Upload Another PDF that is unencrypted and not password-protected.',
      });
    } finally {
      setIsExtracting(false);
      setReadingStatus('');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
      e.target.value = '';
    }
  };

  // Educational Sample Presets
  const handleLoadBiologySample = () => {
    const sampleText = `Cell Biology and Genetics — Chapter Review

1. Cell Structure and Organelles:
The cell is the fundamental structural and functional unit of all living organisms. Eukaryotic cells possess a distinct nucleus enclosed by a nuclear envelope, along with membrane-bound organelles such as mitochondria, the endoplasmic reticulum (ER), and the Golgi apparatus. Mitochondria are universally termed the "powerhouse of the cell" because they synthesize adenosine triphosphate (ATP) through aerobic cellular respiration.

2. Photosynthesis and Chloroplasts:
Plant cells and photosynthetic algae contain chloroplasts, specialized double-membraned organelles housing thylakoids and chlorophyll. Chlorophyll captures solar radiant energy to convert atmospheric carbon dioxide and soil water into glucose and oxygen. The light-dependent reactions occur across the thylakoid membrane, whereas the light-independent Calvin cycle occurs within the stroma.

3. Genetic Material (DNA and RNA Architecture):
Deoxyribonucleic acid (DNA) carries the hereditary genetic instructions used in development and reproduction. DNA forms an antiparallel double-helix stabilized by complementary nitrogenous base pairs: Adenine (A) pairs strictly with Thymine (T) via two hydrogen bonds, and Guanine (G) pairs with Cytosine (C) via three hydrogen bonds. Ribonucleic acid (RNA) differs by utilizing Uracil (U) instead of Thymine and ribose sugar instead of deoxyribose.

4. Cell Division (Mitosis vs Meiosis):
Mitosis is equational division occurring in somatic cells, yielding two genetically identical diploid (2n) daughter cells essential for tissue regeneration, repair, and growth. Meiosis is reductional division occurring in germ cells, producing four non-identical haploid (n) gametes. Genetic recombination and crossing over during Prophase I of meiosis generate essential biodiversity.`;

    onSampleLoaded(sampleText, 'Cell Biology & Genetics Review');
  };

  const handleLoadEconomicsSample = () => {
    const sampleText = `Macroeconomics Fundamentals — National Income and Monetary Policy

1. Gross Domestic Product (GDP):
Gross Domestic Product measures the total monetary value of all finished goods and services produced within a country's geographic borders during a specific time period. GDP can be calculated through three equivalent methods: the Expenditure Approach (GDP = Consumption + Investment + Government Spending + Net Exports), the Income Approach, and the Output or Value-Added Approach. Real GDP adjusts nominal output for inflation using the GDP Deflator.

2. Inflation and Consumer Price Index (CPI):
Inflation is a sustained increase in the general price level of goods and services over time, eroding the purchasing power of money. The Consumer Price Index (CPI) tracks price fluctuations across a fixed market basket of typical consumer goods. Demand-pull inflation occurs when aggregate demand outpaces aggregate supply, whereas cost-push inflation arises from rising production and raw material costs.

3. Central Banking and Monetary Policy:
Central banks regulate money supply and credit conditions to achieve price stability and maximum sustainable employment. Expansionary monetary policy involves lowering benchmark policy rates, decreasing cash reserve requirements, and purchasing government securities through open market operations to stimulate liquidity. Contractionary monetary policy raises interest rates to curb high inflation.`;

    onSampleLoaded(sampleText, 'Macroeconomics & Monetary Policy');
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Validation Alert */}
      {validationError && (
        <div
          role="alert"
          className="mb-6 p-5 rounded-3xl border border-rose-200 bg-rose-50 text-rose-900 shadow-sm animate-in fade-in"
        >
          <div className="flex items-start gap-3.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1.5">
              <h4 className="font-bold text-sm text-rose-950">{validationError.title}</h4>
              <p className="text-xs sm:text-sm text-rose-800 leading-relaxed">{validationError.message}</p>
              <div className="p-3 rounded-2xl bg-white/80 border border-rose-200 text-xs text-rose-900 flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Recommended action: </strong>
                  {validationError.recovery}
                </span>
              </div>
              <div className="pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-rose-600 hover:bg-rose-700 shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  Upload Another PDF
                </Button>
              </div>
            </div>
            <button
              onClick={() => setValidationError(null)}
              className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Upload State */}
      {!currentFile ? (
        <div className="max-w-3xl mx-auto">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragging(false);
            }}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative rounded-3xl border-2 border-dashed p-8 sm:p-12 text-center cursor-pointer transition-all duration-300 shadow-sm group ${
              isDragging
                ? 'border-primary-500 bg-primary-50/40 ring-4 ring-primary-100'
                : 'border-slate-300 hover:border-primary-500 bg-white hover:bg-slate-50/70'
            }`}
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold mb-6">
              <Sparkles className="w-3.5 h-3.5 text-primary-600" />
              Grounded AI Practice Exam Studio
            </div>

            <div className="w-20 h-20 rounded-2xl bg-rose-50 text-primary-600 flex items-center justify-center mx-auto mb-5 group-hover:scale-105 transition-transform duration-200 shadow-xs border border-rose-100">
              {isExtracting ? (
                <RefreshCw className="w-9 h-9 animate-spin text-primary-600" />
              ) : (
                <FileQuestion className="w-9 h-9 text-primary-600" />
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
              {isExtracting ? readingStatus || 'Extracting PDF Content...' : 'Generate Practice MCQs from Study PDF'}
            </h2>

            <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto mb-6 leading-relaxed">
              Upload textbook chapters, lecture notes, or study guides to automatically produce authentic practice question papers with an answer key.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
              <Button
                variant="primary"
                size="lg"
                disabled={isExtracting || isLoading}
                className="bg-primary-600 hover:bg-primary-700 shadow-md hover:shadow-lg transition-all"
              >
                <Upload className="w-4 h-4 mr-2" />
                {isExtracting ? 'Analyzing Document...' : 'Select Study PDF'}
              </Button>
            </div>

            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Supports standard text PDFs up to 20MB. Questions are generated <strong>strictly</strong> from your uploaded material.
            </p>

            {/* Quick Sample Presets */}
            <div className="mt-8 pt-6 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                Or test instantly with sample academic notes:
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleLoadBiologySample}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-2 shadow-xs transition-all hover:border-slate-300"
                >
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                  Cell Biology & Genetics Notes
                </button>
                <button
                  type="button"
                  onClick={handleLoadEconomicsSample}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-2 shadow-xs transition-all hover:border-slate-300"
                >
                  <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                  Macroeconomics & Monetary Policy
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* File Ready Bar */
        <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-primary-600 flex items-center justify-center shrink-0 border border-rose-100">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-slate-900 text-sm sm:text-base truncate max-w-sm sm:max-w-md">
                {currentFile.name}
              </h4>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                <span>{formatBytes(currentFile.size)}</span>
                {pageCount && (
                  <>
                    <span>•</span>
                    <span>{pageCount} page{pageCount > 1 ? 's' : ''}</span>
                  </>
                )}
                {wordCount && (
                  <>
                    <span>•</span>
                    <span>{wordCount.toLocaleString()} words</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              Replace File
            </button>
            <button
              type="button"
              onClick={onResetFile}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-150 flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
