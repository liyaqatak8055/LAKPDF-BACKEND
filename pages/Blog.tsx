import React, { useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Clock, 
  Tag, 
  Search, 
  Sparkles, 
  BookOpen, 
  CheckCircle2, 
  ArrowRight, 
  HelpCircle,
  FolderOpen
} from "lucide-react";

interface ToolGuideSeed {
  name: string;
  path: string;
  category: string;
  tags: string[];
  actionLabel?: string;
}

interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  tags: string[];
  category: string;
  toolPath: string;
  toolName: string;
  actionLabel: string;
  imageKey: string;
}

const toolSeeds: ToolGuideSeed[] = [
  { name: "Merge PDF", path: "/merge", category: "PDF Core", tags: ["merge", "combine", "pdf"], actionLabel: "Merge PDF" },
  { name: "Split PDF", path: "/split", category: "PDF Core", tags: ["split", "extract", "pages"], actionLabel: "Split PDF" },
  { name: "Compress PDF", path: "/compress", category: "Optimization", tags: ["compress", "optimize", "size"], actionLabel: "Compress PDF" },
  { name: "Organize PDF", path: "/organize-pdf", category: "PDF Core", tags: ["organize", "reorder", "manage"], actionLabel: "Organize PDF" },
  { name: "Image to PDF", path: "/img-to-pdf", category: "Conversion", tags: ["image", "jpg", "png"], actionLabel: "Convert to PDF" },
  { name: "PDF to Image", path: "/pdf-to-img", category: "Conversion", tags: ["pdf to image", "jpg", "png"], actionLabel: "Convert to Image" },
  { name: "Compress Image", path: "/compress-img", category: "Optimization", tags: ["compress image", "kb", "quality"], actionLabel: "Compress Image" },
  { name: "Compress Image to 50 KB", path: "/advance-compress-img", category: "Optimization", tags: ["compress image", "50kb", "optimization"], actionLabel: "Compress Image to 50 KB" },
  { name: "Convert PDF", path: "/convert", category: "Conversion", tags: ["convert", "format", "pdf"], actionLabel: "Convert PDF" },
  { name: "PDF to Word", path: "/pdf-to-word", category: "Conversion", tags: ["pdf to word", "docx", "editable"], actionLabel: "Convert to Word" },
  { name: "PDF to PowerPoint", path: "/pdf-to-powerpoint", category: "Conversion", tags: ["pdf to ppt", "slides", "presentation"], actionLabel: "Convert to PowerPoint" },
  { name: "Word to PDF", path: "/word-to-pdf", category: "Conversion", tags: ["word to pdf", "doc", "office"], actionLabel: "Convert to PDF" },
  { name: "PowerPoint to PDF", path: "/powerpoint-to-pdf", category: "Conversion", tags: ["ppt to pdf", "slides", "office"], actionLabel: "Convert to PDF" },
  { name: "Rotate PDF", path: "/rotate", category: "PDF Tools", tags: ["rotate", "orientation", "pdf"], actionLabel: "Rotate PDF" },
  { name: "Add Page Numbers", path: "/page-number", category: "PDF Tools", tags: ["page numbers", "pagination", "pdf"], actionLabel: "Add Page Numbers" },
  { name: "Watermark PDF", path: "/watermark", category: "PDF Tools", tags: ["watermark", "branding", "pdf"], actionLabel: "Add Watermark" },
  { name: "Crop PDF", path: "/crop-pdf", category: "PDF Tools", tags: ["crop", "margins", "pdf"], actionLabel: "Crop PDF" },
  { name: "Scan Document", path: "/scan-pdf", category: "PDF Tools", tags: ["scan", "document", "pdf"], actionLabel: "Scan Document" },
  { name: "Sign PDF", path: "/sign-pdf", category: "PDF Tools", tags: ["sign", "signature", "pdf"], actionLabel: "Sign PDF" },
  { name: "OCR PDF", path: "/ocr-pdf", category: "PDF Tools", tags: ["ocr", "extract text", "scan"], actionLabel: "Extract Text" },
  { name: "Compare PDF", path: "/compare-pdf", category: "PDF Tools", tags: ["compare", "differences", "pdf"], actionLabel: "Compare PDF" },
  { name: "Delete Pages", path: "/delete-page", category: "PDF Core", tags: ["delete pages", "remove", "pdf"], actionLabel: "Delete Pages" },
  { name: "AI Summary", path: "/summarizer-qa", category: "AI Tools", tags: ["summary", "qa", "ai"], actionLabel: "Generate Summary" },
  { name: "Detect Duplicates", path: "/detect-duplicates", category: "PDF Core", tags: ["duplicates", "cleanup", "pdf"], actionLabel: "Detect Duplicates" },
  { name: "AI PDF to MCQ", path: "/ai-pdf-to-mcq", category: "AI Tools", tags: ["mcq", "questions", "exam"], actionLabel: "Generate MCQs" },
  { name: "PDF Editor", path: "/pdf-editor", category: "PDF Tools", tags: ["edit", "annotate", "pdf"], actionLabel: "Open PDF Editor" },
  { name: "AI Interview Generator", path: "/ai-interview-generator", category: "AI Tools", tags: ["interview", "questions", "ai"], actionLabel: "Generate Questions" },
];

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const blogPosts: BlogPost[] = toolSeeds.map((tool) => ({
  slug: `${slugify(tool.name)}-step-by-step-guide`,
  title: `How to Use ${tool.name} Online Free – Step-by-Step Guide`,
  excerpt: `Learn how to use ${tool.name} on lakpdf.com with clear step-by-step instructions, real use cases, screenshots, tips and FAQs. No signup required.`,
  date: "2025-07-21",
  readTime: "5 min read",
  tags: tool.tags,
  category: tool.category,
  toolPath: tool.path,
  toolName: tool.name,
  actionLabel: tool.actionLabel || tool.name,
  imageKey: tool.path.replace(/^\//, "").replace(/[^a-z0-9-]/gi, "-"),
}));

const defaultStepImages = [
  { src: "/blog-images/step-1-visit-lakpdf.svg", alt: "Homepage screenshot" },
  { src: "/blog-images/step-2-upload-file.svg", alt: "Upload section screenshot" },
  { src: "/blog-images/step-3-process-file.svg", alt: "Processing section screenshot" },
  { src: "/blog-images/step-4-download-result.svg", alt: "Result page screenshot" },
];

const getStepImagesForPost = (slug: string) => {
  const post = blogPosts.find((item) => item.slug === slug);
  if (!post) return defaultStepImages;
  return [
    { src: `/blog-images/tools/${post.imageKey}/step-1-visit-homepage.jpg`, alt: "Image 1 (homepage screenshot)" },
    { src: `/blog-images/tools/${post.imageKey}/step-2-upload-pdf.jpg`, alt: "Image 2 (upload section)" },
    { src: `/blog-images/tools/${post.imageKey}/step-3-click-process.jpg`, alt: "Image 3 (processing)" },
    { src: `/blog-images/tools/${post.imageKey}/step-4-download-file.jpg`, alt: "Image 4 (result page)" },
  ];
};

const getToolUseCases = (post: BlogPost): string[] => {
  const byPath: Record<string, string[]> = {
    "/merge": [
      "Combine offer letter, ID proof and forms into one submission-ready PDF.",
      "Bundle monthly reports into one shareable file for your team.",
      "Merge chapters of a book or study material into a single PDF.",
      "Combine scanned pages into one document for email or upload.",
    ],
    "/split": [
      "Extract only required pages from a long government document.",
      "Create chapter-wise PDFs from study material for focused revision.",
      "Separate individual invoices from a combined billing PDF.",
      "Share only specific pages from a confidential report.",
    ],
    "/compress": [
      "Reduce file size for Gmail email attachment limits (25MB max).",
      "Speed up uploads on slow internet connection.",
      "Compress PDF for WhatsApp sharing without quality loss.",
      "Shrink large scanned documents before archiving.",
    ],
    "/img-to-pdf": [
      "Convert scanned images into one printable PDF document.",
      "Create a photo portfolio as a shareable PDF file.",
      "Convert JPG screenshots to PDF for official submissions.",
      "Bundle multiple photos into one PDF for easy sharing.",
    ],
    "/pdf-to-img": [
      "Extract high-quality images from a PDF presentation.",
      "Convert PDF pages to JPG for use in social media posts.",
      "Get individual page images from a scanned document.",
      "Convert product catalog pages to images for website use.",
    ],
    "/compress-img": [
      "Reduce JPG/PNG size for faster website loading speed.",
      "Compress profile photo before uploading to job portals.",
      "Shrink product images for ecommerce listings.",
      "Compress screenshots before emailing to support teams.",
    ],
    "/advance-compress-img": [
      "Compress passport photo to exactly 50KB for government forms.",
      "Reduce image size for UPSC/SSC/bank exam form uploads.",
      "Get image under 50KB limit for college admission portals.",
      "Compress ID proof image for online job applications.",
    ],
    "/pdf-to-word": [
      "Edit text from an existing PDF in Microsoft Word.",
      "Reuse proposal content without retyping from scratch.",
      "Convert scanned PDF to editable DOCX for modification.",
      "Extract and edit text from PDF report or resume.",
    ],
    "/word-to-pdf": [
      "Convert resume DOCX to PDF for professional submission.",
      "Turn assignment Word document into PDF before submission.",
      "Convert job application letter to PDF for email attachment.",
      "Share presentation draft as PDF to preserve formatting.",
    ],
  };

  if (byPath[post.toolPath]) {
    return byPath[post.toolPath];
  }
  if (post.category === "AI Tools") {
    return [
      `Use ${post.toolName} to analyze and extract information instantly with AI.`,
      "Save hours of manual reading and note taking.",
      "Generate test questions, summaries or interview practice from your notes.",
      "Private and safe — document text processed only for your request.",
    ];
  }
  if (post.category === "Conversion") {
    return [
      `Convert files quickly with ${post.toolName} for editing or sharing.`,
      "Maintain compatibility across office and mobile devices.",
      "No installation needed — works directly in browser.",
      "Fast conversion with quality preservation.",
    ];
  }
  return [
    `Use ${post.toolName} to complete document processing faster.`,
    "Keep workflow simple with browser-based steps.",
    "No signup or installation required.",
    "Works on all devices including mobile and tablet.",
  ];
};

const StepCard: React.FC<{
  stepNumber: number;
  title: string;
  subtitle: string;
  image: { src: string; alt: string };
  fallbackImage: { src: string; alt: string };
}> = ({ stepNumber, title, subtitle, image, fallbackImage }) => {
  const [src, setSrc] = React.useState(image.src);
  const [alt, setAlt] = React.useState(image.alt);

  React.useEffect(() => {
    setSrc(image.src);
    setAlt(image.alt);
  }, [image.src, image.alt]);

  return (
    <div className="bg-white dark:bg-dark-surface border border-slate-200/90 dark:border-dark-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-9 h-9 rounded-xl bg-primary-500 text-white font-bold flex items-center justify-center text-sm flex-shrink-0 shadow-sm">
          {stepNumber}
        </div>
        <div>
          <h4 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">{title}</h4>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">{subtitle}</p>
        </div>
      </div>
      
      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-slate-900/50">
        <img
          src={src}
          alt={alt}
          className="w-full h-auto object-cover"
          loading="lazy"
          onError={() => {
            if (src !== fallbackImage.src) {
              setSrc(fallbackImage.src);
              setAlt(fallbackImage.alt);
            }
          }}
        />
      </div>
    </div>
  );
};

export const Blog: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    blogPosts.forEach((post) => set.add(post.category));
    return ["All", ...Array.from(set)];
  }, []);

  const filteredPosts = useMemo(() => {
    return blogPosts.filter((post) => {
      const matchesSearch = 
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.toolName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = 
        selectedCategory === "All" || post.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <>
      <Helmet>
        <title>PDF Tools Blog & Guides – Step-by-Step Tutorials | LAK PDF</title>
        <meta
          name="description"
          content="Comprehensive step-by-step guides for every PDF tool on LAK PDF. Learn how to merge, compress, convert, sign, and edit PDFs online for free with screenshots and FAQs."
        />
        <meta name="keywords" content="merge pdf guide, compress pdf tutorial, pdf to word how to, split pdf steps, sign pdf free guide, pdf tools tutorial, lakpdf guides" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://lakpdf.com/blog" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Blog",
          "name": "LAK PDF Blog & Guides",
          "description": "Comprehensive step-by-step guides for PDF tools including merge, compress, convert, sign, and edit PDF.",
          "url": "https://lakpdf.com/blog",
          "publisher": {
            "@type": "Organization",
            "name": "LAK PDF",
            "url": "https://lakpdf.com"
          }
        })}</script>
      </Helmet>

      <div className="min-h-screen py-8 md:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Back Button */}
          <div className="mb-6 sm:mb-8">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-dark-surface border border-slate-200/90 dark:border-dark-border shadow-xs hover:shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all group"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1 text-slate-500 dark:text-slate-400 group-hover:text-primary-500" />
              <span>Back</span>
            </button>
          </div>

          {/* ── HEADER ── */}
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-50 dark:bg-primary-950/60 border border-primary-200/80 dark:border-primary-800/60 text-primary-700 dark:text-primary-300 text-xs font-semibold uppercase tracking-wider mb-5">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Free Knowledge Hub</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
              LAK PDF Guides & Tutorials
            </h1>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              Step-by-step tutorials, practical use-cases, and pro tips to help you master digital documents in seconds.
            </p>
          </div>

          {/* ── SEARCH & CATEGORY FILTER BAR ── */}
          <div className="bg-white dark:bg-dark-surface p-4 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-dark-border shadow-sm mb-12 space-y-4">
            
            {/* Search Input */}
            <div className="relative">
              <label htmlFor="search-blog-input" className="sr-only">
                Search guides
              </label>
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                id="search-blog-input"
                type="text"
                aria-label="Search guides"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search guides (e.g. merge, compress, word, government form, sign)..."
                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1 flex-shrink-0">
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Topic:</span>
              </span>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                    selectedCategory === cat
                      ? "bg-primary-500 text-white shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Result count */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-100 dark:border-dark-border/60">
              <span>Showing {filteredPosts.length} of {blogPosts.length} guides</span>
              {selectedCategory !== "All" && (
                <span>Filtered by: <strong>{selectedCategory}</strong></span>
              )}
            </div>
          </div>

          {/* ── GUIDES GRID ── */}
          {filteredPosts.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-dark-surface rounded-3xl border border-slate-200 dark:border-dark-border">
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No matching guides found</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Try searching with a different keyword or selecting 'All' topics.
              </p>
              <button
                onClick={() => { setSearchQuery(""); setSelectedCategory("All"); }}
                className="px-4 py-2 rounded-xl bg-primary-500 text-white text-xs font-bold"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
              {filteredPosts.map((post) => (
                <article 
                  key={post.slug} 
                  className="bg-white dark:bg-dark-surface rounded-3xl border border-slate-200/80 dark:border-dark-border p-6 hover:shadow-lg hover:border-primary-300 dark:hover:border-primary-700 transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[11px] font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 px-2.5 py-1 rounded-lg">
                        {post.category}
                      </span>
                      <span className="text-slate-400 text-xs flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{post.readTime}</span>
                      </span>
                    </div>

                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2 leading-snug group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {post.title}
                    </h2>

                    <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm line-clamp-2 mb-4 leading-relaxed">
                      {post.excerpt}
                    </p>
                  </div>

                  <div>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {post.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md inline-flex items-center gap-1 font-medium">
                          <Tag className="w-2.5 h-2.5" />
                          {tag}
                        </span>
                      ))}
                    </div>

                    <Link 
                      to={`/blog/${post.slug}`} 
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-600 dark:text-primary-400 group-hover:gap-2.5 transition-all"
                    >
                      <span>Read Step-by-Step Guide</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* ── BOTTOM DIRECT TOOL ACCESS CALLOUT ── */}
          <div className="bg-gradient-to-r from-primary-500 via-primary-600 to-indigo-600 rounded-3xl p-8 sm:p-10 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg shadow-primary-500/20">
            <div className="space-y-2 text-center md:text-left">
              <h3 className="text-2xl font-extrabold tracking-tight">Prefer to Jump Right In?</h3>
              <p className="text-white/80 text-xs sm:text-sm max-w-xl">
                All 30+ tools are ready to use immediately without downloading guides or signing up.
              </p>
            </div>
            <Link
              to="/tools"
              className="px-6 py-3 bg-white text-slate-900 rounded-xl font-bold text-xs sm:text-sm shadow-md hover:bg-slate-100 transition-all flex items-center gap-2 flex-shrink-0"
            >
              <span>Browse All Tools</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </div>
    </>
  );
};

export const BlogPost: React.FC = () => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const post = blogPosts.find((item) => item.slug === slug);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/blog');
    }
  };

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <Helmet>
          <title>Guide Not Found | LAK PDF Blog</title>
          <meta name="robots" content="noindex, follow" />
        </Helmet>
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
          <HelpCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">Guide Not Found</h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">The requested step-by-step tutorial does not exist.</p>
        <Link 
          to="/blog" 
          className="inline-flex items-center gap-2 bg-primary-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Guides</span>
        </Link>
      </div>
    );
  }

  const stepImages = getStepImagesForPost(post.slug);
  const useCases = getToolUseCases(post);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `Is ${post.toolName} free on lakpdf.com?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Yes, ${post.toolName} is 100% free with unlimited usage on lakpdf.com.`
        }
      },
      {
        "@type": "Question",
        name: `How long does ${post.toolName} processing take?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: "Processing is powered by in-browser WebAssembly and usually finishes in 2 to 5 seconds without server upload wait queues."
        }
      },
      {
        "@type": "Question",
        name: "Can I use this process on mobile?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, lakpdf.com tools are fully mobile-responsive and work on iPhone, Android, and tablets in any modern browser."
        }
      },
      {
        "@type": "Question",
        name: "Are my files safe during processing?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Your files are processed locally inside your browser and are not permanently stored on any cloud server."
        }
      }
    ]
  };

  return (
    <>
      <Helmet>
        <title>{post.title} | LAK PDF Blog</title>
        <meta name="description" content={post.excerpt} />
        <meta name="keywords" content={`${post.tags.join(", ")}, lakpdf.com, free online tool, no signup`} />
        <meta property="og:title" content={`${post.title} | LAK PDF`} />
        <meta property="og:description" content={post.excerpt} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://lakpdf.com/blog/${post.slug}`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.excerpt} />
        <link rel="canonical" href={`https://lakpdf.com/blog/${post.slug}`} />
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": post.title,
          "description": post.excerpt,
          "datePublished": "2025-07-21",
          "dateModified": "2025-07-21",
          "author": { "@type": "Organization", "name": "LAK PDF", "url": "https://lakpdf.com" },
          "publisher": { "@type": "Organization", "name": "LAK PDF", "url": "https://lakpdf.com", "logo": { "@type": "ImageObject", "url": "https://lakpdf.com/favicon-192x192.png" } },
          "mainEntityOfPage": { "@type": "WebPage", "@id": `https://lakpdf.com/blog/${post.slug}` },
          "keywords": post.tags.join(", ")
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "HowTo",
          "name": post.title,
          "description": post.excerpt,
          "totalTime": "PT2M",
          "tool": [{ "@type": "HowToTool", "name": "Web Browser" }],
          "step": [
            { "@type": "HowToStep", "position": "1", "name": "Visit LAK PDF", "text": `Open lakpdf.com and go to the ${post.toolName} tool from Home or All Tools page.`, "url": `https://lakpdf.com${post.toolPath}` },
            { "@type": "HowToStep", "position": "2", "name": "Upload your file", "text": "Click the upload button or drag and drop your file into the upload area.", "url": `https://lakpdf.com${post.toolPath}` },
            { "@type": "HowToStep", "position": "3", "name": post.actionLabel, "text": `Choose your settings if needed, then click the '${post.actionLabel}' button to start processing.`, "url": `https://lakpdf.com${post.toolPath}` },
            { "@type": "HowToStep", "position": "4", "name": "Download result", "text": "Once processing completes, click Download to save the output file to your device.", "url": `https://lakpdf.com${post.toolPath}` }
          ]
        })}</script>
      </Helmet>

      <div className="min-h-screen py-8 md:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          
          {/* Back & Breadcrumb Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-dark-surface border border-slate-200/90 dark:border-dark-border shadow-xs hover:shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all group"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1 text-slate-500 dark:text-slate-400 group-hover:text-primary-500" />
              <span>Back</span>
            </button>

            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Link to="/" className="hover:text-primary-500 transition-colors">Home</Link>
              <span>/</span>
              <Link to="/blog" className="hover:text-primary-500 transition-colors">Blog & Guides</Link>
              <span>/</span>
              <span className="text-slate-700 dark:text-slate-200 truncate max-w-[200px] sm:max-w-xs">{post.toolName} Guide</span>
            </div>
          </div>

          <article className="bg-white dark:bg-dark-surface border border-slate-200/90 dark:border-dark-border rounded-3xl p-6 sm:p-10 shadow-sm">
            
            {/* Meta badges */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 px-3 py-1 rounded-lg">
                {post.category}
              </span>
              <span className="text-slate-400 text-xs flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{post.readTime}</span>
              </span>
              <span className="text-slate-400 text-xs">• Free Tutorial</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight leading-tight">
              {post.title}
            </h1>

            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed mb-8 pb-6 border-b border-slate-100 dark:border-dark-border">
              {post.excerpt}
            </p>

            {/* Quick Action Top Pill */}
            <div className="bg-primary-50/60 dark:bg-primary-950/30 border border-primary-200/70 dark:border-primary-900/50 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 mb-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-500 text-white flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Ready to run this tool now?</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Free, private, zero installation needed.</p>
                </div>
              </div>
              <Link
                to={post.toolPath}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-primary-500/20 transition-all"
              >
                <span>Launch {post.toolName}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Section 1: Overview */}
            <section className="mb-10">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3">
                What is {post.toolName}?
              </h2>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm sm:text-base">
                <strong>{post.toolName}</strong> is a high-speed, browser-first online utility provided for free on{" "}
                <a href="https://lakpdf.com" className="text-primary-500 font-semibold hover:underline">lakpdf.com</a>. It allows you to process, convert, or optimize PDF documents directly on your device without downloading any software or paying for an expensive subscription.
              </p>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm sm:text-base mt-3">
                Whether you are a student submitting academic assignments, a job applicant preparing official documents, or a professional sharing contracts, this guide shows you how to get it done in under two minutes.
              </p>
            </section>

            {/* Section 2: Common Use Cases */}
            <section className="mb-10">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-4">
                Common Use Cases
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {useCases.map((item, idx) => (
                  <div 
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-dark-border flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Section 3: Step-by-Step Instructions */}
            <section className="mb-12 space-y-6">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-4">
                Step-by-Step Process (With Visuals)
              </h2>

              <StepCard
                stepNumber={1}
                title="Step 1: Visit LAK PDF"
                subtitle="Navigate to lakpdf.com and select the tool from the Home or All Tools directory."
                image={stepImages[0]}
                fallbackImage={defaultStepImages[0]}
              />

              <StepCard
                stepNumber={2}
                title="Step 2: Upload Your File"
                subtitle="Click the upload button or drag and drop your PDF or image files into the working canvas."
                image={stepImages[1]}
                fallbackImage={defaultStepImages[1]}
              />

              <StepCard
                stepNumber={3}
                title={`Step 3: Click '${post.actionLabel}'`}
                subtitle="Adjust formatting preferences if needed, then initiate client-side processing."
                image={stepImages[2]}
                fallbackImage={defaultStepImages[2]}
              />

              <StepCard
                stepNumber={4}
                title="Step 4: Download Your Result"
                subtitle="Your processed document is ready instantly. Click Download to save it to your device."
                image={stepImages[3]}
                fallbackImage={defaultStepImages[3]}
              />
            </section>

            {/* Section 4: FAQs */}
            <section className="mb-10">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-4">
                Frequently Asked Questions
              </h2>
              <div className="space-y-3">
                <div className="border border-slate-200 dark:border-dark-border rounded-xl p-4">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">1. Is {post.toolName} free on LAK PDF?</h3>
                  <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                    Yes, {post.toolName} is 100% free with unlimited conversions on lakpdf.com. No account or credit card required.
                  </p>
                </div>
                <div className="border border-slate-200 dark:border-dark-border rounded-xl p-4">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">2. Are my documents kept private and secure?</h3>
                  <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                    Yes. Files are processed locally inside your browser using WebAssembly. Your files are not stored on any remote cloud server.
                  </p>
                </div>
                <div className="border border-slate-200 dark:border-dark-border rounded-xl p-4">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">3. Can I use this tool on my smartphone?</h3>
                  <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                    Yes, LAK PDF is fully responsive and works smoothly on iOS Safari, Android Chrome, and tablets.
                  </p>
                </div>
              </div>
            </section>

            {/* Bottom Call to Action */}
            <div className="bg-gradient-to-br from-primary-500 to-indigo-600 rounded-2xl p-6 sm:p-8 text-white text-center space-y-4">
              <h3 className="text-xl font-bold">Start Using {post.toolName} Now</h3>
              <p className="text-xs sm:text-sm text-white/80 max-w-md mx-auto">
                No sign-up. No credit card. Experience lightning-fast, secure document editing right now.
              </p>
              <Link
                to={post.toolPath}
                className="inline-flex items-center gap-2 bg-white text-slate-900 px-6 py-2.5 rounded-xl font-bold text-xs hover:bg-slate-100 transition-colors shadow-md"
              >
                <span>Open {post.toolName}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

          </article>
        </div>
      </div>
    </>
  );
};
