import React from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft,
  AlertTriangle, 
  FileCheck2, 
  ShieldAlert, 
  HelpCircle, 
  Mail, 
  CheckCircle2, 
  BadgeAlert,
  ExternalLink,
  Info
} from "lucide-react";

export const Disclaimer: React.FC = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <>
      <Helmet>
        <title>Disclaimer & Legal Notices | LAK PDF</title>
        <meta
          name="description"
          content="Official disclaimer and advertising disclosures for LAK PDF. Understand document processing accuracy, government form resizing advisories, and trademark notices."
        />
        <meta name="keywords" content="LAK PDF disclaimer, adsense disclosure, legal notice, document conversion accuracy, trademark disclaimer" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://lakpdf.com/disclaimer" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "Disclaimer - LAK PDF",
          "description": "Legal disclaimer and service disclosures for LAK PDF.",
          "url": "https://lakpdf.com/disclaimer",
          "publisher": {
            "@type": "Organization",
            "name": "LAK PDF",
            "url": "https://lakpdf.com"
          }
        })}</script>
      </Helmet>

      <div className="min-h-screen py-8 md:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
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
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 text-xs font-semibold uppercase tracking-wider mb-5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Service Notices & Transparency</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
              Website & Services Disclaimer
            </h1>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              Please review these important notices regarding the scope, accuracy, and legal limitations of tools provided on LAK PDF.
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Last Updated & Effective: September 2026
            </p>
          </div>

          {/* ── HIGHLIGHTS CALLOUT GRID ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-14">
            <div className="p-5 rounded-2xl bg-white dark:bg-dark-surface border border-slate-200/90 dark:border-dark-border shadow-sm flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex-shrink-0">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">General Utility Purpose</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  Tools are provided to assist with everyday document workflows. We do not provide legal or certified document verification.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-dark-surface border border-slate-200/90 dark:border-dark-border shadow-sm flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 flex-shrink-0">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Verify Outputs Before Submission</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  Users should always open and visually inspect converted or compressed documents before submitting to portals.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-dark-surface border border-slate-200/90 dark:border-dark-border shadow-sm flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex-shrink-0">
                <BadgeAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Exam Resizer Advisory</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  Always verify official recruitment notifications (SSC, UPSC, Banking, etc.) as portal dimension rules may change.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-dark-surface border border-slate-200/90 dark:border-dark-border shadow-sm flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Trademark Independence</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  LAK PDF is an independent platform. References to Adobe, Microsoft, or SSC are descriptive for compatibility only.
                </p>
              </div>
            </div>
          </div>

          {/* ── MAIN DISCLAIMER BODY ── */}
          <div className="bg-white dark:bg-dark-surface rounded-3xl border border-slate-200/90 dark:border-dark-border p-6 sm:p-10 shadow-sm space-y-10 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
            
            {/* Section 1 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="text-primary-500 font-bold">1.</span>
                <span>General Information & "As Is" Warranty</span>
              </h2>
              <p>
                All materials, tools, guides, and services hosted on <strong>https://lakpdf.com</strong> ("LAK PDF") are provided solely for general informational, educational, and document utility convenience.
              </p>
              <p>
                While we make every engineering effort to provide accurate, reliable, and high-performance client-side conversions, LAK PDF provides all tools on an <strong>"AS IS"</strong> and <strong>"AS AVAILABLE"</strong> basis without any guarantees or warranties of completeness, fitness for purpose, or error-free execution.
              </p>
            </section>

            {/* Section 2 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="text-primary-500 font-bold">2.</span>
                <span>Document Processing & Conversion Accuracy</span>
              </h2>
              <p>
                PDF files are complex digital documents that can contain custom embedded typefaces, multi-layer vector paths, digital DRM signatures, transparency blends, and specialized color profiles.
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-600 dark:text-slate-300">
                <li>
                  When performing conversions (such as PDF to Word, Word to PDF, or OCR text recognition), slight layout shifts, character substitutions, or visual formatting differences may occur.
                </li>
                <li>
                  When using image compression tools (such as Compress PDF or Advance Compress Image to 50KB), reduction in visual sharpness or subtle artifacting may occur depending on compression ratios.
                </li>
                <li>
                  <strong>User Responsibility:</strong> It is the sole responsibility of the user to inspect, proofread, and verify the integrity and formatting of converted or compressed files before using them for official, legal, academic, or commercial submissions.
                </li>
              </ul>
            </section>

            {/* Section 3 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="text-primary-500 font-bold">3.</span>
                <span>Advisory for Government & Competitive Exam Resizers</span>
              </h2>
              <p>
                LAK PDF features dedicated utility tools (such as <strong>FormDocFixer / Govt Exam Resizer</strong>) designed to help candidates prepare passport photos, signatures, and thumb impressions according to common exam portal specifications (e.g. SSC, UPSC, IBPS, State PSC, NTA NEET/JEE).
              </p>
              <p className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs sm:text-sm text-amber-900 dark:text-amber-200">
                <strong>Important Candidate Notice:</strong> Government recruitment agencies and examination boards frequently update their photo background color guidelines, date-on-photo stamps, and file size tolerances. LAK PDF presets are built as convenient approximations. You must cross-check your final output against the official notification published by the relevant examination conducting authority.
              </p>
            </section>

            {/* Section 4 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="text-primary-500 font-bold">4.</span>
                <span>No Professional, Legal, or Financial Advice</span>
              </h2>
              <p>
                Nothing on this website constitutes legal advice, financial counsel, certified document notarization, or professional consultation. Electronic signatures created with the "Sign PDF" tool are provided for general electronic documentation convenience and may not satisfy strict digital signature certificate (DSC) requirements mandated by certain statutory authorities.
              </p>
            </section>

            {/* Section 5 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="text-primary-500 font-bold">5.</span>
                <span>Advertising & Third-Party Disclosure (Google AdSense)</span>
              </h2>
              <p>
                This website displays third-party advertisements served through Google AdSense and other advertising networks. Advertisements are generated automatically based on context and user cookie preferences.
              </p>
              <p>
                The display of any advertisement on LAK PDF does not constitute an endorsement, guarantee, or recommendation of the advertised products, services, or companies. We are not liable for transactions conducted between users and third-party advertisers.
              </p>
            </section>

            {/* Section 6 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="text-primary-500 font-bold">6.</span>
                <span>External Links & Third-Party Websites</span>
              </h2>
              <p>
                Our platform and blog guides may contain hyperlinks to external websites that are not operated or controlled by LAK PDF. We have no control over the content, privacy policies, or practices of any third-party websites and assume no responsibility for them.
              </p>
            </section>

            {/* Section 7 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="text-primary-500 font-bold">7.</span>
                <span>Trademarks & Brand Names Acknowledgment</span>
              </h2>
              <p>
                All product names, logos, brands, and registered trademarks mentioned on this website (including Adobe, Acrobat, Microsoft Word, Excel, PowerPoint, Google, SSC, UPSC) are the property of their respective owners. Their mention on LAK PDF is strictly nominative and intended to identify document compatibility. LAK PDF is not affiliated with, endorsed by, or sponsored by any of these trademark holders.
              </p>
            </section>

            {/* Section 8 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="text-primary-500 font-bold">8.</span>
                <span>Contacting Us</span>
              </h2>
              <p>
                If you have questions, feedback, or DMCA inquiries regarding this Disclaimer, please reach out to us:
              </p>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-dark-border flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary-500" />
                <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                  Email:{" "}
                  <a href="mailto:liyaqatk960@gmail.com" className="text-primary-500 hover:underline">
                    liyaqatk960@gmail.com
                  </a>
                </span>
              </div>
            </section>

          </div>

        </div>
      </div>
    </>
  );
};
