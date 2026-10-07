import React, { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  Presentation,
  Upload,
  Download,
  Plus,
  Trash2,
  RotateCw,
  ArrowUp,
  ArrowDown,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Sliders,
  Maximize2,
  FileImage,
  FileText,
  Layers,
  Palette,
  RefreshCw,
  LayoutGrid,
  Briefcase,
  GraduationCap,
  Camera,
  Building2,
  Lightbulb,
  Unlock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import {
  convertImagesToPowerPoint,
  ImageInputItem,
  ImageToPptOptions
} from '../services/officeService';
import { formatBytes } from '../services/fileHelpers';
import { ToolSEOContent } from '../components/ToolSEOContent';
import { trackEvent } from '../utils/analytics';
import { pdfjs } from '../services/pdfService';

interface ImageCardItem extends ImageInputItem {
  id: string;
  file?: File;
  previewUrl: string;
  size: number;
  sourceType?: 'image' | 'pdf';
  pageNumber?: number;
}

export const MakePpt: React.FC = () => {
  const [items, setItems] = useState<ImageCardItem[]>([]);
  const [layout, setLayout] = useState<'auto' | 'portrait' | 'wide' | 'standard'>('auto');
  const [imagesPerSlide, setImagesPerSlide] = useState<1 | 2 | 4>(1);
  const [backgroundColor, setBackgroundColor] = useState<string>('FFFFFF');
  const [margin, setMargin] = useState<'none' | 'small' | 'medium'>('none');
  const [includeTitles, setIncludeTitles] = useState<boolean>(false);

  const [isExtractingPdf, setIsExtractingPdf] = useState<boolean>(false);
  const [extractingStatus, setExtractingStatus] = useState<{ current: number; total: number; fileName: string }>({
    current: 0,
    total: 0,
    fileName: ''
  });

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressText, setProgressText] = useState<string>('');

  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultFileName, setResultFileName] = useState<string>('presentation.pptx');
  const [errorStatus, setErrorStatus] = useState<{ message: string; isPassword?: boolean } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      items.forEach((it) => {
        if (it.previewUrl && it.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(it.previewUrl);
        }
      });
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, []);

  // Handle file selections (both images and PDF documents)
  const handleFiles = async (fileList: FileList | File[]) => {
    const validFiles: File[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const isImg = file.type.startsWith('image/');
      if (isPdf || isImg) {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) {
      alert('Please upload PDF documents or image files (JPG, PNG, WEBP, etc.)');
      return;
    }

    const pdfFiles = validFiles.filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    const imageFiles = validFiles.filter(
      (f) => f.type.startsWith('image/') && !f.name.toLowerCase().endsWith('.pdf')
    );

    // Reset results if adding more files
    if (resultBlob) {
      setResultBlob(null);
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      setResultUrl(null);
    }

    // 1. Process Images
    if (imageFiles.length > 0) {
      imageFiles.forEach((file) => {
        const previewUrl = URL.createObjectURL(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = (e.target?.result as string) || previewUrl;
          const img = new Image();
          img.onload = () => {
            const newItem: ImageCardItem = {
              id: Math.random().toString(36).substring(2, 9),
              file,
              name: file.name,
              size: file.size,
              dataUrl,
              previewUrl,
              width: img.naturalWidth,
              height: img.naturalHeight,
              rotation: 0,
              title: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
              sourceType: 'image'
            };
            setItems((prev) => [...prev, newItem]);
          };
          img.src = dataUrl;
        };
        reader.readAsDataURL(file);
      });
    }

    // 2. Process PDFs
    if (pdfFiles.length > 0) {
      setIsExtractingPdf(true);
      try {
        for (const pdfFile of pdfFiles) {
          setExtractingStatus({
            current: 0,
            total: 0,
            fileName: pdfFile.name
          });

          const arrayBuffer = await pdfFile.arrayBuffer();
          const pdfDoc = await pdfjs.getDocument({ data: arrayBuffer }).promise;
          const totalPages = pdfDoc.numPages;
          const baseName = pdfFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

          const fileExtractedItems: ImageCardItem[] = [];
          for (let p = 1; p <= totalPages; p++) {
            setExtractingStatus({
              current: p,
              total: totalPages,
              fileName: pdfFile.name
            });

            const page = await pdfDoc.getPage(p);
            const isMobile = typeof window !== 'undefined' && (window.innerWidth < 768 || /iphone|ipad|ipod|android/i.test(navigator.userAgent));
            const scale = isMobile ? 1.4 : 2.0;
            const viewport = page.getViewport({ scale });
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.floor(viewport.width));
            canvas.height = Math.max(1, Math.floor(viewport.height));
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              await page.render({ canvasContext: ctx, viewport }).promise;
              const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
              const approxSize = Math.round(dataUrl.length * 0.75);

              const newItem: ImageCardItem = {
                id: Math.random().toString(36).substring(2, 9) + `-${p}`,
                file: pdfFile,
                name: `${pdfFile.name} (Page ${p})`,
                size: approxSize,
                dataUrl,
                previewUrl: dataUrl,
                width: canvas.width,
                height: canvas.height,
                rotation: 0,
                title: `${baseName} - Slide ${p}`,
                sourceType: 'pdf',
                pageNumber: p
              };
              canvas.width = 0;
              canvas.height = 0;
              fileExtractedItems.push(newItem);

              // Batch render updates every 5 pages or on final page for snappy performance
              if (fileExtractedItems.length >= 5 || p === totalPages) {
                const chunkToAdd = [...fileExtractedItems];
                fileExtractedItems.length = 0;
                setItems((prev) => [...prev, ...chunkToAdd]);
              }
            }
            page.cleanup();
          }
        }
      } catch (err: any) {
        console.error('PDF extraction error:', err);
        const isPassword = err?.name === 'PasswordException' || (err?.message || '').toLowerCase().includes('password') || (err?.message || '').toLowerCase().includes('encrypt');
        const errMsg = isPassword
          ? 'This PDF is password-protected. Unlock it first to convert pages to PowerPoint slides.'
          : (err?.message || 'Could not load PDF document.');
        setErrorStatus({ message: errMsg, isPassword });
      } finally {
        setIsExtractingPdf(false);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Reorder items
  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;
    setItems(newItems);
  };

  // Rotate item 90 degrees
  const rotateItem = (index: number) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        rotation: ((next[index].rotation || 0) + 90) % 360
      };
      return next;
    });
  };

  // Remove single item
  const removeItem = (id: string) => {
    setItems((prev) => {
      const item = prev.find((it) => it.id === id);
      if (item?.previewUrl && item.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((it) => it.id !== id);
    });
  };

  // Clear all
  const clearAll = () => {
    items.forEach((it) => {
      if (it.previewUrl && it.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(it.previewUrl);
      }
    });
    setItems([]);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultBlob(null);
    setResultUrl(null);
  };

  // Update title
  const updateTitle = (id: string, newTitle: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, title: newTitle } : it))
    );
  };

  // Generate PowerPoint
  const handleGeneratePpt = async () => {
    if (items.length === 0) return;

    setIsProcessing(true);
    setProgressPercent(10);
    setProgressText('Preparing slides & calculating aspect ratios...');

    try {
      const options: ImageToPptOptions = {
        layout,
        imagesPerSlide,
        backgroundColor,
        margin,
        includeTitles,
        onProgress: (current, total) => {
          const pct = Math.min(95, Math.round((current / total) * 90));
          setProgressPercent(pct);
          setProgressText(`Creating slide ${current} of ${total}...`);
        }
      };

      const inputItems: ImageInputItem[] = items.map((it) => ({
        dataUrl: it.dataUrl,
        name: it.name,
        width: it.width,
        height: it.height,
        rotation: it.rotation,
        title: it.title
      }));

      const blob = await convertImagesToPowerPoint(inputItems, options);
      const url = URL.createObjectURL(blob);
      const firstItem = items[0];
      const baseName = firstItem?.file?.name
        ? firstItem.file.name.replace(/\.[^/.]+$/, '')
        : (firstItem?.name ? firstItem.name.replace(/\.[^/.]+$/, '') : 'presentation');

      setResultBlob(blob);
      setResultUrl(url);
      setResultFileName(`${baseName}-lakpdf.pptx`);
      setProgressPercent(100);
      setProgressText('Presentation Ready!');

      trackEvent({
        category: 'MakePpt',
        action: 'convert_success',
        label: `${items.length}_slides_${layout}`,
      });
    } catch (err: any) {
      console.error('Make PPT error:', err);
      alert(err.message || 'Failed to generate PowerPoint presentation. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Download PPT
  const handleDownload = () => {
    if (!resultUrl) return;
    const link = document.createElement('a');
    link.href = resultUrl;
    link.download = resultFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    trackEvent({
      category: 'MakePpt',
      action: 'download_pptx',
      label: resultFileName,
    });
  };

  const totalSlides = Math.ceil(items.length / imagesPerSlide);
  const pdfCount = items.filter((it) => it.sourceType === 'pdf').length;
  const imgCount = items.filter((it) => it.sourceType !== 'pdf').length;

  return (
    <>
      <Helmet>
        <title>Make PPT Online Free | PDF & Images to PowerPoint Converter - LAK PDF</title>
        <meta
          name="description"
          content="Convert PDF documents, JPG, PNG, WEBP and photos to PowerPoint (.pptx) online free. Smart aspect ratio prevents stretching. Custom 16:9 widescreen or 4:3 layouts. 100% private."
        />
        <meta
          name="keywords"
          content="pdf to ppt, make ppt online free, pdf to powerpoint converter, images to ppt converter, convert jpg to powerpoint, photo to pptx, png to ppt converter, photo slideshow ppt, create powerpoint from images, picture to presentation"
        />
        <link rel="canonical" href="https://lakpdf.com/make-ppt" />
        <meta property="og:title" content="Make PPT Online Free | PDF & Images to PowerPoint Converter - LAK PDF" />
        <meta
          property="og:description"
          content="Turn PDF documents, JPG, PNG, and photos into neatly formatted PowerPoint slides (.pptx). Smart aspect-ratio auto-fit, multiple images per slide, 100% free and client-side."
        />
        <meta property="og:url" content="https://lakpdf.com/make-ppt" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="LAKPDF" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Make PPT Online Free | PDF & Images to PowerPoint Converter - LAK PDF" />
        <meta
          name="twitter:description"
          content="Convert PDF documents and photos to PowerPoint slides (.pptx) with smart aspect ratio auto-fit. No distortion, 16:9 and 4:3 layouts, 100% free."
        />
        {/* BreadcrumbList Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://lakpdf.com/' },
              { '@type': 'ListItem', position: 2, name: 'Tools', item: 'https://lakpdf.com/tools' },
              { '@type': 'ListItem', position: 3, name: 'Make PPT', item: 'https://lakpdf.com/make-ppt' },
            ],
          })}
        </script>
        {/* SoftwareApplication Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'LAK PDF Make PPT Converter',
            url: 'https://lakpdf.com/make-ppt',
            applicationCategory: 'MultimediaApplication',
            operatingSystem: 'Web, Windows, macOS, Android, iOS',
            browserRequirements: 'Requires JavaScript. Requires HTML5.',
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'USD',
            },
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: '4.9',
              ratingCount: '1580',
              bestRating: '5',
              worstRating: '1',
            },
            description:
              'Convert PDF documents and images into professional PowerPoint presentations online for free with smart aspect-ratio auto-fit.',
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-slate-50 dark:bg-dark-bg text-slate-800 dark:text-dark-text-primary py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900 text-orange-600 dark:text-orange-400 text-xs sm:text-sm font-semibold mb-3 shadow-sm">
              <Presentation className="w-4 h-4 text-orange-500 animate-pulse" />
              <span>PDF & Images to PowerPoint • 16:9 HD & 4:3 PPTX</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-3">
              Make <span className="text-orange-500">PowerPoint PPT</span> from PDF & Images
            </h1>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Apni PDF document ya photos ko professionally formatted PowerPoint (.pptx) presentation me convert karein.
              Har page aur photo bina khinche (smart aspect ratio maintain karke) slide me perfectly fit aur center hogi.
            </p>
          </div>

          {errorStatus && (
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-start gap-3">
              <Unlock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  {errorStatus.isPassword ? 'Password-Protected PDF Detected' : 'Document Processing Error'}
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">{errorStatus.message}</p>
                {errorStatus.isPassword && (
                  <Link
                    to="/unlock-pdf"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 mt-2 underline"
                  >
                    Go to Unlock PDF tool &rarr;
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* PDF Extraction Progress Overlay */}
          {isExtractingPdf && (
            <div className="bg-white dark:bg-dark-surface rounded-3xl border border-orange-200 dark:border-orange-900/50 p-8 sm:p-10 text-center shadow-lg mb-6 space-y-4 animate-in fade-in">
              <div className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-orange-500 flex items-center justify-center mx-auto shadow-inner">
                <FileText className="w-8 h-8 animate-pulse text-red-500" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  Reading & Extracting PDF Pages...
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                  {extractingStatus.total > 0
                    ? `Rendering slide ${extractingStatus.current} of ${extractingStatus.total} from ${extractingStatus.fileName}`
                    : `Loading ${extractingStatus.fileName || 'PDF Document'}...`}
                </p>
              </div>
              <div className="w-full max-w-md mx-auto bg-slate-100 dark:bg-dark-bg rounded-full h-3 overflow-hidden border border-slate-200 dark:border-dark-border">
                <div
                  className="h-full bg-orange-500 rounded-full transition-all duration-300"
                  style={{
                    width: `${extractingStatus.total > 0 ? Math.round((extractingStatus.current / extractingStatus.total) * 100) : 40}%`
                  }}
                />
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {extractingStatus.total > 0 ? `${Math.round((extractingStatus.current / extractingStatus.total) * 100)}%` : 'Processing...'}
              </span>
            </div>
          )}

          {/* Upload Area (If no items uploaded yet and not extracting) */}
          {items.length === 0 && !isExtractingPdf && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragOver(false);
              }}
              onDrop={handleDrop}
              className={`bg-white dark:bg-dark-surface rounded-3xl border-2 border-dashed ${
                isDragOver ? 'border-orange-500 scale-[1.01]' : 'border-slate-300 dark:border-dark-border hover:border-orange-400'
              } p-8 sm:p-14 text-center shadow-sm transition-all`}
            >
              <div className="flex flex-col items-center justify-center">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/30 text-red-500 flex items-center justify-center shadow-inner">
                    <FileText className="w-7 h-7" />
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-orange-950/30 text-orange-500 flex items-center justify-center shadow-inner">
                    <Presentation className="w-8 h-8" />
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/30 text-blue-500 flex items-center justify-center shadow-inner">
                    <FileImage className="w-7 h-7" />
                  </div>
                </div>

                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  PDF Document ya Photos Upload Karein
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-lg leading-relaxed">
                  Apna PDF document ya multiple photos (JPG, PNG, WEBP) drag & drop karein. Har PDF page aur image automatically PowerPoint (.pptx) slide me transform ho jayegi.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3.5">
                  <button
                    type="button"
                    onClick={() => pdfInputRef.current?.click()}
                    className="inline-flex items-center justify-center rounded-xl bg-red-600 hover:bg-red-700 px-7 py-3.5 text-sm sm:text-base font-bold text-white shadow-xl shadow-red-600/25 transition-all"
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    <span>Choose PDF File</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="inline-flex items-center justify-center rounded-xl bg-orange-500 hover:bg-orange-600 px-7 py-3.5 text-sm sm:text-base font-bold text-white shadow-xl shadow-orange-500/25 transition-all"
                  >
                    <FileImage className="w-5 h-5 mr-2" />
                    <span>Choose Images</span>
                  </button>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">✓ 100% Private In-Browser</span>
                  <span>•</span>
                  <span>✓ 16:9 Widescreen & 4:3 PPTX</span>
                  <span>•</span>
                  <span>✓ Reorder, Rotate & Remove Pages</span>
                </div>
              </div>
            </div>
          )}

          {/* Working Workspace (When items are uploaded) */}
          {items.length > 0 && (
            <div className="space-y-6">
              {/* Top Control Bar */}
              <div className="bg-white dark:bg-dark-surface rounded-2xl border border-slate-200 dark:border-dark-border p-4 sm:p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/30 text-orange-500">
                    <Presentation className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      {pdfCount === 0
                        ? `${items.length} ${items.length === 1 ? 'Image' : 'Images'} Selected`
                        : imgCount === 0
                        ? `${items.length} ${items.length === 1 ? 'PDF Page' : 'PDF Pages'} Selected`
                        : `${items.length} Slides Selected (${pdfCount} PDF pages, ${imgCount} images)`}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Total ~{totalSlides} {totalSlides === 1 ? 'Slide' : 'Slides'} will be created in your presentation
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => pdfInputRef.current?.click()}
                    className="border-slate-300 dark:border-dark-border text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    <FileText className="w-4 h-4 mr-1.5" />
                    + Add PDF
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => imageInputRef.current?.click()}
                    className="border-slate-300 dark:border-dark-border text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30"
                  >
                    <FileImage className="w-4 h-4 mr-1.5" />
                    + Add Images
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAll}
                    className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="w-4 h-4 mr-1.5" />
                    Clear All
                  </Button>
                </div>
              </div>

              {/* Presentation Settings Card */}
              <div className="bg-white dark:bg-dark-surface rounded-2xl border border-slate-200 dark:border-dark-border p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-dark-border pb-3">
                  <Sliders className="w-4 h-4 text-orange-500" />
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                    Slide Adjustment & Layout Settings
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Aspect Ratio */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                      <span>Slide Ratio / Orientation</span>
                      {layout === 'auto' && (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                          Smallpdf Style
                        </span>
                      )}
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 bg-slate-100 dark:bg-dark-bg p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setLayout('auto')}
                        className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                          layout === 'auto'
                            ? 'bg-white dark:bg-dark-surface text-orange-600 dark:text-orange-400 shadow-sm ring-1 ring-orange-400/40'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                        title="Auto-detects document ratio (Portrait notes stay full-bleed portrait like Smallpdf)"
                      >
                        Auto (Fit Doc)
                      </button>
                      <button
                        type="button"
                        onClick={() => setLayout('portrait')}
                        className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                          layout === 'portrait'
                            ? 'bg-white dark:bg-dark-surface text-orange-600 dark:text-orange-400 shadow-sm'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                        title="Portrait A4 vertical layout"
                      >
                        Portrait (A4)
                      </button>
                      <button
                        type="button"
                        onClick={() => setLayout('wide')}
                        className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                          layout === 'wide'
                            ? 'bg-white dark:bg-dark-surface text-orange-600 dark:text-orange-400 shadow-sm'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        16:9 Wide
                      </button>
                      <button
                        type="button"
                        onClick={() => setLayout('standard')}
                        className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                          layout === 'standard'
                            ? 'bg-white dark:bg-dark-surface text-orange-600 dark:text-orange-400 shadow-sm'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        4:3 Standard
                      </button>
                    </div>
                  </div>

                  {/* Content per slide */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Content Per Slide
                    </label>
                    <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-dark-bg p-1 rounded-xl">
                      {[
                        { val: 1, label: '1 per Slide' },
                        { val: 2, label: '2 per Slide' },
                        { val: 4, label: '4 Grid' },
                      ].map((opt) => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => setImagesPerSlide(opt.val as 1 | 2 | 4)}
                          className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                            imagesPerSlide === opt.val
                              ? 'bg-white dark:bg-dark-surface text-orange-600 dark:text-orange-400 shadow-sm'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Slide Background Color */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Slide Background
                    </label>
                    <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-dark-bg p-1 rounded-xl">
                      {[
                        { hex: 'FFFFFF', label: 'White' },
                        { hex: '1E293B', label: 'Dark' },
                        { hex: 'F8FAFC', label: 'Light' },
                      ].map((bg) => (
                        <button
                          key={bg.hex}
                          type="button"
                          onClick={() => setBackgroundColor(bg.hex)}
                          className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                            backgroundColor === bg.hex
                              ? 'bg-white dark:bg-dark-surface text-orange-600 dark:text-orange-400 shadow-sm'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <span
                            className="w-3 h-3 rounded-full border border-slate-300"
                            style={{ backgroundColor: `#${bg.hex}` }}
                          />
                          <span>{bg.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Margins & Titles */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Margins & Titles
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={margin}
                        onChange={(e) => setMargin(e.target.value as 'none' | 'small' | 'medium')}
                        className="flex-1 text-xs font-semibold py-2 px-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-slate-800 dark:text-white"
                      >
                        <option value="none">Edge-to-Edge (Smallpdf Style)</option>
                        <option value="small">Clean Margin (Small)</option>
                        <option value="medium">Spacious Margin (Wide)</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => setIncludeTitles(!includeTitles)}
                        className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all ${
                          includeTitles
                            ? 'bg-orange-500 border-orange-600 text-white'
                            : 'border-slate-200 dark:border-dark-border text-slate-600 dark:text-slate-400'
                        }`}
                        title="Add title on top of each slide"
                      >
                        Titles
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Uploaded Items List / Reorderable Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {items.map((item, idx) => (
                  <div
                    key={item.id}
                    className="group relative bg-white dark:bg-dark-surface rounded-2xl border border-slate-200 dark:border-dark-border overflow-hidden shadow-sm flex flex-col hover:shadow-md transition-all"
                  >
                    {/* Slide Number & Type Badge */}
                    <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-white text-[10px] font-bold">
                        Slide {Math.floor(idx / imagesPerSlide) + 1}
                      </span>
                      {item.sourceType === 'pdf' ? (
                        <span className="px-1.5 py-0.5 rounded-md bg-red-600 text-white text-[9px] font-bold tracking-wider uppercase">
                          PDF P.{item.pageNumber}
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded-md bg-blue-600 text-white text-[9px] font-bold tracking-wider uppercase">
                          Photo
                        </span>
                      )}
                    </div>

                    {/* Image / Slide Preview */}
                    <div
                      className="relative w-full h-36 flex items-center justify-center p-2 overflow-hidden transition-colors"
                      style={{ backgroundColor: `#${backgroundColor}` }}
                    >
                      <img
                        src={item.previewUrl}
                        alt={item.name}
                        style={{ transform: `rotate(${item.rotation || 0}deg)` }}
                        className="max-w-full max-h-full object-contain transition-transform shadow-xs"
                      />
                    </div>

                    {/* Meta & Title */}
                    <div className="p-2.5 flex-1 flex flex-col justify-between space-y-2">
                      <input
                        type="text"
                        value={item.title || ''}
                        onChange={(e) => updateTitle(item.id, e.target.value)}
                        placeholder="Slide Title..."
                        className="w-full text-xs font-medium px-2 py-1 rounded-lg border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-white truncate focus:outline-none focus:border-orange-500"
                        title="Slide Title"
                      />

                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>{item.width && item.height ? `${item.width}×${item.height}` : ''}</span>
                        <span>{formatBytes(item.size)}</span>
                      </div>

                      {/* Item Actions */}
                      <div className="flex items-center justify-between border-t border-slate-100 dark:border-dark-border pt-2">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveItem(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-dark-hover disabled:opacity-30"
                            title="Move Earlier"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveItem(idx, 'down')}
                            disabled={idx === items.length - 1}
                            className="p-1 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-dark-hover disabled:opacity-30"
                            title="Move Later"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => rotateItem(idx)}
                            className="p-1 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-dark-hover"
                            title="Rotate 90°"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="p-1 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                          title="Remove Slide"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Bar / Progress / Download */}
              <div className="bg-white dark:bg-dark-surface rounded-2xl border border-slate-200 dark:border-dark-border p-6 shadow-sm text-center">
                {resultBlob ? (
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                        PowerPoint Presentation Ready!
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-500">
                        {totalSlides} {totalSlides === 1 ? 'Slide' : 'Slides'} formatted with smart aspect ratio ({formatBytes(resultBlob.size)})
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                      <Button
                        variant="primary"
                        size="lg"
                        onClick={handleDownload}
                        className="bg-orange-500 hover:bg-orange-600 shadow-xl shadow-orange-500/25 px-8"
                      >
                        <Download className="w-5 h-5 mr-2" />
                        Download PowerPoint (.pptx)
                      </Button>
                      <Button
                        variant="secondary"
                        size="lg"
                        onClick={() => {
                          setResultBlob(null);
                          if (resultUrl) URL.revokeObjectURL(resultUrl);
                          setResultUrl(null);
                        }}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Edit Slides
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-4">
                    {isProcessing ? (
                      <div className="w-full max-w-md space-y-3">
                        <div className="flex items-center justify-center gap-2 text-orange-500 font-bold text-sm">
                          <Presentation className="w-5 h-5 animate-pulse" />
                          <span>{progressText}</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-dark-bg rounded-full h-3 overflow-hidden border border-slate-200 dark:border-dark-border">
                          <div
                            className="h-full bg-orange-500 rounded-full transition-all duration-300"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400 font-mono">{progressPercent}%</span>
                      </div>
                    ) : (
                      <Button
                        variant="primary"
                        size="lg"
                        onClick={handleGeneratePpt}
                        className="bg-orange-500 hover:bg-orange-600 shadow-xl shadow-orange-500/25 px-10 py-4 text-base font-bold"
                      >
                        <Presentation className="w-5 h-5 mr-2" />
                        Convert to PowerPoint (.pptx)
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Hidden File Inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,application/pdf"
            multiple
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
              e.target.value = '';
            }}
            className="hidden"
          />
          <input
            ref={pdfInputRef}
            type="file"
            accept=".pdf,application/pdf"
            multiple
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
              e.target.value = '';
            }}
            className="hidden"
          />
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
              e.target.value = '';
            }}
            className="hidden"
          />

          {/* Feature Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12 mb-12">
            <div className="bg-white dark:bg-dark-surface p-5 rounded-2xl border border-slate-200 dark:border-dark-border shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-950/30 text-orange-500">
                <Maximize2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Smart Aspect Ratio</h4>
                <p className="text-xs text-slate-500">PDF pages and photos never stretch; auto-fits cleanly on 16:9 & 4:3</p>
              </div>
            </div>

            <div className="bg-white dark:bg-dark-surface p-5 rounded-2xl border border-slate-200 dark:border-dark-border shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-500">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">PDF & Photos Supported</h4>
                <p className="text-xs text-slate-500">Convert entire PDF documents, individual photos, or mix both</p>
              </div>
            </div>

            <div className="bg-white dark:bg-dark-surface p-5 rounded-2xl border border-slate-200 dark:border-dark-border shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">100% Client-Side Privacy</h4>
                <p className="text-xs text-slate-500">Converts entirely inside your browser without server uploads</p>
              </div>
            </div>
          </div>

          {/* Detailed SEO Guides & Feature Sections */}
          <section className="mt-16 space-y-12">
            {/* 1. Comparison: Manual Insertion vs LAK PDF */}
            <div className="bg-white dark:bg-dark-surface rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-dark-border shadow-sm">
              <div className="text-center max-w-2xl mx-auto mb-8">
                <span className="text-xs font-bold uppercase tracking-wider text-orange-500 bg-orange-50 dark:bg-orange-950/40 px-3 py-1 rounded-full border border-orange-200 dark:border-orange-900/60">
                  Smart Auto-Fit Technology
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-3">
                  Why Convert Images to PPT with LAK PDF?
                </h2>
                <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">
                  Manually inserting dozens of photos into PowerPoint leads to stretched ratios, misaligned slides, and hours of tedious work. LAK PDF automates everything.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 rounded-2xl bg-red-50/50 dark:bg-red-950/20 border border-red-200/80 dark:border-red-900/40">
                  <h3 className="font-bold text-red-700 dark:text-red-400 mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/60 flex items-center justify-center text-xs font-extrabold">✕</span>
                    Manual Insertion in PowerPoint
                  </h3>
                  <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 font-bold">•</span>
                      <span>Requires inserting images slide by slide, consuming hours of repetitive clicking.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 font-bold">•</span>
                      <span>High risk of accidentally dragging corner handles and stretching photo aspect ratios.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 font-bold">•</span>
                      <span>Difficult to maintain uniform centering, margins, and layouts across 50+ slides.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 font-bold">•</span>
                      <span>Often bloats presentation file sizes unnecessarily with uncompressed raw image buffers.</span>
                    </li>
                  </ul>
                </div>

                <div className="p-5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40">
                  <h3 className="font-bold text-emerald-700 dark:text-emerald-400 mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-xs font-extrabold">✓</span>
                    LAK PDF Smart Auto-Fit
                  </h3>
                  <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>1-Click Batch Conversion: Convert 1 to 100+ photos into a presentation in seconds.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>Mathematical aspect ratio calculation guarantees zero stretching or portrait distortion.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>Clean centering, balanced margins, and instant choice of 1, 2, or 4 photos per slide.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>100% Client-Side Privacy: Your photos never leave your device or touch external servers.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 2. Supported Formats */}
            <div className="bg-white dark:bg-dark-surface rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-dark-border shadow-sm">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2.5">
                <Presentation className="w-6 h-6 text-orange-500" />
                Supported Document & Image Formats
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
                {[
                  { format: "PDF Documents", desc: "Multi-page documents extracted page-by-page into slides" },
                  { format: "JPG / JPEG", desc: "Digital camera photos, mobile captures, and scans" },
                  { format: "PNG", desc: "Transparent graphics, vector exports, and diagrams" },
                  { format: "WEBP", desc: "Modern lightweight web photos with rich colors" },
                  { format: "GIF", desc: "Static frames and graphic slides" },
                  { format: "SVG", desc: "Vector graphics and logos rendered with clarity" },
                  { format: "BMP", desc: "High fidelity uncompressed bitmap pictures" },
                ].map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-slate-100 dark:border-dark-border bg-slate-50/60 dark:bg-dark-bg/60 text-center">
                    <span className="block font-bold text-slate-800 dark:text-slate-200 text-sm">{item.format}</span>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Popular Use Cases */}
            <div className="bg-white dark:bg-dark-surface rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-dark-border shadow-sm">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2.5">
                <Presentation className="w-6 h-6 text-orange-500" />
                Popular Use Cases for Image to PowerPoint Conversion
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    icon: <Briefcase className="w-5 h-5 text-orange-500" />,
                    title: "Pitch Decks & Reports",
                    desc: "Assemble product wireframes, UX prototypes, and financial chart screenshots into clean client decks."
                  },
                  {
                    icon: <GraduationCap className="w-5 h-5 text-orange-500" />,
                    title: "Classroom & Study Notes",
                    desc: "Convert handwritten whiteboard photos, textbook scans, and diagrams into lecture slides for school."
                  },
                  {
                    icon: <Camera className="w-5 h-5 text-orange-500" />,
                    title: "Photo Albums & Events",
                    desc: "Create wedding, birthday, trip, or conference slideshows ready to present on TV screens and projectors."
                  },
                  {
                    icon: <Building2 className="w-5 h-5 text-orange-500" />,
                    title: "Real Estate & Architecture",
                    desc: "Showcase property listings, site photography, interior photos, and architectural blueprints elegantly."
                  }
                ].map((useCase, idx) => (
                  <div key={idx} className="p-4 rounded-2xl border border-slate-100 dark:border-dark-border bg-slate-50/50 dark:bg-dark-bg/40">
                    <div className="p-2.5 rounded-xl bg-orange-100 dark:bg-orange-950/50 w-fit mb-3">
                      {useCase.icon}
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">{useCase.title}</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{useCase.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Pro Tips for High-Converting Presentations */}
            <div className="bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent rounded-3xl p-6 sm:p-8 border border-orange-200/70 dark:border-orange-900/40">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2.5">
                <Lightbulb className="w-6 h-6 text-orange-500" />
                Pro-Tips for Creating Beautiful PowerPoint Presentations
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1.5">Choose 16:9 for Modern Displays</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Most modern TVs, laptop monitors, and digital projectors use 16:9 widescreen. Only use 4:3 if presenting on legacy classroom projectors.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1.5">Use Dark Slate for Photography</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    If you are presenting creative photos or dark UI designs, switch the background to Dark Slate (#1E293B) to make colors pop dramatically.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1.5">Clean Margins for Professionalism</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Selecting "Clean Margins" adds a balanced breathing room around photos so text and borders never get cut off by screen bezels.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* SEO Content & Guide */}
          <ToolSEOContent toolKey="/make-ppt" />
        </div>
      </div>
    </>
  );
};

export default MakePpt;
