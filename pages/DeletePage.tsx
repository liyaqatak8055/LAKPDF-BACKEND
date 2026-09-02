import React, { useState, useCallback, useEffect } from "react";
import { FileUploader } from "../components/FileUploader";
import { Button } from "../components/Button";
import { deletePdfPages, formatBytes, downloadPdf, parsePageRange } from "../services/pdfService";
import { Trash2, FileText, Eye, AlertTriangle, CheckCircle, RotateCcw, Download } from "lucide-react";
import { AdUnit } from "../components/AdUnit";
import { pdfjs } from "../services/pdfService";
import { Helmet } from 'react-helmet-async';
import { ToolSEOContent } from '../components/ToolSEOContent';

interface PagePreview {
  pageNumber: number;
  thumbnail: string;
  selected: boolean;
}

const DeletePage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pagesInput, setPagesInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [pagePreviews, setPagePreviews] = useState<PagePreview[]>([]);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [showPreview, setShowPreview] = useState(false);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [isSignedPdf, setIsSignedPdf] = useState(false);
  const [previewLimit, setPreviewLimit] = useState(24);
  const [readyPdf, setReadyPdf] = useState<{ data: Uint8Array; name: string } | null>(null);

  const toPageInput = useCallback((pageNums: number[]): string => {
    if (pageNums.length === 0) return "";
    const sorted = [...new Set(pageNums)].sort((a, b) => a - b);
    const chunks: string[] = [];
    let start = sorted[0];
    let prev = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      if (current === prev + 1) {
        prev = current;
        continue;
      }
      chunks.push(start === prev ? `${start}` : `${start}-${prev}`);
      start = current;
      prev = current;
    }
    chunks.push(start === prev ? `${start}` : `${start}-${prev}`);
    return chunks.join(', ');
  }, []);

  // Generate page previews
  const generatePreviews = useCallback(async (pdfFile: File, pagesToShow: number[] = []): Promise<PagePreview[]> => {
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      const previews: PagePreview[] = [];

      // Show first previewLimit pages or specified pages
      const pagesToGenerate = pagesToShow.length > 0
        ? pagesToShow
        : Array.from({ length: Math.min(pdf.numPages, previewLimit) }, (_, i) => i + 1);

      for (const pageNum of pagesToGenerate) {
        try {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 0.15 });

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          if (context) {
            await page.render({ canvasContext: context, viewport }).promise;
            const thumbnail = canvas.toDataURL('image/png');

            previews.push({
              pageNumber: pageNum,
              thumbnail,
              selected: selectedPages.has(pageNum)
            });
          }
        } catch (error) {
          console.warn(`Failed to generate preview for page ${pageNum}:`, error);
          // Add placeholder
          previews.push({
            pageNumber: pageNum,
            thumbnail: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjE0MCIgdmlld0JveD0iMCAwIDEwMCAxNDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTQwIiBmaWxsPSIjZjNmNGY2Ii8+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zZW0iIGZpbGw9IiM5Y2E0YWIiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIj5ObyBQcmV2aWV3PC90ZXh0Pgo8L3N2Zz4K',
            selected: selectedPages.has(pageNum)
          });
        }
      }

      return previews;
    } catch (error) {
      console.error('Failed to generate previews:', error);
      return [];
    }
  }, [selectedPages, previewLimit]);

  // Analyze PDF when file is selected
  const analyzePdf = useCallback(async (pdfFile: File) => {
    setAnalyzing(true);
    try {
      // Check if PDF is signed
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      setTotalPages(pdf.numPages);

      // Check for signatures (basic check)
      let hasSignatures = false;
      for (let i = 1; i <= Math.min(pdf.numPages, 5); i++) {
        try {
          const page = await pdf.getPage(i);
          const annotations = await page.getAnnotations();

          if (annotations.some((ann: any) => ann.subtype === 'Widget' && ann.fieldType === 'Sig')) {
            hasSignatures = true;
            break;
          }
        } catch (error) {
          // Continue checking other pages
        }
      }
      setIsSignedPdf(hasSignatures);

      // Generate initial previews
      const previews = await generatePreviews(pdfFile);
      setPagePreviews(previews);
      setShowPreview(true);

    } catch (error) {
      console.error('Failed to analyze PDF:', error);
      alert('Failed to analyze PDF. Please ensure it\'s a valid PDF file.');
    } finally {
      setAnalyzing(false);
    }
  }, [generatePreviews]);

  // Handle file selection
  const handleFileSelect = useCallback(async (files: File[]) => {
    if (files.length > 0) {
      const selectedFile = files[0];
      setFile(selectedFile);
      setOriginalFile(selectedFile);
      setSelectedPages(new Set());
      setPagesInput("");
      setPreviewLimit(24);
      await analyzePdf(selectedFile);
    }
  }, [analyzePdf]);

  // Handle page selection toggle
  const togglePageSelection = useCallback((pageNumber: number) => {
    const newSelection = new Set(selectedPages);
    if (newSelection.has(pageNumber)) {
      newSelection.delete(pageNumber);
    } else {
      newSelection.add(pageNumber);
    }
    setSelectedPages(newSelection);

    // Update page previews
    setPagePreviews(prev =>
      prev.map(preview =>
        preview.pageNumber === pageNumber
          ? { ...preview, selected: newSelection.has(pageNumber) }
          : preview
      )
    );

    // Update input field
    const sortedPages = Array.from(newSelection).sort((a: number, b: number) => a - b);
    setPagesInput(toPageInput(sortedPages));
  }, [selectedPages, toPageInput]);

  // Validate and parse current input
  const parsedRange = pagesInput ? parsePageRange(pagesInput, totalPages) : { pages: [] as number[] };
  const validation = pagesInput
    ? {
        valid: !parsedRange.error,
        pages: parsedRange.pages.map((pageIndex) => pageIndex + 1),
        error: parsedRange.error
      }
    : { valid: true, pages: [] as number[] };

  useEffect(() => {
    if (!pagesInput.trim()) {
      setSelectedPages(new Set());
      setPagePreviews(prev => prev.map(preview => ({ ...preview, selected: false })));
      return;
    }
    if (!validation.valid) return;
    const nextSelection = new Set(validation.pages);
    setSelectedPages(nextSelection);
    setPagePreviews(prev =>
      prev.map(preview => ({
        ...preview,
        selected: nextSelection.has(preview.pageNumber)
      }))
    );
  }, [pagesInput, validation.valid, totalPages]);

  const selectAllVisible = useCallback(() => {
    const visiblePages = pagePreviews.map(preview => preview.pageNumber);
    const next = new Set(visiblePages);
    setSelectedPages(next);
    setPagePreviews(prev => prev.map(preview => ({ ...preview, selected: true })));
    setPagesInput(toPageInput(visiblePages));
  }, [pagePreviews, toPageInput]);

  const clearSelection = useCallback(() => {
    setSelectedPages(new Set());
    setPagePreviews(prev => prev.map(preview => ({ ...preview, selected: false })));
    setPagesInput("");
  }, []);

  const invertVisibleSelection = useCallback(() => {
    const next = new Set<number>();
    pagePreviews.forEach(preview => {
      if (!selectedPages.has(preview.pageNumber)) next.add(preview.pageNumber);
    });
    setSelectedPages(next);
    setPagePreviews(prev =>
      prev.map(preview => ({ ...preview, selected: next.has(preview.pageNumber) }))
    );
    setPagesInput(toPageInput(Array.from(next)));
  }, [pagePreviews, selectedPages, toPageInput]);

  const loadMorePreviews = useCallback(async () => {
    if (!file || previewLimit >= totalPages) return;
    const nextLimit = Math.min(totalPages, previewLimit + 24);
    setPreviewLimit(nextLimit);
    const pagesToShow = Array.from({ length: nextLimit }, (_, i) => i + 1);
    const previews = await generatePreviews(file, pagesToShow);
    setPagePreviews(previews);
  }, [file, previewLimit, totalPages, generatePreviews]);

  // Handle delete operation
  const handleDeletePages = async () => {
    if (!file || !validation.valid) return;

    if (validation.pages.length === 0) {
      alert('Please select pages to delete.');
      return;
    }

    if (validation.pages.length === totalPages) {
      alert('Cannot delete all pages. At least one page must remain.');
      return;
    }

    if (isSignedPdf) {
      const confirmDelete = window.confirm(
        'Warning: This PDF contains digital signatures. Deleting pages may invalidate the signatures. Continue?'
      );
      if (!confirmDelete) return;
    }

    setLoading(true);
    try {
      // Use the pages input string directly (backend expects this format)
      const bytes = await deletePdfPages(file, pagesInput);
      const outputName = "pages-deleted.pdf";
      setReadyPdf({ data: bytes, name: outputName });
      downloadPdf(bytes, outputName, { autoDownload: false });

      // Track usage
      const historyItem = {
        id: Date.now().toString(),
        name: file.name,
        type: 'pdf',
        tool: 'delete-page',
        timestamp: Date.now(),
        size: file.size
      };

      const savedHistory = localStorage.getItem('lakpdf_file_history');
      const history = savedHistory ? JSON.parse(savedHistory) : [];
      history.unshift(historyItem);
      localStorage.setItem('lakpdf_file_history', JSON.stringify(history.slice(0, 50)));

      const savedStats = localStorage.getItem('lakpdf_stats');
      const stats = savedStats ? JSON.parse(savedStats) : { toolsUsed: 0, filesProcessed: 0, lastActive: Date.now() };
      stats.filesProcessed += 1;
      stats.toolsUsed += 1;
      stats.lastActive = Date.now();
      localStorage.setItem('lakpdf_stats', JSON.stringify(stats));

      alert(`Successfully deleted ${validation.pages.length} page(s)!`);

    } catch (error: any) {
      console.error('Failed to delete pages:', error);
      alert(`Failed to delete pages: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle reset
  const handleReset = useCallback(() => {
    setFile(null);
    setOriginalFile(null);
    setPagesInput("");
    setSelectedPages(new Set());
    setPagePreviews([]);
    setShowPreview(false);
    setTotalPages(0);
    setIsSignedPdf(false);
    setReadyPdf(null);
  }, []);

  const handleDownloadReady = () => {
    if (!readyPdf) return;
    downloadPdf(readyPdf.data, readyPdf.name, { autoDownload: true });
  };

  // Handle undo (restore original file)
  const handleUndo = useCallback(() => {
    if (originalFile) {
      setFile(originalFile);
      setPagesInput("");
      setSelectedPages(new Set());
      // Keep previews as they show the original state
    }
  }, [originalFile]);

  return (
    <>
      <Helmet>
        <title>Delete PDF Pages Online Free - LAK PDF</title>
        <meta name="description" content="Delete pages from PDF online for free and save a cleaned PDF instantly." />
        <link rel="canonical" href="https://lakpdf.com/delete-page" />
        <meta property="og:title" content="Delete PDF Pages Online Free - LAK PDF" />
        <meta property="og:description" content="Delete pages from PDF online for free and save a cleaned PDF instantly." />
        <meta property="og:url" content="https://lakpdf.com/delete-page" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://lakpdf.com/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Delete PDF Pages Online Free - LAK PDF" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Delete PDF Pages Online Free - LAK PDF" />
        <meta name="twitter:description" content="Delete pages from PDF online for free and save a cleaned PDF instantly." />
        <meta name="twitter:image" content="https://lakpdf.com/og-image.png" />
      </Helmet>
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Delete PDF Pages</h1>
        <p className="text-slate-500">
          Remove unwanted pages from your PDF document safely
        </p>
      </div>

      {!file ? (
        <FileUploader
          accept="application/pdf"
          onFilesSelected={handleFileSelect}
          title="Select PDF"
          description="Choose the PDF file to edit"
        />
      ) : (
        <div className="space-y-6">
          {/* File Info */}
          <div className="bg-white p-6 rounded-xl shadow border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 rounded-lg">
                  <FileText className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <p className="font-medium text-slate-900 truncate max-w-[200px] sm:max-w-md">{file.name}</p>
                  <p className="text-sm text-slate-500">
                    {formatBytes(file.size)} • {totalPages} pages
                    {isSignedPdf && (
                      <span className="ml-2 inline-flex items-center gap-1 text-amber-600">
                        <AlertTriangle className="w-4 h-4" />
                        Signed PDF
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                {originalFile && file !== originalFile && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleUndo}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Undo
                  </Button>
                )}
                <button
                  onClick={handleReset}
                  className="text-sm text-slate-500 hover:text-slate-700 px-3 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Change File
                </button>
              </div>
            </div>
          </div>

          {/* Warnings */}
          {isSignedPdf && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-800 font-medium">Digital Signature Warning</p>
                <p className="text-amber-600 text-sm">
                  This PDF contains digital signatures. Deleting pages may invalidate the signatures and make the document legally unusable.
                </p>
              </div>
            </div>
          )}

          {/* Page Selection */}
          <div className="bg-white p-6 rounded-xl shadow border space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-semibold text-slate-900">
                Select Pages to Delete
              </h3>
            </div>

            {/* Manual Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Pages to delete (e.g. "1,3,5-7")
              </label>
              <input
                type="text"
                placeholder="Enter page numbers or ranges"
                value={pagesInput}
                onChange={(e) => setPagesInput(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  validation.error ? 'border-red-300' : 'border-slate-300'
                }`}
              />
              {validation.error && (
                <p className="text-sm text-red-600">{validation.error}</p>
              )}
              {validation.valid && validation.pages.length > 0 && (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  {validation.pages.length} page{validation.pages.length > 1 ? 's' : ''} selected for deletion • {Math.max(0, totalPages - validation.pages.length)} page(s) will remain
                </p>
              )}
            </div>

            {/* Visual Selection */}
            {showPreview && pagePreviews.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-600">
                    Click page thumbnails to select/deselect
                  </p>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>Showing {pagePreviews.length} of {totalPages} pages</span>
                    <Button size="sm" variant="secondary" onClick={selectAllVisible}>Select visible</Button>
                    <Button size="sm" variant="secondary" onClick={invertVisibleSelection}>Invert visible</Button>
                    <Button size="sm" variant="secondary" onClick={clearSelection}>Clear</Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 overflow-y-auto" style={{ maxHeight: '400px' }}>
                  {pagePreviews.map((preview) => (
                    <div
                      key={preview.pageNumber}
                      className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                        preview.selected
                          ? 'border-red-500 ring-2 ring-red-200'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                      onClick={() => togglePageSelection(preview.pageNumber)}
                    >
                      <img
                        src={preview.thumbnail}
                        alt={`Page ${preview.pageNumber}`}
                        className="w-full h-auto"
                      />
                      <div className={`absolute bottom-0 left-0 right-0 p-1 text-center text-xs font-medium ${
                        preview.selected ? 'bg-red-500 text-white' : 'bg-black/50 text-white'
                      }`}>
                        {preview.pageNumber}
                        {preview.selected && <Trash2 className="w-3 h-3 inline ml-1" />}
                      </div>
                    </div>
                  ))}
                </div>
                {pagePreviews.length < totalPages && (
                  <div className="flex justify-center">
                    <Button variant="secondary" size="sm" onClick={loadMorePreviews} disabled={analyzing}>
                      Load more pages
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Action Button */}
            <div className="flex justify-end pt-4 border-t">
              {readyPdf ? (
                <Button variant="primary" size="lg" onClick={handleDownloadReady} className="bg-emerald-600 hover:bg-emerald-700">
                  <Download className="w-5 h-5 mr-2" />
                  Download PDF
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleDeletePages}
                  isLoading={loading}
                  disabled={analyzing || !validation.valid || validation.pages.length === 0 || validation.pages.length === totalPages}
                  className="bg-red-500 hover:bg-red-600"
                >
                  <Trash2 className="w-5 h-5 mr-2" />
                  {loading ? "Processing..." : `Delete ${validation.pages.length || 0} Page${validation.pages.length === 1 ? '' : 's'}`}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Adsense – tool bottom */}
      {import.meta.env.PROD && (
        <div className="mt-12">
          <AdUnit
            slotId="YOUR_REAL_SLOT_ID"
            format="rectangle"
            size="medium"
            lazy={true}
            delay={3000}
          />
        </div>
      )}
      <ToolSEOContent toolKey="/delete-page" />
    </div>
    </>
  );
};

export default DeletePage;
