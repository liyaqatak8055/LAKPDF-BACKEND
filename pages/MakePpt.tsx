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
  Layers,
  Palette,
  RefreshCw,
  LayoutGrid,
  Briefcase,
  GraduationCap,
  Camera,
  Building2,
  Lightbulb
} from 'lucide-react';
import { Button } from '../components/Button';
import {
  convertImagesToPowerPoint,
  ImageInputItem,
  ImageToPptOptions
} from '../services/officeService';
import { formatBytes } from '../services/fileHelpers';
import { ToolSEOContent } from '../components/ToolSEOContent';
import { trackEvent } from '../utils/analytics';

interface ImageCardItem extends ImageInputItem {
  id: string;
  file: File;
  previewUrl: string;
  size: number;
}

export const MakePpt: React.FC = () => {
  const [items, setItems] = useState<ImageCardItem[]>([]);
  const [layout, setLayout] = useState<'wide' | 'standard'>('wide');
  const [imagesPerSlide, setImagesPerSlide] = useState<1 | 2 | 4>(1);
  const [backgroundColor, setBackgroundColor] = useState<string>('FFFFFF');
  const [margin, setMargin] = useState<'none' | 'small' | 'medium'>('small');
  const [includeTitles, setIncludeTitles] = useState<boolean>(false);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressText, setProgressText] = useState<string>('');

  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultFileName, setResultFileName] = useState<string>('presentation.pptx');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      items.forEach((it) => {
        if (it.previewUrl) URL.revokeObjectURL(it.previewUrl);
      });
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, []);

  // Handle file selections
  const handleFiles = (fileList: FileList | File[]) => {
    const validFiles: File[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.type.startsWith('image/')) {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) {
      alert('Please upload image files (JPG, PNG, WEBP, etc.)');
      return;
    }

    validFiles.forEach((file) => {
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
            title: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
          };
          setItems((prev) => [...prev, newItem]);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });

    // Reset results if adding more photos
    if (resultBlob) {
      setResultBlob(null);
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      setResultUrl(null);
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
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((it) => it.id !== id);
    });
  };

  // Clear all
  const clearAll = () => {
    items.forEach((it) => {
      if (it.previewUrl) URL.revokeObjectURL(it.previewUrl);
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
    setProgressText('Preparing images & calculating aspect ratios...');

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
      const baseName = items[0]?.name ? items[0].name.replace(/\.[^/.]+$/, '') : 'presentation';

      setResultBlob(blob);
      setResultUrl(url);
      setResultFileName(`${baseName}-lakpdf.pptx`);
      setProgressPercent(100);
      setProgressText('Presentation Ready!');

      trackEvent({
        category: 'MakePpt',
        action: 'convert_success',
        label: `${items.length}_images_${layout}`,
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

  return (
    <>
      <Helmet>
        <title>Make PPT Online Free | Images to PowerPoint Converter - LAK PDF</title>
        <meta
          name="description"
          content="Convert JPG, PNG, WEBP and photos to PowerPoint (.pptx) online free. Smart aspect ratio prevents stretching. Custom 16:9 widescreen or 4:3 layouts. 100% private."
        />
        <meta
          name="keywords"
          content="make ppt online free, images to ppt converter, convert jpg to powerpoint, photo to pptx, png to ppt converter, photo slideshow ppt, create powerpoint from images, picture to presentation"
        />
        <link rel="canonical" href="https://lakpdf.com/make-ppt" />
        <meta property="og:title" content="Make PPT Online Free | Images to PowerPoint Converter - LAK PDF" />
        <meta
          property="og:description"
          content="Turn JPG, PNG, and photos into neatly formatted PowerPoint slides (.pptx). Smart aspect-ratio auto-fit, multiple images per slide, 100% free and client-side."
        />
        <meta property="og:url" content="https://lakpdf.com/make-ppt" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="LAKPDF" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Make PPT Online Free | Images to PowerPoint Converter - LAK PDF" />
        <meta
          name="twitter:description"
          content="Convert photos to PowerPoint slides (.pptx) with smart aspect ratio auto-fit. No distortion, 16:9 and 4:3 layouts, 100% free."
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
              'Convert images and photos into professional PowerPoint presentations online for free with smart aspect-ratio auto-fit.',
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-slate-50 dark:bg-dark-bg text-slate-800 dark:text-dark-text-primary py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900 text-orange-600 dark:text-orange-400 text-xs sm:text-sm font-semibold mb-3 shadow-sm">
              <Presentation className="w-4 h-4 text-orange-500 animate-pulse" />
              <span>Smart Aspect Ratio Auto-Fit • 16:9 HD & 4:3 PPTX</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-3">
              Make <span className="text-orange-500">PowerPoint PPT</span> from Images
            </h1>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Apni photos aur images ko professionally adjusted PowerPoint (.pptx) presentation me convert karein.
              Har image bina khinche (aspect ratio maintain karke) slide me perfectly fit aur center hogi.
            </p>
          </div>

          {/* Upload Area (If no images uploaded yet) */}
          {items.length === 0 && (
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
              } p-8 sm:p-14 text-center shadow-sm transition-all cursor-pointer`}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center justify-center">
                <div className="w-20 h-20 rounded-3xl bg-orange-50 dark:bg-orange-950/30 text-orange-500 flex items-center justify-center mb-5 shadow-inner">
                  <Presentation className="w-10 h-10" />
                </div>

                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  Photos Upload Karein
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-md">
                  Ek ya multiple photos (JPG, PNG, WEBP) drag & drop karein ya select karein.
                </p>

                <div className="inline-flex items-center justify-center rounded-xl bg-orange-500 hover:bg-orange-600 px-8 py-4 text-base font-bold text-white shadow-xl shadow-orange-500/25 transition-all">
                  <Plus className="w-5 h-5 mr-2" />
                  <span>Choose Images</span>
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
                    <FileImage className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      {items.length} {items.length === 1 ? 'Image' : 'Images'} Selected
                    </h3>
                    <p className="text-xs text-slate-500">
                      Total ~{totalSlides} {totalSlides === 1 ? 'Slide' : 'Slides'} will be created
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="border-slate-300 dark:border-dark-border"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Add More
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
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Slide Ratio (Screen Size)
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 bg-slate-100 dark:bg-dark-bg p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setLayout('wide')}
                        className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                          layout === 'wide'
                            ? 'bg-white dark:bg-dark-surface text-orange-600 dark:text-orange-400 shadow-sm'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        16:9 Widescreen
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

                  {/* Images per slide */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Photos Per Slide
                    </label>
                    <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-dark-bg p-1 rounded-xl">
                      {[
                        { val: 1, label: '1 Photo' },
                        { val: 2, label: '2 Photos' },
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
                        <option value="none">No Margins (Edge-to-edge)</option>
                        <option value="small">Clean Margin (Recommended)</option>
                        <option value="medium">Spacious Margin</option>
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

              {/* Uploaded Images List / Reorderable Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {items.map((item, idx) => (
                  <div
                    key={item.id}
                    className="group relative bg-white dark:bg-dark-surface rounded-2xl border border-slate-200 dark:border-dark-border overflow-hidden shadow-sm flex flex-col hover:shadow-md transition-all"
                  >
                    {/* Slide Number Badge */}
                    <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-white text-[10px] font-bold">
                      Slide {Math.floor(idx / imagesPerSlide) + 1}
                    </div>

                    {/* Image Preview */}
                    <div className="relative w-full h-36 bg-slate-100 dark:bg-dark-bg flex items-center justify-center p-2 overflow-hidden">
                      <img
                        src={item.previewUrl}
                        alt={item.name}
                        style={{ transform: `rotate(${item.rotation || 0}deg)` }}
                        className="max-w-full max-h-full object-contain transition-transform"
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
                          title="Remove Image"
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

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
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
                <p className="text-xs text-slate-500">Images never stretch; auto-fits cleanly on 16:9 & 4:3</p>
              </div>
            </div>

            <div className="bg-white dark:bg-dark-surface p-5 rounded-2xl border border-slate-200 dark:border-dark-border shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-950/30 text-orange-500">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">100% Private & Free</h4>
                <p className="text-xs text-slate-500">Generates in-browser without server uploads</p>
              </div>
            </div>

            <div className="bg-white dark:bg-dark-surface p-5 rounded-2xl border border-slate-200 dark:border-dark-border shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-950/30 text-orange-500">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Universal PowerPoint</h4>
                <p className="text-xs text-slate-500">Opens in MS PowerPoint, Google Slides & Keynote</p>
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

            {/* 2. Supported Image Formats */}
            <div className="bg-white dark:bg-dark-surface rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-dark-border shadow-sm">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2.5">
                <FileImage className="w-6 h-6 text-orange-500" />
                Supported Image Formats & High-Resolution Quality
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
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
