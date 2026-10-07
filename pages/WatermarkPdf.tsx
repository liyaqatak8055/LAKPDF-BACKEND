import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileUploader } from '../components/FileUploader';
import { Button } from '../components/Button';
import { PdfFile, ProcessingStatus } from '../types';
import { watermarkPdf, downloadPdf, formatBytes, pdfjs, parsePageRange } from '../services/pdfService';
import {
  Type,
  X,
  Image as ImageIcon,
  Check,
  RotateCw,
  LayoutGrid,
  Download,
  Unlock,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Sliders
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { NextStepPanel, RelatedActions, ToolStartPanel } from '../components/ToolProductPanels';
import { Helmet } from 'react-helmet-async';
import { ToolSEOContent } from '../components/ToolSEOContent';

type PageRangeOption = 'all' | 'first' | 'except-first' | 'odd' | 'even' | 'custom';
type FontFamily = 'Helvetica' | 'TimesRoman' | 'Courier';
type FontStyle = 'bold' | 'regular' | 'italic' | 'boldItalic';
type MosaicDensity = 'sparse' | 'normal' | 'dense';

const textPresets = [
  { label: 'CONFIDENTIAL', text: 'CONFIDENTIAL', color: '#DC2626', rotation: 45, opacity: 0.35 },
  { label: 'DRAFT', text: 'DRAFT', color: '#D97706', rotation: 45, opacity: 0.35 },
  { label: 'DO NOT COPY', text: 'DO NOT COPY', color: '#DC2626', rotation: 45, opacity: 0.35 },
  { label: 'SAMPLE', text: 'SAMPLE', color: '#2563EB', rotation: 45, opacity: 0.35 },
  { label: 'APPROVED', text: 'APPROVED', color: '#059669', rotation: 0, opacity: 0.4 },
  { label: 'URGENT', text: 'URGENT', color: '#E11D48', rotation: 45, opacity: 0.4 },
  { label: 'ORIGINAL', text: 'ORIGINAL', color: '#7C3AED', rotation: 0, opacity: 0.35 },
];

const colorPalette = ['#DC2626', '#1F2937', '#2563EB', '#059669', '#6B7280', '#D97706', '#7C3AED', '#000000'];

export const WatermarkPdf: React.FC = () => {
  const [file, setFile] = useState<PdfFile | null>(null);
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'text' | 'image'>('text');

  // Text Options
  const [text, setText] = useState('CONFIDENTIAL');
  const [color, setColor] = useState('#DC2626');
  const [textSize, setTextSize] = useState(55);
  const [fontFamily, setFontFamily] = useState<FontFamily>('Helvetica');
  const [fontStyle, setFontStyle] = useState<FontStyle>('bold');

  // Image Options
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageScale, setImageScale] = useState(50);

  // Layout & Positioning
  const [opacity, setOpacity] = useState(0.35);
  const [rotation, setRotation] = useState(45);
  const [position, setPosition] = useState(5); // 1-9 Grid (5 is center)
  const [isMosaic, setIsMosaic] = useState(false);
  const [mosaicDensity, setMosaicDensity] = useState<MosaicDensity>('normal');

  // Page Scope
  const [pageRange, setPageRange] = useState<PageRangeOption>('all');
  const [customPages, setCustomPages] = useState('');

  // Processing & Output
  const [status, setStatus] = useState<ProcessingStatus>({ isProcessing: false, message: '' });
  const [readyPdf, setReadyPdf] = useState<{ data: Uint8Array; name: string } | null>(null);

  // Live PDF Preview
  const [pdfDocProxy, setPdfDocProxy] = useState<any | null>(null);
  const [previewPage, setPreviewPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  // Load PDF for Live Preview
  useEffect(() => {
    if (!file) {
      setPreviewImg(null);
      setPdfDocProxy(null);
      setTotalPages(1);
      setPreviewPage(1);
      return;
    }

    let isMounted = true;
    const loadDoc = async () => {
      setPreviewLoading(true);
      try {
        const buffer = await file.file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: buffer }).promise;
        if (!isMounted) return;
        setPdfDocProxy(pdf);
        setTotalPages(pdf.numPages);
        setPreviewPage(1);
      } catch (e: any) {
        console.error('Failed to load PDF preview:', e);
      } finally {
        if (isMounted) setPreviewLoading(false);
      }
    };

    loadDoc();
    return () => { isMounted = false; };
  }, [file]);

  // Render current preview page
  useEffect(() => {
    if (!pdfDocProxy) return;
    let isMounted = true;

    const render = async () => {
      setPreviewLoading(true);
      try {
        const page = await pdfDocProxy.getPage(previewPage);
        const viewport = page.getViewport({ scale: 1.1 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport }).promise;
          if (isMounted) {
            setPreviewImg(canvas.toDataURL('image/jpeg', 0.85));
          }
        }
        canvas.width = 0;
        canvas.height = 0;
      } catch (e) {
        console.error('Error rendering page:', e);
      } finally {
        if (isMounted) setPreviewLoading(false);
      }
    };

    render();
    return () => { isMounted = false; };
  }, [pdfDocProxy, previewPage]);

  const handleFileSelected = (selectedFiles: File[]) => {
    if (selectedFiles.length > 0) {
      setFile({
        id: uuidv4(),
        file: selectedFiles[0],
        name: selectedFiles[0].name,
        size: selectedFiles[0].size,
      });
      setReadyPdf(null);
    }
  };

  const handleImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const img = e.target.files[0];
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImageFile(img);
      setImagePreview(URL.createObjectURL(img));
    }
  };

  const applyPreset = (preset: typeof textPresets[0]) => {
    setText(preset.text);
    setColor(preset.color);
    setRotation(preset.rotation);
    setOpacity(preset.opacity);
  };

  const insertTag = (tag: string) => {
    setText((prev) => (prev ? `${prev} ${tag}` : tag));
  };

  const handleProcess = async () => {
    if (!file) return;
    if (activeTab === 'text' && !text.trim()) return;
    if (activeTab === 'image' && !imageFile) return;

    setStatus({ isProcessing: true, message: 'Applying vector watermark...' });

    try {
      let imageBytes: ArrayBuffer | undefined;
      let imageType: 'png' | 'jpg' | undefined;

      if (activeTab === 'image' && imageFile) {
        imageBytes = await imageFile.arrayBuffer();
        imageType = imageFile.type.includes('png') ? 'png' : 'jpg';
      }

      const watermarkedBytes = await watermarkPdf(file.file, {
        type: activeTab,
        text,
        color,
        size: activeTab === 'text' ? textSize : imageScale,
        imageBytes,
        imageType,
        opacity,
        position,
        isMosaic,
        mosaicDensity,
        rotation,
        fontFamily,
        fontStyle,
        pageRange,
        customPages: pageRange === 'custom' ? customPages : undefined,
      });

      const outputName = `watermarked-${file.name}`;
      setReadyPdf({ data: watermarkedBytes, name: outputName });
      downloadPdf(watermarkedBytes, outputName, { autoDownload: false });
      setStatus({ isProcessing: false, message: 'Watermark applied! Vector crispness preserved.', success: true });
    } catch (error: any) {
      console.error(error);
      const errMsg = (error?.message || '').toLowerCase();
      const isPassword = errMsg.includes('password') || errMsg.includes('encrypt');
      setStatus({
        isProcessing: false,
        message: isPassword ? 'This PDF is password-protected. Unlock it before adding watermarks.' : 'Error processing file.',
        error: isPassword ? 'password_protected' : 'Failed'
      });
    }
  };

  const handleDownloadReady = () => {
    if (!readyPdf) return;
    downloadPdf(readyPdf.data, readyPdf.name, { autoDownload: true });
  };

  // Helper for dynamic preview text
  const getDisplayWatermarkText = () => {
    const today = new Date().toISOString().slice(0, 10);
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const cleanName = file?.name ? file.name.replace(/\.pdf$/i, '') : 'Document';
    return (text || 'Watermark')
      .replace(/{PAGE}/gi, String(previewPage))
      .replace(/{TOTAL}/gi, String(totalPages))
      .replace(/{DATE}/gi, today)
      .replace(/{TIME}/gi, time)
      .replace(/{FILENAME}/gi, cleanName);
  };

  // Check if current preview page is in target range
  const isCurrentPageWatermarked = () => {
    if (pageRange === 'all') return true;
    if (pageRange === 'first') return previewPage === 1;
    if (pageRange === 'except-first') return previewPage > 1;
    if (pageRange === 'odd') return previewPage % 2 !== 0;
    if (pageRange === 'even') return previewPage % 2 === 0;
    if (pageRange === 'custom' && customPages) {
      const parsed = parsePageRange(customPages, totalPages);
      return !parsed.error && (parsed.pages.length === 0 || parsed.pages.includes(previewPage - 1));
    }
    return true;
  };

  return (
    <>
      <Helmet>
        <title>Watermark PDF Online Free | Add Text & Image Watermark - LAK PDF</title>
        <meta name="description" content="Add text and logo watermarks to PDF documents online with true vector font fidelity and zero cloud uploads." />
        <link rel="canonical" href="https://lakpdf.com/watermark" />
        <meta property="og:title" content="Watermark PDF Online Free | Add Text & Image Watermark - LAK PDF" />
        <meta property="og:description" content="Add text and logo watermarks to PDF documents online with true vector font fidelity and zero cloud uploads." />
        <meta property="og:url" content="https://lakpdf.com/watermark" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://lakpdf.com/og-image.png" />
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 mb-3">
            <ShieldCheck size={14} /> 100% Vector Stamping &bull; No Page Rasterization
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-3">Watermark PDF</h1>
          <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
            Stamp security text or brand logos over your PDF with precision positioning, live document preview, and client-side privacy.
          </p>
        </div>

        {!file ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <FileUploader
              onFilesSelected={handleFileSelected}
              multiple={false}
              icon={<Type className="w-12 h-12 text-red-500" />}
              title="Select PDF file"
              description="Drop your PDF here to add text or image watermark"
              helperText="Runs 100% locally in your browser"
            />
            <ToolStartPanel
              supportedFormats={['PDF documents', 'PNG transparent logos', 'JPG stamps']}
              fileSizeNote="Zero cloud upload. Processed safely in local browser memory with vector preservation."
              privacyNote="Your files never leave your computer."
              workflowSteps={[
                'Upload your PDF document.',
                'Customize watermark text, fonts, colors, or logo.',
                'Inspect live real-page preview and download.',
              ]}
            />
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* Options Sidebar */}
            <div className="w-full lg:w-[420px] shrink-0 space-y-6">
              {/* File Info Card */}
              <div className="bg-white dark:bg-dark-surface p-4 rounded-xl border border-slate-200 dark:border-dark-border flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-950/60 text-red-500 font-bold rounded flex items-center justify-center shrink-0">
                    PDF
                  </div>
                  <div className="truncate">
                    <p className="font-medium text-slate-700 dark:text-slate-200 text-sm truncate">{file.name}</p>
                    <p className="text-xs text-slate-400">{formatBytes(file.size)} &bull; {totalPages} {totalPages === 1 ? 'page' : 'pages'}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setFile(null); setReadyPdf(null); }}
                  className="text-slate-400 hover:text-red-500 cursor-pointer p-1"
                  title="Remove file"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Main Controls Card */}
              <div className="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-slate-200 dark:border-dark-border overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b border-slate-200 dark:border-dark-border">
                  <button
                    className={`flex-1 py-3.5 flex items-center justify-center gap-2 text-sm font-semibold transition-colors cursor-pointer ${
                      activeTab === 'text'
                        ? 'bg-white dark:bg-dark-surface text-red-600 border-b-2 border-red-600'
                        : 'bg-slate-50 dark:bg-dark-bg text-slate-500 hover:bg-slate-100 dark:hover:bg-dark-hover'
                    }`}
                    onClick={() => setActiveTab('text')}
                  >
                    <Type size={18} />
                    Text Watermark
                  </button>
                  <button
                    className={`flex-1 py-3.5 flex items-center justify-center gap-2 text-sm font-semibold transition-colors cursor-pointer ${
                      activeTab === 'image'
                        ? 'bg-white dark:bg-dark-surface text-red-600 border-b-2 border-red-600'
                        : 'bg-slate-50 dark:bg-dark-bg text-slate-500 hover:bg-slate-100 dark:hover:bg-dark-hover'
                    }`}
                    onClick={() => setActiveTab('image')}
                  >
                    <ImageIcon size={18} />
                    Logo / Image
                  </button>
                </div>

                <div className="p-5 space-y-5">
                  {/* TEXT TAB CONTROLS */}
                  {activeTab === 'text' ? (
                    <div className="space-y-4">
                      {/* Quick Presets */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <Sparkles size={13} className="text-amber-500" /> Quick Presets
                          </label>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {textPresets.map((preset) => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => applyPreset(preset)}
                              className={`px-2.5 py-1 text-xs rounded-lg font-medium border transition-all ${
                                text === preset.text
                                  ? 'bg-red-50 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-300'
                                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-dark-bg dark:text-slate-300 border-slate-200 dark:border-dark-border'
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Text Input & Dynamic Tags */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Watermark Text
                        </label>
                        <textarea
                          rows={2}
                          value={text}
                          onChange={(e) => setText(e.target.value)}
                          placeholder="e.g. CONFIDENTIAL"
                          className="w-full px-3 py-2 border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-surface text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm resize-none"
                        />
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span className="text-[11px] text-slate-400 font-medium">Insert tag:</span>
                          {[
                            { tag: '{PAGE}', tip: 'Current Page Number' },
                            { tag: '{TOTAL}', tip: 'Total Document Pages' },
                            { tag: '{DATE}', tip: 'Today Date (YYYY-MM-DD)' },
                            { tag: '{FILENAME}', tip: 'Original File Name' },
                          ].map((t) => (
                            <button
                              key={t.tag}
                              type="button"
                              onClick={() => insertTag(t.tag)}
                              title={t.tip}
                              className="px-1.5 py-0.5 text-[11px] bg-slate-100 hover:bg-slate-200 dark:bg-dark-bg dark:hover:bg-dark-border text-slate-600 dark:text-slate-300 rounded font-mono border border-slate-200 dark:border-dark-border"
                            >
                              +{t.tag}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Font Family & Style */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Font Family</label>
                          <select
                            value={fontFamily}
                            onChange={(e) => setFontFamily(e.target.value as FontFamily)}
                            className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-surface text-slate-900 dark:text-white rounded-lg text-xs outline-none focus:ring-1 focus:ring-red-500"
                          >
                            <option value="Helvetica">Helvetica (Clean Sans)</option>
                            <option value="TimesRoman">Times New Roman (Serif)</option>
                            <option value="Courier">Courier (Monospace)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Font Style</label>
                          <select
                            value={fontStyle}
                            onChange={(e) => setFontStyle(e.target.value as FontStyle)}
                            className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-surface text-slate-900 dark:text-white rounded-lg text-xs outline-none focus:ring-1 focus:ring-red-500"
                          >
                            <option value="bold">Bold</option>
                            <option value="regular">Regular</option>
                            <option value="italic">Italic</option>
                            <option value="boldItalic">Bold Italic</option>
                          </select>
                        </div>
                      </div>

                      {/* Font Size & Color */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Size</label>
                            <span className="text-xs font-mono text-slate-500">{textSize} pt</span>
                          </div>
                          <input
                            type="range"
                            min="16"
                            max="110"
                            step="1"
                            value={textSize}
                            onChange={(e) => setTextSize(Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-200 dark:bg-dark-border rounded-lg appearance-none cursor-pointer accent-red-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Color</label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={color}
                              onChange={(e) => setColor(e.target.value)}
                              className="h-8 w-8 p-0 border border-slate-300 dark:border-dark-border rounded cursor-pointer"
                            />
                            <div className="flex-1 flex gap-1 overflow-x-auto py-0.5">
                              {colorPalette.slice(0, 5).map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => setColor(c)}
                                  style={{ backgroundColor: c }}
                                  className={`w-6 h-6 rounded-md border shrink-0 transition-transform ${
                                    color.toLowerCase() === c.toLowerCase() ? 'scale-110 border-white ring-2 ring-red-500' : 'border-slate-300'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* IMAGE TAB CONTROLS */
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Upload Watermark Logo (PNG/JPG)
                        </label>
                        {imagePreview ? (
                          <div className="relative aspect-video bg-slate-100 dark:bg-dark-bg rounded-lg overflow-hidden border border-slate-200 dark:border-dark-border group flex items-center justify-center p-3">
                            <img src={imagePreview} className="max-h-full max-w-full object-contain" alt="Watermark preview" />
                            <button
                              onClick={() => {
                                if (imagePreview) URL.revokeObjectURL(imagePreview);
                                setImageFile(null);
                                setImagePreview(null);
                              }}
                              className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-md"
                              title="Remove image"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-slate-300 dark:border-dark-border rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-dark-hover transition-colors">
                            <ImageIcon className="text-slate-400 mb-2" size={28} />
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Click to upload stamp image</span>
                            <span className="text-[11px] text-slate-400 mt-0.5">Transparent PNG recommended</span>
                            <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleImageSelected} />
                          </label>
                        )}
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Scale</label>
                          <span className="text-xs font-mono text-slate-500">{imageScale}%</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          value={imageScale}
                          onChange={(e) => setImageScale(Number(e.target.value))}
                          className="w-full h-1.5 bg-slate-200 dark:bg-dark-border rounded-lg appearance-none cursor-pointer accent-red-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* POSITIONING & LAYOUT SECTION */}
                  <div className="border-t border-slate-100 dark:border-dark-border pt-4 space-y-4">
                    <div className="flex gap-4">
                      {/* 9-Grid Position Selector */}
                      <div className="w-24 shrink-0">
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Position</label>
                        <div className={`grid grid-cols-3 gap-1 ${isMosaic ? 'opacity-30 pointer-events-none' : ''}`}>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => { setPosition(i); setIsMosaic(false); }}
                              className={`w-full aspect-square border rounded-md transition-all flex items-center justify-center cursor-pointer ${
                                position === i && !isMosaic
                                  ? 'bg-red-500 border-red-500 text-white'
                                  : 'bg-white dark:bg-dark-surface border-slate-200 dark:border-dark-border hover:bg-slate-50 dark:hover:bg-dark-hover'
                              }`}
                            >
                              {position === i && !isMosaic && <div className="w-2 h-2 bg-white rounded-full" />}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Mosaic & Rotation */}
                      <div className="flex-1 space-y-3">
                        <label className="flex items-center gap-2.5 cursor-pointer p-2.5 border border-slate-200 dark:border-dark-border rounded-lg hover:bg-slate-50 dark:hover:bg-dark-hover transition-colors">
                          <div className={`w-4 h-4 border rounded flex items-center justify-center ${isMosaic ? 'bg-red-500 border-red-500' : 'border-slate-300 dark:border-dark-border'}`}>
                            {isMosaic && <Check size={12} className="text-white" />}
                          </div>
                          <input type="checkbox" checked={isMosaic} onChange={(e) => setIsMosaic(e.target.checked)} className="hidden" />
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                            <LayoutGrid size={15} /> Repeated Mosaic Grid
                          </div>
                        </label>

                        {isMosaic ? (
                          <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Density</label>
                            <div className="grid grid-cols-3 gap-1">
                              {(['sparse', 'normal', 'dense'] as MosaicDensity[]).map((d) => (
                                <button
                                  key={d}
                                  type="button"
                                  onClick={() => setMosaicDensity(d)}
                                  className={`py-1 text-xs capitalize rounded border text-center ${
                                    mosaicDensity === d
                                      ? 'bg-red-50 dark:bg-red-950/40 border-red-500 text-red-600 font-semibold'
                                      : 'border-slate-200 dark:border-dark-border text-slate-600'
                                  }`}
                                >
                                  {d}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Rotation</label>
                            <div className="flex items-center gap-1.5 border border-slate-300 dark:border-dark-border rounded-lg px-2.5 py-1.5 bg-white dark:bg-dark-surface">
                              <RotateCw size={14} className="text-slate-400" />
                              <select
                                value={rotation}
                                onChange={(e) => setRotation(Number(e.target.value))}
                                className="bg-transparent w-full outline-none text-xs text-slate-700 dark:text-slate-200"
                              >
                                <option value={0}>0&deg; (Horizontal)</option>
                                <option value={45}>45&deg; (Diagonal Up)</option>
                                <option value={-45}>-45&deg; (Diagonal Down)</option>
                                <option value={90}>90&deg; (Vertical Up)</option>
                                <option value={-90}>-90&deg; (Vertical Down)</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Transparency Slider */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Opacity / Transparency</label>
                        <span className="text-xs font-mono text-slate-500">{Math.round(opacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.05"
                        max="1"
                        step="0.05"
                        value={opacity}
                        onChange={(e) => setOpacity(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 dark:bg-dark-border rounded-lg appearance-none cursor-pointer accent-red-500"
                      />
                    </div>

                    {/* Page Range Selector */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Apply to Pages</label>
                      <select
                        value={pageRange}
                        onChange={(e) => setPageRange(e.target.value as PageRangeOption)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-surface text-slate-900 dark:text-white rounded-lg text-xs outline-none focus:ring-1 focus:ring-red-500"
                      >
                        <option value="all">All Pages ({totalPages})</option>
                        <option value="first">First Page Only</option>
                        <option value="except-first">Exclude Cover Page (From Page 2)</option>
                        <option value="odd">Odd Pages Only</option>
                        <option value="even">Even Pages Only</option>
                        <option value="custom">Custom Page Range...</option>
                      </select>

                      {pageRange === 'custom' && (
                        <div className="mt-2">
                          <input
                            type="text"
                            value={customPages}
                            onChange={(e) => setCustomPages(e.target.value)}
                            placeholder="e.g. 1, 3-5, 8"
                            className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-surface text-slate-900 dark:text-white rounded-lg text-xs outline-none"
                          />
                          <p className="text-[11px] text-slate-400 mt-0.5">Comma-separated pages or ranges (e.g. 1, 3-5)</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ACTION BUTTON */}
                  {readyPdf ? (
                    <Button variant="primary" size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700 shadow-md" onClick={handleDownloadReady}>
                      <Download className="w-5 h-5 mr-2" />
                      Download Watermarked PDF
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full bg-red-600 hover:bg-red-700 shadow-md"
                      onClick={handleProcess}
                      isLoading={status.isProcessing}
                      disabled={(activeTab === 'text' && !text.trim()) || (activeTab === 'image' && !imageFile)}
                    >
                      {status.isProcessing ? 'Applying Watermark...' : 'Apply Vector Watermark'}
                    </Button>
                  )}

                  {/* Status Banner */}
                  {status.message && (
                    <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                      status.error
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : status.success
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-50 text-slate-600 border border-slate-200'
                    }`}>
                      {status.error ? <AlertCircle className="w-4 h-4 shrink-0" /> : status.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : null}
                      <span>{status.message}</span>
                    </div>
                  )}

                  {status.error === 'password_protected' && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
                      <Unlock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-amber-900">Protected PDF Detected</p>
                        <p className="text-[11px] text-amber-700 mt-0.5">This document has password encryption. Unlock it before applying watermarks.</p>
                        <Link
                          to="/unlock-pdf"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 mt-1.5 underline"
                        >
                          Go to Unlock PDF tool &rarr;
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <RelatedActions
                actions={[
                  { label: 'Add page numbers', to: '/page-number' },
                  { label: 'Protect PDF with Password', to: '/protect' },
                  { label: 'Sign PDF Document', to: '/sign-pdf' },
                ]}
              />
            </div>

            {/* LIVE DOCUMENT PREVIEW AREA */}
            <div className="flex-1 w-full flex flex-col items-center">
              <div className="w-full bg-slate-100 dark:bg-dark-bg/60 rounded-xl border border-slate-200 dark:border-dark-border p-4 sm:p-6 flex flex-col items-center">
                {/* Preview Header & Page Switcher */}
                <div className="w-full max-w-lg flex items-center justify-between mb-4 px-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Live Document Preview
                    </span>
                    {!isCurrentPageWatermarked() && (
                      <span className="text-[11px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-medium">
                        Page excluded by range
                      </span>
                    )}
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-1.5 bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-lg px-2 py-1 shadow-sm">
                      <button
                        onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                        disabled={previewPage <= 1}
                        className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                        title="Previous page"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 px-1 font-mono">
                        {previewPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => setPreviewPage((p) => Math.min(totalPages, p + 1))}
                        disabled={previewPage >= totalPages}
                        className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                        title="Next page"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </div>

                {/* PDF Page Canvas with Live Watermark Overlay */}
                <div className="relative w-full max-w-lg aspect-[1/1.414] bg-white dark:bg-dark-surface shadow-xl rounded-lg border border-slate-300 dark:border-dark-border overflow-hidden flex items-center justify-center">
                  {previewLoading && (
                    <div className="absolute inset-0 bg-white/70 dark:bg-dark-surface/70 z-20 flex items-center justify-center backdrop-blur-xs">
                      <span className="text-xs font-medium text-slate-500 animate-pulse">Rendering preview...</span>
                    </div>
                  )}

                  {/* Actual Rendered PDF Page */}
                  {previewImg ? (
                    <img
                      src={previewImg}
                      alt={`PDF Page ${previewPage}`}
                      className="w-full h-full object-contain pointer-events-none select-none"
                    />
                  ) : (
                    <div className="text-center p-8 text-slate-400">
                      <p className="text-sm">Loading document...</p>
                    </div>
                  )}

                  {/* Live Watermark Overlay (Only if page is included in range) */}
                  {isCurrentPageWatermarked() && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                      {isMosaic ? (
                        /* Repeating Mosaic Grid */
                        <div
                          className="w-full h-full grid p-4"
                          style={{
                            gridTemplateColumns: mosaicDensity === 'dense' ? 'repeat(4, 1fr)' : mosaicDensity === 'sparse' ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
                            gridTemplateRows: mosaicDensity === 'dense' ? 'repeat(6, 1fr)' : mosaicDensity === 'sparse' ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)',
                          }}
                        >
                          {Array.from({ length: mosaicDensity === 'dense' ? 24 : mosaicDensity === 'sparse' ? 6 : 12 }).map((_, i) => (
                            <div key={i} className="flex items-center justify-center p-1">
                              {activeTab === 'text' ? (
                                <span
                                  style={{
                                    transform: `rotate(${rotation}deg)`,
                                    transformOrigin: 'center center',
                                    opacity,
                                    color,
                                    fontSize: `${Math.round(textSize * (mosaicDensity === 'dense' ? 0.22 : 0.28))}px`,
                                    fontFamily: fontFamily === 'TimesRoman' ? 'Times New Roman, serif' : fontFamily === 'Courier' ? 'Courier New, monospace' : 'Inter, sans-serif',
                                    fontWeight: fontStyle.includes('bold') ? 700 : 400,
                                    fontStyle: fontStyle.includes('italic') ? 'italic' : 'normal',
                                    whiteSpace: 'nowrap',
                                    lineHeight: 1.2,
                                  }}
                                >
                                  {getDisplayWatermarkText()}
                                </span>
                              ) : imagePreview ? (
                                <img
                                  src={imagePreview}
                                  alt="stamp"
                                  style={{
                                    width: `${Math.round(imageScale * 0.7)}px`,
                                    opacity,
                                    transform: `rotate(${rotation}deg)`,
                                  }}
                                />
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : (
                        /* Single Grid Position */
                        <div
                          className={`w-full h-full p-8 flex ${
                            [1, 2, 3].includes(position) ? 'items-start' : [4, 5, 6].includes(position) ? 'items-center' : 'items-end'
                          } ${
                            [1, 4, 7].includes(position) ? 'justify-start' : [2, 5, 8].includes(position) ? 'justify-center' : 'justify-end'
                          }`}
                        >
                          {activeTab === 'text' ? (
                            <div
                              style={{
                                transform: `rotate(${rotation}deg)`,
                                transformOrigin: 'center center',
                                opacity,
                                color,
                                fontSize: `${Math.round(textSize * 0.45)}px`,
                                fontFamily: fontFamily === 'TimesRoman' ? 'Times New Roman, serif' : fontFamily === 'Courier' ? 'Courier New, monospace' : 'Inter, sans-serif',
                                fontWeight: fontStyle.includes('bold') ? 700 : 400,
                                fontStyle: fontStyle.includes('italic') ? 'italic' : 'normal',
                                textAlign: 'center',
                                lineHeight: 1.25,
                                whiteSpace: 'pre-wrap',
                              }}
                            >
                              {getDisplayWatermarkText()}
                            </div>
                          ) : imagePreview ? (
                            <img
                              src={imagePreview}
                              alt="stamp"
                              style={{
                                width: `${Math.round(imageScale * 1.8)}px`,
                                opacity,
                                transform: `rotate(${rotation}deg)`,
                                transformOrigin: 'center center',
                              }}
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center p-3 border border-dashed border-slate-300 rounded text-slate-400 bg-white/50">
                              <ImageIcon size={20} />
                              <span className="text-[11px] mt-1">Upload an image</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Vector Guarantee Footer Note */}
                <div className="mt-4 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 size={13} className="text-emerald-500" /> Vector streams preserved
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 size={13} className="text-emerald-500" /> Searchable text intact
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 size={13} className="text-emerald-500" /> 100% Client-side
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <ToolSEOContent toolKey="/watermark" />
      </div>
    </>
  );
};
