import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  FileText,
  Search,
  ExternalLink,
  Shield,
  Layers,
  Sparkles,
  FileCheck,
  Award,
  BookOpen,
  ArrowRight,
  Globe,
  Lock,
} from 'lucide-react';

interface SitemapCategory {
  title: string;
  description: string;
  icon: React.ReactNode;
  links: { name: string; path: string; description: string; badge?: string }[];
}

const sitemapData: SitemapCategory[] = [
  {
    title: 'Sarkari & Govt Exam Suite',
    description: 'Specialized document makers and photo resizers for Indian recruitment portals.',
    icon: <Award className="w-5 h-5 text-amber-500" />,
    links: [
      {
        name: 'FormDocFixer (Govt Exam Resizer)',
        path: '/form-doc-fixer',
        description: 'Auto-resizes photos (20-50KB), signatures (10-20KB), and declarations for SSC, UPSC OTR, IBPS, NEET & RRB.',
        badge: 'Top Tool',
      },
      {
        name: 'Passport Photo Maker',
        path: '/passport-photo-maker',
        description: 'Create 3.5x4.5 cm, 2x2 inch photos with white background and printable 4x6 / A4 sheets.',
        badge: 'Popular',
      },
      {
        name: 'Compress Image to 50KB',
        path: '/advance-compress-img',
        description: 'Exact KB target image compressor for sarkari online applications.',
      },
      {
        name: 'Compress PDF to 100KB',
        path: '/compress-pdf-to-100kb',
        description: 'High-compression mode specifically tuned to bring PDF files strictly under 100 KB.',
      },
      {
        name: 'Compress PDF to 200KB',
        path: '/compress-pdf-to-200kb',
        description: 'Targeted compressor for Aadhaar and certificate uploads under 200 KB.',
      },
    ],
  },
  {
    title: 'Core PDF Tools',
    description: 'Fast, secure, 100% browser-based tools for everyday PDF management.',
    icon: <Layers className="w-5 h-5 text-primary-500" />,
    links: [
      { name: 'Compress PDF', path: '/compress', description: 'Reduce PDF file size without visible loss of sharpness.' },
      { name: 'Merge PDF', path: '/merge', description: 'Combine multiple PDF files into one continuous document.' },
      { name: 'Split PDF', path: '/split', description: 'Extract specific pages or break a PDF into separate files.' },
      { name: 'Organize PDF', path: '/organize-pdf', description: 'Reorder, drag-and-drop, and sort PDF pages visually.' },
      { name: 'Delete Pages', path: '/delete-page', description: 'Remove unwanted or accidental pages from your PDF.' },
      { name: 'Rotate PDF', path: '/rotate', description: 'Rotate upside-down or sideways pages permanently 90°, 180°, or 270°.' },
      { name: 'Crop PDF', path: '/crop-pdf', description: 'Trim margins, cut whitespace, and adjust PDF page frames.' },
      { name: 'Add Page Numbers', path: '/page-number', description: 'Insert customizable pagination numbers on header or footer.' },
    ],
  },
  {
    title: 'Conversion & Office Tools',
    description: 'Transform documents and images to and from high-fidelity formats.',
    icon: <FileText className="w-5 h-5 text-emerald-500" />,
    links: [
      { name: 'PDF to Word (DOCX)', path: '/pdf-to-word', description: 'Convert PDF files to editable Microsoft Word documents.' },
      { name: 'Word to PDF', path: '/word-to-pdf', description: 'Convert DOC and DOCX files into polished, shareable PDFs.' },
      { name: 'Make PPT (PDF & Images to PowerPoint)', path: '/make-ppt', description: 'Turn PDF pages and photo slides into widescreen 16:9 or standard 4:3 PPTX presentations.', badge: 'New' },
      { name: 'PDF to PowerPoint', path: '/pdf-to-powerpoint', description: 'Convert PDF slide decks into editable PowerPoint (.pptx).' },
      { name: 'PowerPoint to PDF', path: '/powerpoint-to-pdf', description: 'Export presentations to compact PDF files.' },
      { name: 'Image to PDF', path: '/img-to-pdf', description: 'Convert JPG, PNG, WebP images into a single multi-page PDF.' },
      { name: 'PDF to Image', path: '/pdf-to-img', description: 'Extract PDF pages as high-resolution JPG or PNG images.' },
      { name: 'PDF to Text', path: '/pdf-to-text', description: 'Extract pure searchable text content from PDF documents.' },
      { name: 'OCR PDF', path: '/ocr-pdf', description: 'Recognize scanned document text using optical character recognition.' },
    ],
  },
  {
    title: 'AI Document Intelligence',
    description: 'Next-generation AI features running privately on your documents.',
    icon: <Sparkles className="w-5 h-5 text-purple-500" />,
    links: [
      { name: 'AI PDF to MCQ Generator', path: '/ai-pdf-to-mcq', description: 'Generate practice questions, answers, and explanations from textbooks & notes.', badge: 'AI' },
      { name: 'AI Interview Question Generator', path: '/ai-interview-generator', description: 'Analyze your resume PDF and generate technical, HR, and behavioral questions.', badge: 'AI' },
      { name: 'AI PDF Summarizer & Q&A', path: '/summarizer-qa', description: 'Get executive summaries and ask interactive questions about any PDF.', badge: 'AI' },
      { name: 'AI PDF Editor', path: '/ai-edit-pdf', description: 'AI-assisted document editing, annotation, and text corrections.', badge: 'AI' },
      { name: 'Detect Duplicate Pages', path: '/detect-duplicates', description: 'Visually compare and identify duplicate or repeated pages in merged documents.' },
    ],
  },
  {
    title: 'Security, Privacy & Scanning',
    description: 'Keep sensitive information confidential with client-side cryptography.',
    icon: <Shield className="w-5 h-5 text-rose-500" />,
    links: [
      { name: 'Redact PDF (Blackout)', path: '/redact-pdf', description: 'Permanently blackout Aadhaar numbers, PAN, bank data, and private text with true pixel sanitization.', badge: 'Security' },
      { name: 'Protect PDF (Password)', path: '/protect-pdf', description: 'Encrypt documents with strong AES passwords to prevent unauthorized viewing.' },
      { name: 'Unlock PDF', path: '/unlock-pdf', description: 'Remove forgotten owner passwords and printing restrictions from your PDFs.' },
      { name: 'Sign PDF', path: '/sign-pdf', description: 'Create digital signatures or draw with your finger to sign forms securely.' },
      { name: 'Watermark PDF', path: '/watermark', description: 'Stamp text watermarks like CONFIDENTIAL or DRAFT onto every page.' },
      { name: 'Scan to PDF', path: '/scan-pdf', description: 'Scan paper documents via your camera with auto-edge detection and perspective correction.' },
      { name: 'Compare PDF', path: '/compare-pdf', description: 'Side-by-side visual difference comparison of two document revisions.' },
    ],
  },
  {
    title: 'Help Guides, Blog & Legal',
    description: 'Comprehensive tutorials, privacy commitments, and site information.',
    icon: <BookOpen className="w-5 h-5 text-sky-500" />,
    links: [
      { name: 'All Tools Overview', path: '/tools', description: 'Comprehensive grid view of all available LAKPDF web applications.' },
      { name: 'Blog & Step-by-Step Guides', path: '/blog', description: 'In-depth illustrated guides on PDF editing, size compression, and exam document rules.' },
      { name: 'About LAKPDF', path: '/about', description: 'Learn about our mission of 100% private, client-side, zero-upload document tools.' },
      { name: 'Privacy Policy', path: '/privacy-policy', description: 'Our strict privacy guarantee: no files are stored, tracked, or uploaded.' },
      { name: 'Terms of Service', path: '/terms-of-service', description: 'Terms and conditions for utilizing LAKPDF web applications.' },
      { name: 'Disclaimer', path: '/disclaimer', description: 'Legal notice and information on trademarks and third-party portal compliance.' },
      { name: 'Contact Support', path: '/contact', description: 'Reach out to the LAKPDF developer team for feature requests and support.' },
    ],
  },
];

export const Sitemap: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCategories = sitemapData
    .map((category) => ({
      ...category,
      links: category.links.filter(
        (link) =>
          link.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          link.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          link.path.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    }))
    .filter((category) => category.links.length > 0);

  const totalLinks = sitemapData.reduce((acc, cat) => acc + cat.links.length, 0);

  return (
    <>
      <Helmet>
        <title>Sitemap - Complete Directory of PDF & Document Tools | LAKPDF</title>
        <meta
          name="description"
          content="Explore the complete sitemap of LAKPDF. Access all free PDF utilities, Sarkari exam photo and signature resizers, AI document engines, and step-by-step guides."
        />
        <link rel="canonical" href="https://lakpdf.com/sitemap" />
      </Helmet>

      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 dark:bg-dark-bg">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-50 text-primary-700 text-xs font-semibold mb-3 dark:bg-primary-950/60 dark:text-primary-300">
              <Globe className="w-3.5 h-3.5" />
              <span>Full Site Directory</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight dark:text-white mb-3">
              LAKPDF HTML Sitemap
            </h1>
            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto dark:text-slate-300">
              Browse every free online PDF tool, Sarkari exam form helper, and step-by-step guide available on LAKPDF.
            </p>

            {/* XML Direct Link & Quick Stats */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm">
              <span className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg font-medium text-slate-700 shadow-sm dark:bg-dark-surface dark:border-dark-border dark:text-slate-200">
                Total Pages Indexed: <strong className="text-primary-600 dark:text-primary-400">{totalLinks}</strong>
              </span>
              <a
                href="/sitemap.xml"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-sky-50 border border-sky-200 text-sky-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-sky-100 transition-colors dark:bg-sky-950/60 dark:border-sky-800 dark:text-sky-300"
              >
                <span>View Raw XML Sitemap</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Search bar */}
          <div className="max-w-md mx-auto mb-10">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search tools or pages by keyword..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:bg-dark-surface dark:border-dark-border dark:text-white"
              />
            </div>
          </div>

          {/* Categories Grid */}
          <div className="space-y-8">
            {filteredCategories.map((category) => (
              <div
                key={category.title}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm dark:bg-dark-surface dark:border-dark-border"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 dark:bg-dark-bg dark:border-dark-border">
                    {category.icon}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">{category.title}</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{category.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-5">
                  {category.links.map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      className="group flex flex-col justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-primary-50/40 hover:border-primary-200 transition-all dark:bg-dark-bg/60 dark:border-dark-border dark:hover:bg-primary-950/20 dark:hover:border-primary-800"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-semibold text-sm text-slate-900 group-hover:text-primary-600 transition-colors dark:text-slate-200 dark:group-hover:text-primary-400">
                            {link.name}
                          </span>
                          {link.badge && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300">
                              {link.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed dark:text-slate-400">
                          {link.description}
                        </p>
                      </div>
                      <div className="mt-2.5 flex items-center gap-1 text-[11px] font-medium text-slate-400 group-hover:text-primary-600 dark:text-slate-500 dark:group-hover:text-primary-400">
                        <span>{link.path}</span>
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            {filteredCategories.length === 0 && (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 dark:bg-dark-surface dark:border-dark-border">
                <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No pages matched "{searchTerm}"</h3>
                <p className="text-xs text-slate-500 mt-1">Try searching for compress, merge, sarkari, or photo.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Sitemap;
