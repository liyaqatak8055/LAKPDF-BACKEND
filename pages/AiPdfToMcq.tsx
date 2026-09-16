import React, { useState, useRef } from "react";
import { Helmet } from "react-helmet-async";
import {
  Sparkles,
  RotateCcw,
  AlertCircle,
  FileText,
  Key,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { ToolSEOContent } from "../components/ToolSEOContent";
import { AiApiKeyModal } from "../components/AiApiKeyModal";
import { extractTextFromPDF, ExtractedPdfText } from "../services/pdfTextExtractor";
import { aiService, MCQItem, MCQPaper, McqPdfExportOptions } from "../services/aiService";
import { McqUploader } from "../components/mcqGenerator/McqUploader";
import { McqSettingsPanel } from "../components/mcqGenerator/McqSettingsPanel";
import { McqProcessingProgress } from "../components/mcqGenerator/McqProcessingProgress";
import { McqPaperPreview } from "../components/mcqGenerator/McqPaperPreview";
import type { McqFormSettings } from "../components/mcqGenerator/types";

export const AiPdfToMcq: React.FC = () => {
  // Workflow Step: 'upload' | 'settings' | 'generating' | 'preview'
  const [step, setStep] = useState<'upload' | 'settings' | 'generating' | 'preview'>('upload');

  // File & Extracted Text
  const [file, setFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedPdfText | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Settings State
  const [settings, setSettings] = useState<McqFormSettings>({
    questionCount: 20,
    customCount: 20,
    difficulty: 'mixed',
    language: 'en',
    optionCount: 4,
    topicFocus: '',
    schoolName: '',
  });

  // Paper & Questions State
  const [paper, setPaper] = useState<MCQPaper | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

  // Handler: PDF Loaded from McqUploader
  const handleFileLoaded = (loadedFile: File, extractedText: string, totalPages: number) => {
    setFile(loadedFile);
    setExtractedData({
      fullText: extractedText,
      pages: [{ pageNumber: 1, text: extractedText, wordCount: Math.round(extractedText.split(/\s+/).length) }],
      totalPages,
      totalWords: Math.round(extractedText.split(/\s+/).length),
      metadata: { title: loadedFile.name.replace(/\.pdf$/i, "") },
    });
    setErrorMessage(null);
    setStep('settings');
  };

  const handleSampleLoaded = (sampleText: string, sampleTitle: string) => {
    const dummyFile = new File([sampleText], `${sampleTitle.replace(/\s+/g, '_')}.pdf`, { type: 'application/pdf' });
    handleFileLoaded(dummyFile, sampleText, 1);
  };

  // Handler: Reset to upload a new document
  const handleResetDocument = () => {
    setFile(null);
    setExtractedData(null);
    setPaper(null);
    setErrorMessage(null);
    setStep('upload');
  };

  // Handler: Generate MCQs based on extracted text & current settings
  const handleGenerateMCQs = async () => {
    if (!extractedData?.fullText) {
      setErrorMessage("No readable text found. Please upload a PDF first.");
      setStep('upload');
      return;
    }

    setErrorMessage(null);
    setStep('generating');

    const effectiveCount = settings.questionCount === 'custom'
      ? (settings.customCount || 20)
      : settings.questionCount;

    try {
      const generated = await aiService.generateMCQs(extractedData.fullText, {
        count: effectiveCount,
        difficulty: settings.difficulty,
        topic: settings.topicFocus,
        language: settings.language,
        optionCount: settings.optionCount,
        schoolName: settings.schoolName,
      });

      if (!generated || generated.length === 0) {
        throw new Error("No questions could be generated from this document text. Try selecting another chapter or fewer questions.");
      }

      // Quick validation pass to weed out duplicates
      let finalizedQuestions = generated;
      try {
        const validation = await aiService.validateMCQs(generated);
        if (validation && validation.questions && validation.questions.length > 0) {
          finalizedQuestions = validation.questions;
        }
      } catch (validationErr) {
        console.warn("AI validation warning (non-fatal):", validationErr);
      }

      const paperTitle = settings.schoolName
        ? `${settings.schoolName} — Examination Paper`
        : (extractedData.metadata?.title || file?.name?.replace(/\.pdf$/i, "") || "Practice Examination Paper");

      const paperObj: MCQPaper = {
        title: paperTitle,
        subject: settings.topicFocus || undefined,
        schoolName: settings.schoolName || undefined,
        total_questions: finalizedQuestions.length,
        totalQuestions: finalizedQuestions.length,
        difficulty: settings.difficulty,
        timeAllowedMinutes: Math.round(finalizedQuestions.length * 1.5),
        optionCount: settings.optionCount,
        questions: finalizedQuestions,
        language: settings.language,
      };

      setPaper(paperObj);
      setStep('preview');
    } catch (err: any) {
      console.error("MCQ generation failed:", err);
      setErrorMessage(err?.message || "Failed to generate MCQs. Please verify your document text or try again.");
      setStep('settings');
    }
  };

  // Handler: PDF Export
  const handleExportPdf = async (exportOpts: McqPdfExportOptions) => {
    if (!paper) return;
    setIsExportingPdf(true);
    try {
      const baseTitle = file ? file.name.replace(/\.pdf$/i, "") : (paper.title || "MCQ_Practice_Paper");
      await aiService.exportMcqPaperToPdf(baseTitle, paper.questions, exportOpts.includeAnswerKey ?? true, {
        schoolName: exportOpts.schoolName || paper.schoolName,
        includeExplanations: exportOpts.includeExplanations,
        studentHeader: true,
        language: exportOpts.language || paper.language || settings.language || 'en',
      });
    } catch (err: any) {
      setErrorMessage("Could not export PDF: " + (err?.message || "Unknown error"));
    } finally {
      setIsExportingPdf(false);
    }
  };

  const effectiveCount = settings.questionCount === 'custom'
    ? (settings.customCount || 20)
    : settings.questionCount;

  return (
    <>
      <Helmet>
        <title>AI PDF to MCQ Generator — Create Authentic Practice Question Papers</title>
        <meta
          name="description"
          content="Upload any textbook or lecture PDF and generate authentic, grounded practice MCQ question papers with separate answer keys, 4/5 options, and printable PDF export."
        />
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        {/* Header Hero */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold mb-4 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Fact-Grounded Question Paper Engine</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">
            AI PDF to MCQ <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">Generator</span>
          </h1>
          <p className="mt-3 text-sm md:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
            Turn lecture notes, textbook chapters, and syllabus PDFs into authentic exam papers with clean print layouts, balanced difficulty, and an isolated answer key at the end.
          </p>

          {/* Quick Stats / Highlights */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-5 text-xs font-medium text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              100% Grounded in PDF
            </span>
            <span className="text-gray-300 dark:text-gray-700">•</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              4 or 5 Options (A–D / A–E)
            </span>
            <span className="text-gray-300 dark:text-gray-700">•</span>
            <span className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              Print-Ready A4 PDF
            </span>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="mb-8 p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 text-sm flex items-start gap-3 animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="font-bold">Notice: </strong>
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-xs font-bold text-red-700 dark:text-red-400 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* WORKFLOW VIEW ROUTER */}
        {step === 'upload' && (
          <div className="animate-in fade-in duration-300">
            <McqUploader
              onFileLoaded={handleFileLoaded}
              isLoading={isExtracting}
              onSampleLoaded={handleSampleLoaded}
              currentFile={file}
              pageCount={extractedData?.totalPages}
              wordCount={extractedData?.totalWords}
              onResetFile={handleResetDocument}
            />
          </div>
        )}

        {step === 'settings' && (
          <div className="animate-in fade-in duration-300">
            <McqSettingsPanel
              settings={settings}
              onChange={setSettings}
              onGenerate={handleGenerateMCQs}
              fileName={file?.name}
              extractedWordCount={extractedData?.totalWords}
              onResetDoc={handleResetDocument}
            />
          </div>
        )}

        {step === 'generating' && (
          <div className="animate-in fade-in duration-300">
            <McqProcessingProgress
              fileName={file?.name}
              totalQuestionsRequested={effectiveCount}
            />
          </div>
        )}

        {step === 'preview' && paper && (
          <div className="animate-in fade-in duration-300">
            <McqPaperPreview
              paper={paper}
              onUpdatePaper={setPaper}
              onGenerateAgain={() => setStep('settings')}
              onExportPdf={handleExportPdf}
              isExportingPdf={isExportingPdf}
            />
          </div>
        )}

        {/* Bottom Utility Bar: Custom API Key & Help */}
        <div className="mt-12 pt-6 border-t border-gray-200/80 dark:border-gray-800 flex flex-wrap items-center justify-between gap-4 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <span>Powered by Gemini Flash & LAKPDF Engine</span>
            <span>•</span>
            <button
              type="button"
              onClick={() => setIsApiKeyModalOpen(true)}
              className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Use Custom AI Key</span>
            </button>
          </div>

          {step !== 'upload' && (
            <button
              type="button"
              onClick={handleResetDocument}
              className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Start with new document</span>
            </button>
          )}
        </div>

        {/* SEO Educational & Feature Content Section */}
        <div className="mt-16">
          <ToolSEOContent toolKey="/ai-pdf-to-mcq" />
        </div>
      </div>

      {/* AI Key Modal */}
      <AiApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
      />
    </>
  );
};

export default AiPdfToMcq;
