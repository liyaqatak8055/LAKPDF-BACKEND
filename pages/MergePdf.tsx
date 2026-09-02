import React, { useRef, useState } from 'react';
import { FileUploader } from '../components/FileUploader';
import { Button } from '../components/Button';
import { PdfFile, ProcessingStatus } from '../types';
import { formatBytes } from '../utils/formatBytes';
import { FileText, X, Download, Files, GripVertical } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { NextStepPanel, RelatedActions, ToolStartPanel } from '../components/ToolProductPanels';
import { Helmet } from 'react-helmet-async';
import { ToolSEOContent } from '../components/ToolSEOContent';

const MergePdf: React.FC = () => {
  const [files, setFiles] = useState<PdfFile[]>([]);
  const [status, setStatus] = useState<ProcessingStatus>({ isProcessing: false, message: '' });
  const [readyPdf, setReadyPdf] = useState<{ data: Uint8Array; name: string } | null>(null);

  // Drag-to-reorder state
  const dragIndex = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const handleFilesSelected = (selectedFiles: File[]) => {
    const newPdfFiles: PdfFile[] = selectedFiles.map(file => ({
      id: uuidv4(), file, name: file.name, size: file.size,
    }));
    setFiles(prev => [...prev, ...newPdfFiles]);
    setReadyPdf(null);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    setReadyPdf(null);
  };

  // ── Drag handlers ─────────────────────────────────────────────────────
  const onDragStart = (index: number) => { dragIndex.current = index; };
  const onDragEnter = (index: number) => { setDragOver(index); };
  const onDragEnd   = () => {
    if (dragIndex.current !== null && dragOver !== null && dragIndex.current !== dragOver) {
      setFiles(prev => {
        const next = [...prev];
        const [moved] = next.splice(dragIndex.current!, 1);
        next.splice(dragOver, 0, moved);
        return next;
      });
      setReadyPdf(null);
    }
    dragIndex.current = null;
    setDragOver(null);
  };

  const handleMerge = async () => {
    if (files.length < 2) return;
    setStatus({ isProcessing: true, message: 'Merging your PDFs…' });
    try {
      const { mergePdfs, downloadPdf } = await import('../services/pdfService');
      const mergedBytes = await mergePdfs(files);
      const outputName = 'merged-document.pdf';
      setReadyPdf({ data: mergedBytes, name: outputName });
      downloadPdf(mergedBytes, outputName, { autoDownload: false });
      setStatus({ isProcessing: false, message: 'Done! File ready to download.', success: true });
    } catch (error) {
      console.error(error);
      setStatus({ isProcessing: false, message: 'Error merging files.', error: 'Failed' });
    }
  };

  const handleDownloadReady = async () => {
    if (!readyPdf) return;
    const { downloadPdf } = await import('../services/pdfService');
    downloadPdf(readyPdf.data, readyPdf.name, { autoDownload: true });
  };

  return (
    <>
      <Helmet>
        <title>Merge PDF Online Free | Combine PDF Files - LAK PDF</title>
        <meta name="description" content="Merge PDF files online for free. Combine multiple PDFs in seconds without installing software." />
        <link rel="canonical" href="https://lakpdf.com/merge" />
        <meta property="og:title" content="Merge PDF Online Free | Combine PDF Files - LAK PDF" />
        <meta property="og:description" content="Merge PDF files online for free. Combine multiple PDFs in seconds without installing software." />
        <meta property="og:url" content="https://lakpdf.com/merge" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://lakpdf.com/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Merge PDF Online Free | Combine PDF Files - LAK PDF" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Merge PDF Online Free | Combine PDF Files - LAK PDF" />
        <meta name="twitter:description" content="Merge PDF files online for free. Combine multiple PDFs in seconds without installing software." />
        <meta name="twitter:image" content="https://lakpdf.com/og-image.png" />
      </Helmet>

      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Merge PDF Files</h1>
          <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto">
            Combine PDFs in the order you want. Drag to reorder, then merge.
          </p>
        </div>

        {files.length === 0 ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <FileUploader
              onFilesSelected={handleFilesSelected}
              icon={<Files className="w-12 h-12 text-primary-400" />}
              title="Select PDF files"
              description="Drop your PDFs here or select them to begin merging"
              helperText="Runs in your browser"
            />
            <ToolStartPanel
              supportedFormats={['PDF']}
              fileSizeNote="No fixed upload cap. Large PDFs depend on browser memory and device speed."
              privacyNote="This merge workflow runs in your browser."
              workflowSteps={[
                'Add two or more PDF files.',
                'Drag to reorder into the final sequence.',
                'Merge and download one combined PDF.',
              ]}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* ── File List ──────────────────────────────────────────── */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-slate-700">File preview · {files.length} selected</span>
                    <span className="ml-3 text-xs text-slate-400">Drag <GripVertical className="inline w-3 h-3" /> to reorder</span>
                  </div>
                  <button
                    onClick={() => { setFiles([]); setReadyPdf(null); setStatus({ isProcessing: false, message: '' }); }}
                    className="text-red-500 text-sm font-medium hover:text-red-600 transition-colors"
                  >
                    Clear All
                  </button>
                </div>

                <ul className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto no-scrollbar">
                  {files.map((file, index) => (
                    <li
                      key={file.id}
                      draggable
                      onDragStart={() => onDragStart(index)}
                      onDragEnter={() => onDragEnter(index)}
                      onDragEnd={onDragEnd}
                      onDragOver={e => e.preventDefault()}
                      className={`p-4 flex items-center gap-3 transition-all cursor-grab active:cursor-grabbing select-none group ${
                        dragOver === index
                          ? 'bg-blue-50 border-l-4 border-blue-400 shadow-sm'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Drag handle */}
                      <div className="text-slate-300 hover:text-slate-500 transition-colors shrink-0">
                        <GripVertical size={20} />
                      </div>

                      {/* Order badge */}
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                        <span className="text-[11px] font-bold text-slate-600">{index + 1}</span>
                      </div>

                      {/* PDF icon */}
                      <div className="w-10 h-12 bg-red-100 rounded flex items-center justify-center shrink-0 border border-red-200">
                        <span className="font-bold text-red-500 text-xs">PDF</span>
                      </div>

                      {/* File info */}
                      <div className="flex-grow min-w-0">
                        <p className="font-medium text-slate-800 truncate">{file.name}</p>
                        <p className="text-xs text-slate-400">{formatBytes(file.size)}</p>
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() => removeFile(file.id)}
                        className="p-1.5 rounded-full hover:bg-red-100 text-slate-400 hover:text-red-500 ml-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                      >
                        <X size={16} />
                      </button>
                    </li>
                  ))}
                </ul>

                <div className="p-4 border-t border-slate-100 bg-slate-50">
                  <div className="relative">
                    <input
                      type="file"
                      multiple
                      accept=".pdf"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={e => { if (e.target.files) handleFilesSelected(Array.from(e.target.files)); }}
                    />
                    <Button variant="secondary" size="sm" className="w-full">
                      + Add more files
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Sidebar ────────────────────────────────────────────── */}
            <div className="lg:col-span-1">
              <div className="space-y-4 sticky top-24">
                <NextStepPanel
                  title="Next step"
                  steps={[
                    'Drag files to set the final order.',
                    'Check the numbered sequence.',
                    'Merge when the order is right.',
                  ]}
                />
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="font-bold text-slate-900 mb-4 text-lg">Summary</h3>
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">File count:</span>
                      <span className="font-medium text-slate-800">{files.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Total size:</span>
                      <span className="font-medium text-slate-800">
                        {formatBytes(files.reduce((acc, curr) => acc + curr.size, 0))}
                      </span>
                    </div>
                  </div>

                  {readyPdf ? (
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30"
                      onClick={handleDownloadReady}
                    >
                      <Download className="w-5 h-5 mr-2" />
                      Download PDF
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full"
                      onClick={handleMerge}
                      disabled={files.length < 2}
                      isLoading={status.isProcessing}
                    >
                      {status.isProcessing ? 'Merging…' : 'Merge PDF'}
                    </Button>
                  )}

                  {files.length < 2 && (
                    <p className="text-xs text-orange-500 mt-3 text-center bg-orange-50 p-2 rounded">
                      Please select at least 2 PDF files to merge.
                    </p>
                  )}

                  {status.message && (
                    <p className={`text-sm mt-3 text-center ${status.error ? 'text-red-600' : status.success ? 'text-emerald-700' : 'text-slate-500'}`}>
                      {status.message}
                    </p>
                  )}
                </div>
                <RelatedActions
                  actions={[
                    { label: 'Compress PDF',    to: '/compress' },
                    { label: 'Organize PDF',    to: '/organize-pdf' },
                    { label: 'Add page numbers', to: '/page-number' },
                  ]}
                />
              </div>
            </div>
          </div>
        )}
        <ToolSEOContent toolKey="/merge" />
      </div>
    </>
  );
};

export default MergePdf;
