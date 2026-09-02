import React, { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  Search,
  Brain,
  FileText,
  Scissors,
  Minimize2,
  Image,
  FileImage,
  RotateCw,
  Trash2,
  FileType,
  Presentation,
  PenTool,
  Signature,
  Scan,
  Hash,
  Eye,
  Crop,
  Zap,
  Type,
  LayoutGrid,
  Sliders,
  Code,
  Plus,
  Unlink,
  BarChart3,
  Target,
  ArrowRight,
  Grid3X3,
  Languages,
  GraduationCap,
  Briefcase,
  Lightbulb,
  Mic,
  CalendarDays,
} from 'lucide-react';
import { Button } from '../components/Button';
import { ToolCard } from '../components/ToolCard';

interface Tool {
  id: string;
  title: string;
  description: string;
  iconName: string;
  to: string;
  color: string;
  category: string;
  popular?: boolean;
}

const AllTools: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const allTools: Tool[] = [
    // PDF Core
    {
      id: "merge",
      title: "Merge PDF",
      description: "Combine multiple PDF files into a single document",
      iconName: "FileText",
      to: "/merge",
      color: "bg-blue-50",
      category: "pdf-core",
      popular: true
    },
    {
      id: "split",
      title: "Split PDF",
      description: "Extract pages from PDF and create separate files",
      iconName: "Scissors",
      to: "/split",
      color: "bg-green-50",
      category: "pdf-core",
      popular: true
    },
    {
      id: "compress",
      title: "Compress PDF",
      description: "Reduce PDF file size without losing quality",
      iconName: "Minimize2",
      to: "/compress",
      color: "bg-purple-50",
      category: "pdf-core",
      popular: true
    },
    {
      id: "organize-pdf",
      title: "Organize PDF",
      description: "Reorder, rotate, and organize PDF pages",
      iconName: "LayoutGrid",
      to: "/organize-pdf",
      color: "bg-orange-50",
      category: "pdf-core"
    },
    {
      id: "delete-page",
      title: "Delete Pages",
      description: "Remove specific pages from PDF documents",
      iconName: "Trash2",
      to: "/delete-page",
      color: "bg-red-50",
      category: "pdf-core"
    },
    {
      id: "detect-duplicates",
      title: "Detect Duplicates",
      description: "Find and remove duplicate pages in PDF",
      iconName: "Target",
      to: "/detect-duplicates",
      color: "bg-indigo-50",
      category: "pdf-core"
    },

    // Image Tools
    {
      id: "img-to-pdf",
      title: "Image to PDF",
      description: "Convert images (JPG, PNG) to PDF format",
      iconName: "Image",
      to: "/img-to-pdf",
      color: "bg-pink-50",
      category: "image",
      popular: true
    },
    {
      id: "pdf-to-img",
      title: "PDF to Image",
      description: "Convert PDF pages to JPG, PNG images",
      iconName: "FileImage",
      to: "/pdf-to-img",
      color: "bg-indigo-50",
      category: "image"
    },
    {
      id: "compress-img",
      title: "Compress Image",
      description: "Reduce image file size while maintaining quality",
      iconName: "Minimize2",
      to: "/compress-img",
      color: "bg-teal-50",
      category: "image",
      popular: true
    },
    {
      id: "advance-compress-img",
      title: "Compress Image to 50 KB",
      description: "Compress images to around 50 KB per image",
      iconName: "Sliders",
      to: "/advance-compress-img",
      color: "bg-cyan-50",
      category: "image"
    },

    // Conversion
    {
      id: "convert",
      title: "Convert PDF",
      description: "Convert PDF to various formats",
      iconName: "ArrowRight",
      to: "/convert",
      color: "bg-yellow-50",
      category: "conversion"
    },
    {
      id: "pdf-to-word",
      title: "PDF to Word",
      description: "Convert PDF documents to editable Word files",
      iconName: "FileType",
      to: "/pdf-to-word",
      color: "bg-blue-50",
      category: "conversion"
    },
    {
      id: "pdf-to-powerpoint",
      title: "PDF to PowerPoint",
      description: "Convert PDF to PowerPoint presentation",
      iconName: "Presentation",
      to: "/pdf-to-powerpoint",
      color: "bg-red-50",
      category: "conversion"
    },
    {
      id: "word-to-pdf",
      title: "Word to PDF",
      description: "Convert Word documents to PDF format",
      iconName: "Type",
      to: "/word-to-pdf",
      color: "bg-green-50",
      category: "conversion"
    },
    {
      id: "powerpoint-to-pdf",
      title: "PowerPoint to PDF",
      description: "Convert PowerPoint presentations to PDF",
      iconName: "Presentation",
      to: "/powerpoint-to-pdf",
      color: "bg-purple-50",
      category: "conversion"
    },

    // PDF Tools
    {
      id: "rotate",
      title: "Rotate PDF",
      description: "Rotate PDF pages to correct orientation",
      iconName: "RotateCw",
      to: "/rotate",
      color: "bg-orange-50",
      category: "pdf-tools"
    },
    {
      id: "page-number",
      title: "Add Page Numbers",
      description: "Add page numbers to PDF documents",
      iconName: "Hash",
      to: "/page-number",
      color: "bg-pink-50",
      category: "pdf-tools"
    },
    {
      id: "watermark",
      title: "Watermark PDF",
      description: "Add text or image watermarks to PDF",
      iconName: "Type",
      to: "/watermark",
      color: "bg-teal-50",
      category: "pdf-tools"
    },
    {
      id: "crop-pdf",
      title: "Crop PDF",
      description: "Crop PDF pages to remove unwanted margins",
      iconName: "Crop",
      to: "/crop-pdf",
      color: "bg-cyan-50",
      category: "pdf-tools"
    },
    {
      id: "scan-pdf",
      title: "Scan to PDF",
      description: "Convert scanned documents to PDF",
      iconName: "Scan",
      to: "/scan-pdf",
      color: "bg-yellow-50",
      category: "pdf-tools"
    },
    {
      id: "sign-pdf",
      title: "Sign PDF",
      description: "Add digital signatures to PDF documents",
      iconName: "Signature",
      to: "/sign-pdf",
      color: "bg-blue-50",
      category: "pdf-tools"
    },
    {
      id: "ocr-pdf",
      title: "OCR PDF",
      description: "Extract text from scanned PDF using OCR",
      iconName: "Eye",
      to: "/ocr-pdf",
      color: "bg-green-50",
      category: "pdf-tools"
    },
    {
      id: "compare-pdf",
      title: "Compare PDF",
      description: "Compare two PDF files and highlight differences",
      iconName: "BarChart3",
      to: "/compare-pdf",
      color: "bg-purple-50",
      category: "pdf-tools"
    },
    {
      id: "summarizer-qa",
      title: "AI Summarizer",
      description: "Generate smart summaries and ask context-based questions from PDF",
      iconName: "Search",
      to: "/summarizer-qa",
      color: "bg-blue-50",
      category: "pdf-tools",
      comingSoon: true
    },
    {
      id: "ai-pdf-to-mcq",
      title: "AI PDF to MCQ",
      description: "Generate MCQs from PDF with test mode, answer key and performance analysis",
      iconName: "GraduationCap",
      to: "/ai-pdf-to-mcq",
      color: "bg-amber-50",
      category: "pdf-tools",
      comingSoon: true
    },
    {
      id: "pdf-editor",
      title: "PDF Editor",
      description: "Normal PDF editor for manual text, highlight and shape annotations",
      iconName: "FileText",
      to: "/pdf-editor",
      color: "bg-fuchsia-50",
      category: "pdf-tools"
    },
    {
      id: "ai-interview-generator",
      title: "AI Interview Generator",
      description: "Resume analyzer + technical, HR, behavioral interview questions with model answers",
      iconName: "Briefcase",
      to: "/ai-interview-generator",
      color: "bg-emerald-50",
      category: "pdf-tools",
      comingSoon: true
    },
  ];

  const categories = [
    { id: 'all', name: 'All Tools', icon: Grid3X3 },
    { id: 'pdf-core', name: 'PDF Core', icon: FileText },
    { id: 'image', name: 'Image Tools', icon: Image },
    { id: 'conversion', name: 'Conversion', icon: ArrowRight },
    { id: 'pdf-tools', name: 'PDF Tools', icon: FileText }
  ];

  const iconMap: Record<string, React.ComponentType<any>> = {
    FileText, Scissors, Minimize2, Image, FileImage, RotateCw, Trash2,
    FileType, Presentation, PenTool, Signature, Scan, Hash, Eye, Crop, Zap,
    Type, LayoutGrid, Sliders, Code, Plus, Unlink, BarChart3, Target, ArrowRight, Grid3X3, Languages, GraduationCap, Briefcase, Lightbulb, Mic, CalendarDays, Brain
  };

  const filteredTools = useMemo(() => {
    return allTools.filter(tool => {
      const matchesSearch = tool.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           tool.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);

  const popularTools = allTools.filter(tool => tool.popular);
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "LAK PDF Tools",
    itemListElement: allTools.slice(0, 20).map((tool, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: tool.title,
      url: `https://lakpdf.com${tool.to}`
    }))
  };

  return (
    <>
      <Helmet>
        <title>All PDF Tools - LAK PDF</title>
        <meta name="description" content="Access all PDF tools including merge, split, compress, convert, and more. Free online PDF processing tools." />
        <script type="application/ld+json">{JSON.stringify(itemListSchema)}</script>
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            All PDF Tools
          </h1>
          <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto">
            Discover and access all our PDF processing tools in one place
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search tools..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-lg"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {categories.map((category) => {
            const IconComponent = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-primary-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <IconComponent className="w-4 h-4" />
                {category.name}
              </button>
            );
          })}
        </div>

        {/* Popular Tools Section */}
        {selectedCategory === 'all' && !searchTerm && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary-100 rounded-lg text-primary-600">
                <Zap className="w-5 h-5 fill-current" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-900">Most Popular Tools</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
              {popularTools.map((tool) => {
                const IconComponent = iconMap[tool.iconName] || FileText;
                return (
                  <ToolCard
                    key={tool.id}
                    title={tool.title}
                    description={tool.description}
                    to={tool.to}
                    popular
                    icon={<IconComponent className="h-6 w-6 md:h-8 md:w-8" />}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* All Tools Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900">
              {selectedCategory === 'all' ? 'All Tools' : categories.find(c => c.id === selectedCategory)?.name}
              {searchTerm && ` - "${searchTerm}"`}
            </h2>
            <span className="text-sm text-slate-500">{filteredTools.length} tools</span>
          </div>

          {filteredTools.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500 mb-2">No tools found</p>
              <p className="text-sm text-slate-400">Try adjusting your search or category filter</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {filteredTools.map((tool) => {
                const IconComponent = iconMap[tool.iconName] || FileText;
                return (
                  <ToolCard
                    key={tool.id}
                    title={tool.title}
                    description={tool.description}
                    to={tool.to}
                    popular={tool.popular}
                    comingSoon={tool.comingSoon}
                    icon={<IconComponent className="h-6 w-6 md:h-8 md:w-8" />}
                  />
                );
              })}
            </div>
          )}
        </div>

        <section className="mt-10 bg-white rounded-lg border border-slate-200 p-6 md:p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">How to choose the right PDF tool</h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            Pick tools based on your document goal. If you need one file from many sources, use Merge PDF. If file size is high for sharing,
            use Compress PDF. For editable output, use PDF to Word. For page cleanup, use Delete Pages, Rotate PDF, Crop PDF, and Organize PDF.
            You can chain tools in sequence for better output quality and faster workflow completion.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Link to="/merge" className="rounded-xl border border-slate-200 px-4 py-3 hover:border-primary-300">
              <p className="font-semibold text-slate-900">Merge Workflow</p>
              <p className="text-sm text-slate-600">Combine reports, invoices, or chapters into one PDF.</p>
            </Link>
            <Link to="/compress" className="rounded-xl border border-slate-200 px-4 py-3 hover:border-primary-300">
              <p className="font-semibold text-slate-900">Compression Workflow</p>
              <p className="text-sm text-slate-600">Reduce file size for email and fast uploads.</p>
            </Link>
            <Link to="/convert" className="rounded-xl border border-slate-200 px-4 py-3 hover:border-primary-300">
              <p className="font-semibold text-slate-900">Conversion Workflow</p>
              <p className="text-sm text-slate-600">Export PDF into Word, PowerPoint, or image formats.</p>
            </Link>
          </div>
        </section>

        <section className="mt-8 bg-slate-50 rounded-lg border border-slate-200 p-6 md:p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">All Tools FAQ</h2>
          <div className="space-y-4 text-slate-700">
            <div>
              <h3 className="font-semibold text-slate-900">Can I use these tools without registration?</h3>
              <p>Yes. Most core tools are usable instantly without creating an account.</p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Are my files uploaded permanently?</h3>
              <p>No permanent storage is intended for regular processing flows. Files are processed for requested operations only.</p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Which tools are best for students?</h3>
              <p>Start with Merge PDF, Compress PDF, AI Summarizer, OCR PDF, and PDF to Word.</p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Can I process documents on mobile?</h3>
              <p>Yes. LAK PDF pages are mobile-friendly and work on current Android and iOS browsers.</p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default AllTools;
