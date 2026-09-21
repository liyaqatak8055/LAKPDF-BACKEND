import React, { useEffect, useRef, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Download,
  FileDown,
  RotateCcw,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Layers,
  FileText,
  Check,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { extractPdfToStructuredHtml, type ExtractedPageDocument } from '../../services/pdfDocumentExtractor';
import { convertPdfToWord } from '../../services/officeService';

interface DocumentFlowEditorProps {
  file: File;
  onSwitchToCanvas: () => void;
  fileName?: string;
}

export const DocumentFlowEditor: React.FC<DocumentFlowEditorProps> = ({
  file,
  onSwitchToCanvas,
  fileName,
}) => {
  const [pages, setPages] = useState<ExtractedPageDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [zoom, setZoom] = useState(1.0);
  const editorRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Extract structured HTML on mount
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const extracted = await extractPdfToStructuredHtml(file);
        if (active) {
          setPages(extracted);
          setLoading(false);
        }
      } catch (err: any) {
        if (active) {
          setError(err?.message || 'Failed to parse document for Word editing.');
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [file]);

  // Execute standard rich text editing commands
  const execCmd = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
  };

  // Export edited HTML pages back to clean PDF
  const handleExportPdf = async () => {
    try {
      setExporting(true);
      setNotice('Generating high-resolution PDF...');

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageCount = pages.length;

      for (let i = 0; i < pageCount; i++) {
        const pageNum = i + 1;
        const pageEl = editorRefs.current.get(pageNum);
        if (!pageEl) continue;

        if (i > 0) {
          pdf.addPage('a4', 'portrait');
        }

        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdfWidth = 210; // A4 width in mm
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, Math.min(297, pdfHeight));
      }

      const outName = `${(fileName || file.name || 'document').replace(/\.pdf$/i, '')}-edited.pdf`;
      pdf.save(outName);
      setNotice('PDF exported successfully!');
    } catch (err: any) {
      setError(err?.message || 'Failed to export PDF.');
    } finally {
      setExporting(false);
    }
  };

  // Download directly as Word (.docx)
  const handleDownloadDocx = async () => {
    try {
      setExporting(true);
      setNotice('Preparing Word document (.docx)...');
      const docxBlob = await convertPdfToWord(file);
      const url = URL.createObjectURL(docxBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(fileName || file.name || 'document').replace(/\.pdf$/i, '')}-edited.docx`;
      a.click();
      URL.revokeObjectURL(url);
      setNotice('Word document downloaded successfully!');
    } catch (err: any) {
      setError(err?.message || 'Failed to convert to Word document.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-slate-100 dark:bg-dark-bg text-slate-900 dark:text-white">
      {/* Sticky Document Mode Header */}
      <header className="sticky top-16 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs">
        {/* Top Info & Mode Switcher Bar */}
        <div className="h-16 px-4 sm:px-6 flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-800 dark:text-white truncate max-w-[160px] sm:max-w-xs md:max-w-sm">
                  {fileName || file.name}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40">
                  <Sparkles className="w-3 h-3" /> Word Flow Mode
                </span>
              </div>
              <p className="text-[12px] text-slate-400 font-medium">
                Reflowable text • Click any word to edit freely with natural line wrapping
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Switch to Canvas Mode */}
            <button
              type="button"
              onClick={onSwitchToCanvas}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 transition cursor-pointer"
              title="Switch to Canvas Mode for signatures, stamps, drawings, and shapes"
            >
              <Layers className="h-4 w-4 text-slate-500" />
              <span className="hidden sm:inline">Canvas / Annotator</span>
            </button>

            {/* Word DOCX Download */}
            <button
              type="button"
              onClick={handleDownloadDocx}
              disabled={exporting}
              className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition cursor-pointer disabled:opacity-50"
              title="Download as Microsoft Word document"
            >
              <FileDown className="h-4 w-4" />
              <span>Download .docx</span>
            </button>

            {/* Export as PDF Primary CTA */}
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={exporting || loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-primary-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-600/20 active:scale-98 transition disabled:opacity-50 cursor-pointer"
            >
              {exporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>Save & Download PDF</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Word Formatting Ribbon Toolbar */}
        <div className="py-2 px-4 sm:px-6 bg-slate-50 dark:bg-slate-900 flex items-center gap-2 overflow-x-auto border-b border-slate-200/80 dark:border-slate-800 text-xs">
          {/* History */}
          <div className="flex items-center gap-0.5 bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
            <button
              type="button"
              onClick={() => execCmd('undo')}
              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => execCmd('redo')}
              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

          {/* Heading Style */}
          <select
            onChange={(e) => execCmd('formatBlock', e.target.value)}
            defaultValue="<p>"
            className="h-7.5 px-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="<p>">Normal Text</option>
            <option value="<h1>">Heading 1</option>
            <option value="<h2>">Heading 2</option>
            <option value="<h3>">Heading 3</option>
          </select>

          {/* Font Family */}
          <select
            onChange={(e) => execCmd('fontName', e.target.value)}
            defaultValue="Arial"
            className="h-7.5 px-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="Arial, sans-serif">Arial</option>
            <option value="'Times New Roman', serif">Times New Roman</option>
            <option value="Georgia, serif">Georgia</option>
            <option value="'Courier New', monospace">Courier</option>
            <option value="Inter, sans-serif">Inter</option>
          </select>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

          {/* Formatting Controls */}
          <div className="flex items-center gap-0.5 bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
            <button
              type="button"
              onClick={() => execCmd('bold')}
              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold"
              title="Bold (Ctrl+B)"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => execCmd('italic')}
              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
              title="Italic (Ctrl+I)"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => execCmd('underline')}
              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
              title="Underline (Ctrl+U)"
            >
              <Underline className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => execCmd('strikeThrough')}
              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
              title="Strikethrough"
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Text Color */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] text-slate-500 font-medium">Color:</span>
            <input
              type="color"
              defaultValue="#0f172a"
              onChange={(e) => execCmd('foreColor', e.target.value)}
              className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0"
              title="Text Color"
            />
          </div>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

          {/* Alignment */}
          <div className="flex items-center gap-0.5 bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
            <button
              type="button"
              onClick={() => execCmd('justifyLeft')}
              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
              title="Align Left"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => execCmd('justifyCenter')}
              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
              title="Align Center"
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => execCmd('justifyRight')}
              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
              title="Align Right"
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => execCmd('justifyFull')}
              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
              title="Justify"
            >
              <AlignJustify className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Lists */}
          <div className="flex items-center gap-0.5 bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
            <button
              type="button"
              onClick={() => execCmd('insertUnorderedList')}
              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
              title="Bullet List"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => execCmd('insertOrderedList')}
              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
              title="Numbered List"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Zoom */}
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.6, Math.min(1.5, z - 0.1)))}
              className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-semibold text-slate-500 min-w-[45px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.6, Math.min(1.5, z + 0.1)))}
              className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Messages */}
      {(error || notice) && (
        <div className="max-w-4xl mx-auto px-4 mt-4 w-full">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs font-medium">
              {error}
            </div>
          )}
          {notice && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
              {notice}
            </div>
          )}
        </div>
      )}

      {/* A4 Document Paper Workspace */}
      <main className="flex-1 py-8 px-4 flex flex-col items-center justify-start overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-500">
            <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold">Converting PDF to reflowable Word document...</p>
            <p className="text-xs text-slate-400">Structuring text, headings, tables, and images</p>
          </div>
        ) : (
          <div
            className="flex flex-col gap-8 transition-transform origin-top"
            style={{ transform: `scale(${zoom})` }}
          >
            {pages.map((p) => (
              <div
                key={p.pageNumber}
                className="relative bg-white text-slate-900 shadow-xl border border-slate-200/80 rounded-sm"
                style={{
                  width: '794px', // Standard A4 width at 96 DPI
                  minHeight: '1123px', // Standard A4 height
                  padding: '55px 65px',
                  boxSizing: 'border-box',
                }}
              >
                {/* Page Number Watermark */}
                <div className="absolute top-4 right-6 text-[11px] font-semibold text-slate-300 select-none pointer-events-none">
                  Page {p.pageNumber}
                </div>

                {/* Editable Content Sheet */}
                <div
                  ref={(el) => {
                    if (el) editorRefs.current.set(p.pageNumber, el);
                  }}
                  contentEditable={true}
                  suppressContentEditableWarning={true}
                  dangerouslySetInnerHTML={{ __html: p.html }}
                  className="outline-none focus:outline-none text-slate-900 leading-relaxed font-sans"
                  style={{
                    minHeight: '1000px',
                    wordBreak: 'break-word',
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
