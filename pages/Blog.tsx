import React from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Clock, Tag } from "lucide-react";

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
  { name: "Scan to PDF", path: "/scan-pdf", category: "PDF Tools", tags: ["scan", "document", "pdf"], actionLabel: "Scan to PDF" },
  { name: "Sign PDF", path: "/sign-pdf", category: "PDF Tools", tags: ["sign", "signature", "pdf"], actionLabel: "Sign PDF" },
  { name: "OCR PDF", path: "/ocr-pdf", category: "PDF Tools", tags: ["ocr", "extract text", "scan"], actionLabel: "Extract Text" },
  { name: "Compare PDF", path: "/compare-pdf", category: "PDF Tools", tags: ["compare", "differences", "pdf"], actionLabel: "Compare PDF" },
  { name: "Delete Pages", path: "/delete-page", category: "PDF Core", tags: ["delete pages", "remove", "pdf"], actionLabel: "Delete Pages" },
  { name: "AI Summarizer", path: "/summarizer-qa", category: "AI Tools", tags: ["summary", "qa", "ai"], actionLabel: "Generate Summary" },
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
    "/sign-pdf": [
      "Add digital signature to offer letter before emailing HR.",
      "Sign NDA or contract PDF without printing.",
      "Add your signature to a bank or legal document PDF.",
      "Sign agreement documents for freelance projects.",
    ],
    "/pdf-editor": [
      "Add text, highlights, and shape annotations to any PDF.",
      "Use editor controls with undo/redo and page navigation.",
      "Draw and write on PDF documents for review and feedback.",
      "Annotate study material with notes and highlights.",
    ],
    "/ocr-pdf": [
      "Extract searchable text from a scanned PDF document.",
      "Convert image-based PDF to text for copy-paste.",
      "Make scanned textbook pages searchable for study.",
      "Extract data from scanned invoices or receipts.",
    ],
    "/summarizer-qa": [
      "Summarize a lengthy research paper in seconds.",
      "Ask questions from a PDF textbook chapter for quick answers.",
      "Generate key points from a business report PDF.",
      "Quickly understand a legal document with AI Q&A.",
    ],
    "/ai-pdf-to-mcq": [
      "Generate multiple choice questions from study notes PDF.",
      "Create practice test from chapter PDF for exam revision.",
      "Auto-generate quiz questions from training material.",
      "Make MCQs from NCERT or textbook PDF chapters.",
    ],
    "/ai-interview-generator": [
      "Generate technical interview questions from your resume.",
      "Get HR and behavioral questions based on your experience.",
      "Prepare domain-specific questions from job description PDF.",
      "Practice interview preparation with AI-generated questions.",
    ],
    "/organize-pdf": [
      "Reorder pages in a scanned PDF for correct reading order.",
      "Move specific pages to correct position before sharing.",
      "Rearrange chapters in a merged PDF document.",
      "Sort pages in a legal document for proper sequence.",
    ],
    "/watermark": [
      "Add company logo watermark to confidential documents.",
      "Mark PDF as DRAFT or CONFIDENTIAL before sharing.",
      "Brand your PDF reports with company name watermark.",
      "Protect your original work with a custom watermark.",
    ],
    "/rotate": [
      "Fix upside-down scanned pages in a PDF.",
      "Rotate landscape pages to portrait for consistent viewing.",
      "Correct orientation of specific pages before sharing.",
      "Fix mobile-scanned documents with wrong rotation.",
    ],
    "/page-number": [
      "Add page numbers to a merged PDF before submission.",
      "Number pages in a research paper or report PDF.",
      "Add custom styled page numbers to presentation PDF.",
      "Format page numbers in thesis or assignment document.",
    ],
    "/crop-pdf": [
      "Remove extra white margins from a scanned PDF.",
      "Crop unwanted border areas from PDF pages.",
      "Trim oversized PDF pages to standard paper size.",
      "Clean up poorly scanned document pages.",
    ],
    "/scan-pdf": [
      "Scan physical documents using phone camera and save as PDF.",
      "Create PDF from notebook pages for digital storage.",
      "Digitize printed handouts into shareable PDF format.",
      "Scan receipts and bills into organized PDF documents.",
    ],
    "/compare-pdf": [
      "Find differences between two versions of a contract.",
      "Compare old and new draft of a legal document.",
      "Verify changes between original and edited PDF report.",
      "Spot edits between two versions of an academic paper.",
    ],
    "/delete-page": [
      "Remove blank or duplicate pages from a scanned PDF.",
      "Delete irrelevant pages before sharing a report.",
      "Remove cover page from a PDF before sending.",
      "Clean up a merged PDF by deleting unwanted pages.",
    ],
    "/detect-duplicates": [
      "Find and remove duplicate pages in a large merged PDF.",
      "Clean up scanned document with repeated pages.",
      "Detect duplicate content in combined reports.",
      "Remove redundant pages before archiving documents.",
    ],
  };
  if (byPath[post.toolPath]) return byPath[post.toolPath];
  if (post.category === "AI Tools") {
    return [
      `Generate smart output from your document using ${post.toolName}.`,
      "Speed up revision and analysis for learning workflows.",
      "Save hours of manual work with AI-powered processing.",
      "Get structured output from unstructured PDF content.",
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
  title: string;
  subtitle: string;
  image: { src: string; alt: string };
  fallbackImage: { src: string; alt: string };
}> = ({ title, subtitle, image, fallbackImage }) => {
  const [src, setSrc] = React.useState(image.src);
  const [alt, setAlt] = React.useState(image.alt);

  React.useEffect(() => {
    setSrc(image.src);
    setAlt(image.alt);
  }, [image.src, image.alt]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <h4 className="text-lg font-semibold text-slate-900 mb-2">{title}</h4>
      <p className="text-slate-600 mb-3">{subtitle}</p>
      <p className="text-sm font-medium text-slate-700 mb-2">📷 {alt}</p>
      <img
        src={src}
        alt={alt}
        className="w-full rounded-lg border border-slate-200"
        loading="lazy"
        onError={() => {
          if (src !== fallbackImage.src) {
            setSrc(fallbackImage.src);
            setAlt(fallbackImage.alt);
          }
        }}
      />
    </div>
  );
};

export const Blog: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>PDF Tools Blog – Free Step-by-Step Guides | LAK PDF</title>
        <meta
          name="description"
          content="Free step-by-step guides for every PDF tool on LAK PDF. Learn how to merge, compress, convert, sign and edit PDF files online with screenshots and FAQs."
        />
        <meta name="keywords" content="merge pdf guide, compress pdf tutorial, pdf to word how to, split pdf steps, sign pdf free guide, pdf tools tutorial" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://lakpdf.com/blog" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Blog",
          "name": "LAK PDF Blog",
          "description": "Free step-by-step guides for PDF tools including merge, compress, convert, sign and edit PDF.",
          "url": "https://lakpdf.com/blog",
          "publisher": {
            "@type": "Organization",
            "name": "LAK PDF",
            "url": "https://lakpdf.com"
          }
        })}</script>
      </Helmet>

      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center gap-2 text-primary-500 hover:text-primary-600 mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-3">LAK PDF Blog</h1>
          <p className="text-slate-600 max-w-3xl mx-auto">
            Every tool has a dedicated guide page with introduction, image-based steps, and FAQs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {blogPosts.map((post) => (
            <article key={post.slug} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-medium text-primary-500 bg-primary-50 px-2 py-1 rounded">{post.category}</span>
                <span className="text-slate-400 text-xs flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {post.readTime}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">{post.title}</h2>
              <p className="text-slate-600 text-sm mb-3">{post.excerpt}</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {post.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded inline-flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
              </div>
              <Link to={`/blog/${post.slug}`} className="text-primary-500 font-medium hover:text-primary-600">
                Read Guide →
              </Link>
            </article>
          ))}
        </div>
      </div>
    </>
  );
};

export const BlogPost: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = blogPosts.find((item) => item.slug === slug);

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <Helmet>
          <title>Guide Not Found | LAK PDF Blog</title>
          <meta name="robots" content="noindex, follow" />
        </Helmet>
        <h1 className="text-3xl font-bold text-slate-900 mb-3">Guide Not Found</h1>
        <p className="text-slate-600 mb-6">The requested blog guide does not exist.</p>
        <Link to="/blog" className="inline-flex items-center gap-2 bg-primary-500 text-white px-5 py-2.5 rounded-lg">
          Back to Blog
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
          text: `Yes, ${post.toolName} can be used online with a simple workflow on lakpdf.com.`
        }
      },
      {
        "@type": "Question",
        name: `How long does ${post.toolName} processing take?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: "Processing time depends on file size and device performance, but usually completes quickly."
        }
      },
      {
        "@type": "Question",
        name: "Can I use this process on mobile?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, lakpdf.com tools are mobile friendly and can be used on modern browsers."
        }
      },
      {
        "@type": "Question",
        name: "What if processing fails?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Retry with a smaller file, stable network, and supported format. You can also refresh and try again."
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

      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link to="/blog" className="inline-flex items-center gap-2 text-primary-500 hover:text-primary-600 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Blog
        </Link>

        <article className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">{post.title}</h1>
          <p className="text-sm text-slate-500 mb-6">{post.date} • {post.readTime}</p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">What is {post.toolName}?</h2>
            <p className="text-slate-700 leading-7">
              <strong>{post.toolName}</strong> is a free online tool available on{" "}
              <a href="https://lakpdf.com" className="text-primary-500 hover:underline">lakpdf.com</a> that lets you
              process PDF files directly in your browser — no software installation, no account required.
              This guide explains exactly how to use it step by step with screenshots and real-world examples.
            </p>
            <p className="text-slate-700 leading-7 mt-3">
              Whether you are a student, professional, or working from home, this tool helps you complete
              your document task in under 2 minutes for free.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">Common Use Cases</h2>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              {useCases.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="mb-8 space-y-5">
            <h2 className="text-2xl font-semibold text-slate-900">Step-by-Step Process (With Images)</h2>

            <StepCard
              title="Step 1: Visit lakpdf.com"
              subtitle="Open lakpdf.com and go to the required tool from Home or All Tools."
              image={stepImages[0]}
              fallbackImage={defaultStepImages[0]}
            />

            <StepCard
              title="Step 2: Upload your PDF"
              subtitle="Use upload box to add your input file (or files, based on tool)."
              image={stepImages[1]}
              fallbackImage={defaultStepImages[1]}
            />

            <StepCard
              title={`Step 3: Click ${post.actionLabel}`}
              subtitle="Choose settings if needed, then run processing."
              image={stepImages[2]}
              fallbackImage={defaultStepImages[2]}
            />

            <StepCard
              title="Step 4: Download File"
              subtitle="After processing completes, download and verify final output."
              image={stepImages[3]}
              fallbackImage={defaultStepImages[3]}
            />
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">Frequently Asked Questions</h2>
            <div className="space-y-4 text-slate-700">
              <div className="border border-slate-200 rounded-lg p-4">
                <h3 className="font-semibold text-slate-900">1. Is {post.toolName} free to use on LAK PDF?</h3>
                <p className="mt-1">Yes, {post.toolName} is completely free on lakpdf.com. No signup, no subscription, and no hidden fees. Just upload and go.</p>
              </div>
              <div className="border border-slate-200 rounded-lg p-4">
                <h3 className="font-semibold text-slate-900">2. Is my file safe when using LAK PDF?</h3>
                <p className="mt-1">Yes. Your files are processed in your browser and are not stored on any server permanently. They are automatically deleted after processing.</p>
              </div>
              <div className="border border-slate-200 rounded-lg p-4">
                <h3 className="font-semibold text-slate-900">3. Why is processing slow sometimes?</h3>
                <p className="mt-1">Large file size, older device hardware, or unstable internet can increase processing time. Try with a smaller file or a faster network connection.</p>
              </div>
              <div className="border border-slate-200 rounded-lg p-4">
                <h3 className="font-semibold text-slate-900">4. Can I use {post.toolName} on mobile?</h3>
                <p className="mt-1">Yes, LAK PDF is fully mobile-responsive. The {post.toolName} tool works on iPhone, Android, and tablets in any modern browser.</p>
              </div>
              <div className="border border-slate-200 rounded-lg p-4">
                <h3 className="font-semibold text-slate-900">5. What file formats are supported?</h3>
                <p className="mt-1">LAK PDF supports common formats including PDF, JPG, PNG, DOCX, PPT and more depending on the tool. Check the upload area for supported types.</p>
              </div>
              <div className="border border-slate-200 rounded-lg p-4">
                <h3 className="font-semibold text-slate-900">6. What if the output is not correct?</h3>
                <p className="mt-1">Retry with a clean, uncorrupted file. Make sure the file is not password-protected. If the issue persists, try a different browser or contact support.</p>
              </div>
            </div>
          </section>

          <div className="bg-primary-50 border border-primary-100 rounded-xl p-5">
            <h3 className="font-semibold text-slate-900 mb-2">Open the tool now</h3>
            <p className="text-slate-700 mb-4">Apply this guide directly on LAK PDF in one flow.</p>
            <Link
              to={post.toolPath}
              className="inline-flex items-center gap-2 bg-primary-500 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-primary-600 transition-colors"
            >
              Open {post.toolName}
            </Link>
          </div>
        </article>
      </div>
    </>
  );
};
