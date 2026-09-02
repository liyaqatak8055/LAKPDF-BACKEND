import React, { useState } from "react";
import { Helmet } from 'react-helmet-async';
import { ToolSEOContent } from '../components/ToolSEOContent';
import { FileUploader } from "../components/FileUploader";
import { Button } from "../components/Button";
import { detectDuplicatePages, formatBytes, deletePdfPages, downloadPdf } from "../services/pdfService";
import { FileText, Search, AlertTriangle, CheckCircle, Trash2, SlidersHorizontal, Gauge, Download, Info, Sparkles, RefreshCw, ArrowRight, X, ShieldCheck } from "lucide-react";
import { NextStepPanel, RelatedActions, ToolStartPanel } from "../components/ToolProductPanels";

interface DuplicateGroup {
    groupId: string;
    pages: number[];
    similarity: number;
    confidence: number;
    pageType: 'text' | 'scanned' | 'mixed';
    reasoning: string;
}

interface AnalysisResult {
    duplicates: DuplicateGroup[];
    summary: {
        totalPages: number;
        uniquePages: number;
        duplicatePages: number;
        totalDuplicates: number;
        analyzedPages: number;
        processingTime: number;
    };
    pageThumbnails: string[];
}

const DetectDuplicatePages: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [removing, setRemoving] = useState(false);
    const [selectedDuplicates, setSelectedDuplicates] = useState<Set<string>>(new Set());
    const [similarityThreshold, setSimilarityThreshold] = useState(80);
    const [maxPagesToAnalyze, setMaxPagesToAnalyze] = useState(150);
    const [progress, setProgress] = useState(0);
    const [progressStep, setProgressStep] = useState("");
    const [readyPdf, setReadyPdf] = useState<{ data: Uint8Array; name: string } | null>(null);

    const runAnalysis = async (targetFile: File, threshold: number = similarityThreshold) => {
        setLoading(true);
        setProgress(0);
        setProgressStep("Reading PDF pages...");
        setReadyPdf(null);
        try {
            const result = await detectDuplicatePages(targetFile, {
                similarityThreshold: threshold,
                maxPagesToAnalyze,
                onProgress: (nextProgress, step) => {
                    setProgress(nextProgress);
                    setProgressStep(step);
                }
            });
            setAnalysis(result);
            if (result.duplicates.length > 0) {
                setSelectedDuplicates(new Set(result.duplicates.map(g => g.groupId)));
            } else {
                setSelectedDuplicates(new Set());
            }
        } catch (e) {
            console.error(e);
            alert("Failed to analyze PDF: " + (e instanceof Error ? e.message : "Unknown error"));
        } finally {
            setLoading(false);
            setTimeout(() => {
                setProgress(0);
                setProgressStep("");
            }, 800);
        }
    };

    const handleFileSelected = (selectedFiles: File[]) => {
        if (!selectedFiles || selectedFiles.length === 0) return;
        const uploadedFile = selectedFiles[0];
        setFile(uploadedFile);
        setReadyPdf(null);
        runAnalysis(uploadedFile, similarityThreshold);
    };

    const toggleDuplicateSelection = (duplicateKey: string) => {
        const newSelection = new Set(selectedDuplicates);
        if (newSelection.has(duplicateKey)) {
            newSelection.delete(duplicateKey);
        } else {
            newSelection.add(duplicateKey);
        }
        setSelectedDuplicates(newSelection);
    };

    const selectAllDuplicateGroups = () => {
        if (!analysis) return;
        setSelectedDuplicates(new Set(analysis.duplicates.map(group => group.groupId)));
    };

    const clearDuplicateSelection = () => {
        setSelectedDuplicates(new Set());
    };

    const handleRemoveDuplicates = async () => {
        if (!file || !analysis) return;

        // If no duplicate groups selected or no duplicates exist, download the original file directly
        if (selectedDuplicates.size === 0 || analysis.duplicates.length === 0) {
            const fileBytes = new Uint8Array(await file.arrayBuffer());
            const outputName = file.name;
            setReadyPdf({ data: fileBytes, name: outputName });
            downloadPdf(fileBytes, outputName, { autoDownload: true });
            return;
        }

        setRemoving(true);
        try {
            const pagesToRemove = new Set<number>();
            selectedDuplicates.forEach(groupId => {
                const group = analysis.duplicates.find(g => g.groupId === groupId);
                if (group && group.pages.length > 1) {
                    group.pages.slice(1).forEach(pageNum => pagesToRemove.add(pageNum));
                }
            });

            if (pagesToRemove.size === 0) {
                const fileBytes = new Uint8Array(await file.arrayBuffer());
                downloadPdf(fileBytes, file.name, { autoDownload: true });
                return;
            }

            const pagesToRemoveStr = Array.from(pagesToRemove).sort((a, b) => b - a).join(',');
            const cleanedPdf = await deletePdfPages(file, pagesToRemoveStr);

            const outputName = `cleaned_${file.name}`;
            setReadyPdf({ data: cleanedPdf, name: outputName });
            downloadPdf(cleanedPdf, outputName, { autoDownload: true });
        } catch (e) {
            console.error(e);
            alert("Failed to remove duplicates: " + (e instanceof Error ? e.message : "Unknown error"));
        } finally {
            setRemoving(false);
        }
    };

    const handleDownloadOriginal = async () => {
        if (!file) return;
        const fileBytes = new Uint8Array(await file.arrayBuffer());
        downloadPdf(fileBytes, file.name, { autoDownload: true });
    };

    const handleDownloadReady = () => {
        if (!readyPdf) return;
        downloadPdf(readyPdf.data, readyPdf.name, { autoDownload: true });
    };

    const countSelectedDuplicatePages = () => {
        if (!analysis) return 0;
        let count = 0;
        selectedDuplicates.forEach(groupId => {
            const group = analysis.duplicates.find(g => g.groupId === groupId);
            if (group && group.pages.length > 1) {
                count += group.pages.length - 1;
            }
        });
        return count;
    };

    const totalSelectedDuplicates = countSelectedDuplicatePages();

    return (
        <>
          <Helmet>
            <title>Detect Duplicate PDF Pages Online Free - LAK PDF</title>
            <meta name="description" content="Find and delete duplicate pages in PDF documents online for free with AI-powered visual & text duplicate detection." />
            <link rel="canonical" href="https://lakpdf.com/detect-duplicates" />
            <meta property="og:title" content="Detect Duplicate PDF Pages Online Free - LAK PDF" />
            <meta property="og:description" content="Find and delete duplicate pages in PDF documents online for free." />
            <meta property="og:url" content="https://lakpdf.com/detect-duplicates" />
            <meta property="og:type" content="website" />
            <meta property="og:image" content="https://lakpdf.com/og-image.png" />
          </Helmet>

          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
            <div className="text-center mb-8">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
                Detect Duplicate Pages
              </h1>
              <p className="text-base sm:text-lg text-slate-500 max-w-xl mx-auto">
                Scan multi-page documents to automatically detect, compare, and remove repeated or redundant PDF pages.
              </p>
            </div>

            {!file ? (
                <div className="max-w-3xl mx-auto">
                  <FileUploader
                      accept="application/pdf"
                      onFilesSelected={handleFileSelected}
                      title="Select Multi-Page PDF"
                      description="Upload a document (2+ pages) to scan for duplicate pages"
                      helperText="100% Client-Side Privacy • Multi-Modal Detection"
                  />
                </div>
            ) : (
                <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px] items-start">
                    {/* ── LEFT COLUMN: Analysis & Results ── */}
                    <div className="space-y-6">
                        {/* File Card */}
                        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3.5">
                                    <div className="p-3 bg-red-100/70 text-red-600 rounded-xl font-bold text-sm">
                                        PDF
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 truncate max-w-[200px] sm:max-w-md">{file.name}</p>
                                        <p className="text-xs text-slate-500">
                                            {formatBytes(file.size)}{analysis ? ` • ${analysis.summary.totalPages} pages` : ''}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => runAnalysis(file, similarityThreshold)}
                                        disabled={loading}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                                    >
                                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                                        Re-Scan
                                    </button>
                                    <button
                                        onClick={() => {
                                            setFile(null);
                                            setAnalysis(null);
                                            setReadyPdf(null);
                                        }}
                                        className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 cursor-pointer transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Loading Progress */}
                        {loading && (
                            <div className="bg-white border border-blue-200 rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center justify-between text-sm text-blue-900 mb-2.5">
                                    <span className="font-bold flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                        {progressStep || "Analyzing pages for duplicates..."}
                                    </span>
                                    <span className="font-extrabold">{Math.round(progress)}%</span>
                                </div>
                                <div className="w-full bg-blue-100 rounded-full h-2.5 overflow-hidden">
                                    <div
                                        className="bg-blue-600 h-full rounded-full transition-all duration-300"
                                        style={{ width: `${Math.max(8, Math.min(100, progress))}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Results / Analysis View */}
                        {analysis && !loading && (
                            <div className="space-y-6">
                                {/* Summary Metrics Cards */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                                    <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center shadow-xs">
                                        <div className="text-2xl font-black text-slate-900">{analysis.summary.totalPages}</div>
                                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Total Pages</div>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center shadow-xs">
                                        <div className="text-2xl font-black text-emerald-600">{analysis.summary.uniquePages}</div>
                                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Unique Pages</div>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center shadow-xs">
                                        <div className={`text-2xl font-black ${analysis.summary.duplicatePages > 0 ? 'text-red-500' : 'text-slate-900'}`}>
                                            {analysis.summary.duplicatePages}
                                        </div>
                                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Duplicate Pages</div>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center shadow-xs flex flex-col items-center justify-center">
                                        {analysis.duplicates.length === 0 ? (
                                            <div className="flex items-center gap-1 text-emerald-600 font-bold text-sm">
                                                <CheckCircle className="w-5 h-5" /> Clean
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 text-amber-600 font-bold text-sm">
                                                <AlertTriangle className="w-5 h-5" /> {analysis.duplicates.length} Group{analysis.duplicates.length > 1 ? 's' : ''}
                                            </div>
                                        )}
                                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Status</div>
                                    </div>
                                </div>

                                {/* Sensitivity Presets Bar */}
                                <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                    <div className="flex items-center gap-2 text-slate-700 font-bold">
                                        <SlidersHorizontal className="w-4 h-4 text-orange-600" />
                                        Sensitivity Mode:
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { label: 'High (70%)', val: 70 },
                                            { label: 'Balanced (80%)', val: 80 },
                                            { label: 'Strict (95%)', val: 95 },
                                        ].map((preset) => (
                                            <button
                                                key={preset.val}
                                                type="button"
                                                onClick={() => {
                                                    setSimilarityThreshold(preset.val);
                                                    if (file) runAnalysis(file, preset.val);
                                                }}
                                                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                                                    similarityThreshold === preset.val
                                                        ? 'bg-slate-900 text-white shadow-xs'
                                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                }`}
                                            >
                                                {preset.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 1-Page Document Informational Alert */}
                                {analysis.summary.totalPages === 1 && (
                                    <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-5 flex items-start gap-3.5">
                                        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                                        <div className="text-xs sm:text-sm text-blue-900">
                                            <p className="font-bold mb-1">Single-Page Document Detected</p>
                                            <p className="opacity-90 leading-relaxed">
                                                Aapki file me sirf <strong>1 page</strong> hai. Is document me koi duplicate nahi hai. Aap right side me diye gaye button se PDF direct download kar sakte hain.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Multi-Page: No Duplicates View */}
                                {analysis.summary.totalPages > 1 && analysis.duplicates.length === 0 && (
                                    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                                        <div className="h-14 w-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <CheckCircle className="w-8 h-8" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900 mb-1">All {analysis.summary.totalPages} Pages are Unique!</h3>
                                        <p className="text-xs text-slate-500 max-w-md mx-auto">
                                            Is document me koi duplicate page nahi mila. Aapka document bilkul clean hai.
                                        </p>
                                    </div>
                                )}

                                {/* Duplicates Found View */}
                                {analysis.duplicates.length > 0 && (
                                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                                            <div>
                                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                                                    Found {analysis.duplicates.length} Duplicate Group{analysis.duplicates.length > 1 ? 's' : ''} ({analysis.summary.duplicatePages} Repeated Pages)
                                                </h3>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    Duplicate pages will be removed, keeping the first original page intact.
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={selectAllDuplicateGroups}
                                                    className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                                                >
                                                    Select All
                                                </button>
                                                <button
                                                    onClick={clearDuplicateSelection}
                                                    className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
                                                >
                                                    Clear
                                                </button>
                                            </div>
                                        </div>

                                        {/* Duplicate Groups List */}
                                        <div className="space-y-4">
                                            {analysis.duplicates.map((group, index) => {
                                                const isSelected = selectedDuplicates.has(group.groupId);

                                                return (
                                                    <div
                                                        key={group.groupId}
                                                        onClick={() => toggleDuplicateSelection(group.groupId)}
                                                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                                                            isSelected
                                                                ? 'border-red-400 bg-red-50/40 shadow-xs'
                                                                : 'border-slate-200 bg-white hover:border-slate-300'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between gap-3 mb-3">
                                                            <div className="flex items-center gap-2.5">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSelected}
                                                                    onChange={() => toggleDuplicateSelection(group.groupId)}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="h-4.5 w-4.5 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
                                                                />
                                                                <span className="font-bold text-sm text-slate-900">
                                                                    Duplicate Group #{index + 1}
                                                                </span>
                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-700">
                                                                    {group.similarity}% Match
                                                                </span>
                                                            </div>
                                                            <span className="text-xs font-semibold text-slate-500">
                                                                Pages: {group.pages.join(', ')}
                                                            </span>
                                                        </div>

                                                        <p className="text-xs text-slate-600 mb-3 bg-white/80 rounded-lg p-2 border border-slate-200/60 inline-block">
                                                            🔍 <strong>Reason:</strong> {group.reasoning}
                                                        </p>

                                                        {/* Page Badges */}
                                                        <div className="flex flex-wrap gap-2">
                                                            {group.pages.map((pageNum, pIdx) => (
                                                                <div
                                                                    key={pageNum}
                                                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${
                                                                        pIdx === 0
                                                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                                                            : isSelected
                                                                            ? 'bg-red-100 border-red-300 text-red-800 line-through'
                                                                            : 'bg-amber-50 border-amber-200 text-amber-700'
                                                                    }`}
                                                                >
                                                                    <span>Page {pageNum}</span>
                                                                    <span className="text-[10px] opacity-75 font-normal">
                                                                        {pIdx === 0 ? '(Keep Original)' : '(Delete Duplicate)'}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── RIGHT COLUMN: Sticky Download & Action Sidebar ── */}
                    <div className="sticky top-6 space-y-4">
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100">
                                Duplicate Actions
                            </h3>

                            <div className="space-y-4">
                                <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Total Pages:</span>
                                        <span className="font-bold text-slate-800">{analysis ? analysis.summary.totalPages : 1}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Duplicate Pages:</span>
                                        <span className={`font-bold ${analysis && analysis.summary.duplicatePages > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                                            {analysis ? analysis.summary.duplicatePages : 0}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Selected to Remove:</span>
                                        <span className="font-bold text-slate-800">{totalSelectedDuplicates} pages</span>
                                    </div>
                                </div>

                                {/* PRIMARY RIGHT ACTION BUTTON */}
                                {readyPdf ? (
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
                                ) : analysis && analysis.duplicates.length > 0 ? (
                                    <button
                                        type="button"
                                        onClick={handleRemoveDuplicates}
                                        disabled={removing || totalSelectedDuplicates === 0}
                                        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#e5323f] hover:bg-[#d4202d] text-white py-4 px-6 text-base font-extrabold shadow-lg shadow-red-500/25 transition-all hover:scale-[1.02] active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
                                    >
                                        {removing ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                <span>Cleaning PDF...</span>
                                            </div>
                                        ) : (
                                            <>
                                                <span>Remove Duplicates & Download</span>
                                                <ArrowRight className="h-5 w-5" />
                                            </>
                                        )}
                                    </button>
                                ) : (
                                    <Button
                                        variant="primary"
                                        size="lg"
                                        className="w-full py-4 text-base font-bold bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30 cursor-pointer"
                                        onClick={handleDownloadOriginal}
                                        disabled={loading}
                                    >
                                        <Download className="w-5 h-5 mr-2" />
                                        Download Clean PDF
                                    </Button>
                                )}

                                <p className="text-[11px] text-slate-400 text-center">
                                    Files are processed privately 100% inside your browser.
                                </p>
                            </div>
                        </div>

                        <NextStepPanel
                            title="How it works"
                            steps={[
                                'Scans text & visual layout across pages.',
                                'Identifies matching duplicate page groups.',
                                'Deletes redundant copies and keeps original.',
                            ]}
                        />
                        <RelatedActions
                            actions={[
                                { label: 'Organize PDF Pages', to: '/organize-pdf' },
                                { label: 'Delete Specific Pages', to: '/delete-page' },
                                { label: 'Merge PDF Files', to: '/merge-pdf' },
                            ]}
                        />
                    </div>
                </div>
            )}

            <ToolSEOContent toolKey="/detect-duplicates" />
          </div>
        </>
    );
};

export default DetectDuplicatePages;
