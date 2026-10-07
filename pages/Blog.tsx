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
  FolderOpen,
  Calendar,
  User,
  ShieldCheck,
  ChevronRight,
  AlertTriangle,
  Info,
  Lightbulb,
  Share2
} from "lucide-react";
import { blogArticles, BlogArticle } from "../data/blogArticles";

interface ToolGuideSeed {
  name: string;
  path: string;
  category: string;
  tags: string[];
  actionLabel?: string;
}

const toolSeeds: ToolGuideSeed[] = [
  { name: "Merge PDF", path: "/merge", category: "PDF Core", tags: ["merge", "combine", "pdf"], actionLabel: "Merge PDF" },
  { name: "Split PDF", path: "/split", category: "PDF Core", tags: ["split", "extract", "pages"], actionLabel: "Split PDF" },
  { name: "Compress PDF", path: "/compress", category: "Optimization", tags: ["compress", "optimize", "size"], actionLabel: "Compress PDF" },
  { name: "Organize PDF", path: "/organize-pdf", category: "PDF Core", tags: ["organize", "reorder", "manage"], actionLabel: "Organize PDF" },
  { name: "Govt Exam Resizer", path: "/govt-exam-resizer", category: "Govt Forms & Exams", tags: ["upsc", "ssc", "photo resizer", "signature"], actionLabel: "Resize for Govt Exam" },
  { name: "Passport Photo Maker", path: "/passport-photo-maker", category: "Photography & ID", tags: ["passport photo", "300 dpi", "icao 9303"], actionLabel: "Create Passport Photo" },
  { name: "Protect PDF", path: "/protect-pdf", category: "Security & Privacy", tags: ["protect pdf", "aes-256", "password"], actionLabel: "Encrypt PDF" },
  { name: "Redact PDF", path: "/redact-pdf", category: "Document Security", tags: ["redact pdf", "aadhaar masking", "pii"], actionLabel: "Redact Sensitive Data" },
  { name: "OCR PDF", path: "/ocr-pdf", category: "Document AI", tags: ["ocr", "extract text", "scanned pdf"], actionLabel: "Extract Text via OCR" },
  { name: "PDF to Word", path: "/pdf-to-word", category: "Conversion", tags: ["pdf to word", "docx", "editable"], actionLabel: "Convert to Word" },
  { name: "Word to PDF", path: "/word-to-pdf", category: "Conversion", tags: ["word to pdf", "doc", "office"], actionLabel: "Convert to PDF" },
  { name: "Sign PDF", path: "/sign-pdf", category: "PDF Tools", tags: ["sign", "signature", "pdf"], actionLabel: "Sign PDF" },
];

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

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
    set.add("All");
    blogArticles.forEach((a) => set.add(a.category));
    return Array.from(set);
  }, []);

  const filteredArticles = useMemo(() => {
    return blogArticles.filter((article) => {
      const matchCat = selectedCategory === "All" || article.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        article.title.toLowerCase().includes(q) ||
        article.excerpt.toLowerCase().includes(q) ||
        article.tags.some((t) => t.toLowerCase().includes(q)) ||
        article.category.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <>
      <Helmet>
        <title>LAK PDF Knowledge Hub & Guides – Expert Document Engineering</title>
        <meta
          name="description"
          content="Authoritative in-depth guides on PDF security, ICAO passport photo specifications, UPSC/SSC document resizing, client-side encryption, and OCR."
        />
        <meta name="keywords" content="pdf guides, upsc photo resizer guide, client side pdf security, aes-256 encryption, redact aadhaar, lakpdf blog" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://lakpdf.com/blog" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Blog",
          "name": "LAK PDF Knowledge Hub & Guides",
          "description": "Comprehensive engineering and user guides on document processing, privacy standards, and government exam formats.",
          "url": "https://lakpdf.com/blog",
          "publisher": {
            "@type": "Organization",
            "name": "LAK PDF",
            "url": "https://lakpdf.com",
            "logo": "https://lakpdf.com/logo-80x80.webp"
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
              <span>Knowledge Hub & Research Guides</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
              LAK PDF Technical & User Guides
            </h1>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              In-depth research, government portal specifications, cryptography deep dives, and step-by-step tutorials written by our systems architects.
            </p>
          </div>

          {/* ── SEARCH & CATEGORY FILTER BAR ── */}
          <div className="bg-white dark:bg-dark-surface p-4 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-dark-border shadow-sm mb-12 space-y-4">
            
            {/* Search Input */}
            <div className="relative">
              <label htmlFor="search-blog-input" className="sr-only">Search guides</label>
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                id="search-blog-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search guides: UPSC, SSC, AES-256, WebAssembly, Redaction, OCR, 300 DPI..."
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
              <span>Showing {filteredArticles.length} of {blogArticles.length} in-depth research guides</span>
              {selectedCategory !== "All" && (
                <span>Filtered by: <strong>{selectedCategory}</strong></span>
              )}
            </div>
          </div>

          {/* ── GUIDES GRID ── */}
          {filteredArticles.length === 0 ? (
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
              {filteredArticles.map((article) => (
                <article 
                  key={article.slug} 
                  className="bg-white dark:bg-dark-surface rounded-3xl border border-slate-200/80 dark:border-dark-border p-7 hover:shadow-xl hover:border-primary-400 dark:hover:border-primary-600 transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[11px] font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 px-3 py-1 rounded-lg">
                        {article.category}
                      </span>
                      <span className="text-slate-400 text-xs flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{article.readTime}</span>
                      </span>
                    </div>

                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3 leading-snug group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      <Link to={`/blog/${article.slug}`}>
                        {article.title}
                      </Link>
                    </h2>

                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-6">
                      {article.excerpt}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-dark-border/60">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={article.author.avatar}
                          alt={article.author.name}
                          className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-dark-border"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <div>
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{article.author.name}</p>
                          <p className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{article.date}</span>
                          </p>
                        </div>
                      </div>

                      <Link 
                        to={`/blog/${article.slug}`} 
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-600 dark:text-primary-400 group-hover:gap-2.5 transition-all bg-primary-50 dark:bg-primary-950/50 hover:bg-primary-100 dark:hover:bg-primary-900/50 px-3.5 py-2 rounded-xl"
                      >
                        <span>Read Full Guide</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* ── BOTTOM DIRECT TOOL ACCESS CALLOUT ── */}
          <div className="bg-gradient-to-r from-primary-500 via-primary-600 to-indigo-600 rounded-3xl p-8 sm:p-10 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg shadow-primary-500/20">
            <div className="space-y-2 text-center md:text-left">
              <h3 className="text-2xl font-extrabold tracking-tight">Need to Process a Document Right Now?</h3>
              <p className="text-white/80 text-xs sm:text-sm max-w-xl">
                Explore our full suite of 100% client-side, zero-upload PDF, image, and document tools.
              </p>
            </div>
            <Link
              to="/all-tools"
              className="px-6 py-3 bg-white text-slate-900 rounded-xl font-bold text-xs sm:text-sm shadow-md hover:bg-slate-100 transition-all flex items-center gap-2 flex-shrink-0"
            >
              <span>Explore All Tools</span>
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

  // Check if it matches our deep articles (with legacy slug fallback)
  const resolvedSlug = slug === "how-to-compress-pdf-without-losing-quality" 
    ? "lossless-vs-lossy-pdf-compression" 
    : slug;
  const article = blogArticles.find((item) => item.slug === resolvedSlug || item.slug === slug);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/blog');
    }
  };

  if (!article) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <Helmet>
          <title>Guide Not Found | LAK PDF Knowledge Hub</title>
          <meta name="robots" content="noindex, follow" />
        </Helmet>
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
          <HelpCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">Guide Not Found</h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">The requested research guide or tutorial does not exist.</p>
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

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: article.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer
      }
    }))
  };

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt,
    datePublished: article.date,
    dateModified: article.updatedDate || article.date,
    author: {
      "@type": "Person",
      name: article.author.name,
      jobTitle: article.author.role,
      url: "https://lakpdf.com/about"
    },
    publisher: {
      "@type": "Organization",
      name: "LAK PDF",
      url: "https://lakpdf.com",
      logo: {
        "@type": "ImageObject",
        url: "https://lakpdf.com/logo-80x80.webp"
      }
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://lakpdf.com/blog/${article.slug}`
    },
    keywords: article.tags.join(", ")
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://lakpdf.com"
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Knowledge Hub",
        item: "https://lakpdf.com/blog"
      },
      {
        "@type": "ListItem",
        position: 3,
        name: article.title,
        item: `https://lakpdf.com/blog/${article.slug}`
      }
    ]
  };

  return (
    <>
      <Helmet>
        <title>{article.metaTitle || `${article.title} | LAK PDF`}</title>
        <meta name="description" content={article.excerpt} />
        <meta name="keywords" content={`${article.tags.join(", ")}, lakpdf, client-side document processing`} />
        <meta property="og:title" content={article.title} />
        <meta property="og:description" content={article.excerpt} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://lakpdf.com/blog/${article.slug}`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={article.title} />
        <meta name="twitter:description" content={article.excerpt} />
        <link rel="canonical" href={`https://lakpdf.com/blog/${article.slug}`} />
        <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
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
              <span>Back to Guides</span>
            </button>

            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Link to="/" className="hover:text-primary-500 transition-colors">Home</Link>
              <span>/</span>
              <Link to="/blog" className="hover:text-primary-500 transition-colors">Knowledge Hub</Link>
              <span>/</span>
              <span className="text-slate-700 dark:text-slate-200 truncate max-w-[200px] sm:max-w-xs">{article.category}</span>
            </div>
          </div>

          <article className="bg-white dark:bg-dark-surface border border-slate-200/90 dark:border-dark-border rounded-3xl p-6 sm:p-12 shadow-sm">
            
            {/* Meta badges */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <span className="text-xs font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 px-3.5 py-1 rounded-xl">
                {article.category}
              </span>
              <span className="text-slate-400 text-xs flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>{article.readTime}</span>
              </span>
              <span className="text-slate-400 text-xs flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Published: {article.date}</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white mb-6 tracking-tight leading-tight">
              {article.title}
            </h1>

            {/* Author Profile Strip */}
            <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-dark-border mb-8">
              <img
                src={article.author.avatar}
                alt={article.author.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-primary-500/30"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{article.author.name}</span>
                  <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Verified Author
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{article.author.role}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{article.author.bio}</p>
              </div>
            </div>

            <p className="text-slate-700 dark:text-slate-300 text-base sm:text-lg leading-relaxed mb-8 pb-6 border-b border-slate-100 dark:border-dark-border font-normal">
              {article.excerpt}
            </p>

            {/* Quick Action Tool Pill */}
            {article.toolPath && (
              <div className="bg-primary-50/70 dark:bg-primary-950/40 border border-primary-200/80 dark:border-primary-900/60 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 mb-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Ready to execute this in your browser?</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">100% client-side, zero cloud uploads, completely free.</p>
                  </div>
                </div>
                <Link
                  to={article.toolPath}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-primary-500/20 transition-all flex-shrink-0"
                >
                  <span>Launch {article.toolName}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}

            {/* Table of Contents */}
            {article.tableOfContents && article.tableOfContents.length > 0 && (
              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-dark-border mb-12">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary-500" />
                  <span>Table of Contents</span>
                </h3>
                <nav className="space-y-1.5">
                  {article.tableOfContents.map((toc) => (
                    <a
                      key={toc.id}
                      href={`#${toc.id}`}
                      className="block text-xs sm:text-sm text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors py-1 flex items-center gap-2"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-primary-500/70" />
                      <span>{toc.title}</span>
                    </a>
                  ))}
                </nav>
              </div>
            )}

            {/* Article Sections */}
            <div className="space-y-12">
              {article.sections.map((section) => (
                <section key={section.id} id={section.id} className="scroll-mt-20">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
                    {section.heading}
                  </h2>

                  <div className="space-y-4 text-slate-700 dark:text-slate-300 leading-relaxed text-sm sm:text-base">
                    {section.paragraphs.map((p, pIdx) => (
                      <p key={pIdx}>{p}</p>
                    ))}
                  </div>

                  {/* Optional Callout Block */}
                  {section.callout && (
                    <div className={`mt-5 p-5 rounded-2xl border flex items-start gap-3.5 ${
                      section.callout.type === 'warning'
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                        : section.callout.type === 'tip'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                        : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200'
                    }`}>
                      {section.callout.type === 'warning' ? (
                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      ) : section.callout.type === 'tip' ? (
                        <Lightbulb className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <h4 className="text-sm font-bold mb-1">{section.callout.title}</h4>
                        <p className="text-xs sm:text-sm leading-relaxed">{section.callout.text}</p>
                      </div>
                    </div>
                  )}

                  {/* Optional Table */}
                  {section.table && (
                    <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 dark:border-dark-border">
                      <table className="w-full text-left text-xs sm:text-sm">
                        <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-white font-bold border-b border-slate-200 dark:border-dark-border">
                          <tr>
                            {section.table.headers.map((h, hIdx) => (
                              <th key={hIdx} className="p-3 sm:p-4">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-dark-border">
                          {section.table.rows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="p-3 sm:p-4 text-slate-700 dark:text-slate-300 font-medium">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Optional Bullet Points */}
                  {section.bulletPoints && section.bulletPoints.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {section.bulletPoints.map((bp, bpIdx) => (
                        <div key={bpIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{bp}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>

            {/* FAQs Accordion */}
            {article.faqs && article.faqs.length > 0 && (
              <section id="frequently-asked-questions" className="mt-14 pt-10 border-t border-slate-100 dark:border-dark-border">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight flex items-center gap-2">
                  <HelpCircle className="w-6 h-6 text-primary-500" />
                  <span>Frequently Asked Questions</span>
                </h2>
                <div className="space-y-4">
                  {article.faqs.map((faq, fIdx) => (
                    <div key={fIdx} className="border border-slate-200 dark:border-dark-border rounded-2xl p-5 bg-slate-50/50 dark:bg-slate-900/40">
                      <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white mb-2">
                        {faq.question}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Tags Strip */}
            <div className="mt-12 pt-6 border-t border-slate-100 dark:border-dark-border flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-400 mr-2 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" /> Tags:
              </span>
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>

            {/* Bottom Call to Action */}
            <div className="mt-12 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-3xl p-6 sm:p-10 text-white text-center space-y-4 shadow-lg shadow-primary-500/20">
              <h3 className="text-2xl font-extrabold">Start Using {article.toolName} for Free</h3>
              <p className="text-xs sm:text-sm text-white/80 max-w-md mx-auto">
                No sign-up. No cloud uploads. 100% private in-browser document processing.
              </p>
              <Link
                to={article.toolPath}
                className="inline-flex items-center gap-2 bg-white text-slate-900 px-6 py-3 rounded-xl font-bold text-xs sm:text-sm hover:bg-slate-100 transition-colors shadow-md"
              >
                <span>Launch {article.toolName} Now</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

          </article>
        </div>
      </div>
    </>
  );
};
