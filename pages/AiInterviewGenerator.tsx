import React, { useState, useMemo, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  Briefcase,
  Sparkles,
  Settings,
  Download,
  Copy,
  Check,
  Search,
  Filter,
  Mic,
  RotateCcw,
  AlertCircle,
  FolderGit2,
  CheckCircle2,
  Star,
  Code2,
  HelpCircle,
  X,
} from "lucide-react";
import { Button } from "../components/Button";
import { ToolSEOContent } from "../components/ToolSEOContent";
import { AiApiKeyModal } from "../components/AiApiKeyModal";
import { aiService } from "../services/aiService";
import { ResumeUploader } from "../components/interviewPrep/ResumeUploader";
import {
  ProcessingProgress,
  ProcessingStage,
} from "../components/interviewPrep/ProcessingProgress";
import { ProfileSummaryCard } from "../components/interviewPrep/ProfileSummaryCard";
import { QuestionCard } from "../components/interviewPrep/QuestionCard";
import { LanguageSelector } from "../components/interviewPrep/LanguageSelector";
import { MockInterviewModal } from "../components/interviewPrep/MockInterviewModal";
import {
  PrepQuestionItem,
  ResumeAnalysisData,
  InterviewPrepKit,
  AppLanguage,
  DifficultyFilter,
  PriorityFilter,
  SortOption,
} from "../components/interviewPrep/types";

const LOCAL_STORAGE_PREPARED_KEY = "lakpdf_interview_prepared_ids";
const LOCAL_STORAGE_SAVED_KEY = "lakpdf_interview_saved_ids";

export const AiInterviewGenerator: React.FC = () => {
  // Document and Extraction State
  const [file, setFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState<string>("");

  // Processing & Multi-Stage UX
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStage, setProcessingStage] = useState<ProcessingStage>(1);

  // Analysis & Generated Questions
  const [analysis, setAnalysis] = useState<ResumeAnalysisData | null>(null);
  const [prepKit, setPrepKit] = useState<InterviewPrepKit | null>(null);
  const [language, setLanguage] = useState<AppLanguage>("en");

  // Prepared / Practiced Question IDs (Saved to localStorage)
  const [preparedIds, setPreparedIds] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_PREPARED_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Saved / Bookmarked Question IDs (Saved to localStorage)
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_SAVED_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Filters & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyFilter>("all");
  const [onlySaved, setOnlySaved] = useState(false);

  // Modals & UI Controls
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMockModalOpen, setIsMockModalOpen] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [errorMessage, setErrorMessage] = useState<{ title: string; message: string } | null>(null);

  // Persist prepared items
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_PREPARED_KEY, JSON.stringify(preparedIds));
    } catch {
      // ignore
    }
  }, [preparedIds]);

  // Persist saved items
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_SAVED_KEY, JSON.stringify(savedIds));
    } catch {
      // ignore
    }
  }, [savedIds]);

  const handleTogglePrepared = (id: string) => {
    setPreparedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleToggleSave = (id: string) => {
    setSavedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Start processing pipeline: File Loaded -> Read -> Analyze -> Generate Questions
  const handleStartAnalysis = async (uploadedFile: File | null, text: string, lang = language) => {
    setErrorMessage(null);
    setIsProcessing(true);
    setAnalysis(null);
    setPrepKit(null);

    try {
      // Stage 1: Uploading
      setProcessingStage(1);
      await new Promise((r) => setTimeout(r, 400));

      // Stage 2: Reading Resume
      setProcessingStage(2);
      await new Promise((r) => setTimeout(r, 400));

      // Stage 3: Identifying Profile
      setProcessingStage(3);
      const extractedAnalysis = await aiService.analyzeResume(text, { language: lang });
      setAnalysis(extractedAnalysis);

      // Stage 4: Detecting Skills & Experience
      setProcessingStage(4);
      await new Promise((r) => setTimeout(r, 500));

      // Stage 5: Analyzing Projects
      setProcessingStage(5);
      await new Promise((r) => setTimeout(r, 500));

      // Stage 6: Preparing Questions
      setProcessingStage(6);
      const generatedKit = await aiService.generatePersonalizedQuestions(
        text,
        extractedAnalysis,
        {
          role: extractedAnalysis.candidate.target_role,
          experienceLevel: extractedAnalysis.candidate.experience_level,
          language: lang,
        }
      );

      setPrepKit(generatedKit);
    } catch (err: any) {
      console.error("[AiInterviewGenerator] processing pipeline failed:", err);
      setErrorMessage({
        title: "Could Not Complete Interview Plan",
        message:
          err?.message ||
          "An error occurred while analyzing your resume. Please verify the document text and try again.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileLoaded = (loadedFile: File, text: string) => {
    setFile(loadedFile);
    setResumeText(text);
    handleStartAnalysis(loadedFile, text);
  };

  const handleSampleLoaded = (sampleText: string, sampleRole: string, sampleName: string) => {
    const dummyFile = new File([sampleText], `${sampleName.replace(/\s+/g, "_")}_Resume.pdf`, {
      type: "application/pdf",
    });
    setFile(dummyFile);
    setResumeText(sampleText);
    handleStartAnalysis(dummyFile, sampleText);
  };

  const handleResetFile = () => {
    setFile(null);
    setResumeText("");
    setAnalysis(null);
    setPrepKit(null);
    setErrorMessage(null);
  };

  const handleChangeLanguage = (newLang: AppLanguage) => {
    setLanguage(newLang);
    if (resumeText && analysis) {
      handleStartAnalysis(file, resumeText, newLang);
    }
  };

  // Check if candidate actually has programming skills detected in the document
  const hasProgrammingSkills = useMemo(() => {
    if (!analysis?.candidate?.skills) return false;
    const s = analysis.candidate.skills;
    const list = [
      ...(s.programming_languages || []),
      ...((s as any).languages || []),
    ].filter((x) => typeof x === "string" && x.trim().length > 0);
    return list.length > 0;
  }, [analysis]);

  const primaryProgrammingLanguage = useMemo(() => {
    if (!analysis?.candidate?.skills) return "JavaScript";
    const s = analysis.candidate.skills;
    const list = [
      ...(s.programming_languages || []),
      ...((s as any).languages || []),
    ].filter((x) => typeof x === "string" && x.trim().length > 0);
    return list[0] || "JavaScript";
  }, [analysis]);

  // Consolidate and normalize all generated questions into the 4 canonical categories:
  // Technical, Projects, HR, Coding
  const allNormalizedQuestions = useMemo(() => {
    if (!prepKit?.questions) return [];

    const list: PrepQuestionItem[] = [];

    // Add questions from prepKit.questions
    prepKit.questions.forEach((q, idx) => {
      let cat: "Technical" | "Projects" | "HR" | "Coding" = "Technical";
      const rawCat = (q.category || "").toLowerCase();

      if (rawCat.includes("cod") || q.source === "coding") {
        cat = "Coding";
      } else if (
        rawCat.includes("project") ||
        Boolean(q.project_name) ||
        q.source === "project"
      ) {
        cat = "Projects";
      } else if (
        rawCat.includes("hr") ||
        rawCat.includes("behavior") ||
        q.source === "behavioral"
      ) {
        cat = "HR";
      } else {
        cat = "Technical";
      }

      list.push({
        ...q,
        id: q.id || `q-${idx + 1}`,
        category: cat,
        difficulty: (q.difficulty === "advanced" ? "hard" : q.difficulty || "medium") as any,
      });
    });

    // If projects exist in deep dives, ensure each project has its core questions represented
    if (prepKit.project_deep_dives && prepKit.project_deep_dives.length > 0) {
      prepKit.project_deep_dives.forEach((deepDive, dIdx) => {
        deepDive.core_questions?.forEach((cq, cqIdx) => {
          const exists = list.some(
            (item) => item.question.toLowerCase() === cq.question.toLowerCase()
          );
          if (!exists) {
            list.push({
              id: `proj-${dIdx + 1}-q-${cqIdx + 1}`,
              question: cq.question,
              category: "Projects",
              project_name: deepDive.project_name,
              difficulty: "medium",
              priority: "must_prepare",
              source: "project",
              why_ask: cq.why_ask || "Interviewer tests authentic architecture ownership.",
              prepare: cq.prepare || [
                "Explain the problem, technical trade-offs, and your direct contribution",
              ],
              sample_answer: {
                answer: `In "${deepDive.project_name}", I architected the core flow focusing on reliable state synchronization and modularity. We balanced rapid feature turnaround against long-term maintenance by establishing typed boundaries.`,
                key_points: [
                  "Technical ownership and problem definition",
                  "Architectural trade-offs considered",
                  "Validated result and lessons learned",
                ],
                interview_tip: "Focus 70% of your answer on engineering trade-offs rather than UI descriptions.",
                is_general_guidance: false,
              },
              follow_ups: deepDive.follow_ups || [
                `How would you scale "${deepDive.project_name}" for 10x traffic?`,
              ],
            });
          }
        });
      });
    }

    // Coding questions rule:
    // If programming skills ARE detected, ensure at least one coding question exists
    if (hasProgrammingSkills) {
      const hasCoding = list.some((q) => q.category === "Coding");
      if (!hasCoding) {
        list.push({
          id: "code-q-1",
          question: `Reverse a string in ${primaryProgrammingLanguage} without using built-in reverse helpers.`,
          category: "Coding",
          code_language: primaryProgrammingLanguage,
          difficulty: "easy",
          priority: "important",
          source: "coding",
          why_ask: `Assesses baseline syntax familiarity, string manipulation, and algorithmic efficiency in ${primaryProgrammingLanguage}.`,
          prepare: [
            `Two-pointer technique or character array traversal in ${primaryProgrammingLanguage}`,
            "Handling edge cases: empty strings, single characters, and unicode characters",
            "Linear O(N) runtime and O(1) auxiliary space",
          ],
          sample_answer: {
            answer: `In ${primaryProgrammingLanguage}, we convert the string into a mutable character array if immutable, maintain two pointers at both ends (left at 0, right at length - 1), swap characters while moving inward, and join the result. This runs in linear O(N) time with O(1) auxiliary space beyond the character buffer.`,
            key_points: [
              "Two-pointer approach",
              "Linear O(N) runtime",
              "Constant O(1) extra space",
              "Clean edge case handling",
            ],
            interview_tip: `Always clarify whether strings in ${primaryProgrammingLanguage} are mutable or immutable before starting.`,
            is_general_guidance: true,
          },
          follow_ups: [
            "How would you adapt this code to check if a string is a palindrome?",
            "How does your implementation handle multi-byte unicode or emoji characters?",
          ],
        });
      }
      return list;
    }

    // If NO programming skills detected, automatically hide/strip coding questions
    return list.filter((q) => q.category !== "Coding");
  }, [prepKit, hasProgrammingSkills, primaryProgrammingLanguage]);

  // Distinct Categories available in current questions
  const availableCategories = useMemo(() => {
    const present = new Set<string>();
    allNormalizedQuestions.forEach((q) => {
      present.add(q.category);
    });
    const order = ["Technical", "Projects", "HR", "Coding"];
    return order.filter((c) => present.has(c));
  }, [allNormalizedQuestions]);

  // Filtered Questions according to active search, category, difficulty, and saved state
  const filteredQuestions = useMemo(() => {
    return allNormalizedQuestions.filter((q) => {
      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchQ = q.question.toLowerCase().includes(query);
        const matchWhy = q.why_ask?.toLowerCase().includes(query);
        const matchPrep = q.prepare?.some((p) => p.toLowerCase().includes(query));
        const matchLang = q.code_language?.toLowerCase().includes(query);
        const matchProj = q.project_name?.toLowerCase().includes(query);
        if (!matchQ && !matchWhy && !matchPrep && !matchLang && !matchProj) {
          return false;
        }
      }

      // Category
      if (selectedCategory !== "all" && q.category !== selectedCategory) {
        return false;
      }

      // Difficulty
      if (selectedDifficulty !== "all") {
        if (selectedDifficulty === "hard") {
          if (q.difficulty !== "hard" && (q.difficulty as any) !== "advanced") return false;
        } else if (q.difficulty !== selectedDifficulty) {
          return false;
        }
      }

      // Saved Only
      if (onlySaved && !savedIds[q.id]) {
        return false;
      }

      return true;
    });
  }, [allNormalizedQuestions, searchQuery, selectedCategory, selectedDifficulty, onlySaved, savedIds]);

  // Practiced Progress Calculation
  const practicedCount = useMemo(() => {
    return allNormalizedQuestions.filter((q) => preparedIds[q.id]).length;
  }, [allNormalizedQuestions, preparedIds]);

  // Saved Count
  const savedCount = useMemo(() => {
    return allNormalizedQuestions.filter((q) => savedIds[q.id]).length;
  }, [allNormalizedQuestions, savedIds]);

  // Group filtered questions by category for Section 3
  const questionsByCategory = useMemo(() => {
    const groups: Record<string, PrepQuestionItem[]> = {
      Technical: [],
      Projects: [],
      HR: [],
      Coding: [],
    };

    filteredQuestions.forEach((q) => {
      if (groups[q.category]) {
        groups[q.category].push(q);
      } else {
        groups.Technical.push(q);
      }
    });

    return groups;
  }, [filteredQuestions]);

  // Group Project-based questions by project name for Section 6
  const projectQuestionsGrouped = useMemo(() => {
    const grouped: Record<string, PrepQuestionItem[]> = {};
    questionsByCategory.Projects.forEach((q) => {
      const projName = q.project_name || "General Project Experience";
      if (!grouped[projName]) {
        grouped[projName] = [];
      }
      grouped[projName].push(q);
    });
    return grouped;
  }, [questionsByCategory.Projects]);

  const handleCopyAll = () => {
    if (allNormalizedQuestions.length === 0) return;
    const role = analysis?.candidate?.target_role || "Software Developer";
    let text = `LAKPDF AI INTERVIEW PREPARATION KIT — ${role.toUpperCase()}\n`;
    text += `Resume: ${file?.name || "candidate.pdf"}\n`;
    text += `Candidate: ${analysis?.candidate?.name || "Candidate"}\n`;
    text += `Total Questions: ${allNormalizedQuestions.length}\n\n`;

    allNormalizedQuestions.forEach((q, idx) => {
      text += `--------------------------------------------------\n`;
      text += `Question ${String(idx + 1).padStart(2, "0")} [${q.category.toUpperCase()} - ${(q.difficulty || "medium").toUpperCase()}]\n`;
      text += `${q.question}\n`;
      if (q.why_ask) text += `Why they ask: ${q.why_ask}\n`;
      if (q.prepare && q.prepare.length > 0) {
        text += `What to prepare: ${q.prepare.join(" • ")}\n`;
      }
      if (q.sample_answer?.answer) {
        text += `Expected Answer: "${q.sample_answer.answer}"\n`;
      }
      if (q.follow_ups && q.follow_ups.length > 0) {
        text += `Follow-ups: ${q.follow_ups.join(" | ")}\n`;
      }
      text += `\n`;
    });

    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleDownloadPdf = async () => {
    if (allNormalizedQuestions.length === 0) return;
    const role = analysis?.candidate?.target_role || "Software Developer";
    try {
      await aiService.exportInterviewPrepKitToPdf(
        `Interview Prep - ${role}`,
        role,
        analysis?.candidate || null,
        allNormalizedQuestions,
        prepKit?.project_deep_dives
      );
    } catch (err: any) {
      alert("Could not export PDF: " + (err?.message || "Unknown error"));
    }
  };

  return (
    <>
      <Helmet>
        <title>AI Interview Prep & Question Generator | Personalized From Resume - LAK PDF</title>
        <meta
          name="description"
          content="Upload your resume to get factual, personalized interview preparation. Practice must-prepare technical, project-based, HR, and coding questions."
        />
        <link rel="canonical" href="https://lakpdf.com/ai-interview-generator" />
      </Helmet>

      <AiApiKeyModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Interactive Mock Interview Modal (Section 13) */}
      <MockInterviewModal
        isOpen={isMockModalOpen}
        onClose={() => setIsMockModalOpen(false)}
        candidateProfile={analysis?.candidate || null}
        questions={allNormalizedQuestions}
        language={language}
      />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold mb-2">
              <Briefcase className="w-3.5 h-3.5 text-primary-600" />
              LAKPDF AI Career Studio
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              AI Interview Generator
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Upload your Resume/CV to generate structured, role-specific interview preparation directly from your verified skills, projects, and career profile.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <LanguageSelector
              currentLanguage={language}
              onChangeLanguage={handleChangeLanguage}
              disabled={isProcessing}
            />

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

        {/* Global Error Banner */}
        {errorMessage && (
          <div
            role="alert"
            className="mt-6 p-4 rounded-2xl border border-rose-200 bg-rose-50 text-rose-900 shadow-xs flex items-start gap-3 animate-in fade-in"
          >
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-bold text-sm text-rose-950">{errorMessage.title}</h4>
              <p className="text-xs sm:text-sm text-rose-800 mt-0.5 leading-relaxed">
                {errorMessage.message}
              </p>
              <div className="mt-3">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => resumeText && handleStartAnalysis(file, resumeText)}
                  className="bg-rose-600 hover:bg-rose-700"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                  Try Again
                </Button>
              </div>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs font-semibold text-rose-600 hover:text-rose-800 px-2 py-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Step 1: Resume Upload Component */}
        <div className="mt-8">
          <ResumeUploader
            onFileLoaded={handleFileLoaded}
            isLoading={isProcessing}
            onSampleLoaded={handleSampleLoaded}
            currentFile={file}
            onResetFile={handleResetFile}
          />
        </div>

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="mt-6">
            <ProcessingProgress currentStage={processingStage} />
          </div>
        )}

        {/* ── GENERATED RESULT SECTION (Only visible once analyzed) ──────────────── */}
        {analysis && !isProcessing && prepKit && (
          <div className="mt-8 space-y-8 animate-in fade-in slide-in-from-bottom-2">
            {/* 1. Interview Summary & 2. Detected Skills */}
            <ProfileSummaryCard
              profile={analysis.candidate}
              fileName={file?.name}
              totalQuestions={allNormalizedQuestions.length}
              overview={analysis.summary?.overview}
            />

            {/* 11. Practice Progress Bar */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Preparation Tracker
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    Questions Practiced
                  </h3>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="text-2xl font-black text-primary-600">
                    {practicedCount}
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    / {allNormalizedQuestions.length}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 ml-1">
                    {allNormalizedQuestions.length > 0
                      ? `${Math.round((practicedCount / allNormalizedQuestions.length) * 100)}% complete`
                      : "0%"}
                  </span>
                </div>
              </div>

              {/* Progress Track */}
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-primary-600 h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${
                      allNormalizedQuestions.length > 0
                        ? (practicedCount / allNormalizedQuestions.length) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* 10. Question Filters & Action Toolbar */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                    Interview Curriculum
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Showing {filteredQuestions.length} of {allNormalizedQuestions.length} questions
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* 13. Prominent Mock Interview CTA */}
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => setIsMockModalOpen(true)}
                    className="bg-primary-600 hover:bg-primary-700 shadow-md hover:shadow-lg transition-all"
                  >
                    <Mic className="w-4 h-4 mr-2" />
                    🎤 Start Mock Interview
                  </Button>

                  <button
                    type="button"
                    onClick={handleCopyAll}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    {copiedAll ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    {copiedAll ? "Copied!" : "Copy Kit"}
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-50 text-rose-900 border border-rose-200 hover:bg-rose-100 flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5 text-primary-600" />
                    Download PDF
                  </button>
                </div>
              </div>

              {/* Filter Controls */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {/* Search Bar */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search questions..."
                      className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>

                  {/* Difficulty Filter */}
                  <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
                    {(["all", "easy", "medium", "hard"] as const).map((diff) => (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => setSelectedDifficulty(diff)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                          selectedDifficulty === diff
                            ? "bg-white text-slate-900 shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {diff === "all" ? "All" : diff}
                      </button>
                    ))}
                  </div>

                  {/* Saved Questions Toggle (Section 12) */}
                  <button
                    type="button"
                    onClick={() => setOnlySaved(!onlySaved)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                      onlySaved
                        ? "bg-amber-50 text-amber-900 border-amber-300 shadow-2xs"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        onlySaved ? "text-amber-500 fill-amber-500" : "text-slate-400"
                      }`}
                    />
                    Saved ({savedCount})
                  </button>
                </div>

                {/* Category Pills (Section 10) */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
                    <Filter className="w-3 h-3" /> Category:
                  </span>

                  <button
                    type="button"
                    onClick={() => setSelectedCategory("all")}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      selectedCategory === "all"
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    All
                  </button>

                  {availableCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        selectedCategory === cat
                          ? "bg-primary-600 text-white shadow-xs"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                      }`}
                    >
                      {cat === "Projects"
                        ? "Projects"
                        : cat === "HR"
                        ? "HR"
                        : cat === "Coding"
                        ? "Coding"
                        : "Technical"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Questions by Category */}
            <div className="space-y-10">
              {filteredQuestions.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
                  <p className="text-sm font-semibold text-slate-700">
                    No questions match your current search or filter criteria.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory("all");
                      setSelectedDifficulty("all");
                      setOnlySaved(false);
                    }}
                    className="mt-3 text-xs font-bold text-primary-600 hover:text-primary-700 underline"
                  >
                    Reset All Filters
                  </button>
                </div>
              ) : (
                <>
                  {/* Category 1: Technical Questions */}
                  {(selectedCategory === "all" || selectedCategory === "Technical") &&
                    questionsByCategory.Technical.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-primary-600"></span>
                            Technical Questions
                          </h3>
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {questionsByCategory.Technical.length} questions
                          </span>
                        </div>

                        <div className="space-y-4">
                          {questionsByCategory.Technical.map((q, idx) => (
                            <QuestionCard
                              key={q.id || idx}
                              question={q}
                              index={idx}
                              isPrepared={Boolean(preparedIds[q.id])}
                              isSaved={Boolean(savedIds[q.id])}
                              onTogglePrepared={handleTogglePrepared}
                              onToggleSave={handleToggleSave}
                              onEvaluateAnswer={async (item, ans) => {
                                return aiService.evaluateInterviewAnswerDetailed(
                                  item.question,
                                  ans,
                                  {
                                    whyAsk: item.why_ask,
                                    prepare: item.prepare,
                                    language,
                                  }
                                );
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Category 2: Project-Based Questions (Section 6) */}
                  {(selectedCategory === "all" || selectedCategory === "Projects") &&
                    questionsByCategory.Projects.length > 0 && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                            <FolderGit2 className="w-5 h-5 text-amber-600" />
                            Project-Based Questions
                          </h3>
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                            {questionsByCategory.Projects.length} questions
                          </span>
                        </div>

                        {/* Grouped by project if multiple projects exist */}
                        {Object.entries(projectQuestionsGrouped).map(([projName, projQuestions], pIdx) => (
                          <div key={pIdx} className="space-y-3">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs font-bold">
                              <FolderGit2 className="w-3.5 h-3.5 text-amber-600" />
                              Project: {projName}
                            </div>

                            <div className="space-y-4">
                              {projQuestions.map((q, idx) => (
                                <QuestionCard
                                  key={q.id || idx}
                                  question={q}
                                  index={idx}
                                  isPrepared={Boolean(preparedIds[q.id])}
                                  isSaved={Boolean(savedIds[q.id])}
                                  onTogglePrepared={handleTogglePrepared}
                                  onToggleSave={handleToggleSave}
                                  onEvaluateAnswer={async (item, ans) => {
                                    return aiService.evaluateInterviewAnswerDetailed(
                                      item.question,
                                      ans,
                                      {
                                        whyAsk: item.why_ask,
                                        prepare: item.prepare,
                                        language,
                                      }
                                    );
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                  {/* Category 3: HR / Behavioral Questions (Section 8) */}
                  {(selectedCategory === "all" || selectedCategory === "HR") &&
                    questionsByCategory.HR.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                            HR / Behavioral Questions
                          </h3>
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                            {questionsByCategory.HR.length} questions
                          </span>
                        </div>

                        <div className="space-y-4">
                          {questionsByCategory.HR.map((q, idx) => (
                            <QuestionCard
                              key={q.id || idx}
                              question={q}
                              index={idx}
                              isPrepared={Boolean(preparedIds[q.id])}
                              isSaved={Boolean(savedIds[q.id])}
                              onTogglePrepared={handleTogglePrepared}
                              onToggleSave={handleToggleSave}
                              onEvaluateAnswer={async (item, ans) => {
                                return aiService.evaluateInterviewAnswerDetailed(
                                  item.question,
                                  ans,
                                  {
                                    whyAsk: item.why_ask,
                                    prepare: item.prepare,
                                    language,
                                  }
                                );
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Category 4: Coding Questions (Section 9 - only if programming skills detected) */}
                  {hasProgrammingSkills &&
                    (selectedCategory === "all" || selectedCategory === "Coding") &&
                    questionsByCategory.Coding.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                            <Code2 className="w-5 h-5 text-indigo-600" />
                            Coding Questions
                          </h3>
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">
                            {questionsByCategory.Coding.length} questions
                          </span>
                        </div>

                        <div className="space-y-4">
                          {questionsByCategory.Coding.map((q, idx) => (
                            <QuestionCard
                              key={q.id || idx}
                              question={q}
                              index={idx}
                              isPrepared={Boolean(preparedIds[q.id])}
                              isSaved={Boolean(savedIds[q.id])}
                              onTogglePrepared={handleTogglePrepared}
                              onToggleSave={handleToggleSave}
                              onEvaluateAnswer={async (item, ans) => {
                                return aiService.evaluateInterviewAnswerDetailed(
                                  item.question,
                                  ans,
                                  {
                                    whyAsk: item.why_ask,
                                    prepare: item.prepare,
                                    language,
                                  }
                                );
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                </>
              )}
            </div>

            {/* 13. End of Page Mock Interview CTA Banner */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-6 sm:p-8 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-lg">
              <div className="space-y-1 max-w-xl">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Simulation Practice
                </span>
                <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                  Ready to test your answers in a real simulation?
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Start an interactive mock interview with Alex, your Senior AI Interviewer. Get real-time conversational grilling, scoring, and follow-ups.
                </p>
              </div>

              <Button
                variant="primary"
                size="lg"
                onClick={() => setIsMockModalOpen(true)}
                className="bg-primary-600 hover:bg-primary-700 text-white font-extrabold px-6 py-3 rounded-2xl shadow-md shrink-0"
              >
                <Mic className="w-5 h-5 mr-2" />
                🎤 Start Mock Interview
              </Button>
            </div>
          </div>
        )}

        {/* SEO Content Section */}
        <div className="mt-16">
          <ToolSEOContent toolKey="/ai-interview-generator" />
        </div>
      </div>
    </>
  );
};

export default AiInterviewGenerator;
