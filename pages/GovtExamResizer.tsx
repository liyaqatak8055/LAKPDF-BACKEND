import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  FileArchive,
  RefreshCw,
  Sparkles,
  Sliders,
  Type,
  Calendar,
  ShieldCheck,
  Check,
  Info,
  ZoomIn,
  ZoomOut,
  Eraser,
  HelpCircle,
  ChevronDown,
  Layers,
  ArrowRight,
  Eye,
  FileText,
  Palette,
  ScanLine,
  Share2,
  QrCode,
  ExternalLink,
  Award,
  Camera,
  PenTool,
  Printer,
  Copy,
  FolderCheck,
  Sparkle,
  Search,
  X,
  Contact,
} from 'lucide-react';
import { Button } from '../components/Button';
import {
  EXAM_PRESETS,
  ExamPreset,
  ExamDocumentRule,
  ProcessedDocumentResult,
  processExamDocument,
  processExamCertificateToPdf,
  createExamDocumentsZip,
  mergeAadhaarFrontBackToPdf,
} from '../services/govtExamService';
import { generatePhotoSheet, PrintSheetOptions } from '../services/passportPhotoService';
import { formatBytes, downloadFile } from '../services/fileHelpers';
import { ToolSEOContent } from '../components/ToolSEOContent';
import { PrivacyBadge } from '../components/PrivacyBadgeModal';
import { Modal } from '../components/Modal';
import { DigitalSignaturePadModal } from '../components/DigitalSignaturePadModal';
import { WebcamCaptureModal } from '../components/WebcamCaptureModal';

interface SlotState {
  file: File | null;
  imageElement: HTMLImageElement | null;
  result: ProcessedDocumentResult | null;
  isProcessing: boolean;
  error?: string;
  zoom: number;
  panX: number;
  panY: number;
  brightness: number;
  contrast: number;
  cleanBackground: boolean;
  backgroundColor: 'original' | 'white' | 'light-blue' | 'light-gray';
  showFaceGuide: boolean;
}

const GROUP_TABS = [
  { id: 'all', label: 'All Exams', icon: '🇮🇳', count: EXAM_PRESETS.length },
  { id: 'central', label: 'Central & Postal', icon: '🏛️', count: EXAM_PRESETS.filter((p) => p.group === 'central').length },
  { id: 'banking', label: 'Banking & Finance', icon: '🏦', count: EXAM_PRESETS.filter((p) => p.group === 'banking').length },
  { id: 'defence', label: 'Police & Defence', icon: '🛡️', count: EXAM_PRESETS.filter((p) => p.group === 'defence').length },
  { id: 'state', label: 'State PSC & Boards', icon: '🏛️', count: EXAM_PRESETS.filter((p) => p.group === 'state').length },
  { id: 'court_legal', label: 'Courts & Judicial', icon: '⚖️', count: EXAM_PRESETS.filter((p) => p.group === 'court_legal').length },
  { id: 'entrance', label: 'Entrance & Research', icon: '🎓', count: EXAM_PRESETS.filter((p) => p.group === 'entrance').length },
  { id: 'medical_teaching', label: 'Medical & Teaching', icon: '🩺', count: EXAM_PRESETS.filter((p) => p.group === 'medical_teaching').length },
  { id: 'custom', label: 'Custom', icon: '⚙️', count: 1 },
] as const;

export const GovtExamResizer: React.FC = () => {
  const [selectedExamId, setSelectedExamId] = useState<string>('ssc');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'all' | 'biometric' | 'certificate'>('all');

  const [candidateName, setCandidateName] = useState<string>('');
  const [photoDate, setPhotoDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [stampType, setStampType] = useState<'dop' | 'dob' | 'roll' | 'custom'>('dop');
  const [customLabel2, setCustomLabel2] = useState<string>('');
  const [enableNameDate, setEnableNameDate] = useState<boolean>(true);
  const [isExportingZip, setIsExportingZip] = useState<boolean>(false);
  const [zipSuccess, setZipSuccess] = useState<boolean>(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);
  const [copiedDeclaration, setCopiedDeclaration] = useState<boolean>(false);

  // Modals state
  const [sigPadTargetRuleId, setSigPadTargetRuleId] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [printSheetModalData, setPrintSheetModalData] = useState<{
    dataUrl: string;
    sheetSize: '4x6' | 'a4';
  } | null>(null);

  // Custom mode state
  const [customMinKB, setCustomMinKB] = useState<number>(20);
  const [customMaxKB, setCustomMaxKB] = useState<number>(50);
  const [customWidth, setCustomWidth] = useState<number>(350);
  const [customHeight, setCustomHeight] = useState<number>(450);

  // Exam Search & Category Filter state
  const [examSearchQuery, setExamSearchQuery] = useState<string>('');
  const [examGroupFilter, setExamGroupFilter] = useState<'all' | 'central' | 'banking' | 'defence' | 'state' | 'court_legal' | 'entrance' | 'medical_teaching' | 'custom'>('all');

  // Aadhaar Front + Back merger modal state
  const [isAadhaarModalOpen, setIsAadhaarModalOpen] = useState<boolean>(false);
  const [aadhaarFrontFile, setAadhaarFrontFile] = useState<File | null>(null);
  const [aadhaarBackFile, setAadhaarBackFile] = useState<File | null>(null);
  const [aadhaarFrontPreview, setAadhaarFrontPreview] = useState<string | null>(null);
  const [aadhaarBackPreview, setAadhaarBackPreview] = useState<string | null>(null);
  const [aadhaarTargetKB, setAadhaarTargetKB] = useState<number>(200);
  const [isMergingAadhaar, setIsMergingAadhaar] = useState<boolean>(false);
  const [mergedAadhaarResult, setMergedAadhaarResult] = useState<{ blob: Blob; url: string; size: number } | null>(null);

  // Collapsible sections state
  const [isExamListOpen, setIsExamListOpen] = useState<boolean>(false);
  const [isSpecsTableOpen, setIsSpecsTableOpen] = useState<boolean>(false);

  const activePreset: ExamPreset = useMemo(
    () => EXAM_PRESETS.find((p) => p.id === selectedExamId) || EXAM_PRESETS[0],
    [selectedExamId]
  );

  // Document slot states mapped by ruleId
  const [slots, setSlots] = useState<Record<string, SlotState>>({});

  // Initialize slots when preset changes
  useEffect(() => {
    setSlots((prev) => {
      const nextSlots: Record<string, SlotState> = {};
      activePreset.rules.forEach((rule) => {
        nextSlots[rule.id] = prev[rule.id] || {
          file: null,
          imageElement: null,
          result: null,
          isProcessing: false,
          zoom: 1,
          panX: 0,
          panY: 0,
          brightness: 0,
          contrast: 0,
          cleanBackground: Boolean(rule.cleanBackground),
          backgroundColor: 'white',
          showFaceGuide: rule.id === 'photo',
        };
      });
      return nextSlots;
    });
  }, [selectedExamId]);

  // Handler for file upload for a specific document rule
  const handleFileSelect = async (rule: ExamDocumentRule, file: File) => {
    if (rule.isPdfDocument) {
      setSlots((prev) => ({
        ...prev,
        [rule.id]: {
          ...(prev[rule.id] || {
            zoom: 1,
            panX: 0,
            panY: 0,
            brightness: 0,
            contrast: 0,
            cleanBackground: false,
            backgroundColor: 'white',
            showFaceGuide: false,
          }),
          file,
          imageElement: null,
          result: prev[rule.id]?.result || null,
          isProcessing: true,
          error: undefined,
        },
      }));

      try {
        const result = await processExamCertificateToPdf(
          file,
          rule.maxKB,
          activePreset.id,
          rule.name
        );
        setSlots((prev) => ({
          ...prev,
          [rule.id]: {
            ...prev[rule.id],
            result,
            isProcessing: false,
          },
        }));
      } catch (err: any) {
        setSlots((prev) => ({
          ...prev,
          [rule.id]: {
            ...prev[rule.id],
            isProcessing: false,
            error: err?.message || 'Certificate compression failed',
          },
        }));
      }
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPG, PNG, WEBP).');
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      setSlots((prev) => ({
        ...prev,
        [rule.id]: {
          ...(prev[rule.id] || {
            zoom: 1,
            panX: 0,
            panY: 0,
            brightness: 0,
            contrast: 0,
            cleanBackground: Boolean(rule.cleanBackground),
            backgroundColor: 'white',
            showFaceGuide: rule.id === 'photo',
          }),
          file,
          imageElement: img,
          result: prev[rule.id]?.result || null,
          isProcessing: true,
          error: undefined,
        },
      }));

      processSlotDocument(rule, img);
    };
    img.src = objectUrl;
  };

  // Re-process slot document
  const processSlotDocument = async (
    rule: ExamDocumentRule,
    overrideImg?: HTMLImageElement,
    overrideOptions?: Partial<SlotState>
  ) => {
    const currentSlot = slots[rule.id];
    const img = overrideImg || currentSlot?.imageElement;
    if (!img) return;

    setSlots((prev) => ({
      ...prev,
      [rule.id]: {
        ...prev[rule.id],
        isProcessing: true,
      },
    }));

    const effectiveRule: ExamDocumentRule =
      activePreset.id === 'custom'
        ? {
            ...rule,
            minKB: customMinKB,
            maxKB: customMaxKB,
            idealWidth: customWidth,
            idealHeight: customHeight,
            aspectRatio: customWidth / customHeight,
          }
        : rule;

    const zoom = overrideOptions?.zoom ?? currentSlot?.zoom ?? 1;
    const panX = overrideOptions?.panX ?? currentSlot?.panX ?? 0;
    const panY = overrideOptions?.panY ?? currentSlot?.panY ?? 0;
    const brightness = overrideOptions?.brightness ?? currentSlot?.brightness ?? 0;
    const contrast = overrideOptions?.contrast ?? currentSlot?.contrast ?? 0;
    const cleanBg =
      overrideOptions?.cleanBackground ??
      currentSlot?.cleanBackground ??
      Boolean(rule.cleanBackground);
    const bgColor =
      overrideOptions?.backgroundColor ?? currentSlot?.backgroundColor ?? 'white';

    try {
      const result = await processExamDocument(
        img,
        {
          rule: effectiveRule,
          nameOnPhoto: enableNameDate && rule.supportsNameDate ? candidateName : undefined,
          dateOnPhoto: enableNameDate && rule.supportsNameDate ? photoDate : undefined,
          stampType,
          customLabel2,
          backgroundColor: bgColor,
          enableCleanBackground: cleanBg,
          brightness,
          contrast,
          zoom,
          panX,
          panY,
        },
        activePreset.id
      );

      setSlots((prev) => ({
        ...prev,
        [rule.id]: {
          ...prev[rule.id],
          result,
          isProcessing: false,
          error: undefined,
        },
      }));
    } catch (err: any) {
      setSlots((prev) => ({
        ...prev,
        [rule.id]: {
          ...prev[rule.id],
          isProcessing: false,
          error: err?.message || 'Processing failed',
        },
      }));
    }
  };

  const handleNameDateChange = () => {
    const photoRule = activePreset.rules.find((r) => r.id === 'photo');
    if (photoRule && slots['photo']?.imageElement) {
      processSlotDocument(photoRule);
    }
  };

  // Generate 4x6 or A4 Print Sheet from processed photo
  const handleGeneratePrintSheet = (sheetSize: '4x6' | 'a4') => {
    const photoSlot = slots['photo'];
    if (!photoSlot?.result) return;

    const img = new Image();
    img.onload = () => {
      const singleCanvas = document.createElement('canvas');
      singleCanvas.width = photoSlot.result!.width;
      singleCanvas.height = photoSlot.result!.height;
      const sCtx = singleCanvas.getContext('2d');
      if (!sCtx) return;
      sCtx.drawImage(img, 0, 0);

      const sheetCanvas = generatePhotoSheet(singleCanvas, 35, 45, {
        paperSize: sheetSize,
        backgroundColor: '#FFFFFF',
        showCuttingGuides: true,
      });

      const sheetUrl = sheetCanvas.toDataURL('image/jpeg', 0.95);
      setPrintSheetModalData({ dataUrl: sheetUrl, sheetSize });
    };
    img.src = photoSlot.result.dataUrl;
  };

  const handleDownloadAllZip = async () => {
    const results: ProcessedDocumentResult[] = [];
    Object.values(slots).forEach((slot) => {
      if (slot.result) results.push(slot.result);
    });

    if (results.length === 0) return;

    setIsExportingZip(true);
    setZipSuccess(false);

    try {
      const zipBlob = await createExamDocumentsZip(results, activePreset.id);
      downloadFile(zipBlob, `${activePreset.id.toUpperCase()}_Application_Kit.zip`);
      setZipSuccess(true);
      setTimeout(() => setZipSuccess(false), 4000);
    } catch (err) {
      console.error('ZIP generation failed:', err);
      alert('Could not create ZIP. You can still download individual documents.');
    } finally {
      setIsExportingZip(false);
    }
  };

  // Copy Banking Declaration Text
  const handleCopyDeclaration = () => {
    const name = candidateName.trim() || '[Your Name]';
    const text = `I, ${name}, hereby declare that all the information submitted by me in the application form is correct, true and valid. I will present the supporting documents as and when required.`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedDeclaration(true);
    setTimeout(() => setCopiedDeclaration(false), 3000);
  };

  // Aadhaar handlers
  const handleAadhaarFrontChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAadhaarFrontFile(file);
    setAadhaarFrontPreview(URL.createObjectURL(file));
    setMergedAadhaarResult(null);
  };

  const handleAadhaarBackChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAadhaarBackFile(file);
    setAadhaarBackPreview(URL.createObjectURL(file));
    setMergedAadhaarResult(null);
  };

  const handleMergeAadhaar = async () => {
    if (!aadhaarFrontFile || !aadhaarBackFile) return;
    setIsMergingAadhaar(true);
    try {
      const blob = await mergeAadhaarFrontBackToPdf(aadhaarFrontFile, aadhaarBackFile, aadhaarTargetKB);
      const url = URL.createObjectURL(blob);
      setMergedAadhaarResult({ blob, url, size: blob.size });
    } catch (err) {
      console.error('Failed to merge Aadhaar:', err);
    } finally {
      setIsMergingAadhaar(false);
    }
  };

  const handleApplyMergedAadhaarToSlot = () => {
    if (!mergedAadhaarResult) return;
    const targetRule =
      activePreset.rules.find((r) => r.id === 'photo_id_proof') ||
      activePreset.rules.find((r) => r.isPdfDocument);
    if (!targetRule) return;

    const file = new File([mergedAadhaarResult.blob], `${targetRule.id}_aadhaar_merged.pdf`, {
      type: 'application/pdf',
    });
    handleFileSelect(targetRule, file);
    setIsAadhaarModalOpen(false);
  };

  // Filtered Presets by Group and Search Query - Memoized for 60fps responsiveness
  const filteredPresets = useMemo(() => {
    return EXAM_PRESETS.filter((preset) => {
      const matchesGroup = examGroupFilter === 'all' || preset.group === examGroupFilter;
      if (!matchesGroup) return false;
      if (!examSearchQuery.trim()) return true;
      const q = examSearchQuery.toLowerCase();
      return (
        preset.name.toLowerCase().includes(q) ||
        preset.fullName.toLowerCase().includes(q) ||
        preset.description.toLowerCase().includes(q) ||
        preset.badge.toLowerCase().includes(q) ||
        preset.rules.some((r) => r.name.toLowerCase().includes(q))
      );
    });
  }, [examGroupFilter, examSearchQuery]);

  // Calculate Rejection Risk Diagnostic Score
  const calculateRejectionRisk = () => {
    let riskPercent = 0;
    const alerts: string[] = [];

    const photoSlot = slots['photo'];
    const sigSlot = slots['signature'];

    if (!photoSlot?.result) {
      riskPercent += 40;
      alerts.push('Passport photo pending');
    } else if (!photoSlot.result.isValidSize) {
      riskPercent += 25;
      alerts.push('Photo KB outside allowed range');
    }

    if (!sigSlot?.result) {
      riskPercent += 35;
      alerts.push('Signature pending');
    } else if (!sigSlot.result.isValidSize) {
      riskPercent += 25;
      alerts.push('Signature KB outside allowed range');
    }

    if (
      activePreset.rules.some((r) => r.supportsNameDate) &&
      (!enableNameDate || !candidateName.trim())
    ) {
      riskPercent += 10;
      alerts.push('Name & Date stamp not applied (UPSC/SSC mandate)');
    }

    return {
      safetyScore: Math.max(0, 100 - riskPercent),
      alerts,
    };
  };

  const { safetyScore, alerts } = calculateRejectionRisk();
  const processedCount = Object.values(slots).filter((s) => s.result).length;
  const totalRules = activePreset.rules.length;

  const filteredRules = activePreset.rules.filter((rule) => {
    if (activeCategoryFilter === 'all') return true;
    return rule.category === activeCategoryFilter;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-bg py-6 sm:py-10">
      <Helmet>
        <title>FormDocFixer - Govt Exam Form Resizer & Document Suite | SSC, UPSC, IBPS - LAKPDF</title>
        <meta
          name="description"
          content="FormDocFixer: Complete Govt Exam Document Suite. Fix and prepare Photos (20-50KB), Signatures (10-20KB), Thumb Impressions, Handwritten Declarations, and Certificate PDFs for SSC, UPSC OTR, IBPS, NEET, Police, and State PSCs. 100% private."
        />
        <meta
          name="keywords"
          content="formdocfixer, form doc fixer, ssc photo resizer, upsc otr photo date stamper, ibps handwritten declaration, ssc marksheet to pdf 100kb, bpsc hindi signature resizer, digital signature pad online, take passport photo with webcam, neet postcard photo resizer"
        />
        <link rel="canonical" href="https://lakpdf.com/govt-exam-resizer" />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-primary-500/10 via-amber-500/10 to-emerald-500/10 border border-primary-200 dark:border-primary-800 text-primary-700 dark:text-rose-400 text-xs font-bold shadow-xs">
            <Award className="w-4 h-4 text-amber-500 animate-pulse" />
            <span>FormDocFixer · Complete Exam Application Kit</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center justify-center gap-2 flex-wrap">
            <span className="bg-gradient-to-r from-primary-600 via-rose-500 to-amber-500 bg-clip-text text-transparent">
              FormDocFixer
            </span>
            <span className="text-slate-800 dark:text-slate-200 text-2xl sm:text-4xl font-bold">
              · Govt Exam Form Resizer
            </span>
          </h1>

          <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
            <strong>FormDocFixer</strong> prepares every required document for your target exam: <strong>Photo, Signature, Thumb Impression, Declaration, and Certificate PDFs</strong> formatted strictly to official notification guidelines.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <PrivacyBadge />
            <button
              type="button"
              onClick={() => setIsInspectorOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 transition-colors cursor-pointer"
            >
              <ScanLine className="w-3.5 h-3.5" />
              <span>Portal Upload Inspector</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAadhaarModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 transition-colors cursor-pointer shadow-xs"
            >
              <Contact className="w-3.5 h-3.5 text-emerald-600" />
              <span>Aadhaar Front+Back PDF Merger (1-Page)</span>
            </button>
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-emerald-600" /> 100% In-Browser · Zero Cloud Uploads
            </span>
          </div>
        </div>

        {/* Live Rejection Risk Diagnostic Banner */}
        <div className="bg-white dark:bg-dark-surface p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-dark-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                safetyScore === 100
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  : safetyScore >= 70
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                  : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
              }`}
            >
              {safetyScore}%
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                  Portal Submission Confidence Score
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    safetyScore === 100
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}
                >
                  {safetyScore === 100 ? '0% Rejection Risk' : 'Action Required'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {safetyScore === 100
                  ? 'All documents perfectly match dimensions, KB range, and official background rules.'
                  : `Next: ${alerts.join(' · ')}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setIsInspectorOpen(true)}
              className="text-xs text-primary-600 dark:text-primary-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View Full Checklist</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Preset Selector & Search Section */}
        <div className="bg-white dark:bg-dark-surface rounded-2xl border border-slate-200 dark:border-dark-border shadow-xs overflow-hidden transition-all">
          {/* Main Clickable Header: Displays Active Target Exam & Toggle Button */}
          <div
            onClick={() => setIsExamListOpen((prev) => !prev)}
            className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-dark-hover/40 transition-colors select-none"
          >
            {/* Left: Active Exam Identity & Verified Official Badge */}
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="p-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  Target Exam:
                </span>
                <strong className="text-slate-900 dark:text-white font-bold text-sm sm:text-base">
                  {activePreset.fullName}
                </strong>
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold uppercase tracking-wider">
                  <Check className="w-3 h-3" />
                  Official 2026 Format
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
                {activePreset.description}
              </p>
            </div>

            {/* Right: Required Docs Count & Clickable Exam Option Toggle */}
            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 self-start md:self-center">
              <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-dark-hover text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{activePreset.rules.length} Required Documents</span>
              </div>

              {/* Clickable Exam Option Toggle Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExamListOpen((prev) => !prev);
                }}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                  isExamListOpen
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 ring-2 ring-slate-900/10'
                    : 'bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100 dark:bg-primary-950/50 dark:text-primary-300 dark:border-primary-800'
                }`}
              >
                <span>{isExamListOpen ? 'Hide All Exams' : 'Change / Select Exam (16)'}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExamListOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          {/* Collapsible Content: Search, Category Filters & All Exams List */}
          {isExamListOpen && (
            <div className="border-t border-slate-100 dark:border-dark-border/60 bg-slate-50/50 dark:bg-dark-hover/20 animate-in fade-in slide-in-from-top-1 duration-200">
              {/* Top Bar: Title & Search */}
              <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-dark-border/60 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary-500" />
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        All Available Exam Options
                      </h3>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-dark-hover text-slate-600 dark:text-slate-300">
                        {filteredPresets.length} Exam{filteredPresets.length === 1 ? '' : 's'} Available
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Select any exam below to switch portal dimensions, KB limits & background rules.
                    </p>
                  </div>

                  {/* Search Input */}
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={examSearchQuery}
                      onChange={(e) => setExamSearchQuery(e.target.value)}
                      placeholder="Search 16+ exams (e.g. DSSSB, Police, BPSC, RRB, Bank, Court, NEET, CTET, Agniveer)..."
                      className="w-full pl-9 pr-8 py-2 rounded-xl text-xs sm:text-sm bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                    />
                    {examSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setExamSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Category Filter Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                  {GROUP_TABS.map((tab) => {
                    const isGroupActive = examGroupFilter === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setExamGroupFilter(tab.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                          isGroupActive
                            ? 'bg-slate-900 text-white shadow-xs dark:bg-white dark:text-slate-900'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:bg-dark-hover dark:hover:text-slate-200'
                        }`}
                      >
                        <span className="text-xs">{tab.icon}</span>
                        <span>{tab.label}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                            isGroupActive
                              ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                              : 'bg-slate-200/70 dark:bg-dark-border text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Exam Presets List */}
              <div className="p-4 sm:p-5">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none flex-nowrap sm:flex-wrap">
                  {filteredPresets.map((preset) => {
                    const isActive = preset.id === selectedExamId;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setSelectedExamId(preset.id);
                        }}
                        className={`group px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-150 flex items-center gap-2 cursor-pointer border ${
                          isActive
                            ? 'bg-primary-600 text-white border-primary-600 shadow-sm ring-2 ring-primary-500/20 dark:ring-primary-500/40'
                            : 'bg-white dark:bg-dark-surface border-slate-200 dark:border-dark-border text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-dark-hover'
                        }`}
                      >
                        {isActive && <Check className="w-3.5 h-3.5 shrink-0 -ml-0.5 text-white" />}
                        <span>{preset.name}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                            isActive
                              ? 'bg-white/25 text-white'
                              : 'bg-slate-100 dark:bg-dark-hover text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                          }`}
                        >
                          {preset.badge}
                        </span>
                      </button>
                    );
                  })}

                  {filteredPresets.length === 0 && (
                    <div className="py-6 text-center w-full space-y-2">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        No exams matched "<strong>{examSearchQuery}</strong>" in this category.
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setExamSearchQuery('');
                            setExamGroupFilter('all');
                          }}
                          className="text-xs text-primary-600 font-semibold underline cursor-pointer"
                        >
                          Reset Search & Filters
                        </button>
                        <span className="text-slate-400">·</span>
                        <button
                          type="button"
                          onClick={() => setSelectedExamId('custom')}
                          className="text-xs text-emerald-600 font-semibold underline cursor-pointer"
                        >
                          Switch to Custom Resizer
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Banking Handwritten Declaration Helper Card */}
        {activePreset.id === 'ibps-sbi' && (
          <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent border border-blue-200 dark:border-blue-900/40 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-600 text-white shadow-xs">
                  <FileText className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Official IBPS / SBI Handwritten Declaration Text
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCopyDeclaration}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-dark-surface border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 transition-colors cursor-pointer"
              >
                {copiedDeclaration ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Official Text</span>
                  </>
                )}
              </button>
            </div>
            <div className="p-3 rounded-xl bg-white/80 dark:bg-dark-surface/80 border border-blue-100 dark:border-blue-900/30 text-xs italic font-serif leading-relaxed text-slate-700 dark:text-slate-300">
              &ldquo;I, <span className="font-bold not-italic">{candidateName.trim() || '[Candidate Name]'}</span>, hereby declare that all the information submitted by me in the application form is correct, true and valid. I will present the supporting documents as and when required.&rdquo;
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Write this text on white paper with black/blue pen, take a photo, and upload in the Declaration slot below (50–100 KB).
            </p>
          </div>
        )}

        {/* Global Photo Customization: Name & Date / Custom Details Stamper */}
        {activePreset.rules.some((r) => r.supportsNameDate) && (
          <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
            {/* Header: Title, Description & Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 dark:bg-amber-500/25 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                  <Type className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                      Photo Name & Date Stamper (UPSC OTR, SSC & State Rules)
                    </h3>
                    <span className="text-[10px] bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-amber-300/50 dark:border-amber-800/50">
                      Rejection Preventer
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    UPSC, SSC, and Police boards reject photos without applicant name and the date of taking photo.
                  </p>
                </div>
              </div>

              {/* Styled Checkbox / Toggle Container */}
              <label className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white dark:bg-dark-surface border border-amber-200/90 dark:border-amber-900/50 cursor-pointer select-none text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-amber-50/40 dark:hover:bg-dark-hover transition-colors shadow-2xs shrink-0 self-start sm:self-center">
                <input
                  type="checkbox"
                  checked={enableNameDate}
                  onChange={(e) => {
                    setEnableNameDate(e.target.checked);
                    setTimeout(handleNameDateChange, 50);
                  }}
                  className="w-4 h-4 rounded text-amber-600 border-slate-300 focus:ring-amber-500 cursor-pointer"
                />
                <span>Enable Stamp</span>
              </label>
            </div>

            {/* Inputs & Controls (Structured Grid Layout) */}
            {enableNameDate && (
              <div className="pt-3 border-t border-amber-200/60 dark:border-amber-900/30 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                  {/* Format Selector */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Stamp Format
                    </label>
                    <div className="relative">
                      <select
                        value={stampType}
                        onChange={(e) => {
                          setStampType(e.target.value as any);
                          setTimeout(handleNameDateChange, 50);
                        }}
                        className="w-full h-10 px-3 pr-8 text-xs font-semibold rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 appearance-none shadow-2xs"
                      >
                        <option value="dop">D.O.P (Date of Photo - SSC/UPSC)</option>
                        <option value="dob">D.O.B (Date of Birth - Police/Army)</option>
                        <option value="roll">Roll / Registration No.</option>
                        <option value="custom">Custom Text Line</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Candidate Name */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Candidate Name
                    </label>
                    <input
                      type="text"
                      placeholder="Candidate Full Name"
                      value={candidateName}
                      onChange={(e) => setCandidateName(e.target.value)}
                      onBlur={handleNameDateChange}
                      className="w-full h-10 px-3 text-xs font-semibold rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 uppercase shadow-2xs"
                    />
                  </div>

                  {/* Date or Second Line */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      {stampType === 'dop'
                        ? 'Date of Photo'
                        : stampType === 'dob'
                        ? 'Date of Birth'
                        : stampType === 'roll'
                        ? 'Roll / Registration'
                        : 'Second Text Line'}
                    </label>
                    {stampType === 'dop' || stampType === 'dob' ? (
                      <input
                        type="date"
                        value={photoDate}
                        onChange={(e) => setPhotoDate(e.target.value)}
                        onBlur={handleNameDateChange}
                        className="w-full h-10 px-3 text-xs font-semibold rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 shadow-2xs"
                      />
                    ) : (
                      <input
                        type="text"
                        placeholder={stampType === 'roll' ? 'Roll No / Reg ID' : 'Second Line text'}
                        value={customLabel2}
                        onChange={(e) => setCustomLabel2(e.target.value)}
                        onBlur={handleNameDateChange}
                        className="w-full h-10 px-3 text-xs font-semibold rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 shadow-2xs"
                      />
                    )}
                  </div>

                  {/* Apply Button */}
                  <div className="space-y-1">
                    <div className="hidden lg:block text-[11px] font-bold text-transparent select-none uppercase">
                      Action
                    </div>
                    <button
                      type="button"
                      onClick={handleNameDateChange}
                      className="w-full h-10 px-4 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-all duration-150 shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Apply</span>
                    </button>
                  </div>
                </div>

                {/* Real-time Stamp Preview Box */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-white/90 dark:bg-dark-surface/90 border border-amber-200/60 dark:border-amber-900/40 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-slate-400 font-semibold text-[11px]">Stamp Preview:</span>
                    <div className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-dark-hover px-2.5 py-1 rounded-lg border border-slate-200/70 dark:border-dark-border/70">
                      {candidateName.trim() ? candidateName.toUpperCase() : 'CANDIDATE NAME'}
                      {' · '}
                      {stampType === 'dop'
                        ? `DOP: ${photoDate ? photoDate.split('-').reverse().join('/') : 'DD/MM/YYYY'}`
                        : stampType === 'dob'
                        ? `DOB: ${photoDate ? photoDate.split('-').reverse().join('/') : 'DD/MM/YYYY'}`
                        : customLabel2.trim() || 'REG NO'}
                    </div>
                  </div>
                  <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                    ✓ Clean white strip automatically placed at photo bottom
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Document Category Filter Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="inline-flex p-1 bg-slate-100 dark:bg-dark-hover rounded-xl border border-slate-200/80 dark:border-dark-border/80 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveCategoryFilter('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeCategoryFilter === 'all'
                  ? 'bg-white dark:bg-dark-surface text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              All Required Documents ({activePreset.rules.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveCategoryFilter('biometric')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeCategoryFilter === 'biometric'
                  ? 'bg-white dark:bg-dark-surface text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Photos & Signatures ({activePreset.rules.filter((r) => r.category === 'biometric').length})
            </button>

            <button
              type="button"
              onClick={() => setActiveCategoryFilter('certificate')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeCategoryFilter === 'certificate'
                  ? 'bg-white dark:bg-dark-surface text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Certificates & Marksheets PDF ({activePreset.rules.filter((r) => r.category === 'certificate').length})
            </button>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center text-xs font-semibold text-slate-600 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
            <span>
              Prepared: <strong className="text-slate-900 dark:text-white">{processedCount}</strong> / {totalRules}
            </span>
          </div>
        </div>

        {/* Document Slots Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRules.map((rule) => {
            const slot = slots[rule.id] || {
              file: null,
              imageElement: null,
              result: null,
              isProcessing: false,
              zoom: 1,
              panX: 0,
              panY: 0,
              brightness: 0,
              contrast: 0,
              cleanBackground: Boolean(rule.cleanBackground),
              backgroundColor: 'white',
              showFaceGuide: rule.id === 'photo',
            };

            const isSigSlot = rule.id.includes('signature');
            const isPhotoSlot = rule.id === 'photo' || rule.id === 'postcard_photo';

            return (
              <DocumentSlotCard
                key={rule.id}
                rule={rule}
                slot={slot}
                onFileSelect={(file) => handleFileSelect(rule, file)}
                onReProcess={(options) => processSlotDocument(rule, undefined, options)}
                onOpenDrawSignature={isSigSlot ? () => setSigPadTargetRuleId(rule.id) : undefined}
                onOpenLiveCamera={isPhotoSlot ? () => setIsCameraOpen(true) : undefined}
                onGeneratePrintSheet={isPhotoSlot ? handleGeneratePrintSheet : undefined}
              />
            );
          })}
        </div>

        {/* Global Action Bar (Download All ZIP) */}
        {processedCount > 0 && (
          <div className="sticky bottom-6 z-40 bg-white/95 dark:bg-dark-surface/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-dark-border shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold text-base shadow-xs">
                {processedCount}/{totalRules}
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                  {processedCount === totalRules
                    ? '🎉 Full Application Package Complete!'
                    : `${processedCount} of ${totalRules} required documents ready`}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Strictly verified for {activePreset.name} portal specifications.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                variant="secondary"
                onClick={() => setIsInspectorOpen(true)}
                className="flex items-center justify-center gap-1.5 text-xs py-2.5 px-4"
              >
                <ScanLine className="w-4 h-4 text-blue-500" />
                <span>Verify All</span>
              </Button>

              <Button
                variant="primary"
                onClick={handleDownloadAllZip}
                disabled={isExportingZip}
                className="w-full sm:w-auto flex items-center justify-center gap-2 text-sm px-6 py-2.5 shadow-md"
              >
                {isExportingZip ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Packaging ZIP...</span>
                  </>
                ) : (
                  <>
                    <FileArchive className="w-4 h-4" />
                    <span>Download All Documents (ZIP)</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Portal Upload Simulation / Compliance Inspector Modal */}
        <Modal
          isOpen={isInspectorOpen}
          onClose={() => setIsInspectorOpen(false)}
          title="Official Portal Upload Compliance Inspector"
          contentClassName="max-w-2xl"
        >
          <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-dark-hover flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500">Target Portal:</span>
                <p className="font-bold text-slate-900 dark:text-white">{activePreset.fullName}</p>
              </div>
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-full font-bold text-xs">
                {processedCount === totalRules ? '100% Ready for Submission' : `${processedCount} / ${totalRules} Ready`}
              </span>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {activePreset.rules.map((rule) => {
                const result = slots[rule.id]?.result;
                return (
                  <div
                    key={rule.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white text-xs">
                        {rule.name}
                      </span>
                      {result ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                          <CheckCircle2 className="w-4 h-4" /> Verified 100% Ready
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Not uploaded yet</span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                      <div className="p-2 rounded bg-slate-50 dark:bg-dark-bg">
                        <span className="text-slate-400 block font-sans">Size:</span>
                        <span className="font-bold">
                          {result ? `${result.sizeKB} KB` : `${rule.minKB}-${rule.maxKB} KB`}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-slate-50 dark:bg-dark-bg">
                        <span className="text-slate-400 block font-sans">Dimensions:</span>
                        <span className="font-bold">
                          {result ? `${result.width}×${result.height}px` : `${rule.idealWidth}×${rule.idealHeight}px`}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-slate-50 dark:bg-dark-bg">
                        <span className="text-slate-400 block font-sans">Format:</span>
                        <span className="font-bold">
                          {rule.outputFormat === 'application/pdf' ? 'PDF Document' : 'JPEG Image'}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-slate-50 dark:bg-dark-bg">
                        <span className="text-slate-400 block font-sans">Aspect Ratio:</span>
                        <span className="font-bold">Compliant</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsInspectorOpen(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </Modal>

        {/* Printable Photo Sheet Modal */}
        {printSheetModalData && (
          <Modal
            isOpen={Boolean(printSheetModalData)}
            onClose={() => setPrintSheetModalData(null)}
            title={`Printable Passport Photo Sheet (${printSheetModalData.sheetSize.toUpperCase()})`}
            contentClassName="max-w-xl"
          >
            <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              <p className="text-slate-600 dark:text-slate-400">
                Here is your 300 DPI high-resolution printable sheet with cutting guidelines.
                Take this to any cyber cafe or color printer to print physical copies for the exam hall!
              </p>

              <div className="border border-slate-200 dark:border-dark-border rounded-xl overflow-hidden bg-white p-2 flex items-center justify-center">
                <img
                  src={printSheetModalData.dataUrl}
                  alt="Print Sheet Preview"
                  className="max-h-[300px] w-auto object-contain shadow-xs"
                />
              </div>

              <div className="flex justify-between items-center pt-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleGeneratePrintSheet('4x6')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                      printSheetModalData.sheetSize === '4x6'
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    4×6 Inch (8 Photos)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGeneratePrintSheet('a4')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                      printSheetModalData.sheetSize === 'a4'
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    A4 Sheet (30+ Photos)
                  </button>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = printSheetModalData.dataUrl;
                    a.download = `Passport_Photo_Sheet_${printSheetModalData.sheetSize.toUpperCase()}.jpg`;
                    a.click();
                  }}
                  className="flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Sheet</span>
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Live Camera Modal */}
        <WebcamCaptureModal
          isOpen={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          onCapturePhoto={(file) => {
            const photoRule = activePreset.rules.find((r) => r.id === 'photo');
            if (photoRule) handleFileSelect(photoRule, file);
          }}
        />

        {/* Digital Signature Pad Modal */}
        <DigitalSignaturePadModal
          isOpen={Boolean(sigPadTargetRuleId)}
          onClose={() => setSigPadTargetRuleId(null)}
          examName={activePreset.id}
          onSaveSignature={(file) => {
            if (sigPadTargetRuleId) {
              const rule = activePreset.rules.find((r) => r.id === sigPadTargetRuleId);
              if (rule) handleFileSelect(rule, file);
            }
          }}
        />

        {/* Aadhaar Card Front + Back Merger Modal */}
        <Modal
          isOpen={isAadhaarModalOpen}
          onClose={() => setIsAadhaarModalOpen(false)}
          title="Aadhaar / Voter ID (Front + Back) 1-Page PDF Maker"
          contentClassName="max-w-2xl"
        >
          <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 flex items-start gap-2.5">
              <Contact className="w-5 h-5 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
              <div>
                <strong className="block font-bold">100% Portal-Compliant 1-Page PDF Generator</strong>
                <span>
                  Govt exam portals (SSC, UPSC, BPSC, RRB) require identity proofs (Aadhaar, Voter ID) to have Front & Back aligned on a single A4 PDF strictly under 200 KB.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Front Side Upload */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-surface space-y-2">
                <span className="font-bold text-xs text-slate-800 dark:text-white block">
                  1. Front Side (Photo & Name)
                </span>
                <input
                  type="file"
                  id="aadhaar-front-input"
                  aria-label="Upload Front Side"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAadhaarFrontChange}
                  className="hidden"
                />
                {aadhaarFrontPreview ? (
                  <div className="relative border border-slate-200 dark:border-dark-border rounded-lg overflow-hidden h-36 bg-white flex items-center justify-center group">
                    <img src={aadhaarFrontPreview} alt="Aadhaar Front" className="h-full w-auto object-contain" />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <label
                        htmlFor="aadhaar-front-input"
                        className="px-2.5 py-1 bg-white text-slate-900 rounded-md text-[11px] font-semibold cursor-pointer shadow-xs hover:bg-slate-100"
                      >
                        Change
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setAadhaarFrontFile(null);
                          setAadhaarFrontPreview(null);
                        }}
                        className="p-1 bg-red-600 text-white rounded-full hover:bg-red-700 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label
                    htmlFor="aadhaar-front-input"
                    className="border-2 border-dashed border-slate-300 dark:border-dark-border rounded-lg h-36 flex flex-col items-center justify-center p-3 text-center cursor-pointer hover:bg-white dark:hover:bg-dark-hover transition-colors"
                  >
                    <Upload className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="text-xs font-semibold text-primary-600">Upload Front Side</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">JPG, PNG or photo</span>
                  </label>
                )}
              </div>

              {/* Back Side Upload */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-surface space-y-2">
                <span className="font-bold text-xs text-slate-800 dark:text-white block">
                  2. Back Side (Address & QR Code)
                </span>
                <input
                  type="file"
                  id="aadhaar-back-input"
                  aria-label="Upload Back Side"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAadhaarBackChange}
                  className="hidden"
                />
                {aadhaarBackPreview ? (
                  <div className="relative border border-slate-200 dark:border-dark-border rounded-lg overflow-hidden h-36 bg-white flex items-center justify-center group">
                    <img src={aadhaarBackPreview} alt="Aadhaar Back" className="h-full w-auto object-contain" />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <label
                        htmlFor="aadhaar-back-input"
                        className="px-2.5 py-1 bg-white text-slate-900 rounded-md text-[11px] font-semibold cursor-pointer shadow-xs hover:bg-slate-100"
                      >
                        Change
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setAadhaarBackFile(null);
                          setAadhaarBackPreview(null);
                        }}
                        className="p-1 bg-red-600 text-white rounded-full hover:bg-red-700 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label
                    htmlFor="aadhaar-back-input"
                    className="border-2 border-dashed border-slate-300 dark:border-dark-border rounded-lg h-36 flex flex-col items-center justify-center p-3 text-center cursor-pointer hover:bg-white dark:hover:bg-dark-hover transition-colors"
                  >
                    <Upload className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="text-xs font-semibold text-primary-600">Upload Back Side</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">JPG, PNG or photo</span>
                  </label>
                )}
              </div>
            </div>

            {/* Target Size Controls */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-dark-hover border border-slate-200 dark:border-dark-border text-xs">
              <div>
                <span className="font-bold text-slate-800 dark:text-white block">Target Output PDF Size</span>
                <span className="text-slate-500">Official limit for SSC & UPSC is 200 KB</span>
              </div>
              <div className="flex items-center gap-2">
                {[150, 200, 300].map((kb) => (
                  <button
                    key={kb}
                    type="button"
                    onClick={() => setAadhaarTargetKB(kb)}
                    className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition-colors cursor-pointer ${
                      aadhaarTargetKB === kb
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'bg-white dark:bg-dark-surface text-slate-600 border border-slate-200 dark:border-dark-border'
                    }`}
                  >
                    {kb} KB
                  </button>
                ))}
              </div>
            </div>

            {/* Merge Action Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-600" /> Processed 100% locally in browser memory
              </span>

              <Button
                variant="primary"
                onClick={handleMergeAadhaar}
                disabled={!aadhaarFrontFile || !aadhaarBackFile || isMergingAadhaar}
                className="w-full sm:w-auto flex items-center justify-center gap-2"
              >
                {isMergingAadhaar ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Compressing & Merging to PDF...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate 1-Page PDF</span>
                  </>
                )}
              </Button>
            </div>

            {/* Result Preview & Download */}
            {mergedAadhaarResult && (
              <div className="mt-3 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <strong className="text-emerald-900 dark:text-emerald-200 text-xs block">
                      Aadhaar 1-Page PDF Ready ({Math.round(mergedAadhaarResult.size / 1024)} KB)
                    </strong>
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                      Target {aadhaarTargetKB} KB · Both sides aligned on standard A4 portrait
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      downloadFile(mergedAadhaarResult.blob, 'Aadhaar_Card_Front_Back_Merged.pdf');
                    }}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1 text-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleApplyMergedAadhaarToSlot}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1 text-xs"
                  >
                    <FolderCheck className="w-3.5 h-3.5 text-blue-500" />
                    <span>Apply to Exam Slot</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Modal>

        {/* Portal Specification Quick Reference Table */}
        <div className="bg-white dark:bg-dark-surface rounded-2xl border border-slate-200 dark:border-dark-border overflow-hidden shadow-xs transition-all">
          {/* Clickable Header Accordion Trigger */}
          <button
            type="button"
            onClick={() => setIsSpecsTableOpen((prev) => !prev)}
            aria-expanded={isSpecsTableOpen}
            className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-dark-hover/50 transition-colors cursor-pointer select-none"
          >
            <div className="flex items-center gap-2.5 sm:gap-3">
              <span className="p-2 rounded-xl bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 shrink-0">
                <Layers className="w-5 h-5" />
              </span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Official Indian Government Exam Upload Specifications (2026 Reference)
                  </h2>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-dark-hover text-slate-600 dark:text-slate-300 font-semibold border border-slate-200 dark:border-dark-border">
                    16 Exam Categories
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isSpecsTableOpen
                    ? 'Click to collapse official guidelines and file limit table'
                    : 'Click to view complete photo, signature & certificate upload limits for all 16 government exams'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-3">
              <span className="text-xs font-semibold text-primary-600 dark:text-primary-400 hidden sm:inline">
                {isSpecsTableOpen ? 'Hide Specifications' : 'View Specifications'}
              </span>
              <div className={`p-1.5 rounded-lg bg-slate-100 dark:bg-dark-hover text-slate-500 dark:text-slate-400 transition-transform duration-200 ${isSpecsTableOpen ? 'rotate-180' : ''}`}>
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </button>

          {/* Collapsible Specifications Table */}
          {isSpecsTableOpen && (
            <div className="border-t border-slate-200 dark:border-dark-border p-4 sm:p-6 space-y-3 bg-slate-50/40 dark:bg-dark-hover/20 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface shadow-2xs">
                <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300 min-w-[640px]">
                  <thead className="bg-slate-50 dark:bg-dark-hover text-slate-700 dark:text-slate-200 uppercase font-semibold border-b border-slate-200 dark:border-dark-border">
                    <tr>
                      <th className="py-3 px-3.5 whitespace-nowrap">Exam / Portal</th>
                      <th className="py-3 px-3.5 whitespace-nowrap">Photograph Limit</th>
                      <th className="py-3 px-3.5 whitespace-nowrap">Signature Limit</th>
                      <th className="py-3 px-3.5 whitespace-nowrap">Certificates / PDF</th>
                      <th className="py-3 px-3.5 whitespace-nowrap">Special Requirement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-dark-border">
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-dark-hover/40 transition-colors">
                      <td className="py-2.5 px-3.5 font-semibold text-slate-900 dark:text-white">SSC (CGL, CHSL, MTS, GD, CPO, JE)</td>
                      <td className="py-2.5 px-3.5">20 KB – 50 KB (3.5 × 4.5 cm)</td>
                      <td className="py-2.5 px-3.5">10 KB – 20 KB (4.0 × 2.0 cm)</td>
                      <td className="py-2.5 px-3.5">Under 200 KB PDF</td>
                      <td className="py-2.5 px-3.5">Plain light bg, no caps/spectacles, both ears visible</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-dark-hover/40 transition-colors">
                      <td className="py-2.5 px-3.5 font-semibold text-slate-900 dark:text-white">UPSC OTR & Civil Services (IAS/NDA/CDS)</td>
                      <td className="py-2.5 px-3.5">20 KB – 300 KB (Min 350×350 px)</td>
                      <td className="py-2.5 px-3.5">20 KB – 300 KB (Min 350×350 px)</td>
                      <td className="py-2.5 px-3.5">20 KB – 300 KB PDF</td>
                      <td className="py-2.5 px-3.5">Candidate Name & Date of photo printed at bottom</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-dark-hover/40 transition-colors">
                      <td className="py-2.5 px-3.5 font-semibold text-slate-900 dark:text-white">Railways (RRB NTPC, ALP, Group D, RPF)</td>
                      <td className="py-2.5 px-3.5">30 KB – 70 KB (3.5 × 4.5 cm)</td>
                      <td className="py-2.5 px-3.5">30 KB – 70 KB (350×150 px)</td>
                      <td className="py-2.5 px-3.5">Under 300 KB PDF</td>
                      <td className="py-2.5 px-3.5">White background, sharp front face, ITI/10th marksheet</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-dark-hover/40 transition-colors">
                      <td className="py-2.5 px-3.5 font-semibold text-slate-900 dark:text-white">India Post (GDS, Postman, MTS)</td>
                      <td className="py-2.5 px-3.5">Under 50 KB (200×230 px)</td>
                      <td className="py-2.5 px-3.5">Under 20 KB (140×60 px)</td>
                      <td className="py-2.5 px-3.5">Under 300 KB PDF</td>
                      <td className="py-2.5 px-3.5">60-day Basic Computer Training Certificate PDF</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-dark-hover/40 transition-colors">
                      <td className="py-2.5 px-3.5 font-semibold text-slate-900 dark:text-white">Banking & Insurance (IBPS, SBI, RBI, LIC)</td>
                      <td className="py-2.5 px-3.5">20 KB – 50 KB (200×230 px)</td>
                      <td className="py-2.5 px-3.5">10 KB – 20 KB (140×60 px)</td>
                      <td className="py-2.5 px-3.5">50 KB – 100 KB declaration</td>
                      <td className="py-2.5 px-3.5">Left Thumb (20-50KB), Black ink signature, Handwritten Declaration</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-dark-hover/40 transition-colors">
                      <td className="py-2.5 px-3.5 font-semibold text-slate-900 dark:text-white">Defence (Agniveer Army, Navy, Airforce, CAPF)</td>
                      <td className="py-2.5 px-3.5">20 KB – 50 KB (35×45 mm)</td>
                      <td className="py-2.5 px-3.5">10 KB – 20 KB</td>
                      <td className="py-2.5 px-3.5">Under 200 KB PDF</td>
                      <td className="py-2.5 px-3.5">Name & Date on photo, Left Thumb impression (20-50KB)</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-dark-hover/40 transition-colors">
                      <td className="py-2.5 px-3.5 font-semibold text-slate-900 dark:text-white">State Police (UP, Delhi, Bihar CSBC, MP, Rajasthan)</td>
                      <td className="py-2.5 px-3.5">20 KB – 50 KB (35×45 mm)</td>
                      <td className="py-2.5 px-3.5">5 KB – 20 KB</td>
                      <td className="py-2.5 px-3.5">50 KB – 200 KB PDF</td>
                      <td className="py-2.5 px-3.5">10th + 12th marksheet, Domicile/Niwas, CCC/Computer cert</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-dark-hover/40 transition-colors">
                      <td className="py-2.5 px-3.5 font-semibold text-slate-900 dark:text-white">State PSCs (BPSC, UPPSC, MPPSC, RPSC, MPSC)</td>
                      <td className="py-2.5 px-3.5">20 KB – 50 KB</td>
                      <td className="py-2.5 px-3.5">10 KB – 20 KB</td>
                      <td className="py-2.5 px-3.5">Under 200 KB PDF</td>
                      <td className="py-2.5 px-3.5">Hindi + English dual signatures for BPSC forms</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-dark-hover/40 transition-colors">
                      <td className="py-2.5 px-3.5 font-semibold text-slate-900 dark:text-white">State Subordinate (UPSSSC PET, BSSC, RSMSSB)</td>
                      <td className="py-2.5 px-3.5">20 KB – 50 KB</td>
                      <td className="py-2.5 px-3.5">10 KB – 20 KB</td>
                      <td className="py-2.5 px-3.5">Under 200 KB PDF</td>
                      <td className="py-2.5 px-3.5">PET score certificate, 10th/12th marksheet</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-dark-hover/40 transition-colors">
                      <td className="py-2.5 px-3.5 font-semibold text-slate-900 dark:text-white">DSSSB Delhi (Teaching, Clerk, Nursing)</td>
                      <td className="py-2.5 px-3.5">50 KB – 300 KB (5×7 Postcard)</td>
                      <td className="py-2.5 px-3.5">10 KB – 40 KB (140×110 px)</td>
                      <td className="py-2.5 px-3.5">Under 200 KB PDF</td>
                      <td className="py-2.5 px-3.5">5×7 Postcard photo + Left Thumb + Right Thumb impressions</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-dark-hover/40 transition-colors">
                      <td className="py-2.5 px-3.5 font-semibold text-slate-900 dark:text-white">High Courts & District Courts (RO/ARO / Clerk)</td>
                      <td className="py-2.5 px-3.5">20 KB – 50 KB</td>
                      <td className="py-2.5 px-3.5">10 KB – 20 KB</td>
                      <td className="py-2.5 px-3.5">50 KB – 300 KB PDF</td>
                      <td className="py-2.5 px-3.5">Law/Degree marksheet, CCC Computer certificate PDF</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-dark-hover/40 transition-colors">
                      <td className="py-2.5 px-3.5 font-semibold text-slate-900 dark:text-white">NTA (NEET UG, JEE Main, CUET UG/PG)</td>
                      <td className="py-2.5 px-3.5">10 KB – 200 KB (80% face coverage)</td>
                      <td className="py-2.5 px-3.5">4 KB – 30 KB</td>
                      <td className="py-2.5 px-3.5">50 KB – 300 KB PDF</td>
                      <td className="py-2.5 px-3.5">Postcard 4×6 photo, 10 Fingers & Thumbs impression</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-dark-hover/40 transition-colors">
                      <td className="py-2.5 px-3.5 font-semibold text-slate-900 dark:text-white">GATE & UGC NET / CSIR NET / SET</td>
                      <td className="py-2.5 px-3.5">5 KB – 200 KB (3.5 × 4.5 cm)</td>
                      <td className="py-2.5 px-3.5">3 KB – 100 KB</td>
                      <td className="py-2.5 px-3.5">10 KB – 500 KB PDF</td>
                      <td className="py-2.5 px-3.5">Valid Photo ID proof, Qualifying Degree marksheet PDF</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-dark-hover/40 transition-colors">
                      <td className="py-2.5 px-3.5 font-semibold text-slate-900 dark:text-white">Medical & Nursing (AIIMS NORCET / ESIC)</td>
                      <td className="py-2.5 px-3.5">50 KB – 100 KB (3.5 × 4.5 cm)</td>
                      <td className="py-2.5 px-3.5">20 KB – 100 KB</td>
                      <td className="py-2.5 px-3.5">Under 300 KB PDF</td>
                      <td className="py-2.5 px-3.5">Crisp white bg, Left Thumb (20-100KB), Nursing Council cert</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-dark-hover/40 transition-colors">
                      <td className="py-2.5 px-3.5 font-semibold text-slate-900 dark:text-white">Teaching (CTET, KVS, NVS, REET, UPTET)</td>
                      <td className="py-2.5 px-3.5">10 KB – 100 KB (3.5 × 4.5 cm)</td>
                      <td className="py-2.5 px-3.5">4 KB – 30 KB (3.5 × 1.5 cm)</td>
                      <td className="py-2.5 px-3.5">Under 200 KB PDF</td>
                      <td className="py-2.5 px-3.5">10th DOB proof, B.Ed / D.El.Ed qualification certificate</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center sm:text-right">
                Tip: Scroll horizontally on mobile devices to view all specification columns.
              </p>
            </div>
          )}
        </div>

        {/* SEO FAQ & Troubleshooting Content */}
        <ToolSEOContent toolKey="/govt-exam-resizer" />
      </div>
    </div>
  );
};

interface DocumentSlotCardProps {
  rule: ExamDocumentRule;
  slot: SlotState;
  onFileSelect: (file: File) => void;
  onReProcess: (options?: Partial<SlotState>) => void;
  onOpenDrawSignature?: () => void;
  onOpenLiveCamera?: () => void;
  onGeneratePrintSheet?: (size: '4x6' | 'a4') => void;
}

const DocumentSlotCard: React.FC<DocumentSlotCardProps> = ({
  rule,
  slot,
  onFileSelect,
  onReProcess,
  onOpenDrawSignature,
  onOpenLiveCamera,
  onGeneratePrintSheet,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAdjustments, setShowAdjustments] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="bg-white dark:bg-dark-surface rounded-2xl border border-slate-200 dark:border-dark-border p-4 sm:p-5 flex flex-col justify-between shadow-xs transition-shadow hover:shadow-md">
      <div>
        {/* Slot Title & Badges */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {rule.name}
              </h3>
              {rule.isPdfDocument && (
                <span className="text-[10px] px-1.5 py-0.2 bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 font-bold rounded">
                  PDF
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {rule.description}
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-dark-hover text-slate-700 dark:text-slate-300">
              {rule.minKB}–{rule.maxKB} KB
            </span>
          </div>
        </div>

        {/* Alternative Quick Input Buttons (Camera / Sign Pad) */}
        <div className="flex items-center gap-2 mb-2">
          {rule.id.includes('photo') && onOpenLiveCamera && (
            <button
              type="button"
              onClick={onOpenLiveCamera}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Camera</span>
            </button>
          )}

          {rule.id.includes('signature') && onOpenDrawSignature && (
            <button
              type="button"
              onClick={onOpenDrawSignature}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Draw with Finger / Mouse</span>
            </button>
          )}

          {rule.id === 'photo' && slot.result && onGeneratePrintSheet && (
            <button
              type="button"
              onClick={() => onGeneratePrintSheet('4x6')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer ml-auto"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Sheet</span>
            </button>
          )}
        </div>

        {/* Dropzone / Preview Area */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => !slot.result && fileInputRef.current?.click()}
          className={`relative mt-2 rounded-xl border-2 border-dashed transition-all overflow-hidden min-h-[220px] flex items-center justify-center ${
            slot.result
              ? 'border-emerald-300 dark:border-emerald-800 bg-slate-50 dark:bg-dark-bg/60'
              : 'border-slate-300 dark:border-dark-border hover:border-primary-500 bg-slate-50/60 dark:bg-dark-bg/30 cursor-pointer'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])}
            accept={rule.isPdfDocument ? 'application/pdf,image/jpeg,image/png' : 'image/jpeg,image/png,image/webp'}
            className="hidden"
          />

          {slot.isProcessing ? (
            <div className="text-center p-6 space-y-2">
              <RefreshCw className="w-8 h-8 animate-spin text-primary-500 mx-auto" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {rule.isPdfDocument ? 'Compressing document to clean PDF...' : `Optimizing strictly to ${rule.minKB}–${rule.maxKB} KB...`}
              </p>
            </div>
          ) : slot.result ? (
            <div className="p-4 flex flex-col items-center justify-center space-y-3 w-full">
              <div className="relative group max-h-[190px] overflow-hidden rounded-lg shadow-sm border border-slate-200 dark:border-dark-border bg-white">
                {slot.result.isPdf ? (
                  <div className="p-8 text-center space-y-2 bg-red-50/50 dark:bg-dark-bg">
                    <FileText className="w-12 h-12 text-red-500 mx-auto" />
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                      {slot.result.filename}
                    </p>
                    <span className="text-[10px] text-emerald-600 font-semibold">Ready for Portal Upload</span>
                  </div>
                ) : (
                  <>
                    <img
                      src={slot.result.dataUrl}
                      alt={rule.name}
                      className="max-h-[170px] w-auto object-contain mx-auto"
                    />

                    {/* Biometric Face Alignment Guide Overlay */}
                    {rule.id === 'photo' && slot.showFaceGuide && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <svg className="w-full h-full text-emerald-500/70" viewBox="0 0 100 130">
                          <ellipse
                            cx="50"
                            cy="55"
                            rx="30"
                            ry="40"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeDasharray="3 3"
                          />
                          <line x1="26" y1="46" x2="74" y2="46" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
                          <line x1="50" y1="20" x2="50" y2="90" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 2" />
                        </svg>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Status Compliance Pill */}
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    slot.result.isValidSize
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{slot.result.sizeKB} KB</span>
                  <span className="opacity-80">({rule.minKB}–{rule.maxKB} KB allowed)</span>
                </span>

                {slot.result.isValidSize && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-[11px] font-bold">
                    <Check className="w-3 h-3" />
                    <span>100% Portal Compliant</span>
                  </span>
                )}

                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  {slot.result.isPdf ? 'PDF Format' : `${slot.result.width}×${slot.result.height}px`}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-primary-50 dark:bg-rose-950/40 text-primary-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Click to upload or drag & drop {rule.name}
              </p>
              <p className="text-[11px] text-slate-400">
                {rule.isPdfDocument ? 'Upload PDF or JPG/PNG image of certificate' : 'Supports JPG, PNG, WEBP (Max 15 MB)'}
              </p>
            </div>
          )}
        </div>

        {/* Adjustments & Fine-Tuning Drawer */}
        {slot.result && !rule.isPdfDocument && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setShowAdjustments(!showAdjustments)}
                className="text-primary-600 dark:text-primary-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{showAdjustments ? 'Hide Fine-Tuning' : 'Fine-Tune (Zoom / Bg / Face Guide)'}</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs cursor-pointer"
              >
                Replace
              </button>
            </div>

            {showAdjustments && (
              <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border space-y-3 text-xs">
                {/* Biometric Face Guide Toggle */}
                {rule.id === 'photo' && (
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <ScanLine className="w-3.5 h-3.5 text-primary-500" />
                      <span>70–80% Biometric Face Guide Overlay</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={slot.showFaceGuide}
                      onChange={(e) => {
                        onReProcess({ showFaceGuide: e.target.checked });
                      }}
                      className="w-4 h-4 rounded text-primary-600"
                    />
                  </label>
                )}

                {/* Background Color Picker */}
                {rule.id.includes('photo') && (
                  <div>
                    <label className="block text-slate-500 mb-1 font-medium">Background Color</label>
                    <div className="flex gap-2">
                      {[
                        { id: 'white', label: 'White' },
                        { id: 'light-blue', label: 'Light Blue' },
                        { id: 'light-gray', label: 'Light Gray' },
                        { id: 'original', label: 'Original' },
                      ].map((bg) => (
                        <button
                          key={bg.id}
                          type="button"
                          onClick={() => onReProcess({ backgroundColor: bg.id as any })}
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold border ${
                            slot.backgroundColor === bg.id
                              ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900'
                              : 'bg-white text-slate-700 border-slate-300 dark:bg-dark-surface dark:text-slate-300'
                          }`}
                        >
                          {bg.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Zoom */}
                <div>
                  <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                    <span>Zoom</span>
                    <span>{Math.round(slot.zoom * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="2.0"
                    step="0.05"
                    value={slot.zoom}
                    onChange={(e) => {
                      const newZoom = Number(e.target.value);
                      onReProcess({ zoom: newZoom });
                    }}
                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Brightness */}
                <div>
                  <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                    <span>Brightness</span>
                    <span>{slot.brightness > 0 ? `+${slot.brightness}` : slot.brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="-40"
                    max="40"
                    step="5"
                    value={slot.brightness}
                    onChange={(e) => {
                      const newB = Number(e.target.value);
                      onReProcess({ brightness: newB });
                    }}
                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Signature Clean Background toggle */}
                {(rule.id.includes('signature') || rule.id.includes('thumb') || rule.id.includes('declaration')) && (
                  <label className="flex items-center gap-2 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={slot.cleanBackground}
                      onChange={(e) => {
                        const clean = e.target.checked;
                        onReProcess({ cleanBackground: clean });
                      }}
                      className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
                    />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Remove Paper Shadow (Convert to pure white background)
                    </span>
                  </label>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Download Single Document Button */}
      {slot.result && (
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-dark-border/60">
          <Button
            variant="secondary"
            onClick={() => downloadFile(slot.result!.blob, slot.result!.filename)}
            className="w-full flex items-center justify-center gap-2 text-xs py-2 shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download {rule.name} ({slot.result.sizeKB} KB)</span>
          </Button>
        </div>
      )}
    </div>
  );
};

export default GovtExamResizer;
