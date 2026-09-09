import React, { useState, useEffect, Suspense, lazy, useRef } from 'react';
import { Helmet } from "react-helmet-async";
import { Link } from 'react-router-dom';
import { getRecentTools, RecentTool } from '../utils/toolUsage';
import { trackEvent } from '../utils/analytics';
import { ToolCard } from '../components/ToolCard';
import { TrustLayer } from '../components/TrustLayer';
import {
  Files,
  Scissors,
  Minimize2,
  Image,
  FileImage,
  Shield,
  RotateCw,
  Trash2,
  FileText,
  ArrowRight,
  Presentation,
  PenTool,
  Signature,
  Scan,
  Hash,
  Search,
  Brain,
  Crop,
  Zap,
  Type,
  LayoutGrid,
  Sliders,
  Code,
  Plus,
  Unlink,
  Languages,
  GraduationCap,
  Briefcase,
  Lightbulb,
  Mic,
  CalendarDays,
  Upload,
  Download,
  Sparkles,
} from "lucide-react";

// Lazy load AdUnit for better performance
const AdUnit = lazy(() => import('../components/AdUnit').then(m => ({ default: m.AdUnit })));
const AdMobile = lazy(() => import('../components/AdUnit').then(m => ({ default: m.AdMobile })));

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Files,
  Scissors,
  Minimize2,
  Image,
  FileImage,
  Shield,
  RotateCw,
  Trash2,
  FileText,
  ArrowRight,
  Presentation,
  PenTool,
  Signature,
  Scan,
  Hash,
  Search,
  Brain,
  Crop,
  Zap,
  Type,
  LayoutGrid,
  Sliders,
  Code,
  Plus,
  Unlink,
  Languages,
  GraduationCap,
  Briefcase,
  Lightbulb,
  Mic,
  CalendarDays,
};

// Dynamic Icon Component
const DynamicIcon: React.FC<{ iconName: string; className: string }> = ({ iconName, className }) => {
  const IconComponent = iconMap[iconName];
  if (!IconComponent) return null;

  return <IconComponent className={className} />;
};

/**
 * Native CSS content-visibility: auto container.
 * Browser engine handles off-screen layout/paint skipping in native C++,
 * eliminating React hydration/mount freezes during active scrolling gestures.
 */
const LazySection: React.FC<{ children: React.ReactNode; className?: string; rootMargin?: string }> =
  ({ children, className = '' }) => {
    return <div className={`content-section-lazy ${className}`}>{children}</div>;
  };

const allTools = [
    {
      id: "merge",
      title: "Merge PDF",
      description: "Combine multiple PDF files into a single document",
      iconName: "Files",
      to: "/merge",
      color: "bg-blue-50"
    },
    {
      id: "split",
      title: "Split PDF",
      description: "Extract pages from PDF and create separate files",
      iconName: "Scissors",
      to: "/split",
      color: "bg-green-50"
    },
    {
      id: "compress",
      title: "Compress PDF",
      description: "Reduce PDF file size without losing quality",
      iconName: "Minimize2",
      to: "/compress",
      color: "bg-purple-50"
    },
    {
      id: "organize-pdf",
      title: "Organize PDF",
      description: "Reorder, rotate, and organize PDF pages",
      iconName: "LayoutGrid",
      to: "/organize-pdf",
      color: "bg-orange-50"
    },
    {
      id: "img-to-pdf",
      title: "Image to PDF",
      description: "Convert images (JPG, PNG) to PDF format",
      iconName: "Image",
      to: "/img-to-pdf",
      color: "bg-pink-50"
    },
    {
      id: "pdf-to-img",
      title: "PDF to Image",
      description: "Convert PDF pages to JPG, PNG images",
      iconName: "FileImage",
      to: "/pdf-to-img",
      color: "bg-indigo-50"
    },
    {
      id: "compress-img",
      title: "Compress Image",
      description: "Reduce image file size while maintaining quality",
      iconName: "Minimize2",
      to: "/compress-img",
      color: "bg-teal-50"
    },
    {
      id: "advance-compress-img",
      title: "Compress Image to 50 KB",
      description: "Compress images to around 50 KB per image",
      iconName: "Sliders",
      to: "/advance-compress-img",
      color: "bg-cyan-50"
    },
    {
      id: "convert",
      title: "Convert PDF",
      description: "Convert PDF to various formats",
      iconName: "ArrowRight",
      to: "/convert",
      color: "bg-yellow-50"
    },
    {
      id: "pdf-to-word",
      title: "PDF to Word",
      description: "Convert PDF documents to editable Word files",
      iconName: "FileText",
      to: "/pdf-to-word",
      color: "bg-blue-50"
    },
    {
      id: "pdf-to-powerpoint",
      title: "PDF to PowerPoint",
      description: "Convert PDF to PowerPoint presentation",
      iconName: "Presentation",
      to: "/pdf-to-powerpoint",
      color: "bg-red-50"
    },
    {
      id: "word-to-pdf",
      title: "Word to PDF",
      description: "Convert Word documents to PDF format",
      iconName: "Type",
      to: "/word-to-pdf",
      color: "bg-green-50"
    },
    {
      id: "powerpoint-to-pdf",
      title: "PowerPoint to PDF",
      description: "Convert PowerPoint presentations to PDF",
      iconName: "Presentation",
      to: "/powerpoint-to-pdf",
      color: "bg-purple-50"
    },
    {
      id: "rotate",
      title: "Rotate PDF",
      description: "Rotate PDF pages to correct orientation",
      iconName: "RotateCw",
      to: "/rotate",
      color: "bg-orange-50"
    },
    {
      id: "page-number",
      title: "Add Page Numbers",
      description: "Add page numbers to PDF documents",
      iconName: "Hash",
      to: "/page-number",
      color: "bg-pink-50"
    },

    {
      id: "watermark",
      title: "Watermark PDF",
      description: "Add text or image watermarks to PDF",
      iconName: "Type",
      to: "/watermark",
      color: "bg-teal-50"
    },
    {
      id: "crop-pdf",
      title: "Crop PDF",
      description: "Crop PDF pages to remove unwanted margins",
      iconName: "Crop",
      to: "/crop-pdf",
      color: "bg-cyan-50"
    },
    {
      id: "scan-pdf",
      title: "Scan to PDF",
      description: "Convert scanned documents to PDF",
      iconName: "Scan",
      to: "/scan-pdf",
      color: "bg-yellow-50"
    },
    {
      id: "sign-pdf",
      title: "Sign PDF",
      description: "Add digital signatures to PDF documents",
      iconName: "Signature",
      to: "/sign-pdf",
      color: "bg-blue-50"
    },
    {
      id: "ocr-pdf",
      title: "OCR PDF",
      description: "Extract text from scanned PDF using OCR",
      iconName: "Search",
      to: "/ocr-pdf",
      color: "bg-green-50"
    },
    {
      id: "compare-pdf",
      title: "Compare PDF",
      description: "Compare two PDF files and highlight differences",
      iconName: "Search",
      to: "/compare-pdf",
      color: "bg-purple-50"
    },
    {
      id: "delete-page",
      title: "Delete Pages",
      description: "Remove specific pages from PDF documents",
      iconName: "Trash2",
      to: "/delete-page",
      color: "bg-red-50"
    },
    {
      id: "summarizer-qa",
      title: "AI Summarizer",
      description: "Generate summary and ask questions from PDF with page context",
      iconName: "Search",
      to: "/summarizer-qa",
      color: "bg-blue-50",
      comingSoon: true
    },
    {
      id: "detect-duplicates",
      title: "Detect Duplicates",
      description: "Find and remove duplicate pages in PDF",
      iconName: "Search",
      to: "/detect-duplicates",
      color: "bg-indigo-50"
    },
    {
      id: "ai-pdf-to-mcq",
      title: "AI PDF to MCQ",
      description: "Generate exam MCQs with answer key, test mode, and score analysis",
      iconName: "GraduationCap",
      to: "/ai-pdf-to-mcq",
      color: "bg-amber-50",
      comingSoon: true
    },
    {
      id: "pdf-editor",
      title: "PDF Editor",
      description: "Normal PDF editor for manual text, highlight and shape annotations",
      iconName: "FileText",
      to: "/pdf-editor",
      color: "bg-fuchsia-50"
    },
    {
      id: "ai-interview-generator",
      title: "AI Interview Generator",
      description: "Resume analyzer + technical, HR, behavioral questions with model answers",
      iconName: "Briefcase",
      to: "/ai-interview-generator",
      color: "bg-emerald-50",
      comingSoon: true
    },
  ];

  // Specific IDs for the popular tools
  const popularIds = ["img-to-pdf", "compress", "compress-img", "pdf-to-word"];

  const popularTools = allTools.filter(t => popularIds.includes(t.id));
  const categorySections = [
    {
      id: "organize",
      title: "Organize",
      description: "Arrange pages, clean files, and prepare PDFs for sharing.",
      iconName: "LayoutGrid",
      toolIds: ["merge", "split", "organize-pdf", "rotate", "delete-page", "page-number", "crop-pdf", "detect-duplicates"]
    },
    {
      id: "convert",
      title: "Convert",
      description: "Move between PDF, image, Word, and PowerPoint formats.",
      iconName: "ArrowRight",
      toolIds: ["convert", "img-to-pdf", "pdf-to-img", "pdf-to-word", "pdf-to-powerpoint", "word-to-pdf", "powerpoint-to-pdf", "scan-pdf"]
    },
    {
      id: "edit",
      title: "Edit",
      description: "Refine file size, text, layout, and document content.",
      iconName: "PenTool",
      toolIds: ["compress", "compress-img", "advance-compress-img", "pdf-editor", "ocr-pdf", "compare-pdf"]
    },
    {
      id: "security",
      title: "Security",
      description: "Sign and brand PDFs before you send them out.",
      iconName: "Shield",
      toolIds: ["watermark", "sign-pdf"]
    },
    {
      id: "ai-tools",
      title: "AI Tools (Coming Soon)",
      description: "Next-gen AI summarizer, MCQ generator and interview prep — launching soon!",
      iconName: "Brain",
      toolIds: ["summarizer-qa", "ai-pdf-to-mcq", "ai-interview-generator"]
    }
  ];
  const toolMap = new Map(allTools.map((tool) => [tool.id, tool]));

const Home: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [recentTools, setRecentTools] = useState<RecentTool[]>(() => getRecentTools());
  const searchTrackTimerRef = useRef<number | null>(null);

  const query = searchQuery.trim().toLowerCase();
  const matchesSearch = (tool: (typeof allTools)[number]) => {
    if (!query) return true;
    return (
      tool.title.toLowerCase().includes(query) ||
      tool.description.toLowerCase().includes(query)
    );
  };
  const matchingTools = allTools.filter(matchesSearch);
  const visibleCategorySections = categorySections
    .map((section) => ({
      ...section,
      tools: section.toolIds
        .map((toolId) => toolMap.get(toolId))
        .filter((tool): tool is (typeof allTools)[number] => Boolean(tool))
        .filter(matchesSearch)
    }))
    .filter((section) => section.tools.length > 0);




  const onSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTrackTimerRef.current) {
      window.clearTimeout(searchTrackTimerRef.current);
    }
    searchTrackTimerRef.current = window.setTimeout(() => {
      trackEvent({
        category: 'Homepage',
        action: 'tool_search',
        label: value ? value.slice(0, 40) : 'cleared'
      });
    }, 400);
  };

  useEffect(() => {
    const refreshRecentTools = () => {
      setRecentTools(getRecentTools());
    };

    refreshRecentTools();
    window.addEventListener('focus', refreshRecentTools);
    document.addEventListener('visibilitychange', refreshRecentTools);

    return () => {
      window.removeEventListener('focus', refreshRecentTools);
      document.removeEventListener('visibilitychange', refreshRecentTools);
      if (searchTrackTimerRef.current) {
        window.clearTimeout(searchTrackTimerRef.current);
      }
    };
  }, []);

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "LAK PDF",
    url: "https://lakpdf.com",
    logo: "https://lakpdf.com/icon-512.png",
    contactPoint: [{
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "liyaqatk960@gmail.com"
    }]
  };
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "LAK PDF",
    url: "https://lakpdf.com"
  };

  return (
    <>
      <Helmet>
        <title>LAK PDF - Free Online PDF Tools</title>

        <meta
          name="description"
          content="Free online PDF tools to merge, compress, convert, split, and edit PDFs. Fast, secure and easy."
        />

        <meta
          name="keywords"
          content="lak pdf, pdf tools, merge pdf, compress pdf, pdf to jpg, jpg to pdf"
        />

        <link rel="canonical" href="https://lakpdf.com/" />

        {/* Open Graph */}
        <meta property="og:title" content="LAK PDF – Free Online PDF Tools" />
        <meta
          property="og:description"
          content="All-in-one free online PDF tools. No signup required."
        />
        <meta property="og:image" content="/og-image.png" />
        <meta property="og:url" content="https://lakpdf.com/" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(organizationSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(websiteSchema)}</script>
      </Helmet>

      <section className="relative px-4 py-8 text-center overflow-hidden sm:py-12 md:py-16 bg-white dark:bg-dark-bg">
        {/* Soft Pink Blush Glow - Left */}
        <div className="pointer-events-none absolute left-4 sm:left-16 md:left-32 top-[42%] -translate-y-1/2 h-36 w-36 sm:h-48 sm:w-48 rounded-full bg-[#ff6f86]/20 dark:bg-rose-900/20 blur-2xl" />

        {/* Soft Pink Blush Glow - Right */}
        <div className="pointer-events-none absolute right-4 sm:right-16 md:right-32 top-[42%] -translate-y-1/2 h-36 w-36 sm:h-48 sm:w-48 rounded-full bg-[#ff6f86]/20 dark:bg-rose-900/20 blur-2xl" />

        <div className="relative z-10 max-w-4xl mx-auto">
          {/* Main Headline */}
          <h1
            className="text-3xl sm:text-4xl md:text-6xl font-extrabold text-slate-900 dark:text-dark-text-primary mb-4 tracking-tight"
            data-elementtiming="hero-heading"
          >
            Finish everyday PDF work in{' '}
            <span className="text-primary-600 dark:text-rose-400 inline-flex items-center gap-1.5 whitespace-nowrap">
              <span>seconds</span>
              {/* Cute Line-Drawn Smile Doodle */}
              <svg
                className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-primary-600 dark:text-rose-400 inline-block -rotate-6 transition-transform duration-300 hover:rotate-6 hover:scale-110"
                viewBox="0 0 42 42"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                {/* Left Smiling Eye */}
                <path d="M 11 16 Q 16 10 21 16" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
                {/* Right Smiling Eye */}
                <path d="M 25 16 Q 30 10 35 16" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
                {/* Smile Mouth Curve */}
                <path d="M 9 22 Q 23 35 36 22" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
                {/* Right Dimple Hook */}
                <path d="M 36 21 Q 38 24 38 27" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
            </span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-5 leading-relaxed">
            Merge, compress, convert, split, and edit PDFs quickly with simple browser-based tools.
          </p>

          <div className="mb-4 flex justify-center">
            <Link
              to="/tools"
              className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-6 py-3 text-sm sm:text-base font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
            >
              Choose a PDF tool
            </Link>
          </div>

          <div className="mb-5 flex flex-wrap justify-center gap-2 text-[11px] sm:text-sm font-medium text-slate-600 dark:text-dark-text-secondary">
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1.5 dark:border-dark-border dark:bg-dark-surface">Browser-first core tools</span>
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1.5 dark:border-dark-border dark:bg-dark-surface">Works in browser</span>
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1.5 dark:border-dark-border dark:bg-dark-surface">Fast downloads</span>
          </div>

          <div className="max-w-lg mx-auto">
            <label htmlFor="tool-search" className="sr-only">Search PDF tools</label>
            <input
              id="tool-search"
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search tools: merge, compress, OCR, convert..."
              className="w-full rounded-lg border border-slate-200 bg-white px-5 py-3.5 text-slate-700 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 dark:border-dark-border dark:bg-dark-surface dark:text-dark-text-primary"
            />
          </div>
        </div>
      </section>

      {!query && (
        <section id="popular-tools" className="py-8 px-4 md:px-8 max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary-100 rounded-lg text-primary-600">
              <DynamicIcon iconName="Zap" className="w-5 h-5 fill-current" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-dark-text-primary">Most Popular Tools</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4 lg:gap-5">
            {popularTools.map((tool) => (
              <ToolCard
                key={tool.to}
                title={tool.title}
                description={tool.description}
                to={tool.to}
                popular
                icon={<DynamicIcon iconName={tool.iconName} className="h-5 w-5 sm:h-6 sm:w-6" />}
              />
            ))}
          </div>
        </section>
      )}

      {recentTools.length > 0 && (
        <section className="py-4 px-4 md:px-8 max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
              <DynamicIcon iconName="CalendarDays" className="w-5 h-5" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-dark-text-primary">Continue Where You Left Off</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {recentTools.map((tool) => (
              <Link
                key={tool.path}
                to={tool.path}
                className="px-4 py-2 rounded-full border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:border-primary-300 hover:text-primary-500 transition-colors"
              >
                {tool.title}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Below-fold: category tool grid — deferred until near viewport */}
      <LazySection>
        <section className="py-4 md:py-6 px-4 md:px-8 max-w-7xl mx-auto">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg md:text-2xl font-bold text-slate-900 dark:text-dark-text-primary">
                {query ? "Search Results" : "Browse by task"}
              </h2>
              {!query && (
                <p className="mt-1 text-xs sm:text-sm md:text-base text-slate-600 dark:text-dark-text-secondary">
                  Pick the workflow that matches what you need to do with your file.
                </p>
              )}
            </div>
            {query && (
              <p className="text-sm text-slate-600">
                Showing {matchingTools.length} result{matchingTools.length === 1 ? "" : "s"} for "{searchQuery.trim()}"
              </p>
            )}
          </div>

          <div className="space-y-6 md:space-y-7">
            {visibleCategorySections.map((section) => (
              <section key={section.id}>
                <div className="mb-3 flex items-center gap-2.5">
                  <div className="p-1.5 bg-slate-100 rounded-lg text-slate-600 dark:bg-dark-surface dark:text-dark-text-secondary">
                    <DynamicIcon iconName={section.iconName} className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-dark-text-primary">{section.title}</h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-dark-text-secondary">{section.description}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-5">
                  {section.tools.map((tool) => (
                    <ToolCard
                      key={tool.to}
                      title={tool.title}
                      description={tool.description}
                      to={tool.to}
                      comingSoon={tool.comingSoon}
                      icon={<DynamicIcon iconName={tool.iconName} className="h-5 w-5 sm:h-6 sm:w-6" />}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>

          {visibleCategorySections.length === 0 && (
            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-600">
              No tools found. Try keywords like "convert", "compress", or "editor".
            </div>
          )}
        </section>
      </LazySection>

      {/* Ad Space 1 - Mobile Banner Ad */}
      <div className="max-w-full mx-auto px-4 md:hidden">
        <Suspense fallback={null}>
          <AdMobile slotId="9704679803624436" className="my-2" />
        </Suspense>
      </div>

      <section className="mx-auto max-w-7xl px-4 py-4 md:px-8">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 md:p-8 shadow-sm dark:border-dark-border dark:bg-dark-surface">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-dark-hover dark:text-dark-text-secondary">
            <Sparkles className="h-4 w-4 text-primary-500" />
            Simple 4-Step Process
          </div>
          <h2 className="text-xl font-bold text-slate-900 md:text-2xl dark:text-dark-text-primary">
            How to use LAK PDF tools
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-dark-text-secondary md:text-base">
            LAK PDF is designed for quick, browser-based document workflows. Choose your tool, upload files, apply settings, and download output immediately in under a minute without installing any software.
          </p>

          {/* 4 Interactive Visual Step Cards */}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="group relative rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 transition-all hover:border-primary-300 hover:bg-white hover:shadow-md dark:border-dark-border dark:bg-dark-bg/60 dark:hover:border-primary-700 dark:hover:bg-dark-surface">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-100 text-xs font-bold text-primary-800 dark:bg-primary-950/60 dark:text-primary-300">
                  01
                </span>
                <LayoutGrid className="h-4 w-4 text-slate-400 group-hover:text-primary-500 transition-colors" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-dark-text-primary">1. Choose a Tool</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-dark-text-secondary">
                Select from 27+ online tools like Merge, Compress, Convert, or OCR.
              </p>
            </div>

            <div className="group relative rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 transition-all hover:border-blue-300 hover:bg-white hover:shadow-md dark:border-dark-border dark:bg-dark-bg/60 dark:hover:border-blue-700 dark:hover:bg-dark-surface">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-xs font-bold text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                  02
                </span>
                <Upload className="h-4 w-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-dark-text-primary">2. Upload & Order</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-dark-text-secondary">
                Upload your files and confirm live preview, layout, or page order.
              </p>
            </div>

            <div className="group relative rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 transition-all hover:border-amber-300 hover:bg-white hover:shadow-md dark:border-dark-border dark:bg-dark-bg/60 dark:hover:border-amber-700 dark:hover:bg-dark-surface">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-xs font-bold text-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
                  03
                </span>
                <Sliders className="h-4 w-4 text-slate-400 group-hover:text-amber-500 transition-colors" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-dark-text-primary">3. Apply Settings</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-dark-text-secondary">
                Customize compression quality, target format, or page range.
              </p>
            </div>

            <div className="group relative rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 transition-all hover:border-emerald-300 hover:bg-white hover:shadow-md dark:border-dark-border dark:bg-dark-bg/60 dark:hover:border-emerald-700 dark:hover:bg-dark-surface">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  04
                </span>
                <Download className="h-4 w-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-dark-text-primary">4. Instant Download</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-dark-text-secondary">
                Process directly in browser and download your ready document.
              </p>
            </div>
          </div>

          {/* Quick Tool Navigation Pills */}
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 dark:border-dark-border">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Popular Tools:
            </span>
            <Link to="/merge" className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-primary-50 hover:text-primary-600 dark:bg-dark-hover dark:text-dark-text-secondary dark:hover:text-primary-400">
              Merge PDF
            </Link>
            <Link to="/compress" className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-primary-50 hover:text-primary-600 dark:bg-dark-hover dark:text-dark-text-secondary dark:hover:text-primary-400">
              Compress PDF
            </Link>
            <Link to="/convert" className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-primary-50 hover:text-primary-600 dark:bg-dark-hover dark:text-dark-text-secondary dark:hover:text-primary-400">
              Convert PDF
            </Link>
            <Link to="/img-to-pdf" className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-primary-50 hover:text-primary-600 dark:bg-dark-hover dark:text-dark-text-secondary dark:hover:text-primary-400">
              Image to PDF
            </Link>
            <Link to="/pdf-to-word" className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-primary-50 hover:text-primary-600 dark:bg-dark-hover dark:text-dark-text-secondary dark:hover:text-primary-400">
              PDF to Word
            </Link>
          </div>
        </div>
      </section>

      <LazySection>
        <TrustLayer toolCount={allTools.length} />
      </LazySection>

      {/* Ad Space 2 - Rectangle Ad */}
      <Suspense fallback={null}>
        <AdUnit
          slotId="9704679803624436"
          format="rectangle"
          layout="card"
          className="my-1"
          reserveSpace={false}
          lazy={true}
        />
      </Suspense>

      {/* Custom CTA Section */}
      <section className="py-8 md:py-12 bg-primary-50 border-t border-slate-100">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-2.5">
            Free Online PDF Tools - No Registration Required
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-slate-600 mb-5 max-w-2xl mx-auto">
            Convert, compress, merge, split, and edit PDF files online with simple browser-first workflows and clear privacy handling.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/img-to-pdf"
              className="inline-flex items-center justify-center px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors shadow-sm text-sm sm:text-base"
            >
              <DynamicIcon iconName="Zap" className="w-4 h-4 mr-2" />
              Start Converting PDFs Free
            </Link>
            <Link
              to="/compress"
              className="inline-flex items-center justify-center px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-lg border border-slate-200 transition-colors shadow-sm text-sm sm:text-base"
            >
              Compress PDF Online
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-8 md:py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-6 md:mb-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-2">
              PDF Tools FAQ - Everything You Need to Know
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Common questions about free online PDF tools, security, and file processing
            </p>
          </div>

          <div className="space-y-3 sm:space-y-3.5">
            <div className="bg-slate-50 rounded-xl p-4 sm:p-5 border border-slate-200">
              <h3 className="text-base font-semibold text-slate-900 mb-1.5">
                Are LAK PDF tools completely free to use?
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Core tools are available without registration. Some features may depend on account access or service availability as the product evolves.
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 sm:p-5 border border-slate-200">
              <h3 className="text-base font-semibold text-slate-900 mb-1.5">
                Is my data safe and secure when using PDF tools online?
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Most core PDF processing runs directly in your browser. AI features are different: extracted text may be sent to configured AI APIs to generate responses. Files and text are handled only for the workflow you request.
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 sm:p-5 border border-slate-200">
              <h3 className="text-base font-semibold text-slate-900 mb-1.5">
                What file formats does LAK PDF support?
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Current tools support PDF, JPG, PNG, BMP, DOC, DOCX, PPT, and PPTX workflows. Check the individual tool page for the exact input types accepted by that tool.
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 sm:p-5 border border-slate-200">
              <h3 className="text-base font-semibold text-slate-900 mb-1.5">
                What's the maximum file size for PDF processing?
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                For best results, keep files reasonably sized for your device and browser. Browser-side workflows depend on available memory, file complexity, and your device performance.
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 sm:p-5 border border-slate-200">
              <h3 className="text-base font-semibold text-slate-900 mb-1.5">
                Can I use PDF tools on my mobile phone or tablet?
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Yes. The interface is responsive and supports current mobile browsers, though larger files are usually easier to process on more capable devices.
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 sm:p-5 border border-slate-200">
              <h3 className="text-base font-semibold text-slate-900 mb-1.5">
                Do I need to sign up or create an account to use PDF tools?
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                You can use core tools without signing in. Account features are available where the product provides them, such as profile and activity workflows.
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 sm:p-5 border border-slate-200">
              <h3 className="text-base font-semibold text-slate-900 mb-1.5">
                How fast are your online PDF processing tools?
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Speed depends on file size, tool type, browser, and device. Browser-side tools avoid an upload step for many everyday workflows, while AI tools also depend on API response time.
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 sm:p-5 border border-slate-200">
              <h3 className="text-base font-semibold text-slate-900 mb-1.5">
                Can I process PDFs online without installing software?
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Yes. Many everyday tools, including merge, split, compress, rotate, delete pages, watermark, and image conversion workflows, run directly in the browser.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-8 md:py-10 bg-white border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 text-center">
          <div>
            <h3 className="text-base md:text-lg font-bold text-slate-900 mb-1.5">Browser-first</h3>
            <p className="text-xs sm:text-sm text-slate-500">Most everyday PDF tools are designed to run in your browser before you download the result.</p>
          </div>
          <div>
            <h3 className="text-base md:text-lg font-bold text-slate-900 mb-1.5">AI disclosed</h3>
            <p className="text-xs sm:text-sm text-slate-500">AI features may send extracted text to configured AI providers so responses can be generated.</p>
          </div>
          <div>
            <h3 className="text-base md:text-lg font-bold text-slate-900 mb-1.5">Policy visible</h3>
            <p className="text-xs sm:text-sm text-slate-500">Privacy Policy and Terms are published openly so handling rules are easy to review.</p>
          </div>
        </div>
      </section>
    </>
  );
};

export default Home;
