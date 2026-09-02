import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileUploader } from '../components/FileUploader';
import { Button } from '../components/Button';
import { PdfFile, ProcessingStatus } from '../types';
import { organizePdf, downloadPdf, formatBytes, pdfjs } from '../services/pdfService';
import { Files, ArrowLeft, ArrowRight, Trash2, RotateCcw, RotateCw, MoreVertical, Copy, Scissors, Undo2, Redo2, ZoomIn, ZoomOut, Maximize2, MoveHorizontal, CheckSquare, Square, Download } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Helmet } from 'react-helmet-async';
import { ToolSEOContent } from '../components/ToolSEOContent';

interface PageItem {
  id: string;
  index: number;
  img: string;
  rotation: 0 | 90 | 180 | 270;
  width: number;
  height: number;
  sizeKb: number;
}

const OrganizePdf: React.FC = () => {
  const [file, setFile] = useState<PdfFile | null>(null);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [status, setStatus] = useState<ProcessingStatus>({ isProcessing: false, message: '' });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [previewMode, setPreviewMode] = useState<'fit-width' | 'fit-page' | 'custom'>('fit-width');
  const [isDirty, setIsDirty] = useState(false);
  const [readyPdf, setReadyPdf] = useState<{ data: Uint8Array; name: string } | null>(null);
  const [history, setHistory] = useState<PageItem[][]>([]);
  const [future, setFuture] = useState<PageItem[][]>([]);
  const [previewImg, setPreviewImg] = useState<string | null>(null);

  const pdfRef = useRef<any>(null);

  const selectedPage = useMemo(() => pages.find(p => p.id === selectedIds[0]) || pages[0], [pages, selectedIds]);
  const allSelected = pages.length > 0 && selectedIds.length === pages.length;

  const recordHistory = (nextPages: PageItem[]) => {
    setHistory(prev => [...prev, pages]);
    setFuture([]);
    setPages(nextPages);
    setIsDirty(true);
  };

  const handleFileSelected = async (selectedFiles: File[]) => {
    if (selectedFiles.length > 0) {
      const f = selectedFiles[0];
      setFile({
        id: uuidv4(),
        file: f,
        name: f.name,
        size: f.size,
      });

      setSelectedIds([]);
      setHistory([]);
      setFuture([]);
      setIsDirty(false);
      setPreviewImg(null);

      // Generate thumbnails
      setStatus({ isProcessing: true, message: 'Loading pages...' });
      try {
        const arrayBuffer = await f.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        pdfRef.current = pdf;
        const newPages: PageItem[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          setStatus({ isProcessing: true, message: `Rendering page ${i} of ${pdf.numPages}...` });
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.6 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          if (context) {
            await page.render({ canvasContext: context, viewport }).promise;
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            newPages.push({
              id: uuidv4(),
              index: i - 1, // 0-based index for pdf-lib
              img: dataUrl,
              rotation: 0,
              width: Math.round(page.getViewport({ scale: 1 }).width),
              height: Math.round(page.getViewport({ scale: 1 }).height),
              sizeKb: Math.round((dataUrl.length * 3) / 4 / 1024)
            });
          }
        }
        setPages(newPages);
        setStatus({ isProcessing: false, message: `Loaded ${newPages.length} pages`, success: true });
        if (newPages.length > 0) {
          setSelectedIds([newPages[0].id]);
          setLastSelectedIndex(0);
        }
      } catch (e) {
        console.error(e);
        setStatus({ isProcessing: false, message: 'Error loading PDF', error: 'Failed to load pages' });
      }
    }
  };

  const resetOrganizer = () => {
    setFile(null);
    setPages([]);
    setSelectedIds([]);
    setHistory([]);
    setFuture([]);
    setPreviewImg(null);
    setIsDirty(false);
    setReadyPdf(null);
    pdfRef.current = null;
  };

  const movePage = (currentIndex: number, direction: 'left' | 'right') => {
    const newPages = [...pages];
    const targetIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex >= 0 && targetIndex < newPages.length) {
      [newPages[currentIndex], newPages[targetIndex]] = [newPages[targetIndex], newPages[currentIndex]];
      recordHistory(newPages);
    }
  };

  const removePage = (index: number) => {
    const newPages = [...pages];
    const removed = newPages.splice(index, 1);
    const removedId = removed[0]?.id;
    if (removedId) {
      setSelectedIds(prev => prev.filter(id => id !== removedId));
    }
    recordHistory(newPages);
  };

  const rotatePage = (id: string, direction: 'left' | 'right') => {
    const delta = direction === 'left' ? -90 : 90;
    const updated = pages.map(page => (
      page.id === id
        ? { ...page, rotation: (((page.rotation + delta + 360) % 360) as PageItem['rotation']) }
        : page
    ));
    recordHistory(updated);
  };

  const duplicatePage = (id: string) => {
    const index = pages.findIndex(page => page.id === id);
    if (index === -1) return;
    const page = pages[index];
    const duplicate: PageItem = {
      ...page,
      id: uuidv4()
    };
    const updated = [...pages];
    updated.splice(index + 1, 0, duplicate);
    recordHistory(updated);
  };

  const extractPage = async (page: PageItem) => {
    if (!file) return;
    try {
      setStatus({ isProcessing: true, message: 'Extracting page...' });
      const pdfBytes = await organizePdf(file.file, [{ index: page.index, rotation: page.rotation }]);
      downloadPdf(pdfBytes, `page-${page.index + 1}-${file.name}`);
      setStatus({ isProcessing: false, message: '' });
    } catch (error) {
      console.error(error);
      setStatus({ isProcessing: false, message: 'Failed to extract page', error: 'Failed' });
    }
  };

  const handleSelect = (id: string, index: number, event: React.MouseEvent) => {
    if (event.shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const rangeIds = pages.slice(start, end + 1).map(page => page.id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...rangeIds])));
    } else if (event.metaKey || event.ctrlKey) {
      setSelectedIds(prev => (
        prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
      ));
      setLastSelectedIndex(index);
    } else {
      setSelectedIds([id]);
      setLastSelectedIndex(index);
    }
  };

  const toggleSelect = (id: string, index: number) => {
    setSelectedIds(prev => (
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    ));
    setLastSelectedIndex(index);
  };

  const moveSelected = (position: 'start' | 'end') => {
    if (selectedIds.length === 0) return;
    const selectedSet = new Set(selectedIds);
    const selectedPages = pages.filter(page => selectedSet.has(page.id));
    const remaining = pages.filter(page => !selectedSet.has(page.id));
    const updated = position === 'start' ? [...selectedPages, ...remaining] : [...remaining, ...selectedPages];
    recordHistory(updated);
  };

  const selectAllPages = () => {
    setSelectedIds(pages.map(page => page.id));
    setLastSelectedIndex(pages.length > 0 ? pages.length - 1 : null);
  };

  const clearSelection = () => {
    setSelectedIds([]);
    setLastSelectedIndex(null);
  };

  const invertSelection = () => {
    const selectedSet = new Set(selectedIds);
    const nextSelected = pages.filter(page => !selectedSet.has(page.id)).map(page => page.id);
    setSelectedIds(nextSelected);
    setLastSelectedIndex(nextSelected.length > 0 ? pages.findIndex(p => p.id === nextSelected[nextSelected.length - 1]) : null);
  };

  const reverseOrder = () => {
    if (pages.length < 2) return;
    recordHistory([...pages].reverse());
  };

  const deleteSelected = () => {
    if (selectedIds.length === 0) return;
    const selectedSet = new Set(selectedIds);
    const updated = pages.filter(page => !selectedSet.has(page.id));
    setSelectedIds([]);
    recordHistory(updated);
  };

  const rotateSelected = (direction: 'left' | 'right') => {
    if (selectedIds.length === 0) return;
    const selectedSet = new Set(selectedIds);
    const delta = direction === 'left' ? -90 : 90;
    const updated = pages.map(page => (
      selectedSet.has(page.id)
        ? { ...page, rotation: (((page.rotation + delta + 360) % 360) as PageItem['rotation']) }
        : page
    ));
    recordHistory(updated);
  };

  const handleDragStart = (id: string) => {
    setDraggingId(id);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.preventDefault();
    if (id !== dragOverId) {
      setDragOverId(id);
    }
  };

  const handleDrop = (id: string) => {
    if (!draggingId || draggingId === id) {
      setDraggingId(null);
      setDragOverId(null);
      return;
    }
    const currentIndex = pages.findIndex(page => page.id === draggingId);
    const targetIndex = pages.findIndex(page => page.id === id);
    if (currentIndex === -1 || targetIndex === -1) return;
    const updated = [...pages];
    const [moved] = updated.splice(currentIndex, 1);
    updated.splice(targetIndex, 0, moved);
    recordHistory(updated);
    setDraggingId(null);
    setDragOverId(null);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setFuture(prev => [pages, ...prev]);
    setPages(previous);
    setIsDirty(true);
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture(prev => prev.slice(1));
    setHistory(prev => [...prev, pages]);
    setPages(next);
    setIsDirty(true);
  };

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-page-menu]')) {
        setOpenMenuId(null);
      }
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (!file) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        selectAllPages();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        handleUndo();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        handleRedo();
      }
      if (event.key === 'Delete' && selectedIds.length > 0) {
        event.preventDefault();
        deleteSelected();
      }
      if (event.key.toLowerCase() === 'r' && selectedIds.length > 0) {
        event.preventDefault();
        rotateSelected('right');
      }
      if (event.key.toLowerCase() === 'd' && selectedIds.length === 1) {
        event.preventDefault();
        duplicatePage(selectedIds[0]);
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        clearSelection();
        setOpenMenuId(null);
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [file, selectedIds, pages, history, future]);

  const getPageInfo = (page: PageItem) => {
    const ratio = page.width / page.height;
    const sizeLabel = Math.abs(ratio - 0.707) < 0.03 ? 'A4' : Math.abs(ratio - 0.77) < 0.05 ? 'Letter' : 'Custom';
    const orientation = page.width >= page.height ? 'Landscape' : 'Portrait';
    return `${sizeLabel} • ${orientation}`;
  };

  useEffect(() => {
    const renderPreview = async () => {
      if (!selectedPage || !pdfRef.current) {
        setPreviewImg(null);
        return;
      }
      try {
        const page = await pdfRef.current.getPage(selectedPage.index + 1);
        const viewport = page.getViewport({ scale: 1.2 });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport }).promise;
          setPreviewImg(canvas.toDataURL('image/jpeg', 0.9));
        }
      } catch (error) {
        console.warn('Preview render failed', error);
        setPreviewImg(selectedPage.img);
      }
    };
    renderPreview();
  }, [selectedPage]);

  const handleSave = async () => {
    if (!file || pages.length === 0) return;
    setStatus({ isProcessing: true, message: 'Saving PDF...' });

    try {
      const specs = pages.map(p => ({ index: p.index, rotation: p.rotation }));
      const pdfBytes = await organizePdf(file.file, specs);
      const outputName = `organized-${file.name}`;
      setReadyPdf({ data: pdfBytes, name: outputName });
      downloadPdf(pdfBytes, outputName, { autoDownload: false });
      setStatus({ isProcessing: false, message: 'PDF ready to download', success: true });
      setIsDirty(false);
    } catch (error) {
      console.error(error);
      setStatus({ isProcessing: false, message: 'Error saving file.', error: 'Failed' });
    }
  };

  const handleDownloadReady = () => {
    if (!readyPdf) return;
    downloadPdf(readyPdf.data, readyPdf.name, { autoDownload: true });
  };

  return (
    <>
      <Helmet>
        <title>Organize PDF Pages Online | Reorder PDF - LAK PDF</title>
        <meta name="description" content="Organize PDF pages online. Reorder, move and manage pages with a simple drag-and-drop workflow." />
        <link rel="canonical" href="https://lakpdf.com/organize-pdf" />
        <meta property="og:title" content="Organize PDF Pages Online | Reorder PDF - LAK PDF" />
        <meta property="og:description" content="Organize PDF pages online. Reorder, move and manage pages with a simple drag-and-drop workflow." />
        <meta property="og:url" content="https://lakpdf.com/organize-pdf" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://lakpdf.com/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Organize PDF Pages Online | Reorder PDF - LAK PDF" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Organize PDF Pages Online | Reorder PDF - LAK PDF" />
        <meta name="twitter:description" content="Organize PDF pages online. Reorder, move and manage pages with a simple drag-and-drop workflow." />
        <meta name="twitter:image" content="https://lakpdf.com/og-image.png" />
      </Helmet>
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Organize PDF</h1>
        <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto">
          Sort, reorder or delete pages from your PDF document.
        </p>
      </div>

      {!file ? (
        <FileUploader
          onFilesSelected={handleFileSelected}
          multiple={false}
          icon={<Files className="w-12 h-12 text-orange-500" />}
          title="Select PDF file"
          description="Drop your PDF here"
        />
      ) : (
        <div>
          <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm sticky top-20 z-10">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center text-red-500 font-bold shrink-0">
                 PDF
               </div>
               <div>
                 <h3 className="font-semibold text-slate-900 truncate max-w-[200px]">{file.name}</h3>
                 <p className="text-xs text-slate-500">{pages.length} Pages</p>
               </div>
             </div>
             <div className="flex flex-wrap gap-2">
               <Button variant="ghost" onClick={resetOrganizer}>Cancel</Button>
               <Button variant="secondary" onClick={handleUndo} disabled={history.length === 0}>
                 <Undo2 className="w-4 h-4 mr-1" /> Undo
               </Button>
               <Button variant="secondary" onClick={handleRedo} disabled={future.length === 0}>
                 <Redo2 className="w-4 h-4 mr-1" /> Redo
               </Button>
               <Button variant="secondary" onClick={reverseOrder} disabled={pages.length < 2 || status.isProcessing}>
                 Reverse
               </Button>
               {readyPdf && !isDirty ? (
                 <Button variant="primary" onClick={handleDownloadReady}>
                   <Download className="w-4 h-4 mr-1" /> Download PDF
                 </Button>
               ) : (
                 <Button variant="primary" onClick={handleSave} isLoading={status.isProcessing} disabled={!isDirty || status.isProcessing}>
                   {status.isProcessing ? 'Saving…' : 'Save PDF'}
                 </Button>
               )}
             </div>
          </div>

          {!!status.message && (
            <div className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
              status.error
                ? 'border-red-200 bg-red-50 text-red-700'
                : status.success
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : 'border-slate-200 bg-slate-50 text-slate-600'
            }`}>
              {status.message}
            </div>
          )}

          {pages.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <MoveHorizontal className="w-4 h-4" />
                Drag pages to reorder. Use shift or ctrl/cmd to multi-select.
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">{selectedIds.length} selected</span>
                <Button variant="secondary" size="sm" onClick={allSelected ? clearSelection : selectAllPages}>
                  {allSelected ? 'Clear all' : 'Select all'}
                </Button>
                <Button variant="secondary" size="sm" onClick={invertSelection} disabled={pages.length === 0}>
                  Invert
                </Button>
              </div>
              {selectedIds.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={() => rotateSelected('left')}>
                    <RotateCcw className="w-4 h-4 mr-1" /> Rotate left
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => rotateSelected('right')}>
                    <RotateCw className="w-4 h-4 mr-1" /> Rotate right
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => moveSelected('start')}>
                    Move to start
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => moveSelected('end')}>
                    Move to end
                  </Button>
                  <Button variant="secondary" size="sm" onClick={deleteSelected}>
                    <Trash2 className="w-4 h-4 mr-1" /> Delete selected
                  </Button>
                </div>
              )}
            </div>
          )}

          {status.isProcessing && pages.length === 0 ? (
            <div className="text-center py-20 text-slate-400">Loading pages...</div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-[2fr,1fr] gap-6">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {pages.map((page, i) => {
                  const isSelected = selectedIds.includes(page.id);
                  const isDragging = draggingId === page.id;
                  const isDragOver = dragOverId === page.id && draggingId !== page.id;
                  return (
                    <div
                      key={page.id}
                      draggable
                      onDragStart={() => handleDragStart(page.id)}
                      onDragOver={(e) => handleDragOver(e, page.id)}
                      onDrop={() => handleDrop(page.id)}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setDragOverId(null);
                      }}
                      onClick={(event) => handleSelect(page.id, i, event)}
                      className={`group relative bg-white p-2 rounded-lg border shadow-sm transition-all cursor-pointer ${
                        isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200'
                      } ${isDragging ? 'shadow-xl scale-[1.02]' : 'hover:shadow-md'} ${isDragOver ? 'border-dashed border-blue-400' : ''}`}
                    >
                      {isDragOver && (
                        <div className="absolute -top-2 left-2 right-2 h-1 bg-blue-400 rounded-full" />
                      )}
                      <div className="relative aspect-[3/4] bg-slate-100 mb-2 overflow-hidden border border-slate-100">
                        <img
                          src={page.img}
                          alt={`Page ${i + 1}`}
                          className="w-full h-full object-contain"
                          style={{ transform: `rotate(${page.rotation}deg)` }}
                        />
                        <div className="absolute top-1 left-1 flex items-center gap-1">
                          <span className="bg-black/70 text-white text-[10px] px-1.5 rounded">{i + 1}</span>
                          {page.rotation !== 0 && (
                            <span className="bg-yellow-400 text-yellow-900 text-[10px] px-1.5 rounded">↻</span>
                          )}
                        </div>
                        <div className="absolute top-1 right-1">
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleSelect(page.id, i);
                            }}
                            className="bg-white/90 text-slate-700 p-1 rounded shadow"
                            title="Select page"
                          >
                            {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                          </button>
                        </div>
                        <div className="absolute bottom-1 left-1 right-1 bg-black/60 text-white text-[10px] px-1.5 rounded flex items-center justify-between">
                          <span>Page {i + 1}</span>
                          <span>{getPageInfo(page)}</span>
                        </div>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              removePage(i);
                            }}
                            className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-transform hover:scale-110"
                            title="Delete Page"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-between mt-1">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            movePage(i, 'left');
                          }}
                          disabled={i === 0}
                          className="p-1 rounded hover:bg-slate-100 text-slate-400 disabled:opacity-30"
                        >
                          <ArrowLeft size={16} />
                        </button>
                        <div className="relative">
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              setOpenMenuId(openMenuId === page.id ? null : page.id);
                            }}
                            className="p-1 rounded hover:bg-slate-100 text-slate-500"
                          >
                            <MoreVertical size={16} />
                          </button>
                          {openMenuId === page.id && (
                            <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-20">
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  rotatePage(page.id, 'left');
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                              >
                                <RotateCcw size={14} /> Rotate Left
                              </button>
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  rotatePage(page.id, 'right');
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                              >
                                <RotateCw size={14} /> Rotate Right
                              </button>
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  duplicatePage(page.id);
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                              >
                                <Copy size={14} /> Duplicate
                              </button>
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  extractPage(page);
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                              >
                                <Scissors size={14} /> Extract
                              </button>
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  removePage(i);
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 text-red-600"
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            movePage(i, 'right');
                          }}
                          disabled={i === pages.length - 1}
                          className="p-1 rounded hover:bg-slate-100 text-slate-400 disabled:opacity-30"
                        >
                          <ArrowRight size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sticky top-28 h-fit">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Preview</h3>
                    <p className="text-xs text-slate-500">{selectedPage ? `Page ${pages.indexOf(selectedPage) + 1}` : 'Select a page'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setPreviewMode('custom');
                        setPreviewZoom(z => Math.max(0.5, Math.round((z - 0.1) * 10) / 10));
                      }}
                      className="p-1 rounded hover:bg-slate-100 text-slate-500"
                    >
                      <ZoomOut size={16} />
                    </button>
                    <button
                      onClick={() => {
                        setPreviewMode('custom');
                        setPreviewZoom(z => Math.min(2.5, Math.round((z + 0.1) * 10) / 10));
                      }}
                      className="p-1 rounded hover:bg-slate-100 text-slate-500"
                    >
                      <ZoomIn size={16} />
                    </button>
                    <button
                      onClick={() => {
                        setPreviewMode('fit-width');
                        setPreviewZoom(1);
                      }}
                      className={`p-1 rounded ${previewMode === 'fit-width' ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-100 text-slate-500'}`}
                      title="Fit width"
                    >
                      <MoveHorizontal size={16} />
                    </button>
                    <button
                      onClick={() => {
                        setPreviewMode('fit-page');
                        setPreviewZoom(0.9);
                      }}
                      className={`p-1 rounded ${previewMode === 'fit-page' ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-100 text-slate-500'}`}
                      title="Fit page"
                    >
                      <Maximize2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg border border-slate-200 p-3">
                  {selectedPage ? (
                    <div className="overflow-auto">
                      <img
                        src={previewImg || selectedPage.img}
                        alt="Preview"
                        className="mx-auto"
                        style={{
                          width: previewMode === 'fit-width' ? '100%' : 'auto',
                          maxWidth: '100%',
                          transform: previewMode === 'custom' ? `scale(${previewZoom})` : 'none',
                          transformOrigin: 'top center'
                        }}
                      />
                    </div>
                  ) : (
                    <div className="text-center text-xs text-slate-400 py-10">Select a page to preview.</div>
                  )}
                </div>
                {selectedPage && (
                  <div className="mt-3 text-xs text-slate-500 space-y-1">
                    <div>Resolution: {selectedPage.width} × {selectedPage.height}</div>
                    <div>Size: {selectedPage.sizeKb} KB</div>
                    <div>Orientation: {selectedPage.width >= selectedPage.height ? 'Landscape' : 'Portrait'}</div>
                    <div>Shortcuts: Ctrl/Cmd+A select all, Del delete, R rotate, Ctrl/Cmd+Z undo</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      <ToolSEOContent toolKey="/organize-pdf" />
    </div>
    </>
  );
};

export default OrganizePdf;
