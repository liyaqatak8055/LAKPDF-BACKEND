import React from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";

export const LearnPdf: React.FC = () => {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is the best workflow to prepare a PDF before sharing?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "A practical workflow is: organize pages, remove unnecessary pages, compress for size, verify readability, and then share."
        }
      },
      {
        "@type": "Question",
        name: "How can I reduce PDF size without making text blurry?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Start with medium compression and inspect pages with images or charts. If text quality drops, use lighter compression or split the file."
        }
      },
      {
        "@type": "Question",
        name: "Which conversion is best for editing content?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "PDF to Word is typically the best option for editable text workflows. For slides, PDF to PowerPoint is usually better."
        }
      }
    ]
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <Helmet>
        <title>Learn PDF Workflows | LAK PDF</title>
        <meta
          name="description"
          content="Comprehensive guide to practical PDF workflows: merge, split, compress, convert, edit, and quality checks before sharing."
        />
        <link rel="canonical" href="https://lakpdf.com/learn-pdf" />
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">Learn PDF Workflows (Practical Guide)</h1>
        <p className="text-slate-600 leading-7">
          This page is a practical handbook for everyday PDF work. Instead of only listing tools, it explains how to combine
          tools in the right sequence for real tasks such as submission, client sharing, exam prep, and archive cleanup.
        </p>
      </header>

      <section className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 mb-8">
        <h2 className="text-2xl font-semibold text-slate-900 mb-3">1. Document Preparation Workflow</h2>
        <p className="text-slate-700 mb-3 leading-7">
          If your final goal is to send one clean PDF, do not start with compression. First organize content quality, then size optimization.
          A stable sequence is: Merge/Split, then Delete/Crop/Rotate, then compression, and finally export/conversion if needed.
        </p>
        <ol className="list-decimal pl-6 text-slate-700 space-y-2">
          <li>Combine source files using <Link className="text-primary-500 hover:underline" to="/merge">Merge PDF</Link>.</li>
          <li>Remove irrelevant pages with <Link className="text-primary-500 hover:underline" to="/delete-page">Delete Pages</Link>.</li>
          <li>Fix margins with <Link className="text-primary-500 hover:underline" to="/crop-pdf">Crop PDF</Link> and orientation with <Link className="text-primary-500 hover:underline" to="/rotate">Rotate PDF</Link>.</li>
          <li>Reduce size using <Link className="text-primary-500 hover:underline" to="/compress">Compress PDF</Link>.</li>
          <li>Export if needed via <Link className="text-primary-500 hover:underline" to="/convert">Convert PDF</Link>.</li>
        </ol>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 mb-8">
        <h2 className="text-2xl font-semibold text-slate-900 mb-3">2. Use Cases and Recommended Tool Chains</h2>
        <div className="space-y-4 text-slate-700">
          <p><strong>Job/College submission:</strong> Merge -&gt; Page order check -&gt; Compress -&gt; Final review.</p>
          <p><strong>Scanned notes cleanup:</strong> OCR PDF -&gt; Rotate -&gt; Crop -&gt; Compress -&gt; Add page numbers.</p>
          <p><strong>Presentation extraction:</strong> PDF to PowerPoint -&gt; Edit slides -&gt; Export back to PDF.</p>
          <p><strong>Invoice bundle:</strong> Merge monthly files -&gt; Add watermark -&gt; Sign PDF -&gt; Archive.</p>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 mb-8">
        <h2 className="text-2xl font-semibold text-slate-900 mb-3">3. Quality Checklist Before Sharing</h2>
        <ul className="list-disc pl-6 text-slate-700 space-y-2">
          <li>All pages readable at 100% zoom.</li>
          <li>No accidental blank pages.</li>
          <li>File size acceptable for email or upload portals.</li>
          <li>Page numbering is correct.</li>
          <li>Sensitive information is removed or redacted before distribution.</li>
        </ul>
      </section>

      <section className="bg-slate-50 border border-slate-200 rounded-2xl p-6 md:p-8 mb-8">
        <h2 className="text-2xl font-semibold text-slate-900 mb-4">FAQ</h2>
        <div className="space-y-4 text-slate-700">
          <div>
            <h3 className="font-semibold text-slate-900">What is the best workflow to prepare a PDF before sharing?</h3>
            <p>Organize first, then compress, then final format conversion. This order gives better quality and fewer errors.</p>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">How can I reduce PDF size without making text blurry?</h3>
            <p>Use moderate compression and verify 2-3 representative pages. If quality drops, reduce compression level.</p>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Which conversion is best for editing content?</h3>
            <p>Use PDF to Word for text-heavy files, and PDF to PowerPoint for slide-based documents.</p>
          </div>
        </div>
      </section>

      <section className="text-sm text-slate-500">
        <p>
          Editorial note: This guide is maintained for practical document workflows and updated as tools evolve.
        </p>
      </section>
    </div>
  );
};
