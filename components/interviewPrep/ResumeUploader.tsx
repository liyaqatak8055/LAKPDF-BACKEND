import React, { useRef, useState } from 'react';
import {
  Upload,
  FileText,
  AlertCircle,
  Sparkles,
  FileCheck,
  Trash2,
  RefreshCw,
  CheckCircle2,
  HelpCircle,
  FileCode,
} from 'lucide-react';
import { formatBytes } from '../../services/pdfService';
import { Button } from '../Button';

interface ResumeUploaderProps {
  onFileLoaded: (file: File, extractedText: string) => void;
  isLoading: boolean;
  onSampleLoaded: (sampleText: string, sampleRole: string, sampleName: string) => void;
  currentFile: File | null;
  onResetFile: () => void;
}

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];

export const ResumeUploader: React.FC<ResumeUploaderProps> = ({
  onFileLoaded,
  isLoading,
  onSampleLoaded,
  currentFile,
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

  const validateAndProcessFile = async (file: File) => {
    setValidationError(null);

    // 1. Check size
    if (file.size === 0) {
      setValidationError({
        title: 'Empty File',
        message: 'The uploaded file contains 0 bytes.',
        recovery: 'Please select a valid, non-empty resume document.',
      });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setValidationError({
        title: 'File Too Large',
        message: `File size (${formatBytes(file.size)}) exceeds the 15MB limit.`,
        recovery: 'Please upload a standard-sized resume or compress the document.',
      });
      return;
    }

    // 2. Check extension
    const fileName = (file.name || '').toLowerCase();
    const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => fileName.endsWith(ext));
    if (!hasValidExt) {
      setValidationError({
        title: 'Unsupported File Format',
        message: `"${file.name}" is not a supported document format.`,
        recovery: 'Please upload a PDF (.pdf) or Word document (.docx, .doc).',
      });
      return;
    }

    // 3. Extract text
    setIsExtracting(true);
    setReadingStatus('Extracting readable text...');

    try {
      const { extractTextFromAnyDocument } = await import('../../services/pdfTextExtractor');
      const data = await extractTextFromAnyDocument(file, (st) => setReadingStatus(st));

      const cleanText = (data?.fullText || '').trim();

      if (!cleanText || cleanText.length < 50) {
        setValidationError({
          title: 'No Readable Text Found',
          message: "We couldn't read sufficient text from this resume.",
          recovery:
            'This might be a scanned image or photo PDF. Try uploading a text-based PDF or DOCX file exported directly from Word or Google Docs.',
        });
        setIsExtracting(false);
        return;
      }

      onFileLoaded(file, cleanText);
    } catch (err: any) {
      console.error('[ResumeUploader] text extraction failed:', err);
      setValidationError({
        title: 'Document Reading Error',
        message: err?.message || 'Could not parse text from this document.',
        recovery: 'Please check that the file is not password-protected or corrupted, then try again.',
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
      validateAndProcessFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndProcessFile(files[0]);
      e.target.value = '';
    }
  };

  // Realistic sample resumes
  const handleLoadFrontendFresher = () => {
    const text = `PRIYA SHARMA
Email: priya.sharma@example.com | Phone: +91 9876543210
Location: Bengaluru, India | GitHub: github.com/priyasharma-dev | LinkedIn: linkedin.com/in/priyasharma

CAREER OBJECTIVE:
Enthusiastic and detail-oriented Computer Science graduate seeking a Frontend Developer role. Skilled in building responsive, accessible web interfaces using React, JavaScript, HTML5, and Tailwind CSS.

EDUCATION:
B.Tech in Computer Science & Engineering (2020 – 2024)
Vellore Institute of Technology (VIT), CGPA: 8.7/10

TECHNICAL SKILLS:
• Programming Languages: JavaScript (ES6+), TypeScript, HTML5, CSS3
• Frontend Frameworks & Libraries: React.js, Redux Toolkit, Tailwind CSS, Vite
• Developer Tools: Git, GitHub, VS Code, Postman, Chrome DevTools
• Databases: MongoDB (basic), PostgreSQL (basic)

ACADEMIC & PERSONAL PROJECTS:
1. LAK PDF Studio (React, Tailwind CSS, Web Workers)
• Developed an interactive client-side PDF utility application featuring document preview and page reorganization.
• Implemented drag-and-drop file uploading and modular client-side state handling using React hooks.
• Optimized initial page load by code-splitting heavy parsing modules, decreasing bundle size by 35%.

2. CodeMasti — Developer Quiz & MCQ Platform (React, Node.js, Express, MongoDB)
• Created a full-stack interactive quiz application with over 200 technical coding questions.
• Designed responsive UI components and dark mode support using Tailwind CSS.
• Built RESTful endpoints in Node.js/Express to persist candidate scores and topic statistics.

INTERNSHIP:
Frontend Engineering Intern — TechNova Solutions (Jan 2024 – May 2024)
• Built 12+ reusable UI components adhering to WCAG 2.1 accessibility standards.
• Collaborated with backend engineers to integrate GraphQL queries and handle client error states.
• Improved mobile responsiveness across tablet and smartphone screen sizes.

CERTIFICATIONS & ACHIEVEMENTS:
• Meta Certified Frontend Developer Specialization (Coursera, 2023)
• Finalist, Smart India Hackathon 2023 (Developed accessible citizen portal)`;

    onSampleLoaded(text, 'Frontend Developer', 'Priya Sharma');
  };

  const handleLoadSeniorFullStack = () => {
    const text = `ROHAN VERMA — Senior Full Stack Engineer
Email: rohan.verma@example.com | Location: Hyderabad, India | GitHub: github.com/rohanverma | LinkedIn: linkedin.com/in/rohanverma

SUMMARY:
Senior Full Stack Engineer with 6+ years of production experience architecting high-scale distributed systems and real-time web applications. Proven track record in scaling microservices to 12M monthly requests with 99.98% SLA, reducing database latency by 45%, and leading cross-functional teams of 8 engineers.

TECHNICAL EXPERTISE:
• Languages: TypeScript, JavaScript (ES6+), Go, Python, SQL
• Frontend: React 18, Next.js, Redux Toolkit, WebSockets, Tailwind CSS, Jest
• Backend & Cloud: Node.js, Express, Go (Gin), PostgreSQL, Redis, Docker, Kubernetes, AWS (S3, ECS, Lambda, CloudFront)
• Architecture: Microservices, Event-Driven Architecture (Kafka), CI/CD (GitHub Actions), REST & gRPC

PROFESSIONAL EXPERIENCE:
Senior Full Stack Engineer — CloudPulse Technologies (2021 – Present)
• Architected enterprise workflow automation engine processing 40,000 tasks/minute using Node.js, Redis queues, and PostgreSQL.
• Reduced API p99 response times from 340ms to 92ms through query optimization and distributed Redis caching.
• Led cloud migration from monolithic EC2 instances to containerized Kubernetes (EKS) clusters, decreasing hosting costs by 28%.
• Mentored 6 software engineers in test-driven development, code reviews, and microservice decoupling.

Software Engineer — FinMetrics Software (2018 – 2021)
• Engineered high-frequency stock analytics dashboard using React, Next.js, and WebSocket streaming.
• Implemented role-based access control (RBAC) and OAuth2/JWT security authentication compliant with SOC 2 standards.

KEY PROJECTS:
1. StreamPulse Event Engine
• Developed real-time telemetry pipeline ingesting 5M events daily using Go, Kafka, and TimescaleDB.
2. DocuSync Collaboration Suite
• Built browser-based collaborative markdown and PDF workspace with operational transformation and CRDTs.

EDUCATION:
B.Tech in Information Technology — NIT Warangal (2014 – 2018)`;

    onSampleLoaded(text, 'Senior Full Stack Engineer', 'Rohan Verma');
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Validation Alert */}
      {validationError && (
        <div
          role="alert"
          className="mb-6 p-4 rounded-2xl border border-rose-200 bg-rose-50 text-rose-900 shadow-sm animate-in fade-in"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <h4 className="font-bold text-sm text-rose-950">{validationError.title}</h4>
              <p className="text-xs sm:text-sm text-rose-800 leading-relaxed">{validationError.message}</p>
              <div className="mt-2 p-2.5 rounded-xl bg-white/80 border border-rose-200 text-xs text-rose-900 flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>
                  <strong>What you can do: </strong>
                  {validationError.recovery}
                </span>
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

      {/* File Upload / Ready Card */}
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
            {/* Top Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold mb-6">
              <Sparkles className="w-3.5 h-3.5 text-primary-600" />
              Upload-First AI Career Intelligence
            </div>

            <div className="w-20 h-20 rounded-2xl bg-rose-50 text-primary-600 flex items-center justify-center mx-auto mb-5 group-hover:scale-105 transition-transform duration-200 shadow-xs border border-rose-100">
              {isExtracting ? (
                <RefreshCw className="w-9 h-9 animate-spin text-primary-600" />
              ) : (
                <Upload className="w-9 h-9 text-primary-600" />
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
              {isExtracting ? readingStatus || 'Reading Resume...' : 'Prepare for your next interview'}
            </h2>

            <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto mb-6 leading-relaxed">
              Upload your resume and get personalized interview questions based on your skills, projects, experience,
              and career profile.
            </p>

            {/* Primary CTA */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
              <Button
                variant="primary"
                size="lg"
                disabled={isExtracting || isLoading}
                className="bg-primary-600 hover:bg-primary-700 shadow-md hover:shadow-lg transition-all"
              >
                <Upload className="w-4 h-4 mr-2" />
                {isExtracting ? 'Analyzing Document...' : 'Upload Resume'}
              </Button>
            </div>

            {/* Supported Formats */}
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-slate-500 mb-6">
              <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">PDF</span>
              <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">DOC</span>
              <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">DOCX</span>
              <span className="text-slate-400">• Up to 15MB</span>
            </div>

            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Your resume is analyzed strictly to generate questions relevant to your verified profile. We never invent
              unlisted skills or projects.
            </p>

            {/* Sample Resumes Preset */}
            <div className="mt-8 pt-6 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                Or test instantly with verified sample profiles:
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleLoadFrontendFresher}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-2 shadow-xs transition-all hover:border-slate-300"
                >
                  <FileCode className="w-3.5 h-3.5 text-blue-600" />
                  Frontend Fresher (React / JavaScript)
                </button>
                <button
                  type="button"
                  onClick={handleLoadSeniorFullStack}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-2 shadow-xs transition-all hover:border-slate-300"
                >
                  <FileText className="w-3.5 h-3.5 text-primary-600" />
                  Senior Full Stack (6+ yrs Microservices)
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* File Loaded / Ready Summary Bar */
        <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 border border-primary-100">
              <FileCheck className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-900 text-sm sm:text-base truncate max-w-sm sm:max-w-md">
                  {currentFile.name}
                </h4>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" /> Ready
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {formatBytes(currentFile.size)} • {currentFile.name.split('.').pop()?.toUpperCase()} Document
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              Replace File
            </button>
            <button
              type="button"
              onClick={onResetFile}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-100 flex items-center gap-1.5 transition-colors"
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
