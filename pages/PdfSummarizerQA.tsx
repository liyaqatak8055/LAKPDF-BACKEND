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
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
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
import { DocumentViewerPanel } from "../components/pdf-summarizer/DocumentViewerPanel";

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
 * Exact Smallpdf-style structured card:
 * - 4-colored brand quadrant icon
 * - Clean bold title at top
 * - Solid bullet points with bold key topics
 * - Suggested questions section with clickable arrow cards
 * - Action footer with feedback thumbs & copy button
 */
const StructuredSummaryCard: React.FC<{
  summary: StructuredSummaryData | string;
  fileName?: string;
  onSelectQuestion: (question: string) => void;
  onCopy?: () => void;
  copied?: boolean;
}> = ({ summary, fileName, onSelectQuestion, onCopy, copied }) => {
  const [isQuestionsOpen, setIsQuestionsOpen] = useState(true);
  const [feedback, setFeedback] = useState<"liked" | "disliked" | null>(null);

  const parsed: StructuredSummaryData = useMemo(() => {
    if (typeof summary === "string") {
      return parseStructuredSummaryText(summary, fileName);
    }
    return summary;
  }, [summary, fileName]);

  return (
    <div className="bg-[#eef5ff] border border-blue-200/70 rounded-2xl p-5 sm:p-6 shadow-xs transition-all">
      {/* Top Title with 4-quadrant Smallpdf-style icon */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-7 h-7 rounded-lg grid grid-cols-2 gap-0.5 p-1 bg-white shadow-2xs border border-blue-100 shrink-0">
          <div className="bg-rose-500 rounded-[2px]" />
          <div className="bg-amber-400 rounded-[2px]" />
          <div className="bg-cyan-500 rounded-[2px]" />
          <div className="bg-emerald-500 rounded-[2px]" />
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-snug">
          {parsed.title}
        </h2>
      </div>

      {/* Main Bullet Points */}
      <div className="space-y-3 mb-5 text-slate-800 text-sm sm:text-[15px] leading-relaxed">
        {parsed.bullets.map((b, idx) => {
          const heading = b.heading || b.topic;
          const text = b.text || b.detail || "";
          return (
            <div key={idx} className="flex items-start gap-2.5">
              <span className="text-black font-black text-base leading-none mt-1 select-none shrink-0">
                •
              </span>
              <div className="flex-1">
                {heading ? (
                  <>
                    <strong className="font-bold text-slate-950">{heading}: </strong>
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
        <div className="pt-3 border-t border-blue-200/60 mb-3">
          <button
            type="button"
            onClick={() => setIsQuestionsOpen(!isQuestionsOpen)}
            className="w-full flex items-center justify-between py-1 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
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
            <div className="space-y-2 mt-2 animate-in fade-in duration-200">
              {parsed.suggestedQuestions.slice(0, 3).map((q, qIdx) => (
                <button
                  key={qIdx}
                  type="button"
                  onClick={() => onSelectQuestion(q)}
                  className="w-full bg-white hover:bg-slate-50 active:bg-blue-50/50 border border-blue-100 rounded-xl px-3.5 py-2.5 sm:py-3 text-slate-800 text-xs sm:text-sm font-medium flex items-center justify-between shadow-2xs transition-all text-left group cursor-pointer"
                >
                  <span className="flex-1 pr-2 leading-snug">{q}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action Footer: Feedback & Copy */}
      <div className="pt-2 border-t border-blue-200/50 flex items-center justify-between text-slate-500">
        <div className="flex items-center gap-1 text-xs">
          <button
            type="button"
            onClick={() => setFeedback((f) => (f === "liked" ? null : "liked"))}
            className={`p-1.5 rounded-lg hover:bg-white/80 transition-colors cursor-pointer ${
              feedback === "liked" ? "text-blue-600 bg-white font-semibold" : "text-slate-400 hover:text-slate-600"
            }`}
            title="Helpful summary"
          >
            <ThumbsUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setFeedback((f) => (f === "disliked" ? null : "disliked"))}
            className={`p-1.5 rounded-lg hover:bg-white/80 transition-colors cursor-pointer ${
              feedback === "disliked" ? "text-rose-600 bg-white font-semibold" : "text-slate-400 hover:text-slate-600"
            }`}
            title="Not helpful"
          >
            <ThumbsDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {onCopy && (
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold hover:bg-white/80 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            title="Copy summary"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy</span>
              </>
            )}
          </button>
        )}
      </div>
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
  const handleSampleDoc = async () => {
    const sampleData: StructuredSummaryData = {
      title: "NCISM Elective Courses - FAQs Summary",
      document_type: "policy",
      bullets: [
        {
          heading: "Electives Definition",
          text: "Optional courses in B.A.M.S./B.U.M.S./B.S.M.S./B.S.R.M.S. for interdisciplinary exposure.",
          topic: "Electives Definition",
          detail: "Optional courses in B.A.M.S./B.U.M.S./B.S.M.S./B.S.R.M.S. for interdisciplinary exposure.",
        },
        {
          heading: "Mandatory Requirement",
          text: "Students must complete a minimum of 3 electives per session; 9 before the final exam.",
          topic: "Mandatory Requirement",
          detail: "Students must complete a minimum of 3 electives per session; 9 before the final exam.",
        },
        {
          heading: "Structure & Hours",
          text: "Each elective consists of 5 modules (45 hours total), earning academic credits.",
          topic: "Structure & Hours",
          detail: "Each elective consists of 5 modules (45 hours total), earning academic credits.",
        },
        {
          heading: "Marks Addition",
          text: "Elective marks contribute directly to viva marks in respective subjects.",
          topic: "Marks Addition",
          detail: "Elective marks contribute directly to viva marks in respective subjects.",
        },
        {
          heading: "Course Fee",
          text: "INR 500 per elective, payable before semester results are issued.",
          topic: "Course Fee",
          detail: "INR 500 per elective, payable before semester results are issued.",
        },
      ],
      suggestedQuestions: [
        "What are elective courses?",
        "What is the fee for elective courses?",
        "How many electives are mandatory before the final exam?",
      ],
      formattedMarkdown: "",
    };

    sampleData.formattedMarkdown =
      `${sampleData.title}\n\n` +
      sampleData.bullets.map((b) => `• **${b.heading}**: ${b.text}`).join("\n") +
      `\n\n### Suggested questions:\n` +
      sampleData.suggestedQuestions.map((q) => `- ${q}`).join("\n");

    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      page.drawText("NCISM FAQ'S ON ELECTIVES (Sample Document)", {
        x: 50,
        y: 790,
        size: 15,
        font: fontBold,
        color: rgb(0.1, 0.2, 0.45),
      });

      page.drawText("National Commission for Indian System of Medicine", {
        x: 50,
        y: 770,
        size: 10,
        font,
        color: rgb(0.4, 0.45, 0.5),
      });

      let yPos = 730;
      const lines = [
        "1. What are Electives or Elective Courses?",
        "Electives are courses which can be chosen from a pool of papers. They may be very specific or",
        "advanced, supportive to the discipline, providing an expanded scope, or enabling an exposure to",
        "some other discipline or domain. They nurture student's proficiency and skill.",
        "",
        "2. Mandatory Requirement for Students:",
        "Each student must complete a minimum of three electives per session, totalling nine electives",
        "before appearing in the final professional examination.",
        "",
        "3. Elective Modules & Duration:",
        "Each elective course consists of five modules, each module with nine hours of learning (45 hours total).",
        "",
        "4. Marks Addition in University Results:",
        "Elective marks shall contribute towards the viva marks in the respective subject examination.",
        "",
        "5. Fee Structure:",
        "The fee for each elective is INR 500, payable before the issuance of course results.",
      ];

      for (const line of lines) {
        if (
          line.startsWith("1.") ||
          line.startsWith("2.") ||
          line.startsWith("3.") ||
          line.startsWith("4.") ||
          line.startsWith("5.")
        ) {
          page.drawText(line, { x: 50, y: yPos, size: 11, font: fontBold, color: rgb(0.15, 0.15, 0.15) });
        } else if (line) {
          page.drawText(line, { x: 50, y: yPos, size: 9.5, font, color: rgb(0.3, 0.3, 0.3) });
        }
        yPos -= 22;
      }

      const pdfBytes = await pdfDoc.save();
      const dummyFile = new File([pdfBytes], "FAQ's Electives 06_10_2025.pdf", {
        type: "application/pdf",
      });

      setFile(dummyFile);
      setExtractedData({
        fullText: sampleData.formattedMarkdown,
        totalPages: 1,
        totalWords: 1205,
        pages: [],
      });
      setGeneratedSummary(sampleData);
    } catch {
      const dummyFile = new File([sampleData.formattedMarkdown], "FAQ's Electives 06_10_2025.txt", {
        type: "text/plain",
      });
      setFile(dummyFile);
      setExtractedData({
        fullText: sampleData.formattedMarkdown,
        totalPages: 1,
        totalWords: 1205,
        pages: [],
      });
      setGeneratedSummary(sampleData);
    }
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

      <div className={file && !isProcessing && generatedSummary ? "max-w-[1600px] mx-auto px-2 sm:px-4 py-3 sm:py-4" : "max-w-4xl mx-auto px-4 py-8"}>
        {/* Header Bar (Upload Mode only) */}
        {(!file || isProcessing || !generatedSummary) && (
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
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs transition-all cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-slate-500" />
                AI Settings
              </button>
            </div>
          </div>
        )}

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

        {/* STATE 3: SUMMARY GENERATED VIEW (SMALLPDF-STYLE SPLIT WORKSPACE) */}
        {file && !isProcessing && generatedSummary && (
          <div className="mt-4 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-140px)] min-h-[640px] animate-in fade-in">
            {/* Minimalist Workspace Header Bar (Smallpdf Style) */}
            <div className="px-4 sm:px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white shrink-0 z-10">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setExtractedData(null);
                    setGeneratedSummary(null);
                    setChatMessages([]);
                  }}
                  className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Upload another document"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">New Document</span>
                </button>

                <div className="h-5 w-[1px] bg-slate-200 hidden sm:block" />

                <div className="flex items-center gap-2 min-w-0">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                    Summarize
                  </h2>
                  <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium truncate max-w-xs">
                    {file.name}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRegenerate}
                  className="p-2 sm:px-3 sm:py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  title="Regenerate summary"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Regenerate</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadSummaryTxt}
                  className="px-2.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-2xs cursor-pointer hidden sm:inline-flex"
                  title="Download plain text (.txt)"
                >
                  TXT
                </button>

                <button
                  type="button"
                  onClick={handleDownloadSummaryPdf}
                  disabled={isDownloadingPdf}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  title="Download Summary PDF"
                >
                  {isDownloadingPdf ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>Download</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(true)}
                  className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-2xs cursor-pointer"
                  title="AI Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Split Screen Columns: Left (Viewer) & Right (Summary + Chat) */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              {/* Left Column: PDF / Document Preview Canvas */}
              <div className="lg:w-[50%] xl:w-[52%] h-[40vh] lg:h-full shrink-0">
                <DocumentViewerPanel file={file} className="h-full border-r border-slate-200" />
              </div>

              {/* Right Column: AI Assistant Panel with Sticky Bottom Chat */}
              <div className="lg:w-[50%] xl:w-[48%] flex flex-col h-full bg-white overflow-hidden">
                {/* Scrollable Conversation & Summary Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                  {/* Summary Card */}
                  <StructuredSummaryCard
                    summary={generatedSummary}
                    fileName={file.name}
                    onSelectQuestion={handleAskQuestion}
                    onCopy={handleCopySummary}
                    copied={copiedSummary}
                  />

                  {/* Interactive Q&A Message Stream */}
                  {chatMessages.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                          <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                          <span>Conversation</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setChatMessages([])}
                          className="text-xs text-slate-400 hover:text-rose-600 font-medium transition-colors cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>

                      {chatMessages.map((msg, index) => (
                        <div
                          key={index}
                          className={`flex gap-2.5 ${
                            msg.role === "user" ? "justify-end" : "justify-start"
                          }`}
                        >
                          {msg.role === "assistant" && (
                            <div className="w-7 h-7 rounded-full bg-blue-100 text-primary-700 flex items-center justify-center shrink-0 mt-0.5">
                              <Sparkles className="w-3.5 h-3.5" />
                            </div>
                          )}

                          <div
                            className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                              msg.role === "user"
                                ? "bg-blue-600 text-white rounded-br-xs shadow-xs"
                                : "bg-[#f1f6ff] text-slate-800 rounded-bl-xs border border-blue-200/70"
                            }`}
                          >
                            <div className="whitespace-pre-line">{msg.content}</div>

                            {msg.role === "assistant" && (
                              <div className="mt-2 pt-1.5 border-t border-blue-200/50 flex items-center justify-end">
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
                            <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[11px]">
                              You
                            </div>
                          )}
                        </div>
                      ))}

                      {isAsking && (
                        <div className="flex gap-2.5 justify-start items-center text-slate-500 text-xs py-2">
                          <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          </div>
                          <span className="italic">AI is generating answer from PDF...</span>
                        </div>
                      )}

                      <div ref={chatBottomRef} />
                    </div>
                  )}
                </div>

                {/* Sticky Bottom Chat Input Bar (Smallpdf Style) */}
                <div className="p-3 sm:p-4 bg-white border-t border-slate-200/90 shrink-0">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAskQuestion();
                    }}
                    className="relative flex items-center"
                  >
                    <input
                      type="text"
                      value={inputQuestion}
                      onChange={(e) => setInputQuestion(e.target.value)}
                      placeholder="Hey! Ask me anything about your PDF."
                      disabled={isAsking}
                      className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-300 bg-slate-50/60 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-800 text-sm outline-none transition-all placeholder:text-slate-400"
                    />
                    <button
                      type="submit"
                      disabled={!inputQuestion.trim() || isAsking}
                      className="absolute right-2 p-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 text-white transition-all cursor-pointer shadow-xs"
                      title="Send question"
                    >
                      {isAsking ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ArrowRight className="w-4 h-4" />
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </div>
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
