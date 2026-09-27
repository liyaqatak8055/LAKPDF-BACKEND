import React from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Sparkles, CheckCircle2, HelpCircle, ArrowRight } from "lucide-react";

export const LearnPdf: React.FC = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

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
    <>
      <Helmet>
        <title>Learn PDF Workflows & Best Practices | LAK PDF</title>
        <meta
          name="description"
          content="Comprehensive guide to practical PDF workflows: merge, split, compress, convert, edit, and quality checks before sharing."
        />
        <link rel="canonical" href="https://lakpdf.com/learn-pdf" />
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <div className="min-h-screen py-8 md:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          
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
          <div className="mb-10 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-50 dark:bg-primary-950/60 border border-primary-200/80 dark:border-primary-800/60 text-primary-700 dark:text-primary-300 text-xs font-semibold uppercase tracking-wider mb-4">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Practical Workflows</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">
              Learn PDF Workflows
            </h1>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-normal max-w-3xl">
              A practical handbook for everyday document work. Instead of only listing tools, learn how to combine
              tools in the optimal sequence for exams, college submissions, client sharing, and archival.
            </p>
          </div>

          {/* ── 1. DOCUMENT PREPARATION WORKFLOW ── */}
          <section className="bg-white dark:bg-dark-surface border border-slate-200/90 dark:border-dark-border rounded-3xl p-6 sm:p-8 mb-8 shadow-xs">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="w-8 h-8 rounded-xl bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold text-sm">
                1
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                Document Preparation Workflow
              </h2>
            </div>
            <p className="text-slate-600 dark:text-slate-300 mb-6 leading-relaxed text-sm sm:text-base">
              If your final goal is to create one clean, professional PDF, do not start with compression. First organize content and verify visual quality, then optimize file size.
              A reliable sequence is: <strong>Merge/Split</strong> ➔ <strong>Delete/Crop/Rotate</strong> ➔ <strong>Compression</strong> ➔ <strong>Export/Conversion</strong>.
            </p>
            <ol className="list-decimal pl-6 text-slate-700 dark:text-slate-300 space-y-2.5 text-sm sm:text-base">
              <li>Combine source files using <Link className="text-primary-600 dark:text-primary-400 hover:underline font-semibold" to="/merge">Merge PDF</Link>.</li>
              <li>Remove irrelevant pages with <Link className="text-primary-600 dark:text-primary-400 hover:underline font-semibold" to="/delete-page">Delete Pages</Link>.</li>
              <li>Fix margins with <Link className="text-primary-600 dark:text-primary-400 hover:underline font-semibold" to="/crop-pdf">Crop PDF</Link> and orientation with <Link className="text-primary-600 dark:text-primary-400 hover:underline font-semibold" to="/rotate">Rotate PDF</Link>.</li>
              <li>Reduce size using <Link className="text-primary-600 dark:text-primary-400 hover:underline font-semibold" to="/compress">Compress PDF</Link>.</li>
              <li>Export or format if needed via <Link className="text-primary-600 dark:text-primary-400 hover:underline font-semibold" to="/convert">Convert PDF</Link>.</li>
            </ol>
          </section>

          {/* ── 2. USE CASES & TOOL CHAINS ── */}
          <section className="bg-white dark:bg-dark-surface border border-slate-200/90 dark:border-dark-border rounded-3xl p-6 sm:p-8 mb-8 shadow-xs">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-sm">
                2
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                Use Cases & Recommended Tool Chains
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border/60">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">🎓 Job & College Submissions</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">Merge ➔ Page order review ➔ Compress to target KB ➔ Final preview.</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border/60">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">📑 Scanned Notes & Invoices</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">OCR PDF ➔ Rotate ➔ Crop ➔ Compress ➔ Add page numbers.</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border/60">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">📊 Presentation Extraction</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">PDF to PowerPoint ➔ Edit slides ➔ Export back to PDF.</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border/60">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">💼 Business Contracts</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">Merge monthly files ➔ Watermark ➔ Sign PDF ➔ Archive.</p>
              </div>
            </div>
          </section>

          {/* ── 3. QUALITY CHECKLIST ── */}
          <section className="bg-white dark:bg-dark-surface border border-slate-200/90 dark:border-dark-border rounded-3xl p-6 sm:p-8 mb-8 shadow-xs">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
                3
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                Quality Checklist Before Sharing
              </h2>
            </div>
            <ul className="space-y-3">
              {[
                "All pages are crisp and readable at 100% zoom.",
                "No accidental blank or duplicate pages remain.",
                "File size strictly meets email or government portal upload limits.",
                "Page numbering starts and ends correctly without skipped numbers.",
                "Sensitive personal info (passwords, Aadhaar, PAN) is redacted before distribution."
              ].map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-slate-700 dark:text-slate-300 text-sm sm:text-base">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* ── 4. FAQ ── */}
          <section className="bg-white dark:bg-dark-surface border border-slate-200/90 dark:border-dark-border rounded-3xl p-6 sm:p-8 mb-8 shadow-xs">
            <div className="flex items-center gap-2.5 mb-6">
              <HelpCircle className="w-6 h-6 text-primary-500" />
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                Frequently Asked Questions
              </h2>
            </div>
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border/60">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base mb-1.5">
                  What is the best workflow to prepare a PDF before sharing?
                </h3>
                <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed">
                  Organize first, then compress, and perform format conversion as the final step. This sequence gives superior visual quality and prevents duplicate errors.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border/60">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base mb-1.5">
                  How can I reduce PDF size without making text blurry?
                </h3>
                <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed">
                  Use moderate compression and inspect 2-3 sample pages. Text in vector PDFs remains sharp; image DPI is what changes. If quality drops, switch to a lower compression tier.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border/60">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base mb-1.5">
                  Which conversion is best for editing content?
                </h3>
                <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed">
                  Use PDF to Word for text-heavy documents and contracts, and PDF to PowerPoint for presentations and pitch decks.
                </p>
              </div>
            </div>
          </section>

          {/* ── FOOTER NOTE ── */}
          <div className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
            <p>
              Editorial Note: This guide is maintained for practical document workflows and regularly updated as LAK PDF tools evolve.
            </p>
          </div>

        </div>
      </div>
    </>
  );
};

