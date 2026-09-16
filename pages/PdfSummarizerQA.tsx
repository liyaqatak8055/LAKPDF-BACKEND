import React, { useState, useRef, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import {
  FileText,
  Brain,
  Sparkles,
  Settings,
  Upload,
  Check,
  Copy,
  Download,
  RefreshCw,
  Send,
  MessageSquare,
  AlertCircle,
  Trash2,
  Loader2,
  FileCheck,
  ArrowRight,
  ChevronUp,
  ChevronDown,
  FileImage,
  FileType,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "../components/Button";
import { ToolSEOContent } from "../components/ToolSEOContent";
import { AiApiKeyModal } from "../components/AiApiKeyModal";
import { extractTextFromAnyDocument, ExtractedPdfText } from "../services/pdfTextExtractor";
import {
  aiService,
  ChatMessage,
  StructuredSummaryData,
  parseStructuredSummaryText,
} from "../services/aiService";
import { formatBytes } from "../services/pdfService";

// Helper to render inline bold styling
const renderInlineBold = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-bold text-slate-950">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
};

/**
 * Exact structured card requested by user:
 * - Pastel-blue card background (#edf4ff)
 * - Clean bold title at top
 * - Solid bullet points with bold key topics
 * - Suggested questions section with chevron toggle and clickable arrow cards
 */
const StructuredSummaryCard: React.FC<{
  summary: StructuredSummaryData | string;
  fileName?: string;
  onSelectQuestion: (question: string) => void;
}> = ({ summary, fileName, onSelectQuestion }) => {
  const [isQuestionsOpen, setIsQuestionsOpen] = useState(true);

  const parsed: StructuredSummaryData = useMemo(() => {
    if (typeof summary === "string") {
      return parseStructuredSummaryText(summary, fileName);
    }
    return summary;
  }, [summary, fileName]);

  return (
    <div className="bg-[#eaf2ff] border border-blue-200/70 rounded-2xl p-6 sm:p-7 shadow-xs transition-all">
      {/* Top Title & Document Type Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-5">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
          {parsed.title}
        </h2>
        {parsed.document_type && parsed.document_type !== "general" && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100/90 text-primary-700 capitalize tracking-wide border border-blue-200/60 select-none">
            {parsed.document_type.replace(/_/g, " ")}
          </span>
        )}
      </div>

      {/* Main Bullet Points */}
      <div className="space-y-3.5 mb-6 text-slate-800 text-[15px] sm:text-base leading-relaxed">
        {parsed.bullets.map((b, idx) => {
          const heading = b.heading || b.topic;
          const text = b.text || b.detail || "";
          return (
            <div key={idx} className="flex items-start gap-2.5">
              <span className="text-black font-black text-lg leading-none mt-1 select-none shrink-0">
                •
              </span>
              <div className="flex-1">
                {heading ? (
                  <>
                    <strong className="font-extrabold text-slate-950">{heading}: </strong>
                    <span className="text-slate-800 font-normal">{renderInlineBold(text)}</span>
                  </>
                ) : (
                  <span className="text-slate-800 font-normal">{renderInlineBold(text)}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Suggested Questions Section */}
      {parsed.suggestedQuestions.length > 0 && (
        <div className="pt-3 border-t border-blue-200/60">
          <button
            type="button"
            onClick={() => setIsQuestionsOpen(!isQuestionsOpen)}
            className="w-full flex items-center justify-between py-1.5 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Suggested questions:</span>
            </div>
            <div className="text-slate-500 hover:text-slate-700">
              {isQuestionsOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </button>

          {isQuestionsOpen && (
            <div className="space-y-2 mt-2.5 animate-in fade-in duration-200">
              {parsed.suggestedQuestions.map((q, qIdx) => (
                <button
                  key={qIdx}
                  type="button"
                  onClick={() => onSelectQuestion(q)}
                  className="w-full bg-white hover:bg-slate-50/90 active:bg-blue-50/50 border border-blue-100 rounded-xl px-4 py-3 sm:py-3.5 text-slate-800 text-xs sm:text-sm font-medium flex items-center justify-between shadow-2xs transition-all text-left group cursor-pointer"
                >
                  <span className="flex-1 pr-3 leading-snug">{q}</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const PdfSummarizerQA: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedPdfText | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusStep, setStatusStep] = useState<string>("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Summary State
  const [generatedSummary, setGeneratedSummary] = useState<StructuredSummaryData | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Q&A Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputQuestion, setInputQuestion] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatSectionRef = useRef<HTMLDivElement>(null);

  /**
   * Main automatic workflow:
   * Upload file -> Extract text -> Summarize main topics immediately (Zero options asked)
   */
  const processAndSummarize = async (selectedFile: File) => {
    setErrorMessage(null);
    setFile(selectedFile);
    setIsProcessing(true);
    setStatusStep("Reading document & extracting text content...");
    setGeneratedSummary(null);
    setChatMessages([]);

    try {
      // Step 1: Universal text extraction (PDF, DOCX, Images via OCR, Text)
      const data = await extractTextFromAnyDocument(selectedFile, (msg) => {
        setStatusStep(msg);
      });

      if (!data.fullText || data.fullText.trim().length === 0) {
        throw new Error(
          "Could not extract readable text from this file. Please ensure it contains clear text or legible scanned pages."
        );
      }

      setExtractedData(data);

      // Step 2: Immediate AI main topics summarization
      setStatusStep("AI is analyzing document and generating main topics summary...");
      const summaryData = await aiService.generateMainTopicsSummary(data.fullText, selectedFile.name);

      if (!summaryData || (!summaryData.title && summaryData.bullets.length === 0)) {
        throw new Error("AI could not generate a summary. Please try again.");
      }

      setGeneratedSummary(summaryData);
    } catch (err: any) {
      console.error("Summarizer error:", err);
      setErrorMessage(
        err?.message ||
          "Failed to process and summarize this document. Please check your network or try another file."
      );
    } finally {
      setIsProcessing(false);
      setStatusStep("");
    }
  };

  const handleFileUpload = (selectedFile: File) => {
    processAndSummarize(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processAndSummarize(e.dataTransfer.files[0]);
    }
  };

  // Sample document for instant 1-click test
  const handleSampleDoc = () => {
    const sampleData: StructuredSummaryData = {
      title: "NCISM Elective Courses - FAQs Summary",
      bullets: [
        {
          topic: "Electives Definition",
          detail: "Optional courses in B.A.M.S./B.U.M.S./B.S.M.S./B.S.R.M.S. for interdisciplinary exposure.",
        },
        {
          topic: "Mandatory Requirement",
          detail: "Students must complete a minimum of three electives per session; nine before the final exam.",
        },
        {
          topic: "Enrollment",
          detail: "Step-by-step guide available for enrollment.",
        },
        {
          topic: "Structure",
          detail: "Each elective consists of five modules (45 hours total), earning credits and grades.",
        },
        {
          topic: "Marks Addition",
          detail: "Elective marks contribute to viva marks in respective subjects.",
        },
        {
          topic: "Fees",
          detail: "INR 500 per elective, payable before results are issued.",
        },
      ],
      suggestedQuestions: [
        "What are Electives or Elective Courses?",
        "What is the Fee for Elective Courses and When would students pay for the same?",
        "How can I enroll for Electives?",
      ],
      formattedMarkdown: "",
    };

    sampleData.formattedMarkdown =
      `${sampleData.title}\n\n` +
      sampleData.bullets.map((b) => `• **${b.topic}**: ${b.detail}`).join("\n") +
      `\n\n### Suggested questions:\n` +
      sampleData.suggestedQuestions.map((q) => `- ${q}`).join("\n");

    const dummyFile = new File([sampleData.formattedMarkdown], "FAQ's Electives 06_10_202...pdf", {
      type: "application/pdf",
    });

    setFile(dummyFile);
    setExtractedData({
      fullText: sampleData.formattedMarkdown,
      totalPages: 4,
      totalWords: 1205,
      pages: [],
    });
    setGeneratedSummary(sampleData);
  };

  // Re-generate summary if needed
  const handleRegenerate = async () => {
    if (!extractedData?.fullText || isProcessing) return;
    setIsProcessing(true);
    setStatusStep("AI is regenerating main topics summary...");
    setErrorMessage(null);

    try {
      const summaryData = await aiService.generateMainTopicsSummary(extractedData.fullText, file?.name);
      setGeneratedSummary(summaryData);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to regenerate summary.");
    } finally {
      setIsProcessing(false);
      setStatusStep("");
    }
  };

  const handleCopySummary = () => {
    if (!generatedSummary) return;
    navigator.clipboard.writeText(generatedSummary.formattedMarkdown || generatedSummary.title);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const handleDownloadSummaryPdf = async () => {
    if (!generatedSummary || isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    try {
      const title = generatedSummary.title || (file ? `${file.name.replace(/\.[^/.]+$/, "")} Summary` : "Document Summary");
      await aiService.exportSummaryToPdf(title, generatedSummary.formattedMarkdown || generatedSummary.title, file?.name);
    } catch (err: any) {
      setErrorMessage("Could not export PDF: " + (err?.message || "Unknown error"));
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDownloadSummaryTxt = () => {
    if (!generatedSummary) return;
    const blob = new Blob([generatedSummary.formattedMarkdown || generatedSummary.title], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${file?.name.replace(/\.[^/.]+$/, "") || "document"}-summary.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAskQuestion = async (customQ?: string) => {
    const q = (customQ || inputQuestion).trim();
    if (!q || !extractedData?.fullText || isAsking) return;

    const newMessages: ChatMessage[] = [...chatMessages, { role: "user", content: q }];
    setChatMessages(newMessages);
    setInputQuestion("");
    setIsAsking(true);
    setErrorMessage(null);

    setTimeout(() => {
      chatSectionRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);

    try {
      const answer = await aiService.chatWithDocument(extractedData.fullText, chatMessages, q);
      setChatMessages([...newMessages, { role: "assistant", content: answer }]);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to get an answer. Please try asking again.");
      setChatMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "Sorry, I was unable to answer that question. Please try asking again.",
        },
      ]);
    } finally {
      setIsAsking(false);
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  const handleCopyMessage = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getFileIcon = (fileName?: string) => {
    const name = (fileName || "").toLowerCase();
    if (name.endsWith(".pdf")) return <FileText className="w-5 h-5 text-rose-600" />;
    if (name.endsWith(".docx") || name.endsWith(".doc"))
      return <FileType className="w-5 h-5 text-blue-600" />;
    if (
      name.endsWith(".png") ||
      name.endsWith(".jpg") ||
      name.endsWith(".jpeg") ||
      name.endsWith(".webp")
    ) {
      return <FileImage className="w-5 h-5 text-emerald-600" />;
    }
    return <FileSpreadsheet className="w-5 h-5 text-slate-600" />;
  };

  return (
    <>
      <Helmet>
        <title>AI Summary - Instant Main Topics Summary | LAK PDF</title>
        <meta
          name="description"
          content="Upload any PDF, Word document, image, or text file to instantly generate an AI Summary covering all main topics with zero setup."
        />
        <link rel="canonical" href="https://lakpdf.com/summarizer-qa" />
      </Helmet>

      <AiApiKeyModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-primary-700 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-primary-600" />
              1-Click Instant AI Summary
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              AI Summary
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Upload any PDF, Word file, scanned image, or text document. The AI automatically extracts and generates an executive AI summary with zero options required.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs transition-all"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              AI Settings
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mt-4 p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-sm flex items-start gap-3 animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Notice</p>
              <p className="text-xs sm:text-sm mt-0.5">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs text-rose-500 hover:text-rose-700 font-medium"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* STATE 1: UPLOAD SCREEN */}
        {!file && !isProcessing && (
          <div className="mt-8 max-w-2xl mx-auto">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-primary-500 bg-white hover:bg-primary-50/20 rounded-3xl p-8 sm:p-14 text-center cursor-pointer transition-all duration-200 shadow-sm group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt,.md,.png,.jpg,.jpeg,.webp"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              />

              <div className="w-20 h-20 rounded-3xl bg-blue-50 text-primary-600 flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform shadow-xs">
                <Upload className="w-9 h-9" />
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                Upload Document to Summarize
              </h2>
              <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                Drag & drop your file here, or click to browse. Summary generates automatically!
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button variant="primary" size="lg">
                  <Upload className="w-4 h-4 mr-2" />
                  Choose File
                </Button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSampleDoc();
                  }}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
                >
                  ⚡ Try Sample Document
                </button>
              </div>

              {/* Supported formats */}
              <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs text-slate-600 font-medium">
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200">
                  📄 PDF Documents
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200">
                  📝 Word (.docx, .doc)
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200">
                  🖼️ Images (OCR Scans)
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200">
                  📃 Text (.txt, .md)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* STATE 2: LOADING / PROCESSING STATE */}
        {isProcessing && (
          <div className="mt-12 max-w-md mx-auto bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 text-center shadow-lg animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center mx-auto mb-5 relative">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
              <Sparkles className="w-4 h-4 text-amber-500 absolute -top-1 -right-1 animate-pulse" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-1.5">
              Generating AI Summary...
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mb-6 font-medium">
              {statusStep || "Processing document content..."}
            </p>

            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div className="bg-primary-600 h-full rounded-full animate-pulse w-3/4 transition-all duration-500" />
            </div>

            <p className="text-[11px] text-slate-400 mt-4">
              Extracting key topics, factual points, and suggested questions with high precision.
            </p>
          </div>
        )}

        {/* STATE 3: SUMMARY GENERATED VIEW */}
        {file && !isProcessing && generatedSummary && (
          <div className="mt-6 space-y-6 animate-in fade-in">
            {/* Document Info Ribbon & Action Buttons */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl shrink-0">
                  {getFileIcon(file.name)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900 text-sm sm:text-base truncate max-w-md">
                      {file.name}
                    </p>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
                      Summarized
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {extractedData ? (
                      <>
                        {extractedData.totalPages > 1 && `${extractedData.totalPages} pages • `}
                        {extractedData.totalWords.toLocaleString()} words analyzed •{" "}
                        {formatBytes(file.size)}
                      </>
                    ) : (
                      formatBytes(file.size)
                    )}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto justify-end">
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  title="Copy summary to clipboard"
                >
                  {copiedSummary ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" /> Copy
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadSummaryPdf}
                  disabled={isDownloadingPdf}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200 flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  title="Export summary to PDF document"
                >
                  {isDownloadingPdf ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  Export PDF
                </button>

                <button
                  type="button"
                  onClick={handleDownloadSummaryTxt}
                  className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  title="Download as plain text (.txt)"
                >
                  TXT
                </button>

                <button
                  type="button"
                  onClick={handleRegenerate}
                  className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  title="Regenerate summary"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                  Regenerate
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setExtractedData(null);
                    setGeneratedSummary(null);
                    setChatMessages([]);
                  }}
                  className="px-3 py-2 text-xs font-semibold rounded-xl text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Upload a new document"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  New Document
                </button>
              </div>
            </div>

            {/* EXACT STRUCTURED SUMMARY CARD AS IN SCREENSHOT */}
            <StructuredSummaryCard
              summary={generatedSummary}
              fileName={file.name}
              onSelectQuestion={handleAskQuestion}
            />

            {/* INTERACTIVE Q&A CONVERSATION THREAD */}
            {chatMessages.length > 0 && (
              <div
                ref={chatSectionRef}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4 animate-in fade-in"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-primary-600" />
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                      Interactive Document Q&A
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setChatMessages([])}
                    className="text-xs text-slate-400 hover:text-rose-600 font-medium transition-colors"
                  >
                    Clear Q&A
                  </button>
                </div>

                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                  {chatMessages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex gap-3 ${
                        msg.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {msg.role === "assistant" && (
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-primary-700 flex items-center justify-center shrink-0 mt-1">
                          <Sparkles className="w-4 h-4" />
                        </div>
                      )}

                      <div
                        className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "bg-primary-600 text-white rounded-br-xs"
                            : "bg-[#edf4ff] text-slate-800 rounded-bl-xs border border-blue-200/70"
                        }`}
                      >
                        <div className="whitespace-pre-line">{msg.content}</div>

                        {msg.role === "assistant" && (
                          <div className="mt-2.5 pt-2 border-t border-blue-200/60 flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => handleCopyMessage(msg.content, index)}
                              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                            >
                              {copiedIndex === index ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" /> Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" /> Copy
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      {msg.role === "user" && (
                        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-1 font-bold text-xs">
                          You
                        </div>
                      )}
                    </div>
                  ))}

                  {isAsking && (
                    <div className="flex gap-3 justify-start items-center text-slate-500 text-sm py-2">
                      <div className="w-7 h-7 rounded-full bg-blue-50 text-primary-600 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                      <span className="italic text-xs">AI is searching document context...</span>
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Input form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAskQuestion();
                  }}
                  className="flex gap-2 pt-3 border-t border-slate-100"
                >
                  <input
                    type="text"
                    value={inputQuestion}
                    onChange={(e) => setInputQuestion(e.target.value)}
                    placeholder="Ask another question about this document..."
                    disabled={isAsking}
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all"
                  />
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={!inputQuestion.trim() || isAsking}
                    className="px-5"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* SEO Content Section */}
        <div className="mt-16">
          <ToolSEOContent toolKey="/summarizer-qa" />
        </div>
      </div>
    </>
  );
};

export default PdfSummarizerQA;
