import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FileUploader } from '../components/FileUploader';
import { Button } from '../components/Button';
import { ProcessingStatus } from '../types';
import { formatBytes } from '../utils/formatBytes';
import {
  Image as ImageIcon,
  X,
  Download,
  FileCheck2,
  GripVertical,
  Plus,
  RotateCw,
  ArrowRight,
  Maximize2,
  Check,
  Sparkles,
  ArrowUpDown,
  Archive
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Helmet } from 'react-helmet-async';
import { ToolSEOContent } from '../components/ToolSEOContent';

interface ImageFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  previewUrl: string;
  width?: number;
  height?: number;
  rotation: number; // 0, 90, 180, 270
}

type PageSize = 'a4' | 'letter' | 'fit';
type Orientation = 'portrait' | 'landscape';
type Margin = 'none' | 'small' | 'big';

const PAGE_SIZE_OPTIONS: { value: PageSize; label: string }[] = [
  { value: 'a4', label: 'A4 (297 × 210 mm)' },
  { value: 'fit', label: 'Fit to Image (Same as image)' },
  { value: 'letter', label: 'US Letter (215 × 279 mm)' },
];

export const ImageToPdf: React.FC = () => {
  const [files, setFiles] = useState<ImageFileItem[]>([]);
  const [pageSize, setPageSize] = useState<PageSize>('a4');
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [margin, setMargin] = useState<Margin>('none');
  const [mergeAll, setMergeAll] = useState<boolean>(true);
  const filesRef = useRef<ImageFileItem[]>([]);
  const [readyResult, setReadyResult] = useState<{ blob: Blob; name: string; isZip?: boolean } | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>({ isProcessing: false, message: '' });
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Drag-to-reorder state
  const dragIndex = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    return () => {
      filesRef.current.forEach((f) => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      });
    };
  }, []);

  const handleFilesSelected = (selectedFiles: File[]) => {
    selectedFiles.forEach((file) => {
      const id = uuidv4();
      const previewUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const item: ImageFileItem = {
          id,
          file,
          name: file.name,
          size: file.size,
          previewUrl,
          width: img.naturalWidth,
          height: img.naturalHeight,
          rotation: 0,
        };
        setFiles((prev) => [...prev, item]);
      };
      img.onerror = () => {
        const item: ImageFileItem = {
          id,
          file,
          name: file.name,
          size: file.size,
          previewUrl,
          rotation: 0,
        };
        setFiles((prev) => [...prev, item]);
      };
      img.src = previewUrl;
    });
    setReadyResult(null);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const f = prev.find((x) => x.id === id);
      if (f?.previewUrl) URL.revokeObjectURL(f.previewUrl);
      return prev.filter((x) => x.id !== id);
    });
    setReadyResult(null);
  };

  const rotateFile = (id: string) => {
    setFiles((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextRot = (item.rotation + 90) % 360;
          return { ...item, rotation: nextRot };
        }
        return item;
      })
    );
    setReadyResult(null);
  };

  const toggleSort = () => {
    setFiles((prev) =>
      [...prev].sort((a, b) =>
        sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
      )
    );
    setSortAsc(!sortAsc);
    setReadyResult(null);
  };

  // Drag-to-reorder handlers
  const onDragStart = (index: number) => {
    dragIndex.current = index;
  };
  const onDragEnter = (index: number) => {
    setDragOver(index);
  };
  const onDragEnd = () => {
    if (dragIndex.current !== null && dragOver !== null && dragIndex.current !== dragOver) {
      setFiles((prev) => {
        const next = [...prev];
        const [moved] = next.splice(dragIndex.current!, 1);
        next.splice(dragOver, 0, moved);
        return next;
      });
      setReadyResult(null);
    }
    dragIndex.current = null;
    setDragOver(null);
  };

  const handleConvert = async () => {
    if (files.length === 0) return;
    setStatus({ isProcessing: true, message: 'Converting images to PDF…' });
    setReadyResult(null);

    try {
      const { imagesToPdf, downloadPdf } = await import('../services/pdfService');

      if (mergeAll) {
        // Mode 1: Single combined PDF
        const pdfFilesParam = files.map((f) => ({
          ...f,
          rotation: f.rotation,
        }));
        const rotations = files.map((f) => f.rotation);

        const pdfBytes = await imagesToPdf(pdfFilesParam, {
          pageSize,
          orientation,
          margin,
          rotations,
        });

        const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
        const filename =
          files.length === 1
            ? `${files[0].name.replace(/\.[^/.]+$/, '')}.pdf`
            : 'converted-images.pdf';

        setReadyResult({ blob, name: filename, isZip: false });
        downloadPdf(blob, filename, { autoDownload: true });
        setStatus({ isProcessing: false, message: 'PDF downloaded automatically!', success: true });
      } else {
        // Mode 2: Separate PDFs zipped
        setStatus({ isProcessing: true, message: 'Creating individual PDFs…' });
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();

        for (let i = 0; i < files.length; i++) {
          const item = files[i];
          const singleFileBytes = await imagesToPdf([item], {
            pageSize,
            orientation,
            margin,
            rotations: [item.rotation],
          });
          const baseName = item.name.replace(/\.[^/.]+$/, '');
          zip.file(`${baseName}.pdf`, singleFileBytes);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipName = 'images-pdf-bundle.zip';
        setReadyResult({ blob: zipBlob, name: zipName, isZip: true });
        downloadPdf(zipBlob, zipName, { autoDownload: true });
        setStatus({ isProcessing: false, message: 'ZIP bundle downloaded automatically!', success: true });
      }
    } catch (error) {
      console.error(error);
      setStatus({ isProcessing: false, message: 'Error converting files.', error: 'Failed' });
    }
  };

  const handleDownloadReady = async () => {
    if (!readyResult) return;
    const { downloadPdf } = await import('../services/pdfService');
    downloadPdf(readyResult.blob, readyResult.name, { autoDownload: true });
  };

  return (
    <>
      <Helmet>
        <title>JPG to PDF Online Free | Convert Image to PDF - LAK PDF</title>
        <meta
          name="description"
          content="Convert JPG, PNG and images to PDF online for free. Adjust orientation, margins, and page sizes with full drag-and-drop support."
        />
        <link rel="canonical" href="https://lakpdf.com/img-to-pdf" />
        <meta property="og:title" content="JPG to PDF Online Free - LAK PDF" />
        <meta property="og:description" content="Convert JPG, PNG and images to PDF online for free in seconds." />
        <meta property="og:url" content="https://lakpdf.com/img-to-pdf" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://lakpdf.com/og-image.png" />
      </Helmet>

      {/* Hidden file input for '+' add more button */}
      <input
        type="file"
        ref={fileInputRef}
        multiple
        accept="image/png, image/jpeg, image/jpg, image/webp"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFilesSelected(Array.from(e.target.files));
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        {files.length === 0 ? (
          /* ── Empty State ────────────────────────────────────────── */
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
                JPG to PDF Converter
              </h1>
              <p className="text-base sm:text-lg text-slate-500 max-w-xl mx-auto">
                Convert your images to high-quality PDF in seconds. Rotate, reorder, and adjust margins with full control.
              </p>
            </div>

            <FileUploader
              onFilesSelected={handleFilesSelected}
              accept="image/png, image/jpeg, image/jpg, image/webp"
              icon={<ImageIcon className="w-14 h-14 text-primary-500" />}
              title="Select JPG or PNG images"
              description="or drop images anywhere here"
              helperText="100% in-browser processing • No upload caps"
            />
          </div>
        ) : (
          /* ── iLovePDF Style Split Workspace ────────────────────── */
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_390px] gap-8 items-start">
            {/* ── LEFT COLUMN: Gallery & Page Cards ──────────────── */}
            <div className="relative min-h-[520px] rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-6">
              {/* Floating Action Controls */}
              <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 text-sm sm:text-base">
                    {files.length} Image{files.length !== 1 ? 's' : ''} Loaded
                  </span>
                  <span className="text-xs text-slate-400">
                    (Drag to reorder)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Sort Alphabetical */}
                  <button
                    type="button"
                    onClick={toggleSort}
                    title={`Sort by Name (${sortAsc ? 'A-Z' : 'Z-A'})`}
                    className="flex h-9 items-center gap-1.5 px-3 rounded-full border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-xs transition-all text-xs font-semibold"
                  >
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    <span>{sortAsc ? 'A → Z' : 'Z → A'}</span>
                  </button>

                  {/* Add More Floating Pill */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="relative flex items-center gap-1.5 rounded-full bg-primary-600 hover:bg-primary-700 text-white px-3.5 py-2 text-xs font-bold shadow-md shadow-primary-500/20 transition-all hover:scale-105"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Images</span>
                    <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-900 px-1 text-[10px] font-black text-white ring-2 ring-white">
                      {files.length}
                    </span>
                  </button>
                </div>
              </div>

              {/* Grid of Image Pages */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {files.map((file, index) => (
                  <div
                    key={file.id}
                    draggable
                    onDragStart={() => onDragStart(index)}
                    onDragEnter={() => onDragEnter(index)}
                    onDragEnd={onDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                    className={`group relative flex flex-col rounded-xl border-2 bg-white p-2 transition-all cursor-grab active:cursor-grabbing select-none shadow-xs ${
                      dragOver === index
                        ? 'border-primary-500 shadow-md scale-[1.03]'
                        : 'border-slate-200 hover:border-primary-400 hover:shadow-sm'
                    }`}
                  >
                    {/* Page Number Badge */}
                    <div className="absolute top-3 left-3 z-10 rounded-md bg-slate-900/80 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm backdrop-blur-xs">
                      {index + 1}
                    </div>

                    {/* Card Actions (Rotate / Delete) */}
                    <div className="absolute top-3 right-3 z-10 flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Rotate Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          rotateFile(file.id);
                        }}
                        title="Rotate 90°"
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-white shadow-sm hover:bg-slate-900 transition-transform hover:scale-110"
                      >
                        <RotateCw className="h-3 w-3" />
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(file.id);
                        }}
                        title="Remove image"
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600 transition-transform hover:scale-110"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Preview Canvas Thumbnail Container */}
                    <div
                      className={`relative flex items-center justify-center overflow-hidden rounded-lg bg-slate-100 transition-all ${
                        orientation === 'landscape' ? 'aspect-[4/3]' : 'aspect-[3/4]'
                      } ${
                        margin === 'none'
                          ? 'p-0'
                          : margin === 'small'
                          ? 'p-2.5'
                          : 'p-4'
                      }`}
                    >
                      {/* Simulated page border when margin selected */}
                      {margin !== 'none' && (
                        <div className="absolute inset-2 pointer-events-none rounded border border-dashed border-slate-300" />
                      )}

                      <img
                        src={file.previewUrl}
                        alt={file.name}
                        style={{
                          transform: `rotate(${file.rotation}deg)`,
                          transition: 'transform 0.25s ease-in-out',
                        }}
                        className="max-h-full max-w-full object-contain drop-shadow-xs pointer-events-none"
                        draggable={false}
                      />

                      {/* Hover Info Tooltip (iLovePDF Style) */}
                      <div className="absolute bottom-2 inset-x-2 z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity flex justify-center">
                        <span className="rounded-md bg-slate-900/90 text-[10px] font-bold text-white px-2 py-1 shadow-md whitespace-nowrap">
                          {formatBytes(file.size)} {file.width && file.height ? `· ${file.width}×${file.height}` : ''}
                        </span>
                      </div>
                    </div>

                    {/* File Meta */}
                    <div className="mt-2 px-1">
                      <p className="truncate text-xs font-semibold text-slate-800" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-[10px] text-slate-400 flex items-center justify-between">
                        <span>{formatBytes(file.size)}</span>
                        {file.rotation !== 0 && (
                          <span className="text-primary-600 font-bold">Rotated {file.rotation}°</span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Add More Tile */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white/70 hover:bg-white hover:border-primary-400 text-slate-400 hover:text-primary-600 transition-all group ${
                    orientation === 'landscape' ? 'aspect-[4/3]' : 'aspect-[3/4]'
                  }`}
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 group-hover:bg-primary-50 transition-colors mb-2">
                    <Plus className="h-6 w-6" />
                  </div>
                  <span className="text-xs font-bold">Add more</span>
                </button>
              </div>
            </div>

            {/* ── RIGHT COLUMN: Sticky Settings Sidebar (iLovePDF Style) ── */}
            <div className="sticky top-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-slate-900 tracking-tight pb-4 border-b border-slate-100">
                Image to PDF options
              </h2>

              <div className="mt-6 space-y-6">
                {/* 1. Page Orientation */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5">
                    Page orientation
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Portrait Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setOrientation('portrait');
                        setReadyResult(null);
                      }}
                      className={`flex flex-col items-center justify-center rounded-xl p-3.5 text-center transition-all ${
                        orientation === 'portrait'
                          ? 'border-2 border-[#e5323f] bg-red-50/40 text-slate-900 shadow-xs ring-1 ring-[#e5323f]'
                          : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {/* Vertical Rectangle Icon */}
                      <div
                        className={`mb-2 h-8 w-5.5 rounded-xs border-2 ${
                          orientation === 'portrait'
                            ? 'border-[#e5323f] bg-red-100/60'
                            : 'border-slate-400'
                        }`}
                      />
                      <span className="text-xs font-bold">Portrait</span>
                    </button>

                    {/* Landscape Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setOrientation('landscape');
                        setReadyResult(null);
                      }}
                      className={`flex flex-col items-center justify-center rounded-xl p-3.5 text-center transition-all ${
                        orientation === 'landscape'
                          ? 'border-2 border-[#e5323f] bg-red-50/40 text-slate-900 shadow-xs ring-1 ring-[#e5323f]'
                          : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {/* Horizontal Rectangle Icon */}
                      <div
                        className={`mb-2 h-5.5 w-8 rounded-xs border-2 ${
                          orientation === 'landscape'
                            ? 'border-[#e5323f] bg-red-100/60'
                            : 'border-slate-400'
                        }`}
                      />
                      <span className="text-xs font-bold">Landscape</span>
                    </button>
                  </div>
                </div>

                {/* 2. Page Size */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5">
                    Page size
                  </label>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(e.target.value as PageSize);
                      setReadyResult(null);
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold text-slate-800 shadow-xs outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  >
                    {PAGE_SIZE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Margin Options (3 boxes with icons) */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5">
                    Margin
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {/* No Margin */}
                    <button
                      type="button"
                      onClick={() => {
                        setMargin('none');
                        setReadyResult(null);
                      }}
                      className={`flex flex-col items-center justify-center rounded-xl p-2.5 text-center transition-all ${
                        margin === 'none'
                          ? 'border-2 border-[#e5323f] bg-red-50/40 text-slate-900 shadow-xs'
                          : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div
                        className={`mb-1.5 flex h-7 w-7 items-center justify-center rounded border ${
                          margin === 'none'
                            ? 'border-[#e5323f] bg-red-100/60 text-[#e5323f]'
                            : 'border-slate-300 text-slate-400'
                        }`}
                      >
                        <ImageIcon className="h-4 w-4" />
                      </div>
                      <span className="text-[11px] font-bold leading-tight">No margin</span>
                    </button>

                    {/* Small Margin */}
                    <button
                      type="button"
                      onClick={() => {
                        setMargin('small');
                        setReadyResult(null);
                      }}
                      className={`flex flex-col items-center justify-center rounded-xl p-2.5 text-center transition-all ${
                        margin === 'small'
                          ? 'border-2 border-[#e5323f] bg-red-50/40 text-slate-900 shadow-xs'
                          : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div
                        className={`mb-1.5 flex h-7 w-7 items-center justify-center rounded border border-dashed ${
                          margin === 'small'
                            ? 'border-[#e5323f] bg-red-100/60 text-[#e5323f]'
                            : 'border-slate-400 text-slate-400'
                        }`}
                      >
                        <ImageIcon className="h-3 w-3" />
                      </div>
                      <span className="text-[11px] font-bold leading-tight">Small</span>
                    </button>

                    {/* Big Margin */}
                    <button
                      type="button"
                      onClick={() => {
                        setMargin('big');
                        setReadyResult(null);
                      }}
                      className={`flex flex-col items-center justify-center rounded-xl p-2.5 text-center transition-all ${
                        margin === 'big'
                          ? 'border-2 border-[#e5323f] bg-red-50/40 text-slate-900 shadow-xs'
                          : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div
                        className={`mb-1.5 flex h-7 w-7 items-center justify-center rounded border-2 border-dotted ${
                          margin === 'big'
                            ? 'border-[#e5323f] bg-red-100/60 text-[#e5323f]'
                            : 'border-slate-400 text-slate-400'
                        }`}
                      >
                        <ImageIcon className="h-2.5 w-2.5" />
                      </div>
                      <span className="text-[11px] font-bold leading-tight">Big</span>
                    </button>
                  </div>
                </div>

                {/* 4. Merge All Images Checkbox */}
                <div className="pt-1">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={mergeAll}
                      onChange={(e) => setMergeAll(e.target.checked)}
                      className="h-4.5 w-4.5 rounded border-slate-300 text-[#e5323f] focus:ring-[#e5323f]"
                    />
                    <span className="text-xs font-semibold text-slate-700">
                      Merge all images in one PDF file
                    </span>
                  </label>
                </div>

                {/* 5. Big Red Convert Button */}
                <div className="pt-3">
                  <button
                    type="button"
                    onClick={handleConvert}
                    disabled={status.isProcessing}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#e5323f] hover:bg-[#d4202d] text-white py-4 px-6 text-base font-extrabold shadow-lg shadow-red-500/25 transition-all hover:scale-[1.02] active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
                  >
                    {status.isProcessing ? (
                      <span>Converting...</span>
                    ) : (
                      <>
                        <span>Convert to PDF</span>
                        <ArrowRight className="h-5 w-5" />
                      </>
                    )}
                  </button>
                </div>

                {/* Status Message */}
                {status.message && !readyResult && (
                  <div
                    className={`p-3 rounded-xl text-xs font-semibold text-center ${
                      status.error
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {status.message}
                  </div>
                )}

                {/* Ready Download Card */}
                {readyResult && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 animate-in fade-in">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white">
                        {readyResult.isZip ? (
                          <Archive className="h-4 w-4" />
                        ) : (
                          <FileCheck2 className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          {readyResult.isZip ? 'ZIP Bundle Ready & Downloaded!' : 'PDF Ready & Downloaded!'}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {readyResult.name} · {formatBytes(readyResult.blob.size)}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="md"
                      variant="primary"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                      onClick={handleDownloadReady}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {readyResult.isZip ? 'Download ZIP Again' : 'Download PDF Again'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <ToolSEOContent toolKey="/img-to-pdf" />
      </div>
    </>
  );
};

export default ImageToPdf;
